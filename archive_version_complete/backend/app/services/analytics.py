from __future__ import annotations

import math
import re
from typing import Any

import numpy as np
import pandas as pd
from scipy import stats as scipy_stats

from ..config import ALL_2026_MONTHS, OFFICIAL_END_DATE, OFFICIAL_PERIOD_LABEL, OFFICIAL_START_DATE
from ..data_store import DataStore
from ..i18n import fmt_ym, fr_dec

VALID_SOURCES = ("wfp", "rt_observed", "rt_model", "csa")

SOURCE_LABELS = {
    "wfp": "PAM Sénégal (Prix observés, janv. 2025 – mars 2026)",
    "rt_observed": "Prix en temps réel Sénégal (Relevés directs, janv. 2025 – mai 2026)",
    "rt_model": "Prix en temps réel Sénégal (Estimations modélisées, janv. 2025 – mai 2026)",
    "csa": "BASE_BULLETIN — CSA régional (0 obs. en 2025–2026)",
}


def clean_float(val: Any, digits: int = 2) -> float | None:
    if val is None:
        return None
    try:
        f = float(val)
        if math.isnan(f) or math.isinf(f):
            return None
        return round(f, digits)
    except (TypeError, ValueError):
        return None


def _build_coverage_meta(df: pd.DataFrame) -> dict[str, Any]:
    if len(df) == 0:
        return {
            "official_period": OFFICIAL_PERIOD_LABEL,
            "actual_min_date": None,
            "actual_max_date": None,
            "months_2025_count": 0,
            "months_2026_count": 0,
            "available_2026_months": [],
            "missing_2026_months": ALL_2026_MONTHS,
        }
    m25 = int(df.loc[df["year"] == 2025, "ym"].nunique())
    av26 = sorted(df.loc[df["year"] == 2026, "ym"].unique().tolist())
    return {
        "official_period": OFFICIAL_PERIOD_LABEL,
        "actual_min_date": str(df["date"].min()),
        "actual_max_date": str(df["date"].max()),
        "months_2025_count": m25,
        "months_2026_count": len(av26),
        "available_2026_months": av26,
        "missing_2026_months": [m for m in ALL_2026_MONTHS if m not in av26],
    }


def get_source_dataframe(store: DataStore, source: str) -> tuple[pd.DataFrame, dict[str, Any]]:
    """Return a normalized 2025–2026 view of the requested source with explicit data nature metadata."""
    src = source if source in VALID_SOURCES else "wfp"
    if src == "wfp":
        df = store.wfp.copy()
        df["market_col"] = df["market_display"]
        df["commodity_col"] = df["commodity"]
        df["category_col"] = df["category"]
        df["price_col"] = df["price"]
        df["stage_col"] = df["pricetype"]
        meta = {
            "source": "wfp",
            "source_label": SOURCE_LABELS["wfp"],
            "unit": "FCFA/kg",
            "currency": "XOF",
            "data_nature": "Prix réellement observés (2025–2026, relevés de détail constatés)",
            "is_estimated": False,
            "has_markets": True,
            "has_coordinates": True,
            "empty_reason": None,
            **_build_coverage_meta(df),
        }
        return df, meta

    if src == "rt_observed":
        df = store.rt_long[(~store.rt_long["is_market_average"]) & (store.rt_long["has_observed_price"])].copy()
        df["market_col"] = df["market_display"]
        df["commodity_col"] = df["commodity"]
        df["category_col"] = "Céréales (temps réel)"
        df["price_col"] = df["observed_price"]
        df["stage_col"] = "Observé direct"
        # Do not expose 2024-referenced raw YoY inflation on 2025 rows
        df.loc[df["year"] < 2026, "inflation_yoy_pct"] = np.nan
        meta = {
            "source": "rt_observed",
            "source_label": SOURCE_LABELS["rt_observed"],
            "unit": "FCFA/kg",
            "currency": "XOF",
            "data_nature": "Prix observés directs (2025–2026, colonnes de base sans interpolation)",
            "is_estimated": False,
            "has_markets": True,
            "has_coordinates": True,
            "empty_reason": None,
            **_build_coverage_meta(df),
        }
        return df, meta

    if src == "rt_model":
        df = store.rt_long[~store.rt_long["is_market_average"]].copy()
        df["market_col"] = df["market_display"]
        df["commodity_col"] = df["commodity"]
        df["category_col"] = "Céréales (estimations modélisées)"
        df["price_col"] = df["close_price"]
        df["stage_col"] = "Estimation modélisée (clôture)"
        df.loc[df["year"] < 2026, "inflation_yoy_pct"] = np.nan
        meta = {
            "source": "rt_model",
            "source_label": SOURCE_LABELS["rt_model"],
            "unit": "FCFA/kg",
            "currency": "XOF",
            "data_nature": "Estimations modélisées 2025–2026 (cours de clôture) — non assimilables à des prix relevés",
            "is_estimated": True,
            "has_markets": True,
            "has_coordinates": True,
            "empty_reason": None,
            **_build_coverage_meta(df),
        }
        return df, meta

    # csa (0 rows in 2025–2026 because BASE_BULLETIN.xlsx ends in 2022-08)
    df = store.csa.copy()
    df["market_col"] = pd.Series(dtype=str)
    df["commodity_col"] = pd.Series(dtype=str)
    df["category_col"] = pd.Series(dtype=str)
    df["price_col"] = pd.Series(dtype=float)
    df["stage_col"] = pd.Series(dtype=str)
    df["latitude"] = np.nan
    df["longitude"] = np.nan
    meta = {
        "source": "csa",
        "source_label": SOURCE_LABELS["csa"],
        "unit": "FCFA/kg",
        "currency": "XOF",
        "data_nature": "Aucune donnée 2025–2026 dans BASE_BULLETIN.xlsx (couverture brute réelle : janv. 2016 – août 2022)",
        "is_estimated": False,
        "has_markets": False,
        "has_coordinates": False,
        "empty_reason": (
            f"La feuille PRIX_kg_CONS_CSA de BASE_BULLETIN.xlsx couvre uniquement 01/2016 à 08/2022. "
            f"Sur la période officielle ({OFFICIAL_PERIOD_LABEL}), elle contient exactement 0 observation."
        ),
        **_build_coverage_meta(df),
    }
    return df, meta


def apply_filters(
    df: pd.DataFrame,
    region: str | None = None,
    market: str | None = None,
    commodity: str | None = None,
    category: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    price_stage: str | None = None,
) -> pd.DataFrame:
    if len(df) == 0:
        return df
    out = df[(df["date"] >= OFFICIAL_START_DATE) & (df["date"] <= OFFICIAL_END_DATE)]
    if region and region != "ALL":
        out = out[out["region_std"] == region]
    if market and market != "ALL":
        out = out[out["market_col"] == market]
    if commodity and commodity != "ALL":
        out = out[out["commodity_col"] == commodity]
    if category and category != "ALL":
        out = out[out["category_col"] == category]
    if year is not None and year in (2025, 2026):
        out = out[out["year"] == int(year)]
    elif year is not None and year > 0 and year not in (2025, 2026):
        return out.iloc[0:0]
    if date_from:
        eff_from = max(OFFICIAL_START_DATE, date_from)
        out = out[out["date"] >= eff_from]
    if date_to:
        eff_to = min(OFFICIAL_END_DATE, date_to)
        out = out[out["date"] <= eff_to]
    if price_stage and price_stage != "ALL":
        out = out[out["stage_col"] == price_stage]
    return out


def get_filter_options(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    if len(df) == 0:
        return {
            "sources": [{"id": k, "label": v} for k, v in SOURCE_LABELS.items()],
            "meta": meta,
            "regions": [],
            "markets": [],
            "categories": [],
            "commodities": [],
            "years": [2025, 2026],
            "stages": [],
            "min_date": OFFICIAL_START_DATE,
            "max_date": OFFICIAL_END_DATE,
        }
    regions = sorted(df["region_std"].dropna().unique().tolist())
    df_r = df[df["region_std"] == region] if (region and region != "ALL") else df
    markets = sorted(df_r["market_col"].dropna().unique().tolist())
    categories = sorted(df["category_col"].dropna().unique().tolist())
    df_c = df[df["category_col"] == category] if (category and category != "ALL") else df
    commodities = sorted(df_c["commodity_col"].dropna().unique().tolist())
    years = sorted([int(y) for y in df["year"].dropna().unique().tolist() if int(y) in (2025, 2026)])
    stages = sorted(df["stage_col"].dropna().unique().tolist())
    return {
        "sources": [{"id": k, "label": v} for k, v in SOURCE_LABELS.items()],
        "meta": meta,
        "regions": regions,
        "markets": markets,
        "categories": categories,
        "commodities": commodities,
        "years": years,
        "stages": stages,
        "min_date": OFFICIAL_START_DATE,
        "max_date": OFFICIAL_END_DATE,
    }


def get_overview_dashboard(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    market: str | None = None,
    commodity: str | None = None,
    category: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    price_stage: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region, market, commodity, category, year, date_from, date_to, price_stage)

    if len(fdf) == 0:
        return {
            "meta": meta,
            "kpis": {
                "total_observations": 0,
                "regions_count": 0,
                "markets_count": 0,
                "products_count": 0,
                "periods_count": 0,
                "mean_price": None,
                "median_price": None,
                "min_price": None,
                "max_price": None,
                "std_price": None,
                "last_observation_date": None,
                "unit": meta["unit"],
                "currency": meta["currency"],
                "data_nature": meta["data_nature"],
                "stage_notice": meta.get("empty_reason"),
            },
            "charts": {
                "time_series": [],
                "avg_by_product": [],
                "region_ranking": [],
                "market_ranking": [],
                "top_expensive_products": [],
                "observations_by_region": [],
                "observations_by_year": [],
                "monthly_seasonality": [],
                "region_comparison": [],
                "price_distribution": [],
            },
        }

    prices = fdf["price_col"]
    kpis = {
        "total_observations": int(len(fdf)),
        "regions_count": int(fdf["region_std"].nunique()),
        "markets_count": int(fdf["market_col"].nunique()),
        "products_count": int(fdf["commodity_col"].nunique()),
        "periods_count": int(fdf["ym"].nunique()),
        "mean_price": clean_float(prices.mean()),
        "median_price": clean_float(prices.median()),
        "min_price": clean_float(prices.min()),
        "max_price": clean_float(prices.max()),
        "std_price": clean_float(prices.std(ddof=1)) if len(fdf) > 1 else 0.0,
        "last_observation_date": str(fdf["date"].max()),
        "unit": meta["unit"],
        "currency": meta["currency"],
        "data_nature": meta["data_nature"],
        "stage_notice": None,
    }

    # A. Time series (monthly)
    ts_grp = (
        fdf.groupby("ym")["price_col"]
        .agg(["count", "mean", "median", "min", "max"])
        .reset_index()
        .sort_values("ym")
    )
    time_series = [
        {
            "ym": row["ym"],
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "count": int(row["count"]),
        }
        for _, row in ts_grp.iterrows()
    ]

    # B. Average by product
    prod_grp = (
        fdf.groupby("commodity_col")["price_col"]
        .agg(["count", "mean", "median", "min", "max", "std"])
        .reset_index()
        .sort_values("mean", ascending=False)
    )
    avg_by_product = [
        {
            "commodity": row["commodity_col"],
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "std": clean_float(row["std"]) or 0.0,
            "count": int(row["count"]),
        }
        for _, row in prod_grp.iterrows()
    ]

    # C & H. Region ranking & comparison vs national mean
    nat_mean = float(prices.mean())
    reg_grp = (
        fdf.groupby("region_std")["price_col"]
        .agg(["count", "mean", "median", "min", "max"])
        .reset_index()
        .sort_values("mean", ascending=False)
    )
    region_ranking = [
        {
            "region": row["region_std"],
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "count": int(row["count"]),
            "diff_vs_national": clean_float(row["mean"] - nat_mean),
            "diff_vs_national_pct": clean_float((row["mean"] / nat_mean - 1) * 100) if nat_mean > 0 else 0.0,
        }
        for _, row in reg_grp.iterrows()
    ]

    # D. Market ranking (top 20)
    mkt_grp = (
        fdf.groupby(["market_col", "region_std"])["price_col"]
        .agg(["count", "mean", "median", "min", "max"])
        .reset_index()
        .sort_values("mean", ascending=False)
    )
    market_ranking = [
        {
            "market": row["market_col"],
            "region": row["region_std"],
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "count": int(row["count"]),
        }
        for _, row in mkt_grp.head(20).iterrows()
    ]

    top_expensive_products = avg_by_product[:10]

    observations_by_region = sorted(
        [{"region": r["region"], "count": r["count"]} for r in region_ranking],
        key=lambda x: x["count"],
        reverse=True,
    )
    yr_grp = fdf.groupby("year")["price_col"].agg(["count", "mean"]).reset_index().sort_values("year")
    observations_by_year = [
        {"year": int(row["year"]), "count": int(row["count"]), "mean": clean_float(row["mean"])}
        for _, row in yr_grp.iterrows()
    ]

    month_names = {
        1: "Jan", 2: "Fév", 3: "Mar", 4: "Avr", 5: "Mai", 6: "Juin",
        7: "Juil", 8: "Août", 9: "Sep", 10: "Oct", 11: "Nov", 12: "Déc",
    }
    m_grp = fdf.groupby("month")["price_col"].agg(["count", "mean", "median", "min", "max"]).reset_index().sort_values("month")
    monthly_seasonality = [
        {
            "month": int(row["month"]),
            "month_label": month_names.get(int(row["month"]), str(int(row["month"]))),
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "count": int(row["count"]),
        }
        for _, row in m_grp.iterrows()
    ]

    counts, edges = np.histogram(prices.dropna().values, bins=min(14, max(6, int(np.sqrt(len(prices)) // 2))))
    price_distribution = [
        {
            "bin_label": f"{int(round(edges[i]))}–{int(round(edges[i+1]))}",
            "bin_start": clean_float(edges[i]),
            "bin_end": clean_float(edges[i + 1]),
            "count": int(counts[i]),
        }
        for i in range(len(counts))
    ]

    return {
        "meta": meta,
        "kpis": kpis,
        "charts": {
            "time_series": time_series,
            "avg_by_product": avg_by_product,
            "region_ranking": region_ranking,
            "market_ranking": market_ranking,
            "top_expensive_products": top_expensive_products,
            "observations_by_region": observations_by_region,
            "observations_by_year": observations_by_year,
            "monthly_seasonality": monthly_seasonality,
            "region_comparison": region_ranking,
            "price_distribution": price_distribution,
        },
    }


def get_explorer_data(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    market: str | None = None,
    commodity: str | None = None,
    category: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    price_stage: str | None = None,
    page: int = 1,
    page_size: int = 50,
    search: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region, market, commodity, category, year, date_from, date_to, price_stage)
    if len(fdf) > 0 and search:
        q = search.strip().lower()
        # Saisie à la française : JJ/MM/AAAA ou MM/AAAA -> format interne AAAA-MM-JJ / AAAA-MM
        m_full = re.fullmatch(r"(\d{1,2})/(\d{1,2})/(\d{4})", q)
        m_month = re.fullmatch(r"(\d{1,2})/(\d{4})", q)
        if m_full:
            q = f"{m_full.group(3)}-{int(m_full.group(2)):02d}-{int(m_full.group(1)):02d}"
        elif m_month:
            q = f"{m_month.group(2)}-{int(m_month.group(1)):02d}"
        mask = (
            fdf["region_std"].astype(str).str.lower().str.contains(q, na=False)
            | fdf["market_col"].astype(str).str.lower().str.contains(q, na=False)
            | fdf["commodity_col"].astype(str).str.lower().str.contains(q, na=False)
            | fdf["date"].astype(str).str.lower().str.contains(q, na=False)
        )
        fdf = fdf[mask]

    total = int(len(fdf))
    page = max(1, page)
    page_size = min(200, max(10, page_size))
    start = (page - 1) * page_size
    slice_df = (
        fdf.sort_values(["date", "region_std", "market_col"], ascending=[False, True, True]).iloc[start : start + page_size]
        if total > 0
        else fdf
    )

    rows = []
    for _, r in slice_df.iterrows():
        item: dict[str, Any] = {
            "date": str(r["date"]),
            "region": str(r["region_std"]),
            "market": str(r["market_col"]),
            "commodity": str(r["commodity_col"]),
            "category": str(r["category_col"]),
            "stage": str(r["stage_col"]),
            "unit": meta["unit"],
            "currency": meta["currency"],
            "price": clean_float(r["price_col"]),
            "is_outlier_iqr_30": bool(r.get("is_outlier_iqr_30", False)),
        }
        if source in ("rt_observed", "rt_model"):
            item["open_price"] = clean_float(r.get("open_price"))
            item["high_price"] = clean_float(r.get("high_price"))
            item["low_price"] = clean_float(r.get("low_price"))
            item["close_price"] = clean_float(r.get("close_price"))
            item["inflation_yoy_pct"] = clean_float(r.get("inflation_yoy_pct")) if int(r["year"]) >= 2026 else None
            item["trust_score"] = clean_float(r.get("trust_score"))
        elif source == "wfp":
            item["usdprice"] = clean_float(r.get("usdprice"))
        rows.append(item)

    return {
        "meta": meta,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
        "rows": rows,
    }


def get_price_analysis(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    if len(df) == 0:
        return {"meta": meta, "commodity": None, "metrics": None, "series": [], "by_region": [], "by_market": []}

    if not commodity or commodity == "ALL" or commodity not in df["commodity_col"].values:
        commodity = str(df["commodity_col"].value_counts().index[0])
    fdf = apply_filters(df, region=region, market=market, commodity=commodity, date_from=date_from, date_to=date_to)

    if len(fdf) == 0:
        return {"meta": meta, "commodity": commodity, "metrics": None, "series": [], "by_region": [], "by_market": []}

    p = fdf["price_col"]
    ts = (
        fdf.groupby("ym")["price_col"]
        .agg(["count", "mean", "median", "min", "max", "std"])
        .reset_index()
        .sort_values("ym")
    )
    ts["mom_pct"] = ts["mean"].pct_change(1) * 100
    # Strict YoY strictly computed within 2025–2026 (2026 month vs corresponding 2025 month)
    ym_mean_map = ts.set_index("ym")["mean"].to_dict()
    yoy_vals = []
    for _, row in ts.iterrows():
        ym = str(row["ym"])
        yr = int(ym[:4])
        if yr == 2026:
            prev_ym = f"2025-{ym[5:7]}"
            prev_v = ym_mean_map.get(prev_ym)
            yoy_vals.append(((row["mean"] / prev_v) - 1.0) * 100.0 if (prev_v and prev_v > 0) else np.nan)
        else:
            yoy_vals.append(np.nan)
    ts["yoy_pct"] = yoy_vals

    rt_ohlc_map: dict[str, dict[str, Any]] = {}
    if source in ("rt_observed", "rt_model"):
        ohlc_grp = (
            fdf.groupby("ym")[["open_price", "high_price", "low_price", "close_price", "trust_score"]]
            .mean()
            .reset_index()
        )
        for _, r in ohlc_grp.iterrows():
            rt_ohlc_map[r["ym"]] = {
                "open": clean_float(r["open_price"]),
                "high": clean_float(r["high_price"]),
                "low": clean_float(r["low_price"]),
                "close": clean_float(r["close_price"]),
                "trust_score": clean_float(r["trust_score"]),
            }

    last_mom = ts["mom_pct"].dropna().iloc[-1] if ts["mom_pct"].notna().any() else None
    last_yoy = ts["yoy_pct"].dropna().iloc[-1] if ts["yoy_pct"].notna().any() else None

    metrics = {
        "count": int(len(fdf)),
        "mean": clean_float(p.mean()),
        "min": clean_float(p.min()),
        "max": clean_float(p.max()),
        "median": clean_float(p.median()),
        "std": clean_float(p.std(ddof=1)) if len(fdf) > 1 else 0.0,
        "q25": clean_float(p.quantile(0.25)),
        "q75": clean_float(p.quantile(0.75)),
        "monthly_variation_pct": clean_float(last_mom),
        "annual_variation_pct": clean_float(last_yoy),
        "last_date": str(fdf["date"].max()),
        "first_date": str(fdf["date"].min()),
        "latest_mean_price": clean_float(ts["mean"].iloc[-1]),
        "unit": meta["unit"],
    }

    series = []
    for _, row in ts.iterrows():
        pt = {
            "ym": row["ym"],
            "mean": clean_float(row["mean"]),
            "median": clean_float(row["median"]),
            "min": clean_float(row["min"]),
            "max": clean_float(row["max"]),
            "std": clean_float(row["std"]) or 0.0,
            "mom_pct": clean_float(row["mom_pct"]),
            "yoy_pct": clean_float(row["yoy_pct"]),
            "count": int(row["count"]),
        }
        if row["ym"] in rt_ohlc_map:
            pt.update(rt_ohlc_map[row["ym"]])
        series.append(pt)

    by_region = [
        {
            "region": r["region_std"],
            "mean": clean_float(r["mean"]),
            "median": clean_float(r["median"]),
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "count": int(r["count"]),
        }
        for _, r in fdf.groupby("region_std")["price_col"]
        .agg(["count", "mean", "median", "min", "max"])
        .reset_index()
        .sort_values("mean", ascending=False)
        .iterrows()
    ]

    by_market = [
        {
            "market": r["market_col"],
            "region": r["region_std"],
            "mean": clean_float(r["mean"]),
            "median": clean_float(r["median"]),
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "count": int(r["count"]),
        }
        for _, r in fdf.groupby(["market_col", "region_std"])["price_col"]
        .agg(["count", "mean", "median", "min", "max"])
        .reset_index()
        .sort_values("mean", ascending=False)
        .iterrows()
    ]

    return {
        "meta": meta,
        "commodity": commodity,
        "metrics": metrics,
        "series": series,
        "by_region": by_region,
        "by_market": by_market,
    }


def get_products_analysis(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region=region, date_from=date_from, date_to=date_to)
    if len(fdf) == 0:
        return {"meta": meta, "products": [], "top_commodities": [], "monthly_comparison": [], "correlation_commodities": [], "correlation_matrix": []}

    products = []
    for comm, grp in fdf.groupby("commodity_col"):
        ts = grp.groupby("ym")["price_col"].mean().sort_index()
        mean_v = float(grp["price_col"].mean())
        std_v = float(grp["price_col"].std(ddof=1)) if len(grp) > 1 else 0.0
        cv_pct = (std_v / mean_v * 100) if mean_v > 0 else 0.0
        latest_ym = str(ts.index[-1])
        yoy_last = None
        if latest_ym.startswith("2026-"):
            prev_ym = f"2025-{latest_ym[5:7]}"
            if prev_ym in ts.index and ts[prev_ym] > 0:
                yoy_last = (ts.iloc[-1] / ts[prev_ym] - 1.0) * 100.0
        products.append(
            {
                "commodity": comm,
                "category": str(grp["category_col"].iloc[0]),
                "stage": str(grp["stage_col"].iloc[0]),
                "observations": int(len(grp)),
                "markets_count": int(grp["market_col"].nunique()),
                "regions_count": int(grp["region_std"].nunique()),
                "months_count": int(grp["ym"].nunique()),
                "mean": clean_float(mean_v),
                "median": clean_float(grp["price_col"].median()),
                "min": clean_float(grp["price_col"].min()),
                "max": clean_float(grp["price_col"].max()),
                "std": clean_float(std_v),
                "cv_pct": clean_float(cv_pct),
                "latest_price": clean_float(ts.iloc[-1]),
                "latest_ym": latest_ym,
                "yoy_last_pct": clean_float(yoy_last),
            }
        )
    products.sort(key=lambda x: x["observations"], reverse=True)

    top6 = [p["commodity"] for p in products[:6]]
    piv = fdf[fdf["commodity_col"].isin(top6)].pivot_table(index="ym", columns="commodity_col", values="price_col", aggfunc="mean").sort_index()
    monthly_comparison = []
    for ym, row in piv.iterrows():
        item: dict[str, Any] = {"ym": ym}
        for col in piv.columns:
            item[col] = clean_float(row[col])
        monthly_comparison.append(item)

    piv_all = fdf.pivot_table(index="ym", columns="commodity_col", values="price_col", aggfunc="mean")
    corr_cols = [c for c in piv_all.columns if piv_all[c].notna().sum() >= 8]
    corr_df = piv_all[corr_cols].corr(min_periods=8) if len(corr_cols) >= 2 else pd.DataFrame()
    corr_rows = []
    for c1 in corr_cols:
        for c2 in corr_cols:
            n_common = int(piv_all[[c1, c2]].dropna().shape[0])
            corr_rows.append(
                {
                    "x": c1,
                    "y": c2,
                    "r": clean_float(corr_df.loc[c1, c2], 3) if not corr_df.empty else None,
                    "n_months": n_common,
                }
            )

    return {
        "meta": meta,
        "products": products,
        "top_commodities": top6,
        "monthly_comparison": monthly_comparison,
        "correlation_commodities": corr_cols,
        "correlation_matrix": corr_rows,
    }


def get_geo_analysis(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, commodity=commodity, year=year, date_from=date_from, date_to=date_to)
    if len(fdf) == 0:
        return {
            "meta": meta,
            "has_coordinates": meta["has_coordinates"],
            "summary": {},
            "regions": [],
            "markets": [],
            "most_expensive_markets": [],
            "cheapest_markets": [],
        }

    nat_mean = float(fdf["price_col"].mean())
    reg_df = (
        fdf.groupby("region_std")["price_col"]
        .agg(["count", "mean", "median", "min", "max", "std"])
        .reset_index()
        .sort_values("mean", ascending=False)
    )
    regions = [
        {
            "region": r["region_std"],
            "observations": int(r["count"]),
            "mean": clean_float(r["mean"]),
            "median": clean_float(r["median"]),
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "std": clean_float(r["std"]) or 0.0,
            "spread": clean_float(r["max"] - r["min"]),
            "gap_vs_national_pct": clean_float((r["mean"] / nat_mean - 1) * 100) if nat_mean > 0 else 0.0,
        }
        for _, r in reg_df.iterrows()
    ]

    markets = []
    if meta["has_coordinates"]:
        mkt_grp = (
            fdf.groupby(["market_col", "region_std"])
            .agg(
                latitude=("latitude", "first"),
                longitude=("longitude", "first"),
                observations=("price_col", "count"),
                mean=("price_col", "mean"),
                median=("price_col", "median"),
                min=("price_col", "min"),
                max=("price_col", "max"),
                latest_date=("date", "max"),
            )
            .reset_index()
            .sort_values("mean", ascending=False)
        )
        latest_ym = (
            fdf.sort_values("date")
            .groupby("market_col")
            .tail(1)
            .set_index("market_col")["price_col"]
            .to_dict()
        )
        for _, r in mkt_grp.iterrows():
            lat = clean_float(r["latitude"], 4)
            lon = clean_float(r["longitude"], 4)
            if lat is None or lon is None:
                continue
            markets.append(
                {
                    "market": r["market_col"],
                    "region": r["region_std"],
                    "latitude": lat,
                    "longitude": lon,
                    "observations": int(r["observations"]),
                    "mean": clean_float(r["mean"]),
                    "median": clean_float(r["median"]),
                    "min": clean_float(r["min"]),
                    "max": clean_float(r["max"]),
                    "latest_price": clean_float(latest_ym.get(r["market_col"])),
                    "latest_date": str(r["latest_date"]),
                    "gap_vs_national_pct": clean_float((r["mean"] / nat_mean - 1) * 100) if nat_mean > 0 else 0.0,
                }
            )

    summary = {
        "national_mean": clean_float(nat_mean),
        "most_expensive_region": regions[0]["region"] if regions else None,
        "most_expensive_region_mean": regions[0]["mean"] if regions else None,
        "cheapest_region": regions[-1]["region"] if regions else None,
        "cheapest_region_mean": regions[-1]["mean"] if regions else None,
        "regional_spread": clean_float(regions[0]["mean"] - regions[-1]["mean"]) if len(regions) >= 2 else 0.0,
        "market_spread": clean_float(markets[0]["mean"] - markets[-1]["mean"]) if len(markets) >= 2 else None,
        "markets_with_coords": len(markets),
    }

    return {
        "meta": meta,
        "has_coordinates": meta["has_coordinates"],
        "summary": summary,
        "regions": regions,
        "markets": markets,
        "most_expensive_markets": markets[:10],
        "cheapest_markets": list(reversed(markets[-10:])) if markets else [],
    }


def get_temporal_analysis(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region=region, market=market, commodity=commodity)
    if len(fdf) == 0:
        return {"meta": meta, "annual": [], "monthly_series": [], "heatmap": []}

    ann = fdf.groupby("year")["price_col"].agg(["count", "mean", "median", "min", "max", "std"]).reset_index().sort_values("year")
    ann["yoy_pct"] = ann["mean"].pct_change() * 100
    annual = [
        {
            "year": int(r["year"]),
            "count": int(r["count"]),
            "mean": clean_float(r["mean"]),
            "median": clean_float(r["median"]),
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "std": clean_float(r["std"]) or 0.0,
            "yoy_pct": clean_float(r["yoy_pct"]),
        }
        for _, r in ann.iterrows()
    ]

    ms = fdf.groupby("ym")["price_col"].agg(["count", "mean", "median", "min", "max"]).reset_index().sort_values("ym")
    # Rolling 6-month trend on the 15-17 month 2025-2026 series
    ms["rolling_6m"] = ms["mean"].rolling(6, min_periods=2).mean()
    monthly_series = [
        {
            "ym": r["ym"],
            "mean": clean_float(r["mean"]),
            "median": clean_float(r["median"]),
            "rolling_12m": clean_float(r["rolling_6m"]),
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "count": int(r["count"]),
        }
        for _, r in ms.iterrows()
    ]

    piv = fdf.pivot_table(index="year", columns="month", values="price_col", aggfunc="mean").sort_index()
    heatmap = []
    for yr, row in piv.iterrows():
        entry: dict[str, Any] = {"year": int(yr)}
        for m in range(1, 13):
            entry[f"m{m}"] = clean_float(row[m]) if m in piv.columns else None
        heatmap.append(entry)

    return {
        "meta": meta,
        "annual": annual,
        "monthly_series": monthly_series,
        "heatmap": heatmap,
    }


def get_markets_comparison(
    store: DataStore,
    source: str = "wfp",
    markets: list[str] | None = None,
    commodity: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, commodity=commodity, date_from=date_from, date_to=date_to)
    if len(fdf) == 0:
        return {
            "meta": meta,
            "available_markets": [],
            "selected_markets": [],
            "summary": [],
            "series": [],
            "correlation": [],
        }

    all_markets = sorted(fdf["market_col"].dropna().unique().tolist())

    if not markets:
        top_mkts = fdf["market_col"].value_counts().head(5).index.tolist()
        selected = top_mkts
    else:
        selected = [m for m in markets if m in all_markets][:8]

    sub = fdf[fdf["market_col"].isin(selected)]
    summary_rows = []
    for mkt, grp in sub.groupby("market_col"):
        ts = grp.groupby("ym")["price_col"].mean().sort_index()
        mean_v = float(grp["price_col"].mean())
        std_v = float(grp["price_col"].std(ddof=1)) if len(grp) > 1 else 0.0
        summary_rows.append(
            {
                "market": mkt,
                "region": str(grp["region_std"].iloc[0]),
                "observations": int(len(grp)),
                "mean": clean_float(mean_v),
                "median": clean_float(grp["price_col"].median()),
                "min": clean_float(grp["price_col"].min()),
                "max": clean_float(grp["price_col"].max()),
                "std": clean_float(std_v),
                "cv_pct": clean_float(std_v / mean_v * 100) if mean_v > 0 else 0.0,
                "latest_price": clean_float(ts.iloc[-1]),
                "latest_ym": str(ts.index[-1]),
            }
        )
    summary_rows.sort(key=lambda x: x["mean"] or 0, reverse=True)

    piv = sub.pivot_table(index="ym", columns="market_col", values="price_col", aggfunc="mean").sort_index()
    series = []
    for ym, row in piv.iterrows():
        pt: dict[str, Any] = {"ym": ym}
        for col in piv.columns:
            pt[col] = clean_float(row[col])
        series.append(pt)

    corr_df = piv.corr(min_periods=5)
    corr_matrix = []
    for c1 in piv.columns:
        for c2 in piv.columns:
            corr_matrix.append({"x": c1, "y": c2, "r": clean_float(corr_df.loc[c1, c2], 3)})

    return {
        "meta": meta,
        "available_markets": all_markets,
        "selected_markets": selected,
        "summary": summary_rows,
        "series": series,
        "correlation": corr_matrix,
    }


def get_statistical_study(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region=region, market=market, commodity=commodity, date_from=date_from, date_to=date_to)
    if len(fdf) == 0:
        return {
            "meta": meta,
            "summary": None,
            "histogram": [],
            "boxplots": [],
            "outliers_sample": [],
            "correlation_commodities": [],
            "correlation_matrix": [],
            "interpretations": [meta.get("empty_reason") or "Aucune observation sur la période 2025–2026 pour cette sélection."],
        }

    s = fdf["price_col"].dropna()
    n = int(len(s))
    mean_v = float(s.mean())
    median_v = float(s.median())
    var_v = float(s.var(ddof=1)) if n > 1 else 0.0
    std_v = float(s.std(ddof=1)) if n > 1 else 0.0
    q25 = float(s.quantile(0.25))
    q75 = float(s.quantile(0.75))
    iqr = q75 - q25
    cv_pct = (std_v / mean_v * 100) if mean_v > 0 else 0.0
    skew_v = float(scipy_stats.skew(s, bias=False)) if n > 2 and std_v > 0 else 0.0
    kurt_v = float(scipy_stats.kurtosis(s, bias=False)) if n > 3 and std_v > 0 else 0.0

    ts = fdf.groupby("ym")["price_col"].mean().sort_index()
    mom_last = ((ts.iloc[-1] / ts.iloc[-2] - 1) * 100) if len(ts) >= 2 and ts.iloc[-2] > 0 else None
    latest_ym = str(ts.index[-1])
    yoy_last = None
    if latest_ym.startswith("2026-"):
        prev_ym = f"2025-{latest_ym[5:7]}"
        if prev_ym in ts.index and ts[prev_ym] > 0:
            yoy_last = (ts.iloc[-1] / ts[prev_ym] - 1.0) * 100.0

    lower_15, upper_15 = q25 - 1.5 * iqr, q75 + 1.5 * iqr
    lower_30, upper_30 = q25 - 3.0 * iqr, q75 + 3.0 * iqr
    z_scores = ((fdf["price_col"] - mean_v) / std_v).abs() if std_v > 0 else pd.Series(0.0, index=fdf.index)

    out_15_mask = (fdf["price_col"] < lower_15) | (fdf["price_col"] > upper_15)
    out_30_mask = (fdf["price_col"] < lower_30) | (fdf["price_col"] > upper_30)
    out_z_mask = z_scores > 3.0

    outlier_df = fdf.loc[out_15_mask | out_z_mask].copy()
    outlier_df["z_score"] = z_scores.loc[outlier_df.index]
    outlier_df = outlier_df.sort_values("price_col", ascending=False).head(30)
    outliers_sample = [
        {
            "date": str(r["date"]),
            "region": str(r["region_std"]),
            "market": str(r["market_col"]),
            "commodity": str(r["commodity_col"]),
            "price": clean_float(r["price_col"]),
            "z_score": clean_float(r["z_score"], 2),
            "severity": "Extrême (3×EIQ)" if (r["price_col"] < lower_30 or r["price_col"] > upper_30) else "Modérée (1,5×EIQ)",
        }
        for _, r in outlier_df.iterrows()
    ]

    counts, edges = np.histogram(s.values, bins=min(16, max(8, int(np.sqrt(n) // 2))))
    histogram = [
        {
            "bin_label": f"{int(round(edges[i]))}–{int(round(edges[i+1]))}",
            "bin_mid": clean_float((edges[i] + edges[i + 1]) / 2),
            "count": int(counts[i]),
            "pct": clean_float(counts[i] / n * 100, 1),
        }
        for i in range(len(counts))
    ]

    box_col = "region_std" if fdf["region_std"].nunique() > 1 else "commodity_col"
    boxplots = []
    for grp_name, grp in fdf.groupby(box_col):
        gs = grp["price_col"].dropna()
        if len(gs) < 3:
            continue
        gq1, gmed, gq3 = float(gs.quantile(0.25)), float(gs.median()), float(gs.quantile(0.75))
        giqr = gq3 - gq1
        w_low = float(gs[gs >= gq1 - 1.5 * giqr].min()) if (gs >= gq1 - 1.5 * giqr).any() else float(gs.min())
        w_high = float(gs[gs <= gq3 + 1.5 * giqr].max()) if (gs <= gq3 + 1.5 * giqr).any() else float(gs.max())
        g_out = int(((gs < gq1 - 1.5 * giqr) | (gs > gq3 + 1.5 * giqr)).sum())
        boxplots.append(
            {
                "group": str(grp_name),
                "count": int(len(gs)),
                "min": clean_float(gs.min()),
                "whisker_low": clean_float(w_low),
                "q25": clean_float(gq1),
                "median": clean_float(gmed),
                "mean": clean_float(gs.mean()),
                "q75": clean_float(gq3),
                "whisker_high": clean_float(w_high),
                "max": clean_float(gs.max()),
                "iqr": clean_float(giqr),
                "outliers_count": g_out,
            }
        )
    boxplots.sort(key=lambda x: x["median"] or 0, reverse=True)

    corr_scope = apply_filters(df, region=region, market=market, date_from=date_from, date_to=date_to)
    piv = corr_scope.pivot_table(index="ym", columns="commodity_col", values="price_col", aggfunc="mean")
    corr_cols = [c for c in piv.columns if piv[c].notna().sum() >= 8]
    corr_matrix = []
    strongest_pair = None
    strongest_r = 0.0
    if len(corr_cols) >= 2:
        cmat = piv[corr_cols].corr(min_periods=8)
        for c1 in corr_cols:
            for c2 in corr_cols:
                r_val = clean_float(cmat.loc[c1, c2], 3)
                n_obs = int(piv[[c1, c2]].dropna().shape[0])
                corr_matrix.append({"x": c1, "y": c2, "r": r_val, "n_months": n_obs})
                if c1 < c2 and r_val is not None and abs(r_val) > abs(strongest_r):
                    strongest_r = r_val
                    strongest_pair = (c1, c2, r_val, n_obs)

    interpretations = []
    disp_label = (
        "faible dispersion (marché relativement stable)"
        if cv_pct < 15
        else ("dispersion modérée" if cv_pct < 35 else "forte volatilité / hétérogénéité")
    )
    interpretations.append(
        f"Sur la période 2025–2026 ({n:,} observations en {meta['unit']}), la moyenne s'établit à {clean_float(mean_v)} "
        f"contre une médiane de {clean_float(median_v)}, avec un écart-type de {clean_float(std_v)} "
        f"et un coefficient de variation de {clean_float(cv_pct)} %, traduisant une {disp_label}."
    )
    if skew_v > 0.5:
        interpretations.append(
            f"La distribution est asymétrique à droite (coefficient d'asymétrie = {clean_float(skew_v, 2)}), "
            f"indiquant l'existence de pics de prix élevés qui tirent la moyenne au-dessus de la médiane."
        )
    elif skew_v < -0.5:
        interpretations.append(
            f"La distribution est asymétrique à gauche (coefficient d'asymétrie = {clean_float(skew_v, 2)}), "
            f"avec quelques valeurs ponctuellement plus basses."
        )
    else:
        interpretations.append(
            f"La distribution est globalement symétrique autour de la médiane (coefficient d'asymétrie = {clean_float(skew_v, 2)})."
        )
    interpretations.append(
        f"L'intervalle interquartile [Q1 = {clean_float(q25)}, Q3 = {clean_float(q75)}] couvre 50 % des prix "
        f"(écart interquartile, EIQ = {clean_float(iqr)}). {int(out_15_mask.sum())} observations dépassent 1,5×EIQ et "
        f"{int(out_30_mask.sum())} dépassent 3×EIQ."
    )
    if yoy_last is not None:
        sens = "hausse" if yoy_last >= 0 else "baisse"
        interpretations.append(
            f"Comparaison {fmt_ym(latest_ym)} contre {fmt_ym(f'2025-{latest_ym[5:7]}')} : le prix moyen mensuel enregistre une {sens} "
            f"de {abs(clean_float(yoy_last) or 0)} % sur un an (glissement annuel 2026 contre 2025)."
        )
    elif mom_last is not None:
        sens = "hausse" if mom_last >= 0 else "baisse"
        interpretations.append(
            f"Sur le dernier mois disponible ({fmt_ym(latest_ym)}), la variation mensuelle est une {sens} de {abs(clean_float(mom_last) or 0)} %."
        )
    if strongest_pair:
        interpretations.append(
            f"Corrélation inter-produits la plus marquée en 2025–2026 : {strongest_pair[0]} et {strongest_pair[1]} "
            f"(r = {strongest_pair[2]}, calculée sur {strongest_pair[3]} mois communs)."
        )

    return {
        "meta": meta,
        "summary": {
            "count": n,
            "mean": clean_float(mean_v),
            "median": clean_float(median_v),
            "min": clean_float(s.min()),
            "max": clean_float(s.max()),
            "variance": clean_float(var_v),
            "std": clean_float(std_v),
            "q10": clean_float(s.quantile(0.10)),
            "q25": clean_float(q25),
            "q75": clean_float(q75),
            "q90": clean_float(s.quantile(0.90)),
            "iqr": clean_float(iqr),
            "cv_pct": clean_float(cv_pct),
            "skewness": clean_float(skew_v, 3),
            "kurtosis": clean_float(kurt_v, 3),
            "mom_last_pct": clean_float(mom_last),
            "yoy_last_pct": clean_float(yoy_last),
            "outliers_iqr_15_count": int(out_15_mask.sum()),
            "outliers_iqr_30_count": int(out_30_mask.sum()),
            "outliers_z3_count": int(out_z_mask.sum()),
        },
        "histogram": histogram,
        "boxplots_group_by": box_col,
        "boxplots": boxplots,
        "outliers_sample": outliers_sample,
        "correlation_commodities": corr_cols,
        "correlation_matrix": corr_matrix,
        "interpretations": [fr_dec(t) for t in interpretations],
    }
