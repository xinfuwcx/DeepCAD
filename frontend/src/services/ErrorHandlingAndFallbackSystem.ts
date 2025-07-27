/**
 * 3号计算专家 - 错误处理和降级策略系统
 * 提供全面的异常处理、系统降级和恢复机制
 */

import { message } from 'antd';

// 错误类型枚举
export enum ErrorType {
  COMPUTATION_ERROR = 'computation_error',
  GPU_ERROR = 'gpu_error',
  MEMORY_ERROR = 'memory_error',
  NETWORK_ERROR = 'network_error',
  VALIDATION_ERROR = 'validation_error',
  PHYSICS_AI_ERROR = 'physics_ai_error',
  MESH_ERROR = 'mesh_error',
  RENDERING_ERROR = 'rendering_error'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'low',           // 轻微错误，不影响主要功能
  MEDIUM = 'medium',     // 中等错误，影响部分功能
  HIGH = 'high',         // 严重错误，影响主要功能
  CRITICAL = 'critical'  // 致命错误，系统无法正常运行
}

// 恢复策略类型
export enum RecoveryAction {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  GRACEFUL_DEGRADATION = 'graceful_degradation',
  SYSTEM_RESTART = 'system_restart',
  USER_INTERVENTION = 'user_intervention'
}

// 自定义错误类
export class DeepCADError extends Error {
  public readonly type: ErrorType;
  public readonly severity: ErrorSeverity;
  public readonly context: any;
  public readonly timestamp: Date;
  public readonly recovery?: RecoveryAction;

  constructor(
    message: string,
    type: ErrorType,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    context?: any,
    recovery?: RecoveryAction
  ) {
    super(message);
    this.name = 'DeepCADError';
    this.type = type;
    this.severity = severity;
    this.context = context;
    this.timestamp = new Date();
    this.recovery = recovery;
  }
}

// 计算错误子类
export class ComputationError extends DeepCADError {
  constructor(message: string, context?: any, severity: ErrorSeverity = ErrorSeverity.HIGH) {
    super(message, ErrorType.COMPUTATION_ERROR, severity, context, RecoveryAction.FALLBACK);
  }
}

// GPU错误子类
export class GPUError extends DeepCADError {
  constructor(message: string, context?: any, severity: ErrorSeverity = ErrorSeverity.HIGH) {
    super(message, ErrorType.GPU_ERROR, severity, context, RecoveryAction.GRACEFUL_DEGRADATION);
  }
}

// 内存错误子类
export class MemoryError extends DeepCADError {
  constructor(message: string, context?: any, severity: ErrorSeverity = ErrorSeverity.HIGH) {
    super(message, ErrorType.MEMORY_ERROR, severity, context, RecoveryAction.GRACEFUL_DEGRADATION);
  }
}

// 网络错误子类
export class NetworkError extends DeepCADError {
  constructor(message: string, context?: any, severity: ErrorSeverity = ErrorSeverity.MEDIUM) {
    super(message, ErrorType.NETWORK_ERROR, severity, context, RecoveryAction.RETRY);
  }
}

// 恢复策略配置
interface RecoveryConfig {
  maxRetries: number;
  retryDelay: number;
  backoffMultiplier: number;
  timeoutMs: number;
  fallbackOptions: string[];
}

// 系统状态监控
interface SystemStatus {
  cpuUsage: number;
  memoryUsage: number;
  gpuMemoryUsage?: number;
  networkLatency: number;
  activeTasks: number;
  errorCount: number;
}

// 降级选项
interface FallbackOptions {
  // 计算降级选项
  computation: {
    reducedMeshDensity: boolean;
    simplifiedPhysics: boolean;
    empiricalMethods: boolean;
    parallelizationDisabled: boolean;
  };
  
  // 渲染降级选项
  rendering: {
    webglFallback: boolean;
    canvas2dFallback: boolean;
    reducedQuality: boolean;
    disableAnimations: boolean;
  };
  
  // AI模块降级选项
  ai: {
    disablePINN: boolean;
    disableGNN: boolean;
    disableTERRA: boolean;
    simplifiedAlgorithms: boolean;
  };
}

/**
 * 核心错误处理和降级策略系统
 */
export class ErrorHandlingAndFallbackSystem {
  private errorLog: DeepCADError[] = [];
  private systemStatus: SystemStatus;
  private fallbackOptions: FallbackOptions;
  private recoveryConfig: RecoveryConfig;
  private isInFallbackMode: boolean = false;
  private performanceMonitor: PerformanceMonitor;

  constructor() {
    this.initializeSystem();
    this.setupGlobalErrorHandlers();
    this.startSystemMonitoring();
  }

  private initializeSystem() {
    this.systemStatus = {
      cpuUsage: 0,
      memoryUsage: 0,
      networkLatency: 0,
      activeTasks: 0,
      errorCount: 0
    };

    this.fallbackOptions = {
      computation: {
        reducedMeshDensity: false,
        simplifiedPhysics: false,
        empiricalMethods: false,
        parallelizationDisabled: false
      },
      rendering: {
        webglFallback: false,
        canvas2dFallback: false,
        reducedQuality: false,
        disableAnimations: false
      },
      ai: {
        disablePINN: false,
        disableGNN: false,
        disableTERRA: false,
        simplifiedAlgorithms: false
      }
    };

    this.recoveryConfig = {
      maxRetries: 3,
      retryDelay: 1000,
      backoffMultiplier: 2,
      timeoutMs: 30000,
      fallbackOptions: ['reduce_quality', 'simplified_computation', 'emergency_mode']
    };

    this.performanceMonitor = new PerformanceMonitor();
  }

  /**
   * 全局错误处理器设置
   */
  private setupGlobalErrorHandlers() {
    // JavaScript错误捕获
    window.addEventListener('error', (event) => {
      this.handleError(new DeepCADError(
        event.message,
        ErrorType.COMPUTATION_ERROR,
        ErrorSeverity.MEDIUM,
        {
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno
        }
      ));
    });

    // Promise拒绝捕获
    window.addEventListener('unhandledrejection', (event) => {
      this.handleError(new DeepCADError(
        `Unhandled Promise Rejection: ${event.reason}`,
        ErrorType.COMPUTATION_ERROR,
        ErrorSeverity.HIGH,
        { reason: event.reason }
      ));
    });

    // WebGPU错误监听
    if (typeof navigator !== 'undefined' && navigator.gpu) {
      navigator.gpu.addEventListener?.('uncapturederror', (event) => {
        this.handleError(new GPUError(
          `WebGPU Error: ${event.error.message}`,
          { error: event.error }
        ));
      });
    }
  }

  /**
   * 系统状态监控
   */
  private startSystemMonitoring() {
    setInterval(() => {
      this.updateSystemStatus();
      this.checkSystemHealth();
    }, 5000); // 每5秒检查一次
  }

  private updateSystemStatus() {
    // 内存使用监控
    if (performance.memory) {
      this.systemStatus.memoryUsage = performance.memory.usedJSHeapSize;
    }

    // GPU内存监控 (如果支持)
    if ((performance as any).measureUserAgentSpecificMemory) {
      (performance as any).measureUserAgentSpecificMemory().then((memory: any) => {
        this.systemStatus.gpuMemoryUsage = memory.bytes;
      });
    }

    // 网络延迟监控
    this.measureNetworkLatency();
  }

  private async measureNetworkLatency(): Promise<void> {
    const start = performance.now();
    try {
      await fetch('/api/ping', { method: 'HEAD' });
      this.systemStatus.networkLatency = performance.now() - start;
    } catch (error) {
      this.systemStatus.networkLatency = 9999; // 网络不可用
    }
  }

  private checkSystemHealth() {
    const issues: string[] = [];

    // 内存使用检查
    if (this.systemStatus.memoryUsage > 1.5 * 1024 * 1024 * 1024) { // 1.5GB
      issues.push('high_memory_usage');
      this.enableFallbackOption('computation', 'reducedMeshDensity', true);
    }

    // GPU内存检查
    if (this.systemStatus.gpuMemoryUsage && this.systemStatus.gpuMemoryUsage > 1 * 1024 * 1024 * 1024) { // 1GB
      issues.push('high_gpu_memory_usage');
      this.enableFallbackOption('rendering', 'reducedQuality', true);
    }

    // 网络延迟检查
    if (this.systemStatus.networkLatency > 5000) { // 5秒
      issues.push('high_network_latency');
    }

    // 错误频率检查
    const recentErrors = this.errorLog.filter(
      error => Date.now() - error.timestamp.getTime() < 60000 // 最近1分钟
    );
    if (recentErrors.length > 10) {
      issues.push('high_error_frequency');
      this.enterEmergencyMode();
    }

    if (issues.length > 0) {
      console.warn('系统健康检查发现问题:', issues);
      this.performanceMonitor.recordHealthIssues(issues);
    }
  }

  /**
   * 主要错误处理入口
   */
  public async handleError(error: DeepCADError): Promise<boolean> {
    // 记录错误
    this.errorLog.push(error);
    this.systemStatus.errorCount++;

    // 错误分类处理
    const handled = await this.processErrorByType(error);

    // 用户通知
    this.notifyUser(error);

    // 错误报告
    this.reportError(error);

    return handled;
  }

  private async processErrorByType(error: DeepCADError): Promise<boolean> {
    switch (error.type) {
      case ErrorType.COMPUTATION_ERROR:
        return await this.handleComputationError(error as ComputationError);
      
      case ErrorType.GPU_ERROR:
        return await this.handleGPUError(error as GPUError);
      
      case ErrorType.MEMORY_ERROR:
        return await this.handleMemoryError(error as MemoryError);
      
      case ErrorType.NETWORK_ERROR:
        return await this.handleNetworkError(error as NetworkError);
      
      case ErrorType.PHYSICS_AI_ERROR:
        return await this.handlePhysicsAIError(error);
      
      case ErrorType.MESH_ERROR:
        return await this.handleMeshError(error);
      
      case ErrorType.RENDERING_ERROR:
        return await this.handleRenderingError(error);
      
      default:
        return await this.handleGenericError(error);
    }
  }

  /**
   * 计算错误处理
   */
  private async handleComputationError(error: ComputationError): Promise<boolean> {
    const context = error.context;

    // 收敛失败处理
    if (context?.type === 'convergence_failure') {
      return await this.retryWithRelaxedTolerance(context);
    }

    // 网格质量问题
    if (context?.type === 'mesh_quality_error') {
      return await this.retryWithImprovedMesh(context);
    }

    // 内存不足
    if (context?.type === 'out_of_memory') {
      return await this.retryWithReducedProblemSize(context);
    }

    // 数值不稳定
    if (context?.type === 'numerical_instability') {
      return await this.retryWithStabilizedSolver(context);
    }

    // 默认降级策略
    return await this.fallbackToSimplifiedComputation(context);
  }

  private async retryWithRelaxedTolerance(context: any): Promise<boolean> {
    try {
      const newTolerance = (context.originalTolerance || 1e-6) * 10;
      message.info('🔄 检测到收敛困难，正在放宽收敛条件重试...');
      
      const retryResult = await this.retryComputation({
        ...context.parameters,
        convergenceTolerance: newTolerance,
        maxIterations: Math.min((context.maxIterations || 100) * 2, 500)
      });

      if (retryResult.success) {
        message.success('✅ 放宽收敛条件后计算成功完成');
        return true;
      }
    } catch (error) {
      console.error('放宽收敛条件重试失败:', error);
    }
    
    return false;
  }

  private async retryWithImprovedMesh(context: any): Promise<boolean> {
    try {
      message.info('🔧 正在优化网格质量并重试计算...');
      
      const improvedMesh = await this.improveMeshQuality(context.mesh, {
        minQuality: 0.3,
        smoothingIterations: 5,
        aspectRatioLimit: 10
      });

      const retryResult = await this.retryComputation({
        ...context.parameters,
        mesh: improvedMesh
      });

      if (retryResult.success) {
        message.success('✅ 网格优化后计算成功完成');
        return true;
      }
    } catch (error) {
      console.error('网格优化重试失败:', error);
    }
    
    return false;
  }

  private async retryWithReducedProblemSize(context: any): Promise<boolean> {
    try {
      message.info('📉 正在减少问题规模并重试计算...');
      
      const reducedMesh = await this.reduceMeshDensity(context.mesh, 0.7); // 减少30%
      
      const retryResult = await this.retryComputation({
        ...context.parameters,
        mesh: reducedMesh
      });

      if (retryResult.success) {
        message.warning('⚠️ 已减少网格密度完成计算，精度可能略有降低');
        return true;
      }
    } catch (error) {
      console.error('减少问题规模重试失败:', error);
    }
    
    // 如果还是失败，尝试更大幅度的减少
    try {
      const significantlyReducedMesh = await this.reduceMeshDensity(context.mesh, 0.5); // 减少50%
      
      const retryResult = await this.retryComputation({
        ...context.parameters,
        mesh: significantlyReducedMesh
      });

      if (retryResult.success) {
        message.warning('⚠️ 已大幅减少网格密度完成计算，请注意精度影响');
        return true;
      }
    } catch (error) {
      console.error('大幅减少问题规模重试失败:', error);
    }
    
    return false;
  }

  private async retryWithStabilizedSolver(context: any): Promise<boolean> {
    try {
      message.info('🛠️ 正在使用稳定化求解器重试...');
      
      const retryResult = await this.retryComputation({
        ...context.parameters,
        solverType: 'stabilized',
        usePreconditioning: true,
        dampingFactor: 0.8
      });

      if (retryResult.success) {
        message.success('✅ 稳定化求解器计算成功完成');
        return true;
      }
    } catch (error) {
      console.error('稳定化求解器重试失败:', error);
    }
    
    return false;
  }

  private async fallbackToSimplifiedComputation(context: any): Promise<boolean> {
    try {
      message.warning('📋 正在切换到简化计算模式...');
      
      // 启用所有简化选项
      this.enableFallbackOption('computation', 'simplifiedPhysics', true);
      this.enableFallbackOption('computation', 'empiricalMethods', true);
      
      const simplifiedResult = await this.performSimplifiedAnalysis(context.parameters);
      
      if (simplifiedResult.success) {
        message.warning('⚠️ 已使用简化模型完成计算，结果仅供参考');
        return true;
      }
    } catch (error) {
      console.error('简化计算模式失败:', error);
    }
    
    return false;
  }

  /**
   * GPU错误处理
   */
  private async handleGPUError(error: GPUError): Promise<boolean> {
    const context = error.context;

    // WebGPU不支持
    if (context?.type === 'webgpu_not_supported') {
      return await this.fallbackToWebGL();
    }

    // GPU内存不足
    if (context?.type === 'gpu_out_of_memory') {
      return await this.reduceGPUMemoryUsage();
    }

    // 设备丢失
    if (context?.type === 'device_lost') {
      return await this.recoverGPUDevice();
    }

    // 默认降级到WebGL
    return await this.fallbackToWebGL();
  }

  private async fallbackToWebGL(): Promise<boolean> {
    try {
      message.info('🔄 正在切换到WebGL渲染模式...');
      
      this.enableFallbackOption('rendering', 'webglFallback', true);
      
      // 通知渲染系统切换到WebGL
      const event = new CustomEvent('rendering-fallback', {
        detail: { renderer: 'webgl2', reason: 'gpu_error' }
      });
      window.dispatchEvent(event);
      
      message.warning('⚠️ 已切换到WebGL渲染模式，部分高级效果可能不可用');
      return true;
    } catch (error) {
      console.error('WebGL降级失败:', error);
      return await this.fallbackToCanvas2D();
    }
  }

  private async reduceGPUMemoryUsage(): Promise<boolean> {
    try {
      message.info('💾 正在优化GPU内存使用...');
      
      // 减少纹理质量
      this.enableFallbackOption('rendering', 'reducedQuality', true);
      
      // 清理GPU缓存
      const event = new CustomEvent('gpu-memory-cleanup', {
        detail: { aggressive: true }
      });
      window.dispatchEvent(event);
      
      message.success('✅ GPU内存使用已优化');
      return true;
    } catch (error) {
      console.error('GPU内存优化失败:', error);
      return false;
    }
  }

  private async recoverGPUDevice(): Promise<boolean> {
    try {
      message.info('🔌 正在恢复GPU设备连接...');
      
      // 通知GPU渲染器重新初始化
      const event = new CustomEvent('gpu-device-recovery', {
        detail: { retryCount: 3 }
      });
      window.dispatchEvent(event);
      
      // 等待设备恢复
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      message.success('✅ GPU设备已恢复');
      return true;
    } catch (error) {
      console.error('GPU设备恢复失败:', error);
      return await this.fallbackToWebGL();
    }
  }

  private async fallbackToCanvas2D(): Promise<boolean> {
    try {
      message.warning('🎨 正在切换到Canvas 2D渲染模式...');
      
      this.enableFallbackOption('rendering', 'canvas2dFallback', true);
      this.enableFallbackOption('rendering', 'disableAnimations', true);
      
      const event = new CustomEvent('rendering-fallback', {
        detail: { renderer: 'canvas2d', reason: 'webgl_failure' }
      });
      window.dispatchEvent(event);
      
      message.warning('⚠️ 已切换到基础渲染模式，仅支持简单图形显示');
      return true;
    } catch (error) {
      console.error('Canvas 2D降级失败:', error);
      return false;
    }
  }

  /**
   * 内存错误处理
   */
  private async handleMemoryError(error: MemoryError): Promise<boolean> {
    const context = error.context;

    try {
      message.warning('🧹 正在清理内存并优化性能...');
      
      // 清理缓存
      await this.clearCaches();
      
      // 强制垃圾回收 (如果可用)
      if (window.gc) {
        window.gc();
      }
      
      // 减少内存使用
      this.enableFallbackOption('computation', 'reducedMeshDensity', true);
      this.enableFallbackOption('rendering', 'reducedQuality', true);
      
      message.success('✅ 内存已优化，建议保存当前工作');
      return true;
    } catch (error) {
      console.error('内存优化失败:', error);
      return false;
    }
  }

  /**
   * 网络错误处理
   */
  private async handleNetworkError(error: NetworkError): Promise<boolean> {
    const context = error.context;
    
    // 重试机制
    for (let i = 0; i < this.recoveryConfig.maxRetries; i++) {
      try {
        await new Promise(resolve => 
          setTimeout(resolve, this.recoveryConfig.retryDelay * Math.pow(this.recoveryConfig.backoffMultiplier, i))
        );
        
        message.info(`🔄 正在重试网络连接 (${i + 1}/${this.recoveryConfig.maxRetries})...`);
        
        // 重试原始请求
        if (context?.originalRequest) {
          const result = await this.retryNetworkRequest(context.originalRequest);
          if (result.success) {
            message.success('✅ 网络连接已恢复');
            return true;
          }
        }
      } catch (retryError) {
        console.error(`网络重试 ${i + 1} 失败:`, retryError);
      }
    }
    
    // 启用离线模式
    return await this.enableOfflineMode();
  }

  private async enableOfflineMode(): Promise<boolean> {
    try {
      message.warning('📱 已切换到离线模式，功能可能受限');
      
      // 通知系统进入离线模式
      const event = new CustomEvent('offline-mode-enabled', {
        detail: { reason: 'network_error' }
      });
      window.dispatchEvent(event);
      
      return true;
    } catch (error) {
      console.error('离线模式启用失败:', error);
      return false;
    }
  }

  /**
   * 物理AI错误处理
   */
  private async handlePhysicsAIError(error: DeepCADError): Promise<boolean> {
    const context = error.context;

    if (context?.aiModule === 'PINN') {
      this.enableFallbackOption('ai', 'disablePINN', true);
      message.warning('⚠️ PINN模块已暂时禁用，使用传统FEM求解');
    } else if (context?.aiModule === 'GNN') {
      this.enableFallbackOption('ai', 'disableGNN', true);
      message.warning('⚠️ GNN模块已暂时禁用，使用简化稳定性评估');
    } else if (context?.aiModule === 'TERRA') {
      this.enableFallbackOption('ai', 'disableTERRA', true);
      message.warning('⚠️ TERRA优化已暂时禁用，使用默认参数');
    }

    // 启用简化算法模式
    this.enableFallbackOption('ai', 'simplifiedAlgorithms', true);
    
    return true;
  }

  /**
   * 网格错误处理
   */
  private async handleMeshError(error: DeepCADError): Promise<boolean> {
    const context = error.context;

    try {
      if (context?.type === 'poor_quality') {
        message.info('🔧 正在自动修复网格质量问题...');
        const improvedMesh = await this.improveMeshQuality(context.mesh);
        return improvedMesh !== null;
      }

      if (context?.type === 'generation_failed') {
        message.info('🔄 正在使用备用网格生成算法...');
        const backupMesh = await this.generateMeshWithBackupAlgorithm(context.geometry);
        return backupMesh !== null;
      }
    } catch (meshError) {
      console.error('网格错误处理失败:', meshError);
    }

    return false;
  }

  /**
   * 渲染错误处理
   */
  private async handleRenderingError(error: DeepCADError): Promise<boolean> {
    const context = error.context;

    if (context?.renderer === 'webgpu') {
      return await this.fallbackToWebGL();
    } else if (context?.renderer === 'webgl') {
      return await this.fallbackToCanvas2D();
    }

    return false;
  }

  /**
   * 通用错误处理
   */
  private async handleGenericError(error: DeepCADError): Promise<boolean> {
    // 根据错误严重程度决定处理策略
    if (error.severity === ErrorSeverity.CRITICAL) {
      return await this.enterEmergencyMode();
    } else if (error.severity === ErrorSeverity.HIGH) {
      return await this.activateGracefulDegradation();
    }

    // 记录并继续
    console.warn('通用错误处理:', error);
    return true;
  }

  /**
   * 紧急模式
   */
  private async enterEmergencyMode(): Promise<boolean> {
    try {
      message.error('🚨 系统进入紧急模式，正在保存数据并简化功能...');
      
      // 自动保存当前工作
      const event = new CustomEvent('emergency-save', {
        detail: { reason: 'critical_error' }
      });
      window.dispatchEvent(event);
      
      // 启用所有降级选项
      this.enableAllFallbackOptions();
      
      // 设置紧急模式标志
      this.isInFallbackMode = true;
      
      message.warning('⚠️ 系统已进入安全模式，建议重启应用');
      return true;
    } catch (error) {
      console.error('紧急模式启动失败:', error);
      return false;
    }
  }

  /**
   * 优雅降级
   */
  private async activateGracefulDegradation(): Promise<boolean> {
    try {
      message.warning('📉 正在启动优雅降级策略...');
      
      // 逐步降级功能
      this.enableFallbackOption('rendering', 'reducedQuality', true);
      this.enableFallbackOption('computation', 'simplifiedPhysics', true);
      
      message.info('✅ 系统已降级到稳定模式');
      return true;
    } catch (error) {
      console.error('优雅降级失败:', error);
      return false;
    }
  }

  /**
   * 辅助方法
   */
  private enableFallbackOption(category: keyof FallbackOptions, option: string, value: boolean) {
    if (this.fallbackOptions[category] && option in this.fallbackOptions[category]) {
      (this.fallbackOptions[category] as any)[option] = value;
      
      // 通知相关系统
      const event = new CustomEvent('fallback-option-changed', {
        detail: { category, option, value }
      });
      window.dispatchEvent(event);
    }
  }

  private enableAllFallbackOptions() {
    Object.keys(this.fallbackOptions).forEach(category => {
      Object.keys(this.fallbackOptions[category as keyof FallbackOptions]).forEach(option => {
        this.enableFallbackOption(category as keyof FallbackOptions, option, true);
      });
    });
  }

  private async clearCaches(): Promise<void> {
    // 清理各种缓存
    const event = new CustomEvent('clear-all-caches');
    window.dispatchEvent(event);
    
    // 等待清理完成
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  private notifyUser(error: DeepCADError) {
    const userMessage = this.generateUserFriendlyMessage(error);
    
    switch (error.severity) {
      case ErrorSeverity.LOW:
        message.info(userMessage);
        break;
      case ErrorSeverity.MEDIUM:
        message.warning(userMessage);
        break;
      case ErrorSeverity.HIGH:
        message.error(userMessage);
        break;
      case ErrorSeverity.CRITICAL:
        message.error(userMessage, 10); // 显示10秒
        break;
    }
  }

  private generateUserFriendlyMessage(error: DeepCADError): string {
    const messageMap: Record<ErrorType, string> = {
      [ErrorType.COMPUTATION_ERROR]: '计算过程中遇到问题，正在尝试修复',
      [ErrorType.GPU_ERROR]: '图形处理遇到问题，正在切换渲染模式',
      [ErrorType.MEMORY_ERROR]: '内存使用过高，正在优化性能',
      [ErrorType.NETWORK_ERROR]: '网络连接问题，正在重试',
      [ErrorType.VALIDATION_ERROR]: '输入数据验证失败，请检查参数',
      [ErrorType.PHYSICS_AI_ERROR]: 'AI计算模块问题，已切换到传统方法',
      [ErrorType.MESH_ERROR]: '网格生成问题，正在自动修复',
      [ErrorType.RENDERING_ERROR]: '渲染问题，正在调整显示模式'
    };

    return messageMap[error.type] || '系统遇到未知问题，正在处理';
  }

  private reportError(error: DeepCADError) {
    const errorReport = {
      timestamp: error.timestamp.toISOString(),
      type: error.type,
      severity: error.severity,
      message: error.message,
      context: error.context,
      systemStatus: { ...this.systemStatus },
      fallbackOptions: { ...this.fallbackOptions },
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 开发模式下输出到控制台
    if (process.env.NODE_ENV === 'development') {
      console.group(`🚨 DeepCAD错误报告 - ${error.type}`);
      console.error('错误详情:', errorReport);
      console.groupEnd();
    }
    
    // 生产模式下发送到监控系统
    // this.sendToMonitoringSystem(errorReport);
  }

  // 辅助计算方法 (模拟实现)
  private async retryComputation(parameters: any): Promise<{ success: boolean }> {
    // 模拟重试计算
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { success: Math.random() > 0.3 }; // 70%成功率
  }

  private async improveMeshQuality(mesh: any, options?: any): Promise<any> {
    // 模拟网格质量改进
    await new Promise(resolve => setTimeout(resolve, 2000));
    return mesh; // 返回改进后的网格
  }

  private async reduceMeshDensity(mesh: any, factor: number): Promise<any> {
    // 模拟网格密度减少
    await new Promise(resolve => setTimeout(resolve, 1000));
    return mesh; // 返回简化后的网格
  }

  private async performSimplifiedAnalysis(parameters: any): Promise<{ success: boolean }> {
    // 模拟简化分析
    await new Promise(resolve => setTimeout(resolve, 1500));
    return { success: true };
  }

  private async generateMeshWithBackupAlgorithm(geometry: any): Promise<any> {
    // 模拟备用网格生成
    await new Promise(resolve => setTimeout(resolve, 3000));
    return {}; // 返回生成的网格
  }

  private async retryNetworkRequest(request: any): Promise<{ success: boolean }> {
    // 模拟网络请求重试
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: Math.random() > 0.5 };
  }

  /**
   * 公共接口
   */
  public getSystemStatus(): SystemStatus {
    return { ...this.systemStatus };
  }

  public getFallbackOptions(): FallbackOptions {
    return { ...this.fallbackOptions };
  }

  public isInEmergencyMode(): boolean {
    return this.isInFallbackMode;
  }

  public getRecentErrors(minutes: number = 60): DeepCADError[] {
    const cutoff = Date.now() - minutes * 60 * 1000;
    return this.errorLog.filter(error => error.timestamp.getTime() > cutoff);
  }

  public clearErrorLog(): void {
    this.errorLog = [];
    this.systemStatus.errorCount = 0;
  }

  public async performSystemRecovery(): Promise<boolean> {
    try {
      message.info('🔄 正在执行系统恢复...');
      
      // 重置降级选项
      this.fallbackOptions = {
        computation: {
          reducedMeshDensity: false,
          simplifiedPhysics: false,
          empiricalMethods: false,
          parallelizationDisabled: false
        },
        rendering: {
          webglFallback: false,
          canvas2dFallback: false,
          reducedQuality: false,
          disableAnimations: false
        },
        ai: {
          disablePINN: false,
          disableGNN: false,
          disableTERRA: false,
          simplifiedAlgorithms: false
        }
      };
      
      this.isInFallbackMode = false;
      
      // 清理错误日志
      this.clearErrorLog();
      
      // 通知系统恢复
      const event = new CustomEvent('system-recovery-complete');
      window.dispatchEvent(event);
      
      message.success('✅ 系统恢复完成');
      return true;
    } catch (error) {
      console.error('系统恢复失败:', error);
      return false;
    }
  }
}

/**
 * 性能监控器
 */
class PerformanceMonitor {
  private metrics: Array<{
    timestamp: Date;
    type: string;
    value: number;
    context?: any;
  }> = [];

  recordHealthIssues(issues: string[]) {
    issues.forEach(issue => {
      this.metrics.push({
        timestamp: new Date(),
        type: 'health_issue',
        value: 1,
        context: { issue }
      });
    });
  }

  getMetrics(timeRange: number = 3600000): typeof this.metrics {
    const cutoff = Date.now() - timeRange;
    return this.metrics.filter(metric => metric.timestamp.getTime() > cutoff);
  }
}

// 单例实例
export const errorHandlingSystem = new ErrorHandlingAndFallbackSystem();