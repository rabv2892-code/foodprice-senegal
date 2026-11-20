import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, ArrowDownRight, ArrowUpRight, Compass, MapPin } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { KpiCard } from "../components/KpiCard";
import { SenegalMap } from "../components/SenegalMap";
import { useGlobalFilters } from "../context/FilterContext";
import type { GeoAnalysisResponse } from "../types";
import { fmtLabel } from "../lib/fr";

export const GeographyPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [data, setData] = useState<GeoAnalysisResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMarket, setSelectedMarket] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getGeoAnalysis({
        source: filters.source,
        commodity: filters.commodity,
        year: filters.year,
        date_from: filters.date_from,
        date_to: filters.date_to,
      })
      .then((res) => {
        if (active) {
          setData(res);
          setSelectedMarket(null);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filters.source, filters.commodity, filters.year, filters.date_from, filters.date_to]);

  const unit = data?.meta.unit ?? "FCFA/kg";
  const s = data?.summary;

  return (
    <div className="space-y-5">
      <FilterBar hideRegion hideMarket hideCategory />
      <DataNatureBadge meta={data?.meta} />

      {loading && !data ? (
        <div className="h-96 animate-pulse rounded-xl bg-slate-200/70" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              title="Région la plus chère"
              value={s?.most_expensive_region ?? "—"}
              subtitle={`Moyenne : ${formatNumber(s?.most_expensive_region_mean, 1)} ${unit}`}
              icon={ArrowUpRight}
              tone="crimson"
            />
            <KpiCard
              title="Région la plus abordable"
              value={s?.cheapest_region ?? "—"}
              subtitle={`Moyenne : ${formatNumber(s?.cheapest_region_mean, 1)} ${unit}`}
              icon={ArrowDownRight}
              tone="emerald"
            />
            <KpiCard
              title="Écart inter-régional"
              value={`${formatNumber(s?.regional_spread, 1)} ${unit}`}
              subtitle={`Moyenne nationale : ${formatNumber(s?.national_mean, 1)} ${unit}`}
              icon={Compass}
              tone="amber"
            />
            <KpiCard
              title="Écart entre marchés"
              value={s?.market_spread != null ? `${formatNumber(s.market_spread, 1)} ${unit}` : "N/A (CSA)"}
              subtitle={`${formatNumber(s?.markets_with_coords)} marchés géolocalisés`}
              icon={MapPin}
              tone="navy"
            />
          </div>

          {data?.has_coordinates ? (
            <SenegalMap
              markets={data.markets}
              unit={unit}
              nationalMean={s?.national_mean}
              selectedMarket={selectedMarket}
              onSelectMarket={setSelectedMarket}
            />
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
              <div>
                <p className="font-bold">Coordonnées GPS absentes dans BASE_BULLETIN (PRIX_kg_CONS_CSA)</p>
                <p className="mt-1">
                  Conformément aux exigences d'intégrité scientifique, aucune coordonnée fictive n'est générée. Les données CSA
                  fournissent des moyennes régionales complètes (voir classement régional ci-dessous). Sélectionnez PAM ou Temps réel
                  pour afficher les 64 marchés géolocalisés.
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <ChartCard
              title="Comparaison des régions (% d'écart par rapport à la moyenne nationale)"
              subtitle={`Moyenne nationale de référence : ${formatNumber(s?.national_mean, 1)} ${unit}`}
              className="lg:col-span-6"
            >
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data?.regions ?? []}
                    layout="vertical"
                    margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                    <XAxis type="number" unit="%" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="region" width={105} tick={{ fontSize: 11 }} />
                    <ReferenceLine x={0} stroke="#0F2342" />
                    <Tooltip labelFormatter={fmtLabel}
                      formatter={(v: any) => [`${Number(v) > 0 ? "+" : ""}${formatNumber(Number(v), 1)} %`, "Écart"]}
                    />
                    <Bar dataKey="gap_vs_national_pct" name="Écart par rapport au national (%)" radius={[3, 3, 3, 3]}>
                      {(data?.regions ?? []).map((r) => (
                        <Cell key={r.region} fill={r.gap_vs_national_pct > 0 ? "#EF4444" : "#10B981"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard
              title="Tableau comparatif des 14 régions"
              subtitle={`Prix moyen, médian et amplitude spatiale (${unit})`}
              className="lg:col-span-6"
            >
              <div className="max-h-[340px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="sticky top-0 bg-navy-900 text-left text-[11px] font-semibold uppercase text-white">
                    <tr>
                      <th className="px-3 py-2">Région</th>
                      <th className="px-3 py-2 text-right">Obs.</th>
                      <th className="px-3 py-2 text-right">Moyenne</th>
                      <th className="px-3 py-2 text-right">Minimum – Maximum</th>
                      <th className="px-3 py-2 text-right">Écart / Nat.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data?.regions ?? []).map((r) => (
                      <tr key={r.region} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-bold text-navy-900">{r.region}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(r.observations)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatNumber(r.mean, 1)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-500">
                          {formatNumber(r.min)} – {formatNumber(r.max)}
                        </td>
                        <td
                          className={`px-3 py-2 text-right font-mono font-bold ${
                            r.gap_vs_national_pct > 0 ? "text-crimson-600" : "text-emerald-600"
                          }`}
                        >
                          {r.gap_vs_national_pct > 0 ? "+" : ""}
                          {formatNumber(r.gap_vs_national_pct, 1)} %
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            {data?.has_coordinates && (
              <>
                <ChartCard
                  title="Les 10 marchés aux prix les plus élevés"
                  subtitle={`Zones de tension tarifaire (${unit})`}
                  className="lg:col-span-6"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-red-50 text-left text-[11px] font-bold text-red-900">
                        <tr>
                          <th className="px-3 py-2">Marché</th>
                          <th className="px-3 py-2">Région</th>
                          <th className="px-3 py-2 text-right">Moyenne</th>
                          <th className="px-3 py-2 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.most_expensive_markets.map((m) => (
                          <tr
                            key={m.market}
                            onClick={() => setSelectedMarket(m.market)}
                            className="cursor-pointer hover:bg-red-50/40"
                          >
                            <td className="px-3 py-2 font-bold text-navy-900">{m.market}</td>
                            <td className="px-3 py-2 text-slate-600">{m.region}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-crimson-600">
                              {formatNumber(m.mean, 1)} {unit}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-crimson-600">
                              +{formatNumber(m.gap_vs_national_pct, 1)} %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>

                <ChartCard
                  title="Les 10 marchés aux prix les plus bas"
                  subtitle={`Zones de production ou d'offre excédentaire (${unit})`}
                  className="lg:col-span-6"
                >
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                      <thead className="bg-emerald-50 text-left text-[11px] font-bold text-emerald-900">
                        <tr>
                          <th className="px-3 py-2">Marché</th>
                          <th className="px-3 py-2">Région</th>
                          <th className="px-3 py-2 text-right">Moyenne</th>
                          <th className="px-3 py-2 text-right">Écart</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.cheapest_markets.map((m) => (
                          <tr
                            key={m.market}
                            onClick={() => setSelectedMarket(m.market)}
                            className="cursor-pointer hover:bg-emerald-50/40"
                          >
                            <td className="px-3 py-2 font-bold text-navy-900">{m.market}</td>
                            <td className="px-3 py-2 text-slate-600">{m.region}</td>
                            <td className="px-3 py-2 text-right font-mono font-bold text-emerald-600">
                              {formatNumber(m.mean, 1)} {unit}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-emerald-600">
                              {formatNumber(m.gap_vs_national_pct, 1)} %
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
};
