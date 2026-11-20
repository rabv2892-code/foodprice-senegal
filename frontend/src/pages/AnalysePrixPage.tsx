import React, { useState } from "react";
import { AnalysePrix } from "../api/client";
import { GraphiquePrix } from "../components/graphiques";
import { Attente, Carte, ChoixProduit, Indicateur, Interpretation, PageTitre, Selecteur, Tableau } from "../components/ui";
import { useSelection } from "../context/SelectionContext";
import { fcfa, pourcent } from "../lib/format";
import { useDonnees } from "../lib/hooks";

const TOUS = "ALL";

export const AnalysePrixPage: React.FC = () => {
  const { produit, options } = useSelection();
  const [marche, setMarche] = useState(TOUS);
  const etat = useDonnees<AnalysePrix>("analyse-prix", { produit, marche: marche === TOUS ? null : marche }, produit !== "");

  const choixMarches = [
    { valeur: TOUS, libelle: "Moyenne des 5 marchés" },
    ...(options?.marches ?? []).map((m) => ({ valeur: m, libelle: m })),
  ];

  return (
    <>
      <PageTitre titre="Analyse des prix" sousTitre="Évolution mensuelle du prix d'un produit, au choix dans un marché ou en moyenne sur les cinq marchés.">
        <ChoixProduit />
        <Selecteur libelle="Marché" valeur={marche} onChange={setMarche} choix={choixMarches} />
      </PageTitre>

      <Attente etat={etat}>
        {(d) => {
          const r = d.resume as Record<string, number | string | null>;
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Indicateur libelle="Dernier prix observé" valeur={fcfa(r.dernier_prix as number)} detail={String(r.dernier_mois ?? "")} />
                <Indicateur libelle="Prix moyen" valeur={fcfa(r.moyenne as number)} detail={`${r.releves_mois} mois avec relevé`} />
                <Indicateur libelle="Prix minimum" valeur={fcfa(r.minimum as number)} detail={String(r.mois_minimum ?? "")} />
                <Indicateur libelle="Prix maximum" valeur={fcfa(r.maximum as number)} detail={String(r.mois_maximum ?? "")} />
              </div>

              <Carte titre="Évolution mensuelle du prix" sousTitre={`${d.produit} · ${d.portee} · FCFA/kg`}>
                <GraphiquePrix donnees={d.serie} />
                {d.mois_sans_releve.length > 0 && (
                  <p className="mt-2 text-xs text-gris-500">Mois sans relevé (non remplacés) : {d.mois_sans_releve.join(", ")}.</p>
                )}
              </Carte>

              <Interpretation texte={d.interpretation} />

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Carte titre="Détail mensuel">
                  <Tableau
                    colonnes={["Mois", "Prix (FCFA/kg)", "Variation", "Moyenne mobile 3 mois"]}
                    lignes={d.tableau.map((t) => [
                      t.libelle,
                      t.prix === null ? <span className="text-gris-500">Pas de relevé</span> : fcfa(t.prix),
                      pourcent(t.variation_pct, 1, true),
                      t.moyenne_mobile_3 === null ? "—" : fcfa(t.moyenne_mobile_3),
                    ])}
                  />
                </Carte>
                <Carte titre="Tous les produits" sousTitre={`${d.portee}`}>
                  <Tableau
                    colonnes={["Produit", "Dernier prix", "Variation mensuelle", "Depuis le début"]}
                    lignes={d.produits.map((p) => [
                      p.produit === d.produit ? <strong key="p">{p.produit}</strong> : p.produit,
                      fcfa(p.dernier_prix),
                      pourcent(p.variation_mensuelle_pct, 1, true),
                      pourcent(p.variation_depuis_debut_pct, 1, true),
                    ])}
                  />
                </Carte>
              </div>
            </div>
          );
        }}
      </Attente>
    </>
  );
};
