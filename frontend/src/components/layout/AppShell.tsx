import React, { useEffect } from 'react';
import { Layout, theme, Space } from 'antd';
import Sidebar from './Sidebar';
import { useWebSocket } from '../../api/websocket';
import TaskProgressIndicator from './TaskProgressIndicator';
import ThemeToggle from '../ThemeToggle';
import { useUIStore } from '../../stores/useUIStore';
import { useAIStore } from '../../stores/useAIStore';
import AIAssistant from '../AIAssistant';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'framer-motion';
import QuantumParticles from '../effects/QuantumParticles';
import Logo from '../Logo';

const { Header, Content } = Layout;

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { token } = theme.useToken();
  const { connect, isConnected } = useWebSocket();
  const { theme: appTheme, uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      theme: state.theme,
      uiMode: state.uiMode,
      particleEffectsEnabled: state.particleEffectsEnabled
    }))
  );
  const { isPanelOpen } = useAIStore();

  useEffect(() => {
    // 从 environment variables 或配置文件中获取WebSocket URL
    const wsUrl = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080/ws';
    if (!isConnected) {
      connect(wsUrl);
    }
  }, [connect, isConnected]);

  const isDarkMode = appTheme === 'dark';
  const isFusionMode = uiMode === 'fusion';
  const themeClass = isDarkMode ? 'dark-mode' : 'light-mode';
  const uiModeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';

  // 应用主题类到 body 元素
  useEffect(() => {
    document.body.className = `${themeClass} ${uiModeClass}`;
  }, [themeClass, uiModeClass]);

  return (
    <Layout className={`${themeClass} ${uiModeClass}`} style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      <Sidebar />
      <Layout style={{ background: 'transparent' }}>
        <Header 
          style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between', 
            padding: '0 24px', 
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            borderBottom: `1px solid var(--border-color)`,
            backdropFilter: 'blur(var(--glass-blur))',
            WebkitBackdropFilter: 'blur(var(--glass-blur))',
            boxShadow: '0 4px 30px var(--shadow-color)',
            height: '64px',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo size="medium" />
            <motion.span 
              className={isFusionMode ? 'quantum-text' : 'theme-text-gradient'}
              data-text="DeepCAD"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              style={{ 
                fontSize: '22px', 
                fontWeight: 'bold',
                letterSpacing: '1px'
              }}
            >
              DeepCAD
            </motion.span>
          </div>
          <Space size="large">
            <ThemeToggle />
            <TaskProgressIndicator />
          </Space>
        </Header>
        
        <Content style={{ 
          margin: '0 16px',
          display: 'flex',
          flexDirection: 'column',
          height: isPanelOpen ? 'calc(100vh - 380px)' : 'calc(100vh - 80px)'
        }}>
          <motion.div 
            className="theme-card"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ 
              padding: 0, 
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              position: 'relative',
              marginBottom: '16px'
            }}
          >
            {/* 科技感背景效果 */}
            {isFusionMode && (
              <div className="tech-background" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                pointerEvents: 'none',
                zIndex: 0,
                opacity: 0.4,
                background: `
                  radial-gradient(circle at 20% 35%, var(--quantum-blue) 0%, transparent 25%),
                  radial-gradient(circle at 75% 65%, var(--quantum-purple) 0%, transparent 25%)
                `
              }} />
            )}
            
            {/* 量子场效果 */}
            {isFusionMode && (
              <div className="quantum-field" />
            )}
            
            {/* 粒子效果 */}
            {isFusionMode && particleEffectsEnabled && (
              <QuantumParticles />
            )}
            
            <div style={{ 
              position: 'relative',
              zIndex: 1, 
              flex: 1,
              padding: '24px',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {children}
            </div>
          </motion.div>
        </Content>

        {/* 底部AI助手面板 */}
        {isPanelOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{
              margin: '0 16px 16px',
              height: '300px',
              borderRadius: '12px',
              overflow: 'hidden',
              border: 'var(--glass-border)',
              boxShadow: '0 -4px 20px var(--shadow-color)',
              backdropFilter: 'blur(var(--glass-blur))',
              WebkitBackdropFilter: 'blur(var(--glass-blur))',
              background: 'var(--bg-secondary)',
              zIndex: 50
            }}
          >
            <AIAssistant />
          </motion.div>
        )}
      </Layout>
    </Layout>
  );
};

export default AppShell; 