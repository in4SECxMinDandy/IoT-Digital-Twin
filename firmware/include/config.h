#pragma once

// Copy secrets.example.h to secrets.local.h and provide the LAN Wi-Fi and
// broker address. secrets.local.h is intentionally ignored by Git.
#if __has_include("secrets.local.h")
#include "secrets.local.h"
#endif

#ifndef WIFI_SSID
#define WIFI_SSID ""
#endif

#ifndef WIFI_PASSWORD
#define WIFI_PASSWORD ""
#endif

// This must be the computer's LAN address when Mosquitto runs in Docker.
// Docker service names and localhost do not resolve from an ESP32.
#ifndef MQTT_HOST
#define MQTT_HOST ""
#endif

#ifndef MQTT_PORT
#define MQTT_PORT 1883
#endif

#ifndef MQTT_USERNAME
#define MQTT_USERNAME ""
#endif

#ifndef MQTT_PASSWORD
#define MQTT_PASSWORD ""
#endif

// The seeded backend device uses this exact ID unless it is changed there too.
#ifndef DEVICE_ID
#define DEVICE_ID "esp32_01"
#endif

// Pin defaults are configurable. GPIO34 is input-only and suitable for LM393
// AO/DO. Never attach a 5 V signal directly to an ESP32 input.
#ifndef DHT_PIN
#define DHT_PIN 4
#endif

#ifndef SOIL_PIN
#define SOIL_PIN 34
#endif

#ifndef LED_GREEN_PIN
#define LED_GREEN_PIN 25
#endif

#ifndef LED_YELLOW_PIN
#define LED_YELLOW_PIN 26
#endif

#ifndef LED_RED_PIN
#define LED_RED_PIN 27
#endif

// Set to 1 only after verifying LM393 AO is in the ESP32-safe 0-3.3 V range.
// Set to 0 to read the LM393 DO threshold output only; that mode cannot create
// a real moisture percentage and therefore does not drive automatic simulation.
#ifndef SOIL_SENSOR_USE_ANALOG
#define SOIL_SENSOR_USE_ANALOG 1
#endif

// Measure both values on the actual setup. Leave either value at -1 until
// calibration is complete. The firmware will then publish soilRaw only.
#ifndef SOIL_DRY_RAW
#define SOIL_DRY_RAW -1
#endif

#ifndef SOIL_WET_RAW
#define SOIL_WET_RAW -1
#endif

#ifndef TELEMETRY_INTERVAL_MS
#define TELEMETRY_INTERVAL_MS 5000UL
#endif

#ifndef STATE_INTERVAL_MS
#define STATE_INTERVAL_MS 10000UL
#endif

#ifndef WIFI_RETRY_INTERVAL_MS
#define WIFI_RETRY_INTERVAL_MS 10000UL
#endif

#ifndef MQTT_RETRY_INTERVAL_MS
#define MQTT_RETRY_INTERVAL_MS 5000UL
#endif

#ifndef MQTT_CONNECT_TIMEOUT_MS
#define MQTT_CONNECT_TIMEOUT_MS 10000UL
#endif

#ifndef MAX_IRRIGATION_SIMULATION_MS
#define MAX_IRRIGATION_SIMULATION_MS 60000UL
#endif

#ifndef GREEN_BLINK_INTERVAL_MS
#define GREEN_BLINK_INTERVAL_MS 500UL
#endif

// Use LOW here only when the supplied LED board is explicitly active-low.
#ifndef LED_ON_LEVEL
#define LED_ON_LEVEL HIGH
#endif

#ifndef LED_OFF_LEVEL
#define LED_OFF_LEVEL LOW
#endif

// Bare LEDs are not safe on an ESP32 GPIO without current limiting. Keep this
// at 0 until the supplied LED board/current limiter has been verified.
#ifndef ENABLE_LED_OUTPUT
#define ENABLE_LED_OUTPUT 0
#endif
