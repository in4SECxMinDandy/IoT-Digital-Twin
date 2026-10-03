import type { Command, IrrigationTask } from "../types";

interface IrrigationTasksTableProps {
  tasks?: IrrigationTask[];
  commands?: Command[];
}

export function IrrigationTasksTable({ tasks, commands = [] }: IrrigationTasksTableProps) {
  // Built-in default tasks matching the image
  const defaultTasks: IrrigationTask[] = [
    { id: "t1", startDay: "9 Th11", startTime: "13:00", endRule: "30 phút", duration: "~30 phút", volume: "447 l", progressPct: 100 },
    { id: "t2", startDay: "8 Th11", startTime: "13:00", endRule: "30 phút", duration: "~30 phút", volume: "452 l", progressPct: 100 },
    { id: "t3", startDay: "7 Th11", startTime: "13:00", endRule: "1000 l", duration: "~63 phút", volume: "1000 l", progressPct: 100 },
    { id: "t4", startDay: "6 Th11", startTime: "13:00", endRule: "500 l", duration: "~36 phút", volume: "500 l", progressPct: 100 },
    { id: "t5", startDay: "5 Th11", startTime: "12:00", endRule: "1000 l", duration: "~63 phút", volume: "1000 l", progressPct: 100 },
    { id: "t6", startDay: "4 Th11", startTime: "12:00", endRule: "30 phút", duration: "~30 phút", volume: "407 l", progressPct: 100 },
    { id: "t7", startDay: "3 Th11", startTime: "12:00", endRule: "30 phút", duration: "~30 phút", volume: "423 l", progressPct: 100 }
  ];

  // If there are real commands from backend, we can blend them in
  const taskList = tasks && tasks.length > 0 ? tasks : defaultTasks;

  return (
    <div className="card tasks-card">
      <div className="tasks-card__header">
        <div>
          <h3 className="card-title">Nhiệm vụ tưới</h3>
          <p className="card-subtitle">Thời gian thực - 7 ngày qua</p>
        </div>
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Ngày bắt đầu</th>
              <th>Giờ bắt đầu</th>
              <th>Điều kiện kết thúc</th>
              <th>Thời lượng</th>
              <th>Khối lượng</th>
              <th>Tiến độ</th>
            </tr>
          </thead>
          <tbody>
            {taskList.map((task) => (
              <tr key={task.id} className="table-row">
                <td className="text-muted">{task.startDay}</td>
                <td className="font-mono font-bold text-primary">{task.startTime}</td>
                <td>
                  <span className="tag-end-rule">{task.endRule}</span>
                </td>
                <td>{task.duration}</td>
                <td>{task.volume}</td>
                <td>
                  <div className="task-progress-cell">
                    <div className="task-progress-bar">
                      <div
                        className="task-progress-fill"
                        style={{ width: `${task.progressPct}%` }}
                      />
                    </div>
                    <span className="task-progress-text">{task.progressPct}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
