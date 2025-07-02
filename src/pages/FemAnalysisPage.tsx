/**
 * 有限元分析页面
 * 
 * 提供有限元分析设置和结果可视化
 */

import React, { useState } from 'react';
import { 
  Box, 
  Grid, 
  Paper, 
  Typography, 
  Tabs, 
  Tab, 
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Divider
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import SaveIcon from '@mui/icons-material/Save';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 标签面板组件
const TabPanel = (props: TabPanelProps) => {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fem-tabpanel-${index}`}
      aria-labelledby={`fem-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 2, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
};

// 模型视图组件
const ModelViewer = () => (
  <Box 
    sx={{ 
      height: '100%', 
      bgcolor: '#1A1A2E', 
      borderRadius: 1,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}
  >
    <Typography color="white">有限元模型视图</Typography>
  </Box>
);

// 分析设置面板
const AnalysisSettingsPanel = () => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom>分析类型</Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>选择分析类型</InputLabel>
        <Select
          label="选择分析类型"
          defaultValue="static"
        >
          <MenuItem value="static">静力分析</MenuItem>
          <MenuItem value="dynamic">动力分析</MenuItem>
          <MenuItem value="seepage">渗流分析</MenuItem>
          <MenuItem value="consolidation">固结分析</MenuItem>
        </Select>
      </FormControl>
      
      <Typography variant="subtitle1" gutterBottom>材料参数</Typography>
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="弹性模量 (MPa)"
            defaultValue="30000"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="泊松比"
            defaultValue="0.3"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="密度 (kg/m³)"
            defaultValue="2500"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="内摩擦角 (°)"
            defaultValue="30"
          />
        </Grid>
      </Grid>
      
      <Typography variant="subtitle1" gutterBottom>边界条件</Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>边界类型</InputLabel>
        <Select
          label="边界类型"
          defaultValue="fixed"
        >
          <MenuItem value="fixed">固定边界</MenuItem>
          <MenuItem value="roller">滚动支撑</MenuItem>
          <MenuItem value="spring">弹性支撑</MenuItem>
        </Select>
      </FormControl>
      
      <Typography variant="subtitle1" gutterBottom>求解设置</Typography>
      <Grid container spacing={2}>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="最大迭代次数"
            defaultValue="100"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            fullWidth
            size="small"
            label="收敛容差"
            defaultValue="1e-6"
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PlayArrowIcon />}
          fullWidth
        >
          开始分析
        </Button>
      </Box>
    </Box>
  );
};

// 结果可视化面板
const ResultsVisualizationPanel = () => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom>结果类型</Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>选择结果类型</InputLabel>
        <Select
          label="选择结果类型"
          defaultValue="displacement"
        >
          <MenuItem value="displacement">位移</MenuItem>
          <MenuItem value="stress">应力</MenuItem>
          <MenuItem value="strain">应变</MenuItem>
          <MenuItem value="force">内力</MenuItem>
        </Select>
      </FormControl>
      
      <Typography variant="subtitle1" gutterBottom>显示设置</Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>显示模式</InputLabel>
        <Select
          label="显示模式"
          defaultValue="contour"
        >
          <MenuItem value="contour">云图</MenuItem>
          <MenuItem value="vector">矢量图</MenuItem>
          <MenuItem value="deformed">变形图</MenuItem>
        </Select>
      </FormControl>
      
      <Typography variant="subtitle1" gutterBottom>结果组件</Typography>
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>选择组件</InputLabel>
        <Select
          label="选择组件"
          defaultValue="magnitude"
        >
          <MenuItem value="magnitude">合量</MenuItem>
          <MenuItem value="x">X方向</MenuItem>
          <MenuItem value="y">Y方向</MenuItem>
          <MenuItem value="z">Z方向</MenuItem>
        </Select>
      </FormControl>
      
      <Divider sx={{ my: 2 }} />
      
      <Typography variant="subtitle1" gutterBottom>结果统计</Typography>
      <Grid container spacing={1}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">最大值:</Typography>
          <Typography variant="body2">0.0254 m</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">最小值:</Typography>
          <Typography variant="body2">0.0000 m</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">平均值:</Typography>
          <Typography variant="body2">0.0127 m</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">标准差:</Typography>
          <Typography variant="body2">0.0074 m</Typography>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 'auto', pt: 2, display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          startIcon={<SaveIcon />}
          fullWidth
        >
          导出结果
        </Button>
      </Box>
    </Box>
  );
};

// 计算监控面板
const ComputationMonitorPanel = () => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="subtitle1" gutterBottom>计算状态</Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 2 }}>
        <Typography variant="body2" color="success.main">
          计算进行中... (67%)
        </Typography>
      </Paper>
      
      <Typography variant="subtitle1" gutterBottom>迭代信息</Typography>
      <Paper 
        variant="outlined" 
        sx={{ 
          p: 1, 
          mb: 2, 
          height: '150px', 
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '0.75rem'
        }}
      >
        <Box component="pre" sx={{ m: 0 }}>
          {`Iteration 1: Residual = 1.2e-2
Iteration 2: Residual = 8.5e-3
Iteration 3: Residual = 5.2e-3
Iteration 4: Residual = 3.1e-3
Iteration 5: Residual = 1.8e-3
Iteration 6: Residual = 9.7e-4
Iteration 7: Residual = 5.4e-4
Iteration 8: Residual = 2.9e-4
Iteration 9: Residual = 1.5e-4
Iteration 10: Residual = 8.2e-5`}
        </Box>
      </Paper>
      
      <Typography variant="subtitle1" gutterBottom>资源使用</Typography>
      <Grid container spacing={1} sx={{ mb: 2 }}>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">CPU使用率:</Typography>
          <Typography variant="body2">87%</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">内存使用:</Typography>
          <Typography variant="body2">2.4 GB</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">已用时间:</Typography>
          <Typography variant="body2">00:03:45</Typography>
        </Grid>
        <Grid item xs={6}>
          <Typography variant="caption" color="text.secondary">预计剩余:</Typography>
          <Typography variant="body2">00:01:52</Typography>
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 'auto', pt: 2 }}>
        <Button
          variant="contained"
          color="error"
          startIcon={<StopIcon />}
          fullWidth
        >
          停止计算
        </Button>
      </Box>
    </Box>
  );
};

const FemAnalysisPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ height: 'calc(100vh - 112px)', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* 左侧设置面板 */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <Paper sx={{ height: '100%', overflow: 'hidden' }}>
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="设置" />
              <Tab label="结果" />
              <Tab label="监控" />
            </Tabs>
            
            <Box sx={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
              <TabPanel value={tabValue} index={0}>
                <AnalysisSettingsPanel />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <ResultsVisualizationPanel />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <ComputationMonitorPanel />
              </TabPanel>
            </Box>
          </Paper>
        </Grid>
        
        {/* 中间模型视图 */}
        <Grid item xs={12} md={9} sx={{ height: '100%' }}>
          <ModelViewer />
        </Grid>
      </Grid>
    </Box>
  );
};

export default FemAnalysisPage; 