import { useEffect, useRef } from "react";
import { Home, Layers as LayersIcon, Maximize2, Minimize2, Minus, Move3d, Plus, Radio, X } from "lucide-react";

import type { GardenLayerKey, GardenLayers, GardenViewMode } from "./scene-types";

const LAYER_LABELS: Record<GardenLayerKey, string> = {
  plants: "Cây trồng",
  devices: "ESP32",
  sensorValues: "Giá trị cảm biến",
  soilVisualization: "Vùng đất LM393 đo"
};

interface GardenControlsProps {
  viewMode: GardenViewMode;
  layers: GardenLayers;
  layersOpen: boolean;
  fullscreen: boolean;
  onZoomIn(): void;
  onZoomOut(): void;
  onViewMode(mode: GardenViewMode): void;
  onHome(): void;
  onToggleSensorLayer(): void;
  onToggleLayer(key: GardenLayerKey): void;
  onLayersOpenChange(open: boolean): void;
  onToggleFullscreen(): void;
}

export function GardenControls({
  viewMode,
  layers,
  layersOpen,
  fullscreen,
  onZoomIn,
  onZoomOut,
  onViewMode,
  onHome,
  onToggleSensorLayer,
  onToggleLayer,
  onLayersOpenChange,
  onToggleFullscreen
}: GardenControlsProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const sensorLayerOn = layers.sensorValues && layers.soilVisualization;

  useEffect(() => {
    if (!layersOpen) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!popoverRef.current?.contains(event.target as Node)) onLayersOpenChange(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onLayersOpenChange(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [layersOpen, onLayersOpenChange]);

  return (
    <>
      <div className="g3d-toolbar" role="toolbar" aria-label="Điều khiển khung nhìn vườn 3D">
        <button
          type="button"
          className={`g3d-tool ${viewMode === "perspective" ? "g3d-tool--active" : ""}`}
          onClick={() => onViewMode("perspective")}
          aria-pressed={viewMode === "perspective"}
          title="Góc nhìn phối cảnh, xoay quanh vườn"
        >
          <Move3d size={14} aria-hidden="true" />
          <span>3D</span>
        </button>
        <button
          type="button"
          className={`g3d-tool ${viewMode === "top" ? "g3d-tool--active" : ""}`}
          onClick={() => onViewMode("top")}
          aria-pressed={viewMode === "top"}
          title="Nhìn thẳng từ trên xuống để xem bố trí cây"
        >
          <LayersIcon size={14} aria-hidden="true" />
          <span>TOP</span>
        </button>
        <button type="button" className="g3d-tool" onClick={onHome} title="Đưa camera về khung nhìn toàn bộ vườn">
          <Home size={14} aria-hidden="true" />
          <span>HOME</span>
        </button>
        <button
          type="button"
          className={`g3d-tool ${sensorLayerOn ? "g3d-tool--active" : ""}`}
          onClick={onToggleSensorLayer}
          aria-pressed={sensorLayerOn}
          title="Ẩn/hiện giá trị cảm biến và vùng đất đang đo"
        >
          <Radio size={14} aria-hidden="true" />
          <span>SENSOR</span>
        </button>

        <div className="g3d-toolbar__spacer" />

        <div className="g3d-layers" ref={popoverRef}>
          <button
            type="button"
            className={`g3d-tool ${layersOpen ? "g3d-tool--active" : ""}`}
            onClick={() => onLayersOpenChange(!layersOpen)}
            aria-expanded={layersOpen}
            aria-haspopup="true"
            title="Chọn lớp hiển thị"
          >
            <LayersIcon size={14} aria-hidden="true" />
            <span>Lớp</span>
          </button>

          {layersOpen && (
            <div className="g3d-layers__menu" role="group" aria-label="Lớp hiển thị">
              <p className="g3d-layers__heading">Layers</p>
              {(Object.keys(LAYER_LABELS) as GardenLayerKey[]).map((key) => (
                <label key={key} className="g3d-layers__item">
                  <input type="checkbox" checked={layers[key]} onChange={() => onToggleLayer(key)} />
                  <span>{LAYER_LABELS[key]}</span>
                </label>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          className="g3d-tool"
          onClick={onToggleFullscreen}
          title={fullscreen ? "Thu gọn khung vườn" : "Mở toàn màn hình"}
          aria-label={fullscreen ? "Thu gọn khung vườn" : "Mở toàn màn hình"}
          aria-pressed={fullscreen}
        >
          {fullscreen ? <Minimize2 size={14} aria-hidden="true" /> : <Maximize2 size={14} aria-hidden="true" />}
        </button>
      </div>

      <div className="g3d-zoom" role="group" aria-label="Thu phóng">
        <button type="button" className="g3d-zoom__btn" onClick={onZoomIn} title="Phóng to" aria-label="Phóng to">
          <Plus size={15} aria-hidden="true" />
        </button>
        <button type="button" className="g3d-zoom__btn" onClick={onZoomOut} title="Thu nhỏ" aria-label="Thu nhỏ">
          <Minus size={15} aria-hidden="true" />
        </button>
      </div>
    </>
  );
}

interface HoverTooltipProps {
  title: string;
  lines: string[];
  x: number;
  y: number;
}

export function HoverTooltip({ title, lines, x, y }: HoverTooltipProps) {
  return (
    <div className="g3d-tooltip" style={{ left: x, top: y }} role="status">
      <p className="g3d-tooltip__title">{title}</p>
      {lines.map((line) => (
        <p key={line} className="g3d-tooltip__line">{line}</p>
      ))}
    </div>
  );
}

interface GardenViewportNoticeProps {
  title: string;
  body: string;
  onDismiss?: () => void;
}

export function GardenViewportNotice({ title, body, onDismiss }: GardenViewportNoticeProps) {
  return (
    <div className="g3d-notice">
      <div>
        <p className="g3d-notice__title">{title}</p>
        <p className="g3d-notice__body">{body}</p>
      </div>
      {onDismiss && (
        <button type="button" className="g3d-icon-btn" onClick={onDismiss} aria-label="Đóng thông báo">
          <X size={14} />
        </button>
      )}
    </div>
  );
}
