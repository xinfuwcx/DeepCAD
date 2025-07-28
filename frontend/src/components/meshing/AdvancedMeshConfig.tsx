import React, { useState, useEffect } from 'react';
import {
  Card, Form, Select, InputNumber, Switch, Slider, Collapse, Row, Col,
  Button, Space, Divider, Alert, Tooltip, Progress, Tag, Typography,
  message, Modal, Table, Descriptions, Tabs
} from 'antd';
import {
  SettingOutlined, ExperimentOutlined, ThunderboltOutlined,
  RocketOutlined, CrownOutlined, InfoCircleOutlined,
  CheckCircleOutlined, WarningOutlined, ClockCircleOutlined,
  DatabaseOutlined, BugOutlined, SaveOutlined, PlayCircleOutlined
} from '@ant-design/icons';
import { GlassCard, GlassButton } from '../ui/GlassComponents';
import { useI18n } from '../../hooks/useI18n';

const { Text, Title, Paragraph } = Typography;
const { Panel } = Collapse;
const { Option } = Select;
const { TabPane } = Tabs;

// 算法配置接口
interface AdvancedMeshConfig {
  global_element_size: number;
  algorithm_2d: string;
  algorithm_3d: string;
  element_2d_type: string;
  element_3d_type: string;
  quality_mode: string;
  refinement_strategy: string;
  smoothing_algorithm: string;
  enable_smoothing: boolean;
  smoothing_iterations: number;
  enable_optimization: boolean;
  generate_second_order: boolean;
  algorithm_params: {
    min_element_quality: number;
    max_aspect_ratio: number;
    optimization_iterations: number;
  };
  size_field: {
    enable_size_field: boolean;
    min_size: number;
    max_size: number;
    growth_rate: number;
    curvature_adaptation: boolean;
  };
  boundary_layers: {
    enable_boundary_layers: boolean;
    number_of_layers: number;
    first_layer_thickness: number;
    growth_ratio: number;
  };
  parallel_config: {
    enable_parallel: boolean;
    num_threads: number;
    load_balancing: boolean;
  };
}

interface AlgorithmPreset {
  name: string;
  description: string;
  use_case: string;
  performance_level: string;
  config: AdvancedMeshConfig;
}

interface PerformanceEstimate {
  estimated_elements: number;
  estimated_nodes: number;
  estimated_time_seconds: number;
  estimated_memory_mb: number;
  performance_class: string;
  recommendations: string[];
}

const AdvancedMeshConfig: React.FC = () => {
  const { t } = useI18n();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState('presets');
  const [selectedPreset, setSelectedPreset] = useState<AlgorithmPreset | null>(null);
  const [presets, setPresets] = useState<AlgorithmPreset[]>([]);
  const [performanceEstimate, setPerformanceEstimate] = useState<PerformanceEstimate | null>(null);
  const [validationResult, setValidationResult] = useState<any>(null);
  const [algorithmInfo, setAlgorithmInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // 加载算法预设和信息
  useEffect(() => {
    loadAlgorithmData();
  }, []);

  const loadAlgorithmData = async () => {
    try {
      // 使用模拟数据替代API调用
      const mockPresets: AlgorithmPreset[] = [
        {
          name: '快速网格生成',
          description: '适用于初步分析，生成速度快',
          use_case: '概念设计、快速验证',
          performance_level: 'fast',
          config: {
            global_element_size: 2.0,
            algorithm_2d: 'delaunay',
            algorithm_3d: 'delaunay',
            element_2d_type: 'triangle',
            element_3d_type: 'tetrahedron',
            quality_mode: 'fast',
            refinement_strategy: 'uniform',
            smoothing_algorithm: 'laplacian',
            enable_smoothing: false,
            smoothing_iterations: 1,
            enable_optimization: false,
            generate_second_order: false,
            algorithm_params: {
              min_element_quality: 0.3,
              max_aspect_ratio: 10,
              optimization_iterations: 5
            },
            size_field: {
              enable_size_field: false,
              min_size: 0.1,
              max_size: 5.0,
              growth_rate: 1.3,
              curvature_adaptation: false
            },
            boundary_layers: {
              enable_boundary_layers: false,
              number_of_layers: 3,
              first_layer_thickness: 0.01,
              growth_ratio: 1.2
            },
            parallel_config: {
              enable_parallel: true,
              num_threads: 4,
              load_balancing: false
            }
          }
        },
        {
          name: '平衡质量网格',
          description: '质量与速度的平衡方案',
          use_case: '常规工程分析',
          performance_level: 'balanced',
          config: {
            global_element_size: 1.0,
            algorithm_2d: 'frontal',
            algorithm_3d: 'delaunay',
            element_2d_type: 'triangle',
            element_3d_type: 'tetrahedron',
            quality_mode: 'balanced',
            refinement_strategy: 'adaptive',
            smoothing_algorithm: 'laplacian',
            enable_smoothing: true,
            smoothing_iterations: 3,
            enable_optimization: true,
            generate_second_order: false,
            algorithm_params: {
              min_element_quality: 0.5,
              max_aspect_ratio: 5,
              optimization_iterations: 10
            },
            size_field: {
              enable_size_field: true,
              min_size: 0.05,
              max_size: 2.0,
              growth_rate: 1.2,
              curvature_adaptation: true
            },
            boundary_layers: {
              enable_boundary_layers: false,
              number_of_layers: 5,
              first_layer_thickness: 0.005,
              growth_ratio: 1.3
            },
            parallel_config: {
              enable_parallel: true,
              num_threads: 8,
              load_balancing: true
            }
          }
        }
      ];

      const mockAlgorithmInfo = {
        available_algorithms_2d: ['delaunay', 'frontal', 'frontal_quad'],
        available_algorithms_3d: ['delaunay', 'frontal', 'mmg', 'tetgen'],
        supported_element_types: ['triangle', 'quadrangle', 'tetrahedron', 'hexahedron']
      };
      
      setPresets(mockPresets);
      setAlgorithmInfo(mockAlgorithmInfo);
    } catch (error) {
      message.error('加载算法数据失败');
      console.error('Failed to load algorithm data:', error);
    }
  };

  // 应用预设配置
  const applyPreset = (preset: AlgorithmPreset) => {
    setSelectedPreset(preset);
    form.setFieldsValue(preset.config);
    message.success(`已应用预设: ${preset.name}`);
    
    // 自动估算性能
    estimatePerformance(preset.config);
  };

  // 性能估算 - 使用模拟计算
  const estimatePerformance = async (config: AdvancedMeshConfig) => {
    try {
      // 基于配置参数的性能估算逻辑
      const elementSize = config.global_element_size;
      const complexityFactor = config.quality_mode === 'high_quality' ? 2.5 : 
                              config.quality_mode === 'balanced' ? 1.5 : 1.0;
      
      const baseElements = Math.floor(100000 / (elementSize * elementSize));
      const estimatedElements = Math.floor(baseElements * complexityFactor);
      const estimatedNodes = Math.floor(estimatedElements * 0.6);
      const estimatedTime = Math.floor(estimatedElements / 10000 * complexityFactor);
      const estimatedMemory = Math.floor(estimatedElements * 0.001 + 50);
      
      const performanceData: PerformanceEstimate = {
        estimated_elements: estimatedElements,
        estimated_nodes: estimatedNodes,
        estimated_time_seconds: estimatedTime,
        estimated_memory_mb: estimatedMemory,
        performance_class: estimatedTime < 30 ? 'fast' : estimatedTime < 120 ? 'medium' : 'slow',
        recommendations: [
          estimatedTime > 120 ? '建议增大网格尺寸以提高生成速度' : '',
          config.enable_optimization ? '质量优化将增加20%生成时间' : '',
          config.generate_second_order ? '二阶单元将增加50%内存使用' : ''
        ].filter(Boolean)
      };
      
      setPerformanceEstimate(performanceData);
    } catch (error) {
      console.error('Performance estimation failed:', error);
    }
  };

  // 配置验证 - 使用本地验证逻辑
  const validateConfig = async (config: AdvancedMeshConfig) => {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];

      // 基本参数验证
      if (config.global_element_size < 0.01) {
        errors.push('全局单元尺寸不能小于0.01');
      }
      if (config.global_element_size > 100) {
        errors.push('全局单元尺寸不能大于100');
      }

      // 质量参数验证
      if (config.algorithm_params.min_element_quality < 0.1) {
        warnings.push('最小单元质量过低，可能影响计算精度');
      }
      if (config.algorithm_params.max_aspect_ratio > 20) {
        warnings.push('最大纵横比过大，可能产生病态单元');
      }

      // 性能建议
      if (config.enable_optimization && config.quality_mode === 'fast') {
        recommendations.push('快速模式下建议关闭质量优化以提高速度');
      }
      if (config.generate_second_order && config.global_element_size < 0.5) {
        recommendations.push('小尺寸网格使用二阶单元将显著增加内存消耗');
      }
      if (config.parallel_config.num_threads > 16) {
        warnings.push('线程数过多可能不会带来性能提升');
      }

      const result = {
        is_valid: errors.length === 0,
        errors,
        warnings,
        recommendations
      };

      setValidationResult(result);
      return result;
    } catch (error) {
      console.error('Config validation failed:', error);
      return { is_valid: false, errors: ['验证失败'], warnings: [], recommendations: [] };
    }
  };

  // 启动高级网格生成 - 模拟网格生成过程
  const generateAdvancedMesh = async () => {
    try {
      setGenerating(true);
      const values = form.getFieldsValue();
      
      // 验证配置
      const validation = await validateConfig(values);
      if (!validation.is_valid) {
        message.error('配置验证失败，请检查参数设置');
        return;
      }

      // 模拟网格生成过程
      message.info('开始生成高级网格...');
      
      // 模拟生成时间
      const estimatedTime = performanceEstimate?.estimated_time_seconds || 30;
      await new Promise(resolve => setTimeout(resolve, Math.min(estimatedTime * 100, 3000)));

      const mockResult = {
        mesh_id: `mesh_${Date.now()}`,
        status: 'completed',
        config: values,
        statistics: {
          elements: performanceEstimate?.estimated_elements || 50000,
          nodes: performanceEstimate?.estimated_nodes || 25000,
          generation_time: estimatedTime,
          memory_used: performanceEstimate?.estimated_memory_mb || 100
        },
        quality_metrics: {
          average_quality: 0.85,
          min_quality: 0.45,
          max_quality: 0.98
        }
      };

      message.success('高级网格生成完成！');
      console.log('3号计算专家 - 网格生成完成:', mockResult);
      
    } catch (error) {
      message.error('启动网格生成失败');
      console.error('Generate mesh failed:', error);
    } finally {
      setGenerating(false);
    }
  };

  // 表单值变化时重新估算性能
  const handleFormChange = () => {
    const values = form.getFieldsValue();
    if (values.global_element_size) {
      estimatePerformance(values);
    }
  };

  // 渲染预设选择
  const renderPresets = () => {
    const presetsByPerformance = {
      fast: presets.filter(p => p.performance_level === 'fast'),
      balanced: presets.filter(p => p.performance_level === 'balanced'),
      quality: presets.filter(p => p.performance_level === 'quality')
    };

    return (
      <div className="algorithm-presets">
        <Title level={4} className="mb-4">
          <ExperimentOutlined /> 算法预设模板
        </Title>
        <Paragraph className="text-secondary mb-6">
          选择适合您分析需求的预设配置，或基于预设进行自定义调整。
        </Paragraph>

        {Object.entries(presetsByPerformance).map(([level, levelPresets]) => (
          <div key={level} className="mb-6">
            <div className="flex items-center mb-3">
              {level === 'fast' && <ThunderboltOutlined className="text-warning mr-2" />}
              {level === 'balanced' && <SettingOutlined className="text-primary mr-2" />}
              {level === 'quality' && <CrownOutlined className="text-success mr-2" />}
              <Text strong className="text-base">
                {level === 'fast' && '快速模式'}
                {level === 'balanced' && '平衡模式'}
                {level === 'quality' && '高质量模式'}
              </Text>
            </div>
            
            <Row gutter={[16, 16]}>
              {levelPresets.map((preset) => (
                <Col key={preset.name} xs={24} sm={12} lg={8}>
                  <GlassCard 
                    className={`preset-card cursor-pointer transition-all hover-lift ${
                      selectedPreset?.name === preset.name ? 'border-primary shadow-lg' : ''
                    }`}
                    onClick={() => applyPreset(preset)}
                  >
                    <div className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <Text strong className="text-base">{preset.name}</Text>
                        <Tag color={
                          level === 'fast' ? 'orange' : 
                          level === 'balanced' ? 'blue' : 'green'
                        }>
                          {level === 'fast' ? '快速' : level === 'balanced' ? '平衡' : '高质量'}
                        </Tag>
                      </div>
                      <Paragraph className="text-secondary text-sm mb-3">
                        {preset.description}
                      </Paragraph>
                      <div className="text-xs text-tertiary">
                        <Text type="secondary">适用场景: {preset.use_case}</Text>
                      </div>
                    </div>
                  </GlassCard>
                </Col>
              ))}
            </Row>
          </div>
        ))}
      </div>
    );
  };

  // 渲染高级配置
  const renderAdvancedConfig = () => (
    <Form
      form={form}
      layout="vertical"
      onValuesChange={handleFormChange}
      initialValues={{
        global_element_size: 1.0,
        algorithm_2d: 'delaunay',
        algorithm_3d: 'delaunay',
        element_2d_type: 'triangle',
        element_3d_type: 'tetrahedron',
        quality_mode: 'balanced',
        refinement_strategy: 'uniform',
        smoothing_algorithm: 'laplacian',
        enable_smoothing: true,
        smoothing_iterations: 3,
        enable_optimization: true,
        generate_second_order: false
      }}
    >
      <Collapse defaultActiveKey={['basic']} className="mb-4">
        <Panel header="基本设置" key="basic">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="global_element_size"
                label="全局单元尺寸"
                tooltip="控制整体网格密度的基准尺寸"
              >
                <InputNumber
                  min={0.01}
                  max={100}
                  step={0.1}
                  placeholder="1.0"
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="quality_mode"
                label="质量模式"
                tooltip="平衡生成速度与网格质量"
              >
                <Select>
                  <Option value="fast">
                    <Space><ThunderboltOutlined />快速模式</Space>
                  </Option>
                  <Option value="balanced">
                    <Space><SettingOutlined />平衡模式</Space>
                  </Option>
                  <Option value="high_quality">
                    <Space><CrownOutlined />高质量模式</Space>
                  </Option>
                  <Option value="adaptive">
                    <Space><RocketOutlined />自适应模式</Space>
                  </Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="algorithm_2d"
                label="2D网格算法"
                tooltip="二维表面网格生成算法"
              >
                <Select>
                  <Option value="delaunay">Delaunay三角剖分</Option>
                  <Option value="frontal">前沿推进算法</Option>
                  <Option value="frontal_quad">前沿四边形</Option>
                  <Option value="mmg">MMG重网格化</Option>
                  <Option value="netgen">Netgen算法</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="algorithm_3d"
                label="3D网格算法"
                tooltip="三维体网格生成算法"
              >
                <Select>
                  <Option value="delaunay">Delaunay四面体</Option>
                  <Option value="frontal">前沿推进3D</Option>
                  <Option value="mmg">MMG 3D</Option>
                  <Option value="netgen">Netgen算法</Option>
                  <Option value="tetgen">TetGen算法</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="element_2d_type"
                label="2D单元类型"
              >
                <Select>
                  <Option value="triangle">三角形</Option>
                  <Option value="quadrangle">四边形</Option>
                  <Option value="mixed">混合</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="element_3d_type"
                label="3D单元类型"
              >
                <Select>
                  <Option value="tetrahedron">四面体</Option>
                  <Option value="hexahedron">六面体</Option>
                  <Option value="prism">棱柱</Option>
                  <Option value="pyramid">锥形</Option>
                  <Option value="mixed_3d">混合3D</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
        </Panel>

        <Panel header="质量优化" key="quality">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="enable_smoothing"
                label="启用网格平滑"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="smoothing_iterations"
                label="平滑迭代次数"
              >
                <Slider min={1} max={10} marks={{ 1: '1', 5: '5', 10: '10' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="smoothing_algorithm"
                label="平滑算法"
              >
                <Select>
                  <Option value="laplacian">拉普拉斯平滑</Option>
                  <Option value="taubin">Taubin平滑</Option>
                  <Option value="angle_based">角度平滑</Option>
                  <Option value="optimization_based">优化平滑</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="refinement_strategy"
                label="细化策略"
              >
                <Select>
                  <Option value="uniform">均匀细化</Option>
                  <Option value="adaptive">自适应细化</Option>
                  <Option value="curvature_based">曲率细化</Option>
                  <Option value="feature_based">特征细化</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name="enable_optimization"
                label="启用质量优化"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="generate_second_order"
                label="生成二阶单元"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Panel>

        <Panel header="尺寸场控制" key="size_field">
          <Form.Item
            name={['size_field', 'enable_size_field']}
            label="启用尺寸场"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item
                name={['size_field', 'min_size']}
                label="最小尺寸"
              >
                <InputNumber min={0.001} max={10} step={0.01} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['size_field', 'max_size']}
                label="最大尺寸"
              >
                <InputNumber min={0.1} max={100} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['size_field', 'growth_rate']}
                label="增长率"
              >
                <InputNumber min={1.0} max={3.0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['size_field', 'curvature_adaptation']}
            label="曲率自适应"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Panel>

        <Panel header="边界层网格" key="boundary_layers">
          <Form.Item
            name={['boundary_layers', 'enable_boundary_layers']}
            label="启用边界层"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Form.Item
                name={['boundary_layers', 'number_of_layers']}
                label="层数"
              >
                <InputNumber min={1} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['boundary_layers', 'first_layer_thickness']}
                label="首层厚度"
              >
                <InputNumber min={0.001} max={1} step={0.001} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['boundary_layers', 'growth_ratio']}
                label="增长比"
              >
                <InputNumber min={1.0} max={3.0} step={0.1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Panel>

        <Panel header="并行计算" key="parallel">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Form.Item
                name={['parallel_config', 'enable_parallel']}
                label="启用并行计算"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['parallel_config', 'num_threads']}
                label="线程数"
              >
                <Slider min={1} max={16} marks={{ 1: '1', 4: '4', 8: '8', 16: '16' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name={['parallel_config', 'load_balancing']}
            label="负载均衡"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
        </Panel>
      </Collapse>
    </Form>
  );

  // 渲染性能估算
  const renderPerformanceEstimate = () => {
    if (!performanceEstimate) return null;

    const getPerformanceColor = (performanceClass: string) => {
      switch (performanceClass) {
        case 'fast': return 'success';
        case 'medium': return 'warning';
        case 'slow': return 'error';
        default: return 'default';
      }
    };

    return (
      <GlassCard className="mb-4">
        <Title level={5} className="mb-3">
          <ClockCircleOutlined /> 性能估算
        </Title>
        
        <Row gutter={[16, 16]} className="mb-4">
          <Col span={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-1">
                {performanceEstimate.estimated_elements.toLocaleString()}
              </div>
              <div className="text-xs text-secondary">预计单元数</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-success mb-1">
                {performanceEstimate.estimated_nodes.toLocaleString()}
              </div>
              <div className="text-xs text-secondary">预计节点数</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning mb-1">
                {performanceEstimate.estimated_time_seconds}s
              </div>
              <div className="text-xs text-secondary">预计时间</div>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="text-2xl font-bold text-info mb-1">
                {performanceEstimate.estimated_memory_mb.toFixed(0)}MB
              </div>
              <div className="text-xs text-secondary">预计内存</div>
            </div>
          </Col>
        </Row>

        <div className="flex items-center justify-between mb-3">
          <Text>性能等级:</Text>
          <Tag color={getPerformanceColor(performanceEstimate.performance_class)}>
            {performanceEstimate.performance_class === 'fast' ? '快速' :
             performanceEstimate.performance_class === 'medium' ? '中等' : '较慢'}
          </Tag>
        </div>

        {performanceEstimate.recommendations.length > 0 && (
          <Alert
            type="info"
            message="性能建议"
            description={
              <ul className="mb-0">
                {performanceEstimate.recommendations.map((rec, idx) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            }
            showIcon
          />
        )}
      </GlassCard>
    );
  };

  // 渲染配置验证结果
  const renderValidationResult = () => {
    if (!validationResult) return null;

    return (
      <GlassCard className="mb-4">
        <Title level={5} className="mb-3">
          <CheckCircleOutlined /> 配置验证
        </Title>
        
        {validationResult.errors.length > 0 && (
          <Alert
            type="error"
            message="配置错误"
            description={
              <ul className="mb-0">
                {validationResult.errors.map((error: string, idx: number) => (
                  <li key={idx}>{error}</li>
                ))}
              </ul>
            }
            className="mb-3"
          />
        )}

        {validationResult.warnings.length > 0 && (
          <Alert
            type="warning"
            message="配置警告"
            description={
              <ul className="mb-0">
                {validationResult.warnings.map((warning: string, idx: number) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            }
            className="mb-3"
          />
        )}

        {validationResult.recommendations.length > 0 && (
          <Alert
            type="info"
            message="优化建议"
            description={
              <ul className="mb-0">
                {validationResult.recommendations.map((rec: string, idx: number) => (
                  <li key={idx}>{rec}</li>
                ))}
              </ul>
            }
            className="mb-3"
          />
        )}

        {validationResult.is_valid && validationResult.errors.length === 0 && (
          <Alert
            type="success"
            message="配置验证通过"
            description="当前配置参数有效，可以进行网格生成"
            showIcon
          />
        )}
      </GlassCard>
    );
  };

  return (
    <div className="advanced-mesh-config">
      <div className="flex justify-between items-center mb-6">
        <div>
          <Title level={4} className="m-0 text-gradient">
            <SettingOutlined /> 高级网格算法配置
          </Title>
          <Text className="text-secondary">
            配置先进的网格生成算法，优化网格质量和生成性能
          </Text>
        </div>
        <Space>
          <GlassButton
            variant="ghost"
            icon={<SaveOutlined />}
            onClick={() => message.info('配置保存功能开发中')}
          >
            保存配置
          </GlassButton>
          <GlassButton
            variant="primary"
            icon={<PlayCircleOutlined />}
            onClick={generateAdvancedMesh}
            loading={generating}
            disabled={validationResult && !validationResult.is_valid}
          >
            启动生成
          </GlassButton>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={16}>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="算法预设" key="presets">
              {renderPresets()}
            </TabPane>
            <TabPane tab="高级配置" key="advanced">
              {renderAdvancedConfig()}
            </TabPane>
          </Tabs>
        </Col>
        
        <Col span={8}>
          <div className="sticky top-4">
            {renderPerformanceEstimate()}
            {renderValidationResult()}
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default AdvancedMeshConfig;