import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Grid, 
  Paper, 
  Tabs, 
  Tab, 
  Card, 
  CardContent, 
  CircularProgress,
  Button,
  Breadcrumbs,
  Link,
  Alert,
  List,
  ListItem,
  ListItemText,
  Divider,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  BarChart as BarChartIcon, 
  ShowChart as LineChartIcon, 
  TableRows as TableRowsIcon, 
  Description as DescriptionIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  Edit as EditIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, modelingApi, resultApi } from '../services/api';
import { Project, ProjectStatus, ProjectStatistics } from '../models/types';
import { useAlert } from '../components/common/AlertProvider';
import ExcavationDiagramViewer from '../components/modeling/ExcavationDiagramViewer';
import ResultViewer from '../components/ResultViewer';

/**
 * 基坑分析页面
 * 显示基坑分析的结果和数据
 */
const ExcavationAnalysis: React.FC = () => {
  // 获取URL参数中的项目ID
  const { projectId } = useParams<{ projectId: string }>();
  const projectIdNum = projectId ? parseInt(projectId) : undefined;
  const navigate = useNavigate();
  const { showSuccess, showError, showLoading, hideLoading } = useAlert();
  
  // 状态
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [statistics, setStatistics] = useState<ProjectStatistics | null>(null);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [projects, setProjects] = useState<Project[]>([]);
  const [excavationData, setExcavationData] = useState<any>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  
  // 获取项目列表
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await projectApi.getRecentProjects(10);
        setProjects(response);
      } catch (err) {
        console.error('获取项目列表失败:', err);
        showError('无法加载项目列表');
      }
    };
    
    fetchProjects();
  }, [showError]);
  
  // 获取项目数据
  useEffect(() => {
    if (!projectIdNum) return;
    
    const fetchProjectData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 获取项目基本信息
        const projectData = await projectApi.getProject(projectIdNum);
        setProject(projectData);
        
        // 获取基坑数据
        try {
          const excavationResponse = await modelingApi.getExcavationData(projectIdNum);
          setExcavationData(excavationResponse);
        } catch (excavationError) {
          console.error('获取基坑数据失败:', excavationError);
          // 如果没有基坑数据，创建默认数据
          setExcavationData({
            depth: 10,
            contour: [
              { id: '1', x: 0, y: 0 },
              { id: '2', x: 30, y: 0 },
              { id: '3', x: 30, y: 20 },
              { id: '4', x: 0, y: 20 }
            ]
          });
        }
        
        // 获取项目统计信息
        try {
          const statsResponse = await projectApi.getProject(projectIdNum);
          // 从项目元数据中提取统计信息
          const stats: ProjectStatistics = {
            project_id: projectIdNum,
            max_displacement: 25.5, // 示例数据
            max_stress: 350.2, // 示例数据
            min_safety_factor: 1.25, // 示例数据
            computation_time: 120, // 示例数据
            stages_completed: statsResponse.metadata?.stages?.length || 0
          };
          setStatistics(stats);
        } catch (statsError) {
          console.error('获取统计数据失败:', statsError);
        }
      } catch (err) {
        console.error('获取项目数据失败:', err);
        setError('加载项目数据时出错');
      } finally {
        setLoading(false);
      }
    };
    
    fetchProjectData();
  }, [projectIdNum, showError]);
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // 刷新数据
  const handleRefresh = () => {
    if (projectIdNum) {
      showLoading('刷新数据中...');
      
      Promise.all([
        projectApi.getProject(projectIdNum),
        modelingApi.getExcavationData(projectIdNum)
      ]).then(([projectData, excavationData]) => {
        setProject(projectData);
        setExcavationData(excavationData);
        hideLoading();
        showSuccess('数据已刷新');
      }).catch(err => {
        console.error('刷新数据失败:', err);
        showError('刷新数据时出错');
        hideLoading();
      });
    }
  };
  
  // 下载报告
  const handleDownloadReport = async () => {
    if (!projectIdNum) return;
    
    showLoading('生成报告中...');
    
    try {
      const response = await resultApi.exportResultData(projectIdNum, 'report', 'pdf');
      window.open(response.fileUrl, '_blank');
      hideLoading();
      showSuccess('报告已生成');
    } catch (err) {
      console.error('生成报告失败:', err);
      showError('生成报告时出错');
      hideLoading();
    }
  };
  
  // 保存基坑数据
  const handleSaveExcavationData = async () => {
    if (!projectIdNum || !excavationData) return;
    
    showLoading('保存基坑数据中...');
    
    try {
      await modelingApi.updateExcavationData(projectIdNum, excavationData);
      setEditMode(false);
      hideLoading();
      showSuccess('基坑数据已保存');
    } catch (err) {
      console.error('保存基坑数据失败:', err);
      showError('保存基坑数据时出错');
      hideLoading();
    }
  };
  
  // 处理基坑数据更新
  const handleExcavationDataChange = (newData: any) => {
    setExcavationData(newData);
  };
  
  // 渲染项目列表
  const renderProjectList = () => {
    return (
      <List dense component="nav">
        {projects.map(p => (
          <React.Fragment key={p.id}>
            <ListItem 
              button 
              selected={projectIdNum === p.id}
              onClick={() => navigate(`/excavation-analysis/${p.id}`)}
            >
              <ListItemText 
                primary={p.name} 
                secondary={`状态: ${p.status}`}
              />
              <Chip 
                label={p.status} 
                size="small"
                color={
                  p.status === ProjectStatus.COMPLETED ? 'success' : 
                  p.status === ProjectStatus.FAILED ? 'error' : 
                  'primary'
                }
              />
            </ListItem>
            <Divider />
          </React.Fragment>
        ))}
      </List>
    );
  };
  
  // 准备二维示意图的初始数据
  const diagramInitialData = excavationData ? {
    excavationDepth: excavationData.depth || 10,
    contour: excavationData.contour || [],
    waterLevel: 5, // 假设水位数据
    monitoringPoints: [
      { x: 5, depth: 3, name: 'MP-1', value: `${(statistics?.max_displacement || 0) * 0.3}mm` },
      { x: 15, depth: 6, name: 'MP-2', value: `${(statistics?.max_displacement || 0) * 0.7}mm` },
      { x: 25, depth: 9, name: 'MP-3', value: `${statistics?.max_displacement || 0}mm` }
    ]
  } : undefined;
  
  // 渲染加载状态
  if (loading && !project) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }
  
  // 渲染错误状态
  if (error && !project) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }
  
  // 渲染项目选择提示
  if (!projectIdNum) {
    return (
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          基坑分析
        </Typography>
        <Paper sx={{ p: 3 }}>
          <Typography variant="body1" gutterBottom>
            请选择一个项目进行分析
          </Typography>
          {renderProjectList()}
        </Paper>
      </Container>
    );
  }
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      {/* 面包屑导航 */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/" underline="hover" color="inherit">
          首页
        </Link>
        <Link href="/projects" underline="hover" color="inherit">
          项目管理
        </Link>
        <Typography color="text.primary">
          {project?.name || `项目 ${projectIdNum}`}
        </Typography>
      </Breadcrumbs>
      
      <Grid container spacing={2}>
        {/* 左侧项目列表 */}
        <Grid item xs={12} md={3} lg={2}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              项目列表
            </Typography>
            {projects.length > 0 ? renderProjectList() : (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                <CircularProgress size={24} />
              </Box>
            )}
          </Paper>
          
          {/* 项目信息 */}
          {project && (
            <Paper sx={{ p: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                项目信息
              </Typography>
              <Typography variant="body2">
                <strong>名称:</strong> {project.name}
              </Typography>
              <Typography variant="body2">
                <strong>状态:</strong> {project.status}
              </Typography>
              <Typography variant="body2">
                <strong>创建时间:</strong> {new Date(project.created_at).toLocaleString()}
              </Typography>
              {excavationData && (
                <Typography variant="body2">
                  <strong>基坑深度:</strong> {excavationData.depth}m
                </Typography>
              )}
              {statistics && (
                <>
                  <Divider sx={{ my: 1 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    计算结果
                  </Typography>
                  <Typography variant="body2">
                    <strong>最大位移:</strong> {statistics.max_displacement}mm
                  </Typography>
                  <Typography variant="body2">
                    <strong>最大应力:</strong> {statistics.max_stress}kPa
                  </Typography>
                  <Typography variant="body2">
                    <strong>最小安全系数:</strong> {statistics.min_safety_factor}
                  </Typography>
                  <Typography variant="body2">
                    <strong>计算时间:</strong> {statistics.computation_time}s
                  </Typography>
                </>
              )}
              
              <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  startIcon={<RefreshIcon />}
                  onClick={handleRefresh}
                >
                  刷新
                </Button>
                <Button 
                  size="small" 
                  startIcon={<DownloadIcon />}
                  onClick={handleDownloadReport}
                >
                  报告
                </Button>
              </Box>
            </Paper>
          )}
        </Grid>
        
        {/* 右侧内容区 */}
        <Grid item xs={12} md={9} lg={10}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                {project?.name || `项目 ${projectIdNum}`}
              </Typography>
              <Box>
                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}
                {editMode ? (
                  <Tooltip title="保存">
                    <IconButton color="primary" onClick={handleSaveExcavationData}>
                      <SaveIcon />
                    </IconButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="编辑">
                    <IconButton color="primary" onClick={() => setEditMode(true)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                )}
              </Box>
            </Box>
            
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={currentTab} onChange={handleTabChange}>
                <Tab icon={<BarChartIcon />} label="三维结果" />
                <Tab icon={<LineChartIcon />} label="二维图表" />
                <Tab icon={<TableRowsIcon />} label="数据表格" />
                <Tab icon={<DescriptionIcon />} label="报告" />
              </Tabs>
            </Box>
            
            {/* 三维结果 */}
            {currentTab === 0 && (
              <Box sx={{ pt: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <ResultViewer projectId={projectIdNum} height={600} />
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              位移云图
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              最大位移: {statistics?.max_displacement || 0} mm
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              应力云图
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              最大应力: {statistics?.max_stress || 0} kPa
                            </Typography>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            )}
            
            {/* 二维图表 */}
            {currentTab === 1 && (
              <Box sx={{ pt: 2 }}>
                {loading ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : (
                  <>
                    <ExcavationDiagramViewer 
                      projectId={projectIdNum} 
                      height={500}
                      initialData={diagramInitialData}
                      editMode={editMode}
                      onDataChange={handleExcavationDataChange}
                    />
                    <Grid container spacing={2} sx={{ mt: 2 }}>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              位移曲线
                            </Typography>
                            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                位移数据图表将在这里显示
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                      <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="h6" gutterBottom>
                              应力曲线
                            </Typography>
                            <Box sx={{ height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                              <Typography variant="body2" color="text.secondary">
                                应力数据图表将在这里显示
                              </Typography>
                            </Box>
                          </CardContent>
                        </Card>
                      </Grid>
                    </Grid>
                  </>
                )}
              </Box>
            )}
            
            {/* 数据表格 */}
            {currentTab === 2 && (
              <Box sx={{ pt: 2 }}>
                <Card variant="outlined" sx={{ minHeight: 600 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      分析结果数据
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
                      <Typography variant="body2" color="text.secondary">
                        结果数据表格将在这里显示
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
            
            {/* 报告 */}
            {currentTab === 3 && (
              <Box sx={{ pt: 2 }}>
                <Card variant="outlined" sx={{ minHeight: 600 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      分析报告
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 500 }}>
                      <Typography variant="body2" color="text.secondary">
                        分析报告将在这里显示
                      </Typography>
                    </Box>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                      <Button 
                        variant="contained" 
                        startIcon={<DownloadIcon />}
                        onClick={handleDownloadReport}
                      >
                        下载报告
                      </Button>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ExcavationAnalysis; 