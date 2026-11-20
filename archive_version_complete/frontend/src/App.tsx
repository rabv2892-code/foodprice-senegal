import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { FilterProvider } from "./context/FilterContext";
import { CommoditiesPage } from "./pages/CommoditiesPage";
import { DataQualityPage } from "./pages/DataQualityPage";
import { EnergyTransportPage } from "./pages/EnergyTransportPage";
import { ExecutiveDashboardPage } from "./pages/ExecutiveDashboardPage";
import { ExplorerPage } from "./pages/ExplorerPage";
import { ForecastPage } from "./pages/ForecastPage";
import { GeographyPage } from "./pages/GeographyPage";
import { GuidePage } from "./pages/GuidePage";
import { MarketComparePage } from "./pages/MarketComparePage";
import { OverviewPage } from "./pages/OverviewPage";
import { PriceAnalysisPage } from "./pages/PriceAnalysisPage";
import { ProductionPage } from "./pages/ProductionPage";
import { ProductsPage } from "./pages/ProductsPage";
import { ReportsPage } from "./pages/ReportsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { StatisticsPage } from "./pages/StatisticsPage";
import { TemporalPage } from "./pages/TemporalPage";

export const AppRoutes: React.FC = () => (
  <FilterProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<ExecutiveDashboardPage />} />
        <Route path="/analyses" element={<OverviewPage />} />
        <Route path="/explorer" element={<ExplorerPage />} />
        <Route path="/prices" element={<PriceAnalysisPage />} />
        <Route path="/products" element={<ProductsPage />} />
        <Route path="/geography" element={<GeographyPage />} />
        <Route path="/temporal" element={<TemporalPage />} />
        <Route path="/markets" element={<MarketComparePage />} />
        <Route path="/statistics" element={<StatisticsPage />} />
        <Route path="/forecast" element={<ForecastPage />} />
        <Route path="/commodities" element={<CommoditiesPage />} />
        <Route path="/production" element={<ProductionPage />} />
        <Route path="/energy-transport" element={<EnergyTransportPage />} />
        <Route path="/quality" element={<DataQualityPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  </FilterProvider>
);

export const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
