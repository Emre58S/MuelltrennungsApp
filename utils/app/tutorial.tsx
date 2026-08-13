// Datei: app/tutorial.tsx — mit Sondermüll-Kategorie
import { router } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";

type TutorialCategory = {
  emoji: string;
  name: string;
  color: string;
  description: string;
  examples: string;
};

const CATEGORIES: TutorialCategory[] = [
  {
    emoji: "🟫",
    name: "Biomüll",
    color: "#8B5E34",
    description: "Alle organischen, kompostierbaren Abfälle.",
    examples: "Obst- & Gemüsereste, Kaffeesatz, Eierschalen, Laub, altes Brot",
  },
  {
    emoji: "🔵",
    name: "Papier",
    color: "#3B82F6",
    description: "Sauberes Papier, Pappe und Karton.",
    examples: "Zeitungen, Kartons, Briefumschläge, Bücher, Eierkartons",
  },
  {
    emoji: "🟡",
    name: "Gelber Sack",
    color: "#F5C518",
    description: "Verpackungen aus Kunststoff, Metall oder Verbundstoffen.",
    examples: "Joghurtbecher, Konservendosen, Getränkekartons, Plastikflaschen, Alufolie",
  },
  {
    emoji: "🟢",
    name: "Glas",
    color: "#2ECC71",
    description: "Leere Glasverpackungen, nach Farben sortiert.",
    examples: "Weinflaschen, Marmeladengläser, Gurkengläser, Senfgläser",
  },
  {
    emoji: "⚫",
    name: "Restmüll",
    color: "#4B5563",
    description: "Alles, was nicht recycelt werden kann.",
    examples: "Zigarettenkippen, kaputtes Geschirr, Windeln, Kassenzettel, Staubsaugerbeutel",
  },
  {
    emoji: "🔴",
    name: "Sondermüll",
    color: "#EF4444",
    description: "Gefährliche Stoffe, die separat entsorgt werden müssen.",
    examples: "Batterien, alte Handys, Farbreste, Medikamente, Energiesparlampen",
  },
];

export default function TutorialScreen() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.logo}>📖</Text>
        <Text style={styles.title}>Tutorial</Text>
        <Text style={styles.subtitle}>So funktioniert die Mülltrennung</Text>

        {CATEGORIES.map((cat) => (
          <View key={cat.name} style={[styles.card, { borderLeftColor: cat.color }]}>
            <View style={styles.cardHeader}>
              <Text style={styles.cardEmoji}>{cat.emoji}</Text>
              <Text style={styles.cardName}>{cat.name}</Text>
            </View>
            <Text style={styles.cardDescription}>{cat.description}</Text>
            <Text style={styles.cardExamples}>Beispiele: {cat.examples}</Text>
          </View>
        ))}

        <Text style={styles.hint}>
          Im Spiel siehst du einen Gegenstand und musst die richtige Tonne
          auswählen. Richtige Antworten geben 10 XP, und bei 3+ richtigen
          hintereinander bekommst du einen Combo-Bonus! 🔥
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push({ pathname: "/(tabs)/explore", params: { mode: "runden" } })}
      >
        <Text style={styles.startButtonText}>🎮 Jetzt spielen</Text>
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
    paddingTop: 60,
    paddingHorizontal: Spacing.lg,
  },
  scrollContent: { alignItems: "center", paddingBottom: 20 },
  logo: { fontSize: 48, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.title, fontWeight: "800", color: AppColors.textPrimary },
  subtitle: { fontSize: FontSize.md, color: AppColors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.lg },
  card: {
    width: "100%",
    backgroundColor: AppColors.card,
    borderRadius: Radius.lg,
    borderLeftWidth: 5,
    padding: Spacing.md,
    marginBottom: Spacing.md - 2,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", marginBottom: 6, gap: Spacing.sm },
  cardEmoji: { fontSize: 20 },
  cardName: { color: AppColors.textPrimary, fontSize: 17, fontWeight: "700" },
  cardDescription: { color: AppColors.textSubtle, fontSize: FontSize.md, marginBottom: 6 },
  cardExamples: { color: AppColors.textMuted, fontSize: FontSize.sm, fontStyle: "italic" },
  hint: {
    color: AppColors.textSecondary,
    fontSize: FontSize.sm,
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: AppColors.green,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  startButtonText: { color: AppColors.textPrimary, fontWeight: "700", fontSize: FontSize.lg },
  backText: {
    color: AppColors.textSecondary,
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: 20,
    fontSize: FontSize.md,
  },
});
