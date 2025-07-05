import React, { useState, useRef } from 'react';
import { Box, Theme } from '@mui/material';

import { useStore, ViewportHandles } from '../core/store';
import Viewport from '../components/viewport/Viewport';
import LeftSidebar from '../components/layout/LeftSidebar';
import RightSidebar from '../components/layout/RightSidebar';
import PrimaryAppBar from '../components/layout/PrimaryAppBar';
import BottomStatusBar from '../components/layout/BottomStatusBar';
import MeshSettingsModal from '../components/modals/MeshSettingsModal';

const MainPage: React.FC = () => {
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(true);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(true);
    const viewportRef = useRef<ViewportHandles>(null);
    
    const activeModal = useStore(state => state.activeModal);
    const closeModal = useStore(state => state.closeModal);
    
    return (
        <Box sx={{ display: 'flex', height: '100vh', bgcolor: 'background.dark' }}>
            <PrimaryAppBar 
                onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)} 
                onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)} 
            />
            
            <LeftSidebar open={leftDrawerOpen} />
            
            <Box
                component="main"
                sx={{
                    flexGrow: 1,
                    p: 0,
                    mt: '64px', // AppBar height
                    height: 'calc(100vh - 64px)',
                    position: 'relative',
                    transition: (theme: Theme) => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ml: leftDrawerOpen ? '280px' : 0, // LeftSidebar.WIDTH
                    mr: rightDrawerOpen ? '320px' : 0, // RightSidebar.WIDTH
                }}
            >
                <Viewport ref={viewportRef} />
                <BottomStatusBar />
            </Box>
            
            <RightSidebar open={rightDrawerOpen} viewportRef={viewportRef} />
            
            <MeshSettingsModal 
                isVisible={activeModal === 'MeshSettings'} 
                onClose={closeModal} 
            />
        </Box>
    );
};

export default MainPage; 