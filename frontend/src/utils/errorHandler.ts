/**
 * 错误处理工具类
 * DeepCAD Deep Excavation CAE Platform - Error Handler Utils
 * 
 * 作者：2号几何专家
 * 功能：错误分类、错误报告、错误恢复、错误预防
 */

import { message, notification } from 'antd';

// 错误类型枚举
export enum ErrorType {
  NETWORK_ERROR = 'NETWORK_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  SERVER_ERROR = 'SERVER_ERROR',
  CLIENT_ERROR = 'CLIENT_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  MEMORY_ERROR = 'MEMORY_ERROR',
  RENDERING_ERROR = 'RENDERING_ERROR',
  FILE_ERROR = 'FILE_ERROR',
  CALCULATION_ERROR = 'CALCULATION_ERROR'
}

// 错误严重程度
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 错误恢复策略
export enum RecoveryStrategy {
  RETRY = 'RETRY',
  FALLBACK = 'FALLBACK',
  RELOAD = 'RELOAD',
  REDIRECT = 'REDIRECT',
  MANUAL = 'MANUAL',
  IGNORE = 'IGNORE'
}

// 错误信息接口
export interface ErrorInfo {
  type: ErrorType;
  severity: ErrorSeverity;
  code?: string;
  message: string;
  originalError?: Error;
  context?: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  stack?: string;
  componentStack?: string;
}

// 错误恢复选项
export interface RecoveryOptions {
  strategy: RecoveryStrategy;
  maxRetries?: number;
  retryDelay?: number;
  fallbackAction?: () => void;
  redirectUrl?: string;
  showUserMessage?: boolean;
  userMessage?: string;
}

// 错误处理配置
export interface ErrorHandlerConfig {
  enableReporting: boolean;
  reportingUrl?: string;
  enableLogging: boolean;
  enableUserNotification: boolean;
  maxErrorHistory: number;
  enableRetry: boolean;
  enableFallback: boolean;
}

// 默认配置
const DEFAULT_CONFIG: ErrorHandlerConfig = {
  enableReporting: true,
  enableLogging: true,
  enableUserNotification: true,
  maxErrorHistory: 100,
  enableRetry: true,
  enableFallback: true
};

class ErrorHandler {
  private config: ErrorHandlerConfig;
  private errorHistory: ErrorInfo[] = [];
  private retryAttempts = new Map<string, number>();

  constructor(config: Partial<ErrorHandlerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupGlobalErrorHandling();
  }

  /**
   * 设置全局错误处理
   */
  private setupGlobalErrorHandling(): void {
    // 处理未捕获的Promise错误
    window.addEventListener('unhandledrejection', (event) => {
      console.error('🚨 未处理的Promise错误:', event.reason);
      this.handleError(
        this.createErrorInfo(
          ErrorType.UNKNOWN_ERROR,
          ErrorSeverity.HIGH,
          '未处理的Promise错误',
          event.reason
        )
      );
      event.preventDefault();
    });

    // 处理全局JavaScript错误
    window.addEventListener('error', (event) => {
      console.error('🚨 全局JavaScript错误:', event.error);
      this.handleError(
        this.createErrorInfo(
          ErrorType.CLIENT_ERROR,
          ErrorSeverity.HIGH,
          event.message,
          event.error,
          {
            filename: event.filename,
            lineno: event.lineno,
            colno: event.colno
          }
        )
      );
    });

    // 处理资源加载错误
    window.addEventListener('error', (event) => {
      if (event.target && event.target !== window) {
        const target = event.target as HTMLElement;
        console.error('🚨 资源加载错误:', target);
        this.handleError(
          this.createErrorInfo(
            ErrorType.FILE_ERROR,
            ErrorSeverity.MEDIUM,
            '资源加载失败',
            null,
            {
              tagName: target.tagName,
              src: (target as any).src || (target as any).href
            }
          )
        );
      }
    }, true);
  }

  /**
   * 创建错误信息
   */
  public createErrorInfo(
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    originalError?: Error | any,
    context?: Record<string, any>
  ): ErrorInfo {
    return {
      type,
      severity,
      message,
      originalError,
      context,
      timestamp: Date.now(),
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      stack: originalError?.stack,
      code: this.generateErrorCode(type, severity)
    };
  }

  /**
   * 处理错误
   */
  public async handleError(
    errorInfo: ErrorInfo,
    recoveryOptions?: RecoveryOptions
  ): Promise<void> {
    // 记录错误历史
    this.addToHistory(errorInfo);

    // 记录日志
    if (this.config.enableLogging) {
      this.logError(errorInfo);
    }

    // 发送错误报告
    if (this.config.enableReporting) {
      await this.reportError(errorInfo);
    }

    // 显示用户通知
    if (this.config.enableUserNotification) {
      this.showUserNotification(errorInfo);
    }

    // 执行恢复策略
    if (recoveryOptions) {
      await this.executeRecoveryStrategy(errorInfo, recoveryOptions);
    }
  }

  /**
   * 处理网络错误
   */
  public async handleNetworkError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      '网络请求失败',
      error,
      context
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: RecoveryStrategy.RETRY,
      maxRetries: 3,
      retryDelay: 1000,
      showUserMessage: true,
      userMessage: '网络连接出现问题，正在尝试重新连接...'
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 处理验证错误
   */
  public async handleValidationError(
    message: string,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.VALIDATION_ERROR,
      ErrorSeverity.LOW,
      message,
      undefined,
      context
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: RecoveryStrategy.MANUAL,
      showUserMessage: true,
      userMessage: message
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 处理认证错误
   */
  public async handleAuthenticationError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.AUTHENTICATION_ERROR,
      ErrorSeverity.HIGH,
      '身份验证失败',
      error,
      context
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: RecoveryStrategy.REDIRECT,
      redirectUrl: '/login',
      showUserMessage: true,
      userMessage: '身份验证已过期，请重新登录'
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 处理服务器错误
   */
  public async handleServerError(
    error: Error,
    statusCode?: number,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.SERVER_ERROR,
      this.getServerErrorSeverity(statusCode),
      '服务器错误',
      error,
      { ...context, statusCode }
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: statusCode === 500 ? RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK,
      maxRetries: 2,
      retryDelay: 2000,
      showUserMessage: true,
      userMessage: this.getServerErrorMessage(statusCode)
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 处理内存错误
   */
  public async handleMemoryError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.MEMORY_ERROR,
      ErrorSeverity.CRITICAL,
      '内存不足',
      error,
      context
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: RecoveryStrategy.FALLBACK,
      fallbackAction: () => {
        // 触发内存清理
        if ((window as any).memoryManager) {
          (window as any).memoryManager.cleanupUnusedResources();
        }
      },
      showUserMessage: true,
      userMessage: '内存不足，已自动清理资源'
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 处理渲染错误
   */
  public async handleRenderingError(
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const errorInfo = this.createErrorInfo(
      ErrorType.RENDERING_ERROR,
      ErrorSeverity.HIGH,
      '渲染错误',
      error,
      context
    );

    const recoveryOptions: RecoveryOptions = {
      strategy: RecoveryStrategy.FALLBACK,
      showUserMessage: true,
      userMessage: '渲染出现问题，已切换到备用模式'
    };

    await this.handleError(errorInfo, recoveryOptions);
  }

  /**
   * 执行恢复策略
   */
  private async executeRecoveryStrategy(
    errorInfo: ErrorInfo,
    options: RecoveryOptions
  ): Promise<void> {
    const { strategy, maxRetries = 3, retryDelay = 1000 } = options;
    const errorKey = this.getErrorKey(errorInfo);

    switch (strategy) {
      case RecoveryStrategy.RETRY:
        if (this.canRetry(errorKey, maxRetries)) {
          setTimeout(() => {
            this.incrementRetryCount(errorKey);
            // 这里可以添加重试逻辑
          }, retryDelay);
        }
        break;

      case RecoveryStrategy.FALLBACK:
        if (options.fallbackAction) {
          options.fallbackAction();
        }
        break;

      case RecoveryStrategy.RELOAD:
        window.location.reload();
        break;

      case RecoveryStrategy.REDIRECT:
        if (options.redirectUrl) {
          window.location.href = options.redirectUrl;
        }
        break;

      case RecoveryStrategy.MANUAL:
        // 等待用户手动处理
        break;

      case RecoveryStrategy.IGNORE:
        // 忽略错误
        break;
    }

    // 显示用户消息
    if (options.showUserMessage && options.userMessage) {
      message.info(options.userMessage);
    }
  }

  /**
   * 记录错误日志
   */
  private logError(errorInfo: ErrorInfo): void {
    const logLevel = this.getLogLevel(errorInfo.severity);
    const logMessage = `[${errorInfo.type}] ${errorInfo.message}`;
    
    console[logLevel](`🚨 ${logMessage}`, {
      code: errorInfo.code,
      timestamp: new Date(errorInfo.timestamp).toISOString(),
      context: errorInfo.context,
      stack: errorInfo.stack
    });
  }

  /**
   * 发送错误报告
   */
  private async reportError(errorInfo: ErrorInfo): Promise<void> {
    if (!this.config.reportingUrl) return;

    try {
      const reportData = {
        ...errorInfo,
        userAgent: navigator.userAgent,
        url: window.location.href,
        timestamp: new Date(errorInfo.timestamp).toISOString()
      };

      await fetch(this.config.reportingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });

      console.log('📨 错误报告已发送');
    } catch (error) {
      console.error('❌ 发送错误报告失败:', error);
    }
  }

  /**
   * 显示用户通知
   */
  private showUserNotification(errorInfo: ErrorInfo): void {
    const { type, severity, message } = errorInfo;

    if (severity === ErrorSeverity.CRITICAL) {
      notification.error({
        message: '严重错误',
        description: message,
        duration: 0 // 不自动关闭
      });
    } else if (severity === ErrorSeverity.HIGH) {
      notification.error({
        message: '错误',
        description: message,
        duration: 8
      });
    } else if (severity === ErrorSeverity.MEDIUM) {
      notification.warning({
        message: '警告',
        description: message,
        duration: 5
      });
    } else {
      message.warning(message);
    }
  }

  /**
   * 添加到错误历史
   */
  private addToHistory(errorInfo: ErrorInfo): void {
    this.errorHistory.push(errorInfo);

    // 限制历史记录数量
    if (this.errorHistory.length > this.config.maxErrorHistory) {
      this.errorHistory = this.errorHistory.slice(-this.config.maxErrorHistory);
    }
  }

  /**
   * 检查是否可以重试
   */
  private canRetry(errorKey: string, maxRetries: number): boolean {
    const attempts = this.retryAttempts.get(errorKey) || 0;
    return attempts < maxRetries;
  }

  /**
   * 增加重试次数
   */
  private incrementRetryCount(errorKey: string): void {
    const attempts = this.retryAttempts.get(errorKey) || 0;
    this.retryAttempts.set(errorKey, attempts + 1);
  }

  /**
   * 获取错误键
   */
  private getErrorKey(errorInfo: ErrorInfo): string {
    return `${errorInfo.type}_${errorInfo.message}_${errorInfo.context?.url || ''}`;
  }

  /**
   * 生成错误代码
   */
  private generateErrorCode(type: ErrorType, severity: ErrorSeverity): string {
    const typeCode = Object.keys(ErrorType).indexOf(type).toString().padStart(2, '0');
    const severityCode = Object.keys(ErrorSeverity).indexOf(severity).toString();
    const timestamp = Date.now().toString().slice(-6);
    
    return `ERR-${typeCode}${severityCode}-${timestamp}`;
  }

  /**
   * 获取日志级别
   */
  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case ErrorSeverity.CRITICAL:
      case ErrorSeverity.HIGH:
        return 'error';
      case ErrorSeverity.MEDIUM:
        return 'warn';
      case ErrorSeverity.LOW:
      default:
        return 'info';
    }
  }

  /**
   * 获取服务器错误严重程度
   */
  private getServerErrorSeverity(statusCode?: number): ErrorSeverity {
    if (!statusCode) return ErrorSeverity.MEDIUM;
    
    if (statusCode >= 500) return ErrorSeverity.HIGH;
    if (statusCode >= 400) return ErrorSeverity.MEDIUM;
    return ErrorSeverity.LOW;
  }

  /**
   * 获取服务器错误消息
   */
  private getServerErrorMessage(statusCode?: number): string {
    if (!statusCode) return '服务器响应异常';
    
    const messages: Record<number, string> = {
      400: '请求参数错误',
      401: '身份验证失败',
      403: '访问权限不足',
      404: '请求的资源不存在',
      405: '请求方法不被允许',
      408: '请求超时',
      409: '请求冲突',
      422: '请求数据验证失败',
      429: '请求频率过高',
      500: '服务器内部错误',
      502: '网关错误',
      503: '服务暂时不可用',
      504: '网关超时'
    };
    
    return messages[statusCode] || `服务器错误 (${statusCode})`;
  }

  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    try {
      return localStorage.getItem('userId') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取会话ID
   */
  private getSessionId(): string | undefined {
    try {
      return sessionStorage.getItem('sessionId') || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * 获取错误历史
   */
  public getErrorHistory(): ErrorInfo[] {
    return [...this.errorHistory];
  }

  /**
   * 清除错误历史
   */
  public clearErrorHistory(): void {
    this.errorHistory = [];
    this.retryAttempts.clear();
  }

  /**
   * 获取错误统计
   */
  public getErrorStatistics(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
    recentErrors: ErrorInfo[];
  } {
    const byType = {} as Record<ErrorType, number>;
    const bySeverity = {} as Record<ErrorSeverity, number>;
    
    // 初始化计数器
    Object.values(ErrorType).forEach(type => {
      byType[type] = 0;
    });
    Object.values(ErrorSeverity).forEach(severity => {
      bySeverity[severity] = 0;
    });
    
    // 统计错误
    this.errorHistory.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
    });
    
    // 获取最近的错误
    const recentErrors = this.errorHistory
      .slice(-10)
      .sort((a, b) => b.timestamp - a.timestamp);
    
    return {
      total: this.errorHistory.length,
      byType,
      bySeverity,
      recentErrors
    };
  }
}

// 创建全局错误处理器实例
export const errorHandler = new ErrorHandler({
  enableReporting: process.env.NODE_ENV === 'production',
  reportingUrl: process.env.REACT_APP_ERROR_REPORTING_URL,
  enableLogging: true,
  enableUserNotification: true
});

// 导出工具函数
export const handleError = (
  type: ErrorType,
  severity: ErrorSeverity,
  message: string,
  originalError?: Error,
  context?: Record<string, any>,
  recoveryOptions?: RecoveryOptions
) => {
  const errorInfo = errorHandler.createErrorInfo(type, severity, message, originalError, context);
  return errorHandler.handleError(errorInfo, recoveryOptions);
};

export default ErrorHandler;