import React from "react";
import { Download } from "lucide-react";
import { lienExport } from "../api/client";
import { useSelection } from "../context/SelectionContext";
import { Etat } from "../lib/hooks";

export const PageTitre: React.FC<{ titre: string; sousTitre?: string; children?: React.ReactNode }> = ({ titre, sousTitre, children }) => (
  <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
    <div>
      <h1 className="text-2xl font-bold text-marine-900">{titre}</h1>
      {sousTitre && <p className="mt-1 max-w-3xl text-sm text-gris-500">{sousTitre}</p>}
    </div>
    {children && <div className="flex flex-wrap items-end gap-3">{children}</div>}
  </div>
);

export const Carte: React.FC<{ titre?: string; sousTitre?: string; children: React.ReactNode; className?: string }> = ({
  titre,
  sousTitre,
  children,
  className = "",
}) => (
  <section className={`rounded-lg border border-gris-200 bg-white p-4 ${className}`}>
    {titre && <h2 className="text-base font-semibold text-marine-900">{titre}</h2>}
    {sousTitre && <p className="mb-2 text-xs text-gris-500">{sousTitre}</p>}
    <div className={titre ? "mt-2" : ""}>{children}</div>
  </section>
);

export const Indicateur: React.FC<{ libelle: string; valeur: string; detail?: string; ton?: "neutre" | "hausse" | "baisse" }> = ({
  libelle,
  valeur,
  detail,
  ton = "neutre",
}) => (
  <div className="rounded-lg border border-gris-200 border-l-4 border-l-marine-800 bg-white p-4">
    <p className="text-xs font-medium uppercase tracking-wide text-gris-500">{libelle}</p>
    <p
      className={`mt-1 text-2xl font-bold ${
        ton === "hausse" ? "text-red-700" : ton === "baisse" ? "text-emerald-700" : "text-marine-900"
      }`}
    >
      {valeur}
    </p>
    {detail && <p className="mt-1 text-xs text-gris-500">{detail}</p>}
  </div>
);

export const Selecteur: React.FC<{
  libelle: string;
  valeur: string;
  onChange: (v: string) => void;
  choix: { valeur: string; libelle: string }[];
}> = ({ libelle, valeur, onChange, choix }) => (
  <label className="flex flex-col text-xs font-medium text-gris-700">
    {libelle}
    <select
      value={valeur}
      onChange={(e) => onChange(e.target.value)}
      className="mt-1 min-w-[12rem] rounded-md border border-gris-200 bg-white px-3 py-2 text-sm text-gris-700 focus:border-ciel-500 focus:outline-none"
    >
      {choix.map((c) => (
        <option key={c.valeur} value={c.valeur}>
          {c.libelle}
        </option>
      ))}
    </select>
  </label>
);

/** Liste déroulante des produits (sélection partagée entre les pages). */
export const ChoixProduit: React.FC = () => {
  const { options, produit, setProduit } = useSelection();
  if (!options) return null;
  return (
    <Selecteur
      libelle="Produit"
      valeur={produit}
      onChange={setProduit}
      choix={options.produits.map((p) => ({ valeur: p, libelle: p }))}
    />
  );
};

export const Chargement: React.FC = () => (
  <div role="status" className="rounded-lg border border-gris-200 bg-white p-8 text-center text-sm text-gris-500">
    Chargement des données…
  </div>
);

export const Erreur: React.FC<{ message: string }> = ({ message }) => (
  <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
    <strong>Une erreur est survenue.</strong> {message}
  </div>
);

/** Affiche le chargement ou l'erreur tant que les données ne sont pas prêtes. */
export function Attente<T>({ etat, children }: { etat: Etat<T>; children: (d: T) => React.ReactNode }) {
  if (etat.erreur) return <Erreur message={etat.erreur} />;
  if (!etat.donnees) return <Chargement />;
  return <>{children(etat.donnees)}</>;
}

export const Interpretation: React.FC<{ titre?: string; texte: string }> = ({ titre = "Interprétation", texte }) =>
  texte ? (
    <div className="rounded-lg border border-ciel-300 bg-ciel-50 p-4 text-sm leading-relaxed text-marine-900">
      <p className="mb-1 font-semibold">{titre}</p>
      <p>{texte}</p>
    </div>
  ) : null;

export const BoutonsExport: React.FC<{ produit?: string; marche?: string | null; csv?: boolean }> = ({ produit, marche, csv = true }) => {
  const classe =
    "inline-flex items-center gap-1.5 rounded-md border border-marine-800 bg-white px-3 py-2 text-sm font-medium text-marine-800 hover:bg-ciel-50";
  return (
    <div className="flex flex-wrap gap-2" aria-label="Exporter les résultats">
      <a className={classe} href={lienExport("pdf", produit, marche)}>
        <Download size={14} aria-hidden /> Rapport PDF
      </a>
      <a className={classe} href={lienExport("excel", produit, marche)}>
        <Download size={14} aria-hidden /> Excel
      </a>
      {csv && (
        <a className={classe} href={lienExport("csv")}>
          <Download size={14} aria-hidden /> CSV
        </a>
      )}
    </div>
  );
};

/** `texte` = nombre de colonnes de gauche alignées à gauche (les autres, numériques, sont alignées à droite). */
export const Tableau: React.FC<{ colonnes: string[]; lignes: React.ReactNode[][]; texte?: number }> = ({ colonnes, lignes, texte = 1 }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-sm">
      <thead>
        <tr className="bg-marine-900 text-left text-xs text-white">
          {colonnes.map((c, i) => (
            <th key={c} className={`px-3 py-2 font-semibold ${i >= texte ? "text-right" : ""}`}>
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {lignes.map((ligne, i) => (
          <tr key={i} className={i % 2 ? "bg-gris-50" : "bg-white"}>
            {ligne.map((cellule, j) => (
              <td key={j} className={`px-3 py-2 ${j >= texte ? "text-right tabular-nums" : ""}`}>
                {cellule}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
