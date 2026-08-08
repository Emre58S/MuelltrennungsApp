// Datei: app/modi.tsx
import { router } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function ModiScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🏆</Text>
      <Text style={styles.title}>Spielmodi</Text>
      <Text style={styles.subtitle}>Wähle deinen Modus</Text>

      <TouchableOpacity
        style={[styles.card, { borderColor: "#2ECC71" }]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/explore",
            params: { mode: "runden" },
          })
        }
      >
        <Text style={styles.cardEmoji}>🔢</Text>
        <Text style={styles.cardTitle}>Runden-Modus</Text>
        <Text style={styles.cardDesc}>10 Gegenstände richtig sortieren</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { borderColor: "#F5C518" }]}
        onPress={() =>
          router.push({ pathname: "/(tabs)/explore", params: { mode: "zeit" } })
        }
      >
        <Text style={styles.cardEmoji}>⏱️</Text>
        <Text style={styles.cardTitle}>Zeit-Modus</Text>
        <Text style={styles.cardDesc}>
          60 Sekunden, so viele Punkte wie möglich
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.card, { borderColor: "#A855F7" }]}
        onPress={() =>
          router.push({
            pathname: "/(tabs)/explore",
            params: { mode: "endlos" },
          })
        }
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
    backgroundColor: "#0B1120",
    alignItems: "center",
    paddingTop: 80,
    paddingHorizontal: 24,
  },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 14, color: "#9AA7C2", marginTop: 4, marginBottom: 32 },
  card: {
    width: "100%",
    backgroundColor: "#151E32",
    borderRadius: 18,
    borderWidth: 2,
    padding: 20,
    alignItems: "center",
    marginBottom: 18,
  },
  cardEmoji: { fontSize: 32, marginBottom: 8 },
  cardTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardDesc: { color: "#9AA7C2", fontSize: 13, textAlign: "center" },
  backText: {
    color: "#9AA7C2",
    textAlign: "center",
    marginTop: 20,
    fontSize: 14,
  },
});
