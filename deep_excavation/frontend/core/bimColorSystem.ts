/**
 * BIM级科学配色体系
 * 基于Revit、Bentley MicroStation等主流BIM软件的配色标准
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import { Color } from 'three';

// ==================== 土体材质配色系统 ====================

// 基于Revit Materials的土体配色（RGB值）
export const SOIL_MATERIALS = {
  // 填土类 (Fill Materials)
  'fill_soil': {
    color: '#8B4513',           // 马鞍棕色
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.85,
    category: '填土',
    description: '人工填土、杂填土'
  },
  'engineered_fill': {
    color: '#A0522D',           // 赭石色
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.85,
    category: '填土',
    description: '工程回填土'
  },

  // 粘性土类 (Clay Materials)
  'clay_soft': {
    color: '#CD853F',           // 秘鲁色 - 软粘土
    roughness: 0.95,
    metalness: 0.0,
    opacity: 0.8,
    category: '粘性土',
    description: '软塑粘土'
  },
  'clay_medium': {
    color: '#D2691E',           // 巧克力色 - 中等粘土
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.8,
    category: '粘性土',
    description: '可塑粘土'
  },
  'clay_hard': {
    color: '#A0522D',           // 赭石色 - 硬粘土
    roughness: 0.85,
    metalness: 0.0,
    opacity: 0.8,
    category: '粘性土',
    description: '硬塑粘土'
  },
  'clay_silty': {
    color: '#DEB887',           // 硬木色 - 淤泥质粘土
    roughness: 0.95,
    metalness: 0.0,
    opacity: 0.75,
    category: '粘性土',
    description: '淤泥质粘土'
  },

  // 砂性土类 (Sandy Materials)
  'sand_fine': {
    color: '#F4A460',           // 沙棕色 - 细砂
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.8,
    category: '砂性土',
    description: '细砂'
  },
  'sand_medium': {
    color: '#DDD5C7',           // 浅灰色 - 中砂
    roughness: 0.75,
    metalness: 0.0,
    opacity: 0.8,
    category: '砂性土',
    description: '中砂'
  },
  'sand_coarse': {
    color: '#C0C0C0',           // 银色 - 粗砂
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.8,
    category: '砂性土',
    description: '粗砂'
  },
  'gravel_sand': {
    color: '#A9A9A9',           // 深灰色 - 砂砾
    roughness: 0.65,
    metalness: 0.0,
    opacity: 0.8,
    category: '砂性土',
    description: '砂砾'
  },

  // 岩石类 (Rock Materials)
  'weathered_rock': {
    color: '#696969',           // 暗灰色 - 风化岩
    roughness: 0.6,
    metalness: 0.1,
    opacity: 0.9,
    category: '岩石',
    description: '强风化岩'
  },
  'moderately_weathered': {
    color: '#2F4F4F',           // 深石板灰 - 中等风化岩
    roughness: 0.5,
    metalness: 0.15,
    opacity: 0.95,
    category: '岩石',
    description: '中等风化岩'
  },
  'fresh_rock': {
    color: '#1C1C1C',           // 近黑色 - 新鲜岩石
    roughness: 0.4,
    metalness: 0.2,
    opacity: 1.0,
    category: '岩石',
    description: '微风化岩'
  }
};

// ==================== 结构构件配色系统 ====================

// 基于Revit Structure的结构构件配色
export const STRUCTURAL_MATERIALS = {
  // 混凝土构件 (Concrete Elements)
  'concrete_c30': {
    color: '#C0C0C0',           // 银色 - C30混凝土
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.9,
    category: '混凝土',
    description: 'C30混凝土',
    strength: 30
  },
  'concrete_c35': {
    color: '#A9A9A9',           // 深灰色 - C35混凝土
    roughness: 0.75,
    metalness: 0.0,
    opacity: 0.9,
    category: '混凝土',
    description: 'C35混凝土',
    strength: 35
  },
  'concrete_c40': {
    color: '#808080',           // 灰色 - C40混凝土
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.9,
    category: '混凝土',
    description: 'C40混凝土',
    strength: 40
  },

  // 地下连续墙 (Diaphragm Wall)
  'diaphragm_wall': {
    color: '#708090',           // 石板灰 - 地连墙
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.9,
    category: '围护结构',
    description: '地下连续墙',
    thickness: 0.8
  },

  // 排桩 (Bored Piles)
  'bored_pile': {
    color: '#4682B4',           // 钢蓝色 - 钻孔灌注桩
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.9,
    category: '桩基础',
    description: '钻孔灌注桩',
    diameter: 0.8
  },
  'cast_in_place_pile': {
    color: '#5F9EA0',           // 军校蓝 - 现浇桩
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.9,
    category: '桩基础',
    description: '现浇桩',
    diameter: 1.0
  },

  // 钢构件 (Steel Elements)
  'steel_q235': {
    color: '#2F4F4F',           // 深石板灰 - Q235钢
    roughness: 0.3,
    metalness: 0.8,
    opacity: 1.0,
    category: '钢结构',
    description: 'Q235钢材',
    strength: 235
  },
  'steel_q345': {
    color: '#1C1C1C',           // 近黑色 - Q345钢
    roughness: 0.25,
    metalness: 0.85,
    opacity: 1.0,
    category: '钢结构',
    description: 'Q345钢材',
    strength: 345
  },

  // 预应力锚杆/锚索 (Prestressed Anchors)
  'anchor_bolt': {
    color: '#FFD700',           // 金色 - 预应力锚杆
    roughness: 0.2,
    metalness: 0.9,
    opacity: 1.0,
    category: '支护结构',
    description: '预应力锚杆',
    prestress: 500
  },
  'anchor_cable': {
    color: '#FFA500',           // 橙色 - 预应力锚索
    roughness: 0.15,
    metalness: 0.95,
    opacity: 1.0,
    category: '支护结构',
    description: '预应力锚索',
    prestress: 1000
  },

  // 支撑系统 (Bracing System)
  'steel_strut': {
    color: '#FF6347',           // 番茄色 - 钢支撑
    roughness: 0.3,
    metalness: 0.8,
    opacity: 1.0,
    category: '支撑系统',
    description: '钢支撑',
    force: 5000
  },
  'concrete_strut': {
    color: '#CD5C5C',           // 印度红 - 混凝土支撑
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.9,
    category: '支撑系统',
    description: '混凝土支撑',
    force: 8000
  }
};

// ==================== 隧道工程配色系统 ====================

// 基于隧道工程BIM标准的配色
export const TUNNEL_MATERIALS = {
  // 隧道衬砌 (Tunnel Lining)
  'primary_lining': {
    color: '#B0C4DE',           // 淡钢蓝色 - 初期支护
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.85,
    category: '隧道衬砌',
    description: '初期支护/喷射混凝土',
    thickness: 0.3
  },
  'secondary_lining': {
    color: '#87CEEB',           // 天蓝色 - 二次衬砌
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.9,
    category: '隧道衬砌',
    description: '二次衬砌/现浇混凝土',
    thickness: 0.4
  },
  'tunnel_segments': {
    color: '#4169E1',           // 皇家蓝 - 管片
    roughness: 0.6,
    metalness: 0.0,
    opacity: 0.9,
    category: '隧道衬砌',
    description: '预制管片',
    thickness: 0.35
  },

  // 隧道防水 (Waterproofing)
  'waterproof_membrane': {
    color: '#000080',           // 海军蓝 - 防水膜
    roughness: 0.1,
    metalness: 0.0,
    opacity: 0.7,
    category: '防水系统',
    description: '防水膜',
    thickness: 0.002
  },

  // TBM设备 (TBM Equipment)
  'tbm_shield': {
    color: '#FF4500',           // 橙红色 - 盾构机
    roughness: 0.3,
    metalness: 0.7,
    opacity: 1.0,
    category: 'TBM设备',
    description: '盾构机护盾',
    diameter: 6.2
  },
  'tbm_cutterhead': {
    color: '#DC143C',           // 深红色 - 刀盘
    roughness: 0.25,
    metalness: 0.8,
    opacity: 1.0,
    category: 'TBM设备',
    description: '刀盘',
    diameter: 6.0
  }
};

// ==================== 水工构件配色系统 ====================

export const HYDRAULIC_MATERIALS = {
  // 降水井 (Dewatering Wells)
  'dewatering_well': {
    color: '#00CED1',           // 深绿松石色 - 降水井
    roughness: 0.4,
    metalness: 0.3,
    opacity: 0.8,
    category: '降水系统',
    description: '降水井',
    depth: 20
  },
  'observation_well': {
    color: '#48D1CC',           // 中绿松石色 - 观测井
    roughness: 0.4,
    metalness: 0.3,
    opacity: 0.8,
    category: '监测系统',
    description: '水位观测井',
    depth: 15
  },

  // 排水系统 (Drainage System)
  'drainage_pipe': {
    color: '#20B2AA',           // 浅海绿色 - 排水管
    roughness: 0.3,
    metalness: 0.1,
    opacity: 0.9,
    category: '排水系统',
    description: '排水管道',
    diameter: 0.3
  },
  'sump_pump': {
    color: '#008B8B',           // 深青色 - 集水坑
    roughness: 0.5,
    metalness: 0.2,
    opacity: 0.9,
    category: '排水系统',
    description: '集水坑',
    capacity: 10
  }
};

// ==================== 基坑工程配色系统 ====================

// 基坑构件配色（基于深基坑工程实践）
export const EXCAVATION_MATERIALS = {
  // 基坑本体 (Excavation Geometry)
  'excavation_zone': {
    color: '#8B4513',               // 马鞍棕色 - 开挖区域
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.3,                   // 半透明显示
    category: '基坑几何',
    description: '基坑开挖区域'
  },
  'excavation_slope': {
    color: '#CD853F',               // 秘鲁色 - 放坡区域
    roughness: 0.85,
    metalness: 0.0,
    opacity: 0.4,
    category: '基坑几何',
    description: '基坑边坡'
  },
  'excavation_bottom': {
    color: '#A0522D',               // 赭石色 - 基坑底面
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.8,
    category: '基坑几何',
    description: '基坑底面'
  },

  // 开挖阶段配色 (Excavation Phases)
  'phase_1_excavation': {
    color: '#FFE4B5',               // 鹿皮色 - 第一阶段
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.6,
    category: '开挖阶段',
    description: '第一阶段开挖'
  },
  'phase_2_excavation': {
    color: '#DEB887',               // 硬木色 - 第二阶段
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.6,
    category: '开挖阶段',
    description: '第二阶段开挖'
  },
  'phase_3_excavation': {
    color: '#D2B48C',               // 棕褐色 - 第三阶段
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.6,
    category: '开挖阶段',
    description: '第三阶段开挖'
  },
  'phase_4_excavation': {
    color: '#BC8F8F',               // 玫瑰棕色 - 第四阶段
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.6,
    category: '开挖阶段',
    description: '第四阶段开挖'
  },
  'final_excavation': {
    color: '#8B4513',               // 马鞍棕色 - 最终开挖
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.7,
    category: '开挖阶段',
    description: '最终开挖面'
  },

  // 基坑边界标识 (Excavation Boundaries)
  'excavation_boundary': {
    color: '#FF4500',               // 橙红色 - 基坑边界线
    roughness: 0.2,
    metalness: 0.0,
    opacity: 1.0,
    category: '边界标识',
    description: '基坑边界线'
  },
  'safety_boundary': {
    color: '#FF0000',               // 红色 - 安全边界
    roughness: 0.2,
    metalness: 0.0,
    opacity: 1.0,
    category: '边界标识',
    description: '安全警戒线'
  },
  'construction_boundary': {
    color: '#FFA500',               // 橙色 - 施工边界
    roughness: 0.2,
    metalness: 0.0,
    opacity: 1.0,
    category: '边界标识',
    description: '施工作业线'
  },

  // 土方工程 (Earthwork)
  'cut_soil': {
    color: '#D2691E',               // 巧克力色 - 开挖土方
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.5,
    category: '土方工程',
    description: '开挖土方'
  },
  'fill_soil': {
    color: '#8B4513',               // 马鞍棕色 - 回填土方
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.7,
    category: '土方工程',
    description: '回填土方'
  },
  'stockpile_soil': {
    color: '#A0522D',               // 赭石色 - 堆土区
    roughness: 0.95,
    metalness: 0.0,
    opacity: 0.8,
    category: '土方工程',
    description: '临时堆土'
  },

  // 工程车辆和设备 (Construction Equipment)
  'excavator': {
    color: '#FFD700',               // 金色 - 挖掘机
    roughness: 0.3,
    metalness: 0.7,
    opacity: 1.0,
    category: '施工设备',
    description: '挖掘机'
  },
  'dump_truck': {
    color: '#FF8C00',               // 暗橙色 - 自卸车
    roughness: 0.4,
    metalness: 0.6,
    opacity: 1.0,
    category: '施工设备',
    description: '自卸车'
  },
  'crane': {
    color: '#4169E1',               // 皇家蓝 - 起重机
    roughness: 0.3,
    metalness: 0.8,
    opacity: 1.0,
    category: '施工设备',
    description: '起重机'
  }
};

// ==================== 监测设备配色系统 ====================

export const MONITORING_MATERIALS = {
  // 位移监测 (Displacement Monitoring)
  'inclinometer': {
    color: '#FF69B4',           // 热粉色 - 测斜仪
    roughness: 0.2,
    metalness: 0.8,
    opacity: 1.0,
    category: '位移监测',
    description: '测斜仪',
    depth: 30
  },
  'settlement_point': {
    color: '#FF1493',           // 深粉色 - 沉降点
    roughness: 0.2,
    metalness: 0.8,
    opacity: 1.0,
    category: '位移监测',
    description: '沉降观测点',
    precision: 0.1
  },

  // 应力监测 (Stress Monitoring)
  'stress_meter': {
    color: '#9932CC',           // 深兰花紫 - 应力计
    roughness: 0.2,
    metalness: 0.7,
    opacity: 1.0,
    category: '应力监测',
    description: '土压力计',
    range: 2000
  },
  'strain_gauge': {
    color: '#8A2BE2',           // 蓝紫色 - 应变计
    roughness: 0.15,
    metalness: 0.8,
    opacity: 1.0,
    category: '应力监测',
    description: '应变计',
    precision: 1
  }
};

// ==================== 可视化预设配置 ====================

// 基于Revit View Templates的可视化预设
export const BIM_VISUALIZATION_PRESETS = {
  'construction_documentation': {
    name: '施工图纸',
    description: '基于Revit施工图纸模板',
    settings: {
      shadows: false,
      fog: false,
      wireframe: false,
      transparency: false,
      lighting: 'flat',
      background: '#FFFFFF'
    },
    materials: {
      opacity: 1.0,
      roughness: 0.8,
      metalness: 0.0
    }
  },
  'design_visualization': {
    name: '设计可视化',
    description: '基于Revit渲染模板',
    settings: {
      shadows: true,
      fog: true,
      wireframe: false,
      transparency: true,
      lighting: 'realistic',
      background: '#87CEEB'
    },
    materials: {
      opacity: 0.85,
      roughness: 0.7,
      metalness: 0.1
    }
  },
  'analysis_model': {
    name: '分析模型',
    description: '基于结构分析模板',
    settings: {
      shadows: false,
      fog: false,
      wireframe: true,
      transparency: true,
      lighting: 'technical',
      background: '#F5F5F5'
    },
    materials: {
      opacity: 0.6,
      roughness: 1.0,
      metalness: 0.0
    }
  },
  'construction_sequence': {
    name: '施工工序',
    description: '基于4D施工模拟',
    settings: {
      shadows: true,
      fog: false,
      wireframe: false,
      transparency: true,
      lighting: 'construction',
      background: '#E6E6FA'
    },
    materials: {
      opacity: 0.8,
      roughness: 0.6,
      metalness: 0.05
    }
  }
};

// ==================== 材质属性管理 ====================

/**
 * 获取BIM材质属性
 * @param category 构件类别
 * @param materialName 材质名称
 * @returns 材质属性对象
 */
export function getBIMMaterial(category: string, materialName: string) {
  let materialData;
  
  switch (category) {
    case 'soil':
      materialData = SOIL_MATERIALS[materialName];
      break;
    case 'structure':
      materialData = STRUCTURAL_MATERIALS[materialName];
      break;
    case 'tunnel':
      materialData = TUNNEL_MATERIALS[materialName];
      break;
    case 'hydraulic':
      materialData = HYDRAULIC_MATERIALS[materialName];
      break;
    case 'monitoring':
      materialData = MONITORING_MATERIALS[materialName];
      break;
    default:
      materialData = null;
  }
  
  if (!materialData) {
    console.warn(`未找到材质: ${category}.${materialName}`);
    return {
      color: '#CCCCCC',
      roughness: 0.8,
      metalness: 0.0,
      opacity: 1.0,
      category: '未知',
      description: '默认材质'
    };
  }
  
  return materialData;
}

/**
 * 创建Three.js材质对象
 * @param category 构件类别
 * @param materialName 材质名称
 * @param preset 可视化预设
 * @returns Three.js材质配置
 */
export function createBIMMaterial(
  category: string, 
  materialName: string, 
  preset: string = 'design_visualization'
) {
  const materialData = getBIMMaterial(category, materialName);
  const presetData = BIM_VISUALIZATION_PRESETS[preset];
  
  if (!presetData) {
    console.warn(`未找到预设: ${preset}`);
    return materialData;
  }
  
  // 合并材质属性和预设属性
  return {
    color: new Color(materialData.color),
    roughness: presetData.materials.roughness,
    metalness: presetData.materials.metalness,
    opacity: materialData.opacity * presetData.materials.opacity,
    transparent: materialData.opacity < 1.0 || presetData.materials.opacity < 1.0,
    category: materialData.category,
    description: materialData.description,
    // 自定义属性
    ...(materialData.strength && { strength: materialData.strength }),
    ...(materialData.thickness && { thickness: materialData.thickness }),
    ...(materialData.diameter && { diameter: materialData.diameter }),
    ...(materialData.depth && { depth: materialData.depth })
  };
}

/**
 * 获取构件颜色（基于工程阶段）
 * @param category 构件类别
 * @param materialName 材质名称
 * @param phase 工程阶段
 * @returns 颜色值
 */
export function getPhaseColor(
  category: string, 
  materialName: string, 
  phase: 'existing' | 'new' | 'demolished' | 'temporary'
): Color {
  const baseColor = new Color(getBIMMaterial(category, materialName).color);
  
  switch (phase) {
    case 'existing':
      return baseColor; // 保持原色
    case 'new':
      return baseColor.clone().multiplyScalar(1.2); // 稍微亮化
    case 'demolished':
      return baseColor.clone().multiplyScalar(0.5).lerp(new Color('#FF0000'), 0.3); // 暗化并偏红
    case 'temporary':
      return baseColor.clone().lerp(new Color('#FFFF00'), 0.3); // 偏黄色
    default:
      return baseColor;
  }
}

/**
 * 导出所有材质类别
 */
export const ALL_MATERIAL_CATEGORIES = {
  soil: SOIL_MATERIALS,
  structure: STRUCTURAL_MATERIALS,
  tunnel: TUNNEL_MATERIALS,
  excavation: EXCAVATION_MATERIALS,
  hydraulic: HYDRAULIC_MATERIALS,
  monitoring: MONITORING_MATERIALS
};

/**
 * 获取材质统计信息
 */
export function getMaterialStats() {
  const stats = {
    totalMaterials: 0,
    categoryCounts: {} as Record<string, number>
  };
  
  Object.entries(ALL_MATERIAL_CATEGORIES).forEach(([category, materials]) => {
    const count = Object.keys(materials).length;
    stats.categoryCounts[category] = count;
    stats.totalMaterials += count;
  });
  
  return stats;
}

/**
 * 搜索材质
 * @param query 搜索关键词
 * @returns 匹配的材质列表
 */
export function searchMaterials(query: string) {
  const results: Array<{
    category: string;
    name: string;
    material: any;
  }> = [];
  
  const searchTerm = query.toLowerCase();
  
  Object.entries(ALL_MATERIAL_CATEGORIES).forEach(([category, materials]) => {
    Object.entries(materials).forEach(([name, material]) => {
      if (
        name.toLowerCase().includes(searchTerm) ||
        material.description.toLowerCase().includes(searchTerm) ||
        material.category.toLowerCase().includes(searchTerm)
      ) {
        results.push({ category, name, material });
      }
    });
  });
  
  return results;
} 