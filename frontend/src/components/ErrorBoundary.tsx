import React from 'react';
import { Alert, Card } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<
  React.PropsWithChildren<{}>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('3D组件错误:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card
          style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-secondary)'
          }}
        >
          <Alert
            message="3D视口暂时不可用"
            description="正在修复组件错误，请稍后再试"
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
            style={{ maxWidth: 400 }}
          />
        </Card>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;