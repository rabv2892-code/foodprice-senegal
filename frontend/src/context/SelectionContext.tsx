import React, { createContext, useContext, useEffect, useState } from "react";
import { Options } from "../api/client";
import { useDonnees } from "../lib/hooks";

interface Selection {
  options: Options | null;
  erreur: string | null;
  produit: string;
  setProduit: (p: string) => void;
}

const Contexte = createContext<Selection>({ options: null, erreur: null, produit: "", setProduit: () => {} });

/** Produit choisi : partagé entre toutes les pages pour garder la même sélection en naviguant. */
export const SelectionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { donnees, erreur } = useDonnees<Options>("options");
  const [produit, setProduit] = useState("");

  useEffect(() => {
    if (donnees && !produit) setProduit(donnees.produit_par_defaut);
  }, [donnees, produit]);

  return <Contexte.Provider value={{ options: donnees, erreur, produit, setProduit }}>{children}</Contexte.Provider>;
};

export const useSelection = () => useContext(Contexte);
