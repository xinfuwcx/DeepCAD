/**
 * 物理AI视图 - 3号计算专家核心模块
 * 集成4个物理AI功能：设计变量管理、目标函数优化、伴随求解器、优化管理器
 * @author 1号首席架构师 & 3号计算专家
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Card, Tabs, Row, Col, Button, Space, Typography, Progress, Alert, Select, InputNumber, Switch, Slider, Popover } from 'antd';
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine } from 'recharts';
import { 
  ExperimentOutlined, 
  ThunderboltOutlined, 
  CalculatorOutlined, 
  RobotOutlined,
  FunctionOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  CheckCircleOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
import { GlassCard, GlassButton } from '../components/ui/GlassComponents';
import UnifiedModuleLayout from '../components/ui/layout/UnifiedModuleLayout';
import Panel from '../components/ui/layout/Panel';
import MetricCard from '../components/ui/layout/MetricCard';
import usePhysicsAIController from '../hooks/usePhysicsAIController';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// 物理AI功能状态类型
type PhysicsAIStatus = 'idle' | 'configuring' | 'running' | 'completed' | 'error';

// 设计变量接口
interface DesignVariable {
  id: string;
  name: string;
  parameterName: string;
  initialValue: number;
  lowerBound: number;
  upperBound: number;
  unit: string;
  targetEntity?: string;
  description: string;
}

// 目标函数配置
interface ObjectiveFunction {
  type: 'misfit' | 'custom';
  name: string;
  description: string;
  weight: number;
  regularization: number;
  enabled: boolean;
}

// 优化结果
interface OptimizationResult {
  iterationCount: number;
  objectiveValue: number;
  convergenceStatus: 'converged' | 'running' | 'failed';
  optimizedParameters: Record<string, number>;
  computationTime: number;
}

interface PhysicsAIViewProps {
  systemIntegration?: any;
  onBack?: () => void;
  results?: any;
  onParameterOptimization?: (params: any) => void;
  onAIRecommendation?: (recommendation: any) => void;
  isOptimizing?: boolean;
  recommendations?: any[];
}

const PhysicsAIView: React.FC<PhysicsAIViewProps> = ({ 
  systemIntegration, 
  onBack, 
  results, 
  onParameterOptimization, 
  onAIRecommendation, 
  isOptimizing, 
  recommendations 
}) => {
  const [activeTab, setActiveTab] = useState('design-variables');
  const { runState: physicsAIStatus, progress, start: controllerStart, optimizationResult, reset, trainingStats, config, updateConfig } = usePhysicsAIController();
  const [autoNormalize, setAutoNormalize] = useState(true);
  const [autoRerun, setAutoRerun] = useState(false);
  const [weightsDirty, setWeightsDirty] = useState(false);
  const lastRunWeightsRef = React.useRef<string>(JSON.stringify(config.fusionWeights));
  const autoRunTimerRef = useRef<any>(null);
  const [debounceMs, setDebounceMs] = useState(600);
  const [pendingRerunDeadline, setPendingRerunDeadline] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);
  // countdown effect
  useEffect(()=>{
    if (!pendingRerunDeadline) return;
    const id = setInterval(()=>{
      const left = pendingRerunDeadline - Date.now();
      if (left <= 0) {
        setRemainingMs(0);
        clearInterval(id);
      } else {
        setRemainingMs(left);
      }
    }, 100);
    return ()=>clearInterval(id);
  }, [pendingRerunDeadline]);

  // 恢复持久化的权重
  useEffect(() => {
    try {
      const saved = localStorage.getItem('physicsAI_fusionWeights');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          updateConfig('fusionWeights', parsed);
          lastRunWeightsRef.current = JSON.stringify(parsed);
        }
      }
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 持久化 & 全局暴露
  useEffect(() => {
    try {
      localStorage.setItem('physicsAI_fusionWeights', JSON.stringify(config.fusionWeights));
      (window as any).DeepCADPhysicsAI = {
        ...(window as any).DeepCADPhysicsAI,
        fusionWeights: config.fusionWeights
      };
    } catch {}
  }, [config.fusionWeights]);
  
  // 设计变量状态
  const [designVariables, setDesignVariables] = useState<DesignVariable[]>([
    {
      id: 'soil_elasticity',
      name: '土体弹性模量',
      parameterName: 'E_soil',
      initialValue: 20.0,
      lowerBound: 5.0,
      upperBound: 50.0,
      unit: 'MPa',
      targetEntity: '粘土层',
      description: '控制土体变形特性的关键参数'
    },
    {
      id: 'friction_angle',
      name: '内摩擦角',
      parameterName: 'phi',
      initialValue: 25.0,
      lowerBound: 15.0,
      upperBound: 40.0,
      unit: '°',
      targetEntity: '砂土层',
      description: '影响土体剪切强度的重要参数'
    },
    {
      id: 'cohesion',
      name: '粘聚力',
      parameterName: 'c',
      initialValue: 10.0,
      lowerBound: 0.0,
      upperBound: 30.0,
      unit: 'kPa',
      targetEntity: '粘土层',
      description: '土体抗剪强度的重要组成'
    }
  ]);

  // 目标函数状态
  const [objectiveFunctions, setObjectiveFunctions] = useState<ObjectiveFunction[]>([
    {
      type: 'misfit',
      name: '位移失配函数',
      description: 'L2范数失配 + Tikhonov正则化',
      weight: 1.0,
      regularization: 0.01,
      enabled: true
    },
    {
      type: 'custom',
      name: '应力匹配函数',
      description: '实测应力与计算应力的匹配优化',
      weight: 0.5,
      regularization: 0.005,
      enabled: false
    }
  ]);

  // 结果由 controller 提供 (Phase1 mock)

  // 启动物理AI分析
  const startPhysicsAIAnalysis = async (_type: 'inverse' | 'forward' | 'optimization') => {
    controllerStart();
  };

  // 启动优化
  const startOptimization = () => startPhysicsAIAnalysis('optimization');

  // 获取状态徽章
  const getStatusBadge = (status: PhysicsAIStatus) => {
    const badges = {
      'idle': { color: '#8c8c8c', text: '待机', icon: <SettingOutlined /> },
      'configuring': { color: '#1890ff', text: '配置中', icon: <LoadingOutlined spin /> },
      'running': { color: '#faad14', text: '运行中', icon: <LoadingOutlined spin /> },
      'completed': { color: '#52c41a', text: '完成', icon: <CheckCircleOutlined /> },
      'error': { color: '#ff4d4f', text: '错误', icon: <ExperimentOutlined /> }
    };
    const badge = badges[status];
    
    return (
      <Space>
        <span style={{ color: badge.color }}>{badge.icon}</span>
        <span style={{ color: badge.color, fontWeight: 'bold' }}>{badge.text}</span>
      </Space>
    );
  };

  // 指标
  const metrics = useMemo(() => {
    const activeObjectives = objectiveFunctions.filter(o => o.enabled).length;
    const lastLoss = trainingStats.totalLoss.length ? trainingStats.totalLoss[trainingStats.totalLoss.length - 1] : undefined;
    return [
      { label: '状态', value: physicsAIStatus === 'running' ? 'RUN' : physicsAIStatus.toUpperCase(), accent: physicsAIStatus === 'running' ? 'orange' as const : physicsAIStatus === 'completed' ? 'green' as const : 'blue' as const },
      { label: '进度', value: progress + '%', accent: 'purple' as const },
      { label: '变量', value: String(designVariables.length), accent: 'blue' as const },
      { label: '目标', value: String(activeObjectives), accent: 'orange' as const },
      { label: '迭代', value: optimizationResult ? String(optimizationResult.iterationCount) : String(trainingStats.epochs.length), accent: 'green' as const },
      { label: 'Loss', value: lastLoss ? lastLoss.toExponential(2) : '-', accent: 'red' as const }
    ];
  }, [physicsAIStatus, progress, designVariables, objectiveFunctions, optimizationResult, trainingStats]);

  return (
    <UnifiedModuleLayout
      left={<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel title={<span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><RobotOutlined /> 物理AI</span>} dense>
          <Tabs size="small" activeKey={activeTab} onChange={setActiveTab} style={{ maxHeight: 620, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TabPane key="design-variables" tab={<span><FunctionOutlined /> 设计变量</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <Button size="small" type="primary" onClick={startOptimization} disabled={physicsAIStatus === 'running'}>
                  {physicsAIStatus === 'running' ? '运行中...' : '启动PINN'}
                </Button>
                <div style={{ overflowY: 'auto', maxHeight: 420, paddingRight: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {designVariables.map(v => (
                    <Card key={v.id} size="small" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }} title={<span style={{ fontSize: 12 }}>{v.name} ({v.parameterName})</span>}>
                      <Row gutter={6}>
                        <Col span={6}><InputNumber size="small" value={v.initialValue} style={{ width: '100%' }} /></Col>
                        <Col span={6}><InputNumber size="small" value={v.lowerBound} style={{ width: '100%' }} /></Col>
                        <Col span={6}><InputNumber size="small" value={v.upperBound} style={{ width: '100%' }} /></Col>
                        <Col span={6}><div style={{ fontSize: 11, textAlign: 'center', padding: '2px 4px', background: 'var(--bg-secondary)', borderRadius: 4 }}>{v.unit}</div></Col>
                      </Row>
                      <div style={{ marginTop: 4, fontSize: 10, opacity: .6 }}>目标: {v.targetEntity} • {v.description}</div>
                    </Card>
                  ))}
                </div>
              </div>
            </TabPane>
            <TabPane key="objective-functions" tab={<span><CalculatorOutlined /> 目标函数</span>}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', maxHeight: 520, paddingRight: 4 }}>
                {objectiveFunctions.map((f,i) => (
                  <Card key={i} size="small" style={{ background: 'var(--bg-tertiary)', border: `1px solid ${f.enabled ? 'var(--border-color-strong)' : 'var(--border-color)'}` }}>
                    <Row align="middle" justify="space-between">
                      <Col span={14}>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ fontSize: 10, opacity: .55 }}>{f.description}</div>
                      </Col>
                      <Col span={10}>
                        <Space size={6}>
                          <InputNumber size="small" value={f.weight} min={0} max={2} step={0.1} style={{ width: 70 }} />
                          <Switch size="small" checked={f.enabled} />
                        </Space>
                      </Col>
                    </Row>
                  </Card>
                ))}
              </div>
            </TabPane>
            <TabPane key="adjoint-solver" tab={<span><ThunderboltOutlined /> 伴随</span>}>
              <div style={{ fontSize: 12, opacity: .7, lineHeight: 1.5 }}>伴随梯度求解配置（保留原功能占位）。后续与数值求解器集成。</div>
            </TabPane>
            <TabPane key="optimization-manager" tab={<span><ExperimentOutlined /> 优化</span>}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Space wrap>
                  <Button size="small" onClick={() => startPhysicsAIAnalysis('inverse')} disabled={physicsAIStatus === 'running'} icon={<CalculatorOutlined />}>逆向</Button>
                  <Button size="small" onClick={() => startPhysicsAIAnalysis('forward')} disabled={physicsAIStatus === 'running'} icon={<PlayCircleOutlined />}>正向</Button>
                  <Button size="small" onClick={() => startPhysicsAIAnalysis('optimization')} disabled={physicsAIStatus === 'running'} icon={<ThunderboltOutlined />}>优化</Button>
                    <Button size="small" onClick={() => startPhysicsAIAnalysis('inverse')} disabled={physicsAIStatus === 'running'} icon={<CalculatorOutlined />}>逆向</Button>
                    <Button size="small" onClick={() => startPhysicsAIAnalysis('forward')} disabled={physicsAIStatus === 'running'} icon={<PlayCircleOutlined />}>正向</Button>
                    <Button size="small" onClick={() => startPhysicsAIAnalysis('optimization')} disabled={physicsAIStatus === 'running'} icon={<ThunderboltOutlined />}>优化</Button>
                </Space>
                {physicsAIStatus === 'running' && (
                  <Card size="small" style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}>
                    <Text style={{ fontSize: 12, fontWeight: 600 }}>执行中...</Text>
                    <Progress percent={progress} size="small" showInfo={false} style={{ marginTop: 8 }} />
                  </Card>
                )}
              </Space>
            </TabPane>
          </Tabs>
        </Panel>
      </div>}
      right={<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Panel title="指标" dense>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 8 }}>
            {metrics.map(m => (
              <MetricCard 
                key={m.label}
                label={m.label} 
                value={m.value} 
                accent={m.accent}
                sparkline={m.label==='Loss' ? trainingStats.totalLoss.slice(-12) : undefined}
                tooltip={m.label==='Loss' && trainingStats.totalLoss.length ? '最近Loss趋势 (后12点)' : undefined}
              />
            ))}
          </div>
        </Panel>
        <Panel title={<span style={{ display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <span style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span>结果</span>
            {pendingRerunDeadline && remainingMs>0 && (
              <span style={{ fontSize:11, padding:'2px 6px', borderRadius:12, background:'rgba(250,173,20,0.15)', color:'#faad14' }}>
                配置已更新 {Math.ceil(remainingMs/100)/10}s 后重跑
              </span>
            )}
          </span>
          <span style={{display:'flex',gap:6}}>{physicsAIStatus!=='running' && <Button size="small" onClick={reset}>重置</Button>}{physicsAIStatus!=='running' && <Button size="small" type="primary" onClick={startOptimization}>再次运行</Button>}</span>
        </span>} dense>
          {optimizationResult ? (
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              <Alert message="优化收敛" type="success" showIcon style={{ padding: '4px 8px' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ fontSize: 11, opacity: .6 }}>目标函数</div>
                <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--accent-color)' }}>{optimizationResult.objectiveValue.toExponential(3)}</div>
                <div style={{ fontSize: 11, opacity: .6 }}>参数</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: 6 }}>
                  {Object.entries(optimizationResult.optimizedParameters).map(([k,v]) => (
                    <MetricCard key={k} label={k} value={v.toFixed(2)} accent="purple" />
                  ))}
                </div>
                <div style={{ fontSize: 11, opacity: .6 }}>耗时 {optimizationResult.computationTime.toFixed(1)}s</div>
              </div>
            </Space>
          ) : (
            <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
              <div style={{ fontSize: 12, opacity: .5 }}>尚无结果</div>
              <Card size="small" title="Loss 曲线" style={{ background:'var(--bg-tertiary)', border:'1px solid var(--border-color)' }}
                extra={<span style={{fontSize:10,opacity:.75, display:'flex', gap:8}}>
                  <span>阶段: 预热 / 主训 / 收敛</span>
                  {pendingRerunDeadline && remainingMs>0 && <span style={{ color:'#faad14' }}>即将重跑 {Math.ceil(remainingMs/100)/10}s</span>}
                </span>}>
                {trainingStats.epochs.length === 0 ? (
                  <div style={{ height:120, display:'flex',alignItems:'center',justifyContent:'center', fontSize:12, opacity:.6 }}>等待运行...</div>
                ) : (
                  <div style={{ height:160, position:'relative' }}>
                    {pendingRerunDeadline && remainingMs>0 && (
                      <div style={{ position:'absolute', top:4, left:8, zIndex:2, fontSize:11, background:'rgba(0,0,0,0.4)', padding:'2px 6px', borderRadius:8, color:'#faad14', backdropFilter:'blur(2px)' }}>
                        配置已更新，{Math.ceil(remainingMs/100)/10}s 后重跑...
                      </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={trainingStats.epochs.map((e,i)=>({
                        epoch:e,
                        total: trainingStats.totalLoss[i],
                        phys: trainingStats.physicsLoss[i],
                        data: trainingStats.dataLoss[i],
                        bnd: trainingStats.boundaryLoss[i]
                      }))} margin={{ top: 4, left: 0, right: 4, bottom: 0 }}>
                        <XAxis dataKey="epoch" hide />
                        <YAxis hide domain={['dataMin','dataMax']} />
                        <ReTooltip formatter={(v:any, n:any)=>[typeof v==='number'?v.toFixed(4):v, n]} />
                        <Line type="monotone" dataKey="total" stroke="#ff4d4f" strokeWidth={1.5} dot={false} name="total" />
                        <Line type="monotone" dataKey="phys" stroke="#722ed1" strokeWidth={1} dot={false} name="physics" />
                        <Line type="monotone" dataKey="data" stroke="#1890ff" strokeWidth={1} dot={false} name="data" />
                        <Line type="monotone" dataKey="bnd" stroke="#faad14" strokeWidth={1} dot={false} name="boundary" />
                        <ReferenceLine x={Math.floor(trainingStats.epochs.length/3)} stroke="#555" strokeDasharray="3 3" />
                        <ReferenceLine x={Math.floor(trainingStats.epochs.length*2/3)} stroke="#555" strokeDasharray="3 3" />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
              <Card size="small" title="模块权重" style={{ background:'var(--bg-tertiary)', border:'1px solid var(--border-color)' }} extra={<span style={{fontSize:10,opacity:.6}}>交互调权</span>}>
                <div style={{ height:140, position:'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={[
                        { key:'pinn', name:'PINN', value:config.fusionWeights.pinn, color:'#ff4d4f' },
                        { key:'deeponet', name:'DeepONet', value:config.fusionWeights.deeponet, color:'#1890ff' },
                        { key:'gnn', name:'GNN', value:config.fusionWeights.gnn, color:'#722ed1' },
                        { key:'terra', name:'TERRA', value:config.fusionWeights.terra, color:'#faad14' }
                      ]} dataKey="value" innerRadius={30} outerRadius={58} paddingAngle={1} stroke="none">
                        {[
                          config.fusionWeights.pinn?'#ff4d4f':'#444',
                          config.fusionWeights.deeponet?'#1890ff':'#444',
                          config.fusionWeights.gnn?'#722ed1':'#444',
                          config.fusionWeights.terra?'#faad14':'#444'
                        ].map((c,i)=>(<Cell key={i} fill={c} />))}
                      </Pie>
                      <ReTooltip formatter={(v:any, n:any)=>[v, n]} />
                    </PieChart>
                  </ResponsiveContainer>
                  {(() => { 
                    const sum = config.fusionWeights.pinn+config.fusionWeights.deeponet+config.fusionWeights.gnn+config.fusionWeights.terra; 
                    const dev = Math.abs(sum-1); 
                    const content = (
                      <div style={{ fontSize:11, lineHeight:1.4 }}>
                        <div>Σ = {sum.toFixed(4)} (Δ={(sum-1).toFixed(4)})</div>
                        <div style={{ marginTop:4, opacity:.7 }}>Raw Weights:</div>
                        <div>PINN: {config.fusionWeights.pinn}</div>
                        <div>DeepONet: {config.fusionWeights.deeponet}</div>
                        <div>GNN: {config.fusionWeights.gnn}</div>
                        <div>TERRA: {config.fusionWeights.terra}</div>
                        {dev>0.01 && <div style={{ marginTop:4, color:'#ff4d4f' }}>提示: 偏差超过 0.01 建议归一化</div>}
                      </div>
                    );
                    return (
                      <Popover content={content} placement="left">
                        <div style={{ position:'absolute', top:6, right:6, fontSize:10, fontWeight:500, cursor:'pointer', padding:'2px 4px', borderRadius:4, background: dev>0.01 ? 'rgba(255,77,79,0.15)' : 'rgba(255,255,255,0.05)', color: dev>0.01 ? '#ff4d4f':'#aaa' }}>Σ={sum.toFixed(2)}</div>
                      </Popover>
                    ); })()}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:6 }}>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                    <Space size={6} style={{ fontSize:11 }}>
                      <Switch size="small" checked={autoNormalize} onChange={v=>setAutoNormalize(v)} /> 动态归一化
                    </Space>
                    <Space size={6} style={{ fontSize:11 }}>
                      <Switch size="small" checked={autoRerun} onChange={v=>{ setAutoRerun(v); if(!v){ if(autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current); setPendingRerunDeadline(null);} }} /> 防抖自动重跑
                    </Space>
                    <Space size={4} style={{ fontSize:11 }}>
                      延迟
                      <InputNumber size="small" value={debounceMs} min={100} max={5000} step={100} style={{ width:80 }} onChange={(v)=> setDebounceMs(Number(v)||600)} />
                      ms
                    </Space>
                    <Button size="small" onClick={() => {
                      // 平均分配
                      const avg = +(1/4).toFixed(3);
                      const next = { pinn: avg, deeponet: avg, gnn: avg, terra: avg };
                      updateConfig('fusionWeights', next);
                      const json = JSON.stringify(next);
                      setWeightsDirty(json !== lastRunWeightsRef.current);
                      if (autoRerun && physicsAIStatus!=='running') {
                        if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current);
                        const deadline = Date.now()+debounceMs;
                        setPendingRerunDeadline(deadline);
                        autoRunTimerRef.current = setTimeout(() => {
                          lastRunWeightsRef.current = json;
                          reset();
                          controllerStart();
                          setPendingRerunDeadline(null);
                        }, debounceMs);
                      }
                    }}>平均</Button>
                    {weightsDirty && !autoRerun && physicsAIStatus!=='running' && (
                      <Button size="small" type="primary" onClick={()=>{ lastRunWeightsRef.current = JSON.stringify(config.fusionWeights); setWeightsDirty(false); reset(); controllerStart(); }}>
                        应用并重跑
                      </Button>
                    )}
                  </div>
                  {[{k:'pinn',label:'PINN',color:'#ff4d4f'},{k:'deeponet',label:'DeepONet',color:'#1890ff'},{k:'gnn',label:'GNN',color:'#722ed1'},{k:'terra',label:'TERRA',color:'#faad14'}].map(row => {
                    const val = (config.fusionWeights as any)[row.k] as number;
                    const sum = config.fusionWeights.pinn+config.fusionWeights.deeponet+config.fusionWeights.gnn+config.fusionWeights.terra;
                    const percent = sum>0 ? (val/sum)*100 : 0;
                    const handleValueChange = (raw: number | null) => {
                      let safe = (raw==null || isNaN(raw)) ? 0 : Math.max(0, raw);
                      let next = { ...config.fusionWeights, [row.k]: safe } as typeof config.fusionWeights;
                      if (autoNormalize) {
                        const s = next.pinn+next.deeponet+next.gnn+next.terra;
                        if (s>0) {
                          next = {
                            pinn: +(next.pinn/s).toFixed(3),
                            deeponet: +(next.deeponet/s).toFixed(3),
                            gnn: +(next.gnn/s).toFixed(3),
                            terra: +(next.terra/s).toFixed(3)
                          };
                        }
                      }
                      updateConfig('fusionWeights', next);
                      const json = JSON.stringify(next);
                      setWeightsDirty(json !== lastRunWeightsRef.current);
                      if (autoRerun && physicsAIStatus!=='running') {
                        if (autoRunTimerRef.current) clearTimeout(autoRunTimerRef.current);
                        const deadline = Date.now()+debounceMs;
                        setPendingRerunDeadline(deadline);
                        autoRunTimerRef.current = setTimeout(() => {
                          lastRunWeightsRef.current = json;
                          reset();
                          controllerStart();
                          setPendingRerunDeadline(null);
                        }, debounceMs);
                      }
                    };
                    return (
                      <div key={row.k} style={{ display:'flex', flexDirection:'column', gap:2, padding:'2px 0' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:10, height:10, background: val?row.color:'#444', borderRadius:2 }} />
                          <div style={{ flex:1, fontSize:11 }}>{row.label}</div>
                          <InputNumber 
                            size="small" 
                            value={val} 
                            min={0} 
                            step={autoNormalize?0.01:0.1} 
                            style={{ width:70 }}
                            onChange={(v)=> handleValueChange(typeof v==='number'? v: Number(v))}
                            onBlur={(e)=> {
                              const num = Number((e.target as HTMLInputElement).value);
                              if (isNaN(num)) handleValueChange(0); 
                            }}
                          />
                          <div style={{ fontSize:10, opacity:.6, width:42, textAlign:'right' }}>{sum>0?percent.toFixed(0)+'%':'-'}</div>
                        </div>
                        <div style={{ padding:'0 4px' }}>
                          <Slider 
                            min={0} 
                            max={autoNormalize?1: (autoNormalize?1:2)} 
                            step={autoNormalize?0.01:0.1} 
                            value={autoNormalize ? val : val} 
                            tooltip={{ open:false }}
                            onChange={(v)=> handleValueChange(Array.isArray(v)?v[0]:v)}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!autoNormalize && (
                    <div style={{ display:'flex', justifyContent:'flex-end', gap:8, marginTop:4 }}>
                      <Button size="small" onClick={() => {
                        const sum2 = config.fusionWeights.pinn+config.fusionWeights.deeponet+config.fusionWeights.gnn+config.fusionWeights.terra;
                        if (sum2 === 0) {
                          const next = { pinn:1, deeponet:0, gnn:0, terra:0 };
                          updateConfig('fusionWeights', next);
                          setWeightsDirty(JSON.stringify(next)!==lastRunWeightsRef.current);
                        } else {
                          const next = {
                            pinn: +(config.fusionWeights.pinn/sum2).toFixed(3),
                            deeponet: +(config.fusionWeights.deeponet/sum2).toFixed(3),
                            gnn: +(config.fusionWeights.gnn/sum2).toFixed(3),
                            terra: +(config.fusionWeights.terra/sum2).toFixed(3)
                          };
                          updateConfig('fusionWeights', next);
                          setWeightsDirty(JSON.stringify(next)!==lastRunWeightsRef.current);
                        }
                      }}>归一化</Button>
                      <Button size="small" onClick={() => {
                        const next = { pinn:1, deeponet:0, gnn:0, terra:0 };
                        updateConfig('fusionWeights', next);
                        setWeightsDirty(JSON.stringify(next)!==lastRunWeightsRef.current);
                      }}>重置</Button>
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </Panel>
      </div>}
      overlay={null}
    >
      {/* 3D 视口占位 */}
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(15,15,25,0.95), rgba(25,25,40,0.95))' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(circle at 30% 30%, rgba(235,47,150,0.15), transparent 60%), radial-gradient(circle at 70% 70%, rgba(0,217,255,0.15), transparent 60%)' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(235,47,150,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(235,47,150,0.05) 1px, transparent 1px)', backgroundSize: '32px 32px', opacity: .35 }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 54, opacity: .25, marginBottom: 16 }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, marginBottom: 8 }}>物理AI 3D 视口占位</div>
          <div style={{ fontSize: 13, opacity: .55, lineHeight: 1.5 }}>后续集成：预测场 / 残差热力 / 差异可视化</div>
        </div>
      </div>
    </UnifiedModuleLayout>
  );
};

export default PhysicsAIView;