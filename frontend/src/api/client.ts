// Appels à l'API FastAPI et types des réponses.

export interface Options {
  produits: string[];
  produit_par_defaut: string;
  marches: string[];
  premier_mois: string;
  dernier_mois: string;
  unite: string;
}

export interface MarcheRetenu {
  rang: number;
  marche: string;
  region: string;
  releves: number;
  mois: number;
  produits: number;
}

export interface MarchesRetenus {
  periode: string;
  critere: string;
  nombre_marches_disponibles: number;
  marches: MarcheRetenu[];
  releves_total_retenus: number;
  releves_total_disponibles: number;
  mois_couverts: number;
}

export interface PointEvolution {
  mois: string;
  libelle: string;
  moyenne: number | null;
  minimum: number | null;
  maximum: number | null;
}

export type LigneMarches = { mois: string; libelle: string } & Record<string, string | number | null>;

export interface ProduitComparaison {
  produit: string;
  dernier_prix: number | null;
  dernier_mois: string | null;
  marches_dernier_mois: number;
  moyenne_periode: number | null;
}

export interface TableauDeBord {
  produit: string;
  unite: string;
  indicateurs: {
    marches_etudies: number;
    produits_disponibles: number;
    dernier_prix: number | null;
    dernier_mois: string | null;
    variation_pct: number | null;
    variation_absolue: number | null;
    variation_vs: string | null;
    glissement_annuel_pct: number | null;
  };
  marches: string[];
  evolution: PointEvolution[];
  comparaison_marches: LigneMarches[];
  comparaison_produits: ProduitComparaison[];
  mois_sans_releve: string[];
  note: string;
}

export interface AnalysePrix {
  produit: string;
  marche: string | null;
  portee: string;
  serie: { mois: string; libelle: string; prix: number | null; moyenne_mobile_3: number | null }[];
  resume: Record<string, number | string | null>;
  tableau: { mois: string; libelle: string; prix: number | null; variation_pct: number | null; moyenne_mobile_3: number | null }[];
  produits: {
    produit: string;
    dernier_prix: number;
    dernier_mois: string;
    moyenne: number;
    variation_mensuelle_pct: number | null;
    variation_depuis_debut_pct: number | null;
    mois_releves: number;
  }[];
  mois_sans_releve: string[];
  interpretation: string;
}

export interface ResumeMarche {
  marche: string;
  region: string;
  releves: number;
  dernier_prix?: number;
  dernier_mois?: string;
  moyenne?: number;
  minimum?: number;
  maximum?: number;
  ecart_moyenne_pct?: number;
  variabilite_pct?: number | null;
}

export interface ComparaisonMarches {
  produit: string;
  marches: string[];
  serie: LigneMarches[];
  resume: ResumeMarche[];
  ecart_mensuel: { mois: string; libelle: string; ecart: number | null; marches: number }[];
  moins_cher: string | null;
  plus_cher: string | null;
  interpretation: string;
}

export interface StatsDescriptives {
  n: number;
  moyenne?: number;
  mediane?: number;
  ecart_type?: number | null;
  cv_pct?: number | null;
  minimum?: number;
  maximum?: number;
  asymetrie?: number | null;
}

export interface Matrice {
  noms: string[];
  valeurs: (number | null)[][];
  min_mois: number;
}

export interface EtudesStatistiques {
  produit: string;
  par_produit: ({ produit: string } & StatsDescriptives)[];
  par_marche: ({ marche: string } & StatsDescriptives)[];
  kruskal: { disponible: boolean; statistique?: number; p_valeur?: number; significatif?: boolean; conclusion?: string };
  tendance: { disponible: boolean; rho?: number; p_valeur?: number; significative?: boolean; conclusion?: string };
  volatilite: {
    ecart_type_variation_pct: number | null;
    plus_forte_hausse_pct: number | null;
    mois_hausse: string | null;
    plus_forte_baisse_pct: number | null;
    mois_baisse: string | null;
  };
  correlation_marches: Matrice;
  correlation_produits: Matrice;
  interpretation: string;
  mise_en_garde: string;
}

export interface ValidationModele {
  cle: string;
  modele: string;
  reqm: number | null;
  eam: number | null;
  eamp: number | null;
  retenu: boolean;
}

export interface Previsions {
  produit: string;
  marche: string | null;
  portee: string;
  disponible: boolean;
  message?: string;
  historique: { mois: string; libelle: string; prix: number | null }[];
  prevision?: { mois: string; libelle: string; prevision: number; bas: number; haut: number }[];
  modele?: string;
  fiabilite?: string;
  dernier_mois_observe?: string;
  dernier_prix?: number;
  validation?: ValidationModele[];
  mois_validation?: number;
  mois_observes?: number;
  mois_interpoles?: string[];
  variation_prevue_pct?: number;
  interpretation?: string;
}

// Adresse publique de l'API : variable VITE_API_URL définie à la construction du site (voir render.yaml).
// Vide en développement et en usage local « tout-en-un » : les appels passent alors par le même serveur.
const BASE_API = ((import.meta.env.VITE_API_URL as string | undefined) ?? "").trim().replace(/\/+$/, "");

/** Réglages des appels : un serveur gratuit endormi peut mettre jusqu'à une minute à se réveiller. */
export const reglages = { tentatives: 3, delaiEntreTentatives: 5000, delaiMaximal: 90000 };

const attendre = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function obtenir<T>(chemin: string, parametres: Record<string, string | null | undefined> = {}): Promise<T> {
  const q = new URLSearchParams();
  Object.entries(parametres).forEach(([cle, valeur]) => {
    if (valeur) q.set(cle, valeur);
  });
  const url = `${BASE_API}/api/${chemin}${q.toString() ? `?${q}` : ""}`;

  let derniereErreur = "Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.";
  for (let essai = 1; essai <= reglages.tentatives; essai++) {
    const arret = new AbortController();
    const minuteur = setTimeout(() => arret.abort(), reglages.delaiMaximal);
    try {
      const reponse = await fetch(url, { signal: arret.signal });
      if (reponse.ok) return (await reponse.json()) as T;
      derniereErreur = `Le serveur a renvoyé une erreur (code ${reponse.status}). Veuillez réessayer.`;
      // Erreurs 4xx : inutile de recommencer ; 502/503/504 : le serveur est probablement en train de démarrer.
      if (![502, 503, 504].includes(reponse.status)) throw new Error(derniereErreur);
    } catch (e) {
      if (e instanceof Error && e.message === derniereErreur) throw e;
      derniereErreur =
        e instanceof DOMException && e.name === "AbortError"
          ? "Le serveur met trop de temps à répondre. Veuillez réessayer dans un instant."
          : "Impossible de joindre le serveur. Vérifiez votre connexion, puis réessayez.";
    } finally {
      clearTimeout(minuteur);
    }
    if (essai < reglages.tentatives) await attendre(reglages.delaiEntreTentatives);
  }
  throw new Error(derniereErreur);
}

export function lienExport(type: "pdf" | "excel" | "csv", produit?: string, marche?: string | null): string {
  const q = new URLSearchParams();
  if (produit) q.set("produit", produit);
  if (marche) q.set("marche", marche);
  return `${BASE_API}/api/export/${type}${q.toString() ? `?${q}` : ""}`;
}
