import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { SelectionProvider } from "./context/SelectionContext";
import { AnalysePrixPage } from "./pages/AnalysePrixPage";
import { ComparaisonMarchesPage } from "./pages/ComparaisonMarchesPage";
import { DashboardPage } from "./pages/DashboardPage";
import { EtudesStatistiquesPage } from "./pages/EtudesStatistiquesPage";
import { GuidePage } from "./pages/GuidePage";
import { PrevisionsPage } from "./pages/PrevisionsPage";

export const AppRoutes: React.FC = () => (
  <SelectionProvider>
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/analyse-des-prix" element={<AnalysePrixPage />} />
        <Route path="/comparaison-des-marches" element={<ComparaisonMarchesPage />} />
        <Route path="/etudes-statistiques" element={<EtudesStatistiquesPage />} />
        <Route path="/previsions" element={<PrevisionsPage />} />
        <Route path="/guide" element={<GuidePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  </SelectionProvider>
);

export const App: React.FC = () => (
  <BrowserRouter>
    <AppRoutes />
  </BrowserRouter>
);

export default App;
