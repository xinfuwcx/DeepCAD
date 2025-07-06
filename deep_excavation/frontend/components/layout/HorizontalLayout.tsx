import React from 'react';
import { Box, Theme, useTheme } from '@mui/material';
import LeftSidebar from './LeftSidebar';
import RightSidebar from './RightSidebar';
import Viewport from '../viewport/Viewport';
import BottomStatusBar from './BottomStatusBar';
import { ViewportHandles } from '../../core/store';

interface HorizontalLayoutProps {
    leftDrawerOpen: boolean;
    rightDrawerOpen: boolean;
    viewportRef: React.RefObject<ViewportHandles>;
}

const APP_BAR_HEIGHT = '72px';
const BOTTOM_BAR_HEIGHT = '48px';

const HorizontalLayout: React.FC<HorizontalLayoutProps> = ({ leftDrawerOpen, rightDrawerOpen, viewportRef }) => {
    const theme = useTheme();
    const leftSidebarWidth = leftDrawerOpen ? LeftSidebar.WIDTH : 0;
    const rightSidebarWidth = rightDrawerOpen ? RightSidebar.WIDTH : 0;

    return (
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
            
            <RightSidebar open={rightDrawerOpen} viewportRef={viewportRef} />
        </Box>
    );
};

export default HorizontalLayout; 