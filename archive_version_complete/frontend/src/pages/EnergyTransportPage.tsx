import React, { useEffect, useState } from "react";
import { Download, Plane, Ship, Shuffle, Zap } from "lucide-react";
import { api } from "../api/client";
import { BulletinUnavailableCard } from "../components/BulletinUnavailableCard";

export const EnergyTransportPage: React.FC = () => {
  const [tab, setTab] = useState<"senelec" | "air" | "marit" | "cross">("senelec");
  const [senelec, setSenelec] = useState<any>(null);
  const [air, setAir] = useState<any>(null);
  const [marit, setMarit] = useState<any>(null);
  const [cross, setCross] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      api.getBulletinSenelec(),
      api.getBulletinAir(),
      api.getBulletinMaritime(),
      api.getBulletinCross(),
    ])
      .then(([s, a, m, c]) => {
        if (!active) return;
        setSenelec(s);
        setAir(a);
        setMarit(m);
        setCross(c);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const exportMap: Record<string, string> = {
    senelec: "senelec",
    air: "air-transport",
    marit: "maritime-transport",
    cross: "csa",
  };

  const currentMap: Record<string, { data: any; fallbackSheet: string; fallbackRaw: string }> = {
    senelec: { data: senelec, fallbackSheet: "DONNEES_SENELEC", fallbackRaw: "01/2016 → 08/2022" },
    air: { data: air, fallbackSheet: "DONNES_TRANS_AERIEN", fallbackRaw: "01/2016 → 08/2022" },
    marit: { data: marit, fallbackSheet: "DONNES_TRANS_MARIT", fallbackRaw: "01/2016 → 08/2022" },
    cross: { data: cross, fallbackSheet: "Analyse croisée BASE_BULLETIN", fallbackRaw: "01/2016 → 08/2022" },
  };
  const activeEntry = currentMap[tab];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab("senelec")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
              tab === "senelec" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Zap className="h-4 w-4 text-amber-400" />
            Énergie (SENELEC)
          </button>
          <button
            type="button"
            onClick={() => setTab("air")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
              tab === "air" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Plane className="h-4 w-4 text-sky-400" />
            Transport Aérien
          </button>
          <button
            type="button"
            onClick={() => setTab("marit")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
              tab === "marit" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Ship className="h-4 w-4 text-emerald-400" />
            Transport Maritime
          </button>
          <button
            type="button"
            onClick={() => setTab("cross")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 transition ${
              tab === "cross" ? "bg-navy-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Shuffle className="h-4 w-4 text-emerald-400" />
            Corrélations croisées (2025–2026)
          </button>
        </div>

        <a
          href={api.bulletinCsvUrl(exportMap[tab])}
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
          sheetName={activeEntry.data?.sheet ?? activeEntry.fallbackSheet}
          rawCoverage={activeEntry.data?.raw_coverage ?? activeEntry.fallbackRaw}
          notice={
            activeEntry.data?.notice ??
            "Aucune donnée 2025–2026 n'est disponible dans BASE_BULLETIN.xlsx ; les années antérieures à 2025 sont exclues de l'affichage."
          }
        />
      )}
    </div>
  );
};
