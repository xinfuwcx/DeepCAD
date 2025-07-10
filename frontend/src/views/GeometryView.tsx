import React, { useState } from 'react';
import { Layout } from 'antd';
import Viewport from '../components/Viewport';
import SceneTree from '../components/SceneTree';
import PropertyEditor from '../components/PropertyEditor';

const { Sider, Content } = Layout;

const GeometryView: React.FC = () => {
  const [siderCollapsed, setSiderCollapsed] = useState(false);

  return (
    <Layout style={{ height: '100%', background: 'transparent' }}>
      <Sider
        theme="light"
        collapsible
        collapsed={siderCollapsed}
        onCollapse={(collapsed) => setSiderCollapsed(collapsed)}
        width={300}
        style={{ 
          height: '100%', 
          background: '#2c2c2c',
          borderRight: '1px solid #424242'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div style={{ flex: 1, overflowY: 'auto', borderBottom: '1px solid #424242' }}>
            <SceneTree />
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            <PropertyEditor />
          </div>
        </div>
      </Sider>
      <Content style={{ height: '100%', paddingLeft: '8px' }}>
        <Viewport />
      </Content>
    </Layout>
  );
};

export default GeometryView; 