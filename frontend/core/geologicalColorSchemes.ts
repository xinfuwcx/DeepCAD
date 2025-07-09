/**
 * @file 地质模型颜色方案
 * @description 整合GemPy风格的地质模型颜色方案
 */

import { Color } from 'three';

/**
 * 地质体配色方案
 * 基于GemPy和地质学文献的专业配色策略
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

// 地质年代配色方案（国际地层委员会标准）
export const GEOLOGICAL_TIME_COLORS = {
  // 第四纪
  'Quaternary': '#F9F97F',
  'Pleistocene': '#FFF2AE',
  'Holocene': '#FFFF99',
  
  // 新第三纪
  'Neogene': '#FFE619',
  'Pliocene': '#FFFF00',
  'Miocene': '#FFCC00',
  
  // 古第三纪
  'Paleogene': '#FD9A52',
  'Oligocene': '#FE8C00',
  'Eocene': '#FC7E00',
  'Paleocene': '#FA7050',
  
  // 白垩纪
  'Cretaceous': '#7FC64E',
  'Upper_Cretaceous': '#8CCD5C',
  'Lower_Cretaceous': '#70B83A',
  
  // 侏罗纪
  'Jurassic': '#34B2C9',
  'Upper_Jurassic': '#42C2D7',
  'Middle_Jurassic': '#5CBAE5',
  'Lower_Jurassic': '#069ECE',
  
  // 三叠纪
  'Triassic': '#812B92',
  'Upper_Triassic': '#B051C5',
  'Middle_Triassic': '#A584BA',
  'Lower_Triassic': '#983999',
  
  // 二叠纪
  'Permian': '#F04028',
  'Upper_Permian': '#FB5A3A',
  'Lower_Permian': '#EF4739',
  
  // 石炭纪
  'Carboniferous': '#67A3B8',
  'Pennsylvanian': '#8DB8C8',
  'Mississippian': '#5C9BC0',
  
  // 泥盆纪
  'Devonian': '#CB8C37',
  'Upper_Devonian': '#D9A95A',
  'Middle_Devonian': '#E5B273',
  'Lower_Devonian': '#C19A5C',
  
  // 志留纪
  'Silurian': '#B3E1B6',
  'Pridoli': '#C7EBC7',
  'Ludlow': '#BFE5BF',
  
  // 奥陶纪
  'Ordovician': '#009270',
  'Upper_Ordovician': '#26B57A',
  'Middle_Ordovician': '#4DC58A',
  'Lower_Ordovician': '#009F73',
  
  // 寒武纪
  'Cambrian': '#7FA056',
  'Upper_Cambrian': '#8FB26A',
  'Middle_Cambrian': '#A5C47E',
  'Lower_Cambrian': '#8CAE68'
};

// 岩性配色方案
export const LITHOLOGY_COLORS = {
  // 沉积岩
  'sandstone': '#F4E4BC',           // 砂岩 - 浅黄色
  'shale': '#8B7355',               // 页岩 - 深灰棕色
  'limestone': '#A5D6F3',           // 石灰岩 - 浅蓝色
  'mudstone': '#8B7D6B',            // 泥岩 - 灰棕色
  'siltstone': '#D2B48C',           // 粉砂岩 - 棕褐色
  'conglomerate': '#CD853F',        // 砾岩 - 秘鲁色
  'coal': '#2F2F2F',                // 煤 - 深灰色
  'dolomite': '#B0C4DE',            // 白云岩 - 淡钢蓝色
  
  // 火成岩
  'granite': '#FFB6C1',             // 花岗岩 - 浅粉色
  'basalt': '#2F4F4F',              // 玄武岩 - 深石板灰
  'andesite': '#696969',            // 安山岩 - 暗灰色
  'rhyolite': '#DDA0DD',            // 流纹岩 - 梅花色
  'gabbro': '#483D8B',              // 辉长岩 - 深石板蓝
  'diorite': '#A9A9A9',             // 闪长岩 - 深灰色
  'obsidian': '#1C1C1C',            // 黑曜岩 - 近黑色
  
  // 变质岩
  'gneiss': '#BC8F8F',              // 片麻岩 - 玫瑰棕色
  'schist': '#8FBC8F',              // 片岩 - 深海绿色
  'slate': '#2F4F4F',               // 板岩 - 深石板灰
  'marble': '#F5F5DC',              // 大理岩 - 米色
  'quartzite': '#F0F8FF',           // 石英岩 - 爱丽丝蓝
  'amphibolite': '#556B2F',         // 角闪岩 - 深橄榄绿
  
  // 土壤和表土
  'topsoil': '#8B4513',             // 表土 - 马鞍棕色
  'clay': '#CD853F',                // 粘土 - 秘鲁色
  'sand': '#F4A460',                // 砂土 - 沙棕色
  'gravel': '#A0522D',              // 砾石 - 赭石色
  'silt': '#D2B48C',                // 粉土 - 棕褐色
  'peat': '#654321',                // 泥炭 - 深棕色
  
  // 特殊地质体
  'water': '#4169E1',               // 水体 - 皇家蓝
  'ice': '#B0E0E6',                 // 冰 - 粉蓝色
  'air': '#87CEEB',                 // 空气 - 天蓝色
  'fault': '#FF4500',               // 断层 - 橙红色
  'intrusion': '#FF69B4',           // 侵入体 - 热粉色
  'ore': '#FFD700',                 // 矿体 - 金色
  'salt': '#F0FFFF',                // 盐岩 - 蔚蓝色
  'gypsum': '#FFFACD'               // 石膏 - 柠檬绸色
};

// 上海地区典型土层配色（基于工程地质实践）
export const SHANGHAI_SOIL_COLORS = {
  'fill': '#8B4513',                // ①填土 - 马鞍棕色
  'clay_1': '#CD853F',              // ②1粘土 - 秘鲁色
  'clay_2': '#D2691E',              // ②2粘土 - 巧克力色
  'silt_clay': '#DEB887',           // ③淤泥质粘土 - 硬木色
  'clay_3': '#BC8F8F',              // ④粘土 - 玫瑰棕色
  'sandy_clay': '#F4A460',          // ⑤砂质粘土 - 沙棕色
  'sand': '#F5DEB3',                // ⑥砂土 - 小麦色
  'clay_4': '#D2B48C',              // ⑦粘土 - 棕褐色
  'sandy_silt': '#DDD5C7',          // ⑧砂质粉土 - 浅灰色
  'sand_gravel': '#C0C0C0',         // ⑨砂砾 - 银色
  'clay_5': '#A0522D',              // ⑩粘土 - 赭石色
  'weathered_rock': '#696969',      // ⑪风化岩 - 暗灰色
  'bedrock': '#2F4F4F'              // ⑫基岩 - 深石板灰
};

// 地质体透明度配置
export const GEOLOGICAL_OPACITY = {
  'solid': 1.0,                     // 完全不透明
  'translucent': 0.8,               // 半透明
  'transparent': 0.6,               // 透明
  'ghost': 0.3,                     // 幽灵模式
  'wireframe': 0.1                  // 线框模式
};

// 地质体材质属性
export const GEOLOGICAL_MATERIALS = {
  'roughness': 0.8,                 // 粗糙度
  'metalness': 0.1,                 // 金属度
  'clearcoat': 0.0,                 // 清漆
  'clearcoatRoughness': 0.0,        // 清漆粗糙度
  'reflectivity': 0.5,              // 反射率
  'ior': 1.5,                       // 折射率
  'sheen': 0.0,                     // 光泽
  'sheenRoughness': 1.0,            // 光泽粗糙度
  'transmission': 0.0,              // 透射
  'thickness': 0.5                  // 厚度
};

/**
 * 获取地质体颜色
 * @param type 地质体类型
 * @param name 地质体名称
 * @returns Three.js Color对象
 */
export function getGeologicalColor(type: 'time' | 'lithology' | 'shanghai', name: string): Color {
  let colorHex: string;
  
  switch (type) {
    case 'time':
      colorHex = GEOLOGICAL_TIME_COLORS[name] || '#CCCCCC';
      break;
    case 'lithology':
      colorHex = LITHOLOGY_COLORS[name] || '#CCCCCC';
      break;
    case 'shanghai':
      colorHex = SHANGHAI_SOIL_COLORS[name] || '#CCCCCC';
      break;
    default:
      colorHex = '#CCCCCC';
  }
  
  return new Color(colorHex);
}

/**
 * 生成地质体渐变色
 * @param baseColor 基础颜色
 * @param steps 渐变步数
 * @returns 渐变色数组
 */
export function generateGeologicalGradient(baseColor: string, steps: number = 5): Color[] {
  const base = new Color(baseColor);
  const colors: Color[] = [];
  
  for (let i = 0; i < steps; i++) {
    const factor = 0.7 + (i / steps) * 0.6; // 0.7 到 1.3 的范围
    const color = base.clone().multiplyScalar(factor);
    colors.push(color);
  }
  
  return colors;
}

/**
 * 根据深度获取土层颜色
 * @param depth 深度（米）
 * @param soilType 土层类型
 * @returns Three.js Color对象
 */
export function getDepthBasedColor(depth: number, soilType: string): Color {
  const baseColor = getGeologicalColor('shanghai', soilType);
  
  // 根据深度调整颜色明度
  const depthFactor = Math.max(0.3, 1.0 - depth * 0.05); // 深度越大，颜色越暗
  return baseColor.clone().multiplyScalar(depthFactor);
}

/**
 * 创建地质体材质配置
 * @param color 颜色
 * @param opacity 透明度
 * @param materialType 材质类型
 * @returns 材质配置对象
 */
export function createGeologicalMaterial(
  color: Color, 
  opacity: number = 1.0,
  materialType: 'standard' | 'physical' | 'toon' = 'standard'
) {
  const baseConfig = {
    color: color,
    opacity: opacity,
    transparent: opacity < 1.0,
    ...GEOLOGICAL_MATERIALS
  };
  
  switch (materialType) {
    case 'physical':
      return {
        ...baseConfig,
        clearcoat: 0.3,
        clearcoatRoughness: 0.25,
        metalness: 0.0,
        roughness: 0.9
      };
    case 'toon':
      return {
        ...baseConfig,
        gradientMap: null, // 需要在Three.js中设置
        roughness: 1.0,
        metalness: 0.0
      };
    default:
      return baseConfig;
  }
}

/**
 * 地质体可视化预设
 */
export const GEOLOGICAL_PRESETS = {
  'realistic': {
    opacity: GEOLOGICAL_OPACITY.solid,
    materialType: 'physical' as const,
    enableShadows: true,
    enableFog: true
  },
  'scientific': {
    opacity: GEOLOGICAL_OPACITY.translucent,
    materialType: 'standard' as const,
    enableShadows: false,
    enableFog: false
  },
  'artistic': {
    opacity: GEOLOGICAL_OPACITY.translucent,
    materialType: 'toon' as const,
    enableShadows: true,
    enableFog: true
  },
  'analysis': {
    opacity: GEOLOGICAL_OPACITY.transparent,
    materialType: 'standard' as const,
    enableShadows: false,
    enableFog: false
  }
};

// GemPy风格的土层颜色方案
export const GEMPY_COLOR_SCHEMES = {
  // 标准方案
  standard: {
    clay: '#A67F5D',       // 粘土
    sand: '#D2B48C',       // 砂土
    silt: '#8B7355',       // 淤泥
    gravel: '#B8860B',     // 砾石
    rock: '#696969',       // 岩石
    limestone: '#E0E0E0',  // 石灰岩
    sandstone: '#F4A460',  // 砂岩
    shale: '#2F4F4F',      // 页岩
    mudstone: '#5F4F3F',   // 泥岩
    default: '#A9A9A9',    // 默认
  },
  
  // 高对比度方案
  highContrast: {
    clay: '#8B4513',       // 粘土
    sand: '#FFD700',       // 砂土
    silt: '#556B2F',       // 淤泥
    gravel: '#CD853F',     // 砾石
    rock: '#2F4F4F',       // 岩石
    limestone: '#FFFFFF',  // 石灰岩
    sandstone: '#FF8C00',  // 砂岩
    shale: '#000080',      // 页岩
    mudstone: '#4B0082',   // 泥岩
    default: '#808080',    // 默认
  },
  
  // 柔和方案
  pastel: {
    clay: '#D2B48C',       // 粘土
    sand: '#F5DEB3',       // 砂土
    silt: '#CDB79E',       // 淤泥
    gravel: '#DEB887',     // 砾石
    rock: '#A9A9A9',       // 岩石
    limestone: '#F5F5F5',  // 石灰岩
    sandstone: '#FFDAB9',  // 砂岩
    shale: '#708090',      // 页岩
    mudstone: '#BC8F8F',   // 泥岩
    default: '#D3D3D3',    // 默认
  }
};

// 土层透明度设置
export const SOIL_LAYER_OPACITY = {
  default: 0.8,      // 默认透明度
  selected: 1.0,     // 选中状态透明度
  hidden: 0.2,       // 隐藏状态透明度
  crossSection: 0.5, // 剖面状态透明度
};

// 土层材质属性
export interface SoilMaterialProperties {
  name: string;
  color: string;
  density: number;          // kg/m³
  youngModulus: number;     // Pa
  poissonRatio: number;
  cohesion?: number;        // kPa
  frictionAngle?: number;   // degrees
  permeability?: number;    // m/s
}

// 常用土层材料库
export const SOIL_MATERIALS_LIBRARY: Record<string, SoilMaterialProperties> = {
  'clay_soft': {
    name: '软粘土',
    color: GEMPY_COLOR_SCHEMES.standard.clay,
    density: 1700,
    youngModulus: 5000000,
    poissonRatio: 0.4,
    cohesion: 15,
    frictionAngle: 18,
    permeability: 1e-9
  },
  'clay_medium': {
    name: '中硬粘土',
    color: '#9B7653',
    density: 1850,
    youngModulus: 15000000,
    poissonRatio: 0.35,
    cohesion: 30,
    frictionAngle: 22,
    permeability: 5e-10
  },
  'clay_stiff': {
    name: '硬粘土',
    color: '#8B6B4F',
    density: 2000,
    youngModulus: 30000000,
    poissonRatio: 0.3,
    cohesion: 50,
    frictionAngle: 25,
    permeability: 1e-10
  },
  'sand_loose': {
    name: '松砂',
    color: GEMPY_COLOR_SCHEMES.standard.sand,
    density: 1600,
    youngModulus: 10000000,
    poissonRatio: 0.3,
    cohesion: 0,
    frictionAngle: 28,
    permeability: 1e-5
  },
  'sand_medium': {
    name: '中密砂',
    color: '#C2A378',
    density: 1800,
    youngModulus: 25000000,
    poissonRatio: 0.3,
    cohesion: 0,
    frictionAngle: 32,
    permeability: 5e-6
  },
  'sand_dense': {
    name: '密砂',
    color: '#B8997A',
    density: 2000,
    youngModulus: 50000000,
    poissonRatio: 0.25,
    cohesion: 0,
    frictionAngle: 38,
    permeability: 1e-6
  },
  'silt': {
    name: '淤泥',
    color: GEMPY_COLOR_SCHEMES.standard.silt,
    density: 1700,
    youngModulus: 8000000,
    poissonRatio: 0.35,
    cohesion: 5,
    frictionAngle: 25,
    permeability: 1e-8
  },
  'gravel': {
    name: '砾石',
    color: GEMPY_COLOR_SCHEMES.standard.gravel,
    density: 2100,
    youngModulus: 80000000,
    poissonRatio: 0.25,
    cohesion: 0,
    frictionAngle: 40,
    permeability: 1e-4
  },
  'rock_soft': {
    name: '软岩',
    color: '#808080',
    density: 2300,
    youngModulus: 500000000,
    poissonRatio: 0.25,
    cohesion: 100,
    frictionAngle: 35,
    permeability: 1e-9
  },
  'rock_hard': {
    name: '硬岩',
    color: GEMPY_COLOR_SCHEMES.standard.rock,
    density: 2600,
    youngModulus: 5000000000,
    poissonRatio: 0.2,
    cohesion: 500,
    frictionAngle: 45,
    permeability: 1e-10
  },
  'fill': {
    name: '填土',
    color: '#A0522D',
    density: 1800,
    youngModulus: 10000000,
    poissonRatio: 0.3,
    cohesion: 10,
    frictionAngle: 28,
    permeability: 1e-6
  }
};

// Gmsh颜色方案
export const GMSH_COLOR_SCHEMES = {
  // 网格颜色
  mesh: {
    nodes: '#00BFFF',       // 节点颜色
    edges: '#4169E1',       // 边线颜色
    faces: '#87CEEB',       // 面颜色
    volumes: '#B0E0E6',     // 体颜色
  },
  
  // 网格质量颜色映射
  quality: {
    excellent: '#00FF00',   // 优秀
    good: '#ADFF2F',        // 良好
    fair: '#FFFF00',        // 一般
    poor: '#FFA500',        // 较差
    bad: '#FF0000',         // 很差
  }
};

// 获取土层颜色
export function getSoilColor(soilType: string, scheme: keyof typeof GEMPY_COLOR_SCHEMES = 'standard'): string {
  const colorScheme = GEMPY_COLOR_SCHEMES[scheme] as Record<string, string>;
  return colorScheme[soilType] || colorScheme.default;
}

// 获取土层材料属性
export function getSoilMaterial(soilType: string): SoilMaterialProperties {
  return SOIL_MATERIALS_LIBRARY[soilType] || {
    name: '未知土层',
    color: GEMPY_COLOR_SCHEMES.standard.default,
    density: 1800,
    youngModulus: 20000000,
    poissonRatio: 0.3
  };
}

// 根据深度生成渐变颜色
export function generateDepthBasedColors(
  minDepth: number,
  maxDepth: number,
  numColors: number,
  baseColor: string = '#A67F5D'
): string[] {
  const colors: string[] = [];
  const baseRgb = hexToRgb(baseColor);
  
  if (!baseRgb) return Array(numColors).fill(baseColor);
  
  for (let i = 0; i < numColors; i++) {
    const factor = i / (numColors - 1);
    const r = Math.floor(baseRgb.r - factor * 40);
    const g = Math.floor(baseRgb.g - factor * 40);
    const b = Math.floor(baseRgb.b - factor * 20);
    
    colors.push(rgbToHex(
      Math.max(0, Math.min(255, r)),
      Math.max(0, Math.min(255, g)),
      Math.max(0, Math.min(255, b))
    ));
  }
  
  return colors;
}

// 辅助函数：十六进制颜色转RGB
function hexToRgb(hex: string): { r: number, g: number, b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

// 辅助函数：RGB转十六进制颜色
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

export default {
  GEMPY_COLOR_SCHEMES,
  SOIL_LAYER_OPACITY,
  SOIL_MATERIALS_LIBRARY,
  GMSH_COLOR_SCHEMES,
  getSoilColor,
  getSoilMaterial,
  generateDepthBasedColors
}; 