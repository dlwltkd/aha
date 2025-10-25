import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Button, IconButton, Switch, Text, TextInput } from "react-native-paper";
import Slider from "@react-native-community/slider";
import Constants from "expo-constants";
import { useNavigation } from "@react-navigation/native";

import { theme } from "../theme";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [wsUrl, setWsUrl] = useState(Constants?.expoConfig?.extra?.wsUrl ?? "ws://192.168.45.200:8080/ws");
  const [apiBase, setApiBase] = useState(Constants?.expoConfig?.extra?.apiBase ?? "http://192.168.45.200:8080");
  const [livingLight, setLivingLight] = useState(true);
  const [doorwayLight, setDoorwayLight] = useState(false);
  const [nightMode, setNightMode] = useState(true);
  const [audioLevel, setAudioLevel] = useState(0.6);

  return (
    <View style={styles.safeArea}>
      <View style={styles.headerRow}>
        <IconButton icon="chevron-left" size={28} iconColor={theme.colors.primary} onPress={() => navigation.goBack()} />
        <Text style={styles.headerTitle}>기능 설정</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.leadText}>기능과 스피커의 음량을 조절해주세요</Text>

        <SettingCard
          label="스포트라이트 이동 유도  "
          description={"조명이 부드럽게 회전하며 문쪽으로\n밝아져 이동을 유도합니다."}
          value={livingLight}
          onValueChange={setLivingLight}
        />

        <SettingCard
          label="문간 스포트라이트"
          description="침실/욕실 노드의 LED를 자동으로 전환합니다."
          value={doorwayLight}
          onValueChange={setDoorwayLight}
        />

        <SettingCard
          label="야간 모드"
          description="00시 이후 알림을 진동으로 표시합니다."
          value={nightMode}
          onValueChange={setNightMode}
        />

        <View style={styles.sliderCard}>
          <IconButton icon="volume-medium" size={28} iconColor={theme.colors.primary} />
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={1}
            minimumTrackTintColor={theme.colors.primary}
            maximumTrackTintColor="#C7BDA6"
            thumbTintColor={theme.colors.primary}
            value={audioLevel}
            onValueChange={setAudioLevel}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>연결 정보</Text>
          <TextInput
            mode="outlined"
            label="WebSocket URL"
            value={wsUrl}
            onChangeText={setWsUrl}
            style={styles.input}
            outlineColor="#E1D8C3"
            activeOutlineColor={theme.colors.primary}
          />
          <TextInput
            mode="outlined"
            label="API Base URL"
            value={apiBase}
            onChangeText={setApiBase}
            style={styles.input}
            outlineColor="#E1D8C3"
            activeOutlineColor={theme.colors.primary}
          />
          <Text style={styles.helper}>
            FastAPI 백엔드가 준비되면 이 값을 영구 저장합니다. 그 전까지는 <Text style={styles.mono}>app.config.ts</Text> 또는
            환경 변수에서 수정해주세요.
          </Text>
        </View>

        <Button mode="contained" style={styles.cta} labelStyle={styles.ctaLabel} onPress={() => {}}>
          설정완료
        </Button>
      </ScrollView>
    </View>
  );
}

type SettingCardProps = {
  label: string;
  description: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingCard({ label, description, value, onValueChange }: SettingCardProps) {
  return (
    <View style={styles.settingCard}>
      <View>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardDescription}>{description}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} color={theme.colors.primary} />
    </View>
  );
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
  leadText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 8
  },
  settingCard: {
    backgroundColor: "#E9DCC4",
    padding: 20,
    borderRadius: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  cardLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937"
  },
  cardDescription: {
    fontSize: 13,
    color: "#8A8A8A",
    marginTop: 4
  },
  sliderCard: {
    backgroundColor: "#E9DCC4",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2
  },
  slider: {
    flex: 1,
    height: 40
  },
  section: {
    gap: 12,
    marginTop: 8
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1F2937"
  },
  input: {
    backgroundColor: "#fff",
    borderRadius: 16
  },
  helper: {
    fontSize: 13,
    color: "#7C7C7C",
    lineHeight: 18
  },
  mono: {
    fontFamily: "monospace"
  },
  cta: {
    borderRadius: 18,
    marginTop: 12,
    paddingVertical: 4
  },
  ctaLabel: {
    fontSize: 16,
    fontWeight: "600"
  }
});
