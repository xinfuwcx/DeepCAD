import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
  Slider,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Switch,
  Stepper,
  Step,
  StepLabel,
  StepContent
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Check as CheckIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Lightbulb as TipIcon,
  Straighten as GeometryIcon,
  Calculate as CalculateIcon,
  Visibility as VisibilityIcon
} from '@mui/icons-material';
import { api } from '../utils/api';

// NURBS预览组件（占位）
const NurbsPreview: React.FC<{ projectId: number, height?: number }> = ({ projectId, height = 400 }) => {
  return (
    <Box 
      sx={{ 
        height, 
        bgcolor: 'background.paper', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        border: '1px dashed grey'
      }}
    >
      <Typography color="text.secondary">
        NURBS几何模型预览 (项目ID: {projectId})
      </Typography>
    </Box>
  );
};

/**
 * IGA等几何分析页面
 * 直接从NURBS几何模型进行等几何分析
 */
const IgaAnalysisPage: React.FC = () => {
  // 假设项目ID从URL参数获取
  const projectId = 1;
  
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [computing, setComputing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [job, setJob] = useState<any | null>(null);
  const [geometryModel, setGeometryModel] = useState<any | null>(null);
  const [showTips, setShowTips] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0); // 当前活动步骤
  
  // 等几何分析参数
  const [igaParams, setIgaParams] = useState({
    analysisType: 'structural', // 分析类型
    materialModel: 'linear-elastic', // 材料模型
    solver: 'direct', // 求解器类型
    integration: 'gauss-legendre', // 积分方法
    nurbs: {
      degree: [2, 2, 2], // 三个方向的阶次
      refinement: 'h-refinement', // 细化方式
      refinementLevel: 2, // 细化级别
    },
    nonlinear: {
      useNonlinear: false, // 是否使用非线性分析
      maxIterations: 100, // 最大迭代次数
      tolerance: 1e-6, // 收敛容差
      loadSteps: 10, // 加载步数
    },
    computation: {
      useParallel: true, // 使用并行计算
      numCores: 4, // 使用核心数
      saveIntermediate: true, // 保存中间结果
    }
  });
  
  // 加载几何模型和作业信息
  useEffect(() => {
    const fetchGeometryAndJobInfo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 模拟几何模型数据
        const geometryData = {
          id: 'geo-123',
          project_id: projectId,
          name: 'NURBS模型-1',
          model_type: 'nurbs',
          control_points_count: 500,
          created_at: '2023-06-15T10:30:00Z'
        };
        
        setGeometryModel(geometryData);
        
        // 模拟作业数据
        const jobData = {
          id: 'job-456',
          project_id: projectId,
          status: 'completed',
          progress: 100,
          started_at: '2023-06-16T08:30:00Z',
          finished_at: '2023-06-16T09:15:00Z'
        };
        
        setJob(jobData);
        
        // 如果作业正在运行，设置计算状态
        if (jobData.status === 'running') {
          setComputing(true);
          // 启动轮询
          startPolling(jobData.id);
        }
      } catch (err) {
        console.error('获取几何和作业信息失败:', err);
        setError('无法加载几何模型和作业信息');
      } finally {
        setLoading(false);
      }
    };
    
    fetchGeometryAndJobInfo();
  }, [projectId]);
  
  // 轮询作业状态
  const startPolling = (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        // 模拟数据
        const progress = job ? Math.min(job.progress + 10, 100) : 10;
        const data = {
          id: jobId,
          project_id: projectId,
          status: progress < 100 ? 'running' : 'completed',
          progress: progress,
          started_at: job?.started_at || new Date().toISOString(),
          finished_at: progress >= 100 ? new Date().toISOString() : undefined
        };
        
        setJob(data);
        
        if (data.status !== 'running') {
          setComputing(false);
          clearInterval(pollInterval);
          
          if (data.status === 'completed') {
            setSuccess('IGA分析已成功完成');
          } else if (data.status === 'failed') {
            setError('IGA分析失败');
          }
        }
      } catch (err) {
        console.error('轮询作业状态失败:', err);
        clearInterval(pollInterval);
      }
    }, 2000); // 每2秒轮询一次
    
    // 清除轮询
    return () => clearInterval(pollInterval);
  };
  
  // 处理参数变化
  const handleParamChange = (category: string, param: string, value: any) => {
    setIgaParams(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [param]: value
      }
    }));
  };

  // 处理普通参数变化
  const handleBasicParamChange = (param: string, value: any) => {
    setIgaParams(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  // 启动IGA分析
  const handleStartAnalysis = async () => {
    setComputing(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟新的作业
      const newJob = {
        id: `job-${Date.now()}`,
        project_id: projectId,
        status: 'running',
        progress: 0,
        started_at: new Date().toISOString()
      };
      
      setJob(newJob);
      
      // 启动轮询
      startPolling(newJob.id);
    } catch (err) {
      console.error('启动IGA分析失败:', err);
      setError('启动IGA分析失败');
      setComputing(false);
    }
  };
  
  // 取消计算
  const handleCancelAnalysis = async () => {
    if (!job) return;
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 更新作业状态
      setJob({
        ...job,
        status: 'cancelled',
        finished_at: new Date().toISOString()
      });
      
      setComputing(false);
      setSuccess('IGA分析已取消');
    } catch (err) {
      console.error('取消IGA分析失败:', err);
      setError('取消IGA分析失败');
    }
  };
  
  // 渲染计算状态
  const renderComputationStatus = () => {
    if (!job) return null;
    
    let statusColor = 'default';
    let statusIcon = <InfoIcon />;
    
    switch (job.status) {
      case 'running':
        statusColor = 'info';
        statusIcon = <CircularProgress size={16} />;
        break;
      case 'completed':
        statusColor = 'success';
        statusIcon = <CheckIcon />;
        break;
      case 'failed':
        statusColor = 'error';
        statusIcon = <ErrorIcon />;
        break;
      case 'cancelled':
        statusColor = 'warning';
        statusIcon = <WarningIcon />;
        break;
    }
    
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            计算状态
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Chip
              label={job.status === 'running' ? '计算中' : 
                     job.status === 'completed' ? '已完成' :
                     job.status === 'failed' ? '失败' :
                     job.status === 'cancelled' ? '已取消' : '未知'}
              color={statusColor as any}
              icon={statusIcon}
              sx={{ mr: 2 }}
            />
            
            {job.status === 'running' && (
              <Typography variant="body2" color="text.secondary">
                {Math.floor(job.progress)}% 完成
              </Typography>
            )}
          </Box>
          
          {job.status === 'running' && (
            <LinearProgress 
              variant="determinate" 
              value={job.progress} 
              sx={{ mb: 2, height: 8, borderRadius: 1 }}
            />
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                开始时间: {job.started_at ? new Date(job.started_at).toLocaleString() : '未开始'}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                完成时间: {job.finished_at ? new Date(job.finished_at).toLocaleString() : '进行中'}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };

  // 渲染NURBS模型信息
  const renderGeometryInfo = () => {
    if (!geometryModel) return null;
    
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            NURBS模型信息
          </Typography>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                模型名称: {geometryModel.name}
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="body2" color="text.secondary">
                控制点数量: {geometryModel.control_points_count}
              </Typography>
            </Grid>
            <Grid item xs={12}>
              <Typography variant="body2" color="text.secondary">
                创建时间: {new Date(geometryModel.created_at).toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  };
  
  // 渲染IGA工作流程步骤
  const renderWorkflowSteps = () => {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          IGA分析工作流程
        </Typography>
        <Stepper activeStep={activeStep} orientation="vertical">
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">1. 几何模型准备</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                选择或导入NURBS几何模型，确保模型完整且边界条件明确。IGA直接使用NURBS表达，无需网格划分。
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => setActiveStep(1)}
                >
                  下一步
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">2. 参数设置</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                设置分析类型、材料模型和NURBS细化参数。IGA支持h/p/k三种细化方式，提供更高阶连续性。
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => setActiveStep(0)}
                >
                  返回
                </Button>
                <Button 
                  size="small" 
                  variant="contained" 
                  onClick={() => setActiveStep(2)}
                >
                  下一步
                </Button>
              </Box>
            </StepContent>
          </Step>
          
          <Step>
            <StepLabel>
              <Typography variant="subtitle1">3. 计算与结果分析</Typography>
            </StepLabel>
            <StepContent>
              <Typography variant="body2" color="text.secondary">
                启动IGA分析，系统将直接基于NURBS模型进行计算，获得高精度结果。结果可视化将保持几何精确性。
              </Typography>
              <Box sx={{ mt: 1 }}>
                <Button 
                  size="small" 
                  variant="outlined" 
                  onClick={() => setActiveStep(1)}
                >
                  返回
                </Button>
              </Box>
            </StepContent>
          </Step>
        </Stepper>
      </Paper>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2, mb: 4 }}>
      <Paper sx={{ p: 3, mb: 3, bgcolor: 'primary.light', color: 'primary.contrastText' }}>
        <Typography variant="h4" gutterBottom>
          等几何分析 (IGA)
        </Typography>
        <Typography variant="subtitle1">
          直接基于NURBS几何模型进行高精度分析，无需传统网格划分
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
          <Chip icon={<GeometryIcon />} label="几何精确表达" color="default" />
          <Chip icon={<CalculateIcon />} label="高阶连续性" color="default" />
          <Chip icon={<VisibilityIcon />} label="CAD/CAE一体化" color="default" />
        </Box>
      </Paper>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      {/* 添加工作流程步骤指引 */}
      {renderWorkflowSteps()}
      
      <Grid container spacing={2}>
        {/* 左侧参数设置 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">IGA参数设置</Typography>
              <Tooltip title="获取参数提示">
                <IconButton onClick={() => setShowTips(true)}>
                  <TipIcon />
                </IconButton>
              </Tooltip>
            </Box>
            
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={3}>
              {/* 基本分析参数 */}
              <FormControl fullWidth>
                <InputLabel>分析类型</InputLabel>
                <Select
                  value={igaParams.analysisType}
                  label="分析类型"
                  onChange={(e) => handleBasicParamChange('analysisType', e.target.value)}
                >
                  <MenuItem value="structural">结构分析</MenuItem>
                  <MenuItem value="thermal">热分析</MenuItem>
                  <MenuItem value="coupled">热-结构耦合</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>材料模型</InputLabel>
                <Select
                  value={igaParams.materialModel}
                  label="材料模型"
                  onChange={(e) => handleBasicParamChange('materialModel', e.target.value)}
                >
                  <MenuItem value="linear-elastic">线性弹性</MenuItem>
                  <MenuItem value="neo-hookean">Neo-Hookean</MenuItem>
                  <MenuItem value="mohr-coulomb">莫尔-库伦</MenuItem>
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>求解器</InputLabel>
                <Select
                  value={igaParams.solver}
                  label="求解器"
                  onChange={(e) => handleBasicParamChange('solver', e.target.value)}
                >
                  <MenuItem value="direct">直接求解器</MenuItem>
                  <MenuItem value="iterative">迭代求解器</MenuItem>
                  <MenuItem value="amg">代数多重网格</MenuItem>
                </Select>
              </FormControl>
              
              {/* NURBS细化参数 */}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>NURBS参数</Typography>
              <Divider />
              
              <FormControl fullWidth>
                <InputLabel>细化方式</InputLabel>
                <Select
                  value={igaParams.nurbs.refinement}
                  label="细化方式"
                  onChange={(e) => handleParamChange('nurbs', 'refinement', e.target.value)}
                >
                  <MenuItem value="h-refinement">h-细化</MenuItem>
                  <MenuItem value="p-refinement">p-细化</MenuItem>
                  <MenuItem value="k-refinement">k-细化</MenuItem>
                </Select>
              </FormControl>
              
              <Box>
                <Typography variant="body2" gutterBottom>细化级别</Typography>
                <Slider
                  value={igaParams.nurbs.refinementLevel}
                  min={0}
                  max={5}
                  step={1}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleParamChange('nurbs', 'refinementLevel', value)}
                  marks={[
                    { value: 0, label: '0' },
                    { value: 5, label: '5' }
                  ]}
                />
              </Box>
              
              {/* 非线性参数 */}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>非线性设置</Typography>
              <Divider />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={igaParams.nonlinear.useNonlinear}
                    onChange={(e) => handleParamChange('nonlinear', 'useNonlinear', e.target.checked)}
                  />
                }
                label="启用非线性分析"
              />
              
              {igaParams.nonlinear.useNonlinear && (
                <>
                  <TextField
                    label="最大迭代次数"
                    type="number"
                    value={igaParams.nonlinear.maxIterations}
                    onChange={(e) => handleParamChange('nonlinear', 'maxIterations', parseInt(e.target.value))}
                    fullWidth
                  />
                  
                  <TextField
                    label="收敛容差"
                    type="number"
                    value={igaParams.nonlinear.tolerance}
                    onChange={(e) => handleParamChange('nonlinear', 'tolerance', parseFloat(e.target.value))}
                    fullWidth
                    inputProps={{ step: '1e-8' }}
                  />
                  
                  <TextField
                    label="加载步数"
                    type="number"
                    value={igaParams.nonlinear.loadSteps}
                    onChange={(e) => handleParamChange('nonlinear', 'loadSteps', parseInt(e.target.value))}
                    fullWidth
                  />
                </>
              )}
              
              {/* 计算设置 */}
              <Typography variant="subtitle2" sx={{ mt: 2 }}>计算设置</Typography>
              <Divider />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={igaParams.computation.useParallel}
                    onChange={(e) => handleParamChange('computation', 'useParallel', e.target.checked)}
                  />
                }
                label="使用并行计算"
              />
              
              {igaParams.computation.useParallel && (
                <TextField
                  label="使用核心数"
                  type="number"
                  value={igaParams.computation.numCores}
                  onChange={(e) => handleParamChange('computation', 'numCores', parseInt(e.target.value))}
                  fullWidth
                  InputProps={{ inputProps: { min: 1, max: 32 } }}
                />
              )}
              
              <FormControlLabel
                control={
                  <Switch
                    checked={igaParams.computation.saveIntermediate}
                    onChange={(e) => handleParamChange('computation', 'saveIntermediate', e.target.checked)}
                  />
                }
                label="保存中间结果"
              />
              
              {/* 操作按钮 */}
              <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<StartIcon />}
                  onClick={handleStartAnalysis}
                  disabled={computing || loading}
                  fullWidth
                >
                  开始分析
                </Button>
                
                {computing && (
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<StopIcon />}
                    onClick={handleCancelAnalysis}
                    fullWidth
                  >
                    取消
                  </Button>
                )}
              </Box>
            </Stack>
          </Paper>
          
          {renderGeometryInfo()}
        </Grid>
        
        {/* 右侧预览和结果 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              NURBS几何模型预览
            </Typography>
            
            <NurbsPreview projectId={projectId} height={400} />
          </Paper>
          
          {renderComputationStatus()}
        </Grid>
      </Grid>
      
      {/* 提示对话框 */}
      <Dialog open={showTips} onClose={() => setShowTips(false)} maxWidth="md">
        <DialogTitle>等几何分析参数指南</DialogTitle>
        <DialogContent>
          <Typography variant="h6" gutterBottom>什么是等几何分析(IGA)?</Typography>
          <Typography paragraph>
            等几何分析是一种将CAD几何表示直接用于分析的方法，无需传统的网格划分步骤。
            它使用与CAD相同的NURBS基函数，提供更高精度的结果和更好的几何表示。
          </Typography>
          
          <Typography variant="h6" gutterBottom>NURBS细化选项</Typography>
          <List>
            <ListItem>
              <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
              <ListItemText 
                primary="h-细化" 
                secondary="通过插入新的节点增加控制点数量，类似传统FEM的网格细化" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
              <ListItemText 
                primary="p-细化" 
                secondary="提高NURBS基函数的阶次，保持控制点数量不变" 
              />
            </ListItem>
            <ListItem>
              <ListItemIcon><InfoIcon color="info" /></ListItemIcon>
              <ListItemText 
                primary="k-细化" 
                secondary="综合h-细化和p-细化，同时提高阶次并增加控制点" 
              />
            </ListItem>
          </List>
          
          <Typography variant="h6" gutterBottom>非线性分析提示</Typography>
          <Typography paragraph>
            对于包含大变形、接触或非线性材料的问题，建议启用非线性分析，并适当调整迭代参数。
            加载步数越多，每步变形越小，收敛性越好，但计算时间更长。
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowTips(false)}>关闭</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default IgaAnalysisPage; 