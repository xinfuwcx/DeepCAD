/**
 * 主布局组件
 * 
 * 参考FreeCAD的布局，整合工作台选择器和内容区域
 */

import React from 'react';
import { Box, AppBar, Toolbar, Typography, IconButton, useMediaQuery, useTheme } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SaveIcon from '@mui/icons-material/Save';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';

import WorkbenchSelector from '../workbench/WorkbenchSelector';
import WorkbenchContent from '../workbench/WorkbenchContent';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      {/* 顶部应用栏 */}
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" sx={{ mr: 2 }}>
            <MenuIcon />
          </IconButton>
          
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            深基坑CAE系统
          </Typography>
          
          <IconButton color="inherit" aria-label="save">
            <SaveIcon />
          </IconButton>
          
          <IconButton color="inherit" aria-label="open">
            <OpenInBrowserIcon />
          </IconButton>
          
          <IconButton color="inherit" aria-label="settings">
            <SettingsIcon />
          </IconButton>
          
          <IconButton color="inherit" aria-label="help">
            <HelpIcon />
          </IconButton>
        </Toolbar>
        
        {/* 水平工作台选择器 */}
        {!isMobile && <WorkbenchSelector orientation="horizontal" />}
      </AppBar>
      
      {/* 主内容区域 */}
      <Box sx={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* 垂直工作台选择器（仅在移动设备上显示） */}
        {isMobile && (
          <Box sx={{ width: '72px', height: '100%' }}>
            <WorkbenchSelector orientation="vertical" />
          </Box>
        )}
        
        {/* 工作台内容 */}
        <WorkbenchContent />
      </Box>
    </Box>
  );
};

export default MainLayout; 