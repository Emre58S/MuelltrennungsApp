// Tests für die Ranglisten-Regeln (utils/leaderboard.ts) – ohne Server:
// Spitzname, Wertung des Tages-Tricks, Bretter, Merken ohne Verbindung.
// Ausführen: npm test

import { beforeEach, describe, expect, jest, test } from "@jest/globals";

import {
  cleanFriendCode,
  cleanName,
  dailyBoard,
  decodeTrickScore,
  formatFriendCode,
  getPlayer,
  isMissingOnServer,
  leaderboardReady,
  openChallenges,
  submitScore,
  trickScore,
  weekStart,
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

  test("Wochen-Rangliste beginnt am Montag (auch über Monats- und Jahresgrenzen)", () => {
    expect(weekStart()).toBe("2026-10-26");
    expect(weekStart("2026-11-02")).toBe("2026-11-02");
    expect(weekStart("2026-11-08")).toBe("2026-11-02");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
  });

  test("Freundes-Code: 6 Zeichen ohne 0/O/1/I, Bindestrich und Kleinschreibung egal", () => {
    expect(cleanFriendCode("k7q-x2m")).toBe("K7QX2M");
    expect(cleanFriendCode(" K7Q X2M ")).toBe("K7QX2M");
    expect(cleanFriendCode("K7QX2")).toBeNull();
    expect(cleanFriendCode("K7QX2MM")).toBeNull();
    expect(cleanFriendCode("K0QX2M")).toBeNull();
    expect(cleanFriendCode("KIQX2M")).toBeNull();
    expect(formatFriendCode("K7QX2M")).toBe("K7Q-X2M");
  });

  test("Fehlende SQL-Funktion (404) ist kein Verbindungsfehler", () => {
    expect(isMissingOnServer(Object.assign(new Error("x"), { status: 404 }))).toBe(true);
    expect(isMissingOnServer(Object.assign(new Error("x"), { status: 500 }))).toBe(false);
    expect(isMissingOnServer(new Error("Netzwerk"))).toBe(false);
    expect(isMissingOnServer(null)).toBe(false);
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

describe("Offene Herausforderungen (Freunde)", () => {
  test("offen, solange der Freund heute mindestens so viele hat wie ich", () => {
    const rows = [
      { name: "Anna", code: "AAAAAA", sprint: 12, survival: null },
      { name: "Ben", code: "BBBBBB", sprint: 8, survival: 5 },
    ];
    expect(openChallenges(rows, { sprint: 10, survival: 5 })).toEqual([
      { name: "Anna", code: "AAAAAA", mode: "sprint", correct: 12, tie: false },
      { name: "Ben", code: "BBBBBB", mode: "survival", correct: 5, tie: true },
    ]);
    // Noch nicht gespielt (0) → alles offen; alles geschlagen → nichts
    expect(openChallenges(rows, { sprint: 0, survival: 0 })).toHaveLength(3);
    expect(openChallenges(rows, { sprint: 13, survival: 6 })).toEqual([]);
  });

  test("0 zu 0 ist kein Gleichstand (noch nichts gespielt)", () => {
    const rows = [{ name: "Cem", code: "CCCCCC", sprint: 0, survival: null }];
    expect(openChallenges(rows, { sprint: 0, survival: 0 })).toEqual([
      { name: "Cem", code: "CCCCCC", mode: "sprint", correct: 0, tie: false },
    ]);
  });
});
