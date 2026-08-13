// Datei: app/(tabs)/index.tsx — Premium Home Screen
import { AppColors } from "@/constants/theme";
import {
  getBestHighscore,
  getLevelTitle,
  getNumber,
  getStreakData,
  getXPForLevel,
  StorageKeys,
} from "@/utils/storage";
import { router, useFocusEffect } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

export default function HomeScreen() {
  const [highscore, setHighscore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalXP, setTotalXP] = useState(0);

  useFocusEffect(
    React.useCallback(() => {
      async function loadData() {
        const [hs, sd, lvl, xp] = await Promise.all([
          getBestHighscore(),
          getStreakData(),
          getNumber(StorageKeys.LEVEL),
          getNumber(StorageKeys.TOTAL_XP),
        ]);
        setHighscore(hs);
        setStreak(sd.count);
        setLevel(lvl || 1);
        setTotalXP(xp);
      }
      loadData();
    }, []),
  );

  const xpForNext = getXPForLevel(level || 1);
  const xpProgress = xpForNext > 0 ? Math.min((totalXP / xpForNext) * 100, 100) : 0;

  const confirmLogout = () => {
    Alert.alert("Ausloggen?", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      { text: "Logout", style: "destructive", onPress: () => router.replace("/login") },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Logo + Title */}
      <Animated.View entering={ZoomIn.duration(500)} style={styles.logoWrap}>
        <Text style={styles.logo}>♻️</Text>
      </Animated.View>
      <Animated.Text entering={FadeInDown.delay(100)} style={styles.title}>Müll Sortieren</Animated.Text>
      <Animated.Text entering={FadeInDown.delay(200)} style={styles.subtitle}>DEUTSCHLAND</Animated.Text>

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(300)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🔥</Text>
          <Text style={styles.statVal}>{streak}</Text>
          <Text style={styles.statLbl}>Streak</Text>
        </View>
        <View style={[styles.statCard, styles.statCardCenter]}>
          <Text style={styles.statIcon}>⭐</Text>
          <Text style={styles.statVal}>{totalXP}</Text>
          <Text style={styles.statLbl}>XP</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statIcon}>🏆</Text>
          <Text style={styles.statVal}>{highscore}</Text>
          <Text style={styles.statLbl}>Best</Text>
        </View>
      </Animated.View>

      {/* Level + XP Bar */}
      <Animated.View entering={FadeInDown.delay(400)} style={styles.levelBox}>
        <View style={styles.levelRow}>
          <Text style={styles.levelText}>Lvl {level || 1}</Text>
          <Text style={styles.levelTitle}>{getLevelTitle(level || 1)}</Text>
        </View>
        <View style={styles.xpBar}>
          <View style={[styles.xpFill, { width: `${xpProgress}%` }]} />
        </View>
        <Text style={styles.xpLabel}>{totalXP} / {xpForNext} XP</Text>
      </Animated.View>

      {/* Menu */}
      <Animated.View entering={FadeInDown.delay(500)} style={styles.menu}>
        <TouchableOpacity
          style={[styles.menuBtn, { backgroundColor: AppColors.green }]}
          onPress={() => router.push("/modi")}
          activeOpacity={0.85}
        >
          <Text style={styles.menuIcon}>🎮</Text>
          <Text style={styles.menuText}>Spielen</Text>
        </TouchableOpacity>

        <View style={styles.menuRow}>
          <TouchableOpacity
            style={[styles.menuBtnHalf, { backgroundColor: AppColors.blue }]}
            onPress={() => router.push("/tutorial")}
            activeOpacity={0.85}
          >
            <Text style={styles.menuIcon}>📖</Text>
            <Text style={styles.menuTextSm}>Tutorial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.menuBtnHalf, { backgroundColor: AppColors.indigo }]}
            onPress={() => router.push("/einstellung")}
            activeOpacity={0.85}
          >
            <Text style={styles.menuIcon}>⚙️</Text>
            <Text style={styles.menuTextSm}>Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>🚪 Logout</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
    alignItems: "center",
    paddingTop: 65,
    paddingHorizontal: 20,
  },
  logoWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: AppColors.card,
    borderWidth: 2,
    borderColor: AppColors.green,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    shadowColor: AppColors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: { fontSize: 48 },
  title: { fontSize: 30, fontWeight: "900", color: "#FFF", letterSpacing: -0.5 },
  subtitle: {
    fontSize: 13,
    fontWeight: "800",
    color: AppColors.green,
    letterSpacing: 6,
    marginTop: 2,
    marginBottom: 20,
  },
  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    marginBottom: 14,
  },
  statCard: {
    flex: 1,
    backgroundColor: AppColors.card,
    borderRadius: 16,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  statCardCenter: {
    borderColor: AppColors.green,
    shadowColor: AppColors.green,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  statIcon: { fontSize: 18, marginBottom: 2 },
  statVal: { color: "#FFF", fontSize: 22, fontWeight: "900" },
  statLbl: { color: AppColors.textMuted, fontSize: 11, fontWeight: "700", marginTop: 1 },
  // Level
  levelBox: {
    width: "100%",
    backgroundColor: AppColors.card,
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  levelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelText: { color: "#FFF", fontSize: 16, fontWeight: "900" },
  levelTitle: { color: AppColors.yellow, fontSize: 13, fontWeight: "700" },
  xpBar: {
    width: "100%",
    height: 8,
    backgroundColor: AppColors.cardLight,
    borderRadius: 99,
    overflow: "hidden",
    marginBottom: 4,
  },
  xpFill: {
    height: "100%",
    backgroundColor: AppColors.green,
    borderRadius: 99,
  },
  xpLabel: { color: AppColors.textMuted, fontSize: 11, fontWeight: "600", textAlign: "right" },
  // Menu
  menu: { width: "100%", gap: 10 },
  menuBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 18,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  menuRow: { flexDirection: "row", gap: 10 },
  menuBtnHalf: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    paddingVertical: 16,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  menuIcon: { fontSize: 20 },
  menuText: { color: "#FFF", fontSize: 19, fontWeight: "800" },
  menuTextSm: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  logoutBtn: {
    alignItems: "center",
    paddingVertical: 14,
    backgroundColor: AppColors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
  },
  logoutText: { color: AppColors.red, fontSize: 15, fontWeight: "700" },
});
