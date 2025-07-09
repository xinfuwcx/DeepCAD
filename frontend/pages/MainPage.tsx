import React, { useState, useRef, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

import { useStore, ViewportHandles, AppState } from '../core/store';
import PrimaryAppBar from '../components/layout/PrimaryAppBar';
import MeshSettingsModal from '../components/modals/MeshSettingsModal';
import MaterialManagerModal from '../components/modals/MaterialManagerModal';
import LeftSidebar from '../components/layout/LeftSidebar';
import RightSidebar from '../components/layout/RightSidebar';
import Viewport from '../components/viewport/Viewport';
import BottomStatusBar from '../components/layout/BottomStatusBar';

const APP_BAR_HEIGHT = '72px';
const BOTTOM_BAR_HEIGHT = '48px';

const MainPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(!isMobile);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(!isMobile);
    
    const viewportRef = useRef<ViewportHandles>(null);

    const activeModal = useStore((state: AppState) => state.activeModal);
    const closeModal = useStore((state: AppState) => state.closeModal);
    const updateMeshSettings = useStore((state: AppState) => state.updateMeshSettings);
    const meshSettings = useStore((state: AppState) => state.meshSettings);

    useEffect(() => {
        setLeftDrawerOpen(!isMobile);
        setRightDrawerOpen(!isMobile);
    }, [isMobile]);
    
    const handleApplyMeshSettings = (settings: any) => {
        updateMeshSettings(settings);
        closeModal();
    };

    const leftSidebarWidth = leftDrawerOpen ? LeftSidebar.WIDTH : 0;
    const rightSidebarWidth = rightDrawerOpen ? RightSidebar.WIDTH : 0;
    
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
            }}
        >
            <PrimaryAppBar 
                onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)} 
                onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)} 
            />
            
            <Box
                className="content-area"
                sx={{
                    display: 'flex',
                    flex: 1,
                    mt: APP_BAR_HEIGHT,
                    height: `calc(100vh - ${APP_BAR_HEIGHT})`,
                    position: 'relative',
                }}
            >
                <LeftSidebar open={leftDrawerOpen} />
                
                <Box
                    className="main-content"
                    sx={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: theme.transitions.create(['margin', 'width'], {
                            easing: theme.transitions.easing.easeOut,
                            duration: theme.transitions.duration.enteringScreen,
                        }),
                        marginLeft: `${leftSidebarWidth}px`,
                        marginRight: `${rightSidebarWidth}px`,
                        overflow: 'hidden',
                    }}
                >
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
                    
                    <BottomStatusBar />
                </Box>

                <RightSidebar open={rightDrawerOpen} />
            </Box>
            
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