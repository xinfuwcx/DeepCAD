/**
 * 用户角色
 */
export enum UserRole {
  ADMIN = 'admin',
  ENGINEER = 'engineer',
  VIEWER = 'viewer'
}

/**
 * 用户信息
 */
export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole | string;
  company?: string;
  position?: string;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  preferences?: UserPreferences;
}

/**
 * 用户偏好设置
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: boolean;
  language: string;
}

/**
 * 项目类型定义
 */
export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  owner: string;
  collaborators?: string[];
  status: ProjectStatus | 'active' | 'archived' | 'deleted';
  thumbnail?: string;
  metadata: ProjectMetadata;
}

/**
 * 项目状态
 */
export enum ProjectStatus {
  ACTIVE = 'active',
  ARCHIVED = 'archived',
  DELETED = 'deleted'
}

/**
 * 项目元数据
 */
export interface ProjectMetadata {
  location?: string;
  client?: string;
  projectNumber?: string;
  tags?: string[];
  [key: string]: any;
}

/**
 * 计算域信息
 */
export interface DomainInfo {
  width: number;
  length: number;
  total_depth: number;
  volume?: number;
}

/**
 * 土层信息
 */
export interface SoilLayer {
  name: string;
  depth: number;
  color: number | string;
  properties?: {
    cohesion?: number;
    frictionAngle?: number;
    unitWeight?: number;
    elasticModulus?: number;
    poissonRatio?: number;
    [key: string]: any;
  } | Record<string, any>;
}

/**
 * 基坑信息
 */
export interface ExcavationInfo {
  depth: number;
  contour: Point[];
  volume?: number;
}

/**
 * 点坐标
 */
export interface Point {
  id: string;
  x: number;
  y: number;
  z?: number;
}

/**
 * 支护结构类型
 */
export enum SupportStructureType {
  WALL = 'wall',
  ANCHOR = 'anchor',
  STRUT = 'strut'
}

/**
 * 支护结构
 */
export interface SupportStructure {
  id: string;
  type: SupportStructureType;
  name: string;
  depth?: number;
  level?: number;
  points?: Point[];
  length?: number;
  angle?: number;
  params: Record<string, any>;
}

/**
 * 挖掘阶段
 */
export interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  color: string;
}

/**
 * 几何模型
 */
export interface GeometryModel {
  id: string;
  name: string;
  model_type: 'nurbs' | 'brep';
  control_points?: ControlPoint[];
  knot_vectors?: KnotVector[];
  weights?: number[];
  degrees?: number[];
  file_path?: string;
  created_at: string;
}

/**
 * NURBS控制点
 */
export interface ControlPoint {
  id: string;
  x: number;
  y: number;
  z: number;
  weight?: number;
}

/**
 * 节点矢量
 */
export interface KnotVector {
  direction: 'u' | 'v' | 'w';
  values: number[];
}

/**
 * IGA分析配置
 */
export interface IgaConfig {
  project_id: number;
  geometry_model_id: string;
  analysis_type: 'structural' | 'thermal' | 'coupled';
  material_model: string;
  solver: 'direct' | 'iterative' | 'amg';
  integration: string;
  nurbs_settings: NurbsSettings;
  nonlinear_settings?: NonlinearSettings;
  computation_settings: ComputationSettings;
}

/**
 * NURBS设置
 */
export interface NurbsSettings {
  refinement: 'h-refinement' | 'p-refinement' | 'k-refinement';
  refinement_level: number;
  boundary_conditions: BoundaryCondition[];
}

/**
 * 非线性设置
 */
export interface NonlinearSettings {
  use_nonlinear: boolean;
  max_iterations: number;
  tolerance: number;
  load_steps: number;
}

/**
 * 计算设置
 */
export interface ComputationSettings {
  use_parallel: boolean;
  num_cores?: number;
  save_intermediate: boolean;
}

/**
 * 边界条件
 */
export interface BoundaryCondition {
  id: string;
  type: 'fixed' | 'roller' | 'free' | 'prescribed';
  surface: string;
  value?: number;
  direction?: 'x' | 'y' | 'z';
}

/**
 * 网格配置
 */
export interface MeshConfig {
  project_id: number;
  element_type: string;
  element_size: number;
  min_element_size?: number;
  max_element_size?: number;
  refinement_factor?: number;
  refinement_regions?: RefinementRegion[];
  mesh_algorithm: string;
  quality_threshold?: number;
  boundary_conditions?: BoundaryCondition[];
}

/**
 * 网格加密区域
 */
export interface RefinementRegion {
  id: string;
  type: 'box' | 'sphere' | 'cylinder' | 'polygon';
  center?: Point;
  radius?: number;
  width?: number;
  height?: number;
  depth?: number;
  points?: Point[];
  refinement_factor: number;
}

/**
 * 网格信息
 */
export interface MeshInfo {
  project_id: number;
  nodes_count: number;
  elements_count: number;
  quality: number;
  status: string;
  created_at: string;
}

/**
 * 计算配置
 */
export interface ComputationConfig {
  project_id: number;
  analysis_type: 'static' | 'dynamic' | 'consolidation' | 'seepage';
  solver_type: string;
  max_iterations: number;
  convergence_tolerance: number;
  material_models: MaterialModel[];
  stages: ComputationStage[];
  advanced_settings?: Record<string, any>;
}

/**
 * 材料模型
 */
export interface MaterialModel {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, number>;
  assigned_to: string[];
}

/**
 * 计算阶段
 */
export interface ComputationStage {
  id: string;
  name: string;
  excavation_depth: number;
  active_supports: string[];
  time_step?: number;
  sub_steps?: number;
}

/**
 * 计算作业
 */
export interface ComputationJob {
  id: string;
  project_id: number;
  status: ComputationStatus;
  progress: number;
  started_at: string;
  finished_at?: string;
  error_message?: string;
}

/**
 * 计算状态
 */
export enum ComputationStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/**
 * 结果类型
 */
export enum ResultType {
  DISPLACEMENT = 'displacement',
  STRESS = 'stress',
  STRAIN = 'strain',
  SAFETY_FACTOR = 'safety_factor'
}

/**
 * 结果数据
 */
export interface ResultData {
  project_id: number;
  type: ResultType;
  stage_id?: string;
  data: any;
  metadata: Record<string, any>;
}

/**
 * 项目统计信息
 */
export interface ProjectStatistics {
  project_id: number;
  max_displacement: number;
  max_stress: number;
  min_safety_factor: number;
  computation_time: number;
  stages_completed: number;
}

/**
 * API响应基本结构
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * 模型响应
 */
export interface ModelResponse {
  id: number;
  message: string;
  model_info: Record<string, any>;
}

/**
 * 物理AI模型配置
 */
export interface PhysicsAIConfig {
  model_type: string;
  parameters: Record<string, any>;
  training_data: string[];
  validation_data: string[];
  epochs: number;
  batch_size: number;
  learning_rate: number;
  message: string;
  model_info: Record<string, any>;
}

/**
 * 基坑几何数据
 */
export interface ExcavationGeometryData {
  width: number;
  length: number;
  depth: number;
  shape?: 'rectangular' | 'circular' | 'irregular';
  irregularGeometry?: any; // 不规则形状的几何数据
}

/**
 * 支护结构
 */
export interface SupportStructures {
  diaphragmWall?: {
    thickness: number;
    depth: number;
    material: string;
  };
  struts?: {
    levels: number;
    spacing: number;
    diameter: number;
    material: string;
  };
  anchors?: {
    levels: number;
    spacing: number;
    length: number;
    angle: number;
    prestress: number;
  };
}

/**
 * 基坑模型
 */
export interface ExcavationModel {
  id: string;
  name: string;
  description?: string;
  geometryData: ExcavationGeometryData;
  soilLayers?: SoilLayer[];
  supportStructures?: SupportStructures;
  waterLevel?: number;
  surroundingBuildings?: any[];
  constructionStages?: any[];
  createdAt: string;
  updatedAt: string;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  id: string;
  modelId: string;
  type: 'displacement' | 'stress' | 'settlement' | 'stability';
  data: any;
  createdAt: string;
  maxValue: number;
  minValue: number;
}

/**
 * 通知
 */
export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  read: boolean;
  createdAt: string;
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * IGA分析参数
 */
export interface IgaAnalysisParams {
  modelId: string;
  analysisType: 'static' | 'dynamic' | 'seepage';
  nurbs: {
    degree: [number, number, number];
    controlPoints: number;
    weights?: number[];
  };
  solver: {
    type: 'direct' | 'iterative';
    tolerance: number;
    maxIterations?: number;
  };
  constitutiveModel: string;
  timeSteps?: number;
} 