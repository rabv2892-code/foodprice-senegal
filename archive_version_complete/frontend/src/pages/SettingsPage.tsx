import React, { useState } from "react";
import { CheckCircle2, Globe2, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useGlobalFilters } from "../context/FilterContext";
import { DEFAULT_SOURCE_KEY, SOURCE_CHOICES } from "../lib/sources";
import { fmtDate } from "../lib/fr";
import { formatNumber } from "../api/client";
import type { SourceId } from "../types";

const Row: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 py-2.5 text-sm last:border-0">
    <span className="text-slate-600">{label}</span>
    <span className="font-semibold text-navy-900">{value}</span>
  </div>
);

export const SettingsPage: React.FC = () => {
  const { filters, setSource, resetFilters } = useGlobalFilters();
  const [saved, setSaved] = useState<string | null>(null);
  const [defaultSource, setDefaultSource] = useState<SourceId>(() => {
    try {
      return (window.localStorage.getItem(DEFAULT_SOURCE_KEY) as SourceId) || "wfp";
    } catch {
      return "wfp";
    }
  });

  const save = (id: SourceId) => {
    setDefaultSource(id);
    try {
      window.localStorage.setItem(DEFAULT_SOURCE_KEY, id);
      setSaved("Préférence enregistrée : cette source sera utilisée au prochain démarrage.");
    } catch {
      setSaved("Impossible d'enregistrer la préférence dans ce navigateur.");
    }
  };

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-navy-900">
          <Globe2 className="h-4 w-4 text-emerald-600" />
          Langue et formats d'affichage
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          FOODPRICE SENEGAL est exclusivement en français. Ces formats s'appliquent à toutes les pages, aux graphiques et aux exportations.
        </p>
        <Row label="Langue de l'interface" value="Français" />
        <Row label="Format des dates" value={`JJ/MM/AAAA (exemple : ${fmtDate("2026-03-15")})`} />
        <Row label="Format des nombres" value={`Séparateur décimal « , » (exemple : ${formatNumber(1234.5, 1)})`} />
        <Row label="Devise des prix" value="FCFA (franc CFA), unité FCFA/kg" />
        <Row label="Période officielle d'analyse" value="01/01/2025 → 31/12/2026" />
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-navy-900">
          <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
          Préférences de travail
        </h3>
        <p className="mb-3 text-xs text-slate-500">
          Choisissez la source de données utilisée par défaut à l'ouverture du logiciel.
        </p>
        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500" htmlFor="source-defaut">
          Source par défaut
        </label>
        <select
          id="source-defaut"
          aria-label="Source par défaut"
          value={defaultSource}
          onChange={(e) => save(e.target.value as SourceId)}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        >
          {SOURCE_CHOICES.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        {saved && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-emerald-700" role="status">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {saved}
          </p>
        )}

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="mb-2 text-xs text-slate-500">Source actuellement active : <strong className="text-navy-900">{SOURCE_CHOICES.find((s) => s.id === filters.source)?.label}</strong></p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSource(defaultSource)}
              className="rounded-lg bg-navy-900 px-3 py-2 text-xs font-bold text-white hover:bg-navy-800"
            >
              Appliquer la source par défaut
            </button>
            <button
              type="button"
              onClick={resetFilters}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Réinitialiser les filtres
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default SettingsPage;
