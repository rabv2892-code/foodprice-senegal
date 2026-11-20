export type SourceId = "wfp" | "rt_observed" | "rt_model" | "csa";

export interface SourceMeta {
  source: SourceId;
  source_label: string;
  unit: string;
  currency: string;
  data_nature: string;
  is_estimated: boolean;
  has_markets: boolean;
  has_coordinates: boolean;
  official_period?: string;
  actual_min_date?: string | null;
  actual_max_date?: string | null;
  months_2025_count?: number;
  months_2026_count?: number;
  available_2026_months?: string[];
  missing_2026_months?: string[];
  empty_reason?: string | null;
}

export interface GlobalFiltersState {
  source: SourceId;
  region: string;
  market: string;
  commodity: string;
  category: string;
  year: string;
  date_from: string;
  date_to: string;
  price_stage: string;
}

export interface FilterOptionsResponse {
  sources: { id: SourceId; label: string }[];
  meta: SourceMeta;
  regions: string[];
  markets: string[];
  categories: string[];
  commodities: string[];
  years: number[];
  stages: string[];
  min_date: string | null;
  max_date: string | null;
}

export interface OverviewKpis {
  total_observations: number;
  regions_count: number;
  markets_count: number;
  products_count: number;
  periods_count: number;
  mean_price: number | null;
  median_price: number | null;
  min_price: number | null;
  max_price: number | null;
  std_price: number | null;
  last_observation_date: string | null;
  unit: string;
  currency: string;
  data_nature: string;
  stage_notice: string | null;
}

export interface OverviewResponse {
  meta: SourceMeta;
  kpis: OverviewKpis;
  charts: {
    time_series: { ym: string; mean: number; median: number; min: number; max: number; count: number }[];
    avg_by_product: {
      commodity: string;
      mean: number;
      median: number;
      min: number;
      max: number;
      std: number;
      count: number;
    }[];
    region_ranking: {
      region: string;
      mean: number;
      median: number;
      min: number;
      max: number;
      count: number;
      diff_vs_national: number;
      diff_vs_national_pct: number;
    }[];
    market_ranking: {
      market: string;
      region: string;
      mean: number;
      median: number;
      min: number;
      max: number;
      count: number;
    }[];
    top_expensive_products: {
      commodity: string;
      mean: number;
      median: number;
      min: number;
      max: number;
      std: number;
      count: number;
    }[];
    observations_by_region: { region: string; count: number }[];
    observations_by_year: { year: number; count: number; mean: number }[];
    monthly_seasonality: {
      month: number;
      month_label: string;
      mean: number;
      median: number;
      min: number;
      max: number;
      count: number;
    }[];
    region_comparison: {
      region: string;
      mean: number;
      diff_vs_national: number;
      diff_vs_national_pct: number;
      count: number;
    }[];
    price_distribution: { bin_label: string; bin_start: number; bin_end: number; count: number }[];
  };
}

export interface ExplorerResponse {
  meta: SourceMeta;
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
  rows: Record<string, string | number | boolean | null>[];
}

export interface GeoAnalysisResponse {
  meta: SourceMeta;
  has_coordinates: boolean;
  summary: {
    national_mean?: number;
    most_expensive_region?: string;
    most_expensive_region_mean?: number;
    cheapest_region?: string;
    cheapest_region_mean?: number;
    regional_spread?: number;
    market_spread?: number | null;
    markets_with_coords?: number;
  };
  regions: {
    region: string;
    observations: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    std: number;
    spread: number;
    gap_vs_national_pct: number;
  }[];
  markets: {
    market: string;
    region: string;
    latitude: number;
    longitude: number;
    observations: number;
    mean: number;
    median: number;
    min: number;
    max: number;
    latest_price: number | null;
    latest_date: string;
    gap_vs_national_pct: number;
  }[];
  most_expensive_markets: GeoAnalysisResponse["markets"];
  cheapest_markets: GeoAnalysisResponse["markets"];
}

export interface ForecastModelComparison {
  model: string;
  specification: string;
  status: "evaluated" | "unavailable";
  mae: number | null;
  rmse: number | null;
  mape_pct: number | null;
  eval_points: number;
  train_points: number;
  runtime_ms: number;
  selected: boolean;
  error: string | null;
}

export interface ForecastResponse {
  eligible: boolean;
  reason?: string;
  meta: SourceMeta;
  scope: string;
  commodity?: string;
  region?: string;
  market?: string;
  horizon_months?: number;
  series_diagnostics?: {
    official_period?: string;
    first_observed_date: string;
    last_observed_date: string;
    last_observed_price?: number;
    total_months_span: number;
    observed_months: number;
    observed_months_2025?: number;
    observed_months_2026?: number;
    available_2026_months?: string[];
    missing_2026_months?: string[];
    missing_months?: number;
    missing_months_in_span?: number;
    missing_months_filled_for_modeling?: number;
    coverage_pct: number;
    mean_2025?: number | null;
    mean_2026?: number | null;
    validation_window_months?: number;
    train_window_months?: number;
  };
  seasonality?: {
    detected: boolean;
    acf_lag12: number | null;
    seasonal_strength: number;
    description: string;
  };
  best_model?: string;
  best_specification?: string;
  model_comparison?: ForecastModelComparison[];
  historical_series?: {
    date: string;
    ym: string;
    year?: number;
    observed_price: number | null;
    observed_2025?: number | null;
    observed_2026?: number | null;
    period_group?: "observed_2025" | "observed_2026" | "missing";
    is_observed: boolean;
    obs_count: number;
  }[];
  validation_series?: Record<string, string | number | boolean | null>[];
  forecast_series?: {
    step: number;
    date: string;
    ym: string;
    forecast: number;
    lower_95: number;
    upper_95: number;
    delta_vs_last: number;
    delta_pct_vs_last: number;
    is_forecast: boolean;
    period_group?: "forecast";
  }[];
  interpretations?: string[];
}

export interface SourceCoverageSummary {
  official_period: string;
  start_date: string;
  end_date: string;
  wfp: { rows: number; date_min: string | null; date_max: string | null; months_count: number; available_2026_months: string[]; missing_2026_months: string[] };
  rt: { rows_long: number; observed_rows_excl_avg: number; date_min: string | null; date_max: string | null; months_count: number; available_2026_months: string[]; missing_2026_months: string[] };
  bulletin: { rows: number; available_in_2025_2026: boolean; raw_coverage: string };
}

export interface ExecutiveForecastBlock {
  eligible: boolean;
  horizon: number;
  model?: string;
  specification?: string;
  target_ym?: string;
  value?: number;
  lower_95?: number;
  upper_95?: number;
  delta_pct_vs_last?: number;
  last_observed_date?: string;
  last_observed_price?: number;
  rmse?: number | null;
  mae?: number | null;
  mape_pct?: number | null;
  series: { ym: string; forecast: number; lower_95: number; upper_95: number }[];
  reason?: string | null;
  observed_months?: number | null;
}

export interface ExecutiveRegion {
  region: string;
  latest_price: number | null;
  latest_ym: string;
  latest_date: string;
  price_at_reference: number | null;
  gap_vs_reference_pct: number | null;
  is_reference_month: boolean;
  markets: { market: string; price: number | null; date: string }[];
  markets_count: number;
  observations: number;
  is_selected: boolean;
}

export interface ExecutiveDashboardResponse {
  meta: SourceMeta;
  official_period: string;
  source_coverage: SourceCoverageSummary;
  empty: boolean;
  empty_reason: string | null;
  focus_commodity: string | null;
  focus_auto_selected: boolean;
  focus_unit?: string;
  scope: {
    region: string;
    market: string;
    category: string;
    year: number | null;
    date_min: string;
    date_max: string;
    months_2025: number;
    months_2026: number;
    available_2026_months: string[];
    missing_2026_months: string[];
  } | null;
  kpis: {
    latest_price: { value: number | null; unit: string; ym: string; date: string; markets_count: number; observations: number; is_market_level: boolean };
    monthly_change: {
      value_pct: number | null;
      previous_ym: string | null;
      current_ym: string;
      matched_markets: number;
      previous_price: number | null;
      current_price: number | null;
      consecutive: boolean;
      method: string | null;
    };
    active_markets: {
      value: number;
      regions_count: number;
      focus_markets: number;
      date_min: string;
      date_max: string;
      observations: number;
      by_month: { ym: string; markets: number }[];
    };
    forecast: ExecutiveForecastBlock;
  } | null;
  price_evolution: {
    ym: string;
    year: number;
    price: number | null;
    observed_2025: number | null;
    observed_2026: number | null;
    min: number | null;
    max: number | null;
    observations: number;
    markets: number;
    last_date: string;
  }[];
  forecast: ExecutiveForecastBlock | null;
  distribution: {
    total: number;
    by_category: { name: string; count: number; pct: number }[];
    by_commodity: { name: string; category: string; count: number; pct: number }[];
  };
  monthly_comparison: {
    month: number;
    month_label: string;
    price_2025: number | null;
    price_2026: number | null;
    obs_2025: number;
    obs_2026: number;
    date_2025: string | null;
    date_2026: string | null;
    yoy_pct: number | null;
    missing_2026: boolean;
  }[];
  top_products: {
    unit: string;
    items: {
      commodity: string;
      category: string;
      latest_price: number | null;
      unit: string;
      latest_ym: string;
      latest_date: string;
      markets: number;
      change_pct: number | null;
      is_focus: boolean;
    }[];
    excluded_incompatible_units: string[];
  };
  regional_comparison: {
    reference_ym: string | null;
    reference_price: number | null;
    regions_count?: number;
    regions: ExecutiveRegion[];
  };
  map_markets: GeoAnalysisResponse["markets"];
}
