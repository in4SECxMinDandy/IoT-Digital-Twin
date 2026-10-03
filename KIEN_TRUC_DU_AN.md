# TÌM HIỂU VỀ DIGITAL TWIN

## 1. Digital Twin Entities (Thực thể Bản sao kỹ thuật số)

Entities là các đối tượng cơ bản cấu thành nên mô hình Digital Twin trong hệ thống.

Có hai loại thực thể chính:

- **Devices (Thiết bị):** Là các thực thể vật lý hoặc ảo trực tiếp sinh ra dữ liệu (publish telemetry) hoặc nhận lệnh điều khiển (receive commands).
  - **Ví dụ:** ESP32, cảm biến, relay, …
- **Assets (Tài sản):** Là các thực thể trừu tượng dùng để nhóm các thiết bị lại thành các cấu trúc logic, đại diện cho bối cảnh thực tế.
  - **Ví dụ:** "Nông trại A", "Tòa nhà B", "Tầng 1", "Phòng máy chủ".
  - Một Asset không trực tiếp gửi dữ liệu mà nó chứa các Devices.

## 2. Digital Twin Model (Mô hình Bản sao kỹ thuật số)

Mô hình Digital Twin định nghĩa cách các thực thể (Entities) được biểu diễn và tổ chức. Nó bao gồm 4 thành phần chính:

- **Entities (Devices & Assets):** Như đã giải thích ở trên.
- **Relations (Mối quan hệ):** Cách các Assets và Devices kết nối tạo thành cấu trúc phân cấp.
  - **Ví dụ:** Tòa nhà chứa các Tầng, Tầng chứa các Cảm biến nhiệt độ.
- **Attributes (Thuộc tính):** Siêu dữ liệu (metadata) của thực thể, thường là các giá trị tĩnh hoặc ít thay đổi.
  - **Ví dụ:** phiên bản firmware của ESP32, tọa độ GPS của thiết bị, số serial, ngưỡng cảnh báo nhiệt độ (min, max).
- **Telemetry (Dữ liệu chuỗi thời gian):** Các điểm dữ liệu động, thay đổi liên tục theo thời gian được thu thập từ cảm biến.
  - **Ví dụ:** nhiệt độ hiện tại, độ ẩm, trạng thái bật/tắt của relay, mức tiêu thụ năng lượng.

## 3. Relations (Mối quan hệ giữa các thực thể)

Relations dùng để kết nối hai thực thể lại với nhau, tạo ra các mô hình phân cấp, quyền sở hữu hoặc sự phụ thuộc trong thế giới thực.

- **Cấu trúc:** Một relation luôn có hướng, đi từ thực thể nguồn (From) đến thực thể đích (To) và được gán một "loại" (type).
- **Các loại phổ biến:** Contains (A chứa B - ví dụ Tòa nhà chứa Thiết bị), Manages (A quản lý B), Uses (A sử dụng B). Bạn cũng có thể tự định nghĩa loại quan hệ bất kỳ.
- **Lợi ích:** Cho phép xây dựng các Dashboard động (dashboard tự động thay đổi dữ liệu tùy thuộc vào Asset đang được chọn), tính toán tổng hợp (ví dụ: tính nhiệt độ trung bình của tất cả cảm biến nằm trong một Tòa nhà), và thiết lập các rule xử lý dữ liệu phức tạp.

## 4. Ứng dụng thực tế: Smart Irrigation Template

Template "Tưới tiêu thông minh" (Smart Irrigation) của ThingsBoard là một ví dụ hoàn hảo minh họa cách kết hợp các khái niệm trên vào một bài toán thực tế.

# ỨNG DỤNG VÀO DỰ ÁN

## 1. Định nghĩa Schema trong Backend (Mongoose / MongoDB)

Tách bạch giữa thiết bị vật lý và bối cảnh sử dụng.

- **Device Schema (Thực thể):** Lưu thông tin gốc của ESP32 (MAC Address, trạng thái online/offline).
- **Asset Schema (Bối cảnh):** Tạo các document như "Vườn số 1", "Vườn số 2", "Cây số 1", "Cây số 2", …
- **Relation:** Thêm trường `assetId` vào schema của Device. Khi bạn muốn biết "Nhiệt độ trung bình của Vườn lan", bạn query tất cả các Devices có `assetId` của vườn lan đó, sau đó lấy telemetry mới nhất của chúng.
- **Telemetry Schema:** Đây là bảng nhận lượng dữ liệu khổng lồ. Thiết kế theo dạng Time-Series Collection (nếu dùng MongoDB 5.0+) để tối ưu hiệu suất ghi và truy vấn theo thời gian.

### Ví dụ các schema

#### a. Asset (Thực thể: cây)

```text
{
  _id: PK,
  Name: String,
  Type: String
}
```

#### b. Device (thiết bị IoT)

```text
{
  _id: PK,
  Name: String,
  Type: String,
  assetId: FK
}
```

#### c. Attributes (thuộc tính tĩnh)

```text
{
  deviceId: FK,
  firware_version: String,
  safe_min_soil_humidity: Number,
  safe_max_soil_humidity: Number
}
```

#### d. Telemetry (chuỗi thời gian)

```text
{
  deviceId: FK,
  timestamp: Date,
  temperature: Number,
  humidity: Number,
  soil_himidity: Number
}
```

## 2. Quy hoạch lại MQTT Topics (Giao tiếp)

Thay vì dùng topic tự do như `sensor/temp`, cấu trúc topic theo Entities để Backend dễ định tuyến:

- **Gửi dữ liệu:** `dt/telemetry/{device_id}`
- **Gửi thuộc tính:** `dt/attributes/{device_id}`
- **Nhận lệnh từ Web:** `dt/command/{device_id}`

Backend khi nhận tin nhắn từ `dt/telemetry/esp32_01`, nó sẽ tự động biết parse payload và lưu vào bảng Telemetry, gắn với `deviceId = esp32_01`.

## 3. Xây dựng Logic xử lý (Smart Logic/Rule Engine)

Trong Express, tạo Middleware mô phỏng "Rule Engine":

- **Enrichment (Làm giàu dữ liệu):** Khi nhận nhiệt độ từ `esp32_01`, so sánh với giá trị mặc định `safe_min_soil_humidity` (người dùng tự cài đặt).
- **Trigger (Cảnh báo):** Nếu nhiệt độ nhận được `< safe_min_soil_humidity`, Backend không chỉ lưu DB mà còn sinh ra một đối tượng Alarm lưu vào bảng Cảnh báo, đồng thời emit WebSocket `ALARM_TRIGGERED` lên React.
- **Aggregation (Tính toán):** Viết một cronjob hoặc trigger để cứ 5 phút, Backend làm sạch dữ liệu (loại bỏ các telemetry có dữ liệu unvalid), làm mịn dữ liệu telemetry để giảm nhiễu, nhìn rõ xu hướng, thực hiện tự động tưới cây khi giá trị đã làm mịn `< safe_min_soil_humidity`.

## 4. Hiển thị trên Frontend (Dashboard React)

- Sidebar đơn giản hoặc Tree-view (cây thư mục) bên trái lấy từ bảng Assets.
- Khi click vào "Cây 1", React gọi API lấy toàn bộ Devices thuộc Asset đó, sau đó subscribe WebSocket để nhận chỉ các telemetry của những thiết bị này.
- Các thông tin hiển thị của 1 asset (1 cây):
  - Trạng thái tưới cây (ON/OFF)
  - Lịch tưới cây dự kiến (theo logic backend)
  - Lịch sử tưới cây
  - Trạng thái các cảm biến
  - Biểu đồ độ ẩm đất, nhiệt độ, độ ẩm không khí
  - Trung bình độ ẩm đất (theo ngày/tuần/tháng)
  - Tổng số lít nước đã tưới (theo ngày/tuần/tháng)
  - Danh sách alarm
- Bảng điều khiển:
  - Nút bật/tắt tưới cây

# KIẾN TRÚC DỰ ÁN CODE

**Thiết kế hệ thống điều khiển và giám sát tưới thông minh bảo đảm an toàn vận hành**

## Kiến trúc

| Lớp | Công nghệ | Vai trò trong hệ thống Digital Twin |
|---|---|---|
| Vật lý | Esp32, cảm biến, C++ | Thu thập trạng thái vật lý thực tế (nhiệt độ, độ rung, vị trí) và thực thi lệnh tưới cây. |
| Giao tiếp | MQTT | Trung tâm điều phối tin nhắn (Publish/Subscribe). |
| Xử lý (Backend) | Nodejs, Express, MongoDB, Python | Nhận dữ liệu từ broker, lưu trữ log time-series, cung cấp API và quản lý logic. |
| Bản sao kỹ thuật số | React (Web), Thingsboard (App) | Hiển thị trực quan trạng thái thực thể và cung cấp bảng điều khiển (Dashboard). |

Khi hoàn thiện, đóng gói bằng Docker.

## Luồng xử lý

### 1. Luồng dữ liệu

![Sơ đồ luồng dữ liệu](images/diagram_1.png)

- ESP32 đọc dữ liệu từ cảm biến và publish dữ liệu cho MQTT Broker.
- MQTT Broker trung gian, nhận dữ liệu từ ESP32 & Cảm biến và chuyển message đó cho những client đã Subscribe topic tương ứng.
- Backend Express (có thể có thêm server FastAPI) nhận dữ liệu từ MQTT Broker rồi phụ trách:
  - Kiểm tra dữ liệu
  - Validate dữ liệu
  - Xử lý/biến đổi dữ liệu
  - Tính toán các giá trị cần thiết
  - Kiểm tra trạng thái thiết bị
  - Lưu dữ liệu vào Database MongoDB
  - Gửi dữ liệu realtime cho Web/App bằng Websocket
- Giao diện React hiển thị Dashboard, trang điều khiển.

### 2. Luồng điều khiển

![Sơ đồ luồng điều khiển](images/diagram_2.png)

- Người dùng nhấn nút trên giao diện Web/App hoặc khi các thông số dữ liệu có giá trị như cài đặt.
- Backend gửi command qua MQTT đến topic.
- ESP32 subscribe topic này, nhận command, thực hiện.

## Các linh kiện sử dụng

- module esp32-wroom-32s
- dht11 (cảm biến nhiệt độ, độ ẩm)
- cảm biến độ ẩm đất lm393
- led vàng, đỏ, xanh
- board cắm
- dây cắm
