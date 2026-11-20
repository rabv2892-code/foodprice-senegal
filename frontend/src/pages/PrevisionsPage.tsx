import React, { useState } from "react";
import { Previsions } from "../api/client";
import { GraphiquePrevision } from "../components/graphiques";
import { Attente, BoutonsExport, Carte, ChoixProduit, Indicateur, Interpretation, PageTitre, Selecteur, Tableau } from "../components/ui";
import { useSelection } from "../context/SelectionContext";
import { fcfa, nombre, pourcent } from "../lib/format";
import { useDonnees } from "../lib/hooks";

const TOUS = "ALL";

export const PrevisionsPage: React.FC = () => {
  const { produit, options } = useSelection();
  const [marche, setMarche] = useState(TOUS);
  const m = marche === TOUS ? null : marche;
  const etat = useDonnees<Previsions>("previsions", { produit, marche: m }, produit !== "");

  const choixMarches = [
    { valeur: TOUS, libelle: "Moyenne des 5 marchés" },
    ...(options?.marches ?? []).map((x) => ({ valeur: x, libelle: x })),
  ];

  return (
    <>
      <PageTitre
        titre="Prévisions IA"
        sousTitre="Prévision du prix sur six mois avec un modèle statistique simple (Holt-Winters ou ARIMA), choisi automatiquement selon sa précision sur les derniers mois connus."
      >
        <ChoixProduit />
        <Selecteur libelle="Marché" valeur={marche} onChange={setMarche} choix={choixMarches} />
        <BoutonsExport produit={produit} marche={m} csv={false} />
      </PageTitre>

      <Attente etat={etat}>
        {(p) =>
          !p.disponible ? (
            <div className="rounded-lg border border-gris-200 bg-white p-6 text-sm text-gris-700">
              <p className="font-semibold text-marine-900">Prévision indisponible pour cette sélection</p>
              <p className="mt-1">{p.message}</p>
              <p className="mt-2 text-gris-500">Choisissez un autre produit ou un autre marché (ou la moyenne des cinq marchés).</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Indicateur libelle="Modèle retenu" valeur={p.modele!.split(" (")[0]} detail={p.modele!.includes(" (") ? `(${p.modele!.split(" (").slice(1).join(" (")}` : undefined} />
                <Indicateur libelle="Fiabilité" valeur={p.fiabilite![0].toUpperCase() + p.fiabilite!.slice(1)} detail="selon l'erreur en pourcentage (EAMP)" />
                <Indicateur libelle="Dernier prix observé" valeur={fcfa(p.dernier_prix)} detail={p.dernier_mois_observe} />
                <Indicateur
                  libelle="Prix prévu dans six mois"
                  valeur={fcfa(p.prevision![p.prevision!.length - 1].prevision)}
                  detail={`${pourcent(p.variation_prevue_pct, 1, true)} · ${p.prevision![p.prevision!.length - 1].libelle}`}
                />
              </div>

              <Carte titre="Historique des prix et prévisions" sousTitre={`${p.produit} · ${p.portee} · FCFA/kg`}>
                <GraphiquePrevision previsions={p} hauteur={340} />
              </Carte>

              <Interpretation texte={p.interpretation ?? ""} />

              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <Carte titre="Prévisions mois par mois" sousTitre="Valeurs estimées, jamais observées">
                  <Tableau
                    colonnes={["Mois", "Prévision", "Borne basse (95 %)", "Borne haute (95 %)"]}
                    lignes={p.prevision!.map((x) => [x.libelle, <strong key="p">{fcfa(x.prevision)}</strong>, fcfa(x.bas), fcfa(x.haut)])}
                  />
                </Carte>
                <Carte
                  titre="Métriques de performance"
                  sousTitre={`Chaque modèle est entraîné sans les ${p.mois_validation} derniers mois observés, puis comparé aux vrais prix.`}
                >
                  <Tableau
                    colonnes={["Modèle", "REQM", "EAM", "EAMP"]}
                    lignes={p.validation!.map((v) => [
                      <span key="m" className={v.retenu ? "font-semibold text-marine-900" : "text-gris-700"}>
                        {v.modele}
                        {v.retenu && <span className="ml-2 rounded bg-ciel-100 px-1.5 py-0.5 text-[11px] font-medium text-marine-800">retenu</span>}
                        {v.cle === "naif" && <span className="ml-2 text-[11px] text-gris-500">(référence)</span>}
                      </span>,
                      `${nombre(v.reqm, 1)} FCFA/kg`,
                      `${nombre(v.eam, 1)} FCFA/kg`,
                      pourcent(v.eamp),
                    ])}
                  />
                  <ul className="mt-3 space-y-1 text-xs text-gris-500">
                    <li>
                      <strong>REQM</strong> : racine de l'erreur quadratique moyenne (pénalise les grosses erreurs).
                    </li>
                    <li>
                      <strong>EAM</strong> : erreur absolue moyenne, en FCFA/kg.
                    </li>
                    <li>
                      <strong>EAMP</strong> : erreur absolue moyenne en pourcentage du prix réel.
                    </li>
                  </ul>
                </Carte>
              </div>

              <p className="text-xs text-gris-500">
                Série de {p.mois_observes} mois observés.
                {p.mois_interpoles && p.mois_interpoles.length > 0 &&
                  ` Mois sans relevé comblé(s) uniquement pour l'ajustement du modèle : ${p.mois_interpoles.join(", ")}.`}{" "}
                Les prévisions sont des estimations statistiques et non des observations.
              </p>
            </div>
          )
        }
      </Attente>
    </>
  );
};
