import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  Checkbox,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import SettingsIcon from '@mui/icons-material/Settings';
import SaveIcon from '@mui/icons-material/Save';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import MemoryIcon from '@mui/icons-material/Memory';
import TimelineIcon from '@mui/icons-material/Timeline';
import BarChartIcon from '@mui/icons-material/BarChart';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`analysis-tabpanel-${index}`}
      aria-labelledby={`analysis-tab-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ p: 1, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `analysis-tab-${index}`,
    'aria-controls': `analysis-tabpanel-${index}`,
  };
}

const AnalysisPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysisType, setAnalysisType] = useState('mechanical');
  const [inverseMethod, setInverseMethod] = useState('gradient');
  const [selectedMesh, setSelectedMesh] = useState('mesh-1');
  
  // 正向分析设置
  const [forwardSettings, setForwardSettings] = useState({
    solver: 'direct',
    iterations: 100,
    tolerance: 1e-6,
    timesteps: 10,
    nonlinear: true,
    gravity: true,
    initialStress: true,
    dampingRatio: 0.05,
  });
  
  // 反演分析设置
  const [inverseSettings, setInverseSettings] = useState({
    method: 'gradient',
    maxIterations: 50,
    tolerance: 1e-4,
    regularization: 0.01,
    learningRate: 0.1,
    batchSize: 5,
    useGPU: true,
  });
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleRunAnalysis = () => {
    setIsRunning(true);
    setProgress(0);
    
    // 模拟分析进度
    const interval = setInterval(() => {
      setProgress(prev => {
        const newProgress = prev + (Math.random() * 5);
        if (newProgress >= 100) {
          clearInterval(interval);
          setIsRunning(false);
          return 100;
        }
        return newProgress;
      });
    }, 500);
  };
  
  const handleStopAnalysis = () => {
    setIsRunning(false);
  };
  
  const handleForwardSettingChange = (key: string, value: any) => {
    setForwardSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  const handleInverseSettingChange = (key: string, value: any) => {
    setInverseSettings(prev => ({
      ...prev,
      [key]: value
    }));
  };
  
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="analysis tabs">
          <Tab label="FEM分析" {...a11yProps(0)} />
          <Tab label="物理AI" {...a11yProps(1)} />
        </Tabs>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 正向分析设置 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              分析类型
            </Typography>
            
            <FormControl component="fieldset">
              <RadioGroup
                row
                value={analysisType}
                onChange={(e) => setAnalysisType(e.target.value)}
              >
                <FormControlLabel value="mechanical" control={<Radio />} label="固体力学分析" />
                <FormControlLabel value="seepage" control={<Radio />} label="渗流分析" />
                <FormControlLabel value="coupled" control={<Radio />} label="耦合分析" />
              </RadioGroup>
            </FormControl>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="mesh-select-label">选择网格</InputLabel>
                  <Select
                    labelId="mesh-select-label"
                    value={selectedMesh}
                    label="选择网格"
                    onChange={(e) => setSelectedMesh(e.target.value)}
                  >
                    <MenuItem value="mesh-1">标准三维网格 (45,678 单元)</MenuItem>
                    <MenuItem value="mesh-2">精细化网格 (123,456 单元)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="solver-select-label">求解器</InputLabel>
                  <Select
                    labelId="solver-select-label"
                    value={forwardSettings.solver}
                    label="求解器"
                    onChange={(e) => handleForwardSettingChange('solver', e.target.value)}
                  >
                    <MenuItem value="direct">直接求解器 (MUMPS)</MenuItem>
                    <MenuItem value="iterative">迭代求解器 (CG)</MenuItem>
                    <MenuItem value="amg">代数多重网格 (AMG)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* 高级设置 */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>高级求解设置</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="最大迭代次数"
                    type="number"
                    value={forwardSettings.iterations}
                    onChange={(e) => handleForwardSettingChange('iterations', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="收敛容差"
                    type="number"
                    value={forwardSettings.tolerance}
                    onChange={(e) => handleForwardSettingChange('tolerance', parseFloat(e.target.value))}
                    inputProps={{ step: '1e-7' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="时间步数"
                    type="number"
                    value={forwardSettings.timesteps}
                    onChange={(e) => handleForwardSettingChange('timesteps', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="阻尼比"
                    type="number"
                    value={forwardSettings.dampingRatio}
                    onChange={(e) => handleForwardSettingChange('dampingRatio', parseFloat(e.target.value))}
                    inputProps={{ step: '0.01' }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={forwardSettings.nonlinear}
                        onChange={(e) => handleForwardSettingChange('nonlinear', e.target.checked)}
                      />
                    }
                    label="启用非线性分析"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={forwardSettings.gravity}
                        onChange={(e) => handleForwardSettingChange('gravity', e.target.checked)}
                      />
                    }
                    label="考虑重力作用"
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={forwardSettings.initialStress}
                        onChange={(e) => handleForwardSettingChange('initialStress', e.target.checked)}
                      />
                    }
                    label="考虑初始应力状态"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          
          {/* 运行控制 */}
          <Box sx={{ mt: 'auto', pt: 2 }}>
            {isRunning && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">
                    正在计算... {Math.round(progress)}%
                  </Typography>
                  <Typography variant="caption">
                    剩余时间: 约 {Math.ceil((100 - progress) / 10)} 分钟
                  </Typography>
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<SaveIcon />}
                disabled={isRunning}
              >
                保存设置
              </Button>
              
              {isRunning ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopAnalysis}
                >
                  停止计算
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunAnalysis}
                >
                  开始计算
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* 反演分析设置 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" gutterBottom>
              反演分析设置
              <Tooltip title="基于PDE约束的反演优化分析，可用于参数识别和设计优化">
                <IconButton size="small">
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Typography>
            
            <FormControl component="fieldset">
              <FormLabel component="legend">优化方法</FormLabel>
              <RadioGroup
                row
                value={inverseSettings.method}
                onChange={(e) => handleInverseSettingChange('method', e.target.value)}
              >
                <FormControlLabel value="gradient" control={<Radio />} label="梯度下降" />
                <FormControlLabel value="lbfgs" control={<Radio />} label="L-BFGS" />
                <FormControlLabel value="bayesian" control={<Radio />} label="贝叶斯优化" />
              </RadioGroup>
            </FormControl>
            
            <Divider sx={{ my: 2 }} />
            
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="inverse-problem-label">反演问题类型</InputLabel>
                  <Select
                    labelId="inverse-problem-label"
                    value="material"
                    label="反演问题类型"
                  >
                    <MenuItem value="material">材料参数识别</MenuItem>
                    <MenuItem value="boundary">边界条件识别</MenuItem>
                    <MenuItem value="geometry">几何形状优化</MenuItem>
                    <MenuItem value="support">支护结构优化</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel id="observation-data-label">观测数据</InputLabel>
                  <Select
                    labelId="observation-data-label"
                    value="displacement"
                    label="观测数据"
                  >
                    <MenuItem value="displacement">位移监测数据</MenuItem>
                    <MenuItem value="strain">应变监测数据</MenuItem>
                    <MenuItem value="pressure">水压监测数据</MenuItem>
                    <MenuItem value="mixed">混合监测数据</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
          
          {/* 高级优化设置 */}
          <Accordion sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography>高级优化设置</Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="最大迭代次数"
                    type="number"
                    value={inverseSettings.maxIterations}
                    onChange={(e) => handleInverseSettingChange('maxIterations', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="收敛容差"
                    type="number"
                    value={inverseSettings.tolerance}
                    onChange={(e) => handleInverseSettingChange('tolerance', parseFloat(e.target.value))}
                    inputProps={{ step: '1e-5' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="正则化参数"
                    type="number"
                    value={inverseSettings.regularization}
                    onChange={(e) => handleInverseSettingChange('regularization', parseFloat(e.target.value))}
                    inputProps={{ step: '0.001' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="学习率"
                    type="number"
                    value={inverseSettings.learningRate}
                    onChange={(e) => handleInverseSettingChange('learningRate', parseFloat(e.target.value))}
                    inputProps={{ step: '0.01' }}
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    size="small"
                    label="批次大小"
                    type="number"
                    value={inverseSettings.batchSize}
                    onChange={(e) => handleInverseSettingChange('batchSize', parseInt(e.target.value))}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={inverseSettings.useGPU}
                        onChange={(e) => handleInverseSettingChange('useGPU', e.target.checked)}
                      />
                    }
                    label="使用GPU加速"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>
          
          {/* 优化目标 */}
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              优化目标
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <Chip icon={<TrendingUpIcon />} label="最小化监测误差" color="primary" />
              <Chip icon={<BarChartIcon />} label="参数平滑约束" variant="outlined" />
            </Stack>
            
            <Alert severity="info" sx={{ mt: 1 }}>
              反演分析可能需要较长计算时间，建议使用GPU加速。
            </Alert>
          </Paper>
          
          {/* 运行控制 */}
          <Box sx={{ mt: 'auto', pt: 2 }}>
            {isRunning && (
              <Box sx={{ mb: 2 }}>
                <LinearProgress variant="determinate" value={progress} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="caption">
                    正在优化... {Math.round(progress)}%
                  </Typography>
                  <Typography variant="caption">
                    剩余时间: 约 {Math.ceil((100 - progress) / 5)} 分钟
                  </Typography>
                </Box>
              </Box>
            )}
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                variant="outlined"
                startIcon={<MemoryIcon />}
                disabled={isRunning}
              >
                加载观测数据
              </Button>
              
              {isRunning ? (
                <Button
                  variant="contained"
                  color="error"
                  startIcon={<StopIcon />}
                  onClick={handleStopAnalysis}
                >
                  停止优化
                </Button>
              ) : (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<PlayArrowIcon />}
                  onClick={handleRunAnalysis}
                >
                  开始优化
                </Button>
              )}
            </Box>
          </Box>
        </Box>
      </TabPanel>
    </Box>
  );
};

export default AnalysisPanel; 