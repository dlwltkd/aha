export type Zone = "bedroom" | "living" | "bathroom";

import { addEvent, formatZoneDescription, clearEvents } from './eventStorage';

export type DashboardSetters = {
  setPresence: (p: boolean) => void;
  setLastUpdate: (ts: number) => void;
  setStatusMessage?: (msg?: string) => void;
  setZone?: (z?: Zone) => void;
  setUnusualEvent?: (event?: { description: string; detected: boolean }) => void;
};

let setters: DashboardSetters | null = null;
let demoTimer: ReturnType<typeof setInterval> | null = null;

export function registerDashboardUpdater(s: DashboardSetters) {
  setters = s;
}

export function unregisterDashboardUpdater() {
  setters = null;
  stopDemoAutoUpdate();
}

export function updatePresence(present: boolean, ts?: number) {
  if (!setters) return;
  setters.setPresence(!!present);
  setters.setLastUpdate(typeof ts === "number" ? ts : Math.floor(Date.now() / 1000));
}

export function updatePresenceWithMessage(present: boolean, message?: string, ts?: number) {
  if (!setters) return;
  if (setters.setStatusMessage) setters.setStatusMessage(message);
  updatePresence(present, ts);
}

export function updateStatusMessage(message?: string, ts?: number) {
  if (!setters) return;
  if (setters.setStatusMessage) setters.setStatusMessage(message);
  if (typeof ts === "number") {
    setters.setLastUpdate(ts);
  }
}

// Convenience: set zone + message and timestamp in one call
export function updateAll(zone: Zone | null | undefined, message?: string) {
  const ts = Math.floor(Date.now() / 1000);
  updateZone(zone ?? null, ts);
  updateStatusMessage(message, ts);
}

export function updateFromWsLike(payload: { data?: any; ts?: number }) {
  const p = !!payload?.data?.present;
  updatePresence(p, typeof payload?.ts === "number" ? payload.ts : undefined);
}

export function updateZone(zone?: Zone | null, ts?: number) {
  if (!setters) return;
  if (setters.setZone) setters.setZone(zone ?? undefined);
  updatePresence(!!zone, ts);

  // Record event to timeline
  const description = formatZoneDescription(zone ?? null, 'enter');
  addEvent(zone ?? null, description);
}

export function setUnusualEvent(description: string, detected: boolean = true, ts?: number) {
  if (!setters) return;
  if (setters.setUnusualEvent) {
    setters.setUnusualEvent({ description, detected });
  }
  if (typeof ts === "number") {
    setters.setLastUpdate(ts);
  } else {
    setters.setLastUpdate(Math.floor(Date.now() / 1000));
  }
}

export function clearUnusualEvent() {
  if (!setters) return;
  if (setters.setUnusualEvent) {
    setters.setUnusualEvent(undefined);
  }
}

export function startDemoAutoUpdate(intervalMs = 3000) {
  stopDemoAutoUpdate();
  demoTimer = setInterval(() => {
    updatePresence(Math.random() > 0.5);
  }, intervalMs);
}

export function stopDemoAutoUpdate() {
  if (demoTimer) {
    clearInterval(demoTimer);
    demoTimer = null;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __dash: {
    updatePresence: typeof updatePresence;
    updatePresenceWithMessage: typeof updatePresenceWithMessage;
    updateStatusMessage: typeof updateStatusMessage;
    updateZone: typeof updateZone;
    updateFromWsLike: typeof updateFromWsLike;
    startDemoAutoUpdate: typeof startDemoAutoUpdate;
    stopDemoAutoUpdate: typeof stopDemoAutoUpdate;
    updateAll: typeof updateAll;
    clearTimeline: typeof clearEvents;
    setUnusualEvent: typeof setUnusualEvent;
    clearUnusualEvent: typeof clearUnusualEvent;
  } | undefined;
  interface Window {
    __dash?: typeof __dash;
  }
}

// Attach helpers to a universal root so you can call them from the JS console
const root: any =
  // RN / modern JS
  (typeof globalThis !== "undefined" ? (globalThis as any) : undefined) ??
  // Node-style globals (some runtimes)
  // eslint-disable-next-line no-undef
  (typeof global !== "undefined" ? (global as any) : undefined) ??
  // Web fallback
  (typeof window !== "undefined" ? (window as any) : {});

root.__dash = {
  updatePresence,
  updatePresenceWithMessage,
  updateStatusMessage,
  updateZone,
  updateFromWsLike,
  startDemoAutoUpdate,
  stopDemoAutoUpdate,
  updateAll,
  clearTimeline: clearEvents,
  setUnusualEvent,
  clearUnusualEvent,
};

// Also attach explicitly to common globals so whichever one
// the debugger exposes (`globalThis`, `window`, `global`) sees it.
if (typeof globalThis !== "undefined") {
  (globalThis as any).__dash = root.__dash;
}
// eslint-disable-next-line no-undef
if (typeof global !== "undefined") {
  (global as any).__dash = root.__dash;
}
if (typeof window !== "undefined") {
  (window as any).__dash = root.__dash;
}
