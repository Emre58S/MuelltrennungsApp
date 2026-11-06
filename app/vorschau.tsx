// Datei: app/vorschau.tsx — Werkzeug-Seite (nur Entwicklung, im ausgelieferten Spiel leer)
//
// Zeigt das 3D-Modell eines Gegenstands (?i=Nummer in ITEMS) formatfüllend auf der festen
// Farbe der Sammelbuch-Kacheln. tools/item-shots.mjs fotografiert damit alle Gegenstände;
// die Bilder (assets/items/) sind die Vorschau in der Sammlung – dieselbe Pose und dasselbe
// Modell wie im Spiel und im Blatt.

import { useLocalSearchParams } from "expo-router";
import { Text, useWindowDimensions, View } from "react-native";

import { ItemPreview3D } from "@/components/game/item-preview";
import { ITEMS } from "@/constants/items";
import { ITEM_IMAGE_BG } from "@/constants/item-images";

export default function VorschauScreen() {
  const { i } = useLocalSearchParams<{ i?: string }>();
  const { width } = useWindowDimensions();
  if (!__DEV__) return null;
  const item = ITEMS[Number(i ?? 0)];
  if (!item) return null;
  return (
    <View style={{ flex: 1, backgroundColor: ITEM_IMAGE_BG }}>
      <ItemPreview3D item={item} size={width} background={ITEM_IMAGE_BG} calm label={item.name} />
      {/* Marke für das Werkzeug (liegt außerhalb des Bildes): Seite ist fertig gezeichnet */}
      <Text style={{ position: "absolute", top: 2000, left: 0 }}>{`vorschau bereit ${item.name}`}</Text>
    </View>
  );
}
