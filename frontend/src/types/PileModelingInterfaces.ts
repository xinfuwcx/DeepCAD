/**
 * 桩基建模系统接口规范
 * DeepCAD Deep Excavation CAE Platform - Pile Modeling Interfaces
 * 
 * 作者：2号几何专家
 * 用途：1号、2号、3号之间的数据传递标准
 */

// ==================== 基础枚举 ====================

export enum PileType {
  BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE',     // 钻孔灌注桩
  HAND_DUG = 'HAND_DUG',                           // 人工挖孔桩
  PRECAST_DRIVEN = 'PRECAST_DRIVEN',               // 预制桩
  SWM_METHOD = 'SWM_METHOD',                       // SWM工法桩（搅拌桩）
  CFG_PILE = 'CFG_PILE',                           // CFG桩
  HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'          // 高压旋喷桩
}

export enum PileModelingStrategy {
  BEAM_ELEMENT = 'BEAM_ELEMENT',     // 梁元策略 - 置换型桩基
  SHELL_ELEMENT = 'SHELL_ELEMENT',   // 壳元策略 - 挤密型桩基
  USER_DEFINED = 'USER_DEFINED'      // 用户自定义
}

// ==================== 1号UI界面接口 ====================

/**
 * 桩基配置数据 - 1号UI → 2号几何
 */
export interface PileConfigurationInput {
  pileId: string;
  pileType: PileType;
  userOverriddenStrategy?: PileModelingStrategy;
  geometryParams: {
    diameter: number;        // 桩径 (m)
    length: number;          // 桩长 (m)
    position: [number, number, number];  // 位置坐标
    wallThickness?: number;  // 壁厚 (m)，用于管桩
  };
  materialParams?: {
    concreteGrade: string;   // 混凝土标号，如'C30'
    customProperties?: any;   // 自定义材料属性
  };
}

/**
 * 桩基类型信息 - 2号几何 → 1号UI
 */
export interface PileTypeInfo {
  type: PileType;
  name: string;
  description: string;
  recommendedStrategy: PileModelingStrategy;
  isCompacting: boolean;     // 是否为挤密型
  constructionMethod: string; // 施工方法描述
}

/**
 * 建模策略说明 - 2号几何 → 1号UI
 */
export interface ModelingStrategyExplanation {
  selectedType: PileType;
  recommendedStrategy: PileModelingStrategy;
  reason: string;
  technicalExplanation: string;
  soilInteractionType: 'replacement' | 'compaction';
}

/**
 * 土体模型变化预览 - 2号几何 → 1号UI
 */
export interface SoilModelChangePreview {
  hasChanges: boolean;
  affectedZones: {
    zoneId: string;
    type: 'original_soil' | 'compacted_soil' | 'pile_material';
    materialChanges: MaterialChangePreview;
  }[];
  visualizationData: {
    originalSoilColor: string;
    compactedSoilColor: string;
    pileColor: string;
  };
}

interface MaterialChangePreview {
  property: string;
  originalValue: number;
  newValue: number;
  changePercentage: number;
  unit: string;
}

// ==================== 2号几何处理接口 ====================

/**
 * 桩基处理结果 - 2号内部处理
 */
export interface PileProcessingResult {
  pileId: string;
  appliedStrategy: PileModelingStrategy;
  generatedElements: {
    beamElements?: string[];
    shellElements?: string[];
    solidElements?: string[];  // 桩心实体元
  };
  compactionZone?: {
    zoneId: string;
    affectedSoilElements: string[];
    compactionRadius: number;
    materialModifications: CompactionFactors;
  };
  processingTime: number;
  warnings: string[];
}

/**
 * 挤密系数 - 2号几何计算
 */
export interface CompactionFactors {
  elasticModulusRatio: number;    // 弹性模量倍数
  densityRatio: number;           // 密度倍数
  cohesionIncrease: number;       // 粘聚力增量 (kPa)
  frictionAngleIncrease: number;  // 内摩擦角增量 (度)
  permeabilityRatio?: number;     // 渗透系数倍数
}

// ==================== 3号计算系统接口 ====================

/**
 * FEM数据传递 - 2号几何 → 3号计算
 */
export interface FEMDataTransfer {
  transferId: string;
  timestamp: string;
  
  // 基本FEM数据
  nodes: FEMNodeData[];
  elements: FEMElementData[];
  materials: MaterialData[];
  
  // 桩基特定数据
  pileElements: PileElementData[];
  compactionZones: CompactionZoneData[];
  
  // 处理指令
  processingInstructions: ProcessingInstruction[];
}

interface FEMNodeData {
  id: string;
  coordinates: [number, number, number];
  constraints?: ConstraintData[];
}

interface FEMElementData {
  id: string;
  type: 'BEAM' | 'SHELL' | 'SOLID' | 'CONTACT';
  nodes: string[];
  materialId: string;
  properties: {
    [key: string]: any;
    // 桩基特定标识
    pileType?: PileType;
    modelingStrategy?: PileModelingStrategy;
    isCompactionZone?: boolean;
  };
}

interface MaterialData {
  id: string;
  type: 'concrete' | 'soil' | 'compacted_soil' | 'steel';
  properties: {
    elasticModulus: number;
    poissonRatio: number;
    density: number;
    [key: string]: any;
  };
  compactionInfo?: {
    originalMaterialId: string;
    pileType: PileType;
    compactionFactors: CompactionFactors;
  };
}

interface PileElementData {
  pileId: string;
  pileType: PileType;
  strategy: PileModelingStrategy;
  elementIds: string[];
  hasCompactionZone: boolean;
  specialProcessingRequired: boolean;
}

interface CompactionZoneData {
  zoneId: string;
  centerPileId: string;
  affectedElementIds: string[];
  compactionRadius: number;
  materialModifications: CompactionFactors;
}

interface ProcessingInstruction {
  type: 'APPLY_COMPACTION' | 'CREATE_CONTACT' | 'UPDATE_SOLVER_PARAMS';
  targetElements: string[];
  parameters: { [key: string]: any };
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/**
 * 计算状态反馈 - 3号计算 → 2号几何
 */
export interface CalculationStatusFeedback {
  transferId: string;
  status: 'RECEIVED' | 'PROCESSING' | 'COMPLETED' | 'ERROR';
  processedElements: {
    totalElements: number;
    processedElements: number;
    compactionZonesProcessed: number;
  };
  issues: CalculationIssue[];
  performanceMetrics?: {
    processingTime: number;
    memoryUsage: number;
    convergenceIterations: number;
  };
}

interface CalculationIssue {
  severity: 'WARNING' | 'ERROR';
  type: 'MATERIAL_PROPERTY' | 'ELEMENT_QUALITY' | 'CONVERGENCE';
  elementId?: string;
  message: string;
  suggestedFix?: string;
}

// ==================== 系统集成接口 ====================

/**
 * 系统状态同步 - 全系统共享
 */
export interface SystemSyncState {
  lastUpdateTime: string;
  pileModelingVersion: string;
  
  // 各组件状态
  uiState: {
    selectedPiles: string[];
    activeConfiguration: PileConfigurationInput | null;
    previewMode: boolean;
  };
  
  geometryState: {
    processedPiles: PileProcessingResult[];
    pendingTransfers: string[];
    lastMappingTime: string;
  };
  
  calculationState: {
    activeCalculations: string[];
    lastCalculationTime: string;
    systemLoad: number;  // 0-1 范围
  };
}

/**
 * 错误和警告统一处理
 */
export interface PileModelingError {
  errorId: string;
  timestamp: string;
  component: '1号UI' | '2号几何' | '3号计算';
  severity: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  type: 'VALIDATION' | 'PROCESSING' | 'CALCULATION' | 'SYSTEM';
  message: string;
  context: {
    pileId?: string;
    pileType?: PileType;
    operationType?: string;
    [key: string]: any;
  };
  recoveryActions?: string[];
}

// ==================== 配置和常量 ====================

/**
 * 系统配置常量
 */
export const PILE_MODELING_CONFIG = {
  // 默认挤密系数
  DEFAULT_COMPACTION_FACTORS: {
    [PileType.BORED_CAST_IN_PLACE]: {
      elasticModulusRatio: 1.0,
      densityRatio: 1.0,
      cohesionIncrease: 0,
      frictionAngleIncrease: 0
    },
    [PileType.SWM_METHOD]: {
      elasticModulusRatio: 1.8,
      densityRatio: 1.3,
      cohesionIncrease: 8,
      frictionAngleIncrease: 4
    },
    [PileType.CFG_PILE]: {
      elasticModulusRatio: 2.2,
      densityRatio: 1.4,
      cohesionIncrease: 12,
      frictionAngleIncrease: 6
    }
  } as Record<PileType, CompactionFactors>,
  
  // 默认建模策略
  DEFAULT_STRATEGIES: {
    [PileType.BORED_CAST_IN_PLACE]: PileModelingStrategy.BEAM_ELEMENT,
    [PileType.HAND_DUG]: PileModelingStrategy.BEAM_ELEMENT,
    [PileType.PRECAST_DRIVEN]: PileModelingStrategy.BEAM_ELEMENT,
    [PileType.SWM_METHOD]: PileModelingStrategy.SHELL_ELEMENT,
    [PileType.CFG_PILE]: PileModelingStrategy.SHELL_ELEMENT,
    [PileType.HIGH_PRESSURE_JET]: PileModelingStrategy.SHELL_ELEMENT
  } as Record<PileType, PileModelingStrategy>,
  
  // 性能参数
  PERFORMANCE: {
    MAX_CONCURRENT_PROCESSING: 10,
    ELEMENT_SIZE_FACTOR: 0.5,  // 挤密区网格加密系数
    DEFAULT_COMPACTION_RADIUS_RATIO: 2.5  // 挤密半径 = 桩径 × 2.5
  }
};

// ==================== 工具函数类型 ====================

/**
 * 类型判断工具
 */
export type PileTypeClassification = {
  isCompacting: boolean;
  soilTreatment: 'replacement' | 'compaction';
  recommendedStrategy: PileModelingStrategy;
  description: string;
};

/**
 * 验证函数类型
 */
export type ValidationResult = {
  isValid: boolean;
  errors: string[];
  warnings: string[];
};

// ==================== 导出便捷类型 ====================

export type {
  ConstraintData,
  // 为了向后兼容，可以在这里添加其他需要导出的类型
};

// 约束数据接口（示例）
interface ConstraintData {
  type: 'fixed' | 'pinned' | 'roller';
  direction: 'x' | 'y' | 'z' | 'all';
  value?: number;
}