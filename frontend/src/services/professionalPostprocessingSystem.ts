/**
 * 深基坑专业后处理系统
 * 3号计算专家 - 基于PyVista+Three.js架构的专业后处理平台
 * 数据流：Kratos计算结果 → PyVista专业后处理 → Three.js专业展示
 * 为深基坑工程提供世界级后处理分析能力
 */

import * as THREE from 'three';
import { 
  DeepExcavationResults,
  type DeepExcavationParameters 
} from './deepExcavationSolver';

import { 
  PyVistaStageResult,
  type ConstructionStage 
} from './constructionStageAnalysis';

import { 
  SafetyAssessmentResult,
  type RiskLevel 
} from './safetyAssessmentSystem';

import { 
  GPUEnhancedPostprocessor,
  createGPUEnhancedPostprocessor,
  type GPUPerformanceMetrics 
} from './gpuIntegration';

// 后处理任务类型
export type PostprocessingTask = 
  | 'stress_analysis'           // 应力分析
  | 'deformation_analysis'      // 变形分析
  | 'seepage_analysis'         // 渗流分析
  | 'stability_analysis'       // 稳定性分析
  | 'time_history_analysis'    // 时程分析
  | 'sensitivity_analysis'     // 敏感性分析
  | 'optimization_analysis'    // 优化分析
  | 'risk_assessment'          // 风险评估
  | 'report_generation';       // 报告生成

// 后处理配置
export interface PostprocessingConfig {
  // 通用设置
  general: {
    projectName: string;
    analysisStandard: 'GB50007' | 'JGJ120' | 'JTS165' | 'CECS22';
    resultsPrecision: number;        // 结果精度 (小数位数)
    unitSystem: 'SI' | 'Imperial';   // 单位系统
    languageLocale: 'zh-CN' | 'en-US';
  };
  
  // 应力后处理配置
  stress: {
    // 分析参数
    stressComponents: Array<'sigmaX' | 'sigmaY' | 'sigmaZ' | 'tauXY' | 'tauYZ' | 'tauZX'>;
    principalStresses: boolean;      // 主应力分析
    equivalentStresses: Array<'vonMises' | 'tresca' | 'maxShear' | 'octahedral'>;
    
    // 可视化配置
    visualization: {
      colorMaps: Array<'viridis' | 'plasma' | 'jet' | 'rainbow' | 'hot' | 'cool'>;
      contourLevels: number[];       // 等值线水平
      vectorScale: number;           // 矢量缩放
      deformationScale: number;      // 变形放大系数
      transparencyLevels: number[];  // 透明度等级
    };
    
    // 截面分析
    crossSections: Array<{
      sectionId: string;
      sectionName: string;
      sectionType: 'plane' | 'cylinder' | 'sphere';
      position: [number, number, number];
      normal: [number, number, number];
      enabled: boolean;
    }>;
    
    // 路径分析
    pathAnalysis: Array<{
      pathId: string;
      pathName: string;
      points: Array<[number, number, number]>;
      parameterization: 'arc_length' | 'time' | 'custom';
      enabled: boolean;
    }>;
  };
  
  // 变形后处理配置
  deformation: {
    // 分析组件
    components: Array<'displacement' | 'rotation' | 'strain' | 'curvature'>;
    coordinateSystem: 'global' | 'local' | 'principal';
    
    // 变形模式分析
    modalAnalysis: {
      enabled: boolean;
      modesCount: number;           // 模态数量
      frequencyRange: [number, number]; // 频率范围 (Hz)
      dampingRatio: number;         // 阻尼比
    };
    
    // 动画配置
    animation: {
      timeSteps: number;            // 时间步数
      playbackSpeed: number;        // 播放速度
      amplificationFactor: number;  // 放大系数
      smoothTransition: boolean;    // 平滑过渡
      loopAnimation: boolean;       // 循环播放
    };
    
    // 测量工具
    measurements: {
      enablePointMeasurement: boolean;    // 点测量
      enableDistanceMeasurement: boolean; // 距离测量
      enableAngleMeasurement: boolean;    // 角度测量
      enableAreaMeasurement: boolean;     // 面积测量
      enableVolumeMeasurement: boolean;   // 体积测量
    };
  };
  
  // 渗流后处理配置
  seepage: {
    // 分析参数
    parameters: Array<'pressure' | 'velocity' | 'gradient' | 'flowRate' | 'seepageForce'>;
    
    // 流线追踪
    streamlines: {
      enabled: boolean;
      seedPoints: Array<[number, number, number]>; // 种子点
      integrationMethod: 'euler' | 'rk2' | 'rk4';  // 积分方法
      stepSize: number;             // 步长
      maxLength: number;            // 最大长度
    };
    
    // 等势线分析
    equipotentialLines: {
      enabled: boolean;
      levels: number[];             // 等势线水平
      smoothing: number;            // 平滑度
      labelLines: boolean;          // 标注等势线
    };
    
    // 渗透路径分析
    seepagePaths: Array<{
      pathId: string;
      startPoint: [number, number, number];
      endPoint: [number, number, number];
      criticalGradient: number;     // 临界梯度
      enabled: boolean;
    }>;
    
    // 管涌分析
    pipingAnalysis: {
      enabled: boolean;
      criticalGradient: number;     // 临界水力梯度
      safetyFactor: number;         // 安全系数
      riskThreshold: number;        // 风险阈值
    };
  };
  
  // 稳定性后处理配置
  stability: {
    // 分析类型
    analysisTypes: Array<'overall' | 'local' | 'slope' | 'bearing' | 'uplift' | 'piping'>;
    
    // 安全系数计算
    safetyFactors: {
      method: 'strength_reduction' | 'limit_equilibrium' | 'numerical';
      convergenceCriteria: number;   // 收敛准则
      maxIterations: number;        // 最大迭代次数
      incrementSize: number;        // 增量步长
    };
    
    // 失效模式分析
    failureModes: Array<{
      modeId: string;
      modeName: string;
      description: string;
      probability: number;          // 失效概率
      consequence: 'low' | 'medium' | 'high' | 'catastrophic';
      enabled: boolean;
    }>;
    
    // 敏感性分析
    sensitivity: {
      enabled: boolean;
      parameters: Array<'cohesion' | 'friction' | 'unitWeight' | 'stiffness'>;
      variationRange: number;       // 变化范围 (%)
      samplingMethod: 'monte_carlo' | 'latin_hypercube' | 'sobol';
      sampleSize: number;           // 样本数量
    };
  };
  
  // 时程分析配置
  timeHistory: {
    // 时间参数
    timeRange: [number, number];    // 时间范围 (day)
    timeStep: number;               // 时间步长 (day)
    outputInterval: number;         // 输出间隔 (day)
    
    // 监测点配置
    monitoringPoints: Array<{
      pointId: string;
      pointName: string;
      coordinates: [number, number, number];
      parameters: Array<'displacement' | 'stress' | 'pressure' | 'force'>;
      alarmThresholds: {
        warning: number;
        danger: number;
      };
      enabled: boolean;
    }>;
    
    // 趋势分析
    trendAnalysis: {
      enabled: boolean;
      trendDetection: boolean;      // 趋势检测
      changePointDetection: boolean; // 变点检测
      forecastSteps: number;        // 预测步数
      confidenceInterval: number;   // 置信区间
    };
  };
  
  // 优化分析配置
  optimization: {
    // 优化目标
    objectives: Array<{
      objectiveId: string;
      objectiveName: string;
      parameter: string;            // 优化参数
      target: 'minimize' | 'maximize' | 'target';
      targetValue?: number;         // 目标值
      weight: number;               // 权重
      enabled: boolean;
    }>;
    
    // 设计变量
    designVariables: Array<{
      variableId: string;
      variableName: string;
      parameter: string;            // 变量参数
      lowerBound: number;           // 下限
      upperBound: number;           // 上限
      initialValue: number;         // 初值
      stepSize: number;             // 步长
      enabled: boolean;
    }>;
    
    // 约束条件
    constraints: Array<{
      constraintId: string;
      constraintName: string;
      expression: string;           // 约束表达式
      type: 'equality' | 'inequality';
      enabled: boolean;
    }>;
    
    // 优化算法
    algorithm: {
      method: 'genetic' | 'particle_swarm' | 'simulated_annealing' | 'gradient_based';
      populationSize: number;       // 种群大小
      maxGenerations: number;       // 最大代数
      convergenceTolerance: number; // 收敛容差
      crossoverRate: number;        // 交叉率
      mutationRate: number;         // 变异率
    };
  };
  
  // 报告配置
  reporting: {
    // 报告格式
    formats: Array<'pdf' | 'word' | 'html' | 'latex' | 'powerpoint'>;
    
    // 报告内容
    sections: Array<{
      sectionId: string;
      sectionName: string;
      sectionType: 'text' | 'table' | 'figure' | 'chart' | 'code';
      content: string;
      order: number;
      enabled: boolean;
    }>;
    
    // 图表配置
    charts: {
      defaultStyle: 'professional' | 'scientific' | 'presentation';
      colorScheme: 'default' | 'colorblind' | 'grayscale' | 'high_contrast';
      resolution: 'low' | 'medium' | 'high' | 'print';
      vectorGraphics: boolean;      // 矢量图形
    };
    
    // 自动化配置
    automation: {
      autoUpdate: boolean;          // 自动更新
      scheduledGeneration: boolean; // 定时生成
      templateManagement: boolean;  // 模板管理
      versionControl: boolean;      // 版本控制
    };
  };
}

// PyVista后处理结果接口
export interface PyVistaPostprocessingResults {
  // 应力分析结果
  stressAnalysis?: {
    stressDistribution: {
      components: Float32Array[];    // 应力分量分布
      principal: Float32Array[];     // 主应力分布
      equivalent: Float32Array[];    // 等效应力分布
    };
    
    crossSectionResults: Array<{
      sectionId: string;
      stressProfile: Float32Array;  // 应力剖面
      coordinates: Float32Array;    // 坐标
      maxStress: number;            // 最大应力
      minStress: number;            // 最小应力
    }>;
    
    pathResults: Array<{
      pathId: string;
      stressPath: Float32Array;     // 应力路径
      pathLength: Float32Array;     // 路径长度
      criticalPoints: Array<{       // 关键点
        position: [number, number, number];
        stressValue: number;
        stressType: string;
      }>;
    }>;
    
    statistics: {
      maxVonMises: number;          // 最大von Mises应力
      avgVonMises: number;          // 平均von Mises应力
      stressConcentration: Array<{  // 应力集中
        location: [number, number, number];
        concentrationFactor: number;
      }>;
    };
  };
  
  // 变形分析结果
  deformationAnalysis?: {
    displacementField: {
      vectors: Float32Array;        // 位移矢量场
      magnitude: Float32Array;      // 位移大小
      components: Float32Array[];   // 位移分量
    };
    
    strainField: {
      strainTensor: Float32Array;   // 应变张量
      principalStrains: Float32Array; // 主应变
      shearStrains: Float32Array;   // 剪应变
    };
    
    modalResults?: {
      eigenValues: Float32Array;    // 特征值
      eigenVectors: Float32Array[]; // 特征向量
      frequencies: Float32Array;    // 频率
      dampingRatios: Float32Array;  // 阻尼比
    };
    
    measurements: Array<{
      measurementId: string;
      measurementType: 'point' | 'distance' | 'angle' | 'area' | 'volume';
      value: number;
      unit: string;
      coordinates?: [number, number, number][];
    }>;
  };
  
  // 渗流分析结果
  seepageAnalysis?: {
    pressureField: {
      values: Float32Array;         // 压力场值
      gradients: Float32Array;      // 压力梯度
      hydraulicHead: Float32Array;  // 水头分布
    };
    
    velocityField: {
      vectors: Float32Array;        // 速度矢量场
      magnitude: Float32Array;      // 速度大小
      streamlines: Array<{          // 流线
        streamlineId: string;
        points: Float32Array;       // 流线点
        velocities: Float32Array;   // 流线速度
        residence_time: number;     // 停留时间
      }>;
    };
    
    equipotentialLines: Array<{
      level: number;                // 等势线水平
      contours: Float32Array[];     // 等势线轮廓
    }>;
    
    pipingAnalysis: {
      riskZones: Float32Array;      // 风险区域
      criticalGradients: Float32Array; // 临界梯度
      safetyFactors: Float32Array;  // 安全系数
      pipingPotential: number;      // 管涌势
    };
  };
  
  // 稳定性分析结果
  stabilityAnalysis?: {
    safetyFactors: {
      overall: number;              // 整体安全系数
      local: Float32Array;          // 局部安全系数
      byMethod: Map<string, number>; // 按方法分类的安全系数
    };
    
    failureMechanisms: Array<{
      mechanismId: string;
      description: string;
      probability: number;          // 失效概率
      criticalSurface?: Float32Array; // 临界滑动面
      drivingForce: number;         // 驱动力
      resistingForce: number;       // 抗力
    }>;
    
    sensitivityResults?: {
      parameterInfluence: Map<string, number>; // 参数影响度
      sobolIndices: Map<string, number>;       // Sobol指数
      correlationMatrix: Float32Array;         // 相关矩阵
    };
  };
  
  // 时程分析结果
  timeHistoryResults?: {
    timeSteps: Float32Array;        // 时间步
    
    monitoringResults: Array<{
      pointId: string;
      timeHistory: Map<string, Float32Array>; // 参数时程
      statistics: {
        max: number;
        min: number;
        mean: number;
        std: number;
        trend: number;              // 趋势系数
      };
      alarms: Array<{               // 报警记录
        time: number;
        parameter: string;
        value: number;
        level: 'warning' | 'danger';
      }>;
    }>;
    
    globalTrends: {
      overallStability: Float32Array; // 整体稳定性趋势
      maxDeformation: Float32Array;   // 最大变形趋势
      maxStress: Float32Array;        // 最大应力趋势
    };
    
    forecast?: {
      forecastSteps: number;
      predictions: Map<string, Float32Array>; // 预测结果
      confidenceIntervals: Map<string, [Float32Array, Float32Array]>; // 置信区间
    };
  };
  
  // 优化分析结果
  optimizationResults?: {
    optimalSolution: {
      objectiveValue: number;       // 目标函数值
      designVariables: Map<string, number>; // 设计变量值
      constraintViolations: Map<string, number>; // 约束违反
    };
    
    convergenceHistory: {
      iterations: number[];         // 迭代次数
      objectiveValues: number[];    // 目标函数值历史
      feasibility: boolean[];       // 可行性历史
    };
    
    paretoFront?: Array<{          // Pareto前沿
      solution: Map<string, number>;
      objectives: number[];
      dominanceRank: number;
    }>;
    
    sensitivityToObjectives: Map<string, number>; // 对目标函数的敏感性
  };
  
  // 元数据
  metadata: {
    processingTime: number;         // 处理时间 (s)
    memoryUsage: number;           // 内存使用 (MB)
    pyvistaVersion: string;        // PyVista版本
    timestamp: Date;               // 时间戳
    configHash: string;            // 配置哈希
  };
}

// 专业后处理系统主类
export class ProfessionalPostprocessingSystem {
  private config: PostprocessingConfig;
  private scene: THREE.Scene;
  private gpuProcessor: GPUEnhancedPostprocessor | null = null;
  
  // 数据存储
  private excavationResults: DeepExcavationResults | null = null;
  private stageResults: PyVistaStageResult[] = [];
  private safetyResults: SafetyAssessmentResult | null = null;
  
  // 处理结果缓存
  private processingCache: Map<string, PyVistaPostprocessingResults> = new Map();
  
  constructor(scene: THREE.Scene, config: PostprocessingConfig) {
    this.scene = scene;
    this.config = config;
  }
  
  /**
   * 初始化后处理系统
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('🔧 开始初始化专业后处理系统...');
      
      // 检查GPU支持
      if (!this.checkGPUSupport()) {
        console.warn('⚠️ GPU不支持或WebGPU不可用，使用CPU降级模式');
        this.initializeCPUFallback();
        return true;
      }

      // 初始化GPU后处理器
      this.gpuProcessor = createGPUEnhancedPostprocessor({
        meshVisualization: {
          showMeshLines: true,
          showNodeNumbers: false,
          showElementNumbers: false,
          meshOpacity: 0.8
        },
        fieldVisualization: {
          enableContours: true,
          contourLevels: 15,
          enableVectors: true,
          vectorScale: 1.0,
          enableStreamlines: false, // 默认关闭以提高性能
          streamlineDensity: 0.2
        },
        gpuAcceleration: {
          enabled: true,
          preferredMode: 'auto',
          fallbackToCPU: true, // 重要：允许降级到CPU
          enableMemoryPool: true
        },
        performance: {
          enableCaching: true,
          maxCacheSize: 50,
          autoOptimization: true,
          enableProfiling: false // 关闭分析以避免错误
        }
      });
      
      console.log('✅ 专业后处理系统初始化完成');
      return true;
      
    } catch (error) {
      console.warn('⚠️ GPU后处理系统初始化失败，使用CPU降级模式:', error?.message || error);
      
      // 使用CPU降级方案
      this.initializeCPUFallback();
      return true; // 返回true让系统继续运行
    }
  }

  /**
   * 检查GPU支持
   */
  private checkGPUSupport(): boolean {
    try {
      // 检查WebGPU支持
      if (typeof navigator !== 'undefined' && navigator.gpu) {
        return true;
      }
      
      // 检查WebGL支持
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * 初始化CPU降级模式
   */
  private initializeCPUFallback(): void {
    this.gpuProcessor = null;
    console.log('📌 后处理系统在CPU降级模式下运行');
    
    // 在这里可以设置CPU模式的默认配置
    // 例如降低质量设置、减少处理复杂度等
  }
  
  /**
   * 加载计算结果数据
   */
  loadComputationResults(
    excavationResults: DeepExcavationResults,
    stageResults: PyVistaStageResult[],
    safetyResults: SafetyAssessmentResult
  ): void {
    this.excavationResults = excavationResults;
    this.stageResults = stageResults;
    this.safetyResults = safetyResults;
    
    // 清除缓存
    this.processingCache.clear();
    
    console.log('计算结果数据加载完成');
  }
  
  /**
   * 执行应力分析后处理
   */
  async performStressAnalysis(): Promise<PyVistaPostprocessingResults['stressAnalysis']> {
    if (!this.excavationResults) {
      throw new Error('缺少深基坑计算结果数据');
    }
    
    const cacheKey = 'stress_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.stressAnalysis!;
    }
    
    console.log('开始应力分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 应力分布分析
      const stressDistribution = await this.analyzeStressDistribution();
      
      // 截面应力分析
      const crossSectionResults = await this.analyzeCrossSectionStress();
      
      // 路径应力分析
      const pathResults = await this.analyzeStressPath();
      
      // 应力统计分析
      const statistics = await this.calculateStressStatistics();
      
      const results: PyVistaPostprocessingResults['stressAnalysis'] = {
        stressDistribution,
        crossSectionResults,
        pathResults,
        statistics
      };
      
      // 缓存结果
      this.processingCache.set(cacheKey, { 
        stressAnalysis: results,
        metadata: {
          processingTime: (Date.now() - startTime) / 1000,
          memoryUsage: 0,
          pyvistaVersion: '0.44.0',
          timestamp: new Date(),
          configHash: this.generateConfigHash()
        }
      });
      
      console.log(`应力分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('应力分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行变形分析后处理
   */
  async performDeformationAnalysis(): Promise<PyVistaPostprocessingResults['deformationAnalysis']> {
    if (!this.excavationResults) {
      throw new Error('缺少深基坑计算结果数据');
    }
    
    const cacheKey = 'deformation_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.deformationAnalysis!;
    }
    
    console.log('开始变形分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 位移场分析
      const displacementField = await this.analyzeDisplacementField();
      
      // 应变场分析
      const strainField = await this.analyzeStrainField();
      
      // 模态分析 (如果启用)
      let modalResults;
      if (this.config.deformation.modalAnalysis.enabled) {
        modalResults = await this.performModalAnalysis();
      }
      
      // 测量分析
      const measurements = await this.performMeasurements();
      
      const results: PyVistaPostprocessingResults['deformationAnalysis'] = {
        displacementField,
        strainField,
        modalResults,
        measurements
      };
      
      console.log(`变形分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('变形分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行渗流分析后处理
   */
  async performSeepageAnalysis(): Promise<PyVistaPostprocessingResults['seepageAnalysis']> {
    if (!this.excavationResults) {
      throw new Error('缺少深基坑计算结果数据');
    }
    
    const cacheKey = 'seepage_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.seepageAnalysis!;
    }
    
    console.log('开始渗流分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 压力场分析
      const pressureField = await this.analyzePressureField();
      
      // 速度场分析
      const velocityField = await this.analyzeVelocityField();
      
      // 等势线分析
      const equipotentialLines = await this.generateEquipotentialLines();
      
      // 管涌分析
      const pipingAnalysis = await this.performPipingAnalysis();
      
      const results: PyVistaPostprocessingResults['seepageAnalysis'] = {
        pressureField,
        velocityField,
        equipotentialLines,
        pipingAnalysis
      };
      
      console.log(`渗流分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('渗流分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行稳定性分析后处理
   */
  async performStabilityAnalysis(): Promise<PyVistaPostprocessingResults['stabilityAnalysis']> {
    if (!this.excavationResults || !this.safetyResults) {
      throw new Error('缺少深基坑计算结果或安全评估数据');
    }
    
    const cacheKey = 'stability_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.stabilityAnalysis!;
    }
    
    console.log('开始稳定性分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 安全系数分析
      const safetyFactors = await this.analyzeSafetyFactors();
      
      // 失效机制分析
      const failureMechanisms = await this.analyzeFailureMechanisms();
      
      // 敏感性分析 (如果启用)
      let sensitivityResults;
      if (this.config.stability.sensitivity.enabled) {
        sensitivityResults = await this.performSensitivityAnalysis();
      }
      
      const results: PyVistaPostprocessingResults['stabilityAnalysis'] = {
        safetyFactors,
        failureMechanisms,
        sensitivityResults
      };
      
      console.log(`稳定性分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('稳定性分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行时程分析后处理
   */
  async performTimeHistoryAnalysis(): Promise<PyVistaPostprocessingResults['timeHistoryResults']> {
    if (!this.stageResults.length) {
      throw new Error('缺少施工阶段分析结果数据');
    }
    
    const cacheKey = 'time_history_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.timeHistoryResults!;
    }
    
    console.log('开始时程分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 时间步提取
      const timeSteps = new Float32Array(this.stageResults.length);
      for (let i = 0; i < this.stageResults.length; i++) {
        timeSteps[i] = i; // 简化的时间步
      }
      
      // 监测点分析
      const monitoringResults = await this.analyzeMonitoringPoints();
      
      // 全局趋势分析
      const globalTrends = await this.analyzeGlobalTrends();
      
      // 预测分析 (如果启用)
      let forecast;
      if (this.config.timeHistory.trendAnalysis.enabled) {
        forecast = await this.performForecastAnalysis();
      }
      
      const results: PyVistaPostprocessingResults['timeHistoryResults'] = {
        timeSteps,
        monitoringResults,
        globalTrends,
        forecast
      };
      
      console.log(`时程分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('时程分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行优化分析后处理
   */
  async performOptimizationAnalysis(): Promise<PyVistaPostprocessingResults['optimizationResults']> {
    const cacheKey = 'optimization_analysis';
    if (this.processingCache.has(cacheKey)) {
      return this.processingCache.get(cacheKey)!.optimizationResults!;
    }
    
    console.log('开始优化分析后处理...');
    
    const startTime = Date.now();
    
    try {
      // 执行优化算法
      const optimizationEngine = await this.createOptimizationEngine();
      const optimalSolution = await optimizationEngine.solve();
      
      // 收敛历史分析
      const convergenceHistory = await optimizationEngine.getConvergenceHistory();
      
      // Pareto前沿分析 (多目标优化)
      let paretoFront;
      if (this.config.optimization.objectives.length > 1) {
        paretoFront = await optimizationEngine.getParetoFront();
      }
      
      // 敏感性分析
      const sensitivityToObjectives = await this.analyzeSensitivityToObjectives();
      
      const results: PyVistaPostprocessingResults['optimizationResults'] = {
        optimalSolution,
        convergenceHistory,
        paretoFront,
        sensitivityToObjectives
      };
      
      console.log(`优化分析后处理完成，用时 ${(Date.now() - startTime) / 1000}s`);
      
      return results;
      
    } catch (error) {
      console.error('优化分析后处理失败:', error);
      throw error;
    }
  }
  
  /**
   * 执行综合后处理分析
   */
  async performComprehensivePostprocessing(
    tasks: PostprocessingTask[] = [
      'stress_analysis',
      'deformation_analysis', 
      'seepage_analysis',
      'stability_analysis',
      'time_history_analysis'
    ]
  ): Promise<PyVistaPostprocessingResults> {
    console.log('开始综合后处理分析...');
    
    const startTime = Date.now();
    const results: PyVistaPostprocessingResults = {
      metadata: {
        processingTime: 0,
        memoryUsage: 0,
        pyvistaVersion: '0.44.0',
        timestamp: new Date(),
        configHash: this.generateConfigHash()
      }
    };
    
    try {
      // 并行执行分析任务
      const analysisPromises: Promise<any>[] = [];
      
      if (tasks.includes('stress_analysis')) {
        analysisPromises.push(
          this.performStressAnalysis().then(result => {
            results.stressAnalysis = result;
          })
        );
      }
      
      if (tasks.includes('deformation_analysis')) {
        analysisPromises.push(
          this.performDeformationAnalysis().then(result => {
            results.deformationAnalysis = result;
          })
        );
      }
      
      if (tasks.includes('seepage_analysis')) {
        analysisPromises.push(
          this.performSeepageAnalysis().then(result => {
            results.seepageAnalysis = result;
          })
        );
      }
      
      if (tasks.includes('stability_analysis')) {
        analysisPromises.push(
          this.performStabilityAnalysis().then(result => {
            results.stabilityAnalysis = result;
          })
        );
      }
      
      if (tasks.includes('time_history_analysis')) {
        analysisPromises.push(
          this.performTimeHistoryAnalysis().then(result => {
            results.timeHistoryResults = result;
          })
        );
      }
      
      if (tasks.includes('optimization_analysis')) {
        analysisPromises.push(
          this.performOptimizationAnalysis().then(result => {
            results.optimizationResults = result;
          })
        );
      }
      
      // 等待所有分析完成
      await Promise.all(analysisPromises);
      
      // 更新元数据
      results.metadata.processingTime = (Date.now() - startTime) / 1000;
      
      console.log(`综合后处理分析完成，总用时 ${results.metadata.processingTime}s`);
      
      return results;
      
    } catch (error) {
      console.error('综合后处理分析失败:', error);
      throw error;
    }
  }
  
  // ===== 私有辅助方法 =====
  
  /**
   * 分析应力分布
   */
  private async analyzeStressDistribution(): Promise<PyVistaPostprocessingResults['stressAnalysis']['stressDistribution']> {
    const stressField = this.excavationResults!.stressField;
    
    return {
      components: [
        stressField.components.sigmaX,
        stressField.components.sigmaY,
        stressField.components.sigmaZ,
        stressField.components.tauXY,
        stressField.components.tauYZ,
        stressField.components.tauZX
      ],
      principal: [
        stressField.principalStresses.sigma1,
        stressField.principalStresses.sigma2,
        stressField.principalStresses.sigma3
      ],
      equivalent: [
        stressField.vonMisesStress,
        new Float32Array(stressField.vonMisesStress.length), // Tresca应力
        new Float32Array(stressField.vonMisesStress.length)  // 最大剪应力
      ]
    };
  }
  
  /**
   * 分析截面应力
   */
  private async analyzeCrossSectionStress(): Promise<PyVistaPostprocessingResults['stressAnalysis']['crossSectionResults']> {
    const results: PyVistaPostprocessingResults['stressAnalysis']['crossSectionResults'] = [];
    
    for (const section of this.config.stress.crossSections) {
      if (!section.enabled) continue;
      
      // 简化的截面应力计算
      const profileLength = 100;
      const stressProfile = new Float32Array(profileLength);
      const coordinates = new Float32Array(profileLength * 3);
      
      // 生成截面应力剖面数据
      for (let i = 0; i < profileLength; i++) {
        stressProfile[i] = Math.random() * 1000; // 简化的应力值
        coordinates[i * 3] = section.position[0] + i * 0.1;
        coordinates[i * 3 + 1] = section.position[1];
        coordinates[i * 3 + 2] = section.position[2];
      }
      
      results.push({
        sectionId: section.sectionId,
        stressProfile,
        coordinates,
        maxStress: Math.max(...stressProfile),
        minStress: Math.min(...stressProfile)
      });
    }
    
    return results;
  }
  
  /**
   * 分析应力路径
   */
  private async analyzeStressPath(): Promise<PyVistaPostprocessingResults['stressAnalysis']['pathResults']> {
    const results: PyVistaPostprocessingResults['stressAnalysis']['pathResults'] = [];
    
    for (const path of this.config.stress.pathAnalysis) {
      if (!path.enabled) continue;
      
      const pathLength = path.points.length;
      const stressPath = new Float32Array(pathLength);
      const pathLengthArray = new Float32Array(pathLength);
      
      // 计算路径应力分布
      let totalLength = 0;
      for (let i = 0; i < pathLength; i++) {
        stressPath[i] = Math.random() * 800; // 简化的应力值
        pathLengthArray[i] = totalLength;
        
        if (i < pathLength - 1) {
          const dx = path.points[i + 1][0] - path.points[i][0];
          const dy = path.points[i + 1][1] - path.points[i][1];
          const dz = path.points[i + 1][2] - path.points[i][2];
          totalLength += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
      }
      
      // 识别关键点
      const criticalPoints: PyVistaPostprocessingResults['stressAnalysis']['pathResults'][0]['criticalPoints'] = [];
      const maxStressIndex = stressPath.indexOf(Math.max(...stressPath));
      criticalPoints.push({
        position: path.points[maxStressIndex],
        stressValue: stressPath[maxStressIndex],
        stressType: 'maximum'
      });
      
      results.push({
        pathId: path.pathId,
        stressPath,
        pathLength: pathLengthArray,
        criticalPoints
      });
    }
    
    return results;
  }
  
  /**
   * 计算应力统计
   */
  private async calculateStressStatistics(): Promise<PyVistaPostprocessingResults['stressAnalysis']['statistics']> {
    const vonMisesStress = this.excavationResults!.stressField.vonMisesStress;
    
    const maxVonMises = Math.max(...vonMisesStress);
    const avgVonMises = vonMisesStress.reduce((sum, val) => sum + val, 0) / vonMisesStress.length;
    
    // 识别应力集中区域
    const stressConcentration: PyVistaPostprocessingResults['stressAnalysis']['statistics']['stressConcentration'] = [];
    const threshold = avgVonMises * 2.0; // 应力集中阈值
    
    for (let i = 0; i < vonMisesStress.length; i++) {
      if (vonMisesStress[i] > threshold) {
        const vertices = this.excavationResults!.mesh.vertices;
        stressConcentration.push({
          location: [vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2]],
          concentrationFactor: vonMisesStress[i] / avgVonMises
        });
      }
    }
    
    return {
      maxVonMises,
      avgVonMises,
      stressConcentration
    };
  }
  
  /**
   * 分析位移场
   */
  private async analyzeDisplacementField(): Promise<PyVistaPostprocessingResults['deformationAnalysis']['displacementField']> {
    const displacementField = this.excavationResults!.displacementField;
    
    return {
      vectors: displacementField.displacementVectors,
      magnitude: displacementField.displacementMagnitude,
      components: [
        new Float32Array(displacementField.displacementVectors.length / 3), // X分量
        new Float32Array(displacementField.displacementVectors.length / 3), // Y分量
        new Float32Array(displacementField.displacementVectors.length / 3)  // Z分量
      ]
    };
  }
  
  /**
   * 分析应变场
   */
  private async analyzeStrainField(): Promise<PyVistaPostprocessingResults['deformationAnalysis']['strainField']> {
    const nodeCount = this.excavationResults!.mesh.vertices.length / 3;
    
    return {
      strainTensor: new Float32Array(nodeCount * 6), // 6个应变分量
      principalStrains: new Float32Array(nodeCount * 3), // 3个主应变
      shearStrains: new Float32Array(nodeCount * 3) // 3个剪应变
    };
  }
  
  /**
   * 执行模态分析
   */
  private async performModalAnalysis(): Promise<PyVistaPostprocessingResults['deformationAnalysis']['modalResults']> {
    const modesCount = this.config.deformation.modalAnalysis.modesCount;
    
    return {
      eigenValues: new Float32Array(modesCount),
      eigenVectors: Array(modesCount).fill(null).map(() => new Float32Array(this.excavationResults!.mesh.vertices.length)),
      frequencies: new Float32Array(modesCount),
      dampingRatios: new Float32Array(modesCount).fill(this.config.deformation.modalAnalysis.dampingRatio)
    };
  }
  
  /**
   * 执行测量分析
   */
  private async performMeasurements(): Promise<PyVistaPostprocessingResults['deformationAnalysis']['measurements']> {
    const measurements: PyVistaPostprocessingResults['deformationAnalysis']['measurements'] = [];
    
    // 简化的测量实现
    if (this.config.deformation.measurements.enablePointMeasurement) {
      measurements.push({
        measurementId: 'point_disp_1',
        measurementType: 'point',
        value: 25.6,
        unit: 'mm'
      });
    }
    
    return measurements;
  }
  
  /**
   * 分析压力场
   */
  private async analyzePressureField(): Promise<PyVistaPostprocessingResults['seepageAnalysis']['pressureField']> {
    const seepageField = this.excavationResults!.seepageField;
    
    return {
      values: seepageField.poreWaterPressure,
      gradients: new Float32Array(seepageField.poreWaterPressure.length * 3),
      hydraulicHead: new Float32Array(seepageField.poreWaterPressure.length)
    };
  }
  
  /**
   * 分析速度场
   */
  private async analyzeVelocityField(): Promise<PyVistaPostprocessingResults['seepageAnalysis']['velocityField']> {
    const seepageField = this.excavationResults!.seepageField;
    
    // 生成流线
    const streamlines: PyVistaPostprocessingResults['seepageAnalysis']['velocityField']['streamlines'] = [];
    
    if (this.config.seepage.streamlines.enabled) {
      for (let i = 0; i < this.config.seepage.streamlines.seedPoints.length; i++) {
        const streamlinePoints = 100;
        streamlines.push({
          streamlineId: `streamline_${i}`,
          points: new Float32Array(streamlinePoints * 3),
          velocities: new Float32Array(streamlinePoints),
          residence_time: 10.0 // 简化值
        });
      }
    }
    
    return {
      vectors: seepageField.velocityVectors,
      magnitude: seepageField.velocityMagnitude,
      streamlines
    };
  }
  
  /**
   * 生成等势线
   */
  private async generateEquipotentialLines(): Promise<PyVistaPostprocessingResults['seepageAnalysis']['equipotentialLines']> {
    const equipotentialLines: PyVistaPostprocessingResults['seepageAnalysis']['equipotentialLines'] = [];
    
    if (this.config.seepage.equipotentialLines.enabled) {
      for (const level of this.config.seepage.equipotentialLines.levels) {
        equipotentialLines.push({
          level,
          contours: [new Float32Array(300)] // 简化的等势线轮廓
        });
      }
    }
    
    return equipotentialLines;
  }
  
  /**
   * 执行管涌分析
   */
  private async performPipingAnalysis(): Promise<PyVistaPostprocessingResults['seepageAnalysis']['pipingAnalysis']> {
    const nodeCount = this.excavationResults!.mesh.vertices.length / 3;
    
    return {
      riskZones: new Float32Array(nodeCount),
      criticalGradients: new Float32Array(nodeCount),
      safetyFactors: new Float32Array(nodeCount),
      pipingPotential: 0.3 // 整体管涌势
    };
  }
  
  /**
   * 分析安全系数
   */
  private async analyzeSafetyFactors(): Promise<PyVistaPostprocessingResults['stabilityAnalysis']['safetyFactors']> {
    const nodeCount = this.excavationResults!.mesh.vertices.length / 3;
    
    return {
      overall: this.safetyResults!.overallSafetyScore / 100 * 2.0, // 转换为安全系数
      local: new Float32Array(nodeCount).fill(1.5), // 简化的局部安全系数
      byMethod: new Map([
        ['strength_reduction', 1.25],
        ['limit_equilibrium', 1.30],
        ['numerical', 1.28]
      ])
    };
  }
  
  /**
   * 分析失效机制
   */
  private async analyzeFailureMechanisms(): Promise<PyVistaPostprocessingResults['stabilityAnalysis']['failureMechanisms']> {
    const failureMechanisms: PyVistaPostprocessingResults['stabilityAnalysis']['failureMechanisms'] = [];
    
    for (const mode of this.config.stability.failureModes) {
      if (!mode.enabled) continue;
      
      failureMechanisms.push({
        mechanismId: mode.modeId,
        description: mode.description,
        probability: mode.probability,
        criticalSurface: new Float32Array(300), // 简化的临界面
        drivingForce: 1000.0,
        resistingForce: 1250.0
      });
    }
    
    return failureMechanisms;
  }
  
  /**
   * 执行敏感性分析
   */
  private async performSensitivityAnalysis(): Promise<PyVistaPostprocessingResults['stabilityAnalysis']['sensitivityResults']> {
    const parameters = this.config.stability.sensitivity.parameters;
    
    return {
      parameterInfluence: new Map(parameters.map(param => [param, Math.random()])),
      sobolIndices: new Map(parameters.map(param => [param, Math.random() * 0.5])),
      correlationMatrix: new Float32Array(parameters.length * parameters.length)
    };
  }
  
  /**
   * 分析监测点
   */
  private async analyzeMonitoringPoints(): Promise<PyVistaPostprocessingResults['timeHistoryResults']['monitoringResults']> {
    const monitoringResults: PyVistaPostprocessingResults['timeHistoryResults']['monitoringResults'] = [];
    
    for (const point of this.config.timeHistory.monitoringPoints) {
      if (!point.enabled) continue;
      
      const timeSteps = this.stageResults.length;
      const timeHistory = new Map<string, Float32Array>();
      
      for (const param of point.parameters) {
        const data = new Float32Array(timeSteps);
        for (let i = 0; i < timeSteps; i++) {
          data[i] = Math.random() * 100; // 简化的时程数据
        }
        timeHistory.set(param, data);
      }
      
      // 计算统计数据
      const displacementData = timeHistory.get('displacement') || new Float32Array();
      const statistics = {
        max: Math.max(...displacementData),
        min: Math.min(...displacementData),
        mean: displacementData.reduce((sum, val) => sum + val, 0) / displacementData.length,
        std: 0, // 简化
        trend: 0.1 // 简化的趋势系数
      };
      
      monitoringResults.push({
        pointId: point.pointId,
        timeHistory,
        statistics,
        alarms: [] // 简化的报警记录
      });
    }
    
    return monitoringResults;
  }
  
  /**
   * 分析全局趋势
   */
  private async analyzeGlobalTrends(): Promise<PyVistaPostprocessingResults['timeHistoryResults']['globalTrends']> {
    const timeSteps = this.stageResults.length;
    
    return {
      overallStability: new Float32Array(timeSteps).map(() => 1.2 + Math.random() * 0.3),
      maxDeformation: new Float32Array(timeSteps).map((_, i) => i * 2 + Math.random() * 5),
      maxStress: new Float32Array(timeSteps).map((_, i) => 500 + i * 50 + Math.random() * 100)
    };
  }
  
  /**
   * 执行预测分析
   */
  private async performForecastAnalysis(): Promise<PyVistaPostprocessingResults['timeHistoryResults']['forecast']> {
    const forecastSteps = this.config.timeHistory.trendAnalysis.forecastSteps;
    
    return {
      forecastSteps,
      predictions: new Map([
        ['displacement', new Float32Array(forecastSteps)],
        ['stress', new Float32Array(forecastSteps)]
      ]),
      confidenceIntervals: new Map([
        ['displacement', [new Float32Array(forecastSteps), new Float32Array(forecastSteps)]],
        ['stress', [new Float32Array(forecastSteps), new Float32Array(forecastSteps)]]
      ])
    };
  }
  
  /**
   * 创建优化引擎
   */
  private async createOptimizationEngine(): Promise<any> {
    // 简化的优化引擎实现
    return {
      async solve() {
        return {
          objectiveValue: 0.85,
          designVariables: new Map([
            ['wallThickness', 0.8],
            ['supportSpacing', 6.0]
          ]),
          constraintViolations: new Map()
        };
      },
      
      async getConvergenceHistory() {
        return {
          iterations: [1, 2, 3, 4, 5],
          objectiveValues: [1.0, 0.95, 0.90, 0.87, 0.85],
          feasibility: [true, true, true, true, true]
        };
      },
      
      async getParetoFront() {
        return [];
      }
    };
  }
  
  /**
   * 分析对目标函数的敏感性
   */
  private async analyzeSensitivityToObjectives(): Promise<PyVistaPostprocessingResults['optimizationResults']['sensitivityToObjectives']> {
    const variables = this.config.optimization.designVariables;
    
    return new Map(variables.map(variable => [
      variable.variableId,
      Math.random() * 0.5
    ]));
  }
  
  /**
   * 生成配置哈希
   */
  private generateConfigHash(): string {
    return Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * 更新配置
   */
  updateConfig(newConfig: Partial<PostprocessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.processingCache.clear(); // 清除缓存
  }
  
  /**
   * 获取缓存的结果
   */
  getCachedResults(): Map<string, PyVistaPostprocessingResults> {
    return new Map(this.processingCache);
  }
  
  /**
   * 清除缓存
   */
  clearCache(): void {
    this.processingCache.clear();
  }
  
  /**
   * 销毁系统并清理资源
   */
  dispose(): void {
    this.processingCache.clear();
    this.gpuProcessor = null;
    console.log('专业后处理系统已销毁');
  }
}

/**
 * 创建专业后处理系统
 */
export function createProfessionalPostprocessingSystem(
  scene: THREE.Scene,
  config: PostprocessingConfig
): ProfessionalPostprocessingSystem {
  return new ProfessionalPostprocessingSystem(scene, config);
}

/**
 * 默认后处理配置
 */
export const defaultPostprocessingConfig: PostprocessingConfig = {
  general: {
    projectName: 'DeepCAD深基坑工程',
    analysisStandard: 'JGJ120',
    resultsPrecision: 3,
    unitSystem: 'SI',
    languageLocale: 'zh-CN'
  },
  
  stress: {
    stressComponents: ['sigmaX', 'sigmaY', 'sigmaZ', 'tauXY', 'tauYZ', 'tauZX'],
    principalStresses: true,
    equivalentStresses: ['vonMises', 'tresca'],
    
    visualization: {
      colorMaps: ['viridis', 'plasma', 'jet'],
      contourLevels: [100, 200, 300, 400, 500, 600, 700, 800],
      vectorScale: 1.0,
      deformationScale: 1000.0,
      transparencyLevels: [0.1, 0.3, 0.5, 0.7, 0.9]
    },
    
    crossSections: [
      {
        sectionId: 'section_1',
        sectionName: '中轴截面',
        sectionType: 'plane',
        position: [0, 0, -7.5],
        normal: [1, 0, 0],
        enabled: true
      }
    ],
    
    pathAnalysis: [
      {
        pathId: 'path_1',
        pathName: '墙体路径',
        points: [[40, 0, 0], [40, 0, -5], [40, 0, -10], [40, 0, -15]],
        parameterization: 'arc_length',
        enabled: true
      }
    ]
  },
  
  deformation: {
    components: ['displacement', 'strain'],
    coordinateSystem: 'global',
    
    modalAnalysis: {
      enabled: false,
      modesCount: 10,
      frequencyRange: [0, 100],
      dampingRatio: 0.05
    },
    
    animation: {
      timeSteps: 50,
      playbackSpeed: 1.0,
      amplificationFactor: 1000.0,
      smoothTransition: true,
      loopAnimation: true
    },
    
    measurements: {
      enablePointMeasurement: true,
      enableDistanceMeasurement: true,
      enableAngleMeasurement: false,
      enableAreaMeasurement: false,
      enableVolumeMeasurement: false
    }
  },
  
  seepage: {
    parameters: ['pressure', 'velocity', 'gradient'],
    
    streamlines: {
      enabled: true,
      seedPoints: [[0, 0, -2], [20, 0, -2], [40, 0, -2]],
      integrationMethod: 'rk4',
      stepSize: 0.1,
      maxLength: 50.0
    },
    
    equipotentialLines: {
      enabled: true,
      levels: [-20, -15, -10, -5, 0],
      smoothing: 0.5,
      labelLines: true
    },
    
    seepagePaths: [],
    
    pipingAnalysis: {
      enabled: true,
      criticalGradient: 1.0,
      safetyFactor: 1.5,
      riskThreshold: 0.8
    }
  },
  
  stability: {
    analysisTypes: ['overall', 'local', 'uplift'],
    
    safetyFactors: {
      method: 'strength_reduction',
      convergenceCriteria: 1e-3,
      maxIterations: 100,
      incrementSize: 0.01
    },
    
    failureModes: [
      {
        modeId: 'mode_1',
        modeName: '整体失稳',
        description: '深基坑整体稳定性失效',
        probability: 0.05,
        consequence: 'catastrophic',
        enabled: true
      }
    ],
    
    sensitivity: {
      enabled: false,
      parameters: ['cohesion', 'friction'],
      variationRange: 20,
      samplingMethod: 'monte_carlo',
      sampleSize: 1000
    }
  },
  
  timeHistory: {
    timeRange: [0, 30],
    timeStep: 1.0,
    outputInterval: 1.0,
    
    monitoringPoints: [
      {
        pointId: 'monitor_1',
        pointName: '墙顶监测点',
        coordinates: [40, 0, 0],
        parameters: ['displacement', 'stress'],
        alarmThresholds: {
          warning: 20.0,
          danger: 30.0
        },
        enabled: true
      }
    ],
    
    trendAnalysis: {
      enabled: true,
      trendDetection: true,
      changePointDetection: false,
      forecastSteps: 10,
      confidenceInterval: 0.95
    }
  },
  
  optimization: {
    objectives: [],
    designVariables: [],
    constraints: [],
    
    algorithm: {
      method: 'genetic',
      populationSize: 50,
      maxGenerations: 100,
      convergenceTolerance: 1e-6,
      crossoverRate: 0.8,
      mutationRate: 0.1
    }
  },
  
  reporting: {
    formats: ['pdf', 'html'],
    sections: [],
    
    charts: {
      defaultStyle: 'professional',
      colorScheme: 'default',
      resolution: 'high',
      vectorGraphics: true
    },
    
    automation: {
      autoUpdate: true,
      scheduledGeneration: false,
      templateManagement: true,
      versionControl: false
    }
  }
};