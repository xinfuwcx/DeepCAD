/**
 * 性能分析工具
 * 监控应用性能和资源使用情况
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

/**
 * 性能指标接口
 */
export interface PerformanceMetrics {
  memory?: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    usage: number; // 百分比
  };
  timing?: {
    navigationStart: number;
    domainLookupStart: number;
    domainLookupEnd: number;
    connectStart: number;
    connectEnd: number;
    requestStart: number;
    responseStart: number;
    responseEnd: number;
    domLoading: number;
    domInteractive: number;
    domContentLoadedEventStart: number;
    domContentLoadedEventEnd: number;
    domComplete: number;
    loadEventStart: number;
    loadEventEnd: number;
  };
  fps?: number;
  paintMetrics?: {
    firstPaint?: number;
    firstContentfulPaint?: number;
    largestContentfulPaint?: number;
  };
  resourceTiming?: PerformanceResourceTiming[];
  customMetrics?: Record<string, number>;
}

/**
 * 性能警告级别
 */
export enum PerformanceWarningLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * 性能警告接口
 */
export interface PerformanceWarning {
  level: PerformanceWarningLevel;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
}

/**
 * 性能分析器类
 */
export class PerformanceAnalyzer {
  private static instance: PerformanceAnalyzer;
  private metrics: PerformanceMetrics = {};
  private warnings: PerformanceWarning[] = [];
  private observers: PerformanceObserver[] = [];
  private isMonitoring = false;
  private monitoringInterval?: number;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];

  // 性能阈值配置
  private readonly thresholds = {
    memory: {
      usage: { medium: 70, high: 85, critical: 95 }, // 内存使用百分比
      heapSize: { medium: 100 * 1024 * 1024, high: 200 * 1024 * 1024, critical: 500 * 1024 * 1024 } // 堆大小 (bytes)
    },
    fps: {
      low: { medium: 45, high: 30, critical: 15 }, // FPS
    },
    timing: {
      domContentLoaded: { medium: 2000, high: 5000, critical: 10000 }, // DOM加载时间 (ms)
      loadComplete: { medium: 5000, high: 10000, critical: 20000 }, // 页面完全加载时间 (ms)
      firstContentfulPaint: { medium: 1500, high: 3000, critical: 6000 } // FCP时间 (ms)
    }
  };

  private constructor() {
    this.initializeObservers();
  }

  /**
   * 获取单例实例
   */
  public static getInstance(): PerformanceAnalyzer {
    if (!PerformanceAnalyzer.instance) {
      PerformanceAnalyzer.instance = new PerformanceAnalyzer();
    }
    return PerformanceAnalyzer.instance;
  }

  /**
   * 初始化性能观察器
   */
  private initializeObservers(): void {
    if (typeof window === 'undefined' || !window.PerformanceObserver) {
      console.warn('PerformanceObserver not supported');
      return;
    }

    try {
      // 监控导航时间
      const navigationObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'navigation') {
            const navEntry = entry as PerformanceNavigationTiming;
            this.updateNavigationMetrics(navEntry);
          }
        });
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });
      this.observers.push(navigationObserver);

      // 监控绘制时间
      const paintObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (entry.entryType === 'paint') {
            this.updatePaintMetrics(entry as PerformancePaintTiming);
          }
        });
      });
      paintObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(paintObserver);

      // 监控最大内容绘制
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.paintMetrics = {
            ...this.metrics.paintMetrics,
            largestContentfulPaint: lastEntry.startTime
          };
          this.checkPaintMetrics();
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // 监控资源加载
      const resourceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries() as PerformanceResourceTiming[];
        this.metrics.resourceTiming = entries;
        this.analyzeResourcePerformance(entries);
      });
      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);

    } catch (error) {
      console.warn('Failed to initialize performance observers:', error);
    }
  }

  /**
   * 更新导航指标
   */
  private updateNavigationMetrics(entry: PerformanceNavigationTiming): void {
    this.metrics.timing = {
      navigationStart: entry.startTime,
      domainLookupStart: entry.domainLookupStart,
      domainLookupEnd: entry.domainLookupEnd,
      connectStart: entry.connectStart,
      connectEnd: entry.connectEnd,
      requestStart: entry.requestStart,
      responseStart: entry.responseStart,
      responseEnd: entry.responseEnd,
      domLoading: entry.startTime + 100, // 估算值
      domInteractive: entry.domInteractive,
      domContentLoadedEventStart: entry.domContentLoadedEventStart,
      domContentLoadedEventEnd: entry.domContentLoadedEventEnd,
      domComplete: entry.domComplete,
      loadEventStart: entry.loadEventStart,
      loadEventEnd: entry.loadEventEnd
    };

    this.checkTimingMetrics();
  }

  /**
   * 更新绘制指标
   */
  private updatePaintMetrics(entry: PerformancePaintTiming): void {
    if (!this.metrics.paintMetrics) {
      this.metrics.paintMetrics = {};
    }

    if (entry.name === 'first-paint') {
      this.metrics.paintMetrics.firstPaint = entry.startTime;
    } else if (entry.name === 'first-contentful-paint') {
      this.metrics.paintMetrics.firstContentfulPaint = entry.startTime;
    }

    this.checkPaintMetrics();
  }

  /**
   * 检查时间指标并生成警告
   */
  private checkTimingMetrics(): void {
    if (!this.metrics.timing) return;

    const timing = this.metrics.timing;
    
    // 检查DOM内容加载时间
    const domContentLoadedTime = timing.domContentLoadedEventEnd - timing.navigationStart;
    this.checkThreshold(
      'domContentLoaded',
      domContentLoadedTime,
      this.thresholds.timing.domContentLoaded,
      `DOM内容加载时间: ${domContentLoadedTime}ms`
    );

    // 检查页面完全加载时间
    if (timing.loadEventEnd > 0) {
      const loadCompleteTime = timing.loadEventEnd - timing.navigationStart;
      this.checkThreshold(
        'loadComplete',
        loadCompleteTime,
        this.thresholds.timing.loadComplete,
        `页面完全加载时间: ${loadCompleteTime}ms`
      );
    }
  }

  /**
   * 检查绘制指标并生成警告
   */
  private checkPaintMetrics(): void {
    if (!this.metrics.paintMetrics) return;

    const paintMetrics = this.metrics.paintMetrics;

    if (paintMetrics.firstContentfulPaint) {
      this.checkThreshold(
        'firstContentfulPaint',
        paintMetrics.firstContentfulPaint,
        this.thresholds.timing.firstContentfulPaint,
        `首次内容绘制时间: ${paintMetrics.firstContentfulPaint}ms`
      );
    }
  }

  /**
   * 分析资源性能
   */
  private analyzeResourcePerformance(entries: PerformanceResourceTiming[]): void {
    const slowResources = entries.filter(entry => entry.duration > 1000);
    
    slowResources.forEach(resource => {
      this.addWarning({
        level: resource.duration > 3000 ? PerformanceWarningLevel.HIGH : PerformanceWarningLevel.MEDIUM,
        message: `资源加载缓慢: ${resource.name} (${Math.round(resource.duration)}ms)`,
        metric: 'resourceTiming',
        value: resource.duration,
        threshold: 1000,
        timestamp: Date.now()
      });
    });
  }

  /**
   * 开始性能监控
   */
  public startMonitoring(interval = 5000): void {
    if (this.isMonitoring) {
      console.warn('Performance monitoring is already running');
      return;
    }

    this.isMonitoring = true;
    this.monitoringInterval = window.setInterval(() => {
      this.updateMemoryMetrics();
      this.updateFPSMetrics();
      this.notifyCallbacks();
    }, interval);

    console.log('Performance monitoring started');
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    console.log('Performance monitoring stopped');
  }

  /**
   * 更新内存指标
   */
  private updateMemoryMetrics(): void {
    if ('memory' in performance && (performance as any).memory) {
      const memory = (performance as any).memory;
      const usage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

      this.metrics.memory = {
        usedJSHeapSize: memory.usedJSHeapSize,
        totalJSHeapSize: memory.totalJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        usage
      };

      // 检查内存使用率
      this.checkThreshold(
        'memoryUsage',
        usage,
        this.thresholds.memory.usage,
        `内存使用率: ${usage.toFixed(1)}%`
      );

      // 检查堆大小
      this.checkThreshold(
        'heapSize',
        memory.usedJSHeapSize,
        this.thresholds.memory.heapSize,
        `JS堆大小: ${Math.round(memory.usedJSHeapSize / 1024 / 1024)}MB`
      );
    }
  }

  /**
   * 更新FPS指标
   */
  private updateFPSMetrics(): void {
    let fps = 0;
    let lastTime = performance.now();
    let frames = 0;

    const measureFPS = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        this.metrics.fps = fps;
        
        // 检查FPS
        this.checkThreshold(
          'fps',
          fps,
          this.thresholds.fps.low,
          `FPS: ${fps}`,
          true // 低值警告
        );
        
        frames = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(measureFPS);
    };

    requestAnimationFrame(measureFPS);
  }

  /**
   * 检查性能阈值
   */
  private checkThreshold(
    metric: string,
    value: number,
    thresholds: { medium: number; high: number; critical: number },
    message: string,
    isLowValueWarning = false
  ): void {
    let level: PerformanceWarningLevel | null = null;

    if (isLowValueWarning) {
      // 对于FPS等低值警告
      if (value <= thresholds.critical) {
        level = PerformanceWarningLevel.CRITICAL;
      } else if (value <= thresholds.high) {
        level = PerformanceWarningLevel.HIGH;
      } else if (value <= thresholds.medium) {
        level = PerformanceWarningLevel.MEDIUM;
      }
    } else {
      // 对于正常的高值警告
      if (value >= thresholds.critical) {
        level = PerformanceWarningLevel.CRITICAL;
      } else if (value >= thresholds.high) {
        level = PerformanceWarningLevel.HIGH;
      } else if (value >= thresholds.medium) {
        level = PerformanceWarningLevel.MEDIUM;
      }
    }

    if (level) {
      this.addWarning({
        level,
        message,
        metric,
        value,
        threshold: isLowValueWarning ? thresholds.medium : thresholds.medium,
        timestamp: Date.now()
      });
    }
  }

  /**
   * 添加性能警告
   */
  private addWarning(warning: PerformanceWarning): void {
    // 避免重复警告（5分钟内相同指标的警告）
    const recentWarning = this.warnings.find(w => 
      w.metric === warning.metric && 
      w.level === warning.level &&
      Date.now() - w.timestamp < 5 * 60 * 1000
    );

    if (!recentWarning) {
      this.warnings.push(warning);
      
      // 限制警告数量
      if (this.warnings.length > 100) {
        this.warnings = this.warnings.slice(-50);
      }

      console.warn(`Performance Warning [${warning.level.toUpperCase()}]:`, warning.message);
    }
  }

  /**
   * 添加自定义指标
   */
  public addCustomMetric(name: string, value: number): void {
    if (!this.metrics.customMetrics) {
      this.metrics.customMetrics = {};
    }
    this.metrics.customMetrics[name] = value;
  }

  /**
   * 测量代码执行时间
   */
  public measure<T>(name: string, fn: () => T): T {
    const startTime = performance.now();
    const result = fn();
    const endTime = performance.now();
    
    this.addCustomMetric(`${name}_duration`, endTime - startTime);
    
    return result;
  }

  /**
   * 异步测量代码执行时间
   */
  public async measureAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    const result = await fn();
    const endTime = performance.now();
    
    this.addCustomMetric(`${name}_duration`, endTime - startTime);
    
    return result;
  }

  /**
   * 注册性能更新回调
   */
  public onMetricsUpdate(callback: (metrics: PerformanceMetrics) => void): () => void {
    this.callbacks.push(callback);
    
    // 返回取消注册函数
    return () => {
      const index = this.callbacks.indexOf(callback);
      if (index > -1) {
        this.callbacks.splice(index, 1);
      }
    };
  }

  /**
   * 通知回调函数
   */
  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => {
      try {
        callback(this.metrics);
      } catch (error) {
        console.error('Performance callback error:', error);
      }
    });
  }

  /**
   * 获取当前性能指标
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取性能警告
   */
  public getWarnings(): PerformanceWarning[] {
    return [...this.warnings];
  }

  /**
   * 清除所有警告
   */
  public clearWarnings(): void {
    this.warnings = [];
  }

  /**
   * 获取性能报告
   */
  public getPerformanceReport(): {
    metrics: PerformanceMetrics;
    warnings: PerformanceWarning[];
    summary: {
      warningCount: number;
      criticalCount: number;
      overallStatus: 'good' | 'warning' | 'critical';
    };
  } {
    const criticalCount = this.warnings.filter(w => w.level === PerformanceWarningLevel.CRITICAL).length;
    const warningCount = this.warnings.length;
    
    let overallStatus: 'good' | 'warning' | 'critical' = 'good';
    if (criticalCount > 0) {
      overallStatus = 'critical';
    } else if (warningCount > 0) {
      overallStatus = 'warning';
    }

    return {
      metrics: this.getMetrics(),
      warnings: this.getWarnings(),
      summary: {
        warningCount,
        criticalCount,
        overallStatus
      }
    };
  }

  /**
   * 销毁分析器
   */
  public destroy(): void {
    this.stopMonitoring();
    this.callbacks = [];
    this.warnings = [];
    this.metrics = {};
  }
}

// 导出单例实例
export const performanceAnalyzer = PerformanceAnalyzer.getInstance();

// 导出便捷函数
export const measurePerformance = <T>(name: string, fn: () => T): T => {
  return performanceAnalyzer.measure(name, fn);
};

export const measurePerformanceAsync = <T>(name: string, fn: () => Promise<T>): Promise<T> => {
  return performanceAnalyzer.measureAsync(name, fn);
};
