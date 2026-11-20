from __future__ import annotations

from fastapi import APIRouter, Query

from ..data_store import get_store
from ..services.analytics import get_overview_dashboard
from ..services.bulletin import (
    get_air_transport_data,
    get_bulletin_cross_analysis,
    get_commodities_market_data,
    get_horticulture_data,
    get_livestock_data,
    get_maritime_transport_data,
    get_senelec_data,
)

router = APIRouter(prefix="/api/bulletin", tags=["Bulletin national"])


@router.get("/csa")
def api_bulletin_csa(
    region: str | None = Query(None),
    commodity: str | None = Query(None),
    price_stage: str | None = Query(None),
):
    res = get_overview_dashboard(
        get_store(),
        source="csa",
        region=region,
        commodity=commodity,
        price_stage=price_stage,
    )
    res["available_in_2025_2026"] = res["kpis"]["total_observations"] > 0
    res["rows_2025_2026"] = res["kpis"]["total_observations"]
    return res


@router.get("/commodities")
def api_bulletin_commodities(commodity: str | None = Query(None)):
    return get_commodities_market_data(get_store(), commodity=commodity)


@router.get("/horticulture")
def api_bulletin_horticulture():
    return get_horticulture_data(get_store())


@router.get("/livestock")
def api_bulletin_livestock():
    return get_livestock_data(get_store())


@router.get("/senelec")
def api_bulletin_senelec():
    return get_senelec_data(get_store())


@router.get("/air-transport")
def api_bulletin_air():
    return get_air_transport_data(get_store())


@router.get("/maritime-transport")
def api_bulletin_maritime():
    return get_maritime_transport_data(get_store())


@router.get("/cross-analysis")
def api_bulletin_cross():
    return get_bulletin_cross_analysis(get_store())
