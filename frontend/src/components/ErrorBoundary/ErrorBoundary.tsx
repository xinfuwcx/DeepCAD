/**
 * 通用错误边界组件
 * DeepCAD Deep Excavation CAE Platform - Error Boundary Component
 * 
 * 作者：2号几何专家
 * 功能：错误捕获、错误报告、降级UI、错误恢复
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { Result, Button, Card, Alert, Typography, Space, Collapse, Tag } from 'antd';
import { 
  AlertTriangle, 
  RefreshCw, 
  Bug, 
  Home, 
  Mail,
  Clock,
  Monitor,
  Code
} from 'lucide-react';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

// 错误信息接口
export interface ErrorDetails {
  message: string;
  stack?: string;
  componentStack?: string;
  timestamp: number;
  userAgent: string;
  url: string;
  userId?: string;
  sessionId?: string;
  buildVersion?: string;
}

// 错误边界Props
export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo, details: ErrorDetails) => void;
  showDetails?: boolean;
  enableRecovery?: boolean;
  maxRetries?: number;
  resetTimeout?: number; // 自动重置超时时间(ms)
  errorReportingUrl?: string;
  className?: string;
}

// 错误边界State
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: ErrorDetails | null;
  retryCount: number;
  isRetrying: boolean;
  lastErrorTime: number;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private resetTimeoutId?: NodeJS.Timeout;
  
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      retryCount: 0,
      isRetrying: false,
      lastErrorTime: 0
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      lastErrorTime: Date.now()
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary捕获到错误:', error);
    console.error('📍 错误详细信息:', errorInfo);
    
    // 构建详细错误信息
    const errorDetails: ErrorDetails = {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href,
      userId: this.getUserId(),
      sessionId: this.getSessionId(),
      buildVersion: process.env.REACT_APP_VERSION || 'unknown'
    };
    
    this.setState({
      errorInfo,
      errorDetails
    });
    
    // 调用错误回调
    if (this.props.onError) {
      this.props.onError(error, errorInfo, errorDetails);
    }
    
    // 发送错误报告
    this.sendErrorReport(error, errorInfo, errorDetails);
    
    // 设置自动重置定时器
    if (this.props.resetTimeout && this.props.resetTimeout > 0) {
      this.resetTimeoutId = setTimeout(() => {
        this.handleReset();
      }, this.props.resetTimeout);
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  /**
   * 获取用户ID
   */
  private getUserId(): string | undefined {
    try {
      // 从localStorage或其他地方获取用户ID
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
   * 发送错误报告
   */
  private async sendErrorReport(error: Error, errorInfo: ErrorInfo, details: ErrorDetails) {
    if (!this.props.errorReportingUrl) return;
    
    try {
      const reportData = {
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        errorInfo,
        details,
        context: {
          component: 'ErrorBoundary',
          platform: 'web',
          environment: process.env.NODE_ENV || 'development'
        }
      };
      
      await fetch(this.props.errorReportingUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reportData)
      });
      
      console.log('📨 错误报告已发送');
    } catch (reportError) {
      console.error('❌ 发送错误报告失败:', reportError);
    }
  }

  /**
   * 重置错误状态
   */
  private handleReset = () => {
    console.log('🔄 重置错误边界状态');
    
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      isRetrying: false
    });
    
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = undefined;
    }
  };

  /**
   * 重试操作
   */
  private handleRetry = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount >= maxRetries) {
      console.warn(`⚠️ 重试次数已达上限 (${maxRetries})`);
      return;
    }
    
    console.log(`🔄 重试 ${this.state.retryCount + 1}/${maxRetries}`);
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      retryCount: prevState.retryCount + 1,
      isRetrying: true
    }));
    
    // 延迟一下再重置isRetrying状态
    setTimeout(() => {
      this.setState({ isRetrying: false });
    }, 1000);
  };

  /**
   * 刷新页面
   */
  private handleRefresh = () => {
    window.location.reload();
  };

  /**
   * 返回首页
   */
  private handleGoHome = () => {
    window.location.href = '/';
  };

  /**
   * 复制错误信息
   */
  private handleCopyError = () => {
    const { error, errorDetails } = this.state;
    
    if (!error || !errorDetails) return;
    
    const errorText = `
错误时间: ${new Date(errorDetails.timestamp).toLocaleString()}
错误信息: ${error.message}
页面地址: ${errorDetails.url}
用户代理: ${errorDetails.userAgent}
构建版本: ${errorDetails.buildVersion}

错误堆栈:
${error.stack || '无堆栈信息'}

组件堆栈:
${errorDetails.componentStack || '无组件堆栈'}
    `.trim();
    
    navigator.clipboard.writeText(errorText).then(() => {
      console.log('📋 错误信息已复制到剪贴板');
    }).catch(err => {
      console.error('❌ 复制失败:', err);
    });
  };

  /**
   * 渲染错误详情
   */
  private renderErrorDetails() {
    const { error, errorDetails } = this.state;
    
    if (!error || !errorDetails) return null;
    
    return (
      <Collapse ghost>
        <Panel 
          header={
            <Space>
              <Bug size={16} />
              <span>错误详情</span>
            </Space>
          } 
          key="1"
        >
          <div style={{ marginBottom: '16px' }}>
            <Space wrap>
              <Tag icon={<Clock size={12} />}>
                {new Date(errorDetails.timestamp).toLocaleString()}
              </Tag>
              <Tag icon={<Monitor size={12} />}>
                {errorDetails.buildVersion}
              </Tag>
              {errorDetails.userId && (
                <Tag>用户: {errorDetails.userId}</Tag>
              )}
            </Space>
          </div>
          
          <Alert
            message="错误信息"
            description={error.message}
            type="error"
            style={{ marginBottom: '16px' }}
          />
          
          {error.stack && (
            <Card size="small" title="错误堆栈" style={{ marginBottom: '16px' }}>
              <pre style={{ 
                fontSize: '12px', 
                whiteSpace: 'pre-wrap', 
                wordBreak: 'break-all',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {error.stack}
              </pre>
            </Card>
          )}
          
          {errorDetails.componentStack && (
            <Card size="small" title="组件堆栈">
              <pre style={{ 
                fontSize: '12px', 
                whiteSpace: 'pre-wrap',
                maxHeight: '200px',
                overflow: 'auto'
              }}>
                {errorDetails.componentStack}
              </pre>
            </Card>
          )}
        </Panel>
      </Collapse>
    );
  }

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义fallback UI，使用它
      if (this.props.fallback) {
        return this.props.fallback;
      }
      
      const { enableRecovery = true, maxRetries = 3, showDetails = true } = this.props;
      const { retryCount, isRetrying } = this.state;
      const canRetry = enableRecovery && retryCount < maxRetries;
      
      return (
        <div 
          className={`error-boundary ${this.props.className || ''}`}
          style={{ 
            padding: '24px',
            minHeight: '400px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ maxWidth: '600px', width: '100%' }}>
            <Result
              status="error"
              icon={<AlertTriangle size={64} color="#ff4d4f" />}
              title="页面出现错误"
              subTitle="很抱歉，页面遇到了意外错误。我们正在努力修复这个问题。"
              extra={
                <Space direction="vertical" size="large" style={{ width: '100%' }}>
                  {/* 操作按钮 */}
                  <Space wrap>
                    {canRetry && (
                      <Button
                        type="primary"
                        icon={<RefreshCw size={16} />}
                        loading={isRetrying}
                        onClick={this.handleRetry}
                      >
                        重试 ({maxRetries - retryCount})
                      </Button>
                    )}
                    <Button
                      icon={<RefreshCw size={16} />}
                      onClick={this.handleRefresh}
                    >
                      刷新页面
                    </Button>
                    <Button
                      icon={<Home size={16} />}
                      onClick={this.handleGoHome}
                    >
                      返回首页
                    </Button>
                    <Button
                      icon={<Code size={16} />}
                      onClick={this.handleCopyError}
                    >
                      复制错误信息
                    </Button>
                  </Space>
                  
                  {/* 帮助信息 */}
                  <Alert
                    message="需要帮助？"
                    description={
                      <div>
                        <Paragraph>
                          如果问题持续存在，请尝试以下方法：
                        </Paragraph>
                        <ul>
                          <li>清除浏览器缓存并刷新页面</li>
                          <li>尝试使用其他浏览器访问</li>
                          <li>检查网络连接是否正常</li>
                          <li>联系技术支持团队</li>
                        </ul>
                        <div style={{ marginTop: '8px' }}>
                          <Button
                            type="link"
                            icon={<Mail size={16} />}
                            href="mailto:support@deepcad.com"
                            size="small"
                          >
                            联系技术支持
                          </Button>
                        </div>
                      </div>
                    }
                    type="info"
                    showIcon
                  />
                  
                  {/* 错误详情 */}
                  {showDetails && this.renderErrorDetails()}
                </Space>
              }
            />
          </div>
        </div>
      );
    }
    
    return this.props.children;
  }
}

export default ErrorBoundary;