/**
 * 开发工具集
 * 提供开发阶段的调试和日志功能
 */

export class ComponentDevHelper {
  /**
   * 开发提示日志
   */
  static logDevTip(message: string, component?: string): void {
    if (process.env.NODE_ENV === 'development') {
      const prefix = component ? `[${component}]` : '[Dev]';
      console.log(`💡 ${prefix} ${message}`);
    }
  }

  /**
   * 错误日志
   */
  static logError(error: Error, component?: string, developer?: string): void {
    const prefix = component ? `[${component}]` : '[Error]';
    const devInfo = developer ? ` (${developer})` : '';
    console.error(`❌ ${prefix}${devInfo}:`, error.message);
    
    if (process.env.NODE_ENV === 'development') {
      console.error('Stack trace:', error.stack);
    }
  }

  /**
   * 警告日志
   */
  static logWarning(message: string, component?: string): void {
    const prefix = component ? `[${component}]` : '[Warning]';
    console.warn(`⚠️ ${prefix} ${message}`);
  }

  /**
   * 性能监控
   */
  static measurePerformance<T>(
    operation: () => T,
    operationName: string,
    component?: string
  ): T {
    if (process.env.NODE_ENV !== 'development') {
      return operation();
    }

    const prefix = component ? `[${component}]` : '[Perf]';
    const startTime = performance.now();
    
    try {
      const result = operation();
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`⏱️ ${prefix} ${operationName}: ${duration.toFixed(2)}ms`);
      return result;
    } catch (error) {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.error(`❌ ${prefix} ${operationName} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  /**
   * 内存使用监控
   */
  static logMemoryUsage(component?: string): void {
    if (process.env.NODE_ENV !== 'development' || !('memory' in performance)) {
      return;
    }

    const prefix = component ? `[${component}]` : '[Memory]';
    const memory = (performance as any).memory;
    
    console.log(`🧠 ${prefix} Memory Usage:`, {
      used: `${(memory.usedJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      total: `${(memory.totalJSHeapSize / 1024 / 1024).toFixed(2)} MB`,
      limit: `${(memory.jsHeapSizeLimit / 1024 / 1024).toFixed(2)} MB`
    });
  }

  /**
   * 调试信息
   */
  static debug(data: any, label?: string, component?: string): void {
    if (process.env.NODE_ENV === 'development') {
      const prefix = component ? `[${component}]` : '[Debug]';
      const labelText = label ? ` ${label}:` : ':';
      console.log(`🔍 ${prefix}${labelText}`, data);
    }
  }
}
