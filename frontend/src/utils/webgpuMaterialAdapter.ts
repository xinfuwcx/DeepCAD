/**
 * WebGPU材质系统适配器
 * 负责Three.js材质到WebGPU节点材质的自动转换和优化
 */

import * as THREE from 'three';
import * as THREEWebGPU from 'three/webgpu';

export interface MaterialConversionConfig {
  preserveOriginal: boolean;
  enableOptimizations: boolean;
  useComputeShaders: boolean;
  targetPerformance: 'speed' | 'quality' | 'balanced';
}

export interface WebGPUMaterialMetrics {
  conversionTime: number;
  memoryUsage: number;
  shaderComplexity: number;
  renderingCost: number;
}

/**
 * WebGPU材质适配器主类
 */
export class WebGPUMaterialAdapter {
  private materialCache = new Map<string, any>();
  private conversionMetrics = new Map<string, WebGPUMaterialMetrics>();
  private config: MaterialConversionConfig;

  constructor(config: Partial<MaterialConversionConfig> = {}) {
    this.config = {
      preserveOriginal: true,
      enableOptimizations: true,
      useComputeShaders: false,
      targetPerformance: 'balanced',
      ...config
    };
  }

  /**
   * 转换Three.js材质到WebGPU节点材质
   */
  convertMaterial(material: THREE.Material): any {
    const cacheKey = this.getMaterialCacheKey(material);
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey);
    }

    const startTime = performance.now();
    let webgpuMaterial: any;

    try {
      webgpuMaterial = this.performMaterialConversion(material);
      
      // 应用优化
      if (this.config.enableOptimizations) {
        webgpuMaterial = this.optimizeMaterial(webgpuMaterial, material);
      }

      // 缓存结果
      this.materialCache.set(cacheKey, webgpuMaterial);
      
      // 记录转换指标
      this.recordConversionMetrics(cacheKey, startTime, webgpuMaterial);
      
      return webgpuMaterial;
    } catch (error) {
      console.warn('材质转换失败，使用默认材质:', error);
      return this.createFallbackMaterial(material);
    }
  }

  /**
   * 执行具体的材质转换逻辑
   */
  private performMaterialConversion(material: THREE.Material): any {
    // 基础节点材质
    const { MeshStandardNodeMaterial, MeshBasicNodeMaterial, MeshPhysicalNodeMaterial } = THREEWebGPU;

    if (material instanceof THREE.MeshStandardMaterial) {
      return this.convertStandardMaterial(material, MeshStandardNodeMaterial);
    } else if (material instanceof THREE.MeshBasicMaterial) {
      return this.convertBasicMaterial(material, MeshBasicNodeMaterial);
    } else if (material instanceof THREE.MeshPhysicalMaterial) {
      return this.convertPhysicalMaterial(material, MeshPhysicalNodeMaterial);
    } else if (material instanceof THREE.MeshLambertMaterial) {
      return this.convertLambertMaterial(material, MeshStandardNodeMaterial);
    } else if (material instanceof THREE.MeshPhongMaterial) {
      return this.convertPhongMaterial(material, MeshStandardNodeMaterial);
    }

    // 默认转换为标准节点材质
    return this.convertToStandardNodeMaterial(material, MeshStandardNodeMaterial);
  }

  /**
   * 转换标准材质
   */
  private convertStandardMaterial(material: THREE.MeshStandardMaterial, NodeMaterialClass: any): any {
    const nodeMaterial = new NodeMaterialClass();

    // 基础属性
    nodeMaterial.color = material.color.clone();
    nodeMaterial.metalness = material.metalness;
    nodeMaterial.roughness = material.roughness;
    nodeMaterial.opacity = material.opacity;
    nodeMaterial.transparent = material.transparent;
    nodeMaterial.side = material.side;

    // 贴图转换
    if (material.map) {
      nodeMaterial.map = material.map;
    }
    if (material.normalMap) {
      nodeMaterial.normalMap = material.normalMap;
      nodeMaterial.normalScale = material.normalScale;
    }
    if (material.metalnessMap) {
      nodeMaterial.metalnessMap = material.metalnessMap;
    }
    if (material.roughnessMap) {
      nodeMaterial.roughnessMap = material.roughnessMap;
    }
    if (material.aoMap) {
      nodeMaterial.aoMap = material.aoMap;
      nodeMaterial.aoMapIntensity = material.aoMapIntensity;
    }
    if (material.emissiveMap) {
      nodeMaterial.emissiveMap = material.emissiveMap;
    }

    // 发光属性
    nodeMaterial.emissive = material.emissive.clone();
    nodeMaterial.emissiveIntensity = material.emissiveIntensity;

    // 环境光遮蔽
    if (material.envMap) {
      nodeMaterial.envMap = material.envMap;
      nodeMaterial.envMapIntensity = material.envMapIntensity;
    }

    return nodeMaterial;
  }

  /**
   * 转换基础材质
   */
  private convertBasicMaterial(material: THREE.MeshBasicMaterial, NodeMaterialClass: any): any {
    const nodeMaterial = new NodeMaterialClass();

    nodeMaterial.color = material.color.clone();
    nodeMaterial.opacity = material.opacity;
    nodeMaterial.transparent = material.transparent;
    nodeMaterial.side = material.side;

    if (material.map) {
      nodeMaterial.map = material.map;
    }

    return nodeMaterial;
  }

  /**
   * 转换物理材质
   */
  private convertPhysicalMaterial(material: THREE.MeshPhysicalMaterial, NodeMaterialClass: any): any {
    const nodeMaterial = this.convertStandardMaterial(material, NodeMaterialClass);

    // 物理材质特有属性
    nodeMaterial.clearcoat = material.clearcoat;
    nodeMaterial.clearcoatRoughness = material.clearcoatRoughness;
    nodeMaterial.transmission = material.transmission;
    nodeMaterial.thickness = material.thickness;
    nodeMaterial.ior = material.ior;

    if (material.clearcoatMap) {
      nodeMaterial.clearcoatMap = material.clearcoatMap;
    }
    if (material.clearcoatNormalMap) {
      nodeMaterial.clearcoatNormalMap = material.clearcoatNormalMap;
    }
    if (material.transmissionMap) {
      nodeMaterial.transmissionMap = material.transmissionMap;
    }
    if (material.thicknessMap) {
      nodeMaterial.thicknessMap = material.thicknessMap;
    }

    return nodeMaterial;
  }

  /**
   * 转换Lambert材质
   */
  private convertLambertMaterial(material: THREE.MeshLambertMaterial, NodeMaterialClass: any): any {
    const nodeMaterial = new NodeMaterialClass();

    nodeMaterial.color = material.color.clone();
    nodeMaterial.opacity = material.opacity;
    nodeMaterial.transparent = material.transparent;
    nodeMaterial.side = material.side;
    
    // Lambert材质转为标准材质时的近似设置
    nodeMaterial.roughness = 1.0; // Lambert是完全漫反射
    nodeMaterial.metalness = 0.0; // 非金属

    if (material.map) {
      nodeMaterial.map = material.map;
    }

    return nodeMaterial;
  }

  /**
   * 转换Phong材质
   */
  private convertPhongMaterial(material: THREE.MeshPhongMaterial, NodeMaterialClass: any): any {
    const nodeMaterial = new NodeMaterialClass();

    nodeMaterial.color = material.color.clone();
    nodeMaterial.opacity = material.opacity;
    nodeMaterial.transparent = material.transparent;
    nodeMaterial.side = material.side;

    // Phong材质转为PBR的近似转换
    const shininess = material.shininess || 30;
    nodeMaterial.roughness = Math.sqrt(2.0 / (shininess + 2.0));
    nodeMaterial.metalness = 0.0;

    // 镜面反射转换
    nodeMaterial.emissive = material.specular.clone().multiplyScalar(0.5);
    
    if (material.map) {
      nodeMaterial.map = material.map;
    }
    if (material.normalMap) {
      nodeMaterial.normalMap = material.normalMap;
    }

    return nodeMaterial;
  }

  /**
   * 通用转换到标准节点材质
   */
  private convertToStandardNodeMaterial(material: THREE.Material, NodeMaterialClass: any): any {
    const nodeMaterial = new NodeMaterialClass();

    // 复制基础属性
    nodeMaterial.opacity = material.opacity;
    nodeMaterial.transparent = material.transparent;
    nodeMaterial.side = material.side;
    nodeMaterial.visible = material.visible;

    // 尝试复制颜色属性
    if ('color' in material) {
      nodeMaterial.color = (material as any).color.clone();
    }

    // 尝试复制贴图
    if ('map' in material && (material as any).map) {
      nodeMaterial.map = (material as any).map;
    }

    return nodeMaterial;
  }

  /**
   * 材质优化
   */
  private optimizeMaterial(webgpuMaterial: any, originalMaterial: THREE.Material): any {
    switch (this.config.targetPerformance) {
      case 'speed':
        return this.optimizeForSpeed(webgpuMaterial);
      case 'quality':
        return this.optimizeForQuality(webgpuMaterial);
      case 'balanced':
      default:
        return this.optimizeBalanced(webgpuMaterial);
    }
  }

  /**
   * 速度优化
   */
  private optimizeForSpeed(material: any): any {
    // 降低着色器复杂度
    if (material.normalMap && material.normalScale) {
      material.normalScale.multiplyScalar(0.5); // 减少法线强度
    }
    
    // 简化环境反射
    if (material.envMapIntensity !== undefined) {
      material.envMapIntensity *= 0.7;
    }

    return material;
  }

  /**
   * 质量优化
   */
  private optimizeForQuality(material: any): any {
    // 增强细节表现
    if (material.normalScale) {
      material.normalScale.multiplyScalar(1.2);
    }
    
    // 增强环境反射
    if (material.envMapIntensity !== undefined) {
      material.envMapIntensity *= 1.2;
    }

    return material;
  }

  /**
   * 平衡优化
   */
  private optimizeBalanced(material: any): any {
    // 保持默认设置，但进行微调
    return material;
  }

  /**
   * 创建回退材质
   */
  private createFallbackMaterial(originalMaterial: THREE.Material): any {
    const { MeshBasicNodeMaterial } = THREEWebGPU;
    const fallback = new MeshBasicNodeMaterial();
    
    fallback.color = new THREE.Color(0x888888); // 灰色
    fallback.opacity = originalMaterial.opacity;
    fallback.transparent = originalMaterial.transparent;
    
    return fallback;
  }

  /**
   * 生成材质缓存键
   */
  private getMaterialCacheKey(material: THREE.Material): string {
    const props = {
      type: material.type,
      uuid: material.uuid,
      version: material.version
    };
    return JSON.stringify(props);
  }

  /**
   * 记录转换指标
   */
  private recordConversionMetrics(cacheKey: string, startTime: number, material: any): void {
    const conversionTime = performance.now() - startTime;
    
    const metrics: WebGPUMaterialMetrics = {
      conversionTime,
      memoryUsage: this.estimateMaterialMemory(material),
      shaderComplexity: this.calculateShaderComplexity(material),
      renderingCost: this.estimateRenderingCost(material)
    };

    this.conversionMetrics.set(cacheKey, metrics);
  }

  /**
   * 估算材质内存使用
   */
  private estimateMaterialMemory(material: any): number {
    let memory = 1024; // 基础内存

    // 贴图内存估算
    if (material.map) memory += 4096;
    if (material.normalMap) memory += 2048;
    if (material.roughnessMap) memory += 1024;
    if (material.metalnessMap) memory += 1024;
    if (material.aoMap) memory += 1024;

    return memory;
  }

  /**
   * 计算着色器复杂度
   */
  private calculateShaderComplexity(material: any): number {
    let complexity = 1;

    // 根据材质类型和特性计算复杂度
    if (material.normalMap) complexity += 2;
    if (material.envMap) complexity += 3;
    if (material.transmission) complexity += 4;
    if (material.clearcoat) complexity += 3;

    return complexity;
  }

  /**
   * 估算渲染成本
   */
  private estimateRenderingCost(material: any): number {
    const baseCost = 1.0;
    let multiplier = 1.0;

    if (material.transparent) multiplier *= 1.5;
    if (material.normalMap) multiplier *= 1.3;
    if (material.envMap) multiplier *= 1.4;
    if (material.transmission) multiplier *= 2.0;

    return baseCost * multiplier;
  }

  /**
   * 获取转换统计
   */
  public getConversionStats() {
    const stats = {
      totalConversions: this.conversionMetrics.size,
      cacheHitRate: this.materialCache.size / Math.max(this.conversionMetrics.size, 1),
      averageConversionTime: 0,
      totalMemoryUsage: 0,
      averageShaderComplexity: 0
    };

    let totalTime = 0;
    let totalMemory = 0;
    let totalComplexity = 0;

    for (const metrics of this.conversionMetrics.values()) {
      totalTime += metrics.conversionTime;
      totalMemory += metrics.memoryUsage;
      totalComplexity += metrics.shaderComplexity;
    }

    if (this.conversionMetrics.size > 0) {
      stats.averageConversionTime = totalTime / this.conversionMetrics.size;
      stats.totalMemoryUsage = totalMemory;
      stats.averageShaderComplexity = totalComplexity / this.conversionMetrics.size;
    }

    return stats;
  }

  /**
   * 清理缓存
   */
  public clearCache(): void {
    this.materialCache.clear();
    this.conversionMetrics.clear();
  }

  /**
   * 批量转换场景中的材质
   */
  public convertSceneMaterials(scene: THREE.Scene): void {
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material = object.material.map(mat => this.convertMaterial(mat));
        } else {
          object.material = this.convertMaterial(object.material);
        }
      }
    });

    console.log('🎨 场景材质转换完成:', this.getConversionStats());
  }
}

// 全局实例
export const webgpuMaterialAdapter = new WebGPUMaterialAdapter({
  enableOptimizations: true,
  targetPerformance: 'balanced',
  preserveOriginal: true
});