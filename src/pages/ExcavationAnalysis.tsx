/**
 * 深基坑分析页面
 * 
 * 集成了模型视图和分析工具
 */

import React from 'react';
import { Box, Grid, Paper, Typography } from '@mui/material';

// 在实际开发中，这些组件会从各自的文件导入
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
    <Typography color="white">3D模型视图</Typography>
  </Box>
);

const AnalysisTools = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>分析工具</Typography>
    <Typography variant="body2">此处将显示分析工具面板</Typography>
  </Paper>
);

const ParameterPanel = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>参数设置</Typography>
    <Typography variant="body2">此处将显示参数设置面板</Typography>
  </Paper>
);

const ResultsPanel = () => (
  <Paper sx={{ p: 2, height: '100%' }}>
    <Typography variant="h6" gutterBottom>分析结果</Typography>
    <Typography variant="body2">此处将显示分析结果</Typography>
  </Paper>
);

const ExcavationAnalysis: React.FC = () => {
  return (
    <Box sx={{ height: 'calc(100vh - 112px)', p: 2 }}>
      <Grid container spacing={2} sx={{ height: '100%' }}>
        {/* 左侧工具面板 */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <Grid container direction="column" spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={6}>
              <AnalysisTools />
            </Grid>
            <Grid item xs={6}>
              <ParameterPanel />
            </Grid>
          </Grid>
        </Grid>
        
        {/* 中间模型视图 */}
        <Grid item xs={12} md={6} sx={{ height: '100%' }}>
          <ModelViewer />
        </Grid>
        
        {/* 右侧结果面板 */}
        <Grid item xs={12} md={3} sx={{ height: '100%' }}>
          <ResultsPanel />
        </Grid>
      </Grid>
    </Box>
  );
};

export default ExcavationAnalysis; 