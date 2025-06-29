import React from 'react';
import { Box, Typography, Container } from '@mui/material';

const SimpleWelcomePage: React.FC = () => {
  return (
    <Container maxWidth="lg">
      <Box sx={{ py: 8, textAlign: 'center' }}>
        <Typography variant="h2" component="h1" gutterBottom>
          深基坑CAE系统
        </Typography>
        <Typography variant="h5" color="text.secondary" gutterBottom>
          专业的深基坑工程建模、计算和分析系统
        </Typography>
        <Typography variant="body1" sx={{ mt: 4 }}>
          系统正在加载中...
        </Typography>
      </Box>
    </Container>
  );
};

export default SimpleWelcomePage;
