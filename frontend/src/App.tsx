import React from 'react';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import GeometryView from './views/GeometryView';
import AnalysisView from './views/AnalysisView';
import MeshingView from './views/MeshingView';
import SettingsView from './views/SettingsView';
import { useUIStore } from './stores/useUIStore';

function App() {
    const { theme: appTheme } = useUIStore();
    const isDarkMode = appTheme === 'dark';

    return (
        <ConfigProvider
            theme={{
                algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
                token: {
                    colorPrimary: '#00b96b',
                },
            }}
        >
            <AntApp>
                <AppShell>
                    <Routes>
                        <Route path="/" element={<GeometryView />} />
                        <Route path="/geometry" element={<GeometryView />} />
                        <Route path="/meshing" element={<MeshingView />} />
                        <Route path="/analysis" element={<AnalysisView />} />
                        <Route path="/settings" element={<SettingsView />} />
                    </Routes>
                </AppShell>
            </AntApp>
        </ConfigProvider>
    );
}

export default App; 