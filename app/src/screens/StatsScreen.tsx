import { useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import Svg, { Circle, Defs, LinearGradient, Stop } from "react-native-svg";

import { theme } from "../theme";

type Mode = "weekly" | "monthly";

type StatSlice = {
  label: string;
  total: number;
  ratio: number;
};

const WEEKLY_LABELS = ["10월 1주", "10월 2주", "10월 3주", "10월 4주"];
const MONTHLY_LABELS = ["7월", "8월", "9월", "10월"];

export default function StatsScreen() {
  const navigation = useNavigation();
  const [mode, setMode] = useState<Mode>("weekly");
  const [periodIndex, setPeriodIndex] = useState(3);

  const periodLabel = mode === "weekly" ? WEEKLY_LABELS[periodIndex] : MONTHLY_LABELS[periodIndex];

  const stats = useMemo(() => buildStats(mode, periodIndex), [mode, periodIndex]);

  const handlePrev = () => {
    if (periodIndex > 0) {
      setPeriodIndex(periodIndex - 1);
    }
  };

  const handleNext = () => {
    const max = mode === "weekly" ? WEEKLY_LABELS.length - 1 : MONTHLY_LABELS.length - 1;
    if (periodIndex < max) {
      setPeriodIndex(periodIndex + 1);
    }
  };

  const toggleMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setPeriodIndex(next === "weekly" ? WEEKLY_LABELS.length - 1 : MONTHLY_LABELS.length - 1);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerRow}>
        <IconButton icon="chevron-left" size={28} iconColor={theme.colors.primary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>시간대 통계량</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.segmentRow}>
          <ModeChip label="주별" active={mode === "weekly"} onPress={() => toggleMode("weekly")} />
          <ModeChip label="월별" active={mode === "monthly"} onPress={() => toggleMode("monthly")} />
        </View>

        <View style={styles.periodRow}>
          <TouchableOpacity onPress={handlePrev} disabled={periodIndex === 0} style={styles.arrowButton}>
            <IconButton icon="chevron-left" size={20} iconColor={periodIndex === 0 ? "#D3D3D3" : "#8A8A8A"} />
          </TouchableOpacity>
          <Text style={styles.periodLabel}>{periodLabel}</Text>
          <TouchableOpacity
            onPress={handleNext}
            disabled={periodIndex === (mode === "weekly" ? WEEKLY_LABELS.length - 1 : MONTHLY_LABELS.length - 1)}
            style={styles.arrowButton}
          >
            <IconButton
              icon="chevron-right"
              size={20}
              iconColor={
                periodIndex === (mode === "weekly" ? WEEKLY_LABELS.length - 1 : MONTHLY_LABELS.length - 1)
                  ? "#D3D3D3"
                  : "#8A8A8A"
              }
            />
          </TouchableOpacity>
        </View>

        {stats.map(stat => (
          <View key={stat.label} style={styles.statRow}>
            <View style={styles.statCard}>
              <View style={styles.statLabelWrap}>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </View>
              <View style={styles.statTotalWrap}>
                <Text style={styles.statTotalLabel}>총 횟수</Text>
                <View style={styles.statTotalBadge}>
                  <Text style={styles.statTotalValue}>{stat.total}</Text>
                </View>
              </View>
            </View>
            <Donut progress={stat.ratio} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

type ModeChipProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

function ModeChip({ label, active, onPress }: ModeChipProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
      <View style={[styles.modeChip, active ? styles.modeChipActive : styles.modeChipInactive]}>
        <Text style={[styles.modeChipText, active ? styles.modeChipTextActive : styles.modeChipTextInactive]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Donut({ progress }: { progress: number }) {
  const size = 130;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * progress;
  return (
    <Svg width={size} height={size}>
      <Defs>
        <LinearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#92a84b" />
          <Stop offset="100%" stopColor="#4d6625" />
        </LinearGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#E1D8C3" strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#grad)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
      <Circle cx={size / 2} cy={size / 2} r={radius - strokeWidth + 8} fill="#FFFFFF" />
    </Svg>
  );
}

function buildStats(mode: Mode, index: number): StatSlice[] {
  const base = mode === "weekly" ? index + 1 : (index + 1) * 5;
  return [
    { label: "거실 방문 시간대", total: 10 + base, ratio: clampRatio(0.45 + base * 0.03) },
    { label: "화장실 이용 시간대", total: 13 + base, ratio: clampRatio(0.35 + base * 0.02) },
    { label: "안방 퇴실 시간대", total: 11 + base, ratio: clampRatio(0.55 + base * 0.01) }
  ];
}

function clampRatio(value: number) {
  return Math.max(0.1, Math.min(1, value));
}

function buildCalendarMatrix(date: Date): (Date | null)[][] {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  const startOffset = firstDay.getDay();
  const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const matrix: (Date | null)[][] = [];
  let currentDay = 1 - startOffset;
  for (let week = 0; week < 6; week++) {
    const row: (Date | null)[] = [];
    for (let day = 0; day < 7; day++) {
      if (currentDay < 1 || currentDay > daysInMonth) {
        row.push(null);
      } else {
        row.push(new Date(date.getFullYear(), date.getMonth(), currentDay));
      }
      currentDay++;
    }
    matrix.push(row);
  }
  return matrix;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingTop: 25
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: theme.colors.primary
  },
  content: {
    padding: 24,
    gap: 18,
    paddingBottom: 48
  },
  segmentRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 8
  },
  modeChip: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 2
  },
  modeChipActive: {
    backgroundColor: theme.colors.primary
  },
  modeChipInactive: {
    backgroundColor: "#E1D8C3"
  },
  modeChipText: {
    fontWeight: "600"
  },
  modeChipTextActive: {
    color: "#FFFFFF"
  },
  modeChipTextInactive: {
    color: "#444444"
  },
  periodRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12
  },
  arrowButton: {
    borderRadius: 20
  },
  periodLabel: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  datePill: {
    backgroundColor: "#E9DCC4",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 2
  },
  dateText: {
    fontWeight: "700",
    fontSize: 16,
    color: "#1F2937"
  },
  dateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 16,
    paddingHorizontal: 18,
    paddingVertical: 10
  },
  dateButtonLabel: {
    color: theme.colors.onPrimary,
    fontWeight: "600"
  },
  calendarCard: {
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    padding: 16,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 2
  },
  calendarHeader: {
    marginBottom: 12
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937"
  },
  weekRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6
  },
  weekLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    color: "#999"
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 10,
    marginHorizontal: 2,
    borderRadius: 12
  },
  dayCellSelected: {
    backgroundColor: "#E1E7D5"
  },
  dayLabel: {
    fontSize: 15,
    color: "#1F2937"
  },
  dayLabelSelected: {
    fontWeight: "700",
    color: theme.colors.primary
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingVertical: 6
  },
  statCard: {
    flex: 1,
    marginRight: 16,
    backgroundColor: "#E9DCC4",
    borderRadius: 28,
    paddingVertical: 14,
    paddingHorizontal: 18,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  statLabelWrap: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 999,
    alignSelf: "flex-start",
    marginBottom: 16
  },
  statLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  statTotalWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  statTotalLabel: {
    fontSize: 14,
    color: "#5B4C3B",
    fontWeight: "600"
  },
  statTotalBadge: {
    backgroundColor: "#FFFFFF",
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6
  },
  statTotalValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1F2937"
  },
  timelineCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 28,
    padding: 20,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 2
  },
  timelineLine: {
    width: 2,
    backgroundColor: theme.colors.primary,
    marginRight: 18,
    borderRadius: 1
  },
  timelineContent: {
    flex: 1,
    gap: 16
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#D7D3CA",
    marginTop: 4
  },
  timelineTexts: {
    flex: 1
  },
  timelineTime: {
    fontSize: 13,
    color: "#6B7280",
    marginBottom: 2
  },
  timelineDesc: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F172A"
  }
});
