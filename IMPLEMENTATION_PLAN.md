# Implementation Plan

## Goal

Implement the smallest complete student IoT stack that demonstrates:

```text
Sensors -> ESP32 -> MQTT -> Backend -> MongoDB -> WebSocket -> React
React -> Backend -> MQTT -> ESP32 LEDs -> ACK -> React
```

No hardware will be added. Irrigation is represented only by an LED pattern.

## Chosen Stack

- `apps/api`: Node.js, Express, TypeScript, Mongoose, MQTT.js, Socket.IO, Zod.
- `apps/web`: Vite, React, TypeScript, Socket.IO client, Recharts, Lucide.
- `firmware`: PlatformIO ESP32 project using DHT, AsyncMqttClient, and ArduinoJson.
- Local infrastructure: MongoDB and Mosquitto through Docker Compose.
- Development fallback: a very small Node MQTT device simulator.

## Work Breakdown

1. Scaffold npm workspaces and common scripts.
2. Add backend configuration, data models, seed data, MQTT lifecycle, REST API,
   Socket.IO events, validation, smoothing, rules, alarms, commands, and tests.
3. Add React dashboard with REST snapshot, realtime socket updates, historical
   charts, Twin details, alarm list, and manual/AUTO simulation controls.
4. Add ESP32 firmware using non-blocking `millis()` scheduling, MQTT state/LWT,
   telemetry, commands, ACKs, and documented LED behavior.
5. Add Docker Compose, Mosquitto configuration, a device simulator, `.env.example`,
   and README instructions.
6. Install dependencies, run typecheck/tests/build, run a local smoke test where
   environment tooling permits, fix any failures, and report limitations exactly.

## Scope Boundaries

- One backend service, one MongoDB database, one MQTT broker, one React client.
- No Python, FastAPI, Java, ThingsBoard runtime, AI, ML, microservices, Kafka,
  Kubernetes, relay, pump, flow sensor, or water-level sensor.
- `Garden_01 -> Plant_01 -> ESP32_01` is seeded. Sensors and LEDs are ESP32
  capabilities, not network devices.
- Four MQTT topics only: `telemetry`, `state`, `command`, and `ack`.

## Acceptance Checks

- Backend rules/validation/command lifecycle tests pass.
- API and web TypeScript builds pass.
- Frontend renders and handles loading, errors, command state, and realtime events.
- Docker Compose syntax/configuration is checked; runtime stack is smoke-tested if
  Docker is available.
- Firmware compiles with PlatformIO (`pio run -d firmware`); flashing and LED
  output still require the physical board, sensor calibration, and safe wiring.
