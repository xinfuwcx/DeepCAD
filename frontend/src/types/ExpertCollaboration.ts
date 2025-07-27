/**
 * DeepCAD专家协作系统统一类型定义
 * 0号架构师 - 标准化所有专家间的协作接口
 */

// ============== 基础类型 ==============
export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface BoundingBox {
  min: Point3D;
  max: Point3D;
}

// ============== 专家协作核心接口 ==============

// 问题区域定义
export interface ProblemArea {
  id: string;
  type: 'geometry' | 'mesh' | 'computation' | 'visualization';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  location?: BoundingBox;
  affectedElements?: number[];
  metadata?: Record<string, any>;
}

// 详细质量指标
export interface DetailedQualityMetrics {
  connectivity: number;
  aspectRatio: number;
  skewness: number;
  orthogonality: number;
  jacobian?: number;
  volume?: number;
  area?: number;
  [key: string]: number | undefined;
}

// 性能指标
export interface PerformanceMetrics {
  processingTime: number;
  memoryUsage: number;
  convergenceRate?: number;
  iterationCount?: number;
  cpuUsage?: number;
  gpuUsage?: number;
}

// 收敛分析
export interface ConvergenceAnalysis {
  iterations: number;
  residual: number;
  convergenceRate: number;
  isConverged: boolean;
  finalError: number;
  convergenceHistory: number[];
}

// Fragment规范
export interface FragmentSpecification {
  id: string;
  type: 'tetrahedron' | 'hexahedron' | 'prism' | 'pyramid';
  size: {
    min: number;
    max: number;
    target: number;
  };
  quality: {
    threshold: number;
    metric: 'aspectRatio' | 'skewness' | 'jacobian';
  };
  refinementZones?: {
    region: BoundingBox;
    targetSize: number;
  }[];
}

// 网格历史记录
export interface MeshingHistoryEntry {
  timestamp: number;
  operation: 'generation' | 'refinement' | 'optimization' | 'repair';
  parameters: Record<string, any>;
  result: {
    elementCount: number;
    nodeCount: number;
    quality: DetailedQualityMetrics;
  };
  expert: '1号' | '2号' | '3号';
}

// 几何调整建议
export interface GeometryAdjustment {
  id: string;
  geometryId?: string;
  type: 'refinement' | 'smoothing' | 'optimization' | 'repair';
  target: 'global' | 'local' | 'region';
  parameters: {
    region?: number[];
    factor?: number;
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high';
  description: string;
  estimatedImpact: number; // 0-1
}

// 预期改进
export interface ExpectedImprovement {
  metric: string;
  currentValue: number;
  expectedValue: number;
  confidence: number; // 0-1
  description: string;
}

// 实施计划
export interface ImplementationPlan {
  steps: {
    id: string;
    description: string;
    estimated_time: number; // minutes
    dependencies: string[];
    expert: '1号' | '2号' | '3号';
  }[];
  totalTime: number;
  complexity: 'low' | 'medium' | 'high';
  riskLevel: 'low' | 'medium' | 'high';
}

// 风险评估
export interface RiskAssessment {
  level: 'low' | 'medium' | 'high' | 'critical';
  factors: {
    name: string;
    impact: number; // 0-1
    probability: number; // 0-1
    mitigation: string;
  }[];
  overallRisk: number; // 0-1
  recommendation: string;
}

// 替代方案
export interface AlternativeApproach {
  id: string;
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  complexity: 'low' | 'medium' | 'high';
  estimatedTime: number;
  successProbability: number; // 0-1
}

// 识别的问题
export interface IdentifiedProblem {
  id: string;
  category: 'geometry' | 'mesh' | 'computation' | 'performance';
  severity: 'info' | 'warning' | 'error' | 'critical';
  description: string;
  location?: BoundingBox;
  suggestedFix: string;
  expert: '1号' | '2号' | '3号';
  timestamp: number;
}

// 调整总结
export interface AdjustmentSummary {
  adjustmentId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  appliedChanges: string[];
  measuredImprovements: {
    metric: string;
    before: number;
    after: number;
    improvement: number;
  }[];
  timeSpent: number;
  expert: '1号' | '2号' | '3号';
}

// 质量验证结果
export interface QualityValidationResult {
  isValid: boolean;
  score: number; // 0-1
  metrics: DetailedQualityMetrics;
  issues: IdentifiedProblem[];
  recommendations: string[];
  validationMethod: string;
  timestamp: number;
}

// ============== 专家协作工作流 ==============

export interface ExpertCollaborationRequest {
  requestId: string;
  fromExpert: '0号' | '1号' | '2号' | '3号';
  toExpert: '0号' | '1号' | '2号' | '3号';
  requestType: 'geometry_optimization' | 'mesh_quality_check' | 'computation_setup' | 'visualization_update';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  deadline?: number;
  context: string;
}

export interface ExpertCollaborationResponse {
  responseId: string;
  requestId: string;
  fromExpert: '0号' | '1号' | '2号' | '3号';
  status: 'accepted' | 'completed' | 'rejected' | 'needs_more_info';
  result?: any;
  issues?: IdentifiedProblem[];
  suggestions?: GeometryAdjustment[];
  nextSteps?: string[];
  processingTime: number;
}

// ============== 系统状态监控 ==============

export interface SystemHealthStatus {
  overall: 'healthy' | 'warning' | 'error';
  experts: {
    '1号': 'active' | 'busy' | 'error' | 'offline';
    '2号': 'active' | 'busy' | 'error' | 'offline';
    '3号': 'active' | 'busy' | 'error' | 'offline';
  };
  performance: PerformanceMetrics;
  activeOperations: number;
  queueLength: number;
  lastUpdate: number;
}

// ============== 导出所有接口 ==============
export type ExpertCollaborationTypes = {
  ProblemArea: ProblemArea;
  DetailedQualityMetrics: DetailedQualityMetrics;
  PerformanceMetrics: PerformanceMetrics;
  ConvergenceAnalysis: ConvergenceAnalysis;
  FragmentSpecification: FragmentSpecification;
  MeshingHistoryEntry: MeshingHistoryEntry;
  GeometryAdjustment: GeometryAdjustment;
  ExpectedImprovement: ExpectedImprovement;
  ImplementationPlan: ImplementationPlan;
  RiskAssessment: RiskAssessment;
  AlternativeApproach: AlternativeApproach;
  IdentifiedProblem: IdentifiedProblem;
  AdjustmentSummary: AdjustmentSummary;
  QualityValidationResult: QualityValidationResult;
};