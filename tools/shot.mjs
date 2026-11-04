// Rendert eine Seite der Expo-Web-App in headless Chrome und speichert ein Bild – so sieht man 3D-Änderungen,
// ohne Handy. Voraussetzung: `npx expo start --web` läuft (localhost:8081), Chrome ist installiert, Node ≥ 22.
// Aufruf: node tools/shot.mjs <url> <ausgabe.png> [Klicks] [Wartezeit-ms] [Breite] [Höhe]
//   Klicks: mit | getrennt, nacheinander. Text = Knopf mit genau diesem Text (z. B. "Los geht's!"),
//           "@x,y" = auf diese Bildschirmposition klicken (z. B. den Hinweis-Kasten wegklicken).
// Beispiel: node tools/shot.mjs "http://localhost:8081/runde?mode=parcours&level=7" .expo/shots/wind.png "Los geht's!|@341,509" 3000
// Nach dem Start einer Runde die Zeit variieren (Wartezeit), um Bewegung in zwei Bildern zu sehen.
// Beim ersten Aufruf nach einer Code-Änderung bündelt Metro neu – das Werkzeug wartet auf den Knopf.
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { writeFileSync } from "node:fs";

const [url, out, clicks = "", waitMs = "3000", w = "390", h = "844"] = process.argv.slice(2);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PORT = 9300 + Math.floor(Math.random() * 400);
const profile = process.env.SHOT_PROFILE ?? `${process.env.TEMP}/shot-profile-${PORT}`;

const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    "--no-sandbox",
    "--use-angle=swiftshader",
    "--enable-unsafe-swiftshader",
    "--ignore-gpu-blocklist",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profile}`,
    `--window-size=${w},${h}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(path) {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`);
      if (r.ok) return await r.json();
    } catch {}
    await sleep(500);
  }
  throw new Error("Chrome antwortet nicht");
}

try {
  const targets = await json("/json");
  const page = targets.find((t) => t.type === "page");
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
  const send = (method, params = {}) =>
    new Promise((res) => {
      const i = ++id;
      pending.set(i, res);
      ws.send(JSON.stringify({ id: i, method, params }));
    });
  const evalJs = async (expression) => (await send("Runtime.evaluate", { expression, returnByValue: true })).result?.result?.value;

  await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width: Number(w), height: Number(h), deviceScaleFactor: 1, mobile: true });
  await send("Page.navigate", { url });
  // Warten, bis die App Text zeigt (Bundle geladen)
  for (let i = 0; i < 90; i++) {
    const txt = (await evalJs("document.body ? document.body.innerText : ''")) ?? "";
    if (txt.length > 20 && !/Bundling|Bundl/.test(txt)) break;
    await sleep(1000);
  }
  await sleep(3000);

  for (const text of clicks.split("|").filter(Boolean)) {
    // "@x,y" = direkt auf diese Position klicken
    if (text.startsWith("@")) {
      const [x, y] = text.slice(1).split(",").map(Number);
      for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
        await send("Input.dispatchMouseEvent", { type, x, y, button: "left", clickCount: 1 });
      await sleep(1000);
      continue;
    }
    // Auf den Knopf warten (Bündeln kann dauern)
    for (let i = 0; i < 150; i++) {
      const has = await evalJs(`[...document.querySelectorAll('*')].some(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(text)})`);
      if (has) break;
      await sleep(1000);
    }
    const rect = await evalJs(`(() => {
      const els = [...document.querySelectorAll('*')].filter(e => e.children.length === 0 && e.textContent.trim() === ${JSON.stringify(text)});
      const e = els[0]; if (!e) return null;
      const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    })()`);
    if (!rect) {
      console.log("Knopf nicht gefunden:", text);
      continue;
    }
    for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
      await send("Input.dispatchMouseEvent", { type, x: rect.x, y: rect.y, button: "left", clickCount: 1 });
    await sleep(1200);
  }
  await sleep(Number(waitMs));
  const shot = await send("Page.captureScreenshot", { format: "png" });
  writeFileSync(out, Buffer.from(shot.result.data, "base64"));
  console.log("gespeichert:", out);
  ws.close();
} finally {
  chrome.kill();
}
