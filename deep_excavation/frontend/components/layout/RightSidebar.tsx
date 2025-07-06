import React, { RefObject } from 'react';
import { Drawer, Box } from '@mui/material';
import { useStore, ViewportHandles } from '../../core/store';
import TaskPanel from './TaskPanel';
import MeshPanel from './MeshPanel';
import AnalysisPanel from './AnalysisPanel';
import VtkResultsViewer from '../VtkResultsViewer';

const DRAWER_WIDTH = 320;

interface RightSidebarProps {
    open: boolean;
    viewportRef: RefObject<ViewportHandles>;
}

const RightSidebar: React.FC<RightSidebarProps> & { WIDTH: number } = ({ open, viewportRef }) => {
    const activeWorkbench = useStore(state => state.activeWorkbench);

    const renderPanel = () => {
        switch (activeWorkbench) {
            case 'Modeling':
                return <TaskPanel />;
            case 'Mesh':
                return <MeshPanel />;
            case 'Analysis':
                return <AnalysisPanel />;
            case 'Results':
                return <VtkResultsViewer resultsUrl={undefined} />;
            default:
                return null;
        }
    };
    
    return (
        <Drawer
            variant="persistent"
            anchor="right"
            open={open}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    bgcolor: 'rgba(38, 50, 56, 0.6)',
                    backdropFilter: 'blur(10px)',
                    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                    mt: '64px',
                    height: 'calc(100% - 64px)',
                    boxShadow: 'none',
                    overflowX: 'hidden',
                    color: 'white',
                },
            }}
        >
            <Box sx={{ overflowY: 'auto', height: '100%' }}>
                {renderPanel()}
            </Box>
        </Drawer>
    );
};

RightSidebar.WIDTH = DRAWER_WIDTH;

export default RightSidebar; 