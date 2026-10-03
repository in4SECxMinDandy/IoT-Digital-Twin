import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sprout } from "lucide-react";

import { formatWithUnit } from "../../lib/format";
import type { GardenLayout, PlantLayout } from "../../lib/garden-layout";
import type { Device } from "../../types";
import { GardenControls, GardenViewportNotice, HoverTooltip } from "./GardenControls";
import { GardenScene } from "./GardenScene";
import { GardenStatusBar, type PlantSummary } from "./GardenStatusBar";
import { DeviceDetailPanel, PlantDetailPanel } from "./PlantDetailPanel";
import {
  DEFAULT_LAYERS,
  type GardenLayerKey,
  type GardenLayers,
  type GardenViewMode,
  type HoverTarget,
  type PlantVisualState
} from "./scene-types";
import "./garden3d.css";

interface Garden3DProps {
  layout: GardenLayout | null;
  devices: Device[];
  onSelectDevice(deviceId: string): void;
}

type Selection = { kind: "plant"; id: string } | { kind: "device"; id: string } | null;

function toNumberOrNull(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

/** Captures everything setLayout() consumes, so identical structures do not rebuild. */
function layoutSignature(layout: GardenLayout): string {
  return [
    layout.gardenId,
    layout.dimensions ? `${layout.dimensions.width}x${layout.dimensions.length}` : "none",
    layout.plants
      .map((plant) => `${plant.plantId}@${plant.position.x},${plant.position.y},${plant.position.z}>${plant.deviceIds.join(",")}`)
      .join(";")
  ].join("|");
}

function reportedAt(device: Device): number {
  const stamp = device.currentState.lastTelemetry?.timestamp ?? device.lastSeen;
  const parsed = stamp ? Date.parse(stamp) : NaN;
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * A plant speaks through its board. With one device that is exact; if a plant ever
 * carries several, the most recent report represents it rather than an invented
 * average across boards that may disagree.
 */
function deviceForPlant(plant: PlantLayout, devices: Device[]): Device | null {
  const own = devices.filter((device) => plant.deviceIds.includes(device.deviceId));
  if (own.length === 0) return null;
  return own.reduce((newest, device) => (reportedAt(device) > reportedAt(newest) ? device : newest));
}

function plantStateFor(plant: PlantLayout, devices: Device[]): PlantVisualState {
  const device = deviceForPlant(plant, devices);
  const telemetry = device?.currentState.lastTelemetry;
  return {
    soilMoisturePct: toNumberOrNull(telemetry?.soilMoisturePct),
    temperatureC: toNumberOrNull(telemetry?.temperatureC),
    airHumidityPct: toNumberOrNull(telemetry?.airHumidityPct),
    environment: device?.currentState.environment ?? "INVALID",
    deviceStatus: device?.status ?? "OFFLINE",
    mode: device?.currentState.mode ?? "AUTO",
    irrigationSimulationActive: Boolean(device?.currentState.irrigationSimulationActive),
    greenPattern: device?.currentState.greenPattern ?? "OFF",
    updatedAt: telemetry?.timestamp ?? null,
    selected: false
  };
}

export function Garden3D({ layout, devices, onSelectDevice }: Garden3DProps) {
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<GardenScene | null>(null);
  const hasLayout = layout !== null;
  const signature = layout ? layoutSignature(layout) : "";

  const [selection, setSelection] = useState<Selection>(null);
  const [layers, setLayers] = useState<GardenLayers>({ ...DEFAULT_LAYERS });
  const [layersOpen, setLayersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<GardenViewMode>("perspective");
  const [fullscreen, setFullscreen] = useState(false);
  const [hover, setHover] = useState<HoverTarget>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);

  const selectPlant = useCallback(
    (plantId: string) => {
      setSelection({ kind: "plant", id: plantId });
      sceneRef.current?.setSelectedPlant(plantId);
      sceneRef.current?.focusPlant(plantId);
      const plant = layout?.plants.find((entry) => entry.plantId === plantId);
      const device = plant ? deviceForPlant(plant, devices) : null;
      // Selecting the board too, so the history chart loads this plant's real telemetry.
      if (device) onSelectDevice(device.deviceId);
    },
    [devices, layout, onSelectDevice]
  );

  const selectDevice = useCallback(
    (deviceId: string) => {
      setSelection({ kind: "device", id: deviceId });
      const plant = layout?.plants.find((entry) => entry.deviceIds.includes(deviceId));
      if (plant) {
        sceneRef.current?.setSelectedPlant(plant.plantId);
        sceneRef.current?.focusPlant(plant.plantId);
      }
      onSelectDevice(deviceId);
    },
    [layout, onSelectDevice]
  );

  const changeViewMode = useCallback((mode: GardenViewMode) => {
    setViewMode(mode);
    sceneRef.current?.setViewMode(mode);
  }, []);

  const goHome = useCallback(() => {
    setSelection(null);
    setViewMode("perspective");
    sceneRef.current?.resetView();
  }, []);

  const toggleLayer = useCallback((key: GardenLayerKey) => {
    setLayers((current) => ({ ...current, [key]: !current[key] }));
  }, []);

  const toggleSensorLayer = useCallback(() => {
    setLayers((current) => {
      const next = !(current.sensorValues && current.soilVisualization);
      return { ...current, sensorValues: next, soilVisualization: next };
    });
  }, []);

  const handlersRef = useRef({ selectPlant, selectDevice, setHover });
  handlersRef.current = { selectPlant, selectDevice, setHover };

  // Stable for the scene's whole life; it forwards to the latest render's handlers.
  const sceneCallbacks = useMemo(
    () => ({
      onSelectPlant: (plantId: string) => handlersRef.current.selectPlant(plantId),
      onSelectDevice: (deviceId: string) => handlersRef.current.selectDevice(deviceId),
      onHover: (target: HoverTarget) => handlersRef.current.setHover(target)
    }),
    []
  );

  useEffect(() => {
    const host = sceneHostRef.current;
    if (!host || !layout) return;
    try {
      sceneRef.current = new GardenScene(host, layout, sceneCallbacks);
    } catch (error) {
      setSceneError(error instanceof Error ? error.message : "Không khởi tạo được WebGL.");
      return;
    }
    return () => {
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
    // Keyed on presence, not identity: telemetry churn must never rebuild the scene.
  }, [hasLayout, sceneCallbacks]);

  useEffect(() => {
    if (layout) sceneRef.current?.setLayout(layout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !layout) return;
    for (const plant of layout.plants) scene.updatePlant(plant.plantId, plantStateFor(plant, devices));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, devices]);

  const selectedPlantId = useMemo(() => {
    if (!layout || !selection) return null;
    if (selection.kind === "plant") return selection.id;
    return layout.plants.find((plant) => plant.deviceIds.includes(selection.id))?.plantId ?? null;
  }, [layout, selection]);

  useEffect(() => {
    sceneRef.current?.setSelectedPlant(selectedPlantId);
  }, [selectedPlantId]);

  useEffect(() => {
    sceneRef.current?.setLayers(layers);
  }, [layers]);

  useEffect(() => {
    if (!selection) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelection(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selection]);

  const summaries: PlantSummary[] = useMemo(() => {
    if (!layout) return [];
    return layout.plants.map((plant) => {
      const device = deviceForPlant(plant, devices);
      return {
        plantId: plant.plantId,
        plantName: plant.plantName,
        deviceId: device?.deviceId ?? null,
        deviceName: device?.name ?? null,
        online: device?.status === "ONLINE",
        environment: device?.currentState.environment ?? "INVALID"
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, devices]);

  const selectedPlant = layout?.plants.find((plant) => plant.plantId === selectedPlantId) ?? null;
  const selectedDevice =
    selection?.kind === "device"
      ? devices.find((device) => device.deviceId === selection.id) ?? null
      : selectedPlant
        ? deviceForPlant(selectedPlant, devices)
        : null;

  const tooltip = useMemo(() => {
    if (!hover || !layout) return null;
    if (hover.kind === "device") {
      const device = devices.find((entry) => entry.deviceId === hover.id);
      if (!device) return null;
      return { title: device.name, lines: [device.status] };
    }
    const plant = layout.plants.find((entry) => entry.plantId === hover.id);
    if (!plant) return null;
    const state = plantStateFor(plant, devices);
    if (hover.kind === "soil") {
      return { title: "LM393", lines: [`Độ ẩm đất: ${formatWithUnit(state.soilMoisturePct, "%")}`] };
    }
    return {
      title: plant.plantName,
      lines: [`Đất: ${formatWithUnit(state.soilMoisturePct, "%")}`, `Nhiệt độ: ${formatWithUnit(state.temperatureC, "°C")}`]
    };
  }, [hover, layout, devices]);

  const sceneVisible = !sceneError && layout !== null && layout.plants.length > 0;

  return (
    <div className={`card g3d-card ${fullscreen ? "g3d-card--fullscreen" : ""}`}>
      <div className="g3d-card__header">
        <div className="g3d-card__title-row">
          <span className="g3d-card__icon" aria-hidden="true">
            <Sprout size={16} />
          </span>
          <div>
            <h3 className="card-title">
              Vườn cây 3D: <span className="text-forest-highlight">{layout?.gardenName ?? "—"}</span>
            </h3>
            <p className="g3d-card__subtitle">
              Digital Twin · mô hình 3D minh hoạ, không phải hình dạng thật của cây
            </p>
          </div>
        </div>
        <span className="g3d-card__badge">
          <span className="live-dot" aria-hidden="true" />
          3D Garden
        </span>
      </div>

      <div className="g3d-viewport">
        <div className="g3d-viewport__scene" ref={sceneHostRef} />

        {sceneError && (
          <GardenViewportNotice
            title="Không hiển thị được mô hình 3D"
            body={`Trình duyệt hoặc card đồ hoạ không khởi tạo được WebGL. ${sceneError} Số liệu cảm biến ở các thẻ khác vẫn hoạt động bình thường.`}
          />
        )}

        {!sceneError && layout && layout.plants.length === 0 && (
          <GardenViewportNotice
            title={`${layout.gardenName} chưa có cây nào`}
            body="Thêm một asset Plant thuộc vườn này để mô hình 3D có cây để hiển thị."
          />
        )}

        {!sceneError && !layout && (
          <GardenViewportNotice
            title="Chưa có vườn nào"
            body="API chưa trả về asset Garden nào. Kiểm tra backend đã seed Garden_01 chưa."
          />
        )}

        {sceneVisible && (
          <>
            <GardenControls
              viewMode={viewMode}
              layers={layers}
              layersOpen={layersOpen}
              fullscreen={fullscreen}
              onZoomIn={() => sceneRef.current?.zoomBy(1 / 1.25)}
              onZoomOut={() => sceneRef.current?.zoomBy(1.25)}
              onViewMode={changeViewMode}
              onHome={goHome}
              onToggleSensorLayer={toggleSensorLayer}
              onToggleLayer={toggleLayer}
              onLayersOpenChange={setLayersOpen}
              onToggleFullscreen={() => setFullscreen((value) => !value)}
            />

            {tooltip && hover && (
              <HoverTooltip title={tooltip.title} lines={tooltip.lines} x={hover.screenX + 14} y={hover.screenY + 14} />
            )}

            {selection?.kind === "device" && selectedDevice ? (
              <DeviceDetailPanel device={selectedDevice} onClose={() => setSelection(null)} />
            ) : selectedPlant ? (
              <PlantDetailPanel
                plant={selectedPlant}
                device={selectedDevice}
                state={plantStateFor(selectedPlant, devices)}
                onClose={() => setSelection(null)}
                onViewHistory={() => {
                  if (!selectedDevice) return;
                  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                  document
                    .getElementById("statistics-card")
                    ?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
                }}
              />
            ) : null}
          </>
        )}
      </div>

      {layout && (
        <GardenStatusBar
          gardenName={layout.gardenName}
          dimensions={layout.dimensions}
          visualizationOnly={layout.visualizationOnly}
          plants={summaries}
          selectedPlantId={selectedPlantId}
          onSelectPlant={selectPlant}
        />
      )}
    </div>
  );
}
