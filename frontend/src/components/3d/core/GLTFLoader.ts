import * as THREE from 'three';
import { GLTFLoader as ThreeGLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

export interface GLTFLoadOptions {
  enableDraco?: boolean;
  enableKTX2?: boolean;
  enableMeshOpt?: boolean;
  dracoDecoderPath?: string;
  ktx2TranscoderPath?: string;
  onProgress?: (progress: ProgressEvent) => void;
  onError?: (error: ErrorEvent) => void;
}

export interface LoadedModel {
  id: string;
  name: string;
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
  cameras: THREE.Camera[];
  asset: any;
  parser: any;
  userData: any;
  boundingBox: THREE.Box3;
  boundingSphere: THREE.Sphere;
  materials: THREE.Material[];
  textures: THREE.Texture[];
  geometries: THREE.BufferGeometry[];
  nodes: THREE.Object3D[];
  meshes: THREE.Mesh[];
  memory: {
    geometries: number;
    textures: number;
    total: number;
  };
  loadTime: number;
  fileSize?: number;
  url: string;
}

export interface ModelCache {
  [url: string]: {
    model: LoadedModel;
    lastAccessed: number;
    accessCount: number;
  };
}

/**
 * 高级glTF加载器
 * 支持Draco压缩、KTX2纹理、Meshopt压缩等先进特性
 * 包含模型缓存、内存管理、进度跟踪等功能
 */
export class GLTFLoader {
  private loader: ThreeGLTFLoader;
  private dracoLoader?: DRACOLoader;
  private ktx2Loader?: KTX2Loader;
  private modelCache: ModelCache = {};
  private maxCacheSize: number = 10;
  private cacheMemoryLimit: number = 500 * 1024 * 1024; // 500MB
  private currentCacheMemory: number = 0;
  
  // 加载统计
  private loadStats = {
    totalLoads: 0,
    successfulLoads: 0,
    failedLoads: 0,
    totalLoadTime: 0,
    cacheHits: 0,
    cacheMisses: 0
  };

  constructor(renderer?: THREE.WebGLRenderer) {
    this.loader = new ThreeGLTFLoader();
    this.setupDefaultLoaders(renderer);
  }

  /**
   * 设置默认加载器
   */
  private setupDefaultLoaders(renderer?: THREE.WebGLRenderer): void {
    // 设置Draco解码器
    this.dracoLoader = new DRACOLoader();
    this.dracoLoader.setDecoderPath('/draco/');
    this.loader.setDRACOLoader(this.dracoLoader);

    // 设置KTX2加载器（需要WebGL渲染器）
    if (renderer) {
      this.ktx2Loader = new KTX2Loader();
      this.ktx2Loader.setTranscoderPath('/ktx2/');
      this.ktx2Loader.detectSupport(renderer);
      this.loader.setKTX2Loader(this.ktx2Loader);
    }

    // 设置Meshopt解码器
    this.loader.setMeshoptDecoder(MeshoptDecoder);
  }

  /**
   * 加载glTF模型
   */
  public async loadModel(
    url: string, 
    options: GLTFLoadOptions = {}
  ): Promise<LoadedModel> {
    const startTime = performance.now();
    this.loadStats.totalLoads++;

    try {
      // 检查缓存
      if (this.modelCache[url]) {
        this.loadStats.cacheHits++;
        this.modelCache[url].lastAccessed = Date.now();
        this.modelCache[url].accessCount++;
        
        console.log(`🚀 从缓存加载模型: ${url}`);
        return this.modelCache[url].model;
      }

      this.loadStats.cacheMisses++;
      console.log(`📥 开始加载glTF模型: ${url}`);

      // 配置加载器
      this.configureLoaders(options);

      // 加载模型
      const gltf = await new Promise<any>((resolve, reject) => {
        this.loader.load(
          url,
          (gltf) => resolve(gltf),
          (progress) => options.onProgress?.(progress),
          (error) => reject(error)
        );
      });

      const loadTime = performance.now() - startTime;
      
      // 处理加载的模型
      const model = await this.processLoadedModel(gltf, url, loadTime);
      
      // 添加到缓存
      this.addToCache(url, model);
      
      this.loadStats.successfulLoads++;
      this.loadStats.totalLoadTime += loadTime;
      
      console.log(`✅ 模型加载完成: ${url} (${loadTime.toFixed(2)}ms)`);
      return model;

    } catch (error) {
      this.loadStats.failedLoads++;
      console.error(`❌ 模型加载失败: ${url}`, error);
      
      if (options.onError) {
        options.onError(error as ErrorEvent);
      }
      
      throw error;
    }
  }

  /**
   * 配置加载器选项
   */
  private configureLoaders(options: GLTFLoadOptions): void {
    // 配置Draco加载器
    if (options.enableDraco !== false && this.dracoLoader) {
      if (options.dracoDecoderPath) {
        this.dracoLoader.setDecoderPath(options.dracoDecoderPath);
      }
    }

    // 配置KTX2加载器
    if (options.enableKTX2 !== false && this.ktx2Loader) {
      if (options.ktx2TranscoderPath) {
        this.ktx2Loader.setTranscoderPath(options.ktx2TranscoderPath);
      }
    }
  }

  /**
   * 处理加载的模型
   */
  private async processLoadedModel(
    gltf: any, 
    url: string, 
    loadTime: number
  ): Promise<LoadedModel> {
    const scene = gltf.scene;
    const animations = gltf.animations || [];
    const cameras = gltf.cameras || [];

    // 计算包围盒和包围球
    const boundingBox = new THREE.Box3().setFromObject(scene);
    const boundingSphere = new THREE.Sphere();
    boundingBox.getBoundingSphere(boundingSphere);

    // 收集所有材质、纹理、几何体
    const materials: THREE.Material[] = [];
    const textures: THREE.Texture[] = [];
    const geometries: THREE.BufferGeometry[] = [];
    const nodes: THREE.Object3D[] = [];
    const meshes: THREE.Mesh[] = [];

    scene.traverse((object) => {
      nodes.push(object);
      
      if (object instanceof THREE.Mesh) {
        meshes.push(object);
        
        if (object.geometry && !geometries.includes(object.geometry)) {
          geometries.push(object.geometry);
        }
        
        if (object.material) {
          const materialArray = Array.isArray(object.material) ? object.material : [object.material];
          materialArray.forEach(material => {
            if (!materials.includes(material)) {
              materials.push(material);
              
              // 收集材质中的纹理
              Object.values(material).forEach(value => {
                if (value instanceof THREE.Texture && !textures.includes(value)) {
                  textures.push(value);
                }
              });
            }
          });
        }
      }
    });

    // 计算内存使用量
    const memory = this.calculateMemoryUsage(geometries, textures);

    // 生成唯一ID
    const id = this.generateModelId(url);

    // 设置模型名称
    const name = this.extractModelName(url);

    return {
      id,
      name,
      scene,
      animations,
      cameras,
      asset: gltf.asset,
      parser: gltf.parser,
      userData: gltf.userData,
      boundingBox,
      boundingSphere,
      materials,
      textures,
      geometries,
      nodes,
      meshes,
      memory,
      loadTime,
      url
    };
  }

  /**
   * 计算内存使用量
   */
  private calculateMemoryUsage(
    geometries: THREE.BufferGeometry[], 
    textures: THREE.Texture[]
  ): { geometries: number; textures: number; total: number } {
    let geometryMemory = 0;
    let textureMemory = 0;

    // 计算几何体内存
    geometries.forEach(geometry => {
      const attributes = geometry.attributes;
      Object.values(attributes).forEach(attribute => {
        if (attribute && attribute.array) {
          geometryMemory += attribute.array.byteLength;
        }
      });

      if (geometry.index) {
        geometryMemory += geometry.index.array.byteLength;
      }
    });

    // 计算纹理内存
    textures.forEach(texture => {
      if (texture.image) {
        const image = texture.image;
        if (image.width && image.height) {
          // 估算纹理内存（考虑格式和mipmaps）
          const pixelCount = image.width * image.height;
          const bytesPerPixel = this.getBytesPerPixel(texture.format, texture.type);
          const mipmapMultiplier = texture.generateMipmaps ? 1.33 : 1;
          textureMemory += pixelCount * bytesPerPixel * mipmapMultiplier;
        }
      }
    });

    return {
      geometries: geometryMemory,
      textures: textureMemory,
      total: geometryMemory + textureMemory
    };
  }

  /**
   * 获取纹理每像素字节数
   */
  private getBytesPerPixel(format: THREE.PixelFormat, type: THREE.TextureDataType): number {
    // 简化的计算，实际情况更复杂
    const formatMultiplier = {
      [THREE.AlphaFormat]: 1,
      [THREE.RGBFormat]: 3,
      [THREE.RGBAFormat]: 4,
      [THREE.LuminanceFormat]: 1,
      [THREE.LuminanceAlphaFormat]: 2
    }[format] || 4;

    const typeMultiplier = {
      [THREE.UnsignedByteType]: 1,
      [THREE.UnsignedShort4444Type]: 2,
      [THREE.UnsignedShort5551Type]: 2,
      [THREE.UnsignedShort565Type]: 2,
      [THREE.FloatType]: 4,
      [THREE.HalfFloatType]: 2
    }[type] || 1;

    return formatMultiplier * typeMultiplier;
  }

  /**
   * 添加模型到缓存
   */
  private addToCache(url: string, model: LoadedModel): void {
    // 检查缓存大小限制
    if (Object.keys(this.modelCache).length >= this.maxCacheSize) {
      this.evictLeastRecentlyUsed();
    }

    // 检查内存限制
    if (this.currentCacheMemory + model.memory.total > this.cacheMemoryLimit) {
      this.evictByMemoryPressure(model.memory.total);
    }

    this.modelCache[url] = {
      model,
      lastAccessed: Date.now(),
      accessCount: 1
    };

    this.currentCacheMemory += model.memory.total;
    console.log(`💾 模型已缓存: ${url} (内存: ${(model.memory.total / 1024 / 1024).toFixed(2)}MB)`);
  }

  /**
   * 驱逐最近最少使用的模型
   */
  private evictLeastRecentlyUsed(): void {
    let oldestUrl = '';
    let oldestTime = Date.now();

    Object.entries(this.modelCache).forEach(([url, entry]) => {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestUrl = url;
      }
    });

    if (oldestUrl) {
      this.removeFromCache(oldestUrl);
    }
  }

  /**
   * 根据内存压力驱逐模型
   */
  private evictByMemoryPressure(requiredMemory: number): void {
    const entries = Object.entries(this.modelCache)
      .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

    let freedMemory = 0;
    for (const [url, entry] of entries) {
      if (freedMemory >= requiredMemory) break;
      
      freedMemory += entry.model.memory.total;
      this.removeFromCache(url);
    }
  }

  /**
   * 从缓存中移除模型
   */
  private removeFromCache(url: string): void {
    const entry = this.modelCache[url];
    if (entry) {
      this.currentCacheMemory -= entry.model.memory.total;
      this.disposeModel(entry.model);
      delete this.modelCache[url];
      console.log(`🗑️ 模型已从缓存移除: ${url}`);
    }
  }

  /**
   * 释放模型资源
   */
  public disposeModel(model: LoadedModel): void {
    // 释放几何体
    model.geometries.forEach(geometry => {
      geometry.dispose();
    });

    // 释放材质
    model.materials.forEach(material => {
      material.dispose();
    });

    // 释放纹理
    model.textures.forEach(texture => {
      texture.dispose();
    });

    console.log(`🧹 模型资源已释放: ${model.name}`);
  }

  /**
   * 清空缓存
   */
  public clearCache(): void {
    Object.values(this.modelCache).forEach(entry => {
      this.disposeModel(entry.model);
    });
    
    this.modelCache = {};
    this.currentCacheMemory = 0;
    console.log('🔥 模型缓存已清空');
  }

  /**
   * 预加载模型
   */
  public async preloadModels(urls: string[], options: GLTFLoadOptions = {}): Promise<LoadedModel[]> {
    console.log(`🚀 开始预加载 ${urls.length} 个模型`);
    
    const promises = urls.map(url => this.loadModel(url, options));
    const results = await Promise.allSettled(promises);
    
    const successfulModels: LoadedModel[] = [];
    const failedUrls: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulModels.push(result.value);
      } else {
        failedUrls.push(urls[index]);
        console.error(`预加载失败: ${urls[index]}`, result.reason);
      }
    });
    
    console.log(`✅ 预加载完成: ${successfulModels.length}/${urls.length} 成功`);
    if (failedUrls.length > 0) {
      console.warn('预加载失败的模型:', failedUrls);
    }
    
    return successfulModels;
  }

  /**
   * 生成模型ID
   */
  private generateModelId(url: string): string {
    return `model_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 提取模型名称
   */
  private extractModelName(url: string): string {
    const filename = url.split('/').pop() || url;
    return filename.replace(/\.(gltf|glb)$/i, '');
  }

  /**
   * 获取缓存统计
   */
  public getCacheStats(): {
    size: number;
    memory: number;
    models: { url: string; name: string; memory: number; lastAccessed: number; accessCount: number }[];
  } {
    const models = Object.entries(this.modelCache).map(([url, entry]) => ({
      url,
      name: entry.model.name,
      memory: entry.model.memory.total,
      lastAccessed: entry.lastAccessed,
      accessCount: entry.accessCount
    }));

    return {
      size: Object.keys(this.modelCache).length,
      memory: this.currentCacheMemory,
      models
    };
  }

  /**
   * 获取加载统计
   */
  public getLoadStats(): typeof this.loadStats {
    return { ...this.loadStats };
  }

  /**
   * 设置缓存配置
   */
  public setCacheConfig(maxSize: number, memoryLimit: number): void {
    this.maxCacheSize = maxSize;
    this.cacheMemoryLimit = memoryLimit;
    
    // 如果当前缓存超过新限制，进行清理
    while (Object.keys(this.modelCache).length > maxSize) {
      this.evictLeastRecentlyUsed();
    }
    
    if (this.currentCacheMemory > memoryLimit) {
      this.evictByMemoryPressure(this.currentCacheMemory - memoryLimit);
    }
  }

  /**
   * 释放加载器资源
   */
  public dispose(): void {
    this.clearCache();
    
    if (this.dracoLoader) {
      this.dracoLoader.dispose();
    }
    
    if (this.ktx2Loader) {
      this.ktx2Loader.dispose();
    }
    
    console.log('🔧 GLTFLoader已释放');
  }
}