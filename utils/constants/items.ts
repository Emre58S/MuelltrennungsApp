// ── Müll-Items Datenbank ──────────────────────────────────────────────
// 80+ Items für abwechslungsreiches Gameplay

export type Category =
  | "Restmüll"
  | "Biomüll"
  | "Papier"
  | "Gelber Sack"
  | "Glas"
  | "Sondermüll";

export type Item = {
  emoji: string;
  name: string;
  category: Category;
  difficulty: "leicht" | "mittel" | "schwer";
  fact?: string; // Lern-Tipp der nach richtiger Antwort angezeigt wird
};

export const ITEMS: Item[] = [
  // ── Biomüll (braune Tonne) ────────────────────────────────────────
  {
    emoji: "🍌",
    name: "Bananenschale",
    category: "Biomüll",
    difficulty: "leicht",
    fact: "Bananenschalen verrotten in 2–5 Wochen.",
  },
  {
    emoji: "☕",
    name: "Kaffeesatz",
    category: "Biomüll",
    difficulty: "leicht",
    fact: "Kaffeesatz ist super als Dünger für Pflanzen!",
  },
  {
    emoji: "🥚",
    name: "Eierschale",
    category: "Biomüll",
    difficulty: "leicht",
    fact: "Eierschalen liefern Kalk für den Kompost.",
  },
  {
    emoji: "🍂",
    name: "Laub",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🍎",
    name: "Apfelrest",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🥕",
    name: "Karottenschalen",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🌸",
    name: "Verwelkte Blumen",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🫖",
    name: "Teebeutel",
    category: "Biomüll",
    difficulty: "mittel",
    fact: "Teebeutel mit Plastik-Anteil gehören in den Restmüll!",
  },
  {
    emoji: "🥜",
    name: "Nussschalen",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🌽",
    name: "Maiskolben",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🧅",
    name: "Zwiebelschale",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🍞",
    name: "Altes Brot",
    category: "Biomüll",
    difficulty: "leicht",
  },
  {
    emoji: "🧻",
    name: "Küchenrolle (unbeschichtet)",
    category: "Biomüll",
    difficulty: "schwer",
    fact: "Unbeschichtetes Küchenpapier darf in den Biomüll!",
  },

  // ── Papier (blaue Tonne) ──────────────────────────────────────────
  {
    emoji: "📰",
    name: "Zeitung",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "📦",
    name: "Sauberer Karton",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "✉️",
    name: "Briefumschlag",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "📓",
    name: "Schreibpapier",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "📕",
    name: "Altes Buch",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "🗞️",
    name: "Werbeprospekt",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "📋",
    name: "Notizblock",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "🎁",
    name: "Geschenkpapier (ohne Folie)",
    category: "Papier",
    difficulty: "mittel",
    fact: "Glänzendes Geschenkpapier mit Folie gehört in den Restmüll!",
  },
  {
    emoji: "📇",
    name: "Visitenkarte",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "🥚",
    name: "Eierkarton",
    category: "Papier",
    difficulty: "mittel",
  },
  {
    emoji: "🧾",
    name: "Prospekt",
    category: "Papier",
    difficulty: "leicht",
  },
  {
    emoji: "📜",
    name: "Toilettenpapier-Rolle",
    category: "Papier",
    difficulty: "mittel",
    fact: "Die Papprolle der Toilettenpapierrolle ist Altpapier!",
  },

  // ── Gelber Sack ───────────────────────────────────────────────────
  {
    emoji: "🥤",
    name: "Joghurtbecher",
    category: "Gelber Sack",
    difficulty: "leicht",
    fact: "Becher ausspülen ist nicht nötig – löffelrein reicht!",
  },
  {
    emoji: "🥫",
    name: "Konservendose",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🧴",
    name: "Shampooflasche",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🧃",
    name: "Getränkekarton",
    category: "Gelber Sack",
    difficulty: "leicht",
    fact: "Getränkekartons sind Verbundstoffe aus Papier, Plastik und Alu.",
  },
  {
    emoji: "🛍️",
    name: "Plastiktüte",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🫙",
    name: "Alufolie",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🧈",
    name: "Butterverpackung",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🫗",
    name: "Spülmittelflasche",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🍬",
    name: "Chipstüte",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🥡",
    name: "Styropor-Verpackung",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🫧",
    name: "Zahnpastatube",
    category: "Gelber Sack",
    difficulty: "mittel",
    fact: "Tuben aus Plastik gehören in den Gelben Sack!",
  },
  {
    emoji: "🧊",
    name: "Eisverpackung (Plastik)",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🥛",
    name: "Milchkarton",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🍶",
    name: "Plastikflasche",
    category: "Gelber Sack",
    difficulty: "leicht",
  },
  {
    emoji: "🧽",
    name: "Einweg-Aluschale",
    category: "Gelber Sack",
    difficulty: "mittel",
  },
  {
    emoji: "🫙",
    name: "Deckel (Metall)",
    category: "Gelber Sack",
    difficulty: "schwer",
    fact: "Metalldeckel gehören in den Gelben Sack, auch wenn das Glas in den Glascontainer kommt!",
  },

  // ── Glas ──────────────────────────────────────────────────────────
  {
    emoji: "🍾",
    name: "Weinflasche",
    category: "Glas",
    difficulty: "leicht",
  },
  {
    emoji: "🫙",
    name: "Marmeladenglas",
    category: "Glas",
    difficulty: "leicht",
  },
  {
    emoji: "🍺",
    name: "Bierflasche (ohne Pfand)",
    category: "Glas",
    difficulty: "leicht",
  },
  {
    emoji: "🧴",
    name: "Parfümflasche",
    category: "Glas",
    difficulty: "mittel",
  },
  {
    emoji: "🥒",
    name: "Gurkenglas",
    category: "Glas",
    difficulty: "leicht",
  },
  {
    emoji: "🍯",
    name: "Honigglas",
    category: "Glas",
    difficulty: "leicht",
  },
  {
    emoji: "🫒",
    name: "Olivenölflasche (Glas)",
    category: "Glas",
    difficulty: "mittel",
  },
  {
    emoji: "🥃",
    name: "Senfglas",
    category: "Glas",
    difficulty: "leicht",
  },

  // ── Restmüll (schwarze Tonne) ─────────────────────────────────────
  {
    emoji: "🚬",
    name: "Zigarettenkippe",
    category: "Restmüll",
    difficulty: "leicht",
  },
  {
    emoji: "🍽️",
    name: "Kaputtes Geschirr",
    category: "Restmüll",
    difficulty: "leicht",
    fact: "Kaputtes Geschirr ist KEIN Glas und gehört nicht in den Glascontainer!",
  },
  {
    emoji: "🩹",
    name: "Pflaster",
    category: "Restmüll",
    difficulty: "leicht",
  },
  {
    emoji: "💡",
    name: "Kaputte Glühbirne",
    category: "Restmüll",
    difficulty: "leicht",
    fact: "Energiesparlampen sind Sondermüll! Nur alte Glühbirnen in den Restmüll.",
  },
  {
    emoji: "🧹",
    name: "Staubsaugerbeutel",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🖊️",
    name: "Kugelschreiber",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🧾",
    name: "Kassenzettel",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Kassenzettel sind aus Thermopapier und gehören NICHT ins Altpapier!",
  },
  {
    emoji: "🪒",
    name: "Einwegrasierer",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🧷",
    name: "Wattestäbchen",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🩲",
    name: "Alte Unterwäsche",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Tragbare Kleidung gehört in den Altkleider-Container, kaputte in den Restmüll.",
  },
  {
    emoji: "🐱",
    name: "Katzenstreu",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "👶",
    name: "Windel",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🪥",
    name: "Alte Zahnbürste",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🎁",
    name: "Geschenkpapier (mit Folie)",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Beschichtetes/glänzendes Geschenkpapier gehört NICHT ins Altpapier!",
  },
  {
    emoji: "🪞",
    name: "Zerbrochener Spiegel",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Spiegel sind beschichtetes Glas und gehören nicht in den Glascontainer!",
  },
  {
    emoji: "🍕",
    name: "Pizzakarton (fettig)",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Verschmutzte Pizzakartons gehören in den Restmüll, saubere ins Altpapier!",
  },
  {
    emoji: "💿",
    name: "Alte CD",
    category: "Restmüll",
    difficulty: "mittel",
  },
  {
    emoji: "🖼️",
    name: "Tapeten",
    category: "Restmüll",
    difficulty: "schwer",
    fact: "Tapeten sind beschichtet und gehören nicht ins Altpapier.",
  },

  // ── Sondermüll ────────────────────────────────────────────────────
  {
    emoji: "🔋",
    name: "Batterie",
    category: "Sondermüll",
    difficulty: "leicht",
    fact: "Batterien können an jedem Supermarkt-Sammelbox abgegeben werden!",
  },
  {
    emoji: "📱",
    name: "Altes Smartphone",
    category: "Sondermüll",
    difficulty: "mittel",
    fact: "Elektrogeräte können kostenlos bei Wertstoffhöfen abgegeben werden.",
  },
  {
    emoji: "💊",
    name: "Abgelaufene Medikamente",
    category: "Sondermüll",
    difficulty: "mittel",
    fact: "Medikamente gehören NICHT in die Toilette! Apotheke oder Restmüll.",
  },
  {
    emoji: "🎨",
    name: "Farbreste",
    category: "Sondermüll",
    difficulty: "mittel",
  },
  {
    emoji: "🖨️",
    name: "Druckerpatronen",
    category: "Sondermüll",
    difficulty: "mittel",
  },
  {
    emoji: "💻",
    name: "Alter Laptop",
    category: "Sondermüll",
    difficulty: "mittel",
  },
  {
    emoji: "🔌",
    name: "Ladekabel",
    category: "Sondermüll",
    difficulty: "schwer",
    fact: "Kabel sind Elektroschrott und gehören zum Wertstoffhof!",
  },
  {
    emoji: "🌡️",
    name: "Fieberthermometer (Quecksilber)",
    category: "Sondermüll",
    difficulty: "schwer",
  },
  {
    emoji: "💡",
    name: "Energiesparlampe",
    category: "Sondermüll",
    difficulty: "schwer",
    fact: "Energiesparlampen enthalten Quecksilber und sind Sondermüll!",
  },
  {
    emoji: "🧴",
    name: "Nagellackentferner",
    category: "Sondermüll",
    difficulty: "schwer",
  },
];

// ── Kategorie-Farben ────────────────────────────────────────────────
export const CATEGORY_COLORS: Record<Category, string> = {
  Restmüll: "#4B5563",
  Biomüll: "#8B5E34",
  Papier: "#3B82F6",
  "Gelber Sack": "#F5C518",
  Glas: "#2ECC71",
  Sondermüll: "#EF4444",
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  Restmüll: "⚫",
  Biomüll: "🟫",
  Papier: "🔵",
  "Gelber Sack": "🟡",
  Glas: "🟢",
  Sondermüll: "🔴",
};

export const ALL_CATEGORIES: Category[] = [
  "Restmüll",
  "Biomüll",
  "Papier",
  "Gelber Sack",
  "Glas",
  "Sondermüll",
];

// ── Helpers ─────────────────────────────────────────────────────────
export function getRandomItem(exclude?: Item): Item {
  let next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
  let attempts = 0;
  while (exclude && next.name === exclude.name && attempts < 50) {
    next = ITEMS[Math.floor(Math.random() * ITEMS.length)];
    attempts++;
  }
  return next;
}

export function getItemsByDifficulty(
  difficulty: "leicht" | "mittel" | "schwer",
): Item[] {
  return ITEMS.filter((item) => item.difficulty === difficulty);
}

export function getRandomItemByDifficulty(
  difficulty: "leicht" | "mittel" | "schwer",
  exclude?: Item,
): Item {
  const pool = getItemsByDifficulty(difficulty);
  let next = pool[Math.floor(Math.random() * pool.length)];
  let attempts = 0;
  while (exclude && next.name === exclude.name && attempts < 50) {
    next = pool[Math.floor(Math.random() * pool.length)];
    attempts++;
  }
  return next;
}

export function getRoundOptions(
  correct: Category,
  count: number = 4,
): Category[] {
  const options = new Set<Category>([correct]);
  while (options.size < Math.min(count, ALL_CATEGORIES.length)) {
    options.add(ALL_CATEGORIES[Math.floor(Math.random() * ALL_CATEGORIES.length)]);
  }
  return Array.from(options).sort(() => Math.random() - 0.5);
}
