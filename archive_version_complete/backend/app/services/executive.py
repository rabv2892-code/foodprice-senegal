from __future__ import annotations

from typing import Any

import pandas as pd

from ..config import ALL_2026_MONTHS, OFFICIAL_PERIOD_LABEL
from ..data_store import DataStore
from ..i18n import fr_unit
from .analytics import apply_filters, clean_float, get_source_dataframe
from .forecasting import run_forecast_pipeline

MONTH_LABELS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct", "Nov", "Déc"]

_FORECAST_CACHE: dict[tuple, dict[str, Any]] = {}


def _cached_forecast(store: DataStore, source: str, commodity: str, region: str | None, market: str | None, horizon: int) -> dict[str, Any]:
    key = (source, commodity, region or "ALL", market or "ALL", horizon)
    if key not in _FORECAST_CACHE:
        _FORECAST_CACHE[key] = run_forecast_pipeline(
            store, source=source, commodity=commodity, region=region, market=market, horizon=horizon
        )
    return _FORECAST_CACHE[key]


def _unit_label(meta: dict[str, Any], raw_unit: Any) -> str:
    if raw_unit is None or (isinstance(raw_unit, float) and pd.isna(raw_unit)) or str(raw_unit).strip() == "":
        return meta["unit"]
    return fr_unit(meta["currency"], raw_unit)


def _matched_change_pct(cur_rows: pd.DataFrame, prev_rows: pd.DataFrame) -> tuple[float | None, int, float, float]:
    cur_by_mkt = cur_rows.groupby("market_col")["price_col"].mean()
    prev_by_mkt = prev_rows.groupby("market_col")["price_col"].mean()
    common = cur_by_mkt.index.intersection(prev_by_mkt.index)
    if len(common) > 0:
        cur_p, prev_p = float(cur_by_mkt.loc[common].mean()), float(prev_by_mkt.loc[common].mean())
    else:
        cur_p, prev_p = float(cur_by_mkt.mean()), float(prev_by_mkt.mean())
    pct = (cur_p / prev_p - 1.0) * 100.0 if prev_p > 0 else None
    return pct, int(len(common)), cur_p, prev_p


def _empty_payload(meta: dict[str, Any], store: DataStore, reason: str) -> dict[str, Any]:
    return {
        "meta": meta,
        "official_period": OFFICIAL_PERIOD_LABEL,
        "source_coverage": store.coverage_summary,
        "empty": True,
        "empty_reason": reason,
        "focus_commodity": None,
        "focus_auto_selected": False,
        "scope": None,
        "kpis": None,
        "price_evolution": [],
        "forecast": None,
        "distribution": {"by_category": [], "by_commodity": [], "total": 0},
        "monthly_comparison": [],
        "top_products": {"unit": meta["unit"], "items": [], "excluded_incompatible_units": []},
        "regional_comparison": {"reference_ym": None, "reference_price": None, "regions": []},
        "map_markets": [],
    }


def get_executive_dashboard(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
    category: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    horizon: int = 6,
) -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    src = meta["source"]
    if len(df):
        df = df[df["price_col"].notna()]
    if len(df) == 0:
        return _empty_payload(meta, store, meta.get("empty_reason") or "Aucune observation 2025–2026 pour cette source.")

    explicit_commodity = commodity if (commodity and commodity != "ALL") else None
    region_f = region if (region and region != "ALL") else None
    market_f = market if (market and market != "ALL") else None

    # All products in the filtered scope (used for distribution, ranking, active markets)
    scope_all = apply_filters(df, region_f, market_f, None, category, year, date_from, date_to)
    scope_sel = scope_all if explicit_commodity is None else scope_all[scope_all["commodity_col"] == explicit_commodity]
    if len(scope_sel) == 0:
        return _empty_payload(meta, store, "Aucune observation réelle ne correspond à cette combinaison de filtres sur 2025–2026.")

    if explicit_commodity:
        focus = explicit_commodity
        auto_selected = False
    else:
        # Most-observed product over the whole 2025–2026 scope, so the focus does not jump with Année/Période
        stable = apply_filters(df, region_f, market_f, None, category)
        ranked = [c for c in stable["commodity_col"].value_counts().index if c in set(scope_all["commodity_col"])]
        focus = str(ranked[0]) if ranked else str(scope_all["commodity_col"].value_counts().index[0])
        auto_selected = True

    focus_df = scope_all[scope_all["commodity_col"] == focus]
    unit_focus = _unit_label(meta, focus_df["unit"].mode().iloc[0] if "unit" in focus_df.columns and focus_df["unit"].notna().any() else None)

    # ---------- Monthly real observations for the focus product ----------
    monthly = (
        focus_df.groupby("ym")
        .agg(
            price=("price_col", "mean"),
            min=("price_col", "min"),
            max=("price_col", "max"),
            count=("price_col", "count"),
            markets=("market_col", "nunique"),
            last_date=("date", "max"),
        )
        .reset_index()
        .sort_values("ym")
    )
    months_sorted = monthly["ym"].tolist()

    # ---------- KPI 1: latest observed price ----------
    last_ym = months_sorted[-1]
    last_rows = focus_df[focus_df["ym"] == last_ym]
    latest_price = float(last_rows["price_col"].mean())
    latest_kpi = {
        "value": clean_float(latest_price),
        "unit": unit_focus,
        "ym": last_ym,
        "date": str(last_rows["date"].max()),
        "markets_count": int(last_rows["market_col"].nunique()),
        "observations": int(len(last_rows)),
        "is_market_level": market_f is not None,
    }

    # ---------- KPI 2: month-over-month change on matched markets ----------
    mom_kpi: dict[str, Any] = {"value_pct": None, "previous_ym": None, "current_ym": last_ym, "matched_markets": 0,
                               "previous_price": None, "current_price": None, "consecutive": False, "method": None}
    if len(months_sorted) >= 2:
        prev_ym = months_sorted[-2]
        prev_rows = focus_df[focus_df["ym"] == prev_ym]
        pct, n_common, cur_p, prev_p = _matched_change_pct(last_rows, prev_rows)
        method = "Marchés appariés présents sur les deux mois" if n_common else "Moyennes des relevés (aucun marché commun)"
        p_dt = pd.Period(prev_ym, freq="M")
        c_dt = pd.Period(last_ym, freq="M")
        mom_kpi.update(
            {
                "value_pct": clean_float(pct),
                "previous_ym": prev_ym,
                "matched_markets": n_common,
                "previous_price": clean_float(prev_p),
                "current_price": clean_float(cur_p),
                "consecutive": bool((c_dt - p_dt).n == 1),
                "method": method,
            }
        )

    # ---------- KPI 3: active markets with real observations ----------
    active_scope = scope_sel
    markets_by_month = (
        active_scope.groupby("ym")["market_col"].nunique().reset_index().rename(columns={"market_col": "markets"}).sort_values("ym")
    )
    active_kpi = {
        "value": int(active_scope["market_col"].nunique()),
        "regions_count": int(active_scope["region_std"].nunique()),
        "focus_markets": int(focus_df["market_col"].nunique()),
        "date_min": str(active_scope["date"].min()),
        "date_max": str(active_scope["date"].max()),
        "observations": int(len(active_scope)),
        "by_month": [{"ym": r["ym"], "markets": int(r["markets"])} for _, r in markets_by_month.iterrows()],
    }

    # ---------- KPI 4 + main chart forecast (calibrated on full 2025–2026 history) ----------
    fc = _cached_forecast(store, src, focus, region_f, market_f, horizon)
    forecast_block: dict[str, Any]
    if fc.get("eligible"):
        final = fc["forecast_series"][-1]
        best = next((m for m in fc["model_comparison"] if m["selected"]), None)
        forecast_block = {
            "eligible": True,
            "horizon": horizon,
            "model": fc["best_model"],
            "specification": fc["best_specification"],
            "target_ym": final["ym"],
            "value": final["forecast"],
            "lower_95": final["lower_95"],
            "upper_95": final["upper_95"],
            "delta_pct_vs_last": final["delta_pct_vs_last"],
            "last_observed_date": fc["series_diagnostics"]["last_observed_date"],
            "last_observed_price": fc["series_diagnostics"]["last_observed_price"],
            "rmse": best["rmse"] if best else None,
            "mae": best["mae"] if best else None,
            "mape_pct": best["mape_pct"] if best else None,
            "series": [
                {"ym": f["ym"], "forecast": f["forecast"], "lower_95": f["lower_95"], "upper_95": f["upper_95"]}
                for f in fc["forecast_series"]
            ],
            "reason": None,
        }
    else:
        forecast_block = {
            "eligible": False,
            "horizon": horizon,
            "reason": fc.get("reason"),
            "series": [],
            "observed_months": (fc.get("series_diagnostics") or {}).get("observed_months"),
        }

    price_evolution = [
        {
            "ym": r["ym"],
            "year": int(str(r["ym"])[:4]),
            "price": clean_float(r["price"]),
            "observed_2025": clean_float(r["price"]) if str(r["ym"]).startswith("2025") else None,
            "observed_2026": clean_float(r["price"]) if str(r["ym"]).startswith("2026") else None,
            "min": clean_float(r["min"]),
            "max": clean_float(r["max"]),
            "observations": int(r["count"]),
            "markets": int(r["markets"]),
            "last_date": str(r["last_date"]),
        }
        for _, r in monthly.iterrows()
    ]

    # ---------- Distribution of real observations ----------
    dist_scope = scope_sel
    by_cat = dist_scope.groupby("category_col").size().sort_values(ascending=False)
    by_com = (
        dist_scope.groupby(["commodity_col", "category_col"]).size().reset_index(name="count").sort_values("count", ascending=False)
    )
    total_obs = int(len(dist_scope))
    distribution = {
        "total": total_obs,
        "by_category": [
            {"name": str(k), "count": int(v), "pct": clean_float(v / total_obs * 100, 1)} for k, v in by_cat.items()
        ],
        "by_commodity": [
            {"name": str(r["commodity_col"]), "category": str(r["category_col"]), "count": int(r["count"]),
             "pct": clean_float(r["count"] / total_obs * 100, 1)}
            for _, r in by_com.iterrows()
        ],
    }

    # ---------- Monthly 2025 vs 2026 comparison ----------
    monthly_comparison = []
    mp = monthly.set_index("ym")
    for m in range(1, 13):
        y25, y26 = f"2025-{m:02d}", f"2026-{m:02d}"
        p25 = float(mp.loc[y25, "price"]) if y25 in mp.index else None
        p26 = float(mp.loc[y26, "price"]) if y26 in mp.index else None
        monthly_comparison.append(
            {
                "month": m,
                "month_label": MONTH_LABELS[m - 1],
                "price_2025": clean_float(p25),
                "price_2026": clean_float(p26),
                "obs_2025": int(mp.loc[y25, "count"]) if y25 in mp.index else 0,
                "obs_2026": int(mp.loc[y26, "count"]) if y26 in mp.index else 0,
                "date_2025": str(mp.loc[y25, "last_date"]) if y25 in mp.index else None,
                "date_2026": str(mp.loc[y26, "last_date"]) if y26 in mp.index else None,
                "yoy_pct": clean_float((p26 / p25 - 1.0) * 100.0) if (p25 and p26) else None,
                "missing_2026": y26 in ALL_2026_MONTHS and y26 not in mp.index,
            }
        )

    # ---------- Top products by latest observed price (compatible units only) ----------
    rank_scope = scope_all.copy()
    rank_scope["unit_label"] = (
        rank_scope["unit"].map(lambda u: _unit_label(meta, u)) if "unit" in rank_scope.columns else meta["unit"]
    )
    dominant_unit = str(rank_scope["unit_label"].mode().iloc[0])
    excluded = sorted(rank_scope.loc[rank_scope["unit_label"] != dominant_unit, "commodity_col"].unique().tolist())
    rank_scope = rank_scope[rank_scope["unit_label"] == dominant_unit]
    top_items = []
    for comm, grp in rank_scope.groupby("commodity_col"):
        g_ym = grp["ym"].max()
        g_last = grp[grp["ym"] == g_ym]
        g_months = sorted(grp["ym"].unique().tolist())
        change = None
        if len(g_months) >= 2:
            change, _, _, _ = _matched_change_pct(g_last, grp[grp["ym"] == g_months[-2]])
        top_items.append(
            {
                "commodity": str(comm),
                "category": str(grp["category_col"].iloc[0]),
                "latest_price": clean_float(g_last["price_col"].mean()),
                "unit": dominant_unit,
                "latest_ym": str(g_ym),
                "latest_date": str(g_last["date"].max()),
                "markets": int(g_last["market_col"].nunique()),
                "change_pct": clean_float(change),
                "is_focus": str(comm) == focus,
            }
        )
    top_items.sort(key=lambda x: x["latest_price"] or 0, reverse=True)

    # ---------- Regional comparison for the focus product ----------
    reg_scope = apply_filters(df, None, None, focus, category, year, date_from, date_to)
    regional: dict[str, Any] = {"reference_ym": None, "reference_price": None, "regions": []}
    map_markets: list[dict[str, Any]] = []
    if len(reg_scope):
        ref_ym = str(reg_scope["ym"].max())
        ref_price = float(reg_scope.loc[reg_scope["ym"] == ref_ym, "price_col"].mean())
        regions_out = []
        for reg, grp in reg_scope.groupby("region_std"):
            r_ym = str(grp["ym"].max())
            r_last = grp[grp["ym"] == r_ym]
            r_ref = grp[grp["ym"] == ref_ym]
            ref_val = float(r_ref["price_col"].mean()) if len(r_ref) else None
            mk_latest = (
                r_last.groupby("market_col").agg(price=("price_col", "mean"), date=("date", "max")).reset_index()
                .sort_values("price", ascending=False)
            )
            regions_out.append(
                {
                    "region": str(reg),
                    "latest_price": clean_float(r_last["price_col"].mean()),
                    "latest_ym": r_ym,
                    "latest_date": str(r_last["date"].max()),
                    "price_at_reference": clean_float(ref_val),
                    "gap_vs_reference_pct": clean_float((ref_val / ref_price - 1.0) * 100.0) if (ref_val and ref_price > 0) else None,
                    "is_reference_month": r_ym == ref_ym,
                    "markets": [
                        {"market": str(m["market_col"]), "price": clean_float(m["price"]), "date": str(m["date"])}
                        for _, m in mk_latest.iterrows()
                    ],
                    "markets_count": int(grp["market_col"].nunique()),
                    "observations": int(len(grp)),
                    "is_selected": region_f is not None and str(reg) == region_f,
                }
            )
        regions_out.sort(key=lambda x: x["latest_price"] or 0, reverse=True)
        regional = {
            "reference_ym": ref_ym,
            "reference_price": clean_float(ref_price),
            "regions_count": len(regions_out),
            "regions": regions_out,
        }

        if meta["has_coordinates"]:
            mk = (
                reg_scope.groupby(["market_col", "region_std"])
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
            )
            last_price = reg_scope.sort_values("date").groupby("market_col").tail(1).set_index("market_col")["price_col"].to_dict()
            for _, r in mk.iterrows():
                lat, lon = clean_float(r["latitude"], 4), clean_float(r["longitude"], 4)
                if lat is None or lon is None:
                    continue
                lp = last_price.get(r["market_col"])
                map_markets.append(
                    {
                        "market": str(r["market_col"]),
                        "region": str(r["region_std"]),
                        "latitude": lat,
                        "longitude": lon,
                        "observations": int(r["observations"]),
                        "mean": clean_float(r["mean"]),
                        "median": clean_float(r["median"]),
                        "min": clean_float(r["min"]),
                        "max": clean_float(r["max"]),
                        "latest_price": clean_float(lp),
                        "latest_date": str(r["latest_date"]),
                        "gap_vs_national_pct": clean_float((lp / ref_price - 1.0) * 100.0) if (lp and ref_price > 0) else 0.0,
                    }
                )

    focus_2026 = sorted({m for m in months_sorted if m.startswith("2026")})
    return {
        "meta": meta,
        "official_period": OFFICIAL_PERIOD_LABEL,
        "source_coverage": store.coverage_summary,
        "empty": False,
        "empty_reason": None,
        "focus_commodity": focus,
        "focus_auto_selected": auto_selected,
        "focus_unit": unit_focus,
        "scope": {
            "region": region_f or "ALL",
            "market": market_f or "ALL",
            "category": category or "ALL",
            "year": year,
            "date_min": str(focus_df["date"].min()),
            "date_max": str(focus_df["date"].max()),
            "months_2025": len([m for m in months_sorted if m.startswith("2025")]),
            "months_2026": len(focus_2026),
            "available_2026_months": focus_2026,
            "missing_2026_months": [m for m in ALL_2026_MONTHS if m not in focus_2026],
        },
        "kpis": {
            "latest_price": latest_kpi,
            "monthly_change": mom_kpi,
            "active_markets": active_kpi,
            "forecast": forecast_block,
        },
        "price_evolution": price_evolution,
        "forecast": forecast_block,
        "distribution": distribution,
        "monthly_comparison": monthly_comparison,
        "top_products": {"unit": dominant_unit, "items": top_items, "excluded_incompatible_units": excluded},
        "regional_comparison": regional,
        "map_markets": map_markets,
    }
