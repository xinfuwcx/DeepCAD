import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  AppstoreOutlined,
  ApartmentOutlined,
  AreaChartOutlined,
  SettingOutlined,
  GithubOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

const menuItems = [
    { key: '/geometry', path: '/geometry', icon: <AppstoreOutlined />, label: 'Geometry' },
    { key: '/meshing', path: '/meshing', icon: <ApartmentOutlined />, label: 'Meshing' },
    { key: '/analysis', path: '/analysis', icon: <AreaChartOutlined />, label: 'Analysis' },
    { key: '/settings', path: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  const activeKey = menuItems.find(item => location.pathname.startsWith(item.path))?.key || 'geometry';

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'source') {
      window.open('https://github.com/a-fr/DeepCAD', '_blank');
    } else {
      navigate(key);
    }
  };

  const allMenuItems = [
    ...menuItems.map(item => ({
      key: item.path,
      icon: item.icon,
      label: item.label,
    })),
    { type: 'divider' as const },
    {
      key: 'source',
      icon: <GithubOutlined />,
      label: 'Source',
    }
  ];

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={(value: boolean) => setCollapsed(value)}>
      <div style={{ height: '32px', margin: '16px', color: 'white', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
        {collapsed ? 'D' : 'DeepCAD'}
      </div>
      <Menu
        theme="dark"
        selectedKeys={[activeKey]}
        mode="inline"
        onClick={handleMenuClick}
        items={allMenuItems}
      />
    </Sider>
  );
}; 