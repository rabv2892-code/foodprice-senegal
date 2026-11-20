import React, { useEffect, useState } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { useGlobalFilters } from "../context/FilterContext";
import { fmtLabel, fmtMonth } from "../lib/fr";

const PALETTE = ["#0B192C", "#10B981", "#EF4444", "#0EA5E9", "#F59E0B", "#8B5CF6"];

function corrColor(r: number | null): string {
  if (r === null) return "bg-slate-100 text-slate-400";
  if (r >= 0.8) return "bg-emerald-600 text-white";
  if (r >= 0.5) return "bg-emerald-100 text-emerald-900";
  if (r >= 0.2) return "bg-sky-50 text-sky-900";
  if (r <= -0.5) return "bg-red-500 text-white";
  if (r <= -0.2) return "bg-red-100 text-red-900";
  return "bg-slate-50 text-slate-700";
}

export const ProductsPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getProductsAnalysis({
        source: filters.source,
        region: filters.region,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      .then((res) => {
        if (active) setData(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters.source, filters.region, filters.date_from, filters.date_to]);

  const unit = data?.meta?.unit ?? "FCFA/kg";
  const corrCols: string[] = data?.correlation_commodities ?? [];
  const corrMap = new Map<string, { r: number | null; n_months: number }>();
  (data?.correlation_matrix ?? []).forEach((item: any) => {
    corrMap.set(`${item.x}||${item.y}`, { r: item.r, n_months: item.n_months });
  });

  return (
    <div className="space-y-5">
      <FilterBar hideMarket hideCategory />
      <DataNatureBadge meta={data?.meta} />

      {loading && !data ? (
        <div className="h-72 animate-pulse rounded-xl bg-slate-200/70" />
      ) : (
        <>
          <ChartCard
            title="Comparaison multi-produits dans le temps (6 premiers produits)"
            subtitle={`Évolution mensuelle comparée en ${unit}`}
          >
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.monthly_comparison ?? []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} minTickGap={28} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={fmtLabel}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} ${unit}`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {(data?.top_commodities ?? []).map((comm: string, idx: number) => (
                    <Line
                      key={comm}
                      type="monotone"
                      dataKey={comm}
                      stroke={PALETTE[idx % PALETTE.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <ChartCard
            title="Tableau analytique complet des produits"
            subtitle="Volatilité (CV%), dispersion et variation annuelle calculées sur la sélection"
          >
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs">
                <thead className="bg-navy-900 text-left text-[11px] font-semibold uppercase tracking-wider text-white">
                  <tr>
                    <th className="px-3 py-2.5">Produit</th>
                    <th className="px-3 py-2.5">Catégorie / Stade</th>
                    <th className="px-3 py-2.5 text-right">Obs.</th>
                    <th className="px-3 py-2.5 text-right">Mois</th>
                    <th className="px-3 py-2.5 text-right">Moyenne</th>
                    <th className="px-3 py-2.5 text-right">Médiane</th>
                    <th className="px-3 py-2.5 text-right">Minimum – Maximum</th>
                    <th className="px-3 py-2.5 text-right">CV (%)</th>
                    <th className="px-3 py-2.5 text-right">Dernier prix</th>
                    <th className="px-3 py-2.5 text-right">Var. annuelle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {(data?.products ?? []).map((p: any) => (
                    <tr key={p.commodity} className="hover:bg-slate-50">
                      <td className="px-3 py-2.5 font-bold text-navy-900">{p.commodity}</td>
                      <td className="px-3 py-2.5 text-slate-600">
                        {p.category} <span className="text-slate-400">({p.stage})</span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatNumber(p.observations)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatNumber(p.months_count)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-navy-900">
                        {formatNumber(p.mean, 1)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatNumber(p.median, 1)}</td>
                      <td className="px-3 py-2.5 text-right font-mono text-slate-500">
                        {formatNumber(p.min)} – {formatNumber(p.max)}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">{formatNumber(p.cv_pct, 1)} %</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-sky-700">
                        {formatNumber(p.latest_price, 1)} <span className="text-[10px] text-slate-400">({fmtMonth(p.latest_ym)})</span>
                      </td>
                      <td
                        className={`px-3 py-2.5 text-right font-mono font-bold ${
                          (p.yoy_last_pct ?? 0) > 0 ? "text-crimson-600" : "text-emerald-600"
                        }`}
                      >
                        {p.yoy_last_pct != null ? `${p.yoy_last_pct > 0 ? "+" : ""}${formatNumber(p.yoy_last_pct, 1)} %` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>

          {corrCols.length >= 2 && (
            <ChartCard
              title="Matrice de corrélation de Pearson inter-produits (2025–2026)"
              subtitle="Calculée sur les séries mensuelles moyennes (minimum 8 mois communs)"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 p-2 text-left text-navy-900">Produit</th>
                      {corrCols.map((c) => (
                        <th key={c} className="border border-slate-200 bg-slate-50 p-2 text-center font-semibold text-navy-900">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrCols.map((rowC) => (
                      <tr key={rowC}>
                        <td className="border border-slate-200 bg-slate-50 p-2 font-semibold text-navy-900 whitespace-nowrap">
                          {rowC}
                        </td>
                        {corrCols.map((colC) => {
                          const cell = corrMap.get(`${rowC}||${colC}`);
                          const r = cell?.r ?? null;
                          return (
                            <td
                              key={colC}
                              title={`r = ${r ?? "N/A"} (${cell?.n_months ?? 0} mois communs)`}
                              className={`border border-slate-200 p-2 text-center font-mono font-bold ${corrColor(r)}`}
                            >
                              {r !== null ? formatNumber(r, 2) : "—"}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          )}
        </>
      )}
    </div>
  );
};
