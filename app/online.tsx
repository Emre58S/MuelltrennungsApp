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
import { useCallback, useState } from "react";
import { StyleSheet } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { HubCard, HubScreen } from "@/components/ui/hub";
import { Segmented } from "@/components/ui/segmented";
import { AREAS } from "@/constants/areas";
import { Spacing } from "@/constants/theme";
import { dailyParcoursId } from "@/game/parcours";
import { levelIcons, PARCOURS } from "@/game/trick-levels";
import { useI18n } from "@/providers/app-settings";
import { getParcoursBest, todayKey } from "@/utils/storage";

import { FriendsPanel } from "./freunde";

/** Parcours des Tages zu einem Tag (für alle gleich). */
function parcoursOfDay(day: string) {
  const id = dailyParcoursId(day, PARCOURS.map((p) => p.id));
  return PARCOURS.find((p) => p.id === id) ?? PARCOURS[0];
}

type Tab = "duel" | "friends" | "rank";

export default function OnlineScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("duel");
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
            onPress={() => router.push({ pathname: "/runde", params: { mode: "sprint" } })}
          />
          <HubCard
            index={1}
            emoji="🛡️"
            color="#E2574C"
            title={t("survival.title")}
            desc={t("hub.survival.desc")}
            onPress={() => router.push({ pathname: "/runde", params: { mode: "survival" } })}
          />
          <HubCard
            index={2}
            emoji={levelIcons(today)[0] ?? "🎯"}
            color="#F06BA8"
            title={t("hub.parcours.title")}
            desc={t("hub.parcours.desc", { task: t(today.task), s: today.seconds })}
            info={parcoursBest > 0 ? t("parcours.best", { n: parcoursBest }) : null}
            onPress={() => router.push({ pathname: "/runde", params: { mode: "parcours", level: String(today.id) } })}
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

      {/* Vorläufig: die Rangliste öffnet noch als eigene Seite (kommt als Reiter-Inhalt, F5b) */}
      {tab === "rank" && (
        <HubCard
          index={0}
          emoji="🏆"
          color="#E3A92E"
          title={t("home.rank")}
          desc={t("rank.subtitle")}
          onPress={() => router.push("/rangliste")}
        />
      )}
    </HubScreen>
  );
}

const styles = StyleSheet.create({
  // Überschrift einer Gruppe: wenige, klare Abschnitte statt vieler gleicher Karten
  group: { marginTop: Spacing.sm },
});
