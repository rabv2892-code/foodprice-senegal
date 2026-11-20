"""Chargement des données PAM (Programme alimentaire mondial) et sélection des cinq marchés.

Étapes :
1. lecture du fichier nettoyé `data/processed/wfp_prices_clean.csv` (issu de `data/raw/wfp_food_prices_sen.csv`) ;
2. restriction à la période d'étude (janvier 2025 – décembre 2026) ;
3. classement de tous les marchés selon le nombre de relevés disponibles ;
4. conservation des cinq premiers marchés : eux seuls alimentent toutes les analyses.

Aucune valeur n'est inventée : les mois sans relevé restent vides.
"""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache

import pandas as pd

from .config import NOMBRE_MARCHES, PERIODE_DEBUT, PERIODE_FIN, PROCESSED_DIR
from .i18n import MARCHES_FR, PRODUITS_FR


@dataclass
class Donnees:
    prix: pd.DataFrame            # relevés des cinq marchés retenus (une ligne = un prix mensuel)
    classement: pd.DataFrame      # classement de tous les marchés de la période
    marches: list[str]            # les cinq marchés retenus (noms affichés)
    produits: list[str]           # produits disponibles dans ces marchés
    mois: list[str]               # tous les mois entre le premier et le dernier relevé (AAAA-MM)
    mois_observes: list[str]      # mois comportant au moins un relevé


def _charger_brut() -> pd.DataFrame:
    df = pd.read_csv(PROCESSED_DIR / "wfp_prices_clean.csv", low_memory=False)
    df = df[(df["date"] >= PERIODE_DEBUT) & (df["date"] <= PERIODE_FIN)].copy()
    df = df[df["price"].notna() & (df["price"] > 0)]
    df["marche_origine"] = df["market"]
    df["marche"] = df["market"].replace(MARCHES_FR)
    df["produit"] = df["commodity"].replace(PRODUITS_FR)
    df["region"] = df["region_std"]
    df["mois"] = df["ym"]
    df["annee"] = df["year"].astype(int)
    return df.reset_index(drop=True)


def _classer_marches(df: pd.DataFrame) -> pd.DataFrame:
    """Classement des marchés : nombre de relevés, puis mois couverts, puis produits couverts."""
    g = (
        df.groupby("marche")
        .agg(
            region=("region", "first"),
            releves=("price", "size"),
            mois=("mois", "nunique"),
            produits=("produit", "nunique"),
            premier=("date", "min"),
            dernier=("date", "max"),
        )
        .reset_index()
    )
    g = g.sort_values(["releves", "mois", "produits", "marche"], ascending=[False, False, False, True])
    g = g.reset_index(drop=True)
    g["rang"] = g.index + 1
    g["retenu"] = g["rang"] <= NOMBRE_MARCHES
    return g


def _tous_les_mois(mois_observes: list[str]) -> list[str]:
    if not mois_observes:
        return []
    periode = pd.period_range(mois_observes[0], mois_observes[-1], freq="M")
    return [str(p) for p in periode]


@lru_cache(maxsize=1)
def charger_donnees() -> Donnees:
    brut = _charger_brut()
    classement = _classer_marches(brut)
    marches = classement.loc[classement["retenu"], "marche"].tolist()

    prix = brut[brut["marche"].isin(marches)].copy()
    # Un seul prix par marché, mois et produit (moyenne si le fichier contient un doublon).
    prix = (
        prix.groupby(["marche", "region", "mois", "annee", "produit"], as_index=False)
        .agg(prix=("price", "mean"), date=("date", "min"))
        .sort_values(["produit", "marche", "mois"])
        .reset_index(drop=True)
    )
    mois_observes = sorted(prix["mois"].unique().tolist())
    produits = sorted(prix["produit"].unique().tolist())
    return Donnees(
        prix=prix,
        classement=classement,
        marches=marches,
        produits=produits,
        mois=_tous_les_mois(mois_observes),
        mois_observes=mois_observes,
    )


def produit_par_defaut(d: Donnees) -> str:
    """Produit le plus souvent relevé dans les cinq marchés."""
    return d.prix["produit"].value_counts().idxmax()


def serie_mensuelle(d: Donnees, produit: str, marche: str | None = None) -> pd.Series:
    """Prix mensuel d'un produit, indexé par mois (AAAA-MM), sur tous les mois de la période.

    - `marche` renseigné : prix de ce marché ;
    - sinon : moyenne des prix des cinq marchés disponibles ce mois-là.
    Les mois sans relevé valent NaN (jamais remplacés).
    """
    df = d.prix[d.prix["produit"] == produit]
    if marche:
        df = df[df["marche"] == marche]
    s = df.groupby("mois")["prix"].mean()
    return s.reindex(d.mois)
