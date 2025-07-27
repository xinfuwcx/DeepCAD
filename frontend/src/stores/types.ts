/**
 * 统一状态管理类型定义
 * 1号架构师 - 全局类型系统
 */

// ==================== 基础类型 ====================

export interface BaseEntity {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

export interface ProgressInfo {
  current: number;
  total: number;
  percentage: number;
  estimatedTime?: number;
  message?: string;
}

export type TaskStatus = 'idle' | 'pending' | 'running' | 'completed' | 'error' | 'cancelled';

export interface SystemError {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  module: string;
  message: string;
  details?: any;
  timestamp: number;
  resolved?: boolean;
}

// ==================== 几何模块类型 ====================

export interface GeometryParams {
  // 基坑参数
  excavationDepth: number;
  excavationWidth: number;
  excavationLength: number;
  
  // 土层参数
  soilLayers: Array<{
    id: string;
    name: string;
    depth: number;
    properties: {
      density: number;
      cohesion: number;
      friction: number;
      elasticModulus: number;
      poissonRatio: number;
    };
  }>;
  
  // 支护参数
  supportStructures: Array<{
    id: string;
    type: 'retaining_wall' | 'anchor' | 'brace' | 'pile';
    position: { x: number; y: number; z: number };
    dimensions: { width: number; height: number; depth: number };
    material: string;
  }>;
  
  // 高级参数
  meshSize: number;
  qualityThreshold: number;
  optimizationEnabled: boolean;
}

export interface GeometryData {
  nodes: Array<{ id: string; x: number; y: number; z: number }>;
  elements: Array<{ id: string; nodeIds: string[]; materialId: string }>;
  materials: Array<{ id: string; name: string; properties: Record<string, number> }>;
  boundaryConditions: Array<{ id: string; nodeIds: string[]; type: string; value: number }>;
  loads: Array<{ id: string; nodeIds: string[]; type: string; value: number[] }>;
}

export interface GeometryState {
  // 参数配置
  params: GeometryParams;
  
  // 生成的几何数据
  data: GeometryData | null;
  
  // 任务状态
  status: TaskStatus;
  progress: ProgressInfo;
  errors: SystemError[];
  
  // 质量分析
  quality: {
    score: number;
    distribution: Record<string, number>;
    issues: Array<{ type: string; count: number; severity: string }>;
  } | null;
  
  // 操作历史
  history: Array<{
    id: string;
    action: string;
    timestamp: number;
    params: Partial<GeometryParams>;
  }>;
}

// ==================== 计算模块类型 ====================

export interface ComputationParams {
  // 求解器设置
  solver: 'kratos' | 'custom';
  solverSettings: {
    maxIterations: number;
    tolerance: number;
    timeStep: number;
    endTime: number;
  };
  
  // 分析类型
  analysisType: 'static' | 'dynamic' | 'nonlinear' | 'coupled';
  
  // 边界条件
  boundaryConditions: Array<{
    id: string;
    type: 'displacement' | 'force' | 'pressure';
    region: string;
    value: number | number[];
  }>;
  
  // 载荷定义
  loads: Array<{
    id: string;
    type: 'gravity' | 'surface' | 'point' | 'distributed';
    magnitude: number | number[];
    direction: number[];
  }>;
  
  // 材料属性
  materials: Array<{
    id: string;
    name: string;
    type: 'elastic' | 'plastic' | 'viscous';
    properties: Record<string, number>;
  }>;
}

export interface ComputationResults {
  // 节点结果
  nodeResults: {
    displacement: Array<{ nodeId: string; x: number; y: number; z: number }>;
    velocity: Array<{ nodeId: string; x: number; y: number; z: number }>;
    acceleration: Array<{ nodeId: string; x: number; y: number; z: number }>;
  };
  
  // 单元结果
  elementResults: {
    stress: Array<{ elementId: string; xx: number; yy: number; zz: number; xy: number; xz: number; yz: number }>;
    strain: Array<{ elementId: string; xx: number; yy: number; zz: number; xy: number; xz: number; yz: number }>;
  };
  
  // 全局结果
  globalResults: {
    energy: { kinetic: number; potential: number; total: number };
    convergence: { iterations: number; residual: number; converged: boolean };
    timeStep: number;
    currentTime: number;
  };
  
  // 安全系数
  safetyFactors: Array<{
    region: string;
    factor: number;
    type: 'sliding' | 'overturning' | 'bearing';
  }>;
}

export interface ComputationState {
  // 参数配置
  params: ComputationParams;
  
  // 计算结果
  results: ComputationResults | null;
  
  // 任务状态
  status: TaskStatus;
  progress: ProgressInfo;
  errors: SystemError[];
  
  // 实时监控
  monitoring: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    networkIO: number;
    diskIO: number;
  };
  
  // 性能指标
  performance: {
    startTime: number;
    endTime?: number;
    duration?: number;
    elementsPerSecond: number;
    memoryPeak: number;
  };
}

// ==================== UI模块类型 ====================

export interface UITheme {
  name: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    success: string;
    warning: string;
    error: string;
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
    };
    border: {
      primary: string;
      secondary: string;
    };
  };
  effects: {
    borderRadius: string;
    glassOpacity: number;
    particleCount: number;
    animationSpeed: number;
  };
}

// ThemeConfig interface for compatibility with existing components
export interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  borderColor: string;
  mode: 'light' | 'dark' | 'quantum';
}

export interface LayoutConfig {
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelCollapsed: boolean;
  rightPanelCollapsed: boolean;
  subViewEnabled: boolean;
  subViewHeight: number;
  compactMode: boolean;
  touchOptimized: boolean;
}

export interface UIState {
  // 主题配置
  theme: UITheme;
  uiMode: 'light' | 'dark' | 'quantum';
  particleEffectsEnabled: boolean;
  
  // 布局配置
  layout: LayoutConfig;
  
  // 响应式状态
  responsive: {
    screenWidth: number;
    screenHeight: number;
    deviceType: 'mobile' | 'tablet' | 'desktop' | 'ultrawide' | 'large4k';
    orientation: 'portrait' | 'landscape';
    isTouch: boolean;
  };
  
  // 活动模块
  activeModule: 'geometry' | 'meshing' | 'analysis' | 'results';
  activeTab: string;
  
  // 系统提示
  alerts: Array<{
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: number;
    duration?: number;
    actions?: Array<{ label: string; action: () => void }>;
  }>;
  
  // 模态框状态
  modals: {
    settings: boolean;
    help: boolean;
    about: boolean;
    export: boolean;
  };
}

// ==================== 性能模块类型 ====================

export interface PerformanceMetrics {
  // 渲染性能
  rendering: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    textureMemory: number;
  };
  
  // LOD性能
  lod: {
    totalObjects: number;
    visibleObjects: number;
    averageLevel: number;
    memoryReduction: number;
    performanceGain: number;
  };
  
  // 系统性能
  system: {
    cpuUsage: number;
    memoryUsage: number;
    gpuUsage?: number;
    networkLatency: number;
    diskSpace: number;
  };
  
  // 计算性能
  computation: {
    elementsPerSecond: number;
    convergenceRate: number;
    solverEfficiency: number;
    parallelEfficiency?: number;
  };
}

export interface PerformanceState {
  // 实时指标
  metrics: PerformanceMetrics;
  
  // 历史数据
  history: Array<{
    timestamp: number;
    metrics: PerformanceMetrics;
  }>;
  
  // 性能配置
  settings: {
    enableProfiling: boolean;
    historyLength: number;
    updateInterval: number;
    autoOptimization: boolean;
  };
  
  // 系统错误
  errors: SystemError[];
  
  // 性能建议
  suggestions: Array<{
    id: string;
    type: 'optimization' | 'warning' | 'info';
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high';
    action?: string;
  }>;
}

// ==================== 项目模块类型 ====================

export interface ProjectInfo extends BaseEntity {
  title: string;
  description: string;
  type: 'excavation' | 'tunnel' | 'foundation' | 'retaining_wall';
  location: {
    name: string;
    coordinates?: { lat: number; lng: number };
  };
  client: string;
  engineer: string;
  status: 'draft' | 'active' | 'completed' | 'archived';
  tags: string[];
}

export interface ProjectState {
  // 当前项目
  current: ProjectInfo | null;
  
  // 项目列表
  projects: ProjectInfo[];
  
  // 最近项目
  recent: string[];
  
  // 项目配置
  settings: {
    autoSave: boolean;
    autoSaveInterval: number;
    backupEnabled: boolean;
    backupRetention: number;
  };
  
  // 保存状态
  saveStatus: {
    lastSaved?: number;
    hasUnsavedChanges: boolean;
    isAutoSaving: boolean;
  };
}