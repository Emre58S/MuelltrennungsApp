// Datei: app/index.tsx

import { Redirect } from "expo-router";

export default function IndexScreen() {
  // PLAYTESTING:
  // Login vorübergehend überspringen und direkt zur App.
  return <Redirect href="/(tabs)" />;
}
