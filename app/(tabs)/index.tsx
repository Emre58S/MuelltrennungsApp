// Datei: app/(tabs)/index.tsx — Clean UI v5

import { ITEMS } from "@/constants/items";
import {
  getActiveStreak,
  getBestHighscore,
  getLevelProgress,
  getLevelTitle,
  getNumber,
  StorageKeys,
} from "@/utils/storage";
import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  bg: "#0C1211",
  surface: "#141C1A",
  surfaceRaised: "#1A2522",
  border: "#25332F",
  borderSoft: "#1F2B28",
  text: "#F3F5F1",
  textSoft: "#C0C9C4",
  textMuted: "#83908A",
  green: "#3DA66B",
  greenDeep: "#1B5A3C",
  greenDeeper: "#144A31",
  greenSoft: "#D7F0E0",
  gold: "#E0BE6A",
  danger: "#C97A74",
  // Tonnenfarben wie im Spiel
  bio: "#8B6B3D",
  gelb: "#FBC02D",
  rest: "#546E7A",
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 11) return "Guten Morgen";
  if (hour < 18) return "Hallo";
  return "Guten Abend";
}

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [highscore, setHighscore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalXP, setTotalXP] = useState(0);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      async function loadData() {
        try {
          const [hs, streakCount, xp] = await Promise.all([
            getBestHighscore(),
            getActiveStreak(),
            getNumber(StorageKeys.TOTAL_XP),
          ]);

          if (!active) return;
          setHighscore(hs);
          setStreak(streakCount);
          setTotalXP(xp);
        } catch {
          // UI bleibt mit den vorhandenen Default-Werten stabil.
        } finally {
          if (active) setLoading(false);
        }
      }

      setLoading(true);
      loadData();

      return () => {
        active = false;
      };
    }, []),
  );

  // Level wird direkt aus den XP berechnet – so passen Anzeige und Spiel immer zusammen.
  const {
    level: currentLevel,
    progress: progressValue,
    nextLevelXP,
    xpRemaining,
  } = getLevelProgress(totalXP);

  // Täglich wechselnder Fakt aus den Items
  const dailyFact = useMemo(() => {
    const withFact = ITEMS.filter((item) => item.fact);
    if (withFact.length === 0) return null;
    const day = Math.floor(Date.now() / 86_400_000);
    return withFact[day % withFact.length];
  }, []);

  const confirmLogout = () => {
    Alert.alert("Ausloggen?", "Möchtest du dich wirklich abmelden?", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: () => router.replace("/login"),
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + 12, 24),
            paddingBottom: insets.bottom + 24,
          },
        ]}
      >
        {/* Kopfbereich */}
        <FadeIn>
          <View style={styles.header}>
            <View style={styles.brandMark}>
              <Text style={styles.brandMarkText}>♻</Text>
            </View>

            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>MÜLL SORTIEREN</Text>
              <Text style={styles.title}>{getGreeting()}!</Text>
              <Text style={styles.subtitle}>Bereit für eine Runde?</Text>
            </View>

            <View style={styles.levelChip}>
              <Feather name="award" size={12} color={C.gold} />
              <Text style={styles.levelChipText}>LV {currentLevel}</Text>
            </View>
          </View>
        </FadeIn>

        {/* Hauptkarte */}
        <FadeIn delay={80}>
          <Pressable
            onPress={() => router.push("/modi")}
            style={({ pressed }) => [styles.hero, pressed && styles.pressed]}
          >
            <View style={styles.heroGlowA} />
            <View style={styles.heroGlowB} />

            <View style={styles.heroBins}>
              <MiniBin color={C.bio} height={50} />
              <MiniBin color={C.gelb} height={64} />
              <MiniBin color={C.rest} height={44} />
            </View>

            <View style={styles.heroTextWrap}>
              <Text style={styles.heroEyebrow}>NEUE RUNDE</Text>
              <Text style={styles.heroTitle}>Jetzt spielen</Text>
              <Text style={styles.heroSubtitle}>
                Wirf den Müll in die richtige Tonne.
              </Text>

              <View style={styles.heroButton}>
                <Text style={styles.heroButtonText}>Modus wählen</Text>
                <Feather name="arrow-right" size={15} color={C.greenDeeper} />
              </View>
            </View>
          </Pressable>
        </FadeIn>

        {/* Kennzahlen */}
        <FadeIn delay={160}>
          <View style={styles.statsRow}>
            <StatCard
              emoji="🔥"
              value={loading ? "—" : String(streak)}
              label="STREAK"
            />
            <StatCard
              emoji="✨"
              value={loading ? "—" : totalXP.toLocaleString("de-DE")}
              label="XP"
            />
            <StatCard
              emoji="🏆"
              value={loading ? "—" : highscore.toLocaleString("de-DE")}
              label="BESTWERT"
            />
          </View>
        </FadeIn>

        {/* Fortschritt */}
        <FadeIn delay={240}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Dein Fortschritt</Text>
            <Text style={styles.sectionMeta}>LEVEL {currentLevel}</Text>
          </View>

          <View style={styles.progressCard}>
            <View style={styles.progressTopRow}>
              <View style={styles.levelBadge}>
                <Text style={styles.levelBadgeText}>{currentLevel}</Text>
              </View>
              <View style={styles.progressTitleWrap}>
                <Text style={styles.progressTitle}>
                  {getLevelTitle(currentLevel).replace(/^\S+\s/, "")}
                </Text>
                <Text style={styles.progressSubtitle}>
                  {xpRemaining > 0
                    ? `${xpRemaining.toLocaleString("de-DE")} XP bis zum nächsten Level`
                    : "Nächstes Level bereit"}
                </Text>
              </View>
              <Text style={styles.progressPercent}>
                {Math.round(progressValue * 100)}%
              </Text>
            </View>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progressValue * 100, totalXP > 0 ? 4 : 0)}%`,
                  },
                ]}
              />
            </View>

            <View style={styles.progressBottomRow}>
              <Text style={styles.progressSmall}>
                {totalXP.toLocaleString("de-DE")} XP
              </Text>
              <Text style={styles.progressSmall}>
                Ziel · {nextLevelXP.toLocaleString("de-DE")} XP
              </Text>
            </View>
          </View>
        </FadeIn>

        {/* Fakt des Tages */}
        {dailyFact && (
          <FadeIn delay={300}>
            <View style={styles.factCard}>
              <View style={styles.factIcon}>
                <Text style={styles.factEmoji}>{dailyFact.emoji}</Text>
              </View>
              <View style={styles.factTextWrap}>
                <Text style={styles.factLabel}>WUSSTEST DU?</Text>
                <Text style={styles.factText}>{dailyFact.fact}</Text>
              </View>
            </View>
          </FadeIn>
        )}

        {/* Mehr */}
        <FadeIn delay={360}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mehr</Text>
          </View>

          <View style={styles.secondaryRow}>
            <SecondaryCard
              icon="help-circle"
              title="Tutorial"
              subtitle="Spiel erklärt"
              onPress={() => router.push("/tutorial")}
            />
            <SecondaryCard
              icon="settings"
              title="Einstellungen"
              subtitle="App anpassen"
              onPress={() => router.push("/einstellung")}
            />
          </View>

          <Pressable
            onPress={confirmLogout}
            style={({ pressed }) => [
              styles.logoutButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="log-out" size={14} color={C.danger} />
            <Text style={styles.logoutText}>Ausloggen</Text>
          </Pressable>
        </FadeIn>
      </ScrollView>
    </View>
  );
}

/* ── Bausteine ─────────────────────────────────────────────── */

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
      duration: 420,
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
              outputRange: [14, 0],
            }),
          },
        ],
      }}
    >
      {children}
    </Animated.View>
  );
}

/** Kleine Mülltonne für die Hauptkarte. */
function MiniBin({ color, height }: { color: string; height: number }) {
  return (
    <View style={styles.miniBin}>
      <View style={[styles.miniLid, { backgroundColor: color }]} />
      <View style={[styles.miniBody, { height, backgroundColor: color }]}>
        <View style={styles.miniStripe} />
      </View>
    </View>
  );
}

function StatCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={styles.statIcon}>
        <Text style={styles.statEmoji}>{emoji}</Text>
      </View>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SecondaryCard({
  icon,
  title,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Feather>["name"];
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.secondaryCard, pressed && styles.pressed]}
    >
      <View style={styles.secondaryIcon}>
        <Feather name={icon} size={19} color={C.greenSoft} />
      </View>
      <View style={styles.secondaryTextWrap}>
        <Text style={styles.secondaryTitle}>{title}</Text>
        <Text style={styles.secondarySubtitle}>{subtitle}</Text>
      </View>
      <Feather name="chevron-right" size={18} color={C.textMuted} />
    </Pressable>
  );
}

/* ── Styles ────────────────────────────────────────────────── */

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { paddingHorizontal: 20 },

  // Kopfbereich
  header: { flexDirection: "row", alignItems: "center", marginBottom: 20 },
  brandMark: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 13,
  },
  brandMarkText: { color: C.greenSoft, fontSize: 30, fontWeight: "800" },
  headerText: { flex: 1 },
  eyebrow: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2.2,
    marginBottom: 2,
  },
  title: {
    color: C.text,
    fontSize: 25,
    lineHeight: 29,
    fontWeight: "900",
    letterSpacing: -0.4,
  },
  subtitle: { color: C.textSoft, fontSize: 13, marginTop: 2 },
  levelChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(224,190,106,0.1)",
    borderWidth: 1,
    borderColor: "rgba(224,190,106,0.28)",
  },
  levelChipText: {
    color: C.gold,
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.6,
    marginLeft: 5,
  },

  // Hauptkarte
  hero: {
    minHeight: 178,
    borderRadius: 24,
    backgroundColor: C.greenDeep,
    borderWidth: 1,
    borderColor: "#2E7A55",
    overflow: "hidden",
    padding: 20,
    marginBottom: 14,
  },
  heroGlowA: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    right: -70,
    top: -90,
    backgroundColor: "rgba(80,200,130,0.16)",
  },
  heroGlowB: {
    position: "absolute",
    width: 150,
    height: 150,
    borderRadius: 75,
    left: -50,
    bottom: -80,
    backgroundColor: "rgba(0,0,0,0.16)",
  },
  heroBins: {
    position: "absolute",
    right: 18,
    bottom: 20,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  heroTextWrap: { paddingRight: 112 },
  heroEyebrow: {
    color: "rgba(215,240,224,0.75)",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    marginBottom: 4,
  },
  heroTitle: {
    color: C.text,
    fontSize: 28,
    lineHeight: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    color: "rgba(243,245,241,0.82)",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 5,
  },
  heroButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: C.greenSoft,
  },
  heroButtonText: {
    color: C.greenDeeper,
    fontSize: 13,
    fontWeight: "900",
    marginRight: 6,
  },

  // Mini-Tonnen
  miniBin: { alignItems: "center", marginLeft: 6 },
  miniLid: {
    width: 36,
    height: 7,
    borderRadius: 4,
    marginBottom: 1,
  },
  miniBody: {
    width: 30,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  miniStripe: {
    width: 3,
    height: "55%",
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  // Kennzahlen
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 13,
    paddingHorizontal: 6,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: C.surfaceRaised,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 7,
  },
  statEmoji: { fontSize: 15 },
  statValue: {
    color: C.text,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: "900",
    maxWidth: "100%",
  },
  statLabel: {
    color: C.textMuted,
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1.4,
    marginTop: 2,
  },

  // Abschnitte
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  sectionTitle: { color: C.text, fontSize: 18, fontWeight: "900" },
  sectionMeta: {
    color: C.textMuted,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },

  // Fortschritt
  progressCard: {
    backgroundColor: C.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    padding: 16,
    marginBottom: 14,
  },
  progressTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
  },
  levelBadge: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "#1C2E24",
    borderWidth: 1,
    borderColor: "#33503D",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  levelBadgeText: { color: C.greenSoft, fontSize: 18, fontWeight: "900" },
  progressTitleWrap: { flex: 1 },
  progressTitle: { color: C.text, fontSize: 16, fontWeight: "900" },
  progressSubtitle: { color: C.textMuted, fontSize: 11, marginTop: 3 },
  progressPercent: {
    color: C.gold,
    fontSize: 17,
    fontWeight: "900",
    marginLeft: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 99,
    overflow: "hidden",
    backgroundColor: "#202B28",
  },
  progressFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: C.green,
  },
  progressBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  progressSmall: { color: C.textMuted, fontSize: 10, fontWeight: "700" },

  // Fakt des Tages
  factCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#18241E",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#2A3F32",
    padding: 14,
    marginBottom: 24,
  },
  factIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "rgba(61,166,107,0.14)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  factEmoji: { fontSize: 22 },
  factTextWrap: { flex: 1 },
  factLabel: {
    color: C.green,
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.6,
    marginBottom: 3,
  },
  factText: { color: C.textSoft, fontSize: 13, lineHeight: 18 },

  // Mehr
  secondaryRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  secondaryCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    paddingVertical: 14,
    paddingHorizontal: 12,
  },
  secondaryIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.surfaceRaised,
    borderWidth: 1,
    borderColor: C.borderSoft,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  secondaryTextWrap: { flex: 1 },
  secondaryTitle: { color: C.text, fontSize: 14, fontWeight: "900" },
  secondarySubtitle: { color: C.textMuted, fontSize: 10, marginTop: 2 },

  logoutButton: {
    flexDirection: "row",
    minHeight: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  logoutText: {
    color: C.danger,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.7,
    marginLeft: 7,
  },

  pressed: { opacity: 0.85, transform: [{ scale: 0.992 }] },
});
