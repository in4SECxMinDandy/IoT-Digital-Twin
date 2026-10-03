import { describe, expect, test } from "vitest";
import type { Command, Device } from "../../types";
import { getCommandUIState, getCommandBlockReason } from "./command-ui";

const mockDevice = (overrides?: Partial<Device>): Device => ({
  id: "1",
  deviceId: "esp32_01",
  name: "ESP32_01",
  type: "soil_sensor",
  assetId: "plant_01",
  attributes: {},
  status: "ONLINE",
  currentState: {
    mode: "MANUAL",
    environment: "NORMAL",
    alertLevel: "NORMAL",
    irrigationSimulationActive: false,
    greenPattern: "OFF"
  },
  ...overrides
});

const mockCommand = (overrides?: Partial<Command>): Command => ({
  id: "cmd_1",
  deviceId: "esp32_01",
  commandId: "cmd_1",
  type: "SET_MODE",
  value: "AUTO",
  source: "MANUAL",
  status: "PENDING",
  createdAt: new Date().toISOString(),
  expiresAt: new Date(Date.now() + 60000).toISOString(),
  ...overrides
});

describe("getCommandUIState", () => {
  test("returns no pending when device is null", () => {
    const result = getCommandUIState(null, []);
    expect(result).toEqual({
      hasPending: false,
      pendingType: null,
      showSpinner: false,
      disableControls: false
    });
  });

  test("returns pending state when command is PENDING", () => {
    const device = mockDevice();
    const commands = [mockCommand({ status: "PENDING", type: "SET_MODE" })];
    const result = getCommandUIState(device, commands);
    expect(result).toEqual({
      hasPending: true,
      pendingType: "SET_MODE",
      showSpinner: true,
      disableControls: true
    });
  });

  test("returns no pending when command is EXECUTED", () => {
    const device = mockDevice();
    const commands = [mockCommand({ status: "EXECUTED" })];
    const result = getCommandUIState(device, commands);
    expect(result).toEqual({
      hasPending: false,
      pendingType: null,
      showSpinner: false,
      disableControls: false
    });
  });

  test("returns no pending when command is FAILED", () => {
    const device = mockDevice();
    const commands = [mockCommand({ status: "FAILED" })];
    const result = getCommandUIState(device, commands);
    expect(result.hasPending).toBe(false);
  });

  test("returns no pending when command is TIMEOUT", () => {
    const device = mockDevice();
    const commands = [mockCommand({ status: "TIMEOUT" })];
    const result = getCommandUIState(device, commands);
    expect(result.hasPending).toBe(false);
  });

  test("ignores commands for other devices", () => {
    const device = mockDevice({ deviceId: "esp32_01" });
    const commands = [mockCommand({ deviceId: "esp32_02", status: "PENDING" })];
    const result = getCommandUIState(device, commands);
    expect(result.hasPending).toBe(false);
  });
});

describe("getCommandBlockReason", () => {
  test("returns message when device is null", () => {
    const reason = getCommandBlockReason(null, "SET_MODE", []);
    expect(reason).toBe("Không có thiết bị được chọn");
  });

  test("returns message when device is OFFLINE", () => {
    const device = mockDevice({ status: "OFFLINE" });
    const reason = getCommandBlockReason(device, "SET_MODE", []);
    expect(reason).toBe("Thiết bị đang ngoại tuyến");
  });

  test("returns message when command is PENDING", () => {
    const device = mockDevice();
    const commands = [mockCommand({ type: "SET_MODE", status: "PENDING" })];
    const reason = getCommandBlockReason(device, "START_IRRIGATION_SIMULATION", commands);
    expect(reason).toBe("Lệnh SET_MODE đang chờ xử lý");
  });

  test("returns message when trying to irrigate in AUTO mode", () => {
    const device = mockDevice({ currentState: { ...mockDevice().currentState, mode: "AUTO" } });
    const reason = getCommandBlockReason(device, "START_IRRIGATION_SIMULATION", []);
    expect(reason).toBe("Chuyển sang chế độ MANUAL để điều khiển mô phỏng thủ công");
  });

  test("returns message when trying to stop irrigation in AUTO mode", () => {
    const device = mockDevice({ currentState: { ...mockDevice().currentState, mode: "AUTO" } });
    const reason = getCommandBlockReason(device, "STOP_IRRIGATION_SIMULATION", []);
    expect(reason).toBe("Chuyển sang chế độ MANUAL để điều khiển mô phỏng thủ công");
  });

  test("returns null when SET_MODE is allowed", () => {
    const device = mockDevice();
    const reason = getCommandBlockReason(device, "SET_MODE", []);
    expect(reason).toBeNull();
  });

  test("returns null when irrigation is allowed in MANUAL mode", () => {
    const device = mockDevice({ currentState: { ...mockDevice().currentState, mode: "MANUAL" } });
    const reason = getCommandBlockReason(device, "START_IRRIGATION_SIMULATION", []);
    expect(reason).toBeNull();
  });
});
