import { useEffect, useState } from "react";
import { obtenir } from "../api/client";

export interface Etat<T> {
  donnees: T | null;
  erreur: string | null;
  chargement: boolean;
}

/** Charge des données de l'API à chaque changement des paramètres (avec états de chargement et d'erreur). */
export function useDonnees<T>(chemin: string, parametres: Record<string, string | null | undefined> = {}, actif = true): Etat<T> {
  const [etat, setEtat] = useState<Etat<T>>({ donnees: null, erreur: null, chargement: true });
  const cle = JSON.stringify(parametres);

  useEffect(() => {
    if (!actif) return;
    let annule = false;
    setEtat((e) => ({ ...e, erreur: null, chargement: true }));
    obtenir<T>(chemin, parametres)
      .then((donnees) => !annule && setEtat({ donnees, erreur: null, chargement: false }))
      .catch((e: Error) => !annule && setEtat({ donnees: null, erreur: e.message, chargement: false }));
    return () => {
      annule = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chemin, cle, actif]);

  return etat;
}
