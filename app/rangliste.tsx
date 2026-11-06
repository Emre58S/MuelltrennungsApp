// Datei: app/rangliste.tsx — Rangliste
//
// Anonyme Bestenlisten (utils/leaderboard.ts): Zeit-Sprint und Survival
// (Online-Bereich, diese Woche oder Allzeit), Gegen die Zeit, Ohne Fehler und
// die heutigen Tages-Bretter (Tagesaufgabe, Tages-Trick – für alle gleich).
// Oben der eigene Spitzname (änderbar), unten der eigene Platz, falls man
// nicht unter den Besten steht.

import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Avatar, Podium } from "@/components/areas/people";
import { Feather } from "@expo/vector-icons";
import { cardEdge, tone } from "@/components/ui/chunky";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { HubScreen } from "@/components/ui/hub";
import { AREAS } from "@/constants/areas";
import { Radius, Spacing } from "@/constants/theme";
import { dailyParcoursId } from "@/game/parcours";
import { PARCOURS } from "@/game/trick-levels";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  type Board,
  type BoardResult,
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
  // Tagesaufgabe und Tages-Trick stehen nicht mehr in der Rangliste (Nutzer, 6.11.): nur noch die drei Online-Modi
];

/** Symbol je Liste (in der Reihe zeigt nur die gewählte ihren Namen). */
const MODE_EMOJI: Record<string, string> = { sprint: "⏱️", survival: "🛡️", parcours: "🎯" };

const MEDAL = ["🥇", "🥈", "🥉"];

/** Inhalt „Rangliste“ – ohne Kopf, damit er auch als Reiter im Online-Bereich stehen kann. */
export function RankingPanel({ startTab }: { startTab?: string }) {
  const { colors, scheme } = useAppTheme();
  const { t, formatNumber } = useI18n();
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
    <View style={styles.panel}>
      <>
        {/* Eine Zeile: welche Liste (nur Symbole, die gewählte mit Name) */}
        <View style={styles.modes}>
          {TABS.map((item) => {
            const active = item.key === tab.key;
            return (
              <Pressable
                key={item.key}
                accessibilityRole="tab"
                accessibilityLabel={t(item.label)}
                accessibilityState={{ selected: active }}
                onPress={() => choose(item)}
                style={[
                  styles.mode,
                  {
                    backgroundColor: active ? colors.primary : colors.surface,
                    borderColor: active ? colors.primary : colors.border,
                  },
                  active && { borderBottomWidth: 4, borderBottomColor: tone(colors.primary, -0.3) },
                ]}
              >
                <AppText style={styles.modeEmoji}>{MODE_EMOJI[item.key]}</AppText>
                {active && (
                  <AppText variant="label" tone="onPrimary" numberOfLines={1}>
                    {t(item.label)}
                  </AppText>
                )}
              </Pressable>
            );
          })}
          {leaderboardReady && (
            <IconButton icon="refresh-cw" label={t("rank.refresh")} onPress={refresh} style={styles.refresh} />
          )}
        </View>

        {/* Zweite Zeile: Woche/Allzeit links, eigener Name rechts */}
        <View style={styles.subRow}>
          {tab.online ? (
            <View style={styles.spans}>
              {(["week", "all"] as const).map((item) => {
                const active = item === span;
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    hitSlop={4}
                    onPress={() => chooseSpan(item)}
                    style={[
                      styles.span,
                      {
                        backgroundColor: active ? colors.primarySoft : "transparent",
                        borderColor: active ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <AppText variant="caption" center tone={active ? "onPrimarySoft" : "textSecondary"}>
                      {t(item === "week" ? "rank.week" : "rank.allTime")}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.flex} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${t("rank.you")}: ${name}. ${t("rank.change")}`}
            hitSlop={4}
            onPress={() => {
              setDraft(name);
              setEditing(true);
            }}
            style={[styles.namePill, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Avatar name={name || "?"} size={24} />
            <AppText variant="caption" numberOfLines={1} style={styles.nameText}>
              {name || "…"}
            </AppText>
            <Feather name="edit-2" size={13} color={colors.textSecondary} />
          </Pressable>
        </View>

        {editing && (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }, cardEdge(colors.border)]}>
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
          </View>
        )}

        {/* Parcours des Tages: welcher heute dran ist (eine kleine Zeile) */}
        {tab.parcours && (
          <AppText variant="caption" tone="textSecondary">
            {t("rank.parcoursHint", { task: t(today.level.task) })}
          </AppText>
        )}

        {/* Eigener Platz, falls nicht unter den Besten – gleich oben sichtbar */}
        {leaderboardReady && result?.me && !meVisible && (
          <View style={[styles.myPlace, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
            <AppText variant="label" tone="onPrimarySoft">
              🏅 {t("rank.myPlace", { rank: result.me.rank })} · {scoreText(result.me.score)}
            </AppText>
          </View>
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
          <>
          <Podium rows={result.rows} scoreText={scoreText} youLabel={t("rank.meTag")} />
          {result.rows.length > 3 && (
          <View style={[styles.list, { backgroundColor: colors.surface, borderColor: colors.border }, cardEdge(colors.border)]}>
            {result.rows.slice(3).map((row, i) => (
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
          </>
        )}

      </>
    </View>
  );
}

export default function LeaderboardScreen() {
  const { t } = useI18n();
  // ?tab=sprint|survival: aus dem Endbildschirm direkt zur passenden Liste
  const { tab } = useLocalSearchParams<{ tab?: string }>();
  return (
    <HubScreen title={t("rank.title")} subtitle={t("rank.subtitle")} emoji="🏆" area={AREAS.online}>
      <RankingPanel startTab={tab} />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.md },
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
  // Umbrechen statt waagrecht scrollen (Wischen zwischen den Bereichen bleibt frei)
  tabs: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.sm, paddingVertical: 2 },
  tab: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 40,
    justifyContent: "center",
  },
  note: { textAlign: "center", marginTop: Spacing.md },
  myPlace: { alignItems: "center", padding: Spacing.sm + 2, borderRadius: Radius.lg, borderWidth: 2 },
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
  // Bricht um, falls der Name der gewählten Liste lang ist (kleine Handys) – nichts wird abgeschnitten
  modes: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.xs + 2 },
  mode: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 44,
    minWidth: 44,
    maxWidth: "100%",
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  modeEmoji: { fontSize: 20, lineHeight: 26 },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.sm },
  spans: { flexDirection: "row", gap: Spacing.xs + 2 },
  span: { minHeight: 36, justifyContent: "center", paddingHorizontal: Spacing.md, borderRadius: Radius.pill, borderWidth: 1 },
  namePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    minHeight: 36,
    maxWidth: 170,
    flexShrink: 1,
    paddingHorizontal: Spacing.sm + 2,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  nameText: { flexShrink: 1 },
  refresh: { width: 44, height: 44, borderRadius: 22, marginLeft: "auto" },
});
