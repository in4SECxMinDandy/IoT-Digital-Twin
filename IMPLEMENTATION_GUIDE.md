# Digital Twin Implementation Guide

## 🎯 Quick Integration Steps

### Step 1: Import Digital Twin Components

Add these imports to `apps/web/src/App.tsx`:

```tsx
import { SystemOverview, AlertTimeline } from "./components/DigitalTwin";
import "./components/DigitalTwin/digital-twin.css";
```

### Step 2: Update App Layout

Replace the main content section in App.tsx with this Digital Twin layout:

```tsx
export function App() {
  // ... existing state and logic ...

  return (
    <>
      {/* Enhanced Header remains the same */}
      <Header 
        devices={devices}
        socketConnected={socketConnected}
        onRefresh={handleRefreshClick}
        isRefreshing={isRefreshing}
      />

      {/* NEW: Digital Twin Control Center Layout */}
      <div className="dt-control-center">
        
        {/* Top Row: System Overview + Alert Timeline */}
        <div className="dt-control-center__row dt-control-center__row--top">
          <div className="dt-control-center__col dt-control-center__col--2">
            <SystemOverview devices={devices} />
          </div>
          <div className="dt-control-center__col dt-control-center__col--1">
            <AlertTimeline 
              alarms={alarms} 
              onViewDetails={(alarm) => {
                console.log('View alarm:', alarm);
                // Add your alarm detail logic here
              }} 
            />
          </div>
        </div>

        {/* Middle Row: 3D Visualizations */}
        <div className="dt-control-center__row dt-control-center__row--viz">
          <div className="dt-control-center__col dt-control-center__col--1">
            <Suspense fallback={<LoadingGarden3D />}>
              <Garden3D
                devices={devices}
                telemetry={telemetry}
                onSelectSensor={handleSelectSensor}
                selectedDeviceId={selectedDeviceId}
                soilThresholds={DEFAULT_SOIL_THRESHOLDS}
              />
            </Suspense>
          </div>
          <div className="dt-control-center__col dt-control-center__col--1">
            {canEnable3DMap() && (
              <Suspense fallback={<LoadingMap />}>
                <Garden3DMap
                  devices={devices}
                  selectedDeviceId={selectedDeviceId}
                  onSelectDevice={setSelectedDeviceId}
                />
              </Suspense>
            )}
          </div>
        </div>

        {/* Bottom Row: Data Tables & Charts */}
        <div className="dt-control-center__row dt-control-center__row--data">
          <div className="dt-control-center__col dt-control-center__col--full">
            {/* Existing components with dt-card wrapper */}
            <div className="dt-card-grid">
              <IrrigationStatusCard devices={devices} />
              <WaterConsumptionCard />
              <AvgMoistureCard telemetry={telemetry} />
              <AlarmWidgetCard alarms={alarms} onViewAll={() => setIsAlarmsModalOpen(true)} />
            </div>
          </div>
        </div>

        <div className="dt-control-center__row">
          <div className="dt-control-center__col dt-control-center__col--full">
            <StatisticsChart telemetry={telemetry} devices={devices} />
          </div>
        </div>

        <div className="dt-control-center__row">
          <div className="dt-control-center__col dt-control-center__col--full">
            <SensorsTable
              devices={devices}
              telemetry={telemetry}
              onSelectSensor={handleSelectSensor}
            />
          </div>
        </div>

      </div>

      {/* Modals remain the same */}
      {activeSensorDetail && (
        <SensorDetailModal
          sensor={activeSensorDetail}
          onClose={() => setActiveSensorDetail(null)}
        />
      )}

      {isAlarmsModalOpen && (
        <AlarmsModal alarms={alarms} onClose={() => setIsAlarmsModalOpen(false)} />
      )}

      {isCreateScheduleOpen && (
        <CreateScheduleModal
          onClose={() => setIsCreateScheduleOpen(false)}
          onSubmit={handleCreateSchedule}
        />
      )}
    </>
  );
}
```

### Step 3: Add Digital Twin Layout CSS

Add this to your `apps/web/src/styles.css`:

```css
/* ==========================================================================
   DIGITAL TWIN CONTROL CENTER LAYOUT
   ========================================================================== */

.dt-control-center {
  max-width: 1920px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.dt-control-center__row {
  display: grid;
  gap: 20px;
  width: 100%;
}

.dt-control-center__row--top {
  grid-template-columns: 2fr 1fr;
}

.dt-control-center__row--viz {
  grid-template-columns: 1fr 1fr;
}

.dt-control-center__row--data {
  grid-template-columns: 1fr;
}

.dt-control-center__col {
  min-width: 0; /* Prevent grid blowout */
}

.dt-control-center__col--full {
  grid-column: 1 / -1;
}

/* Card Grid for Metrics */
.dt-card-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

/* Loading States */
.dt-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  background: linear-gradient(135deg, var(--color-surface) 0%, var(--color-space-dark) 100%);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-subtle);
}

.dt-loading__spinner {
  width: 48px;
  height: 48px;
  border: 4px solid rgba(56, 189, 248, 0.2);
  border-top-color: var(--color-accent-primary);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Responsive Layout */
@media (max-width: 1280px) {
  .dt-control-center__row--top {
    grid-template-columns: 1fr;
  }

  .dt-control-center__row--viz {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .dt-control-center {
    padding: 16px;
    gap: 16px;
  }

  .dt-card-grid {
    grid-template-columns: 1fr;
  }
}
```

### Step 4: Add Loading Components

Add these helper components in App.tsx:

```tsx
function LoadingGarden3D() {
  return (
    <div className="dt-loading">
      <div className="dt-loading__spinner" />
    </div>
  );
}

function LoadingMap() {
  return (
    <div className="dt-loading">
      <div className="dt-loading__spinner" />
    </div>
  );
}
```

## 🎨 Styling Existing Components

### Update Existing Card Components

Wrap existing components to match Digital Twin theme:

#### IrrigationStatusCard
```tsx
// Add dt-card class
<div className="dt-card">
  {/* existing content */}
</div>
```

#### WaterConsumptionCard
```tsx
// Add dt-card class with gradient header
<div className="dt-card">
  <div className="dt-card__header">
    <h3 className="dt-card__title">WATER CONSUMPTION</h3>
    <div className="dt-live-badge">
      <span className="dt-live-dot" />
      LIVE
    </div>
  </div>
  {/* existing content */}
</div>
```

## 🔧 Configuration

### Environment Variables

No additional environment variables needed. The Digital Twin components use the existing API and WebSocket connections.

### TypeScript Types

All necessary types are already defined in `apps/web/src/types.ts`:
- `Device`
- `Telemetry`
- `Alarm`

## 🎯 Features Overview

### SystemOverview Component
✅ Real-time system health percentage
✅ Circular progress ring with gradient
✅ Device count (online/total)
✅ Average soil moisture
✅ Average temperature
✅ Average air humidity
✅ Live data indicator
✅ Last sync timestamp

### AlertTimeline Component
✅ Active alerts counter
✅ Alert severity badges (CRITICAL, WARNING, INFO)
✅ Alert status (ACTIVE, RESOLVED)
✅ Timestamp with relative time
✅ Device ID display
✅ Pulsing indicator for active alerts
✅ Click to view details
✅ Empty state when no alerts

## 🚀 Testing Checklist

- [ ] System health ring displays correct percentage
- [ ] All 4 metric cards show data
- [ ] Live indicators pulse
- [ ] Alert cards display with correct severity colors
- [ ] Click on alert card triggers callback
- [ ] Responsive layout works on mobile
- [ ] Dark theme applies consistently
- [ ] Hover effects work on all interactive elements
- [ ] Loading states display correctly
- [ ] WebSocket updates reflect in real-time

## 📊 Performance Considerations

### Optimization Tips

1. **Memoize calculations**:
```tsx
const systemHealth = useMemo(() => calculateSystemHealth(devices), [devices]);
```

2. **Throttle updates**:
```tsx
const throttledUpdate = useThrottle(handleUpdate, 1000);
```

3. **Lazy load heavy components**:
```tsx
const Garden3DMap = lazy(() => import("./components/Garden3DMap"));
```

## 🐛 Troubleshooting

### Components not rendering?
- Check that CSS file is imported
- Verify devices array has data
- Check browser console for errors

### Colors not showing?
- Ensure `styles.css` is updated with CSS variables
- Check that dark theme CSS is applied

### Health ring not animating?
- Check SVG viewBox and circle coordinates
- Verify stroke-dasharray calculation

### Alerts not displaying?
- Verify alarms array structure
- Check that alarm objects have required fields

## 📝 Next Steps

1. ✅ Import components
2. ✅ Update layout structure
3. ✅ Add CSS styles
4. ✅ Test on different screen sizes
5. ✅ Verify real-time updates
6. 🔄 Add more panels (optional)
7. 🔄 Implement analytics (optional)
8. 🔄 Add export functionality (optional)

## 🎓 Additional Resources

- [Digital Twin Design Patterns](DIGITAL_TWIN_REDESIGN.md)
- [Component API Documentation](DIGITAL_TWIN_REDESIGN.md#component-api)
- [Color System Reference](DIGITAL_TWIN_REDESIGN.md#design-system)

---

**Need Help?**
- Check existing styles in `apps/web/src/styles.css`
- Review component props in TypeScript files
- Test each component individually before full integration
