import React, { useState, useRef, useEffect } from 'react';
import { Box, useTheme, useMediaQuery } from '@mui/material';

import { useStore, ViewportHandles } from '../core/store';
import PrimaryAppBar from '../components/layout/PrimaryAppBar';
import MeshSettingsModal from '../components/modals/MeshSettingsModal';
import MaterialManagerModal from '../components/modals/MaterialManagerModal';
import HorizontalLayout from '../components/layout/HorizontalLayout';
import VerticalLayout from '../components/layout/VerticalLayout';

const MainPage: React.FC = () => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    const [leftDrawerOpen, setLeftDrawerOpen] = useState(!isMobile);
    const [rightDrawerOpen, setRightDrawerOpen] = useState(!isMobile);
    
    const viewportRef = useRef<ViewportHandles>(null);
    
    const { activeModal, closeModal, updateMeshSettings, meshSettings, activeWorkbench } = useStore(state => ({
        activeModal: state.activeModal,
        closeModal: state.closeModal,
        updateMeshSettings: state.updateMeshSettings,
        meshSettings: state.meshSettings,
        activeWorkbench: state.activeWorkbench,
    }));
    
    const isVerticalLayout = activeWorkbench === 'Modeling' || activeWorkbench === 'Results';

    useEffect(() => {
        if (isMobile || isVerticalLayout) {
            setLeftDrawerOpen(false);
            setRightDrawerOpen(false);
        } else {
            setLeftDrawerOpen(!isMobile);
            setRightDrawerOpen(!isMobile);
        }
    }, [isMobile, isVerticalLayout]);
    
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
            <PrimaryAppBar 
                onToggleLeftDrawer={() => setLeftDrawerOpen(!leftDrawerOpen)} 
                onToggleRightDrawer={() => setRightDrawerOpen(!rightDrawerOpen)} 
                showDrawerToggles={!isVerticalLayout}
            />
            
            {isVerticalLayout ? (
                <VerticalLayout viewportRef={viewportRef} />
            ) : (
                <HorizontalLayout 
                    leftDrawerOpen={leftDrawerOpen}
                    rightDrawerOpen={rightDrawerOpen}
                    viewportRef={viewportRef}
                />
            )}
            
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