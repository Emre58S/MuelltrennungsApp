// Datei: app/(tabs)/_layout.tsx — Design v3
//
// Nur noch ein Ziel (Home = Spielen-Hub). Tab-Leiste ist ausgeblendet,
// die Spielrunde („runde“) ist ein versteckter Tab.

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
      <Tabs.Screen name="runde" options={{ href: null }} />
    </Tabs>
  );
}