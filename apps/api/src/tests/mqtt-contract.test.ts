import { describe, expect, it } from "vitest";

import {
  parseAckPayload,
  parseCommandPayload,
  parseJsonPayload,
  parseReportedState,
  topicFor
} from "../services/mqtt-contract";

describe("MQTT topic contract", () => {
  it("uses one predictable topic for each device channel", () => {
    expect(topicFor("ESP32_01", "telemetry")).toBe("iot/ESP32_01/telemetry");
    expect(topicFor("ESP32_01", "state")).toBe("iot/ESP32_01/state");
    expect(topicFor("ESP32_01", "command")).toBe("iot/ESP32_01/command");
    expect(topicFor("ESP32_01", "ack")).toBe("iot/ESP32_01/ack");
  });
});

describe("MQTT payload contract", () => {
  it("parses a valid ACK and converts its report timestamp to a Date", () => {
    const reportedAt = Date.parse("2026-10-02T08:00:00.000Z");

    expect(
      parseAckPayload({
        commandId: "command-123",
        success: true,
        status: "EXECUTED",
        reportedState: {
          online: true,
          mode: "AUTO",
          alertLevel: "CRITICAL",
          irrigationSimulationActive: true,
          greenPattern: "BLINK",
          reportedAt
        }
      })
    ).toEqual({
      commandId: "command-123",
      success: true,
      status: "EXECUTED",
      state: undefined,
      reason: undefined,
      reportedState: {
        online: true,
        mode: "AUTO",
        alertLevel: "CRITICAL",
        irrigationSimulationActive: true,
        greenPattern: "BLINK",
        reportedAt: new Date(reportedAt)
      }
    });
  });

  it("rejects ACKs with unsupported terminal states or non-boolean success", () => {
    expect(parseAckPayload({ commandId: "command-123", success: "true" })).toBeNull();
    expect(parseAckPayload({ commandId: "command-123", success: true, status: "PENDING" })).toBeNull();
    expect(
      parseAckPayload({
        commandId: "command-123",
        success: true,
        reportedState: { alertLevel: "INVALID" }
      })
    ).toBeNull();
  });

  it("requires an explicit online flag in a device state report", () => {
    const reportedAt = Date.parse("2026-10-02T08:00:00.000Z");

    expect(
      parseReportedState({
        online: true,
        mode: "MANUAL",
        alertLevel: "WARNING",
        irrigationSimulationActive: false,
        greenPattern: "SOLID",
        uptimeMs: 1234,
        reportedAt
      })
    ).toEqual({
      online: true,
      mode: "MANUAL",
      alertLevel: "WARNING",
      irrigationSimulationActive: false,
      greenPattern: "SOLID",
      reportedAt: new Date(reportedAt)
    });
    expect(parseReportedState({ mode: "AUTO" })).toBeNull();
    expect(parseReportedState({ online: true, greenPattern: "FLASH" })).toBeNull();
  });

  it("rejects malformed JSON and invalid commands before they reach a device", () => {
    expect(parseJsonPayload(Buffer.from('{"commandId":'))).toBeNull();
    expect(parseCommandPayload({ commandId: "command-123", type: "SET_MODE", value: "AUTO" })).toEqual({
      commandId: "command-123",
      type: "SET_MODE",
      value: "AUTO",
      source: "MANUAL"
    });
    expect(parseCommandPayload({ commandId: "command-123", type: "TURN_PUMP_ON" })).toBeNull();
  });
});
