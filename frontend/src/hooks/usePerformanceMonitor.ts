/**
 * 性能监控React Hooks
 * 为React组件提供性能监控能力
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { 
  performanceAnalyzer, 
  PerformanceMetrics, 
  PerformanceWarning, 
  PerformanceWarningLevel 
} from '../utils/performanceAnalyzer';

/**
 * 性能监控Hook配置
 */
interface UsePerformanceMonitorOptions {
  /** 是否自动开始监控 */
  autoStart?: boolean;
  /** 监控间隔 (ms) */
  interval?: number;
  /** 是否在组件卸载时停止监控 */
  stopOnUnmount?: boolean;
  /** 警告级别过滤 */
  warningLevelFilter?: PerformanceWarningLevel[];
  /** 性能指标更新回调 */
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
  /** 警告回调 */
  onWarning?: (warning: PerformanceWarning) => void;
}

/**
 * 性能监控Hook返回值
 */
interface UsePerformanceMonitorReturn {
  /** 当前性能指标 */
  metrics: PerformanceMetrics;
  /** 性能警告列表 */
  warnings: PerformanceWarning[];
  /** 是否正在监控 */
  isMonitoring: boolean;
  /** 开始监控 */
  startMonitoring: () => void;
  /** 停止监控 */
  stopMonitoring: () => void;
  /** 清除警告 */
  clearWarnings: () => void;
  /** 添加自定义指标 */
  addCustomMetric: (name: string, value: number) => void;
  /** 性能报告 */
  performanceReport: {
    metrics: PerformanceMetrics;
    warnings: PerformanceWarning[];
    summary: {
      warningCount: number;
      criticalCount: number;
      overallStatus: 'good' | 'warning' | 'critical';
    };
  };
}

/**
 * 性能监控Hook
 */
export function usePerformanceMonitor(
  options: UsePerformanceMonitorOptions = {}
): UsePerformanceMonitorReturn {
  const {
    autoStart = false,
    interval = 5000,
    stopOnUnmount = true,
    warningLevelFilter,
    onMetricsUpdate,
    onWarning
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({});
  const [warnings, setWarnings] = useState<PerformanceWarning[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  
  const onMetricsUpdateRef = useRef(onMetricsUpdate);
  const onWarningRef = useRef(onWarning);
  
  // 更新ref
  useEffect(() => {
    onMetricsUpdateRef.current = onMetricsUpdate;
    onWarningRef.current = onWarning;
  }, [onMetricsUpdate, onWarning]);

  const startMonitoring = useCallback(() => {
    if (!isMonitoring) {
      performanceAnalyzer.startMonitoring(interval);
      setIsMonitoring(true);
    }
  }, [isMonitoring, interval]);

  const stopMonitoring = useCallback(() => {
    if (isMonitoring) {
      performanceAnalyzer.stopMonitoring();
      setIsMonitoring(false);
    }
  }, [isMonitoring]);

  const clearWarnings = useCallback(() => {
    performanceAnalyzer.clearWarnings();
    setWarnings([]);
  }, []);

  const addCustomMetric = useCallback((name: string, value: number) => {
    performanceAnalyzer.addCustomMetric(name, value);
  }, []);

  // 监听性能指标更新
  useEffect(() => {
    const unsubscribe = performanceAnalyzer.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      onMetricsUpdateRef.current?.(newMetrics);
    });

    return unsubscribe;
  }, []);

  // 监听警告更新
  useEffect(() => {
    const checkWarnings = () => {
      const currentWarnings = performanceAnalyzer.getWarnings();
      
      // 应用警告级别过滤
      const filteredWarnings = warningLevelFilter
        ? currentWarnings.filter(warning => warningLevelFilter.includes(warning.level))
        : currentWarnings;

      setWarnings(filteredWarnings);

      // 检查新警告
      const newWarnings = filteredWarnings.filter(warning => 
        !warnings.some(existing => 
          existing.metric === warning.metric && 
          existing.timestamp === warning.timestamp
        )
      );

      newWarnings.forEach(warning => {
        onWarningRef.current?.(warning);
      });
    };

    const intervalId = setInterval(checkWarnings, 1000);
    return () => clearInterval(intervalId);
  }, [warnings, warningLevelFilter]);

  // 自动开始监控
  useEffect(() => {
    if (autoStart) {
      startMonitoring();
    }

    return () => {
      if (stopOnUnmount) {
        stopMonitoring();
      }
    };
  }, [autoStart, startMonitoring, stopMonitoring, stopOnUnmount]);

  // 计算性能报告
  const performanceReport = useMemo(() => {
    return performanceAnalyzer.getPerformanceReport();
  }, [metrics, warnings]);

  return {
    metrics,
    warnings,
    isMonitoring,
    startMonitoring,
    stopMonitoring,
    clearWarnings,
    addCustomMetric,
    performanceReport
  };
}

/**
 * 组件渲染性能Hook
 */
interface UseRenderPerformanceOptions {
  /** 组件名称 */
  componentName: string;
  /** 是否启用 */
  enabled?: boolean;
  /** 日志阈值 (ms) */
  logThreshold?: number;
}

export function useRenderPerformance(options: UseRenderPerformanceOptions) {
  const { componentName, enabled = true, logThreshold = 16 } = options;
  const renderStartTime = useRef<number>(0);
  const renderCount = useRef<number>(0);
  const totalRenderTime = useRef<number>(0);

  useEffect(() => {
    if (!enabled) return;

    renderStartTime.current = performance.now();
    renderCount.current++;
  });

  useEffect(() => {
    if (!enabled) return;

    const renderTime = performance.now() - renderStartTime.current;
    totalRenderTime.current += renderTime;

    // 记录渲染性能指标
    performanceAnalyzer.addCustomMetric(`${componentName}_render_time`, renderTime);
    performanceAnalyzer.addCustomMetric(`${componentName}_render_count`, renderCount.current);
    performanceAnalyzer.addCustomMetric(
      `${componentName}_avg_render_time`, 
      totalRenderTime.current / renderCount.current
    );

    // 如果渲染时间超过阈值，记录警告
    if (renderTime > logThreshold) {
      console.warn(
        `Slow render detected in ${componentName}: ${renderTime.toFixed(2)}ms (render #${renderCount.current})`
      );
    }
  });

  return {
    renderCount: renderCount.current,
    averageRenderTime: renderCount.current > 0 ? totalRenderTime.current / renderCount.current : 0,
    totalRenderTime: totalRenderTime.current
  };
}

/**
 * 内存使用监控Hook
 */
interface UseMemoryMonitorOptions {
  /** 警告阈值 (MB) */
  warningThreshold?: number;
  /** 检查间隔 (ms) */
  checkInterval?: number;
  /** 内存泄漏检测 */
  enableLeakDetection?: boolean;
}

export function useMemoryMonitor(options: UseMemoryMonitorOptions = {}) {
  const { warningThreshold = 100, checkInterval = 5000, enableLeakDetection = true } = options;
  const [memoryUsage, setMemoryUsage] = useState<{
    used: number;
    total: number;
    percentage: number;
  }>({ used: 0, total: 0, percentage: 0 });
  
  const previousMemoryRef = useRef<number>(0);
  const memoryIncreaseCountRef = useRef<number>(0);

  useEffect(() => {
    const checkMemory = () => {
      if ('memory' in performance && (performance as any).memory) {
        const memory = (performance as any).memory;
        const used = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
        const total = Math.round(memory.totalJSHeapSize / 1024 / 1024); // MB
        const percentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;

        setMemoryUsage({ used, total, percentage });

        // 内存泄漏检测
        if (enableLeakDetection) {
          if (used > previousMemoryRef.current) {
            memoryIncreaseCountRef.current++;
          } else {
            memoryIncreaseCountRef.current = 0;
          }

          // 如果内存连续增长且超过阈值，可能存在内存泄漏
          if (memoryIncreaseCountRef.current > 5 && used > warningThreshold) {
            console.warn(
              `Potential memory leak detected! Memory usage: ${used}MB (increased ${memoryIncreaseCountRef.current} times)`
            );
          }

          previousMemoryRef.current = used;
        }

        // 记录内存指标
        performanceAnalyzer.addCustomMetric('memory_usage_mb', used);
        performanceAnalyzer.addCustomMetric('memory_percentage', percentage);
      }
    };

    const intervalId = setInterval(checkMemory, checkInterval);
    checkMemory(); // 立即执行一次

    return () => clearInterval(intervalId);
  }, [warningThreshold, checkInterval, enableLeakDetection]);

  return {
    memoryUsage,
    isHighUsage: memoryUsage.used > warningThreshold,
    hasMemoryData: 'memory' in performance && (performance as any).memory
  };
}

/**
 * 网络性能监控Hook
 */
interface NetworkPerformanceMetrics {
  connectionType?: string;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export function useNetworkPerformance() {
  const [networkMetrics, setNetworkMetrics] = useState<NetworkPerformanceMetrics>({});
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const updateNetworkInfo = () => {
      if ('connection' in navigator && (navigator as any).connection) {
        const connection = (navigator as any).connection;
        setNetworkMetrics({
          connectionType: connection.type,
          effectiveType: connection.effectiveType,
          downlink: connection.downlink,
          rtt: connection.rtt,
          saveData: connection.saveData
        });

        // 记录网络指标
        performanceAnalyzer.addCustomMetric('network_downlink', connection.downlink || 0);
        performanceAnalyzer.addCustomMetric('network_rtt', connection.rtt || 0);
      }
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    // 初始化
    updateNetworkInfo();

    // 监听网络状态变化
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 监听连接变化
    if ('connection' in navigator && (navigator as any).connection) {
      (navigator as any).connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('connection' in navigator && (navigator as any).connection) {
        (navigator as any).connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  return {
    networkMetrics,
    isOnline,
    hasNetworkInfo: 'connection' in navigator && (navigator as any).connection
  };
}

/**
 * 页面可见性性能Hook
 */
export function useVisibilityPerformance() {
  const [isVisible, setIsVisible] = useState(!document.hidden);
  const [visibilityChanges, setVisibilityChanges] = useState(0);
  const hiddenTimeRef = useRef<number>(0);
  const totalHiddenTimeRef = useRef<number>(0);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isCurrentlyVisible = !document.hidden;
      setIsVisible(isCurrentlyVisible);
      setVisibilityChanges(prev => prev + 1);

      if (isCurrentlyVisible) {
        // 页面变为可见
        if (hiddenTimeRef.current > 0) {
          const hiddenDuration = performance.now() - hiddenTimeRef.current;
          totalHiddenTimeRef.current += hiddenDuration;
          performanceAnalyzer.addCustomMetric('page_hidden_duration', hiddenDuration);
          performanceAnalyzer.addCustomMetric('total_hidden_time', totalHiddenTimeRef.current);
        }
      } else {
        // 页面变为隐藏
        hiddenTimeRef.current = performance.now();
      }

      performanceAnalyzer.addCustomMetric('visibility_changes', visibilityChanges + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [visibilityChanges]);

  return {
    isVisible,
    visibilityChanges,
    totalHiddenTime: totalHiddenTimeRef.current
  };
}

/**
 * 资源加载性能Hook
 */
export function useResourcePerformance() {
  const [resourceMetrics, setResourceMetrics] = useState<{
    totalResources: number;
    slowResources: number;
    averageLoadTime: number;
    cacheHitRate: number;
  }>({
    totalResources: 0,
    slowResources: 0,
    averageLoadTime: 0,
    cacheHitRate: 0
  });

  useEffect(() => {
    const analyzeResources = () => {
      const entries = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      
      if (entries.length === 0) return;

      const totalResources = entries.length;
      const slowResources = entries.filter(entry => entry.duration > 1000).length;
      const averageLoadTime = entries.reduce((sum, entry) => sum + entry.duration, 0) / totalResources;
      
      // 计算缓存命中率
      const cachedResources = entries.filter(entry => entry.transferSize === 0).length;
      const cacheHitRate = (cachedResources / totalResources) * 100;

      setResourceMetrics({
        totalResources,
        slowResources,
        averageLoadTime,
        cacheHitRate
      });

      // 记录资源性能指标
      performanceAnalyzer.addCustomMetric('total_resources', totalResources);
      performanceAnalyzer.addCustomMetric('slow_resources', slowResources);
      performanceAnalyzer.addCustomMetric('avg_resource_load_time', averageLoadTime);
      performanceAnalyzer.addCustomMetric('cache_hit_rate', cacheHitRate);
    };

    analyzeResources();
    
    const intervalId = setInterval(analyzeResources, 10000);
    return () => clearInterval(intervalId);
  }, []);

  return resourceMetrics;
}
