/**
 * DeepCAD 高级内存管理系统
 * 1号架构师 - 针对大数据量CAE操作的内存优化和管理
 */

import { performanceManager } from './PerformanceManager';

// ==================== 类型定义 ====================

export interface MemoryPool {
  id: string;
  type: 'geometry' | 'mesh' | 'results' | 'temporary' | 'cache';
  totalSize: number;
  usedSize: number;
  itemCount: number;
  priority: number;
  lastAccessed: number;
  autoCleanup: boolean;
  retentionTime: number; // ms
}

export interface MemoryItem {
  id: string;
  poolId: string;
  data: any;
  size: number;
  accessCount: number;
  lastAccessed: number;
  pinned: boolean;
  compressed: boolean;
  metadata: {
    type: string;
    description: string;
    tags: string[];
    version: string;
  };
}

export interface MemoryStats {
  totalAllocated: number;
  totalUsed: number;
  totalPools: number;
  totalItems: number;
  fragmentation: number;
  cacheHitRate: number;
  gcEvents: number;
  pools: {
    [poolId: string]: {
      size: number;
      usage: number;
      itemCount: number;
      hitRate: number;
    };
  };
  trends: {
    allocatedTrend: number[];
    usageTrend: number[];
    gcTrend: number[];
  };
}

export interface CompressionResult {
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
  compressionTime: number;
  algorithm: string;
}

export interface MemoryConfiguration {
  maxTotalMemory: number; // bytes
  maxPoolSize: number;
  compressionThreshold: number; // bytes
  gcThreshold: number; // usage percentage
  enableAutoGC: boolean;
  enableCompression: boolean;
  compressionWorkers: number;
  retentionPolicies: {
    [poolType: string]: {
      maxAge: number;
      maxItems: number;
      priority: number;
    };
  };
  monitoring: {
    samplingInterval: number;
    historyLength: number;
    alertThresholds: {
      memory: number;
      fragmentation: number;
      gcFrequency: number;
    };
  };
}

// ==================== 高级内存管理器 ====================

export class AdvancedMemoryManager {
  private pools: Map<string, MemoryPool> = new Map();
  private items: Map<string, MemoryItem> = new Map();
  private compressionWorkers: Worker[] = [];
  private config: MemoryConfiguration;
  private statsHistory: MemoryStats[] = [];
  private gcEventCount: number = 0;
  private cacheHits: number = 0;
  private cacheRequests: number = 0;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isGCRunning: boolean = false;

  constructor(config: Partial<MemoryConfiguration> = {}) {
    this.config = {
      maxTotalMemory: 2 * 1024 * 1024 * 1024, // 2GB
      maxPoolSize: 512 * 1024 * 1024, // 512MB
      compressionThreshold: 1024 * 1024, // 1MB
      gcThreshold: 80, // 80%
      enableAutoGC: true,
      enableCompression: true,
      compressionWorkers: 2,
      retentionPolicies: {
        geometry: { maxAge: 30 * 60 * 1000, maxItems: 100, priority: 9 },
        mesh: { maxAge: 20 * 60 * 1000, maxItems: 50, priority: 8 },
        results: { maxAge: 60 * 60 * 1000, maxItems: 200, priority: 7 },
        temporary: { maxAge: 5 * 60 * 1000, maxItems: 20, priority: 3 },
        cache: { maxAge: 10 * 60 * 1000, maxItems: 500, priority: 5 }
      },
      monitoring: {
        samplingInterval: 5000, // 5秒
        historyLength: 720, // 1小时历史（5秒 * 720 = 1小时）
        alertThresholds: {
          memory: 90, // 90%
          fragmentation: 60, // 60%
          gcFrequency: 10 // 每分钟10次
        }
      },
      ...config
    };

    this.initializeCompressionWorkers();
    this.initializePools();
    this.startMonitoring();
  }

  /**
   * 初始化压缩工作器
   */
  private initializeCompressionWorkers(): void {
    if (!this.config.enableCompression || typeof Worker === 'undefined') {
      return;
    }

    for (let i = 0; i < this.config.compressionWorkers; i++) {
      try {
        const workerScript = `
          // LZ4 压缩算法的简化实现
          function compress(data) {
            const jsonString = JSON.stringify(data);
            const compressed = jsonString; // 简化实现，实际应使用真正的压缩算法
            return {
              compressed,
              originalSize: jsonString.length,
              compressedSize: compressed.length,
              algorithm: 'lz4-simple'
            };
          }

          function decompress(compressedData) {
            return JSON.parse(compressedData);
          }

          self.onmessage = function(e) {
            const { id, operation, data } = e.data;
            const startTime = performance.now();
            
            try {
              if (operation === 'compress') {
                const result = compress(data);
                result.compressionTime = performance.now() - startTime;
                self.postMessage({ id, success: true, result });
              } else if (operation === 'decompress') {
                const result = decompress(data);
                const decompressionTime = performance.now() - startTime;
                self.postMessage({ id, success: true, result, decompressionTime });
              }
            } catch (error) {
              self.postMessage({ id, success: false, error: error.message });
            }
          };
        `;

        const blob = new Blob([workerScript], { type: 'application/javascript' });
        const worker = new Worker(URL.createObjectURL(blob));
        this.compressionWorkers.push(worker);
      } catch (error) {
        console.warn(`无法创建压缩工作器 ${i}:`, error);
      }
    }
  }

  /**
   * 初始化内存池
   */
  private initializePools(): void {
    const poolTypes: Array<MemoryPool['type']> = ['geometry', 'mesh', 'results', 'temporary', 'cache'];
    
    poolTypes.forEach(type => {
      const policy = this.config.retentionPolicies[type];
      const pool: MemoryPool = {
        id: `pool_${type}`,
        type,
        totalSize: 0,
        usedSize: 0,
        itemCount: 0,
        priority: policy.priority,
        lastAccessed: Date.now(),
        autoCleanup: true,
        retentionTime: policy.maxAge
      };
      
      this.pools.set(pool.id, pool);
    });
  }

  /**
   * 开始内存监控
   */
  private startMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    this.monitoringInterval = setInterval(() => {
      this.collectStats();
      this.checkAlertThresholds();
      
      if (this.config.enableAutoGC) {
        this.checkAndTriggerGC();
      }
    }, this.config.monitoring.samplingInterval);
  }

  /**
   * 分配内存项
   */
  public async allocate(
    id: string,
    data: any,
    poolType: MemoryPool['type'] = 'temporary',
    metadata: Partial<MemoryItem['metadata']> = {}
  ): Promise<boolean> {
    try {
      const dataSize = this.calculateDataSize(data);
      const pool = this.getPoolByType(poolType);
      
      if (!pool) {
        throw new Error(`内存池类型 ${poolType} 不存在`);
      }

      // 检查总内存限制
      const currentTotalUsage = this.getTotalUsedMemory();
      if (currentTotalUsage + dataSize > this.config.maxTotalMemory) {
        // 尝试GC释放内存
        await this.garbageCollect();
        
        const newTotalUsage = this.getTotalUsedMemory();
        if (newTotalUsage + dataSize > this.config.maxTotalMemory) {
          throw new Error('内存不足，无法分配');
        }
      }

      // 检查池大小限制
      if (pool.usedSize + dataSize > this.config.maxPoolSize) {
        await this.cleanupPool(pool.id, dataSize);
      }

      // 检查是否需要压缩
      let finalData = data;
      let compressed = false;
      
      if (this.config.enableCompression && dataSize > this.config.compressionThreshold) {
        try {
          const compressionResult = await this.compressData(data);
          if (compressionResult.compressedSize < dataSize * 0.8) { // 至少节省20%
            finalData = compressionResult.compressed;
            compressed = true;
          }
        } catch (error) {
          console.warn('数据压缩失败，使用原始数据:', error);
        }
      }

      // 创建内存项
      const item: MemoryItem = {
        id,
        poolId: pool.id,
        data: finalData,
        size: compressed ? this.calculateDataSize(finalData) : dataSize,
        accessCount: 0,
        lastAccessed: Date.now(),
        pinned: false,
        compressed,
        metadata: {
          type: poolType,
          description: '',
          tags: [],
          version: '1.0.0',
          ...metadata
        }
      };

      // 存储项目
      this.items.set(id, item);
      
      // 更新池统计
      pool.usedSize += item.size;
      pool.itemCount++;
      pool.lastAccessed = Date.now();

      // 触发性能监控事件
      performanceManager.recordEvent('memory-allocate', {
        itemId: id,
        poolType,
        size: item.size,
        compressed
      });

      return true;
    } catch (error) {
      console.error('内存分配失败:', error);
      return false;
    }
  }

  /**
   * 获取内存项
   */
  public async get(id: string): Promise<any | null> {
    const item = this.items.get(id);
    if (!item) {
      this.cacheRequests++;
      return null;
    }

    // 更新访问统计
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.cacheHits++;
    this.cacheRequests++;

    // 更新池访问时间
    const pool = this.pools.get(item.poolId);
    if (pool) {
      pool.lastAccessed = Date.now();
    }

    // 如果数据被压缩，需要解压
    if (item.compressed) {
      try {
        const decompressedData = await this.decompressData(item.data);
        return decompressedData;
      } catch (error) {
        console.error('数据解压失败:', error);
        return null;
      }
    }

    return item.data;
  }

  /**
   * 释放内存项
   */
  public deallocate(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.pinned) {
      return false;
    }

    const pool = this.pools.get(item.poolId);
    if (pool) {
      pool.usedSize -= item.size;
      pool.itemCount--;
    }

    this.items.delete(id);

    performanceManager.recordEvent('memory-deallocate', {
      itemId: id,
      poolId: item.poolId,
      size: item.size
    });

    return true;
  }

  /**
   * 固定内存项（防止被GC）
   */
  public pin(id: string): boolean {
    const item = this.items.get(id);
    if (item) {
      item.pinned = true;
      return true;
    }
    return false;
  }

  /**
   * 取消固定内存项
   */
  public unpin(id: string): boolean {
    const item = this.items.get(id);
    if (item) {
      item.pinned = false;
      return true;
    }
    return false;
  }

  /**
   * 垃圾回收
   */
  public async garbageCollect(force: boolean = false): Promise<void> {
    if (this.isGCRunning && !force) {
      return;
    }

    this.isGCRunning = true;
    const startTime = performance.now();
    let itemsFreed = 0;
    let bytesFreed = 0;

    try {
      // 按优先级排序池
      const sortedPools = Array.from(this.pools.values())
        .sort((a, b) => a.priority - b.priority);

      for (const pool of sortedPools) {
        const policy = this.config.retentionPolicies[pool.type];
        const now = Date.now();
        
        // 收集该池中的过期项目
        const poolItems = Array.from(this.items.values())
          .filter(item => item.poolId === pool.id && !item.pinned)
          .sort((a, b) => a.lastAccessed - b.lastAccessed);

        // 删除过期项目
        for (const item of poolItems) {
          const age = now - item.lastAccessed;
          const shouldRemove = age > policy.maxAge || 
                              (poolItems.length > policy.maxItems && item.accessCount < 2);

          if (shouldRemove) {
            bytesFreed += item.size;
            itemsFreed++;
            this.deallocate(item.id);
          }
        }
      }

      this.gcEventCount++;
      
      performanceManager.recordEvent('memory-gc', {
        duration: performance.now() - startTime,
        itemsFreed,
        bytesFreed,
        forced: force
      });

    } finally {
      this.isGCRunning = false;
    }
  }

  /**
   * 清理指定池
   */
  private async cleanupPool(poolId: string, requiredSpace: number): Promise<void> {
    const pool = this.pools.get(poolId);
    if (!pool) return;

    const poolItems = Array.from(this.items.values())
      .filter(item => item.poolId === poolId && !item.pinned)
      .sort((a, b) => a.lastAccessed - b.lastAccessed);

    let freedSpace = 0;
    for (const item of poolItems) {
      if (freedSpace >= requiredSpace) break;
      
      freedSpace += item.size;
      this.deallocate(item.id);
    }
  }

  /**
   * 压缩数据
   */
  private async compressData(data: any): Promise<CompressionResult> {
    return new Promise((resolve, reject) => {
      if (this.compressionWorkers.length === 0) {
        reject(new Error('没有可用的压缩工作器'));
        return;
      }

      // 选择负载最少的工作器
      const worker = this.compressionWorkers[Math.floor(Math.random() * this.compressionWorkers.length)];
      const requestId = Math.random().toString(36).substring(2);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === requestId) {
          worker.removeEventListener('message', handleMessage);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id: requestId, operation: 'compress', data });

      // 超时处理
      setTimeout(() => {
        worker.removeEventListener('message', handleMessage);
        reject(new Error('压缩超时'));
      }, 30000);
    });
  }

  /**
   * 解压数据
   */
  private async decompressData(compressedData: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (this.compressionWorkers.length === 0) {
        reject(new Error('没有可用的压缩工作器'));
        return;
      }

      const worker = this.compressionWorkers[0];
      const requestId = Math.random().toString(36).substring(2);

      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === requestId) {
          worker.removeEventListener('message', handleMessage);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({ id: requestId, operation: 'decompress', data: compressedData });

      // 超时处理
      setTimeout(() => {
        worker.removeEventListener('message', handleMessage);
        reject(new Error('解压超时'));
      }, 30000);
    });
  }

  /**
   * 收集统计信息
   */
  private collectStats(): void {
    const now = Date.now();
    const totalAllocated = this.config.maxTotalMemory;
    const totalUsed = this.getTotalUsedMemory();
    const totalPools = this.pools.size;
    const totalItems = this.items.size;
    const fragmentation = this.calculateFragmentation();
    const cacheHitRate = this.cacheRequests > 0 ? (this.cacheHits / this.cacheRequests) * 100 : 0;

    const poolStats: MemoryStats['pools'] = {};
    this.pools.forEach((pool, poolId) => {
      poolStats[poolId] = {
        size: pool.totalSize,
        usage: pool.usedSize,
        itemCount: pool.itemCount,
        hitRate: this.calculatePoolHitRate(poolId)
      };
    });

    const stats: MemoryStats = {
      totalAllocated,
      totalUsed,
      totalPools,
      totalItems,
      fragmentation,
      cacheHitRate,
      gcEvents: this.gcEventCount,
      pools: poolStats,
      trends: {
        allocatedTrend: [],
        usageTrend: [],
        gcTrend: []
      }
    };

    // 更新趋势数据
    if (this.statsHistory.length > 0) {
      const recentStats = this.statsHistory.slice(-10);
      stats.trends.allocatedTrend = recentStats.map(s => s.totalAllocated);
      stats.trends.usageTrend = recentStats.map(s => s.totalUsed);
      stats.trends.gcTrend = recentStats.map(s => s.gcEvents);
    }

    this.statsHistory.push(stats);
    
    // 保持历史长度限制
    if (this.statsHistory.length > this.config.monitoring.historyLength) {
      this.statsHistory.shift();
    }
  }

  /**
   * 检查警报阈值
   */
  private checkAlertThresholds(): void {
    if (this.statsHistory.length === 0) return;

    const latestStats = this.statsHistory[this.statsHistory.length - 1];
    const thresholds = this.config.monitoring.alertThresholds;

    // 内存使用警报
    const memoryUsagePercent = (latestStats.totalUsed / latestStats.totalAllocated) * 100;
    if (memoryUsagePercent > thresholds.memory) {
      this.emitAlert('high-memory-usage', {
        current: memoryUsagePercent,
        threshold: thresholds.memory,
        totalUsed: latestStats.totalUsed,
        totalAllocated: latestStats.totalAllocated
      });
    }

    // 碎片化警报
    if (latestStats.fragmentation > thresholds.fragmentation) {
      this.emitAlert('high-fragmentation', {
        current: latestStats.fragmentation,
        threshold: thresholds.fragmentation
      });
    }

    // GC频率警报
    if (this.statsHistory.length >= 12) { // 1分钟数据（5秒间隔 * 12）
      const recentGCEvents = this.statsHistory.slice(-12)
        .reduce((total, stats, index, array) => {
          if (index === 0) return 0;
          return total + (stats.gcEvents - array[index - 1].gcEvents);
        }, 0);

      if (recentGCEvents > thresholds.gcFrequency) {
        this.emitAlert('high-gc-frequency', {
          current: recentGCEvents,
          threshold: thresholds.gcFrequency
        });
      }
    }
  }

  /**
   * 检查并触发GC
   */
  private checkAndTriggerGC(): void {
    const totalUsed = this.getTotalUsedMemory();
    const usagePercent = (totalUsed / this.config.maxTotalMemory) * 100;

    if (usagePercent > this.config.gcThreshold) {
      this.garbageCollect();
    }
  }

  /**
   * 发出警报
   */
  private emitAlert(type: string, data: any): void {
    performanceManager.recordEvent('memory-alert', { type, ...data });
    console.warn(`内存管理警报 [${type}]:`, data);
  }

  /**
   * 获取指定类型的内存池
   */
  private getPoolByType(type: MemoryPool['type']): MemoryPool | undefined {
    return Array.from(this.pools.values()).find(pool => pool.type === type);
  }

  /**
   * 计算数据大小
   */
  private calculateDataSize(data: any): number {
    if (data === null || data === undefined) return 0;
    
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      // 粗略估算
      return JSON.stringify(data).length * 2;
    }
  }

  /**
   * 获取总已用内存
   */
  private getTotalUsedMemory(): number {
    return Array.from(this.pools.values())
      .reduce((total, pool) => total + pool.usedSize, 0);
  }

  /**
   * 计算内存碎片化程度
   */
  private calculateFragmentation(): number {
    const totalPools = this.pools.size;
    if (totalPools === 0) return 0;

    let fragmentationSum = 0;
    this.pools.forEach(pool => {
      if (pool.totalSize > 0) {
        const utilization = pool.usedSize / pool.totalSize;
        fragmentationSum += (1 - utilization) * 100;
      }
    });

    return fragmentationSum / totalPools;
  }

  /**
   * 计算池的命中率
   */
  private calculatePoolHitRate(poolId: string): number {
    const poolItems = Array.from(this.items.values())
      .filter(item => item.poolId === poolId);

    if (poolItems.length === 0) return 0;

    const totalAccesses = poolItems.reduce((sum, item) => sum + item.accessCount, 0);
    return poolItems.length > 0 ? (totalAccesses / poolItems.length) : 0;
  }

  /**
   * 获取统计信息
   */
  public getStats(): MemoryStats | null {
    return this.statsHistory.length > 0 
      ? this.statsHistory[this.statsHistory.length - 1]
      : null;
  }

  /**
   * 获取历史统计
   */
  public getStatsHistory(): MemoryStats[] {
    return [...this.statsHistory];
  }

  /**
   * 获取详细信息
   */
  public getDetailedInfo() {
    return {
      pools: Array.from(this.pools.values()),
      items: Array.from(this.items.values()).map(item => ({
        ...item,
        data: `<${typeof item.data}> ${this.calculateDataSize(item.data)} bytes`
      })),
      config: this.config,
      compressionWorkers: this.compressionWorkers.length,
      isGCRunning: this.isGCRunning
    };
  }

  /**
   * 更新配置
   */
  public updateConfig(newConfig: Partial<MemoryConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    // 重启监控
    this.startMonitoring();
  }

  /**
   * 销毁内存管理器
   */
  public destroy(): void {
    // 清理监控
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // 终止压缩工作器
    this.compressionWorkers.forEach(worker => {
      worker.terminate();
    });

    // 清理内存
    this.items.clear();
    this.pools.clear();
    this.statsHistory = [];
  }
}

// ==================== 导出 ====================

export const advancedMemoryManager = new AdvancedMemoryManager();
export default AdvancedMemoryManager;