import React, { useState, useRef } from 'react';
import { Box } from '@mui/material';

import { useStore } from '../core/store';
import Viewport, { ViewportHandles } from '../components/viewport/Viewport';
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
                    transition: theme => theme.transitions.create('margin', {
                        easing: theme.transitions.easing.sharp,
                        duration: theme.transitions.duration.leavingScreen,
                    }),
                    ml: leftDrawerOpen ? `${LeftSidebar.WIDTH}px` : 0,
                    mr: rightDrawerOpen ? `${RightSidebar.WIDTH}px` : 0,
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