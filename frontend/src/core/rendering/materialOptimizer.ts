import * as THREE from 'three';

// 定义标准地质材质的参数接口
interface GeoMaterialParameters extends THREE.MeshStandardMaterialParameters {
  // 可以添加未来可能需要的地质特定参数
}

/**
 * MaterialOptimizer 负责创建、缓存和管理场景中的材质，
 * 特别是针对常见的地质和工程材料，以提高性能和保证视觉一致性。
 */
export class MaterialOptimizer {
  private static materialCache = new Map<string, THREE.MeshStandardMaterial>();

  /**
   * 基于给定的参数创建或从缓存中检索一个 MeshStandardMaterial。
   * @param params - 材质的参数。
   * @param cacheKey - 用于缓存的唯一键。如果未提供，将基于参数自动生成。
   * @returns 一个 THREE.MeshStandardMaterial 实例。
   */
  private static getOrCreateMaterial(
    params: GeoMaterialParameters,
    cacheKey?: string
  ): THREE.MeshStandardMaterial {
    const key = cacheKey || JSON.stringify(params);
    if (this.materialCache.has(key)) {
      return this.materialCache.get(key)!;
    }

    const material = new THREE.MeshStandardMaterial(params);
    this.materialCache.set(key, material);
    return material;
  }

  // --- 公共静态方法，用于创建特定类型的地质材质 ---

  public static createSoilMaterial(
    params?: Partial<GeoMaterialParameters>
  ): THREE.MeshStandardMaterial {
    const defaultParams: GeoMaterialParameters = {
      color: 0x8B4513, // 棕色
      roughness: 0.9,
      metalness: 0.0,
      ...params,
    };
    return this.getOrCreateMaterial(defaultParams, `soil-${JSON.stringify(params)}`);
  }

  public static createRockMaterial(
    params?: Partial<GeoMaterialParameters>
  ): THREE.MeshStandardMaterial {
    const defaultParams: GeoMaterialParameters = {
      color: 0x808080, // 灰色
      roughness: 0.8,
      metalness: 0.1,
      ...params,
    };
    return this.getOrCreateMaterial(defaultParams, `rock-${JSON.stringify(params)}`);
  }

  public static createConcreteMaterial(
    params?: Partial<GeoMaterialParameters>
  ): THREE.MeshStandardMaterial {
    const defaultParams: GeoMaterialParameters = {
      color: 0xA9A9A9, // 暗灰色
      roughness: 0.7,
      metalness: 0.05,
      ...params,
    };
    return this.getOrCreateMaterial(defaultParams, `concrete-${JSON.stringify(params)}`);
  }

  public static createSteelMaterial(
    params?: Partial<GeoMaterialParameters>
  ): THREE.MeshStandardMaterial {
    const defaultParams: GeoMaterialParameters = {
      color: 0x555555, // 深灰色
      roughness: 0.3,
      metalness: 0.9,
      ...params,
    };
    return this.getOrCreateMaterial(defaultParams, `steel-${JSON.stringify(params)}`);
  }
  
  public static createWaterMaterial(
    params?: Partial<GeoMaterialParameters>
  ): THREE.MeshStandardMaterial {
    const defaultParams: GeoMaterialParameters = {
      color: 0x1E90FF, // 道奇蓝
      roughness: 0.1,
      metalness: 0.2,
      transparent: true,
      opacity: 0.7,
      ...params,
    };
    return this.getOrCreateMaterial(defaultParams, `water-${JSON.stringify(params)}`);
  }

  /**
   * 清理材质缓存。在场景切换或销毁时调用。
   */
  public static clearCache(): void {
    this.materialCache.forEach(material => material.dispose());
    this.materialCache.clear();
    console.log('MaterialOptimizer cache cleared.');
  }

  /**
   * 获取当前缓存的统计信息。
   * @returns 缓存中的材质数量。
   */
  public static getCacheStats(): { count: number } {
    return { count: this.materialCache.size };
  }
} 