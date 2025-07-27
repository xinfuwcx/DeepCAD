/**
 * 几何建模服务架构 - 0号架构师为2号专家设计
 * 统一管理所有几何建模相关的服务接口和数据流
 */

import { GeologyModelingService } from './GeologyModelingService';
// import { ExcavationGeometryService } from './ExcavationGeometryService'; // 移除循环依赖
import { SupportStructureService } from './SupportStructureService';
import { GeometryQualityService } from './GeometryQualityService';

// ============== 核心数据类型定义 ==============

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface MaterialInfo {
  id: number;
  name: string;
  properties: Record<string, any>;
}

export interface GeometryModel {
  id: string;
  type: 'geology' | 'excavation' | 'support' | 'combined';
  vertices: Float32Array;
  faces: Uint32Array;
  materials?: MaterialInfo[];
  metadata: ModelMetadata;
  quality: QualityMetrics;
}

export interface ModelMetadata {
  createdAt: Date;
  createdBy: string;
  version: string;
  source: 'rbf_interpolation' | 'dxf_import' | 'parametric_generation';
  parameters: Record<string, any>;
}

export interface QualityMetrics {
  triangleCount: number;
  vertexCount: number;
  boundingBox: BoundingBox;
  volume: number;
  surfaceArea: number;
  meshReadiness: number; // 0-1, 网格适配性评分
}

export interface BoundingBox {
  min: Point3D;
  max: Point3D;
}

// ============== RBF插值配置 ==============
export interface RBFConfig {
  kernelType: 'gaussian' | 'multiquadric' | 'thinPlateSpline' | 'cubic';
  kernelParameter: number;
  smoothingFactor: number;
  maxIterations: number;
  tolerance: number;
  gridResolution: number;
}

export interface InterpolationResult {
  gridPoints: Point3D[];
  values: Float32Array;
  confidence: Float32Array;
  statistics: InterpolationStats;
}

export interface InterpolationStats {
  meanValue: number;
  stdDev: number;
  minValue: number;
  maxValue: number;
  rmse: number; // 均方根误差
}

// ============== 钻孔数据结构 ==============
export interface BoreholeData {
  holes: BoreholeInfo[];
  metadata: {
    project: string;
    coordinate: 'WGS84' | 'BJ54' | 'CGCS2000';
    elevation: 'absolute' | 'relative';
  };
}

export interface BoreholeInfo {
  id: string;
  name: string;
  location: Point3D;
  depth: number;
  layers: SoilLayer[];
  waterLevel?: number;
}

export interface SoilLayer {
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  properties: SoilProperties;
}

export interface SoilProperties {
  density: number;
  cohesion: number;
  frictionAngle: number;
  elasticModulus: number;
  poissonRatio: number;
  permeability: number;
}

// ============== CAD几何数据 ==============
export interface CADGeometry {
  entities: CADEntity[];
  layers: CADLayer[];
  boundingBox: BoundingBox;
  units: 'mm' | 'm' | 'inch' | 'feet';
}

export interface CADEntity {
  id: string;
  type: 'line' | 'arc' | 'circle' | 'polyline' | 'spline';
  layer: string;
  points: Point3D[];
  properties: Record<string, any>;
}

export interface CADLayer {
  name: string;
  color: string;
  lineType: string;
  visible: boolean;
}

// ============== 分层开挖配置 ==============
export interface LayerConfig {
  depth: number;
  excavationMethod: 'mechanical' | 'blasting' | 'hydraulic';
  supportInstallation: boolean;
  drainageRequired: boolean;
  constructionDays: number;
}

export interface ExcavationStats {
  totalVolume: number;
  surfaceArea: number;
  layers: LayerStats[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface LayerStats {
  layer: number;
  volume: number;
  soilType: string;
  difficulty: number; // 0-1 施工难度
}

// ============== 支护结构配置 ==============
export interface DiaphragmWallConfig {
  thickness: number;
  depth: number;
  length: number;
  concreteGrade: string;
  reinforcement: ReinforcementConfig;
  joints: JointConfig[];
}

export interface PileSystemConfig {
  pileType: 'bored' | 'driven' | 'jet_grouting';
  diameter: number;
  length: number;
  spacing: number;
  crownBeam: CrownBeamConfig;
  arrangement: 'linear' | 'curved' | 'corner';
}

export interface AnchorConfig {
  length: number;
  inclination: number; // 角度
  preStress: number;
  spacing: number;
  waleBeam: WaleBeamConfig;
}

export interface SteelSupportConfig {
  sectionType: 'H_beam' | 'box_beam' | 'pipe';
  sectionSize: string;
  levels: SupportLevelConfig[];
}

export interface ReinforcementConfig {
  mainRebar: string;
  stirrups: string;
  spacing: number;
  cover: number;
}

export interface JointConfig {
  position: number;
  type: 'construction' | 'expansion' | 'contraction';
  sealant: string;
}

export interface CrownBeamConfig {
  width: number;
  height: number;
  concreteGrade: string;
  reinforcement: ReinforcementConfig;
}

export interface WaleBeamConfig {
  sectionType: string;
  material: string;
  connections: ConnectionConfig[];
}

export interface SupportLevelConfig {
  elevation: number;
  preLoad: number;
  stiffness: number;
}

export interface ConnectionConfig {
  type: 'welded' | 'bolted' | 'pinned';
  strength: number;
}

// ============== 质量控制接口 ==============
export interface QualityReport {
  overall: 'excellent' | 'good' | 'acceptable' | 'poor';
  score: number; // 0-100
  issues: QualityIssue[];
  recommendations: string[];
}

export interface QualityIssue {
  severity: 'critical' | 'major' | 'minor';
  type: string;
  description: string;
  location?: Point3D;
  suggestedFix: string;
}

export interface MeshReadinessReport {
  ready: boolean;
  score: number; // 0-100
  criticalIssues: string[];
  recommendations: string[];
  estimatedMeshSize: number;
}

export interface CriticalRegion {
  id: string;
  type: 'sharp_edge' | 'thin_section' | 'high_curvature' | 'intersection';
  location: Point3D;
  severity: number; // 0-1
  suggestedMeshSize: number;
}

export interface OptimizationSuggestion {
  type: 'smooth_surface' | 'merge_vertices' | 'repair_holes' | 'simplify_geometry';
  priority: 'high' | 'medium' | 'low';
  description: string;
  expectedImprovement: number; // 0-1
}

export interface ValidationResult {
  valid: boolean;
  conflicts: ConflictInfo[];
  warnings: string[];
  structuralIntegrity: number; // 0-1
}

export interface ConflictInfo {
  type: 'intersection' | 'gap' | 'overlap' | 'incompatible_materials';
  objects: string[];
  severity: 'critical' | 'major' | 'minor';
  suggestion: string;
}

// ============== 与3号专家的协作接口 ==============
export interface MeshQualityFeedback {
  geometryId: string;
  meshQuality: number;
  problemAreas: ProblemArea[];
  suggestions: MeshOptimizationSuggestion[];
}

export interface QualityIssue {
  type: 'quality' | 'topology' | 'geometry';
  severity: 'info' | 'warning' | 'error';
  description: string;
  affectedElements: number[];
  suggestedFix: string;
}

export interface QualitySuggestion {
  type: 'geometry' | 'meshing' | 'optimization';
  priority: 'low' | 'medium' | 'high';
  description: string;
  affectedElements: number[];
}

export interface ProblemArea {
  region: BoundingBox;
  issue: 'high_aspect_ratio' | 'skewed_elements' | 'poor_jacobian';
  severity: number; // 0-1
}

export interface MeshOptimizationSuggestion {
  geometryModification: 'increase_fillet_radius' | 'smooth_transition' | 'add_guide_curves';
  targetRegion: BoundingBox;
  expectedImprovement: number;
}

export interface GeometryAdjustment {
  geometryId: string;
  type: 'refinement' | 'smoothing' | 'optimization' | 'repair';
  target: 'global' | 'local' | 'region';
  parameters: {
    region?: number[];
    factor?: number;
    [key: string]: any;
  };
  priority: 'low' | 'medium' | 'high';
  description: string;
}

// ============== 主服务架构类 ==============
export class GeometryArchitectureService {
  private geologyService: GeologyModelingService;
  // private excavationService: ExcavationGeometryService; // 移除循环依赖
  private supportService: SupportStructureService;
  private qualityService: GeometryQualityService;
  
  private modelCache = new Map<string, GeometryModel>();
  private operationQueue: GeometryOperation[] = [];
  
  constructor() {
    this.geologyService = new GeologyModelingService();
    // this.excavationService = new ExcavationGeometryService(); // 移除循环依赖
    this.supportService = new SupportStructureService();
    this.qualityService = new GeometryQualityService();
    
    this.initializeServices();
  }

  private async initializeServices(): Promise<void> {
    console.log('🏗️ 几何建模服务架构初始化中...');
    
    // 初始化各个服务
    await Promise.all([
      this.geologyService.initialize(),
      // this.excavationService.initialize(), // 移除循环依赖
      this.supportService.initialize(),
      this.qualityService.initialize()
    ]);
    
    console.log('✅ 几何建模服务架构初始化完成');
  }

  // ============== 统一几何模型管理 ==============
  public async createGeometryModel(
    type: GeometryModel['type'],
    data: any,
    config: any
  ): Promise<GeometryModel> {
    const modelId = this.generateModelId(type);
    
    let model: GeometryModel;
    
    switch (type) {
      case 'geology':
        model = await this.geologyService.createGeologyModel(data, config);
        break;
      case 'excavation':
        model = await this.excavationService.createExcavationModel(data, config);
        break;
      case 'support':
        model = await this.supportService.createSupportModel(data, config);
        break;
      case 'combined':
        model = await this.createCombinedModel(data, config);
        break;
      default:
        throw new Error(`Unsupported geometry type: ${type}`);
    }
    
    model.id = modelId;
    this.modelCache.set(modelId, model);
    
    return model;
  }

  public getGeometryModel(id: string): GeometryModel | undefined {
    return this.modelCache.get(id);
  }

  public async validateGeometryModel(id: string): Promise<QualityReport> {
    const model = this.modelCache.get(id);
    if (!model) {
      throw new Error(`Geometry model ${id} not found`);
    }
    
    return await this.qualityService.validateGeometry(model);
  }

  // ============== 几何操作队列管理 ==============
  public async queueGeometryOperation(operation: GeometryOperation): Promise<string> {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    operation.id = operationId;
    
    this.operationQueue.push(operation);
    
    // 异步处理操作
    this.processOperationQueue();
    
    return operationId;
  }

  private async processOperationQueue(): Promise<void> {
    while (this.operationQueue.length > 0) {
      const operation = this.operationQueue.shift()!;
      
      try {
        await this.executeGeometryOperation(operation);
      } catch (error) {
        console.error(`几何操作失败: ${operation.id}`, error);
        this.notifyOperationError(operation.id, error as Error);
      }
    }
  }

  private async executeGeometryOperation(operation: GeometryOperation): Promise<void> {
    switch (operation.type) {
      case 'boolean_operation':
        await this.excavationService.performBooleanOperation(
          operation.inputs[0],
          operation.inputs[1],
          operation.parameters.operation
        );
        break;
      case 'quality_check':
        await this.qualityService.performQualityCheck(operation.inputs[0]);
        break;
      case 'mesh_preparation':
        await this.qualityService.prepareMeshGeometry(operation.inputs[0]);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  // ============== 工具方法 ==============
  private generateModelId(type: string): string {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async createCombinedModel(data: any, config: any): Promise<GeometryModel> {
    // 组合模型创建逻辑
    throw new Error('Combined model creation not implemented yet');
  }

  private notifyOperationError(operationId: string, error: Error): void {
    console.error(`Operation ${operationId} failed:`, error);
    // 可以在这里添加错误通知机制
  }

  // ============== 与3号专家的协作接口 ==============
  public async sendGeometryToMeshModule(geometryId: string): Promise<void> {
    const model = this.modelCache.get(geometryId);
    if (!model) {
      throw new Error(`Geometry model ${geometryId} not found`);
    }

    // 发送几何数据给3号专家的网格模块
    const meshModule = await import('./geometryToMeshService');
    await meshModule.default.processGeometry(model);
  }

  public async receiveMeshQualityFeedback(feedback: MeshQualityFeedback): Promise<void> {
    const adjustments = await this.qualityService.processMeshQualityFeedback(feedback);
    
    for (const adjustment of adjustments) {
      await this.applyGeometryAdjustment(adjustment);
    }
  }

  private async applyGeometryAdjustment(adjustment: GeometryAdjustment): Promise<void> {
    const model = this.modelCache.get(adjustment.geometryId!);
    if (!model) {
      console.warn(`几何模型 ${adjustment.geometryId} 未找到，跳过调整`);
      return;
    }

    // 应用几何调整
    await this.qualityService.applyGeometryOptimization(model, adjustment);
    
    // 更新缓存
    this.modelCache.set(adjustment.geometryId!, model);
  }
}

// ============== 几何操作定义 ==============
export interface GeometryOperation {
  id?: string;
  type: 'boolean_operation' | 'quality_check' | 'mesh_preparation' | 'optimization';
  inputs: any[];
  parameters: Record<string, any>;
  priority: number; // 0-1, 1为最高优先级
}

// 导出单例实例
export const geometryArchitecture = new GeometryArchitectureService();
export default geometryArchitecture;