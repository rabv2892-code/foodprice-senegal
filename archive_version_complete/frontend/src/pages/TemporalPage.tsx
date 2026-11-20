import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
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

const MONTHS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"];

export const TemporalPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getTemporalAnalysis({
        source: filters.source,
        commodity: filters.commodity,
        region: filters.region,
        market: filters.market,
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
  }, [filters.source, filters.commodity, filters.region, filters.market]);

  const unit = data?.meta?.unit ?? "FCFA/kg";
  const heatmap: any[] = data?.heatmap ?? [];
  const allVals = heatmap.flatMap((row) =>
    MONTHS.map((_, i) => row[`m${i + 1}`]).filter((v): v is number => typeof v === "number")
  );
  const hMin = allVals.length ? Math.min(...allVals) : 0;
  const hMax = allVals.length ? Math.max(...allVals) : 1;

  const cellBg = (val: number | null | undefined) => {
    if (val == null) return "bg-slate-50 text-slate-300";
    const ratio = hMax > hMin ? (val - hMin) / (hMax - hMin) : 0.5;
    if (ratio >= 0.78) return "bg-red-600 text-white";
    if (ratio >= 0.58) return "bg-amber-400/80 text-navy-950";
    if (ratio >= 0.36) return "bg-sky-100 text-navy-900";
    return "bg-emerald-100 text-emerald-950";
  };

  return (
    <div className="space-y-5">
      <FilterBar hideCategory hideDates />
      <DataNatureBadge meta={data?.meta} />

      {loading && !data ? (
        <div className="h-80 animate-pulse rounded-xl bg-slate-200/70" />
      ) : (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Rolling 6m trend */}
            <ChartCard
              title="Tendance mensuelle et moyenne mobile sur 6 mois (2025–2026)"
              subtitle={`Lissage tendanciel sans inventer de mois manquants (${unit})`}
              className="lg:col-span-7"
            >
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={data?.monthly_series ?? []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} minTickGap={26} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={fmtLabel}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} ${unit}`, n]}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line type="monotone" dataKey="mean" name="Moyenne mensuelle" stroke="#0EA5E9" strokeWidth={1.6} dot={false} />
                    <Line type="monotone" dataKey="rolling_12m" name="Moyenne mobile 6 mois" stroke="#0B192C" strokeWidth={2.6} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Annual annuel */}
            <ChartCard
              title="Évolution annuelle et glissement interannuel (%)"
              subtitle="Variation moyenne d'une année sur l'autre"
              className="lg:col-span-5"
            >
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data?.annual ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 15 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} unit="%" />
                    <ReferenceLine y={0} stroke="#0F2342" />
                    <Tooltip labelFormatter={fmtLabel}
                      contentStyle={{ borderRadius: 10, fontSize: 12 }}
                      formatter={(v: any) => [`${Number(v) > 0 ? "+" : ""}${formatNumber(Number(v), 1)} %`, "Var. annuelle"]}
                    />
                    <Bar dataKey="yoy_pct" name="Glissement annuel (%)" radius={[4, 4, 0, 0]}>
                      {(data?.annual ?? []).map((row: any) => (
                        <Cell key={row.year} fill={(row.yoy_pct ?? 0) > 0 ? "#EF4444" : "#10B981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Year x Month Heatmap */}
          <ChartCard
            title="Matrice thermique Année × Mois (Saisonnalité historique)"
            subtitle={`Lecture rapide des chocs annuels et des tensions saisonnières de soudure (${unit})`}
          >
            <div className="overflow-x-auto">
              <table className="min-w-full border-collapse text-[11px]">
                <thead>
                  <tr>
                    <th className="border border-slate-200 bg-navy-900 px-3 py-2 text-left text-white">Année</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="border border-slate-200 bg-navy-900 px-2 py-2 text-center text-white">
                        {m}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {heatmap.map((row) => (
                    <tr key={row.year}>
                      <td className="border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono font-bold text-navy-900">
                        {row.year}
                      </td>
                      {MONTHS.map((_, idx) => {
                        const val = row[`m${idx + 1}`] as number | null | undefined;
                        return (
                          <td
                            key={idx}
                            className={`border border-slate-200 px-2 py-1.5 text-center font-mono font-semibold tabular-nums ${cellBg(val)}`}
                          >
                            {val != null ? formatNumber(val, 0) : "—"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </ChartCard>
        </div>
      )}
    </div>
  );
};
