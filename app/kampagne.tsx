// Datei: app/kampagne.tsx — Bereich „Kampagne“ (Einzelspieler)
//
// Hinter der grünen Menü-Tonne: alle Spielarten für allein – Üben, Ohne
// Fehler, Gegen die Zeit, Tagesaufgabe, Trickwürfe. Wird später zum Lernpfad
// mit Stationen (ROADMAP.md, R2).

import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { HubCard, HubScreen } from "@/components/ui/hub";
import { HIGHSCORE_MODE } from "@/components/game/round-hooks";
import { type GameMode, getLastMode, MENU_MODES, startDaily, startGame } from "@/constants/modes";
import { useI18n } from "@/providers/app-settings";
import { type DailyResult, getHighscoreKey, getNumber, getTodayDaily } from "@/utils/storage";

const MODE_LOOK: Partial<Record<GameMode, { emoji: string; color: string }>> = {
  endless: { emoji: "🌱", color: "#2FA86E" },
  survival: { emoji: "🛡️", color: "#3D82D9" },
  time: { emoji: "⏱️", color: "#E3A92E" },
};

export default function KampagneScreen() {
  const { t, formatNumber } = useI18n();
  const [scores, setScores] = useState<Partial<Record<GameMode, number>>>({});
  const [lastMode, setLastMode] = useState<GameMode | null>(null);
  const [daily, setDaily] = useState<DailyResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      Promise.all([
        getNumber(getHighscoreKey(HIGHSCORE_MODE.endless)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.survival)),
        getNumber(getHighscoreKey(HIGHSCORE_MODE.time)),
        getLastMode(),
        getTodayDaily(),
      ])
        .then(([endless, survival, time, mode, today]) => {
          if (!active) return;
          setScores({ endless, survival, time });
          setLastMode(mode);
          setDaily(today);
          setLoaded(true);
        })
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );

  let index = 0;
  return (
    <HubScreen title={t("hub.campaign.title")} subtitle={t("hub.campaign.subtitle")} emoji="🎓">
      {MENU_MODES.map((m) => {
        const look = MODE_LOOK[m.mode] ?? { emoji: "🎮", color: "#2FA86E" };
        const score = scores[m.mode] ?? 0;
        return (
          <HubCard
            key={m.mode}
            index={index++}
            emoji={look.emoji}
            color={look.color}
            title={t(m.titleKey)}
            desc={t(m.descKey)}
            info={score > 0 ? `🏆 ${formatNumber(score)}` : null}
            badge={loaded && m.mode === lastMode ? t("hub.last") : null}
            onPress={() => startGame(m.mode)}
          />
        );
      })}
      <HubCard
        index={index++}
        emoji="📅"
        color="#FFD54A"
        title={t("home.daily")}
        desc={t("home.dailyNew")}
        info={daily ? t("home.dailyDone", { correct: daily.correct, total: daily.total, score: daily.score }) : null}
        dot={loaded && !daily}
        onPress={startDaily}
      />
      <HubCard
        index={index++}
        emoji="🎯"
        color="#7C5CD6"
        title={t("home.tricks")}
        desc={t("home.tricksDesc")}
        onPress={() => router.push("/tricks")}
      />
    </HubScreen>
  );
}
