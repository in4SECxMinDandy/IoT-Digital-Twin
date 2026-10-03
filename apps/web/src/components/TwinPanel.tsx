import { Cpu, MapPin, SlidersHorizontal } from "lucide-react";

import type { Asset, Device } from "../types";

interface TwinPanelProps {
  device: Device;
  assets: Asset[];
}

function assetName(assets: Asset[], id: string): string {
  return assets.find((asset) => asset.id === id)?.name ?? "Unassigned";
}

export function TwinPanel({ device, assets }: TwinPanelProps) {
  const plant = assets.find((asset) => asset.id === device.assetId);
  const garden = plant?.parentAssetId ? assetName(assets, plant.parentAssetId) : "Unassigned";
  const attributes = device.attributes as {
    firmwareVersion?: string;
    sensors?: string[];
    sampleIntervalSeconds?: number;
    dryRaw?: number | null;
    wetRaw?: number | null;
  };

  return (
    <section className="panel twin-panel" aria-labelledby="twin-title">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Digital Twin</p>
          <h2 id="twin-title">Device context</h2>
        </div>
        <Cpu size={20} aria-hidden="true" />
      </div>
      <dl className="twin-details">
        <div>
          <dt><MapPin size={16} aria-hidden="true" />Asset</dt>
          <dd>{garden} / {plant?.name ?? "Unassigned"}</dd>
        </div>
        <div>
          <dt><Cpu size={16} aria-hidden="true" />Device</dt>
          <dd>{device.name} ({device.deviceId})</dd>
        </div>
        <div>
          <dt><SlidersHorizontal size={16} aria-hidden="true" />Firmware</dt>
          <dd>{attributes.firmwareVersion ?? "unreported"}</dd>
        </div>
        <div>
          <dt>Capabilities</dt>
          <dd>{attributes.sensors?.join(", ") ?? "DHT11, LM393"}</dd>
        </div>
        <div>
          <dt>Sample interval</dt>
          <dd>{attributes.sampleIntervalSeconds ?? 5}s</dd>
        </div>
        <div>
          <dt>Calibration</dt>
          <dd>
            {attributes.dryRaw ?? "-"} dry / {attributes.wetRaw ?? "-"} wet
          </dd>
        </div>
      </dl>
    </section>
  );
}
