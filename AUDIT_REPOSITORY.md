# Repository Audit

Audit time: 2026-10-02 (Asia/Ho_Chi_Minh)

## Scope

The requested outcome is a student IoT project for plant-environment monitoring,
Digital Twin state, and LED-based irrigation simulation. The fixed hardware is
ESP32-WROOM-32S, DHT11, LM393, three LEDs, a breadboard, and jumper wires.

## Findings

| Component | Current state | Issue | Action |
|---|---|---|
| Repository layout | Three Markdown architecture/review documents only | No application source tree exists | Create a small npm-workspaces project; preserve all existing documents |
| Git | No `.git` directory | No commit history or working implementation to patch | Do not assume or overwrite prior code |
| Backend | Missing | No REST API, MQTT client, validation, rules, alarms, or command state | Add one TypeScript Node.js/Express service |
| Frontend | Missing | No React dashboard or realtime client | Add one Vite + React TypeScript application |
| ESP32 firmware | Missing | No sensor, LED, MQTT, or ACK implementation | Add one PlatformIO firmware project |
| MongoDB model | Documentation only | No persistent Asset, Device, Telemetry, Alarm, or Command model | Add minimal Mongoose models and seed data |
| MQTT | Documentation only; diagrams identify Mosquitto | No topic handlers, retained state, LWT, or command/ACK implementation | Add four-topic contract and a lightweight simulator |
| WebSocket | Documentation only | Dashboard cannot receive changes realtime | Add Socket.IO to the Node service and React client |
| Docker | Missing | No reproducible local stack | Add Compose for Mosquitto, MongoDB, API, and Web after application code |
| Tests | Missing | No verification of core logic | Add focused Vitest tests for validation, rules, command lifecycle, and timeout helpers |
| Environment | Node.js 22, npm 10, Docker Compose available | No ESP32 board connected for physical verification | Run Node/frontend tests and builds, compile firmware with PlatformIO, and smoke-test Docker |

## Architecture Gap Summary

The architecture documents describe a useful IoT loop, but no implementation
exists. The project therefore needs initial scaffolding rather than a rewrite.
The implementation will remain a single Node service plus a single React app:

```text
ESP32 -> Mosquitto -> Node.js/Express -> MongoDB + Socket.IO -> React
             ^              |
             +--- command --+
```

The LED output is an irrigation simulation. It is not a pump, does not move
water, and does not measure irrigated volume.
