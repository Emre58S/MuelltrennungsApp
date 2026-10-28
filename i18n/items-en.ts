// Englische Namen und Fakten der Gegenstände. Schlüssel ist der deutsche
// Name aus constants/items.ts – der bleibt die interne ID (Statistik,
// Modelle). Neue Gegenstände hier mit eintragen (Test prüft das).

export const ITEMS_EN: Record<string, { name: string; fact?: string }> = {
  // Biomüll
  Bananenschale: { name: "Banana peel", fact: "Banana peels rot in 2–5 weeks." },
  Kaffeesatz: { name: "Coffee grounds", fact: "Coffee grounds make great plant fertiliser!" },
  Eierschale: { name: "Eggshell", fact: "Eggshells add lime to compost." },
  Laub: { name: "Leaves" },
  Apfelrest: { name: "Apple core" },
  Karottenschalen: { name: "Carrot peels" },
  "Verwelkte Blumen": { name: "Wilted flowers" },
  Teebeutel: { name: "Tea bag", fact: "Tea bags that contain plastic go in general waste!" },
  Nussschalen: { name: "Nutshells" },
  Maiskolben: { name: "Corn cob" },
  Zwiebelschale: { name: "Onion skin" },
  "Altes Brot": { name: "Stale bread" },
  "Küchenrolle (unbeschichtet)": {
    name: "Kitchen roll (uncoated)",
    fact: "Uncoated kitchen roll may go in the organic waste!",
  },

  // Papier
  Zeitung: { name: "Newspaper" },
  "Sauberer Karton": { name: "Clean cardboard" },
  Briefumschlag: { name: "Envelope" },
  Schreibpapier: { name: "Writing paper" },
  "Altes Buch": { name: "Old book" },
  Werbeprospekt: { name: "Advertising flyer" },
  Notizblock: { name: "Notepad" },
  "Geschenkpapier (ohne Folie)": {
    name: "Wrapping paper (no foil)",
    fact: "Shiny wrapping paper with foil goes in general waste!",
  },
  Visitenkarte: { name: "Business card" },
  Eierkarton: { name: "Egg carton" },
  Prospekt: { name: "Brochure" },
  "Toilettenpapier-Rolle": {
    name: "Toilet paper roll",
    fact: "The cardboard tube of a toilet roll is waste paper!",
  },

  // Gelber Sack
  Joghurtbecher: {
    name: "Yoghurt pot",
    fact: "No need to rinse – scraped clean with a spoon is enough!",
  },
  Konservendose: { name: "Tin can" },
  Shampooflasche: { name: "Shampoo bottle" },
  Getränkekarton: {
    name: "Drinks carton",
    fact: "Drinks cartons are made of paper, plastic and aluminium together.",
  },
  Plastiktüte: { name: "Plastic bag" },
  Alufolie: { name: "Aluminium foil" },
  Butterverpackung: { name: "Butter wrapper" },
  Spülmittelflasche: { name: "Washing-up liquid bottle" },
  Chipstüte: { name: "Crisp packet" },
  "Styropor-Verpackung": { name: "Polystyrene packaging" },
  Zahnpastatube: {
    name: "Toothpaste tube",
    fact: "Plastic tubes go in the yellow bag!",
  },
  "Eisverpackung (Plastik)": { name: "Ice cream tub (plastic)" },
  Milchkarton: { name: "Milk carton" },
  Plastikflasche: { name: "Plastic bottle" },
  "Einweg-Aluschale": { name: "Disposable foil tray" },
  "Deckel (Metall)": {
    name: "Lid (metal)",
    fact: "Metal lids go in the yellow bag, even though the jar goes in the glass bin!",
  },

  // Glas
  Weinflasche: { name: "Wine bottle" },
  Marmeladenglas: { name: "Jam jar" },
  "Bierflasche (ohne Pfand)": { name: "Beer bottle (no deposit)" },
  Parfümflasche: { name: "Perfume bottle" },
  Gurkenglas: { name: "Pickle jar" },
  Honigglas: { name: "Honey jar" },
  "Olivenölflasche (Glas)": { name: "Olive oil bottle (glass)" },
  Senfglas: { name: "Mustard jar" },

  // Restmüll
  Zigarettenkippe: { name: "Cigarette butt" },
  "Kaputtes Geschirr": {
    name: "Broken crockery",
    fact: "Broken crockery is NOT glass and does not go in the glass bin!",
  },
  Pflaster: { name: "Plaster" },
  "Kaputte Glühbirne": {
    name: "Broken light bulb",
    fact: "Energy-saving bulbs are hazardous waste! Only old filament bulbs go in general waste.",
  },
  Staubsaugerbeutel: { name: "Vacuum cleaner bag" },
  Kugelschreiber: { name: "Ballpoint pen" },
  Kassenzettel: {
    name: "Till receipt",
    fact: "Receipts are made of thermal paper and do NOT go in waste paper!",
  },
  Einwegrasierer: { name: "Disposable razor" },
  Wattestäbchen: { name: "Cotton bud" },
  "Alte Unterwäsche": {
    name: "Old underwear",
    fact: "Wearable clothes go in the clothes bank, worn-out ones in general waste.",
  },
  Katzenstreu: { name: "Cat litter" },
  Windel: { name: "Nappy" },
  "Alte Zahnbürste": { name: "Old toothbrush" },
  "Geschenkpapier (mit Folie)": {
    name: "Wrapping paper (with foil)",
    fact: "Coated or shiny wrapping paper does NOT go in waste paper!",
  },
  "Zerbrochener Spiegel": {
    name: "Broken mirror",
    fact: "Mirrors are coated glass and do not go in the glass bin!",
  },
  "Pizzakarton (fettig)": {
    name: "Pizza box (greasy)",
    fact: "Dirty pizza boxes go in general waste, clean ones in waste paper!",
  },
  "Alte CD": { name: "Old CD" },
  Tapeten: {
    name: "Wallpaper",
    fact: "Wallpaper is coated and does not go in waste paper.",
  },

  // Sondermüll
  Batterie: {
    name: "Battery",
    fact: "You can drop off batteries in the collection box at any supermarket!",
  },
  "Altes Smartphone": {
    name: "Old smartphone",
    fact: "Electrical devices can be dropped off for free at recycling centres.",
  },
  "Abgelaufene Medikamente": {
    name: "Expired medicine",
    fact: "Best taken back to a pharmacy or collection point – never down the toilet!",
  },
  Farbreste: { name: "Leftover paint" },
  Druckerpatronen: { name: "Printer cartridges" },
  "Alter Laptop": { name: "Old laptop" },
  Ladekabel: {
    name: "Charging cable",
    fact: "Cables are e-waste and go to the recycling centre!",
  },
  "Fieberthermometer (Quecksilber)": { name: "Thermometer (mercury)" },
  Energiesparlampe: {
    name: "Energy-saving bulb",
    fact: "Energy-saving bulbs contain mercury and are hazardous waste!",
  },
  Nagellackentferner: { name: "Nail polish remover" },
};
