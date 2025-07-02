/**
 * 深基坑CAE系统 - 主应用组件
 * 
 * 基于FreeCAD架构设计的深基坑专业CAE系统
 */

import React from 'react';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

// 导入自定义主题
import { theme } from './styles/theme';

// 导入布局组件
import MainLayout from './components/layout/MainLayout';

// 导入页面组件
import Dashboard from './pages/Dashboard';
import ExcavationAnalysis from './pages/ExcavationAnalysis';
import FemAnalysisPage from './pages/FemAnalysisPage';
import NotFound from './pages/NotFound';

/**
 * 应用主组件
 */
const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/excavation" element={<ExcavationAnalysis />} />
            <Route path="/fem-analysis" element={<FemAnalysisPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </MainLayout>
      </Router>
    </ThemeProvider>
  );
};

export default App; 