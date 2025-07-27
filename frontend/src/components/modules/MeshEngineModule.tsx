import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tabs, List, Form, InputNumber, Select, Slider, Progress, Tag } from 'antd';
import {
  AppstoreOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  SaveOutlined,
  FunctionOutlined,
  NodeIndexOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export const MeshEngineModule: React.FC = () => {
  const [meshSettings, setMeshSettings] = useState({
    elementSize: 0.5,
    elementType: 'tetrahedral',
    refinementLevel: 2,
    qualityThreshold: 0.8
  });

  const [meshStatus, setMeshStatus] = useState({
    isGenerating: false,
    progress: 0,
    nodes: 0,
    elements: 0,
    quality: 0
  });

  const meshTypes = [
    { name: '四面体网格', icon: '🔺', description: '四面体单元', quality: '高' },
    { name: '六面体网格', icon: '⬛', description: '六面体单元', quality: '中' },
    { name: '棱柱网格', icon: '📐', description: '棱柱单元', quality: '中' },
    { name: '混合网格', icon: '🔄', description: '混合单元', quality: '可变' }
  ];

  const meshQualityMetrics = [
    { name: '长宽比', value: 0.87, status: 'good', color: '#52c41a' },
    { name: '歪斜度', value: 0.23, status: 'excellent', color: '#1890ff' },
    { name: '正交性', value: 0.91, status: 'excellent', color: '#1890ff' },
    { name: '体积比', value: 0.76, status: 'good', color: '#52c41a' }
  ];

  const meshOperations = [
    { name: '生成网格', icon: <ThunderboltOutlined />, action: () => console.log('Generate') },
    { name: '细化网格', icon: <FunctionOutlined />, action: () => console.log('Refine') },
    { name: '质量检查', icon: <CheckCircleOutlined />, action: () => console.log('Check') },
    { name: '网格优化', icon: <AppstoreOutlined />, action: () => console.log('Optimize') }
  ];

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
            linear-gradient(rgba(139, 92, 246, 0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
          `,
          backgroundSize: '15px 15px',
          opacity: 0.4
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
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>🔺</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D网格可视化视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 实时网格预览
            <br />
            ✅ 质量色彩映射
            <br />
            ✅ 交互式网格编辑
            <br />
            ✅ 切片分析视图
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
              <NodeIndexOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>网格生成引擎</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(139, 92, 246, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
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
            <TabPane tab="网格类型" key="1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {meshTypes.map((type, index) => (
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
                    onClick={() => console.log('Select', type.name)}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>{type.icon}</div>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>{type.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>{type.description}</div>
                    <Tag 
                       
                      color={type.quality === '高' ? 'green' : type.quality === '中' ? 'orange' : 'blue'}
                      style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px' }}
                    >
                      {type.quality}
                    </Tag>
                  </Button>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="网格参数" key="2">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>单元尺寸 (mm)</span>}>
                  <Slider
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    value={meshSettings.elementSize}
                    onChange={(value) => setMeshSettings({...meshSettings, elementSize: value})}
                    marks={{
                      0.1: '0.1',
                      1.0: '1.0',
                      2.5: '2.5',
                      5.0: '5.0'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    当前: {meshSettings.elementSize} mm
                  </Text>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>细化级别</span>}>
                  <Select 
                    value={meshSettings.refinementLevel} 
                    onChange={(value) => setMeshSettings({...meshSettings, refinementLevel: value})}
                    style={{ width: '100%' }}
                  >
                    <Option value={1}>粗糙 (快速)</Option>
                    <Option value={2}>标准 (平衡)</Option>
                    <Option value={3}>精细 (高质量)</Option>
                    <Option value={4}>超精细 (最高质量)</Option>
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>质量阈值</span>}>
                  <Slider
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={meshSettings.qualityThreshold}
                    onChange={(value) => setMeshSettings({...meshSettings, qualityThreshold: value})}
                    marks={{
                      0.5: '0.5',
                      0.7: '0.7',
                      0.9: '0.9',
                      1.0: '1.0'
                    }}
                  />
                  <Text style={{ color: 'var(--accent-color)', fontSize: '12px' }}>
                    阈值: {meshSettings.qualityThreshold}
                  </Text>
                </Form.Item>
              </Form>
            </TabPane>

            <TabPane tab="质量分析" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  网格质量指标
                </Text>
              </div>
              
              {meshQualityMetrics.map((metric, index) => (
                <div key={index} style={{ 
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <Text style={{ color: 'white', fontSize: '12px' }}>{metric.name}</Text>
                    <Text style={{ color: metric.color, fontSize: '12px', fontWeight: 'bold' }}>
                      {metric.value.toFixed(2)}
                    </Text>
                  </div>
                  <Progress 
                    percent={metric.value * 100} 
                     
                    strokeColor={metric.color}
                    showInfo={false}
                  />
                  <Text style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                    状态: {metric.status}
                  </Text>
                </div>
              ))}
            </TabPane>
          </Tabs>

          <div style={{ marginTop: '16px' }}>
            <Text style={{ color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '8px', display: 'block' }}>
              快速操作
            </Text>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {meshOperations.map((op, index) => (
                <Button 
                  key={index}
                  type={index === 0 ? "primary" : "default"}
                  icon={op.icon}
                  
                  onClick={op.action}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '32px'
                  }}
                >
                  {op.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 网格统计 */}
          <div style={{ 
            marginTop: '16px', 
            padding: '12px', 
            background: 'var(--bg-secondary)', 
            borderRadius: '8px',
            border: '1px solid var(--border-color)'
          }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px' }}>
              <div>
                <Text style={{ color: 'var(--text-secondary)' }}>节点数:</Text>
                <Text style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                  12,485
                </Text>
              </div>
              <div>
                <Text style={{ color: 'var(--text-secondary)' }}>单元数:</Text>
                <Text style={{ color: 'var(--accent-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                  45,672
                </Text>
              </div>
              <div>
                <Text style={{ color: 'var(--text-secondary)' }}>质量:</Text>
                <Text style={{ color: 'var(--success-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                  0.87
                </Text>
              </div>
              <div>
                <Text style={{ color: 'var(--text-secondary)' }}>状态:</Text>
                <Text style={{ color: 'var(--success-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                  已完成
                </Text>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* 悬浮右侧网格质量指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '140px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          网格质量
        </div>
        <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginBottom: '6px' }}>
          尺寸: {meshSettings.elementSize}mm
        </div>
        <div style={{ fontSize: '11px', color: 'var(--accent-color)', marginBottom: '6px' }}>
          质量: {meshSettings.qualityThreshold}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--success-color)' }}>
          级别: {meshSettings.refinementLevel}
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
        border: '1px solid rgba(139, 92, 246, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(139, 92, 246, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          🔺 网格
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📊 质量
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          ✂️ 切片
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🎨 着色
        </Button>
      </div>
    </div>
  );
};

export default MeshEngineModule;