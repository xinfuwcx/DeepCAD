import React from 'react';
import { Box, Typography, Container, Paper, Grid } from '@mui/material';
import ParameterInversionUI from '../ai/ParameterInversionUI';
import SurrogateModelManager from '../ai/SurrogateModelManager';

/**
 * 物理AI工作台主组件
 */
const PhysicsAIWorkbench: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4, fontWeight: 'bold' }}>
        物理AI工作台
      </Typography>
      
      <Grid container spacing={4}>
        {/* 参数反演工具 */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <ParameterInversionUI />
          </Paper>
        </Grid>
        
        {/* 代理模型管理器 */}
        <Grid item xs={12}>
          <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
            <SurrogateModelManager />
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default PhysicsAIWorkbench; 