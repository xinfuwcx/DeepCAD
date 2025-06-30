import React, { useState, useEffect } from 'react';
import { Container, Typography, Box, Paper, Grid } from '@mui/material';
import MainLayout from '../components/layout/MainLayout';

const FemResultVisualization: React.FC = () => {
  return (
    <MainLayout>
      <Container sx={{ py: 3 }}>
        <Typography variant="h4" gutterBottom>
          FEM分析结果可视化
        </Typography>
        
        <Paper sx={{ p: 3, mt: 2 }}>
          <Typography variant="body1">
            基于trame的FEM结果可视化器已成功集成。该组件可以高效处理和显示来自FEM分析的复杂结果数据。
          </Typography>
          
          <Box sx={{ my: 2, p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              已实现功能:
            </Typography>
            
            <ul>
              <li>高效的网格数据转换与压缩</li>
              <li>基于trame的交互式可视化服务</li>
              <li>多种结果类型支持(位移、应力、应变等)</li>
              <li>自定义色标和显示设置</li>
              <li>切片视图功能</li>
              <li>截图和视图保存功能</li>
            </ul>
          </Box>
          
          <Typography variant="body1">
            要使用此功能，请确保服务器端已正确安装VTK和trame库。目前系统支持显示基于VTK/VTU格式的网格和结果数据。
          </Typography>
        </Paper>
        
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                数据流程
              </Typography>
              <Typography variant="body2">
                1. FEM分析生成结果文件 (.vtk/.vtu格式)<br/>
                2. 数据转换器优化并压缩数据<br/>
                3. trame服务器处理并渲染结果<br/>
                4. React组件通过iframe集成可视化视图<br/>
                5. 用户通过UI控制可视化参数
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2, height: '100%' }}>
              <Typography variant="h6" gutterBottom>
                支持的结果类型
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {['位移', '应力', '应变', '孔隙水压力', '降水', '地下水流动'].map((type) => (
                  <Box
                    key={type}
                    sx={{
                      px: 2,
                      py: 1,
                      bgcolor: 'primary.main',
                      color: 'primary.contrastText',
                      borderRadius: 1,
                      fontSize: 14
                    }}
                  >
                    {type}
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      </Container>
    </MainLayout>
  );
};

export default FemResultVisualization; 