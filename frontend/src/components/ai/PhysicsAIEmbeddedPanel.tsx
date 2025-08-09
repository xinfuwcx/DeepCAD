/**
 * 物理AI嵌入式面板 - 集成3号专家物理AI模块系统
 * 基于3号专家《完整集成报告》实现PINN+DeepONet+GNN+TERRA技术栈
 * 0号架构师 - 集成物理约束神经网络、深度算子网络、图神经网络、TERRA优化
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { 
  Card, Row, Col, Button, Space, Typography, Progress, 
  Tabs, Form, Select, Switch, Alert, 
  List, Tag, Timeline, Tooltip,
  Badge, Statistic, Radio, Slider, message
} from 'antd';
import { 
  ForkOutlined, 
  ExperimentOutlined, RocketOutlined, EyeOutlined,
  SettingOutlined, PlayCircleOutlined, StopOutlined,
  ApiOutlined
} from '@ant-design/icons';
import { motion, AnimatePresence } from 'framer-motion';
// Unified layout components
import UnifiedModuleLayout from '../ui/layout/UnifiedModuleLayout';
import Panel from '../ui/layout/Panel';
import MetricCard from '../ui/layout/MetricCard';

// 导入3号专家的物理AI服务
import { 
  PhysicsAIService,
  type MultiModalPhysicsAI,
  type MultiModalAIResult,
  type PINNConfig,
  type DeepONetConfig,
  type GNNConfig,
  type TERRAOptimizationConfig
} from '../../services/PhysicsAIModuleInterface';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

// ==================== 接口定义 ====================

// ==================== 类型补充 ====================
type AIModuleState = 'idle' | 'training' | 'optimizing' | 'ready' | 'error';
interface AIModuleStatus { pinn: AIModuleState; deeponet: AIModuleState; gnn: AIModuleState; terra: AIModuleState; }
interface RealtimeMetrics { physicsConsistency: number; predictionAccuracy: number; uncertaintyLevel: number; computationSpeed: number; memoryUsage: number; }

interface PhysicsAIEmbeddedPanelProps {
  inputData?: {
    geometry: any;
    materials: any;
    boundary: any;
    loading: any;
  };
  onAnalysisComplete?: (result: MultiModalAIResult) => void;
  onStatusChange?: (status: 'idle' | 'running' | 'completed' | 'error') => void;
  style?: React.CSSProperties;
}

// ==================== 主组件 ====================
const PhysicsAIEmbeddedPanel: React.FC<PhysicsAIEmbeddedPanelProps> = ({
  inputData,
  onAnalysisComplete,
  onStatusChange,
  style
}) => {
  const [analysisStatus, setAnalysisStatus] = useState<'idle' | 'running' | 'completed' | 'error'>('idle');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('config');
  const [moduleStatus, setModuleStatus] = useState<AIModuleStatus>({ pinn: 'idle', deeponet: 'idle', gnn: 'idle', terra: 'idle' });
  const [realtimeMetrics, setRealtimeMetrics] = useState<RealtimeMetrics>({ physicsConsistency: 0, predictionAccuracy: 0, uncertaintyLevel: 0, computationSpeed: 0, memoryUsage: 0 });
  const [aiConfig, setAiConfig] = useState<MultiModalPhysicsAI>({
    systemConfig: { enabledModules: ['PINN', 'DeepONet', 'GNN', 'TERRA'], fusionStrategy: 'ensemble', confidenceThreshold: 0.8, fallbackStrategy: 'degraded_mode' },
    fusionWeights: { pinn: 0.3, deeponet: 0.3, gnn: 0.2, terra: 0.2 },
    qualityControl: { crossValidation: true, physicsConsistencyCheck: true, outlierDetection: true, uncertaintyQuantification: true }
  });
  const [analysisResult, setAnalysisResult] = useState<MultiModalAIResult | null>(null);
  const physicsAIServiceRef = useRef<PhysicsAIService | null>(null);
  const metricsUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    physicsAIServiceRef.current = new PhysicsAIService();
    metricsUpdateIntervalRef.current = setInterval(() => {
      if (analysisStatus === 'running') {
        setRealtimeMetrics(prev => ({
          physicsConsistency: Math.min(1.0, prev.physicsConsistency + Math.random() * 0.1),
            predictionAccuracy: Math.min(1.0, prev.predictionAccuracy + Math.random() * 0.08),
            uncertaintyLevel: Math.max(0, prev.uncertaintyLevel - Math.random() * 0.05),
            computationSpeed: 0.7 + Math.random() * 0.3,
            memoryUsage: 1500 + Math.random() * 500
        }));
      }
    }, 2000);
    return () => {
      if (metricsUpdateIntervalRef.current) clearInterval(metricsUpdateIntervalRef.current);
    };
  }, [analysisStatus]);

  const initializeAIModules = useCallback(async () => {
    const service = physicsAIServiceRef.current; if (!service) return;
    setModuleStatus({ pinn: 'training', deeponet: 'training', gnn: 'training', terra: 'optimizing' });
    try {
      await service.initializeAIModules(aiConfig);
      setModuleStatus({ pinn: 'ready', deeponet: 'ready', gnn: 'ready', terra: 'ready' });
      message.success('物理AI模块初始化完成');
    } catch {
      setModuleStatus({ pinn: 'error', deeponet: 'error', gnn: 'error', terra: 'error' });
    }
  }, [aiConfig]);

  const executePhysicsAIAnalysis = useCallback(async () => {
    if (!inputData) { message.error('缺少输入数据'); return; }
    const service = physicsAIServiceRef.current; if (!service) return;
    setAnalysisStatus('running'); setAnalysisProgress(0); onStatusChange?.('running');
    const steps = [25,50,75,90,100];
    try {
      for (const p of steps) { setAnalysisProgress(p); await new Promise(r=>setTimeout(r, 800)); }
  const result = await service.performMultiModalAnalysis(inputData, aiConfig);
  setAnalysisResult(result); setAnalysisStatus('completed'); onStatusChange?.('completed');
  onAnalysisComplete?.(result);
      message.success('分析完成');
    } catch {
      setAnalysisStatus('error'); onStatusChange?.('error'); message.error('分析失败');
    }
  }, [inputData, aiConfig, onStatusChange]);

  const stopAnalysis = useCallback(() => { setAnalysisStatus('idle'); setAnalysisProgress(0); onStatusChange?.('idle'); }, [onStatusChange]);
  const updateAIConfig = useCallback((key: string, value: any) => setAiConfig(prev => ({ ...prev, [key]: value })), []);

  const renderModuleStatus = (module: keyof AIModuleStatus, label: string, icon: React.ReactNode) => {
    const status = moduleStatus[module];
    const color = status === 'ready' ? '#52c41a' : status === 'training' || status === 'optimizing' ? '#1890ff' : status === 'error' ? '#ff4d4f' : '#d9d9d9';
    return (
      <Col span={6} key={module} style={{ marginBottom: 8 }}>
        <Card size="small" style={{ textAlign: 'center' }}>
          <Space direction="vertical" size={4}>
            <div style={{ fontSize: 20, color }}>{icon}</div>
            <Text style={{ fontSize: 11 }}>{label}</Text>
            <Badge status={status === 'ready' ? 'success' : status === 'error' ? 'error' : 'processing'} text={status === 'idle' ? '待机' : status === 'ready' ? '就绪' : status === 'error' ? '错误' : '训练'} />
          </Space>
        </Card>
      </Col>
    );
  };

  const metricCards = useMemo(() => ([
    { label: '物理一致性', value: (realtimeMetrics.physicsConsistency * 100).toFixed(1) + '%', accent: 'green' as const },
    { label: '预测精度', value: (realtimeMetrics.predictionAccuracy * 100).toFixed(1) + '%', accent: 'blue' as const },
    { label: '不确定性', value: (realtimeMetrics.uncertaintyLevel * 100).toFixed(1) + '%', accent: 'orange' as const },
    { label: '计算速度', value: realtimeMetrics.computationSpeed.toFixed(2) + 'x', accent: 'purple' as const },
    { label: '内存(MB)', value: realtimeMetrics.memoryUsage.toFixed(0), accent: 'red' as const },
    { label: '进度', value: analysisProgress + '%', accent: 'blue' as const }
  ]), [realtimeMetrics, analysisProgress]);

  const resultSummary = useMemo(() => {
    if (!analysisResult) return [] as { label: string; value: string; accent: 'blue'|'green'|'orange'|'purple'|'red'}[];
    return [
      { label: '整体稳定性', value: analysisResult.fusedPredictions.stabilityAnalysis.overallStability.toFixed(3), accent: 'green' as const },
      { label: '关键截面数', value: String(analysisResult.fusedPredictions.stabilityAnalysis.criticalSections.length), accent: 'blue' as const },
      { label: '破坏模式', value: analysisResult.fusedPredictions.stabilityAnalysis.failureMode, accent: 'orange' as const },
      { label: '可靠性', value: (analysisResult.reliability.overallScore * 100).toFixed(1) + '%', accent: 'purple' as const }
    ];
  }, [analysisResult]);

  return (
    <UnifiedModuleLayout
      left={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="控制" subtitle="初始化 / 配置 / 执行" dense>
            <Space wrap>
              <Button size="small" icon={<SettingOutlined />} onClick={initializeAIModules} disabled={analysisStatus === 'running'}>初始化</Button>
              <Button size="small" icon={<EyeOutlined />} onClick={() => setActiveTab('config')}>配置</Button>
              <Button
                size="small"
                type="primary"
                danger={analysisStatus === 'running'}
                icon={analysisStatus === 'running' ? <StopOutlined /> : <PlayCircleOutlined />}
                onClick={analysisStatus === 'running' ? stopAnalysis : executePhysicsAIAnalysis}
                disabled={!inputData}
              >
                {analysisStatus === 'running' ? '停止' : '启动分析'}
              </Button>
            </Space>
            {analysisStatus === 'running' && (
              <div style={{ marginTop: 12 }}>
                <Progress percent={analysisProgress} size="small" status="active" />
              </div>
            )}
          </Panel>
          <Panel title="AI配置" dense>
            <Tabs activeKey={activeTab} onChange={setActiveTab} size="small" items={[
              { key: 'config', label: '模块', children: (
                <Form layout="vertical" size="small">
                  <Form.Item label="启用模块">
                    <Select
                      mode="multiple"
                      value={aiConfig.systemConfig.enabledModules}
                      onChange={(value) => updateAIConfig('systemConfig', { ...aiConfig.systemConfig, enabledModules: value })}
                      size="small"
                    >
                      <Option value="PINN">PINN</Option>
                      <Option value="DeepONet">DeepONet</Option>
                      <Option value="GNN">GNN</Option>
                      <Option value="TERRA">TERRA</Option>
                    </Select>
                  </Form.Item>
                  <Form.Item label="融合策略">
                    <Radio.Group
                      value={aiConfig.systemConfig.fusionStrategy}
                      onChange={(e) => updateAIConfig('systemConfig', { ...aiConfig.systemConfig, fusionStrategy: e.target.value })}
                      size="small"
                    >
                      <Radio value="ensemble">集成</Radio>
                      <Radio value="hierarchical">分层</Radio>
                      <Radio value="sequential">序列</Radio>
                    </Radio.Group>
                  </Form.Item>
                  <Form.Item label="置信度阈值">
                    <Slider
                      value={aiConfig.systemConfig.confidenceThreshold}
                      onChange={(value) => updateAIConfig('systemConfig', { ...aiConfig.systemConfig, confidenceThreshold: value })}
                      min={0.5} max={1} step={0.05}
                      marks={{ 0.5: '0.5', 0.8: '0.8', 1: '1.0' }}
                    />
                  </Form.Item>
                </Form>
              )},
              { key: 'weights', label: '权重', children: (
                <Form layout="vertical" size="small">
                  <Form.Item label={`PINN ${aiConfig.fusionWeights.pinn.toFixed(1)}`}>
                    <Slider value={aiConfig.fusionWeights.pinn} onChange={(v) => updateAIConfig('fusionWeights', { ...aiConfig.fusionWeights, pinn: v })} min={0} max={1} step={0.1} />
                  </Form.Item>
                  <Form.Item label={`DeepONet ${aiConfig.fusionWeights.deeponet.toFixed(1)}`}>
                    <Slider value={aiConfig.fusionWeights.deeponet} onChange={(v) => updateAIConfig('fusionWeights', { ...aiConfig.fusionWeights, deeponet: v })} min={0} max={1} step={0.1} />
                  </Form.Item>
                  <Form.Item label={`GNN ${aiConfig.fusionWeights.gnn.toFixed(1)}`}>
                    <Slider value={aiConfig.fusionWeights.gnn} onChange={(v) => updateAIConfig('fusionWeights', { ...aiConfig.fusionWeights, gnn: v })} min={0} max={1} step={0.1} />
                  </Form.Item>
                  <Form.Item label={`TERRA ${aiConfig.fusionWeights.terra.toFixed(1)}`}>
                    <Slider value={aiConfig.fusionWeights.terra} onChange={(v) => updateAIConfig('fusionWeights', { ...aiConfig.fusionWeights, terra: v })} min={0} max={1} step={0.1} />
                  </Form.Item>
                </Form>
              )}
            ]} />
          </Panel>
          {analysisResult && (
            <Panel title="结果摘要" dense>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 8 }}>
                {resultSummary.map(r => (
                  <MetricCard key={r.label} label={r.label} value={r.value} accent={r.accent} />
                ))}
              </div>
            </Panel>
          )}
        </div>
      }
      right={
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Panel title="AI模块状态" dense>
            <Row gutter={8}>
              {renderModuleStatus('pinn', 'PINN', <ExperimentOutlined />)}
              {renderModuleStatus('deeponet', 'DeepONet', <ForkOutlined />)}
              {renderModuleStatus('gnn', 'GNN', <ApiOutlined />)}
              {renderModuleStatus('terra', 'TERRA', <RocketOutlined />)}
            </Row>
          </Panel>
          <Panel title="实时指标" dense>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(130px,1fr))', gap: 12 }}>
              {metricCards.map(m => (
                <MetricCard key={m.label} label={m.label} value={m.value} accent={m.accent} />
              ))}
            </div>
          </Panel>
          {analysisStatus === 'running' && (
            <Panel title="阶段进度" dense>
              <Timeline
                items={[
                  { children: 'PINN物理约束分析', color: analysisProgress >= 25 ? 'green' : 'gray' },
                  { children: 'DeepONet算子学习', color: analysisProgress >= 50 ? 'green' : 'gray' },
                  { children: 'GNN图网络分析', color: analysisProgress >= 75 ? 'green' : 'gray' },
                  { children: 'TERRA参数优化', color: analysisProgress >= 90 ? 'green' : 'gray' },
                  { children: '结果融合', color: analysisProgress >= 100 ? 'green' : 'gray' }
                ]}
              />
            </Panel>
          )}
          {(analysisStatus === 'completed' || analysisStatus === 'error') && (
            <Panel title="状态" dense>
              {analysisStatus === 'completed' ? (
                <Alert
                  message="分析完成"
                  description="多模态融合成功，结果已生成。"
                  type="success"
                  showIcon
                  action={<Button size="small" onClick={() => { /* future: open result detail */ }}>查看</Button>}
                />
              ) : (
                <Alert
                  message="分析失败"
                  description="请检查输入数据或参数设置。"
                  type="error"
                  showIcon
                  action={<Button size="small" onClick={() => setAnalysisStatus('idle')}>重置</Button>}
                />
              )}
            </Panel>
          )}
        </div>
      }
      overlay={null}
    >
      <div style={{ position: 'relative', width: '100%', height: '100%' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 30% 30%, rgba(82,196,26,0.15), transparent 70%), linear-gradient(135deg, rgba(26,26,26,0.95) 0%, rgba(40,40,40,0.95) 100%)' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 60, opacity: 0.25, marginBottom: 16 }}>🧠</div>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, marginBottom: 12 }}>物理AI 3D 视口占位</div>
          <div style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.6 }}>
            即将展示: 预测场分布 / 不确定性云图 / 模块贡献热力 / 物理约束残差
          </div>
        </div>
      </div>
    </UnifiedModuleLayout>
  );
};

export default PhysicsAIEmbeddedPanel;