import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button,
  Tooltip,
  Badge,
  Box
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ModelIcon from '@mui/icons-material/Architecture';
import AnalysisIcon from '@mui/icons-material/Science';
import ResultsIcon from '@mui/icons-material/Assessment';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpIcon from '@mui/icons-material/Help';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';

import { useStore } from '../../core/store';

interface PrimaryAppBarProps {
    onToggleLeftDrawer: () => void;
    onToggleRightDrawer: () => void;
}

const PrimaryAppBar: React.FC<PrimaryAppBarProps> = ({ onToggleLeftDrawer, onToggleRightDrawer }) => {
    const activeWorkbench = useStore(state => state.activeWorkbench);
    const setActiveWorkbench = useStore(state => state.setActiveWorkbench);

    return (
        <AppBar 
            position="fixed" 
            sx={{ 
                zIndex: (theme) => theme.zIndex.drawer + 2, // Ensure it's above drawers
                bgcolor: 'rgba(38, 50, 56, 0.6)',
                backdropFilter: 'blur(10px)',
                boxShadow: 'none',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}
        >
             <Toolbar>
                <Tooltip title="切换项目浏览器">
                    <IconButton
                        color="inherit"
                        aria-label="toggle left drawer"
                        onClick={onToggleLeftDrawer}
                        edge="start"
                    >
                        <MenuIcon />
                    </IconButton>
                </Tooltip>
                <img src="/logo.svg" alt="Logo" style={{ height: '40px', margin: '0 16px' }} />
                <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 0, mr: 4 }}>
                    深基坑V5
                </Typography>
                
                {/* --- Workbench Selector --- */}
                <Box sx={{ flexGrow: 0, display: 'flex', mr: 4 }}>
                    <Button startIcon={<ModelIcon />} onClick={() => setActiveWorkbench('Modeling')} variant={activeWorkbench === 'Modeling' ? 'contained' : 'text'} color="primary" sx={{ mr: 1 }}>建模</Button>
                    <Button startIcon={<AnalysisIcon />} onClick={() => setActiveWorkbench('Analysis')} variant={activeWorkbench === 'Analysis' ? 'contained' : 'text'} color="secondary" sx={{ mr: 1 }}>分析</Button>
                    <Button startIcon={<ResultsIcon />} onClick={() => setActiveWorkbench('Results')} variant={activeWorkbench === 'Results' ? 'contained' : 'text'} color="inherit">结果</Button>
                </Box>

                {/* --- Common Actions --- */}
                <Box sx={{ flexGrow: 0, display: 'flex', mr: 2 }}>
                    <Tooltip title="保存项目"><IconButton color="inherit"><SaveIcon /></IconButton></Tooltip>
                    <Tooltip title="撤销"><IconButton color="inherit"><UndoIcon /></IconButton></Tooltip>
                    <Tooltip title="重做"><IconButton color="inherit"><RedoIcon /></IconButton></Tooltip>
                </Box>
                
                <Box sx={{ flexGrow: 1 }} />
                
                {/* --- Right-side Icons --- */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="帮助"><IconButton color="inherit"><HelpIcon /></IconButton></Tooltip>
                    <Tooltip title="设置"><IconButton color="inherit"><SettingsIcon /></IconButton></Tooltip>
                    <Tooltip title="通知">
                        <IconButton color="inherit">
                            <Badge badgeContent={4} color="error"><NotificationsIcon /></Badge>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="用户"><IconButton color="inherit"><AccountCircleIcon /></IconButton></Tooltip>
                    <Tooltip title="切换属性面板">
                        <IconButton
                            color="inherit"
                            aria-label="toggle right drawer"
                            onClick={onToggleRightDrawer}
                            edge="end"
                        >
                           <ChevronLeftIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Toolbar>
        </AppBar>
    );
}

export default PrimaryAppBar; 