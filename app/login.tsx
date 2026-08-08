// Datei: app/login.tsx
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

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    // TODO: hier später echte Auth-Logik (z.B. Firebase, Supabase) einbauen
    if (email.length > 0 && password.length > 0) {
      router.replace("/(tabs)"); // navigiert zum Home-Menü
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.logo}>♻️</Text>
      <Text style={styles.title}>Müll Sortieren</Text>
      <Text style={styles.subtitle}>DEUTSCHLAND</Text>

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

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>Login</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity onPress={() => router.push("/register")}>
        <Text style={styles.footerText}>
          Noch kein Konto?{" "}
          <Text style={styles.footerLink}>Jetzt registrieren</Text>
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
  logo: { fontSize: 64, marginBottom: 12 },
  title: { fontSize: 32, fontWeight: "800", color: "#FFFFFF" },
  subtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2ECC71",
    letterSpacing: 4,
    marginTop: 4,
    marginBottom: 32,
  },
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
  loginButton: {
    backgroundColor: "#2ECC71",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  loginButtonText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  footerText: { color: "#9AA7C2", marginTop: 24, fontSize: 14 },
  footerLink: { color: "#2ECC71", fontWeight: "700" },
});
