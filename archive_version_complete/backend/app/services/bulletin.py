from __future__ import annotations

from typing import Any

import pandas as pd

from ..config import OFFICIAL_END_DATE, OFFICIAL_PERIOD_LABEL, OFFICIAL_START_DATE
from ..data_store import DataStore


def _bulletin_unavailable(sheet_name: str, raw_coverage: str, note_unites: str = "") -> dict[str, Any]:
    return {
        "sheet": sheet_name,
        "official_period": OFFICIAL_PERIOD_LABEL,
        "period_start": OFFICIAL_START_DATE,
        "period_end": OFFICIAL_END_DATE,
        "available_in_2025_2026": False,
        "rows_2025_2026": 0,
        "raw_coverage": raw_coverage,
        "notice": (
            f"Aucune donnée disponible pour la période officielle {OFFICIAL_PERIOD_LABEL} dans la feuille {sheet_name} "
            f"(couverture brute réelle : {raw_coverage}). Conformément aux règles d'intégrité, aucune valeur antérieure à 2025 "
            f"n'est affichée ni redatée artificiellement."
        ),
        "note_unites": note_unites,
    }


def get_commodities_market_data(store: DataStore, commodity: str | None = None) -> dict[str, Any]:
    df = store.commodities_ext
    if len(df) == 0:
        res = _bulletin_unavailable(
            "COURS_MAT_PREMIERE",
            "01/2016 → 08/2022",
            "Chaque matière première conserve son unité d'origine ; 0 observation en 2025–2026.",
        )
        res.update({
            "catalog": [],
            "selected_commodity": None,
            "selected_unit": "",
            "selected_series": [],
            "selected_annual": [],
            "base100_drivers": [],
            "base100_keys": [],
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_horticulture_data(store: DataStore) -> dict[str, Any]:
    df = store.prod_horti
    if len(df) == 0:
        res = _bulletin_unavailable("PROD_HORTI", "2000 → campagne 2021/2022")
        res.update({
            "unit": "Tonnes",
            "periods": [],
            "totals_series": [],
            "crop_stats": [],
            "top_crops": [],
            "top_crops_series": [],
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_livestock_data(store: DataStore) -> dict[str, Any]:
    df = store.prod_elevage
    if len(df) == 0:
        res = _bulletin_unavailable(
            "PROD_ELEVAGE",
            "01/2016 → 08/2022",
            "Effectifs (Têtes) et tonnages (Tonnes) séparés ; 0 observation en 2025–2026.",
        )
        res.update({
            "species_summary": [],
            "species_list": [],
            "monthly_weights": [],
            "monthly_heads": [],
            "coherence_discrepancies": {},
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_senelec_data(store: DataStore) -> dict[str, Any]:
    df = store.senelec
    if len(df) == 0:
        res = _bulletin_unavailable("DONNEES_SENELEC", "01/2016 → 08/2022")
        res.update({
            "summary": [],
            "ventes_mwh": [],
            "chiffre_affaires_mfcfa": [],
            "prix_moyen_fcfa_kwh": [],
            "production_mwh": [],
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_air_transport_data(store: DataStore) -> dict[str, Any]:
    df = store.trans_aerien
    if len(df) == 0:
        res = _bulletin_unavailable("DONNES_TRANS_AERIEN", "01/2016 → 08/2022")
        res.update({
            "airports": [],
            "airport_stats": [],
            "passengers_series": [],
            "movements_series": [],
            "freight_tonnes_series": [],
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_maritime_transport_data(store: DataStore) -> dict[str, Any]:
    df = store.trans_marit
    if len(df) == 0:
        res = _bulletin_unavailable("DONNES_TRANS_MARIT", "01/2016 → 08/2022 (annuel 2016–2020)")
        res.update({
            "unit": "Milliers de tonnes",
            "monthly_totals": [],
            "cargo_summary": [],
            "annual_totals": [],
        })
        return res
    return {"available_in_2025_2026": True, "rows_2025_2026": int(len(df))}


def get_bulletin_cross_analysis(store: DataStore) -> dict[str, Any]:
    return {
        "sheet": "Analyse croisée BASE_BULLETIN",
        "period": OFFICIAL_PERIOD_LABEL,
        "available_in_2025_2026": False,
        "rows_2025_2026": 0,
        "raw_coverage": "01/2016 → 08/2022",
        "notice": (
            f"Aucune étude de corrélation croisée inter-feuilles n'est calculable sur {OFFICIAL_PERIOD_LABEL} : "
            f"les 7 feuilles de BASE_BULLETIN.xlsx s'arrêtent en août 2022 (0 observation en 2025–2026)."
        ),
        "correlations": [],
    }
