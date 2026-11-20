import React from "react";
import { Previsions, TableauDeBord } from "../api/client";
import { GraphiqueEvolution, GraphiqueMarches, GraphiquePrevision, GraphiqueProduits } from "../components/graphiques";
import { MarchesRetenus } from "../components/MarchesRetenus";
import { Attente, BoutonsExport, Carte, ChoixProduit, Indicateur, PageTitre } from "../components/ui";
import { useSelection } from "../context/SelectionContext";
import { fcfa, pourcent } from "../lib/format";
import { useDonnees } from "../lib/hooks";

export const DashboardPage: React.FC = () => {
  const { produit } = useSelection();
  const etat = useDonnees<TableauDeBord>("tableau-de-bord", { produit }, produit !== "");
  const prev = useDonnees<Previsions>("previsions", { produit }, produit !== "");

  return (
    <>
      <PageTitre
        titre="Tableau de bord"
        sousTitre="Suivi des prix de produits alimentaires de base sur cinq marchés du Sénégal, de janvier 2025 à décembre 2026 (données PAM)."
      >
        <ChoixProduit />
        <BoutonsExport produit={produit} />
      </PageTitre>

      <Attente etat={etat}>
        {(d) => {
          const k = d.indicateurs;
          const ton = k.variation_pct === null ? "neutre" : k.variation_pct > 0 ? "hausse" : k.variation_pct < 0 ? "baisse" : "neutre";
          return (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Indicateur libelle="Marchés étudiés" valeur={String(k.marches_etudies)} detail="Les cinq mieux couverts" />
                <Indicateur libelle="Produits disponibles" valeur={String(k.produits_disponibles)} detail="Céréales, légumineuses et noix" />
                <Indicateur
                  libelle="Dernier prix observé"
                  valeur={fcfa(k.dernier_prix)}
                  detail={`${d.produit} · ${k.dernier_mois ?? ""} · moyenne des 5 marchés`}
                />
                <Indicateur
                  libelle="Variation du prix"
                  valeur={pourcent(k.variation_pct, 1, true)}
                  ton={ton}
                  detail={
                    k.variation_vs
                      ? `par rapport à ${k.variation_vs}${k.glissement_annuel_pct !== null ? ` · ${pourcent(k.glissement_annuel_pct, 1, true)} sur un an` : ""}`
                      : undefined
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Carte titre="Évolution des prix dans le temps" sousTitre={`${d.produit} · prix moyen des 5 marchés (FCFA/kg)`}>
                  <GraphiqueEvolution donnees={d.evolution} />
                </Carte>
                <Carte titre="Comparaison des prix entre les cinq marchés" sousTitre={`${d.produit} · FCFA/kg`}>
                  <GraphiqueMarches donnees={d.comparaison_marches} marches={d.marches} />
                </Carte>
                <Carte titre="Comparaison des prix entre les produits" sousTitre="Dernier mois observé, moyenne des 5 marchés (FCFA/kg)">
                  <GraphiqueProduits donnees={d.comparaison_produits} />
                </Carte>
                <Carte
                  titre="Prévisions des prix sur six mois"
                  sousTitre={`${d.produit} · moyenne des 5 marchés${prev.donnees?.modele ? ` · modèle : ${prev.donnees.modele}` : ""}`}
                >
                  <Attente etat={prev}>
                    {(p) =>
                      p.disponible ? (
                        <GraphiquePrevision previsions={p} />
                      ) : (
                        <p className="py-10 text-center text-sm text-gris-500">{p.message}</p>
                      )
                    }
                  </Attente>
                </Carte>
              </div>

              <p className="text-xs text-gris-500">
                {d.note}
                {d.mois_sans_releve.length > 0 && ` Mois sans relevé pour ce produit : ${d.mois_sans_releve.join(", ")}.`}
              </p>

              <MarchesRetenus />
            </div>
          );
        }}
      </Attente>
    </>
  );
};
