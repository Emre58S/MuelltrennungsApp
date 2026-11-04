// Datei: app/online.tsx — Bereich „Online“ (Mehrspieler)
//
// Ein Bildschirm mit drei Reitern statt einer langen Kartenliste:
//  · Duell     – Zeit-Sprint (R4a), Survival (R4b), Parcours des Tages (R4c) und das
//                Ghost-Rennen gegen den Besten von heute
//  · Freunde   – eigener Code, Freunde, „Code eingeben“ (Freundes-Code oder
//                Herausforderung in einem Feld), offene Herausforderungen (R4e)
//  · Rangliste – je Modus (R4f)
// „Zu zweit an einem Handy“ gibt es nicht mehr (Nutzer, 4.11.).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { HubCard, HubScreen } from "@/components/ui/hub";
import { press, tapHaptic } from "@/components/ui/press";
import { Segmented } from "@/components/ui/segmented";
import { Sheet } from "@/components/ui/sheet";
import { AREAS } from "@/constants/areas";
import { Radius, Spacing } from "@/constants/theme";
import { dailyParcoursId } from "@/game/parcours";
import { levelIcons, PARCOURS } from "@/game/trick-levels";
import { useAppTheme, useI18n } from "@/providers/app-settings";
import { type Friend, fetchFriends, leaderboardReady } from "@/utils/leaderboard";
import { getParcoursBest, todayKey } from "@/utils/storage";

import { FriendsPanel } from "./freunde";
import { RankingPanel } from "./rangliste";

/** Parcours des Tages zu einem Tag (für alle gleich). */
function parcoursOfDay(day: string) {
  const id = dailyParcoursId(day, PARCOURS.map((p) => p.id));
  return PARCOURS.find((p) => p.id === id) ?? PARCOURS[0];
}

type Tab = "duel" | "friends" | "rank";
/** Modi, die man gegen einen Zufallsgegner oder einen Freund spielen kann. */
type Versus = "sprint" | "survival" | "parcours";

export default function OnlineScreen() {
  const { t } = useI18n();
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<Tab>("duel");
  /** Gewählter Modus – öffnet das Blatt „Zufallsgegner · Freund herausfordern“. */
  const [picked, setPicked] = useState<Versus | null>(null);
  /** null: lädt noch · "error": nicht ladbar (kein Netz) – etwas anderes als „keine Freunde“. */
  const [friends, setFriends] = useState<Friend[] | "error" | null>(null);
  const [tries, setTries] = useState(0);
  // Freunde bei jedem Öffnen des Blatts frisch laden (man kann dazwischen welche hinzugefügt haben)
  useEffect(() => {
    if (!picked || !leaderboardReady) return;
    let active = true;
    fetchFriends()
      .then((list) => active && setFriends(list))
      .catch(() => active && setFriends("error"));
    return () => {
      active = false;
    };
  }, [picked, tries]);
  // Sperre gegen Doppeltippen (das Blatt gleitet noch hinaus, sonst zwei Runden übereinander)
  const lockUntil = useRef(0);
  // Parcours des Tages: Tag beim Öffnen und bei jeder Rückkehr neu (über Mitternacht offen → neuer Parcours)
  const [day, setDay] = useState(todayKey);
  const today = parcoursOfDay(day);
  const [parcoursBest, setParcoursBest] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const now = todayKey();
      setDay(now);
      getParcoursBest()
        .then((best) => active && setParcoursBest(best[parcoursOfDay(now).id] ?? 0))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  /** Parcours des Tages hat eine feste Stufe, die anderen Modi nicht. */
  const startParams = (mode: Versus, friend?: string) => ({
    mode,
    ...(mode === "parcours" ? { level: String(today.id) } : {}),
    ...(friend ? { friend } : {}),
  });
  const start = (mode: Versus, friend?: string) => {
    if (Date.now() < lockUntil.current) return;
    lockUntil.current = Date.now() + 900;
    setPicked(null);
    router.push({ pathname: "/runde", params: startParams(mode, friend) });
  };
  const pickedTitle = picked === "sprint" ? t("sprint.title") : picked === "survival" ? t("survival.title") : t("hub.parcours.title");
  const best = (n: number | null) => (n == null ? "–" : String(n));

  return (
    <HubScreen title={t("hub.online.title")} subtitle={t("hub.online.subtitle")} emoji="🌍" area={AREAS.online}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        color={AREAS.online.fill}
        onColor={AREAS.online.on}
        options={[
          { value: "duel", label: t("online.tab.duel") },
          { value: "friends", label: t("friends.title") },
          { value: "rank", label: t("home.rank") },
        ]}
      />

      {tab === "duel" && (
        <>
          <AppText variant="overline" tone="textSecondary" style={styles.group} accessibilityRole="header">
            {t("hub.group.quick")}
          </AppText>
          <HubCard
            index={0}
            emoji="⏱️"
            color="#2BB673"
            title={t("sprint.title")}
            desc={t("hub.sprint.desc")}
            onPress={() => setPicked("sprint")}
          />
          <HubCard
            index={1}
            emoji="🛡️"
            color="#E2574C"
            title={t("survival.title")}
            desc={t("hub.survival.desc")}
            onPress={() => setPicked("survival")}
          />
          <HubCard
            index={2}
            emoji={levelIcons(today)[0] ?? "🎯"}
            color="#F06BA8"
            title={t("hub.parcours.title")}
            desc={t("hub.parcours.desc", { task: t(today.task), s: today.seconds })}
            info={parcoursBest > 0 ? t("parcours.best", { n: parcoursBest }) : null}
            onPress={() => setPicked("parcours")}
          />
          <HubCard
            index={3}
            emoji="👻"
            color="#4DA3FF"
            title={t("home.ghostShort")}
            desc={t("home.ghostDesc")}
            onPress={() => router.push({ pathname: "/runde", params: { mode: "ghost" } })}
          />
        </>
      )}

      {tab === "friends" && <FriendsPanel />}

      {tab === "rank" && <RankingPanel />}

      <Sheet visible={picked !== null} title={pickedTitle} onClose={() => setPicked(null)}>
        <Button title={t("duel.random")} icon="shuffle" size="lg" onPress={() => picked && start(picked)} />
        <AppText variant="overline" tone="textSecondary" style={styles.group} accessibilityRole="header">
          {t("duel.friend")}
        </AppText>
        {!leaderboardReady ? (
          <AppText tone="textSecondary">{t("friends.offline")}</AppText>
        ) : friends === null ? (
          <ActivityIndicator color={colors.primary} />
        ) : friends === "error" ? (
          <>
            <AppText tone="textSecondary">{t("rank.error")}</AppText>
            <Button
              title={t("common.retry")}
              icon="refresh-cw"
              variant="secondary"
              onPress={() => {
                setFriends(null);
                setTries((n) => n + 1);
              }}
            />
          </>
        ) : friends.length === 0 ? (
          <>
            <AppText tone="textSecondary">{t("duel.noFriends")}</AppText>
            <Button
              title={t("duel.toFriends")}
              icon="users"
              variant="secondary"
              onPress={() => {
                setPicked(null);
                setTab("friends");
              }}
            />
          </>
        ) : (
          <ScrollView style={styles.friendList} keyboardShouldPersistTaps="handled">
            {friends.map((f, i) => (
              <Pressable
                key={f.code}
                accessibilityRole="button"
                accessibilityLabel={t("friends.challenge", { name: f.name })}
                onPress={() => {
                  tapHaptic();
                  if (picked) start(picked, f.code);
                }}
                style={({ pressed }) => [
                  styles.friendRow,
                  i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
                  pressed && press.pressedLarge,
                ]}
              >
                <AppText variant="label" style={styles.friendName} numberOfLines={1}>
                  {f.name}
                </AppText>
                {picked !== "parcours" && (
                  <AppText variant="caption" tone="textSecondary">
                    {picked === "sprint" ? `⏱️ ${best(f.sprint)}` : `🛡️ ${best(f.survival)}`}
                  </AppText>
                )}
                <AppText>▶</AppText>
              </Pressable>
            ))}
          </ScrollView>
        )}
      </Sheet>
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  // Überschrift einer Gruppe: wenige, klare Abschnitte statt vieler gleicher Karten
  group: { marginTop: Spacing.sm },
  friendList: { maxHeight: 260 },
  friendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    minHeight: 52,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.md,
  },
  friendName: { flex: 1 },
});
