/**
 * 数据流处理工具 - 统一接口协议实现
 */

import { 
  GeologyDataFlow, 
  ExcavationDataFlow, 
  SupportStructureDataFlow,
  CompleteGeometryDataFlow,
  DataFlowState,
  StandardApiResponse,
  QualityMetrics
} from '../types/dataFlow';

// ===== 数据流验证器 =====
export class DataFlowValidator {
  
  validateGeologyData(data: GeologyDataFlow['input']): boolean {
    if (!data.boreholes || data.boreholes.length < 3) {
      return false;
    }
    
    for (const borehole of data.boreholes) {
      if (!borehole.id || !borehole.location || borehole.depth <= 0) {
        return false;
      }
      if (!borehole.layers || borehole.layers.length === 0) {
        return false;
      }
    }
    
    return data.interpolationParams && 
           data.interpolationParams.gridResolution > 0 &&
           data.interpolationParams.domain !== null;
  }

  validateExcavationData(data: ExcavationDataFlow['input']): boolean {
    if (!data.geologicalModel || !data.excavationParams) {
      return false;
    }
    
    return data.excavationParams.depth > 0 &&
           data.excavationParams.geometry.length >= 3 &&
           data.excavationParams.stages.length > 0;
  }

  validateSupportData(data: SupportStructureDataFlow['input']): boolean {
    if (!data.excavationGeometry || !data.supportParams) {
      return false;
    }

    const hasSupport = data.supportParams.diaphragmWall ||
                      data.supportParams.anchors?.length > 0 ||
                      data.supportParams.steelSupports?.length > 0;
    
    return hasSupport;
  }

  validateCompleteModel(data: CompleteGeometryDataFlow): boolean {
    return data.geology && 
           data.excavation && 
           data.support &&
           data.integratedModel &&
           data.integratedModel.quality.readyForAnalysis;
  }
}

// ===== 数据流转换器 =====
export class DataFlowTransformer {
  
  transformGeologyToExcavation(
    geology: GeologyDataFlow['output']
  ): ExcavationDataFlow['input']['geologicalModel'] {
    return {
      vertices: geology.geologicalModel.vertices,
      cells: geology.geologicalModel.cells,
      materialZones: geology.geologicalModel.materialZones,
      quality: geology.geologicalModel.quality
    };
  }

  transformExcavationToSupport(
    excavation: ExcavationDataFlow['output']
  ): SupportStructureDataFlow['input']['excavationGeometry'] {
    return excavation.excavationGeometry;
  }

  integrateAllModels(
    geology: GeologyDataFlow['output'],
    excavation: ExcavationDataFlow['output'],
    support: SupportStructureDataFlow['output']
  ): CompleteGeometryDataFlow['integratedModel'] {
    
    // 合并几何数据
    const totalVertices = geology.geologicalModel.vertices.length + 
                         support.supportSystem.geometry.vertices.length;
    const mergedVertices = new Float32Array(totalVertices);
    
    mergedVertices.set(geology.geologicalModel.vertices, 0);
    mergedVertices.set(support.supportSystem.geometry.vertices, geology.geologicalModel.vertices.length);

    // 计算质量指标
    const avgQuality = (
      geology.geologicalModel.quality.score +
      excavation.excavationGeometry.quality.score + 
      support.supportSystem.quality.score
    ) / 3;

    const quality: QualityMetrics & {
      geometryConsistency: number;
      meshQuality: number;
      readyForAnalysis: boolean;
    } = {
      score: avgQuality,
      complexity: avgQuality > 0.8 ? 'low' : avgQuality > 0.6 ? 'medium' : 'high',
      meshReadiness: avgQuality > 0.65,
      estimatedElements: (geology.geologicalModel.quality.estimatedElements || 0) + 
                        (support.supportSystem.quality.estimatedElements || 0),
      geometryConsistency: 0.85, // 基于接口一致性
      meshQuality: avgQuality * 0.9, // 网格质量略低于几何质量
      readyForAnalysis: avgQuality > 0.65 && geology.geologicalModel.quality.meshReadiness
    };

    return {
      geometry: {
        vertices: mergedVertices,
        cells: new Uint32Array(), // 需要重新生成
        materialZones: [
          ...geology.geologicalModel.materialZones,
          {
            zoneId: 'support_structures',
            elementIds: [],
            materialProperties: {
              youngModulus: 30000000000, // 混凝土弹性模量
              poissonRatio: 0.2,
              density: 2500
            }
          }
        ]
      },
      quality,
      statistics: {
        totalElements: quality.estimatedElements || 0,
        totalNodes: Math.floor(mergedVertices.length / 3),
        processingTime: 0,
        memoryUsage: mergedVertices.byteLength
      }
    };
  }
}

// ===== 数据流状态管理器 =====
export class DataFlowStateManager {
  private state: DataFlowState = {
    currentStage: 'geology',
    progress: {
      geology: 0,
      excavation: 0,
      support: 0,
      integration: 0
    },
    errors: [],
    warnings: []
  };

  getState(): DataFlowState {
    return { ...this.state };
  }

  updateProgress(stage: keyof DataFlowState['progress'], progress: number) {
    this.state.progress[stage] = Math.max(0, Math.min(100, progress));
  }

  setCurrentStage(stage: DataFlowState['currentStage']) {
    this.state.currentStage = stage;
  }

  addError(stage: string, message: string) {
    this.state.errors.push({
      stage,
      message,
      timestamp: new Date().toISOString()
    });
  }

  addWarning(stage: string, message: string, severity: 'low' | 'medium' | 'high' = 'medium') {
    this.state.warnings.push({
      stage,
      message,
      severity
    });
  }

  clearErrors() {
    this.state.errors = [];
  }

  clearWarnings() {
    this.state.warnings = [];
  }

  reset() {
    this.state = {
      currentStage: 'geology',
      progress: {
        geology: 0,
        excavation: 0,
        support: 0,
        integration: 0
      },
      errors: [],
      warnings: []
    };
  }
}

// ===== API响应标准化工具 =====
export class ApiResponseFormatter {
  
  static formatSuccess<T>(data: T): StandardApiResponse<T> {
    return {
      success: true,
      data,
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: '1.0.0'
      }
    };
  }

  static formatError(code: string, message: string, details?: any): StandardApiResponse<never> {
    return {
      success: false,
      error: {
        code,
        message,
        details
      },
      metadata: {
        timestamp: new Date().toISOString(),
        processingTime: 0,
        version: '1.0.0'
      }
    };
  }
}

// ===== 工具函数导出 =====
export const dataFlowValidator = new DataFlowValidator();
export const dataFlowTransformer = new DataFlowTransformer();
export const dataFlowStateManager = new DataFlowStateManager();

// 便捷函数
export function validateDataFlow(type: string, data: any): boolean {
  switch (type) {
    case 'geology':
      return dataFlowValidator.validateGeologyData(data);
    case 'excavation':
      return dataFlowValidator.validateExcavationData(data);
    case 'support':
      return dataFlowValidator.validateSupportData(data);
    default:
      return false;
  }
}

export function createStandardResponse<T>(success: boolean, data?: T, error?: string): StandardApiResponse<T> {
  if (success && data !== undefined) {
    return ApiResponseFormatter.formatSuccess(data);
  } else {
    return ApiResponseFormatter.formatError('PROCESSING_ERROR', error || 'Unknown error');
  }
}