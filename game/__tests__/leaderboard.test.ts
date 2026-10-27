// Tests für die Ranglisten-Regeln (utils/leaderboard.ts) – ohne Server:
// Spitzname, Wertung des Tages-Tricks, Bretter, Merken ohne Verbindung.
// Ausführen: npm test

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import {
  cleanName,
  dailyBoard,
  decodeTrickScore,
  getPlayer,
  leaderboardReady,
  submitScore,
  trickScore,
} from "../../utils/leaderboard";

// jest.mock wird vor die Imports gehoben

const mockMemory = new Map<string, string>();
jest.mock("@/utils/storage", () => ({
  StorageKeys: { PLAYER_ID: "id", PLAYER_NAME: "name", PENDING_SCORES: "pending" },
  getItem: async (key: string) => mockMemory.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    mockMemory.set(key, value);
  },
  todayKey: () => "2026-10-27",
}));

beforeEach(() => mockMemory.clear());

describe("Spitzname", () => {
  test("2–16 Zeichen, Buchstaben (auch Umlaute), Ziffern, Leerzeichen", () => {
    expect(cleanName("  Tonnen  Profi ")).toBe("Tonnen Profi");
    expect(cleanName("Jürgen_99")).toBe("Jürgen_99");
    expect(cleanName("A")).toBeNull();
    expect(cleanName("x".repeat(17))).toBeNull();
    expect(cleanName("<script>")).toBeNull();
  });

  test("Spieler bekommt eine feste ID und einen Platzhalter-Namen", async () => {
    const a = await getPlayer();
    const b = await getPlayer();
    expect(a.id).toBe(b.id);
    expect(a.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a.named).toBe(false);
    expect(cleanName(a.name)).toBe(a.name);
  });
});

describe("Wertung", () => {
  test("Tages-Trick: mehr Sterne zuerst, dann weniger Versuche", () => {
    expect(trickScore(3, 1)).toBeGreaterThan(trickScore(3, 2));
    expect(trickScore(3, 9)).toBeGreaterThan(trickScore(2, 1));
    expect(decodeTrickScore(trickScore(2, 4))).toEqual({ stars: 2, attempts: 4 });
    expect(decodeTrickScore(trickScore(3, 1))).toEqual({ stars: 3, attempts: 1 });
  });

  test("Tages-Bretter tragen das Datum", () => {
    expect(dailyBoard("tagesaufgabe")).toBe("tagesaufgabe:2026-10-27");
    expect(dailyBoard("tagestrick", "2026-12-24")).toBe("tagestrick:2026-12-24");
  });
});

describe("Ohne Server", () => {
  test("Ergebnisse werden gemerkt und später nachgereicht", async () => {
    expect(leaderboardReady).toBe(false);
    await submitScore("zielwurf", 420);
    await submitScore("zeit", 0); // 0 Punkte zählen nicht
    expect(JSON.parse(mockMemory.get("pending") ?? "[]")).toEqual([{ board: "zielwurf", score: 420 }]);
  });
});
