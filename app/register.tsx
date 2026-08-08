// Datei: app/register.tsx
import { router } from "expo-router";
import React, { useState } from "react";
import {
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = () => {
    if (password !== confirmPassword) {
      alert("Passwörter stimmen nicht überein!");
      return;
    }
    // TODO: hier später echte Registrierungs-Logik einbauen
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>📝</Text>
      <Text style={styles.title}>Registrieren</Text>
      <Text style={styles.subtitle}>Erstelle dein Konto</Text>

      <View style={styles.card}>
        <Text style={styles.label}>E-Mail</Text>
        <TextInput
          style={styles.input}
          placeholder="deine@email.de"
          placeholderTextColor="#7C8CA8"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Passwort</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#7C8CA8"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Passwort wiederholen</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor="#7C8CA8"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={styles.registerButton}
          onPress={handleRegister}
        >
          <Text style={styles.registerButtonText}>Account erstellen</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.footerText}>
          Schon ein Konto? <Text style={styles.footerLink}>Zum Login</Text>
        </Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0B1120",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logo: { fontSize: 56, marginBottom: 12 },
  title: { fontSize: 30, fontWeight: "800", color: "#FFFFFF" },
  subtitle: { fontSize: 15, color: "#9AA7C2", marginTop: 4, marginBottom: 28 },
  card: {
    width: "100%",
    backgroundColor: "#151E32",
    borderRadius: 20,
    padding: 20,
  },
  label: { color: "#9AA7C2", fontSize: 14, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: "#1E2A45",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: "#FFFFFF",
    marginBottom: 18,
    fontSize: 15,
  },
  registerButton: {
    backgroundColor: "#3B82F6",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  registerButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  footerText: { color: "#9AA7C2", marginTop: 24, fontSize: 14 },
  footerLink: { color: "#3B82F6", fontWeight: "700" },
});
