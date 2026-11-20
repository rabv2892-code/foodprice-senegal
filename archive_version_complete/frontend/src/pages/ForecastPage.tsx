import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area,
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
import {
  AlertTriangle,
  Award,
  BrainCircuit,
  Calendar,
  CheckCircle2,
  Play,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { DataNatureBadge } from "../components/DataNatureBadge";
import { KpiCard } from "../components/KpiCard";
import type { ForecastResponse, SourceId } from "../types";
import { fmtDate, fmtLabel, fmtMonth, fmtMonths } from "../lib/fr";

export const ForecastPage: React.FC = () => {
  const [source, setSource] = useState<SourceId>("wfp");
  const [options, setOptions] = useState<any>(null);
  const [commodity, setCommodity] = useState<string>("Mil");
  const [region, setRegion] = useState<string>("Dakar");
  const [market, setMarket] = useState<string>("ALL");
  const [horizon, setHorizon] = useState<number>(6);
  const [result, setResult] = useState<ForecastResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getForecastOptions(source).then((res) => {
      if (!active) return;
      setOptions(res);
      setCommodity((prev) => (res.commodities.includes(prev) ? prev : res.commodities[0] ?? ""));
      setRegion((prev) => (prev === "ALL" || res.regions.includes(prev) ? prev : "ALL"));
      setMarket("ALL");
    });
    return () => {
      active = false;
    };
  }, [source]);

  const availableMarkets: string[] = useMemo(() => {
    if (!options) return [];
    if (region !== "ALL" && options.markets_by_region?.[region]) {
      return options.markets_by_region[region];
    }
    return options.markets ?? [];
  }, [options, region]);

  const executeForecast = useCallback(
    (override?: { source?: SourceId; commodity?: string; region?: string; market?: string; horizon?: number }) => {
      const payload = {
        source: override?.source ?? source,
        commodity: override?.commodity ?? commodity,
        region: override?.region ?? region,
        market: override?.market ?? market,
        horizon: override?.horizon ?? horizon,
      };
      setLoading(true);
      setError(null);
      api
        .runForecast(payload)
        .then((res) => setResult(res))
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    },
    [source, commodity, region, market, horizon]
  );

  useEffect(() => {
    executeForecast({ source: "wfp", commodity: "Mil", region: "Dakar", market: "ALL", horizon: 6 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const applyPreset = (p: { source: SourceId; commodity: string; region: string; market: string; horizon: number }) => {
    setSource(p.source);
    setCommodity(p.commodity);
    setRegion(p.region);
    setMarket(p.market);
    setHorizon(p.horizon);
    executeForecast(p);
  };

  // Distinct 2025 real, 2026 real, and future AI forecast series (strictly >= 2025-01)
  const combinedChartData = useMemo(() => {
    if (!result?.eligible || !result.historical_series || !result.forecast_series) return [];
    const histPoints = result.historical_series.map((h) => ({
      ym: h.ym,
      observed_2025: h.observed_2025 ?? (h.year === 2025 || h.ym.startsWith("2025-") ? h.observed_price : null),
      observed_2026: h.observed_2026 ?? (h.year === 2026 || h.ym.startsWith("2026-") ? h.observed_price : null),
      forecast: null as number | null,
      lower_95: null as number | null,
      upper_95: null as number | null,
    }));

    // Visually join last 2025 point to first 2026 point if both exist
    const last2025Idx = [...histPoints].reverse().findIndex((p) => p.observed_2025 != null);
    const first2026Idx = histPoints.findIndex((p) => p.observed_2026 != null);
    if (last2025Idx !== -1 && first2026Idx !== -1) {
      const actualIdx = histPoints.length - 1 - last2025Idx;
      if (first2026Idx === actualIdx + 1) {
        histPoints[actualIdx].observed_2026 = histPoints[actualIdx].observed_2025;
      }
    }

    // Visually join last observed point to forecast line
    const lastObsIdx = [...histPoints]
      .reverse()
      .findIndex((p) => p.observed_2026 != null || p.observed_2025 != null);
    const fcPoints = result.forecast_series.map((f) => ({
      ym: f.ym,
      observed_2025: null as number | null,
      observed_2026: null as number | null,
      forecast: f.forecast,
      lower_95: f.lower_95,
      upper_95: f.upper_95,
    }));
    if (lastObsIdx !== -1 && fcPoints.length > 0) {
      const idx = histPoints.length - 1 - lastObsIdx;
      const anchor = histPoints[idx].observed_2026 ?? histPoints[idx].observed_2025;
      if (anchor != null) {
        histPoints[idx].forecast = anchor;
      }
    }
    return [...histPoints, ...fcPoints];
  }, [result]);

  const unit = result?.meta?.unit ?? "FCFA/kg";
  const diag = result?.series_diagnostics;
  const bestRow = result?.model_comparison?.find((m) => m.selected);

  return (
    <div className="space-y-5">
      {/* Control Panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-navy-900 text-emerald-400">
              <BrainCircuit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-navy-900">
                Moteur de prévision par intelligence artificielle — calibré strictement depuis janvier 2025
              </h3>
              <p className="text-xs text-slate-500">
                Distingue explicitement les observations réelles 2025, les observations réelles 2026 et les estimations futures par intelligence artificielle (sans inventer les mois manquants).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => applyPreset({ source: "wfp", commodity: "Mil", region: "Dakar", market: "ALL", horizon: 6 })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-navy-900 hover:bg-slate-100"
            >
              Démonstration : Mil Dakar (6m)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ source: "wfp", commodity: "Riz (importé)", region: "ALL", market: "ALL", horizon: 12 })}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-navy-900 hover:bg-slate-100"
            >
              Démonstration : Riz importé National (12m)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ source: "rt_observed", commodity: "Riz", region: "ALL", market: "ALL", horizon: 6 })}
              className="rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[11px] font-semibold text-sky-900 hover:bg-sky-100"
            >
              Démonstration : Riz direct Temps réel (2025–05/2026)
            </button>
            <button
              type="button"
              onClick={() => applyPreset({ source: "wfp", commodity: "Sorgho", region: "Dakar", market: "ALL", horizon: 6 })}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
            >
              Garde-fou (Sorgho Dakar — 3 mois)
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Source (2025–2026)</label>
            <select
              aria-label="Source prévision"
              value={source}
              onChange={(e) => setSource(e.target.value as SourceId)}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs font-medium text-navy-900"
            >
              <option value="wfp">PAM Sénégal (01/2025 – 03/2026)</option>
              <option value="rt_observed">Temps réel (Observé direct 2025 – 05/2026)</option>
              <option value="rt_model">Temps réel (estimations modélisées 2025 – 05/2026)</option>
              <option value="csa">BASE_BULLETIN CSA (0 obs. 2025–2026)</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Produit</label>
            <select
              aria-label="Produit prévision"
              value={commodity}
              onChange={(e) => setCommodity(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              {(options?.commodities ?? []).map((c: string) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Région</label>
            <select
              aria-label="Région prévision"
              value={region}
              onChange={(e) => {
                setRegion(e.target.value);
                setMarket("ALL");
              }}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">Toutes les régions (National)</option>
              {(options?.regions ?? []).map((r: string) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Marché</label>
            <select
              aria-label="Marché prévision"
              value={market}
              onChange={(e) => setMarket(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs"
            >
              <option value="ALL">Tous les marchés de la zone</option>
              {availableMarkets.map((m: string) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase text-slate-500">Horizon de prévision</label>
            <select
              aria-label="Horizon de prévision"
              value={horizon}
              onChange={(e) => setHorizon(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-xs font-semibold text-navy-900"
            >
              {[1, 3, 6, 12].map((h) => (
                <option key={h} value={h}>
                  {h} mois
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              disabled={loading}
              onClick={() => executeForecast()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50"
            >
              <Play className="h-4 w-4" />
              {loading ? "Modélisation..." : "Générer une prévision"}
            </button>
          </div>
        </div>
      </div>

      {result && <DataNatureBadge meta={result.meta} />}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs font-medium text-red-700">
          Erreur du moteur de prévision : {error}
        </div>
      )}

      {loading && (
        <div className="rounded-xl border border-navy-200 bg-white p-8 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-navy-900 border-t-emerald-500" />
          <p className="mt-3 text-xs font-semibold text-navy-900">
            Entraînement et validation chronologique sur les données 2025–2026...
          </p>
        </div>
      )}

      {/* Guardrail rejection banner */}
      {!loading && result && !result.eligible && (
        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-6 shadow-card">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-6 w-6 shrink-0 text-amber-600" />
            <div>
              <h4 className="text-base font-extrabold text-amber-950">
                Garde-fou scientifique activé : prévision non autorisée pour ce périmètre
              </h4>
              <p className="mt-1.5 text-sm text-amber-900">{result.reason}</p>
              {diag && (
                <div className="mt-3 flex flex-wrap gap-3 text-xs font-mono text-amber-900">
                  <span className="rounded bg-white/80 px-2.5 py-1">
                    Observé 2025 : {diag.observed_months_2025 ?? 0} mois
                  </span>
                  <span className="rounded bg-white/80 px-2.5 py-1">
                    Observé 2026 : {diag.observed_months_2026 ?? 0} mois ({fmtMonths(diag.available_2026_months)})
                  </span>
                  <span className="rounded bg-white/80 px-2.5 py-1">Couverture : {formatNumber(diag.coverage_pct, 1)} %</span>
                  <span className="rounded bg-white/80 px-2.5 py-1">
                    Date de dernière observation : {fmtDate(diag.last_observed_date)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Valid Forecast Results */}
      {!loading && result && result.eligible && diag && (
        <>
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-5">
            <KpiCard
              title="Modèle utilisé"
              value={result.best_model ?? "—"}
              subtitle={result.best_specification}
              icon={Award}
              tone="emerald"
              badge="Validé 2025–2026"
            />
            <KpiCard
              title="Dernier prix observé"
              value={`${formatNumber(diag.last_observed_price, 1)} ${unit}`}
              subtitle={`Date de dernière observation : ${fmtDate(diag.last_observed_date)}`}
              icon={Calendar}
              tone="navy"
            />
            <KpiCard
              title={`Prévision à ${result.horizon_months} mois`}
              value={`${formatNumber(result.forecast_series?.[result.forecast_series.length - 1]?.forecast, 1)} ${unit}`}
              subtitle={`Échéance : ${fmtMonth(result.forecast_series?.[result.forecast_series.length - 1]?.ym)}`}
              icon={TrendingUp}
              tone={(result.forecast_series?.[result.forecast_series.length - 1]?.delta_pct_vs_last ?? 0) > 0 ? "crimson" : "emerald"}
              badge={`${(result.forecast_series?.[result.forecast_series.length - 1]?.delta_pct_vs_last ?? 0) > 0 ? "+" : ""}${formatNumber(result.forecast_series?.[result.forecast_series.length - 1]?.delta_pct_vs_last, 1)} %`}
            />
            <KpiCard
              title="Performance du modèle (REQM / EAM)"
              value={`${formatNumber(bestRow?.rmse, 1)} / ${formatNumber(bestRow?.mae, 1)}`}
              subtitle={`EAMP : ${formatNumber(bestRow?.mape_pct, 1)} % (${diag.validation_window_months} mois de test)`}
              icon={CheckCircle2}
              tone="sky"
            />
            <KpiCard
              title="Couverture 2025 contre 2026"
              value={`${diag.observed_months_2025 ?? 0} mois / ${diag.observed_months_2026 ?? 0} mois`}
              subtitle={`${formatNumber(diag.coverage_pct, 1)} % de couverture (${diag.observed_months} mois)`}
              icon={BrainCircuit}
              tone="amber"
            />
          </div>

          {/* Explicit 2025 contre 2026 vs Forecast Distinction Strip */}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border-l-4 border-navy-900 bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-navy-900">1. Données réellement observées en 2025</p>
              <p className="mt-1 text-sm font-extrabold text-navy-900">
                {diag.observed_months_2025 ?? 0} mois observés — Moyenne {formatNumber(diag.mean_2025, 1)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Courbe pleine bleu nuit (#0B192C) — base d'apprentissage.</p>
            </div>
            <div className="rounded-xl border-l-4 border-sky-500 bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-700">2. Données réellement observées en 2026</p>
              <p className="mt-1 text-sm font-extrabold text-sky-900">
                {diag.observed_months_2026 ?? 0} mois réels ({fmtMonths(diag.available_2026_months)}) — Moyenne {formatNumber(diag.mean_2026, 1)} {unit}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">
                Courbe pleine bleu ciel (#0EA5E9). Mois absents ({fmtMonths(diag.missing_2026_months, "aucun")}) jamais inventés.
              </p>
            </div>
            <div className="rounded-xl border-l-4 border-emerald-500 bg-white p-3.5 shadow-card">
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">3. Prix prévisionnel (intelligence artificielle)</p>
              <p className="mt-1 text-sm font-extrabold text-emerald-900">
                {fmtMonth(result.forecast_series?.[0]?.ym)} → {fmtMonth(result.forecast_series?.[result.forecast_series.length - 1]?.ym)} ({result.horizon_months} mois)
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Courbe pointillée verte (#10B981) + intervalle de prévision à 95 %.</p>
            </div>
          </div>

          {/* Main Historical (2025 contre 2026) + Forecast Chart */}
          <ChartCard
            title={`Évolution historique des prix et prévisions — ${result.scope}`}
            subtitle="Distinction stricte : prix historique 2025 (bleu nuit), prix historique 2026 (bleu ciel) et prix prévisionnel (vert pointillé) avec intervalle de prévision à 95 %"
          >
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={combinedChartData} margin={{ top: 12, right: 20, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} minTickGap={6} />
                  <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                  <Tooltip labelFormatter={fmtLabel}
                    contentStyle={{ borderRadius: 10, fontSize: 12 }}
                    formatter={(v: any, name: string) => [`${formatNumber(Number(v), 1)} ${unit}`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <ReferenceLine
                    x={diag.last_observed_date.slice(0, 7)}
                    stroke="#F59E0B"
                    strokeDasharray="4 4"
                    label={{ value: "Dernier relevé réel", fill: "#D97706", fontSize: 10 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="upper_95"
                    name="Intervalle de prévision à 95 %"
                    stroke="none"
                    fill="#10B981"
                    fillOpacity={0.16}
                  />
                  <Area
                    type="monotone"
                    dataKey="lower_95"
                    legendType="none"
                    stroke="none"
                    fill="#FFFFFF"
                    fillOpacity={0.85}
                  />
                  <Line
                    type="monotone"
                    dataKey="observed_2025"
                    name="Prix historique 2025"
                    stroke="#0B192C"
                    strokeWidth={2.6}
                    dot={{ r: 3, fill: "#0B192C" }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="observed_2026"
                    name="Prix historique 2026"
                    stroke="#0EA5E9"
                    strokeWidth={2.8}
                    dot={{ r: 3.5, fill: "#0EA5E9" }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name={`Prix prévisionnel (${result.best_model})`}
                    stroke="#10B981"
                    strokeWidth={2.8}
                    strokeDasharray="6 3"
                    dot={{ r: 3.5, fill: "#10B981" }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Comparaison des modèles et validation rétrospective */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <ChartCard
              title="Performance du modèle : comparaison chronologique (validation hors échantillon 2025–2026)"
              subtitle={`Évaluation sur les ${diag.validation_window_months} derniers mois observés — Sélection par REQM minimal`}
              className="lg:col-span-7"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-navy-900 text-left text-[11px] font-semibold uppercase text-white">
                    <tr>
                      <th className="px-3 py-2">Modèle</th>
                      <th className="px-3 py-2">Spécification</th>
                      <th className="px-3 py-2 text-right">EAM</th>
                      <th className="px-3 py-2 text-right">REQM</th>
                      <th className="px-3 py-2 text-right">EAMP</th>
                      <th className="px-3 py-2 text-center">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(result.model_comparison ?? []).map((m) => (
                      <tr key={m.model} className={m.selected ? "bg-emerald-50/70" : "hover:bg-slate-50"}>
                        <td className="px-3 py-2 font-bold text-navy-900">
                          {m.model} {m.selected && <span className="ml-1 text-emerald-600">★</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{m.specification}</td>
                        <td className="px-3 py-2 text-right font-mono">{formatNumber(m.mae, 2)}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold text-navy-900">{formatNumber(m.rmse, 2)}</td>
                        <td className="px-3 py-2 text-right font-mono">{m.mape_pct != null ? `${formatNumber(m.mape_pct, 1)} %` : "—"}</td>
                        <td className="px-3 py-2 text-center">
                          {m.selected ? (
                            <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                              Retenu
                            </span>
                          ) : m.status === "evaluated" ? (
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                              Évalué
                            </span>
                          ) : (
                            <span
                              title={m.error ?? undefined}
                              className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-900"
                            >
                              Indisponible
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 h-[190px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={(result.model_comparison ?? []).filter((m) => m.status === "evaluated")}
                    margin={{ top: 5, right: 16, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="model" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip labelFormatter={fmtLabel} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="rmse" name="REQM" fill="#0F2342" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="mae" name="EAM" fill="#0EA5E9" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Validation rétrospective curves */}
            <ChartCard
              title="Courbes de la validation rétrospective (fenêtre de validation)"
              subtitle="Comparaison du réel observé et des prévisions hors échantillon"
              className="lg:col-span-5"
            >
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={result.validation_series ?? []} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
                    <Tooltip labelFormatter={fmtLabel} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="actual" name="Réel observé" stroke="#0B192C" strokeWidth={2.6} />
                    <Line type="monotone" dataKey="Holt-Winters" stroke="#10B981" strokeWidth={1.6} dot={false} />
                    <Line type="monotone" dataKey="ARIMA" stroke="#0EA5E9" strokeWidth={1.6} dot={false} />
                    <Line type="monotone" dataKey="SARIMA" stroke="#F59E0B" strokeWidth={1.6} dot={false} />
                    <Line type="monotone" dataKey="Prophet" stroke="#EF4444" strokeWidth={1.6} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Future Values Table + Interpretation */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
            <ChartCard
              title={`Tableau du prix prévisionnel (${result.horizon_months} mois)`}
              subtitle={`Estimations futures en ${unit} avec intervalle de prévision 95 % — distinctes des relevés réels`}
              className="lg:col-span-7"
            >
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-xs">
                  <thead className="bg-navy-900 text-left text-[11px] font-semibold uppercase text-white">
                    <tr>
                      <th className="px-3 py-2">Horizon de prévision</th>
                      <th className="px-3 py-2">Mois futur</th>
                      <th className="px-3 py-2 text-right">Estimation ({unit})</th>
                      <th className="px-3 py-2 text-right">Borne basse 95 %</th>
                      <th className="px-3 py-2 text-right">Borne haute 95 %</th>
                      <th className="px-3 py-2 text-right">Variation par rapport au dernier relevé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(result.forecast_series ?? []).map((f) => (
                      <tr key={f.ym} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono font-semibold text-slate-500">+{f.step} mois</td>
                        <td className="px-3 py-2 font-mono font-bold text-navy-900">{fmtMonth(f.ym)}</td>
                        <td className="px-3 py-2 text-right font-mono font-extrabold text-navy-900">
                          {formatNumber(f.forecast, 1)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">{formatNumber(f.lower_95, 1)}</td>
                        <td className="px-3 py-2 text-right font-mono text-slate-600">{formatNumber(f.upper_95, 1)}</td>
                        <td
                          className={`px-3 py-2 text-right font-mono font-bold ${
                            f.delta_pct_vs_last > 0 ? "text-crimson-600" : "text-emerald-600"
                          }`}
                        >
                          {f.delta_pct_vs_last > 0 ? "+" : ""}
                          {formatNumber(f.delta_pct_vs_last, 1)} % ({f.delta_vs_last > 0 ? "+" : ""}
                          {formatNumber(f.delta_vs_last, 1)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ChartCard>

            <ChartCard
              title="Interprétation automatique et transparence méthodologique"
              subtitle={result.seasonality?.description}
              className="lg:col-span-5"
            >
              <div className="space-y-3 text-xs leading-relaxed text-slate-700">
                {(result.interpretations ?? []).map((txt, idx) => {
                  const isDisclaimer = txt.startsWith("Avertissement");
                  return (
                    <div
                      key={idx}
                      className={`rounded-lg border p-3 ${
                        isDisclaimer
                          ? "border-amber-200 bg-amber-50 text-amber-950 font-medium"
                          : "border-slate-200 bg-slate-50/70"
                      }`}
                    >
                      {isDisclaimer && <AlertTriangle className="mb-1 inline h-4 w-4 mr-1.5 text-amber-600" />}
                      {txt}
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          </div>
        </>
      )}
    </div>
  );
};
