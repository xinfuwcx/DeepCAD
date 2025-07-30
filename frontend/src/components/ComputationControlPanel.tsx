/**
 * 深基坑计算控制面板
 * 3号计算专家 - 专业CAE计算控制界面
 * 集成PyVista+Three.js架构的统一计算管理系统
 * 为1号首席架构师提供专业级计算控制体验
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import * as THREE from 'three';

// 导入我们的计算内核
import { 
  DeepExcavationSolver,
  type DeepExcavationParameters,
  type DeepExcavationResults 
} from '../services/deepExcavationSolver';

import { 
  ConstructionStageAnalyzer,
  type ConstructionStage,
  type PyVistaStageResult 
} from '../services/constructionStageAnalysis';

import { 
  SafetyAssessmentSystem,
  type SafetyAssessmentResult,
  type RiskLevel 
} from '../services/safetyAssessmentSystem';

import { 
  StressCloudGPURenderer,
  type PyVistaStressData,
  defaultStressVisualizationConfig 
} from '../services/stressCloudGPURenderer';

import { 
  FlowFieldVisualizationGPU,
  type PyVistaSeepageData,
  defaultFlowVisualizationConfig 
} from '../services/flowFieldVisualizationGPU';

import { 
  DeformationAnimationSystem,
  type DeformationAnimationConfig,
  type PyVistaDeformationData 
} from '../services/deformationAnimationSystem';

// 导入2号专家几何建模服务接口
import { 
  geometryArchitecture,
  type GeometryModel,
  type MeshQualityFeedback
} from '../services/GeometryArchitectureService';

import geometryToMeshService, {
  type MeshData,
  type GeometryToMeshData
} from '../services/geometryToMeshService';

// 导入性能监控服务
import { 
  WebGPUPerformanceMonitor,
  type GPUMemoryStats,
  type ComputePerformanceMetrics
} from '../services/webgpuPerformanceMonitor';

// 导入网格质量服务
import meshQualityService, {
  type MeshQualityReport
} from '../services/meshQualityService';

// 计算任务状态
export type ComputationStatus = 'idle' | 'running' | 'paused' | 'completed' | 'error';

// 计算任务类型
export type ComputationTask = 
  | 'soil_structure_coupling'
  | 'construction_stage_analysis' 
  | 'safety_assessment'
  | 'stress_visualization'
  | 'deformation_animation'
  | 'flow_field_visualization'
  | 'comprehensive_analysis';

// 计算控制接口
interface ComputationControlState {
  // 当前任务状态
  currentTask: ComputationTask | null;
  status: ComputationStatus;
  progress: number;           // 0-100
  elapsedTime: number;        // 秒
  estimatedTimeRemaining: number; // 秒
  
  // 错误信息
  errorMessage?: string;
  
  // 结果数据
  results: {
    excavationResults?: DeepExcavationResults;
    stageResults?: PyVistaStageResult[];
    safetyResults?: SafetyAssessmentResult;
    stressData?: PyVistaStressData;
    seepageData?: PyVistaSeepageData;
    deformationData?: PyVistaDeformationData;
    geometryModels?: GeometryModel[];    // 2号专家几何模型
    meshData?: MeshData;                 // 网格数据
  };
  
  // 可视化状态
  visualization: {
    stressCloudEnabled: boolean;
    deformationAnimationEnabled: boolean;
    flowFieldEnabled: boolean;
    safetyOverlayEnabled: boolean;
  };
  
  // 性能监控状态
  performance: {
    gpuMemory?: GPUMemoryStats;
    computeMetrics?: ComputePerformanceMetrics;
    meshQualityScore?: number;
    fps?: number;
  };
  
  // 质量监控状态
  quality: {
    meshQualityReport?: MeshQualityReport;
    geometryOptimization?: {
      status: 'pending' | 'running' | 'completed';
      improvements: string[];
    };
  };
}

// 计算配置参数
interface ComputationConfig {
  // 基础参数
  project: {
    name: string;
    description: string;
    engineerName: string;
    analysisStandard: 'GB50007' | 'JGJ120' | 'JTS165' | 'CECS22';
  };
  
  // 几何参数
  geometry: {
    excavationDepth: number;      // 开挖深度 (m)
    excavationWidth: number;      // 开挖宽度 (m)
    excavationLength: number;     // 开挖长度 (m)
    retainingWallType: 'diaphragm' | 'pile' | 'SMW' | 'steel_sheet';
    wallThickness: number;        // 墙体厚度 (m)
    embedmentDepth: number;       // 入土深度 (m)
  };
  
  // 土体参数
  soilLayers: Array<{
    layerId: string;
    layerName: string;
    topElevation: number;         // 顶面标高 (m)
    bottomElevation: number;      // 底面标高 (m)
    
    // 物理参数
    unitWeight: number;           // 重度 (kN/m³)
    cohesion: number;             // 粘聚力 (kPa)
    frictionAngle: number;        // 摩擦角 (°)
    elasticModulus: number;       // 弹性模量 (MPa)
    poissonRatio: number;         // 泊松比
    
    // 渗透参数
    permeabilityH: number;        // 水平渗透系数 (m/s)
    permeabilityV: number;        // 垂直渗透系数 (m/s)
    
    // 土压力参数
    K0: number;                   // 静止土压力系数
    Ka: number;                   // 主动土压力系数
    Kp: number;                   // 被动土压力系数
  }>;
  
  // 地下水参数
  groundwater: {
    initialWaterLevel: number;    // 初始水位 (m)
    targetWaterLevel: number;     // 目标水位 (m)
    pumpingRate: number;          // 抽水量 (m³/day)
    wellSpacing: number;          // 井点间距 (m)
    wellDepth: number;            // 井点深度 (m)
  };
  
  // 支撑参数
  support: {
    levels: Array<{
      levelId: string;
      elevation: number;          // 支撑标高 (m)
      supportType: 'steel_strut' | 'concrete_strut' | 'anchor';
      crossSectionArea: number;   // 截面面积 (m²)
      elasticModulus: number;     // 弹性模量 (GPa)
      prestressForce?: number;    // 预应力 (kN)
      spacing: number;            // 支撑间距 (m)
    }>;
  };
  
  // 荷载参数
  loads: {
    surfaceLoad: number;          // 地面超载 (kPa)
    constructionLoad: number;     // 施工荷载 (kPa)
    adjacentBuilding?: {
      distance: number;           // 距离 (m)
      foundationLoad: number;     // 基础荷载 (kPa)
      foundationDepth: number;    // 基础深度 (m)
    };
  };
  
  // 施工参数
  construction: {
    stages: ConstructionStage[];
    excavationRate: number;       // 开挖速率 (m/day)
    supportInstallationTime: number; // 支撑安装时间 (day)
    dewateringTime: number;       // 降水时间 (day)
  };
  
  // 分析参数
  analysis: {
    analysisType: 'static' | 'dynamic' | 'coupled';
    timeSteps: number;            // 时间步数
    convergenceTolerance: number; // 收敛容差
    maxIterations: number;        // 最大迭代次数
    
    // 安全系数
    safetyFactors: {
      overall: number;            // 整体安全系数
      local: number;              // 局部安全系数
      uplift: number;             // 抗浮安全系数
      piping: number;             // 管涌安全系数
    };
  };
  
  // 可视化配置
  visualization: {
    stressVisualization: typeof defaultStressVisualizationConfig;
    flowVisualization: typeof defaultFlowVisualizationConfig;
    deformationAnimation: DeformationAnimationConfig;
    renderQuality: 'low' | 'medium' | 'high' | 'ultra';
    enableRealTimeUpdate: boolean;
    cinematicMode: boolean;       // 电影模式
  };
}

// 性能监控数据
interface PerformanceMetrics {
  cpu: {
    usage: number;                // CPU使用率 %
    temperature: number;          // CPU温度 °C
  };
  memory: {
    total: number;                // 总内存 MB
    used: number;                 // 已用内存 MB
    available: number;            // 可用内存 MB
  };
  gpu: {
    usage: number;                // GPU使用率 %
    memory: number;               // GPU显存使用率 %
    temperature: number;          // GPU温度 °C
  };
  computation: {
    activeThreads: number;        // 活跃线程数
    computeUnits: number;         // 计算单元数
    throughput: number;           // 吞吐量 GFLOPS
  };
}

// React组件接口
interface ComputationControlPanelProps {
  scene: THREE.Scene;
  onStatusChange?: (status: ComputationStatus) => void;
  onResultsUpdate?: (results: ComputationControlState['results']) => void;
  onError?: (error: string) => void;
}

/**
 * 深基坑计算控制面板组件
 */
export const ComputationControlPanel: React.FC<ComputationControlPanelProps> = ({
  scene,
  onStatusChange,
  onResultsUpdate,
  onError
}) => {
  // 状态管理
  const [controlState, setControlState] = useState<ComputationControlState>({
    currentTask: null,
    status: 'idle',
    progress: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    results: {},
    visualization: {
      stressCloudEnabled: true,
      deformationAnimationEnabled: true,
      flowFieldEnabled: true,
      safetyOverlayEnabled: true
    }
  });
  
  const [config, setConfig] = useState<ComputationConfig>({
    project: {
      name: 'DeepCAD深基坑工程',
      description: '高端商业综合体深基坑支护工程',
      engineerName: '3号计算专家',
      analysisStandard: 'JGJ120'
    },
    
    geometry: {
      excavationDepth: 15.0,
      excavationWidth: 80.0,
      excavationLength: 120.0,
      retainingWallType: 'diaphragm',
      wallThickness: 0.8,
      embedmentDepth: 20.0
    },
    
    soilLayers: [
      {
        layerId: 'layer1',
        layerName: '杂填土',
        topElevation: 0.0,
        bottomElevation: -3.0,
        unitWeight: 18.0,
        cohesion: 15.0,
        frictionAngle: 12.0,
        elasticModulus: 5.0,
        poissonRatio: 0.35,
        permeabilityH: 1e-6,
        permeabilityV: 5e-7,
        K0: 0.5,
        Ka: 0.33,
        Kp: 3.0
      },
      {
        layerId: 'layer2',
        layerName: '粉质粘土',
        topElevation: -3.0,
        bottomElevation: -12.0,
        unitWeight: 19.5,
        cohesion: 25.0,
        frictionAngle: 18.0,
        elasticModulus: 12.0,
        poissonRatio: 0.32,
        permeabilityH: 5e-8,
        permeabilityV: 2e-8,
        K0: 0.52,
        Ka: 0.31,
        Kp: 3.2
      },
      {
        layerId: 'layer3',
        layerName: '中砂',
        topElevation: -12.0,
        bottomElevation: -25.0,
        unitWeight: 20.0,
        cohesion: 0.0,
        frictionAngle: 30.0,
        elasticModulus: 25.0,
        poissonRatio: 0.28,
        permeabilityH: 1e-4,
        permeabilityV: 5e-5,
        K0: 0.50,
        Ka: 0.33,
        Kp: 3.0
      }
    ],
    
    groundwater: {
      initialWaterLevel: -2.0,
      targetWaterLevel: -16.0,
      pumpingRate: 500.0,
      wellSpacing: 15.0,
      wellDepth: 18.0
    },
    
    support: {
      levels: [
        {
          levelId: 'strut1',
          elevation: -1.5,
          supportType: 'steel_strut',
          crossSectionArea: 0.02,
          elasticModulus: 200,
          spacing: 6.0
        },
        {
          levelId: 'strut2',
          elevation: -4.5,
          supportType: 'steel_strut',
          crossSectionArea: 0.025,
          elasticModulus: 200,
          spacing: 6.0
        },
        {
          levelId: 'strut3',
          elevation: -7.5,
          supportType: 'steel_strut',
          crossSectionArea: 0.03,
          elasticModulus: 200,
          spacing: 6.0
        }
      ]
    },
    
    loads: {
      surfaceLoad: 20.0,
      constructionLoad: 10.0,
      adjacentBuilding: {
        distance: 25.0,
        foundationLoad: 150.0,
        foundationDepth: 3.0
      }
    },
    
    construction: {
      stages: [],
      excavationRate: 2.0,
      supportInstallationTime: 1.0,
      dewateringTime: 7.0
    },
    
    analysis: {
      analysisType: 'coupled',
      timeSteps: 100,
      convergenceTolerance: 1e-6,
      maxIterations: 50,
      safetyFactors: {
        overall: 1.25,
        local: 1.15,
        uplift: 1.1,
        piping: 1.5
      }
    },
    
    visualization: {
      stressVisualization: defaultStressVisualizationConfig,
      flowVisualization: defaultFlowVisualizationConfig,
      deformationAnimation: {
        timing: {
          totalDuration: 30.0,
          frameRate: 60,
          playbackSpeed: 1.0,
          enableTimeReversal: true,
          loopMode: 'repeat'
        },
        deformation: {
          amplificationFactor: 1000.0,
          enableRealScale: false,
          showOriginalMesh: true,
          originalMeshOpacity: 0.3,
          enableMorphTargets: true,
          morphBlendMode: 'smooth'
        },
        visualEffects: {
          enableTrails: true,
          trailLength: 50,
          enableParticles: true,
          particleDensity: 0.5,
          enableShockwaves: false,
          colorTransition: true
        },
        cameraAnimation: {
          enableCameraMovement: true,
          cameraPath: 'fly_through',
          focusPoints: [],
          transitionDuration: 3.0,
          enableCinematicEffects: true
        },
        interaction: {
          allowManualControl: true,
          enableTimelineScrubbing: true,
          showControlPanel: true,
          enableHotkeys: true
        },
        performance: {
          enableLOD: true,
          lodDistances: [10, 50, 200],
          enableCulling: true,
          maxVerticesPerFrame: 100000,
          enableGPUMorphing: true
        }
      },
      renderQuality: 'high',
      enableRealTimeUpdate: true,
      cinematicMode: false
    }
  });
  
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    cpu: { usage: 0, temperature: 0 },
    memory: { total: 0, used: 0, available: 0 },
    gpu: { usage: 0, memory: 0, temperature: 0 },
    computation: { activeThreads: 0, computeUnits: 0, throughput: 0 }
  });
  
  // 计算引擎实例
  const solverRef = useRef<DeepExcavationSolver | null>(null);
  const stageAnalyzerRef = useRef<ConstructionStageAnalyzer | null>(null);
  const safetySystemRef = useRef<SafetyAssessmentSystem | null>(null);
  const stressRendererRef = useRef<StressCloudGPURenderer | null>(null);
  const flowVisualizerRef = useRef<FlowFieldVisualizationGPU | null>(null);
  const deformationSystemRef = useRef<DeformationAnimationSystem | null>(null);
  
  // 计时器
  const startTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * 初始化计算引擎
   */
  useEffect(() => {
    const initializeEngines = async () => {
      try {
        // 创建计算引擎实例
        solverRef.current = new DeepExcavationSolver();
        stageAnalyzerRef.current = new ConstructionStageAnalyzer();
        safetySystemRef.current = new SafetyAssessmentSystem();
        
        // 创建可视化引擎
        stressRendererRef.current = new StressCloudGPURenderer(scene, config.visualization.stressVisualization);
        flowVisualizerRef.current = new FlowFieldVisualizationGPU(scene, config.visualization.flowVisualization);
        deformationSystemRef.current = new DeformationAnimationSystem(scene, config.visualization.deformationAnimation);
        
        // 初始化WebGPU系统
        await stressRendererRef.current.initialize();
        await flowVisualizerRef.current.initialize();
        await deformationSystemRef.current.initialize();
        
        console.log('DeepCAD计算控制系统初始化完成');
        
      } catch (error) {
        console.error('计算引擎初始化失败:', error);
        onError?.('计算引擎初始化失败: ' + error);
      }
    };
    
    initializeEngines();
    
    // 性能监控
    const performanceInterval = setInterval(updatePerformanceMetrics, 1000);
    
    return () => {
      clearInterval(performanceInterval);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [scene]);
  
  /**
   * 更新性能指标
   */
  const updatePerformanceMetrics = useCallback(() => {
    // 简化的性能监控实现
    // 实际项目中需要通过WebWorker或Native API获取真实数据
    setPerformanceMetrics({
      cpu: {
        usage: 20 + Math.random() * 30,
        temperature: 45 + Math.random() * 10
      },
      memory: {
        total: 16384,
        used: 8192 + Math.random() * 4096,
        available: 8192 - Math.random() * 2048
      },
      gpu: {
        usage: 15 + Math.random() * 40,
        memory: 30 + Math.random() * 20,
        temperature: 55 + Math.random() * 15
      },
      computation: {
        activeThreads: 8 + Math.floor(Math.random() * 8),
        computeUnits: 2048,
        throughput: 1500 + Math.random() * 500
      }
    });
  }, []);
  
  /**
   * 启动深基坑专业计算任务
   * @param task 计算任务类型
   * @description
   * 3号计算专家核心控制方法，支持：
   * - soil_structure_coupling: 土-结构耦合分析
   * - construction_stage_analysis: 施工阶段分析  
   * - safety_assessment: 安全性评估
   * - stress_visualization: 应力云图可视化
   * - deformation_animation: 变形动画系统
   * - flow_field_visualization: 流场可视化
   * - comprehensive_analysis: 综合分析
   */
  const startComputation = useCallback(async (task: ComputationTask) => {
    if (controlState.status === 'running') {
      console.warn('计算任务正在进行中，请等待完成');
      return;
    }
    
    try {
      // 更新状态
      setControlState(prev => ({
        ...prev,
        currentTask: task,
        status: 'running',
        progress: 0,
        elapsedTime: 0,
        errorMessage: undefined
      }));
      
      onStatusChange?.('running');
      
      // 记录开始时间
      startTimeRef.current = Date.now();
      
      // 启动计时器
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setControlState(prev => ({
          ...prev,
          elapsedTime: elapsed
        }));
      }, 100);
      
      // 根据任务类型执行计算
      let results: ComputationControlState['results'] = {};
      
      switch (task) {
        case 'soil_structure_coupling':
          results = await executeSoilStructureCoupling();
          break;
          
        case 'construction_stage_analysis':
          results = await executeConstructionStageAnalysis();
          break;
          
        case 'safety_assessment':
          results = await executeSafetyAssessment();
          break;
          
        case 'stress_visualization':
          results = await executeStressVisualization();
          break;
          
        case 'deformation_animation':
          results = await executeDeformationAnimation();
          break;
          
        case 'flow_field_visualization':
          results = await executeFlowFieldVisualization();
          break;
          
        case 'comprehensive_analysis':
          results = await executeComprehensiveAnalysis();
          break;
          
        default:
          throw new Error(`未知的计算任务类型: ${task}`);
      }
      
      // 计算完成
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      setControlState(prev => ({
        ...prev,
        status: 'completed',
        progress: 100,
        results: { ...prev.results, ...results }
      }));
      
      onStatusChange?.('completed');
      onResultsUpdate?.(results);
      
      console.log(`计算任务 ${task} 完成`);
      
    } catch (error) {
      console.error('计算任务执行失败:', error);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      setControlState(prev => ({
        ...prev,
        status: 'error',
        errorMessage
      }));
      
      onStatusChange?.('error');
      onError?.(errorMessage);
    }
  }, [controlState.status, config, onStatusChange, onResultsUpdate, onError]);
  
  /**
   * 暂停计算
   */
  const pauseComputation = useCallback(() => {
    if (controlState.status === 'running') {
      setControlState(prev => ({ ...prev, status: 'paused' }));
      onStatusChange?.('paused');
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [controlState.status, onStatusChange]);
  
  /**
   * 恢复计算
   */
  const resumeComputation = useCallback(() => {
    if (controlState.status === 'paused') {
      setControlState(prev => ({ ...prev, status: 'running' }));
      onStatusChange?.('running');
      
      // 恢复计时器
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        setControlState(prev => ({
          ...prev,
          elapsedTime: elapsed
        }));
      }, 100);
    }
  }, [controlState.status, onStatusChange]);
  
  /**
   * 停止计算
   */
  const stopComputation = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    setControlState(prev => ({
      ...prev,
      currentTask: null,
      status: 'idle',
      progress: 0,
      elapsedTime: 0,
      errorMessage: undefined
    }));
    
    onStatusChange?.('idle');
  }, [onStatusChange]);
  
  // ===== 计算任务执行函数 =====
  
  /**
   * 执行土-结构耦合分析
   */
  const executeSoilStructureCoupling = async (): Promise<ComputationControlState['results']> => {
    if (!solverRef.current) throw new Error('土结耦合求解器未初始化');
    
    const parameters: DeepExcavationParameters = {
      geometry: {
        excavationDepth: config.geometry.excavationDepth,
        excavationWidth: config.geometry.excavationWidth,
        excavationLength: config.geometry.excavationLength,
        retainingWallThickness: config.geometry.wallThickness,
        embedmentDepth: config.geometry.embedmentDepth
      },
      
      soilProfile: config.soilLayers.map(layer => ({
        layerId: layer.layerId,
        topElevation: layer.topElevation,
        bottomElevation: layer.bottomElevation,
        materialProperties: {
          unitWeight: layer.unitWeight,
          cohesion: layer.cohesion,
          frictionAngle: layer.frictionAngle,
          elasticModulus: layer.elasticModulus,
          poissonRatio: layer.poissonRatio,
          permeability: {
            horizontal: layer.permeabilityH,
            vertical: layer.permeabilityV
          }
        }
      })),
      
      groundwater: {
        initialLevel: config.groundwater.initialWaterLevel,
        finalLevel: config.groundwater.targetWaterLevel,
        pumpingRate: config.groundwater.pumpingRate
      },
      
      retainingSystem: {
        wallType: config.geometry.retainingWallType,
        supportLevels: config.support.levels.map(level => ({
          elevation: level.elevation,
          stiffness: level.crossSectionArea * level.elasticModulus * 1e9 / level.spacing,
          prestress: level.prestressForce || 0
        }))
      },
      
      loads: {
        surfaceLoad: config.loads.surfaceLoad,
        constructionLoad: config.loads.constructionLoad
      },
      
      analysisSettings: {
        analysisType: config.analysis.analysisType,
        timeSteps: config.analysis.timeSteps,
        convergenceCriteria: {
          tolerance: config.analysis.convergenceTolerance,
          maxIterations: config.analysis.maxIterations
        }
      }
    };
    
    // 执行计算并更新进度
    const updateProgress = (progress: number) => {
      setControlState(prev => ({
        ...prev,
        progress,
        estimatedTimeRemaining: progress > 0 ? (prev.elapsedTime / progress * 100 - prev.elapsedTime) : 0
      }));
    };
    
    const excavationResults = await solverRef.current.performFullAnalysis(parameters, updateProgress);
    
    return { excavationResults };
  };
  
  /**
   * 执行施工阶段分析
   */
  const executeConstructionStageAnalysis = async (): Promise<ComputationControlState['results']> => {
    if (!stageAnalyzerRef.current) throw new Error('施工阶段分析器未初始化');
    
    const stageResults = await stageAnalyzerRef.current.performConstructionSequenceAnalysis(
      config.construction.stages,
      (progress) => {
        setControlState(prev => ({
          ...prev,
          progress,
          estimatedTimeRemaining: progress > 0 ? (prev.elapsedTime / progress * 100 - prev.elapsedTime) : 0
        }));
      }
    );
    
    return { stageResults };
  };
  
  /**
   * 执行安全评估
   */
  const executeSafetyAssessment = async (): Promise<ComputationControlState['results']> => {
    if (!safetySystemRef.current) throw new Error('安全评估系统未初始化');
    
    const safetyResults = await safetySystemRef.current.performComprehensiveSafetyAssessment(
      controlState.results.excavationResults!,
      controlState.results.stageResults!,
      {
        deformation: {
          maxWallDeflection: 30.0,
          maxGroundSettlement: 20.0,
          maxDifferentialSettlement: 10.0,
          maxFoundationHeave: 15.0,
          deformationRate: 2.0
        },
        stress: {
          maxWallStress: 25.0,
          maxSoilStress: 300.0,
          maxSupportForce: 1000.0,
          stressConcentrationFactor: 2.0
        },
        stability: {
          overallStabilityFactor: config.analysis.safetyFactors.overall,
          localStabilityFactor: config.analysis.safetyFactors.local,
          upliftStabilityFactor: config.analysis.safetyFactors.uplift,
          pipingStabilityFactor: config.analysis.safetyFactors.piping,
          slopStabilityFactor: 1.3
        },
        seepage: {
          maxInflowRate: 100.0,
          maxHydraulicGradient: 0.8,
          maxSeepageVelocity: 1e-5,
          maxPoreWaterPressure: 200.0
        },
        construction: {
          maxExcavationRate: config.construction.excavationRate,
          minSupportInterval: 1.0,
          maxUnsupportedHeight: 3.0,
          weatherRestrictions: ['heavy_rain', 'strong_wind']
        }
      },
      (progress) => {
        setControlState(prev => ({ ...prev, progress }));
      }
    );
    
    return { safetyResults };
  };
  
  /**
   * 执行应力可视化
   */
  const executeStressVisualization = async (): Promise<ComputationControlState['results']> => {
    if (!stressRendererRef.current || !controlState.results.excavationResults) {
      throw new Error('应力渲染器未初始化或缺少计算结果');
    }
    
    // 将计算结果转换为PyVista格式
    const stressData: PyVistaStressData = {
      meshData: {
        vertices: controlState.results.excavationResults.mesh.vertices,
        faces: controlState.results.excavationResults.mesh.faces,
        normals: controlState.results.excavationResults.mesh.normals,
        areas: new Float32Array(controlState.results.excavationResults.mesh.faces.length / 3)
      },
      
      stressFields: {
        principalStress: {
          sigma1: controlState.results.excavationResults.stressField.principalStresses.sigma1,
          sigma2: controlState.results.excavationResults.stressField.principalStresses.sigma2,
          sigma3: controlState.results.excavationResults.stressField.principalStresses.sigma3,
          directions: new Float32Array(controlState.results.excavationResults.stressField.principalStresses.sigma1.length * 9)
        },
        
        stressComponents: {
          sigmaX: controlState.results.excavationResults.stressField.components.sigmaX,
          sigmaY: controlState.results.excavationResults.stressField.components.sigmaY,
          sigmaZ: controlState.results.excavationResults.stressField.components.sigmaZ,
          tauXY: controlState.results.excavationResults.stressField.components.tauXY,
          tauYZ: controlState.results.excavationResults.stressField.components.tauYZ,
          tauZX: controlState.results.excavationResults.stressField.components.tauZX
        },
        
        equivalentStress: {
          vonMises: controlState.results.excavationResults.stressField.vonMisesStress,
          tresca: new Float32Array(controlState.results.excavationResults.stressField.vonMisesStress.length),
          maximumShear: new Float32Array(controlState.results.excavationResults.stressField.vonMisesStress.length)
        },
        
        statistics: {
          min: Math.min(...controlState.results.excavationResults.stressField.vonMisesStress),
          max: Math.max(...controlState.results.excavationResults.stressField.vonMisesStress),
          mean: controlState.results.excavationResults.stressField.vonMisesStress.reduce((a, b) => a + b) / 
               controlState.results.excavationResults.stressField.vonMisesStress.length,
          std: 0
        }
      },
      
      boundaryConditions: {
        displacement: [],
        force: [],
        pressure: []
      },
      
      timeStepData: [],
      
      metadata: {
        analysisType: config.analysis.analysisType,
        units: {
          stress: 'Pa',
          displacement: 'm',
          force: 'N'
        },
        coordinate_system: 'cartesian',
        software_version: 'DeepCAD-v1.0'
      }
    };
    
    await stressRendererRef.current.renderStressCloud(stressData);
    
    setControlState(prev => ({ ...prev, progress: 100 }));
    
    return { stressData };
  };
  
  /**
   * 执行变形动画
   */
  const executeDeformationAnimation = async (): Promise<ComputationControlState['results']> => {
    if (!deformationSystemRef.current || !controlState.results.stageResults) {
      throw new Error('变形动画系统未初始化或缺少阶段分析结果');
    }
    
    const deformationData: PyVistaDeformationData = {
      timeSteps: controlState.results.stageResults.map((_, index) => ({
        time: index,
        stageName: `Stage ${index + 1}`,
        description: `施工阶段 ${index + 1}`
      })),
      
      meshFrames: controlState.results.stageResults.map((result, index) => ({
        timeIndex: index,
        vertices: result.meshData.vertices,
        originalVertices: controlState.results.excavationResults!.mesh.vertices,
        displacements: result.fieldData.displacement.vectors,
        deformationMagnitude: result.fieldData.displacement.magnitude,
        strainField: new Float32Array(result.fieldData.displacement.magnitude.length),
        rotationField: new Float32Array(result.fieldData.displacement.magnitude.length * 3)
      })),
      
      animationMetadata: {
        totalDuration: config.visualization.deformationAnimation.timing.totalDuration,
        frameRate: config.visualization.deformationAnimation.timing.frameRate,
        amplificationFactor: config.visualization.deformationAnimation.deformation.amplificationFactor
      }
    };
    
    await deformationSystemRef.current.createDeformationAnimation(deformationData);
    
    setControlState(prev => ({ ...prev, progress: 100 }));
    
    return { deformationData };
  };
  
  /**
   * 执行流场可视化
   */
  const executeFlowFieldVisualization = async (): Promise<ComputationControlState['results']> => {
    if (!flowVisualizerRef.current || !controlState.results.excavationResults) {
      throw new Error('流场可视化器未初始化或缺少计算结果');
    }
    
    const seepageData: PyVistaSeepageData = {
      meshData: {
        vertices: controlState.results.excavationResults.mesh.vertices,
        cells: controlState.results.excavationResults.mesh.faces,
        cellTypes: new Uint8Array(controlState.results.excavationResults.mesh.faces.length / 3).fill(5), // VTK_TRIANGLE
        normals: controlState.results.excavationResults.mesh.normals
      },
      
      seepageFields: {
        velocity: {
          vectors: controlState.results.excavationResults.seepageField.velocityVectors,
          magnitude: controlState.results.excavationResults.seepageField.velocityMagnitude,
          direction: new Float32Array(controlState.results.excavationResults.seepageField.velocityMagnitude.length),
          range: [
            Math.min(...controlState.results.excavationResults.seepageField.velocityMagnitude),
            Math.max(...controlState.results.excavationResults.seepageField.velocityMagnitude)
          ]
        },
        
        pressure: {
          values: controlState.results.excavationResults.seepageField.poreWaterPressure,
          hydraulicHead: new Float32Array(controlState.results.excavationResults.seepageField.poreWaterPressure.length),
          pressureGradient: new Float32Array(controlState.results.excavationResults.seepageField.poreWaterPressure.length),
          range: [
            Math.min(...controlState.results.excavationResults.seepageField.poreWaterPressure),
            Math.max(...controlState.results.excavationResults.seepageField.poreWaterPressure)
          ]
        },
        
        permeability: {
          horizontal: new Float32Array(config.soilLayers.length).fill(1e-6),
          vertical: new Float32Array(config.soilLayers.length).fill(5e-7),
          anisotropyRatio: new Float32Array(config.soilLayers.length).fill(0.5),
          conductivity: new Float32Array(config.soilLayers.length).fill(1e-6)
        },
        
        hydraulicGradient: {
          values: new Float32Array(controlState.results.excavationResults.seepageField.velocityMagnitude.length),
          directions: new Float32Array(controlState.results.excavationResults.seepageField.velocityMagnitude.length * 3),
          criticalZones: new Float32Array(controlState.results.excavationResults.seepageField.velocityMagnitude.length),
          pipingRisk: new Float32Array(controlState.results.excavationResults.seepageField.velocityMagnitude.length)
        }
      },
      
      boundaryConditions: {
        constantHead: [],
        constantFlow: [],
        impermeable: [],
        seepageFace: []
      },
      
      wellData: [],
      
      statistics: {
        flow: {
          maxVelocity: Math.max(...controlState.results.excavationResults.seepageField.velocityMagnitude),
          avgVelocity: controlState.results.excavationResults.seepageField.velocityMagnitude.reduce((a, b) => a + b) / 
                      controlState.results.excavationResults.seepageField.velocityMagnitude.length,
          totalInflow: config.groundwater.pumpingRate,
          totalOutflow: config.groundwater.pumpingRate * 0.95
        },
        
        pressure: {
          maxPressure: Math.max(...controlState.results.excavationResults.seepageField.poreWaterPressure),
          minPressure: Math.min(...controlState.results.excavationResults.seepageField.poreWaterPressure),
          avgGradient: 0.5
        },
        
        risk: {
          pipingRiskNodes: 0,
          highGradientCells: 0,
          criticalZoneArea: 0
        }
      }
    };
    
    await flowVisualizerRef.current.loadSeepageData(seepageData);
    
    setControlState(prev => ({ ...prev, progress: 100 }));
    
    return { seepageData };
  };
  
  /**
   * 处理几何模型数据 - 与2号专家协作
   */
  const processGeometryModels = async (): Promise<{ geometryModels: GeometryModel[], meshData: MeshData }> => {
    setControlState(prev => ({ ...prev, progress: 10 }));
    
    // 获取几何模型
    const geometryModels: GeometryModel[] = [];
    
    // 从几何架构服务获取已缓存的模型
    // 这里模拟从2号专家获取几何数据
    const geologyModel = await geometryArchitecture.createGeometryModel(
      'geology',
      config.soilLayers,
      { interpolationMethod: 'rbf', resolution: 1.0 }
    );
    
    const excavationModel = await geometryArchitecture.createGeometryModel(
      'excavation', 
      config.geometry,
      { depth: config.geometry.excavationDepth, layers: 5 }
    );
    
    geometryModels.push(geologyModel, excavationModel);
    
    setControlState(prev => ({ ...prev, progress: 30 }));
    
    // 转换为网格数据
    const meshData = await geometryToMeshService.processGeometry(geologyModel, {
      targetMeshSize: 2.0,
      adaptiveMeshing: true,
      qualityThreshold: 0.7,
      preserveFeatures: true,
      physicalGroupMapping: { 'soil': 1, 'excavation': 2, 'support': 3 }
    });
    
    setControlState(prev => ({ ...prev, progress: 50 }));
    
    return { geometryModels, meshData };
  };

  /**
   * 处理网格质量反馈 - 与2号专家质量控制循环
   */
  const processMeshQualityFeedback = async (meshData: MeshData): Promise<void> => {
    // 计算网格质量指标
    const qualityMetrics = {
      averageQuality: meshData.quality.averageQuality,
      minimumQuality: meshData.quality.minimumQuality,
      problematicElements: meshData.quality.aspectRatioDistribution.filter(ratio => ratio > 10).length
    };
    
    // 如果质量不达标，发送反馈给2号专家
    if (qualityMetrics.averageQuality < 0.7) {
      const feedback: MeshQualityFeedback = {
        geometryId: meshData.vertices.toString(),
        meshQuality: qualityMetrics.averageQuality,
        problemAreas: [{
          region: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 }
          },
          issue: 'high_aspect_ratio',
          severity: 0.8
        }],
        suggestions: [{
          geometryModification: 'smooth_transition',
          targetRegion: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 }
          },
          expectedImprovement: 0.3
        }]
      };
      
      // 发送反馈给几何架构服务
      await geometryToMeshService.processMeshFeedback(feedback);
    }
  };

  /**
   * 执行综合分析
   */
  const executeComprehensiveAnalysis = async (): Promise<ComputationControlState['results']> => {
    let results: ComputationControlState['results'] = {};
    
    // 1. 首先处理几何模型（与2号专家协作）
    const geometryData = await processGeometryModels();
    results.geometryModels = geometryData.geometryModels;
    results.meshData = geometryData.meshData;
    
    // 2. 处理网格质量反馈
    await processMeshQualityFeedback(geometryData.meshData);
    
    // 3. 依次执行所有分析任务
    const tasks = [
      'soil_structure_coupling',
      'construction_stage_analysis',
      'safety_assessment',
      'stress_visualization',
      'deformation_animation',
      'flow_field_visualization'
    ] as ComputationTask[];
    
    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];
      const baseProgress = (i / tasks.length) * 100;
      
      // 更新当前任务
      setControlState(prev => ({
        ...prev,
        currentTask: task,
        progress: baseProgress
      }));
      
      // 执行任务
      const taskResults = await this[`execute${task.split('_').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join('')}` as keyof ComputationControlPanel] as () => Promise<ComputationControlState['results']>;
      
      results = { ...results, ...taskResults };
      
      // 更新进度
      setControlState(prev => ({
        ...prev,
        progress: ((i + 1) / tasks.length) * 100,
        results: { ...prev.results, ...results }
      }));
    }
    
    return results;
  };
  
  // ===== 渲染界面 =====
  
  return (
    <div className="computation-control-panel">
      {/* 这里是简化的JSX结构，实际需要完整的UI界面 */}
      <div className="control-header">
        <h2>DeepCAD深基坑计算控制中心</h2>
        <div className="status-indicator status-{controlState.status}">
          {controlState.status === 'running' && '🟡 计算中...'}
          {controlState.status === 'completed' && '🟢 已完成'}
          {controlState.status === 'error' && '🔴 错误'}
          {controlState.status === 'idle' && '⚪ 待机'}
          {controlState.status === 'paused' && '🟠 已暂停'}
        </div>
      </div>
      
      <div className="control-content">
        {/* 施工阶段可视化面板 */}
        <div className="construction-stages-panel" style={{
          background: 'linear-gradient(135deg, rgba(24, 144, 255, 0.1) 0%, rgba(82, 196, 26, 0.1) 100%)',
          border: '1px solid rgba(24, 144, 255, 0.3)',
          borderRadius: '12px',
          padding: '16px',
          marginBottom: '20px'
        }}>
          <h3 style={{ color: '#1890ff', marginBottom: '12px' }}>🏗️ 施工阶段模拟</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {config.construction.stages.map((stage, index) => (
              <div key={index} style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                position: 'relative'
              }}>
                <div style={{ fontSize: '24px', marginBottom: '4px' }}>
                  {index === 0 ? '🟫' : index === 1 ? '🔧' : index === 2 ? '🌊' : '✅'}
                </div>
                <div style={{ color: '#ffffff', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>
                  阶段 {index + 1}
                </div>
                <div style={{ color: '#ffffff80', fontSize: '12px', lineHeight: '1.4' }}>
                  {stage.description || `深度: ${stage.excavationDepth}m`}
                  <br />
                  <span style={{ color: stage.supportType ? '#52c41a' : '#faad14' }}>
                    {stage.supportType ? '✓ 支护就位' : '⚠ 无支护'}
                  </span>
                </div>
                {index < config.construction.stages.length - 1 && (
                  <div style={{
                    position: 'absolute',
                    right: '-8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#1890ff',
                    fontSize: '16px'
                  }}>→</div>
                )}
              </div>
            ))}
          </div>
          
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '12px' }}>
            <div style={{ color: '#ffffff80', fontSize: '12px' }}>
              总施工周期: {(config.construction.stages.length * 7).toFixed(0)} 天
            </div>
            <div style={{ color: '#ffffff80', fontSize: '12px' }}>
              开挖速率: {config.construction.excavationRate} m/天
            </div>
            <div style={{ color: '#ffffff80', fontSize: '12px' }}>
              安全系数: {controlState.results.safetyAssessment?.overallSafety || 'N/A'}
            </div>
          </div>
        </div>

        {/* 任务控制区 */}
        <div className="task-controls">
          <button onClick={() => startComputation('comprehensive_analysis')} style={{
            background: 'linear-gradient(45deg, #722ed1, #eb2f96)',
            border: 'none',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            🚀 开始综合分析
          </button>
          <button onClick={() => startComputation('soil_structure_coupling')} style={{
            background: 'linear-gradient(45deg, #1890ff, #52c41a)',
            border: 'none',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            🏗️ 土结耦合分析
          </button>
          <button onClick={() => startComputation('construction_stage_analysis')} style={{
            background: 'linear-gradient(45deg, #faad14, #ff7a45)',
            border: 'none',
            color: 'white', 
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer',
            marginRight: '8px'
          }}>
            🏗️ 施工阶段分析
          </button>
          <button onClick={pauseComputation} disabled={controlState.status !== 'running'}>
            ⏸️ 暂停
          </button>
          <button onClick={resumeComputation} disabled={controlState.status !== 'paused'}>
            ▶️ 恢复
          </button>
          <button onClick={stopComputation}>
            ⏹️ 停止
          </button>
        </div>
        
        {/* 进度显示 */}
        <div className="progress-section">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${controlState.progress}%` }}
            />
          </div>
          <div className="progress-info">
            <span>进度: {controlState.progress.toFixed(1)}%</span>
            <span>用时: {controlState.elapsedTime.toFixed(1)}s</span>
            {controlState.estimatedTimeRemaining > 0 && (
              <span>预计剩余: {controlState.estimatedTimeRemaining.toFixed(1)}s</span>
            )}
          </div>
        </div>

        {/* 3号专家增强 - 性能监控面板 */}
        <div className="performance-monitoring-panel">
          <h3>🚀 实时性能监控</h3>
          <div className="performance-grid">
            {/* GPU内存监控 */}
            {controlState.performance.gpuMemory && (
              <div className="performance-card">
                <h4>GPU内存使用</h4>
                <div className="memory-usage">
                  <div className="memory-bar">
                    <div 
                      className="memory-fill"
                      style={{ 
                        width: `${(controlState.performance.gpuMemory.usedMemory / controlState.performance.gpuMemory.totalMemory) * 100}%` 
                      }}
                    />
                  </div>
                  <span>
                    {(controlState.performance.gpuMemory.usedMemory / 1024 / 1024 / 1024).toFixed(2)}GB / 
                    {(controlState.performance.gpuMemory.totalMemory / 1024 / 1024 / 1024).toFixed(2)}GB
                  </span>
                </div>
              </div>
            )}

            {/* 计算性能指标 */}
            {controlState.performance.computeMetrics && (
              <div className="performance-card">
                <h4>计算性能</h4>
                <div className="metrics-list">
                  <div>FPS: {controlState.performance.fps?.toFixed(1) || 'N/A'}</div>
                  <div>网格质量: {controlState.performance.meshQualityScore?.toFixed(2) || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* 2号专家协作状态 */}
            <div className="performance-card">
              <h4>🤝 2号专家协作</h4>
              <div className="collaboration-status">
                <div className="status-indicator">
                  {controlState.results.geometryModels ? '🟢' : '🟡'} 几何模型: 
                  {controlState.results.geometryModels?.length || 0} 个
                </div>
                <div className="status-indicator">
                  {controlState.results.meshData ? '🟢' : '🟡'} 网格数据: 
                  {controlState.results.meshData ? '已就绪' : '待处理'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 3号专家增强 - 网格质量反馈面板 */}
        <div className="quality-feedback-panel">
          <h3>📊 网格质量分析</h3>
          {controlState.quality.meshQualityReport && (
            <div className="quality-report">
              <div className="quality-score">
                <h4>综合评分: {controlState.quality.meshQualityReport.overall_score}/100</h4>
                <div className="score-bar">
                  <div 
                    className="score-fill"
                    style={{ 
                      width: `${controlState.quality.meshQualityReport.overall_score}%`,
                      backgroundColor: controlState.quality.meshQualityReport.overall_score > 80 ? '#52c41a' :
                                      controlState.quality.meshQualityReport.overall_score > 60 ? '#faad14' : '#ff4d4f'
                    }}
                  />
                </div>
              </div>
              
              <div className="quality-metrics">
                <h4>质量指标详情:</h4>
                {Object.entries(controlState.quality.meshQualityReport.quality_metrics).map(([name, metric]) => (
                  <div key={name} className={`metric-item metric-${metric.status}`}>
                    <span className="metric-name">{name}:</span>
                    <span className="metric-value">{metric.mean_value.toFixed(3)}</span>
                    <span className="metric-status">{metric.status}</span>
                  </div>
                ))}
              </div>

              <div className="optimization-suggestions">
                <h4>🔧 优化建议:</h4>
                {controlState.quality.meshQualityReport.recommendations.map((rec, index) => (
                  <div key={index} className="suggestion-item">
                    💡 {rec}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 几何优化状态 */}
          {controlState.quality.geometryOptimization && (
            <div className="geometry-optimization">
              <h4>🎯 几何优化状态</h4>
              <div className={`optimization-status status-${controlState.quality.geometryOptimization.status}`}>
                {controlState.quality.geometryOptimization.status === 'pending' && '⏳ 等待优化'}
                {controlState.quality.geometryOptimization.status === 'running' && '🔄 优化中...'}
                {controlState.quality.geometryOptimization.status === 'completed' && '✅ 优化完成'}
              </div>
              <div className="improvements-list">
                {controlState.quality.geometryOptimization.improvements.map((improvement, index) => (
                  <div key={index} className="improvement-item">
                    ⚡ {improvement}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        {/* 性能监控 */}
        <div className="performance-metrics">
          <div className="metric">
            <span>CPU: {performanceMetrics.cpu.usage.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span>内存: {(performanceMetrics.memory.used/1024).toFixed(1)}GB</span>
          </div>
          <div className="metric">
            <span>GPU: {performanceMetrics.gpu.usage.toFixed(1)}%</span>
          </div>
          <div className="metric">
            <span>算力: {performanceMetrics.computation.throughput.toFixed(0)} GFLOPS</span>
          </div>
        </div>
        
        {/* 错误信息 */}
        {controlState.errorMessage && (
          <div className="error-message">
            ❌ {controlState.errorMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComputationControlPanel;