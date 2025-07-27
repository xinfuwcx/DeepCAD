/**
 * 错误处理和降级策略系统
 * 为Epic控制中心提供完整的错误边界和降级方案
 * @author 1号专家
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum SystemComponent {
  MAP_ENGINE = 'mapEngine',
  WEATHER_SERVICE = 'weatherService',
  PARTICLE_SYSTEM = 'particleSystem',
  AI_ASSISTANT = 'aiAssistant',
  PERFORMANCE_MONITOR = 'performanceMonitor',
  DATA_VISUALIZATION = 'dataVisualization',
  PROJECT_MANAGER = 'projectManager',
  EXPERT_SYSTEM = 'expertSystem'
}

export interface ErrorContext {
  component: SystemComponent;
  severity: ErrorSeverity;
  error: Error;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId: string;
  systemState: Record<string, any>;
}

export interface FallbackStrategy {
  component: SystemComponent;
  strategy: 'retry' | 'fallback' | 'disable' | 'gracefulDegradation';
  maxRetries: number;
  retryDelay: number;
  fallbackAction: () => Promise<void>;
  healthCheck: () => Promise<boolean>;
}

export class ErrorHandlingSystem {
  private errorLog: ErrorContext[] = [];
  private fallbackStrategies: Map<SystemComponent, FallbackStrategy> = new Map();
  private componentHealth: Map<SystemComponent, boolean> = new Map();
  private retryAttempts: Map<string, number> = new Map();
  private isInitialized: boolean = false;

  constructor() {
    this.setupFallbackStrategies();
    this.setupGlobalErrorHandlers();
    console.log('🛡️ 错误处理系统初始化完成');
  }

  // ======================= 初始化和配置 =======================

  private setupFallbackStrategies(): void {
    // 地图引擎降级策略
    this.fallbackStrategies.set(SystemComponent.MAP_ENGINE, {
      component: SystemComponent.MAP_ENGINE,
      strategy: 'gracefulDegradation',
      maxRetries: 3,
      retryDelay: 2000,
      fallbackAction: this.fallbackToStaticMap.bind(this),
      healthCheck: this.checkMapEngineHealth.bind(this)
    });

    // 天气服务降级策略
    this.fallbackStrategies.set(SystemComponent.WEATHER_SERVICE, {
      component: SystemComponent.WEATHER_SERVICE,
      strategy: 'fallback',
      maxRetries: 2,
      retryDelay: 5000,
      fallbackAction: this.fallbackToMockWeather.bind(this),
      healthCheck: this.checkWeatherServiceHealth.bind(this)
    });

    // GPU粒子系统降级策略
    this.fallbackStrategies.set(SystemComponent.PARTICLE_SYSTEM, {
      component: SystemComponent.PARTICLE_SYSTEM,
      strategy: 'gracefulDegradation',
      maxRetries: 1,
      retryDelay: 1000,
      fallbackAction: this.fallbackToCSSParticles.bind(this),
      healthCheck: this.checkParticleSystemHealth.bind(this)
    });

    // AI助手降级策略
    this.fallbackStrategies.set(SystemComponent.AI_ASSISTANT, {
      component: SystemComponent.AI_ASSISTANT,
      strategy: 'gracefulDegradation',
      maxRetries: 2,
      retryDelay: 3000,
      fallbackAction: this.fallbackToBasicAI.bind(this),
      healthCheck: this.checkAISystemHealth.bind(this)
    });

    // 性能监控降级策略
    this.fallbackStrategies.set(SystemComponent.PERFORMANCE_MONITOR, {
      component: SystemComponent.PERFORMANCE_MONITOR,
      strategy: 'disable',
      maxRetries: 1,
      retryDelay: 1000,
      fallbackAction: this.disablePerformanceMonitor.bind(this),
      healthCheck: this.checkPerformanceMonitorHealth.bind(this)
    });

    console.log('📋 降级策略配置完成');
  }

  private setupGlobalErrorHandlers(): void {
    // 全局JavaScript错误捕获
    window.addEventListener('error', (event) => {
      this.handleGlobalError(event.error, {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno
      });
    });

    // Promise未捕获错误
    window.addEventListener('unhandledrejection', (event) => {
      this.handleGlobalError(new Error(`Unhandled Promise Rejection: ${event.reason}`), {
        reason: event.reason
      });
    });

    // WebGL上下文丢失处理
    this.setupWebGLErrorHandling();
  }

  private setupWebGLErrorHandling(): void {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (gl) {
      canvas.addEventListener('webglcontextlost', (event) => {
        event.preventDefault();
        console.warn('⚠️ WebGL上下文丢失');
        
        this.handleComponentError(
          SystemComponent.MAP_ENGINE,
          new Error('WebGL context lost'),
          ErrorSeverity.HIGH
        );
      });

      canvas.addEventListener('webglcontextrestored', () => {
        console.log('✅ WebGL上下文已恢复');
        this.componentHealth.set(SystemComponent.MAP_ENGINE, true);
      });
    }
  }

  // ======================= 错误处理核心方法 =======================

  public async handleComponentError(
    component: SystemComponent,
    error: Error,
    severity: ErrorSeverity,
    additionalContext: Record<string, any> = {}
  ): Promise<void> {
    const errorContext: ErrorContext = {
      component,
      severity,
      error,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.generateSessionId(),
      systemState: this.captureSystemState()
    };

    // 记录错误
    this.logError(errorContext, additionalContext);

    // 更新组件健康状态
    this.componentHealth.set(component, false);

    // 根据严重程度决定处理策略
    await this.executeErrorStrategy(component, errorContext);
  }

  private async executeErrorStrategy(
    component: SystemComponent,
    errorContext: ErrorContext
  ): Promise<void> {
    const strategy = this.fallbackStrategies.get(component);
    if (!strategy) {
      console.error(`❌ 未找到组件降级策略: ${component}`);
      return;
    }

    const retryKey = `${component}_${Date.now()}`;
    
    switch (strategy.strategy) {
      case 'retry':
        await this.executeRetryStrategy(strategy, retryKey);
        break;
        
      case 'fallback':
        await this.executeFallbackStrategy(strategy);
        break;
        
      case 'gracefulDegradation':
        await this.executeGracefulDegradation(strategy);
        break;
        
      case 'disable':
        await this.executeDisableStrategy(strategy);
        break;
    }
  }

  private async executeRetryStrategy(
    strategy: FallbackStrategy,
    retryKey: string
  ): Promise<void> {
    const currentAttempts = this.retryAttempts.get(retryKey) || 0;
    
    if (currentAttempts >= strategy.maxRetries) {
      console.warn(`⚠️ 重试次数达到上限，执行降级: ${strategy.component}`);
      await strategy.fallbackAction();
      return;
    }

    this.retryAttempts.set(retryKey, currentAttempts + 1);
    
    console.log(`🔄 重试组件 ${strategy.component} (${currentAttempts + 1}/${strategy.maxRetries})`);
    
    setTimeout(async () => {
      const isHealthy = await strategy.healthCheck();
      if (!isHealthy) {
        await this.executeRetryStrategy(strategy, retryKey);
      } else {
        console.log(`✅ 组件 ${strategy.component} 重试成功`);
        this.componentHealth.set(strategy.component, true);
        this.retryAttempts.delete(retryKey);
      }
    }, strategy.retryDelay);
  }

  private async executeFallbackStrategy(strategy: FallbackStrategy): Promise<void> {
    console.log(`🔀 执行降级策略: ${strategy.component}`);
    
    try {
      await strategy.fallbackAction();
      console.log(`✅ 降级策略执行成功: ${strategy.component}`);
    } catch (fallbackError) {
      console.error(`❌ 降级策略执行失败: ${strategy.component}`, fallbackError);
      await this.executeDisableStrategy(strategy);
    }
  }

  private async executeGracefulDegradation(strategy: FallbackStrategy): Promise<void> {
    console.log(`📉 执行优雅降级: ${strategy.component}`);
    
    try {
      await strategy.fallbackAction();
      this.componentHealth.set(strategy.component, true); // 标记为部分可用
    } catch (error) {
      console.error(`❌ 优雅降级失败: ${strategy.component}`, error);
      await this.executeDisableStrategy(strategy);
    }
  }

  private async executeDisableStrategy(strategy: FallbackStrategy): Promise<void> {
    console.log(`🚫 禁用组件: ${strategy.component}`);
    
    await strategy.fallbackAction();
    this.componentHealth.set(strategy.component, false);
    
    // 通知用户组件不可用
    this.notifyUserComponentDisabled(strategy.component);
  }

  // ======================= 降级实现方法 =======================

  private async fallbackToStaticMap(): Promise<void> {
    console.log('🗺️ 降级到静态地图模式');
    
    // 创建静态地图替代方案
    const mapContainer = document.querySelector('[data-component="map-container"]');
    if (mapContainer) {
      mapContainer.innerHTML = `
        <div style="
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-size: 18px;
          text-align: center;
        ">
          <div>
            <div style="font-size: 48px; margin-bottom: 20px;">🗺️</div>
            <div>静态地图模式</div>
            <div style="font-size: 14px; opacity: 0.8; margin-top: 10px;">
              WebGL地图引擎暂时不可用
            </div>
          </div>
        </div>
      `;
    }
  }

  private async fallbackToMockWeather(): Promise<void> {
    console.log('🌤️ 降级到模拟天气数据');
    
    // 使用预设的天气数据
    const mockWeatherData = {
      temperature: 22,
      humidity: 65,
      windSpeed: 8,
      description: '多云 (模拟数据)',
      icon: '☁️'
    };

    // 触发模拟天气数据更新事件
    window.dispatchEvent(new CustomEvent('weatherFallback', {
      detail: mockWeatherData
    }));
  }

  private async fallbackToCSSParticles(): Promise<void> {
    console.log('✨ 降级到CSS粒子效果');
    
    // 创建CSS动画粒子效果
    const particleContainer = document.createElement('div');
    particleContainer.className = 'css-particles-fallback';
    particleContainer.style.cssText = `
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    `;

    // 添加CSS粒子
    for (let i = 0; i < 20; i++) {
      const particle = document.createElement('div');
      particle.style.cssText = `
        position: absolute;
        width: 4px;
        height: 4px;
        background: rgba(0, 255, 255, 0.6);
        border-radius: 50%;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: cssParticleFloat ${3 + Math.random() * 4}s linear infinite;
      `;
      particleContainer.appendChild(particle);
    }

    // 添加CSS动画
    if (!document.querySelector('#css-particle-animations')) {
      const style = document.createElement('style');
      style.id = 'css-particle-animations';
      style.textContent = `
        @keyframes cssParticleFloat {
          0% { transform: translateY(0) scale(1); opacity: 0.6; }
          50% { transform: translateY(-20px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-40px) scale(0.8); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const mapContainer = document.querySelector('[data-component="map-container"]');
    if (mapContainer) {
      mapContainer.appendChild(particleContainer);
    }
  }

  private async fallbackToBasicAI(): Promise<void> {
    console.log('🤖 降级到基础AI响应');
    
    // 创建简化的AI响应系统
    const basicResponses = [
      '系统正在处理您的请求...',
      '数据分析中，请稍候...',
      '正在查询相关信息...',
      '建议您稍后重试或联系技术支持'
    ];

    window.dispatchEvent(new CustomEvent('aiFallback', {
      detail: {
        mode: 'basic',
        responses: basicResponses
      }
    }));
  }

  private async disablePerformanceMonitor(): Promise<void> {
    console.log('📊 禁用性能监控');
    
    // 隐藏性能监控面板
    const perfPanel = document.querySelector('[data-component="performance-panel"]');
    if (perfPanel) {
      (perfPanel as HTMLElement).style.display = 'none';
    }

    // 停止性能数据收集
    window.dispatchEvent(new CustomEvent('performanceMonitorDisabled'));
  }

  // ======================= 健康检查方法 =======================

  private async checkMapEngineHealth(): Promise<boolean> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      return gl !== null;
    } catch {
      return false;
    }
  }

  private async checkWeatherServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch('https://api.open-meteo.com/v1/forecast?latitude=31&longitude=121&current=temperature_2m', {
        method: 'HEAD',
        mode: 'no-cors'
      });
      return true; // 如果没有抛出异常，说明服务可用
    } catch {
      return false;
    }
  }

  private async checkParticleSystemHealth(): Promise<boolean> {
    try {
      // 检查WebGL支持
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2');
      if (!gl) return false;

      // 检查浮点纹理支持
      const ext = gl.getExtension('EXT_color_buffer_float');
      return ext !== null;
    } catch {
      return false;
    }
  }

  private async checkAISystemHealth(): Promise<boolean> {
    try {
      // 简单的AI系统健康检查
      return typeof window !== 'undefined' && 'fetch' in window;
    } catch {
      return false;
    }
  }

  private async checkPerformanceMonitorHealth(): Promise<boolean> {
    try {
      return 'performance' in window && 'memory' in (performance as any);
    } catch {
      return false;
    }
  }

  // ======================= 工具方法 =======================

  private handleGlobalError(error: Error, context: any): void {
    console.error('🔥 全局错误:', error, context);
    
    // 确定错误所属的组件
    const component = this.identifyErrorComponent(error, context);
    
    // 处理组件错误
    this.handleComponentError(component, error, ErrorSeverity.HIGH, context);
  }

  private identifyErrorComponent(error: Error, context: any): SystemComponent {
    const stack = error.stack || '';
    const message = error.message || '';
    
    if (stack.includes('Three') || stack.includes('WebGL') || message.includes('map')) {
      return SystemComponent.MAP_ENGINE;
    } else if (stack.includes('weather') || message.includes('meteo')) {
      return SystemComponent.WEATHER_SERVICE;
    } else if (stack.includes('particle') || stack.includes('GPU')) {
      return SystemComponent.PARTICLE_SYSTEM;
    } else if (stack.includes('AI') || stack.includes('assistant')) {
      return SystemComponent.AI_ASSISTANT;
    } else {
      return SystemComponent.MAP_ENGINE; // 默认组件
    }
  }

  private logError(errorContext: ErrorContext, additionalContext: any): void {
    this.errorLog.push(errorContext);
    
    // 限制错误日志大小
    if (this.errorLog.length > 100) {
      this.errorLog = this.errorLog.slice(-50);
    }

    // 发送错误报告到监控系统
    this.sendErrorReport(errorContext, additionalContext);
  }

  private sendErrorReport(errorContext: ErrorContext, additionalContext: any): void {
    // 在实际应用中，这里应该发送到错误监控服务
    console.log('📊 错误报告:', {
      ...errorContext,
      additional: additionalContext
    });
  }

  private captureSystemState(): Record<string, any> {
    return {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: Date.now(),
      memory: (performance as any).memory?.usedJSHeapSize || 0,
      componentHealth: Object.fromEntries(this.componentHealth)
    };
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private notifyUserComponentDisabled(component: SystemComponent): void {
    const componentNames = {
      [SystemComponent.MAP_ENGINE]: '地图引擎',
      [SystemComponent.WEATHER_SERVICE]: '天气服务',
      [SystemComponent.PARTICLE_SYSTEM]: '粒子效果',
      [SystemComponent.AI_ASSISTANT]: 'AI助手',
      [SystemComponent.PERFORMANCE_MONITOR]: '性能监控',
      [SystemComponent.DATA_VISUALIZATION]: '数据可视化',
      [SystemComponent.PROJECT_MANAGER]: '项目管理',
      [SystemComponent.EXPERT_SYSTEM]: '专家系统'
    };

    const message = `${componentNames[component] || component} 暂时不可用，系统将继续运行其他功能。`;
    
    // 创建通知
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: rgba(255, 152, 0, 0.9);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      z-index: 10000;
      font-size: 14px;
      max-width: 300px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // 3秒后自动移除
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }

  // ======================= 公共接口 =======================

  public getComponentHealth(component: SystemComponent): boolean {
    return this.componentHealth.get(component) ?? true;
  }

  public getAllComponentHealth(): Record<string, boolean> {
    return Object.fromEntries(this.componentHealth);
  }

  public getErrorLog(): ErrorContext[] {
    return [...this.errorLog];
  }

  public clearErrorLog(): void {
    this.errorLog = [];
    console.log('🗑️ 错误日志已清理');
  }

  public forceComponentFallback(component: SystemComponent): Promise<void> {
    console.log(`🔧 强制组件降级: ${component}`);
    return this.handleComponentError(
      component,
      new Error('Manual fallback triggered'),
      ErrorSeverity.MEDIUM
    );
  }

  public async performHealthCheck(): Promise<Record<string, boolean>> {
    console.log('🔍 执行系统健康检查...');
    
    const healthResults: Record<string, boolean> = {};
    
    for (const [component, strategy] of this.fallbackStrategies) {
      try {
        const isHealthy = await strategy.healthCheck();
        healthResults[component] = isHealthy;
        this.componentHealth.set(component, isHealthy);
      } catch (error) {
        healthResults[component] = false;
        this.componentHealth.set(component, false);
        console.warn(`⚠️ 健康检查失败: ${component}`, error);
      }
    }
    
    console.log('✅ 系统健康检查完成:', healthResults);
    return healthResults;
  }

  public dispose(): void {
    console.log('🗑️ 清理错误处理系统');
    this.errorLog = [];
    this.componentHealth.clear();
    this.retryAttempts.clear();
    this.fallbackStrategies.clear();
  }
}

// 导出单例实例
export const errorHandlingSystem = new ErrorHandlingSystem();
export default ErrorHandlingSystem;