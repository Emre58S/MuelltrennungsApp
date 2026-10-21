// Datei: app/login.tsx — with centralized theme
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

export default function LoginScreen() {
  const { t } = useI18n();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = () => {
    setError("");
    if (!email.includes("@")) {
      setError(t("auth.error.email"));
      return;
    }
    if (password.length < 4) {
      setError(t("auth.error.password", { n: 4 }));
      return;
    }
    // TODO: echte Auth-Logik (Supabase/Firebase)
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>♻️</Text>
      <Text style={styles.title}>{t("home.titleTop")} {t("home.titleBottom")}</Text>
      <Text style={styles.subtitle}>{t("home.subtitle")}</Text>

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
          placeholder="••••••••"
          placeholderTextColor={AppColors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin} activeOpacity={0.8}>
          <Text style={styles.loginButtonText}>{t("auth.login")}</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.footerText}>
          {t("auth.noAccount")} <Text style={styles.footerLink}>{t("auth.registerNow")}</Text>
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
  logo: { fontSize: 64, marginBottom: Spacing.sm },
  title: { fontSize: FontSize.hero, fontWeight: "800", color: AppColors.textPrimary },
  subtitle: {
    fontSize: FontSize.md,
    fontWeight: "600",
    color: AppColors.green,
    textAlign: "center",
    marginTop: Spacing.xs,
    marginBottom: Spacing.xl,
  },
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
  loginButton: {
    backgroundColor: AppColors.green,
    borderRadius: Radius.md,
    paddingVertical: Spacing.md,
    alignItems: "center",
    marginTop: Spacing.xs,
  },
  loginButtonText: { color: AppColors.textPrimary, fontWeight: "700", fontSize: FontSize.lg },
  footerText: { color: AppColors.textSecondary, marginTop: Spacing.lg, fontSize: FontSize.md },
  footerLink: { color: AppColors.green, fontWeight: "700" },
});
