/**
 * 材质优化器
 * 提供高质量的Three.js材质渲染效果
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import * as THREE from 'three';

export interface MaterialConfig {
  // 基础材质属性
  color?: THREE.Color | string | number;
  roughness?: number;
  metalness?: number;
  transparent?: boolean;
  opacity?: number;
  
  // 高级材质属性
  envMapIntensity?: number;
  clearcoat?: number;
  clearcoatRoughness?: number;
  
  // 渲染优化
  flatShading?: boolean;
  vertexColors?: boolean;
  side?: THREE.Side;
  
  // 纹理属性
  map?: THREE.Texture;
  normalMap?: THREE.Texture;
  roughnessMap?: THREE.Texture;
  metalnessMap?: THREE.Texture;
  
  // 特殊效果
  emissive?: THREE.Color | string | number;
  emissiveIntensity?: number;
  
  // 性能优化
  optimizeForPerformance?: boolean;
  qualityLevel?: 'low' | 'medium' | 'high' | 'ultra';
}

export class MaterialOptimizer {
  private materialCache = new Map<string, THREE.Material>();
  private textureCache = new Map<string, THREE.Texture>();
  private envMap: THREE.CubeTexture | null = null;
  
  constructor() {
    this.initializeEnvironmentMap();
  }
  
  /**
   * 初始化环境贴图
   */
  private initializeEnvironmentMap(): void {
    // 创建程序化环境贴图
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    
    if (context) {
      // 创建渐变背景
      const gradient = context.createLinearGradient(0, 0, 0, size);
      gradient.addColorStop(0, '#87CEEB'); // 天蓝色
      gradient.addColorStop(0.5, '#E0F6FF'); // 浅蓝色
      gradient.addColorStop(1, '#F0F8FF'); // 爱丽丝蓝
      
      context.fillStyle = gradient;
      context.fillRect(0, 0, size, size);
      
      // 创建立方体贴图
      const texture = new THREE.CanvasTexture(canvas);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      
      // 转换为立方体贴图
      const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(size);
      this.envMap = cubeRenderTarget.texture;
    }
  }
  
  /**
   * 创建地质材质
   */
  createGeologyMaterial(config: MaterialConfig & { 
    geologicalType: 'soil' | 'rock' | 'water' | 'concrete' | 'steel' 
  }): THREE.Material {
    const cacheKey = `geology_${config.geologicalType}_${JSON.stringify(config)}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }
    
    let material: THREE.Material;
    
    switch (config.geologicalType) {
      case 'soil':
        material = this.createSoilMaterial(config);
        break;
      case 'rock':
        material = this.createRockMaterial(config);
        break;
      case 'water':
        material = this.createWaterMaterial(config);
        break;
      case 'concrete':
        material = this.createConcreteMaterial(config);
        break;
      case 'steel':
        material = this.createSteelMaterial(config);
        break;
      default:
        material = this.createBasicMaterial(config);
    }
    
    this.materialCache.set(cacheKey, material);
    return material;
  }
  
  /**
   * 创建土壤材质
   */
  private createSoilMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0x8B4513; // 土壤棕色
    
    if (config.optimizeForPerformance) {
      return new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: config.transparent || false,
        opacity: config.opacity || 1.0,
        vertexColors: config.vertexColors || false,
        side: config.side || THREE.FrontSide
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: config.roughness || 0.8,
      metalness: config.metalness || 0.0,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false,
      side: config.side || THREE.FrontSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 0.3
    });
  }
  
  /**
   * 创建岩石材质
   */
  private createRockMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0x696969; // 岩石灰色
    
    if (config.optimizeForPerformance) {
      return new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: config.transparent || false,
        opacity: config.opacity || 1.0,
        vertexColors: config.vertexColors || false,
        side: config.side || THREE.FrontSide
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: config.roughness || 0.9,
      metalness: config.metalness || 0.1,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false,
      side: config.side || THREE.FrontSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 0.2
    });
  }
  
  /**
   * 创建水体材质
   */
  private createWaterMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0x0077BE; // 水蓝色
    
    return new THREE.MeshPhysicalMaterial({
      color: baseColor,
      roughness: config.roughness || 0.1,
      metalness: config.metalness || 0.0,
      transparent: true,
      opacity: config.opacity || 0.7,
      vertexColors: config.vertexColors || false,
      side: THREE.DoubleSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 0.8,
      clearcoat: config.clearcoat || 0.5,
      clearcoatRoughness: config.clearcoatRoughness || 0.1
    });
  }
  
  /**
   * 创建混凝土材质
   */
  private createConcreteMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0xC0C0C0; // 混凝土灰色
    
    if (config.optimizeForPerformance) {
      return new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: config.transparent || false,
        opacity: config.opacity || 1.0,
        vertexColors: config.vertexColors || false,
        side: config.side || THREE.FrontSide
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: config.roughness || 0.7,
      metalness: config.metalness || 0.0,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false,
      side: config.side || THREE.FrontSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 0.4
    });
  }
  
  /**
   * 创建钢材材质
   */
  private createSteelMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0x4A4A4A; // 钢材灰色
    
    if (config.optimizeForPerformance) {
      return new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: config.transparent || false,
        opacity: config.opacity || 1.0,
        vertexColors: config.vertexColors || false,
        side: config.side || THREE.FrontSide
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: config.roughness || 0.3,
      metalness: config.metalness || 0.9,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false,
      side: config.side || THREE.FrontSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 1.0
    });
  }
  
  /**
   * 创建基础材质
   */
  private createBasicMaterial(config: MaterialConfig): THREE.Material {
    const baseColor = config.color || 0x808080;
    
    if (config.optimizeForPerformance) {
      return new THREE.MeshLambertMaterial({
        color: baseColor,
        transparent: config.transparent || false,
        opacity: config.opacity || 1.0,
        vertexColors: config.vertexColors || false,
        side: config.side || THREE.FrontSide
      });
    }
    
    return new THREE.MeshStandardMaterial({
      color: baseColor,
      roughness: config.roughness || 0.5,
      metalness: config.metalness || 0.0,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false,
      side: config.side || THREE.FrontSide,
      envMap: this.envMap,
      envMapIntensity: config.envMapIntensity || 0.5
    });
  }
  
  /**
   * 创建发光材质
   */
  createEmissiveMaterial(config: MaterialConfig & { 
    emissiveColor: THREE.Color | string | number;
    emissiveIntensity: number;
  }): THREE.Material {
    const cacheKey = `emissive_${JSON.stringify(config)}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }
    
    const material = new THREE.MeshStandardMaterial({
      color: config.color || 0x000000,
      emissive: config.emissiveColor,
      emissiveIntensity: config.emissiveIntensity,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      side: config.side || THREE.FrontSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
  }
  
  /**
   * 创建线框材质
   */
  createWireframeMaterial(config: MaterialConfig): THREE.Material {
    const cacheKey = `wireframe_${JSON.stringify(config)}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }
    
    const material = new THREE.MeshBasicMaterial({
      color: config.color || 0xffffff,
      wireframe: true,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      side: config.side || THREE.FrontSide
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
  }
  
  /**
   * 创建点材质
   */
  createPointMaterial(config: MaterialConfig & { 
    size?: number;
    sizeAttenuation?: boolean;
  }): THREE.Material {
    const cacheKey = `points_${JSON.stringify(config)}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }
    
    const material = new THREE.PointsMaterial({
      color: config.color || 0xffffff,
      size: config.size || 1.0,
      sizeAttenuation: config.sizeAttenuation !== false,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
  }
  
  /**
   * 创建线材质
   */
  createLineMaterial(config: MaterialConfig & { 
    linewidth?: number;
  }): THREE.Material {
    const cacheKey = `line_${JSON.stringify(config)}`;
    
    if (this.materialCache.has(cacheKey)) {
      return this.materialCache.get(cacheKey)!;
    }
    
    const material = new THREE.LineBasicMaterial({
      color: config.color || 0xffffff,
      linewidth: config.linewidth || 1,
      transparent: config.transparent || false,
      opacity: config.opacity || 1.0,
      vertexColors: config.vertexColors || false
    });
    
    this.materialCache.set(cacheKey, material);
    return material;
  }
  
  /**
   * 优化材质性能
   */
  optimizeMaterial(material: THREE.Material, qualityLevel: 'low' | 'medium' | 'high' | 'ultra'): THREE.Material {
    if (material instanceof THREE.MeshStandardMaterial) {
      switch (qualityLevel) {
        case 'low':
          // 转换为基础材质
          return new THREE.MeshBasicMaterial({
            color: material.color,
            map: material.map,
            transparent: material.transparent,
            opacity: material.opacity,
            side: material.side
          });
          
        case 'medium':
          // 转换为Lambert材质
          return new THREE.MeshLambertMaterial({
            color: material.color,
            map: material.map,
            transparent: material.transparent,
            opacity: material.opacity,
            side: material.side,
            emissive: material.emissive,
            emissiveIntensity: material.emissiveIntensity
          });
          
        case 'high':
          // 保持Standard材质但简化属性
          material.envMap = null;
          material.clearcoat = 0;
          material.clearcoatRoughness = 0;
          return material;
          
        case 'ultra':
          // 保持所有高质量属性
          return material;
      }
    }
    
    return material;
  }
  
  /**
   * 批量优化材质
   */
  optimizeSceneMaterials(scene: THREE.Scene, qualityLevel: 'low' | 'medium' | 'high' | 'ultra'): void {
    let optimizedCount = 0;
    
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.material) {
        if (Array.isArray(object.material)) {
          object.material = object.material.map(mat => this.optimizeMaterial(mat, qualityLevel));
        } else {
          object.material = this.optimizeMaterial(object.material, qualityLevel);
        }
        optimizedCount++;
      }
    });
    
    console.log(`🎨 材质优化完成: ${optimizedCount} 个对象, 质量级别: ${qualityLevel}`);
  }
  
  /**
   * 获取材质统计信息
   */
  getMaterialStats(): {
    cachedMaterials: number;
    cachedTextures: number;
    memoryUsage: number;
  } {
    return {
      cachedMaterials: this.materialCache.size,
      cachedTextures: this.textureCache.size,
      memoryUsage: this.estimateMemoryUsage()
    };
  }
  
  /**
   * 估算内存使用量
   */
  private estimateMemoryUsage(): number {
    let totalMemory = 0;
    
    // 估算材质内存
    totalMemory += this.materialCache.size * 1024; // 每个材质约1KB
    
    // 估算纹理内存
    this.textureCache.forEach(texture => {
      if (texture.image) {
        const width = texture.image.width || 512;
        const height = texture.image.height || 512;
        totalMemory += width * height * 4; // RGBA 4字节
      }
    });
    
    return totalMemory;
  }
  
  /**
   * 清理缓存
   */
  clearCache(): void {
    // 清理材质缓存
    this.materialCache.forEach(material => {
      material.dispose();
    });
    this.materialCache.clear();
    
    // 清理纹理缓存
    this.textureCache.forEach(texture => {
      texture.dispose();
    });
    this.textureCache.clear();
    
    // 清理环境贴图
    if (this.envMap) {
      this.envMap.dispose();
      this.envMap = null;
    }
    
    console.log('🧹 材质优化器缓存已清理');
  }
  
  /**
   * 预加载常用材质
   */
  preloadCommonMaterials(): void {
    const commonConfigs = [
      { geologicalType: 'soil' as const, color: 0x8B4513 },
      { geologicalType: 'rock' as const, color: 0x696969 },
      { geologicalType: 'water' as const, color: 0x0077BE },
      { geologicalType: 'concrete' as const, color: 0xC0C0C0 },
      { geologicalType: 'steel' as const, color: 0x4A4A4A }
    ];
    
    commonConfigs.forEach(config => {
      this.createGeologyMaterial(config);
    });
    
    console.log('🚀 常用材质预加载完成');
  }
}

// 全局材质优化器实例
export const globalMaterialOptimizer = new MaterialOptimizer();

// 预加载常用材质
globalMaterialOptimizer.preloadCommonMaterials(); 