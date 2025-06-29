/**
 * @file FigmaIntegrationShowcase.tsx
 * @description Figma集成功能展示组件
 * @author Deep Excavation Team
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  Stack,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Fade,
  Slide,
  LinearProgress,
  Alert
} from '@mui/material';
import {
  Palette,
  ColorLens,
  TextFields,
  ViewModule,
  Sync,
  CheckCircle,
  Timeline,
  AutoAwesome,
  Close,
  Refresh,
  PlayArrow
} from '@mui/icons-material';
import { useFigmaTheme } from '../theme/FigmaThemeProvider';

interface FigmaIntegrationShowcaseProps {
  compact?: boolean;
  open?: boolean;
  onClose?: () => void;
}

const FigmaIntegrationShowcase: React.FC<FigmaIntegrationShowcaseProps> = ({
  compact = false,
  open = true,
  onClose
}) => {
  const { tokens, refreshTheme, isLoading, lastSync } = useFigmaTheme();
  const [showTokens, setShowTokens] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Figma功能特性
  const figmaFeatures = [
    {
      icon: <Palette sx={{ fontSize: 32 }} />,
      title: '自动化设计系统',
      description: '100%完成的Figma自动化集成',
      status: 'completed',
      items: ['令牌自动提取', 'MUI主题生成', '实时同步']
    },
    {
      icon: <ColorLens sx={{ fontSize: 32 }} />,
      title: '设计令牌系统',
      description: '12个颜色，5个字体，6个间距',
      status: 'active',
      items: ['JSON格式', 'TypeScript定义', 'CSS变量']
    },
    {
      icon: <ViewModule sx={{ fontSize: 32 }} />,
      title: '组件库集成',
      description: 'MUI主题完全兼容',
      status: 'active',
      items: ['主题提供者', '同步监控', '演示组件']
    },
    {
      icon: <Timeline sx={{ fontSize: 32 }} />,
      title: '工作流自动化',
      description: '设计师与开发者协作',
      status: 'active',
      items: ['一键配置', '自动测试', '状态监控']
    }
  ];

  // 设计令牌统计
  const tokenStats = [
    { label: '颜色令牌', count: Object.keys(tokens.colors || {}).length, icon: '🎨' },
    { label: '字体令牌', count: Object.keys(tokens.typography || {}).length, icon: '📝' },
    { label: '间距令牌', count: Object.keys(tokens.spacing || {}).length, icon: '📏' },
    { label: '阴影效果', count: Object.keys(tokens.effects || {}).length, icon: '✨' }
  ];

  // 动画效果
  useEffect(() => {
    if (!compact) {
      const timer = setInterval(() => {
        setAnimationStep(prev => (prev + 1) % 4);
      }, 2000);
      return () => clearInterval(timer);
    }
  }, [compact]);

  // 同步状态处理
  const handleRefreshTheme = async () => {
    try {
      await refreshTheme();
    } catch (error) {
      console.error('主题同步失败:', error);
    }
  };

  if (compact) {
    return (
      <Card elevation={2} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center">
              <Avatar sx={{ bgcolor: 'secondary.light', color: 'secondary.main', mr: 2 }}>
                <Palette />
              </Avatar>
              <Box>
                <Typography variant="subtitle1">Figma设计系统</Typography>
                <Typography variant="body2" color="text.secondary">
                  100%完成，立即可用
                </Typography>
              </Box>
            </Box>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                icon={<CheckCircle />}
                label="已集成"
                color="success"
                size="small"
              />
              <IconButton size="small" onClick={handleRefreshTheme} disabled={isLoading}>
                <Refresh />
              </IconButton>
            </Box>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ py: 4 }}>
      {/* 标题部分 */}
      <Box textAlign="center" sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 600,
            background: 'linear-gradient(45deg, #dc004e, #f06292)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}
        >
          Figma自动化设计系统
        </Typography>
        <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
          设计师与开发者的无缝协作平台
        </Typography>
        
        {/* 同步状态 */}
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
          <Chip 
            icon={<CheckCircle />}
            label="100% 完成"
            color="success"
            variant="outlined"
          />
          <Chip 
            icon={<Sync />}
            label={lastSync ? `最近同步: ${lastSync.toLocaleTimeString()}` : '未同步'}
            color="info"
            variant="outlined"
          />
          <Button
            size="small"
            startIcon={<Refresh />}
            onClick={handleRefreshTheme}
            disabled={isLoading}
          >
            刷新令牌
          </Button>
        </Stack>

        {isLoading && (
          <Box sx={{ mt: 2, maxWidth: 300, mx: 'auto' }}>
            <LinearProgress />
            <Typography variant="caption" color="text.secondary">
              正在同步设计令牌...
            </Typography>
          </Box>
        )}
      </Box>

      {/* 功能特性卡片 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {figmaFeatures.map((feature, index) => (
          <Grid item xs={12} sm={6} lg={3} key={feature.title}>
            <Fade in timeout={1000 + index * 200}>
              <Card 
                elevation={animationStep === index ? 4 : 1}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  transform: animationStep === index ? 'scale(1.02)' : 'scale(1)',
                  border: animationStep === index ? '2px solid' : '1px solid',
                  borderColor: animationStep === index ? 'secondary.main' : 'divider'
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: feature.status === 'completed' ? 'success.light' : 'secondary.light',
                        color: feature.status === 'completed' ? 'success.main' : 'secondary.main',
                        mr: 2
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <Chip 
                        label={feature.status === 'completed' ? '已完成' : '可用'}
                        size="small"
                        color={feature.status === 'completed' ? 'success' : 'secondary'}
                        variant="outlined"
                      />
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {feature.description}
                  </Typography>
                  
                  <Stack spacing={1}>
                    {feature.items.map((item, itemIndex) => (
                      <Box key={itemIndex} display="flex" alignItems="center">
                        <Box 
                          sx={{ 
                            width: 6, 
                            height: 6, 
                            borderRadius: '50%',
                            bgcolor: 'secondary.main',
                            mr: 1.5,
                            flexShrink: 0
                          }} 
                        />
                        <Typography variant="body2" color="text.secondary">
                          {item}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* 设计令牌统计 */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {tokenStats.map((stat, index) => (
          <Grid item xs={6} sm={3} key={stat.label}>
            <Card 
              elevation={1} 
              sx={{ 
                p: 2, 
                textAlign: 'center',
                transition: 'all 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: 3
                }
              }}
            >
              <Typography variant="h4" sx={{ mb: 1 }}>
                {stat.icon}
              </Typography>
              <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
                {stat.count}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {stat.label}
              </Typography>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* 操作按钮 */}
      <Box textAlign="center">
        <Button
          variant="outlined"
          startIcon={<ViewModule />}
          onClick={() => setShowTokens(true)}
          sx={{ mr: 2 }}
        >
          查看设计令牌
        </Button>
        <Button
          variant="contained"
          startIcon={<PlayArrow />}
          color="secondary"
        >
          体验集成效果
        </Button>
      </Box>

      {/* 设计令牌详情对话框 */}
      <Dialog 
        open={showTokens} 
        onClose={() => setShowTokens(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Typography variant="h6">设计令牌详情</Typography>
            <IconButton onClick={() => setShowTokens(false)}>
              <Close />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            {/* 颜色令牌 */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>颜色令牌</Typography>
              <Stack spacing={1}>
                {Object.entries(tokens.colors || {}).map(([key, value]) => (
                  <Box key={key} display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 20, 
                          height: 20, 
                          borderRadius: 1,
                          backgroundColor: value as string,
                          mr: 2,
                          border: '1px solid',
                          borderColor: 'divider'
                        }} 
                      />
                      <Typography variant="body2">{key}</Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                      {String(value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>

            {/* 字体令牌 */}
            <Grid item xs={12} md={6}>
              <Typography variant="subtitle1" gutterBottom>字体令牌</Typography>
              <Stack spacing={1}>
                {Object.entries(tokens.typography || {}).map(([key, value]) => (
                  <Box key={key}>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {key}
                    </Typography>
                    <Typography 
                      variant="caption" 
                      color="text.secondary" 
                      fontFamily="monospace"
                      sx={{ display: 'block' }}
                    >
                      {typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value)}
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTokens(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FigmaIntegrationShowcase;
