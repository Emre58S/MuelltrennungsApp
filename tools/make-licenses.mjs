// Liest die Lizenzen der direkten Abhängigkeiten (package.json → dependencies) aus node_modules und schreibt
// constants/licenses.ts für die Seite „Open-Source-Lizenzen“ (app/lizenzen.tsx).
// Aufruf: node tools/make-licenses.mjs   (nach jedem Hinzufügen/Ändern von Abhängigkeiten wiederholen)
import { readFileSync, writeFileSync } from "node:fs";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const rows = [];
// Nur Werkzeuge der Entwicklung, nicht in der fertigen App
const DEV_ONLY = new Set(["@expo/ngrok", "babel-preset-expo"]);
for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
  if (DEV_ONLY.has(name)) continue;
  let p;
  try {
    p = JSON.parse(readFileSync(`node_modules/${name}/package.json`, "utf8"));
  } catch {
    console.log("fehlt in node_modules:", name);
    continue;
  }
  const license = typeof p.license === "string" ? p.license : (p.license?.type ?? (p.licenses?.[0]?.type ?? "siehe Paket"));
  let url = typeof p.repository === "string" ? p.repository : (p.repository?.url ?? p.homepage ?? "");
  url = url.replace(/^git\+/, "").replace(/\.git$/, "").replace(/^git:\/\//, "https://").replace(/^ssh:\/\/git@/, "https://");
  rows.push({ name, version: p.version, license, url });
}
const body = rows
  .map((r) => `  { name: ${JSON.stringify(r.name)}, version: ${JSON.stringify(r.version)}, license: ${JSON.stringify(r.license)}, url: ${JSON.stringify(r.url)} },`)
  .join("\n");
writeFileSync(
  "constants/licenses.ts",
  `// Datei: constants/licenses.ts — ERZEUGT von tools/make-licenses.mjs, nicht von Hand ändern.
// Direkte Abhängigkeiten der App mit Lizenz (für die Seite „Open-Source-Lizenzen“).

export type LicenseRow = { name: string; version: string; license: string; url: string };

export const LICENSES: LicenseRow[] = [
${body}
];
`,
);
console.log(rows.length, "Pakete");
const kinds = {};
for (const r of rows) kinds[r.license] = (kinds[r.license] ?? 0) + 1;
console.log(kinds);
