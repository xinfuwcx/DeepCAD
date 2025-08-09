import React, { useState, useCallback } from 'react';
import { Card, Button, Space, Typography, Tabs, Form, InputNumber, Select, Upload, Progress, Steps, Tag, Slider, Switch, message } from 'antd';
import {
  EnvironmentOutlined,
  ToolOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  BuildOutlined,
  UploadOutlined,
  DownloadOutlined,
  SettingOutlined,
  SaveOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import GeometryQualityPanel from '../geology/GeometryQualityPanel';
import { geometryOptimizationService } from '../../services/geometryOptimization';
import { EnhancedBorehole } from '../../services/geologyService';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export const GeometryLabModule: React.FC = () => {
  // 工作流程步骤状态
  const [currentStep, setCurrentStep] = useState(0);
  const [stepStatus, setStepStatus] = useState<Record<string, 'wait' | 'process' | 'finish' | 'error'>>({
    geology: 'wait',
    excavation: 'wait',
    support: 'wait'
  });

  // 几何质量和优化状态
  const [geometryData, setGeometryData] = useState<any>(null);
  const [qualityFeedback, setQualityFeedback] = useState<any>(null);
  const [optimizationInProgress, setOptimizationInProgress] = useState(false);
  const [boreholes, setBoreholes] = useState<EnhancedBorehole[]>([]);

  // 几何模型参数状态
  const [geologyParams, setGeologyParams] = useState({
    interpolationMethod: 'kriging',
    gridResolution: 2.0,
    xExtend: 50,
    yExtend: 50,
    bottomElevation: -30,
    boreholes: 12,
    layers: 6
  });
  
  const [excavationParams, setExcavationParams] = useState({
    depth: 15,
    layerHeight: 3,
    slopeRatio: 0.5,
    width: 25,
    length: 30
  });
  
  const [supportParams, setSupportParams] = useState({
    // 地连墙参数
    diaphragmWall: {
      thickness: 1.2,
      depth: 25,
      enabled: true
    },
    // 锚杆参数
    anchor: {
      length: 15,
      angle: 15,
      hSpacing: 3,
      vSpacing: 3,
      enabled: true
    },
    // 钢支撑参数
    steelSupport: {
      layers: 3,
      spacing: 4,
      enabled: false
    }
  });

  // 工作流程步骤定义
  const workflowSteps = [
    {
      title: '地质建模',
      description: '导入钻孔数据，生成地质模型',
      icon: <EnvironmentOutlined />,
      key: 'geology'
    },
    {
      title: '基坑开挖',
      description: '导入DXF图纸，定义开挖体',
      icon: <ToolOutlined />,
      key: 'excavation'
    },
    {
      title: '支护结构',
      description: '设计地连墙、排桩、锚杆等',
      icon: <SafetyOutlined />,
      key: 'support'
    }
  ];

  // 钻孔数据列表
  const boreholeData = [
    { id: 1, name: 'ZK-001', depth: 30, x: 100, y: 200, layers: 6 },
    { id: 2, name: 'ZK-002', depth: 25, x: 150, y: 250, layers: 5 },
    { id: 3, name: 'ZK-003', depth: 35, x: 200, y: 300, layers: 7 },
    { id: 4, name: 'ZK-004', depth: 28, x: 120, y: 180, layers: 6 }
  ];

  // 支护结构类型
  const supportTypes = [
    { name: '地连墙', icon: '🏗️', description: '连续墙支护', enabled: supportParams.diaphragmWall.enabled },
    { name: '锚杆', icon: '⚡', description: '锚杆支护', enabled: supportParams.anchor.enabled },
    { name: '钢支撑', icon: '🔩', description: '钢结构支撑', enabled: supportParams.steelSupport.enabled }
  ];

  // 几何优化回调函数
  const handleOptimizationApply = useCallback(async (optimization: any) => {
    setOptimizationInProgress(true);
    console.log('🔧 应用几何优化:', optimization);
    
    try {
      // 更新几何数据
      setGeometryData(optimization.updatedGeometry);
      
      // 更新步骤状态
      if (optimization.success) {
        setStepStatus(prev => ({
          ...prev,
          [currentStep === 0 ? 'geology' : currentStep === 1 ? 'excavation' : 'support']: 'finish'
        }));
      }
      
      console.log('✅ 几何优化应用成功');
    } catch (error) {
      console.error('❌ 几何优化应用失败:', error);
    } finally {
      setOptimizationInProgress(false);
    }
  }, [currentStep]);

  const handleGeometryUpdate = useCallback((geometry: any) => {
    console.log('📐 几何数据更新:', geometry);
    setGeometryData(geometry);
  }, []);

  const handleQualityFeedback = useCallback((feedback: any) => {
    console.log('📊 收到3号质量反馈:', feedback);
    setQualityFeedback(feedback);
  }, []);

  const handleBoreholeChange = useCallback((updatedBoreholes: EnhancedBorehole[]) => {
    setBoreholes(updatedBoreholes);
    console.log('🕳️ 钻孔数据更新:', updatedBoreholes.length);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* 全屏3D视口背景 */}
      <div style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'linear-gradient(135deg, rgba(26, 26, 26, 0.95) 0%, rgba(40, 40, 40, 0.95) 100%)',
        zIndex: 1
      }}>
        {/* 网格背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 217, 255, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '20px 20px',
          opacity: 0.3
        }} />

        {/* 3D视口中心提示 */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          zIndex: 2,
          userSelect: 'none'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>🏗️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>深基坑几何建模视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 地质三维建模
            <br />
            ✅ 基坑开挖设计
            <br />
            ✅ 支护结构布置
            <br />
            ✅ 实时参数调整
          </div>
        </div>
      </div>

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
              <BuildOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>几何建模工具</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 217, 255, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
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
          {/* 工作流程进度 */}
          <div style={{ marginBottom: '16px' }}>
            <Steps
              current={currentStep}
              onChange={setCurrentStep}
              
              items={workflowSteps.map((step, index) => ({
                title: step.title,
                description: step.description,
                icon: step.icon,
                status: stepStatus[step.key] === 'finish' ? 'finish' : 
                       stepStatus[step.key] === 'process' ? 'process' : 
                       currentStep === index ? 'process' : 'wait'
              }))}
            />
          </div>

          <Tabs defaultActiveKey="1" >
            <TabPane tab="地质建模" key="1">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>插值方法</span>}>
                  <Select 
                    value={geologyParams.interpolationMethod}
                    style={{ width: '100%' }}
                    
                  >
                    <Option value="kriging">克里金插值</Option>
                    <Option value="idw">反距离权重</Option>
                    <Option value="spline">样条插值</Option>
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>网格分辨率 (m)</span>}>
                  <Slider
                    min={0.5}
                    max={5.0}
                    step={0.5}
                    value={geologyParams.gridResolution}
                    marks={{
                      0.5: '0.5',
                      2.0: '2.0',
                      5.0: '5.0'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    分辨率: {geologyParams.gridResolution}m
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>建模范围</span>}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <InputNumber 
                      addonBefore="X" 
                      addonAfter="m" 
                      value={geologyParams.xExtend} 
                      
                    />
                    <InputNumber 
                      addonBefore="Y" 
                      addonAfter="m" 
                      value={geologyParams.yExtend} 
                      
                    />
                  </div>
                </Form.Item>
              </Form>

              <div style={{ marginTop: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  钻孔数据
                </Text>
                {boreholeData.slice(0, 3).map((borehole, index) => (
                  <div key={index} style={{ 
                    marginBottom: '6px',
                    padding: '6px',
                    background: 'var(--bg-secondary)',
                    borderRadius: '4px'
                  }}>
                    <div style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>{borehole.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                      深度: {borehole.depth}m • 坐标: ({borehole.x}, {borehole.y}) • {borehole.layers}层
                    </div>
                  </div>
                ))}
                <Button  icon={<UploadOutlined />} style={{ width: '100%', marginTop: '8px' }}>
                  导入钻孔数据
                </Button>
              </div>
            </TabPane>
            
            <TabPane tab="基坑开挖" key="2">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>开挖深度 (m)</span>}>
                  <Slider
                    min={5}
                    max={30}
                    value={excavationParams.depth}
                    marks={{
                      5: '5',
                      15: '15',
                      30: '30'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    深度: {excavationParams.depth}m
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>分层厚度 (m)</span>}>
                  <InputNumber 
                    value={excavationParams.layerHeight} 
                    min={1} 
                    max={5} 
                    step={0.5}
                    addonAfter="m"
                    
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>基坑尺寸</span>}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <InputNumber 
                      addonBefore="长" 
                      addonAfter="m" 
                      value={excavationParams.length} 
                      
                    />
                    <InputNumber 
                      addonBefore="宽" 
                      addonAfter="m" 
                      value={excavationParams.width} 
                      
                    />
                  </div>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>边坡系数</span>}>
                  <Slider
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={excavationParams.slopeRatio}
                    marks={{
                      0.1: '0.1',
                      0.5: '0.5',
                      1.0: '1.0'
                    }}
                  />
                  <Text style={{ color: 'var(--accent-color)', fontSize: '12px' }}>
                    系数: {excavationParams.slopeRatio}
                  </Text>
                </Form.Item>
              </Form>

              <div style={{ position: 'relative', width: '100%', marginTop: '8px' }}>
                <Button 
                  icon={<UploadOutlined />} 
                  style={{ 
                    width: '100%',
                    height: '32px',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onClick={() => {
                    // 触发隐藏的文件输入
                    const fileInput = document.getElementById('dxf-file-input') as HTMLInputElement;
                    if (fileInput) {
                      fileInput.click();
                    }
                  }}
                >
                  导入DXF图纸
                </Button>
                <input
                  id="dxf-file-input"
                  type="file"
                  accept=".dxf,.dwg"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;

                    console.log('开始导入DXF文件:', file.name);
                    
                    try {
                      // 这里可以添加DXF文件处理逻辑
                      // 暂时显示成功消息
                      message.success(`DXF文件 "${file.name}" 导入成功`);
                      
                      // 重置文件输入
                      e.target.value = '';
                    } catch (error) {
                      console.error('DXF文件导入失败:', error);
                      message.error('DXF文件导入失败，请检查文件格式');
                    }
                  }}
                />
              </div>
            </TabPane>

            <TabPane tab="支护结构" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                  支护类型
                </Text>
                {supportTypes.map((type, index) => (
                  <div key={index} style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '8px',
                    padding: '6px',
                    background: type.enabled ? 'rgba(0, 217, 255, 0.1)' : 'var(--bg-secondary)',
                    borderRadius: '4px',
                    border: `1px solid ${type.enabled ? 'rgba(0, 217, 255, 0.3)' : 'var(--border-color)'}`
                  }}>
                    <div>
                      <div style={{ fontSize: '11px', color: 'white', fontWeight: 'bold' }}>
                        {type.icon} {type.name}
                      </div>
                      <div style={{ fontSize: '9px', color: 'var(--text-secondary)' }}>
                        {type.description}
                      </div>
                    </div>
                    <Switch  checked={type.enabled} />
                  </div>
                ))}
              </div>

              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>地连墙厚度 (m)</span>}>
                  <InputNumber 
                    value={supportParams.diaphragmWall.thickness} 
                    min={0.6} 
                    max={2.0} 
                    step={0.1}
                    addonAfter="m"
                    
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>锚杆长度 (m)</span>}>
                  <InputNumber 
                    value={supportParams.anchor.length} 
                    min={8} 
                    max={25} 
                    step={1}
                    addonAfter="m"
                    
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>锚杆角度 (°)</span>}>
                  <Slider
                    min={5}
                    max={30}
                    value={supportParams.anchor.angle}
                    marks={{
                      5: '5°',
                      15: '15°',
                      30: '30°'
                    }}
                  />
                  <Text style={{ color: 'var(--success-color)', fontSize: '12px' }}>
                    角度: {supportParams.anchor.angle}°
                  </Text>
                </Form.Item>
              </Form>
            </TabPane>
          </Tabs>

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button type="primary" icon={<ThunderboltOutlined />} style={{ flex: 1 }}>
              生成模型
            </Button>
            <Button icon={<SaveOutlined />}>
              保存
            </Button>
            <Button icon={<DownloadOutlined />}>
              导出
            </Button>
          </div>
        </Card>
      </div>

      {/* 悬浮右侧几何状态指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          几何模型状态
        </div>
        
        <div style={{ fontSize: '11px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>地质模型</span>
            <Tag color={stepStatus.geology === 'finish' ? 'success' : 'default'}>
              {stepStatus.geology === 'finish' ? '已完成' : '未生成'}
            </Tag>
          </div>
        </div>
        
        <div style={{ fontSize: '11px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>基坑开挖</span>
            <Tag color={stepStatus.excavation === 'finish' ? 'success' : 'default'}>
              {stepStatus.excavation === 'finish' ? '已完成' : '未生成'}
            </Tag>
          </div>
        </div>
        
        <div style={{ fontSize: '11px', marginBottom: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)' }}>支护结构</span>
            <Tag color={stepStatus.support === 'finish' ? 'success' : 'default'}>
              {stepStatus.support === 'finish' ? '已完成' : '未生成'}
            </Tag>
          </div>
        </div>

        <div style={{ marginTop: '12px', padding: '8px', background: 'var(--bg-secondary)', borderRadius: '6px' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>几何统计</div>
          <div style={{ fontSize: '10px' }}>
            <div style={{ color: 'var(--primary-color)' }}>钻孔: {geologyParams.boreholes}个</div>
            <div style={{ color: 'var(--accent-color)' }}>地层: {geologyParams.layers}层</div>
            <div style={{ color: 'var(--success-color)' }}>深度: {excavationParams.depth}m</div>
          </div>
        </div>
      </div>

      {/* 几何质量面板 - 与3号实时协作 */}
      <div style={{
        position: 'absolute',
        top: '200px',
        right: '20px',
        width: '400px',
        zIndex: 10
      }}>
        <GeometryQualityPanel
          geometry={{
            vertices: new Float32Array([]),
            faces: new Uint32Array([]),
            materialZones: []
          }}
          geometryId="geometry_lab_main"
          onGeometryOptimized={handleGeometryUpdate}
          onQualityImproved={(data) => console.log('Quality improved:', data)}
          realTimeMode={true}
          show3FeedbackDetails={true}
        />
      </div>

      {/* 钻孔3D可视化面板 */}
      {boreholes.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: '100px',
          right: '20px',
          width: '300px',
          height: '200px',
          zIndex: 10,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          background: 'rgba(26, 26, 26, 0.9)',
          backdropFilter: 'blur(20px)'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'rgba(255, 255, 255, 0.6)'
          }}>
            钻孔可视化组件已移除
          </div>
        </div>
      )}

      {/* 优化进度指示器 */}
      {optimizationInProgress && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'rgba(26, 26, 26, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '16px',
          padding: '24px',
          zIndex: 20,
          textAlign: 'center',
          minWidth: '300px'
        }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            border: '3px solid rgba(0, 217, 255, 0.3)',
            borderTop: '3px solid var(--primary-color)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          <div style={{ color: 'white', fontSize: '16px', marginBottom: '8px' }}>
            🔧 正在应用3号优化建议...
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
            几何数据优化中，请稍候
          </div>
        </div>
      )}

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 217, 255, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          🌍 地质
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          ⛏️ 开挖
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🏗️ 支护
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          💾 保存
        </Button>
      </div>
    </div>
  );
};

export default GeometryLabModule;