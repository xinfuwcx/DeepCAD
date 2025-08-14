import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Card, Tabs, Radio, Slider, InputNumber, Row, Col, Space, Switch, 
  Tag, Button, Typography, Alert, Tooltip, Divider, Segmented, 
  message, Statistic, Popconfirm, Select, Modal, Progress
} from 'antd';
import { 
  ExperimentOutlined, DeploymentUnitOutlined, DatabaseOutlined, 
  ThunderboltOutlined, AimOutlined,
  EyeOutlined, SaveOutlined, ReloadOutlined
} from '@ant-design/icons';
import GeologyReconstructionViewport3D from './GeologyReconstructionViewport3D';
import { previewGeology, commitGeology } from '../../services/geologyReconstructionApi';

const { Text } = Typography;

// 接口定义
interface GeologyReconstructionPanelProps {
  domain: {
    xmin: number;
    xmax: number;
    ymin: number;
    ymax: number;
    nx?: number;
    ny?: number;
    nz?: number;
  };
  boreholes: Array<{
    id: string;
    x: number;
    y: number;
    elevation?: number;
    layers?: Array<{
      depth: number;
      material: string;
    }>;
  }>;
  onParamsChange?: (params: any) => void;
}

// 常量配置
const BYTES_PER_CELL = 8; // 每个网格单元占用字节数
const BASE_TIME_FACTOR = 1e-6; // 基础计算时间系数

// 算法参数预设
const ALGORITHM_PRESETS = {
  rbf: {
    fast: { radius: 100, smoothing: 0.1, kernelType: 'gaussian' },
    balanced: { radius: 200, smoothing: 0.5, kernelType: 'multiquadric' },
    accurate: { radius: 500, smoothing: 1.0, kernelType: 'thinplate' }
  },
  kriging: {
    fast: { range: 100, sill: 1.0, nugget: 0.1, model: 'exponential' },
    balanced: { range: 300, sill: 2.0, nugget: 0.3, model: 'gaussian' },
    accurate: { range: 800, sill: 5.0, nugget: 0.5, model: 'spherical' }
  },
  idw: {
    fast: { power: 1, searchRadius: 150, minPoints: 3 },
    balanced: { power: 2, searchRadius: 300, minPoints: 5 },
    accurate: { power: 3, searchRadius: 600, minPoints: 8 }
  }
};

// 工具函数
function estimateWaterLevel(boreholes: any[], domain: any): number {
  if (boreholes && boreholes.length > 0) {
    const elevations = boreholes.map(b => b.elevation ?? 0);
    return Math.max(...elevations) - 1;
  }
  return (domain as any).zmax ?? 0;
}

function estimateMemoryMB(N: number): number { 
  return (N * BYTES_PER_CELL / (1024 * 1024)); 
}

function estimateTimeSec(N: number): number { 
  return N * BASE_TIME_FACTOR; 
}

function calculateGridCells(domain: any): number {
  const nx = domain.nx || Math.ceil((domain.xmax - domain.xmin) / 10);
  const ny = domain.ny || Math.ceil((domain.ymax - domain.ymin) / 10);
  const nz = domain.nz || 20;
  return nx * ny * nz;
}

// 主组件
const GeologyReconstructionPanelV2: React.FC<GeologyReconstructionPanelProps> = ({
  domain,
  boreholes = [], // 提供默认值
  onParamsChange
}) => {
  // 状态管理
  const [algorithm, setAlgorithm] = useState<'rbf' | 'kriging' | 'idw'>('rbf');
  const [preset, setPreset] = useState<'fast' | 'balanced' | 'accurate'>('balanced');
  const [customParams, setCustomParams] = useState<any>({});
  const [waterLevel, setWaterLevel] = useState<number>(() => estimateWaterLevel(boreholes, domain));
  const [showWaterTable, setShowWaterTable] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  
  // 计算派生状态
  const totalCells = useMemo(() => calculateGridCells(domain), [domain]);
  const estimatedMemory = useMemo(() => estimateMemoryMB(totalCells), [totalCells]);
  const estimatedTime = useMemo(() => estimateTimeSec(totalCells), [totalCells]);

  // 获取当前参数
  const currentParams = useMemo(() => {
    const presetParams = ALGORITHM_PRESETS[algorithm][preset];
    return { ...presetParams, ...customParams };
  }, [algorithm, preset, customParams]);

  // 处理参数变化
  useEffect(() => {
    const params = {
      algorithm,
      ...currentParams,
      waterLevel: showWaterTable ? waterLevel : undefined
    };
    onParamsChange?.(params);
  }, [algorithm, currentParams, waterLevel, showWaterTable, onParamsChange]);

  // 参数更新处理
  const handleParamChange = useCallback((key: string, value: any) => {
    setCustomParams((prev: any) => ({ ...prev, [key]: value }));
  }, []);

  // 预设切换处理
  const handlePresetChange = useCallback((newPreset: 'fast' | 'balanced' | 'accurate') => {
    setPreset(newPreset);
    setCustomParams({}); // 清除自定义参数
  }, []);

  // 预览处理
  const handlePreview = useCallback(async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      const params = {
        algorithm,
        domain,
        boreholes,
        ...currentParams,
        waterLevel: showWaterTable ? waterLevel : undefined
      };

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const result = await previewGeology(params);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if ((result as any).success) {
        setQualityMetrics((result as any).metrics);
        setPreviewVisible(true);
        message.success('地质重建预览完成');
      } else {
        message.error((result as any).message || '预览失败');
      }
    } catch (error) {
      message.error('预览过程中发生错误');
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  }, [algorithm, domain, boreholes, currentParams, waterLevel, showWaterTable]);

  // 提交处理
  const handleCommit = useCallback(async () => {
    setIsProcessing(true);
    
    try {
      const params = {
        algorithm,
        domain,
        boreholes,
        ...currentParams,
        waterLevel: showWaterTable ? waterLevel : undefined
      };

      const result = await commitGeology(params);
      
      if ((result as any).success) {
        message.success('地质重建已提交并保存');
      } else {
        message.error((result as any).message || '提交失败');
      }
    } catch (error) {
      message.error('提交过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  }, [algorithm, domain, boreholes, currentParams, waterLevel, showWaterTable]);

  // 渲染算法参数表单
  const renderAlgorithmParams = () => {
    switch (algorithm) {
      case 'rbf':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={12}>
                <Text>影响半径</Text>
                <Tooltip title="控制每个数据点的影响范围，值越大插值越平滑">
                  <Slider
                    min={50}
                    max={1000}
                    value={currentParams.radius}
                    onChange={(value) => handleParamChange('radius', value)}
                    marks={{ 100: '100', 500: '500', 1000: '1000' }}
                  />
                </Tooltip>
              </Col>
              <Col span={12}>
                <Text>平滑因子</Text>
                <Tooltip title="控制插值的平滑程度，0为严格插值">
                  <Slider
                    min={0}
                    max={2}
                    step={0.1}
                    value={currentParams.smoothing}
                    onChange={(value) => handleParamChange('smoothing', value)}
                    marks={{ 0: '0', 1: '1', 2: '2' }}
                  />
                </Tooltip>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Text>核函数类型</Text>
                <Select
                  style={{ width: '100%' }}
                  value={currentParams.kernelType}
                  onChange={(value) => handleParamChange('kernelType', value)}
                  options={[
                    { value: 'gaussian', label: '高斯核 (平滑)' },
                    { value: 'multiquadric', label: '多二次核 (通用)' },
                    { value: 'thinplate', label: '薄板样条 (精确)' }
                  ]}
                />
              </Col>
            </Row>
          </Space>
        );

      case 'kriging':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text>变程 (Range)</Text>
                <Tooltip title="空间相关性的有效距离">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={50}
                    max={2000}
                    value={currentParams.range}
                    onChange={(value) => handleParamChange('range', value)}
                  />
                </Tooltip>
              </Col>
              <Col span={8}>
                <Text>基台值 (Sill)</Text>
                <Tooltip title="变异函数的最大值">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.5}
                    max={10}
                    step={0.5}
                    value={currentParams.sill}
                    onChange={(value) => handleParamChange('sill', value)}
                  />
                </Tooltip>
              </Col>
              <Col span={8}>
                <Text>块金值 (Nugget)</Text>
                <Tooltip title="短距离变化和测量误差">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={2}
                    step={0.1}
                    value={currentParams.nugget}
                    onChange={(value) => handleParamChange('nugget', value)}
                  />
                </Tooltip>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={24}>
                <Text>变异函数模型</Text>
                <Select
                  style={{ width: '100%' }}
                  value={currentParams.model}
                  onChange={(value) => handleParamChange('model', value)}
                  options={[
                    { value: 'spherical', label: '球状模型 (通用)' },
                    { value: 'exponential', label: '指数模型 (快速衰减)' },
                    { value: 'gaussian', label: '高斯模型 (平滑)' }
                  ]}
                />
              </Col>
            </Row>
          </Space>
        );

      case 'idw':
        return (
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={16}>
              <Col span={8}>
                <Text>权重指数</Text>
                <Tooltip title="距离权重的指数，值越大近点权重越大">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0.5}
                    max={5}
                    step={0.5}
                    value={currentParams.power}
                    onChange={(value) => handleParamChange('power', value)}
                  />
                </Tooltip>
              </Col>
              <Col span={8}>
                <Text>搜索半径</Text>
                <Tooltip title="参与插值计算的最大搜索距离">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={100}
                    max={1000}
                    value={currentParams.searchRadius}
                    onChange={(value) => handleParamChange('searchRadius', value)}
                  />
                </Tooltip>
              </Col>
              <Col span={8}>
                <Text>最少点数</Text>
                <Tooltip title="插值计算所需的最少数据点数">
                  <InputNumber
                    style={{ width: '100%' }}
                    min={2}
                    max={15}
                    value={currentParams.minPoints}
                    onChange={(value) => handleParamChange('minPoints', value)}
                  />
                </Tooltip>
              </Col>
            </Row>
          </Space>
        );

      default:
        return null;
    }
  };

  // 渲染质量指标
  const renderQualityMetrics = () => {
    if (!qualityMetrics) return null;

    return (
      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={8}>
          <Statistic
            title="均方根误差"
            value={qualityMetrics.rmse}
            precision={3}
            suffix="m"
            valueStyle={{ color: qualityMetrics.rmse < 0.5 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="相关系数"
            value={qualityMetrics.correlation}
            precision={3}
            valueStyle={{ color: qualityMetrics.correlation > 0.8 ? '#3f8600' : '#cf1322' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="计算时间"
            value={qualityMetrics.computeTime}
            precision={2}
            suffix="s"
          />
        </Col>
      </Row>
    );
  };

  // Tab项配置
  const tabItems = [
    {
      key: 'domain',
      label: (
        <span>
          <DatabaseOutlined />
          计算域
        </span>
      ),
      children: (
        <Card size="small">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Statistic title="X范围" value={`${domain.xmin} ~ ${domain.xmax}`} suffix="m" />
            </Col>
            <Col span={12}>
              <Statistic title="Y范围" value={`${domain.ymin} ~ ${domain.ymax}`} suffix="m" />
            </Col>
            <Col span={8}>
              <Statistic title="网格数" value={totalCells.toLocaleString()} />
            </Col>
            <Col span={8}>
              <Statistic title="内存估算" value={estimatedMemory.toFixed(1)} suffix="MB" />
            </Col>
            <Col span={8}>
              <Statistic title="时间估算" value={estimatedTime.toFixed(2)} suffix="s" />
            </Col>
          </Row>
        </Card>
      )
    },
    {
      key: 'boreholes',
      label: (
        <span>
          <AimOutlined />
          钻孔数据
        </span>
      ),
      children: (
        <Card size="small">
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={8}>
              <Statistic title="钻孔总数" value={boreholes.length} />
            </Col>
            <Col span={8}>
              <Statistic 
                title="有高程数据" 
                value={boreholes.filter(b => b.elevation !== undefined).length} 
              />
            </Col>
            <Col span={8}>
              <Statistic 
                title="有地层数据" 
                value={boreholes.filter(b => b.layers && b.layers.length > 0).length} 
              />
            </Col>
          </Row>
          
          {boreholes.length === 0 && (
            <Alert
              message="未找到钻孔数据"
              description="请先上传或导入钻孔数据后再进行地质重建"
              type="warning"
              showIcon
            />
          )}
        </Card>
      )
    },
    {
      key: 'params',
      label: (
        <span>
          <ExperimentOutlined />
          参数配置
        </span>
      ),
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 算法选择 */}
            <div>
              <Text strong>重建算法</Text>
              <Radio.Group
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                style={{ marginTop: 8, display: 'block' }}
              >
                <Space direction="vertical">
                  <Radio value="rbf">
                    径向基函数 (RBF) - 适用于密集数据，插值精确
                  </Radio>
                  <Radio value="kriging">
                    克里金插值 - 考虑空间相关性，提供不确定性估计
                  </Radio>
                  <Radio value="idw">
                    反距离权重 (IDW) - 计算快速，适用于稀疏数据
                  </Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 预设选择 */}
            <div>
              <Text strong>参数预设</Text>
              <Segmented
                value={preset}
                onChange={handlePresetChange}
                options={[
                  { label: '快速', value: 'fast', icon: <ThunderboltOutlined /> },
                  { label: '平衡', value: 'balanced', icon: <DeploymentUnitOutlined /> },
                  { label: '精确', value: 'accurate', icon: <AimOutlined /> }
                ]}
                style={{ marginTop: 8, display: 'block' }}
              />
            </div>

            <Divider />

            {/* 算法参数 */}
            <div>
              <Text strong>算法参数</Text>
              <div style={{ marginTop: 16 }}>
                {renderAlgorithmParams()}
              </div>
            </div>

            {/* 质量指标显示 */}
            {renderQualityMetrics()}
          </Space>
        </Card>
      )
    },
    {
      key: 'water',
      label: (
        <span>
          <DatabaseOutlined />
          水文参数
        </span>
      ),
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong>地下水位模拟</Text>
              <Switch
                checked={showWaterTable}
                onChange={setShowWaterTable}
                style={{ marginLeft: 16 }}
                checkedChildren="启用"
                unCheckedChildren="禁用"
              />
            </div>

            {showWaterTable && (
              <>
                <div>
                  <Text>水位标高 (m)</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 8 }}
                    value={waterLevel}
                    onChange={(value) => setWaterLevel(value || 0)}
                    placeholder="输入地下水位标高"
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    建议值: {estimateWaterLevel(boreholes, domain).toFixed(1)}m
                  </Text>
                </div>

                <Alert
                  message="水文模拟说明"
                  description="地下水位将影响土层饱和度和有效应力计算，请根据实际水文地质条件设置"
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              </>
            )}
          </Space>
        </Card>
      )
    }
  ];

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 遥测栏 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Row gutter={16} align="middle">
          <Col flex="auto">
            <Space>
              <Tag color="blue">{algorithm.toUpperCase()}</Tag>
              <Tag color="green">{preset}</Tag>
              <Text type="secondary">
                网格: {totalCells.toLocaleString()} | 
                内存: {estimatedMemory.toFixed(1)}MB | 
                耗时: {estimatedTime.toFixed(2)}s
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<EyeOutlined />}
                onClick={handlePreview}
                loading={isProcessing}
                disabled={boreholes.length === 0}
              >
                预览
              </Button>
              <Popconfirm
                title="确定提交地质重建任务？"
                description="这将开始正式的地质重建计算并保存结果"
                onConfirm={handleCommit}
                okText="确定"
                cancelText="取消"
              >
                <Button
                  type="default"
                  icon={<SaveOutlined />}
                  loading={isProcessing}
                  disabled={boreholes.length === 0}
                >
                  提交
                </Button>
              </Popconfirm>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => {
                  setCustomParams({});
                  setPreset('balanced');
                  message.info('参数已重置');
                }}
              >
                重置
              </Button>
            </Space>
          </Col>
        </Row>

        {/* 进度条 */}
        {isProcessing && (
          <Progress
            percent={progress}
            status="active"
            style={{ marginTop: 12 }}
          />
        )}
      </Card>

      {/* 主要内容区域 */}
      <Card style={{ flex: 1 }}>
        <Tabs
          defaultActiveKey="params"
          items={tabItems}
          type="card"
          size="small"
        />
      </Card>

      {/* 3D预览模态框 */}
      <Modal
        title="地质重建预览"
        open={previewVisible}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setPreviewVisible(false)}>
            关闭
          </Button>,
          <Button key="commit" type="primary" onClick={handleCommit}>
            确认并提交
          </Button>
        ]}
      >
        <div style={{ height: 400 }}>
          <GeologyReconstructionViewport3D />
        </div>
      </Modal>
    </div>
  );
};

export default GeologyReconstructionPanelV2;
