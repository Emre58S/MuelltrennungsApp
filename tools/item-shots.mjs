// Fotografiert alle Gegenstände (3D-Modell, wie im Spiel) für die Sammlung.
// Voraussetzung: `npx expo start --web --port 8095` läuft, Chrome ist installiert, Node ≥ 22.
// Aufruf: node tools/item-shots.mjs [Port] [Start-Nummer]
// Ergebnis: assets/items/NN.jpg (256 × 256) und constants/item-images.ts (Zuordnung Name → Bild).
// Je Gegenstand ein frischer Browser (ein langlebiger sammelte 3D-Zustände an und hing).
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const PORT_APP = process.argv[2] ?? "8095";
const START = Number(process.argv[3] ?? 0);
const END = Number(process.argv[4] ?? 1e9);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const SIZE = 128; // CSS-Pixel; mit Pixeldichte 2 → 256 px
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const file = (n) => `assets/items/${String(n).padStart(2, "0")}.jpg`;

// Namen aus constants/items.ts lesen (Reihenfolge = Index in ITEMS)
const src = readFileSync("constants/items.ts", "utf8");
const names = [...src.matchAll(/^\s*name:\s*"((?:[^"\\]|\\.)*)"/gm)].map((m) => JSON.parse(`"${m[1]}"`));
console.log(names.length, "Gegenstände");
mkdirSync("assets/items", { recursive: true });

/** Ein Gegenstand mit eigenem Browser; gibt true zurück, wenn das Bild gespeichert wurde. */
async function shoot(n) {
  const port = 9300 + Math.floor(Math.random() * 400);
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
      "--ignore-gpu-blocklist",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.env.TEMP}/item-shots-profile-${port}`,
      `--window-size=${SIZE},${SIZE}`,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    let targets = null;
    for (let i = 0; i < 40 && !targets; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${port}/json`);
        if (r.ok) targets = await r.json();
      } catch {}
      if (!targets) await sleep(500);
    }
    const page = targets?.find((t) => t.type === "page");
    if (!page) return false;
    const ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });
    let id = 0;
    const pending = new Map();
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) {
        pending.get(d.id)(d);
        pending.delete(d.id);
      }
    };
    // Jeder Befehl mit Zeitlimit, damit nichts ewig hängt
    const send = (method, params = {}, ms = 20000) =>
      Promise.race([
        new Promise((res) => {
          const i = ++id;
          pending.set(i, res);
          ws.send(JSON.stringify({ id: i, method, params }));
        }),
        sleep(ms).then(() => null),
      ]);
    const text = async () => (await send("Runtime.evaluate", { expression: "document.body ? document.body.innerText : ''", returnByValue: true }, 5000))?.result?.result?.value ?? "";
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: SIZE, height: SIZE, deviceScaleFactor: 2, mobile: true });
    await send("Page.navigate", { url: `http://localhost:${PORT_APP}/vorschau?i=${n}` });
    let ready = false;
    for (let t = 0; t < 90; t++) {
      if ((await text()).includes("vorschau bereit")) {
        ready = true;
        break;
      }
      await sleep(1000);
    }
    if (!ready) return false;
    await sleep(2500); // Modell und Licht fertig zeichnen
    const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }, 20000);
    if (!shot?.result?.data) return false;
    writeFileSync(file(n), Buffer.from(shot.result.data, "base64"));
    ws.close();
    return true;
  } catch (e) {
    console.log("Fehler", n, String(e).slice(0, 80));
    return false;
  } finally {
    chrome.kill();
  }
}

for (let n = START; n < Math.min(names.length, END); n++) {
  let ok = existsSync(file(n)) && START > 0 && n < START; // nur beim Fortsetzen übersprungene zählen
  for (let versuch = 0; !ok && versuch < 3; versuch++) ok = await shoot(n);
  console.log(ok ? "ok" : "FEHLT", n, names[n]);
}

// Zuordnung schreiben (alle vorhandenen Dateien)
const lines = names
  .map((name, n) => (existsSync(file(n)) ? `  ${JSON.stringify(name)}: require("../assets/items/${String(n).padStart(2, "0")}.jpg"),` : null))
  .filter(Boolean);
const header = readFileSync("constants/item-images.ts", "utf8").split("/** Wird von tools/item-shots.mjs überschrieben. */")[0];
writeFileSync(
  "constants/item-images.ts",
  `${header}/** Wird von tools/item-shots.mjs überschrieben. */\nexport const ITEM_IMAGES: Record<string, number> = {\n${lines.join("\n")}\n};\n`,
);
console.log("constants/item-images.ts geschrieben:", lines.length, "Bilder");
