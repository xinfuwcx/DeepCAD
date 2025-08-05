/**
 * 隧道建模相关类型定义
 */

// 隧道截面类型
export type TunnelCrossSection = 'circular' | 'horseshoe' | 'rectangular';

// 衬砌材料类型
export type LiningMaterial = 'concrete' | 'steel' | 'composite' | 'shotcrete';

// 隧道截面尺寸
export interface TunnelDimensions {
  diameter?: number;        // 圆形直径 (m)
  width?: number;          // 宽度 (m)
  height?: number;         // 高度 (m)
  archRadius?: number;     // 马蹄形拱部半径 (m)
}

// 钢筋配置
export interface ReinforcementConfig {
  enabled: boolean;
  steelGrade: 'HRB400' | 'HRB500' | 'HRB600';
  spacing: number;         // 钢筋间距 (m)
}

// 衬砌参数
export interface LiningParameters {
  material: LiningMaterial;
  thickness: number;       // 衬砌厚度 (m)
  reinforcement?: ReinforcementConfig;
}

// 隧道基本参数
export interface TunnelBasicParameters {
  length: number;          // 隧道长度 (m)
  depth: number;           // 埋深 (m)
  gradient: number;        // 纵坡 (%)
}

// 隧道截面参数
export interface TunnelCrossSectionParameters {
  type: TunnelCrossSection;
  dimensions: TunnelDimensions;
}

// 完整的隧道参数
export interface TunnelParameters {
  crossSection: TunnelCrossSectionParameters;
  lining: LiningParameters;
  tunnel: TunnelBasicParameters;
}

// 隧道建模结果
export interface TunnelModelingResult {
  success: boolean;
  modelId?: string;
  geometry?: {
    vertices: Float32Array;
    faces: Uint32Array;
    normals: Float32Array;
  };
  parameters: TunnelParameters;
  statistics?: {
    volume: number;          // 开挖体积 (m³)
    surfaceArea: number;     // 表面积 (m²)
    liningVolume: number;    // 衬砌体积 (m³)
    excavationCost: number;  // 估算开挖成本
  };
  quality?: {
    score: number;           // 质量评分 (0-100)
    issues: string[];        // 质量问题
    recommendations: string[]; // 优化建议
  };
}

// 隧道预设类型
export type TunnelPreset = 'highway' | 'railway' | 'metro' | 'utility';

// 隧道预设配置
export interface TunnelPresetConfig {
  name: string;
  description: string;
  parameters: Partial<TunnelParameters>;
}

// 材料属性
export interface MaterialProperties {
  density: number;         // 密度 (kg/m³)
  elasticModulus: number;  // 弹性模量 (MPa)
  poissonRatio: number;    // 泊松比
  compressiveStrength: number; // 抗压强度 (MPa)
  tensileStrength: number; // 抗拉强度 (MPa)
  thermalExpansion: number; // 热膨胀系数
}

// 隧道建模服务接口
export interface TunnelModelingService {
  generateModel(parameters: TunnelParameters): Promise<TunnelModelingResult>;
  validateParameters(parameters: TunnelParameters): Promise<{ valid: boolean; errors: string[] }>;
  calculateStatistics(parameters: TunnelParameters): Promise<TunnelModelingResult['statistics']>;
  getMaterialProperties(material: LiningMaterial): MaterialProperties;
  getPresetConfig(preset: TunnelPreset): TunnelPresetConfig;
}