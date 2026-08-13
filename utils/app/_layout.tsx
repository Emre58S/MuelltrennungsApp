// Datei: app/_layout.tsx
import { DarkTheme, ThemeProvider } from "@react-navigation/native";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

export const unstable_settings = {
  initialRouteName: "login",
};

export default function RootLayout() {
  return (
    <ThemeProvider value={DarkTheme}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: "#0B1120" },
          animation: "slide_from_right",
        }}
      >
        <Stack.Screen name="login" />
        <Stack.Screen name="register" />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="tutorial"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="modi"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="einstellung"
          options={{ animation: "slide_from_bottom" }}
        />
        <Stack.Screen
          name="modal"
          options={{ presentation: "modal", title: "Modal" }}
        />
      </Stack>
      <StatusBar style="light" />
    </ThemeProvider>
  );
}
