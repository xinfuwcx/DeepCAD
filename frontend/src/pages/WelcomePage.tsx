import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  CardActions,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  useTheme,
  Divider,
  Stack
} from '@mui/material';
import { 
  AddCircleOutline, 
  FolderOpen, 
  History, 
  Construction, 
  Science, 
  BarChart,
  AccountTreeOutlined
} from '@mui/icons-material';
import Logo from '../components/layout/Logo';

interface RecentProject {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  thumbnail: string;
}

const WelcomePage: React.FC<{ onProjectSelected: (projectId: string) => void }> = ({ onProjectSelected }) => {
  const theme = useTheme();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNewProject, setOpenNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');

  // 模拟从API加载最近的项目
  useEffect(() => {
    const fetchRecentProjects = async () => {
      // 这里应该是实际的API调用
      setTimeout(() => {
        setRecentProjects([
          {
            id: '1',
            name: '某城市地铁车站基坑工程',
            description: '深度18m，宽25m的矩形基坑',
            lastModified: '2023-09-15',
            thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect fill="%23f0f0f0" width="200" height="120"/><text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">基坑缩略图</text></svg>'
          },
          {
            id: '2',
            name: '高层建筑地下室基坑',
            description: '深度15m，不规则形状基坑',
            lastModified: '2023-08-22',
            thumbnail: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="120" viewBox="0 0 200 120"><rect fill="%23f0f0f0" width="200" height="120"/><text x="50%" y="50%" font-family="Arial" font-size="14" text-anchor="middle" dominant-baseline="middle" fill="%23999">基坑缩略图</text></svg>'
          }
        ]);
        setLoading(false);
      }, 800);
    };

    fetchRecentProjects();
  }, []);

  const handleNewProject = () => {
    setOpenNewProject(true);
  };

  const handleCreateProject = () => {
    // 在这里执行创建新项目的逻辑
    // 然后导航到主界面
    setOpenNewProject(false);
    onProjectSelected('new');
  };

  const handleOpenProject = (projectId: string) => {
    onProjectSelected(projectId);
  };

  return (
    <Box 
      sx={{ 
        height: '100vh', 
        display: 'flex', 
        flexDirection: 'column',
        backgroundColor: theme.palette.background.default
      }}
    >
      {/* 顶部欢迎区 */}
      <Box 
        sx={{ 
          p: 4, 
          display: 'flex', 
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: theme.palette.background.paper,
          boxShadow: 1
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', mb: { xs: 2, md: 0 } }}>
          <Logo size="large" />
        </Box>
        <Box>
          <Button 
            variant="contained" 
            startIcon={<AddCircleOutline />} 
            sx={{ mr: 2 }}
            onClick={handleNewProject}
          >
            新建项目
          </Button>
          <Button 
            variant="outlined" 
            startIcon={<FolderOpen />}
            onClick={() => onProjectSelected('browse')}
          >
            浏览项目
          </Button>
        </Box>
      </Box>

      {/* 主要内容区 */}
      <Grid container spacing={4} sx={{ p: 4, flexGrow: 1 }}>
        {/* 左侧最近项目 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              最近的项目
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={3}>
                {recentProjects.length > 0 ? (
                  recentProjects.map((project) => (
                    <Grid item xs={12} sm={6} key={project.id}>
                      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ height: 120, overflow: 'hidden', display: 'flex', justifyContent: 'center', backgroundColor: '#f0f0f0' }}>
                          <img 
                            src={project.thumbnail} 
                            alt={project.name}
                            style={{ maxWidth: '100%', height: 'auto', objectFit: 'cover' }}
                          />
                        </Box>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Typography variant="h6" gutterBottom>
                            {project.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {project.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                            最后修改: {project.lastModified}
                          </Typography>
                        </CardContent>
                        <CardActions>
                          <Button size="small" onClick={() => handleOpenProject(project.id)}>
                            打开项目
                          </Button>
                          <Button size="small" color="secondary">
                            查看详情
                          </Button>
                        </CardActions>
                      </Card>
                    </Grid>
                  ))
                ) : (
                  <Grid item xs={12}>
                    <Box sx={{ p: 4, textAlign: 'center' }}>
                      <History sx={{ fontSize: 40, color: 'text.secondary', mb: 2 }} />
                      <Typography color="text.secondary">
                        没有最近的项目，开始创建一个新项目吧
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            )}
          </Paper>
        </Grid>
        
        {/* 右侧功能区 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h5" gutterBottom>
              系统功能
            </Typography>
            <Divider sx={{ mb: 3 }} />
            
            <Stack spacing={2}>
              <Card sx={{ p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                  <Construction sx={{ color: theme.palette.primary.main, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">建模</Typography>
                    <Typography variant="body2" color="text.secondary">
                      土层、基坑、隧道和支护结构建模
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card sx={{ p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                  <AccountTreeOutlined sx={{ color: theme.palette.primary.main, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">网格</Typography>
                    <Typography variant="body2" color="text.secondary">
                      高质量有限元网格划分
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card sx={{ p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                  <Science sx={{ color: theme.palette.primary.main, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">计算</Typography>
                    <Typography variant="body2" color="text.secondary">
                      多种计算引擎和本构模型
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
              
              <Card sx={{ p: 1 }}>
                <CardContent sx={{ display: 'flex', alignItems: 'center', py: 1 }}>
                  <BarChart sx={{ color: theme.palette.primary.main, mr: 2 }} />
                  <Box>
                    <Typography variant="h6">可视化</Typography>
                    <Typography variant="body2" color="text.secondary">
                      丰富的结果显示和云图功能
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* 页脚 */}
      <Box
        component="footer"
        sx={{
          py: 2,
          mt: 'auto',
          backgroundColor: theme.palette.background.paper,
          borderTop: `1px solid ${theme.palette.divider}`,
          textAlign: 'center'
        }}
      >
        <Typography variant="body2" color="text.secondary">
          深基坑CAE系统 v1.0.0 © 2023-2025 深基坑CAE系统开发团队
        </Typography>
      </Box>

      {/* 新建项目对话框 */}
      <Dialog open={openNewProject} onClose={() => setOpenNewProject(false)}>
        <DialogTitle>创建新项目</DialogTitle>
        <DialogContent sx={{ minWidth: 400 }}>
          <TextField
            autoFocus
            margin="dense"
            id="name"
            label="项目名称"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
          />
          <TextField
            margin="dense"
            id="description"
            label="项目描述"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenNewProject(false)}>取消</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained"
            disabled={!newProjectName.trim()}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WelcomePage; 