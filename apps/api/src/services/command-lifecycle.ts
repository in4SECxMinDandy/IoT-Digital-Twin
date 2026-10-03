import type { CommandStatus } from "../domain";

export function commandStatusFromAck(success: boolean): CommandStatus {
  return success ? "EXECUTED" : "FAILED";
}

export function isCommandExpired(expiresAt: Date, now = new Date()): boolean {
  return expiresAt.getTime() <= now.getTime();
}
