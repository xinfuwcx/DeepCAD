/**
 * 三方协作接口规范协议
 * 1号架构师 - 响应2号提醒，建立统一接口标准
 */

// =============================================================================
// 核心接口类型定义 (需要三方确认)
// =============================================================================

// 几何数据基础接口 - 2号几何模块输出标准
export interface GeometryData {
  id: string;
  type: 'point' | 'line' | 'surface' | 'volume' | 'mesh';
  coordinates: number[][];
  properties: Record<string, any>;
  materialZone?: MaterialZone;
  timestamp: number;
  version: string; // 向后兼容版本控制
}

// 材料分区定义 - 供3号计算专家使用
export interface MaterialZone {
  id: string;
  name: string;
  materialId: string;
  materialType: 'soil' | 'concrete' | 'steel' | 'rock' | 'water' | 'air' | 'custom';
  properties: {
    // 基本物理属性
    density?: number;
    elasticModulus?: number;
    poissonRatio?: number;
    
    // 土体力学属性
    cohesion?: number;
    frictionAngle?: number;
    dilatationAngle?: number;
    
    // 渗透性属性
    permeability?: number;
    porosity?: number;
    
    // 强度属性
    tensileStrength?: number;
    compressiveStrength?: number;
    shearStrength?: number;
    
    // 温度相关属性
    thermalConductivity?: number;
    thermalExpansion?: number;
    
    // 扩展属性
    [key: string]: any;
  };
  boundingBox: {
    min: [number, number, number];
    max: [number, number, number];
  };
  meshConstraints?: MeshConstraints;
  
  // 3号专家特定需求
  constitutiveModel?: {
    type: 'linear_elastic' | 'mohr_coulomb' | 'drucker_prager' | 'cam_clay' | 'custom';
    parameters: Record<string, number>;
  };
  
  // 分析类型相关设置
  analysisSettings?: {
    nonlinear?: boolean;
    plasticityModel?: string;
    dampingRatio?: number;
    initialStress?: [number, number, number, number, number, number]; // σxx, σyy, σzz, τxy, τyz, τzx
  };
}

// 网格约束 - 3号计算专家需求
export interface MeshConstraints {
  maxElementSize: number;
  minElementSize: number;
  curvatureAdaptation: boolean;
  proximityAdaptation: boolean;
  qualityTarget: 'fast' | 'balanced' | 'high_quality';
}

// 几何到网格数据格式 - 2号->3号数据传递标准
export interface GeometryToMeshData {
  geometry: GeometryData[];
  materialZones: MaterialZone[];
  meshSettings: {
    globalSize: number;
    algorithm: 'delaunay' | 'frontal' | 'meshadapt' | 'tetgen' | 'gmsh';
    optimization: boolean;
    qualityThreshold: number;
    elementType?: 'tetrahedron' | 'hexahedron' | 'prism'; // 与SoilBody保持一致
  };
  qualityRequirements: {
    minAspectRatio: number;
    maxSkewness: number;
    minOrthogonality: number;
    maxJacobian?: number; // 雅可比行列式质量要求
    minVolume?: number;   // 最小单元体积
  };
  // 新增字段，确保与3号专家完全兼容
  metadata?: {
    version: string;
    timestamp: number;
    sourceExpert: '2号几何专家';
    targetExpert: '3号计算专家';
    dataType: 'geometry_to_mesh';
  };
}

// 网格质量反馈 - 3号->2号反馈机制
export interface MeshQualityFeedback {
  jobId: string;
  timestamp: number;
  overall: {
    elementCount: number;
    nodeCount: number;
    averageQuality: number;
    worstQuality: number;
  };
  zoneAnalysis: Array<{
    zoneId: string;
    zoneName: string;
    elementCount: number;
    averageSize: number;
    qualityMetrics: {
      aspectRatio: { min: number; max: number; avg: number };
      skewness: { min: number; max: number; avg: number };
      orthogonality: { min: number; max: number; avg: number };
    };
    recommendations: string[];
  }>;
  globalRecommendations: {
    suggestedMaxSize?: number;
    suggestedMinSize?: number;
    problemAreas: Array<{
      location: [number, number, number];
      issue: string;
      severity: 'low' | 'medium' | 'high';
    }>;
  };
}

// =============================================================================
// 性能监控接口 - 1号架构师统一管理
// =============================================================================

export interface PerformanceMetrics {
  timestamp: number;
  moduleId: string;
  metrics: {
    renderTime: number;
    memoryUsage: number;
    triangleCount: number;
    drawCalls: number;
    fps: number;
  };
  thresholds: {
    maxRenderTime: number;
    maxMemoryUsage: number;
    minFps: number;
  };
  alerts: Array<{
    type: 'performance' | 'memory' | 'quality';
    severity: 'warning' | 'error';
    message: string;
  }>;
}

// =============================================================================
// 接口变更协议 - 三方协作机制
// =============================================================================

export interface InterfaceChangeRequest {
  id: string;
  timestamp: number;
  requestedBy: '1号架构师' | '2号几何专家' | '3号计算专家';
  type: 'add' | 'modify' | 'deprecate' | 'remove';
  affectedInterfaces: string[];
  description: string;
  reasoning: string;
  backwardCompatible: boolean;
  migrationPath?: string;
  status: 'proposed' | 'under_review' | 'approved' | 'rejected';
  approvals: {
    architect: boolean;
    geometry: boolean; 
    computation: boolean;
  };
}

// =============================================================================
// 错误处理协议
// =============================================================================

export interface ModuleError {
  id: string;
  timestamp: number;
  moduleId: string;
  level: 'warning' | 'error' | 'critical';
  code: string;
  message: string;
  details?: any;
  stack?: string;
  recoverable: boolean;
  retryable: boolean;
}

export interface ErrorRecoveryStrategy {
  errorCode: string;
  strategy: 'retry' | 'fallback' | 'reload' | 'escalate';
  maxRetries?: number;
  fallbackData?: any;
  escalationTarget?: string;
}

// =============================================================================
// 接口验证工具
// =============================================================================

export class InterfaceValidator {
  // 验证几何数据格式
  static validateGeometryData(data: any): data is GeometryData {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      ['point', 'line', 'surface', 'volume', 'mesh'].includes(data.type) &&
      Array.isArray(data.coordinates) &&
      typeof data.properties === 'object' &&
      typeof data.timestamp === 'number' &&
      typeof data.version === 'string'
    );
  }

  // 验证材料分区数据
  static validateMaterialZone(data: any): data is MaterialZone {
    return (
      typeof data === 'object' &&
      typeof data.id === 'string' &&
      typeof data.name === 'string' &&
      typeof data.materialId === 'string' &&
      typeof data.properties === 'object' &&
      data.boundingBox &&
      Array.isArray(data.boundingBox.min) &&
      Array.isArray(data.boundingBox.max)
    );
  }

  // 验证网格质量反馈
  static validateMeshQualityFeedback(data: any): data is MeshQualityFeedback {
    return (
      typeof data === 'object' &&
      typeof data.jobId === 'string' &&
      typeof data.timestamp === 'number' &&
      data.overall &&
      typeof data.overall.elementCount === 'number' &&
      Array.isArray(data.zoneAnalysis) &&
      data.globalRecommendations
    );
  }
}

// =============================================================================
// 接口版本管理
// =============================================================================

export const INTERFACE_VERSIONS = {
  GEOMETRY_DATA: '1.0.0',
  MATERIAL_ZONE: '1.0.0',
  MESH_DATA: '1.0.0',
  QUALITY_FEEDBACK: '1.0.0',
  PERFORMANCE_METRICS: '1.0.0'
} as const;

export class InterfaceVersionManager {
  // 检查版本兼容性
  static isCompatible(required: string, current: string): boolean {
    const [reqMajor, reqMinor] = required.split('.').map(Number);
    const [curMajor, curMinor] = current.split('.').map(Number);
    
    // 主版本必须相同，小版本必须大于等于要求版本
    return curMajor === reqMajor && curMinor >= reqMinor;
  }

  // 获取迁移路径
  static getMigrationPath(from: string, to: string): string[] {
    // 这里应该返回具体的迁移步骤
    return [`从 ${from} 迁移到 ${to} 的详细步骤...`];
  }
}

// =============================================================================
// 开发助手 - 接口使用指南
// =============================================================================

export const INTERFACE_USAGE_GUIDE = {
  GEOMETRY_MODULE: {
    exports: ['GeometryData', 'MaterialZone'],
    imports: ['MeshQualityFeedback'],
    responsibilities: [
      '提供标准化的几何数据格式',
      '定义材料分区信息',
      '响应网格质量反馈进行优化'
    ]
  },
  COMPUTATION_MODULE: {
    exports: ['MeshQualityFeedback', 'PerformanceMetrics'],
    imports: ['GeometryToMeshData', 'MaterialZone'],
    responsibilities: [
      '生成高质量网格',
      '提供网格质量分析',
      '执行数值计算',
      '监控计算性能'
    ]
  },
  ARCHITECTURE_MODULE: {
    exports: ['InterfaceChangeRequest', 'ErrorRecoveryStrategy'],
    imports: ['All interfaces for validation'],
    responsibilities: [
      '维护接口标准',
      '协调模块间通信',
      '管理错误处理',
      '监控系统性能'
    ]
  }
} as const;

console.log('📋 接口协议已建立 - 1号架构师为三方协作制定的统一标准');