/**
 * 增强错误边界组件
 * 提供更好的错误处理和用户体验
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { MemoryMonitor, FPSMonitor } from '../../utils/performanceOptimizer';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  maxRetries: number;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  private memoryMonitor = new MemoryMonitor();
  private fpsMonitor = new FPSMonitor();

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
      retryCount: 0,
      maxRetries: 3
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // 生成错误ID用于追踪
    const errorId = `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      hasError: true,
      error,
      errorId
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // 收集性能数据
    const memoryUsage = this.memoryMonitor.getMemoryUsage();
    const currentFPS = this.fpsMonitor.getFPS();

    // 增强的错误报告
    const enhancedError = {
      ...error,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      performance: {
        memory: memoryUsage,
        fps: currentFPS
      },
      stackTrace: error.stack,
      componentStack: errorInfo.componentStack
    };

    // 记录到控制台
    console.error('🚨 Enhanced Error Boundary:', enhancedError);

    // 调用外部错误处理器
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // 发送错误报告（在生产环境中）
    if (process.env.NODE_ENV === 'production') {
      this.sendErrorReport(enhancedError);
    }
  }

  private sendErrorReport = (errorData: any) => {
    // 这里可以集成错误报告服务（如 Sentry, LogRocket 等）
    try {
      // 示例：发送到错误收集服务
      fetch('/api/errors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(errorData)
      }).catch(err => {
        console.warn('错误报告发送失败:', err);
      });
    } catch (err) {
      console.warn('错误报告处理失败:', err);
    }
  };

  private handleRetry = () => {
    const { retryCount, maxRetries } = this.state;
    
    if (retryCount < maxRetries) {
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1
      });
    }
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleReportIssue = () => {
    const { error, errorId } = this.state;
    const subject = encodeURIComponent(`Bug Report - ${errorId}`);
    const body = encodeURIComponent(
      `Error ID: ${errorId}\n` +
      `Error: ${error?.message}\n` +
      `Stack: ${error?.stack}\n` +
      `URL: ${window.location.href}\n` +
      `User Agent: ${navigator.userAgent}\n` +
      `Timestamp: ${new Date().toISOString()}`
    );
    
    window.open(`mailto:support@deepcad.com?subject=${subject}&body=${body}`);
  };

  render() {
    const { hasError, error, errorInfo, retryCount, maxRetries } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      // 如果提供了自定义fallback，使用它
      if (fallback) {
        return fallback;
      }

      // 默认错误UI
      return (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
          color: '#ffffff',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          {/* 错误图标 */}
          <div style={{
            fontSize: '64px',
            marginBottom: '20px',
            animation: 'pulse 2s infinite'
          }}>
            🚨
          </div>

          {/* 标题 */}
          <h1 style={{
            fontSize: '28px',
            fontWeight: 'bold',
            marginBottom: '16px',
            color: '#ff6b6b'
          }}>
            哎呀！出现了一个错误
          </h1>

          {/* 描述 */}
          <p style={{
            fontSize: '16px',
            color: 'rgba(255, 255, 255, 0.8)',
            maxWidth: '600px',
            lineHeight: '1.6',
            marginBottom: '30px'
          }}>
            DeepCAD遇到了一个意外错误。我们已经记录了此问题并将尽快修复。
            您可以尝试刷新页面或联系技术支持。
          </p>

          {/* 错误详情（开发环境） */}
          {process.env.NODE_ENV === 'development' && error && (
            <details style={{
              background: 'rgba(0, 0, 0, 0.3)',
              padding: '16px',
              borderRadius: '8px',
              marginBottom: '20px',
              maxWidth: '800px',
              width: '100%'
            }}>
              <summary style={{
                cursor: 'pointer',
                fontWeight: 'bold',
                marginBottom: '10px'
              }}>
                🔍 错误详情（开发模式）
              </summary>
              <pre style={{
                fontSize: '12px',
                color: '#ff9999',
                overflow: 'auto',
                maxHeight: '200px',
                whiteSpace: 'pre-wrap'
              }}>
                <strong>错误消息:</strong> {error.message}
                {'\n\n'}
                <strong>错误堆栈:</strong>
                {'\n'}{error.stack}
                {errorInfo && (
                  <>
                    {'\n\n'}
                    <strong>组件堆栈:</strong>
                    {'\n'}{errorInfo.componentStack}
                  </>
                )}
              </pre>
            </details>
          )}

          {/* 操作按钮 */}
          <div style={{
            display: 'flex',
            gap: '16px',
            flexWrap: 'wrap',
            justifyContent: 'center'
          }}>
            {retryCount < maxRetries && (
              <button
                onClick={this.handleRetry}
                style={{
                  background: 'linear-gradient(45deg, #4CAF50, #45a049)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  transition: 'transform 0.2s',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                🔄 重试 ({maxRetries - retryCount} 次剩余)
              </button>
            )}

            <button
              onClick={this.handleReload}
              style={{
                background: 'linear-gradient(45deg, #2196F3, #1976D2)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              🔃 刷新页面
            </button>

            <button
              onClick={this.handleReportIssue}
              style={{
                background: 'linear-gradient(45deg, #FF9800, #F57C00)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold',
                transition: 'transform 0.2s',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              📧 报告问题
            </button>
          </div>

          {/* 帮助信息 */}
          <div style={{
            marginTop: '40px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            maxWidth: '600px'
          }}>
            <h3 style={{ marginBottom: '12px', color: '#ffd700' }}>💡 故障排除提示</h3>
            <ul style={{
              textAlign: 'left',
              fontSize: '14px',
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: '1.6'
            }}>
              <li>• 检查网络连接是否正常</li>
              <li>• 清除浏览器缓存和存储数据</li>
              <li>• 确保浏览器版本支持WebGL</li>
              <li>• 尝试使用无痕/隐私模式</li>
              <li>• 如果问题持续存在，请联系技术支持</li>
            </ul>
          </div>

          {/* 添加CSS动画 */}
          <style>
            {`
              @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
              }
            `}
          </style>
        </div>
      );
    }

    return children;
  }
}

export default EnhancedErrorBoundary;
