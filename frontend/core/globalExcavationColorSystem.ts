/**
 * 全球基坑工程配色系统
 * 基于世界各地深基坑工程实践和国际标准
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import { Color } from 'three';

// ==================== 全球深基坑工程配色 ====================

export const GLOBAL_EXCAVATION_MATERIALS = {
  // 基坑类型 (Excavation Types)
  'deep_excavation': {
    color: '#8B4513',               // 深基坑 - 马鞍棕色
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.3,
    category: '基坑类型',
    description: '深基坑开挖区域',
    standards: ['EN 1997', 'ASCE 7', 'JGJ 120']
  },
  'shallow_excavation': {
    color: '#CD853F',               // 浅基坑 - 秘鲁色
    roughness: 0.85,
    metalness: 0.0,
    opacity: 0.4,
    category: '基坑类型',
    description: '浅基坑开挖区域',
    standards: ['EN 1997', 'ASCE 7']
  },
  'cut_and_cover': {
    color: '#A0522D',               // 明挖回填 - 赭石色
    roughness: 0.9,
    metalness: 0.0,
    opacity: 0.5,
    category: '基坑类型',
    description: '明挖回填隧道',
    standards: ['ITA Guidelines', 'NATM']
  },

  // 支护系统 (Support Systems)
  'diaphragm_wall': {
    color: '#708090',               // 地连墙 - 石板灰
    roughness: 0.3,
    metalness: 0.1,
    opacity: 1.0,
    category: '支护系统',
    description: '地下连续墙',
    standards: ['EN 1538', 'FHWA-IF-99-015']
  },
  'secant_pile': {
    color: '#4682B4',               // 咬合桩 - 钢蓝色
    roughness: 0.4,
    metalness: 0.2,
    opacity: 1.0,
    category: '支护系统',
    description: '咬合桩围护',
    standards: ['EN 12699', 'DIN 4126']
  },
  'contiguous_pile': {
    color: '#5F9EA0',               // 排桩 - 军校蓝
    roughness: 0.4,
    metalness: 0.2,
    opacity: 1.0,
    category: '支护系统',
    description: '排桩围护',
    standards: ['EN 12699', 'BS 8004']
  },
  'sheet_pile': {
    color: '#2F4F4F',               // 钢板桩 - 暗石板灰
    roughness: 0.2,
    metalness: 0.8,
    opacity: 1.0,
    category: '支护系统',
    description: '钢板桩围护',
    standards: ['EN 12063', 'ASTM A328']
  },
  'soldier_pile': {
    color: '#696969',               // 兵桩 - 暗灰色
    roughness: 0.3,
    metalness: 0.5,
    opacity: 1.0,
    category: '支护系统',
    description: '兵桩+挡板',
    standards: ['FHWA-SA-96-069', 'AASHTO']
  },

  // 支撑系统 (Bracing Systems)
  'steel_strut': {
    color: '#FF6347',               // 钢支撑 - 番茄红
    roughness: 0.2,
    metalness: 0.9,
    opacity: 1.0,
    category: '支撑系统',
    description: '钢支撑',
    standards: ['EN 10025', 'AISC 360']
  },
  'concrete_strut': {
    color: '#C0C0C0',               // 混凝土支撑 - 银色
    roughness: 0.6,
    metalness: 0.0,
    opacity: 1.0,
    category: '支撑系统',
    description: '混凝土支撑',
    standards: ['EN 1992', 'ACI 318']
  },
  'prestressed_anchor': {
    color: '#FFD700',               // 预应力锚杆 - 金色
    roughness: 0.2,
    metalness: 0.8,
    opacity: 1.0,
    category: '支撑系统',
    description: '预应力锚杆',
    standards: ['EN 1537', 'PTI DC35.1']
  },
  'soil_nail': {
    color: '#DAA520',               // 土钉 - 金棒色
    roughness: 0.3,
    metalness: 0.7,
    opacity: 1.0,
    category: '支撑系统',
    description: '土钉支护',
    standards: ['FHWA-SA-96-069A', 'EN 14490']
  },

  // 地面改良 (Ground Improvement)
  'jet_grouting': {
    color: '#9370DB',               // 高压旋喷 - 中紫色
    roughness: 0.7,
    metalness: 0.0,
    opacity: 0.8,
    category: '地面改良',
    description: '高压旋喷桩',
    standards: ['EN 12716', 'ASTM D4320']
  },
  'deep_mixing': {
    color: '#8A2BE2',               // 深层搅拌 - 蓝紫色
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.7,
    category: '地面改良',
    description: '深层搅拌桩',
    standards: ['JGJ 79', 'CDIT']
  },
  'grouting': {
    color: '#9932CC',               // 注浆 - 暗兰花紫
    roughness: 0.6,
    metalness: 0.0,
    opacity: 0.6,
    category: '地面改良',
    description: '注浆加固',
    standards: ['EN 12715', 'ACI 212.3R']
  },
  'freezing': {
    color: '#00CED1',               // 冻结法 - 暗绿松石色
    roughness: 0.1,
    metalness: 0.0,
    opacity: 0.8,
    category: '地面改良',
    description: '人工冻结',
    standards: ['DIN 4093', 'ISSMGE TC211']
  },

  // 降水系统 (Dewatering Systems)
  'wellpoint': {
    color: '#00BFFF',               // 轻型井点 - 深天蓝
    roughness: 0.1,
    metalness: 0.3,
    opacity: 1.0,
    category: '降水系统',
    description: '轻型井点降水',
    standards: ['BS 8004', 'CIRIA C515']
  },
  'deep_well': {
    color: '#1E90FF',               // 管井 - 道奇蓝
    roughness: 0.2,
    metalness: 0.4,
    opacity: 1.0,
    category: '降水系统',
    description: '管井降水',
    standards: ['EN 1997-2', 'ASTM D5092']
  },
  'ejector_well': {
    color: '#4169E1',               // 喷射井点 - 皇家蓝
    roughness: 0.2,
    metalness: 0.5,
    opacity: 1.0,
    category: '降水系统',
    description: '喷射井点',
    standards: ['DIN 4093', 'CIRIA C515']
  },

  // 施工设备 (Construction Equipment)
  'excavator': {
    color: '#FFD700',               // 挖掘机 - 金色
    roughness: 0.3,
    metalness: 0.7,
    opacity: 1.0,
    category: '施工设备',
    description: '液压挖掘机',
    standards: ['ISO 6165', 'SAE J1116']
  },
  'crane': {
    color: '#FF8C00',               // 起重机 - 暗橙色
    roughness: 0.3,
    metalness: 0.8,
    opacity: 1.0,
    category: '施工设备',
    description: '履带起重机',
    standards: ['EN 13000', 'ASME B30.5']
  },
  'drilling_rig': {
    color: '#DC143C',               // 钻机 - 深红色
    roughness: 0.4,
    metalness: 0.6,
    opacity: 1.0,
    category: '施工设备',
    description: '旋挖钻机',
    standards: ['EN 16228', 'ADSC']
  },
  'concrete_pump': {
    color: '#32CD32',               // 混凝土泵 - 酸橙绿
    roughness: 0.3,
    metalness: 0.5,
    opacity: 1.0,
    category: '施工设备',
    description: '混凝土泵车',
    standards: ['EN 12001', 'ACI 304.2R']
  },

  // 监测系统 (Monitoring Systems)
  'inclinometer': {
    color: '#FF69B4',               // 测斜仪 - 热粉红
    roughness: 0.2,
    metalness: 0.3,
    opacity: 1.0,
    category: '监测系统',
    description: '测斜仪',
    standards: ['ASTM D6230', 'BS 5930']
  },
  'piezometer': {
    color: '#20B2AA',               // 孔隙水压计 - 浅海绿
    roughness: 0.3,
    metalness: 0.2,
    opacity: 1.0,
    category: '监测系统',
    description: '孔隙水压计',
    standards: ['ASTM D4750', 'EN ISO 22476']
  },
  'strain_gauge': {
    color: '#9932CC',               // 应变计 - 暗兰花紫
    roughness: 0.1,
    metalness: 0.8,
    opacity: 1.0,
    category: '监测系统',
    description: '应变计',
    standards: ['ASTM E251', 'ISO 9513']
  },
  'total_station': {
    color: '#FF1493',               // 全站仪 - 深粉红
    roughness: 0.2,
    metalness: 0.7,
    opacity: 1.0,
    category: '监测系统',
    description: '全站仪测量',
    standards: ['ISO 17123', 'ASTM E2938']
  },

  // 安全设施 (Safety Facilities)
  'safety_barrier': {
    color: '#FF0000',               // 安全护栏 - 红色
    roughness: 0.2,
    metalness: 0.0,
    opacity: 1.0,
    category: '安全设施',
    description: '安全护栏',
    standards: ['EN 13374', 'OSHA 1926']
  },
  'warning_light': {
    color: '#FFA500',               // 警示灯 - 橙色
    roughness: 0.1,
    metalness: 0.0,
    opacity: 1.0,
    category: '安全设施',
    description: '警示灯',
    standards: ['EN 12368', 'MUTCD']
  },
  'safety_net': {
    color: '#FFFF00',               // 安全网 - 黄色
    roughness: 0.8,
    metalness: 0.0,
    opacity: 0.7,
    category: '安全设施',
    description: '安全防护网',
    standards: ['EN 1263', 'ANSI A10.11']
  }
};

// ==================== 全球地区基坑工程特色 ====================

export const REGIONAL_EXCAVATION_PRACTICES = {
  // 欧洲 (Europe)
  europe: {
    'berlin_wall': {
      color: '#708090',
      description: '柏林墙工法（德国）',
      standards: ['DIN 4126', 'EAB']
    },
    'milan_method': {
      color: '#4682B4',
      description: '米兰工法（意大利）',
      standards: ['CNR-UNI 10006']
    },
    'london_clay_practice': {
      color: '#2F4F4F',
      description: '伦敦黏土工程实践',
      standards: ['BS 8004', 'CIRIA C580']
    },
    'scandinavian_rock': {
      color: '#696969',
      description: '斯堪的纳维亚岩石工程',
      standards: ['NS 3480', 'SFS 4084']
    }
  },

  // 北美 (North America)
  north_america: {
    'top_down_method': {
      color: '#4682B4',
      description: '逆作法（美国）',
      standards: ['ASCE 7', 'FHWA-IF-99-015']
    },
    'slurry_wall': {
      color: '#708090',
      description: '泥浆墙工法',
      standards: ['ADSC', 'DFI']
    },
    'soil_nail_wall': {
      color: '#DAA520',
      description: '土钉墙工法',
      standards: ['FHWA-SA-96-069A']
    },
    'secant_pile_wall': {
      color: '#5F9EA0',
      description: '咬合桩墙',
      standards: ['ADSC', 'DFI']
    }
  },

  // 亚洲 (Asia)
  asia: {
    'smw_method': {
      color: '#8A2BE2',
      description: 'SMW工法（日本）',
      standards: ['JGS', 'JSCE']
    },
    'dcm_method': {
      color: '#9370DB',
      description: 'DCM工法（日本）',
      standards: ['JGS 0821']
    },
    'korean_strut': {
      color: '#FF6347',
      description: '韩式支撑系统',
      standards: ['KGS', 'KICT']
    },
    'singapore_method': {
      color: '#00CED1',
      description: '新加坡工法',
      standards: ['SS CP4', 'BCA']
    }
  },

  // 中东 (Middle East)
  middle_east: {
    'dubai_method': {
      color: '#FFD700',
      description: '迪拜深基坑工法',
      standards: ['UAE Fire Code', 'Dubai Municipality']
    },
    'desert_excavation': {
      color: '#F4A460',
      description: '沙漠地区基坑',
      standards: ['ARAMCO', 'ADNOC']
    }
  },

  // 澳洲 (Australia)
  australia: {
    'australian_standard': {
      color: '#8B4513',
      description: '澳洲标准工法',
      standards: ['AS 2159', 'AS 3600']
    },
    'sydney_sandstone': {
      color: '#F4A460',
      description: '悉尼砂岩工程',
      standards: ['AS 1726', 'AUSTROADS']
    }
  }
};

// ==================== 国际工程标准配色 ====================

export const INTERNATIONAL_ENGINEERING_STANDARDS = {
  // ISO标准配色
  iso_colors: {
    'iso_danger': '#FF0000',        // ISO 3864-1 危险
    'iso_warning': '#FFA500',       // ISO 3864-1 警告
    'iso_mandatory': '#0000FF',     // ISO 3864-1 强制
    'iso_safe': '#00FF00',          // ISO 3864-1 安全
    'iso_fire': '#FF0000',          // ISO 3864-1 消防
  },

  // ANSI标准配色
  ansi_colors: {
    'ansi_red': '#FF0000',          // ANSI Z535.1 红色
    'ansi_orange': '#FFA500',       // ANSI Z535.1 橙色
    'ansi_yellow': '#FFFF00',       // ANSI Z535.1 黄色
    'ansi_green': '#00FF00',        // ANSI Z535.1 绿色
    'ansi_blue': '#0000FF',         // ANSI Z535.1 蓝色
  },

  // EN标准配色
  en_colors: {
    'en_temporary': '#FF4500',      // EN 12063 临时工程
    'en_permanent': '#4682B4',      // EN 12063 永久工程
    'en_support': '#228B22',        // EN 12063 支撑
    'en_drainage': '#00CED1',       // EN 12063 排水
  }
};

// ==================== 配色方案预设 ====================

export const GLOBAL_EXCAVATION_SCHEMES = {
  'international_standard': {
    name: '国际标准',
    description: '基于ISO、ANSI、EN等国际标准的配色方案',
    colors: GLOBAL_EXCAVATION_MATERIALS,
    opacity: 0.8,
    materialType: 'engineering'
  },
  
  'european_practice': {
    name: '欧洲实践',
    description: '基于欧洲深基坑工程实践的配色方案',
    colors: REGIONAL_EXCAVATION_PRACTICES.europe,
    opacity: 0.8,
    materialType: 'standard'
  },
  
  'north_american_practice': {
    name: '北美实践',
    description: '基于北美深基坑工程实践的配色方案',
    colors: REGIONAL_EXCAVATION_PRACTICES.north_america,
    opacity: 0.8,
    materialType: 'standard'
  },
  
  'asian_practice': {
    name: '亚洲实践',
    description: '基于亚洲深基坑工程实践的配色方案',
    colors: REGIONAL_EXCAVATION_PRACTICES.asia,
    opacity: 0.8,
    materialType: 'standard'
  },
  
  'safety_focused': {
    name: '安全导向',
    description: '基于国际安全标准的配色方案',
    colors: INTERNATIONAL_ENGINEERING_STANDARDS,
    opacity: 1.0,
    materialType: 'safety'
  }
};

// ==================== 工具函数 ====================

/**
 * 获取全球基坑工程配色
 */
export const getGlobalExcavationColor = (
  scheme: keyof typeof GLOBAL_EXCAVATION_SCHEMES,
  elementType: string
): Color => {
  const colorScheme = GLOBAL_EXCAVATION_SCHEMES[scheme];
  if (!colorScheme) {
    console.warn(`Unknown excavation color scheme: ${scheme}`);
    return new Color('#808080');
  }
  
  const colorValue = colorScheme.colors[elementType]?.color || colorScheme.colors[elementType];
  if (!colorValue) {
    console.warn(`Unknown element type: ${elementType} in scheme: ${scheme}`);
    return new Color('#808080');
  }
  
  return new Color(colorValue);
};

/**
 * 创建全球基坑工程材质
 */
export const createGlobalExcavationMaterial = (
  scheme: keyof typeof GLOBAL_EXCAVATION_SCHEMES,
  elementType: string
) => {
  const colorScheme = GLOBAL_EXCAVATION_SCHEMES[scheme];
  const color = getGlobalExcavationColor(scheme, elementType);
  const element = colorScheme.colors[elementType];
  
  return {
    color: color.getHex(),
    opacity: element?.opacity || colorScheme.opacity,
    transparent: (element?.opacity || colorScheme.opacity) < 1.0,
    materialType: colorScheme.materialType,
    roughness: element?.roughness || 0.7,
    metalness: element?.metalness || 0.0,
    standards: element?.standards || []
  };
};

/**
 * 获取工程标准信息
 */
export const getEngineeringStandards = (elementType: string): string[] => {
  const element = GLOBAL_EXCAVATION_MATERIALS[elementType];
  return element?.standards || [];
};

export default {
  GLOBAL_EXCAVATION_MATERIALS,
  REGIONAL_EXCAVATION_PRACTICES,
  INTERNATIONAL_ENGINEERING_STANDARDS,
  GLOBAL_EXCAVATION_SCHEMES,
  getGlobalExcavationColor,
  createGlobalExcavationMaterial,
  getEngineeringStandards
}; 