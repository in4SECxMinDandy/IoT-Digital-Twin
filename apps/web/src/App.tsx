import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, LoaderCircle } from "lucide-react";
import { io, type Socket } from "socket.io-client";

import { AlarmsModal } from "./components/AlarmsModal";
import { AlarmWidgetCard } from "./components/AlarmWidgetCard";
import { AvgMoistureCard } from "./components/AvgMoistureCard";
import { CreateScheduleModal } from "./components/CreateScheduleModal";
import { Garden3D } from "./components/Garden3D/Garden3D";
import { Garden3DMap } from "./components/Garden3DMap";
import { Header } from "./components/Header";
import { IrrigationScheduleTable } from "./components/IrrigationScheduleTable";
import { IrrigationStatusCard } from "./components/IrrigationStatusCard";
import { IrrigationTasksTable } from "./components/IrrigationTasksTable";
import { SensorDetailModal } from "./components/SensorDetailModal";
import { SensorsTable, type SensorDisplayItem } from "./components/SensorsTable";
import { StatisticsChart } from "./components/StatisticsChart";
import { WaterConsumptionCard } from "./components/WaterConsumptionCard";
import { api, getSocketUrl } from "./lib/api";
import { applyCommandStatus, mergeCommand } from "./lib/command-state";
import { DEFAULT_SOIL_THRESHOLDS, resolveGardenLayout } from "./lib/garden-layout";
import { canEnable3DMap } from "./lib/gis/feature-flags";
import { Suspense } from "react";
import type {
  Alarm,
  Asset,
  Command,
  Device,
  DeviceMode,
  IrrigationSchedule,
  IrrigationTask,
  Telemetry
} from "./types";

type LoadState = "idle" | "loading" | "ready" | "error";

interface TelemetryUpdate {
  deviceId: string;
  telemetry: Telemetry;
  state: Device;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDevice(value: unknown): value is Device {
  return (
    isRecord(value) &&
    typeof value.deviceId === "string" &&
    typeof value.name === "string" &&
    isRecord(value.currentState)
  );
}

function isTelemetryUpdate(value: unknown): value is TelemetryUpdate {
  return (
    isRecord(value) &&
    typeof value.deviceId === "string" &&
    isRecord(value.telemetry) &&
    typeof value.telemetry.deviceId === "string" &&
    isDevice(value.state)
  );
}

function isAlarm(value: unknown): value is Alarm {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.deviceId === "string" &&
    typeof value.status === "string"
  );
}

function isCommand(value: unknown): value is Command {
  return (
    isRecord(value) &&
    typeof value.commandId === "string" &&
    typeof value.deviceId === "string" &&
    typeof value.status === "string" &&
    typeof value.createdAt === "string"
  );
}

function replaceDevice(devices: Device[], incoming: Device): Device[] {
  const existing = devices.some((device) => device.deviceId === incoming.deviceId);
  if (!existing) return [...devices, incoming];
  return devices.map((device) => (device.deviceId === incoming.deviceId ? incoming : device));
}

function sortTelemetry(telemetry: Telemetry[]): Telemetry[] {
  return [...telemetry].sort((left, right) => Date.parse(left.timestamp) - Date.parse(right.timestamp));
}

function appendTelemetry(telemetry: Telemetry[], incoming: Telemetry, limit: number): Telemetry[] {
  const duplicateIndex = telemetry.findIndex(
    (item) =>
      item.id === incoming.id ||
      (item.deviceId === incoming.deviceId &&
        item.timestamp === incoming.timestamp &&
        item.sequence === incoming.sequence)
  );
  const next =
    duplicateIndex === -1
      ? [...telemetry, incoming]
      : telemetry.map((item, index) => (index === duplicateIndex ? incoming : item));
  return sortTelemetry(next).slice(-limit);
}

function mergeAlarm(alarms: Alarm[], incoming: Alarm): Alarm[] {
  const existing = alarms.some((alarm) => alarm.id === incoming.id);
  const next = existing ? alarms.map((alarm) => (alarm.id === incoming.id ? incoming : alarm)) : [incoming, ...alarms];
  return [...next].sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
}

export function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [telemetry, setTelemetry] = useState<Telemetry[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [commands, setCommands] = useState<Command[]>([]);
  const [historyLimit, setHistoryLimit] = useState<50 | 200 | 1000>(200);

  // Connection & loading states
  const [snapshotState, setSnapshotState] = useState<LoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [isRealtimeSyncing, setIsRealtimeSyncing] = useState(false);

  // Modal dialog states
  const [isCreateScheduleOpen, setIsCreateScheduleOpen] = useState(false);
  const [isAlarmsModalOpen, setIsAlarmsModalOpen] = useState(false);
  const [activeSensorDetail, setActiveSensorDetail] = useState<SensorDisplayItem | null>(null);

  // Irrigation schedules state (pre-seeded with default items from mockup)
  const [schedules, setSchedules] = useState<IrrigationSchedule[]>([
    {
      id: "sch_1",
      name: "Tối",
      startDate: "5 Th10",
      startTime: "02:00",
      repeat: "Hàng ngày",
      repeatEnabled: true,
      endDate: "1 Jan 2030",
      stopCondition: "volume",
      volumeLiters: 1000
    },
    {
      id: "sch_2",
      name: "Sáng",
      startDate: "4 Th10",
      startTime: "13:00",
      repeat: "Hàng ngày",
      repeatEnabled: true,
      endDate: "1 Jan 2030",
      stopCondition: "duration",
      durationMinutes: 60
    }
  ]);

  const socketRef = useRef<Socket | null>(null);
  const selectedDeviceIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const hasConnectedRef = useRef(false);
  const realtimeReadyRef = useRef(false);
  const connectionSyncIdRef = useRef(0);
  const historyLimitRef = useRef(historyLimit);
  const deviceIdsRef = useRef<string[]>([]);
  const subscribedKeyRef = useRef("");

  useEffect(() => {
    selectedDeviceIdRef.current = selectedDeviceId;
    if (selectedDeviceId) {
      socketRef.current?.emit("subscribe", { deviceId: selectedDeviceId });
    }
  }, [selectedDeviceId]);

  /**
   * The 3D garden shows every plant at once, so every device needs a live feed —
   * not just the selected one. The backend emits telemetry:update to a per-device
   * room only, so each board is subscribed here. Re-emitting is gated on the id
   * set changing, otherwise every telemetry tick would re-subscribe.
   */
  useEffect(() => {
    const ids = devices.map((device) => device.deviceId).sort();
    deviceIdsRef.current = ids;
    const key = ids.join(",");
    if (key === subscribedKeyRef.current) return;
    subscribedKeyRef.current = key;
    const socket = socketRef.current;
    if (!socket?.connected) return;
    ids.forEach((deviceId) => socket.emit("subscribe", { deviceId }));
  }, [devices]);

  const loadSnapshot = useCallback(async (): Promise<Device[] | null> => {
    setSnapshotState("loading");
    setLoadError(null);
    try {
      const payload = await api.getAssets();
      const preferredDeviceId = selectedDeviceIdRef.current;
      const nextSelectedDeviceId =
        preferredDeviceId && payload.devices.some((device) => device.deviceId === preferredDeviceId)
          ? preferredDeviceId
          : payload.devices[0]?.deviceId ?? null;
      setAssets(payload.assets);
      setDevices(payload.devices);
      selectedDeviceIdRef.current = nextSelectedDeviceId;
      setSelectedDeviceId(nextSelectedDeviceId);
      setSelectedDevice(payload.devices.find((device) => device.deviceId === nextSelectedDeviceId) ?? null);
      setSnapshotState("ready");
      return payload.devices;
    } catch (error) {
      setSnapshotState("error");
      setLoadError(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ API.");
      return null;
    }
  }, []);

  const loadDeviceDetails = useCallback(
    async (deviceId: string, limit = historyLimitRef.current): Promise<boolean> => {
      const requestId = ++requestIdRef.current;
      setLoadError(null);
      try {
        const [device, deviceTelemetry, deviceAlarms, deviceCommands] = await Promise.all([
          api.getDevice(deviceId),
          api.getTelemetry(deviceId, limit),
          api.getAlarms(deviceId),
          api.getCommands(deviceId)
        ]);
        if (requestId !== requestIdRef.current || selectedDeviceIdRef.current !== deviceId) return false;

        setSelectedDevice(device);
        setDevices((current) => replaceDevice(current, device));
        setTelemetry(sortTelemetry(deviceTelemetry));
        setAlarms(deviceAlarms);
        setCommands((current) =>
          current.filter((command) => command.deviceId === deviceId).reduce(mergeCommand, deviceCommands)
        );
        return true;
      } catch (error) {
        if (requestId !== requestIdRef.current || selectedDeviceIdRef.current !== deviceId) return false;
        setLoadError(error instanceof Error ? error.message : "Không thể tải thông tin cảm biến.");
        return false;
      }
    },
    []
  );

  useEffect(() => {
    void loadSnapshot();
  }, [loadSnapshot]);

  useEffect(() => {
    if (!selectedDeviceId) {
      setTelemetry([]);
      setAlarms([]);
      setCommands([]);
      return;
    }
    setCommandError(null);
    void loadDeviceDetails(selectedDeviceId, historyLimit);
  }, [historyLimit, loadDeviceDetails, selectedDeviceId]);

  useEffect(() => {
    const socket = io(getSocketUrl(), { transports: ["websocket", "polling"] });
    socketRef.current = socket;

    const isSelected = (deviceId: string) => selectedDeviceIdRef.current === deviceId;
    const updateSelectedDevice = (incoming: Device) => {
      setDevices((current) => replaceDevice(current, incoming));
      if (isSelected(incoming.deviceId)) setSelectedDevice(incoming);
    };

    const subscribeToGarden = () => {
      const ids = new Set(deviceIdsRef.current);
      const selected = selectedDeviceIdRef.current;
      if (selected) ids.add(selected);
      subscribedKeyRef.current = [...ids].sort().join(",");
      ids.forEach((deviceId) => socket.emit("subscribe", { deviceId }));
    };

    socket.on("connect", () => {
      const reconnecting = hasConnectedRef.current;
      hasConnectedRef.current = true;
      subscribeToGarden();

      if (!reconnecting) {
        realtimeReadyRef.current = true;
        setIsRealtimeSyncing(false);
        setSocketConnected(true);
        return;
      }

      const syncId = ++connectionSyncIdRef.current;
      realtimeReadyRef.current = false;
      setSocketConnected(false);
      setIsRealtimeSyncing(true);

      void (async () => {
        const refreshedDevices = await loadSnapshot();
        if (syncId !== connectionSyncIdRef.current || !socket.connected) return;
        if (refreshedDevices === null) {
          setIsRealtimeSyncing(false);
          setSocketConnected(false);
          return;
        }

        const deviceId = selectedDeviceIdRef.current ?? refreshedDevices[0]?.deviceId;
        let detailsLoaded = deviceId ? await loadDeviceDetails(deviceId) : true;
        const replacementDeviceId = selectedDeviceIdRef.current;
        if (!detailsLoaded && replacementDeviceId && replacementDeviceId !== deviceId) {
          detailsLoaded = await loadDeviceDetails(replacementDeviceId);
        }
        if (syncId !== connectionSyncIdRef.current || !socket.connected) return;
        if (!detailsLoaded) {
          setIsRealtimeSyncing(false);
          setSocketConnected(false);
          return;
        }

        subscribeToGarden();
        realtimeReadyRef.current = true;
        setIsRealtimeSyncing(false);
        setSocketConnected(true);
      })();
    });

    socket.on("disconnect", () => {
      connectionSyncIdRef.current += 1;
      realtimeReadyRef.current = false;
      setIsRealtimeSyncing(false);
      setSocketConnected(false);
    });

    socket.on("connect_error", () => {
      realtimeReadyRef.current = false;
      setSocketConnected(false);
    });

    socket.on("telemetry:update", (payload: unknown) => {
      if (!realtimeReadyRef.current) return;
      if (!isTelemetryUpdate(payload)) return;
      updateSelectedDevice(payload.state);
      if (isSelected(payload.deviceId)) {
        setTelemetry((current) => appendTelemetry(current, payload.telemetry, historyLimitRef.current));
      }
    });

    socket.on("device:status", (payload: unknown) => {
      if (!realtimeReadyRef.current) return;
      if (isDevice(payload)) updateSelectedDevice(payload);
    });

    socket.on("command:update", (payload: unknown) => {
      if (!realtimeReadyRef.current) return;
      if (!isCommand(payload)) return;
      if (isSelected(payload.deviceId)) setCommands((current) => mergeCommand(current, payload));
      setDevices((current) => current.map((device) => applyCommandStatus(device, payload)));
      if (isSelected(payload.deviceId)) {
        setSelectedDevice((current) => (current ? applyCommandStatus(current, payload) : current));
      }
    });

    const updateAlarm = (payload: unknown) => {
      if (!realtimeReadyRef.current) return;
      if (isAlarm(payload) && isSelected(payload.deviceId)) {
        setAlarms((current) => mergeAlarm(current, payload));
      }
    };
    socket.on("alarm:new", updateAlarm);
    socket.on("alarm:update", updateAlarm);

    return () => {
      socket.disconnect();
      if (socketRef.current === socket) socketRef.current = null;
    };
  }, [loadDeviceDetails, loadSnapshot]);

  const activeDevice = useMemo(
    () => selectedDevice ?? devices.find((device) => device.deviceId === selectedDeviceId) ?? null,
    [devices, selectedDevice, selectedDeviceId]
  );

  const latestTelemetry = telemetry.at(-1);
  const sourceTelemetry = latestTelemetry ?? activeDevice?.currentState.lastTelemetry;

  const gardenLayout = useMemo(() => {
    const plant = activeDevice ? assets.find((asset) => asset.id === activeDevice.assetId) : null;
    return resolveGardenLayout(assets, devices, plant?.parentAssetId ?? null);
  }, [assets, devices, activeDevice]);

  const activeThresholds = useMemo(() => {
    if (!gardenLayout || !activeDevice) return DEFAULT_SOIL_THRESHOLDS;
    return (
      gardenLayout.plants.find((plant) => plant.deviceIds.includes(activeDevice.deviceId))?.thresholds ??
      DEFAULT_SOIL_THRESHOLDS
    );
  }, [gardenLayout, activeDevice]);

  const currentFieldName = useMemo(() => {
    if (!activeDevice) return "Cánh đồng SI 1";
    const plant = assets.find((a) => a.id === activeDevice.assetId);
    if (plant?.parentAssetId) {
      const garden = assets.find((a) => a.id === plant.parentAssetId);
      if (garden) return garden.name;
    }
    return activeDevice.name || "Cánh đồng SI 1";
  }, [activeDevice, assets]);

  const handleSelectDevice = (deviceId: string) => {
    const snapshotDevice = devices.find((device) => device.deviceId === deviceId) ?? null;
    selectedDeviceIdRef.current = deviceId;
    setSelectedDeviceId(deviceId);
    setSelectedDevice(snapshotDevice);
    setTelemetry([]);
    setAlarms([]);
    setCommands([]);
  };

  const handleOpenSensorDetail = (sensor: SensorDisplayItem) => {
    // The modal's chart can only show the selected device's history, so opening a
    // row's detail also selects that device rather than showing another board's data.
    if (sensor.deviceId && sensor.deviceId !== selectedDeviceIdRef.current) handleSelectDevice(sensor.deviceId);
    setActiveSensorDetail(sensor);
  };

  const handleRefresh = () => {
    void (async () => {
      setIsRefreshing(true);
      const refreshedDevices = await loadSnapshot();
      const deviceId = selectedDeviceIdRef.current ?? refreshedDevices?.[0]?.deviceId;
      if (deviceId) await loadDeviceDetails(deviceId);
      setIsRefreshing(false);
    })();
  };

  const submitCommand = async (type: Command["type"], value?: string) => {
    if (!activeDevice || isSubmitting) return;
    setIsSubmitting(true);
    setCommandError(null);
    try {
      const command = await api.sendCommand(activeDevice.deviceId, type, value);
      setCommands((current) => mergeCommand(current, command));
      setSelectedDevice((current) => (current ? applyCommandStatus(current, command) : current));
      setDevices((current) => current.map((device) => applyCommandStatus(device, command)));
    } catch (error) {
      setCommandError(error instanceof Error ? error.message : "Không thể gửi lệnh điều khiển.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleIrrigation = (active: boolean) => {
    void submitCommand(active ? "START_IRRIGATION_SIMULATION" : "STOP_IRRIGATION_SIMULATION");
  };

  const handleToggleMode = (nextMode: DeviceMode) => {
    void submitCommand("SET_MODE", nextMode);
  };

  const handleCreateSchedule = (newSchedule: IrrigationSchedule) => {
    setSchedules((prev) => [newSchedule, ...prev]);
  };

  const handleDeleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleDownloadReport = () => {
    const reportData = {
      thoiGianXuat: new Date().toLocaleString("vi-VN"),
      canhDong: currentFieldName,
      thietBi: activeDevice?.name ?? "SI Soil Moisture",
      doAmHienTai: sourceTelemetry?.soilMoisturePct ?? 36,
      nhietDo: sourceTelemetry?.temperatureC ?? 28,
      doAmKhongKhi: sourceTelemetry?.airHumidityPct ?? 65,
      soLuongCanhBao: alarms.length,
      soLuongLichTrinh: schedules.length,
      danhSachLichTrinh: schedules,
      lichSuNhiemVu: commands.map((c) => ({
        lenh: c.type,
        trangThai: c.status,
        thoiGian: c.createdAt
      }))
    };

    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bao_cao_tuoi_tieu_${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (snapshotState === "loading" && devices.length === 0) {
    return (
      <main className="loading-screen" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <LoaderCircle className="spin text-primary" size={36} />
        <p style={{ color: "#475569", fontWeight: 500 }}>Đang kết nối hệ thống Quản lý Tưới tiêu...</p>
      </main>
    );
  }

  return (
    <>
      {/* Professional Header - Minimal White */}
      <Header
        currentFieldName={currentFieldName}
        activeDevice={activeDevice}
        socketConnected={socketConnected}
        isRealtimeSyncing={isRealtimeSyncing}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
        onToggleMode={handleToggleMode}
        onDownloadReport={handleDownloadReport}
      />

      {/* Main Dashboard Content */}
      <div className="app-content">
        {/* Error Messages */}
        {loadError && (
          <div style={{
            backgroundColor: "var(--color-error-light)",
            border: "1px solid var(--color-error)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            color: "var(--color-error)",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13
          }}>
            <AlertCircle size={18} />
            <span>{loadError}</span>
          </div>
        )}

        {commandError && (
          <div style={{
            backgroundColor: "var(--color-alert-light)",
            border: "1px solid var(--color-alert)",
            padding: "12px 16px",
            borderRadius: "var(--radius-md)",
            color: "var(--color-alert)",
            marginBottom: "var(--space-4)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13
          }}>
            <AlertCircle size={18} />
            <span>{commandError}</span>
          </div>
        )}

        {/* Metrics Row - Top KPIs */}
        <div className="metrics-row">
          <AvgMoistureCard moisturePct={sourceTelemetry?.soilMoisturePct} />
          <WaterConsumptionCard
            volumeLiters={600}
            temperatureC={sourceTelemetry?.temperatureC}
            humidityPct={sourceTelemetry?.airHumidityPct}
          />
          <IrrigationStatusCard
            device={activeDevice}
            submitting={isSubmitting}
            onToggleIrrigation={handleToggleIrrigation}
          />
        </div>

        {/* Main Content Grid */}
        <div className="main-grid">
          {/* Left: Map Views */}
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <svg className="card__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Bản đồ 3D
              </div>
            </div>
            <div className="card__body card__body--no-pad">
              {/* 3D Satellite Map */}
              {canEnable3DMap() && (
                <Suspense fallback={
                  <div className="loading-container">
                    <LoaderCircle className="loading-spinner" size={32} />
                    <div className="loading-text">Đang tải bản đồ vệ tinh...</div>
                  </div>
                }>
                  <Garden3DMap
                    device={activeDevice}
                    commands={commands}
                    onSendCommand={submitCommand}
                  />
                </Suspense>
              )}

              {/* 3D Garden View */}
              <div style={{ height: 400, borderTop: "1px solid var(--color-border)" }}>
                <Garden3D
                  layout={gardenLayout}
                  devices={devices}
                  onSelectDevice={handleSelectDevice}
                />
              </div>
            </div>
          </div>

          {/* Right: Status Panel */}
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* Alarms */}
            <AlarmWidgetCard
              alarms={alarms}
              onOpenAlarms={() => setIsAlarmsModalOpen(true)}
            />

            {/* Statistics Chart */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">
                  <svg className="card__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Thống kê
                </div>
              </div>
              <div className="card__body">
                <StatisticsChart
                  telemetry={telemetry}
                  limit={historyLimit}
                  onLimitChange={setHistoryLimit}
                  thresholds={activeThresholds}
                />
              </div>
            </div>

            {/* Sensors */}
            <div className="card">
              <div className="card__header">
                <div className="card__title">
                  <svg className="card__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                  </svg>
                  Cảm biến
                </div>
              </div>
              <div className="card__body card__body--no-pad">
                <SensorsTable
                  devices={devices}
                  assets={assets}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={handleSelectDevice}
                  onOpenSensorDetail={handleOpenSensorDetail}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Full Width Sections */}
        <div className="full-section">
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <svg className="card__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Lịch tưới
              </div>
            </div>
            <div className="card__body card__body--no-pad">
              <IrrigationScheduleTable
                schedules={schedules}
                onOpenCreateModal={() => setIsCreateScheduleOpen(true)}
                onDeleteSchedule={handleDeleteSchedule}
              />
            </div>
          </div>
        </div>

        <div className="full-section">
          <div className="card">
            <div className="card__header">
              <div className="card__title">
                <svg className="card__title-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                Nhiệm vụ tưới
              </div>
            </div>
            <div className="card__body card__body--no-pad">
              <IrrigationTasksTable commands={commands} />
            </div>
          </div>
        </div>
      </div>

      {/* ==================== MODALS & OVERLAYS ==================== */}
      {/* 1. Modal Tạo lịch tưới */}
      {isCreateScheduleOpen && (
        <CreateScheduleModal
          isOpen={isCreateScheduleOpen}
          onClose={() => setIsCreateScheduleOpen(false)}
          onCreate={handleCreateSchedule}
        />
      )}

      {/* 2. Modal Chi tiết cảm biến */}
      {activeSensorDetail && (
        <SensorDetailModal
          sensor={activeSensorDetail}
          isOpen={Boolean(activeSensorDetail)}
          telemetry={telemetry}
          telemetryDeviceId={selectedDeviceId}
          thresholds={activeThresholds}
          alarms={alarms}
          onClose={() => setActiveSensorDetail(null)}
        />
      )}

      {/* 3. Modal Danh sách cảnh báo */}
      {isAlarmsModalOpen && (
        <AlarmsModal
          isOpen={isAlarmsModalOpen}
          onClose={() => setIsAlarmsModalOpen(false)}
          alarms={alarms}
        />
      )}
    </>
  );
}
