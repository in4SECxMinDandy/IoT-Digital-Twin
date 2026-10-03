# Đề xuất cải thiện đề tài IoT sinh viên

## Phạm vi và nguyên tắc

Tài liệu này cải thiện kiến trúc trong `KIEN_TRUC_DU_AN.md` theo ràng buộc hiện tại: **chỉ dùng ESP32-WROOM-32S, DHT11, LM393, LED xanh/vàng/đỏ, breadboard và dây jumper; không thêm hoặc thay phần cứng**.

- Đây là đề xuất cho **mô hình giám sát môi trường cây trồng và mô phỏng điều khiển tưới bằng LED**, không phải hệ thống bơm nước thật.
- Trong workspace hiện chỉ có tài liệu kiến trúc và các báo cáo review, không có mã nguồn, Dockerfile hay Docker Compose để tái sử dụng/review ở mức code.
- Hai ảnh bổ sung xác nhận luồng dùng Mosquitto: `ESP32 -> Mosquitto -> Backend -> MongoDB/WebSocket -> Web`, và lệnh đi theo chiều ngược lại.
- Các nội dung dưới đây ghi rõ phần nào là nhận xét từ tài liệu và phần nào là đề xuất. Không có khuyến nghị mua thêm linh kiện trong phạm vi hiện tại.

---

## A. Đánh giá kiến trúc hiện tại

### Kiến trúc đang được hiểu

**[Tài liệu]** Dự án đã có xương sống đúng: ESP32 đọc sensor, publish MQTT; backend lưu MongoDB và đẩy WebSocket; React hiển thị dashboard; Mosquitto xuất hiện trong hai sơ đồ bổ sung.

**[Nhận xét]** Chuỗi này hoàn toàn phù hợp bài tập lớn. Điểm cần sửa không phải là thay công nghệ, mà là chốt đúng phạm vi và làm rõ hợp đồng dữ liệu/trạng thái.

| Tiêu chí trong phạm vi mô phỏng sinh viên | Hiện tại | Sau cải thiện |
|---|---:|---:|
| Phần cứng cho giám sát + LED simulation | 6/10 | 8/10, nếu wiring LED/LM393 được xác nhận an toàn |
| Phần mềm | 6/10 | 8/10 với một Node.js/Express service |
| Digital Twin | 4/10 | 7/10 với Asset, Device, state, telemetry và alarm rõ ràng |
| Khả năng demo | 5/10 | 9/10 vì vòng phản hồi MQTT + ACK nhìn thấy được |
| Độ phức tạp | 7/10 | 5/10 sau khi bỏ Python, ThingsBoard runtime và các collection không cần thiết |

**Kết luận:** Nên tiếp tục. Kiến trúc hiện hữu không cần làm lại; chỉ cần thu hẹp thành một hệ thống mô phỏng trung thực với phần cứng hiện có.

---

## B. Các vấn đề cần sửa

| Vấn đề | Bằng chứng | Hậu quả | Cách sửa trong phạm vi hiện tại |
|---|---|---|---|
| Tên đề tài và mô tả hứa tưới/an toàn vận hành thật | Tiêu đề ở L132; ESP32 được nói là thực thi tưới ở L138 | Gây hiểu nhầm là có bơm, relay và cơ chế safety vật lý | Đổi toàn bộ cách gọi thành **mô phỏng điều khiển tưới**; không dùng “bơm đang chạy”, “đã tưới” hay “bảo đảm an toàn bơm”. |
| Mô tả sensor không khớp BOM | L138 nêu nhiệt độ, độ rung, vị trí; BOM chỉ có DHT11/LM393 ở L171-L178 | Dashboard/schema có thể hứa dữ liệu không tồn tại | Chỉ dùng `temperatureC`, `airHumidityPct`, `soilMoisturePct` hoặc `soilDryState`. |
| Rule so sánh sai đại lượng | L110-L112 so sánh `temperature` với `safe_min_soil_humidity` | Cảnh báo và mô phỏng được kích hoạt sai | Chỉ so sánh `smoothedSoilMoisturePct` với ngưỡng độ ẩm đất. |
| Tên field sai/không thống nhất | `firware_version` ở L78; `soil_himidity` ở L92 | Dễ lệch firmware, backend và dashboard | Dùng `firmwareVersion`, `temperatureC`, `airHumidityPct`, `soilMoisturePct`. |
| Dashboard hứa tổng lít nước và lịch sử tưới thật | L119-L125 | Không có flow sensor hoặc bơm để đo/khẳng định | Bỏ “tổng lít nước”; thay bằng `trạng thái mô phỏng`, `lệnh gần nhất`, hoặc `thời lượng mô phỏng`. |
| Backend có quá nhiều lựa chọn | L140, L153 và ảnh ghi Node.js/Python/Java | Sinh viên phải vận hành nhiều runtime cho cùng một việc | MVP chỉ dùng **Node.js + Express**. Bỏ Python/FastAPI/Java khỏi runtime. |
| React và ThingsBoard chồng vai trò | L141 | Trùng dashboard, device/asset/telemetry/alarm | React là dashboard chính; ThingsBoard chỉ là tài liệu tham khảo hoặc Future Work. |
| Luồng command kết thúc tại ESP32 | L167-L170 và ảnh điều khiển | “Đã gửi” có thể bị hiểu nhầm là “đã thực thi” | Thêm `commandId`, ACK, trạng thái `PENDING/EXECUTED/FAILED/TIMEOUT`. |
| `Device.assetId` không dựng được Garden -> Plant | L45-L48 | Tree UI không có parent hierarchy | Thêm `parentAssetId` cho Asset; chưa cần collection Relation. |

### Giới hạn phần cứng phải ghi rõ trong báo cáo

1. Không có relay/bơm/cảm biến lưu lượng/mực nước, nên hệ thống **không tưới nước thật, không xác nhận nước chảy, không đo được lít nước và không đánh giá fail-safe cho bơm vật lý**.
2. LM393 không tự động có nghĩa là phần trăm độ ẩm đất. Nếu module hiện có có chân analog `AO`, có thể hiệu chuẩn thành chỉ số phần trăm tương đối. Nếu chỉ dùng chân `DO`, chỉ được hiển thị `DRY/WET`, không được tự nhận là `37%`.
3. Danh sách linh kiện không nêu điện trở hạn dòng LED. Không đấu LED trần trực tiếp vào GPIO ESP32. Chỉ dùng LED ngoài nếu LED/module hiện có đã có giới hạn dòng phù hợp; nếu không xác minh được, demo command/ACK trên Serial Monitor và Dashboard. Đây là điều kiện an toàn, **không phải đề xuất mua thêm phần cứng**.
4. Trước khi nối `AO`/`DO` của LM393 vào ESP32, phải xác nhận tín hiệu không vượt 3.3 V. Nếu dùng analog với Wi-Fi, ưu tiên chân ADC1; không dùng GPIO input-only cho LED.

---

## C. Các phần nên giữ nguyên

- ESP32-WROOM-32S, DHT11, LM393 và ba LED.
- Luồng MQTT với Mosquitto.
- Node.js/Express làm backend duy nhất.
- MongoDB cho telemetry và metadata.
- React dashboard, REST cho snapshot/lịch sử và WebSocket cho dữ liệu realtime.
- Ý tưởng Asset, Device, Attributes, Telemetry và Alarm.
- Docker Compose ở giai đoạn cuối, chỉ để đóng gói phần mềm.

---

## D. Các phần nên đơn giản hóa hoặc để Future Work

| Giữ ở MVP/hoàn thiện | Không làm ở phiên bản hiện tại |
|---|---|
| Một backend Node.js/Express chứa MQTT client, REST, WebSocket, rule và validation | Python, FastAPI, Java, microservices, Kafka, Kubernetes |
| Một broker Mosquitto và một database MongoDB | Nhiều broker hoặc nhiều database/TSDB |
| Bốn collection chính: Asset, Device, Telemetry, Alarm | Relation/Attribute/Command generic engine nếu chưa có nhu cầu thực |
| Rule theo ngưỡng, moving average 3 mẫu, alarm tối đa 4 loại | AI, ML, forecasting, rule engine doanh nghiệp |
| React dashboard duy nhất | ThingsBoard chạy song song, mobile app riêng |
| Mô phỏng tưới bằng LED | Bơm, relay, đo lưu lượng, weather API trong bản hiện tại |

MongoDB Time-Series có thể dùng cho `Telemetry` nếu nhóm đã quen với MongoDB và phiên bản đang dùng hỗ trợ tốt. Nếu không, collection thường với index `{ deviceId: 1, timestamp: -1 }` là đủ cho bài tập lớn; không để lựa chọn storage chặn tiến độ end-to-end.

---

## E. Tên đề tài cải tiến

### Ba tên phù hợp

1. **Xây dựng mô hình Digital Twin cho hệ thống giám sát môi trường cây trồng và mô phỏng điều khiển tưới ứng dụng IoT.**
2. Hệ thống IoT giám sát độ ẩm đất và mô phỏng điều khiển tưới bằng ESP32, MQTT và Web Dashboard.
3. Hệ thống giám sát môi trường cây trồng, cảnh báo thời gian thực và hỗ trợ quyết định tưới theo luật ngưỡng.

### Tên được chọn

**Xây dựng mô hình Digital Twin cho hệ thống giám sát môi trường cây trồng và mô phỏng điều khiển tưới ứng dụng IoT.**

Tên này tốt nhất vì nêu đúng ba giá trị: dữ liệu sensor thật, mô hình Digital Twin có ngữ cảnh, và điều khiển chỉ là mô phỏng. Nó không ngụ ý có máy bơm, relay hoặc lưu lượng nước thật.

Quy ước thuật ngữ trong UI/báo cáo:

| Dùng | Không dùng |
|---|---|
| “Mô phỏng trạng thái tưới” | “Bơm đang chạy” |
| “Kích hoạt mô phỏng tưới” | “Đã tưới cây” |
| “Lịch sử lệnh/phiên mô phỏng” | “Lịch sử tưới thực tế” |
| “Cảnh báo độ ẩm đất thấp” | “Bảo đảm an toàn vận hành bơm” |

---

## F và G. Kiến trúc hệ thống cải tiến và sơ đồ ASCII

```text
                   React Dashboard
          REST snapshot + WebSocket realtime
                           |
                    Node.js / Express
       MQTT client | validation | rule | alarm | API
                /                |                \
          MongoDB                 |                 Mosquitto
  Asset/Device/Telemetry/Alarm    |                     |
                                 WebSocket              | telemetry/state/ack
                                                       ESP32-WROOM-32S
                                                   /       |        \
                                               DHT11    LM393       3 LED
                                               sensor   sensor    simulation
```

### Vai trò từng thành phần

| Thành phần | Vai trò tối giản |
|---|---|
| ESP32 | Đọc DHT11/LM393, publish telemetry/state/ACK, nhận command, điều khiển ba LED theo quy ước đã chốt. |
| Mosquitto | Trung chuyển MQTT giữa ESP32 và Node.js; không chứa business rule. |
| Node.js/Express | Một tiến trình duy nhất: MQTT subscriber/publisher, validation, moving average, rule, alarm, REST và WebSocket. |
| MongoDB | Lưu Asset, Device/current state, telemetry lịch sử và alarm. |
| React | Hiển thị Digital Twin, realtime telemetry, chart, alarm, trạng thái lệnh và điều khiển mô phỏng. Không kết nối MQTT trực tiếp. |

### Luồng dữ liệu

```text
ESP32 đọc DHT11 + LM393
  -> MQTT telemetry
  -> Node: parse -> validate -> smoothing -> classify
  -> MongoDB: telemetry + Device.currentState + Alarm
  -> WebSocket
  -> React cập nhật dashboard
```

### Luồng điều khiển mô phỏng

```text
React --REST--> Node tạo trạng thái PENDING
Node --MQTT command--> ESP32
ESP32 đặt GPIO LED phù hợp
ESP32 --MQTT ACK + state--> Node
Node cập nhật trạng thái và --WebSocket--> React
```

Frontend chỉ hiển thị `Mô phỏng đang hoạt động` sau ACK `EXECUTED` và reported state từ ESP32, không phải ngay khi backend publish MQTT.

---

## H. Data model Digital Twin tối giản

### Mô hình thực thể

```text
Garden_01 (Asset: garden)
└── Plant_01 (Asset: plant, parentAssetId = Garden_01)
    └── ESP32_01 (Device, assetId = Plant_01)
        ├── DHT11 capability
        ├── LM393 capability
        └── LED simulation capability
```

DHT11, LM393 và LED không là Device riêng vì chúng không có identity MQTT hay vòng đời mạng độc lập. `parentAssetId` và `assetId` đủ cho một Garden/một Plant; Relation collection chỉ xuất hiện khi Future Work có nhiều kiểu quan hệ ngoài cây chứa.

### Bốn collection đủ cho MVP

```js
Asset {
  _id,
  name: "Garden_01" | "Plant_01",
  type: "garden" | "plant",
  parentAssetId: ObjectId | null,
  attributes: {
    location: String,
    normalMinPct: 60,
    warningMinPct: 40
  }
}

Device {
  _id,
  deviceId: "esp32_01",            // unique
  name: "ESP32_01",
  type: "ESP32-WROOM-32S",
  assetId: ObjectId,
  attributes: {
    firmwareVersion: String,
    sensors: ["DHT11", "LM393"],
    ledRoles: {
      simulation: "green",
      warning: "yellow",
      critical: "red"
    },
    sampleIntervalSeconds: 5,
    dryRaw: Number,
    wetRaw: Number
  },
  status: "ONLINE" | "OFFLINE",
  lastSeen: Date,
  currentState: {
    mode: "AUTO" | "MANUAL",
    environment: "NORMAL" | "WARNING" | "CRITICAL" | "INVALID",
    irrigationSimulationActive: Boolean,
    lastCommand: { commandId, status, updatedAt },
    lastTelemetry: { temperatureC, airHumidityPct, soilMoisturePct, timestamp }
  }
}

Telemetry {
  _id,
  deviceId: ObjectId,
  assetId: ObjectId,
  timestamp: Date,
  receivedAt: Date,
  temperatureC: Number | null,
  airHumidityPct: Number | null,
  soilRaw: Number | null,
  soilMoisturePct: Number | null,
  smoothedSoilMoisturePct: Number | null,
  valid: Boolean,
  invalidFields: [String]
}

Alarm {
  _id,
  deviceId: ObjectId,
  assetId: ObjectId,
  type: "LOW_SOIL_MOISTURE" | "DEVICE_OFFLINE" | "INVALID_SENSOR_DATA" | "HIGH_TEMPERATURE",
  severity: "INFO" | "WARNING" | "CRITICAL",
  status: "OPEN" | "RESOLVED",
  latestValue: Number | String,
  createdAt: Date,
  resolvedAt: Date | null
}
```

`attributes` và `currentState` nhúng trong Device/Asset vì ít thay đổi và chỉ có quy mô nhỏ. Không cần collection Attribute, Relation hoặc Command generic trong MVP. Nếu cần lịch sử lệnh sau này, thêm `Command` collection ở phần Hoàn thiện; hiện tại `currentState.lastCommand` là đủ cho PENDING/ACK trên dashboard.

Index nhỏ nhưng cần thiết:

```text
Device.deviceId                          unique
Telemetry.(deviceId, timestamp desc)
Alarm.(deviceId, status, createdAt desc)
Asset.(parentAssetId, name)
```

### Vì sao đây là Digital Twin, không chỉ là dashboard

Mô hình có Asset thực tế (Garden/Plant), Device gắn với Asset, attributes/hiệu chuẩn, snapshot trạng thái hiện tại, telemetry lịch sử, alarm và command hai chiều có xác nhận. Đó là mức Digital Twin phù hợp sinh viên: **một bản sao ngữ cảnh và trạng thái của mô hình vật lý/mô phỏng**, không phải framework Digital Twin tổng quát hay mô phỏng vật lý cao cấp.

---

## I. MQTT đơn giản và rõ ràng

Chỉ dùng một namespace `iot/`, không trộn `dt/` và `iot/`.

| Topic | Hướng | QoS | Retain | Mục đích |
|---|---|---:|---:|---|
| `iot/{deviceId}/telemetry` | ESP32 -> Backend | 0 | Không | Dữ liệu định kỳ; mất một mẫu không ảnh hưởng demo. |
| `iot/{deviceId}/state` | ESP32 -> Backend | 1 | Có | Online, mode, trạng thái ba LED và simulation reported state. |
| `iot/{deviceId}/command` | Backend -> ESP32 | 1 | Không | Lệnh `SET_ALERT_LEVEL`, `SET_SIMULATION`, `SET_MODE`. |
| `iot/{deviceId}/ack` | ESP32 -> Backend | 1 | Không | Kết quả thực thi có cùng `commandId`. |

### Payload mẫu

```json
// iot/esp32_01/telemetry
{
  "sequence": 125,
  "temperatureC": 30.0,
  "airHumidityPct": 72.0,
  "soilRaw": 2080,
  "soilMoisturePct": 38.5
}
```

```json
// iot/esp32_01/command
{
  "commandId": "cmd-2026-001",
  "type": "SET_SIMULATION",
  "value": "ON",
  "source": "manual"
}
```

```json
// iot/esp32_01/ack
{
  "commandId": "cmd-2026-001",
  "status": "EXECUTED",
  "reportedState": {
    "mode": "MANUAL",
    "irrigationSimulationActive": true
  }
}
```

### Quy tắc command

- Dùng lệnh `SET ON`/`SET OFF`, không dùng `TOGGLE` để message trùng không đảo LED sai.
- Backend tạo `PENDING`, đợi tối đa 10 giây; không có ACK thì `TIMEOUT`.
- ESP32 đặt GPIO xong mới gửi ACK `EXECUTED`; lỗi validation/mode gửi `FAILED` kèm lý do.
- QoS 1 là at-least-once. Retry phải dùng **cùng `commandId`**; ESP32 ghi nhớ command gần nhất và trả lại ACK cũ thay vì chạy lại.
- Command không retained để ESP32 reconnect không tự nhận lệnh mô phỏng cũ.
- ESP32 publish telemetry mỗi 5 giây; backend cập nhật `lastSeen`. Quá 20 giây không có telemetry/state thì đánh dấu `OFFLINE`.
- Có thể dùng MQTT Last Will tối giản trên topic `state`: retained `online:false` khi mất kết nối. Backend vẫn dùng `lastSeen`, vì retained state không chứng minh thiết bị còn sống.

---

## J. Logic xử lý, validation và Rule Engine

### LM393: hai trường hợp cần phân biệt

| Phần cứng hiện có | Dữ liệu được phép công bố | Logic phù hợp |
|---|---|---|
| Có `AO`, điện áp an toàn cho ESP32 | `soilRaw` và `soilMoisturePct` tương đối sau hiệu chuẩn | Moving average và ba mức NORMAL/WARNING/CRITICAL. |
| Chỉ có `DO` hoặc không thể nối AO an toàn | `DRY`/`WET` nhị phân | Không dùng phần trăm, chart % hoặc moving average số; thu hẹp demo thành cảnh báo dry/wet. |

Với `AO`, ghi `dryRaw` khi đầu dò khô và `wetRaw` khi đầu dò ướt trong mẫu đất demo. Quy đổi có clamp:

```text
soilMoisturePct = clamp(100 * (raw - dryRaw) / (wetRaw - dryRaw), 0, 100)
```

Công thức vẫn xử lý được chiều ADC đảo nếu `wetRaw < dryRaw`. Đây là chỉ số tương đối đã hiệu chuẩn cho demo, không phải phép đo chuẩn phòng thí nghiệm.

### Pipeline backend

```text
raw telemetry
-> parse JSON/schema
-> validate từng field
-> chuyển AO sang soilMoisturePct (nếu có)
-> moving average 3 mẫu soil hợp lệ
-> rule evaluation
-> lưu Telemetry + cập nhật Device.currentState + mở/đóng Alarm
-> WebSocket đến React
```

Validation tối thiểu:

| Field | Phạm vi |
|---|---|
| `temperatureC` | 0-60 C |
| `airHumidityPct` | 0-100 % |
| `soilMoisturePct` | 0-100 % sau hiệu chuẩn AO |

Thiếu field, `NaN`, sai kiểu hoặc ngoài phạm vi được đánh dấu invalid. Field invalid không vào moving average/rule; không ghi đè `lastTelemetry` hợp lệ. Có thể vẫn lưu document Telemetry với `valid:false` để debug. DHT11 lỗi không làm dữ liệu LM393 hợp lệ trở thành invalid; validation là theo từng field.

### Rule Engine đủ cho sinh viên

```text
soilMoisturePctSmoothed >= 60  -> NORMAL
40 <= soilMoisturePctSmoothed < 60 -> WARNING
soilMoisturePctSmoothed < 40   -> CRITICAL
```

- Ngưỡng là attributes của Plant, không hard-code rải rác trong firmware/frontend.
- Tạo/mở Alarm khi trạng thái đổi, không thêm một Alarm mới ở mỗi telemetry.
- Khi quay lại NORMAL, resolve Alarm cũ.
- Moving average dùng 3 mẫu hợp lệ, tức khoảng 15 giây với chu kỳ 5 giây. Đây là đủ dễ giải thích và giảm nhiễu.
- Phần Hoàn thiện có thể thêm hysteresis nhỏ: vào WARNING dưới 60, chỉ về NORMAL từ 62; vào CRITICAL dưới 40, chỉ thoát từ 42. Không cần AI hay ML.

### AUTO và MANUAL

| Mode | Hành vi |
|---|---|
| `MANUAL` | Người dùng đổi sang MANUAL rồi gửi `SET_SIMULATION ON/OFF`. |
| `AUTO` | Backend chỉ dùng soil value hợp lệ đã làm mịn. `CRITICAL` gửi ON mô phỏng; NORMAL/WARNING, invalid hoặc OFFLINE gửi OFF/không kích hoạt mới. |

Không để manual ghi đè AUTO âm thầm: UI phải đổi mode trước, hoặc command phải thể hiện mode rõ ràng. Khi ESP32 reset, tất cả LED OFF; backend chỉ quyết định auto lại sau telemetry mới hợp lệ. `SIMULATION_MAX_DURATION = 60 giây` trên ESP32 là một giới hạn đơn giản để LED xanh tự tắt khi mất mạng, dù đây chỉ là mô phỏng.

---

## K. Vai trò của ba LED

Để không lẫn trạng thái môi trường, alarm và actuator simulation, dùng **một vai trò duy nhất cho mỗi LED**:

| LED | Vai trò duy nhất | Khi bật |
|---|---|---|
| Xanh | `IRRIGATION_SIMULATION_ACTIVE` | ESP32 bật khi thực thi command mô phỏng; backend/UI chỉ coi là ACTIVE sau ACK thành công. |
| Vàng | `SOIL_WARNING` | Soil moisture đã làm mịn ở mức WARNING. |
| Đỏ | `SOIL_CRITICAL` | Soil moisture đã làm mịn ở mức CRITICAL. |

Quy ước:

- `NORMAL`: LED vàng và đỏ tắt; dashboard hiện badge NORMAL.
- `WARNING`: LED vàng bật, LED đỏ tắt.
- `CRITICAL`: LED đỏ bật, LED vàng tắt.
- `AUTO + CRITICAL + simulation active`: LED đỏ và xanh cùng bật. Ý nghĩa là “đất khô nghiêm trọng; hệ thống đang **mô phỏng** tưới”.
- Không dùng LED xanh đồng thời cho NORMAL, không dùng LED để mã hóa OFFLINE hoặc INVALID; hai trạng thái đó hiện bằng Dashboard/Alarm để không tạo quá nhiều quy ước màu.
- Khi boot/reset, ESP32 đưa cả ba output về OFF trước khi kết nối Wi-Fi/MQTT.

Backend chỉ gửi `SET_ALERT_LEVEL` khi level thay đổi, để ESP32 đặt vàng/đỏ. `SET_SIMULATION` điều khiển xanh. Như vậy demo chứng minh được cả loop dữ liệu và loop control, nhưng mỗi LED vẫn có một nghĩa rõ ràng.

---

## L. Dashboard React

Dashboard đủ cho bài tập lớn, không cần nhiều màn hình:

1. **Header Twin:** `Garden_01 > Plant_01 > ESP32_01`, online/offline và `lastSeen`.
2. **Ba card realtime:** nhiệt độ, độ ẩm không khí, độ ẩm đất đã hiệu chuẩn; hiện `N/A` nếu field invalid.
3. **Badge trạng thái:** NORMAL/WARNING/CRITICAL/INVALID, cùng lý do rule.
4. **Trạng thái mô phỏng:** `OFF`, `PENDING`, `ACTIVE`, `FAILED`, `TIMEOUT`; không gọi là pump status.
5. **Chế độ:** AUTO/MANUAL. Trong AUTO, nút manual bị khóa hoặc yêu cầu chuyển mode rõ ràng.
6. **Charts:** temperature, air humidity, soil moisture theo thời gian; raw và smoothed có thể khác màu nếu đủ thời gian.
7. **Alarm list:** LOW_SOIL_MOISTURE, DEVICE_OFFLINE, INVALID_SENSOR_DATA, HIGH_TEMPERATURE (tùy chọn).
8. **Twin panel:** Asset, Device, firmware, sensor capabilities, sample interval, ngưỡng và `dryRaw/wetRaw`.

Luồng frontend:

```text
Mở trang -> REST lấy tree/state/history/alarm
          -> join WebSocket room của asset/device đang xem
          -> nhận delta telemetry/state/alarm/ack
Mất kết nối WebSocket -> kết nối lại -> REST refetch snapshot
```

Không cần polling telemetry liên tục. Không broadcast toàn bộ dữ liệu cho mọi client khi chỉ có một asset đang được xem.

---

## M. Roadmap triển khai

| Phase | Công việc | Đầu ra | Độ khó | Test chính |
|---|---|---|---|---|
| 1. ESP32 | Nối DHT11, LM393, LED; đọc Serial; xác minh mức điện áp; hiệu chuẩn AO nếu dùng | Sensor đọc được, LED test an toàn | ★★☆☆☆ | TC01, TC02, TC15 |
| 2. MQTT | Wi-Fi, Mosquitto, telemetry 5 giây/lần, reconnect cơ bản | Nhìn thấy JSON ở broker | ★★☆☆☆ | TC01, TC02 |
| 3. Backend | Một Node/Express subscribe MQTT, validation, MongoDB, REST latest, `lastSeen` | Telemetry hợp lệ lưu/query được | ★★★☆☆ | TC01, TC13, TC14 |
| 4. Frontend | React cards, REST, chart lịch sử cơ bản | Dashboard đọc state hiện tại | ★★★☆☆ | TC01, TC02 |
| 5. Realtime | WebSocket, timeout 20 giây, UI ONLINE/OFFLINE | UI tự cập nhật không refresh | ★★★☆☆ | TC06-TC08 |
| 6. Digital Twin | Seed Garden/Plant/Device, attributes và twin panel | Tree và trang Twin đơn giản | ★★☆☆☆ | TC16 |
| 7. Smart logic | Moving average, rule, alarm không trùng lặp, LED alert command | NORMAL/WARNING/CRITICAL rõ ràng | ★★★☆☆ | TC03-TC05, TC13-TC14 |
| 8. Control simulation | AUTO/MANUAL, commandId, ACK, LED xanh, timeout | Mô phỏng có xác nhận end-to-end | ★★★★☆ | TC09-TC12 |
| 9. Integration | Chạy toàn bộ test, sửa claim UI/tài liệu, luyện demo | Biên bản test và demo repeatable | ★★★★☆ | TC01-TC16 |
| 10. Docker | Compose Mosquitto, API, MongoDB, React; volume/env | Toàn bộ phần mềm khởi động được bằng Compose | ★★★☆☆ | TC17, TC18 |

Docker là phase cuối vì firmware/Wi-Fi/MQTT phải chạy ổn trước. Tuy vậy, không đợi đến sát ngày demo mới thử Compose.

---

## N. Test cases

| TC | Tình huống | Kết quả mong đợi |
|---|---|---|
| TC01 | DHT11 gửi dữ liệu bình thường | MQTT nhận telemetry valid, MongoDB lưu, Dashboard hiển thị. |
| TC02 | LM393 AO đã hiệu chuẩn có soil bình thường | Giá trị 0-100 tương đối, state NORMAL khi `>= 60`. |
| TC03 | Ba mẫu hợp lệ liên tiếp trong 40-59 | State WARNING, LED vàng bật, Alarm warning mở/cập nhật. |
| TC04 | Ba mẫu hợp lệ liên tiếp `< 40` | State CRITICAL, LED đỏ bật; AUTO được phép yêu cầu simulation ON. |
| TC05 | State giữ CRITICAL qua nhiều telemetry | Chỉ có một Alarm OPEN, không tạo bản ghi lặp. |
| TC06 | Có telemetry mới | Dashboard/chart cập nhật qua WebSocket, không refresh. |
| TC07 | Tắt ESP32/Wi-Fi | Không còn `lastSeen` mới. |
| TC08 | Quá 20 giây không có telemetry/state | Device OFFLINE, Dashboard và Alarm phản ánh đúng. |
| TC09 | User MANUAL nhấn bật mô phỏng | UI PENDING, command có commandId và MQTT publish. |
| TC10 | ESP32 nhận command hợp lệ | LED xanh bật, ACK `EXECUTED` cùng commandId. |
| TC11 | ACK đến backend | Device state đổi active, UI mới hiển thị Simulation Active. |
| TC12 | ACK mất/ESP32 không nhận command | Sau 10 giây command TIMEOUT, UI không hiển thị ACTIVE. |
| TC13 | Payload thiếu field, NaN, sai type hoặc ngoài range | Telemetry invalid; không vào smoothing/rule. |
| TC14 | Sensor invalid trong AUTO | Không gửi ON mô phỏng mới; trạng thái/Alarm INVALID rõ ràng. |
| TC15 | LED wiring/LM393 electrical precheck | Không dùng GPIO với LED trần hay input vượt 3.3 V; nếu chưa xác minh, dừng phần LED/AO thay vì đoán. |
| TC16 | API Twin | `Garden_01 -> Plant_01 -> ESP32_01` render đúng, attributes/state khớp DB. |
| TC17 | MQTT command duplicate QoS 1 | Cùng commandId không chạy LED lần hai; ACK/state nhất quán. |
| TC18 | Restart Docker Compose | Mongo volume giữ dữ liệu; ESP32 kết nối bằng IP LAN broker, không dùng `localhost`. |

Trường hợp chỉ có LM393 `DO`: thay TC02-TC04 bằng `DRY/WET`; báo cáo phải nói rõ đây là giới hạn của data hiện có, không giả lập phần trăm.

---

## O. Kịch bản demo cuối kỳ, 5-10 phút

1. **0-1 phút:** Mở sơ đồ kiến trúc và giới thiệu đúng phạm vi: LED là actuator simulation, không phải máy bơm.
2. **1-2 phút:** Khởi động ESP32; dashboard hiển thị `ONLINE`, temperature, air humidity, soil moisture/soil state.
3. **2-4 phút:** Tác động sensor đất để dashboard chuyển `NORMAL -> WARNING -> CRITICAL`; LED vàng/đỏ và Alarm phản ánh mức mới.
4. **4-5 phút:** Mở Asset tree và Twin panel `Garden_01 -> Plant_01 -> ESP32_01`; mở chart telemetry lịch sử.
5. **5-7 phút:** Chuyển MANUAL, nhấn `Kích hoạt mô phỏng tưới`; UI là PENDING trước, sau MQTT ACK LED xanh sáng và UI thành ACTIVE.
6. **7-8 phút:** Chuyển AUTO, đưa soil xuống CRITICAL để backend tự kích hoạt **mô phỏng**; LED đỏ + xanh có ý nghĩa đã quy ước.
7. **8-9 phút:** Tắt Wi-Fi/ESP32, chờ timeout để dashboard chuyển OFFLINE.
8. **9-10 phút:** Nếu đủ thời gian, chạy/trình bày Docker Compose cho Mosquitto, API, MongoDB và React.

Giảng viên sẽ nhìn thấy trọn vẹn: `Sensor -> IoT -> Backend -> Digital Twin -> Dashboard -> Rule -> Command -> LED -> ACK`.

---

## P. Phân chia phạm vi

| MVP phải hoàn thành | Hoàn thiện khi MVP ổn định | Future Work, không thuộc bản hiện tại |
|---|---|---|
| ESP32 + DHT11 + LM393 + LED | Asset tree/Twin panel đầy đủ | Relay, bơm nước thật |
| MQTT telemetry, Node/Express, MongoDB | WebSocket, online/offline, charts lịch sử | Flow sensor, water-level sensor, đo lít nước |
| Validation, NORMAL/WARNING/CRITICAL | Alarm lifecycle, smoothing/hysteresis | Nhiều vườn/cây, Relation tổng quát |
| Dashboard cơ bản qua REST | AUTO/MANUAL simulation, ACK, Docker Compose | Weather API, mobile app, AI/ML |

MVP nên hoàn thành chuỗi telemetry trước. Không để Digital Twin động, auto mode hoặc Docker ngăn nhóm có một demo sensor-to-dashboard chạy được.

---

## Q. Đánh giá độ khó

| Thành phần | Độ khó |
|---|---|
| Đọc DHT11/LM393/LED | ★★☆☆☆ |
| Hiệu chuẩn LM393 AO | ★★★☆☆ |
| MQTT ESP32 | ★★☆☆☆ |
| Node.js + MongoDB | ★★★☆☆ |
| React dashboard/chart | ★★★☆☆ |
| WebSocket + online/offline | ★★★☆☆ |
| Digital Twin tối thiểu | ★★★☆☆ |
| Rule, smoothing, alarm | ★★★☆☆ |
| Command/ACK/state synchronization | ★★★★☆ |
| Docker Compose | ★★★☆☆ |
| Tích hợp và demo end-to-end | ★★★★☆ |

Độ khó tổng thể là **★★★☆☆** và phù hợp nhóm sinh viên. Hai phần dễ mất thời gian nhất là hiệu chuẩn LM393 và đồng bộ trạng thái `PENDING -> ACK -> EXECUTED` giữa React, backend, MQTT và ESP32.

---

## R. Kết luận

Phạm vi sau cải thiện phù hợp rõ ràng với bài tập lớn: sinh viên có thể tự lắp, tự code, tự debug và tự demo một vòng IoT hoàn chỉnh mà không phải mua thêm thiết bị hay gánh kiến trúc doanh nghiệp.

Ba quyết định cần chốt trước khi code:

1. Đổi tên/mô tả thành **giám sát + mô phỏng điều khiển tưới**, loại mọi tuyên bố về bơm, lít nước hoặc an toàn vận hành thực.
2. Chốt một stack: `ESP32 -> Mosquitto -> Node.js/Express -> MongoDB -> WebSocket -> React`; không Python/FastAPI/Java/ThingsBoard runtime.
3. Xác nhận wiring an toàn của LED và LM393; nếu LM393 chỉ có DO hoặc không an toàn điện áp, hạ phạm vi dữ liệu xuống `DRY/WET` thay vì tạo số phần trăm giả.

Khi ba quyết định này được giữ, đề tài có cấu trúc kỹ thuật tốt, demo trực quan và đủ chất liệu học thuật về Embedded, MQTT, backend, database, Digital Twin, realtime, rule-based automation và Docker cơ bản.
