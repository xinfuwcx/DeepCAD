import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  TextField,
  FormControl,
  FormControlLabel,
  Switch,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  AlertTitle,
  CircularProgress,
  Divider,
  Paper,
  LinearProgress
} from '@mui/material';
import { 
  WaterDrop, 
  Engineering, 
  PlayArrow, 
  CloudUpload, 
  CloudDownload 
} from '@mui/icons-material';

// 模拟API调用
const mockApiCall = (data: any, delay = 1000): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        taskId: `task_${Date.now()}`,
        message: '分析任务已创建'
      });
    }, delay);
  });
};

// 模拟获取任务状态
const mockGetTaskStatus = (taskId: string): Promise<any> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        status: Math.random() > 0.2 ? 'completed' : 'running',
        progress: Math.min(100, Math.floor(Math.random() * 100 + 50)),
        message: '分析进行中...'
      });
    }, 500);
  });
};

interface CouplingAnalysisPanelProps {
  projectId?: number;
}

const CouplingAnalysisPanel: React.FC<CouplingAnalysisPanelProps> = ({ projectId = 1 }) => {
  // 状态管理
  const [loading, setLoading] = useState(false);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<'pending' | 'running' | 'completed' | 'failed'>('pending');
  const [taskProgress, setTaskProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultsUrl, setResultsUrl] = useState<string | null>(null);

  // 分析参数
  const [parameters, setParameters] = useState({
    coupling_scheme: 'staggered',
    time_step: 0.1,
    total_time: 10.0,
    convergence_tolerance: 1e-5,
    max_iterations: 20,
    consider_porosity_change: true,
    output_interval: 1.0,
    model_file: ''
  });

  // 材料属性
  const [materials, setMaterials] = useState({
    soil: {
      density: 1800.0,
      young_modulus: 20000.0,
      poisson_ratio: 0.3,
      permeability: 1e-6,
      porosity: 0.4
    },
    wall: {
      density: 2500.0,
      young_modulus: 30000000.0,
      poisson_ratio: 0.2,
      permeability: 1e-12,
      porosity: 0.15
    }
  });

  // 模型文件选择
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 监控任务状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (taskId && taskStatus === 'running') {
      intervalId = setInterval(async () => {
        try {
          const status = await mockGetTaskStatus(taskId);
          
          setTaskProgress(status.progress || 0);
          
          if (status.status === 'completed') {
            setTaskStatus('completed');
            setResultsUrl(`/api/compute/seepage-coupling/${taskId}/results`);
            clearInterval(intervalId);
          } else if (status.status === 'failed') {
            setTaskStatus('failed');
            setErrorMessage(status.message || '分析失败');
            clearInterval(intervalId);
          }
        } catch (error) {
          console.error('获取任务状态失败', error);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [taskId, taskStatus]);

  // 处理参数变更
  const handleParameterChange = (param: string, value: any) => {
    setParameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

  // 处理材料属性变更
  const handleMaterialChange = (material: string, property: string, value: number) => {
    setMaterials(prev => ({
      ...prev,
      [material]: {
        ...prev[material as keyof typeof prev],
        [property]: value
      }
    }));
  };

  // 处理文件选择
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files.length > 0) {
      setSelectedFile(event.target.files[0]);
      setParameters(prev => ({
        ...prev,
        model_file: event.target.files![0].name
      }));
    }
  };

  // 开始分析
  const startAnalysis = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);

      // 构建请求数据
      const requestData = {
        project_id: projectId,
        ...parameters,
        materials,
        boundary_conditions: {
          // 简化的边界条件
          displacement: {
            "1": { type: "fixed" },
            "2": { type: "fixed" }
          },
          water_pressure: {
            "3": { type: "fixed", value: 0.0 }
          }
        }
      };

      // 调用API
      const response = await mockApiCall(requestData);

      if (response.success) {
        setTaskId(response.taskId);
        setTaskStatus('running');
        setTaskProgress(0);
      } else {
        setErrorMessage(response.message || '创建分析任务失败');
      }
    } catch (error: any) {
      setErrorMessage(error.message || '发生错误');
    } finally {
      setLoading(false);
    }
  };

  // 下载结果
  const downloadResults = () => {
    if (resultsUrl) {
      window.open(resultsUrl, '_blank');
    }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
        <WaterDrop sx={{ mr: 1 }} color="primary" />
        <Engineering sx={{ mr: 1 }} color="secondary" />
        渗流-结构耦合分析
      </Typography>
      
      {errorMessage && (
        <Alert severity="error" sx={{ my: 2 }}>
          <AlertTitle>错误</AlertTitle>
          {errorMessage}
        </Alert>
      )}
      
      <Grid container spacing={3}>
        {/* 左侧 - 分析参数 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>基本参数</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>耦合方案</InputLabel>
                    <Select
                      value={parameters.coupling_scheme}
                      onChange={(e) => handleParameterChange('coupling_scheme', e.target.value)}
                      label="耦合方案"
                    >
                      <MenuItem value="monolithic">一体化求解</MenuItem>
                      <MenuItem value="staggered">分离式求解</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="时间步长 (s)"
                    type="number"
                    size="small"
                    fullWidth
                    value={parameters.time_step}
                    onChange={(e) => handleParameterChange('time_step', parseFloat(e.target.value))}
                    inputProps={{ min: 0.001, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="总时间 (s)"
                    type="number"
                    size="small"
                    fullWidth
                    value={parameters.total_time}
                    onChange={(e) => handleParameterChange('total_time', parseFloat(e.target.value))}
                    inputProps={{ min: 0.1, step: 0.1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="收敛容差"
                    type="number"
                    size="small"
                    fullWidth
                    value={parameters.convergence_tolerance}
                    onChange={(e) => handleParameterChange('convergence_tolerance', parseFloat(e.target.value))}
                    inputProps={{ min: 1e-10, step: 1e-6 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="最大迭代次数"
                    type="number"
                    size="small"
                    fullWidth
                    value={parameters.max_iterations}
                    onChange={(e) => handleParameterChange('max_iterations', parseInt(e.target.value))}
                    inputProps={{ min: 1, step: 1 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="输出间隔 (s)"
                    type="number"
                    size="small"
                    fullWidth
                    value={parameters.output_interval}
                    onChange={(e) => handleParameterChange('output_interval', parseFloat(e.target.value))}
                    inputProps={{ min: 0.1, step: 0.1 }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={parameters.consider_porosity_change}
                        onChange={(e) => handleParameterChange('consider_porosity_change', e.target.checked)}
                      />
                    }
                    label="考虑孔隙率变化"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<CloudUpload />}
                    fullWidth
                  >
                    上传模型文件
                    <input
                      type="file"
                      hidden
                      onChange={handleFileChange}
                      accept=".mdpa,.vtk,.json"
                    />
                  </Button>
                  {selectedFile && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      已选择: {selectedFile.name}
                    </Typography>
                  )}
                </Grid>
              </Grid>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>材料属性</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Typography variant="subtitle2" gutterBottom>土体</Typography>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="密度 (kg/m³)"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.soil.density}
                    onChange={(e) => handleMaterialChange('soil', 'density', parseFloat(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="弹性模量 (kPa)"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.soil.young_modulus}
                    onChange={(e) => handleMaterialChange('soil', 'young_modulus', parseFloat(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="泊松比"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.soil.poisson_ratio}
                    onChange={(e) => handleMaterialChange('soil', 'poisson_ratio', parseFloat(e.target.value))}
                    inputProps={{ min: 0, max: 0.5, step: 0.01 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="渗透系数 (m/s)"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.soil.permeability}
                    onChange={(e) => handleMaterialChange('soil', 'permeability', parseFloat(e.target.value))}
                    inputProps={{ min: 0, step: 0.000001 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="孔隙率"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.soil.porosity}
                    onChange={(e) => handleMaterialChange('soil', 'porosity', parseFloat(e.target.value))}
                    inputProps={{ min: 0, max: 1, step: 0.01 }}
                  />
                </Grid>
              </Grid>
              
              <Typography variant="subtitle2" gutterBottom>围护结构</Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="密度 (kg/m³)"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.wall.density}
                    onChange={(e) => handleMaterialChange('wall', 'density', parseFloat(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="弹性模量 (kPa)"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.wall.young_modulus}
                    onChange={(e) => handleMaterialChange('wall', 'young_modulus', parseFloat(e.target.value))}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    label="泊松比"
                    type="number"
                    size="small"
                    fullWidth
                    value={materials.wall.poisson_ratio}
                    onChange={(e) => handleMaterialChange('wall', 'poisson_ratio', parseFloat(e.target.value))}
                    inputProps={{ min: 0, max: 0.5, step: 0.01 }}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
        
        {/* 右侧 - 分析状态和结果 */}
        <Grid item xs={12} md={6}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>分析控制</Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Box sx={{ my: 2 }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrow />}
                  onClick={startAnalysis}
                  disabled={loading || taskStatus === 'running' || !selectedFile}
                  sx={{ mr: 2 }}
                >
                  {loading ? '请稍候...' : '开始分析'}
                </Button>
                
                {taskStatus === 'completed' && (
                  <Button
                    variant="outlined"
                    startIcon={<CloudDownload />}
                    onClick={downloadResults}
                  >
                    下载结果
                  </Button>
                )}
              </Box>
              
              {taskId && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    任务ID: {taskId}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    状态: {
                      taskStatus === 'pending' ? '等待中' :
                      taskStatus === 'running' ? '运行中' :
                      taskStatus === 'completed' ? '已完成' :
                      '失败'
                    }
                  </Typography>
                  
                  {taskStatus === 'running' && (
                    <Box sx={{ mt: 1 }}>
                      <LinearProgress variant="determinate" value={taskProgress} />
                      <Typography variant="caption" color="text.secondary" align="center" sx={{ display: 'block', mt: 0.5 }}>
                        {taskProgress}%
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>结果预览</Typography>
              <Divider sx={{ mb: 2 }} />
              
              {taskStatus === 'completed' ? (
                <Box>
                  <Typography variant="body1" gutterBottom>分析完成</Typography>
                  
                  <Paper elevation={0} variant="outlined" sx={{ p: 2, bgcolor: 'background.default' }}>
                    <Typography variant="subtitle2" gutterBottom>位移最大值:</Typography>
                    <Typography variant="body2">X方向: 0.015 m</Typography>
                    <Typography variant="body2">Y方向: 0.008 m</Typography>
                    <Typography variant="body2">Z方向: 0.022 m</Typography>
                    
                    <Divider sx={{ my: 1 }} />
                    
                    <Typography variant="subtitle2" gutterBottom>水压力范围:</Typography>
                    <Typography variant="body2">最大值: 18.5 kPa</Typography>
                    <Typography variant="body2">最小值: 0.0 kPa</Typography>
                    
                    <Alert severity="info" sx={{ mt: 2 }}>
                      完整的结果可通过下载按钮获取
                    </Alert>
                  </Paper>
                </Box>
              ) : (
                <Box sx={{ 
                  p: 3, 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: 200,
                  bgcolor: 'background.default'
                }}>
                  {taskStatus === 'running' ? (
                    <CircularProgress size={40} />
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      开始分析后，结果将在此处显示
                    </Typography>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CouplingAnalysisPanel;
