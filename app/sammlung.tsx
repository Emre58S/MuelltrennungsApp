// Datei: app/sammlung.tsx — Bereich „Regal“ (Sammlung)
//
// Alles, was man sich erspielt hat, auf einer Seite statt hinter zwei Karten:
//  · Buch        – alle Gegenstände (gefunden = Modell + Medaille, sonst „?“)
//  · Belohnungen – Wurfspuren und Tonnen-Sticker
//  · Heute       – Tagesmissionen mit Stempeln und Truhe
// Die eigenen Seiten /sammelbuch und /belohnungen bleiben (Links, Altes Menü).

import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";

import { TodayPanel } from "@/components/areas/today-panel";
import { useShell } from "@/components/nav/shell-context";
import { HubScreen } from "@/components/ui/hub";
import { Segmented } from "@/components/ui/segmented";
import { AREAS } from "@/constants/areas";
import { useI18n } from "@/providers/app-settings";
import { getChests } from "@/utils/storage";

import { RewardsPanel } from "./belohnungen";
import { BookPanel } from "./sammelbuch";

type Tab = "book" | "rewards" | "today";

export default function SammlungScreen() {
  const { t } = useI18n();
  const shell = useShell();
  // Wunsch von außen (z. B. Pfad → „Heute“): beim ersten Aufbau und bei jedem neuen Wunsch übernehmen
  const wish = shell.tabs.regal;
  const [tab, setTab] = useState<Tab>((wish?.tab as Tab | undefined) ?? "book");
  const [seen, setSeen] = useState(wish?.n ?? 0);
  // Wartet eine Truhe? (Punkt am Reiter „Heute“) In der Hülle gibt es dafür eine gemeinsame Quelle,
  // sonst (eigene Seite im alten Menü) laden wir es selbst.
  const [ownWaiting, setOwnWaiting] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (shell.inShell) return undefined;
      let active = true;
      getChests()
        .then((c) => active && setOwnWaiting(c.earned - c.opened > 0))
        .catch(() => undefined);
      return () => {
        active = false;
      };
    }, [shell.inShell]),
  );
  const chestWaiting = shell.inShell ? shell.chestWaiting : ownWaiting;
  if (wish && wish.n !== seen) {
    setSeen(wish.n);
    setTab(wish.tab as Tab);
  }
  return (
    <HubScreen title={t("hub.collection.title")} subtitle={t("hub.collection.subtitle")} emoji="🎒" area={AREAS.regal} scrollKey={tab}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        color={AREAS.regal.fill}
        onColor={AREAS.regal.on}
        options={[
          { value: "book", label: t("hub.book.title") },
          { value: "rewards", label: t("home.rewards") },
          { value: "today", label: t("regal.tab.today"), dot: chestWaiting && tab !== "today", dotLabel: t("chest.open") },
        ]}
      />
      {tab === "book" ? <BookPanel /> : tab === "rewards" ? <RewardsPanel /> : <TodayPanel />}
    </HubScreen>
  );
}
