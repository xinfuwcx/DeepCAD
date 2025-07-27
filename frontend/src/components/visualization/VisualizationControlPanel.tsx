/**
 * 可视化控制总面板
 * 整合PyVista渲染、符号显示、渗流字段和后处理功能的统一控制界面
 */

import React, { useState, useEffect } from 'react';
import {
  Card, Tabs, Space, Button, Alert, Badge, Tooltip, Divider,
  Row, Col, Statistic, Progress, Select, Switch, Typography,
  Modal, Form, InputNumber, Slider, Tag
} from 'antd';
import {
  EyeOutlined, SettingOutlined, ThunderboltOutlined, LockOutlined,
  HeatMapOutlined, BranchesOutlined, ControlOutlined, BorderOutlined,
  PlayCircleOutlined, PauseCircleOutlined, ReloadOutlined, 
  FullscreenOutlined, DownloadOutlined, ShareAltOutlined, 
  ExperimentOutlined, BgColorsOutlined, CameraOutlined
} from '@ant-design/icons';
import SymbolDisplayPanel from './SymbolDisplayPanel';

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;

// 可视化状态接口
interface VisualizationState {
  session_id: string;
  is_active: boolean;
  mesh_loaded: boolean;
  symbols_count: number;
  active_fields: string[];
  render_quality: 'low' | 'medium' | 'high';
  performance_stats: {
    fps: number;
    memory_usage: number;
    render_time: number;
  };
}

// 渲染设置接口
interface RenderSettings {
  background_color: string;
  lighting_enabled: boolean;
  shadows_enabled: boolean;
  anti_aliasing: boolean;
  mesh_opacity: number;
  edge_visibility: boolean;
  color_map: string;
  animation_speed: number;
}

interface VisualizationControlPanelProps {
  sessionId: string;
  onVisualizationChange?: (state: VisualizationState) => void;
}

const VisualizationControlPanel: React.FC<VisualizationControlPanelProps> = ({
  sessionId,
  onVisualizationChange
}) => {
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('overview');
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  
  // 状态管理
  const [vizState, setVizState] = useState<VisualizationState>({
    session_id: sessionId,
    is_active: false,
    mesh_loaded: false,
    symbols_count: 0,
    active_fields: [],
    render_quality: 'medium',
    performance_stats: {
      fps: 60,
      memory_usage: 45,
      render_time: 16
    }
  });

  const [renderSettings, setRenderSettings] = useState<RenderSettings>({
    background_color: '#2D2D30',
    lighting_enabled: true,
    shadows_enabled: false,
    anti_aliasing: true,
    mesh_opacity: 1.0,
    edge_visibility: false,
    color_map: 'viridis',
    animation_speed: 1.0
  });

  // 渗流字段类型
  const seepageFields = [
    { key: 'hydraulic_head', label: '水头', icon: <HeatMapOutlined />, color: '#1890FF' },
    { key: 'pore_pressure', label: '孔隙水压力', icon: <ExperimentOutlined />, color: '#52C41A' },
    { key: 'seepage_velocity', label: '渗流速度', icon: <BranchesOutlined />, color: '#FA8C16' },
    { key: 'saturation', label: '饱和度', icon: <BgColorsOutlined />, color: '#722ED1' },
    { key: 'permeability', label: '渗透系数', icon: <ControlOutlined />, color: '#13C2C2' }
  ];

  // 色彩映射选项
  const colorMaps = [
    'viridis', 'plasma', 'inferno', 'magma', 'jet', 'coolwarm', 'rainbow', 'turbo'
  ];

  // 切换可视化激活状态
  const toggleVisualization = () => {
    const newState = { ...vizState, is_active: !vizState.is_active };
    setVizState(newState);
    onVisualizationChange?.(newState);
  };

  // 更新渲染设置
  const updateRenderSettings = (key: keyof RenderSettings, value: any) => {
    const newSettings = { ...renderSettings, [key]: value };
    setRenderSettings(newSettings);
  };

  // 应用渲染设置
  const applyRenderSettings = async () => {
    try {
      // 这里会调用后端API应用设置
      console.log('Applying render settings:', renderSettings);
      setSettingsModalVisible(false);
    } catch (error) {
      console.error('Failed to apply render settings:', error);
    }
  };

  // 切换渗流字段显示
  const toggleSeepageField = (fieldKey: string) => {
    const updatedFields = vizState.active_fields.includes(fieldKey)
      ? vizState.active_fields.filter(f => f !== fieldKey)
      : [...vizState.active_fields, fieldKey];
    
    const newState = { ...vizState, active_fields: updatedFields };
    setVizState(newState);
    onVisualizationChange?.(newState);
  };

  // 渲染概览面板
  const renderOverviewPanel = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 状态统计 */}
      <Card title="可视化状态" size="small">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="会话状态"
              value={vizState.is_active ? "运行中" : "停止"}
              valueStyle={{ color: vizState.is_active ? '#52c41a' : '#ff4d4f' }}
              prefix={vizState.is_active ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="符号数量"
              value={vizState.symbols_count}
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="活动字段"
              value={vizState.active_fields.length}
              prefix={<HeatMapOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="渲染质量"
              value={vizState.render_quality}
              valueStyle={{ textTransform: 'capitalize' }}
              prefix={<EyeOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* 性能监控 */}
      <Card title="性能监控" size="small">
        <Row gutter={16}>
          <Col span={8}>
            <div>
              <Text>帧率 (FPS)</Text>
              <Progress
                percent={(vizState.performance_stats.fps / 60) * 100}
                status={vizState.performance_stats.fps > 30 ? 'success' : 'exception'}
                format={() => `${vizState.performance_stats.fps} FPS`}
              />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <Text>内存使用率</Text>
              <Progress
                percent={vizState.performance_stats.memory_usage}
                status={vizState.performance_stats.memory_usage < 70 ? 'success' : 'exception'}
                format={() => `${vizState.performance_stats.memory_usage}%`}
              />
            </div>
          </Col>
          <Col span={8}>
            <div>
              <Text>渲染时间</Text>
              <Progress
                percent={(vizState.performance_stats.render_time / 33) * 100}
                status={vizState.performance_stats.render_time < 20 ? 'success' : 'exception'}
                format={() => `${vizState.performance_stats.render_time}ms`}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 快速控制 */}
      <Card title="快速控制" size="small">
        <Space wrap>
          <Button
            type={vizState.is_active ? "default" : "primary"}
            icon={vizState.is_active ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
            onClick={toggleVisualization}
          >
            {vizState.is_active ? '停止' : '启动'}可视化
          </Button>
          
          <Button icon={<ReloadOutlined />}>
            刷新视图
          </Button>
          
          <Button icon={<SettingOutlined />} onClick={() => setSettingsModalVisible(true)}>
            渲染设置
          </Button>
          
          <Button icon={<CameraOutlined />}>
            截图
          </Button>
          
          <Button icon={<DownloadOutlined />}>
            导出场景
          </Button>
          
          <Button icon={<FullscreenOutlined />}>
            全屏显示
          </Button>
        </Space>
      </Card>
    </Space>
  );

  // 渲染渗流字段面板
  const renderSeepageFieldsPanel = () => (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card
        title="渗流字段显示"
        size="small"
        extra={
          <Badge count={vizState.active_fields.length} showZero>
            <Button size="small" icon={<EyeOutlined />}>
              活动字段
            </Button>
          </Badge>
        }
      >
        <Alert
          message="渗流分析可视化"
          description="选择要显示的渗流字段，支持多字段同时显示和对比分析"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <Row gutter={[16, 16]}>
          {seepageFields.map(field => (
            <Col span={12} key={field.key}>
              <Card
                size="small"
                hoverable
                style={{
                  cursor: 'pointer',
                  border: vizState.active_fields.includes(field.key) 
                    ? `2px solid ${field.color}` 
                    : '1px solid #d9d9d9'
                }}
                onClick={() => toggleSeepageField(field.key)}
              >
                <Space>
                  <div style={{ color: field.color }}>
                    {field.icon}
                  </div>
                  <div>
                    <Text strong>{field.label}</Text>
                    <br />
                    <Switch
                      size="small"
                      checked={vizState.active_fields.includes(field.key)}
                      onChange={() => toggleSeepageField(field.key)}
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Card title="字段显示设置" size="small">
        <Row gutter={16}>
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <Text>色彩映射</Text>
              <Select
                value={renderSettings.color_map}
                onChange={(value) => updateRenderSettings('color_map', value)}
                style={{ width: '100%', marginTop: 8 }}
              >
                {colorMaps.map(map => (
                  <Option key={map} value={map}>
                    {map.charAt(0).toUpperCase() + map.slice(1)}
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
          
          <Col span={12}>
            <div style={{ marginBottom: 16 }}>
              <Text>网格透明度: {renderSettings.mesh_opacity.toFixed(1)}</Text>
              <Slider
                value={renderSettings.mesh_opacity}
                onChange={(value) => updateRenderSettings('mesh_opacity', value)}
                min={0}
                max={1}
                step={0.1}
                marks={{ 0: '0', 0.5: '0.5', 1: '1' }}
                style={{ marginTop: 8 }}
              />
            </div>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={8}>
            <Space>
              <Switch
                checked={renderSettings.edge_visibility}
                onChange={(checked) => updateRenderSettings('edge_visibility', checked)}
              />
              <Text>显示网格边</Text>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space>
              <Switch
                checked={renderSettings.lighting_enabled}
                onChange={(checked) => updateRenderSettings('lighting_enabled', checked)}
              />
              <Text>启用光照</Text>
            </Space>
          </Col>
          
          <Col span={8}>
            <Space>
              <Switch
                checked={renderSettings.anti_aliasing}
                onChange={(checked) => updateRenderSettings('anti_aliasing', checked)}
              />
              <Text>抗锯齿</Text>
            </Space>
          </Col>
        </Row>
      </Card>
    </Space>
  );

  // 渲染设置模态框
  const renderSettingsModal = () => (
    <Modal
      title="渲染设置"
      open={settingsModalVisible}
      onOk={applyRenderSettings}
      onCancel={() => setSettingsModalVisible(false)}
      width={600}
      okText="应用设置"
      cancelText="取消"
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="渲染质量">
              <Select
                value={vizState.render_quality}
                onChange={(value) => setVizState({ ...vizState, render_quality: value })}
              >
                <Option value="low">低质量 (快速)</Option>
                <Option value="medium">中等质量 (平衡)</Option>
                <Option value="high">高质量 (精细)</Option>
              </Select>
            </Form.Item>
          </Col>
          
          <Col span={12}>
            <Form.Item label="动画速度">
              <Slider
                value={renderSettings.animation_speed}
                onChange={(value) => updateRenderSettings('animation_speed', value)}
                min={0.1}
                max={3.0}
                step={0.1}
                marks={{ 0.1: '0.1x', 1: '1x', 3: '3x' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Space direction="vertical">
              <Switch
                checked={renderSettings.shadows_enabled}
                onChange={(checked) => updateRenderSettings('shadows_enabled', checked)}
              />
              <Text>启用阴影</Text>
            </Space>
          </Col>
          
          <Col span={12}>
            <div>
              <Text>背景颜色</Text>
              <Input
                value={renderSettings.background_color}
                onChange={(e) => updateRenderSettings('background_color', e.target.value)}
                style={{ marginTop: 8 }}
                placeholder="#2D2D30"
              />
            </div>
          </Col>
        </Row>
      </Form>
    </Modal>
  );

  return (
    <div style={{ fontSize: '12px' }}>
      <Card
        title={
          <Space>
            <EyeOutlined />
            可视化控制中心
            <Badge
              status={vizState.is_active ? "processing" : "default"}
              text={vizState.is_active ? "运行中" : "待机"}
            />
          </Space>
        }
        size="small"
        style={{ height: '100%' }}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size="small"
          tabBarStyle={{ marginBottom: '12px' }}
        >
          <TabPane
            tab={<Space size={4}><ControlOutlined />概览</Space>}
            key="overview"
          >
            {renderOverviewPanel()}
          </TabPane>

          <TabPane
            tab={<Space size={4}><HeatMapOutlined />渗流字段</Space>}
            key="seepage-fields"
          >
            {renderSeepageFieldsPanel()}
          </TabPane>

          <TabPane
            tab={<Space size={4}><ThunderboltOutlined />符号显示</Space>}
            key="symbols"
          >
            <SymbolDisplayPanel
              sessionId={sessionId}
              onSymbolChange={(symbols) => {
                setVizState({ ...vizState, symbols_count: symbols.length });
              }}
            />
          </TabPane>

          <TabPane
            tab={<Space size={4}><SettingOutlined />高级设置</Space>}
            key="advanced"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Card title="PyVista配置" size="small">
                <Alert
                  message="高级渲染控制"
                  description="这些设置影响PyVista渲染引擎的行为和性能"
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="WebGL支持"
                      value="✓ 已启用"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="GPU加速"
                      value="✓ 可用"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="内存池"
                      value="512 MB"
                      valueStyle={{ color: '#1890ff' }}
                    />
                  </Col>
                </Row>
                
                <Divider />
                
                <Space wrap>
                  <Button size="small">重置视图</Button>
                  <Button size="small">清理缓存</Button>
                  <Button size="small">优化性能</Button>
                  <Button size="small">导出日志</Button>
                </Space>
              </Card>
            </Space>
          </TabPane>
        </Tabs>
      </Card>

      {renderSettingsModal()}
    </div>
  );
};

export default VisualizationControlPanel;