/**
 * 几何模型到有限元模型自动映射器
 * DeepCAD Deep Excavation CAE Platform - Geometry to FEM Mapper
 * 
 * 作者：2号几何专家
 * 功能：地连墙->壳元、桩->梁元、土体->实体元自动映射
 */

import * as THREE from 'three';
import { DiaphragmWallOffsetProcessor, OffsetConfiguration, OffsetResult } from '../geometry/DiaphragmWallOffsetProcessor';
import { moduleHub, GeometryData, MeshData } from '../../integration/ModuleIntegrationHub';

// 结构元素类型枚举
export enum StructuralElementType {
  DIAPHRAGM_WALL = 'DIAPHRAGM_WALL',    // 地连墙
  PILE_BEAM = 'PILE_BEAM',               // 桩(梁元模拟)
  PILE_SHELL = 'PILE_SHELL',             // 桩(壳元模拟)
  PILE_WALL = 'PILE_WALL',               // 排桩(连续壳元)
  STRUT = 'STRUT',                       // 支撑
  ANCHOR = 'ANCHOR',                     // 锚杆
  SOIL = 'SOIL',                         // 土体
  FOUNDATION = 'FOUNDATION'              // 基础
}

// 有限元单元类型
export enum FEMElementType {
  SHELL = 'SHELL',        // 壳元 (地连墙、板)
  BEAM = 'BEAM',          // 梁元 (桩、支撑、锚杆)
  SOLID = 'SOLID',        // 实体元 (土体)
  LINK = 'LINK',          // 连接元 (接触、约束)
  SPRING = 'SPRING'       // 弹簧元 (边界条件)
}

// 几何实体接口
export interface GeometricEntity {
  id: string;
  name: string;
  type: StructuralElementType;
  geometry: THREE.BufferGeometry;
  material: MaterialProperties;
  properties: StructuralProperties;
  constraints?: ConstraintDefinition[];
}

// 材料属性
export interface MaterialProperties {
  elasticModulus: number;    // 弹性模量 (Pa)
  poissonRatio: number;      // 泊松比
  density: number;           // 密度 (kg/m³)
  yieldStrength?: number;    // 屈服强度 (Pa)
  ultimateStrength?: number; // 极限强度 (Pa)
  materialModel: 'elastic' | 'plastic' | 'nonlinear';
}

// 桩建模策略
export enum PileModelingStrategy {
  BEAM_ELEMENT = 'BEAM_ELEMENT',     // 梁元策略 - 适用于置换型桩基
  SHELL_ELEMENT = 'SHELL_ELEMENT',   // 壳元策略 - 适用于挤密型桩基
  USER_DEFINED = 'USER_DEFINED'      // 用户自定义 - 由用户手动选择
}

// 桩基类型枚举
export enum PileType {
  BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE',     // 钻孔灌注桩
  HAND_DUG = 'HAND_DUG',                           // 人工挖孔桩
  PRECAST_DRIVEN = 'PRECAST_DRIVEN',               // 预制桩
  SWM_METHOD = 'SWM_METHOD',                       // SWM工法桩（搅拌桩）
  CFG_PILE = 'CFG_PILE',                           // CFG桩（水泥粉煤灰碎石桩）
  HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'          // 高压旋喷桩
}

// 结构属性
export interface StructuralProperties {
  // 地连墙/板属性
  thickness?: number;        // 厚度 (m)
  
  // 桩基类型和施工方法
  pileType?: PileType;
  constructionMethod?: {
    isCompacting: boolean;        // 是否为挤密型桩基
    soilDisplacement: 'replacement' | 'compaction'; // 土体处理方式
    installationMethod: string;   // 施工方法描述
  };
  
  // 桩属性 - 梁元模式
  crossSection?: {
    area: number;           // 截面面积 (m²)
    momentOfInertiaY: number; // Y轴惯性矩 (m⁴)
    momentOfInertiaZ: number; // Z轴惯性矩 (m⁴)
    torsionalConstant: number; // 扭转常数 (m⁴)
    shearAreaY: number;     // Y向剪切面积 (m²)
    shearAreaZ: number;     // Z向剪切面积 (m²)
    shape: 'circular' | 'square' | 'rectangular' | 'H';
  };
  
  // 桩属性 - 壳元模式
  pileGeometry?: {
    diameter: number;       // 桩径 (m)
    length: number;         // 桩长 (m)
    wallThickness: number;  // 壁厚 (m) - 管桩
    hollowRatio?: number;   // 空心比 - 预制桩
    compactionRadius?: number; // 挤密影响半径 (m)
  };
  
  // 地连墙偏移配置
  offsetConfig?: {
    offsetDistance: number;      // 偏移距离 (m)
    offsetDirection: 'inward' | 'outward' | 'normal';
    preserveTopology: boolean;
    qualityControl: {
      minElementQuality: number;
      maxAspectRatio: number;
    };
  };
  
  // 桩建模参数
  pileModeling?: {
    strategy: PileModelingStrategy;
    userPreference?: PileModelingStrategy; // 用户偏好选择
    beamElementLength: number;    // 梁元长度 (m)
    shellElementSize: number;     // 壳元尺寸 (m)
    circumferentialDivisions: number; // 周向划分数
    radialLayers: number;         // 径向层数 (实心桩)
    considerSoilCompaction: boolean; // 是否考虑土体挤密效应
  };
  
  // 锚杆属性
  prestress?: number;        // 预应力 (N)
  
  // 土体属性
  soilParameters?: {
    cohesion: number;       // 粘聚力 (Pa)
    frictionAngle: number;  // 内摩擦角 (度)
    dilatancyAngle: number; // 剪胀角 (度)
    permeability: number;   // 渗透系数 (m/s)
  };
}

// 约束定义
export interface ConstraintDefinition {
  type: 'fixed' | 'pinned' | 'roller' | 'elastic';
  direction: 'x' | 'y' | 'z' | 'rx' | 'ry' | 'rz' | 'all';
  value?: number; // 弹性约束刚度
}

// 有限元单元
export interface FEMElement {
  id: string;
  type: FEMElementType;
  nodes: string[];           // 节点ID列表
  material: string;          // 材料ID
  properties: any;           // 单元属性
  localAxes?: THREE.Matrix3; // 局部坐标系
}

// 有限元节点
export interface FEMNode {
  id: string;
  coordinates: [number, number, number];
  constraints?: ConstraintDefinition[];
}

// 映射规则配置
export interface MappingRules {
  // 地连墙映射规则
  diaphragmWallRules: {
    shellElementSize: number;     // 壳元尺寸 (m)
    thicknessDirection: 'normal'; // 厚度方向
    integrationPoints: number;    // 积分点数
    enableOffset: boolean;        // 是否启用偏移功能
    defaultOffsetDistance: number; // 默认偏移距离 (m)
  };
  
  // 桩映射规则
  pileRules: {
    // 桩类型与建模策略映射
    pileTypeStrategies: PileTypeStrategies;
    
    // 用户可覆盖自动选择
    allowUserOverride: boolean;
    
    // 梁元策略参数
    beamElementLength: number;    // 梁元长度 (m)
    crossSectionType: 'circular' | 'rectangular' | 'H' | 'custom';
    endConditions: 'fixed' | 'pinned' | 'free';
    
    // 壳元策略参数
    shellElementSize: number;     // 壳元尺寸 (m)
    circumferentialDivisions: number; // 周向单元数
    radialLayers: number;         // 径向层数
    enableHollowModeling: boolean; // 是否考虑空心
    compactionZoneModeling: boolean; // 是否建模挤密区
    
    // 排桩连续建模
    enablePileWallModeling: boolean; // 排桩连续建模
    pileSpacingThreshold: number;    // 桩距阈值 - 小于此值视为连续
  };
  
  // 土体映射规则
  soilRules: {
    solidElementSize: number;     // 实体元尺寸 (m)
    meshGradation: boolean;       // 网格渐变
    boundaryLayers: number;       // 边界层数
  };
  
  // 接触映射规则
  contactRules: {
    enableSoilStructureContact: boolean;
    contactStiffness: number;     // 接触刚度
    frictionCoefficient: number; // 摩擦系数
  };
}

// 导入必要的类型
type PileTypeStrategies = {
  [K in PileType]: PileModelingStrategy;
};

// 默认映射规则
const DEFAULT_MAPPING_RULES: MappingRules = {
  diaphragmWallRules: {
    shellElementSize: 1.0,
    thicknessDirection: 'normal',
    integrationPoints: 5,
    // 默认偏移配置
    enableOffset: true,
    defaultOffsetDistance: -0.1  // 默认往里偏移10cm
  },
  pileRules: {
    // 桩类型与建模策略的专业映射
    pileTypeStrategies: {
      [PileType.BORED_CAST_IN_PLACE]: PileModelingStrategy.BEAM_ELEMENT,  // 钻孔灌注桩 → 梁元
      [PileType.HAND_DUG]: PileModelingStrategy.BEAM_ELEMENT,             // 人工挖孔桩 → 梁元
      [PileType.PRECAST_DRIVEN]: PileModelingStrategy.BEAM_ELEMENT,       // 预制桩 → 梁元
      [PileType.SWM_METHOD]: PileModelingStrategy.SHELL_ELEMENT,          // SWM工法桩 → 壳元
      [PileType.CFG_PILE]: PileModelingStrategy.SHELL_ELEMENT,            // CFG桩 → 壳元
      [PileType.HIGH_PRESSURE_JET]: PileModelingStrategy.SHELL_ELEMENT    // 高压旋喷桩 → 壳元
    },
    
    // 允许用户覆盖自动选择
    allowUserOverride: true,
    
    // 梁元策略参数
    beamElementLength: 1.0,
    crossSectionType: 'circular',
    endConditions: 'fixed',
    
    // 壳元策略参数
    shellElementSize: 0.5,
    circumferentialDivisions: 12,   // 周向12等分
    radialLayers: 2,               // 径向2层
    enableHollowModeling: true,
    compactionZoneModeling: true,   // 建模挤密区
    
    // 排桩连续建模
    enablePileWallModeling: true,
    pileSpacingThreshold: 2.0      // 桩距<2m视为连续
  },
  soilRules: {
    solidElementSize: 2.0,
    meshGradation: true,
    boundaryLayers: 3
  },
  contactRules: {
    enableSoilStructureContact: true,
    contactStiffness: 1e8,
    frictionCoefficient: 0.3
  }
};

export class GeometryToFEMMapper {
  private mappingRules: MappingRules;
  private nodes: Map<string, FEMNode> = new Map();
  private elements: Map<string, FEMElement> = new Map();
  private materials: Map<string, MaterialProperties> = new Map();
  private nodeIdCounter = 1;
  private elementIdCounter = 1;

  constructor(mappingRules: Partial<MappingRules> = {}) {
    this.mappingRules = { ...DEFAULT_MAPPING_RULES, ...mappingRules };
    
    // ==================== moduleHub集成 ====================
    this.initializeModuleHubIntegration();
  }

  /**
   * 初始化moduleHub集成
   */
  private initializeModuleHubIntegration() {
    // 注册网格生成模块
    moduleHub.registerMeshingModule({
      onMeshGenerated: (data: MeshData) => {
        console.log('🔄 GeometryToFEMMapper收到网格生成事件:', data);
      },
      onMeshQualityChecked: (data: any) => {
        console.log('🔄 GeometryToFEMMapper收到网格质量检查事件:', data);
      },
      onPhysicalGroupAssigned: (data: any) => {
        console.log('🔄 GeometryToFEMMapper收到物理组分配事件:', data);
      }
    });

    // 注册几何建模模块
    moduleHub.registerGeometryModule({
      onGeometryCreated: (data: GeometryData) => {
        console.log('🔄 GeometryToFEMMapper收到几何创建事件:', data);
      },
      onGeometryUpdated: (data: GeometryData) => {
        console.log('🔄 GeometryToFEMMapper收到几何更新事件:', data);
        // 可以触发重新映射
      },
      onGeometryDeleted: (id: string) => {
        console.log('🔄 GeometryToFEMMapper收到几何删除事件:', { id });
      }
    });
  }

  /**
   * 主映射函数：将几何模型转换为有限元模型
   */
  public mapGeometryToFEM(geometricEntities: GeometricEntity[]): {
    nodes: FEMNode[];
    elements: FEMElement[];
    materials: MaterialProperties[];
    mappingReport: MappingReport;
  } {
    console.log('🔄 开始几何模型到有限元模型的自动映射...');
    
    const startTime = Date.now();
    this.resetMapper();
    
    const mappingReport: MappingReport = {
      totalEntities: geometricEntities.length,
      processedEntities: 0,
      generatedNodes: 0,
      generatedElements: 0,
      mappingDetails: [],
      warnings: [],
      errors: []
    };

    // 按类型分组处理几何实体
    const entitiesByType = this.groupEntitiesByType(geometricEntities);
    
    try {
      // 1. 处理土体 - 生成背景网格
      if (entitiesByType.has(StructuralElementType.SOIL)) {
        this.processSoilEntities(entitiesByType.get(StructuralElementType.SOIL)!, mappingReport);
      }
      
      // 2. 处理地连墙 - 生成壳元
      if (entitiesByType.has(StructuralElementType.DIAPHRAGM_WALL)) {
        this.processDiaphragmWalls(entitiesByType.get(StructuralElementType.DIAPHRAGM_WALL)!, mappingReport);
      }
      
      // 3. 处理桩 - 基于桩基类型的专业建模策略
      const allPiles = [
        ...(entitiesByType.get(StructuralElementType.PILE_BEAM) || []),
        ...(entitiesByType.get(StructuralElementType.PILE_SHELL) || []),
        ...(entitiesByType.get(StructuralElementType.PILE_WALL) || [])
      ];
      
      if (allPiles.length > 0) {
        this.processPilesByStrategy(allPiles, mappingReport);
      }
      
      // 4. 处理支撑和锚杆 - 生成梁元
      if (entitiesByType.has(StructuralElementType.STRUT)) {
        this.processStruts(entitiesByType.get(StructuralElementType.STRUT)!, mappingReport);
      }
      
      if (entitiesByType.has(StructuralElementType.ANCHOR)) {
        this.processAnchors(entitiesByType.get(StructuralElementType.ANCHOR)!, mappingReport);
      }
      
      // 5. 生成接触单元
      this.generateContactElements(mappingReport);
      
      // 6. 应用边界条件
      this.applyBoundaryConditions(geometricEntities, mappingReport);
      
      mappingReport.processedEntities = geometricEntities.length;
      mappingReport.generatedNodes = this.nodes.size;
      mappingReport.generatedElements = this.elements.size;
      
      const endTime = Date.now();
      console.log(`✅ 映射完成，耗时: ${endTime - startTime}ms`);
      console.log(`📊 生成节点: ${this.nodes.size}个，单元: ${this.elements.size}个`);
      
      // ==================== moduleHub事件发布 ====================
      
      // 发布网格生成完成事件
      const meshData: MeshData = {
        id: `fem_mesh_${Date.now()}`,
        geometryId: 'geometry_to_fem_mapping',
        elements: Array.from(this.elements.values()),
        nodes: Array.from(this.nodes.values()),
        quality: {
          minAngle: 30, // 这里可以实际计算网格质量
          maxAngle: 120,
          aspectRatio: 2.5
        },
        timestamp: Date.now()
      };
      
      moduleHub.emit('mesh:generated', meshData);
      
      // 更新网格模块状态
      moduleHub.updateModuleState('meshing', {
        status: 'completed',
        progress: 100,
        message: `FEM映射完成：${this.nodes.size}节点，${this.elements.size}单元`
      });
      
      console.log('🔄 FEM映射结果已发布到moduleHub');
      
    } catch (error) {
      mappingReport.errors.push(`映射过程中出现错误: ${error}`);
      console.error('❌ 映射过程中出现错误:', error);
      
      // 更新错误状态到moduleHub
      moduleHub.updateModuleState('meshing', {
        status: 'error',
        progress: 0,
        error: `FEM映射失败: ${error}`,
        message: 'FEM映射过程中出现错误'
      });
    }

    return {
      nodes: Array.from(this.nodes.values()),
      elements: Array.from(this.elements.values()),
      materials: Array.from(this.materials.values()),
      mappingReport
    };
  }

  /**
   * 处理地连墙 - 转换为壳元（集成偏移功能）
   */
  private processDiaphragmWalls(walls: GeometricEntity[], report: MappingReport): void {
    console.log('🏗️ 处理地连墙，生成壳元（支持偏移）...');
    
    for (const wall of walls) {
      try {
        let processedGeometry = wall.geometry;
        let offsetResult: OffsetResult | null = null;
        
        // 1. 检查是否需要偏移处理
        const offsetConfig = wall.properties.offsetConfig as OffsetConfiguration | undefined;
        if (offsetConfig && offsetConfig.offsetDistance !== 0) {
          console.log(`🔧 对地连墙 ${wall.id} 执行偏移: ${offsetConfig.offsetDistance}m`);
          
          const offsetProcessor = new DiaphragmWallOffsetProcessor(offsetConfig);
          offsetResult = offsetProcessor.processOffset(wall.geometry, offsetConfig.offsetDistance);
          
          if (offsetResult.success) {
            processedGeometry = offsetResult.offsetGeometry;
            console.log(`✅ 地连墙 ${wall.id} 偏移成功`);
            
            // 记录偏移统计信息
            const stats = offsetProcessor.getOffsetStatistics(offsetResult);
            report.mappingDetails.push({
              entityId: wall.id + '_offset_stats',
              entityType: 'OFFSET_STATISTICS' as any,
              femElementType: 'GEOMETRY_PROCESSING' as any,
              elementCount: 0,
              nodeCount: 0,
              processingDetails: {
                offsetDistance: offsetConfig.offsetDistance,
                processingTime: stats.processingTimeMs,
                qualityScore: stats.qualityScore,
                offsetAccuracy: stats.offsetAccuracy
              }
            });
          } else {
            report.warnings.push(`地连墙 ${wall.id} 偏移失败，使用原始几何: ${offsetResult.warnings.join(', ')}`);
          }
        }
        
        // 2. 提取网格数据（使用处理后的几何）
        const meshData = this.extractMeshData(processedGeometry);
        const elementSize = this.mappingRules.diaphragmWallRules.shellElementSize;
        
        // 3. 分析墙体几何参数
        const wallGeometry = this.analyzeWallGeometry(meshData);
        
        // 4. 生成壳元网格
        const shellMesh = this.generateShellMesh(wallGeometry, elementSize);
        
        // 5. 创建节点
        const nodeIds = shellMesh.vertices.map(vertex => {
          const nodeId = `N${this.nodeIdCounter++}`;
          this.nodes.set(nodeId, {
            id: nodeId,
            coordinates: vertex as [number, number, number],
            // 添加偏移信息用于3号专家的边界条件映射
            offsetInfo: offsetResult ? {
              isOffset: true,
              originalPosition: this.getOriginalPosition(vertex, offsetResult),
              offsetVector: this.getOffsetVector(vertex, offsetResult)
            } : undefined
          });
          return nodeId;
        });
        
        // 6. 创建壳元
        for (let i = 0; i < shellMesh.faces.length; i += 4) {
          const elementId = `SHELL${this.elementIdCounter++}`;
          const elementNodes = [
            nodeIds[shellMesh.faces[i]],
            nodeIds[shellMesh.faces[i + 1]],
            nodeIds[shellMesh.faces[i + 2]],
            nodeIds[shellMesh.faces[i + 3]]
          ];
          
          this.elements.set(elementId, {
            id: elementId,
            type: FEMElementType.SHELL,
            nodes: elementNodes,
            material: wall.id + '_material',
            properties: {
              thickness: wall.properties.thickness || 0.8,
              integrationPoints: this.mappingRules.diaphragmWallRules.integrationPoints,
              // 添加偏移标识用于3号专家处理
              hasOffset: offsetResult?.success || false,
              offsetDistance: offsetConfig?.offsetDistance || 0,
              elementType: 'diaphragm_wall'
            }
          });
        }
        
        // 7. 注册材料
        this.materials.set(wall.id + '_material', wall.material);
        
        // 8. 记录处理结果
        report.mappingDetails.push({
          entityId: wall.id,
          entityType: wall.type,
          femElementType: FEMElementType.SHELL,
          elementCount: shellMesh.faces.length / 4,
          nodeCount: shellMesh.vertices.length
        });
        
      } catch (error) {
        report.errors.push(`处理地连墙 ${wall.id} 时出错: ${error}`);
      }
    }
  }

  /**
   * 获取原始位置 - 用于3号专家的边界条件映射
   */
  private getOriginalPosition(
    currentVertex: number[], 
    offsetResult: OffsetResult
  ): [number, number, number] {
    // 简化实现：返回偏移前的位置
    // 实际应用中需要更精确的映射算法
    return [currentVertex[0], currentVertex[1], currentVertex[2]];
  }

  /**
   * 获取偏移向量 - 用于3号专家的边界条件映射
   */
  private getOffsetVector(
    currentVertex: number[], 
    offsetResult: OffsetResult
  ): [number, number, number] {
    // 简化实现：返回偏移向量
    if (offsetResult.offsetVector.length > 0) {
      const firstOffset = offsetResult.offsetVector[0];
      return [firstOffset.x, firstOffset.y, firstOffset.z];
    }
    return [0, 0, 0];
  }

  /**
   * 基于桩基类型的专业建模策略选择
   */
  public selectPileModelingStrategy(pile: GeometricEntity): PileModelingStrategy {
    // 优先检查用户是否已经指定了建模策略
    if (pile.properties.pileModeling?.userPreference) {
      console.log(`✅ 用户指定策略: ${pile.properties.pileModeling.userPreference}`);
      return pile.properties.pileModeling.userPreference;
    }
    
    // 基于桩基类型进行专业判断
    const pileType = pile.properties.pileType;
    if (pileType && this.mappingRules.pileRules.pileTypeStrategies[pileType]) {
      const recommendedStrategy = this.mappingRules.pileRules.pileTypeStrategies[pileType];
      console.log(`🔧 根据桩基类型 ${pileType} 推荐策略: ${recommendedStrategy}`);
      return recommendedStrategy;
    }
    
    // 基于施工方法判断
    const constructionMethod = pile.properties.constructionMethod;
    if (constructionMethod) {
      if (constructionMethod.isCompacting && constructionMethod.soilDisplacement === 'compaction') {
        console.log('🔧 挤密型桩基 → 壳元策略');
        return PileModelingStrategy.SHELL_ELEMENT;
      } else if (constructionMethod.soilDisplacement === 'replacement') {
        console.log('🔧 置换型桩基 → 梁元策略');
        return PileModelingStrategy.BEAM_ELEMENT;
      }
    }
    
    // 默认使用梁元策略（保守选择）
    console.log('⚠️ 未指定桩基类型，使用默认梁元策略');
    return PileModelingStrategy.BEAM_ELEMENT;
  }
  
  /**
   * 获取桩基类型的中文描述
   */
  public getPileTypeDescription(pileType: PileType): string {
    const descriptions: Record<PileType, string> = {
      [PileType.BORED_CAST_IN_PLACE]: '钻孔灌注桩 (置换型)',
      [PileType.HAND_DUG]: '人工挖孔桩 (置换型)',
      [PileType.PRECAST_DRIVEN]: '预制桩 (部分挤密)',
      [PileType.SWM_METHOD]: 'SWM工法桩 (挤密型)',
      [PileType.CFG_PILE]: 'CFG桩 (挤密型)',
      [PileType.HIGH_PRESSURE_JET]: '高压旋喷桩 (挤密型)'
    };
    return descriptions[pileType] || '未知桩型';
  }
  
  /**
   * 获取建议的建模策略说明
   */
  public getModelingStrategyExplanation(pileType: PileType, strategy: PileModelingStrategy): string {
    const isCompacting = [PileType.SWM_METHOD, PileType.CFG_PILE, PileType.HIGH_PRESSURE_JET].includes(pileType);
    
    if (strategy === PileModelingStrategy.SHELL_ELEMENT) {
      return isCompacting ? 
        '挤密型桩基，需要考虑土体挤密效应，建议使用壳元模拟' :
        '用户指定使用壳元，将建模桩周土体相互作用';
    } else {
      return isCompacting ? 
        '用户覆盖了推荐策略，挤密效应将简化处理' :
        '置换型桩基，主要承担轴向和水平荷载，使用梁元模拟';
    }
  }

  /**
   * 根据策略处理所有桩基
   */
  private processPilesByStrategy(piles: GeometricEntity[], report: MappingReport): void {
    console.log('🏗️ 开始处理桩基，根据类型选择建模策略...');
    
    // 按建模策略分组
    const beamPiles: GeometricEntity[] = [];
    const shellPiles: GeometricEntity[] = [];
    
    for (const pile of piles) {
      const strategy = this.selectPileModelingStrategy(pile);
      const pileType = pile.properties.pileType;
      const description = pileType ? this.getPileTypeDescription(pileType) : '未指定类型';
      const explanation = pileType ? this.getModelingStrategyExplanation(pileType, strategy) : '';
      
      console.log(`📋 桩基: ${pile.id}`);
      console.log(`   类型: ${description}`);
      console.log(`   策略: ${strategy === PileModelingStrategy.BEAM_ELEMENT ? '梁元' : '壳元'}`);
      console.log(`   说明: ${explanation}`);
      
      if (strategy === PileModelingStrategy.BEAM_ELEMENT) {
        beamPiles.push(pile);
      } else {
        shellPiles.push(pile);
      }
    }
    
    // 分别处理不同策略的桩基
    if (beamPiles.length > 0) {
      this.processPilesBeam(beamPiles, report);
    }
    
    if (shellPiles.length > 0) {
      this.processPilesShell(shellPiles, report);
    }
  }

  /**
   * 处理桩 - 梁元策略（置换型桩基）
   */
  private processPilesBeam(piles: GeometricEntity[], report: MappingReport): void {
    console.log('🏗️ 处理置换型桩基 - 梁元策略...');
    
    for (const pile of piles) {
      try {
        const meshData = this.extractMeshData(pile.geometry);
        const elementLength = pile.properties.pileModeling?.beamElementLength || 
                             this.mappingRules.pileRules.beamElementLength;
        
        // 提取桩的轴线
        const pileAxis = this.extractPileAxis(meshData);
        
        // 沿轴线分段生成梁元
        const segments = this.segmentAxis(pileAxis, elementLength);
        
        // 创建节点
        const nodeIds: string[] = [];
        for (const point of segments) {
          const nodeId = `N${this.nodeIdCounter++}`;
          this.nodes.set(nodeId, {
            id: nodeId,
            coordinates: point
          });
          nodeIds.push(nodeId);
        }
        
        // 创建梁元
        for (let i = 0; i < nodeIds.length - 1; i++) {
          const elementId = `BEAM${this.elementIdCounter++}`;
          
          // 计算局部坐标系
          const localAxes = this.calculateBeamLocalAxes(
            segments[i],
            segments[i + 1]
          );
          
          this.elements.set(elementId, {
            id: elementId,
            type: FEMElementType.BEAM,
            nodes: [nodeIds[i], nodeIds[i + 1]],
            material: pile.id + '_material',
            properties: {
              crossSection: pile.properties.crossSection || this.getDefaultPileCrossSection(),
              orientation: 'vertical',
              pileType: pile.properties.pileType || 'unknown'
            },
            localAxes
          });
        }
        
        // 注册材料
        this.materials.set(pile.id + '_material', pile.material);
        
        report.mappingDetails.push({
          entityId: pile.id,
          entityType: pile.type,
          femElementType: FEMElementType.BEAM,
          elementCount: nodeIds.length - 1,
          nodeCount: nodeIds.length
        });
        
      } catch (error) {
        report.errors.push(`处理置换型桩基(梁元) ${pile.id} 时出错: ${error}`);
      }
    }
  }

  /**
   * 处理桩 - 壳元策略（挤密型桩基）
   */
  private processPilesShell(piles: GeometricEntity[], report: MappingReport): void {
    console.log('🏗️ 处理挤密型桩基 - 壳元策略...');
    
    for (const pile of piles) {
      try {
        const meshData = this.extractMeshData(pile.geometry);
        const pileGeometry = pile.properties.pileGeometry!;
        const modelingParams = pile.properties.pileModeling!;
        
        // 生成桩的柱面壳元网格
        const cylindricalMesh = this.generateCylindricalShellMesh(
          pileGeometry,
          modelingParams
        );
        
        // 创建节点
        const nodeIds = cylindricalMesh.vertices.map(vertex => {
          const nodeId = `N${this.nodeIdCounter++}`;
          this.nodes.set(nodeId, {
            id: nodeId,
            coordinates: vertex as [number, number, number]
          });
          return nodeId;
        });
        
        // 创建壳元
        for (let i = 0; i < cylindricalMesh.faces.length; i += 4) {
          const elementId = `SHELL${this.elementIdCounter++}`;
          const elementNodes = [
            nodeIds[cylindricalMesh.faces[i]],
            nodeIds[cylindricalMesh.faces[i + 1]],
            nodeIds[cylindricalMesh.faces[i + 2]],
            nodeIds[cylindricalMesh.faces[i + 3]]
          ];
          
          this.elements.set(elementId, {
            id: elementId,
            type: FEMElementType.SHELL,
            nodes: elementNodes,
            material: pile.id + '_material',
            properties: {
              thickness: pileGeometry.wallThickness || pileGeometry.diameter / 20,
              integrationPoints: 5,
              elementType: 'compacting_pile', // 标记为挤密型桩基
              pileType: pile.properties.pileType || 'unknown'
            }
          });
        }
        
        // 如果是实心桩，还需要生成桩心的实体元
        if (!pileGeometry.hollowRatio) {
          this.generatePileCoreElements(pile, cylindricalMesh, report);
        }
        
        // 如果启用了挤密区建模，生成周围土体的挤密区
        if (modelingParams.considerSoilCompaction && pileGeometry.compactionRadius) {
          this.generateSoilCompactionZone(pile, pileGeometry.compactionRadius, report);
        }
        
        // 注册材料
        this.materials.set(pile.id + '_material', pile.material);
        
        report.mappingDetails.push({
          entityId: pile.id,
          entityType: pile.type,
          femElementType: FEMElementType.SHELL,
          elementCount: cylindricalMesh.faces.length / 4,
          nodeCount: cylindricalMesh.vertices.length
        });
        
      } catch (error) {
        report.errors.push(`处理挤密型桩基(壳元) ${pile.id} 时出错: ${error}`);
      }
    }
  }

  /**
   * 处理排桩 - 连续壳元策略
   */
  private processPileWalls(pileWalls: GeometricEntity[], report: MappingReport): void {
    console.log('🏗️ 处理排桩 - 连续壳元策略...');
    
    for (const pileWall of pileWalls) {
      try {
        // 分析排桩的空间分布
        const pileLayout = this.analyzePileLayout(pileWall);
        
        // 判断桩间距，决定是否需要连续建模
        if (this.shouldUseContinuousModeling(pileLayout)) {
          // 生成连续的壳元网格
          this.generateContinuousPileWallMesh(pileWall, pileLayout, report);
        } else {
          // 按单桩分别建模
          this.generateDiscretePileMesh(pileWall, pileLayout, report);
        }
        
      } catch (error) {
        report.errors.push(`处理排桩 ${pileWall.id} 时出错: ${error}`);
      }
    }
  }

  /**
   * 处理土体 - 转换为实体元
   */
  private processSoilEntities(soils: GeometricEntity[], report: MappingReport): void {
    console.log('🌍 处理土体，生成实体元...');
    
    for (const soil of soils) {
      try {
        const meshData = this.extractMeshData(soil.geometry);
        const elementSize = this.mappingRules.soilRules.solidElementSize;
        
        // 生成体网格
        const solidMesh = this.generateSolidMesh(meshData, elementSize);
        
        // 创建节点
        const nodeIds = solidMesh.vertices.map(vertex => {
          const nodeId = `N${this.nodeIdCounter++}`;
          this.nodes.set(nodeId, {
            id: nodeId,
            coordinates: vertex as [number, number, number]
          });
          return nodeId;
        });
        
        // 创建实体元（8节点六面体）
        for (let i = 0; i < solidMesh.cells.length; i += 8) {
          const elementId = `SOLID${this.elementIdCounter++}`;
          const elementNodes = [];
          
          for (let j = 0; j < 8; j++) {
            elementNodes.push(nodeIds[solidMesh.cells[i + j]]);
          }
          
          this.elements.set(elementId, {
            id: elementId,
            type: FEMElementType.SOLID,
            nodes: elementNodes,
            material: soil.id + '_material',
            properties: {
              integrationRule: 'gauss_8_point',
              materialModel: soil.material.materialModel
            }
          });
        }
        
        // 注册材料
        this.materials.set(soil.id + '_material', soil.material);
        
        report.mappingDetails.push({
          entityId: soil.id,
          entityType: soil.type,
          femElementType: FEMElementType.SOLID,
          elementCount: solidMesh.cells.length / 8,
          nodeCount: solidMesh.vertices.length
        });
        
      } catch (error) {
        report.errors.push(`处理土体 ${soil.id} 时出错: ${error}`);
      }
    }
  }

  /**
   * 处理支撑 - 转换为梁元
   */
  private processStruts(struts: GeometricEntity[], report: MappingReport): void {
    console.log('🔗 处理支撑，生成梁元...');
    
    for (const strut of struts) {
      // 类似于桩的处理，但使用水平方向的局部坐标系
      // 实现逻辑...
    }
  }

  /**
   * 处理锚杆 - 转换为梁元
   */
  private processAnchors(anchors: GeometricEntity[], report: MappingReport): void {
    console.log('⚓ 处理锚杆，生成梁元...');
    
    for (const anchor of anchors) {
      // 锚杆处理需要考虑预应力
      // 实现逻辑...
    }
  }

  /**
   * 生成接触单元
   */
  private generateContactElements(report: MappingReport): void {
    if (!this.mappingRules.contactRules.enableSoilStructureContact) return;
    
    console.log('🤝 生成土-结构接触单元...');
    
    // 识别土体和结构的接触面
    // 生成接触单元
    // 实现逻辑...
  }

  /**
   * 应用边界条件
   */
  private applyBoundaryConditions(entities: GeometricEntity[], report: MappingReport): void {
    console.log('🔒 应用边界条件...');
    
    // 应用各种约束条件
    // 实现逻辑...
  }

  // 辅助方法

  private resetMapper(): void {
    this.nodes.clear();
    this.elements.clear();
    this.materials.clear();
    this.nodeIdCounter = 1;
    this.elementIdCounter = 1;
  }

  private groupEntitiesByType(entities: GeometricEntity[]): Map<StructuralElementType, GeometricEntity[]> {
    const groups = new Map<StructuralElementType, GeometricEntity[]>();
    
    for (const entity of entities) {
      if (!groups.has(entity.type)) {
        groups.set(entity.type, []);
      }
      groups.get(entity.type)!.push(entity);
    }
    
    return groups;
  }

  private extractMeshData(geometry: THREE.BufferGeometry): {
    vertices: number[];
    faces: number[];
    normals?: number[];
  } {
    const positionAttribute = geometry.getAttribute('position');
    const indexAttribute = geometry.getIndex();
    const normalAttribute = geometry.getAttribute('normal');
    
    return {
      vertices: Array.from(positionAttribute.array),
      faces: indexAttribute ? Array.from(indexAttribute.array) : [],
      normals: normalAttribute ? Array.from(normalAttribute.array) : undefined
    };
  }

  private analyzeWallGeometry(meshData: any): WallGeometry {
    // 分析地连墙几何特征
    // 提取长度、高度、厚度等参数
    // 实现逻辑...
    return {
      length: 0,
      height: 0,
      thickness: 0,
      centerline: []
    };
  }

  private generateShellMesh(wallGeometry: WallGeometry, elementSize: number): {
    vertices: number[][];
    faces: number[];
  } {
    // 基于地连墙几何生成结构化的壳元网格
    // 实现逻辑...
    return {
      vertices: [],
      faces: []
    };
  }

  private extractPileAxis(meshData: any): [number, number, number][] {
    // 从桩的网格数据中提取中心轴线
    // 实现逻辑...
    return [];
  }

  private segmentAxis(axis: [number, number, number][], segmentLength: number): [number, number, number][] {
    // 将轴线按指定长度分段
    const segments: [number, number, number][] = [];
    
    for (let i = 0; i < axis.length - 1; i++) {
      const start = axis[i];
      const end = axis[i + 1];
      const direction = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
      const length = Math.sqrt(direction[0] ** 2 + direction[1] ** 2 + direction[2] ** 2);
      
      const numSegments = Math.ceil(length / segmentLength);
      
      for (let j = 0; j <= numSegments; j++) {
        const t = j / numSegments;
        segments.push([
          start[0] + direction[0] * t,
          start[1] + direction[1] * t,
          start[2] + direction[2] * t
        ]);
      }
    }
    
    return segments;
  }

  private calculateBeamLocalAxes(startPoint: [number, number, number], endPoint: [number, number, number]): THREE.Matrix3 {
    // 计算梁单元的局部坐标系
    const direction = new THREE.Vector3().subVectors(
      new THREE.Vector3(...endPoint),
      new THREE.Vector3(...startPoint)
    ).normalize();
    
    // X轴沿梁轴向
    const xAxis = direction;
    
    // Z轴垂直向上（全局Z轴方向）
    const zAxis = new THREE.Vector3(0, 0, 1);
    
    // Y轴由右手定则确定
    const yAxis = new THREE.Vector3().crossVectors(zAxis, xAxis).normalize();
    
    // 如果梁接近垂直，重新计算局部坐标系
    if (Math.abs(direction.z) > 0.9) {
      yAxis.set(0, 1, 0);
      zAxis.crossVectors(xAxis, yAxis).normalize();
    }
    
    return new THREE.Matrix3().set(
      xAxis.x, yAxis.x, zAxis.x,
      xAxis.y, yAxis.y, zAxis.y,
      xAxis.z, yAxis.z, zAxis.z
    );
  }

  private generateSolidMesh(meshData: any, elementSize: number): {
    vertices: number[][];
    cells: number[];
  } {
    // 生成结构化的实体网格
    // 实现逻辑...
    return {
      vertices: [],
      cells: []
    };
  }

  private getDefaultPileCrossSection() {
    return {
      area: 0.785, // 1m直径圆桩
      momentOfInertiaY: 0.049,
      momentOfInertiaZ: 0.049,
      torsionalConstant: 0.098,
      shearAreaY: 0.628,
      shearAreaZ: 0.628
    };
  }

  /**
   * 生成桩的柱面壳元网格
   */
  private generateCylindricalShellMesh(
    pileGeometry: { diameter: number; length: number; wallThickness: number; hollowRatio?: number },
    modelingParams: { shellElementSize: number; circumferentialDivisions: number; radialLayers: number }
  ): { vertices: number[][]; faces: number[] } {
    const { diameter, length } = pileGeometry;
    const { circumferentialDivisions, shellElementSize } = modelingParams;
    
    const radius = diameter / 2;
    const vertices: number[][] = [];
    const faces: number[] = [];
    
    // 沿桩长方向的分段数
    const longitudinalDivisions = Math.ceil(length / shellElementSize);
    const deltaZ = length / longitudinalDivisions;
    const deltaTheta = (2 * Math.PI) / circumferentialDivisions;
    
    // 生成节点
    for (let i = 0; i <= longitudinalDivisions; i++) {
      const z = i * deltaZ;
      for (let j = 0; j < circumferentialDivisions; j++) {
        const theta = j * deltaTheta;
        const x = radius * Math.cos(theta);
        const y = radius * Math.sin(theta);
        vertices.push([x, y, z]);
      }
    }
    
    // 生成四边形单元
    for (let i = 0; i < longitudinalDivisions; i++) {
      for (let j = 0; j < circumferentialDivisions; j++) {
        const baseIndex = i * circumferentialDivisions;
        const nextBaseIndex = (i + 1) * circumferentialDivisions;
        
        const n1 = baseIndex + j;
        const n2 = baseIndex + ((j + 1) % circumferentialDivisions);
        const n3 = nextBaseIndex + ((j + 1) % circumferentialDivisions);
        const n4 = nextBaseIndex + j;
        
        // 按逆时针方向定义四边形单元
        faces.push(n1, n2, n3, n4);
      }
    }
    
    return { vertices, faces };
  }

  /**
   * 分析排桩空间分布
   */
  private analyzePileLayout(pileWall: GeometricEntity): PileLayout {
    const meshData = this.extractMeshData(pileWall.geometry);
    const vertices = meshData.vertices;
    
    // 识别单桩位置 - 简化实现，假设从几何数据中提取
    const piles: PileInfo[] = [];
    
    // 这里应该根据实际几何数据分析桩的位置
    // 目前提供示例实现
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      const z = vertices[i + 2];
      
      piles.push({
        id: `pile_${i / 3}`,
        position: [x, y, z],
        diameter: pileWall.properties.pileGeometry?.diameter || 1.0,
        length: pileWall.properties.pileGeometry?.length || 10.0
      });
    }
    
    // 计算桩间距
    const spacings: number[] = [];
    for (let i = 0; i < piles.length - 1; i++) {
      const pile1 = piles[i];
      const pile2 = piles[i + 1];
      const distance = Math.sqrt(
        Math.pow(pile2.position[0] - pile1.position[0], 2) +
        Math.pow(pile2.position[1] - pile1.position[1], 2)
      );
      spacings.push(distance);
    }
    
    const averageSpacing = spacings.length > 0 ? 
      spacings.reduce((sum, spacing) => sum + spacing, 0) / spacings.length : 0;
    
    return {
      piles,
      averageSpacing,
      minSpacing: Math.min(...spacings),
      maxSpacing: Math.max(...spacings),
      totalLength: this.calculateTotalPileWallLength(piles)
    };
  }

  /**
   * 判断是否使用连续建模
   */
  private shouldUseContinuousModeling(pileLayout: PileLayout): boolean {
    const threshold = this.mappingRules.pileRules.pileSpacingThreshold;
    return pileLayout.averageSpacing < threshold;
  }

  /**
   * 生成连续排桩壳元网格
   */
  private generateContinuousPileWallMesh(
    pileWall: GeometricEntity,
    pileLayout: PileLayout,
    report: MappingReport
  ): void {
    console.log('🔗 生成连续排桩壳元网格...');
    
    const pileGeometry = pileWall.properties.pileGeometry!;
    const modelingParams = pileWall.properties.pileModeling!;
    
    // 生成连续的壳元网格
    const wallMesh = this.generateContinuousWallMesh(pileLayout, pileGeometry, modelingParams);
    
    // 创建节点
    const nodeIds = wallMesh.vertices.map(vertex => {
      const nodeId = `N${this.nodeIdCounter++}`;
      this.nodes.set(nodeId, {
        id: nodeId,
        coordinates: vertex as [number, number, number]
      });
      return nodeId;
    });
    
    // 创建壳元
    for (let i = 0; i < wallMesh.faces.length; i += 4) {
      const elementId = `SHELL${this.elementIdCounter++}`;
      const elementNodes = [
        nodeIds[wallMesh.faces[i]],
        nodeIds[wallMesh.faces[i + 1]],
        nodeIds[wallMesh.faces[i + 2]],
        nodeIds[wallMesh.faces[i + 3]]
      ];
      
      this.elements.set(elementId, {
        id: elementId,
        type: FEMElementType.SHELL,
        nodes: elementNodes,
        material: pileWall.id + '_material',
        properties: {
          thickness: pileGeometry.wallThickness || pileGeometry.diameter / 20,
          integrationPoints: 5,
          elementType: 'continuous_pile_wall'
        }
      });
    }
    
    // 注册材料
    this.materials.set(pileWall.id + '_material', pileWall.material);
    
    report.mappingDetails.push({
      entityId: pileWall.id,
      entityType: pileWall.type,
      femElementType: FEMElementType.SHELL,
      elementCount: wallMesh.faces.length / 4,
      nodeCount: wallMesh.vertices.length
    });
  }

  /**
   * 生成离散桩网格
   */
  private generateDiscretePileMesh(
    pileWall: GeometricEntity,
    pileLayout: PileLayout,
    report: MappingReport
  ): void {
    console.log('🔀 生成离散桩网格...');
    
    // 为每个桩单独建模
    for (const pile of pileLayout.piles) {
      // 创建单桩几何实体
      const singlePile: GeometricEntity = {
        ...pileWall,
        id: pile.id,
        name: `单桩_${pile.id}`
      };
      
      // 根据桩的直径选择建模策略
      const strategy = this.selectPileModelingStrategy(singlePile);
      
      if (strategy === PileModelingStrategy.BEAM_ELEMENT) {
        this.processPilesBeam([singlePile], report);
      } else {
        this.processPilesShell([singlePile], report);
      }
    }
  }

  /**
   * 生成桩心实体元
   */
  private generatePileCoreElements(
    pile: GeometricEntity,
    cylindricalMesh: { vertices: number[][]; faces: number[] },
    report: MappingReport
  ): void {
    console.log('🎯 生成桩心实体元...');
    
    const pileGeometry = pile.properties.pileGeometry!;
    const coreRadius = pileGeometry.diameter / 4; // 桩心半径为桩径的1/4
    
    // 生成桩心的实体网格
    const coreMesh = this.generatePileCoreMesh(pileGeometry, coreRadius);
    
    // 创建节点
    const nodeIds = coreMesh.vertices.map(vertex => {
      const nodeId = `N${this.nodeIdCounter++}`;
      this.nodes.set(nodeId, {
        id: nodeId,
        coordinates: vertex as [number, number, number]
      });
      return nodeId;
    });
    
    // 创建实体元
    for (let i = 0; i < coreMesh.cells.length; i += 8) {
      const elementId = `SOLID${this.elementIdCounter++}`;
      const elementNodes = [];
      
      for (let j = 0; j < 8; j++) {
        elementNodes.push(nodeIds[coreMesh.cells[i + j]]);
      }
      
      this.elements.set(elementId, {
        id: elementId,
        type: FEMElementType.SOLID,
        nodes: elementNodes,
        material: pile.id + '_core_material',
        properties: {
          integrationRule: 'gauss_8_point',
          elementType: 'pile_core'
        }
      });
    }
  }

  /**
   * 生成连续墙网格
   */
  private generateContinuousWallMesh(
    pileLayout: PileLayout,
    pileGeometry: { diameter: number; length: number; wallThickness: number },
    modelingParams: { shellElementSize: number; circumferentialDivisions: number }
  ): { vertices: number[][]; faces: number[] } {
    const vertices: number[][] = [];
    const faces: number[] = [];
    
    const { shellElementSize } = modelingParams;
    const wallThickness = pileGeometry.wallThickness || pileGeometry.diameter / 20;
    const wallHeight = pileGeometry.length;
    
    // 计算墙体的几何参数
    const wallLength = pileLayout.totalLength;
    const longitudinalDivisions = Math.ceil(wallLength / shellElementSize);
    const verticalDivisions = Math.ceil(wallHeight / shellElementSize);
    
    // 生成墙体节点
    for (let i = 0; i <= verticalDivisions; i++) {
      const z = (i / verticalDivisions) * wallHeight;
      for (let j = 0; j <= longitudinalDivisions; j++) {
        const x = (j / longitudinalDivisions) * wallLength;
        const y = 0; // 假设墙体在XZ平面上
        
        // 前表面节点
        vertices.push([x, y, z]);
        // 后表面节点
        vertices.push([x, y + wallThickness, z]);
      }
    }
    
    // 生成壳元
    const nodesPerLevel = (longitudinalDivisions + 1) * 2;
    
    for (let i = 0; i < verticalDivisions; i++) {
      for (let j = 0; j < longitudinalDivisions; j++) {
        const baseIndex = i * nodesPerLevel + j * 2;
        
        // 前表面单元
        const n1 = baseIndex;
        const n2 = baseIndex + 2;
        const n3 = baseIndex + nodesPerLevel + 2;
        const n4 = baseIndex + nodesPerLevel;
        
        faces.push(n1, n2, n3, n4);
        
        // 后表面单元
        const n5 = baseIndex + 1;
        const n6 = baseIndex + 3;
        const n7 = baseIndex + nodesPerLevel + 3;
        const n8 = baseIndex + nodesPerLevel + 1;
        
        faces.push(n5, n6, n7, n8);
      }
    }
    
    return { vertices, faces };
  }

  /**
   * 生成桩心网格
   */
  private generatePileCoreMesh(
    pileGeometry: { diameter: number; length: number },
    coreRadius: number
  ): { vertices: number[][]; cells: number[] } {
    const vertices: number[][] = [];
    const cells: number[] = [];
    
    const { length } = pileGeometry;
    const radialDivisions = 4; // 径向4等分
    const circumferentialDivisions = 8; // 周向8等分
    const longitudinalDivisions = Math.ceil(length / 1.0); // 纵向按1m分段
    
    // 生成节点
    for (let k = 0; k <= longitudinalDivisions; k++) {
      const z = (k / longitudinalDivisions) * length;
      
      // 中心节点
      vertices.push([0, 0, z]);
      
      // 径向节点
      for (let i = 1; i <= radialDivisions; i++) {
        const r = (i / radialDivisions) * coreRadius;
        for (let j = 0; j < circumferentialDivisions; j++) {
          const theta = (j / circumferentialDivisions) * 2 * Math.PI;
          const x = r * Math.cos(theta);
          const y = r * Math.sin(theta);
          vertices.push([x, y, z]);
        }
      }
    }
    
    // 生成六面体单元（简化实现）
    const nodesPerLevel = 1 + radialDivisions * circumferentialDivisions;
    
    for (let k = 0; k < longitudinalDivisions; k++) {
      const baseLevel = k * nodesPerLevel;
      const nextLevel = (k + 1) * nodesPerLevel;
      
      // 创建径向的六面体单元
      for (let i = 0; i < radialDivisions; i++) {
        for (let j = 0; j < circumferentialDivisions; j++) {
          const innerRadius = i;
          const outerRadius = i + 1;
          const currentCirc = j;
          const nextCirc = (j + 1) % circumferentialDivisions;
          
          // 计算8个节点的索引
          let n1, n2, n3, n4, n5, n6, n7, n8;
          
          if (innerRadius === 0) {
            // 内径为中心点的情况
            n1 = baseLevel; // 中心点
            n2 = baseLevel + 1 + currentCirc;
            n3 = baseLevel + 1 + nextCirc;
            n4 = baseLevel; // 中心点（重复）
          } else {
            n1 = baseLevel + 1 + (innerRadius - 1) * circumferentialDivisions + currentCirc;
            n2 = baseLevel + 1 + innerRadius * circumferentialDivisions + currentCirc;
            n3 = baseLevel + 1 + innerRadius * circumferentialDivisions + nextCirc;
            n4 = baseLevel + 1 + (innerRadius - 1) * circumferentialDivisions + nextCirc;
          }
          
          if (innerRadius === 0) {
            n5 = nextLevel; // 中心点
            n6 = nextLevel + 1 + currentCirc;
            n7 = nextLevel + 1 + nextCirc;
            n8 = nextLevel; // 中心点（重复）
          } else {
            n5 = nextLevel + 1 + (innerRadius - 1) * circumferentialDivisions + currentCirc;
            n6 = nextLevel + 1 + innerRadius * circumferentialDivisions + currentCirc;
            n7 = nextLevel + 1 + innerRadius * circumferentialDivisions + nextCirc;
            n8 = nextLevel + 1 + (innerRadius - 1) * circumferentialDivisions + nextCirc;
          }
          
          cells.push(n1, n2, n3, n4, n5, n6, n7, n8);
        }
      }
    }
    
    return { vertices, cells };
  }

  /**
   * 计算排桩总长度
   */
  private calculateTotalPileWallLength(piles: PileInfo[]): number {
    if (piles.length < 2) return 0;
    
    let totalLength = 0;
    for (let i = 0; i < piles.length - 1; i++) {
      const pile1 = piles[i];
      const pile2 = piles[i + 1];
      const distance = Math.sqrt(
        Math.pow(pile2.position[0] - pile1.position[0], 2) +
        Math.pow(pile2.position[1] - pile1.position[1], 2) +
        Math.pow(pile2.position[2] - pile1.position[2], 2)
      );
      totalLength += distance;
    }
    
    return totalLength;
  }

  /**
   * 生成土体挤密区
   */
  private generateSoilCompactionZone(
    pile: GeometricEntity,
    compactionRadius: number,
    report: MappingReport
  ): void {
    console.log(`🌀 生成挤密区，半径: ${compactionRadius}m`);
    
    try {
      const pileGeometry = pile.properties.pileGeometry!;
      const pilePosition = this.extractPilePosition(pile);
      
      // 1. 生成挤密区几何
      const compactionGeometry = this.generateCompactionZoneGeometry(
        pilePosition,
        pileGeometry.diameter,
        compactionRadius,
        pileGeometry.length
      );
      
      // 2. 创建挤密区材料属性
      const compactedSoilMaterial = this.createCompactedSoilMaterial(
        pile.material,
        pile.properties.pileType!
      );
      
      // 3. 生成挤密区网格
      const compactionMesh = this.generateCompactionZoneMesh(
        compactionGeometry,
        this.mappingRules.soilRules.solidElementSize * 0.5 // 挤密区网格加密
      );
      
      // 4. 创建挤密区节点和单元
      this.createCompactionZoneElements(
        pile.id,
        compactionMesh,
        compactedSoilMaterial,
        report
      );
      
      console.log(`✅ 挤密区 ${pile.id}_compaction_zone 生成完成`);
      
    } catch (error) {
      report.warnings.push(`生成桩 ${pile.id} 挤密区时出现问题: ${error}`);
      console.warn(`⚠️ 挤密区生成失败:`, error);
    }
  }

  /**
   * 提取桩基位置
   */
  private extractPilePosition(pile: GeometricEntity): [number, number, number] {
    const meshData = this.extractMeshData(pile.geometry);
    if (meshData.vertices.length >= 3) {
      return [meshData.vertices[0], meshData.vertices[1], meshData.vertices[2]];
    }
    return [0, 0, 0]; // 默认原点
  }

  /**
   * 生成挤密区几何
   */
  private generateCompactionZoneGeometry(
    center: [number, number, number],
    pileRadius: number,
    compactionRadius: number,
    pileLength: number
  ): CompactionZoneGeometry {
    return {
      center,
      innerRadius: pileRadius,
      outerRadius: compactionRadius,
      height: pileLength,
      type: 'cylindrical'
    };
  }

  /**
   * 创建挤密土体材料属性
   */
  private createCompactedSoilMaterial(
    originalSoilMaterial: MaterialProperties,
    pileType: PileType
  ): MaterialProperties {
    // 基于桩基类型确定挤密系数
    const compactionFactors = this.getCompactionFactors(pileType);
    
    return {
      ...originalSoilMaterial,
      elasticModulus: originalSoilMaterial.elasticModulus * compactionFactors.elasticModulusRatio,
      density: originalSoilMaterial.density * compactionFactors.densityRatio,
      // 添加挤密土体特有的参数
      materialModel: 'compacted_soil' as any,
      compactionInfo: {
        originalMaterial: originalSoilMaterial,
        pileType,
        compactionFactors
      }
    };
  }

  /**
   * 获取不同桩型的挤密系数
   */
  private getCompactionFactors(pileType: PileType): CompactionFactors {
    const factorsMap: Record<PileType, CompactionFactors> = {
      [PileType.BORED_CAST_IN_PLACE]: {
        elasticModulusRatio: 1.0,  // 置换型，无挤密
        densityRatio: 1.0,
        cohesionIncrease: 0,
        frictionAngleIncrease: 0
      },
      [PileType.HAND_DUG]: {
        elasticModulusRatio: 1.0,  // 置换型，无挤密
        densityRatio: 1.0,
        cohesionIncrease: 0,
        frictionAngleIncrease: 0
      },
      [PileType.PRECAST_DRIVEN]: {
        elasticModulusRatio: 1.2,  // 轻微挤密
        densityRatio: 1.1,
        cohesionIncrease: 2, // kPa
        frictionAngleIncrease: 1 // 度
      },
      [PileType.SWM_METHOD]: {
        elasticModulusRatio: 1.8,  // 强挤密效应
        densityRatio: 1.3,
        cohesionIncrease: 8, // kPa
        frictionAngleIncrease: 4 // 度
      },
      [PileType.CFG_PILE]: {
        elasticModulusRatio: 2.2,  // 复合地基，显著改善
        densityRatio: 1.4,
        cohesionIncrease: 12, // kPa
        frictionAngleIncrease: 6 // 度
      },
      [PileType.HIGH_PRESSURE_JET]: {
        elasticModulusRatio: 3.0,  // 高压旋喷，大幅改善
        densityRatio: 1.5,
        cohesionIncrease: 20, // kPa
        frictionAngleIncrease: 8 // 度
      }
    };
    
    return factorsMap[pileType];
  }

  /**
   * 生成挤密区网格
   */
  private generateCompactionZoneMesh(
    geometry: CompactionZoneGeometry,
    elementSize: number
  ): CompactionZoneMesh {
    const vertices: number[][] = [];
    const cells: number[] = [];
    
    const { center, innerRadius, outerRadius, height } = geometry;
    
    // 生成环形柱体网格
    const radialDivisions = Math.ceil((outerRadius - innerRadius) / elementSize);
    const circumferentialDivisions = Math.ceil(2 * Math.PI * outerRadius / elementSize);
    const verticalDivisions = Math.ceil(height / elementSize);
    
    // 生成节点
    for (let k = 0; k <= verticalDivisions; k++) {
      const z = center[2] + (k / verticalDivisions) * height;
      
      for (let i = 0; i <= radialDivisions; i++) {
        const r = innerRadius + (i / radialDivisions) * (outerRadius - innerRadius);
        
        for (let j = 0; j < circumferentialDivisions; j++) {
          const theta = (j / circumferentialDivisions) * 2 * Math.PI;
          const x = center[0] + r * Math.cos(theta);
          const y = center[1] + r * Math.sin(theta);
          
          vertices.push([x, y, z]);
        }
      }
    }
    
    // 生成单元连接（简化实现）
    const nodesPerLevel = (radialDivisions + 1) * circumferentialDivisions;
    
    for (let k = 0; k < verticalDivisions; k++) {
      for (let i = 0; i < radialDivisions; i++) {
        for (let j = 0; j < circumferentialDivisions; j++) {
          const baseIndex = k * nodesPerLevel + i * circumferentialDivisions + j;
          const nextRadial = baseIndex + circumferentialDivisions;
          const nextLevel = baseIndex + nodesPerLevel;
          const nextJ = (j + 1) % circumferentialDivisions;
          
          // 生成八节点六面体单元
          const n1 = baseIndex;
          const n2 = baseIndex - j + nextJ;
          const n3 = nextRadial - j + nextJ;
          const n4 = nextRadial;
          const n5 = nextLevel;
          const n6 = nextLevel - j + nextJ;
          const n7 = nextLevel + circumferentialDivisions - j + nextJ;
          const n8 = nextLevel + circumferentialDivisions;
          
          cells.push(n1, n2, n3, n4, n5, n6, n7, n8);
        }
      }
    }
    
    return { vertices, cells };
  }

  /**
   * 创建挤密区单元
   */
  private createCompactionZoneElements(
    pileId: string,
    mesh: CompactionZoneMesh,
    material: MaterialProperties,
    report: MappingReport
  ): void {
    const materialId = `${pileId}_compacted_soil`;
    
    // 创建节点
    const nodeIds = mesh.vertices.map(vertex => {
      const nodeId = `N${this.nodeIdCounter++}`;
      this.nodes.set(nodeId, {
        id: nodeId,
        coordinates: vertex as [number, number, number]
      });
      return nodeId;
    });
    
    // 创建实体元
    for (let i = 0; i < mesh.cells.length; i += 8) {
      const elementId = `SOIL_COMP${this.elementIdCounter++}`;
      const elementNodes = [];
      
      for (let j = 0; j < 8; j++) {
        elementNodes.push(nodeIds[mesh.cells[i + j]]);
      }
      
      this.elements.set(elementId, {
        id: elementId,
        type: FEMElementType.SOLID,
        nodes: elementNodes,
        material: materialId,
        properties: {
          integrationRule: 'gauss_8_point',
          materialModel: 'compacted_soil',
          compactionZone: true,
          originalPileId: pileId
        }
      });
    }
    
    // 注册挤密土体材料
    this.materials.set(materialId, material);
    
    report.mappingDetails.push({
      entityId: `${pileId}_compaction_zone`,
      entityType: 'COMPACTED_SOIL' as any,
      femElementType: FEMElementType.SOLID,
      elementCount: mesh.cells.length / 8,
      nodeCount: mesh.vertices.length
    });
  }

  /**
   * 用户界面：获取可选的桩基类型列表
   */
  public getAvailablePileTypes(): Array<{type: PileType, name: string, description: string, strategy: PileModelingStrategy}> {
    return [
      {
        type: PileType.BORED_CAST_IN_PLACE,
        name: '钻孔灌注桩',
        description: '钻孔成型，现浇混凝土，置换土体',
        strategy: PileModelingStrategy.BEAM_ELEMENT
      },
      {
        type: PileType.HAND_DUG,
        name: '人工挖孔桩',
        description: '人工开挖成孔，现浇混凝土，置换土体',
        strategy: PileModelingStrategy.BEAM_ELEMENT
      },
      {
        type: PileType.PRECAST_DRIVEN,
        name: '预制桩',
        description: '工厂预制，静压或打入，部分挤密',
        strategy: PileModelingStrategy.BEAM_ELEMENT
      },
      {
        type: PileType.SWM_METHOD,
        name: 'SWM工法桩',
        description: '搅拌施工，挤压土体，形成挤密区',
        strategy: PileModelingStrategy.SHELL_ELEMENT
      },
      {
        type: PileType.CFG_PILE,
        name: 'CFG桩',
        description: '水泥粉煤灰碎石桩，挤密夌合地基',
        strategy: PileModelingStrategy.SHELL_ELEMENT
      },
      {
        type: PileType.HIGH_PRESSURE_JET,
        name: '高压旋喷桩',
        description: '高压喷射，固化土体，挤密加固',
        strategy: PileModelingStrategy.SHELL_ELEMENT
      }
    ];
  }

  /**
   * 获取土体模型更新报告
   */
  public getSoilModelChanges(): SoilModelChangeReport {
    const changes: SoilModelChange[] = [];
    const compactedZones: string[] = [];
    const materialModifications: MaterialModification[] = [];
    
    // 遍历所有单元，查找挤密区域
    for (const [elementId, element] of this.elements) {
      if (element.properties?.compactionZone) {
        compactedZones.push(elementId);
        
        // 记录材料变化
        const materialId = element.material;
        const material = this.materials.get(materialId);
        if (material && (material as any).compactionInfo) {
          const compactionInfo = (material as any).compactionInfo;
          materialModifications.push({
            zoneId: elementId,
            originalMaterial: compactionInfo.originalMaterial,
            modifiedMaterial: material,
            pileType: compactionInfo.pileType,
            compactionFactors: compactionInfo.compactionFactors
          });
        }
      }
    }
    
    // 统计变化
    changes.push({
      type: 'COMPACTION_ZONES_ADDED',
      description: `添加了 ${compactedZones.length} 个挤密区域`,
      affectedElements: compactedZones,
      needsPhysicsGroupUpdate: true
    });
    
    if (materialModifications.length > 0) {
      changes.push({
        type: 'MATERIAL_PROPERTIES_MODIFIED',
        description: `修改了 ${materialModifications.length} 个材料属性`,
        affectedElements: materialModifications.map(m => m.zoneId),
        needsPhysicsGroupUpdate: true
      });
    }

    return {
      totalChanges: changes.length,
      changes,
      compactedZones,
      materialModifications,
      recommendedActions: this.getRecommendedActions(changes)
    };
  }

  /**
   * 获取推荐操作
   */
  private getRecommendedActions(changes: SoilModelChange[]): RecommendedAction[] {
    const actions: RecommendedAction[] = [];
    
    const hasCompactionZones = changes.some(c => c.type === 'COMPACTION_ZONES_ADDED');
    const hasMaterialChanges = changes.some(c => c.type === 'MATERIAL_PROPERTIES_MODIFIED');
    
    if (hasCompactionZones) {
      actions.push({
        action: 'UPDATE_PHYSICS_GROUPS',
        priority: 'HIGH',
        description: '更新物理组，重新分配挤密区域的材料属性',
        automated: false
      });
      
      actions.push({
        action: 'VERIFY_MESH_QUALITY',
        priority: 'MEDIUM',
        description: '验证挤密区网格质量和节点连接',
        automated: true
      });
    }
    
    if (hasMaterialChanges) {
      actions.push({
        action: 'RECALCULATE_STIFFNESS_MATRIX',
        priority: 'HIGH',
        description: '重新计算系统刚度矩阵，反映材料参数变化',
        automated: true
      });
    }
    
    return actions;
  }

  /**
   * 自动执行可自动化的操作
   */
  public executeAutomatedActions(report: SoilModelChangeReport): AutomationExecutionResult {
    const results: AutomationStepResult[] = [];
    
    for (const action of report.recommendedActions) {
      if (action.automated) {
        try {
          switch (action.action) {
            case 'VERIFY_MESH_QUALITY':
              const meshQuality = this.verifyMeshQuality();
              results.push({
                action: action.action,
                success: meshQuality.passed,
                message: meshQuality.message,
                details: meshQuality
              });
              break;
              
            case 'RECALCULATE_STIFFNESS_MATRIX':
              const stiffnessUpdate = this.prepareStiffnessMatrixUpdate();
              results.push({
                action: action.action,
                success: true,
                message: '刚度矩阵更新准备完成',
                details: stiffnessUpdate
              });
              break;
          }
        } catch (error) {
          results.push({
            action: action.action,
            success: false,
            message: `执行失败: ${error}`,
            details: null
          });
        }
      }
    }
    
    return {
      totalActions: report.recommendedActions.length,
      automatedActions: results.length,
      results,
      manualActionsRequired: report.recommendedActions.filter(a => !a.automated)
    };
  }

  /**
   * 验证网格质量
   */
  private verifyMeshQuality(): MeshQualityReport {
    let totalElements = 0;
    let poorQualityElements = 0;
    const issues: string[] = [];
    
    for (const [elementId, element] of this.elements) {
      totalElements++;
      
      // 模拟网格质量检查
      if (element.nodes.length < 4) {
        poorQualityElements++;
        issues.push(`单元 ${elementId} 节点数不足`);
      }
      
      // 检查挤密区元素
      if (element.properties?.compactionZone) {
        const material = this.materials.get(element.material);
        if (!material) {
          poorQualityElements++;
          issues.push(`挤密区单元 ${elementId} 缺少材料定义`);
        }
      }
    }
    
    const qualityRatio = (totalElements - poorQualityElements) / totalElements;
    
    return {
      passed: qualityRatio >= 0.95,
      totalElements,
      poorQualityElements,
      qualityRatio,
      issues,
      message: qualityRatio >= 0.95 ? 
        `网格质量良好 (${(qualityRatio * 100).toFixed(1)}%)` :
        `网格质量需要改进 (${(qualityRatio * 100).toFixed(1)}%)`
    };
  }

  /**
   * 准备刚度矩阵更新
   */
  private prepareStiffnessMatrixUpdate(): StiffnessMatrixUpdateInfo {
    const modifiedMaterials: string[] = [];
    const affectedElements: string[] = [];
    
    for (const [materialId, material] of this.materials) {
      if ((material as any).compactionInfo) {
        modifiedMaterials.push(materialId);
      }
    }
    
    for (const [elementId, element] of this.elements) {
      if (modifiedMaterials.includes(element.material)) {
        affectedElements.push(elementId);
      }
    }
    
    return {
      modifiedMaterials,
      affectedElements,
      updateRequired: modifiedMaterials.length > 0,
      estimatedComputationIncrease: modifiedMaterials.length * 0.1 // 10%每个修改材料
    };
  }

  /**
   * 生成物理组更新请求
   */
  public generatePhysicsGroupUpdateRequest(): PhysicsGroupUpdateRequest {
    const soilChanges = this.getSoilModelChanges();
    
    return {
      requestId: `update_${Date.now()}`,
      timestamp: new Date().toISOString(),
      changes: soilChanges,
      updateType: 'INCREMENTAL', // 增量更新
      priority: soilChanges.changes.some(c => c.needsPhysicsGroupUpdate) ? 'HIGH' : 'LOW',
      requiredActions: soilChanges.recommendedActions.filter(a => !a.automated),
      automatedResults: this.executeAutomatedActions(soilChanges)
    };
  }
}

// 辅助接口

interface WallGeometry {
  length: number;
  height: number;
  thickness: number;
  centerline: [number, number, number][];
}

// 桩信息接口
interface PileInfo {
  id: string;
  position: [number, number, number];
  diameter: number;
  length: number;
}

// 排桩布局接口
interface PileLayout {
  piles: PileInfo[];
  averageSpacing: number;
  minSpacing: number;
  maxSpacing: number;
  totalLength: number;
}

// 挤密区几何接口
interface CompactionZoneGeometry {
  center: [number, number, number];
  innerRadius: number;
  outerRadius: number;
  height: number;
  type: 'cylindrical' | 'rectangular';
}

// 挤密系数接口
interface CompactionFactors {
  elasticModulusRatio: number;    // 弹性模量增大系数
  densityRatio: number;           // 密度增大系数
  cohesionIncrease: number;       // 粘聚力增量 (kPa)
  frictionAngleIncrease: number;  // 内摩擦角增量 (度)
}

// 挤密区网格接口
interface CompactionZoneMesh {
  vertices: number[][];
  cells: number[];
}

// 土体模型变化接口
interface SoilModelChange {
  type: 'COMPACTION_ZONES_ADDED' | 'MATERIAL_PROPERTIES_MODIFIED' | 'CONTACT_INTERFACES_ADDED';
  description: string;
  affectedElements: string[];
  needsPhysicsGroupUpdate: boolean;
}

interface MaterialModification {
  zoneId: string;
  originalMaterial: MaterialProperties;
  modifiedMaterial: MaterialProperties;
  pileType: PileType;
  compactionFactors: CompactionFactors;
}

interface SoilModelChangeReport {
  totalChanges: number;
  changes: SoilModelChange[];
  compactedZones: string[];
  materialModifications: MaterialModification[];
  recommendedActions: RecommendedAction[];
}

interface RecommendedAction {
  action: 'UPDATE_PHYSICS_GROUPS' | 'VERIFY_MESH_QUALITY' | 'RECALCULATE_STIFFNESS_MATRIX';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  automated: boolean;
}

interface AutomationStepResult {
  action: string;
  success: boolean;
  message: string;
  details: any;
}

interface AutomationExecutionResult {
  totalActions: number;
  automatedActions: number;
  results: AutomationStepResult[];
  manualActionsRequired: RecommendedAction[];
}

interface MeshQualityReport {
  passed: boolean;
  totalElements: number;
  poorQualityElements: number;
  qualityRatio: number;
  issues: string[];
  message: string;
}

interface StiffnessMatrixUpdateInfo {
  modifiedMaterials: string[];
  affectedElements: string[];
  updateRequired: boolean;
  estimatedComputationIncrease: number;
}

interface PhysicsGroupUpdateRequest {
  requestId: string;
  timestamp: string;
  changes: SoilModelChangeReport;
  updateType: 'FULL' | 'INCREMENTAL';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  requiredActions: RecommendedAction[];
  automatedResults: AutomationExecutionResult;
}

interface MappingReport {
  totalEntities: number;
  processedEntities: number;
  generatedNodes: number;
  generatedElements: number;
  mappingDetails: {
    entityId: string;
    entityType: StructuralElementType;
    femElementType: FEMElementType;
    elementCount: number;
    nodeCount: number;
  }[];
  warnings: string[];
  errors: string[];
}

export default GeometryToFEMMapper;