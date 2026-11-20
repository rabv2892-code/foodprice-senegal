"""Application FastAPI : API JSON (+ interface React compilée si elle est présente à côté, pour l'usage local).

Variables d'environnement (voir render.yaml) :
- ENVIRONNEMENT      : « production » désactive la documentation interactive et masque les détails des erreurs ;
- CORS_ORIGINS       : adresses autorisées à appeler l'API, séparées par des virgules (ex. https://mon-site.onrender.com) ;
- CORS_ORIGIN_REGEX  : expression régulière facultative pour autoriser plusieurs adresses (ex. sous-domaines du site).
Aucun secret n'est nécessaire : l'API est en lecture seule et ne manipule que des données publiques (PAM).
"""
from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import APP_NAME, APP_SUBTITLE, APP_VERSION, FRONTEND_DIST_DIR, PERIODE_LIBELLE
from .data import charger_donnees
from .routes import router

journal = logging.getLogger("foodprice")

PRODUCTION = os.getenv("ENVIRONNEMENT", "developpement").lower() == "production"


@asynccontextmanager
async def cycle_de_vie(_: FastAPI):
    charger_donnees()  # charge les données au démarrage : la première requête est alors rapide
    yield


app = FastAPI(
    title=APP_NAME,
    description=APP_SUBTITLE,
    version=APP_VERSION,
    lifespan=cycle_de_vie,
    docs_url=None if PRODUCTION else "/docs",
    redoc_url=None if PRODUCTION else "/redoc",
    openapi_url=None if PRODUCTION else "/openapi.json",
)


@app.middleware("http")
async def capter_les_erreurs(request: Request, call_next):
    """Erreur inattendue : message français générique (jamais de trace technique) et journalisation côté serveur."""
    try:
        return await call_next(request)
    except Exception:
        journal.exception("Erreur interne sur %s", request.url.path)
        return JSONResponse(
            status_code=500,
            content={"detail": "Erreur interne du serveur. Veuillez réessayer dans quelques instants."},
        )


# Ajouté après le middleware d'erreurs : les réponses d'erreur reçoivent aussi les en-têtes CORS.
_origines = [o.strip().rstrip("/") for o in os.getenv("CORS_ORIGINS", "").split(",") if o.strip()]
if not PRODUCTION and not _origines:
    _origines = ["http://localhost:5173", "http://127.0.0.1:5173"]  # développement local uniquement

app.add_middleware(
    CORSMiddleware,
    allow_origins=_origines,
    allow_origin_regex=os.getenv("CORS_ORIGIN_REGEX") or None,
    allow_methods=["GET", "HEAD", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/health", tags=["Supervision"])
def health():
    """Vérification de disponibilité (utilisée par Render) : le serveur répond et les données sont chargées."""
    d = charger_donnees()
    return {
        "status": "ok",
        "application": APP_NAME,
        "version": APP_VERSION,
        "periode": PERIODE_LIBELLE,
        "marches": d.marches,
        "produits": len(d.produits),
        "mois_observes": len(d.mois_observes),
    }


if (FRONTEND_DIST_DIR / "index.html").exists():
    # Usage local « tout-en-un » : le même serveur affiche l'interface compilée.
    if (FRONTEND_DIST_DIR / "assets").exists():
        app.mount("/assets", StaticFiles(directory=FRONTEND_DIST_DIR / "assets"), name="assets")

    @app.get("/{chemin:path}", include_in_schema=False)
    def interface(chemin: str):
        fichier = FRONTEND_DIST_DIR / chemin
        if chemin and fichier.is_file():
            return FileResponse(fichier)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
else:

    @app.get("/", include_in_schema=False)
    def racine():
        return {"application": APP_NAME, "version": APP_VERSION, "documentation_sante": "/health", "api": "/api/options"}
