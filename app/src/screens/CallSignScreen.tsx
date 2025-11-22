import { useState, useEffect, useRef } from "react";
import { SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View, Animated } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../theme";
import VoiceRecordingModal from "../components/VoiceRecordingModal";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FadeInView } from "../components/FadeInView";
import { MaterialCommunityIcons } from "@expo/vector-icons";

export default function CallSignScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadName();
  }, []);

  const loadName = async () => {
    try {
      const savedName = await AsyncStorage.getItem('userCallSign');
      if (savedName) {
        setName(savedName);
      }
    } catch (e) {
      console.error('Failed to load name', e);
    }
  };

  const handleTextChange = (newName: string) => {
    setName(newName);
    setShowSaved(false);

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem('userCallSign', newName);
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      } catch (e) {
        console.error('Failed to save name', e);
      }
    }, 800); // Debounce save
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <MaterialCommunityIcons name="chevron-left" size={32} color={theme.colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>호칭 설정</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>대상자의 호칭을 적어주세요</Text>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="예) 엄마, 아빠, 00씨"
            placeholderTextColor="#9CA3AF"
            value={name}
            onChangeText={handleTextChange}
          />
          {showSaved && (
            <View style={styles.savedIndicator}>
              <MaterialCommunityIcons name="check" size={16} color={theme.colors.primary} />
              <Text style={styles.savedText}>저장됨</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.voiceButton}
          onPress={() => setIsModalVisible(true)}
        >
          <MaterialCommunityIcons name="microphone" size={20} color={theme.colors.primary} style={{ marginRight: 8 }} />
          <Text style={styles.voiceButtonText}>목소리 등록하기</Text>
        </TouchableOpacity>
      </View>

      <VoiceRecordingModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        targetName={name}
      />
    </SafeAreaView>
  );
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
    height: 60,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.primary
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  prompt: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1F2937",
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: -0.5,
  },
  inputContainer: {
    backgroundColor: "#F3F4F6",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginBottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  input: {
    fontSize: 18,
    color: "#111827",
    flex: 1,
    fontWeight: "500",
  },
  savedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  savedText: {
    fontSize: 12,
    color: theme.colors.primary,
    fontWeight: "600",
  },
  voiceButton: {
    flexDirection: 'row',
    backgroundColor: "#FFFFFF",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 8,
  },
  voiceButtonText: {
    color: theme.colors.primary,
    fontSize: 16,
    fontWeight: "600"
  }
});
