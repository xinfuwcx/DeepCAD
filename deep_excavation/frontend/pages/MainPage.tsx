import React, { useState, useRef, useEffect } from 'react';
import { Box, Theme, useTheme, useMediaQuery } from '@mui/material';

import { useStore, ViewportHandles } from '../core/store';
import Viewport from '../components/viewport/Viewport';
import LeftSidebar from '../components/layout/LeftSidebar';
import RightSidebar from '../components/layout/RightSidebar';
import PrimaryAppBar from '../components/layout/PrimaryAppBar';
import BottomStatusBar from '../components/layout/BottomStatusBar';
import MeshSettingsModal from '../components/modals/MeshSettingsModal';
import MaterialManagerModal from '../components/modals/MaterialManagerModal';

const MainPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // 在移动设备上默认关闭侧边栏
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(!isMobile);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(!isMobile);
    
    const viewportRef = useRef<ViewportHandles>(null);
    
    const activeModal = useStore(state => state.activeModal);
    const closeModal = useStore(state => state.closeModal);
    const updateMeshSettings = useStore(state => state.updateMeshSettings);
    const meshSettings = useStore(state => state.meshSettings);
    
    // 响应窗口大小变化
    useEffect(() => {
        if (isMobile) {
            setLeftDrawerOpen(false);
            setRightDrawerOpen(false);
        }
    }, [isMobile]);
    
    // 计算侧边栏宽度
    const leftSidebarWidth = leftDrawerOpen ? LeftSidebar.WIDTH : 0;
    const rightSidebarWidth = rightDrawerOpen ? '320px' : 0;
    
    // AppBar高度
    const APP_BAR_HEIGHT = '72px';
    const BOTTOM_BAR_HEIGHT = '48px';
    
    const handleApplyMeshSettings = (settings: any) => {
        updateMeshSettings(settings);
        closeModal();
    };
    
    return (
        <Box 
            className="main-layout"
            sx={{
                display: 'flex', 
                flexDirection: 'column',
                height: '100vh', 
                width: '100vw',
                overflow: 'hidden',
                background: 'linear-gradient(135deg, #121828 0%, #1a2035 100%)',
                position: 'relative',
            }}
        >
            {/* 顶部应用栏 */}
            <PrimaryAppBar 
                onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)} 
                onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)} 
            />
            
            {/* 内容区域 */}
            <Box 
                className="content-area"
                sx={{
                    display: 'flex',
                    flex: 1,
                    mt: APP_BAR_HEIGHT,
                    height: `calc(100vh - ${APP_BAR_HEIGHT})`,
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* 左侧边栏 */}
                <LeftSidebar open={leftDrawerOpen} />
                
                {/* 主内容区 */}
                <Box
                    className="main-content"
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: theme => theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        ml: leftSidebarWidth,
                        mr: rightSidebarWidth,
                        overflow: 'hidden',
                    }}
                >
                    {/* 视口包装器 - 确保视口填满可用空间 */}
                    <Box 
                        className="viewport-wrapper"
                        sx={{ 
                            flex: 1,
                            position: 'relative',
                            height: `calc(100% - ${BOTTOM_BAR_HEIGHT})`,
                            width: '100%',
                            overflow: 'hidden',
                        }}
                    >
                        <Viewport ref={viewportRef} />
                    </Box>
                    
                    {/* 底部状态栏 */}
                    <BottomStatusBar />
                </Box>
                
                {/* 右侧边栏 */}
                <RightSidebar open={rightDrawerOpen} viewportRef={viewportRef} />
            </Box>
            
            {/* 模态框 */}
            <MeshSettingsModal 
                open={activeModal === 'MeshSettings'}
                onClose={closeModal}
                initialSettings={meshSettings}
                onApply={handleApplyMeshSettings}
            />
            
            <MaterialManagerModal 
                open={activeModal === 'MaterialManager'} 
                onClose={closeModal} 
            />
        </Box>
    );
};

export default MainPage; 