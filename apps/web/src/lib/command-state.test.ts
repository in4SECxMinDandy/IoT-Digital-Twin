import { describe, expect, it } from "vitest";

import type { Command, Device } from "../types";
import { applyCommandStatus, mergeCommand } from "./command-state";

describe("command state", () => {
  it("does not regress an executed ACK when the pending HTTP response arrives later", () => {
    const pending: Command = {
      id: "1",
      commandId: "cmd-1",
      deviceId: "esp32_01",
      type: "START_IRRIGATION_SIMULATION",
      source: "MANUAL",
      status: "PENDING",
      createdAt: "2026-10-02T10:00:00.000Z",
      expiresAt: "2026-10-02T10:00:10.000Z"
    };
    const executed: Command = {
      ...pending,
      status: "EXECUTED",
      completedAt: "2026-10-02T10:00:01.000Z"
    };
    const device: Device = {
      id: "device-1",
      deviceId: "esp32_01",
      name: "ESP32_01",
      type: "esp32",
      assetId: "plant-1",
      attributes: {},
      status: "ONLINE",
      currentState: {
        mode: "MANUAL",
        environment: "NORMAL",
        alertLevel: "NORMAL",
        irrigationSimulationActive: false,
        greenPattern: "OFF"
      }
    };

    expect(mergeCommand(mergeCommand([], executed), pending)[0].status).toBe("EXECUTED");
    const reported = applyCommandStatus(device, executed);
    expect(applyCommandStatus(reported, pending).currentState.lastCommand?.status).toBe("EXECUTED");
  });
});
