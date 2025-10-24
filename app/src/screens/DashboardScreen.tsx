import { useCallback, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { Button, Text } from "react-native-paper";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { theme } from "../theme";
import { useWebSocket } from "../hooks/useWebSocket";
import { FloatingMenu } from "../components/FloatingMenu";

type DashboardEvent = {
  event?: string;
  ts?: number;
  topic?: string;
  data?: unknown;
};

const WS_URL = Constants?.expoConfig?.extra?.wsUrl ?? "ws://192.168.45.200:8080/ws";

function formatTimestamp(ts?: number) {
  if (!ts) {
    return "—";
  }
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString();
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const [presence, setPresence] = useState<boolean | undefined>(undefined);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>(undefined);
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setWsUrl(WS_URL);
      return () => setWsUrl(undefined);
    }, [])
  );

  useWebSocket(wsUrl, (incoming: DashboardEvent) => {
    const data = incoming?.data as { present?: boolean } | undefined;
    if (data?.present !== undefined) {
      setPresence(Boolean(data.present));
    }
    if (incoming?.ts) {
      setLastUpdate(incoming.ts);
    }
  });

  const presenceLabel = useMemo(() => {
    if (presence === undefined) {
      return "상태 정보를 수신 중입니다.";
    }
    return presence ? "거실에 머무르고 있어요." : "거실을 비웠어요.";
  }, [presence]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <FloatingMenu
        visible={menuOpen}
        onPressToggle={() => setMenuOpen(prev => !prev)}
        origin={{ top: 75, right: 10 }}
        items={[
          { icon: "account", onPress: () => navigation.navigate("CallSign" as never) },
          { icon: "cog", onPress: () => navigation.navigate("Settings" as never) },
          { icon: "history", onPress: () => navigation.navigate("Timeline" as never) },
          { icon: "chart-pie", onPress: () => navigation.navigate("Stats" as never) }
        ]}
      />

      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>실시간 위치</Text>
        </View>

        <View style={styles.messageBlock}>
          <Text style={styles.primaryMessage}>OO의 실시간 위치를 볼 수 있어요</Text>
          <Text style={styles.secondaryMessage}>{presenceLabel}</Text>
        </View>

        <View style={styles.mapShell}>
          <View style={styles.mapPlaceholder}>
            <Text style={styles.mapPlaceholderText}>지도 준비 중</Text>
          </View>
          <Text style={styles.updatedAt}>마지막 업데이트 · {formatTimestamp(lastUpdate)}</Text>
        </View>

        <Button mode="contained" style={styles.emergencyButton} labelStyle={styles.emergencyLabel} onPress={() => {}}>
          긴급신고
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 120,
    paddingBottom: 40,
    gap: 32,
    backgroundColor: theme.colors.background
  },
  header: {
    alignItems: "flex-start"
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: theme.colors.primary
  },
  messageBlock: {
    gap: 12
  },
  primaryMessage: {
    fontSize: 22,
    fontWeight: "600",
    color: theme.colors.textPrimary,
    textAlign: "center"
  },
  secondaryMessage: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    textAlign: "center"
  },
  mapShell: {
    alignItems: "center",
    gap: 12
  },
  mapPlaceholder: {
    width: "100%",
    aspectRatio: 0.9,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 4
  },
  mapPlaceholderText: {
    fontSize: 18,
    color: theme.colors.textSecondary
  },
  updatedAt: {
    fontSize: 14,
    color: theme.colors.textSecondary
  },
  emergencyButton: {
    borderRadius: 18,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12
  },
  emergencyLabel: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5
  }
});
