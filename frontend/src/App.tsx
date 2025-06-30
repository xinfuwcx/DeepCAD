/**
 * @file App.tsx
 * @description 深基坑CAE系统 - 未来科技风主应用
 * 🚀 Welcome to the Future of CAE Engineering
 * @author Deep Excavation Team × GitHub Copilot
 * @version 2.0.0 - Futuristic Edition
 * @copyright 2025
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { 
  Box, 
  CssBaseline, 
  ThemeProvider, 
  createTheme,
  alpha,
  Fade,
  CircularProgress,
  Typography
} from '@mui/material';

// 🎨 主题系统
import FigmaThemeProvider from './components/theme/FigmaThemeProvider';
import { defaultTokens } from './styles/tokens/defaultTokens';

// 🌟 未来科技风页面
import FuturisticDashboard from './pages/FuturisticDashboard';

// 📦 传统页面（向后兼容）
import Dashboard from './pages/Dashboard';
import ExcavationAnalysis from './pages/ExcavationAnalysis';
import ProjectManagement from './pages/ProjectManagement';
import ResultVisualization from './pages/ResultVisualization';
import FemAnalysisPage from './pages/FemAnalysisPage';
import MeshingPage from './pages/MeshingPage';
import PhysicsAIPage from './pages/PhysicsAIPage';
import WelcomePage from './pages/WelcomePage';

// 🔐 认证系统
import { AuthProvider } from './components/auth/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Login from './components/auth/Login';
import Register from './components/auth/Register';

// � 通知系统
import { AlertProvider } from './components/common/AlertProvider';

// �📊 数据组件
import DataImportExport from './components/data/DataImportExport';

// 🌌 启动动画组件
const StartupAnimation: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<'loading' | 'ready' | 'complete'>('loading');

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + Math.random() * 15;
        if (next >= 100) {
          setPhase('ready');
          setTimeout(() => {
            setPhase('complete');
            setTimeout(onComplete, 500);
          }, 800);
          return 100;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: `linear-gradient(135deg, 
          ${defaultTokens.colors.quantum.primary} 0%,
          ${defaultTokens.colors.quantum.secondary} 50%,
          ${defaultTokens.colors.quantum.accent} 100%)`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        '&::before': {
          content: '""',
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: `radial-gradient(circle at 30% 20%, 
            ${alpha(defaultTokens.colors.neon.glowBlue, 0.3)} 0%,
            transparent 50%),
            radial-gradient(circle at 70% 80%, 
            ${alpha(defaultTokens.colors.neon.glowPink, 0.2)} 0%,
            transparent 50%)`,
          animation: 'pulse 3s ease-in-out infinite',
        },
      }}
    >
      {/* 🎯 量子Logo */}
      <Box
        sx={{
          position: 'relative',
          mb: 4,
          animation: phase === 'ready' ? 'glow 1s ease-in-out' : 'none',
          '@keyframes glow': {
            '0%': { filter: 'brightness(1)' },
            '50%': { filter: 'brightness(1.5) saturate(1.5)' },
            '100%': { filter: 'brightness(1)' },
          },
        }}
      >
        <Typography
          variant="h2"
          sx={{
            background: `linear-gradient(45deg, 
              ${defaultTokens.colors.neon.glowBlue},
              ${defaultTokens.colors.neon.glowPink},
              ${defaultTokens.colors.neon.orange})`,
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            color: 'transparent',
            fontWeight: 800,
            letterSpacing: '0.2em',
            textShadow: `0 0 30px ${alpha(defaultTokens.colors.neon.glowBlue, 0.5)}`,
          }}
        >
          DEEP EXCAVATION
        </Typography>
        <Typography
          variant="subtitle1"
          sx={{
            color: defaultTokens.colors.neon.glowBlue,
            textAlign: 'center',
            mt: 1,
            fontWeight: 300,
            letterSpacing: '0.1em',
            opacity: 0.8,
          }}
        >
          Next-Generation CAE System
        </Typography>
      </Box>

      {/* 🔄 量子进度条 */}
      <Box sx={{ position: 'relative', display: 'inline-flex', mb: 2 }}>
        <CircularProgress
          variant="determinate"
          value={progress}
          size={60}
          thickness={2}
          sx={{
            color: defaultTokens.colors.neon.glowBlue,
            filter: `drop-shadow(0 0 10px ${defaultTokens.colors.neon.glowBlue})`,
          }}
        />
        <Box
          sx={{
            top: 0,
            left: 0,
            bottom: 0,
            right: 0,
            position: 'absolute',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="caption"
            component="div"
            sx={{ 
              color: defaultTokens.colors.neon.blue,
              fontWeight: 600,
            }}
          >
            {Math.round(progress)}%
          </Typography>
        </Box>
      </Box>

      {/* 📊 系统状态 */}
      <Typography
        variant="body2"
        sx={{
          color: alpha(defaultTokens.colors.neon.blue, 0.7),
          mt: 2,
          textAlign: 'center',
          minHeight: '20px',
        }}
      >
        {phase === 'loading' && 'Initializing quantum computing matrix...'}
        {phase === 'ready' && '✨ System ready - Entering the future'}
        {phase === 'complete' && '🚀 Welcome to the future!'}
      </Typography>
    </Box>
  );
};

// 🛡️ 未来科技风路由布局
const FuturisticAppLayout: React.FC = () => {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        background: `linear-gradient(135deg, 
          #0a0a0a 0%, 
          #1a1a2e 50%, 
          #16213e 100%)`,
        overflow: 'hidden',
      }}
    >
      <Routes>
        {/* 🌟 主仪表板 - 未来科技风入口 */}
        <Route path="/dashboard" element={<FuturisticDashboard />} />
        
        {/* 📊 传统功能页面 */}
        <Route path="/projects" element={<ProjectManagement />} />
        <Route path="/excavation-analysis/:projectId" element={<ExcavationAnalysis />} />
        <Route path="/results/:projectId" element={<ResultVisualization />} />
        <Route path="/data-management" element={<DataImportExport />} />
        <Route path="/fem-analysis" element={<FemAnalysisPage />} />
        <Route path="/meshing" element={<MeshingPage />} />
        <Route path="/physics-ai" element={<PhysicsAIPage />} />
        <Route path="/legacy-dashboard" element={<Dashboard />} />
        <Route path="/legacy-welcome" element={<WelcomePage onProjectSelected={() => {}} />} />
        
        {/* 🔗 默认重定向到未来仪表板 */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Box>
  );
};

/**
 * @component App
 * @description 🚀 未来科技风深基坑CAE系统主应用
 * 
 * 特色功能：
 * - 🌌 量子启动动画
 * - 🎯 AI驱动的预测界面
 * - 🌟 全息3D数据可视化
 * - ⚡ 实时计算监控
 * - 🔮 三工作流协同
 */
function App() {
  const [isLoading, setIsLoading] = useState(true);

  const handleStartupComplete = () => {
    setIsLoading(false);
  };

  return (
    <FigmaThemeProvider autoRefresh={false}>
      <CssBaseline />
      <AlertProvider>
        <Router>
          <AuthProvider>
          {/* 🌌 启动动画层 */}
          {isLoading && (
            <Fade in={isLoading}>
              <Box>
                <StartupAnimation onComplete={handleStartupComplete} />
              </Box>
            </Fade>
          )}

          {/* 🚀 主应用层 */}
          <Fade in={!isLoading} timeout={1000}>
            <Box>
              <Routes>
                {/* 🔐 认证路由 */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                
                {/* 🛡️ 受保护的未来科技风应用 */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/*" element={<FuturisticAppLayout />} />
                </Route>
              </Routes>
            </Box>
          </Fade>
        </AuthProvider>
      </Router>
    </AlertProvider>
  </FigmaThemeProvider>
  );
}

export default App;