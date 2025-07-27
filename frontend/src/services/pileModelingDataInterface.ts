/**
 * 桩基建模数据接口
 * 为3号计算专家提供标准化的桩基计算数据接口
 * 1号架构师 - 响应2号几何专家的建模策略修正
 */

import { PileType, PileModelingStrategy } from './PileModelingStrategy';

// 桩基几何参数接口
export interface PileGeometry {
  id: string;
  coordinates: {
    top: { x: number; y: number; z: number };
    bottom: { x: number; y: number; z: number };
  };
  diameter: number;                    // 桩径 (mm)
  length: number;                      // 桩长 (m)
  embedmentDepth: number;              // 嵌入深度 (m)
  crossSectionalArea: number;          // 截面积 (m²)
  perimeter: number;                   // 周长 (m)
}

// 桩基材料属性接口
export interface PileMaterial {
  // 混凝土材料属性（置换型桩基）
  concrete?: {
    strength: number;                  // 混凝土强度 (MPa)
    elasticModulus: number;            // 弹性模量 (GPa)
    poissonRatio: number;              // 泊松比
    density: number;                   // 密度 (kg/m³)
    tensileStrength: number;           // 抗拉强度 (MPa)
  };
  
  // 钢筋属性（对于钢筋混凝土桩）
  reinforcement?: {
    yieldStrength: number;             // 屈服强度 (MPa)
    elasticModulus: number;            // 弹性模量 (GPa)
    area: number;                      // 钢筋截面积 (mm²)
    arrangementType: 'longitudinal' | 'spiral' | 'stirrup';
  };
  
  // 水泥土材料属性（挤密型桩基）
  cementSoil?: {
    unconfined_strength: number;       // 无侧限抗压强度 (kPa)
    elasticModulus: number;            // 弹性模量 (MPa)
    cohesion: number;                  // 粘聚力 (kPa)
    frictionAngle: number;             // 内摩擦角 (度)
    density: number;                   // 密度 (kg/m³)
    permeability: number;              // 渗透系数 (m/s)
  };
}

// 土体相互作用参数接口
export interface SoilPileInteraction {
  // 侧摩阻力参数
  lateralFriction: {
    ultimate: number;                  // 极限侧摩阻力 (kPa)
    coefficient: number;               // 摩擦系数
    adhesionFactor: number;            // 粘着系数
  };
  
  // 端承力参数
  endBearing: {
    ultimate: number;                  // 极限端承力 (kPa)
    bearingCapacityFactor: number;     // 承载力系数
    settleementFactor: number;         // 沉降系数
  };
  
  // 接触界面参数（壳元桩基特有）
  contactInterface?: {
    normalStiffness: number;           // 法向刚度 (N/m³)
    tangentialStiffness: number;       // 切向刚度 (N/m³)
    frictionCoefficient: number;       // 摩擦系数
    cohesion: number;                  // 界面粘聚力 (kPa)
  };
}

// 桩基计算数据接口
export interface PileCalculationData {
  // 基本信息
  pileId: string;
  pileType: PileType;
  modelingStrategy: PileModelingStrategy;
  
  // 几何参数
  geometry: PileGeometry;
  
  // 材料属性
  material: PileMaterial;
  
  // 土-桩相互作用
  soilInteraction: SoilPileInteraction;
  
  // 荷载条件
  loads: {
    axialLoad: number;                 // 轴向荷载 (kN)
    lateralLoad: number;               // 横向荷载 (kN)
    moment: number;                    // 弯矩 (kN⋅m)
    distributedLoad?: number;          // 分布荷载 (kN/m)
  };
  
  // 边界条件
  boundaryConditions: {
    topConstraint: 'fixed' | 'pinned' | 'free';
    bottomConstraint: 'fixed' | 'pinned' | 'elastic';
    lateralSupport: boolean;
  };
  
  // 分析参数
  analysisParameters: {
    elementSize: number;               // 单元尺寸 (m)
    integrationPoints: number;         // 积分点数
    nonlinearAnalysis: boolean;        // 是否非线性分析
    timeDependentAnalysis: boolean;    // 是否时程分析
  };
  
  // 特殊参数（挤密型桩基）
  compactionParameters?: {
    compactionRadius: number;          // 挤密半径 (m)
    soilImprovementFactor: number;     // 土体改良系数
    compactionDegree: number;          // 挤密度
    compositeFoundationEffect: boolean; // 是否考虑复合地基效应
  };
}

// 桩基分析结果接口
export interface PileAnalysisResult {
  pileId: string;
  modelingStrategy: PileModelingStrategy;
  
  // 承载力分析
  bearingCapacity: {
    ultimate: number;                  // 极限承载力 (kN)
    allowable: number;                 // 允许承载力 (kN)
    safetyFactor: number;              // 安全系数
    failureMode: 'compression' | 'tension' | 'shear' | 'buckling';
  };
  
  // 变形分析
  displacement: {
    axialSettlement: number;           // 轴向沉降 (mm)
    lateralDeflection: number;         // 横向变形 (mm)
    maxDisplacement: number;           // 最大位移 (mm)
    rotationAngle: number;             // 转角 (rad)
  };
  
  // 应力分析
  stress: {
    maxCompressiveStress: number;      // 最大压应力 (MPa)
    maxTensileStress: number;          // 最大拉应力 (MPa)
    maxShearStress: number;            // 最大剪应力 (MPa)
    vonMisesStress: number;            // von Mises应力 (MPa)
  };
  
  // 土-桩相互作用结果（壳元特有）
  soilInteractionResult?: {
    lateralFrictionDistribution: number[]; // 侧摩阻力分布
    endBearingPressure: number;            // 端承压力 (kPa)
    soilStressDistribution: number[];      // 土体应力分布
    pileGroupEffect: number;               // 群桩效应系数
  };
  
  // 稳定性分析
  stability: {
    bucklingLoad: number;              // 屈曲荷载 (kN)
    criticalLength: number;            // 临界长度 (m)
    stabilityFactor: number;           // 稳定系数
  };
}

// 桩基计算引擎接口
export interface PileCalculationEngine {
  // 计算方法
  calculateBearingCapacity(data: PileCalculationData): Promise<number>;
  calculateSettlement(data: PileCalculationData): Promise<number>;
  performNonlinearAnalysis(data: PileCalculationData): Promise<PileAnalysisResult>;
  
  // 特殊计算（挤密型桩基）
  calculateCompactionEffect?(data: PileCalculationData): Promise<{
    soilImprovementZone: number;       // 土体改良区域 (m²)
    strengthIncrease: number;          // 强度提高倍数
    stiffnessIncrease: number;         // 刚度提高倍数
  }>;
  
  // 群桩分析
  analyzeGroupEffect?(piles: PileCalculationData[]): Promise<{
    groupEfficiency: number;           // 群桩效率
    pileInteractionMatrix: number[][];  // 桩间相互作用矩阵
    totalCapacity: number;             // 群桩总承载力
  }>;
}

// 桩基数据转换器（为3号计算专家提供）
export class PileDataConverter {
  /**
   * 将UI选择的桩基类型转换为计算数据
   */
  static convertToCalculationData(
    pileType: PileType,
    strategy: PileModelingStrategy,
    geometryData: any,
    soilData: any
  ): PileCalculationData {
    const baseData: PileCalculationData = {
      pileId: `pile_${Date.now()}`,
      pileType,
      modelingStrategy: strategy,
      geometry: this.extractGeometry(geometryData),
      material: this.generateMaterialProperties(pileType),
      soilInteraction: this.calculateSoilInteraction(soilData, pileType),
      loads: this.getDefaultLoads(),
      boundaryConditions: this.getDefaultBoundaryConditions(strategy),
      analysisParameters: this.getDefaultAnalysisParameters(strategy),
    };

    // 为挤密型桩基添加特殊参数
    if (strategy === PileModelingStrategy.SHELL_ELEMENT) {
      baseData.compactionParameters = this.generateCompactionParameters(pileType);
    }

    return baseData;
  }

  /**
   * 提取几何参数
   */
  private static extractGeometry(geometryData: any): PileGeometry {
    return {
      id: geometryData.id || `geom_${Date.now()}`,
      coordinates: {
        top: geometryData.topPoint || { x: 0, y: 0, z: 0 },
        bottom: geometryData.bottomPoint || { x: 0, y: 0, z: -10 }
      },
      diameter: geometryData.diameter || 800,
      length: geometryData.length || 10,
      embedmentDepth: geometryData.embedmentDepth || 2,
      crossSectionalArea: Math.PI * Math.pow((geometryData.diameter || 800) / 2000, 2),
      perimeter: Math.PI * (geometryData.diameter || 800) / 1000
    };
  }

  /**
   * 根据桩基类型生成材料属性
   */
  private static generateMaterialProperties(pileType: PileType): PileMaterial {
    switch (pileType) {
      case PileType.BORED_CAST_IN_PLACE:
      case PileType.HAND_DUG:
        return {
          concrete: {
            strength: 25,           // C25混凝土
            elasticModulus: 28,     // 28 GPa
            poissonRatio: 0.2,
            density: 2400,          // kg/m³
            tensileStrength: 2.5    // MPa
          },
          reinforcement: {
            yieldStrength: 400,     // HRB400钢筋
            elasticModulus: 200,    // GPa
            area: 3000,             // mm²
            arrangementType: 'longitudinal'
          }
        };

      case PileType.PRECAST_DRIVEN:
        return {
          concrete: {
            strength: 40,           // C40预制混凝土
            elasticModulus: 32.5,
            poissonRatio: 0.2,
            density: 2500,
            tensileStrength: 3.5
          }
        };

      case PileType.SWM_METHOD:
      case PileType.CFG_PILE:
      case PileType.HIGH_PRESSURE_JET:
        return {
          cementSoil: {
            unconfined_strength: 1500,  // kPa
            elasticModulus: 150,        // MPa
            cohesion: 300,              // kPa
            frictionAngle: 25,          // 度
            density: 1800,              // kg/m³
            permeability: 1e-7          // m/s
          }
        };

      default:
        return { concrete: { strength: 25, elasticModulus: 28, poissonRatio: 0.2, density: 2400, tensileStrength: 2.5 } };
    }
  }

  /**
   * 计算土-桩相互作用参数
   */
  private static calculateSoilInteraction(soilData: any, pileType: PileType): SoilPileInteraction {
    const baseInteraction: SoilPileInteraction = {
      lateralFriction: {
        ultimate: soilData.cohesion * 0.6 || 50,  // kPa
        coefficient: 0.3,
        adhesionFactor: 0.8
      },
      endBearing: {
        ultimate: soilData.bearingCapacity || 2000,  // kPa
        bearingCapacityFactor: 9.0,
        settleementFactor: 0.02
      }
    };

    // 为壳元桩基添加接触界面参数
    if ([PileType.SWM_METHOD, PileType.CFG_PILE, PileType.HIGH_PRESSURE_JET].includes(pileType)) {
      baseInteraction.contactInterface = {
        normalStiffness: 1e8,        // N/m³
        tangentialStiffness: 5e7,    // N/m³
        frictionCoefficient: 0.4,
        cohesion: 100                // kPa
      };
    }

    return baseInteraction;
  }

  /**
   * 获取默认荷载
   */
  private static getDefaultLoads() {
    return {
      axialLoad: 1000,     // kN
      lateralLoad: 50,     // kN
      moment: 100,         // kN⋅m
      distributedLoad: 0   // kN/m
    };
  }

  /**
   * 根据策略获取边界条件
   */
  private static getDefaultBoundaryConditions(strategy: PileModelingStrategy) {
    return {
      topConstraint: 'pinned' as const,
      bottomConstraint: strategy === PileModelingStrategy.BEAM_ELEMENT ? 'fixed' as const : 'elastic' as const,
      lateralSupport: strategy === PileModelingStrategy.SHELL_ELEMENT
    };
  }

  /**
   * 根据策略获取分析参数
   */
  private static getDefaultAnalysisParameters(strategy: PileModelingStrategy) {
    return {
      elementSize: strategy === PileModelingStrategy.BEAM_ELEMENT ? 0.5 : 0.2,  // m
      integrationPoints: strategy === PileModelingStrategy.BEAM_ELEMENT ? 5 : 8,
      nonlinearAnalysis: strategy === PileModelingStrategy.SHELL_ELEMENT,
      timeDependentAnalysis: false
    };
  }

  /**
   * 为挤密型桩基生成挤密参数
   */
  private static generateCompactionParameters(pileType: PileType) {
    const baseRadius = {
      [PileType.SWM_METHOD]: 1.5,
      [PileType.CFG_PILE]: 1.2,
      [PileType.HIGH_PRESSURE_JET]: 2.0
    };

    return {
      compactionRadius: baseRadius[pileType] || 1.5,     // m
      soilImprovementFactor: 2.5,                        // 土体改良系数
      compactionDegree: 0.85,                            // 挤密度
      compositeFoundationEffect: true                     // 复合地基效应
    };
  }
}

// 导出所有接口供其他模块使用
export {
  PileType,
  PileModelingStrategy
};