import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  Box,
  Card,
  CardContent,
  CardActions,
  CardMedia,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
  Chip,
  Avatar,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Alert,
  CircularProgress,
  Menu,
  Tabs,
  Tab,
  FormControlLabel,
  Switch,
  SelectChangeEvent
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FileCopy as FileCopyIcon,
  MoreVert as MoreVertIcon,
  Folder as FolderIcon,
  Engineering as EngineeringIcon,
  Build as BuildIcon,
  ViewInAr as ViewInArIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Archive as ArchiveIcon,
  Visibility as VisibilityIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { projectApi, dataApi } from '../services/api';
import { Project, ProjectStatus } from '../models/types';
import { useAlert } from '../components/common/AlertProvider';
import { useAuth } from '../components/auth/AuthContext';

// 扩展Project类型，添加前端需要的属性
interface ExtendedProject extends Project {
  type?: string;
  owner?: {
    id: number;
    username: string;
    email: string;
  };
  thumbnail?: string;
}

// 项目类型
type ProjectType = 'EXCAVATION' | 'TUNNEL' | 'FOUNDATION';

// 项目类型选项
const projectTypeOptions: { value: ProjectType; label: string; icon: React.ReactNode }[] = [
  { value: 'EXCAVATION', label: '基坑工程', icon: <EngineeringIcon /> },
  { value: 'TUNNEL', label: '隧道工程', icon: <BuildIcon /> },
  { value: 'FOUNDATION', label: '地基基础', icon: <ViewInArIcon /> }
];

/**
 * 项目管理页面
 * 用于管理用户的项目列表和项目详情
 */
const ProjectManagement: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, showLoading, hideLoading } = useAlert();
  const { user } = useAuth();
  
  // 获取URL中的项目ID
  const queryParams = new URLSearchParams(location.search);
  const selectedProjectId = queryParams.get('id');
  
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [projects, setProjects] = useState<ExtendedProject[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<ExtendedProject[]>([]);
  const [selectedTab, setSelectedTab] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedProjectType, setSelectedProjectType] = useState<ProjectType | 'ALL'>('ALL');
  
  // 新建项目对话框
  const [newProjectDialogOpen, setNewProjectDialogOpen] = useState<boolean>(false);
  const [newProjectName, setNewProjectName] = useState<string>('');
  const [newProjectDescription, setNewProjectDescription] = useState<string>('');
  const [newProjectType, setNewProjectType] = useState<ProjectType>('EXCAVATION');
  
  // 删除项目对话框
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [projectToDelete, setProjectToDelete] = useState<ExtendedProject | null>(null);
  
  // 项目操作菜单
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuProject, setMenuProject] = useState<ExtendedProject | null>(null);
  
  // 加载项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const response = await projectApi.getProjects();
        
        // 扩展项目数据，添加前端需要的属性
        const extendedProjects: ExtendedProject[] = response.data.map(project => ({
          ...project,
          type: project.metadata?.excavation ? 'EXCAVATION' : 
                project.metadata?.supports ? 'TUNNEL' : 'FOUNDATION',
          owner: {
            id: user?.id || 1,
            username: user?.username || 'user',
            email: user?.email || 'user@example.com'
          }
        }));
        
        setProjects(extendedProjects);
        setFilteredProjects(extendedProjects);
        
        // 如果URL中有项目ID，自动打开该项目
        if (selectedProjectId) {
          const project = extendedProjects.find(p => p.id.toString() === selectedProjectId);
          if (project) {
            handleOpenProject(project);
          }
        }
      } catch (error) {
        console.error('获取项目列表失败:', error);
        setError('无法加载项目列表');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjects();
  }, [selectedProjectId, user]);
  
  // 过滤项目
  useEffect(() => {
    let filtered = [...projects];
    
    // 按选项卡过滤
    if (selectedTab === 1) { // 我的项目
      filtered = filtered.filter(project => project.owner?.id === user?.id);
    } else if (selectedTab === 2) { // 已完成项目
      filtered = filtered.filter(project => project.status === ProjectStatus.COMPLETED);
    } else if (selectedTab === 3) { // 进行中项目
      filtered = filtered.filter(project => 
        project.status === ProjectStatus.MODELING || 
        project.status === ProjectStatus.MESHING || 
        project.status === ProjectStatus.COMPUTING
      );
    }
    
    // 按项目类型过滤
    if (selectedProjectType !== 'ALL') {
      filtered = filtered.filter(project => project.type === selectedProjectType);
    }
    
    // 按搜索关键词过滤
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        project =>
          project.name.toLowerCase().includes(query) ||
          project.description.toLowerCase().includes(query)
      );
    }
    
    setFilteredProjects(filtered);
  }, [projects, selectedTab, selectedProjectType, searchQuery, user]);
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };
  
  // 处理搜索查询变化
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };
  
  // 处理项目类型过滤变化
  const handleProjectTypeChange = (event: SelectChangeEvent<ProjectType | 'ALL'>) => {
    setSelectedProjectType(event.target.value as ProjectType | 'ALL');
  };
  
  // 处理新建项目对话框打开
  const handleNewProjectDialogOpen = () => {
    setNewProjectName('');
    setNewProjectDescription('');
    setNewProjectType('EXCAVATION');
    setNewProjectDialogOpen(true);
  };
  
  // 处理新建项目对话框关闭
  const handleNewProjectDialogClose = () => {
    setNewProjectDialogOpen(false);
  };
  
  // 处理创建新项目
  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      return;
    }
    
    showLoading('创建项目中...');
    
    try {
      const newProject = await projectApi.createProject({
        name: newProjectName,
        description: newProjectDescription,
        status: ProjectStatus.DRAFT,
        metadata: {
          domain: {
            width: 100,
            length: 100,
            total_depth: 30
          }
        }
      });
      
      // 扩展新项目数据
      const extendedProject: ExtendedProject = {
        ...newProject,
        type: newProjectType,
        owner: {
          id: user?.id || 1,
          username: user?.username || 'user',
          email: user?.email || 'user@example.com'
        }
      };
      
      setProjects([...projects, extendedProject]);
      setNewProjectDialogOpen(false);
      
      showSuccess('项目创建成功');
      
      // 导航到新项目的建模页面
      navigate(`/excavation-analysis/${newProject.id}`);
    } catch (err) {
      console.error('创建项目失败:', err);
      showError('创建项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      hideLoading();
    }
  };
  
  // 处理删除项目对话框打开
  const handleDeleteDialogOpen = (project: ExtendedProject) => {
    setProjectToDelete(project);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };
  
  // 处理删除项目对话框关闭
  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setProjectToDelete(null);
  };
  
  // 处理删除项目
  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    
    showLoading('删除项目中...');
    
    try {
      await projectApi.deleteProject(projectToDelete.id);
      
      const updatedProjects = projects.filter(project => project.id !== projectToDelete.id);
      setProjects(updatedProjects);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
      
      showSuccess('项目已删除');
    } catch (err) {
      console.error('删除项目失败:', err);
      showError('删除项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      hideLoading();
    }
  };
  
  // 处理项目菜单打开
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, project: ExtendedProject) => {
    setAnchorEl(event.currentTarget);
    setMenuProject(project);
  };
  
  // 处理项目菜单关闭
  const handleMenuClose = () => {
    setAnchorEl(null);
    setMenuProject(null);
  };
  
  // 处理复制项目
  const handleDuplicateProject = async (project: ExtendedProject) => {
    showLoading('复制项目中...');
    
    try {
      const duplicatedProject = await projectApi.duplicateProject(project.id);
      
      // 扩展复制的项目数据
      const extendedProject: ExtendedProject = {
        ...duplicatedProject,
        type: project.type,
        owner: {
          id: user?.id || 1,
          username: user?.username || 'user',
          email: user?.email || 'user@example.com'
        }
      };
      
      setProjects([...projects, extendedProject]);
      handleMenuClose();
      
      showSuccess('项目已复制');
    } catch (err) {
      console.error('复制项目失败:', err);
      showError('复制项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      hideLoading();
    }
  };
  
  // 处理打开项目
  const handleOpenProject = (project: ExtendedProject) => {
    // 根据项目类型导航到不同页面
    if (project.type === 'EXCAVATION') {
      navigate(`/excavation-analysis/${project.id}`);
    } else if (project.type === 'TUNNEL') {
      navigate(`/tunnel-modeling/${project.id}`);
    } else if (project.type === 'FOUNDATION') {
      navigate(`/foundation-analysis/${project.id}`);
    }
  };
  
  // 处理导出项目
  const handleExportProject = async (project: ExtendedProject) => {
    showLoading('导出项目中...');
    
    try {
      const response = await dataApi.exportData(project.id, 'project', 'json');
      window.open(response.fileUrl, '_blank');
      handleMenuClose();
      
      showSuccess('项目已导出');
    } catch (err) {
      console.error('导出项目失败:', err);
      showError('导出项目失败: ' + (err instanceof Error ? err.message : '未知错误'));
    } finally {
      hideLoading();
    }
  };
  
  // 处理分享项目
  const handleShareProject = (project: ExtendedProject) => {
    // 实际应用中应该实现分享功能
    alert(`分享项目: ${project.name}`);
    handleMenuClose();
  };
  
  // 获取项目状态标签
  const getStatusChip = (status: ProjectStatus) => {
    switch (status) {
      case ProjectStatus.DRAFT:
        return <Chip size="small" label="规划中" color="primary" variant="outlined" />;
      case ProjectStatus.MODELING:
      case ProjectStatus.MESHING:
      case ProjectStatus.COMPUTING:
        return <Chip size="small" label="进行中" color="warning" />;
      case ProjectStatus.COMPLETED:
        return <Chip size="small" label="已完成" color="success" />;
      case ProjectStatus.FAILED:
        return <Chip size="small" label="失败" color="error" />;
      default:
        return <Chip size="small" label={status} />;
    }
  };
  
  // 获取项目类型图标
  const getProjectTypeIcon = (type: ProjectType | undefined) => {
    if (!type) return <FolderIcon />;
    const option = projectTypeOptions.find(opt => opt.value === type);
    return option ? option.icon : <FolderIcon />;
  };
  
  // 获取项目类型名称
  const getProjectTypeName = (type: ProjectType | undefined) => {
    if (!type) return '未知类型';
    const option = projectTypeOptions.find(opt => opt.value === type);
    return option ? option.label : type;
  };
  
  // 渲染项目卡片
  const renderProjectCard = (project: ExtendedProject) => {
    return (
      <Card 
        sx={{ 
          height: '100%', 
          display: 'flex', 
          flexDirection: 'column',
          transition: 'transform 0.2s, box-shadow 0.2s',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 3
          }
        }}
      >
        <CardMedia
          component="img"
          height="140"
          image={project.thumbnail || `https://via.placeholder.com/300x200?text=${project.type || 'Project'}`}
          alt={project.name}
        />
        <CardContent sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="div" noWrap>
              {project.name}
            </Typography>
            <IconButton 
              size="small" 
              onClick={(e) => handleMenuOpen(e, project)}
              aria-label="项目操作"
            >
              <MoreVertIcon />
            </IconButton>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, height: 40, overflow: 'hidden' }}>
            {project.description}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: 'primary.main' }}>
              {getProjectTypeIcon(project.type as ProjectType)}
            </Avatar>
            <Typography variant="body2">
              {getProjectTypeName(project.type as ProjectType)}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {getStatusChip(project.status)}
            <Typography variant="caption" color="text.secondary">
              {new Date(project.updated_at).toLocaleDateString()}
            </Typography>
          </Box>
        </CardContent>
        <CardActions>
          <Button 
            size="small" 
            onClick={() => handleOpenProject(project)}
            startIcon={<VisibilityIcon />}
          >
            打开
          </Button>
          <Button 
            size="small" 
            onClick={() => handleDuplicateProject(project)}
            startIcon={<FileCopyIcon />}
          >
            复制
          </Button>
        </CardActions>
      </Card>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">项目管理</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleNewProjectDialogOpen}
        >
          新建项目
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={selectedTab}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="fullWidth"
        >
          <Tab label="全部项目" />
          <Tab label="我的项目" />
          <Tab label="已完成" />
          <Tab label="进行中" />
        </Tabs>
      </Paper>
      
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <TextField
            fullWidth
            placeholder="搜索项目..."
            value={searchQuery}
            onChange={handleSearchChange}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
            }}
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>项目类型</InputLabel>
            <Select
              value={selectedProjectType}
              label="项目类型"
              onChange={handleProjectTypeChange}
            >
              <MenuItem value="ALL">全部类型</MenuItem>
              {projectTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {React.cloneElement(option.icon as React.ReactElement, { sx: { mr: 1 } })}
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
      
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
          <CircularProgress />
        </Box>
      ) : filteredProjects.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            没有找到项目
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {searchQuery || selectedProjectType !== 'ALL' ? 
              '尝试使用不同的搜索条件' : 
              '点击"新建项目"按钮创建您的第一个项目'}
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleNewProjectDialogOpen}
          >
            新建项目
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredProjects.map(project => (
            <Grid item key={project.id} xs={12} sm={6} md={4} lg={3}>
              {renderProjectCard(project)}
            </Grid>
          ))}
        </Grid>
      )}
      
      {/* 项目操作菜单 */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => {
          if (menuProject) handleOpenProject(menuProject);
        }}>
          <ListItemIcon>
            <VisibilityIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>打开项目</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuProject) handleDuplicateProject(menuProject);
        }}>
          <ListItemIcon>
            <FileCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>复制项目</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (menuProject) handleShareProject(menuProject);
        }}>
          <ListItemIcon>
            <ShareIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>分享项目</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => {
          if (menuProject) handleExportProject(menuProject);
        }}>
          <ListItemIcon>
            <DownloadIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>导出项目</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (menuProject) {
            // 实际应用中应该调用API
            alert(`归档项目: ${menuProject.name}`);
            handleMenuClose();
          }
        }}>
          <ListItemIcon>
            <ArchiveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>归档项目</ListItemText>
        </MenuItem>
        <MenuItem 
          onClick={() => {
            if (menuProject) handleDeleteDialogOpen(menuProject);
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon>
            <DeleteIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText>删除项目</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* 新建项目对话框 */}
      <Dialog open={newProjectDialogOpen} onClose={handleNewProjectDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>新建项目</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            请输入新项目的基本信息
          </DialogContentText>
          <TextField
            autoFocus
            margin="dense"
            label="项目名称"
            fullWidth
            variant="outlined"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="项目描述"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={newProjectDescription}
            onChange={(e) => setNewProjectDescription(e.target.value)}
            sx={{ mb: 2 }}
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>项目类型</InputLabel>
            <Select
              value={newProjectType}
              label="项目类型"
              onChange={(e) => setNewProjectType(e.target.value as ProjectType)}
            >
              {projectTypeOptions.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    {React.cloneElement(option.icon as React.ReactElement, { sx: { mr: 1 } })}
                    {option.label}
                  </Box>
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewProjectDialogClose}>取消</Button>
          <Button 
            onClick={handleCreateProject} 
            variant="contained" 
            disabled={!newProjectName.trim()}
          >
            创建
          </Button>
        </DialogActions>
      </Dialog>
      
      {/* 删除项目对话框 */}
      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose}>
        <DialogTitle>删除项目</DialogTitle>
        <DialogContent>
          <DialogContentText>
            您确定要删除项目 "{projectToDelete?.name}" 吗？此操作无法撤销。
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>取消</Button>
          <Button onClick={handleDeleteProject} color="error">
            删除
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProjectManagement; 