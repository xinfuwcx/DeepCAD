/**
 * DeepCAD服务层统一导出
 * 0号架构师 - 整理和优化所有组件的导入关系
 * 提供统一的服务导入入口，避免循环依赖和重复定义
 */

// ============== 基础类型 ==============
export type { Point3D, BoundingBox } from '../types/ExpertCollaboration';

// ============== 几何架构服务 ==============
export { 
  geometryArchitecture,
  type GeometryModel,
  type ModelMetadata,
  type QualityMetrics,
  type MeshQualityFeedback,
  type GeometryAdjustment,
  type QualityIssue,
  type QualitySuggestion
} from './GeometryArchitectureService';

// ============== 几何到网格服务 ==============
export { 
  default as geometryToMeshService,
  type MeshData,
  type BoundaryCondition,
  type PhysicalGroup,
  type MeshQualityMetrics,
  type MeshQualityConfig,
  type GeometryToMeshConfig
} from './geometryToMeshService';

// === 核心桩基建模服务 ===
export {
  PileType,
  PileModelingStrategy,
  SoilTreatmentType,
  LoadMechanism,
  ConstructionMethod
} from './PileModelingStrategy';

// === Kratos数据转换服务 ===
export {
  type KratosGeometryData,
  type KratosMaterialData,
  type KratosBoundaryCondition,
  type KratosModelData,
  type MeshQualityMetrics,
  type QualityStandards,
  KratosElementType,
  KratosElementConverter,
  MeshQualityCalculator,
  kratosConverter
} from './KratosDataConverter';

// === 几何算法集成服务 ===
export {
  type GeometryQualityReport,
  type CADGeometry,
  type OptimizationResult,
  type GeometryOptimizationOptions,
  GeometryAlgorithmIntegration,
  geometryAlgorithmIntegration
} from './GeometryAlgorithmIntegration';

// === PyVista集成服务 ===
// PyVista 集成统一导出（提供函数别名及相关类、类型）
export {
  PyVistaIntegrationService,
  getPyVistaIntegrationService,
  PyVistaDataAPI,
  PyVistaRealtimeStream,
  PyVistaToThreeConverter,
  type PyVistaVisualizationData,
  type PyVistaConfig
} from './PyVistaIntegrationService';

// === 数据接口服务 ===
export {
  type PileCalculationData,
  PileType as PileDataPileType,
  PileModelingStrategy as PileDataModelingStrategy
} from './pileModelingDataInterface';

export { 
  type PileCalculationResult,
  EnhancedPileCalculationService
} from './enhancedPileCalculationService';

export {
  type FEMDataTransfer,
  type ValidationResult,
  femDataTransferService
} from './femDataTransferService';

// === 3号计算专家服务 ===
// 多物理场耦合求解器
export {
  MultiphysicsSolver,
  createSeepageStressSolver,
  type SeepageStressCouplingParams,
  type MultiphysicsSolverConfig,
  type CouplingState
} from './multiphysicsSolver';

// 智能网格自适应算法
export {
  AdaptiveMeshAlgorithm,
  createAdaptiveMeshAlgorithm,
  type AdaptiveMeshConfig,
  type MeshNode,
  type MeshElement,
  type ErrorEstimator,
  type AdaptationResult
} from './adaptiveMeshAlgorithm';

// 集成多物理场系统
export {
  IntegratedMultiphysicsSystem,
  createIntegratedMultiphysicsSystem,
  type IntegratedSolverConfig,
  type IntegratedSolution
} from './adaptiveMeshIntegration';

// 高级后处理和可视化
export {
  AdvancedPostprocessor,
  createAdvancedPostprocessor,
  type PostprocessingConfig,
  type VisualizationData,
  type ContourOptions,
  type VectorOptions,
  type StreamlineOptions
} from './advancedPostprocessing';

// GPU加速计算
export {
  GPUAccelerationEngine,
  createGPUAcceleration,
  createGPUAcceleratedPostprocessor,
  type GPUAccelerationConfig,
  type GPUComputeTask,
  type GPUComputeResult,
  type GPUStatus
} from './gpuAcceleration';

// GPU增强后处理
export {
  GPUEnhancedPostprocessor,
  createGPUEnhancedPostprocessor,
  type GPUEnhancedPostprocessingConfig,
  type GPUPerformanceMetrics
} from './gpuIntegration';

// 大数据处理优化
export {
  BigDataProcessor,
  createBigDataProcessor,
  processLargeDataset,
  type BigDataConfig,
  type DataChunk,
  type BigDataStats,
  type SpatialIndex
} from './bigDataOptimization';

// === 2号专家RBF三维重建服务 ===
export {
  RBF3DReconstructionService
} from './RBF3DReconstructionService';

// === 3号专家物理AI模块系统 ===
export {
  PhysicsAIService,
  type MultiModalPhysicsAI,
  type MultiModalAIResult,
  type PINNConfig,
  type PINNResult,
  type DeepONetConfig,
  type DeepONetResult,
  type GNNConfig,
  type GNNResult,
  type TERRAOptimizationConfig,
  type TERRAOptimizationResult
} from './PhysicsAIModuleInterface';