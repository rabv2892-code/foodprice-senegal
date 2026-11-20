from __future__ import annotations

import logging
import time
import warnings
from typing import Any

import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, root_mean_squared_error
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

from ..i18n import fmt_date, fmt_ym, fr_dec
from ..config import ALL_2026_MONTHS, OFFICIAL_PERIOD_LABEL
from ..data_store import DataStore
from .analytics import apply_filters, clean_float, get_source_dataframe

try:
    from prophet import Prophet

    PROPHET_AVAILABLE = True
except Exception:
    PROPHET_AVAILABLE = False

logging.getLogger("cmdstanpy").setLevel(logging.WARNING)
logging.getLogger("prophet").setLevel(logging.WARNING)


def compute_mape(y_true: np.ndarray, y_pred: np.ndarray) -> float | None:
    mask = y_true > 0
    if not mask.any():
        return None
    return float(np.mean(np.abs((y_true[mask] - y_pred[mask]) / y_true[mask])) * 100.0)


def detect_seasonality(series: pd.Series) -> dict[str, Any]:
    """Evaluate whether a 2025-2026 series is long enough (>= 24 months) for multi-cycle seasonality."""
    n = len(series)
    if n < 24 or series.std(ddof=1) == 0:
        return {
            "detected": False,
            "acf_lag12": None,
            "seasonal_strength": 0.0,
            "description": (
                f"Série 2025–2026 de {n} mois (< 24 mois) : insuffisante pour mesurer statistiquement "
                f"une saisonnalité annuelle récurrente sur plusieurs cycles."
            ),
        }
    acf12 = float(series.autocorr(lag=12)) if n >= 28 else None
    if acf12 is not None and np.isnan(acf12):
        acf12 = None
    detrended = (series - series.rolling(12, center=True, min_periods=6).mean()).dropna()
    if len(detrended) >= 12 and series.var(ddof=1) > 0:
        month_means = detrended.groupby(detrended.index.month).mean()
        strength = float(np.clip(month_means.var(ddof=0) / max(1e-9, detrended.var(ddof=0)), 0.0, 1.0))
    else:
        strength = 0.0
    detected = (acf12 is not None and acf12 >= 0.25) or strength >= 0.20
    return {
        "detected": bool(detected),
        "acf_lag12": clean_float(acf12, 3),
        "seasonal_strength": clean_float(strength, 3),
        "description": fr_dec(f"Force saisonnière mesurée : {clean_float(strength * 100, 1)} %."),
    }


def _fit_predict_holtwinters(train: pd.Series, steps: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    use_seasonal = len(train) >= 24
    best_model = None
    best_aic = float("inf")
    best_cfg = "Holt (tendance double 2025–2026)"

    configs = []
    if use_seasonal:
        configs.extend([
            ("add", "add", True, 12, "Holt-Winters additif amorti (m=12)"),
            ("add", "add", False, 12, "Holt-Winters additif (m=12)"),
        ])
    configs.extend([
        ("add", None, True, None, "Holt tendance amortie (2025–2026)"),
        ("add", None, False, None, "Holt tendance linéaire (2025–2026)"),
        (None, None, False, None, "Lissage exponentiel simple (2025–2026)"),
    ])

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for trend, seasonal, damped, sp, label in configs:
            try:
                m = ExponentialSmoothing(
                    train.astype(float),
                    trend=trend,
                    damped_trend=damped if trend else False,
                    seasonal=seasonal,
                    seasonal_periods=sp,
                    initialization_method="estimated",
                ).fit(optimized=True)
                if np.isfinite(m.aic) and m.aic < best_aic:
                    best_aic = float(m.aic)
                    best_model = m
                    best_cfg = label
            except Exception:
                continue

    if best_model is None:
        raise RuntimeError("Holt-Winters n'a pas pu converger sur cette série 2025–2026.")

    pred = np.asarray(best_model.forecast(steps), dtype=float)
    resid_std = float(np.nanstd(best_model.resid, ddof=1)) if len(best_model.resid) > 2 else float(train.std(ddof=1) * 0.1)
    h_scale = np.sqrt(np.arange(1, steps + 1, dtype=float))
    margin = 1.96 * resid_std * h_scale
    return pred, np.maximum(0.0, pred - margin), pred + margin, best_cfg


def _fit_predict_arima(train: pd.Series, steps: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    best_res = None
    best_aic = float("inf")
    best_order = (1, 1, 0)
    candidates = [(1, 1, 0), (0, 1, 1), (1, 1, 1), (1, 0, 1), (2, 1, 0), (1, 0, 0), (0, 1, 0)]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for order in candidates:
            try:
                res = ARIMA(train.astype(float), order=order).fit()
                if np.isfinite(res.aic) and res.aic < best_aic:
                    best_aic = float(res.aic)
                    best_res = res
                    best_order = order
            except Exception:
                continue
    if best_res is None:
        raise RuntimeError("ARIMA n'a pas pu converger sur cette série 2025–2026.")
    fc = best_res.get_forecast(steps=steps)
    pred = np.asarray(fc.predicted_mean, dtype=float)
    ci = np.asarray(fc.conf_int(alpha=0.05), dtype=float)
    return pred, np.maximum(0.0, ci[:, 0]), ci[:, 1], f"ARIMA{best_order}"


def _fit_predict_sarima(train: pd.Series, steps: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    if len(train) < 24:
        raise RuntimeError(
            f"Série d'entraînement 2025–2026 de {len(train)} mois (< 24 mois) : "
            f"insuffisante pour calibrer SARIMA saisonnier (m=12)."
        )
    best_res = None
    best_aic = float("inf")
    best_spec = ""
    candidates = [((1, 1, 1), (1, 0, 1, 12)), ((1, 1, 0), (1, 0, 0, 12)), ((0, 1, 1), (0, 1, 1, 12))]
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for order, sorder in candidates:
            try:
                res = SARIMAX(
                    train.astype(float),
                    order=order,
                    seasonal_order=sorder,
                    enforce_stationarity=False,
                    enforce_invertibility=False,
                ).fit(disp=False, maxiter=120)
                if np.isfinite(res.aic) and res.aic < best_aic:
                    best_aic = float(res.aic)
                    best_res = res
                    best_spec = f"SARIMA{order}x{sorder}"
            except Exception:
                continue
    if best_res is None:
        raise RuntimeError("SARIMA n'a pas pu converger.")
    fc = best_res.get_forecast(steps=steps)
    pred = np.asarray(fc.predicted_mean, dtype=float)
    ci = np.asarray(fc.conf_int(alpha=0.05), dtype=float)
    return pred, np.maximum(0.0, ci[:, 0]), ci[:, 1], best_spec


def _fit_predict_prophet(obs_df: pd.DataFrame, future_dates: pd.DatetimeIndex) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    if not PROPHET_AVAILABLE:
        raise RuntimeError("Prophet n'est pas disponible dans cet environnement.")
    if len(obs_df) < 7:
        raise RuntimeError("Trop peu d'observations directes pour calibrer Prophet.")
    has_yearly = len(obs_df) >= 24
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        m = Prophet(
            yearly_seasonality=has_yearly,
            weekly_seasonality=False,
            daily_seasonality=False,
            interval_width=0.95,
            changepoint_prior_scale=0.10,
            n_changepoints=min(5, max(1, len(obs_df) - 2)),
        )
        m.fit(obs_df[["ds", "y"]])
        fut = pd.DataFrame({"ds": future_dates})
        fc = m.predict(fut)
    pred = np.asarray(fc["yhat"].values, dtype=float)
    low = np.maximum(0.0, np.asarray(fc["yhat_lower"].values, dtype=float))
    high = np.asarray(fc["yhat_upper"].values, dtype=float)
    return pred, low, high, "Prophet (tendance 2025–2026)"


def get_forecast_options(store: DataStore, source: str = "wfp") -> dict[str, Any]:
    df, meta = get_source_dataframe(store, source)
    if len(df) == 0:
        return {
            "meta": meta,
            "commodities": [],
            "regions": [],
            "markets": [],
            "markets_by_region": {},
            "horizons": [1, 3, 6, 12],
            "prophet_available": PROPHET_AVAILABLE,
        }
    commodities = sorted(df["commodity_col"].dropna().unique().tolist())
    regions = sorted(df["region_std"].dropna().unique().tolist())
    markets_by_region: dict[str, list[str]] = {}
    for reg, grp in df.groupby("region_std"):
        markets_by_region[str(reg)] = sorted(grp["market_col"].dropna().unique().tolist())
    all_markets = sorted(df["market_col"].dropna().unique().tolist())
    return {
        "meta": meta,
        "commodities": commodities,
        "regions": regions,
        "markets": all_markets,
        "markets_by_region": markets_by_region,
        "horizons": [1, 3, 6, 12],
        "prophet_available": PROPHET_AVAILABLE,
    }


def run_forecast_pipeline(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
    horizon: int = 6,
) -> dict[str, Any]:
    if horizon not in (1, 3, 6, 12):
        horizon = 6

    df, meta = get_source_dataframe(store, source)
    if len(df) == 0:
        return {
            "eligible": False,
            "reason": meta.get("empty_reason") or f"Aucune donnée disponible sur la période officielle ({OFFICIAL_PERIOD_LABEL}).",
            "meta": meta,
            "scope": f"{source.upper()} (0 observation en 2025–2026)",
        }

    if not commodity or commodity == "ALL" or commodity not in df["commodity_col"].values:
        commodity = str(df["commodity_col"].value_counts().index[0])

    fdf = apply_filters(df, region=region, market=market, commodity=commodity)
    scope_desc = f"{commodity} — " + (
        f"Marché {market}" if (market and market != "ALL") else (f"Région {region}" if (region and region != "ALL") else "Moyenne nationale des marchés filtrés")
    )

    if len(fdf) == 0:
        return {
            "eligible": False,
            "reason": f"Aucune donnée disponible sur {OFFICIAL_PERIOD_LABEL} pour cette combinaison source / produit / région / marché.",
            "meta": meta,
            "scope": scope_desc,
        }

    monthly_obs = (
        fdf.groupby("ym")
        .agg(price=("price_col", "mean"), obs_count=("price_col", "count"))
        .sort_index()
    )
    monthly_obs.index = pd.to_datetime(monthly_obs.index + "-01")
    full_idx = pd.date_range(monthly_obs.index.min(), monthly_obs.index.max(), freq="MS")
    grid = pd.DataFrame(index=full_idx)
    grid["observed_price"] = monthly_obs["price"]
    grid["obs_count"] = monthly_obs["obs_count"]
    grid["obs_count"] = grid["obs_count"].fillna(0).astype(int)
    grid["is_observed"] = grid["observed_price"].notna()
    grid["year"] = grid.index.year

    total_months = int(len(grid))
    observed_months = int(grid["is_observed"].sum())
    missing_months = total_months - observed_months
    coverage_pct = (observed_months / total_months * 100.0) if total_months > 0 else 0.0
    last_observed_date = grid.index[grid["is_observed"]].max().strftime("%Y-%m-%d")

    obs_2025 = grid[(grid["year"] == 2025) & grid["is_observed"]]
    obs_2026 = grid[(grid["year"] == 2026) & grid["is_observed"]]
    avail_2026 = [dt.strftime("%Y-%m") for dt in obs_2026.index]
    missing_2026 = [m for m in ALL_2026_MONTHS if m not in avail_2026]

    base_diag = {
        "official_period": OFFICIAL_PERIOD_LABEL,
        "first_observed_date": grid.index[grid["is_observed"]].min().strftime("%Y-%m-%d"),
        "last_observed_date": last_observed_date,
        "total_months_span": total_months,
        "observed_months": observed_months,
        "observed_months_2025": int(len(obs_2025)),
        "observed_months_2026": int(len(obs_2026)),
        "available_2026_months": avail_2026,
        "missing_2026_months": missing_2026,
        "missing_months_in_span": missing_months,
        "coverage_pct": clean_float(coverage_pct, 1),
        "mean_2025": clean_float(obs_2025["observed_price"].mean()) if len(obs_2025) else None,
        "mean_2026": clean_float(obs_2026["observed_price"].mean()) if len(obs_2026) else None,
    }

    # Guardrail calibrated for 2025-2026 historical horizon (max 15-17 months): min 10 observed months & >= 55% span coverage
    if observed_months < 10 or total_months < 10:
        return {
            "eligible": False,
            "reason": (
                f"Série 2025–2026 insuffisante ({observed_months} mois réellement observés sur {total_months}). "
                f"Un minimum de 10 mois observés depuis janvier 2025 est requis pour calibrer et valider chronologiquement un modèle."
            ),
            "meta": meta,
            "scope": scope_desc,
            "series_diagnostics": base_diag,
        }
    if coverage_pct < 55.0:
        return {
            "eligible": False,
            "reason": (
                f"Couverture 2025–2026 trop discontinue ({clean_float(coverage_pct, 1)} % de mois observés, "
                f"{missing_months} mois manquants sur {total_months}). Une interpolation excessive fausserait la prévision."
            ),
            "meta": meta,
            "scope": scope_desc,
            "series_diagnostics": base_diag,
        }

    # Regular-grid working copy solely for time-series training (never presented as observed data)
    model_series = grid["observed_price"].interpolate(method="time").ffill().bfill()
    if float(model_series.std(ddof=1)) < 1e-6:
        return {
            "eligible": False,
            "reason": "La série 2025–2026 est strictement constante (variance nulle), ne permettant pas de modélisation dynamique.",
            "meta": meta,
            "scope": scope_desc,
            "series_diagnostics": base_diag,
        }

    seasonality = detect_seasonality(model_series)

    # Chronological holdout split (last 3 months if total_months >= 12, else 2)
    test_size = 3 if total_months >= 12 else 2
    train_s = model_series.iloc[:-test_size]
    test_s = model_series.iloc[-test_size:]
    test_obs_mask = grid["is_observed"].iloc[-test_size:].values
    eval_mask = test_obs_mask if test_obs_mask.sum() >= 2 else np.ones(len(test_s), dtype=bool)
    y_eval = test_s.values[eval_mask]

    train_grid = grid.iloc[:-test_size]
    prophet_train_df = pd.DataFrame(
        {"ds": train_grid.index[train_grid["is_observed"]], "y": train_grid.loc[train_grid["is_observed"], "observed_price"].values}
    )
    prophet_full_df = pd.DataFrame(
        {"ds": grid.index[grid["is_observed"]], "y": grid.loc[grid["is_observed"], "observed_price"].values}
    )

    model_runners = [
        ("Holt-Winters", lambda tr, st: _fit_predict_holtwinters(tr, st)),
        ("ARIMA", lambda tr, st: _fit_predict_arima(tr, st)),
        ("SARIMA", lambda tr, st: _fit_predict_sarima(tr, st)),
        ("Prophet", lambda tr, st: _fit_predict_prophet(prophet_train_df if len(tr) == len(train_s) else prophet_full_df, pd.date_range(tr.index[-1] + pd.offsets.MonthBegin(1), periods=st, freq="MS"))),
    ]

    model_comparison: list[dict[str, Any]] = []
    validation_preds: dict[str, list[float | None]] = {}

    for m_name, runner in model_runners:
        t0 = time.perf_counter()
        try:
            pred_test, _, _, spec_label = runner(train_s, test_size)
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
            pred_eval = pred_test[eval_mask]
            mae = float(mean_absolute_error(y_eval, pred_eval))
            rmse = float(root_mean_squared_error(y_eval, pred_eval))
            mape = compute_mape(y_eval, pred_eval)
            model_comparison.append(
                {
                    "model": m_name,
                    "specification": spec_label,
                    "status": "evaluated",
                    "mae": clean_float(mae, 2),
                    "rmse": clean_float(rmse, 2),
                    "mape_pct": clean_float(mape, 2),
                    "eval_points": int(eval_mask.sum()),
                    "train_points": int(len(train_s)),
                    "runtime_ms": elapsed_ms,
                    "selected": False,
                    "error": None,
                }
            )
            validation_preds[m_name] = [clean_float(v, 2) for v in pred_test]
        except Exception as exc:
            elapsed_ms = round((time.perf_counter() - t0) * 1000, 1)
            model_comparison.append(
                {
                    "model": m_name,
                    "specification": "Non applicable (< 24 mois)" if m_name == "SARIMA" else "Non applicable",
                    "status": "unavailable",
                    "mae": None,
                    "rmse": None,
                    "mape_pct": None,
                    "eval_points": 0,
                    "train_points": int(len(train_s)),
                    "runtime_ms": elapsed_ms,
                    "selected": False,
                    "error": str(exc),
                }
            )
            validation_preds[m_name] = [None] * test_size

    valid_models = [m for m in model_comparison if m["status"] == "evaluated" and m["rmse"] is not None]
    if not valid_models:
        return {
            "eligible": False,
            "reason": "Aucun modèle n'a convergé de manière satisfaisante sur cette série 2025–2026.",
            "meta": meta,
            "scope": scope_desc,
            "series_diagnostics": base_diag,
            "model_comparison": model_comparison,
        }

    valid_models.sort(key=lambda m: (m["rmse"], m["mae"]))
    best_name = valid_models[0]["model"]

    future_dates = pd.date_range(grid.index[-1] + pd.offsets.MonthBegin(1), periods=horizon, freq="MS")
    fc_pred = fc_low = fc_high = None
    fc_spec = ""
    chosen_name = best_name

    for candidate in valid_models:
        cname = candidate["model"]
        try:
            if cname == "Holt-Winters":
                fc_pred, fc_low, fc_high, fc_spec = _fit_predict_holtwinters(model_series, horizon)
            elif cname == "ARIMA":
                fc_pred, fc_low, fc_high, fc_spec = _fit_predict_arima(model_series, horizon)
            elif cname == "SARIMA":
                fc_pred, fc_low, fc_high, fc_spec = _fit_predict_sarima(model_series, horizon)
            else:
                fc_pred, fc_low, fc_high, fc_spec = _fit_predict_prophet(prophet_full_df, future_dates)
            chosen_name = cname
            break
        except Exception:
            continue

    for row in model_comparison:
        if row["model"] == chosen_name:
            row["selected"] = True

    last_obs_price = float(grid.loc[grid["is_observed"], "observed_price"].iloc[-1])

    historical_series = []
    for dt, row in grid.iterrows():
        yr = int(dt.year)
        is_obs = bool(row["is_observed"])
        obs_val = clean_float(row["observed_price"], 2) if is_obs else None
        historical_series.append(
            {
                "date": dt.strftime("%Y-%m-%d"),
                "ym": dt.strftime("%Y-%m"),
                "year": yr,
                "observed_price": obs_val,
                "observed_2025": obs_val if (is_obs and yr == 2025) else None,
                "observed_2026": obs_val if (is_obs and yr == 2026) else None,
                "period_group": ("observed_2025" if yr == 2025 else "observed_2026") if is_obs else "missing",
                "is_observed": is_obs,
                "obs_count": int(row["obs_count"]),
            }
        )

    validation_series = []
    for i, dt in enumerate(test_s.index):
        entry: dict[str, Any] = {
            "date": dt.strftime("%Y-%m-%d"),
            "ym": dt.strftime("%Y-%m"),
            "actual": clean_float(grid.loc[dt, "observed_price"], 2) if grid.loc[dt, "is_observed"] else None,
            "is_observed": bool(grid.loc[dt, "is_observed"]),
        }
        for m_name, preds in validation_preds.items():
            entry[m_name] = preds[i]
        validation_series.append(entry)

    forecast_series = []
    for i, dt in enumerate(future_dates):
        yhat = float(fc_pred[i])
        low = float(min(fc_low[i], yhat))
        high = float(max(fc_high[i], yhat))
        delta = yhat - last_obs_price
        delta_pct = (delta / last_obs_price * 100.0) if last_obs_price > 0 else 0.0
        forecast_series.append(
            {
                "step": i + 1,
                "date": dt.strftime("%Y-%m-%d"),
                "ym": dt.strftime("%Y-%m"),
                "forecast": clean_float(yhat, 2),
                "lower_95": clean_float(low, 2),
                "upper_95": clean_float(high, 2),
                "delta_vs_last": clean_float(delta, 2),
                "delta_pct_vs_last": clean_float(delta_pct, 2),
                "is_forecast": True,
                "period_group": "forecast",
            }
        )

    final_fc = forecast_series[-1]
    chosen_metrics = next(m for m in model_comparison if m["model"] == chosen_name)
    trend_dir = "haussière" if (final_fc["delta_pct_vs_last"] or 0) > 1.5 else ("baissière" if (final_fc["delta_pct_vs_last"] or 0) < -1.5 else "relativement stable")

    interpretations = [
        f"Modèle retenu uniquement sur la période 2025–2026 après validation chronologique sur {test_size} mois : {chosen_name} ({fc_spec}), "
        f"affichant la plus faible REQM (racine de l'erreur quadratique moyenne : {chosen_metrics['rmse']} {meta['unit']}, erreur absolue moyenne EAM = {chosen_metrics['mae']} {meta['unit']}, erreur absolue moyenne en pourcentage EAMP = {chosen_metrics['mape_pct']} %).",
        f"Distinction 2025 / 2026 : {len(obs_2025)} mois réellement observés en 2025 (moyenne {base_diag['mean_2025']} {meta['unit']}) "
        f"et {len(obs_2026)} mois réellement observés en 2026 ({', '.join(fmt_ym(m) for m in avail_2026)}, moyenne {base_diag['mean_2026']} {meta['unit']}). "
        f"Les mois {', '.join(fmt_ym(m) for m in missing_2026)} ne figurent pas dans la source et ne sont jamais présentés comme des relevés réels.",
        f"Dernier prix réellement observé : {clean_float(last_obs_price)} {meta['unit']} au {fmt_date(last_observed_date)}. "
        f"À l'horizon de {horizon} mois ({fmt_ym(final_fc['ym'])}), l'estimation par intelligence artificielle projette une trajectoire {trend_dir} vers "
        f"{final_fc['forecast']} {meta['unit']} ({'+' if (final_fc['delta_pct_vs_last'] or 0) >= 0 else ''}{final_fc['delta_pct_vs_last']} %), "
        f"intervalle de prévision à 95 % [{final_fc['lower_95']} – {final_fc['upper_95']}].",
        seasonality["description"],
        "Avertissement méthodologique : ces valeurs futures sont des estimations statistiques calculées exclusivement à partir de l'historique 2025–2026 ; elles ne constituent ni des observations réelles ni une garantie des prix futurs.",
    ]

    return {
        "eligible": True,
        "meta": meta,
        "scope": scope_desc,
        "commodity": commodity,
        "region": region or "ALL",
        "market": market or "ALL",
        "horizon_months": horizon,
        "series_diagnostics": {
            **base_diag,
            "last_observed_price": clean_float(last_obs_price, 2),
            "missing_months_filled_for_modeling": missing_months,
            "validation_window_months": test_size,
            "train_window_months": int(len(train_s)),
        },
        "seasonality": seasonality,
        "best_model": chosen_name,
        "best_specification": fc_spec,
        "model_comparison": model_comparison,
        "historical_series": historical_series,
        "validation_series": validation_series,
        "forecast_series": forecast_series,
        "interpretations": [fr_dec(t) for t in interpretations],
    }
