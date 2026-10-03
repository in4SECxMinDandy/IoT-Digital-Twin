import type { Server } from "socket.io";

export type RealtimeEvent = "telemetry:update" | "device:status" | "alarm:new" | "alarm:update" | "command:update";

export interface RealtimeNotifier {
  emitToDevice(deviceId: string, event: RealtimeEvent, payload: unknown): void;
}

export class SocketNotifier implements RealtimeNotifier {
  constructor(private readonly io: Server) {}

  emitToDevice(deviceId: string, event: RealtimeEvent, payload: unknown): void {
    this.io.to(`device:${deviceId}`).emit(event, payload);
  }
}

export const noopNotifier: RealtimeNotifier = {
  emitToDevice: () => undefined
};
