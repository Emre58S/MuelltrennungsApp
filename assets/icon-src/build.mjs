// Erzeugt die SVG-Quellen des App-Icons (assets/icon-src/*.svg). Gezeichnet wird in 1024 × 1024.
// Danach rendert `node tools/make-icons.mjs` daraus die PNGs in assets/images/.
import { writeFileSync } from "node:fs";

/** Eine Tonne: Körper (nach unten schmaler), Deckel, Griff, drei helle Rippen. */
function bin(x, y, w, h, body, lid, mono) {
  const c = (col) => (mono ? "#FFFFFF" : col);
  const rib = mono ? "#000000" : "#FFFFFF";
  const ribs = [0.3, 0.5, 0.7]
    .map(
      (f) =>
        `<rect x="${x + w * f - 7}" y="${y + h * 0.3}" width="14" height="${h * 0.56}" rx="7" fill="${rib}" opacity="${mono ? 0.0 : 0.35}"/>`,
    )
    .join("");
  return `
  <g>
    <path d="M${x + w * 0.07} ${y + h * 0.2} L${x + w * 0.93} ${y + h * 0.2} L${x + w * 0.83} ${y + h * 0.97} L${x + w * 0.17} ${y + h * 0.97} Z"
      fill="${c(body)}" stroke="${c(body)}" stroke-width="26" stroke-linejoin="round"/>
    ${ribs}
    <rect x="${x - w * 0.02}" y="${y + h * 0.06}" width="${w * 1.04}" height="${h * 0.15}" rx="${h * 0.075}" fill="${c(lid)}"/>
    <rect x="${x + w * 0.36}" y="${y - h * 0.02}" width="${w * 0.28}" height="${h * 0.1}" rx="${h * 0.05}" fill="${c(lid)}"/>
  </g>`;
}

/** Bild: drei Tonnen, ein Papierknäuel fliegt von links in die mittlere Tonne. */
function art(mono) {
  const ball = mono ? "#FFFFFF" : "#FFFFFF";
  const trail = mono ? "#FFFFFF" : "#FFFFFF";
  return `
  ${bin(110, 480, 250, 330, "#3D82D9", "#2E69B3", mono)}
  ${bin(664, 480, 250, 330, "#5B6470", "#434B55", mono)}
  ${bin(322, 396, 380, 450, "#F2B632", "#D69A12", mono)}
  <g opacity="${mono ? 1 : 0.9}">
    <circle cx="262" cy="300" r="12" fill="${trail}" opacity="0.5"/>
    <circle cx="330" cy="248" r="18" fill="${trail}" opacity="0.65"/>
    <circle cx="408" cy="212" r="26" fill="${trail}" opacity="0.8"/>
  </g>
  <g transform="rotate(-22 512 236)">
    <rect x="456" y="168" width="112" height="136" rx="18" fill="${mono ? "#FFFFFF" : "#E4E9F0"}"/>
    ${mono ? "" : `<rect x="456" y="212" width="112" height="46" fill="#E11D48"/><rect x="470" y="176" width="14" height="120" rx="7" fill="#FFFFFF" opacity="0.7"/><ellipse cx="512" cy="170" rx="56" ry="13" fill="#B8C3D1"/><ellipse cx="512" cy="168" rx="42" ry="8" fill="#98A5B5"/>`}
  </g>
  ${mono ? "" : `<path d="M690 190 l10 28 l28 10 l-28 10 l-10 28 l-10 -28 l-28 -10 l28 -10 z" fill="#FFE27A"/><path d="M820 330 l7 18 l18 7 l-18 7 l-7 18 l-7 -18 l-18 -7 l18 -7 z" fill="#FFE27A" opacity="0.9"/>`}`;
}

const head = (extra = "") =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">${extra}`;
const bg = `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3FB87F"/><stop offset="1" stop-color="#1E7A4C"/></linearGradient></defs>
  <rect width="1024" height="1024" fill="url(#g)"/>
  <ellipse cx="512" cy="900" rx="400" ry="46" fill="#000" opacity="0.18"/>`;

// Voll-Icon (iOS/Store): Hintergrund + Bild
writeFileSync("assets/icon-src/icon.svg", `${head()}${bg}${art(false)}</svg>`);
// Android-Vordergrund: Bild auf 64 % verkleinert in der Mitte (sichere Zone), transparent
const small = (mono) => `<g transform="translate(512 512) scale(0.74) translate(-512 -512)">${art(mono)}</g>`;
writeFileSync("assets/icon-src/foreground.svg", `${head()}${small(false)}</svg>`);
writeFileSync("assets/icon-src/monochrome.svg", `${head()}${small(true)}</svg>`);
// Android-Hintergrund: nur der Verlauf
writeFileSync("assets/icon-src/background.svg", `${head()}${bg.replace(/<ellipse[^>]*>/, "")}</svg>`);
// Startbild: Bild ohne Hintergrund
writeFileSync("assets/icon-src/splash.svg", `${head()}<g transform="translate(512 512) scale(0.9) translate(-512 -540)">${art(false)}</g></svg>`);
console.log("ok");
