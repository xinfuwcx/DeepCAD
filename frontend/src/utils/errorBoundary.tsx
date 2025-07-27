import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Result, Button } from 'antd';
import { ReloadOutlined, BugOutlined } from '@ant-design/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class GlobalErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('DeepCAD Error Boundary caught an error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{ 
          height: '100vh', 
          background: '#0a0a0a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <Result
            status="error"
            title="系统出现错误"
            subTitle="DeepCAD遇到了一个意外错误，请尝试重新加载页面或联系技术支持。"
            extra={[
              <Button 
                key="reload" 
                type="primary" 
                icon={<ReloadOutlined />} 
                onClick={this.handleReload}
              >
                重新加载
              </Button>,
              <Button 
                key="reset" 
                icon={<BugOutlined />} 
                onClick={this.handleReset}
              >
                重试组件
              </Button>
            ]}
            style={{
              background: '#16213e',
              padding: '40px',
              borderRadius: '12px',
              border: '1px solid #00d9ff30'
            }}
          />
          {process.env.NODE_ENV === 'development' && (
            <details style={{ 
              marginTop: '20px', 
              color: '#ff6b6b',
              background: '#1a1a2e',
              padding: '16px',
              borderRadius: '8px',
              maxWidth: '800px'
            }}>
              <summary>错误详情 (开发模式)</summary>
              <pre style={{ 
                whiteSpace: 'pre-wrap',
                fontSize: '12px',
                marginTop: '10px'
              }}>
                {this.state.error && this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;