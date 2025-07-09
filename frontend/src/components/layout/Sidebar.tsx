import React, { useState } from 'react';
import { Layout, Menu } from 'antd';
import { Link, useLocation } from 'react-router-dom';
import {
  AppstoreOutlined,
  ApartmentOutlined,
  AreaChartOutlined,
  SettingOutlined,
  GithubOutlined,
} from '@ant-design/icons';

const { Sider } = Layout;

const menuItems = [
    { key: 'geometry', path: '/geometry', icon: <AppstoreOutlined />, label: 'Geometry' },
    { key: 'meshing', path: '/meshing', icon: <ApartmentOutlined />, label: 'Meshing' },
    { key: 'analysis', path: '/analysis', icon: <AreaChartOutlined />, label: 'Analysis' },
    { key: 'settings', path: '/settings', icon: <SettingOutlined />, label: 'Settings' },
];

export const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(true);
  const location = useLocation();

  const activeKey = menuItems.find(item => location.pathname.startsWith(item.path))?.key || 'geometry';

  const handleSourceClick = () => {
    window.open('https://github.com/a-fr/DeepCAD', '_blank');
  };

  return (
    <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)}>
      <div style={{ height: '32px', margin: '16px', color: 'white', textAlign: 'center', fontSize: '18px', fontWeight: 'bold' }}>
        {collapsed ? 'D' : 'DeepCAD'}
      </div>
      <Menu 
        theme="dark" 
        selectedKeys={[activeKey]} 
        mode="inline"
      >
        {menuItems.map(item => (
            <Menu.Item key={item.key} icon={item.icon}>
                <Link to={item.path}>{item.label}</Link>
            </Menu.Item>
        ))}
        <Menu.Item key="source" icon={<GithubOutlined />} onClick={handleSourceClick}>
            Source
        </Menu.Item>
      </Menu>
    </Sider>
  );
}; 