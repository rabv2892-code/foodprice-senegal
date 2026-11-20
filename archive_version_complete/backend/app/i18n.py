"""Libellés français et formats d'affichage (JJ/MM/AAAA, FCFA).

Les fichiers bruts (data/raw) et les fichiers traités ne sont jamais modifiés :
la traduction est appliquée uniquement au chargement en mémoire (DataStore) et à l'affichage.
Les identifiants techniques de l'API (source = « wfp », clés JSON…) restent inchangés.
"""
from __future__ import annotations

from typing import Any

# Produits du fichier WFP (libellés d'origine en anglais -> libellés français affichés)
COMMODITY_FR: dict[str, str] = {
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

CATEGORY_FR: dict[str, str] = {
    "cereals and tubers": "Céréales et tubercules",
    "pulses and nuts": "Légumineuses et noix",
}

STAGE_FR: dict[str, str] = {
    "Retail": "Détail",
    "Wholesale": "Gros",
}

UNIT_FR: dict[str, str] = {"KG": "kg", "kg": "kg"}

DEFAULT_PRICE_UNIT = "FCFA/kg"


def fr_commodity(value: Any) -> Any:
    return COMMODITY_FR.get(value, value) if isinstance(value, str) else value


def fr_unit(currency: str, raw_unit: Any) -> str:
    """Devise XOF affichée en FCFA ; unité de poids en minuscules (kg)."""
    cur = "FCFA" if str(currency).upper() in ("XOF", "FCFA") else str(currency)
    if raw_unit is None or str(raw_unit).strip() == "" or str(raw_unit).lower() == "nan":
        return f"{cur}/kg"
    unit = UNIT_FR.get(str(raw_unit), str(raw_unit))
    return f"{cur}/{unit}"


def fmt_date(value: Any) -> str:
    """'2026-03-15' -> '15/03/2026' ; renvoie la valeur d'origine si elle n'est pas une date ISO."""
    if value is None:
        return "—"
    s = str(value)
    if len(s) >= 10 and s[4] == "-" and s[7] == "-":
        return f"{s[8:10]}/{s[5:7]}/{s[0:4]}"
    return fmt_ym(s)


def fmt_ym(value: Any) -> str:
    """'2026-03' -> '03/2026'."""
    if value is None:
        return "—"
    s = str(value)
    if len(s) == 7 and s[4] == "-":
        return f"{s[5:7]}/{s[0:4]}"
    return s


def fmt_num(value: Any, digits: int = 1) -> str:
    """Séparateurs français : espace insécable fine pour les milliers, virgule décimale."""
    if value is None:
        return "—"
    try:
        f = float(value)
    except (TypeError, ValueError):
        return str(value)
    if f != f:
        return "—"
    s = f"{f:,.{digits}f}"
    return s.replace(",", "\u00a0").replace(".", ",")


import re as _re

_ISO_DATE = _re.compile(r"\b(20\d{2})-(\d{2})-(\d{2})\b")
_ISO_MONTH = _re.compile(r"\b(20\d{2})-(0[1-9]|1[0-2])\b(?!-\d)")
_TEXT_FR = [
    ("Open / High / Low / Close", "ouverture / plus haut / plus bas / clôture"),
    ("World Bank Real-Time Food Prices", "Prix alimentaires en temps réel de la Banque mondiale"),
    ("Food Price Index Real-Time", "Indice des prix alimentaires en temps réel"),
    ("distinguant observed_price et OHLC", "distinguant les prix observés et les estimations modélisées (ouverture, haut, bas, clôture)"),
    ("Série longue Real-Time Food Prices", "Série longue des prix en temps réel"),
    ("Retail, actual", "Détail, réel"),
    ("WFP", "PAM"),
]


_THOUSANDS = _re.compile(r"(?<![\w.,])(\d{1,3}(?:,\d{3})+)(?![\w,])")
_DECIMAL_POINT = _re.compile(r"(?<![\w.])(\d+)\.(\d+)(?![\w.])")


def fr_text(text: str) -> str:
    """Convertit les dates ISO d'un texte libre au format français et traduit quelques expressions."""
    out = _ISO_DATE.sub(lambda m: f"{m.group(3)}/{m.group(2)}/{m.group(1)}", text)
    out = _ISO_MONTH.sub(lambda m: f"{m.group(2)}/{m.group(1)}", out)
    for en, fr in _TEXT_FR:
        out = out.replace(en, fr)
    out = out.replace("XOF/KG", "FCFA/kg").replace("(XOF/kg", "(FCFA/kg")
    out = _THOUSANDS.sub(lambda m: m.group(1).replace(",", "\u00a0"), out)
    out = _DECIMAL_POINT.sub(r"\1,\2", out)
    return out


def fr_payload(value: Any, skip_keys: tuple[str, ...] = ("file", "columns", "sheet_raw")) -> Any:
    """Applique fr_text et la traduction des produits sur toute une réponse JSON (hors noms de fichiers/colonnes d'origine)."""
    if isinstance(value, dict):
        out: dict[str, Any] = {}
        for k, v in value.items():
            if k in skip_keys:
                out[k] = v
            elif k == "commodities" and isinstance(v, list):
                out[k] = [COMMODITY_FR.get(x, x) if isinstance(x, str) else x for x in v]
            else:
                out[k] = fr_payload(v, skip_keys)
        return out
    if isinstance(value, list):
        return [fr_payload(v, skip_keys) for v in value]
    if isinstance(value, str):
        return fr_text(value)
    return value


def fr_dec(text: str) -> str:
    """Remplace le point décimal par la virgule dans un texte libre (13.3 -> 13,3)."""
    return _DECIMAL_POINT.sub(r"\1,\2", text) if isinstance(text, str) else text


# Noms de fichiers d'exportation en français
SOURCE_SLUG = {
    "wfp": "pam",
    "rt_observed": "temps_reel_releves",
    "rt_model": "temps_reel_estimations",
    "csa": "csa_regional",
}


def export_stamp() -> str:
    """Date du jour au format JJ-MM-AAAA (utilisable dans un nom de fichier)."""
    import datetime as _dt

    return _dt.date.today().strftime("%d-%m-%Y")
