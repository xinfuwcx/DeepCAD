import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Steps, Button, Form, InputNumber, Select, Space,
  Table, Alert, Progress, Tag, Drawer, Tabs, Typography, Divider,
  Input, Switch, Collapse, Timeline, Statistic
} from 'antd';
import {
  ExperimentOutlined, SettingOutlined, PlayCircleOutlined,
  CheckCircleOutlined, WarningOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined, SafetyCertificateOutlined
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, BarChart, Bar
} from 'recharts';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface Material {
  name: string;
  type: 'soil' | 'concrete' | 'steel';
  properties: Record<string, number>;
}

interface ExcavationStage {
  stageName: string;
  excavationDepth: number;
  supportElements: Array<{
    type: string;
    properties: Record<string, any>;
  }>;
}

interface AnalysisResults {
  success: boolean;
  results?: {
    analysis_summary: {
      total_stages: number;
      max_displacement_mm: number;
      max_stress_mpa: number;
      min_safety_factor: number;
      analysis_status: string;
    };
    stage_by_stage_results: Array<{
      stage_name: string;
      excavation_depth: number;
      max_displacement: number;
      max_stress: number;
      safety_factor: number;
      convergence: boolean;
    }>;
    engineering_assessment: {
      displacement_status: string;
      stability_status: string;
      overall_safety: string;
      risk_level: string;
    };
    recommendations: string[];
  };
  error?: string;
}

const GeotechnicalAnalysisPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [excavationStages, setExcavationStages] = useState<ExcavationStage[]>([]);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedStage, setSelectedStage] = useState<number>(0);

  useEffect(() => {
    // 初始化默认材料
    initializeDefaultMaterials();
    // 初始化默认开挖阶段
    initializeDefaultStages();
  }, []);

  const initializeDefaultMaterials = () => {
    const defaultMaterials: Material[] = [
      {
        name: 'Clay',
        type: 'soil',
        properties: {
          cohesion: 20000,
          friction_angle: 25,
          elastic_modulus: 10e6,
          poisson_ratio: 0.35,
          density: 1800,
          permeability: 1e-9
        }
      },
      {
        name: 'Sand',
        type: 'soil',
        properties: {
          cohesion: 0,
          friction_angle: 35,
          elastic_modulus: 25e6,
          poisson_ratio: 0.3,
          density: 1900,
          permeability: 1e-4
        }
      },
      {
        name: 'Concrete',
        type: 'concrete',
        properties: {
          elastic_modulus: 30e9,
          poisson_ratio: 0.2,
          density: 2400,
          tensile_strength: 3e6
        }
      }
    ];
    setMaterials(defaultMaterials);
  };

  const initializeDefaultStages = () => {
    const defaultStages: ExcavationStage[] = [
      {
        stageName: 'Stage1_Surface',
        excavationDepth: 2.0,
        supportElements: [
          { type: 'retaining_wall', properties: { thickness: 0.8, depth: 20.0 } }
        ]
      },
      {
        stageName: 'Stage2_FirstLevel',
        excavationDepth: 4.0,
        supportElements: [
          { type: 'strut_system', properties: { beam_size: '600x800', spacing: 3.0 } }
        ]
      },
      {
        stageName: 'Stage3_SecondLevel',
        excavationDepth: 6.0,
        supportElements: [
          { type: 'strut_system', properties: { beam_size: '600x800', spacing: 3.0 } }
        ]
      },
      {
        stageName: 'Stage4_Final',
        excavationDepth: 8.0,
        supportElements: [
          { type: 'anchor_system', properties: { capacity: 500000, angle: 15 } }
        ]
      }
    ];
    setExcavationStages(defaultStages);
  };

  const handleRunAnalysis = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockResults: AnalysisResults = {
        success: true,
        results: {
          analysis_summary: {
            total_stages: excavationStages.length,
            max_displacement_mm: 45.8,
            max_stress_mpa: 3.2,
            min_safety_factor: 2.1,
            analysis_status: 'completed'
          },
          stage_by_stage_results: excavationStages.map((stage, index) => ({
            stage_name: stage.stageName,
            excavation_depth: stage.excavationDepth,
            max_displacement: 0.01 * (index + 1) * Math.random() * 5,
            max_stress: 1e6 + Math.random() * 3e6,
            safety_factor: 1.8 + Math.random() * 1.2,
            convergence: true
          })),
          engineering_assessment: {
            displacement_status: 'warning',
            stability_status: 'safe',
            overall_safety: 'monitor_closely',
            risk_level: 'medium'
          },
          recommendations: [
            '变形较大，建议加强监测位移变化',
            '考虑增加支护刚度或调整开挖工序',
            '建立完善的监测系统，实时跟踪关键指标',
            '制定应急预案，确保施工安全',
            '定期检查支护结构完整性'
          ]
        }
      };
      
      setAnalysisResults(mockResults);
      setCurrentStep(3); // 跳转到结果页面
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const colors = {
      safe: '#52c41a',
      warning: '#faad14',
      critical: '#ff4d4f',
      acceptable: '#1890ff',
      monitor_closely: '#fa8c16',
      needs_attention: '#ff7875'
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  };

  const getRiskIcon = (level: string) => {
    if (level === 'low') return <SafetyCertificateOutlined style={{ color: '#52c41a' }} />;
    if (level === 'medium') return <WarningOutlined style={{ color: '#faad14' }} />;
    return <WarningOutlined style={{ color: '#ff4d4f' }} />;
  };

  const materialColumns = [
    {
      title: '材料名称',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: '材料类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'soil' ? 'orange' : type === 'concrete' ? 'blue' : 'green'}>
          {type === 'soil' ? '土体' : type === 'concrete' ? '混凝土' : '钢材'}
        </Tag>
      )
    },
    {
      title: '弹性模量 (Pa)',
      dataIndex: ['properties', 'elastic_modulus'],
      key: 'elastic_modulus',
      render: (value: number) => value?.toExponential(2)
    },
    {
      title: '泊松比',
      dataIndex: ['properties', 'poisson_ratio'],
      key: 'poisson_ratio'
    },
    {
      title: '密度 (kg/m³)',
      dataIndex: ['properties', 'density'],
      key: 'density'
    }
  ];

  const stageColumns = [
    {
      title: '阶段名称',
      dataIndex: 'stageName',
      key: 'stageName'
    },
    {
      title: '开挖深度 (m)',
      dataIndex: 'excavationDepth',
      key: 'excavationDepth'
    },
    {
      title: '支护类型',
      dataIndex: 'supportElements',
      key: 'supportElements',
      render: (elements: any[]) => (
        <Space>
          {elements.map((element, index) => (
            <Tag key={index}>
              {element.type === 'retaining_wall' ? '挡土墙' :
               element.type === 'strut_system' ? '支撑系统' :
               element.type === 'anchor_system' ? '锚杆系统' : element.type}
            </Tag>
          ))}
        </Space>
      )
    }
  ];

  const renderMaterialSetup = () => (
    <Card title="材料参数设置" size="small">
      <Table
        columns={materialColumns}
        dataSource={materials}
        rowKey="name"
        size="small"
        pagination={false}
      />
      <div style={{ marginTop: 16 }}>
        <Button type="dashed" block>
          添加新材料
        </Button>
      </div>
    </Card>
  );

  const renderExcavationStages = () => (
    <Card title="开挖阶段设计" size="small">
      <Table
        columns={stageColumns}
        dataSource={excavationStages}
        rowKey="stageName"
        size="small"
        pagination={false}
        onRow={(record, index) => ({
          onClick: () => {
            setSelectedStage(index || 0);
            setDrawerVisible(true);
          }
        })}
      />
      <div style={{ marginTop: 16 }}>
        <Button type="dashed" block>
          添加开挖阶段
        </Button>
      </div>
    </Card>
  );

  const renderAnalysisSettings = () => (
    <Card title="分析参数设置" size="small">
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="分析类型" name="analysisType" initialValue="staged_construction">
              <Select>
                <Option value="staged_construction">分阶段施工分析</Option>
                <Option value="consolidation">固结分析</Option>
                <Option value="dynamic">动力分析</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="地下水位 (m)" name="groundwaterLevel" initialValue={-2.0}>
              <InputNumber min={-50} max={0} step={0.5} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="位移收敛容差" name="dispTolerance" initialValue={1e-6}>
              <InputNumber min={1e-9} max={1e-3} step={1e-7} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="最大迭代次数" name="maxIterations" initialValue={50}>
              <InputNumber min={10} max={200} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="高级选项">
          <Collapse ghost>
            <Panel header="求解器设置" key="1">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="线性求解器" name="linearSolver" initialValue="amgcl">
                    <Select>
                      <Option value="amgcl">AMGCL</Option>
                      <Option value="skyline_lu">Skyline LU</Option>
                      <Option value="super_lu">Super LU</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="并行线程数" name="numThreads" initialValue={4}>
                    <InputNumber min={1} max={16} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          </Collapse>
        </Form.Item>
      </Form>
    </Card>
  );

  const renderResults = () => {
    if (!analysisResults?.results) return null;

    const { analysis_summary, stage_by_stage_results, engineering_assessment, recommendations } = analysisResults.results;

    // 生成图表数据
    const displacementData = stage_by_stage_results.map(stage => ({
      stage: stage.stage_name.replace('Stage', '阶段'),
      displacement: stage.max_displacement * 1000, // 转换为mm
      depth: stage.excavation_depth
    }));

    const safetyFactorData = stage_by_stage_results.map(stage => ({
      stage: stage.stage_name.replace('Stage', '阶段'),
      safety_factor: stage.safety_factor
    }));

    return (
      <div>
        {/* 分析概要 */}
        <Card title="分析结果概要" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="最大位移"
                value={analysis_summary.max_displacement_mm}
                suffix="mm"
                valueStyle={{ color: analysis_summary.max_displacement_mm > 30 ? '#ff4d4f' : '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最大应力"
                value={analysis_summary.max_stress_mpa}
                suffix="MPa"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最小安全系数"
                value={analysis_summary.min_safety_factor}
                precision={2}
                valueStyle={{ color: analysis_summary.min_safety_factor < 1.5 ? '#ff4d4f' : '#3f8600' }}
              />
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center' }}>
                <div>总体安全评估</div>
                <Tag 
                  color={getStatusColor(engineering_assessment.overall_safety)}
                  style={{ marginTop: 8, fontSize: 14, padding: '4px 8px' }}
                >
                  {engineering_assessment.overall_safety === 'monitor_closely' ? '需密切监控' :
                   engineering_assessment.overall_safety === 'needs_attention' ? '需要关注' :
                   engineering_assessment.overall_safety === 'acceptable' ? '可接受' : '安全'}
                </Tag>
              </div>
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          {/* 位移变化图 */}
          <Col span={12}>
            <Card title="各阶段位移变化" size="small">
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={displacementData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="displacement" 
                    stroke="#1890ff" 
                    fill="#1890ff" 
                    fillOpacity={0.3}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* 安全系数图 */}
          <Col span={12}>
            <Card title="各阶段安全系数" size="small">
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={safetyFactorData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="stage" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="safety_factor" fill="#52c41a" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 工程评估 */}
        <Card title="工程安全评估" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Alert
                message="位移状态"
                description={
                  <div>
                    <Tag color={getStatusColor(engineering_assessment.displacement_status)}>
                      {engineering_assessment.displacement_status === 'safe' ? '安全' :
                       engineering_assessment.displacement_status === 'warning' ? '警告' : '危险'}
                    </Tag>
                    <div style={{ marginTop: 8 }}>
                      当前最大位移: {analysis_summary.max_displacement_mm.toFixed(1)} mm
                    </div>
                  </div>
                }
                type={engineering_assessment.displacement_status === 'safe' ? 'success' : 
                     engineering_assessment.displacement_status === 'warning' ? 'warning' : 'error'}
                showIcon
              />
            </Col>
            <Col span={8}>
              <Alert
                message="稳定性状态"
                description={
                  <div>
                    <Tag color={getStatusColor(engineering_assessment.stability_status)}>
                      {engineering_assessment.stability_status === 'safe' ? '稳定' :
                       engineering_assessment.stability_status === 'warning' ? '需关注' : '不稳定'}
                    </Tag>
                    <div style={{ marginTop: 8 }}>
                      最小安全系数: {analysis_summary.min_safety_factor.toFixed(2)}
                    </div>
                  </div>
                }
                type={engineering_assessment.stability_status === 'safe' ? 'success' : 
                     engineering_assessment.stability_status === 'warning' ? 'warning' : 'error'}
                showIcon
              />
            </Col>
            <Col span={8}>
              <Alert
                message="风险等级"
                description={
                  <div>
                    <Space>
                      {getRiskIcon(engineering_assessment.risk_level)}
                      <Tag color={getStatusColor(engineering_assessment.risk_level)}>
                        {engineering_assessment.risk_level === 'low' ? '低风险' :
                         engineering_assessment.risk_level === 'medium' ? '中风险' : '高风险'}
                      </Tag>
                    </Space>
                  </div>
                }
                type={engineering_assessment.risk_level === 'low' ? 'success' : 
                     engineering_assessment.risk_level === 'medium' ? 'warning' : 'error'}
                showIcon
              />
            </Col>
          </Row>
        </Card>

        {/* 工程建议 */}
        <Card title="工程建议" style={{ marginTop: 16 }}>
          <Timeline>
            {recommendations.map((recommendation, index) => (
              <Timeline.Item key={index} color="blue">
                {recommendation}
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>
      </div>
    );
  };

  const steps = [
    {
      title: '材料定义',
      icon: <ExperimentOutlined />,
      content: renderMaterialSetup()
    },
    {
      title: '开挖设计',
      icon: <SettingOutlined />,
      content: renderExcavationStages()
    },
    {
      title: '分析设置',
      icon: <FileTextOutlined />,
      content: renderAnalysisSettings()
    },
    {
      title: '结果分析',
      icon: <BarChartOutlined />,
      content: renderResults()
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>地质力学分析系统</Title>
      <Paragraph type="secondary">
        基坑开挖工程的专业地质力学分析，包括分阶段施工模拟、支护结构设计验证和安全评估。
      </Paragraph>

      <Divider />

      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step
            key={index}
            title={step.title}
            icon={step.icon}
            onClick={() => setCurrentStep(index)}
            style={{ cursor: 'pointer' }}
          />
        ))}
      </Steps>

      <div style={{ minHeight: 500 }}>
        {steps[currentStep].content}
      </div>

      <div style={{ textAlign: 'center', marginTop: 24 }}>
        <Space>
          {currentStep > 0 && (
            <Button onClick={() => setCurrentStep(currentStep - 1)}>
              上一步
            </Button>
          )}
          
          {currentStep < steps.length - 1 && currentStep !== 2 && (
            <Button 
              type="primary" 
              onClick={() => setCurrentStep(currentStep + 1)}
            >
              下一步
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              loading={loading}
              onClick={handleRunAnalysis}
              size="large"
            >
              开始地质力学分析
            </Button>
          )}

          {currentStep === 3 && analysisResults && (
            <Space>
              <Button 
                icon={<FileTextOutlined />}
                onClick={() => {/* 导出报告 */}}
              >
                导出分析报告
              </Button>
              <Button 
                type="primary"
                onClick={() => setCurrentStep(0)}
              >
                新建分析
              </Button>
            </Space>
          )}
        </Space>
      </div>

      {/* 阶段详情抽屉 */}
      <Drawer
        title="开挖阶段详情"
        placement="right"
        size="large"
        onClose={() => setDrawerVisible(false)}
        visible={drawerVisible}
      >
        {excavationStages[selectedStage] && (
          <div>
            <Title level={4}>{excavationStages[selectedStage].stageName}</Title>
            <Paragraph>
              开挖深度: {excavationStages[selectedStage].excavationDepth} m
            </Paragraph>
            
            <Divider />
            
            <Title level={5}>支护结构</Title>
            {excavationStages[selectedStage].supportElements.map((element, index) => (
              <Card key={index} size="small" style={{ marginBottom: 8 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>
                    {element.type === 'retaining_wall' ? '挡土墙' :
                     element.type === 'strut_system' ? '支撑系统' :
                     element.type === 'anchor_system' ? '锚杆系统' : element.type}
                  </Text>
                  <div>
                    {Object.entries(element.properties).map(([key, value]) => (
                      <div key={key}>
                        {key}: {JSON.stringify(value)}
                      </div>
                    ))}
                  </div>
                </Space>
              </Card>
            ))}
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default GeotechnicalAnalysisPage;