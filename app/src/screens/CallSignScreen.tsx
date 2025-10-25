import { useState } from "react";
import { SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Text } from "react-native-paper";
import { useNavigation } from "@react-navigation/native";

import { theme } from "../theme";

export default function CallSignScreen() {
  const navigation = useNavigation();
  const [name, setName] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backSymbol}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>호칭 설정</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.prompt}>대상자의 호칭을 적어주세요</Text>
        <TextInput
          style={styles.input}
          placeholder="예) 엄마, 아빠, 00씨"
          placeholderTextColor="#B8B8B8"
          value={name}
          onChangeText={setName}
        />
      </View>
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
    paddingHorizontal: 0 ,
    paddingTop: 35,
    gap: 12
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center"
  },
  backSymbol: {
    fontSize: 32,
    color: theme.colors.primary,
    lineHeight: 32
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: theme.colors.primary
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "flex-start",
    paddingTop: 60
  },
  prompt: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    marginBottom: 24
  },
  input: {
    borderBottomWidth: 1.5,
    borderColor: "#D5D5D5",
    paddingVertical: 12,
    fontSize: 18,
    textAlign: "center",
    color: "#111827"
  }
});
