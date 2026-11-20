import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, BarChart3, CheckCircle2, Sigma } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { KpiCard } from "../components/KpiCard";
import { useGlobalFilters } from "../context/FilterContext";
import { fmtDate, fmtLabel } from "../lib/fr";

interface BoxplotItem {
  group: string;
  count: number;
  min: number;
  whisker_low: number;
  q25: number;
  median: number;
  mean: number;
  q75: number;
  whisker_high: number;
  max: number;
  iqr: number;
  outliers_count: number;
}

const BoxplotDiagram: React.FC<{ items: BoxplotItem[]; unit: string }> = ({ items, unit }) => {
  if (!items.length) return <p className="text-xs text-slate-500">Effectifs insuffisants pour tracer les boîtes à moustaches.</p>;

  const globalMin = Math.min(...items.map((b) => b.whisker_low));
  const globalMax = Math.max(...items.map((b) => b.whisker_high));
  const span = Math.max(1e-6, globalMax - globalMin);
  const toPct = (v: number) => ((v - globalMin) / span) * 100;

  return (
    <div className="space-y-3">
      <div className="flex justify-between font-mono text-[10px] text-slate-500">
        <span>{formatNumber(globalMin, 0)} {unit}</span>
        <span>Boîte = [Q1 – Q3] | Barre verte = Médiane | Point doré = Moyenne</span>
        <span>{formatNumber(globalMax, 0)} {unit}</span>
      </div>
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {items.map((b) => {
          const wLow = toPct(b.whisker_low);
          const q1 = toPct(b.q25);
          const med = toPct(b.median);
          const mean = toPct(b.mean);
          const q3 = toPct(b.q75);
          const wHigh = toPct(b.whisker_high);

          return (
            <div key={b.group} className="grid grid-cols-12 items-center gap-2 text-xs">
              <div className="col-span-3 truncate font-semibold text-navy-900" title={b.group}>
                {b.group}
              </div>
              <div className="col-span-7 relative h-6 rounded bg-slate-100/90">
                {/* Whisker line */}
                <div
                  className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-slate-500"
                  style={{ left: `${wLow}%`, width: `${Math.max(0.5, wHigh - wLow)}%` }}
                />
                {/* Left & Right whisker ticks */}
                <div className="absolute top-1.5 bottom-1.5 w-0.5 bg-slate-600" style={{ left: `${wLow}%` }} />
                <div className="absolute top-1.5 bottom-1.5 w-0.5 bg-slate-600" style={{ left: `${wHigh}%` }} />
                {/* EIQ Box */}
                <div
                  className="absolute top-1 bottom-1 rounded bg-navy-800/85 border border-navy-950"
                  style={{ left: `${q1}%`, width: `${Math.max(1.2, q3 - q1)}%` }}
                  title={`Q1: ${formatNumber(b.q25, 1)} | Médiane: ${formatNumber(b.median, 1)} | Q3: ${formatNumber(b.q75, 1)}`}
                />
                {/* Median marker */}
                <div className="absolute top-1 bottom-1 w-0.5 bg-emerald-400" style={{ left: `${med}%` }} />
                {/* Mean dot */}
                <div
                  className="absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-400 ring-1 ring-navy-950"
                  style={{ left: `${mean}%` }}
                  title={`Moyenne : ${formatNumber(b.mean, 1)}`}
                />
              </div>
              <div className="col-span-2 text-right font-mono text-[10.5px] text-slate-600">
                {formatNumber(b.median, 0)} <span className="text-slate-400">({b.outliers_count} out.)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const StatisticsPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getStatisticalStudy({
        source: filters.source,
        commodity: filters.commodity,
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
  }, [filters.source, filters.commodity, filters.region, filters.market, filters.date_from, filters.date_to]);

  const s = data?.summary;
  const unit = data?.meta?.unit ?? "FCFA/kg";
  const corrCols: string[] = data?.correlation_commodities ?? [];
  const corrMap = new Map<string, number | null>();
  (data?.correlation_matrix ?? []).forEach((c: any) => corrMap.set(`${c.x}||${c.y}`, c.r));

  return (
    <div className="space-y-5">
      <FilterBar hideCategory />
      <DataNatureBadge meta={data?.meta} />

      {loading && !data ? (
        <div className="h-80 animate-pulse rounded-xl bg-slate-200/70" />
      ) : !s ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-600">
          Aucune observation statistique pour cette sélection.
        </div>
      ) : (
        <>
          {/* Full Descriptive Statistics Cards */}
          <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
            <KpiCard title="Moyenne" value={`${formatNumber(s.mean, 1)} ${unit}`} subtitle={`N = ${formatNumber(s.count)}`} icon={Sigma} tone="navy" />
            <KpiCard title="Médiane" value={`${formatNumber(s.median, 1)} ${unit}`} subtitle={`EIQ = ${formatNumber(s.iqr, 1)}`} icon={BarChart3} tone="sky" />
            <KpiCard title="Écart-type (σ)" value={formatNumber(s.std, 1)} subtitle={`Var = ${formatNumber(s.variance, 0)}`} icon={BarChart3} tone="amber" />
            <KpiCard title="Coeff. variation" value={`${formatNumber(s.cv_pct, 1)} %`} subtitle={`Asymétrie = ${formatNumber(s.skewness, 2)} | Aplatissement = ${formatNumber(s.kurtosis, 2)}`} icon={Sigma} tone="navy" />
            <KpiCard title="Quartiles [Q1 – Q3]" value={`${formatNumber(s.q25)} – ${formatNumber(s.q75)}`} subtitle={`Q10=${formatNumber(s.q10)} | Q90=${formatNumber(s.q90)}`} icon={BarChart3} tone="emerald" />
            <KpiCard
              title="Anomalies détectées"
              value={`${formatNumber(s.outliers_iqr_15_count)}`}
              subtitle={`3×EIQ : ${formatNumber(s.outliers_iqr_30_count)} | z > 3 : ${formatNumber(s.outliers_z3_count)}`}
              icon={AlertTriangle}
              tone="crimson"
            />
          </div>

          {/* Automatic Data-Driven Interpretations */}
          <section className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50/90 to-white p-5 shadow-card">
            <div className="mb-3 flex items-center gap-2 text-sm font-extrabold text-navy-900">
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              <span>Interprétation statistique automatique (calculée sur les données réelles)</span>
            </div>
            <ul className="space-y-2 text-xs leading-relaxed text-slate-700">
              {(data.interpretations ?? []).map((txt: string, i: number) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                  <span>{txt}</span>
                </li>
              ))}
            </ul>
          </section>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            {/* Histogram */}
            <ChartCard
              title="Histogramme de distribution empirique des prix"
              subtitle={`Fréquence par intervalle (${unit})`}
              className="lg:col-span-6"
            >
              <div className="h-[310px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.histogram ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 40 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="bin_label" angle={-35} textAnchor="end" interval={1} tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={fmtLabel}
                      formatter={(v: any, _n: string, item: any) => [
                        `${formatNumber(Number(v))} obs. (${item?.payload?.pct ?? 0}%)`,
                        "Effectif",
                      ]}
                    />
                    <Bar dataKey="count" name="Effectif" fill="#0F2342" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* boîtes à moustaches */}
            <ChartCard
              title={`Boîtes à moustaches (boîtes à moustaches) par ${data.boxplots_group_by === "region_std" ? "région" : "produit"}`}
              subtitle="Dispersion interquartile [Q1–Q3], médiane, moyenne et moustaches à 1,5×EIQ"
              className="lg:col-span-6"
            >
              <BoxplotDiagram items={data.boxplots ?? []} unit={unit} />
            </ChartCard>

            {/* Correlation Matrix */}
            {corrCols.length >= 2 && (
              <ChartCard
                title="Matrice de corrélation inter-produits (2025–2026)"
                subtitle="Corrélation de Pearson sur les séries mensuelles (min. 8 mois communs)"
                className="lg:col-span-6"
              >
                <div className="overflow-x-auto">
                  <table className="min-w-full border-collapse text-[11px]">
                    <thead>
                      <tr>
                        <th className="border border-slate-200 bg-slate-50 p-1.5 text-left">Produit</th>
                        {corrCols.map((c) => (
                          <th key={c} className="border border-slate-200 bg-slate-50 p-1.5 text-center">
                            {c}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {corrCols.map((rC) => (
                        <tr key={rC}>
                          <td className="border border-slate-200 bg-slate-50 p-1.5 font-semibold text-navy-900 whitespace-nowrap">
                            {rC}
                          </td>
                          {corrCols.map((cC) => {
                            const r = corrMap.get(`${rC}||${cC}`);
                            const cls =
                              r == null
                                ? "bg-slate-50 text-slate-400"
                                : r >= 0.75
                                ? "bg-emerald-600 text-white"
                                : r >= 0.45
                                ? "bg-emerald-100 text-emerald-950"
                                : "bg-slate-50 text-slate-700";
                            return (
                              <td key={cC} className={`border border-slate-200 p-1.5 text-center font-mono font-bold ${cls}`}>
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
            )}

            {/* Outliers Sample Table */}
            <ChartCard
              title="Valeurs aberrantes / pics historiques détectés"
              subtitle="30 principales observations dépassant 1,5×EIQ ou écart réduit (z) > 3 (conservées car chocs réels)"
              className={corrCols.length >= 2 ? "lg:col-span-6" : "lg:col-span-12"}
            >
              <div className="max-h-[300px] overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="sticky top-0 bg-navy-900 text-left text-[11px] font-semibold text-white">
                    <tr>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Région / Marché</th>
                      <th className="px-3 py-2">Produit</th>
                      <th className="px-3 py-2 text-right">Prix</th>
                      <th className="px-3 py-2 text-right">Écart réduit (z)</th>
                      <th className="px-3 py-2">Niveau</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(data.outliers_sample ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-500">
                          Aucune valeur aberrante détectée sur ce périmètre.
                        </td>
                      </tr>
                    ) : (
                      data.outliers_sample.map((o: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 font-mono">{fmtDate(o.date)}</td>
                          <td className="px-3 py-1.5">
                            <span className="font-semibold text-navy-900">{o.market}</span>{" "}
                            <span className="text-slate-400">({o.region})</span>
                          </td>
                          <td className="px-3 py-1.5">{o.commodity}</td>
                          <td className="px-3 py-1.5 text-right font-mono font-bold text-crimson-600">
                            {formatNumber(o.price, 1)}
                          </td>
                          <td className="px-3 py-1.5 text-right font-mono">{formatNumber(o.z_score, 2)}</td>
                          <td className="px-3 py-1.5">
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                o.severity.includes("Extrême")
                                  ? "bg-red-100 text-crimson-600"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {o.severity}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
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
