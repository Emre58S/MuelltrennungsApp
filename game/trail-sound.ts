// Datei: game/trail-sound.ts — Klangbild je Wurfspur (reine Daten; abgespielt von utils/sfx.ts sfxTrail)

import type { SfxName } from "@/utils/sfx";

/** Eine Schicht: Ton, Tempo (Tonhöhe), Lautstärke, Verzögerung in ms. */
export type TrailLayer = [SfxName, number, number, number?];

/**
 * Eigenes Klangbild je Wurfspur (Nutzer, 7.11.): beim Werfen ein anderes „Wischen“, beim Treffer ein
 * kurzer Funkel-Lauf. Nur zusätzliche, leise Schichten aus vorhandenen Tönen – die Material-Klänge
 * (Glas klirrt, Dose scheppert …) und die Treffer-Melodie (noteN) bleiben unberührt, deshalb nutzen die
 * Treffer-Schichten keine noteN. Standard hat keinen Zusatzton.
 */
export const TRAIL_SOUND: Record<string, { throw?: TrailLayer[]; hit?: TrailLayer[] }> = {
  gold: { throw: [["swish", 1.5, 0.7]], hit: [["star2", 1, 0.9], ["star2", 1.5, 0.7, 90]] },
  komet: { throw: [["swish", 1.9, 1]], hit: [["star3", 1.4, 1]] },
  herbstlaub: { throw: [["swish", 0.6, 1]], hit: [["plop", 0.7, 1], ["plop", 0.55, 0.8, 110]] },
  regenbogen: { hit: [["star1", 1, 0.9], ["star2", 1, 0.9, 70], ["star3", 1, 0.9, 140], ["star3", 1.5, 0.8, 210]] },
  konfetti: { throw: [["plop", 1.6, 1]], hit: [["plop", 1.3, 1], ["star1", 1.6, 0.8, 60], ["plop", 1.7, 0.9, 130]] },
  polarlicht: { throw: [["aim", 0.7, 1.5]], hit: [["star2", 0.8, 0.9], ["star3", 0.8, 0.8, 160]] },
  seifenblasen: { throw: [["plop", 2, 1]], hit: [["plop", 1.5, 1], ["star3", 1.9, 0.7, 80]] },
  funken: { throw: [["tick", 2, 1.5]], hit: [["star1", 1.8, 0.9], ["star1", 2, 0.8, 60]] },
  sternenstaub: { hit: [["star1", 1.2, 0.9], ["star2", 1.2, 0.9, 90], ["star3", 1.2, 0.9, 180]] },
  smaragd: { hit: [["star2", 0.75, 0.9], ["star3", 0.75, 0.8, 100]] },
  lava: { throw: [["swish", 0.5, 1.2]], hit: [["comboUp", 0.6, 1]] },
  diamant: { hit: [["star3", 1.8, 0.9], ["star3", 2, 0.8, 80]] },
  ozean: { throw: [["plop", 0.6, 1]], hit: [["star1", 0.7, 0.9], ["star2", 0.7, 0.8, 120]] },
  kirschbluete: { hit: [["star3", 1.1, 0.6], ["star2", 1.1, 0.5, 140]] },
  neon: { throw: [["aim", 1.5, 1.5]], hit: [["comboUp", 1.4, 1]] },
};

