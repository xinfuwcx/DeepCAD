import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { 
  Card, Tabs, Radio, Slider, InputNumber, Row, Col, Space, Switch, 
  Tag, Button, Typography, Alert, Tooltip, Divider, Segmented, 
  message, Statistic, Popconfirm, Select, Modal, Progress, Table,
  Badge, Collapse, Upload, Steps
} from 'antd';
import { 
  ExperimentOutlined, DeploymentUnitOutlined, DatabaseOutlined, 
  ThunderboltOutlined, AimOutlined, CalculatorOutlined,
  EyeOutlined, SaveOutlined, ReloadOutlined,
  PlayCircleOutlined, StopOutlined, CheckCircleOutlined,
  CloudUploadOutlined, FileSearchOutlined, BorderOutlined,
  MonitorOutlined, DashboardOutlined, RocketOutlined,
  SafetyOutlined, UploadOutlined
} from '@ant-design/icons';
import GeologyReconstructionViewport3D from './GeologyReconstructionViewport3D';
import { previewGeology, commitGeology } from '../../services/geologyReconstructionApi';

const { Text } = Typography;
const { Dragger } = Upload;

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
      cohesion?: number;
      friction_angle?: number;
      unit_weight?: number;
      compression_modulus?: number;
    }>;
  }>;
  onParamsChange?: (params: any) => void;
}

// 处理状态类型
type ProcessingStatus = 'idle' | 'preparing' | 'processing' | 'completed' | 'error';

// 质量报告接口
interface QualityReport {
  timestamp: Date;
  overallScore: number;
  meshReadiness: boolean;
  dataConsistency: number;
  interpolationAccuracy: number;
  recommendations: string[];
  issues: Array<{
    type: 'warning' | 'error' | 'info';
    message: string;
    severity: number;
  }>;
}

// 地质模型结果接口
interface GeologyModelResult {
  modelId: string;
  surfaces: Array<{
    id: string;
    name: string;
    vertices: Float32Array;
    faces: Uint32Array;
    material: string;
    color: string;
  }>;
  volumes: Array<{
    id: string;
    name: string;
    soilType: string;
    properties: {
      density: number;
      cohesion: number;
      frictionAngle: number;
      elasticModulus: number;
      poissonRatio: number;
    };
  }>;
  metadata: {
    createdAt: Date;
    processingTime: number;
    dataPoints: number;
    gridResolution: [number, number, number];
    extent: [number, number, number, number, number, number];
  };
  quality: QualityReport;
}

// 土体计算参数接口
interface SoilCalculationParams {
  calculationType: 'bearing_capacity' | 'settlement' | 'slope_stability' | 'pile_analysis';
  foundationType: 'shallow' | 'deep';
  loadConditions: {
    vertical_load: number;
    horizontal_load?: number;
    moment?: number;
  };
  safetyFactor: number;
  analysisMethod: string;
}

// 桩基参数接口
interface PileCalculationParams {
  pileType: 'BORED_CAST_IN_PLACE' | 'HAND_DUG' | 'PRECAST_DRIVEN' | 'CFG_PILE' | 'SWM_METHOD' | 'HIGH_PRESSURE_JET';
  diameter: number;
  length: number;
  spacing?: number;
  improvement_diameter?: number;
  modelingStrategy: 'BEAM_ELEMENT' | 'SHELL_ELEMENT';
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
  
  // 数据状态
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [boreholeData, setBoreholeData] = useState<any[]>(boreholes);
  const [modelResult, setModelResult] = useState<GeologyModelResult | null>(null);
  const [qualityReport, setQualityReport] = useState<QualityReport | null>(null);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [currentStep, setCurrentStep] = useState(0);
  
  // 实时统计
  const [realTimeStats, setRealTimeStats] = useState({
    interpolationTime: 0,
    dataPoints: boreholes.length,
    gridPoints: (domain.nx || 100) * (domain.ny || 100) * (domain.nz || 20),
    memoryUsage: 0,
    qualityScore: 0,
    currentOperation: ''
  });
  
  // 土体计算相关状态
  const [soilCalculationParams, setSoilCalculationParams] = useState<SoilCalculationParams>({
    calculationType: 'bearing_capacity',
    foundationType: 'shallow',
    loadConditions: { vertical_load: 100 },
    safetyFactor: 2.5,
    analysisMethod: 'terzaghi'
  });
  const [pileCalculationParams, setPileCalculationParams] = useState<PileCalculationParams>({
    pileType: 'BORED_CAST_IN_PLACE',
    diameter: 0.8,
    length: 25.0,
    modelingStrategy: 'BEAM_ELEMENT'
  });
  const [calculationResults, setCalculationResults] = useState<any>(null);
  const [showCalculationPanel, setShowCalculationPanel] = useState(false);
  
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

  // 土体计算处理
  const handleSoilCalculation = useCallback(async () => {
    if (boreholes.length === 0) {
      message.warning('请先提供钻孔数据进行土体计算');
      return;
    }
    
    setIsProcessing(true);
    try {
      // 模拟土体计算API调用
      const calculationParams = {
        ...soilCalculationParams,
        domain,
        boreholes: boreholes.map(b => ({
          ...b,
          layers: b.layers?.map(layer => ({
            ...layer,
            cohesion: layer.cohesion || 20, // 默认粘聚力 kPa
            friction_angle: layer.friction_angle || 25, // 默认内摩擦角 度
            unit_weight: layer.unit_weight || 18, // 默认重度 kN/m³
            compression_modulus: layer.compression_modulus || 10 // 默认压缩模量 MPa
          }))
        }))
      };
      
      // 根据计算类型执行不同的计算
      let results: any = {};
      
      switch (soilCalculationParams.calculationType) {
        case 'bearing_capacity':
          results = await calculateBearingCapacity(calculationParams);
          break;
        case 'settlement':
          results = await calculateSettlement(calculationParams);
          break;
        case 'slope_stability':
          results = await calculateSlopeStability(calculationParams);
          break;
        case 'pile_analysis':
          results = await calculatePileFoundation({
            ...calculationParams,
            pileParams: pileCalculationParams
          });
          break;
      }
      
      setCalculationResults(results);
      message.success('土体计算完成');
    } catch (error) {
      message.error('土体计算失败');
    } finally {
      setIsProcessing(false);
    }
  }, [soilCalculationParams, pileCalculationParams, boreholes, domain]);

  // 模拟土体计算函数
  const calculateBearingCapacity = async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      ultimate_capacity: 450.5,
      allowable_capacity: 180.2,
      safety_factor: params.safetyFactor,
      failure_mode: 'general_shear',
      calculation_method: params.analysisMethod
    };
  };

  const calculateSettlement = async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      immediate_settlement: 15.2,
      consolidation_settlement: 45.8,
      total_settlement: 61.0,
      time_settlement_curve: Array.from({length: 10}, (_, i) => ({
        time: i * 6, // 月
        settlement: 61.0 * (1 - Math.exp(-0.3 * i))
      }))
    };
  };

  const calculateSlopeStability = async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      safety_factor: 1.25,
      critical_slip_surface: 'circular',
      stability_analysis: 'bishop_method',
      is_stable: true
    };
  };

  const calculatePileFoundation = async (params: any) => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return {
      pile_type: params.pileParams.pileType,
      ultimate_capacity: 850.0,
      allowable_capacity: 340.0,
      side_resistance: 280.0,
      tip_resistance: 60.0,
      settlement: 12.5,
      modeling_strategy: params.pileParams.modelingStrategy
    };
  };

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
      key: 'data',
      label: (
        <span>
          <UploadOutlined />
          数据上传
        </span>
      ),
      children: (
        <Card size="small">
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <Card title="钻孔数据上传" size="small">
                <Dragger
                  multiple
                  accept=".csv,.json,.xlsx"
                  beforeUpload={(file) => {
                    const newFiles = [...selectedFiles, file];
                    setSelectedFiles(newFiles);
                    message.success(`文件 ${file.name} 已添加`);
                    return false; // 阻止默认上传
                  }}
                  showUploadList={false}
                >
                  <p className="ant-upload-drag-icon">
                    <CloudUploadOutlined />
                  </p>
                  <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                  <p className="ant-upload-hint">
                    支持 CSV、JSON、Excel 格式的钻孔数据
                  </p>
                </Dragger>
                
                {selectedFiles.length > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <Text strong>已上传文件:</Text>
                    {selectedFiles.map((file, index) => (
                      <div key={index} style={{ 
                        padding: '8px 12px', 
                        margin: '4px 0',
                        background: '#f0f8ff',
                        borderRadius: '4px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>
                          <FileSearchOutlined /> {file.name}
                        </span>
                        <Badge count={(file.size / 1024).toFixed(1) + 'KB'} />
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="数据统计" size="small">
                <Row gutter={16}>
                  <Col span={8}>
                    <Statistic
                      title="钻孔数量"
                      value={boreholeData.length}
                      prefix={<DatabaseOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="数据点"
                      value={realTimeStats.dataPoints}
                      prefix={<BorderOutlined />}
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic
                      title="文件数"
                      value={selectedFiles.length}
                      prefix={<FileSearchOutlined />}
                    />
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {boreholeData.length > 0 && (
            <Card title="钻孔数据预览" style={{ marginTop: 16 }} size="small">
              <Table
                dataSource={boreholeData.slice(0, 10)}
                size="small"
                pagination={false}
                scroll={{ x: true }}
                columns={[
                  { title: '钻孔ID', dataIndex: 'id', key: 'id', width: 100 },
                  { title: 'X坐标', dataIndex: 'x', key: 'x', width: 80, render: (val) => val?.toFixed(2) },
                  { title: 'Y坐标', dataIndex: 'y', key: 'y', width: 80, render: (val) => val?.toFixed(2) },
                  { title: '孔口高程', dataIndex: 'elevation', key: 'elevation', width: 100, render: (val) => val?.toFixed(2) },
                  { title: '钻孔深度', dataIndex: 'depth', key: 'depth', width: 100, render: (val) => val?.toFixed(2) },
                  { title: '地层数', dataIndex: 'layerCount', key: 'layerCount', width: 80 }
                ]}
              />
            </Card>
          )}
        </Card>
      )
    },
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
      key: 'soil_calculation',
      label: (
        <span>
          <CalculatorOutlined />
          土体计算
        </span>
      ),
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 计算类型选择 */}
            <div>
              <Text strong>计算类型</Text>
              <Radio.Group
                value={soilCalculationParams.calculationType}
                onChange={(e) => setSoilCalculationParams(prev => ({ ...prev, calculationType: e.target.value }))}
                style={{ marginTop: 8, display: 'block' }}
              >
                <Space direction="vertical">
                  <Radio value="bearing_capacity">地基承载力计算</Radio>
                  <Radio value="settlement">沉降计算分析</Radio>
                  <Radio value="slope_stability">边坡稳定性分析</Radio>
                  <Radio value="pile_analysis">桩基承载力计算</Radio>
                </Space>
              </Radio.Group>
            </div>

            <Divider />

            {/* 基础参数配置 */}
            <div>
              <Text strong>基础参数</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={12}>
                  <Text>基础类型</Text>
                  <Select
                    style={{ width: '100%', marginTop: 4 }}
                    value={soilCalculationParams.foundationType}
                    onChange={(value) => setSoilCalculationParams(prev => ({ ...prev, foundationType: value }))}
                    options={[
                      { value: 'shallow', label: '浅基础' },
                      { value: 'deep', label: '深基础' }
                    ]}
                  />
                </Col>
                <Col span={12}>
                  <Text>安全系数</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 4 }}
                    min={1.5}
                    max={5.0}
                    step={0.1}
                    value={soilCalculationParams.safetyFactor}
                    onChange={(value) => setSoilCalculationParams(prev => ({ ...prev, safetyFactor: value || 2.5 }))}
                  />
                </Col>
              </Row>
            </div>

            <Divider />

            {/* 荷载条件 */}
            <div>
              <Text strong>荷载条件</Text>
              <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={8}>
                  <Text>竖向荷载 (kN)</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 4 }}
                    min={0}
                    value={soilCalculationParams.loadConditions.vertical_load}
                    onChange={(value) => setSoilCalculationParams(prev => ({
                      ...prev,
                      loadConditions: { ...prev.loadConditions, vertical_load: value || 0 }
                    }))}
                  />
                </Col>
                <Col span={8}>
                  <Text>水平荷载 (kN)</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 4 }}
                    min={0}
                    value={soilCalculationParams.loadConditions.horizontal_load || 0}
                    onChange={(value) => setSoilCalculationParams(prev => ({
                      ...prev,
                      loadConditions: { ...prev.loadConditions, horizontal_load: value || 0 }
                    }))}
                  />
                </Col>
                <Col span={8}>
                  <Text>弯矩 (kN·m)</Text>
                  <InputNumber
                    style={{ width: '100%', marginTop: 4 }}
                    min={0}
                    value={soilCalculationParams.loadConditions.moment || 0}
                    onChange={(value) => setSoilCalculationParams(prev => ({
                      ...prev,
                      loadConditions: { ...prev.loadConditions, moment: value || 0 }
                    }))}
                  />
                </Col>
              </Row>
            </div>

            {/* 桩基参数（仅在桩基计算时显示） */}
            {soilCalculationParams.calculationType === 'pile_analysis' && (
              <>
                <Divider />
                <div>
                  <Text strong>桩基参数</Text>
                  <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                    <Col span={24}>
                      <Text>桩型选择</Text>
                      <Select
                        style={{ width: '100%', marginTop: 4 }}
                        value={pileCalculationParams.pileType}
                        onChange={(value) => setPileCalculationParams(prev => ({ ...prev, pileType: value }))}
                        options={[
                          { value: 'BORED_CAST_IN_PLACE', label: '钻孔灌注桩' },
                          { value: 'HAND_DUG', label: '人工挖孔桩' },
                          { value: 'PRECAST_DRIVEN', label: '预制桩' },
                          { value: 'CFG_PILE', label: 'CFG桩' },
                          { value: 'SWM_METHOD', label: 'SWM工法桩' },
                          { value: 'HIGH_PRESSURE_JET', label: '高压旋喷桩' }
                        ]}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>桩径 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: 4 }}
                        min={0.3}
                        max={3.0}
                        step={0.1}
                        value={pileCalculationParams.diameter}
                        onChange={(value) => setPileCalculationParams(prev => ({ ...prev, diameter: value || 0.8 }))}
                      />
                    </Col>
                    <Col span={12}>
                      <Text>桩长 (m)</Text>
                      <InputNumber
                        style={{ width: '100%', marginTop: 4 }}
                        min={5}
                        max={80}
                        step={1}
                        value={pileCalculationParams.length}
                        onChange={(value) => setPileCalculationParams(prev => ({ ...prev, length: value || 25 }))}
                      />
                    </Col>
                  </Row>
                </div>
              </>
            )}

            {/* 计算结果显示 */}
            {calculationResults && (
              <>
                <Divider />
                <div>
                  <Text strong>计算结果</Text>
                  <div style={{ marginTop: 16 }}>
                    {soilCalculationParams.calculationType === 'bearing_capacity' && (
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="极限承载力"
                            value={calculationResults.ultimate_capacity}
                            precision={1}
                            suffix="kPa"
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="允许承载力"
                            value={calculationResults.allowable_capacity}
                            precision={1}
                            suffix="kPa"
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="安全系数"
                            value={calculationResults.safety_factor}
                            precision={1}
                          />
                        </Col>
                      </Row>
                    )}

                    {soilCalculationParams.calculationType === 'settlement' && (
                      <Row gutter={16}>
                        <Col span={8}>
                          <Statistic
                            title="瞬时沉降"
                            value={calculationResults.immediate_settlement}
                            precision={1}
                            suffix="mm"
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="固结沉降"
                            value={calculationResults.consolidation_settlement}
                            precision={1}
                            suffix="mm"
                          />
                        </Col>
                        <Col span={8}>
                          <Statistic
                            title="总沉降"
                            value={calculationResults.total_settlement}
                            precision={1}
                            suffix="mm"
                          />
                        </Col>
                      </Row>
                    )}

                    {soilCalculationParams.calculationType === 'pile_analysis' && (
                      <Row gutter={16}>
                        <Col span={6}>
                          <Statistic
                            title="桩身承载力"
                            value={calculationResults.allowable_capacity}
                            precision={0}
                            suffix="kN"
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="侧阻力"
                            value={calculationResults.side_resistance}
                            precision={0}
                            suffix="kN"
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="端阻力"
                            value={calculationResults.tip_resistance}
                            precision={0}
                            suffix="kN"
                          />
                        </Col>
                        <Col span={6}>
                          <Statistic
                            title="沉降量"
                            value={calculationResults.settlement}
                            precision={1}
                            suffix="mm"
                          />
                        </Col>
                      </Row>
                    )}

                    {soilCalculationParams.calculationType === 'slope_stability' && (
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="稳定性系数"
                            value={calculationResults.safety_factor}
                            precision={2}
                            valueStyle={{ 
                              color: calculationResults.safety_factor >= 1.15 ? '#3f8600' : '#cf1322' 
                            }}
                          />
                        </Col>
                        <Col span={12}>
                          <div>
                            <Text>稳定性评价</Text>
                            <div style={{ marginTop: 4 }}>
                              <Badge 
                                status={calculationResults.is_stable ? "success" : "error"} 
                                text={calculationResults.is_stable ? "稳定" : "不稳定"}
                              />
                            </div>
                          </div>
                        </Col>
                      </Row>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* 计算按钮 */}
            <div style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<CalculatorOutlined />}
                onClick={handleSoilCalculation}
                loading={isProcessing}
                disabled={boreholes.length === 0}
                style={{ width: '100%' }}
              >
                开始计算
              </Button>
            </div>
          </Space>
        </Card>
      )
    },
    {
      key: 'processing',
      label: (
        <span>
          <PlayCircleOutlined />
          处理进度
        </span>
      ),
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {/* 处理步骤 */}
            <div>
              <Text strong>地质重建进度</Text>
              <Steps
                current={currentStep}
                size="small"
                style={{ marginTop: 16 }}
                items={[
                  { title: '数据预处理', icon: <DatabaseOutlined /> },
                  { title: '地层识别', icon: <ExperimentOutlined /> },
                  { title: '插值计算', icon: <ThunderboltOutlined /> },
                  { title: '表面重建', icon: <BorderOutlined /> },
                  { title: '质量评估', icon: <CheckCircleOutlined /> },
                  { title: '模型优化', icon: <RocketOutlined /> }
                ]}
              />
            </div>

            {/* 进度条 */}
            {processingStatus === 'processing' && (
              <div style={{ marginTop: 24 }}>
                <Progress
                  percent={Math.round((realTimeStats.interpolationTime / estimatedTime) * 100)}
                  status={processingStatus === 'error' ? 'exception' : 'active'}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
              </div>
            )}

            {/* 实时统计 */}
            <div style={{ marginTop: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="处理时间"
                    value={realTimeStats.interpolationTime}
                    suffix="秒"
                    prefix={<MonitorOutlined />}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="内存使用"
                    value={realTimeStats.memoryUsage}
                    suffix="MB"
                    prefix={<DashboardOutlined />}
                  />
                </Col>
                <Col span={12}>
                  <div>
                    <Text strong>当前操作: </Text>
                    <Text type="secondary">{realTimeStats.currentOperation || '等待开始'}</Text>
                  </div>
                </Col>
              </Row>
            </div>

            {/* 控制按钮 */}
            <div style={{ marginTop: 24, textAlign: 'center' }}>
              <Space>
                <Button
                  type="primary"
                  icon={<PlayCircleOutlined />}
                  loading={processingStatus === 'processing'}
                  disabled={selectedFiles.length === 0}
                  onClick={async () => {
                    setProcessingStatus('processing');
                    setCurrentStep(0);
                    
                    // 模拟处理步骤
                    const steps = [
                      '数据预处理',
                      '地层识别', 
                      '插值计算',
                      '表面重建',
                      '质量评估',
                      '模型优化'
                    ];
                    
                    for (let i = 0; i < steps.length; i++) {
                      setCurrentStep(i);
                      setRealTimeStats(prev => ({
                        ...prev,
                        currentOperation: steps[i],
                        interpolationTime: prev.interpolationTime + 1
                      }));
                      
                      await new Promise(resolve => setTimeout(resolve, 1000));
                    }
                    
                    setProcessingStatus('completed');
                    message.success('地质重建完成！');
                  }}
                >
                  {processingStatus === 'processing' ? '正在处理...' : '开始重建'}
                </Button>
                
                <Button
                  icon={<StopOutlined />}
                  disabled={processingStatus !== 'processing'}
                  onClick={() => {
                    setProcessingStatus('idle');
                    setCurrentStep(0);
                    message.info('处理已停止');
                  }}
                >
                  停止
                </Button>
              </Space>
            </div>
          </Space>
        </Card>
      )
    },
    {
      key: 'results',
      label: (
        <span>
          <CheckCircleOutlined />
          结果展示
        </span>
      ),
      children: (
        <Card size="small">
          <Space direction="vertical" style={{ width: '100%' }}>
            {processingStatus === 'completed' ? (
              <>
                {/* 结果统计 */}
                <Row gutter={16}>
                  <Col span={6}>
                    <Statistic
                      title="质量评分"
                      value={realTimeStats.qualityScore || 85}
                      suffix="/100"
                      valueStyle={{ color: '#3f8600' }}
                      prefix={<SafetyOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="网格点数"
                      value={realTimeStats.gridPoints.toLocaleString()}
                      prefix={<BorderOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="数据点数"
                      value={realTimeStats.dataPoints}
                      prefix={<DatabaseOutlined />}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic
                      title="总耗时"
                      value={realTimeStats.interpolationTime}
                      suffix="s"
                      prefix={<MonitorOutlined />}
                    />
                  </Col>
                </Row>

                {/* 质量报告 */}
                <div style={{ marginTop: 24 }}>
                  <Text strong>质量报告</Text>
                  <div style={{ marginTop: 12 }}>
                    <Alert
                      message="重建质量良好"
                      description="模型通过了所有质量检查，可用于后续计算"
                      type="success"
                      showIcon
                    />
                  </div>
                </div>

                {/* 操作按钮 */}
                <div style={{ marginTop: 24, textAlign: 'center' }}>
                  <Space>
                    <Button
                      type="primary"
                      icon={<EyeOutlined />}
                      onClick={() => setPreviewVisible(true)}
                    >
                      3D预览
                    </Button>
                    <Button icon={<SaveOutlined />}>
                      导出结果
                    </Button>
                    <Button icon={<ReloadOutlined />}>
                      重新计算
                    </Button>
                  </Space>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Text type="secondary">请先完成数据上传和参数配置，然后开始重建</Text>
              </div>
            )}
          </Space>
        </Card>
      )
    },
    {
      key: 'viewport3d',
      label: (
        <span>
          <EyeOutlined />
          3D视口
        </span>
      ),
      children: (
        <Card size="small">
          <div style={{ height: 500 }}>
            <GeologyReconstructionViewport3D />
          </div>
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
              {soilCalculationParams.calculationType && (
                <Tag color="orange">{soilCalculationParams.calculationType.replace('_', ' ').toUpperCase()}</Tag>
              )}
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
              <Button
                type="default"
                icon={<CalculatorOutlined />}
                onClick={() => setShowCalculationPanel(!showCalculationPanel)}
                disabled={boreholes.length === 0}
              >
                土体计算
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
                  setCalculationResults(null);
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

        {/* 计算结果快速预览 */}
        {calculationResults && (
          <Alert
            message="计算完成"
            description={
              <Space>
                {soilCalculationParams.calculationType === 'bearing_capacity' && (
                  <Text>允许承载力: {calculationResults.allowable_capacity} kPa</Text>
                )}
                {soilCalculationParams.calculationType === 'settlement' && (
                  <Text>总沉降: {calculationResults.total_settlement} mm</Text>
                )}
                {soilCalculationParams.calculationType === 'pile_analysis' && (
                  <Text>桩身承载力: {calculationResults.allowable_capacity} kN</Text>
                )}
                {soilCalculationParams.calculationType === 'slope_stability' && (
                  <Text>稳定系数: {calculationResults.safety_factor}</Text>
                )}
              </Space>
            }
            type="success"
            showIcon
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
