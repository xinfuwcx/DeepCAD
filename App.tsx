import React, { useEffect, useState } from 'react';
import MainLayout from './components/layout/MainLayout';
import ModelViewer from './components/modeling/ModelViewer';
import LoadingScreen from './components/common/LoadingScreen';
import { ModelProvider } from './context/ModelContext';

const App: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [apiReady, setApiReady] = useState(false);

  useEffect(() => {
    // 模拟加载chili3d和相关资源
    const timer = setTimeout(() => {
      setIsLoading(false);
      setApiReady(true); // 假设API服务已连接
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ModelProvider>
      {isLoading ? (
        <LoadingScreen />
      ) : (
        <MainLayout>
          <ModelViewer />
          {/* API状态指示器 */}
          {!apiReady && (
            <div style={{
              position: 'absolute',
              bottom: '10px',
              left: '10px',
              backgroundColor: 'rgba(255, 0, 0, 0.7)',
              color: 'white',
              padding: '5px 10px',
              borderRadius: '3px',
              fontSize: '0.8rem'
            }}>
              API服务未连接
            </div>
          )}
        </MainLayout>
      )}
    </ModelProvider>
  );
};

export default App; 