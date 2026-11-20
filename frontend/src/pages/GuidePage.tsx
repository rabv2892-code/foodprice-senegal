import React from "react";
import { Link } from "react-router-dom";
import { MarchesRetenus } from "../components/MarchesRetenus";
import { Carte, PageTitre } from "../components/ui";

const PAGES = [
  { chemin: "/", titre: "Tableau de bord", texte: "Quatre indicateurs et quatre graphiques : évolution du prix, comparaison des cinq marchés, comparaison des produits et prévision à six mois." },
  { chemin: "/analyse-des-prix", titre: "Analyse des prix", texte: "Prix mensuel d'un produit dans un marché (ou en moyenne), moyenne mobile, variations et tableau détaillé." },
  { chemin: "/comparaison-des-marches", titre: "Comparaison des marchés", texte: "Niveau de prix, écarts et variabilité des cinq marchés pour un même produit." },
  { chemin: "/etudes-statistiques", titre: "Études statistiques", texte: "Statistiques descriptives, test de Kruskal-Wallis, tendance, volatilité et corrélations." },
  { chemin: "/previsions", titre: "Prévisions IA", texte: "Prévision à six mois avec Holt-Winters ou ARIMA, métriques de performance et interprétation." },
];

const GLOSSAIRE: [string, string][] = [
  ["FCFA/kg", "Prix en francs CFA par kilogramme."],
  ["Relevé", "Un prix observé pour un produit, dans un marché, un mois donné."],
  ["Coefficient de variation", "Écart-type divisé par la moyenne : mesure la variabilité d'un prix, en %."],
  ["Corrélation", "Mesure, entre -1 et 1, du lien entre deux séries de prix."],
  ["Valeur p", "Probabilité d'observer un tel résultat par hasard ; en dessous de 0,05, le résultat est dit significatif."],
  ["Holt-Winters", "Lissage exponentiel : donne plus de poids aux prix récents et suit la tendance."],
  ["ARIMA", "Modèle qui prévoit le prix à partir de ses valeurs et de ses erreurs passées."],
  ["REQM, EAM, EAMP", "Erreurs de prévision mesurées sur les derniers mois connus (plus elles sont faibles, meilleur est le modèle)."],
  ["Intervalle de confiance à 95 %", "Zone dans laquelle le prix a 95 % de chances de se trouver ; elle s'élargit avec l'horizon."],
];

export const GuidePage: React.FC = () => (
  <>
    <PageTitre titre="Guide d'utilisation" sousTitre="Comprendre le projet, les données et les résultats en quelques minutes." />
    <div className="space-y-5">
      <Carte titre="Objectif du projet">
        <p className="text-sm leading-relaxed text-gris-700">
          FOODPRICE SENEGAL suit l'évolution des prix des produits alimentaires de base au Sénégal et propose une prévision à six mois. L'étude porte
          sur la période <strong>janvier 2025 – décembre 2026</strong> et sur <strong>cinq marchés</strong> choisis pour la qualité de leurs données.
          Aucune donnée n'est inventée : un mois sans relevé reste vide, et toute valeur prévue est clairement présentée comme une estimation.
        </p>
      </Carte>

      <Carte titre="Les données">
        <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-gris-700">
          <li>
            <strong>Prix du Programme alimentaire mondial (PAM)</strong> : source utilisée pour toutes les analyses, car elle fournit des prix observés
            par marché, produit et mois. Les données disponibles vont de janvier 2025 à mars 2026.
          </li>
          <li>
            <strong>Prix en temps réel de la Banque mondiale</strong> et <strong>bulletin statistique (BASE_BULLETIN)</strong> : fichiers d'origine
            conservés dans le dossier <code>data/raw</code>. Ils ne servent pas aux analyses principales : le premier mélange prix observés et estimations modélisées, le second ne contient aucune donnée sur 2025–2026.
          </li>
          <li>
            Les fichiers d'origine ne sont jamais modifiés : un script de préparation produit des tables nettoyées dans <code>data/processed</code>.
          </li>
        </ul>
      </Carte>

      <MarchesRetenus />

      <Carte titre="Les pages du logiciel">
        <ul className="divide-y divide-gris-100">
          {PAGES.map((p) => (
            <li key={p.chemin} className="py-2 text-sm">
              <Link to={p.chemin} className="font-semibold text-marine-800 hover:underline">
                {p.titre}
              </Link>
              <span className="text-gris-700"> — {p.texte}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm text-gris-700">
          Les boutons <strong>Rapport PDF</strong>, <strong>Excel</strong> et <strong>CSV</strong> exportent les résultats pour le produit choisi.
        </p>
      </Carte>

      <Carte titre="Comment fonctionne la prévision ?">
        <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-gris-700">
          <li>On construit la série mensuelle du prix du produit (moyenne des cinq marchés ou un marché).</li>
          <li>Les trois derniers mois connus sont mis de côté ; les modèles sont entraînés sur le reste puis testés sur ces trois mois.</li>
          <li>Le modèle le plus précis (Holt-Winters ou ARIMA) est ré-entraîné sur toute la série et prévoit les six mois suivants.</li>
          <li>Un « modèle naïf » (le dernier prix répété) sert de référence : un bon modèle doit faire mieux.</li>
        </ol>
        <p className="mt-3 text-sm text-gris-700">
          <strong>Limites :</strong> avec seulement 15 mois d'historique, la saisonnalité annuelle ne peut pas être estimée ; les prévisions indiquent une
          tendance probable et non une valeur certaine. Lorsque la série est trop courte (moins de 10 mois), aucune prévision n'est affichée.
        </p>
      </Carte>

      <Carte titre="Petit lexique">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-2 text-sm md:grid-cols-2">
          {GLOSSAIRE.map(([terme, definition]) => (
            <div key={terme}>
              <dt className="font-semibold text-marine-900">{terme}</dt>
              <dd className="text-gris-700">{definition}</dd>
            </div>
          ))}
        </dl>
      </Carte>
    </div>
  </>
);
