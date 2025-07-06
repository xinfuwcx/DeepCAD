/**
 * 前端性能监控系统
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  renderTime: number;
  memoryUsage: {
    used: number;
    total: number;
    percentage: number;
  };
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
}

export interface UserInteractionMetrics {
  clickResponseTime: number;
  scrollResponseTime: number;
  keyboardResponseTime: number;
  averageResponseTime: number;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private interactionMetrics: UserInteractionMetrics;
  private frameCount: number = 0;
  private lastTime: number = performance.now();
  private frameTimes: number[] = [];
  private renderTimes: number[] = [];
  private isMonitoring: boolean = false;
  private callbacks: Array<(metrics: PerformanceMetrics) => void> = [];
  
  constructor() {
    this.metrics = {
      fps: 0,
      frameTime: 0,
      renderTime: 0,
      memoryUsage: { used: 0, total: 0, percentage: 0 },
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0
    };
    
    this.interactionMetrics = {
      clickResponseTime: 0,
      scrollResponseTime: 0,
      keyboardResponseTime: 0,
      averageResponseTime: 0
    };
  }

  /**
   * 开始性能监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    this.frameCount = 0;
    this.lastTime = performance.now();
    
    // 启动FPS监控
    this.monitorFPS();
    
    // 启动内存监控
    this.monitorMemory();
    
    // 监控用户交互
    this.monitorUserInteractions();
    
    console.log('🔍 性能监控已启动');
  }

  /**
   * 停止性能监控
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
    console.log('⏹️ 性能监控已停止');
  }

  /**
   * 添加性能指标回调
   */
  addCallback(callback: (metrics: PerformanceMetrics) => void): void {
    this.callbacks.push(callback);
  }

  /**
   * 记录渲染开始
   */
  startRender(): number {
    return performance.now();
  }

  /**
   * 记录渲染结束
   */
  endRender(startTime: number): void {
    const renderTime = performance.now() - startTime;
    this.renderTimes.push(renderTime);
    
    // 保持最近100帧的记录
    if (this.renderTimes.length > 100) {
      this.renderTimes.shift();
    }
    
    // 更新渲染时间指标
    this.metrics.renderTime = this.renderTimes.reduce((a, b) => a + b, 0) / this.renderTimes.length;
  }

  /**
   * 更新Three.js渲染器统计
   */
  updateRendererStats(renderer: THREE.WebGLRenderer): void {
    const info = renderer.info;
    
    this.metrics.drawCalls = info.render.calls;
    this.metrics.triangles = info.render.triangles;
    this.metrics.geometries = info.memory.geometries;
    this.metrics.textures = info.memory.textures;
  }

  /**
   * 监控FPS
   */
  private monitorFPS(): void {
    const updateFPS = () => {
      if (!this.isMonitoring) return;
      
      const currentTime = performance.now();
      const deltaTime = currentTime - this.lastTime;
      
      this.frameCount++;
      this.frameTimes.push(deltaTime);
      
      // 保持最近60帧的记录
      if (this.frameTimes.length > 60) {
        this.frameTimes.shift();
      }
      
      // 每秒更新一次FPS
      if (deltaTime >= 1000) {
        const avgFrameTime = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
        this.metrics.fps = Math.round(1000 / avgFrameTime);
        this.metrics.frameTime = avgFrameTime;
        
        this.lastTime = currentTime;
        this.frameCount = 0;
        
        // 触发回调
        this.callbacks.forEach(callback => callback(this.metrics));
      }
      
      requestAnimationFrame(updateFPS);
    };
    
    requestAnimationFrame(updateFPS);
  }

  /**
   * 监控内存使用
   */
  private monitorMemory(): void {
    const updateMemory = () => {
      if (!this.isMonitoring) return;
      
      // 使用Performance API获取内存信息（如果可用）
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        this.metrics.memoryUsage = {
          used: Math.round(memory.usedJSHeapSize / 1024 / 1024), // MB
          total: Math.round(memory.totalJSHeapSize / 1024 / 1024), // MB
          percentage: Math.round((memory.usedJSHeapSize / memory.totalJSHeapSize) * 100)
        };
      }
      
      setTimeout(updateMemory, 5000); // 每5秒更新一次
    };
    
    updateMemory();
  }

  /**
   * 监控用户交互响应时间
   */
  private monitorUserInteractions(): void {
    let interactionStartTime: number;
    
    // 监控点击响应
    const handleMouseDown = () => {
      interactionStartTime = performance.now();
    };
    
    const handleMouseUp = () => {
      if (interactionStartTime) {
        const responseTime = performance.now() - interactionStartTime;
        this.interactionMetrics.clickResponseTime = responseTime;
        this.updateAverageResponseTime();
      }
    };
    
    // 监控滚动响应
    const handleWheelStart = () => {
      interactionStartTime = performance.now();
    };
    
    const handleWheelEnd = () => {
      if (interactionStartTime) {
        const responseTime = performance.now() - interactionStartTime;
        this.interactionMetrics.scrollResponseTime = responseTime;
        this.updateAverageResponseTime();
      }
    };
    
    // 监控键盘响应
    const handleKeyDown = () => {
      interactionStartTime = performance.now();
    };
    
    const handleKeyUp = () => {
      if (interactionStartTime) {
        const responseTime = performance.now() - interactionStartTime;
        this.interactionMetrics.keyboardResponseTime = responseTime;
        this.updateAverageResponseTime();
      }
    };
    
    // 添加事件监听器
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('wheel', handleWheelStart);
    document.addEventListener('wheel', handleWheelEnd);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(): void {
    const times = [
      this.interactionMetrics.clickResponseTime,
      this.interactionMetrics.scrollResponseTime,
      this.interactionMetrics.keyboardResponseTime
    ].filter(time => time > 0);
    
    if (times.length > 0) {
      this.interactionMetrics.averageResponseTime = times.reduce((a, b) => a + b, 0) / times.length;
    }
  }

  /**
   * 获取当前性能指标
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * 获取用户交互指标
   */
  getInteractionMetrics(): UserInteractionMetrics {
    return { ...this.interactionMetrics };
  }

  /**
   * 获取性能报告
   */
  getPerformanceReport(): {
    overall: string;
    fps: string;
    memory: string;
    rendering: string;
    interactions: string;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const interactions = this.getInteractionMetrics();
    
    // 计算总体性能评分
    let score = 100;
    const recommendations: string[] = [];
    
    // FPS评分
    if (metrics.fps < 30) {
      score -= 30;
      recommendations.push('帧率过低，建议减少场景复杂度或启用LOD');
    } else if (metrics.fps < 45) {
      score -= 15;
      recommendations.push('帧率偏低，建议优化渲染设置');
    }
    
    // 内存评分
    if (metrics.memoryUsage.percentage > 80) {
      score -= 25;
      recommendations.push('内存使用过高，建议清理缓存或减少模型精度');
    } else if (metrics.memoryUsage.percentage > 60) {
      score -= 10;
      recommendations.push('内存使用较高，建议监控内存泄漏');
    }
    
    // 渲染时间评分
    if (metrics.renderTime > 16.67) { // 60fps = 16.67ms per frame
      score -= 20;
      recommendations.push('渲染时间过长，建议优化着色器或减少绘制调用');
    }
    
    // 交互响应评分
    if (interactions.averageResponseTime > 100) {
      score -= 15;
      recommendations.push('交互响应较慢，建议优化事件处理');
    }
    
    const getGrade = (score: number): string => {
      if (score >= 90) return '优秀';
      if (score >= 80) return '良好';
      if (score >= 70) return '一般';
      if (score >= 60) return '较差';
      return '很差';
    };
    
    return {
      overall: `${getGrade(score)} (${score}分)`,
      fps: `${metrics.fps} FPS (帧时间: ${metrics.frameTime.toFixed(1)}ms)`,
      memory: `${metrics.memoryUsage.used}MB / ${metrics.memoryUsage.total}MB (${metrics.memoryUsage.percentage}%)`,
      rendering: `渲染时间: ${metrics.renderTime.toFixed(1)}ms, 绘制调用: ${metrics.drawCalls}, 三角形: ${metrics.triangles}`,
      interactions: `平均响应时间: ${interactions.averageResponseTime.toFixed(1)}ms`,
      recommendations
    };
  }

  /**
   * 检测性能瓶颈
   */
  detectBottlenecks(): {
    type: 'cpu' | 'gpu' | 'memory' | 'network' | 'none';
    severity: 'low' | 'medium' | 'high';
    description: string;
    suggestions: string[];
  } {
    const metrics = this.getMetrics();
    
    // CPU瓶颈检测
    if (metrics.frameTime > 33) { // 低于30fps
      return {
        type: 'cpu',
        severity: 'high',
        description: 'CPU处理能力不足，帧时间过长',
        suggestions: [
          '减少场景中的对象数量',
          '启用LOD（细节层次）优化',
          '使用Web Workers处理复杂计算',
          '优化JavaScript代码性能'
        ]
      };
    }
    
    // GPU瓶颈检测
    if (metrics.drawCalls > 1000 || metrics.triangles > 500000) {
      return {
        type: 'gpu',
        severity: 'medium',
        description: 'GPU渲染负载过高',
        suggestions: [
          '合并网格以减少绘制调用',
          '使用实例化渲染',
          '减少纹理分辨率',
          '优化着色器复杂度'
        ]
      };
    }
    
    // 内存瓶颈检测
    if (metrics.memoryUsage.percentage > 80) {
      return {
        type: 'memory',
        severity: 'high',
        description: '内存使用接近极限',
        suggestions: [
          '清理未使用的资源',
          '启用纹理压缩',
          '使用流式加载',
          '减少缓存大小'
        ]
      };
    }
    
    return {
      type: 'none',
      severity: 'low',
      description: '性能表现良好',
      suggestions: []
    };
  }
}

// 全局性能监控器实例
export const globalPerformanceMonitor = new PerformanceMonitor();

// 在开发环境下自动启动监控
if (process.env.NODE_ENV === 'development') {
  globalPerformanceMonitor.startMonitoring();
  
  // 添加性能日志回调
  globalPerformanceMonitor.addCallback((metrics) => {
    if (metrics.fps < 30) {
      console.warn('⚠️ 性能警告: FPS低于30', metrics);
    }
    
    if (metrics.memoryUsage.percentage > 80) {
      console.warn('⚠️ 内存警告: 使用率超过80%', metrics.memoryUsage);
    }
  });
  
  // 每30秒输出性能报告
  setInterval(() => {
    const report = globalPerformanceMonitor.getPerformanceReport();
    console.log('📊 性能报告:', report);
    
    const bottleneck = globalPerformanceMonitor.detectBottlenecks();
    if (bottleneck.type !== 'none') {
      console.warn('🔍 性能瓶颈检测:', bottleneck);
    }
  }, 30000);
} 