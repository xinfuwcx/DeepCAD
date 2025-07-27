/**
 * 3号计算专家 - 组件统一导出
 * 为0号架构师提供便捷的组件导入接口
 */

// ======================== 主要组件导出 ========================

// 计算控制面板 - 主要计算界面
export { default as ComputationControlPanel } from './ComputationControlPanel';
export type { 
  ComputationStatus,
  ComputationTask 
} from './ComputationControlPanel';

// 物理AI嵌入式面板 - 简化版
export { default as PhysicsAIEmbeddedPanel } from './PhysicsAIEmbeddedPanel_SIMPLIFIED';

// ======================== 集成接口导出 ========================

// 主要集成接口
export {
  ComputationModuleIntegration,
  createComputationModule,
  getAvailableComputationTasks,
  validateComputationConfig
} from './ComputationIntegrationInterface';

export type {
  ComputationModuleConfig,
  ComputationModuleState
} from './ComputationIntegrationInterface';

// ======================== 服务导出 ========================

// 几何协作服务
export { geometryArchitecture } from '../services/GeometryArchitectureService';
export { default as geometryToMeshService } from '../services/geometryToMeshService';

// 计算服务
export { default as meshQualityService } from '../services/meshQualityService';

// ======================== 类型定义导出 ========================

// 几何建模相关类型
export type {
  GeometryModel,
  MeshQualityFeedback,
  MeshData,
  GeometryToMeshData
} from '../services/GeometryArchitectureService';

// 网格质量相关类型
export type {
  QualityMetric,
  MeshQualityReport,
  QualityAnalysisRequest,
  QualityAnalysisResponse
} from '../services/meshQualityService';

// 性能监控相关类型
export type {
  WebGPUDeviceInfo,
  GPUMemoryStats,
  ComputePerformanceMetrics
} from '../services/webgpuPerformanceMonitor';

// ======================== 便捷常量导出 ========================

/**
 * 3号专家模块信息
 */
export const COMPUTATION_MODULE_INFO = {
  expertId: 3,
  expertName: '计算专家',
  version: '1.0.0',
  capabilities: [
    'deep_excavation_analysis',
    'soil_structure_coupling',
    'gpu_visualization',
    'mesh_quality_analysis',
    'performance_monitoring',
    'geometry_collaboration'
  ],
  supportedFormats: [
    'terra_simulation',
    'pyvista_data',
    'kratos_solver',
    'webgpu_render'
  ]
};

/**
 * 默认配置常量
 */
export const DEFAULT_COMPUTATION_CONFIG = {
  performance: {
    enableGPUMonitoring: true,
    enableQualityFeedback: true,
    maxComputeUnits: 64,
    memoryLimit: 4096
  },
  
  geometryCollaboration: {
    enableAutoGeometryImport: true,
    enableQualityFeedback: true,
    meshQualityThreshold: 0.7
  },
  
  ui: {
    theme: 'dark' as const,
    enableAdvancedControls: true,
    showPerformanceMetrics: true,
    showQualityAnalysis: true
  }
};

/**
 * 支持的计算任务列表
 */
export const SUPPORTED_COMPUTATION_TASKS = [
  'soil_structure_coupling',
  'construction_stage_analysis', 
  'safety_assessment',
  'stress_visualization',
  'deformation_animation',
  'flow_field_visualization',
  'comprehensive_analysis'
] as const;

// ======================== 工具函数导出 ========================

/**
 * 检查计算模块兼容性
 */
export function checkComputationCompatibility(): {
  webgpu: boolean;
  webgl2: boolean;
  wasm: boolean;
  sharedArrayBuffer: boolean;
} {
  return {
    webgpu: 'gpu' in navigator && 'requestAdapter' in (navigator as any).gpu,
    webgl2: !!document.createElement('canvas').getContext('webgl2'),
    wasm: typeof WebAssembly === 'object',
    sharedArrayBuffer: typeof SharedArrayBuffer !== 'undefined'
  };
}

/**
 * 获取推荐的计算配置
 */
export function getRecommendedComputationConfig(): Partial<ComputationModuleConfig> {
  const compatibility = checkComputationCompatibility();
  
  return {
    performance: {
      enableGPUMonitoring: compatibility.webgpu,
      enableQualityFeedback: true,
      maxComputeUnits: compatibility.webgpu ? 64 : 32,
      memoryLimit: compatibility.sharedArrayBuffer ? 8192 : 4096
    },
    
    ui: {
      theme: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
      enableAdvancedControls: compatibility.webgpu && compatibility.wasm,
      showPerformanceMetrics: compatibility.webgpu,
      showQualityAnalysis: true
    }
  };
}

// ======================== 默认导出 ========================

export default {
  // 组件
  ComputationControlPanel,
  PhysicsAIEmbeddedPanel,
  
  // 集成类
  ComputationModuleIntegration,
  
  // 工厂函数
  createComputationModule,
  
  // 工具函数
  getAvailableComputationTasks,
  validateComputationConfig,
  checkComputationCompatibility,
  getRecommendedComputationConfig,
  
  // 常量
  COMPUTATION_MODULE_INFO,
  DEFAULT_COMPUTATION_CONFIG,
  SUPPORTED_COMPUTATION_TASKS
};