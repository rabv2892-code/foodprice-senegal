from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .config import (
    APP_NAME,
    APP_SUBTITLE,
    APP_VERSION,
    FRONTEND_DIST_DIR,
    OFFICIAL_END_DATE,
    OFFICIAL_PERIOD_LABEL,
    OFFICIAL_START_DATE,
)
from .data_store import get_store
from .routers import analytics, bulletin, executive, forecast, quality, reports
from .services.forecasting import PROPHET_AVAILABLE

app = FastAPI(
    title=APP_NAME,
    description=APP_SUBTITLE,
    version=APP_VERSION,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def api_health():
    store = get_store()
    return {
        "status": "ok",
        "app": APP_NAME,
        "subtitle": APP_SUBTITLE,
        "version": APP_VERSION,
        "official_period": {
            "label": OFFICIAL_PERIOD_LABEL,
            "start_date": OFFICIAL_START_DATE,
            "end_date": OFFICIAL_END_DATE,
        },
        "coverage": store.coverage_summary,
        "prophet_available": PROPHET_AVAILABLE,
        "datasets_loaded": list(store.manifest["outputs"].keys()),
    }


app.include_router(analytics.router)
app.include_router(executive.router)
app.include_router(forecast.router)
app.include_router(bulletin.router)
app.include_router(quality.router)
app.include_router(reports.router)

if FRONTEND_DIST_DIR.exists() and (FRONTEND_DIST_DIR / "index.html").exists():
    assets_dir = FRONTEND_DIST_DIR / "assets"
    if assets_dir.exists():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        candidate = FRONTEND_DIST_DIR / full_path
        if full_path and candidate.exists() and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST_DIR / "index.html")
