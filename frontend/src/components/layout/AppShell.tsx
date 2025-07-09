import React from 'react';
import { Layout, theme } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

import TaskProgressIndicator from './TaskProgressIndicator';

import GeometryView from '../../views/GeometryView';
import MeshingView from '../../views/MeshingView';
import AnalysisView from '../../views/AnalysisView';
import SettingsView from '../../views/SettingsView';

const { Header, Content } = Layout;

const AppShell: React.FC = () => {
  const { token } = theme.useToken();

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
            <Routes>
              <Route path="/" element={<Navigate to="/geometry" replace />} />
              <Route path="/geometry" element={<GeometryView />} />
              <Route path="/meshing" element={<MeshingView />} />
              <Route path="/analysis" element={<AnalysisView />} />
              <Route path="/settings" element={<SettingsView />} />
            </Routes>
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AppShell; 