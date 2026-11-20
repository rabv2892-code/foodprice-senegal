"""Exports : rapport PDF, classeur Excel et fichier CSV (tout en français, cinq marchés retenus)."""
from __future__ import annotations

import datetime
import io
import re
import unicodedata
from xml.sax.saxutils import escape

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402
import openpyxl  # noqa: E402
import pandas as pd  # noqa: E402
from matplotlib.ticker import FuncFormatter  # noqa: E402
from openpyxl.styles import Alignment, Font, PatternFill  # noqa: E402
from reportlab.lib import colors  # noqa: E402
from reportlab.lib.pagesizes import A4  # noqa: E402
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet  # noqa: E402
from reportlab.lib.units import cm  # noqa: E402
from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle  # noqa: E402

from . import analysis, forecast
from .config import APP_NAME, PERIODE_LIBELLE
from .data import Donnees, serie_mensuelle
from .i18n import fmt_date, fmt_mois, fmt_nombre

BLEU_FONCE = "#0B2A55"
BLEU = "#2563EB"
BLEU_CLAIR = "#93C5FD"
GRIS = "#64748B"
COULEURS_MARCHES = ["#0B2A55", "#2563EB", "#38BDF8", "#94A3B8", "#0D9488"]


def nom_fichier(produit: str, extension: str) -> str:
    """Nom de fichier français sans accents ni caractères spéciaux."""
    s = unicodedata.normalize("NFKD", produit).encode("ascii", "ignore").decode()
    s = re.sub(r"[^a-zA-Z0-9]+", "_", s).strip("_").lower()
    return f"foodprice_senegal_{s}_{datetime.date.today().strftime('%d-%m-%Y')}.{extension}"


# ---------------------------------------------------------------- CSV
def export_csv(d: Donnees) -> bytes:
    df = d.prix.copy()
    df["date"] = df["date"].map(fmt_date)
    df["mois"] = df["mois"].map(fmt_mois)
    df = df[["date", "mois", "marche", "region", "produit", "prix"]]
    df.columns = ["Date du relevé (JJ/MM/AAAA)", "Mois", "Marché", "Région", "Produit", "Prix (FCFA/kg)"]
    texte = df.to_csv(index=False, sep=";", decimal=",", float_format="%.2f")
    return texte.encode("utf-8-sig")


# ---------------------------------------------------------------- Excel
def export_excel(d: Donnees, produit: str | None, marche: str | None) -> bytes:
    produit = analysis.verifier_produit(d, produit)
    marches = analysis.marches_retenus(d)
    comp = analysis.comparaison_marches(d, produit)
    stat = analysis.etudes_statistiques(d, produit)
    prev = forecast.previsions(d, produit, marche)

    feuilles: dict[str, pd.DataFrame] = {}
    feuilles["Marchés retenus"] = pd.DataFrame(
        [
            {
                "Rang": m["rang"],
                "Marché": m["marche"],
                "Région": m["region"],
                "Relevés de prix": m["releves"],
                "Mois couverts": m["mois"],
                "Produits couverts": m["produits"],
            }
            for m in marches["marches"]
        ]
    )
    mensuel = pd.DataFrame({m: serie_mensuelle(d, produit, m) for m in d.marches})
    mensuel["Moyenne des 5 marchés"] = serie_mensuelle(d, produit)
    mensuel.index = [fmt_mois(m) for m in mensuel.index]
    feuilles["Prix mensuels"] = mensuel.round(0).reset_index(names="Mois")
    feuilles["Comparaison des marchés"] = pd.DataFrame(
        [
            {
                "Marché": x["marche"],
                "Région": x["region"],
                "Relevés (mois)": x["releves"],
                "Dernier prix (FCFA/kg)": x.get("dernier_prix"),
                "Prix moyen (FCFA/kg)": x.get("moyenne"),
                "Minimum": x.get("minimum"),
                "Maximum": x.get("maximum"),
                "Écart à la moyenne (%)": x.get("ecart_moyenne_pct"),
                "Variabilité (%)": x.get("variabilite_pct"),
            }
            for x in comp["resume"]
        ]
    )
    feuilles["Statistiques par produit"] = pd.DataFrame(
        [
            {
                "Produit": x["produit"],
                "Nombre de relevés": x.get("n"),
                "Moyenne": x.get("moyenne"),
                "Médiane": x.get("mediane"),
                "Écart-type": x.get("ecart_type"),
                "Coefficient de variation (%)": x.get("cv_pct"),
                "Minimum": x.get("minimum"),
                "Maximum": x.get("maximum"),
            }
            for x in stat["par_produit"]
        ]
    )
    if prev.get("disponible"):
        feuilles["Prévisions"] = pd.DataFrame(
            [
                {
                    "Mois": fmt_mois(x["mois"]),
                    "Prévision (FCFA/kg)": x["prevision"],
                    "Borne basse (95 %)": x["bas"],
                    "Borne haute (95 %)": x["haut"],
                }
                for x in prev["prevision"]
            ]
        )
        feuilles["Performance du modèle"] = pd.DataFrame(
            [
                {
                    "Modèle": v["modele"],
                    "REQM (FCFA/kg)": v["reqm"],
                    "EAM (FCFA/kg)": v["eam"],
                    "EAMP (%)": v["eamp"],
                    "Modèle retenu": "Oui" if v["retenu"] else "Non",
                }
                for v in prev["validation"]
            ]
        )
    feuilles["Relevés des 5 marchés"] = pd.read_csv(io.BytesIO(export_csv(d)), sep=";", decimal=",", encoding="utf-8-sig")

    sortie = io.BytesIO()
    with pd.ExcelWriter(sortie, engine="openpyxl") as writer:
        for nom, df in feuilles.items():
            df.to_excel(writer, sheet_name=nom[:31], index=False)
        for ws in writer.book.worksheets:
            for cell in ws[1]:
                cell.font = Font(bold=True, color="FFFFFF")
                cell.fill = PatternFill("solid", fgColor="0B2A55")
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            for col in ws.columns:
                largeur = max(len(str(c.value)) if c.value is not None else 0 for c in col)
                ws.column_dimensions[col[0].column_letter].width = min(max(12, largeur + 2), 45)
            ws.freeze_panes = "A2"
    return sortie.getvalue()


# ---------------------------------------------------------------- Graphiques (PDF)
def _style_axes(ax, unite: bool = True) -> None:
    ax.grid(axis="y", color="#E2E8F0", linewidth=0.8)
    ax.spines[["top", "right"]].set_visible(False)
    ax.spines[["left", "bottom"]].set_color("#CBD5E1")
    ax.tick_params(colors=GRIS, labelsize=8)
    if unite:
        ax.yaxis.set_major_formatter(FuncFormatter(lambda v, _: fmt_nombre(v)))


def _png(fig) -> io.BytesIO:
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=170, bbox_inches="tight")
    plt.close(fig)
    buf.seek(0)
    return buf


def _graph_evolution(dash: dict) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    x = [p["libelle"] for p in dash["evolution"]]
    moy = [p["moyenne"] for p in dash["evolution"]]
    bas = [p["minimum"] for p in dash["evolution"]]
    haut = [p["maximum"] for p in dash["evolution"]]
    ax.fill_between(x, [b if b is not None else float("nan") for b in bas], [h if h is not None else float("nan") for h in haut],
                    color=BLEU_CLAIR, alpha=0.35, label="Écart entre marchés (min. – max.)")
    ax.plot(x, [m if m is not None else float("nan") for m in moy], color=BLEU_FONCE, marker="o", markersize=3.5, linewidth=2,
            label="Prix moyen des 5 marchés")
    ax.set_ylabel("FCFA/kg", color=GRIS, fontsize=8)
    ax.legend(fontsize=8, frameon=False)
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    _style_axes(ax)
    return _png(fig)


def _graph_marches(comp: dict) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    x = [p["libelle"] for p in comp["serie"]]
    for i, m in enumerate(comp["marches"]):
        ax.plot(x, [p[m] if p[m] is not None else float("nan") for p in comp["serie"]], marker="o", markersize=3,
                linewidth=1.6, color=COULEURS_MARCHES[i % 5], label=m)
    ax.set_ylabel("FCFA/kg", color=GRIS, fontsize=8)
    ax.legend(fontsize=8, frameon=False, ncol=5, loc="upper center", bbox_to_anchor=(0.5, 1.15))
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    _style_axes(ax)
    return _png(fig)


def _graph_produits(dash: dict) -> io.BytesIO:
    lignes = dash["comparaison_produits"]
    fig, ax = plt.subplots(figsize=(7.2, 3.2))
    noms = [x["produit"] for x in lignes]
    ax.bar(noms, [x["dernier_prix"] or 0 for x in lignes], color=BLEU)
    ax.set_ylabel("Dernier prix observé (FCFA/kg)", color=GRIS, fontsize=8)
    plt.setp(ax.get_xticklabels(), rotation=40, ha="right", fontsize=7)
    _style_axes(ax)
    return _png(fig)


def _graph_prevision(prev: dict) -> io.BytesIO:
    fig, ax = plt.subplots(figsize=(7.2, 3.0))
    hist = [p for p in prev["historique"] if p["prix"] is not None]
    ax.plot([p["libelle"] for p in prev["historique"]], [p["prix"] if p["prix"] is not None else float("nan") for p in prev["historique"]],
            color=BLEU_FONCE, marker="o", markersize=3.5, linewidth=2, label="Prix observés")
    xs = [p["libelle"] for p in prev["prevision"]]
    ax.fill_between(xs, [p["bas"] for p in prev["prevision"]], [p["haut"] for p in prev["prevision"]], color=BLEU_CLAIR, alpha=0.4,
                    label="Intervalle à 95 %")
    ax.plot([hist[-1]["libelle"]] + xs, [hist[-1]["prix"]] + [p["prevision"] for p in prev["prevision"]], color=BLEU, linestyle="--",
            marker="o", markersize=3.5, linewidth=2, label="Prévision")
    ax.set_ylabel("FCFA/kg", color=GRIS, fontsize=8)
    ax.legend(fontsize=8, frameon=False)
    plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    _style_axes(ax)
    return _png(fig)


# ---------------------------------------------------------------- PDF
def _tableau(donnees: list[list[str]], largeurs: list[float] | None = None) -> Table:
    t = Table(donnees, colWidths=largeurs, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor(BLEU_FONCE)),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F1F5F9")]),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 3),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ]
        )
    )
    return t


def export_pdf(d: Donnees, produit: str | None, marche: str | None) -> bytes:
    produit = analysis.verifier_produit(d, produit)
    marche = analysis.verifier_marche(d, marche)
    marches = analysis.marches_retenus(d)
    dash = analysis.tableau_de_bord(d, produit)
    comp = analysis.comparaison_marches(d, produit)
    prix = analysis.analyse_prix(d, produit, None)
    stat = analysis.etudes_statistiques(d, produit)
    prev = forecast.previsions(d, produit, marche)
    kpi = dash["indicateurs"]

    styles = getSampleStyleSheet()
    titre = ParagraphStyle("t", parent=styles["Title"], textColor=colors.HexColor(BLEU_FONCE), fontSize=20, spaceAfter=2)
    sous = ParagraphStyle("s", parent=styles["Normal"], textColor=colors.HexColor(GRIS), fontSize=10, alignment=1, spaceAfter=10)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor(BLEU_FONCE), fontSize=13, spaceBefore=12, spaceAfter=5)
    txt = ParagraphStyle("p", parent=styles["Normal"], fontSize=9, leading=12.5)
    petit = ParagraphStyle("pp", parent=txt, fontSize=8, textColor=colors.HexColor(GRIS))

    def p(texte: str, style=txt) -> Paragraph:
        return Paragraph(escape(texte), style)

    def img(buf, largeur=17 * cm) -> Image:
        im = Image(buf)
        ratio = im.imageHeight / im.imageWidth
        im.drawWidth, im.drawHeight = largeur, largeur * ratio
        return im

    el = [
        Paragraph(escape(APP_NAME), titre),
        Paragraph(escape(f"Rapport d'analyse des prix — {produit}"), sous),
        p(f"Période d'étude : {PERIODE_LIBELLE}. Données disponibles de {fmt_mois(d.mois_observes[0])} à "
          f"{fmt_mois(d.mois_observes[-1])}. Source : Programme alimentaire mondial (PAM). "
          f"Rapport généré le {datetime.date.today().strftime('%d/%m/%Y')}. Prix en FCFA/kg.", petit),
        Paragraph("1. Les cinq marchés étudiés", h2),
        p(marches["critere"]),
        Spacer(1, 4),
        _tableau(
            [["Rang", "Marché", "Région", "Relevés de prix", "Mois couverts", "Produits"]]
            + [[str(m["rang"]), m["marche"], m["region"], str(m["releves"]), str(m["mois"]), str(m["produits"])] for m in marches["marches"]]
        ),
        Paragraph("2. Indicateurs clés", h2),
        _tableau(
            [
                ["Marchés étudiés", "Produits disponibles", f"Dernier prix ({kpi['dernier_mois']})", "Variation mensuelle"],
                [
                    str(kpi["marches_etudies"]),
                    str(kpi["produits_disponibles"]),
                    f"{fmt_nombre(kpi['dernier_prix'])} FCFA/kg",
                    f"{fmt_nombre(kpi['variation_pct'], 1)} %" if kpi["variation_pct"] is not None else "—",
                ],
            ]
        ),
        Paragraph("3. Évolution des prix", h2),
        img(_graph_evolution(dash)),
        p(prix["interpretation"]),
        Paragraph("4. Comparaison des cinq marchés", h2),
        img(_graph_marches(comp)),
        _tableau(
            [["Marché", "Dernier prix", "Prix moyen", "Minimum", "Maximum", "Écart à la moyenne", "Variabilité"]]
            + [
                [x["marche"], fmt_nombre(x.get("dernier_prix")), fmt_nombre(x.get("moyenne")), fmt_nombre(x.get("minimum")),
                 fmt_nombre(x.get("maximum")), f"{fmt_nombre(x.get('ecart_moyenne_pct'), 1)} %", f"{fmt_nombre(x.get('variabilite_pct'), 1)} %"]
                for x in comp["resume"] if x.get("moyenne") is not None
            ]
        ),
        Spacer(1, 4),
        p(comp["interpretation"]),
        Paragraph("5. Comparaison des produits", h2),
        img(_graph_produits(dash)),
        Paragraph("6. Études statistiques", h2),
        _tableau(
            [["Produit", "Relevés", "Moyenne", "Médiane", "Écart-type", "CV (%)", "Min.", "Max."]]
            + [
                [x["produit"], str(x.get("n", "")), fmt_nombre(x.get("moyenne")), fmt_nombre(x.get("mediane")),
                 fmt_nombre(x.get("ecart_type")), fmt_nombre(x.get("cv_pct"), 1), fmt_nombre(x.get("minimum")), fmt_nombre(x.get("maximum"))]
                for x in stat["par_produit"]
            ]
        ),
        Spacer(1, 4),
        p(stat["interpretation"]),
        p(stat["mise_en_garde"], petit),
        Paragraph("7. Prévisions à six mois", h2),
    ]
    if prev.get("disponible"):
        el += [
            p(f"Portée : {prev['portee']}. Modèle retenu : {prev['modele']} (fiabilité {prev['fiabilite']})."),
            img(_graph_prevision(prev)),
            _tableau(
                [["Mois", "Prévision (FCFA/kg)", "Borne basse (95 %)", "Borne haute (95 %)"]]
                + [[fmt_mois(x["mois"]), fmt_nombre(x["prevision"]), fmt_nombre(x["bas"]), fmt_nombre(x["haut"])] for x in prev["prevision"]]
            ),
            Spacer(1, 6),
            _tableau(
                [["Modèle", "REQM", "EAM", "EAMP (%)", "Retenu"]]
                + [[v["modele"], fmt_nombre(v["reqm"], 1), fmt_nombre(v["eam"], 1), fmt_nombre(v["eamp"], 1), "Oui" if v["retenu"] else "Non"]
                   for v in prev["validation"]]
            ),
            Spacer(1, 4),
            p(prev["interpretation"]),
        ]
    else:
        el.append(p(prev["message"]))
    el += [
        Spacer(1, 10),
        p("Les valeurs prévisionnelles sont des estimations statistiques, jamais des observations. "
          "Les mois sans relevé ne sont pas remplacés par des valeurs inventées.", petit),
    ]

    sortie = io.BytesIO()
    SimpleDocTemplate(
        sortie, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.6 * cm, bottomMargin=1.6 * cm,
        title=f"{APP_NAME} — {produit}", author=APP_NAME,
    ).build(el)
    return sortie.getvalue()
