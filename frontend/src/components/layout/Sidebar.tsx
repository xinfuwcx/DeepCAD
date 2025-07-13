import React, { useState } from 'react';
import { Layout, Menu, Tooltip, Button, Badge } from 'antd';
import {
  HomeOutlined,
  AppstoreOutlined,
  BuildOutlined,
  BarChartOutlined,
  SettingOutlined,
  QuestionCircleOutlined,
  DatabaseOutlined,
  ExperimentOutlined,
  RocketOutlined,
  DashboardOutlined,
  GatewayOutlined,
  BulbOutlined as BrainOutlined // 使用 BulbOutlined 替代 BulbOutlined as BrainOutlined
} from '@ant-design/icons';
import { Link, useLocation } from 'react-router-dom';
import { useUIStore } from '../../stores/useUIStore';
import { useAIStore } from '../../stores/useAIStore';
import { useShallow } from 'zustand/react/shallow';
import { motion } from 'framer-motion';

const { Sider } = Layout;

const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { theme: appTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );
  const { isPanelOpen, togglePanel } = useAIStore(
    useShallow(state => ({
      isPanelOpen: state.isPanelOpen,
      togglePanel: state.togglePanel
    }))
  );

  const isDarkMode = appTheme === 'dark';

  // 菜单项定义
  const menuItems = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: <Link to="/">首页</Link>,
    },
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: <Link to="/dashboard">工作台</Link>,
    },
    {
      key: '/geometry',
      icon: <AppstoreOutlined />,
      label: <Link to="/geometry">几何建模</Link>,
    },
    {
      key: '/geology',
      icon: <GatewayOutlined />,
      label: <Link to="/geology">地质建模</Link>,
    },
    {
      key: '/excavation',
      icon: <BuildOutlined style={{ transform: 'scaleX(-1)' }} />, // Mirrored icon
      label: <Link to="/excavation">基坑开挖</Link>,
    },
    {
      key: '/meshing',
      icon: <BuildOutlined />,
      label: <Link to="/meshing">网格划分</Link>,
    },
    {
      key: '/analysis',
      icon: <ExperimentOutlined />,
      label: <Link to="/analysis">分析计算</Link>,
    },
    {
      key: '/results',
      icon: <BarChartOutlined />,
      label: <Link to="/results">结果查看</Link>,
    },
    {
      key: '/materials',
      icon: <DatabaseOutlined />,
      label: <Link to="/materials">材料库</Link>,
    },
    {
      key: '/data-driven',
      icon: <RocketOutlined />,
      label: <Link to="/data-driven">数据驱动</Link>,
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: <Link to="/settings">设置</Link>,
    },
    {
      key: '/help',
      icon: <QuestionCircleOutlined />,
      label: <Link to="/help">帮助</Link>,
    },
  ];

  // 获取当前选中的菜单项
  const selectedKeys = [location.pathname];

  return (
    <Sider
      collapsible
      collapsed={collapsed}
      onCollapse={setCollapsed}
      theme={isDarkMode ? "dark" : "light"}
      width={220}
      style={{
        background: 'var(--bg-secondary)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderRight: 'var(--glass-border)',
        boxShadow: '4px 0 24px var(--shadow-color)',
        zIndex: 1000,
        height: '100vh',
        position: 'sticky',
        top: 0,
        left: 0
      }}
    >
      <motion.div 
        className="logo"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ 
          height: '64px', 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-primary)',
          borderBottom: 'var(--glass-border)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <span className={collapsed ? '' : 'theme-text-gradient'} style={{
          fontSize: collapsed ? '24px' : '28px',
          fontWeight: 'bold',
          letterSpacing: '1px',
          display: 'block'
        }}>
          {!collapsed && 'DeepCAD'}
          {collapsed && 'D'}
        </span>
        
        {/* 霓虹光效果 */}
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: '1px',
          background: 'var(--gradient-blue)',
          opacity: 0.6
        }} />
      </motion.div>
      
      <Menu
        theme={isDarkMode ? "dark" : "light"}
        mode="inline"
        selectedKeys={selectedKeys}
        items={menuItems.map((item, index) => ({
          ...item,
          icon: (
            <Tooltip title={collapsed ? item.label.props.children : ''} placement="right">
              <motion.span
                initial={{ x: -10, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.1 + index * 0.05, duration: 0.5 }}
              >
                {item.icon}
              </motion.span>
            </Tooltip>
          )
        }))}
        className="theme-menu"
        style={{
          background: 'transparent',
          border: 'none'
        }}
      />
      
      {/* AI助手按钮 */}
      <div style={{
        position: 'absolute',
        bottom: '80px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        padding: collapsed ? '8px' : '16px'
      }}>
        <Tooltip title={collapsed ? "AI助手" : ""} placement="right">
          <Badge dot={!isPanelOpen && !collapsed} color="#722ed1">
            <Button
              type={isPanelOpen ? "primary" : "default"}
              icon={<BrainOutlined />}
              onClick={togglePanel}
              style={{
                background: isPanelOpen 
                  ? 'linear-gradient(45deg, #722ed1, #1890ff)'
                  : 'var(--bg-tertiary)',
                borderColor: isPanelOpen ? '#722ed1' : 'var(--border-color)',
                color: 'white',
                width: collapsed ? '40px' : '100%',
                height: '40px',
                borderRadius: '8px',
                boxShadow: isPanelOpen 
                  ? '0 4px 15px rgba(114, 46, 209, 0.4)' 
                  : '0 2px 8px var(--shadow-color)',
                transition: 'all 0.3s ease'
              }}
            >
              {!collapsed && (isPanelOpen ? 'AI助手 (开启)' : 'AI助手')}
            </Button>
          </Badge>
        </Tooltip>
      </div>

      {/* 底部装饰效果 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '0',
        right: '0',
        display: 'flex',
        justifyContent: 'center',
        opacity: collapsed ? 0 : 0.6,
        transition: 'opacity 0.3s ease'
      }}>
        <div style={{
          width: '80%',
          height: '4px',
          background: 'var(--gradient-primary)',
          borderRadius: '2px',
          filter: 'blur(2px)'
        }} />
      </div>
    </Sider>
  );
};

export default Sidebar; 