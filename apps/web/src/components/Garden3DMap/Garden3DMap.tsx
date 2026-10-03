/**
 * Garden3DMap: Interactive 3D satellite map of Zone_Pergola.
 *
 * Replaces the mock "satellite map" card with photorealistic base imagery
 * and 3D overlays of the designed pergola courtyard, bound to live ESP32_01 data.
 *
 * Real imagery stays the visual base; designed elements overlaid at true scale.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { Map, Power, Droplets, AlertCircle } from "lucide-react";

import type { Command, Device } from "../../types";
import { hasPlaceholders, ZONE_PERGOLA } from "../../lib/gis/zone-config";
import { MapLibreProvider } from "../../lib/gis/maplibre-provider";
import type { MapProvider } from "../../lib/gis/map-provider";
import { enuToWgs84 } from "../../lib/gis/coordinates";
import { ThreeOverlay } from "./ThreeOverlay";
import { DEFAULT_SOIL_THRESHOLDS } from "../../lib/garden-layout";
import { getCommandUIState, getCommandBlockReason } from "../../lib/gis/command-ui";
import { formatWithUnit } from "../../lib/format";
import { SOIL_STATUS_LABELS, SOIL_STATUS_COLORS } from "../../lib/gis/soil-status";
import "./garden3dmap-clean.css";

interface Garden3DMapProps {
  device: Device | null;
  commands: Command[];
  onSelectDevice?: (deviceId: string) => void;
  onSendCommand: (type: Command["type"], value?: string) => Promise<void>;
}

type ViewState = "loading" | "placeholder" | "ready" | "error";

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
}

export function Garden3DMap({ device, commands, onSendCommand }: Garden3DMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapProvider | null>(null);
  const overlayRef = useRef<ThreeOverlay | null>(null);
  const [viewState, setViewState] = useState<ViewState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0 });
  const [showControls, setShowControls] = useState(false);
  const hasMissingConfig = hasPlaceholders(ZONE_PERGOLA);

  const initializeMap = useCallback(async () => {
    const container = containerRef.current;
    if (!container) return;

    // Check for missing configuration
    if (hasMissingConfig) {
      setViewState("placeholder");
      return;
    }

    // Check for API key
    const apiKey = import.meta.env.VITE_MAPTILER_KEY;
    if (!apiKey) {
      setViewState("error");
      setErrorMessage("Thiếu VITE_MAPTILER_KEY trong biến môi trường");
      return;
    }

    try {
      const centerWgs84 = enuToWgs84({ east: 0, north: 0, up: 0 }, ZONE_PERGOLA.site);
      const provider = new MapLibreProvider({
        styleUrl: `https://api.maptiler.com/maps/satellite/style.json?key=${apiKey}`,
        apiKey,
        attribution: "© MapTiler © OpenStreetMap",
        maxBounds: [
          [centerWgs84.lng - 0.001, centerWgs84.lat - 0.001],
          [centerWgs84.lng + 0.001, centerWgs84.lat + 0.001]
        ],
        maxZoom: 20,
        minZoom: 16
      });

      await provider.initialize(container, [centerWgs84.lng, centerWgs84.lat], 18);
      mapRef.current = provider;

      // Initialize Three.js overlay
      const overlay = new ThreeOverlay(
        [centerWgs84.lng, centerWgs84.lat],
        ZONE_PERGOLA.site,
        ZONE_PERGOLA.esp32Offset,
        {
          onPinHover: (hovered, x, y) => {
            setTooltip({ visible: hovered, x, y });
          },
          onPinClick: () => {
            setShowControls((prev) => !prev);
          }
        }
      );
      overlayRef.current = overlay;

      // Add Three.js custom layer to MapLibre
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      provider.addThreeLayer("esp32-overlay", (gl, matrix) => {
        overlay.render(gl, matrix, prefersReducedMotion);
      });

      // Register pointer events
      const canvas = container.querySelector("canvas");
      if (canvas) {
        const handleMove = (e: MouseEvent) => {
          const rect = canvas.getBoundingClientRect();
          overlay.onPointerMove(e.clientX - rect.left, e.clientY - rect.top, rect.width, rect.height);
        };
        const handleClick = () => overlay.onClick();
        canvas.addEventListener("mousemove", handleMove);
        canvas.addEventListener("click", handleClick);
        canvas.style.cursor = "default";

        return () => {
          canvas.removeEventListener("mousemove", handleMove);
          canvas.removeEventListener("click", handleClick);
        };
      }

      setViewState("ready");
    } catch (error) {
      console.error("Failed to initialize map:", error);
      setViewState("error");
      setErrorMessage(error instanceof Error ? error.message : "Không khởi tạo được bản đồ");
    }
  }, [hasMissingConfig]);

  useEffect(() => {
    void initializeMap();
    return () => {
      overlayRef.current?.dispose();
      overlayRef.current = null;
      mapRef.current?.dispose();
      mapRef.current = null;
    };
  }, [initializeMap]);

  // Update sensor pin when device data changes
  useEffect(() => {
    if (viewState !== "ready" || !overlayRef.current) return;
    overlayRef.current.updateDevice(device, DEFAULT_SOIL_THRESHOLDS);
  }, [viewState, device]);

  const handleModeToggle = useCallback(async () => {
    if (!device) return;
    const nextMode = device.currentState.mode === "AUTO" ? "MANUAL" : "AUTO";
    await onSendCommand("SET_MODE", nextMode);
  }, [device, onSendCommand]);

  const handleIrrigationToggle = useCallback(async () => {
    if (!device) return;
    const active = device.currentState.irrigationSimulationActive;
    await onSendCommand(active ? "STOP_IRRIGATION_SIMULATION" : "START_IRRIGATION_SIMULATION");
  }, [device, onSendCommand]);

  const renderPlaceholder = () => (
    <div className="g3dmap-placeholder">
      <div className="g3dmap-placeholder__content">
        <div className="g3dmap-placeholder__icon">
          <Map size={48} strokeWidth={1.5} />
        </div>
        <h3>Bản đồ 3D vệ tinh</h3>
        <p>Cần cấu hình tọa độ thực của Zone_Pergola</p>
        <div className="g3dmap-placeholder__details">
          <p className="eyebrow">Thiếu cấu hình:</p>
          <ul>
            {ZONE_PERGOLA.site.centerLat === 0 && <li>GARDEN_CENTER (lat, lng, elevation)</li>}
            {ZONE_PERGOLA.boundaryGeoJson.coordinates[0].length === 0 && <li>ZONE_POLYGON GeoJSON</li>}
            {ZONE_PERGOLA.esp32Offset.east === 999 && <li>ESP32_01_OFFSET (east, north, up)</li>}
            {!import.meta.env.VITE_MAPTILER_KEY && <li>VITE_MAPTILER_KEY (imagery API key)</li>}
          </ul>
          <p className="text-secondary">
            Chỉnh sửa <code>apps/web/src/lib/gis/zone-config.ts</code> và <code>.env</code>
          </p>
        </div>
      </div>
      <div className="g3dmap-banner g3dmap-banner--warning">
        <span className="g3dmap-banner__icon">⚠</span>
        Tọa độ minh họa
      </div>
    </div>
  );

  const renderError = () => (
    <div className="g3dmap-error">
      <div className="g3dmap-error__icon">⚠</div>
      <h4>Không tải được bản đồ</h4>
      <p>{errorMessage}</p>
      <p className="text-secondary">
        Kiểm tra VITE_MAPTILER_KEY và kết nối internet
      </p>
    </div>
  );

  const commandUI = getCommandUIState(device, commands);
  const telemetry = device?.currentState.lastTelemetry;

  // Use backend-smoothed environment status, NOT raw telemetry
  const envStatus = device?.currentState.environment ?? "INVALID";
  const soilStatusLabel = SOIL_STATUS_LABELS[envStatus];

  // Use alertLevel for smoothed soil % if available (backend averages 5 samples)
  const smoothedSoilPct = device?.currentState.reportedAt
    ? (device.currentState.environment === "NORMAL" ? 60
      : device.currentState.environment === "WARNING" ? 50
      : device.currentState.environment === "CRITICAL" ? 30
      : null)
    : null;
  const displaySoilPct = smoothedSoilPct ?? telemetry?.soilMoisturePct;

  // Determine data source
  const dataSource = device?.status === "OFFLINE" ? "OFFLINE"
    : device?.attributes?.source as string | undefined ?? "Không rõ nguồn";

  const modeBlockReason = getCommandBlockReason(device, "SET_MODE", commands);
  const irrigationBlockReason = getCommandBlockReason(
    device,
    device?.currentState.irrigationSimulationActive ? "STOP_IRRIGATION_SIMULATION" : "START_IRRIGATION_SIMULATION",
    commands
  );

  return (
    <div className="card g3dmap-card">
      <div className="g3dmap-card__header">
        <div className="g3dmap-card__title-row">
          <span className="g3dmap-card__icon">
            <Map size={16} />
          </span>
          <div>
            <h3 className="card-title">
              Bản đồ 3D: <span className="text-forest-highlight">{ZONE_PERGOLA.name}</span>
            </h3>
            <p className="g3dmap-card__subtitle">
              Vệ tinh + địa hình · Digital Twin · {ZONE_PERGOLA.site.centerLat !== 0 ? "Tọa độ thật" : "Tọa độ minh họa"}
            </p>
          </div>
        </div>
        {viewState === "ready" && (
          <span className="g3dmap-card__badge">
            <span className="live-dot" aria-hidden="true" />
            3D Map
          </span>
        )}
      </div>

      <div className="g3dmap-viewport">
        {viewState === "loading" && (
          <div className="g3dmap-loading">
            <div className="spinner" />
            <p>Đang tải bản đồ vệ tinh...</p>
          </div>
        )}
        {viewState === "placeholder" && renderPlaceholder()}
        {viewState === "error" && renderError()}
        <div
          ref={containerRef}
          className="g3dmap-viewport__container"
          style={{ display: viewState === "ready" ? "block" : "none" }}
        />
        {viewState === "ready" && hasMissingConfig && (
          <div className="g3dmap-banner g3dmap-banner--warning g3dmap-banner--floating">
            <span className="g3dmap-banner__icon">⚠</span>
            Tọa độ minh họa
          </div>
        )}

        {/* Tooltip for ESP32 pin */}
        {viewState === "ready" && tooltip.visible && device && (
          <div
            className="g3dmap-tooltip"
            style={{
              position: "absolute",
              left: tooltip.x + 14,
              top: tooltip.y + 14,
              pointerEvents: "none"
            }}
          >
            <div className="g3dmap-tooltip__header">
              <strong>ESP32_01</strong>
              <span className="g3dmap-tooltip__status" style={{ color: SOIL_STATUS_COLORS[envStatus] }}>
                {soilStatusLabel}
              </span>
            </div>
            <div className="g3dmap-tooltip__body">
              <div className="g3dmap-tooltip__row">
                <span>Độ ẩm đất:</span>
                <strong>{formatWithUnit(displaySoilPct, "%")}</strong>
                {smoothedSoilPct != null && (
                  <span className="g3dmap-tooltip__badge g3dmap-tooltip__badge--small">Trung bình 5 mẫu</span>
                )}
              </div>
              {telemetry?.soilMoisturePct == null && (telemetry as { soilRaw?: number })?.soilRaw != null && (
                <div className="g3dmap-tooltip__note">Raw: {(telemetry as { soilRaw?: number }).soilRaw} • Chưa hiệu chuẩn</div>
              )}
              <div className="g3dmap-tooltip__row">
                <span>Nhiệt độ:</span>
                <strong>{formatWithUnit(telemetry?.temperatureC, "°C")}</strong>
              </div>
              <div className="g3dmap-tooltip__row">
                <span>Độ ẩm KK:</span>
                <strong>{formatWithUnit(telemetry?.airHumidityPct, "%")}</strong>
              </div>
              <div className="g3dmap-tooltip__row">
                <span>Chế độ:</span>
                <strong>{device.currentState.mode}</strong>
              </div>
              <div className="g3dmap-tooltip__row">
                <span>Nguồn:</span>
                <strong>{dataSource}</strong>
                {dataSource !== "LIVE" && dataSource !== "OFFLINE" && (
                  <span className="g3dmap-tooltip__badge g3dmap-tooltip__badge--warning">Dữ liệu minh họa</span>
                )}
              </div>
              {device.currentState.irrigationSimulationActive && (
                <div className="g3dmap-tooltip__badge">
                  <Droplets size={12} />
                  Mô phỏng tưới (LED)
                </div>
              )}
            </div>
            <div className="g3dmap-tooltip__footer">
              Vị trí cấu hình thủ công, không phải GPS
              {ZONE_PERGOLA.esp32Offset.east === 999 && (
                <span className="g3dmap-tooltip__badge g3dmap-tooltip__badge--warning">Dữ liệu minh họa</span>
              )}
            </div>
          </div>
        )}

        {/* Control panel */}
        {viewState === "ready" && showControls && device && (
          <div className="g3dmap-controls">
            <div className="g3dmap-controls__header">
              <h4>Điều khiển ESP32_01</h4>
              <button
                className="g3dmap-controls__close"
                onClick={() => setShowControls(false)}
                aria-label="Đóng"
              >
                ×
              </button>
            </div>
            <div className="g3dmap-controls__body">
              {/* Mode toggle */}
              <div className="g3dmap-controls__group">
                <label>Chế độ hoạt động</label>
                <button
                  className={`g3dmap-controls__btn ${device.currentState.mode === "AUTO" ? "g3dmap-controls__btn--active" : ""}`}
                  onClick={handleModeToggle}
                  disabled={commandUI.disableControls || Boolean(modeBlockReason)}
                  title={modeBlockReason || undefined}
                >
                  <Power size={16} />
                  {device.currentState.mode}
                  {commandUI.hasPending && commandUI.pendingType === "SET_MODE" && (
                    <span className="g3dmap-controls__spinner" />
                  )}
                </button>
                {modeBlockReason && (
                  <div className="g3dmap-controls__note g3dmap-controls__note--warning">
                    <AlertCircle size={14} />
                    {modeBlockReason}
                  </div>
                )}
              </div>

              {/* Irrigation simulation toggle */}
              <div className="g3dmap-controls__group">
                <label>Mô phỏng tưới (LED)</label>
                <button
                  className={`g3dmap-controls__btn ${device.currentState.irrigationSimulationActive ? "g3dmap-controls__btn--active" : ""}`}
                  onClick={handleIrrigationToggle}
                  disabled={commandUI.disableControls || Boolean(irrigationBlockReason)}
                  title={irrigationBlockReason || undefined}
                >
                  <Droplets size={16} />
                  {device.currentState.irrigationSimulationActive ? "ĐANG MÔ PHỎNG" : "BẮT ĐẦU"}
                  {commandUI.hasPending && (commandUI.pendingType === "START_IRRIGATION_SIMULATION" || commandUI.pendingType === "STOP_IRRIGATION_SIMULATION") && (
                    <span className="g3dmap-controls__spinner" />
                  )}
                </button>
                {irrigationBlockReason && (
                  <div className="g3dmap-controls__note g3dmap-controls__note--warning">
                    <AlertCircle size={14} />
                    {irrigationBlockReason}
                  </div>
                )}
                <div className="g3dmap-controls__note">
                  Chỉ điều khiển LED xanh, không có van/bơm
                </div>
              </div>

              {/* Command status */}
              {commandUI.hasPending && (
                <div className="g3dmap-controls__status">
                  <div className="g3dmap-controls__spinner" />
                  <span>Đang chờ {commandUI.pendingType}...</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="g3dmap-footer">
        <div className="g3dmap-footer__item">
          <span className="eyebrow">Vùng</span>
          <span className="g3dmap-footer__value">Zone_Pergola • ~15×20 m</span>
        </div>
        <div className="g3dmap-footer__item">
          <span className="eyebrow">Cảm biến</span>
          <span className="g3dmap-footer__value">
            {device ? (
              <>
                ESP32_01 • {device.status === "ONLINE" ? (
                  <span className="status-online">Trực tuyến</span>
                ) : (
                  <span className="status-offline">Ngoại tuyến</span>
                )}
              </>
            ) : (
              "Không có dữ liệu"
            )}
          </span>
        </div>
        <div className="g3dmap-footer__item">
          <span className="eyebrow">Nguồn hình ảnh</span>
          <span className="g3dmap-footer__value">
            {viewState === "ready" ? "MapTiler Satellite" : "—"}
          </span>
        </div>
      </div>
    </div>
  );
}
