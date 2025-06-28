import React from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { AccountTreeOutlined } from '@mui/icons-material';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  showText?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', showText = true }) => {
  const theme = useTheme();
  
  const sizes = {
    small: { icon: 24, text: '1rem' },
    medium: { icon: 36, text: '1.25rem' },
    large: { icon: 48, text: '1.5rem' },
  };
  
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Box
        sx={{
          backgroundColor: 'primary.main',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '8px',
          boxShadow: 2,
        }}
      >
        <AccountTreeOutlined
          sx={{ 
            fontSize: sizes[size].icon, 
            color: 'white',
          }}
        />
      </Box>
      {showText && (
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            fontSize: sizes[size].text,
            fontWeight: 'bold',
            color: theme.palette.primary.main,
            flexGrow: 1
          }}
        >
          深基坑<span style={{ fontWeight: 'normal' }}>CAE系统</span>
        </Typography>
      )}
    </Box>
  );
};

export default Logo; 