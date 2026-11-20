import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Activity,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Coins,
  Database,
  FileDown,
  Gauge,
  GitCompare,
  LayoutDashboard,
  MapPin,
  Menu,
  Package,
  PlayCircle,
  ShieldCheck,
  Settings,
  Sprout,
  TrendingUp,
  X,
  Zap,
} from "lucide-react";
import { useGlobalFilters } from "../context/FilterContext";
import { GuidedDemoModal } from "./GuidedDemoModal";
import { SOURCE_SHORT } from "../lib/sources";

export interface NavItem {
  path: string;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  section: string;
}

export const NAV_ITEMS: NavItem[] = [
  { path: "/", label: "Tableau de bord", shortLabel: "Tableau de bord", icon: Gauge, section: "ANALYSE MARCHÉS" },
  { path: "/analyses", label: "Analyses détaillées", shortLabel: "Analyses", icon: LayoutDashboard, section: "ANALYSE MARCHÉS" },
  { path: "/explorer", label: "Exploration des données", shortLabel: "Exploration", icon: Database, section: "ANALYSE MARCHÉS" },
  { path: "/prices", label: "Analyse des prix", shortLabel: "Prix", icon: TrendingUp, section: "ANALYSE MARCHÉS" },
  { path: "/products", label: "Analyse des produits", shortLabel: "Produits", icon: Package, section: "ANALYSE MARCHÉS" },
  { path: "/geography", label: "Analyse géographique", shortLabel: "Géographie", icon: MapPin, section: "ANALYSE MARCHÉS" },
  { path: "/temporal", label: "Analyse temporelle", shortLabel: "Temporel", icon: CalendarClock, section: "ANALYSE MARCHÉS" },
  { path: "/markets", label: "Comparaison des marchés", shortLabel: "Marchés", icon: GitCompare, section: "ANALYSE MARCHÉS" },
  { path: "/statistics", label: "Études statistiques", shortLabel: "Statistiques", icon: BarChart3, section: "SCIENCES ET PRÉVISIONS" },
  { path: "/forecast", label: "Prévisions par intelligence artificielle", shortLabel: "Prévisions", icon: BrainCircuit, section: "SCIENCES ET PRÉVISIONS" },
  { path: "/commodities", label: "Matières premières", shortLabel: "Matières 1ères", icon: Coins, section: "BULLETIN NATIONAL" },
  { path: "/production", label: "Production agricole et élevage", shortLabel: "Production", icon: Sprout, section: "BULLETIN NATIONAL" },
  { path: "/energy-transport", label: "Énergie et transport", shortLabel: "Énergie et transport", icon: Zap, section: "BULLETIN NATIONAL" },
  { path: "/quality", label: "Qualité des données", shortLabel: "Qualité", icon: ShieldCheck, section: "GOUVERNANCE" },
  { path: "/reports", label: "Rapports et exportations", shortLabel: "Rapports", icon: FileDown, section: "GOUVERNANCE" },
  { path: "/guide", label: "Guide d'utilisation", shortLabel: "Guide", icon: BookOpen, section: "GOUVERNANCE" },
  { path: "/settings", label: "Paramètres", shortLabel: "Paramètres", icon: Settings, section: "GOUVERNANCE" },
];

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { demoOpen, setDemoOpen, filters } = useGlobalFilters();

  const currentNav = NAV_ITEMS.find((n) => n.path === location.pathname) ?? NAV_ITEMS[0];
  const dark = location.pathname === "/";
  const sections = ["ANALYSE MARCHÉS", "SCIENCES ET PRÉVISIONS", "BULLETIN NATIONAL", "GOUVERNANCE"];

  const renderNavLinks = (isMobile = false) => (
    <nav className="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      {sections.map((sec) => {
        const items = NAV_ITEMS.filter((i) => i.section === sec);
        return (
          <div key={sec}>
            {(!collapsed || isMobile) && (
              <p className="mb-1.5 px-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400/80">
                {sec}
              </p>
            )}
            <div className="space-y-0.5">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => isMobile && setMobileOpen(false)}
                    title={collapsed && !isMobile ? item.label : undefined}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30 shadow-sm"
                          : "text-slate-300 hover:bg-white/10 hover:text-white"
                      }`
                    }
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {(!collapsed || isMobile) && <span className="truncate">{item.label}</span>}
                  </NavLink>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );

  return (
    <div
      className={`flex min-h-screen ${
        dark
          ? "bg-[#060D1A] bg-[radial-gradient(ellipse_at_top_right,rgba(45,212,191,0.07),transparent_55%)] text-slate-200"
          : "bg-[#F4F7FA] text-slate-900"
      }`}
    >
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen shrink-0 bg-navy-900 text-white border-r border-navy-800 transition-all duration-200 ${
          collapsed ? "w-[74px]" : "w-[262px]"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg">
              <Activity className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="truncate text-sm font-extrabold tracking-tight text-white">
                  FOODPRICE SENEGAL
                </h1>
                <p className="truncate text-[9.5px] font-semibold tracking-widest text-emerald-300">
                  INTELLIGENCE DES PRIX ALIMENTAIRES
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Réduire ou agrandir la barre latérale"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {renderNavLinks(false)}

        {/* Sidebar Demo Trigger */}
        <div className="border-t border-white/10 p-3">
          <button
            type="button"
            onClick={() => setDemoOpen(true)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500/20 px-3 py-2.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-400/30 transition hover:bg-emerald-500 hover:text-white"
          >
            <PlayCircle className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Démonstration guidée</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div className="fixed inset-0 bg-navy-950/70" onClick={() => setMobileOpen(false)} />
          <aside className="relative z-10 flex w-72 flex-col bg-navy-900 text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-4">
              <div>
                <h1 className="text-sm font-extrabold">FOODPRICE SENEGAL</h1>
                <p className="text-[10px] font-semibold tracking-wider text-emerald-300">
                  INTELLIGENCE DES PRIX ALIMENTAIRES ET PRÉVISIONS
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1 text-slate-300 hover:bg-white/10"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {renderNavLinks(true)}
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Institutional Header */}
        <header
          className={`sticky top-0 z-30 border-b px-4 py-3 backdrop-blur sm:px-6 ${
            dark ? "border-white/[0.06] bg-[#060D1A]/85" : "border-slate-200/90 bg-white/95"
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className={`rounded-lg border p-2 lg:hidden ${
                  dark ? "border-white/10 text-slate-200 hover:bg-white/10" : "border-slate-200 text-slate-700 hover:bg-slate-100"
                }`}
                aria-label="Ouvrir le menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                    FOODPRICE SENEGAL
                  </span>
                  <span className="text-slate-300">/</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    {currentNav.section}
                  </span>
                </div>
                <h2 className={`text-lg font-extrabold tracking-tight sm:text-xl ${dark ? "text-white" : "text-navy-900"}`}>
                  {currentNav.label}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <span
                className={`hidden md:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold ${
                  dark ? "border-teal-400/30 bg-teal-400/10 text-teal-200" : "border-emerald-200 bg-emerald-50 text-emerald-800"
                }`}
              >
                Période officielle : 01/01/2025 – 31/12/2026
              </span>
              <span
                className={`hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold ${
                  dark ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Source active : <strong className={dark ? "text-white" : "text-navy-900"}>{SOURCE_SHORT[filters.source] ?? filters.source}</strong>
              </span>
              <button
                type="button"
                onClick={() => setDemoOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-white shadow-sm transition ${
                  dark ? "bg-white/10 ring-1 ring-white/10 hover:bg-white/15" : "bg-navy-900 hover:bg-navy-800"
                }`}
              >
                <PlayCircle className="h-3.5 w-3.5 text-emerald-400" />
                <span>Visite guidée</span>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <div className="mx-auto max-w-[1480px] space-y-5">{children}</div>
        </main>

        <footer
          className={`border-t px-6 py-3 text-[11px] ${
            dark ? "border-white/[0.06] bg-[#050B16] text-slate-500" : "border-slate-200 bg-white text-slate-500"
          }`}
        >
          <div className="mx-auto flex max-w-[1480px] flex-wrap items-center justify-between gap-2">
            <span>
              <strong className={dark ? "text-slate-300" : "text-navy-900"}>FOODPRICE SENEGAL</strong> — INTELLIGENCE DES PRIX ALIMENTAIRES ET PRÉVISIONS (janvier 2025 – décembre 2026)
            </span>
            <span>
              Filtrage strict 2025–2026 sur les données du PAM, les prix en temps réel et BASE_BULLETIN.xlsx (aucune donnée antérieure à 2025 ni mois inventé).
            </span>
          </div>
        </footer>
      </div>

      <GuidedDemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
};
