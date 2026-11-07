// Datei: app/freunde.tsx — Freunde (Online-Bereich, ROADMAP R4e)
//
// Eigener Freundes-Code (teilen), Freund per Code hinzufügen und die Liste der
// Freunde mit ihrem besten Zeit-Sprint und Survival-Lauf dieser Woche.
// Server: supabase/freunde.sql (über utils/leaderboard.ts).

import { Feather } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { ActivityIndicator, Alert, Pressable, Share, StyleSheet, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";

import { Avatar } from "@/components/areas/people";
import { Sheet } from "@/components/ui/sheet";
import { Chunky, cardEdge } from "@/components/ui/chunky";
import { Button } from "@/components/ui/button";
import { HubScreen } from "@/components/ui/hub";
import { IconButton } from "@/components/ui/icon-button";
import { press, tapHaptic } from "@/components/ui/press";
import { AREAS } from "@/constants/areas";
import { Radius, Spacing } from "@/constants/theme";
import { dailyParcoursId } from "@/game/parcours";
import { readCode } from "@/game/ghost-track";
import { PARCOURS } from "@/game/trick-levels";
import { type TranslationKey } from "@/i18n";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import {
  addFriend,
  fetchFriends,
  fetchOpenChallenges,
  type Friend,
  type FriendError,
  type OpenChallenge,
  formatFriendCode,
  getFriendCode,
  isMissingOnServer,
  leaderboardReady,
  removeFriend,
} from "@/utils/leaderboard";
import { sfx } from "@/utils/sfx";
import { todayKey } from "@/utils/storage";

const ERROR_TEXT: Record<FriendError, TranslationKey> = {
  invalid: "friends.err.invalid",
  unknown: "friends.err.unknown",
  self: "friends.err.self",
  full: "friends.err.full",
  friendFull: "friends.err.friendFull",
  setup: "rank.setup",
  network: "rank.error",
};

/** Inhalt „Freunde“ – ohne Kopf, damit er auch als Reiter im Online-Bereich stehen kann. */
export function FriendsPanel() {
  const { t } = useI18n();
  const { scheme, colors } = useAppTheme();
  const [code, setCode] = useState<string | null>(null);
  const [friends, setFriends] = useState<Friend[] | null>(null);
  /** Freunde, die heute mehr (oder gleich viel) geschafft haben als ich. */
  const [open, setOpen] = useState<OpenChallenge[]>([]);
  const [state, setState] = useState<"idle" | "error" | "setup">("idle");
  const [draft, setDraft] = useState("");
  /** Blatt „Freund hinzufügen“ (eigener Code, Teilen, Code eingeben). */
  const [inviteOpen, setInviteOpen] = useState(false);
  const [note, setNote] = useState<{ text: string; ok: boolean } | null>(null);
  const [adding, setAdding] = useState(false);
  const busy = useRef(false);

  /** Laden; `quiet`: Fehler nur als Hinweis (die Seite bleibt stehen). */
  const load = useCallback((quiet = false) => {
    if (!leaderboardReady) return;
    fetchOpenChallenges().then(setOpen, () => undefined);
    Promise.all([getFriendCode(), fetchFriends()])
      .then(([mine, list]) => {
        setCode(mine);
        setFriends(list);
        setState("idle");
      })
      .catch((e: unknown) => {
        // Leise: einen grünen Hinweis („hinzugefügt“) stehen lassen
        if (quiet) setNote((old) => (old?.ok ? old : { text: t("rank.error"), ok: false }));
        else setState(isMissingOnServer(e) ? "setup" : "error");
      });
  }, [t]);

  useFocusEffect(useCallback(() => load(), [load]));

  const add = async () => {
    // Sperre gegen Doppeltippen
    if (busy.current) return;
    // Ein Feld für beides: Nachricht mit Herausforderung (Ghost-Code) oder Freundes-Code
    const challenge = readCode(draft);
    if (typeof challenge !== "string") {
      // Sperre gegen Doppeltippen (sonst zwei Rennen übereinander)
      busy.current = true;
      setTimeout(() => {
        busy.current = false;
      }, 900);
      sfx("tap");
      const code = draft.trim();
      setDraft("");
      setNote(null);
      router.push({ pathname: "/runde", params: { mode: "ghost", code } });
      return;
    }
    if (challenge === "update") {
      setNote({ text: t("ghost.code.update"), ok: false });
      return;
    }
    busy.current = true;
    setAdding(true);
    const result = await addFriend(draft);
    busy.current = false;
    setAdding(false);
    if ("error" in result) {
      setNote({ text: t(ERROR_TEXT[result.error]), ok: false });
      return;
    }
    sfx("tap");
    setDraft("");
    setNote({ text: t("friends.added", { name: result.name }), ok: true });
    load(true);
  };

  /** Gegen den Lauf eines Freundes von heute antreten. */
  const race = (mode: "sprint" | "survival", friendCode: string) =>
    router.push({ pathname: "/runde", params: { mode, friend: friendCode } });

  /** Offene Herausforderung annehmen (Zeile oder Knopf „Antreten“). */
  const takeOn = (c: OpenChallenge) =>
    c.mode === "parcours"
      ? router.push({ pathname: "/runde", params: { mode: "parcours", level: String(c.level), friend: c.code } })
      : race(c.mode, c.code);

  /** Herausfordern: Modus wählen, dann gegen den Lauf des Freundes von heute. */
  const challenge = (friend: Friend) => {
    const go = (mode: "sprint" | "survival") => race(mode, friend.code);
    Alert.alert(t("friends.challenge", { name: friend.name }), t("friends.challengeInfo", { name: friend.name }), [
      { text: `⏱️ ${t("sprint.title")}`, onPress: () => go("sprint") },
      { text: `🛡️ ${t("survival.title")}`, onPress: () => go("survival") },
      {
        text: `🎯 ${t("hub.parcours.title")}`,
        onPress: () =>
          router.push({
            pathname: "/runde",
            params: { mode: "parcours", level: String(dailyParcoursId(todayKey(), PARCOURS.map((p) => p.id))), friend: friend.code },
          }),
      },
      { text: t("common.cancel"), style: "cancel" },
    ]);
  };

  const askRemove = (friend: Friend) => {
    Alert.alert(t("friends.remove", { name: friend.name }), t("friends.removeInfo", { name: friend.name }), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("friends.removeYes"),
        style: "destructive",
        onPress: () => {
          removeFriend(friend.code)
            .then(() => load(true))
            .catch(() => setNote({ text: t("rank.error"), ok: false }));
        },
      },
    ]);
  };

  const share = () => {
    if (!code) return;
    Share.share({ message: t("friends.shareText", { code: formatFriendCode(code) }) }).catch(() => undefined);
  };

  const best = (n: number | null) => (n == null ? "–" : String(n));

  return (
    <View style={styles.panel}>
      {!leaderboardReady ? (
        <AppText tone="textSecondary" center>
          {t("friends.offline")}
        </AppText>
      ) : state !== "idle" ? (
        <View style={styles.center}>
          <AppText tone="textSecondary" center>
            {t(state === "setup" ? "rank.setup" : "rank.error")}
          </AppText>
          <Button title={t("common.retry")} icon="refresh-cw" variant="secondary" onPress={() => load()} />
        </View>
      ) : !code || !friends ? (
        <ActivityIndicator color={colors.primary} />
      ) : (
        <>
          {/* Offene Herausforderungen: Freunde, die heute vorgelegt haben */}
          {open.length > 0 && (
            <View style={[styles.card, { backgroundColor: colors.goldSoft, borderColor: colors.border }]}>
              <AppText variant="label" color={colors.onGoldSoft}>
                ⚔️ {t("friends.open")}
              </AppText>
              {open.map((c) => (
                // Ganze Zeile antippbar (für VoiceOver bleibt der Knopf das eine Ziel)
                <Pressable
                  key={`${c.code}-${c.mode}`}
                  accessible={false}
                  onPress={() => {
                    tapHaptic();
                    takeOn(c);
                  }}
                  style={({ pressed }) => [styles.row, pressed && press.pressedLarge]}
                >
                  <View style={styles.flex}>
                    <AppText variant="body" color={colors.onGoldSoft} numberOfLines={1}>
                      {c.mode === "sprint" ? "⏱️" : c.mode === "survival" ? "🛡️" : "🎯"}{" "}
                      {t(c.mode === "parcours" ? "friends.openRowPoints" : "friends.openRow", { name: c.name, n: c.correct })}
                    </AppText>
                    {/* Gleichstand: kurze eigene Zeile, damit nichts abgeschnitten wird */}
                    {c.tie && (
                      <AppText variant="caption" color={colors.onGoldSoft} numberOfLines={2}>
                        {t("friends.openRowTie")}
                      </AppText>
                    )}
                    {/* Ziel vor Augen: so viele mehr als mein Bestes von heute gewinnen */}
                    {c.need !== undefined && (
                      <AppText variant="caption" color={colors.onGoldSoft} numberOfLines={2}>
                        {t(
                          c.mode === "parcours"
                            ? c.need === 1
                              ? "friends.openNeedPointsOne"
                              : "friends.openNeedPoints"
                            : c.need === 1
                              ? "friends.openNeedOne"
                              : "friends.openNeed",
                          { n: c.need },
                        )}
                      </AppText>
                    )}
                  </View>
                  <Button title={t("friends.go")} icon="play" onPress={() => takeOn(c)} />
                </Pressable>
              ))}
            </View>
          )}

          {/* Liste */}
          {friends.length > 0 && (
            <AppText variant="overline" tone="textSecondary" accessibilityRole="header">
              {t("friends.week").toUpperCase()}
            </AppText>
          )}
          {friends.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardEdge(colors.border)]}>
              <AppText style={styles.emptyEmoji}>👋</AppText>
              <AppText tone="textSecondary" center>
                {t("friends.empty")}
              </AppText>
            </View>
          ) : (
            <View style={styles.friendCards}>
              {friends.map((f) => (
                <View
                  key={f.code}
                  style={[styles.friendCard, { backgroundColor: colors.surface, borderColor: colors.border }, cardEdge(colors.border)]}
                >
                  <Avatar name={f.name} size={44} />
                  <View style={styles.flex}>
                    <AppText variant="label" numberOfLines={1}>
                      {f.name}
                    </AppText>
                    {/* Bestwerte als kleine Pillen */}
                    <View
                      style={styles.pills}
                      accessible
                      accessibilityLabel={`${t("sprint.title")} ${best(f.sprint)}, ${t("survival.title")} ${best(f.survival)}`}
                    >
                      <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                        <AppText variant="caption" tone="textSecondary">
                          ⏱️ {best(f.sprint)}
                        </AppText>
                      </View>
                      <View style={[styles.pill, { backgroundColor: colors.surfaceAlt }]}>
                        <AppText variant="caption" tone="textSecondary">
                          🛡️ {best(f.survival)}
                        </AppText>
                      </View>
                    </View>
                  </View>
                  {/* Antreten: der Hauptknopf der Karte */}
                  <Chunky
                    color="#1E8A57"
                    depth={4}
                    radius={Radius.pill}
                    label={t("friends.challenge", { name: f.name })}
                    onPress={() => challenge(f)}
                    faceStyle={styles.playFace}
                  >
                    <Feather name="play" size={20} color="#FFFFFF" />
                  </Chunky>
                  <IconButton icon="x" label={t("friends.remove", { name: f.name })} onPress={() => askRemove(f)} style={styles.removeBtn} />
                </View>
              ))}
            </View>
          )}
          {/* Hinzufügen: ein Knopf – Code, Teilen und Eingabe wohnen im Blatt */}
          <Button
            title={t("friends.addTitle")}
            icon="user-plus"
            variant={friends.length === 0 ? "primary" : "secondary"}
            onPress={() => {
              setNote(null);
              setInviteOpen(true);
            }}
          />
          {/* Meldungen (z. B. Fehler beim Entfernen) auch außerhalb des Blatts zeigen */}
          {!inviteOpen && note && (
            <AppText variant="caption" tone={note.ok ? "primary" : "warning"} center>
              {note.text}
            </AppText>
          )}
          <Sheet visible={inviteOpen} title={t("friends.addTitle")} onClose={() => setInviteOpen(false)}>
            <AppText variant="caption" tone="textSecondary">
              {t("friends.myCode")}
            </AppText>
            <AppText variant="title" selectable accessibilityLabel={code.split("").join(" ")} style={styles.codeText}>
              {formatFriendCode(code)}
            </AppText>
            <Button title={t("friends.share")} icon="share" variant="secondary" onPress={share} />
            <AppText variant="overline" tone="textSecondary" style={styles.sheetGap} accessibilityRole="header">
              {t("friends.add").toUpperCase()}
            </AppText>
            <TextInput
              value={draft}
              onChangeText={(v) => {
                setDraft(v);
                setNote(null);
              }}
              autoCorrect={false}
              autoCapitalize="none"
              maxLength={600}
              returnKeyType="done"
              onSubmitEditing={add}
              placeholder={t("friends.placeholder")}
              placeholderTextColor={colors.textMuted}
              keyboardAppearance={scheme}
              accessibilityLabel={t("friends.add")}
              style={[
                styles.input,
                { color: colors.text, borderColor: note && !note.ok ? colors.warning : colors.border },
              ]}
            />
            {note && (
              <AppText variant="caption" tone={note.ok ? "primary" : "warning"}>
                {note.text}
              </AppText>
            )}
            <View style={styles.row}>
              <Button
                title={t("friends.addGo")}
                icon="user-plus"
                onPress={add}
                disabled={adding || !draft.trim()}
                style={styles.flex}
              />
              <ActivityIndicator color={colors.primary} animating={adding} hidesWhenStopped={false} style={{ opacity: adding ? 1 : 0 }} />
            </View>
          </Sheet>
        </>
      )}
    </View>
  );
}

export default function FriendsScreen() {
  const { t } = useI18n();
  return (
    <HubScreen title={t("friends.title")} subtitle={t("friends.subtitle")} emoji="👫" area={AREAS.online}>
      <FriendsPanel />
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  panel: { gap: Spacing.md },
  flex: { flex: 1 },
  center: { alignItems: "center", gap: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  card: { padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.sm },
  codeText: { fontSize: 30, lineHeight: 38, letterSpacing: 3 },
  sheetGap: { marginTop: Spacing.sm },
  emptyCard: { alignItems: "center", gap: Spacing.sm, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 1 },
  emptyEmoji: { fontSize: 44, lineHeight: 54 },
  friendCards: { gap: Spacing.sm },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
  pill: { paddingHorizontal: Spacing.sm, paddingVertical: 2, borderRadius: Radius.pill },
  playFace: { flexDirection: "row", minHeight: 44, minWidth: 56, justifyContent: "center", paddingHorizontal: Spacing.md },
  removeBtn: { width: 36, height: 36, borderRadius: 18, opacity: 0.85 },
  friendCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.sm,
    paddingLeft: Spacing.md - 4,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  input: {
    borderWidth: 2,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 17,
  },
  list: { borderRadius: Radius.lg, borderWidth: 1, overflow: "hidden" },
  entry: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingLeft: Spacing.md,
    paddingRight: Spacing.xs,
    paddingVertical: Spacing.xs,
    minHeight: 52,
  },
});
