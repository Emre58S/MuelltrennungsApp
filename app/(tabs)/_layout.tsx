// Datei: app/(tabs)/_layout.tsx — Clean UI v6

import { Feather } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { type ComponentProps, useMemo } from "react";
import { type ColorValue, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const C = {
  bar: "#101816",
  border: "#22302B",
  active: "#8FD3A6",
  inactive: "#66756E",
};

type IconName = ComponentProps<typeof Feather>["name"];

function TabIcon({
  name,
  color,
  focused,
}: {
  name: IconName;
  color: ColorValue;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Feather name={name} size={20} color={color} />
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const hideTabs = pathname.includes("/explore");

  const bottomInset = Math.max(insets.bottom, 8);

  const tabBarStyle = useMemo(
    () => [
      styles.tabBar,
      { height: 64 + bottomInset, paddingBottom: bottomInset },
      hideTabs && styles.hiddenTabBar,
    ],
    [bottomInset, hideTabs],
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: C.active,
        tabBarInactiveTintColor: C.inactive,
        tabBarStyle,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
        tabBarHideOnKeyboard: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="spielen"
        options={{
          title: "Spielen",
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="play-circle" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: C.bar,
    borderTopColor: C.border,
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    elevation: 0,
  },
  hiddenTabBar: { display: "none" },
  label: { fontSize: 11, fontWeight: "800", marginTop: 2 },
  item: { paddingTop: 0 },
  iconWrap: {
    width: 54,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: { backgroundColor: "rgba(143,211,166,0.14)" },
});
