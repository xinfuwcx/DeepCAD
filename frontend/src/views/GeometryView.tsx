import React, { useState } from 'react';
import { Layout, Tabs, Button, Tooltip, Space, Typography, Modal, Card, Row, Col, Progress, Badge, Alert } from 'antd';
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
  BorderOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ToolOutlined,
  FolderOpenOutlined,
  ExportOutlined,
  ImportOutlined,
  HistoryOutlined,
  BugOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useSceneStore } from '../stores/useSceneStore';
import { useDomainStore } from '../stores/useDomainStore';
import { useShallow } from 'zustand/react/shallow';

const { Sider, Content } = Layout;
const { TabPane } = Tabs;
const { Title } = Typography;

const GeometryView: React.FC = () => {
  const [siderCollapsed, setSiderCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState('components');
  const [showValidation, setShowValidation] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewSettings, setViewSettings] = useState({
    showGrid: true,
    showAxis: true,
    showBounds: false,
    wireframe: false
  });
  
  const { theme: appTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme
    }))
  );

  const { scene, selectedComponentId } = useSceneStore(
    useShallow(state => ({
      scene: state.scene,
      selectedComponentId: state.selectedComponentId
    }))
  );

  const { tasks } = useDomainStore(
    useShallow(state => ({
      tasks: state.tasks
    }))
  );
  
  const isDarkMode = appTheme === 'dark';

  // 模型统计信息
  const modelStats = {
    components: scene?.components?.length || 0,
    materials: scene?.materials?.length || 0,
    vertices: 125000, // 模拟数据
    faces: 85000,
    memory: '45.2 MB'
  };

  // 验证状态
  const validationResults = [
    { type: 'geometry', status: 'success', message: '几何体完整性检查通过' },
    { type: 'topology', status: 'warning', message: '发现3个开放边界' },
    { type: 'materials', status: 'success', message: '材料分配完整' },
    { type: 'mesh_ready', status: 'error', message: '存在自相交面' }
  ];

  // 功能处理函数
  const handleUndo = () => {
    console.log('Undo action');
    // TODO: 实现撤销功能
  };
  
  const handleRedo = () => {
    console.log('Redo action');
    // TODO: 实现重做功能
  };
  
  const handleSave = () => {
    console.log('Save geometry');
    // TODO: 实现保存功能
  };
  
  const handleExport = () => {
    console.log('Export model');
    // TODO: 实现导出功能
  };

  const handleImport = () => {
    console.log('Import model');
    // TODO: 实现导入功能
  };
  
  const handleScreenshot = () => {
    console.log('Take screenshot');
    // TODO: 实现截图功能
  };
  
  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  const handleValidateModel = () => {
    setShowValidation(true);
  };

  const toggleViewSetting = (key: string) => {
    setViewSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // 渲染验证模态框
  const renderValidationModal = () => (
    <Modal
      title="模型验证结果"
      open={showValidation}
      onCancel={() => setShowValidation(false)}
      footer={null}
      width={600}
    >
      <Space direction="vertical" style={{ width: '100%' }}>
        {validationResults.map((result, index) => (
          <Alert
            key={index}
            message={result.message}
            type={result.status === 'success' ? 'success' : result.status === 'warning' ? 'warning' : 'error'}
            showIcon
          />
        ))}
      </Space>
    </Modal>
  );

  // 渲染历史面板
  const renderHistoryPanel = () => (
    <Modal
      title="操作历史"
      open={showHistory}
      onCancel={() => setShowHistory(false)}
      footer={null}
      width={500}
    >
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {[
          { action: '创建基坑组件', time: '10:30:25', status: 'completed' },
          { action: '添加支护结构', time: '10:28:15', status: 'completed' },
          { action: '修改材料属性', time: '10:25:40', status: 'completed' },
          { action: '导入DXF文件', time: '10:20:10', status: 'completed' }
        ].map((item, index) => (
          <div key={index} style={{ 
            padding: '8px 0', 
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>{item.action}</span>
            <Space>
              <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{item.time}</span>
              <Badge status="success" />
            </Space>
          </div>
        ))}
      </div>
    </Modal>
  );

  return (
    <div className="geometry-view fade-in">
      <div className="geometry-header">
        <Title level={2} style={{ color: 'white', margin: 0 }}>几何建模</Title>
        <Space>
          <Button icon={<ImportOutlined />} onClick={handleImport}>导入</Button>
          <Button icon={<ExportOutlined />} onClick={handleExport}>导出</Button>
          <Button icon={<BugOutlined />} onClick={handleValidateModel}>验证</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}>
            保存模型
          </Button>
        </Space>
      </div>

      {/* 模型统计信息面板 */}
      <div style={{ marginBottom: '16px' }}>
        <Row gutter={16}>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#1890ff' }}>
                  {modelStats.components}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>组件</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#52c41a' }}>
                  {modelStats.vertices.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>顶点</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#faad14' }}>
                  {modelStats.faces.toLocaleString()}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>面</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small" className="theme-card">
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#722ed1' }}>
                  {modelStats.memory}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>内存</div>
              </div>
            </Card>
          </Col>
        </Row>
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
              <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                <div style={{ flex: 1, minHeight: '300px' }}>
                  <SceneTree />
                </div>
                <div style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  paddingTop: '8px',
                  minHeight: '200px'
                }}>
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
            <TabPane 
              tab={<span><ToolOutlined /> 工具</span>} 
              key="tools"
            >
              <div style={{ padding: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    icon={<CheckCircleOutlined />}
                    onClick={handleValidateModel}
                  >
                    模型验证
                  </Button>
                  <Button 
                    block 
                    icon={<HistoryOutlined />}
                    onClick={() => setShowHistory(true)}
                  >
                    操作历史
                  </Button>
                  <Button block icon={<FolderOpenOutlined />}>
                    材料库
                  </Button>
                  
                  <div style={{ 
                    padding: '12px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '6px',
                    marginTop: '16px'
                  }}>
                    <div style={{ marginBottom: '8px', fontSize: '12px', fontWeight: 'bold' }}>
                      视图设置
                    </div>
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>网格线</span>
                        <Button 
                          size="small" 
                          type={viewSettings.showGrid ? 'primary' : 'default'}
                          icon={viewSettings.showGrid ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => toggleViewSetting('showGrid')}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>坐标轴</span>
                        <Button 
                          size="small" 
                          type={viewSettings.showAxis ? 'primary' : 'default'}
                          icon={viewSettings.showAxis ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => toggleViewSetting('showAxis')}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>边界框</span>
                        <Button 
                          size="small" 
                          type={viewSettings.showBounds ? 'primary' : 'default'}
                          icon={viewSettings.showBounds ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => toggleViewSetting('showBounds')}
                        />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px' }}>线框模式</span>
                        <Button 
                          size="small" 
                          type={viewSettings.wireframe ? 'primary' : 'default'}
                          icon={viewSettings.wireframe ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                          onClick={() => toggleViewSetting('wireframe')}
                        />
                      </div>
                    </Space>
                  </div>
                </Space>
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

      {/* 模态框 */}
      {renderValidationModal()}
      {renderHistoryPanel()}
    </div>
  );
};

export default GeometryView; 