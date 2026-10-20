// Datei: app/tutorial.tsx

import { router } from "expo-router";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";

export default function TutorialScreen() {
  const startClassic = () => {
    router.push({
      pathname: "/(tabs)/explore",
      params: { mode: "classic" },
    });
  };

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>♻️</Text>
          <Text style={styles.title}>So funktioniert’s</Text>
          <Text style={styles.subtitle}>
            Sortiere den Müll in den richtigen Mülleimer.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>🎯</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Dein Ziel</Text>
            <Text style={styles.cardText}>
              Wirf jeden Gegenstand mit einer Wischbewegung nach oben in den
              passenden Mülleimer.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Die drei Kategorien</Text>

        <View style={styles.categoryCard}>
          <Text style={styles.categoryEmoji}>🟫</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>Biomüll</Text>
            <Text style={styles.categoryText}>
              Zum Beispiel Bananenschalen, Kaffeesatz und Pflanzenreste.
            </Text>
          </View>
        </View>

        <View style={styles.categoryCard}>
          <Text style={styles.categoryEmoji}>🟡</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>Gelber Sack</Text>
            <Text style={styles.categoryText}>
              Leere Verpackungen aus Kunststoff, Metall und Verbundmaterial.
            </Text>
          </View>
        </View>

        <View style={styles.categoryCard}>
          <Text style={styles.categoryEmoji}>⚫</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>Restmüll</Text>
            <Text style={styles.categoryText}>
              Alles, was nicht in Biomüll oder Gelben Sack gehört.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Punkte & Combo</Text>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>🔥</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Combo aufbauen</Text>
            <Text style={styles.cardText}>
              Mehrere richtige Würfe hintereinander erhöhen deinen Multiplikator
              und bringen deutlich mehr Punkte.
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardIcon}>⭐</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Perfekt treffen</Text>
            <Text style={styles.cardText}>
              Triff die Öffnung möglichst genau. Ein perfekter Treffer gibt dir
              die meisten Punkte.
            </Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Weitere Spielmodi</Text>

        <View style={styles.modeInfo}>
          <Text style={styles.modeInfoTitle}>🌱 Leicht</Text>
          <Text style={styles.modeInfoText}>Nur einfache Gegenstände.</Text>
        </View>

        <View style={styles.modeInfo}>
          <Text style={styles.modeInfoTitle}>🔥 Schwer</Text>
          <Text style={styles.modeInfoText}>
            Schwierigere Gegenstände und weniger Zielhilfe.
          </Text>
        </View>

        <View style={styles.modeInfo}>
          <Text style={styles.modeInfoTitle}>⏱️ Zeitmodus</Text>
          <Text style={styles.modeInfoText}>
            60 Sekunden – schaffe so viele Punkte wie möglich.
          </Text>
        </View>

        <View style={styles.tipBox}>
          <Text style={styles.tipIcon}>💡</Text>
          <Text style={styles.tipText}>
            Tipp: Lieber kontrolliert werfen als hektisch wischen. Präzise
            Treffer bauen schneller eine hohe Combo auf.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.playButton}
          onPress={startClassic}
          activeOpacity={0.85}
        >
          <Text style={styles.playButtonText}>🎮 Jetzt spielen</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} activeOpacity={0.8}>
          <Text style={styles.backText}>Zurück zum Menü</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: AppColors.bg,
  },

  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 55,
    paddingBottom: 165,
  },

  header: {
    alignItems: "center",
    marginBottom: 28,
  },

  logo: {
    fontSize: 48,
    marginBottom: 8,
  },

  title: {
    color: AppColors.textPrimary,
    fontSize: FontSize.title,
    fontWeight: "900",
    textAlign: "center",
  },

  subtitle: {
    color: AppColors.textSecondary,
    fontSize: FontSize.md,
    textAlign: "center",
    marginTop: 7,
    lineHeight: 20,
  },

  sectionTitle: {
    color: AppColors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: "900",
    marginTop: 24,
    marginBottom: 10,
  },

  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },

  cardIcon: {
    fontSize: 25,
    marginRight: 11,
  },

  cardContent: {
    flex: 1,
  },

  cardTitle: {
    color: AppColors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: "900",
    marginBottom: 4,
  },

  cardText: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 19,
  },

  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },

  categoryEmoji: {
    fontSize: 26,
    marginRight: 12,
  },

  categoryContent: {
    flex: 1,
  },

  categoryTitle: {
    color: AppColors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: "900",
    marginBottom: 3,
  },

  categoryText: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  modeInfo: {
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 14,
    marginBottom: 10,
  },

  modeInfoTitle: {
    color: AppColors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: "900",
    marginBottom: 3,
  },

  modeInfoText: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  tipBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: AppColors.cardBorder,
    padding: 14,
    marginTop: 8,
  },

  tipIcon: {
    fontSize: 22,
    marginRight: 10,
  },

  tipText: {
    flex: 1,
    color: AppColors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 18,
  },

  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: AppColors.bg,
    borderTopWidth: 1,
    borderTopColor: AppColors.cardBorder,
    paddingHorizontal: Spacing.lg,
    paddingTop: 12,
    paddingBottom: 24,
  },

  playButton: {
    backgroundColor: AppColors.green,
    borderRadius: Radius.md,
    alignItems: "center",
    paddingVertical: 15,
    marginBottom: 10,
  },

  playButtonText: {
    color: AppColors.textPrimary,
    fontSize: FontSize.lg,
    fontWeight: "900",
  },

  backText: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    fontWeight: "700",
    textAlign: "center",
  },
});
