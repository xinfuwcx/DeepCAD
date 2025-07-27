import React, { useState } from 'react';
import { Card, Button, Space, Typography, Form, InputNumber, Select, Switch, Slider, Progress, Timeline, Table, Tag, Tabs } from 'antd';
import {
  ExclamationCircleOutlined,
  SettingOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  BarChartOutlined,
  EnvironmentOutlined,
  SafetyOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;

export const ExcavationModule: React.FC = () => {
  const [currentStage, setCurrentStage] = useState(0);
  const [isExcavating, setIsExcavating] = useState(false);
  const [excavationProgress, setExcavationProgress] = useState(0);
  const [excavationMethod, setExcavationMethod] = useState('open_cut');

  const excavationStages = [
    { name: '第一层开挖', depth: '0-3m', duration: '5天', status: 'completed' },
    { name: '第二层开挖', depth: '3-6m', duration: '7天', status: 'completed' },
    { name: '第三层开挖', depth: '6-9m', duration: '8天', status: 'current' },
    { name: '第四层开挖', depth: '9-12m', duration: '10天', status: 'planned' },
    { name: '第五层开挖', depth: '12-15m', duration: '12天', status: 'planned' }
  ];

  const monitoringData = [
    { point: 'M-01', displacement: '2.5mm', settlement: '1.2mm', stress: '150kPa', status: 'normal' },
    { point: 'M-02', displacement: '3.8mm', settlement: '2.1mm', stress: '185kPa', status: 'warning' },
    { point: 'M-03', displacement: '1.9mm', settlement: '0.8mm', stress: '125kPa', status: 'normal' },
    { point: 'M-04', displacement: '4.2mm', settlement: '2.8mm', stress: '210kPa', status: 'alert' },
    { point: 'M-05', displacement: '2.1mm', settlement: '1.0mm', stress: '135kPa', status: 'normal' }
  ];

  const supportSystems = [
    { name: '钢支撑', quantity: '12根', specification: 'Φ609×16', status: 'installed' },
    { name: '预应力锚杆', quantity: '48根', specification: 'Φ32×12m', status: 'installed' },
    { name: '喷射混凝土', quantity: '560m²', specification: 'C25 t=100mm', status: 'completed' },
    { name: '钢筋网', quantity: '560m²', specification: 'Φ8@200×200', status: 'completed' }
  ];

  const excavationMethods = [
    { value: 'open_cut', label: '明挖法', description: '适用于浅层开挖' },
    { value: 'top_down', label: '盖挖法', description: '交通影响小' },
    { value: 'bottom_up', label: '逆作法', description: '支护效果好' },
    { value: 'sequential', label: '分段开挖', description: '适用于长距离' }
  ];

  const safetyParameters = [
    { parameter: '最大位移', current: '4.2mm', limit: '20mm', status: 'normal', percentage: 21 },
    { parameter: '最大沉降', current: '2.8mm', limit: '30mm', status: 'normal', percentage: 9 },
    { parameter: '支护应力', current: '210kPa', limit: '400kPa', status: 'normal', percentage: 53 },
    { parameter: '地下水位', current: '-8.5m', limit: '-5m', status: 'warning', percentage: 70 }
  ];

  const monitoringColumns = [
    { title: '监测点', dataIndex: 'point', key: 'point', width: 80 },
    { title: '位移', dataIndex: 'displacement', key: 'displacement', width: 80 },
    { title: '沉降', dataIndex: 'settlement', key: 'settlement', width: 80 },
    { title: '应力', dataIndex: 'stress', key: 'stress', width: 80 },
    { 
      title: '状态', 
      dataIndex: 'status', 
      key: 'status', 
      width: 80,
      render: (status: string) => (
        <Tag color={
          status === 'normal' ? 'success' :
          status === 'warning' ? 'warning' : 'error'
        }>
          {status === 'normal' ? '正常' :
           status === 'warning' ? '警告' : '报警'}
        </Tag>
      )
    }
  ];

  const startExcavation = () => {
    setIsExcavating(true);
    setExcavationProgress(0);
  };

  const pauseExcavation = () => {
    setIsExcavating(false);
  };

  const stopExcavation = () => {
    setIsExcavating(false);
    setExcavationProgress(0);
  };

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
        {/* 基坑工程背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 30% 30%, rgba(255, 193, 7, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 70% 70%, rgba(255, 107, 104, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 50% 90%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)
          `,
          opacity: 0.6
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
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>⛏️</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D基坑开挖视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 基坑三维模拟
            <br />
            ✅ 分层开挖动画
            <br />
            ✅ 支护结构预览
            <br />
            ✅ 实时监测可视化
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
              <ExclamationCircleOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>基坑开挖工具</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 193, 7, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 193, 7, 0.1)'
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
            <TabPane tab="开挖参数" key="1">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>开挖方法</span>}>
                  <Select 
                    value={excavationMethod}
                    onChange={setExcavationMethod}
                    style={{ width: '100%' }}
                  >
                    {excavationMethods.map(method => (
                      <Option key={method.value} value={method.value}>
                        <div>
                          <div>{method.label}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {method.description}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>开挖深度</span>}>
                  <InputNumber 
                    style={{ width: '100%' }} 
                    defaultValue={15} 
                    min={1}
                    max={50}
                    step={0.5}
                    addonAfter="m"
                    
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>开挖宽度</span>}>
                  <InputNumber 
                    style={{ width: '100%' }} 
                    defaultValue={25} 
                    min={5}
                    max={100}
                    step={0.5}
                    addonAfter="m"
                    
                  />
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>分层厚度</span>}>
                  <Slider
                    min={1}
                    max={5}
                    step={0.5}
                    defaultValue={3}
                    marks={{
                      1: '1m',
                      3: '3m',
                      5: '5m'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    厚度: 3m
                  </Text>
                </Form.Item>

                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>自动监测</Text>
                    <Switch defaultChecked  />
                  </div>
                </Form.Item>

                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>预警系统</Text>
                    <Switch defaultChecked  />
                  </div>
                </Form.Item>
              </Form>
            </TabPane>
            
            <TabPane tab="开挖进度" key="2">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  施工进度
                </Text>
              </div>
              
              {excavationStages.map((stage, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  background: stage.status === 'current' ? 'rgba(255, 193, 7, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: `1px solid ${stage.status === 'current' ? 'rgba(255, 193, 7, 0.3)' : 'var(--border-color)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{stage.name}</Text>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: stage.status === 'completed' ? '#10b981' : 
                                 stage.status === 'current' ? '#ffc107' : 'var(--text-muted)'
                    }} />
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    深度: {stage.depth} • 工期: {stage.duration}
                  </div>
                </div>
              ))}
            </TabPane>

            <TabPane tab="支护系统" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  支护结构
                </Text>
              </div>
              
              {supportSystems.map((system, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>
                      {system.name}
                    </Text>
                    <Tag color={system.status === 'installed' ? 'success' : 'processing'}>
                      {system.status === 'installed' ? '已安装' : '进行中'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    数量: {system.quantity} • 规格: {system.specification}
                  </div>
                </div>
              ))}
            </TabPane>

            <TabPane tab="监测数据" key="4">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  实时监测
                </Text>
              </div>
              
              {monitoringData.slice(0, 3).map((data, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <Text style={{ color: 'white', fontSize: '12px' }}>{data.point}</Text>
                    <Tag 
                      
                      color={data.status === 'normal' ? 'success' : data.status === 'warning' ? 'warning' : 'error'}
                    >
                      {data.status === 'normal' ? '正常' : data.status === 'warning' ? '警告' : '报警'}
                    </Tag>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    位移: {data.displacement} • 沉降: {data.settlement} • 应力: {data.stress}
                  </div>
                </div>
              ))}
            </TabPane>
          </Tabs>

          {/* 开挖控制 */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <Button 
                type="primary" 
                icon={isExcavating ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                onClick={isExcavating ? pauseExcavation : startExcavation}
                style={{ flex: 1 }}
              >
                {isExcavating ? '暂停开挖' : '开始开挖'}
              </Button>
              <Button 
                icon={<StopOutlined />}
                onClick={stopExcavation}
                disabled={!isExcavating}
              >
                停止
              </Button>
            </div>

            {isExcavating && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <Progress
                  percent={excavationProgress}
                  strokeColor="var(--primary-color)"
                  style={{ marginBottom: '8px' }}
                />
                <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                  开挖进度: {excavationProgress}%
                </Text>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 悬浮右侧安全指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 193, 7, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 193, 7, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          安全状态
        </div>
        {safetyParameters.slice(0, 3).map((param, index) => (
          <div key={index} style={{ fontSize: '11px', marginBottom: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: 'var(--text-secondary)' }}>{param.parameter.slice(0, 4)}</span>
              <span style={{ 
                color: param.status === 'normal' ? 'var(--success-color)' : 
                       param.status === 'warning' ? 'var(--warning-color)' : 'var(--error-color)'
              }}>
                {param.current}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 193, 7, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 193, 7, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          ⛏️ 开挖
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🏗️ 支护
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📊 监测
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          ⚠️ 预警
        </Button>
      </div>
    </div>
  );
};

export default ExcavationModule;