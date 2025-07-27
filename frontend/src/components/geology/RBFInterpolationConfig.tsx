/**
 * RBF插值参数配置组件 - 2号几何专家开发
 * P0优先级任务 - 基于已完成的rbfInterpolation.ts和rbf3DReconstruction.ts
 * 提供专业级RBF参数配置界面
 */

import React, { useState, useEffect } from 'react';
import { 
  Card, Form, Select, Slider, InputNumber, Switch, Row, Col, 
  Typography, Space, Button, Tooltip, Alert, Collapse, 
  Progress, Tag, Divider, Radio
} from 'antd';
import { 
  FunctionOutlined, SettingOutlined, InfoCircleOutlined, 
  ExperimentOutlined, CheckCircleOutlined, ThunderboltOutlined,
  BulbOutlined, LineChartOutlined
} from '@ant-design/icons';
import type { RBFKernel } from '../../algorithms/rbfInterpolation';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;

// RBF配置接口 (基于算法模块)
interface RBFInterpolationSettings {
  // 核函数设置
  kernel: {
    type: RBFKernel;
    shapeParameter: number;
    smoothingFactor: number;
  };
  
  // 插值控制
  interpolation: {
    maxPoints: number;
    tolerance: number;
    adaptiveRefinement: boolean;
    cornerPreservation: boolean;
    smoothnessControl: number;
  };
  
  // 网格兼容性 (基于3号要求)
  meshCompatibility: {
    targetMeshSize: number;
    qualityThreshold: number;
    maxElements: number;
  };
  
  // 3D重建特定参数
  reconstruction3D: {
    enableExtrapolation: boolean;
    maxExtrapolationDistance: number;
    enableDownwardExtension: boolean;
    extensionDepth: number;
    surfaceType: 'nurbs' | 'bspline';
    surfaceDegree: number;
  };
  
  // 质量控制
  qualityControl: {
    crossValidationFolds: number;
    minSampleDensity: number;
    maxInterpolationDistance: number;
    layerContinuityCheck: boolean;
  };
}

interface RBFInterpolationConfigProps {
  initialConfig?: Partial<RBFInterpolationSettings>;
  onConfigChange?: (config: RBFInterpolationSettings) => void;
  onPreview?: (config: RBFInterpolationSettings) => void;
  onApply?: (config: RBFInterpolationSettings) => void;
  disabled?: boolean;
  showAdvanced?: boolean;
}

const RBFInterpolationConfig: React.FC<RBFInterpolationConfigProps> = ({
  initialConfig = {},
  onConfigChange,
  onPreview,
  onApply,
  disabled = false,
  showAdvanced = true
}) => {
  const [form] = Form.useForm();
  const [activePanel, setActivePanel] = useState<string[]>(['kernel', 'quality']);
  const [previewMode, setPreviewMode] = useState(false);
  const [qualityScore, setQualityScore] = useState(0);

  // 默认配置 (基于3号专家的质量标准)
  const defaultConfig: RBFInterpolationSettings = {
    kernel: {
      type: 'multiquadric',
      shapeParameter: 1.0,
      smoothingFactor: 0.1
    },
    interpolation: {
      maxPoints: 10000,
      tolerance: 1e-10,
      adaptiveRefinement: true,
      cornerPreservation: true,
      smoothnessControl: 0.1
    },
    meshCompatibility: {
      targetMeshSize: 1.75, // 1.5-2.0m中值
      qualityThreshold: 0.65, // 3号验证的质量目标
      maxElements: 2000000 // 200万单元上限
    },
    reconstruction3D: {
      enableExtrapolation: true,
      maxExtrapolationDistance: 500.0,
      enableDownwardExtension: true,
      extensionDepth: 100.0,
      surfaceType: 'nurbs',
      surfaceDegree: 3
    },
    qualityControl: {
      crossValidationFolds: 5,
      minSampleDensity: 0.1,
      maxInterpolationDistance: 1000.0,
      layerContinuityCheck: true
    },
    ...initialConfig
  };

  const [config, setConfig] = useState<RBFInterpolationSettings>(defaultConfig);

  // 配置变化处理
  const handleConfigChange = (changedFields: any, allFields: any) => {
    const newConfig = form.getFieldsValue() as RBFInterpolationSettings;
    setConfig(newConfig);
    
    // 计算质量评分
    const score = calculateQualityScore(newConfig);
    setQualityScore(score);
    
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  };

  // 质量评分计算
  const calculateQualityScore = (cfg: RBFInterpolationSettings): number => {
    let score = 100;
    
    // 核函数类型评分
    const kernelScores = {
      'multiquadric': 95,
      'thin_plate_spline': 90,
      'gaussian': 85,
      'inverse': 80,
      'cubic': 75
    };
    score *= (kernelScores[cfg.kernel.type] || 70) / 100;
    
    // 网格兼容性评分
    if (cfg.meshCompatibility.targetMeshSize < 1.5 || cfg.meshCompatibility.targetMeshSize > 2.0) {
      score *= 0.9; // 偏离3号推荐范围
    }
    if (cfg.meshCompatibility.qualityThreshold < 0.65) {
      score *= 0.85; // 低于3号质量标准
    }
    
    // 参数合理性检查
    if (cfg.kernel.shapeParameter < 0.5 || cfg.kernel.shapeParameter > 2.0) {
      score *= 0.9; // 形状参数偏离推荐范围
    }
    if (cfg.interpolation.maxPoints > 50000) {
      score *= 0.95; // 计算点数过多可能影响性能
    }
    
    return Math.round(score);
  };

  // 预设配置
  const presetConfigs = {
    precision: {
      name: '高精度模式',
      description: '适用于精细地质建模，质量优先',
      config: {
        ...defaultConfig,
        kernel: { ...defaultConfig.kernel, type: 'thin_plate_spline' as RBFKernel, smoothingFactor: 0.05 },
        meshCompatibility: { ...defaultConfig.meshCompatibility, targetMeshSize: 1.5, qualityThreshold: 0.75 },
        interpolation: { ...defaultConfig.interpolation, tolerance: 1e-12, maxPoints: 20000 }
      }
    },
    balanced: {
      name: '平衡模式',
      description: '精度和性能的最佳平衡',
      config: defaultConfig
    },
    performance: {
      name: '高性能模式',
      description: '适用于大规模项目，速度优先',
      config: {
        ...defaultConfig,
        kernel: { ...defaultConfig.kernel, type: 'multiquadric' as RBFKernel, smoothingFactor: 0.2 },
        meshCompatibility: { ...defaultConfig.meshCompatibility, targetMeshSize: 2.0, qualityThreshold: 0.6 },
        interpolation: { ...defaultConfig.interpolation, tolerance: 1e-8, maxPoints: 5000 }
      }
    }
  };

  const applyPreset = (presetKey: keyof typeof presetConfigs) => {
    const preset = presetConfigs[presetKey];
    setConfig(preset.config);
    form.setFieldsValue(preset.config);
    handleConfigChange(null, null);
  };

  const handlePreview = () => {
    setPreviewMode(true);
    if (onPreview) {
      onPreview(config);
    }
    setTimeout(() => setPreviewMode(false), 2000);
  };

  const handleApply = () => {
    if (onApply) {
      onApply(config);
    }
  };

  useEffect(() => {
    form.setFieldsValue(config);
    const score = calculateQualityScore(config);
    setQualityScore(score);
  }, [config, form]);

  return (
    <div className="rbf-interpolation-config">
      {/* 质量评估头部 */}
      <Card size="small" style={{ marginBottom: '16px' }}>
        <Row gutter={16} align="middle">
          <Col span={8}>
            <Space>
              <FunctionOutlined style={{ color: 'var(--primary-color)' }} />
              <Title level={5} style={{ margin: 0 }}>RBF插值配置</Title>
            </Space>
          </Col>
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>配置质量评分</Text>
              <div style={{ marginTop: '4px' }}>
                <Progress
                  percent={qualityScore}
                  size="small"
                  status={qualityScore >= 90 ? 'success' : qualityScore >= 75 ? 'active' : 'exception'}
                  format={(percent) => (
                    <Text style={{ fontSize: '12px' }}>
                      {percent >= 90 ? '优秀' : percent >= 75 ? '良好' : '待优化'}
                    </Text>
                  )}
                />
              </div>
            </div>
          </Col>
          <Col span={8}>
            <Space style={{ float: 'right' }}>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={previewMode}
                disabled={disabled}
              >
                预览效果
              </Button>
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={handleApply}
                disabled={disabled || qualityScore < 60}
              >
                应用配置
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 预设配置选择 */}
      <Card title="快速配置" size="small" style={{ marginBottom: '16px' }}>
        <Space size="middle">
          {Object.entries(presetConfigs).map(([key, preset]) => (
            <Tooltip key={key} title={preset.description}>
              <Button
                size="small"
                onClick={() => applyPreset(key as keyof typeof presetConfigs)}
                disabled={disabled}
                type={config === preset.config ? 'primary' : 'default'}
              >
                {preset.name}
              </Button>
            </Tooltip>
          ))}
        </Space>
      </Card>

      {/* 质量提醒 */}
      {qualityScore < 75 && (
        <Alert
          message="配置建议"
          description="当前配置可能影响重建质量，建议参考3号计算专家的质量标准进行调整"
          type="warning"
          showIcon
          style={{ marginBottom: '16px' }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        initialValues={config}
        onValuesChange={handleConfigChange}
        disabled={disabled}
      >
        <Collapse 
          activeKey={activePanel} 
          onChange={setActivePanel as any}
          ghost
        >
          {/* 核函数配置 */}
          <Panel 
            header={
              <Space>
                <FunctionOutlined />
                <span>核函数设置</span>
                <Tag color="blue">关键参数</Tag>
              </Space>
            } 
            key="kernel"
          >
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  label="核函数类型" 
                  name={['kernel', 'type']}
                  tooltip="不同核函数适用于不同的地质条件，multiquadric适合大多数情况"
                >
                  <Select>
                    <Option value="multiquadric">多二次函数 (推荐)</Option>
                    <Option value="thin_plate_spline">薄板样条 (高精度)</Option>
                    <Option value="gaussian">高斯函数 (平滑)</Option>
                    <Option value="inverse">反多二次函数</Option>
                    <Option value="cubic">三次函数</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="形状参数" 
                  name={['kernel', 'shapeParameter']}
                  tooltip="控制函数的尖锐度，推荐范围0.5-2.0"
                >
                  <Slider
                    min={0.1}
                    max={3.0}
                    step={0.1}
                    marks={{
                      0.5: '0.5',
                      1.0: '1.0',
                      2.0: '2.0'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="平滑因子" 
                  name={['kernel', 'smoothingFactor']}
                  tooltip="控制插值的平滑程度，0为精确插值"
                >
                  <Slider
                    min={0}
                    max={0.5}
                    step={0.01}
                    marks={{
                      0: '0',
                      0.1: '0.1',
                      0.2: '0.2'
                    }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* 网格兼容性配置 (3号专家要求) */}
          <Panel 
            header={
              <Space>
                <ThunderboltOutlined />
                <span>网格兼容性</span>
                <Tag color="green">3号标准</Tag>
              </Space>
            } 
            key="quality"
          >
            <Alert
              message="基于3号计算专家的质量标准"
              description="目标网格尺寸1.5-2.0m，质量阈值>0.65，200万单元验证"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item 
                  label="目标网格尺寸 (m)" 
                  name={['meshCompatibility', 'targetMeshSize']}
                  tooltip="影响最终网格质量，推荐1.5-2.0m"
                >
                  <InputNumber
                    min={1.0}
                    max={5.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="m"
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="质量阈值" 
                  name={['meshCompatibility', 'qualityThreshold']}
                  tooltip="3号验证的质量目标，建议≥0.65"
                >
                  <Slider
                    min={0.5}
                    max={0.9}
                    step={0.05}
                    marks={{
                      0.5: '0.5',
                      0.65: '0.65',
                      0.8: '0.8'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item 
                  label="最大单元数" 
                  name={['meshCompatibility', 'maxElements']}
                  tooltip="3号的200万单元上限"
                >
                  <InputNumber
                    min={500000}
                    max={5000000}
                    step={100000}
                    style={{ width: '100%' }}
                    formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    parser={(value) => value!.replace(/\$\s?|(,*)/g, '')}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* 3D重建配置 */}
          <Panel 
            header={
              <Space>
                <ExperimentOutlined />
                <span>三维重建设置</span>
                <Tag color="purple">高级功能</Tag>
              </Space>
            } 
            key="reconstruction"
          >
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="外推设置">
                  <Form.Item 
                    name={['reconstruction3D', 'enableExtrapolation']} 
                    valuePropName="checked"
                    style={{ marginBottom: '12px' }}
                  >
                    <Switch checkedChildren="启用外推" unCheckedChildren="禁用外推" />
                  </Form.Item>
                  <Form.Item 
                    label="最大外推距离 (m)" 
                    name={['reconstruction3D', 'maxExtrapolationDistance']}
                  >
                    <InputNumber
                      min={100}
                      max={1000}
                      step={50}
                      style={{ width: '100%' }}
                      addonAfter="m"
                    />
                  </Form.Item>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="下推设置">
                  <Form.Item 
                    name={['reconstruction3D', 'enableDownwardExtension']} 
                    valuePropName="checked"
                    style={{ marginBottom: '12px' }}
                  >
                    <Switch checkedChildren="启用下推" unCheckedChildren="禁用下推" />
                  </Form.Item>
                  <Form.Item 
                    label="下推深度 (m)" 
                    name={['reconstruction3D', 'extensionDepth']}
                  >
                    <InputNumber
                      min={50}
                      max={200}
                      step={10}
                      style={{ width: '100%' }}
                      addonAfter="m"
                    />
                  </Form.Item>
                </Card>
              </Col>
            </Row>
            <Divider />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label="GMSH曲面类型" 
                  name={['reconstruction3D', 'surfaceType']}
                  tooltip="NURBS更适合复杂曲面，B样条计算更快"
                >
                  <Radio.Group>
                    <Radio value="nurbs">NURBS曲面</Radio>
                    <Radio value="bspline">B样条曲面</Radio>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item 
                  label="曲面阶数" 
                  name={['reconstruction3D', 'surfaceDegree']}
                  tooltip="高阶数更平滑但计算量大"
                >
                  <Select>
                    <Option value={1}>1阶 (线性)</Option>
                    <Option value={2}>2阶 (二次)</Option>
                    <Option value={3}>3阶 (三次，推荐)</Option>
                    <Option value={4}>4阶 (高次)</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* 高级插值控制 */}
          {showAdvanced && (
            <Panel 
              header={
                <Space>
                  <SettingOutlined />
                  <span>高级控制</span>
                  <Tag color="orange">专家选项</Tag>
                </Space>
              } 
              key="advanced"
            >
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item 
                    label="最大插值点数" 
                    name={['interpolation', 'maxPoints']}
                    tooltip="影响计算精度和速度"
                  >
                    <InputNumber
                      min={1000}
                      max={50000}
                      step={1000}
                      style={{ width: '100%' }}
                      formatter={(value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    label="数值容差" 
                    name={['interpolation', 'tolerance']}
                  >
                    <Select>
                      <Option value={1e-8}>1e-8 (标准)</Option>
                      <Option value={1e-10}>1e-10 (高精度)</Option>
                      <Option value={1e-12}>1e-12 (超高精度)</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item 
                    label="平滑性控制" 
                    name={['interpolation', 'smoothnessControl']}
                  >
                    <Slider
                      min={0}
                      max={0.5}
                      step={0.05}
                      marks={{
                        0: '0',
                        0.1: '0.1',
                        0.3: '0.3'
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item 
                    name={['interpolation', 'adaptiveRefinement']} 
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="自适应细化" unCheckedChildren="固定细化" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item 
                    name={['interpolation', 'cornerPreservation']} 
                    valuePropName="checked"
                  >
                    <Switch checkedChildren="角点保持" unCheckedChildren="平滑角点" />
                  </Form.Item>
                </Col>
              </Row>
            </Panel>
          )}
        </Collapse>
      </Form>

      {/* 配置摘要 */}
      <Card 
        size="small" 
        style={{ 
          marginTop: '16px',
          background: 'var(--component-bg)',
          border: '1px solid var(--border-color)'
        }}
      >
        <Row>
          <Col span={24}>
            <Text style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              <Space split={<span>|</span>}>
                <span>核函数: {config.kernel.type}</span>
                <span>网格: {config.meshCompatibility.targetMeshSize}m</span>
                <span>质量: {config.meshCompatibility.qualityThreshold}</span>
                <span>外推: {config.reconstruction3D.enableExtrapolation ? '启用' : '禁用'}</span>
                <span>评分: {qualityScore}/100</span>
              </Space>
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default RBFInterpolationConfig;