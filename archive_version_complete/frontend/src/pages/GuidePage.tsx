import React from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Database,
  FileDown,
  GitCompare,
  LayoutDashboard,
  MapPin,
  Package,
  PlayCircle,
  TrendingUp,
} from "lucide-react";
import { useGlobalFilters } from "../context/FilterContext";

const GUIDE_CHAPTERS = [
  {
    num: "01",
    title: "Comment découvrir le tableau de bord",
    route: "/",
    icon: LayoutDashboard,
    desc: "L'« Tableau de bord exécutif » présente 4 indicateurs datés (dernier prix observé, variation mensuelle, marchés actifs, prévision IA à 6 mois) et des graphiques interactifs : évolution observé 2025 / observé 2026 / prévision, répartition des relevés, comparaison mensuelle 2025 contre 2026, classement des produits et comparaison régionale avec carte. Les indicateurs statistiques détaillés (9 indicateurs et 9 graphiques A à I) restent disponibles dans « Analyses détaillées ». Survolez n'importe quelle courbe ou barre pour lire les valeurs et dates exactes.",
  },
  {
    num: "02",
    title: "Comment sélectionner une source",
    route: "/explorer",
    icon: Database,
    desc: "Utilisez le menu « Source de données » dans la barre de filtres en haut des pages. Vous pouvez basculer entre PAM Sénégal (100 % observé), Temps réel relevés directs, Temps réel estimations modélisées (toujours signalées par un badge ambre), et CSA Régional.",
  },
  {
    num: "03",
    title: "Comment sélectionner un produit",
    route: "/products",
    icon: Package,
    desc: "Sélectionnez un produit dans le filtre global ou cliquez sur les boutons produits de « Analyse des prix ». La page « Analyse des produits » compare automatiquement les trajectoires et la matrice de corrélation entre produits.",
  },
  {
    num: "04",
    title: "Comment sélectionner une région",
    route: "/geography",
    icon: MapPin,
    desc: "Choisissez une région (ex : Dakar, Saint-Louis, Kédougou, Ziguinchor) pour restreindre automatiquement la liste des marchés disponibles et recalculer les écarts par rapport à la moyenne nationale sur la carte GPS du Sénégal.",
  },
  {
    num: "05",
    title: "Comment consulter l'évolution des prix",
    route: "/prices",
    icon: TrendingUp,
    desc: "Dans « Analyse des prix » et « Analyse temporelle », suivez la moyenne, la médiane, l'enveloppe minimum–maximum, la moyenne mobile 6 mois (2025–2026), les variations mensuelles et annuelles (2026 par rapport à 2025) ainsi que la matrice Année × Mois.",
  },
  {
    num: "06",
    title: "Comment comparer les marchés",
    route: "/markets",
    icon: GitCompare,
    desc: "Accédez à « Comparaison des marchés » et cochez jusqu'à 8 marchés simultanément pour superposer leurs courbes mensuelles, comparer leur coefficient de variation (CV%) et analyser leur matrice de co-mouvement spatial.",
  },
  {
    num: "07",
    title: "Comment réaliser une étude statistique",
    route: "/statistics",
    icon: BarChart3,
    desc: "Ouvrez « Études statistiques » pour consulter moyenne, médiane, variance, écart-type, quartiles Q1/Q3, CV%, histogramme, boîtes à moustaches (boîtes à moustaches) par région, valeurs aberrantes (1,5×EIQ / 3×EIQ) et interprétations automatiques.",
  },
  {
    num: "08",
    title: "Comment générer une prévision IA",
    route: "/forecast",
    icon: BrainCircuit,
    desc: "Rendez-vous sur « Prévisions par intelligence artificielle », sélectionnez Source, Produit, Région, Marché et Horizon (1, 3, 6 ou 12 mois), puis cliquez sur « Générer une prévision ». Le moteur entraîne et compare Holt-Winters, ARIMA, SARIMA et Prophet sur fenêtre chronologique.",
  },
  {
    num: "09",
    title: "Comment interpréter les résultats",
    route: "/forecast",
    icon: CheckCircle2,
    desc: "Comparez les modèles sur REQM, EAM et EAMP. Le modèle retenu (★) minimise l'erreur hors échantillon. Vérifiez toujours la dernière date réellement observée, la bande d'incertitude à 95 % et les avertissements de garde-fou si une série est trop courte.",
  },
  {
    num: "10",
    title: "Comment exporter les analyses",
    route: "/reports",
    icon: FileDown,
    desc: "Dans « Rapports et exportations », téléchargez en un clic un Rapport PDF exécutif complet, un classeur Excel multi-feuilles (indicateurs, Régions, Produits, boîtes à moustaches, Prévisions par intelligence artificielle) ou des fichiers CSV filtrés pour chaque source et chaque feuille du Bulletin.",
  },
];

export const GuidePage: React.FC = () => {
  const navigate = useNavigate();
  const { setDemoOpen } = useGlobalFilters();

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-navy-950 via-navy-900 to-navy-800 p-6 text-white shadow-elevated">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-300">
              <BookOpen className="h-3.5 w-3.5" />
              Documentation interactive
            </div>
            <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">
              COMMENT UTILISER FOODPRICE SENEGAL ?
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              Suivez ces 10 étapes pratiques pour maîtriser l'exploration des 3 sources réelles, les études statistiques,
              la cartographie GPS et le moteur de prévision IA, ou lancez le mode démonstration guidée.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="inline-flex items-center gap-2.5 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-extrabold text-navy-950 shadow-lg transition hover:bg-emerald-400"
          >
            <PlayCircle className="h-5 w-5" />
            Lancer la Démonstration Guidée
          </button>
        </div>
      </div>

      {/* 10 Step Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {GUIDE_CHAPTERS.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-card transition hover:border-navy-600 hover:shadow-elevated"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-emerald-400">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="font-mono text-[11px] font-bold text-emerald-600">ÉTAPE {step.num}</span>
                      <h3 className="text-sm font-extrabold text-navy-900">{step.title}</h3>
                    </div>
                  </div>
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-600">{step.desc}</p>
              </div>

              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => navigate(step.route)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-navy-900 hover:text-emerald-600"
                >
                  Ouvrir la page correspondante
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
