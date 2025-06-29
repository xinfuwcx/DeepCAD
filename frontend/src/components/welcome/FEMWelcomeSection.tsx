/**
 * @file FEMWelcomeSection.tsx
 * @description FEM技术特性展示组件
 * @author Deep Excavation Team
 */

import React from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Chip,
  Stack,
  LinearProgress,
  Avatar,
  Fade
} from '@mui/material';
import {
  Engineering,
  Speed,
  Security,
  AutoAwesome,
  TrendingUp,
  AccountTree,
  Science,
  Analytics
} from '@mui/icons-material';
import { useFigmaTheme } from '../theme/FigmaThemeProvider';

interface FEMWelcomeSectionProps {
  onGetStarted?: () => void;
}

const FEMWelcomeSection: React.FC<FEMWelcomeSectionProps> = ({
  onGetStarted
}) => {
  const { tokens } = useFigmaTheme();

  // FEM技术特性
  const femFeatures = [
    {
      icon: <Engineering sx={{ fontSize: 40 }} />,
      title: 'Kratos Multi-Physics',
      description: '11个专业模块支持复杂工程分析',
      modules: ['GeoMechanics', 'PoroMechanics', 'Structural', 'FluidDynamics'],
      progress: 100,
      color: 'primary'
    },
    {
      icon: <Speed sx={{ fontSize: 40 }} />,
      title: '高性能计算',
      description: '并行计算框架，多核优化',
      modules: ['LinearSolvers', 'MeshMoving', 'Mapping'],
      progress: 95,
      color: 'success'
    },
    {
      icon: <Science sx={{ fontSize: 40 }} />,
      title: '多物理场耦合',
      description: '流固耦合、渗流结构耦合分析',
      modules: ['FSI', 'ConvectionDiffusion', 'ContactMechanics'],
      progress: 90,
      color: 'secondary'
    },
    {
      icon: <Security sx={{ fontSize: 40 }} />,
      title: '工程级可靠',
      description: '严格验证，符合国际标准',
      modules: ['Validation', 'Verification', 'Documentation'],
      progress: 100,
      color: 'warning'
    }
  ];

  // 计算引擎状态
  const engineStatus = [
    { name: 'Kratos核心', status: '已编译', progress: 100, color: 'success' },
    { name: '地质力学模块', status: '可用', progress: 100, color: 'success' },
    { name: '多孔介质模块', status: '可用', progress: 100, color: 'success' },
    { name: '结构力学模块', status: '可用', progress: 100, color: 'success' },
    { name: '流体力学模块', status: '可用', progress: 100, color: 'success' },
    { name: '扩展模块', status: '编译中', progress: 85, color: 'warning' }
  ];

  // 技术优势
  const technicalAdvantages = [
    '基于C++内核，Python接口',
    '支持大规模并行计算',
    '丰富的本构模型库',
    '自适应网格细化',
    '多种求解器算法',
    '完整的前后处理'
  ];

  return (
    <Box sx={{ py: 6 }}>
      {/* 标题部分 */}
      <Box textAlign="center" sx={{ mb: 6 }}>
        <Typography 
          variant="h3" 
          component="h2" 
          gutterBottom
          sx={{ 
            fontWeight: 700,
            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 2
          }}
        >
          FEM有限元计算引擎
        </Typography>
        <Typography 
          variant="h6" 
          color="text.secondary"
          sx={{ maxWidth: 600, mx: 'auto', mb: 4 }}
        >
          基于Kratos Multi-Physics框架，提供工程级FEM分析能力
        </Typography>
      </Box>

      {/* FEM特性卡片 */}
      <Grid container spacing={3} sx={{ mb: 6 }}>
        {femFeatures.map((feature, index) => (
          <Grid item xs={12} md={6} lg={3} key={feature.title}>
            <Fade in timeout={1000 + index * 200}>
              <Card 
                elevation={2}
                sx={{ 
                  height: '100%',
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
                    <Avatar 
                      sx={{ 
                        bgcolor: `${feature.color}.light`,
                        color: `${feature.color}.main`,
                        mr: 2
                      }}
                    >
                      {feature.icon}
                    </Avatar>
                    <Box flex={1}>
                      <Typography variant="h6" gutterBottom>
                        {feature.title}
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={feature.progress}
                        color={feature.color as any}
                        sx={{ height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {feature.progress}% 完成
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Typography 
                    variant="body2" 
                    color="text.secondary"
                    sx={{ mb: 2 }}
                  >
                    {feature.description}
                  </Typography>
                  
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {feature.modules.map((module) => (
                      <Chip
                        key={module}
                        label={module}
                        size="small"
                        variant="outlined"
                        color={feature.color as any}
                      />
                    ))}
                  </Stack>
                </CardContent>
              </Card>
            </Fade>
          </Grid>
        ))}
      </Grid>

      {/* 计算引擎状态 */}
      <Grid container spacing={4}>
        <Grid item xs={12} lg={6}>
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
                <Analytics color="primary" sx={{ mr: 2 }} />
                <Typography variant="h6">计算引擎状态</Typography>
              </Box>
              
              <Stack spacing={2}>
                {engineStatus.map((engine, index) => (
                  <Box key={engine.name}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                      <Typography variant="body2">{engine.name}</Typography>
                      <Chip 
                        label={engine.status}
                        size="small"
                        color={engine.color as any}
                        variant="outlined"
                      />
                    </Box>
                    <LinearProgress 
                      variant="determinate"
                      value={engine.progress}
                      color={engine.color as any}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ display: 'block', textAlign: 'right', mt: 0.5 }}
                    >
                      {engine.progress}%
                    </Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} lg={6}>
          <Card elevation={1}>
            <CardContent sx={{ p: 3 }}>
              <Box display="flex" alignItems="center" sx={{ mb: 3 }}>
                <TrendingUp color="secondary" sx={{ mr: 2 }} />
                <Typography variant="h6">技术优势</Typography>
              </Box>
              
              <Grid container spacing={2}>
                {technicalAdvantages.map((advantage, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Box display="flex" alignItems="center">
                      <Box 
                        sx={{ 
                          width: 8, 
                          height: 8, 
                          borderRadius: '50%',
                          bgcolor: 'secondary.main',
                          mr: 2,
                          flexShrink: 0
                        }} 
                      />
                      <Typography variant="body2" color="text.secondary">
                        {advantage}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 底部说明 */}
      <Box textAlign="center" sx={{ mt: 6 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Deep Excavation CAE系统完全基于FEM技术构建
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Three.js/OCC → Netgen → Kratos → Trame → 物理AI 完整技术栈
        </Typography>
      </Box>
    </Box>
  );
};

export default FEMWelcomeSection;
