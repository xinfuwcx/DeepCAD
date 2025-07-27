import React from 'react';
import { Card, Button } from 'antd';
import { GlobalOutlined } from '@ant-design/icons';

const GeologyModuleSimple: React.FC = () => {
  return (
    <div style={{ 
      position: 'relative', 
      width: '100%', 
      height: '100%', 
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <Card
        title={
          <div style={{ color: 'white' }}>
            <GlobalOutlined style={{ marginRight: '8px', color: '#00d9ff' }} />
            地质建模模块测试
          </div>
        }
        style={{ 
          background: 'rgba(26, 26, 46, 0.9)',
          border: '1px solid rgba(0, 217, 255, 0.4)',
          borderRadius: '16px',
          minWidth: '400px'
        }}
      >
        <div style={{ color: 'white', textAlign: 'center' }}>
          <h2 style={{ color: '#00d9ff', marginBottom: '20px' }}>🌍 RBF 地质建模</h2>
          <p style={{ color: '#ccc', marginBottom: '20px' }}>
            这是地质建模模块，如果你能看到这个页面，说明菜单路由已经正常工作了！
          </p>
          <Button type="primary" size="large">
            开始地质建模
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default GeologyModuleSimple;