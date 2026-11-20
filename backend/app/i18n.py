"""Libellés français et formats d'affichage (JJ/MM/AAAA, FCFA, séparateurs français).

Les fichiers bruts (data/raw) et traités (data/processed) ne sont jamais modifiés :
la traduction est appliquée uniquement au chargement en mémoire.
"""
from __future__ import annotations

from typing import Any

# Produits du fichier PAM (libellés d'origine en anglais -> libellés français affichés)
PRODUITS_FR: dict[str, str] = {
    "Beans (niebe)": "Niébé",
    "Maize (imported)": "Maïs (importé)",
    "Maize (local)": "Maïs (local)",
    "Millet": "Mil",
    "Rice (imported)": "Riz (importé)",
    "Rice (local)": "Riz (local)",
    "Rice (ordinary, first quality)": "Riz (ordinaire, première qualité)",
    "Sorghum (imported)": "Sorgho (importé)",
    "Sorghum": "Sorgho",
    "Groundnuts (shelled)": "Arachides (décortiquées)",
    "Groundnuts (unshelled)": "Arachides (en coque)",
}

# Nom d'affichage des marchés (seule l'orthographe française est corrigée : « Thies » -> « Thiès »).
MARCHES_FR: dict[str, str] = {"Thies": "Thiès"}

MOIS_FR = [
    "janvier", "février", "mars", "avril", "mai", "juin",
    "juillet", "août", "septembre", "octobre", "novembre", "décembre",
]
MOIS_COURTS_FR = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]


def fmt_mois(ym: str) -> str:
    """'2026-03' -> 'mars 2026'."""
    return f"{MOIS_FR[int(ym[5:7]) - 1]} {ym[:4]}"


def fmt_mois_court(ym: str) -> str:
    """'2025-01' -> 'janv. 2025'."""
    return f"{MOIS_COURTS_FR[int(ym[5:7]) - 1]} {ym[:4]}"


def fmt_date(iso: Any) -> str:
    """'2026-03-15' -> '15/03/2026'."""
    s = str(iso)
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return f"{s[8:10]}/{s[5:7]}/{s[0:4]}"
    return s


def fmt_nombre(valeur: Any, decimales: int = 0) -> str:
    """Séparateurs français : espace insécable pour les milliers, virgule décimale."""
    if valeur is None:
        return "—"
    try:
        f = float(valeur)
    except (TypeError, ValueError):
        return str(valeur)
    if f != f:
        return "—"
    return f"{f:,.{decimales}f}".replace(",", "\u00a0").replace(".", ",")


def fmt_fcfa(valeur: Any, decimales: int = 0) -> str:
    """Prix en FCFA/kg avec séparateurs français."""
    if valeur is None:
        return "—"
    return f"{fmt_nombre(valeur, decimales)} FCFA/kg"
