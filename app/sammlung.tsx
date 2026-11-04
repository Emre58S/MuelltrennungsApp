// Datei: app/sammlung.tsx — Bereich „Regal“ (Sammlung)
//
// Alles, was man sich erspielt hat, auf einer Seite statt hinter zwei Karten:
//  · Buch        – alle Gegenstände (gefunden = Modell + Medaille, sonst „?“)
//  · Belohnungen – Wurfspuren und Tonnen-Sticker
// Die eigenen Seiten /sammelbuch und /belohnungen bleiben (Links, Altes Menü).

import { useState } from "react";

import { HubScreen } from "@/components/ui/hub";
import { Segmented } from "@/components/ui/segmented";
import { AREAS } from "@/constants/areas";
import { useI18n } from "@/providers/app-settings";

import { RewardsPanel } from "./belohnungen";
import { BookPanel } from "./sammelbuch";

type Tab = "book" | "rewards";

export default function SammlungScreen() {
  const { t } = useI18n();
  const [tab, setTab] = useState<Tab>("book");
  return (
    <HubScreen title={t("hub.collection.title")} subtitle={t("hub.collection.subtitle")} emoji="🎒" area={AREAS.regal}>
      <Segmented<Tab>
        value={tab}
        onChange={setTab}
        color={AREAS.regal.fill}
        onColor={AREAS.regal.on}
        options={[
          { value: "book", label: t("hub.book.title") },
          { value: "rewards", label: t("home.rewards") },
        ]}
      />
      {tab === "book" ? <BookPanel /> : <RewardsPanel />}
    </HubScreen>
  );
}
