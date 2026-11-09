// Datei: constants/legal.ts — Web-Adressen der Rechtstexte (Datenschutzerklärung, Impressum)
//
// Sobald die Seiten online sind, hier eintragen (docs/veroeffentlichung/README.md, Schritt B1 Nr. 3).
// Leer = die Zeilen in den Einstellungen bleiben unsichtbar. Google und Apple verlangen den Link auch in der App.
// Zwei Sprachen: Die Adresse für Englisch gilt, wenn die App auf Englisch läuft.

export const LEGAL_URLS: Record<"privacy" | "imprint", { de: string; en: string }> = {
  privacy: {
    de: "https://philipph96h96.github.io/muellsortieren-recht/datenschutz.html",
    en: "https://philipph96h96.github.io/muellsortieren-recht/privacy.html",
  },
  imprint: {
    de: "https://philipph96h96.github.io/muellsortieren-recht/impressum.html",
    en: "https://philipph96h96.github.io/muellsortieren-recht/impressum.html",
  },
};

/** Adresse in der passenden Sprache (fehlt die englische, gilt die deutsche). */
export function legalUrl(kind: keyof typeof LEGAL_URLS, lang: string): string {
  const u = LEGAL_URLS[kind];
  return (lang === "en" ? u.en || u.de : u.de || u.en);
}
