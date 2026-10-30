// Datei: app/sammlung.tsx — Bereich „Sammlung“
//
// Hinter der gelben Menü-Tonne: alles, was man sich erspielt hat –
// Sammelbuch (Gegenstände, Medaillen) und Belohnungen (Wurfspuren, Sticker).

import { router } from "expo-router";

import { HubCard, HubScreen } from "@/components/ui/hub";
import { useI18n } from "@/providers/app-settings";

export default function SammlungScreen() {
  const { t } = useI18n();
  return (
    <HubScreen title={t("hub.collection.title")} subtitle={t("hub.collection.subtitle")} emoji="🎒">
      <HubCard
        index={0}
        emoji="📖"
        color="#2FA86E"
        title={t("home.book")}
        desc={t("book.subtitle")}
        onPress={() => router.push("/sammelbuch")}
      />
      <HubCard
        index={1}
        emoji="🎁"
        color="#E3A92E"
        title={t("home.rewards")}
        desc={t("reward.subtitle")}
        onPress={() => router.push("/belohnungen")}
      />
    </HubScreen>
  );
}
