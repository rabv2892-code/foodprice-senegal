import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BrainCircuit,
  CalendarRange,
  Database,
  Filter,
  Loader2,
  MapPin,
  RotateCcw,
  Store,
  Tag,
} from "lucide-react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api, formatNumber } from "../api/client";
import { fmtDate, fmtMonth, fmtMonths, frText } from "../lib/fr";
import { useGlobalFilters } from "../context/FilterContext";
import { SenegalMap } from "../components/SenegalMap";
import type { ExecutiveDashboardResponse, ExecutiveRegion, SourceId } from "../types";

const C = {
  turquoise: "#2DD4BF",
  blue: "#3B82F6",
  sky: "#38BDF8",
  yellow: "#FACC15",
  green: "#22C55E",
  red: "#F43F5E",
  grid: "rgba(148,163,184,0.10)",
  tick: "#7C8DA6",
};

const PALETTE = ["#2DD4BF", "#3B82F6", "#FACC15", "#22C55E", "#F43F5E", "#A78BFA", "#FB923C", "#38BDF8", "#F472B6", "#A3E635", "#94A3B8"];

const HORIZONS = [1, 3, 6, 12];

const catLabel = (c: string) => c;
const lcFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

function addMonths(ym: string, n: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthRange(from: string, to: string): string[] {
  const out: string[] = [];
  let cur = from;
  while (cur <= to && out.length < 48) {
    out.push(cur);
    cur = addMonths(cur, 1);
  }
  return out;
}

const fmtPct = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? "—" : `${v > 0 ? "+" : ""}${formatNumber(v, digits)} %`;

/* ---------------------------------- UI primitives ---------------------------------- */

const Panel: React.FC<{
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
  delay?: number;
  children: React.ReactNode;
}> = ({ title, subtitle, right, className = "", delay = 0, children }) => (
  <section
    className={`animate-fade-up rounded-2xl border border-white/[0.07] bg-[#0B1628]/90 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] sm:p-5 ${className}`}
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-200">{title}</h3>
        {subtitle && <p className="mt-0.5 text-[11px] leading-snug text-slate-400">{subtitle}</p>}
      </div>
      {right}
    </div>
    {children}
  </section>
);

const Segmented: React.FC<{
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  ariaLabel: string;
}> = ({ value, options, onChange, ariaLabel }) => (
  <div role="group" aria-label={ariaLabel} className="inline-flex rounded-lg border border-white/10 bg-white/[0.03] p-0.5">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        onClick={() => onChange(o.id)}
        className={`rounded-md px-2.5 py-1 text-[10.5px] font-semibold transition ${
          value === o.id ? "bg-teal-400/15 text-teal-300 ring-1 ring-teal-400/30" : "text-slate-400 hover:text-slate-200"
        }`}
      >
        {o.label}
      </button>
    ))}
  </div>
);

const TooltipShell: React.FC<{ title: React.ReactNode; children: React.ReactNode }> = ({ title, children }) => (
  <div className="min-w-[190px] max-w-[300px] rounded-xl border border-white/10 bg-[#0A1424]/95 px-3 py-2.5 text-[11px] text-slate-300 shadow-2xl backdrop-blur">
    <p className="mb-1.5 font-bold text-white">{title}</p>
    <div className="space-y-1">{children}</div>
  </div>
);

const TRow: React.FC<{ color?: string; label: string; value: React.ReactNode }> = ({ color, label, value }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="flex items-center gap-1.5 text-slate-400">
      {color && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
      {label}
    </span>
    <span className="font-mono font-semibold text-slate-100">{value}</span>
  </div>
);

const Sparkline: React.FC<{ data: { v: number | null }[]; color: string; type?: "line" | "bar" }> = ({ data, color, type = "line" }) => {
  if (data.length < 2) return null;
  const id = `spark-${color.replace("#", "")}`;
  return (
    <div className="h-10 w-full">
      <ResponsiveContainer width="100%" height="100%">
        {type === "bar" ? (
          <BarChart data={data} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <Bar dataKey="v" fill={color} fillOpacity={0.55} radius={[2, 2, 0, 0]} isAnimationActive />
          </BarChart>
        ) : (
          <ComposedChart data={data} margin={{ top: 4, right: 0, bottom: 2, left: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={["dataMin", "dataMax"]} />
            <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.8} fill={`url(#${id})`} connectNulls dot={false} isAnimationActive />
          </ComposedChart>
        )}
      </ResponsiveContainer>
    </div>
  );
};

const KpiCard: React.FC<{
  label: string;
  sublabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  value: React.ReactNode;
  unit?: string;
  badge?: React.ReactNode;
  lines: React.ReactNode[];
  footer: React.ReactNode;
  spark?: React.ReactNode;
  delay?: number;
}> = ({ label, sublabel, icon: Icon, accent, value, unit, badge, lines, footer, spark, delay = 0 }) => (
  <div
    className="animate-fade-up group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0E1C33] to-[#0A1526] p-4 shadow-[0_8px_30px_rgba(0,0,0,0.25)] transition hover:border-white/15"
    style={{ animationDelay: `${delay}ms` }}
  >
    <div className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }} />
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="text-[10.5px] font-bold uppercase tracking-[0.16em] text-slate-300">{label}</p>
        <p className="text-[10.5px] text-slate-500">{sublabel}</p>
      </div>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: `${accent}1F`, color: accent }}>
        <Icon className="h-4 w-4" />
      </span>
    </div>
    <div className="mt-3 flex flex-wrap items-end gap-x-2 gap-y-1">
      <span className="font-mono text-[28px] font-bold leading-none tracking-tight text-white">{value}</span>
      {unit && <span className="pb-0.5 text-[11px] font-semibold text-slate-400">{unit}</span>}
      {badge}
    </div>
    <div className="mt-2 space-y-0.5 text-[11px] text-slate-400">
      {lines.map((l, i) => (
        <p key={i} className="truncate">
          {l}
        </p>
      ))}
    </div>
    {spark && <div className="mt-2">{spark}</div>}
    <div className="mt-2 flex items-center gap-1.5 border-t border-white/[0.06] pt-2 text-[10.5px] text-slate-500">
      <CalendarRange className="h-3 w-3" />
      <span className="truncate">{footer}</span>
    </div>
  </div>
);

const DeltaBadge: React.FC<{ pct: number | null | undefined }> = ({ pct }) => {
  if (pct === null || pct === undefined) return null;
  const up = pct > 0;
  const flat = Math.abs(pct) < 0.05;
  const color = flat ? "text-slate-300 bg-white/10" : up ? "text-rose-300 bg-rose-500/15" : "text-emerald-300 bg-emerald-500/15";
  const Icon = up ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`mb-0.5 inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10.5px] font-bold ${color}`}>
      {!flat && <Icon className="h-3 w-3" />}
      {flat ? "≈ 0 %" : fmtPct(pct)}
    </span>
  );
};

/* ---------------------------------- Filter bar ---------------------------------- */

const selectCls =
  "w-full rounded-lg border border-white/10 bg-[#0A1424] px-2.5 py-2 text-xs text-slate-100 focus:border-teal-400/60 focus:outline-none";

const Field: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="block min-w-0">
    <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
    {children}
  </label>
);

const ExecFilterBar: React.FC = () => {
  const { filters, options, updateFilter, setSource, resetFilters } = useGlobalFilters();
  return (
    <div className="animate-fade-up rounded-2xl border border-white/[0.07] bg-[#0B1628]/90 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-200">
          <Filter className="h-3.5 w-3.5 text-teal-300" />
          Filtres globaux
          <span className="ml-1 rounded-full border border-teal-400/25 bg-teal-400/10 px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-teal-200">
            01/01/2025 → 31/12/2026
          </span>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Réinitialiser
        </button>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        <Field label="Source">
          <select aria-label="Source de données" value={filters.source} onChange={(e) => setSource(e.target.value as SourceId)} className={selectCls}>
            {(options?.sources ?? [{ id: "wfp", label: "PAM Sénégal" }]).map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Produit">
          <select aria-label="Produit" value={filters.commodity} onChange={(e) => updateFilter("commodity", e.target.value)} className={selectCls}>
            <option value="ALL">Auto (le plus relevé)</option>
            {(options?.commodities ?? []).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Région">
          <select aria-label="Région" value={filters.region} onChange={(e) => updateFilter("region", e.target.value)} className={selectCls}>
            <option value="ALL">Toutes ({options?.regions.length ?? 0})</option>
            {(options?.regions ?? []).map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Marché">
          <select aria-label="Marché" value={filters.market} onChange={(e) => updateFilter("market", e.target.value)} className={selectCls}>
            <option value="ALL">Tous ({options?.markets.length ?? 0})</option>
            {(options?.markets ?? []).map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Catégorie">
          <select aria-label="Catégorie" value={filters.category} onChange={(e) => updateFilter("category", e.target.value)} className={selectCls}>
            <option value="ALL">Toutes</option>
            {(options?.categories ?? []).map((c) => (
              <option key={c} value={c}>
                {catLabel(c)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Année">
          <select aria-label="Année" value={filters.year} onChange={(e) => updateFilter("year", e.target.value)} className={selectCls}>
            <option value="">2025 + 2026</option>
            <option value="2025">2025</option>
            <option value="2026">2026</option>
          </select>
        </Field>
        <Field label="Période — début">
          <input
            type="date"
            aria-label="Date de début"
            value={filters.date_from}
            min="2025-01-01"
            max="2026-12-31"
            onChange={(e) => {
              updateFilter("year", "");
              updateFilter("date_from", e.target.value);
            }}
            className={`${selectCls} [color-scheme:dark]`}
          />
        </Field>
        <Field label="Période — fin">
          <input
            type="date"
            aria-label="Date de fin"
            value={filters.date_to}
            min="2025-01-01"
            max="2026-12-31"
            onChange={(e) => {
              updateFilter("year", "");
              updateFilter("date_to", e.target.value);
            }}
            className={`${selectCls} [color-scheme:dark]`}
          />
        </Field>
      </div>
    </div>
  );
};

/* ---------------------------------- Source coverage ---------------------------------- */

const CoverageStrip: React.FC<{ data: ExecutiveDashboardResponse; source: string }> = ({ data, source }) => {
  const cov = data.source_coverage;
  if (!cov) return null;
  const m26 = (l: string[]) => (l.length ? `${fmtMonth(l[0])} → ${fmtMonth(l[l.length - 1])}` : "aucun mois 2026");
  const items = [
    {
      id: ["wfp"],
      name: "PAM Sénégal",
      text: `${fmtDate(cov.wfp.date_min)} → ${fmtDate(cov.wfp.date_max)} · ${cov.wfp.months_count} mois · 2026 : ${m26(cov.wfp.available_2026_months)}`,
      ok: cov.wfp.rows > 0,
    },
    {
      id: ["rt_observed", "rt_model"],
      name: "Prix en temps réel",
      text: `${fmtDate(cov.rt.date_min)} → ${fmtDate(cov.rt.date_max)} · ${cov.rt.months_count} mois · 2026 : ${m26(cov.rt.available_2026_months)}`,
      ok: cov.rt.rows_long > 0,
    },
    {
      id: ["csa"],
      name: "BASE_BULLETIN",
      text: `0 observation en 2025–2026 (brut : ${frText(cov.bulletin.raw_coverage)})`,
      ok: false,
    },
  ];
  return (
    <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
      {items.map((it) => {
        const active = it.id.includes(source);
        return (
          <div
            key={it.name}
            className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-[11px] ${
              active ? "border-teal-400/40 bg-teal-400/[0.07]" : "border-white/[0.06] bg-white/[0.02]"
            }`}
          >
            <Database className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${it.ok ? "text-teal-300" : "text-amber-300"}`} />
            <div className="min-w-0">
              <p className="font-bold text-slate-200">
                {it.name}
                {active && <span className="ml-1.5 rounded bg-teal-400/20 px-1.5 py-px text-[9.5px] font-bold uppercase text-teal-200">active</span>}
              </p>
              <p className="truncate text-slate-400" title={it.text}>
                {it.text}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* ---------------------------------- Page ---------------------------------- */

export const ExecutiveDashboardPage: React.FC = () => {
  const { filters, updateFilter } = useGlobalFilters();
  const [horizon, setHorizon] = useState(6);
  const [data, setData] = useState<ExecutiveDashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [distMode, setDistMode] = useState<"category" | "commodity">("category");
  const [monthlyMode, setMonthlyMode] = useState<"compare" | "timeline">("compare");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api
      .getExecutiveDashboard(filters, horizon)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters, horizon]);

  const unit = data?.focus_unit ?? data?.meta?.unit ?? "FCFA/kg";

  const evolutionRows = useMemo(() => {
    if (!data || !data.price_evolution?.length) return [];
    const evo = data.price_evolution;
    const fc = data.forecast?.eligible ? data.forecast.series : [];
    const first = evo[0].ym;
    const lastObs = evo[evo.length - 1].ym;
    const last = fc.length ? fc[fc.length - 1].ym : lastObs;
    const byYm = new Map(evo.map((p) => [p.ym, p]));
    const fcByYm = new Map(fc.map((f) => [f.ym, f]));
    const anchorForecast = fc.length > 0 && addMonths(lastObs, 1) === fc[0].ym;
    const rows = monthRange(first, last).map((ym) => {
      const p = byYm.get(ym);
      const f = fcByYm.get(ym);
      return {
        ym,
        observed_2025: p?.observed_2025 ?? null,
        observed_2026: p?.observed_2026 ?? null,
        bridge: null as number | null,
        forecast: f?.forecast ?? null,
        band: f ? ([f.lower_95, f.upper_95] as [number, number]) : null,
        lower_95: f?.lower_95 ?? null,
        upper_95: f?.upper_95 ?? null,
        min: p?.min ?? null,
        max: p?.max ?? null,
        observations: p?.observations ?? 0,
        markets: p?.markets ?? 0,
        last_date: p?.last_date ?? null,
        is_forecast: !!f,
        missing: !p && !f,
      };
    });
    const iDec = rows.findIndex((r) => r.ym === "2025-12");
    if (iDec >= 0 && rows[iDec + 1] && rows[iDec].observed_2025 != null && rows[iDec + 1].observed_2026 != null) {
      rows[iDec].bridge = rows[iDec].observed_2025;
      rows[iDec + 1].bridge = rows[iDec + 1].observed_2026;
    }
    if (anchorForecast) {
      const a = rows.find((r) => r.ym === lastObs);
      if (a) {
        const v = a.observed_2026 ?? a.observed_2025;
        a.forecast = v;
        a.band = v != null ? [v, v] : null;
      }
    }
    return rows;
  }, [data]);

  const monthlyRows = useMemo(() => data?.monthly_comparison ?? [], [data]);

  const timelineRows = useMemo(() => {
    if (!data?.price_evolution?.length) return [];
    const evo = data.price_evolution;
    const byYm = new Map(evo.map((p) => [p.ym, p]));
    let prev: number | null = null;
    return monthRange(evo[0].ym, evo[evo.length - 1].ym).map((ym) => {
      const p = byYm.get(ym);
      const price = p?.price ?? null;
      const mom = price != null && prev != null && prev > 0 ? ((price / prev) - 1) * 100 : null;
      prev = price;
      return { ym, price, mom, year: Number(ym.slice(0, 4)), observations: p?.observations ?? 0, markets: p?.markets ?? 0, last_date: p?.last_date ?? null };
    });
  }, [data]);

  const momSpark = useMemo(() => timelineRows.map((r) => ({ v: r.mom })), [timelineRows]);

  if (loading && !data) {
    return (
      <div className="space-y-4">
        <ExecFilterBar />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-[210px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
          ))}
        </div>
        <div className="h-[380px] animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <ExecFilterBar />
        <div className="flex items-center gap-2 rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.empty || !data.kpis) {
    return (
      <div className="space-y-4">
        <ExecFilterBar />
        {data.source_coverage && <CoverageStrip data={data} source={filters.source} />}
        <div className="animate-fade-up rounded-2xl border border-amber-400/25 bg-amber-400/[0.06] p-6 text-slate-200">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Aucune observation réelle à afficher
          </div>
          <p className="mt-2 text-sm text-slate-300">{frText(data.empty_reason)}</p>
          <p className="mt-1 text-xs text-slate-400">
            Aucun indicateur n'est extrapolé : modifiez la source ou les filtres pour revenir sur un périmètre observé (01/01/2025 → 31/12/2026).
          </p>
        </div>
      </div>
    );
  }

  const k = data.kpis;
  const fc = k.forecast;
  const V = data.meta.is_estimated
    ? {
        scopeIntro: "Estimations modélisées (clôture) du",
        latestLabel: "Dernier prix estimé",
        latestSub: "Dernière estimation modélisée (clôture)",
        records: "estimations",
        recordsCap: "Estimations",
        marketsSub: "Marchés couverts (estimations modélisées)",
        series: "Estimé",
        meanPrice: "Prix moyen estimé (clôture)",
        dateLabel: "Date de l'estimation",
        latestPrice: "Dernière estimation",
        recordOf: "Estimation du",
        notRecorded: "non disponible",
        basis: "estimations modélisées (non assimilables à des prix relevés)",
      }
    : {
        scopeIntro: "Observations réelles du",
        latestLabel: "Dernier prix observé",
        latestSub: "Prix relevé le plus récent",
        records: "relevés",
        recordsCap: "Relevés",
        marketsSub: "Marchés actifs (relevés réels)",
        series: "Observé",
        meanPrice: "Prix moyen observé",
        dateLabel: "Date du relevé",
        latestPrice: "Dernier prix observé",
        recordOf: "Relevé du",
        notRecorded: "non observé",
        basis: "relevés réels",
      };
  const focus = data.focus_commodity ?? "";
  const reg = data.regional_comparison;
  const scopeLabel = [
    filters.market !== "ALL" ? `Marché ${filters.market}` : filters.region !== "ALL" ? `Région ${filters.region}` : "National",
    filters.year ? `Année ${filters.year}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const distData = distMode === "category"
    ? data.distribution.by_category.map((d) => ({ ...d, label: catLabel(d.name) }))
    : data.distribution.by_commodity.map((d) => ({ ...d, label: d.name }));

  const topItems = data.top_products.items;
  const topMax = Math.max(...topItems.map((i) => i.latest_price ?? 0), 1);

  const regionRows = reg.regions.map((r) => ({ ...r, value: r.latest_price ?? 0 }));
  const regionColor = (r: ExecutiveRegion) => {
    const g = r.gap_vs_reference_pct;
    if (g === null) return "#64748B";
    if (g >= 5) return C.red;
    if (g <= -5) return C.green;
    return C.yellow;
  };

  return (
    <div className="space-y-4 text-slate-200">
      {/* Hero */}
      <div className="animate-fade-up flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-teal-300">Tableau de bord exécutif</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-white sm:text-[28px]">
            {focus}
            <span className="ml-2 align-middle text-sm font-semibold text-slate-400">{scopeLabel}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            {data.focus_auto_selected ? "Produit sélectionné automatiquement (le plus relevé du périmètre). " : ""}
            {V.scopeIntro} {fmtDate(data.scope?.date_min)} au {fmtDate(data.scope?.date_max)} · {data.scope?.months_2025} mois en 2025, {data.scope?.months_2026} mois en 2026
            {data.scope && data.scope.missing_2026_months.length > 0 && (
              <> · mois 2026 non publiés : {data.scope.missing_2026_months.length} (jamais simulés)</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="h-4 w-4 animate-spin text-teal-300" />}
          <span
            className={`rounded-full border px-3 py-1 text-[10.5px] font-bold ${
              data.meta.is_estimated ? "border-amber-400/40 bg-amber-400/10 text-amber-200" : "border-teal-400/30 bg-teal-400/10 text-teal-200"
            }`}
          >
            {data.meta.is_estimated ? "Estimations modélisées (clôture)" : "Prix réellement observés"}
          </span>
        </div>
      </div>

      <ExecFilterBar />
      <CoverageStrip data={data} source={filters.source} />

      {/* indicateurs row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={V.latestLabel}
          sublabel={V.latestSub}
          icon={Tag}
          accent={C.turquoise}
          value={formatNumber(k.latest_price.value, 1)}
          unit={k.latest_price.unit}
          lines={[
            focus,
            k.latest_price.is_market_level
              ? `Marché ${filters.market}`
              : `Moyenne de ${k.latest_price.observations} ${V.records} · ${k.latest_price.markets_count} marché(s)`,
          ]}
          spark={<Sparkline data={data.price_evolution.map((p) => ({ v: p.price }))} color={C.turquoise} />}
          footer={<>Date de référence : <strong className="text-slate-300">{fmtDate(k.latest_price.date)}</strong></>}
          delay={0}
        />
        <KpiCard
          label="Variation mensuelle des prix"
          sublabel="Par rapport au mois précédent"
          icon={Activity}
          accent={C.yellow}
          value={k.monthly_change.value_pct === null ? "N/D" : fmtPct(k.monthly_change.value_pct, 2)}
          lines={
            k.monthly_change.previous_ym
              ? [
                  `${fmtMonth(k.monthly_change.previous_ym)} → ${fmtMonth(k.monthly_change.current_ym)}${k.monthly_change.consecutive ? "" : " (mois non consécutifs)"}`,
                  `${formatNumber(k.monthly_change.previous_price, 1)} → ${formatNumber(k.monthly_change.current_price, 1)} · ${k.monthly_change.matched_markets} marché(s) apparié(s)`,
                ]
              : ["Un seul mois observé : variation non calculable"]
          }
          spark={<Sparkline data={momSpark} color={C.yellow} />}
          footer={<>Comparaison {fmtMonth(k.monthly_change.previous_ym)} contre {fmtMonth(k.monthly_change.current_ym)}</>}
          delay={60}
        />
        <KpiCard
          label="Marchés actifs"
          sublabel={V.marketsSub}
          icon={Store}
          accent={C.blue}
          value={formatNumber(k.active_markets.value)}
          unit="marchés"
          lines={[
            `${k.active_markets.regions_count} région(s) · ${formatNumber(k.active_markets.observations)} ${V.records}`,
            `${k.active_markets.focus_markets} marché(s) couvrant ${focus}`,
          ]}
          spark={<Sparkline data={k.active_markets.by_month.map((m) => ({ v: m.markets }))} color={C.blue} type="bar" />}
          footer={<>Période : {fmtDate(k.active_markets.date_min)} → {fmtDate(k.active_markets.date_max)}</>}
          delay={120}
        />
        <KpiCard
          label={horizon === 6 ? "Prévision à six mois" : `Prévision à ${horizon} mois`}
          sublabel="Estimation par intelligence artificielle"
          icon={BrainCircuit}
          accent={C.green}
          value={fc.eligible ? formatNumber(fc.value, 1) : "N/D"}
          unit={fc.eligible ? unit : undefined}
          badge={fc.eligible ? <DeltaBadge pct={fc.delta_pct_vs_last} /> : undefined}
          lines={
            fc.eligible
              ? [
                  `${fc.model} · échéance ${fmtMonth(fc.target_ym)}`,
                  `Intervalle 95 % : ${formatNumber(fc.lower_95, 0)} – ${formatNumber(fc.upper_95, 0)} · EAMP ${formatNumber(fc.mape_pct, 1)} %`,
                ]
              : ["Prévision non fiable : historique insuffisant", `${fc.observed_months ?? 0} mois observés (min. 10 requis)`]
          }
          footer={
            fc.eligible ? (
              <>Estimation future — calibrée jusqu'au {fmtDate(fc.last_observed_date)}</>
            ) : (
              <>Aucune valeur n'est extrapolée</>
            )
          }
          delay={180}
        />
      </div>

      {/* Main chart + donut */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          delay={220}
          title="Évolution des prix et prévisions"
          subtitle={
            <>
              {focus} · moyenne mensuelle des {V.basis} ({unit}). Prévision calibrée sur tout l'historique 2025–2026 du périmètre
              {fc.eligible ? ` — ${fc.specification}` : ""}.
            </>
          }
          right={
            <Segmented
              ariaLabel="Horizon de prévision"
              value={String(horizon)}
              options={HORIZONS.map((h) => ({ id: String(h), label: `${h} m` }))}
              onChange={(id) => setHorizon(Number(id))}
            />
          }
        >
          <div className="mb-2 flex flex-wrap gap-3 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C.blue }} />{V.series} 2025</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C.turquoise }} />{V.series} 2026</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 border-t-2 border-dashed" style={{ borderColor: C.yellow }} />Prévision IA (estimée)</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm" style={{ background: `${C.yellow}33` }} />Intervalle de prévision à 95 %</span>
          </div>
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={evolutionRows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="g2025" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.blue} stopOpacity={0.28} />
                    <stop offset="100%" stopColor={C.blue} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2026" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.turquoise} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={C.turquoise} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={C.grid} vertical={false} />
                <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: C.grid }} minTickGap={12} />
                <YAxis
                  tick={{ fill: C.tick, fontSize: 10.5 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                  domain={[(min: number) => Math.floor(min * 0.94), (max: number) => Math.ceil(max * 1.04)]}
                  tickFormatter={(v) => formatNumber(v, 0)}
                />
                <Tooltip
                  cursor={{ stroke: "rgba(148,163,184,0.35)", strokeDasharray: "3 3" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as (typeof evolutionRows)[number];
                    if (r.is_forecast) {
                      return (
                        <TooltipShell title={<>{fmtMonth(label)} <span className="ml-1 rounded bg-yellow-400/15 px-1.5 text-[10px] text-yellow-200">Estimation par intelligence artificielle</span></>}>
                          <TRow color={C.yellow} label="Prévision" value={`${formatNumber(r.forecast, 1)} ${unit}`} />
                          <TRow label="Intervalle à 95 %" value={`${formatNumber(r.lower_95, 0)} – ${formatNumber(r.upper_95, 0)}`} />
                          <p className="pt-1 text-[10px] text-slate-500">Valeur future estimée — non observée.</p>
                        </TooltipShell>
                      );
                    }
                    if (r.missing) {
                      return (
                        <TooltipShell title={fmtMonth(label)}>
                          <p className="text-slate-400">Aucun relevé publié pour ce mois.</p>
                        </TooltipShell>
                      );
                    }
                    const v = r.observed_2026 ?? r.observed_2025;
                    return (
                      <TooltipShell title={<>{fmtMonth(label)} <span className="ml-1 rounded bg-white/10 px-1.5 text-[10px] text-slate-300">{V.series} {String(label).slice(0, 4)}</span></>}>
                        <TRow color={r.observed_2026 != null ? C.turquoise : C.blue} label={V.meanPrice} value={`${formatNumber(v, 1)} ${unit}`} />
                        <TRow label="Minimum – maximum des marchés" value={`${formatNumber(r.min, 0)} – ${formatNumber(r.max, 0)}`} />
                        <TRow label={`${V.recordsCap} / marchés`} value={`${r.observations} / ${r.markets}`} />
                        <TRow label={V.dateLabel} value={fmtDate(r.last_date)} />
                      </TooltipShell>
                    );
                  }}
                />
                <Area type="monotone" dataKey="band" stroke="none" fill={C.yellow} fillOpacity={0.13} connectNulls={false} isAnimationActive activeDot={false} />
                <Area type="monotone" dataKey="observed_2025" stroke={C.blue} strokeWidth={2.4} fill="url(#g2025)" dot={{ r: 2.5, fill: C.blue }} activeDot={{ r: 5 }} connectNulls={false} />
                <Area type="monotone" dataKey="observed_2026" stroke={C.turquoise} strokeWidth={2.4} fill="url(#g2026)" dot={{ r: 3, fill: C.turquoise }} activeDot={{ r: 5 }} connectNulls={false} />
                <Line type="monotone" dataKey="bridge" stroke="#64748B" strokeDasharray="2 3" strokeWidth={1.5} dot={false} activeDot={false} connectNulls />
                <Line type="monotone" dataKey="forecast" stroke={C.yellow} strokeWidth={2.4} strokeDasharray="6 4" dot={{ r: 2.5, fill: C.yellow }} activeDot={{ r: 5 }} connectNulls={false} />
                {fc.eligible && fc.series.length > 0 && (
                  <ReferenceLine x={fc.series[0].ym} stroke="rgba(250,204,21,0.35)" strokeDasharray="4 4" label={{ value: "Début prévision", fill: "#FDE68A", fontSize: 10, position: "insideTopLeft" }} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {!fc.eligible && (
            <p className="mt-2 flex items-start gap-1.5 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-3 py-2 text-[11px] text-amber-200">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {fc.reason}
            </p>
          )}
        </Panel>

        <Panel
          className="xl:col-span-4"
          delay={260}
          title="Répartition des produits"
          subtitle={`Part des ${V.basis} (nombre d'enregistrements), pas de chiffre d'affaires`}
          right={
            <Segmented
              ariaLabel="Répartition"
              value={distMode}
              options={[
                { id: "category", label: "Catégorie" },
                { id: "commodity", label: "Produit" },
              ]}
              onChange={(id) => setDistMode(id as "category" | "commodity")}
            />
          }
        >
          <div className="relative h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={distData}
                  dataKey="count"
                  nameKey="label"
                  innerRadius="62%"
                  outerRadius="92%"
                  paddingAngle={2}
                  stroke="#0B1628"
                  strokeWidth={2}
                  onClick={(d: { name?: string; payload?: { name: string } }) => {
                    const name = d?.payload?.name;
                    if (!name) return;
                    if (distMode === "category") updateFilter("category", filters.category === name ? "ALL" : name);
                    else updateFilter("commodity", filters.commodity === name ? "ALL" : name);
                  }}
                  className="cursor-pointer"
                >
                  {distData.map((d, i) => (
                    <Cell key={d.name} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as (typeof distData)[number];
                    return (
                      <TooltipShell title={d.label}>
                        <TRow label={V.recordsCap} value={formatNumber(d.count)} />
                        <TRow label="Part" value={`${formatNumber(d.pct, 1)} %`} />
                      </TooltipShell>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold text-white">{formatNumber(data.distribution.total)}</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500">{V.records}</span>
            </div>
          </div>
          <div className="mt-3 max-h-[150px] space-y-1.5 overflow-y-auto pr-1">
            {distData.map((d, i) => (
              <div key={d.name} className="flex items-center justify-between gap-2 text-[11px]">
                <span className="flex min-w-0 items-center gap-2 text-slate-300">
                  <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
                  <span className="truncate">{d.label}</span>
                </span>
                <span className="shrink-0 font-mono text-slate-400">
                  {formatNumber(d.count)} · <span className="text-slate-200">{formatNumber(d.pct, 1)} %</span>
                </span>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Monthly evolution + top products */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-7"
          delay={300}
          title="Évolution mensuelle des prix"
          subtitle={
            monthlyMode === "compare"
              ? `${focus} · barres = ${lcFirst(V.meanPrice)} par mois (2025 contre 2026) · courbe = écart 2026 / 2025 (%)`
              : `${focus} · barres = ${lcFirst(V.meanPrice)} par mois · courbe = variation mensuelle (%)`
          }
          right={
            <Segmented
              ariaLabel="Vue mensuelle"
              value={monthlyMode}
              options={[
                { id: "compare", label: "2025 contre 2026" },
                { id: "timeline", label: "Chronologique" },
              ]}
              onChange={(id) => setMonthlyMode(id as "compare" | "timeline")}
            />
          }
        >
          <div className="h-[330px]">
            <ResponsiveContainer width="100%" height="100%">
              {monthlyMode === "compare" ? (
                <ComposedChart data={monthlyRows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="month_label" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: C.grid }} />
                  <YAxis yAxisId="p" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => formatNumber(v, 0)} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${formatNumber(v, 1)} %`} />
                  <ReferenceLine yAxisId="pct" y={0} stroke="rgba(148,163,184,0.25)" />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as (typeof monthlyRows)[number];
                      return (
                        <TooltipShell title={r.month_label}>
                          <TRow color={C.blue} label="2025" value={r.price_2025 != null ? `${formatNumber(r.price_2025, 1)} ${unit}` : V.notRecorded} />
                          {r.date_2025 && <TRow label={V.dateLabel} value={`${fmtDate(r.date_2025)} (${r.obs_2025})`} />}
                          <TRow color={C.turquoise} label="2026" value={r.price_2026 != null ? `${formatNumber(r.price_2026, 1)} ${unit}` : r.missing_2026 ? "non publié" : "—"} />
                          {r.date_2026 && <TRow label={V.dateLabel} value={`${fmtDate(r.date_2026)} (${r.obs_2026})`} />}
                          <TRow color={C.yellow} label="Écart 2026/2025" value={fmtPct(r.yoy_pct, 2)} />
                        </TooltipShell>
                      );
                    }}
                  />
                  <Bar yAxisId="p" dataKey="price_2025" name="2025" fill={C.blue} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Bar yAxisId="p" dataKey="price_2026" name="2026" fill={C.turquoise} radius={[4, 4, 0, 0]} maxBarSize={18} />
                  <Line yAxisId="pct" type="monotone" dataKey="yoy_pct" stroke={C.yellow} strokeWidth={2.2} dot={{ r: 3.5, fill: C.yellow }} connectNulls={false} />
                </ComposedChart>
              ) : (
                <ComposedChart data={timelineRows} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke={C.grid} vertical={false} />
                  <XAxis dataKey="ym" tickFormatter={fmtMonth} tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={{ stroke: C.grid }} minTickGap={10} />
                  <YAxis yAxisId="p" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => formatNumber(v, 0)} />
                  <YAxis yAxisId="pct" orientation="right" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `${formatNumber(v, 1)} %`} />
                  <ReferenceLine yAxisId="pct" y={0} stroke="rgba(148,163,184,0.25)" />
                  <Tooltip
                    cursor={{ fill: "rgba(148,163,184,0.06)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const r = payload[0].payload as (typeof timelineRows)[number];
                      return (
                        <TooltipShell title={`${fmtMonth(r.ym)} · ${lcFirst(V.series)} ${r.year}`}>
                          <TRow color={r.year === 2026 ? C.turquoise : C.blue} label={V.meanPrice} value={r.price != null ? `${formatNumber(r.price, 1)} ${unit}` : V.notRecorded} />
                          <TRow color={C.yellow} label="Variation mensuelle" value={fmtPct(r.mom, 2)} />
                          <TRow label={`${V.recordsCap} / marchés`} value={`${r.observations} / ${r.markets}`} />
                          <TRow label={V.dateLabel} value={fmtDate(r.last_date)} />
                        </TooltipShell>
                      );
                    }}
                  />
                  <Bar yAxisId="p" dataKey="price" radius={[4, 4, 0, 0]} maxBarSize={22}>
                    {timelineRows.map((r) => (
                      <Cell key={r.ym} fill={r.year === 2026 ? C.turquoise : C.blue} />
                    ))}
                  </Bar>
                  <Line yAxisId="pct" type="monotone" dataKey="mom" stroke={C.yellow} strokeWidth={2.2} dot={{ r: 3, fill: C.yellow }} connectNulls={false} />
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.blue }} />{V.series} 2025</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.turquoise }} />{V.series} 2026</span>
            <span className="flex items-center gap-1.5"><span className="h-0.5 w-4 rounded" style={{ background: C.yellow }} />{monthlyMode === "compare" ? "Écart 2026 / 2025" : "Variation mensuelle"}</span>
          </div>
        </Panel>

        <Panel
          className="xl:col-span-5"
          delay={340}
          title="Classement des produits"
          subtitle={`${V.latestPrice} par produit · unité homogène ${data.top_products.unit} · variation sur marchés appariés · cliquer pour filtrer`}
        >
          <div className="max-h-[338px] space-y-1.5 overflow-y-auto pr-1 [scrollbar-color:#1E3A5F_transparent]">
            {topItems.map((it, i) => (
              <button
                key={it.commodity}
                type="button"
                onClick={() => updateFilter("commodity", it.is_focus && filters.commodity !== "ALL" ? "ALL" : it.commodity)}
                className={`group w-full rounded-xl border px-3 py-1.5 text-left transition ${
                  it.is_focus ? "border-teal-400/40 bg-teal-400/[0.07]" : "border-white/[0.05] bg-white/[0.015] hover:border-white/15 hover:bg-white/[0.04]"
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-[11.5px]">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="w-4 shrink-0 font-mono text-[10px] text-slate-500">{i + 1}</span>
                    <span className="truncate font-semibold text-slate-100">{it.commodity}</span>
                  </span>
                  <span className="shrink-0 font-mono font-bold text-white">
                    {formatNumber(it.latest_price, 1)} <span className="text-[10px] font-medium text-slate-500">{it.unit}</span>
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${((it.latest_price ?? 0) / topMax) * 100}%`,
                      background: `linear-gradient(90deg, ${C.blue}, ${it.is_focus ? C.turquoise : C.sky})`,
                    }}
                  />
                </div>
                <div className="mt-1 flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {V.recordOf} {fmtDate(it.latest_date)} · {it.markets} marché(s)
                  </span>
                  {it.change_pct !== null && (
                    <span className={it.change_pct > 0.05 ? "text-rose-300" : it.change_pct < -0.05 ? "text-emerald-300" : "text-slate-400"}>
                      {fmtPct(it.change_pct)} par rapport au mois précédent
                    </span>
                  )}
                </div>
              </button>
            ))}
            {data.top_products.excluded_incompatible_units.length > 0 && (
              <p className="text-[10.5px] text-slate-500">
                Exclus (unité non comparable) : {data.top_products.excluded_incompatible_units.join(", ")}
              </p>
            )}
          </div>
        </Panel>
      </div>

      {/* Regional comparison + map */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
        <Panel
          className="xl:col-span-6"
          delay={380}
          title="Comparaison des prix par région"
          subtitle={
            <>
              {focus} · {lcFirst(V.latestPrice)} par région ({reg.regions.length} région(s)) · écart par rapport à la moyenne nationale de {fmtMonth(reg.reference_ym)} (
              {formatNumber(reg.reference_price, 1)} {unit}) · cliquer pour filtrer
            </>
          }
        >
          <div style={{ height: Math.max(220, regionRows.length * 27 + 30) }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={regionRows} layout="vertical" margin={{ top: 4, right: 52, bottom: 0, left: 0 }}>
                <CartesianGrid stroke={C.grid} horizontal={false} />
                <XAxis type="number" tick={{ fill: C.tick, fontSize: 10.5 }} tickLine={false} axisLine={false} tickFormatter={(v) => formatNumber(v, 0)} />
                <YAxis type="category" dataKey="region" width={96} tick={{ fill: "#CBD5E1", fontSize: 10.5 }} tickLine={false} axisLine={false} />
                {reg.reference_price != null && (
                  <ReferenceLine x={reg.reference_price} stroke="rgba(226,232,240,0.5)" strokeDasharray="4 4" label={{ value: "National", fill: "#CBD5E1", fontSize: 10, position: "top" }} />
                )}
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.06)" }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const r = payload[0].payload as ExecutiveRegion;
                    return (
                      <TooltipShell title={r.region}>
                        <TRow color={regionColor(r)} label={V.latestPrice} value={`${formatNumber(r.latest_price, 1)} ${unit}`} />
                        <TRow label={V.dateLabel} value={fmtDate(r.latest_date)} />
                        <TRow label={`Écart par rapport au national (${fmtMonth(reg.reference_ym)})`} value={fmtPct(r.gap_vs_reference_pct)} />
                        <p className="pt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">Marchés associés ({r.markets.length})</p>
                        {r.markets.slice(0, 6).map((m) => (
                          <TRow key={m.market} label={m.market} value={`${formatNumber(m.price, 0)} · ${fmtDate(m.date)}`} />
                        ))}
                        {r.markets.length > 6 && <p className="text-[10px] text-slate-500">+ {r.markets.length - 6} autre(s)</p>}
                        {!r.is_reference_month && (
                          <p className="pt-1 text-[10px] text-amber-300">Pas de relevé en {fmtMonth(reg.reference_ym)} : écart non calculé.</p>
                        )}
                      </TooltipShell>
                    );
                  }}
                />
                <Bar
                  dataKey="value"
                  radius={[0, 5, 5, 0]}
                  maxBarSize={16}
                  className="cursor-pointer"
                  onClick={(d: { payload?: ExecutiveRegion }) => {
                    const name = d?.payload?.region;
                    if (name) updateFilter("region", filters.region === name ? "ALL" : name);
                  }}
                  label={{ position: "right", fill: "#94A3B8", fontSize: 10, formatter: (v: number) => formatNumber(v, 0) }}
                >
                  {regionRows.map((r) => (
                    <Cell
                      key={r.region}
                      fill={regionColor(r)}
                      fillOpacity={filters.region === "ALL" || r.is_selected ? 0.85 : 0.3}
                      stroke={r.is_selected ? "#fff" : "none"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.red }} />≥ +5 % par rapport au national</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.yellow }} />± 5 %</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C.green }} />≤ −5 %</span>
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-slate-500" />Non relevé au mois de référence</span>
          </div>
        </Panel>

        <section className="animate-fade-up xl:col-span-6" style={{ animationDelay: "420ms" }}>
          {data.meta.has_coordinates && data.map_markets.length > 0 ? (
            <SenegalMap
              markets={data.map_markets}
              unit={unit}
              nationalMean={reg.reference_price ?? undefined}
              selectedMarket={filters.market === "ALL" ? null : filters.market}
              onSelectMarket={(m) => updateFilter("market", m ?? "ALL")}
            />
          ) : (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-2xl border border-white/[0.07] bg-[#0B1628]/90 p-6 text-sm text-slate-400">
              <MapPin className="mr-2 h-4 w-4" />
              Coordonnées non disponibles pour cette source.
            </div>
          )}
        </section>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[11px] text-slate-400">
        <span>
          Toutes les valeurs proviennent des {V.basis} — {data.meta.source_label} sur la période officielle {data.official_period}. Les prévisions sont des estimations
          distinctes des observations.
        </span>
        <span className="flex gap-3">
          <Link to="/analyses" className="font-semibold text-teal-300 hover:text-teal-200">Analyses détaillées →</Link>
          <Link to="/forecast" className="font-semibold text-teal-300 hover:text-teal-200">Moteur de prévision IA →</Link>
        </span>
      </div>
    </div>
  );
};

export default ExecutiveDashboardPage;
