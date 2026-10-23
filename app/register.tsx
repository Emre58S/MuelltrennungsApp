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
import { useI18n } from "@/providers/app-settings";

export default function RegisterScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleRegister = () => {
    setError("");
    if (!email.includes("@")) {
      setError(t("auth.error.email"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.error.password", { n: 6 }));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("auth.error.mismatch"));
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
      <Text style={styles.title}>{t("auth.register.title")}</Text>
      <Text style={styles.subtitle}>{t("auth.register.subtitle")}</Text>

      <View style={styles.card}>
        <Text style={styles.label}>{t("auth.email")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("auth.emailPlaceholder")}
          placeholderTextColor={AppColors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />

        <Text style={styles.label}>{t("auth.password")}</Text>
        <TextInput
          style={styles.input}
          placeholder={t("auth.passwordMin", { n: 6 })}
          placeholderTextColor={AppColors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <Text style={styles.label}>{t("auth.passwordRepeat")}</Text>
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
          <Text style={styles.registerButtonText}>{t("auth.register.button")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/login")}>
        <Text style={styles.footerText}>
          {t("auth.haveAccount")} <Text style={styles.footerLink}>{t("auth.toLogin")}</Text>
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
