# IoT Digital Twin giám sát cây trồng và mô phỏng tưới bằng LED

Dự án bài tập lớn IoT này thu thập nhiệt độ, độ ẩm không khí và tín hiệu độ ẩm đất từ ESP32; truyền dữ liệu qua MQTT; lưu trạng thái/lịch sử trong MongoDB; và hiển thị trên dashboard React theo thời gian thực. Lệnh điều khiển trên web chỉ bật/tắt **mô phỏng tưới bằng LED**, không vận hành máy bơm hay cấp nước cho cây.

> **Ranh giới quan trọng:** phần cứng cố định chỉ gồm ESP32-WROOM-32S, DHT11, LM393 và ba LED. Không có bơm, van, relay, cảm biến lưu lượng, cảm biến mức nước hay GPS. Một số thẻ trong giao diện hiện là bản mẫu với số liệu giả lập; xem [Dữ liệu thật và dữ liệu minh họa](#du-lieu-that-va-du-lieu-minh-hoa) trước khi demo hoặc viết báo cáo.

## Mục lục

- [Tính năng và trạng thái triển khai](#tinh-nang-va-trang-thai-trien-khai)
- [Kiến trúc và luồng xử lý](#kien-truc-va-luong-xu-ly)
- [Công nghệ và cấu trúc thư mục](#cong-nghe-va-cau-truc-thu-muc)
- [Chạy nhanh bằng Docker](#chay-nhanh-bang-docker)
- [Phát triển trên máy local](#phat-trien-tren-may-local)
- [Kết nối phần cứng và nạp firmware](#ket-noi-phan-cung-va-nap-firmware)
- [Cấu hình](#cau-hinh)
- [MQTT, quy tắc và cơ chế an toàn](#mqtt-quy-tac-va-co-che-an-toan)
- [Digital Twin và MongoDB](#digital-twin-va-mongodb)
- [REST API và Socket.IO](#rest-api-va-socketio)
- [Dashboard: dữ liệu thật và dữ liệu minh họa](#du-lieu-that-va-du-lieu-minh-hoa)
- [Kiểm thử và kịch bản demo](#kiem-thu-va-kich-ban-demo)
- [Xử lý sự cố](#xu-ly-su-co)
- [Giới hạn triển khai](#gioi-han-trien-khai)

<a id="tinh-nang-va-trang-thai-trien-khai"></a>
## Tính năng và trạng thái triển khai

| Nhóm | Đã có trong mã nguồn | Cần hiểu đúng |
| --- | --- | --- |
| Thu thập dữ liệu | Firmware đọc DHT11, LM393; gửi telemetry định kỳ | Phần trăm độ ẩm đất chỉ có sau hiệu chuẩn AO; DO không tạo được phần trăm |
| Truyền thông | Mosquitto, bốn MQTT topic, ACK, retained state và Last Will | Broker Docker hiện cho phép kết nối anonymous, chỉ dùng trong mạng demo tin cậy |
| Backend | Express, validation, trung bình trượt, rule, alarm, trạng thái online/offline | Không có xác thực người dùng hay phân quyền |
| Digital Twin tối thiểu | Garden_01 → Plant_01 → ESP32_01; attributes, current state, lịch sử | Chưa có API tạo/sửa/xóa asset hoặc mô hình graph tổng quát |
| Điều khiển | AUTO/MANUAL, START/STOP mô phỏng LED, commandId và timeout ACK | Publish thành công không có nghĩa lệnh đã được thực thi |
| Realtime | Socket.IO gửi telemetry, trạng thái, alarm và command theo device | Web cũng tải snapshot qua REST khi mở hoặc kết nối lại |
| Dashboard | Có các thẻ, bảng, biểu đồ và modal | Nhiều thẻ theo mockup đang dùng số giả lập; bảng bên dưới liệt kê cụ thể |
| Đóng gói | Docker Compose cho MongoDB, Mosquitto, API, Web; simulator tùy chọn | ESP32 vật lý không được “chạy trong Docker”; cần nạp firmware riêng |

<a id="kien-truc-va-luong-xu-ly"></a>
## Kiến trúc và luồng xử lý

~~~text
DHT11 + LM393 ──> ESP32-WROOM-32S ── MQTT ──> Mosquitto
                       │                           │
                 LED xanh/vàng/đỏ                   ▼
                                             Node.js / Express
                                            ┌──────┴──────┐
                                         MongoDB      Socket.IO
                                            │              │
                                            └──────┬───────┘
                                                   ▼
                                             React Dashboard
~~~

Luồng dữ liệu: cảm biến → ESP32 → topic telemetry → backend kiểm tra giá trị → làm mịn độ ẩm đất → đánh giá ngưỡng và alarm → lưu MongoDB → phát Socket.IO → dashboard.

Luồng điều khiển: dashboard gửi REST POST → backend tạo Command trạng thái PENDING → publish MQTT → ESP32 xử lý mô phỏng LED và gửi ACK/trạng thái đã báo cáo → backend cập nhật EXECUTED hoặc FAILED → Socket.IO cập nhật web. Nếu không có ACK trong thời gian cấu hình, backend chuyển TIMEOUT. **Không suy ra trạng thái LED từ việc POST trả HTTP 202.**

Backend là một ứng dụng Node.js duy nhất, không có Python/FastAPI, ThingsBoard, Redis, Kafka hay microservice khác. Sensor và LED là capability của một ESP32, không phải các MQTT device giả.

<a id="cong-nghe-va-cau-truc-thu-muc"></a>
## Công nghệ và cấu trúc thư mục

| Lớp | Công nghệ |
| --- | --- |
| Firmware | C++/Arduino trên PlatformIO; DHT sensor library, AsyncMqttClient, ArduinoJson |
| MQTT broker | Eclipse Mosquitto 2 |
| Backend | Node.js 22+, TypeScript, Express 5, MQTT.js, Socket.IO, Zod |
| Database | MongoDB 8, Mongoose |
| Frontend | React 19, TypeScript, Vite, Recharts, Lucide |
| Đóng gói | Docker Compose; API và simulator dùng Node Alpine; web được phục vụ bởi Nginx |
| Test | Vitest |

~~~text
.
├── apps/
│   ├── api/
│   │   ├── scripts/device-simulator.ts  # ESP32 giả cho demo/test
│   │   └── src/
│   │       ├── config/               # Đọc và kiểm tra biến môi trường
│   │       ├── models/               # Asset, Device, Telemetry, Alarm, Command
│   │       ├── routes/               # REST API
│   │       ├── services/             # MQTT, rule, alarm, telemetry, command
│   │       ├── tests/                # Unit/API tests
│   │       ├── realtime.ts           # Socket.IO rooms
│   │       └── server.ts             # Khởi động ứng dụng
│   └── web/
│       └── src/
│           ├── components/           # Các thẻ, bảng, biểu đồ, modal
│           ├── lib/                  # REST client và xử lý command state
│           └── App.tsx               # Nạp snapshot, realtime, trạng thái UI
├── firmware/
│   ├── include/config.h              # Chân GPIO và giới hạn an toàn
│   ├── include/secrets.example.h     # Mẫu cấu hình cục bộ
│   ├── src/main.cpp                   # Firmware ESP32
│   └── platformio.ini
├── docker/                            # Dockerfile, Nginx, Mosquitto
├── docker-compose.yml
├── .env.example
└── README.md
~~~

Tài liệu thiết kế và review có sẵn tại [KIEN_TRUC_DU_AN.md](KIEN_TRUC_DU_AN.md), [REVIEW_KY_THUAT_KIEN_TRUC.md](REVIEW_KY_THUAT_KIEN_TRUC.md) và [DE_XUAT_CAI_THIEN_DE_TAI_SINH_VIEN.md](DE_XUAT_CAI_THIEN_DE_TAI_SINH_VIEN.md). Khi tài liệu ý tưởng khác với mã nguồn, README này mô tả **hành vi hiện có trong mã nguồn**.

<a id="chay-nhanh-bang-docker"></a>
## Chạy nhanh bằng Docker

### Yêu cầu

- Docker Desktop đang chạy và có Docker Compose V2.
- Các cổng 8080 (web), 4000 (API), 1883 (MQTT) chưa bị ứng dụng khác chiếm.
- Không cần ESP32 nếu dùng simulator. Không chạy simulator đồng thời với ESP32 thật có cùng deviceId.

Từ thư mục gốc dự án, chạy:

~~~powershell
docker compose --profile simulator up --build -d
docker compose --profile simulator ps
~~~

Đây là chế độ demo nhanh: năm service gồm mongodb, mosquitto, api, web và simulator. Nếu đã có ESP32 thật, bỏ profile simulator:

~~~powershell
docker compose up --build -d
~~~

Địa chỉ sau khi API và MongoDB đạt healthcheck:

| Địa chỉ | Mục đích |
| --- | --- |
| http://localhost:8080 | Dashboard |
| http://localhost:4000/api/health | Kiểm tra MongoDB và MQTT từ API |
| mqtt://IP_LAN_CUA_MAY:1883 | Broker cho ESP32 trong cùng LAN |

Kiểm tra nhanh bằng PowerShell:

~~~powershell
Invoke-RestMethod http://localhost:4000/api/health
Invoke-RestMethod http://localhost:8080/api/assets
docker compose --profile simulator logs --tail=50 api simulator
~~~

Health trả HTTP 200 khi cả MongoDB và MQTT đã kết nối; nếu chưa, trả HTTP 503. Khi simulator chạy, device esp32_01 sẽ chuyển ONLINE và gửi mẫu khoảng mỗi 5 giây. API tự tạo Garden_01 → Plant_01 → ESP32_01 khi kết nối MongoDB.

Muốn dừng mà **giữ dữ liệu MongoDB**:

~~~powershell
docker compose --profile simulator down
~~~

Chỉ khi cố ý xóa sạch dữ liệu demo mới dùng lệnh dưới đây. Tùy chọn -v xóa cả các Docker volume của MongoDB/Mosquitto và dữ liệu không thể khôi phục từ chính những volume đó:

~~~powershell
docker compose --profile simulator down -v
~~~

### Ép simulator tạo tình huống CRITICAL

Trong PowerShell, đặt độ ẩm đất 30% rồi tạo lại riêng simulator:

~~~powershell
$env:SIMULATOR_SOIL_MOISTURE = "30"
docker compose --profile simulator up -d --force-recreate simulator
~~~

Để trở về chuỗi số liệu biến thiên:

~~~powershell
Remove-Item Env:SIMULATOR_SOIL_MOISTURE
docker compose --profile simulator up -d --force-recreate simulator
~~~

Đây là số liệu **giả lập do script tạo**, không phải phép đo vật lý. Simulator dùng deviceId esp32_01 mặc định; hai client dùng cùng ID sẽ làm telemetry/trạng thái/ACK lẫn nhau.

<a id="phat-trien-tren-may-local"></a>
## Phát triển trên máy local

Cần Node.js 22+ và npm. Có thể dùng Docker chỉ cho MongoDB/Mosquitto, còn API và Vite chạy trên máy:

~~~powershell
npm ci
Copy-Item .env.example apps/api/.env
docker compose up -d mongodb mosquitto
~~~

Sửa apps/api/.env nếu cần. File này bị Git bỏ qua. Lưu ý script npm workspace chạy trong apps/api nên **file .env của API phải ở apps/api/.env**; file .env tại gốc chủ yếu được Docker Compose dùng cho nội suy cấu hình. Docker Compose hiện khai báo biến của service api ngay trong docker-compose.yml; sửa apps/api/.env không làm thay đổi cấu hình của container API.

Mở ba terminal riêng, đều bắt đầu từ thư mục gốc:

~~~powershell
# Terminal 1: REST API + MQTT + Socket.IO
npm run dev:api
~~~

~~~powershell
# Terminal 2: React/Vite tại http://localhost:5173
npm run dev:web
~~~

~~~powershell
# Terminal 3: chỉ khi không có ESP32 thật
npm run simulator
~~~

Vite proxy /api và /socket.io sang http://localhost:4000. Trong bản Docker, Nginx proxy hai đường dẫn đó sang service api:4000. Nếu cổng 4000 đang được container API chiếm từ lần chạy trước, dùng docker compose down rồi chỉ bật mongodb/mosquitto như trên.

Các lệnh npm ở thư mục gốc:

| Lệnh | Tác dụng |
| --- | --- |
| npm run dev:api | API TypeScript chế độ watch |
| npm run dev:web | Vite dev server |
| npm run simulator | Thiết bị MQTT giả |
| npm run typecheck | Kiểm tra TypeScript cho API và web |
| npm test | Chạy Vitest cho API và web |
| npm run build | Biên dịch API và web |

<a id="ket-noi-phan-cung-va-nap-firmware"></a>
## Kết nối phần cứng và nạp firmware

### Danh sách và chân mặc định

Phần cứng phạm vi đề tài: ESP32-WROOM-32S, DHT11, module LM393 đo độ ẩm đất, LED xanh/vàng/đỏ, breadboard và dây jumper. Không có bơm hoặc phần cứng đo nước.

| Tín hiệu | Chân ESP32 | Lưu ý |
| --- | --- | --- |
| DHT11 DATA | GPIO4 | Cấp nguồn đúng mức cho module; DHT11 rời có thể cần điện trở kéo lên |
| LM393 AO **hoặc** DO | GPIO34 | GPIO34 chỉ input; AO/DO đưa vào phải an toàn trong dải 0–3,3 V |
| LED xanh | GPIO25 | Chỉ bật output khi LED/module đã có hạn dòng an toàn |
| LED vàng | GPIO26 | Như LED xanh |
| LED đỏ | GPIO27 | Như LED xanh |

**Không nối tín hiệu 5 V vào GPIO ESP32.** Nhiều module LM393 khi cấp 5 V có AO/DO vượt 3,3 V. Hãy đo mức tín hiệu thực tế trước khi nối. Tất cả module dùng GND chung. LED rời không có điện trở hạn dòng không được cắm trực tiếp vào GPIO; firmware không thể khắc phục nguy cơ điện này.

Mặc định firmware đặt ENABLE_LED_OUTPUT=0, nên GPIO LED ở chế độ input/high-impedance. Chỉ đặt thành 1 sau khi đã kiểm chứng phần cứng hạn dòng. Trạng thái mô phỏng trên backend vẫn có thể thay đổi khi LED output bị khóa; trường greenPattern báo OFF để không khẳng định LED vật lý đang sáng.

### Tạo cấu hình bí mật và hiệu chuẩn

~~~powershell
Copy-Item firmware/include/secrets.example.h firmware/include/secrets.local.h
~~~

Điền WIFI_SSID, WIFI_PASSWORD và MQTT_HOST vào secrets.local.h. MQTT_HOST là **IPv4 LAN của máy chạy Docker**, không phải localhost hoặc tên service mosquitto. Mở port 1883 qua firewall nếu cần. deviceId firmware mặc định phải là esp32_01 để khớp bản ghi backend đã seed.

Firmware dùng AO theo mặc định (SOIL_SENSOR_USE_ANALOG=1), nhưng chỉ được nối AO sau khi xác nhận điện áp an toàn. Sau đó:

1. Đọc soilRaw trên Serial Monitor ở điều kiện khô nhất; ghi SOIL_DRY_RAW.
2. Đọc soilRaw ở điều kiện ướt nhất; ghi SOIL_WET_RAW.
3. Đặt hai giá trị này trong secrets.local.h, đảm bảo khác nhau, rồi nạp lại firmware.

Công thức: soilMoisturePct = clamp(100 × (raw − dry) / (wet − dry), 0, 100). Công thức cũng xử lý loại đầu dò có raw giảm khi ướt. Không chép giá trị hiệu chuẩn của thiết bị khác. Khi còn giá trị -1, firmware gửi soilRaw nhưng không gửi phần trăm độ ẩm đất; backend không tự tạo phần trăm giả.

Nếu chỉ có ngõ DO an toàn, đặt SOIL_SENSOR_USE_ANALOG=0. DO chỉ cho tín hiệu ngưỡng 0/1, **không cho biết đất 35% hay 60%**; chế độ này không thể kích hoạt rule tưới mô phỏng dựa trên phần trăm.

### Build, nạp và theo dõi

Cài PlatformIO Core hoặc PlatformIO trong VS Code. Từ thư mục gốc:

~~~powershell
pio run -d firmware
pio run -d firmware -t upload
pio device monitor -d firmware -b 115200
~~~

Nếu upload cần cổng serial cụ thể, cấu hình upload_port trong PlatformIO hoặc dùng tùy chọn của PlatformIO trên máy đó. Docker Compose chỉ đóng gói backend/web/broker/database, không nạp firmware cho ESP32.

<a id="cau-hinh"></a>
## Cấu hình

Backend đọc các biến sau qua apps/api/src/config/env.ts và kiểm tra bằng Zod:

| Biến | Mặc định local | Ý nghĩa |
| --- | --- | --- |
| NODE_ENV | development | development, test hoặc production |
| PORT | 4000 | Cổng API/Socket.IO |
| MONGODB_URI | mongodb://localhost:27017/iot_twin | Kết nối MongoDB |
| MQTT_URL | mqtt://localhost:1883 | Kết nối broker |
| MQTT_USERNAME, MQTT_PASSWORD | trống | Chỉ cần khi broker có xác thực |
| CORS_ORIGIN | http://localhost:5173,http://localhost:8080 | Danh sách origin, phân tách bằng dấu phẩy |
| DEVICE_OFFLINE_TIMEOUT_MS | 20000 | Mốc xem device mất liên lạc |
| COMMAND_TIMEOUT_MS | 10000 | Thời gian chờ ACK |
| TELEMETRY_SMOOTHING_WINDOW | 5 | Số mẫu dùng trung bình trượt, tối đa 20 |
| SOIL_WARNING_MIN_PCT | 40 | Dưới ngưỡng này là CRITICAL |
| SOIL_NORMAL_MIN_PCT | 60 | Từ ngưỡng này là NORMAL; phải lớn hơn ngưỡng WARNING |
| HIGH_TEMPERATURE_C | 45 | Ngưỡng alarm nhiệt độ cao |

Docker Compose hiện đặt các giá trị này trực tiếp trong docker-compose.yml (với hostname mongodb và mosquitto của mạng container). Muốn đổi ngưỡng trong Docker phải sửa cấu hình service api rồi tạo lại container. File .env.example là mẫu cho API chạy local, không tự ghi đè các giá trị đã khai báo trong Compose.

Frontend dùng VITE_API_URL và VITE_SOCKET_URL nếu được cung cấp lúc build; mặc định cùng origin. Trong cấu hình repo hiện tại không cần đặt hai biến này vì Vite/Nginx đã proxy. Simulator nhận MQTT_URL, SIMULATOR_DEVICE_ID, SIMULATOR_TELEMETRY_INTERVAL_MS (tối thiểu 1000 ms) và SIMULATOR_SOIL_MOISTURE (0–100; bỏ trống để số liệu biến thiên).

Firmware đọc WIFI_SSID, WIFI_PASSWORD, MQTT_HOST/PORT, DEVICE_ID, chân GPIO, hai giá trị hiệu chuẩn, chu kỳ telemetry/state và giới hạn mô phỏng trong firmware/include/config.h; override cục bộ trong secrets.local.h. Không commit file chứa Wi-Fi hoặc mật khẩu.

<a id="mqtt-quy-tac-va-co-che-an-toan"></a>
## MQTT, quy tắc và cơ chế an toàn

### Topic và QoS

| Topic | Hướng | QoS | Retain | Ý nghĩa |
| --- | --- | --- | --- | --- |
| iot/{deviceId}/telemetry | ESP32 → backend | 0 | Không | Mẫu DHT11/LM393 |
| iot/{deviceId}/state | ESP32 → backend | 1 | Có | Mode, LED/mô phỏng đã báo cáo; LWT offline |
| iot/{deviceId}/command | Backend → ESP32 | 1 | Không | Lệnh kèm commandId |
| iot/{deviceId}/ack | ESP32 → backend | 1 | Không | Kết quả thực thi |

Ví dụ telemetry sau hiệu chuẩn:

~~~json
{
  "sequence": 42,
  "temperatureC": 27.1,
  "airHumidityPct": 68.0,
  "soilRaw": 2580,
  "soilMoisturePct": 34.2
}
~~~

Firmware không gửi Unix timestamp từ millis(); backend dùng thời điểm nhận nếu payload thiếu timestamp. Simulator có gửi timestamp dạng Unix milliseconds và backend chấp nhận khi là số dương hữu hạn. Backend kiểm tra: nhiệt độ 0–60 °C, độ ẩm không khí/đất 0–100%; trường sai được lưu trong invalidFields và có thể tạo INVALID_SENSOR_DATA.

Ví dụ command và ACK:

~~~json
{
  "commandId": "8b28cc34-0b12-4a56-8a4c-6acaa66e3309",
  "type": "START_IRRIGATION_SIMULATION",
  "source": "MANUAL"
}
~~~

~~~json
{
  "commandId": "8b28cc34-0b12-4a56-8a4c-6acaa66e3309",
  "success": true,
  "status": "EXECUTED",
  "reportedState": {
    "online": true,
    "mode": "MANUAL",
    "alertLevel": "CRITICAL",
    "irrigationSimulationActive": true,
    "greenPattern": "BLINK"
  }
}
~~~

Các loại lệnh nội bộ: START_IRRIGATION_SIMULATION, STOP_IRRIGATION_SIMULATION, SET_MODE (AUTO/MANUAL), SET_ALERT_LEVEL (NORMAL/WARNING/CRITICAL). REST API công khai hiện chỉ cho phép ba loại đầu; SET_ALERT_LEVEL do rule backend gửi. Lệnh có vòng đời PENDING → EXECUTED/FAILED/TIMEOUT. HTTP 202 chỉ xác nhận backend đã nhận và publish lệnh, không xác nhận ESP32 đã chạy. Backend chặn một lệnh PENDING thứ hai trong cùng kênh SIMULATION, MODE hoặc ALERT. Firmware cache một số commandId đã xử lý và replay ACK cho bản QoS-1 trùng lặp.

### Rule và trạng thái

Backend lấy trung bình trượt tối đa 5 mẫu độ ẩm đất hợp lệ gần nhất, sau đó phân loại:

| Độ ẩm đất sau làm mịn | Environment |
| --- | --- |
| Từ 60% | NORMAL |
| Từ 40% đến dưới 60% | WARNING |
| Dưới 40% | CRITICAL |
| Thiếu/không hợp lệ | INVALID |

Khi thay đổi environment hợp lệ, backend gửi SET_ALERT_LEVEL để ESP32 báo LED: xanh sáng liên tục = NORMAL; vàng = WARNING; đỏ = CRITICAL. Khi mô phỏng tưới active, LED xanh nhấp nháy và có thể đồng thời với vàng/đỏ. Alarm hiện có: LOW_SOIL_MOISTURE, HIGH_TEMPERATURE, DEVICE_OFFLINE và INVALID_SENSOR_DATA. Alarm đang mở được cập nhật theo loại thay vì tạo bản ghi mới mỗi mẫu; hết điều kiện thì RESOLVED.

Ở AUTO, backend gửi START mô phỏng khi trạng thái độ ẩm chuyển sang CRITICAL. Khi hết CRITICAL hoặc dữ liệu đất không hợp lệ, backend gửi STOP nếu mô phỏng đang active. Ở MANUAL, người dùng có thể gửi START/STOP. Firmware tự tắt mô phỏng sau tối đa 60 giây, khi mất MQTT hoặc sau reset; LED mặc định OFF khi mất kết nối. Đây là lớp an toàn cho **mô phỏng LED**, không phải bộ điều khiển bơm công nghiệp.

<a id="digital-twin-va-mongodb"></a>
## Digital Twin và MongoDB

Khi API kết nối MongoDB lần đầu, seed idempotent tạo:

~~~text
Garden_01 (Asset: garden)
└── Plant_01 (Asset: plant)
    └── ESP32_01 / esp32_01 (Device)
        ├── DHT11 capability
        ├── LM393 capability
        └── LED xanh/vàng/đỏ capability
~~~

| Collection | Dữ liệu chính | Chỉ mục/ghi chú |
| --- | --- | --- |
| Asset | name, type, parentAssetId, attributes | parentAssetId + name |
| Device | deviceId, assetId, attributes, status, lastSeen, currentState | deviceId duy nhất |
| Telemetry | deviceId, assetId, timestamp, các số đo, valid, invalidFields | deviceId + timestamp giảm dần |
| Alarm | deviceId, type, severity, status, createdAt, resolvedAt | deviceId + status + createdAt |
| Command | commandId, deviceId, type, source, status, expiresAt, ACK timestamps | commandId duy nhất; chỉ một PENDING mỗi device/kênh |

Đây là Digital Twin **tối thiểu**: cấu trúc Garden/Plant/Device, thuộc tính cấu hình, trạng thái hiện tại, telemetry/alarm/command lịch sử và liên kết device → asset. Sensor/actuator không có collection riêng; lịch tưới trong giao diện hiện không phải collection MongoDB. Telemetry là collection MongoDB thường với index thời gian, **không** phải MongoDB Time-Series collection. Repo chưa có chính sách TTL/retention nên dữ liệu sẽ tiếp tục tăng khi chạy lâu.

<a id="rest-api-va-socketio"></a>
## REST API và Socket.IO

Tất cả endpoint trả JSON dạng { "success": true, "data": ... } khi thành công; lỗi trả { "success": false, "error": "..." }. Định danh trên URL là deviceId như esp32_01, không phải MongoDB ObjectId.

| Method và đường dẫn | Chức năng |
| --- | --- |
| GET /api/health | Kiểm tra kết nối MongoDB/MQTT; HTTP 503 nếu chưa sẵn sàng |
| GET /api/assets | Trả danh sách Asset và Device cho twin |
| GET /api/devices | Danh sách device |
| GET /api/devices/:deviceId | Trạng thái hiện tại của một device |
| GET /api/devices/:deviceId/telemetry?limit=200 | Mẫu cũ → mới; limit 1–1000, mặc định 200; hỗ trợ from/to ISO datetime |
| GET /api/devices/:deviceId/alarms?status=OPEN | Tối đa 100 alarm mới nhất; status OPEN/RESOLVED là tùy chọn |
| GET /api/devices/:deviceId/commands?limit=50 | Lịch sử command mới → cũ; limit 1–100, mặc định 50 |
| POST /api/devices/:deviceId/commands | Tạo lệnh MANUAL, trả HTTP 202 PENDING |
| GET /api/commands/:commandId | Kiểm tra một command |

Ví dụ điều khiển bằng PowerShell, sau khi device đã ONLINE:

~~~powershell
$api = "http://localhost:4000"
Invoke-RestMethod "$api/api/devices/esp32_01" | ConvertTo-Json -Depth 8

$modeBody = @{ type = "SET_MODE"; value = "MANUAL" } | ConvertTo-Json
Invoke-RestMethod "$api/api/devices/esp32_01/commands" -Method Post -ContentType "application/json" -Body $modeBody
~~~

Chờ command đổi sang EXECUTED rồi mới gửi START; nếu vẫn ở AUTO, backend sẽ từ chối START manual với HTTP 409:

~~~powershell
$startBody = @{ type = "START_IRRIGATION_SIMULATION" } | ConvertTo-Json
Invoke-RestMethod "$api/api/devices/esp32_01/commands" -Method Post -ContentType "application/json" -Body $startBody
~~~

Socket.IO client emit subscribe với { "deviceId": "esp32_01" }, server cho vào room device:esp32_01 rồi phát telemetry:update, device:status, alarm:new, alarm:update, command:update. UI chỉ subscribe device đang xem. Khi reconnect, UI tải lại snapshot qua REST để không bỏ lỡ thay đổi trong lúc mất kết nối.

<a id="du-lieu-that-va-du-lieu-minh-hoa"></a>
## Dashboard: dữ liệu thật và dữ liệu minh họa

Giao diện hiện tại có nhiều phần được dựng theo mockup. Bảng sau là ranh giới dữ liệu cần giữ rõ khi demo:

| Vùng giao diện | Dữ liệu/hoạt động thực tế | Giới hạn hiện tại |
| --- | --- | --- |
| Trạng thái ESP32, mode, mô phỏng LED | Device từ API và Socket.IO | Công tắc “tưới” chỉ điều khiển LED; START/STOP thủ công cần MANUAL |
| Bảng cảm biến | Mỗi Device từ API, trạng thái online/offline và lastTelemetry | Khi không có device, hiện bốn cảm biến mẫu; khi thiếu số đo đất, có giá trị fallback |
| Biểu đồ thống kê | Khi đủ telemetry, vẽ **20 mẫu gần nhất**; selector tải 50/200/1000 mẫu | Nhãn “7 ngày qua” không phải truy vấn 7 ngày; đường “lượng tiêu thụ” hiện lấy độ ẩm không khí; khi thiếu dữ liệu là dữ liệu mẫu |
| Cảnh báo | Alarm thật từ API/Socket.IO khi có alarm OPEN | Nếu không có alarm OPEN, widget hiển thị “4” và modal hiện bốn cảnh báo mẫu, kể cả van/pin không tồn tại |
| “Độ ẩm trung bình” | Lấy độ ẩm gần nhất của device đang chọn | Không phải trung bình nhiều cây; fallback 36% nếu thiếu dữ liệu |
| “Lượng nước tiêu thụ” | Không có phép đo nước | Hiển thị 600 lít cố định để minh họa; **không phải số liệu thật** |
| Lịch tưới | Tạo/xóa/tìm trong state React | Có lịch mẫu; không lưu MongoDB, không tồn tại sau reload, không chạy lịch trên ESP32; nút sửa chưa có xử lý |
| Bản đồ vệ tinh | Ảnh nền từ Unsplash; zoom và pin UI | GPS, diện tích 14,2 ha, vị trí và phần lớn pin là cố định; không phải vị trí thực |
| “Nhiệm vụ tưới” | Bảng các bản ghi mẫu cố định | Không dùng Command từ backend, không có phiên tưới hay lưu lượng đo được |
| Chi tiết cảm biến | Tên/trạng thái/số đo từ hàng được chọn | Pin, RSSI, độ sâu, “14 phút trước”, biểu đồ 7 ngày là mẫu |
| Tải báo cáo JSON | Xuất dữ liệu đang có trong state React | Có giá trị fallback và lịch mẫu; không phải báo cáo kiểm toán hoặc chứng từ lượng nước |

**Không dùng các số lít, GPS, van, pin hay nhiệm vụ tưới mẫu làm kết quả thực nghiệm.** Chức năng đáng tin cậy để nghiệm thu luồng IoT là telemetry thật/giả lập có gắn nguồn, trạng thái device, Command/ACK, alarm từ backend và trạng thái mô phỏng LED đã báo cáo. UI hiện chưa có asset tree, CRUD asset/device, hệ lịch chạy thực tế, đo lượng nước hoặc biểu đồ lịch sử 7 ngày chuẩn.

<a id="kiem-thu-va-kich-ban-demo"></a>
## Kiểm thử và kịch bản demo

Chạy kiểm tra mã nguồn:

~~~powershell
npm run typecheck
npm test
npm run build
docker compose config
~~~

Vitest hiện kiểm tra validation telemetry, rule/làm mịn, MQTT contract, command lifecycle/ACK, health API và trường hợp ACK EXECUTED đến trước HTTP PENDING trên frontend. Các test không thay thế kiểm tra điện áp, hiệu chuẩn hoặc thử trên ESP32 thật.

Kịch bản demo 5–10 phút với simulator:

1. Chạy Docker cùng profile simulator; kiểm tra /api/health, Device esp32_01 ONLINE và telemetry tăng theo thời gian.
2. Kiểm tra dữ liệu thật qua GET /api/devices/esp32_01/telemetry thay vì dựa vào các thẻ số lít/bản đồ mẫu.
3. Ép SIMULATOR_SOIL_MOISTURE=30; theo dõi CRITICAL, alarm LOW_SOIL_MOISTURE, command AUTO START và ACK EXECUTED.
4. Trả simulator về dữ liệu biến thiên; khi thoát CRITICAL, kiểm tra STOP và trạng thái mô phỏng OFF. Firmware/simulator cũng có giới hạn mô phỏng 60 giây.
5. Chuyển MANUAL, chờ ACK SET_MODE; gửi START rồi STOP và xem Command qua API. HTTP 202 không phải bằng chứng LED đã đổi trạng thái.
6. Dừng riêng simulator, chờ tối đa khoảng 20 giây cộng chu kỳ quét 5 giây để thấy OFFLINE/DEVICE_OFFLINE. Khởi động lại simulator để thấy ONLINE và alarm được resolve.

Khi demo ESP32 thật, thay bước simulator bằng Serial Monitor và xác minh chân/điện áp/hiệu chuẩn trước. Nếu ENABLE_LED_OUTPUT còn 0, không trình bày LED vật lý là đang sáng.

<a id="xu-ly-su-co"></a>
## Xử lý sự cố

| Hiện tượng | Kiểm tra và hướng xử lý |
| --- | --- |
| Dashboard không mở | Docker Desktop chạy chưa; xem docker compose ps và logs web; kiểm tra cổng 8080 |
| /api/health trả 503 | Xem logs api, mongodb, mosquitto; API chỉ healthy khi cả DB và MQTT kết nối |
| Device OFFLINE | Simulator/ESP32 có đang chạy; deviceId có đúng esp32_01; MQTT_HOST có phải IP LAN của máy host; port 1883/firewall; broker có online |
| Không có soilMoisturePct | Chưa hiệu chuẩn AO, đang dùng DO, hoặc tín hiệu ngoài dải; xem soilRaw và invalidFields; không tự điền phần trăm giả |
| ESP32 không kết nối broker Docker | Không dùng localhost hoặc tên mosquitto trên ESP32; dùng IPv4 LAN của máy chạy Docker và cùng Wi-Fi |
| Lệnh trả 409 | Device offline, START/STOP manual khi đang AUTO, hoặc đã có lệnh PENDING cùng kênh |
| Lệnh TIMEOUT | Backend đã gửi nhưng không nhận ACK đúng commandId; kiểm tra MQTT topic, firmware, nguồn/Wi-Fi, logs và trạng thái reported |
| Web có dữ liệu nhưng biểu đồ “7 ngày” không đúng | UI hiện vẽ 20 mẫu gần nhất hoặc dữ liệu mock; dùng endpoint telemetry với from/to để kiểm tra khoảng thời gian thật |
| Số lít, GPS hoặc cảnh báo van không khớp thiết bị | Các ô đó là placeholder của giao diện, không có phần cứng/backend tương ứng |
| Lịch tưới biến mất sau reload | Lịch chỉ nằm trong React state, chưa có API/database hay scheduler |
| npm ci/build thất bại | Kiểm tra Node 22+, lockfile và kết nối registry; chạy npm ci tại thư mục gốc |

<a id="gioi-han-trien-khai"></a>
## Giới hạn triển khai

- Compose hiện dùng MQTT anonymous, không TLS/ACL; API và Socket.IO không có xác thực/phân quyền. **Không đưa cấu hình hiện tại ra Internet hoặc dùng để điều khiển phần cứng nguy hiểm.**
- Đây là mô phỏng LED, không tưới nước thật. Không có dữ liệu thể tích nước, áp suất, van, pin, GPS hay vị trí sensor.
- DHT11 và LM393 phù hợp bài tập/demo; LM393 cần hiệu chuẩn và kiểm tra điện áp trên từng bộ.
- Firmware có timeout và tắt mô phỏng khi mất MQTT, nhưng đây không phải hệ thống fail-safe công nghiệp. Simulator phục vụ demo, không tương đương hoàn toàn với firmware vật lý.
- MongoDB Telemetry chưa có TTL/retention hoặc downsampling; cần chính sách dữ liệu trước khi chạy lâu dài.
- Không có CI/CD hay cấu hình production công khai trong repo. Docker Compose là cách đóng gói/demo local/LAN; triển khai production cần thiết kế thêm xác thực, mã hóa, phân quyền MQTT, quản lý secrets, backup, giám sát và quy trình cập nhật.
