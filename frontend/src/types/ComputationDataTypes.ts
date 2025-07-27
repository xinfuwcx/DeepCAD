/**
 * DeepCAD 计算数据类型定义
 * @description 深基坑工程CAE计算所需的核心数据结构定义，包括网格、材料、边界条件等
 * 为3号计算专家的分析计算提供标准化的数据接口规范
 * @author 1号首席架构师
 * @version 2.0.0
 * @since 2024-07-25
 */

/**
 * 网格数据接口
 * @interface MeshData
 * @description 完整的有限元网格数据结构，包含网格拓扑、质量指标和元数据
 */
export interface MeshData {
  /** 网格唯一标识符 */
  id: string;
  /** 网格名称 */
  name: string;
  /** 网格单元数组 */
  elements: MeshElement[];
  /** 网格节点数组 */
  nodes: MeshNode[];
  /** 物理组定义数组 */
  physicalGroups: PhysicalGroup[];
  /** 网格质量指标 */
  qualityMetrics: MeshQualityMetrics;
  /** 生成时间戳 */
  generationTime: string;
  /** 内存占用 (MB) */
  memoryUsage: number;
}

/**
 * 网格单元接口
 * @interface MeshElement
 * @description 单个有限元单元的几何和属性定义
 */
export interface MeshElement {
  /** 单元唯一标识 */
  id: number;
  /** 单元类型：四面体/六面体/棱柱/锥体 */
  type: 'tetrahedron' | 'hexahedron' | 'prism' | 'pyramid';
  /** 组成单元的节点ID数组 */
  nodeIds: number[];
  /** 材料标识符 */
  materialId: string;
  /** 物理组标识符 */
  physicalGroupId: string;
  /** 单元质量指标 */
  quality: {
    /** 长宽比 */
    aspectRatio: number;
    /** 偏斜度 (0-1，0为最佳) */
    skewness: number;
    /** 雅可比行列式 */
    jacobian: number;
    /** 单元体积 (m³) */
    volume: number;
  };
}

/**
 * 网格节点接口
 * @interface MeshNode
 * @description 有限元网格中的节点定义
 */
export interface MeshNode {
  /** 节点唯一标识 */
  id: number;
  /** 节点三维坐标 */
  position: {
    /** X坐标 (米) */
    x: number; 
    /** Y坐标 (米) */
    y: number; 
    /** Z坐标 (米) */
    z: number;
  };
  /** 是否为边界节点 */
  boundary: boolean;
}

/**
 * 物理组接口
 * @interface PhysicalGroup
 * @description 具有相同物理属性的网格单元集合
 */
export interface PhysicalGroup {
  /** 物理组唯一标识符 */
  id: string;
  /** 物理组名称 */
  name: string;
  /** 物理组类型：体/面/线/点 */
  type: 'volume' | 'surface' | 'line' | 'point';
  /** 包含的单元ID数组 */
  elementIds: number[];
  /** 材料属性定义 */
  materialProperties: MaterialProperties;
  /** 边界条件定义（可选） */
  boundaryConditions?: BoundaryCondition[];
}

/**
 * 材料属性接口
 * @interface MaterialProperties
 * @description 工程材料的物理和力学属性定义
 */
export interface MaterialProperties {
  /** 材料名称 */
  name: string;
  /** 密度 (kg/m³) */
  density: number;
  /** 弹性模量 (Pa) */
  elasticModulus: number;
  /** 泊松比 (无量纲) */
  poissonRatio: number;
  cohesion: number;          // Pa
  frictionAngle: number;     // degrees
  permeability: number;      // m/s
  bulkModulus?: number;      // Pa
  shearModulus?: number;     // Pa
}

export interface MeshQualityMetrics {
  totalElements: number;
  totalNodes: number;
  minQuality: number;
  maxQuality: number;
  avgQuality: number;
  qualityHistogram: Array<{range: string, count: number}>;
  poorQualityElements: number[];  // 低质量单元ID列表
  fragmentRegions: number;
  memoryFootprint: number;        // MB
}

export interface BoundaryCondition {
  id: string;
  type: 'displacement' | 'force' | 'pressure' | 'flow';
  name: string;
  nodeIds: number[];
  values: {
    x?: number;
    y?: number;
    z?: number;
    magnitude?: number;
  };
  timeFunction?: string;  // 时间函数表达式
}

export interface SolverConfiguration {
  type: 'Terra' | 'KRATOS' | 'OpenSees';
  analysisType: 'static' | 'dynamic' | 'consolidation' | 'coupled';
  solverParams: {
    maxIterations: number;
    convergenceTolerance: number;
    timeStep?: number;
    totalTime?: number;
    damping?: {
      rayleigh: {alpha: number, beta: number};
    };
  };
  outputRequests: string[];  // 需要输出的结果类型
}

export interface ComputationResults {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;  // 0-100
  startTime: string;
  endTime?: string;
  
  // 求解过程数据
  convergenceHistory: Array<{
    iteration: number;
    residual: number;
    displacement: number;
    force: number;
    timestamp: string;
  }>;
  
  // 结果场数据
  displacement?: ResultField;
  stress?: ResultField;
  strain?: ResultField;
  pressure?: ResultField;
  
  // 性能数据
  memoryUsage: number[];     // 内存使用历史
  cpuUsage: number[];        // CPU使用历史
  wallTime: number;          // 总计算时间(秒)
}

export interface ResultField {
  name: string;
  type: 'vector' | 'scalar' | 'tensor';
  unit: string;
  minValue: number;
  maxValue: number;
  data: Array<{
    nodeId: number;
    value: number | number[] | number[][];  // 标量/矢量/张量
  }>;
  contourLevels?: number[];  // 等值线分级
}

// 计算状态管理
export interface ComputationState {
  mesh: MeshData | null;
  solver: SolverConfiguration;
  boundaryConditions: BoundaryCondition[];
  results: ComputationResults | null;
  isComputing: boolean;
  error: string | null;
  lastUpdated: string;
}

// 3号计算专家组件Props接口
export interface ComputationComponentProps {
  meshData?: MeshData;
  results?: ComputationResults;
  onStartComputation?: (config: SolverConfiguration) => void;
  onStopComputation?: () => void;
  onExportResults?: (format: 'vtk' | 'csv' | 'tecplot') => void;
  readOnly?: boolean;
}

// Fragment网格特定接口
export interface FragmentData {
  regionId: string;
  name: string;
  elementIds: number[];
  volume: number;
  surfaceArea: number;
  qualityScore: number;
  neighbors: string[];  // 相邻Fragment ID列表
  boundaryFaces: Array<{
    nodeIds: number[];
    area: number;
    normal: {x: number, y: number, z: number};
  }>;
}