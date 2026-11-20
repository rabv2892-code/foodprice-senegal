# FOODPRICE SENEGAL — Compte rendu détaillé du travail réalisé

Ce document retrace, dans l'ordre, l'ensemble du travail effectué sur le projet **FOODPRICE SENEGAL** :
la construction initiale, la restriction à la période 2025–2026, la refonte du tableau de bord, la
francisation complète, puis la **simplification en projet universitaire limité à cinq marchés** (état actuel).

---

## Sommaire

1. [Vue d'ensemble et état actuel](#1-vue-densemble-et-état-actuel)
2. [Chronologie des demandes](#2-chronologie-des-demandes)
3. [Phase 1 — Construction initiale de la plateforme](#3-phase-1--construction-initiale-de-la-plateforme)
4. [Phase 2 — Restriction à la période officielle 2025–2026](#4-phase-2--restriction-à-la-période-officielle-20252026)
5. [Phase 3 — Refonte « Executive Dashboard »](#5-phase-3--refonte--executive-dashboard-)
6. [Phase 4 — Interface 100 % française](#6-phase-4--interface-100--française)
7. [Phase 5 — Version projet universitaire (cinq marchés)](#7-phase-5--version-projet-universitaire-cinq-marchés)
8. [Les données](#8-les-données)
9. [Sélection des cinq marchés](#9-sélection-des-cinq-marchés)
10. [Backend : architecture et fonctionnement](#10-backend--architecture-et-fonctionnement)
11. [Module de prévision](#11-module-de-prévision)
12. [Études statistiques](#12-études-statistiques)
13. [Exports : PDF, Excel, CSV](#13-exports--pdf-excel-csv)
14. [Frontend : architecture et pages](#14-frontend--architecture-et-pages)
15. [Tests et vérifications](#15-tests-et-vérifications)
16. [Problèmes rencontrés et corrections](#16-problèmes-rencontrés-et-corrections)
17. [Limites connues et choix assumés](#17-limites-connues-et-choix-assumés)
18. [Comment lancer, tester et reconstruire](#18-comment-lancer-tester-et-reconstruire)
19. [Arborescence finale](#19-arborescence-finale)
20. [Déploiement sur Render](#20-déploiement-sur-render)

---

## 1. Vue d'ensemble et état actuel

| Élément | Valeur |
|---|---|
| Nom | FOODPRICE SENEGAL |
| Objet | Suivi et prévision des prix alimentaires au Sénégal |
| Période d'étude | janvier 2025 – décembre 2026 |
| Période réellement couverte par les données | janvier 2025 – mars 2026 (15 mois) |
| Source utilisée dans les analyses | Prix du Programme alimentaire mondial (PAM / WFP) |
| Marchés étudiés | **5** : Ourossogui, Thiès, Thiodaye, Kouthiaba, Mereto |
| Produits | 11 (céréales, légumineuses et noix) |
| Unité | FCFA/kg |
| Langue | 100 % français |
| Version | 3.0.0 |
| Backend | Python 3.13, FastAPI, pandas, statsmodels, scipy, reportlab, openpyxl, matplotlib |
| Frontend | React 18, TypeScript, Tailwind CSS, Recharts, react-router, Vitest |
| Adresse en local | http://127.0.0.1:8000 (l'API et l'interface sont servies par le même serveur) |

Résultat visé par la dernière demande : un logiciel qui ressemble à **un bon projet universitaire réalisé par
un étudiant en Data** — architecture claire, analyses pertinentes, interface simple — et non à une plateforme
commerciale complexe.

---

## 2. Chronologie des demandes

| N° | Demande de l'utilisateur | Résultat |
|---|---|---|
| 1 | Restreindre toute la plateforme à la période **01/01/2025 – 31/12/2026**, ne jamais inventer de mois, ne rien supprimer des fichiers bruts | Filtrage reproductible, couverture réelle affichée par source |
| 2 | Refonte « Executive Intelligence Dashboard » bleu nuit | Page d'accueil premium (4 KPI, graphique principal, donut, comparaison 2025/2026, classement, carte) |
| 3 | Interface **100 % française** | Traduction complète de l'interface, des API, des exports et des rapports |
| 4 | **Version projet universitaire** : simplifier, limiter à **5 marchés**, 6 pages, 4 KPI, 4 graphiques | Réécriture complète, état actuel |

---

## 3. Phase 1 — Construction initiale de la plateforme

Le projet est parti de **trois sources de données originales** (conservées intactes dans `data/raw/`) :

| Fichier | Contenu |
|---|---|
| `wfp_food_prices_sen.csv` | Prix alimentaires PAM par marché, produit et mois |
| `real-time-food-prices-for-senegal.csv` | Prix « temps réel » de la Banque mondiale (≈ 879 colonnes) : prix observés et estimations modélisées (ouverture / haut / bas / clôture) |
| `BASE_BULLETIN.xlsx` | Bulletin statistique à 7 feuilles (prix CSA, matières premières, horticulture, élevage, SENELEC, transport aérien, transport maritime) |

Travail réalisé à cette étape :

- **Inspection** des trois sources (`scripts/inspect_sources.py`).
- **Audit et préparation reproductibles** (`scripts/audit_and_prepare.py`) qui produit :
  - les tables nettoyées dans `data/processed/` ;
  - un rapport d'audit (`data/reports/audit_report.json` et `audit_report.md`) ;
  - la documentation des transformations (`data/reports/transformations_doc.md`).
- **Backend FastAPI modulaire** (analyses, statistiques, prévisions, bulletin, exports) avec tests.
- **Frontend React + TypeScript + Tailwind** d'environ quinze pages.
- Intégration : tableau de bord, géographie, statistiques, prévisions IA, export Excel, guide, rapports.

> Cette version complète existe toujours, archivée dans `archive_version_complete/` (voir §19).

---

## 4. Phase 2 — Restriction à la période officielle 2025–2026

Règles appliquées :

- Seules les données comprises entre le `2025-01-01` et le `2026-12-31` sont utilisées.
- **Aucune** année antérieure à 2025 n'est affichée.
- **Aucun** mois n'est inventé ni interpolé comme une observation.
- Les fichiers bruts ne sont ni modifiés ni supprimés ; le filtrage est appliqué dans les tables traitées.

Résultats concrets (documentés dans `data/reports/transformations_doc.md`) :

- `wfp_prices_clean.csv` : **4 779 lignes**, du 15/01/2025 au 15/03/2026.
- `rt_prices_long.csv` : 6 630 lignes (période 2025–2026).
- Les 7 feuilles de `BASE_BULLETIN.xlsx` s'arrêtent en 2022 : leurs tables normalisées contiennent **0 ligne** sur
  2025–2026, pour ne jamais réutiliser de valeurs antérieures.
- Les seuils d'anomalies (1,5 × EIQ et 3 × EIQ) ont été recalculés uniquement sur la période 2025–2026.
- La couverture réelle de chaque source est affichée (et non la période demandée).

---

## 5. Phase 3 — Refonte « Executive Dashboard »

Une page d'accueil de type tableau de bord décisionnel bleu nuit avait été réalisée : quatre indicateurs
principaux, graphique prix/prévisions, répartition des produits (donut), comparaison mensuelle 2025/2026,
classement des produits, comparaison régionale avec carte du Sénégal, filtres globaux. Aucune donnée fictive.

Cette interface a été **remplacée** par la version simple de la phase 5 (elle reste dans l'archive).

---

## 6. Phase 4 — Interface 100 % française

Exigence : tout le logiciel exclusivement en français (menus, graphiques, tableaux, messages, infobulles,
états de chargement, erreurs, PDF, Excel), sans version anglaise.

Ce qui a été fait :

- **Traduction des produits** (affichage uniquement, fichiers bruts inchangés) :

  | Libellé d'origine | Affiché |
  |---|---|
  | Millet | Mil |
  | Beans (niebe) | Niébé |
  | Maize (local / imported) | Maïs (local / importé) |
  | Rice (local / imported / ordinary, first quality) | Riz (local / importé / ordinaire, première qualité) |
  | Sorghum / Sorghum (imported) | Sorgho / Sorgho (importé) |
  | Groundnuts (shelled / unshelled) | Arachides (décortiquées / en coque) |

- **Formats français** : dates `JJ/MM/AAAA`, mois en toutes lettres, espace comme séparateur de milliers, virgule
  décimale, prix en **FCFA/kg** (la devise `XOF` des fichiers est affichée en FCFA).
- **Vocabulaire statistique français** : REQM, EAM, EAMP, EIQ, glissement annuel, coefficient d'asymétrie,
  validation rétrospective, etc. Les noms de modèles (Holt-Winters, ARIMA…) sont des noms propres et sont conservés.
- **Exports** : en-têtes, noms de fichiers, feuilles Excel et PDF en français.
- **Vérifications** : balayage automatisé de toutes les pages avec toutes les sources (recherche de mots
  anglais, dates ISO `2025-03`, décimales avec point) — aucun reste constaté.
- Corrections de dernière minute : en-têtes du CSV du bulletin traduits, libellé « Toutes / Tous » au lieu de « ALL »
  dans le PDF.

Les identifiants techniques de l'API et les noms de colonnes des fichiers bruts ont volontairement été conservés
(ils sont nécessaires au code et ne doivent pas être traduits dans les données d'origine).

---

## 7. Phase 5 — Version projet universitaire (cinq marchés)

### 7.1 Demande

Simplifier entièrement le projet : design simple et élégant (bleu foncé, blanc, bleu clair, gris léger), **5 marchés**
sélectionnés sur la couverture des données, période 2025–2026, tableau de bord à **4 indicateurs et 4 graphiques**,
**6 pages**, module de prévision simple (Holt-Winters ou ARIMA), tout en français, code propre, pas de données
fictives, trois sources originales conservées.

### 7.2 Décisions prises

| Sujet | Décision | Raison |
|---|---|---|
| Ancien code | Déplacé dans `archive_version_complete/` (pas supprimé) | Pas de dépôt git : éviter toute perte |
| Source des analyses | **PAM uniquement** | Seule source fournissant des prix observés par marché, produit et mois sur 2025–2026 |
| Autres sources | Conservées dans `data/raw/`, expliquées dans le guide | Exigence : ne pas supprimer les trois sources |
| Architecture | Backend réduit à 7 modules, frontend à 6 pages | « Éviter les architectures inutilement complexes » |
| Design | Barre latérale bleu foncé, contenu clair, cartes sobres, aucune animation | Demande « simple, moderne, élégant » |
| Courbes | Segments droits (`linear`), mois sans relevé = trou dans la courbe | Ne pas lisser ni inventer de valeurs |
| Carte du Sénégal | Supprimée | Carte inutile pour 5 marchés |

### 7.3 Ce qui a été supprimé du parcours principal

Plus de pages : Explorateur de données, Géographie, Analyse temporelle, Produits, Matières premières, Production,
Énergie et transport, Qualité des données, Rapports, Paramètres, ancien tableau de bord exécutif. Plus de
sélecteur de source, de région ou de plage de dates : ces filtres n'ont pas de sens avec un périmètre figé de cinq marchés.
Les exports restent disponibles sous forme de boutons.

---

## 8. Les données

### 8.1 Fichier utilisé

`data/processed/wfp_prices_clean.csv`, issu de `data/raw/wfp_food_prices_sen.csv` :

- 4 779 relevés sur la période 2025–2026 (du 15/01/2025 au 15/03/2026) ;
- 47 marchés, 11 produits, 15 mois ;
- uniquement des prix de détail, en XOF (FCFA), à l'unité kg.

### 8.2 Traitement au chargement (`backend/app/data.py`)

1. Lecture du fichier nettoyé.
2. Filtrage sur la période (`2025-01-01` → `2026-12-31`) et suppression des prix vides ou non positifs.
3. Traduction des noms de produits et correction de l'orthographe du marché « Thies » en « Thiès ».
4. Classement de tous les marchés (voir §9).
5. Conservation des 5 premiers marchés.
6. Un seul prix par marché, mois et produit (moyenne en cas de doublon — aucun doublon n'existe dans les 5 marchés retenus).
7. Mise en cache en mémoire (`lru_cache`).

### 8.3 Règle d'or : aucune donnée inventée

- Un mois sans relevé reste **vide** (`null`) dans l'API et dans les graphiques.
- Les prévisions sont étiquetées comme estimations et ne sont jamais présentées comme des observations.
- Seule exception technique, documentée à l'écran : l'**interpolation linéaire** des rares mois manquants
  *uniquement* pour ajuster le modèle de prévision (ces mois ne sont jamais affichés comme des observations).

---

## 9. Sélection des cinq marchés

### 9.1 Critère

Les marchés sont classés par :

1. **nombre de relevés de prix** (critère principal, demandé par l'utilisateur) ;
2. à égalité : nombre de mois couverts ;
3. puis : nombre de produits couverts ;
4. puis : ordre alphabétique (pour un résultat stable).

La sélection est **calculée par le code à chaque chargement** (pas de liste écrite à la main) ; le test automatique
vérifie qu'aucun marché écarté n'a plus de relevés qu'un marché retenu.

### 9.2 Résultat

| Rang | Marché | Région | Relevés | Mois couverts | Produits |
|---|---|---|---|---|---|
| 1 | Ourossogui | Matam | 155 | 15 | 11 |
| 2 | Thiès | Thiès | 150 | 15 | 11 |
| 3 | Thiodaye | Matam | 143 | 15 | 11 |
| 4 | Kouthiaba | Tambacounda | 140 | 15 | 11 |
| 5 | Mereto | Tambacounda | 137 | 15 | 11 |

Total : **725 relevés** sur les 4 779 disponibles. Les cinq marchés couvrent les 15 mois et les 11 produits.
Le 6ᵉ marché (Touba Toul) compte 136 relevés pour 10 produits.

### 9.3 Cohérence

Ces cinq mêmes marchés alimentent : le tableau de bord, l'analyse des prix, la comparaison des marchés, les études
statistiques, les prévisions, le PDF, l'Excel et le CSV. Les autres marchés n'apparaissent nulle part dans les
analyses (un test automatique le vérifie). Une section « Les cinq marchés étudiés » justifie le choix par le nombre
de relevés ; elle est visible sur le tableau de bord, sur la page de comparaison et dans le guide.

---

## 10. Backend : architecture et fonctionnement

```
backend/
├── requirements.txt
├── app/
│   ├── config.py      Paramètres (période, nombre de marchés, horizon, validation)
│   ├── i18n.py        Libellés français et formats (dates, nombres, FCFA)
│   ├── data.py        Chargement PAM, classement et sélection des 5 marchés
│   ├── analysis.py    Tableau de bord, prix, comparaison des marchés, statistiques
│   ├── forecast.py    Prévision à 6 mois (Holt-Winters / ARIMA / modèle naïf)
│   ├── reports.py     Exports PDF, Excel, CSV
│   ├── routes.py      Points d'accès de l'API
│   └── main.py        Application FastAPI + service de l'interface compilée
└── tests/
    └── test_api.py    12 tests
```

### 10.1 Paramètres (`config.py`)

| Paramètre | Valeur |
|---|---|
| `PERIODE_DEBUT` / `PERIODE_FIN` | `2025-01-01` / `2026-12-31` |
| `NOMBRE_MARCHES` | 5 |
| `HORIZON_PREVISION` | 6 mois |
| `MOIS_VALIDATION` | 3 mois |

### 10.2 Points d'accès de l'API

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/health` | Vérification de disponibilité (utilisée par Render) : état, marchés, nombre de produits et de mois |
| GET | `/api/options` | Produits, marché, premier et dernier mois, unité |
| GET | `/api/marches` | Les 5 marchés, critère de sélection, totaux de relevés |
| GET | `/api/tableau-de-bord?produit=` | 4 indicateurs + données des 3 premiers graphiques |
| GET | `/api/analyse-prix?produit=&marche=` | Série mensuelle, résumé, tableau, produits, interprétation |
| GET | `/api/comparaison-marches?produit=` | Séries par marché, tableau comparatif, écart mensuel |
| GET | `/api/etudes-statistiques?produit=` | Statistiques, tests, volatilité, corrélations |
| GET | `/api/previsions?produit=&marche=` | Historique, prévision, validation, interprétation |
| GET | `/api/export/pdf` · `/excel` · `/csv` | Téléchargements |

Un produit ou un marché inconnu est ignoré (retour au produit par défaut ou à la moyenne des 5 marchés).
Le produit par défaut est le plus souvent relevé dans les 5 marchés (**Mil**).

### 10.3 Tableau de bord (`analysis.tableau_de_bord`)

Quatre indicateurs :

1. **Marchés étudiés** : 5.
2. **Produits disponibles** : 11.
3. **Dernier prix observé** : moyenne des 5 marchés pour le dernier mois relevé (ex. Mil : 268 FCFA/kg en mars 2026).
4. **Variation du prix** : variation par rapport à l'observation précédente (ex. −0,9 % vs février 2026), avec le
   glissement annuel en information complémentaire (ex. −10,8 % sur un an) lorsque le même mois existe l'année précédente.

Quatre graphiques :

1. **Évolution des prix dans le temps** : prix moyen des 5 marchés + zone minimum–maximum entre marchés.
2. **Comparaison des prix entre les cinq marchés** : une courbe par marché.
3. **Comparaison des prix entre les produits** : barres horizontales (dernier prix observé et moyenne de la période).
4. **Prévisions des prix sur six mois** : historique, prévision et intervalle de confiance à 95 %.

---

## 11. Module de prévision

### 11.1 Principe

Fichier : `backend/app/forecast.py`. Choix volontairement simples et défendables :

1. **Série** : prix mensuel du produit, soit la moyenne des 5 marchés, soit un marché au choix.
2. **Mois manquants** : interpolation linéaire, uniquement pour l'ajustement du modèle ; la liste des mois concernés
   est affichée à l'utilisateur.
3. **Condition minimale** : au moins **10 mois observés** ; sinon aucune prévision n'est affichée et un message
   explicite le dit (ex. Riz local à Mereto : 5 mois seulement).
4. **Validation rétrospective** : chaque modèle est entraîné sans les **3 derniers mois**, puis comparé aux vrais prix.
5. **Choix du modèle** : celui (Holt-Winters ou ARIMA) qui a la plus petite **REQM** sur ces 3 mois.
6. **Prévision finale** : le modèle retenu est ré-entraîné sur toute la série et prévoit les **6 mois suivants**
   (avril à septembre 2026 avec les données actuelles).

### 11.2 Modèles

| Modèle | Détail |
|---|---|
| **Holt-Winters** | Lissage exponentiel à **tendance amortie, sans saisonnalité** (la version saisonnière n'est utilisée qu'à partir de 24 mois, jamais atteint ici) |
| **ARIMA** | Petit ordre choisi par le critère d'Akaike parmi (1,1,0), (0,1,1), (1,1,1), (1,0,0) |
| **Modèle naïf** | Dernier prix répété : sert de **référence**, jamais retenu comme prévision |

Pourquoi pas de modèle complexe : 15 points mensuels ne permettent ni de saisonnalité annuelle, ni d'entraîner
Prophet/SARIMA correctement. Un avertissement est ajouté à l'écran lorsque le modèle naïf aurait été meilleur.

### 11.3 Métriques affichées

- **REQM** : racine de l'erreur quadratique moyenne (FCFA/kg).
- **EAM** : erreur absolue moyenne (FCFA/kg).
- **EAMP** : erreur absolue moyenne en pourcentage.
- **Fiabilité** déduite de l'EAMP : < 10 % bonne ; 10–20 % acceptable ; ≥ 20 % faible.

### 11.4 Intervalles et interprétation

- Intervalle à **95 %** : issu du modèle ARIMA, ou des résidus (élargis avec l'horizon) pour Holt-Winters ; borne basse ≥ 0.
- Un texte d'**interprétation** est généré en français : modèle retenu, erreur de validation, prix attendu à six mois,
  intervalle, limites (nombre de mois observés, absence de saisonnalité, mois interpolés).

### 11.5 Résultats de contrôle (moyenne des 5 marchés)

| Produit | Modèle retenu | EAMP de validation | Fiabilité |
|---|---|---|---|
| Arachides (décortiquées) | Holt-Winters | 8,3 % | bonne |
| Arachides (en coque) | ARIMA(1,1,0) | 27,8 % | faible |
| Maïs (importé) | Holt-Winters | 4,8 % | bonne |
| Maïs (local) | ARIMA(0,1,1) | 7,9 % | bonne |
| Mil | ARIMA(1,1,0) | 9,2 % | bonne |
| Niébé | ARIMA(0,1,1) | 2,4 % | bonne |
| Riz (importé) | Holt-Winters | 12,5 % | acceptable |
| Riz (local) | Holt-Winters | 6,0 % | bonne |
| Riz (ordinaire, première qualité) | ARIMA(0,1,1) | 3,3 % | bonne |
| Sorgho | Holt-Winters | 25,7 % | faible |
| Sorgho (importé) | Holt-Winters | 19,0 % | acceptable |

(Pour Sorgho, le modèle naïf obtient une erreur plus faible : l'avertissement correspondant est affiché.)

---

## 12. Études statistiques

Page « Études statistiques » (`analysis.etudes_statistiques`) :

- **Statistiques descriptives** par produit (5 marchés réunis) et par marché pour le produit choisi : effectif, moyenne,
  médiane, écart-type, coefficient de variation, minimum, maximum, asymétrie.
- **Test de Kruskal-Wallis** : les niveaux de prix diffèrent-ils d'un marché à l'autre ? (statistique H, valeur p, conclusion au seuil de 5 %).
- **Test de tendance** (corrélation de rang de Spearman entre le prix moyen et le temps).
- **Volatilité** : écart-type des variations mensuelles, plus forte hausse et plus forte baisse (avec le mois).
- **Matrice de corrélation entre les marchés** et **entre les produits** (Pearson sur les mois communs, au moins 8 mois ; « — » si insuffisant).
- **Interprétation** en français et **mise en garde** : séries de 15 mois au plus, résultats indicatifs.

Exemple (Mil) : Ourossogui est le marché le plus stable (CV 5,4 %), Thiès le plus variable (16,0 %) ; les prix diffèrent
significativement entre marchés (p < 0,0001) ; pas de tendance monotone significative (ρ = −0,23, p = 0,41).

---

## 13. Exports : PDF, Excel, CSV

Tous les noms de fichiers sont en français, sans accents, avec la date du jour :
`foodprice_senegal_<produit>_<JJ-MM-AAAA>.<extension>`.

### 13.1 Rapport PDF (`reports.export_pdf`)

Environ 4 pages, graphiques générés avec matplotlib, couleurs du projet :

1. Les cinq marchés étudiés (critère + tableau).
2. Indicateurs clés.
3. Évolution des prix + interprétation.
4. Comparaison des cinq marchés (graphique, tableau, interprétation).
5. Comparaison des produits (graphique).
6. Études statistiques (tableau + interprétation + mise en garde).
7. Prévisions à six mois (graphique, tableau, métriques, interprétation).

### 13.2 Classeur Excel (`reports.export_excel`)

Feuilles : *Marchés retenus*, *Prix mensuels*, *Comparaison des marchés*, *Statistiques par produit*, *Prévisions*,
*Performance du modèle*, *Relevés des 5 marchés*. En-têtes bleu foncé, colonnes ajustées, ligne d'en-tête figée.

### 13.3 CSV (`reports.export_csv`)

Les 725 relevés des cinq marchés, séparateur `;`, virgule décimale, encodage UTF-8 avec BOM (ouverture directe dans Excel),
colonnes : Date du relevé (JJ/MM/AAAA), Mois, Marché, Région, Produit, Prix (FCFA/kg).

---

## 14. Frontend : architecture et pages

```
frontend/src/
├── main.tsx, App.tsx, index.css
├── api/client.ts              Appels API + types des réponses
├── context/SelectionContext   Produit sélectionné, partagé entre les pages
├── lib/format.ts, hooks.ts    Formats français ; chargement avec état de chargement/erreur
├── components/
│   ├── Layout.tsx             Barre latérale (6 rubriques), menu mobile
│   ├── ui.tsx                 Cartes, indicateurs, sélecteurs, tableaux, états, exports
│   ├── graphiques.tsx         Graphiques Recharts (courbes, zone, barres)
│   └── MarchesRetenus.tsx     Section « Les cinq marchés étudiés »
├── pages/
│   ├── DashboardPage.tsx
│   ├── AnalysePrixPage.tsx
│   ├── ComparaisonMarchesPage.tsx
│   ├── EtudesStatistiquesPage.tsx
│   ├── PrevisionsPage.tsx
│   └── GuidePage.tsx
└── tests/                     5 tests Vitest
```

### 14.1 Design

- Palette : **bleu foncé** `#0B2A55` (barre latérale, titres, en-têtes de tableaux), **bleu clair** `#93C5FD` / `#E1EDFC`
  (zones, encadrés d'interprétation), **gris léger** `#F5F7FA` (fond), **blanc** (cartes).
- Aucune animation, aucun effet visuel ; polices système (pas de chargement de polices externes).
- Responsive : barre latérale sur ordinateur, menu repliable sur téléphone.
- Les couleurs des cinq marchés (bleu foncé, bleu, bleu ciel, gris, vert d'eau) restent distinguables.

### 14.2 Les six rubriques

| Menu | Contenu |
|---|---|
| **Tableau de bord** | 4 indicateurs, 4 graphiques, note de lecture, section des 5 marchés, boutons PDF / Excel / CSV |
| **Analyse des prix** | Choix du produit et du marché (ou moyenne) ; dernier prix, moyenne, minimum, maximum ; courbe avec moyenne mobile 3 mois ; interprétation ; tableau mensuel ; tous les produits |
| **Comparaison des marchés** | Courbes des 5 marchés ; prix moyen par marché ; écart mensuel plus cher / moins cher ; tableau comparatif (écart à la moyenne, variabilité) ; section des 5 marchés |
| **Études statistiques** | Voir §12 |
| **Prévisions IA** | Modèle retenu, fiabilité, dernier prix, prix à six mois ; graphique historique + prévision + intervalle ; interprétation ; tableau des prévisions ; métriques de performance ; explications REQM / EAM / EAMP |
| **Guide d'utilisation** | Objectif, données (et pourquoi une seule source), 5 marchés, description des pages, fonctionnement de la prévision, limites, lexique |

### 14.3 Comportements importants

- Mois sans relevé : trou dans la courbe (pas de ligne tracée à travers), liste des mois concernés sous le graphique.
- Si le serveur est injoignable : message clair en français (« Impossible de joindre le serveur… »).
- Prévision indisponible : message explicatif et conseil (changer de produit ou de marché).
- Valeur p très petite affichée « < 0,0001 ».
- Nombres : `1 234,5` ; prix : `268 FCFA/kg` ; pourcentages : `−0,9 %` / `+3,0 %`.

---

## 15. Tests et vérifications

### 15.1 Tests backend (`pytest`, 12 tests)

- exactement **5 marchés**, et chaque marché retenu a au moins autant de relevés que n'importe quel marché écarté ;
- données uniquement entre janvier 2025 et décembre 2026 ;
- l'endpoint `/api/marches` justifie la sélection par les relevés ;
- tableau de bord : 5 marchés, 11 produits, quatre graphiques, aucun mois hors période ;
- les analyses, comparaisons, statistiques et prévisions n'utilisent que les 5 mêmes marchés (le premier marché écarté n'apparaît jamais) ;
- marché inconnu ignoré ;
- prévision à 6 mois : d'avril à septembre 2026, 3 modèles évalués, bornes cohérentes ;
- série trop courte : pas de prévision, message explicite ;
- exports : PDF valide (texte français et marchés), Excel (feuille « Marchés retenus » à 5 lignes), CSV (1 ligne par relevé).

### 15.2 Tests frontend (`vitest`, 5 tests)

- le menu contient exactement les six rubriques, en français ;
- le tableau de bord affiche les quatre indicateurs et les quatre graphiques ;
- les cinq marchés sont présentés avec leurs noms réels ;
- message d'erreur clair lorsque le serveur est injoignable ;
- formats français (virgule décimale, espaces, FCFA, pourcentages).

### 15.3 Vérifications dans le navigateur

- Les six pages ont été ouvertes et contrôlées visuellement (captures d'écran).
- Un balayage automatique des six pages n'a trouvé aucun mot anglais, aucune date ISO, aucune décimale avec point,
  aucun « NaN/undefined », et **aucun des marchés non retenus**.
- Vérification de l'affichage sur une largeur de téléphone.
- Vérification du PDF généré (texte extrait et graphiques inspectés).
- Commandes : `npx tsc -b` (aucune erreur), `npm run build` (réussi).

---

## 16. Problèmes rencontrés et corrections

| Problème | Correction |
|---|---|
| Remplacement global « Dashboard » → « tableau de bord » dans des identifiants de code (phase de francisation) | Corrections ciblées de chaque identifiant |
| Un script PowerShell a endommagé 5 fichiers (tableaux à un élément aplatis) | Réparation, puis vérification par compilation et tests |
| Modification du CSV du bulletin non appliquée la première fois | Réécriture, puis contrôle des 7 exports |
| Courbes lissées (« monotone ») qui dépassaient les valeurs réelles | Passage à des segments droits |
| Étiquettes de l'axe des barres qui se chevauchaient | Pas de chevauchement (libellés espacés) |
| Si la liste des produits ne se chargeait pas, la page restait en « Chargement » | Message d'erreur global affiché par la mise en page |
| ARIMA(0,1,0) identique au modèle naïf | Retiré des candidats : ARIMA est maintenant un vrai modèle distinct |
| Textes de prévision maladroits (« baisse de −10,0 % », « stabilité de 0,0 % ») | Phrases reformulées |
| Couleurs trop proches entre deux marchés dans le PDF | Palette alignée avec l'interface |
| Test trop strict sur la présence du nom d'un marché dans la prévision nationale | Test corrigé |

---

## 17. Limites connues et choix assumés

- **Série courte** : 15 mois (janvier 2025 à mars 2026). Aucune saisonnalité annuelle ne peut être estimée ;
  les corrélations et tests sont indicatifs. Cela est écrit dans l'interface.
- **Pas de données au-delà de mars 2026** : les prévisions couvrent avril à septembre 2026 ; les mois 2026 restants
  ne sont ni inventés ni simulés.
- **Moyenne des cinq marchés** : calculée sur les marchés disponibles le mois considéré (la composition peut varier
  d'un mois à l'autre pour certains produits, par exemple Sorgho importé).
- **Intervalles larges** : normal avec peu de points ; l'incertitude croît avec l'horizon.
- **Autres marchés et autres sources** : exclus des analyses principales mais conservés dans les données.
- **Noms de modèles** (Holt-Winters, ARIMA) : noms propres conservés tels quels.
- **Écart de lecture** : « Thies » est affiché « Thiès » (orthographe française) ; la région Thiès porte le même nom.

---

## 18. Comment lancer, tester et reconstruire

Depuis le dossier du projet (PowerShell) :

```powershell
# Lancer le serveur (API + interface) — http://127.0.0.1:8000
.\.venv\Scripts\python.exe -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000

# Tests backend
.\.venv\Scripts\python.exe -m pytest backend/tests -q

# Frontend : vérification de types, tests, construction de l'interface
cd frontend
npx tsc -b
npm run test
npm run build      # produit frontend/dist, servi par FastAPI
```

Pour développer l'interface avec rechargement automatique : `npm run dev` dans `frontend/` (port 5173, redirection
de `/api` vers le port 8000).

Si le code du backend est modifié, redémarrer le serveur ; si le code du frontend est modifié, relancer `npm run build`.

---

## 19. Arborescence finale

```
Foodprice/
├── RAPPORT_DU_TRAVAIL.md          Ce document
├── backend/                        Backend FastAPI (voir §10)
├── frontend/                       Interface React (voir §14)
├── data/
│   ├── raw/                        Les 3 sources originales (jamais modifiées)
│   │   ├── wfp_food_prices_sen.csv
│   │   ├── real-time-food-prices-for-senegal.csv
│   │   └── BASE_BULLETIN.xlsx
│   ├── processed/                  Tables nettoyées (période 2025–2026)
│   └── reports/                    Rapport d'audit et documentation des transformations
├── scripts/
│   ├── inspect_sources.py          Inspection des trois sources
│   └── audit_and_prepare.py        Audit et préparation reproductibles des données
└── archive_version_complete/       Ancienne version complète (≈ 17 pages), conservée par sécurité
    ├── backend/                    Ancien backend et ses tests
    ├── frontend/                   Anciennes pages React
    └── scan_api_english.py         Ancien script de contrôle de la francisation
```

Le dossier `archive_version_complete/` peut être supprimé sans conséquence pour la version actuelle.
Si les données traitées doivent être régénérées à partir des fichiers bruts, utiliser `scripts/audit_and_prepare.py`.

---

## 20. Déploiement sur Render

### 20.1 Architecture de production (fichier `render.yaml`)

| Service | Type | Détails |
|---|---|---|
| `foodprice-senegal-api` | Web Service Python (offre gratuite, région Francfort) | `pip install -r backend/requirements.txt`, démarrage `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`, contrôle de santé `/health` |
| `foodprice-senegal` | Static Site | dossier `frontend`, `npm install && npm run build`, publication de `dist`, réécriture `/*` vers `/index.html` (rechargement des pages), en-têtes de sécurité |

Adresses attendues (si les noms sont libres) :
- site : `https://foodprice-senegal.onrender.com`
- API : `https://foodprice-senegal-api.onrender.com`

### 20.2 Variables d'environnement (aucun secret)

| Service | Variable | Valeur | Rôle |
|---|---|---|---|
| API | `PYTHON_VERSION` | `3.13.5` | Version de Python |
| API | `ENVIRONNEMENT` | `production` | Désactive `/docs`, `/redoc`, `/openapi.json` ; masque les détails des erreurs |
| API | `CORS_ORIGINS` | adresse du site | Seule origine autorisée à appeler l'API |
| API | `CORS_ORIGIN_REGEX` | `^https://foodprice-senegal[a-z0-9-]*\.onrender\.com$` | Couvre un suffixe ajouté par Render au nom du site |
| Site | `NODE_VERSION` | `22` | Version de Node |
| Site | `VITE_API_URL` | adresse publique de l'API | Intégrée au site à la construction |

Aucun mot de passe, clé ou jeton n'existe dans le projet (les données sont publiques et l'API est en lecture seule).
En développement local, `VITE_API_URL` est vide (les appels passent par le même serveur ou par le proxy de Vite), et
l'adresse locale n'est autorisée par CORS que lorsque `ENVIRONNEMENT` n'est pas `production`.

### 20.3 Modifications apportées pour la production

- **Backend** : route `/health` ; CORS configurable ; documentation interactive désactivée en production ;
  middleware qui capte toute erreur inattendue et renvoie un message français sans trace technique (avec les en-têtes CORS) ;
  chargement des données au démarrage ; mémorisation des prévisions et des rapports PDF/Excel (clés bornées : un marché
  inventé dans l'adresse n'ajoute aucune entrée).
- **Dépendances** : `backend/requirements.txt` ne contient plus que les 9 bibliothèques réellement utilisées, avec les
  versions exactes testées (suppression de Prophet et scikit-learn, lourds et inutiles) ; `requirements-dev.txt` ajoute pytest, httpx, pypdf.
- **Frontend** : adresse de l'API lue dans `VITE_API_URL` ; délai maximal de 90 s ; jusqu'à 3 tentatives (pause de 5 s)
  si le serveur répond 502/503/504 ou est injoignable ; message « Le serveur est en train de démarrer… » après 4 s d'attente
  (un serveur gratuit endormi met environ une minute à se réveiller) ; message d'erreur français clair ensuite.
- **Données** : `data/processed/wfp_prices_clean.csv` (0,8 Mo) est le seul fichier lu par l'application ; il est dans le dépôt Git,
  donc présent sur le serveur. Les trois sources originales (`data/raw`, 27 Mo) sont aussi dans le dépôt et ne sont jamais modifiées.

### 20.4 Mémoire et performances (mesures locales)

| Situation | Mémoire du serveur |
|---|---|
| Au repos (données chargées) | ≈ 87 Mo |
| Après analyses et prévisions | ≈ 87 Mo |
| Après génération de PDF/Excel | ≈ 120 à 235 Mo (stable après de nombreuses générations) |

L'offre gratuite de Render offre 512 Mo : la marge est suffisante. Génération d'un PDF : environ 2 s (puis instantané grâce à la mémorisation).

### 20.5 Tests avant déploiement

- Installation **propre** (nouvel environnement virtuel) des seules dépendances de production, avec une copie du backend contenant
  uniquement le fichier de données nécessaire (comme sur Render) : démarrage réussi, `/health` = 200, `/docs` = 404, CORS accepté pour
  l'adresse du site et refusé pour une autre.
- Site construit avec `VITE_API_URL` pointant vers cette API séparée, puis ouvert dans le navigateur : les six pages se chargent,
  le changement de produit met à jour les graphiques, les prévisions s'affichent, les liens PDF/Excel/CSV pointent vers l'API et
  les trois téléchargements répondent (PDF 318 Ko, Excel 30 Ko, CSV 47 Ko).
- API arrêtée volontairement : le site affiche d'abord le message de démarrage puis, après les tentatives, « Impossible de joindre le serveur… ».
- Tests automatiques : 16 tests backend, 8 tests frontend ; `tsc` sans erreur ; `npm run build` réussi.

### 20.6 Mises en ligne et mises à jour

```powershell
git add -A
git commit --trailer "Co-authored-by: Cursor <cursoragent@cursor.com>" -m "Description de la modification"
git push
```

Render redéploie automatiquement les deux services à chaque `git push` sur la branche `main`.
Si Render donne à l'API une adresse différente de celle attendue, modifier `VITE_API_URL` dans l'onglet *Environment* du site,
puis lancer *Manual Deploy → Deploy latest commit*.
