import { useCallback, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Card, Chip, Text } from "react-native-paper";
import Constants from "expo-constants";
import { useFocusEffect, useNavigation } from "@react-navigation/native";

import { theme } from "@/theme";
import { useWebSocket } from "@/hooks/useWebSocket";
import { RoomCard } from "@/components/RoomCard";

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
  const [events, setEvents] = useState<DashboardEvent[]>([]);
  const [presence, setPresence] = useState<boolean | undefined>(undefined);
  const [wsUrl, setWsUrl] = useState<string | undefined>(undefined);

  useFocusEffect(
    useCallback(() => {
      setWsUrl(WS_URL);
      return () => setWsUrl(undefined);
    }, [])
  );

  useWebSocket(wsUrl, (incoming: DashboardEvent) => {
    setEvents(prev => [incoming, ...prev].slice(0, 20));

    const data = incoming?.data as { present?: boolean } | undefined;
    if (data?.present !== undefined) {
      setPresence(Boolean(data.present));
    }
  });

  const presenceChip = useMemo(() => {
    if (presence === undefined) {
      return <Chip style={styles.chip}>Unknown</Chip>;
    }
    return (
      <Chip icon={presence ? "account" : "account-off"} style={styles.chip} selected={presence} onPress={() => {}}>
        {presence ? "Living room: occupied" : "Living room: empty"}
      </Chip>
    );
  }, [presence]);

  const handleNavigateSettings = () => {
    navigation.navigate("Settings" as never);
  };

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.Content title="Home Vision" />
        <Appbar.Action icon="cog" onPress={handleNavigateSettings} />
      </Appbar.Header>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Title title="Presence" subtitle="Real-time status" />
          <Card.Content>{presenceChip}</Card.Content>
        </Card>

        <View style={styles.rooms}>
          <RoomCard room="Bedroom" status="off" onPress={() => {}} />
          <RoomCard room="Bathroom" status="off" onPress={() => {}} />
        </View>

        <Card style={styles.card}>
          <Card.Title title="Recent Events" subtitle="Latest MQTT → WS messages" />
          <Card.Content>
            {events.length === 0 ? (
              <Text variant="bodyMedium" style={styles.empty}>
                Waiting for activity…
              </Text>
            ) : (
              events.map((evt, index) => (
                <View key={`${evt.topic}-${index}`} style={styles.eventRow}>
                  <Text variant="labelMedium" style={styles.eventTopic}>
                    {evt.topic ?? evt.event ?? "event"}
                  </Text>
                  <Text variant="bodySmall" style={styles.eventTime}>
                    {formatTimestamp(evt.ts)}
                  </Text>
                </View>
              ))
            )}
          </Card.Content>
          <Card.Actions>
            <Button onPress={() => setEvents([])}>Clear</Button>
          </Card.Actions>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    padding: 16,
    gap: 16
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16
  },
  rooms: {
    gap: 12
  },
  chip: {
    alignSelf: "flex-start"
  },
  empty: {
    color: theme.colors.onSurfaceVariant
  },
  eventRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: theme.colors.outlineVariant
  },
  eventTopic: {
    maxWidth: "65%"
  },
  eventTime: {
    color: theme.colors.onSurfaceVariant
  }
});
