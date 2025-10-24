export const defaultConfig = {
  wsUrl: "ws://192.168.45.200:8080/ws",
  apiBase: "http://192.168.45.200:8080",
  mqttHost: "192.168.45.200",
  theme: {
    primary: "#0B3D91",
    secondary: "#1B7CE2"
  }
} as const;

export type AppConfig = typeof defaultConfig;
