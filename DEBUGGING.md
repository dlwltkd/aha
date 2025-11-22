# Location Debugging Guide

## Overview
The app has a built-in debugging API (`__dash`) that allows you to test location changes without needing a real WebSocket server.

## Architecture
- **WebSocket**: Receives real location updates from `ws://192.168.45.200:8080/ws`
- **Dashboard Bridge**: Provides debugging helpers accessible from JS console
- **Zones**: `bedroom`, `living`, `bathroom`

## Using the JS Debugger

### 1. Enable React Native Debugger

**Option A: React Native Debugger (Standalone)**
```bash
# In your app directory
npm start

# Then in another terminal, open the app
Press 'd' in terminal or shake device → "Debug"
```

**Option B: Chrome DevTools**
```bash
npm start
# Shake device → "Debug" → Opens Chrome DevTools
```

**Option C: Expo DevTools**
```bash
npm start
# Press 'm' to open menu
# Toggle "Debug Remote JS"
```

### 2. Access the Console

Once debugger is open, you can access the global `__dash` object:

```javascript
// Check if __dash is available
console.log(__dash);
```

### 3. Test Location Changes

#### Set Zone (Location)

```javascript
// Move to bedroom (안방)
__dash.updateZone("bedroom");

// Move to living room (거실)
__dash.updateZone("living");

// Move to bathroom (화장실)
__dash.updateZone("bathroom");

// Set to not present (집을 비웠습니다)
__dash.updateZone(null);
```

#### Trigger Unusual Event (⚠️ NEW)

```javascript
// Trigger an unusual event detection
__dash.setUnusualEvent("넘어짐 감지됨");

// Try different descriptions
__dash.setUnusualEvent("이상행동 감지");
__dash.setUnusualEvent("장시간 움직임 없음");

// Clear unusual event
__dash.clearUnusualEvent();
```

> **Note**: When an unusual event is triggered, the location dot will turn **RED** and the status text will also turn **RED** with the warning icon ⚠️ and the description.

#### Combined Zone + Unusual Event

```javascript
// Set zone to bathroom and unusual event
__dash.updateZone("bathroom");
__dash.setUnusualEvent("화장실에서 장시간 움직임 없음");

// Clear unusual event but keep zone
__dash.clearUnusualEvent();

```

#### Set Zone with Custom Message

```javascript
// With custom status message
__dash.updateAll("bedroom", "잠을 자고 있어요");
__dash.updateAll("living", "TV를 보고 있어요");
__dash.updateAll("bathroom", "샤워 중이에요");
```

#### Update Presence Only

```javascript
// Home
__dash.updatePresence(true);

// Away
__dash.updatePresence(false);

// With custom timestamp
__dash.updatePresence(true, Date.now() / 1000);
```

#### Auto-Update Demo

```javascript
// Start random presence updates every 3 seconds
__dash.startDemoAutoUpdate(3000);

// Stop auto-updates
__dash.stopDemoAutoUpdate();
```

## Complete Testing Workflow

### Scenario 1: Test Location Transitions

```javascript
// Person enters bathroom
__dash.updateAll("bathroom", "화장실 사용 중");

// Wait 2 minutes (simulate)...

// Person moves to bedroom
__dash.updateAll("bedroom", "안방으로 이동");

// Person leaves home
__dash.updateZone(null);
```

### Scenario 2: Simulate WebSocket Message

```javascript
// Simulate incoming WebSocket data
__dash.updateFromWsLike({
  data: { present: true },
  ts: Math.floor(Date.now() / 1000)
});
```

### Scenario 3: Test with Status Messages

```javascript
// With timestamp
__dash.updateStatusMessage("침대에 누워 있음", Date.now() / 1000);
```

## Dashboard State Mapping

| Zone Value | Display Text | Description |
|------------|--------------|-------------|
| `"bedroom"` | 안방에 있어요 | In master bedroom |
| `"living"` | 거실에 있어요 | In living room |
| `"bathroom"` | 화장실을 이용하고 있어요 | Using bathroom |
| `null` or `false` | 집을 비웠습니다 | Away from home |
| `undefined` | 상태 확인 중… | Checking status |
| `true` (no zone) | 집에 있어요 | Home (general) |

## Debugging Tips

### 1. Check Current State
```javascript
// The __dash object doesn't return state, but you can check the UI
console.log("Use Dashboard screen to verify changes");
```

### 2. Test Voice Recording with Location
```javascript
// Set a location first
__dash.updateZone("bathroom");

// Then test voice recording
// "엄마 여기는 화장실이야"
```

### 3. Verify AsyncStorage
```javascript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Check saved call sign
AsyncStorage.getItem('userCallSign').then(name => {
  console.log('Saved name:', name);
});
```

## WebSocket Server (Real Implementation)

If you want to set up a real WebSocket server:

### Simple Node.js WebSocket Server
```javascript
// server.js
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send location update
  const sendUpdate = (zone) => {
    ws.send(JSON.stringify({
      event: 'location_update',
      ts: Math.floor(Date.now() / 1000),
      data: { present: !!zone, zone: zone }
    }));
  };
  
  // Example: Send bathroom update after 5s
  setTimeout(() => sendUpdate('bathroom'), 5000);
  setTimeout(() => sendUpdate('bedroom'), 10000);
  setTimeout(() => sendUpdate('living'), 15000);
});
```

### Run Server
```bash
npm install ws
node server.js
```

### Update WS_URL in app
Change in [Console](file:///c:/Users/birke/OneDrive/Desktop/changpeul/aha/app/src/screens/DashboardScreen.tsx):
```typescript
const WS_URL = "ws://YOUR_IP:8080/ws";
```

## Testing Timeline Events

The timeline now tracks real events based on your debugger commands.

```javascript
// Record a bathroom visit
__dash.updateZone("bathroom")

// Wait a few seconds, then move to living room  
__dash.updateZone("living")

// Then bedroom
__dash.updateZone("bedroom")

// View the Timeline screen - you'll see these events with timestamps!
```

### Clear Timeline

```javascript
// Clear all recorded events
await __dash.clearTimeline()
```

> **Note**: Events are persisted in AsyncStorage and will survive app restarts. Use `clearTimeline()` to reset the timeline for testing.

## Common Test Scenarios

### Scenario 1: Morning bathroom routine
```javascript
__dash.update Zone("bedroom")    // Wake up
await new Promise(r => setTimeout(r, 2000))
__dash.updateZone("bathroom")   // Morning bathroom visit
await new Promise(r => setTimeout(r, 5000))
__dash.updateZone("living")     // Go to living room
```

### Scenario 2: Test empty timeline
```javascript
// Clear events
await __dash.clearTimeline()

// Open timeline screen - should show "이 날짜에 기록된 이벤트가 없습니다"
```

### Scenario 3: Multiple visits
```javascript
__dash.updateZone("bathroom")
await new Promise(r => setTimeout(r, 1000))
__dash.updateZone("living")
await new Promise(r => setTimeout(r, 1000))
__dash.updateZone("bathroom")
await new Promise(r => setTimeout(r, 1000))
__dash.updateZone("bedroom")

// Check timeline - should show 4 events in chronological order
```

## Available Commands Reference

```javascript
// Location updates (also records to timeline)
__dash.updateZone("bathroom | living | bedroom")  // Set zone
__dash.updateAll(zone, message)                   // Set zone + message


// Presence updates
__dash.updatePresence(true | false)               // Set presence

// Timeline management
await __dash.clearTimeline()                      // Clear all events

// Demo/testing
__dash.startDemoAutoUpdate(intervalMs)            // Auto updates
__dash.stopDemoAutoUpdate()                       // Stop auto updates
```

## Troubleshooting

**Issue**: `__dash is not defined`
- **Solution**: Make sure the app is running and debugger is connected. The dashboardBridge.ts file attaches `__dash` to global scope.

**Issue**: Changes don't appear on screen
- **Solution**: Make sure you're on the Dashboard screen when calling `__dash` functions.

**Issue**: WebSocket not connecting
- **Solution**: Check that the IP address matches your server and both devices are on the same network.
