import React, { useState } from 'react';
import { 
  Button, 
  Card, 
  Typography, 
  Row, 
  Col, 
  Tabs, 
  Collapse, 
  Space, 
  Divider, 
  Alert, 
  Tooltip, 
  Badge, 
  Steps, 
  Tag
} from 'antd';
import { 
  RocketOutlined, 
  SettingOutlined, 
  BarChartOutlined, 
  CheckCircleOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  SaveOutlined,
  DownloadOutlined,
  PauseCircleOutlined,
  StopOutlined
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

const AnalysisView: React.FC = () => {
    const [activeTab, setActiveTab] = useState('settings');
    
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

    // 计算当前步骤
    const getCurrentStep = () => {
        if (computationResultUrl) return 3; // 计算完成
        if (isComputing) return 2; // 计算中
        if (hasMesh) return 1; // 有网格，准备计算
        return 0; // 初始状态
    };

    // 获取计算进度
    const getComputationProgress = () => {
        if (taskProgress.status === 'completed') return 100;
        if (taskProgress.status === 'processing') return taskProgress.message.includes('%') 
            ? parseInt(taskProgress.message.match(/(\d+)%/)?.[1] || '50')
            : 50;
        if (taskProgress.status === 'starting') return 10;
        return 0;
    };

    // 获取计算状态标签
    const getStatusTag = () => {
        switch (taskProgress.status) {
            case 'completed':
                return <Tag color="success" icon={<CheckCircleOutlined />}>计算完成</Tag>;
            case 'processing':
                return <Tag color="processing" icon={<LoadingOutlined />}>计算中</Tag>;
            case 'error':
                return <Tag color="error" icon={<ExclamationCircleOutlined />}>计算错误</Tag>;
            case 'starting':
                return <Tag color="warning" icon={<LoadingOutlined />}>正在启动</Tag>;
            default:
                return <Tag icon={<InfoCircleOutlined />}>未开始</Tag>;
        }
    };

    // 检查是否可以开始计算
    const canStartComputation = hasMesh && hasComponents && !isComputing;

    return (
        <div className="analysis-view">
            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <div className="analysis-header">
                        <Title level={2} style={{ color: 'white', margin: 0 }}>计算分析</Title>
                        <Space>
                            {getStatusTag()}
                            <Button 
                                type="primary" 
                                icon={<RocketOutlined />} 
                                onClick={startComputation}
                                loading={isComputing}
                                disabled={!canStartComputation}
                            >
                                {isComputing ? '计算中' : '开始计算'}
                            </Button>
                            {isComputing && (
                                <Button 
                                    danger 
                                    icon={<StopOutlined />}
                                    onClick={() => {/* 终止计算的逻辑 */}}
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

                    {!hasComponents && (
                        <Alert
                            message="未找到组件"
                            description="在开始计算之前，请先在几何建模页面创建模型组件。"
                            type="warning"
                            showIcon
                            action={
                                <Button size="small" type="primary" href="/geometry">
                                    前往几何建模
                                </Button>
                            }
                            style={{ marginBottom: 16 }}
                        />
                    )}
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col span={24} lg={8}>
                    <Card className="dashboard-card" style={{ marginBottom: 16 }}>
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
                                title="计算分析" 
                                description={
                                    isComputing ? 
                                    `正在计算: ${taskProgress.message || '初始化求解器...'}` : 
                                    "启动求解器进行计算"
                                } 
                                icon={isComputing ? <LoadingOutlined /> : computationResultUrl ? <CheckCircleOutlined /> : <BarChartOutlined />}
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
                        className="dashboard-card"
                    >
                        <TabPane 
                            tab={<span><SettingOutlined /> 计算设置</span>} 
                            key="settings"
                        >
                            <Card className="dashboard-card" bordered={false}>
                                <Collapse 
                                    defaultActiveKey={['1']} 
                                    ghost
                                    expandIconPosition="end"
                                >
                                    <Panel 
                                        header={<Text strong style={{ color: 'white' }}>求解器设置</Text>} 
                                        key="1"
                                    >
                                        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>求解器类型</Text>
                                                <Text style={{ color: 'white' }}>Kratos</Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>分析类型</Text>
                                                <Text style={{ color: 'white' }}>静力分析</Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>最大迭代次数</Text>
                                                <Text style={{ color: 'white' }}>1000</Text>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <Text style={{ color: 'rgba(255,255,255,0.7)' }}>收敛容差</Text>
                                                <Text style={{ color: 'white' }}>1e-6</Text>
                                            </div>
                                        </div>
                                    </Panel>
                                    <Panel 
                                        header={<Text strong style={{ color: 'white' }}>材料参数</Text>} 
                                        key="2"
                                    >
                                        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                                            {scene?.materials?.map((material, index) => (
                                                <div key={material.id} style={{ marginBottom: index < (scene.materials?.length || 0) - 1 ? 16 : 0 }}>
                                                    <Text strong style={{ color: 'white' }}>{material.name}</Text>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>弹性模量</Text>
                                                        <Text style={{ color: 'white' }}>{material.parameters?.youngs_modulus || 'N/A'} MPa</Text>
                                                    </div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                        <Text style={{ color: 'rgba(255,255,255,0.7)' }}>泊松比</Text>
                                                        <Text style={{ color: 'white' }}>{material.parameters?.poisson_ratio || 'N/A'}</Text>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!scene?.materials || scene.materials.length === 0) && (
                                                <Text style={{ color: 'rgba(255,255,255,0.5)' }}>未定义材料</Text>
                                            )}
                                        </div>
                                    </Panel>
                                    <Panel 
                                        header={<Text strong style={{ color: 'white' }}>边界条件</Text>} 
                                        key="3"
                                    >
                                        <div style={{ color: 'rgba(255,255,255,0.85)' }}>
                                            <div style={{ marginBottom: 8 }}>
                                                <Badge status="success" text={<Text style={{ color: 'white' }}>位移约束: 3个</Text>} />
                                            </div>
                                            <div style={{ marginBottom: 8 }}>
                                                <Badge status="processing" text={<Text style={{ color: 'white' }}>荷载: 2个</Text>} />
                                            </div>
                                            <div>
                                                <Badge status="warning" text={<Text style={{ color: 'white' }}>接触: 0个</Text>} />
                                            </div>
                                        </div>
                                    </Panel>
                                </Collapse>
                            </Card>
                        </TabPane>
                        <TabPane 
                            tab={<span><BarChartOutlined /> 结果分析</span>} 
                            key="results"
                            disabled={!computationResultUrl}
                        >
                            <Card className="dashboard-card" bordered={false}>
                                {computationResultUrl ? (
                                    <PostProcessingControls />
                                ) : (
                                    <div className="analysis-empty">
                                        <BarChartOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }} />
                                        <Paragraph style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
                                            完成计算后可查看结果
                                        </Paragraph>
                                    </div>
                                )}
                            </Card>
                        </TabPane>
                        <TabPane 
                            tab={<span><FileTextOutlined /> 报告</span>} 
                            key="report"
                            disabled={!computationResultUrl}
                        >
                            <Card className="dashboard-card" bordered={false}>
                                {computationResultUrl ? (
                                    <Space direction="vertical" style={{ width: '100%' }}>
                                        <Paragraph style={{ color: 'rgba(255,255,255,0.7)' }}>
                                            生成计算结果报告，包含模型信息、计算参数和结果数据。
                                        </Paragraph>
                                        <Space>
                                            <Button icon={<FileTextOutlined />}>预览报告</Button>
                                            <Button icon={<DownloadOutlined />}>导出PDF</Button>
                                            <Button icon={<SaveOutlined />}>保存数据</Button>
                                        </Space>
                                    </Space>
                                ) : (
                                    <div className="analysis-empty">
                                        <FileTextOutlined style={{ fontSize: 48, color: 'rgba(255,255,255,0.2)' }} />
                                        <Paragraph style={{ color: 'rgba(255,255,255,0.5)', marginTop: 16 }}>
                                            完成计算后可生成报告
                                        </Paragraph>
                                    </div>
                                )}
                            </Card>
                        </TabPane>
                    </Tabs>
                </Col>
                
                <Col span={24} lg={16}>
                    <div className="viewport-container" style={{ height: 'calc(100vh - 200px)', position: 'relative' }}>
                        <Viewport3D className="analysis-viewport" />
                        
                        {isComputing && (
                            <div className="computation-overlay" style={{
                                position: 'absolute',
                                bottom: 16,
                                left: 16,
                                right: 16,
                                background: 'rgba(0,0,0,0.7)',
                                padding: 16,
                                borderRadius: 8,
                                zIndex: 10
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                    <Text style={{ color: 'white' }}>计算进度</Text>
                                    <Text style={{ color: 'white' }}>{getComputationProgress()}%</Text>
                                </div>
                                <div className="computation-progress">
                                    <div className="progress-bar">
                                        <div className="progress-bar-inner" style={{ width: `${getComputationProgress()}%` }}></div>
                                    </div>
                                </div>
                                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>
                                    {taskProgress.message || '正在初始化求解器...'}
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