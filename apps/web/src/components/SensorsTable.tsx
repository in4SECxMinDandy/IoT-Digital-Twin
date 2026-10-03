import { useState } from "react";
import { Edit2, Eye, Plus, Search, Trash2 } from "lucide-react";
import type { Asset, Device } from "../types";

export interface SensorDisplayItem {
  id: string;
  deviceId?: string;
  name: string;
  cropType: string;
  moisturePct: number;
  status: "On" | "Off";
}

interface SensorsTableProps {
  devices: Device[];
  assets: Asset[];
  selectedDeviceId: string | null;
  onSelectDevice: (deviceId: string) => void;
  onOpenSensorDetail: (sensor: SensorDisplayItem) => void;
}

export function SensorsTable({
  devices,
  assets,
  selectedDeviceId,
  onSelectDevice,
  onOpenSensorDetail
}: SensorsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Map backend devices into display items or provide the 4 standard items from mockup if fewer devices
  const fallbackSensors: SensorDisplayItem[] = [
    { id: "s1", name: "Cảm biến độ ẩm đất SI 1", cropType: "Lúa mì 1", moisturePct: 37, status: "On" },
    { id: "s2", name: "Cảm biến độ ẩm đất SI 2", cropType: "Lúa mì 2", moisturePct: 36, status: "On" },
    { id: "s3", name: "Cảm biến độ ẩm đất SI 3", cropType: "Lúa mì 3", moisturePct: 32, status: "On" },
    { id: "s4", name: "Cảm biến độ ẩm đất SI 4", cropType: "Lúa mì 4", moisturePct: 39, status: "On" }
  ];

  const sensorList: SensorDisplayItem[] =
    devices.length > 0
      ? devices.map((d, index) => {
          const plant = assets.find((a) => a.id === d.assetId);
          const moisture =
            typeof d.currentState.lastTelemetry?.soilMoisturePct === "number"
              ? Math.round(d.currentState.lastTelemetry.soilMoisturePct)
              : fallbackSensors[index % fallbackSensors.length].moisturePct;
          return {
            id: d.id,
            deviceId: d.deviceId,
            name: d.name || `Cảm biến độ ẩm đất SI ${index + 1}`,
            cropType: plant?.name || `Lúa mì ${index + 1}`,
            moisturePct: moisture,
            status: d.status === "ONLINE" ? "On" : "Off"
          };
        })
      : fallbackSensors;

  const filtered = sensorList.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.cropType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="card sensors-card">
      <div className="sensors-card__header">
        <div className="sensors-card__title-row">
          <h3 className="card-title">Cảm biến</h3>
          <span className="badge-count">{sensorList.length} Hoạt động</span>
        </div>
        <div className="sensors-card__actions">
          <button type="button" className="icon-btn" title="Thêm cảm biến mới">
            <Plus size={16} />
          </button>
          <button type="button" className="icon-btn" title="Tìm kiếm">
            <Search size={16} />
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tên cảm biến</th>
              <th>Loại cây trồng</th>
              <th className="text-right">Độ ẩm</th>
              <th className="text-center">Trạng thái</th>
              <th className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((sensor) => {
              const isSelected = sensor.deviceId ? sensor.deviceId === selectedDeviceId : false;
              return (
                <tr
                  key={sensor.id}
                  className={`table-row ${isSelected ? "table-row--selected" : ""}`}
                  onClick={() => {
                    if (sensor.deviceId) onSelectDevice(sensor.deviceId);
                  }}
                >
                  <td className="font-semibold text-primary">{sensor.name}</td>
                  <td>
                    <span className="tag-crop">{sensor.cropType}</span>
                  </td>
                  <td className="text-right font-medium">{sensor.moisturePct}%</td>
                  <td className="text-center">
                    <span className={`status-indicator ${sensor.status === "On" ? "status-indicator--on" : "status-indicator--off"}`}>
                      <span className="dot" />
                      {sensor.status === "On" ? "Bật" : "Tắt"}
                    </span>
                  </td>
                  <td className="text-center" onClick={(e) => e.stopPropagation()}>
                    <div className="table-actions">
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Xem chi tiết cảm biến"
                        onClick={() => onOpenSensorDetail(sensor)}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn"
                        title="Chỉnh sửa cảm biến"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn table-action-btn--delete"
                        title="Xóa cảm biến"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
