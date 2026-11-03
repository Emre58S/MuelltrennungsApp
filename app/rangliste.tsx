// Datei: app/rangliste.tsx — Rangliste
//
// Anonyme Bestenlisten (utils/leaderboard.ts): Zeit-Sprint und Survival
// (Online-Bereich, diese Woche oder Allzeit), Gegen die Zeit, Ohne Fehler und
// die heutigen Tages-Bretter (Tagesaufgabe, Tages-Trick – für alle gleich).
// Oben der eigene Spitzname (änderbar), unten der eigene Platz, falls man
// nicht unter den Besten steht.

import { Feather } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
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
import { PageHeader } from "@/components/ui/page-header";
import { Radius, Spacing } from "@/constants/theme";
import { dailyParcoursId } from "@/game/parcours";
import { PARCOURS } from "@/game/trick-levels";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  type Board,
  type BoardResult,
  dailyBoard,
  decodeTrickScore,
  fetchBoard,
  fetchOnlineBoard,
  fetchParcoursBoard,
  getPlayer,
  isMissingOnServer,
  leaderboardReady,
  type OnlineMode,
  setPlayerName,
} from "@/utils/leaderboard";
import { sfx } from "@/utils/sfx";
import { todayKey } from "@/utils/storage";

type Tab = {
  key: string;
  label: TranslationKey;
  board?: () => Board;
  /** Online-Modus: Liste aus den Läufen (supabase/online.sql), Woche oder Allzeit */
  online?: OnlineMode;
  daily?: boolean;
  trick?: boolean;
  /** Parcours des Tages: Punkte von heute (supabase/parcours.sql) */
  parcours?: boolean;
};
type Span = "week" | "all";

const TABS: Tab[] = [
  { key: "sprint", label: "sprint.title", online: "sprint" },
  { key: "survival", label: "survival.title", online: "survival" },
  { key: "parcours", label: "hub.parcours.title", parcours: true },
  // „Gegen die Zeit“/„Ohne Fehler“ solo ohne Rangliste (ROADMAP R4f) – sonst
  // verwechselbar mit Zeit-Sprint/Survival
  { key: "tagesaufgabe", label: "home.daily", board: () => dailyBoard("tagesaufgabe"), daily: true },
  { key: "tagestrick", label: "tricks.daily", board: () => dailyBoard("tagestrick"), daily: true, trick: true },
];

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const insets = useSafeAreaInsets();
  const { colors, scheme } = useAppTheme();
  const { t, formatNumber } = useI18n();
  // ?tab=sprint|survival: aus dem Endbildschirm direkt zur passenden Liste
  const { tab: startTab } = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState(() => TABS.find((x) => x.key === startTab) ?? TABS[0]);
  const [name, setName] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [invalid, setInvalid] = useState(false);
  const [result, setResult] = useState<BoardResult | null>(null);
  // „setup“: Verbindung steht, aber die Online-Liste ist auf dem Server noch nicht eingerichtet
  const [state, setState] = useState<"idle" | "loading" | "error" | "setup">("idle");
  const [span, setSpan] = useState<Span>("week");
  // Parcours des Tages (wie auf der Online-Karte) – beim Öffnen gewählt
  const [today] = useState(() => {
    const day = todayKey();
    const id = dailyParcoursId(day, PARCOURS.map((p) => p.id));
    return { day, level: PARCOURS.find((p) => p.id === id) ?? PARCOURS[0] };
  });

  /** Gerade gewählte Liste – späte Antworten anderer Listen werden verworfen. */
  const shown = useRef(tab);
  const shownSpan = useRef(span);

  /** Liste laden (Ergebnis kommt asynchron; „lädt“ = noch kein Ergebnis). */
  const load = useCallback((which: Tab, when: Span) => {
    if (!leaderboardReady) return;
    const current = () => shown.current === which && (!which.online || shownSpan.current === when);
    (which.online
      ? fetchOnlineBoard(which.online, when)
      : which.parcours
        ? fetchParcoursBoard(today.level.id, today.day)
        : fetchBoard(which.board!())
    )
      .then((r) => {
        if (!current()) return;
        setResult(r);
        setState("idle");
      })
      .catch((e: unknown) => {
        if (current()) setState(isMissingOnServer(e) ? "setup" : "error");
      });
  }, [today]);

  // Beim Öffnen: Spitzname und die gewählte Liste (neu) laden
  useFocusEffect(
    useCallback(() => {
      getPlayer()
        .then((p) => setName(p.name))
        .catch(() => undefined);
      load(shown.current, shownSpan.current);
    }, [load]),
  );

  function choose(next: Tab) {
    sfx("tap");
    shown.current = next;
    setTab(next);
    setResult(null);
    setState("idle");
    load(next, span);
  }

  function chooseSpan(next: Span) {
    if (next === span) return;
    sfx("tap");
    shownSpan.current = next;
    setSpan(next);
    setResult(null);
    setState("idle");
    load(tab, next);
  }

  function refresh() {
    setState("loading");
    load(tab, span);
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
    load(tab, span);
  }

  /** Punkte je Brett: Online-Modi als „N richtig“, Tages-Trick als Sterne + Versuche. */
  const scoreText = (score: number) => {
    if (tab.online) return t("rank.correct", { n: formatNumber(score) });
    if (tab.parcours) return t("parcours.points", { n: formatNumber(score) });
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
        <PageHeader title={t("rank.title")} subtitle={t("rank.subtitle")} emoji="🏆" />

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
                placeholder={t("rank.namePlaceholder")}
                placeholderTextColor={colors.textMuted}
                keyboardAppearance={scheme}
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
                <Button
                  title={t("common.cancel")}
                  variant="ghost"
                  onPress={() => {
                    setEditing(false);
                    setInvalid(false);
                  }}
                />
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

        {/* Online-Modi: diese Woche (ab Montag) oder Allzeit */}
        {tab.online && (
          <>
            <View style={styles.row}>
              {(["week", "all"] as const).map((item) => {
                const active = item === span;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    onPress={() => chooseSpan(item)}
                    style={[
                      styles.tab,
                      styles.flex,
                      {
                        backgroundColor: active ? colors.primarySoft : colors.surface,
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText variant="caption" center tone={active ? "onPrimarySoft" : "text"}>
                      {t(item === "week" ? "rank.week" : "rank.allTime")}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
            <AppText variant="caption" tone="textSecondary">
              {t("rank.onlineHint")}
            </AppText>
          </>
        )}

        {/* Parcours des Tages: welcher heute dran ist */}
        {tab.parcours && (
          <AppText variant="caption" tone="textSecondary">
            {t("rank.parcoursHint", { task: t(today.level.task) })}
          </AppText>
        )}

        {!leaderboardReady ? (
          <AppText tone="textSecondary" style={styles.note}>
            {t("rank.offline")}
          </AppText>
        ) : state === "setup" || state === "error" ? (
          <View style={styles.errorBox}>
            <AppText tone="textSecondary" center>
              {t(state === "setup" ? "rank.setup" : "rank.error")}
            </AppText>
            {/* Ziehen zum Aktualisieren kennt kaum jemand – daher ein Knopf */}
            <Button title={t("common.retry")} icon="refresh-cw" variant="secondary" onPress={refresh} />
          </View>
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
  errorBox: { alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
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
