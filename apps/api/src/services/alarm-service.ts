import type { Types } from "mongoose";

import type { AlarmSeverity, AlarmType } from "../domain";
import { Alarm } from "../models/Alarm";
import { serializeDocument } from "../lib/serialize";
import type { RealtimeNotifier } from "./notifier";

export interface AlarmCondition {
  deviceId: string;
  assetId: Types.ObjectId;
  type: AlarmType;
  severity: AlarmSeverity;
  message: string;
  latestValue?: string | number | string[];
  active: boolean;
}

export class AlarmService {
  constructor(private readonly notifier: RealtimeNotifier) {}

  async sync(condition: AlarmCondition): Promise<void> {
    const openAlarm = await Alarm.findOne({
      deviceId: condition.deviceId,
      type: condition.type,
      status: "OPEN"
    });

    if (condition.active) {
      if (openAlarm) {
        openAlarm.severity = condition.severity;
        openAlarm.message = condition.message;
        openAlarm.latestValue = condition.latestValue ?? null;
        await openAlarm.save();
        this.notifier.emitToDevice(condition.deviceId, "alarm:update", serializeDocument(openAlarm.toObject()));
        return;
      }

      const created = await Alarm.create({
        deviceId: condition.deviceId,
        assetId: condition.assetId,
        type: condition.type,
        severity: condition.severity,
        message: condition.message,
        latestValue: condition.latestValue ?? null,
        status: "OPEN"
      });
      this.notifier.emitToDevice(condition.deviceId, "alarm:new", serializeDocument(created.toObject()));
      return;
    }

    if (!openAlarm) {
      return;
    }

    openAlarm.status = "RESOLVED";
    openAlarm.resolvedAt = new Date();
    await openAlarm.save();
    this.notifier.emitToDevice(condition.deviceId, "alarm:update", serializeDocument(openAlarm.toObject()));
  }
}
