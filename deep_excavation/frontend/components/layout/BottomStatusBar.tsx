import React, { useState, useEffect } from 'react';
import { Box, Chip, Typography, LinearProgress, styled, alpha } from '@mui/material';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';
import { globalResourceManager } from '../../core/resourceManager';
import SpeedIcon from '@mui/icons-material/Speed';
import MemoryIcon from '@mui/icons-material/Memory';
import VisibilityIcon from '@mui/icons-material/Visibility';
import TimelineIcon from '@mui/icons-material/Timeline';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';

// 美化的状态栏容器
const StyledStatusBar = styled(Box)(({ theme }) => ({
    height: '48px',
    padding: theme.spacing(0, 2),
    background: `linear-gradient(135deg, 
        ${alpha(theme.palette.background.paper, 0.98)} 0%, 
        ${alpha(theme.palette.background.default, 0.98)} 100%)`,
    backdropFilter: 'blur(20px)',
    borderTop: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
    position: 'relative',
    overflow: 'hidden',
    
    // 添加顶部高亮线
    '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '2px',
        background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
        opacity: 0.6,
    },
    
    // 添加微妙的纹理效果
    '&::after': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.02) 100%)',
        pointerEvents: 'none',
    }
}));

// 状态指示器组件
const StatusIndicator = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderRadius: 8,
    background: alpha(theme.palette.background.paper, 0.5),
    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
    transition: 'all 0.3s ease',
    
    '&:hover': {
        background: alpha(theme.palette.background.paper, 0.8),
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    }
}));

// 性能指标组件
const PerformanceMetric = styled(Box)(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    fontSize: '0.75rem',
    fontWeight: 500,
    color: theme.palette.text.secondary,
    
    '& .metric-icon': {
        fontSize: '1rem',
        opacity: 0.7,
    },
    
    '& .metric-value': {
        fontWeight: 600,
        color: theme.palette.text.primary,
    }
}));

// 状态芯片组件
const StatusChip = styled(Chip)(({ theme }) => ({
    height: 24,
    fontSize: '0.75rem',
    fontWeight: 500,
    
    '& .MuiChip-icon': {
        fontSize: '0.875rem',
    }
}));

// 迷你进度条
const MiniProgressBar = styled(LinearProgress)(({ theme }) => ({
    height: 3,
    borderRadius: 2,
    width: 60,
    backgroundColor: alpha(theme.palette.grey[500], 0.2),
    
    '& .MuiLinearProgress-bar': {
        borderRadius: 2,
    }
}));

const BottomStatusBar: React.FC = () => {
    const [systemStatus, setSystemStatus] = useState({
        fps: 0,
        memory: 0,
        renderCalls: 0,
        triangles: 0,
        status: '就绪',
        quality: 'High',
        renderTime: 0
    });

    useEffect(() => {
        const updateStatus = () => {
            const metrics = globalPerformanceMonitor.getMetrics();
            const resourceStats = globalResourceManager.getMemoryStats();
            
            setSystemStatus({
                fps: Math.round(metrics.fps),
                memory: Math.round(metrics.memoryUsage.percentage),
                renderCalls: metrics.drawCalls,
                triangles: metrics.triangles,
                renderTime: metrics.frameTime || 0,
                status: metrics.fps > 45 ? '优秀' : metrics.fps > 30 ? '良好' : metrics.fps > 15 ? '一般' : '差',
                quality: metrics.fps > 45 ? 'Ultra' : metrics.fps > 30 ? 'High' : 'Medium'
            });
        };

        // 每秒更新一次
        const interval = setInterval(updateStatus, 1000);
        updateStatus(); // 立即更新一次

        return () => clearInterval(interval);
    }, []);

    const getStatusConfig = (status: string) => {
        switch (status) {
            case '优秀': 
                return { 
                    color: 'success', 
                    icon: <CheckCircleIcon />,
                    bgColor: '#4CAF50'
                };
            case '良好': 
                return { 
                    color: 'primary', 
                    icon: <CheckCircleIcon />,
                    bgColor: '#2196F3'
                };
            case '一般': 
                return { 
                    color: 'warning', 
                    icon: <WarningIcon />,
                    bgColor: '#FF9800'
                };
            case '差': 
                return { 
                    color: 'error', 
                    icon: <ErrorIcon />,
                    bgColor: '#F44336'
                };
            default: 
                return { 
                    color: 'default', 
                    icon: <SpeedIcon />,
                    bgColor: '#9E9E9E'
                };
        }
    };

    const statusConfig = getStatusConfig(systemStatus.status);

    return (
        <StyledStatusBar>
            {/* 左侧性能指标 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <StatusIndicator>
                    <PerformanceMetric>
                        <SpeedIcon className="metric-icon" />
                        <Typography variant="caption">FPS:</Typography>
                        <Typography variant="caption" className="metric-value">
                            {systemStatus.fps}
                        </Typography>
                    </PerformanceMetric>
                </StatusIndicator>
                
                <StatusIndicator>
                    <PerformanceMetric>
                        <MemoryIcon className="metric-icon" />
                        <Typography variant="caption">内存:</Typography>
                        <Typography variant="caption" className="metric-value">
                            {systemStatus.memory}%
                        </Typography>
                    </PerformanceMetric>
                    <MiniProgressBar 
                        variant="determinate" 
                        value={systemStatus.memory}
                        color={systemStatus.memory > 80 ? 'error' : systemStatus.memory > 60 ? 'warning' : 'primary'}
                    />
                </StatusIndicator>
                
                <StatusIndicator>
                    <PerformanceMetric>
                        <VisibilityIcon className="metric-icon" />
                        <Typography variant="caption">绘制:</Typography>
                        <Typography variant="caption" className="metric-value">
                            {systemStatus.renderCalls}
                        </Typography>
                    </PerformanceMetric>
                </StatusIndicator>
                
                <StatusIndicator>
                    <PerformanceMetric>
                        <TimelineIcon className="metric-icon" />
                        <Typography variant="caption">三角形:</Typography>
                        <Typography variant="caption" className="metric-value">
                            {systemStatus.triangles.toLocaleString()}
                        </Typography>
                    </PerformanceMetric>
                </StatusIndicator>
            </Box>

            {/* 中间渲染质量指示器 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    渲染质量:
                </Typography>
                <StatusChip 
                    label={systemStatus.quality}
                    size="small"
                    color={systemStatus.quality === 'Ultra' ? 'success' : systemStatus.quality === 'High' ? 'primary' : 'warning'}
                />
                <Typography variant="caption" sx={{ opacity: 0.7, ml: 1 }}>
                    帧时间: {systemStatus.renderTime.toFixed(1)}ms
                </Typography>
            </Box>

            {/* 右侧系统状态 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    系统状态:
                </Typography>
                <StatusChip 
                    icon={statusConfig.icon}
                    label={systemStatus.status}
                    size="small"
                    color={statusConfig.color as any}
                    sx={{
                        background: `linear-gradient(135deg, ${statusConfig.bgColor}22, ${statusConfig.bgColor}44)`,
                        border: `1px solid ${statusConfig.bgColor}66`,
                        '&:hover': {
                            background: `linear-gradient(135deg, ${statusConfig.bgColor}33, ${statusConfig.bgColor}55)`,
                        }
                    }}
                />
                <Box 
                    sx={{ 
                        width: 8, 
                        height: 8, 
                        borderRadius: '50%', 
                        backgroundColor: statusConfig.bgColor,
                        boxShadow: `0 0 8px ${statusConfig.bgColor}66`,
                        animation: 'pulse 2s infinite',
                        ml: 1
                    }} 
                />
            </Box>
        </StyledStatusBar>
    );
};

export default BottomStatusBar; 