from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
REPORTS_DIR = DATA_DIR / "reports"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"

APP_NAME = "FOODPRICE SENEGAL"
APP_SUBTITLE = "INTELLIGENCE DES PRIX ALIMENTAIRES ET PRÉVISIONS"
APP_VERSION = "2.0.0"

OFFICIAL_START_DATE = "2025-01-01"
OFFICIAL_END_DATE = "2026-12-31"
OFFICIAL_PERIOD_LABEL = "Janvier 2025 – Décembre 2026"
ALL_2026_MONTHS = [f"2026-{m:02d}" for m in range(1, 13)]
