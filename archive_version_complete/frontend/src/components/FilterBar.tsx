import React from "react";
import { CalendarRange, Filter, RotateCcw } from "lucide-react";
import { useGlobalFilters } from "../context/FilterContext";
import type { SourceId } from "../types";

interface FilterBarProps {
  hideRegion?: boolean;
  hideMarket?: boolean;
  hideCategory?: boolean;
  hideDates?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  hideRegion = false,
  hideMarket = false,
  hideCategory = false,
  hideDates = false,
}) => {
  const { filters, options, updateFilter, setSource, resetFilters } = useGlobalFilters();

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-900">
            <Filter className="h-4 w-4 text-emerald-600" />
            <span>Filtres globaux interactifs</span>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
            <CalendarRange className="h-3 w-3" />
            janvier 2025 – décembre 2026
          </span>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-navy-900"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </button>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {/* Source */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Source de données
          </label>
          <select
            aria-label="Source de données"
            value={filters.source}
            onChange={(e) => setSource(e.target.value as SourceId)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-medium text-navy-900 focus:border-navy-700 focus:bg-white focus:outline-none"
          >
            {(options?.sources ?? [
              { id: "wfp", label: "PAM Sénégal (Observé, 01/2025 – 03/2026)" },
              { id: "rt_observed", label: "Temps réel Sénégal (Relevés directs, 01/2025 – 05/2026)" },
              { id: "rt_model", label: "Temps réel Sénégal (Estimations modélisées, 01/2025 – 05/2026)" },
              { id: "csa", label: "BASE_BULLETIN — CSA Régional (0 obs. en 2025–2026)" },
            ]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </div>

        {/* Region */}
        {!hideRegion && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Région
            </label>
            <select
              aria-label="Région"
              value={filters.region}
              onChange={(e) => updateFilter("region", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
            >
              <option value="ALL">Toutes les régions ({options?.regions.length ?? 14})</option>
              {(options?.regions ?? []).map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Market */}
        {!hideMarket && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Marché
            </label>
            <select
              aria-label="Marché"
              value={filters.market}
              onChange={(e) => updateFilter("market", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
            >
              <option value="ALL">Tous les marchés ({options?.markets.length ?? 0})</option>
              {(options?.markets ?? []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category */}
        {!hideCategory && (
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Catégorie
            </label>
            <select
              aria-label="Catégorie"
              value={filters.category}
              onChange={(e) => updateFilter("category", e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
            >
              <option value="ALL">Toutes catégories</option>
              {(options?.categories ?? []).map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Product */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Produit
          </label>
          <select
            aria-label="Produit"
            value={filters.commodity}
            onChange={(e) => updateFilter("commodity", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
          >
            <option value="ALL">Tous les produits ({options?.commodities.length ?? 0})</option>
            {(options?.commodities ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Year strictly limited to 2025 & 2026 */}
        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Année (2025–2026)
          </label>
          <select
            aria-label="Année"
            value={filters.year}
            onChange={(e) => updateFilter("year", e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
          >
            <option value="">2025 et 2026</option>
            {(options?.years ?? [2025, 2026])
              .filter((y) => y === 2025 || y === 2026)
              .slice()
              .reverse()
              .map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
          </select>
        </div>

        {/* Date range clamped to 2025-01-01 .. 2026-12-31 */}
        {!hideDates && (
          <>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Période — Début (≥ 2025)
              </label>
              <input
                type="date"
                aria-label="Date de début"
                value={filters.date_from}
                min={options?.min_date ?? "2025-01-01"}
                max={options?.max_date ?? "2026-12-31"}
                onChange={(e) => {
                  updateFilter("year", "");
                  updateFilter("date_from", e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Période — Fin (≤ 2026)
              </label>
              <input
                type="date"
                aria-label="Date de fin"
                value={filters.date_to}
                min={options?.min_date ?? "2025-01-01"}
                max={options?.max_date ?? "2026-12-31"}
                onChange={(e) => {
                  updateFilter("year", "");
                  updateFilter("date_to", e.target.value);
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
