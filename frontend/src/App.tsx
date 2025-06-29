/**
 * @file App.tsx
 * @description 深基坑CAE系统的根组件
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { Box, CssBaseline } from '@mui/material';

// 主题组件
import FigmaThemeProvider from './components/theme/FigmaThemeProvider';

// 布局组件
import MainLayout from './components/layout/MainLayout';

// 页面组件
import WelcomePage from './pages/WelcomePage';
import Dashboard from './pages/Dashboard';
import ExcavationAnalysis from './pages/ExcavationAnalysis';
import IgaAnalysisPage from './pages/IgaAnalysisPage';
import ProjectManagement from './pages/ProjectManagement';
import ResultVisualization from './pages/ResultVisualization';

// 认证组件
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// 数据组件
import DataImportExport from './components/data/DataImportExport';

// 包装WelcomePage组件，添加onProjectSelected属性
const WelcomePageWrapper = () => {
  const navigate = useNavigate();
  
  const handleProjectSelected = (projectId: string) => {
    if (projectId === 'new') {
      navigate('/projects');
    } else {
      navigate(`/excavation-analysis/${projectId}`);
    }
  };
  
  return <WelcomePage onProjectSelected={handleProjectSelected} />;
};

// 包装MainLayout组件，添加children属性
const MainLayoutWrapper = () => {
  return (
    <MainLayout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/excavation-analysis/:projectId" element={<ExcavationAnalysis />} />
        <Route path="/tunnel-modeling/:projectId" element={<div>隧道建模模块</div>} />
        <Route path="/foundation-analysis/:projectId" element={<div>地基基础模块</div>} />
        <Route path="/iga-analysis/:projectId" element={<IgaAnalysisPage />} />
        <Route path="/results/:projectId" element={<ResultVisualization />} />
        <Route path="/data-management" element={<DataImportExport />} />
        <Route path="/settings" element={<div>设置模块</div>} />
        <Route path="/help" element={<div>帮助模块</div>} />
      </Routes>
    </MainLayout>
  );
};

/**
 * @component App
 * @description 应用程序根组件
 */
function App() {
  return (
    <FigmaThemeProvider autoRefresh={false}>
      <AuthProvider>
        <Router>
          <Routes>
            {/* 公共路由 */}
            <Route path="/" element={<WelcomePageWrapper />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* 受保护的路由 */}
            <Route element={<ProtectedRoute />}>
              <Route path="/*" element={<MainLayoutWrapper />} />
            </Route>
            
            {/* 重定向 */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </FigmaThemeProvider>
  );
}

export default App;