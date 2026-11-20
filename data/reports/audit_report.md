# Rapport d'Audit des Données — FOODPRICE SENEGAL (Période officielle : Janvier 2025 – Décembre 2026)

Généré de façon reproductible à partir des fichiers bruts intacts dans `data/raw/`.

## Synthèse globale sur la période officielle `2025-01-01` → `2026-12-31`
- **Source 1 — `wfp_food_prices_sen.csv`** :
  - Brut complet : 50,060 lignes (`2000-01-15` → `2026-03-15`)
  - **Conservé (2025–2026)** : **4,779 observations** | Période réelle couverte : **`2025-01-15` → `2026-03-15`** (15 mois : 12 en 2025, 3 en 2026) | Score qualité : **98.5/100**
- **Source 2 — `real-time-food-prices-for-senegal.csv`** :
  - Brut complet : 15,144 lignes (`2007-01-01` → `2026-05-01`)
  - **Conservé (2025–2026)** : **1,105 lignes larges** (6,630 lignes longues dont **2,070 relevés directs** hors moyenne nationale) | Période réelle couverte : **`2025-01-01` → `2026-05-01`** (17 mois : 12 en 2025, 5 en 2026) | Score qualité : **84.0/100**
- **Source 3 — `BASE_BULLETIN.xlsx`** :
  - Brut complet : 2000–2022 (séries mensuelles 2016-01 → 2022-08)
  - **Conservé (2025–2026)** : **0 observation sur l'ensemble des 7 feuilles** (aucune donnée 2025–2026 dans le classeur source ; données antérieures à 2025 strictement exclues sans modification artificielle de dates).

---

## 1. Audit `wfp_food_prices_sen.csv` (2025–2026)
- **Observations retenues** : 4,779 (45,281 observations 2000–2024 exclues)
- **Mois présents en 2025** : 12 (`2025-01` → `2025-12`)
- **Mois présents en 2026** : 3 (`2026-01, 2026-02, 2026-03`)
- **Mois 2026 absents (jamais inventés)** : `2026-04, 2026-05, 2026-06, 2026-07, 2026-08, 2026-09, 2026-10, 2026-11, 2026-12`
- **Couverture géographique** : 14 régions, 47 marchés actifs
- **Produits (11)** : Beans (niebe), Groundnuts (shelled), Groundnuts (unshelled), Maize (imported), Maize (local), Millet, Rice (imported), Rice (local), Rice (ordinary, first quality), Sorghum, Sorghum (imported)
- **Outliers IQR (calculés sur 2025–2026)** : 161 (>1,5×IQR), 20 (>3×IQR)

## 2. Audit `real-time-food-prices-for-senegal.csv` (2025–2026)
- **Lignes larges retenues** : 1,105 (14,039 lignes 2007–2024 exclues)
- **Mois présents en 2025** : 12 (`2025-01` → `2025-12`)
- **Mois présents en 2026** : 5 (`2026-01, 2026-02, 2026-03, 2026-04, 2026-05`)
- **Mois 2026 absents (jamais inventés)** : `2026-06, 2026-07, 2026-08, 2026-09, 2026-10, 2026-11, 2026-12`
- **Couverture géographique (hors `Market Average`)** : 14 régions, 64 marchés géolocalisés
- **Colonnes vides écartées** : 812 / 879 (116 denrées à 100 % NaN)

## 3. Audit `BASE_BULLETIN.xlsx` (7 feuilles)

### Feuille `PRIX_kg_CONS_CSA`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `COURS_MAT_PREMIERE`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `PROD_HORTI`
- **Couverture brute** : `2000` → `2021/2022`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `PROD_ELEVAGE`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `DONNEES_SENELEC`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `DONNES_TRANS_AERIEN`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)

### Feuille `DONNES_TRANS_MARIT`
- **Couverture brute** : `2016-01-01` → `2022-08-01`
- **Observations 2025–2026** : `0` (disponible : `Non`)
