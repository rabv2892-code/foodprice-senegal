import React, { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Download, FileSpreadsheet, Search } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { useGlobalFilters } from "../context/FilterContext";
import type { ExplorerResponse } from "../types";
import { fmtDate } from "../lib/fr";

export const ExplorerPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [data, setData] = useState<ExplorerResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 280);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [filters]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getExplorer(filters, page, pageSize, debouncedSearch)
      .then((res) => {
        if (active) setData(res);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters, page, pageSize, debouncedSearch]);

  const isRt = filters.source === "rt_observed" || filters.source === "rt_model";
  const isWfp = filters.source === "wfp";

  return (
    <div className="space-y-5">
      <FilterBar />
      <DataNatureBadge meta={data?.meta} />

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un marché, région, produit ou date (ex : 06/2025 ou 15/02/2026)..."
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-800 focus:border-navy-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              aria-label="Lignes par page"
              className="rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-medium text-slate-700"
            >
              {[25, 50, 100, 200].map((s) => (
                <option key={s} value={s}>
                  {s} lignes / page
                </option>
              ))}
            </select>

            <a
              href={api.csvExportUrl(filters)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-navy-800 bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800"
            >
              <Download className="h-3.5 w-3.5 text-emerald-400" />
              Exporter CSV filtré
            </a>
            <a
              href={api.excelExportUrl({
                source: filters.source,
                region: filters.region,
                market: filters.market,
                commodity: filters.commodity,
                year: filters.year,
              })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-600 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Exporter Excel
            </a>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
          <span>
            <strong className="text-navy-900">{formatNumber(data?.total)}</strong> enregistrements correspondants
          </span>
          <span>
            Page {data?.page ?? 1} sur {data?.total_pages ?? 1}
          </span>
        </div>

        {error && (
          <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <div className="mt-3 overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-navy-900 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
              <tr>
                <th className="px-3 py-2.5">Date</th>
                <th className="px-3 py-2.5">Région</th>
                <th className="px-3 py-2.5">Marché</th>
                <th className="px-3 py-2.5">Produit</th>
                <th className="px-3 py-2.5">Stade / Type</th>
                <th className="px-3 py-2.5 text-right">Prix ({data?.meta.unit ?? "FCFA/kg"})</th>
                {isWfp && <th className="px-3 py-2.5 text-right">Prix USD</th>}
                {isRt && (
                  <>
                    <th className="px-3 py-2.5 text-right">Ouverture / Haut / Bas / Clôture</th>
                    <th className="px-3 py-2.5 text-right">Inflation sur un an</th>
                    <th className="px-3 py-2.5 text-right">Confiance</th>
                  </>
                )}
                <th className="px-3 py-2.5 text-center">Anomalie 3×EIQ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Chargement des données...
                  </td>
                </tr>
              ) : !data || data.rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                    Aucun enregistrement trouvé pour ces critères.
                  </td>
                </tr>
              ) : (
                data.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/90">
                    <td className="px-3 py-2 font-mono text-slate-700 whitespace-nowrap">{fmtDate(String(row.date))}</td>
                    <td className="px-3 py-2 font-medium text-navy-900 whitespace-nowrap">{String(row.region)}</td>
                    <td className="px-3 py-2 text-slate-700 whitespace-nowrap">{String(row.market)}</td>
                    <td className="px-3 py-2 font-semibold text-slate-900">{String(row.commodity)}</td>
                    <td className="px-3 py-2 text-slate-600">{String(row.stage)}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold text-navy-900 tabular-nums">
                      {formatNumber(row.price as number, 1)}
                    </td>
                    {isWfp && (
                      <td className="px-3 py-2 text-right font-mono text-slate-600 tabular-nums">
                        {row.usdprice != null ? `$${formatNumber(row.usdprice as number, 2)}` : "—"}
                      </td>
                    )}
                    {isRt && (
                      <>
                        <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-600 whitespace-nowrap">
                          {formatNumber(row.open_price as number, 0)} / {formatNumber(row.high_price as number, 0)} /{" "}
                          {formatNumber(row.low_price as number, 0)} / {formatNumber(row.close_price as number, 0)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono font-semibold ${
                            Number(row.inflation_yoy_pct ?? 0) > 0 ? "text-crimson-600" : "text-emerald-600"
                          }`}
                        >
                          {row.inflation_yoy_pct != null ? `${formatNumber(row.inflation_yoy_pct as number, 1)} %` : "—"}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-700">
                          {row.trust_score != null ? formatNumber(row.trust_score as number, 1) : "—"}
                        </td>
                      </>
                    )}
                    <td className="px-3 py-2 text-center">
                      {row.is_outlier_iqr_30 ? (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-crimson-600">
                          Pic 3×EIQ
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="h-4 w-4" />
            Précédent
          </button>
          <span className="font-mono text-xs text-slate-600">
            Page {page} sur {data?.total_pages ?? 1}
          </span>
          <button
            type="button"
            disabled={!data || page >= data.total_pages}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50"
          >
            Suivant
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
