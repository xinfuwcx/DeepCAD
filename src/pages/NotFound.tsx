/**
 * 404页面
 */

import React from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        textAlign: 'center',
        p: 4,
      }}
    >
      <Typography variant="h1" color="primary" sx={{ fontSize: '6rem', fontWeight: 700 }}>
        404
      </Typography>
      
      <Typography variant="h4" sx={{ mt: 2, mb: 4 }}>
        页面未找到
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: '600px' }}>
        您请求的页面不存在或已被移除。请检查URL是否正确，或返回首页继续浏览。
      </Typography>
      
      <Button
        component={Link}
        to="/"
        variant="contained"
        color="primary"
        size="large"
      >
        返回首页
      </Button>
    </Box>
  );
};

export default NotFound; 