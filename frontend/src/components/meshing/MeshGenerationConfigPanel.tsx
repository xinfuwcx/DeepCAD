import React, { useState, useEffect } from 'react';
import {
  Card,
  Form,
  Input,
  Select,
  Slider,
  Switch,
  Button,
  Space,
  Alert,
  Progress,
  Collapse,
  Tooltip,
  InputNumber,
  Row,
  Col,
  Tag,
  Typography,
  Divider
} from 'antd';
import {
  SettingOutlined,
  PlayCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  ExperimentOutlined
} from '@ant-design/icons';

const { Option } = Select;
const { Panel } = Collapse;
const { Text, Title } = Typography;

// 网格生成配置接口
interface MeshGenerationConfig {
  boundingBoxMin: [number, number, number];
  boundingBoxMax: [number, number, number];
  meshSize: number;
  algorithm: number;
  algorithm3D: number;
  meshQuality: 'fast' | 'medium' | 'high' | 'ultra';
  enableFragment: boolean;
  fragmentSettings?: {
    tolerance: number;
    booleanTolerance: number;
    optimizeAfterFragment: boolean;
  };
  qualityOptimization: {
    enabled: boolean;
    threshold: number;
    maxIterations: number;
  };
}

// 网格算法配置
const MESH_ALGORITHMS = {
  1: { name: 'MeshAdapt', description: '适应性算法，适合复杂几何' },
  2: { name: 'Automatic', description: '自动选择算法' },
  5: { name: 'Delaunay', description: 'Delaunay三角化' },
  6: { name: 'Frontal-Delaunay', description: '前沿-Delaunay算法' },
  7: { name: 'BAMG', description: 'BAMG各向异性算法' },
  8: { name: 'Frontal-Quad', description: '前沿四边形算法' }
};

const ALGORITHM_3D = {
  1: { name: 'Delaunay', description: '3D Delaunay算法' },
  4: { name: 'Frontal', description: '3D前沿算法' },
  7: { name: 'MMG3D', description: 'MMG3D重网格算法' },
  9: { name: 'R-tree', description: 'R-tree空间划分' },
  10: { name: 'HXT', description: 'HXT并行四面体算法' }
};

interface MeshGenerationConfigPanelProps {
  onConfigChange?: (config: MeshGenerationConfig) => void;
  onStartGeneration?: (config: MeshGenerationConfig) => void;
  isGenerating?: boolean;
  progress?: number;
  currentMessage?: string;
}

const MeshGenerationConfigPanel: React.FC<MeshGenerationConfigPanelProps> = ({
  onConfigChange,
  onStartGeneration,
  isGenerating = false,
  progress = 0,
  currentMessage = ''
}) => {
  const [form] = Form.useForm();
  const [config, setConfig] = useState<MeshGenerationConfig>({
    boundingBoxMin: [-25, -25, -15],
    boundingBoxMax: [25, 25, 5],
    meshSize: 2.0,
    algorithm: 6,
    algorithm3D: 1,
    meshQuality: 'medium',
    enableFragment: false,
    qualityOptimization: {
      enabled: true,
      threshold: 0.7,
      maxIterations: 3
    }
  });

  // 质量预设配置
  const qualityPresets = {
    fast: {
      meshSize: 3.0,
      algorithm: 2,
      algorithm3D: 1,
      optimization: false,
      description: '快速生成，适合原型设计'
    },
    medium: {
      meshSize: 2.0,
      algorithm: 6,
      algorithm3D: 1,
      optimization: true,
      description: '平衡质量和速度，推荐用于工程分析'
    },
    high: {
      meshSize: 1.0,
      algorithm: 1,
      algorithm3D: 4,
      optimization: true,
      description: '高质量网格，适合精确分析'
    },
    ultra: {
      meshSize: 0.5,
      algorithm: 1,
      algorithm3D: 7,
      optimization: true,
      description: '超高质量，计算时间较长'
    }
  };

  // 处理配置变化
  const handleConfigChange = (changedValues: any, allValues: any) => {
    const newConfig = { ...config, ...allValues };
    setConfig(newConfig);
    onConfigChange?.(newConfig);
  };

  // 应用质量预设
  const applyQualityPreset = (quality: keyof typeof qualityPresets) => {
    const preset = qualityPresets[quality];
    const newConfig = {
      ...config,
      meshSize: preset.meshSize,
      algorithm: preset.algorithm,
      algorithm3D: preset.algorithm3D,
      meshQuality: quality,
      qualityOptimization: {
        ...config.qualityOptimization,
        enabled: preset.optimization
      }
    };
    
    setConfig(newConfig);
    form.setFieldsValue(newConfig);
    onConfigChange?.(newConfig);
  };

  // 开始网格生成
  const handleStartGeneration = () => {
    form.validateFields().then(values => {
      onStartGeneration?.(config);
    });
  };

  // 计算预估单元数量
  const estimateElementCount = () => {
    const volume = (config.boundingBoxMax[0] - config.boundingBoxMin[0]) *
                   (config.boundingBoxMax[1] - config.boundingBoxMin[1]) *
                   (config.boundingBoxMax[2] - config.boundingBoxMin[2]);
    const elementVolume = Math.pow(config.meshSize, 3) / 6; // 四面体体积近似
    return Math.round(volume / elementVolume);
  };

  return (
    <Card
      title={
        <Space>
          <SettingOutlined style={{ color: '#00d9ff' }} />
          <span>网格生成配置</span>
          <Tag color="#00d9ff">3号模块</Tag>
        </Space>
      }
      extra={
        <Space>
          <Tooltip title="预估单元数量">
            <Tag color="blue">{estimateElementCount().toLocaleString()} 单元</Tag>
          </Tooltip>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            onClick={handleStartGeneration}
            loading={isGenerating}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '开始生成'}
          </Button>
        </Space>
      }
      style={{ height: '100%' }}
    >
      {/* 进度显示 */}
      {isGenerating && (
        <Alert
          message="网格生成进行中"
          description={
            <Space direction="vertical" style={{ width: '100%' }}>
              <Progress percent={progress} status="active" />
              <Text type="secondary">{currentMessage}</Text>
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
        {/* 质量预设 */}
        <Card size="small" title="质量预设" style={{ marginBottom: 16 }}>
          <Row gutter={[8, 8]}>
            {Object.entries(qualityPresets).map(([key, preset]) => (
              <Col span={6} key={key}>
                <Button
                  type={config.meshQuality === key ? 'primary' : 'default'}
                  size="small"
                  block
                  onClick={() => applyQualityPreset(key as any)}
                  icon={key === 'ultra' ? <ThunderboltOutlined /> : undefined}
                >
                  {key.toUpperCase()}
                </Button>
                <Text type="secondary" style={{ fontSize: '11px', display: 'block', textAlign: 'center' }}>
                  {preset.description}
                </Text>
              </Col>
            ))}
          </Row>
        </Card>

        <Collapse defaultActiveKey={['geometry', 'algorithm']} ghost>
          {/* 几何设置 */}
          <Panel header="几何边界" key="geometry">
            <Row gutter={16}>
              <Col span={12}>
                <Title level={5}>最小边界</Title>
                <Space.Compact>
                  <Form.Item name={['boundingBoxMin', 0]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="X min" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={['boundingBoxMin', 1]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="Y min" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={['boundingBoxMin', 2]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="Z min" style={{ width: '100%' }} />
                  </Form.Item>
                </Space.Compact>
              </Col>
              <Col span={12}>
                <Title level={5}>最大边界</Title>
                <Space.Compact>
                  <Form.Item name={['boundingBoxMax', 0]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="X max" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={['boundingBoxMax', 1]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="Y max" style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name={['boundingBoxMax', 2]} style={{ marginBottom: 8 }}>
                    <InputNumber placeholder="Z max" style={{ width: '100%' }} />
                  </Form.Item>
                </Space.Compact>
              </Col>
            </Row>
          </Panel>

          {/* 网格算法 */}
          <Panel header="算法设置" key="algorithm">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item 
                  label={
                    <Space>
                      网格尺寸
                      <Tooltip title="控制网格精细程度，越小越精细">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="meshSize"
                >
                  <Slider
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    marks={{
                      0.5: '精细',
                      1.0: '细',
                      2.0: '中等',
                      3.0: '粗',
                      5.0: '很粗'
                    }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="网格尺寸值"
                  name="meshSize"
                >
                  <InputNumber
                    min={0.1}
                    max={10.0}
                    step={0.1}
                    style={{ width: '100%' }}
                    addonAfter="m"
                  />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label={
                    <Space>
                      2D算法
                      <Tooltip title="表面网格生成算法">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="algorithm"
                >
                  <Select>
                    {Object.entries(MESH_ALGORITHMS).map(([key, alg]) => (
                      <Option key={key} value={parseInt(key)}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{alg.name}</Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {alg.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label={
                    <Space>
                      3D算法
                      <Tooltip title="体积网格生成算法">
                        <InfoCircleOutlined />
                      </Tooltip>
                    </Space>
                  }
                  name="algorithm3D"
                >
                  <Select>
                    {Object.entries(ALGORITHM_3D).map(([key, alg]) => (
                      <Option key={key} value={parseInt(key)}>
                        <Space direction="vertical" size={0}>
                          <Text strong>{alg.name}</Text>
                          <Text type="secondary" style={{ fontSize: '11px' }}>
                            {alg.description}
                          </Text>
                        </Space>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Panel>

          {/* Fragment设置 */}
          <Panel 
            header={
              <Space>
                Fragment切割
                <Tag color="orange">高级功能</Tag>
              </Space>
            } 
            key="fragment"
          >
            <Form.Item
              label="启用Fragment切割"
              name="enableFragment"
              valuePropName="checked"
            >
              <Switch 
                checkedChildren="开启" 
                unCheckedChildren="关闭"
                onChange={(checked) => {
                  if (checked) {
                    setConfig({
                      ...config,
                      enableFragment: true,
                      fragmentSettings: {
                        tolerance: 1e-10,
                        booleanTolerance: 1e-10,
                        optimizeAfterFragment: true
                      }
                    });
                  }
                }}
              />
            </Form.Item>

            {config.enableFragment && (
              <Alert
                message="Fragment切割功能"
                description="启用后将支持土域切割、开挖区域定义等高级几何操作"
                type="info"
                showIcon
                icon={<ExperimentOutlined />}
              />
            )}
          </Panel>

          {/* 质量优化 */}
          <Panel header="质量优化" key="optimization">
            <Form.Item
              label="启用自动质量优化"
              name={['qualityOptimization', 'enabled']}
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            {config.qualityOptimization.enabled && (
              <>
                <Form.Item
                  label="质量阈值"
                  name={['qualityOptimization', 'threshold']}
                  tooltip="低于此评分的网格将自动优化"
                >
                  <Slider
                    min={0.3}
                    max={0.9}
                    step={0.1}
                    marks={{
                      0.3: '宽松',
                      0.5: '一般',
                      0.7: '严格',
                      0.9: '极严格'
                    }}
                  />
                </Form.Item>

                <Form.Item
                  label="最大优化迭代次数"
                  name={['qualityOptimization', 'maxIterations']}
                >
                  <InputNumber min={1} max={10} style={{ width: '100%' }} />
                </Form.Item>
              </>
            )}
          </Panel>
        </Collapse>
      </Form>
    </Card>
  );
};

export default MeshGenerationConfigPanel;