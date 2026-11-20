import React, { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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
import {
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  Database,
  Layers,
  MapPin,
  Package,
  Store,
  TrendingUp,
} from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { FilterBar } from "../components/FilterBar";
import { KpiCard } from "../components/KpiCard";
import { useGlobalFilters } from "../context/FilterContext";
import type { OverviewResponse } from "../types";
import { fmtDate, fmtLabel, fmtMonth } from "../lib/fr";

export const OverviewPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [obsTab, setObsTab] = useState<"region" | "year">("region");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    api
      .getOverview(filters)
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
  }, [filters]);

  const k = data?.kpis;
  const unit = k?.unit ?? "FCFA/kg";
  const c = data?.charts;

  return (
    <div className="space-y-5">
      <FilterBar />
      <DataNatureBadge meta={data?.meta} stageNotice={k?.stage_notice} />

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          Erreur de chargement : {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 9 }).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-xl bg-slate-200/70" />
          ))}
        </div>
      ) : (
        <>
          {/* 9 Real indicateurs Cards in balanced 3x3 grid */}
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            <KpiCard
              title="Observations totales"
              value={formatNumber(k?.total_observations)}
              subtitle={`${formatNumber(k?.periods_count)} mois disponibles`}
              icon={Database}
              tone="navy"
            />
            <KpiCard
              title="Régions couvertes"
              value={formatNumber(k?.regions_count)}
              subtitle="Découpage administratif"
              icon={MapPin}
              tone="sky"
            />
            <KpiCard
              title="Marchés suivis"
              value={formatNumber(k?.markets_count)}
              subtitle={data?.meta.has_markets ? "Marchés actifs filtrés" : "Moyennes régionales CSA"}
              icon={Store}
              tone="sky"
            />
            <KpiCard
              title="Produits analysés"
              value={formatNumber(k?.products_count)}
              subtitle={`Unité : ${unit}`}
              icon={Package}
              tone="navy"
            />
            <KpiCard
              title="Périodes disponibles"
              value={`${formatNumber(k?.periods_count)} mois`}
              subtitle={`Dernier relevé : ${fmtDate(k?.last_observation_date)}`}
              icon={Calendar}
              tone="amber"
            />
            <KpiCard
              title="Prix moyen"
              value={k?.mean_price != null ? `${formatNumber(k.mean_price, 1)} ${unit}` : "—"}
              subtitle={`Médiane : ${formatNumber(k?.median_price, 1)} | σ : ${formatNumber(k?.std_price, 1)}`}
              icon={TrendingUp}
              tone="navy"
              badge={data?.meta.is_estimated ? "Estimation" : "Observé"}
            />
            <KpiCard
              title="Prix minimum"
              value={k?.min_price != null ? `${formatNumber(k.min_price, 1)} ${unit}` : "—"}
              subtitle="Plancher observé filtré"
              icon={ArrowDownRight}
              tone="emerald"
            />
            <KpiCard
              title="Prix maximum"
              value={k?.max_price != null ? `${formatNumber(k.max_price, 1)} ${unit}` : "—"}
              subtitle="Plafond observé filtré"
              icon={ArrowUpRight}
              tone="crimson"
            />
            <KpiCard
              title="Dernière date de relevé"
              value={fmtDate(k?.last_observation_date)}
              subtitle={data?.meta.source_label}
              icon={Layers}
              tone="emerald"
            />
          </div>

          {k && k.total_observations === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">
              Aucune observation ne correspond à cette combinaison de filtres. Essayez de réinitialiser un critère.
            </div>
          ) : (
            c && (
              <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                {/* A. Evolution des prix dans le temps */}
                <ChartCard
                  title="A. Évolution des prix dans le temps"
                  subtitle={`Moyenne, médiane et enveloppe minimum–maximum mensuelle (${unit})`}
                  className="lg:col-span-8"
                >
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={c.time_series} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0F2342" stopOpacity={0.22} />
                            <stop offset="95%" stopColor="#0F2342" stopOpacity={0.01} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11, fill: "#64748B" }} minTickGap={28} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, borderColor: "#CBD5E1", fontSize: 12 }}
                          formatter={(val: any, name: string) => [`${formatNumber(Number(val), 1)} ${unit}`, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Area
                          type="monotone"
                          dataKey="mean"
                          name="Prix moyen"
                          stroke="#0B192C"
                          strokeWidth={2.2}
                          fill="url(#priceArea)"
                        />
                        <Line
                          type="monotone"
                          dataKey="median"
                          name="Médiane"
                          stroke="#10B981"
                          strokeWidth={1.8}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="max"
                          name="Maximum mensuel"
                          stroke="#EF4444"
                          strokeWidth={1}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* E. Les 10 produits les plus chers */}
                <ChartCard
                  title="E. Les 10 produits les plus chers"
                  subtitle={`Classement par prix moyen (${unit})`}
                  className="lg:col-span-4"
                >
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={c.top_expensive_products}
                        layout="vertical"
                        margin={{ top: 4, right: 18, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                        <YAxis
                          type="category"
                          dataKey="commodity"
                          width={135}
                          tick={{ fontSize: 10.5, fill: "#1E293B" }}
                        />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any) => [`${formatNumber(Number(v), 1)} ${unit}`, "Prix moyen"]}
                        />
                        <Bar dataKey="mean" name="Prix moyen" radius={[0, 5, 5, 0]}>
                          {c.top_expensive_products.map((_, idx) => (
                            <Cell key={idx} fill={idx < 3 ? "#EF4444" : idx < 6 ? "#F59E0B" : "#0F2342"} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* B. Prix moyen par produit */}
                <ChartCard
                  title="B. Prix moyen par produit"
                  subtitle="Comparaison complète des produits sur la période filtrée"
                  className="lg:col-span-6"
                >
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={c.avg_by_product} margin={{ top: 8, right: 12, left: 0, bottom: 55 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="commodity"
                          angle={-28}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10, fill: "#334155" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(val: any, name: string) => [`${formatNumber(Number(val), 1)} ${unit}`, name]}
                        />
                        <Legend verticalAlign="top" wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="mean" name="Moyenne" fill="#0F2342" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="median" name="Médiane" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* C. Classement des régions */}
                <ChartCard
                  title="C. Classement des régions"
                  subtitle={`Prix moyen régional comparé à la moyenne filtrée (${formatNumber(k?.mean_price, 1)} ${unit})`}
                  className="lg:col-span-6"
                >
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={c.region_ranking} margin={{ top: 8, right: 12, left: 0, bottom: 45 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="region"
                          angle={-28}
                          textAnchor="end"
                          interval={0}
                          tick={{ fontSize: 10.5, fill: "#334155" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any) => [`${formatNumber(Number(v), 1)} ${unit}`, "Prix moyen"]}
                        />
                        {k?.mean_price != null && (
                          <ReferenceLine
                            y={k.mean_price}
                            stroke="#F59E0B"
                            strokeDasharray="4 4"
                            label={{ value: "Moy. nat.", fill: "#D97706", fontSize: 10 }}
                          />
                        )}
                        <Bar dataKey="mean" name="Prix moyen" radius={[4, 4, 0, 0]}>
                          {c.region_ranking.map((r) => (
                            <Cell
                              key={r.region}
                              fill={r.diff_vs_national_pct > 0 ? "#EF4444" : "#10B981"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* D. Classement des marchés */}
                <ChartCard
                  title="D. Classement des marchés (20 premiers)"
                  subtitle={`Marchés classés par prix moyen (${unit})`}
                  className="lg:col-span-6"
                >
                  <div className="h-[330px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={c.market_ranking.slice(0, 12)}
                        layout="vertical"
                        margin={{ top: 4, right: 20, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 11, fill: "#64748B" }} />
                        <YAxis
                          type="category"
                          dataKey="market"
                          width={125}
                          tick={{ fontSize: 10.5, fill: "#1E293B" }}
                        />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any) => [`${formatNumber(Number(v), 1)} ${unit}`, "Prix moyen"]}
                        />
                        <Bar dataKey="mean" name="Prix moyen" fill="#17345E" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* F. Répartition des observations */}
                <ChartCard
                  title="F. Répartition des observations"
                  subtitle="Couverture réelle du jeu de données selon la dimension choisie"
                  className="lg:col-span-6"
                  rightSlot={
                    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
                      <button
                        type="button"
                        onClick={() => setObsTab("region")}
                        className={`rounded-md px-2.5 py-1 font-semibold ${
                          obsTab === "region" ? "bg-navy-900 text-white" : "text-slate-600"
                        }`}
                      >
                        Par région
                      </button>
                      <button
                        type="button"
                        onClick={() => setObsTab("year")}
                        className={`rounded-md px-2.5 py-1 font-semibold ${
                          obsTab === "year" ? "bg-navy-900 text-white" : "text-slate-600"
                        }`}
                      >
                        Par année
                      </button>
                    </div>
                  }
                >
                  <div className="h-[330px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      {obsTab === "region" ? (
                        <BarChart data={c.observations_by_region} margin={{ top: 8, right: 12, left: 0, bottom: 45 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis
                            dataKey="region"
                            angle={-28}
                            textAnchor="end"
                            interval={0}
                            tick={{ fontSize: 10.5, fill: "#334155" }}
                          />
                          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                          <Tooltip labelFormatter={fmtLabel}
                            contentStyle={{ borderRadius: 10, fontSize: 12 }}
                            formatter={(v: any) => [formatNumber(Number(v)), "Observations"]}
                          />
                          <Bar dataKey="count" name="Observations" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <BarChart data={c.observations_by_year} margin={{ top: 8, right: 12, left: 0, bottom: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                          <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#334155" }} />
                          <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                          <Tooltip labelFormatter={fmtLabel}
                            contentStyle={{ borderRadius: 10, fontSize: 12 }}
                            formatter={(v: any) => [formatNumber(Number(v)), "Observations"]}
                          />
                          <Bar dataKey="count" name="Observations" fill="#0F2342" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* G. Évolution mensuelle (Saisonnalité calendaire) */}
                <ChartCard
                  title="G. Évolution mensuelle (profil saisonnier Jan–Déc)"
                  subtitle="Moyenne et médiane par mois calendaire (période de soudure et période de récolte)"
                  className="lg:col-span-4"
                >
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={c.monthly_seasonality} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month_label" tick={{ fontSize: 11, fill: "#475569" }} />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} domain={["auto", "auto"]} />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any, n: string) => [`${formatNumber(Number(v), 1)} ${unit}`, n]}
                        />
                        <Area
                          type="monotone"
                          dataKey="mean"
                          name="Moyenne"
                          stroke="#0EA5E9"
                          fill="#0EA5E9"
                          fillOpacity={0.18}
                          strokeWidth={2}
                        />
                        <Line type="monotone" dataKey="median" name="Médiane" stroke="#0F2342" strokeWidth={1.8} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* H. Comparaison des prix entre régions (% vs moyenne) */}
                <ChartCard
                  title="H. Comparaison des prix entre régions (% d'écart)"
                  subtitle="Vert : inférieur à la moyenne nationale | Rouge : supérieur"
                  className="lg:col-span-4"
                >
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={c.region_comparison}
                        layout="vertical"
                        margin={{ top: 4, right: 16, left: 10, bottom: 4 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10.5, fill: "#64748B" }} unit="%" />
                        <YAxis
                          type="category"
                          dataKey="region"
                          width={95}
                          tick={{ fontSize: 10, fill: "#1E293B" }}
                        />
                        <ReferenceLine x={0} stroke="#0F2342" />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any) => [`${Number(v) > 0 ? "+" : ""}${formatNumber(Number(v), 1)} %`, "Écart / Moyenne"]}
                        />
                        <Bar dataKey="diff_vs_national_pct" name="Écart (%)" radius={[3, 3, 3, 3]}>
                          {c.region_comparison.map((entry) => (
                            <Cell
                              key={entry.region}
                              fill={entry.diff_vs_national_pct > 0 ? "#EF4444" : "#10B981"}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>

                {/* I. Distribution des prix */}
                <ChartCard
                  title="I. Distribution statistique des prix"
                  subtitle={`Répartition par tranches de prix (${unit})`}
                  className="lg:col-span-4"
                >
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={c.price_distribution} margin={{ top: 8, right: 10, left: 0, bottom: 35 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis
                          dataKey="bin_label"
                          angle={-35}
                          textAnchor="end"
                          interval={1}
                          tick={{ fontSize: 9.5, fill: "#475569" }}
                        />
                        <YAxis tick={{ fontSize: 11, fill: "#64748B" }} />
                        <Tooltip labelFormatter={fmtLabel}
                          contentStyle={{ borderRadius: 10, fontSize: 12 }}
                          formatter={(v: any) => [formatNumber(Number(v)), "Observations"]}
                        />
                        <Bar dataKey="count" name="Observations" fill="#10B981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
            )
          )}
        </>
      )}
    </div>
  );
};
