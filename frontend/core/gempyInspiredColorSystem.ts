/**
 * GemPy启发的科学地质配色系统
 * 基于感知均匀的配色原理和地质科学可视化最佳实践
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';

/**
 * 基于GemPy的科学配色原理
 * 使用感知均匀的配色方案，避免"黄突突"的问题
 */
export class GemPyInspiredColorSystem {
  
  /**
   * 基于深度的感知均匀配色
   * 使用viridis风格的配色方案，从深到浅
   */
  static getDepthBasedColors(): { [key: string]: string } {
    return {
      // 深层 - 深紫蓝色系
      'surface_5': '#440154', // 最深层 - 深紫色
      'surface_4': '#31688e', // 深层 - 深蓝色
      'surface_3': '#35b779', // 中层 - 绿色
      'surface_2': '#fde725', // 浅层 - 黄绿色
      'surface_1': '#fee08b', // 最浅层 - 浅黄色
    };
  }

  /**
   * 基于岩性的科学配色
   * 参考地质学标准和GemPy的配色实践
   */
  static getLithologyColors(): { [key: string]: string } {
    return {
      // 沉积岩系列 - 使用土黄、棕色系
      'sandstone': '#daa520',     // 砂岩 - 金黄色
      'mudstone': '#8b4513',      // 泥岩 - 马鞍棕
      'limestone': '#f5f5dc',     // 石灰岩 - 米色
      'shale': '#696969',         // 页岩 - 暗灰色
      'conglomerate': '#cd853f',  // 砾岩 - 秘鲁色
      
      // 火成岩系列 - 使用红色、粉色系
      'granite': '#dc143c',       // 花岗岩 - 深红色
      'basalt': '#2f4f4f',        // 玄武岩 - 深石板灰
      'andesite': '#8fbc8f',      // 安山岩 - 深海绿
      'rhyolite': '#f0e68c',      // 流纹岩 - 卡其色
      
      // 变质岩系列 - 使用紫色、蓝色系
      'gneiss': '#9370db',        // 片麻岩 - 中紫色
      'schist': '#4169e1',        // 片岩 - 皇家蓝
      'slate': '#708090',         // 板岩 - 石板灰
      'marble': '#ffffff',        // 大理岩 - 白色
      'quartzite': '#fffacd',     // 石英岩 - 柠檬绸
    };
  }

  /**
   * 基于地质年代的配色
   * 使用国际地层委员会(ICS)标准色彩
   */
  static getGeologicalTimeColors(): { [key: string]: string } {
    return {
      // 新生代 - 暖色系
      'quaternary': '#f9f97f',    // 第四纪 - 浅黄色
      'neogene': '#ffe619',       // 新近纪 - 黄色
      'paleogene': '#fd9a52',     // 古近纪 - 橙色
      
      // 中生代 - 绿色系
      'cretaceous': '#7fc64e',    // 白垩纪 - 绿色
      'jurassic': '#34b2c9',      // 侏罗纪 - 青色
      'triassic': '#812b92',      // 三叠纪 - 紫色
      
      // 古生代 - 蓝色系
      'permian': '#f04028',       // 二叠纪 - 红色
      'carboniferous': '#67a3b8', // 石炭纪 - 蓝灰色
      'devonian': '#cb8c37',      // 泥盆纪 - 棕色
      'silurian': '#b3e1e6',      // 志留纪 - 浅青色
      'ordovician': '#009270',    // 奥陶纪 - 绿色
      'cambrian': '#7fa056',      // 寒武纪 - 橄榄绿
      
      // 前寒武纪 - 深色系
      'precambrian': '#f74370',   // 前寒武纪 - 深红色
    };
  }

  /**
   * 基于物理性质的配色
   * 使用感知均匀的配色映射物理参数
   */
  static getPhysicalPropertyColors(): { [key: string]: string } {
    return {
      // 密度配色 - 从低到高
      'density_low': '#ffffcc',     // 低密度 - 浅黄色
      'density_medium': '#a1dab4',  // 中密度 - 浅绿色
      'density_high': '#41b6c4',    // 高密度 - 青色
      'density_very_high': '#225ea8', // 极高密度 - 深蓝色
      
      // 孔隙度配色 - 从低到高
      'porosity_low': '#67001f',    // 低孔隙度 - 深红色
      'porosity_medium': '#f768a1', // 中孔隙度 - 粉红色
      'porosity_high': '#fbb4b9',   // 高孔隙度 - 浅粉色
      'porosity_very_high': '#feebe2', // 极高孔隙度 - 极浅粉色
      
      // 渗透率配色 - 从低到高
      'permeability_low': '#2c7fb8',    // 低渗透率 - 蓝色
      'permeability_medium': '#7fcdbb', // 中渗透率 - 青绿色
      'permeability_high': '#c7e9b4',   // 高渗透率 - 浅绿色
      'permeability_very_high': '#ffffcc', // 极高渗透率 - 浅黄色
    };
  }

  /**
   * 基于工程用途的配色
   * 针对深基坑工程的特殊需求
   */
  static getEngineeringColors(): { [key: string]: string } {
    return {
      // 支护结构配色
      'diaphragm_wall': '#2e8b57',    // 地连墙 - 海绿色
      'pile': '#8b4513',              // 桩基 - 马鞍棕
      'anchor': '#ff6347',            // 锚杆 - 番茄红
      'strut': '#4682b4',             // 支撑 - 钢蓝色
      'shotcrete': '#d3d3d3',         // 喷射混凝土 - 浅灰色
      
      // 土体类型配色
      'fill': '#daa520',              // 填土 - 金黄色
      'clay': '#8b4513',              // 粘土 - 马鞍棕
      'silt': '#cd853f',              // 粉土 - 秘鲁色
      'sand': '#f4a460',              // 砂土 - 沙棕色
      'gravel': '#a0522d',            // 砾石 - 赭色
      'rock': '#696969',              // 岩石 - 暗灰色
      
      // 水文地质配色
      'groundwater': '#00bfff',       // 地下水 - 深天蓝色
      'aquitard': '#4169e1',          // 隔水层 - 皇家蓝
      'aquifer': '#87ceeb',           // 含水层 - 天蓝色
      'water_table': '#1e90ff',       // 地下水位 - 道奇蓝
    };
  }

  /**
   * 基于Crameri科学配色的地质专用色谱
   * 避免彩虹色谱的感知问题
   */
  static getCrameriInspiredColors(): { [key: string]: string } {
    return {
      // batlow配色方案 - 适用于地形和深度
      'batlow_1': '#011959',
      'batlow_2': '#1e3d5c',
      'batlow_3': '#3c6379',
      'batlow_4': '#5d8a97',
      'batlow_5': '#82b2b6',
      'batlow_6': '#aadad5',
      'batlow_7': '#d4fff4',
      
      // roma配色方案 - 适用于发散数据
      'roma_1': '#7e1e9c',
      'roma_2': '#bf3984',
      'roma_3': '#f1605d',
      'roma_4': '#feb078',
      'roma_5': '#fedb9a',
      'roma_6': '#c8e2d4',
      'roma_7': '#87c8dd',
      
      // vik配色方案 - 适用于双极性数据
      'vik_1': '#001260',
      'vik_2': '#1d4f8c',
      'vik_3': '#5a82b8',
      'vik_4': '#a7b8d4',
      'vik_5': '#f0f0f0',
      'vik_6': '#d4a7a7',
      'vik_7': '#b85a5a',
    };
  }

  /**
   * 获取基于深度的连续配色函数
   * 使用感知均匀的插值
   */
  static getDepthColorFunction(minDepth: number, maxDepth: number): (depth: number) => THREE.Color {
    const colors = [
      new THREE.Color('#fee08b'), // 浅层 - 浅黄色
      new THREE.Color('#fde725'), // 
      new THREE.Color('#35b779'), // 中层 - 绿色
      new THREE.Color('#31688e'), // 
      new THREE.Color('#440154'), // 深层 - 深紫色
    ];
    
    return (depth: number): THREE.Color => {
      const normalizedDepth = (depth - minDepth) / (maxDepth - minDepth);
      const clampedDepth = Math.max(0, Math.min(1, normalizedDepth));
      
      const segmentIndex = clampedDepth * (colors.length - 1);
      const lowerIndex = Math.floor(segmentIndex);
      const upperIndex = Math.min(lowerIndex + 1, colors.length - 1);
      const t = segmentIndex - lowerIndex;
      
      const lowerColor = colors[lowerIndex];
      const upperColor = colors[upperIndex];
      
      return new THREE.Color().lerpColors(lowerColor, upperColor, t);
    };
  }

  /**
   * 获取基于岩性的配色映射
   */
  static getLithologyColorMapping(layerName: string): THREE.Color {
    const lithologyColors = this.getLithologyColors();
    const depthColors = this.getDepthBasedColors();
    const engineeringColors = this.getEngineeringColors();
    
    // 优先匹配岩性
    for (const [key, color] of Object.entries(lithologyColors)) {
      if (layerName.toLowerCase().includes(key)) {
        return new THREE.Color(color);
      }
    }
    
    // 其次匹配工程用途
    for (const [key, color] of Object.entries(engineeringColors)) {
      if (layerName.toLowerCase().includes(key)) {
        return new THREE.Color(color);
      }
    }
    
    // 最后使用基于深度的配色
    for (const [key, color] of Object.entries(depthColors)) {
      if (layerName.toLowerCase().includes(key)) {
        return new THREE.Color(color);
      }
    }
    
    // 默认使用中性色
    return new THREE.Color('#8b7355'); // 淡棕色
  }

  /**
   * 创建地质材质
   * 使用科学配色和适当的材质属性
   */
  static createGeologicalMaterial(
    layerName: string, 
    options: {
      opacity?: number;
      wireframe?: boolean;
      transparent?: boolean;
    } = {}
  ): THREE.MeshLambertMaterial {
    const color = this.getLithologyColorMapping(layerName);
    
    return new THREE.MeshLambertMaterial({
      color: color,
      opacity: options.opacity ?? 0.8,
      transparent: options.transparent ?? true,
      wireframe: options.wireframe ?? false,
      side: THREE.DoubleSide,
      // 使用Lambert材质以获得更好的性能和科学可视化效果
    });
  }

  /**
   * 验证配色的感知均匀性
   * 基于CIELAB色彩空间的感知差异
   */
  static validatePerceptualUniformity(colors: string[]): boolean {
    // 简化的感知均匀性检查
    // 在实际应用中，应该使用更复杂的色彩科学算法
    if (colors.length < 2) return true;
    
    const threeColors = colors.map(c => new THREE.Color(c));
    let isUniform = true;
    
    for (let i = 0; i < threeColors.length - 1; i++) {
      const color1 = threeColors[i];
      const color2 = threeColors[i + 1];
      
      // 计算RGB空间中的欧几里得距离（简化）
      const distance = Math.sqrt(
        Math.pow(color1.r - color2.r, 2) +
        Math.pow(color1.g - color2.g, 2) +
        Math.pow(color1.b - color2.b, 2)
      );
      
      // 如果颜色变化太剧烈，标记为不均匀
      if (distance > 0.5) {
        isUniform = false;
        break;
      }
    }
    
    return isUniform;
  }

  /**
   * 获取推荐的地质配色方案
   */
  static getRecommendedScheme(dataType: 'depth' | 'lithology' | 'time' | 'property' | 'engineering'): { [key: string]: string } {
    switch (dataType) {
      case 'depth':
        return this.getDepthBasedColors();
      case 'lithology':
        return this.getLithologyColors();
      case 'time':
        return this.getGeologicalTimeColors();
      case 'property':
        return this.getPhysicalPropertyColors();
      case 'engineering':
        return this.getEngineeringColors();
      default:
        return this.getDepthBasedColors();
    }
  }
}

// 导出单例实例
export const gempyColorSystem = new GemPyInspiredColorSystem();

// 导出默认实例
export default gempyColorSystem; 