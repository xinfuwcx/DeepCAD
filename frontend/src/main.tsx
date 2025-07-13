import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { Button, Result } from 'antd';
import App from './App.tsx'
import './styles/globals.css'
import './index.css'
import './i18n';

const ErrorFallback: React.FC<{ error: Error, resetErrorBoundary: () => void }> = ({ error, resetErrorBoundary }) => {
  return (
    <Result
      status="error"
      title="Something went wrong"
      subTitle={error.message}
      extra={
        <Button type="primary" onClick={resetErrorBoundary}>
          Try again
        </Button>
      }
      className="flex flex-col justify-center items-center h-screen"
    />
  );
};


ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => window.location.reload()}
    >
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
) 