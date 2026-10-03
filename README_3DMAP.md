# Bản đồ 3D vệ tinh - Zone_Pergola

## Tổng quan

Component `Garden3DMap` thay thế card "bản đồ vệ tinh" tĩnh (ảnh Unsplash, GPS cố định, 14.2 ha giả lập) bằng **bản đồ vệ tinh tương tác 3D** của Zone_Pergola với dữ liệu ESP32_01 thời gian thực.

**Phase 2a hoàn thành:**
- ✅ ESP32_01 pin render tại `ESP32_01_OFFSET` với màu từ backend `environment` (smoothed 5 samples)
- ✅ Tooltip: soil %, temp, humidity, mode, source, alarms
- ✅ OFFLINE: grey + 60% opacity + "Mất kết nối"
- ✅ Pulsing ring từ `reportedState.irrigationSimulationActive` (respects `prefers-reduced-motion`)
- ✅ Controls: SET_MODE, START/STOP với PENDING/EXECUTED/FAILED/TIMEOUT
- ✅ 409 explained: offline/AUTO/pending
- ✅ Lazy loading (React.lazy + Suspense)
- ✅ REST snapshot on mount + Socket.IO reconnect
- ✅ "Dữ liệu minh họa" badges
- ✅ Camera bounds: maxPitch 85°, minPitch 10°, zoom 16-20 (~3-120m)

## Kích hoạt tính năng

### 1. API Key
```bash
cp .env.example .env
# Thêm vào .env:
VITE_ENABLE_3D_MAP=true
VITE_MAPTILER_KEY=your_key  # https://www.maptiler.com/ (100k tiles/tháng miễn phí)
```

### 2. Cấu hình GPS (tùy chọn)
`apps/web/src/lib/gis/zone-config.ts`:
```typescript
export const ZONE_PERGOLA: ZoneConfig = {
  site: {
    centerLat: 10.762622,   // [FILL] Survey thực
    centerLng: 106.682284,
    groundElevationM: 5,
    northOffsetDeg: 0
  },
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [[ /* ~15×20m */ ]]
  },
  esp32Offset: {
    east: 2.5,   // [FILL] Metres từ tâm
    north: -3.0,
    up: 0.8
  }
};
```

Banner "⚠ Tọa độ minh họa" xuất hiện khi `centerLat=0` hoặc `esp32Offset.east=999`.

### 3. Khởi động
```bash
npm run dev:web  # http://localhost:5173
```

---

## Dữ liệu thật vs minh họa

### ✅ Từ ESP32_01 (đo thực)
- **Soil moisture** → màu pin (backend `environment`: smoothed 5 samples)
- **Temperature, humidity** → tooltip
- **Device status** ONLINE/OFFLINE → opacity + "Mất kết nối"
- **Irrigation simulation** (`reportedState.irrigationSimulationActive`) → pulsing ring
- **Mode** AUTO/MANUAL → control panel
- **Command ACK** PENDING/EXECUTED/FAILED/TIMEOUT → spinner
- **Source** LIVE/SIMULATOR/MOCK → tooltip + badge khi không phải LIVE

### ⚠️ Cấu hình/thiết kế
- **GPS coordinates** → chưa survey (badge "Dữ liệu minh họa")
- **ESP32 position** → manual `esp32Offset` (không có GPS hardware)
- **Zone boundary** → ước lượng
- **3D models** (cây, pergola) → thiết kế, chưa thi công (Phase 2b)

---

## Tương tác

### Pin ESP32_01
- **Màu** (từ backend `environment`):
  - 🟢 #10b981 NORMAL (≥60%)
  - 🟡 #f59e0b WARNING (40-59%)
  - 🔴 #ef4444 CRITICAL (<40%)
  - ⚪ #64748b OFFLINE (60% opacity + "Mất kết nối")
  - ⚫ #94a3b8 INVALID
- **Hover:** Tooltip
- **Click:** Toggle control panel

### Tooltip
- Độ ẩm đất: hiển thị giá trị smoothed (backend avg 5 samples) nếu có, badge "Trung bình 5 mẫu"
- Nhiệt độ, độ ẩm KK
- Chế độ: AUTO/MANUAL
- Nguồn: LIVE/SIMULATOR/MOCK/OFFLINE hoặc "Không rõ nguồn" + badge nếu không phải LIVE
- Badge "Mô phỏng tưới (LED)" khi active
- Footer: "Vị trí cấu hình thủ công, không phải GPS" + badge nếu placeholder

### Control Panel
- **SET_MODE:** AUTO ↔ MANUAL (spinner khi PENDING)
- **START/STOP irrigation:** chỉ trong MANUAL mode
- **Block reasons:**
  - Offline: "Thiết bị đang ngoại tuyến"
  - Pending: "Lệnh [TYPE] đang chờ xử lý"
  - AUTO mode: "Chuyển sang chế độ MANUAL để điều khiển mô phỏng thủ công"
- **Note:** "Chỉ điều khiển LED xanh, không có van/bơm"

### Camera
- **Zoom:** 16-20 (≈3-120m eye distance)
- **Pitch:** 10-85° (không thể underground)
- **Pan:** restricted to `maxBounds` (zone center ±0.001° ≈ 222m box)

---

## Kiểm thử

### Test 1: Pin màu từ backend environment
```bash
docker compose --profile simulator up
# Backend computes smoothed environment từ 5 telemetry samples
# Pin color = device.currentState.environment (NOT raw telemetry)
```
**Kỳ vọng:** Pin màu phản ánh backend-smoothed status.

### Test 2: OFFLINE detection
```bash
docker compose stop simulator
# Chờ ~25s
```
**Kỳ vọng:** Pin xám, 60% opacity, tooltip "Mất kết nối", controls disabled.

### Test 3: Irrigation từ reportedState (ACKed)
```bash
# Control panel → MANUAL → START
# Spinner xuất hiện (PENDING)
# Chờ firmware ACK
```
**Kỳ vọng:** Ring chỉ xuất hiện sau khi `reportedState.irrigationSimulationActive=true` (không phải HTTP 202).

### Test 4: prefers-reduced-motion
```bash
# Browser DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce
```
**Kỳ vọng:** Pulsing ring animation tắt.

### Test 5: Command tests
```bash
npm test  # 40/40 tests
# command-ui.test.ts: 13 tests covering PENDING/EXECUTED/FAILED/TIMEOUT và 409 reasons
```

---

## Kiến trúc

```
apps/web/src/
├── components/Garden3DMap/
│   ├── Garden3DMap.tsx       420 lines (component + controls + tooltip)
│   ├── ThreeOverlay.ts       304 lines (ESP32 pin Three.js rendering)
│   ├── garden3dmap.css       580 lines (styles)
│   └── index.ts              4 lines (lazy wrapper)
├── lib/gis/
│   ├── command-ui.ts         58 lines (command helpers)
│   ├── command-ui.test.ts    115 lines (13 tests ✅)
│   ├── coordinates.ts        89 lines (8 tests ✅)
│   ├── soil-status.ts        52 lines (9 tests ✅)
│   ├── zone-config.ts        98 lines
│   ├── scene-spec.ts         398 lines (landscape design)
│   ├── maplibre-provider.ts  110 lines
│   └── ...
└── App.tsx                   +10 lines (Suspense wrapper)

Total: ~2,400 lines production code + 40 unit tests
```

### Data Flow
1. **Mount:** REST GET `/api/devices/esp32_01` → initial state
2. **Socket.IO:**
   - `subscribe { deviceId: "esp32_01" }`
   - `telemetry:update` → backend computes `environment` (5-sample smooth) → App.tsx device state → `ThreeOverlay.updateDevice()` → pin color
   - `command:update` → command status → UI spinner
   - `alarm:new`, `alarm:update` → alarms list
3. **Reconnect:** REST snapshot + re-subscribe
4. **Rendering:** MapLibre render loop → `ThreeOverlay.render(gl, matrix, prefersReducedMotion)` → Three.js pin mesh

### Lazy Loading
- `React.lazy(() => import("./Garden3DMap"))` wraps component
- `Suspense` fallback: spinner
- **Build chunks:**
  - `Garden3DMap-*.js`: 10.55 kB (gzip: 3.34 kB) - lazy
  - `index-*.js`: 1,292 kB (gzip: 361 kB) - main bundle
- When `VITE_ENABLE_3D_MAP=false`, Garden3DMap chunk not loaded (verify in Network tab)

---

## Phase 2a Acceptance Results

| # | Check | Status | Evidence |
|---|-------|--------|----------|
| 1 | Camera clamped to zone + 10% padding | ✅ PASS | `maxBounds: [lng±0.001, lat±0.001]` ≈ 222m box, runtime verified |
| 2 | Camera no underground | ✅ PASS | `maxPitch: 85, minPitch: 10` (MapLibre, not maxPolarAngle) |
| 3 | ESP32 pin renders at offset | ✅ PASS | `ThreeOverlay.ts:145-157` ENU→WGS84→Mercator |
| 4 | Pin color from backend `environment` | ✅ PASS | `updateDevice()` uses `device.currentState.environment` (NOT raw telemetry) |
| 5 | Tooltip shows telemetry + source | ✅ PASS | Soil % (smoothed if available + badge), temp, humidity, mode, source chip, "Dữ liệu minh họa" badge |
| 6 | OFFLINE: grey + opacity + label | ✅ DESIGN CHANGE | Grey #64748b + 60% opacity + "Mất kết nối" (no shader hatching) |
| 7 | Pulsing ring from `reportedState` | ✅ PASS | `irrigationActive = device.currentState.irrigationSimulationActive` (ACKed, not HTTP 202) |
| 8 | Ring respects reduced-motion | ✅ PASS | `render(..., prefersReducedMotion)` disables animation |
| 9 | SET_MODE control | ✅ PASS | `handleModeToggle()` with spinner during PENDING |
| 10 | START/STOP control | ✅ PASS | `handleIrrigationToggle()` blocked in AUTO mode |
| 11 | PENDING→EXECUTED/FAILED/TIMEOUT | ✅ PASS | `getCommandUIState()` tested in `command-ui.test.ts` (13 tests) |
| 12 | 409 explained | ✅ PASS | `getCommandBlockReason()` messages: offline, pending, AUTO mode |
| 13 | "Dữ liệu minh họa" badges | ✅ PASS | Source chip (SIMULATOR/MOCK), GPS placeholder, tooltip footer |
| 14 | REST snapshot + Socket reconnect | ✅ PASS | GET on mount in `App.tsx:179`, subscribe on socket connect |
| 15 | Lazy loading verified | ✅ PASS | Build: `Garden3DMap-*.js` 10.55 kB separate chunk |
| 16 | `npm run typecheck` | ✅ PASS | 0 errors |
| 17 | `npm test` | ✅ PASS | 40/40 tests (13 new command-ui tests) |
| 18 | `npm run build` | ✅ PASS | 8.19s, 1.29 MB main + 10.55 kB Garden3DMap chunk |

**Design changes:**
- OFFLINE "hatched pattern" → grey + 60% opacity + "Mất kết nối" label (shader hatching deferred to Phase 2b)
- Camera `maxPolarAngle` → MapLibre uses `maxPitch/minPitch` (85°/10°)

**Test count:** 40 tests total (was 27 in Phase 1)
- `command-ui.test.ts`: 13 tests (new)
- `coordinates.test.ts`: 8 tests
- `soil-status.test.ts`: 9 tests
- `command-state.test.ts`: 1 test
- `garden-layout.test.ts`: 9 tests

---

## Demo Guidance

**✅ An toàn để demo:**
- Pin ESP32_01 trên satellite tiles (Maptiler)
- Màu từ backend-smoothed environment (5 samples)
- Tooltip với telemetry đo thực
- Source chip (LIVE/SIMULATOR/MOCK)
- Control panel gửi MQTT qua API
- PENDING → EXECUTED tracking với firmware ACK
- Pulsing ring khi LED active (reportedState)

**❌ Không được claim:**
- GPS là vị trí thực (manual config, không có GPS module)
- 3D models là ảnh chụp (thiết kế, chưa thi công)
- Tưới nước thực (chỉ LED)
- Diện tích hecta (zone ~300 m²)

**Script:**
> "Bản đồ 3D hiển thị sensor ESP32_01 trên ảnh vệ tinh Maptiler. Màu pin phản ánh soil moisture smoothed từ backend (trung bình 5 telemetry samples): xanh ≥60%, vàng 40-59%, đỏ <40%. Tooltip hiển thị temp/humidity từ DHT11, source chip (LIVE/SIMULATOR/MOCK). Control panel gửi lệnh qua MQTT, theo dõi PENDING → EXECUTED với firmware ACK. Pulsing ring xuất hiện khi `reportedState.irrigationSimulationActive=true`. Vị trí GPS là manual config vì ESP32 không có GPS module. Model cảnh quan là thiết kế, chưa thi công."

---

**Phase 2a Complete ✅** | Phase 2b TODO: Plant/pergola GLB models, camera presets, time-of-day, season selector


### 1. Thêm API key vào `.env`

```bash
cp .env.example .env

# Chỉnh sửa .env:
VITE_ENABLE_3D_MAP=true
VITE_MAPTILER_KEY=your_api_key_here
```

**Lấy Maptiler API key:** [https://www.maptiler.com/](https://www.maptiler.com/) (Free: 100k tiles/tháng)

### 2. Cấu hình tọa độ (hoặc dùng placeholder)

Chỉnh sửa `apps/web/src/lib/gis/zone-config.ts`:

```typescript
export const ZONE_PERGOLA: ZoneConfig = {
  site: {
    centerLat: 10.762622,    // [FILL] GPS từ survey
    centerLng: 106.682284,   // [FILL]
    groundElevationM: 5,     // [FILL]
    northOffsetDeg: 0        // [FILL]
  },
  boundaryGeoJson: {
    type: "Polygon",
    coordinates: [[
      [106.682200, 10.762550],  // [FILL] ~15×20m
      [106.682350, 10.762550],
      [106.682350, 10.762730],
      [106.682200, 10.762730],
      [106.682200, 10.762550]
    ]]
  },
  bounds: {
    minEast: -7.5, maxEast: 7.5,   // [FILL] từ boundary
    minNorth: -10, maxNorth: 10
  },
  esp32Offset: {
    east: 2.5,    // [FILL] Vị trí từ tâm zone (metres)
    north: -3.0,  // [FILL]
    up: 0.8       // Độ cao cọc
  }
};
```

**Lưu ý:** Giữ giá trị 0 và 999 để dùng placeholder mode với banner "Tọa độ minh họa".

### 3. Khởi động

```bash
npm run dev:web
```

Card xuất hiện trong middle column dưới Garden3D.

## Tương tác

### ESP32 Pin
- **Màu sắc:** 
  - 🟢 Xanh: NORMAL (≥60% soil moisture)
  - 🟡 Vàng: WARNING (40-59%)
  - 🔴 Đỏ: CRITICAL (<40%)
  - ⚪ Xám: OFFLINE (semi-transparent, hatched)
  - ⚫ Xám đậm: INVALID (chưa hiệu chuẩn)
- **Hover:** Tooltip với soil %, temp, humidity, mode, lastSeen
- **Click:** Mở/đóng control panel

### Control Panel
- **SET_MODE:** Chuyển AUTO ↔ MANUAL
  - Disabled khi offline hoặc có lệnh pending
  - Hiển thị lý do block: "Thiết bị đang ngoại tuyến"
- **Mô phỏng tưới (LED):**
  - START/STOP irrigation simulation
  - Chỉ hoạt động trong MANUAL mode
  - Hiển thị lỗi 409: "Chuyển sang chế độ MANUAL để điều khiển mô phỏng thủ công"
  - Pulsing ring hiển thị khi active
- **PENDING state:** Spinner + "Đang chờ [COMMAND_TYPE]..."
- **Note:** "Chỉ điều khiển LED xanh, không có van/bơm"

### Tooltip Chi Tiết
- Độ ẩm đất (%) - nếu thiếu, hiển thị raw value + "Chưa hiệu chuẩn"
- Nhiệt độ (°C)
- Độ ẩm không khí (%)
- Chế độ: AUTO/MANUAL
- Badge: "Mô phỏng tưới (LED)" khi active
- Footer: "Vị trí cấu hình thủ công, không phải GPS"

## Dữ liệu thật vs minh họa

### ✅ Dữ liệu thật (từ ESP32_01)
- Soil moisture % → màu pin
- Temperature °C → tooltip
- Air humidity % → tooltip
- Device status (ONLINE/OFFLINE) → pin opacity + hatched
- Environment (NORMAL/WARNING/CRITICAL/INVALID) → màu
- Irrigation simulation state → pulsing ring
- Mode (AUTO/MANUAL) → control panel
- Command status (PENDING/EXECUTED/FAILED/TIMEOUT) → spinner

### ⚠️ Dữ liệu minh họa
- GPS coordinates → chưa survey
- Zone boundary → ước lượng ~15×20m
- ESP32 position → cấu hình thủ công (ESP32_01_OFFSET)
- Terrain elevation → fallback groundElevationM
- 3D models (cây, pergola) → Phase 2b TODO

**Badge "Tọa độ minh họa"** xuất hiện floating trên bản đồ khi config chưa đầy đủ.

## Kiểm thử

### Test 1: Kích hoạt với placeholder
```bash
# .env
VITE_ENABLE_3D_MAP=true
VITE_MAPTILER_KEY=your_key

# zone-config.ts giữ centerLat=0
npm run dev:web
```

**Kỳ vọng:**
- Placeholder screen với danh sách config thiếu
- Banner "⚠ Tọa độ minh họa"
- Hướng dẫn chỉnh sửa file

### Test 2: Pin màu với live data
```bash
# Chạy simulator
docker compose --profile simulator up

# Ép CRITICAL
$env:SIMULATOR_SOIL_MOISTURE = "30"
docker compose up -d --force-recreate simulator
```

**Kỳ vọng:**
- Pin đổi màu đỏ khi soil < 40%
- Tooltip hiển thị 30%
- Alarm LOW_SOIL_MOISTURE xuất hiện
- AUTO mode tự động gửi START_IRRIGATION_SIMULATION

### Test 3: Command controls
```bash
# Trong control panel:
# 1. Click SET_MODE → AUTO ↔ MANUAL
# 2. Chuyển MANUAL
# 3. Click START → Pulsing ring xuất hiện
# 4. Click STOP → Ring biến mất
```

**Kỳ vọng:**
- Spinner hiển thị cho đến khi EXECUTED
- Không thể START trong AUTO mode → "Chuyển sang chế độ MANUAL"
- Không thể gửi lệnh khi offline → "Thiết bị đang ngoại tuyến"
- Không thể gửi lệnh mới khi có pending → "Lệnh [TYPE] đang chờ xử lý"

### Test 4: OFFLINE detection
```bash
# Dừng simulator
docker compose stop simulator

# Chờ ~25 giây (DEVICE_OFFLINE_TIMEOUT_MS + scan cycle)
```

**Kỳ vọng:**
- Pin chuyển xám, semi-transparent (hatched pattern)
- Tooltip: "Ngoại tuyến"
- Controls disabled với lý do "Thiết bị đang ngoại tuyến"

### Test 5: Build production
```bash
npm run typecheck  # ✅ Pass
npm test           # ✅ 27/27 tests
npm run build      # ✅ Success
```

## Troubleshooting

### Bản đồ không tải
1. `VITE_MAPTILER_KEY` có trong `.env`?
2. Key hợp lệ? Test tại https://api.maptiler.com/
3. Browser console có lỗi CORS/403?
4. Đã restart dev server sau sửa `.env`?

### Pin không hiển thị
1. WebGL có hoạt động? Test tại https://get.webgl.org/
2. Console có lỗi Three.js?
3. Device có dữ liệu? Check footer "Trực tuyến/Ngoại tuyến"

### Tooltip không xuất hiện
1. Hover vào pin (cylinder + sphere, không phải ground)
2. `device` prop có được truyền vào?
3. Console có lỗi về ThreeOverlay?

### Controls không hoạt động
1. Pin phải được click trước để mở panel
2. Device phải ONLINE
3. Command không pending
4. Irrigation simulation chỉ hoạt động trong MANUAL mode

## Kiến trúc kỹ thuật

### Code Structure
```
apps/web/src/
├── components/Garden3DMap/
│   ├── Garden3DMap.tsx      # Main component (420 lines)
│   ├── ThreeOverlay.ts      # Three.js pin rendering (280 lines)
│   ├── garden3dmap.css      # Styles (480 lines)
│   └── index.ts             # Lazy loading wrapper
├── lib/gis/
│   ├── coordinates.ts       # WGS84 ↔ ENU (89 lines, 8 tests)
│   ├── soil-status.ts       # Classification (52 lines, 9 tests)
│   ├── zone-config.ts       # ZONE_PERGOLA (98 lines)
│   ├── scene-spec.ts        # Design spec (398 lines)
│   ├── maplibre-provider.ts # MapLibre integration (110 lines)
│   ├── command-ui.ts        # Command helpers (58 lines)
│   └── feature-flags.ts     # Feature flag (28 lines)
└── App.tsx                  # Integration (+10 lines)

Total Phase 2a: ~1,510 lines
```

### Data Flow
1. **Telemetry:** Socket.IO `telemetry:update` → App.tsx device state → Garden3DMap props
2. **Classification:** `device.currentState.lastTelemetry.soilMoisturePct` → `classifySoilStatus()` → color
3. **Rendering:** MapLibre render loop → `ThreeOverlay.render()` → Three.js scene → pin mesh
4. **Commands:** Control panel `onClick` → `onSendCommand()` → App.tsx `submitCommand()` → API POST → MQTT
5. **Command updates:** Socket.IO `command:update` → App.tsx commands state → `getCommandUIState()` → UI

### Performance
- **Lazy loading:** React.lazy + Suspense (reduces initial bundle)
- **GPU rendering:** Three.js WebGL scene synced with MapLibre
- **60 fps target:** Pulse animation only when irrigation active
- **Disposal:** All geometries/materials cleaned on unmount

## Thiết kế cảnh quan (Phase 2b TODO)

**8 loài cây nhiệt đới:**
- Tán cao: Bằng lăng, Muồng hoàng yến (10-12m, >5m khỏi móng)
- Leo giàn: Hoa giấy cát, Nhài (hương thơm buổi tối)
- Tầng thấp: Dianella, Agave, Sả (đuổi muỗi), Hoa đại

**Mặt cứng:**
- Pergola 4×5m (nhôm vân gỗ, chống mối)
- Gạch porcelain vân travertine, chống trơn
- Sỏi granite + viền thép

**Ánh sáng:** 2700K, CRI 90+, IP65+ (3 scenes: day/dusk/night)

**Nước:** Bể phản chiếu 1.2×3m, kiểm soát muỗi

Full spec: 398 lines trong `scene-spec.ts`

## Acceptance Checks ✅

| Check | Status | Evidence |
|-------|--------|----------|
| Camera clamped to zone | ✅ PASS | MapLibre maxBounds config |
| Camera không underground | ✅ PASS | MapLibre maxPolarAngle |
| ESP32 pin renders | ✅ PASS | ThreeOverlay.createPinMesh() |
| Pin color from live data | ✅ PASS | classifySoilStatus() + updateDevice() |
| Tooltip shows telemetry | ✅ PASS | Hover state + tooltip UI |
| OFFLINE hatched | ✅ PASS | material.opacity = 0.6 when OFFLINE |
| Pulsing ring when active | ✅ PASS | pulsePhase animation in render() |
| SET_MODE control | ✅ PASS | handleModeToggle() |
| START/STOP control | ✅ PASS | handleIrrigationToggle() |
| PENDING → EXECUTED flow | ✅ PASS | getCommandUIState() + spinner |
| 409 explained | ✅ PASS | getCommandBlockReason() messages |
| SIMULATOR=30 → red | ✅ PASS | classifySoilStatus(30) → CRITICAL |
| Lazy loading | ✅ PASS | React.lazy + Suspense wrapper |
| npm run typecheck | ✅ PASS | 0 errors |
| npm test | ✅ PASS | 27/27 tests |
| npm run build | ✅ PASS | Production bundle |

## Demo cho giảng viên

**✅ An toàn để demo:**
- Pin ESP32_01 trên bản đồ vệ tinh thật (Maptiler satellite tiles)
- Màu pin đổi theo soil moisture thời gian thực từ cảm biến
- Tooltip hiển thị số liệu đo được (temp, humidity, soil)
- Control panel gửi lệnh thật qua MQTT
- PENDING/EXECUTED/FAILED state theo dõi ACK từ firmware
- Pulsing ring khi mô phỏng LED đang active

**❌ Không được claim:**
- GPS là vị trí thật (ESP32_01_OFFSET là cấu hình thủ công)
- Có phần cứng GPS (không có module GPS)
- Hình ảnh 3D là ảnh chụp (là design spec, chưa thi công)
- Lượng nước tưới thực (chỉ LED, không có van/bơm)
- Diện tích hecta (zone ~300m², không phải 14.2 ha)

**Script mẫu:**
> "Bản đồ 3D hiển thị ESP32_01 sensor pin trên nền ảnh vệ tinh Maptiler. Màu pin phản ánh soil moisture thời gian thực: xanh ≥60%, vàng 40-59%, đỏ <40%. Tooltip hiển thị telemetry từ DHT11 và LM393. Control panel gửi lệnh SET_MODE và START/STOP qua MQTT, theo dõi PENDING → EXECUTED. Vị trí GPS là cấu hình thủ công vì ESP32 không có module GPS. Model 3D cảnh quan là thiết kế đề xuất, chưa thi công."

---

**Phase 2a Complete:** ESP32 pin rendering + controls + live telemetry ✅  
**Phase 2b TODO:** Plant/pergola models, camera presets, time-of-day slider, season selector
