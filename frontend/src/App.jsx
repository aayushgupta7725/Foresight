import React from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { AppDataProvider, useAppData } from './context/AppDataContext';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

// Pages
import Dashboard        from './pages/Dashboard';
import ProjectsList     from './pages/ProjectsList';
import ProjectDetail    from './pages/ProjectDetail';
import EarlyWarnings    from './pages/EarlyWarnings';
import RiskPredictor    from './pages/RiskPredictor';
import PeerBenchmarking from './pages/PeerBenchmarking';
import WhatIfSimulator  from './pages/WhatIfSimulator';
import UploadSnapshots  from './pages/UploadSnapshots';
import SettingsMappings from './pages/SettingsMappings';

const PATH_LABELS = {
  '/':                   'Dashboard',
  '/projects':           'Projects List',
  '/early-warnings':     'Early Warnings',
  '/risk-predictor':     'Risk Predictor & SHAP',
  '/peer-benchmarking':  'Peer Benchmarking',
  '/what-if':            'What-If Simulator',
  '/upload':             'Upload & Snapshots',
  '/settings':           'Settings & Mappings',
};

function AppInner() {
  const navigate       = useNavigate();
  const location       = useLocation();
  const { activeSnapshot, applySearch } = useAppData();

  const activePage = PATH_LABELS[location.pathname] ?? 'Dashboard';

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      background: '#f0f2f5',
    }}>
      <Sidebar
        activePage={activePage}
        activeSnapshot={activeSnapshot}
        onNavigate={(path) => navigate(path)}
      />

      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
        <Header
          activeSnapshot={activeSnapshot}
          onSearch={applySearch}
        />

        <Routes>
          <Route path="/"                  element={<Dashboard />} />
          <Route path="/projects"          element={<ProjectsList />} />
          <Route path="/projects/:id"      element={<ProjectDetail />} />
          <Route path="/early-warnings"    element={<EarlyWarnings />} />
          <Route path="/risk-predictor"    element={<RiskPredictor />} />
          <Route path="/peer-benchmarking" element={<PeerBenchmarking />} />
          <Route path="/what-if"           element={<WhatIfSimulator />} />
          <Route path="/what-if/:id"       element={<WhatIfSimulator />} />
          <Route path="/upload"            element={<UploadSnapshots />} />
          <Route path="/settings"          element={<SettingsMappings />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <AppInner />
      </AppDataProvider>
    </BrowserRouter>
  );
}
