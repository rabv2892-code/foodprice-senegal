import React, { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertCircle, CalendarCheck2, CheckCircle2, Database, Search, ShieldCheck } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { KpiCard } from "../components/KpiCard";
import { fmtDate, fmtLabel, fmtMonths, rtProductLabel } from "../lib/fr";

export const DataQualityPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [emptySearch, setEmptySearch] = useState("");

  useEffect(() => {
    let active = true;
    api
      .getQualityAudit()
      .then((res) => {
        if (active) setData(res);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading || !data) {
    return <div className="h-80 animate-pulse rounded-xl bg-slate-200/70" />;
  }

  const wfp = data.audit.sources.wfp_food_prices_sen;
  const rt = data.audit.sources.real_time_food_prices;
  const xls = data.audit.sources.base_bulletin_xlsx;

  const qualityChart = [
    { name: "PAM Sénégal (2025–2026)", score: wfp.quality_score },
    { name: "Temps réel Sénégal (2025–2026)", score: rt.quality_score },
    ...Object.entries(xls.sheets).map(([k, v]: [string, any]) => ({
      name: `${k} (0 obs. 2025–26)`,
      score: v.quality_score,
    })),
  ];

  const rtCoverageChart = Object.entries(rt.commodity_coverage).map(([k, v]: [string, any]) => ({
    commodity: rtProductLabel(k),
    observed_pct: v.observed_pct,
    trust_mean: v.trust_mean,
  }));

  const emptyList: string[] = (data.rt_empty_commodities ?? []).filter((c: string) =>
    `${c} ${rtProductLabel(c)}`.toLowerCase().includes(emptySearch.toLowerCase())
  );

  return (
    <div className="space-y-5">
      {/* Official Period Verification Banner */}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs text-emerald-950">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 font-extrabold text-navy-900">
            <CalendarCheck2 className="h-4 w-4 text-emerald-600" />
            <span>
              Couverture vérifiée par source sur la période officielle :{" "}
              {data.audit.official_period?.label ?? "janvier 2025 – décembre 2026"}
            </span>
          </div>
          <span className="rounded-full bg-white px-2.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800">
            01/01/2025 → 31/12/2026
          </span>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-2.5 md:grid-cols-3">
          <div className="rounded-lg border border-emerald-200 bg-white p-3">
            <p className="font-bold text-navy-900">1. PAM Sénégal (CSV)</p>
            <p className="mt-1 font-mono text-[11px] text-emerald-700">{fmtDate(wfp.date_min)} → {fmtDate(wfp.date_max)}</p>
            <p className="mt-0.5 text-slate-600">{formatNumber(wfp.rows_clean)} observations • {wfp.markets_count} marchés • {wfp.commodities_count} produits</p>
            <p className="mt-0.5 text-[11px] text-slate-500">2026 réels : {fmtMonths(wfp.available_2026_months)}</p>
          </div>
          <div className="rounded-lg border border-sky-200 bg-white p-3">
            <p className="font-bold text-navy-900">2. Temps réel Sénégal (CSV)</p>
            <p className="mt-1 font-mono text-[11px] text-sky-700">{fmtDate(rt.date_min)} → {fmtDate(rt.date_max)}</p>
            <p className="mt-0.5 text-slate-600">{formatNumber(rt.rows_wide_2025_2026)} lignes ({formatNumber(rt.observed_price_rows_excl_avg)} directs)</p>
            <p className="mt-0.5 text-[11px] text-slate-500">2026 réels : {fmtMonths(rt.available_2026_months)}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-white p-3">
            <p className="font-bold text-navy-900">3. BASE_BULLETIN.xlsx (7 feuilles)</p>
            <p className="mt-1 font-mono text-[11px] text-amber-700">0 observation en 2025–2026</p>
            <p className="mt-0.5 text-slate-600">Couverture brute s'arrêtant en août 2022</p>
            <p className="mt-0.5 text-[11px] text-slate-500">Années &lt; 2025 strictement exclues</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          title="Score de qualité PAM (2025–2026)"
          value={`${formatNumber(wfp.quality_score, 1)} / 100`}
          subtitle={`${formatNumber(wfp.rows_clean)} obs. retenues • 0 manquant`}
          icon={ShieldCheck}
          tone="emerald"
        />
        <KpiCard
          title="Score de qualité Temps réel"
          value={`${formatNumber(rt.quality_score, 1)} / 100`}
          subtitle={`${rt.empty_cols_count}/${rt.cols_raw} colonnes vides isolées`}
          icon={Database}
          tone="amber"
        />
        <KpiCard
          title="BASE_BULLETIN (2025–26)"
          value="0 obs."
          subtitle="Arrêt brut en 2022 (aucune donnée 2025–26)"
          icon={CheckCircle2}
          tone="sky"
        />
        <KpiCard
          title="Dates hors 2025–2026"
          value="0"
          subtitle="Filtrage analytique reproductible actif"
          icon={AlertCircle}
          tone="navy"
        />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        <ChartCard
          title="Indice de qualité documenté par source et par feuille (/100)"
          subtitle="Basé sur la complétude, l'absence de doublons, la cohérence des unités et le filtrage strict 2025–2026"
          className="lg:col-span-7"
        >
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={qualityChart} layout="vertical" margin={{ top: 5, right: 24, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={190} tick={{ fontSize: 10.5 }} />
                <Tooltip labelFormatter={fmtLabel} formatter={(v: any) => [`${formatNumber(Number(v), 1)} / 100`, "Score de qualité"]} />
                <Bar dataKey="score" radius={[0, 5, 5, 0]}>
                  {qualityChart.map((entry, idx) => (
                    <Cell key={idx} fill={entry.score >= 90 ? "#10B981" : entry.score >= 85 ? "#0EA5E9" : "#F59E0B"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Temps réel 2025–2026 : Relevés directs (%)"
          subtitle="Part des mois 2025–05/2026 avec prix observé direct (contre estimations)"
          className="lg:col-span-5"
        >
          <div className="h-[310px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={rtCoverageChart} margin={{ top: 10, right: 12, left: 0, bottom: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="commodity" angle={-20} textAnchor="end" tick={{ fontSize: 10.5 }} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={fmtLabel} formatter={(v: any) => [`${formatNumber(Number(v), 1)} %`, "Couverture directe"]} />
                <Bar dataKey="observed_pct" name="Relevés directs (%)" fill="#0F2342" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      {/* Detailed Audit Findings per Source */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Audit Source 1 : wfp_food_prices_sen.csv" subtitle={`${fmtDate(wfp.date_min)} → ${fmtDate(wfp.date_max)}`}>
          <ul className="space-y-2 text-xs text-slate-700">
            <li>• <strong>Volume brut → 2025–2026 :</strong> {formatNumber(wfp.rows_raw)} → {formatNumber(wfp.rows_clean)} obs.</li>
            <li>• <strong>Valeurs manquantes :</strong> {wfp.total_missing_cells}</li>
            <li>• <strong>Doublons (clé métier) :</strong> {wfp.key_duplicates}</li>
            <li>• <strong>Unité / Devise :</strong> 100 % kg / FCFA (Détail, réel)</li>
            <li>• <strong>Outliers 3×EIQ (2025–2026) :</strong> {formatNumber(wfp.outliers_iqr_30)} (pics réels conservés)</li>
            {wfp.notes.map((n: string, i: number) => (
              <li key={i} className="text-slate-600">• {n}</li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Audit Source 2 : Temps réel (879 colonnes)" subtitle={`${fmtDate(rt.date_min)} → ${fmtDate(rt.date_max)}`}>
          <ul className="space-y-2 text-xs text-slate-700">
            <li>• <strong>Volume brut → 2025–2026 :</strong> {formatNumber(rt.rows_raw)} → {formatNumber(rt.rows_wide_2025_2026)} lignes</li>
            <li>• <strong>Colonnes exploitées :</strong> {rt.populated_cols_count} / {rt.cols_raw} (6 produits)</li>
            <li>• <strong>Colonnes vides isolées :</strong> {rt.empty_cols_count} (116 denrées sans aucune valeur)</li>
            <li>• <strong>Relevés directs contre estimations (hors moyenne) :</strong> {formatNumber(rt.observed_price_rows_excl_avg)} contre {formatNumber(rt.model_ohlc_rows_excl_avg)}</li>
            <li>• <strong>Sémantique O/H/B/C :</strong> {rt.variable_semantics.o_h_l_c}</li>
          </ul>
        </ChartCard>

        <ChartCard title="Audit Source 3 : BASE_BULLETIN.xlsx (7 feuilles)" subtitle="Vérification 2025–2026">
          <ul className="space-y-2 text-xs text-slate-700">
            <li>• <strong>Période brute vérifiée :</strong> toutes les 7 feuilles s'arrêtent en 2021/2022.</li>
            <li>• <strong>Observations 2025–2026 :</strong> 0 ligne dans chacune des 7 feuilles.</li>
            <li>• <strong>Politique appliquée :</strong> schémas normalisés conservés à 0 ligne ; aucune donnée &lt; 2025 exposée.</li>
            <li>• <strong>Audit structurel :</strong> unités (FCFA/kg, MWh, tonnes, kilotonnes, têtes) strictement vérifiées.</li>
          </ul>
        </ChartCard>
      </div>

      {/* Searchable 116 Empty Commodities list */}
      <ChartCard
        title={`Inventaire des ${data.rt_empty_commodities?.length ?? 116} produits entièrement vides dans le fichier real-time-food-prices-for-senegal.csv`}
        subtitle="Documentés et exclus proprement pour éviter 812 colonnes inutiles (le nom d'origine de la colonne du fichier brut s'affiche au survol)"
        rightSlot={
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={emptySearch}
              onChange={(e) => setEmptySearch(e.target.value)}
              placeholder="Filtrer..."
              className="rounded-lg border border-slate-300 py-1.5 pl-8 pr-3 text-xs"
            />
          </div>
        }
      >
        <div className="flex max-h-40 flex-wrap gap-1.5 overflow-y-auto">
          {emptyList.map((c) => (
            <span key={c} title={`Colonne d'origine : ${c}`} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">
              {rtProductLabel(c)}
            </span>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
