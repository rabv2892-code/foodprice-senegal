from __future__ import annotations

from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
PROCESSED = ROOT / "data" / "processed"
REPORTS = ROOT / "data" / "reports"


def test_processed_files_exist():
    expected = [
        "wfp_prices_clean.csv",
        "markets_geo.csv",
        "rt_prices_long.csv",
        "rt_national_index.csv",
        "csa_prices_long.csv",
        "commodity_markets_long.csv",
        "prod_horti_long.csv",
        "prod_elevage_long.csv",
        "senelec_long.csv",
        "trans_aerien_long.csv",
        "trans_marit_long.csv",
        "pipeline_manifest.json",
    ]
    for f in expected:
        assert (PROCESSED / f).exists(), f"Missing {f}"
    assert (REPORTS / "audit_report.json").exists()
    assert (REPORTS / "audit_report.md").exists()
    assert (REPORTS / "transformations_doc.md").exists()


def test_wfp_2025_2026_integrity():
    df = pd.read_csv(PROCESSED / "wfp_prices_clean.csv")
    assert len(df) == 4779
    assert df["price"].isna().sum() == 0
    assert (df["price"] > 0).all()
    assert df["date"].min() >= "2025-01-01"
    assert df["date"].max() <= "2026-12-31"
    assert set(df["year"].unique()).issubset({2025, 2026})
    assert df["region_std"].nunique() == 14
    assert df["market"].nunique() == 47


def test_rt_2025_2026_separates_observed_from_ohlc():
    df = pd.read_csv(PROCESSED / "rt_prices_long.csv")
    assert len(df) == 6630
    assert df["date"].min() >= "2025-01-01"
    assert df["date"].max() <= "2026-12-31"
    assert set(df["year"].unique()).issubset({2025, 2026})
    assert df["commodity_key"].nunique() == 6
    assert df["has_observed_price"].sum() < len(df)
    assert df["close_price"].notna().all()


def test_bulletin_2025_2026_has_zero_pre2025_rows():
    for fname in [
        "csa_prices_long.csv",
        "commodity_markets_long.csv",
        "prod_horti_long.csv",
        "prod_elevage_long.csv",
        "senelec_long.csv",
        "trans_aerien_long.csv",
        "trans_marit_long.csv",
    ]:
        df = pd.read_csv(PROCESSED / fname)
        assert len(df) == 0, f"Expected 0 rows in {fname} for 2025-2026, found {len(df)}"
