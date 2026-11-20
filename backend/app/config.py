"""Paramètres généraux du projet FOODPRICE SENEGAL (version projet universitaire)."""
from __future__ import annotations

from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[2]
DATA_DIR = ROOT_DIR / "data"
RAW_DIR = DATA_DIR / "raw"
PROCESSED_DIR = DATA_DIR / "processed"
FRONTEND_DIST_DIR = ROOT_DIR / "frontend" / "dist"

APP_NAME = "FOODPRICE SENEGAL"
APP_SUBTITLE = "Suivi et prévision des prix alimentaires au Sénégal"
APP_VERSION = "3.0.0"

# Période d'étude : janvier 2025 – décembre 2026 (aucune donnée antérieure n'est utilisée).
PERIODE_DEBUT = "2025-01-01"
PERIODE_FIN = "2026-12-31"
PERIODE_LIBELLE = "janvier 2025 – décembre 2026"

# Étude limitée aux marchés ayant la meilleure couverture de relevés.
NOMBRE_MARCHES = 5

# Prévision à six mois ; validation sur les trois derniers mois observés.
HORIZON_PREVISION = 6
MOIS_VALIDATION = 3
