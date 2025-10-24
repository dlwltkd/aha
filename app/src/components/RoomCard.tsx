import { StyleSheet } from "react-native";
import { Button, Card, Text } from "react-native-paper";

import { theme } from "@/theme";

type Props = {
  room: string;
  status: "on" | "off" | "dimmed";
  onPress: () => void;
};

const statusLabel: Record<Props["status"], string> = {
  on: "Lighting: On",
  off: "Lighting: Off",
  dimmed: "Lighting: Dimmed"
};

export function RoomCard({ room, status, onPress }: Props) {
  return (
    <Card style={styles.card}>
      <Card.Title title={room} />
      <Card.Content>
        <Text variant="bodyMedium">{statusLabel[status]}</Text>
      </Card.Content>
      <Card.Actions>
        <Button mode="outlined" onPress={onPress}>
          Toggle
        </Button>
      </Card.Actions>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    marginBottom: 12,
    backgroundColor: theme.colors.surface
  }
});
