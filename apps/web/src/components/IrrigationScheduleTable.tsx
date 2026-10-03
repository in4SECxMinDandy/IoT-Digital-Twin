import { useState } from "react";
import { Columns, Edit2, Plus, Search, Trash2 } from "lucide-react";
import type { IrrigationSchedule } from "../types";

interface IrrigationScheduleTableProps {
  schedules: IrrigationSchedule[];
  onOpenCreateModal: () => void;
  onDeleteSchedule?: (id: string) => void;
}

export function IrrigationScheduleTable({
  schedules,
  onOpenCreateModal,
  onDeleteSchedule
}: IrrigationScheduleTableProps) {
  const [search, setSearch] = useState("");

  const filtered = schedules.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="card schedule-card">
      <div className="schedule-card__header">
        <div className="schedule-card__title-row">
          <h3 className="card-title">Lịch tưới</h3>
        </div>
        <div className="schedule-card__actions">
          <button
            type="button"
            className="action-btn-primary"
            onClick={onOpenCreateModal}
            title="Tạo lịch tưới mới"
          >
            <Plus size={15} />
            <span>Tạo lịch</span>
          </button>
          <div className="search-input-wrapper">
            <Search size={14} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="button" className="icon-btn" title="Tùy chọn cột">
            <Columns size={16} />
          </button>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Ngày bắt đầu</th>
              <th>Giờ bắt đầu</th>
              <th>Lặp lại</th>
              <th>Ngày kết thúc</th>
              <th>Thời lượng</th>
              <th className="text-right">Khối lượng</th>
              <th className="text-center">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-4 text-muted">
                  Chưa có lịch tưới nào được thiết lập.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} className="table-row">
                  <td className="font-semibold text-primary">
                    <span className="badge-schedule-name">{item.name}</span>
                  </td>
                  <td>{item.startDate}</td>
                  <td className="font-mono font-medium">{item.startTime}</td>
                  <td>
                    <span className="tag-repeat">{item.repeat}</span>
                  </td>
                  <td>{item.endDate}</td>
                  <td>{item.durationMinutes ? `${item.durationMinutes} phút` : "-"}</td>
                  <td className="text-right font-medium">
                    {item.volumeLiters ? `${item.volumeLiters} l` : "-"}
                  </td>
                  <td className="text-center">
                    <div className="table-actions">
                      <button type="button" className="table-action-btn" title="Chỉnh sửa lịch">
                        <Edit2 size={15} />
                      </button>
                      <button
                        type="button"
                        className="table-action-btn table-action-btn--delete"
                        title="Xóa lịch"
                        onClick={() => onDeleteSchedule?.(item.id)}
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
