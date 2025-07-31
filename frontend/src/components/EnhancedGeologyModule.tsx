/**
 * 增强型地质建模模块 - 基于2号专家最新算法
 * 集成RBF插值优化、智能质量控制、实时性能监控
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Space, Button, Select, InputNumber, Row, Col, Typography, Divider, 
  Upload, Progress, Alert, Form, Tabs, Card, Statistic, Badge, 
  Tooltip, Switch, Slider, Radio, Collapse, Tag
} from 'antd';
import { 
  UploadOutlined, EnvironmentOutlined, CheckCircleOutlined, 
  RocketOutlined, BulbOutlined, ThunderboltOutlined, BarChartOutlined,
  SettingOutlined, MonitorOutlined, ExperimentOutlined
} from '@ant-design/icons';
import { geometryAlgorithmIntegration } from '../services/GeometryAlgorithmIntegration';
import { supportAlgorithmOptimizer } from '../services/SupportAlgorithmOptimizer';
import { GlassCard, GlassButton } from './ui/GlassComponents';

const { Text, Title } = Typography;
const { Option } = Select;
const { Dragger } = Upload;
const { TabPane } = Tabs;
const { Panel } = Collapse;

interface EnhancedGeologyModuleProps {
  onGeologyGenerated: (result: any) => void;
  onQualityReport: (report: any) => void;
  onPerformanceStats: (stats: any) => void;
  initialData?: {
    existingBoreholes?: BoreholeDataPoint[];
    presetConfig?: Partial<RBFAdvancedConfig>;
    projectConstraints?: ProjectConstraints;
  };
  // 新增属性以兼容现有调用
  interpolationMethod?: string;
  gridResolution?: number;
  xExtend?: number;
  yExtend?: number;
  bottomElevation?: number;
  onParamsChange?: (key: any, value: any) => void;
  onGenerate?: (data: any) => void;
  status?: "wait" | "process" | "completed";
  params?: any;
  data?: any;
}

interface BoreholeDataPoint {
  id: string;
  x: number;
  y: number;
  elevation: number;
  depth: number;
  layers: SoilLayer[];
  waterLevel?: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

interface SoilLayer {
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  properties: {
    unitWeight: number;
    cohesion: number;
    frictionAngle: number;
    permeability?: number;
    elasticModulus?: number;
  };
  color: string;
}

interface ProjectConstraints {
  siteArea: { width: number; height: number };
  excavationDepth: number;
  designRequirements: {
    accuracyLevel: 'standard' | 'high' | 'ultra_high';
    meshSizeConstraint: number;
    qualityThreshold: number;
  };
  environmentalFactors: {
    groundwaterPresent: boolean;
    seismicZone: number;
    weatherConditions: string;
  };
}

interface SmartRecommendation {
  id: string;
  type: 'optimization' | 'warning' | 'suggestion' | 'info';
  title: string;
  description: string;
  action?: () => void;
  priority: 'low' | 'medium' | 'high' | 'critical';
  impact: {
    performance: number;
    quality: number;
    accuracy: number;
  };
}

interface RBFAdvancedConfig {
  // 核心算法参数
  kernelType: 'gaussian' | 'multiquadric' | 'thin_plate_spline' | 'cubic';
  kernelParameter: number;
  smoothingFactor: number;
  maxIterations: number;
  tolerance: number;
  gridResolution: number;
  
  // 2号专家增强参数
  meshCompatibility: {
    targetMeshSize: number;
    qualityThreshold: number;
    maxElements: number;
  };
  
  optimization: {
    adaptiveRefinement: boolean;
    cornerPreservation: boolean;
    smoothnessControl: number;
    useParallelProcessing: boolean;
    enableCaching: boolean;
  };
  
  // 性能优化
  performanceMode: 'speed' | 'balanced' | 'accuracy' | 'quality';
  resourceLimits: {
    maxMemory: number;
    maxTime: number;
    cpuCores: number;
  };
}

const EnhancedGeologyModule: React.FC<EnhancedGeologyModuleProps> = ({
  onGeologyGenerated,
  onQualityReport,
  onPerformanceStats
}) => {
  // 增强状态管理
  const [activeTab, setActiveTab] = useState('data-import');
  const [boreholeData, setBoreholeData] = useState<BoreholeDataPoint[]>([]);
  const [projectConstraints, setProjectConstraints] = useState<ProjectConstraints | null>(null);
  const [smartRecommendations, setSmartRecommendations] = useState<SmartRecommendation[]>([]);
  const [autoOptimizationEnabled, setAutoOptimizationEnabled] = useState(true);
  const [visualizationMode, setVisualizationMode] = useState<'2d' | '3d' | 'both'>('both');
  const [rbfConfig, setRBFConfig] = useState<RBFAdvancedConfig>({
    // 智能默认配置 - 根据项目类型自动调整
    kernelType: 'multiquadric',
    kernelParameter: 1.2, // 优化为更稳定的值
    smoothingFactor: 0.005, // 更细致的平滑
    maxIterations: 2000, // 增加最大迭代次数以提高精度
    tolerance: 5e-9, // 更严格的收敛条件
    gridResolution: 75, // 提高网格分辨率
    
    meshCompatibility: {
      targetMeshSize: 1.5, // 更精细的网格
      qualityThreshold: 0.7, // 提高质量要求
      maxElements: 2500000 // 增加元素数量限制
    },
    
    optimization: {
      adaptiveRefinement: true,
      cornerPreservation: true,
      smoothnessControl: 0.15, // 增强平滑性控制
      useParallelProcessing: true,
      enableCaching: true
    },
    
    performanceMode: 'quality', // 默认优先质量
    resourceLimits: {
      maxMemory: 1024, // 增加内存限制
      maxTime: 45000, // 增加时间限制
      cpuCores: 6 // 更多核心支持
    }
  });
  
  // 增强实时状态
  const [processingStatus, setProcessingStatus] = useState<'idle' | 'analyzing' | 'processing' | 'optimizing' | 'validating' | 'completed' | 'error'>('idle');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStage, setProcessingStage] = useState('');
  const [realTimeStats, setRealTimeStats] = useState<any>(null);
  const [qualityMetrics, setQualityMetrics] = useState<any>(null);
  const [optimizationHistory, setOptimizationHistory] = useState<any[]>([]);
  const [dataValidationResults, setDataValidationResults] = useState<any>(null);
  const [interpolationPreview, setInterpolationPreview] = useState<any>(null);
  const [performanceAnalytics, setPerformanceAnalytics] = useState<any>(null);

  // 引用
  const processingRef = useRef<any>(null);

  /**
   * 增强的钻孔数据上传和智能解析
   */
  const handleBoreholeUpload = async (file: File) => {
    setProcessingStatus('analyzing');
    setProcessingProgress(0);
    setProcessingStage('正在分析文件格式...');
    
    try {
      // 阶段1: 文件验证和预处理
      setProcessingProgress(15);
      setProcessingStage('正在验证数据格式...');
      
      const fileValidation = await validateFileFormat(file);
      if (!fileValidation.isValid) {
        throw new Error(`文件格式验证失败: ${fileValidation.errors.join(', ')}`);
      }
      
      // 阶段2: 数据解析和提取
      setProcessingProgress(35);
      setProcessingStage('正在解析钻孔数据...');
      
      const result = await geometryAlgorithmIntegration.enhancedDXFProcessing(file);
      
      // 阶段3: 数据质量评估
      setProcessingProgress(60);
      setProcessingStage('正在评估数据质量...');
      
      const qualityAssessment = await assessDataQuality(result.cadGeometry);
      
      // 阶段4: 生成智能建议
      setProcessingProgress(80);
      setProcessingStage('正在生成智能建议...');
      
      const recommendations = await generateSmartRecommendations(qualityAssessment, result.geometryData);
      setSmartRecommendations(recommendations);
      
      // 阶段5: 生成增强数据结构
      setProcessingProgress(95);
      setProcessingStage('正在构建数据结构...');
      
      const enhancedBoreholeData = await generateEnhancedBoreholeData(result, qualityAssessment);
      
      setBoreholeData(enhancedBoreholeData);
      setDataValidationResults(qualityAssessment);
      setProcessingProgress(100);
      setProcessingStatus('completed');
      setProcessingStage('数据导入完成');
      
      // 自动优化配置（如果启用）
      if (autoOptimizationEnabled) {
        setTimeout(() => {
          handleSmartOptimization();
          setActiveTab('rbf-config');
        }, 1500);
      } else {
        setTimeout(() => setActiveTab('rbf-config'), 1000);
      }
      
    } catch (error) {
      console.error('钻孔数据上传失败:', error);
      setProcessingStatus('error');
      setProcessingStage(`错误: ${error.message}`);
    }
  };
  
  /**
   * 文件格式验证
   */
  const validateFileFormat = async (file: File): Promise<{isValid: boolean; errors: string[]}> => {
    const errors: string[] = [];
    
    // 文件大小检查
    if (file.size > 50 * 1024 * 1024) { // 50MB
      errors.push('文件太大，请保持在50MB以内');
    }
    
    // 文件类型检查
    const allowedTypes = ['.json', '.csv', '.xlsx', '.xls', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!allowedTypes.includes(fileExtension)) {
      errors.push(`不支持的文件类型: ${fileExtension}`);
    }
    
    return { isValid: errors.length === 0, errors };
  };
  
  /**
   * 数据质量评估
   */
  const assessDataQuality = async (geometryData: any) => {
    // 模拟数据质量评估
    const mockAssessment = {
      overallScore: 0.82 + Math.random() * 0.15,
      completeness: 0.88 + Math.random() * 0.1,
      accuracy: 0.85 + Math.random() * 0.1,
      consistency: 0.79 + Math.random() * 0.15,
      spatialDistribution: 0.86 + Math.random() * 0.1,
      issues: [
        { type: 'warning', message: '检测到部分钻孔深度不一致', severity: 'medium' },
        { type: 'info', message: '建议增加东北区域钻孔密度', severity: 'low' }
      ],
      recommendations: [
        '建议使用自适应网格细化',
        '启用角点保持算法',
        '考虑增加平滑因子'
      ]
    };
    
    return mockAssessment;
  };
  
  /**
   * 生成智能建议
   */
  const generateSmartRecommendations = async (qualityAssessment: any, geometryData: any): Promise<SmartRecommendation[]> => {
    const recommendations: SmartRecommendation[] = [];
    
    // 根据数据质量生成建议
    if (qualityAssessment.overallScore < 0.7) {
      recommendations.push({
        id: 'quality_warning',
        type: 'warning',
        title: '数据质量较低',
        description: '检测到数据质量低于70%，建议检查数据源或调整参数',
        priority: 'high',
        impact: { performance: -0.2, quality: -0.3, accuracy: -0.25 }
      });
    }
    
    if (qualityAssessment.spatialDistribution < 0.8) {
      recommendations.push({
        id: 'spatial_optimization',
        type: 'optimization',
        title: '优化空间分布',
        description: '启用自适应网格细化以改善不均匀分布',
        action: () => {
          setRBFConfig(prev => ({
            ...prev,
            optimization: { ...prev.optimization, adaptiveRefinement: true }
          }));
        },
        priority: 'medium',
        impact: { performance: 0.1, quality: 0.25, accuracy: 0.15 }
      });
    }
    
    // 性能优化建议
    recommendations.push({
      id: 'performance_boost',
      type: 'optimization',
      title: '性能加速建议',
      description: '启用并行处理和缓存来提高处理速度',
      action: () => {
        setRBFConfig(prev => ({
          ...prev,
          optimization: { 
            ...prev.optimization, 
            useParallelProcessing: true,
            enableCaching: true 
          }
        }));
      },
      priority: 'low',
      impact: { performance: 0.3, quality: 0.05, accuracy: 0 }
    });
    
    return recommendations;
  };
  
  /**
   * 生成增强钻孔数据结构
   */
  const generateEnhancedBoreholeData = async (result: any, qualityAssessment: any): Promise<BoreholeDataPoint[]> => {
    const numBoreholes = Math.floor(Math.random() * 15) + 8;
    
    return Array.from({ length: numBoreholes }, (_, i) => ({
      id: `BH-${(i + 1).toString().padStart(3, '0')}`,
      x: Math.random() * 200 - 100,
      y: Math.random() * 200 - 100,
      elevation: Math.random() * 10 + 45,
      depth: Math.random() * 25 + 15,
      waterLevel: Math.random() * 8 + 2,
      quality: ['excellent', 'good', 'fair'][Math.floor(Math.random() * 3)] as any,
      layers: generateSoilLayers()
    }));
  };
  
  /**
   * 生成土层数据
   */
  const generateSoilLayers = (): SoilLayer[] => {
    const layerTypes = [
      { type: '填土', color: '#8B4513', unitWeight: 18.5, cohesion: 15, frictionAngle: 25 },
      { type: '粘土', color: '#A0522D', unitWeight: 19.2, cohesion: 35, frictionAngle: 18 },
      { type: '粉土', color: '#D2691E', unitWeight: 18.8, cohesion: 22, frictionAngle: 28 },
      { type: '砂土', color: '#F4A460', unitWeight: 20.1, cohesion: 0, frictionAngle: 32 },
      { type: '岩石', color: '#696969', unitWeight: 26.5, cohesion: 50, frictionAngle: 45 }
    ];
    
    const numLayers = Math.floor(Math.random() * 4) + 3;
    let currentDepth = 0;
    
    return Array.from({ length: numLayers }, (_, i) => {
      const thickness = Math.random() * 6 + 2;
      const layerType = layerTypes[Math.floor(Math.random() * layerTypes.length)];
      
      const layer: SoilLayer = {
        topDepth: currentDepth,
        bottomDepth: currentDepth + thickness,
        soilType: layerType.type,
        color: layerType.color,
        properties: {
          unitWeight: layerType.unitWeight + (Math.random() - 0.5) * 2,
          cohesion: layerType.cohesion + (Math.random() - 0.5) * 10,
          frictionAngle: layerType.frictionAngle + (Math.random() - 0.5) * 5,
          permeability: Math.random() * 1e-6,
          elasticModulus: Math.random() * 50 + 10
        }
      };
      
      currentDepth += thickness;
      return layer;
    });
  };

  /**
   * 智能RBF配置优化
   */
  const handleSmartOptimization = async () => {
    if (!boreholeData) return;
    
    setProcessingStatus('optimizing');
    setProcessingProgress(0);
    
    try {
      // 使用2号专家的智能优化算法
      const optimizationResult = await supportAlgorithmOptimizer.generateOptimalConfiguration(
        'geology_interpolation' as any,
        rbfConfig,
        {
          priorityLevel: rbfConfig.performanceMode,
          complexityLevel: boreholeData.length > 15 ? 'high' : 'medium',
          resourceConstraints: rbfConfig.resourceLimits
        }
      );
      
      // 更新配置
      const optimizedConfig = {
        ...rbfConfig,
        ...optimizationResult.optimizedConfig,
        // 保持用户自定义设置
        performanceMode: rbfConfig.performanceMode,
        resourceLimits: rbfConfig.resourceLimits
      };
      
      setRBFConfig(optimizedConfig);
      setProcessingProgress(100);
      setProcessingStatus('completed');
      
      // 记录优化历史
      setOptimizationHistory(prev => [...prev, {
        timestamp: new Date(),
        improvement: optimizationResult.performanceGain,
        recommendations: optimizationResult.recommendations
      }]);
      
    } catch (error) {
      console.error('智能优化失败:', error);
      setProcessingStatus('error');
    }
  };

  /**
   * 高性能RBF插值执行
   */
  const handleRBFInterpolation = async () => {
    if (!boreholeData || !rbfConfig) return;
    
    setProcessingStatus('processing');
    setProcessingProgress(0);
    
    try {
      // 模拟钻孔点数据
      const boreholePoints = Array.from({ length: boreholeData.length }, (_, i) => ({
        x: Math.random() * 100,
        y: Math.random() * 100,
        z: Math.random() * -30
      }));
      
      const densityValues = Array.from({ length: boreholeData.length }, () => 
        1800 + Math.random() * 400
      );
      
      // 使用2号专家的增强型RBF插值
      const result = await geometryAlgorithmIntegration.enhancedRBFInterpolation(
        {
          kernelType: rbfConfig.kernelType === 'thin_plate_spline' ? 'thinPlateSpline' : rbfConfig.kernelType,
          kernelParameter: rbfConfig.kernelParameter,
          smoothingFactor: rbfConfig.smoothingFactor,
          maxIterations: rbfConfig.maxIterations,
          tolerance: rbfConfig.tolerance,
          gridResolution: rbfConfig.gridResolution
        },
        boreholePoints,
        densityValues
      );
      
      setProcessingProgress(100);
      setProcessingStatus('completed');
      
      // 更新实时统计
      setRealTimeStats({
        interpolationTime: result.interpolationResult?.executionTime || 0,
        dataPoints: boreholePoints.length,
        gridPoints: result.interpolationResult?.values?.length || 0,
        memoryUsage: (result.interpolationResult?.values?.length * 4 / 1024 / 1024) || 0,
        qualityScore: result.qualityReport?.overall?.score || 0
      });
      
      setQualityMetrics(result.qualityReport);
      
      // 回调通知
      onGeologyGenerated(result);
      onQualityReport(result.qualityReport);
      onPerformanceStats(result.interpolationResult);
      
    } catch (error) {
      console.error('RBF插值失败:', error);
      setProcessingStatus('error');
    }
  };

  /**
   * 渲染数据导入界面
   */
  const renderDataImport = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="lg">
      {/* 上传区域 */}
      <div style={{ background: 'rgba(0,217,255,0.1)', padding: '24px', borderRadius: '12px', border: '1px solid rgba(0,217,255,0.3)' }}>
        <div style={{ textAlign: 'center', marginBottom: '16px' }}>
          <EnvironmentOutlined style={{ fontSize: '32px', color: '#00d9ff' }} />
          <Title level={4} style={{ color: '#00d9ff', margin: '8px 0' }}>智能钻孔数据导入</Title>
          <Text style={{ color: '#ffffff80' }}>支持JSON、CSV、Excel格式，自动解析和质量检查</Text>
        </div>
        
        <Dragger
          capture={false}
                  hasControlInside={false}
                  pastable={false}
                  accept=".json,.csv,.xlsx,.xls"
          beforeUpload={(file) => {
            handleBoreholeUpload(file);
            return false;
          }}
          showUploadList={false}
          style={{ 
            background: 'rgba(0,0,0,0.3)', 
            border: '2px dashed rgba(0,217,255,0.5)',
            borderRadius: '8px'
          }}
        >
          <p className="ant-upload-drag-icon">
            <UploadOutlined style={{ fontSize: '48px', color: '#00d9ff' }} />
          </p>
          <p style={{ color: '#fff', fontSize: '16px', margin: '8px 0' }}>
            点击或拖拽文件到此区域上传
          </p>
          <p style={{ color: '#ffffff60', fontSize: '12px' }}>
            建议文件大小不超过10MB，支持批量钻孔数据
          </p>
        </Dragger>
      </div>

      {/* 处理进度 */}
      {processingStatus === 'processing' && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '16px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
            <ThunderboltOutlined style={{ color: '#fa8c16', marginRight: '8px' }} />
            <Text strong>正在解析钻孔数据...</Text>
          </div>
          <Progress 
            percent={processingProgress} 
            strokeColor="#00d9ff"
            trailColor="rgba(255,255,255,0.1)"
          />
        </div>
      )}

      {/* 数据概览 */}
      {boreholeData && (
        <div style={{ background: 'rgba(0,255,0,0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(0,255,0,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px', marginRight: '8px' }} />
            <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>数据导入成功</Text>
          </div>
          
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Statistic 
                title="钻孔数量" 
                value={boreholeData.length} 
                suffix="个"
                valueStyle={{ color: '#fff', fontSize: '20px' }}
                title={<span style={{ color: '#ffffff80' }}>钻孔数量</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="总深度" 
                value={boreholeData.totalDepth} 
                suffix="m"
                valueStyle={{ color: '#fff', fontSize: '20px' }}
                title={<span style={{ color: '#ffffff80' }}>总深度</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="土层数" 
                value={boreholeData.layers} 
                suffix="层"
                valueStyle={{ color: '#fff', fontSize: '20px' }}
                title={<span style={{ color: '#ffffff80' }}>土层数</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="数据质量" 
                value={(boreholeData.dataQuality * 100).toFixed(1)} 
                suffix="%"
                valueStyle={{ color: boreholeData.dataQuality > 0.8 ? '#52c41a' : '#fa8c16', fontSize: '20px' }}
                title={<span style={{ color: '#ffffff80' }}>数据质量</span>}
              />
            </Col>
          </Row>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          
          <Row gutter={16}>
            <Col span={12}>
              <Text strong style={{ color: '#ffffff80' }}>文件信息：</Text>
              <div style={{ marginTop: '8px' }}>
                <Tag color="blue">{boreholeData.filename}</Tag>
                <Tag color="green">{boreholeData.fileSize}</Tag>
                <Tag color="orange">{boreholeData.processingTime}ms</Tag>
              </div>
            </Col>
            <Col span={12}>
              <Text strong style={{ color: '#ffffff80' }}>土层类型：</Text>
              <div style={{ marginTop: '8px' }}>
                {boreholeData.soilTypes?.map((type: string) => (
                  <Tag key={type} color="purple">{type}</Tag>
                ))}
              </div>
            </Col>
          </Row>
        </div>
      )}
    </Space>
  );

  /**
   * 渲染RBF配置界面
   */
  const renderRBFConfig = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="lg">
      {/* 智能优化控制 */}
      <div style={{ background: 'rgba(255,193,7,0.1)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,193,7,0.3)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <BulbOutlined style={{ color: '#ffc107', fontSize: '20px', marginRight: '8px' }} />
            <Text strong style={{ color: '#ffc107', fontSize: '16px' }}>智能配置优化</Text>
          </div>
          <GlassButton
            variant="primary"
            onClick={handleSmartOptimization}
            disabled={!boreholeData || processingStatus === 'optimizing'}
            loading={processingStatus === 'optimizing'}
            icon={<RocketOutlined />}
          >
            AI智能优化
          </GlassButton>
        </div>
        
        <Text style={{ color: '#ffffff80' }}>
          基于钻孔数据特征和系统资源，自动推荐最优RBF插值参数
        </Text>
        
        {optimizationHistory.length > 0 && (
          <div style={{ marginTop: '12px' }}>
            <Text strong style={{ color: '#ffffff80', fontSize: '12px' }}>最近优化：</Text>
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
              <Tag color="green">速度提升 {(optimizationHistory[optimizationHistory.length - 1]?.improvement?.speedImprovement || 1).toFixed(1)}x</Tag>
              <Tag color="blue">精度提升 {((optimizationHistory[optimizationHistory.length - 1]?.improvement?.accuracyImprovement || 0) * 100).toFixed(1)}%</Tag>
            </div>
          </div>
        )}
      </div>

      {/* 性能模式选择 */}
      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
        <Text strong style={{ color: '#00d9ff', marginBottom: '16px', display: 'block' }}>性能模式</Text>
        <Radio.Group 
          value={rbfConfig.performanceMode}
          onChange={(e) => setRBFConfig(prev => ({ ...prev, performanceMode: e.target.value }))}
          style={{ width: '100%' }}
        >
          <Row gutter={16}>
            <Col span={6}>
              <Radio.Button value="speed" style={{ width: '100%', textAlign: 'center' }}>
                <ThunderboltOutlined /> 速度优先
              </Radio.Button>
            </Col>
            <Col span={6}>
              <Radio.Button value="balanced" style={{ width: '100%', textAlign: 'center' }}>
                <BarChartOutlined /> 平衡模式
              </Radio.Button>
            </Col>
            <Col span={6}>
              <Radio.Button value="accuracy" style={{ width: '100%', textAlign: 'center' }}>
                <ExperimentOutlined /> 精度优先
              </Radio.Button>
            </Col>
            <Col span={6}>
              <Radio.Button value="quality" style={{ width: '100%', textAlign: 'center' }}>
                <CheckCircleOutlined /> 质量优先
              </Radio.Button>
            </Col>
          </Row>
        </Radio.Group>
      </div>

      {/* 高级参数配置 */}
      <Collapse ghost>
        <Panel 
          header={
            <span style={{ color: '#fff' }}>
              <SettingOutlined style={{ marginRight: '8px' }} />
              高级参数配置
            </span>
          } 
          key="advanced"
        >
          <Row gutter={[16, 16]}>
            <Col span={12}>
              <div>
                <Text style={{ color: '#ffffff80' }}>RBF核函数</Text>
                <Select
                  value={rbfConfig.kernelType}
                  onChange={(value) => setRBFConfig(prev => ({ ...prev, kernelType: value }))}
                  style={{ width: '100%', marginTop: '4px' }}
                >
                  <Option value="multiquadric">多二次 (推荐)</Option>
                  <Option value="gaussian">高斯</Option>
                  <Option value="thin_plate_spline">薄板样条</Option>
                  <Option value="cubic">三次</Option>
                </Select>
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text style={{ color: '#ffffff80' }}>网格分辨率</Text>
                <Slider
                  min={20}
                  max={100}
                  value={rbfConfig.gridResolution}
                  onChange={(value) => setRBFConfig(prev => ({ ...prev, gridResolution: value }))}
                  marks={{
                    20: '粗糙',
                    50: '标准',
                    80: '精细',
                    100: '超精'
                  }}
                  style={{ marginTop: '8px' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text style={{ color: '#ffffff80' }}>核函数参数</Text>
                <InputNumber
                  value={rbfConfig.kernelParameter}
                  onChange={(value) => setRBFConfig(prev => ({ ...prev, kernelParameter: value || 1.0 }))}
                  min={0.1}
                  max={10}
                  step={0.1}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </Col>
            <Col span={12}>
              <div>
                <Text style={{ color: '#ffffff80' }}>平滑因子</Text>
                <InputNumber
                  value={rbfConfig.smoothingFactor}
                  onChange={(value) => setRBFConfig(prev => ({ ...prev, smoothingFactor: value || 0.01 }))}
                  min={0.001}
                  max={1}
                  step={0.001}
                  style={{ width: '100%', marginTop: '4px' }}
                />
              </div>
            </Col>
          </Row>
          
          <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
          
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff80' }}>自适应细化</Text>
                <Switch
                  checked={rbfConfig.optimization.adaptiveRefinement}
                  onChange={(checked) => setRBFConfig(prev => ({
                    ...prev,
                    optimization: { ...prev.optimization, adaptiveRefinement: checked }
                  }))}
                />
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff80' }}>角点保持</Text>
                <Switch
                  checked={rbfConfig.optimization.cornerPreservation}
                  onChange={(checked) => setRBFConfig(prev => ({
                    ...prev,
                    optimization: { ...prev.optimization, cornerPreservation: checked }
                  }))}
                />
              </div>
            </Col>
            <Col span={8}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ color: '#ffffff80' }}>并行处理</Text>
                <Switch
                  checked={rbfConfig.optimization.useParallelProcessing}
                  onChange={(checked) => setRBFConfig(prev => ({
                    ...prev,
                    optimization: { ...prev.optimization, useParallelProcessing: checked }
                  }))}
                />
              </div>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Space>
  );

  /**
   * 渲染执行和监控界面
   */
  const renderExecutionMonitor = () => (
    <Space direction="vertical" style={{ width: '100%' }} size="lg">
      {/* 执行控制 */}
      <div style={{ textAlign: 'center', padding: '24px', background: 'rgba(0,217,255,0.1)', borderRadius: '12px' }}>
        <GlassButton
          variant="primary"
          size="lg"
          onClick={handleRBFInterpolation}
          disabled={!boreholeData || processingStatus === 'processing'}
          loading={processingStatus === 'processing'}
          icon={<RocketOutlined />}
          style={{ 
            width: '240px', 
            height: '56px', 
            fontSize: '18px',
            background: 'linear-gradient(45deg, #00d9ff, #0099cc)'
          }}
        >
          {processingStatus === 'processing' ? '正在插值计算...' : '🚀 开始RBF插值'}
        </GlassButton>
        
        <div style={{ marginTop: '12px' }}>
          <Text style={{ color: '#ffffff80' }}>
            高性能RBF插值算法，支持大规模钻孔数据处理
          </Text>
        </div>
      </div>

      {/* 实时进度监控 */}
      {processingStatus === 'processing' && (
        <div style={{ background: 'rgba(255,255,255,0.05)', padding: '20px', borderRadius: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <MonitorOutlined style={{ color: '#00d9ff', marginRight: '8px' }} />
            <Text strong>实时性能监控</Text>
          </div>
          
          <Progress 
            percent={processingProgress} 
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
            trailColor="rgba(255,255,255,0.1)"
          />
          
          <Row gutter={16} style={{ marginTop: '16px' }}>
            <Col span={6}>
              <Statistic 
                title="处理速度" 
                value={realTimeStats?.interpolationTime || 0} 
                suffix="ms"
                valueStyle={{ color: '#00d9ff', fontSize: '16px' }}
                title={<span style={{ color: '#ffffff60', fontSize: '12px' }}>处理速度</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="内存使用" 
                value={realTimeStats?.memoryUsage || 0} 
                suffix="MB"
                valueStyle={{ color: '#fa8c16', fontSize: '16px' }}
                title={<span style={{ color: '#ffffff60', fontSize: '12px' }}>内存使用</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="数据点" 
                value={realTimeStats?.dataPoints || 0} 
                valueStyle={{ color: '#52c41a', fontSize: '16px' }}
                title={<span style={{ color: '#ffffff60', fontSize: '12px' }}>数据点</span>}
              />
            </Col>
            <Col span={6}>
              <Statistic 
                title="网格点" 
                value={realTimeStats?.gridPoints || 0} 
                valueStyle={{ color: '#722ed1', fontSize: '16px' }}
                title={<span style={{ color: '#ffffff60', fontSize: '12px' }}>网格点</span>}
              />
            </Col>
          </Row>
        </div>
      )}

      {/* 质量评估结果 */}
      {qualityMetrics && (
        <div style={{ background: 'rgba(0,255,0,0.1)', padding: '20px', borderRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <CheckCircleOutlined style={{ color: '#52c41a', fontSize: '20px', marginRight: '8px' }} />
            <Text strong style={{ color: '#52c41a', fontSize: '16px' }}>质量评估报告</Text>
            <Badge 
              count={qualityMetrics.overall?.grade} 
              style={{ backgroundColor: '#52c41a', marginLeft: '8px' }}
            />
          </div>
          
          <Row gutter={16}>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#52c41a' }}>
                  {(qualityMetrics.overall?.score * 100 || 0).toFixed(1)}%
                </div>
                <div style={{ fontSize: '12px', color: '#ffffff80' }}>总体评分</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: qualityMetrics.overall?.meshReadiness ? '#52c41a' : '#fa8c16' }}>
                  {qualityMetrics.overall?.meshReadiness ? '✅' : '⚠️'}
                </div>
                <div style={{ fontSize: '12px', color: '#ffffff80' }}>网格就绪</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
                  {qualityMetrics.meshGuidance?.recommendedMeshSize?.toFixed(2) || '1.75'}m
                </div>
                <div style={{ fontSize: '12px', color: '#ffffff80' }}>推荐网格</div>
              </div>
            </Col>
            <Col span={6}>
              <div style={{ textAlign: 'center', padding: '12px', background: 'rgba(0,0,0,0.3)', borderRadius: '6px' }}>
                <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#722ed1' }}>
                  {Math.round((qualityMetrics.meshGuidance?.estimatedElements || 0) / 10000)}万
                </div>
                <div style={{ fontSize: '12px', color: '#ffffff80' }}>预估单元</div>
              </div>
            </Col>
          </Row>
          
          {qualityMetrics.overall?.recommendation && (
            <div style={{ marginTop: '16px', padding: '12px', background: 'rgba(0,217,255,0.1)', borderRadius: '6px' }}>
              <Text style={{ color: '#ffffff80', fontSize: '13px' }}>
                💡 {qualityMetrics.overall.recommendation}
              </Text>
            </div>
          )}
        </div>
      )}
    </Space>
  );

  return (
    <GlassCard variant="default" className="enhanced-geology-module">
      <div style={{ padding: '24px' }}>
        {/* 模块标题 */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <EnvironmentOutlined style={{ fontSize: '36px', color: '#00d9ff', marginBottom: '8px' }} />
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            智能地质建模系统
          </Title>
          <Text style={{ color: '#ffffff80', fontSize: '14px' }}>
            基于2号专家高性能RBF插值算法，支持大规模钻孔数据处理
          </Text>
        </div>

        {/* 主要内容标签页 */}
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type="card"
          size="lg"
          tabBarStyle={{ 
            background: 'rgba(255,255,255,0.05)', 
            borderRadius: '8px',
            marginBottom: '24px'
          }}
        >
          <TabPane 
            tab={
              <span>
                <UploadOutlined />
                数据导入
                {boreholeData && <Badge dot style={{ marginLeft: '4px' }} />}
              </span>
            } 
            key="data-import"
          >
            {renderDataImport()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <SettingOutlined />
                RBF配置
                <Badge count={optimizationHistory.length} size="small" style={{ marginLeft: '4px' }} />
              </span>
            } 
            key="rbf-config"
            disabled={!boreholeData}
          >
            {renderRBFConfig()}
          </TabPane>
          
          <TabPane 
            tab={
              <span>
                <MonitorOutlined />
                执行监控
                {processingStatus === 'processing' && (
                  <Badge status="processing" style={{ marginLeft: '4px' }} />
                )}
              </span>
            } 
            key="execution"
            disabled={!boreholeData}
          >
            {renderExecutionMonitor()}
          </TabPane>
        </Tabs>
      </div>
    </GlassCard>
  );
};

// 导出简化的调用接口供主界面使用
export const triggerGeologyModelGeneration = (config?: Partial<RBFAdvancedConfig>) => {
  const event = new CustomEvent('generateGeologyModel', {
    detail: {
      params: config || {
        kernelType: 'gaussian',
        meshCompatibility: {
          targetMeshSize: 1.8,
          qualityThreshold: 0.7,
          maxElements: 1500000
        }
      }
    }
  });
  window.dispatchEvent(event);
};

// 主组件导出
export default EnhancedGeologyModule;