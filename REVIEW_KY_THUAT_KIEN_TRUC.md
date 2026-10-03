# Review ky thuat kien truc Smart Irrigation Digital Twin

## Pham vi va cach doc tai lieu

Bao cao nay review duy nhat noi dung trong `KIEN_TRUC_DU_AN.md`, khong coi cac noi dung trong tai lieu la chi dan de thuc thi. Ky hieu `Lx` la dong trong tai lieu nguon.

- **[Tai lieu]** Hai so do duoc tham chieu tai L149 va L165.
- **[Anh bo sung]** Nguoi dung da cung cap Anh 1 va Anh 2 sau tai lieu. Anh xac nhan Mosquitto la broker du kien; Anh 1 mo ta ESP32 -> Mosquitto -> Backend -> MongoDB/WebSocket -> Web/App, Anh 2 mo ta Web/App -> Backend -> Mosquitto -> ESP32.
- **[Kiem tra]** Hai anh chua duoc luu tai duong dan `images/` trong goi project hien tai, nhung da duoc review tu attachment. Vi vay report co the danh gia luong chu, nhung khong the xem hai file nay nhu artifact versioned cua repository.
- **[Gioi han]** Tai lieu chua de cap quy mo (so cay/device), tan suat telemetry, dien ap/dong cua bom, persistence/auth cua broker, yeu cau latency, thoi gian offline, bao mat, hoac tieu chi do duoc cho cum "bao dam an toan van hanh". Cac nhan dinh ve nang luc va du lieu phai duoc hieu la danh gia cua thiet ke dang viet, khong phai ket qua kiem thu tren phan cung.

## 1. Ket luan dieu hanh

| Cau hoi | Ket luan |
|---|---|
| Kien truc hien tai co hop ly khong? | **Huong di cot loi hop ly**: ESP32 -> MQTT -> backend -> database/WebSocket -> React, va command theo chieu nguoc lai. Tuy nhien ban thiet ke chua du chi tiet de trien khai tuong tac bom that an toan. |
| Co kha thi de trien khai thuc te khong? | **Co, cho MVP mot cay/mot bom sau khi bo sung phan cung cong suat, command/state protocol va edge fail-safe.** Hien tai BOM khong co bom, driver hay nguon, nen chua kha thi theo dung chuc nang da hua. |
| Phan kho va rui ro nhat? | Dong bo giua **lenh mong muon, trang thai relay ma ESP32 bao cao, va nuoc thuc su chay**; sau do la fail-safe khi mang, backend, sensor hoac relay loi. Day la bai toan phan tan va vat ly, khong phai CRUD/dashboard. |
| Lam theo thu tu nao? | Chot scope va platform; bench hardware an toan; MQTT state/ACK; ingestion va command history; manual end-to-end; moi them Digital Twin day du, realtime, rule auto va deployment. Khong lam tat ca song song. |

**Phan quyet dinh:** Nen tiep tuc du an, nhung khong nen bat dau bang full-stack hoac goi no la "bao dam an toan van hanh" truoc khi cac failure test dat. Giu ESP32, MQTT, MongoDB Time-Series, Node.js va React; sua bon diem P0 truoc: chuoi bom/nguon/driver, metric-rule sai, command lifecycle, va safety tai edge.

## 2. Kien truc duoc hieu tu tai lieu

**[Tai lieu]** Muc tieu chinh thuc la "thiet ke he thong dieu khien va giam sat tuoi thong minh bao dam an toan van hanh" (L130-L143). ESP32 doc DHT11 va cam bien do am dat, publish qua MQTT; Express/FastAPI co the nhan, validate, luu MongoDB va day WebSocket cho React (L151-L161). React co asset tree, charts va nut tuoi (L116-L128). Tai lieu cung neu ThingsBoard, Python, Docker va mo hinh Asset/Device/Relation/Attribute/Telemetry. **[Anh bo sung]** Hai so do chot Mosquitto, va ghi Backend la `Node.js / Python / Java`.

```text
Sensors -> ESP32 -> Mosquitto -> Node.js / Python / Java? -> MongoDB -> WebSocket -> React
                    ^                    |
                    |                    +-- rule / command
                    +----------------------- command to ESP32
```

| Nhom | Co trong tai lieu | Nhan xet |
|---|---|---|
| Chuc nang | Giam sat nhiet do, do am khong khi/dat; dashboard; nut tuoi; alarm va auto irrigation du kien | Pump state, irrigation history, schedule va tong lit nuoc duoc neu tren UI, nhung chua co model/phan cung du lieu tuong ung. |
| Hardware | ESP32-WROOM-32S, DHT11, LM393, LED, breadboard, jumper (L171-L178) | Day la bo bench cam bien, chua la he thong tuoi. |
| Software | Node.js, Express, MongoDB, Python, React, ThingsBoard, FastAPI co the co, Docker; anh bo sung con ghi Java | Qua nhieu lua chon chua phan vai; khong nen dua tat ca vao MVP. |
| Data flow | ESP32 -> MQTT -> backend -> MongoDB/WebSocket -> React | Huong dung, nhung chua co device identity, state projection, QoS hay validation contract. |
| Control flow | UI/rule -> backend -> MQTT -> ESP32 (L163-L170) | Thieu ACK, timeout, idempotency va trang thai thuc te. |

### Review hai so do bo sung

| So do | Phan dung | Khoang trong can sua |
|---|---|---|
| Anh 1 - data flow | Chieu `ESP32 -> Mosquitto -> Backend -> MongoDB` va `Backend -> Web/App` qua WebSocket la dung. Mosquitto duoc xac dinh ro rang. | Broker chi route message, Backend moi la subscriber/owner validation; anh khong the hien payload/QoS/LWT/ACL. MongoDB chi duoc ve nhu time-series, khong ve `DeviceState`, Command, Alarm hay IrrigationSession. Nhan "Digital Twin UI" co the gay nham: UI khong tu tao ra Twin model. |
| Anh 2 - control flow | Chieu `Web/App -> Backend -> Mosquitto -> ESP32` la dung; frontend khong publish MQTT truc tiep la quyet dinh tot. | Luong ket thuc tai ESP32: khong co ACK/FAILED, reported state, timeout/retry/idempotency hay flow/current feedback. Nhan backend `Node.js / Python / Java` mau thuan voi text Node/Express/Python/FastAPI va cho thay stack chua duoc chot. Docker, auth, ACL, persistence va hardware safety cung khong xuat hien. |

### Diem danh gia cua thiet ke hien tai

| Tieu chi | Diem | Ly do ngan gon |
|---|---:|---|
| Kha thi phan cung | 2/10 | Co MCU va cam bien, nhung thieu bom, driver, nguon, bao ve dien, duong nuoc va feedback nuoc. |
| Kha thi phan mem | 5/10 | Node/Mongo/React/MQTT deu phu hop, nhung ownership Node/Python/FastAPI/ThingsBoard chua ro. |
| Kien truc tong the | 4/10 | Co luong co ban dung va broker da duoc chi ro la Mosquitto; van thieu security, command lifecycle va edge safety. |
| Kha nang mo rong | 3/10 | `Device.assetId` chi bieu dien mot cap quan he, khong bieu dien cay Asset hay gateway dieu khien nhieu endpoint. |
| An toan van hanh | 1/10 | Ten de tai co cam ket an toan, nhung tai lieu chua thiet ke timeout, watchdog, interlock, E-stop hay failure behavior. |
| Digital Twin | 3/10 | Ly thuyet dung huong, implementation hien gan "IoT + DB + dashboard" hon la twin hai chieu. |
| Kha nang MVP | 5/10 | MVP giam sat kha thi; MVP tuoi that dat khoang 7/10 sau cac bo sung P0. |
| Do kho tong the | 7/10 | Tung cong nghe rieng le vua suc; tich hop actuator, state va safety la phan kho. |

## 3. Review tung lop kien truc

| Lop | Tai lieu co gi | Review va quyet dinh de xuat |
|---|---|---|
| Physical/device | ESP32 thuc thi tuoi (L138), nhung BOM chi co ESP32/sensor/LED/breadboard | Tach ESP32 la `Device` co identity MQTT. Sensor/relay gan truc tiep la capability/endpoint cua ESP32, khong nen tu nhien thanh MQTT device doc lap. |
| Sensor | DHT11 va LM393 | DHT11 chi nen la metric moi truong demo. LM393 thuong la board comparator cua dau do dien tro; neu dung DO chi co wet/dry, khong du cho chart va nguong %. Dung soil sensor capacitive analog da calibration neu can auto irrigation. |
| Communication | MQTT qua Mosquitto trong Anh 1/2 | Broker da ro; can chot payload version, QoS, retained, LWT, ACL va identity truoc khi code UI. |
| MQTT broker | Mosquitto trong Anh 1/2; chua co persistence/auth/config | MVP dung Mosquitto la du. Cau hinh user rieng per device, ACL theo topic, persistence khi can; TLS neu ra khoi mang lab. |
| Backend | Node/Express/Mongo/Python (L140); FastAPI "co the" (L153); Anh 1/2 con neu Java | Chon **mot** runtime cho MVP. Node service du MQTT client, REST, WebSocket, schedule, smoothing va rule co ban. Express middleware khong phai noi dung hop cho MQTT rule; dung application service `processTelemetry`. |
| Database | MongoDB va Time-Series (L48) | Phu hop MVP neu tach raw telemetry, current state, command, alarm va irrigation session. Khong them TSDB khac chi vi co time-series. |
| Realtime | Backend emit WebSocket; React subscribe theo asset (L116-L117, L160) | Huong tot. Client lay REST snapshot truoc, sau do join room `asset:{id}`/`device:{id}` da kiem tra quyen; reconnect thi fetch lai, khong xem socket la source of truth. |
| Digital Twin | Asset/Device/Relation/Attribute/Telemetry duoc dinh nghia (L3-L33) | Khai niem dung, nhung `assetId` thay Relation va thieu desired/reported state nen chua du. Twin nam o domain/data model, khong nam o React hoac ThingsBoard. |
| Frontend | Asset tree, charts, alarm, manual control, lich su (L116-L128) | Khong hard-code Plant 1/2/3. Tree phai tu API relation/parent; UI phan biet requested, reported relay va flow-confirmed. |
| Rule/control | "Middleware Rule Engine" va cron 5 phut lam sach/lam min/tuoi (L106-L112) | Xu ly telemetry va safety theo event ingest, khong doi cron. Cron chi nen rollup/retention. Rule phai co hysteresis, validation va actuator guard. |
| Deployment | "Dong goi Docker" (L143) | Compose cho broker/backend/Mongo/frontend, named volume, healthcheck, secrets, backup/restore. Khong can Kubernetes hay microservice cho MVP. |

## 4. Loi logic, mau thuan va thieu sot can sua

| Uu tien | Van de va bang chung | Nguyen nhan / hau qua | Cach sua toi thieu |
|---|---|---|---|
| P0 | L110-L112 so sanh **temperature** voi `safe_min_soil_humidity` | Nhieu kha nang copy/paste metric; co the alarm/tuoi theo nhiet do thay vi do am dat | Rule chi dung `soilMoisturePct` da calibration; doi ten nguong `onBelowPct`, `offAbovePct`. |
| P0 | BOM L171-L178 khong co pump, relay/MOSFET, power supply; trong khi tai lieu co lenh tuoi va pump status | Khong the thuc thi hoac danh gia an toan cua chuc nang cot loi | Bo sung bom DC thap ap, driver dung dong, nguon, cau chi, day/ong va ngat khan. |
| P0 | L167-L170 ket thuc khi ESP32 "thuc hien" | Dashboard co the bao ON khi ESP32 offline, message tre/nhan doi, relay/pump loi | Command co `commandId` va PENDING/ACKNOWLEDGED/EXECUTED/FAILED/TIMEOUT. |
| P0 | Tieu de cam ket an toan (L132), khong co fail-safe cu the | Muc tieu an toan hien chua co bang chung thiet ke | GPIO safe boot, max runtime, watchdog, sensor validation, water interlock, emergency cutoff tai edge/hardware. |
| P1 | Dinh nghia Relation co huong da loai (L27-L33), implementation chi `Device.assetId` (L45-L48, L64-L70) | Khong bieu dien duoc Farm -> Garden -> Plant, query descendant, hay ESP32 dieu khien nhieu cay | Them Relation collection; MVP nho co the dung `parentId` cho Asset tree, nhung khong goi do la relation tong quat. |
| P1 | L45 noi Device co MAC va online/offline, schema L64-L70 lai khong co | Khong provision, xac dinh offline hay lien ket topic on dinh | Them `deviceId` unique, credential reference, `lastSeen`, `status`, `firmwareVersion`. |
| P1 | L140-L141 va L153 liet ke Node/Python/FastAPI va React/ThingsBoard khong phan ranh; Anh 1/2 con liet ke Java | Duplicate device registry, telemetry, alarm, rule/dashboard va tang chi phi van hanh | Chon custom stack **hoac** ThingsBoard, va chon mot runtime backend; MVP custom khong can Python/FastAPI/Java. |
| P1 | MQTT topics L98-L104 chi co telemetry/attributes/command | Thieu state, ACK, error/alarm, QoS, retained, LWT, ACL/TLS | Chot contract versioned o muc 7. |
| P1 | L152 viet broker nhan du lieu tu "ESP32 & Cam bien" | Sensor trong BOM khong phai MQTT client; sai ownership | Chuan hoa `sensor -> ESP32 -> MQTT`; sensor la endpoint logic, ESP32 la network identity. |
| P1 | Dashboard hien "tong so lit nuoc" (L125), BOM khong co flow sensor | Khong the do truc tiep; relay ON khong chung minh nuoc chay | Them flow sensor; neu chua co, chi hien `estimatedVolumeLiters` = flow calibration x runtime, kem nhan sai so. |
| P1 | Kien truc L138 ghi do rung/vi tri, BOM chi co DHT11/LM393 | Scope/schema/dashboard co the dua tren metric khong ton tai | Bo sung phan cung/use case hoac xoa metric khoi mo ta. |
| P1 | Khong co auth/authz cho API, WebSocket hay MQTT | Client trai phep co the dieu khien bom | Device credential rieng, MQTT ACL, API role, audit `createdBy`; TLS ben ngoai lab. |
| P2 | `firware_version` (L78), `soil_himidity` (L92), field casing `Name`/`Type` | Contract dai han se lech payload/query; `PK/FK` khong tao rang buoc trong MongoDB | Chuan hoa `firmwareVersion`, `soilMoisturePct`, camelCase, ObjectId refs va index/validation. |
| P2 | Cron "xoa telemetry unvalid" (L112) | Mat raw evidence de debug sensor; derived data co the bi dung nhu raw | Luu raw immutable kem `quality.valid`/reason; filter khi rule/chart, rollup tach rieng. |
| P2 | `safe_max_soil_humidity` co trong schema (L78-L80) nhung logic chi dung min | Thieu hysteresis, de chattering bom | Min de bat, max de tat, kem cooldown/minimum interval. |
| P2 | Docker chi la mot cau (L143) | Chua co volume, secrets, healthcheck, backup, observability | Compose toi thieu va test restore truoc demo. |

## 5. Digital Twin: hien tai chua du la twin van hanh

**[Nhan xet]** Tai lieu hieu dung Asset, Device, Relation, Attribute va Telemetry (L3-L33). Nhung implementation chi co Device -> assetId va telemetry; chua co relation duoc luu, current state, desired state, command lifecycle, alarm lifecycle hay historical state. Vi vay hien tai la **Digital Twin lite / IoT platform design**, chua phai ban sao hai chieu co the doi chieu trang thai vat ly.

| Khai niem | Hien co | Can them de tao gia tri Twin that su |
|---|---|---|
| Asset | `_id`, Name, Type | Farm/Garden/Plant (hoac irrigation zone), trang thai va cau hinh chinh sach tuoi. |
| Device | Name, Type, assetId | Identity bat bien `deviceId`, capability, firmware, lastSeen, primary location. |
| Relation | Mo ta ly thuyet, chua co schema | `CONTAINS`, `MONITORS`, `CONTROLS`, `LOCATED_IN`; query duoc cay va history neu thuc su can. |
| Attribute | Firmware va nguong tren Device | Firmware/calibration thuoc Device; nguong tuoi thuoc Plant/zone. Version config de ESP32 biet policy nao dang ap dung. |
| Telemetry | Temp, humidity, soil field | Timestamp UTC, device metadata on dinh, unit, raw/quality/sequence; chi la su kien lich su. |
| State | Chua co | `desired` tu backend va `reported` tu ESP32; khong suy ra state tu command cuoi. |
| Command | Chua co | CommandId, idempotency, timeout, actor, source, lifecycle va reason. |
| Alarm | Co y tuong, chua co model | OPEN/ACKNOWLEDGED/CLEARED, severity, entity, evidence. |
| Historical state | Chi co telemetry | State transition/irrigation session; relation history chi them khi co nhu cau di chuyen asset/device. |

```text
Farm (Asset)
  `-CONTAINS-> Garden (Asset)
       `-CONTAINS-> Plant or irrigation zone (Asset)
            |-MONITORED_BY-> ESP32 controller (Device) -> soil/air capabilities
            `-CONTROLLED_BY-> pump/relay channel (actuator capability)
```

Mot ESP32 co the dat tai Garden va `CONTROLS` nhieu Plant; do la ly do `assetId` don le khong du. Neu MVP chac chan la mot ESP32/mot Plant va cay co dinh, `Asset.parentId` + `Device.primaryAssetId` la cach nhe hon. Chi them Relation collection khi muc tieu Digital Twin dong/da quan he la thuc su can; trong tai lieu nay, vi phan "Relations" la gia tri nghien cuu, nen nen them no ngay tu data model.

## 6. Database va data model de xuat

### Lua chon luu tru

MongoDB Time-Series phu hop cho raw telemetry cua MVP/nhom nho. Khong can InfluxDB hay TimescaleDB. Dung phien ban MongoDB con duoc ho tro, khong chot 5.0 chi vi L48 nhac 5.0+.

- Dung `timestamp` lam `timeField` va `meta.deviceId` on dinh lam `metaField`.
- Khong dua `assetId` co the thay doi vao metadata bat bien: khi di chuyen device, historical query se sai ngu canh. Backend query danh sach device theo Relation o thoi diem can thiet; chi tao aggregate theo asset khi co nhu cau hieu nang.
- Luu raw ngan han (vi du 30-90 ngay) va rollup gio/ngay/thang lau hon. Do nguong/retention chua the chot vi tai lieu khong co sampling rate hay yeu cau luu tru.
- Luu `DeviceState` o collection thong thuong; khong query time-series moi lan can biet trang thai hien tai.

Neu 10 device gui mot message moi 30 giay trong 30 ngay, se co `10 x 2,592,000 / 30 = 864,000` telemetry documents/thang. Payload 300 bytes da khoang 259 MB raw truoc compression/index. Con so nay khong lon voi MongoDB, nhung du de can retention, index va chart aggregation.

### Schema toi thieu

```text
Asset {
  _id, name, type: FARM|GARDEN|PLANT|ZONE, parentId?, status, createdAt
}

Device {
  _id, deviceId: unique, name, type: ESP32_CONTROLLER,
  primaryAssetId?, capabilities: [SOIL_SENSOR, AIR_SENSOR, PUMP],
  firmwareVersion, lastSeen, status, createdAt
}

Relation {
  fromId, fromType, toId, toType,
  relationType: CONTAINS|MONITORS|CONTROLS|LOCATED_IN, createdAt
}

Attribute {
  entityId, entityType, values: { ... }, version, updatedAt
}
// MVP thay the: embed configuration on dinh vao Asset/Device; khong can generic collection neu khong can query tung key.

Telemetry (MongoDB Time-Series) {
  timestamp,
  meta: { deviceId, schemaVersion },
  measurements: { temperatureC, airHumidityPct, soilMoisturePct, flowLpm? },
  quality: { valid, flags, rawAdc?, calibrationVersion? }, receivedAt, sequence?
}

DeviceState {
  deviceId: unique, connectivity, lastSeen,
  desired: { pump, mode }, reported: { relayState, mode }, reportedAt
}

Alarm {
  entityId, deviceId?, ruleCode, severity,
  status: OPEN|ACKNOWLEDGED|CLEARED, details,
  openedAt, acknowledgedAt?, clearedAt?
}

Command {
  commandId: unique, deviceId, type, payload,
  source: MANUAL|RULE|SCHEDULE, createdBy?,
  status: PENDING|ACKNOWLEDGED|EXECUTED|FAILED|TIMEOUT,
  createdAt, expiresAt, acknowledgedAt?, executedAt?, error?
}

IrrigationSession {
  sessionId, assetId, deviceId, commandId?, source,
  requestedDurationSec, startedAt, endedAt, outcome,
  estimatedVolumeLiters?, actualVolumeLiters?, volumeSource: ESTIMATED|FLOW_METER
}
```

Index toi thieu: `Device.deviceId` unique; `Asset(parentId, name)`; `Relation(fromId, relationType)` va `(toId, relationType)` kem unique `(fromId,toId,relationType)`; `Attribute(entityType,entityId)`; `Command.commandId` unique va `(deviceId,createdAt)`; `Alarm(entityId,status,openedAt)`; `IrrigationSession(assetId,startedAt)`. Xac minh index time-series theo MongoDB version va query that su (`meta.deviceId + timestamp`) truoc khi them index khac.

## 7. MQTT, state va command flow

Topics L98-L104 dung huong dinh danh theo device, nhung can version va bo sung chieu/contract.

| Topic | Chieu | QoS / retained | Muc dich |
|---|---|---|---|
| `dt/v1/devices/{deviceId}/telemetry` | ESP32 -> backend | QoS 0 mac dinh, khong retained | Mau sensor; QoS 1 chi khi mot mau khong duoc phep mat. |
| `dt/v1/devices/{deviceId}/attributes/reported` | ESP32 -> backend | QoS 1, retained neu la capability/config hien hanh | Firmware, calibration version, capability. |
| `dt/v1/devices/{deviceId}/attributes/desired` | backend -> ESP32 | QoS 1, retained co version | Policy/config dai han; khong dung cho lenh bat bom tuc thoi. |
| `dt/v1/devices/{deviceId}/commands` | backend -> ESP32 | QoS 1, **khong retained** | Lenh co `commandId`, action, deadline, source. |
| `dt/v1/devices/{deviceId}/acks` | ESP32 -> backend | QoS 1, khong retained | ACK/FAILED/EXECUTED co `commandId` va ly do. |
| `dt/v1/devices/{deviceId}/state` | ESP32 -> backend | QoS 1, retained | `online`, reported relay/mode, `lastCommandId`, `updatedAt`. |
| `dt/v1/devices/{deviceId}/alarms` | ESP32 -> backend | QoS 1, khong retained | Su kien edge nhu sensor invalid, safety cutoff; backend la noi luu Alarm chinh. |

- LWT retained phai publish `online: false`; ESP32 chi publish `online: true` sau khi GPIO bom da OFF an toan va firmware san sang. LWT chi phat hien ket noi MQTT mat, khong thay the safety timer.
- QoS 1 co the duplicate. ESP32 phai idempotent theo `commandId` (giu last IDs co gioi han, tra lai ket qua cu), backend retry co gioi han **cung commandId**.
- Khong retained command ON. Thiet bi reconnect khong duoc tu nhien nhan lenh cu; dung `expiresAt`/MQTT Message Expiry va ESP32 tu choi lenh qua han.
- ACL: moi device chi publish/subscribe nhanh topic cua no. `deviceId` trong topic khong phai bang chung nhan dang; can credential provisioned rieng.

```text
React --POST--> Backend: persist Command(PENDING)
Backend --QoS 1--> MQTT: { commandId, action, expiresAt, source }
ESP32: validate identity, expiry, mode, sensor/water/safety guard
ESP32 --ACK--> Backend: ACKNOWLEDGED | FAILED
ESP32: dat GPIO, cap nhat reported state
ESP32 --ACK/state--> Backend: EXECUTED | FAILED + relayState
Backend --WebSocket--> React: command.updated + state.updated
Backend: chuyen PENDING/ACKNOWLEDGED qua TIMEOUT neu khong co terminal event
```

Neu backend gui ON ma ESP32 khong nhan duoc, UI chi hien `Requested ON - PENDING`, roi `TIMEOUT`; khong hien ON ngay sau publish. `EXECUTED` chi xac nhan ESP32 da ap len GPIO/relay. Chi flow/current feedback moi tang muc xac nhan thanh "nuoc dang chay".

## 8. Hardware, logic tuoi va an toan van hanh

### Danh gia BOM

| Linh kien | Danh gia | Hanh dong |
|---|---|---|
| ESP32-WROOM-32S | Phu hop MVP | Set pin control ve OFF truoc Wi-Fi/MQTT; test boot/reset, dac biet relay active-low. |
| DHT11 | Chi phu hop demo moi truong | Khong dung lam signal chinh de tuoi; SHT30/SHT31 tot hon neu can do tin cay. |
| LM393 soil sensor | Mo ho va thuong la dau do dien tro de an mon | Neu dung DO thi chi wet/dry. Dung capacitive analog, calibration dry/wet theo dat/cam bien, luu raw ADC va % da hieu chuan. |
| LED | Huu ich debug | Khong phai feedback bom. |
| Breadboard/jumper | Chi bench | Khong cho dong bom qua breadboard; chuyen sang dau noi/co dinh va vo bao ve khi demo that. |

**Bat buoc bo sung de co he tuoi:** bom DC thap ap, nguon rieng du dong, MOSFET low-side co diode flyback hoac relay du dinh muc, fuse, day/ong nuoc va dau noi phu hop. Neu dung bom AC, phan dien luoi can enclosure, thiet bi dung dinh muc va nguoi co chuyen mon; khong dung breadboard.

**Can cho safety/measurement:** water-level sensor hoac interlock chong chay kho; flow sensor neu bao cao lit hoac can phat hien khong co nuoc; nut ngat nguon bom vat ly. Software khong xu ly duoc relay contact han dinh hoac MOSFET chap, nen tuy bo "an toan" can co mot lop cat dien vat ly.

### Logic irrigation toi thieu

Khong dung `if soil < threshold then ON else OFF`. Nguong phai la configuration cua Plant/zone da calibration, khong hard-code cua ESP32.

```text
Chi xem xet AUTO khi sensor moi, valid, va khong co safety lockout.
Loc N mau gan nhat (median/EMA) de giam noise.
Neu soilMoisturePct < onBelowPct (vi du 35) va da qua MIN_PUMP_INTERVAL:
    yeu cau bat bom voi MAX_PUMP_TIME (vi du 60 giay).
Tat khi soilMoisturePct > offAbovePct (vi du 45), water unavailable,
sensor invalid, emergency stop, hoac dat MAX_PUMP_TIME.
Sau mot phien: soak/cooldown (vi du 5 phut) roi moi danh gia lai.
```

`35/45/60 giay/5 phut` chi la vi du. Gia tri phai duoc chon tu loai dat, bom, luu luong va thu nghiem. `safe_max_soil_humidity` hien co tai L78-L80 la co so de hysteresis, nhung tai lieu chua dung no.

### Kien truc hai lop control

```text
Backend: schedule, policy, trend, alarm, audit, AUTO/MANUAL decision
                            |
                         MQTT command
                            |
ESP32: validate -> local timer -> driver -> pump
        safety veto, watchdog, default OFF, emergency cutoff
```

Backend la noi ra quyet dinh thong minh va luu lich su; ESP32 co quyen phu quyet safety. Khi mat mang, no khong doi backend de tat bom. MVP nen **khong tu bat bom khi offline**; chi them local autonomous control sau khi co config cache, clock/policy ro rang va failure tests.

### Failure matrix

| Tinh huong | Hanh vi bat buoc |
|---|---|
| Mat Wi-Fi / MQTT broker khi bom ON | ESP32 tu tat truoc `MAX_PUMP_TIME`; LWT/state offline, backend tao alarm sau stale timeout. |
| Backend chet | Safety edge khong bi anh huong; khong co lenh auto moi; UI/alert phuc hoi khi backend len lai. |
| MongoDB unavailable | Khong phat auto command neu khong luu duoc audit; telemetry co buffer gioi han hoac drop co metrics, khong de memory tran. |
| Sensor mat/hong/ADC saturate/stale | Mark invalid + alarm; khoa auto-start; manual van bi gioi han max runtime. |
| ESP32 reset | GPIO OFF ngay boot; khong khoi phuc pump ON tu state cu; publish reported state sau boot. |
| Relay ket / pump chay lien tuc | Timer firmware co the gui OFF nhung khong dam bao contact vat ly; flow/current mismatch -> alarm + emergency hardware cutoff. |
| Duplicate command | Cung `commandId` chi thuc thi mot lan, tra ACK ket qua cu. |
| Command tre | Tu choi qua `expiresAt`; khong retry bang commandId moi lam ON lap. |
| Dashboard khac thuc te | Hien rieng desired, `reportedRelayState`, va `flowConfirmed`; khong suy tu command sent. |
| Manual khi AUTO dang chay | Manual override co expiry, backend serialize per actuator; safety lockout uu tien cao nhat. |
| Hai user gui lenh | Optimistic concurrency/queue per actuator, audit actor, mot command active tai mot thoi diem. |

## 9. Backend, frontend, ThingsBoard va deployment

### Backend

Node.js/Express du suc xu ly MQTT, REST API, WebSocket, validation, scheduling, aggregation, smoothing, alarm va rule co ban. **Khong co use case nao trong tai lieu bat buoc Python/FastAPI.** Them Python chi khi co ML, forecasting, optimization hoac anomaly detection duoc dinh nghia va co data/metric danh gia ro rang.

Pipeline nen la: `MQTT subscriber -> validate payload -> persist raw -> update DeviceState -> evaluate rule -> persist Alarm/Command -> publish WebSocket`. Day la service/event handler, khong phai Express HTTP middleware. Cron chi phuc vu rollup, retention, stale-device scan va housekeeping.

API toi thieu:

```text
GET  /assets/:id/tree
GET  /assets/:id/telemetry?from=&to=&aggregation=
GET  /devices/:id/state
POST /devices/:id/commands       -> 202 { commandId, status: "PENDING" }
GET  /commands/:commandId
```

### Frontend va realtime

React phai render asset tree tu API Relation/parent, khong hard-code ten cay. Sau REST snapshot, client chi join room cua asset dang xem va cac descendant device, nhan cac event `telemetry`, `state.updated`, `alarm.updated`, `command.updated`. Khong polling telemetry realtime, nhung refetch khi reconnect/doi trang vi WebSocket co the mat event. Charts lich su dung API aggregation/downsampling, khong day raw tat ca mau qua socket.

Nhung man hinh L119-L128 chi nen hien khi co data model tuong ung: state relay, Command/IrrigationSession, Alarm va flow/estimated volume. `Pump ON` tren UI phai co nhan xac nhan ro rang nhu "requested", "relay reported", hoac "flow confirmed".

### ThingsBoard hay custom platform

ThingsBoard da co device/asset/relation, telemetry, alarm, rule va dashboard. Chay ThingsBoard dong thoi voi Node + Mongo + React ma khong co source of truth se trung lap cac chuc nang nay.

| Huong | Khi phu hop | Giu / bo |
|---|---|---|
| A. Tu xay de hoc kien truc | Muc tieu la hoc MQTT, Digital Twin, backend va web | Giu Mosquitto + Node + MongoDB + React; ThingsBoard chi dung tham khao; bo Python/FastAPI o MVP. **Day la huong duoc khuyen nghi** vi tai lieu da chon Mongoose/Express/React. |
| B. ThingsBoard de demo nhanh | Muc tieu chinh la rollout/dashboard nhanh, khong can tu xay domain platform | Dung ThingsBoard lam platform chinh; giam manh Node/Mongo/React custom, chi viet phan ESP32 va custom UI khi co requirement ro rang. |

### Docker

Dung Docker Compose, khong can Kubernetes. Nen co Compose phat trien ngay khi broker/backend/Mongo chay duoc, roi harden o phase cuoi: persistent volumes, broker config va ACL, environment/secrets, healthcheck, restart policy, log, Mongo backup va restore test. Khong de tat ca Docker den sau cung vi loi network/volume se don vao luc demo.

## 10. Do kho thuc te

| Thanh phan | Do kho | Nhan xet |
|---|---|---|
| Doc sensor ESP32 | ★★☆☆☆ | Code de, calibration va phat hien loi moi kho. |
| MQTT ESP32 | ★★☆☆☆ | De publish; reconnect/LWT/idempotency can can than. |
| Pump control | ★★★☆☆ | Driver/nguon/boot state quan trong hon GPIO. |
| Backend API + ingestion | ★★★☆☆ | Validation, state projection va audit lam no kho hon CRUD. |
| MongoDB | ★★☆☆☆ | Co ban de; retention/index/aggregation can thiet ke. |
| MongoDB Time-Series | ★★★☆☆ | Can doi chieu query/retention/meta model. |
| WebSocket | ★★☆☆☆ | Room, reconnect va authorization la diem chinh. |
| React dashboard | ★★★☆☆ | Asset tree dong, chart va state semantics can nhat quan. |
| Rule Engine | ★★★☆☆ | Co ban vua suc, can tach policy va safety. |
| Digital Twin | ★★★★☆ | Quan he, source of truth, desired/reported state va history. |
| Fail-safe | ★★★★★ | Lien quan firmware, power hardware, protocol va kiem thu loi. |
| Docker Compose | ★★★☆☆ | Khong kho nhung volume, broker config va backup hay bi bo sot. |

De nhat: doc sensor va publish telemetry. Kho nhat va de gay loi nhat: fail-safe va xac nhan trang thai bom. De ton thoi gian nhat: Digital Twin dong + dashboard neu lam truoc khi chot domain model.

## 11. Kien truc toi uu de xuat

De xuat nay giu lai cac cong nghe tot trong tai lieu va bo cac lop trung vai tro:

```text
                         React dashboard
                   REST snapshot + WebSocket rooms
                                  |
                    Node.js / Express application
         validate | twin model | state | rules | commands | alarms
                 /                 |                   \
          MongoDB                 Mosquitto              Docker Compose
    telemetry TS + state      ACL/LWT/QoS/persistence      volumes/health
                                |              ^
         telemetry/state/ack  |              | commands
                                v              |
                         ESP32 controller -----+
                  sensors | local safety | watchdog
                                |
                    MOSFET/relay + fuse + E-stop
                                |
                              DC pump
                         flow / water-level feedback
```

- `Mosquitto`: transport, authentication/ACL, LWT; khong tu mang nghia business state.
- `Node`: source of truth cua domain Twin, command lifecycle va API. Mot process/service du cho MVP.
- `MongoDB`: raw telemetry va domain records; current state tach rieng de doc nhanh.
- `ESP32`: owner cua safe output: OFF when boot, max duration, watchdog, validate command. Backend khong duoc la diem an toan duy nhat.
- `React`: hien thi source of truth va distinction state, khong tu ra lenh MQTT truc tiep.
- `ThingsBoard` va Python khong nam trong so do custom-MVP. Them sau chi khi co requirement cu the.

## 12. Lo trinh trien khai it rui ro

| Phase | Muc tieu, cong viec va dau ra | Do kho | Rui ro can chan |
|---|---|---|---|
| 0 - Chot scope | Chon huong A/B, broker, one-plant MVP, metric/unit, safety acceptance, payload/command contract. **Dau ra:** ADR ngan va test checklist. | ★★☆☆☆ | Scope troi va trung platform. |
| 1 - Hardware bench | Chon bom/nguon/driver, doc sensor raw va calibration, GPIO default OFF, manual local control, max runtime. **Dau ra:** bom chay tai that an toan va tu tat. | ★★★★☆ | Qua dong, relay active-low, soil sensor sai, chay kho. |
| 2 - MQTT | Mosquitto, credential/ACL, telemetry, retained state/LWT, command/ACK/idempotency; test reconnect. **Dau ra:** contract versioned da test. | ★★★☆☆ | Command cu/duplicate va online state sai. |
| 3 - Backend data | Node subscriber, schema validation, Mongo TS raw, DeviceState, retention/index, stale scan. **Dau ra:** telemetry valid va state current query duoc. | ★★★☆☆ | Schema som bi khoa chat, raw evidence bi xoa. |
| 4 - Manual E2E | React -> API -> Command -> MQTT -> ACK -> UI; Command/IrrigationSession audit. **Dau ra:** no optimistic ON; co timeout/failure. | ★★★☆☆ | UI-state lech thiet bi, race command. |
| 5 - Digital Twin | Asset/Device/Relation, attributes theo dung owner, tree API va UI dong. **Dau ra:** them Asset khong sua frontend. | ★★★★☆ | Model khong map duoc controller nhieu endpoint. |
| 6 - Realtime | WebSocket rooms, REST snapshot/reconnect, chart aggregation. **Dau ra:** client chi nhan du lieu asset dang xem. | ★★☆☆☆ | Broadcast qua nhieu, event mat/dao thu tu. |
| 7 - Automation | Hysteresis, smoothing, cooldown, alarm, policy AUTO/MANUAL; edge guard da co tu phase 1. **Dau ra:** auto irrigation dat test scenario. | ★★★★☆ | Chattering, tuoi qua muc, sensor invalid. |
| 8 - Safety verification | Fault injection Wi-Fi/broker/backend/DB/sensor/reset/relay; E-stop/flow test. **Dau ra:** bang evidence cho tung failure case. | ★★★★★ | Tuyen bo safety khong co bang chung. |
| 9 - Deployment hardening | Compose, volumes, healthcheck, backup/restore, secrets, logs, auth. **Dau ra:** len/xuong/recovery duoc thu. | ★★★☆☆ | Mat data, broker config khac local. |
| 10 - Documentation/demo | Architecture diagram co version, wiring, API/MQTT contract, test report va known limits. **Dau ra:** demo repeatable, claim dung muc. | ★★☆☆☆ | Tai lieu va code lech nhau. |

Safety co trong Phase 1, 2 va 4; Phase 8 la luc xac minh toan dien, khong phai luc moi bat dau them safety.

## 13. Pham vi MVP, hoan thien va nang cao

| MVP | Hoan thien | Nang cao |
|---|---|---|
| 1 ESP32, soil sensor da calibration, bom/driver/nguon an toan | Asset/Device/Relation day du, asset tree dong | Weather integration, forecasting, optimization/ML |
| Telemetry, online/offline, MongoDB raw + current state | Alarm lifecycle, irrigation history, retention/rollups | Anomaly detection, predictive irrigation, edge AI |
| Manual pump co command ACK va max runtime | Auto irrigation hysteresis/cooldown/water interlock | Multi-site/tenant, advanced policy |
| Node + Mosquitto + React co ban | WebSocket rooms, auth/ACL, Docker backup | ThingsBoard hoac Python chi khi co ly do tach bach |

MVP khong can ThingsBoard, Python, generic Attributes engine, historical Relation hay AI. MVP van nen co identity, command audit va local timeout vi do la phan cua chuc nang tuoi an toan, khong phai over-engineering.

## 14. Test cases va failure scenarios truoc khi goi la an toan

| Test | Expected acceptance |
|---|---|
| Sensor binh thuong | Gia tri dung unit, co quality valid, luu/raw va chart dung. |
| Sensor mat data / outlier / ADC saturate | Alarm, `quality.valid=false`, AUTO khong start. |
| ESP32 offline | LWT/stale state offline; command ON timeout, UI khong bao ON. |
| MQTT offline khi pump ON | Edge tat truoc max runtime. |
| Backend restart | Reconnect/subscribe lai, state rehydrate, khong execute duplicate command. |
| MongoDB unavailable | Alert/metrics, khong phat auto command khong audit duoc; khong memory leak. |
| Command duplicate QoS 1 | Cung `commandId` chi co mot lan action/session. |
| Command expired / device reconnect | ESP32 tu choi, state/ACK co ly do. |
| Pump qua max runtime | Edge cat output va tao safety alarm. |
| Manual vs auto | Manual override co expiry; AUTO khong chen lenh trai policy. |
| Hai user cung luc | Mot command active per actuator, audit actor va response conflict/queue ro rang. |
| Relay OFF nhung flow van co / khong flow khi ON | Phat hien mismatch neu co sensor, alarm va thao tac emergency hardware. |
| Backup/restore | Mongo backup khoi phuc duoc Device/Asset/config/history can thiet trong moi truong test. |

## 15. Ket luan va nam thay doi phai lam ngay

Du an kha thi cho sinh vien/nhom nho neu thu nho MVP va coi safety la requirement co test, khong chi la ten de tai. Khong can lam lai toan bo: giu ESP32, MQTT, MongoDB Time-Series, Node.js va React. Can sua kien truc lon o four areas: physical actuation, edge safety, command/state protocol, va ownership Digital Twin/platform.

1. **Bo sung chuoi bom thuc te va feedback:** bom, driver, nguon, fuse, E-stop; them flow sensor neu hien thi lit nuoc.
2. **Sua rule metric va calibration:** `soilMoisturePct` voi unit/calibration, hysteresis, timeout, cooldown; khong so sanh temperature voi soil threshold.
3. **Thiet ke command/state co ACK:** `commandId`, idempotency, timeout, desired/reported/flow-confirmed; UI khong coi sent la executed.
4. **Dat safety o ESP32:** safe boot OFF, watchdog, max pump time, validation, local veto; backend chi ra quyet dinh cap cao.
5. **Chon mot platform va mo hinh Twin co source of truth:** custom Node/Mongo/React *hoac* ThingsBoard; them Relation/DeviceState/Command/Alarm/IrrigationSession thay vi chi `assetId` va telemetry.

Sau nam thay doi nay, MVP co the bat dau. Asset graph tong quat, advanced analytics, Python va ThingsBoard chi nen lam sau khi MVP va failure tests on dinh.
