import { Asset } from "../models/Asset";
import { Device } from "../models/Device";

export async function ensureDemoTwin(): Promise<void> {
  const garden = await Asset.findOneAndUpdate(
    { name: "Garden_01", type: "garden" },
    {
      $setOnInsert: {
        name: "Garden_01",
        type: "garden",
        parentAssetId: null,
        attributes: { location: "Student demo bench" }
      }
    },
    { upsert: true, new: true }
  );

  const plant = await Asset.findOneAndUpdate(
    { name: "Plant_01", type: "plant" },
    {
      $setOnInsert: {
        name: "Plant_01",
        type: "plant",
        parentAssetId: garden._id,
        attributes: { warningMinPct: 40, normalMinPct: 60 }
      }
    },
    { upsert: true, new: true }
  );

  await Device.findOneAndUpdate(
    { deviceId: "esp32_01" },
    {
      $setOnInsert: {
        deviceId: "esp32_01",
        name: "ESP32_01",
        type: "ESP32-WROOM-32S",
        assetId: plant._id,
        attributes: {
          firmwareVersion: "unreported",
          sensors: ["DHT11", "LM393"],
          ledRoles: {
            normal: "green-solid",
            warning: "yellow-solid",
            critical: "red-solid",
            irrigationSimulation: "green-blink"
          },
          sampleIntervalSeconds: 5,
          dryRaw: null,
          wetRaw: null
        },
        status: "OFFLINE"
      }
    },
    { upsert: true, new: true }
  );
}
