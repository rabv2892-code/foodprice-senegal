"""Points d'accès de l'API (JSON) et exports. Tous les calculs sont dans analysis.py, forecast.py et reports.py."""
from __future__ import annotations

from urllib.parse import quote

from fastapi import APIRouter, Query
from fastapi.responses import Response

from . import analysis, forecast, reports
from .data import charger_donnees

router = APIRouter(prefix="/api")


@router.get("/options")
def options():
    return analysis.liste_options(charger_donnees())


@router.get("/marches")
def marches():
    return analysis.marches_retenus(charger_donnees())


@router.get("/tableau-de-bord")
def tableau_de_bord(produit: str | None = Query(None)):
    return analysis.tableau_de_bord(charger_donnees(), produit)


@router.get("/analyse-prix")
def analyse_prix(produit: str | None = Query(None), marche: str | None = Query(None)):
    return analysis.analyse_prix(charger_donnees(), produit, marche)


@router.get("/comparaison-marches")
def comparaison_marches(produit: str | None = Query(None)):
    return analysis.comparaison_marches(charger_donnees(), produit)


@router.get("/etudes-statistiques")
def etudes_statistiques(produit: str | None = Query(None)):
    return analysis.etudes_statistiques(charger_donnees(), produit)


@router.get("/previsions")
def previsions(produit: str | None = Query(None), marche: str | None = Query(None)):
    return forecast.previsions(charger_donnees(), produit, marche)


def _telechargement(contenu: bytes, nom: str, type_mime: str) -> Response:
    # Nom de fichier ASCII (sans accents), compatible avec tous les navigateurs.
    return Response(
        content=contenu,
        media_type=type_mime,
        headers={"Content-Disposition": f"attachment; filename=\"{quote(nom)}\""},
    )


@router.get("/export/pdf")
def export_pdf(produit: str | None = Query(None), marche: str | None = Query(None)):
    d = charger_donnees()
    nom = reports.nom_fichier(analysis.verifier_produit(d, produit), "pdf")
    return _telechargement(reports.export_pdf(d, produit, marche), nom, "application/pdf")


@router.get("/export/excel")
def export_excel(produit: str | None = Query(None), marche: str | None = Query(None)):
    d = charger_donnees()
    nom = reports.nom_fichier(analysis.verifier_produit(d, produit), "xlsx")
    return _telechargement(
        reports.export_excel(d, produit, marche), nom,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


@router.get("/export/csv")
def export_csv():
    d = charger_donnees()
    nom = reports.nom_fichier("releves_5_marches", "csv")
    return _telechargement(reports.export_csv(d), nom, "text/csv; charset=utf-8")
