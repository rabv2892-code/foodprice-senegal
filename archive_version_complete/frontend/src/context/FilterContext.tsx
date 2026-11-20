import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../api/client";
import { initialSource } from "../lib/sources";
import type { FilterOptionsResponse, GlobalFiltersState, SourceId } from "../types";

const DEFAULT_FILTERS: GlobalFiltersState = {
  source: "wfp",
  region: "ALL",
  market: "ALL",
  commodity: "ALL",
  category: "ALL",
  year: "",
  date_from: "",
  date_to: "",
  price_stage: "ALL",
};

interface FilterContextValue {
  filters: GlobalFiltersState;
  options: FilterOptionsResponse | null;
  loadingOptions: boolean;
  updateFilter: <K extends keyof GlobalFiltersState>(key: K, value: GlobalFiltersState[K]) => void;
  setSource: (source: SourceId) => void;
  resetFilters: () => void;
  demoOpen: boolean;
  setDemoOpen: (open: boolean) => void;
}

const FilterContext = createContext<FilterContextValue | undefined>(undefined);

export const FilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [filters, setFilters] = useState<GlobalFiltersState>(() => ({ ...DEFAULT_FILTERS, source: initialSource() }));
  const [options, setOptions] = useState<FilterOptionsResponse | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [demoOpen, setDemoOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setLoadingOptions(true);
    api
      .getFilters(
        filters.source,
        filters.region !== "ALL" ? filters.region : undefined,
        filters.category !== "ALL" ? filters.category : undefined
      )
      .then((res) => {
        if (!active) return;
        setOptions(res);
        // Clean cascading resets if current selection doesn't exist in new source/region/category
        setFilters((prev) => {
          let changed = false;
          const next = { ...prev };
          if (next.region !== "ALL" && !res.regions.includes(next.region)) {
            next.region = "ALL";
            changed = true;
          }
          if (next.market !== "ALL" && !res.markets.includes(next.market)) {
            next.market = "ALL";
            changed = true;
          }
          if (next.category !== "ALL" && !res.categories.includes(next.category)) {
            next.category = "ALL";
            changed = true;
          }
          if (next.commodity !== "ALL" && !res.commodities.includes(next.commodity)) {
            next.commodity = "ALL";
            changed = true;
          }
          if (next.year && !res.years.includes(Number(next.year))) {
            next.year = "";
            changed = true;
          }
          if (next.price_stage !== "ALL" && !res.stages.includes(next.price_stage)) {
            next.price_stage = "ALL";
            changed = true;
          }
          return changed ? next : prev;
        });
      })
      .catch(() => {
        // handled by UI banner
      })
      .finally(() => {
        if (active) setLoadingOptions(false);
      });
    return () => {
      active = false;
    };
  }, [filters.source, filters.region, filters.category]);

  const updateFilter = useCallback(
    <K extends keyof GlobalFiltersState>(key: K, value: GlobalFiltersState[K]) => {
      setFilters((prev) => {
        const next = { ...prev, [key]: value };
        if (key === "region") next.market = "ALL";
        if (key === "category") next.commodity = "ALL";
        if (key === "year" && value !== "") {
          next.date_from = "";
          next.date_to = "";
        }
        return next;
      });
    },
    []
  );

  const setSource = useCallback((source: SourceId) => {
    setFilters({ ...DEFAULT_FILTERS, source });
  }, []);

  const resetFilters = useCallback(() => {
    setFilters((prev) => ({ ...DEFAULT_FILTERS, source: prev.source }));
  }, []);

  return (
    <FilterContext.Provider
      value={{
        filters,
        options,
        loadingOptions,
        updateFilter,
        setSource,
        resetFilters,
        demoOpen,
        setDemoOpen,
      }}
    >
      {children}
    </FilterContext.Provider>
  );
};

export function useGlobalFilters(): FilterContextValue {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("Le hook useGlobalFilters doit être utilisé à l'intérieur de FilterProvider");
  return ctx;
}
