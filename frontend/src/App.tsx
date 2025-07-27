import React, { useEffect, ErrorInfo, Component, ReactNode } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DeepCADAdvancedApp from './components/advanced/DeepCADAdvancedApp';
import MainLayout from './components/layout/MainLayout';
import { DeepCADThemeProvider } from './components/ui/DeepCADTheme';
import './index.css';

// 错误边界组件
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeepCAD Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          width: '100vw',
          height: '100vh',
          background: 'linear-gradient(135deg, #0a0a0a 0%, #171717 100%)',
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          textAlign: 'center',
          padding: '40px'
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.1)',
            padding: '40px',
            borderRadius: '16px',
            border: '1px solid rgba(99,102,241,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <h1 style={{ 
              fontSize: '32px', 
              marginBottom: '20px',
              background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              🚀 DeepCAD Loading...
            </h1>
            <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '30px' }}>
              正在初始化世界级深基坑CAE平台组件系统
            </p>
            <div style={{ fontSize: '14px', opacity: 0.6 }}>
              组件加载中，请稍候...
            </div>
            <button 
              onClick={() => window.location.reload()}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                background: 'linear-gradient(45deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              重新加载
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  useEffect(() => {
    // 设置页面标题和主题
    document.title = 'DeepCAD - 世界级深基坑CAE平台';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#0a0a0a';
    document.body.style.overflow = 'hidden';
    
    // 添加加载日志
    console.log('🚀 DeepCAD App Starting...');
  }, []);

  return (
    <ErrorBoundary>
      <DeepCADThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* 默认首页 - 欢迎界面 */}
            <Route path="/" element={<DeepCADAdvancedApp />} />
            <Route path="/welcome" element={<DeepCADAdvancedApp />} />
            <Route path="/landing" element={<DeepCADAdvancedApp />} />
            {/* 主工作系统 - 包含所有workspace路由 */}
            <Route path="/workspace/*" element={<MainLayout />} />
          </Routes>
        </BrowserRouter>
      </DeepCADThemeProvider>
    </ErrorBoundary>
  );
};

export default App;