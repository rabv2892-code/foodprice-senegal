import React from "react";
import { CalendarOff, ShieldCheck } from "lucide-react";

interface BulletinUnavailableCardProps {
  sheetName: string;
  rawCoverage: string;
  notice: string;
}

export const BulletinUnavailableCard: React.FC<BulletinUnavailableCardProps> = ({
  sheetName,
  rawCoverage,
  notice,
}) => {
  return (
    <div className="rounded-2xl border border-amber-200 bg-white p-6 shadow-card">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <CalendarOff className="h-6 w-6" />
          </div>
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-navy-900 px-2.5 py-0.5 font-mono text-[11px] font-bold text-white">
                {sheetName}
              </span>
              <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                0 observation sur janvier 2025 – décembre 2026
              </span>
            </div>
            <h3 className="mt-2.5 text-base font-extrabold text-navy-900">
              Aucune donnée 2025–2026 disponible dans BASE_BULLETIN.xlsx pour cette feuille
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">{notice}</p>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-navy-900">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            <span>Couverture brute vérifiée</span>
          </div>
          <p className="mt-1 font-mono text-slate-700">{rawCoverage}</p>
          <p className="mt-1 text-[11px] text-slate-500">
            Conformément à la règle officielle, aucune année antérieure à 2025 n'est affichée ni extrapolée.
          </p>
        </div>
      </div>
    </div>
  );
};
