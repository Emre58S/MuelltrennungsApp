// Datei: app/(tabs)/index.tsx — HomeScreen mit Streak + XP
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";
import {
  getBestHighscore,
  getNumber,
  getStreakData,
  getLevelTitle,
  StorageKeys,
} from "@/utils/storage";

export default function HomeScreen() {
  const [highscore, setHighscore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        const [hs, streakData, lvl, xp] = await Promise.all([
          getBestHighscore(),
          getStreakData(),
          getNumber(StorageKeys.LEVEL),
          getNumber(StorageKeys.TOTAL_XP),
        ]);
        setHighscore(hs);
        setStreak(streakData.count);
        setLevel(lvl || 1);
        setTotalXP(xp);
      }
      loadData();
    }, []),
  );

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
      <Text style={styles.logo}>♻️</Text>
      <Text style={styles.title}>Müll Sortieren</Text>
      <Text style={styles.subtitle}>DEUTSCHLAND</Text>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🔥</Text>
          <Text style={styles.statValue}>{streak}</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>⭐</Text>
          <Text style={styles.statValue}>{totalXP}</Text>
          <Text style={styles.statLabel}>XP</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statEmoji}>🏆</Text>
          <Text style={styles.statValue}>{highscore}</Text>
          <Text style={styles.statLabel}>Highscore</Text>
        </View>
      </View>

      {/* Level Badge */}
      <View style={styles.levelBadge}>
        <Text style={styles.levelText}>
          Level {level} — {getLevelTitle(level)}
        </Text>
      </View>

      {/* Menu */}
      <View style={styles.menu}>
        <MenuButton
          emoji="🎮"
          label="Spielen"
          color={AppColors.green}
          onPress={() => router.push("/modi")}
        />
        <MenuButton
          emoji="📖"
          label="Tutorial"
          color={AppColors.blue}
          onPress={() => router.push("/tutorial")}
        />
        <MenuButton
          emoji="⚙️"
          label="Einstellungen"
          color={AppColors.indigo}
          onPress={() => router.push("/einstellung")}
        />
        <TouchableOpacity style={styles.logoutButton} onPress={confirmLogout}>
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
      activeOpacity={0.8}
    >
      <Text style={styles.menuEmoji}>{emoji}</Text>
      <Text style={styles.menuLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
    alignItems: "center",
    paddingTop: 70,
    paddingHorizontal: Spacing.lg,
  },
  logo: { fontSize: 64, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.hero, fontWeight: "800", color: AppColors.textPrimary },
  subtitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: AppColors.green,
    letterSpacing: 4,
    marginTop: Spacing.xs,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  statEmoji: { fontSize: 20, marginBottom: 2 },
  statValue: {
    color: AppColors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: "800",
  },
  statLabel: {
    color: AppColors.textMuted,
    fontSize: FontSize.xs,
    fontWeight: "600",
  },
  // Level
  levelBadge: {
    backgroundColor: AppColors.card,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  levelText: {
    color: AppColors.yellow,
    fontSize: FontSize.sm,
    fontWeight: "700",
  },
  // Menu
  menu: { width: "100%", gap: Spacing.md },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl - 14,
    gap: Spacing.sm + 4,
  },
  menuEmoji: { fontSize: 20 },
  menuLabel: {
    color: AppColors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: "700",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.xl,
    paddingVertical: Spacing.xl - 14,
    gap: Spacing.sm + 4,
    backgroundColor: AppColors.cardLight,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  logoutEmoji: { fontSize: 18 },
  logoutText: { color: AppColors.red, fontSize: 17, fontWeight: "700" },
});
