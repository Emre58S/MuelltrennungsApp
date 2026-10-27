// Datei: app/(tabs)/_layout.tsx — Design v3
//
// Nur noch ein Ziel (Home = Spielen-Hub). Die Spielrunde („runde“) ist eine
// eigene Seite im Haupt-Stack (app/runde.tsx): Seit SDK 58 lässt sich ein
// versteckter Tab (href: null) nicht mehr per router.push öffnen.
// Darum kein Tab-Navigator mehr, sondern eine schlichte Hülle (Slot): Die
// Tab-Ansicht nutzte auf iOS das native Bauteil RNSScreenNavigationContainer,
// das Expo Go beim Laden über EAS Update nicht kannte („Unimplemented
// component“).

import { Slot } from "expo-router";
import { View } from "react-native";

import { useAppTheme } from "@/providers/app-settings";

export default function TabLayout() {
  const { colors } = useAppTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Slot />
    </View>
  );
}
