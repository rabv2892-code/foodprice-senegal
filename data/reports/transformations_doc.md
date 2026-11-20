# Documentation des Transformations & Filtrage Temporel — FOODPRICE SENEGAL

## Période officielle du projet : Janvier 2025 – Décembre 2026 (`2025-01-01` → `2026-12-31`)

1. **Intégrité des fichiers bruts (`data/raw/`)** : aucune ligne ni date brute n'a été modifiée ou supprimée dans `data/raw/`.
2. **Filtrage analytique reproductible 2025–2026** :
   - `wfp_prices_clean.csv` et `rt_prices_long.csv` ne conservent que les enregistrements dont la date réelle est comprise entre `2025-01-01` et `2026-12-31` inclus.
   - Les 7 feuilles de `BASE_BULLETIN.xlsx` s'arrêtant en 2022 (`2022-08` / `2021/2022`), leurs tables normalisées dans `data/processed/` contiennent exactement 0 ligne pour la période 2025–2026 afin de ne jamais afficher ni réutiliser des valeurs antérieures à janvier 2025.
3. **Recalcul des indicateurs et drapeaux statistiques** :
   - Les bornes d'anomalies IQR (`1,5×IQR` et `3×IQR`) ont été recalculées uniquement sur la distribution 2025–2026.
   - Les mois de 2026 absents des sources (`2026-04..2026-12` pour WFP, `2026-06..2026-12` pour Real-Time) restent absents et ne sont jamais interpolés comme observations réelles.

## Tables générées dans `data/processed/`
- **`wfp_prices_clean.csv`** : 4,779 lignes × 24 colonnes — Prix observés WFP strictement filtrés sur 2025-01-01 → 2026-12-31 (XOF/KG, Retail, actual).
- **`markets_geo.csv`** : 47 lignes × 8 colonnes — Référentiel des marchés actifs WFP en 2025–2026 avec coordonnées GPS réelles.
- **`rt_prices_long.csv`** : 6,630 lignes × 33 colonnes — Série longue Real-Time Food Prices filtrée 2025–2026 distinguant observed_price et OHLC.
- **`rt_national_index.csv`** : 1,105 lignes × 22 colonnes — Indice composite Food Price Index Real-Time filtré 2025–2026.
- **`csa_prices_long.csv`** : 0 lignes × 16 colonnes — Feuille PRIX_kg_CONS_CSA filtrée 2025–2026 (0 ligne : arrêt source août 2022).
- **`commodity_markets_long.csv`** : 0 lignes × 9 colonnes — Feuille COURS_MAT_PREMIERE filtrée 2025–2026 (0 ligne : arrêt source août 2022).
- **`prod_horti_long.csv`** : 0 lignes × 8 colonnes — Feuille PROD_HORTI filtrée 2025–2026 (0 ligne : arrêt source 2021/2022).
- **`prod_elevage_long.csv`** : 0 lignes × 10 colonnes — Feuille PROD_ELEVAGE filtrée 2025–2026 (0 ligne : arrêt source août 2022).
- **`senelec_long.csv`** : 0 lignes × 9 colonnes — Feuille DONNEES_SENELEC filtrée 2025–2026 (0 ligne : arrêt source août 2022).
- **`trans_aerien_long.csv`** : 0 lignes × 11 colonnes — Feuille DONNES_TRANS_AERIEN filtrée 2025–2026 (0 ligne : arrêt source août 2022).
- **`trans_marit_long.csv`** : 0 lignes × 12 colonnes — Feuille DONNES_TRANS_MARIT filtrée 2025–2026 (0 ligne : arrêt source août 2022).
