import { describe, expect, it } from "vitest";

import { commandStatusFromAck, isCommandExpired } from "../services/command-lifecycle";

describe("command lifecycle helpers", () => {
  it("maps ESP32 acknowledgement outcome to a terminal command state", () => {
    expect(commandStatusFromAck(true)).toBe("EXECUTED");
    expect(commandStatusFromAck(false)).toBe("FAILED");
  });

  it("expires a command exactly at its deadline", () => {
    const expiresAt = new Date("2026-10-02T08:00:10.000Z");

    expect(isCommandExpired(expiresAt, new Date("2026-10-02T08:00:09.999Z"))).toBe(false);
    expect(isCommandExpired(expiresAt, expiresAt)).toBe(true);
    expect(isCommandExpired(expiresAt, new Date("2026-10-02T08:00:10.001Z"))).toBe(true);
  });
});
