/**
 * @file SmartLaboratory.tsx
 * @description 智能实验室 - AI参数助手与3D可视化的完美融合
 * @features 对标设计规范中的"CAE分析页面 - 智能实验室"
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Fab,
  Tooltip,
  Alert,
  Chip,
  LinearProgress,
  AppBar,
  Toolbar,
  Avatar,
  Breadcrumbs,
  Link
} from '@mui/material';
import { styled, alpha } from '@mui/material/styles';
import {
  ArrowBack,
  Save,
  SmartToy,
  PlayArrow,
  Psychology,
  Engineering,
  Timeline,
  Mic,
  Settings,
  Visibility,
  Speed,
  AutoAwesome,
  Warning,
  CheckCircle
} from '@mui/icons-material';

import AIEngineerAssistant from '../components/ai/AIEngineerAssistant';
import Interactive3DParameterSphere from '../components/parameters/Interactive3DParameterSphere';
import SmartParameterDialog from '../components/parameters/SmartParameterDialog';
// import RealTimeComputingStatus from '../components/monitoring/RealTimeComputingStatus';

// 样式定义
const LabContainer = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${theme.palette.background.default} 0%, 
    ${alpha(theme.palette.primary.dark, 0.1)} 100%)`,
  minHeight: '100vh',
  position: 'relative',
  overflow: 'hidden',
}));

const GlassCard = styled(Card)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.background.paper, 0.1)} 0%, 
    ${alpha(theme.palette.background.paper, 0.05)} 100%)`,
  backdropFilter: 'blur(20px)',
  border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
  borderRadius: 20,
  boxShadow: `0 25px 50px -12px ${alpha(theme.palette.primary.main, 0.25)}`,
}));

const ModelViewport = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.dark, 0.95)} 0%, 
    ${alpha(theme.palette.secondary.dark, 0.9)} 100%)`,
  borderRadius: 16,
  border: `2px solid ${alpha(theme.palette.primary.light, 0.3)}`,
  position: 'relative',
  overflow: 'hidden',
  height: '500px',
  boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.5)}`,
}));

const FloatingAIBadge = styled(Fab)(({ theme }) => ({
  position: 'fixed',
  bottom: 24,
  right: 24,
  background: `linear-gradient(45deg, 
    ${theme.palette.primary.main} 0%, 
    ${theme.palette.secondary.main} 100%)`,
  boxShadow: `0 0 20px ${alpha(theme.palette.primary.main, 0.6)}`,
  zIndex: 1000,
  '&:hover': {
    transform: 'scale(1.1)',
    boxShadow: `0 0 30px ${alpha(theme.palette.primary.main, 0.8)}`,
  }
}));

// 模拟参数数据
const mockParameters = [
  {
    id: 'density',
    name: 'density',
    displayName: '土体密度',
    value: 1800,
    unit: 'kg/m³',
    min: 1200,
    max: 2200,
    step: 10,
    category: 'soil' as const,
    description: '土体的天然密度，影响重力应力分布',
    impact: 'medium' as const
  },
  {
    id: 'elastic_modulus',
    name: 'elastic_modulus',
    displayName: '弹性模量',
    value: 20000,
    unit: 'kPa',
    min: 5000,
    max: 100000,
    step: 1000,
    category: 'soil' as const,
    description: '土体变形特性的关键参数',
    impact: 'high' as const
  },
  {
    id: 'support_depth',
    name: 'support_depth',
    displayName: '支护深度',
    value: 18,
    unit: 'm',
    min: 10,
    max: 30,
    step: 1,
    category: 'structure' as const,
    description: '支护结构的插入深度',
    impact: 'high' as const
  }
];

// AI建议数据
const mockAIRecommendations = [
  {
    id: 'rec_001',
    type: 'optimization' as const,
    title: '基坑东南角位移优化',
    description: 'AI发现基坑东南角位移较大，建议优化支护参数',
    parameters: [
      {
        ...mockParameters[2],
        value: 20,
        isAIRecommended: true,
        confidence: 0.88
      }
    ],
    confidence: 0.88,
    reasoning: '基于FEM分析和历史工程数据，增加支护深度可有效控制东南角变形',
    impact: '预计减少最大位移15-20%，提高支护体系稳定性',
    timeStamp: new Date()
  },
  {
    id: 'rec_002', 
    type: 'warning' as const,
    title: '降水井优化建议',
    description: '检测到地下水位对基坑稳定性的潜在影响',
    parameters: [],
    confidence: 0.75,
    reasoning: '渗流分析显示需要调整降水井布局以减少渗透压力',
    impact: '优化降水系统可提高基坑整体安全系数',
    timeStamp: new Date()
  }
];

export const SmartLaboratory: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [parameters, setParameters] = useState(mockParameters);
  const [aiRecommendations, setAiRecommendations] = useState(mockAIRecommendations);
  const [computingStatus, setComputingStatus] = useState({
    progress: 67,
    stage: '渗流-结构耦合分析',
    isRunning: true,
    estimatedTime: 8,
    gpuAccelerated: true,
    convergenceStatus: '良好'
  });
  const [showAIAssistant, setShowAIAssistant] = useState(true);

  // 处理参数应用
  const handleParametersApply = useCallback(async (newParams: typeof parameters) => {
    console.log('应用参数:', newParams);
    setParameters(newParams);
    
    // 模拟计算过程
    setComputingStatus(prev => ({
      ...prev,
      progress: 0,
      isRunning: true,
      stage: '重新计算中...'
    }));
    
    // 模拟进度更新
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setComputingStatus(prev => ({
          ...prev,
          progress: 100,
          isRunning: false,
          stage: '计算完成'
        }));
      } else {
        setComputingStatus(prev => ({
          ...prev,
          progress: Math.min(progress, 100)
        }));
      }
    }, 500);
    
    setDialogOpen(false);
  }, []);

  // 处理AI助手命令
  const handleAICommand = useCallback((command: string) => {
    console.log('AI命令:', command);
    
    // 模拟AI响应
    if (command.includes('参数') || command.includes('设置')) {
      setDialogOpen(true);
    }
  }, []);

  return (
    <LabContainer>
      {/* 顶部导航栏 */}
      <AppBar position="static" elevation={0} sx={{ 
        background: 'transparent',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)'
      }}>
        <Toolbar>
          <IconButton edge="start" sx={{ color: 'primary.light', mr: 2 }}>
            <ArrowBack />
          </IconButton>
          
          <Breadcrumbs sx={{ flex: 1 }}>
            <Link color="inherit">深基坑支护分析项目</Link>
            <Typography color="primary.light">智能实验室</Typography>
          </Breadcrumbs>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button startIcon={<Save />} variant="outlined" size="small">
              保存
            </Button>
            <Button startIcon={<SmartToy />} variant="contained" size="small">
              AI分析
            </Button>
            <Button startIcon={<PlayArrow />} variant="contained" color="success" size="small">
              运行
            </Button>
          </Box>
        </Toolbar>
      </AppBar>

      {/* 主要内容区域 */}
      <Box sx={{ p: 3 }}>
        <Grid container spacing={3}>
          {/* 左侧 - AI参数助手 */}
          <Grid item xs={12} md={4}>
            <GlassCard sx={{ height: '500px', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                    <Mic />
                  </Avatar>
                  <Typography variant="h6" color="primary.light">
                    AI参数助手
                  </Typography>
                </Box>
                
                {showAIAssistant && (
                  <Box sx={{ flex: 1 }}>
                    <AIEngineerAssistant
                      onCommand={handleAICommand}
                      onParameterSuggestion={() => setDialogOpen(true)}
                    />
                  </Box>
                )}
                
                <Box sx={{ mt: 'auto' }}>
                  <Typography variant="subtitle2" color="primary.light" gutterBottom>
                    📊 土层参数
                  </Typography>
                  {parameters.filter(p => p.category === 'soil').map(param => (
                    <Box key={param.id} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        • {param.displayName}: {param.value} {param.unit}
                      </Typography>
                    </Box>
                  ))}
                  
                  <Typography variant="subtitle2" color="primary.light" gutterBottom sx={{ mt: 2 }}>
                    🏗️ 支护结构
                  </Typography>
                  {parameters.filter(p => p.category === 'structure').map(param => (
                    <Box key={param.id} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        • {param.displayName}: {param.value} {param.unit}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* 右侧 - 3D模型视窗 */}
          <Grid item xs={12} md={8}>
            <GlassCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="h6" color="primary.light">
                    🌐 3D模型视窗 (Netgen网格 + FEM结果)
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Chip label="应力云图(实时)" color="primary" size="small" />
                    <Chip label="位移等值线(实时)" color="secondary" size="small" />
                  </Box>
                </Box>
                
                <ModelViewport>
                  <Interactive3DParameterSphere
                    parameters={parameters}
                    onParameterClick={() => setDialogOpen(true)}
                    showControls={true}
                  />
                </ModelViewport>
                
                <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="body2" color="text.secondary">
                    🎮 交互控制: 👆 手势旋转 🎙️ 语音命令 ⌨️ 快捷键 🖱️ 精确操作
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <IconButton size="small" color="primary">
                      <Visibility />
                    </IconButton>
                    <IconButton size="small" color="primary">
                      <Settings />
                    </IconButton>
                  </Box>
                </Box>
              </CardContent>
            </GlassCard>
          </Grid>

          {/* 底部 - AI实时分析 */}
          <Grid item xs={12}>
            <GlassCard>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                    <Psychology />
                  </Avatar>
                  <Typography variant="h6" color="primary.light">
                    🧠 AI实时分析 + 🔮 智能建议
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Typography variant="body1" sx={{ flex: 1 }}>
                      当前计算: {computingStatus.stage}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {computingStatus.progress}%
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={computingStatus.progress}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                </Box>

                <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                  <Chip 
                    icon={<Speed />} 
                    label={`GPU加速: ${computingStatus.gpuAccelerated ? 'ON' : 'OFF'}`}
                    color="success"
                  />
                  <Chip 
                    icon={<Timeline />} 
                    label={`收敛状态: ${computingStatus.convergenceStatus}`}
                    color="primary"
                  />
                  <Chip 
                    label={`剩余: ${computingStatus.estimatedTime}分钟`}
                    variant="outlined"
                  />
                </Box>

                {aiRecommendations.length > 0 && (
                  <Alert 
                    severity="info" 
                    icon={<AutoAwesome />}
                    action={
                      <Button 
                        color="inherit" 
                        size="small"
                        onClick={() => setDialogOpen(true)}
                      >
                        查看详情
                      </Button>
                    }
                  >
                    💡 AI发现: {aiRecommendations[0].title}
                    <br />
                    建议: 1. 增加第3道支撑 2. 调整开挖顺序 3. 优化降水井
                  </Alert>
                )}
              </CardContent>
            </GlassCard>
          </Grid>
        </Grid>
      </Box>

      {/* 智能参数弹窗 */}
      <SmartParameterDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="🔧 智能参数设置 - AI驱动优化"
        parameters={parameters}
        onParametersChange={setParameters}
        onApply={handleParametersApply}
        aiRecommendations={aiRecommendations}
        show3DPreview={true}
      />

      {/* 浮动AI助手按钮 */}
      <FloatingAIBadge
        onClick={() => setShowAIAssistant(!showAIAssistant)}
        sx={{ 
          transform: showAIAssistant ? 'rotate(45deg)' : 'rotate(0deg)',
          transition: 'transform 0.3s ease'
        }}
      >
        <SmartToy />
      </FloatingAIBadge>
    </LabContainer>
  );
};

export default SmartLaboratory;
