// Rendert die Store-Grafiken (Google Play) in headless Chrome:
//   store-icon-512.png (512 × 512), feature-de.png und feature-en.png (1024 × 500)
// Voraussetzung: Chrome installiert, Node ≥ 22; zuerst `node assets/icon-src/build.mjs` (liefert die SVG-Quellen).
// Aufruf: node tools/make-store-graphics.mjs      Ergebnis: docs/veroeffentlichung/store-grafiken/
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const OUT = "docs/veroeffentlichung/store-grafiken";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const iconSvg = readFileSync("assets/icon-src/icon.svg", "utf8");
const artSvg = readFileSync("assets/icon-src/foreground.svg", "utf8");

const rays = Array.from({ length: 14 }, (_, i) => {
  const a = ((i * 360) / 14 - 90) * (Math.PI / 180);
  const b = a + 0.17;
  const cx = 770;
  const cy = 300;
  return `<path d="M${cx} ${cy} L${cx + 1500 * Math.cos(a)} ${cy + 1500 * Math.sin(a)} L${cx + 1500 * Math.cos(b)} ${cy + 1500 * Math.sin(b)} Z" fill="#fff" opacity="0.06"/>`;
}).join("");

function feature(title, sub, tags) {
  return `<div style="position:relative;width:1024px;height:500px;overflow:hidden;font-family:'Segoe UI',system-ui,sans-serif;background:linear-gradient(180deg,#3FB87F,#1E7A4C)">
  <svg style="position:absolute;inset:0" width="1024" height="500" viewBox="0 0 1024 500">${rays}</svg>
  <div style="position:absolute;right:-30px;top:-40px;width:580px;height:580px">${artSvg.replace(/width="1024" height="1024"/, 'width="580" height="580"')}</div>
  <div style="position:absolute;left:56px;top:92px;width:470px;color:#fff;text-shadow:0 3px 10px rgba(0,0,0,.25)">
    <div style="font-size:72px;font-weight:800;line-height:1.02">${title}</div>
    <div style="font-size:30px;font-weight:600;margin-top:18px;line-height:1.25">${sub}</div>
    <div style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap">${tags
      .map((t) => `<span style="background:rgba(255,255,255,.22);border-radius:999px;padding:6px 16px;font-size:21px;font-weight:700">${t}</span>`)
      .join("")}</div>
  </div></div>`;
}

const JOBS = [
  { out: "store-icon-512.png", w: 512, h: 512, html: `<div style="width:512px;height:512px">${iconSvg.replace(/width="1024" height="1024"/, 'width="512" height="512"')}</div>` },
  { out: "feature-de.png", w: 1024, h: 500, html: feature("Dunk the Junk", "Mülltrennung spielend lernen", ["3D-Wurfspiel", "ohne Anmeldung", "kostenlos"]) },
  { out: "feature-en.png", w: 1024, h: 500, html: feature("Dunk the Junk", "Learn waste sorting by playing", ["3D throwing game", "no sign-up", "free"]) },
];

async function render(job) {
  const port = 9300 + Math.floor(Math.random() * 400);
  const htmlPath = path.join(process.env.TEMP, `store-${port}.html`);
  writeFileSync(htmlPath, `<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;overflow:hidden">${job.html}</body></html>`);
  const chrome = spawn(
    CHROME,
    ["--headless=new", "--no-sandbox", `--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}/store-profile-${port}`, `--window-size=${job.w},${job.h}`, "about:blank"],
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
    await new Promise((res, rej) => ((ws.onopen = res), (ws.onerror = rej)));
    let id = 0;
    const pending = new Map();
    ws.onmessage = (m) => {
      const d = JSON.parse(m.data);
      if (d.id && pending.has(d.id)) (pending.get(d.id)(d), pending.delete(d.id));
    };
    const send = (method, params = {}) => new Promise((res) => ((pending.set(++id, res), ws.send(JSON.stringify({ id, method, params })))));
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: job.w, height: job.h, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: pathToFileURL(htmlPath).href });
    await sleep(1500);
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true });
    if (!shot?.result?.data) return false;
    mkdirSync(OUT, { recursive: true });
    writeFileSync(path.join(OUT, job.out), Buffer.from(shot.result.data, "base64"));
    ws.close();
    return true;
  } finally {
    chrome.kill();
  }
}

for (const job of JOBS) {
  let ok = false;
  for (let t = 0; t < 3 && !ok; t++) ok = await render(job).catch(() => false);
  console.log(ok ? "ok" : "FEHLT", job.out);
}
