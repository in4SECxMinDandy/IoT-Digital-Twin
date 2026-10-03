import { Download, RefreshCw, Sliders, Wifi, WifiOff } from "lucide-react";
import type { Device, DeviceMode } from "../types";

interface HeaderProps {
  currentFieldName: string;
  activeDevice: Device | null;
  socketConnected: boolean;
  isRealtimeSyncing: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onToggleMode: (nextMode: DeviceMode) => void;
  onDownloadReport: () => void;
}

export function Header({
  currentFieldName,
  activeDevice,
  socketConnected,
  isRealtimeSyncing,
  isRefreshing,
  onRefresh,
  onToggleMode,
  onDownloadReport
}: HeaderProps) {
  const currentMode = activeDevice?.currentState.mode ?? "MANUAL";
  const isOffline = activeDevice?.status === "OFFLINE";

  return (
    <header className="app-header">
      <div className="app-header__inner">
        {/* Left: Brand & Breadcrumb */}
        <div className="app-header__branding">
          <div className="app-header__logo">
            💧
          </div>
          <div className="app-header__title-group">
            <span>Quản lý Tưới tiêu</span>
            <span className="app-header__separator">›</span>
            <span className="app-header__sub-title">{currentFieldName}</span>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="app-header__actions">
          {/* Socket Connection Badge */}
          <div
            className={`connection-pill ${
              isRealtimeSyncing ? "connection-pill--syncing" : socketConnected ? "connection-pill--connected" : "connection-pill--disconnected"
            }`}
            title={
              isRealtimeSyncing
                ? "Đang đồng bộ trạng thái..."
                : socketConnected
                ? "Kết nối thời gian thực"
                : "Mất kết nối"
            }
          >
            {socketConnected ? <Wifi size={14} /> : <WifiOff size={14} />}
            <span>{isRealtimeSyncing ? "Đang đồng bộ" : socketConnected ? "Trực tuyến" : "Ngoại tuyến"}</span>
          </div>

          {/* Mode Switcher */}
          {activeDevice && (
            <button
              type="button"
              className="header-btn"
              onClick={() => onToggleMode(currentMode === "AUTO" ? "MANUAL" : "AUTO")}
              disabled={isOffline}
              title={`Chuyển sang ${currentMode === "AUTO" ? "Thủ công" : "Tự động"}`}
            >
              <Sliders size={16} />
              <span>{currentMode === "AUTO" ? "Tự động" : "Thủ công"}</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            className="header-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Làm mới"
          >
            <RefreshCw size={16} style={{ animation: isRefreshing ? 'spin 0.8s linear infinite' : 'none' }} />
          </button>

          {/* Download Report Button */}
          <button
            type="button"
            className="header-btn header-btn--primary"
            onClick={onDownloadReport}
            title="Tải báo cáo"
          >
            <Download size={16} />
            <span>Tải báo cáo</span>
          </button>
        </div>
      </div>
    </header>
  );
}
