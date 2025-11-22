import { useCallback, useMemo, useState, useEffect } from "react";
import { SafeAreaView, StyleSheet, View, Alert, useWindowDimensions, Animated } from "react-native";
import { Text } from "react-native-paper";
import { LongPressButton } from "../components/LongPressButton";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { theme } from "../theme";
import { useWebSocket } from "../hooks/useWebSocket";
import { FloatingMenu } from "../components/FloatingMenu";
import { FloorMapWithLocation } from "../components/FloorMapWithLocation";
import { Skeleton } from "../components/Skeleton";
import { LiveIndicator } from "../components/LiveIndicator";
import { FadeInView } from "../components/FadeInView";
import {
  registerDashboardUpdater,
  unregisterDashboardUpdater,
  type Zone,
} from "../services/dashboardBridge";

type DashboardEvent = {
  event?: string;
  ts?: number;
  topic?: string;
  data?: unknown;
};

const WS_URL = Constants?.expoConfig?.extra?.wsUrl ?? "ws://192.168.45.200:8080/ws";

function formatTimestamp(ts?: number) {
  if (!ts) {
    return "-";
  }
  const date = new Date(ts * 1000);
  return date.toLocaleTimeString();
}

function getGreeting(name: string) {
  const hour = new Date().getHours();
  if (hour < 11) return `좋은 아침입니다. ${name}님의 현황입니다.`;
  if (hour < 18) return `안녕하세요. ${name}님의 현황입니다.`;
  return `편안한 밤 되세요. ${name}님의 현황입니다.`;
}

export default function DashboardScreen() {
  const navigation = useNavigation();
  const { height } = useWindowDimensions();
  const [presence, setPresence] = useState<boolean | undefined>(undefined);
  const [lastUpdate, setLastUpdate] = useState<number | undefined>(undefined);
  const [statusMsg, setStatusMessage] = useState<string | undefined>(undefined);
  const [zone, setZone] = useState<Zone | undefined>(undefined);
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);
  const [menuOpen, setMenuOpen] = useState(false);
  const [callSign, setCallSign] = useState("OO");
  const [unusualEvent, setUnusualEvent] = useState<{ description: string; detected: boolean } | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic spacing based on screen height
  const isSmallScreen = height < 700;
  const dynamicPaddingTop = isSmallScreen ? 60 : 120;
  const dynamicGap = isSmallScreen ? 16 : 40;
  const dynamicCardPadding = isSmallScreen ? 16 : 24;

  useFocusEffect(
    useCallback(() => {
      loadCallSign();
      // Simulate loading or wait for first data
      const timer = setTimeout(() => setIsLoading(false), 1500);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadCallSign = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userCallSign');
      if (savedName) {
        setCallSign(savedName);
      }
    } catch (e) {
      console.error('Failed to load call sign', e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      setWsUrl(WS_URL);
      return () => setWsUrl(undefined);
    }, [])
  );

  // Allow demo console controls to drive this screen
  useFocusEffect(
    useCallback(() => {
      registerDashboardUpdater({
        setPresence,
        setLastUpdate,
        setStatusMessage,
        setZone,
        setUnusualEvent,
      });
      return () => unregisterDashboardUpdater();
    }, [])
  );

  useWebSocket(wsUrl, (incoming: DashboardEvent) => {
    const data = incoming?.data as { present?: boolean } | undefined;
    if (data?.present !== undefined) {
      setPresence(Boolean(data.present));
      setIsLoading(false); // Data received, stop loading
    }
    if (incoming?.ts) {
      setLastUpdate(incoming.ts);
    }
  });

  const handleEmergencyComplete = () => {
    Alert.alert(
      "긴급 신고 완료",
      "긴급 신고가 접수되었습니다.",
      [{ text: "확인" }]
    );
  };

  const presenceLabel = useMemo(() => {
    if (unusualEvent?.detected) {
      return `⚠️ ${unusualEvent.description}`;
    }
    if (zone === "bedroom") return "안방에 있어요";
    if (zone === "living") return "거실에 있어요";
    if (zone === "bathroom") return "화장실을 이용하고 있어요";
    if (presence === false) return "집을 비웠습니다";
    if (presence === undefined) return "상태 확인 중…";
    return "집에 있어요";
  }, [presence, zone, unusualEvent]);

  // Ambient shadow color based on zone (Green-Scale Harmony)
  const ambientShadowColor = useMemo(() => {
    if (unusualEvent?.detected) return "#DC2626"; // Red for danger
    if (zone === "living") return "#88A837"; // Leaf Green (Active)
    if (zone === "bedroom") return "#436648"; // Pine Green (Rest)
    if (zone === "bathroom") return "#6B7D56"; // Sage Green (Clean)
    return "#000000"; // Default black shadow
  }, [zone, unusualEvent]);

  // Zone-themed dot color (Green-Scale Harmony)
  const zoneDotColor = useMemo(() => {
    if (unusualEvent?.detected) return "#DC2626"; // Red for danger (Keep alert color)
    if (zone === "living") return "#88A837"; // Leaf Green (Active)
    if (zone === "bedroom") return "#436648"; // Pine Green (Rest)
    if (zone === "bathroom") return "#6B7D56"; // Sage Green (Clean)
    return "transparent"; // No dot if no zone
  }, [zone, unusualEvent]);

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
      <View style={[styles.container, { paddingTop: dynamicPaddingTop, gap: dynamicGap }]}>
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <LiveIndicator active={!isLoading} />
            <Text style={styles.headerTitle}>실시간 위치</Text>
          </View>
        </View>

        <View style={[
          styles.card,
          {
            padding: dynamicCardPadding,
            gap: dynamicCardPadding,
            shadowColor: ambientShadowColor,
            shadowOpacity: unusualEvent?.detected ? 0.25 : 0.12,
            shadowRadius: unusualEvent?.detected ? 32 : 24,
          }
        ]}>
          <View style={styles.headerContent}>
            {isLoading ? (
              <>
                <Skeleton width={200} height={20} style={{ marginBottom: 8 }} />
                <Skeleton width={150} height={32} style={{ marginBottom: 8 }} />
                <Skeleton width={100} height={20} />
              </>
            ) : (
              <>
                <Text style={styles.primaryMessage}>{getGreeting(callSign)}</Text>

                <View style={styles.statusContainer}>
                  {zoneDotColor !== "transparent" && (
                    <View style={[styles.statusDot, { backgroundColor: zoneDotColor }]} />
                  )}
                  <FadeInView key={presenceLabel}>
                    <Text style={[
                      styles.statusText,
                      unusualEvent?.detected && styles.statusTextUnusual
                    ]}>
                      {presenceLabel}
                    </Text>
                  </FadeInView>
                </View>

                {statusMsg ? (
                  <FadeInView key={statusMsg}>
                    <Text style={styles.detailMessage}>{`${statusMsg} · ${formatTimestamp(lastUpdate)}`}</Text>
                  </FadeInView>
                ) : null}
              </>
            )}
          </View>

          <View style={styles.mapContainer}>
            {isLoading ? (
              <Skeleton width="100%" height="100%" borderRadius={28} />
            ) : (
              <FloorMapWithLocation zone={zone} isUnusual={unusualEvent?.detected} />
            )}
          </View>

          {isLoading ? (
            <Skeleton width={180} height={16} style={{ alignSelf: 'center', marginTop: 12 }} />
          ) : (
            <Text style={styles.updatedAt}>마지막 업데이트 · {formatTimestamp(lastUpdate)}</Text>
          )}
        </View>

        <LongPressButton
          onLongPressComplete={handleEmergencyComplete}
          holdDuration={4000}
          buttonMode="contained"
          buttonStyle={styles.emergencyButton}
          labelStyle={styles.emergencyLabel}
        >
          긴급 신고
        </LongPressButton>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    backgroundColor: theme.colors.background
  },
  header: {
    marginBottom: 0,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: theme.colors.primary,
    letterSpacing: -0.5,
  },
  card: {
    flex: 1,
    backgroundColor: theme.colors.surface,
    borderRadius: 32,
    shadowOffset: { width: 0, height: 12 },
    elevation: 4,
  },
  headerContent: {
    alignItems: "center",
    gap: 12,
    minHeight: 100, // Prevent layout jump
    justifyContent: 'center',
  },
  primaryMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.textSecondary,
    opacity: 0.8,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 22,
    fontWeight: "400",
    color: theme.colors.textPrimary,
    textAlign: "center",
  },
  statusTextUnusual: {
    color: "#DC2626",
    fontWeight: "700",
    fontSize: 20,
  },
  detailMessage: {
    fontSize: 22,
    color: theme.colors.textPrimary,
    textAlign: "center",
    marginTop: 4,
  },
  mapContainer: {
    flex: 1,
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    backgroundColor: theme.colors.surfaceVariant,
    justifyContent: "center",
    alignItems: "center",
  },
  updatedAt: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    textAlign: "center",
    marginTop: 12,
  },
  emergencyButton: {
    borderRadius: 18,
    paddingVertical: 6,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 12,
  },
  emergencyLabel: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  }
});
