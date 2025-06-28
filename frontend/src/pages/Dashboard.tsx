import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Box, 
  Paper, 
  Typography, 
  Grid, 
  Card, 
  CardActionArea, 
  CardContent, 
  CardMedia,
  Divider,
  Button,
  Stack,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemAvatar,
  Avatar,
  LinearProgress,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  useTheme,
  Skeleton,
  Alert
} from '@mui/material';
import {
  AddCircleOutline,
  TipsAndUpdates,
  Terrain,
  Construction,
  StraightenOutlined, 
  AccountTree,
  Science,
  BarChart,
  Event,
  MoreVert,
  ArrowRightAlt,
  Favorite
} from '@mui/icons-material';
import { projectApi } from '../services/api';
import { Project } from '../models/types';
import { useAlert } from '../components/common/AlertProvider';

interface ProjectStatistics {
  elements: number;
  nodes: number;
  stages: number;
  computeTime: number;
}

interface ProjectInfo {
  id: string;
  name: string;
  description: string;
  created: string;
  modified: string;
  statistics?: ProjectStatistics;
}

const Dashboard: React.FC = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const { showError } = useAlert();
  
  // 状态
  const [loading, setLoading] = useState<boolean>(true);
  const [recentProjects, setRecentProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<ProjectInfo | null>(null);
  
  // 示例新闻和更新
  const newsAndUpdates = [
    { id: 1, title: '新版本 v1.1.0 发布', date: '2023-09-20', type: '系统更新' },
    { id: 2, title: '新增基于AI的土体参数反演功能', date: '2023-09-15', type: '功能更新' },
    { id: 3, title: '深基坑CAE系统培训会议', date: '2023-10-05', type: '活动' },
  ];

  const moduleCards = [
    { 
      id: 'terrain', 
      title: '土体建模', 
      description: '定义土体几何和物理参数', 
      icon: <Terrain fontSize="large" />,
      color: theme.palette.primary.main,
      path: '/terrain'
    },
    { 
      id: 'excavation', 
      title: '基坑建模', 
      description: '设计基坑几何形状和支护结构', 
      icon: <Construction fontSize="large" />,
      color: theme.palette.secondary.main,
      path: '/excavation-analysis'
    },
    { 
      id: 'tunnel', 
      title: '隧道建模', 
      description: '创建隧道及其相关结构', 
      icon: <StraightenOutlined fontSize="large" />,
      color: '#ff9800',
      path: '/tunnel-modeling'
    },
    { 
      id: 'mesh', 
      title: '网格划分', 
      description: '生成高质量有限元网格', 
      icon: <AccountTree fontSize="large" />,
      color: '#2196f3',
      path: '/meshing'
    },
    { 
      id: 'compute', 
      title: '计算分析', 
      description: '进行各类型计算和分析', 
      icon: <Science fontSize="large" />,
      color: '#9c27b0',
      path: '/computation'
    },
    { 
      id: 'results', 
      title: '结果可视化', 
      description: '查看和分析计算结果', 
      icon: <BarChart fontSize="large" />,
      color: '#4caf50',
      path: '/results'
    },
  ];
  
  // 加载最近的项目
  useEffect(() => {
    const fetchRecentProjects = async () => {
      try {
        setLoading(true);
        const projects = await projectApi.getRecentProjects(5);
        setRecentProjects(projects);
        
        // 如果有项目，设置第一个为当前项目
        if (projects.length > 0) {
          const project = projects[0];
          setCurrentProject({
            id: project.id.toString(),
            name: project.name,
            description: project.description,
            created: project.created_at,
            modified: project.updated_at,
            statistics: {
              elements: project.metadata?.domain?.volume || 0,
              nodes: project.metadata?.layers?.length || 0,
              stages: project.metadata?.stages?.length || 0,
              computeTime: 0
            }
          });
        } else {
          // 如果没有项目，设置为示例项目
          setCurrentProject({
            id: '1',
            name: '示例项目',
            description: '这是一个示例项目，请创建或选择一个项目继续',
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
            statistics: {
              elements: 0,
              nodes: 0,
              stages: 0,
              computeTime: 0
            }
          });
        }
      } catch (error) {
        console.error('加载最近项目失败:', error);
        showError('加载项目数据失败');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecentProjects();
  }, [showError]);
  
  // 处理新建项目
  const handleCreateProject = () => {
    navigate('/projects');
  };
  
  // 处理打开项目
  const handleOpenProject = (projectId?: string) => {
    if (projectId) {
      navigate(`/projects?id=${projectId}`);
    } else {
      navigate('/projects');
    }
  };
  
  // 处理导出项目
  const handleExportProject = (projectId?: string) => {
    if (!projectId) return;
    // TODO: 实现项目导出功能
  };
  
  // 处理分享项目
  const handleShareProject = (projectId?: string) => {
    if (!projectId) return;
    // TODO: 实现项目分享功能
  };
  
  // 处理模块导航
  const handleNavigateToModule = (moduleId: string, path: string) => {
    const projectId = currentProject?.id;
    if (projectId && projectId !== '1') {
      navigate(`${path}/${projectId}`);
    } else {
      // 如果没有当前项目，先导航到项目管理页面
      navigate('/projects');
    }
  };

  return (
    <Box sx={{ p: 3, flexGrow: 1, overflow: 'auto' }}>
      {/* 欢迎区和项目信息 */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" gutterBottom>
              欢迎使用深基坑CAE系统
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              一个专业的深基坑工程建模、计算和分析系统
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddCircleOutline />}
            onClick={handleCreateProject}
          >
            新建项目
          </Button>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        {loading ? (
          <Box>
            <Skeleton variant="text" sx={{ fontSize: '2rem', width: '40%', mb: 1 }} />
            <Skeleton variant="text" sx={{ fontSize: '1rem', width: '60%', mb: 2 }} />
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  {[1, 2, 3, 4].map((item) => (
                    <Grid item xs={6} sm={3} key={item}>
                      <Skeleton variant="rectangular" height={60} />
                    </Grid>
                  ))}
                </Grid>
              </Grid>
              <Grid item xs={12} md={4}>
                <Skeleton variant="rectangular" height={60} />
              </Grid>
            </Grid>
          </Box>
        ) : currentProject ? (
          <Box>
            <Typography variant="h6" gutterBottom>
              当前项目: {currentProject.name}
            </Typography>
            <Typography variant="body2" paragraph>
              {currentProject.description}
            </Typography>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="caption" color="text.secondary">单元数</Typography>
                      <Typography variant="h6">{currentProject.statistics?.elements.toLocaleString()}</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="caption" color="text.secondary">节点数</Typography>
                      <Typography variant="h6">{currentProject.statistics?.nodes.toLocaleString()}</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="caption" color="text.secondary">施工阶段</Typography>
                      <Typography variant="h6">{currentProject.statistics?.stages}</Typography>
                    </Card>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Card variant="outlined" sx={{ textAlign: 'center', p: 1 }}>
                      <Typography variant="caption" color="text.secondary">计算时间</Typography>
                      <Typography variant="h6">{currentProject.statistics?.computeTime}秒</Typography>
                    </Card>
                  </Grid>
                </Grid>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', height: '100%' }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      创建时间: {new Date(currentProject.created).toLocaleDateString()}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      最后修改: {new Date(currentProject.modified).toLocaleDateString()}
                    </Typography>
                  </Box>
                  <Stack direction="row" spacing={1}>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleOpenProject(currentProject.id)}
                    >
                      打开
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleExportProject(currentProject.id)}
                    >
                      导出
                    </Button>
                    <Button 
                      variant="outlined" 
                      size="small"
                      onClick={() => handleShareProject(currentProject.id)}
                    >
                      分享
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Alert severity="info">
            没有找到项目。请创建一个新项目开始使用。
          </Alert>
        )}
      </Paper>
      
      {/* 功能模块快速入口 */}
      <Typography variant="h5" gutterBottom>
        功能模块
      </Typography>
      
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {moduleCards.map((module) => (
          <Grid item xs={12} sm={6} md={4} key={module.id}>
            <Card sx={{ height: '100%' }}>
              <CardActionArea 
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
                onClick={() => handleNavigateToModule(module.id, module.path)}
              >
                <CardContent sx={{ width: '100%' }}>
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    mb: 2 
                  }}>
                    <Avatar sx={{ 
                      bgcolor: module.color, 
                      color: '#fff', 
                      width: 56, 
                      height: 56,
                      mr: 2
                    }}>
                      {module.icon}
                    </Avatar>
                    <Typography variant="h5" component="div">
                      {module.title}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {module.description}
                  </Typography>
                </CardContent>
                <Box sx={{ 
                  mt: 'auto', 
                  width: '100%', 
                  display: 'flex', 
                  justifyContent: 'flex-end',
                  pr: 2,
                  pb: 1
                }}>
                  <ArrowRightAlt />
                </Box>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      {/* 系统动态和新闻 */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">系统动态</Typography>
              <IconButton size="small">
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
            <List>
              {newsAndUpdates.map((item) => (
                <ListItem key={item.id} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {item.type === '系统更新' && <TipsAndUpdates />}
                      {item.type === '功能更新' && <Favorite />}
                      {item.type === '活动' && <Event />}
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText 
                    primary={item.title}
                    secondary={`${item.date} · ${item.type}`}
                  />
                  <ListItemSecondaryAction>
                    <Chip 
                      label="新" 
                      size="small" 
                      color={
                        item.type === '系统更新' ? 'primary' : 
                        item.type === '功能更新' ? 'secondary' : 'default'
                      } 
                    />
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button>查看更多</Button>
            </Box>
          </Paper>
        </Grid>
        
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom>
              项目列表
            </Typography>
            {loading ? (
              <List>
                {[1, 2, 3, 4, 5].map((item) => (
                  <ListItem key={item} divider>
                    <Skeleton variant="rectangular" width="100%" height={40} />
                  </ListItem>
                ))}
              </List>
            ) : recentProjects.length > 0 ? (
              <List>
                {recentProjects.map((project) => (
                  <ListItem 
                    key={project.id} 
                    divider
                    button
                    onClick={() => handleOpenProject(project.id.toString())}
                  >
                    <ListItemText 
                      primary={project.name}
                      secondary={`创建于 ${new Date(project.created_at).toLocaleDateString()}`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton edge="end" aria-label="more">
                        <MoreVert />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Alert severity="info" sx={{ mt: 2 }}>
                没有最近的项目
              </Alert>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Button onClick={() => navigate('/projects')}>查看全部项目</Button>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard; 