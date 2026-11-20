from __future__ import annotations

import json
from collections import Counter
from pathlib import Path

import numpy as np
import openpyxl
import pandas as pd

RAW_DIR = Path(r"c:\Users\HP\Desktop\Foodprice\data\raw")


def main() -> None:
    wfp = pd.read_csv(RAW_DIR / "wfp_food_prices_sen.csv", low_memory=False)
    rt = pd.read_csv(RAW_DIR / "real-time-food-prices-for-senegal.csv", low_memory=False)
    wb = openpyxl.load_workbook(RAW_DIR / "BASE_BULLETIN.xlsx", data_only=True)

    print("=== WFP SPELLING & COORDS ===")
    print("WFP markets matching Zig:", wfp[wfp["market"].str.contains("Zig", case=False)]["market"].unique().tolist())
    print("RT markets matching Zig:", rt[rt["mkt_name"].str.contains("Zig", case=False)]["mkt_name"].unique().tolist())
    mkt_geo = wfp[["market_id", "market", "admin1", "admin2", "latitude", "longitude"]].drop_duplicates()
    print("WFP unique market-coord rows:", len(mkt_geo), "vs unique market_id:", wfp["market_id"].nunique())

    # Verify RT coordinates vs WFP coordinates
    rt_geo = rt[rt["mkt_name"] != "Market Average"][["mkt_name", "adm1_name", "adm2_name", "lat", "lon", "geo_id"]].drop_duplicates()
    print("RT unique market-coord rows (excl Market Average):", len(rt_geo))

    # Check WFP outliers per commodity (3x IQR)
    print("\n=== WFP OUTLIERS (3x IQR) ===")
    for comm, grp in wfp.groupby("commodity"):
        q1, q3 = grp["price"].quantile([0.25, 0.75])
        iqr = q3 - q1
        out3 = grp[(grp["price"] < q1 - 3 * iqr) | (grp["price"] > q3 + 3 * iqr)]
        out15 = grp[(grp["price"] < q1 - 1.5 * iqr) | (grp["price"] > q3 + 1.5 * iqr)]
        print(
            f"  {comm}: n={len(grp)}, min={grp['price'].min():.2f}, q25={q1:.2f}, "
            f"med={grp['price'].median():.2f}, q75={q3:.2f}, max={grp['price'].max():.2f}, "
            f"iqr1.5={len(out15)}, iqr3.0={len(out3)}"
        )

    # Check RT observed price outliers and negative values
    print("\n=== REAL-TIME POPULATED SERIES ===")
    for comm in ["maize", "millet", "millet_fao", "rice", "sorghum", "sorghum_fao"]:
        s = rt[comm].dropna()
        c_s = rt[f"c_{comm}"].dropna()
        print(
            f"  {comm}: obs_n={len(s)} ({len(s)/len(rt)*100:.1f}%), obs_min={s.min():.2f}, obs_max={s.max():.2f}, "
            f"c_n={len(c_s)}, c_min={c_s.min():.2f}, c_max={c_s.max():.2f}"
        )

    # Check RT Market Average vs non-MA last dates & data_coverage
    print("\n=== REAL-TIME COVERAGE BY MARKET ===")
    non_ma = rt[rt["mkt_name"] != "Market Average"]
    print("Markets per year count:", non_ma.groupby("year")["mkt_name"].nunique().to_dict())
    print("Last survey point values:", non_ma["last_survey_point"].value_counts().head(10).to_dict())
    print("Start dense data values:", non_ma["start_dense_data"].value_counts().head(10).to_dict())

    # Check PROD_ELEVAGE Poids_total vs sum of *_Pds
    ws_el = wb["PROD_ELEVAGE"]
    rows_el = list(ws_el.iter_rows(values_only=True))
    pds_rows = [r for r in rows_el[1:] if str(r[0]).endswith("_Pds")]
    tot_row = [r for r in rows_el[1:] if r[0] == "Poids_total"][0]
    diffs = [abs(sum((r[c] or 0) for r in pds_rows) - (tot_row[c] or 0)) for c in range(1, len(tot_row))]
    print("\nPROD_ELEVAGE max abs diff sum(*_Pds) vs Poids_total:", round(max(diffs), 6))

    # Check PROD_HORTI subtotal vs sum of crops
    ws_h = wb["PROD_HORTI"]
    rows_h = list(ws_h.iter_rows(values_only=True))
    veg_rows = rows_h[1:13]
    sub_veg = rows_h[13]
    fruit_rows = rows_h[14:18]
    sub_fruit = rows_h[18]
    tot_h = rows_h[19]
    veg_diffs = [abs(sum((r[c] or 0) for r in veg_rows) - (sub_veg[c] or 0)) for c in range(1, len(sub_veg))]
    fruit_diffs = [abs(sum((r[c] or 0) for r in fruit_rows) - (sub_fruit[c] or 0)) for c in range(1, len(sub_fruit))]
    tot_diffs = [abs((sub_veg[c] or 0) + (sub_fruit[c] or 0) - (tot_h[c] or 0)) for c in range(1, len(tot_h))]
    print("PROD_HORTI max diff veg:", [round(x, 2) for x in veg_diffs])
    print("PROD_HORTI max diff fruit:", [round(x, 2) for x in fruit_diffs])
    print("PROD_HORTI max diff total:", [round(x, 2) for x in tot_diffs])

    # Check WFP vs PRIX_kg_CONS_CSA compatibility on Dakar Millet, Rice imported, Maize local
    ws_csa = wb["PRIX_kg_CONS_CSA"]
    rows_csa = list(ws_csa.iter_rows(values_only=True))
    hdr_csa = rows_csa[0]
    wfp["ym"] = wfp["date"].str[:7]
    for csa_prod, wfp_comm in [("MIL_DETAIL", "Millet"), ("RIZ_IMP_BR ORD", "Rice (imported)"), ("MAÏS_DETAIL", "Maize (local)")]:
        match_rows = [r for r in rows_csa[1:] if r[0] == "DAKAR" and r[1] == csa_prod]
        if match_rows:
            r = match_rows[0]
            csa_s = pd.Series({hdr_csa[i].strftime("%Y-%m"): float(r[i]) for i in range(2, len(hdr_csa)) if isinstance(r[i], (int, float))})
            wfp_s = wfp[(wfp["admin1"] == "Dakar") & (wfp["commodity"] == wfp_comm)].groupby("ym")["price"].mean()
            common = csa_s.index.intersection(wfp_s.index)
            print(
                f"Compat Dakar {csa_prod} vs WFP {wfp_comm}: n_common={len(common)}, "
                f"corr={csa_s[common].corr(wfp_s[common]):.4f}, mad={(csa_s[common] - wfp_s[common]).abs().mean():.2f}"
            )


if __name__ == "__main__":
    main()
