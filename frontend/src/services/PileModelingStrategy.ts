/**
 * 桩基建模策略服务
 * 0号架构师 - 基于专业桩基分类和建模理论
 * 实现置换型(BEAM_ELEMENT)和挤密型(SHELL_ELEMENT)两种建模策略
 */

// 桩基类型枚举
export enum PileType {
  // 置换型桩基
  BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE',     // 钻孔灌注桩
  HAND_DUG = 'HAND_DUG',                           // 人工挖孔桩
  PRECAST_DRIVEN = 'PRECAST_DRIVEN',               // 预制管桩
  
  // 挤密型桩基
  SWM_METHOD = 'SWM_METHOD',                       // SWM工法桩
  CFG_PILE = 'CFG_PILE',                           // CFG桩
  HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'          // 高压旋喷桩
}

// 建模策略枚举
export enum PileModelingStrategy {
  BEAM_ELEMENT = 'BEAM_ELEMENT',     // 梁元建模 - 置换型桩基
  SHELL_ELEMENT = 'SHELL_ELEMENT'    // 壳元建模 - 挤密型桩基
}

// 土体处理方式
export enum SoilTreatmentType {
  DISPLACEMENT = 'displacement',     // 置换型：移除土体
  COMPACTION = 'compaction'          // 挤密型：改良土体
}

// 承载机理类型
export enum LoadMechanism {
  FRICTION_END_BEARING = 'friction_end_bearing',   // 侧阻+端阻
  COMPOSITE_FOUNDATION = 'composite_foundation'    // 复合地基
}

// 施工工艺类型
export enum ConstructionMethod {
  EXCAVATION = 'excavation',         // 人工开挖
  DRILLING = 'drilling',             // 机械钻孔
  DRIVING = 'driving',               // 锤击沉桩
  MIXING = 'mixing',                 // 搅拌工艺
  INJECTION = 'injection'            // 高压喷射
}

// 完整的桩基分类接口
export interface EnhancedPileClassification {
  type: PileType;
  soilTreatment: SoilTreatmentType;
  modelingStrategy: PileModelingStrategy;
  loadMechanism: LoadMechanism;
  constructionMethod: ConstructionMethod;
  name: string;
  description: string;
  advantages: string[];
  disadvantages: string[];
  icon: string;
  applicableConditions: string[];
  technicalParameters: {
    typicalDiameter: [number, number];    // [min, max] mm
    typicalLength: [number, number];      // [min, max] m
    bearingCapacity: [number, number];    // [min, max] kN
    applicableDepth: [number, number];    // [min, max] m
  };
}

// 桩基承载力计算接口
export interface PileCapacity {
  sideResistance: number;      // 侧阻力 (kN)
  endBearing: number;          // 端阻力 (kN)
  totalCapacity: number;       // 总承载力 (kN)
  safetyFactor: number;        // 安全系数
  modelType: 'beam_element' | 'shell_element';
}

// 复合地基承载力接口
export interface CompositeFoundationCapacity {
  pileComponent: number;       // 桩体承载力 (kN)
  soilComponent: number;       // 土体承载力 (kN)
  compositeCapacity: number;   // 复合地基承载力 (kN)
  areaRatio: number;          // 面积置换率
  improvementFactor: number;   // 地基改良系数
  modelType: 'shell_element';
}

// 梁元几何接口
export interface BeamGeometry {
  elements: BeamElement[];
  nodes: BeamNode[];
  crossSection: number;        // 截面直径 (mm)
  material: MaterialProperties;
}

// 壳元几何接口
export interface ShellGeometry {
  improvedZone: ImprovedZone;
  elements: ShellElement[];
  materialProperties: MixedMaterialProperties;
  influenceRadius: number;     // 影响半径 (mm)
}

// 基础数据结构
interface BeamElement {
  id: string;
  startNode: string;
  endNode: string;
  length: number;
  crossSectionArea: number;
  momentOfInertia: number;
}

interface BeamNode {
  id: string;
  x: number;
  y: number;
  z: number;
  restraints: boolean[];       // [Tx, Ty, Tz, Rx, Ry, Rz]
}

interface ShellElement {
  id: string;
  nodes: string[];
  thickness: number;
  materialZone: string;
}

interface ImprovedZone {
  centerX: number;
  centerY: number;
  radius: number;
  depth: number;
  improvementLevel: number;    // 改良程度 0-1
}

interface MaterialProperties {
  elasticModulus: number;      // 弹性模量 (MPa)
  poissonRatio: number;        // 泊松比
  density: number;             // 密度 (kg/m³)
  compressiveStrength: number; // 抗压强度 (MPa)
}

interface MixedMaterialProperties extends MaterialProperties {
  cementContent: number;       // 水泥含量 (%)
  mixingRatio: number;         // 搅拌比例
  cureTime: number;           // 养护时间 (days)
}

// 桩基分类映射配置
export const PILE_CLASSIFICATION_MAPPING: Record<PileType, EnhancedPileClassification> = {
  // === 置换型桩基 (BEAM_ELEMENT) ===
  [PileType.BORED_CAST_IN_PLACE]: {
    type: PileType.BORED_CAST_IN_PLACE,
    soilTreatment: SoilTreatmentType.DISPLACEMENT,
    modelingStrategy: PileModelingStrategy.BEAM_ELEMENT,
    loadMechanism: LoadMechanism.FRICTION_END_BEARING,
    constructionMethod: ConstructionMethod.DRILLING,
    name: '钻孔灌注桩',
    description: '机械钻孔移除土体，现场浇筑混凝土，主要靠桩身承载',
    advantages: ['承载力大', '适应性强', '噪音小', '质量稳定'],
    disadvantages: ['工期长', '质量控制要求高', '成本较高'],
    icon: '🔩',
    applicableConditions: [
      '各种土质条件',
      '地下水位以下',
      '对噪音有要求的场地',
      '大荷载承载要求'
    ],
    technicalParameters: {
      typicalDiameter: [600, 2000],      // 600-2000mm
      typicalLength: [15, 80],           // 15-80m
      bearingCapacity: [1000, 8000],     // 1000-8000kN
      applicableDepth: [10, 100]         // 10-100m
    }
  },

  [PileType.HAND_DUG]: {
    type: PileType.HAND_DUG,
    soilTreatment: SoilTreatmentType.DISPLACEMENT,
    modelingStrategy: PileModelingStrategy.BEAM_ELEMENT,
    loadMechanism: LoadMechanism.FRICTION_END_BEARING,
    constructionMethod: ConstructionMethod.EXCAVATION,
    name: '人工挖孔桩',
    description: '人工开挖成孔，持力层可见，现场浇筑大直径桩',
    advantages: ['直径大', '持力层可见', '质量可控', '单桩承载力高'],
    disadvantages: ['深度限制', '安全风险', '效率低', '受地下水影响大'],
    icon: '⛏️',
    applicableConditions: [
      '地下水位以上',
      '持力层较浅',
      '大直径桩要求',
      '质量要求极高的工程'
    ],
    technicalParameters: {
      typicalDiameter: [1000, 3000],     // 1000-3000mm
      typicalLength: [8, 30],            // 8-30m
      bearingCapacity: [3000, 15000],    // 3000-15000kN
      applicableDepth: [5, 35]           // 5-35m
    }
  },

  [PileType.PRECAST_DRIVEN]: {
    type: PileType.PRECAST_DRIVEN,
    soilTreatment: SoilTreatmentType.DISPLACEMENT,
    modelingStrategy: PileModelingStrategy.BEAM_ELEMENT,
    loadMechanism: LoadMechanism.FRICTION_END_BEARING,
    constructionMethod: ConstructionMethod.DRIVING,
    name: '预制管桩',
    description: '预制混凝土桩，锤击或静压沉入，局部挤密土体',
    advantages: ['质量可控', '施工快速', '造价经济', '标准化程度高'],
    disadvantages: ['噪音大', '振动影响', '长度受限', '适应性差'],
    icon: '🔨',
    applicableConditions: [
      '软土地基',
      '标准化工程',
      '工期紧张',
      '经济性要求高'
    ],
    technicalParameters: {
      typicalDiameter: [300, 600],       // 300-600mm
      typicalLength: [8, 35],            // 8-35m
      bearingCapacity: [800, 3000],      // 800-3000kN
      applicableDepth: [8, 40]           // 8-40m
    }
  },

  // === 挤密型桩基 (SHELL_ELEMENT) ===
  [PileType.SWM_METHOD]: {
    type: PileType.SWM_METHOD,
    soilTreatment: SoilTreatmentType.COMPACTION,
    modelingStrategy: PileModelingStrategy.SHELL_ELEMENT,
    loadMechanism: LoadMechanism.COMPOSITE_FOUNDATION,
    constructionMethod: ConstructionMethod.MIXING,
    name: 'SWM工法桩',
    description: '深层搅拌形成水泥土桩，与土体协同形成复合地基',
    advantages: ['成本低', '环境友好', '复合承载', '减少开挖'],
    disadvantages: ['承载力有限', '质量波动', '对土质敏感'],
    icon: '🌀',
    applicableConditions: [
      '软黏土地基',
      '承载力要求适中',
      '环保要求高',
      '大面积地基处理'
    ],
    technicalParameters: {
      typicalDiameter: [500, 1000],      // 500-1000mm
      typicalLength: [8, 25],            // 8-25m
      bearingCapacity: [300, 1200],      // 300-1200kN (复合地基)
      applicableDepth: [5, 30]           // 5-30m
    }
  },

  [PileType.CFG_PILE]: {
    type: PileType.CFG_PILE,
    soilTreatment: SoilTreatmentType.COMPACTION,
    modelingStrategy: PileModelingStrategy.SHELL_ELEMENT,
    loadMechanism: LoadMechanism.COMPOSITE_FOUNDATION,
    constructionMethod: ConstructionMethod.MIXING,
    name: 'CFG桩',
    description: '水泥粉煤灰碎石桩，振动沉管成桩，形成刚性桩复合地基',
    advantages: ['材料环保', '复合地基', '变形协调', '造价合理'],
    disadvantages: ['施工精度要求高', '后期沉降', '质量控制难'],
    icon: '🗜️',
    applicableConditions: [
      '软土地基处理',
      '高层建筑地基',
      '对沉降控制要求高',
      '粉煤灰资源丰富地区'
    ],
    technicalParameters: {
      typicalDiameter: [350, 600],       // 350-600mm
      typicalLength: [10, 30],           // 10-30m
      bearingCapacity: [400, 1500],      // 400-1500kN (复合地基)
      applicableDepth: [8, 35]           // 8-35m
    }
  },

  [PileType.HIGH_PRESSURE_JET]: {
    type: PileType.HIGH_PRESSURE_JET,
    soilTreatment: SoilTreatmentType.COMPACTION,
    modelingStrategy: PileModelingStrategy.SHELL_ELEMENT,
    loadMechanism: LoadMechanism.COMPOSITE_FOUNDATION,
    constructionMethod: ConstructionMethod.INJECTION,
    name: '高压旋喷桩',
    description: '高压水泥浆切割搅拌土体，固化形成水泥土加固体',
    advantages: ['加固范围可控', '适应复杂地质', '既承载又防渗', '施工灵活'],
    disadvantages: ['设备复杂', '成本较高', '环境污染', '质量检测困难'],
    icon: '💉',
    applicableConditions: [
      '复杂地质条件',
      '既有建筑加固',
      '防渗加固要求',
      '空间受限场地'
    ],
    technicalParameters: {
      typicalDiameter: [600, 1500],      // 600-1500mm
      typicalLength: [5, 20],            // 5-20m
      bearingCapacity: [500, 2000],      // 500-2000kN
      applicableDepth: [3, 25]           // 3-25m
    }
  }
};

// 桩基建模策略服务类
export class PileModelingService {
  private static instance: PileModelingService;

  static getInstance(): PileModelingService {
    if (!this.instance) {
      this.instance = new PileModelingService();
    }
    return this.instance;
  }

  // 获取桩基分类信息
  getPileClassification(pileType: PileType): EnhancedPileClassification {
    return PILE_CLASSIFICATION_MAPPING[pileType];
  }

  // 获取建模策略
  getModelingStrategy(pileType: PileType): PileModelingStrategy {
    return this.getPileClassification(pileType).modelingStrategy;
  }

  // 根据建模策略分组桩基类型
  groupPilesByStrategy(): Record<PileModelingStrategy, EnhancedPileClassification[]> {
    const groups: Record<PileModelingStrategy, EnhancedPileClassification[]> = {
      [PileModelingStrategy.BEAM_ELEMENT]: [],
      [PileModelingStrategy.SHELL_ELEMENT]: []
    };

    Object.values(PILE_CLASSIFICATION_MAPPING).forEach(classification => {
      groups[classification.modelingStrategy].push(classification);
    });

    return groups;
  }

  // 计算置换型桩基承载力 (BEAM_ELEMENT)
  calculateDisplacementPileCapacity(
    pileType: PileType,
    diameter: number,          // mm
    length: number,            // m
    soilParams: any
  ): PileCapacity {
    const classification = this.getPileClassification(pileType);
    
    if (classification.modelingStrategy !== PileModelingStrategy.BEAM_ELEMENT) {
      throw new Error('此方法仅适用于置换型桩基 (BEAM_ELEMENT)');
    }

    // 简化的承载力计算（实际应使用更复杂的土力学公式）
    const perimeter = Math.PI * diameter / 1000; // m
    const area = Math.PI * Math.pow(diameter / 1000, 2) / 4; // m²

    // 侧阻力计算 (基于摩擦角和有效应力)
    const averageFriction = 80; // kPa (简化值)
    const sideResistance = perimeter * length * averageFriction;

    // 端阻力计算 (基于端阻系数)
    const endBearingCoeff = 6000; // kPa (简化值)
    const endBearing = area * endBearingCoeff;

    const totalCapacity = sideResistance + endBearing;
    const safetyFactor = 2.0;

    return {
      sideResistance,
      endBearing,
      totalCapacity,
      safetyFactor,
      modelType: 'beam_element'
    };
  }

  // 计算挤密型桩基承载力 (SHELL_ELEMENT)
  calculateCompactionPileCapacity(
    pileType: PileType,
    diameter: number,          // mm
    length: number,            // m
    spacing: number,           // mm (桩间距)
    soilParams: any
  ): CompositeFoundationCapacity {
    const classification = this.getPileClassification(pileType);
    
    if (classification.modelingStrategy !== PileModelingStrategy.SHELL_ELEMENT) {
      throw new Error('此方法仅适用于挤密型桩基 (SHELL_ELEMENT)');
    }

    // 复合地基承载力计算
    const pileArea = Math.PI * Math.pow(diameter / 1000, 2) / 4; // m²
    const influenceArea = Math.pow(spacing / 1000, 2); // m² (方形布置)
    const areaRatio = pileArea / influenceArea;

    // 桩体承载力 (简化计算)
    const pileStrength = 2000; // kPa (水泥土强度)
    const pileComponent = pileArea * pileStrength * 1000; // N

    // 土体承载力 (改良后)
    const improvedSoilStrength = 150; // kPa (改良土体强度)
    const soilComponent = (influenceArea - pileArea) * improvedSoilStrength * 1000; // N

    // 复合地基承载力
    const compositeCapacity = pileComponent + soilComponent;
    
    // 改良系数
    const originalSoilStrength = 80; // kPa (原状土强度)
    const improvementFactor = compositeCapacity / (influenceArea * originalSoilStrength * 1000);

    return {
      pileComponent: pileComponent / 1000, // kN
      soilComponent: soilComponent / 1000, // kN
      compositeCapacity: compositeCapacity / 1000, // kN
      areaRatio,
      improvementFactor,
      modelType: 'shell_element'
    };
  }

  // 生成梁元几何 (置换型桩基)
  generateBeamGeometry(
    pileType: PileType,
    diameter: number,          // mm
    length: number,            // m
    position: { x: number, y: number } // m
  ): BeamGeometry {
    const classification = this.getPileClassification(pileType);
    
    if (classification.modelingStrategy !== PileModelingStrategy.BEAM_ELEMENT) {
      throw new Error('此方法仅适用于置换型桩基');
    }

    // 计算截面特性
    const area = Math.PI * Math.pow(diameter / 1000, 2) / 4; // m²
    const momentOfInertia = Math.PI * Math.pow(diameter / 1000, 4) / 64; // m⁴

    // 生成节点（沿桩长分段）
    const segments = Math.max(4, Math.floor(length / 2)); // 每2m一段，最少4段
    const nodes: BeamNode[] = [];
    const elements: BeamElement[] = [];

    // 创建节点
    for (let i = 0; i <= segments; i++) {
      const z = -i * length / segments; // 向下为负
      nodes.push({
        id: `pile_node_${i}`,
        x: position.x,
        y: position.y,
        z,
        restraints: i === segments ? [true, true, true, true, true, true] : [false, false, false, false, false, false]
      });
    }

    // 创建梁元素
    for (let i = 0; i < segments; i++) {
      elements.push({
        id: `pile_element_${i}`,
        startNode: `pile_node_${i}`,
        endNode: `pile_node_${i + 1}`,
        length: length / segments,
        crossSectionArea: area,
        momentOfInertia
      });
    }

    // 材料属性
    const material: MaterialProperties = {
      elasticModulus: classification.type === PileType.BORED_CAST_IN_PLACE ? 30000 : 35000, // MPa
      poissonRatio: 0.2,
      density: 2500, // kg/m³
      compressiveStrength: classification.type === PileType.BORED_CAST_IN_PLACE ? 30 : 40 // MPa
    };

    return {
      elements,
      nodes,
      crossSection: diameter,
      material
    };
  }

  // 生成壳元几何 (挤密型桩基)
  generateShellGeometry(
    pileType: PileType,
    diameter: number,          // mm
    length: number,            // m
    position: { x: number, y: number } // m
  ): ShellGeometry {
    const classification = this.getPileClassification(pileType);
    
    if (classification.modelingStrategy !== PileModelingStrategy.SHELL_ELEMENT) {
      throw new Error('此方法仅适用于挤密型桩基');
    }

    // 改良区域定义
    const improvedZone: ImprovedZone = {
      centerX: position.x,
      centerY: position.y,
      radius: diameter / 2000, // m (半径)
      depth: length,
      improvementLevel: classification.type === PileType.HIGH_PRESSURE_JET ? 0.8 : 0.6
    };

    // 简化的壳元素生成（实际应该是复杂的3D网格）
    const elements: ShellElement[] = [];
    const layers = Math.max(4, Math.floor(length / 2));
    const circumferentialElements = 8;

    for (let layer = 0; layer < layers; layer++) {
      for (let circ = 0; circ < circumferentialElements; circ++) {
        elements.push({
          id: `shell_${layer}_${circ}`,
          nodes: [
            `node_${layer}_${circ}`,
            `node_${layer}_${(circ + 1) % circumferentialElements}`,
            `node_${layer + 1}_${(circ + 1) % circumferentialElements}`,
            `node_${layer + 1}_${circ}`
          ],
          thickness: diameter / 10000, // m
          materialZone: 'improved_soil'
        });
      }
    }

    // 混合材料属性
    const materialProperties: MixedMaterialProperties = {
      elasticModulus: classification.type === PileType.CFG_PILE ? 150 : 100, // MPa
      poissonRatio: 0.3,
      density: classification.type === PileType.SWM_METHOD ? 1800 : 1900, // kg/m³
      compressiveStrength: classification.type === PileType.HIGH_PRESSURE_JET ? 3.0 : 2.0, // MPa
      cementContent: classification.type === PileType.CFG_PILE ? 80 : 60, // kg/m³
      mixingRatio: 0.15,
      cureTime: 28 // days
    };

    return {
      improvedZone,
      elements,
      materialProperties,
      influenceRadius: diameter * 1.5 / 1000 // m
    };
  }

  // 验证桩基参数
  validatePileParameters(
    pileType: PileType,
    diameter: number,
    length: number
  ): { isValid: boolean; warnings: string[]; errors: string[] } {
    const classification = this.getPileClassification(pileType);
    const params = classification.technicalParameters;
    
    const warnings: string[] = [];
    const errors: string[] = [];

    // 直径检查
    if (diameter < params.typicalDiameter[0]) {
      errors.push(`桩径 ${diameter}mm 小于推荐最小值 ${params.typicalDiameter[0]}mm`);
    } else if (diameter > params.typicalDiameter[1]) {
      warnings.push(`桩径 ${diameter}mm 大于推荐最大值 ${params.typicalDiameter[1]}mm`);
    }

    // 长度检查
    if (length < params.typicalLength[0]) {
      errors.push(`桩长 ${length}m 小于推荐最小值 ${params.typicalLength[0]}m`);
    } else if (length > params.typicalLength[1]) {
      warnings.push(`桩长 ${length}m 大于推荐最大值 ${params.typicalLength[1]}m`);
    }

    // 长径比检查
    const lengthDiameterRatio = length / (diameter / 1000);
    if (classification.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT) {
      if (lengthDiameterRatio < 10) {
        warnings.push(`长径比 ${lengthDiameterRatio.toFixed(1)} 较小，可能影响桩的承载性能`);
      } else if (lengthDiameterRatio > 80) {
        warnings.push(`长径比 ${lengthDiameterRatio.toFixed(1)} 过大，需考虑屈曲稳定性`);
      }
    }

    return {
      isValid: errors.length === 0,
      warnings,
      errors
    };
  }
}

// 导出单例实例
export const pileModelingService = PileModelingService.getInstance();
export default pileModelingService;