from __future__ import annotations

from fastapi import APIRouter, Query

from ..data_store import get_store
from ..services.executive import get_executive_dashboard

router = APIRouter(prefix="/api/executive", tags=["Tableau de bord exécutif"])


@router.get("/dashboard")
def api_executive_dashboard(
    source: str = Query("wfp"),
    commodity: str | None = Query(None),
    region: str | None = Query(None),
    market: str | None = Query(None),
    category: str | None = Query(None),
    year: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    horizon: int = Query(6),
):
    return get_executive_dashboard(
        get_store(),
        source=source,
        commodity=commodity,
        region=region,
        market=market,
        category=category,
        year=year,
        date_from=date_from,
        date_to=date_to,
        horizon=horizon if horizon in (1, 3, 6, 12) else 6,
    )
