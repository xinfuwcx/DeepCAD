import React, { useEffect } from 'react';
import { Layout, theme, Space } from 'antd';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../../api/websocket';
import TaskProgressIndicator from './TaskProgressIndicator';
import ThemeToggle from '../ThemeToggle';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

const { Header, Content } = Layout;

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { token } = theme.useToken();
  const { connect, isConnected } = useWebSocket();
  const { theme: appTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [connect, isConnected]);

  const isDarkMode = appTheme === 'dark';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          padding: '0 24px', 
          background: token.colorBgContainer 
        }}>
          <div>{/* Can place breadcrumbs or other info here */}</div>
          <Space>
            <ThemeToggle />
            <TaskProgressIndicator />
          </Space>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div 
            style={{ 
              padding: 24, 
              minHeight: 360, 
              background: isDarkMode ? 'transparent' : token.colorBgContainer, 
              height: 'calc(100vh - 88px)',
              borderRadius: 8,
              transition: 'all 0.3s ease'
            }}
            className={isDarkMode ? '' : 'theme-card'}
          >
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell; 