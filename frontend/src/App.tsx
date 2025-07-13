import React from 'react';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';

// 导入视图组件
import LandingView from './views/LandingView';
import DashboardView from './views/DashboardView';
import GeometryView from './views/GeometryView';
import MeshingView from './views/MeshingView';
import AnalysisView from './views/AnalysisView';
import ResultsView from './views/ResultsView';
import ResultsListView from './views/ResultsListView';
import MaterialsView from './views/MaterialsView';
import SettingsView from './views/SettingsView';
import UserSettingsView from './views/UserSettingsView';
import HelpView from './views/HelpView';
import DataDrivenView from './views/DataDrivenView';
import GeologyView from './views/GeologyView';
import ExcavationView from './views/ExcavationView';
import DXFImportView from './views/DXFImportView';

const App: React.FC = () => {
  return (
    <AppShell>
      <Routes>
        <Route path="/dashboard" element={<DashboardView />} />
        <Route path="/geometry" element={<GeometryView />} />
        <Route path="/geology" element={<GeologyView />} />
        <Route path="/excavation" element={<ExcavationView />} />
        <Route path="/meshing" element={<MeshingView />} />
        <Route path="/analysis" element={<AnalysisView />} />
        <Route path="/results/:id" element={<ResultsView />} />
        <Route path="/results" element={<ResultsListView />} />
        <Route path="/materials" element={<MaterialsView />} />
        <Route path="/dxf-import" element={<DXFImportView />} />
        <Route path="/settings" element={<SettingsView />} />
        <Route path="/user-settings" element={<UserSettingsView />} />
        <Route path="/help" element={<HelpView />} />
        <Route path="/data-driven" element={<DataDrivenView />} />
        <Route path="/" element={<LandingView />} />
      </Routes>
    </AppShell>
  );
};

export default App; 