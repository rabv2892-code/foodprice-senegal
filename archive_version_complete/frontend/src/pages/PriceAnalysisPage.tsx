import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, ArrowUpDown, Calendar, TrendingDown, TrendingUp } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { KpiCard } from "../components/KpiCard";
import { useGlobalFilters } from "../context/FilterContext";
import { fmtDate, fmtLabel, fmtMonth } from "../lib/fr";

export const PriceAnalysisPage: React.FC = () => {
  const { filters, options, updateFilter } = useGlobalFilters();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const selectedCommodity =
    filters.commodity !== "ALL"
      ? filters.commodity
      : options?.commodities[0] ?? undefined;

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getPriceAnalysis({
        source: filters.source,
        commodity: selectedCommodity,
        region: filters.region,
        market: filters.market,
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
  }, [filters.source, selectedCommodity, filters.region, filters.market, filters.date_from, filters.date_to]);

  const m = data?.metrics;
  const unit = m?.unit ?? data?.meta?.unit ?? "FCFA/kg";
  const isRt = filters.source === "rt_observed" || filters.source === "rt_model";

  return (
    <div className="space-y-5">
      <FilterBar hideCategory />
      <DataNatureBadge meta={data?.meta} />

      {/* Product Selector Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-card">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Produit analysé en détail
          </span>
          <h3 className="text-base font-extrabold text-navy-900">{data?.commodity ?? selectedCommodity ?? "—"}</h3>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(options?.commodities ?? []).map((comm) => (
            <button
              key={comm}
              type="button"
              onClick={() => updateFilter("commodity", comm)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${
                (data?.commodity ?? selectedCommodity) === comm
                  ? "bg-navy-900 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {comm}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-200/70" />
      ) : !m ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          Aucune série disponible pour cette sélection.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              title="Prix moyen historique"
              value={`${formatNumber(m.mean, 1)} ${unit}`}
              subtitle={`Médiane : ${formatNumber(m.median, 1)} | Q1–Q3 : ${formatNumber(m.q25)}–${formatNumber(m.q75)}`}
              icon={Activity}
              tone="navy"
            />
            <KpiCard
              title="Dernier prix moyen mensuel"
              value={`${formatNumber(m.latest_mean_price, 1)} ${unit}`}
              subtitle={`Relevé : ${fmtDate(m.last_date)}`}
              icon={Calendar}
              tone="sky"
            />
            <KpiCard
              title="Variation mensuelle"
              value={m.monthly_variation_pct != null ? `${m.monthly_variation_pct > 0 ? "+" : ""}${formatNumber(m.monthly_variation_pct, 2)} %` : "—"}
              subtitle="Dernier mois par rapport au mois précédent"
              icon={(m.monthly_variation_pct ?? 0) >= 0 ? TrendingUp : TrendingDown}
              tone={(m.monthly_variation_pct ?? 0) > 0 ? "crimson" : "emerald"}
            />
            <KpiCard
              title="Variation annuelle (2026 / 2025)"
              value={m.annual_variation_pct != null ? `${m.annual_variation_pct > 0 ? "+" : ""}${formatNumber(m.annual_variation_pct, 2)} %` : "—"}
              subtitle="Mois 2026 par rapport au même mois 2025"
              icon={(m.annual_variation_pct ?? 0) >= 0 ? TrendingUp : TrendingDown}
              tone={(m.annual_variation_pct ?? 0) > 0 ? "crimson" : "emerald"}
            />
            <KpiCard
              title="Amplitude Minimum — Maximum"
              value={`${formatNumber(m.min)} – ${formatNumber(m.max)}`}
              subtitle={`${formatNumber(m.count)} observations (depuis le ${fmtDate(m.first_date)})`}
              icon={ArrowUpDown}
              tone="amber"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Main Price Trajectory */}
            <ChartCard
              title={`Trajectoire mensuelle — ${data.commodity}`}
              subtitle={`Moyenne, médiane et bornes minimum/maximum observées (${unit})`}
              className="lg:col-span-8"
            >
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={28} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                    <Tooltip labelFormatter={fmtLabel}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} ${unit}`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="mean" name="Prix moyen" stroke="#0B192C" strokeWidth={2.4} dot={false} />
                    <Line type="monotone" dataKey="median" name="Médiane" stroke="#10B981" strokeWidth={1.8} dot={false} />
                    <Line type="monotone" dataKey="min" name="Minimum" stroke="#0EA5E9" strokeWidth={1.1} strokeDasharray="3 3" dot={false} />
                    <Line type="monotone" dataKey="max" name="Maximum" stroke="#EF4444" strokeWidth={1.1} strokeDasharray="3 3" dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* MoM & annuel Variations */}
            <ChartCard
              title="Dynamique de la variation annuelle (%)"
              subtitle="Hausse (>0, rouge) ou détente (<0, vert)"
              className="lg:col-span-4"
            >
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.series} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 10.5, fill: "#64748B" }} minTickGap={30} />
                    <YAxis tick={{ fontSize: 11, fill: "#64748B" }} unit="%" />
                    <ReferenceLine y={0} stroke="#0F2342" />
                    <Tooltip labelFormatter={fmtLabel}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} %`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="yoy_pct" name="Variation annuelle (%)" stroke="#EF4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="mom_pct" name="Variation mensuelle (%)" stroke="#0EA5E9" strokeWidth={1.3} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Temps réel estimations modélisées & Trust Chart if applicable */}
            {isRt && (
              <ChartCard
                title="Indicateurs Temps réel : Enveloppe ouverture / haut / bas / clôture & Indice de confiance"
                subtitle="O/H/B/C = estimations modélisées d'ouverture, haut, bas et clôture, distinctes des relevés directs"
                className="lg:col-span-12"
              >
                <div className="h-[290px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={25} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "#64748B" }} />
                      <YAxis yAxisId="right" orientation="right" domain={[0, 10]} tick={{ fontSize: 11, fill: "#10B981" }} />
                      <Tooltip labelFormatter={fmtLabel} contentStyle={{ borderRadius: 10, fontSize: 12 }} />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Line yAxisId="left" type="monotone" dataKey="high" name="Haut (H)" stroke="#EF4444" dot={false} strokeDasharray="3 3" />
                      <Line yAxisId="left" type="monotone" dataKey="close" name="Clôture (C)" stroke="#0F2342" strokeWidth={2} dot={false} />
                      <Line yAxisId="left" type="monotone" dataKey="low" name="Bas (B)" stroke="#0EA5E9" dot={false} strokeDasharray="3 3" />
                      <Line yAxisId="right" type="monotone" dataKey="trust_score" name="Indice de confiance (/10)" stroke="#10B981" strokeWidth={1.8} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </ChartCard>
            )}

            {/* By Region */}
            <ChartCard
              title={`Prix moyen par région — ${data.commodity}`}
              subtitle={`Comparaison spatiale (${unit})`}
              className="lg:col-span-6"
            >
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.by_region} margin={{ top: 8, right: 12, left: 0, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="region" angle={-28} textAnchor="end" interval={0} tick={{ fontSize: 10.5 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={fmtLabel} formatter={(v: any) => [`${formatNumber(Number(v), 1)} ${unit}`, "Prix"]} />
                    <Bar dataKey="mean" name="Moyenne" fill="#0F2342" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="median" name="Médiane" fill="#10B981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* By Market Table */}
            <ChartCard
              title={`Classement des marchés — ${data.commodity}`}
              subtitle="Statistiques détaillées par marché"
              className="lg:col-span-6"
            >
              <div className="max-h-[300px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="sticky top-0 bg-slate-100 text-left text-[11px] font-bold text-slate-700">
                    <tr>
                      <th className="px-3 py-2">Marché</th>
                      <th className="px-3 py-2">Région</th>
                      <th className="px-3 py-2 text-right">Obs.</th>
                      <th className="px-3 py-2 text-right">Moyenne</th>
                      <th className="px-3 py-2 text-right">Minimum / Maximum</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.by_market.map((row: any) => (
                      <tr key={row.market} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-semibold text-navy-900">{row.market}</td>
                        <td className="px-3 py-2 text-slate-600">{row.region}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(row.count)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-navy-900">
                          {formatNumber(row.mean, 1)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {formatNumber(row.min)} – {formatNumber(row.max)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
