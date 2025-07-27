/**
 * DeepCAD Terra求解器内存管理系统
 * @description 专为200万单元网格在24GB内存环境下的高效内存管理
 * 支持20块×10万单元的智能分块策略，实现渐进式加载、LRU缓存、视图流式处理等核心功能
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

/**
 * 数据块接口定义
 * @interface DataChunk
 * @description 内存管理的基本数据单元
 */
export interface DataChunk {
  /** 数据块唯一标识符 */
  id: string;
  /** 数据块类型：网格/结果/几何 */
  type: 'mesh' | 'results' | 'geometry' | 'material';
  /** 数据内容 */
  data: ArrayBuffer | Float32Array | Uint32Array;
  /** 内存大小 (字节) */
  size: number;
  /** 最后访问时间戳 */
  lastAccessed: number;
  /** 访问优先级 (1-10, 10为最高) */
  priority: number;
  /** 是否为只读数据 */
  readonly: boolean;
  /** 数据块状态 */
  status: 'loading' | 'ready' | 'cached' | 'disposed';
}

/**
 * 内存统计信息接口
 * @interface MemoryStats
 */
export interface MemoryStats {
  /** 总内存限制 (字节) */
  totalLimit: number;
  /** 当前使用内存 (字节) */
  currentUsage: number;
  /** 内存使用率 (0-1) */
  usageRatio: number;
  /** 缓存命中率 (0-1) */
  hitRatio: number;
  /** 活跃数据块数量 */
  activeChunks: number;
  /** 缓存数据块数量 */
  cachedChunks: number;
}

/**
 * 视图范围定义接口
 * @interface ViewFrustum
 * @description 定义当前可视区域，用于视图相关的数据加载
 */
export interface ViewFrustum {
  /** 相机位置 */
  cameraPosition: [number, number, number];
  /** 视图方向 */
  viewDirection: [number, number, number];
  /** 视场角 (弧度) */
  fov: number;
  /** 近裁剪面距离 */
  near: number;
  /** 远裁剪面距离 */
  far: number;
  /** 视锥体八个顶点坐标 */
  frustumVertices: Float32Array;
}

/**
 * 加载策略配置接口
 * @interface LoadingStrategy
 */
export interface LoadingStrategy {
  /** 预加载距离 (米) */
  preloadDistance: number;
  /** 最大并发加载数 */
  maxConcurrentLoads: number;
  /** 内存警告阈值 (0-1) */
  memoryWarningThreshold: number;
  /** 自动释放阈值 (0-1) */
  autoReleaseThreshold: number;
  /** 启用空间分区优化 */
  enableSpatialPartitioning: boolean;
}

/**
 * Terra求解器内存管理器
 * @class MemoryManager
 * @description 核心内存管理系统，支持200万单元网格的高效处理
 */
export class MemoryManager {
  /** 内存总限制 (默认32GB) */
  private readonly memoryLimit: number = 32 * 1024 * 1024 * 1024;
  
  /** 数据块缓存 (LRU策略) */
  private chunkCache: Map<string, DataChunk> = new Map();
  
  /** 当前内存使用量 */
  private currentMemoryUsage: number = 0;
  
  /** 加载队列 */
  private loadingQueue: Array<{id: string, priority: number}> = [];
  
  /** 正在加载的数据块集合 */
  private loadingChunks: Set<string> = new Set();
  
  /** 访问计数器 (用于LRU) */
  private accessCounter: number = 0;
  
  /** 内存统计信息 */
  private stats: MemoryStats;
  
  /** 加载策略配置 */
  private strategy: LoadingStrategy;

  /**
   * 内存管理器构造函数
   * @param memoryLimit - 内存限制 (字节)，默认16GB
   * @param strategy - 加载策略配置
   */
  constructor(memoryLimit?: number, strategy?: Partial<LoadingStrategy>) {
    this.memoryLimit = memoryLimit || this.memoryLimit;
    this.strategy = {
      preloadDistance: 100.0,
      maxConcurrentLoads: 4,
      memoryWarningThreshold: 0.8,
      autoReleaseThreshold: 0.9,
      enableSpatialPartitioning: true,
      ...strategy
    };
    
    this.initializeStats();
    this.startMemoryMonitoring();
  }

  /**
   * 渐进式加载数据块
   * @description 根据优先级和内存状态智能加载数据块
   * @param chunkId - 数据块标识符
   * @param priority - 加载优先级 (1-10)
   * @param immediate - 是否立即加载
   * @returns Promise<DataChunk> 加载的数据块
   * @throws {Error} 内存不足或加载失败时抛出异常
   */
  async loadChunk(chunkId: string, priority: number = 5, immediate: boolean = false): Promise<DataChunk> {
    // 检查缓存中是否已存在
    const cachedChunk = this.chunkCache.get(chunkId);
    if (cachedChunk && cachedChunk.status === 'ready') {
      // 更新访问时间和计数器
      cachedChunk.lastAccessed = Date.now();
      this.accessCounter++;
      this.updateStats();
      return cachedChunk;
    }

    // 检查是否正在加载
    if (this.loadingChunks.has(chunkId)) {
      return this.waitForChunkLoad(chunkId);
    }

    // 内存预检查
    await this.ensureMemoryAvailable();

    // 添加到加载队列或立即加载
    if (immediate || priority >= 8) {
      return this.loadChunkImmediate(chunkId, priority);
    } else {
      this.addToLoadingQueue(chunkId, priority);
      return this.processLoadingQueue();
    }
  }

  /**
   * 释放数据块
   * @description 从内存中释放指定的数据块
   * @param chunkId - 数据块标识符
   * @returns boolean 释放是否成功
   */
  releaseChunk(chunkId: string): boolean {
    const chunk = this.chunkCache.get(chunkId);
    if (!chunk) {
      return false;
    }

    // 只读数据需要确认释放
    if (chunk.readonly && chunk.priority >= 8) {
      console.warn(`尝试释放高优先级只读数据块: ${chunkId}`);
      return false;
    }

    // 更新内存使用统计
    this.currentMemoryUsage -= chunk.size;
    
    // 从缓存中移除
    this.chunkCache.delete(chunkId);
    
    // 标记为已释放
    chunk.status = 'disposed';
    
    this.updateStats();
    console.log(`数据块已释放: ${chunkId}, 节省内存: ${(chunk.size / 1024 / 1024).toFixed(2)}MB`);
    
    return true;
  }

  /**
   * 基于视图的智能预加载
   * @description 根据当前视图范围预加载相关数据块
   * @param viewFrustum - 当前视图范围
   * @param elementIds - 可见单元ID数组
   * @returns Promise<void>
   */
  async preloadForView(viewFrustum: ViewFrustum, elementIds: number[]): Promise<void> {
    if (!this.strategy.enableSpatialPartitioning) {
      return;
    }

    // 计算需要预加载的数据块
    const chunksToPreload = this.calculatePreloadChunks(viewFrustum, elementIds);
    
    // 按距离和优先级排序
    chunksToPreload.sort((a, b) => {
      const distanceA = this.calculateDistance(viewFrustum.cameraPosition, a.centroid);
      const distanceB = this.calculateDistance(viewFrustum.cameraPosition, b.centroid);
      return (distanceA / a.priority) - (distanceB / b.priority);
    });

    // 限制并发加载数量
    const maxPreload = Math.min(chunksToPreload.length, this.strategy.maxConcurrentLoads);
    const preloadPromises: Promise<DataChunk>[] = [];

    for (let i = 0; i < maxPreload; i++) {
      const chunk = chunksToPreload[i];
      preloadPromises.push(this.loadChunk(chunk.id, chunk.priority));
    }

    try {
      await Promise.all(preloadPromises);
      console.log(`视图预加载完成: ${maxPreload}个数据块`);
    } catch (error) {
      console.error('视图预加载失败:', error);
    }
  }

  /**
   * 获取内存使用统计
   * @returns MemoryStats 当前内存统计信息
   */
  getMemoryStats(): MemoryStats {
    return { ...this.stats };
  }

  /**
   * 强制垃圾回收
   * @description 根据LRU策略强制释放一定比例的缓存
   * @param forceRatio - 强制释放比例 (0-1)
   * @returns number 释放的内存大小 (字节)
   */
  forceGarbageCollection(forceRatio: number = 0.3): number {
    const chunksToRelease = Array.from(this.chunkCache.values())
      .filter(chunk => !chunk.readonly || chunk.priority < 7)
      .sort((a, b) => a.lastAccessed - b.lastAccessed) // LRU排序
      .slice(0, Math.floor(this.chunkCache.size * forceRatio));

    let releasedMemory = 0;
    for (const chunk of chunksToRelease) {
      if (this.releaseChunk(chunk.id)) {
        releasedMemory += chunk.size;
      }
    }

    console.log(`强制垃圾回收完成: 释放 ${(releasedMemory / 1024 / 1024).toFixed(2)}MB 内存`);
    return releasedMemory;
  }

  /**
   * 内存状态检查
   * @description 检查当前内存使用情况并执行必要的清理
   * @private
   */
  private async ensureMemoryAvailable(): Promise<void> {
    const usageRatio = this.currentMemoryUsage / this.memoryLimit;

    if (usageRatio > this.strategy.autoReleaseThreshold) {
      // 触发自动垃圾回收
      const releasedMemory = this.forceGarbageCollection(0.4);
      if (releasedMemory === 0) {
        throw new Error(`内存不足: 使用率${(usageRatio * 100).toFixed(1)}%, 无法释放更多内存`);
      }
    } else if (usageRatio > this.strategy.memoryWarningThreshold) {
      console.warn(`内存使用率较高: ${(usageRatio * 100).toFixed(1)}%`);
    }
  }

  /**
   * 立即加载数据块
   * @param chunkId - 数据块ID
   * @param priority - 优先级
   * @private
   */
  private async loadChunkImmediate(chunkId: string, priority: number): Promise<DataChunk> {
    this.loadingChunks.add(chunkId);

    try {
      // 模拟数据加载 (实际应该从后端API或文件加载)
      const chunkData = await this.fetchChunkData(chunkId);
      
      const chunk: DataChunk = {
        id: chunkId,
        type: this.determineChunkType(chunkId),
        data: chunkData,
        size: chunkData.byteLength,
        lastAccessed: Date.now(),
        priority: priority,
        readonly: false,
        status: 'ready'
      };

      // 添加到缓存
      this.chunkCache.set(chunkId, chunk);
      this.currentMemoryUsage += chunk.size;
      
      this.updateStats();
      
      console.log(`数据块加载完成: ${chunkId}, 大小: ${(chunk.size / 1024 / 1024).toFixed(2)}MB`);
      
      return chunk;
      
    } finally {
      this.loadingChunks.delete(chunkId);
    }
  }

  /**
   * 模拟数据获取
   * @param chunkId - 数据块ID
   * @private
   */
  private async fetchChunkData(chunkId: string): Promise<ArrayBuffer> {
    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
    
    // 模拟不同大小的数据块 (实际中会从后端API获取)
    const size = Math.floor(10 * 1024 * 1024 + Math.random() * 50 * 1024 * 1024); // 10-60MB
    return new ArrayBuffer(size);
  }

  /**
   * 确定数据块类型
   * @param chunkId - 数据块ID
   * @private
   */
  private determineChunkType(chunkId: string): DataChunk['type'] {
    if (chunkId.includes('mesh')) return 'mesh';
    if (chunkId.includes('result')) return 'results';
    if (chunkId.includes('geo')) return 'geometry';
    return 'material';
  }

  /**
   * 初始化统计信息
   * @private
   */
  private initializeStats(): void {
    this.stats = {
      totalLimit: this.memoryLimit,
      currentUsage: 0,
      usageRatio: 0,
      hitRatio: 0,
      activeChunks: 0,
      cachedChunks: 0
    };
  }

  /**
   * 更新统计信息
   * @private
   */
  private updateStats(): void {
    this.stats.currentUsage = this.currentMemoryUsage;
    this.stats.usageRatio = this.currentMemoryUsage / this.memoryLimit;
    this.stats.activeChunks = this.loadingChunks.size;
    this.stats.cachedChunks = this.chunkCache.size;
    // hitRatio 计算需要更多的访问统计数据
  }

  /**
   * 启动内存监控
   * @private
   */
  private startMemoryMonitoring(): void {
    setInterval(() => {
      this.updateStats();
      
      if (this.stats.usageRatio > this.strategy.memoryWarningThreshold) {
        console.warn(`内存监控警告: 使用率 ${(this.stats.usageRatio * 100).toFixed(1)}%`);
      }
    }, 5000); // 每5秒检查一次
  }

  /**
   * 计算两点距离
   * @private
   */
  private calculateDistance(pos1: [number, number, number], pos2: [number, number, number]): number {
    const dx = pos1[0] - pos2[0];
    const dy = pos1[1] - pos2[1];  
    const dz = pos1[2] - pos2[2];
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  /**
   * 计算需要预加载的数据块
   * @private
   */
  private calculatePreloadChunks(viewFrustum: ViewFrustum, elementIds: number[]): Array<{id: string, priority: number, centroid: [number, number, number]}> {
    // 实际实现中需要基于空间分区和可见性判断
    // 这里提供示例结构
    return elementIds.slice(0, 10).map(id => ({
      id: `chunk_${id}`,
      priority: 5,
      centroid: [Math.random() * 100, Math.random() * 100, Math.random() * 100] as [number, number, number]
    }));
  }

  /**
   * 添加到加载队列
   * @private
   */
  private addToLoadingQueue(chunkId: string, priority: number): void {
    this.loadingQueue.push({ id: chunkId, priority });
    this.loadingQueue.sort((a, b) => b.priority - a.priority); // 高优先级在前
  }

  /**
   * 处理加载队列
   * @private
   */
  private async processLoadingQueue(): Promise<DataChunk> {
    if (this.loadingQueue.length === 0) {
      throw new Error('加载队列为空');
    }

    const next = this.loadingQueue.shift()!;
    return this.loadChunkImmediate(next.id, next.priority);
  }

  /**
   * 等待数据块加载完成
   * @private
   */
  private async waitForChunkLoad(chunkId: string): Promise<DataChunk> {
    // 轮询等待加载完成
    while (this.loadingChunks.has(chunkId)) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const chunk = this.chunkCache.get(chunkId);
    if (!chunk) {
      throw new Error(`数据块加载失败: ${chunkId}`);
    }
    
    return chunk;
  }
}

/**
 * 全局内存管理器实例
 */
export const globalMemoryManager = new MemoryManager();

/**
 * 内存管理器工厂函数
 * @param memoryLimit - 内存限制
 * @param strategy - 加载策略
 * @returns MemoryManager 内存管理器实例
 */
export function createMemoryManager(memoryLimit?: number, strategy?: Partial<LoadingStrategy>): MemoryManager {
  return new MemoryManager(memoryLimit, strategy);
}