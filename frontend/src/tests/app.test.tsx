import React from "react";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { obtenir, reglages } from "../api/client";
import { AppRoutes } from "../App";
import { fcfa, nombre, pourcent, pValeur } from "../lib/format";

const MARCHES = ["Ourossogui", "Thiès", "Thiodaye", "Kouthiaba", "Mereto"];

const REPONSES: Record<string, unknown> = {
  "/api/options": { produits: ["Mil", "Niébé"], produit_par_defaut: "Mil", marches: MARCHES, premier_mois: "2025-01", dernier_mois: "2026-03", unite: "FCFA/kg" },
  "/api/marches": {
    periode: "janvier 2025 – décembre 2026",
    critere: "critère",
    nombre_marches_disponibles: 47,
    marches: MARCHES.map((m, i) => ({ rang: i + 1, marche: m, region: "Région", releves: 150 - i, mois: 15, produits: 11 })),
    releves_total_retenus: 700,
    releves_total_disponibles: 4779,
    mois_couverts: 15,
  },
  "/api/tableau-de-bord": {
    produit: "Mil",
    unite: "FCFA/kg",
    indicateurs: { marches_etudies: 5, produits_disponibles: 11, dernier_prix: 268, dernier_mois: "mars 2026", variation_pct: -0.9, variation_absolue: -2, variation_vs: "février 2026", glissement_annuel_pct: -10.8 },
    marches: MARCHES,
    evolution: [{ mois: "2026-03", libelle: "mars 2026", moyenne: 268, minimum: 250, maximum: 290 }],
    comparaison_marches: [{ mois: "2026-03", libelle: "mars 2026", Ourossogui: 260, Thiès: 270, Thiodaye: 265, Kouthiaba: 280, Mereto: 250 }],
    comparaison_produits: [{ produit: "Niébé", dernier_prix: 715, dernier_mois: "mars 2026", marches_dernier_mois: 5, moyenne_periode: 796 }],
    mois_sans_releve: [],
    note: "Note de test.",
  },
  "/api/previsions": { produit: "Mil", marche: null, portee: "Moyenne des 5 marchés", disponible: false, message: "Série trop courte.", historique: [] },
};

beforeEach(() => {
  reglages.delaiEntreTentatives = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn((url: string) => {
      const chemin = url.split("?")[0];
      return Promise.resolve({ ok: chemin in REPONSES, status: chemin in REPONSES ? 200 : 404, json: () => Promise.resolve(REPONSES[chemin]) });
    })
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const rendre = (chemin = "/") =>
  render(
    <MemoryRouter initialEntries={[chemin]}>
      <AppRoutes />
    </MemoryRouter>
  );

describe("Menu", () => {
  it("contient exactement six rubriques en français", () => {
    rendre();
    const menu = screen.getByRole("navigation", { name: "Menu principal" });
    const liens = within(menu).getAllByRole("link").map((l) => l.textContent?.trim());
    expect(liens).toEqual([
      "Tableau de bord",
      "Analyse des prix",
      "Comparaison des marchés",
      "Études statistiques",
      "Prévisions IA",
      "Guide d'utilisation",
    ]);
  });
});

describe("Tableau de bord", () => {
  it("affiche les quatre indicateurs et les quatre graphiques", async () => {
    rendre();
    await waitFor(() => expect(screen.getByText("Dernier prix observé")).toBeInTheDocument());
    ["Marchés étudiés", "Produits disponibles", "Variation du prix"].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
    [
      "Évolution des prix dans le temps",
      "Comparaison des prix entre les cinq marchés",
      "Comparaison des prix entre les produits",
      "Prévisions des prix sur six mois",
    ].forEach((t) => expect(screen.getByText(t)).toBeInTheDocument());
  });

  it("présente les cinq marchés retenus avec leurs noms réels", async () => {
    rendre();
    await waitFor(() => expect(screen.getByText("Les cinq marchés étudiés")).toBeInTheDocument());
    for (const m of MARCHES) await waitFor(() => expect(screen.getAllByText(m).length).toBeGreaterThan(0));
  });

  it("affiche un message clair si le serveur est injoignable", async () => {
    vi.stubGlobal("fetch", vi.fn(() => Promise.reject(new Error("réseau"))));
    rendre();
    await waitFor(() => expect(screen.getAllByRole("alert").length).toBeGreaterThan(0));
    expect(screen.getAllByRole("alert")[0].textContent).toContain("Impossible de joindre le serveur");
  });
});

describe("Formats français", () => {
  it("utilise la virgule décimale et l'espace des milliers", () => {
    expect(nombre(1234.5, 1)).toBe("1\u00a0234,5");
    expect(fcfa(1250)).toBe("1\u00a0250\u00a0FCFA/kg");
    expect(pourcent(-0.9, 1, true)).toBe("-0,9\u00a0%");
    expect(pourcent(3, 1, true)).toBe("+3,0\u00a0%");
    expect(pValeur(0)).toBe("< 0,0001");
    expect(nombre(null)).toBe("—");
  });
});

describe("Appels à l'API", () => {
  it("recommence quand le serveur est en train de démarrer (503) puis réussit", async () => {
    const appels = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: () => Promise.resolve({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve({ ok: 1 }) });
    vi.stubGlobal("fetch", appels);
    await expect(obtenir("options")).resolves.toEqual({ ok: 1 });
    expect(appels).toHaveBeenCalledTimes(2);
  });

  it("ne recommence pas pour une erreur 404 et renvoie un message en français", async () => {
    const appels = vi.fn().mockResolvedValue({ ok: false, status: 404, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", appels);
    await expect(obtenir("inconnu")).rejects.toThrow("code 404");
    expect(appels).toHaveBeenCalledTimes(1);
  });

  it("utilise une adresse relative en l'absence de VITE_API_URL", async () => {
    const appels = vi.fn().mockResolvedValue({ ok: true, status: 200, json: () => Promise.resolve({}) });
    vi.stubGlobal("fetch", appels);
    await obtenir("options", { produit: "Mil" });
    expect(String(appels.mock.calls[0][0])).toBe("/api/options?produit=Mil");
  });
});
