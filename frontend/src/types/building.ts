/**
 * 建筑分析相关的类型定义
 */

// 桩材料类型
export type PileMaterial = 'concrete' | 'steel' | 'composite';

// 相邻间距参数
export interface AdjacentSpacing {
  northDistance: number;    // 北侧距离 (m)
  southDistance: number;    // 南侧距离 (m)
  eastDistance: number;     // 东侧距离 (m)
  westDistance: number;     // 西侧距离 (m)
}

// 底板参数
export interface FloorParameters {
  length: number;           // 长度 (m)
  width: number;            // 宽度 (m)
  elevation: number;        // 标高 (m)
  lengthDistance: number;   // 长度距离 (m)
  widthDistance: number;    // 宽度距离 (m)
}

// 桩参数
export interface PileParameters {
  margin: number;           // 边距 (m)
  count: number;            // 根数
  length: number;           // 桩长 (m)
  diameter: number;         // 桩径 (m)
  material: PileMaterial;   // 材料
}

// 建筑分析参数接口
export interface BuildingAnalysisParameters {
  adjacentSpacing: AdjacentSpacing;
  floorParameters: FloorParameters;
  pileParameters: PileParameters;
}

// 建筑分析结果
export interface BuildingAnalysisResult {
  spacingAnalysis: {
    safetyLevel: 'safe' | 'warning' | 'danger';
    recommendations: string[];
  };
  floorAnalysis: {
    area: number;           // 面积 (m²)
    perimeter: number;      // 周长 (m)
    elevationType: 'above' | 'below';
  };
  pileAnalysis: {
    singlePileVolume: number;   // 单桩体积 (m³)
    totalVolume: number;        // 总体积 (m³)
    averageSpacing: number;     // 平均间距 (m)
    loadCapacity: number;       // 承载力估算 (kN)
  };
}