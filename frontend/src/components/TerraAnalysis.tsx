import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Form, Input, Select, InputNumber, Button, Steps, 
  Table, Space, message, Progress, Alert, Tabs, Row, Col,
  Divider, Tag, Tooltip, Modal, Typography
} from 'antd';
import {
  RocketOutlined, AppstoreOutlined, BuildOutlined, 
  ToolOutlined, EyeOutlined, DeleteOutlined, EditOutlined,
  PlusOutlined, SafetyOutlined, ExperimentOutlined
} from '@ant-design/icons';
import { apiClient } from '../api/client';
import { useRealTimeFeedback, useTaskProgress, TaskStatus, FeedbackType } from '../hooks/useRealTimeFeedback';
import { useValidatedForm } from '../hooks/useValidatedForm';
import { ValidationSchemas } from '../validation/schemas';
import Viewport3D from './Viewport3D';
import PostProcessingControls from './PostProcessingControls';
import { generatePdfReport } from '../services/reportGenerator';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Step } = Steps;
const { Option } = Select;

interface SoilLayer {
  name: string;
  depth_from: number;
  depth_to: number;
  elastic_modulus: number;
  poisson_ratio: number;
  density: number;
  cohesion: number;
  friction_angle: number;
  permeability: number;
  material_type: string;
}

interface ExcavationStage {
  stage: number;
  depth: number;
  description: string;
  duration: number;
}

interface TerraAnalysisProps {
  onAnalysisComplete?: (result: any) => void;
}

const TerraAnalysis: React.FC<TerraAnalysisProps> = ({ onAnalysisComplete }) => {
  // 表单验证
  const validatedForm = useValidatedForm({
    schema: ValidationSchemas.TerraAnalysis,
    onSubmit: async (data) => {
      await startAnalysisWithValidation(data);
    },
    enableRealTimeValidation: true
  });

  // 状态管理
  const [currentStep, setCurrentStep] = useState(0);
  const [soilLayers, setSoilLayers] = useState<SoilLayer[]>([]);
  const [excavationStages, setExcavationStages] = useState<ExcavationStage[]>([]);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [terraStatus, setTerraStatus] = useState<any>(null);
  const [availableSoilTypes, setAvailableSoilTypes] = useState<any[]>([]);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const reportContentRef = useRef<HTMLDivElement>(null);

  // WebSocket实时反馈
  const feedback = useRealTimeFeedback('terra_analysis', {
    onMessage: (msg) => {
      console.log('收到反馈消息:', msg);
    },
    onTaskUpdate: (task) => {
      console.log('任务状态更新:', task);
    },
    onIoTData: (data) => {
      console.log('收到IoT数据:', data);
    }
  });

  // 任务进度跟踪
  const taskProgress = useTaskProgress(analysisId || '');

  // 计算当前加载和进度状态
  const loading = taskProgress.status === TaskStatus.RUNNING || taskProgress.status === TaskStatus.STARTING;
  const analysisProgress = taskProgress.progress;
  const analysisStatus = taskProgress.message;

  useEffect(() => {
    fetchTerraStatus();
    fetchSoilTypes();
  }, []);

  const fetchTerraStatus = async () => {
    try {
      const response = await apiClient.get('/computation/terra/status');
      setTerraStatus(response.data);
    } catch (error) {
      console.error('获取Terra状态失败:', error);
    }
  };

  const fetchSoilTypes = async () => {
    try {
      const response = await apiClient.get('/computation/terra/database/soil-types');
      setAvailableSoilTypes(response.data.soil_types || []);
    } catch (error) {
      console.error('获取土体类型失败:', error);
    }
  };

  const handleAddSoilLayer = () => {
    const newLayer: SoilLayer = {
      name: `土层${soilLayers.length + 1}`,
      depth_from: soilLayers.length > 0 ? soilLayers[soilLayers.length - 1].depth_to : 0,
      depth_to: soilLayers.length > 0 ? soilLayers[soilLayers.length - 1].depth_to + 5 : 5,
      elastic_modulus: 20,
      poisson_ratio: 0.3,
      density: 1900,
      cohesion: 25,
      friction_angle: 18,
      permeability: 1e-8,
      material_type: 'clay'
    };
    setSoilLayers([...soilLayers, newLayer]);
  };

  const handleRemoveSoilLayer = (index: number) => {
    const newLayers = soilLayers.filter((_, i) => i !== index);
    setSoilLayers(newLayers);
  };

  const handleSoilLayerChange = (index: number, field: string, value: any) => {
    const newLayers = [...soilLayers];
    newLayers[index] = { ...newLayers[index], [field]: value };
    setSoilLayers(newLayers);
  };

  const handleAddExcavationStage = () => {
    const newStage: ExcavationStage = {
      stage: excavationStages.length + 1,
      depth: excavationStages.length > 0 ? excavationStages[excavationStages.length - 1].depth + 3 : 3,
      description: `第${excavationStages.length + 1}阶段开挖`,
      duration: 1.0
    };
    setExcavationStages([...excavationStages, newStage]);
  };

  const handleRemoveExcavationStage = (index: number) => {
    const newStages = excavationStages.filter((_, i) => i !== index);
    setExcavationStages(newStages);
  };

  const handleExcavationStageChange = (index: number, field: string, value: any) => {
    const newStages = [...excavationStages];
    newStages[index] = { ...newStages[index], [field]: value };
    setExcavationStages(newStages);
  };

  const loadTypicalSoilProperties = async (soilType: string, layerIndex: number) => {
    try {
      const response = await apiClient.get(`/computation/terra/database/soil-properties/${soilType}`);
      const properties = response.data.properties;
      
      handleSoilLayerChange(layerIndex, 'elastic_modulus', properties.elastic_modulus);
      handleSoilLayerChange(layerIndex, 'poisson_ratio', properties.poisson_ratio);
      handleSoilLayerChange(layerIndex, 'density', properties.density);
      handleSoilLayerChange(layerIndex, 'cohesion', properties.cohesion);
      handleSoilLayerChange(layerIndex, 'friction_angle', properties.friction_angle);
      handleSoilLayerChange(layerIndex, 'permeability', properties.permeability);
      
      message.success(`已加载${soilType}的典型参数`);
    } catch (error) {
      message.error('加载典型参数失败');
    }
  };

  const startAnalysisWithValidation = async (formData: any) => {
    // 验证土层和开挖阶段
    if (soilLayers.length === 0) {
      message.error('请至少添加一个土层');
      return;
    }
    
    if (excavationStages.length === 0) {
      message.error('请至少添加一个开挖阶段');
      return;
    }

    try {
      // 构建分析请求
      const analysisRequest = {
        ...formData,
        analysis_type: 'excavation',
        soil_layers: soilLayers,
        excavation_stages: excavationStages
      };

      // 创建WebSocket任务
      const taskResponse = await apiClient.post('/websockets/tasks/create', {
        name: `Terra分析: ${formData.project_name}`,
        type: 'terra_analysis',
        client_id: 'terra_analysis',
        metadata: { 
          project_name: formData.project_name,
          soil_layers_count: soilLayers.length,
          excavation_stages_count: excavationStages.length
        }
      });

      const taskId = taskResponse.data.task_id;
      setAnalysisId(taskId);

      // 订阅任务进度
      feedback.subscribeToTask(taskId);

      // 启动分析
      const analysisResponse = await apiClient.post('/computation/terra/analysis/start', {
        ...analysisRequest,
        task_id: taskId
      });
      
      if (analysisResponse.data.status === 'started') {
        message.success('Terra分析已启动，可以通过进度条查看实时进度');
      }

    } catch (error: any) {
      console.error('启动分析失败:', error);
      message.error(`启动分析失败: ${error.response?.data?.detail || error.message}`);
      
      // 更新任务状态为失败
      if (analysisId) {
        await apiClient.post(`/websockets/tasks/${analysisId}/status`, {
          status: 'failed',
          message: error.response?.data?.detail || error.message
        });
      }
    }
  };

  const startAnalysis = async () => {
    // 使用验证表单提交
    await validatedForm.handleSubmit();
  };

  // 监听任务完成事件
  useEffect(() => {
    if (taskProgress.status === TaskStatus.COMPLETED && analysisId) {
      message.success('Terra分析完成');
      
      // 获取分析结果
      apiClient.get(`/computation/terra/analysis/${analysisId}/results`)
        .then(response => {
          if (onAnalysisComplete) {
            onAnalysisComplete(response.data);
          }
          setAnalysisResult(response.data); // 保存结果到状态
        })
        .catch(error => {
          message.error('获取分析结果失败');
        });
    } else if (taskProgress.status === TaskStatus.FAILED) {
      message.error('Terra分析失败');
    }
  }, [taskProgress.status, analysisId, onAnalysisComplete]);

  const handleGenerateReport = async () => {
    if (!reportContentRef.current) {
      message.error('无法生成报告：报告内容尚未渲染。');
      return;
    }
    
    message.loading({ content: '正在生成PDF报告...', key: 'report' });
    try {
      await generatePdfReport({ reportContentRef });
      message.success({ content: '报告已成功生成！', key: 'report', duration: 2 });
    } catch (error) {
      console.error('生成报告失败:', error);
      message.error({ content: '生成报告失败，请查看控制台获取详情。', key: 'report', duration: 2 });
    }
  };

  const soilLayerColumns = [
    {
      title: '土层名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: SoilLayer, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleSoilLayerChange(index, 'name', e.target.value)}
          size="small"
        />
      )
    },
    {
      title: '起始深度(m)',
      dataIndex: 'depth_from',
      key: 'depth_from',
      width: 120,
      render: (value: number, record: SoilLayer, index: number) => (
        <InputNumber
          value={value}
          onChange={(val) => handleSoilLayerChange(index, 'depth_from', val)}
          size="small"
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '结束深度(m)',
      dataIndex: 'depth_to',
      key: 'depth_to',
      width: 120,
      render: (value: number, record: SoilLayer, index: number) => (
        <InputNumber
          value={value}
          onChange={(val) => handleSoilLayerChange(index, 'depth_to', val)}
          size="small"
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '材料类型',
      dataIndex: 'material_type',
      key: 'material_type',
      width: 120,
      render: (value: string, record: SoilLayer, index: number) => (
        <Select
          value={value}
          onChange={(val) => handleSoilLayerChange(index, 'material_type', val)}
          size="small"
          style={{ width: '100%' }}
        >
          <Option value="clay">粘土</Option>
          <Option value="sand">砂土</Option>
          <Option value="rock">岩石</Option>
        </Select>
      )
    },
    {
      title: '弹性模量(MPa)',
      dataIndex: 'elastic_modulus',
      key: 'elastic_modulus',
      width: 120,
      render: (value: number, record: SoilLayer, index: number) => (
        <InputNumber
          value={value}
          onChange={(val) => handleSoilLayerChange(index, 'elastic_modulus', val)}
          size="small"
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: any, record: SoilLayer, index: number) => (
        <Space size="small">
          <Select
            placeholder="典型参数"
            onChange={(value) => loadTypicalSoilProperties(value, index)}
            size="small"
            style={{ width: 100 }}
          >
            {availableSoilTypes.map(type => (
              <Option key={type.key} value={type.key}>{type.name}</Option>
            ))}
          </Select>
          <Button 
            size="small" 
            danger 
            icon={<DeleteOutlined />}
            onClick={() => handleRemoveSoilLayer(index)}
          />
        </Space>
      )
    }
  ];

  const excavationStageColumns = [
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 80,
      render: (value: number) => `第${value}阶段`
    },
    {
      title: '开挖深度(m)',
      dataIndex: 'depth',
      key: 'depth',
      width: 120,
      render: (value: number, record: ExcavationStage, index: number) => (
        <InputNumber
          value={value}
          onChange={(val) => handleExcavationStageChange(index, 'depth', val)}
          size="small"
          min={0}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      render: (text: string, record: ExcavationStage, index: number) => (
        <Input
          value={text}
          onChange={(e) => handleExcavationStageChange(index, 'description', e.target.value)}
          size="small"
        />
      )
    },
    {
      title: '持续时间(天)',
      dataIndex: 'duration',
      key: 'duration',
      width: 120,
      render: (value: number, record: ExcavationStage, index: number) => (
        <InputNumber
          value={value}
          onChange={(val) => handleExcavationStageChange(index, 'duration', val)}
          size="small"
          min={0.1}
          step={0.1}
          style={{ width: '100%' }}
        />
      )
    },
    {
      title: '操作',
      key: 'action',
      width: 80,
      render: (_: any, record: ExcavationStage, index: number) => (
        <Button 
          size="small" 
          danger 
          icon={<DeleteOutlined />}
          onClick={() => handleRemoveExcavationStage(index)}
        />
      )
    }
  ];

  const renderResultsView = () => (
    <div style={{ display: 'flex', height: 'calc(100vh - 250px)', gap: '16px' }}>
      <div ref={reportContentRef} style={{ flex: 3, position: 'relative' }}>
        <Viewport3D mode="results" />
      </div>
      <div style={{ flex: 1 }}>
        <PostProcessingControls onGenerateReport={handleGenerateReport} />
      </div>
    </div>
  );

  return (
    <div className="terra-analysis fade-in">
      <Card 
        title={
          <Space>
            <RocketOutlined />
            <span>Terra深基坑分析</span>
            {terraStatus && (
              <Tag color={terraStatus.status === 'available' ? 'green' : 'red'}>
                {terraStatus.status === 'available' ? '可用' : '不可用'}
              </Tag>
            )}
            <Tag color={feedback.isConnected ? 'green' : 'red'}>
              WebSocket {feedback.isConnected ? '已连接' : '未连接'}
            </Tag>
            {analysisId && (
              <Tag color={
                taskProgress.status === TaskStatus.COMPLETED ? 'green' :
                taskProgress.status === TaskStatus.FAILED ? 'red' :
                taskProgress.status === TaskStatus.RUNNING ? 'blue' : 'orange'
              }>
                {taskProgress.status}
              </Tag>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button icon={<ExperimentOutlined />}>参数预设</Button>
            <Button icon={<SafetyOutlined />}>安全分析</Button>
          </Space>
        }
      >
        <Steps current={currentStep} style={{ marginBottom: '24px' }}>
          <Step title="项目设置" description="设置项目基本信息" />
          <Step title="土层定义" description="定义地质分层" />
          <Step title="开挖方案" description="设置开挖阶段" />
          <Step title="运行分析" description="执行Terra计算" />
        </Steps>

        <Tabs activeKey={currentStep.toString()} onChange={(key) => setCurrentStep(parseInt(key))}>
          <TabPane tab="项目设置" key="0">
            <Form form={validatedForm.form} layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="project_name"
                    label="项目名称"
                    rules={[{ required: true, message: '请输入项目名称' }]}
                  >
                    <Input 
                      placeholder="输入深基坑项目名称"
                      onChange={(e) => validatedForm.setFieldValue('project_name', e.target.value)}
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="analysis_type"
                    label="分析类型"
                    initialValue="excavation"
                  >
                    <Select
                      onChange={(value) => validatedForm.setFieldValue('analysis_type', value)}
                      defaultValue="excavation"
                    >
                      <Option value="excavation">基坑开挖分析</Option>
                      <Option value="seepage">渗流分析</Option>
                      <Option value="coupled">耦合分析</Option>
                      <Option value="support_design">支护设计</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              
              {/* 显示验证错误 */}
              {validatedForm.errors && validatedForm.errors.length > 0 && (
                <Alert
                  message="表单验证错误"
                  description={
                    <ul>
                      {validatedForm.errors.map((error, index) => (
                        <li key={index}>{error.field}: {error.message}</li>
                      ))}
                    </ul>
                  }
                  type="error"
                  style={{ marginTop: '16px' }}
                />
              )}
            </Form>

            {terraStatus && (
              <Alert
                message="Terra求解器状态"
                description={
                  <div>
                    <div>Terra可用: {terraStatus.terra_available ? '是' : '否'}</div>
                    <div>PyVista可用: {terraStatus.pyvista_available ? '是' : '否'}</div>
                    <div>支持的分析类型: {terraStatus.supported_analysis_types?.join(', ')}</div>
                  </div>
                }
                type={terraStatus.status === 'available' ? 'success' : 'warning'}
                style={{ marginTop: '16px' }}
              />
            )}

            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <Button type="primary" onClick={() => setCurrentStep(1)}>
                下一步：土层定义
              </Button>
            </div>
          </TabPane>

          <TabPane tab="土层定义" key="1">
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddSoilLayer}>
                  添加土层
                </Button>
                <Text type="secondary">共 {soilLayers.length} 个土层</Text>
              </Space>
            </div>

            <Table
              dataSource={soilLayers}
              columns={soilLayerColumns}
              rowKey={(record, index) => index?.toString() || ''}
              pagination={false}
              size="small"
              scroll={{ x: 800 }}
            />

            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <Space>
                <Button onClick={() => setCurrentStep(0)}>
                  上一步
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(2)}
                  disabled={soilLayers.length === 0}
                >
                  下一步：开挖方案
                </Button>
              </Space>
            </div>
          </TabPane>

          <TabPane tab="开挖方案" key="2">
            <div style={{ marginBottom: '16px' }}>
              <Space>
                <Button type="primary" icon={<PlusOutlined />} onClick={handleAddExcavationStage}>
                  添加开挖阶段
                </Button>
                <Text type="secondary">共 {excavationStages.length} 个阶段</Text>
              </Space>
            </div>

            <Table
              dataSource={excavationStages}
              columns={excavationStageColumns}
              rowKey={(record, index) => index?.toString() || ''}
              pagination={false}
              size="small"
            />

            <div style={{ textAlign: 'right', marginTop: '24px' }}>
              <Space>
                <Button onClick={() => setCurrentStep(1)}>
                  上一步
                </Button>
                <Button 
                  type="primary" 
                  onClick={() => setCurrentStep(3)}
                  disabled={excavationStages.length === 0}
                >
                  下一步：运行分析
                </Button>
              </Space>
            </div>
          </TabPane>

          <TabPane tab="运行分析" key="3">
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <Title level={4}>Terra深基坑分析</Title>
              
              <div style={{ marginBottom: '24px' }}>
                <Text>土层数量: <Text strong>{soilLayers.length}</Text></Text>
                <Divider type="vertical" />
                <Text>开挖阶段: <Text strong>{excavationStages.length}</Text></Text>
                <Divider type="vertical" />
                <Text>分析类型: <Text strong>基坑开挖</Text></Text>
              </div>

              {(loading || analysisId) && (
                <div style={{ marginBottom: '24px' }}>
                  <Progress 
                    percent={analysisProgress} 
                    status={
                      taskProgress.status === TaskStatus.FAILED ? 'exception' :
                      taskProgress.status === TaskStatus.COMPLETED ? 'success' : 'active'
                    }
                    strokeColor={
                      taskProgress.status === TaskStatus.FAILED ? '#ff4d4f' :
                      taskProgress.status === TaskStatus.COMPLETED ? '#52c41a' : '#1890ff'
                    }
                  />
                  <Text style={{ marginTop: '8px', display: 'block' }}>
                    {analysisStatus || '等待任务开始...'}
                  </Text>
                  
                  {/* 显示实时反馈消息 */}
                  {feedback.messages.length > 0 && (
                    <div style={{ marginTop: '16px', maxHeight: '200px', overflowY: 'auto' }}>
                      <Text strong>实时日志:</Text>
                      {feedback.messages.slice(-5).map((msg, index) => (
                        <div key={msg.id} style={{ 
                          padding: '4px 8px', 
                          backgroundColor: msg.type === FeedbackType.ERROR ? '#fff2f0' : 
                                         msg.type === FeedbackType.WARNING ? '#fffbe6' : '#f6ffed',
                          border: `1px solid ${msg.type === FeedbackType.ERROR ? '#ffccc7' : 
                                              msg.type === FeedbackType.WARNING ? '#ffe58f' : '#b7eb8f'}`,
                          borderRadius: '4px',
                          marginTop: '4px',
                          fontSize: '12px'
                        }}>
                          <Text type="secondary">{new Date(msg.timestamp).toLocaleTimeString()}</Text>
                          <span style={{ marginLeft: '8px' }}>{msg.message}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Space>
                <Button onClick={() => setCurrentStep(2)}>
                  上一步
                </Button>
                {analysisId && loading && (
                  <Button
                    danger
                    onClick={() => {
                      feedback.cancelTask(analysisId);
                      message.info('正在取消任务...');
                    }}
                  >
                    取消分析
                  </Button>
                )}
                <Button
                  type="primary"
                  size="large"
                  icon={<RocketOutlined />}
                  onClick={startAnalysis}
                  loading={validatedForm.loading || loading}
                  disabled={terraStatus?.status !== 'available' || loading}
                >
                  {loading ? '分析中...' : '开始Terra分析'}
                </Button>
              </Space>
            </div>
          </TabPane>

          {currentStep === 2 && renderResultsView()}
        </Tabs>
      </Card>
    </div>
  );
};

export default TerraAnalysis;