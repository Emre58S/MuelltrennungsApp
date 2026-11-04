// Datei: app/bereiche.tsx — neue Hülle: Pfad · Online · Regal mit unterer Leiste
//
// Die drei Bereiche liegen nebeneinander (wischen oder unten antippen). Alles
// andere (Runden, Freunde, Rangliste, Sammelbuch …) öffnet darüber und führt mit
// „Zurück“ wieder hierher, in denselben Bereich. Noch hinter dem Schalter
// „Neues Menü“ in den Einstellungen (StorageKeys.NAV_V2), bis der Umbau fertig ist.

import { useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AREA_BAR_HEIGHT, AreaBar } from "@/components/nav/area-bar";
import { AreaPager } from "@/components/nav/area-pager";
import { ShellContext } from "@/components/nav/shell-context";
import { AREA_ORDER, type AreaKey } from "@/constants/areas";
import { useAppSettings, useAppTheme } from "@/providers/app-settings";

import KampagneScreen from "./kampagne";
import OnlineScreen from "./online";
import SammlungScreen from "./sammlung";

export default function BereicheScreen() {
  const { start } = useLocalSearchParams<{ start?: string }>();
  const { colors } = useAppTheme();
  const { reduceMotion } = useAppSettings();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(() => Math.max(0, AREA_ORDER.indexOf(start as AreaKey)));
  const [wiggles, setWiggles] = useState<Record<AreaKey, number>>({ pfad: 0, online: 0, regal: 0 });

  const select = useCallback((i: number) => {
    setIndex(i);
    const key = AREA_ORDER[i];
    setWiggles((w) => ({ ...w, [key]: w[key] + 1 }));
  }, []);
  const goArea = useCallback((key: AreaKey) => select(AREA_ORDER.indexOf(key)), [select]);

  const shell = useMemo(
    () => ({ inShell: true, bottomInset: AREA_BAR_HEIGHT + insets.bottom, goArea }),
    [insets.bottom, goArea],
  );

  return (
    <ShellContext.Provider value={shell}>
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <AreaPager index={index} onIndexChange={select} reduceMotion={reduceMotion}>
          {[
            () => <KampagneScreen />,
            () => <OnlineScreen />,
            () => <SammlungScreen />,
          ]}
        </AreaPager>
        <AreaBar active={AREA_ORDER[index]} wiggles={wiggles} onSelect={goArea} />
      </View>
    </ShellContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
