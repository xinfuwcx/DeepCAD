/**
 * 统一性能监控系统 - 升级版
 * 1号架构师 - 响应2号提醒，集成三方模块的性能数据
 */

// NOTE: This file previously imported PerformanceMetrics from InterfaceProtocol,
// but that interface describes a different nested shape (moduleId, metrics{}, thresholds, alerts).
// Here we define a flattened runtime sampling structure specific to the UI layer.
// To avoid name collisions and incorrect property access errors, we use a local interface
// BasicPerformanceMetrics and remove the conflicting import. If integration with the
// architecture-wide PerformanceMetrics standard is needed later, add an adapter method.
import React from 'react';

// 本地性能指标接口（兼容旧版本）
export interface BasicPerformanceMetrics {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  fps: number;
  renderTime: number;
  apiLatency: Record<string, number>;
  threejsStats?: {
    geometries: number;
    textures: number;
    programs: number;
    calls: number;
    triangles: number;
    points: number;
  };
}

// 架构协议适配（简化）：将 BasicPerformanceMetrics 转成 InterfaceProtocol 风格
export interface ProtocolPerformanceMetrics {
  timestamp: number;
  moduleId: string;
  metrics: {
    renderTime: number;
    memoryUsage: number;
    triangleCount: number;
    drawCalls: number;
    fps: number;
  };
  thresholds: {
    maxRenderTime: number;
    maxMemoryUsage: number;
    minFps: number;
  };
  alerts: Array<{
    type: 'performance' | 'memory' | 'quality';
    severity: 'warning' | 'error';
    message: string;
  }>;
}

export function adaptToProtocol(basic: BasicPerformanceMetrics, moduleId = 'frontend.viewport'): ProtocolPerformanceMetrics {
  const alerts: ProtocolPerformanceMetrics['alerts'] = [];
  if (basic.fps < 30) alerts.push({ type: 'performance', severity: 'warning', message: `低FPS: ${basic.fps}` });
  if (basic.memory.percentage > 80) alerts.push({ type: 'memory', severity: 'warning', message: `内存占用 ${basic.memory.percentage.toFixed(1)}%` });
  if (basic.threejsStats && basic.threejsStats.triangles > 400000) alerts.push({ type: 'performance', severity: 'warning', message: `三角形数量 ${basic.threejsStats.triangles}` });

  return {
    timestamp: basic.timestamp,
    moduleId,
    metrics: {
      renderTime: basic.renderTime,
      memoryUsage: basic.memory.used,
      triangleCount: basic.threejsStats?.triangles || 0,
      drawCalls: basic.threejsStats?.calls || 0,
      fps: basic.fps
    },
    thresholds: {
      maxRenderTime: 33.3,
      maxMemoryUsage: 1024, // MB 假设
      minFps: 30
    },
    alerts
  };
}

class PerformanceMonitor {
  private metrics: BasicPerformanceMetrics[] = [];
  private protocolQueue: ProtocolPerformanceMetrics[] = [];
  private retryBuffer: ProtocolPerformanceMetrics[] = [];
  private sending = false;
  private reportEndpoint: string;
  private flushCfg: {
    intervalMs: number;          // 周期性检查间隔（定时器）
    batchSize: number;           // 达到此数量立即尝试 flush
    maxDelayMs: number;          // 单条数据最长等待时间（超过则强制 flush）
    baseBackoffMs: number;       // 初始退避
    backoffMultiplier: number;   // 乘数
    maxBackoffMs: number;        // 上限
  };
  private lastFlushTime = Date.now();
  private consecutiveFailures = 0;
  private nextSendEarliest = 0;
  private maxQueue = 500;
  private featureFlags = {
    network: true,
    interactions: true,
    threeStats: true,
    memory: true
  };
  private immediateFlushOn = {
    visibilityHidden: true,
    beforeUnload: true,
    error: true
  };
  // Placeholder for potential future aggregation of architecture-level metrics
  // Reserved for future aggregation of module-level metrics
  // private unifiedMetrics: Map<string, any> = new Map();
  private maxMetrics = 100; // 保留最近100个数据点
  private fpsCounter = 0;
  private lastTime = performance.now();
  private frameCount = 0;
  private observers: ((metrics: BasicPerformanceMetrics) => void)[] = [];
  // private unifiedObservers: ((metrics: any) => void)[] = [];
  private networkMetrics: Map<string, number[]> = new Map();
  private userInteractionTimes: number[] = [];
  private pageLoadMetrics: any = null;

  constructor() {
  // 允许通过全局变量或环境注入覆盖上报端点
    const g: any = window as any;
    this.reportEndpoint = g.__DEEPCAD_PERF_ENDPOINT__ || '/api/perf/report';
    this.flushCfg = {
      intervalMs: 15000,
      batchSize: 10,
      maxDelayMs: 20000,
      baseBackoffMs: 5000,
      backoffMultiplier: 2,
      maxBackoffMs: 60000,
      ...(g.__DEEPCAD_PERF_CONFIG__?.flush || {})
    };
    if (g.__DEEPCAD_PERF_CONFIG__?.features) {
      this.featureFlags = { ...this.featureFlags, ...g.__DEEPCAD_PERF_CONFIG__.features };
    }
    if (g.__DEEPCAD_PERF_CONFIG__?.immediateFlushOn) {
      this.immediateFlushOn = { ...this.immediateFlushOn, ...g.__DEEPCAD_PERF_CONFIG__.immediateFlushOn };
    }
    if (g.__DEEPCAD_PERF_CONFIG__?.maxQueue) this.maxQueue = g.__DEEPCAD_PERF_CONFIG__.maxQueue;
    this.startMonitoring();
    if (this.featureFlags.network) this.initNetworkMonitoring();
    if (this.featureFlags.interactions) this.initUserInteractionTracking();
    this.capturePageLoadMetrics();
  this.startProtocolFlush();
    this.initLifecycleHooks();
  }

  private startMonitoring() {
    // FPS监控
    const updateFPS = () => {
      this.frameCount++;
      const now = performance.now();
      if (now - this.lastTime >= 1000) {
        this.fpsCounter = Math.round((this.frameCount * 1000) / (now - this.lastTime));
        this.frameCount = 0;
        this.lastTime = now;
        this.collectMetrics();
      }
      requestAnimationFrame(updateFPS);
    };
    requestAnimationFrame(updateFPS);

    // 定期收集指标
    setInterval(() => {
      this.collectMetrics();
    }, 5000);
  }

  private collectMetrics() {
    const memory = this.getMemoryInfo();
  const metrics: BasicPerformanceMetrics = {
      timestamp: Date.now(),
      memory,
      fps: this.fpsCounter,
      renderTime: performance.now(),
  apiLatency: this.featureFlags.network ? this.getApiLatency() : {},
  threejsStats: this.featureFlags.threeStats ? this.getThreeJSStats() : undefined
    };

    this.metrics.push(metrics);
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

  // 放入协议适配队列（轻量）
  this.protocolQueue.push(adaptToProtocol(metrics));
  if (this.protocolQueue.length > 200) this.protocolQueue.shift();
  // 全局队列上限保护
  const total = this.protocolQueue.length + this.retryBuffer.length;
  if (total > this.maxQueue) {
    // 丢弃最旧的一部分，保留最近的数据窗口
    const overflow = total - this.maxQueue;
    this.protocolQueue.splice(0, overflow);
  }

  // 判断是否需要立即 flush
  if (this.shouldImmediateFlush()) {
    this.triggerFlush();
  }

    // 通知观察者
    this.observers.forEach(observer => observer(metrics));

    // 性能警告
    this.checkPerformanceWarnings(metrics);
  }

  // 启动协议队列定期冲刷（当前仅 console，可扩展为发送到后端）
  private startProtocolFlush() {
    window.setInterval(() => {
      // 周期检查：满足时间或滞留时间超限则 flush
      if (!this.protocolQueue.length) return;
      const now = Date.now();
      const oldest = this.protocolQueue[0]?.timestamp || now;
      const waited = now - oldest;
      if (now - this.lastFlushTime >= this.flushCfg.intervalMs || waited >= this.flushCfg.maxDelayMs) {
        this.triggerFlush();
      }
    }, Math.min(this.flushCfg.intervalMs, 5000)); // 频率适度提高以便检查 maxDelay
  }

  private async flushToBackend(batch: ProtocolPerformanceMetrics[]) {
    if (this.sending) {
      // 如果正在发送，回退到队列等待下次
      this.protocolQueue.unshift(...batch);
      return;
    }
    this.sending = true;
    try {
      if (Date.now() < this.nextSendEarliest) {
        // 仍处在退避窗口，回退
        this.protocolQueue.unshift(...batch);
        return;
      }
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(this.reportEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'frontend', module: 'viewport', batch }),
        keepalive: true,
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (!res.ok) throw new Error('Perf report HTTP ' + res.status);
      let data: any = null;
      try { data = await res.json(); } catch { /* 非JSON亦视为成功 */ }
      const accepted = data?.accepted ?? batch.length;
      if (data && data.ok === false) throw new Error(data.error || 'Perf report negative ack');
      // 成功：清理重试缓存（全部视作已接受）
      this.retryBuffer = [];
      this.consecutiveFailures = 0;
      this.nextSendEarliest = 0;
      this.lastFlushTime = Date.now();
      if (data?.nextHintMs) {
        // 后端可提示下次最早发送时间
        this.nextSendEarliest = Date.now() + Number(data.nextHintMs);
      }
      if ((console as any).debug) {
        console.debug('[PerfProtocolBatch][sent]', { accepted, queueLeft: this.protocolQueue.length });
      }
    } catch (err) {
      // 降级日志（不频繁 spam）
      if (console && (Date.now() % 5 === 0)) {
        console.warn('[PerfProtocolBatch][send-failed]', (err as any)?.message || err);
      }
      this.consecutiveFailures++;
      const backoff = Math.min(this.flushCfg.baseBackoffMs * Math.pow(this.flushCfg.backoffMultiplier, this.consecutiveFailures - 1), this.flushCfg.maxBackoffMs);
      this.nextSendEarliest = Date.now() + backoff;
      throw err;
    } finally {
      this.sending = false;
    }
  }

  private shouldImmediateFlush(): boolean {
    if (this.protocolQueue.length + this.retryBuffer.length >= this.flushCfg.batchSize) return true;
    return false;
  }

  private triggerFlush() {
    if (!this.protocolQueue.length) return;
    const batch = this.protocolQueue.splice(0, this.flushCfg.batchSize);
    const payload = [...this.retryBuffer, ...batch];
    if (!payload.length) return;
    this.flushToBackend(payload).catch(() => {
      this.retryBuffer = payload.concat(this.retryBuffer).slice(-500);
    });
  }

  // 立即公开 flush 接口
  flushNow() { this.triggerFlush(); }

  // 生命周期事件：页面隐藏/卸载时尽可能发送剩余数据
  private initLifecycleHooks() {
    const sendRemaining = () => {
      if (!this.protocolQueue.length && !this.retryBuffer.length) return;
      const batch = [...this.retryBuffer, ...this.protocolQueue];
      this.protocolQueue.length = 0;
      this.retryBuffer.length = 0;
      // 优先 sendBeacon
      const payload = JSON.stringify({ source: 'frontend', module: 'viewport', batch, final: true });
      let sent = false;
      try {
        if (navigator.sendBeacon && this.reportEndpoint.startsWith('/')) {
          sent = navigator.sendBeacon(this.reportEndpoint, new Blob([payload], { type: 'application/json' }));
        }
      } catch { /* ignore */ }
      if (!sent) {
        try { fetch(this.reportEndpoint, { method: 'POST', body: payload, keepalive: true, headers: { 'Content-Type': 'application/json' } }); } catch { /* ignore */ }
      }
    };
    if (this.immediateFlushOn.visibilityHidden) {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') sendRemaining();
      });
    }
    if (this.immediateFlushOn.beforeUnload) {
      window.addEventListener('beforeunload', sendRemaining);
      window.addEventListener('pagehide', sendRemaining);
    }
    if (this.immediateFlushOn.error) {
      window.addEventListener('error', () => this.flushNow());
      window.addEventListener('unhandledrejection', () => this.flushNow());
    }
  }

  // 调试用：公开内部关键状态（勿在生产 UI 直接渲染）
  getInternalState() {
    return {
      queueSize: this.protocolQueue.length,
      retryBufferSize: this.retryBuffer.length,
      consecutiveFailures: this.consecutiveFailures,
      nextSendInMs: Math.max(0, this.nextSendEarliest - Date.now()),
      lastFlushTime: this.lastFlushTime,
      flushConfig: { ...this.flushCfg },
      featureFlags: { ...this.featureFlags },
      immediateFlushOn: { ...this.immediateFlushOn }
    };
  }

  // 暴露获取协议格式队列快照
  getProtocolMetricsSnapshot(limit = 50): ProtocolPerformanceMetrics[] {
    return this.protocolQueue.slice(-limit);
  }

  private getMemoryInfo() {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return {
        used: memory.usedJSHeapSize / 1024 / 1024, // MB
        total: memory.totalJSHeapSize / 1024 / 1024, // MB
        percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100
      };
    }
    return { used: 0, total: 0, percentage: 0 };
  }

  private getApiLatency(): Record<string, number> {
    // 从性能条目中获取API请求延迟
    const entries = performance.getEntriesByType('navigation');
    const latency: Record<string, number> = {};
    
    entries.forEach(entry => {
      if (entry.name.includes('/api/')) {
        const apiName = entry.name.split('/api/')[1].split('?')[0];
        latency[apiName] = entry.duration;
      }
    });

    return latency;
  }

  private getThreeJSStats() {
    // 尝试获取Three.js渲染统计信息
    const threeRenderer = (window as any).deepcadRenderer;
    if (threeRenderer && threeRenderer.info) {
      return {
        geometries: threeRenderer.info.memory.geometries,
        textures: threeRenderer.info.memory.textures,
        programs: threeRenderer.info.programs?.length || 0,
        calls: threeRenderer.info.render.calls,
        triangles: threeRenderer.info.render.triangles,
        points: threeRenderer.info.render.points
      };
    }
    return undefined;
  }

  private checkPerformanceWarnings(metrics: BasicPerformanceMetrics) {
    // FPS警告 (只在FPS实际过低且大于5时警告)
    if (metrics.fps < 30 && metrics.fps > 5) {
      console.warn(`[DeepCAD Performance] 低FPS警告: ${metrics.fps}fps`);
    }

    // 内存警告
    if (metrics.memory.percentage > 70) {
      console.warn(`[DeepCAD Performance] 内存使用率警告: ${metrics.memory.percentage.toFixed(1)}%`);
    }

    // API延迟警告
    Object.entries(metrics.apiLatency).forEach(([api, latency]) => {
      if (latency > 2000) {
        console.warn(`[DeepCAD Performance] API延迟警告: ${api} - ${latency.toFixed(0)}ms`);
      }
    });

    // Three.js渲染警告
    if (metrics.threejsStats) {
      if (metrics.threejsStats.calls > 1000) {
        console.warn(`[DeepCAD Performance] 渲染调用过多: ${metrics.threejsStats.calls} calls`);
      }
      if (metrics.threejsStats.triangles > 500000) {
        console.warn(`[DeepCAD Performance] 三角形数量过多: ${metrics.threejsStats.triangles} triangles`);
      }
    }
  }

  // 订阅性能指标更新
  subscribe(callback: (metrics: BasicPerformanceMetrics) => void) {
    this.observers.push(callback);
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  // 获取最新指标
  getLatestMetrics(): BasicPerformanceMetrics | null {
    return this.metrics[this.metrics.length - 1] || null;
  }

  // 获取历史指标
  getMetricsHistory(): BasicPerformanceMetrics[] {
    return [...this.metrics];
  }

  // 获取平均性能
  getAverageMetrics(duration = 30000): Partial<BasicPerformanceMetrics> {
    const now = Date.now();
    const recentMetrics = this.metrics.filter(m => now - m.timestamp <= duration);
    
    if (recentMetrics.length === 0) return {};

    return {
      fps: recentMetrics.reduce((sum, m) => sum + m.fps, 0) / recentMetrics.length,
      memory: {
        used: recentMetrics.reduce((sum, m) => sum + m.memory.used, 0) / recentMetrics.length,
        total: recentMetrics.reduce((sum, m) => sum + m.memory.total, 0) / recentMetrics.length,
        percentage: recentMetrics.reduce((sum, m) => sum + m.memory.percentage, 0) / recentMetrics.length
      }
    };
  }

  // 性能报告
  generateReport(): string {
    const latest = this.getLatestMetrics();
    const average = this.getAverageMetrics();
    
    if (!latest) return 'No performance data available';

    return `
DeepCAD 性能报告
================
当前性能:
- FPS: ${latest.fps}
- 内存使用: ${latest.memory.used.toFixed(1)}MB (${latest.memory.percentage.toFixed(1)}%)
- Three.js 调用: ${latest.threejsStats?.calls || 'N/A'}
- 三角形数量: ${latest.threejsStats?.triangles || 'N/A'}

30秒平均:
- 平均FPS: ${average.fps?.toFixed(1) || 'N/A'}
- 平均内存: ${average.memory?.used?.toFixed(1) || 'N/A'}MB

性能等级: ${this.getPerformanceGrade(latest)}
    `.trim();
  }

  private getPerformanceGrade(metrics: BasicPerformanceMetrics): string {
    let score = 100;
    
    // FPS评分
    if (metrics.fps < 30) score -= 30;
    else if (metrics.fps < 45) score -= 15;
    
    // 内存评分
    if (metrics.memory.percentage > 80) score -= 25;
    else if (metrics.memory.percentage > 60) score -= 10;
    
    // API延迟评分
    const avgLatency = Object.values(metrics.apiLatency).reduce((sum, l) => sum + l, 0) / Object.keys(metrics.apiLatency).length;
    if (avgLatency > 1000) score -= 20;
    else if (avgLatency > 500) score -= 10;

    if (score >= 90) return '优秀 🟢';
    if (score >= 75) return '良好 🟡';
    if (score >= 60) return '一般 🟠';
    return '需要优化 🔴';
  }

  // 初始化网络性能监控
  private initNetworkMonitoring() {
    // 监控Fetch请求
    const originalFetch = window.fetch;
    window.fetch = async (...args: Parameters<typeof fetch>) => {
      const requestInfo = args[0];
      const url = typeof requestInfo === 'string' ? requestInfo : (requestInfo as Request).url;

      // 过滤掉不需要监控的请求
      if (this.shouldSkipMonitoring(url)) {
        return originalFetch(...args);
      }

      const startTime = performance.now();
      try {
        const response = await originalFetch(...args);
        const endTime = performance.now();
        const duration = endTime - startTime;

        const apiName = this.extractApiName(url);

        if (!this.networkMetrics.has(apiName)) {
          this.networkMetrics.set(apiName, []);
        }
        const metrics = this.networkMetrics.get(apiName)!;
        metrics.push(duration);
        
        // 保留最近50个请求
        if (metrics.length > 50) {
          metrics.shift();
        }
        
        return response;
      } catch (error) {
        const endTime = performance.now();
        console.warn(`[DeepCAD Performance] API请求失败: ${url} - ${endTime - startTime}ms`);
        throw error;
      }
    };
  }

  // 判断是否应该跳过监控
  private shouldSkipMonitoring(url: string): boolean {
    // 跳过根路径和静态资源
    const skipPatterns = [
      /^https?:\/\/[^\/]+\/?$/,  // 根路径
      /\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf)$/i,  // 静态资源
      /\/static\//,  // 静态文件目录
      /chrome-extension:/,  // 浏览器扩展
      /moz-extension:/,  // Firefox扩展
    ];

    return skipPatterns.some(pattern => pattern.test(url));
  }

  // 初始化用户交互跟踪
  private initUserInteractionTracking() {
    const trackInteraction = (event: Event) => {
      const startTime = performance.now();
      
      // 使用requestAnimationFrame来测量到下一帧的时间
      requestAnimationFrame(() => {
        const responseTime = performance.now() - startTime;
        this.userInteractionTimes.push(responseTime);
        
        // 保留最近100个交互时间
        if (this.userInteractionTimes.length > 100) {
          this.userInteractionTimes.shift();
        }
        
        // 如果响应时间过长，发出警告
        if (responseTime > 100) {
          console.warn(`[DeepCAD Performance] 用户交互响应慢: ${event.type} - ${responseTime.toFixed(1)}ms`);
        }
      });
    };

    ['click', 'keydown', 'scroll', 'touchstart'].forEach(eventType => {
      document.addEventListener(eventType, trackInteraction, { passive: true });
    });
  }

  // 捕获页面加载性能指标
  private capturePageLoadMetrics() {
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.pageLoadMetrics = {
            domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
            pageLoad: navigation.loadEventEnd - navigation.loadEventStart,
            firstPaint: this.getFirstPaint(),
            firstContentfulPaint: this.getFirstContentfulPaint(),
            largestContentfulPaint: this.getLargestContentfulPaint()
          };
        }
      }, 1000);
    });
  }

  // 获取首次绘制时间
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstPaint = paintEntries.find(entry => entry.name === 'first-paint');
    return firstPaint ? firstPaint.startTime : 0;
  }

  // 获取首次内容绘制时间
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const firstContentfulPaint = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return firstContentfulPaint ? firstContentfulPaint.startTime : 0;
  }

  // 获取最大内容绘制时间
  private getLargestContentfulPaint(): number {
    return new Promise((resolve) => {
      if ('PerformanceObserver' in window) {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1];
          resolve(lastEntry ? lastEntry.startTime : 0);
        });
        observer.observe({ entryTypes: ['largest-contentful-paint'] });
        
        // 10秒后超时
        setTimeout(() => resolve(0), 10000);
      } else {
        resolve(0);
      }
    }) as any;
  }

  // 提取API名称
  private extractApiName(url: string): string {
    try {
      const urlObj = new URL(url, window.location.origin);
      const pathname = urlObj.pathname;
      if (pathname.includes('/api/')) {
        return pathname.split('/api/')[1].split('/')[0] || 'unknown';
      }
      return 'external';
    } catch {
      return 'unknown';
    }
  }

  // 获取网络性能指标
  getNetworkMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.networkMetrics.forEach((times, apiName) => {
      if (times.length > 0) {
        const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
        const min = Math.min(...times);
        const max = Math.max(...times);
        result[apiName] = { avg, min, max, count: times.length };
      }
    });
    
    return result;
  }

  // 获取用户交互性能
  getUserInteractionMetrics(): { avgResponseTime: number; slowInteractions: number } {
    if (this.userInteractionTimes.length === 0) {
      return { avgResponseTime: 0, slowInteractions: 0 };
    }
    
    const avgResponseTime = this.userInteractionTimes.reduce((sum, time) => sum + time, 0) / this.userInteractionTimes.length;
    const slowInteractions = this.userInteractionTimes.filter(time => time > 100).length;
    
    return { avgResponseTime, slowInteractions };
  }

  // 获取页面加载性能
  getPageLoadMetrics() {
    return this.pageLoadMetrics;
  }

  // 生成性能优化建议
  generateOptimizationSuggestions(): string[] {
    const suggestions: string[] = [];
    const latest = this.getLatestMetrics();
    const networkMetrics = this.getNetworkMetrics();
    const interactionMetrics = this.getUserInteractionMetrics();
    
    if (!latest) return suggestions;
    
    // FPS优化建议
    if (latest.fps < 30) {
      suggestions.push('• 考虑降低3D模型复杂度或减少同时渲染的对象数量');
      suggestions.push('• 启用GPU加速或检查WebGL/WebGPU支持');
    }
    
    // 内存优化建议
    if (latest.memory.percentage > 70) {
      suggestions.push('• 定期清理不必要的对象引用，避免内存泄漏');
      suggestions.push('• 考虑使用对象池模式复用Three.js几何体和材质');
    }
    
    // 网络优化建议
    Object.entries(networkMetrics).forEach(([api, metrics]) => {
      if (metrics.avg > 1000) {
        suggestions.push(`• API "${api}" 响应较慢(${metrics.avg.toFixed(0)}ms)，考虑优化后端或添加缓存`);
      }
    });
    
    // 交互优化建议
    if (interactionMetrics.avgResponseTime > 50) {
      suggestions.push('• 用户交互响应较慢，考虑使用防抖或节流优化事件处理');
    }
    
    // Three.js优化建议
    if (latest.threejsStats) {
      if (latest.threejsStats.calls > 500) {
        suggestions.push('• 渲染调用过多，考虑合并几何体或使用实例化渲染');
      }
      if (latest.threejsStats.triangles > 200000) {
        suggestions.push('• 三角形数量过多，考虑使用LOD(细节层次)技术');
      }
    }
    
    if (suggestions.length === 0) {
      suggestions.push('• 当前性能表现良好，继续保持！');
    }
    
    return suggestions;
  }

  // 生成增强版性能报告
  generateEnhancedReport(): string {
    const latest = this.getLatestMetrics();
    const average = this.getAverageMetrics();
    const networkMetrics = this.getNetworkMetrics();
    const interactionMetrics = this.getUserInteractionMetrics();
    const pageLoadMetrics = this.getPageLoadMetrics();
    const suggestions = this.generateOptimizationSuggestions();
    
    if (!latest) return 'No performance data available';

    return `
DeepCAD 增强性能报告
===================

📊 实时性能指标:
- FPS: ${latest.fps} (目标: >60)
- 内存使用: ${latest.memory.used.toFixed(1)}MB / ${latest.memory.total.toFixed(1)}MB (${latest.memory.percentage.toFixed(1)}%)
- GPU渲染调用: ${latest.threejsStats?.calls || 'N/A'}
- 几何体数量: ${latest.threejsStats?.geometries || 'N/A'}
- 三角形数量: ${latest.threejsStats?.triangles || 'N/A'}

📈 30秒平均性能:
- 平均FPS: ${average.fps?.toFixed(1) || 'N/A'}
- 平均内存: ${average.memory?.used?.toFixed(1) || 'N/A'}MB (${average.memory?.percentage?.toFixed(1) || 'N/A'}%)

🌐 网络性能:
${Object.entries(networkMetrics).map(([api, metrics]) => 
  `- ${api}: 平均${metrics.avg.toFixed(0)}ms (${metrics.count}次请求)`
).join('\n') || '- 暂无网络请求数据'}

🖱️ 用户交互性能:
- 平均响应时间: ${interactionMetrics.avgResponseTime.toFixed(1)}ms
- 慢响应次数: ${interactionMetrics.slowInteractions}

⚡ 页面加载性能:
${pageLoadMetrics ? `- 首次绘制: ${pageLoadMetrics.firstPaint?.toFixed(0) || 'N/A'}ms
- 首次内容绘制: ${pageLoadMetrics.firstContentfulPaint?.toFixed(0) || 'N/A'}ms
- DOM加载完成: ${pageLoadMetrics.domContentLoaded?.toFixed(0) || 'N/A'}ms` : '- 页面加载数据收集中...'}

🎯 性能等级: ${this.getPerformanceGrade(latest)}

💡 优化建议:
${suggestions.join('\n')}

生成时间: ${new Date().toLocaleString('zh-CN')}
    `.trim();
  }
}

// 全局实例
export const performanceMonitor = new PerformanceMonitor();

// React Hook for performance metrics
export const usePerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState<BasicPerformanceMetrics | null>(null);

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(setMetrics);
    setMetrics(performanceMonitor.getLatestMetrics());
    return unsubscribe;
  }, []);

  return metrics;
};

// React Hook for enhanced performance data
export const useEnhancedPerformanceMetrics = () => {
  const [metrics, setMetrics] = React.useState<BasicPerformanceMetrics | null>(null);
  const [networkMetrics, setNetworkMetrics] = React.useState<Record<string, any>>({});
  const [interactionMetrics, setInteractionMetrics] = React.useState({ avgResponseTime: 0, slowInteractions: 0 });
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

  React.useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe((newMetrics) => {
      setMetrics(newMetrics);
      setNetworkMetrics(performanceMonitor.getNetworkMetrics());
      setInteractionMetrics(performanceMonitor.getUserInteractionMetrics());
      setSuggestions(performanceMonitor.generateOptimizationSuggestions());
    });
    
    // Initial data
    setMetrics(performanceMonitor.getLatestMetrics());
    setNetworkMetrics(performanceMonitor.getNetworkMetrics());
    setInteractionMetrics(performanceMonitor.getUserInteractionMetrics());
    setSuggestions(performanceMonitor.generateOptimizationSuggestions());
    
    return unsubscribe;
  }, []);

  return {
    metrics,
    networkMetrics,
    interactionMetrics,
    suggestions,
    generateReport: () => performanceMonitor.generateEnhancedReport()
  };
};

// 性能监控面板组件已移至单独的文件
// 请导入：import PerformanceMonitorPanel from '../components/advanced/PerformanceMonitorPanel';

export default PerformanceMonitor;