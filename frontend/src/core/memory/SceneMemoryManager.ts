/**
 * Three.js场景内存管理器
 * DeepCAD Deep Excavation CAE Platform - Scene Memory Manager
 * 
 * 作者：2号几何专家
 * 功能：资源跟踪、内存优化、自动清理、性能监控
 */

import * as THREE from 'three';

// 内存使用统计接口
export interface MemoryStats {
  textures: {
    count: number;
    totalSize: number; // bytes
    unusedCount: number;
    largestSize: number;
  };
  geometries: {
    count: number;
    totalVertices: number;
    totalFaces: number;
    memoryUsage: number; // bytes
  };
  materials: {
    count: number;
    shaderPrograms: number;
    uniformsCount: number;
  };
  renderTargets: {
    count: number;
    totalPixels: number;
    memoryUsage: number; // bytes
  };
  total: {
    estimated: number; // 估算总内存使用量 (bytes)
    gpuMemory: number; // GPU内存使用量
    warnings: string[];
  };
}

// 内存优化配置
export interface MemoryOptimizationConfig {
  // 自动清理配置
  autoCleanup: {
    enabled: boolean;
    interval: number; // ms
    memoryThreshold: number; // MB，超过此值触发清理
  };
  
  // 纹理优化
  textureOptimization: {
    enableCompression: boolean;
    maxTextureSize: number;
    generateMipmaps: boolean;
    anisotropy: number;
  };
  
  // 几何体优化
  geometryOptimization: {
    enableVertexMerging: boolean;
    mergeTolerance: number;
    enableIndexing: boolean;
    removeUnusedVertices: boolean;
  };
  
  // LOD (细节层次) 配置
  lodConfig: {
    enabled: boolean;
    levels: number;
    distanceThresholds: number[];
    qualityReduction: number[];
  };
  
  // 缓存配置
  cacheConfig: {
    maxCachedObjects: number;
    cacheTimeout: number; // ms
    enableLRU: boolean; // 最近最少使用算法
  };
}

// 资源引用跟踪
interface ResourceReference {
  id: string;
  type: 'texture' | 'geometry' | 'material' | 'renderTarget';
  object: any;
  size: number; // bytes
  lastUsed: number; // timestamp
  references: number; // 引用计数
  canDispose: boolean;
}

// 默认内存优化配置
const DEFAULT_CONFIG: MemoryOptimizationConfig = {
  autoCleanup: {
    enabled: true,
    interval: 30000, // 30秒
    memoryThreshold: 512 // 512MB
  },
  textureOptimization: {
    enableCompression: true,
    maxTextureSize: 2048,
    generateMipmaps: true,
    anisotropy: 4
  },
  geometryOptimization: {
    enableVertexMerging: true,
    mergeTolerance: 0.001,
    enableIndexing: true,
    removeUnusedVertices: true
  },
  lodConfig: {
    enabled: true,
    levels: 4,
    distanceThresholds: [10, 50, 200, 1000],
    qualityReduction: [1.0, 0.8, 0.5, 0.2]
  },
  cacheConfig: {
    maxCachedObjects: 1000,
    cacheTimeout: 300000, // 5分钟
    enableLRU: true
  }
};

export class SceneMemoryManager {
  private scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer;
  private config: MemoryOptimizationConfig;
  
  // 资源跟踪
  private resourceRegistry = new Map<string, ResourceReference>();
  private disposeQueue = new Set<string>();
  
  // 自动清理定时器
  private cleanupTimer?: NodeJS.Timeout;
  
  // 性能监控
  private memoryHistory: number[] = [];
  private lastGCTime = 0;
  
  // 缓存管理
  private resourceCache = new Map<string, any>();
  private cacheAccessOrder: string[] = [];

  constructor(
    scene: THREE.Scene,
    renderer: THREE.WebGLRenderer,
    config: Partial<MemoryOptimizationConfig> = {}
  ) {
    this.scene = scene;
    this.renderer = renderer;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.initializeMemoryManagement();
  }

  /**
   * 初始化内存管理系统
   */
  private initializeMemoryManagement(): void {
    // 启动自动清理
    if (this.config.autoCleanup.enabled) {
      this.startAutoCleanup();
    }
    
    // 监听场景变化
    this.setupSceneListeners();
    
    // 扫描现有场景资源
    this.scanExistingResources();
    
    console.log('🧠 场景内存管理器已初始化');
  }

  /**
   * 启动自动清理机制
   */
  private startAutoCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.performAutoCleanup();
    }, this.config.autoCleanup.interval);
  }

  /**
   * 停止自动清理
   */
  private stopAutoCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * 设置场景监听器
   */
  private setupSceneListeners(): void {
    // 重写场景的add方法以跟踪新添加的对象
    const originalAdd = this.scene.add.bind(this.scene);
    this.scene.add = (...objects) => {
      objects.forEach(obj => this.trackObject(obj));
      return originalAdd(...objects);
    };

    // 重写场景的remove方法以清理资源
    const originalRemove = this.scene.remove.bind(this.scene);
    this.scene.remove = (...objects) => {
      objects.forEach(obj => this.untrackObject(obj));
      return originalRemove(...objects);
    };
  }

  /**
   * 扫描现有场景资源
   */
  private scanExistingResources(): void {
    this.scene.traverse((object) => {
      this.trackObject(object);
    });
  }

  /**
   * 跟踪对象及其资源
   */
  private trackObject(object: THREE.Object3D): void {
    // 跟踪几何体
    if (object instanceof THREE.Mesh && object.geometry) {
      this.trackGeometry(object.geometry);
    }
    
    // 跟踪材质
    if ('material' in object && object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => this.trackMaterial(material));
    }
    
    // 递归跟踪子对象
    object.children.forEach(child => this.trackObject(child));
  }

  /**
   * 取消跟踪对象
   */
  private untrackObject(object: THREE.Object3D): void {
    // 减少引用计数
    if (object instanceof THREE.Mesh && object.geometry) {
      this.untrackGeometry(object.geometry);
    }
    
    if ('material' in object && object.material) {
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach(material => this.untrackMaterial(material));
    }
    
    // 递归取消跟踪子对象
    object.children.forEach(child => this.untrackObject(child));
  }

  /**
   * 跟踪几何体
   */
  private trackGeometry(geometry: THREE.BufferGeometry): void {
    const id = this.getGeometryId(geometry);
    
    if (this.resourceRegistry.has(id)) {
      // 增加引用计数
      const ref = this.resourceRegistry.get(id)!;
      ref.references++;
      ref.lastUsed = Date.now();
    } else {
      // 新增几何体跟踪
      const size = this.calculateGeometrySize(geometry);
      this.resourceRegistry.set(id, {
        id,
        type: 'geometry',
        object: geometry,
        size,
        lastUsed: Date.now(),
        references: 1,
        canDispose: true
      });
    }
  }

  /**
   * 取消跟踪几何体
   */
  private untrackGeometry(geometry: THREE.BufferGeometry): void {
    const id = this.getGeometryId(geometry);
    const ref = this.resourceRegistry.get(id);
    
    if (ref) {
      ref.references--;
      if (ref.references <= 0) {
        this.disposeQueue.add(id);
      }
    }
  }

  /**
   * 跟踪材质
   */
  private trackMaterial(material: THREE.Material): void {
    const id = this.getMaterialId(material);
    
    if (this.resourceRegistry.has(id)) {
      const ref = this.resourceRegistry.get(id)!;
      ref.references++;
      ref.lastUsed = Date.now();
    } else {
      const size = this.calculateMaterialSize(material);
      this.resourceRegistry.set(id, {
        id,
        type: 'material',
        object: material,
        size,
        lastUsed: Date.now(),
        references: 1,
        canDispose: true
      });
      
      // 跟踪材质中的纹理
      this.trackMaterialTextures(material);
    }
  }

  /**
   * 取消跟踪材质
   */
  private untrackMaterial(material: THREE.Material): void {
    const id = this.getMaterialId(material);
    const ref = this.resourceRegistry.get(id);
    
    if (ref) {
      ref.references--;
      if (ref.references <= 0) {
        this.disposeQueue.add(id);
        this.untrackMaterialTextures(material);
      }
    }
  }

  /**
   * 跟踪材质中的纹理
   */
  private trackMaterialTextures(material: THREE.Material): void {
    const textures: THREE.Texture[] = [];
    
    // 提取材质中的所有纹理
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        textures.push(value);
      }
    });
    
    textures.forEach(texture => this.trackTexture(texture));
  }

  /**
   * 取消跟踪材质中的纹理
   */
  private untrackMaterialTextures(material: THREE.Material): void {
    const textures: THREE.Texture[] = [];
    
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        textures.push(value);
      }
    });
    
    textures.forEach(texture => this.untrackTexture(texture));
  }

  /**
   * 跟踪纹理
   */
  private trackTexture(texture: THREE.Texture): void {
    const id = this.getTextureId(texture);
    
    if (this.resourceRegistry.has(id)) {
      const ref = this.resourceRegistry.get(id)!;
      ref.references++;
      ref.lastUsed = Date.now();
    } else {
      const size = this.calculateTextureSize(texture);
      this.resourceRegistry.set(id, {
        id,
        type: 'texture',
        object: texture,
        size,
        lastUsed: Date.now(),
        references: 1,
        canDispose: true
      });
    }
  }

  /**
   * 取消跟踪纹理
   */
  private untrackTexture(texture: THREE.Texture): void {
    const id = this.getTextureId(texture);
    const ref = this.resourceRegistry.get(id);
    
    if (ref) {
      ref.references--;
      if (ref.references <= 0) {
        this.disposeQueue.add(id);
      }
    }
  }

  /**
   * 执行自动清理
   */
  private performAutoCleanup(): void {
    const memoryStats = this.getMemoryStats();
    const memoryUsageMB = memoryStats.total.estimated / (1024 * 1024);
    
    if (memoryUsageMB > this.config.autoCleanup.memoryThreshold) {
      console.log(`🧹 内存使用量 ${memoryUsageMB.toFixed(1)}MB，开始自动清理`);
      
      // 清理未使用的资源
      this.cleanupUnusedResources();
      
      // 优化纹理
      this.optimizeTextures();
      
      // 清理缓存
      this.cleanupCache();
      
      // 强制垃圾回收
      this.forceGarbageCollection();
      
      const newStats = this.getMemoryStats();
      const newMemoryUsageMB = newStats.total.estimated / (1024 * 1024);
      
      console.log(`✅ 清理完成，内存使用量：${newMemoryUsageMB.toFixed(1)}MB`);
    }
  }

  /**
   * 清理未使用的资源
   */
  public cleanupUnusedResources(): number {
    let cleanedCount = 0;
    const currentTime = Date.now();
    const timeout = this.config.cacheConfig.cacheTimeout;
    
    // 处理待释放队列
    this.disposeQueue.forEach(id => {
      const ref = this.resourceRegistry.get(id);
      if (ref && ref.references <= 0) {
        this.disposeResource(ref);
        this.resourceRegistry.delete(id);
        cleanedCount++;
      }
    });
    this.disposeQueue.clear();
    
    // 清理长时间未使用的资源
    for (const [id, ref] of this.resourceRegistry.entries()) {
      if (ref.canDispose && (currentTime - ref.lastUsed) > timeout) {
        this.disposeResource(ref);
        this.resourceRegistry.delete(id);
        cleanedCount++;
      }
    }
    
    return cleanedCount;
  }

  /**
   * 释放资源
   */
  private disposeResource(ref: ResourceReference): void {
    try {
      if (ref.object && typeof ref.object.dispose === 'function') {
        ref.object.dispose();
      }
    } catch (error) {
      console.warn(`清理资源时出错 (${ref.id}):`, error);
    }
  }

  /**
   * 优化纹理
   */
  private optimizeTextures(): void {
    if (!this.config.textureOptimization.enableCompression) return;
    
    for (const [id, ref] of this.resourceRegistry.entries()) {
      if (ref.type === 'texture') {
        const texture = ref.object as THREE.Texture;
        this.optimizeTexture(texture);
      }
    }
  }

  /**
   * 优化单个纹理
   */
  private optimizeTexture(texture: THREE.Texture): void {
    const config = this.config.textureOptimization;
    
    // 限制纹理尺寸
    if (texture.image && texture.image.width > config.maxTextureSize) {
      // 这里可以实现纹理尺寸压缩逻辑
      console.log(`📏 纹理尺寸超限：${texture.image.width}x${texture.image.height}`);
    }
    
    // 设置各向异性过滤
    texture.anisotropy = Math.min(config.anisotropy, this.renderer.capabilities.getMaxAnisotropy());
    
    // 生成mipmap
    texture.generateMipmaps = config.generateMipmaps;
  }

  /**
   * 清理缓存
   */
  private cleanupCache(): void {
    const maxSize = this.config.cacheConfig.maxCachedObjects;
    
    if (this.resourceCache.size > maxSize) {
      // LRU算法清理缓存
      const itemsToRemove = this.resourceCache.size - maxSize;
      
      for (let i = 0; i < itemsToRemove; i++) {
        const oldestKey = this.cacheAccessOrder.shift();
        if (oldestKey) {
          this.resourceCache.delete(oldestKey);
        }
      }
    }
  }

  /**
   * 强制垃圾回收
   */
  private forceGarbageCollection(): void {
    // 通知渲染器清理GPU资源
    this.renderer.renderLists.dispose();
    
    // 记录GC时间
    this.lastGCTime = Date.now();
    
    // 建议浏览器进行垃圾回收（如果支持）
    if ((window as any).gc) {
      (window as any).gc();
    }
  }

  /**
   * 获取内存使用统计
   */
  public getMemoryStats(): MemoryStats {
    const stats: MemoryStats = {
      textures: { count: 0, totalSize: 0, unusedCount: 0, largestSize: 0 },
      geometries: { count: 0, totalVertices: 0, totalFaces: 0, memoryUsage: 0 },
      materials: { count: 0, shaderPrograms: 0, uniformsCount: 0 },
      renderTargets: { count: 0, totalPixels: 0, memoryUsage: 0 },
      total: { estimated: 0, gpuMemory: 0, warnings: [] }
    };
    
    // 统计各类资源
    for (const ref of this.resourceRegistry.values()) {
      switch (ref.type) {
        case 'texture':
          stats.textures.count++;
          stats.textures.totalSize += ref.size;
          if (ref.references === 0) stats.textures.unusedCount++;
          if (ref.size > stats.textures.largestSize) {
            stats.textures.largestSize = ref.size;
          }
          break;
          
        case 'geometry':
          stats.geometries.count++;
          stats.geometries.memoryUsage += ref.size;
          // 计算顶点和面数
          const geometry = ref.object as THREE.BufferGeometry;
          if (geometry.attributes.position) {
            stats.geometries.totalVertices += geometry.attributes.position.count;
          }
          if (geometry.index) {
            stats.geometries.totalFaces += geometry.index.count / 3;
          }
          break;
          
        case 'material':
          stats.materials.count++;
          break;
          
        case 'renderTarget':
          stats.renderTargets.count++;
          stats.renderTargets.memoryUsage += ref.size;
          break;
      }
    }
    
    // 计算总内存使用量
    stats.total.estimated = 
      stats.textures.totalSize + 
      stats.geometries.memoryUsage + 
      stats.renderTargets.memoryUsage;
    
    // 获取GPU内存信息（如果可用）
    const gl = this.renderer.getContext();
    const memoryInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (memoryInfo) {
      // 这是估算值，实际GPU内存使用可能不同
      stats.total.gpuMemory = stats.total.estimated;
    }
    
    // 生成警告
    if (stats.textures.unusedCount > 10) {
      stats.total.warnings.push(`发现${stats.textures.unusedCount}个未使用的纹理`);
    }
    
    if (stats.total.estimated > 500 * 1024 * 1024) { // 500MB
      stats.total.warnings.push('内存使用量较高，建议进行清理');
    }
    
    return stats;
  }

  /**
   * 优化几何体
   */
  public optimizeGeometry(geometry: THREE.BufferGeometry): THREE.BufferGeometry {
    const config = this.config.geometryOptimization;
    let optimizedGeometry = geometry.clone();
    
    // 移除未使用的顶点
    if (config.removeUnusedVertices) {
      // 这里可以实现顶点清理逻辑
    }
    
    // 启用索引
    if (config.enableIndexing && !optimizedGeometry.index) {
      // 这里可以实现几何体索引化
    }
    
    // 合并重复顶点
    if (config.enableVertexMerging) {
      optimizedGeometry = this.mergeVertices(optimizedGeometry, config.mergeTolerance);
    }
    
    return optimizedGeometry;
  }

  /**
   * 合并重复顶点
   */
  private mergeVertices(geometry: THREE.BufferGeometry, tolerance: number): THREE.BufferGeometry {
    // 简化的顶点合并实现
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return geometry;
    
    const positions = positionAttribute.array;
    const vertexMap = new Map<string, number>();
    const uniqueVertices: number[] = [];
    const indexMap: number[] = [];
    
    for (let i = 0; i < positions.length; i += 3) {
      const x = Math.round(positions[i] / tolerance) * tolerance;
      const y = Math.round(positions[i + 1] / tolerance) * tolerance;
      const z = Math.round(positions[i + 2] / tolerance) * tolerance;
      
      const key = `${x},${y},${z}`;
      
      if (vertexMap.has(key)) {
        indexMap.push(vertexMap.get(key)!);
      } else {
        const newIndex = uniqueVertices.length / 3;
        vertexMap.set(key, newIndex);
        indexMap.push(newIndex);
        uniqueVertices.push(x, y, z);
      }
    }
    
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(uniqueVertices, 3));
    
    if (geometry.index) {
      const oldIndices = geometry.index.array;
      const newIndices = [];
      
      for (let i = 0; i < oldIndices.length; i++) {
        newIndices.push(indexMap[oldIndices[i]]);
      }
      
      newGeometry.setIndex(newIndices);
    }
    
    return newGeometry;
  }

  /**
   * 设置LOD (细节层次)
   */
  public setupLOD(
    object: THREE.Object3D, 
    distances: number[] = this.config.lodConfig.distanceThresholds
  ): THREE.LOD {
    const lod = new THREE.LOD();
    
    for (let i = 0; i < distances.length; i++) {
      const quality = this.config.lodConfig.qualityReduction[i] || 1.0;
      const lodObject = this.createLODLevel(object, quality);
      lod.addLevel(lodObject, distances[i]);
    }
    
    return lod;
  }

  /**
   * 创建LOD级别
   */
  private createLODLevel(object: THREE.Object3D, quality: number): THREE.Object3D {
    const lodObject = object.clone();
    
    // 根据质量等级调整几何体复杂度
    lodObject.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) {
        if (quality < 1.0) {
          // 简化几何体
          child.geometry = this.simplifyGeometry(child.geometry, quality);
        }
      }
    });
    
    return lodObject;
  }

  /**
   * 简化几何体
   */
  private simplifyGeometry(geometry: THREE.BufferGeometry, quality: number): THREE.BufferGeometry {
    // 这里可以实现更复杂的几何体简化算法
    // 目前只是一个简单的采样实现
    
    if (quality >= 1.0) return geometry;
    
    const positionAttribute = geometry.getAttribute('position');
    if (!positionAttribute) return geometry;
    
    const originalCount = positionAttribute.count;
    const targetCount = Math.floor(originalCount * quality);
    const step = Math.max(1, Math.floor(originalCount / targetCount));
    
    const newPositions = [];
    for (let i = 0; i < originalCount; i += step) {
      newPositions.push(
        positionAttribute.getX(i),
        positionAttribute.getY(i),
        positionAttribute.getZ(i)
      );
    }
    
    const newGeometry = new THREE.BufferGeometry();
    newGeometry.setAttribute('position', new THREE.Float32BufferAttribute(newPositions, 3));
    
    return newGeometry;
  }

  // 辅助方法

  private getGeometryId(geometry: THREE.BufferGeometry): string {
    return `geo_${geometry.uuid}`;
  }

  private getMaterialId(material: THREE.Material): string {
    return `mat_${material.uuid}`;
  }

  private getTextureId(texture: THREE.Texture): string {
    return `tex_${texture.uuid}`;
  }

  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    
    // 计算属性数据大小
    Object.values(geometry.attributes).forEach(attribute => {
      size += attribute.array.byteLength;
    });
    
    // 计算索引数据大小
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    
    return size;
  }

  private calculateMaterialSize(material: THREE.Material): number {
    // 估算材质内存使用量（主要是uniform数据）
    return 1024; // 1KB估算值
  }

  private calculateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0;
    
    const width = texture.image.width || 0;
    const height = texture.image.height || 0;
    const bytesPerPixel = 4; // RGBA
    
    let size = width * height * bytesPerPixel;
    
    // 如果有mipmap，增加33%
    if (texture.generateMipmaps) {
      size *= 1.33;
    }
    
    return size;
  }

  /**
   * 销毁内存管理器
   */
  public dispose(): void {
    this.stopAutoCleanup();
    
    // 清理所有跟踪的资源
    for (const ref of this.resourceRegistry.values()) {
      this.disposeResource(ref);
    }
    
    this.resourceRegistry.clear();
    this.disposeQueue.clear();
    this.resourceCache.clear();
    this.cacheAccessOrder = [];
    
    console.log('🧠 场景内存管理器已销毁');
  }
}