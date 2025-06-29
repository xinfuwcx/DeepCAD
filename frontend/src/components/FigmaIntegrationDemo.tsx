/**
 * @file FigmaIntegrationDemo.tsx
 * @description Figma集成使用示例
 * @author Deep Excavation Team
 */

import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Stack,
  Avatar,
  Divider,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useFigmaTheme } from './theme/FigmaThemeProvider';
import FigmaSync from './theme/FigmaSync';

// 使用设计令牌的样式化组件
const StyledCard = styled(Card)(({ theme }) => ({
  background: 'linear-gradient(135deg, var(--color-primary, #1976d2) 0%, var(--color-primary-dark, #1565c0) 100%)',
  color: 'white',
  borderRadius: 'var(--border-radius, 16px)',
  padding: 'var(--spacing-lg, 24px)',
  boxShadow: 'var(--shadow-elevated, 0 8px 32px rgba(0,0,0,0.12))',
  transition: 'transform 0.2s ease-in-out',
  '&:hover': {
    transform: 'translateY(-4px)',
  },
}));

const TokenShowcase = styled(Box)(({ theme }) => ({
  padding: 'var(--spacing-base, 16px)',
  backgroundColor: 'var(--color-surface, #f5f5f5)',
  borderRadius: 'var(--border-radius, 8px)',
  border: '1px solid var(--color-border, #e0e0e0)',
  marginBottom: 'var(--spacing-base, 16px)',
}));

const ColorSwatch = styled(Box)<{ color: string }>(({ color }) => ({
  width: 40,
  height: 40,
  backgroundColor: color,
  borderRadius: '50%',
  border: '2px solid white',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  margin: '4px',
}));

export const FigmaIntegrationDemo: React.FC = () => {
  const { tokens, refreshTheme, isLoading, lastSync } = useFigmaTheme();

  // 模拟设计令牌数据（实际使用中会从Figma同步）
  const demoTokens = {
    colors: {
      primary: '#1976d2',
      secondary: '#dc004e',
      success: '#4caf50',
      warning: '#ff9800',
      error: '#f44336',
      'primary-light': '#42a5f5',
      'primary-dark': '#1565c0',
    },
    typography: {
      h1: { fontSize: '2.125rem', fontWeight: 300 },
      h2: { fontSize: '1.5rem', fontWeight: 400 },
      body: { fontSize: '1rem', fontWeight: 400 },
    },
    spacing: {
      xs: '4px',
      sm: '8px',
      base: '16px',
      lg: '24px',
      xl: '32px',
    },
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          🎨 Figma 设计系统集成示例
        </Typography>
        <FigmaSync />
      </Stack>

      <Grid container spacing={3}>
        {/* 设计令牌展示 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                设计令牌 (Design Tokens)
              </Typography>
              
              {/* 颜色令牌 */}
              <TokenShowcase>
                <Typography variant="h6" gutterBottom>
                  颜色系统
                </Typography>
                <Box display="flex" flexWrap="wrap" gap={1}>
                  {Object.entries(demoTokens.colors).map(([name, color]) => (
                    <Box key={name} display="flex" flexDirection="column" alignItems="center">
                      <ColorSwatch color={color} />
                      <Typography variant="caption" sx={{ textAlign: 'center', mt: 0.5 }}>
                        {name}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </TokenShowcase>

              {/* 字体令牌 */}
              <TokenShowcase>
                <Typography variant="h6" gutterBottom>
                  字体系统
                </Typography>
                {Object.entries(demoTokens.typography).map(([name, style]) => (
                  <Typography
                    key={name}
                    sx={{
                      fontSize: style.fontSize,
                      fontWeight: style.fontWeight,
                      mb: 1,
                    }}
                  >
                    {name}: 深基坑工程分析系统
                  </Typography>
                ))}
              </TokenShowcase>

              {/* 间距令牌 */}
              <TokenShowcase>
                <Typography variant="h6" gutterBottom>
                  间距系统
                </Typography>
                <Stack spacing={1}>
                  {Object.entries(demoTokens.spacing).map(([name, value]) => (
                    <Box key={name} display="flex" alignItems="center" gap={2}>
                      <Typography variant="body2" sx={{ minWidth: 60 }}>
                        {name}:
                      </Typography>
                      <Box
                        sx={{
                          width: value,
                          height: '16px',
                          backgroundColor: 'primary.main',
                          borderRadius: 1,
                        }}
                      />
                      <Typography variant="caption" color="textSecondary">
                        {value}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </TokenShowcase>
            </CardContent>
          </Card>
        </Grid>

        {/* 组件展示 */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                自动生成的组件
              </Typography>

              {/* 按钮变体 */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  按钮组件
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap" gap={2}>
                  <Button variant="contained" color="primary">
                    主要按钮
                  </Button>
                  <Button variant="outlined" color="primary">
                    边框按钮
                  </Button>
                  <Button variant="text" color="primary">
                    文本按钮
                  </Button>
                  <Button variant="contained" color="secondary">
                    次要按钮
                  </Button>
                </Stack>
              </Box>

              {/* 卡片变体 */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  卡片组件
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6">标准卡片</Typography>
                        <Typography variant="body2" color="textSecondary">
                          使用 Figma 设计令牌的标准卡片样式
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={6}>
                    <StyledCard>
                      <Typography variant="h6">自定义卡片</Typography>
                      <Typography variant="body2">
                        使用 CSS 变量和设计令牌的自定义样式
                      </Typography>
                    </StyledCard>
                  </Grid>
                </Grid>
              </Box>

              {/* 状态指示器 */}
              <Box mb={3}>
                <Typography variant="h6" gutterBottom>
                  状态组件
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                  <Chip label="成功" color="success" />
                  <Chip label="警告" color="warning" />
                  <Chip label="错误" color="error" />
                  <Chip label="信息" color="info" />
                  <Chip label="默认" color="default" />
                </Stack>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* 集成状态 */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h5" gutterBottom>
                集成状态
              </Typography>
              
              <Grid container spacing={3}>
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'success.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                      🎨
                    </Avatar>
                    <Typography variant="h6">设计令牌</Typography>
                    <Typography variant="body2" color="textSecondary">
                      {Object.keys(tokens).length > 0 ? '已同步' : '未同步'}
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'info.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                      🔧
                    </Avatar>
                    <Typography variant="h6">组件生成</Typography>
                    <Typography variant="body2" color="textSecondary">
                      自动生成中
                    </Typography>
                  </Box>
                </Grid>
                
                <Grid item xs={12} md={4}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'warning.main', width: 56, height: 56, mx: 'auto', mb: 2 }}>
                      📚
                    </Avatar>
                    <Typography variant="h6">文档同步</Typography>
                    <Typography variant="body2" color="textSecondary">
                      Storybook 就绪
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              <Divider sx={{ my: 3 }} />

              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="body2" color="textSecondary">
                    最后同步: {lastSync ? lastSync.toLocaleString() : '从未同步'}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    状态: {isLoading ? '同步中...' : '就绪'}
                  </Typography>
                </Box>
                
                <Button
                  variant="outlined"
                  onClick={refreshTheme}
                  disabled={isLoading}
                >
                  刷新主题
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 使用指南 */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            如何使用 Figma 集成
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                1. 配置 API
              </Typography>
              <Typography variant="body2" paragraph>
                在 .env 文件中设置 FIGMA_ACCESS_TOKEN 和 FIGMA_FILE_ID
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                2. 运行同步
              </Typography>
              <Typography variant="body2" paragraph>
                执行 <code>npm run figma:sync</code> 来同步设计系统
              </Typography>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="h6" gutterBottom>
                3. 使用令牌
              </Typography>
              <Typography variant="body2" paragraph>
                在 CSS 中使用 <code>var(--color-primary)</code> 或在 JS 中导入 tokens
              </Typography>
              
              <Typography variant="h6" gutterBottom>
                4. 使用组件
              </Typography>
              <Typography variant="body2" paragraph>
                导入生成的组件: <code>import {'{ Button }'} from './figma-generated'</code>
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default FigmaIntegrationDemo;
