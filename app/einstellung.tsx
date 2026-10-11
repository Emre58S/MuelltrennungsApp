// Datei: app/einstellung.tsx — Clean UI v6 (nutzt weiterhin den zentralen Storage)

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  getBoolean,
  removeItems,
  setBoolean,
  StorageKeys,
} from "@/utils/storage";

type IconName = React.ComponentProps<typeof Feather>["name"];

const C = {
  bg: "#0C1211",
  surface: "#141C1A",
  surfaceRaised: "#1A2522",
  border: "#25332F",
  borderSoft: "#1F2B28",
  text: "#F3F5F1",
  textSoft: "#C0C9C4",
  textMuted: "#83908A",
  green: "#3DA66B",
  greenSoft: "#D7F0E0",
  danger: "#D9827B",
  dangerBg: "rgba(217,130,123,0.1)",
  dangerBorder: "rgba(217,130,123,0.28)",
};

export default function EinstellungenScreen() {
  const insets = useSafeAreaInsets();
  const [soundEnabled, setSoundEnabled] = useState(true);

  useEffect(() => {
    let active = true;
    getBoolean(StorageKeys.SOUND_ENABLED, true).then((value) => {
      if (active) setSoundEnabled(value);
    });
    return () => {
      active = false;
    };
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
            Alert.alert(
              "Erledigt",
              "Dein gesamter Fortschritt wurde zurückgesetzt.",
            );
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
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        {/* Kopfbereich */}
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="chevron-left" size={24} color={C.text} />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.eyebrow}>APP</Text>
            <Text style={styles.title}>Einstellungen</Text>
            <Text style={styles.subtitle}>Passe das Spiel an dich an.</Text>
          </View>
        </View>

        {/* Allgemein */}
        <Text style={styles.sectionLabel}>ALLGEMEIN</Text>
        <View style={styles.group}>
          <View style={styles.row}>
            <View style={styles.iconChip}>
              <Feather
                name={soundEnabled ? "volume-2" : "volume-x"}
                size={18}
                color={C.greenSoft}
              />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Sound</Text>
              <Text style={styles.rowSubtitle}>
                {soundEnabled ? "Soundeffekte an" : "Soundeffekte aus"}
              </Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={toggleSound}
              trackColor={{ false: "#3A4642", true: C.green }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* Daten */}
        <Text style={styles.sectionLabel}>DATEN</Text>
        <View style={styles.group}>
          <ActionRow
            icon="trash-2"
            title="Highscores zurücksetzen"
            subtitle="Löscht alle Bestwerte"
            onPress={resetHighscores}
          />
          <View style={styles.separator} />
          <ActionRow
            icon="alert-triangle"
            title="Fortschritt zurücksetzen"
            subtitle="XP, Level, Streak und Highscores"
            danger
            onPress={resetProgress}
          />
        </View>

        {/* Konto */}
        <Text style={styles.sectionLabel}>KONTO</Text>
        <View style={styles.group}>
          <ActionRow
            icon="log-out"
            title="Ausloggen"
            subtitle="Von diesem Gerät abmelden"
            danger
            onPress={confirmLogout}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function ActionRow({
  icon,
  title,
  subtitle,
  danger,
  onPress,
}: {
  icon: IconName;
  title: string;
  subtitle: string;
  danger?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={[styles.iconChip, danger && styles.iconChipDanger]}>
        <Feather
          name={icon}
          size={18}
          color={danger ? C.danger : C.greenSoft}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, danger && { color: C.danger }]}>
          {title}
        </Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={C.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 26 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.3,
  },
  title: {
    color: C.text,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  subtitle: { color: C.textSoft, fontSize: 12, marginTop: 3 },

  sectionLabel: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 9,
    marginLeft: 4,
  },
  group: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: "hidden",
    marginBottom: 24,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowPressed: { backgroundColor: "rgba(255,255,255,0.03)" },
  separator: {
    height: 1,
    backgroundColor: C.borderSoft,
    marginLeft: 66,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  iconChipDanger: {
    backgroundColor: C.dangerBg,
    borderColor: C.dangerBorder,
  },
  rowText: { flex: 1 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: "800" },
  rowSubtitle: { color: C.textMuted, fontSize: 11, marginTop: 2 },

  pressed: { opacity: 0.85, transform: [{ scale: 0.993 }] },
});
