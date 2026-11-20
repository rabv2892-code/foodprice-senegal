import React from "react";
import { MarchesRetenus as Donnees } from "../api/client";
import { useDonnees } from "../lib/hooks";
import { nombre } from "../lib/format";
import { Attente, Carte, Tableau } from "./ui";

/** Petite section : les cinq marchés retenus et la justification de leur sélection (nombre de relevés). */
export const MarchesRetenus: React.FC = () => {
  const etat = useDonnees<Donnees>("marches");
  return (
    <Carte titre="Les cinq marchés étudiés" sousTitre="Ces cinq mêmes marchés sont utilisés dans toutes les pages du logiciel.">
      <Attente etat={etat}>
        {(m) => {
          const max = Math.max(...m.marches.map((x) => x.releves));
          return (
            <>
              <p className="mb-3 text-sm text-gris-700">
                Parmi les <strong>{m.nombre_marches_disponibles} marchés</strong> disponibles entre janvier 2025 et décembre 2026, nous avons
                retenu les cinq qui comptent le plus grand nombre de relevés de prix exploitables ({nombre(m.releves_total_retenus)} relevés
                sur {nombre(m.releves_total_disponibles)}). Chaque marché retenu est observé sur {m.mois_couverts} mois.
              </p>
              <Tableau
                texte={3}
                colonnes={["Rang", "Marché", "Région", "Relevés de prix", "Mois couverts", "Produits suivis"]}
                lignes={m.marches.map((x) => [
                  x.rang,
                  <strong key="n">{x.marche}</strong>,
                  x.region,
                  <span key="r" className="inline-flex items-center justify-end gap-2">
                    <span className="hidden h-2 rounded bg-ciel-300 sm:inline-block" style={{ width: `${(x.releves / max) * 90}px` }} aria-hidden />
                    {nombre(x.releves)}
                  </span>,
                  x.mois,
                  x.produits,
                ])}
              />
            </>
          );
        }}
      </Attente>
    </Carte>
  );
};
