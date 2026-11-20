"""Tests de l'application : cinq marchés, période 2025–2026, cohérence des analyses, exports."""
import io

import openpyxl
import pytest
from fastapi.testclient import TestClient
from pypdf import PdfReader

from backend.app.config import NOMBRE_MARCHES
from backend.app.data import charger_donnees
from backend.app.main import app

client = TestClient(app)
D = charger_donnees()
PRODUIT = "Mil"


def test_exactement_cinq_marches_les_mieux_couverts():
    c = D.classement
    assert len(D.marches) == NOMBRE_MARCHES == 5
    retenus = c[c["retenu"]]
    autres = c[~c["retenu"]]
    # chaque marché retenu a au moins autant de relevés que n'importe quel marché écarté
    assert retenus["releves"].min() >= autres["releves"].max()
    assert set(D.prix["marche"].unique()) == set(D.marches)


def test_periode_2025_2026_uniquement():
    assert D.mois_observes[0] >= "2025-01"
    assert D.mois_observes[-1] <= "2026-12"
    assert (D.prix["annee"] >= 2025).all()
    assert (D.prix["date"] >= "2025-01-01").all() and (D.prix["date"] <= "2026-12-31").all()


def test_marches_endpoint_justifie_la_selection():
    r = client.get("/api/marches").json()
    assert [m["marche"] for m in r["marches"]] == D.marches
    assert all(m["releves"] > 0 for m in r["marches"])
    assert "relevés" in r["critere"]
    assert r["nombre_marches_disponibles"] > 5


def test_tableau_de_bord_quatre_indicateurs_et_graphiques():
    r = client.get("/api/tableau-de-bord", params={"produit": PRODUIT}).json()
    k = r["indicateurs"]
    assert k["marches_etudies"] == 5
    assert k["produits_disponibles"] == len(D.produits)
    assert k["dernier_prix"] > 0 and k["variation_pct"] is not None
    assert set(r["marches"]) == set(D.marches)
    assert set(r["comparaison_marches"][0]) - {"mois", "libelle"} == set(D.marches)
    assert len(r["comparaison_produits"]) == len(D.produits)
    # aucun mois inventé : toutes les clés de mois sont dans la période d'étude
    assert all("2025-01" <= x["mois"] <= "2026-12" for x in r["evolution"])


@pytest.mark.parametrize(
    "url",
    ["/api/analyse-prix", "/api/comparaison-marches", "/api/etudes-statistiques", "/api/previsions"],
)
def test_toutes_les_analyses_utilisent_les_memes_marches(url):
    r = client.get(url, params={"produit": PRODUIT}).json()
    texte = str(r)
    assert "5 marchés" in texte or "Ourossogui" in texte
    # le premier marché écarté n'apparaît jamais
    ecarte = D.classement.loc[~D.classement["retenu"], "marche"].iloc[0]
    assert ecarte not in texte


def test_marche_inconnu_ignore():
    r = client.get("/api/analyse-prix", params={"produit": PRODUIT, "marche": "Marché inventé"}).json()
    assert r["marche"] is None


def test_previsions_six_mois_apres_derniere_observation():
    r = client.get("/api/previsions", params={"produit": PRODUIT}).json()
    assert r["disponible"] is True
    assert len(r["prevision"]) == 6
    assert r["prevision"][0]["mois"] == "2026-04"
    assert r["prevision"][-1]["mois"] == "2026-09"
    assert {v["cle"] for v in r["validation"]} == {"holt_winters", "arima", "naif"}
    assert all(p["bas"] <= p["prevision"] <= p["haut"] for p in r["prevision"])
    assert r["modele"].startswith(("Holt-Winters", "ARIMA"))
    assert r["interpretation"]


def test_serie_trop_courte_sans_prevision():
    r = client.get("/api/previsions", params={"produit": "Riz (local)", "marche": "Mereto"}).json()
    assert r["disponible"] is False and "trop courte" in r["message"]


def test_exports():
    pdf = client.get("/api/export/pdf", params={"produit": PRODUIT})
    assert pdf.status_code == 200 and pdf.content[:4] == b"%PDF"
    texte = " ".join(p.extract_text() for p in PdfReader(io.BytesIO(pdf.content)).pages)
    assert "Les cinq marchés étudiés" in texte and "Ourossogui" in texte
    xl = client.get("/api/export/excel", params={"produit": PRODUIT})
    wb = openpyxl.load_workbook(io.BytesIO(xl.content))
    assert "Marchés retenus" in wb.sheetnames and wb["Marchés retenus"].max_row == 6
    csv = client.get("/api/export/csv")
    entete = csv.content.decode("utf-8-sig").splitlines()[0]
    assert entete.startswith("Date du relevé") and ";" in entete
    assert len(csv.content.decode("utf-8-sig").splitlines()) == len(D.prix) + 1


def test_health_repond_et_confirme_les_donnees():
    r = client.get("/health")
    assert r.status_code == 200
    j = r.json()
    assert j["status"] == "ok" and j["marches"] == D.marches and j["produits"] == len(D.produits)


def test_cors_autorise_uniquement_les_origines_configurees():
    ok = client.get("/health", headers={"Origin": "http://localhost:5173"})
    assert ok.headers.get("access-control-allow-origin") == "http://localhost:5173"
    refuse = client.get("/health", headers={"Origin": "https://site-inconnu.example"})
    assert "access-control-allow-origin" not in refuse.headers


def test_erreur_interne_sans_details_techniques(monkeypatch):
    def casse(*_a, **_k):
        raise RuntimeError("secret interne /chemin/du/serveur")

    monkeypatch.setattr("backend.app.routes.analysis.liste_options", casse)
    r = TestClient(app, raise_server_exceptions=False).get("/api/options", headers={"Origin": "http://localhost:5173"})
    assert r.status_code == 500
    assert "secret interne" not in r.text and "Erreur interne" in r.json()["detail"]
    assert r.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_resultats_memorises_et_cles_bornees():
    from backend.app import forecast, reports

    a = client.get("/api/previsions", params={"produit": PRODUIT}).json()
    b = client.get("/api/previsions", params={"produit": PRODUIT}).json()
    assert a == b
    avant = len(reports._FICHIERS)
    for i in range(5):  # des marchés inventés n'ajoutent pas d'entrées
        client.get("/api/export/excel", params={"produit": PRODUIT, "marche": f"Inconnu {i}"})
    assert len(reports._FICHIERS) <= avant + 1
    assert len(forecast._CACHE) <= len(D.produits) * (len(D.marches) + 1)
