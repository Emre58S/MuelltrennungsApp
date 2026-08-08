// Datei: app/tutorial.tsx
import { router } from "expo-router";
import React from "react";
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

type Category = {
  emoji: string;
  name: string;
  color: string;
  description: string;
  examples: string;
};

const CATEGORIES: Category[] = [
  {
    emoji: "🟫",
    name: "Biomüll",
    color: "#8B5E34",
    description: "Alle organischen, kompostierbaren Abfälle.",
    examples: "Obst- & Gemüsereste, Kaffeesatz, Eierschalen, Laub",
  },
  {
    emoji: "🔵",
    name: "Papier",
    color: "#3B82F6",
    description: "Sauberes Papier, Pappe und Karton.",
    examples: "Zeitungen, Kartons, Briefumschläge, Schreibpapier",
  },
  {
    emoji: "🟡",
    name: "Gelber Sack",
    color: "#F5C518",
    description: "Verpackungen aus Kunststoff, Metall oder Verbundstoffen.",
    examples: "Joghurtbecher, Konservendosen, Getränkekartons, Plastiktüten",
  },
  {
    emoji: "🟢",
    name: "Glas",
    color: "#2ECC71",
    description: "Leere Glasverpackungen, meist nach Farben sortiert.",
    examples: "Weinflaschen, Marmeladengläser, Konservengläser",
  },
  {
    emoji: "⚫",
    name: "Restmüll",
    color: "#4B5563",
    description: "Alles, was nicht recycelt werden kann.",
    examples: "Zigarettenkippen, kaputtes Geschirr, Pflaster, Glühbirnen",
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
          <View
            key={cat.name}
            style={[styles.card, { borderLeftColor: cat.color }]}
          >
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
          auswählen. Für jede richtige Antwort gibt es 10 Punkte!
        </Text>
      </ScrollView>

      <TouchableOpacity
        style={styles.startButton}
        onPress={() => router.push("/(tabs)/explore")}
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
    backgroundColor: "#0B1120",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  scrollContent: { alignItems: "center", paddingBottom: 20 },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 14, color: "#9AA7C2", marginTop: 4, marginBottom: 24 },
  card: {
    width: "100%",
    backgroundColor: "#151E32",
    borderRadius: 16,
    borderLeftWidth: 5,
    padding: 16,
    marginBottom: 14,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 8,
  },
  cardEmoji: { fontSize: 20 },
  cardName: { color: "#FFFFFF", fontSize: 17, fontWeight: "700" },
  cardDescription: { color: "#C4CDE0", fontSize: 14, marginBottom: 6 },
  cardExamples: { color: "#7C8CA8", fontSize: 13, fontStyle: "italic" },
  hint: {
    color: "#9AA7C2",
    fontSize: 13,
    textAlign: "center",
    marginTop: 12,
    marginBottom: 8,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: "#2ECC71",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 12,
  },
  startButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  backText: {
    color: "#9AA7C2",
    textAlign: "center",
    marginTop: 16,
    marginBottom: 20,
    fontSize: 14,
  },
});
