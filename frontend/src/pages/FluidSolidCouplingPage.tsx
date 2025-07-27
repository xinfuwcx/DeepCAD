import React, { useState, useEffect } from 'react';
import {
  Card, Row, Col, Steps, Button, Form, InputNumber, Select, Space,
  Table, Alert, Progress, Tag, Drawer, Tabs, Typography, Divider,
  Input, Switch, Collapse, Timeline, Statistic, Slider
} from 'antd';
import {
  ExperimentOutlined, SettingOutlined, PlayCircleOutlined,
  CheckCircleOutlined, WarningOutlined, FileTextOutlined,
  BarChartOutlined, LineChartOutlined, DropboxOutlined as WaterOutlined,
  DeploymentUnitOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter,
  ComposedChart, Bar
} from 'recharts';

const { Step } = Steps;
const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { Panel } = Collapse;
const { TabPane } = Tabs;

interface FluidProperties {
  density: number;
  dynamic_viscosity: number;
  bulk_modulus: number;
  permeability_xx: number;
  permeability_yy: number;
  permeability_zz: number;
  porosity: number;
}

interface SolidProperties {
  young_modulus: number;
  poisson_ratio: number;
  density: number;
  cohesion: number;
  friction_angle: number;
  biot_coefficient: number;
}

interface CouplingParameters {
  coupling_type: string;
  time_step: number;
  total_time: number;
  convergence_tolerance: number;
  max_coupling_iterations: number;
  relaxation_factor: number;
}

interface CouplingResults {
  success: boolean;
  results?: {
    analysis_summary: {
      total_time_steps: number;
      max_displacement_mm: number;
      max_pressure_kpa: number;
      max_velocity_mm_s: number;
      final_seepage_rate_l_s: number;
      average_coupling_iterations: number;
      convergence_rate: number;
    };
    time_history_data: Array<{
      time: number;
      displacement: number;
      pressure: number;
      velocity: number;
      seepage_rate: number;
      coupling_iterations: number;
      converged: boolean;
    }>;
    coupling_performance: {
      total_coupling_iterations: number;
      max_coupling_iterations: number;
      convergence_failures: number;
    };
    engineering_assessment: {
      displacement_status: string;
      pressure_status: string;
      seepage_status: string;
      coupling_stability: string;
      overall_safety: string;
    };
    recommendations: string[];
  };
  error?: string;
}

const FluidSolidCouplingPage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [form] = Form.useForm();
  const [fluidProperties, setFluidProperties] = useState<FluidProperties>({
    density: 1000.0,
    dynamic_viscosity: 1e-3,
    bulk_modulus: 2.2e9,
    permeability_xx: 1e-10,
    permeability_yy: 1e-10,
    permeability_zz: 1e-10,
    porosity: 0.3
  });
  const [solidProperties, setSolidProperties] = useState<SolidProperties>({
    young_modulus: 25e6,
    poisson_ratio: 0.3,
    density: 1800.0,
    cohesion: 20000.0,
    friction_angle: 25.0,
    biot_coefficient: 1.0
  });
  const [couplingParams, setCouplingParams] = useState<CouplingParameters>({
    coupling_type: 'two_way',
    time_step: 0.1,
    total_time: 5.0,
    convergence_tolerance: 1e-6,
    max_coupling_iterations: 10,
    relaxation_factor: 0.7
  });
  
  const [analysisResults, setAnalysisResults] = useState<CouplingResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [selectedTimeStep, setSelectedTimeStep] = useState<number>(0);

  const handleRunCouplingAnalysis = async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const mockResults: CouplingResults = {
        success: true,
        results: {
          analysis_summary: {
            total_time_steps: 50,
            max_displacement_mm: 19.95,
            max_pressure_kpa: 35.84,
            max_velocity_mm_s: 0.0999,
            final_seepage_rate_l_s: 0.000616,
            average_coupling_iterations: 4.92,
            convergence_rate: 100.0
          },
          time_history_data: generateMockTimeHistory(50),
          coupling_performance: {
            total_coupling_iterations: 246,
            max_coupling_iterations: 7,
            convergence_failures: 0
          },
          engineering_assessment: {
            displacement_status: 'safe',
            pressure_status: 'safe', 
            seepage_status: 'safe',
            coupling_stability: 'stable',
            overall_safety: 'safe'
          },
          recommendations: [
            '流固耦合分析结果良好，系统稳定收敛',
            '建议监测渗流-变形耦合效应',
            '定期检查排水系统效果',
            '关注地下水位变化对稳定性的影响',
            '耦合迭代收敛性能良好，无需调整参数'
          ]
        }
      };
      
      setAnalysisResults(mockResults);
      setCurrentStep(3);
    } catch (error) {
      console.error('Coupling analysis failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockTimeHistory = (steps: number) => {
    return Array.from({ length: steps }, (_, i) => ({
      time: i * 0.1,
      displacement: 0.001 * (i + 1) / steps * Math.random() * 20,
      pressure: 40000 * (1 - i / steps) + Math.random() * 10000,
      velocity: Math.random() * 1e-4,
      seepage_rate: Math.random() * 1e-6,
      coupling_iterations: Math.floor(3 + Math.random() * 5),
      converged: Math.random() > 0.05
    }));
  };

  const getStatusColor = (status: string) => {
    const colors = {
      safe: '#52c41a',
      warning: '#faad14',
      critical: '#ff4d4f',
      stable: '#52c41a',
      unstable: '#ff4d4f'
    };
    return colors[status as keyof typeof colors] || '#d9d9d9';
  };

  const renderFluidProperties = () => (
    <Card title="流体属性设置" size="small">
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="密度 (kg/m³)">
              <InputNumber
                value={fluidProperties.density}
                onChange={(value) => setFluidProperties({...fluidProperties, density: value || 1000})}
                min={800}
                max={1200}
                step={10}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="动力粘度 (Pa·s)">
              <InputNumber
                value={fluidProperties.dynamic_viscosity}
                onChange={(value) => setFluidProperties({...fluidProperties, dynamic_viscosity: value || 1e-3})}
                min={1e-4}
                max={1e-2}
                step={1e-4}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="体积模量 (Pa)">
              <InputNumber
                value={fluidProperties.bulk_modulus}
                onChange={(value) => setFluidProperties({...fluidProperties, bulk_modulus: value || 2.2e9})}
                min={1e9}
                max={5e9}
                step={1e8}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="孔隙率">
              <Slider
                value={fluidProperties.porosity}
                onChange={(value) => setFluidProperties({...fluidProperties, porosity: value})}
                min={0.1}
                max={0.5}
                step={0.01}
                marks={{ 0.1: '0.1', 0.3: '0.3', 0.5: '0.5' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Divider orientation="left">渗透系数 (m/s)</Divider>
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="X方向">
              <InputNumber
                value={fluidProperties.permeability_xx}
                onChange={(value) => setFluidProperties({...fluidProperties, permeability_xx: value || 1e-10})}
                min={1e-12}
                max={1e-6}
                step={1e-11}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Y方向">
              <InputNumber
                value={fluidProperties.permeability_yy}
                onChange={(value) => setFluidProperties({...fluidProperties, permeability_yy: value || 1e-10})}
                min={1e-12}
                max={1e-6}
                step={1e-11}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="Z方向">
              <InputNumber
                value={fluidProperties.permeability_zz}
                onChange={(value) => setFluidProperties({...fluidProperties, permeability_zz: value || 1e-10})}
                min={1e-12}
                max={1e-6}
                step={1e-11}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  const renderSolidProperties = () => (
    <Card title="固体属性设置" size="small">
      <Form layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="弹性模量 (Pa)">
              <InputNumber
                value={solidProperties.young_modulus}
                onChange={(value) => setSolidProperties({...solidProperties, young_modulus: value || 25e6})}
                min={1e6}
                max={100e6}
                step={1e6}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="泊松比">
              <InputNumber
                value={solidProperties.poisson_ratio}
                onChange={(value) => setSolidProperties({...solidProperties, poisson_ratio: value || 0.3})}
                min={0.1}
                max={0.45}
                step={0.01}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="密度 (kg/m³)">
              <InputNumber
                value={solidProperties.density}
                onChange={(value) => setSolidProperties({...solidProperties, density: value || 1800})}
                min={1500}
                max={2500}
                step={50}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Biot系数">
              <InputNumber
                value={solidProperties.biot_coefficient}
                onChange={(value) => setSolidProperties({...solidProperties, biot_coefficient: value || 1.0})}
                min={0.1}
                max={1.0}
                step={0.1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="粘聚力 (Pa)">
              <InputNumber
                value={solidProperties.cohesion}
                onChange={(value) => setSolidProperties({...solidProperties, cohesion: value || 20000})}
                min={0}
                max={100000}
                step={1000}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="内摩擦角 (°)">
              <InputNumber
                value={solidProperties.friction_angle}
                onChange={(value) => setSolidProperties({...solidProperties, friction_angle: value || 25})}
                min={15}
                max={45}
                step={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  const renderCouplingSettings = () => (
    <Card title="耦合分析设置" size="small">
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="耦合类型" name="couplingType" initialValue="two_way">
              <Select
                value={couplingParams.coupling_type}
                onChange={(value) => setCouplingParams({...couplingParams, coupling_type: value})}
              >
                <Option value="one_way">单向耦合</Option>
                <Option value="two_way">双向耦合</Option>
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="时间步长 (s)">
              <InputNumber
                value={couplingParams.time_step}
                onChange={(value) => setCouplingParams({...couplingParams, time_step: value || 0.1})}
                min={0.001}
                max={1.0}
                step={0.001}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="总分析时间 (s)">
              <InputNumber
                value={couplingParams.total_time}
                onChange={(value) => setCouplingParams({...couplingParams, total_time: value || 5.0})}
                min={1.0}
                max={100.0}
                step={1.0}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="松弛因子">
              <Slider
                value={couplingParams.relaxation_factor}
                onChange={(value) => setCouplingParams({...couplingParams, relaxation_factor: value})}
                min={0.1}
                max={1.0}
                step={0.1}
                marks={{ 0.1: '0.1', 0.5: '0.5', 1.0: '1.0' }}
              />
            </Form.Item>
          </Col>
        </Row>
        
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="收敛容差">
              <InputNumber
                value={couplingParams.convergence_tolerance}
                onChange={(value) => setCouplingParams({...couplingParams, convergence_tolerance: value || 1e-6})}
                min={1e-8}
                max={1e-4}
                step={1e-7}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="最大耦合迭代次数">
              <InputNumber
                value={couplingParams.max_coupling_iterations}
                onChange={(value) => setCouplingParams({...couplingParams, max_coupling_iterations: value || 10})}
                min={5}
                max={50}
                step={1}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );

  const renderResults = () => {
    if (!analysisResults?.results) return null;

    const { analysis_summary, time_history_data, coupling_performance, engineering_assessment, recommendations } = analysisResults.results;

    // 生成图表数据
    const displacementTimeData = time_history_data.slice(0, 30).map(step => ({
      time: step.time,
      displacement: step.displacement * 1000,
      pressure: step.pressure / 1000
    }));

    const convergenceData = time_history_data.slice(0, 20).map(step => ({
      time: step.time,
      iterations: step.coupling_iterations,
      converged: step.converged ? 1 : 0
    }));

    return (
      <div>
        {/* 分析概要 */}
        <Card title="流固耦合分析结果概要" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="最大位移"
                value={analysis_summary.max_displacement_mm}
                suffix="mm"
                precision={2}
                valueStyle={{ color: analysis_summary.max_displacement_mm > 30 ? '#ff4d4f' : '#3f8600' }}
                prefix={<DeploymentUnitOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="最大压力"
                value={analysis_summary.max_pressure_kpa}
                suffix="kPa"
                precision={2}
                valueStyle={{ color: '#1890ff' }}
                prefix={<WaterOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="渗流速率"
                value={analysis_summary.final_seepage_rate_l_s}
                suffix="L/s"
                precision={6}
                valueStyle={{ color: '#722ed1' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="平均耦合迭代次数"
                value={analysis_summary.average_coupling_iterations}
                precision={1}
                valueStyle={{ color: '#fa8c16' }}
                prefix={<ThunderboltOutlined />}
              />
            </Col>
          </Row>
        </Card>

        <Row gutter={16}>
          {/* 位移-压力时程图 */}
          <Col span={12}>
            <Card title="位移-压力时程曲线" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={displacementTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Area 
                    yAxisId="left"
                    type="monotone" 
                    dataKey="displacement" 
                    stroke="#1890ff" 
                    fill="#1890ff" 
                    fillOpacity={0.3}
                    name="位移 (mm)"
                  />
                  <Line 
                    yAxisId="right"
                    type="monotone" 
                    dataKey="pressure" 
                    stroke="#ff7300" 
                    strokeWidth={2}
                    name="压力 (kPa)"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          {/* 耦合收敛性能 */}
          <Col span={12}>
            <Card title="耦合收敛性能" size="small">
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={convergenceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Bar 
                    yAxisId="left"
                    dataKey="iterations" 
                    fill="#52c41a" 
                    name="迭代次数"
                  />
                  <Line 
                    yAxisId="right"
                    type="step" 
                    dataKey="converged" 
                    stroke="#ff4d4f" 
                    strokeWidth={2}
                    name="收敛状态"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </Card>
          </Col>
        </Row>

        {/* 耦合性能统计 */}
        <Card title="耦合性能统计" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={8}>
              <Alert
                message="总耦合迭代次数"
                description={
                  <div>
                    <Text strong>{coupling_performance.total_coupling_iterations}</Text>
                    <div style={{ marginTop: 8 }}>
                      最大迭代次数: {coupling_performance.max_coupling_iterations}
                    </div>
                  </div>
                }
                type="info"
                showIcon
              />
            </Col>
            <Col span={8}>
              <Alert
                message="收敛率"
                description={
                  <div>
                    <Progress 
                      percent={analysis_summary.convergence_rate} 
                      status={analysis_summary.convergence_rate > 95 ? "success" : "active"}
                    />
                    <div style={{ marginTop: 8 }}>
                      收敛失败次数: {coupling_performance.convergence_failures}
                    </div>
                  </div>
                }
                type={analysis_summary.convergence_rate > 95 ? "success" : "warning"}
                showIcon
              />
            </Col>
            <Col span={8}>
              <Alert
                message="耦合稳定性"
                description={
                  <div>
                    <Tag color={getStatusColor(engineering_assessment.coupling_stability)}>
                      {engineering_assessment.coupling_stability === 'stable' ? '稳定' : '不稳定'}
                    </Tag>
                    <div style={{ marginTop: 8 }}>
                      总体安全评估: {engineering_assessment.overall_safety === 'safe' ? '安全' : '需要关注'}
                    </div>
                  </div>
                }
                type={engineering_assessment.coupling_stability === 'stable' ? 'success' : 'error'}
                showIcon
              />
            </Col>
          </Row>
        </Card>

        {/* 工程建议 */}
        <Card title="耦合分析建议" style={{ marginTop: 16 }}>
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
      title: '流体属性',
      icon: <WaterOutlined />,
      content: renderFluidProperties()
    },
    {
      title: '固体属性',
      icon: <ExperimentOutlined />,
      content: renderSolidProperties()
    },
    {
      title: '耦合设置',
      icon: <SettingOutlined />,
      content: renderCouplingSettings()
    },
    {
      title: '耦合结果',
      icon: <BarChartOutlined />,
      content: renderResults()
    }
  ];

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>流固耦合分析系统</Title>
      <Paragraph type="secondary">
        基坑开挖中的渗流-变形耦合分析，考虑孔隙水压力与土体变形的相互作用机制。
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
              onClick={handleRunCouplingAnalysis}
              size="large"
            >
              开始流固耦合分析
            </Button>
          )}

          {currentStep === 3 && analysisResults && (
            <Space>
              <Button 
                icon={<FileTextOutlined />}
                onClick={() => {/* 导出报告 */}}
              >
                导出耦合分析报告
              </Button>
              <Button 
                type="primary"
                onClick={() => setCurrentStep(0)}
              >
                新建耦合分析
              </Button>
            </Space>
          )}
        </Space>
      </div>
    </div>
  );
};

export default FluidSolidCouplingPage;