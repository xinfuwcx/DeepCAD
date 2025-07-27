/**
 * 几何数据集成服务
 * 3号计算专家与2号几何专家数据接口联调
 * 负责几何模型数据与Fragment优化算法的无缝集成
 */

import { ComponentDevHelper } from '../utils/developmentTools';
import { FragmentData, MeshElement, MeshNode } from '../algorithms/fragmentOptimization';

// 2号几何专家的地质建模数据接口
export interface GeologyModelData {
  boreholes: BoreholeData[];
  layers: GeologyLayer[];
  gridResolution: number;
  boundingBox: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    zMin: number;
    zMax: number;
  };
  interpolationMethod: 'kriging' | 'idw' | 'spline';
}

export interface BoreholeData {
  id: string;
  name: string;
  position: [number, number, number];
  depth: number;
  layers: LayerInfo[];
}

export interface LayerInfo {
  id: string;
  name: string;
  topElevation: number;
  bottomElevation: number;
  materialType: string;
  properties: {
    cohesion: number;
    friction: number;
    density: number;
    elasticModulus: number;
    poissonRatio: number;
  };
}

export interface GeologyLayer {
  id: string;
  name: string;
  materialType: string;
  thickness: number;
  nodes: GeologyNode[];
  elements: GeologyElement[];
}

export interface GeologyNode {
  id: number;
  coordinates: [number, number, number];
  layerId: string;
}

export interface GeologyElement {
  id: number;
  nodeIds: number[];
  layerId: string;
  materialId: string;
  type: 'tetrahedron' | 'hexahedron';
}

// 基坑开挖数据接口
export interface ExcavationData {
  geometry: ExcavationGeometry;
  stages: ExcavationStage[];
  supportStructures: SupportStructure[];
}

export interface ExcavationGeometry {
  outline: [number, number][];
  depth: number;
  stageHeights: number[];
  slopeRatio: number;
}

export interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  sequence: number;
  elements: MeshElement[];
  nodes: MeshNode[];
}

export interface SupportStructure {
  id: string;
  type: 'diaphragm_wall' | 'anchor' | 'steel_support';
  geometry: any;
  properties: any;
}

// 集成后的Fragment数据
export interface IntegratedFragmentData extends FragmentData {
  sourceType: 'geology' | 'excavation' | 'support';
  layerId?: string;
  stageId?: string;
  materialProperties?: LayerInfo['properties'];
}

/**
 * 几何数据集成服务类
 */
export class GeometryIntegrationService {
  private geologyData: GeologyModelData | null = null;
  private excavationData: ExcavationData | null = null;
  private fragmentIdCounter = 1;

  /**
   * 设置2号几何专家的地质建模数据
   */
  setGeologyData(data: GeologyModelData): void {
    this.geologyData = data;
    ComponentDevHelper.logDevTip(`设置地质数据: ${data.layers.length}层, ${data.boreholes.length}个钻孔`);
  }

  /**
   * 设置基坑开挖数据
   */
  setExcavationData(data: ExcavationData): void {
    this.excavationData = data;
    ComponentDevHelper.logDevTip(`设置开挖数据: ${data.stages.length}个施工阶段`);
  }

  /**
   * 将2号几何专家数据转换为3号Fragment优化算法所需格式
   */
  async convertToFragments(): Promise<IntegratedFragmentData[]> {
    const fragments: IntegratedFragmentData[] = [];

    ComponentDevHelper.logDevTip('开始几何数据转换为Fragment格式');

    // 转换地质层数据
    if (this.geologyData) {
      for (const layer of this.geologyData.layers) {
        const fragment = await this.convertGeologyLayerToFragment(layer);
        if (fragment) {
          fragments.push(fragment);
        }
      }
    }

    // 转换开挖阶段数据
    if (this.excavationData) {
      for (const stage of this.excavationData.stages) {
        const fragment = await this.convertExcavationStageToFragment(stage);
        if (fragment) {
          fragments.push(fragment);
        }
      }
    }

    ComponentDevHelper.logDevTip(`数据转换完成: 生成${fragments.length}个Fragment`);
    return fragments;
  }

  /**
   * 将地质层转换为Fragment
   */
  private async convertGeologyLayerToFragment(layer: GeologyLayer): Promise<IntegratedFragmentData | null> {
    if (layer.elements.length === 0 || layer.nodes.length === 0) {
      return null;
    }

    // 转换节点格式
    const nodes: MeshNode[] = layer.nodes.map(node => ({
      id: node.id,
      coordinates: node.coordinates,
      isFixed: false
    }));

    // 转换单元格式
    const elements: MeshElement[] = layer.elements.map(element => ({
      id: element.id,
      nodeIds: element.nodeIds,
      type: element.type,
      materialId: parseInt(element.materialId) || 1,
      quality: this.calculateElementQuality(element, layer.nodes)
    }));

    // 计算包围盒
    const boundingBox = this.calculateBoundingBox(nodes);

    // 计算质量分数
    const qualityScore = this.calculateLayerQuality(elements);

    // 获取材料属性
    const materialProperties = this.getMaterialPropertiesForLayer(layer.id);

    return {
      id: `geology_${layer.id}`,
      fragmentId: this.fragmentIdCounter++,
      elementCount: elements.length,
      nodeCount: nodes.length,
      qualityScore,
      elements,
      nodes,
      materialType: layer.materialType,
      boundingBox,
      sourceType: 'geology',
      layerId: layer.id,
      materialProperties
    };
  }

  /**
   * 将开挖阶段转换为Fragment
   */
  private async convertExcavationStageToFragment(stage: ExcavationStage): Promise<IntegratedFragmentData | null> {
    if (stage.elements.length === 0 || stage.nodes.length === 0) {
      return null;
    }

    // 计算包围盒
    const boundingBox = this.calculateBoundingBox(stage.nodes);

    // 计算质量分数
    const qualityScore = this.calculateLayerQuality(stage.elements);

    return {
      id: `excavation_${stage.id}`,
      fragmentId: this.fragmentIdCounter++,
      elementCount: stage.elements.length,
      nodeCount: stage.nodes.length,
      qualityScore,
      elements: stage.elements,
      nodes: stage.nodes,
      materialType: 'excavation_void',
      boundingBox,
      sourceType: 'excavation',
      stageId: stage.id
    };
  }

  /**
   * 计算单元质量
   */
  private calculateElementQuality(element: GeologyElement, nodes: GeologyNode[]) {
    // 简化的质量计算 - 基于节点坐标计算长宽比等
    const elementNodes = nodes.filter(n => element.nodeIds.includes(n.id));
    if (elementNodes.length < 4) {
      return {
        aspectRatio: 1.0,
        skewness: 0.0,
        jacobian: 1.0,
        volume: 1.0
      };
    }

    // 基本质量指标计算
    const coords = elementNodes.map(n => n.coordinates);
    const aspectRatio = this.calculateAspectRatio(coords);
    const skewness = Math.random() * 0.3; // 简化
    const jacobian = 0.8 + Math.random() * 0.4; // 简化
    const volume = this.calculateElementVolume(coords);

    return {
      aspectRatio,
      skewness,
      jacobian,
      volume
    };
  }

  /**
   * 计算长宽比
   */
  private calculateAspectRatio(coords: [number, number, number][]): number {
    if (coords.length < 2) return 1.0;
    
    const distances = [];
    for (let i = 0; i < coords.length - 1; i++) {
      for (let j = i + 1; j < coords.length; j++) {
        const dist = Math.sqrt(
          Math.pow(coords[i][0] - coords[j][0], 2) +
          Math.pow(coords[i][1] - coords[j][1], 2) +
          Math.pow(coords[i][2] - coords[j][2], 2)
        );
        distances.push(dist);
      }
    }
    
    const maxDist = Math.max(...distances);
    const minDist = Math.min(...distances);
    return minDist > 0 ? maxDist / minDist : 1.0;
  }

  /**
   * 计算单元体积
   */
  private calculateElementVolume(coords: [number, number, number][]): number {
    // 简化的体积计算
    if (coords.length < 4) return 1.0;
    
    // 使用四面体体积公式的简化版本
    const [a, b, c, d] = coords;
    const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
    const ac = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const ad = [d[0] - a[0], d[1] - a[1], d[2] - a[2]];
    
    // 计算标量三重积的简化版本
    const volume = Math.abs(
      ab[0] * (ac[1] * ad[2] - ac[2] * ad[1]) +
      ab[1] * (ac[2] * ad[0] - ac[0] * ad[2]) +
      ab[2] * (ac[0] * ad[1] - ac[1] * ad[0])
    ) / 6.0;
    
    return Math.max(volume, 0.001); // 避免零体积
  }

  /**
   * 计算包围盒
   */
  private calculateBoundingBox(nodes: MeshNode[]) {
    if (nodes.length === 0) {
      return {
        min: [0, 0, 0] as [number, number, number],
        max: [0, 0, 0] as [number, number, number]
      };
    }

    const coords = nodes.map(n => n.coordinates);
    const xs = coords.map(c => c[0]);
    const ys = coords.map(c => c[1]);
    const zs = coords.map(c => c[2]);

    return {
      min: [Math.min(...xs), Math.min(...ys), Math.min(...zs)] as [number, number, number],
      max: [Math.max(...xs), Math.max(...ys), Math.max(...zs)] as [number, number, number]
    };
  }

  /**
   * 计算层质量分数
   */
  private calculateLayerQuality(elements: MeshElement[]): number {
    if (elements.length === 0) return 0;

    const qualityScores = elements
      .filter(e => e.quality)
      .map(e => {
        const q = e.quality!;
        // 综合质量评分
        const aspectScore = Math.max(0, 1 - (q.aspectRatio - 1) / 10);
        const skewnessScore = Math.max(0, 1 - q.skewness);
        const jacobianScore = q.jacobian;
        return (aspectScore + skewnessScore + jacobianScore) / 3;
      });

    return qualityScores.length > 0 ? 
      qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 
      0.7; // 默认质量分数
  }

  /**
   * 获取层的材料属性
   */
  private getMaterialPropertiesForLayer(layerId: string): LayerInfo['properties'] | undefined {
    if (!this.geologyData) return undefined;

    // 从钻孔数据中查找对应层的材料属性
    for (const borehole of this.geologyData.boreholes) {
      const layer = borehole.layers.find(l => l.id === layerId);
      if (layer) {
        return layer.properties;
      }
    }

    return undefined;
  }

  /**
   * 获取数据统计信息
   */
  getDataStatistics() {
    const stats = {
      geologyLayers: this.geologyData?.layers.length || 0,
      boreholes: this.geologyData?.boreholes.length || 0,
      excavationStages: this.excavationData?.stages.length || 0,
      supportStructures: this.excavationData?.supportStructures.length || 0,
      totalElements: 0,
      totalNodes: 0
    };

    if (this.geologyData) {
      stats.totalElements += this.geologyData.layers.reduce((sum, layer) => sum + layer.elements.length, 0);
      stats.totalNodes += this.geologyData.layers.reduce((sum, layer) => sum + layer.nodes.length, 0);
    }

    if (this.excavationData) {
      stats.totalElements += this.excavationData.stages.reduce((sum, stage) => sum + stage.elements.length, 0);
      stats.totalNodes += this.excavationData.stages.reduce((sum, stage) => sum + stage.nodes.length, 0);
    }

    return stats;
  }

  /**
   * 验证数据完整性
   */
  validateDataIntegrity(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    if (!this.geologyData) {
      issues.push('缺少地质建模数据');
    } else {
      if (this.geologyData.layers.length === 0) {
        issues.push('地质数据中没有地层信息');
      }
      if (this.geologyData.boreholes.length === 0) {
        issues.push('地质数据中没有钻孔信息');
      }
    }

    if (!this.excavationData) {
      issues.push('缺少基坑开挖数据');
    } else {
      if (this.excavationData.stages.length === 0) {
        issues.push('开挖数据中没有施工阶段信息');
      }
    }

    return {
      isValid: issues.length === 0,
      issues
    };
  }
}

// 创建全局服务实例
export const geometryIntegrationService = new GeometryIntegrationService();

// 便捷函数
export const integrateGeometryData = async (
  geologyData: GeologyModelData,
  excavationData: ExcavationData
): Promise<IntegratedFragmentData[]> => {
  geometryIntegrationService.setGeologyData(geologyData);
  geometryIntegrationService.setExcavationData(excavationData);
  return geometryIntegrationService.convertToFragments();
};

export default GeometryIntegrationService;