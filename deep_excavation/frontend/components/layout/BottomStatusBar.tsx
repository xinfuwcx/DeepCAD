import React, { useState, useEffect, useRef } from 'react';
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

// 格式化大数字，如三角形数量
const formatNumber = (num: number): string => {
    if (num >= 1000000) {
        return `${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
        return `${(num / 1000).toFixed(1)}K`;
    }
    return num.toString();
};

const BottomStatusBar: React.FC = () => {
    const [systemStatus, setSystemStatus] = useState({
        fps: 60,
        memory: 25,
        renderCalls: 0,
        triangles: 0,
        status: '就绪',
        quality: 'Medium',
        renderTime: 0
    });
    
    // 使用ref存储回调函数，以便在清理时使用
    const metricsCallbackRef = useRef<(metrics: any) => void>();

    useEffect(() => {
        // 添加性能监控回调
        const handleMetricsUpdate = (metrics: any) => {
            // 确保FPS值合理，避免显示异常低的值
            const fps = Math.max(1, Math.round(metrics.fps || 60));
            
            // 内存使用率，如果metrics中的值不合理则使用默认值
            let memoryPercentage = metrics.memoryUsage?.percentage;
            if (!memoryPercentage || memoryPercentage <= 0 || memoryPercentage > 100) {
                memoryPercentage = 25; // 默认使用合理的值
            }
            
            // 确保渲染调用和三角形数量是合理的值
            const renderCalls = Math.max(0, metrics.drawCalls || 0);
            const triangles = Math.max(0, metrics.triangles || 0);
            
            // 确保渲染时间是合理的值（毫秒）
            const renderTime = Math.max(0, metrics.frameTime || 16.67);
            
            // 根据FPS计算系统状态
            let status = '就绪';
            let quality = 'Medium';
            
            // 只有当FPS值看起来合理时，才使用它来计算状态
            if (fps > 1) {
                status = fps > 45 ? '优秀' : fps > 30 ? '良好' : fps > 15 ? '一般' : '差';
                quality = fps > 45 ? 'Ultra' : fps > 30 ? 'High' : 'Medium';
            }
            
            setSystemStatus({
                fps,
                memory: memoryPercentage,
                renderCalls,
                triangles,
                renderTime,
                status,
                quality
            });
        };
        
        // 保存回调引用以便清理
        metricsCallbackRef.current = handleMetricsUpdate;
        
        // 注册回调
        globalPerformanceMonitor.addCallback(handleMetricsUpdate);
        
        // 如果监控尚未启动，则启动它
        if (!globalPerformanceMonitor.isMonitoring) {
            globalPerformanceMonitor.startMonitoring();
        }
        
        // 清理函数
        return () => {
            // 移除回调以避免内存泄漏
            if (metricsCallbackRef.current) {
                globalPerformanceMonitor.removeCallback(metricsCallbackRef.current);
            }
        };
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
                            {formatNumber(systemStatus.triangles)}
                        </Typography>
                    </PerformanceMetric>
                </StatusIndicator>
            </Box>
            
            {/* 右侧系统状态 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    渲染时间: {systemStatus.renderTime.toFixed(1)}ms
                </Typography>
                
                <StatusChip
                    label={`系统状态: ${systemStatus.status}`}
                    icon={statusConfig.icon}
                    color={statusConfig.color as any}
                    size="small"
                    variant="outlined"
                />
                
                <StatusChip
                    label={`渲染质量: ${systemStatus.quality}`}
                    icon={<VisibilityIcon />}
                    color="default"
                    size="small"
                    variant="outlined"
                />
            </Box>
        </StyledStatusBar>
    );
};

export default BottomStatusBar; 