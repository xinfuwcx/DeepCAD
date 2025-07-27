/**
 * 统一数据流类型定义 - 3号计算专家建议的数据规范化
 * 地质→开挖→支护→计算的完整数据流
 */

// ===== 基础数据类型 =====
export interface Coordinate3D {
  x: number;
  y: number;  
  z: number;
}

export interface BoundingBox {
  min: Coordinate3D;
  max: Coordinate3D;
}

export interface QualityMetrics {
  score: number; // 0-1
  complexity: 'low' | 'medium' | 'high';
  meshReadiness: boolean;
  estimatedElements?: number;
}

// ===== 地质建模数据流 =====
export interface GeologyDataFlow {
  input: {
    boreholes: Array<{
      id: string;
      location: Coordinate3D;
      depth: number;
      layers: Array<{
        topElevation: number;
        bottomElevation: number;
        soilType: string;
        properties: Record<string, number>;
      }>;
    }>;
    interpolationParams: {
      method: 'kriging' | 'idw' | 'spline';
      gridResolution: number;
      domain: BoundingBox;
    };
  };
  output: {
    geologicalModel: {
      vertices: Float32Array;
      cells: Uint32Array;
      materialZones: Array<{
        zoneId: string;
        materialType: string;
        boundary: Coordinate3D[];
      }>;
      quality: QualityMetrics;
    };
    metadata: {
      processingTime: number;
      dataSource: string;
      timestamp: string;
    };
  };
}

// ===== 开挖设计数据流 =====
export interface ExcavationDataFlow {
  input: {
    geologicalModel: GeologyDataFlow['output']['geologicalModel'];
    excavationParams: {
      depth: number;
      geometry: Coordinate3D[];
      stages: Array<{
        stageId: string;
        depth: number;
        sequence: number;
      }>;
    };
    dxfData?: {
      entities: any[];
      boundaries: Coordinate3D[][];
    };
  };
  output: {
    excavationGeometry: {
      excavatedVolume: number;
      stages: Array<{
        stageId: string;
        geometry: {
          vertices: Float32Array;
          faces: Uint32Array;
        };
        soilVolume: number;
      }>;
      quality: QualityMetrics;
    };
    impactAnalysis: {
      affectedSoilLayers: string[];
      stabilityRisk: 'low' | 'medium' | 'high';
      recommendations: string[];
    };
  };
}

// ===== 支护结构数据流 =====
export interface SupportStructureDataFlow {
  input: {
    excavationGeometry: ExcavationDataFlow['output']['excavationGeometry'];
    supportParams: {
      diaphragmWall?: {
        thickness: number;
        depth: number;
        segments: Coordinate3D[][];
      };
      anchors?: Array<{
        location: Coordinate3D;
        length: number;
        angle: number;  
        capacity: number;
      }>;
      steelSupports?: Array<{
        level: number;
        elements: Array<{
          start: Coordinate3D;
          end: Coordinate3D;
          sectionType: string;
        }>;
      }>;
    };
  };
  output: {
    supportSystem: {
      totalElements: number;
      supportTypes: string[];
      geometry: {
        vertices: Float32Array;
        elements: Uint32Array;
      };
      loadCapacity: {
        totalCapacity: number;
        safetyFactor: number;
        criticalPoints: Coordinate3D[];
      };
      quality: QualityMetrics;
    };
    structuralAnalysis: {
      stiffness: number;
      deflectionLimit: number;
      recommendations: string[];
    };
  };
}

// ===== 完整几何模型数据流 =====
export interface CompleteGeometryDataFlow {
  geology: GeologyDataFlow;
  excavation: ExcavationDataFlow;
  support: SupportStructureDataFlow;
  
  // 集成后的完整模型
  integratedModel: {
    geometry: {
      vertices: Float32Array;
      cells: Uint32Array;
      materialZones: Array<{
        zoneId: string;
        elementIds: number[];
        materialProperties: Record<string, number>;
      }>;
    };
    quality: QualityMetrics & {
      geometryConsistency: number;
      meshQuality: number;
      readyForAnalysis: boolean;
    };
    statistics: {
      totalElements: number;
      totalNodes: number;
      processingTime: number;
      memoryUsage: number;
    };
  };
  
  // 元数据
  metadata: {
    version: string;
    timestamp: string;
    workflow: Array<{
      stage: 'geology' | 'excavation' | 'support' | 'integration';
      status: 'completed' | 'failed' | 'skipped';
      duration: number;
    }>;
  };
}

// ===== 实时数据流状态 =====
export interface DataFlowState {
  currentStage: 'geology' | 'excavation' | 'support' | 'integration';
  progress: {
    geology: number;
    excavation: number; 
    support: number;
    integration: number;
  };
  errors: Array<{
    stage: string;
    message: string;
    timestamp: string;
  }>;
  warnings: Array<{
    stage: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

// ===== API响应格式标准化 =====
export interface StandardApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  metadata: {
    timestamp: string;
    processingTime: number;
    version: string;
  };
}

// ===== 导出类型联合 =====
export type GeometryDataFlow = 
  | GeologyDataFlow
  | ExcavationDataFlow  
  | SupportStructureDataFlow
  | CompleteGeometryDataFlow;

export type DataFlowType = 
  | 'geology'
  | 'excavation'
  | 'support' 
  | 'complete';

// ===== 工具函数类型 =====
export interface DataFlowValidator {
  validateGeologyData(data: GeologyDataFlow['input']): boolean;
  validateExcavationData(data: ExcavationDataFlow['input']): boolean;
  validateSupportData(data: SupportStructureDataFlow['input']): boolean;
  validateCompleteModel(data: CompleteGeometryDataFlow): boolean;
}

export interface DataFlowTransformer {
  transformGeologyToExcavation(
    geology: GeologyDataFlow['output']
  ): ExcavationDataFlow['input']['geologicalModel'];
  
  transformExcavationToSupport(
    excavation: ExcavationDataFlow['output']
  ): SupportStructureDataFlow['input']['excavationGeometry'];
  
  integrateAllModels(
    geology: GeologyDataFlow['output'],
    excavation: ExcavationDataFlow['output'],
    support: SupportStructureDataFlow['output']
  ): CompleteGeometryDataFlow['integratedModel'];
}