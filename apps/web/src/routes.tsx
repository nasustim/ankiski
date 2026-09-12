import { Route, Routes } from "react-router";
import { Layout } from "./components/Layout.tsx";
import { AddPage } from "./pages/AddPage.tsx";
import { ExportPage } from "./pages/ExportPage.tsx";
import { SettingsPage } from "./pages/SettingsPage.tsx";
import { TermsPage } from "./pages/TermsPage.tsx";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<TermsPage />} />
        <Route path="add" element={<AddPage />} />
        <Route path="export" element={<ExportPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<TermsPage />} />
      </Route>
    </Routes>
  );
}
