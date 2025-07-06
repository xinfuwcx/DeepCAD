import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import MainPage from './pages/MainPage';
import { ErrorBoundary } from './components/common/ErrorBoundary';

// 增强的主题配置
const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1565C0',
      light: '#42A5F5',
      dark: '#0D47A1',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#26A69A',
      light: '#4DB6AC',
      dark: '#00695C',
      contrastText: '#ffffff',
    },
    error: {
      main: '#F44336',
      light: '#EF5350',
      dark: '#D32F2F',
    },
    warning: {
      main: '#FF9800',
      light: '#FFB74D',
      dark: '#F57C00',
    },
    info: {
      main: '#29B6F6',
      light: '#4FC3F7',
      dark: '#0288D1',
    },
    success: {
      main: '#66BB6A',
      light: '#81C784',
      dark: '#388E3C',
    },
    background: {
      default: '#263238',
      paper: '#37474F',
    },
    text: {
      primary: 'rgba(255, 255, 255, 0.95)',
      secondary: 'rgba(255, 255, 255, 0.7)',
    },
    divider: 'rgba(255, 255, 255, 0.12)',
  },
  typography: {
    fontFamily: '"Inter", "SF Pro Display", "Segoe UI", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      letterSpacing: '-0.02em',
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: 1.3,
      letterSpacing: '-0.01em',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.4,
    },
    h4: {
      fontWeight: 500,
      fontSize: '1.5rem',
      lineHeight: 1.4,
    },
    h5: {
      fontWeight: 500,
      fontSize: '1.25rem',
      lineHeight: 1.5,
    },
    h6: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle1: {
      fontWeight: 500,
      fontSize: '1rem',
      lineHeight: 1.5,
    },
    subtitle2: {
      fontWeight: 500,
      fontSize: '0.875rem',
      lineHeight: 1.57,
    },
    body1: {
      fontWeight: 400,
      fontSize: '1rem',
      lineHeight: 1.6,
    },
    body2: {
      fontWeight: 400,
      fontSize: '0.875rem',
      lineHeight: 1.6,
    },
    button: {
      fontWeight: 500,
      fontSize: '0.875rem',
      textTransform: 'none',
      letterSpacing: '0.02em',
    },
    caption: {
      fontWeight: 400,
      fontSize: '0.75rem',
      lineHeight: 1.6,
    },
  },
  shape: {
    borderRadius: 12,
  },
  spacing: 8,
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: '#455A64 #263238',
          '&::-webkit-scrollbar, & *::-webkit-scrollbar': {
            width: 8,
            height: 8,
          },
          '&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb': {
            borderRadius: 8,
            backgroundColor: '#455A64',
            border: '1px solid #37474F',
          },
          '&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus': {
            backgroundColor: '#546E7A',
          },
          '&::-webkit-scrollbar-thumb:active, & *::-webkit-scrollbar-thumb:active': {
            backgroundColor: '#546E7A',
          },
          '&::-webkit-scrollbar-thumb:hover, & *::-webkit-scrollbar-thumb:hover': {
            backgroundColor: '#546E7A',
          },
          '&::-webkit-scrollbar-track, & *::-webkit-scrollbar-track': {
            backgroundColor: '#263238',
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
          padding: '8px 16px',
          boxShadow: 'none',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
        contained: {
          background: 'linear-gradient(135deg, #1565C0 0%, #1E88E5 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1976D2 0%, #2196F3 100%)',
          },
        },
        outlined: {
          borderColor: 'rgba(255, 255, 255, 0.23)',
          '&:hover': {
            borderColor: '#1565C0',
            backgroundColor: 'rgba(21, 101, 192, 0.08)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#37474F',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        elevation1: {
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
        elevation2: {
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)',
        },
        elevation3: {
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.25)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid rgba(255, 255, 255, 0.12)',
          backdropFilter: 'blur(10px)',
          background: 'rgba(55, 71, 79, 0.8)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            borderColor: 'rgba(255, 255, 255, 0.2)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          fontWeight: 500,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
          },
        },
        filled: {
          background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.2) 0%, rgba(38, 166, 154, 0.2) 100%)',
          border: '1px solid rgba(21, 101, 192, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, rgba(21, 101, 192, 0.3) 0%, rgba(38, 166, 154, 0.3) 100%)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRight: '1px solid rgba(255, 255, 255, 0.12)',
          background: 'rgba(38, 50, 56, 0.95)',
          backdropFilter: 'blur(10px)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: 'rgba(38, 50, 56, 0.95)',
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: 'rgba(255, 255, 255, 0.4)',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#1565C0',
              borderWidth: 2,
            },
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: 'rgba(38, 50, 56, 0.95)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: 8,
          fontSize: '0.75rem',
        },
        arrow: {
          color: 'rgba(38, 50, 56, 0.95)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          background: 'rgba(55, 71, 79, 0.95)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          margin: '2px 8px',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            transform: 'translateX(4px)',
          },
          '&.Mui-selected': {
            backgroundColor: 'rgba(21, 101, 192, 0.2)',
            borderLeft: '3px solid #1565C0',
            '&:hover': {
              backgroundColor: 'rgba(21, 101, 192, 0.3)',
            },
          },
        },
      },
    },
  },
});

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <MainPage />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
