// Datei: app/bereiche.tsx — neue Hülle: Pfad · Online · Regal mit unterer Leiste
//
// Die drei Bereiche liegen nebeneinander (wischen oder unten antippen). Alles
// andere (Runden, Freunde, Rangliste, Sammelbuch …) öffnet darüber und führt mit
// „Zurück“ wieder hierher, in denselben Bereich. Das ist der Start der App.

import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AREA_BAR_HEIGHT, AreaBar } from "@/components/nav/area-bar";
import { AreaPager } from "@/components/nav/area-pager";
import { ShellHeader } from "@/components/nav/shell-header";
import { type Shell, ShellContext } from "@/components/nav/shell-context";
import { AREA_ORDER, type AreaKey } from "@/constants/areas";
import { homeHint } from "@/game/home-hint";
import { useAppSettings, useAppTheme, useI18n } from "@/providers/app-settings";
import { type DayGhost, fetchDayGhost, fetchOpenChallenges } from "@/utils/leaderboard";
import { playMusic, refreshMusicSetting } from "@/utils/music";
import { refreshSfxSetting } from "@/utils/sfx";
import {
  flushThrowRecords,
  getBoolean,
  getCampaignStars,
  getChests,
  getFlame,
  getLevelProgress,
  getNumber,
  getTodayDaily,
  StorageKeys,
  takeRescueNotice,
  todayKey,
} from "@/utils/storage";
import type { FlameStatus } from "@/utils/streak";

import KampagneScreen from "./kampagne";
import OnlineScreen from "./online";
import SammlungScreen from "./sammlung";

export default function BereicheScreen() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() => Math.max(0, AREA_ORDER.indexOf(start as AreaKey)));
  const [wiggles, setWiggles] = useState<Record<AreaKey, number>>({ pfad: 0, online: 0, regal: 0 });

  // Kopfzeile und Punkte: bei jedem Zurückkommen frisch (wie das alte Menü)
  const [loaded, setLoaded] = useState(false);
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [flame, setFlame] = useState<FlameStatus>("none");
  const [seenTutorial, setSeenTutorial] = useState(true);
  const [dailyDone, setDailyDone] = useState(true);
  const [chestWaiting, setChestWaiting] = useState(false);
  const [starTotal, setStarTotal] = useState(0);
  const [friend, setFriend] = useState<{ name: string } | null>(null);
  const [dayBest, setDayBest] = useState<DayGhost | null>(null);
  useFocusEffect(
    useCallback(() => {
      let active = true;
      refreshSfxSetting();
      // Ruhige Menü-Musik (blendet sanft von der Runde herüber)
      refreshMusicSetting().then(() => playMusic("menu"));
      // Erst gesammelte Würfe der letzten Runde schreiben, dann lesen
      flushThrowRecords()
        .then(() =>
          Promise.all([
            getFlame(),
            getNumber(StorageKeys.TOTAL_XP),
            getTodayDaily(),
            getBoolean(StorageKeys.HAS_SEEN_TUTORIAL, false),
          ]),
        )
        // „Gerettet“ nur beim ersten Besuch danach zeigen, später wie normal
        .then(async ([flameNow, xp, today, seen]) => {
          const rescueNew = flameNow.status === "rescued" && (await takeRescueNotice());
          return [flameNow, xp, today, seen, rescueNew] as const;
        })
        .then(([flameNow, xp, today, seen, rescueNew]) => {
          if (!active) return;
          setSeenTutorial(seen);
          setDailyDone(today !== null);
          setStreak(flameNow.count);
          setFlame(flameNow.status === "rescued" && !rescueNew ? "ok" : flameNow.status);
          setTotalXP(xp);
        })
        .catch((error) => console.warn("[Bereiche] Fortschritt konnte nicht geladen werden:", error))
        .finally(() => active && setLoaded(true));
      getCampaignStars()
        .then((s) => active && setStarTotal(Object.values(s).reduce((a, b) => a + b, 0)))
        .catch(() => undefined);
      getChests()
        .then((c) => active && setChestWaiting(c.earned - c.opened > 0))
        .catch(() => undefined);
      // Offene Herausforderung eines Freundes (still, falls offline; höchstens 1 min alt)
      fetchOpenChallenges(60_000)
        .then((open) => active && setFriend(open[0] ? { name: open[0].name } : null))
        .catch(() => undefined);
      // Tagesbester im Ghost-Rennen (still, falls offline)
      fetchDayGhost(todayKey())
        .then((best) => active && setDayBest(best))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, []),
  );
  const { level, progress } = getLevelProgress(totalXP);
  const { t } = useI18n();

  const select = useCallback((i: number) => {
    setIndex(i);
    const key = AREA_ORDER[i];
    setWiggles((w) => ({ ...w, [key]: w[key] + 1 }));
  }, []);
  const [tabs, setTabs] = useState<Shell["tabs"]>({});
  const goArea = useCallback(
    (key: AreaKey, tab?: string) => {
      if (tab) setTabs((old) => ({ ...old, [key]: { tab, n: (old[key]?.n ?? 0) + 1 } }));
      select(AREA_ORDER.indexOf(key));
    },
    [select],
  );

  // Ein Hinweis mit Vorrang-Regel (game/home-hint.ts). „Wirf in eine Tonne“ gibt es hier nicht.
  const h = homeHint({ totalXP, flame, dailyDone, dayBest, friend });
  const toOnline = h.key === "home.hintFriend" || h.key === "home.hintDayBest" || h.key === "home.hintDayBestMe";
  const hint =
    !loaded || h.key === "home.throwHint"
      ? null
      : {
          text: h.key === "home.hintDayBest" || h.key === "home.hintFriend" ? t(h.key, { name: h.name }) : t(h.key),
          onPress: () => goArea(toOnline ? "online" : "pfad"),
        };

  const shell = useMemo(
    () => ({
      inShell: true,
      bottomInset: AREA_BAR_HEIGHT + insets.bottom,
      goArea,
      tabs,
      chestWaiting,
      setChestWaiting,
    }),
    [insets.bottom, goArea, tabs, chestWaiting],
  );

  return (
    <ShellContext.Provider value={shell}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <ShellHeader
          loaded={loaded}
          level={level}
          progress={progress}
          streak={streak}
          flame={flame}
          seenTutorial={seenTutorial}
          stars={starTotal}
          hint={hint}
        />
        <AreaPager index={index} onIndexChange={select} reduceMotion={reduceMotion}>
          {[
            () => <KampagneScreen />,
            () => <OnlineScreen />,
            () => <SammlungScreen />,
          ]}
        </AreaPager>
        <AreaBar
          active={AREA_ORDER[index]}
          wiggles={wiggles}
          dots={{ pfad: loaded && !dailyDone, online: friend !== null, regal: chestWaiting }}
          onSelect={goArea}
        />
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
