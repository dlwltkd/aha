import { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { IconButton, Text } from "react-native-paper";
import { useNavigation, useFocusEffect } from "@react-navigation/native";

import { theme } from "../theme";
import { getEventsByDate, type TimelineEvent } from "../services/eventStorage";

type TimelineEntry = {
  time: string;
  description: string;
};

export default function TimelineScreen() {
  const navigation = useNavigation();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [events, setEvents] = useState<TimelineEntry[]>([]);

  // Load events when  screen is focused or date changes
  useFocusEffect(
    useCallback(() => {
      loadEvents();
    }, [selectedDate])
  );

  const loadEvents = async () => {
    const eventData = await getEventsByDate(selectedDate);
    const formatted = eventData.map(event => ({
      time: formatTime(event.timestamp),
      description: event.description,
    }));
    setEvents(formatted);
  };

  const calendarMatrix = useMemo(() => buildCalendarMatrix(selectedDate), [selectedDate]);
  const formattedDate = formatDate(selectedDate);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <IconButton icon="chevron-left" size={28} iconColor={theme.colors.primary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>타임라인</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.dateRow}>
          <View style={styles.datePill}>
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <TouchableOpacity style={styles.dateButton} onPress={() => setCalendarVisible(prev => !prev)}>
            <Text style={styles.dateButtonLabel}>날짜 선택</Text>
          </TouchableOpacity>
        </View>

        {calendarVisible && (
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <Text style={styles.calendarTitle}>
                {selectedDate.getFullYear()}년 {selectedDate.getMonth() + 1}월
              </Text>
            </View>
            <View style={styles.weekRow}>
              {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
                <Text key={day} style={styles.weekLabel}>
                  {day}
                </Text>
              ))}
            </View>
            {calendarMatrix.map((week, idx) => (
              <View key={idx} style={styles.weekRow}>
                {week.map((day, dayIdx) => {
                  const isCurrent = day?.toDateString() === selectedDate.toDateString();
                  return (
                    <TouchableOpacity
                      key={dayIdx}
                      style={[styles.dayCell, isCurrent && styles.dayCellSelected]}
                      disabled={!day}
                      onPress={() => day && setSelectedDate(day)}
                    >
                      <Text style={[styles.dayLabel, isCurrent && styles.dayLabelSelected]}>{day?.getDate() ?? ""}</Text>
                    </TouchableOpacity>
                  );
                })};
              </View>
            ))}
          </View>
        )}

        <View style={styles.timelineCard}>
          {events.length > 0 ? (
            <>
              <View style={styles.timelineLine} />
              <View style={styles.timelineContent}>
                {events.map((entry, idx) => (
                  <View key={`${formattedDate}-${idx}`} style={styles.timelineRow}>
                    <View style={styles.dot} />
                    <View style={styles.timelineTexts}>
                      <Text style={styles.timelineTime}>{entry.time}</Text>
                      <Text style={styles.timelineDesc}>{entry.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>이 날짜에 기록된 이벤트가 없습니다</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function formatDate(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(
    2,
    "0"
  )}`;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.primary
  },
  content: {
    padding: 24,
    gap: 18,
    paddingBottom: 48
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
  timelineCard: {
    flexDirection: "row",
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
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 15,
    color: "#9CA3AF",
    textAlign: "center",
  },
});
