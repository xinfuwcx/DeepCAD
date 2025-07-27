/**
 * 性能监控和优化工具模块
 */

import React, { useCallback, useEffect, useState } from 'react';

// 性能指标接口
export interface PerformanceMetrics {
  // 基础指标
  fps: number;
  memoryUsage: number;
  loadTime: number;
  renderTime: number;
  
  // 网络指标
  networkLatency: number;
  downloadSpeed: number;
  
  // 用户体验指标
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
  
  // 自定义指标
  meshGenerationTime?: number;
  dxfProcessingTime?: number;
  sceneRenderTime?: number;
}

// 性能监控类
export class PerformanceMonitor {
  private metrics: Partial<PerformanceMetrics> = {};
  private observers: PerformanceObserver[] = [];
  private intervals: NodeJS.Timeout[] = [];
  
  constructor() {
    this.initializeObservers();
    this.startMonitoring();
  }

  // 初始化性能观察器
  private initializeObservers() {
    // Web Vitals观察器
    if (typeof PerformanceObserver !== 'undefined') {
      // LCP观察器
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        this.metrics.largestContentfulPaint = lastEntry.startTime;
      });

      // FID观察器
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
        });
      });

      // CLS观察器
      const clsObserver = new PerformanceObserver((list) => {
        let clsValue = 0;
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        this.metrics.cumulativeLayoutShift = clsValue;
      });

      try {
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        fidObserver.observe({ entryTypes: ['first-input'] });
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        
        this.observers.push(lcpObserver, fidObserver, clsObserver);
      } catch (error) {
        console.warn('某些性能观察器不被支持:', error);
      }
    }
  }

  // 开始监控
  private startMonitoring() {
    // FPS监控
    this.startFPSMonitoring();
    
    // 内存监控
    this.startMemoryMonitoring();
    
    // 网络监控
    this.startNetworkMonitoring();
  }

  // FPS监控
  private startFPSMonitoring() {
    let lastTime = performance.now();
    let frameCount = 0;
    
    const measureFPS = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        this.metrics.fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };
    
    requestAnimationFrame(measureFPS);
  }

  // 内存监控
  private startMemoryMonitoring() {
    const interval = setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = memory.usedJSHeapSize / memory.totalJSHeapSize;
      }
    }, 1000);
    
    this.intervals.push(interval);
  }

  // 网络监控
  private startNetworkMonitoring() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.downloadSpeed = connection.downlink;
      this.metrics.networkLatency = connection.rtt;
      
      connection.addEventListener('change', () => {
        this.metrics.downloadSpeed = connection.downlink;
        this.metrics.networkLatency = connection.rtt;
      });
    }
  }

  // 测量FCP
  measureFCP(): Promise<number> {
    return new Promise((resolve) => {
      if (typeof PerformanceObserver !== 'undefined') {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
          if (fcpEntry) {
            this.metrics.firstContentfulPaint = fcpEntry.startTime;
            resolve(fcpEntry.startTime);
            observer.disconnect();
          }
        });
        
        try {
          observer.observe({ entryTypes: ['paint'] });
        } catch {
          resolve(0);
        }
      } else {
        resolve(0);
      }
    });
  }

  // 测量页面加载时间
  measureLoadTime(): number {
    if (typeof performance !== 'undefined' && performance.timing) {
      const loadTime = performance.timing.loadEventEnd - performance.timing.navigationStart;
      this.metrics.loadTime = loadTime;
      return loadTime;
    }
    return 0;
  }

  // 测量自定义操作时间
  async measureOperation<T>(
    operation: () => Promise<T> | T,
    metricName: keyof PerformanceMetrics
  ): Promise<T> {
    const startTime = performance.now();
    const result = await operation();
    const endTime = performance.now();
    
    (this.metrics as any)[metricName] = endTime - startTime;
    return result;
  }

  // 获取当前指标
  getMetrics(): Partial<PerformanceMetrics> {
    return { ...this.metrics };
  }

  // 获取性能分数
  getPerformanceScore(): number {
    const weights = {
      fps: 0.25,
      memoryUsage: 0.2,
      loadTime: 0.2,
      firstContentfulPaint: 0.15,
      largestContentfulPaint: 0.1,
      firstInputDelay: 0.1
    };

    let score = 100;
    
    // FPS评分 (60fps = 100分)
    if (this.metrics.fps) {
      score *= weights.fps * Math.min(this.metrics.fps / 60, 1);
    }
    
    // 内存使用评分 (使用率低于50% = 100分)
    if (this.metrics.memoryUsage) {
      score *= weights.memoryUsage * Math.max(0, 1 - this.metrics.memoryUsage * 2);
    }
    
    // 加载时间评分 (小于2秒 = 100分)
    if (this.metrics.loadTime) {
      score *= weights.loadTime * Math.max(0, 1 - this.metrics.loadTime / 2000);
    }
    
    // FCP评分 (小于1.8秒 = 100分)
    if (this.metrics.firstContentfulPaint) {
      score *= weights.firstContentfulPaint * Math.max(0, 1 - this.metrics.firstContentfulPaint / 1800);
    }
    
    // LCP评分 (小于2.5秒 = 100分)
    if (this.metrics.largestContentfulPaint) {
      score *= weights.largestContentfulPaint * Math.max(0, 1 - this.metrics.largestContentfulPaint / 2500);
    }
    
    // FID评分 (小于100ms = 100分)
    if (this.metrics.firstInputDelay) {
      score *= weights.firstInputDelay * Math.max(0, 1 - this.metrics.firstInputDelay / 100);
    }

    return Math.round(score);
  }

  // 生成性能报告
  generateReport(): {
    score: number;
    metrics: Partial<PerformanceMetrics>;
    recommendations: string[];
  } {
    const score = this.getPerformanceScore();
    const recommendations: string[] = [];

    // 生成优化建议
    if (this.metrics.fps && this.metrics.fps < 30) {
      recommendations.push('帧率过低，建议优化渲染性能或降低场景复杂度');
    }
    
    if (this.metrics.memoryUsage && this.metrics.memoryUsage > 0.8) {
      recommendations.push('内存使用率过高，建议优化内存管理或释放不必要的资源');
    }
    
    if (this.metrics.loadTime && this.metrics.loadTime > 3000) {
      recommendations.push('页面加载时间过长，建议优化资源加载或使用代码分割');
    }
    
    if (this.metrics.largestContentfulPaint && this.metrics.largestContentfulPaint > 2500) {
      recommendations.push('最大内容绘制时间过长，建议优化关键资源的加载顺序');
    }
    
    if (this.metrics.firstInputDelay && this.metrics.firstInputDelay > 100) {
      recommendations.push('首次输入延迟过高，建议优化JavaScript执行或使用Web Workers');
    }

    return {
      score,
      metrics: this.metrics,
      recommendations
    };
  }

  // 清理监控
  destroy() {
    this.observers.forEach(observer => observer.disconnect());
    this.intervals.forEach(interval => clearInterval(interval));
    this.observers = [];
    this.intervals = [];
  }
}

// 资源优化工具
export class ResourceOptimizer {
  private loadedResources = new Set<string>();
  private resourceCache = new Map<string, any>();
  
  // 预加载关键资源
  async preloadCriticalResources(resources: string[]): Promise<void> {
    const promises = resources.map(url => this.preloadResource(url));
    await Promise.allSettled(promises);
  }

  // 预加载单个资源
  private preloadResource(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.loadedResources.has(url)) {
        resolve();
        return;
      }

      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = url;
      
      // 根据文件扩展名设置资源类型
      if (url.endsWith('.js')) {
        link.as = 'script';
      } else if (url.endsWith('.css')) {
        link.as = 'style';
      } else if (url.match(/\.(woff2?|ttf|eot)$/)) {
        link.as = 'font';
        link.crossOrigin = 'anonymous';
      } else if (url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/)) {
        link.as = 'image';
      }

      link.onload = () => {
        this.loadedResources.add(url);
        resolve();
      };
      
      link.onerror = () => reject(new Error(`Failed to preload ${url}`));
      
      document.head.appendChild(link);
    });
  }

  // 懒加载组件
  createLazyComponent<T extends React.ComponentType<any>>(
    importFn: () => Promise<{ default: T }>
  ): React.LazyExoticComponent<T> {
    return React.lazy(importFn);
  }

  // 图片懒加载
  observeImageLazyLoad(): IntersectionObserver {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    return imageObserver;
  }

  // 内存优化
  optimizeMemory() {
    // 清理未使用的缓存
    this.cleanupCache();
    
    // 强制垃圾回收 (仅在支持的环境中)
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
  }

  // 清理缓存
  private cleanupCache() {
    const maxCacheSize = 50;
    if (this.resourceCache.size > maxCacheSize) {
      const keysToDelete = Array.from(this.resourceCache.keys()).slice(0, this.resourceCache.size - maxCacheSize);
      keysToDelete.forEach(key => this.resourceCache.delete(key));
    }
  }

  // 缓存资源
  cacheResource(key: string, resource: any): void {
    this.resourceCache.set(key, resource);
  }

  // 获取缓存资源
  getCachedResource(key: string): any {
    return this.resourceCache.get(key);
  }

  // 检查资源是否已缓存
  isResourceCached(key: string): boolean {
    return this.resourceCache.has(key);
  }
}

// 渲染优化工具
export class RenderOptimizer {
  private frameCallbacks: (() => void)[] = [];
  private isScheduled = false;

  // 批量DOM更新
  batchDOMUpdates(callback: () => void): void {
    this.frameCallbacks.push(callback);
    
    if (!this.isScheduled) {
      this.isScheduled = true;
      requestAnimationFrame(() => {
        this.frameCallbacks.forEach(cb => cb());
        this.frameCallbacks = [];
        this.isScheduled = false;
      });
    }
  }

  // 虚拟滚动优化
  calculateVisibleItems(
    containerHeight: number,
    itemHeight: number,
    scrollTop: number,
    totalItems: number
  ): { startIndex: number; endIndex: number; visibleItems: number } {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    const buffer = Math.floor(visibleItems * 0.5); // 50% buffer
    
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
    const endIndex = Math.min(totalItems - 1, startIndex + visibleItems + buffer * 2);

    return { startIndex, endIndex, visibleItems };
  }

  // 防抖处理
  debounce<T extends (...args: any[]) => any>(
    func: T,
    wait: number
  ): (...args: Parameters<T>) => void {
    let timeout: NodeJS.Timeout;
    
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // 节流处理
  throttle<T extends (...args: any[]) => any>(
    func: T,
    limit: number
  ): (...args: Parameters<T>) => void {
    let inThrottle: boolean;
    
    return (...args: Parameters<T>) => {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }
}

// 网络优化工具
export class NetworkOptimizer {
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private maxConcurrentRequests = 6;
  private activeRequests = 0;

  // 请求队列管理
  async queueRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          this.activeRequests++;
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.activeRequests--;
          this.processQueue();
        }
      });
      
      this.processQueue();
    });
  }

  // 处理请求队列
  private processQueue(): void {
    if (this.isProcessing || this.activeRequests >= this.maxConcurrentRequests) {
      return;
    }

    const nextRequest = this.requestQueue.shift();
    if (nextRequest) {
      this.isProcessing = true;
      nextRequest().finally(() => {
        this.isProcessing = false;
        if (this.requestQueue.length > 0) {
          this.processQueue();
        }
      });
    }
  }

  // HTTP/2 服务器推送优化
  enableServerPush(resources: string[]): void {
    resources.forEach(resource => {
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = resource;
      document.head.appendChild(link);
    });
  }

  // 请求缓存
  private requestCache = new Map<string, Promise<any>>();

  async cachedRequest<T>(
    url: string,
    options?: RequestInit,
    ttl: number = 300000 // 5分钟默认TTL
  ): Promise<T> {
    const cacheKey = `${url}_${JSON.stringify(options)}`;
    
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey);
    }

    const request = fetch(url, options).then(response => response.json());
    this.requestCache.set(cacheKey, request);

    // TTL清理
    setTimeout(() => {
      this.requestCache.delete(cacheKey);
    }, ttl);

    return request;
  }
}

// 全局性能管理器
export class GlobalPerformanceManager {
  private monitor: PerformanceMonitor;
  private optimizer: ResourceOptimizer;
  private renderOptimizer: RenderOptimizer;
  private networkOptimizer: NetworkOptimizer;
  
  constructor() {
    this.monitor = new PerformanceMonitor();
    this.optimizer = new ResourceOptimizer();
    this.renderOptimizer = new RenderOptimizer();
    this.networkOptimizer = new NetworkOptimizer();
  }

  // 获取所有性能工具
  getTools() {
    return {
      monitor: this.monitor,
      optimizer: this.optimizer,
      renderOptimizer: this.renderOptimizer,
      networkOptimizer: this.networkOptimizer
    };
  }

  // 应用全局优化策略
  applyGlobalOptimizations(): void {
    // 预加载关键资源
    this.optimizer.preloadCriticalResources([
      '/fonts/Inter-Regular.woff2',
      '/css/critical.css',
      '/js/core.js'
    ]);

    // 设置图片懒加载
    const imageObserver = this.optimizer.observeImageLazyLoad();
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });

    // 启用网络优化
    this.networkOptimizer.enableServerPush([
      '/api/user/profile',
      '/api/projects/recent'
    ]);
  }

  // 获取综合性能报告
  getComprehensiveReport() {
    const performanceReport = this.monitor.generateReport();
    
    return {
      ...performanceReport,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      connection: this.getConnectionInfo(),
      environment: this.getEnvironmentInfo()
    };
  }

  // 获取连接信息
  private getConnectionInfo() {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      return {
        effectiveType: connection.effectiveType,
        downlink: connection.downlink,
        rtt: connection.rtt,
        saveData: connection.saveData
      };
    }
    return null;
  }

  // 获取环境信息
  private getEnvironmentInfo() {
    return {
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      screen: {
        width: screen.width,
        height: screen.height,
        pixelRatio: devicePixelRatio
      },
      memory: 'memory' in performance ? {
        used: (performance as any).memory.usedJSHeapSize,
        total: (performance as any).memory.totalJSHeapSize,
        limit: (performance as any).memory.jsHeapSizeLimit
      } : null
    };
  }

  // 清理所有资源
  destroy(): void {
    this.monitor.destroy();
  }
}

// 导出默认实例
export const performanceManager = new GlobalPerformanceManager();

// React Hooks
export const usePerformanceMonitor = () => {
  const [metrics, setMetrics] = React.useState<Partial<PerformanceMetrics>>({});
  
  React.useEffect(() => {
    const interval = setInterval(() => {
      setMetrics(performanceManager.getTools().monitor.getMetrics());
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return metrics;
};

export const useResourceOptimizer = () => {
  return performanceManager.getTools().optimizer;
};

export const useRenderOptimizer = () => {
  return performanceManager.getTools().renderOptimizer;
};