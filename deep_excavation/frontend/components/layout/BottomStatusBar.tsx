import React from 'react';
import { Box } from '@mui/material';

const BottomStatusBar: React.FC = () => {
    return (
        <Box sx={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            p: 1,
            bgcolor: 'rgba(38, 50, 56, 0.6)',
            backdropFilter: 'blur(10px)',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '0.8rem',
            color: 'text.secondary',
            zIndex: 1 // Ensure it's above the viewport canvas
        }}>
           <span>坐标: (占位符)</span>
           <span>网格单元: (占位符)</span>
           <span>状态: 就绪</span>
        </Box>
    );
};

export default BottomStatusBar; 