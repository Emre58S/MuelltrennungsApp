// Datei: components/game/bin-label-textures.ts
// Beschriftung der Tonnen als Textur (Bilder aus scripts/generate-bin-labels.ps1).
// Jede Textur wird einmal geladen und danach geteilt.

import * as THREE from "three";

import { type BinKey } from "@/constants/theme";
import { type Language } from "@/i18n";

const SOURCES: Record<Language, Partial<Record<BinKey, number>>> = {
  de: {
    bio: require("../../assets/labels/bio-de.png"),
    gelb: require("../../assets/labels/gelb-de.png"),
    rest: require("../../assets/labels/rest-de.png"),
    papier: require("../../assets/labels/papier-de.png"),
    glas: require("../../assets/labels/glas-de.png"),
  },
  en: {
    bio: require("../../assets/labels/bio-en.png"),
    gelb: require("../../assets/labels/gelb-en.png"),
    rest: require("../../assets/labels/rest-en.png"),
    papier: require("../../assets/labels/papier-en.png"),
    glas: require("../../assets/labels/glas-en.png"),
  },
};

const cache = new Map<string, THREE.Texture>();
const loader = new THREE.TextureLoader();

/** Textur der Beschriftung. Lädt im Hintergrund; `texture.image` ist erst
 *  danach gesetzt (bis dahin die Beschriftung ausblenden). */
export function binLabelTexture(key: BinKey, lang: Language): THREE.Texture | null {
  const source = SOURCES[lang][key];
  if (source === undefined) return null;
  const id = `${key}-${lang}`;
  let texture = cache.get(id);
  if (!texture) {
    // R3F (native) lädt Asset-Module über expo-asset – daher die Modul-ID als „URL“
    texture = loader.load(source as unknown as string);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    cache.set(id, texture);
  }
  return texture;
}
