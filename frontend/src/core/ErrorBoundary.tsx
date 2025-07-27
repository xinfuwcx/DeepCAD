/**
 * 统一错误处理机制
 * 1号架构师 - 响应2号几何模块集成需求
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button, Card, Typography, Space, Collapse } from 'antd';
import { 
  ExclamationCircleOutlined, 
  ReloadOutlined, 
  BugOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { ComponentDevHelper } from '../utils/developmentTools';

const { Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level: 'system' | 'module' | 'component';
  moduleName?: string;
  showReload?: boolean;
}

export class UnifiedErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
      errorId: `err_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // 统一错误日志记录
    const errorContext = {
      level: this.props.level,
      moduleName: this.props.moduleName || 'unknown',
      errorId: this.state.errorId,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString()
    };

    ComponentDevHelper.logError(error, `${this.props.level}错误`, '1号架构师');
    
    // 发送到错误监控服务
    this.reportToErrorService(errorContext);

    // 调用自定义错误处理
    this.props.onError?.(error, errorInfo);
  }

  private reportToErrorService(errorContext: any) {
    // 这里可以集成错误监控服务 (如 Sentry)
    console.error('🚨 DeepCAD系统错误报告:', errorContext);
    
    // 开发环境下详细日志
    if (process.env.NODE_ENV === 'development') {
      console.group('🔍 详细错误信息');
      console.error('错误对象:', this.state.error);
      console.error('错误堆栈:', this.state.errorInfo);
      console.groupEnd();
    }
  }

  private handleReload = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: ''
    });
  };

  private handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      // 自定义fallback优先
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 根据错误级别显示不同的UI
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { level, moduleName } = this.props;
    const { error, errorId } = this.state;

    const errorTitle = {
      system: '系统级错误',
      module: `${moduleName || '模块'}错误`,
      component: '组件错误'
    }[level];

    const errorDescription = {
      system: '核心系统出现异常，建议刷新页面重试',
      module: `${moduleName || '模块'}发生错误，可以尝试重新加载该模块`,
      component: '组件渲染异常，可以尝试重新加载'
    }[level];

    if (level === 'system') {
      return (
        <div style={{ 
          minHeight: '100vh', 
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}>
          <Card 
            style={{ 
              maxWidth: '600px',
              background: '#16213e',
              border: '1px solid #ff4d4f50'
            }}
          >
            <Result
              icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              title={<span style={{ color: '#ff4d4f' }}>{errorTitle}</span>}
              subTitle={<span style={{ color: '#ffffff80' }}>{errorDescription}</span>}
              extra={[
                <Button 
                  key="refresh" 
                  type="primary" 
                  danger
                  icon={<ReloadOutlined />}
                  onClick={this.handleRefresh}
                >
                  刷新页面
                </Button>
              ]}
            />
            {this.renderErrorDetails()}
          </Card>
        </div>
      );
    }

    return (
      <Card 
        style={{ 
          margin: '16px',
          background: '#16213e',
          border: '1px solid #faad1450'
        }}
      >
        <Result
          icon={<WarningOutlined style={{ color: '#faad14' }} />}
          title={<span style={{ color: '#faad14' }}>{errorTitle}</span>}
          subTitle={<span style={{ color: '#ffffff80' }}>{errorDescription}</span>}
          extra={[
            this.props.showReload !== false && (
              <Button 
                key="reload" 
                type="primary"
                icon={<ReloadOutlined />}
                onClick={this.handleReload}
              >
                重新加载
              </Button>
            )
          ]}
        />
        {this.renderErrorDetails()}
      </Card>
    );
  }

  private renderErrorDetails() {
    const { error, errorInfo, errorId } = this.state;

    if (process.env.NODE_ENV !== 'development') {
      return (
        <Space direction="vertical" style={{ width: '100%', marginTop: 16 }}>
          <Text style={{ color: '#ffffff60', fontSize: '12px' }}>
            错误ID: {errorId}
          </Text>
          <Text style={{ color: '#ffffff60', fontSize: '12px' }}>
            请将此错误ID提供给开发团队以便快速定位问题
          </Text>
        </Space>
      );
    }

    return (
      <Collapse ghost style={{ marginTop: 16 }}>
        <Panel 
          header={
            <span style={{ color: '#ffffff80' }}>
              <BugOutlined /> 开发调试信息
            </span>
          } 
          key="debug"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text strong style={{ color: '#ff7875' }}>错误信息:</Text>
              <Paragraph 
                code 
                style={{ 
                  background: '#1f1f1f', 
                  color: '#ff7875',
                  fontSize: '12px',
                  margin: '8px 0'
                }}
              >
                {error?.message}
              </Paragraph>
            </div>
            
            <div>
              <Text strong style={{ color: '#ffec3d' }}>错误堆栈:</Text>
              <Paragraph 
                code 
                style={{ 
                  background: '#1f1f1f', 
                  color: '#ffec3d',
                  fontSize: '11px',
                  maxHeight: '200px',
                  overflow: 'auto',
                  margin: '8px 0'
                }}
              >
                {error?.stack}
              </Paragraph>
            </div>

            {errorInfo && (
              <div>
                <Text strong style={{ color: '#40a9ff' }}>组件堆栈:</Text>
                <Paragraph 
                  code 
                  style={{ 
                    background: '#1f1f1f', 
                    color: '#40a9ff',
                    fontSize: '11px',
                    maxHeight: '150px',
                    overflow: 'auto',
                    margin: '8px 0'
                  }}
                >
                  {errorInfo.componentStack}
                </Paragraph>
              </div>
            )}

            <Text style={{ color: '#ffffff60', fontSize: '12px' }}>
              错误ID: {errorId} | 时间: {new Date().toLocaleString()}
            </Text>
          </Space>
        </Panel>
      </Collapse>
    );
  }
}

// 便捷的错误边界组件封装
export const SystemErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <UnifiedErrorBoundary level="system" showReload={false}>
    {children}
  </UnifiedErrorBoundary>
);

export const ModuleErrorBoundary: React.FC<{ 
  children: ReactNode; 
  moduleName: string;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}> = ({ children, moduleName, onError }) => (
  <UnifiedErrorBoundary 
    level="module" 
    moduleName={moduleName}
    onError={onError}
  >
    {children}
  </UnifiedErrorBoundary>
);

export const ComponentErrorBoundary: React.FC<{ 
  children: ReactNode;
  fallback?: ReactNode;
}> = ({ children, fallback }) => (
  <UnifiedErrorBoundary 
    level="component" 
    fallback={fallback}
    showReload={true}
  >
    {children}
  </UnifiedErrorBoundary>
);

export default UnifiedErrorBoundary;