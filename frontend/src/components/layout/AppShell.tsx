import React, { useEffect } from 'react';
import { Layout, theme } from 'antd';
import { Sidebar } from './Sidebar';
import { useWebSocket } from '../../api/websocket';
import TaskProgressIndicator from './TaskProgressIndicator';

const { Header, Content } = Layout;

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const { token } = theme.useToken();
  const { connect, isConnected } = useWebSocket();

  useEffect(() => {
    if (!isConnected) {
      connect();
    }
  }, [connect, isConnected]);

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
          <div>
            <TaskProgressIndicator />
          </div>
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 360, background: token.colorBgContainer, height: 'calc(100vh - 88px)' }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell; 