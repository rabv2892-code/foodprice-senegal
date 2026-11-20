import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  Compass,
  PlayCircle,
  X,
} from "lucide-react";

interface GuidedDemoModalProps {
  open: boolean;
  onClose: () => void;
}

const DEMO_STEPS = [
  {
    title: "1. Vue exécutive et indicateurs réels",
    route: "/",
    badge: "Tableau de bord exécutif",
    description:
      "Quatre indicateurs datés (dernier prix observé, variation mensuelle, marchés actifs, prévision IA à 6 mois), la courbe observé 2025 / observé 2026 / prévision avec intervalle de prévision, la répartition des relevés, la comparaison 2025 / 2026, le classement des produits et la comparaison régionale avec carte.",
    tip: "Astuce : cliquez sur une région dans la comparaison régionale ou sur un produit du classement : tout le tableau de bord se recalcule.",
  },
  {
    title: "2. Séparation stricte des sources",
    route: "/explorer",
    badge: "Exploration des données",
    description:
      "Basculez entre PAM Sénégal (100 % observé), Temps réel (relevés directs vs estimations modélisées) et CSA Régional sans jamais confondre une estimation avec un relevé de terrain.",
    tip: "Astuce : testez la recherche textuelle et l'export CSV instantané de la sélection.",
  },
  {
    title: "3. Cartographie GPS des 64 marchés",
    route: "/geography",
    badge: "Analyse géographique",
    description:
      "Visualisez les 64 marchés sénégalais positionnés à leurs coordonnées exactes (latitude/longitude), repérez les zones les plus chères (ex: Dakar, Kédougou) et les écarts spatiaux.",
    tip: "Astuce : survolez ou cliquez sur un marché sur la carte pour lire ses coordonnées GPS et son prix moyen.",
  },
  {
    title: "4. Études statistiques et interprétations automatiques",
    route: "/statistics",
    badge: "Études statistiques",
    description:
      "Inspectez variance, écart-type, quartiles, CV%, coefficient d'asymétrie, histogrammes, boîtes à moustaches par région, valeurs aberrantes (1,5×EIQ / 3×EIQ) et matrice de corrélation.",
    tip: "Chaque conclusion textuelle est générée dynamiquement à partir des métriques calculées.",
  },
  {
    title: "5. Moteur de prévision IA (calibré depuis janvier 2025)",
    route: "/forecast",
    badge: "Prévisions par intelligence artificielle",
    description:
      "Comparez Holt-Winters, ARIMA, SARIMA et Prophet sur les séries 2025–2026, avec distinction explicite entre observé 2025, observé 2026 et estimations futures IA, et garde-fous anti-séries insuffisantes.",
    tip: "Astuce : testez 'Mil — Dakar', puis le bouton garde-fou sur 'Sorgho Dakar (3 mois)'.",
  },
  {
    title: "6. Couverture 2025–2026 de BASE_BULLETIN.xlsx",
    route: "/energy-transport",
    badge: "Bulletin national",
    description:
      "Vérifiez la politique stricte sur les 7 feuilles BASE_BULLETIN.xlsx : toutes s'arrêtent en 2021/2022, donc affichent exactement 0 observation sur janvier 2025 – décembre 2026 sans exposer de données antérieures.",
    tip: "Aucune donnée antérieure à janvier 2025 ni aucun mois 2026 manquant n'est affiché ou inventé.",
  },
  {
    title: "7. Qualité des données et rapports PDF / Excel",
    route: "/reports",
    badge: "Audit et exportations",
    description:
      "Consultez les scores de qualité audités (812 colonnes vides Temps réel, écarts élevage, espaces CSA) et téléchargez en un clic un rapport PDF complet ou un classeur Excel multi-feuilles.",
    tip: "Le PDF inclut la méthodologie, l'audit, les statistiques, la géographie et la prévision IA active.",
  },
];

export const GuidedDemoModal: React.FC<GuidedDemoModalProps> = ({ open, onClose }) => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  if (!open) return null;

  const current = DEMO_STEPS[step];

  const goToStepPage = (idx: number) => {
    setStep(idx);
    navigate(DEMO_STEPS[idx].route);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 backdrop-blue-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-fade-up">
        {/* Header */}
        <div className="flex items-center justify-between bg-navy-900 px-6 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <PlayCircle className="h-5 w-5 text-emerald-400" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                Mode démonstration guidée — Présentation
              </p>
              <h3 className="text-base font-bold">Parcours interactif FOODPRICE SENEGAL</h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Fermer la démonstration"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="h-1.5 w-full bg-slate-100">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${((step + 1) / DEMO_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="flex items-center justify-between gap-2">
            <span className="rounded-full bg-navy-900/10 px-3 py-1 text-xs font-bold text-navy-900">
              {current.badge}
            </span>
            <span className="font-mono text-xs font-semibold text-slate-500">
              Étape {step + 1} / {DEMO_STEPS.length}
            </span>
          </div>

          <h4 className="mt-4 text-xl font-extrabold text-navy-900">{current.title}</h4>
          <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{current.description}</p>

          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-950">
            <span className="font-bold">Point clé : </span>
            {current.tip}
          </div>

          <div className="mt-5 flex flex-wrap gap-1.5">
            {DEMO_STEPS.map((s, idx) => (
              <button
                key={s.title}
                type="button"
                onClick={() => goToStepPage(idx)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition ${
                  idx === step
                    ? "bg-navy-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {idx + 1}. {s.badge}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={() => {
              navigate(current.route);
              onClose();
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-navy-800 bg-white px-3.5 py-2 text-xs font-bold text-navy-900 hover:bg-navy-900 hover:text-white transition"
          >
            <Compass className="h-4 w-4" />
            Ouvrir cette page maintenant
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={step === 0}
              onClick={() => goToStepPage(step - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-100"
            >
              <ChevronLeft className="h-4 w-4" />
              Précédent
            </button>
            {step < DEMO_STEPS.length - 1 ? (
              <button
                type="button"
                onClick={() => goToStepPage(step + 1)}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700"
              >
                Étape suivante
                <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  navigate("/");
                  onClose();
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-navy-900 px-4 py-2 text-xs font-bold text-white hover:bg-navy-800"
              >
                Terminer la visite
                <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
