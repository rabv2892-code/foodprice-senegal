import React from "react";
import { ComparaisonMarches } from "../api/client";
import { GraphiqueBarres, GraphiqueMarches } from "../components/graphiques";
import { MarchesRetenus } from "../components/MarchesRetenus";
import { Attente, Carte, ChoixProduit, Interpretation, PageTitre, Tableau } from "../components/ui";
import { useSelection } from "../context/SelectionContext";
import { fcfa, pourcent } from "../lib/format";
import { useDonnees } from "../lib/hooks";

export const ComparaisonMarchesPage: React.FC = () => {
  const { produit } = useSelection();
  const etat = useDonnees<ComparaisonMarches>("comparaison-marches", { produit }, produit !== "");

  return (
    <>
      <PageTitre titre="Comparaison des marchés" sousTitre="Les cinq marchés retenus sont comparés pour un même produit : niveau de prix, écarts et variabilité.">
        <ChoixProduit />
      </PageTitre>

      <Attente etat={etat}>
        {(d) => (
          <div className="space-y-5">
            <Carte titre="Prix mensuel dans chaque marché" sousTitre={`${d.produit} · FCFA/kg`}>
              <GraphiqueMarches donnees={d.serie} marches={d.marches} hauteur={340} />
            </Carte>

            <Interpretation texte={d.interpretation} />

            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              <Carte titre="Prix moyen par marché" sousTitre="FCFA/kg, sur les mois avec relevé">
                <GraphiqueBarres
                  donnees={d.resume.map((x) => ({ marche: x.marche, moyenne: x.moyenne ?? null }))}
                  categorie="marche"
                  cle="moyenne"
                  nom="Prix moyen"
                />
              </Carte>
              <Carte titre="Écart entre le marché le plus cher et le moins cher" sousTitre="FCFA/kg, mois par mois">
                <GraphiqueBarres
                  donnees={d.ecart_mensuel.map((x) => ({ libelle: x.libelle, ecart: x.ecart }))}
                  categorie="libelle"
                  cle="ecart"
                  nom="Écart de prix"
                />
              </Carte>
            </div>

            <Carte titre="Tableau comparatif">
              <Tableau
                texte={2}
                colonnes={["Marché", "Région", "Mois relevés", "Dernier prix", "Prix moyen", "Minimum", "Maximum", "Écart à la moyenne", "Variabilité"]}
                lignes={d.resume.map((x) => [
                  <span key="m" className="font-semibold">
                    {x.marche}
                    {x.marche === d.moins_cher && <span className="ml-2 rounded bg-ciel-100 px-1.5 py-0.5 text-[11px] font-medium text-marine-800">le moins cher</span>}
                    {x.marche === d.plus_cher && <span className="ml-2 rounded bg-gris-100 px-1.5 py-0.5 text-[11px] font-medium text-gris-700">le plus cher</span>}
                  </span>,
                  x.region,
                  x.releves,
                  fcfa(x.dernier_prix),
                  fcfa(x.moyenne),
                  fcfa(x.minimum),
                  fcfa(x.maximum),
                  pourcent(x.ecart_moyenne_pct, 1, true),
                  pourcent(x.variabilite_pct, 1),
                ])}
              />
              <p className="mt-2 text-xs text-gris-500">
                « Écart à la moyenne » : prix moyen du marché comparé à la moyenne des cinq marchés. « Variabilité » : coefficient de variation
                (écart-type divisé par la moyenne).
              </p>
            </Carte>

            <MarchesRetenus />
          </div>
        )}
      </Attente>
    </>
  );
};
