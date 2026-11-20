import React from "react";
import { AlertTriangle, CalendarCheck2, CheckCircle2, Info } from "lucide-react";
import type { SourceMeta } from "../types";
import { fmtDate, fmtMonths } from "../lib/fr";

interface DataNatureBadgeProps {
  meta?: SourceMeta | null;
  stageNotice?: string | null;
}

export const DataNatureBadge: React.FC<DataNatureBadgeProps> = ({ meta, stageNotice }) => {
  if (!meta) return null;

  const isEmpty = Boolean(meta.empty_reason);

  return (
    <div className="space-y-2">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-xs ${
          isEmpty
            ? "border-slate-300 bg-slate-100 text-slate-800"
            : meta.is_estimated
            ? "border-amber-200 bg-amber-50/90 text-amber-900"
            : "border-emerald-200 bg-emerald-50/80 text-emerald-900"
        }`}
      >
        <div className="flex flex-wrap items-center gap-2">
          {isEmpty ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          ) : meta.is_estimated ? (
            <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
          ) : (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          )}
          <span className="font-semibold">{meta.source_label}</span>
          <span className="hidden sm:inline text-slate-400">•</span>
          <span>{meta.data_nature}</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {meta.actual_min_date && meta.actual_max_date && (
            <span className="inline-flex items-center gap-1 rounded-md bg-white/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy-900 shadow-sm">
              <CalendarCheck2 className="h-3 w-3 text-emerald-600" />
              {fmtDate(meta.actual_min_date)} → {fmtDate(meta.actual_max_date)}
            </span>
          )}
          <span className="rounded-md bg-white/90 px-2 py-0.5 font-mono text-[11px] font-semibold text-navy-900 shadow-sm">
            Unité : {meta.unit}
          </span>
          <span
            className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${
              isEmpty
                ? "bg-slate-200 text-slate-800"
                : meta.is_estimated
                ? "bg-amber-200/70 text-amber-950"
                : "bg-emerald-200/70 text-emerald-950"
            }`}
          >
            {isEmpty ? "0 obs. en 2025–2026" : meta.is_estimated ? "Série modélisée (estimations)" : "Observations réelles"}
          </span>
        </div>
      </div>

      {meta.missing_2026_months && meta.missing_2026_months.length > 0 && !isEmpty && (
        <div className="flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50/80 px-4 py-2 text-[11.5px] text-sky-950">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sky-600" />
          <span>
            <strong>Couverture réelle 2025–2026 :</strong> {meta.months_2025_count ?? 12} mois en 2025 et{" "}
            {meta.months_2026_count ?? 0} mois réellement observés en 2026 ({fmtMonths(meta.available_2026_months)}).
            Les mois absents ({fmtMonths(meta.missing_2026_months)}) ne figurent pas dans la source et ne sont jamais inventés.
          </span>
        </div>
      )}

      {stageNotice && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <span>{stageNotice}</span>
        </div>
      )}
    </div>
  );
};
