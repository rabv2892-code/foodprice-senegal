import React, { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { api } from "../api/client";
import { BulletinUnavailableCard } from "../components/BulletinUnavailableCard";

export const CommoditiesPage: React.FC = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getBulletinCommodities()
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

  if (loading && !data) {
    return <div className="h-64 animate-pulse rounded-xl bg-slate-200/70" />;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="text-xs text-slate-600">
          <strong className="text-navy-900">BASE_BULLETIN.xlsx — COURS_MAT_PREMIERE</strong> • Filtrage strict :{" "}
          <span className="font-semibold text-emerald-700">janvier 2025 – décembre 2026</span>
        </div>
        <a
          href={api.bulletinCsvUrl("commodities")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800"
        >
          <Download className="h-3.5 w-3.5 text-emerald-400" />
          Exporter CSV (0 ligne 2025–2026)
        </a>
      </div>

      <BulletinUnavailableCard
        sheetName={data?.sheet ?? "COURS_MAT_PREMIERE"}
        rawCoverage={data?.raw_coverage ?? "01/2016 → 08/2022"}
        notice={
          data?.notice ??
          "La feuille COURS_MAT_PREMIERE de BASE_BULLETIN.xlsx ne contient aucune colonne ni observation pour 2025 et 2026."
        }
      />
    </div>
  );
};
