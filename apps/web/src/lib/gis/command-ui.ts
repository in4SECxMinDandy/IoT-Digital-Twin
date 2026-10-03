/**
 * Command state helpers for 3D map: classify command status, show pending UI.
 * Reuses existing command-state.ts logic.
 */

import type { Command, Device } from "../../types";

export interface CommandUIState {
  hasPending: boolean;
  pendingType: Command["type"] | null;
  showSpinner: boolean;
  disableControls: boolean;
}

/**
 * Determine if device has a pending command and what UI state to show.
 */
export function getCommandUIState(device: Device | null, commands: Command[]): CommandUIState {
  if (!device) {
    return { hasPending: false, pendingType: null, showSpinner: false, disableControls: false };
  }

  const pending = commands.find(
    (cmd) => cmd.deviceId === device.deviceId && cmd.status === "PENDING"
  );

  return {
    hasPending: Boolean(pending),
    pendingType: pending?.type ?? null,
    showSpinner: Boolean(pending),
    disableControls: Boolean(pending)
  };
}

/**
 * Explain why a command would be rejected (for user feedback).
 */
export function getCommandBlockReason(
  device: Device | null,
  commandType: Command["type"],
  commands: Command[]
): string | null {
  if (!device) return "Không có thiết bị được chọn";
  if (device.status === "OFFLINE") return "Thiết bị đang ngoại tuyến";

  const pending = commands.find(
    (cmd) => cmd.deviceId === device.deviceId && cmd.status === "PENDING"
  );
  if (pending) return `Lệnh ${pending.type} đang chờ xử lý`;

  if (commandType === "START_IRRIGATION_SIMULATION" || commandType === "STOP_IRRIGATION_SIMULATION") {
    if (device.currentState.mode === "AUTO") {
      return "Chuyển sang chế độ MANUAL để điều khiển mô phỏng thủ công";
    }
  }

  return null;
}
