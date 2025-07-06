import React from 'react';
import { Box, Paper, Typography } from '@mui/material';
import Viewport from '../viewport/Viewport';
import BottomStatusBar from './BottomStatusBar';
import HistoryTree from './HistoryTree';
import TaskPanel from './TaskPanel';
import { ScientificVisualizationPanel } from '../visualization/ScientificVisualizationPanel';
import { useStore, ViewportHandles } from '../../core/store';

interface VerticalLayoutProps {
    viewportRef: React.RefObject<ViewportHandles>;
}

const APP_BAR_HEIGHT = '72px';
const BOTTOM_BAR_HEIGHT = '48px';
const TOP_PANEL_HEIGHT = '30vh'; // Adjusted height
const BOTTOM_PANEL_HEIGHT = '40vh'; // Adjusted height

const VerticalLayout: React.FC<VerticalLayoutProps> = ({ viewportRef }) => {
    const activeWorkbench = useStore(state => state.activeWorkbench);

    const renderTopPanel = () => {
        switch (activeWorkbench) {
            case 'Modeling':
                return <HistoryTree />;
            case 'Results':
                return (
                    <Box sx={{ p: 2 }}>
                        <Typography variant="h6">结果分析</Typography>
                        <Typography variant="body2">在此处显示结果摘要、图表或关键指标。</Typography>
                    </Box>
                );
            default:
                return null;
        }
    };

    const renderBottomPanel = () => {
        switch (activeWorkbench) {
            case 'Modeling':
                return <TaskPanel />;
            case 'Results':
                return <ScientificVisualizationPanel />;
            default:
                return null;
        }
    };

    return (
        <Box 
            className="content-area-vertical"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                mt: APP_BAR_HEIGHT,
                height: `calc(100vh - ${APP_BAR_HEIGHT})`,
                width: '100vw',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Top Panel */}
            <Paper 
                elevation={4}
                sx={{ 
                    height: TOP_PANEL_HEIGHT, 
                    overflowY: 'auto', 
                    bgcolor: 'rgba(38, 50, 56, 0.6)', 
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    p: activeWorkbench === 'Modeling' ? 2 : 0, // Padding for HistoryTree
                }}
            >
                {renderTopPanel()}
            </Paper>

            {/* Middle Content (Viewport) */}
            <Box
                className="main-content"
                sx={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                    overflow: 'hidden',
                    height: `calc(100% - ${TOP_PANEL_HEIGHT} - ${BOTTOM_PANEL_HEIGHT} - ${BOTTOM_BAR_HEIGHT})`,
                }}
            >
                <Viewport ref={viewportRef} />
            </Box>

            {/* Bottom Panel */}
            <Paper
                elevation={4} 
                sx={{ 
                    height: BOTTOM_PANEL_HEIGHT, 
                    overflowY: 'auto',
                    bgcolor: 'rgba(38, 50, 56, 0.6)', 
                    backdropFilter: 'blur(10px)',
                    color: 'white'
                }}
            >
                {renderBottomPanel()}
            </Paper>
            
            <BottomStatusBar />
        </Box>
    );
};

export default VerticalLayout; 