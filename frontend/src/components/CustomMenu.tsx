import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  EyeOutlined,
  HeatMapOutlined,
  DatabaseOutlined,
  SettingOutlined,
  ExperimentOutlined,
  BgColorsOutlined,
  EnvironmentOutlined
} from '@ant-design/icons';

interface CustomMenuProps {
  activeModule: string;
  onItemClick: (key: string) => void;
  collapsed: boolean;
}

const CustomMenu: React.FC<CustomMenuProps> = ({ activeModule, onItemClick, collapsed }) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // 从当前路由获取活动模块
  const currentModule = location.pathname.substring(1) || 'dashboard';
  
  const handleItemClick = (key: string) => {
    
    // 导航到对应的路由
    navigate(`/${key}`);
    
    // 调用父组件的回调函数，更新activeModule状态
    if (onItemClick) {
      onItemClick(key);
    }
  };

  const menuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: '控制中心',
      description: '系统总览'
    },
    {
      key: 'geometry',
      icon: <AppstoreOutlined />,
      label: '几何建模',
      description: '模型创建'
    },
    {
      key: 'geology',
      icon: <EnvironmentOutlined />,
      label: '地质建模',
      description: '地质模型'
    },
    {
      key: 'meshing',
      icon: <ThunderboltOutlined />,
      label: '网格生成',
      description: '网格划分'
    },
    {
      key: 'analysis',
      icon: <RocketOutlined />,
      label: '仿真分析',
      description: 'CAE分析'
    },
    {
      key: 'results',
      icon: <HeatMapOutlined />,
      label: '结果可视化',
      description: 'CAE后处理云图分析'
    },
    {
      key: 'materials',
      icon: <DatabaseOutlined />,
      label: '材料库',
      description: '存储管理'
    },
    {
      key: 'ui-system',
      icon: <BgColorsOutlined />,
      label: 'UI设计系统',
      description: '界面定制'
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      description: '参数配置'
    }
  ];

  return (
    <div style={{ padding: '20px 0' }}>
      {menuItems.map((item) => (
        <Button
          key={item.key}
          type={currentModule === item.key ? 'primary' : 'default'}
          icon={item.icon}
          onClick={() => handleItemClick(item.key)}
          style={{
            width: '100%',
            height: 'auto',
            minHeight: '80px',
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-start',
            padding: '16px',
            textAlign: 'left',
            background: currentModule === item.key ? 'var(--primary-color)' : 'transparent',
            borderColor: currentModule === item.key ? 'var(--primary-color)' : 'var(--border-color)',
            color: currentModule === item.key ? 'white' : 'var(--text-primary)'
          }}
        >
          <div style={{ marginLeft: '12px' }}>
            {!collapsed && (
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', letterSpacing: '0.5px' }}>
                  {item.label}
                </div>
                <div style={{ fontSize: '0.7rem', marginTop: '2px', opacity: 0.8 }}>
                  {item.description}
                </div>
              </div>
            )}
          </div>
        </Button>
      ))}
    </div>
  );
};

export default CustomMenu;