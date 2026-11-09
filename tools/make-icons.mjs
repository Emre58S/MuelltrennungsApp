// Rendert die App-Icons aus assets/icon-src/*.svg in headless Chrome zu PNG (assets/images/).
// Voraussetzung: Chrome installiert, Node ≥ 22. Zuerst `node assets/icon-src/build.mjs`, dann
//   node tools/make-icons.mjs
// Ergebnis: icon.png (1024, ohne Transparenz), android-icon-foreground/background/monochrome.png (1024),
//           splash-icon.png (1024, transparent), favicon.png (48).
import { Buffer } from "node:buffer";
import { spawn } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const JOBS = [
  { svg: "icon.svg", out: "icon.png", size: 1024, transparent: false },
  { svg: "foreground.svg", out: "android-icon-foreground.png", size: 1024, transparent: true },
  { svg: "background.svg", out: "android-icon-background.png", size: 1024, transparent: false },
  { svg: "monochrome.svg", out: "android-icon-monochrome.png", size: 1024, transparent: true },
  { svg: "splash.svg", out: "splash-icon.png", size: 1024, transparent: true },
  { svg: "icon.svg", out: "favicon.png", size: 48, transparent: false },
];

async function render(job) {
  const port = 9300 + Math.floor(Math.random() * 400);
  const svg = readFileSync(path.join("assets/icon-src", job.svg), "utf8");
  const htmlPath = path.join(process.env.TEMP, `icon-${port}.html`);
  writeFileSync(
    htmlPath,
    `<!doctype html><html><body style="margin:0;background:transparent;overflow:hidden"><style>html,body{overflow:hidden}svg{display:block}</style><div style="width:${job.size}px;height:${job.size}px">${svg.replace(
      /width="1024" height="1024"/,
      `width="${job.size}" height="${job.size}"`,
    )}</div></body></html>`,
  );
  const chrome = spawn(
    CHROME,
    [
      "--headless=new",
      "--no-sandbox",
      `--remote-debugging-port=${port}`,
      `--user-data-dir=${process.env.TEMP}/icon-profile-${port}`,
      `--window-size=${job.size},${job.size}`,
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
    const send = (method, params = {}) =>
      new Promise((res) => {
        const i = ++id;
        pending.set(i, res);
        ws.send(JSON.stringify({ id: i, method, params }));
      });
    await send("Page.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: job.size, height: job.size, deviceScaleFactor: 1, mobile: false });
    if (job.transparent) await send("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
    await send("Page.navigate", { url: pathToFileURL(htmlPath).href });
    await sleep(1500);
    const shot = await send("Page.captureScreenshot", { format: "png", fromSurface: true, captureBeyondViewport: false });
    if (!shot?.result?.data) return false;
    mkdirSync("assets/images", { recursive: true });
    writeFileSync(path.join("assets/images", job.out), Buffer.from(shot.result.data, "base64"));
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
