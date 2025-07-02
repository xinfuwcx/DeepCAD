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
  Save as SaveIcon,
  Construction as ConstructionIcon
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { projectApi, modelingApi, resultApi } from '../services/api';
import { Project, ProjectStatus, ProjectStatistics } from '../models/types';
import { useAlert } from '../components/common/AlertProvider';
import ExcavationDiagramViewer from '../components/modeling/ExcavationDiagramViewer';
import ResultViewer from '../components/ResultViewer';
import ModelingPipelineRunner from '../components/analysis/ModelingPipelineRunner';

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
  if (error) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  // 渲染主界面
  return (
    <Grid container spacing={3}>
      {/* 左侧项目列表 */}
      <Grid item xs={12} md={3}>
        <Card>
          <CardHeader title="近期项目" />
          <CardContent>
            {renderProjectList()}
          </CardContent>
        </Card>
      </Grid>
      
      {/* 右侧主内容 */}
      <Grid item xs={12} md={9}>
        <Paper sx={{ p: 2, display: 'flex', flexDirection: 'column' }}>
          {/* 面包屑导航和操作按钮 */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Breadcrumbs aria-label="breadcrumb">
              <Link underline="hover" color="inherit" onClick={() => navigate('/dashboard')}>
                仪表盘
              </Link>
              <Typography color="text.primary">{project?.name || '基坑分析'}</Typography>
            </Breadcrumbs>
            
            <Box>
              {editMode ? (
                <Tooltip title="保存">
                  <IconButton color="primary" onClick={handleSaveExcavationData}>
                    <SaveIcon />
                  </IconButton>
                </Tooltip>
              ) : (
                <Tooltip title="编辑">
                  <IconButton onClick={() => setEditMode(true)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
              )}
              <Tooltip title="刷新数据">
                <IconButton onClick={handleRefresh}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="下载报告">
                <IconButton onClick={handleDownloadReport}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
          
          <Divider sx={{ mb: 2 }}/>
          
          <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tabs value={currentTab} onChange={handleTabChange} aria-label="分析内容选项卡">
                <Tab label="项目概览" />
                <Tab label="二维示意图" />
                <Tab label="结果图表" />
                <Tab label="数据表格" />
                <Tab label="报告" />
                <Tab label="建模与分析" icon={<ConstructionIcon />} />
              </Tabs>
            </Box>
            
            {/* 项目概览 */}
            {currentTab === 0 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h5" gutterBottom>
                  {project?.name}
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                  {project?.description || '暂无描述'}
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>最大位移</Typography>
                        <Typography variant="h5">{statistics?.max_displacement || 'N/A'} mm</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>最大应力</Typography>
                        <Typography variant="h5">{statistics?.max_stress || 'N/A'} kPa</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>最小安全系数</Typography>
                        <Typography variant="h5">{statistics?.min_safety_factor || 'N/A'}</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Card>
                      <CardContent>
                        <Typography color="text.secondary" gutterBottom>计算用时</Typography>
                        <Typography variant="h5">{statistics?.computation_time || 'N/A'} min</Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            )}
            
            {/* 二维示意图 */}
            {currentTab === 1 && (
              <Box sx={{ p: 2, height: '600px', position: 'relative' }}>
                {diagramInitialData ? (
                  <ExcavationDiagramViewer
                    initialData={diagramInitialData}
                    isEditable={editMode}
                    onDataChange={handleExcavationDataChange}
                  />
                ) : <CircularProgress />}
              </Box>
            )}
            
            {/* 结果图表 */}
            {currentTab === 2 && projectIdNum && (
              <ResultViewer projectId={projectIdNum} resultType="chart" />
            )}
            
            {/* 数据表格 */}
            {currentTab === 3 && projectIdNum && (
              <ResultViewer projectId={projectIdNum} resultType="table" />
            )}
            
            {/* 报告 */}
            {currentTab === 4 && (
              <Box sx={{ p: 3 }}>
                <Typography variant="h6">项目报告</Typography>
                <Typography>报告内容将在此处显示。</Typography>
                <Button variant="contained" onClick={handleDownloadReport} sx={{ mt: 2 }}>
                  下载PDF报告
                </Button>
              </Box>
            )}
            
            {/* 建模与分析 */}
            {currentTab === 5 && (
              <ModelingPipelineRunner />
            )}
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};

export default ExcavationAnalysis;