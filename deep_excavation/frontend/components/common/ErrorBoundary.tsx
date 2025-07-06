/**
 * React错误边界组件
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { globalResourceManager } from '../../core/resourceManager';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 React错误边界捕获到错误:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo
    });

    // 清理资源以防止内存泄漏
    try {
      globalResourceManager.cleanup();
    } catch (cleanupError) {
      console.error('清理资源时出错:', cleanupError);
    }

    // 可以在这里集成错误报告服务
    this.reportError(error, errorInfo);
  }

  private reportError(error: Error, errorInfo: ErrorInfo) {
    // 这里可以集成错误报告服务（如Sentry）
    const errorReport = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    console.error('错误报告:', errorReport);
    
    // 发送到错误报告服务
    // errorReportingService.report(errorReport);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      // 自定义错误UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-8">
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">💥</div>
              <h1 className="text-3xl font-bold text-red-400 mb-2">
                系统遇到了意外错误
              </h1>
              <p className="text-gray-300">
                深基坑分析系统在运行过程中遇到了问题，我们正在努力修复。
              </p>
            </div>

            {/* 错误详情 */}
            <div className="bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-red-400 mb-3">错误详情</h3>
              
              {this.state.error && (
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-1">错误消息:</div>
                  <div className="text-sm font-mono bg-red-900/30 p-2 rounded border-l-4 border-red-500">
                    {this.state.error.message}
                  </div>
                </div>
              )}

              {this.state.error?.stack && (
                <details className="mb-4">
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
                    查看堆栈跟踪
                  </summary>
                  <pre className="text-xs font-mono bg-gray-900 p-3 rounded mt-2 overflow-auto max-h-40">
                    {this.state.error.stack}
                  </pre>
                </details>
              )}

              {this.state.errorInfo?.componentStack && (
                <details>
                  <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
                    查看组件堆栈
                  </summary>
                  <pre className="text-xs font-mono bg-gray-900 p-3 rounded mt-2 overflow-auto max-h-40">
                    {this.state.errorInfo.componentStack}
                  </pre>
                </details>
              )}
            </div>

            {/* 解决建议 */}
            <div className="bg-blue-900/30 border border-blue-500 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-semibold text-blue-400 mb-3">💡 解决建议</h3>
              <ul className="text-sm text-gray-300 space-y-2">
                <li>• 尝试重新加载页面</li>
                <li>• 清除浏览器缓存和存储数据</li>
                <li>• 检查网络连接是否正常</li>
                <li>• 确保浏览器版本支持WebGL</li>
                <li>• 如果问题持续存在，请联系技术支持</li>
              </ul>
            </div>

            {/* 操作按钮 */}
            <div className="flex space-x-4 justify-center">
              <button
                onClick={this.handleReload}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔄 重新加载页面
              </button>
              
              <button
                onClick={this.handleReset}
                className="bg-gray-600 hover:bg-gray-700 text-white px-6 py-2 rounded-lg transition-colors"
              >
                🔧 尝试恢复
              </button>
            </div>

            {/* 技术信息 */}
            <div className="mt-8 pt-6 border-t border-gray-700">
              <details>
                <summary className="text-sm text-gray-400 cursor-pointer hover:text-white">
                  技术信息
                </summary>
                <div className="text-xs text-gray-500 mt-2 space-y-1">
                  <div>时间: {new Date().toLocaleString()}</div>
                  <div>浏览器: {navigator.userAgent}</div>
                  <div>URL: {window.location.href}</div>
                  <div>内存: {(performance as any).memory ? 
                    `${Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)}MB` : 
                    '未知'}</div>
                </div>
              </details>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
} 