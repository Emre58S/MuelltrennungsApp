// Datei: app/index.tsx

import { type Href, Redirect } from "expo-router";
import { useEffect, useState } from "react";

import { homeRoute } from "@/utils/nav";

export default function IndexScreen() {
  // PLAYTESTING:
  // Login vorübergehend überspringen und direkt zur App. Mit dem Schalter
  // Standard ist die Bereichs-Hülle; wer „Neues Menü“ (Einstellungen) abschaltet, bekommt die Menü-Tonnen.
  const [target, setTarget] = useState<Href | null>(null);
  useEffect(() => {
    let active = true;
    homeRoute().then((href) => active && setTarget(href));
    return () => {
      active = false;
    };
  }, []);
  return target ? <Redirect href={target} /> : null;
}
