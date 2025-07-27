import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Select,
  InputNumber,
  Switch,
  Button,
  Space,
  Alert,
  Progress,
  Collapse,
  Tooltip,
  Row,
  Col,
  Tag,
  Typography,
  Table,
  Modal,
  Tabs,
  Divider,
  Badge
} from 'antd';
import {
  CalculatorOutlined,
  PlayCircleOutlined,
  SettingOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  ExperimentOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  WarningOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;
const { TabPane } = Tabs;

// 分析类型枚举
enum AnalysisType {
  EXCAVATION = 'excavation',
  SEEPAGE = 'seepage',
  COUPLED = 'coupled',
  SUPPORT_DESIGN = 'support_design',
  SLOPE_STABILITY = 'slope_stability'
}

// 土层材料参数
interface SoilLayer {
  id: string;
  name: string;
  depthFrom: number;
  depthTo: number;
  elasticModulus: number;
  poissonRatio: number;
  density: number;
  cohesion: number;
  frictionAngle: number;
  permeability: number;
  materialType: 'clay' | 'sand' | 'rock' | 'concrete' | 'steel';
}

// 开挖阶段
interface ExcavationStage {
  id: string;
  stage: number;
  depth: number;
  description: string;
  duration: number;
}

// 荷载定义
interface LoadDefinition {
  id: string;
  name: string;
  type: 'excavation' | 'surcharge' | 'water_pressure' | 'support_force';
  geometry: any;
  magnitude: number;
  direction: [number, number, number];
  applicationStage: number;
}

// 边界条件
interface BoundaryCondition {
  id: string;
  name: string;
  type: 'displacement' | 'force' | 'pressure' | 'symmetry';
  geometry: any;
  values: number[];
  constrainedDOF: boolean[];
}

// 计算配置
interface ComputationConfig {
  analysisType: AnalysisType;
  soilLayers: SoilLayer[];
  excavationStages: ExcavationStage[];
  loads: LoadDefinition[];
  boundaryConditions: BoundaryCondition[];
  solverSettings: {
    maxIterations: number;
    convergenceTolerance: number;
    timeStep: number;
    endTime: number;
    solver: 'terra' | 'simulation';
    parallelization: boolean;
    numThreads: number;
  };
  outputSettings: {
    outputFrequency: number;
    outputFields: string[];
    generateVisualization: boolean;
  };
}

interface ComputationAnalysisConfigPanelProps {
  onConfigChange?: (config: ComputationConfig) => void;
  onStartAnalysis?: (config: ComputationConfig) => void;
  isAnalyzing?: boolean;
  progress?: number;
  currentStage?: string;
}

const ComputationAnalysisConfigPanel: React.FC<ComputationAnalysisConfigPanelProps> = ({
  onConfigChange,
  onStartAnalysis,
  isAnalyzing = false,
  progress = 0,
  currentStage = ''
}) => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState<ComputationConfig>({
    analysisType: AnalysisType.EXCAVATION,
    soilLayers: [],
    excavationStages: [],
    loads: [],
    boundaryConditions: [],
    solverSettings: {
      maxIterations: 100,
      convergenceTolerance: 1e-6,
      timeStep: 1.0,
      endTime: 10.0,
      solver: 'terra',
      parallelization: true,
      numThreads: 4
    },
    outputSettings: {
      outputFrequency: 1,
      outputFields: ['displacement', 'stress', 'water_pressure'],
      generateVisualization: true
    }
  });

  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [modalType, setModalType] = useState<'soil' | 'stage' | 'load' | 'boundary'>('soil');

  // 分析类型配置
  const analysisTypeConfig = {
    [AnalysisType.EXCAVATION]: {
      name: '基坑开挖分析',
      description: '模拟分阶段开挖过程，分析变形和应力',
      icon: <ExperimentOutlined />,
      color: '#1890ff',
      requiredFields: ['soilLayers', 'excavationStages']
    },
    [AnalysisType.SEEPAGE]: {
      name: '渗流分析',
      description: '分析地下水渗流和水压力分布',
      icon: <ThunderboltOutlined />,
      color: '#52c41a',
      requiredFields: ['soilLayers', 'boundaryConditions']
    },
    [AnalysisType.COUPLED]: {
      name: '渗流-变形耦合',
      description: '考虑渗流和变形相互作用的耦合分析',
      icon: <SettingOutlined />,
      color: '#722ed1',
      requiredFields: ['soilLayers', 'excavationStages', 'boundaryConditions']
    },
    [AnalysisType.SUPPORT_DESIGN]: {
      name: '支护结构设计',
      description: '支护结构受力分析和设计优化',
      icon: <CalculatorOutlined />,
      color: '#fa541c',
      requiredFields: ['soilLayers', 'loads', 'boundaryConditions']
    }
  };

  // 处理配置变化
  const handleConfigChange = (changedValues: any, allValues: any) => {
    const newConfig = { ...config, ...allValues };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 开始分析
  const handleStartAnalysis = () => {
    form.validateFields().then(values => {
      onStartAnalysis?.(config);
    });
  };

  // 添加土层
  const addSoilLayer = () => {
    setModalType('soil');
    setEditingItem(null);
    setModalVisible(true);
  };

  // 添加开挖阶段
  const addExcavationStage = () => {
    setModalType('stage');
    setEditingItem(null);
    setModalVisible(true);
  };

  // 土层表格列
  const soilLayerColumns = [
    {
      title: '层名',
      dataIndex: 'name',
      key: 'name',
      width: 120
    },
    {
      title: '深度(m)',
      key: 'depth',
      width: 100,
      render: (record: SoilLayer) => `${record.depthFrom}-${record.depthTo}`
    },
    {
      title: '弹性模量(MPa)',
      dataIndex: 'elasticModulus',
      key: 'elasticModulus',
      width: 120
    },
    {
      title: '泊松比',
      dataIndex: 'poissonRatio',
      key: 'poissonRatio',
      width: 80
    },
    {
      title: '密度(kg/m³)',
      dataIndex: 'density',
      key: 'density',
      width: 100
    },
    {
      title: '黏聚力(kPa)',
      dataIndex: 'cohesion',
      key: 'cohesion',
      width: 100
    },
    {
      title: '内摩擦角(°)',
      dataIndex: 'frictionAngle',
      key: 'frictionAngle',
      width: 100
    },
    {
      title: '渗透系数(m/s)',
      dataIndex: 'permeability',
      key: 'permeability',
      width: 120,
      render: (value: number) => value.toExponential(2)
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (record: SoilLayer) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => editSoilLayer(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteSoilLayer(record.id)} />
        </Space>
      )
    }
  ];

  // 开挖阶段表格列
  const excavationStageColumns = [
    {
      title: '阶段',
      dataIndex: 'stage',
      key: 'stage',
      width: 80
    },
    {
      title: '开挖深度(m)',
      dataIndex: 'depth',
      key: 'depth',
      width: 120
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: '持续时间(天)',
      dataIndex: 'duration',
      key: 'duration',
      width: 120
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (record: ExcavationStage) => (
        <Space>
          <Button size="small" icon={<EditOutlined />} onClick={() => editExcavationStage(record)} />
          <Button size="small" danger icon={<DeleteOutlined />} onClick={() => deleteExcavationStage(record.id)} />
        </Space>
      )
    }
  ];

  // 编辑土层
  const editSoilLayer = (layer: SoilLayer) => {
    setModalType('soil');
    setEditingItem(layer);
    setModalVisible(true);
  };

  // 删除土层
  const deleteSoilLayer = (id: string) => {
    const newLayers = config.soilLayers.filter(layer => layer.id !== id);
    setConfig({ ...config, soilLayers: newLayers });
  };

  // 编辑开挖阶段
  const editExcavationStage = (stage: ExcavationStage) => {
    setModalType('stage');
    setEditingItem(stage);
    setModalVisible(true);
  };

  // 删除开挖阶段
  const deleteExcavationStage = (id: string) => {
    const newStages = config.excavationStages.filter(stage => stage.id !== id);
    setConfig({ ...config, excavationStages: newStages });
  };

  // 获取当前分析类型配置
  const currentAnalysisConfig = analysisTypeConfig[config.analysisType];

  return (
    <Card
      title={
        <Space>
          <CalculatorOutlined style={{ color: '#00d9ff' }} />
          <span>计算分析配置</span>
          <Tag color="#00d9ff">3号模块</Tag>
        </Space>
      }
      extra={
        <Space>
          <Badge status={isAnalyzing ? 'processing' : 'default'} text={isAnalyzing ? '分析中' : '就绪'} />
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartAnalysis}
            loading={isAnalyzing}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? '分析中...' : '开始分析'}
          </Button>
        </Space>
      }
      style={{ height: '100%' }}
    >
      {/* 进度显示 */}
      {isAnalyzing && (
        <Alert
          message="Terra分析进行中"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={progress} status="active" />
              <Text type="secondary">{currentStage}</Text>
            </Space>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={handleConfigChange}
      >
        {/* 分析类型选择 */}
        <Card size="small" title="分析类型" style={{ marginBottom: 16 }}>
          <Form.Item name="analysisType">
            <Select size="large">
              {Object.entries(analysisTypeConfig).map(([key, typeConfig]) => (
                <Option key={key} value={key}>
                  <Space>
                    <span style={{ color: typeConfig.color }}>{typeConfig.icon}</span>
                    <div>
                      <div style={{ fontWeight: 'bold' }}>{typeConfig.name}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{typeConfig.description}</div>
                    </div>
                  </Space>
                </Option>
              ))}
            </Select>
          </Form.Item>
          
          <Alert
            message={currentAnalysisConfig.name}
            description={currentAnalysisConfig.description}
            type="info"
            showIcon
            icon={currentAnalysisConfig.icon}
          />
        </Card>

        <Tabs defaultActiveKey="materials" type="card">
          {/* 材料参数 */}
          <TabPane tab="材料参数" key="materials">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row justify="space-between" align="middle">
                <Col>
                  <Title level={5}>土层参数</Title>
                </Col>
                <Col>
                  <Button type="primary" icon={<PlusOutlined />} onClick={addSoilLayer}>
                    添加土层
                  </Button>
                </Col>
              </Row>
              
              <Table
                dataSource={config.soilLayers}
                columns={soilLayerColumns}
                pagination={false}
                size="small"
                rowKey="id"
                locale={{ emptyText: '暂无土层数据，请添加土层参数' }}
              />
            </Space>
          </TabPane>

          {/* 开挖阶段 */}
          {config.analysisType === AnalysisType.EXCAVATION && (
            <TabPane tab="开挖阶段" key="excavation">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row justify="space-between" align="middle">
                  <Col>
                    <Title level={5}>分阶段开挖</Title>
                  </Col>
                  <Col>
                    <Button type="primary" icon={<PlusOutlined />} onClick={addExcavationStage}>
                      添加阶段
                    </Button>
                  </Col>
                </Row>
                
                <Table
                  dataSource={config.excavationStages}
                  columns={excavationStageColumns}
                  pagination={false}
                  size="small"
                  rowKey="id"
                  locale={{ emptyText: '暂无开挖阶段，请添加开挖计划' }}
                />
              </Space>
            </TabPane>
          )}

          {/* 求解器设置 */}
          <TabPane tab="求解器设置" key="solver">
            <Collapse defaultActiveKey={['basic', 'advanced']} ghost>
              <Panel header="基本设置" key="basic">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="求解器选择"
                      name={['solverSettings', 'solver']}
                    >
                      <Select>
                        <Option value="terra">
                          <Space>
                            <ThunderboltOutlined style={{ color: '#1890ff' }} />
                            <div>
                              <div>Terra求解器</div>
                              <div style={{ fontSize: '11px', color: '#666' }}>专业深基坑分析引擎</div>
                            </div>
                          </Space>
                        </Option>
                        <Option value="simulation">
                          <Space>
                            <ExperimentOutlined style={{ color: '#52c41a' }} />
                            <div>
                              <div>仿真脚本求解器</div>
                              <div style={{ fontSize: '11px', color: '#666' }}>通用多物理场求解器</div>
                            </div>
                          </Space>
                        </Option>
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="最大迭代次数"
                      name={['solverSettings', 'maxIterations']}
                    >
                      <InputNumber min={10} max={1000} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="收敛容差"
                      name={['solverSettings', 'convergenceTolerance']}
                    >
                      <InputNumber
                        min={1e-10}
                        max={1e-3}
                        step={1e-7}
                        style={{ width: '100%' }}
                        formatter={value => value ? value.toExponential(2) : ''}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="时间步长(天)"
                      name={['solverSettings', 'timeStep']}
                    >
                      <InputNumber min={0.1} max={10} step={0.1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Panel>

              <Panel header="高级设置" key="advanced">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="并行计算"
                      name={['solverSettings', 'parallelization']}
                      valuePropName="checked"
                    >
                      <Switch checkedChildren="开启" unCheckedChildren="关闭" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="线程数"
                      name={['solverSettings', 'numThreads']}
                    >
                      <InputNumber min={1} max={16} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="输出频率"
                  name={['outputSettings', 'outputFrequency']}
                  tooltip="每隔多少步输出一次结果"
                >
                  <InputNumber min={1} max={100} style={{ width: '100%' }} />
                </Form.Item>

                <Form.Item
                  label="输出字段"
                  name={['outputSettings', 'outputFields']}
                >
                  <Select mode="multiple" placeholder="选择要输出的物理场">
                    <Option value="displacement">位移</Option>
                    <Option value="stress">应力</Option>
                    <Option value="strain">应变</Option>
                    <Option value="water_pressure">水压力</Option>
                    <Option value="effective_stress">有效应力</Option>
                    <Option value="plastic_strain">塑性应变</Option>
                  </Select>
                </Form.Item>
              </Panel>
            </Collapse>
          </TabPane>
        </Tabs>
      </Form>

      {/* 模态框用于添加/编辑项目 */}
      <Modal
        title={`${editingItem ? '编辑' : '添加'}${modalType === 'soil' ? '土层' : '开挖阶段'}`}
        visible={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
      >
        {/* 这里可以添加详细的表单组件 */}
        <div>详细配置表单将在这里展示</div>
      </Modal>
    </Card>
  );
};

export default ComputationAnalysisConfigPanel;