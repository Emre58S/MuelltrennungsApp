// Datei: components/game/models/rules.ts
// Zuordnung Item-Name → Modell-Schlüssel.

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss");
}

// Reihenfolge entscheidet – spezifische Regeln zuerst.
// Nur Items aus Biomüll, Gelber Sack und Restmüll (das sind die im Spiel genutzten).
const MODEL_RULES: [RegExp, string][] = [
  // Biomüll
  [/kuechenrolle/, "kitchenroll"],
  [/bananenschale|banane|banana/, "banana"],
  [/kaffee/, "coffee"],
  [/eierschale/, "eggshell"],
  [/kartoffelschale|karottenschale|zwiebelschale/, "peel"],
  [/teebeutel|\btee/, "teabag"],
  [/brot/, "bread"],
  [/laub/, "leaves"],
  [/nuss/, "nut"],
  [/maiskolben/, "corn"],
  [/apfel|apple/, "apple"],
  [/blume/, "flower"],
  // Gelber Sack
  [/aluschale/, "alutray"],
  [/alufolie|alu folie/, "foil"],
  [/joghurt|becher/, "yogurt"],
  [/konserve|dose/, "can"],
  [/shampoo|spuelmittel/, "bottle"],
  [/getraenkekarton|milchkarton/, "carton"],
  [/plastiktuete|plastiktute/, "bag"],
  [/plastikflasche/, "pet"],
  [/metalldeckel|deckel/, "lid"],
  [/chipstuete|chipstute/, "chips"],
  [/styropor/, "styro"],
  [/zahnpasta|tube/, "tube"],
  [/butterverpackung/, "butter"],
  [/eisverpackung/, "icecream"],
  // Restmüll
  [/zahnbuerste|zahnburste/, "toothbrush"],
  [/kassenzettel/, "receipt"],
  [/windel/, "diaper"],
  [/pizzakarton/, "pizza"],
  [/gluhbirne|gluehbirne/, "bulb"],
  [/geschirr/, "dish"],
  [/staubsauger/, "vacuum"],
  [/kugelschreiber/, "pen"],
  [/einwegrasierer|rasierer/, "razor"],
  [/wattestaebchen|wattestabchen/, "swab"],
  [/spiegel/, "mirror"],
  [/\bcd\b/, "cd"],
  [/zigarettenkippe/, "cigarette"],
  [/pflaster/, "plaster"],
  [/unterwaesche/, "underwear"],
  [/katzenstreu/, "litter"],
  [/tapeten/, "wallpaper"],
  [/geschenkpapier/, "wrap"],
];

export function resolveModelKey(name: string): string {
  return MODEL_RULES.find(([re]) => re.test(name))?.[1] ?? "fallback";
}
