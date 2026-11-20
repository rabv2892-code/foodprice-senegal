import React, { useEffect, useState } from "react";
import { Download, Sprout } from "lucide-react";
import { api } from "../api/client";
import { BulletinUnavailableCard } from "../components/BulletinUnavailableCard";

export const ProductionPage: React.FC = () => {
  const [tab, setTab] = useState<"horti" | "elevage">("horti");
  const [horti, setHorti] = useState<any>(null);
  const [elevage, setElevage] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([api.getBulletinHorticulture(), api.getBulletinLivestock()])
      .then(([h, e]) => {
        if (!active) return;
        setHorti(h);
        setElevage(e);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const current = tab === "horti" ? horti : elevage;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex items-center gap-2">
          <Sprout className="h-5 w-5 text-emerald-600" />
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setTab("horti")}
              className={`rounded-md px-3.5 py-1.5 transition ${
                tab === "horti" ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"
              }`}
            >
              Production Horticole (PROD_HORTI)
            </button>
            <button
              type="button"
              onClick={() => setTab("elevage")}
              className={`rounded-md px-3.5 py-1.5 transition ${
                tab === "elevage" ? "bg-navy-900 text-white" : "text-slate-600 hover:text-navy-900"
              }`}
            >
              Production Élevage (PROD_ELEVAGE)
            </button>
          </div>
        </div>

        <a
          href={api.bulletinCsvUrl(tab === "horti" ? "horticulture" : "livestock")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800"
        >
          <Download className="h-3.5 w-3.5 text-emerald-400" />
          Exporter CSV (0 ligne 2025–2026)
        </a>
      </div>

      {loading ? (
        <div className="h-64 animate-pulse rounded-xl bg-slate-200/70" />
      ) : (
        <BulletinUnavailableCard
          sheetName={current?.sheet ?? (tab === "horti" ? "PROD_HORTI" : "PROD_ELEVAGE")}
          rawCoverage={current?.raw_coverage ?? (tab === "horti" ? "Campagnes 2016/2017 → 2021/2022" : "01/2016 → 08/2022")}
          notice={
            current?.notice ??
            "Cette feuille de BASE_BULLETIN.xlsx s'arrête avant 2025 et comporte exactement 0 observation sur la période officielle 2025–2026."
          }
        />
      )}
    </div>
  );
};
