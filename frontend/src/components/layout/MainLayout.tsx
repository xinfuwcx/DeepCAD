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
  CodeOutlined
} from '@ant-design/icons';
import TechIcon, { 
  TechGeologyIcon, 
  TechSupportIcon, 
  TechAnalysisIcon,
  RotatingIcon,
  ComputingIcon 
} from '../ui/TechIcon';
import TechLogo from '../ui/TechLogo';
import { ControlCenter } from '../control/ControlCenter';
import EnhancedMainWorkspaceView from '../../views/EnhancedMainWorkspaceView';
import PhysicsAIView from '../../views/PhysicsAIView';
import MaterialLibraryView from '../../views/MaterialLibraryView';
import SettingsView from '../../views/SettingsView';
import { ComponentExampleShowcase } from '../../examples/ComponentExamples';
import AIAssistantFloating from '../AIAssistantFloating';
import { ArchitectZeroUIController } from '../control/ArchitectZeroUIController';
import { createArchitectZeroUIInterface } from '../../services/ArchitectZeroUIInterface';
import type { MapStyle } from '../../services/GeoThreeController';

const { Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  
  // 0号架构师UI控制接口初始化
  const architectZeroUI = createArchitectZeroUIInterface(
    {
      enableAdvancedEffects: true,
      performanceMode: 'high',
      defaultMapStyle: 'street' as MapStyle,
      weatherUpdateInterval: 300000,
      projectSyncEnabled: true
    },
    {
      onNavigate: navigate,
      onLocationChange: (path) => console.log('架构师导航:', path)
    }
  );

  const menuItems = [
    {
      key: '/dashboard',
      icon: <TechIcon icon={DashboardOutlined} type="analysis" effects={{ halo: true }} />,
      label: '控制中心',
    },
    {
      key: '/geometry',
      icon: <TechGeologyIcon icon={AppstoreOutlined} effects={{ dataFlow: true }} />,
      label: '几何建模',
    },
    {
      key: '/meshing',
      icon: <TechSupportIcon icon={BuildOutlined} effects={{ energyBar: true }} />,
      label: '网格生成',
    },
    {
      key: '/analysis',
      icon: <ComputingIcon icon={CalculatorOutlined} type="analysis" />,
      label: '计算分析',
    },
    {
      key: '/results',
      icon: <TechIcon icon={BarChartOutlined} type="success" effects={{ pulse: true }} />,
      label: '结果查看',
    },
    {
      key: '/physics-ai',
      icon: <TechIcon icon={ExperimentOutlined} type="warning" effects={{ halo: true }} />,
      label: '物理AI',
    },
    {
      key: '/materials',
      icon: <TechIcon icon={DatabaseOutlined} type="geology" />,
      label: '材料库',
    },
    {
      key: '/examples',
      icon: <TechIcon icon={CodeOutlined} type="info" />,
      label: '开发示例',
    },
    {
      key: '/settings',
      icon: <RotatingIcon icon={SettingOutlined} type="info" />,
      label: '系统设置',
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#000011' }}>
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
          selectedKeys={[location.pathname]}
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
          minHeight: '100vh',
          position: 'relative'
        }}>
          <Routes>
            <Route path="/" element={
              <ControlCenter 
                onExit={() => navigate('/')}
                onProjectSelect={(projectId) => console.log('项目选择:', projectId)}
              />
            } />
            <Route path="/dashboard" element={
              <ControlCenter 
                onExit={() => navigate('/')}
                onProjectSelect={(projectId) => console.log('项目选择:', projectId)}
              />
            } />
            <Route path="/geometry" element={<EnhancedMainWorkspaceView activeModule="geometry" />} />
            <Route path="/meshing" element={<EnhancedMainWorkspaceView activeModule="meshing" />} />
            <Route path="/analysis" element={<EnhancedMainWorkspaceView activeModule="analysis" />} />
            <Route path="/results" element={<EnhancedMainWorkspaceView activeModule="results" />} />
            <Route path="/physics-ai" element={<PhysicsAIView />} />
            <Route path="/materials" element={<MaterialLibraryView />} />
            <Route path="/examples" element={<ComponentExampleShowcase />} />
            <Route path="/settings" element={<SettingsView />} />
          </Routes>
        </Content>
        
        {/* 悬浮AI助手 - 右下角DeepCAD AI */}
        <AIAssistantFloating 
          position="bottom-right"
          defaultExpanded={false}
        />
        
        {/* 0号架构师UI控制面板 - 右上角 */}
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          background: 'rgba(0, 0, 0, 0.8)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 212, 255, 0.3)',
          backdropFilter: 'blur(10px)'
        }}>
          <ArchitectZeroUIController 
            architectZero={architectZeroUI}
            isVisible={true}
            onClose={() => console.log('架构师面板关闭')}
            position="right"
          />
        </div>
      </Layout>
    </Layout>
  );
};

export default MainLayout;