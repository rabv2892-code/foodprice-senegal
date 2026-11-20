"""Application FastAPI : API JSON + service de l'interface React compilée (frontend/dist)."""
from __future__ import annotations

from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_SUBTITLE, APP_VERSION, FRONTEND_DIST_DIR, PERIODE_LIBELLE
from .data import charger_donnees
from .routes import router

app = FastAPI(title=APP_NAME, description=APP_SUBTITLE, version=APP_VERSION)
app.include_router(router)


@app.get("/api/sante")
def sante():
    d = charger_donnees()
    return {
        "etat": "ok",
        "application": APP_NAME,
        "version": APP_VERSION,
        "periode": PERIODE_LIBELLE,
        "marches": d.marches,
        "produits": len(d.produits),
        "mois_observes": len(d.mois_observes),
    }


if (FRONTEND_DIST_DIR / "index.html").exists():
    if (FRONTEND_DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="assets")

    @app.get("/{chemin:path}")
    def interface(chemin: str):
        fichier = FRONTEND_DIST_DIR / chemin
        if chemin and fichier.is_file():
            return FileResponse(fichier)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
