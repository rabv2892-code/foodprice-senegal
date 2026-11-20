import type {
  ExecutiveDashboardResponse,
  ExplorerResponse,
  FilterOptionsResponse,
  ForecastResponse,
  GeoAnalysisResponse,
  GlobalFiltersState,
  OverviewResponse,
} from "../types";

const API_BASE = "/api";

function buildQuery(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "" && v !== "ALL") {
      sp.set(k, String(v));
    }
  });
  // Always keep source when provided even if handled above
  if (params.source) {
    sp.set("source", String(params.source));
  }
  const qs = sp.toString();
  return qs ? `?${qs}` : "";
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Impossible de joindre le serveur. Vérifiez votre connexion puis réessayez.");
  }
  if (!res.ok) {
    let msg = `Erreur du serveur (code ${res.status})`;
    try {
      const data = await res.json();
      if (typeof data?.detail === "string") msg = data.detail;
      else if (Array.isArray(data?.detail)) msg = "Paramètres de requête invalides : vérifiez les filtres sélectionnés.";
    } catch {
      // réponse non JSON : on garde le message générique
    }
    throw new Error(msg);
  }
  return (await res.json()) as T;
}

export const api = {
  health: () => fetchJson<{ status: string; prophet_available: boolean; version: string }>(`${API_BASE}/health`),

  getFilters: (source: string, region?: string, category?: string) =>
    fetchJson<FilterOptionsResponse>(
      `${API_BASE}/filters${buildQuery({ source, region, category })}`
    ),

  getOverview: (filters: GlobalFiltersState) =>
    fetchJson<OverviewResponse>(
      `${API_BASE}/overview${buildQuery({
        source: filters.source,
        region: filters.region,
        market: filters.market,
        commodity: filters.commodity,
        category: filters.category,
        year: filters.year ? Number(filters.year) : undefined,
        date_from: filters.date_from,
        date_to: filters.date_to,
        price_stage: filters.price_stage,
      })}`
    ),

  getExecutiveDashboard: (filters: GlobalFiltersState, horizon = 6) =>
    fetchJson<ExecutiveDashboardResponse>(
      `${API_BASE}/executive/dashboard${buildQuery({
        source: filters.source,
        region: filters.region,
        market: filters.market,
        commodity: filters.commodity,
        category: filters.category,
        year: filters.year ? Number(filters.year) : undefined,
        date_from: filters.date_from,
        date_to: filters.date_to,
        horizon,
      })}`
    ),

  getExplorer: (filters: GlobalFiltersState, page = 1, pageSize = 50, search = "") =>
    fetchJson<ExplorerResponse>(
      `${API_BASE}/explorer${buildQuery({
        source: filters.source,
        region: filters.region,
        market: filters.market,
        commodity: filters.commodity,
        category: filters.category,
        year: filters.year ? Number(filters.year) : undefined,
        date_from: filters.date_from,
        date_to: filters.date_to,
        price_stage: filters.price_stage,
        page,
        page_size: pageSize,
        search,
      })}`
    ),

  getPriceAnalysis: (params: {
    source: string;
    commodity?: string;
    region?: string;
    market?: string;
    date_from?: string;
    date_to?: string;
  }) => fetchJson<any>(`${API_BASE}/prices/analysis${buildQuery(params)}`),

  getProductsAnalysis: (params: {
    source: string;
    region?: string;
    date_from?: string;
    date_to?: string;
  }) => fetchJson<any>(`${API_BASE}/products/analysis${buildQuery(params)}`),

  getGeoAnalysis: (params: {
    source: string;
    commodity?: string;
    year?: string | number;
    date_from?: string;
    date_to?: string;
  }) => fetchJson<GeoAnalysisResponse>(`${API_BASE}/geo/analysis${buildQuery(params)}`),

  getTemporalAnalysis: (params: {
    source: string;
    commodity?: string;
    region?: string;
    market?: string;
  }) => fetchJson<any>(`${API_BASE}/temporal/analysis${buildQuery(params)}`),

  getMarketsComparison: (params: {
    source: string;
    markets?: string[];
    commodity?: string;
    date_from?: string;
    date_to?: string;
  }) =>
    fetchJson<any>(
      `${API_BASE}/markets/compare${buildQuery({
        source: params.source,
        markets: params.markets && params.markets.length ? params.markets.join(",") : undefined,
        commodity: params.commodity,
        date_from: params.date_from,
        date_to: params.date_to,
      })}`
    ),

  getStatisticalStudy: (params: {
    source: string;
    commodity?: string;
    region?: string;
    market?: string;
    date_from?: string;
    date_to?: string;
  }) => fetchJson<any>(`${API_BASE}/stats/study${buildQuery(params)}`),

  getForecastOptions: (source: string) =>
    fetchJson<any>(`${API_BASE}/forecast/options${buildQuery({ source })}`),

  runForecast: (payload: {
    source: string;
    commodity?: string;
    region?: string;
    market?: string;
    horizon: number;
  }) =>
    fetchJson<ForecastResponse>(`${API_BASE}/forecast/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),

  getBulletinCsa: (params: { region?: string; commodity?: string; price_stage?: string }) =>
    fetchJson<OverviewResponse>(`${API_BASE}/bulletin/csa${buildQuery(params)}`),

  getBulletinCommodities: (commodity?: string) =>
    fetchJson<any>(`${API_BASE}/bulletin/commodities${commodity ? `?commodity=${encodeURIComponent(commodity)}` : ""}`),

  getBulletinHorticulture: () => fetchJson<any>(`${API_BASE}/bulletin/horticulture`),
  getBulletinLivestock: () => fetchJson<any>(`${API_BASE}/bulletin/livestock`),
  getBulletinSenelec: () => fetchJson<any>(`${API_BASE}/bulletin/senelec`),
  getBulletinAir: () => fetchJson<any>(`${API_BASE}/bulletin/air-transport`),
  getBulletinMaritime: () => fetchJson<any>(`${API_BASE}/bulletin/maritime-transport`),
  getBulletinCross: () => fetchJson<any>(`${API_BASE}/bulletin/cross-analysis`),
  getQualityAudit: () => fetchJson<any>(`${API_BASE}/quality/audit`),

  csvExportUrl: (filters: GlobalFiltersState) =>
    `${API_BASE}/reports/export/csv${buildQuery({
      source: filters.source,
      region: filters.region,
      market: filters.market,
      commodity: filters.commodity,
      category: filters.category,
      year: filters.year ? Number(filters.year) : undefined,
      date_from: filters.date_from,
      date_to: filters.date_to,
      price_stage: filters.price_stage,
    })}`,

  excelExportUrl: (params: {
    source: string;
    region?: string;
    market?: string;
    commodity?: string;
    year?: string | number;
    horizon?: number;
  }) => `${API_BASE}/reports/export/excel${buildQuery(params)}`,

  bulletinCsvUrl: (sheetKey: string) => `${API_BASE}/reports/export/bulletin/${sheetKey}`,

  downloadPdfReport: async (payload: {
    source: string;
    commodity?: string;
    region?: string;
    market?: string;
    horizon: number;
  }) => {
    const res = await fetch(`${API_BASE}/reports/export/pdf`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Erreur lors de la génération du rapport PDF (code ${res.status})`);
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const slug: Record<string, string> = { wfp: "pam", rt_observed: "temps_reel_releves", rt_model: "temps_reel_estimations", csa: "csa_regional" };
    const d = new Date();
    const stamp = `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
    a.download = `rapport_foodprice_senegal_2025_2026_${slug[payload.source] ?? payload.source}_${stamp}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export function formatNumber(val: number | null | undefined, digits = 0): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return val.toLocaleString("fr-FR", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatPrice(val: number | null | undefined, unit = "FCFA/kg"): string {
  if (val === null || val === undefined || Number.isNaN(val)) return "—";
  return `${formatNumber(val, val % 1 !== 0 ? 1 : 0)} ${unit}`;
}
