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
import { Check, GitCompare } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { useGlobalFilters } from "../context/FilterContext";
import { fmtLabel, fmtMonth } from "../lib/fr";

const COLORS = ["#0B192C", "#10B981", "#EF4444", "#0EA5E9", "#F59E0B", "#8B5CF6", "#EC4899", "#14B8A6"];

export const MarketComparePage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [selectedMarkets, setSelectedMarkets] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Reset manual selection when source changes
  useEffect(() => {
    setSelectedMarkets([]);
  }, [filters.source, filters.commodity]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getMarketsComparison({
        source: filters.source,
        markets: selectedMarkets.length ? selectedMarkets : undefined,
        commodity: filters.commodity,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      .then((res) => {
        if (!active) return;
        setData(res);
        if (selectedMarkets.length === 0 && res?.selected_markets?.length) {
          setSelectedMarkets(res.selected_markets);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters.source, filters.commodity, filters.date_from, filters.date_to, selectedMarkets.join("|")]);

  const toggleMarket = (mkt: string) => {
    setSelectedMarkets((prev) => {
      if (prev.includes(mkt)) {
        return prev.length > 1 ? prev.filter((x) => x !== mkt) : prev;
      }
      if (prev.length >= 8) return [...prev.slice(1), mkt];
      return [...prev, mkt];
    });
  };

  const unit = data?.meta?.unit ?? "FCFA/kg";
  const corrCols: string[] = data?.selected_markets ?? [];
  const corrMap = new Map<string, number | null>();
  (data?.correlation ?? []).forEach((c: any) => corrMap.set(`${c.x}||${c.y}`, c.r));

  return (
    <div className="space-y-5">
      <FilterBar hideRegion hideMarket hideCategory />
      <DataNatureBadge meta={data?.meta} />

      {/* Interactive multi-market selector */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-navy-900">
            <GitCompare className="h-4 w-4 text-emerald-600" />
            <span>Sélectionner jusqu'à 8 marchés à comparer ({selectedMarkets.length}/8)</span>
          </div>
          <span className="text-[11px] text-slate-500">Cliquez pour activer / désactiver un marché</span>
        </div>
        <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto pt-1">
          {(data?.available_markets ?? []).map((mkt: string) => {
            const active = selectedMarkets.includes(mkt);
            return (
              <button
                key={mkt}
                type="button"
                onClick={() => toggleMarket(mkt)}
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition ${
                  active
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                }`}
              >
                {active && <Check className="h-3 w-3 text-emerald-400" />}
                {mkt}
              </button>
            );
          })}
        </div>
      </div>

      {loading && !data ? (
        <div className="h-80 animate-pulse rounded-xl bg-slate-200/70" />
      ) : (
        <div className="space-y-5">
          <ChartCard
            title="Comparaison synchronisée des courbes de prix entre marchés"
            subtitle={`Évolution mensuelle comparée (${unit})`}
          >
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data?.series ?? []} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} minTickGap={26} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip labelFormatter={fmtLabel}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} ${unit}`, n]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  {(data?.selected_markets ?? []).map((mkt: string, idx: number) => (
                    <Line
                      key={mkt}
                      type="monotone"
                      dataKey={mkt}
                      stroke={COLORS[idx % COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <ChartCard
              title="Statistiques comparées des marchés sélectionnés"
              subtitle={`Dispersions et niveaux de prix (${unit})`}
              className="lg:col-span-7"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-navy-900 text-left text-[11px] font-semibold uppercase text-white">
                    <tr>
                      <th className="px-3 py-2">Marché</th>
                      <th className="px-3 py-2">Région</th>
                      <th className="px-3 py-2 text-right">Obs.</th>
                      <th className="px-3 py-2 text-right">Moyenne</th>
                      <th className="px-3 py-2 text-right">Médiane</th>
                      <th className="px-3 py-2 text-right">CV (%)</th>
                      <th className="px-3 py-2 text-right">Dernier prix</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.summary ?? []).map((row: any) => (
                      <tr key={row.market} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-navy-900">{row.market}</td>
                        <td className="px-3 py-2 text-slate-600">{row.region}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(row.observations)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatNumber(row.mean, 1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(row.median, 1)}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(row.cv_pct, 1)} %</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-sky-700">
                          {formatNumber(row.latest_price, 1)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Co-mouvement entre marchés (Corrélation de Pearson)"
              subtitle="Intégration spatiale des marchés (r proche de 1 = transmission forte)"
              className="lg:col-span-5"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full border-collapse text-[11px]">
                  <thead>
                    <tr>
                      <th className="border border-slate-200 bg-slate-50 p-1.5 text-left">Marché</th>
                      {corrCols.map((c) => (
                        <th key={c} className="border border-slate-200 bg-slate-50 p-1.5 text-center truncate max-w-[75px]">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {corrCols.map((rM) => (
                      <tr key={rM}>
                        <td className="border border-slate-200 bg-slate-50 p-1.5 font-semibold text-navy-900">{rM}</td>
                        {corrCols.map((cM) => {
                          const r = corrMap.get(`${rM}||${cM}`);
                          const cls =
                            r == null
                              ? "bg-slate-50 text-slate-400"
                              : r >= 0.75
                              ? "bg-emerald-600 text-white"
                              : r >= 0.45
                              ? "bg-emerald-100 text-emerald-900"
                              : "bg-slate-50 text-slate-700";
                          return (
                            <td key={cM} className={`border border-slate-200 p-1.5 text-center font-mono font-bold ${cls}`}>
                              {r != null ? formatNumber(r, 2) : "—"}
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
        </div>
      )}
    </div>
  );
};
