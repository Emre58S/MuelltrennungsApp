// Datei: app/index.tsx — Einstieg: direkt in die Bereichs-Hülle (Pfad · Online · Regal)

import { Redirect } from "expo-router";

import { HOME } from "@/utils/nav";

export default function IndexScreen() {
  return <Redirect href={HOME} />;
}
