export type Zone = "bedroom" | "living" | "bathroom";

export type DashboardSetters = {
  setPresence: (p: boolean) => void;
  setLastUpdate: (ts: number) => void;
  setStatusMessage?: (msg?: string) => void;
  setZone?: (z?: Zone) => void;
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

export function updateFromWsLike(payload: { data?: any; ts?: number }) {
  const p = !!payload?.data?.present;
  updatePresence(p, typeof payload?.ts === "number" ? payload.ts : undefined);
}

export function updateZone(zone?: Zone | null, ts?: number) {
  if (!setters) return;
  if (setters.setZone) setters.setZone(zone ?? undefined);
  updatePresence(!!zone, ts);
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
    updateZone: typeof updateZone;
    updateFromWsLike: typeof updateFromWsLike;
    startDemoAutoUpdate: typeof startDemoAutoUpdate;
    stopDemoAutoUpdate: typeof stopDemoAutoUpdate;
  } | undefined;
  interface Window {
    __dash?: typeof __dash;
  }
}

// Attach helpers to a universal root so you can call them from the JS console
const root: any =
  // RN / modern JS
  (typeof globalThis !== "undefined" ? globalThis : undefined) ??
  // Node-style globals (some runtimes)
  (typeof (global as any) !== "undefined" ? (global as any) : undefined) ??
  // Web fallback
  (typeof window !== "undefined" ? window : {});

root.__dash = {
  updatePresence,
  updateZone,
  updatePresenceWithMessage,
  updateStatusMessage,
  updateFromWsLike,
  startDemoAutoUpdate,
  stopDemoAutoUpdate,
};
