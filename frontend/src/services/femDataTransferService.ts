/**
 * FEM数据传递服务
 * 1号架构师 - 响应3号计算专家明确指令，集成FEMDataTransfer数据结构
 * 
 * 🎯 明确指令实现：
 * - 新增材料类型：compacted_soil
 * - 新增单元标识：compactionZone: true  
 * - 处理FEMDataTransfer数据结构
 * - 性能预估：计算量增加10-25%
 */

import { logger } from '../utils/advancedLogger';
import { PileCalculationData, PileModelingStrategy } from '../services/pileModelingDataInterface';

// ==================== FEM数据传递核心接口 ====================

/** FEM数据传递结构 - 3号计算专家扩展需求 */
export interface FEMDataTransfer {
  // 新增材料类型：compacted_soil
  materials: {
    [key: string]: {
      type: 'concrete' | 'steel' | 'cement_soil' | 'compacted_soil'; // 新增 compacted_soil
      properties: MaterialProperties;
    };
  };
  
  // 新增单元标识
  elements: Array<{
    id: string;
    type: 'beam' | 'shell' | 'solid';
    nodes: number[];
    material: string;
    compactionZone?: boolean; // 新增单元标识：compactionZone: true
    geometryData?: {
      volume?: number;
      surfaceArea?: number;
      centroid?: [number, number, number];
    };
  }>;
  
  // 挤密效应数据
  compactionData?: CompactionData;
  
  // 传递时机控制
  transferTiming: {
    geometryCompleted: boolean;
    userConfirmed: boolean;
    calculationReady: boolean;
    timestamp: number;
  };
  
  // 90%自动化标识
  automationLevel: number;
  
  // 性能预估数据
  performanceEstimate: {
    computationalIncrease: number; // 10-25%
    memoryRequirement: number;    // 额外内存需求
    processingTime: number;       // 预估处理时间
  };
}

/** 材料属性接口 */
interface MaterialProperties {
  // 通用属性
  density: number;
  elasticModulus: number;
  poissonRatio: number;
  
  // 挤密土体特有属性（compacted_soil）
  compactionFactor?: number;
  strengthIncrease?: number;
  stiffnessIncrease?: number;
  densityIncrease?: number;
  improvementRadius?: number;
  
  // 其他材料属性
  strength?: number;
  yieldStrength?: number;
  ultimateStrength?: number;
  cohesion?: number;
  frictionAngle?: number;
  permeability?: number;
}

/** 挤密数据接口 */
interface CompactionData {
  compactionRadius: number;
  affectedSoilVolume: number;
  strengthIncrease: number;
  stiffnessIncrease: number;
  densityIncrease: number;
  improvementZones: Array<{
    zoneId: string;
    centerPoint: [number, number, number];
    radius: number;
    improvementFactor: number;
  }>;
}

/** 数据验证结果接口 */
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  automationSuccess: number; // 自动化成功率 0-1
  performanceImpact: {
    computationalIncrease: number;
    memoryIncrease: number;
    timeIncrease: number;
  };
}

// ==================== FEM数据传递服务类 ====================

export class FEMDataTransferService {
  private static instance: FEMDataTransferService;
  private transferHistory: FEMDataTransfer[] = [];
  private validationCache = new Map<string, ValidationResult>();

  static getInstance(): FEMDataTransferService {
    if (!FEMDataTransferService.instance) {
      FEMDataTransferService.instance = new FEMDataTransferService();
    }
    return FEMDataTransferService.instance;
  }

  /**
   * 生成FEM数据传递结构
   * 1. 几何建模完成 → 立即调用 generatePhysicsGroupUpdateRequest()
   */
  generateFEMDataTransfer(pileData: PileCalculationData): FEMDataTransfer {
    const startTime = performance.now();
    
    logger.info('开始生成FEM数据传递结构', {
      pileId: pileData.pileId,
      strategy: pileData.modelingStrategy,
      timestamp: new Date().toISOString()
    });

    // 创建材料定义（包含新增的compacted_soil）
    const materials = this.createMaterialDefinitions(pileData);
    
    // 创建单元定义（包含compactionZone标识）
    const elements = this.createElementDefinitions(pileData);
    
    // 创建挤密数据
    const compactionData = this.createCompactionData(pileData);
    
    // 性能预估
    const performanceEstimate = this.calculatePerformanceEstimate(pileData);

    const femData: FEMDataTransfer = {
      materials,
      elements,
      compactionData,
      transferTiming: {
        geometryCompleted: true,
        userConfirmed: false, // 待用户确认
        calculationReady: false,
        timestamp: Date.now()
      },
      automationLevel: 0.90, // 90%自动化
      performanceEstimate
    };

    // 缓存数据
    this.transferHistory.push(femData);
    
    const processingTime = performance.now() - startTime;
    logger.performance('FEM数据传递结构生成完成', processingTime, {
      materialsCount: Object.keys(materials).length,
      elementsCount: elements.length,
      compactionZones: elements.filter(el => el.compactionZone).length,
      automationLevel: '90%'
    });

    return femData;
  }

  /**
   * 创建材料定义（响应3号计算专家需求）
   */
  private createMaterialDefinitions(pileData: PileCalculationData): FEMDataTransfer['materials'] {
    const materials: FEMDataTransfer['materials'] = {};

    // 桩基混凝土材料
    if (pileData.material.concrete) {
      materials.pile_concrete = {
        type: 'concrete',
        properties: {
          density: pileData.material.concrete.density,
          elasticModulus: pileData.material.concrete.elasticModulus * 1000, // GPa转Pa
          poissonRatio: pileData.material.concrete.poissonRatio,
          strength: pileData.material.concrete.strength
        }
      };
    }

    // 水泥土材料
    if (pileData.material.cementSoil) {
      materials.cement_soil = {
        type: 'cement_soil',
        properties: {
          density: pileData.material.cementSoil.density,
          elasticModulus: pileData.material.cementSoil.elasticModulus,
          poissonRatio: 0.3, // 典型值
          cohesion: pileData.material.cementSoil.cohesion,
          frictionAngle: pileData.material.cementSoil.frictionAngle,
          permeability: pileData.material.cementSoil.permeability
        }
      };
    }

    // 🔥 新增材料类型：compacted_soil（挤密土体）
    if (pileData.compactionParameters && pileData.modelingStrategy === PileModelingStrategy.SHELL_ELEMENT) {
      materials.compacted_soil = {
        type: 'compacted_soil',
        properties: {
          density: 1800, // kg/m³ 挤密后密度增加
          elasticModulus: 25000000, // Pa 挤密后弹性模量增加
          poissonRatio: 0.35,
          compactionFactor: pileData.compactionParameters.soilImprovementFactor,
          strengthIncrease: 1.5, // 强度提高50%
          stiffnessIncrease: 1.8, // 刚度提高80%
          densityIncrease: 1.2,   // 密度提高20%
          improvementRadius: pileData.compactionParameters.compactionRadius,
          cohesion: 75,           // kPa 挤密后粘聚力
          frictionAngle: 30       // 度 挤密后内摩擦角
        }
      };
    }

    // 钢筋材料
    if (pileData.material.reinforcement) {
      materials.reinforcement_steel = {
        type: 'steel',
        properties: {
          density: 7850, // kg/m³
          elasticModulus: pileData.material.reinforcement.elasticModulus * 1000000000, // GPa转Pa
          poissonRatio: 0.3,
          yieldStrength: pileData.material.reinforcement.yieldStrength,
          ultimateStrength: pileData.material.reinforcement.yieldStrength * 1.2
        }
      };
    }

    return materials;
  }

  /**
   * 创建单元定义（包含compactionZone标识）
   */
  private createElementDefinitions(pileData: PileCalculationData): FEMDataTransfer['elements'] {
    const elements: FEMDataTransfer['elements'] = [];

    // 桩基单元
    const pileElementType = pileData.modelingStrategy === PileModelingStrategy.BEAM_ELEMENT ? 'beam' : 'shell';
    elements.push({
      id: `pile_${pileData.pileId}`,
      type: pileElementType,
      nodes: this.generateNodeIds(pileElementType === 'beam' ? 2 : 8),
      material: 'pile_concrete',
      geometryData: {
        volume: pileData.geometry.crossSectionalArea * pileData.geometry.length,
        surfaceArea: pileData.geometry.perimeter * pileData.geometry.length,
        centroid: [
          (pileData.geometry.coordinates.top.x + pileData.geometry.coordinates.bottom.x) / 2,
          (pileData.geometry.coordinates.top.y + pileData.geometry.coordinates.bottom.y) / 2,
          (pileData.geometry.coordinates.top.z + pileData.geometry.coordinates.bottom.z) / 2
        ]
      }
    });

    // 🔥 挤密区域单元（新增单元标识：compactionZone: true）
    if (pileData.compactionParameters && pileData.modelingStrategy === PileModelingStrategy.SHELL_ELEMENT) {
      const compactionRadius = pileData.compactionParameters.compactionRadius;
      const compactionVolume = Math.PI * compactionRadius * compactionRadius * pileData.geometry.length;
      
      elements.push({
        id: `compaction_zone_${pileData.pileId}`,
        type: 'solid',
        nodes: this.generateNodeIds(20), // 更多节点用于复杂几何
        material: 'compacted_soil',
        compactionZone: true, // 🔥 新增单元标识：compactionZone: true
        geometryData: {
          volume: compactionVolume,
          surfaceArea: 2 * Math.PI * compactionRadius * pileData.geometry.length,
          centroid: [
            pileData.geometry.coordinates.top.x,
            pileData.geometry.coordinates.top.y,
            (pileData.geometry.coordinates.top.z + pileData.geometry.coordinates.bottom.z) / 2
          ]
        }
      });

      // 过渡区域单元（从挤密土体到原状土体的过渡）
      elements.push({
        id: `transition_zone_${pileData.pileId}`,
        type: 'solid',
        nodes: this.generateNodeIds(12),
        material: 'cement_soil',
        compactionZone: false, // 明确标识为非挤密区域
        geometryData: {
          volume: compactionVolume * 0.5, // 过渡区域体积
          surfaceArea: Math.PI * compactionRadius * 1.5 * pileData.geometry.length,
          centroid: [
            pileData.geometry.coordinates.top.x,
            pileData.geometry.coordinates.top.y,
            (pileData.geometry.coordinates.top.z + pileData.geometry.coordinates.bottom.z) / 2
          ]
        }
      });
    }

    return elements;
  }

  /**
   * 创建挤密数据
   */
  private createCompactionData(pileData: PileCalculationData): CompactionData | undefined {
    if (!pileData.compactionParameters || pileData.modelingStrategy !== PileModelingStrategy.SHELL_ELEMENT) {
      return undefined;
    }

    const compactionRadius = pileData.compactionParameters.compactionRadius;
    const pileLength = pileData.geometry.length;
    
    return {
      compactionRadius,
      affectedSoilVolume: Math.PI * compactionRadius * compactionRadius * pileLength,
      strengthIncrease: 1.5,
      stiffnessIncrease: 1.8,
      densityIncrease: 1.2,
      improvementZones: [
        {
          zoneId: `zone_1_${pileData.pileId}`,
          centerPoint: [
            pileData.geometry.coordinates.top.x,
            pileData.geometry.coordinates.top.y,
            pileData.geometry.coordinates.top.z - pileLength / 3
          ],
          radius: compactionRadius,
          improvementFactor: 1.8
        },
        {
          zoneId: `zone_2_${pileData.pileId}`,
          centerPoint: [
            pileData.geometry.coordinates.top.x,
            pileData.geometry.coordinates.top.y,
            pileData.geometry.coordinates.top.z - 2 * pileLength / 3
          ],
          radius: compactionRadius * 0.8,
          improvementFactor: 1.5
        }
      ]
    };
  }

  /**
   * 计算性能预估（计算量增加10-25%）
   */
  private calculatePerformanceEstimate(pileData: PileCalculationData) {
    const baseComplexity = 100; // 基准复杂度
    let computationalIncrease = 10; // 基础10%增加
    
    // 壳元分析增加更多计算量
    if (pileData.modelingStrategy === PileModelingStrategy.SHELL_ELEMENT) {
      computationalIncrease = 25; // 25%增加
    }
    
    // 挤密参数进一步增加计算量
    if (pileData.compactionParameters) {
      computationalIncrease += 5; // 额外5%
    }

    const memoryRequirement = baseComplexity * (1 + computationalIncrease / 100) * 1024 * 1024; // 字节
    const processingTime = baseComplexity * (1 + computationalIncrease / 100) * 10; // 毫秒

    return {
      computationalIncrease,
      memoryRequirement,
      processingTime
    };
  }

  /**
   * 验证FEM数据传递完整性（3号验证需求）
   */
  validateFEMDataTransfer(data: FEMDataTransfer): ValidationResult {
    const cacheKey = this.generateCacheKey(data);
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    let automationSuccess = 1.0;

    // 验证材料类型
    const hasCompactedSoil = Object.values(data.materials).some(mat => mat.type === 'compacted_soil');
    const hasCompactionElements = data.elements.some(el => el.compactionZone === true);

    if (hasCompactionElements && !hasCompactedSoil) {
      errors.push('存在挤密区域单元但缺少compacted_soil材料类型');
      automationSuccess -= 0.3;
    }

    // 验证单元标识
    const compactionElements = data.elements.filter(el => el.compactionZone === true);
    if (data.compactionData && compactionElements.length === 0) {
      errors.push('存在挤密数据但缺少compactionZone单元标识');
      automationSuccess -= 0.2;
    }

    // 验证数据结构完整性
    if (!data.materials || Object.keys(data.materials).length === 0) {
      errors.push('缺少材料定义');
      automationSuccess -= 0.5;
    }

    if (!data.elements || data.elements.length === 0) {
      errors.push('缺少单元定义');
      automationSuccess -= 0.5;
    }

    // 性能影响评估
    const performanceImpact = {
      computationalIncrease: data.performanceEstimate.computationalIncrease,
      memoryIncrease: data.performanceEstimate.memoryRequirement / (1024 * 1024), // MB
      timeIncrease: data.performanceEstimate.processingTime / 1000 // 秒
    };

    if (performanceImpact.computationalIncrease > 30) {
      warnings.push(`计算量增加${performanceImpact.computationalIncrease}%，可能影响性能`);
    }

    const result: ValidationResult = {
      isValid: errors.length === 0,
      errors,
      warnings,
      automationSuccess: Math.max(0, automationSuccess),
      performanceImpact
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * 2. 用户确认变化 → 通知1号更新UI状态
   */
  confirmUserChanges(femData: FEMDataTransfer): void {
    femData.transferTiming.userConfirmed = true;
    femData.transferTiming.timestamp = Date.now();

    logger.userAction('fem_data_user_confirmed', 'FEMDataTransferService', {
      materialsCount: Object.keys(femData.materials).length,
      compactionZones: femData.elements.filter(el => el.compactionZone).length,
      automationLevel: femData.automationLevel
    });

    // 触发UI状态更新事件
    this.notifyUIStateUpdate(femData);
  }

  /**
   * 3. 计算开始前 → 3号验证FEMDataTransfer完整性
   */
  prepareForCalculation(femData: FEMDataTransfer): ValidationResult {
    const validation = this.validateFEMDataTransfer(femData);
    
    if (validation.isValid) {
      femData.transferTiming.calculationReady = true;
      femData.transferTiming.timestamp = Date.now();
      
      logger.info('FEM数据传递准备完成，可以开始计算', {
        automationSuccess: validation.automationSuccess,
        performanceIncrease: `${validation.performanceImpact.computationalIncrease}%`
      });
    } else {
      logger.error('FEM数据传递验证失败', {
        errors: validation.errors
      });
    }

    return validation;
  }

  // ==================== 辅助方法 ====================

  private generateNodeIds(count: number): number[] {
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  private generateCacheKey(data: FEMDataTransfer): string {
    return `${Object.keys(data.materials).join('_')}_${data.elements.length}_${data.transferTiming.timestamp}`;
  }

  private notifyUIStateUpdate(femData: FEMDataTransfer): void {
    // 可以在这里发送事件到UI组件
    const event = new CustomEvent('fem-data-updated', {
      detail: {
        femData,
        automationLevel: femData.automationLevel,
        timestamp: femData.transferTiming.timestamp
      }
    });
    window.dispatchEvent(event);
  }

  // 获取传递历史
  getTransferHistory(): FEMDataTransfer[] {
    return [...this.transferHistory];
  }

  // 清理缓存
  clearCache(): void {
    this.validationCache.clear();
    this.transferHistory = [];
  }
}

// 全局实例
export const femDataTransferService = FEMDataTransferService.getInstance();

// 导出类型
export type { FEMDataTransfer, ValidationResult, CompactionData };