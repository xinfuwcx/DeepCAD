/**
 * 2号↔3号标准化数据交换接口规范
 * DeepCAD Deep Excavation CAE Platform - Interface Standardization
 * 
 * 作者：2号几何专家
 * 版本：v1.0.0
 * 创建日期：2025-01-25
 * 
 * 目标：建立几何模块与计算模块之间的标准化数据交换协议
 * 确保数据传输准确性、一致性和高效性，支持系统演进
 */

// ============================================================================
// 1. 核心数据类型定义
// ============================================================================

/**
 * 标准化时间戳接口
 * 统一时间表示，支持高精度时间戳和ISO格式
 */
export interface StandardTimestamp {
  /** Unix时间戳（毫秒） */
  unix: number;
  /** ISO 8601格式时间字符串 */
  iso: string;
  /** 操作耗时（毫秒），用于性能分析 */
  duration?: number;
}

/**
 * 标准化唯一标识符接口
 * 确保数据追溯性和唯一性识别
 */
export interface StandardIdentifier {
  /** 主标识符 - UUID v4格式 */
  id: string;
  /** 版本号 - 语义化版本控制 */
  version: string;
  /** 数据源模块标识 */
  source: '2号几何专家' | '3号计算专家';
  /** 关联的父级标识符（可选） */
  parentId?: string;
}

/**
 * 标准化几何坐标点接口
 * 统一三维空间坐标表示，支持高精度浮点数
 */
export interface StandardPoint3D {
  /** X坐标（米） */
  x: number;
  /** Y坐标（米） */
  y: number;
  /** Z坐标（米） */
  z: number;
  /** 坐标精度等级（小数位数） */
  precision?: number;
}

/**
 * 标准化空间边界盒接口
 * 定义三维空间的边界范围
 */
export interface StandardBoundingBox {
  /** 最小点坐标 */
  min: StandardPoint3D;
  /** 最大点坐标 */
  max: StandardPoint3D;
  /** 边界盒中心点 */
  center: StandardPoint3D;
  /** 边界盒尺寸 */
  size: StandardPoint3D;
}

// ============================================================================
// 2. 几何数据标准化接口
// ============================================================================

/**
 * 标准化几何网格数据接口
 * 定义从2号几何专家向3号计算专家传输的几何数据格式
 */
export interface StandardGeometryData {
  /** 数据标识信息 */
  identifier: StandardIdentifier;
  /** 创建时间戳 */
  timestamp: StandardTimestamp;
  
  /** 顶点坐标数组 - Float32Array格式以优化内存和传输 */
  vertices: {
    /** 坐标数据 - [x1,y1,z1, x2,y2,z2, ...] 格式 */
    data: Float32Array;
    /** 顶点数量 */
    count: number;
    /** 坐标系统标识 */
    coordinateSystem: 'WGS84' | 'Local' | 'Engineering';
    /** 单位标识 */
    unit: 'meter' | 'millimeter';
  };
  
  /** 面片索引数组 - Uint32Array格式支持大规模网格 */
  faces: {
    /** 三角形索引数据 - [v1,v2,v3, v4,v5,v6, ...] 格式 */
    data: Uint32Array;
    /** 三角形数量 */
    count: number;
    /** 索引数据类型 */
    indexType: 'triangle' | 'quad';
  };
  
  /** 材料区域定义 */
  materialZones: StandardMaterialZone[];
  
  /** 边界条件定义 */
  boundaryConditions: StandardBoundaryCondition[];
  
  /** 几何质量元数据 */
  qualityMetadata: StandardGeometryQuality;
  
  /** 几何边界盒 */
  boundingBox: StandardBoundingBox;
}

/**
 * 标准化材料区域接口
 * 定义不同土层材料的空间分布
 */
export interface StandardMaterialZone {
  /** 材料区域唯一标识 */
  zoneId: string;
  /** 材料类型标识 */
  materialType: string;
  /** 材料名称 */
  materialName: string;
  /** 区域内的面片索引数组 */
  faceIndices: Uint32Array;
  /** 材料参数（传递给3号用于计算） */
  materialProperties: {
    /** 密度 (kg/m³) */
    density?: number;
    /** 弹性模量 (Pa) */
    elasticModulus?: number;
    /** 泊松比 */
    poissonRatio?: number;
    /** 内摩擦角 (度) */
    frictionAngle?: number;
    /** 粘聚力 (Pa) */
    cohesion?: number;
    /** 扩展材料参数（JSON格式） */
    extendedProperties?: Record<string, any>;
  };
}

/**
 * 标准化边界条件接口
 * 定义CAE分析的边界约束条件
 */
export interface StandardBoundaryCondition {
  /** 边界条件唯一标识 */
  conditionId: string;
  /** 边界条件类型 */
  type: 'displacement' | 'force' | 'pressure' | 'symmetry' | 'contact';
  /** 应用的几何实体 */
  geometryEntity: {
    /** 实体类型 */
    entityType: 'vertex' | 'edge' | 'face' | 'volume';
    /** 实体索引数组 */
    entityIndices: Uint32Array;
  };
  /** 边界条件参数 */
  parameters: {
    /** 约束方向 */
    constraintDirections?: ['x' | 'y' | 'z', 'rx' | 'ry' | 'rz'];
    /** 数值参数 */
    values?: number[];
    /** 时间函数（用于动态边界条件） */
    timeFunction?: string;
  };
}

/**
 * 标准化几何质量评估接口
 * 2号几何专家提供的初始质量评估数据
 */
export interface StandardGeometryQuality {
  /** 几何复杂度评级 */
  complexityLevel: 'simple' | 'moderate' | 'complex' | 'extreme';
  /** 预估单元数量 */
  estimatedElementCount: number;
  /** 预估内存需求 (MB) */
  estimatedMemoryRequirement: number;
  /** RBF插值质量评分 (0-1) */
  rbfInterpolationQuality: number;
  /** 几何连续性检查结果 */
  continuityCheck: {
    /** 是否通过连续性检查 */
    passed: boolean;
    /** 不连续点数量 */
    discontinuityCount: number;
    /** 问题区域描述 */
    issues: string[];
  };
  /** 网格化准备状态 */
  meshingReadiness: {
    /** 是否准备好进行网格化 */
    ready: boolean;
    /** 推荐网格尺寸 (m) */
    recommendedMeshSize: number;
    /** 关键区域标识 */
    criticalRegions: StandardPoint3D[];
  };
}

// ============================================================================
// 3. 计算分析反馈接口
// ============================================================================

/**
 * 标准化网格质量分析结果接口
 * 3号计算专家向2号几何专家反馈的质量分析数据
 */
export interface StandardMeshQualityResult {
  /** 分析结果标识信息 */
  identifier: StandardIdentifier;
  /** 分析时间戳 */
  timestamp: StandardTimestamp;
  /** 对应的几何数据标识 */
  sourceGeometryId: string;
  
  /** 整体质量评估 */
  overallQuality: {
    /** 综合质量评分 (0-1) */
    score: number;
    /** 质量等级 */
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    /** 是否满足计算要求 */
    computationReady: boolean;
    /** 推荐最大时间步长 */
    recommendedTimeStep?: number;
  };
  
  /** 单元质量统计 */
  elementQuality: {
    /** 每个单元的质量评分数组 */
    scores: Float32Array;
    /** 质量分布统计 */
    distribution: {
      /** 优秀单元比例 (>0.8) */
      excellent: number;
      /** 良好单元比例 (0.65-0.8) */
      good: number;
      /** 可接受单元比例 (0.5-0.65) */
      acceptable: number;
      /** 劣质单元比例 (<0.5) */
      poor: number;
    };
    /** 质量指标统计 */
    metrics: {
      /** 长宽比统计 */
      aspectRatio: StandardStatistics;
      /** 倾斜度统计 */
      skewness: StandardStatistics;
      /** 雅可比行列式统计 */
      jacobian: StandardStatistics;
      /** 正交性统计 */
      orthogonality: StandardStatistics;
    };
  };
  
  /** 问题区域识别 */
  problemAreas: StandardProblemArea[];
  
  /** 性能分析数据 */
  performanceAnalysis: {
    /** 网格化耗时 (ms) */
    meshingTime: number;
    /** 质量检查耗时 (ms) */
    qualityCheckTime: number;
    /** 内存使用量 (MB) */
    memoryUsage: number;
    /** 处理效率评分 (0-1) */
    efficiency: number;
  };
  
  /** 优化建议 */
  optimizationRecommendations: StandardOptimizationRecommendation[];
}

/**
 * 标准化统计数据接口
 * 用于各种数值指标的统计描述
 */
export interface StandardStatistics {
  /** 最小值 */
  min: number;
  /** 最大值 */
  max: number;
  /** 平均值 */
  mean: number;
  /** 中位数 */
  median: number;
  /** 标准差 */
  standardDeviation: number;
  /** 95分位数 */
  percentile95: number;
}

/**
 * 标准化问题区域接口
 * 定义网格中存在质量问题的具体区域
 */
export interface StandardProblemArea {
  /** 问题区域唯一标识 */
  areaId: string;
  /** 问题类型 */
  problemType: 'sharp_angle' | 'poor_aspect_ratio' | 'low_jacobian' | 'high_skewness' | 'size_transition';
  /** 严重程度等级 */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** 影响的单元索引数组 */
  affectedElements: Uint32Array;
  /** 问题区域空间位置 */
  location: StandardBoundingBox;
  /** 问题描述 */
  description: string;
  /** 问题数值指标 */
  metrics: {
    /** 问题程度评分 (0-1) */
    problemScore: number;
    /** 相关质量指标值 */
    qualityValue: number;
    /** 影响范围 (m) */
    influenceRadius: number;
  };
}

/**
 * 标准化优化建议接口
 * 3号计算专家向2号几何专家提供的具体优化建议
 */
export interface StandardOptimizationRecommendation {
  /** 建议唯一标识 */
  recommendationId: string;
  /** 建议优先级 */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** 优化类型 */
  optimizationType: 'mesh_refinement' | 'geometry_smoothing' | 'boundary_adjustment' | 'material_zone_revision';
  /** 目标区域 */
  targetRegion: StandardBoundingBox;
  /** 具体优化参数 */
  parameters: {
    /** 推荐网格尺寸 (m) */
    recommendedMeshSize?: number;
    /** 平滑因子 (0-1) */
    smoothingFactor?: number;
    /** 几何调整半径 (m) */
    adjustmentRadius?: number;
    /** 扩展参数 */
    extendedParameters?: Record<string, any>;
  };
  /** 预期改进效果 */
  expectedImprovement: {
    /** 质量提升预期 (0-1) */
    qualityGain: number;
    /** 计算性能影响 */
    performanceImpact: number;
    /** 内存开销变化 (%) */
    memoryImpact: number;
  };
  /** 实施复杂度 */
  implementationComplexity: 'trivial' | 'easy' | 'moderate' | 'complex' | 'expert';
}

// ============================================================================
// 4. 几何优化响应接口
// ============================================================================

/**
 * 标准化几何优化结果接口
 * 2号几何专家基于3号反馈的优化结果数据
 */
export interface StandardGeometryOptimizationResult {
  /** 优化结果标识信息 */
  identifier: StandardIdentifier;
  /** 优化时间戳 */
  timestamp: StandardTimestamp;
  /** 原始几何数据标识 */
  originalGeometryId: string;
  /** 触发优化的分析结果标识 */
  triggerAnalysisId: string;
  
  /** 优化成功状态 */
  optimization: {
    /** 是否优化成功 */
    successful: boolean;
    /** 优化迭代次数 */
    iterations: number;
    /** 收敛状态 */
    converged: boolean;
    /** 优化算法标识 */
    algorithm: string;
  };
  
  /** 应用的优化措施 */
  appliedOptimizations: StandardAppliedOptimization[];
  
  /** 质量改进数据 */
  qualityImprovement: {
    /** 优化前质量评分 */
    beforeScore: number;
    /** 优化后质量评分 */
    afterScore: number;
    /** 质量提升百分比 */
    improvementPercentage: number;
    /** 目标达成状态 */
    targetAchieved: boolean;
  };
  
  /** 优化后的几何数据 */
  optimizedGeometry: StandardGeometryData;
  
  /** 优化性能统计 */
  optimizationPerformance: {
    /** 优化总耗时 (ms) */
    totalTime: number;
    /** 各阶段耗时分布 */
    phaseTimings: {
      analysis: number;
      planning: number;
      execution: number;
      validation: number;
    };
    /** 内存使用峰值 (MB) */
    peakMemoryUsage: number;
  };
}

/**
 * 标准化已应用优化措施接口
 * 记录实际执行的几何优化操作
 */
export interface StandardAppliedOptimization {
  /** 优化操作唯一标识 */
  operationId: string;
  /** 对应的建议标识 */
  recommendationId: string;
  /** 优化操作类型 */
  operationType: 'rbf_parameter_adjustment' | 'local_refinement' | 'boundary_smoothing' | 'material_boundary_optimization';
  /** 操作的空间区域 */
  affectedRegion: StandardBoundingBox;
  /** 操作参数 */
  operationParameters: {
    /** RBF参数调整 */
    rbfAdjustment?: {
      kernelType: string;
      shapeParameter: number;
      smoothingFactor: number;
    };
    /** 局部细化参数 */
    refinementParameters?: {
      targetResolution: number;
      adaptiveFactor: number;
    };
    /** 边界平滑参数 */
    smoothingParameters?: {
      iterations: number;
      smoothingWeight: number;
    };
  };
  /** 操作效果评估 */
  effectiveness: {
    /** 局部质量改进 */
    localQualityGain: number;
    /** 操作成功率 */
    successRate: number;
    /** 副作用评估 */
    sideEffects: string[];
  };
}

// ============================================================================
// 5. 通信协议和状态管理
// ============================================================================

/**
 * 标准化数据交换消息接口
 * 定义2号和3号之间的标准通信格式
 */
export interface StandardDataExchangeMessage {
  /** 消息标识信息 */
  identifier: StandardIdentifier;
  /** 消息时间戳 */
  timestamp: StandardTimestamp;
  /** 消息类型 */
  messageType: 'geometry_data' | 'quality_analysis' | 'optimization_result' | 'status_update' | 'error_report';
  /** 发送方标识 */
  sender: '2号几何专家' | '3号计算专家';
  /** 接收方标识 */
  receiver: '2号几何专家' | '3号计算专家';
  /** 消息优先级 */
  priority: 'low' | 'normal' | 'high' | 'urgent';
  /** 消息负载数据 */
  payload: StandardGeometryData | StandardMeshQualityResult | StandardGeometryOptimizationResult;
  /** 消息状态 */
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

/**
 * 标准化协作状态接口
 * 监控2号和3号之间的协作状态
 */
export interface StandardCollaborationStatus {
  /** 状态标识信息 */
  identifier: StandardIdentifier;
  /** 状态时间戳 */
  timestamp: StandardTimestamp;
  
  /** 连接状态 */
  connection: {
    /** 是否连接 */
    isConnected: boolean;
    /** 连接质量评分 (0-1) */
    connectionQuality: number;
    /** 最后心跳时间 */
    lastHeartbeat: StandardTimestamp;
  };
  
  /** 数据交换统计 */
  exchangeStatistics: {
    /** 总交换次数 */
    totalExchanges: number;
    /** 成功交换次数 */
    successfulExchanges: number;
    /** 失败交换次数 */
    failedExchanges: number;
    /** 平均响应时间 (ms) */
    averageResponseTime: number;
    /** 数据传输吞吐量 (MB/s) */
    throughput: number;
  };
  
  /** 当前工作负载 */
  workload: {
    /** 2号待处理任务数 */
    geometryTasksQueued: number;
    /** 3号待处理任务数 */
    computationTasksQueued: number;
    /** 当前处理的任务标识 */
    currentTaskId?: string;
    /** 系统负载评分 (0-1) */
    systemLoad: number;
  };
  
  /** 协作效率指标 */
  efficiency: {
    /** 端到端处理时间 (ms) */
    endToEndLatency: number;
    /** 数据一致性检查通过率 */
    dataConsistencyRate: number;
    /** 优化建议采纳率 */
    recommendationAdoptionRate: number;
  };
}

// ============================================================================
// 6. 错误处理和异常报告
// ============================================================================

/**
 * 标准化错误报告接口
 * 统一错误处理和异常报告格式
 */
export interface StandardErrorReport {
  /** 错误报告标识信息 */
  identifier: StandardIdentifier;
  /** 错误发生时间戳 */
  timestamp: StandardTimestamp;
  /** 错误严重程度 */
  severity: 'info' | 'warning' | 'error' | 'critical' | 'fatal';
  /** 错误类型分类 */
  errorType: 'data_validation' | 'computation_failure' | 'network_error' | 'memory_error' | 'timeout';
  /** 错误代码 */
  errorCode: string;
  /** 错误描述 */
  errorMessage: string;
  /** 错误上下文信息 */
  context: {
    /** 出错的操作类型 */
    operation: string;
    /** 相关数据标识 */
    relatedDataId?: string;
    /** 错误发生位置 */
    location: string;
    /** 系统状态快照 */
    systemState: Record<string, any>;
  };
  /** 恢复建议 */
  recoveryRecommendations: string[];
  /** 是否需要人工干预 */
  requiresManualIntervention: boolean;
}

// ============================================================================
// 7. 版本控制和兼容性
// ============================================================================

/**
 * 标准化版本信息接口
 * 确保接口版本兼容性和向后兼容
 */
export interface StandardVersionInfo {
  /** 接口规范版本 */
  specificationVersion: string;
  /** 实现版本 */
  implementationVersion: string;
  /** 兼容的最低版本 */
  minimumCompatibleVersion: string;
  /** 版本发布时间 */
  releaseDate: string;
  /** 版本变更摘要 */
  changeLog: string[];
  /** 废弃功能列表 */
  deprecatedFeatures: string[];
  /** 新增功能列表 */
  newFeatures: string[];
}

/**
 * 标准化兼容性检查接口
 * 运行时版本兼容性验证
 */
export interface StandardCompatibilityCheck {
  /** 检查结果 */
  compatible: boolean;
  /** 版本匹配详情 */
  versionMatching: {
    /** 本地版本 */
    localVersion: string;
    /** 远程版本 */
    remoteVersion: string;
    /** 兼容性等级 */
    compatibilityLevel: 'full' | 'partial' | 'limited' | 'incompatible';
  };
  /** 兼容性警告 */
  warnings: string[];
  /** 必须的升级操作 */
  requiredUpgrades: string[];
}

// ============================================================================
// 8. 性能监控和质量保证
// ============================================================================

/**
 * 标准化性能监控接口
 * 实时监控数据交换性能和系统健康状态
 */
export interface StandardPerformanceMetrics {
  /** 监控时间戳 */
  timestamp: StandardTimestamp;
  /** CPU使用率 (%) */
  cpuUsage: number;
  /** 内存使用率 (%) */
  memoryUsage: number;
  /** 网络延迟 (ms) */
  networkLatency: number;
  /** 数据传输速率 (MB/s) */
  dataTransferRate: number;
  /** 错误率 (%) */
  errorRate: number;
  /** 系统稳定性评分 (0-1) */
  stabilityScore: number;
}

/**
 * 标准化质量保证检查点接口
 * 关键操作的质量验证检查点
 */
export interface StandardQualityCheckpoint {
  /** 检查点标识 */
  checkpointId: string;
  /** 检查点名称 */
  checkpointName: string;
  /** 检查时间戳 */
  timestamp: StandardTimestamp;
  /** 检查结果 */
  result: 'passed' | 'failed' | 'warning';
  /** 检查项目列表 */
  checkItems: {
    /** 检查项名称 */
    itemName: string;
    /** 检查结果 */
    result: boolean;
    /** 检查值 */
    actualValue: any;
    /** 期望值 */
    expectedValue: any;
    /** 容差范围 */
    tolerance?: number;
  }[];
  /** 质量评分 (0-1) */
  qualityScore: number;
}

// ============================================================================
// 9. 扩展和定制化接口
// ============================================================================

/**
 * 标准化扩展配置接口
 * 支持特定项目需求的定制化配置
 */
export interface StandardExtensionConfig {
  /** 扩展配置标识 */
  configId: string;
  /** 扩展类型 */
  extensionType: 'custom_material' | 'special_boundary' | 'advanced_analysis' | 'third_party_integration';
  /** 扩展参数 */
  parameters: Record<string, any>;
  /** 是否启用 */
  enabled: boolean;
  /** 扩展版本 */
  version: string;
}

// ============================================================================
// 10. 导出类型汇总
// ============================================================================

/**
 * 主要数据交换类型联合
 */
export type StandardDataPayload = 
  | StandardGeometryData 
  | StandardMeshQualityResult 
  | StandardGeometryOptimizationResult
  | StandardErrorReport;

/**
 * 消息类型联合
 */
export type StandardMessageType = 
  | 'geometry_data' 
  | 'quality_analysis' 
  | 'optimization_result' 
  | 'status_update' 
  | 'error_report';

/**
 * 模块标识联合
 */
export type StandardModuleIdentifier = '2号几何专家' | '3号计算专家';

// ============================================================================
// 11. 默认配置和常量
// ============================================================================

/**
 * 标准化默认配置常量
 */
export const STANDARD_DEFAULTS = {
  /** 默认坐标系统 */
  COORDINATE_SYSTEM: 'Engineering' as const,
  /** 默认单位 */
  UNIT: 'meter' as const,
  /** 默认质量阈值 */
  QUALITY_THRESHOLD: 0.65,
  /** 默认网格尺寸范围 */
  MESH_SIZE_RANGE: [1.5, 2.0] as const,
  /** 默认最大单元数量 */
  MAX_ELEMENT_COUNT: 2000000,
  /** 默认超时时间 (ms) */
  DEFAULT_TIMEOUT: 120000,
  /** 默认精度（小数位数） */
  DEFAULT_PRECISION: 6,
  /** 接口规范版本 */
  SPECIFICATION_VERSION: '1.0.0'
} as const;

/**
 * 标准化验证函数类型
 */
export type StandardValidator<T> = (data: T) => {
  valid: boolean;
  errors: string[];
  warnings: string[];
};

// ============================================================================
// 接口规范文档结束
// ============================================================================

/**
 * 使用说明：
 * 
 * 1. 数据传输：
 *    - 所有几何数据使用 StandardGeometryData 格式
 *    - 所有质量分析结果使用 StandardMeshQualityResult 格式
 *    - 所有优化结果使用 StandardGeometryOptimizationResult 格式
 * 
 * 2. 消息通信：
 *    - 使用 StandardDataExchangeMessage 包装所有通信消息
 *    - 支持消息优先级和状态跟踪
 *    - 包含完整的错误处理机制
 * 
 * 3. 版本兼容性：
 *    - 实施前检查 StandardCompatibilityCheck
 *    - 遵循语义化版本控制
 *    - 支持向后兼容和平滑升级
 * 
 * 4. 质量保证：
 *    - 在关键节点使用 StandardQualityCheckpoint
 *    - 持续监控 StandardPerformanceMetrics
 *    - 完整的错误报告和恢复机制
 * 
 * 5. 扩展性：
 *    - 通过 StandardExtensionConfig 支持定制化需求
 *    - 预留扩展字段满足未来需求
 *    - 模块化设计支持独立升级
 */