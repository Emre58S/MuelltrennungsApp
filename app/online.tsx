// Datei: app/online.tsx — Bereich „Online“ (Mehrspieler)
//
// Hinter der blauen Menü-Tonne: gegen den eigenen Rekord, den Besten von
// heute oder Freunde per Code (Ghost), zu zweit an einem Handy (Duell) und
// die Rangliste. Später: Zeit-Sprint, Survival, Trick-Battle (ROADMAP.md, R4).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { HubCard, HubScreen } from "@/components/ui/hub";
import { useI18n } from "@/providers/app-settings";
import { getBoolean, setBoolean, StorageKeys } from "@/utils/storage";

export default function OnlineScreen() {
  const { t } = useI18n();
  const [seenDuel, setSeenDuel] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getBoolean(StorageKeys.SEEN_DUEL, false)
        .then((seen) => active && setSeenDuel(seen))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  return (
    <HubScreen title={t("hub.online.title")} subtitle={t("hub.online.subtitle")} emoji="🌍">
      <HubCard
        index={0}
        emoji="👻"
        color="#4DA3FF"
        title={t("home.ghostShort")}
        desc={t("home.ghostDesc")}
        onPress={() => router.push({ pathname: "/runde", params: { mode: "ghost" } })}
      />
      <HubCard
        index={1}
        emoji="🤝"
        color="#FF8A3D"
        title={t("hub.duel.title")}
        desc={t("home.duelDesc")}
        dot={!seenDuel}
        onPress={() => {
          setBoolean(StorageKeys.SEEN_DUEL, true).catch(() => undefined);
          router.push({ pathname: "/runde", params: { mode: "duel" } });
        }}
      />
      <HubCard
        index={2}
        emoji="🏆"
        color="#E3A92E"
        title={t("home.rank")}
        desc={t("rank.subtitle")}
        onPress={() => router.push("/rangliste")}
      />
    </HubScreen>
  );
}
