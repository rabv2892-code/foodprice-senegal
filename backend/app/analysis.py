"""Analyses descriptives : tableau de bord, prix, comparaison des marchés, statistiques.

Toutes les fonctions travaillent sur les cinq marchés retenus (voir `data.py`)
et sur la période janvier 2025 – décembre 2026. Les prix sont en FCFA/kg.
"""
from __future__ import annotations

from typing import Any

import numpy as np
import pandas as pd
from scipy import stats

from .config import NOMBRE_MARCHES, PERIODE_LIBELLE
from .data import Donnees, produit_par_defaut, serie_mensuelle
from .i18n import fmt_mois, fmt_mois_court, fmt_nombre

UNITE = "FCFA/kg"


# ---------------------------------------------------------------- utilitaires
def r(valeur: Any, n: int = 1) -> float | None:
    """Arrondi sûr pour le JSON (NaN -> None)."""
    if valeur is None:
        return None
    try:
        f = float(valeur)
    except (TypeError, ValueError):
        return None
    return None if np.isnan(f) or np.isinf(f) else round(f, n)


def verifier_produit(d: Donnees, produit: str | None) -> str:
    if produit and produit in d.produits:
        return produit
    return produit_par_defaut(d)


def verifier_marche(d: Donnees, marche: str | None) -> str | None:
    return marche if marche in d.marches else None


def _points(s: pd.Series, n: int = 0) -> list[dict[str, Any]]:
    return [{"mois": m, "libelle": fmt_mois_court(m), "valeur": r(v, n)} for m, v in s.items()]


def _variation(s: pd.Series) -> dict[str, Any]:
    """Variation entre les deux dernières observations disponibles (jamais de mois inventé)."""
    obs = s.dropna()
    if len(obs) < 2:
        return {"pct": None, "absolue": None, "mois_precedent": None}
    dernier, precedent = obs.iloc[-1], obs.iloc[-2]
    return {
        "pct": r((dernier / precedent - 1) * 100, 1),
        "absolue": r(dernier - precedent, 0),
        "mois_precedent": obs.index[-2],
    }


def _glissement_annuel(s: pd.Series) -> float | None:
    obs = s.dropna()
    if obs.empty:
        return None
    dernier_mois = obs.index[-1]
    mois_n1 = f"{int(dernier_mois[:4]) - 1}{dernier_mois[4:]}"
    if mois_n1 in obs.index and obs[mois_n1] > 0:
        return r((obs.iloc[-1] / obs[mois_n1] - 1) * 100, 1)
    return None


def _prix_dernier_mois(d: Donnees, produit: str) -> tuple[str | None, float | None, int]:
    df = d.prix[d.prix["produit"] == produit]
    if df.empty:
        return None, None, 0
    mois = df["mois"].max()
    sous = df[df["mois"] == mois]
    return mois, float(sous["prix"].mean()), int(sous["marche"].nunique())


# ---------------------------------------------------------------- marchés retenus
def marches_retenus(d: Donnees) -> dict[str, Any]:
    c = d.classement
    retenus = c[c["retenu"]]
    return {
        "periode": PERIODE_LIBELLE,
        "critere": (
            "Les marchés disponibles entre janvier 2025 et décembre 2026 ont été classés selon leur nombre de "
            "relevés de prix exploitables (puis, à égalité, selon le nombre de mois et de produits couverts). "
            f"Les {NOMBRE_MARCHES} premiers sont conservés dans toutes les analyses."
        ),
        "nombre_marches_disponibles": int(len(c)),
        "marches": [
            {
                "rang": int(x.rang),
                "marche": x.marche,
                "region": x.region,
                "releves": int(x.releves),
                "mois": int(x.mois),
                "produits": int(x.produits),
                "premier_releve": str(x.premier),
                "dernier_releve": str(x.dernier),
            }
            for x in retenus.itertuples()
        ],
        "releves_total_retenus": int(retenus["releves"].sum()),
        "releves_total_disponibles": int(c["releves"].sum()),
        "premier_mois": d.mois_observes[0],
        "dernier_mois": d.mois_observes[-1],
        "mois_couverts": len(d.mois_observes),
    }


def liste_options(d: Donnees) -> dict[str, Any]:
    return {
        "produits": d.produits,
        "produit_par_defaut": produit_par_defaut(d),
        "marches": d.marches,
        "premier_mois": d.mois_observes[0],
        "dernier_mois": d.mois_observes[-1],
        "unite": UNITE,
    }


# ---------------------------------------------------------------- tableau de bord
def _lignes_par_marche(d: Donnees, produit: str) -> list[dict[str, Any]]:
    """Une ligne par mois, une colonne par marché (valeur nulle si pas de relevé)."""
    series = {m: serie_mensuelle(d, produit, m) for m in d.marches}
    lignes = []
    for mois in d.mois:
        ligne: dict[str, Any] = {"mois": mois, "libelle": fmt_mois_court(mois)}
        for m in d.marches:
            ligne[m] = r(series[m].get(mois), 0)
        lignes.append(ligne)
    return lignes


def _comparaison_produits(d: Donnees) -> list[dict[str, Any]]:
    lignes = []
    for produit in d.produits:
        mois, dernier, nb = _prix_dernier_mois(d, produit)
        moyenne = d.prix.loc[d.prix["produit"] == produit, "prix"].mean()
        lignes.append(
            {
                "produit": produit,
                "dernier_prix": r(dernier, 0),
                "dernier_mois": fmt_mois(mois) if mois else None,
                "marches_dernier_mois": nb,
                "moyenne_periode": r(moyenne, 0),
            }
        )
    return sorted(lignes, key=lambda x: x["dernier_prix"] or 0, reverse=True)


def tableau_de_bord(d: Donnees, produit: str | None) -> dict[str, Any]:
    produit = verifier_produit(d, produit)
    nat = serie_mensuelle(d, produit)
    df = d.prix[d.prix["produit"] == produit]
    par_mois = df.groupby("mois")["prix"].agg(["min", "max"]).reindex(d.mois)

    obs = nat.dropna()
    dernier_mois = obs.index[-1] if len(obs) else None
    var = _variation(nat)

    evolution = [
        {
            "mois": m,
            "libelle": fmt_mois_court(m),
            "moyenne": r(nat[m], 0),
            "minimum": r(par_mois.loc[m, "min"], 0),
            "maximum": r(par_mois.loc[m, "max"], 0),
        }
        for m in d.mois
    ]
    mois_sans_releve = [fmt_mois(m) for m in d.mois if np.isnan(nat[m])]

    return {
        "produit": produit,
        "unite": UNITE,
        "indicateurs": {
            "marches_etudies": len(d.marches),
            "produits_disponibles": len(d.produits),
            "dernier_prix": r(obs.iloc[-1], 0) if len(obs) else None,
            "dernier_mois": fmt_mois(dernier_mois) if dernier_mois else None,
            "variation_pct": var["pct"],
            "variation_absolue": var["absolue"],
            "variation_vs": fmt_mois(var["mois_precedent"]) if var["mois_precedent"] else None,
            "glissement_annuel_pct": _glissement_annuel(nat),
        },
        "marches": d.marches,
        "evolution": evolution,
        "comparaison_marches": _lignes_par_marche(d, produit),
        "comparaison_produits": _comparaison_produits(d),
        "mois_sans_releve": mois_sans_releve,
        "note": (
            f"Prix moyen des {len(d.marches)} marchés retenus, période {PERIODE_LIBELLE} "
            f"(données disponibles de {fmt_mois(d.mois_observes[0])} à {fmt_mois(d.mois_observes[-1])}). "
            "Les mois sans relevé ne sont jamais remplacés par une valeur estimée."
        ),
    }


# ---------------------------------------------------------------- analyse des prix
def analyse_prix(d: Donnees, produit: str | None, marche: str | None) -> dict[str, Any]:
    produit = verifier_produit(d, produit)
    marche = verifier_marche(d, marche)
    s = serie_mensuelle(d, produit, marche)
    obs = s.dropna()
    portee = marche or f"Moyenne des {len(d.marches)} marchés"

    mm3 = s.rolling(3, min_periods=3).mean()
    var_m = s.dropna().pct_change() * 100
    tableau = []
    for m in d.mois:
        tableau.append(
            {
                "mois": m,
                "libelle": fmt_mois(m),
                "prix": r(s[m], 0),
                "variation_pct": r(var_m.get(m), 1),
                "moyenne_mobile_3": r(mm3[m], 0) if not np.isnan(s[m]) else None,
            }
        )

    resume: dict[str, Any] = {"releves_mois": int(len(obs)), "mois_total": len(d.mois)}
    if len(obs):
        imin, imax = obs.idxmin(), obs.idxmax()
        resume.update(
            {
                "dernier_prix": r(obs.iloc[-1], 0),
                "dernier_mois": fmt_mois(obs.index[-1]),
                "moyenne": r(obs.mean(), 0),
                "minimum": r(obs.min(), 0),
                "mois_minimum": fmt_mois(imin),
                "maximum": r(obs.max(), 0),
                "mois_maximum": fmt_mois(imax),
                "variation_totale_pct": r((obs.iloc[-1] / obs.iloc[0] - 1) * 100, 1),
                "premier_mois": fmt_mois(obs.index[0]),
                "glissement_annuel_pct": _glissement_annuel(s),
                "variation_mensuelle_pct": _variation(s)["pct"],
            }
        )

    # Résumé de tous les produits pour la même portée (marché ou moyenne des cinq marchés)
    produits = []
    for p in d.produits:
        sp = serie_mensuelle(d, p, marche).dropna()
        if sp.empty:
            continue
        produits.append(
            {
                "produit": p,
                "dernier_prix": r(sp.iloc[-1], 0),
                "dernier_mois": fmt_mois(sp.index[-1]),
                "moyenne": r(sp.mean(), 0),
                "variation_mensuelle_pct": _variation(serie_mensuelle(d, p, marche))["pct"],
                "variation_depuis_debut_pct": r((sp.iloc[-1] / sp.iloc[0] - 1) * 100, 1) if len(sp) > 1 else None,
                "mois_releves": int(len(sp)),
            }
        )

    return {
        "produit": produit,
        "marche": marche,
        "portee": portee,
        "unite": UNITE,
        "serie": [
            {"mois": m, "libelle": fmt_mois_court(m), "prix": r(s[m], 0), "moyenne_mobile_3": r(mm3[m], 0) if not np.isnan(s[m]) else None}
            for m in d.mois
        ],
        "resume": resume,
        "tableau": tableau,
        "produits": produits,
        "mois_sans_releve": [fmt_mois(m) for m in d.mois if np.isnan(s[m])],
        "interpretation": _interpreter_prix(produit, portee, resume),
    }


def _interpreter_prix(produit: str, portee: str, res: dict[str, Any]) -> str:
    if not res.get("dernier_prix"):
        return "Aucun relevé disponible pour cette sélection."
    tendance = res["variation_totale_pct"]
    sens = "hausse" if tendance and tendance > 2 else "baisse" if tendance and tendance < -2 else "stabilité"
    texte = (
        f"{produit} ({portee}) : le dernier prix observé est de {fmt_nombre(res['dernier_prix'])} FCFA/kg "
        f"({res['dernier_mois']}). Depuis {res['premier_mois']}, l'évolution globale est une {sens} "
        f"({fmt_nombre(tendance, 1)} %). Le prix le plus bas a été relevé en {res['mois_minimum']} "
        f"({fmt_nombre(res['minimum'])} FCFA/kg) et le plus élevé en {res['mois_maximum']} "
        f"({fmt_nombre(res['maximum'])} FCFA/kg)."
    )
    if res.get("glissement_annuel_pct") is not None:
        texte += f" Sur un an (même mois), la variation est de {fmt_nombre(res['glissement_annuel_pct'], 1)} %."
    return texte


# ---------------------------------------------------------------- comparaison des marchés
def comparaison_marches(d: Donnees, produit: str | None) -> dict[str, Any]:
    produit = verifier_produit(d, produit)
    series = {m: serie_mensuelle(d, produit, m) for m in d.marches}
    moyennes = {m: series[m].mean() for m in d.marches if series[m].notna().any()}
    moyenne_globale = float(np.mean(list(moyennes.values()))) if moyennes else float("nan")

    lignes = []
    for m in d.marches:
        s = series[m].dropna()
        if s.empty:
            lignes.append({"marche": m, "region": _region(d, m), "releves": 0})
            continue
        lignes.append(
            {
                "marche": m,
                "region": _region(d, m),
                "releves": int(len(s)),
                "dernier_prix": r(s.iloc[-1], 0),
                "dernier_mois": fmt_mois(s.index[-1]),
                "moyenne": r(s.mean(), 0),
                "minimum": r(s.min(), 0),
                "maximum": r(s.max(), 0),
                "ecart_moyenne_pct": r((s.mean() / moyenne_globale - 1) * 100, 1),
                "variabilite_pct": r(s.std(ddof=1) / s.mean() * 100, 1) if len(s) > 2 else None,
            }
        )
    lignes_ok = [x for x in lignes if x.get("moyenne") is not None]
    moins_cher = min(lignes_ok, key=lambda x: x["moyenne"]) if lignes_ok else None
    plus_cher = max(lignes_ok, key=lambda x: x["moyenne"]) if lignes_ok else None

    # Écart mensuel entre le marché le plus cher et le moins cher
    tab = pd.DataFrame(series)
    ecart = []
    for m in d.mois:
        ligne = tab.loc[m].dropna()
        ecart.append(
            {
                "mois": m,
                "libelle": fmt_mois_court(m),
                "ecart": r(ligne.max() - ligne.min(), 0) if len(ligne) >= 2 else None,
                "marches": int(len(ligne)),
            }
        )

    interpretation = ""
    if moins_cher and plus_cher and moins_cher["marche"] != plus_cher["marche"]:
        diff = (plus_cher["moyenne"] / moins_cher["moyenne"] - 1) * 100
        interpretation = (
            f"Pour « {produit} », le marché le moins cher en moyenne est {moins_cher['marche']} "
            f"({fmt_nombre(moins_cher['moyenne'])} FCFA/kg) et le plus cher est {plus_cher['marche']} "
            f"({fmt_nombre(plus_cher['moyenne'])} FCFA/kg), soit un écart de {fmt_nombre(diff, 1)} %."
        )

    return {
        "produit": produit,
        "unite": UNITE,
        "marches": d.marches,
        "serie": _lignes_par_marche(d, produit),
        "resume": lignes,
        "ecart_mensuel": ecart,
        "moins_cher": moins_cher["marche"] if moins_cher else None,
        "plus_cher": plus_cher["marche"] if plus_cher else None,
        "interpretation": interpretation,
    }


def _region(d: Donnees, marche: str) -> str:
    return str(d.prix.loc[d.prix["marche"] == marche, "region"].iloc[0])


# ---------------------------------------------------------------- études statistiques
def _stats_descriptives(x: pd.Series) -> dict[str, Any]:
    x = x.dropna()
    if x.empty:
        return {"n": 0}
    return {
        "n": int(len(x)),
        "moyenne": r(x.mean(), 0),
        "mediane": r(x.median(), 0),
        "ecart_type": r(x.std(ddof=1), 0) if len(x) > 1 else None,
        "cv_pct": r(x.std(ddof=1) / x.mean() * 100, 1) if len(x) > 1 else None,
        "minimum": r(x.min(), 0),
        "maximum": r(x.max(), 0),
        "asymetrie": r(stats.skew(x, bias=False), 2) if len(x) > 2 else None,
    }


def _matrice_correlation(tab: pd.DataFrame, min_mois: int = 8) -> dict[str, Any]:
    noms = list(tab.columns)
    valeurs: list[list[float | None]] = []
    for a in noms:
        ligne = []
        for b in noms:
            commun = tab[[a, b]].dropna()
            if a == b:
                ligne.append(1.0)
            elif len(commun) >= min_mois and commun[a].std() > 0 and commun[b].std() > 0:
                ligne.append(r(commun[a].corr(commun[b]), 2))
            else:
                ligne.append(None)
        valeurs.append(ligne)
    return {"noms": noms, "valeurs": valeurs, "min_mois": min_mois}


def etudes_statistiques(d: Donnees, produit: str | None) -> dict[str, Any]:
    produit = verifier_produit(d, produit)
    df = d.prix[d.prix["produit"] == produit]
    nat = serie_mensuelle(d, produit).dropna()

    par_produit = []
    for p in d.produits:
        ligne = {"produit": p}
        ligne.update(_stats_descriptives(d.prix.loc[d.prix["produit"] == p, "prix"]))
        par_produit.append(ligne)

    par_marche = []
    groupes = []
    for m in d.marches:
        valeurs = df.loc[df["marche"] == m, "prix"]
        ligne = {"marche": m}
        ligne.update(_stats_descriptives(valeurs))
        par_marche.append(ligne)
        if len(valeurs) >= 3:
            groupes.append(valeurs.values)

    # Test de Kruskal-Wallis : les prix diffèrent-ils d'un marché à l'autre ?
    kruskal: dict[str, Any] = {"disponible": False}
    if len(groupes) >= 2:
        h, p = stats.kruskal(*groupes)
        kruskal = {
            "disponible": True,
            "statistique": r(h, 2),
            "p_valeur": r(p, 4),
            "significatif": bool(p < 0.05),
            "conclusion": (
                "Les niveaux de prix diffèrent de façon statistiquement significative entre les marchés (seuil de 5 %)."
                if p < 0.05
                else "Aucune différence significative de niveau de prix entre les marchés (seuil de 5 %)."
            ),
        }

    # Tendance : corrélation de rang de Spearman entre le prix moyen et le temps
    tendance: dict[str, Any] = {"disponible": False}
    if len(nat) >= 6:
        t = np.arange(len(nat))
        rho, p = stats.spearmanr(t, nat.values)
        sens = "croissante" if rho > 0 else "décroissante"
        tendance = {
            "disponible": True,
            "rho": r(rho, 2),
            "p_valeur": r(p, 4),
            "significative": bool(p < 0.05),
            "conclusion": (
                f"Tendance {sens} significative du prix moyen sur la période (seuil de 5 %)."
                if p < 0.05
                else "Pas de tendance monotone significative du prix moyen sur la période (seuil de 5 %)."
            ),
        }

    variations = nat.pct_change().dropna() * 100
    volatilite = {
        "ecart_type_variation_pct": r(variations.std(ddof=1), 1) if len(variations) > 2 else None,
        "plus_forte_hausse_pct": r(variations.max(), 1) if len(variations) else None,
        "mois_hausse": fmt_mois(variations.idxmax()) if len(variations) else None,
        "plus_forte_baisse_pct": r(variations.min(), 1) if len(variations) else None,
        "mois_baisse": fmt_mois(variations.idxmin()) if len(variations) else None,
    }

    marches_tab = pd.DataFrame({m: serie_mensuelle(d, produit, m) for m in d.marches})
    produits_tab = pd.DataFrame({p: serie_mensuelle(d, p) for p in d.produits})

    return {
        "produit": produit,
        "unite": UNITE,
        "par_produit": par_produit,
        "par_marche": par_marche,
        "kruskal": kruskal,
        "tendance": tendance,
        "volatilite": volatilite,
        "correlation_marches": _matrice_correlation(marches_tab),
        "correlation_produits": _matrice_correlation(produits_tab),
        "interpretation": _interpreter_stats(produit, par_marche, kruskal, tendance, volatilite),
        "mise_en_garde": (
            f"Les séries comptent au plus {len(d.mois_observes)} mois : les corrélations et les tests sont "
            "indicatifs et doivent être lus avec prudence (petit échantillon)."
        ),
    }


def _interpreter_stats(produit, par_marche, kruskal, tendance, volatilite) -> str:
    phrases = []
    cv = [x for x in par_marche if x.get("cv_pct") is not None]
    if cv:
        stable = min(cv, key=lambda x: x["cv_pct"])
        instable = max(cv, key=lambda x: x["cv_pct"])
        phrases.append(
            f"Pour « {produit} », le marché le plus stable est {stable['marche']} (coefficient de variation "
            f"{fmt_nombre(stable['cv_pct'], 1)} %) et le plus variable est {instable['marche']} "
            f"({fmt_nombre(instable['cv_pct'], 1)} %)."
        )
    if kruskal.get("disponible"):
        phrases.append(kruskal["conclusion"])
    if tendance.get("disponible"):
        phrases.append(tendance["conclusion"])
    if volatilite.get("plus_forte_hausse_pct") is not None:
        phrases.append(
            f"La plus forte hausse mensuelle est de {fmt_nombre(volatilite['plus_forte_hausse_pct'], 1)} % "
            f"({volatilite['mois_hausse']}) et la plus forte baisse de {fmt_nombre(abs(volatilite['plus_forte_baisse_pct']), 1)} % "
            f"({volatilite['mois_baisse']})."
        )
    return " ".join(phrases)
