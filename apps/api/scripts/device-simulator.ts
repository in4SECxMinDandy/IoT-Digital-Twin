import mqtt from "mqtt";

import { parseCommandPayload, topicFor, type MqttCommandPayload } from "../src/services/mqtt-contract";

const mqttUrl = process.env.MQTT_URL ?? "mqtt://localhost:1883";
const deviceId = process.env.SIMULATOR_DEVICE_ID ?? "esp32_01";
const telemetryIntervalMs = Number.parseInt(process.env.SIMULATOR_TELEMETRY_INTERVAL_MS ?? "5000", 10);
const configuredSoilMoisture = Number.parseFloat(process.env.SIMULATOR_SOIL_MOISTURE ?? "");
const simulationTimeoutMs = 60_000;

if (!Number.isFinite(telemetryIntervalMs) || telemetryIntervalMs < 1_000) {
  throw new Error("SIMULATOR_TELEMETRY_INTERVAL_MS must be at least 1000");
}

if (!Number.isNaN(configuredSoilMoisture) && (configuredSoilMoisture < 0 || configuredSoilMoisture > 100)) {
  throw new Error("SIMULATOR_SOIL_MOISTURE must be between 0 and 100");
}

type Mode = "AUTO" | "MANUAL";
type AlertLevel = "NORMAL" | "WARNING" | "CRITICAL";

let mode: Mode = "AUTO";
let alertLevel: AlertLevel = "NORMAL";
let irrigationSimulationActive = false;
let simulationStartedAt = 0;
let sequence = 0;
const handledCommandIds = new Set<string>();

const client = mqtt.connect(mqttUrl, {
  clientId: `simulator_${deviceId}_${process.pid}`,
  reconnectPeriod: 3_000,
  will: {
    topic: topicFor(deviceId, "state"),
    payload: JSON.stringify({ online: false }),
    qos: 1,
    retain: true
  }
});

function reportedState() {
  return {
    online: true,
    mode,
    alertLevel,
    irrigationSimulationActive,
    greenPattern: irrigationSimulationActive ? "BLINK" : alertLevel === "NORMAL" ? "SOLID" : "OFF",
    reportedAt: Date.now()
  };
}

function publishState(): void {
  if (!client.connected) return;
  client.publish(topicFor(deviceId, "state"), JSON.stringify(reportedState()), { qos: 1, retain: true });
}

function publishTelemetry(): void {
  if (!client.connected) return;
  const soilMoisturePct = Number.isNaN(configuredSoilMoisture)
    ? Math.round((50 + Math.sin(sequence / 3) * 18) * 10) / 10
    : configuredSoilMoisture;
  const telemetry = {
    sequence: sequence++,
    timestamp: Date.now(),
    temperatureC: Math.round((28 + Math.sin(sequence / 4) * 2) * 10) / 10,
    airHumidityPct: Math.round((68 + Math.cos(sequence / 5) * 6) * 10) / 10,
    soilRaw: Math.round(3_000 - soilMoisturePct * 18),
    soilMoisturePct
  };
  client.publish(topicFor(deviceId, "telemetry"), JSON.stringify(telemetry), { qos: 0, retain: false });
}

function publishAck(commandId: string, success: boolean, reason?: string): void {
  if (!client.connected) return;
  client.publish(
    topicFor(deviceId, "ack"),
    JSON.stringify({
      commandId,
      success,
      status: success ? "EXECUTED" : "FAILED",
      ...(reason ? { reason } : {}),
      reportedState: reportedState()
    }),
    { qos: 1, retain: false }
  );
}

function rememberCommand(commandId: string): void {
  handledCommandIds.add(commandId);
  if (handledCommandIds.size > 32) {
    const oldest = handledCommandIds.values().next().value;
    if (oldest) handledCommandIds.delete(oldest);
  }
}

function handleCommand(command: MqttCommandPayload): void {
  if (handledCommandIds.has(command.commandId)) {
    publishAck(command.commandId, true);
    return;
  }

  let success = true;
  let reason: string | undefined;
  switch (command.type) {
    case "START_IRRIGATION_SIMULATION":
      if (mode === "AUTO" && command.source !== "AUTO") {
        success = false;
        reason = "Switch to MANUAL mode before starting the simulation manually";
      } else {
        irrigationSimulationActive = true;
        simulationStartedAt = Date.now();
      }
      break;
    case "STOP_IRRIGATION_SIMULATION":
      irrigationSimulationActive = false;
      break;
    case "SET_MODE":
      if (command.value === "AUTO" || command.value === "MANUAL") {
        mode = command.value;
      } else {
        success = false;
        reason = "SET_MODE requires AUTO or MANUAL";
      }
      break;
    case "SET_ALERT_LEVEL":
      if (command.value === "NORMAL" || command.value === "WARNING" || command.value === "CRITICAL") {
        alertLevel = command.value;
      } else {
        success = false;
        reason = "SET_ALERT_LEVEL requires NORMAL, WARNING, or CRITICAL";
      }
      break;
  }

  rememberCommand(command.commandId);
  publishState();
  publishAck(command.commandId, success, reason);
  console.info(`[simulator] ${command.type} ${success ? "executed" : `failed: ${reason}`}`);
}

client.on("connect", () => {
  console.info(`[simulator] connected to ${mqttUrl} as ${deviceId}`);
  client.subscribe(topicFor(deviceId, "command"), { qos: 1 });
  publishState();
  publishTelemetry();
});

client.on("message", (topic, payload) => {
  if (topic !== topicFor(deviceId, "command")) return;
  let value: unknown;
  try {
    value = JSON.parse(payload.toString("utf8"));
  } catch {
    console.warn("[simulator] ignored invalid command JSON");
    return;
  }

  const command = parseCommandPayload(value);
  if (!command) {
    console.warn("[simulator] ignored invalid command payload");
    return;
  }
  handleCommand(command);
});

client.on("error", (error) => console.error(`[simulator] MQTT error: ${error.message}`));

const telemetryTimer = setInterval(publishTelemetry, telemetryIntervalMs);
const stateTimer = setInterval(publishState, 10_000);
const safetyTimer = setInterval(() => {
  if (irrigationSimulationActive && Date.now() - simulationStartedAt >= simulationTimeoutMs) {
    irrigationSimulationActive = false;
    publishState();
    console.info("[simulator] irrigation simulation stopped after the 60-second safety timeout");
  }
}, 1_000);

function shutdown(signal: string): void {
  clearInterval(telemetryTimer);
  clearInterval(stateTimer);
  clearInterval(safetyTimer);
  client.publish(topicFor(deviceId, "state"), JSON.stringify({ online: false }), { qos: 1, retain: true }, () => {
    client.end(true, () => {
      console.info(`[simulator] stopped (${signal})`);
      process.exit(0);
    });
  });
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
