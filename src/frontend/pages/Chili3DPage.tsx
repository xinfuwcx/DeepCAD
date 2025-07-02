import React from 'react';
import { Container, Box, Typography, Paper } from '@mui/material';
import Chili3DVisualizer from '../components/chili3d/Chili3DVisualizer';

const Chili3DPage: React.FC = () => {
  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          基坑工程3D可视化分析
        </Typography>
        <Typography variant="body1" color="text.secondary">
          通过Chili3D查看和分析基坑工程的三维模型与计算结果
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 4 }}>
        <Chili3DVisualizer />
      </Paper>
    </Container>
  );
};

export default Chili3DPage;