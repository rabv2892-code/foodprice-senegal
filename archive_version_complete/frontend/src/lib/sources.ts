import type { SourceId } from "../types";

export const DEFAULT_SOURCE_KEY = "foodprice.source_par_defaut";

/** Libellés français des sources (les identifiants techniques de l'API restent inchangés). */
export const SOURCE_CHOICES: { id: SourceId; label: string }[] = [
  { id: "wfp", label: "PAM Sénégal (prix observés)" },
  { id: "rt_observed", label: "Temps réel (relevés directs)" },
  { id: "rt_model", label: "Temps réel (estimations modélisées)" },
  { id: "csa", label: "BASE_BULLETIN — CSA régional" },
];

export const SOURCE_SHORT: Record<string, string> = {
  wfp: "PAM",
  rt_observed: "Temps réel (relevés)",
  rt_model: "Temps réel (estimations)",
  csa: "CSA",
};

export function initialSource(): SourceId {
  try {
    const v = window.localStorage.getItem(DEFAULT_SOURCE_KEY) as SourceId | null;
    if (v && SOURCE_CHOICES.some((s) => s.id === v)) return v;
  } catch {
    /* stockage indisponible */
  }
  return "wfp";
}
