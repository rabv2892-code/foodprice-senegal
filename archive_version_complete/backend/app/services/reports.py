from __future__ import annotations

import datetime
import io
from typing import Any
from xml.sax.saxutils import escape as xml_escape

import openpyxl
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from ..config import OFFICIAL_PERIOD_LABEL
from ..data_store import DataStore
from ..i18n import SOURCE_SLUG, export_stamp, fmt_date, fmt_num, fmt_ym
from .analytics import (
    apply_filters,
    get_geo_analysis,
    get_overview_dashboard,
    get_source_dataframe,
    get_statistical_study,
)
from .forecasting import run_forecast_pipeline


def _lib(valeur: str | None, defaut: str) -> str:
    """Libellé de filtre : 'ALL' ou vide -> libellé par défaut français."""
    return defaut if not valeur or valeur == "ALL" else valeur


def export_filtered_csv(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    market: str | None = None,
    commodity: str | None = None,
    category: str | None = None,
    year: int | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    price_stage: str | None = None,
) -> tuple[bytes, str]:
    df, meta = get_source_dataframe(store, source)
    fdf = apply_filters(df, region, market, commodity, category, year, date_from, date_to, price_stage)
    export_cols = ["date", "ym", "year", "month", "region_std", "market_col", "commodity_col", "category_col", "stage_col", "price_col"]
    if source == "wfp" and "usdprice" in fdf.columns:
        export_cols.append("usdprice")
    elif source in ("rt_observed", "rt_model"):
        export_cols.extend(["open_price", "high_price", "low_price", "close_price", "inflation_yoy_pct", "trust_score"])
    existing_cols = [c for c in export_cols if c in fdf.columns]
    out = fdf[existing_cols].copy()
    if "date" in out.columns:
        out["date"] = out["date"].map(fmt_date)
    if "ym" in out.columns:
        out["ym"] = out["ym"].map(fmt_ym)
    out = out.rename(
        columns={
            "date": "Date (JJ/MM/AAAA)",
            "ym": "Mois (MM/AAAA)",
            "year": "Année",
            "month": "Numéro du mois",
            "region_std": "Région",
            "market_col": "Marché",
            "commodity_col": "Produit",
            "category_col": "Catégorie",
            "stage_col": "Type de prix",
            "price_col": f"Prix ({meta['unit']})",
            "usdprice": "Prix (dollars américains)",
            "open_price": "Prix d'ouverture",
            "high_price": "Prix le plus haut",
            "low_price": "Prix le plus bas",
            "close_price": "Prix de clôture",
            "inflation_yoy_pct": "Inflation sur un an (%)",
            "trust_score": "Indice de confiance",
        }
    )
    buf = io.StringIO()
    # Format français : séparateur de colonnes « ; » et virgule décimale (ouverture directe dans Excel en français)
    out.to_csv(buf, index=False, sep=";", decimal=",", encoding="utf-8-sig")
    fname = f"foodprice_senegal_2025_2026_{SOURCE_SLUG.get(source, source)}_{export_stamp()}.csv"
    return buf.getvalue().encode("utf-8-sig"), fname


def export_analytics_excel(
    store: DataStore,
    source: str = "wfp",
    region: str | None = None,
    market: str | None = None,
    commodity: str | None = None,
    year: int | None = None,
    forecast_horizon: int = 6,
) -> tuple[bytes, str]:
    overview = get_overview_dashboard(store, source=source, region=region, market=market, commodity=commodity, year=year)
    stats = get_statistical_study(store, source=source, commodity=commodity, region=region, market=market)
    geo = get_geo_analysis(store, source=source, commodity=commodity, year=year)
    fc = run_forecast_pipeline(store, source=source, commodity=commodity, region=region, market=market, horizon=forecast_horizon)

    wb = openpyxl.Workbook()
    ws_kpi = wb.active
    ws_kpi.title = "Synthèse_indicateurs"
    ws_kpi.append(["FOODPRICE SENEGAL — Rapport analytique (2025–2026)", datetime.datetime.now().strftime("%d/%m/%Y %H:%M")])
    ws_kpi.append(["Période officielle", OFFICIAL_PERIOD_LABEL])
    ws_kpi.append(["Source", overview["meta"]["source_label"]])
    ws_kpi.append(["Nature des données", overview["meta"]["data_nature"]])
    ws_kpi.append(["Unité", overview["meta"]["unit"]])
    ws_kpi.append([])
    ws_kpi.append(["Indicateur", "Valeur"])
    kpi_labels = {
        "total_observations": "Nombre d'observations",
        "regions_count": "Nombre de régions",
        "markets_count": "Nombre de marchés",
        "products_count": "Nombre de produits",
        "periods_count": "Nombre de mois couverts",
        "mean_price": "Prix moyen",
        "median_price": "Prix médian",
        "min_price": "Prix minimum",
        "max_price": "Prix maximum",
        "std_price": "Écart-type des prix",
        "last_observation_date": "Date de la dernière observation",
        "stage_notice": "Remarque sur le type de prix",
    }
    for k, v in overview["kpis"].items():
        if k not in kpi_labels:
            continue
        shown = fmt_date(v) if k == "last_observation_date" and v else v
        ws_kpi.append([kpi_labels[k], str(shown) if shown is not None else "Non disponible"])

    ws_reg = wb.create_sheet("Comparaison_régions")
    ws_reg.append(["Région", "Observations", "Prix moyen", "Médiane", "Minimum", "Maximum", "Écart par rapport à la moyenne nationale (%)"])
    for r in geo["regions"]:
        ws_reg.append([r["region"], r["observations"], r["mean"], r["median"], r["min"], r["max"], r["gap_vs_national_pct"]])

    ws_prod = wb.create_sheet("Synthèse_produits")
    ws_prod.append(["Produit", "Observations", "Prix moyen", "Médiane", "Minimum", "Maximum", "Écart-type"])
    for p in overview["charts"]["avg_by_product"]:
        ws_prod.append([p["commodity"], p["count"], p["mean"], p["median"], p["min"], p["max"], p["std"]])

    ws_ts = wb.create_sheet("Série_mensuelle")
    ws_ts.append(["Mois (MM/AAAA)", "Observations", "Moyenne", "Médiane", "Minimum", "Maximum"])
    for t in overview["charts"]["time_series"]:
        ws_ts.append([fmt_ym(t["ym"]), t["count"], t["mean"], t["median"], t["min"], t["max"]])

    if stats.get("boxplots"):
        ws_stat = wb.create_sheet("Statistiques_boîtes")
        ws_stat.append(["Groupe", "Effectif", "Minimum", "Q1 (25 %)", "Médiane", "Moyenne", "Q3 (75 %)", "Maximum", "Écart interquartile", "Valeurs aberrantes"])
        for b in stats["boxplots"]:
            ws_stat.append([b["group"], b["count"], b["min"], b["q25"], b["median"], b["mean"], b["q75"], b["max"], b["iqr"], b["outliers_count"]])

    if fc.get("eligible"):
        ws_fc = wb.create_sheet("Prévisions_IA")
        diag = fc["series_diagnostics"]
        ws_fc.append(["Périmètre", fc["scope"]])
        ws_fc.append(["Modèle retenu", f"{fc['best_model']} ({fc['best_specification']})"])
        ws_fc.append(["Observé 2025 (mois / moyenne)", f"{diag['observed_months_2025']} mois / {diag['mean_2025']}"])
        ws_fc.append(["Observé 2026 (mois / moyenne)", f"{diag['observed_months_2026']} mois ({', '.join(fmt_ym(m) for m in diag['available_2026_months'])}) / {diag['mean_2026']}"])
        ws_fc.append(["Date de la dernière observation", fmt_date(diag["last_observed_date"])])
        ws_fc.append([])
        ws_fc.append(["Modèle", "Statut", "EAM", "REQM", "EAMP (%)", "Sélectionné"])
        for m in fc["model_comparison"]:
            ws_fc.append([m["model"], "Évalué" if m["status"] == "evaluated" else "Indisponible", m["mae"], m["rmse"], m["mape_pct"], "OUI" if m["selected"] else "NON"])
        ws_fc.append([])
        ws_fc.append(["Date future", "Mois", "Prix prévisionnel", "Borne basse à 95 %", "Borne haute à 95 %", "Variation par rapport à la dernière observation (%)"])
        for f in fc["forecast_series"]:
            ws_fc.append([fmt_date(f["date"]), fmt_ym(f["ym"]), f["forecast"], f["lower_95"], f["upper_95"], f["delta_pct_vs_last"]])

    buf = io.BytesIO()
    wb.save(buf)
    fname = f"foodprice_senegal_2025_2026_{SOURCE_SLUG.get(source, source)}_{export_stamp()}.xlsx"
    return buf.getvalue(), fname


def generate_pdf_report(
    store: DataStore,
    source: str = "wfp",
    commodity: str | None = None,
    region: str | None = None,
    market: str | None = None,
    horizon: int = 6,
) -> tuple[bytes, str]:
    overview = get_overview_dashboard(store, source=source, region=region, market=market, commodity=commodity)
    stats = get_statistical_study(store, source=source, commodity=commodity, region=region, market=market)
    geo = get_geo_analysis(store, source=source, commodity=commodity)
    fc = run_forecast_pipeline(store, source=source, commodity=commodity, region=region, market=market, horizon=horizon)
    audit = store.audit_report

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.8 * cm,
        bottomMargin=1.8 * cm,
        title="Rapport Final 2025-2026 — FOODPRICE SENEGAL",
    )

    styles = getSampleStyleSheet()
    navy = colors.HexColor("#0B192C")
    teal = colors.HexColor("#0F766E")
    slate = colors.HexColor("#475569")
    light_bg = colors.HexColor("#F1F5F9")

    title_style = ParagraphStyle("TitleFP", parent=styles["Title"], textColor=navy, fontSize=19, spaceAfter=6)
    sub_style = ParagraphStyle("SubFP", parent=styles["Normal"], textColor=teal, fontSize=10.5, spaceAfter=12, fontName="Helvetica-Bold")
    h1_style = ParagraphStyle("H1FP", parent=styles["Heading2"], textColor=navy, fontSize=12.5, spaceBefore=12, spaceAfter=6)
    body_style = ParagraphStyle("BodyFP", parent=styles["Normal"], textColor=colors.HexColor("#1E293B"), fontSize=9.5, leading=13.5, spaceAfter=6)

    def make_table(data: list[list[Any]], col_widths: list[float] | None = None) -> Table:
        t = Table(data, colWidths=col_widths, repeatRows=1)
        t.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), navy),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                    ("FONTSIZE", (0, 0), (-1, -1), 8.2),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, light_bg]),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        return t

    story: list[Any] = []
    story.append(Paragraph("FOODPRICE SENEGAL — RAPPORT D'ANALYSE ET DE PRÉVISION (2025–2026)", title_style))
    story.append(Paragraph(xml_escape(f"INTELLIGENCE DES PRIX ALIMENTAIRES ET PRÉVISIONS | PÉRIODE OFFICIELLE : {OFFICIAL_PERIOD_LABEL}"), sub_style))
    story.append(
        Paragraph(
            xml_escape(
                f"Généré le {datetime.datetime.now().strftime('%d/%m/%Y à %H:%M')} | "
                f"Source active : {overview['meta']['source_label']} | "
                f"Filtre : Produit={_lib(commodity, 'Tous')}, Région={_lib(region, 'Toutes')}, Marché={_lib(market, 'Tous')}."
            ),
            ParagraphStyle("Meta", parent=body_style, textColor=slate, fontSize=8.5),
        )
    )
    story.append(Spacer(1, 8))

    story.append(Paragraph("1. Périmètre officiel et problématique", h1_style))
    story.append(
        Paragraph(
            xml_escape(
                f"Conformément aux spécifications du projet, l'ensemble des analyses statistiques, cartographies et modèles de prévision IA "
                f"est strictement restreint à la période officielle {OFFICIAL_PERIOD_LABEL} (du 01/01/2025 au 31/12/2026), "
                f"sans utilisation de données antérieures à 2025 ni création de mois manquants."
            ),
            body_style,
        )
    )

    story.append(Paragraph("2. Couverture réelle des sources après filtrage 2025–2026", h1_style))
    wfp_a = audit["sources"]["wfp_food_prices_sen"]
    rt_a = audit["sources"]["real_time_food_prices"]
    story.append(
        make_table(
            [
                ["Source", "Volume 2025–2026", "Couverture réelle", "Mois 2026 observés", "Observation / Remarque"],
                [
                    "wfp_food_prices_sen.csv",
                    f"{fmt_num(wfp_a['rows_clean'], 0)} obs.",
                    f"{fmt_date(wfp_a['date_min'])} → {fmt_date(wfp_a['date_max'])}",
                    ", ".join(fmt_ym(m) for m in wfp_a["available_2026_months"]),
                    "47 marchés, 11 produits (FCFA/kg)",
                ],
                [
                    "real-time-food-prices-for-senegal.csv",
                    f"{fmt_num(rt_a['rows_wide_2025_2026'], 0)} lignes ({fmt_num(rt_a['observed_price_rows_excl_avg'], 0)} directs)",
                    f"{fmt_date(rt_a['date_min'])} → {fmt_date(rt_a['date_max'])}",
                    ", ".join(fmt_ym(m) for m in rt_a["available_2026_months"]),
                    "64 marchés, 6 produits ; estimations modélisées séparées",
                ],
                [
                    "BASE_BULLETIN.xlsx (7 feuilles)",
                    "0 obs. en 2025–2026",
                    "Arrêt brut en août 2022",
                    "Aucun",
                    "Données 2000–2022 strictement exclues",
                ],
            ],
            col_widths=[4.3 * cm, 3.3 * cm, 3.2 * cm, 3.3 * cm, 3.3 * cm],
        )
    )

    story.append(Paragraph("3. Synthèse exploratoire (2025–2026)", h1_style))
    k = overview["kpis"]
    if k["total_observations"] > 0:
        story.append(
            Paragraph(
                xml_escape(
                    f"Sur la sélection active ({fmt_num(k['total_observations'], 0)} observations, {k['regions_count']} régions, "
                    f"{k['markets_count']} marchés, {k['products_count']} produit(s), dernière observation le {fmt_date(k['last_observation_date'])}), "
                    f"le prix moyen s'établit à {fmt_num(k['mean_price'], 1)} {k['unit']} (médiane {fmt_num(k['median_price'], 1)}, minimum {fmt_num(k['min_price'], 1)}, maximum {fmt_num(k['max_price'], 1)})."
                ),
                body_style,
            )
        )
    else:
        story.append(Paragraph(xml_escape(overview["meta"].get("empty_reason") or "0 observation sur la période 2025–2026."), body_style))

    story.append(Paragraph("4. Étude statistique et interprétations", h1_style))
    if stats.get("summary"):
        st = stats["summary"]
        story.append(
            make_table(
                [
                    ["Observations", "Moyenne", "Médiane", "Écart-type", "Coef. de variation (%)", "Q1 (25 %)", "Q3 (75 %)", "Variation 2026/2025"],
                    [
                        fmt_num(st["count"], 0),
                        fmt_num(st["mean"], 1),
                        fmt_num(st["median"], 1),
                        fmt_num(st["std"], 1),
                        f"{fmt_num(st['cv_pct'], 1)} %",
                        fmt_num(st["q25"], 1),
                        fmt_num(st["q75"], 1),
                        f"{fmt_num(st['yoy_last_pct'], 1)} %" if st["yoy_last_pct"] is not None else "Non disponible",
                    ],
                ]
            )
        )
        story.append(Spacer(1, 6))
        for interp in stats.get("interpretations", []):
            story.append(Paragraph(f"• {xml_escape(interp)}", body_style))

    story.append(Paragraph("5. Analyse géographique régionale (2025–2026)", h1_style))
    if geo.get("regions"):
        reg_rows = [["Région", "Observations", f"Prix moyen ({overview['meta']['unit']})", "Médiane", "Minimum", "Maximum", "Écart par rapport au national (%)"]]
        for r in geo["regions"][:14]:
            reg_rows.append([r["region"], fmt_num(r["observations"], 0), fmt_num(r["mean"], 1), fmt_num(r["median"], 1), fmt_num(r["min"], 0), fmt_num(r["max"], 0), f"{fmt_num(r['gap_vs_national_pct'], 1)} %"])
        story.append(make_table(reg_rows))

    story.append(Paragraph("6. Prévisions par intelligence artificielle (calibrées uniquement depuis janvier 2025)", h1_style))
    if fc.get("eligible"):
        diag = fc["series_diagnostics"]
        story.append(
            Paragraph(
                xml_escape(
                    f"Périmètre : {fc['scope']} | Horizon : {fc['horizon_months']} mois | "
                    f"Observé 2025 : {diag['observed_months_2025']} mois (moy. {fmt_num(diag['mean_2025'], 1)} {overview['meta']['unit']}) | "
                    f"Observé 2026 : {diag['observed_months_2026']} mois ({', '.join(fmt_ym(m) for m in diag['available_2026_months'])}, moy. {fmt_num(diag['mean_2026'], 1)} {overview['meta']['unit']}). "
                    f"Dernier relevé réel : {fmt_date(diag['last_observed_date'])}."
                ),
                body_style,
            )
        )
        mc_rows = [["Modèle", "Spécification", "EAM", "REQM", "EAMP (%)", "Statut"]]
        for m in fc["model_comparison"]:
            mc_rows.append(
                [
                    m["model"] + (" (retenu)" if m["selected"] else ""),
                    str(m["specification"])[:34],
                    fmt_num(m["mae"], 2),
                    fmt_num(m["rmse"], 2),
                    f"{fmt_num(m['mape_pct'], 1)} %" if m["mape_pct"] is not None else "—",
                    "Retenu" if m["selected"] else ("Évalué" if m["status"] == "evaluated" else "Indisponible"),
                ]
            )
        story.append(make_table(mc_rows))
        story.append(Spacer(1, 6))

        fc_rows = [["Mois futur (estimé)", f"Prix prévisionnel ({overview['meta']['unit']})", "Borne basse à 95 %", "Borne haute à 95 %", "Variation par rapport à la dernière observation"]]
        for f in fc["forecast_series"]:
            fc_rows.append([fmt_ym(f["ym"]), fmt_num(f["forecast"], 1), fmt_num(f["lower_95"], 1), fmt_num(f["upper_95"], 1), f"{fmt_num(f['delta_pct_vs_last'], 1)} %"])
        story.append(make_table(fc_rows))
        story.append(Spacer(1, 6))
        for interp in fc["interpretations"]:
            story.append(Paragraph(f"• {xml_escape(interp)}", body_style))
    else:
        story.append(Paragraph(xml_escape(f"Prévision non générée : {fc.get('reason', 'Série insuffisante.')}"), body_style))

    story.append(Paragraph("7. Conclusion", h1_style))
    story.append(
        Paragraph(
            "Le filtrage strict sur janvier 2025 – décembre 2026 garantit une lecture récente, transparente et scientifiquement honnête "
            "des dynamiques de prix alimentaires au Sénégal, en distinguant explicitement les observations réelles de 2025, celles de 2026, "
            "les estimations modélisées (ouverture, haut, bas, clôture) et les prévisions futures.",
            body_style,
        )
    )

    doc.build(story)
    fname = f"rapport_foodprice_senegal_2025_2026_{SOURCE_SLUG.get(source, source)}_{export_stamp()}.pdf"
    return buf.getvalue(), fname
