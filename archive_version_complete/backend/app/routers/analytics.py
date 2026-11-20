from __future__ import annotations

from fastapi import APIRouter, Query

from ..data_store import get_store
from ..services.analytics import (
    get_explorer_data,
    get_filter_options,
    get_geo_analysis,
    get_markets_comparison,
    get_overview_dashboard,
    get_price_analysis,
    get_products_analysis,
    get_statistical_study,
    get_temporal_analysis,
)

router = APIRouter(prefix="/api", tags=["Analyses"])


@router.get("/filters")
def api_filters(
    source: str = Query("wfp"),
    region: str | None = Query(None),
    category: str | None = Query(None),
):
    return get_filter_options(get_store(), source=source, region=region, category=category)


@router.get("/overview")
def api_overview(
    source: str = Query("wfp"),
    region: str | None = Query(None),
    market: str | None = Query(None),
    commodity: str | None = Query(None),
    category: str | None = Query(None),
    year: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    price_stage: str | None = Query(None),
):
    return get_overview_dashboard(
        get_store(),
        source=source,
        region=region,
        market=market,
        commodity=commodity,
        category=category,
        year=year,
        date_from=date_from,
        date_to=date_to,
        price_stage=price_stage,
    )


@router.get("/explorer")
def api_explorer(
    source: str = Query("wfp"),
    region: str | None = Query(None),
    market: str | None = Query(None),
    commodity: str | None = Query(None),
    category: str | None = Query(None),
    year: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
    price_stage: str | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=10, le=200),
    search: str | None = Query(None),
):
    return get_explorer_data(
        get_store(),
        source=source,
        region=region,
        market=market,
        commodity=commodity,
        category=category,
        year=year,
        date_from=date_from,
        date_to=date_to,
        price_stage=price_stage,
        page=page,
        page_size=page_size,
        search=search,
    )


@router.get("/prices/analysis")
def api_prices_analysis(
    source: str = Query("wfp"),
    commodity: str | None = Query(None),
    region: str | None = Query(None),
    market: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    return get_price_analysis(
        get_store(),
        source=source,
        commodity=commodity,
        region=region,
        market=market,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/products/analysis")
def api_products_analysis(
    source: str = Query("wfp"),
    region: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    return get_products_analysis(get_store(), source=source, region=region, date_from=date_from, date_to=date_to)


@router.get("/geo/analysis")
def api_geo_analysis(
    source: str = Query("wfp"),
    commodity: str | None = Query(None),
    year: int | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    return get_geo_analysis(
        get_store(),
        source=source,
        commodity=commodity,
        year=year,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/temporal/analysis")
def api_temporal_analysis(
    source: str = Query("wfp"),
    commodity: str | None = Query(None),
    region: str | None = Query(None),
    market: str | None = Query(None),
):
    return get_temporal_analysis(get_store(), source=source, commodity=commodity, region=region, market=market)


@router.get("/markets/compare")
def api_markets_compare(
    source: str = Query("wfp"),
    markets: str | None = Query(None),
    commodity: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    mkt_list = [m.strip() for m in markets.split(",") if m.strip()] if markets else None
    return get_markets_comparison(
        get_store(),
        source=source,
        markets=mkt_list,
        commodity=commodity,
        date_from=date_from,
        date_to=date_to,
    )


@router.get("/stats/study")
def api_stats_study(
    source: str = Query("wfp"),
    commodity: str | None = Query(None),
    region: str | None = Query(None),
    market: str | None = Query(None),
    date_from: str | None = Query(None),
    date_to: str | None = Query(None),
):
    return get_statistical_study(
        get_store(),
        source=source,
        commodity=commodity,
        region=region,
        market=market,
        date_from=date_from,
        date_to=date_to,
    )
