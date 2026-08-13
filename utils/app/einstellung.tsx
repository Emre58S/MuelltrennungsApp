// Datei: app/einstellung.tsx — uses centralized storage
import { router } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";
import { getBoolean, setBoolean, removeItems, StorageKeys } from "@/utils/storage";

export default function EinstellungenScreen() {
  const [soundEnabled, setSoundEnabled] = useState(true);

  React.useEffect(() => {
    getBoolean(StorageKeys.SOUND_ENABLED, true).then(setSoundEnabled);
  }, []);

  const toggleSound = (value: boolean) => {
    setSoundEnabled(value);
    setBoolean(StorageKeys.SOUND_ENABLED, value);
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
            await removeItems([
              StorageKeys.HIGHSCORE_RUNDEN,
              StorageKeys.HIGHSCORE_ZEIT,
              StorageKeys.HIGHSCORE_ENDLOS,
            ]);
            Alert.alert("Erledigt", "Alle Highscores wurden zurückgesetzt.");
          },
        },
      ],
    );
  };

  const resetProgress = () => {
    Alert.alert(
      "Gesamten Fortschritt zurücksetzen?",
      "XP, Level, Streak und Highscores werden gelöscht.",
      [
        { text: "Abbrechen", style: "cancel" },
        {
          text: "Alles zurücksetzen",
          style: "destructive",
          onPress: async () => {
            await removeItems([
              StorageKeys.HIGHSCORE_RUNDEN,
              StorageKeys.HIGHSCORE_ZEIT,
              StorageKeys.HIGHSCORE_ENDLOS,
              StorageKeys.TOTAL_XP,
              StorageKeys.LEVEL,
              StorageKeys.STREAK_COUNT,
              StorageKeys.STREAK_LAST_DATE,
              StorageKeys.TOTAL_CORRECT,
              StorageKeys.TOTAL_PLAYED,
            ]);
            Alert.alert("Erledigt", "Dein gesamter Fortschritt wurde zurückgesetzt.");
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
          trackColor={{ false: "#4B5563", true: AppColors.green }}
          thumbColor="#FFFFFF"
        />
      </View>

      <TouchableOpacity style={styles.actionRow} onPress={resetHighscores}>
        <Text style={styles.actionLabel}>🗑️ Highscores zurücksetzen</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionRow} onPress={resetProgress}>
        <Text style={styles.actionLabel}>⚠️ Gesamten Fortschritt zurücksetzen</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionRow} onPress={confirmLogout}>
        <Text style={[styles.actionLabel, { color: AppColors.red }]}>🚪 Logout</Text>
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
    backgroundColor: AppColors.bg,
    alignItems: "center",
    paddingTop: 90,
    paddingHorizontal: Spacing.lg,
  },
  logo: { fontSize: 48, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.title, fontWeight: "800", color: AppColors.textPrimary, marginBottom: 40 },
  row: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: Spacing.md,
  },
  rowLabel: { color: AppColors.textPrimary, fontSize: FontSize.lg, fontWeight: "600" },
  actionRow: {
    width: "100%",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: Spacing.md,
  },
  actionLabel: { color: AppColors.textPrimary, fontSize: FontSize.lg, fontWeight: "600" },
  backText: { color: AppColors.textSecondary, textAlign: "center", marginTop: Spacing.lg, fontSize: FontSize.md },
});
