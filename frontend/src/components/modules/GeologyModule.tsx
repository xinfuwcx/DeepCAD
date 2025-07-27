import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Tabs, List, Form, Input, Select, Slider, Switch, Tag, Progress, Upload, message } from 'antd';
import {
  ExperimentOutlined,
  GlobalOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  BarChartOutlined
} from '@ant-design/icons';
import GeologyThreeViewer from '../geology/GeologyThreeViewer';
import { geologyService, type EnhancedBorehole, type GeologyAnalysisOptions } from '../../services/geologyService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export const GeologyModule: React.FC = () => {
  const [geologySettings, setGeologySettings] = useState({
    soilLayers: 5,
    depthRange: 50,
    drillingDensity: 'medium',
    interpolationMethod: 'ordinary_kriging',
    variogramModel: 'exponential',
    gridResolution: 2.0,
    colormap: 'terrain',
    includeUncertainty: true
  });

  const [modelState, setModelState] = useState({
    isLoading: false,
    modelUrl: null as string | null,
    lastAnalysis: null as any,
    selectedBorehole: null as string | null
  });

  const [boreholeData, setBoreholeData] = useState<EnhancedBorehole[]>([
    { id: 'BH-001', x: 100, y: 200, z: -30, soil_type: 'clay', description: '粘土层为主' },
    { id: 'BH-002', x: 150, y: 250, z: -25, soil_type: 'sand', description: '砂土层为主' },
    { id: 'BH-003', x: 200, y: 300, z: -35, soil_type: 'silt', description: '粉土层为主' },
    { id: 'BH-004', x: 120, y: 180, z: -28, soil_type: 'clay', description: '粘土层为主' },
    { id: 'BH-005', x: 180, y: 160, z: -32, soil_type: 'gravel', description: '砂砾层' }
  ]);

  // 建模函数
  const handleGenerateModel = useCallback(async () => {
    if (boreholeData.length < 3) {
      message.error('至少需要3个钻孔点进行地质建模');
      return;
    }

    setModelState(prev => ({ ...prev, isLoading: true }));

    try {
      console.log('🚀 开始RBF地质建模...');
      
      const options: GeologyAnalysisOptions = {
        method: geologySettings.interpolationMethod as any,
        variogramModel: geologySettings.variogramModel as any,
        gridResolution: geologySettings.gridResolution,
        colormap: geologySettings.colormap,
        includeUncertainty: geologySettings.includeUncertainty
      };

      const result = await geologyService.generateGeologyModel(boreholeData, options);
      
      setModelState(prev => ({
        ...prev,
        isLoading: false,
        modelUrl: result.gltf_url,
        lastAnalysis: result
      }));

      message.success('地质模型生成成功！');
      console.log('✅ RBF建模完成:', result);
      
    } catch (error: any) {
      console.error('❌ 地质建模失败:', error);
      setModelState(prev => ({ ...prev, isLoading: false }));
      message.error(error.message || '地质建模失败，请检查数据和参数');
    }
  }, [boreholeData, geologySettings]);

  // 钻孔选择处理
  const handleBoreholeSelect = useCallback((borehole: any) => {
    setModelState(prev => ({ ...prev, selectedBorehole: borehole.id }));
    message.info(`选中钻孔: ${borehole.id}`);
  }, []);

  // 模型加载处理
  const handleModelLoad = useCallback((mesh: any) => {
    console.log('📊 地质模型已加载到Three.js场景');
  }, []);

  const soilTypes = [
    { name: 'Clay', icon: '🟤', description: '粘土层', density: '1.8 g/cm³', cohesion: '15 kPa' },
    { name: 'Sand', icon: '🟡', description: '砂土层', density: '1.6 g/cm³', cohesion: '0 kPa' },
    { name: 'Silt', icon: '🟫', description: '粉土层', density: '1.7 g/cm³', cohesion: '8 kPa' },
    { name: 'Gravel', icon: '⚪', description: '砂砾层', density: '2.0 g/cm³', cohesion: '0 kPa' },
    { name: 'Rock', icon: '⚫', description: '基岩层', density: '2.5 g/cm³', cohesion: '500 kPa' },
    { name: 'Fill', icon: '🟠', description: '填土层', density: '1.5 g/cm³', cohesion: '5 kPa' }
  ];

  const analysisTools = [
    { name: 'Layer Profile', icon: <BarChartOutlined />, description: '地层剖面' },
    { name: 'Interpolation', icon: <GlobalOutlined />, description: '空间插值' },
    { name: 'Cross Section', icon: <EditOutlined />, description: '地质剖面' },
    { name: 'Contour Map', icon: <EnvironmentOutlined />, description: '等高线图' }
  ];

  const geoStatistics = [
    { metric: '钻孔总数', value: '24', unit: '个', status: 'normal' },
    { metric: '最大深度', value: '45.5', unit: 'm', status: 'normal' },
    { metric: '地层种类', value: '6', unit: '种', status: 'good' },
    { metric: '数据完整性', value: '92.5', unit: '%', status: 'good' }
  ];

  const layerProperties = [
    { layer: '填土层', thickness: '2.5m', density: '1.5 g/cm³', cohesion: '5 kPa', friction: '18°' },
    { layer: '粘土层', thickness: '8.2m', density: '1.8 g/cm³', cohesion: '25 kPa', friction: '12°' },
    { layer: '砂土层', thickness: '6.8m', density: '1.6 g/cm³', cohesion: '0 kPa', friction: '32°' },
    { layer: '粉土层', thickness: '12.5m', density: '1.7 g/cm³', cohesion: '15 kPa', friction: '28°' },
    { layer: '基岩层', thickness: '∞', density: '2.5 g/cm³', cohesion: '500 kPa', friction: '45°' }
  ];

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 3D地质查看器 */}
      <GeologyThreeViewer
        modelUrl={modelState.modelUrl || undefined}
        boreholeData={boreholeData.map(bh => ({ ...bh, id: bh.id || `bh-${Math.random().toString(36).substr(2, 9)}` }))}
        onModelLoad={handleModelLoad}
        onBoreholeSelect={handleBoreholeSelect}
      />

      {/* 悬浮左侧工具面板 */}
      <div style={{ 
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '380px',
        maxHeight: 'calc(100% - 40px)',
        zIndex: 10
      }}>
        <Card 
          className="glass-card" 
          title={
            <Space>
              <GlobalOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>地质建模工具</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.1)'
          }}
          styles={{ 
            body: { 
              padding: '16px', 
              maxHeight: 'calc(100vh - 200px)',
              overflowY: 'auto',
              background: 'transparent'
            },
            header: {
              background: 'transparent',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              padding: '12px 16px'
            }
          }}
        >
          <Tabs defaultActiveKey="1" >
            <TabPane tab="土层类型" key="1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {soilTypes.map((soil, index) => (
                  <Button
                    key={index}
                    className="glass-card"
                    style={{
                      height: '90px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      position: 'relative'
                    }}
                    onClick={() => console.log('Select soil', soil.name)}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{soil.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>{soil.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {soil.description}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', textAlign: 'center', marginTop: '2px' }}>
                      {soil.density}
                    </div>
                  </Button>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="钻孔数据" key="2">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  钻孔管理
                </Text>
              </div>
              
              {boreholeData.map((borehole, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '10px',
                  background: modelState.selectedBorehole === borehole.id ? 'rgba(255, 107, 107, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: `1px solid ${modelState.selectedBorehole === borehole.id ? '#ff6b6b' : 'var(--border-color)'}`,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setModelState(prev => ({ ...prev, selectedBorehole: borehole.id }))}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <Text style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>{borehole.id}</Text>
                    <Tag 
                      color={borehole.soil_type === 'clay' ? 'orange' : 
                             borehole.soil_type === 'sand' ? 'yellow' : 
                             borehole.soil_type === 'silt' ? 'blue' : 
                             borehole.soil_type === 'gravel' ? 'gray' : 'green'}
                      style={{ fontSize: '9px' }}
                    >
                      {borehole.soil_type || 'unknown'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    坐标: ({borehole.x}, {borehole.y}) • 高程: {borehole.z}m
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    {borehole.description}
                  </div>
                  <div style={{ marginTop: '8px', display: 'flex', gap: '4px' }}>
                    <Button  icon={<EyeOutlined />} style={{ fontSize: '10px' }}
                      onClick={(e) => { e.stopPropagation(); handleBoreholeSelect(borehole); }}
                    >定位</Button>
                    <Button  icon={<EditOutlined />} style={{ fontSize: '10px' }}>编辑</Button>
                    <Button  icon={<DeleteOutlined />} style={{ fontSize: '10px' }} danger>删除</Button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '16px' }}>
                <Upload>
                  <Button icon={<UploadOutlined />} block>导入钻孔数据</Button>
                </Upload>
              </div>
            </TabPane>

            <TabPane tab="建模参数" key="3">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>地层层数</span>}>
                  <Slider
                    min={3}
                    max={15}
                    value={geologySettings.soilLayers}
                    onChange={(value) => setGeologySettings({...geologySettings, soilLayers: value})}
                    marks={{
                      3: '3',
                      6: '6',
                      10: '10',
                      15: '15'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    层数: {geologySettings.soilLayers}
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>建模深度 (m)</span>}>
                  <Slider
                    min={10}
                    max={100}
                    value={geologySettings.depthRange}
                    onChange={(value) => setGeologySettings({...geologySettings, depthRange: value})}
                    marks={{
                      10: '10',
                      30: '30',
                      60: '60',
                      100: '100'
                    }}
                  />
                  <Text style={{ color: 'var(--accent-color)', fontSize: '12px' }}>
                    深度: {geologySettings.depthRange}m
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>插值方法</span>}>
                  <Select 
                    value={geologySettings.interpolationMethod}
                    onChange={(value) => setGeologySettings({...geologySettings, interpolationMethod: value})}
                    style={{ width: '100%' }}
                  >
                    <Option value="ordinary_kriging">普通克里金</Option>
                    <Option value="universal_kriging">泛克里金</Option>
                    <Option value="simple_kriging">简单克里金</Option>
                    <Option value="rbf">径向基函数</Option>
                    <Option value="inverse_distance">反距离权重</Option>
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>变差函数模型</span>}>
                  <Select 
                    value={geologySettings.variogramModel}
                    onChange={(value) => setGeologySettings({...geologySettings, variogramModel: value})}
                    style={{ width: '100%' }}
                  >
                    <Option value="exponential">指数模型</Option>
                    <Option value="gaussian">高斯模型</Option>
                    <Option value="spherical">球形模型</Option>
                    <Option value="matern">Matern模型</Option>
                    <Option value="linear">线性模型</Option>
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>网格分辨率 (m)</span>}>
                  <Slider
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    value={geologySettings.gridResolution}
                    onChange={(value) => setGeologySettings({...geologySettings, gridResolution: value})}
                    marks={{
                      0.5: '0.5',
                      1.0: '1.0',
                      2.0: '2.0',
                      5.0: '5.0'
                    }}
                  />
                  <Text style={{ color: 'var(--success-color)', fontSize: '12px' }}>
                    分辨率: {geologySettings.gridResolution}m
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>颜色方案</span>}>
                  <Select 
                    value={geologySettings.colormap}
                    onChange={(value) => setGeologySettings({...geologySettings, colormap: value})}
                    style={{ width: '100%' }}
                  >
                    <Option value="terrain">地形色彩</Option>
                    <Option value="viridis">Viridis</Option>
                    <Option value="plasma">Plasma</Option>
                    <Option value="coolwarm">冷暖色</Option>
                    <Option value="seismic">地震色</Option>
                  </Select>
                </Form.Item>

                <Form.Item>
                  <div style={{ display: 'flex', alignItems: 'center', marginTop: '8px' }}>
                    <Switch 
                      checked={geologySettings.includeUncertainty}
                      onChange={(checked) => setGeologySettings({...geologySettings, includeUncertainty: checked})}
                      
                    />
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginLeft: '8px' }}>
                      包含不确定性分析
                    </Text>
                  </div>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="分析工具" key="4">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                {analysisTools.map((tool, index) => (
                  <Button
                    key={index}
                    className="glass-card"
                    style={{
                      height: '50px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-start',
                      border: '1px solid var(--border-color)',
                      padding: '0 16px'
                    }}
                    onClick={() => console.log('Use tool', tool.name)}
                  >
                    <div style={{ fontSize: '16px', marginRight: '12px', color: 'var(--primary-color)' }}>
                      {tool.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{tool.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{tool.description}</div>
                    </div>
                  </Button>
                ))}
              </div>

              {/* 地质统计 */}
              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
                  地质统计
                </Text>
                {geoStatistics.map((stat, index) => (
                  <div key={index} style={{ 
                    marginBottom: '8px',
                    padding: '8px',
                    background: 'var(--bg-tertiary)',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: 'white', fontSize: '12px' }}>{stat.metric}</Text>
                      <Text style={{ 
                        color: stat.status === 'good' ? 'var(--success-color)' : 'var(--primary-color)', 
                        fontSize: '12px', 
                        fontWeight: 'bold' 
                      }}>
                        {stat.value} {stat.unit}
                      </Text>
                    </div>
                  </div>
                ))}
              </div>
            </TabPane>

            <TabPane tab="地层参数" key="5">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  土层物理力学参数
                </Text>
              </div>
              
              {layerProperties.map((layer, index) => (
                <div key={index} style={{ 
                  marginBottom: '12px',
                  padding: '10px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ marginBottom: '6px' }}>
                    <Text style={{ color: 'white', fontSize: '13px', fontWeight: 'bold' }}>{layer.layer}</Text>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '11px', marginLeft: '8px' }}>
                      厚度: {layer.thickness}
                    </Text>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '10px' }}>
                    <div>
                      <Text style={{ color: 'var(--text-secondary)' }}>密度:</Text>
                      <Text style={{ color: 'var(--primary-color)', marginLeft: '4px' }}>{layer.density}</Text>
                    </div>
                    <div>
                      <Text style={{ color: 'var(--text-secondary)' }}>粘聚力:</Text>
                      <Text style={{ color: 'var(--accent-color)', marginLeft: '4px' }}>{layer.cohesion}</Text>
                    </div>
                    <div>
                      <Text style={{ color: 'var(--text-secondary)' }}>摩擦角:</Text>
                      <Text style={{ color: 'var(--success-color)', marginLeft: '4px' }}>{layer.friction}</Text>
                    </div>
                  </div>
                </div>
              ))}
            </TabPane>
          </Tabs>

          {/* 建模控制 */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button 
                type="primary" 
                icon={<BuildOutlined />} 
                style={{ flex: 1 }}
                loading={modelState.isLoading}
                onClick={handleGenerateModel}
                disabled={boreholeData.length < 3}
              >
                {modelState.isLoading ? '建模中...' : '生成地质模型'}
              </Button>
              <Button 
                icon={<DownloadOutlined />}
                disabled={!modelState.modelUrl}
                onClick={() => {
                  if (modelState.modelUrl) {
                    window.open(modelState.modelUrl, '_blank');
                  }
                }}
              >
                导出
              </Button>
            </div>
            
            {/* 建模进度和结果信息 */}
            {modelState.isLoading && (
              <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <Progress percent={66}  status="active" />
                <Text style={{ color: 'var(--text-secondary)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                  正在执行RBF插值...
                </Text>
              </div>
            )}
            
            {modelState.lastAnalysis && (
              <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '6px' }}>
                <Text style={{ color: 'var(--success-color)', fontSize: '11px', display: 'block' }}>
                  ✓ 建模完成 • 网格点数: {modelState.lastAnalysis.mesh_info?.n_points}
                </Text>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '10px', display: 'block' }}>
                  方法: {modelState.lastAnalysis.interpolation_method}
                </Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 悬浮右侧地质参数指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          地质模型
        </div>
        <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginBottom: '6px' }}>
          地层: {geologySettings.soilLayers} 层
        </div>
        <div style={{ fontSize: '11px', color: 'var(--accent-color)', marginBottom: '6px' }}>
          深度: {geologySettings.depthRange}m
        </div>
        <div style={{ fontSize: '11px', color: 'var(--success-color)', marginBottom: '6px' }}>
          插值: {geologySettings.interpolationMethod}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--info-color)', marginBottom: '6px' }}>
          分辨率: {geologySettings.gridResolution}m
        </div>
        <div style={{ fontSize: '11px', color: 'var(--warning-color)' }}>
          钻孔: {boreholeData.length} 个
        </div>
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(16, 185, 129, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(16, 185, 129, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          🌍 地层
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🔍 钻孔
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          ✂️ 剖面
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📊 插值
        </Button>
      </div>
    </div>
  );
};

export default GeologyModule;