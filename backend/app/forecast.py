"""Prévision simple des prix à six mois : Holt-Winters ou ARIMA, selon la qualité de la série.

Principe (volontairement simple et défendable) :
1. on construit la série mensuelle du produit (moyenne des 5 marchés, ou un marché) ;
2. les rares mois sans relevé sont comblés par interpolation linéaire UNIQUEMENT pour ajuster le modèle
   (ils ne sont jamais affichés comme des observations) ;
3. validation : on entraîne chaque modèle sur la série privée de ses 3 derniers mois, puis on compare
   ses prévisions aux 3 vrais prix (REQM, EAM, EAMP) ;
4. le modèle ayant la plus petite REQM est ré-entraîné sur toute la série pour prévoir les 6 mois suivants.

Avec moins de 24 mois d'historique, aucune saisonnalité annuelle ne peut être estimée : le Holt-Winters
utilisé est donc la version sans saisonnalité (tendance amortie). Un modèle « naïf » (dernier prix répété)
sert de point de comparaison.
"""
from __future__ import annotations

import warnings
from typing import Any, Callable

import numpy as np
import pandas as pd
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.holtwinters import ExponentialSmoothing

from .analysis import UNITE, r, verifier_marche, verifier_produit
from .config import HORIZON_PREVISION, MOIS_VALIDATION
from .data import Donnees, serie_mensuelle
from .i18n import fmt_mois, fmt_mois_court, fmt_nombre

MIN_MOIS_OBSERVES = 10
NOM_HW = "Holt-Winters (tendance amortie, sans saisonnalité)"
NOM_ARIMA = "ARIMA"
NOM_NAIF = "Modèle naïf (dernier prix)"


# ---------------------------------------------------------------- modèles
def _intervalle_residus(pred: np.ndarray, residus: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    sigma = float(np.nanstd(residus, ddof=1)) if len(residus) > 2 else 0.0
    marge = 1.96 * sigma * np.sqrt(np.arange(1, len(pred) + 1))
    return np.maximum(0.0, pred - marge), pred + marge


def _ajuster_holt_winters(y: pd.Series, h: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        if len(y) >= 24:  # saisonnalité annuelle estimable (jamais le cas avec 15 mois)
            modele = ExponentialSmoothing(
                y, trend="add", damped_trend=True, seasonal="add", seasonal_periods=12,
                initialization_method="estimated",
            ).fit()
            nom = "Holt-Winters (tendance amortie, saisonnalité annuelle)"
        else:
            modele = ExponentialSmoothing(
                y, trend="add", damped_trend=True, initialization_method="estimated"
            ).fit()
            nom = NOM_HW
        pred = np.asarray(modele.forecast(h), dtype=float)
        bas, haut = _intervalle_residus(pred, np.asarray(modele.resid, dtype=float))
    return pred, bas, haut, nom


def _ajuster_arima(y: pd.Series, h: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    """ARIMA d'ordre petit choisi par le critère d'Akaike parmi quelques candidats."""
    meilleur, meilleur_aic, ordre_ok = None, np.inf, (1, 1, 0)
    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        for ordre in [(1, 1, 0), (0, 1, 1), (1, 1, 1), (1, 0, 0)]:
            try:
                res = ARIMA(y, order=ordre, trend="c" if ordre[1] == 0 else "n").fit()
                if np.isfinite(res.aic) and res.aic < meilleur_aic:
                    meilleur, meilleur_aic, ordre_ok = res, res.aic, ordre
            except Exception:
                continue
        if meilleur is None:
            raise RuntimeError("ARIMA n'a pas pu être ajusté sur cette série.")
        fc = meilleur.get_forecast(steps=h)
        pred = np.asarray(fc.predicted_mean, dtype=float)
        ic = np.asarray(fc.conf_int(alpha=0.05), dtype=float)
    return pred, np.maximum(0.0, ic[:, 0]), ic[:, 1], f"{NOM_ARIMA}{ordre_ok}"


def _ajuster_naif(y: pd.Series, h: int) -> tuple[np.ndarray, np.ndarray, np.ndarray, str]:
    pred = np.repeat(float(y.iloc[-1]), h)
    bas, haut = _intervalle_residus(pred, y.diff().dropna().values)
    return pred, bas, haut, NOM_NAIF


MODELES: dict[str, Callable] = {"holt_winters": _ajuster_holt_winters, "arima": _ajuster_arima, "naif": _ajuster_naif}


def _metriques(reel: np.ndarray, prevu: np.ndarray) -> dict[str, float | None]:
    erreurs = reel - prevu
    return {
        "reqm": r(np.sqrt(np.mean(erreurs**2)), 1),
        "eam": r(np.mean(np.abs(erreurs)), 1),
        "eamp": r(np.mean(np.abs(erreurs / reel)) * 100, 1),
    }


# ---------------------------------------------------------------- série d'étude
def _preparer_serie(d: Donnees, produit: str, marche: str | None) -> tuple[pd.Series, pd.Series, list[str]]:
    """Retourne (série observée avec trous, série comblée pour le modèle, mois comblés)."""
    brute = serie_mensuelle(d, produit, marche)
    obs = brute.dropna()
    if obs.empty:
        return brute, brute, []
    dans_l_intervalle = brute.loc[obs.index[0]: obs.index[-1]]
    comblee = dans_l_intervalle.interpolate(method="linear")
    comblés = [m for m in dans_l_intervalle.index if np.isnan(dans_l_intervalle[m])]
    comblee.index = pd.date_range(comblee.index[0] + "-01", periods=len(comblee), freq="MS")
    return brute, comblee.astype(float), comblés


def _mois_futurs(dernier: pd.Timestamp, h: int) -> list[str]:
    return [str(p) for p in pd.period_range(dernier.to_period("M") + 1, periods=h, freq="M")]


_CACHE: dict[tuple, dict[str, Any]] = {}


def previsions(d: Donnees, produit: str | None, marche: str | None, horizon: int = HORIZON_PREVISION) -> dict[str, Any]:
    """Prévision avec mémorisation : les données sont fixes, inutile de recalculer pour chaque visiteur
    (au plus 11 produits × 6 portées × l'horizon : quelques dizaines d'entrées)."""
    produit = verifier_produit(d, produit)
    marche = verifier_marche(d, marche)
    cle = (produit, marche, horizon)
    if cle not in _CACHE:
        _CACHE[cle] = _calculer_previsions(d, produit, marche, horizon)
    return _CACHE[cle]


def _calculer_previsions(d: Donnees, produit: str, marche: str | None, horizon: int) -> dict[str, Any]:
    portee = marche or f"Moyenne des {len(d.marches)} marchés"
    brute, y, comblés = _preparer_serie(d, produit, marche)
    n_obs = int(brute.notna().sum())
    base = {"produit": produit, "marche": marche, "portee": portee, "unite": UNITE, "horizon": horizon}

    historique = [
        {"mois": m, "libelle": fmt_mois_court(m), "prix": r(brute[m], 0)} for m in d.mois
    ]
    if n_obs < MIN_MOIS_OBSERVES or len(y) < MIN_MOIS_OBSERVES:
        return {
            **base,
            "disponible": False,
            "historique": historique,
            "message": (
                f"Série trop courte pour une prévision fiable : {n_obs} mois observés "
                f"(minimum requis : {MIN_MOIS_OBSERVES}). Aucune prévision n'est affichée."
            ),
        }

    # --- validation sur les derniers mois
    k = MOIS_VALIDATION
    entrainement, test = y.iloc[:-k], y.iloc[-k:]
    validation = []
    for cle, fonction in MODELES.items():
        try:
            prevu, _, _, nom = fonction(entrainement, k)
            validation.append({"cle": cle, "modele": nom, **_metriques(test.values, prevu)})
        except Exception:
            continue
    candidats = [v for v in validation if v["cle"] in ("holt_winters", "arima") and v["reqm"] is not None]
    if not candidats:
        return {**base, "disponible": False, "historique": historique, "message": "Aucun modèle n'a pu être ajusté."}
    choisi = min(candidats, key=lambda v: v["reqm"])
    naif = next((v for v in validation if v["cle"] == "naif"), None)

    # --- prévision finale avec le modèle retenu, ré-entraîné sur toute la série
    pred, bas, haut, nom_final = MODELES[choisi["cle"]](y, horizon)
    futurs = _mois_futurs(y.index[-1], horizon)
    prevision = [
        {
            "mois": m,
            "libelle": fmt_mois_court(m),
            "prevision": r(p, 0),
            "bas": r(b, 0),
            "haut": r(h_, 0),
        }
        for m, p, b, h_ in zip(futurs, pred, bas, haut)
    ]
    for v in validation:
        v["retenu"] = v["cle"] == choisi["cle"]
        if v["cle"] == choisi["cle"]:
            v["modele"] = nom_final

    dernier_obs = brute.dropna()
    dernier_prix = float(dernier_obs.iloc[-1])
    variation_finale = (pred[-1] / dernier_prix - 1) * 100
    return {
        **base,
        "disponible": True,
        "modele": nom_final,
        "fiabilite": _fiabilite(choisi["eamp"]),
        "historique": historique,
        "prevision": prevision,
        "dernier_mois_observe": fmt_mois(dernier_obs.index[-1]),
        "dernier_prix": r(dernier_prix, 0),
        "validation": validation,
        "mois_validation": k,
        "mois_observes": n_obs,
        "mois_interpoles": [fmt_mois(m) for m in comblés],
        "variation_prevue_pct": r(variation_finale, 1),
        "interpretation": _interpreter(
            produit, portee, nom_final, choisi, naif, n_obs, comblés, dernier_prix, pred, bas, haut, futurs, variation_finale,
        ),
    }


def _fiabilite(eamp: float | None) -> str:
    if eamp is None:
        return "indéterminée"
    if eamp < 10:
        return "bonne"
    if eamp < 20:
        return "acceptable"
    return "faible"


def _interpreter(produit, portee, nom, choisi, naif, n_obs, comblés, dernier_prix, pred, bas, haut, futurs, variation) -> str:
    if variation > 2:
        evolution = f"une hausse de {fmt_nombre(abs(variation), 1)} %"
    elif variation < -2:
        evolution = f"une baisse de {fmt_nombre(abs(variation), 1)} %"
    else:
        evolution = f"une quasi-stabilité (variation de {fmt_nombre(variation, 1)} %)"
    texte = [
        f"Pour « {produit} » ({portee}), le modèle retenu est {nom}, qui obtient la plus petite erreur "
        f"(REQM de {fmt_nombre(choisi['reqm'], 1)} FCFA/kg, EAMP de {fmt_nombre(choisi['eamp'], 1)} %) lors de la "
        f"validation sur les {MOIS_VALIDATION} derniers mois observés.",
        f"Le prix passerait de {fmt_nombre(dernier_prix)} FCFA/kg à environ {fmt_nombre(pred[-1])} FCFA/kg en "
        f"{fmt_mois(futurs[-1])}, soit {evolution}. "
        f"L'intervalle de confiance à 95 % à cette date va de {fmt_nombre(bas[-1])} à {fmt_nombre(haut[-1])} FCFA/kg : "
        "plus l'horizon s'éloigne, plus l'incertitude augmente.",
    ]
    if naif and naif["reqm"] is not None and naif["reqm"] < choisi["reqm"]:
        texte.append(
            "Attention : répéter simplement le dernier prix aurait donné une erreur plus faible lors de la validation ; "
            "la prévision doit donc être considérée comme une simple indication de tendance."
        )
    texte.append(
        f"Limites : la série ne compte que {n_obs} mois observés (moins de 24 mois : pas de saisonnalité annuelle estimable)"
        + (f" ; {len(comblés)} mois sans relevé a été comblé par interpolation uniquement pour l'ajustement du modèle." if len(comblés) == 1
           else f" ; {len(comblés)} mois sans relevé ont été comblés par interpolation uniquement pour l'ajustement du modèle." if comblés
           else ".")
    )
    return " ".join(texte)
