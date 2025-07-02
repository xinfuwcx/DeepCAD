import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  LinearProgress,
  Alert,
  SelectChangeEvent,
  IconButton,
  Tooltip
} from '@mui/material';
import { PlayArrow, Stop, Science, Refresh } from '@mui/icons-material';
import { physicsAIService, JobStatusResult } from '../../services/physicsAIService';

// 模拟的监测数据点
const mockMonitoringData = [
  { id: 'DP-1', name: '地表沉降点1', value: 12.5, type: 'displacement' },
  { id: 'DP-2', name: '地表沉降点2', value: 15.2, type: 'displacement' },
  { id: 'SW-1', name: '支撑轴力监测点1', value: 350, type: 'stress' },
  { id: 'DW-1', name: '墙体测斜点1', value: 8.3, type: 'displacement' },
];

// 模拟的可反演参数
const mockInversionParameters = [
  { id: 'soil_c', name: '黏聚力 (kPa)', value: 18, min: 10, max: 30 },
  { id: 'soil_phi', name: '内摩擦角 (°)', value: 25, min: 18, max: 35 },
  { id: 'soil_E', name: '弹性模量 (MPa)', value: 22, min: 15, max: 40 },
];

/**
 * 参数反演UI组件
 */
const ParameterInversionUI: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<JobStatusResult['status']>('unknown');
  const [result, setResult] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);

  // -- State for UI controls --
  const [selectedProject, setSelectedProject] = useState('project_1');
  const [selectedAlgorithm, setSelectedAlgorithm] = useState<'bayesian' | 'ga' | 'pso'>('bayesian');

  const pollJobStatus = useCallback(async (currentJobId: string) => {
    try {
      const statusResult = await physicsAIService.getInversionJobStatus(currentJobId);
      setProgress(statusResult.progress ?? progress);
      setStatus(statusResult.status);
      setError(statusResult.error ?? null);
      
      if (statusResult.status === 'completed') {
        setIsRunning(false);
        setJobId(null);
        setResult(statusResult.results ?? {});
      } else if (statusResult.status === 'failed') {
        setIsRunning(false);
        setJobId(null);
      }
    } catch (e) {
      setError('轮询任务状态失败');
      setIsRunning(false);
      setJobId(null);
    }
  }, [progress]);
  
  useEffect(() => {
    let interval: number | null = null;
    if (jobId && isRunning) {
      interval = setInterval(() => {
        pollJobStatus(jobId);
      }, 2000); // 每2秒轮询一次
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [jobId, isRunning, pollJobStatus]);

  const handleRunInversion = async () => {
    setIsRunning(true);
    setStatus('queued');
    setProgress(0);
    setResult(null);
    setError(null);

    try {
        const response = await physicsAIService.startParameterInversion({
            projectId: selectedProject,
            algorithm: selectedAlgorithm,
            monitoringDataIds: mockMonitoringData.map(d => d.id),
            inversionParameterIds: mockInversionParameters.map(p => p.id),
        });
        setJobId(response.jobId);
    } catch(e) {
        setError('启动反演任务失败');
        setIsRunning(false);
        setStatus('failed');
    }
  };

  const handleStopInversion = () => {
    // 实际应用中可能需要调用一个API来取消后端的任务
    setIsRunning(false);
    setJobId(null);
    setStatus('unknown');
    setProgress(0);
    console.log('停止任务（前端模拟）', jobId);
  };
  
  const handleReset = () => {
    setIsRunning(false);
    setJobId(null);
    setProgress(0);
    setStatus('unknown');
    setResult(null);
    setError(null);
  }

  return (
    <Card>
      <CardHeader
        title="参数反演分析"
        subheader="基于现场监测数据，反演计算模型中的岩土参数"
        avatar={<Science fontSize="large" color="primary" />}
        action={
            <Tooltip title="重置状态">
              <IconButton onClick={handleReset}>
                <Refresh />
              </IconButton>
            </Tooltip>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* 左侧：设置与控制 */}
          <Grid item xs={12} md={6}>
            <Typography variant="h6" gutterBottom>设置</Typography>
            <FormControl fullWidth margin="normal">
              <InputLabel>目标项目</InputLabel>
              <Select label="目标项目" value={selectedProject} onChange={e => setSelectedProject(e.target.value)}>
                <MenuItem value="project_1">深基坑项目A</MenuItem>
                <MenuItem value="project_2">隧道工程项目B</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth margin="normal">
              <InputLabel>反演算法</InputLabel>
              <Select label="反演算法" value={selectedAlgorithm} onChange={e => setSelectedAlgorithm(e.target.value as any)}>
                <MenuItem value="bayesian">贝叶斯优化</MenuItem>
                <MenuItem value="ga">遗传算法</MenuItem>
                <MenuItem value="pso">粒子群优化</MenuItem>
              </Select>
            </FormControl>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="contained"
                startIcon={<PlayArrow />}
                onClick={handleRunInversion}
                disabled={isRunning}
              >
                开始反演
              </Button>
              <Button
                variant="outlined"
                startIcon={<Stop />}
                onClick={handleStopInversion}
                disabled={!isRunning}
                sx={{ ml: 2 }}
              >
                停止
              </Button>
            </Box>
          </Grid>
          
          {/* 右侧：数据与结果 */}
          <Grid item xs={12} md={6}>
             <Typography variant="h6" gutterBottom>监测数据</Typography>
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
              {mockMonitoringData.map(d => <Chip key={d.id} label={`${d.name}: ${d.value}`} />)}
             </Box>

             <Typography variant="h6" gutterBottom>反演参数</Typography>
             <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {mockInversionParameters.map(p => <Chip key={p.id} label={`${p.name}`} variant="outlined"/>)}
             </Box>
          </Grid>
        </Grid>

        {/* 进度与结果显示 */}
        {(isRunning || status === 'completed' || status === 'failed') && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="body2" color="text.secondary">任务状态: {status} {jobId && `(Job: ${jobId})`}</Typography>
            {(status === 'running' || status === 'queued') &&  <LinearProgress variant="determinate" value={progress} sx={{ my: 1 }} /> }
            
            {status === 'completed' && result && (
               <Alert severity="success" sx={{mt: 1}}>
                <Typography>反演完成！结果如下：</Typography>
                <pre>{JSON.stringify(result, null, 2)}</pre>
               </Alert>
            )}
             {status === 'failed' && (
               <Alert severity="error" sx={{mt: 1}}>
                反演过程中出现错误: {error || '未知错误'}
               </Alert>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ParameterInversionUI; 