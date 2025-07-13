import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Tabs, 
  Space, 
  Alert, 
  Steps, 
  Tag,
  Collapse,
  Form,
  Select,
  InputNumber,
  Switch,
  Divider,
  Progress,
  Badge
} from 'antd';
import { 
  RocketOutlined, 
  SettingOutlined, 
  BarChartOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  BulbOutlined as BrainOutlined,
  ExperimentOutlined,
  CalculatorOutlined,
  StopOutlined,
  HistoryOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import { useSceneStore } from '../stores/useSceneStore';
import { useUIStore } from '../stores/useUIStore';
import PostProcessingControls from '../components/PostProcessingControls';
import Viewport3D from '../components/Viewport3D';
import MovingMeshDemo from '../components/MovingMeshDemo';
import { useShallow } from 'zustand/react/shallow';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;
const { Panel } = Collapse;
const { Step } = Steps;
const { Option } = Select;

const AnalysisView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('fem-analysis');
    const [activeAnalysisTab, setActiveAnalysisTab] = useState('settings');
    
    // FEM 分析状态
    const [femAnalysisType, setFemAnalysisType] = useState('geomechanics');
    const [analysisSequence, setAnalysisSequence] = useState(['geostatic', 'construction', 'seepage']);
    const [currentPhase, setCurrentPhase] = useState(0);
    const [isRunningFEM, setIsRunningFEM] = useState(false);
    const [femProgress, setFemProgress] = useState(0);
    const [analysisResults, setAnalysisResults] = useState({});
    
    // 物理AI状态
    const [isRunningAI, setIsRunningAI] = useState(false);
    const [aiProgress, setAiProgress] = useState(0);
    const [optimizationTarget, setOptimizationTarget] = useState('displacement');
    
    const { startComputation, layers, scene } = useSceneStore(
        useShallow(state => ({
            startComputation: state.startComputation,
            layers: state.layers,
            scene: state.scene
        }))
    );

    const { taskProgress } = useUIStore(
        useShallow(state => ({
            taskProgress: state.taskProgress
        }))
    );
    
    const computationResultUrl = layers.result.url;
    const isComputing = layers.result.isLoading;
    const hasMesh = scene?.meshing?.global_size !== undefined;
    const hasComponents = scene?.components && scene.components.length > 0;

    // FEM 分析相关函数
    const startFEMAnalysis = async () => {
        setIsRunningFEM(true);
        setFemProgress(0);
        setCurrentPhase(0);
        
        if (femAnalysisType === 'sequence') {
            // 三步走序列分析
            for (let phase = 0; phase < 3; phase++) {
                setCurrentPhase(phase);
                await simulatePhaseAnalysis(phase);
            }
        } else {
            // 单阶段分析
            await simulateSingleAnalysis();
        }
        
        setIsRunningFEM(false);
    };
    
    const simulatePhaseAnalysis = (phase: number) => {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 15;
                if (progress >= 100) {
                    clearInterval(interval);
                    setAnalysisResults(prev => ({
                        ...prev,
                        [phase === 0 ? 'geostatic' : phase === 1 ? 'construction' : 'seepage']: {
                            completed: true,
                            maxDisplacement: Math.random() * 50 + 10,
                            maxStress: Math.random() * 1000 + 500,
                            convergence: true
                        }
                    }));
                    resolve(true);
                }
                setFemProgress(progress);
            }, 800);
        });
    };
    
    const simulateSingleAnalysis = () => {
        return new Promise((resolve) => {
            let progress = 0;
            const interval = setInterval(() => {
                progress += Math.random() * 10;
                if (progress >= 100) {
                    clearInterval(interval);
                    setAnalysisResults(prev => ({
                        ...prev,
                        [femAnalysisType]: {
                            completed: true,
                            maxDisplacement: Math.random() * 50 + 10,
                            maxStress: Math.random() * 1000 + 500,
                            convergence: true
                        }
                    }));
                    resolve(true);
                }
                setFemProgress(progress);
            }, 1000);
        });
    };

    // 物理AI优化相关函数
    const startAIOptimization = () => {
        setIsRunningAI(true);
        setAiProgress(0);
        
        // 模拟AI优化进度
        const interval = setInterval(() => {
            setAiProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsRunningAI(false);
                    return 100;
                }
                return prev + Math.random() * 8;
            });
        }, 1200);
    };

    const getCurrentStep = () => {
        if (computationResultUrl) return 3;
        if (isComputing || isRunningFEM || isRunningAI) return 2;
        if (hasMesh) return 1;
        return 0;
    };

    const getStatusTag = () => {
        if (isRunningFEM) return <Tag color="processing" icon={<LoadingOutlined />}>FEM计算中</Tag>;
        if (isRunningAI) return <Tag color="cyan" icon={<BrainOutlined />}>AI优化中</Tag>;
        if (computationResultUrl) return <Tag color="success" icon={<CheckCircleOutlined />}>计算完成</Tag>;
        return <Tag icon={<InfoCircleOutlined />}>未开始</Tag>;
    };

    const canStartAnalysis = hasMesh && hasComponents && !isComputing && !isRunningFEM && !isRunningAI;

    // FEM分析设置面板
    const renderFEMSettings = () => (
        <Card className="analysis-card" bordered={false}>
            <Form layout="vertical">
                <Form.Item label={<Text style={{ color: 'white' }}>分析类型</Text>}>
                    <Select 
                        value={femAnalysisType} 
                        onChange={setFemAnalysisType}
                        style={{ width: '100%' }}
                    >
                        <Option value="geostatic">
                            <Space>
                                <CalculatorOutlined />
                                地应力平衡分析 (A0)
                            </Space>
                        </Option>
                        <Option value="construction">
                            <Space>
                                <ExperimentOutlined />
                                分步施工分析 (A1)
                            </Space>
                        </Option>
                        <Option value="seepage">
                            <Space>
                                <ThunderboltOutlined />
                                稳态渗流分析 (A2)
                            </Space>
                        </Option>
                        <Option value="sequence">
                            <Space>
                                <RocketOutlined />
                                三步走完整序列
                            </Space>
                        </Option>
                    </Select>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'white' }}>Kratos求解器设置</Text>}>
                    <Collapse ghost>
                        <Panel header="高级参数" key="1">
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="最大迭代次数">
                                        <InputNumber min={100} max={5000} defaultValue={1000} style={{width: '100%'}} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="收敛容差">
                                        <InputNumber min={1e-8} max={1e-3} step={1e-6} defaultValue={1e-6} style={{width: '100%'}} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="启用非线性">
                                        <Switch defaultChecked />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="本构模型">
                                        <Select defaultValue="mohr_coulomb" style={{width: '100%'}}>
                                            <Option value="linear_elastic">线弹性</Option>
                                            <Option value="mohr_coulomb">Mohr-Coulomb</Option>
                                            <Option value="drucker_prager">Drucker-Prager</Option>
                                            <Option value="cam_clay">修正Cam-Clay</Option>
                                            <Option value="hardening_soil">硬化土</Option>
                                            <Option value="hypoplastic">亚塑性</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Divider style={{ borderColor: 'rgba(255,255,255,0.3)' }} />
                            
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label={
                                        <Space>
                                            <Text style={{ color: 'white' }}>动网格技术</Text>
                                            <Tag color="processing">Moving-Mesh</Tag>
                                        </Space>
                                    }>
                                        <Switch 
                                            defaultChecked={false}
                                            checkedChildren="启用"
                                            unCheckedChildren="关闭"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="网格移动策略">
                                        <Select defaultValue="laplacian" style={{width: '100%'}}>
                                            <Option value="laplacian">拉普拉斯平滑</Option>
                                            <Option value="ale_formulation">ALE公式</Option>
                                            <Option value="remesh_adaptive">自适应重网格</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="变形驱动源">
                                        <Select defaultValue="excavation" style={{width: '100%'}}>
                                            <Option value="excavation">开挖边界</Option>
                                            <Option value="support_displacement">支护位移</Option>
                                            <Option value="soil_settlement">土体沉降</Option>
                                            <Option value="combined">组合驱动</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="网格质量阈值">
                                        <InputNumber 
                                            min={0.1} 
                                            max={1.0} 
                                            step={0.1} 
                                            defaultValue={0.3} 
                                            style={{width: '100%'}}
                                            formatter={value => `${value}`}
                                            parser={value => value!.replace('%', '')}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item label="实时渲染">
                                        <Switch 
                                            defaultChecked={true}
                                            checkedChildren="开启"
                                            unCheckedChildren="关闭"
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item label="更新频率">
                                        <Select defaultValue="every_step" style={{width: '100%'}}>
                                            <Option value="every_step">每时间步</Option>
                                            <Option value="every_5_steps">每5步</Option>
                                            <Option value="every_10_steps">每10步</Option>
                                            <Option value="on_demand">按需更新</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            
                            <Alert 
                                message="动网格技术说明" 
                                description={
                                    <div style={{ fontSize: 12 }}>
                                        • <strong>Moving-Mesh</strong>: 网格随变形动态更新，保持计算精度<br/>
                                        • <strong>ALE公式</strong>: 适用于大变形分析，避免网格扭曲<br/>
                                        • <strong>实时渲染</strong>: WebSocket推送网格更新，Three.js动态显示
                                    </div>
                                }
                                type="info" 
                                showIcon
                                style={{ marginBottom: 16 }}
                            />

                            <Form.Item label="单元类型配置">
                                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                                    <Badge status="success" text="土体: Hex8-SRI" /><br/>
                                    <Badge status="processing" text="围护结构: Shell" /><br/>
                                    <Badge status="warning" text="支撑/桩: Beam" /><br/>
                                    <Badge status="default" text="锚杆: Truss" /><br/>
                                    <Badge status="error" text="接触: Interface" />
                                </div>
                            </Form.Item>
                        </Panel>
                    </Collapse>
                </Form.Item>

                <Button 
                    type="primary" 
                    block
                    icon={<RocketOutlined />}
                    loading={isRunningFEM}
                    disabled={!canStartAnalysis}
                    onClick={startFEMAnalysis}
                >
                    {isRunningFEM ? '计算中...' : '开始FEM分析'}
                </Button>

                {isRunningFEM && (
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ color: 'white' }}>计算进度 - {femAnalysisType === 'sequence' ? `第${currentPhase + 1}阶段` : '单阶段分析'}</Text>
                        <Progress percent={Math.round(femProgress)} status="active" strokeColor={{
                            '0%': '#1890ff',
                            '50%': '#52c41a',
                            '100%': '#722ed1',
                        }} />
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                            {femAnalysisType === 'sequence' ? 
                                (currentPhase === 0 ? '地应力平衡计算中...' :
                                 currentPhase === 1 ? '分步施工模拟中...' :
                                 currentPhase === 2 ? '渗流分析中...' : '序列分析完成') :
                                (femProgress < 30 ? '正在组装刚度矩阵...' : 
                                 femProgress < 60 ? '正在求解线性方程组...' : 
                                 femProgress < 90 ? '正在计算应力应变...' : 
                                 '正在后处理结果...')
                            }
                        </Text>
                        {femAnalysisType === 'sequence' && (
                            <div style={{ marginTop: 8 }}>
                                <Steps size="small" current={currentPhase}>
                                    <Step title="A0" description="地应力" />
                                    <Step title="A1" description="施工" />
                                    <Step title="A2" description="渗流" />
                                </Steps>
                            </div>
                        )}
                    </div>
                )}
            </Form>
        </Card>
    );

    // 物理AI优化设置面板
    const renderAISettings = () => (
        <Card className="analysis-card" bordered={false}>
            <Form layout="vertical">
                <Form.Item label={<Text style={{ color: 'white' }}>优化目标</Text>}>
                    <Select 
                        value={optimizationTarget} 
                        onChange={setOptimizationTarget}
                        style={{ width: '100%' }}
                    >
                        <Option value="displacement">
                            <Space>
                                <BrainOutlined />
                                最小化位移
                            </Space>
                        </Option>
                        <Option value="stress">
                            <Space>
                                <ExperimentOutlined />
                                应力优化
                            </Space>
                        </Option>
                        <Option value="stability">
                            <Space>
                                <ThunderboltOutlined />
                                稳定性优化
                            </Space>
                        </Option>
                        <Option value="cost">
                            <Space>
                                <CalculatorOutlined />
                                成本优化
                            </Space>
                        </Option>
                    </Select>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'white' }}>IoT数据源</Text>}>
                    <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                        <Badge status="success" text="位移传感器: 12个" />
                        <br />
                        <Badge status="processing" text="应变计: 8个" />
                        <br />
                        <Badge status="warning" text="孔隙水压力: 6个" />
                    </div>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'white' }}>优化算法</Text>}>
                    <Collapse ghost>
                        <Panel header="Kratos优化设置" key="1">
                            <Form.Item label="最大优化迭代">
                                <InputNumber min={10} max={500} defaultValue={100} />
                            </Form.Item>
                            <Form.Item label="PDE约束权重">
                                <InputNumber min={0.1} max={10} step={0.1} defaultValue={1.0} />
                            </Form.Item>
                            <Form.Item label="数据拟合权重">
                                <InputNumber min={0.1} max={10} step={0.1} defaultValue={2.0} />
                            </Form.Item>
                        </Panel>
                    </Collapse>
                </Form.Item>

                <Button 
                    type="primary" 
                    block
                    icon={<BrainOutlined />}
                    loading={isRunningAI}
                    disabled={!canStartAnalysis}
                    onClick={startAIOptimization}
                    style={{ 
                        background: 'linear-gradient(45deg, #722ed1, #1890ff)',
                        borderColor: '#722ed1'
                    }}
                >
                    {isRunningAI ? 'AI优化中...' : '开始物理AI优化'}
                </Button>

                {isRunningAI && (
                    <div style={{ marginTop: 16 }}>
                        <Text style={{ color: 'white' }}>AI优化进度</Text>
                        <Progress 
                            percent={Math.round(aiProgress)} 
                            status="active"
                            strokeColor={{
                                '0%': '#722ed1',
                                '100%': '#1890ff',
                            }}
                        />
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                            {aiProgress < 25 ? '正在加载IoT数据...' : 
                             aiProgress < 50 ? '正在训练物理约束模型...' : 
                             aiProgress < 75 ? '正在执行反演优化...' : 
                             '正在收敛到最优解...'}
                        </Text>
                    </div>
                )}
            </Form>
        </Card>
    );

    return (
        <div className="analysis-view">
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <div className="analysis-header">
                        <Title level={2} style={{ color: 'white', margin: 0 }}>
                            智能计算分析
                        </Title>
                        <Space>
                            {getStatusTag()}
                            {(isRunningFEM || isRunningAI) && (
                                <Button 
                                    danger 
                                    icon={<StopOutlined />}
                                    onClick={() => {
                                        setIsRunningFEM(false);
                                        setIsRunningAI(false);
                                    }}
                                >
                                    终止计算
                                </Button>
                            )}
                        </Space>
                    </div>

                    {!hasMesh && (
                        <Alert
                            message="需要先生成网格"
                            description="在开始计算之前，请先在网格生成页面创建计算网格。"
                            type="warning"
                            showIcon
                            action={
                                <Button size="small" type="primary" href="/meshing">
                                    前往网格生成
                                </Button>
                            }
                            style={{ marginBottom: 16 }}
                        />
                    )}
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={24} lg={8}>
                    <Card className="analysis-card" style={{ marginBottom: 16 }}>
                        <Steps 
                            direction="vertical" 
                            current={getCurrentStep()}
                            status={taskProgress.status === 'error' ? 'error' : 'process'}
                        >
                            <Step 
                                title="准备模型" 
                                description="创建几何模型和生成网格" 
                                icon={hasComponents && hasMesh ? <CheckCircleOutlined /> : <LoadingOutlined />}
                            />
                            <Step 
                                title="智能计算" 
                                description={
                                    isRunningFEM ? `FEM分析: ${Math.round(femProgress)}%` :
                                    isRunningAI ? `AI优化: ${Math.round(aiProgress)}%` :
                                    "选择FEM分析或物理AI优化"
                                } 
                                icon={isRunningFEM || isRunningAI ? <LoadingOutlined /> : 
                                      computationResultUrl ? <CheckCircleOutlined /> : <BarChartOutlined />}
                            />
                            <Step 
                                title="结果可视化" 
                                description="查看和分析计算结果" 
                                icon={computationResultUrl ? <CheckCircleOutlined /> : <BarChartOutlined />}
                            />
                        </Steps>
                    </Card>

                    <Tabs 
                        activeKey={activeTab} 
                        onChange={setActiveTab}
                        type="card"
                        className="analysis-tabs"
                    >
                        <TabPane 
                            tab={
                                <span>
                                    <CalculatorOutlined /> 
                                    FEM分析
                                </span>
                            } 
                            key="fem-analysis"
                        >
                            <Tabs
                                activeKey={activeAnalysisTab}
                                onChange={setActiveAnalysisTab}
                                size="small"
                            >
                                <TabPane tab="设置" key="settings">
                                    {renderFEMSettings()}
                                </TabPane>
                                <TabPane tab="监控" key="monitor">
                                    <Card className="analysis-card" bordered={false}>
                                        <Text style={{ color: 'white' }}>Kratos计算监控</Text>
                                        <Divider />
                                        <Row gutter={16}>
                                            <Col span={12}>
                                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                    <div>CPU使用率: 45%</div>
                                                    <div>内存使用: 2.3 GB</div>
                                                    <div>已用时间: 00:05:23</div>
                                                </div>
                                            </Col>
                                            <Col span={12}>
                                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                                    <div>节点数: {hasMesh ? '23,456' : 'N/A'}</div>
                                                    <div>单元数: {hasMesh ? '45,123' : 'N/A'}</div>
                                                    <div>自由度: {hasMesh ? '70,368' : 'N/A'}</div>
                                                </div>
                                            </Col>
                                        </Row>
                                        {Object.keys(analysisResults).length > 0 && (
                                            <>
                                                <Divider />
                                                <Text style={{ color: 'white', fontSize: 12 }}>分析结果摘要</Text>
                                                {Object.entries(analysisResults).map(([key, result]: [string, any]) => (
                                                    <div key={key} style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 4 }}>
                                                        {key}: 最大位移 {result.maxDisplacement?.toFixed(2)}mm, 最大应力 {result.maxStress?.toFixed(0)}kPa
                                                    </div>
                                                ))}
                                            </>
                                        )}
                                    </Card>
                                </TabPane>
                            </Tabs>
                        </TabPane>
                        
                        <TabPane 
                            tab={
                                <span>
                                    <BrainOutlined /> 
                                    物理AI
                                </span>
                            } 
                            key="physics-ai"
                        >
                            <Tabs
                                activeKey={activeAnalysisTab}
                                onChange={setActiveAnalysisTab}
                                size="small"
                            >
                                <TabPane tab="设置" key="settings">
                                    {renderAISettings()}
                                </TabPane>
                                <TabPane tab="训练" key="training">
                                    <Card className="analysis-card" bordered={false}>
                                        <Text style={{ color: 'white' }}>AI模型训练状态</Text>
                                        <Divider />
                                        <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                            <div>训练轮次: 150/200</div>
                                            <div>损失函数: 0.0023</div>
                                            <div>收敛状态: 良好</div>
                                        </div>
                                    </Card>
                                </TabPane>
                            </Tabs>
                        </TabPane>
                        
                        <TabPane 
                            tab={
                                <span>
                                    <ThunderboltOutlined /> 
                                    动网格
                                </span>
                            } 
                            key="moving-mesh"
                        >
                            <div className="analysis-tab-content">
                                <MovingMeshDemo 
                                    meshId="demo_mesh_001"
                                    visible={true}
                                />
                            </div>
                        </TabPane>
                        
                        <TabPane 
                            tab={<span><HistoryOutlined /> 历史</span>} 
                            key="history"
                        >
                            <Card className="analysis-card" bordered={false}>
                                <Text style={{ color: 'white' }}>计算历史</Text>
                                <Divider />
                                <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                    <div>最近计算: 2024-01-15 14:30</div>
                                    <div>成功率: 95%</div>
                                    <div>平均计算时间: 8.5 分钟</div>
                                </div>
                            </Card>
                        </TabPane>
                    </Tabs>
                </Col>
                
                <Col span={24} lg={16}>
                    <div className="viewport-container" style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
                        <Viewport3D className="analysis-viewport" />
                        
                        {(isRunningFEM || isRunningAI) && (
                            <div className="computation-overlay" style={{
                                position: 'absolute',
                                bottom: 16,
                                left: 16,
                                right: 16,
                                background: 'rgba(0,0,0,0.8)',
                                padding: 16,
                                borderRadius: 8,
                                border: '1px solid rgba(59, 130, 246, 0.3)',
                                backdropFilter: 'blur(10px)',
                                zIndex: 10
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: 'white' }}>
                                        {isRunningFEM ? 'FEM计算进度' : 'AI优化进度'}
                                    </Text>
                                    <Text style={{ color: 'white' }}>
                                        {Math.round(isRunningFEM ? femProgress : aiProgress)}%
                                    </Text>
                                </div>
                                <Progress 
                                    percent={Math.round(isRunningFEM ? femProgress : aiProgress)}
                                    status="active"
                                    strokeColor={isRunningFEM ? '#1890ff' : {
                                        '0%': '#722ed1',
                                        '100%': '#1890ff',
                                    }}
                                    showInfo={false}
                                />
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                                    {isRunningFEM ? 
                                        (femProgress < 30 ? '正在组装刚度矩阵...' : 
                                         femProgress < 60 ? '正在求解线性方程组...' : 
                                         femProgress < 90 ? '正在计算应力应变...' : 
                                         '正在后处理结果...') :
                                        (aiProgress < 25 ? '正在加载IoT数据...' : 
                                         aiProgress < 50 ? '正在训练物理约束模型...' : 
                                         aiProgress < 75 ? '正在执行反演优化...' : 
                                         '正在收敛到最优解...')
                                    }
                                </Text>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

export default AnalysisView;