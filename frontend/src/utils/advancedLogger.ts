/**
 * 高级日志系统
 * 提供分级日志、性能追踪、错误捕获和远程上报功能
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  stack?: string;
  userAgent?: string;
  url?: string;
  userId?: string;
  sessionId: string;
  performance?: {
    memory: number;
    timing: number;
    fps: number;
  };
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStorageEntries: number;
  remoteEndpoint?: string;
  categories: string[];
  enablePerformanceTracking: boolean;
  enableErrorCapture: boolean;
  bufferSize: number;
  flushInterval: number;
}

class AdvancedLogger {
  private config: LoggerConfig;
  private buffer: LogEntry[] = [];
  private sessionId: string;
  private performanceObserver?: PerformanceObserver;
  private errorHandler?: (event: ErrorEvent) => void;
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void;

  constructor(config?: Partial<LoggerConfig>) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableStorage: true,
      enableRemote: false,
      maxStorageEntries: 1000,
      categories: ['app', 'api', 'ui', 'performance', 'error'],
      enablePerformanceTracking: true,
      enableErrorCapture: true,
      bufferSize: 50,
      flushInterval: 30000, // 30秒
      ...config
    };

    this.sessionId = this.generateSessionId();
    this.initializeErrorCapture();
    this.initializePerformanceTracking();
    this.startPeriodicFlush();
    
    // 页面卸载时确保日志被保存
    window.addEventListener('beforeunload', () => {
      this.flush();
    });
  }

  // ========== 公共日志方法 ==========

  debug(message: string, data?: any, category = 'app') {
    this.log(LogLevel.DEBUG, category, message, data);
  }

  info(message: string, data?: any, category = 'app') {
    this.log(LogLevel.INFO, category, message, data);
  }

  warn(message: string, data?: any, category = 'app') {
    this.log(LogLevel.WARN, category, message, data);
  }

  error(message: string, error?: Error | any, category = 'error') {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log(LogLevel.ERROR, category, message, data, error?.stack);
  }

  fatal(message: string, error?: Error | any, category = 'error') {
    const data = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error;
    
    this.log(LogLevel.FATAL, category, message, data, error?.stack);
    
    // 立即刷新致命错误
    this.flush();
  }

  // 性能日志
  performance(action: string, duration: number, data?: any) {
    this.log(LogLevel.INFO, 'performance', `${action} completed in ${duration}ms`, {
      action,
      duration,
      ...data
    });
  }

  // API请求日志
  apiRequest(method: string, url: string, duration: number, status: number, data?: any) {
    const level = status >= 400 ? LogLevel.ERROR : LogLevel.INFO;
    this.log(level, 'api', `${method} ${url} - ${status} (${duration}ms)`, {
      method,
      url,
      duration,
      status,
      ...data
    });
  }

  // 用户行为日志
  userAction(action: string, target?: string, data?: any) {
    this.log(LogLevel.INFO, 'ui', `User ${action}${target ? ` on ${target}` : ''}`, {
      action,
      target,
      ...data
    });
  }

  // ========== 核心日志方法 ==========

  private log(level: LogLevel, category: string, message: string, data?: any, stack?: string) {
    // 检查日志级别
    if (level < this.config.level) {
      return;
    }

    // 检查分类
    if (!this.config.categories.includes(category)) {
      return;
    }

    const entry: LogEntry = {
      id: this.generateId(),
      timestamp: Date.now(),
      level,
      category,
      message,
      data,
      stack,
      userAgent: navigator.userAgent,
      url: window.location.href,
      sessionId: this.sessionId,
      performance: this.config.enablePerformanceTracking ? this.getCurrentPerformance() : undefined
    };

    // 添加到缓冲区
    this.buffer.push(entry);

    // 控制台输出
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }

    // 检查是否需要刷新
    if (this.buffer.length >= this.config.bufferSize || level >= LogLevel.ERROR) {
      this.scheduleFlush();
    }
  }

  // ========== 输出处理 ==========

  private outputToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toISOString();
    const prefix = `[${timestamp}] [${LogLevel[entry.level]}] [${entry.category}]`;
    
    const style = this.getConsoleStyle(entry.level);
    
    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.INFO:
        console.info(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.WARN:
        console.warn(`%c${prefix}`, style, entry.message, entry.data || '');
        break;
      case LogLevel.ERROR:
      case LogLevel.FATAL:
        console.error(`%c${prefix}`, style, entry.message, entry.data || '');
        if (entry.stack) {
          console.error('Stack trace:', entry.stack);
        }
        break;
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return 'color: #6c757d; font-weight: normal;';
      case LogLevel.INFO:
        return 'color: #007bff; font-weight: normal;';
      case LogLevel.WARN:
        return 'color: #ffc107; font-weight: bold;';
      case LogLevel.ERROR:
        return 'color: #dc3545; font-weight: bold;';
      case LogLevel.FATAL:
        return 'color: #ffffff; background-color: #dc3545; font-weight: bold; padding: 2px 4px;';
      default:
        return '';
    }
  }

  // ========== 存储和远程上报 ==========

  private async flush() {
    if (this.buffer.length === 0) {
      return;
    }

    const entries = [...this.buffer];
    this.buffer = [];

    // 本地存储
    if (this.config.enableStorage) {
      await this.saveToStorage(entries);
    }

    // 远程上报
    if (this.config.enableRemote && this.config.remoteEndpoint) {
      await this.sendToRemote(entries);
    }
  }

  private async saveToStorage(entries: LogEntry[]) {
    try {
      const existingLogs = this.getStoredLogs();
      const combinedLogs = [...existingLogs, ...entries];
      
      // 限制存储条目数量
      if (combinedLogs.length > this.config.maxStorageEntries) {
        combinedLogs.splice(0, combinedLogs.length - this.config.maxStorageEntries);
      }
      
      localStorage.setItem('deepcad_logs', JSON.stringify(combinedLogs));
    } catch (error) {
      console.warn('Failed to save logs to storage:', error);
    }
  }

  private async sendToRemote(entries: LogEntry[]) {
    if (!this.config.remoteEndpoint) return;
    
    try {
      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: this.sessionId,
          entries,
          userAgent: navigator.userAgent,
          url: window.location.href,
          timestamp: Date.now()
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.warn('Failed to send logs to remote endpoint:', error);
      // 将失败的日志重新放回缓冲区
      this.buffer.unshift(...entries);
    }
  }

  // ========== 错误捕获 ==========

  private initializeErrorCapture() {
    if (!this.config.enableErrorCapture) return;

    // 捕获JavaScript错误
    this.errorHandler = (event: ErrorEvent) => {
      this.error('Uncaught JavaScript Error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
      });
    };
    
    window.addEventListener('error', this.errorHandler);

    // 捕获Promise拒绝
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      this.error('Unhandled Promise Rejection', {
        reason: event.reason,
        promise: event.promise
      });
    };
    
    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler);
  }

  // ========== 性能追踪 ==========

  private initializePerformanceTracking() {
    if (!this.config.enablePerformanceTracking || !('PerformanceObserver' in window)) {
      return;
    }

    try {
      // 观察导航性能
      const navigationObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.entryType === 'navigation') {
            const nav = entry as PerformanceNavigationTiming;
            this.performance('Page Load', nav.loadEventEnd - nav.fetchStart, {
              domContentLoaded: nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart,
              domComplete: nav.domComplete - nav.domLoading,
              networkTime: nav.responseEnd - nav.fetchStart
            });
          }
        }
      });
      navigationObserver.observe({ entryTypes: ['navigation'] });

      // 观察资源加载性能
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 1000) { // 只记录耗时超过1秒的资源
            this.performance('Resource Load', entry.duration, {
              name: entry.name,
              size: (entry as any).transferSize || 0
            });
          }
        }
      });
      resourceObserver.observe({ entryTypes: ['resource'] });

    } catch (error) {
      console.warn('Failed to initialize performance tracking:', error);
    }
  }

  private getCurrentPerformance() {
    try {
      const memory = (performance as any).memory;
      const timing = performance.now();
      
      return {
        memory: memory ? memory.usedJSHeapSize / 1024 / 1024 : 0, // MB
        timing,
        fps: this.getFPS()
      };
    } catch {
      return undefined;
    }
  }

  private getFPS(): number {
    // 简化的FPS计算，实际应用中需要更复杂的实现
    return 60; // 默认值
  }

  // ========== 辅助方法 ==========

  private scheduleFlush() {
    // 防止重复调度
    if ((this as any).flushTimeout) {
      return;
    }
    
    (this as any).flushTimeout = setTimeout(() => {
      this.flush();
      delete (this as any).flushTimeout;
    }, 100);
  }

  private startPeriodicFlush() {
    setInterval(() => {
      if (this.buffer.length > 0) {
        this.flush();
      }
    }, this.config.flushInterval);
  }

  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
  }

  // ========== 公共查询方法 ==========

  getStoredLogs(): LogEntry[] {
    try {
      const logs = localStorage.getItem('deepcad_logs');
      return logs ? JSON.parse(logs) : [];
    } catch {
      return [];
    }
  }

  getLogsByLevel(level: LogLevel): LogEntry[] {
    return this.getStoredLogs().filter(log => log.level === level);
  }

  getLogsByCategory(category: string): LogEntry[] {
    return this.getStoredLogs().filter(log => log.category === category);
  }

  getLogsByTimeRange(startTime: number, endTime: number): LogEntry[] {
    return this.getStoredLogs().filter(log => 
      log.timestamp >= startTime && log.timestamp <= endTime
    );
  }

  clearLogs() {
    localStorage.removeItem('deepcad_logs');
    this.buffer = [];
  }

  // 导出日志
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    const logs = this.getStoredLogs();
    
    if (format === 'csv') {
      const headers = ['timestamp', 'level', 'category', 'message', 'url'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toISOString(),
        LogLevel[log.level],
        log.category,
        log.message.replace(/"/g, '""'), // 转义CSV中的引号
        log.url || ''
      ]);
      
      return [headers, ...rows].map(row => 
        row.map(cell => `"${cell}"`).join(',')
      ).join('\n');
    }
    
    return JSON.stringify(logs, null, 2);
  }

  // 设置用户ID（用于远程日志关联）
  setUserId(userId: string) {
    // 为后续日志添加用户ID，这里可以扩展实现
    (this as any).userId = userId;
  }

  // 销毁logger
  destroy() {
    // 移除事件监听器
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler);
    }
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler);
    }
    
    // 最后一次刷新
    this.flush();
    
    // 清理性能观察者
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
  }
}

// 全局logger实例
export const logger = new AdvancedLogger({
  level: process.env.NODE_ENV === 'development' ? LogLevel.DEBUG : LogLevel.INFO,
  enableRemote: process.env.NODE_ENV === 'production',
  remoteEndpoint: process.env.NODE_ENV === 'production' ? '/api/logs' : undefined
});

// React Hook for log viewing
import React from 'react';

export const useLogViewer = () => {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);
  const [filter, setFilter] = React.useState({
    level: LogLevel.DEBUG,
    category: '',
    timeRange: { start: 0, end: Date.now() }
  });

  const refreshLogs = () => {
    let filteredLogs = logger.getStoredLogs();
    
    if (filter.level !== LogLevel.DEBUG) {
      filteredLogs = filteredLogs.filter(log => log.level >= filter.level);
    }
    
    if (filter.category) {
      filteredLogs = filteredLogs.filter(log => log.category === filter.category);
    }
    
    if (filter.timeRange.start > 0) {
      filteredLogs = filteredLogs.filter(log => 
        log.timestamp >= filter.timeRange.start && log.timestamp <= filter.timeRange.end
      );
    }
    
    setLogs(filteredLogs.sort((a, b) => b.timestamp - a.timestamp));
  };

  React.useEffect(() => {
    refreshLogs();
  }, [filter]);

  return {
    logs,
    filter,
    setFilter,
    refreshLogs,
    clearLogs: () => {
      logger.clearLogs();
      refreshLogs();
    },
    exportLogs: logger.exportLogs.bind(logger)
  };
};

export default AdvancedLogger;