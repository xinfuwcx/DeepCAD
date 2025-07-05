import React from 'react';
import { Drawer, Box, Typography } from '@mui/material';
import HistoryTree from './HistoryTree';

const DRAWER_WIDTH = 320;

interface LeftSidebarProps {
    open: boolean;
}

const LeftSidebar: React.FC<LeftSidebarProps> & { WIDTH: number } = ({ open }) => {
    return (
        <Drawer
            variant="persistent"
            anchor="left"
            open={open}
            sx={{
                width: DRAWER_WIDTH,
                flexShrink: 0,
                '& .MuiDrawer-paper': {
                    width: DRAWER_WIDTH,
                    boxSizing: 'border-box',
                    bgcolor: 'rgba(38, 50, 56, 0.6)',
                    backdropFilter: 'blur(10px)',
                    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                    mt: '64px', // AppBar height
                    height: 'calc(100% - 64px)',
                    boxShadow: 'none',
                    color: 'white',
                },
            }}
        >
            <Box sx={{ p: 2, mt: 2 }}>
                <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    项目结构
                </Typography>
                <HistoryTree />
            </Box>
        </Drawer>
    );
};

LeftSidebar.WIDTH = DRAWER_WIDTH;

export default LeftSidebar; 