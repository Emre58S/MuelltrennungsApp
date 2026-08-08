// Datei: app/einstellungen.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const SOUND_KEY = "muell_sortieren_sound_enabled";

export default function EinstellungenScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  React.useEffect(() => {
    AsyncStorage.getItem(SOUND_KEY).then((value) => {
      if (value !== null) setSoundEnabled(value === "true");
    });
  }, []);

  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    AsyncStorage.setItem(SOUND_KEY, value.toString());
  };

  const resetHighscores = () => {
    Alert.alert(
      "Highscores zurücksetzen?",
      "Alle gespeicherten Bestwerte werden unwiderruflich gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Zurücksetzen",
          style: "destructive",
          onPress: async () => {
            await AsyncStorage.multiRemove([
              "muell_sortieren_highscore_runden",
              "muell_sortieren_highscore_zeit",
              "muell_sortieren_highscore_endlos",
            ]);
            Alert.alert("Erledigt", "Alle Highscores wurden zurückgesetzt.");
          },
        },
      ],
    );
  };

  const confirmLogout = () => {
    Alert.alert("Ausloggen?", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => router.replace("/login"),
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>⚙️</Text>
      <Text style={styles.title}>Einstellungen</Text>

      <View style={styles.row}>
        <Text style={styles.rowLabel}>🔊 Sound</Text>
        <Switch
          value={soundEnabled}
          onValueChange={toggleSound}
          trackColor={{ false: "#4B5563", true: "#2ECC71" }}
          thumbColor="#FFFFFF"
        />
      </View>

      <TouchableOpacity style={styles.actionRow} onPress={resetHighscores}>
        <Text style={styles.actionLabel}>🗑️ Highscores zurücksetzen</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionRow} onPress={confirmLogout}>
        <Text style={[styles.actionLabel, { color: "#EF4444" }]}>
          🚪 Logout
        </Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.back()}>
        <Text style={styles.backText}>Zurück zum Menü</Text>
      </TouchableOpacity>
    </View>
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
  logo: { fontSize: 48, marginBottom: 8 },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 40,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#151E32",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  rowLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  actionRow: {
    width: "100%",
    backgroundColor: "#151E32",
    borderRadius: 16,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  actionLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "600" },
  backText: {
    color: "#9AA7C2",
    textAlign: "center",
    marginTop: 24,
    fontSize: 14,
  },
});
