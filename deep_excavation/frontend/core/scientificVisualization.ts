/**
 * 科学可视化网格渲染和后处理系统
 * 基于Trame和ParaView的设计理念和配色标准
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import { Color, Vector3, BufferGeometry, BufferAttribute } from 'three';

// ==================== ParaView色彩映射系统 ====================

// ParaView内置色彩映射表
export const PARAVIEW_COLOR_MAPS = {
  // 经典色彩映射
  'Cool to Warm': {
    colors: [
      '#3C4EC2', '#6788EA', '#9ABBFF', '#C9D7F0', 
      '#EDD1C2', '#F7A889', '#E36852', '#B40426'
    ],
    description: '冷暖色调，适用于标量场可视化',
    range: [0, 1],
    discrete: false
  },
  
  'Viridis': {
    colors: [
      '#440154', '#482777', '#3F4A8A', '#31678E',
      '#26838F', '#1F9D8A', '#6CCE5A', '#B6DE2B', '#FEE825'
    ],
    description: '感知均匀色彩映射，适用于科学数据',
    range: [0, 1],
    discrete: false
  },
  
  'Plasma': {
    colors: [
      '#0C0786', '#40039A', '#6A00A7', '#8F0DA3',
      '#B02A8F', '#CA4678', '#E06461', '#F1824C', '#FCA635', '#FCCE25'
    ],
    description: '等离子体配色，高对比度',
    range: [0, 1],
    discrete: false
  },
  
  'Inferno': {
    colors: [
      '#000003', '#1B0C41', '#4B0C6B', '#781C6D',
      '#A52C60', '#CF4446', '#ED6925', '#FB9906', '#FCCC25', '#F0F921'
    ],
    description: '火焰配色，适用于热力学数据',
    range: [0, 1],
    discrete: false
  },

  // 工程专用色彩映射
  'Rainbow': {
    colors: [
      '#0000FF', '#0080FF', '#00FFFF', '#00FF80',
      '#00FF00', '#80FF00', '#FFFF00', '#FF8000', '#FF0000'
    ],
    description: '彩虹色彩，传统工程可视化',
    range: [0, 1],
    discrete: false
  },
  
  'Blue to Red': {
    colors: [
      '#0000FF', '#4080FF', '#80C0FF', '#C0E0FF',
      '#FFFFFF', '#FFC0C0', '#FF8080', '#FF4040', '#FF0000'
    ],
    description: '蓝红渐变，适用于应力应变',
    range: [0, 1],
    discrete: false
  },

  // 地质专用色彩映射
  'Geological': {
    colors: [
      '#8B4513', '#CD853F', '#DEB887', '#F4A460',
      '#D2B48C', '#BC8F8F', '#A0522D', '#696969'
    ],
    description: '地质体配色，土层可视化',
    range: [0, 1],
    discrete: true
  },
  
  'Depth': {
    colors: [
      '#F5DEB3', '#DEB887', '#CD853F', '#A0522D',
      '#8B4513', '#654321', '#2F1B14', '#000000'
    ],
    description: '深度配色，由浅到深',
    range: [0, 1],
    discrete: false
  },

  // 流体动力学色彩映射
  'Velocity': {
    colors: [
      '#000080', '#0000FF', '#0080FF', '#00FFFF',
      '#80FF80', '#FFFF00', '#FF8000', '#FF0000', '#800000'
    ],
    description: '速度场配色',
    range: [0, 1],
    discrete: false
  },
  
  'Pressure': {
    colors: [
      '#000040', '#000080', '#0040C0', '#0080FF',
      '#40C0FF', '#80FFFF', '#C0FFFF', '#FFFFFF'
    ],
    description: '压力场配色',
    range: [0, 1],
    discrete: false
  }
};

// ==================== 网格可视化配置 ====================

// 网格渲染模式
export type MeshRenderMode = 
  | 'surface'           // 表面渲染
  | 'wireframe'         // 线框模式
  | 'surface_with_edges' // 表面+边线
  | 'points'            // 点云模式
  | 'volume'            // 体渲染
  | 'isosurface'        // 等值面
  | 'streamlines'       // 流线
  | 'vector_field'      // 矢量场
  | 'contour_lines';    // 等高线

// 网格质量指标
export interface MeshQualityMetrics {
  elementCount: number;           // 单元数量
  nodeCount: number;              // 节点数量
  minElementQuality: number;      // 最小单元质量
  maxElementQuality: number;      // 最大单元质量
  avgElementQuality: number;      // 平均单元质量
  aspectRatio: {
    min: number;
    max: number;
    avg: number;
  };
  skewness: {
    min: number;
    max: number;
    avg: number;
  };
  jacobian: {
    min: number;
    max: number;
    avg: number;
  };
}

// 标量场数据
export interface ScalarField {
  name: string;
  description: string;
  unit: string;
  values: Float32Array;
  range: [number, number];
  colorMap: string;
  renderMode: MeshRenderMode;
  isolevels?: number[];           // 等值线/面数值
  opacity: number;
  visible: boolean;
}

// 矢量场数据
export interface VectorField {
  name: string;
  description: string;
  unit: string;
  values: Float32Array;           // [x1,y1,z1, x2,y2,z2, ...]
  magnitude: Float32Array;        // 矢量模长
  range: [number, number];
  colorMap: string;
  renderMode: 'arrows' | 'streamlines' | 'glyphs';
  scale: number;
  density: number;                // 显示密度
  opacity: number;
  visible: boolean;
}

// ==================== 后处理数据结构 ====================

// 分析结果数据
export interface AnalysisResults {
  id: string;
  name: string;
  description: string;
  analysisType: 'static' | 'dynamic' | 'thermal' | 'fluid' | 'coupled';
  
  // 网格信息
  mesh: {
    geometry: BufferGeometry;
    quality: MeshQualityMetrics;
    elementTypes: string[];        // 单元类型
    materialIds: Int32Array;       // 材料ID
  };
  
  // 时间步信息
  timeSteps: {
    count: number;
    values: number[];              // 时间值
    units: string;
    current: number;               // 当前时间步
  };
  
  // 标量场数据
  scalarFields: Map<string, ScalarField>;
  
  // 矢量场数据
  vectorFields: Map<string, VectorField>;
  
  // 后处理设置
  postProcessing: {
    colorMaps: string[];
    renderModes: MeshRenderMode[];
    currentColorMap: string;
    currentRenderMode: MeshRenderMode;
    backgroundGradient: boolean;
    showMeshEdges: boolean;
    showCoordinateAxes: boolean;
    lighting: 'headlight' | 'three_point' | 'ambient';
  };
  
  // 动画设置
  animation: {
    enabled: boolean;
    speed: number;                 // 播放速度
    loop: boolean;
    pingPong: boolean;            // 往返播放
    currentFrame: number;
  };
}

// ==================== 色彩映射工具函数 ====================

/**
 * 获取色彩映射颜色
 * @param colorMapName 色彩映射名称
 * @param value 标量值 [0, 1]
 * @returns Three.js Color对象
 */
export function getColorFromMap(colorMapName: string, value: number): Color {
  const colorMap = PARAVIEW_COLOR_MAPS[colorMapName];
  if (!colorMap) {
    console.warn(`未找到色彩映射: ${colorMapName}`);
    return new Color('#808080');
  }
  
  // 确保值在[0,1]范围内
  const normalizedValue = Math.max(0, Math.min(1, value));
  
  if (colorMap.discrete) {
    // 离散色彩映射
    const index = Math.floor(normalizedValue * (colorMap.colors.length - 1));
    return new Color(colorMap.colors[index]);
  } else {
    // 连续色彩映射
    const scaledValue = normalizedValue * (colorMap.colors.length - 1);
    const index = Math.floor(scaledValue);
    const fraction = scaledValue - index;
    
    if (index >= colorMap.colors.length - 1) {
      return new Color(colorMap.colors[colorMap.colors.length - 1]);
    }
    
    const color1 = new Color(colorMap.colors[index]);
    const color2 = new Color(colorMap.colors[index + 1]);
    
    return color1.lerp(color2, fraction);
  }
}

/**
 * 生成色彩映射纹理
 * @param colorMapName 色彩映射名称
 * @param resolution 纹理分辨率
 * @returns 纹理数据 (RGBA)
 */
export function generateColorMapTexture(colorMapName: string, resolution: number = 256): Uint8Array {
  const texture = new Uint8Array(resolution * 4);
  
  for (let i = 0; i < resolution; i++) {
    const value = i / (resolution - 1);
    const color = getColorFromMap(colorMapName, value);
    
    const offset = i * 4;
    texture[offset] = Math.round(color.r * 255);     // R
    texture[offset + 1] = Math.round(color.g * 255); // G
    texture[offset + 2] = Math.round(color.b * 255); // B
    texture[offset + 3] = 255;                       // A
  }
  
  return texture;
}

/**
 * 应用标量场色彩映射到网格
 * @param geometry 网格几何体
 * @param scalarField 标量场数据
 * @returns 更新后的几何体（包含颜色属性）
 */
export function applyScalarFieldColoring(
  geometry: BufferGeometry, 
  scalarField: ScalarField
): BufferGeometry {
  const positions = geometry.getAttribute('position');
  const vertexCount = positions.count;
  
  // 创建颜色属性
  const colors = new Float32Array(vertexCount * 3);
  
  // 标量值范围
  const [minValue, maxValue] = scalarField.range;
  const valueRange = maxValue - minValue;
  
  for (let i = 0; i < vertexCount; i++) {
    // 获取标量值并归一化
    const scalarValue = scalarField.values[i];
    const normalizedValue = valueRange > 0 ? (scalarValue - minValue) / valueRange : 0;
    
    // 获取映射颜色
    const color = getColorFromMap(scalarField.colorMap, normalizedValue);
    
    // 设置颜色属性
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }
  
  geometry.setAttribute('color', new BufferAttribute(colors, 3));
  
  return geometry;
}

// ==================== 等值线/等值面生成 ====================

/**
 * 生成等值线
 * @param scalarField 标量场数据
 * @param isoValue 等值线数值
 * @param geometry 网格几何体
 * @returns 等值线几何体
 */
export function generateContourLines(
  scalarField: ScalarField,
  isoValue: number,
  geometry: BufferGeometry
): BufferGeometry {
  // 简化的等值线生成算法
  // 实际应用中应使用Marching Squares或类似算法
  
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  
  const contourPoints: number[] = [];
  
  if (indices) {
    // 遍历所有三角形
    for (let i = 0; i < indices.count; i += 3) {
      const i1 = indices.getX(i);
      const i2 = indices.getX(i + 1);
      const i3 = indices.getX(i + 2);
      
      const v1 = scalarField.values[i1];
      const v2 = scalarField.values[i2];
      const v3 = scalarField.values[i3];
      
      // 检查等值线是否穿过此三角形
      const crossings: Vector3[] = [];
      
      // 检查边1-2
      if ((v1 <= isoValue && v2 >= isoValue) || (v1 >= isoValue && v2 <= isoValue)) {
        const t = (isoValue - v1) / (v2 - v1);
        const p1 = new Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
        const p2 = new Vector3(positions.getX(i2), positions.getY(i2), positions.getZ(i2));
        crossings.push(p1.lerp(p2, t));
      }
      
      // 检查边2-3
      if ((v2 <= isoValue && v3 >= isoValue) || (v2 >= isoValue && v3 <= isoValue)) {
        const t = (isoValue - v2) / (v3 - v2);
        const p2 = new Vector3(positions.getX(i2), positions.getY(i2), positions.getZ(i2));
        const p3 = new Vector3(positions.getX(i3), positions.getY(i3), positions.getZ(i3));
        crossings.push(p2.lerp(p3, t));
      }
      
      // 检查边3-1
      if ((v3 <= isoValue && v1 >= isoValue) || (v3 >= isoValue && v1 <= isoValue)) {
        const t = (isoValue - v3) / (v1 - v3);
        const p3 = new Vector3(positions.getX(i3), positions.getY(i3), positions.getZ(i3));
        const p1 = new Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
        crossings.push(p3.lerp(p1, t));
      }
      
      // 如果有两个交点，创建线段
      if (crossings.length === 2) {
        contourPoints.push(
          crossings[0].x, crossings[0].y, crossings[0].z,
          crossings[1].x, crossings[1].y, crossings[1].z
        );
      }
    }
  }
  
  const contourGeometry = new BufferGeometry();
  contourGeometry.setAttribute('position', new BufferAttribute(new Float32Array(contourPoints), 3));
  
  return contourGeometry;
}

// ==================== 流线生成 ====================

/**
 * 生成流线
 * @param vectorField 矢量场数据
 * @param seedPoints 种子点
 * @param stepSize 积分步长
 * @param maxSteps 最大步数
 * @returns 流线几何体
 */
export function generateStreamlines(
  vectorField: VectorField,
  seedPoints: Vector3[],
  stepSize: number = 0.1,
  maxSteps: number = 100
): BufferGeometry {
  const streamlinePoints: number[] = [];
  
  seedPoints.forEach(seedPoint => {
    const points = [seedPoint.clone()];
    let currentPoint = seedPoint.clone();
    
    for (let step = 0; step < maxSteps; step++) {
      // 在当前点插值矢量场
      const velocity = interpolateVectorField(vectorField, currentPoint);
      
      if (velocity.length() < 1e-6) break; // 速度太小，停止
      
      // 使用Runge-Kutta方法积分
      const k1 = velocity.clone().multiplyScalar(stepSize);
      const k2 = interpolateVectorField(vectorField, currentPoint.clone().add(k1.clone().multiplyScalar(0.5)))
        .multiplyScalar(stepSize);
      const k3 = interpolateVectorField(vectorField, currentPoint.clone().add(k2.clone().multiplyScalar(0.5)))
        .multiplyScalar(stepSize);
      const k4 = interpolateVectorField(vectorField, currentPoint.clone().add(k3))
        .multiplyScalar(stepSize);
      
      const deltaP = k1.add(k2.multiplyScalar(2)).add(k3.multiplyScalar(2)).add(k4).multiplyScalar(1/6);
      currentPoint.add(deltaP);
      
      points.push(currentPoint.clone());
    }
    
    // 将点添加到流线几何体
    for (let i = 0; i < points.length - 1; i++) {
      streamlinePoints.push(
        points[i].x, points[i].y, points[i].z,
        points[i + 1].x, points[i + 1].y, points[i + 1].z
      );
    }
  });
  
  const streamlineGeometry = new BufferGeometry();
  streamlineGeometry.setAttribute('position', new BufferAttribute(new Float32Array(streamlinePoints), 3));
  
  return streamlineGeometry;
}

/**
 * 在矢量场中插值
 * @param vectorField 矢量场数据
 * @param point 插值点
 * @returns 插值后的矢量
 */
function interpolateVectorField(vectorField: VectorField, point: Vector3): Vector3 {
  // 简化的最近邻插值
  // 实际应用中应使用三线性插值或更高阶插值
  
  // 这里需要根据实际的网格结构实现插值
  // 暂时返回零矢量
  return new Vector3(0, 0, 0);
}

// ==================== 网格质量分析 ====================

/**
 * 计算网格质量指标
 * @param geometry 网格几何体
 * @returns 网格质量指标
 */
export function calculateMeshQuality(geometry: BufferGeometry): MeshQualityMetrics {
  const positions = geometry.getAttribute('position');
  const indices = geometry.getIndex();
  
  if (!indices) {
    throw new Error('网格必须包含索引信息');
  }
  
  const elementCount = indices.count / 3; // 假设为三角形网格
  const nodeCount = positions.count;
  
  const qualities: number[] = [];
  const aspectRatios: number[] = [];
  const skewnesses: number[] = [];
  const jacobians: number[] = [];
  
  // 遍历所有三角形单元
  for (let i = 0; i < indices.count; i += 3) {
    const i1 = indices.getX(i);
    const i2 = indices.getX(i + 1);
    const i3 = indices.getX(i + 2);
    
    const p1 = new Vector3(positions.getX(i1), positions.getY(i1), positions.getZ(i1));
    const p2 = new Vector3(positions.getX(i2), positions.getY(i2), positions.getZ(i2));
    const p3 = new Vector3(positions.getX(i3), positions.getY(i3), positions.getZ(i3));
    
    // 计算边长
    const a = p1.distanceTo(p2);
    const b = p2.distanceTo(p3);
    const c = p3.distanceTo(p1);
    
    // 计算面积
    const s = (a + b + c) / 2;
    const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
    
    // 计算质量指标
    const quality = (4 * Math.sqrt(3) * area) / (a * a + b * b + c * c);
    qualities.push(quality);
    
    // 计算长宽比
    const maxEdge = Math.max(a, b, c);
    const minEdge = Math.min(a, b, c);
    const aspectRatio = maxEdge / minEdge;
    aspectRatios.push(aspectRatio);
    
    // 计算偏斜度（简化）
    const skewness = 1 - quality;
    skewnesses.push(skewness);
    
    // 计算雅可比行列式（对于2D三角形，等于面积的2倍）
    const jacobian = 2 * area;
    jacobians.push(jacobian);
  }
  
  return {
    elementCount,
    nodeCount,
    minElementQuality: Math.min(...qualities),
    maxElementQuality: Math.max(...qualities),
    avgElementQuality: qualities.reduce((sum, q) => sum + q, 0) / qualities.length,
    aspectRatio: {
      min: Math.min(...aspectRatios),
      max: Math.max(...aspectRatios),
      avg: aspectRatios.reduce((sum, ar) => sum + ar, 0) / aspectRatios.length
    },
    skewness: {
      min: Math.min(...skewnesses),
      max: Math.max(...skewnesses),
      avg: skewnesses.reduce((sum, s) => sum + s, 0) / skewnesses.length
    },
    jacobian: {
      min: Math.min(...jacobians),
      max: Math.max(...jacobians),
      avg: jacobians.reduce((sum, j) => sum + j, 0) / jacobians.length
    }
  };
}

// ==================== 导出接口 ====================

/**
 * 创建分析结果对象
 * @param name 结果名称
 * @param geometry 网格几何体
 * @param analysisType 分析类型
 * @returns 分析结果对象
 */
export function createAnalysisResults(
  name: string,
  geometry: BufferGeometry,
  analysisType: AnalysisResults['analysisType'] = 'static'
): AnalysisResults {
  const quality = calculateMeshQuality(geometry);
  
  return {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    name,
    description: `${analysisType}分析结果`,
    analysisType,
    mesh: {
      geometry,
      quality,
      elementTypes: ['Triangle'],
      materialIds: new Int32Array(quality.elementCount).fill(1)
    },
    timeSteps: {
      count: 1,
      values: [0],
      units: 's',
      current: 0
    },
    scalarFields: new Map(),
    vectorFields: new Map(),
    postProcessing: {
      colorMaps: Object.keys(PARAVIEW_COLOR_MAPS),
      renderModes: ['surface', 'wireframe', 'surface_with_edges'],
      currentColorMap: 'Cool to Warm',
      currentRenderMode: 'surface',
      backgroundGradient: true,
      showMeshEdges: false,
      showCoordinateAxes: true,
      lighting: 'three_point'
    },
    animation: {
      enabled: false,
      speed: 1.0,
      loop: true,
      pingPong: false,
      currentFrame: 0
    }
  };
}

/**
 * 获取所有可用的色彩映射
 */
export function getAvailableColorMaps(): string[] {
  return Object.keys(PARAVIEW_COLOR_MAPS);
}

/**
 * 获取色彩映射信息
 */
export function getColorMapInfo(name: string) {
  return PARAVIEW_COLOR_MAPS[name];
} 