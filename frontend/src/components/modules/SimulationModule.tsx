import React, { useState } from 'react';
import { Card, Button, Space, Typography, Tabs, Form, Select, Slider, Switch, Progress, Alert, Statistic, Tag } from 'antd';
import {
  ExperimentOutlined,
  RocketOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  ThunderboltOutlined,
  BarChartOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

export const SimulationModule: React.FC = () => {
  const [simulationSettings, setSimulationSettings] = useState({
    analysisType: 'static',
    solverType: 'direct',
    timeSteps: 100,
    convergence: 1e-6,
    nonlinear: false
  });

  const [simulationStatus, setSimulationStatus] = useState({
    isRunning: false,
    progress: 45,
    currentStep: 45,
    totalSteps: 100,
    elapsedTime: '00:03:24',
    estimatedRemaining: '00:04:12'
  });

  const analysisTypes = [
    { name: '静态分析', icon: '⚖️', description: '静态力学分析', complexity: '低' },
    { name: '动态分析', icon: '🌊', description: '动态响应分析', complexity: '中' },
    { name: '模态分析', icon: '🎵', description: '模态频率分析', complexity: '中' },
    { name: '热分析', icon: '🔥', description: '热传导分析', complexity: '高' },
    { name: '流体分析', icon: '💧', description: '流体力学分析', complexity: '高' },
    { name: '多物理场', icon: '🔗', description: '多物理场耦合', complexity: '专家' }
  ];

  const solverSettings = [
    { name: '直接稀疏', description: '直接稀疏求解器', memory: '高', speed: '中' },
    { name: '迭代梯度', description: '迭代预条件梯度', memory: '低', speed: '高' },
    { name: '并行直接', description: '并行直接求解器', memory: '高', speed: '高' },
    { name: 'GPU加速', description: 'GPU加速求解器', memory: '中', speed: '极高' }
  ];

  const loadCases = [
    { id: 1, name: '重力载荷', type: '体力载荷', magnitude: '9.81 m/s²', status: 'active' },
    { id: 2, name: '风载荷', type: '面压载荷', magnitude: '1.2 kN/m²', status: 'active' },
    { id: 3, name: '地震载荷', type: '加速度载荷', magnitude: '0.4g', status: 'inactive' },
    { id: 4, name: '温度载荷', type: '热载荷', magnitude: '50°C', status: 'inactive' }
  ];

  const boundaryConditions = [
    { id: 1, name: '固定约束', type: '固定支座', location: '底面', dof: '全自由度' },
    { id: 2, name: '铰接约束', type: '铰接支座', location: '顶面中心', dof: 'XYZ平移' },
    { id: 3, name: '对称约束', type: '对称边界', location: '侧面', dof: 'X平移' }
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
        {/* 动态背景效果 */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            radial-gradient(circle at 20% 20%, rgba(255, 107, 104, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 80% 80%, rgba(52, 199, 89, 0.1) 0%, transparent 50%),
            radial-gradient(circle at 40% 60%, rgba(0, 217, 255, 0.1) 0%, transparent 50%)
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
          <div style={{ fontSize: '64px', marginBottom: '24px', opacity: 0.2 }}>🧪</div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '12px', opacity: 0.6 }}>3D仿真结果视口</div>
          <div style={{ fontSize: '16px', opacity: 0.4 }}>
            ✅ 实时结果可视化
            <br />
            ✅ 应力云图显示
            <br />
            ✅ 变形动画播放
            <br />
            ✅ 截面分析视图
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
              <ExperimentOutlined style={{ color: 'var(--primary-color)' }} />
              <span style={{ color: 'white', fontSize: '14px' }}>仿真分析引擎</span>
            </Space>
          }
          style={{ 
            background: 'rgba(26, 26, 26, 0.75)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 107, 104, 0.2)',
            borderRadius: '16px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 107, 104, 0.1)'
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
            <TabPane tab="分析类型" key="1">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                {analysisTypes.map((type, index) => (
                  <Button
                    key={index}
                    className="glass-card"
                    style={{
                      height: '100px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border-color)',
                      position: 'relative'
                    }}
                    onClick={() => console.log('Select', type.name)}
                  >
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{type.icon}</div>
                    <div style={{ fontSize: '11px', fontWeight: 'bold', textAlign: 'center', marginBottom: '2px' }}>
                      {type.name}
                    </div>
                    <div style={{ fontSize: '9px', color: 'var(--text-secondary)', textAlign: 'center' }}>
                      {type.description}
                    </div>
                    <Tag 
                       
                      color={
                        type.complexity === '低' ? 'green' : 
                        type.complexity === '中' ? 'orange' : 
                        type.complexity === '高' ? 'red' : 'purple'
                      }
                      style={{ position: 'absolute', top: '4px', right: '4px', fontSize: '8px' }}
                    >
                      {type.complexity}
                    </Tag>
                  </Button>
                ))}
              </div>
            </TabPane>
            
            <TabPane tab="求解设置" key="2">
              <Form layout="vertical" >
                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>求解器类型</span>}>
                  <Select 
                    value={simulationSettings.solverType} 
                    onChange={(value) => setSimulationSettings({...simulationSettings, solverType: value})}
                    style={{ width: '100%' }}
                  >
                    {solverSettings.map((solver, index) => (
                      <Option key={index} value={solver.name.toLowerCase().replace(' ', '_')}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{solver.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                            {solver.description} • 内存: {solver.memory} • 速度: {solver.speed}
                          </div>
                        </div>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>

                <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>收敛精度</span>}>
                  <Slider
                    min={-8}
                    max={-3}
                    step={1}
                    value={Math.log10(simulationSettings.convergence)}
                    onChange={(value) => setSimulationSettings({
                      ...simulationSettings, 
                      convergence: Math.pow(10, value)
                    })}
                    marks={{
                      '-8': '1e-8',
                      '-6': '1e-6', 
                      '-4': '1e-4',
                      '-3': '1e-3'
                    }}
                  />
                  <Text style={{ color: 'var(--primary-color)', fontSize: '12px' }}>
                    当前: {simulationSettings.convergence.toExponential(0)}
                  </Text>
                </Form.Item>

                <Form.Item>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ color: 'var(--text-secondary)' }}>非线性分析</Text>
                    <Switch
                      checked={simulationSettings.nonlinear}
                      onChange={(checked) => setSimulationSettings({
                        ...simulationSettings, 
                        nonlinear: checked
                      })}
                    />
                  </div>
                </Form.Item>

                {simulationSettings.nonlinear && (
                  <Form.Item label={<span style={{ color: 'var(--text-secondary)' }}>载荷步数</span>}>
                    <Slider
                      min={10}
                      max={1000}
                      value={simulationSettings.timeSteps}
                      onChange={(value) => setSimulationSettings({
                        ...simulationSettings, 
                        timeSteps: value
                      })}
                      marks={{
                        10: '10',
                        100: '100',
                        500: '500',
                        1000: '1000'
                      }}
                    />
                    <Text style={{ color: 'var(--accent-color)', fontSize: '12px' }}>
                      步数: {simulationSettings.timeSteps}
                    </Text>
                  </Form.Item>
                )}
              </Form>
            </TabPane>

            <TabPane tab="载荷边界" key="3">
              <div style={{ marginBottom: '16px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  载荷工况
                </Text>
              </div>
              
              {loadCases.map((load, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  background: load.status === 'active' ? 'rgba(0, 217, 255, 0.1)' : 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: `1px solid ${load.status === 'active' ? 'rgba(0, 217, 255, 0.3)' : 'var(--border-color)'}`
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{load.name}</Text>
                      <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                        {load.type} • {load.magnitude}
                      </div>
                    </div>
                    <Switch 
                      
                      checked={load.status === 'active'}
                      onChange={() => console.log('Toggle load', load.id)}
                    />
                  </div>
                </div>
              ))}

              <div style={{ marginTop: '16px', marginBottom: '12px' }}>
                <Text style={{ color: 'var(--text-secondary)', fontSize: '14px', fontWeight: 'bold' }}>
                  边界条件
                </Text>
              </div>

              {boundaryConditions.map((bc, index) => (
                <div key={index} style={{ 
                  marginBottom: '8px',
                  padding: '8px',
                  background: 'rgba(52, 199, 89, 0.1)',
                  borderRadius: '6px',
                  border: '1px solid rgba(52, 199, 89, 0.3)'
                }}>
                  <Text style={{ color: 'white', fontSize: '12px', fontWeight: 'bold' }}>{bc.name}</Text>
                  <div style={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                    {bc.type} @ {bc.location} • {bc.dof}
                  </div>
                </div>
              ))}
            </TabPane>
          </Tabs>

          {/* 仿真控制 */}
          <div style={{ marginTop: '16px' }}>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                disabled={simulationStatus.isRunning}
                style={{ flex: 1 }}
              >
                开始仿真
              </Button>
              <Button 
                icon={<PauseCircleOutlined />}
                disabled={!simulationStatus.isRunning}
              >
                暂停
              </Button>
              <Button 
                icon={<StopOutlined />}
                disabled={!simulationStatus.isRunning}
              >
                停止
              </Button>
            </div>

            {/* 仿真状态 */}
            {simulationStatus.progress > 0 && (
              <div style={{ 
                padding: '12px', 
                background: 'var(--bg-secondary)', 
                borderRadius: '8px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ marginBottom: '8px' }}>
                  <Text style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>仿真进度</Text>
                </div>
                <Progress 
                  percent={simulationStatus.progress} 
                  strokeColor="var(--primary-color)"
                  style={{ marginBottom: '8px' }}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                  <div>
                    <Text style={{ color: 'var(--text-secondary)' }}>当前步:</Text>
                    <Text style={{ color: 'var(--primary-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                      {simulationStatus.currentStep}/{simulationStatus.totalSteps}
                    </Text>
                  </div>
                  <div>
                    <Text style={{ color: 'var(--text-secondary)' }}>已用时间:</Text>
                    <Text style={{ color: 'var(--accent-color)', fontWeight: 'bold', marginLeft: '4px' }}>
                      {simulationStatus.elapsedTime}
                    </Text>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* 悬浮右侧仿真状态指示器 */}
      <div style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 107, 104, 0.2)',
        borderRadius: '16px',
        padding: '16px',
        minWidth: '160px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 107, 104, 0.1)'
      }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', textAlign: 'center' }}>
          仿真状态
        </div>
        <div style={{ fontSize: '11px', color: 'var(--primary-color)', marginBottom: '6px' }}>
          类型: {simulationSettings.analysisType}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--accent-color)', marginBottom: '6px' }}>
          精度: {simulationSettings.convergence.toExponential(0)}
        </div>
        {simulationStatus.progress > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--success-color)' }}>
            进度: {simulationStatus.progress}%
          </div>
        )}
      </div>

      {/* 悬浮底部工具栏 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(26, 26, 26, 0.75)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 107, 104, 0.2)',
        borderRadius: '20px',
        padding: '12px 24px',
        display: 'flex',
        gap: '20px',
        zIndex: 10,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 107, 104, 0.1)'
      }}>
        <Button  type="text" style={{ color: 'var(--primary-color)', border: 'none' }}>
          🧪 应力
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          📏 位移
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          🎬 动画
        </Button>
        <Button  type="text" style={{ color: 'var(--text-secondary)', border: 'none' }}>
          ✂️ 剖面
        </Button>
      </div>
    </div>
  );
};

export default SimulationModule;