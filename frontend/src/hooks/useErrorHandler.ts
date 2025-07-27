/**
 * 错误处理Hook
 * DeepCAD Deep Excavation CAE Platform - Error Handler Hook
 * 
 * 作者：2号几何专家
 * 功能：组件级错误处理、错误恢复、用户通知、错误统计
 */

import { useCallback, useState, useEffect } from 'react';
import { 
  errorHandler, 
  ErrorType, 
  ErrorSeverity, 
  RecoveryStrategy,
  type ErrorInfo,
  type RecoveryOptions 
} from '../utils/errorHandler';

// Hook选项
export interface UseErrorHandlerOptions {
  enableAutoRecovery?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  showUserNotifications?: boolean;
  logErrors?: boolean;
  context?: Record<string, any>;
}

// Hook返回值
export interface ErrorHandlerHook {
  // 错误状态
  hasError: boolean;
  lastError: ErrorInfo | null;
  errorHistory: ErrorInfo[];
  
  // 错误处理方法
  handleError: (
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    originalError?: Error,
    recoveryOptions?: RecoveryOptions
  ) => Promise<void>;
  
  // 便捷错误处理方法
  handleNetworkError: (error: Error, context?: Record<string, any>) => Promise<void>;
  handleValidationError: (message: string, context?: Record<string, any>) => Promise<void>;
  handleServerError: (error: Error, statusCode?: number, context?: Record<string, any>) => Promise<void>;
  handleRenderingError: (error: Error, context?: Record<string, any>) => Promise<void>;
  handleMemoryError: (error: Error, context?: Record<string, any>) => Promise<void>;
  
  // 状态管理
  clearError: () => void;
  clearAllErrors: () => void;
  
  // 错误统计
  getErrorStatistics: () => {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<ErrorSeverity, number>;
  };
  
  // 错误恢复
  retryLastOperation: () => Promise<void>;
  
  // 配置更新
  updateOptions: (newOptions: Partial<UseErrorHandlerOptions>) => void;
}

// 默认选项
const DEFAULT_OPTIONS: UseErrorHandlerOptions = {
  enableAutoRecovery: true,
  maxRetries: 3,
  retryDelay: 1000,
  showUserNotifications: true,
  logErrors: true,
  context: {}
};

export const useErrorHandler = (
  initialOptions: UseErrorHandlerOptions = {}
): ErrorHandlerHook => {
  
  // 合并选项
  const [options, setOptions] = useState<UseErrorHandlerOptions>({
    ...DEFAULT_OPTIONS,
    ...initialOptions
  });
  
  // 状态管理
  const [hasError, setHasError] = useState(false);
  const [lastError, setLastError] = useState<ErrorInfo | null>(null);
  const [errorHistory, setErrorHistory] = useState<ErrorInfo[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const [lastOperation, setLastOperation] = useState<() => Promise<void> | null>(null);

  // 处理错误的核心方法
  const handleError = useCallback(async (
    type: ErrorType,
    severity: ErrorSeverity,
    message: string,
    originalError?: Error,
    recoveryOptions?: RecoveryOptions
  ): Promise<void> => {
    try {
      // 创建错误信息
      const errorInfo = errorHandler.createErrorInfo(
        type,
        severity,
        message,
        originalError,
        { ...options.context, component: 'useErrorHandler' }
      );
      
      // 更新状态
      setHasError(true);
      setLastError(errorInfo);
      setErrorHistory(prev => [...prev, errorInfo].slice(-50)); // 保持最近50个错误
      
      // 如果启用了日志记录
      if (options.logErrors) {
        console.error(`🚨 [${type}] ${message}`, {
          severity,
          originalError,
          context: options.context
        });
      }
      
      // 构建恢复选项
      const finalRecoveryOptions: RecoveryOptions = {
        strategy: RecoveryStrategy.MANUAL,
        maxRetries: options.maxRetries || 3,
        retryDelay: options.retryDelay || 1000,
        showUserMessage: options.showUserNotifications,
        ...recoveryOptions
      };
      
      // 使用全局错误处理器处理错误
      await errorHandler.handleError(errorInfo, finalRecoveryOptions);
      
      // 如果启用了自动恢复
      if (options.enableAutoRecovery && severity !== ErrorSeverity.CRITICAL) {
        setTimeout(() => {
          setHasError(false);
        }, 5000); // 5秒后自动清除错误状态
      }
      
    } catch (handlerError) {
      console.error('错误处理器本身出现错误:', handlerError);
    }
  }, [options]);

  // 网络错误处理
  const handleNetworkError = useCallback(async (
    error: Error,
    context?: Record<string, any>
  ): Promise<void> => {
    await handleError(
      ErrorType.NETWORK_ERROR,
      ErrorSeverity.MEDIUM,
      '网络连接失败',
      error,
      {
        strategy: RecoveryStrategy.RETRY,
        maxRetries: options.maxRetries,
        retryDelay: options.retryDelay,
        userMessage: '网络连接出现问题，正在重试...'
      }
    );
  }, [handleError, options.maxRetries, options.retryDelay]);

  // 验证错误处理
  const handleValidationError = useCallback(async (
    message: string,
    context?: Record<string, any>
  ): Promise<void> => {
    await handleError(
      ErrorType.VALIDATION_ERROR,
      ErrorSeverity.LOW,
      message,
      undefined,
      {
        strategy: RecoveryStrategy.MANUAL,
        userMessage: message
      }
    );
  }, [handleError]);

  // 服务器错误处理
  const handleServerError = useCallback(async (
    error: Error,
    statusCode?: number,
    context?: Record<string, any>
  ): Promise<void> => {
    const severity = statusCode && statusCode >= 500 ? ErrorSeverity.HIGH : ErrorSeverity.MEDIUM;
    const strategy = statusCode === 500 ? RecoveryStrategy.RETRY : RecoveryStrategy.FALLBACK;
    
    await handleError(
      ErrorType.SERVER_ERROR,
      severity,
      `服务器错误 (${statusCode || 'unknown'})`,
      error,
      {
        strategy,
        maxRetries: strategy === RecoveryStrategy.RETRY ? 2 : 0,
        userMessage: `服务器响应异常 (${statusCode || 'unknown'})`
      }
    );
  }, [handleError]);

  // 渲染错误处理
  const handleRenderingError = useCallback(async (
    error: Error,
    context?: Record<string, any>
  ): Promise<void> => {
    await handleError(
      ErrorType.RENDERING_ERROR,
      ErrorSeverity.HIGH,
      '页面渲染失败',
      error,
      {
        strategy: RecoveryStrategy.FALLBACK,
        userMessage: '页面渲染出现问题，已切换到安全模式'
      }
    );
  }, [handleError]);

  // 内存错误处理
  const handleMemoryError = useCallback(async (
    error: Error,
    context?: Record<string, any>
  ): Promise<void> => {
    await handleError(
      ErrorType.MEMORY_ERROR,
      ErrorSeverity.CRITICAL,
      '内存不足',
      error,
      {
        strategy: RecoveryStrategy.FALLBACK,
        fallbackAction: () => {
          // 触发内存清理
          if ((window as any).memoryManager) {
            (window as any).memoryManager.cleanupUnusedResources();
          }
          // 强制垃圾回收
          if ((window as any).gc) {
            (window as any).gc();
          }
        },
        userMessage: '内存不足，已自动清理资源'
      }
    );
  }, [handleError]);

  // 清除单个错误
  const clearError = useCallback(() => {
    setHasError(false);
    setLastError(null);
    setRetryCount(0);
  }, []);

  // 清除所有错误
  const clearAllErrors = useCallback(() => {
    setHasError(false);
    setLastError(null);
    setErrorHistory([]);
    setRetryCount(0);
    setLastOperation(null);
  }, []);

  // 获取错误统计
  const getErrorStatistics = useCallback(() => {
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
    errorHistory.forEach(error => {
      byType[error.type]++;
      bySeverity[error.severity]++;
    });
    
    return {
      total: errorHistory.length,
      byType,
      bySeverity
    };
  }, [errorHistory]);

  // 重试最后一次操作
  const retryLastOperation = useCallback(async (): Promise<void> => {
    if (!lastOperation || retryCount >= (options.maxRetries || 3)) {
      console.warn('无法重试：没有可重试的操作或已达到最大重试次数');
      return;
    }
    
    try {
      setRetryCount(prev => prev + 1);
      await lastOperation();
      
      // 重试成功，清除错误状态
      clearError();
      console.log(`✅ 重试成功 (第${retryCount + 1}次)`);
      
    } catch (error) {
      console.error(`❌ 重试失败 (第${retryCount + 1}次):`, error);
      
      // 如果还能重试，延迟后自动重试
      if (retryCount < (options.maxRetries || 3) - 1) {
        setTimeout(() => {
          retryLastOperation();
        }, options.retryDelay || 1000);
      } else {
        await handleError(
          ErrorType.UNKNOWN_ERROR,
          ErrorSeverity.HIGH,
          '重试次数已达上限',
          error as Error
        );
      }
    }
  }, [lastOperation, retryCount, options.maxRetries, options.retryDelay, clearError, handleError]);

  // 更新选项
  const updateOptions = useCallback((newOptions: Partial<UseErrorHandlerOptions>) => {
    setOptions(prev => ({ ...prev, ...newOptions }));
  }, []);

  // 监听全局错误事件
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      handleError(
        ErrorType.CLIENT_ERROR,
        ErrorSeverity.HIGH,
        event.message,
        event.error,
        {
          strategy: RecoveryStrategy.MANUAL,
          userMessage: '页面出现异常，请刷新页面重试'
        }
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      handleError(
        ErrorType.UNKNOWN_ERROR,
        ErrorSeverity.MEDIUM,
        '未处理的Promise错误',
        event.reason,
        {
          strategy: RecoveryStrategy.MANUAL,
          userMessage: '操作失败，请重试'
        }
      );
    };

    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, [handleError]);

  // 自动清理过期的错误历史
  useEffect(() => {
    const cleanup = setInterval(() => {
      const oneHourAgo = Date.now() - 60 * 60 * 1000; // 1小时前
      setErrorHistory(prev => 
        prev.filter(error => error.timestamp > oneHourAgo)
      );
    }, 10 * 60 * 1000); // 每10分钟清理一次

    return () => clearInterval(cleanup);
  }, []);

  return {
    hasError,
    lastError,
    errorHistory,
    handleError,
    handleNetworkError,
    handleValidationError,
    handleServerError,
    handleRenderingError,
    handleMemoryError,
    clearError,
    clearAllErrors,
    getErrorStatistics,
    retryLastOperation,
    updateOptions
  };
};