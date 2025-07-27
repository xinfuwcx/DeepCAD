/**
 * 统一类型定义导出 - 完善数据流类型系统
 */

// 重新导出所有数据流类型
export * from './dataFlow';

// ===== 扩展的基础类型 =====
export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Matrix4x4 {
  elements: number[]; // 16个元素的4x4矩阵
}

export interface Transform3D {
  position: Vector3;
  rotation: Vector3; // 欧拉角
  scale: Vector3;
}

// ===== UI状态类型扩展 =====
export interface ExtendedUIState {
  theme: 'dark' | 'light' | 'auto';
  layout: 'futuristic' | 'professional' | 'minimal';
  uiMode: 'standard' | 'advanced' | 'expert';
  particleEffectsEnabled: boolean;
  glassEffect: boolean;
  animations: boolean;
  compactMode: boolean;
}

// ===== 性能监控类型 =====
export interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  gpuUsage: number;
  cpuUsage: number;
  frameRate: number;
  geometryComplexity: 'low' | 'medium' | 'high';
}

// ===== 错误处理类型 =====
export interface AppError {
  code: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  context?: Record<string, any>;
  stack?: string;
}

// ===== 通知系统类型 =====
export interface NotificationData {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    handler: () => void;
  }>;
}

// ===== 工作流状态类型 =====
export interface WorkflowStatus {
  currentStep: number;
  totalSteps: number;
  stepName: string;
  progress: number;
  estimatedTimeRemaining: number;
  canSkip: boolean;
  canRetry: boolean;
}

// ===== 3D视口类型 =====
export interface ViewportState {
  camera: {
    position: Vector3;
    target: Vector3;
    up: Vector3;
    fov: number;
    near: number;
    far: number;
  };
  controls: {
    enabled: boolean;
    autoRotate: boolean;
    enableZoom: boolean;
    enablePan: boolean;
    enableRotate: boolean;
  };
  rendering: {
    shadows: boolean;
    antialias: boolean;
    pixelRatio: number;
    gammaCorrection: boolean;
  };
}

// ===== 模块配置类型 =====
export interface ModuleConfig {
  geology: {
    enabled: boolean;
    defaultInterpolation: 'kriging' | 'idw' | 'spline';
    maxBoreholes: number;
    qualityThreshold: number;
  };
  excavation: {
    enabled: boolean;
    maxDepth: number;
    minStageThickness: number;
    supportDXFImport: boolean;
  };
  support: {
    enabled: boolean;
    defaultSupportType: 'diaphragm_wall' | 'pile' | 'anchor';
    maxAnchorLength: number;
    safetyFactor: number;
  };
}

// ===== API配置类型 =====
export interface ApiEndpoints {
  geology: string;
  excavation: string;
  support: string;
  mesh: string;
  analysis: string;
  websocket: string;
}

// ===== 用户偏好类型 =====
export interface UserPreferences {
  language: 'zh' | 'en';
  units: 'metric' | 'imperial';
  precisionDecimals: number;
  autoSave: boolean;
  autoSaveInterval: number; // 分钟
  showTooltips: boolean;
  enableKeyboardShortcuts: boolean;
}

// ===== 项目元数据类型 =====
export interface ProjectMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  author: string;
  version: string;
  tags: string[];
  status: 'draft' | 'active' | 'completed' | 'archived';
}

// ===== 完整应用状态类型 =====
export interface AppState {
  ui: ExtendedUIState;
  workflow: WorkflowStatus;
  viewport: ViewportState;
  performance: PerformanceMetrics;
  config: ModuleConfig;
  user: UserPreferences;  
  project: ProjectMetadata;
  errors: AppError[];
  notifications: NotificationData[];
}

// ===== 事件类型 =====
export type AppEvent = 
  | { type: 'UI_MODE_CHANGED'; payload: ExtendedUIState['uiMode'] }
  | { type: 'WORKFLOW_STEP_CHANGED'; payload: number }
  | { type: 'ERROR_OCCURRED'; payload: AppError }
  | { type: 'NOTIFICATION_ADDED'; payload: NotificationData }
  | { type: 'GEOMETRY_UPDATED'; payload: any }
  | { type: 'QUALITY_FEEDBACK_RECEIVED'; payload: any };

// ===== Hook类型定义 =====
export interface UseAppStateReturn {
  state: AppState;
  dispatch: (event: AppEvent) => void;
  actions: {
    updateUIMode: (mode: ExtendedUIState['uiMode']) => void;
    advanceWorkflow: () => void;
    showNotification: (notification: Omit<NotificationData, 'id'>) => void;
    reportError: (error: Omit<AppError, 'timestamp'>) => void;
  };
}

// ===== 组件Props类型约定 =====
export interface BaseComponentProps {
  className?: string;
  style?: React.CSSProperties;
  testId?: string;
  loading?: boolean;
  disabled?: boolean;
}

export interface DataComponentProps<T> extends BaseComponentProps {
  data: T;
  onDataChange?: (data: T) => void;
  validation?: (data: T) => boolean;
}

export interface AsyncComponentProps extends BaseComponentProps {
  onSuccess?: () => void;
  onError?: (error: AppError) => void;
  retryable?: boolean;
}

// ===== 常用类型别名 =====
export type DataFlowStage = 'geology' | 'excavation' | 'support' | 'integration';
export type QualityLevel = 'excellent' | 'good' | 'fair' | 'poor';
export type ProcessingStatus = 'idle' | 'processing' | 'completed' | 'failed';
export type ValidationResult = 'valid' | 'invalid' | 'warning';