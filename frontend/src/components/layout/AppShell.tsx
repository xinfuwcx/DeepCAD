import React from 'react';
import { Layout } from 'antd';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';

import GeometryView from '../../views/GeometryView';
import MeshingView from '../../views/MeshingView';
import AnalysisView from '../../views/AnalysisView';
import SettingsView from '../../views/SettingsView';

const { Header, Content } = Layout;

const AppShell: React.FC = () => {
  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header style={{ padding: 0, background: '#1f1f1f' }} >
          {/* Top toolbar can go here */}
        </Header>
        <Content style={{ margin: '24px 16px 0' }}>
          <div style={{ padding: 24, minHeight: 360, background: '#1f1f1f', height: 'calc(100vh - 88px)' }}>
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