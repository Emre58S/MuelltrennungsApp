// Datei: app/modi.tsx — with centralized theme
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";

export default function ModiScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏆</Text>
      <Text style={styles.title}>Spielmodi</Text>
      <Text style={styles.subtitle}>Wähle deinen Modus</Text>

      <TouchableOpacity
        style={[styles.card, { borderColor: AppColors.green }]}
        onPress={() =>
          router.push({ pathname: "/(tabs)/explore", params: { mode: "runden" } })
        }
        activeOpacity={0.8}
      >
        <Text style={styles.cardEmoji}>🔢</Text>
        <Text style={styles.cardTitle}>Runden-Modus</Text>
        <Text style={styles.cardDesc}>10 Gegenstände richtig sortieren</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { borderColor: AppColors.yellow }]}
        onPress={() =>
          router.push({ pathname: "/(tabs)/explore", params: { mode: "zeit" } })
        }
        activeOpacity={0.8}
      >
        <Text style={styles.cardEmoji}>⏱️</Text>
        <Text style={styles.cardTitle}>Zeit-Modus</Text>
        <Text style={styles.cardDesc}>60 Sekunden, so viele Punkte wie möglich</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { borderColor: AppColors.purple }]}
        onPress={() =>
          router.push({ pathname: "/(tabs)/explore", params: { mode: "endlos" } })
        }
        activeOpacity={0.8}
      >
        <Text style={styles.cardEmoji}>♾️</Text>
        <Text style={styles.cardTitle}>Endlos-Modus</Text>
        <Text style={styles.cardDesc}>Spiele ohne Limit, bis du aufhörst</Text>
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
    paddingTop: 80,
    paddingHorizontal: Spacing.lg,
  },
  logo: { fontSize: 48, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.title, fontWeight: "800", color: AppColors.textPrimary },
  subtitle: { fontSize: FontSize.md, color: AppColors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.xl },
  card: {
    width: "100%",
    backgroundColor: AppColors.card,
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    marginBottom: Spacing.xl - 14,
  },
  cardEmoji: { fontSize: 32, marginBottom: Spacing.sm },
  cardTitle: { color: AppColors.textPrimary, fontSize: FontSize.xl, fontWeight: "700", marginBottom: Spacing.xs },
  cardDesc: { color: AppColors.textSecondary, fontSize: FontSize.sm, textAlign: "center" },
  backText: { color: AppColors.textSecondary, textAlign: "center", marginTop: 20, fontSize: FontSize.md },
});
