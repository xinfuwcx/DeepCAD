/**
 * @file HolographicMainInterface.tsx
 * @description 全息投影风格的主界面 - 令人惊艳的未来科技感体验
 * @author Deep Excavation Team
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  IconButton,
  Drawer,
  AppBar,
  Toolbar,
  Avatar,
  Chip,
  Fade,
  Slide,
  Zoom,
  Backdrop,
  CircularProgress,
  Fab,
  Badge,
  Tooltip,
  Popper,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  LinearProgress
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  Engineering,
  Science,
  Analytics,
  Settings,
  Notifications,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  PlayArrow,
  Pause,
  ViewInAr,
  ThreeDRotation,
  AutoAwesome,
  TrendingUp,
  Security,
  Speed,
  Memory,
  Cloud,
  Refresh
} from '@mui/icons-material';
import { useFigmaTheme } from '../theme/FigmaThemeProvider';

// 全息投影动画效果
const holographicGlow = keyframes`
  0% { 
    box-shadow: 0 0 20px rgba(66, 165, 245, 0.3);
    border-color: rgba(66, 165, 245, 0.5);
  }
  50% { 
    box-shadow: 0 0 40px rgba(66, 165, 245, 0.6);
    border-color: rgba(66, 165, 245, 0.8);
  }
  100% { 
    box-shadow: 0 0 20px rgba(66, 165, 245, 0.3);
    border-color: rgba(66, 165, 245, 0.5);
  }
`;

const dataStreamFlow = keyframes`
  0% { transform: translateY(100vh) translateX(-50px); opacity: 0; }
  10% { opacity: 0.3; }
  90% { opacity: 0.7; }
  100% { transform: translateY(-100vh) translateX(50px); opacity: 0; }
`;

const floatingAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  25% { transform: translateY(-10px) rotate(1deg); }
  50% { transform: translateY(-5px) rotate(0deg); }
  75% { transform: translateY(-15px) rotate(-1deg); }
`;

// 全息风格的卡片组件
const HolographicCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, rgba(66, 165, 245, 0.1), rgba(220, 0, 78, 0.05))',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(66, 165, 245, 0.3)',
  borderRadius: '20px',
  position: 'relative',
  overflow: 'hidden',
  animation: `${holographicGlow} 3s ease-in-out infinite`,
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: '0 20px 40px rgba(66, 165, 245, 0.4)',
    '&::before': {
      opacity: 1
    }
  },
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'linear-gradient(45deg, rgba(255, 255, 255, 0.1), transparent, rgba(66, 165, 245, 0.1))',
    opacity: 0,
    transition: 'opacity 0.3s'
  }
}));

// 数据流效果组件
const DataStream = styled(Box)({
  position: 'absolute',
  width: '2px',
  height: '100px',
  background: 'linear-gradient(to bottom, transparent, #42a5f5, transparent)',
  animation: `${dataStreamFlow} 4s linear infinite`,
  '&:nth-of-type(2n)': {
    animationDelay: '1s',
    background: 'linear-gradient(to bottom, transparent, #dc004e, transparent)'
  },
  '&:nth-of-type(3n)': {
    animationDelay: '2s',
    background: 'linear-gradient(to bottom, transparent, #4caf50, transparent)'
  }
});

// 悬浮面板组件
const FloatingPanel = styled(Paper)(({ theme }) => ({
  position: 'fixed',
  background: 'rgba(13, 27, 42, 0.9)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(66, 165, 245, 0.3)',
  borderRadius: '15px',
  padding: theme.spacing(2),
  animation: `${floatingAnimation} 6s ease-in-out infinite`,
  zIndex: 1000
}));

interface HolographicMainInterfaceProps {
  open: boolean;
  onClose: () => void;
}

const HolographicMainInterface: React.FC<HolographicMainInterfaceProps> = ({
  onClose,
  open = false
}) => {
  const { tokens } = useFigmaTheme();
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [systemStatus, setSystemStatus] = useState('optimal');
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [showDataStream, setShowDataStream] = useState(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  
  const mainRef = useRef<HTMLDivElement>(null);

  // 系统状态数据
  const systemMetrics = [
    { name: 'Kratos引擎', status: 'online', usage: 95, color: '#4caf50' },
    { name: 'FEM求解器', status: 'active', usage: 87, color: '#2196f3' },
    { name: '网格生成器', status: 'ready', usage: 23, color: '#ff9800' },
    { name: '可视化引擎', status: 'optimal', usage: 76, color: '#9c27b0' }
  ];

  // 核心功能模块
  const coreModules = [
    {
      id: 'fem-analysis',
      title: 'FEM分析引擎',
      description: 'Kratos Multi-Physics驱动',
      icon: <Engineering sx={{ fontSize: 40 }} />,
      progress: 100,
      status: 'ready',
      color: 'primary'
    },
    {
      id: 'geo-modeling',
      title: '几何建模',
      description: 'Three.js + OpenCascade',
      icon: <ThreeDRotation sx={{ fontSize: 40 }} />,
      progress: 95,
      status: 'active',
      color: 'secondary'
    },
    {
      id: 'mesh-generation',
      title: '网格生成',
      description: 'Netgen高质量网格',
      icon: <AutoAwesome sx={{ fontSize: 40 }} />,
      progress: 90,
      status: 'processing',
      color: 'success'
    },
    {
      id: 'result-viz',
      title: '结果可视化',
      description: 'Trame科学可视化',
      icon: <Analytics sx={{ fontSize: 40 }} />,
      progress: 85,
      status: 'ready',
      color: 'warning'
    }
  ];

  // 模拟实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setAnalysisProgress(prev => prev >= 100 ? 0 : prev + Math.random() * 10);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // 生成数据流效果
  const generateDataStreams = () => {
    return Array.from({ length: 15 }, (_, i) => (
      <DataStream
        key={i}
        sx={{
          left: `${Math.random() * 100}%`,
          animationDelay: `${Math.random() * 4}s`
        }}
      />
    ));
  };

  // VR模式切换
  const toggleVRMode = () => {
    setIsFullscreen(true);
    // VR mode activation logic
  };

  return (
    <Box
      ref={mainRef}
      sx={{
        minHeight: '100vh',
        background: `
          radial-gradient(circle at 20% 20%, rgba(66, 165, 245, 0.15), transparent 50%),
          radial-gradient(circle at 80% 80%, rgba(220, 0, 78, 0.1), transparent 50%),
          linear-gradient(135deg, #0a0a0a, #1a1a2e, #16213e)
        `,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* 背景数据流效果 */}
      {showDataStream && (
        <Box sx={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' }}>
          {generateDataStreams()}
        </Box>
      )}

      {/* 全息顶部导航栏 */}
      <AppBar 
        position="fixed" 
        sx={{ 
          background: 'rgba(13, 27, 42, 0.8)',
          backdropFilter: 'blur(20px)',
          border: 'none',
          borderBottom: '1px solid rgba(66, 165, 245, 0.3)',
          boxShadow: '0 8px 32px rgba(66, 165, 245, 0.2)'
        }}
      >
        <Toolbar>
          <Box display="flex" alignItems="center" flex={1}>
            <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
              <Engineering />
            </Avatar>
            <Typography variant="h6" sx={{ 
              background: 'linear-gradient(45deg, #42a5f5, #dc004e)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 600
            }}>
              Deep Excavation CAE
            </Typography>
          </Box>

          {/* 系统状态指示器 */}
          <Box display="flex" alignItems="center" gap={2}>
            <Chip 
              icon={<Memory />}
              label="FEM引擎运行中"
              size="small"
              color="success"
              variant="outlined"
              sx={{ animation: `${holographicGlow} 2s ease-in-out infinite` }}
            />
            
            <Tooltip title="语音控制">
              <IconButton 
                onClick={() => setIsVoiceEnabled(!isVoiceEnabled)}
                color={isVoiceEnabled ? 'primary' : 'default'}
              >
                {isVoiceEnabled ? <VolumeUp /> : <VolumeOff />}
              </IconButton>
            </Tooltip>

            <Tooltip title="VR模式">
              <IconButton onClick={toggleVRMode} color="secondary">
                <ViewInAr />
              </IconButton>
            </Tooltip>

            <Badge badgeContent={3} color="error">
              <IconButton color="inherit">
                <Notifications />
              </IconButton>
            </Badge>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 主要内容区域 */}
      <Box sx={{ pt: 10, p: 4 }}>
        {/* 欢迎标题 */}
        <Box textAlign="center" sx={{ mb: 6 }}>
          <Fade in timeout={1000}>
            <Typography 
              variant="h2" 
              sx={{ 
                mb: 2,
                fontWeight: 700,
                background: 'linear-gradient(45deg, #42a5f5, #ffffff, #dc004e)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 30px rgba(66, 165, 245, 0.5)'
              }}
            >
              未来工程分析平台
            </Typography>
          </Fade>
          <Slide direction="up" in timeout={1500}>
            <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
              基于FEM技术的下一代深基坑CAE系统
            </Typography>
          </Slide>
        </Box>

        {/* 核心功能模块 */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" gutterBottom textAlign="center" sx={{ mb: 4, color: 'primary.main' }}>
            核心计算引擎
          </Typography>
          
          <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(300px, 1fr))" gap={3}>
            {coreModules.map((module, index) => (
              <Zoom in timeout={1000 + index * 200} key={module.id}>
                <HolographicCard
                  onClick={() => {
                    setActiveModule(module.id);
                    // Module selection logic
                  }}
                  sx={{ 
                    cursor: 'pointer',
                    ...(activeModule === module.id && {
                      transform: 'scale(1.05)',
                      boxShadow: '0 20px 40px rgba(66, 165, 245, 0.6)'
                    })
                  }}
                >
                  <CardContent sx={{ p: 3, position: 'relative', zIndex: 1 }}>
                    <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
                      <Avatar 
                        sx={{ 
                          bgcolor: `${module.color}.main`,
                          mr: 2,
                          width: 60,
                          height: 60,
                          boxShadow: '0 0 20px rgba(66, 165, 245, 0.5)'
                        }}
                      >
                        {module.icon}
                      </Avatar>
                      <Box flex={1}>
                        <Typography variant="h6" gutterBottom sx={{ color: 'white' }}>
                          {module.title}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {module.description}
                        </Typography>
                      </Box>
                      <Chip 
                        label={module.status}
                        size="small"
                        color={module.color as any}
                        variant="outlined"
                      />
                    </Box>
                    
                    <Box sx={{ mb: 2 }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          系统就绪状态
                        </Typography>
                        <Typography variant="body2" color={`${module.color}.main`}>
                          {module.progress}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate"
                        value={module.progress}
                        color={module.color as any}
                        sx={{ 
                          height: 8,
                          borderRadius: 4,
                          boxShadow: '0 0 10px rgba(66, 165, 245, 0.3)'
                        }}
                      />
                    </Box>
                    
                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<PlayArrow />}
                      sx={{
                        borderColor: `${module.color}.main`,
                        color: `${module.color}.main`,
                        '&:hover': {
                          backgroundColor: `${module.color}.main`,
                          color: 'white',
                          boxShadow: `0 0 20px rgba(66, 165, 245, 0.5)`
                        }
                      }}
                    >
                      启动模块
                    </Button>
                  </CardContent>
                </HolographicCard>
              </Zoom>
            ))}
          </Box>
        </Box>

        {/* 系统监控面板 */}
        <HolographicCard sx={{ mb: 4 }}>
          <CardContent sx={{ p: 3 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ color: 'white' }}>
                系统实时监控
              </Typography>
              <IconButton onClick={() => setShowDataStream(!showDataStream)}>
                <Refresh />
              </IconButton>
            </Box>
            
            <Box display="grid" gridTemplateColumns="repeat(auto-fit, minmax(250px, 1fr))" gap={3}>
              {systemMetrics.map((metric, index) => (
                <Box key={metric.name}>
                  <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      {metric.name}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%',
                          backgroundColor: metric.color,
                          boxShadow: `0 0 10px ${metric.color}`
                        }} 
                      />
                      <Typography variant="caption" sx={{ color: metric.color }}>
                        {metric.status}
                      </Typography>
                    </Box>
                  </Box>
                  <LinearProgress 
                    variant="determinate"
                    value={metric.usage}
                    sx={{ 
                      height: 6,
                      borderRadius: 3,
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: metric.color,
                        boxShadow: `0 0 10px ${metric.color}`
                      }
                    }}
                  />
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                  >
                    {metric.usage}% 使用率
                  </Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </HolographicCard>
      </Box>

      {/* 悬浮操作按钮 */}
      <Fab
        color="primary"
        sx={{ 
          position: 'fixed',
          bottom: 32,
          right: 32,
          background: 'linear-gradient(45deg, #42a5f5, #dc004e)',
          animation: `${floatingAnimation} 4s ease-in-out infinite`,
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 0 30px rgba(66, 165, 245, 0.8)'
          }
        }}
        onClick={() => {
          // New project creation logic
        }}
      >
        <AutoAwesome />
      </Fab>

      {/* 悬浮系统状态面板 */}
      <FloatingPanel sx={{ top: 100, right: 20, width: 280 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ color: 'primary.main' }}>
          🚀 FEM引擎状态
        </Typography>
        <Box display="flex" alignItems="center" gap={1} sx={{ mb: 2 }}>
          <Box 
            sx={{ 
              width: 10, 
              height: 10, 
              borderRadius: '50%',
              backgroundColor: '#4caf50',
              animation: `${holographicGlow} 2s ease-in-out infinite`
            }} 
          />
          <Typography variant="body2" color="text.secondary">
            Kratos Multi-Physics 运行正常
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary">
          11个专业模块已就绪 • 分析进度 {Math.round(analysisProgress)}%
        </Typography>
        <LinearProgress 
          variant="determinate"
          value={analysisProgress}
          sx={{ mt: 1, height: 4, borderRadius: 2 }}
        />
      </FloatingPanel>
    </Box>
  );
};

export default HolographicMainInterface;
