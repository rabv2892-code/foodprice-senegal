// Formats d'affichage français : espace pour les milliers, virgule décimale.

const NBSP = "\u00a0";

export function nombre(valeur: number | null | undefined, decimales = 0): string {
  if (valeur === null || valeur === undefined || Number.isNaN(valeur)) return "—";
  return valeur
    .toLocaleString("fr-FR", { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
    .replace(/[\u202f\u00a0]/g, NBSP);
}

export function fcfa(valeur: number | null | undefined, decimales = 0): string {
  return valeur === null || valeur === undefined ? "—" : `${nombre(valeur, decimales)}${NBSP}FCFA/kg`;
}

export function pourcent(valeur: number | null | undefined, decimales = 1, avecSigne = false): string {
  if (valeur === null || valeur === undefined) return "—";
  const signe = avecSigne && valeur > 0 ? "+" : "";
  return `${signe}${nombre(valeur, decimales)}${NBSP}%`;
}

export function pValeur(p: number | null | undefined): string {
  if (p === null || p === undefined) return "—";
  return p < 0.0001 ? "< 0,0001" : nombre(p, 4);
}
