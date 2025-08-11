/**
 * DeepCAD主应用组件
 * 深基坑CAE平台的根组件
 */
import React, { useEffect, Component, ReactNode, ErrorInfo } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import QuickViewportTest from './views/QuickViewportTest';
import DeepCADAdvancedApp from './components/advanced/DeepCADAdvancedApp';
import MainLayout from './components/layout/MainLayout';
import { DeepCADThemeProvider } from './components/ui/DeepCADTheme';
import { DeepCADControlCenter } from './components/control';
import './index.css';
// Core unified loops
import { startTimelineLoop } from './core/timelineStore';
import { startRendererScheduler } from './core/rendererScheduler';

// Feature flags (could be moved to config)
const ENABLE_NEW_CORE = true;

/**
 * 错误边界组件
 * 捕获和处理应用运行时错误
 */
class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  /**
   * 捕获错误并更新状态
   */
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  /**
   * 记录错误信息
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeepCAD应用错误:', error);
    console.error('错误堆栈:', error.stack);
    console.error('组件堆栈:', errorInfo.componentStack);
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
              🚀 DeepCAD 加载中...
            </h1>
            <p style={{ fontSize: '18px', opacity: 0.8, marginBottom: '30px' }}>
              正在初始化深基坑CAE平台
            </p>
            <div style={{ fontSize: '14px', opacity: 0.6, marginBottom: '20px' }}>
              系统启动中，请稍候...
            </div>
            {this.state.error && (
              <div style={{ 
                fontSize: '12px', 
                opacity: 0.8, 
                backgroundColor: 'rgba(255,0,0,0.1)', 
                padding: '10px', 
                borderRadius: '4px',
                maxHeight: '200px',
                overflow: 'auto',
                marginBottom: '20px'
              }}>
                <strong>错误详情:</strong><br/>
                {this.state.error.message}<br/>
                <details style={{ marginTop: '10px' }}>
                  <summary style={{ cursor: 'pointer' }}>查看详细信息</summary>
                  <pre style={{ fontSize: '10px', marginTop: '5px' }}>
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
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

/**
 * 主应用组件
 */
const App: React.FC = () => {
  useEffect(() => {
    // 设置页面基本信息
    document.title = 'DeepCAD - 深基坑CAE平台';
    document.body.style.margin = '0';
    document.body.style.padding = '0';
    document.body.style.backgroundColor = '#0a0a0a';
    document.body.style.overflow = 'hidden';

    if (ENABLE_NEW_CORE) {
      startTimelineLoop();
      startRendererScheduler();
    }
  }, []);

  return (
    <ErrorBoundary>
      <DeepCADThemeProvider>
        <BrowserRouter>
          <Routes>
            {/* 欢迎页面路由 */}
            <Route path="/" element={<DeepCADAdvancedApp />} />
            <Route path="/welcome" element={<DeepCADAdvancedApp />} />
            <Route path="/landing" element={<DeepCADAdvancedApp />} />
            
            {/* 控制中心路由 */}
            <Route path="/control-center" element={<DeepCADControlCenter onExit={() => window.history.back()} />} />
            <Route path="/control-center-demo" element={<DeepCADControlCenter onExit={() => window.history.back()} />} />
            <Route path="/amap-control-center" element={<DeepCADControlCenter onExit={() => window.history.back()} />} />
            
            {/* 主工作区路由 */}
            <Route path="/workspace/*" element={<MainLayout />} />
            {/* 最小化 3D 视口快速验证路由 */}
            <Route path="/pv3d" element={<QuickViewportTest />} />
          </Routes>
        </BrowserRouter>
      </DeepCADThemeProvider>
    </ErrorBoundary>
  );
};

export default App;