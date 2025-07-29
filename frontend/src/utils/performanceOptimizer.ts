/**
 * 性能优化工具集
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

/**
 * 防抖函数 - 优化用户交互性能
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number,
  immediate = false
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      if (!immediate) func.apply(this, args);
    };
    
    const callNow = immediate && !timeout;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(this, args);
  };
}

/**
 * 节流函数 - 优化滚动和重绘性能
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * 内存使用监控
 */
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private samples: number[] = [];
  private maxSamples = 100;

  static getInstance(): MemoryMonitor {
    if (!this.instance) {
      this.instance = new MemoryMonitor();
    }
    return this.instance;
  }

  getMemoryUsage(): {
    used: number;
    total: number;
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
  } {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      const totalMB = Math.round(memory.totalJSHeapSize / 1024 / 1024);
      const percentage = Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100);

      // 记录样本用于趋势分析
      this.samples.push(usedMB);
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }

      const trend = this.analyzeTrend();

      return {
        used: usedMB,
        total: totalMB,
        percentage,
        trend
      };
    }

    // 浏览器不支持内存API时的默认值
    return {
      used: 128,
      total: 512,
      percentage: 25,
      trend: 'stable' as const
    };
  }

  private analyzeTrend(): 'increasing' | 'decreasing' | 'stable' {
    if (this.samples.length < 10) return 'stable';

    const recent = this.samples.slice(-10);
    const older = this.samples.slice(-20, -10);

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = 5; // MB

    if (diff > threshold) return 'increasing';
    if (diff < -threshold) return 'decreasing';
    return 'stable';
  }

  clearSamples(): void {
    this.samples = [];
  }
}

/**
 * FPS监控器
 */
export class FPSMonitor {
  private lastTime = 0;
  private frameCount = 0;
  private fps = 60;
  private samples: number[] = [];
  private maxSamples = 60; // 1秒的样本

  update(): number {
    const now = performance.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // 记录FPS样本
      this.samples.push(this.fps);
      if (this.samples.length > this.maxSamples) {
        this.samples.shift();
      }
    }

    return this.fps;
  }

  getFPS(): number {
    return this.fps;
  }

  getAverageFPS(): number {
    if (this.samples.length === 0) return 60;
    return Math.round(this.samples.reduce((a, b) => a + b, 0) / this.samples.length);
  }

  getMinFPS(): number {
    if (this.samples.length === 0) return 60;
    return Math.min(...this.samples);
  }

  getPerformanceRating(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avgFPS = this.getAverageFPS();
    if (avgFPS >= 55) return 'excellent';
    if (avgFPS >= 45) return 'good';
    if (avgFPS >= 30) return 'fair';
    return 'poor';
  }
}

/**
 * 组件重渲染优化器
 */
export class RenderOptimizer {
  private static renderCounts = new Map<string, number>();
  private static lastRenderTime = new Map<string, number>();

  static trackRender(componentName: string): void {
    const now = performance.now();
    const count = this.renderCounts.get(componentName) || 0;
    const lastTime = this.lastRenderTime.get(componentName) || 0;

    this.renderCounts.set(componentName, count + 1);
    this.lastRenderTime.set(componentName, now);

    // 检测频繁重渲染
    if (now - lastTime < 16) { // 少于一帧的时间
      console.warn(`⚠️ 组件 ${componentName} 可能存在频繁重渲染问题`);
    }
  }

  static getRenderStats(): Array<{
    component: string;
    renderCount: number;
    lastRender: number;
  }> {
    const stats: Array<{
      component: string;
      renderCount: number;
      lastRender: number;
    }> = [];

    this.renderCounts.forEach((count, component) => {
      stats.push({
        component,
        renderCount: count,
        lastRender: this.lastRenderTime.get(component) || 0
      });
    });

    return stats.sort((a, b) => b.renderCount - a.renderCount);
  }

  static clearStats(): void {
    this.renderCounts.clear();
    this.lastRenderTime.clear();
  }
}

/**
 * 资源清理工具
 */
export class ResourceCleaner {
  private static disposables: Array<() => void> = [];

  static register(cleanup: () => void): void {
    this.disposables.push(cleanup);
  }

  static cleanup(): void {
    this.disposables.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        console.warn('资源清理失败:', error);
      }
    });
    this.disposables = [];
  }

  static getResourceCount(): number {
    return this.disposables.length;
  }
}

/**
 * 全局性能监控实例
 */
export const globalMemoryMonitor = MemoryMonitor.getInstance();
export const globalFPSMonitor = new FPSMonitor();

// 页面卸载时自动清理资源
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    ResourceCleaner.cleanup();
  });

  // 开发环境下的性能监控
  if (process.env.NODE_ENV === 'development') {
    setInterval(() => {
      const memory = globalMemoryMonitor.getMemoryUsage();
      const fps = globalFPSMonitor.getFPS();
      const rating = globalFPSMonitor.getPerformanceRating();
      
      console.log(`📊 性能监控 - FPS: ${fps} (${rating}), 内存: ${memory.used}MB/${memory.total}MB (${memory.percentage}%, ${memory.trend})`);
    }, 10000); // 每10秒输出一次
  }
}
