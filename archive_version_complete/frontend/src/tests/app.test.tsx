import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppRoutes } from "../App";
import { NAV_ITEMS } from "../components/Layout";

const MOCK_FILTERS = {
  sources: [{ id: "wfp", label: "PAM Sénégal (Observé, 01/2025 – 03/2026)" }],
  meta: {
    source: "wfp",
    source_label: "PAM Sénégal (Observé, 01/2025 – 03/2026)",
    unit: "FCFA/kg",
    currency: "XOF",
    data_nature: "Prix observés réels (2025–2026)",
    is_estimated: false,
    has_markets: true,
    has_coordinates: true,
    official_period: "Janvier 2025 – Décembre 2026",
    actual_min_date: "2025-01-15",
    actual_max_date: "2026-03-15",
    months_2025_count: 12,
    months_2026_count: 3,
    available_2026_months: ["2026-01", "2026-02", "2026-03"],
    missing_2026_months: ["2026-04", "2026-05", "2026-06"],
  },
  regions: ["Dakar", "Saint-Louis"],
  markets: ["Dakar", "Pikine"],
  categories: ["Céréales et tubercules"],
  commodities: ["Mil", "Riz (importé)"],
  years: [2025, 2026],
  stages: ["Détail"],
  min_date: "2025-01-01",
  max_date: "2026-12-31",
};

const MOCK_OVERVIEW = {
  meta: MOCK_FILTERS.meta,
  kpis: {
    total_observations: 4779,
    regions_count: 14,
    markets_count: 47,
    products_count: 11,
    periods_count: 15,
    mean_price: 428.5,
    median_price: 380.0,
    min_price: 150.0,
    max_price: 1600.0,
    std_price: 185.2,
    last_observation_date: "2026-03-15",
    unit: "FCFA/kg",
    currency: "XOF",
    data_nature: "Prix observés réels (2025–2026)",
    stage_notice: null,
  },
  charts: {
    time_series: [{ ym: "2026-03", mean: 430, median: 385, min: 200, max: 700, count: 310 }],
    avg_by_product: [{ commodity: "Mil", mean: 355, median: 340, min: 200, max: 500, std: 45, count: 600 }],
    region_ranking: [{ region: "Dakar", mean: 450, median: 430, min: 250, max: 600, count: 400, diff_vs_national: 21.5, diff_vs_national_pct: 5.0 }],
    market_ranking: [{ market: "Pikine", region: "Dakar", mean: 448, median: 430, min: 250, max: 590, count: 120 }],
    top_expensive_products: [{ commodity: "Niébé", mean: 720, median: 700, min: 400, max: 1200, std: 90, count: 300 }],
    observations_by_region: [{ region: "Dakar", count: 400 }],
    observations_by_year: [{ year: 2025, count: 3850, mean: 430 }, { year: 2026, count: 929, mean: 422 }],
    monthly_seasonality: [{ month: 1, month_label: "Jan", mean: 410, median: 390, min: 200, max: 600, count: 390 }],
    region_comparison: [{ region: "Dakar", mean: 450, diff_vs_national: 21.5, diff_vs_national_pct: 5.0, count: 400 }],
    price_distribution: [{ bin_label: "300–400", bin_start: 300, bin_end: 400, count: 1400 }],
  },
};

const MOCK_FORECAST = {
  eligible: true,
  meta: MOCK_FILTERS.meta,
  scope: "Millet — Région Dakar",
  commodity: "Mil",
  region: "Dakar",
  market: "ALL",
  horizon_months: 6,
  series_diagnostics: {
    official_period: "Janvier 2025 – Décembre 2026",
    first_observed_date: "2025-01-01",
    last_observed_date: "2026-03-01",
    last_observed_price: 390.0,
    total_months_span: 15,
    observed_months: 14,
    observed_months_2025: 11,
    observed_months_2026: 3,
    available_2026_months: ["2026-01", "2026-02", "2026-03"],
    missing_2026_months: ["2026-04", "2026-05"],
    mean_2025: 380.0,
    mean_2026: 390.0,
    coverage_pct: 93.3,
    validation_window_months: 3,
    train_window_months: 12,
  },
  seasonality: {
    detected: false,
    acf_lag12: null,
    seasonal_strength: 0.0,
    description: "Série 2025–2026 de 15 mois (< 24 mois).",
  },
  best_model: "ARIMA",
  best_specification: "ARIMA(1, 1, 0)",
  model_comparison: [
    { model: "ARIMA", specification: "ARIMA(1, 1, 0)", status: "evaluated", mae: 8.4, rmse: 10.2, mape_pct: 2.1, eval_points: 3, train_points: 12, runtime_ms: 45, selected: true, error: null },
    { model: "Holt-Winters", specification: "Holt tendance amortie (2025–2026)", status: "evaluated", mae: 10.1, rmse: 12.5, mape_pct: 2.6, eval_points: 3, train_points: 12, runtime_ms: 25, selected: false, error: null },
  ],
  historical_series: [
    { date: "2025-12-01", ym: "2025-12", year: 2025, observed_price: 382, observed_2025: 382, observed_2026: null, period_group: "observed_2025", is_observed: true, obs_count: 4 },
    { date: "2026-03-01", ym: "2026-03", year: 2026, observed_price: 390, observed_2025: null, observed_2026: 390, period_group: "observed_2026", is_observed: true, obs_count: 4 },
  ],
  validation_series: [{ date: "2026-03-01", ym: "2026-03", actual: 390, is_observed: true, ARIMA: 388 }],
  forecast_series: [
    { step: 1, date: "2026-04-01", ym: "2026-04", forecast: 394, lower_95: 374, upper_95: 414, delta_vs_last: 4, delta_pct_vs_last: 1.0, is_forecast: true, period_group: "forecast" },
  ],
  interpretations: ["Modèle retenu uniquement sur 2025–2026 : ARIMA."],
};

const MOCK_EXECUTIVE = {
  meta: MOCK_FILTERS.meta,
  official_period: "Janvier 2025 – Décembre 2026",
  source_coverage: {
    official_period: "Janvier 2025 – Décembre 2026",
    start_date: "2025-01-01",
    end_date: "2026-12-31",
    wfp: { rows: 4779, date_min: "2025-01-15", date_max: "2026-03-15", months_count: 15, available_2026_months: ["2026-01", "2026-02", "2026-03"], missing_2026_months: [] },
    rt: { rows_long: 6630, observed_rows_excl_avg: 2070, date_min: "2025-01-01", date_max: "2026-05-01", months_count: 17, available_2026_months: ["2026-01", "2026-05"], missing_2026_months: [] },
    bulletin: { rows: 0, available_in_2025_2026: false, raw_coverage: "01/2016 → 08/2022" },
  },
  empty: false,
  empty_reason: null,
  focus_commodity: "Mil",
  focus_auto_selected: true,
  focus_unit: "FCFA/kg",
  scope: {
    region: "ALL", market: "ALL", category: "ALL", year: null,
    date_min: "2025-01-15", date_max: "2026-03-15", months_2025: 12, months_2026: 3,
    available_2026_months: ["2026-01", "2026-02", "2026-03"], missing_2026_months: ["2026-04"],
  },
  kpis: {
    latest_price: { value: 288.42, unit: "FCFA/kg", ym: "2026-03", date: "2026-03-15", markets_count: 36, observations: 36, is_market_level: false },
    monthly_change: { value_pct: 3.86, previous_ym: "2026-02", current_ym: "2026-03", matched_markets: 33, previous_price: 281.06, current_price: 291.91, consecutive: true, method: "m" },
    active_markets: { value: 47, regions_count: 14, focus_markets: 47, date_min: "2025-01-15", date_max: "2026-03-15", observations: 4779, by_month: [{ ym: "2026-03", markets: 40 }] },
    forecast: {
      eligible: true, horizon: 6, model: "Holt-Winters", specification: "Holt", target_ym: "2026-09", value: 290.1,
      lower_95: 270, upper_95: 310, delta_pct_vs_last: 0.6, last_observed_date: "2026-03-01", last_observed_price: 288.42,
      rmse: 12, mae: 10, mape_pct: 4.25, series: [{ ym: "2026-04", forecast: 289, lower_95: 275, upper_95: 303 }], reason: null,
    },
  },
  price_evolution: [
    { ym: "2026-03", year: 2026, price: 288.42, observed_2025: null, observed_2026: 288.42, min: 200, max: 400, observations: 36, markets: 36, last_date: "2026-03-15" },
  ],
  forecast: null,
  distribution: { total: 4779, by_category: [{ name: "Céréales et tubercules", count: 3355, pct: 70.2 }], by_commodity: [] },
  monthly_comparison: [],
  top_products: { unit: "FCFA/kg", items: [{ commodity: "Niébé", category: "Légumineuses et noix", latest_price: 810.27, unit: "FCFA/kg", latest_ym: "2026-03", latest_date: "2026-03-15", markets: 40, change_pct: 3.1, is_focus: false }], excluded_incompatible_units: [] },
  regional_comparison: { reference_ym: "2026-03", reference_price: 288.42, regions_count: 0, regions: [] },
  map_markets: [],
};
MOCK_EXECUTIVE.forecast = MOCK_EXECUTIVE.kpis.forecast as any;

beforeEach(() => {
  globalThis.fetch = vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    let body: any = {};
    if (url.includes("/api/filters")) body = MOCK_FILTERS;
    else if (url.includes("/api/overview")) body = MOCK_OVERVIEW;
    else if (url.includes("/api/executive/dashboard")) body = MOCK_EXECUTIVE;
    else if (url.includes("/api/forecast/options")) {
      body = {
        meta: MOCK_FILTERS.meta,
        commodities: ["Mil", "Riz (importé)"],
        regions: ["Dakar"],
        markets: ["Dakar", "Pikine"],
        markets_by_region: { Dakar: ["Dakar", "Pikine"] },
        horizons: [1, 3, 6, 12],
        prophet_available: true,
      };
    } else if (url.includes("/api/forecast/run")) body = MOCK_FORECAST;
    return Promise.resolve({
      ok: true,
      status: 200,
      json: async () => body,
    } as Response);
  });
});

describe("FOODPRICE SENEGAL Frontend (2025-2026 Official Period)", () => {
  it("renders the executive dashboard with 4 dated KPI cards and source coverage", async () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText(/Dernier prix observé/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Variation mensuelle des prix/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Marchés actifs/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Prévision à six mois/i).length).toBeGreaterThan(0);
      expect(screen.getByText("15/03/2026")).toBeInTheDocument();
      expect(screen.getByText(/02\/2026 → 03\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/Holt-Winters · échéance 09\/2026/)).toBeInTheDocument();
      expect(screen.getByText(/0 observation en 2025–2026/)).toBeInTheDocument();
      expect(screen.getAllByText("Niébé").length).toBeGreaterThan(0);
      expect(screen.queryByText(/Executive|Latest observed|Monthly price|Active markets|Six month/i)).toBeNull();
    });
  });

  it("renders all 17 navigation items and 2025-2026 detailed analysis KPIs", async () => {
    render(
      <MemoryRouter initialEntries={["/analyses"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(NAV_ITEMS).toHaveLength(17);
    NAV_ITEMS.forEach((item) => {
      expect(screen.getAllByText(item.label).length).toBeGreaterThan(0);
    });

    await waitFor(() => {
      expect(screen.getByText(/4[\s\u00a0\u202f]779/)).toBeInTheDocument();
      expect(screen.getAllByText("15/03/2026").length).toBeGreaterThan(0);
    });
  });

  it("renders AI forecasting with 2025 / 2026 / forecast distinction", async () => {
    render(
      <MemoryRouter initialEntries={["/forecast"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText("ARIMA(1, 1, 0)").length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText(/1\. Données réellement observées en 2025/i)).toBeInTheDocument();
      expect(screen.getByText(/2\. Données réellement observées en 2026/i)).toBeInTheDocument();
      expect(screen.getByText(/3\. Prix prévisionnel \(intelligence artificielle\)/i)).toBeInTheDocument();
      expect(screen.getAllByText("04/2026").length).toBeGreaterThan(0);
    });
  });

  it("renders User Guide with 10 steps and opens Guided Demo modal", async () => {
    render(
      <MemoryRouter initialEntries={["/guide"]}>
        <AppRoutes />
      </MemoryRouter>
    );

    expect(screen.getByText(/COMMENT UTILISER FOODPRICE SENEGAL \?/i)).toBeInTheDocument();
    expect(screen.getByText(/Comment générer une prévision IA/i)).toBeInTheDocument();

    const demoBtn = screen.getByRole("button", { name: /Lancer la Démonstration Guidée/i });
    fireEvent.click(demoBtn);

    await waitFor(() => {
      expect(screen.getByText(/Parcours interactif FOODPRICE SENEGAL/i)).toBeInTheDocument();
    });
  });
});
