// Datei: app/(tabs)/_layout.tsx — Design v3
//
// Nur noch ein Ziel (Home = Spielen-Hub), Tab-Leiste ausgeblendet. Die
// Spielrunde („runde“) ist eine eigene Seite im Haupt-Stack (app/runde.tsx):
// Seit SDK 58 lässt sich ein versteckter Tab (href: null) nicht mehr per
// router.push öffnen – das Menü lud dann nur neu.

import { Tabs } from "expo-router";

import { useAppTheme } from "@/providers/app-settings";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { display: "none" },
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen name="index" />
    </Tabs>
  );
}