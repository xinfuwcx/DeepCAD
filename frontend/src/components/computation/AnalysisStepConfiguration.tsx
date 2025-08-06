/**
 * 分析步参数配置界面
 * 专为深基坑工程优化的分析步设置组件
 */

import React, { useState, useCallback } from 'react';
import {
  Card, Row, Col, Form, Select, InputNumber, Switch, Slider, Button, Space, 
  Typography, Collapse, Alert, Progress, Tooltip, Divider
} from 'antd';
import {
  CalculatorOutlined, SettingOutlined, ThunderboltOutlined, 
  ExperimentOutlined, MonitorOutlined, PlayCircleOutlined,
  PauseCircleOutlined, StopOutlined, InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

// 分析步参数接口定义
interface AnalysisStepParams {
  // 基础分析参数
  analysis_type: 'static' | 'seepage' | 'coupled';
  load_application: 'staged' | 'instantaneous' | 'time_dependent';
  
  // 求解器设置
  solver_type: 'direct' | 'iterative';
  max_iterations: number;
  convergence_tolerance: number;
  
  // 施工过程参数
  construction_stages: number;
  stage_duration: number;
  
  // 深基坑专用参数
  excavation_method: 'top_down' | 'bottom_up' | 'basin' | 'mixed';
  excavation_sequence: 'symmetric' | 'asymmetric' | 'staged';
  excavation_rate: number;
  
  support_activation: 'immediate' | 'delayed' | 'progressive';
  support_prestress: boolean;
  stiffness_development: boolean;
  
  // 地下水控制
  dewatering_enabled: boolean;
  seepage_coupling: boolean;
  water_drawdown_rate: number;
  
  // 基础物理设置
  enable_gravity: boolean;
  enable_initial_stress: boolean;
  geometric_nonlinearity: boolean;
  material_nonlinearity: boolean;
}

// 计算状态接口
interface ComputationStatus {
  isRunning: boolean;
  currentStage: number;
  totalStages: number;
  progress: number;
  currentIteration: number;
  residual: number;
  estimatedTime: string;
  memoryUsage: string;
}

interface AnalysisStepConfigurationProps {
  onParametersChange?: (params: AnalysisStepParams) => void;
  onStartAnalysis?: (params: AnalysisStepParams) => void;
  onPauseAnalysis?: () => void;
  onStopAnalysis?: () => void;
  computationStatus?: ComputationStatus;
}

const AnalysisStepConfiguration: React.FC<AnalysisStepConfigurationProps> = ({
  onParametersChange,
  onStartAnalysis,
  onPauseAnalysis,
  onStopAnalysis,
  computationStatus
}) => {
  const [form] = Form.useForm();
  const [activePanel, setActivePanel] = useState<string | string[]>(['basic']);
  
  // 默认参数设置
  const [params, setParams] = useState<AnalysisStepParams>({
    analysis_type: 'static',
    load_application: 'staged',
    solver_type: 'direct',
    max_iterations: 50,
    convergence_tolerance: 1e-6,
    construction_stages: 8,
    stage_duration: 7,
    excavation_method: 'top_down',
    excavation_sequence: 'symmetric',
    excavation_rate: 1.0,
    support_activation: 'immediate',
    support_prestress: true,
    stiffness_development: true,
    dewatering_enabled: true,
    seepage_coupling: true,
    water_drawdown_rate: 0.5,
    enable_gravity: true,
    enable_initial_stress: true,
    geometric_nonlinearity: true,
    material_nonlinearity: false
  });

  // 更新参数
  const updateParams = useCallback((newParams: Partial<AnalysisStepParams>) => {
    const updatedParams = { ...params, ...newParams };
    setParams(updatedParams);
    onParametersChange?.(updatedParams);
  }, [params, onParametersChange]);

  // 处理表单值变化
  const handleFormChange = useCallback((changedFields: any, allFields: any) => {
    const newValues = form.getFieldsValue();
    updateParams(newValues);
  }, [form, updateParams]);

  // 启动分析
  const handleStartAnalysis = useCallback(() => {
    onStartAnalysis?.(params);
  }, [params, onStartAnalysis]);

  // 获取参数验证状态
  const getValidationStatus = () => {
    if (params.max_iterations < 10) return { status: 'warning', message: '迭代次数可能过少' };
    if (params.convergence_tolerance > 1e-3) return { status: 'warning', message: '收敛容差可能过大' };
    if (params.construction_stages > 20) return { status: 'warning', message: '施工阶段数较多，计算时间会较长' };
    return { status: 'success', message: '参数设置合理' };
  };

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
      {/* 标题和状态 */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col span={18}>
          <Title level={4} style={{ margin: 0, color: '#1890ff' }}>
            <CalculatorOutlined /> 分析步参数配置
          </Title>
        </Col>
        <Col span={6} style={{ textAlign: 'right' }}>
          <Space>
            <Button 
              type="primary" 
              icon={<PlayCircleOutlined />}
              onClick={handleStartAnalysis}
              disabled={computationStatus?.isRunning}
            >
              开始分析
            </Button>
            {computationStatus?.isRunning && (
              <>
                <Button 
                  icon={<PauseCircleOutlined />}
                  onClick={onPauseAnalysis}
                >
                  暂停
                </Button>
                <Button 
                  icon={<StopOutlined />}
                  onClick={onStopAnalysis}
                  danger
                >
                  停止
                </Button>
              </>
            )}
          </Space>
        </Col>
      </Row>

      {/* 参数验证提示 */}
      <Alert
        type={getValidationStatus().status as any}
        message={getValidationStatus().message}
        style={{ marginBottom: '16px' }}
        showIcon
      />

      {/* 计算状态监控 */}
      {computationStatus?.isRunning && (
        <Card size="small" style={{ marginBottom: '16px', background: '#f6ffed' }}>
          <Row gutter={16} align="middle">
            <Col span={12}>
              <Text strong>当前阶段: 第{computationStatus.currentStage}/{computationStatus.totalStages}阶段</Text>
              <br />
              <Text type="secondary">迭代: {computationStatus.currentIteration}/{params.max_iterations}</Text>
            </Col>
            <Col span={12}>
              <Progress 
                percent={computationStatus.progress} 
                size="small"
                format={percent => `${percent}%`}
              />
              <Text type="secondary">
                残差: {computationStatus.residual.toExponential(2)} | 
                剩余: {computationStatus.estimatedTime}
              </Text>
            </Col>
          </Row>
        </Card>
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={params}
        onFieldsChange={handleFormChange}
        size="small"
      >
        <Collapse 
          activeKey={activePanel}
          onChange={setActivePanel}
          ghost
        >
          {/* 基础参数面板 */}
          <Panel 
            header={
              <Text strong style={{ color: '#52c41a' }}>
                🟢 基础分析设置
              </Text>
            } 
            key="basic"
          >
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="分析类型" 
                  name="analysis_type"
                  tooltip="选择分析的主要类型"
                >
                  <Select>
                    <Option value="static">静力分析 (推荐)</Option>
                    <Option value="seepage">渗流分析</Option>
                    <Option value="coupled">渗流耦合分析</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="荷载施加方式" 
                  name="load_application"
                  tooltip="选择荷载如何施加到结构上"
                >
                  <Select>
                    <Option value="staged">分阶段施加 (推荐)</Option>
                    <Option value="instantaneous">瞬时施加</Option>
                    <Option value="time_dependent">时间相关</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="求解器类型" 
                  name="solver_type"
                  tooltip="选择数值求解方法"
                >
                  <Select>
                    <Option value="direct">直接求解器 (推荐)</Option>
                    <Option value="iterative">迭代求解器</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="最大迭代次数" 
                  name="max_iterations"
                  tooltip="求解器的最大迭代次数"
                >
                  <Slider
                    min={10}
                    max={200}
                    marks={{ 10: '10', 50: '50', 100: '100', 200: '200' }}
                    tooltip={{ formatter: (value) => `${value}次` }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="收敛容差" 
                  name="convergence_tolerance"
                  tooltip="控制解的精度"
                >
                  <Select>
                    <Option value={1e-6}>1e-6 (工程精度)</Option>
                    <Option value={1e-7}>1e-7 (高精度)</Option>
                    <Option value={1e-5}>1e-5 (快速计算)</Option>
                    <Option value={1e-8}>1e-8 (超高精度)</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="施工阶段数" 
                  name="construction_stages"
                  tooltip="分步施工的阶段数量"
                >
                  <Slider
                    min={2}
                    max={20}
                    marks={{ 2: '2', 8: '8', 15: '15', 20: '20' }}
                    tooltip={{ formatter: (value) => `${value}阶段` }}
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="每阶段持续时间(天)" 
                  name="stage_duration"
                  tooltip="每个施工阶段的持续时间"
                >
                  <InputNumber
                    min={1}
                    max={30}
                    step={1}
                    style={{ width: '100%' }}
                    addonAfter="天"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="基础物理设置">
                  <Space wrap>
                    <Form.Item name="enable_gravity" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="重力" unCheckedChildren="重力" />
                    </Form.Item>
                    <Form.Item name="enable_initial_stress" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="初应力" unCheckedChildren="初应力" />
                    </Form.Item>
                    <Form.Item name="geometric_nonlinearity" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="几何非线性" unCheckedChildren="几何非线性" />
                    </Form.Item>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* 深基坑专用参数 */}
          <Panel 
            header={
              <Text strong style={{ color: '#faad14' }}>
                🟡 深基坑专用设置
              </Text>
            } 
            key="excavation"
          >
            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="开挖方法" 
                  name="excavation_method"
                  tooltip="选择基坑开挖的方法"
                >
                  <Select>
                    <Option value="top_down">自上而下 (推荐)</Option>
                    <Option value="bottom_up">自下而上</Option>
                    <Option value="basin">盆式开挖</Option>
                    <Option value="mixed">混合开挖</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="开挖顺序" 
                  name="excavation_sequence"
                  tooltip="选择开挖的空间顺序"
                >
                  <Select>
                    <Option value="symmetric">对称开挖 (推荐)</Option>
                    <Option value="asymmetric">非对称开挖</Option>
                    <Option value="staged">分段开挖</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item 
                  label="开挖速率(m/天)" 
                  name="excavation_rate"
                  tooltip="每天开挖的深度"
                >
                  <InputNumber
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="m/天"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="支护激活时机" 
                  name="support_activation"
                  tooltip="支护结构何时开始发挥作用"
                >
                  <Select>
                    <Option value="immediate">立即激活 (推荐)</Option>
                    <Option value="delayed">延迟激活</Option>
                    <Option value="progressive">渐进激活</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={12}>
                <Form.Item label="支护系统设置">
                  <Space wrap>
                    <Form.Item name="support_prestress" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="支护预应力" unCheckedChildren="支护预应力" />
                    </Form.Item>
                    <Form.Item name="stiffness_development" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="刚度发展" unCheckedChildren="刚度发展" />
                    </Form.Item>
                  </Space>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="水位下降速率(m/天)" 
                  name="water_drawdown_rate"
                  tooltip="降水时水位下降的速度"
                >
                  <InputNumber
                    min={0.1}
                    max={2.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="m/天"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Form.Item label="地下水控制">
                  <Space wrap>
                    <Form.Item name="dewatering_enabled" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="启用降水" unCheckedChildren="启用降水" />
                    </Form.Item>
                    <Form.Item name="seepage_coupling" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="渗流耦合" unCheckedChildren="渗流耦合" />
                    </Form.Item>
                    <Form.Item name="material_nonlinearity" valuePropName="checked" style={{ margin: 0 }}>
                      <Switch checkedChildren="材料非线性" unCheckedChildren="材料非线性" />
                    </Form.Item>
                  </Space>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* 高级参数面板 */}
          <Panel 
            header={
              <Text strong style={{ color: '#f5222d' }}>
                🔴 高级求解参数 (专家模式)
              </Text>
            } 
            key="advanced"
          >
            <Alert
              type="info"
              message="高级参数"
              description="这些参数适合有经验的用户调整，默认值已经过优化，一般情况下无需修改。"
              style={{ marginBottom: '16px' }}
              showIcon
            />
            
            <Row gutter={[16, 8]}>
              <Col span={24}>
                <Text type="secondary">
                  高级参数包括：求解策略控制、非线性控制、并行计算设置、性能优化选项等。
                  如需调整，请确保您了解这些参数的具体含义。
                </Text>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </Form>

      {/* 操作按钮 */}
      <Divider />
      <Row justify="center" style={{ marginTop: '16px' }}>
        <Space size="large">
          <Button 
            type="primary" 
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={handleStartAnalysis}
            disabled={computationStatus?.isRunning}
          >
            启动分析计算
          </Button>
          <Button icon={<SettingOutlined />}>
            保存参数配置
          </Button>
          <Button icon={<InfoCircleOutlined />}>
            参数说明文档
          </Button>
        </Space>
      </Row>
    </div>
  );
};

export default AnalysisStepConfiguration;