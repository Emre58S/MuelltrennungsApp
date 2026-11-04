// Datei: app/index.tsx

import { type Href, Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { getBoolean, StorageKeys } from "@/utils/storage";

export default function IndexScreen() {
  // PLAYTESTING:
  // Login vorübergehend überspringen und direkt zur App. Mit dem Schalter
  // „Neues Menü“ (Einstellungen) startet die Bereichs-Hülle statt der Menü-Tonnen.
  const [target, setTarget] = useState<Href | null>(null);
  useEffect(() => {
    let active = true;
    getBoolean(StorageKeys.NAV_V2, false)
      .then((v) => active && setTarget(v ? "/bereiche" : "/(tabs)"))
      .catch(() => active && setTarget("/(tabs)"));
    return () => {
      active = false;
    };
  }, []);
  return target ? <Redirect href={target} /> : null;
}
