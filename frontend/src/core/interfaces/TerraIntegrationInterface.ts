/**
 * Terra集成接口
 * DeepCAD Deep Excavation CAE Platform - Terra Integration Interface
 * 
 * 作者：2号几何专家
 * 面向：3号计算专家
 * 功能：地连墙偏移功能与Terra求解器的数据传递标准
 */

import * as THREE from 'three';
import { PileType, PileModelingStrategy } from '../types/PileModelingInterfaces';

// ==================== 地连墙偏移数据传递 ====================

/**
 * 偏移元素数据 - 2号几何 → 3号计算
 */
export interface OffsetElementData {
  elementId: string;
  elementType: 'SHELL' | 'BEAM' | 'SOLID';
  hasOffset: boolean;
  offsetInfo?: {
    offsetDistance: number;           // 偏移距离 (m)
    offsetDirection: 'inward' | 'outward' | 'normal';
    originalNodePositions: number[][]; // 原始节点位置
    offsetNodePositions: number[][];   // 偏移后节点位置
    offsetVectors: number[][];         // 偏移向量
    qualityMetrics: {
      minJacobian: number;
      maxAspectRatio: number;
      qualityScore: number;            // 0-100分
    };
  };
}

/**
 * 边界条件映射数据 - 给3号专家用于偏移后边界条件处理
 */
export interface BoundaryConditionMapping {
  originalBoundaryId: string;
  offsetBoundaryId: string;
  mappingType: 'DIRECT' | 'INTERPOLATED' | 'PROJECTED';
  originalNodes: string[];
  offsetNodes: string[];
  transformationMatrix?: number[][]; // 4x4变换矩阵
  mappingAccuracy: number;          // 映射精度 0-1
}

/**
 * Terra偏移处理指令 - 2号几何 → 3号计算
 */
export interface TerraOffsetInstruction {
  instructionId: string;
  timestamp: string;
  
  // 偏移元素信息
  offsetElements: OffsetElementData[];
  
  // 边界条件映射
  boundaryMappings: BoundaryConditionMapping[];
  
  // 求解器配置建议
  solverRecommendations: {
    enableShellOffsetSupport: boolean;
    recommendedIntegrationScheme: 'GAUSS' | 'REDUCED' | 'SELECTIVE';
    recommendedTimeStep?: number;
    convergenceCriteria?: {
      displacementTolerance: number;
      residualTolerance: number;
      maxIterations: number;
    };
  };
  
  // 质量检查要求
  qualityRequirements: {
    minElementQuality: number;
    maxAspectRatio: number;
    requirePositiveJacobian: boolean;
  };
}

/**
 * Terra处理状态反馈 - 3号计算 → 2号几何
 */
export interface TerraProcessingFeedback {
  instructionId: string;
  status: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  timestamp: string;
  
  // 处理进度
  progress: {
    totalElements: number;
    processedElements: number;
    offsetElementsProcessed: number;
    boundaryMappingsApplied: number;
  };
  
  // 质量验证结果
  qualityValidation: {
    passed: boolean;
    elementQualityResults: ElementQualityResult[];
    overallQualityScore: number;
  };
  
  // 性能指标
  performanceMetrics: {
    processingTimeMs: number;
    memoryUsageMB: number;
    cpuUsagePercent: number;
    convergenceAchieved: boolean;
    iterationsRequired?: number;
  };
  
  // 问题和警告
  issues: ProcessingIssue[];
}

interface ElementQualityResult {
  elementId: string;
  jacobianMin: number;
  aspectRatio: number;
  qualityScore: number;
  passed: boolean;
  issues: string[];
}

interface ProcessingIssue {
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  category: 'GEOMETRY' | 'BOUNDARY_CONDITIONS' | 'SOLVER' | 'PERFORMANCE';
  elementId?: string;
  message: string;
  suggestedFix?: string;
}

// ==================== 桩基建模数据传递 ====================

/**
 * 桩基FEM数据 - 2号几何 → 3号计算
 */
export interface PileFEMData {
  pileId: string;
  pileType: PileType;
  modelingStrategy: PileModelingStrategy;
  
  // FEM元素数据
  elements: {
    beamElements?: TerraBeamElement[];
    shellElements?: TerraShellElement[];
    solidElements?: TerraSolidElement[];
  };
  
  // 挤密区数据
  compactionZone?: {
    zoneId: string;
    affectedElements: string[];
    materialModifications: CompactionMaterial;
    specialProcessingRequired: boolean;
  };
  
  // 接触界面数据
  contactInterfaces?: TerraContactInterface[];
}

interface TerraBeamElement {
  id: string;
  nodeIds: [string, string];
  material: string;
  crossSection: {
    area: number;
    momentOfInertiaY: number;
    momentOfInertiaZ: number;
    torsionalConstant: number;
  };
  localAxes: number[][]; // 3x3局部坐标系矩阵
}

interface TerraShellElement {
  id: string;
  nodeIds: string[];
  material: string;
  thickness: number;
  integrationPoints: number;
  isCompactionPile?: boolean;
}

interface TerraSolidElement {
  id: string;
  nodeIds: string[];
  material: string;
  integrationRule: 'gauss_8_point' | 'gauss_27_point';
  isCompactionZone?: boolean;
}

interface CompactionMaterial {
  originalMaterialId: string;
  modifiedMaterialId: string;
  compactionFactors: {
    elasticModulusRatio: number;
    densityRatio: number;
    cohesionIncrease: number;
    frictionAngleIncrease: number;
  };
}

interface TerraContactInterface {
  id: string;
  masterSurface: string[];  // 节点ID列表
  slaveSurface: string[];   // 节点ID列表
  contactType: 'PILE_SOIL' | 'COMPACTION_ZONE';
  frictionCoefficient: number;
  contactStiffness: number;
}

// ==================== 综合数据传递 ====================

/**
 * 完整的Terra数据包 - 2号几何 → 3号计算
 */
export interface TerraDataPackage {
  packageId: string;
  timestamp: string;
  version: string;
  
  // 基本几何数据
  nodes: TerraNode[];
  materials: TerraMaterial[];
  
  // 地连墙偏移数据
  offsetInstructions?: TerraOffsetInstruction;
  
  // 桩基建模数据
  pileData?: PileFEMData[];
  
  // 求解器配置
  solverConfiguration: TerraSolverConfig;
  
  // 验证要求
  validationRequirements: ValidationRequirements;
}

interface TerraNode {
  id: string;
  coordinates: [number, number, number];
  constraints?: {
    fixedX?: boolean;
    fixedY?: boolean;
    fixedZ?: boolean;
    fixedRotX?: boolean;
    fixedRotY?: boolean;
    fixedRotZ?: boolean;
  };
  offsetInfo?: {
    isOffset: boolean;
    originalPosition: [number, number, number];
    offsetVector: [number, number, number];
  };
}

interface TerraMaterial {
  id: string;
  type: 'CONCRETE' | 'SOIL' | 'COMPACTED_SOIL' | 'STEEL';
  properties: {
    elasticModulus: number;
    poissonRatio: number;
    density: number;
    yieldStrength?: number;
    [key: string]: any;
  };
  compactionInfo?: {
    isCompacted: boolean;
    originalMaterialId: string;
    compactionFactors: CompactionMaterial['compactionFactors'];
  };
}

interface TerraSolverConfig {
  solverType: 'TERRA_STRUCTURAL' | 'TERRA_CONTACT' | 'TERRA_MULTIPHYSICS';
  analysisType: 'STATIC' | 'DYNAMIC' | 'EIGENVALUE';
  
  // 求解器参数
  convergenceCriteria: {
    solutionRelativeTolerance: number;
    solutionAbsoluteTolerance: number;
    residualRelativeTolerance: number;
    residualAbsoluteTolerance: number;
    maxIterations: number;
  };
  
  // 特殊处理标志
  enableOffsetShellSupport: boolean;
  enableCompactionZoneProcessing: boolean;
  enableContactProcessing: boolean;
  
  // 性能设置
  parallelization: {
    enableOMP: boolean;
    numThreads: number;
    enableMPI?: boolean;
  };
}

interface ValidationRequirements {
  geometryValidation: {
    checkElementQuality: boolean;
    minJacobian: number;
    maxAspectRatio: number;
  };
  
  offsetValidation: {
    checkOffsetAccuracy: boolean;
    maxOffsetError: number; // mm
    validateBoundaryMapping: boolean;
  };
  
  pileValidation: {
    validateCompactionZones: boolean;
    checkContactInterfaces: boolean;
    validateMaterialTransitions: boolean;
  };
  
  performanceRequirements: {
    maxProcessingTime: number; // seconds
    maxMemoryUsage: number;    // MB
    targetAccuracy: number;    // 0-1
  };
}

// ==================== 响应数据接口 ====================

/**
 * Terra完整处理结果 - 3号计算 → 2号几何
 */
export interface TerraProcessingResult {
  packageId: string;
  timestamp: string;
  processingStatus: 'SUCCESS' | 'PARTIAL_SUCCESS' | 'FAILURE';
  
  // 处理统计
  processingStatistics: {
    totalProcessingTime: number;
    elementProcessingTimes: { [elementId: string]: number };
    memoryPeakUsage: number;
    cpuAverageUsage: number;
  };
  
  // 验证结果
  validationResults: {
    geometryValidation: ValidationResult;
    offsetValidation: ValidationResult;
    pileValidation: ValidationResult;
    overallValidation: ValidationResult;
  };
  
  // 求解器反馈
  solverFeedback: {
    convergenceAchieved: boolean;
    finalResidual: number;
    iterationsUsed: number;
    solverRecommendations: string[];
  };
  
  // 问题报告
  issueReport: {
    criticalIssues: ProcessingIssue[];
    warnings: ProcessingIssue[];
    informationalMessages: ProcessingIssue[];
  };
}

interface ValidationResult {
  passed: boolean;
  score: number; // 0-100
  details: { [key: string]: any };
  issues: string[];
}

// ==================== 工具函数类型 ====================

/**
 * 数据转换工具类型
 */
export type GeometryToTerraConverter = {
  convertOffsetGeometry: (offsetResult: any) => OffsetElementData[];
  convertPileGeometry: (pileEntities: any[]) => PileFEMData[];
  validateDataPackage: (dataPackage: TerraDataPackage) => ValidationResult;
};

/**
 * 性能监控工具类型
 */
export type PerformanceMonitor = {
  startMonitoring: (operationType: string) => void;
  recordMetric: (metricName: string, value: number) => void;
  getReport: () => PerformanceReport;
};

interface PerformanceReport {
  operationType: string;
  startTime: number;
  endTime: number;
  duration: number;
  peakMemory: number;
  averageCPU: number;
  customMetrics: { [key: string]: number };
}

// ==================== 常量定义 ====================

/**
 * Terra集成常量
 */
export const TERRA_INTEGRATION_CONSTANTS = {
  // 默认质量要求
  DEFAULT_QUALITY_REQUIREMENTS: {
    minJacobian: 0.1,
    maxAspectRatio: 10.0,
    minQualityScore: 70
  },
  
  // 默认偏移参数
  DEFAULT_OFFSET_SETTINGS: {
    defaultDistance: -0.1, // 10cm往里偏移
    qualityTolerance: 0.01, // 1mm精度
    maxProcessingTime: 5000 // 5秒超时
  },
  
  // 性能阈值
  PERFORMANCE_THRESHOLDS: {
    maxElementProcessingTime: 100, // ms per element
    maxTotalProcessingTime: 30000, // 30秒总时间
    maxMemoryUsage: 2048, // 2GB
    targetAccuracy: 0.99 // 99%准确度
  }
} as const;

export default TerraDataPackage;