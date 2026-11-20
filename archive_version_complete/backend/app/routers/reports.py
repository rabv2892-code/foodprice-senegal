from __future__ import annotations

import io
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import Response
from pydantic import BaseModel

from ..data_store import get_store
from ..i18n import fmt_date, fmt_ym
from ..services.reports import export_analytics_excel, export_filtered_csv, generate_pdf_report

BULLETIN_COLUMNS_FR = {
    "date": "Date (JJ/MM/AAAA)",
    "ym": "Mois (MM/AAAA)",
    "year": "Année",
    "month": "Numéro du mois",
    "unit": "Unité",
    "value": "Valeur",
    "price": "Prix",
    "currency": "Devise",
    "region_raw": "Région (libellé d'origine)",
    "region_std": "Région",
    "product_code": "Code produit",
    "product_label": "Produit",
    "price_stage": "Type de prix",
    "category": "Catégorie",
    "source": "Source",
    "is_outlier_iqr_15": "Valeur aberrante modérée (1,5×EIQ)",
    "is_outlier_iqr_30": "Valeur aberrante extrême (3×EIQ)",
    "period_type": "Type de période",
    "period_label": "Période",
    "period_order": "Ordre de la période",
    "year_ref": "Année de référence",
    "commodity": "Produit",
    "speculation": "Spéculation",
    "group": "Groupe",
    "is_aggregate": "Ligne agrégée",
    "production_tonnes": "Production (tonnes)",
    "metric_label": "Indicateur",
    "metric_type": "Type d'indicateur",
    "species": "Espèce",
    "section": "Section",
    "indicator": "Indicateur",
    "is_section_total": "Total de section",
    "table_code": "Code du tableau",
    "airport": "Aéroport",
    "metric_group": "Groupe d'indicateurs",
    "is_total_row": "Ligne de total",
    "direction": "Sens",
    "cargo_type": "Type de fret",
    "is_subdetail": "Sous-détail",
}

router = APIRouter(prefix="/api/reports", tags=["Rapports et exportations"])


class PdfRequest(BaseModel):
    source: str = "wfp"
    commodity: str | None = None
    region: str | None = None
    market: str | None = None
    horizon: int = 6


@router.get("/export/csv")
def api_export_csv(
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
    content, fname = export_filtered_csv(
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
    return Response(
        content=content,
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/export/excel")
def api_export_excel(
    source: str = Query("wfp"),
    region: str | None = Query(None),
    market: str | None = Query(None),
    commodity: str | None = Query(None),
    year: int | None = Query(None),
    horizon: int = Query(6),
):
    content, fname = export_analytics_excel(
        get_store(),
        source=source,
        region=region,
        market=market,
        commodity=commodity,
        year=year,
        forecast_horizon=horizon,
    )
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.post("/export/pdf")
def api_export_pdf(payload: PdfRequest):
    content, fname = generate_pdf_report(
        get_store(),
        source=payload.source,
        commodity=payload.commodity,
        region=payload.region,
        market=payload.market,
        horizon=payload.horizon,
    )
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )


@router.get("/export/bulletin/{sheet_key}")
def api_export_bulletin_sheet(sheet_key: str):
    store = get_store()
    mapping = {
        "csa": ("csa_prix_kg_senegal.csv", store.csa),
        "commodities": ("cours_matieres_premieres.csv", store.commodities_ext),
        "horticulture": ("production_horticole_senegal.csv", store.prod_horti),
        "livestock": ("production_elevage_senegal.csv", store.prod_elevage),
        "senelec": ("donnees_senelec.csv", store.senelec),
        "air-transport": ("transport_aerien_senegal.csv", store.trans_aerien),
        "maritime-transport": ("transport_maritime_senegal.csv", store.trans_marit),
    }
    if sheet_key not in mapping:
        raise HTTPException(status_code=404, detail="Feuille inconnue")
    fname, df = mapping[sheet_key]
    out = df.copy()
    if "date" in out.columns:
        out["date"] = out["date"].map(lambda v: fmt_date(str(v)[:10]) if v is not None and str(v) != "NaT" else "")
    if "ym" in out.columns:
        out["ym"] = out["ym"].map(lambda v: fmt_ym(str(v)) if v is not None else "")
    out = out.rename(columns=BULLETIN_COLUMNS_FR)
    buf = io.StringIO()
    out.to_csv(buf, index=False, sep=";", decimal=",")
    return Response(
        content=buf.getvalue().encode("utf-8-sig"),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{fname}"'},
    )
