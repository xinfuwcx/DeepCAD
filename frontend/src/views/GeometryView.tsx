import React, { useState } from 'react';
import { Layout, Tabs, Button, Tooltip, Space, Typography, Divider } from 'antd';
import Viewport3D from '../components/Viewport3D';
import SceneTree from '../components/SceneTree';
import PropertyEditor from '../components/PropertyEditor';
import ComponentCreationForm from '../components/forms/ComponentCreationForm';
import { 
  PlusOutlined, 
  AppstoreOutlined, 
  CameraOutlined, 
  FullscreenOutlined, 
  SaveOutlined, 
  UndoOutlined, 
  RedoOutlined,
  CopyOutlined,
  DeleteOutlined,
  SettingOutlined,
  ColumnWidthOutlined,
  BorderOutlined
} from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Title } = Typography;

const GeometryView: React.FC = () => {
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  
  const { theme: appTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );
  
  const isDarkMode = appTheme === 'dark';

  // 模拟撤销/重做功能
  const handleUndo = () => {
    console.log('Undo action');
  };
  
  const handleRedo = () => {
    console.log('Redo action');
  };
  
  // 模拟保存功能
  const handleSave = () => {
    console.log('Save geometry');
  };
  
  // 模拟截图功能
  const handleScreenshot = () => {
    console.log('Take screenshot');
  };
  
  // 模拟全屏功能
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  return (
    <div className="geometry-view fade-in">
      <div className="geometry-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>几何建模</Title>
        <Space>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存模型
          </Button>
        </Space>
      </div>
      
      <Layout style={{ height: 'calc(100% - 48px)', background: 'transparent' }}>
        <Sider
          theme={isDarkMode ? "dark" : "light"}
          collapsible
          collapsed={siderCollapsed}
          onCollapse={(collapsed) => setSiderCollapsed(collapsed)}
          width={350}
          className="geometry-sider scale-in"
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={setActiveTab}
            type="card"
          >
            <TabPane 
              tab={<span><AppstoreOutlined /> 组件</span>} 
              key="components"
            >
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)' }}>
                <div className="geometry-tree-container">
                  <SceneTree />
                </div>
                <div className="geometry-property-editor">
                  <PropertyEditor />
                </div>
              </div>
            </TabPane>
            <TabPane 
              tab={<span><PlusOutlined /> 创建</span>} 
              key="create"
            >
              <div className="geometry-create-form">
                <ComponentCreationForm />
              </div>
            </TabPane>
          </Tabs>
        </Sider>
        <Content style={{ position: 'relative', height: '100%', padding: '8px' }}>
          <Viewport3D className="geometry-viewport" />
          
          <div className="geometry-toolbar">
            <div className="geometry-toolbar-group">
              <Tooltip title="撤销">
                <Button type="text" icon={<UndoOutlined />} onClick={handleUndo} />
              </Tooltip>
              <Tooltip title="重做">
                <Button type="text" icon={<RedoOutlined />} onClick={handleRedo} />
              </Tooltip>
            </div>
            
            <div className="geometry-toolbar-group">
              <Tooltip title="复制选中">
                <Button type="text" icon={<CopyOutlined />} />
              </Tooltip>
              <Tooltip title="删除选中">
                <Button type="text" icon={<DeleteOutlined />} />
              </Tooltip>
            </div>
            
            <div className="geometry-toolbar-group">
              <Tooltip title="视图设置">
                <Button type="text" icon={<SettingOutlined />} />
              </Tooltip>
              <Tooltip title="截图">
                <Button type="text" icon={<CameraOutlined />} onClick={handleScreenshot} />
              </Tooltip>
              <Tooltip title="全屏">
                <Button type="text" icon={<FullscreenOutlined />} onClick={handleFullscreen} />
              </Tooltip>
            </div>
            
            <div className="geometry-toolbar-group">
              <Tooltip title="网格线">
                <Button type="text" icon={<BorderOutlined />} />
              </Tooltip>
              <Tooltip title="坐标轴">
                <Button type="text" icon={<ColumnWidthOutlined />} />
              </Tooltip>
            </div>
          </div>
        </Content>
      </Layout>
    </div>
  );
};

export default GeometryView; 