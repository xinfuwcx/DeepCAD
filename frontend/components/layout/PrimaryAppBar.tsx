import React, { useState, useEffect } from 'react';
import Logo from '../../assets/logo.svg?react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Button,
  Tooltip,
  Badge,
  Box,
  Chip,
  Divider,
  alpha,
  Stack
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import ModelIcon from '@mui/icons-material/Architecture';
import AnalysisIcon from '@mui/icons-material/Science';
import ResultsIcon from '@mui/icons-material/Assessment';
import GridOnIcon from '@mui/icons-material/GridOn';
import SettingsIcon from '@mui/icons-material/Settings';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import HelpIcon from '@mui/icons-material/Help';
import NotificationsIcon from '@mui/icons-material/Notifications';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import MemoryIcon from '@mui/icons-material/Memory';
import SpeedIcon from '@mui/icons-material/Speed';

import { useStore } from '../../core/store';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';

interface PrimaryAppBarProps {
    onToggleLeftDrawer: () => void;
    onToggleRightDrawer: () => void;
    showDrawerToggles?: boolean;
}

const PrimaryAppBar: React.FC<PrimaryAppBarProps> = ({ onToggleLeftDrawer, onToggleRightDrawer, showDrawerToggles = true }) => {
    // --- 性能优化：将单个 useStore 拆分为多个，每个只选择自己需要的状态 ---
    const activeWorkbench = useStore(state => state.activeWorkbench);
    const setActiveWorkbench = useStore(state => state.setActiveWorkbench);
    const openModal = useStore(state => state.openModal);
    const undo = useStore(state => state.undo);
    const redo = useStore(state => state.redo);
    const canUndo = useStore(state => state.history.past.length > 0);
    const canRedo = useStore(state => state.history.future.length > 0);
    
    // 性能监控状态
    const [performanceMetrics, setPerformanceMetrics] = useState({
        fps: 0,
        memoryUsage: 0
    });
    
    // 系统状态
    const [systemStatus, setSystemStatus] = useState('online');
    
    // 监听性能指标
    useEffect(() => {
        const intervalId = setInterval(() => {
            if (globalPerformanceMonitor) {
                const metrics = globalPerformanceMonitor.getMetrics();
                setPerformanceMetrics({
                    fps: Math.round(metrics.fps),
                    memoryUsage: Math.round(metrics.memoryUsage.percentage)
                });
            }
        }, 1000);
        
        return () => clearInterval(intervalId);
    }, []);

    return (
        <AppBar 
            position="fixed" 
            elevation={0}
            sx={{ 
                zIndex: (theme) => theme.zIndex.drawer + 2,
                background: 'linear-gradient(90deg, rgba(26,32,53,0.8) 0%, rgba(28,40,59,0.8) 100%)',
                backdropFilter: 'blur(10px)',
                WebkitBackdropFilter: 'blur(10px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                height: '72px',
                display: 'flex',
                justifyContent: 'center'
            }}
        >
            <Toolbar sx={{ minHeight: '72px !important' }}>
                {/* 左侧菜单按钮 */}
                {showDrawerToggles && (
                    <Tooltip title="切换项目浏览器">
                        <IconButton
                            color="inherit"
                            aria-label="toggle left drawer"
                            onClick={onToggleLeftDrawer}
                            edge="start"
                            sx={{
                                mr: 1,
                                background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.2),
                                }
                            }}
                        >
                            <MenuIcon />
                        </IconButton>
                    </Tooltip>
                )}
                
                {/* Logo */}
                <Box 
                    sx={{ 
                        display: 'flex', 
                        alignItems: 'center',
                        background: (theme) => alpha(theme.palette.primary.main, 0.1),
                        borderRadius: 1,
                        p: 0.5,
                        mr: 2,
                        transition: 'transform 0.2s',
                        '&:hover': {
                            transform: 'scale(1.05)'
                        }
                    }}
                >
                    <Logo style={{ height: '40px', margin: '0 8px' }} />
                </Box>
                
                {/* 应用名称 */}
                <Typography 
                    variant="h6" 
                    component="div" 
                    sx={{ 
                        flexGrow: 0, 
                        mr: 4,
                        background: 'linear-gradient(90deg, #64b5f6 0%, #4db6ac 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontWeight: 'bold'
                    }}
                >
                    DeepCAD Pro
                </Typography>
                
                {/* 系统状态指示器 */}
                <Chip
                    size="small"
                    icon={
                        <Box sx={{ display: 'flex', alignItems: 'center', pl: 0.5 }}>
                            <span 
                                className={`status-indicator ${systemStatus}`}
                                style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    background: systemStatus === 'online' ? '#4caf50' : '#ff9800',
                                    boxShadow: systemStatus === 'online' ? '0 0 8px #4caf50' : '0 0 8px #ff9800',
                                    animation: systemStatus === 'online' ? 'pulse 1.5s infinite' : 'none',
                                    display: 'inline-block',
                                }}
                            />
                        </Box>
                    }
                    label={systemStatus === 'online' ? '系统正常' : '系统忙碌'}
                    sx={{ 
                        mr: 3,
                        background: (theme) => alpha(theme.palette.success.main, 0.1),
                        border: '1px solid',
                        borderColor: (theme) => alpha(theme.palette.success.main, 0.2),
                        '& .MuiChip-label': { px: 1 }
                    }}
                />
                
                <Divider orientation="vertical" flexItem sx={{ mx: 1, my: 1, borderColor: 'rgba(255,255,255,0.1)' }} />
                
                {/* 工作台选择器 */}
                <Box sx={{ flexGrow: 0, display: 'flex', mr: 2 }}>
                    <Button 
                        startIcon={<ModelIcon />} 
                        onClick={() => setActiveWorkbench('Modeling')} 
                        variant={activeWorkbench === 'Modeling' ? 'contained' : 'text'} 
                        color="primary" 
                        sx={{ 
                            mr: 1,
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                            background: activeWorkbench === 'Modeling' ? 'linear-gradient(45deg, #1565c0 0%, #1e88e5 100%)' : 'transparent',
                            '&:hover': {
                                background: activeWorkbench === 'Modeling' 
                                    ? 'linear-gradient(45deg, #1565c0 0%, #1e88e5 100%)' 
                                    : alpha('#1e88e5', 0.1)
                            }
                        }}
                    >
                        建模
                    </Button>
                    <Button 
                        startIcon={<GridOnIcon />} 
                        onClick={() => setActiveWorkbench('Mesh')} 
                        variant={activeWorkbench === 'Mesh' ? 'contained' : 'text'} 
                        color="warning" 
                        sx={{ 
                            mr: 1,
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                            background: activeWorkbench === 'Mesh' ? 'linear-gradient(45deg, #e65100 0%, #ff9800 100%)' : 'transparent',
                            '&:hover': {
                                background: activeWorkbench === 'Mesh' 
                                    ? 'linear-gradient(45deg, #e65100 0%, #ff9800 100%)' 
                                    : alpha('#ff9800', 0.1)
                            }
                        }}
                    >
                        网格
                    </Button>
                    <Button 
                        startIcon={<AnalysisIcon />} 
                        onClick={() => setActiveWorkbench('Analysis')} 
                        variant={activeWorkbench === 'Analysis' ? 'contained' : 'text'} 
                        color="secondary" 
                        sx={{ 
                            mr: 1,
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                            background: activeWorkbench === 'Analysis' ? 'linear-gradient(45deg, #00796b 0%, #26a69a 100%)' : 'transparent',
                            '&:hover': {
                                background: activeWorkbench === 'Analysis' 
                                    ? 'linear-gradient(45deg, #00796b 0%, #26a69a 100%)' 
                                    : alpha('#26a69a', 0.1)
                            }
                        }}
                    >
                        分析
                    </Button>
                    <Button 
                        startIcon={<ResultsIcon />} 
                        onClick={() => setActiveWorkbench('Results')} 
                        variant={activeWorkbench === 'Results' ? 'contained' : 'text'} 
                        color="info" 
                        sx={{ 
                            borderRadius: 2,
                            px: 2,
                            py: 1,
                            background: activeWorkbench === 'Results' ? 'linear-gradient(45deg, #0277bd 0%, #29b6f6 100%)' : 'transparent',
                            '&:hover': {
                                background: activeWorkbench === 'Results' 
                                    ? 'linear-gradient(45deg, #0277bd 0%, #29b6f6 100%)' 
                                    : alpha('#29b6f6', 0.1)
                            }
                        }}
                    >
                        结果
                    </Button>
                </Box>

                {/* 常用操作 */}
                <Box sx={{ flexGrow: 0, display: 'flex', mr: 2 }}>
                    <Tooltip title="保存项目 (Ctrl+S)">
                        <IconButton 
                            color="inherit"
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <SaveIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="撤销 (Ctrl+Z)">
                        <IconButton
                            color="inherit"
                            aria-label="undo change"
                            onClick={undo}
                            disabled={!canUndo}
                        >
                            <UndoIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="重做 (Ctrl+Y)">
                        <IconButton
                            color="inherit"
                            aria-label="redo change"
                            onClick={redo}
                            disabled={!canRedo}
                        >
                            <RedoIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                
                <Box sx={{ flexGrow: 1 }} />
                
                {/* 性能指标 */}
                <Stack direction="row" spacing={2} sx={{ mr: 2, display: { xs: 'none', md: 'flex' } }}>
                    <Tooltip title="帧率">
                        <Chip
                            icon={<SpeedIcon fontSize="small" />}
                            label={`${performanceMetrics.fps} FPS`}
                            size="small"
                            sx={{ 
                                background: (theme) => alpha(theme.palette.info.main, 0.1),
                                borderRadius: 1,
                                '& .MuiChip-label': { px: 1 }
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="内存使用">
                        <Chip
                            icon={<MemoryIcon fontSize="small" />}
                            label={`${performanceMetrics.memoryUsage}%`}
                            size="small"
                            sx={{ 
                                background: (theme) => alpha(theme.palette.warning.main, 0.1),
                                borderRadius: 1,
                                '& .MuiChip-label': { px: 1 }
                            }}
                        />
                    </Tooltip>
                </Stack>
                
                {/* 右侧图标 */}
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Tooltip title="帮助">
                        <IconButton 
                            color="inherit"
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <HelpIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="网格设置">
                        <IconButton 
                            color="inherit" 
                            onClick={() => openModal('MeshSettings')}
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="材料管理">
                        <IconButton 
                            color="inherit" 
                            onClick={() => openModal('MaterialManager')}
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <ColorLensIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="通知">
                        <IconButton 
                            color="inherit"
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <Badge badgeContent={4} color="error">
                                <NotificationsIcon />
                            </Badge>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="用户">
                        <IconButton 
                            color="inherit"
                            sx={{
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                }
                            }}
                        >
                            <AccountCircleIcon />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="属性面板">
                        <IconButton
                            color="inherit"
                            aria-label="toggle right drawer"
                            onClick={onToggleRightDrawer}
                            edge="end"
                            sx={{
                                ml: 1,
                                background: (theme) => alpha(theme.palette.primary.main, 0.1),
                                '&:hover': {
                                    background: (theme) => alpha(theme.palette.primary.main, 0.2),
                                }
                            }}
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