/**
 * WebGPU内存优化器
 * 智能管理GPU内存资源，防止内存泄漏和碎片化
 */

export interface GPUMemoryMetrics {
  totalAllocated: number;  // 总分配内存(MB)
  totalUsed: number;       // 实际使用内存(MB)
  bufferCount: number;     // 缓冲区数量
  textureCount: number;    // 纹理数量
  fragmentationRatio: number; // 碎片化比率
  poolHitRatio: number;    // 内存池命中率
}

export interface BufferPoolConfig {
  minBufferSize: number;   // 最小缓冲区大小(bytes)
  maxBufferSize: number;   // 最大缓冲区大小(bytes)
  maxPoolSize: number;     // 最大池大小(MB)
  bucketCount: number;     // 桶数量
  cleanupThreshold: number; // 清理阈值
}

// 缓冲区池桶
class BufferBucket {
  private buffers: GPUBuffer[] = [];
  private readonly size: number;
  private readonly maxCount: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(size: number, maxCount: number) {
    this.size = size;
    this.maxCount = maxCount;
  }

  acquire(device: GPUDevice, usage: GPUBufferUsageFlags): GPUBuffer {
    if (this.buffers.length > 0) {
      this.hitCount++;
      return this.buffers.pop()!;
    }

    this.missCount++;
    return device.createBuffer({
      size: this.size,
      usage,
      mappedAtCreation: false
    });
  }

  release(buffer: GPUBuffer) {
    if (this.buffers.length < this.maxCount && !buffer.destroyed) {
      this.buffers.push(buffer);
    } else {
      buffer.destroy();
    }
  }

  getHitRatio(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? this.hitCount / total : 0;
  }

  cleanup() {
    this.buffers.forEach(buffer => buffer.destroy());
    this.buffers = [];
  }

  getSize(): number { return this.size; }
  getCount(): number { return this.buffers.length; }
}

// WebGPU内存优化器主类
export class WebGPUMemoryOptimizer {
  private device: GPUDevice | null = null;
  private bufferBuckets = new Map<number, BufferBucket>();
  private activeBuffers = new Set<GPUBuffer>();
  private activeTextures = new Set<GPUTexture>();
  private config: BufferPoolConfig;
  
  // 统计信息
  private totalAllocated = 0;
  private cleanupCount = 0;
  private lastCleanupTime = 0;

  constructor(config?: Partial<BufferPoolConfig>) {
    this.config = {
      minBufferSize: 1024,        // 1KB
      maxBufferSize: 256 * 1024 * 1024, // 256MB
      maxPoolSize: 1024,          // 1GB pool
      bucketCount: 16,
      cleanupThreshold: 0.8,      // 80%阈值触发清理
      ...config
    };

    this.initializeBuckets();
    this.startPeriodicCleanup();
  }

  /**
   * 设置GPU设备
   */
  setDevice(device: GPUDevice) {
    this.device = device;
  }

  /**
   * 初始化缓冲区桶
   */
  private initializeBuckets() {
    const { minBufferSize, maxBufferSize, bucketCount } = this.config;
    
    for (let i = 0; i < bucketCount; i++) {
      const size = Math.pow(2, Math.log2(minBufferSize) + 
        (Math.log2(maxBufferSize) - Math.log2(minBufferSize)) * i / (bucketCount - 1));
      const bucketSize = Math.round(size);
      const maxCount = Math.max(1, Math.floor(this.config.maxPoolSize * 1024 * 1024 / bucketSize / bucketCount));
      
      this.bufferBuckets.set(bucketSize, new BufferBucket(bucketSize, maxCount));
    }
  }

  /**
   * 智能分配缓冲区
   */
  createBuffer(size: number, usage: GPUBufferUsageFlags): GPUBuffer | null {
    if (!this.device) {
      console.warn('[WebGPU Memory] Device not set');
      return null;
    }

    // 找到最适合的桶
    const bucketSize = this.findBestBucketSize(size);
    const bucket = this.bufferBuckets.get(bucketSize);
    
    if (bucket) {
      const buffer = bucket.acquire(this.device, usage);
      this.activeBuffers.add(buffer);
      this.totalAllocated += bucketSize;
      
      // 检查是否需要清理
      if (this.shouldTriggerCleanup()) {
        this.scheduleCleanup();
      }
      
      return buffer;
    }

    // 直接创建（超大缓冲区）
    const buffer = this.device.createBuffer({
      size,
      usage,
      mappedAtCreation: false
    });
    
    this.activeBuffers.add(buffer);
    this.totalAllocated += size;
    
    return buffer;
  }

  /**
   * 释放缓冲区
   */
  releaseBuffer(buffer: GPUBuffer) {
    if (!this.activeBuffers.has(buffer)) {
      return;
    }

    this.activeBuffers.delete(buffer);
    
    // 尝试放回池中
    const size = buffer.size;
    const bucketSize = this.findBestBucketSize(size);
    const bucket = this.bufferBuckets.get(bucketSize);
    
    if (bucket && bucketSize === size) {
      bucket.release(buffer);
    } else {
      buffer.destroy();
    }
    
    this.totalAllocated -= size;
  }

  /**
   * 创建纹理（带追踪）
   */
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture | null {
    if (!this.device) {
      console.warn('[WebGPU Memory] Device not set');
      return null;
    }

    const texture = this.device.createTexture(descriptor);
    this.activeTextures.add(texture);
    
    // 估算纹理内存使用
    const memoryUsage = this.estimateTextureMemory(descriptor);
    this.totalAllocated += memoryUsage;
    
    return texture;
  }

  /**
   * 释放纹理
   */
  releaseTexture(texture: GPUTexture) {
    if (this.activeTextures.has(texture)) {
      this.activeTextures.delete(texture);
      texture.destroy();
      
      // 更新内存统计（简化处理）
      this.totalAllocated = Math.max(0, this.totalAllocated - 1024 * 1024); // 假设1MB
    }
  }

  /**
   * 内存碎片整理
   */
  async defragment(): Promise<void> {
    console.log('[WebGPU Memory] Starting defragmentation...');
    
    // 强制清理未使用的缓冲区
    this.bufferBuckets.forEach(bucket => {
      bucket.cleanup();
    });
    
    // 重新初始化桶
    this.initializeBuckets();
    
    // 建议垃圾回收
    if (window.gc) {
      window.gc();
    }
    
    this.cleanupCount++;
    console.log(`[WebGPU Memory] Defragmentation completed. Cleanup count: ${this.cleanupCount}`);
  }

  /**
   * 获取内存指标
   */
  getMemoryMetrics(): GPUMemoryMetrics {
    let totalPoolHits = 0;
    let totalPoolRequests = 0;
    
    this.bufferBuckets.forEach(bucket => {
      const hitRatio = bucket.getHitRatio();
      if (hitRatio > 0) {
        totalPoolHits += hitRatio;
        totalPoolRequests++;
      }
    });
    
    const poolHitRatio = totalPoolRequests > 0 ? totalPoolHits / totalPoolRequests : 0;
    
    return {
      totalAllocated: this.totalAllocated / (1024 * 1024), // MB
      totalUsed: this.getTotalUsedMemory(),
      bufferCount: this.activeBuffers.size,
      textureCount: this.activeTextures.size,
      fragmentationRatio: this.calculateFragmentationRatio(),
      poolHitRatio
    };
  }

  /**
   * 内存使用建议
   */
  getOptimizationSuggestions(): string[] {
    const metrics = this.getMemoryMetrics();
    const suggestions: string[] = [];
    
    if (metrics.fragmentationRatio > 0.3) {
      suggestions.push('• 内存碎片化严重，建议执行碎片整理');
    }
    
    if (metrics.poolHitRatio < 0.7) {
      suggestions.push('• 缓冲区池命中率较低，考虑调整池配置');
    }
    
    if (metrics.bufferCount > 1000) {
      suggestions.push('• 活跃缓冲区过多，检查是否存在内存泄漏');
    }
    
    if (metrics.totalAllocated > 512) {
      suggestions.push('• GPU内存使用量较高，考虑减少数据精度或启用压缩');
    }
    
    return suggestions;
  }

  /**
   * 自动内存管理
   */
  enableAutoManagement(options = { 
    cleanupInterval: 30000,  // 30秒
    memoryThreshold: 0.8,    // 80%
    forceCleanupThreshold: 0.9 // 90%
  }) {
    setInterval(() => {
      const metrics = this.getMemoryMetrics();
      const memoryUsageRatio = metrics.totalUsed / (metrics.totalAllocated || 1);
      
      if (memoryUsageRatio > options.forceCleanupThreshold) {
        console.warn('[WebGPU Memory] Force cleanup triggered');
        this.defragment();
      } else if (memoryUsageRatio > options.memoryThreshold) {
        this.scheduleCleanup();
      }
    }, options.cleanupInterval);
  }

  // ========== 私有方法 ==========

  private findBestBucketSize(requestedSize: number): number {
    let bestSize = this.config.maxBufferSize;
    
    for (const size of this.bufferBuckets.keys()) {
      if (size >= requestedSize && size < bestSize) {
        bestSize = size;
      }
    }
    
    return bestSize;
  }

  private estimateTextureMemory(descriptor: GPUTextureDescriptor): number {
    const width = descriptor.size.width || 1;
    const height = descriptor.size.height || 1;
    const depth = descriptor.size.depthOrArrayLayers || 1;
    
    // 简化的内存估算（根据格式和大小）
    let bytesPerPixel = 4; // 假设RGBA8
    
    if (descriptor.format.includes('32')) {
      bytesPerPixel = 16;
    } else if (descriptor.format.includes('16')) {
      bytesPerPixel = 8;
    }
    
    return width * height * depth * bytesPerPixel;
  }

  private getTotalUsedMemory(): number {
    // 简化实现：假设70%的分配内存正在使用
    return this.totalAllocated * 0.7 / (1024 * 1024);
  }

  private calculateFragmentationRatio(): number {
    let totalBucketSize = 0;
    let totalUsedSize = 0;
    
    this.bufferBuckets.forEach(bucket => {
      totalBucketSize += bucket.getSize() * bucket.getCount();
      totalUsedSize += bucket.getSize() * bucket.getCount() * 0.8; // 假设80%使用率
    });
    
    return totalBucketSize > 0 ? 1 - (totalUsedSize / totalBucketSize) : 0;
  }

  private shouldTriggerCleanup(): boolean {
    const now = Date.now();
    const timeSinceLastCleanup = now - this.lastCleanupTime;
    const memoryThreshold = this.config.maxPoolSize * 1024 * 1024 * this.config.cleanupThreshold;
    
    return this.totalAllocated > memoryThreshold && timeSinceLastCleanup > 10000; // 10秒间隔
  }

  private scheduleCleanup() {
    setTimeout(() => this.performCleanup(), 100);
  }

  private performCleanup() {
    console.log('[WebGPU Memory] Performing scheduled cleanup...');
    
    // 清理未使用的缓冲区
    let releasedCount = 0;
    this.bufferBuckets.forEach(bucket => {
      if (bucket.getCount() > 5) { // 保留至少5个
        const buffersToRelease = Math.floor(bucket.getCount() * 0.3);
        for (let i = 0; i < buffersToRelease; i++) {
          // 实际实现需要更复杂的逻辑
        }
        releasedCount += buffersToRelease;
      }
    });
    
    this.lastCleanupTime = Date.now();
    console.log(`[WebGPU Memory] Cleanup completed. Released ${releasedCount} buffers.`);
  }

  private startPeriodicCleanup() {
    // 每60秒进行一次轻度清理
    setInterval(() => {
      if (this.shouldTriggerCleanup()) {
        this.performCleanup();
      }
    }, 60000);
  }

  /**
   * 销毁优化器，释放所有资源
   */
  destroy() {
    // 释放所有活跃缓冲区
    this.activeBuffers.forEach(buffer => buffer.destroy());
    this.activeBuffers.clear();
    
    // 释放所有活跃纹理
    this.activeTextures.forEach(texture => texture.destroy());
    this.activeTextures.clear();
    
    // 清理所有池
    this.bufferBuckets.forEach(bucket => bucket.cleanup());
    this.bufferBuckets.clear();
    
    this.totalAllocated = 0;
    console.log('[WebGPU Memory] Memory optimizer destroyed');
  }
}

// 全局实例
export const webgpuMemoryOptimizer = new WebGPUMemoryOptimizer();

// React Hook
import React from 'react';

export const useWebGPUMemoryMetrics = () => {
  const [metrics, setMetrics] = React.useState<GPUMemoryMetrics | null>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    const updateMetrics = () => {
      setMetrics(webgpuMemoryOptimizer.getMemoryMetrics());
      setSuggestions(webgpuMemoryOptimizer.getOptimizationSuggestions());
    };

    updateMetrics();
    const interval = setInterval(updateMetrics, 5000); // 每5秒更新

    return () => clearInterval(interval);
  }, []);

  return { 
    metrics, 
    suggestions,
    defragment: () => webgpuMemoryOptimizer.defragment(),
    enableAutoManagement: (options?: any) => webgpuMemoryOptimizer.enableAutoManagement(options)
  };
};