#include <Arduino.h>
#include <ArduinoJson.h>
#include <AsyncMqttClient.h>
#include <DHT.h>
#include <WiFi.h>

#include "config.h"

namespace {

constexpr uint8_t kDhtType = DHT11;
constexpr uint32_t kBootSafeMs = 1000;
constexpr size_t kCommandBufferSize = 384;
constexpr size_t kHandledCommandCapacity = 8;
constexpr size_t kCommandIdCapacity = 101;
constexpr size_t kAckStateCapacity = 40;
constexpr size_t kAckReasonCapacity = 160;

const char kTelemetryTopic[] = "iot/" DEVICE_ID "/telemetry";
const char kStateTopic[] = "iot/" DEVICE_ID "/state";
const char kCommandTopic[] = "iot/" DEVICE_ID "/command";
const char kAckTopic[] = "iot/" DEVICE_ID "/ack";
const char kOfflineState[] = "{\"online\":false}";

enum class DeviceMode { Auto, Manual };
enum class AlertLevel { Normal, Warning, Critical };

struct HandledCommand {
  char commandId[kCommandIdCapacity]{};
  bool success{false};
  char state[kAckStateCapacity]{};
  char reason[kAckReasonCapacity]{};
};

DHT dht(DHT_PIN, kDhtType);
AsyncMqttClient mqttClient;

DeviceMode mode = DeviceMode::Auto;
AlertLevel alertLevel = AlertLevel::Normal;
bool irrigationSimulationActive = false;
bool mqttConnected = false;
bool mqttConnectionPending = false;
bool configurationValid = false;
bool bootSafe = true;

uint32_t simulationStartedAt = 0;
uint32_t lastTelemetryAt = 0;
uint32_t lastStateAt = 0;
uint32_t lastWifiAttemptAt = 0;
uint32_t lastMqttAttemptAt = 0;
uint32_t mqttConnectStartedAt = 0;
uint32_t telemetrySequence = 0;

char commandBuffer[kCommandBufferSize]{};
size_t commandBytesReceived = 0;
size_t commandExpectedBytes = 0;
HandledCommand handledCommands[kHandledCommandCapacity]{};
size_t handledCommandCursor = 0;

bool elapsed(uint32_t now, uint32_t since, uint32_t interval) {
  return static_cast<uint32_t>(now - since) >= interval;
}

const char *modeToString(DeviceMode value) {
  return value == DeviceMode::Auto ? "AUTO" : "MANUAL";
}

const char *alertLevelToString(AlertLevel value) {
  switch (value) {
    case AlertLevel::Normal:
      return "NORMAL";
    case AlertLevel::Warning:
      return "WARNING";
    case AlertLevel::Critical:
      return "CRITICAL";
  }

  return "NORMAL";
}

const char *greenPattern() {
// When LED GPIO is intentionally disabled, never report a physical blink.
#if !ENABLE_LED_OUTPUT
  return "OFF";
#else
  if (bootSafe || !mqttConnected) return "OFF";
  if (irrigationSimulationActive) return "BLINK";
  return alertLevel == AlertLevel::Normal ? "SOLID" : "OFF";
#endif
}

bool soilCalibrationAvailable() {
  return SOIL_SENSOR_USE_ANALOG && SOIL_DRY_RAW >= 0 && SOIL_WET_RAW >= 0 && SOIL_DRY_RAW != SOIL_WET_RAW;
}

int readSoilRaw() {
#if SOIL_SENSOR_USE_ANALOG
  return analogRead(SOIL_PIN);
#else
  return digitalRead(SOIL_PIN);
#endif
}

float calculateSoilMoisturePct(int rawValue) {
  const float numerator = static_cast<float>(rawValue - SOIL_DRY_RAW);
  const float denominator = static_cast<float>(SOIL_WET_RAW - SOIL_DRY_RAW);
  return constrain((numerator * 100.0F) / denominator, 0.0F, 100.0F);
}

void setLed(uint8_t pin, bool enabled) {
#if ENABLE_LED_OUTPUT
  digitalWrite(pin, enabled ? LED_ON_LEVEL : LED_OFF_LEVEL);
#else
  (void)pin;
  (void)enabled;
#endif
}

void updateLedOutputs() {
  if (bootSafe || !configurationValid || !mqttConnected) {
    setLed(LED_GREEN_PIN, false);
    setLed(LED_YELLOW_PIN, false);
    setLed(LED_RED_PIN, false);
    return;
  }

  const bool greenOn = irrigationSimulationActive
                           ? ((millis() / GREEN_BLINK_INTERVAL_MS) % 2U == 0U)
                           : alertLevel == AlertLevel::Normal;
  setLed(LED_GREEN_PIN, greenOn);
  setLed(LED_YELLOW_PIN, alertLevel == AlertLevel::Warning);
  setLed(LED_RED_PIN, alertLevel == AlertLevel::Critical);
}

void populateReportedState(JsonObject state) {
  state["online"] = mqttConnected;
  state["mode"] = modeToString(mode);
  state["alertLevel"] = alertLevelToString(alertLevel);
  state["irrigationSimulationActive"] = irrigationSimulationActive;
  state["greenPattern"] = greenPattern();
}

void publishState() {
  if (!mqttConnected) return;

  StaticJsonDocument<320> document;
  populateReportedState(document.to<JsonObject>());
  document["uptimeMs"] = millis();

  char payload[320];
  const size_t payloadLength = serializeJson(document, payload, sizeof(payload));
  if (payloadLength == 0 || payloadLength >= sizeof(payload)) {
    Serial.println("State serialization failed");
    return;
  }

  mqttClient.publish(kStateTopic, 1, true, payload, payloadLength);
  lastStateAt = millis();
}

void publishAck(const char *commandId, bool success, const char *state, const char *reason) {
  if (!mqttConnected) return;

  StaticJsonDocument<640> document;
  document["commandId"] = commandId;
  document["success"] = success;
  document["status"] = success ? "EXECUTED" : "FAILED";
  document["state"] = state;
  if (reason != nullptr && reason[0] != '\0') document["reason"] = reason;
  JsonObject reportedState = document.createNestedObject("reportedState");
  populateReportedState(reportedState);

  char payload[640];
  const size_t payloadLength = serializeJson(document, payload, sizeof(payload));
  if (payloadLength == 0 || payloadLength >= sizeof(payload)) {
    Serial.println("ACK serialization failed");
    return;
  }

  mqttClient.publish(kAckTopic, 1, false, payload, payloadLength);
}

void publishTelemetry() {
  if (!mqttConnected) return;

  const float temperatureC = dht.readTemperature();
  const float airHumidityPct = dht.readHumidity();
  const int soilRaw = readSoilRaw();

  StaticJsonDocument<320> document;
  document["sequence"] = telemetrySequence++;
  document["soilRaw"] = soilRaw;
  if (!isnan(temperatureC)) document["temperatureC"] = temperatureC;
  if (!isnan(airHumidityPct)) document["airHumidityPct"] = airHumidityPct;
  if (soilCalibrationAvailable()) document["soilMoisturePct"] = calculateSoilMoisturePct(soilRaw);

  char payload[320];
  const size_t payloadLength = serializeJson(document, payload, sizeof(payload));
  if (payloadLength == 0 || payloadLength >= sizeof(payload)) {
    Serial.println("Telemetry serialization failed");
    return;
  }

  mqttClient.publish(kTelemetryTopic, 0, false, payload, payloadLength);
  Serial.printf(
      "telemetry seq=%lu temp=%.1f humidity=%.1f soilRaw=%d calibrated=%s\n",
      static_cast<unsigned long>(telemetrySequence - 1),
      temperatureC,
      airHumidityPct,
      soilRaw,
      soilCalibrationAvailable() ? "yes" : "no");
}

HandledCommand *findHandledCommand(const char *commandId) {
  for (HandledCommand &entry : handledCommands) {
    if (entry.commandId[0] != '\0' && strcmp(entry.commandId, commandId) == 0) return &entry;
  }

  return nullptr;
}

void rememberCommand(const char *commandId, bool success, const char *state, const char *reason) {
  HandledCommand &entry = handledCommands[handledCommandCursor];
  snprintf(entry.commandId, sizeof(entry.commandId), "%s", commandId);
  entry.success = success;
  snprintf(entry.state, sizeof(entry.state), "%s", state);
  snprintf(entry.reason, sizeof(entry.reason), "%s", reason == nullptr ? "" : reason);
  handledCommandCursor = (handledCommandCursor + 1U) % kHandledCommandCapacity;
}

bool parseMode(const char *value, DeviceMode &target) {
  if (strcmp(value, "AUTO") == 0) {
    target = DeviceMode::Auto;
    return true;
  }
  if (strcmp(value, "MANUAL") == 0) {
    target = DeviceMode::Manual;
    return true;
  }
  return false;
}

bool parseAlertLevel(const char *value, AlertLevel &target) {
  if (strcmp(value, "NORMAL") == 0) {
    target = AlertLevel::Normal;
    return true;
  }
  if (strcmp(value, "WARNING") == 0) {
    target = AlertLevel::Warning;
    return true;
  }
  if (strcmp(value, "CRITICAL") == 0) {
    target = AlertLevel::Critical;
    return true;
  }
  return false;
}

void setSimulation(bool active) {
  irrigationSimulationActive = active;
  if (active) simulationStartedAt = millis();
}

void processCommandPayload(const char *payload, size_t length) {
  StaticJsonDocument<512> document;
  const DeserializationError error = deserializeJson(document, payload, length);
  if (error) {
    Serial.printf("Rejected invalid command JSON: %s\n", error.c_str());
    return;
  }

  const char *commandId = document["commandId"] | "";
  const char *type = document["type"] | "";
  const char *value = document["value"] | "";
  const char *source = document["source"] | "MANUAL";
  if (commandId[0] == '\0' || strlen(commandId) >= kCommandIdCapacity || type[0] == '\0') {
    Serial.println("Rejected command without a valid commandId/type");
    return;
  }

  if (HandledCommand *previous = findHandledCommand(commandId)) {
    publishAck(previous->commandId, previous->success, previous->state, previous->reason);
    Serial.printf("Replayed ACK for duplicate command %s\n", commandId);
    return;
  }

  bool success = true;
  const char *state = type;
  const char *reason = "";

  if (strcmp(type, "START_IRRIGATION_SIMULATION") == 0) {
    if (mode == DeviceMode::Auto && strcmp(source, "AUTO") != 0) {
      success = false;
      reason = "Manual START requires MANUAL mode";
    } else {
      setSimulation(true);
    }
  } else if (strcmp(type, "STOP_IRRIGATION_SIMULATION") == 0) {
    setSimulation(false);
  } else if (strcmp(type, "SET_MODE") == 0) {
    DeviceMode requestedMode;
    if (parseMode(value, requestedMode)) {
      mode = requestedMode;
    } else {
      success = false;
      reason = "SET_MODE requires AUTO or MANUAL";
    }
  } else if (strcmp(type, "SET_ALERT_LEVEL") == 0) {
    AlertLevel requestedAlert;
    if (parseAlertLevel(value, requestedAlert)) {
      alertLevel = requestedAlert;
    } else {
      success = false;
      reason = "SET_ALERT_LEVEL requires NORMAL, WARNING, or CRITICAL";
    }
  } else {
    success = false;
    reason = "Unsupported command type";
  }

  rememberCommand(commandId, success, state, reason);
  updateLedOutputs();
  publishState();
  publishAck(commandId, success, state, reason);
  Serial.printf("Command %s: %s\n", commandId, success ? "executed" : "failed");
}

void onMqttConnect(bool sessionPresent) {
  (void)sessionPresent;
  mqttConnected = true;
  mqttConnectionPending = false;
  mqttClient.subscribe(kCommandTopic, 1);
  publishState();
  Serial.printf("MQTT connected: subscribed to %s\n", kCommandTopic);
}

void onMqttDisconnect(AsyncMqttClientDisconnectReason reason) {
  mqttConnected = false;
  mqttConnectionPending = false;
  if (irrigationSimulationActive) {
    setSimulation(false);
    updateLedOutputs();
    Serial.println("Irrigation simulation stopped because MQTT disconnected");
  }
  Serial.printf("MQTT disconnected, reason=%d\n", static_cast<int>(reason));
}

void onMqttMessage(
    char *topic,
    char *payload,
    AsyncMqttClientMessageProperties properties,
    size_t length,
    size_t index,
    size_t total) {
  (void)properties;
  if (strcmp(topic, kCommandTopic) != 0 || total == 0 || total >= kCommandBufferSize) {
    Serial.println("Rejected MQTT command with unexpected topic or size");
    return;
  }

  if (index == 0) {
    commandBytesReceived = 0;
    commandExpectedBytes = total;
  }
  if (commandExpectedBytes != total || index != commandBytesReceived || index + length > total) {
    commandBytesReceived = 0;
    commandExpectedBytes = 0;
    Serial.println("Rejected out-of-order MQTT command fragments");
    return;
  }

  memcpy(commandBuffer + index, payload, length);
  commandBytesReceived += length;
  if (commandBytesReceived != total) return;

  commandBuffer[total] = '\0';
  processCommandPayload(commandBuffer, total);
  commandBytesReceived = 0;
  commandExpectedBytes = 0;
}

void beginWifi() {
  lastWifiAttemptAt = millis();
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  Serial.printf("Wi-Fi connect requested for SSID %s\n", WIFI_SSID);
}

void maintainConnections() {
  const uint32_t now = millis();
  if (WiFi.status() != WL_CONNECTED) {
    if (mqttConnected || mqttConnectionPending) mqttClient.disconnect();
    if (elapsed(now, lastWifiAttemptAt, WIFI_RETRY_INTERVAL_MS)) beginWifi();
    return;
  }

  if (mqttConnectionPending && elapsed(now, mqttConnectStartedAt, MQTT_CONNECT_TIMEOUT_MS)) {
    mqttClient.disconnect();
    mqttConnectionPending = false;
  }

  if (!mqttConnected && !mqttConnectionPending && elapsed(now, lastMqttAttemptAt, MQTT_RETRY_INTERVAL_MS)) {
    lastMqttAttemptAt = now;
    mqttConnectStartedAt = now;
    mqttConnectionPending = true;
    mqttClient.connect();
  }
}

void configureMqtt() {
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setKeepAlive(15);
  mqttClient.setCleanSession(true);
  mqttClient.setWill(kStateTopic, 1, true, kOfflineState);
  if (strlen(MQTT_USERNAME) > 0) mqttClient.setCredentials(MQTT_USERNAME, MQTT_PASSWORD);
  mqttClient.onConnect(onMqttConnect);
  mqttClient.onDisconnect(onMqttDisconnect);
  mqttClient.onMessage(onMqttMessage);
}

}  // namespace

void setup() {
  Serial.begin(115200);
#if ENABLE_LED_OUTPUT
  pinMode(LED_GREEN_PIN, OUTPUT);
  pinMode(LED_YELLOW_PIN, OUTPUT);
  pinMode(LED_RED_PIN, OUTPUT);
#else
  pinMode(LED_GREEN_PIN, INPUT);
  pinMode(LED_YELLOW_PIN, INPUT);
  pinMode(LED_RED_PIN, INPUT);
#endif
  pinMode(SOIL_PIN, INPUT);

  // Outputs are disabled by default, and no simulation survives a reset.
  setLed(LED_GREEN_PIN, false);
  setLed(LED_YELLOW_PIN, false);
  setLed(LED_RED_PIN, false);
  irrigationSimulationActive = false;

#if SOIL_SENSOR_USE_ANALOG
  analogReadResolution(12);
  analogSetPinAttenuation(SOIL_PIN, ADC_11db);
#endif

  dht.begin();
  configurationValid = strlen(WIFI_SSID) > 0 && strlen(MQTT_HOST) > 0;
  if (!configurationValid) {
    Serial.println("Missing Wi-Fi or MQTT configuration; LEDs stay OFF.");
    return;
  }

  configureMqtt();
  beginWifi();
  lastTelemetryAt = millis() - TELEMETRY_INTERVAL_MS;
  lastStateAt = millis();
  lastMqttAttemptAt = millis() - MQTT_RETRY_INTERVAL_MS;
}

void loop() {
  const uint32_t now = millis();
  if (!configurationValid) {
    updateLedOutputs();
    return;
  }

  if (bootSafe && elapsed(now, 0, kBootSafeMs)) {
    bootSafe = false;
    if (mqttConnected) publishState();
  }

  maintainConnections();

  if (irrigationSimulationActive && elapsed(now, simulationStartedAt, MAX_IRRIGATION_SIMULATION_MS)) {
    setSimulation(false);
    publishState();
    Serial.println("Irrigation simulation stopped by local 60-second timeout");
  }

  if (mqttConnected && elapsed(now, lastTelemetryAt, TELEMETRY_INTERVAL_MS)) {
    lastTelemetryAt = now;
    publishTelemetry();
  }
  if (mqttConnected && elapsed(now, lastStateAt, STATE_INTERVAL_MS)) publishState();

  updateLedOutputs();
}
