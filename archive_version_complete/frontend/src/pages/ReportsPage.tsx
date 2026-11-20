import React, { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { api, formatNumber } from "../api/client";
import { ChartCard } from "../components/ChartCard";
import { FilterBar } from "../components/FilterBar";
import { useGlobalFilters } from "../context/FilterContext";
import type { OverviewResponse } from "../types";

export const ReportsPage: React.FC = () => {
  const { filters } = useGlobalFilters();
  const [horizon, setHorizon] = useState<number>(6);
  const [preview, setPreview] = useState<OverviewResponse | null>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    api.getOverview(filters).then((res) => {
      if (active) setPreview(res);
    });
    return () => {
      active = false;
    };
  }, [filters]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    setPdfError(null);
    try {
      await api.downloadPdfReport({
        source: filters.source,
        commodity: filters.commodity !== "ALL" ? filters.commodity : undefined,
        region: filters.region !== "ALL" ? filters.region : undefined,
        market: filters.market !== "ALL" ? filters.market : undefined,
        horizon,
      });
    } catch (e: any) {
      setPdfError(e?.message ?? "Erreur lors de la génération du PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const bulletinSheets = [
    { key: "csa", label: "1. PRIX_kg_CONS_CSA (CSV)" },
    { key: "commodities", label: "2. COURS_MAT_PREMIERE (CSV)" },
    { key: "horticulture", label: "3. PROD_HORTI (CSV)" },
    { key: "livestock", label: "4. PROD_ELEVAGE (CSV)" },
    { key: "senelec", label: "5. DONNEES_SENELEC (CSV)" },
    { key: "air-transport", label: "6. DONNES_TRANS_AERIEN (CSV)" },
    { key: "maritime-transport", label: "7. DONNES_TRANS_MARIT (CSV)" },
  ];

  return (
    <div className="space-y-5">
      <FilterBar />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
        {/* PDF & Excel Generator */}
        <ChartCard
          title="Générateur de Rapports Décisionnels (PDF, Excel Multi-Feuilles, CSV)"
          subtitle="Génération dynamique basée strictement sur les calculs réels et les filtres sélectionnés"
          className="lg:col-span-7"
        >
          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs">
              <p className="font-bold text-navy-900">Périmètre inclus dans le rapport :</p>
              <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3 text-slate-700">
                <div><strong>Source :</strong> {preview?.meta.source_label ?? filters.source}</div>
                <div><strong>Région :</strong> {filters.region === "ALL" ? "Toutes" : filters.region}</div>
                <div><strong>Marché :</strong> {filters.market === "ALL" ? "Tous" : filters.market}</div>
                <div><strong>Produit :</strong> {filters.commodity === "ALL" ? "Tous / Principal" : filters.commodity}</div>
                <div><strong>Observations :</strong> {formatNumber(preview?.kpis.total_observations)}</div>
                <div><strong>Prix moyen :</strong> {formatNumber(preview?.kpis.mean_price, 1)} {preview?.kpis.unit}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-xs font-semibold text-slate-700">
                Horizon de prévision IA à intégrer :
              </label>
              <select
                aria-label="Horizon rapport"
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-navy-900"
              >
                {[1, 3, 6, 12].map((h) => (
                  <option key={h} value={h}>
                    {h} mois
                  </option>
                ))}
              </select>
            </div>

            {pdfError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                {pdfError}
              </div>
            )}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <button
                type="button"
                disabled={downloadingPdf}
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-navy-800 disabled:opacity-60"
              >
                {downloadingPdf ? (
                  <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                ) : (
                  <FileText className="h-4 w-4 text-emerald-400" />
                )}
                {downloadingPdf ? "Génération PDF..." : "Télécharger Rapport PDF"}
              </button>

              <a
                href={api.excelExportUrl({
                  source: filters.source,
                  region: filters.region,
                  market: filters.market,
                  commodity: filters.commodity,
                  year: filters.year,
                  horizon,
                })}
                className="flex items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-3 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <FileSpreadsheet className="h-4 w-4" />
                Exporter Excel (.xlsx)
              </a>

              <a
                href={api.csvExportUrl(filters)}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-xs font-bold text-navy-900 shadow-sm transition hover:bg-slate-50"
              >
                <Download className="h-4 w-4 text-sky-600" />
                Exporter Données CSV
              </a>
            </div>
          </div>
        </ChartCard>

        {/* Report Contents Outline */}
        <ChartCard
          title="Sommaire du Rapport PDF & Classeur Excel"
          subtitle="Architecture conforme au cahier des charges scientifique"
          className="lg:col-span-5"
        >
          <ul className="space-y-2 text-xs text-slate-700">
            <li><strong>1. Introduction &amp; Problématique :</strong> enjeux de volatilité au Sénégal.</li>
            <li><strong>2. Sources &amp; Qualité :</strong> audit des 3 bases et scores qualité.</li>
            <li><strong>3. Méthodologie :</strong> séparation des observations, estimations modélisées et unités.</li>
            <li><strong>4. Analyse statistique :</strong> moyenne, médiane, variance, quartiles, CV%, interprétations.</li>
            <li><strong>5. Analyse géographique :</strong> classement et écarts des 14 régions.</li>
            <li><strong>6. Prévisions par intelligence artificielle et validation :</strong> comparaison Holt-Winters / ARIMA / SARIMA / Prophet, EAM, REQM, EAMP, intervalle 95 %.</li>
            <li><strong>7. Conclusion :</strong> recommandations opérationnelles documentées.</li>
          </ul>
        </ChartCard>
      </div>

      {/* Direct Exports for all 7 Excel Bulletin Sheets */}
      <ChartCard
        title="Exportations des 7 feuilles BASE_BULLETIN.xlsx (Filtrées janvier 2025 – décembre 2026)"
        subtitle="Ces feuilles s'arrêtant en 2022 dans la source brute, leur export filtré 2025–2026 contient 0 ligne (en-têtes normalisés uniquement)"
      >
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {bulletinSheets.map((s) => (
            <a
              key={s.key}
              href={api.bulletinCsvUrl(s.key)}
              className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-navy-900 transition hover:border-navy-700 hover:bg-white"
            >
              <span>{s.label}</span>
              <Download className="h-4 w-4 text-emerald-600" />
            </a>
          ))}
        </div>
      </ChartCard>
    </div>
  );
};
