// Datei: app/_layout.tsx

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { AppColors } from "@/constants/theme";

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: AppColors.bg,
          },
          animation: "slide_from_right",
        }}
      />

      <StatusBar style="light" />
    </>
  );
}
