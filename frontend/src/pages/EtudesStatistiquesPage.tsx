import React from "react";
import { EtudesStatistiques, Matrice } from "../api/client";
import { Attente, Carte, ChoixProduit, Interpretation, PageTitre, Tableau } from "../components/ui";
import { useSelection } from "../context/SelectionContext";
import { fcfa, nombre, pourcent, pValeur } from "../lib/format";
import { useDonnees } from "../lib/hooks";

/** Couleur de cellule : plus la corrélation est forte, plus le bleu est foncé. */
function fond(v: number | null): React.CSSProperties {
  if (v === null) return { background: "#F1F5F9", color: "#94A3B8" };
  const a = Math.min(1, Math.abs(v));
  return v >= 0
    ? { background: `rgba(37, 99, 235, ${0.08 + a * 0.75})`, color: a > 0.55 ? "#fff" : "#0B2A55" }
    : { background: `rgba(100, 116, 139, ${0.08 + a * 0.6})`, color: a > 0.55 ? "#fff" : "#0B2A55" };
}

const MatriceCorrelation: React.FC<{ m: Matrice }> = ({ m }) => (
  <div className="overflow-x-auto">
    <table className="w-full border-separate border-spacing-0.5 text-xs">
      <thead>
        <tr>
          <th />
          {m.noms.map((n) => (
            <th key={n} className="px-1 py-1 text-center font-semibold text-gris-700" style={{ maxWidth: 80 }}>
              {n}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {m.noms.map((a, i) => (
          <tr key={a}>
            <th className="whitespace-nowrap pr-2 text-right font-semibold text-gris-700">{a}</th>
            {m.valeurs[i].map((v, j) => (
              <td key={j} className="px-1 py-1.5 text-center tabular-nums" style={fond(v)} title={`${a} / ${m.noms[j]}`}>
                {v === null ? "—" : nombre(v, 2)}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    <p className="mt-2 text-xs text-gris-500">
      Coefficient de corrélation de Pearson calculé sur les mois communs (au moins {m.min_mois} mois). Proche de 1 : les prix évoluent ensemble ;
      proche de 0 : pas de lien ; « — » : trop peu de mois en commun.
    </p>
  </div>
);

export const EtudesStatistiquesPage: React.FC = () => {
  const { produit } = useSelection();
  const etat = useDonnees<EtudesStatistiques>("etudes-statistiques", { produit }, produit !== "");

  return (
    <>
      <PageTitre
        titre="Études statistiques"
        sousTitre="Statistiques descriptives, tests simples et corrélations calculés sur les cinq marchés retenus."
      >
        <ChoixProduit />
      </PageTitre>

      <Attente etat={etat}>
        {(d) => (
          <div className="space-y-5">
            <Interpretation texte={d.interpretation} />

            <Carte titre={`Statistiques descriptives de « ${d.produit} » par marché`} sousTitre="FCFA/kg, tous les relevés du marché">
              <Tableau
                colonnes={["Marché", "Relevés", "Moyenne", "Médiane", "Écart-type", "Coefficient de variation", "Minimum", "Maximum"]}
                lignes={d.par_marche.map((x) => [
                  <strong key="m">{x.marche}</strong>,
                  x.n,
                  fcfa(x.moyenne),
                  fcfa(x.mediane),
                  fcfa(x.ecart_type),
                  pourcent(x.cv_pct),
                  fcfa(x.minimum),
                  fcfa(x.maximum),
                ])}
              />
            </Carte>

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              <Carte titre="Les marchés sont-ils différents ?" sousTitre="Test de Kruskal-Wallis">
                {d.kruskal.disponible ? (
                  <>
                    <p className="text-sm text-gris-700">
                      Statistique H = <strong>{nombre(d.kruskal.statistique, 2)}</strong> · valeur p = <strong>{pValeur(d.kruskal.p_valeur)}</strong>
                    </p>
                    <p className="mt-2 text-sm">{d.kruskal.conclusion}</p>
                  </>
                ) : (
                  <p className="text-sm text-gris-500">Données insuffisantes.</p>
                )}
              </Carte>
              <Carte titre="Y a-t-il une tendance ?" sousTitre="Corrélation de rang de Spearman avec le temps">
                {d.tendance.disponible ? (
                  <>
                    <p className="text-sm text-gris-700">
                      Coefficient ρ = <strong>{nombre(d.tendance.rho, 2)}</strong> · valeur p = <strong>{pValeur(d.tendance.p_valeur)}</strong>
                    </p>
                    <p className="mt-2 text-sm">{d.tendance.conclusion}</p>
                  </>
                ) : (
                  <p className="text-sm text-gris-500">Données insuffisantes.</p>
                )}
              </Carte>
              <Carte titre="Les prix sont-ils volatils ?" sousTitre="Variations mensuelles du prix moyen">
                <p className="text-sm text-gris-700">
                  Écart-type des variations : <strong>{pourcent(d.volatilite.ecart_type_variation_pct)}</strong>
                </p>
                <p className="mt-2 text-sm">
                  Plus forte hausse : <strong>{pourcent(d.volatilite.plus_forte_hausse_pct, 1, true)}</strong> ({d.volatilite.mois_hausse ?? "—"})
                  <br />
                  Plus forte baisse : <strong>{pourcent(d.volatilite.plus_forte_baisse_pct, 1)}</strong> ({d.volatilite.mois_baisse ?? "—"})
                </p>
              </Carte>
            </div>

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Carte titre="Corrélation entre les marchés" sousTitre={d.produit}>
                <MatriceCorrelation m={d.correlation_marches} />
              </Carte>
              <Carte titre="Statistiques de tous les produits" sousTitre="Cinq marchés réunis · FCFA/kg">
                <Tableau
                  colonnes={["Produit", "Relevés", "Moyenne", "Coefficient de variation"]}
                  lignes={d.par_produit.map((x) => [x.produit === d.produit ? <strong key="p">{x.produit}</strong> : x.produit, x.n, fcfa(x.moyenne), pourcent(x.cv_pct)])}
                />
              </Carte>
            </div>

            <Carte titre="Corrélation entre les produits" sousTitre="Prix moyen des cinq marchés, mois par mois">
              <MatriceCorrelation m={d.correlation_produits} />
            </Carte>

            <p className="text-xs text-gris-500">{d.mise_en_garde}</p>
          </div>
        )}
      </Attente>
    </>
  );
};
