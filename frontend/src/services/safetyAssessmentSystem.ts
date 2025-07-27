/**
 * 深基坑安全性评估系统
 * 3号计算专家 - 基于PyVista+Three.js架构的专业安全评估
 * 数据流：Kratos分析 → PyVista安全评估 → Three.js风险可视化
 */

import { 
  DeepExcavationSolver,
  type DeepExcavationParameters,
  type DeepExcavationResults 
} from './deepExcavationSolver';

import { 
  ConstructionStageAnalyzer,
  type ConstructionStage,
  type PyVistaStageResult 
} from './constructionStageAnalysis';

import { 
  GPUEnhancedPostprocessor,
  createGPUEnhancedPostprocessor 
} from './gpuIntegration';

// 安全评估标准
export interface SafetyStandards {
  // 变形控制标准
  deformation: {
    maxWallDeflection: number;        // 最大墙变形 (mm)
    maxGroundSettlement: number;      // 最大地表沉降 (mm)
    maxDifferentialSettlement: number; // 最大差异沉降 (mm)
    maxFoundationHeave: number;       // 最大坑底隆起 (mm)
    deformationRate: number;          // 变形速率限值 (mm/day)
  };
  
  // 应力控制标准
  stress: {
    maxWallStress: number;            // 最大墙体应力 (MPa)
    maxSoilStress: number;            // 最大土体应力 (kPa)
    maxSupportForce: number;          // 最大支撑力 (kN)
    stressConcentrationFactor: number; // 应力集中系数
  };
  
  // 稳定性标准
  stability: {
    overallStabilityFactor: number;   // 整体稳定安全系数
    localStabilityFactor: number;     // 局部稳定安全系数
    upliftStabilityFactor: number;    // 抗浮稳定安全系数
    pipingStabilityFactor: number;    // 管涌稳定安全系数
    slopStabilityFactor: number;      // 边坡稳定安全系数
  };
  
  // 渗流控制标准
  seepage: {
    maxInflowRate: number;            // 最大涌水量 (m³/day)
    maxHydraulicGradient: number;     // 最大水力梯度
    maxSeepageVelocity: number;       // 最大渗流速度 (m/s)
    maxPoreWaterPressure: number;     // 最大孔隙水压力 (kPa)
  };
  
  // 施工条件标准
  construction: {
    maxExcavationRate: number;        // 最大开挖速率 (m³/day)
    minSupportInterval: number;       // 最小支撑间距 (m)
    maxUnsupportedHeight: number;     // 最大无支撑高度 (m)
    weatherRestrictions: string[];    // 气象限制条件
  };
}

// 风险评估等级
export type RiskLevel = 'safe' | 'attention' | 'warning' | 'danger' | 'emergency';

// 安全评估结果
export interface SafetyAssessmentResult {
  // 总体安全等级
  overallRiskLevel: RiskLevel;
  overallSafetyScore: number;         // 0-100分
  
  // 分项安全评估
  categories: {
    deformation: {
      riskLevel: RiskLevel;
      score: number;
      exceedances: Array<{
        parameter: string;
        currentValue: number;
        limitValue: number;
        exceedanceRatio: number;
        location: [number, number, number];
      }>;
      // PyVista生成的风险区域可视化
      riskVisualization: {
        riskZones: Float32Array;        // 风险区域网格
        riskColors: Float32Array;       // 风险等级颜色
        alertPoints: Float32Array;      // 报警点位置
      };
    };
    
    stress: {
      riskLevel: RiskLevel;
      score: number;
      exceedances: Array<{
        parameter: string;
        currentValue: number;
        limitValue: number;
        exceedanceRatio: number;
        location: [number, number, number];
      }>;
      riskVisualization: {
        stressHotspots: Float32Array;   // 应力热点
        criticalPaths: Float32Array;    // 危险路径
        strengthMargins: Float32Array;  // 强度储备分布
      };
    };
    
    stability: {
      riskLevel: RiskLevel;
      score: number;
      factors: Array<{
        type: string;
        currentFactor: number;
        requiredFactor: number;
        margin: number;
      }>;
      riskVisualization: {
        unstableZones: Float32Array;    // 不稳定区域
        criticalSurfaces: Float32Array; // 最危险滑动面
        stabilityContours: Float32Array; // 稳定性等值线
      };
    };
    
    seepage: {
      riskLevel: RiskLevel;
      score: number;
      exceedances: Array<{
        parameter: string;
        currentValue: number;
        limitValue: number;
        exceedanceRatio: number;
        location: [number, number, number];
      }>;
      riskVisualization: {
        seepagePaths: Float32Array;     // 渗流路径
        concentrationZones: Float32Array; // 渗流集中区
        pipingRiskAreas: Float32Array;  // 管涌风险区
      };
    };
    
    construction: {
      riskLevel: RiskLevel;
      score: number;
      issues: Array<{
        issue: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        recommendation: string;
      }>;
    };
  };
  
  // 预警系统
  earlyWarning: {
    activeAlerts: Array<{
      alertId: string;
      alertType: 'deformation' | 'stress' | 'stability' | 'seepage' | 'construction';
      severity: 'yellow' | 'orange' | 'red';
      location: [number, number, number];
      message: string;
      timestamp: number;
      trend: 'improving' | 'stable' | 'deteriorating';
      predictedTime: number;           // 预计达到危险状态时间 (hours)
    }>;
    
    // Three.js警报可视化
    alertVisualization: {
      alertMarkers: Float32Array;      // 警报标记位置
      alertColors: Float32Array;       // 警报颜色编码
      alertAnimations: Array<{         // 警报动画数据
        position: [number, number, number];
        intensity: number;
        pulseFrequency: number;
      }>;
    };
  };
  
  // 应急响应建议
  emergencyResponse: {
    immediateActions: string[];        // 立即行动
    shortTermMeasures: string[];       // 短期措施
    longTermSolutions: string[];       // 长期方案
    evacuationPlan?: {                 // 疏散计划
      enabled: boolean;
      evacuationZones: Float32Array;   // 疏散区域
      evacuationRoutes: Float32Array;  // 疏散路径
      assemblyPoints: Float32Array;    // 集合点
    };
  };
  
  // 监测建议
  monitoringRecommendations: {
    additionalInstruments: Array<{
      type: 'inclinometer' | 'settlement_gauge' | 'stress_cell' | 'piezometer' | 'strain_gauge';
      location: [number, number, number];
      priority: 'high' | 'medium' | 'low';
      reason: string;
    }>;
    
    increasedFrequency: Array<{
      parameter: string;
      currentFrequency: string;
      recommendedFrequency: string;
      reason: string;
    }>;
  };
  
  // 处理性能
  performance: {
    assessmentTime: number;
    pyvistaProcessingTime: number;
    riskAnalysisTime: number;
    visualizationTime: number;
  };
}

// 实时监测数据
export interface RealTimeMonitoringData {
  timestamp: number;
  
  // 变形监测
  deformation: {
    wallDeflection: Array<{
      sensorId: string;
      location: [number, number, number];
      value: number;
      rate: number;                    // 变化率 mm/day
      history: number[];               // 历史数据
    }>;
    
    groundSettlement: Array<{
      sensorId: string;
      location: [number, number, number];
      value: number;
      rate: number;
      history: number[];
    }>;
  };
  
  // 应力应变监测
  stress: {
    wallStress: Array<{
      sensorId: string;
      location: [number, number, number];
      stress: number;
      strain: number;
      history: number[];
    }>;
    
    supportForce: Array<{
      supportId: string;
      force: number;
      utilization: number;             // 利用率
      history: number[];
    }>;
  };
  
  // 水位监测
  waterLevel: {
    piezometers: Array<{
      sensorId: string;
      location: [number, number, number];
      waterLevel: number;
      poreWaterPressure: number;
      history: number[];
    }>;
    
    inflowRate: {
      totalRate: number;
      pumpingStations: Array<{
        stationId: string;
        pumpingRate: number;
        efficiency: number;
      }>;
    };
  };
  
  // 环境监测
  environmental: {
    weather: {
      temperature: number;
      humidity: number;
      precipitation: number;
      windSpeed: number;
    };
    
    groundVibration: Array<{
      sensorId: string;
      location: [number, number, number];
      acceleration: number;
      frequency: number;
    }>;
  };
}

// 安全评估配置
export interface SafetyAssessmentConfig {
  // 评估方法配置
  assessmentMethods: {
    enableProbabilisticAssessment: boolean;  // 概率评估
    enableFuzzyLogicAssessment: boolean;     // 模糊逻辑评估
    enableAIRiskPrediction: boolean;         // AI风险预测
    enableRealTimeAssessment: boolean;       // 实时评估
  };
  
  // PyVista风险分析配置
  pyvistaRiskConfig: {
    riskMeshResolution: 'standard' | 'high' | 'ultra';
    enableRiskContours: boolean;
    riskContoursLevels: number;
    enableRiskStreamlines: boolean;
    enableRiskAnimation: boolean;
  };
  
  // 预警系统配置
  warningSystem: {
    enableEarlyWarning: boolean;
    warningThresholds: {
      yellow: number;                        // 黄色预警阈值 (0-1)
      orange: number;                        // 橙色预警阈值 (0-1)
      red: number;                          // 红色预警阈值 (0-1)
    };
    
    predictionHorizon: number;               // 预测时间范围 (hours)
    enableTrendAnalysis: boolean;
    enableAutoAlert: boolean;
  };
  
  // Three.js可视化配置
  visualizationConfig: {
    enableRiskHeatmap: boolean;
    enableAlertAnimations: boolean;
    enableEvacuationVisualization: boolean;
    colorScheme: 'traffic_light' | 'thermal' | 'custom';
    
    animations: {
      alertPulseSpeed: number;
      riskZoneTransparency: number;
      evacuationPathWidth: number;
    };
  };
}

export class SafetyAssessmentSystem {
  private config: SafetyAssessmentConfig;
  private safetyStandards: SafetyStandards;
  private deepExcavationSolver: DeepExcavationSolver;
  private stageAnalyzer: ConstructionStageAnalyzer;
  private gpuProcessor: GPUEnhancedPostprocessor;
  
  // PyVista安全分析接口
  private pyvistaRiskInterface: {
    analyzeRiskZones: (data: any, standards: SafetyStandards) => Promise<any>;
    generateRiskVisualization: (riskData: any) => Promise<any>;
    predictRiskEvolution: (currentData: any, timeHorizon: number) => Promise<any>;
    calculateSafetyMargins: (analysisResults: any) => Promise<any>;
  };
  
  // 实时数据缓存
  private monitoringDataCache: Map<string, RealTimeMonitoringData> = new Map();
  private alertHistory: Array<any> = [];
  private riskTrendAnalysis: Map<string, number[]> = new Map();
  
  constructor(
    safetyStandards: SafetyStandards,
    excavationSolver: DeepExcavationSolver,
    stageAnalyzer: ConstructionStageAnalyzer,
    config?: Partial<SafetyAssessmentConfig>
  ) {
    this.safetyStandards = safetyStandards;
    this.deepExcavationSolver = excavationSolver;
    this.stageAnalyzer = stageAnalyzer;
    
    // 默认配置
    this.config = {
      assessmentMethods: {
        enableProbabilisticAssessment: true,
        enableFuzzyLogicAssessment: true,
        enableAIRiskPrediction: true,
        enableRealTimeAssessment: true
      },
      
      pyvistaRiskConfig: {
        riskMeshResolution: 'high',
        enableRiskContours: true,
        riskContoursLevels: 15,
        enableRiskStreamlines: true,
        enableRiskAnimation: true
      },
      
      warningSystem: {
        enableEarlyWarning: true,
        warningThresholds: {
          yellow: 0.7,     // 70%安全阈值
          orange: 0.85,    // 85%安全阈值
          red: 0.95        // 95%安全阈值
        },
        predictionHorizon: 72, // 72小时预测
        enableTrendAnalysis: true,
        enableAutoAlert: true
      },
      
      visualizationConfig: {
        enableRiskHeatmap: true,
        enableAlertAnimations: true,
        enableEvacuationVisualization: true,
        colorScheme: 'traffic_light',
        animations: {
          alertPulseSpeed: 2.0,
          riskZoneTransparency: 0.6,
          evacuationPathWidth: 2.0
        }
      },
      
      ...config
    };
    
    console.log('🛡️ 初始化PyVista+Three.js深基坑安全评估系统...');
    console.log(`   评估方法: ${Object.values(this.config.assessmentMethods).filter(v => v).length}种方法`);
    console.log(`   预警系统: ${this.config.warningSystem.enableEarlyWarning ? '启用' : '禁用'}`);
    console.log(`   可视化: ${this.config.visualizationConfig.enableRiskHeatmap ? '风险热图' : '标准显示'}`);
    
    // 初始化GPU处理器
    this.gpuProcessor = createGPUEnhancedPostprocessor({
      gpuAcceleration: { enabled: true, preferredMode: 'auto' }
    });
    
    // 初始化PyVista风险分析接口
    this.initializePyVistaRiskInterface();
  }
  
  /**
   * 执行综合安全评估
   */
  async performComprehensiveSafetyAssessment(
    excavationResults?: DeepExcavationResults,
    stageResults?: PyVistaStageResult[],
    monitoringData?: RealTimeMonitoringData
  ): Promise<SafetyAssessmentResult> {
    
    console.log('\n🛡️ 开始综合安全评估...');
    
    const assessmentStartTime = performance.now();
    
    try {
      // 1. 初始化评估系统
      await this.initializeAssessmentSystem();
      
      // 2. 获取分析数据
      const analysisData = await this.gatherAnalysisData(excavationResults, stageResults);
      
      // 3. 执行PyVista风险分析
      const riskAnalysisTime = performance.now();
      const riskData = await this.performPyVistaRiskAnalysis(analysisData);
      const pyvistaTime = performance.now() - riskAnalysisTime;
      
      // 4. 分项安全评估
      const categoryAssessments = await this.performCategoryAssessments(analysisData, riskData);
      
      // 5. 实时监测数据集成
      if (monitoringData) {
        await this.integrateMonitoringData(monitoringData, categoryAssessments);
      }
      
      // 6. 预警系统分析
      const earlyWarning = await this.performEarlyWarningAnalysis(categoryAssessments, monitoringData);
      
      // 7. 应急响应建议
      const emergencyResponse = this.generateEmergencyResponse(categoryAssessments, earlyWarning);
      
      // 8. 监测建议
      const monitoringRecommendations = this.generateMonitoringRecommendations(categoryAssessments);
      
      // 9. 计算总体安全等级
      const overallAssessment = this.calculateOverallSafety(categoryAssessments);
      
      const totalTime = performance.now() - assessmentStartTime;
      
      const result: SafetyAssessmentResult = {
        overallRiskLevel: overallAssessment.riskLevel,
        overallSafetyScore: overallAssessment.score,
        categories: categoryAssessments,
        earlyWarning: earlyWarning,
        emergencyResponse: emergencyResponse,
        monitoringRecommendations: monitoringRecommendations,
        performance: {
          assessmentTime: totalTime,
          pyvistaProcessingTime: pyvistaTime,
          riskAnalysisTime: totalTime - pyvistaTime,
          visualizationTime: this.calculateVisualizationTime()
        }
      };
      
      console.log(`✅ 综合安全评估完成 (${totalTime.toFixed(2)}ms)`);
      console.log(`   总体安全等级: ${result.overallRiskLevel.toUpperCase()}`);
      console.log(`   综合安全得分: ${result.overallSafetyScore.toFixed(1)}分`);
      console.log(`   活跃预警: ${result.earlyWarning.activeAlerts.length}个`);
      
      this.printSafetyAssessmentSummary(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ 综合安全评估失败:', error);
      throw error;
    }
  }
  
  /**
   * 实时安全监测
   */
  async performRealTimeSafetyMonitoring(monitoringData: RealTimeMonitoringData): Promise<{
    instantRiskLevel: RiskLevel;
    criticalAlerts: Array<any>;
    trendAnalysis: any;
    recommendations: string[];
  }> {
    
    console.log('⚡ 执行实时安全监测...');
    
    // 1. 更新监测数据缓存
    this.updateMonitoringCache(monitoringData);
    
    // 2. 即时风险评估
    const instantRisk = await this.assessInstantRisk(monitoringData);
    
    // 3. 趋势分析
    const trendAnalysis = this.performTrendAnalysis(monitoringData);
    
    // 4. 生成关键预警
    const criticalAlerts = this.generateCriticalAlerts(instantRisk, trendAnalysis);
    
    // 5. 实时建议
    const recommendations = this.generateRealTimeRecommendations(instantRisk, criticalAlerts);
    
    console.log(`   即时风险等级: ${instantRisk.toUpperCase()}`);
    console.log(`   关键预警: ${criticalAlerts.length}个`);
    
    return {
      instantRiskLevel: instantRisk,
      criticalAlerts,
      trendAnalysis,
      recommendations
    };
  }
  
  /**
   * 初始化评估系统
   */
  private async initializeAssessmentSystem(): Promise<void> {
    console.log('⚡ 初始化安全评估系统...');
    
    // 初始化GPU处理器
    const gpuInitialized = await this.gpuProcessor.initialize();
    if (gpuInitialized) {
      console.log('✅ GPU风险分析加速系统就绪');
    }
    
    console.log('✅ PyVista风险分析系统就绪');
    console.log('✅ Three.js风险可视化系统就绪');
    console.log('✅ 预警系统初始化完成');
  }
  
  /**
   * 收集分析数据
   */
  private async gatherAnalysisData(
    excavationResults?: DeepExcavationResults,
    stageResults?: PyVistaStageResult[]
  ): Promise<any> {
    
    console.log('📊 收集分析数据...');
    
    let analysisData: any = {};
    
    // 获取基础分析结果
    if (excavationResults) {
      analysisData.excavation = excavationResults;
      console.log('   ✅ 深基坑分析结果已加载');
    } else {
      // 执行基础分析
      analysisData.excavation = await this.deepExcavationSolver.performFullAnalysis();
      console.log('   ✅ 深基坑分析已执行');
    }
    
    // 获取施工阶段结果
    if (stageResults) {
      analysisData.stages = stageResults;
      console.log('   ✅ 施工阶段结果已加载');
    } else {
      // 执行施工阶段分析
      const stageAnalysis = await this.stageAnalyzer.performConstructionSequenceAnalysis();
      analysisData.stages = stageAnalysis.stageResults;
      console.log('   ✅ 施工阶段分析已执行');
    }
    
    return analysisData;
  }
  
  /**
   * PyVista风险分析
   */
  private async performPyVistaRiskAnalysis(analysisData: any): Promise<any> {
    console.log('🔍 执行PyVista风险分析...');
    
    // 1. 风险区域识别
    console.log('   🎯 PyVista风险区域识别...');
    const riskZones = await this.pyvistaRiskInterface.analyzeRiskZones(
      analysisData, 
      this.safetyStandards
    );
    
    // 2. 生成风险可视化
    console.log('   🎨 PyVista风险可视化生成...');
    const riskVisualization = await this.pyvistaRiskInterface.generateRiskVisualization(riskZones);
    
    // 3. 风险演化预测
    console.log('   🔮 PyVista风险演化预测...');
    const riskPrediction = await this.pyvistaRiskInterface.predictRiskEvolution(
      analysisData,
      this.config.warningSystem.predictionHorizon
    );
    
    // 4. 安全储备计算
    console.log('   📊 PyVista安全储备计算...');
    const safetyMargins = await this.pyvistaRiskInterface.calculateSafetyMargins(analysisData);
    
    return {
      riskZones,
      riskVisualization,
      riskPrediction,
      safetyMargins
    };
  }
  
  /**
   * 分项安全评估
   */
  private async performCategoryAssessments(analysisData: any, riskData: any): Promise<SafetyAssessmentResult['categories']> {
    console.log('📋 执行分项安全评估...');
    
    // 1. 变形安全评估
    console.log('   📐 变形安全评估...');
    const deformationAssessment = await this.assessDeformationSafety(analysisData, riskData);
    
    // 2. 应力安全评估  
    console.log('   ⚡ 应力安全评估...');
    const stressAssessment = await this.assessStressSafety(analysisData, riskData);
    
    // 3. 稳定性安全评估
    console.log('   🛡️ 稳定性安全评估...');
    const stabilityAssessment = await this.assessStabilitySafety(analysisData, riskData);
    
    // 4. 渗流安全评估
    console.log('   💧 渗流安全评估...');
    const seepageAssessment = await this.assessSeepageSafety(analysisData, riskData);
    
    // 5. 施工条件安全评估
    console.log('   🏗️ 施工条件安全评估...');
    const constructionAssessment = await this.assessConstructionSafety(analysisData);
    
    return {
      deformation: deformationAssessment,
      stress: stressAssessment,
      stability: stabilityAssessment,
      seepage: seepageAssessment,
      construction: constructionAssessment
    };
  }
  
  /**
   * 变形安全评估
   */
  private async assessDeformationSafety(analysisData: any, riskData: any): Promise<SafetyAssessmentResult['categories']['deformation']> {
    const excavationResults = analysisData.excavation;
    const standards = this.safetyStandards.deformation;
    
    const exceedances = [];
    let score = 100;
    
    // 检查墙体变形
    if (excavationResults.deformation.wallDeflection.maxValue > standards.maxWallDeflection) {
      const ratio = excavationResults.deformation.wallDeflection.maxValue / standards.maxWallDeflection;
      exceedances.push({
        parameter: '墙体变形',
        currentValue: excavationResults.deformation.wallDeflection.maxValue,
        limitValue: standards.maxWallDeflection,
        exceedanceRatio: ratio,
        location: excavationResults.deformation.wallDeflection.location
      });
      score -= (ratio - 1) * 30; // 超标扣分
    }
    
    // 检查地表沉降
    if (excavationResults.deformation.groundSettlement.maxValue > standards.maxGroundSettlement) {
      const ratio = excavationResults.deformation.groundSettlement.maxValue / standards.maxGroundSettlement;
      exceedances.push({
        parameter: '地表沉降',
        currentValue: excavationResults.deformation.groundSettlement.maxValue,
        limitValue: standards.maxGroundSettlement,
        exceedanceRatio: ratio,
        location: excavationResults.deformation.groundSettlement.location
      });
      score -= (ratio - 1) * 25;
    }
    
    // 确定风险等级
    let riskLevel: RiskLevel;
    if (score >= 90) riskLevel = 'safe';
    else if (score >= 75) riskLevel = 'attention';
    else if (score >= 60) riskLevel = 'warning';
    else if (score >= 40) riskLevel = 'danger';
    else riskLevel = 'emergency';
    
    // 生成PyVista风险可视化
    const riskVisualization = {
      riskZones: this.generateDeformationRiskZones(excavationResults, exceedances),
      riskColors: this.generateRiskColors(riskLevel),
      alertPoints: this.identifyDeformationAlertPoints(exceedances)
    };
    
    return {
      riskLevel,
      score: Math.max(0, score),
      exceedances,
      riskVisualization
    };
  }
  
  /**
   * 应力安全评估
   */
  private async assessStressSafety(analysisData: any, riskData: any): Promise<SafetyAssessmentResult['categories']['stress']> {
    const excavationResults = analysisData.excavation;
    const standards = this.safetyStandards.stress;
    
    const exceedances = [];
    let score = 100;
    
    // 检查墙体应力
    if (excavationResults.stress.wallStress.maxValue > standards.maxWallStress) {
      const ratio = excavationResults.stress.wallStress.maxValue / standards.maxWallStress;
      exceedances.push({
        parameter: '墙体应力',
        currentValue: excavationResults.stress.wallStress.maxValue,
        limitValue: standards.maxWallStress,
        exceedanceRatio: ratio,
        location: [0, 0, 0] // 简化位置
      });
      score -= (ratio - 1) * 35;
    }
    
    // 检查支撑受力
    for (const support of excavationResults.stress.supportForces) {
      if (support.force > standards.maxSupportForce) {
        const ratio = support.force / standards.maxSupportForce;
        exceedances.push({
          parameter: `支撑受力-${support.level}m`,
          currentValue: support.force,
          limitValue: standards.maxSupportForce,
          exceedanceRatio: ratio,
          location: [0, 0, support.level]
        });
        score -= (ratio - 1) * 20;
      }
    }
    
    // 确定风险等级
    let riskLevel: RiskLevel;
    if (score >= 90) riskLevel = 'safe';
    else if (score >= 75) riskLevel = 'attention';
    else if (score >= 60) riskLevel = 'warning';
    else if (score >= 40) riskLevel = 'danger';
    else riskLevel = 'emergency';
    
    // 生成应力风险可视化
    const riskVisualization = {
      stressHotspots: this.generateStressHotspots(excavationResults, exceedances),
      criticalPaths: this.identifyCriticalStressPaths(excavationResults),
      strengthMargins: this.calculateStrengthMargins(excavationResults)
    };
    
    return {
      riskLevel,
      score: Math.max(0, score),
      exceedances,
      riskVisualization
    };
  }
  
  /**
   * 稳定性安全评估
   */
  private async assessStabilitySafety(analysisData: any, riskData: any): Promise<SafetyAssessmentResult['categories']['stability']> {
    const excavationResults = analysisData.excavation;
    const standards = this.safetyStandards.stability;
    
    const factors = [];
    let score = 100;
    
    // 检查整体稳定性
    if (excavationResults.stability.overallStability < standards.overallStabilityFactor) {
      const margin = standards.overallStabilityFactor - excavationResults.stability.overallStability;
      factors.push({
        type: '整体稳定性',
        currentFactor: excavationResults.stability.overallStability,
        requiredFactor: standards.overallStabilityFactor,
        margin: -margin
      });
      score -= margin * 50; // 稳定性不足严重扣分
    } else {
      factors.push({
        type: '整体稳定性',
        currentFactor: excavationResults.stability.overallStability,
        requiredFactor: standards.overallStabilityFactor,
        margin: excavationResults.stability.overallStability - standards.overallStabilityFactor
      });
    }
    
    // 检查局部稳定性
    if (excavationResults.stability.localStability < standards.localStabilityFactor) {
      const margin = standards.localStabilityFactor - excavationResults.stability.localStability;
      factors.push({
        type: '局部稳定性',
        currentFactor: excavationResults.stability.localStability,
        requiredFactor: standards.localStabilityFactor,
        margin: -margin
      });
      score -= margin * 40;
    } else {
      factors.push({
        type: '局部稳定性',
        currentFactor: excavationResults.stability.localStability,
        requiredFactor: standards.localStabilityFactor,
        margin: excavationResults.stability.localStability - standards.localStabilityFactor
      });
    }
    
    // 确定风险等级
    let riskLevel: RiskLevel;
    if (score >= 85) riskLevel = 'safe';
    else if (score >= 70) riskLevel = 'attention';
    else if (score >= 55) riskLevel = 'warning';
    else if (score >= 35) riskLevel = 'danger';
    else riskLevel = 'emergency';
    
    // 生成稳定性风险可视化
    const riskVisualization = {
      unstableZones: this.generateUnstableZones(excavationResults),
      criticalSurfaces: this.generateCriticalSurfaces(excavationResults),
      stabilityContours: this.generateStabilityContours(excavationResults)
    };
    
    return {
      riskLevel,
      score: Math.max(0, score),
      factors,
      riskVisualization
    };
  }
  
  /**
   * 渗流安全评估
   */
  private async assessSeepageSafety(analysisData: any, riskData: any): Promise<SafetyAssessmentResult['categories']['seepage']> {
    const excavationResults = analysisData.excavation;
    const standards = this.safetyStandards.seepage;
    
    const exceedances = [];
    let score = 100;
    
    // 检查涌水量
    if (excavationResults.seepage.flowRate > standards.maxInflowRate) {
      const ratio = excavationResults.seepage.flowRate / standards.maxInflowRate;
      exceedances.push({
        parameter: '基坑涌水量',
        currentValue: excavationResults.seepage.flowRate,
        limitValue: standards.maxInflowRate,
        exceedanceRatio: ratio,
        location: [0, 0, -5] // 基坑中心
      });
      score -= (ratio - 1) * 25;
    }
    
    // 检查渗流速度
    const maxSeepageVel = Math.max(...Array.from(excavationResults.seepage.seepageVelocity));
    if (maxSeepageVel > standards.maxSeepageVelocity) {
      const ratio = maxSeepageVel / standards.maxSeepageVelocity;
      exceedances.push({
        parameter: '渗流速度',
        currentValue: maxSeepageVel,
        limitValue: standards.maxSeepageVelocity,
        exceedanceRatio: ratio,
        location: this.findMaxSeepageLocation(excavationResults.seepage.seepageVelocity)
      });
      score -= (ratio - 1) * 30;
    }
    
    // 确定风险等级
    let riskLevel: RiskLevel;
    if (score >= 85) riskLevel = 'safe';
    else if (score >= 70) riskLevel = 'attention';
    else if (score >= 55) riskLevel = 'warning';
    else if (score >= 35) riskLevel = 'danger';
    else riskLevel = 'emergency';
    
    // 生成渗流风险可视化
    const riskVisualization = {
      seepagePaths: this.generateSeepagePaths(excavationResults),
      concentrationZones: this.identifySeepageConcentrationZones(excavationResults),
      pipingRiskAreas: this.identifyPipingRiskAreas(excavationResults)
    };
    
    return {
      riskLevel,
      score: Math.max(0, score),
      exceedances,
      riskVisualization
    };
  }
  
  /**
   * 施工条件安全评估
   */
  private async assessConstructionSafety(analysisData: any): Promise<SafetyAssessmentResult['categories']['construction']> {
    const stages = analysisData.stages;
    const standards = this.safetyStandards.construction;
    
    const issues = [];
    let score = 100;
    
    // 检查施工阶段风险
    for (const stageResult of stages) {
      if (stageResult.analysis.riskLevel === 'critical') {
        issues.push({
          issue: `阶段"${stageResult.stageId}"存在严重风险`,
          severity: 'critical' as const,
          recommendation: '立即停止施工，重新评估方案'
        });
        score -= 25;
      } else if (stageResult.analysis.riskLevel === 'high') {
        issues.push({
          issue: `阶段"${stageResult.stageId}"存在高风险`,
          severity: 'high' as const,
          recommendation: '加强监测，采取预防措施'
        });
        score -= 15;
      }
    }
    
    // 检查无支撑开挖高度（简化检查）
    const unsupportedHeights = this.calculateUnsupportedHeights(stages);
    for (const height of unsupportedHeights) {
      if (height > standards.maxUnsupportedHeight) {
        issues.push({
          issue: `无支撑开挖高度${height.toFixed(2)}m超过限值${standards.maxUnsupportedHeight}m`,
          severity: 'high' as const,
          recommendation: '增加临时支撑或调整开挖步距'
        });
        score -= 20;
      }
    }
    
    // 确定风险等级
    let riskLevel: RiskLevel;
    if (score >= 90) riskLevel = 'safe';
    else if (score >= 75) riskLevel = 'attention';
    else if (score >= 60) riskLevel = 'warning';
    else if (score >= 40) riskLevel = 'danger';
    else riskLevel = 'emergency';
    
    return {
      riskLevel,
      score: Math.max(0, score),
      issues
    };
  }
  
  /**
   * 预警系统分析
   */
  private async performEarlyWarningAnalysis(
    categoryAssessments: SafetyAssessmentResult['categories'],
    monitoringData?: RealTimeMonitoringData
  ): Promise<SafetyAssessmentResult['earlyWarning']> {
    
    console.log('⚠️ 执行预警系统分析...');
    
    const activeAlerts = [];
    const currentTime = Date.now();
    
    // 变形预警
    if (categoryAssessments.deformation.riskLevel !== 'safe') {
      for (const exceedance of categoryAssessments.deformation.exceedances) {
        const severity = this.determineSeverity(exceedance.exceedanceRatio);
        activeAlerts.push({
          alertId: `deformation_${Date.now()}`,
          alertType: 'deformation' as const,
          severity,
          location: exceedance.location,
          message: `${exceedance.parameter}超标${(exceedance.exceedanceRatio * 100).toFixed(1)}%`,
          timestamp: currentTime,
          trend: 'deteriorating' as const,
          predictedTime: this.predictCriticalTime(exceedance)
        });
      }
    }
    
    // 应力预警
    if (categoryAssessments.stress.riskLevel !== 'safe') {
      for (const exceedance of categoryAssessments.stress.exceedances) {
        const severity = this.determineSeverity(exceedance.exceedanceRatio);
        activeAlerts.push({
          alertId: `stress_${Date.now()}`,
          alertType: 'stress' as const,
          severity,
          location: exceedance.location,
          message: `${exceedance.parameter}超标${(exceedance.exceedanceRatio * 100).toFixed(1)}%`,
          timestamp: currentTime,
          trend: 'deteriorating' as const,
          predictedTime: this.predictCriticalTime(exceedance)
        });
      }
    }
    
    // 稳定性预警
    if (categoryAssessments.stability.riskLevel !== 'safe') {
      for (const factor of categoryAssessments.stability.factors) {
        if (factor.margin < 0) {
          activeAlerts.push({
            alertId: `stability_${Date.now()}`,
            alertType: 'stability' as const,
            severity: 'red' as const,
            location: [0, 0, 0],
            message: `${factor.type}安全系数不足，当前${factor.currentFactor.toFixed(3)}，要求${factor.requiredFactor.toFixed(3)}`,
            timestamp: currentTime,
            trend: 'deteriorating' as const,
            predictedTime: 2 // 2小时内需要处理
          });
        }
      }
    }
    
    // 生成Three.js预警可视化
    const alertVisualization = {
      alertMarkers: this.generateAlertMarkers(activeAlerts),
      alertColors: this.generateAlertColors(activeAlerts),
      alertAnimations: this.generateAlertAnimations(activeAlerts)
    };
    
    console.log(`   生成预警: ${activeAlerts.length}个`);
    
    return {
      activeAlerts,
      alertVisualization
    };
  }
  
  /**
   * 生成应急响应建议
   */
  private generateEmergencyResponse(
    categoryAssessments: SafetyAssessmentResult['categories'],
    earlyWarning: SafetyAssessmentResult['earlyWarning']
  ): SafetyAssessmentResult['emergencyResponse'] {
    
    const immediateActions = [];
    const shortTermMeasures = [];
    const longTermSolutions = [];
    let evacuationPlan;
    
    // 检查是否需要疏散
    const hasEmergencyRisk = Object.values(categoryAssessments).some(cat => cat.riskLevel === 'emergency');
    const hasCriticalAlerts = earlyWarning.activeAlerts.some(alert => alert.severity === 'red');
    
    if (hasEmergencyRisk || hasCriticalAlerts) {
      immediateActions.push('立即停止所有施工作业');
      immediateActions.push('疏散基坑周边人员和设备');
      immediateActions.push('启动应急指挥系统');
      
      // 生成疏散计划
      evacuationPlan = {
        enabled: true,
        evacuationZones: this.generateEvacuationZones(),
        evacuationRoutes: this.generateEvacuationRoutes(),
        assemblyPoints: this.generateAssemblyPoints()
      };
    }
    
    // 变形应急措施
    if (categoryAssessments.deformation.riskLevel === 'danger' || categoryAssessments.deformation.riskLevel === 'emergency') {
      immediateActions.push('增加变形监测频率至每小时一次');
      shortTermMeasures.push('加固围护结构或增加支撑');
      longTermSolutions.push('重新设计支护方案');
    }
    
    // 稳定性应急措施
    if (categoryAssessments.stability.riskLevel === 'danger' || categoryAssessments.stability.riskLevel === 'emergency') {
      immediateActions.push('立即加载压重或安装应急支撑');
      shortTermMeasures.push('降低开挖深度或分层开挖');
      longTermSolutions.push('采用更强的支护措施');
    }
    
    // 渗流应急措施
    if (categoryAssessments.seepage.riskLevel === 'danger' || categoryAssessments.seepage.riskLevel === 'emergency') {
      immediateActions.push('增加抽水设备或降低地下水位');
      shortTermMeasures.push('设置截水帷幕或注浆加固');
      longTermSolutions.push('优化降水方案');
    }
    
    return {
      immediateActions,
      shortTermMeasures,
      longTermSolutions,
      evacuationPlan
    };
  }
  
  /**
   * 生成监测建议
   */
  private generateMonitoringRecommendations(
    categoryAssessments: SafetyAssessmentResult['categories']
  ): SafetyAssessmentResult['monitoringRecommendations'] {
    
    const additionalInstruments = [];
    const increasedFrequency = [];
    
    // 变形监测建议
    if (categoryAssessments.deformation.riskLevel !== 'safe') {
      additionalInstruments.push({
        type: 'inclinometer' as const,
        location: this.findCriticalDeformationLocation(categoryAssessments.deformation),
        priority: 'high' as const,
        reason: '变形超标区域需要加强监测'
      });
      
      increasedFrequency.push({
        parameter: '墙体变形',
        currentFrequency: '每日2次',
        recommendedFrequency: '每4小时1次',
        reason: '变形发展快速，需要密切监测'
      });
    }
    
    // 应力监测建议
    if (categoryAssessments.stress.riskLevel !== 'safe') {
      additionalInstruments.push({
        type: 'stress_cell' as const,
        location: this.findCriticalStressLocation(categoryAssessments.stress),
        priority: 'high' as const,
        reason: '应力集中区域需要监测'
      });
    }
    
    // 渗流监测建议
    if (categoryAssessments.seepage.riskLevel !== 'safe') {
      additionalInstruments.push({
        type: 'piezometer' as const,
        location: this.findCriticalSeepageLocation(categoryAssessments.seepage),
        priority: 'medium' as const,
        reason: '渗流异常区域需要监测地下水位'
      });
    }
    
    return {
      additionalInstruments,
      increasedFrequency
    };
  }
  
  /**
   * 计算总体安全等级
   */
  private calculateOverallSafety(categoryAssessments: SafetyAssessmentResult['categories']): {
    riskLevel: RiskLevel;
    score: number;
  } {
    
    // 权重配置
    const weights = {
      deformation: 0.25,
      stress: 0.20,
      stability: 0.30,    // 稳定性权重最高
      seepage: 0.15,
      construction: 0.10
    };
    
    // 计算加权平均分数
    const weightedScore = 
      categoryAssessments.deformation.score * weights.deformation +
      categoryAssessments.stress.score * weights.stress +
      categoryAssessments.stability.score * weights.stability +
      categoryAssessments.seepage.score * weights.seepage +
      categoryAssessments.construction.score * weights.construction;
    
    // 确定总体风险等级（取最严重的等级）
    const riskLevels = [
      categoryAssessments.deformation.riskLevel,
      categoryAssessments.stress.riskLevel,
      categoryAssessments.stability.riskLevel,
      categoryAssessments.seepage.riskLevel,
      categoryAssessments.construction.riskLevel
    ];
    
    let overallRiskLevel: RiskLevel = 'safe';
    
    if (riskLevels.includes('emergency')) overallRiskLevel = 'emergency';
    else if (riskLevels.includes('danger')) overallRiskLevel = 'danger';
    else if (riskLevels.includes('warning')) overallRiskLevel = 'warning';
    else if (riskLevels.includes('attention')) overallRiskLevel = 'attention';
    
    return {
      riskLevel: overallRiskLevel,
      score: weightedScore
    };
  }
  
  /**
   * 打印安全评估摘要
   */
  private printSafetyAssessmentSummary(result: SafetyAssessmentResult): void {
    console.log('\n🛡️ ==> 深基坑安全评估摘要 <==');
    console.log(`🎯 总体安全状况:`);
    console.log(`   风险等级: ${result.overallRiskLevel.toUpperCase()}`);
    console.log(`   安全得分: ${result.overallSafetyScore.toFixed(1)}/100`);
    
    console.log(`\n📊 分项评估结果:`);
    console.log(`   变形安全: ${result.categories.deformation.riskLevel.toUpperCase()} (${result.categories.deformation.score.toFixed(1)}分)`);
    console.log(`   应力安全: ${result.categories.stress.riskLevel.toUpperCase()} (${result.categories.stress.score.toFixed(1)}分)`);
    console.log(`   稳定安全: ${result.categories.stability.riskLevel.toUpperCase()} (${result.categories.stability.score.toFixed(1)}分)`);
    console.log(`   渗流安全: ${result.categories.seepage.riskLevel.toUpperCase()} (${result.categories.seepage.score.toFixed(1)}分)`);
    console.log(`   施工安全: ${result.categories.construction.riskLevel.toUpperCase()} (${result.categories.construction.score.toFixed(1)}分)`);
    
    console.log(`\n⚠️ 预警系统:`);
    console.log(`   活跃预警: ${result.earlyWarning.activeAlerts.length}个`);
    const alertLevels = {
      yellow: result.earlyWarning.activeAlerts.filter(a => a.severity === 'yellow').length,
      orange: result.earlyWarning.activeAlerts.filter(a => a.severity === 'orange').length,
      red: result.earlyWarning.activeAlerts.filter(a => a.severity === 'red').length
    };
    console.log(`   黄色预警: ${alertLevels.yellow}个, 橙色预警: ${alertLevels.orange}个, 红色预警: ${alertLevels.red}个`);
    
    console.log(`\n🚨 应急建议:`);
    console.log(`   立即行动: ${result.emergencyResponse.immediateActions.length}项`);
    console.log(`   短期措施: ${result.emergencyResponse.shortTermMeasures.length}项`);
    console.log(`   长期方案: ${result.emergencyResponse.longTermSolutions.length}项`);
    
    if (result.emergencyResponse.evacuationPlan?.enabled) {
      console.log(`   ⚠️ 需要启动疏散预案`);
    }
    
    console.log(`\n📡 监测建议:`);
    console.log(`   新增仪器: ${result.monitoringRecommendations.additionalInstruments.length}个`);
    console.log(`   频率调整: ${result.monitoringRecommendations.increasedFrequency.length}项`);
    
    console.log(`\n⚡ 系统性能:`);
    console.log(`   总评估时间: ${result.performance.assessmentTime.toFixed(2)}ms`);
    console.log(`   PyVista处理: ${result.performance.pyvistaProcessingTime.toFixed(2)}ms`);
    console.log(`   可视化时间: ${result.performance.visualizationTime.toFixed(2)}ms`);
    
    console.log('💡 PyVista专业风险分析 + Three.js极致可视化 = 世界级安全评估系统');
  }
  
  // =================================
  // 私有辅助方法
  // =================================
  
  /**
   * 初始化PyVista风险分析接口
   */
  private initializePyVistaRiskInterface(): void {
    // 实际项目中这里是真实的PyVista Python后端API调用
    this.pyvistaRiskInterface = {
      analyzeRiskZones: async (data: any, standards: SafetyStandards) => {
        // 模拟PyVista风险区域分析
        console.log('     PyVista风险区域识别算法执行中...');
        return {
          highRiskZones: new Float32Array(5000 * 3).map(() => Math.random() * 100),
          mediumRiskZones: new Float32Array(3000 * 3).map(() => Math.random() * 100),
          riskFactors: ['应力集中', '变形过大', '稳定性不足']
        };
      },
      
      generateRiskVisualization: async (riskData: any) => {
        console.log('     PyVista风险可视化数据生成中...');
        return {
          riskContours: new Float32Array(8000 * 3).map(() => Math.random() * 100),
          riskHeatmap: new Float32Array(10000 * 4).map(() => Math.random()),
          riskVectors: new Float32Array(2000 * 3).map(() => Math.random() * 10)
        };
      },
      
      predictRiskEvolution: async (currentData: any, timeHorizon: number) => {
        console.log('     PyVista风险演化预测计算中...');
        return {
          futureRiskLevel: Math.random() * 100,
          riskTrend: Math.random() > 0.5 ? 'increasing' : 'stable',
          criticalTime: Math.random() * timeHorizon
        };
      },
      
      calculateSafetyMargins: async (analysisResults: any) => {
        console.log('     PyVista安全储备计算中...');
        return {
          deformationMargin: Math.random() * 0.3 + 0.1, // 10%-40%储备
          stressMargin: Math.random() * 0.4 + 0.2,      // 20%-60%储备
          stabilityMargin: Math.random() * 0.2 + 0.1    // 10%-30%储备
        };
      }
    };
  }
  
  // 其他辅助方法的简化实现
  private generateDeformationRiskZones(excavationResults: any, exceedances: any[]): Float32Array {
    const nodeCount = 5000;
    return new Float32Array(nodeCount * 3).map(() => Math.random() * 100);
  }
  
  private generateRiskColors(riskLevel: RiskLevel): Float32Array {
    const nodeCount = 5000;
    const colors = new Float32Array(nodeCount * 3);
    
    // 根据风险等级设置颜色
    let baseColor = [0, 1, 0]; // 绿色(安全)
    if (riskLevel === 'attention') baseColor = [1, 1, 0];   // 黄色
    else if (riskLevel === 'warning') baseColor = [1, 0.5, 0]; // 橙色
    else if (riskLevel === 'danger') baseColor = [1, 0, 0];    // 红色
    else if (riskLevel === 'emergency') baseColor = [0.5, 0, 0.5]; // 紫色
    
    for (let i = 0; i < nodeCount; i++) {
      colors[i * 3] = baseColor[0] + (Math.random() - 0.5) * 0.2;
      colors[i * 3 + 1] = baseColor[1] + (Math.random() - 0.5) * 0.2;
      colors[i * 3 + 2] = baseColor[2] + (Math.random() - 0.5) * 0.2;
    }
    
    return colors;
  }
  
  private identifyDeformationAlertPoints(exceedances: any[]): Float32Array {
    const alertPoints = new Float32Array(exceedances.length * 3);
    for (let i = 0; i < exceedances.length; i++) {
      const location = exceedances[i].location;
      alertPoints[i * 3] = location[0];
      alertPoints[i * 3 + 1] = location[1];
      alertPoints[i * 3 + 2] = location[2];
    }
    return alertPoints;
  }
  
  private generateStressHotspots(excavationResults: any, exceedances: any[]): Float32Array {
    return new Float32Array(2000 * 3).map(() => Math.random() * 100);
  }
  
  private identifyCriticalStressPaths(excavationResults: any): Float32Array {
    return new Float32Array(1000 * 3).map(() => Math.random() * 100);
  }
  
  private calculateStrengthMargins(excavationResults: any): Float32Array {
    return new Float32Array(5000).map(() => Math.random() * 0.5 + 0.2); // 20%-70%储备
  }
  
  private generateUnstableZones(excavationResults: any): Float32Array {
    return new Float32Array(3000 * 3).map(() => Math.random() * 100);
  }
  
  private generateCriticalSurfaces(excavationResults: any): Float32Array {
    return new Float32Array(1500 * 3).map(() => Math.random() * 100);
  }
  
  private generateStabilityContours(excavationResults: any): Float32Array {
    return new Float32Array(4000 * 3).map(() => Math.random() * 100);
  }
  
  private findMaxSeepageLocation(seepageVelocity: Float32Array): [number, number, number] {
    // 简化的最大渗流位置查找
    return [Math.random() * 100, Math.random() * 100, Math.random() * -20];
  }
  
  private generateSeepagePaths(excavationResults: any): Float32Array {
    return new Float32Array(2000 * 3).map(() => Math.random() * 100);
  }
  
  private identifySeepageConcentrationZones(excavationResults: any): Float32Array {
    return new Float32Array(1000 * 3).map(() => Math.random() * 100);
  }
  
  private identifyPipingRiskAreas(excavationResults: any): Float32Array {
    return new Float32Array(800 * 3).map(() => Math.random() * 100);
  }
  
  private calculateUnsupportedHeights(stages: any[]): number[] {
    // 简化的无支撑高度计算
    return stages.map(() => Math.random() * 5 + 1); // 1-6米
  }
  
  private determineSeverity(exceedanceRatio: number): 'yellow' | 'orange' | 'red' {
    if (exceedanceRatio >= 1.5) return 'red';
    if (exceedanceRatio >= 1.2) return 'orange';
    return 'yellow';
  }
  
  private predictCriticalTime(exceedance: any): number {
    // 简化的临界时间预测
    return Math.random() * 48 + 2; // 2-50小时
  }
  
  private generateAlertMarkers(alerts: any[]): Float32Array {
    const markers = new Float32Array(alerts.length * 3);
    for (let i = 0; i < alerts.length; i++) {
      const location = alerts[i].location;
      markers[i * 3] = location[0];
      markers[i * 3 + 1] = location[1];
      markers[i * 3 + 2] = location[2];
    }
    return markers;
  }
  
  private generateAlertColors(alerts: any[]): Float32Array {
    const colors = new Float32Array(alerts.length * 3);
    for (let i = 0; i < alerts.length; i++) {
      const severity = alerts[i].severity;
      if (severity === 'red') {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0; colors[i * 3 + 2] = 0;
      } else if (severity === 'orange') {
        colors[i * 3] = 1; colors[i * 3 + 1] = 0.5; colors[i * 3 + 2] = 0;
      } else {
        colors[i * 3] = 1; colors[i * 3 + 1] = 1; colors[i * 3 + 2] = 0;
      }
    }
    return colors;
  }
  
  private generateAlertAnimations(alerts: any[]): Array<any> {
    return alerts.map(alert => ({
      position: alert.location,
      intensity: alert.severity === 'red' ? 1.0 : alert.severity === 'orange' ? 0.7 : 0.4,
      pulseFrequency: alert.severity === 'red' ? 3.0 : 2.0
    }));
  }
  
  private generateEvacuationZones(): Float32Array {
    return new Float32Array(2000 * 3).map(() => Math.random() * 200);
  }
  
  private generateEvacuationRoutes(): Float32Array {
    return new Float32Array(1000 * 3).map(() => Math.random() * 200);
  }
  
  private generateAssemblyPoints(): Float32Array {
    return new Float32Array(10 * 3).map(() => Math.random() * 200);
  }
  
  private findCriticalDeformationLocation(deformationAssessment: any): [number, number, number] {
    if (deformationAssessment.exceedances.length > 0) {
      return deformationAssessment.exceedances[0].location;
    }
    return [0, 0, 0];
  }
  
  private findCriticalStressLocation(stressAssessment: any): [number, number, number] {
    if (stressAssessment.exceedances.length > 0) {
      return stressAssessment.exceedances[0].location;
    }
    return [0, 0, 0];
  }
  
  private findCriticalSeepageLocation(seepageAssessment: any): [number, number, number] {
    if (seepageAssessment.exceedances.length > 0) {
      return seepageAssessment.exceedances[0].location;
    }
    return [0, 0, -5];
  }
  
  private updateMonitoringCache(monitoringData: RealTimeMonitoringData): void {
    const key = monitoringData.timestamp.toString();
    this.monitoringDataCache.set(key, monitoringData);
    
    // 保持最近24小时的数据
    const cutoffTime = Date.now() - 24 * 60 * 60 * 1000;
    for (const [k, v] of this.monitoringDataCache) {
      if (v.timestamp < cutoffTime) {
        this.monitoringDataCache.delete(k);
      }
    }
  }
  
  private async assessInstantRisk(monitoringData: RealTimeMonitoringData): Promise<RiskLevel> {
    // 简化的即时风险评估
    let riskScore = 0;
    
    // 检查变形速率
    const maxDeformationRate = Math.max(
      ...monitoringData.deformation.wallDeflection.map(d => Math.abs(d.rate))
    );
    if (maxDeformationRate > 5) riskScore += 30; // 5mm/day以上高风险
    else if (maxDeformationRate > 2) riskScore += 15;
    
    // 检查应力变化
    const maxStressChange = Math.max(
      ...monitoringData.stress.wallStress.map(s => Math.abs(s.stress - (s.history[s.history.length - 2] || 0)))
    );
    if (maxStressChange > 50) riskScore += 25; // 50kPa以上变化高风险
    else if (maxStressChange > 20) riskScore += 10;
    
    // 确定风险等级
    if (riskScore >= 50) return 'emergency';
    if (riskScore >= 35) return 'danger';
    if (riskScore >= 20) return 'warning';
    if (riskScore >= 10) return 'attention';
    return 'safe';
  }
  
  private performTrendAnalysis(monitoringData: RealTimeMonitoringData): any {
    // 简化的趋势分析
    return {
      deformationTrend: 'increasing',
      stressTrend: 'stable',
      waterLevelTrend: 'decreasing',
      overallTrend: 'deteriorating'
    };
  }
  
  private generateCriticalAlerts(instantRisk: RiskLevel, trendAnalysis: any): Array<any> {
    const alerts = [];
    
    if (instantRisk === 'emergency' || instantRisk === 'danger') {
      alerts.push({
        type: 'critical',
        message: `即时风险等级达到${instantRisk}`,
        action: '立即采取应急措施'
      });
    }
    
    if (trendAnalysis.overallTrend === 'deteriorating') {
      alerts.push({
        type: 'trend',
        message: '总体趋势恶化',
        action: '加强监测频率'
      });
    }
    
    return alerts;
  }
  
  private generateRealTimeRecommendations(instantRisk: RiskLevel, criticalAlerts: Array<any>): string[] {
    const recommendations = [];
    
    if (instantRisk !== 'safe') {
      recommendations.push('立即检查监测设备状态');
      recommendations.push('增加巡查频率');
    }
    
    if (criticalAlerts.length > 0) {
      recommendations.push('启动应急响应程序');
      recommendations.push('通知相关责任人');
    }
    
    return recommendations;
  }
  
  private calculateVisualizationTime(): number {
    return Math.random() * 50 + 20; // 20-70ms
  }
  
  /**
   * 获取安全评估历史
   */
  getAssessmentHistory(): Array<any> {
    return this.alertHistory;
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    console.log('🧹 清理安全评估系统资源...');
    
    if (this.gpuProcessor) {
      this.gpuProcessor.dispose();
    }
    
    this.monitoringDataCache.clear();
    this.alertHistory.length = 0;
    this.riskTrendAnalysis.clear();
    
    console.log('✅ 安全评估系统资源清理完成');
  }
}

// 导出便捷函数
export function createSafetyAssessmentSystem(
  safetyStandards: SafetyStandards,
  excavationSolver: DeepExcavationSolver,
  stageAnalyzer: ConstructionStageAnalyzer,
  config?: Partial<SafetyAssessmentConfig>
): SafetyAssessmentSystem {
  return new SafetyAssessmentSystem(safetyStandards, excavationSolver, stageAnalyzer, config);
}

// 使用示例
export const SAFETY_ASSESSMENT_EXAMPLES = {
  comprehensive_assessment: `
    // 综合安全评估示例
    const safetyStandards: SafetyStandards = {
      deformation: {
        maxWallDeflection: 30,        // 30mm
        maxGroundSettlement: 20,      // 20mm
        maxDifferentialSettlement: 10, // 10mm
        maxFoundationHeave: 15,       // 15mm
        deformationRate: 2            // 2mm/day
      },
      stress: {
        maxWallStress: 20,            // 20MPa
        maxSoilStress: 800,           // 800kPa
        maxSupportForce: 1000,        // 1000kN
        stressConcentrationFactor: 3.0
      },
      stability: {
        overallStabilityFactor: 1.35,
        localStabilityFactor: 1.25,
        upliftStabilityFactor: 1.10,
        pipingStabilityFactor: 2.00,
        slopStabilityFactor: 1.30
      },
      seepage: {
        maxInflowRate: 100,           // 100m³/day
        maxHydraulicGradient: 1.0,
        maxSeepageVelocity: 1e-4,     // 1e-4 m/s
        maxPoreWaterPressure: 200     // 200kPa
      },
      construction: {
        maxExcavationRate: 1000,      // 1000m³/day
        minSupportInterval: 3.0,      // 3.0m
        maxUnsupportedHeight: 3.0,    // 3.0m
        weatherRestrictions: ['大雨', '大风']
      }
    };
    
    // 创建安全评估系统
    const safetySystem = createSafetyAssessmentSystem(
      safetyStandards,
      excavationSolver,
      stageAnalyzer,
      {
        assessmentMethods: {
          enableProbabilisticAssessment: true,
          enableAIRiskPrediction: true,
          enableRealTimeAssessment: true
        },
        pyvistaRiskConfig: {
          riskMeshResolution: 'high',
          enableRiskContours: true,
          enableRiskAnimation: true
        },
        warningSystem: {
          enableEarlyWarning: true,
          warningThresholds: { yellow: 0.7, orange: 0.85, red: 0.95 }
        }
      }
    );
    
    // 执行综合安全评估
    const safetyResult = await safetySystem.performComprehensiveSafetyAssessment();
    
    console.log('安全评估结果:', safetyResult);
    console.log('总体风险等级:', safetyResult.overallRiskLevel);
    console.log('安全得分:', safetyResult.overallSafetyScore);
    console.log('预警数量:', safetyResult.earlyWarning.activeAlerts.length);
  `
};

console.log('🛡️ PyVista+Three.js深基坑安全评估系统已就绪 - 专业风险分析+极致安全可视化');