from __future__ import annotations

import json
from functools import lru_cache
from typing import Any

import pandas as pd

from .i18n import CATEGORY_FR, COMMODITY_FR, STAGE_FR
from .config import (
    ALL_2026_MONTHS,
    OFFICIAL_END_DATE,
    OFFICIAL_PERIOD_LABEL,
    OFFICIAL_START_DATE,
    PROCESSED_DIR,
    REPORTS_DIR,
)


def _enforce_official_window(df: pd.DataFrame, date_col: str = "date") -> pd.DataFrame:
    if len(df) == 0 or date_col not in df.columns:
        return df
    return df[(df[date_col] >= OFFICIAL_START_DATE) & (df[date_col] <= OFFICIAL_END_DATE)].reset_index(drop=True)


class DataStore:
    """In-memory read-only store loaded from verified 2025–2026 data/processed/ tables."""

    def __init__(self) -> None:
        self.wfp = _enforce_official_window(pd.read_csv(PROCESSED_DIR / "wfp_prices_clean.csv", low_memory=False))
        # Affichage 100 % français : les fichiers bruts et traités restent intacts, seule la vue en mémoire est traduite.
        self.wfp["commodity"] = self.wfp["commodity"].replace(COMMODITY_FR)
        self.wfp["category"] = self.wfp["category"].replace(CATEGORY_FR)
        self.wfp["pricetype"] = self.wfp["pricetype"].replace(STAGE_FR)
        self.markets_geo = pd.read_csv(PROCESSED_DIR / "markets_geo.csv", low_memory=False)
        self.rt_long = _enforce_official_window(pd.read_csv(PROCESSED_DIR / "rt_prices_long.csv", low_memory=False))
        self.rt_index = _enforce_official_window(pd.read_csv(PROCESSED_DIR / "rt_national_index.csv", low_memory=False))
        self.csa = _enforce_official_window(pd.read_csv(PROCESSED_DIR / "csa_prices_long.csv", low_memory=False))
        self.commodities_ext = _enforce_official_window(
            pd.read_csv(PROCESSED_DIR / "commodity_markets_long.csv", low_memory=False)
        )
        horti_df = pd.read_csv(PROCESSED_DIR / "prod_horti_long.csv", low_memory=False)
        self.prod_horti = horti_df[horti_df["year_ref"] >= 2025].reset_index(drop=True) if len(horti_df) else horti_df
        self.prod_elevage = _enforce_official_window(
            pd.read_csv(PROCESSED_DIR / "prod_elevage_long.csv", low_memory=False)
        )
        self.senelec = _enforce_official_window(pd.read_csv(PROCESSED_DIR / "senelec_long.csv", low_memory=False))
        self.trans_aerien = _enforce_official_window(
            pd.read_csv(PROCESSED_DIR / "trans_aerien_long.csv", low_memory=False)
        )
        self.trans_marit = _enforce_official_window(
            pd.read_csv(PROCESSED_DIR / "trans_marit_long.csv", low_memory=False)
        )

        self.audit_report: dict[str, Any] = json.loads(
            (REPORTS_DIR / "audit_report.json").read_text(encoding="utf-8")
        )
        self.manifest: dict[str, Any] = json.loads(
            (PROCESSED_DIR / "pipeline_manifest.json").read_text(encoding="utf-8")
        )
        self.empty_rt_commodities: list[str] = json.loads(
            (PROCESSED_DIR / "rt_empty_commodities.json").read_text(encoding="utf-8")
        )

        # Real post-filter coverage per source
        wfp_2026 = sorted(self.wfp.loc[self.wfp["year"] == 2026, "ym"].unique().tolist()) if len(self.wfp) else []
        rt_2026 = sorted(self.rt_long.loc[self.rt_long["year"] == 2026, "ym"].unique().tolist()) if len(self.rt_long) else []

        self.coverage_summary: dict[str, Any] = {
            "official_period": OFFICIAL_PERIOD_LABEL,
            "start_date": OFFICIAL_START_DATE,
            "end_date": OFFICIAL_END_DATE,
            "wfp": {
                "rows": int(len(self.wfp)),
                "date_min": str(self.wfp["date"].min()) if len(self.wfp) else None,
                "date_max": str(self.wfp["date"].max()) if len(self.wfp) else None,
                "months_count": int(self.wfp["ym"].nunique()) if len(self.wfp) else 0,
                "available_2026_months": wfp_2026,
                "missing_2026_months": [m for m in ALL_2026_MONTHS if m not in wfp_2026],
            },
            "rt": {
                "rows_long": int(len(self.rt_long)),
                "observed_rows_excl_avg": int(
                    self.rt_long[(~self.rt_long["is_market_average"]) & (self.rt_long["has_observed_price"])].shape[0]
                )
                if len(self.rt_long)
                else 0,
                "date_min": str(self.rt_long["date"].min()) if len(self.rt_long) else None,
                "date_max": str(self.rt_long["date"].max()) if len(self.rt_long) else None,
                "months_count": int(self.rt_long["ym"].nunique()) if len(self.rt_long) else 0,
                "available_2026_months": rt_2026,
                "missing_2026_months": [m for m in ALL_2026_MONTHS if m not in rt_2026],
            },
            "bulletin": {
                "rows": 0,
                "available_in_2025_2026": False,
                "raw_coverage": "2000–2022 (mensuel 01/2016 → 08/2022)",
            },
        }


@lru_cache(maxsize=1)
def get_store() -> DataStore:
    return DataStore()
