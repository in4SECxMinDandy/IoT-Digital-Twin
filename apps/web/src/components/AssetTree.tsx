import { useState } from "react";
import { ChevronRight, Cpu, Sprout, TreePine } from "lucide-react";

import type { Asset, Device } from "../types";

interface AssetTreeProps {
  assets: Asset[];
  devices: Device[];
  selectedDeviceId?: string;
  onSelectDevice: (deviceId: string) => void;
}

function AssetBranch({
  asset,
  assets,
  devices,
  selectedDeviceId,
  onSelectDevice,
  depth
}: AssetTreeProps & { asset: Asset; depth: number }) {
  const [expanded, setExpanded] = useState(true);
  const childAssets = assets.filter((candidate) => candidate.parentAssetId === asset.id);
  const linkedDevices = devices.filter((device) => device.assetId === asset.id);
  const AssetIcon = asset.type === "garden" ? TreePine : Sprout;

  return (
    <li>
      <button
        type="button"
        className="asset-node"
        style={{ paddingLeft: `${12 + depth * 14}px` }}
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <ChevronRight className={expanded ? "asset-node__chevron--expanded" : ""} size={14} aria-hidden="true" />
        <AssetIcon size={16} aria-hidden="true" />
        <span>{asset.name}</span>
      </button>
      {expanded && (childAssets.length > 0 || linkedDevices.length > 0) && (
        <ul>
          {childAssets.map((child) => (
            <AssetBranch
              key={child.id}
              asset={child}
              assets={assets}
              devices={devices}
              selectedDeviceId={selectedDeviceId}
              onSelectDevice={onSelectDevice}
              depth={depth + 1}
            />
          ))}
          {linkedDevices.map((device) => (
            <li key={device.deviceId}>
              <button
                className={`device-node ${device.deviceId === selectedDeviceId ? "device-node--selected" : ""}`}
                style={{ paddingLeft: `${26 + depth * 14}px` }}
                onClick={() => onSelectDevice(device.deviceId)}
              >
                <Cpu size={16} aria-hidden="true" />
                <span>{device.name}</span>
                <span className={`device-dot device-dot--${device.status.toLowerCase()}`} aria-label={device.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export function AssetTree(props: AssetTreeProps) {
  const roots = props.assets.filter((asset) => asset.parentAssetId === null);
  return (
    <nav className="asset-tree" aria-label="Digital Twin assets">
      <p className="eyebrow">Digital Twin</p>
      <ul>
        {roots.map((asset) => (
          <AssetBranch key={asset.id} asset={asset} depth={0} {...props} />
        ))}
      </ul>
    </nav>
  );
}
