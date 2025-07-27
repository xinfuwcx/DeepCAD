/**
 * 地质数据类型定义 - 2号几何专家使用
 * 1号架构师制定的标准接口
 */

export interface BoreholeData {
  id: string;
  name: string;
  position: {
    x: number;
    y: number;
    z: number;
  };
  depth: number;
  layers: SoilLayer[];
  waterLevel?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SoilLayer {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  thickness: number;
  soilType: string;
  properties: {
    density: number;        // 密度 (g/cm³)
    cohesion: number;       // 黏聚力 (kPa)
    friction: number;       // 内摩擦角 (°)
    permeability: number;   // 渗透系数 (cm/s)
    elasticModulus: number; // 弹性模量 (MPa)
    poissonRatio: number;   // 泊松比
  };
  color: string;           // 地层显示颜色
  description?: string;
}

export interface RBFInterpolationConfig {
  functionType: 'multiquadric' | 'inverse_multiquadric' | 'gaussian' | 'linear';
  smoothingFactor: number;    // 光滑系数 (0-1)
  searchRadius: number;       // 搜索半径 (m)
  minPoints: number;          // 最小插值点数
  maxPoints: number;          // 最大插值点数
  gridResolution: {
    x: number;
    y: number;
    z: number;
  };
}

export interface ExcavationGeometry {
  id: string;
  name: string;
  outline: Array<{x: number, y: number}>; // 基坑轮廓点
  stages: ExcavationStage[];
  totalDepth: number;
  slopes: Array<{
    angle: number;     // 边坡角度
    height: number;    // 边坡高度
    direction: string; // 边坡方向
  }>;
}

export interface ExcavationStage {
  id: string;
  name: string;
  sequence: number;
  depth: number;
  duration: number;  // 施工天数
  description?: string;
}

export interface SupportStructure {
  id: string;
  type: 'retaining_wall' | 'anchor' | 'strut' | 'pile';
  name: string;
  position: {
    start: {x: number, y: number, z: number};
    end: {x: number, y: number, z: number};
  };
  properties: {
    material: string;
    diameter?: number;
    length?: number;
    capacity?: number;
  };
  installationStage: number;
}

// 地质建模状态管理
export interface GeologyModelState {
  boreholes: BoreholeData[];
  interpolationConfig: RBFInterpolationConfig;
  excavation: ExcavationGeometry | null;
  supportStructures: SupportStructure[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: string;
}

// 2号几何专家组件Props接口
export interface GeologyComponentProps {
  data?: GeologyModelState;
  onDataChange?: (data: Partial<GeologyModelState>) => void;
  onExport?: (format: 'json' | 'dxf' | 'step') => void;
  readOnly?: boolean;
}