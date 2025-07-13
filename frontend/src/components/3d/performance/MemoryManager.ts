import * as THREE from 'three';

export interface MemoryResource {
  id: string;
  type: 'geometry' | 'texture' | 'material' | 'render_target';
  name: string;
  size: number;
  lastUsed: number;
  usageCount: number;
  priority: 'high' | 'medium' | 'low';
  persistent: boolean;
  resource: THREE.BufferGeometry | THREE.Texture | THREE.Material | THREE.WebGLRenderTarget;
}

export interface MemoryPool {
  geometries: Map<string, MemoryResource>;
  textures: Map<string, MemoryResource>;
  materials: Map<string, MemoryResource>;
  renderTargets: Map<string, MemoryResource>;
}

export interface MemoryStats {
  totalMemory: number;
  usedMemory: number;
  availableMemory: number;
  geometryMemory: number;
  textureMemory: number;
  materialMemory: number;
  renderTargetMemory: number;
  resourceCounts: {
    geometries: number;
    textures: number;
    materials: number;
    renderTargets: number;
  };
  poolHitRate: number;
  gcCount: number;
}

export interface MemorySettings {
  maxMemoryMB: number;
  gcThresholdPercent: number;
  cleanupInterval: number;
  enableResourcePooling: boolean;
  maxPoolSize: number;
  compressTextures: boolean;
  enableTextureStreaming: boolean;
  generateMipmaps: boolean;
}

/**
 * 内存管理器
 * 管理Three.js资源的内存使用，包括几何体、纹理、材质等
 */
export class MemoryManager {
  private settings: MemorySettings;
  private memoryPool: MemoryPool;
  private stats: MemoryStats;
  
  // 性能监控
  private cleanupTimer: number = 0;
  private gcCount: number = 0;
  private poolHits: number = 0;
  private poolMisses: number = 0;
  
  // 资源追踪
  private resourceTracker: Map<any, MemoryResource> = new Map();
  private disposedResources: Set<string> = new Set();
  
  // WebGL信息
  private webglInfo?: THREE.WebGLInfo;

  constructor(settings: Partial<MemorySettings> = {}) {
    this.settings = {
      maxMemoryMB: 1024, // 1GB
      gcThresholdPercent: 80,
      cleanupInterval: 5000, // 5秒
      enableResourcePooling: true,
      maxPoolSize: 100,
      compressTextures: true,
      enableTextureStreaming: false,
      generateMipmaps: true,
      ...settings
    };

    this.memoryPool = {
      geometries: new Map(),
      textures: new Map(),
      materials: new Map(),
      renderTargets: new Map()
    };

    this.stats = {
      totalMemory: this.settings.maxMemoryMB * 1024 * 1024,
      usedMemory: 0,
      availableMemory: this.settings.maxMemoryMB * 1024 * 1024,
      geometryMemory: 0,
      textureMemory: 0,
      materialMemory: 0,
      renderTargetMemory: 0,
      resourceCounts: {
        geometries: 0,
        textures: 0,
        materials: 0,
        renderTargets: 0
      },
      poolHitRate: 0,
      gcCount: 0
    };
  }

  /**
   * 设置WebGL信息
   */
  public setWebGLInfo(info: THREE.WebGLInfo): void {
    this.webglInfo = info;
  }

  /**
   * 注册几何体
   */
  public registerGeometry(
    geometry: THREE.BufferGeometry,
    options: {
      name?: string;
      priority?: 'high' | 'medium' | 'low';
      persistent?: boolean;
    } = {}
  ): string {
    const id = this.generateId('geo');
    const size = this.calculateGeometrySize(geometry);
    
    const resource: MemoryResource = {
      id,
      type: 'geometry',
      name: options.name || `Geometry_${id}`,
      size,
      lastUsed: Date.now(),
      usageCount: 1,
      priority: options.priority || 'medium',
      persistent: options.persistent || false,
      resource: geometry
    };

    this.memoryPool.geometries.set(id, resource);
    this.resourceTracker.set(geometry, resource);
    this.updateStats();

    console.log(`📦 几何体已注册: ${resource.name} (${this.formatSize(size)})`);
    return id;
  }

  /**
   * 注册纹理
   */
  public registerTexture(
    texture: THREE.Texture,
    options: {
      name?: string;
      priority?: 'high' | 'medium' | 'low';
      persistent?: boolean;
      compress?: boolean;
    } = {}
  ): string {
    const id = this.generateId('tex');
    
    // 可选的纹理压缩
    if (options.compress && this.settings.compressTextures) {
      this.compressTexture(texture);
    }
    
    const size = this.calculateTextureSize(texture);
    
    const resource: MemoryResource = {
      id,
      type: 'texture',
      name: options.name || `Texture_${id}`,
      size,
      lastUsed: Date.now(),
      usageCount: 1,
      priority: options.priority || 'medium',
      persistent: options.persistent || false,
      resource: texture
    };

    this.memoryPool.textures.set(id, resource);
    this.resourceTracker.set(texture, resource);
    this.updateStats();

    console.log(`🖼️ 纹理已注册: ${resource.name} (${this.formatSize(size)})`);
    return id;
  }

  /**
   * 注册材质
   */
  public registerMaterial(
    material: THREE.Material,
    options: {
      name?: string;
      priority?: 'high' | 'medium' | 'low';
      persistent?: boolean;
    } = {}
  ): string {
    const id = this.generateId('mat');
    const size = this.calculateMaterialSize(material);
    
    const resource: MemoryResource = {
      id,
      type: 'material',
      name: options.name || `Material_${id}`,
      size,
      lastUsed: Date.now(),
      usageCount: 1,
      priority: options.priority || 'medium',
      persistent: options.persistent || false,
      resource: material
    };

    this.memoryPool.materials.set(id, resource);
    this.resourceTracker.set(material, resource);
    this.updateStats();

    console.log(`🎨 材质已注册: ${resource.name} (${this.formatSize(size)})`);
    return id;
  }

  /**
   * 获取资源
   */
  public getResource<T extends THREE.BufferGeometry | THREE.Texture | THREE.Material>(
    id: string
  ): T | null {
    const pools = [
      this.memoryPool.geometries,
      this.memoryPool.textures,
      this.memoryPool.materials,
      this.memoryPool.renderTargets
    ];

    for (const pool of pools) {
      const resource = pool.get(id);
      if (resource) {
        resource.lastUsed = Date.now();
        resource.usageCount++;
        this.poolHits++;
        return resource.resource as T;
      }
    }

    this.poolMisses++;
    return null;
  }

  /**
   * 克隆几何体（带缓存）
   */
  public cloneGeometry(sourceId: string, newName?: string): THREE.BufferGeometry | null {
    const resource = this.memoryPool.geometries.get(sourceId);
    if (!resource) return null;

    const cloned = resource.resource.clone();
    const clonedId = this.registerGeometry(cloned, {
      name: newName || `${resource.name}_clone`,
      priority: resource.priority
    });

    return cloned;
  }

  /**
   * 创建共享几何体
   */
  public createSharedGeometry(
    type: 'box' | 'sphere' | 'plane' | 'cylinder',
    parameters: any,
    name?: string
  ): { geometry: THREE.BufferGeometry; id: string } {
    // 生成几何体键值用于查找已存在的几何体
    const key = `${type}_${JSON.stringify(parameters)}`;
    
    // 查找是否已有相同参数的几何体
    for (const [id, resource] of this.memoryPool.geometries) {
      if (resource.name.startsWith(key)) {
        resource.usageCount++;
        resource.lastUsed = Date.now();
        this.poolHits++;
        return { geometry: resource.resource as THREE.BufferGeometry, id };
      }
    }

    // 创建新几何体
    let geometry: THREE.BufferGeometry;
    switch (type) {
      case 'box':
        geometry = new THREE.BoxGeometry(...parameters);
        break;
      case 'sphere':
        geometry = new THREE.SphereGeometry(...parameters);
        break;
      case 'plane':
        geometry = new THREE.PlaneGeometry(...parameters);
        break;
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(...parameters);
        break;
      default:
        throw new Error(`不支持的几何体类型: ${type}`);
    }

    const id = this.registerGeometry(geometry, {
      name: name || key,
      priority: 'medium'
    });

    this.poolMisses++;
    return { geometry, id };
  }

  /**
   * 计算几何体大小
   */
  private calculateGeometrySize(geometry: THREE.BufferGeometry): number {
    let size = 0;
    
    // 计算属性数据大小
    Object.values(geometry.attributes).forEach(attribute => {
      if (attribute && attribute.array) {
        size += attribute.array.byteLength;
      }
    });
    
    // 计算索引数据大小
    if (geometry.index) {
      size += geometry.index.array.byteLength;
    }
    
    return size;
  }

  /**
   * 计算纹理大小
   */
  private calculateTextureSize(texture: THREE.Texture): number {
    if (!texture.image) return 0;
    
    const width = texture.image.width || 0;
    const height = texture.image.height || 0;
    
    // 估算像素大小（考虑格式）
    let bytesPerPixel = 4; // RGBA
    
    if (texture.format === THREE.RGBFormat) {
      bytesPerPixel = 3;
    } else if (texture.format === THREE.LuminanceFormat) {
      bytesPerPixel = 1;
    } else if (texture.format === THREE.LuminanceAlphaFormat) {
      bytesPerPixel = 2;
    }
    
    // 考虑mipmap
    let size = width * height * bytesPerPixel;
    if (texture.generateMipmaps) {
      size *= 1.33; // mipmap大约增加33%的内存
    }
    
    return size;
  }

  /**
   * 计算材质大小
   */
  private calculateMaterialSize(material: THREE.Material): number {
    // 材质本身占用的内存相对较小，主要是其引用的纹理
    let size = 1024; // 基础材质大小估算
    
    // 遍历材质属性中的纹理
    Object.values(material).forEach(value => {
      if (value instanceof THREE.Texture) {
        const textureResource = this.resourceTracker.get(value);
        if (textureResource) {
          size += textureResource.size;
        } else {
          size += this.calculateTextureSize(value);
        }
      }
    });
    
    return size;
  }

  /**
   * 压缩纹理
   */
  private compressTexture(texture: THREE.Texture): void {
    // 这里可以实现纹理压缩逻辑
    // 例如：减少位深度、缩小尺寸等
    if (texture.image && texture.image.width > 1024) {
      // 可以在这里添加纹理缩放逻辑
      console.log('🗜️ 大纹理检测，建议考虑压缩');
    }
  }

  /**
   * 垃圾回收
   */
  public garbageCollect(force: boolean = false): void {
    const usagePercent = (this.stats.usedMemory / this.stats.totalMemory) * 100;
    
    if (!force && usagePercent < this.settings.gcThresholdPercent) {
      return;
    }

    console.log('🗑️ 开始内存垃圾回收...');
    const beforeMemory = this.stats.usedMemory;
    let releasedMemory = 0;

    const pools = [
      this.memoryPool.geometries,
      this.memoryPool.textures,
      this.memoryPool.materials,
      this.memoryPool.renderTargets
    ];

    pools.forEach(pool => {
      const resourcesToRemove: string[] = [];
      const now = Date.now();

      pool.forEach((resource, id) => {
        // 不清理持久资源
        if (resource.persistent) return;
        
        // 不清理高优先级资源
        if (resource.priority === 'high') return;
        
        // 清理长时间未使用的资源
        const unusedTime = now - resource.lastUsed;
        const threshold = resource.priority === 'low' ? 30000 : 60000; // 30秒或60秒
        
        if (unusedTime > threshold && resource.usageCount < 5) {
          resourcesToRemove.push(id);
          releasedMemory += resource.size;
        }
      });

      // 移除资源
      resourcesToRemove.forEach(id => {
        const resource = pool.get(id);
        if (resource) {
          this.disposeResource(resource);
          pool.delete(id);
          this.resourceTracker.delete(resource.resource);
          this.disposedResources.add(id);
        }
      });
    });

    this.updateStats();
    this.gcCount++;

    console.log(`✅ 垃圾回收完成: 释放 ${this.formatSize(releasedMemory)} 内存`);
  }

  /**
   * 释放资源
   */
  private disposeResource(resource: MemoryResource): void {
    try {
      if (resource.resource && typeof resource.resource.dispose === 'function') {
        resource.resource.dispose();
      }
    } catch (error) {
      console.warn(`资源释放失败: ${resource.name}`, error);
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    let usedMemory = 0;
    let geometryMemory = 0;
    let textureMemory = 0;
    let materialMemory = 0;
    let renderTargetMemory = 0;

    // 计算各类型资源占用的内存
    this.memoryPool.geometries.forEach(resource => {
      geometryMemory += resource.size;
    });
    
    this.memoryPool.textures.forEach(resource => {
      textureMemory += resource.size;
    });
    
    this.memoryPool.materials.forEach(resource => {
      materialMemory += resource.size;
    });
    
    this.memoryPool.renderTargets.forEach(resource => {
      renderTargetMemory += resource.size;
    });

    usedMemory = geometryMemory + textureMemory + materialMemory + renderTargetMemory;

    this.stats = {
      ...this.stats,
      usedMemory,
      availableMemory: this.stats.totalMemory - usedMemory,
      geometryMemory,
      textureMemory,
      materialMemory,
      renderTargetMemory,
      resourceCounts: {
        geometries: this.memoryPool.geometries.size,
        textures: this.memoryPool.textures.size,
        materials: this.memoryPool.materials.size,
        renderTargets: this.memoryPool.renderTargets.size
      },
      poolHitRate: this.poolHits + this.poolMisses > 0 
        ? (this.poolHits / (this.poolHits + this.poolMisses)) * 100 
        : 0,
      gcCount: this.gcCount
    };
  }

  /**
   * 更新内存管理器
   */
  public update(deltaTime: number): void {
    this.cleanupTimer += deltaTime;
    
    if (this.cleanupTimer >= this.settings.cleanupInterval) {
      this.cleanupTimer = 0;
      this.garbageCollect();
    }

    // 更新WebGL内存统计
    if (this.webglInfo) {
      // 这里可以添加WebGL内存监控逻辑
    }
  }

  /**
   * 获取内存统计
   */
  public getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  /**
   * 获取内存使用报告
   */
  public getMemoryReport(): {
    summary: string;
    details: {
      type: string;
      count: number;
      memory: string;
      percentage: number;
    }[];
    recommendations: string[];
  } {
    const stats = this.getStats();
    const usagePercent = (stats.usedMemory / stats.totalMemory) * 100;
    
    const details = [
      {
        type: '几何体',
        count: stats.resourceCounts.geometries,
        memory: this.formatSize(stats.geometryMemory),
        percentage: (stats.geometryMemory / stats.usedMemory) * 100
      },
      {
        type: '纹理',
        count: stats.resourceCounts.textures,
        memory: this.formatSize(stats.textureMemory),
        percentage: (stats.textureMemory / stats.usedMemory) * 100
      },
      {
        type: '材质',
        count: stats.resourceCounts.materials,
        memory: this.formatSize(stats.materialMemory),
        percentage: (stats.materialMemory / stats.usedMemory) * 100
      },
      {
        type: '渲染目标',
        count: stats.resourceCounts.renderTargets,
        memory: this.formatSize(stats.renderTargetMemory),
        percentage: (stats.renderTargetMemory / stats.usedMemory) * 100
      }
    ];

    const recommendations: string[] = [];
    
    if (usagePercent > 80) {
      recommendations.push('内存使用率过高，建议清理未使用的资源');
    }
    
    if (stats.textureMemory > stats.usedMemory * 0.6) {
      recommendations.push('纹理占用内存过多，建议使用纹理压缩或降低分辨率');
    }
    
    if (stats.poolHitRate < 50) {
      recommendations.push('资源池命中率较低，建议优化资源复用策略');
    }

    return {
      summary: `内存使用: ${this.formatSize(stats.usedMemory)} / ${this.formatSize(stats.totalMemory)} (${usagePercent.toFixed(1)}%)`,
      details,
      recommendations
    };
  }

  /**
   * 格式化大小
   */
  private formatSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 生成唯一ID
   */
  private generateId(prefix: string = 'mem'): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 清理所有资源
   */
  public dispose(): void {
    console.log('🧹 清理内存管理器...');
    
    const pools = [
      this.memoryPool.geometries,
      this.memoryPool.textures,
      this.memoryPool.materials,
      this.memoryPool.renderTargets
    ];

    pools.forEach(pool => {
      pool.forEach(resource => {
        this.disposeResource(resource);
      });
      pool.clear();
    });

    this.resourceTracker.clear();
    this.disposedResources.clear();
    
    console.log('✅ 内存管理器已清理');
  }
}