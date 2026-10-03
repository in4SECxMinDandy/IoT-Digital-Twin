import type { Server as HttpServer } from "node:http";

import { Server } from "socket.io";
import { z } from "zod";

import type { AppConfig } from "./config/env";
import { logger } from "./lib/logger";

const subscriptionSchema = z.object({
  deviceId: z.string().min(1).max(100)
});

export function createSocketServer(server: HttpServer, appConfig: AppConfig): Server {
  const io = new Server(server, {
    cors: {
      origin: appConfig.corsOrigins,
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    socket.on("subscribe", (payload: unknown) => {
      const parsed = subscriptionSchema.safeParse(payload);
      if (!parsed.success) {
        socket.emit("subscription:error", { message: "Invalid subscription request" });
        return;
      }

      socket.join(`device:${parsed.data.deviceId}`);
      socket.emit("subscription:ready", { deviceId: parsed.data.deviceId });
    });

    socket.on("disconnect", (reason) => logger.info("WebSocket disconnected", { reason }));
  });

  return io;
}
