// Datei: app/rangliste.tsx — Rangliste
//
// Anonyme Bestenlisten (utils/leaderboard.ts): Zielwurf, Gegen die Zeit,
// Ohne Fehler und die heutigen Tages-Bretter (Tagesaufgabe, Tages-Trick –
// für alle gleich). Oben der eigene Spitzname (änderbar), unten der eigene
// Platz, falls man nicht unter den Besten steht.

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { FadeIn } from "@/components/ui/fade-in";
import { IconButton } from "@/components/ui/icon-button";
import { Radius, Spacing } from "@/constants/theme";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  type Board,
  type BoardResult,
  dailyBoard,
  decodeTrickScore,
  fetchBoard,
  getPlayer,
  leaderboardReady,
  setPlayerName,
} from "@/utils/leaderboard";
import { sfx } from "@/utils/sfx";

type Tab = { key: string; label: TranslationKey; board: () => Board; daily?: boolean; trick?: boolean };

const TABS: Tab[] = [
  { key: "zielwurf", label: "mode.aim.title", board: () => "zielwurf" },
  { key: "zeit", label: "mode.time.title", board: () => "zeit" },
  { key: "runden", label: "mode.survival.title", board: () => "runden" },
  { key: "tagesaufgabe", label: "home.daily", board: () => dailyBoard("tagesaufgabe"), daily: true },
  { key: "tagestrick", label: "tricks.daily", board: () => dailyBoard("tagestrick"), daily: true, trick: true },
];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t, formatNumber } = useI18n();
  const [tab, setTab] = useState(TABS[0]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [result, setResult] = useState<BoardResult | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("idle");

  /** Liste laden (Ergebnis kommt asynchron; „lädt“ = noch kein Ergebnis). */
  const load = useCallback((which: Tab) => {
    if (!leaderboardReady) return;
    fetchBoard(which.board())
      .then((r) => {
        setResult(r);
        setState("idle");
      })
      .catch(() => setState("error"));
  }, []);

  // Beim Öffnen: Spitzname und die gewählte Liste (neu) laden
  const shown = useRef(tab);
  useFocusEffect(
    useCallback(() => {
      getPlayer()
        .then((p) => setName(p.name))
        .catch(() => undefined);
      load(shown.current);
    }, [load]),
  );

  function choose(next: Tab) {
    sfx("tap");
    shown.current = next;
    setTab(next);
    setResult(null);
    setState("idle");
    load(next);
  }

  function refresh() {
    setState("loading");
    load(tab);
  }

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/");
  }

  async function saveName() {
    const saved = await setPlayerName(draft);
    if (!saved) {
      setInvalid(true);
      return;
    }
    sfx("tap");
    setName(saved);
    setEditing(false);
    setInvalid(false);
    load(tab);
  }

  /** Punkte je Brett: Tages-Trick als Sterne + Versuche. */
  const scoreText = (score: number) => {
    if (!tab.trick) return formatNumber(score);
    const { stars, attempts } = decodeTrickScore(score);
    return `${"★".repeat(stars)} · ${attempts <= 1 ? t("trick.attemptsOne") : t("trick.attempts", { n: attempts })}`;
  };

  const meVisible = result?.rows.some((r) => r.isMe) ?? false;

  return (
    <View style={[styles.screen, { backgroundColor: colors.bg }]}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: Math.max(insets.top + Spacing.md, Spacing.lg),
            paddingBottom: insets.bottom + Spacing.lg,
          },
        ]}
        refreshControl={
          leaderboardReady ? (
            <RefreshControl refreshing={state === "loading"} onRefresh={refresh} />
          ) : undefined
        }
        keyboardShouldPersistTaps="handled"
      >
        <FadeIn>
          <View style={styles.header}>
            <IconButton icon="chevron-left" label={t("common.back")} onPress={handleBack} />
            <View style={styles.flex}>
              <AppText variant="title" accessibilityRole="header">
                {t("rank.title")}
              </AppText>
              <AppText tone="textSecondary">{t("rank.subtitle")}</AppText>
            </View>
          </View>
        </FadeIn>

        {/* Eigener Spitzname */}
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {editing ? (
            <>
              <TextInput
                value={draft}
                onChangeText={(v) => {
                  setDraft(v);
                  setInvalid(false);
                }}
                maxLength={16}
                autoFocus
                autoCorrect={false}
                returnKeyType="done"
                onSubmitEditing={saveName}
                accessibilityLabel={t("rank.you")}
                style={[styles.input, { color: colors.text, borderColor: invalid ? colors.warning : colors.border }]}
              />
              {invalid && (
                <AppText variant="caption" tone="warning">
                  {t("rank.nameInvalid")}
                </AppText>
              )}
              <View style={styles.row}>
                <Button title={t("rank.save")} onPress={saveName} />
                <Button title={t("common.cancel")} variant="ghost" onPress={() => setEditing(false)} />
              </View>
            </>
          ) : (
            <View style={styles.row}>
              <Feather name="user" size={20} color={colors.textSecondary} />
              <View style={styles.flex}>
                <AppText variant="caption" tone="textSecondary">
                  {t("rank.you")}
                </AppText>
                <AppText variant="label">{name}</AppText>
              </View>
              <Button
                title={t("rank.change")}
               
                variant="secondary"
                onPress={() => {
                  setDraft(name);
                  setEditing(true);
                }}
              />
            </View>
          )}
        </View>

        {/* Welche Liste */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
          {TABS.map((item) => {
            const active = item.key === tab.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                onPress={() => choose(item)}
                style={[
                  styles.tab,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                ]}
              >
                <AppText variant="caption" tone={active ? "onPrimary" : "text"}>
                  {t(item.label)}
                  {item.daily ? ` · ${t("rank.today")}` : ""}
                </AppText>
              </Pressable>
            );
          })}
        </ScrollView>

        {!leaderboardReady ? (
          <AppText tone="textSecondary" style={styles.note}>
            {t("rank.offline")}
          </AppText>
        ) : state === "error" ? (
          <AppText tone="textSecondary" style={styles.note}>
            {t("rank.error")}
          </AppText>
        ) : !result ? (
          <ActivityIndicator style={styles.note} color={colors.primary} />
        ) : result.rows.length === 0 ? (
          <AppText tone="textSecondary" style={styles.note}>
            {t("rank.empty")}
          </AppText>
        ) : (
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {result.rows.map((row, i) => (
              <View
                key={`${row.rank}-${row.name}-${i}`}
                style={[
                  styles.entry,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  row.isMe && { backgroundColor: colors.primarySoft },
                ]}
              >
                <AppText variant="label" style={styles.rank}>
                  {MEDAL[row.rank - 1] ?? `${row.rank}.`}
                </AppText>
                <AppText variant="label" style={styles.flex} numberOfLines={1}>
                  {row.name}
                </AppText>
                <AppText variant="label" tone={row.isMe ? "onPrimarySoft" : "text"}>
                  {scoreText(row.score)}
                </AppText>
              </View>
            ))}
          </View>
        )}

        {/* Eigener Platz, falls nicht unter den Besten */}
        {leaderboardReady && result?.me && !meVisible && (
          <AppText variant="label" center tone="textSecondary">
            {t("rank.myPlace", { rank: result.me.rank })} · {scoreText(result.me.score)}
          </AppText>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.md + 4, gap: Spacing.md },
  flex: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: Spacing.md },
  card: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  input: {
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 17,
  },
  tabs: { gap: Spacing.sm, paddingVertical: 2 },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  note: { textAlign: "center", marginTop: Spacing.md },
  list: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm + 2,
    minHeight: 48,
  },
  rank: { width: 36 },
});
