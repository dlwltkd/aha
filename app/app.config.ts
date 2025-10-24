import { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Home Vision",
  slug: "home-vision",
  version: "0.1.0",
  orientation: "portrait",
  scheme: "homevision",
  userInterfaceStyle: "automatic",
  extra: {
    wsUrl: "ws://192.168.45.200:8080/ws",
    apiBase: "http://192.168.45.200:8080"
  }
};

export default config;
