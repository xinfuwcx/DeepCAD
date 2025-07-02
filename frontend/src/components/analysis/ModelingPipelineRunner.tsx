import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CircularProgress,
  Grid,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Slider,
  Paper,
  Alert
} from '@mui/material';
import {
  IModelingPipelineService,
  createModelingPipelineService,
  PipelineParams,
  PipelineProgress,
  PipelineStatus,
  PipelineStage
} from '../../../src/services/modelingPipeline';

// 创建流水线服务的实例
const pipelineService = createModelingPipelineService();

/**
 * 建模分析流水线运行器组件
 */
const ModelingPipelineRunner: React.FC = () => {
  const [params, setParams] = useState<PipelineParams>({
    // 默认几何参数
    geometryParams: {
      modelName: '深基坑示例',
      excavationDepth: 15,
      excavationWidth: 20,
      excavationLength: 50,
      soilLayers: [
        { thickness: 5, material: 'silty_clay' },
        { thickness: 10, material: 'sandy_gravel' },
        { thickness: 15, material: 'weathered_rock' },
      ],
      supportStructures: [
        { type: 'diaphragm_wall', depth: 25, thickness: 0.8, material: 'C30_concrete' },
      ],
    },
    // 默认网格参数
    meshParams: {
      maxSize: 1.5,
      minSize: 0.2,
      grading: 0.5,
      elementOrder: 2,
      optimize: true,
      optimizeSteps: 5,
    },
    // 默认分析参数
    analysisParams: {
      analysisType: 'excavation',
      timeSteps: 10,
      maxIterations: 100,
      convergenceTolerance: 1e-5,
    },
    // 默认材料参数
    materials: [
      { name: 'silty_clay', type: 'MohrCoulomb', properties: { young_modulus: 20e6, poisson_ratio: 0.35, cohesion: 15e3, friction_angle: 22 } },
      { name: 'sandy_gravel', type: 'MohrCoulomb', properties: { young_modulus: 50e6, poisson_ratio: 0.25, cohesion: 5e3, friction_angle: 35 } },
      { name: 'weathered_rock', type: 'MohrCoulomb', properties: { young_modulus: 1.5e9, poisson_ratio: 0.2, cohesion: 500e3, friction_angle: 40 } },
      { name: 'C30_concrete', type: 'LinearElastic', properties: { young_modulus: 30e9, poisson_ratio: 0.2 } },
    ],
    // 默认边界条件
    boundaryConditions: [
      { name: 'bottom_fixed', type: 'FixedDisplacement', boundaryName: 'bottom', value: [0, 0, 0] },
      { name: 'side_rollers', type: 'RollerDisplacement', boundaryName: 'sides', value: [1, 0, 1] },
    ],
  });

  const [progress, setProgress] = useState<PipelineProgress | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);

  // 监控流水线进度
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (isRunning) {
      intervalId = setInterval(() => {
        const currentProgress = pipelineService.getProgress();
        setProgress(currentProgress);
        if (currentProgress.status === PipelineStatus.COMPLETED || currentProgress.status === PipelineStatus.ERROR) {
          setIsRunning(false);
          clearInterval(intervalId);
        }
      }, 1000);
    }
    return () => clearInterval(intervalId);
  }, [isRunning]);
  
  // 初始化服务
  useEffect(() => {
    pipelineService.initialize();
  }, []);

  // 处理参数变化
  const handleParamChange = (category: keyof PipelineParams, field: string, value: any) => {
    setParams(prev => ({
      ...prev,
      [category]: {
        ...(prev[category] as any),
        [field]: value,
      },
    }));
  };

  // 运行流水线
  const handleRunPipeline = async () => {
    setIsRunning(true);
    setProgress(null);
    try {
      await pipelineService.runPipeline(params);
    } catch (error) {
      console.error('运行流水线时出错:', error);
      // 进度更新将在 interval 中处理
    }
  };

  // 取消流水线
  const handleCancel = () => {
    pipelineService.cancel();
    setIsRunning(false);
  };

  const getActiveStep = () => {
    if (!progress) return 0;
    switch (progress.stage) {
      case PipelineStage.GEOMETRY: return 0;
      case PipelineStage.MESH: return 1;
      case PipelineStage.ANALYSIS: return 2;
      case PipelineStage.RESULTS: return 3;
      default: return 0;
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Grid container spacing={3}>
        {/* 参数设置 */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="参数设置" />
            <CardContent>
              <TextField
                label="模型名称"
                fullWidth
                value={params.geometryParams.modelName}
                onChange={(e) => handleParamChange('geometryParams', 'modelName', e.target.value)}
                margin="normal"
              />
              <TextField
                label="开挖深度 (m)"
                type="number"
                fullWidth
                value={params.geometryParams.excavationDepth}
                onChange={(e) => handleParamChange('geometryParams', 'excavationDepth', parseFloat(e.target.value))}
                margin="normal"
              />
              <FormControl fullWidth margin="normal">
                <InputLabel>分析类型</InputLabel>
                <Select
                  value={params.analysisParams.analysisType}
                  onChange={(e) => handleParamChange('analysisParams', 'analysisType', e.target.value)}
                >
                  <MenuItem value="static">静力分析</MenuItem>
                  <MenuItem value="excavation">开挖分析</MenuItem>
                  <MenuItem value="seepage">渗流分析</MenuItem>
                </Select>
              </FormControl>
               <Typography gutterBottom>网格质量</Typography>
              <Slider
                value={params.meshParams.maxSize || 1.5}
                min={0.5}
                max={5}
                step={0.1}
                onChange={(e, value) => handleParamChange('meshParams', 'maxSize', value)}
                valueLabelDisplay="auto"
                marks={[{value: 0.5, label: '精细'}, {value: 5, label: '粗糙'}]}
              />
            </CardContent>
          </Card>
        </Grid>

        {/* 流水线控制与状态 */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader 
              title="建模与分析流水线"
              action={
                <Box>
                  <Button
                    variant="contained"
                    onClick={handleRunPipeline}
                    disabled={isRunning}
                    sx={{ mr: 1 }}
                  >
                    {isRunning ? <CircularProgress size={24} /> : '运行'}
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    disabled={!isRunning}
                  >
                    取消
                  </Button>
                </Box>
              }
            />
            <CardContent>
              <Stepper activeStep={getActiveStep()} alternativeLabel sx={{ mb: 4 }}>
                <Step>
                  <StepLabel>几何建模</StepLabel>
                </Step>
                <Step>
                  <StepLabel>网格划分</StepLabel>
                </Step>
                <Step>
                  <StepLabel>有限元分析</StepLabel>
                </Step>
                 <Step>
                  <StepLabel>完成</StepLabel>
                </Step>
              </Stepper>
              
              {progress && (
                <Paper elevation={2} sx={{ p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    进度: {progress.status}
                  </Typography>
                  <LinearProgress variant="determinate" value={progress.progress} sx={{ mb: 1 }} />
                  <Typography variant="body2" color="text.secondary">
                    {progress.progress.toFixed(1)}% - {progress.message}
                  </Typography>
                  {progress.status === PipelineStatus.ERROR && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                      {progress.error}
                    </Alert>
                  )}
                   {progress.status === PipelineStatus.COMPLETED && (
                    <Alert severity="success" sx={{ mt: 2 }}>
                      流水线成功完成！
                    </Alert>
                  )}
                </Paper>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ModelingPipelineRunner; 