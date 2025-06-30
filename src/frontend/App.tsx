import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import FemResultVisualization from './pages/FemResultVisualization';
import FuturisticDashboard from './pages/FuturisticDashboard';
import ParameterInversionPage from './pages/ParameterInversionPage';
import QuantumThemeProvider from './components/theme/QuantumThemeProvider';

/**
 * 应用程序主入口
 */
const App: React.FC = () => {
  return (
    <QuantumThemeProvider>
      <Router>
        <Routes>
          <Route path="/dashboard" element={<FuturisticDashboard />} />
          <Route path="/fem-results" element={<FemResultVisualization />} />
          <Route path="/parameter-inversion" element={<ParameterInversionPage />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </QuantumThemeProvider>
  );
};

export default App; 