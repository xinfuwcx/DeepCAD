/**
 * @file Header.tsx
 * @description 深基坑CAE系统的顶部栏组件
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box,
  Tooltip,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

/**
 * @component Header
 * @description 顶部栏组件，包含应用程序标题和基本工具栏
 */
const Header: React.FC = () => {
  return (
    <AppBar 
      position="static" 
      color="default"
      sx={{ 
        bgcolor: 'background.paper',
        boxShadow: 1,
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar variant="dense" sx={{ minHeight: 48 }}>
        {/* Logo和标题 */}
        <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
          <img 
            src="/src/assets/logo.svg" 
            alt="CAE Logo"
            style={{ width: 32, height: 32, marginRight: 8 }}
            onError={(e) => {
              // 如果logo加载失败，显示文字替代
              e.currentTarget.style.display = 'none';
            }}
          />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              fontWeight: 600,
              color: 'primary.main',
              letterSpacing: '0.02em'
            }}
          >
            Deep Excavation CAE
          </Typography>
        </Box>

        {/* 快速工具栏 */}
        <Tooltip title="New Project">
          <IconButton size="small">
            <CreateNewFolderIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Open Project">
          <IconButton size="small">
            <OpenInBrowserIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Save Project">
          <IconButton size="small">
            <SaveIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
        
        <Tooltip title="Undo">
          <IconButton size="small">
            <UndoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        
        <Tooltip title="Redo">
          <IconButton size="small">
            <RedoIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Toolbar>
    </AppBar>
  );
};

export default Header; 