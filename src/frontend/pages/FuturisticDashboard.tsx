import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  IconButton,
  Tooltip,
  Stack,
  Chip,
  LinearProgress,
  Divider,
  Button,
  useTheme,
  styled,
} from '@mui/material';
import {
  Architecture as ArchitectureIcon,
  Science as ScienceIcon,
  PlayArrow as PlayArrowIcon,
  Dashboard as DashboardIcon,
  BarChart as BarChartIcon,
  SettingsRemote as SettingsRemoteIcon,
  WaterDrop as WaterDropIcon,
  Layers as LayersIcon,
  Refresh as RefreshIcon,
  Add as AddIcon,
  MoreVert as MoreVertIcon,
  BubbleChart as BubbleChartIcon,
  Terrain as TerrainIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import GlassmorphismCard from '../components/ui/GlassmorphismCard';
import AICommandPalette from '../components/ai/AICommandPalette';
import PredictiveToolbar from '../components/ai/PredictiveToolbar';
import HolographicDataSphere from '../components/visualization/HolographicDataSphere';
import { quantumTokens } from '../styles/tokens/quantumTokens';

/**
 * 未来科技风仪表盘页面
 * 整合所有组件，展示未来科技风UI效果
 */

const DashboardContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  minHeight: '100vh',
  padding: quantumTokens.spacing.lg,
  backgroundImage: quantumTokens.colors.backgroundDark,
  backgroundSize: 'cover',
  backgroundAttachment: 'fixed',
}));

const StatsCard = styled(GlassmorphismCard)(({ theme }) => ({
  minHeight: '120px',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'space-between',
}));

const StatusChip = styled(Chip)<{ status: 'running' | 'completed' | 'error' | 'ready' }>(
  ({ status }) => {
    const getColor = () => {
      switch (status) {
        case 'running':
          return quantumTokens.colors.neonDisplacement;
        case 'completed':
          return quantumTokens.colors.neonFlow;
        case 'error':
          return quantumTokens.colors.neonStress;
        default:
          return 'rgba(255, 255, 255, 0.5)';
      }
    };

    return {
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      border: `1px solid ${getColor()}`,
      color: getColor(),
      fontSize: '0.7rem',
      height: '20px',
    };
  }
);

const WorkflowStep = styled(Box)<{ active?: boolean }>(({ active = false }) => ({
  padding: quantumTokens.spacing.sm,
  backgroundColor: active ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.15)',
  borderRadius: quantumTokens.borderRadius.md,
  display: 'flex',
  alignItems: 'center',
  gap: quantumTokens.spacing.sm,
  transition: quantumTokens.animation.transitions.normal,
  border: `1px solid ${
    active ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)'
  }`,
  '&:hover': {
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    boxShadow: active ? quantumTokens.shadows.glow.subtle(quantumTokens.colors.quantumBrightEnd) : 'none',
  },
}));

const FuturisticDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [currentWorkflow, setCurrentWorkflow] = useState('深基坑分析');
  const [activeToolId, setActiveToolId] = useState('modeling-geometry');
  const [caeStatus, setCAEStatus] = useState<'running' | 'completed' | 'error' | 'ready'>('ready');
  const [aiStatus, setAIStatus] = useState<'running' | 'completed' | 'error' | 'ready'>('ready');
  const [caeProgress, setCAEProgress] = useState(0);
  const [aiProgress, setAIProgress] = useState(0);
  
  // 模拟CAE计算进度
  useEffect(() => {
    if (caeStatus === 'running') {
      const interval = setInterval(() => {
        setCAEProgress((prev) => {
          const newProgress = prev + Math.random() * 5;
          if (newProgress >= 100) {
            clearInterval(interval);
            setCAEStatus('completed');
            return 100;
          }
          return newProgress;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [caeStatus]);
  
  // 模拟AI计算进度
  useEffect(() => {
    if (aiStatus === 'running') {
      const interval = setInterval(() => {
        setAIProgress((prev) => {
          const newProgress = prev + Math.random() * 3;
          if (newProgress >= 100) {
            clearInterval(interval);
            setAIStatus('completed');
            return 100;
          }
          return newProgress;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [aiStatus]);
  
  // 处理命令面板的打开
  const handleOpenCommandPalette = () => {
    setIsCommandPaletteOpen(true);
  };
  
  // 处理工具点击
  const handleToolClick = (tool: any) => {
    setActiveToolId(tool.id);
    
    // 模拟状态变化
    if (tool.id === 'fem-analysis') {
      setCAEStatus('running');
      setCAEProgress(0);
    } else if (tool.id === 'ai-parameter') {
      setAIStatus('running');
      setAIProgress(0);
    }
  };
  
  // 处理命令执行
  const handleExecuteCommand = (command: string) => {
    console.log('执行命令:', command);
    // 模拟状态变化
    if (command.includes('分析') || command.includes('计算')) {
      setCAEStatus('running');
      setCAEProgress(0);
    } else if (command.includes('反演') || command.includes('参数')) {
      setAIStatus('running');
      setAIProgress(0);
    }
  };
  
  // 最近项目数据
  const recentProjects = [
    { id: 1, name: '徐家汇商业中心基坑工程', date: '2024-05-10', status: 'completed' as const },
    { id: 2, name: '浦东新区某深基坑支护设计', date: '2024-05-05', status: 'running' as const },
    { id: 3, name: '地铁13号线某站深基坑', date: '2024-04-28', status: 'completed' as const },
  ];
  
  // AI建议数据
  const aiSuggestions = [
    { id: 1, text: '根据监测数据，建议增加第3道支撑', confidence: 92 },
    { id: 2, text: '渗流计算表明东南角降水井效率不足', confidence: 85 },
    { id: 3, text: '墙体位移过大，建议调整开挖顺序', confidence: 78 },
  ];
  
  // 工作流步骤
  const workflowSteps = [
    { id: 'geometry', name: '几何建模', icon: <ArchitectureIcon />, active: true },
    { id: 'mesh', name: '网格生成', icon: <LayersIcon />, active: false },
    { id: 'analysis', name: '渗流分析', icon: <WaterDropIcon />, active: false },
    { id: 'results', name: '结果可视化', icon: <BarChartIcon />, active: false },
  ];
  
  // 导航到参数反演页面
  const navigateToParameterInversion = () => {
    navigate('/parameter-inversion');
  };
  
  return (
    <DashboardContainer>
      <Grid container spacing={3}>
        {/* 页面标题 */}
        <Grid item xs={12}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
            <Typography variant="h4" sx={{ color: '#fff', fontWeight: 'bold' }}>
              深基坑CAE系统 <span style={{ fontSize: '1rem', opacity: 0.7 }}>| 指挥中心</span>
            </Typography>
            
            <Stack direction="row" spacing={1} alignItems="center">
              <StatusChip
                label={caeStatus === 'running' ? '计算中' : caeStatus === 'completed' ? '计算完成' : '就绪'}
                status={caeStatus}
                size="small"
              />
              <Tooltip title="打开命令面板">
                <IconButton onClick={handleOpenCommandPalette} sx={{ color: '#fff' }}>
                  <ScienceIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>
          <Divider sx={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
        </Grid>
        
        {/* 左侧统计面板 */}
        <Grid item xs={12} md={3}>
          <Stack spacing={3}>
            {/* 计算进度卡片 */}
            <StatsCard>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium', mb: 1 }}>
                计算状态
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    CAE引擎
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {Math.round(caeProgress)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={caeProgress}
                  sx={{
                    height: 6,
                    borderRadius: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& .MuiLinearProgress-bar': {
                      backgroundImage: quantumTokens.colors.quantumBright,
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
              
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    物理AI
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    {Math.round(aiProgress)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={aiProgress}
                  sx={{
                    height: 6,
                    borderRadius: 1,
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    '& .MuiLinearProgress-bar': {
                      backgroundImage: quantumTokens.colors.quantumEnergy,
                      borderRadius: 1,
                    },
                  }}
                />
              </Box>
            </StatsCard>
            
            {/* 最近项目 */}
            <StatsCard>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                  活跃项目
                </Typography>
                <Tooltip title="添加项目">
                  <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Stack spacing={1}>
                {recentProjects.map((project) => (
                  <Box
                    key={project.id}
                    sx={{
                      p: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <Box>
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {project.name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.5)' }}>
                        {project.date}
                      </Typography>
                    </Box>
                    <StatusChip
                      label={project.status === 'running' ? '进行中' : '已完成'}
                      status={project.status}
                      size="small"
                    />
                  </Box>
                ))}
              </Stack>
            </StatsCard>
            
            {/* AI建议 */}
            <StatsCard>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                  AI工程建议
                </Typography>
                <Tooltip title="刷新建议">
                  <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Stack spacing={1}>
                {aiSuggestions.map((suggestion) => (
                  <Box
                    key={suggestion.id}
                    sx={{
                      p: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                      <ScienceIcon fontSize="small" sx={{ color: quantumTokens.colors.neonStress }} />
                      <Typography variant="body2" sx={{ color: '#fff' }}>
                        {suggestion.text}
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.65rem' }}
                      >
                        置信度: {suggestion.confidence}%
                      </Typography>
                      <Box sx={{ flex: 1, height: 3, backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: 1 }}>
                        <Box
                          sx={{
                            width: `${suggestion.confidence}%`,
                            height: '100%',
                            borderRadius: 1,
                            backgroundImage: quantumTokens.colors.quantumEnergy,
                          }}
                        />
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Stack>
            </StatsCard>
          </Stack>
        </Grid>
        
        {/* 中央数据球 */}
        <Grid item xs={12} md={6}>
          <GlassmorphismCard sx={{ height: '100%', minHeight: '500px' }}>
            <Typography variant="h6" sx={{ color: '#fff', mb: 1 }}>
              全息数据球
            </Typography>
            
            <Box sx={{ height: 'calc(100% - 40px)', width: '100%', position: 'relative' }}>
              <HolographicDataSphere
                height="100%"
                width="100%"
                title="深基坑多物理场数据"
                description="显示土体变形、应力分布、渗流场和监测数据的三维可视化"
              />
            </Box>
          </GlassmorphismCard>
        </Grid>
        
        {/* 右侧建议区 */}
        <Grid item xs={12} md={3}>
          <Stack spacing={3}>
            {/* AI驱动工作流 */}
            <GlassmorphismCard>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium' }}>
                  AI驱动工作流
                </Typography>
                <Tooltip title="刷新建议">
                  <IconButton size="small" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              <Stack spacing={1}>
                {workflowSteps.map((step) => (
                  <WorkflowStep key={step.id} active={step.active}>
                    <Box
                      sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: step.active ? 'rgba(0, 242, 254, 0.1)' : 'rgba(0, 0, 0, 0.3)',
                      }}
                    >
                      {React.cloneElement(step.icon as React.ReactElement, {
                        fontSize: 'small',
                        sx: {
                          color: step.active
                            ? quantumTokens.colors.quantumBrightEnd
                            : 'rgba(255, 255, 255, 0.5)',
                        },
                      })}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: step.active ? '#fff' : 'rgba(255, 255, 255, 0.7)',
                          fontWeight: step.active ? 'medium' : 'regular',
                        }}
                      >
                        {step.name}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: step.active
                          ? quantumTokens.colors.quantumBrightEnd
                          : 'rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  </WorkflowStep>
                ))}
              </Stack>
              
              <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={<PlayArrowIcon />}
                  sx={{
                    backgroundImage: quantumTokens.colors.quantumBright,
                    textTransform: 'none',
                  }}
                >
                  启动工作流
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<ScienceIcon />}
                  onClick={navigateToParameterInversion}
                  sx={{
                    borderColor: quantumTokens.colors.neonStress,
                    color: quantumTokens.colors.neonStress,
                    textTransform: 'none',
                  }}
                >
                  参数反演
                </Button>
              </Box>
            </GlassmorphismCard>
            
            {/* 实时状态 */}
            <GlassmorphismCard>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium', mb: 1 }}>
                系统状态
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <BubbleChartIcon
                      sx={{
                        fontSize: 32,
                        color: quantumTokens.colors.neonFlow,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}
                    >
                      物理引擎
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'medium' }}>
                      在线
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <ScienceIcon
                      sx={{
                        fontSize: 32,
                        color: quantumTokens.colors.neonDisplacement,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}
                    >
                      物理AI
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'medium' }}>
                      在线
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <SettingsRemoteIcon
                      sx={{
                        fontSize: 32,
                        color: quantumTokens.colors.neonWarning,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}
                    >
                      IOT监测
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'medium' }}>
                      24 设备
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: 'rgba(0, 0, 0, 0.2)',
                      borderRadius: 1,
                      textAlign: 'center',
                    }}
                  >
                    <TerrainIcon
                      sx={{
                        fontSize: 32,
                        color: quantumTokens.colors.neonStress,
                        animation: 'pulse 2s infinite',
                      }}
                    />
                    <Typography
                      variant="caption"
                      sx={{ display: 'block', color: 'rgba(255, 255, 255, 0.7)', mt: 0.5 }}
                    >
                      地质模型
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#fff', fontWeight: 'medium' }}>
                      已加载
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </GlassmorphismCard>
            
            {/* 系统资源 */}
            <GlassmorphismCard>
              <Typography variant="subtitle1" sx={{ color: '#fff', fontWeight: 'medium', mb: 1 }}>
                系统资源
              </Typography>
              
              <Stack spacing={1}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      CPU
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      65%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={65}
                    sx={{
                      height: 4,
                      borderRadius: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: quantumTokens.colors.neonDisplacement,
                      },
                    }}
                  />
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      GPU
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      87%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={87}
                    sx={{
                      height: 4,
                      borderRadius: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: quantumTokens.colors.neonStress,
                      },
                    }}
                  />
                </Box>
                
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      内存
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
                      42%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={42}
                    sx={{
                      height: 4,
                      borderRadius: 1,
                      backgroundColor: 'rgba(0, 0, 0, 0.3)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: quantumTokens.colors.neonFlow,
                      },
                    }}
                  />
                </Box>
              </Stack>
            </GlassmorphismCard>
          </Stack>
        </Grid>
      </Grid>
      
      {/* 智能命令面板 */}
      <AICommandPalette
        open={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onExecuteCommand={handleExecuteCommand}
      />
      
      {/* 预测式工具栏 */}
      <PredictiveToolbar
        currentWorkflow={currentWorkflow}
        activeToolId={activeToolId}
        onToolClick={handleToolClick}
      />
    </DashboardContainer>
  );
};

export default FuturisticDashboard;