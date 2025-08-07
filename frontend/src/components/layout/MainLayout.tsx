/* eslint-disable react/jsx-no-inline-styles */
import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import {
  DashboardOutlined,
  AppstoreOutlined,
  BuildOutlined,
  CalculatorOutlined,
  BarChartOutlined,
  SettingOutlined,
  ExperimentOutlined,
  DatabaseOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';
import TechIcon from '../ui/TechIcon';
import TechLogo from '../ui/TechLogo';
import { ProjectControlCenter } from '../control/ProjectControlCenter';
import { DeepCADControlCenter } from '../control/DeepCADControlCenter';
import EnhancedMainWorkspaceView from '../../views/EnhancedMainWorkspaceView';
import PhysicsAIView from '../../views/PhysicsAIView';
import MaterialLibraryView from '../../views/MaterialLibraryView';
import SettingsView from '../../views/SettingsView';
import AIAssistantFloating from '../AIAssistantFloating';
import ComputationExpertView from '../../views/ComputationExpertView';
// import { ArchitectZeroUIController } from '../control/ArchitectZeroUIController';
// import { createArchitectZeroUIInterface } from '../../services/ArchitectZeroUIInterface';
import type { MapStyle } from '../../services/GeoThreeMapController';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 0号架构师UI控制接口初始化
  // const architectZeroUI = createArchitectZeroUIInterface(
  //   {
  //     enableAdvancedEffects: true,
  //     performanceMode: 'high',
  //     defaultMapStyle: 'street' as MapStyle,
  //     weatherUpdateInterval: 300000,
  //     projectSyncEnabled: true
  //   },
  //   {
  //     onNavigate: navigate,
  //     onLocationChange: (path) => console.log('架构师导航:', path)
  //   }
  // );

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制中心',
    },
    {
      key: 'geometry',
      icon: <AppstoreOutlined />,
      label: '几何建模',
      children: [
        {
          key: 'geology-environment',
          icon: <EnvironmentOutlined />,
          label: '地质环境',
          children: [
            {
              key: 'geology-reconstruction',
              label: '地质重建',
            },
            {
              key: 'tunnel-modeling',
              label: '隧道建模',
            },
            {
              key: 'adjacent-buildings',
              label: '相邻建筑',
            },
          ],
        },
        {
          key: 'excavation-design',
          label: '基坑设计',
        },
        {
          key: 'support-structure',
          label: '支护结构',
        },
      ],
    },
    {
      key: 'meshing',
      icon: <BuildOutlined />,
      label: '网格生成',
    },
    {
      key: 'analysis',
      icon: <CalculatorOutlined />,
      label: '计算分析',
    },
    {
      key: 'results',
      icon: <BarChartOutlined />,
      label: '结果查看',
    },
    {
      key: 'physics-ai',
      icon: <ExperimentOutlined />,
      label: '物理AI',
    },
    {
      key: 'materials',
      icon: <DatabaseOutlined />,
      label: '材料库',
    },
    {
      key: 'project-management',
      icon: <AppstoreOutlined />,
      label: '项目管理',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(`/workspace/${key}`);
  };

  // 根据当前路径获取对应的菜单key
  const getCurrentMenuKey = () => {
    const path = location.pathname;
    if (path.startsWith('/workspace/')) {
      return path.replace('/workspace/', '');
    }
    return path.replace('/', '') || 'dashboard';
  };



  return (
    <Layout style={{ height: '100vh', background: '#000011' }}>
      {/* 左侧导航面板 */}
      <Sider
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        width={280}
        style={{
          background: '#242830',
          borderRight: '1px solid #3c4043'
        }}
      >
        {/* Logo区域 */}
        <div style={{
          height: '64px',
          margin: '16px',
          background: '#2a2f38',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '8px',
          border: '1px solid #3c4043'
        }}>
          <TechLogo 
            size={collapsed ? 'small' : 'medium'}
            showText={!collapsed}
            animated={true}
            onClick={() => setCollapsed(!collapsed)}
          />
        </div>

        {/* 导航菜单 */}
        <Menu
          theme="dark"
          selectedKeys={[getCurrentMenuKey()]}
          mode="inline"
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '0 16px'
          }}
          styles={{
            item: {
              margin: '8px 0',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(10px)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: '#ffffff90',
              fontSize: '14px',
              fontWeight: 'normal',
              letterSpacing: '0.5px',
              transition: 'all 0.3s ease'
            },
            itemSelected: {
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(255, 0, 255, 0.15))',
              borderColor: '#00ffff80',
              color: '#ffffff',
              fontWeight: 'bold',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
            },
            itemHover: {
              background: 'rgba(0, 255, 255, 0.1)',
              borderColor: 'rgba(0, 255, 255, 0.3)',
              color: '#ffffff'
            },
            itemIcon: {
              color: 'inherit',
              fontSize: '16px'
            }
          }}
        />
      </Sider>

      {/* 右侧内容区域 */}
      <Layout>
        <Content style={{
          background: '#001122',
          height: '100%',
          position: 'relative'
        }}>
          <Routes>
            <Route path="/" element={
              <EnhancedMainWorkspaceView activeModule="excavation-design" />
            } />
            <Route path="dashboard" element={
              <DeepCADControlCenter onExit={() => {}} />
            } />
            <Route path="excavation-design" element={<EnhancedMainWorkspaceView activeModule="excavation-design" />} />
            <Route path="support-structure" element={<EnhancedMainWorkspaceView activeModule="support-structure" />} />
            <Route path="geology-reconstruction" element={<EnhancedMainWorkspaceView activeModule="geology-reconstruction" />} />
            <Route path="tunnel-modeling" element={<EnhancedMainWorkspaceView activeModule="tunnel-modeling" />} />
            <Route path="adjacent-buildings" element={<EnhancedMainWorkspaceView activeModule="adjacent-buildings" />} />
            <Route path="meshing" element={<EnhancedMainWorkspaceView activeModule="meshing" />} />
            <Route path="analysis" element={<EnhancedMainWorkspaceView activeModule="analysis" />} />
            <Route path="results" element={<EnhancedMainWorkspaceView activeModule="results" />} />
            <Route path="physics-ai" element={<PhysicsAIView />} />
            <Route path="materials" element={<MaterialLibraryView />} />
            <Route path="project-management" element={<DeepCADControlCenter onExit={() => {}} />} />
            <Route path="settings" element={<SettingsView />} />
            {/* 兼容性重定向：避免旧链接404 */}
            <Route path="computation" element={
              <div style={{ 
                padding: '24px', 
                textAlign: 'center',
                background: '#001122',
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <h2 style={{ color: '#00d9ff', marginBottom: '16px' }}>🔄 页面已重构</h2>
                <p style={{ color: '#ffffff80', marginBottom: '24px' }}>
                  计算功能已整合到对应的专业模块中
                </p>
                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                  <button 
                    onClick={() => navigate('meshing')}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#00d9ff', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    前往网格生成
                  </button>
                  <button 
                    onClick={() => navigate('analysis')}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#00d9ff', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    前往计算分析
                  </button>
                  <button 
                    onClick={() => navigate('physics-ai')}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#00d9ff', 
                      color: '#000', 
                      border: 'none', 
                      borderRadius: '4px',
                      cursor: 'pointer'
                    }}
                  >
                    前往物理AI
                  </button>
                </div>
              </div>
            } />
          </Routes>
        </Content>
        
        {/* 悬浮AI助手 - 右下角DeepCAD AI */}
        <AIAssistantFloating 
          position="bottom-right"
          defaultExpanded={false}
        />
        
      </Layout>
    </Layout>
  );
};

export default MainLayout;