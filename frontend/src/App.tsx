import React from 'react';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import AppShell from './components/layout/AppShell';
import { useUIStore } from './stores/useUIStore';

const App: React.FC = () => {
  const currentTheme = useUIStore((state) => state.theme);

  return (
    <ConfigProvider
      theme={{
        algorithm: currentTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
      }}
    >
      <AntApp style={{ height: '100vh' }}>
        <AppShell />
      </AntApp>
    </ConfigProvider>
  );
};

export default App; 