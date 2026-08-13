// Datei: app/register.tsx — with validation and centralized theme
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
import { AppColors, FontSize, Radius, Spacing } from "@/constants/theme";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
    setError("");
    if (!email.includes("@")) {
      setError("Bitte gib eine gültige E-Mail-Adresse ein.");
      return;
    }
    if (password.length < 6) {
      setError("Passwort muss mindestens 6 Zeichen haben.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwörter stimmen nicht überein!");
      return;
    }
    // TODO: echte Registrierungs-Logik
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
          placeholderTextColor={AppColors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>Passwort</Text>
        <TextInput
          style={styles.input}
          placeholder="Mindestens 6 Zeichen"
          placeholderTextColor={AppColors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>Passwort wiederholen</Text>
        <TextInput
          style={styles.input}
          placeholder="••••••••"
          placeholderTextColor={AppColors.textMuted}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.registerButton} onPress={handleRegister} activeOpacity={0.8}>
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
    backgroundColor: AppColors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  logo: { fontSize: 56, marginBottom: Spacing.sm },
  title: { fontSize: 30, fontWeight: "800", color: AppColors.textPrimary },
  subtitle: { fontSize: FontSize.base, color: AppColors.textSecondary, marginTop: Spacing.xs, marginBottom: Spacing.xl - 4 },
  card: { width: "100%", backgroundColor: AppColors.card, borderRadius: Radius.xxl, padding: 20 },
  label: { color: AppColors.textSecondary, fontSize: FontSize.md, marginBottom: 6, fontWeight: "600" },
  input: {
    backgroundColor: AppColors.cardLight,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md - 2,
    color: AppColors.textPrimary,
    marginBottom: Spacing.xl - 14,
    fontSize: FontSize.base,
  },
  error: { color: AppColors.red, fontSize: FontSize.sm, marginBottom: Spacing.sm, textAlign: "center" },
  registerButton: {
    backgroundColor: AppColors.blue,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  registerButtonText: { color: AppColors.textPrimary, fontWeight: "700", fontSize: FontSize.lg },
  footerText: { color: AppColors.textSecondary, marginTop: Spacing.lg, fontSize: FontSize.md },
  footerLink: { color: AppColors.blue, fontWeight: "700" },
});
