import React, { useEffect } from 'react';
import { ConfigProvider, App as AntApp } from 'antd';
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/layout/AppShell';
import DashboardView from './views/DashboardView';
import GeometryView from './views/GeometryView';
import AnalysisView from './views/AnalysisView';
import MeshingView from './views/MeshingView';
import SettingsView from './views/SettingsView';
import ResultsListView from './views/ResultsListView';
import ResultsView from './views/ResultsView';
import UserSettingsView from './views/UserSettingsView';
import HelpView from './views/HelpView';
import { useUIStore } from './stores/useUIStore';
import { ThemeProvider } from './theme/ThemeProvider';

// 导入全局样式
import './theme/globalStyles.css';
import './styles/viewport.css';
import './styles/dashboard.css';
import './styles/analysis.css';
import './styles/results.css';
import './styles/meshing.css';
import './styles/animations.css';
import './styles/themes.css';
import './styles/geometry.css';
import './styles/settings.css';
import './styles/forms.css';
import './styles/loading.css';

function App() {
    const { theme: appTheme } = useUIStore();
    
    // 根据主题设置 body 类
    useEffect(() => {
        if (appTheme === 'dark') {
            document.body.classList.add('dark-mode');
            document.body.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.body.classList.remove('dark-mode');
        }
    }, [appTheme]);

    return (
        <ThemeProvider>
            <AntApp>
                <AppShell>
                    <Routes>
                        <Route path="/" element={<DashboardView />} />
                        <Route path="/dashboard" element={<DashboardView />} />
                        <Route path="/geometry" element={<GeometryView />} />
                        <Route path="/meshing" element={<MeshingView />} />
                        <Route path="/analysis" element={<AnalysisView />} />
                        <Route path="/results" element={<ResultsListView />} />
                        <Route path="/results/:resultId" element={<ResultsView />} />
                        <Route path="/settings" element={<SettingsView />} />
                        <Route path="/user-settings" element={<UserSettingsView />} />
                        <Route path="/help" element={<HelpView />} />
                    </Routes>
                </AppShell>
            </AntApp>
        </ThemeProvider>
    );
}

export default App; 