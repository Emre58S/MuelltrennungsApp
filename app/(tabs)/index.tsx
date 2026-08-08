// Datei: app/(tabs)/index.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

const HIGHSCORE_KEY = "muell_sortieren_highscore";

export default function HomeScreen() {
  const [highscore, setHighscore] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      AsyncStorage.getItem(HIGHSCORE_KEY).then((value) => {
        if (value) setHighscore(parseInt(value, 10));
      });
    }, []),
  );

  const handleLogout = () => {
    router.replace("/login");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>♻️</Text>
      <Text style={styles.title}>Müll Sortieren</Text>
      <Text style={styles.subtitle}>DEUTSCHLAND</Text>
      <Text style={styles.highscore}>🏆 Highscore: {highscore}</Text>

      <View style={styles.menu}>
        <MenuButton
          emoji="🎮"
          label="Spielen"
          color="#2ECC71"
          onPress={() => router.push("/(tabs)/explore")}
        />
        <MenuButton
          emoji="📖"
          label="Tutorial"
          color="#3B82F6"
          onPress={() => router.push("/tutorial")}
        />
        <MenuButton
          emoji="🏆"
          label="Modi"
          color="#A855F7"
          onPress={() => router.push("/modi")}
        />
        <MenuButton
          emoji="⚙️"
          label="Einstellungen"
          color="#6366F1"
          onPress={() => router.push("/einstellung")}
        />
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutEmoji}>🚪</Text>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function MenuButton({
  emoji,
  label,
  color,
  onPress,
}: {
  emoji: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.menuButton, { backgroundColor: color }]}
      onPress={onPress}
    >
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: 24,
  },
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2ECC71",
    letterSpacing: 4,
    marginTop: 4,
  },
  highscore: {
    color: "#F5C518",
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
    marginBottom: 36,
  },
  menu: { width: "100%", gap: 16 },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: 18,
    gap: 12,
  },
  menuEmoji: { fontSize: 20 },
  menuLabel: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    paddingVertical: 18,
    gap: 12,
    backgroundColor: "#1E2A45",
    borderWidth: 1,
    borderColor: "#2A3A5C",
  },
  logoutEmoji: { fontSize: 18 },
  logoutText: { color: "#EF4444", fontSize: 17, fontWeight: "700" },
});
