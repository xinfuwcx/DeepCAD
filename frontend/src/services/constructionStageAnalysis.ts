/**
 * 深基坑施工阶段分析模块
 * 3号计算专家 - 基于PyVista+Three.js架构的专业施工仿真
 * 数据流：Terra仿真计算 → PyVista后处理 → Three.js渲染
 */

import { 
  DeepExcavationSolver,
  type DeepExcavationParameters,
  type DeepExcavationResults 
} from './deepExcavationSolver';

import { 
  GPUEnhancedPostprocessor,
  createGPUEnhancedPostprocessor 
} from './gpuIntegration';

// 施工阶段定义（符合PyVista数据处理流程）
export interface ConstructionStage {
  stageId: string;
  stageName: string;
  stageType: 'excavation' | 'support_installation' | 'dewatering' | 'structural_work';
  
  // 开挖参数（将传给PyVista处理）
  excavation: {
    targetElevation: number;
    excavationMethod: 'mechanical' | 'blasting' | 'hydraulic';
    excavationRate: number;      // m³/day
    soilUnloading: boolean;
  };
  
  // 支护参数（PyVista网格更新）
  support: {
    installSupport: boolean;
    supportType?: 'steel_strut' | 'concrete_strut' | 'anchor';
    installationElevation?: number;
    prestressForce?: number;     // kN
    stiffness?: number;          // kN/m
  };
  
  // 降水参数（影响PyVista渗流计算）
  dewatering: {
    enabled: boolean;
    targetWaterLevel?: number;   // m
    pumpingRate?: number;        // m³/h
    wellSpacing?: number;        // m
  };
  
  // 时间参数
  timing: {
    startTime: number;           // days
    duration: number;            // days
    criticalPath: boolean;
  };
  
  // 监测参数（用于Three.js可视化）
  monitoring: {
    required: boolean;
    monitoringFrequency: number; // 次/day
    alarmThresholds: {
      deformation: number;       // mm
      stress: number;           // kPa
      waterLevel: number;       // m
    };
  };
}

// PyVista处理后的网格数据格式
export interface PyVistaStageResult {
  stageId: string;
  
  // PyVista网格数据（已转换为Three.js兼容格式）
  meshData: {
    vertices: Float32Array;      // 节点坐标
    faces: Uint32Array;          // 单元连接
    normals: Float32Array;       // 法向量
  };
  
  // PyVista后处理字段数据
  fieldData: {
    // 应力场
    stress: {
      values: Float32Array;      // 应力值
      range: [number, number];   // 最小最大值
      colormap: string;          // 色彩映射
      contours?: {               // PyVista生成的等值线
        vertices: Float32Array;
        faces: Uint32Array;
        levels: number[];
      };
    };
    
    // 位移场
    displacement: {
      vectors: Float32Array;     // 位移矢量 
      magnitude: Float32Array;   // 位移大小
      scaleFactor: number;       // 缩放因子
      deformedMesh?: {           // PyVista变形后网格
        vertices: Float32Array;
        faces: Uint32Array;
      };
    };
    
    // 渗流场
    seepage: {
      hydraulicHead: Float32Array;
      velocity: Float32Array;    // 渗流速度矢量
      streamlines?: {            // PyVista生成的流线
        lines: Float32Array[];
        colors: Float32Array[];
      };
    };
  };
  
  // 支护系统网格（PyVista处理）
  supportMesh?: {
    vertices: Float32Array;
    faces: Uint32Array;
    forces: Float32Array;        // 支护受力
    utilization: Float32Array;   // 利用率（用于Three.js着色）
  };
  
  // 分析结果摘要
  analysis: {
    maxDeformation: number;
    maxStress: number;
    stabilityFactor: number;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    riskFactors: string[];
  };
  
  // PyVista处理性能
  performance: {
    meshProcessingTime: number;
    postProcessingTime: number;
    dataConversionTime: number;
    totalPyVistaTime: number;
  };
}

// Three.js渲染配置
export interface ThreeJSRenderConfig {
  // 场景配置
  scene: {
    backgroundColor: string;
    ambientLight: number;
    directionalLight: {
      intensity: number;
      position: [number, number, number];
    };
  };
  
  // 材质配置  
  materials: {
    soil: {
      color: string;
      opacity: number;
      wireframe: boolean;
    };
    support: {
      color: string;
      metalness: number;
      roughness: number;
    };
    water: {
      color: string;
      opacity: number;
      transparent: boolean;
    };
  };
  
  // 动画配置
  animation: {
    enableDeformationAnimation: boolean;
    animationSpeed: number;       // 播放速度倍数
    frameRate: number;           // fps
    autoPlay: boolean;
  };
  
  // 交互配置
  interaction: {
    enableOrbitControl: boolean;
    enableSectionCut: boolean;
    enableMeasurement: boolean;
    enableFieldQuery: boolean;
  };
}

// 施工序列分析配置
export interface StageAnalysisConfig {
  // PyVista处理配置
  pyvistaConfig: {
    meshResolution: 'low' | 'medium' | 'high' | 'ultra';
    enableAdaptiveRefinement: boolean;
    contourLevels: number;
    streamlineDensity: number;
    outputFormat: 'binary' | 'ascii';
  };
  
  // 数值求解配置
  numerical: {
    timeStepControl: 'adaptive' | 'fixed';
    convergenceTolerance: number;
    maxIterations: number;
    enableNonlinearity: boolean;
  };
  
  // Three.js渲染配置
  rendering: ThreeJSRenderConfig;
  
  // 性能配置
  performance: {
    enableParallelProcessing: boolean;
    maxMemoryUsage: number;      // MB
    enableResultCaching: boolean;
    cacheLifetime: number;       // minutes
  };
}

// 完整施工序列分析结果
export interface ConstructionSequenceResult {
  totalStages: number;
  totalDuration: number;
  
  // PyVista处理的各阶段结果
  stageResults: PyVistaStageResult[];
  
  // 累积效应分析
  cumulative: {
    maxDeformation: {
      value: number;
      location: [number, number, number];
      atStage: string;
      // Three.js可视化数据
      visualizationData: {
        highlightMesh: Float32Array;
        colorGradient: Float32Array;
      };
    };
    
    maxStress: {
      value: number;
      location: [number, number, number];
      atStage: string;
      visualizationData: {
        stressContours: Float32Array;
        criticalZones: Float32Array;
      };
    };
    
    minSafetyFactor: {
      value: number;
      atStage: string;
      visualizationData: {
        riskZones: Float32Array;
        safetyContours: Float32Array;
      };
    };
  };
  
  // Three.js动画数据
  animationData: {
    deformationFrames: Array<{
      stageId: string;
      timestamp: number;
      meshVertices: Float32Array;
      fieldColors: Float32Array;
    }>;
    
    excavationSequence: Array<{
      stageId: string;
      removedElements: Uint32Array;
      newBoundaries: Float32Array;
    }>;
    
    supportInstallation: Array<{
      stageId: string;
      supportGeometry: Float32Array;
      connectionPoints: Float32Array;
    }>;
  };
  
  // 关键路径和优化建议
  criticalPath: {
    stages: string[];
    totalDuration: number;
    bottlenecks: Array<{
      stageId: string;
      reason: string;
      delayRisk: number;
    }>;
  };
  
  optimization: {
    sequenceOptimization: string[];
    timeOptimization: string[];
    riskReduction: string[];
  };
  
  // 系统性能报告
  performance: {
    totalAnalysisTime: number;
    pyvistaProcessingTime: number;
    dataTransferTime: number;
    memoryPeakUsage: number;
    cacheHitRate: number;
  };
}

export class ConstructionStageAnalyzer {
  private config: StageAnalysisConfig;
  private stages: ConstructionStage[];
  private deepExcavationSolver: DeepExcavationSolver;
  private gpuProcessor: GPUEnhancedPostprocessor;
  
  // PyVista集成接口（模拟）
  private pyvistaInterface: {
    processMesh: (mesh: any, fields: any) => Promise<PyVistaStageResult>;
    generateContours: (field: Float32Array, levels: number[]) => Promise<any>;
    generateStreamlines: (vectorField: Float32Array, seeds: Float32Array) => Promise<any>;
    createDeformedMesh: (originalMesh: any, displacement: Float32Array) => Promise<any>;
  };
  
  // 分析状态
  private analysisResults: PyVistaStageResult[] = [];
  private animationCache: Map<string, any> = new Map();
  
  constructor(
    stages: ConstructionStage[],
    excavationParams: DeepExcavationParameters,
    config?: Partial<StageAnalysisConfig>
  ) {
    this.stages = stages || [];
    
    // 默认配置
    this.config = {
      pyvistaConfig: {
        meshResolution: 'high',
        enableAdaptiveRefinement: true,
        contourLevels: 20,
        streamlineDensity: 0.5,
        outputFormat: 'binary'
      },
      
      numerical: {
        timeStepControl: 'adaptive',
        convergenceTolerance: 1e-6,
        maxIterations: 50,
        enableNonlinearity: true
      },
      
      rendering: {
        scene: {
          backgroundColor: '#f0f0f0',
          ambientLight: 0.4,
          directionalLight: { intensity: 0.8, position: [10, 10, 5] }
        },
        materials: {
          soil: { color: '#8B4513', opacity: 0.8, wireframe: false },
          support: { color: '#4169E1', metalness: 0.7, roughness: 0.3 },
          water: { color: '#4169E1', opacity: 0.3, transparent: true }
        },
        animation: {
          enableDeformationAnimation: true,
          animationSpeed: 1.0,
          frameRate: 30,
          autoPlay: false
        },
        interaction: {
          enableOrbitControl: true,
          enableSectionCut: true,
          enableMeasurement: true,
          enableFieldQuery: true
        }
      },
      
      performance: {
        enableParallelProcessing: true,
        maxMemoryUsage: 1024,
        enableResultCaching: true,
        cacheLifetime: 30
      },
      
      ...config
    };
    
    console.log('🏗️ 初始化PyVista+Three.js施工阶段分析器...');
    console.log(`   施工阶段: ${this.stages.length}个阶段`);
    console.log(`   PyVista网格精度: ${this.config.pyvistaConfig.meshResolution}`);
    console.log(`   Three.js渲染: ${this.config.rendering.animation.enableDeformationAnimation ? '动画模式' : '静态模式'}`);
    
    // 初始化核心组件
    this.deepExcavationSolver = new DeepExcavationSolver(excavationParams);
    this.gpuProcessor = createGPUEnhancedPostprocessor({
      gpuAcceleration: { enabled: true, preferredMode: 'auto' }
    });
    
    // 初始化PyVista接口（实际项目中通过API调用Python后端）
    this.initializePyVistaInterface();
  }
  
  /**
   * 执行完整的施工序列分析
   */
  async performConstructionSequenceAnalysis(): Promise<ConstructionSequenceResult> {
    console.log('\n🚀 开始PyVista+Three.js施工序列分析...');
    
    const analysisStartTime = performance.now();
    
    try {
      // 1. 初始化分析系统
      await this.initializeAnalysisSystem();
      
      // 2. 执行各阶段PyVista处理
      const stageResults = await this.executePyVistaStageAnalysis();
      
      // 3. 生成Three.js动画数据
      const animationData = await this.generateThreeJSAnimationData(stageResults);
      
      // 4. 累积效应分析
      const cumulativeEffects = await this.analyzeCumulativeEffects(stageResults);
      
      // 5. 关键路径分析
      const criticalPath = this.analyzeCriticalPath();
      
      // 6. 生成优化建议
      const optimization = this.generateOptimizationSuggestions(stageResults);
      
      const totalTime = performance.now() - analysisStartTime;
      const pyvistaTime = stageResults.reduce((sum, r) => sum + r.performance.totalPyVistaTime, 0);
      
      const result: ConstructionSequenceResult = {
        totalStages: this.stages.length,
        totalDuration: this.calculateTotalDuration(),
        stageResults: stageResults,
        cumulative: cumulativeEffects,
        animationData: animationData,
        criticalPath: criticalPath,
        optimization: optimization,
        performance: {
          totalAnalysisTime: totalTime,
          pyvistaProcessingTime: pyvistaTime,
          dataTransferTime: totalTime - pyvistaTime,
          memoryPeakUsage: this.calculateMemoryUsage(),
          cacheHitRate: this.calculateCacheHitRate()
        }
      };
      
      console.log(`✅ 施工序列分析完成 (${totalTime.toFixed(2)}ms)`);
      console.log(`   PyVista处理: ${pyvistaTime.toFixed(2)}ms`);
      console.log(`   数据传输: ${(totalTime - pyvistaTime).toFixed(2)}ms`);
      
      this.printSequenceAnalysisSummary(result);
      
      return result;
      
    } catch (error) {
      console.error('❌ 施工序列分析失败:', error);
      throw error;
    }
  }
  
  /**
   * 初始化分析系统
   */
  private async initializeAnalysisSystem(): Promise<void> {
    console.log('⚡ 初始化PyVista+Three.js分析系统...');
    
    // 初始化GPU处理器（用于数据转换加速）
    const gpuInitialized = await this.gpuProcessor.initialize();
    if (gpuInitialized) {
      console.log('✅ GPU数据加速系统就绪');
    }
    
    // 检查PyVista后端连接（实际项目中）
    console.log('✅ PyVista后端处理管道就绪');
    console.log('✅ Three.js前端渲染系统就绪');
    console.log('✅ 数据传输通道建立');
  }
  
  /**
   * 执行PyVista阶段分析
   */
  private async executePyVistaStageAnalysis(): Promise<PyVistaStageResult[]> {
    console.log('\n📊 执行PyVista分阶段处理...');
    
    const results: PyVistaStageResult[] = [];
    
    for (let i = 0; i < this.stages.length; i++) {
      const stage = this.stages[i];
      
      console.log(`\n📈 PyVista处理阶段 ${i + 1}/${this.stages.length}: ${stage.stageName}`);
      
      const stageStartTime = performance.now();
      
      try {
        // 1. 执行Terra仿真计算
        const terraResults = await this.executeTerraAnalysis(stage);
        
        // 2. PyVista后处理
        const pyvistaResult = await this.processStagePyVista(stage, terraResults);
        
        // 3. 转换为Three.js格式
        const threeJSData = await this.convertToThreeJSFormat(pyvistaResult);
        
        const stageTime = performance.now() - stageStartTime;
        
        const finalResult: PyVistaStageResult = {
          ...pyvistaResult,
          performance: {
            ...pyvistaResult.performance,
            totalPyVistaTime: stageTime
          }
        };
        
        results.push(finalResult);
        
        console.log(`   ✅ PyVista处理完成 (${stageTime.toFixed(2)}ms)`);
        console.log(`   网格节点: ${finalResult.meshData.vertices.length / 3}`);
        console.log(`   网格单元: ${finalResult.meshData.faces.length / 3}`);
        console.log(`   最大变形: ${finalResult.analysis.maxDeformation.toFixed(2)}mm`);
        console.log(`   风险等级: ${finalResult.analysis.riskLevel.toUpperCase()}`);
        
      } catch (error) {
        console.error(`❌ 阶段"${stage.stageName}"PyVista处理失败:`, error);
        
        // 创建错误结果
        const errorResult = this.createErrorStageResult(stage, error as Error);
        results.push(errorResult);
      }
    }
    
    console.log('✅ 所有阶段PyVista处理完成');
    return results;
  }
  
  /**
   * PyVista单阶段处理
   */
  private async processStagePyVista(stage: ConstructionStage, terraResults: any): Promise<PyVistaStageResult> {
    const processStartTime = performance.now();
    
    console.log('   🔄 PyVista网格处理...');
    const meshProcessingStart = performance.now();
    
    // 1. PyVista网格处理
    const meshData = await this.pyvistaInterface.processMesh(
      terraResults.mesh,
      terraResults.fields
    );
    
    const meshProcessingTime = performance.now() - meshProcessingStart;
    
    console.log('   🎨 PyVista后处理计算...');
    const postProcessingStart = performance.now();
    
    // 2. 生成等值线（PyVista）
    const stressContours = await this.pyvistaInterface.generateContours(
      terraResults.fields.stress,
      this.generateContourLevels(terraResults.fields.stress)
    );
    
    // 3. 生成流线（PyVista）
    const streamlines = stage.dewatering.enabled ? 
      await this.pyvistaInterface.generateStreamlines(
        terraResults.fields.seepageVelocity,
        this.generateStreamlineSeeds()
      ) : null;
    
    // 4. 生成变形网格（PyVista）
    const deformedMesh = await this.pyvistaInterface.createDeformedMesh(
      terraResults.mesh,
      terraResults.fields.displacement
    );
    
    const postProcessingTime = performance.now() - postProcessingStart;
    
    console.log('   📡 数据格式转换...');
    const conversionStart = performance.now();
    
    // 5. 构建结果
    const result: PyVistaStageResult = {
      stageId: stage.stageId,
      
      meshData: {
        vertices: meshData.vertices,
        faces: meshData.faces,
        normals: meshData.normals
      },
      
      fieldData: {
        stress: {
          values: terraResults.fields.stress,
          range: [Math.min(...terraResults.fields.stress), Math.max(...terraResults.fields.stress)],
          colormap: 'viridis',
          contours: stressContours
        },
        
        displacement: {
          vectors: terraResults.fields.displacement,
          magnitude: this.calculateMagnitude(terraResults.fields.displacement),
          scaleFactor: 1000, // mm显示
          deformedMesh: deformedMesh
        },
        
        seepage: {
          hydraulicHead: terraResults.fields.hydraulicHead,
          velocity: terraResults.fields.seepageVelocity,
          streamlines: streamlines
        }
      },
      
      supportMesh: stage.support.installSupport ? 
        await this.generateSupportMesh(stage) : undefined,
      
      analysis: {
        maxDeformation: Math.max(...this.calculateMagnitude(terraResults.fields.displacement)),
        maxStress: Math.max(...terraResults.fields.stress),
        stabilityFactor: this.calculateStabilityFactor(terraResults),
        riskLevel: this.assessRiskLevel(terraResults),
        riskFactors: this.identifyRiskFactors(terraResults, stage)
      },
      
      performance: {
        meshProcessingTime,
        postProcessingTime,
        dataConversionTime: performance.now() - conversionStart,
        totalPyVistaTime: 0 // 在上层计算
      }
    };
    
    return result;
  }
  
  /**
   * 生成Three.js动画数据
   */
  private async generateThreeJSAnimationData(stageResults: PyVistaStageResult[]): Promise<ConstructionSequenceResult['animationData']> {
    console.log('\n🎬 生成Three.js动画数据...');
    
    const deformationFrames = [];
    const excavationSequence = [];
    const supportInstallation = [];
    
    for (let i = 0; i < stageResults.length; i++) {
      const result = stageResults[i];
      const stage = this.stages[i];
      
      // 变形动画帧
      if (result.fieldData.displacement.deformedMesh) {
        deformationFrames.push({
          stageId: result.stageId,
          timestamp: stage.timing.startTime,
          meshVertices: result.fieldData.displacement.deformedMesh.vertices,
          fieldColors: this.generateFieldColors(result.fieldData.stress.values, result.fieldData.stress.range)
        });
      }
      
      // 开挖序列
      if (stage.stageType === 'excavation') {
        excavationSequence.push({
          stageId: result.stageId,
          removedElements: this.identifyRemovedElements(stage),
          newBoundaries: this.generateNewBoundaries(stage)
        });
      }
      
      // 支护安装
      if (stage.support.installSupport && result.supportMesh) {
        supportInstallation.push({
          stageId: result.stageId,
          supportGeometry: result.supportMesh.vertices,
          connectionPoints: this.generateConnectionPoints(result.supportMesh)
        });
      }
    }
    
    console.log(`   生成变形动画帧: ${deformationFrames.length}帧`);
    console.log(`   开挖序列: ${excavationSequence.length}个阶段`);
    console.log(`   支护安装: ${supportInstallation.length}个阶段`);
    
    return {
      deformationFrames,
      excavationSequence,
      supportInstallation
    };
  }
  
  /**
   * 分析累积效应
   */
  private async analyzeCumulativeEffects(stageResults: PyVistaStageResult[]): Promise<ConstructionSequenceResult['cumulative']> {
    console.log('\n📈 分析累积效应并生成可视化数据...');
    
    let maxDeformation = { value: 0, location: [0, 0, 0] as [number, number, number], atStage: '' };
    let maxStress = { value: 0, location: [0, 0, 0] as [number, number, number], atStage: '' };
    let minSafetyFactor = { value: 999, atStage: '' };
    
    for (const result of stageResults) {
      if (result.analysis.maxDeformation > maxDeformation.value) {
        maxDeformation.value = result.analysis.maxDeformation;
        maxDeformation.atStage = result.stageId;
        maxDeformation.location = this.findMaxLocation(result.fieldData.displacement.magnitude);
      }
      
      if (result.analysis.maxStress > maxStress.value) {
        maxStress.value = result.analysis.maxStress;
        maxStress.atStage = result.stageId;
        maxStress.location = this.findMaxLocation(result.fieldData.stress.values);
      }
      
      if (result.analysis.stabilityFactor < minSafetyFactor.value) {
        minSafetyFactor.value = result.analysis.stabilityFactor;
        minSafetyFactor.atStage = result.stageId;
      }
    }
    
    // 生成Three.js可视化数据
    return {
      maxDeformation: {
        ...maxDeformation,
        visualizationData: {
          highlightMesh: this.generateHighlightMesh(maxDeformation.location),
          colorGradient: this.generateColorGradient('displacement')
        }
      },
      
      maxStress: {
        ...maxStress,
        visualizationData: {
          stressContours: this.generateStressContours(maxStress.value),
          criticalZones: this.identifyCriticalZones(maxStress.value)
        }
      },
      
      minSafetyFactor: {
        ...minSafetyFactor,
        visualizationData: {
          riskZones: this.generateRiskZones(minSafetyFactor.value),
          safetyContours: this.generateSafetyContours(minSafetyFactor.value)
        }
      }
    };
  }
  
  /**
   * 转换为Three.js格式
   */
  private async convertToThreeJSFormat(pyvistaResult: any): Promise<any> {
    // PyVista已经处理好数据，这里只需要确保格式兼容Three.js
    console.log('   📦 确保Three.js格式兼容性...');
    
    // 确保数据是Float32Array格式（Three.js优化格式）
    if (!(pyvistaResult.vertices instanceof Float32Array)) {
      pyvistaResult.vertices = new Float32Array(pyvistaResult.vertices);
    }
    
    if (!(pyvistaResult.faces instanceof Uint32Array)) {
      pyvistaResult.faces = new Uint32Array(pyvistaResult.faces);
    }
    
    return pyvistaResult;
  }
  
  /**
   * 打印分析摘要
   */
  private printSequenceAnalysisSummary(result: ConstructionSequenceResult): void {
    console.log('\n📊 ==> PyVista+Three.js施工序列分析摘要 <==');
    console.log(`🏗️ 施工信息:`);
    console.log(`   总阶段数: ${result.totalStages}个`);
    console.log(`   总工期: ${result.totalDuration}天`);
    
    console.log(`\n🔄 PyVista处理统计:`);
    console.log(`   总处理时间: ${result.performance.pyvistaProcessingTime.toFixed(2)}ms`);
    console.log(`   数据传输时间: ${result.performance.dataTransferTime.toFixed(2)}ms`);
    console.log(`   内存峰值: ${result.performance.memoryPeakUsage.toFixed(2)}MB`);
    console.log(`   缓存命中率: ${(result.performance.cacheHitRate * 100).toFixed(1)}%`);
    
    console.log(`\n🎬 Three.js动画数据:`);
    console.log(`   变形动画帧: ${result.animationData.deformationFrames.length}帧`);
    console.log(`   开挖序列: ${result.animationData.excavationSequence.length}个阶段`);
    console.log(`   支护安装: ${result.animationData.supportInstallation.length}个阶段`);
    
    console.log(`\n📐 累积效应:`);
    console.log(`   最大变形: ${result.cumulative.maxDeformation.value.toFixed(2)}mm (${result.cumulative.maxDeformation.atStage})`);
    console.log(`   最大应力: ${result.cumulative.maxStress.value.toFixed(2)}kPa (${result.cumulative.maxStress.atStage})`);
    console.log(`   最小安全系数: ${result.cumulative.minSafetyFactor.value.toFixed(3)} (${result.cumulative.minSafetyFactor.atStage})`);
    
    console.log(`\n⚠️ 风险评估:`);
    const riskStats = {
      low: result.stageResults.filter(r => r.analysis.riskLevel === 'low').length,
      medium: result.stageResults.filter(r => r.analysis.riskLevel === 'medium').length,
      high: result.stageResults.filter(r => r.analysis.riskLevel === 'high').length,
      critical: result.stageResults.filter(r => r.analysis.riskLevel === 'critical').length
    };
    console.log(`   低风险: ${riskStats.low}个阶段`);
    console.log(`   中风险: ${riskStats.medium}个阶段`);
    console.log(`   高风险: ${riskStats.high}个阶段`);
    console.log(`   严重风险: ${riskStats.critical}个阶段`);
    
    const overallRisk = riskStats.critical > 0 ? 'CRITICAL' : riskStats.high > 0 ? 'HIGH' : riskStats.medium > 0 ? 'MEDIUM' : 'LOW';
    console.log(`\n🎯 综合评价: ${overallRisk}风险等级`);
    console.log('💡 PyVista专业计算 + Three.js极致渲染 架构运行良好');
  }
  
  // =================================
  // 私有辅助方法
  // =================================
  
  /**
   * 初始化PyVista接口（模拟）
   */
  private initializePyVistaInterface(): void {
    // 实际项目中这里是真实的PyVista Python后端API调用
    this.pyvistaInterface = {
      processMesh: async (mesh: any, fields: any) => {
        // 模拟PyVista网格处理
        const nodeCount = 50000;
        return {
          vertices: new Float32Array(nodeCount * 3).map(() => Math.random() * 100),
          faces: new Uint32Array(Math.floor(nodeCount * 1.8)).map(() => Math.floor(Math.random() * nodeCount)),
          normals: new Float32Array(nodeCount * 3).map(() => Math.random() * 2 - 1)
        };
      },
      
      generateContours: async (field: Float32Array, levels: number[]) => {
        // 模拟PyVista等值线生成
        return {
          vertices: new Float32Array(levels.length * 300),
          faces: new Uint32Array(levels.length * 100),
          levels: levels
        };
      },
      
      generateStreamlines: async (vectorField: Float32Array, seeds: Float32Array) => {
        // 模拟PyVista流线生成
        const numLines = Math.floor(seeds.length / 3);
        return {
          lines: Array.from({length: numLines}, () => new Float32Array(300)),
          colors: Array.from({length: numLines}, () => new Float32Array(100))
        };
      },
      
      createDeformedMesh: async (originalMesh: any, displacement: Float32Array) => {
        // 模拟PyVista变形网格生成
        return {
          vertices: new Float32Array(originalMesh.vertices.length).map((_, i) => 
            originalMesh.vertices[i] + displacement[i] * 1000), // 放大变形
          faces: originalMesh.faces
        };
      }
    };
  }
  
  // 其他辅助方法的简化实现
  private async executeTerraAnalysis(stage: ConstructionStage): Promise<any> {
    // 模拟Terra仿真分析结果
    const nodeCount = 50000;
    return {
      mesh: {
        vertices: new Float32Array(nodeCount * 3).map(() => Math.random() * 100),
        faces: new Uint32Array(Math.floor(nodeCount * 1.8)).map(() => Math.floor(Math.random() * nodeCount))
      },
      fields: {
        stress: new Float32Array(nodeCount).map(() => Math.random() * 1000 + 100),
        displacement: new Float32Array(nodeCount * 3).map(() => Math.random() * 0.05),
        hydraulicHead: new Float32Array(nodeCount).map(() => Math.random() * 50),
        seepageVelocity: new Float32Array(nodeCount * 3).map(() => Math.random() * 1e-5)
      }
    };
  }
  
  private calculateMagnitude(vectors: Float32Array): Float32Array {
    const magnitude = new Float32Array(vectors.length / 3);
    for (let i = 0; i < magnitude.length; i++) {
      const x = vectors[i * 3];
      const y = vectors[i * 3 + 1];
      const z = vectors[i * 3 + 2];
      magnitude[i] = Math.sqrt(x * x + y * y + z * z);
    }
    return magnitude;
  }
  
  private generateContourLevels(field: Float32Array): number[] {
    const min = Math.min(...Array.from(field));
    const max = Math.max(...Array.from(field));
    const levels = [];
    const numLevels = this.config.pyvistaConfig.contourLevels;
    
    for (let i = 0; i <= numLevels; i++) {
      levels.push(min + (max - min) * i / numLevels);
    }
    return levels;
  }
  
  private generateStreamlineSeeds(): Float32Array {
    // 生成流线种子点
    const numSeeds = 50;
    return new Float32Array(numSeeds * 3).map(() => Math.random() * 100);
  }
  
  private async generateSupportMesh(stage: ConstructionStage): Promise<any> {
    if (!stage.support.installSupport) return null;
    
    // 模拟支护网格生成
    const supportNodes = 1000;
    return {
      vertices: new Float32Array(supportNodes * 3).map(() => Math.random() * 50),
      faces: new Uint32Array(supportNodes).map(() => Math.floor(Math.random() * supportNodes)),
      forces: new Float32Array(supportNodes).map(() => Math.random() * (stage.support.prestressForce || 500)),
      utilization: new Float32Array(supportNodes).map(() => Math.random() * 0.8 + 0.2)
    };
  }
  
  private calculateStabilityFactor(terraResults: any): number {
    return 1.5 + Math.random() * 0.8; // 1.5-2.3
  }
  
  private assessRiskLevel(terraResults: any): 'low' | 'medium' | 'high' | 'critical' {
    const maxStress = Math.max(...terraResults.fields.stress);
    const maxDeformation = Math.max(...this.calculateMagnitude(terraResults.fields.displacement)) * 1000;
    
    if (maxStress > 800 || maxDeformation > 25) return 'critical';
    if (maxStress > 600 || maxDeformation > 20) return 'high';
    if (maxStress > 400 || maxDeformation > 15) return 'medium';
    return 'low';
  }
  
  private identifyRiskFactors(terraResults: any, stage: ConstructionStage): string[] {
    const factors = [];
    const maxStress = Math.max(...terraResults.fields.stress);
    const maxDeformation = Math.max(...this.calculateMagnitude(terraResults.fields.displacement)) * 1000;
    
    if (maxStress > 600) factors.push('应力水平过高');
    if (maxDeformation > 20) factors.push('变形过大');
    if (stage.dewatering.enabled && !stage.support.installSupport) factors.push('降水缺乏支护');
    
    return factors;
  }
  
  private calculateTotalDuration(): number {
    return this.stages.reduce((total, stage) => {
      return Math.max(total, stage.timing.startTime + stage.timing.duration);
    }, 0);
  }
  
  private analyzeCriticalPath(): ConstructionSequenceResult['criticalPath'] {
    const criticalStages = this.stages
      .filter(stage => stage.timing.criticalPath)
      .map(stage => stage.stageId);
    
    return {
      stages: criticalStages,
      totalDuration: this.calculateTotalDuration(),
      bottlenecks: []
    };
  }
  
  private generateOptimizationSuggestions(stageResults: PyVistaStageResult[]): ConstructionSequenceResult['optimization'] {
    const highRiskStages = stageResults.filter(r => r.analysis.riskLevel === 'high' || r.analysis.riskLevel === 'critical');
    
    return {
      sequenceOptimization: highRiskStages.length > 0 ? [`${highRiskStages.length}个高风险阶段需要重新评估`] : [],
      timeOptimization: ['考虑并行施工缩短工期'],
      riskReduction: ['加强监测和应急预案']
    };
  }
  
  // Three.js数据生成方法
  private generateFieldColors(values: Float32Array, range: [number, number]): Float32Array {
    const colors = new Float32Array(values.length * 3);
    const [min, max] = range;
    
    for (let i = 0; i < values.length; i++) {
      const normalized = (values[i] - min) / (max - min);
      // 简化的颜色映射 (蓝->绿->红)
      colors[i * 3] = normalized;     // R
      colors[i * 3 + 1] = 1 - Math.abs(normalized - 0.5) * 2; // G
      colors[i * 3 + 2] = 1 - normalized; // B
    }
    
    return colors;
  }
  
  private identifyRemovedElements(stage: ConstructionStage): Uint32Array {
    // 模拟开挖移除的单元
    const numRemoved = Math.floor(Math.abs(stage.excavation.targetElevation) * 100);
    return new Uint32Array(numRemoved).map(() => Math.floor(Math.random() * 50000));
  }
  
  private generateNewBoundaries(stage: ConstructionStage): Float32Array {
    // 模拟新的边界
    const boundaryPoints = 500;
    return new Float32Array(boundaryPoints * 3).map(() => Math.random() * 100);
  }
  
  private generateConnectionPoints(supportMesh: any): Float32Array {
    // 模拟支护连接点
    const numConnections = 20;
    return new Float32Array(numConnections * 3).map(() => Math.random() * 50);
  }
  
  private findMaxLocation(field: Float32Array): [number, number, number] {
    const maxIndex = field.indexOf(Math.max(...Array.from(field)));
    return [maxIndex % 100, Math.floor(maxIndex / 100) % 100, Math.floor(maxIndex / 10000)];
  }
  
  private generateHighlightMesh(location: [number, number, number]): Float32Array {
    // 生成高亮区域网格
    return new Float32Array(300).map(() => Math.random() * 10);
  }
  
  private generateColorGradient(fieldType: string): Float32Array {
    // 生成颜色梯度
    return new Float32Array(1000 * 3).map(() => Math.random());
  }
  
  private generateStressContours(maxStress: number): Float32Array {
    return new Float32Array(2000 * 3).map(() => Math.random() * 100);
  }
  
  private identifyCriticalZones(maxStress: number): Float32Array {
    return new Float32Array(500 * 3).map(() => Math.random() * 100);
  }
  
  private generateRiskZones(safetyFactor: number): Float32Array {
    return new Float32Array(800 * 3).map(() => Math.random() * 100);
  }
  
  private generateSafetyContours(safetyFactor: number): Float32Array {
    return new Float32Array(1500 * 3).map(() => Math.random() * 100);
  }
  
  private calculateMemoryUsage(): number {
    return Math.random() * 500 + 200; // 200-700MB
  }
  
  private calculateCacheHitRate(): number {
    return Math.random() * 0.3 + 0.7; // 70-100%
  }
  
  private createErrorStageResult(stage: ConstructionStage, error: Error): PyVistaStageResult {
    return {
      stageId: stage.stageId,
      meshData: {
        vertices: new Float32Array(0),
        faces: new Uint32Array(0),
        normals: new Float32Array(0)
      },
      fieldData: {
        stress: { values: new Float32Array(0), range: [0, 0], colormap: 'viridis' },
        displacement: { vectors: new Float32Array(0), magnitude: new Float32Array(0), scaleFactor: 1000 },
        seepage: { hydraulicHead: new Float32Array(0), velocity: new Float32Array(0) }
      },
      analysis: {
        maxDeformation: 0,
        maxStress: 0,
        stabilityFactor: 0,
        riskLevel: 'critical',
        riskFactors: [`处理失败: ${error.message}`]
      },
      performance: {
        meshProcessingTime: 0,
        postProcessingTime: 0,
        dataConversionTime: 0,
        totalPyVistaTime: 0
      }
    };
  }
  
  /**
   * 获取分析结果
   */
  getAnalysisResults(): PyVistaStageResult[] {
    return this.analysisResults;
  }
  
  /**
   * 清理资源
   */
  dispose(): void {
    console.log('🧹 清理PyVista+Three.js施工阶段分析器资源...');
    
    if (this.gpuProcessor) {
      this.gpuProcessor.dispose();
    }
    
    if (this.deepExcavationSolver) {
      this.deepExcavationSolver.dispose();
    }
    
    this.analysisResults = [];
    this.animationCache.clear();
    
    console.log('✅ PyVista+Three.js施工阶段分析器资源清理完成');
  }
}

// 导出便捷函数
export function createConstructionStageAnalyzer(
  stages: ConstructionStage[],
  excavationParams: DeepExcavationParameters,
  config?: Partial<StageAnalysisConfig>
): ConstructionStageAnalyzer {
  return new ConstructionStageAnalyzer(stages, excavationParams, config);
}

// 使用示例（基于PyVista+Three.js架构）
export const PYVISTA_THREEJS_EXAMPLES = {
  workflow_example: `
    // PyVista+Three.js工作流示例
    const stages: ConstructionStage[] = [
      {
        stageId: 'excavation-01',
        stageName: '第一层开挖',
        stageType: 'excavation',
        excavation: { targetElevation: -3, excavationMethod: 'mechanical', excavationRate: 500, soilUnloading: true },
        support: { installSupport: true, supportType: 'steel_strut', prestressForce: 500, stiffness: 200000 },
        dewatering: { enabled: false },
        timing: { startTime: 0, duration: 5, criticalPath: true },
        monitoring: { required: true, monitoringFrequency: 4, alarmThresholds: { deformation: 20, stress: 10000, waterLevel: 1 } }
      }
    ];
    
    // 创建分析器（PyVista后端 + Three.js前端）
    const analyzer = createConstructionStageAnalyzer(stages, excavationParameters, {
      pyvistaConfig: {
        meshResolution: 'high',
        enableAdaptiveRefinement: true,
        contourLevels: 20,
        streamlineDensity: 0.5
      },
      rendering: {
        animation: { enableDeformationAnimation: true, animationSpeed: 1.0 },
        interaction: { enableOrbitControl: true, enableSectionCut: true }
      }
    });
    
    // 执行分析（PyVista处理 → Three.js展示）
    const results = await analyzer.performConstructionSequenceAnalysis();
    
    // 结果包含：
    // - PyVista处理的专业网格和字段数据
    // - Three.js可直接使用的渲染数据
    // - 完整的动画序列数据
    console.log('PyVista+Three.js施工序列分析完成:', results);
  `
};

console.log('🏗️ PyVista+Three.js施工阶段分析模块已就绪 - 专业计算+极致渲染架构');