// Datei: app/modi.tsx — Clean UI v6

import { Feather } from "@expo/vector-icons";
import { router } from "expo-router";
import { type ReactNode, useEffect, useRef } from "react";
import {
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type GameMode = "endless" | "survival" | "time";

type ModeConfig = {
  mode: GameMode;
  number: string;
  title: string;
  description: string;
  detail: string;
  icon: React.ComponentProps<typeof Feather>["name"];
  accent: string;
  recommended?: boolean;
};

const C = {
  bg: "#0C1211",
  surface: "#141C1A",
  surfaceRaised: "#1A2522",
  border: "#25332F",
  text: "#F3F5F1",
  textSoft: "#C0C9C4",
  textMuted: "#83908A",
  green: "#3DA66B",
  greenSoft: "#D7F0E0",
};

const MODES: ModeConfig[] = [
  {
    mode: "endless",
    number: "01",
    title: "Unendlich",
    description: "Wirf so lange du willst",
    detail: "Ohne Limit, entspannt",
    icon: "repeat",
    accent: "#3DA66B",
    recommended: true,
  },
  {
    mode: "survival",
    number: "02",
    title: "Survival",
    description: "Weiter, solange du richtig triffst",
    detail: "Ein Fehler beendet die Runde",
    icon: "heart",
    accent: "#E07A6F",
  },
  {
    mode: "time",
    number: "03",
    title: "Zeitmodus",
    description: "So viele Punkte wie möglich",
    detail: "60 Sekunden",
    icon: "clock",
    accent: "#E0BE6A",
  },
];

export default function ModiScreen() {
  const insets = useSafeAreaInsets();

  const startMode = (mode: GameMode) => {
    router.push({
      pathname: "/(tabs)/explore",
      params: { mode },
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            paddingBottom: insets.bottom + 28,
          },
        ]}
      >
        <FadeIn>
          <View style={styles.header}>
            <Pressable
              onPress={() => router.back()}
              hitSlop={8}
              style={({ pressed }) => [
                styles.backButton,
                pressed && styles.pressed,
              ]}
            >
              <Feather name="chevron-left" size={24} color={C.text} />
            </Pressable>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>SPIEL</Text>
              <Text style={styles.title}>Modus wählen</Text>
              <Text style={styles.subtitle}>Wähle deine Runde.</Text>
            </View>
          </View>
        </FadeIn>

        <View style={styles.list}>
          {MODES.map((item, index) => (
            <FadeIn key={item.mode} delay={70 + index * 70}>
              <Pressable
                onPress={() => startMode(item.mode)}
                style={({ pressed }) => [
                  styles.modeCard,
                  item.recommended && styles.modeCardPrimary,
                  pressed && styles.pressed,
                ]}
              >
                <View
                  style={[
                    styles.iconChip,
                    {
                      backgroundColor: `${item.accent}22`,
                      borderColor: `${item.accent}55`,
                    },
                  ]}
                >
                  <Feather name={item.icon} size={22} color={item.accent} />
                </View>

                <View style={styles.modeTextWrap}>
                  <View style={styles.modeTitleRow}>
                    <Text style={styles.modeTitle}>{item.title}</Text>
                    {item.recommended && (
                      <Text style={styles.recommended}>EMPFOHLEN</Text>
                    )}
                  </View>
                  <Text style={styles.modeDescription}>{item.description}</Text>
                  <Text style={[styles.modeDetail, { color: item.accent }]}>
                    {item.detail}
                  </Text>
                </View>

                <View style={styles.arrowWrap}>
                  <Text style={styles.number}>{item.number}</Text>
                  <Feather name="chevron-right" size={20} color={item.accent} />
                </View>
              </Pressable>
            </FadeIn>
          ))}
        </View>

        {/* Steuerung */}
        <FadeIn delay={420}>
          <View style={styles.hintCard}>
            <Text style={styles.hintLabel}>STEUERUNG</Text>

            <View style={styles.hintRow}>
              <View style={styles.hintIcon}>
                <Feather name="arrow-up" size={16} color={C.greenSoft} />
              </View>
              <Text style={styles.hintText}>
                Nach oben wischen, um den Müll zu werfen.
              </Text>
            </View>

            <View style={styles.hintRow}>
              <View style={styles.hintIcon}>
                <Feather name="arrow-left" size={16} color={C.greenSoft} />
              </View>
              <Text style={styles.hintText}>
                Nach links wischen, um zurück ins Menü zu gehen.
              </Text>
            </View>
          </View>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

/** Blendet Inhalt beim Laden sanft ein. */
function FadeIn({
  delay = 0,
  children,
}: {
  delay?: number;
  children: ReactNode;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 380,
      delay,
      useNativeDriver: true,
    }).start();
  }, [anim, delay]);

  return (
    <Animated.View
      style={{
        opacity: anim,
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [12, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20 },

  header: { flexDirection: "row", alignItems: "center", marginBottom: 22 },
  backButton: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  headerText: { flex: 1 },
  eyebrow: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.3,
  },
  title: {
    color: C.text,
    fontSize: 27,
    lineHeight: 31,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginTop: 2,
  },
  subtitle: { color: C.textSoft, fontSize: 12, marginTop: 3 },

  list: { gap: 11, marginBottom: 20 },
  modeCard: {
    minHeight: 100,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
  },
  modeCardPrimary: {
    backgroundColor: "#16251D",
    borderColor: "#2F5A41",
  },
  iconChip: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  modeTextWrap: { flex: 1, paddingVertical: 12 },
  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  modeTitle: { color: C.text, fontSize: 18, fontWeight: "900" },
  recommended: {
    color: C.greenSoft,
    backgroundColor: "#294031",
    fontSize: 7,
    fontWeight: "900",
    letterSpacing: 0.9,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
    overflow: "hidden",
  },
  modeDescription: { color: C.textSoft, fontSize: 12, marginTop: 4 },
  modeDetail: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginTop: 6,
  },
  arrowWrap: { alignItems: "center", marginLeft: 8 },
  number: {
    color: C.textMuted,
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  hintCard: {
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    padding: 15,
  },
  hintLabel: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.8,
    marginBottom: 12,
  },
  hintRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  hintIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 11,
  },
  hintText: { flex: 1, color: C.textSoft, fontSize: 13, lineHeight: 18 },

  pressed: { opacity: 0.85, transform: [{ scale: 0.993 }] },
});
