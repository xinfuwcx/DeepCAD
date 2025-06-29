/**
 * @file WelcomePage.tsx
 * @description 新版深基坑分析系统欢迎页面 - 集成所有令人惊艳的UI组件
 * @author Deep Excavation Team
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  Fab,
  Dialog,
  useTheme,
  alpha,
  Stack
} from '@mui/material';
import { styled, keyframes } from '@mui/material/styles';
import {
  PlayArrow,
  ViewInAr,
  SmartToy,
  Engineering,
  AutoAwesome,
  RocketLaunch
} from '@mui/icons-material';

// 导入我们的令人惊艳的组件
import FEMWelcomeSection from '../components/welcome/FEMWelcomeSection';

interface WelcomePageProps {
  onProjectSelected?: (projectId: string) => void;
}

// 动画效果
const floatAnimation = keyframes`
  0%, 100% { transform: translateY(0px) rotate(0deg); }
  50% { transform: translateY(-20px) rotate(1deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 20px rgba(66, 165, 245, 0.3); }
  50% { box-shadow: 0 0 40px rgba(66, 165, 245, 0.8); }
`;

// 样式化组件
const HeroSection = styled(Box)(({ theme }) => ({
  background: `linear-gradient(135deg, 
    ${alpha(theme.palette.primary.main, 0.1)} 0%, 
    ${alpha(theme.palette.secondary.main, 0.1)} 100%
  )`,
  minHeight: '100vh',
  position: 'relative',
  overflow: 'hidden',
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: `radial-gradient(circle at 20% 20%, ${alpha(theme.palette.primary.main, 0.1)}, transparent 50%),
                 radial-gradient(circle at 80% 80%, ${alpha(theme.palette.secondary.main, 0.1)}, transparent 50%)`,
    animation: `${floatAnimation} 10s ease-in-out infinite`,
  }
}));

const FloatingCard = styled(Card)(({ theme }) => ({
  backdropFilter: 'blur(20px)',
  background: alpha(theme.palette.background.paper, 0.8),
  border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
  animation: `${pulseGlow} 3s ease-in-out infinite`,
  '&:hover': {
    transform: 'translateY(-10px) scale(1.02)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  }
}));

const WelcomePage: React.FC<WelcomePageProps> = ({ onProjectSelected }) => {
  const navigate = useNavigate();
  const theme = useTheme();

  // Dialog状态管理
  const [holographicOpen, setHolographicOpen] = useState(false);
  const [aiAssistantOpen, setAiAssistantOpen] = useState(false);
  const [parameterSphereOpen, setParameterSphereOpen] = useState(false);
  const [figmaShowcaseOpen, setFigmaShowcaseOpen] = useState(false);
  const [femPanelOpen, setFemPanelOpen] = useState(false);

  // 导航处理
  const handleProjectSelected = (projectId: string) => {
    if (onProjectSelected) {
      onProjectSelected(projectId);
    } else {
      navigate(`/excavation-analysis/${projectId}`);
    }
  };

  const handleCreateNewProject = () => {
    navigate('/projects');
  };

  const handleExploreDemo = () => {
    navigate('/modeling-demo');
  };

  return (
    <Box>
      {/* 主要欢迎区域 */}
        <HeroSection>
          <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 2 }}>
            {/* 顶部标题区域 */}
            <Box textAlign="center" pt={8} pb={4}>
              <Typography
                variant="h1"
                component="h1"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2.5rem', md: '4rem', lg: '5rem' },
                  background: 'linear-gradient(45deg, #1976d2, #42a5f5, #dc004e)',
                  backgroundSize: '200% 200%',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  animation: `${floatAnimation} 6s ease-in-out infinite`,
                  mb: 2
                }}
              >
                Deep Excavation CAE
              </Typography>
              
              <Typography
                variant="h4"
                color="text.secondary"
                sx={{
                  fontWeight: 300,
                  maxWidth: 800,
                  mx: 'auto',
                  mb: 6,
                  opacity: 0.9
                }}
              >
                革命性深基坑分析系统 · FEM有限元计算 · 全息投影界面
              </Typography>

              {/* 快速操作按钮 */}
              <Stack direction="row" spacing={3} justifyContent="center" sx={{ mb: 8 }}>
                <Button
                  variant="contained"
                  size="large"
                  startIcon={<RocketLaunch />}
                  onClick={handleCreateNewProject}
                  sx={{
                    borderRadius: '50px',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                    '&:hover': {
                      background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 8px 25px rgba(25, 118, 210, 0.3)'
                    }
                  }}
                >
                  开始新项目
                </Button>
                
                <Button
                  variant="outlined"
                  size="large"
                  startIcon={<ViewInAr />}
                  onClick={handleExploreDemo}
                  sx={{
                    borderRadius: '50px',
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderColor: 'primary.main',
                    '&:hover': {
                      borderColor: 'primary.dark',
                      background: alpha(theme.palette.primary.main, 0.1),
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  体验演示
                </Button>
              </Stack>
            </Box>

            {/* FEM技术特性展示区域 */}
            <FEMWelcomeSection onGetStarted={handleCreateNewProject} />

            {/* 技术栈展示 */}
            <Box sx={{ py: 8 }}>
              <Typography
                variant="h3"
                textAlign="center"
                sx={{
                  mb: 6,
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #dc004e, #42a5f5)',
                  backgroundClip: 'text',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}
              >
                革命性技术栈
              </Typography>

              <Grid container spacing={4} justifyContent="center">
                <Grid item xs={12} md={6} lg={4}>
                  <FloatingCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <Engineering sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                      <Typography variant="h5" gutterBottom>
                        Kratos Multi-Physics
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        11个专业模块的FEM计算引擎，工程级可靠性
                      </Typography>
                      <Button variant="contained" fullWidth>
                        了解更多
                      </Button>
                    </CardContent>
                  </FloatingCard>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <FloatingCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <ViewInAr sx={{ fontSize: 60, color: 'secondary.main', mb: 2 }} />
                      <Typography variant="h5" gutterBottom>
                        全息投影UI
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        未来科技感界面，令人惊艳的视觉体验
                      </Typography>
                      <Button variant="contained" color="secondary" fullWidth>
                        体验界面
                      </Button>
                    </CardContent>
                  </FloatingCard>
                </Grid>

                <Grid item xs={12} md={6} lg={4}>
                  <FloatingCard>
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                      <SmartToy sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                      <Typography variant="h5" gutterBottom>
                        AI工程师助手
                      </Typography>
                      <Typography color="text.secondary" sx={{ mb: 3 }}>
                        智能参数优化，专业工程建议
                      </Typography>
                      <Button variant="contained" color="success" fullWidth>
                        启动AI助手
                      </Button>
                    </CardContent>
                  </FloatingCard>
                </Grid>
              </Grid>
            </Box>
          </Container>

          {/* 悬浮操作按钮 */}
          <Fab
            color="primary"
            size="large"
            sx={{
              position: 'fixed',
              bottom: 32,
              right: 32,
              zIndex: 1000,
              animation: `${pulseGlow} 2s ease-in-out infinite`
            }}
            onClick={handleExploreDemo}
          >
            <PlayArrow />
          </Fab>
        </HeroSection>

        {/* 全息主界面Dialog */}
        <Dialog 
          open={holographicOpen} 
          onClose={() => setHolographicOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          {/* 这里可以放置HolographicMainInterface组件 */}
        </Dialog>

        {/* AI工程师助手Dialog */}
        <Dialog 
          open={aiAssistantOpen} 
          onClose={() => setAiAssistantOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          {/* 这里可以放置AIEngineerAssistant组件 */}
        </Dialog>

        {/* 3D参数球体Dialog */}
        <Dialog 
          open={parameterSphereOpen} 
          onClose={() => setParameterSphereOpen(false)}
          maxWidth="md"
          fullWidth
        >
          {/* 这里可以放置Interactive3DParameterSphere组件 */}
        </Dialog>

        {/* Figma集成展示Dialog */}
        <Dialog 
          open={figmaShowcaseOpen} 
          onClose={() => setFigmaShowcaseOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          {/* 这里可以放置FigmaIntegrationShowcase组件 */}
        </Dialog>

        {/* FEM参数面板Dialog */}
        <Dialog 
          open={femPanelOpen} 
          onClose={() => setFemPanelOpen(false)}
          maxWidth="xl"
          fullWidth
        >
          {/* 这里可以放置FEMParameterPanel组件 */}
        </Dialog>
      </Box>
  );
};

export default WelcomePage;
