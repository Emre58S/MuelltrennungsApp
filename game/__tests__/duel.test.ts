// Tests für das Schnell-Duell (game/duel.ts): erster richtiger Wurf gewinnt,
// Falsch = für diesen Gegenstand raus, Finale doppelt, Fotofinish, Ergebnis.

import { describe, expect, test } from "@jest/globals";

import {
  averageMs,
  createDuel,
  DUEL_ITEMS,
  duelNext,
  duelOver,
  duelThrow,
  duelTimeout,
  duelWinner,
  fastestHit,
  mistakesOf,
  PHOTO_FINISH_MS,
  pointsFor,
  tugOf,
} from "../duel";

describe("Schnell-Duell", () => {
  test("erster richtiger Wurf gewinnt, der zweite zählt nicht mehr", () => {
    let s = createDuel();
    const a = duelThrow(s, 1, true, 900, "Apfel");
    expect(a.outcome).toBe("win");
    s = a.state;
    expect(s.players[1].points).toBe(1);
    const b = duelThrow(s, 0, true, 2000, "Apfel");
    expect(b.outcome).toBe("late");
    expect(b.state.players[0].points).toBe(0);
  });

  test("knapp danach richtig = Fotofinish (zählt trotzdem nicht)", () => {
    const s = duelThrow(createDuel(), 0, true, 1000, "Apfel").state;
    const r = duelThrow(s, 1, true, 1000 + PHOTO_FINISH_MS - 10, "Apfel");
    expect(r.outcome).toBe("photo");
    expect(r.state.players[1].points).toBe(0);
  });

  test("falsch = raus für diesen Gegenstand, der andere darf noch", () => {
    let s = createDuel();
    const w = duelThrow(s, 0, false, 500, "Dose");
    expect(w.outcome).toBe("wrong");
    s = w.state;
    // Raus: weitere Würfe zählen nicht
    expect(duelThrow(s, 0, true, 700, "Dose").outcome).toBe("ignored");
    const win = duelThrow(s, 1, true, 1500, "Dose");
    expect(win.outcome).toBe("win");
    expect(win.state.log[0]).toEqual({ item: "Dose", winner: 1, ms: 1500, wrong: [0] });
  });

  test("beide falsch: entschieden, niemand bekommt Punkte", () => {
    let s = duelThrow(createDuel(), 0, false, 500, "Dose").state;
    const r = duelThrow(s, 1, false, 600, "Dose");
    expect(r.outcome).toBe("bothWrong");
    s = r.state;
    expect(s.settled).toBe(true);
    expect(s.players[0].points + s.players[1].points).toBe(0);
    expect(mistakesOf(s)).toEqual(["Dose"]);
  });

  test("Zeit um: keiner punktet, nichts doppelt geloggt", () => {
    let s = duelTimeout(createDuel(), "Glas");
    s = duelTimeout(s, "Glas");
    expect(s.log).toHaveLength(1);
    expect(s.log[0].winner).toBeNull();
  });

  test("Finale zählt doppelt, Duell endet nach DUEL_ITEMS Gegenständen", () => {
    expect(pointsFor(0)).toBe(1);
    expect(pointsFor(DUEL_ITEMS - 1)).toBe(2);
    let s = createDuel();
    for (let i = 0; i < DUEL_ITEMS; i++) {
      s = duelThrow(s, i % 2 === 0 ? 0 : 1, true, 1000 + i, `G${i}`).state;
      s = duelNext(s);
    }
    expect(duelOver(s)).toBe(true);
    // 5 + 4 Punkte, dazu das Finale (Spieler 2, Index 9) doppelt
    expect(s.players[0].points).toBe(5);
    expect(s.players[1].points).toBe(4 + 2);
    expect(duelWinner(s)).toBe(1);
    expect(duelThrow(s, 0, true, 100, "x").outcome).toBe("ignored");
  });

  test("Serie, Bestzeit, Schnitt, Tauziehen", () => {
    let s = createDuel();
    for (const ms of [1200, 800, 1000]) s = duelNext(duelThrow(s, 0, true, ms, "x").state);
    expect(s.players[0].streak).toBe(3);
    expect(s.players[0].fastest).toBe(800);
    expect(averageMs(s.players[0])).toBe(1000);
    expect(averageMs(s.players[1])).toBeNull();
    expect(tugOf(s)).toBeLessThan(0);
    expect(fastestHit(s)?.ms).toBe(800);
    // Der andere gewinnt: Serie reißt
    s = duelThrow(s, 1, true, 900, "y").state;
    expect(s.players[0].streak).toBe(0);
    expect(tugOf(createDuel())).toBe(0);
    expect(duelWinner(createDuel())).toBeNull();
  });
});
