import React from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LigneMarches, Previsions, ProduitComparaison } from "../api/client";
import { fcfa, nombre } from "../lib/format";

export const COULEURS = {
  marine: "#0B2A55",
  bleu: "#2563EB",
  ciel: "#93C5FD",
  gris: "#64748B",
};
export const COULEURS_MARCHES = ["#0B2A55", "#2563EB", "#38BDF8", "#94A3B8", "#0D9488"];

const axe = { fontSize: 11, fill: "#64748B" };
const marges = { top: 8, right: 12, bottom: 0, left: 0 };

const formatAxe = (v: number) => nombre(v);
const formatInfo = (v: unknown) => (typeof v === "number" ? fcfa(v) : "Pas de relevé");

const Cadre: React.FC<{ hauteur?: number; children: React.ReactElement }> = ({ hauteur = 300, children }) => (
  <div style={{ width: "100%", height: hauteur }}>
    <ResponsiveContainer>{children}</ResponsiveContainer>
  </div>
);

const Legende = <Legend wrapperStyle={{ fontSize: 12 }} />;

/** 1. Évolution du prix moyen des cinq marchés (avec l'écart minimum – maximum entre marchés). */
export const GraphiqueEvolution: React.FC<{ donnees: { libelle: string; moyenne: number | null; minimum: number | null; maximum: number | null }[] }> = ({
  donnees,
}) => {
  const lignes = donnees.map((d) => ({
    libelle: d.libelle,
    moyenne: d.moyenne,
    ecart: d.minimum !== null && d.maximum !== null ? [d.minimum, d.maximum] : null,
  }));
  return (
    <Cadre>
      <ComposedChart data={lignes} margin={marges}>
        <CartesianGrid stroke="#E5E9F0" vertical={false} />
        <XAxis dataKey="libelle" tick={axe} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={axe} tickFormatter={formatAxe} width={52} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(v: unknown, nom: string) =>
            Array.isArray(v) ? [`${nombre(v[0])} à ${nombre(v[1])} FCFA/kg`, nom] : [formatInfo(v), nom]
          }
        />
        {Legende}
        <Area type="linear" dataKey="ecart" name="Écart entre marchés (min. – max.)" stroke="none" fill={COULEURS.ciel} fillOpacity={0.45} isAnimationActive={false} />
        <Line type="linear" dataKey="moyenne" name="Prix moyen des 5 marchés" stroke={COULEURS.marine} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
      </ComposedChart>
    </Cadre>
  );
};

/** 2. Prix mensuel dans chacun des cinq marchés. */
export const GraphiqueMarches: React.FC<{ donnees: LigneMarches[]; marches: string[]; hauteur?: number }> = ({ donnees, marches, hauteur }) => (
  <Cadre hauteur={hauteur}>
    <LineChart data={donnees} margin={marges}>
      <CartesianGrid stroke="#E5E9F0" vertical={false} />
      <XAxis dataKey="libelle" tick={axe} interval="preserveStartEnd" minTickGap={18} />
      <YAxis tick={axe} tickFormatter={formatAxe} width={52} domain={["auto", "auto"]} />
      <Tooltip formatter={(v: unknown, nom: string) => [formatInfo(v), nom]} />
      {Legende}
      {marches.map((m, i) => (
        <Line key={m} type="linear" dataKey={m} name={m} stroke={COULEURS_MARCHES[i % COULEURS_MARCHES.length]} strokeWidth={2} dot={{ r: 2.5 }} connectNulls={false} isAnimationActive={false} />
      ))}
    </LineChart>
  </Cadre>
);

/** 3. Comparaison des produits : dernier prix observé et moyenne de la période. */
export const GraphiqueProduits: React.FC<{ donnees: ProduitComparaison[] }> = ({ donnees }) => (
  <Cadre hauteur={Math.max(300, donnees.length * 30 + 60)}>
    <BarChart data={donnees} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 8 }}>
      <CartesianGrid stroke="#E5E9F0" horizontal={false} />
      <XAxis type="number" tick={axe} tickFormatter={formatAxe} />
      <YAxis type="category" dataKey="produit" tick={axe} width={150} />
      <Tooltip formatter={(v: unknown, nom: string) => [formatInfo(v), nom]} />
      {Legende}
      <Bar dataKey="dernier_prix" name="Dernier prix observé" fill={COULEURS.marine} radius={[0, 3, 3, 0]} isAnimationActive={false} />
      <Bar dataKey="moyenne_periode" name="Moyenne de la période" fill={COULEURS.ciel} radius={[0, 3, 3, 0]} isAnimationActive={false} />
    </BarChart>
  </Cadre>
);

/** 4. Historique, prévision à six mois et intervalle de confiance à 95 %. */
export const GraphiquePrevision: React.FC<{ previsions: Previsions; hauteur?: number }> = ({ previsions, hauteur }) => {
  const hist = previsions.historique;
  const prev = previsions.prevision ?? [];
  const dernierObs = [...hist].reverse().find((p) => p.prix !== null);
  const lignes: Record<string, string | number | number[] | null>[] = hist.map((p) => ({
    libelle: p.libelle,
    prix: p.prix,
    // le point de départ de la prévision est le dernier prix réellement observé
    prevision: dernierObs && p.mois === dernierObs.mois ? p.prix : null,
    bande: null,
  }));
  prev.forEach((p) => lignes.push({ libelle: p.libelle, prix: null, prevision: p.prevision, bande: [p.bas, p.haut] }));
  return (
    <Cadre hauteur={hauteur}>
      <ComposedChart data={lignes} margin={marges}>
        <CartesianGrid stroke="#E5E9F0" vertical={false} />
        <XAxis dataKey="libelle" tick={axe} interval="preserveStartEnd" minTickGap={18} />
        <YAxis tick={axe} tickFormatter={formatAxe} width={52} domain={["auto", "auto"]} />
        <Tooltip
          formatter={(v: unknown, nom: string) =>
            Array.isArray(v) ? [`${nombre(v[0])} à ${nombre(v[1])} FCFA/kg`, nom] : [formatInfo(v), nom]
          }
        />
        {Legende}
        <Area type="linear" dataKey="bande" name="Intervalle de confiance à 95 %" stroke="none" fill={COULEURS.ciel} fillOpacity={0.45} isAnimationActive={false} />
        <Line type="linear" dataKey="prix" name="Prix observés" stroke={COULEURS.marine} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
        <Line type="linear" dataKey="prevision" name="Prévision" stroke={COULEURS.bleu} strokeWidth={2.5} strokeDasharray="6 4" dot={{ r: 3 }} connectNulls isAnimationActive={false} />
      </ComposedChart>
    </Cadre>
  );
};

/** Prix d'un marché (ou moyenne des cinq) avec moyenne mobile sur trois mois. */
export const GraphiquePrix: React.FC<{ donnees: { libelle: string; prix: number | null; moyenne_mobile_3: number | null }[] }> = ({ donnees }) => (
  <Cadre>
    <LineChart data={donnees} margin={marges}>
      <CartesianGrid stroke="#E5E9F0" vertical={false} />
      <XAxis dataKey="libelle" tick={axe} interval="preserveStartEnd" minTickGap={18} />
      <YAxis tick={axe} tickFormatter={formatAxe} width={52} domain={["auto", "auto"]} />
      <Tooltip formatter={(v: unknown, nom: string) => [formatInfo(v), nom]} />
      {Legende}
      <Line type="linear" dataKey="prix" name="Prix observé" stroke={COULEURS.marine} strokeWidth={2.5} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
      <Line type="linear" dataKey="moyenne_mobile_3" name="Moyenne mobile sur 3 mois" stroke={COULEURS.bleu} strokeWidth={2} strokeDasharray="6 4" dot={false} connectNulls isAnimationActive={false} />
    </LineChart>
  </Cadre>
);

export const GraphiqueBarres: React.FC<{ donnees: Record<string, string | number | null>[]; cle: string; nom: string; categorie: string; hauteur?: number }> = ({
  donnees,
  cle,
  nom,
  categorie,
  hauteur = 260,
}) => (
  <Cadre hauteur={hauteur}>
    <BarChart data={donnees} margin={marges}>
      <CartesianGrid stroke="#E5E9F0" vertical={false} />
      <XAxis dataKey={categorie} tick={axe} interval={categorie === "libelle" ? "preserveStartEnd" : 0} minTickGap={18} />
      <YAxis tick={axe} tickFormatter={formatAxe} width={52} />
      <Tooltip formatter={(v: unknown) => [formatInfo(v), nom]} />
      <Bar dataKey={cle} name={nom} fill={COULEURS.bleu} radius={[3, 3, 0, 0]} isAnimationActive={false} />
    </BarChart>
  </Cadre>
);
