import { Router, type RequestHandler } from "express";
import { z } from "zod";

import type { CommandType } from "../domain";
import { AppError } from "../lib/errors";
import { serializeDocument } from "../lib/serialize";
import { Alarm } from "../models/Alarm";
import { Asset } from "../models/Asset";
import { Command } from "../models/Command";
import { Device } from "../models/Device";
import { Telemetry } from "../models/Telemetry";
import type { CommandService } from "../services/command-service";

const commandRequestSchema = z
  .object({
    type: z.enum(["START_IRRIGATION_SIMULATION", "STOP_IRRIGATION_SIMULATION", "SET_MODE"]),
    value: z.string().max(20).optional()
  })
  .superRefine((value, context) => {
    if (value.type === "SET_MODE" && value.value !== "AUTO" && value.value !== "MANUAL") {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "SET_MODE requires value AUTO or MANUAL",
        path: ["value"]
      });
    }
  });

const telemetryQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  limit: z.coerce.number().int().min(1).max(1_000).default(200)
});

const alarmQuerySchema = z.object({
  status: z.enum(["OPEN", "RESOLVED"]).optional()
});

const commandQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

function asyncRoute(handler: RequestHandler): RequestHandler {
  return (request, response, next) => {
    Promise.resolve(handler(request, response, next)).catch(next);
  };
}

function requireDeviceId(value: unknown): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new AppError("A deviceId route parameter is required", 400);
  }
  return value;
}

export function createApiRouter(commandService: CommandService): Router {
  const router = Router();

  router.get(
    "/assets",
    asyncRoute(async (_request, response) => {
      const [assets, devices] = await Promise.all([Asset.find().sort({ name: 1 }).lean(), Device.find().sort({ name: 1 }).lean()]);
      response.json({
        success: true,
        data: {
          assets: assets.map(serializeDocument),
          devices: devices.map(serializeDocument)
        }
      });
    })
  );

  router.get(
    "/devices",
    asyncRoute(async (_request, response) => {
      const devices = await Device.find().sort({ name: 1 }).lean();
      response.json({ success: true, data: devices.map(serializeDocument) });
    })
  );

  router.get(
    "/devices/:deviceId",
    asyncRoute(async (request, response) => {
      const deviceId = requireDeviceId(request.params.deviceId);
      const device = await Device.findOne({ deviceId }).lean();
      if (!device) throw new AppError("Device not found", 404);
      response.json({ success: true, data: serializeDocument(device) });
    })
  );

  router.get(
    "/devices/:deviceId/telemetry",
    asyncRoute(async (request, response) => {
      const deviceId = requireDeviceId(request.params.deviceId);
      const parsed = telemetryQuerySchema.safeParse(request.query);
      if (!parsed.success) throw new AppError("Invalid telemetry query", 400, parsed.error.flatten());

      const filter: Record<string, unknown> = { deviceId };
      if (parsed.data.from || parsed.data.to) {
        filter.timestamp = {
          ...(parsed.data.from ? { $gte: new Date(parsed.data.from) } : {}),
          ...(parsed.data.to ? { $lte: new Date(parsed.data.to) } : {})
        };
      }
      const telemetry = await Telemetry.find(filter).sort({ timestamp: -1 }).limit(parsed.data.limit).lean();
      response.json({ success: true, data: telemetry.reverse().map(serializeDocument) });
    })
  );

  router.get(
    "/devices/:deviceId/alarms",
    asyncRoute(async (request, response) => {
      const deviceId = requireDeviceId(request.params.deviceId);
      const parsed = alarmQuerySchema.safeParse(request.query);
      if (!parsed.success) throw new AppError("Invalid alarm query", 400, parsed.error.flatten());
      const alarms = await Alarm.find({ deviceId, ...(parsed.data.status ? { status: parsed.data.status } : {}) })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();
      response.json({ success: true, data: alarms.map(serializeDocument) });
    })
  );

  router.post(
    "/devices/:deviceId/commands",
    asyncRoute(async (request, response) => {
      const deviceId = requireDeviceId(request.params.deviceId);
      const parsed = commandRequestSchema.safeParse(request.body);
      if (!parsed.success) throw new AppError("Invalid command", 400, parsed.error.flatten());
      const command = await commandService.dispatch({
        deviceId,
        type: parsed.data.type as CommandType,
        ...(parsed.data.value ? { value: parsed.data.value } : {}),
        source: "MANUAL"
      });
      response.status(202).json({ success: true, data: serializeDocument(command.toObject()) });
    })
  );

  router.get(
    "/devices/:deviceId/commands",
    asyncRoute(async (request, response) => {
      const deviceId = requireDeviceId(request.params.deviceId);
      const parsed = commandQuerySchema.safeParse(request.query);
      if (!parsed.success) throw new AppError("Invalid command query", 400, parsed.error.flatten());
      const commands = await Command.find({ deviceId }).sort({ createdAt: -1 }).limit(parsed.data.limit).lean();
      response.json({ success: true, data: commands.map(serializeDocument) });
    })
  );

  router.get(
    "/commands/:commandId",
    asyncRoute(async (request, response) => {
      const commandId = request.params.commandId;
      const command = await Command.findOne({ commandId }).lean();
      if (!command) throw new AppError("Command not found", 404);
      response.json({ success: true, data: serializeDocument(command) });
    })
  );

  return router;
}
