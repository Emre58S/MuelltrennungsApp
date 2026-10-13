// Datei: app/(tabs)/_layout.tsx — Design v2

import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { type ComponentProps } from "react";
import { type ColorValue, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FontFamily } from "@/constants/theme";
import { useAppTheme, useI18n } from "@/providers/app-settings";

type IconName = ComponentProps<typeof Feather>["name"];

function TabIcon({
  name,
  color,
  focused,
  activeBg,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
  activeBg: string;
}) {
  return (
    <View style={[styles.iconWrap, focused && { backgroundColor: activeBg }]}>
      <Feather name={name} size={22} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { colors } = useAppTheme();
  const { t } = useI18n();
  const hideTabs = pathname.includes("/explore");

  const bottomInset = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.onPrimarySoft,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            height: 68 + bottomInset,
            paddingBottom: bottomInset,
          },
          hideTabs && styles.hidden,
        ],
        tabBarLabelStyle: styles.label,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: colors.bg },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="home"
              color={color}
              focused={focused}
              activeBg={colors.primarySoft}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="spielen"
        options={{
          title: t("home.play"),
          tabBarIcon: ({ color, focused }) => (
            <TabIcon
              name="play-circle"
              color={color}
              focused={focused}
              activeBg={colors.primarySoft}
            />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { borderTopWidth: 1, paddingTop: 8, elevation: 0 },
  hidden: { display: "none" },
  label: { fontSize: 12, fontFamily: FontFamily.semibold, marginTop: 2 },
  iconWrap: {
    width: 56,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
});
