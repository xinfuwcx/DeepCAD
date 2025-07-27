/**
 * 大数据量内存管理和优化系统
 * 1号架构师 - 智能内存分配、缓存和垃圾回收
 */

import { EventEmitter } from 'events';

// 内存池类型
export type MemoryPoolType = 'geometry' | 'texture' | 'buffer' | 'computation' | 'cache';

// 内存块信息
export interface MemoryBlock {
  id: string;
  type: MemoryPoolType;
  size: number;
  allocated: boolean;
  lastAccessed: number;
  accessCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data?: any;
  metadata: {
    createdAt: number;
    owner: string;
    description: string;
    tags: string[];
  };
}

// 内存池配置
export interface MemoryPoolConfig {
  maxSize: number; // 最大内存大小（字节）
  blockSize: number; // 标准块大小
  growthFactor: number; // 增长因子
  shrinkThreshold: number; // 收缩阈值
  gcThreshold: number; // GC触发阈值
  preallocationEnabled: boolean; // 是否预分配
}

// 内存统计信息
export interface MemoryStats {
  pools: Record<MemoryPoolType, {
    totalSize: number;
    usedSize: number;
    freeSize: number;
    blockCount: number;
    fragmentation: number;
    hitRate: number;
  }>;
  global: {
    totalAllocated: number;
    peakUsage: number;
    gcCount: number;
    gcTime: number;
    memoryPressure: number;
    leakDetectionEnabled: boolean;
  };
}

// 缓存策略
export type CacheStrategy = 'LRU' | 'LFU' | 'FIFO' | 'adaptive';

// 缓存项
export interface CacheItem<T = any> {
  key: string;
  data: T;
  size: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  expiresAt?: number;
  priority: number;
  tags: string[];
}

// 内存压力等级
export type MemoryPressureLevel = 'none' | 'low' | 'medium' | 'high' | 'critical';

/**
 * 内存管理器核心类
 */
export class MemoryManager extends EventEmitter {
  private pools: Map<MemoryPoolType, MemoryBlock[]> = new Map();
  private poolConfigs: Map<MemoryPoolType, MemoryPoolConfig> = new Map();
  private cache: Map<string, CacheItem> = new Map();
  private cacheStrategy: CacheStrategy = 'LRU';
  
  // 全局配置
  private config = {
    maxTotalMemory: 2 * 1024 * 1024 * 1024, // 2GB
    cacheMaxSize: 512 * 1024 * 1024, // 512MB
    gcInterval: 30000, // 30秒
    memoryPressureCheckInterval: 5000, // 5秒
    leakDetectionEnabled: true,
    compressionEnabled: true,
    prefetchEnabled: true,
    adaptiveCachingEnabled: true
  };
  
  // 运行时状态
  private stats: MemoryStats;
  private gcTimer: NodeJS.Timeout | null = null;
  private pressureTimer: NodeJS.Timeout | null = null;
  private leakDetectionTimer: NodeJS.Timeout | null = null;

  constructor(options: Partial<typeof MemoryManager.prototype.config> = {}) {
    super();
    this.config = { ...this.config, ...options };
    
    // 初始化内存池
    this.initializeMemoryPools();
    
    // 初始化统计信息
    this.stats = this.createInitialStats();
    
    // 启动定期任务
    this.startGCTimer();
    this.startMemoryPressureMonitoring();
    
    if (this.config.leakDetectionEnabled) {
      this.startLeakDetection();
    }
    
    console.log('🧠 MemoryManager初始化完成');
  }

  // ==================== 内存池管理 ====================

  /**
   * 分配内存块
   */
  public allocate(type: MemoryPoolType, size: number, priority: MemoryBlock['priority'] = 'medium', metadata?: Partial<MemoryBlock['metadata']>): string {
    // 检查内存压力
    if (this.getCurrentMemoryPressure() === 'critical') {
      this.performEmergencyCleanup();
    }
    
    const pool = this.pools.get(type) || [];
    const config = this.poolConfigs.get(type)!;
    
    // 寻找可用的内存块
    let block = pool.find(b => !b.allocated && b.size >= size);
    
    if (!block) {
      // 创建新的内存块
      block = this.createMemoryBlock(type, Math.max(size, config.blockSize), priority, metadata);
      pool.push(block);
      this.pools.set(type, pool);
    } else {
      // 重用现有块
      block.allocated = true;
      block.lastAccessed = Date.now();
      block.accessCount++;
      block.priority = priority;
    }
    
    this.updateStats();
    
    this.emit('memory_allocated', {
      blockId: block.id,
      type,
      size: block.size,
      timestamp: Date.now()
    });
    
    return block.id;
  }

  /**
   * 释放内存块
   */
  public deallocate(blockId: string): void {
    let foundBlock: MemoryBlock | null = null;
    let foundType: MemoryPoolType | null = null;
    
    // 查找要释放的内存块
    for (const [type, pool] of this.pools.entries()) {
      const block = pool.find(b => b.id === blockId);
      if (block) {
        foundBlock = block;
        foundType = type;
        break;
      }
    }
    
    if (!foundBlock || !foundType) {
      console.warn(`内存块 ${blockId} 未找到`);
      return;
    }
    
    // 标记为未分配
    foundBlock.allocated = false;
    foundBlock.data = null; // 清理数据引用
    foundBlock.lastAccessed = Date.now();
    
    this.updateStats();
    
    this.emit('memory_deallocated', {
      blockId,
      type: foundType,
      size: foundBlock.size,
      timestamp: Date.now()
    });
    
    // 检查是否需要回收池
    this.checkPoolShrinkage(foundType);
  }

  /**
   * 获取内存块数据
   */
  public getData(blockId: string): any {
    for (const pool of this.pools.values()) {
      const block = pool.find(b => b.id === blockId && b.allocated);
      if (block) {
        block.lastAccessed = Date.now();
        block.accessCount++;
        return block.data;
      }
    }
    return null;
  }

  /**
   * 设置内存块数据
   */
  public setData(blockId: string, data: any): void {
    for (const pool of this.pools.values()) {
      const block = pool.find(b => b.id === blockId && b.allocated);
      if (block) {
        block.data = data;
        block.lastAccessed = Date.now();
        block.size = this.calculateDataSize(data);
        this.updateStats();
        return;
      }
    }
    throw new Error(`内存块 ${blockId} 未找到或未分配`);
  }

  // ==================== 智能缓存系统 ====================

  /**
   * 缓存数据
   */
  public cacheSet<T>(key: string, data: T, options: {
    expiresIn?: number;
    priority?: number;
    tags?: string[];
  } = {}): void {
    const size = this.calculateDataSize(data);
    const now = Date.now();
    
    // 检查缓存容量
    if (this.getCacheSize() + size > this.config.cacheMaxSize) {
      this.evictCacheItems(size);
    }
    
    const item: CacheItem<T> = {
      key,
      data,
      size,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      expiresAt: options.expiresIn ? now + options.expiresIn : undefined,
      priority: options.priority || 1,
      tags: options.tags || []
    };
    
    this.cache.set(key, item);
    
    this.emit('cache_set', { key, size, timestamp: now });
  }

  /**
   * 获取缓存数据
   */
  public cacheGet<T>(key: string): T | null {
    const item = this.cache.get(key) as CacheItem<T> | undefined;
    
    if (!item) {
      this.emit('cache_miss', { key, timestamp: Date.now() });
      return null;
    }
    
    // 检查过期
    if (item.expiresAt && Date.now() > item.expiresAt) {
      this.cache.delete(key);
      this.emit('cache_expiry', { key, timestamp: Date.now() });
      return null;
    }
    
    // 更新访问信息
    item.lastAccessed = Date.now();
    item.accessCount++;
    
    this.emit('cache_hit', { key, timestamp: Date.now() });
    return item.data;
  }

  /**
   * 删除缓存
   */
  public cacheDelete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.emit('cache_delete', { key, timestamp: Date.now() });
    }
    return deleted;
  }

  /**
   * 按标签清理缓存
   */
  public cacheClearByTags(tags: string[]): number {
    let clearedCount = 0;
    
    for (const [key, item] of this.cache.entries()) {
      if (item.tags.some(tag => tags.includes(tag))) {
        this.cache.delete(key);
        clearedCount++;
      }
    }
    
    this.emit('cache_bulk_clear', { tags, count: clearedCount, timestamp: Date.now() });
    return clearedCount;
  }

  // ==================== 垃圾回收和优化 ====================

  /**
   * 执行垃圾回收
   */
  public performGC(): void {
    const startTime = Date.now();
    let cleanedBlocks = 0;
    let freedMemory = 0;
    
    // 清理未使用的内存块
    for (const [type, pool] of this.pools.entries()) {
      const config = this.poolConfigs.get(type)!;
      const cutoffTime = Date.now() - (config.gcThreshold * 1000);
      
      const toRemove = pool.filter(block => 
        !block.allocated && 
        block.lastAccessed < cutoffTime &&
        block.priority !== 'critical'
      );
      
      for (const block of toRemove) {
        freedMemory += block.size;
        cleanedBlocks++;
      }
      
      const remaining = pool.filter(block => !toRemove.includes(block));
      this.pools.set(type, remaining);
    }
    
    // 清理过期缓存
    const expiredKeys = Array.from(this.cache.entries())
      .filter(([_, item]) => item.expiresAt && Date.now() > item.expiresAt)
      .map(([key]) => key);
    
    expiredKeys.forEach(key => this.cache.delete(key));
    
    const gcTime = Date.now() - startTime;
    this.stats.global.gcCount++;
    this.stats.global.gcTime += gcTime;
    
    this.updateStats();
    
    this.emit('gc_completed', {
      cleanedBlocks,
      freedMemory,
      expiredCacheItems: expiredKeys.length,
      duration: gcTime,
      timestamp: Date.now()
    });
    
    console.log(`🧹 GC完成: 清理 ${cleanedBlocks} 个内存块, 释放 ${(freedMemory / 1024 / 1024).toFixed(2)}MB`);
  }

  /**
   * 应急清理
   */
  private performEmergencyCleanup(): void {
    console.warn('🚨 内存压力过高，执行应急清理...');
    
    // 1. 强制GC
    this.performGC();
    
    // 2. 清理低优先级内存块
    for (const pool of this.pools.values()) {
      pool.filter(block => !block.allocated && block.priority === 'low')
           .forEach(block => {
             block.data = null;
           });
    }
    
    // 3. 清理一半的缓存
    const cacheKeys = Array.from(this.cache.keys());
    const toDelete = cacheKeys.slice(0, Math.floor(cacheKeys.length / 2));
    toDelete.forEach(key => this.cache.delete(key));
    
    // 4. 强制浏览器GC (如果可用)
    if ((window as any).gc) {
      (window as any).gc();
    }
    
    this.emit('emergency_cleanup', {
      timestamp: Date.now(),
      freedCacheItems: toDelete.length
    });
  }

  // ==================== 内存压力监控 ====================

  private getCurrentMemoryPressure(): MemoryPressureLevel {
    const totalUsed = this.getTotalMemoryUsage();
    const usage = totalUsed / this.config.maxTotalMemory;
    
    if (usage > 0.9) return 'critical';
    if (usage > 0.8) return 'high';
    if (usage > 0.6) return 'medium';
    if (usage > 0.3) return 'low';
    return 'none';
  }

  private startMemoryPressureMonitoring(): void {
    this.pressureTimer = setInterval(() => {
      const pressure = this.getCurrentMemoryPressure();
      const previousPressure = this.stats.global.memoryPressure;
      
      if (pressure !== previousPressure) {
        this.emit('memory_pressure_changed', {
          from: previousPressure,
          to: pressure,
          timestamp: Date.now()
        });
        
        // 根据压力等级采取措施
        if (pressure === 'high' || pressure === 'critical') {
          this.performGC();
        }
      }
      
      this.stats.global.memoryPressure = pressure as any;
    }, this.config.memoryPressureCheckInterval);
  }

  // ==================== 内存泄漏检测 ====================

  private startLeakDetection(): void {
    const initialHeapSize = this.getHeapSize();
    let growthCount = 0;
    
    this.leakDetectionTimer = setInterval(() => {
      const currentHeapSize = this.getHeapSize();
      const growth = currentHeapSize - initialHeapSize;
      const growthPercentage = (growth / initialHeapSize) * 100;
      
      if (growthPercentage > 50) { // 内存增长超过50%
        growthCount++;
        
        if (growthCount >= 3) { // 连续3次检测到增长
          this.emit('memory_leak_detected', {
            initialSize: initialHeapSize,
            currentSize: currentHeapSize,
            growthPercentage,
            timestamp: Date.now()
          });
          
          console.warn(`🔍 检测到可能的内存泄漏: 增长 ${growthPercentage.toFixed(1)}%`);
          growthCount = 0; // 重置计数器
        }
      } else {
        growthCount = 0;
      }
    }, 60000); // 每分钟检查一次
  }

  // ==================== 缓存策略实现 ====================

  private evictCacheItems(requiredSpace: number): void {
    const items = Array.from(this.cache.entries())
      .map(([key, item]) => ({ key, ...item }));
    
    let freedSpace = 0;
    const toRemove: string[] = [];
    
    switch (this.cacheStrategy) {
      case 'LRU':
        items.sort((a, b) => a.lastAccessed - b.lastAccessed);
        break;
      case 'LFU':
        items.sort((a, b) => a.accessCount - b.accessCount);
        break;
      case 'FIFO':
        items.sort((a, b) => a.timestamp - b.timestamp);
        break;
      case 'adaptive':
        items.sort((a, b) => {
          const scoreA = a.accessCount / (Date.now() - a.timestamp) * a.priority;
          const scoreB = b.accessCount / (Date.now() - b.timestamp) * b.priority;
          return scoreA - scoreB;
        });
        break;
    }
    
    for (const item of items) {
      if (freedSpace >= requiredSpace) break;
      
      toRemove.push(item.key);
      freedSpace += item.size;
    }
    
    toRemove.forEach(key => this.cache.delete(key));
    
    this.emit('cache_eviction', {
      strategy: this.cacheStrategy,
      itemsRemoved: toRemove.length,
      spaceFreed: freedSpace,
      timestamp: Date.now()
    });
  }

  // ==================== 工具方法 ====================

  private initializeMemoryPools(): void {
    const poolTypes: MemoryPoolType[] = ['geometry', 'texture', 'buffer', 'computation', 'cache'];
    
    const defaultConfigs: Record<MemoryPoolType, MemoryPoolConfig> = {
      geometry: {
        maxSize: 512 * 1024 * 1024, // 512MB
        blockSize: 1024 * 1024, // 1MB
        growthFactor: 1.5,
        shrinkThreshold: 0.3,
        gcThreshold: 300, // 5分钟
        preallocationEnabled: true
      },
      texture: {
        maxSize: 256 * 1024 * 1024, // 256MB
        blockSize: 512 * 1024, // 512KB
        growthFactor: 2.0,
        shrinkThreshold: 0.25,
        gcThreshold: 600, // 10分钟
        preallocationEnabled: false
      },
      buffer: {
        maxSize: 128 * 1024 * 1024, // 128MB
        blockSize: 64 * 1024, // 64KB
        growthFactor: 1.25,
        shrinkThreshold: 0.4,
        gcThreshold: 180, // 3分钟
        preallocationEnabled: true
      },
      computation: {
        maxSize: 1024 * 1024 * 1024, // 1GB
        blockSize: 4 * 1024 * 1024, // 4MB
        growthFactor: 1.8,
        shrinkThreshold: 0.2,
        gcThreshold: 120, // 2分钟
        preallocationEnabled: false
      },
      cache: {
        maxSize: 256 * 1024 * 1024, // 256MB
        blockSize: 256 * 1024, // 256KB
        growthFactor: 1.4,
        shrinkThreshold: 0.35,
        gcThreshold: 480, // 8分钟
        preallocationEnabled: true
      }
    };
    
    for (const type of poolTypes) {
      this.pools.set(type, []);
      this.poolConfigs.set(type, defaultConfigs[type]);
      
      // 预分配（如果启用）
      if (defaultConfigs[type].preallocationEnabled) {
        this.preallocatePool(type);
      }
    }
  }

  private preallocatePool(type: MemoryPoolType): void {
    const config = this.poolConfigs.get(type)!;
    const pool = this.pools.get(type)!;
    
    // 预分配几个块
    const preallocationCount = 3;
    for (let i = 0; i < preallocationCount; i++) {
      const block = this.createMemoryBlock(type, config.blockSize, 'medium');
      pool.push(block);
    }
    
    console.log(`🏗️ 预分配内存池 ${type}: ${preallocationCount} 个块`);
  }

  private createMemoryBlock(
    type: MemoryPoolType, 
    size: number, 
    priority: MemoryBlock['priority'], 
    metadata?: Partial<MemoryBlock['metadata']>
  ): MemoryBlock {
    const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      id,
      type,
      size,
      allocated: false,
      lastAccessed: Date.now(),
      accessCount: 0,
      priority,
      metadata: {
        createdAt: Date.now(),
        owner: 'system',
        description: `${type} memory block`,
        tags: [],
        ...metadata
      }
    };
  }

  private checkPoolShrinkage(type: MemoryPoolType): void {
    const pool = this.pools.get(type)!;
    const config = this.poolConfigs.get(type)!;
    
    const totalBlocks = pool.length;
    const allocatedBlocks = pool.filter(b => b.allocated).length;
    const utilizationRate = allocatedBlocks / totalBlocks;
    
    if (utilizationRate < config.shrinkThreshold && totalBlocks > 5) {
      // 移除一些未使用的块
      const toRemove = Math.floor(totalBlocks * 0.2); // 移除20%
      const unallocated = pool.filter(b => !b.allocated).slice(0, toRemove);
      
      const remaining = pool.filter(b => !unallocated.includes(b));
      this.pools.set(type, remaining);
      
      console.log(`📉 收缩内存池 ${type}: 移除 ${toRemove} 个块`);
    }
  }

  private updateStats(): void {
    const global = {
      totalAllocated: this.getTotalMemoryUsage(),
      peakUsage: Math.max(this.stats?.global?.peakUsage || 0, this.getTotalMemoryUsage()),
      gcCount: this.stats?.global?.gcCount || 0,
      gcTime: this.stats?.global?.gcTime || 0,
      memoryPressure: this.getCurrentMemoryPressure() as any,
      leakDetectionEnabled: this.config.leakDetectionEnabled
    };
    
    const pools = {} as MemoryStats['pools'];
    
    for (const [type, pool] of this.pools.entries()) {
      const totalSize = pool.reduce((sum, block) => sum + block.size, 0);
      const usedSize = pool.filter(b => b.allocated).reduce((sum, block) => sum + block.size, 0);
      const freeSize = totalSize - usedSize;
      const blockCount = pool.length;
      
      pools[type] = {
        totalSize,
        usedSize,
        freeSize,
        blockCount,
        fragmentation: this.calculateFragmentation(pool),
        hitRate: 0.95 // 简化实现
      };
    }
    
    this.stats = { pools, global };
  }

  private calculateFragmentation(pool: MemoryBlock[]): number {
    if (pool.length === 0) return 0;
    
    const sortedBlocks = pool.filter(b => !b.allocated).sort((a, b) => a.size - b.size);
    if (sortedBlocks.length === 0) return 0;
    
    const totalFreeSize = sortedBlocks.reduce((sum, block) => sum + block.size, 0);
    const largestFreeBlock = sortedBlocks[sortedBlocks.length - 1].size;
    
    return 1 - (largestFreeBlock / totalFreeSize);
  }

  private getTotalMemoryUsage(): number {
    let total = 0;
    
    for (const pool of this.pools.values()) {
      total += pool.filter(b => b.allocated).reduce((sum, block) => sum + block.size, 0);
    }
    
    total += this.getCacheSize();
    
    return total;
  }

  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, item) => sum + item.size, 0);
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length * 2; // 粗略估算，考虑UTF-16编码
  }

  private getHeapSize(): number {
    const memInfo = (performance as any).memory;
    return memInfo ? memInfo.usedJSHeapSize : 0;
  }

  private createInitialStats(): MemoryStats {
    return {
      pools: {
        geometry: { totalSize: 0, usedSize: 0, freeSize: 0, blockCount: 0, fragmentation: 0, hitRate: 0 },
        texture: { totalSize: 0, usedSize: 0, freeSize: 0, blockCount: 0, fragmentation: 0, hitRate: 0 },
        buffer: { totalSize: 0, usedSize: 0, freeSize: 0, blockCount: 0, fragmentation: 0, hitRate: 0 },
        computation: { totalSize: 0, usedSize: 0, freeSize: 0, blockCount: 0, fragmentation: 0, hitRate: 0 },
        cache: { totalSize: 0, usedSize: 0, freeSize: 0, blockCount: 0, fragmentation: 0, hitRate: 0 }
      },
      global: {
        totalAllocated: 0,
        peakUsage: 0,
        gcCount: 0,
        gcTime: 0,
        memoryPressure: 'none' as any,
        leakDetectionEnabled: this.config.leakDetectionEnabled
      }
    };
  }

  private startGCTimer(): void {
    this.gcTimer = setInterval(() => {
      this.performGC();
    }, this.config.gcInterval);
  }

  // ==================== 公共API ====================

  public getStats(): MemoryStats {
    this.updateStats();
    return { ...this.stats };
  }

  public getMemoryUsageReport(): {
    summary: {
      totalUsed: number;
      totalAllocated: number;
      utilizationRate: number;
      fragmentation: number;
      pressure: MemoryPressureLevel;
    };
    pools: Record<MemoryPoolType, {
      usage: number;
      efficiency: number;
      recommendations: string[];
    }>;
    cache: {
      size: number;
      hitRate: number;
      items: number;
      strategy: CacheStrategy;
    };
  } {
    const stats = this.getStats();
    
    const totalUsed = stats.global.totalAllocated;
    const totalAllocated = this.config.maxTotalMemory;
    const utilizationRate = totalUsed / totalAllocated;
    
    const poolReports = {} as any;
    for (const [type, poolStats] of Object.entries(stats.pools)) {
      const efficiency = poolStats.totalSize > 0 ? poolStats.usedSize / poolStats.totalSize : 0;
      const recommendations: string[] = [];
      
      if (efficiency < 0.3) {
        recommendations.push('考虑收缩内存池大小');
      }
      if (poolStats.fragmentation > 0.5) {
        recommendations.push('执行内存整理以减少碎片');
      }
      if (poolStats.hitRate < 0.8) {
        recommendations.push('优化内存访问模式');
      }
      
      poolReports[type] = {
        usage: poolStats.usedSize,
        efficiency,
        recommendations
      };
    }
    
    return {
      summary: {
        totalUsed,
        totalAllocated,
        utilizationRate,
        fragmentation: Object.values(stats.pools).reduce((sum, p) => sum + p.fragmentation, 0) / 5,
        pressure: this.getCurrentMemoryPressure()
      },
      pools: poolReports,
      cache: {
        size: this.getCacheSize(),
        hitRate: 0.9, // 简化实现
        items: this.cache.size,
        strategy: this.cacheStrategy
      }
    };
  }

  public setCacheStrategy(strategy: CacheStrategy): void {
    this.cacheStrategy = strategy;
    this.emit('cache_strategy_changed', { strategy, timestamp: Date.now() });
  }

  public compactMemory(): void {
    console.log('🔧 开始内存整理...');
    
    // 执行完整的GC
    this.performGC();
    
    // 整理内存池
    for (const [type, pool] of this.pools.entries()) {
      const allocated = pool.filter(b => b.allocated);
      const free = pool.filter(b => !b.allocated).slice(0, 3); // 保留少量空闲块
      this.pools.set(type, [...allocated, ...free]);
    }
    
    this.emit('memory_compacted', { timestamp: Date.now() });
    console.log('✅ 内存整理完成');
  }

  public dispose(): void {
    // 停止所有定时器
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
      this.gcTimer = null;
    }
    
    if (this.pressureTimer) {
      clearInterval(this.pressureTimer);
      this.pressureTimer = null;
    }
    
    if (this.leakDetectionTimer) {
      clearInterval(this.leakDetectionTimer);
      this.leakDetectionTimer = null;
    }
    
    // 清理所有内存
    this.pools.clear();
    this.cache.clear();
    this.removeAllListeners();
    
    console.log('🧠 MemoryManager已清理');
  }
}

// 导出单例实例
export const memoryManager = new MemoryManager();

// 导出类型
export type { 
  MemoryBlock, 
  MemoryPoolConfig, 
  MemoryStats, 
  CacheItem, 
  MemoryPressureLevel 
};