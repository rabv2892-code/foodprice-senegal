import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { BarChart3, BookOpen, GitCompare, LayoutDashboard, LineChart, Menu, Sigma, X } from "lucide-react";
import { useSelection } from "../context/SelectionContext";
import { Chargement, Erreur } from "./ui";

export const MENU = [
  { chemin: "/", libelle: "Tableau de bord", icone: LayoutDashboard },
  { chemin: "/analyse-des-prix", libelle: "Analyse des prix", icone: LineChart },
  { chemin: "/comparaison-des-marches", libelle: "Comparaison des marchés", icone: GitCompare },
  { chemin: "/etudes-statistiques", libelle: "Études statistiques", icone: Sigma },
  { chemin: "/previsions", libelle: "Prévisions IA", icone: BarChart3 },
  { chemin: "/guide", libelle: "Guide d'utilisation", icone: BookOpen },
];

/** Attente du serveur : après quelques secondes, on explique qu'un serveur gratuit peut mettre du temps à se réveiller. */
const AttenteServeur: React.FC = () => {
  const [long, setLong] = useState(false);
  useEffect(() => {
    const minuteur = setTimeout(() => setLong(true), 4000);
    return () => clearTimeout(minuteur);
  }, []);
  return (
    <>
      <Chargement />
      {long && (
        <p className="mt-3 text-center text-sm text-gris-500">
          Le serveur est en train de démarrer, cela peut prendre jusqu'à une minute. Merci de patienter, la page se chargera toute seule.
        </p>
      )}
    </>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ouvert, setOuvert] = useState(false);
  const { options, erreur } = useSelection();

  const barre = (
    <nav aria-label="Menu principal" className="flex h-full flex-col bg-marine-900 text-white">
      <div className="border-b border-white/10 px-5 py-5">
        <p className="text-lg font-bold tracking-wide">FOODPRICE</p>
        <p className="text-xs font-semibold tracking-[0.25em] text-ciel-300">SENEGAL</p>
      </div>
      <ul className="flex-1 space-y-1 px-3 py-4">
        {MENU.map(({ chemin, libelle, icone: Icone }) => (
          <li key={chemin}>
            <NavLink
              to={chemin}
              end={chemin === "/"}
              onClick={() => setOuvert(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-md px-3 py-2.5 text-sm ${
                  isActive ? "bg-white font-semibold text-marine-900" : "text-ciel-100 hover:bg-white/10"
                }`
              }
            >
              <Icone size={17} aria-hidden />
              {libelle}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="border-t border-white/10 px-5 py-4 text-xs text-ciel-100">
        <p className="font-semibold">Période d'étude</p>
        <p>janvier 2025 – décembre 2026</p>
        {options && <p className="mt-1 text-ciel-300">Source : PAM · {options.marches.length} marchés</p>}
      </div>
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="sticky top-0 h-screen">{barre}</div>
      </aside>

      <header className="flex items-center justify-between bg-marine-900 px-4 py-3 text-white lg:hidden">
        <p className="font-bold">
          FOODPRICE <span className="text-ciel-300">SENEGAL</span>
        </p>
        <button onClick={() => setOuvert(!ouvert)} aria-label={ouvert ? "Fermer le menu" : "Ouvrir le menu"} className="rounded p-1.5 hover:bg-white/10">
          {ouvert ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>
      {ouvert && <div className="lg:hidden">{barre}</div>}

      <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{erreur ? <Erreur message={erreur} /> : !options ? <AttenteServeur /> : children}</main>
    </div>
  );
};
