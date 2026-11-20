/**
 * Utilitaires d'affichage 100 % français.
 * Les valeurs techniques de l'API restent au format ISO (AAAA-MM-JJ) ; seule l'interface est formatée.
 */

const ISO_DATE = /\b(20\d{2})-(\d{2})-(\d{2})\b/g;
const ISO_MONTH = /\b(20\d{2})-(0[1-9]|1[0-2])\b(?!-\d)/g;

/** "2026-03-15" -> "15/03/2026" */
export function fmtDate(value: string | null | undefined): string {
  if (!value) return "—";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return fmtMonth(s);
}

/** "2026-03" -> "03/2026" */
export function fmtMonth(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return fmtDate(s);
  if (/^\d{4}-\d{2}$/.test(s)) return `${s.slice(5, 7)}/${s.slice(0, 4)}`;
  return s;
}

/** Liste de mois ISO -> "01/2026, 02/2026" */
export function fmtMonths(list: string[] | null | undefined, empty = "aucun"): string {
  return list && list.length ? list.map(fmtMonth).join(", ") : empty;
}

/** Convertit toutes les dates ISO présentes dans un texte libre renvoyé par l'API. */
export function frText(text: string | null | undefined): string {
  if (!text) return "";
  return text
    .replace(ISO_DATE, (_m, y, mo, d) => `${d}/${mo}/${y}`)
    .replace(ISO_MONTH, (_m, y, mo) => `${mo}/${y}`);
}

/** Étiquette d'infobulle/axe : met en forme dates et mois ISO, laisse le reste inchangé. */
export function fmtLabel(label: unknown): string {
  if (typeof label === "string") return fmtMonth(label);
  return String(label ?? "");
}

export function statusLabel(status: string): string {
  if (status === "evaluated") return "Évalué";
  if (status === "unavailable") return "Indisponible";
  return status;
}

/** Nom de la devise affichée : XOF -> FCFA */
export function currencyLabel(code: string | undefined | null): string {
  return !code || code.toUpperCase() === "XOF" ? "FCFA" : code;
}

/* ------------------------------------------------------------------ */
/* Désignation française des produits « temps réel » (noms d'origine des colonnes) */

const RT_TOKENS: Record<string, string> = {
  apples: "pommes", bananas: "bananes", beans: "haricots", bread: "pain", bulgur: "boulgour", cabbage: "chou",
  carrots: "carottes", cassava: "manioc", flour: "farine", meal: "semoule", cheese: "fromage", chickpeas: "pois chiches",
  chili: "piment", cocoyam: "taro", coffee: "café", instant: "soluble", couscous: "couscous", cowpeas: "niébé",
  cucumbers: "concombres", dates: "dattes", eggplants: "aubergines", eggs: "œufs", fish: "poisson", barbel: "barbeau",
  sole: "sole", catfish: "silure", goldstripe: "dorée", sardinella: "sardinelle", mackerel: "maquereau", milkfish: "chanos",
  mullet: "mulet", roundscad: "comète", salted: "salé", smoked: "fumé", tilapia: "tilapia", tuna: "thon", canned: "en conserve",
  various: "variétés diverses", fonio: "fonio", gari: "gari", garlic: "ail", groundnuts: "arachides", paste: "concentré",
  lemons: "citrons", lentils: "lentilles", livestock: "bétail", camel: "chameau", goat: "chèvre", s: "", sheep: "mouton",
  two: "deux", year: "ans", old: "", male: "mâle", castrated: "castré", maize: "maïs", meat: "viande", beef: "bœuf",
  chops: "côtelettes", minced: "haché", buffalo: "buffle", chicken: "poulet", broiler: "de chair", plucked: "plumé",
  whole: "entier", lamb: "agneau", mutton: "mouton", pork: "porc", melons: "melons", milk: "lait", oil: "huile",
  okra: "gombo", onions: "oignons", oranges: "oranges", papaya: "papaye", parsley: "persil", pasta: "pâtes", peas: "petits pois",
  plantains: "plantains", potatoes: "pommes de terre", pulses: "légumineuses", pumpkin: "citrouille", rice: "riz",
  salt: "sel", sesame: "sésame", snake: "courge", gourd: "serpent", sorghum: "sorgho", food: "alimentaire", aid: "aide",
  sugar: "sucre", tea: "thé", teff: "teff", tomatoes: "tomates", wheat: "blé", yam: "igname", yogurt: "yaourt",
  millet: "mil", fao: "(série FAO)",
};

/** "meat_beef_fao" -> "Viande – bœuf (série FAO)" ; le nom d'origine reste disponible dans l'infobulle. */
export function rtProductLabel(code: string): string {
  const norm = code
    .replace("livestockgoat", "livestock_goat")
    .replace("livestocksheep", "livestock_sheep")
    .replace("cowpeased", "cowpeas")
    .replace("food_aid", "foodaid");
  const parts = norm
    .split("_")
    .map((t) => (t === "foodaid" ? "aide alimentaire" : RT_TOKENS[t] ?? t))
    .filter((t) => t !== "");
  const fao = parts.includes("(série FAO)");
  const words = parts.filter((t) => t !== "(série FAO)");
  const label = words.join(" – ");
  const cap = label.charAt(0).toUpperCase() + label.slice(1);
  return fao ? `${cap} (série FAO)` : cap;
}
