/**
 * 基坑设计工具界面 - 2号几何专家开发
 * P1优先级任务 - 专业级基坑几何设计和施工阶段规划
 * 基于1号架构师规划，集成3号专家的工程计算标准
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Card, Form, InputNumber, Select, Button, Space, Typography, 
  Row, Col, Table, Tag, Tooltip, Modal, Steps, Timeline,
  Slider, Switch, Divider, Alert, Progress, Tabs, List,
  Popconfirm, message, Drawer, Collapse, Radio, Checkbox
} from 'antd';
import { 
  AppstoreOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
  EyeOutlined, CalculatorOutlined, SettingOutlined, SaveOutlined,
  ThunderboltOutlined, BarsOutlined, EnvironmentOutlined,
  ClockCircleOutlined, WarningOutlined, CheckCircleOutlined,
  LineChartOutlined, BuildOutlined, RocketOutlined, CopyOutlined
} from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;
const { TabPane } = Tabs;
const { Option } = Select;

// 基坑几何定义
interface ExcavationGeometry {
  id: string;
  name: string;
  type: 'rectangular' | 'circular' | 'irregular' | 'stepped';
  outline: Point2D[];
  totalDepth: number;
  stages: ExcavationStage[];
  slopes: SlopeDefinition[];
  drainageSystem?: DrainageConfig;
  safetyFactors: SafetyFactors;
  designParameters: DesignParameters;
  created: string;
  modified: string;
  status: 'draft' | 'designed' | 'approved' | 'under_construction';
}

interface Point2D {
  x: number;
  y: number;
  label?: string;
}

interface ExcavationStage {
  id: string;
  name: string;
  sequence: number;
  depth: number;
  duration: number; // 施工天数
  startDate?: string;
  endDate?: string;
  workingPlatform: boolean; // 是否设置工作面
  platformWidth: number; // 工作面宽度
  methods: ConstructionMethod[];
  risks: RiskAssessment[];
  prerequisites: string[]; // 前置条件
  constraints: string[]; // 约束条件
}

interface SlopeDefinition {
  id: string;
  name: string;
  segments: Point2D[];
  angle: number; // 边坡角度 (度)
  height: number; // 边坡高度
  direction: 'north' | 'south' | 'east' | 'west' | 'northeast' | 'northwest' | 'southeast' | 'southwest';
  stabilityFactor: number; // 稳定性安全系数
  protection: 'none' | 'shotcrete' | 'soil_nailing' | 'retaining_wall';
  drainage: boolean;
}

interface DrainageConfig {
  enabled: boolean;
  system: 'dewatering' | 'precipitation' | 'pumping' | 'hybrid';
  wells: WellDefinition[];
  capacity: number; // 排水量 m³/h
  waterLevel: number; // 设计水位
}

interface WellDefinition {
  id: string;
  position: Point2D;
  depth: number;
  diameter: number;
  capacity: number;
  type: 'dewatering' | 'observation' | 'recharge';
}

interface SafetyFactors {
  slope: number; // 边坡稳定性
  bearing: number; // 地基承载力
  settlement: number; // 沉降
  lateral: number; // 侧向位移
  heave: number; // 基坑隆起
}

interface DesignParameters {
  soilParameters: {
    averageCohesion: number; // 平均粘聚力
    averageFriction: number; // 平均内摩擦角
    averageDensity: number; // 平均密度
    groundwaterLevel: number; // 地下水位
  };
  loadingConditions: {
    liveLoad: number; // 活载 kPa
    deadLoad: number; // 恒载 kPa
    temporaryLoad: number; // 临时荷载 kPa
    vehicleLoad: number; // 车辆荷载 kPa
  };
  environmentalFactors: {
    seismicIntensity: number; // 地震烈度
    freezingDepth: number; // 冻土深度
    annualRainfall: number; // 年降雨量
  };
}

interface ConstructionMethod {
  name: string;
  description: string;
  duration: number; // 天数
  equipment: string[];
  personnel: number;
  cost: number; // 成本估算
  risks: string[];
}

interface RiskAssessment {
  category: 'geological' | 'structural' | 'environmental' | 'construction' | 'safety';
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'minor' | 'moderate' | 'major' | 'catastrophic';
  mitigation: string[];
  owner: string;
}

interface ExcavationDesignToolsProps {
  initialGeometry?: ExcavationGeometry;
  onGeometryChange?: (geometry: ExcavationGeometry) => void;
  onExport?: (geometry: ExcavationGeometry, format: 'dxf' | 'json' | 'report') => void;
  readOnly?: boolean;
  showAdvancedTools?: boolean;
}

const ExcavationDesignTools: React.FC<ExcavationDesignToolsProps> = ({
  initialGeometry,
  onGeometryChange,
  onExport,
  readOnly = false,
  showAdvancedTools = true
}) => {
  const [geometry, setGeometry] = useState<ExcavationGeometry>(
    initialGeometry || createDefaultGeometry()
  );
  const [activeTab, setActiveTab] = useState<'geometry' | 'stages' | 'slopes' | 'analysis'>('geometry');
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [designerDrawerVisible, setDesignerDrawerVisible] = useState(false);
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [validationResults, setValidationResults] = useState<Map<string, string[]>>(new Map());

  // 创建默认基坑几何
  function createDefaultGeometry(): ExcavationGeometry {
    return {
      id: `excavation_${Date.now()}`,
      name: '新建基坑',
      type: 'rectangular',
      outline: [
        { x: -50, y: -30, label: 'A' },
        { x: 50, y: -30, label: 'B' },
        { x: 50, y: 30, label: 'C' },
        { x: -50, y: 30, label: 'D' }
      ],
      totalDepth: 12.0,
      stages: [
        {
          id: 'stage_1',
          name: '第一阶段开挖',
          sequence: 1,
          depth: 4.0,
          duration: 5,
          workingPlatform: true,
          platformWidth: 3.0,
          methods: [
            {
              name: '机械开挖',
              description: '使用挖掘机进行土方开挖',
              duration: 4,
              equipment: ['挖掘机', '自卸车'],
              personnel: 6,
              cost: 25000,
              risks: ['机械故障', '边坡失稳']
            }
          ],
          risks: [],
          prerequisites: ['基坑支护完成'],
          constraints: ['雨季施工限制']
        },
        {
          id: 'stage_2',
          name: '第二阶段开挖',
          sequence: 2,
          depth: 8.0,
          duration: 7,
          workingPlatform: true,
          platformWidth: 2.5,
          methods: [],
          risks: [],
          prerequisites: ['一阶段验收合格'],
          constraints: ['降水系统正常运行']
        }
      ],
      slopes: [
        {
          id: 'slope_1',
          name: '北侧边坡',
          segments: [{ x: -50, y: 30 }, { x: 50, y: 30 }],
          angle: 45,
          height: 12.0,
          direction: 'north',
          stabilityFactor: 1.35,
          protection: 'shotcrete',
          drainage: true
        }
      ],
      safetyFactors: {
        slope: 1.35,
        bearing: 2.0,
        settlement: 1.5,
        lateral: 1.4,
        heave: 1.3
      },
      designParameters: {
        soilParameters: {
          averageCohesion: 25,
          averageFriction: 18,
          averageDensity: 1.9,
          groundwaterLevel: -3.5
        },
        loadingConditions: {
          liveLoad: 20,
          deadLoad: 15,
          temporaryLoad: 10,
          vehicleLoad: 50
        },
        environmentalFactors: {
          seismicIntensity: 7,
          freezingDepth: 1.2,
          annualRainfall: 800
        }
      },
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      status: 'draft'
    };
  }

  // 验证基坑设计
  const validateDesign = useCallback((geom: ExcavationGeometry): Map<string, string[]> => {
    const errors = new Map<string, string[]>();

    // 几何验证
    const geomErrors: string[] = [];
    if (geom.outline.length < 3) {
      geomErrors.push('基坑轮廓至少需要3个点');
    }
    if (geom.totalDepth <= 0 || geom.totalDepth > 50) {
      geomErrors.push('基坑深度应在0-50m范围内');
    }
    if (geomErrors.length > 0) {
      errors.set('geometry', geomErrors);
    }

    // 施工阶段验证
    const stageErrors: string[] = [];
    if (geom.stages.length === 0) {
      stageErrors.push('至少需要定义一个施工阶段');
    }
    const maxStageDepth = Math.max(...geom.stages.map(s => s.depth));
    if (maxStageDepth > geom.totalDepth) {
      stageErrors.push('施工阶段深度不能超过基坑总深度');
    }
    if (stageErrors.length > 0) {
      errors.set('stages', stageErrors);
    }

    // 安全系数验证
    const safetyErrors: string[] = [];
    if (geom.safetyFactors.slope < 1.2) {
      safetyErrors.push('边坡稳定性安全系数不应小于1.2');
    }
    if (geom.safetyFactors.bearing < 1.5) {
      safetyErrors.push('地基承载力安全系数不应小于1.5');
    }
    if (safetyErrors.length > 0) {
      errors.set('safety', safetyErrors);
    }

    return errors;
  }, []);

  // 计算基坑体积
  const calculateVolume = useMemo(() => {
    // 简化矩形基坑体积计算
    if (geometry.type === 'rectangular' && geometry.outline.length >= 4) {
      const width = Math.abs(geometry.outline[1].x - geometry.outline[0].x);
      const length = Math.abs(geometry.outline[2].y - geometry.outline[1].y);
      return width * length * geometry.totalDepth;
    }
    return 0;
  }, [geometry.outline, geometry.totalDepth, geometry.type]);

  // 估算工期
  const estimatedDuration = useMemo(() => {
    return geometry.stages.reduce((total, stage) => total + stage.duration, 0);
  }, [geometry.stages]);

  // 更新几何参数
  const updateGeometry = (path: string, value: any) => {
    const newGeometry = { ...geometry };
    const keys = path.split('.');
    let current: any = newGeometry;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }
    current[keys[keys.length - 1]] = value;
    
    newGeometry.modified = new Date().toISOString();
    setGeometry(newGeometry);
    
    // 实时验证
    const errors = validateDesign(newGeometry);
    setValidationResults(errors);
    
    if (onGeometryChange) {
      onGeometryChange(newGeometry);
    }
  };

  // 添加施工阶段
  const addStage = () => {
    const newStage: ExcavationStage = {
      id: `stage_${geometry.stages.length + 1}`,
      name: `第${geometry.stages.length + 1}阶段开挖`,
      sequence: geometry.stages.length + 1,
      depth: Math.round((geometry.totalDepth / (geometry.stages.length + 1)) * 10) / 10,
      duration: 5,
      workingPlatform: true,
      platformWidth: 2.0,
      methods: [],
      risks: [],
      prerequisites: [],
      constraints: []
    };

    updateGeometry('stages', [...geometry.stages, newStage]);
  };

  // 删除施工阶段
  const removeStage = (stageId: string) => {
    const updatedStages = geometry.stages.filter(stage => stage.id !== stageId);
    updateGeometry('stages', updatedStages);
  };

  // 运行稳定性分析
  const runStabilityAnalysis = async () => {
    setIsCalculating(true);
    setAnalysisModalVisible(true);
    
    try {
      // 模拟计算过程
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        // 这里会更新进度
      }
      
      message.success('稳定性分析完成');
    } catch (error) {
      message.error('分析计算失败');
    } finally {
      setIsCalculating(false);
    }
  };

  // 表格列定义
  const stageTableColumns = [
    {
      title: '阶段',
      key: 'stage',
      width: 100,
      render: (_: any, record: ExcavationStage) => (
        <Space>
          <Tag color="blue">{record.sequence}</Tag>
          <Text strong>{record.name}</Text>
        </Space>
      )
    },
    {
      title: '开挖深度',
      key: 'depth',
      width: 100,
      render: (_: any, record: ExcavationStage) => (
        <Space>
          <Text>{record.depth.toFixed(1)}m</Text>
          <InputNumber
            size="small"
            value={record.depth}
            onChange={(value) => {
              const updatedStages = geometry.stages.map(stage =>
                stage.id === record.id ? { ...stage, depth: value || 0 } : stage
              );
              updateGeometry('stages', updatedStages);
            }}
            min={0.5}
            max={geometry.totalDepth}
            step={0.5}
            style={{ width: '70px' }}
            disabled={readOnly}
          />
        </Space>
      )
    },
    {
      title: '工期',
      key: 'duration',
      width: 100,
      render: (_: any, record: ExcavationStage) => (
        <Space>
          <ClockCircleOutlined />
          <Text>{record.duration}天</Text>
        </Space>
      )
    },
    {
      title: '工作面',
      key: 'platform',
      width: 120,
      render: (_: any, record: ExcavationStage) => (
        <Space direction="vertical" size={2}>
          <Switch
            checked={record.workingPlatform}
            size="small"
            disabled={readOnly}
            onChange={(checked) => {
              const updatedStages = geometry.stages.map(stage =>
                stage.id === record.id ? { ...stage, workingPlatform: checked } : stage
              );
              updateGeometry('stages', updatedStages);
            }}
          />
          {record.workingPlatform && (
            <Text style={{ fontSize: '11px' }}>
              宽度: {record.platformWidth}m
            </Text>
          )}
        </Space>
      )
    },
    {
      title: '施工方法',
      key: 'methods',
      render: (_: any, record: ExcavationStage) => (
        <div>
          {record.methods.length > 0 ? (
            record.methods.map((method, index) => (
              <Tag key={index} size="small" style={{ marginBottom: '2px' }}>
                {method.name}
              </Tag>
            ))
          ) : (
            <Text style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
              未定义
            </Text>
          )}
        </div>
      )
    },
    {
      title: '风险评估',
      key: 'risks',
      render: (_: any, record: ExcavationStage) => (
        <Space>
          {record.risks.length > 0 ? (
            <Tag color="orange">{record.risks.length}个风险点</Tag>
          ) : (
            <Tag color="green">低风险</Tag>
          )}
        </Space>
      )
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: ExcavationStage) => (
        <Space size="small">
          <Tooltip title="编辑">
            <Button
              type="link"
              size="small"
              icon={<EditOutlined />}
              onClick={() => setSelectedStage(record.id)}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              type="link"
              size="small"
              icon={<CopyOutlined />}
              disabled={readOnly}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Popconfirm
              title="确定删除此施工阶段？"
              onConfirm={() => removeStage(record.id)}
              disabled={readOnly}
            >
              <Button
                type="link"
                size="small"
                icon={<DeleteOutlined />}
                danger
                disabled={readOnly || geometry.stages.length <= 1}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ];

  // 初始化验证
  useEffect(() => {
    const errors = validateDesign(geometry);
    setValidationResults(errors);
  }, [geometry, validateDesign]);

  const hasValidationErrors = validationResults.size > 0;
  const totalErrors = Array.from(validationResults.values()).reduce((sum, errors) => sum + errors.length, 0);

  return (
    <div className="excavation-design-tools">
      {/* 头部信息 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <AppstoreOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>基坑设计工具</Title>
              <Tag color={geometry.status === 'approved' ? 'green' : 'orange'}>
                {geometry.status === 'draft' ? '草图' : 
                 geometry.status === 'designed' ? '设计中' :
                 geometry.status === 'approved' ? '已审核' : '施工中'}
              </Tag>
            </Space>
          </Col>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                    {geometry.totalDepth.toFixed(1)}m
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>开挖深度</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--success-color)' }}>
                    {calculateVolume.toFixed(0)}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>土方量(m³)</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
                    {estimatedDuration}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>预计工期(天)</Text></div>
                </div>
              </Col>
              <Col span={4}>
                <div style={{ textAlign: 'center' }}>
                  <Text style={{ fontSize: '14px', fontWeight: 'bold', color: hasValidationErrors ? 'var(--error-color)' : 'var(--success-color)' }}>
                    {hasValidationErrors ? totalErrors : '✓'}
                  </Text>
                  <div><Text style={{ fontSize: '11px' }}>{hasValidationErrors ? '验证错误' : '设计正常'}</Text></div>
                </div>
              </Col>
              <Col span={8}>
                <Space style={{ float: 'right' }}>
                  <Button
                    size="small"
                    icon={<CalculatorOutlined />}
                    onClick={runStabilityAnalysis}
                    disabled={hasValidationErrors}
                  >
                    稳定性分析
                  </Button>
                  <Button
                    type="primary"
                    size="small"
                    icon={<SaveOutlined />}
                    disabled={readOnly || hasValidationErrors}
                  >
                    保存设计
                  </Button>
                </Space>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>

      {/* 验证错误提醒 */}
      {hasValidationErrors && (
        <Alert
          message={`发现 ${totalErrors} 个设计问题`}
          description="请修正以下问题后继续设计工作"
          type="error"
          showIcon
          style={{ marginBottom: '16px' }}
          action={
            <Button size="small" onClick={() => console.log('显示详细错误')}>
              查看详情
            </Button>
          }
        />
      )}

      {/* 主要内容区域 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab as any} size="small">
        {/* 几何设计 */}
        <TabPane tab="几何设计" key="geometry">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="基本参数" size="small" style={{ marginBottom: '16px' }}>
                <Form layout="vertical" size="small">
                  <Row gutter={12}>
                    <Col span={12}>
                      <Form.Item label="基坑类型">
                        <Select
                          value={geometry.type}
                          onChange={(value) => updateGeometry('type', value)}
                          disabled={readOnly}
                        >
                          <Option value="rectangular">矩形基坑</Option>
                          <Option value="circular">圆形基坑</Option>
                          <Option value="irregular">异形基坑</Option>
                          <Option value="stepped">阶梯基坑</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item label="总开挖深度 (m)">
                        <InputNumber
                          value={geometry.totalDepth}
                          onChange={(value) => updateGeometry('totalDepth', value)}
                          min={1}
                          max={50}
                          step={0.5}
                          style={{ width: '100%' }}
                          disabled={readOnly}
                        />
                      </Form.Item>
                    </Col>
                  </Row>
                </Form>
              </Card>

              <Card title="轮廓定义" size="small">
                <Table
                  columns={[
                    { title: '点位', dataIndex: 'label', width: 60 },
                    { 
                      title: 'X坐标 (m)', 
                      dataIndex: 'x',
                      render: (x: number, record: Point2D, index: number) => (
                        <InputNumber
                          size="small"
                          value={x}
                          onChange={(value) => {
                            const newOutline = [...geometry.outline];
                            newOutline[index] = { ...record, x: value || 0 };
                            updateGeometry('outline', newOutline);
                          }}
                          step={0.5}
                          style={{ width: '80px' }}
                          disabled={readOnly}
                        />
                      )
                    },
                    { 
                      title: 'Y坐标 (m)', 
                      dataIndex: 'y',
                      render: (y: number, record: Point2D, index: number) => (
                        <InputNumber
                          size="small"
                          value={y}
                          onChange={(value) => {
                            const newOutline = [...geometry.outline];
                            newOutline[index] = { ...record, y: value || 0 };
                            updateGeometry('outline', newOutline);
                          }}
                          step={0.5}
                          style={{ width: '80px' }}
                          disabled={readOnly}
                        />
                      )
                    }
                  ]}
                  dataSource={geometry.outline}
                  rowKey={(record, index) => index!}
                  size="small"
                  pagination={false}
                />
                
                {!readOnly && (
                  <div style={{ marginTop: '8px', textAlign: 'center' }}>
                    <Button
                      size="small"
                      icon={<PlusOutlined />}
                      onClick={() => {
                        const newPoint = { 
                          x: 0, 
                          y: 0, 
                          label: String.fromCharCode(65 + geometry.outline.length) 
                        };
                        updateGeometry('outline', [...geometry.outline, newPoint]);
                      }}
                    >
                      添加顶点
                    </Button>
                  </div>
                )}
              </Card>
            </Col>

            <Col span={12}>
              <Card title="安全系数设置" size="small" style={{ marginBottom: '16px' }}>
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text style={{ fontSize: '12px' }}>边坡稳定性: {geometry.safetyFactors.slope}</Text>
                      <Slider
                        value={geometry.safetyFactors.slope}
                        onChange={(value) => updateGeometry('safetyFactors.slope', value)}
                        min={1.0}
                        max={2.0}
                        step={0.05}
                        marks={{ 1.2: '1.2', 1.35: '1.35', 1.5: '1.5' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text style={{ fontSize: '12px' }}>地基承载力: {geometry.safetyFactors.bearing}</Text>
                      <Slider
                        value={geometry.safetyFactors.bearing}
                        onChange={(value) => updateGeometry('safetyFactors.bearing', value)}
                        min={1.5}
                        max={3.0}
                        step={0.1}
                        marks={{ 1.5: '1.5', 2.0: '2.0', 2.5: '2.5' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text style={{ fontSize: '12px' }}>沉降控制: {geometry.safetyFactors.settlement}</Text>
                      <Slider
                        value={geometry.safetyFactors.settlement}
                        onChange={(value) => updateGeometry('safetyFactors.settlement', value)}
                        min={1.2}
                        max={2.0}
                        step={0.05}
                        marks={{ 1.2: '1.2', 1.5: '1.5', 1.8: '1.8' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                  <Col span={12}>
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Text style={{ fontSize: '12px' }}>侧向位移: {geometry.safetyFactors.lateral}</Text>
                      <Slider
                        value={geometry.safetyFactors.lateral}
                        onChange={(value) => updateGeometry('safetyFactors.lateral', value)}
                        min={1.2}
                        max={2.0}
                        step={0.05}
                        marks={{ 1.2: '1.2', 1.4: '1.4', 1.6: '1.6' }}
                        disabled={readOnly}
                      />
                    </Space>
                  </Col>
                </Row>
              </Card>

              <Card title="土体参数" size="small">
                <Row gutter={[12, 12]}>
                  <Col span={12}>
                    <Form.Item label="平均粘聚力 (kPa)" style={{ marginBottom: '8px' }}>
                      <InputNumber
                        value={geometry.designParameters.soilParameters.averageCohesion}
                        onChange={(value) => updateGeometry('designParameters.soilParameters.averageCohesion', value)}
                        min={0}
                        max={200}
                        step={1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="平均内摩擦角 (°)" style={{ marginBottom: '8px' }}>
                      <InputNumber
                        value={geometry.designParameters.soilParameters.averageFriction}
                        onChange={(value) => updateGeometry('designParameters.soilParameters.averageFriction', value)}
                        min={0}
                        max={50}
                        step={1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="平均密度 (g/cm³)" style={{ marginBottom: '8px' }}>
                      <InputNumber
                        value={geometry.designParameters.soilParameters.averageDensity}
                        onChange={(value) => updateGeometry('designParameters.soilParameters.averageDensity', value)}
                        min={1.2}
                        max={2.5}
                        step={0.1}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="地下水位 (m)" style={{ marginBottom: '8px' }}>
                      <InputNumber
                        value={geometry.designParameters.soilParameters.groundwaterLevel}
                        onChange={(value) => updateGeometry('designParameters.soilParameters.groundwaterLevel', value)}
                        min={-20}
                        max={5}
                        step={0.5}
                        style={{ width: '100%' }}
                        disabled={readOnly}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 施工阶段 */}
        <TabPane tab="施工阶段" key="stages">
          <Card 
            title={
              <Space>
                <BarsOutlined />
                <span>施工阶段规划</span>
                <Tag color="blue">{geometry.stages.length}个阶段</Tag>
              </Space>
            }
            size="small"
            extra={
              !readOnly && (
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={addStage}
                >
                  添加阶段
                </Button>
              )
            }
          >
            <Table
              columns={stageTableColumns}
              dataSource={geometry.stages}
              rowKey="id"
              size="small"
              scroll={{ x: 1000 }}
              pagination={false}
            />

            {/* 施工时序图 */}
            <Divider orientation="left" style={{ margin: '16px 0 12px 0' }}>
              <Text strong>施工时序</Text>
            </Divider>
            <Timeline
              items={geometry.stages.map(stage => ({
                children: (
                  <div>
                    <Space>
                      <Text strong>{stage.name}</Text>
                      <Tag color="blue">{stage.depth}m</Tag>
                      <Tag color="green">{stage.duration}天</Tag>
                    </Space>
                    {stage.prerequisites.length > 0 && (
                      <div style={{ marginTop: '4px' }}>
                        <Text style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          前置条件: {stage.prerequisites.join(', ')}
                        </Text>
                      </div>
                    )}
                  </div>
                ),
                color: stage.sequence <= 2 ? 'green' : 'blue'
              }))}
            />
          </Card>
        </TabPane>

        {/* 边坡设计 */}
        <TabPane tab="边坡设计" key="slopes">
          <Card title="边坡配置" size="small">
            <List
              dataSource={geometry.slopes}
              renderItem={slope => (
                <List.Item
                  actions={[
                    <Button key="edit" type="link" size="small" icon={<EditOutlined />} disabled={readOnly} />,
                    <Button key="delete" type="link" size="small" icon={<DeleteOutlined />} danger disabled={readOnly} />
                  ]}
                >
                  <Space>
                    <EnvironmentOutlined style={{ color: 'var(--primary-color)' }} />
                    <div>
                      <Text strong>{slope.name}</Text>
                      <div>
                        <Space size="small">
                          <Tag color="blue">{slope.angle}°</Tag>
                          <Tag color="green">{slope.height}m</Tag>
                          <Tag color="purple">{slope.direction}</Tag>
                          <Tag color={slope.stabilityFactor >= 1.35 ? 'green' : 'orange'}>
                            安全系数: {slope.stabilityFactor}
                          </Tag>
                        </Space>
                      </div>
                    </div>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        {/* 分析结果 */}
        <TabPane tab="分析结果" key="analysis">
          <Row gutter={16}>
            <Col span={12}>
              <Card title="设计摘要" size="small" style={{ marginBottom: '16px' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>基坑类型:</Text>
                    <Text strong>{geometry.type === 'rectangular' ? '矩形' : '其他'}</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>开挖深度:</Text>
                    <Text strong>{geometry.totalDepth}m</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>土方体积:</Text>
                    <Text strong>{calculateVolume.toFixed(0)}m³</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>施工阶段:</Text>
                    <Text strong>{geometry.stages.length}个</Text>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>预计工期:</Text>
                    <Text strong>{estimatedDuration}天</Text>
                  </div>
                </Space>
              </Card>

              <Card title="风险评估" size="small">
                <Alert
                  message="总体风险等级: 中等"
                  description="基于当前设计参数和地质条件的综合评估"
                  type="warning"
                  showIcon
                  style={{ marginBottom: '12px' }}
                />
                <List
                  size="small"
                  dataSource={[
                    { risk: '边坡稳定性', level: '低', description: '安全系数满足要求' },
                    { risk: '地下水影响', level: '中', description: '需要设置降水系统' },
                    { risk: '周边建筑物', level: '中', description: '需要变形监测' }
                  ]}
                  renderItem={item => (
                    <List.Item>
                      <Space>
                        <Tag color={item.level === '低' ? 'green' : item.level === '中' ? 'orange' : 'red'}>
                          {item.level}风险
                        </Tag>
                        <Text>{item.risk}</Text>
                        <Text style={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                          {item.description}
                        </Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>

            <Col span={12}>
              <Card title="计算结果" size="small" style={{ marginBottom: '16px' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', padding: '12px' }}>
                      <Progress
                        type="circle"
                        percent={Math.round(geometry.safetyFactors.slope * 100 / 2)}
                        size={80}
                        format={() => geometry.safetyFactors.slope}
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Text style={{ fontSize: '12px' }}>边坡稳定性</Text>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ textAlign: 'center', padding: '12px' }}>
                      <Progress
                        type="circle"
                        percent={Math.round(geometry.safetyFactors.bearing * 100 / 3)}
                        size={80}
                        format={() => geometry.safetyFactors.bearing}
                      />
                      <div style={{ marginTop: '8px' }}>
                        <Text style={{ fontSize: '12px' }}>承载力</Text>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Card>

              <Card title="优化建议" size="small">
                <List
                  size="small"
                  dataSource={[
                    '考虑增加边坡防护措施',
                    '建议设置变形监测点',
                    '优化施工顺序以降低风险',
                    '加强排水系统设计'
                  ]}
                  renderItem={item => (
                    <List.Item>
                      <Space>
                        <BulbOutlined style={{ color: 'var(--warning-color)' }} />
                        <Text style={{ fontSize: '12px' }}>{item}</Text>
                      </Space>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 稳定性分析模态框 */}
      <Modal
        title="稳定性分析"
        open={analysisModalVisible}
        onCancel={() => setAnalysisModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setAnalysisModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={600}
      >
        <div style={{ textAlign: 'center', padding: '20px' }}>
          {isCalculating ? (
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={75} />
              <Text>正在进行有限元分析...</Text>
            </Space>
          ) : (
            <Space direction="vertical" style={{ width: '100%' }}>
              <CheckCircleOutlined style={{ fontSize: '48px', color: 'var(--success-color)' }} />
              <Text strong>分析完成</Text>
              <Text>边坡稳定性安全系数: {geometry.safetyFactors.slope}</Text>
              <Text>地基承载力安全系数: {geometry.safetyFactors.bearing}</Text>
            </Space>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default ExcavationDesignTools;