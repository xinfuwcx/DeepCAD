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
  BrainOutlined,
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
    const [isRunningFEM, setIsRunningFEM] = useState(false);
    const [femProgress, setFemProgress] = useState(0);
    
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
    const startFEMAnalysis = () => {
        setIsRunningFEM(true);
        setFemProgress(0);
        
        // 模拟计算进度
        const interval = setInterval(() => {
            setFemProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setIsRunningFEM(false);
                    return 100;
                }
                return prev + Math.random() * 10;
            });
        }, 1000);
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
                        <Option value="geomechanics">
                            <Space>
                                <CalculatorOutlined />
                                地质力学分析
                            </Space>
                        </Option>
                        <Option value="structural">
                            <Space>
                                <ExperimentOutlined />
                                固体力学分析
                            </Space>
                        </Option>
                        <Option value="seepage">
                            <Space>
                                <ThunderboltOutlined />
                                渗流分析
                            </Space>
                        </Option>
                    </Select>
                </Form.Item>

                <Form.Item label={<Text style={{ color: 'white' }}>求解器设置</Text>}>
                    <Collapse ghost>
                        <Panel header="高级参数" key="1">
                            <Form.Item label="最大迭代次数">
                                <InputNumber min={100} max={5000} defaultValue={1000} />
                            </Form.Item>
                            <Form.Item label="收敛容差">
                                <InputNumber min={1e-8} max={1e-3} step={1e-6} defaultValue={1e-6} />
                            </Form.Item>
                            <Form.Item label="启用非线性">
                                <Switch defaultChecked />
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
                        <Text style={{ color: 'white' }}>计算进度</Text>
                        <Progress percent={Math.round(femProgress)} status="active" />
                        <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                            {femProgress < 30 ? '正在组装刚度矩阵...' : 
                             femProgress < 60 ? '正在求解线性方程组...' : 
                             femProgress < 90 ? '正在计算应力应变...' : 
                             '正在后处理结果...'}
                        </Text>
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
                                        <Text style={{ color: 'white' }}>计算监控</Text>
                                        <Divider />
                                        <div style={{ color: 'rgba(255,255,255,0.7)' }}>
                                            <div>CPU使用率: 45%</div>
                                            <div>内存使用: 2.3 GB</div>
                                            <div>已用时间: 00:05:23</div>
                                        </div>
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