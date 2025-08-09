#!/usr/bin/env typescript
/**
 * DeepCAD增强桩基计算服务 - 集成2号专家的建模策略修正
 * 3号计算专家 - 前端计算服务集成
 * 
 * 基于正确的桩基分类实现差异化计算：
 * - 置换型桩基（梁元）：承载力分析 + 桩-土相互作用
 * - 挤密型桩基（壳元）：土体改良效应 + 复合地基计算
 */

import { apiClient } from '../api/client';

// 桩基类型枚举（与2号专家和Python后端保持一致）
export enum PileType {
  BORED_CAST_IN_PLACE = 'BORED_CAST_IN_PLACE',     // 钻孔灌注桩
  HAND_DUG = 'HAND_DUG',                           // 人工挖孔桩
  PRECAST_DRIVEN = 'PRECAST_DRIVEN',               // 预制桩
  SWM_METHOD = 'SWM_METHOD',                       // SWM工法桩（搅拌桩）
  CFG_PILE = 'CFG_PILE',                           // CFG桩
  HIGH_PRESSURE_JET = 'HIGH_PRESSURE_JET'          // 高压旋喷桩
}

export enum PileModelingStrategy {
  BEAM_ELEMENT = 'BEAM_ELEMENT',    // 梁元模拟
  SHELL_ELEMENT = 'SHELL_ELEMENT'   // 壳元模拟
}

// 桩基几何参数接口
export interface PileGeometry {
  diameter: number;          // 桩径 (m)
  length: number;           // 桩长 (m)
  pileType: PileType;       // 桩基类型
  modelingStrategy: PileModelingStrategy;  // 建模策略
  
  // 置换型桩基参数
  concreteGrade?: string;      // 混凝土标号
  reinforcementRatio?: number; // 配筋率
  
  // 挤密型桩基参数
  improvementDiameter?: number;  // 改良直径
  cementContent?: number;        // 水泥掺入比
  compactionRatio?: number;      // 挤密比
}

// 土层参数接口
export interface SoilLayer {
  depthTop: number;        // 层顶深度 (m)
  depthBottom: number;     // 层底深度 (m)
  unitWeight: number;      // 重度 (kN/m³)
  cohesion: number;        // 粘聚力 (kPa)
  frictionAngle: number;   // 内摩擦角 (°)
  compressionModulus: number;  // 压缩模量 (MPa)
  
  // 挤密改良后参数
  improvedCohesion?: number;
  improvedFrictionAngle?: number;
  improvedModulus?: number;
}

// 桩基计算结果接口
export interface PileCalculationResult {
  pileId: string;
  pileType: PileType;
  modelingStrategy: PileModelingStrategy;
  
  // 承载力计算结果
  ultimateCapacity: number;      // 极限承载力 (kN)
  allowableCapacity: number;     // 允许承载力 (kN)
  sideResistance: number;        // 侧阻力 (kN)
  tipResistance: number;         // 端阻力 (kN)
  
  // 变形计算结果
  settlement: number;            // 沉降量 (mm)
  elasticShortening: number;     // 弹性压缩量 (mm)
  
  // 挤密型桩基特有结果
  improvementEffect?: Record<string, {
    cohesionImprovement: number;
    frictionAngleImprovement: number;
    modulusImprovement: number;
  }>;
  compositeFoundationCapacity?: number;  // 复合地基承载力
}

// 计算报告接口
export interface PileCalculationReport {
  calculationSummary: {
    totalPiles: number;
    beamElementPiles: number;
    shellElementPiles: number;
  };
  beamElementAnalysis: {
    pileTypes: string[];
    averageCapacity: number;
    averageSettlement: number;
  };
  shellElementAnalysis: {
    pileTypes: string[];
    averageCompositeCapacity: number;
    improvementEffectiveness: {
      averageCohesionImprovement: number;
      averageFrictionImprovement: number;
      averageModulusImprovement: number;
    };
  };
  detailedResults: Array<{
    pileId: string;
    pileType: string;
    modelingStrategy: string;
    allowableCapacity: number;
    settlement: number;
    improvementEffect?: any;
  }>;
}

export class EnhancedPileCalculationService {
  // 直接使用共享 axios 实例
  private apiClient = apiClient;

  /**
   * 获取桩基类型与建模策略的映射关系
   */
  public getPileTypeStrategyMapping(): Record<PileType, PileModelingStrategy> {
    return {
      // 置换型桩基 → 梁元模拟
      [PileType.BORED_CAST_IN_PLACE]: PileModelingStrategy.BEAM_ELEMENT,
      [PileType.HAND_DUG]: PileModelingStrategy.BEAM_ELEMENT,
      [PileType.PRECAST_DRIVEN]: PileModelingStrategy.BEAM_ELEMENT,
      
      // 挤密型桩基 → 壳元模拟
      [PileType.SWM_METHOD]: PileModelingStrategy.SHELL_ELEMENT,
      [PileType.CFG_PILE]: PileModelingStrategy.SHELL_ELEMENT,
      [PileType.HIGH_PRESSURE_JET]: PileModelingStrategy.SHELL_ELEMENT
    };
  }

  /**
   * 获取可用的桩基类型列表
   */
  public getAvailablePileTypes(): Array<{
    type: PileType;
    name: string;
    description: string;
    strategy: PileModelingStrategy;
    category: 'displacement' | 'compacting';
  }> {
    const mapping = this.getPileTypeStrategyMapping();
    
    return [
      {
        type: PileType.BORED_CAST_IN_PLACE,
        name: '钻孔灌注桩',
        description: '机械钻孔，现场灌注混凝土，适用于各种地质条件',
        strategy: mapping[PileType.BORED_CAST_IN_PLACE],
        category: 'displacement'
      },
      {
        type: PileType.HAND_DUG,
        name: '人工挖孔桩',
        description: '人工挖孔，护壁支护，适用于较浅桩长的工程',
        strategy: mapping[PileType.HAND_DUG],
        category: 'displacement'
      },
      {
        type: PileType.PRECAST_DRIVEN,
        name: '预制桩',
        description: '预制混凝土桩打入或压入，施工快速，质量稳定',
        strategy: mapping[PileType.PRECAST_DRIVEN],
        category: 'displacement'
      },
      {
        type: PileType.SWM_METHOD,
        name: 'SWM工法桩',
        description: '搅拌桩，水泥土搅拌加固，适用于软土地基处理',
        strategy: mapping[PileType.SWM_METHOD],
        category: 'compacting'
      },
      {
        type: PileType.CFG_PILE,
        name: 'CFG桩',
        description: '水泥粉煤灰碎石桩，复合地基，经济效益好',
        strategy: mapping[PileType.CFG_PILE],
        category: 'compacting'
      },
      {
        type: PileType.HIGH_PRESSURE_JET,
        name: '高压旋喷桩',
        description: '高压旋喷技术，土体改良效果好，适用于各种土质',
        strategy: mapping[PileType.HIGH_PRESSURE_JET],
        category: 'compacting'
      }
    ];
  }

  /**
   * 获取建模策略说明
   */
  public getModelingStrategyExplanation(
    pileType: PileType, 
    strategy: PileModelingStrategy
  ): string {
    const explanations = {
      [PileType.BORED_CAST_IN_PLACE]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '钻孔灌注桩采用梁元模拟，重点分析桩身承载力和桩-土相互作用，适合承载力计算。',
        [PileModelingStrategy.SHELL_ELEMENT]: '不推荐：钻孔灌注桩为置换型桩基，应采用梁元模拟。'
      },
      [PileType.HAND_DUG]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '人工挖孔桩采用梁元模拟，考虑护壁结构和桩土共同作用机制。',
        [PileModelingStrategy.SHELL_ELEMENT]: '不推荐：人工挖孔桩为置换型桩基，应采用梁元模拟。'
      },
      [PileType.PRECAST_DRIVEN]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '预制桩采用梁元模拟，分析打桩过程中的挤土效应和最终承载性能。',
        [PileModelingStrategy.SHELL_ELEMENT]: '不推荐：预制桩为置换型桩基，应采用梁元模拟。'
      },
      [PileType.SWM_METHOD]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '不推荐：SWM搅拌桩为挤密型桩基，应采用壳元模拟分析土体改良效应。',
        [PileModelingStrategy.SHELL_ELEMENT]: 'SWM搅拌桩采用壳元模拟，重点分析土体搅拌改良和复合地基效应。'
      },
      [PileType.CFG_PILE]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '不推荐：CFG桩为挤密型桩基，应采用壳元模拟分析复合地基性能。',
        [PileModelingStrategy.SHELL_ELEMENT]: 'CFG桩采用壳元模拟，分析桩土复合作用和地基承载力提升效果。'
      },
      [PileType.HIGH_PRESSURE_JET]: {
        [PileModelingStrategy.BEAM_ELEMENT]: '不推荐：高压旋喷桩为挤密型桩基，应采用壳元模拟。',
        [PileModelingStrategy.SHELL_ELEMENT]: '高压旋喷桩采用壳元模拟，重点分析旋喷加固范围和土体改良效果。'
      }
    };

    return explanations[pileType]?.[strategy] || '建模策略说明暂不可用';
  }

  /**
   * 单桩承载力计算
   */
  public async calculateSinglePile(
    pile: PileGeometry,
    soilLayers: SoilLayer[],
    pileId: string = 'PILE_001'
  ): Promise<PileCalculationResult> {
    try {
      const requestData = {
        pile_id: pileId,
        diameter: pile.diameter,
        length: pile.length,
        properties: {
          pileType: pile.pileType,
          pileModeling: {
            strategy: pile.modelingStrategy,
            userPreference: pile.modelingStrategy
          },
          concreteGrade: pile.concreteGrade,
          reinforcementRatio: pile.reinforcementRatio,
          improvementDiameter: pile.improvementDiameter,
          cementContent: pile.cementContent,
          compactionRatio: pile.compactionRatio
        },
        soil_layers: soilLayers.map(layer => ({
          depth_top: layer.depthTop,
          depth_bottom: layer.depthBottom,
          unit_weight: layer.unitWeight,
          cohesion: layer.cohesion,
          friction_angle: layer.frictionAngle,
          compression_modulus: layer.compressionModulus,
          improved_cohesion: layer.improvedCohesion,
          improved_friction_angle: layer.improvedFrictionAngle,
          improved_modulus: layer.improvedModulus
        }))
      };

      const response = await this.apiClient.post('/api/pile/calculate-single', requestData);

      return {
        pileId: response.data.pile_id,
        pileType: response.data.pile_type as PileType,
        modelingStrategy: response.data.modeling_strategy as PileModelingStrategy,
        ultimateCapacity: response.data.ultimate_capacity,
        allowableCapacity: response.data.allowable_capacity,
        sideResistance: response.data.side_resistance,
        tipResistance: response.data.tip_resistance,
        settlement: response.data.settlement,
        elasticShortening: response.data.elastic_shortening,
        improvementEffect: response.data.improvement_effect,
        compositeFoundationCapacity: response.data.composite_foundation_capacity
      };

    } catch (error) {
      console.error('桩基计算失败:', error);
      throw new Error(`桩基计算失败: ${error}`);
    }
  }

  /**
   * 批量桩基计算
   */
  public async calculateMultiplePiles(
    piles: Array<{ geometry: PileGeometry; pileId: string }>,
    soilLayers: SoilLayer[]
  ): Promise<PileCalculationResult[]> {
    try {
      const requestData = {
        piles: piles.map(({ geometry, pileId }) => ({
          pile_id: pileId,
          diameter: geometry.diameter,
          length: geometry.length,
          properties: {
            pileType: geometry.pileType,
            pileModeling: {
              strategy: geometry.modelingStrategy,
              userPreference: geometry.modelingStrategy
            },
            concreteGrade: geometry.concreteGrade,
            reinforcementRatio: geometry.reinforcementRatio,
            improvementDiameter: geometry.improvementDiameter,
            cementContent: geometry.cementContent,
            compactionRatio: geometry.compactionRatio
          }
        })),
        soil_layers: soilLayers.map(layer => ({
          depth_top: layer.depthTop,
          depth_bottom: layer.depthBottom,
          unit_weight: layer.unitWeight,
          cohesion: layer.cohesion,
          friction_angle: layer.frictionAngle,
          compression_modulus: layer.compressionModulus,
          improved_cohesion: layer.improvedCohesion,
          improved_friction_angle: layer.improvedFrictionAngle,
          improved_modulus: layer.improvedModulus
        }))
      };

      const response = await this.apiClient.post('/api/pile/calculate-batch', requestData);

      return response.data.results.map((result: any) => ({
        pileId: result.pile_id,
        pileType: result.pile_type as PileType,
        modelingStrategy: result.modeling_strategy as PileModelingStrategy,
        ultimateCapacity: result.ultimate_capacity,
        allowableCapacity: result.allowable_capacity,
        sideResistance: result.side_resistance,
        tipResistance: result.tip_resistance,
        settlement: result.settlement,
        elasticShortening: result.elastic_shortening,
        improvementEffect: result.improvement_effect,
        compositeFoundationCapacity: result.composite_foundation_capacity
      }));

    } catch (error) {
      console.error('批量桩基计算失败:', error);
      throw new Error(`批量桩基计算失败: ${error}`);
    }
  }

  /**
   * 生成计算报告
   */
  public async generateCalculationReport(
    results: PileCalculationResult[]
  ): Promise<PileCalculationReport> {
    try {
      const requestData = {
        results: results.map(result => ({
          pile_id: result.pileId,
          pile_type: result.pileType,
          modeling_strategy: result.modelingStrategy,
          ultimate_capacity: result.ultimateCapacity,
          allowable_capacity: result.allowableCapacity,
          side_resistance: result.sideResistance,
          tip_resistance: result.tipResistance,
          settlement: result.settlement,
          elastic_shortening: result.elasticShortening,
          improvement_effect: result.improvementEffect,
          composite_foundation_capacity: result.compositeFoundationCapacity
        }))
      };

      const response = await this.apiClient.post('/api/pile/generate-report', requestData);

      return {
        calculationSummary: response.data.calculation_summary,
        beamElementAnalysis: response.data.beam_element_analysis,
        shellElementAnalysis: response.data.shell_element_analysis,
        detailedResults: response.data.detailed_results
      };

    } catch (error) {
      console.error('生成计算报告失败:', error);
      throw new Error(`生成计算报告失败: ${error}`);
    }
  }

  /**
   * 验证桩基参数
   */
  public validatePileParameters(pile: PileGeometry): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 基本几何参数验证
    if (pile.diameter <= 0 || pile.diameter > 3.0) {
      errors.push('桩径应在0-3.0m范围内');
    }

    if (pile.length <= 0 || pile.length > 100.0) {
      errors.push('桩长应在0-100m范围内');
    }

    // 长径比检查
    const lengthToDiameterRatio = pile.length / pile.diameter;
    if (lengthToDiameterRatio < 5) {
      warnings.push('桩长径比过小，可能影响承载力发挥');
    } else if (lengthToDiameterRatio > 50) {
      warnings.push('桩长径比过大，需考虑桩身稳定性');
    }

    // 挤密型桩基特殊参数验证
    if ([PileType.SWM_METHOD, PileType.CFG_PILE, PileType.HIGH_PRESSURE_JET].includes(pile.pileType)) {
      if (pile.improvementDiameter && pile.improvementDiameter <= pile.diameter) {
        errors.push('改良直径应大于桩径');
      }

      if (pile.cementContent && (pile.cementContent < 0.05 || pile.cementContent > 0.3)) {
        warnings.push('水泥掺入比建议在5%-30%范围内');
      }
    }

    // 建模策略一致性检查
    const recommendedStrategy = this.getPileTypeStrategyMapping()[pile.pileType];
    if (pile.modelingStrategy !== recommendedStrategy) {
      warnings.push(`${pile.pileType}建议使用${recommendedStrategy}建模策略`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取桩基计算说明
   */
  public getPileCalculationExplanation(result: PileCalculationResult): {
    methodology: string;
    keyFactors: string[];
    recommendations: string[];
  } {
    const isBeamElement = result.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT;

    return {
      methodology: isBeamElement 
        ? '采用梁元建模策略，基于桩身承载力理论，计算桩侧阻力和桩端阻力的叠加。'
        : '采用壳元建模策略，基于复合地基理论，考虑土体改良效应和桩土复合作用。',
      keyFactors: isBeamElement 
        ? ['桩身材料强度', '桩土接触面摩擦', '土层承载力', '桩长径比']
        : ['土体改良范围', '复合地基置换率', '桩土强度匹配', '挤密效应'],
      recommendations: this.generateRecommendations(result)
    };
  }

  private generateRecommendations(result: PileCalculationResult): string[] {
    const recommendations: string[] = [];

    // 承载力建议
    if (result.allowableCapacity < 500) {
      recommendations.push('承载力较低，建议增加桩径或桩长');
    }

    // 沉降建议
    if (result.settlement > 30) {
      recommendations.push('沉降量较大，建议优化桩基设计或增加桩数');
    } else if (result.settlement < 10) {
      recommendations.push('沉降量较小，设计较为保守，可考虑优化经济性');
    }

    // 挤密型桩基特殊建议
    if (result.modelingStrategy === PileModelingStrategy.SHELL_ELEMENT) {
      if (result.compositeFoundationCapacity && result.allowableCapacity > 0) {
        const utilizationRatio = result.allowableCapacity / result.compositeFoundationCapacity;
        if (utilizationRatio < 0.6) {
          recommendations.push('复合地基利用率较低，可考虑减少桩数或调整桩径');
        } else if (utilizationRatio > 0.9) {
          recommendations.push('复合地基利用率较高，建议适当增加安全储备');
        }
      }

      if (result.improvementEffect) {
        const avgCohesionImprovement = Object.values(result.improvementEffect)
          .reduce((sum, effect) => sum + effect.cohesionImprovement, 0) / 
          Object.keys(result.improvementEffect).length;
        
        if (avgCohesionImprovement < 20) {
          recommendations.push('土体改良效果一般，建议增加水泥掺入比或改进施工工艺');
        }
      }
    }

    return recommendations;
  }
}

// 导出默认实例
export const enhancedPileCalculationService = new EnhancedPileCalculationService();