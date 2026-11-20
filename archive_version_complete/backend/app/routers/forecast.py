from __future__ import annotations

from fastapi import APIRouter, Query
from pydantic import BaseModel

from ..data_store import get_store
from ..services.forecasting import get_forecast_options, run_forecast_pipeline

router = APIRouter(prefix="/api/forecast", tags=["Prévisions"])


class ForecastRequest(BaseModel):
    source: str = "wfp"
    commodity: str | None = None
    region: str | None = None
    market: str | None = None
    horizon: int = 6


@router.get("/options")
def api_forecast_options(source: str = Query("wfp")):
    return get_forecast_options(get_store(), source=source)


@router.post("/run")
def api_forecast_run(payload: ForecastRequest):
    return run_forecast_pipeline(
        get_store(),
        source=payload.source,
        commodity=payload.commodity,
        region=payload.region,
        market=payload.market,
        horizon=payload.horizon,
    )
