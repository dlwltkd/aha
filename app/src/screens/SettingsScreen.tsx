import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Appbar, Button, Text, TextInput } from "react-native-paper";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";

import { theme } from "@/theme";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [wsUrl, setWsUrl] = useState<string>(
    Constants?.expoConfig?.extra?.wsUrl ?? "ws://192.168.45.200:8080/ws"
  );
  const [apiBase, setApiBase] = useState<string>(
    Constants?.expoConfig?.extra?.apiBase ?? "http://192.168.45.200:8080"
  );

  return (
    <View style={styles.container}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="titleMedium">Connections</Text>
        <TextInput
          mode="outlined"
          label="WebSocket URL"
          value={wsUrl}
          onChangeText={setWsUrl}
          autoCapitalize="none"
        />
        <TextInput
          mode="outlined"
          label="API Base URL"
          value={apiBase}
          onChangeText={setApiBase}
          autoCapitalize="none"
        />
        <Button mode="contained" onPress={() => {}} style={styles.button}>
          Save (coming soon)
        </Button>
        <Text variant="bodySmall" style={styles.helper}>
          Persisting configuration will be wired once the FastAPI backend is available. For now,
          update the values in <Text style={styles.mono}>app.config.ts</Text> or environment.
        </Text>
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
  button: {
    marginTop: 12
  },
  helper: {
    color: theme.colors.onSurfaceVariant
  },
  mono: {
    fontFamily: "monospace"
  }
});
