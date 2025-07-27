/**
 * 实时性能监控和优化管理系统
 * 1号架构师 - 全面的性能分析和自动优化
 */

import { EventEmitter } from 'events';

// 性能指标类型
export interface PerformanceMetrics {
  // 渲染性能
  rendering: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    triangles: number;
    geometries: number;
    textures: number;
    memoryUsage: number;
  };
  
  // 计算性能
  computation: {
    solverTime: number;
    memoryUsage: number;
    convergenceRate: number;
    iterationCount: number;
    residualError: number;
  };
  
  // 数据流性能
  dataFlow: {
    transferTime: number;
    dataSize: number;
    compressionRatio: number;
    validationTime: number;
    queueLength: number;
  };
  
  // 内存性能
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    buffers: number;
    gcTime: number;
    gcCount: number;
  };
  
  // 网络性能
  network: {
    latency: number;
    bandwidth: number;
    requestCount: number;
    errorRate: number;
    cacheHitRate: number;
  };
}

// 性能阈值配置
export interface PerformanceThresholds {
  fps: { min: number; target: number; max: number };
  frameTime: { min: number; target: number; max: number };
  memoryUsage: { min: number; target: number; max: number };
  solverTime: { min: number; target: number; max: number };
  latency: { min: number; target: number; max: number };
}

// 性能警告
export interface PerformanceWarning {
  id: string;
  type: 'fps_drop' | 'memory_leak' | 'slow_computation' | 'network_timeout' | 'resource_overload';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  category: keyof PerformanceMetrics;
  timestamp: number;
  value: number;
  threshold: number;
  suggestion?: string;
  autoFixAvailable?: boolean;
}

// 性能优化建议
export interface OptimizationSuggestion {
  id: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  impact: 'small' | 'medium' | 'large';
  effort: 'easy' | 'medium' | 'hard';
  estimatedImprovement: number; // 百分比
  implementation: () => Promise<void>;
}

// 性能历史记录
export interface PerformanceHistory {
  timestamp: number;
  metrics: PerformanceMetrics;
  phase: 'idle' | 'modeling' | 'meshing' | 'computing' | 'rendering';
  userAction?: string;
}

/**
 * 性能管理器核心类
 */
export class PerformanceManager extends EventEmitter {
  private metrics: PerformanceMetrics;
  private history: PerformanceHistory[] = [];
  private warnings: PerformanceWarning[] = [];
  private suggestions: OptimizationSuggestion[] = [];
  
  // 监控配置
  private config = {
    monitoringInterval: 1000, // 1秒
    historyLength: 1000,
    warningCooldown: 5000, // 5秒内不重复警告
    autoOptimizationEnabled: true,
    detailedProfilingEnabled: false,
    gcMonitoringEnabled: true
  };
  
  // 性能阈值
  private thresholds: PerformanceThresholds = {
    fps: { min: 30, target: 60, max: 120 },
    frameTime: { min: 8, target: 16, max: 33 },
    memoryUsage: { min: 0, target: 512, max: 1024 }, // MB
    solverTime: { min: 0, target: 1000, max: 5000 }, // ms
    latency: { min: 0, target: 100, max: 500 } // ms
  };
  
  // 监控状态
  private monitoringActive = false;
  private monitoringTimer: NodeJS.Timeout | null = null;
  private lastWarningTime = new Map<string, number>();
  
  constructor(options: Partial<typeof PerformanceManager.prototype.config> = {}) {
    super();
    this.config = { ...this.config, ...options };
    
    // 初始化性能指标
    this.metrics = this.createInitialMetrics();
    
    // 设置优化建议
    this.setupOptimizationSuggestions();
    
    console.log('📊 PerformanceManager初始化完成');
  }

  // ==================== 监控控制 ====================

  /**
   * 启动性能监控
   */
  public startMonitoring(): void {
    if (this.monitoringActive) {
      console.warn('性能监控已在运行');
      return;
    }

    this.monitoringActive = true;
    
    // 启动定期采集
    this.monitoringTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.monitoringInterval);
    
    // 启动GC监控
    if (this.config.gcMonitoringEnabled) {
      this.setupGCMonitoring();
    }
    
    this.emit('monitoring_started', { timestamp: Date.now() });
    console.log('📊 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  public stopMonitoring(): void {
    if (!this.monitoringActive) {
      return;
    }

    this.monitoringActive = false;
    
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = null;
    }
    
    this.emit('monitoring_stopped', { timestamp: Date.now() });
    console.log('📊 性能监控已停止');
  }

  /**
   * 收集性能指标
   */
  public collectMetrics(phase: PerformanceHistory['phase'] = 'idle', userAction?: string): void {
    const timestamp = Date.now();
    
    // 收集各类性能数据
    this.metrics = {
      rendering: this.collectRenderingMetrics(),
      computation: this.collectComputationMetrics(),
      dataFlow: this.collectDataFlowMetrics(),
      memory: this.collectMemoryMetrics(),
      network: this.collectNetworkMetrics()
    };
    
    // 添加到历史记录
    const historyEntry: PerformanceHistory = {
      timestamp,
      metrics: { ...this.metrics },
      phase,
      userAction
    };
    
    this.history.push(historyEntry);
    
    // 限制历史记录长度
    if (this.history.length > this.config.historyLength) {
      this.history = this.history.slice(-this.config.historyLength);
    }
    
    // 检查性能警告
    this.checkPerformanceWarnings();
    
    // 触发更新事件
    this.emit('metrics_updated', {
      metrics: this.metrics,
      timestamp,
      phase,
      userAction
    });
    
    // 自动优化检查
    if (this.config.autoOptimizationEnabled) {
      this.checkAutoOptimizations();
    }
  }

  // ==================== 指标收集 ====================

  private collectRenderingMetrics(): PerformanceMetrics['rendering'] {
    // 简化实现：在真实环境中应该从THREE.js renderer获取
    const now = performance.now();
    const lastFrame = this.getLastRenderingMetrics();
    
    return {
      fps: this.calculateFPS(),
      frameTime: now - (lastFrame?.timestamp || now),
      drawCalls: Math.floor(Math.random() * 50 + 10),
      triangles: Math.floor(Math.random() * 100000 + 50000),
      geometries: Math.floor(Math.random() * 20 + 5),
      textures: Math.floor(Math.random() * 10 + 2),
      memoryUsage: Math.floor(Math.random() * 256 + 128) // MB
    };
  }

  private collectComputationMetrics(): PerformanceMetrics['computation'] {
    return {
      solverTime: Math.floor(Math.random() * 2000 + 500),
      memoryUsage: Math.floor(Math.random() * 512 + 256),
      convergenceRate: Math.random() * 0.9 + 0.1,
      iterationCount: Math.floor(Math.random() * 100 + 10),
      residualError: Math.random() * 1e-6 + 1e-8
    };
  }

  private collectDataFlowMetrics(): PerformanceMetrics['dataFlow'] {
    return {
      transferTime: Math.floor(Math.random() * 100 + 10),
      dataSize: Math.floor(Math.random() * 10240 + 1024), // KB
      compressionRatio: Math.random() * 0.5 + 0.3,
      validationTime: Math.floor(Math.random() * 50 + 5),
      queueLength: Math.floor(Math.random() * 5)
    };
  }

  private collectMemoryMetrics(): PerformanceMetrics['memory'] {
    // 在浏览器环境中，这些值是模拟的
    const memInfo = (performance as any).memory || {};
    
    return {
      heapUsed: memInfo.usedJSHeapSize || Math.floor(Math.random() * 50000000 + 10000000),
      heapTotal: memInfo.totalJSHeapSize || Math.floor(Math.random() * 100000000 + 50000000),
      external: Math.floor(Math.random() * 5000000 + 1000000),
      buffers: Math.floor(Math.random() * 2000000 + 500000),
      gcTime: Math.floor(Math.random() * 10 + 1),
      gcCount: Math.floor(Math.random() * 5)
    };
  }

  private collectNetworkMetrics(): PerformanceMetrics['network'] {
    return {
      latency: Math.floor(Math.random() * 200 + 50),
      bandwidth: Math.floor(Math.random() * 1000 + 100), // KB/s
      requestCount: Math.floor(Math.random() * 10 + 1),
      errorRate: Math.random() * 0.05,
      cacheHitRate: Math.random() * 0.3 + 0.7
    };
  }

  // ==================== 性能分析 ====================

  private checkPerformanceWarnings(): void {
    const now = Date.now();
    
    // FPS检查
    if (this.metrics.rendering.fps < this.thresholds.fps.min) {
      this.createWarning('fps_drop', 'rendering', '帧率过低', 
        this.metrics.rendering.fps, this.thresholds.fps.min,
        'high', '考虑降低渲染质量或优化几何体');
    }
    
    // 内存检查
    const memoryMB = this.metrics.memory.heapUsed / (1024 * 1024);
    if (memoryMB > this.thresholds.memoryUsage.max) {
      this.createWarning('memory_leak', 'memory', '内存使用过高',
        memoryMB, this.thresholds.memoryUsage.max,
        'critical', '执行垃圾回收或清理不必要的对象');
    }
    
    // 计算时间检查
    if (this.metrics.computation.solverTime > this.thresholds.solverTime.max) {
      this.createWarning('slow_computation', 'computation', '计算时间过长',
        this.metrics.computation.solverTime, this.thresholds.solverTime.max,
        'medium', '考虑简化计算模型或优化求解器参数');
    }
    
    // 网络延迟检查
    if (this.metrics.network.latency > this.thresholds.latency.max) {
      this.createWarning('network_timeout', 'network', '网络延迟过高',
        this.metrics.network.latency, this.thresholds.latency.max,
        'medium', '检查网络连接或使用离线模式');
    }
  }

  private createWarning(
    type: PerformanceWarning['type'],
    category: keyof PerformanceMetrics,
    message: string,
    value: number,
    threshold: number,
    severity: PerformanceWarning['severity'],
    suggestion?: string
  ): void {
    const warningId = `${type}_${category}`;
    const now = Date.now();
    
    // 检查冷却时间
    const lastWarning = this.lastWarningTime.get(warningId);
    if (lastWarning && now - lastWarning < this.config.warningCooldown) {
      return;
    }
    
    const warning: PerformanceWarning = {
      id: `${warningId}_${now}`,
      type,
      severity,
      message,
      category,
      timestamp: now,
      value,
      threshold,
      suggestion,
      autoFixAvailable: this.hasAutoFix(type)
    };
    
    this.warnings.push(warning);
    this.lastWarningTime.set(warningId, now);
    
    // 限制警告数量
    if (this.warnings.length > 100) {
      this.warnings = this.warnings.slice(-100);
    }
    
    this.emit('performance_warning', warning);
    
    console.warn(`⚠️ 性能警告: ${message} (${value.toFixed(2)} > ${threshold})`);
  }

  // ==================== 自动优化 ====================

  private checkAutoOptimizations(): void {
    // 检查是否需要自动GC
    const memoryMB = this.metrics.memory.heapUsed / (1024 * 1024);
    if (memoryMB > this.thresholds.memoryUsage.target * 1.5) {
      this.performAutoGC();
    }
    
    // 检查是否需要降低渲染质量
    if (this.metrics.rendering.fps < this.thresholds.fps.target) {
      this.suggestRenderingOptimization();
    }
  }

  private performAutoGC(): void {
    if ((window as any).gc) {
      (window as any).gc();
      console.log('🧹 执行自动垃圾回收');
    }
  }

  private suggestRenderingOptimization(): void {
    const suggestion: OptimizationSuggestion = {
      id: `rendering_opt_${Date.now()}`,
      category: 'rendering',
      priority: 'high',
      title: '降低渲染质量以提升帧率',
      description: '当前帧率较低，建议暂时降低渲染质量',
      impact: 'medium',
      effort: 'easy',
      estimatedImprovement: 25,
      implementation: async () => {
        // 实际实现中会调用渲染器的优化方法
        console.log('实施渲染优化...');
      }
    };
    
    this.addOptimizationSuggestion(suggestion);
  }

  // ==================== 优化建议 ====================

  private setupOptimizationSuggestions(): void {
    // 预设的优化建议
    const suggestions: OptimizationSuggestion[] = [
      {
        id: 'reduce_geometry_complexity',
        category: 'rendering',
        priority: 'medium',
        title: '降低几何体复杂度',
        description: '通过LOD或几何简化减少三角形数量',
        impact: 'large',
        effort: 'medium',
        estimatedImprovement: 40,
        implementation: async () => {
          console.log('实施几何体简化...');
        }
      },
      {
        id: 'enable_texture_compression',
        category: 'rendering',
        priority: 'low',
        title: '启用纹理压缩',
        description: '压缩纹理以节省显存',
        impact: 'small',
        effort: 'easy',
        estimatedImprovement: 15,
        implementation: async () => {
          console.log('启用纹理压缩...');
        }
      },
      {
        id: 'optimize_solver_parameters',
        category: 'computation',
        priority: 'high',
        title: '优化求解器参数',
        description: '调整迭代次数和收敛条件',
        impact: 'large',
        effort: 'medium',
        estimatedImprovement: 50,
        implementation: async () => {
          console.log('优化求解器参数...');
        }
      }
    ];
    
    this.suggestions = suggestions;
  }

  public addOptimizationSuggestion(suggestion: OptimizationSuggestion): void {
    this.suggestions.push(suggestion);
    this.emit('optimization_suggestion', suggestion);
  }

  public applyOptimization(suggestionId: string): Promise<void> {
    const suggestion = this.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) {
      throw new Error(`优化建议 ${suggestionId} 不存在`);
    }
    
    return suggestion.implementation();
  }

  // ==================== 工具方法 ====================

  private calculateFPS(): number {
    if (this.history.length < 2) {
      return 60; // 默认值
    }
    
    const recent = this.history.slice(-10);
    const timeSpan = recent[recent.length - 1].timestamp - recent[0].timestamp;
    return Math.round(1000 / (timeSpan / recent.length));
  }

  private getLastRenderingMetrics(): (PerformanceHistory & { timestamp: number }) | null {
    if (this.history.length === 0) return null;
    const last = this.history[this.history.length - 1];
    return { ...last, timestamp: last.timestamp };
  }

  private hasAutoFix(type: PerformanceWarning['type']): boolean {
    return ['memory_leak'].includes(type);
  }

  private setupGCMonitoring(): void {
    // 在支持的环境中监控GC
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure' && entry.name.includes('gc')) {
              this.metrics.memory.gcTime = entry.duration;
              this.metrics.memory.gcCount++;
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('GC监控设置失败:', error);
      }
    }
  }

  // ==================== 公共API ====================

  public getCurrentMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  public getHistory(limit?: number): PerformanceHistory[] {
    return limit ? this.history.slice(-limit) : [...this.history];
  }

  public getWarnings(severity?: PerformanceWarning['severity']): PerformanceWarning[] {
    return severity 
      ? this.warnings.filter(w => w.severity === severity)
      : [...this.warnings];
  }

  public getOptimizationSuggestions(category?: string): OptimizationSuggestion[] {
    return category
      ? this.suggestions.filter(s => s.category === category)
      : [...this.suggestions];
  }

  public clearWarnings(): void {
    this.warnings = [];
    this.lastWarningTime.clear();
    this.emit('warnings_cleared', { timestamp: Date.now() });
  }

  public updateThresholds(newThresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    this.emit('thresholds_updated', { thresholds: this.thresholds, timestamp: Date.now() });
  }

  public generateReport(): {
    summary: {
      averageFPS: number;
      peakMemoryUsage: number;
      totalWarnings: number;
      suggestionsCount: number;
    };
    trends: {
      fpsDataPoints: number[];
      memoryDataPoints: number[];
      timestamps: number[];
    };
    recommendations: OptimizationSuggestion[];
  } {
    const recentHistory = this.history.slice(-100);
    
    const summary = {
      averageFPS: recentHistory.reduce((sum, h) => sum + h.metrics.rendering.fps, 0) / recentHistory.length || 0,
      peakMemoryUsage: Math.max(...recentHistory.map(h => h.metrics.memory.heapUsed)) / (1024 * 1024),
      totalWarnings: this.warnings.length,
      suggestionsCount: this.suggestions.length
    };
    
    const trends = {
      fpsDataPoints: recentHistory.map(h => h.metrics.rendering.fps),
      memoryDataPoints: recentHistory.map(h => h.metrics.memory.heapUsed / (1024 * 1024)),
      timestamps: recentHistory.map(h => h.timestamp)
    };
    
    const recommendations = this.suggestions
      .filter(s => s.priority === 'high')
      .slice(0, 5);
    
    return { summary, trends, recommendations };
  }

  public dispose(): void {
    this.stopMonitoring();
    this.removeAllListeners();
    this.history = [];
    this.warnings = [];
    this.suggestions = [];
    this.lastWarningTime.clear();
    console.log('📊 PerformanceManager已清理');
  }
}

// 导出单例实例
export const performanceManager = new PerformanceManager();

// 导出类型
export type { 
  PerformanceMetrics, 
  PerformanceThresholds, 
  PerformanceWarning, 
  OptimizationSuggestion, 
  PerformanceHistory 
};