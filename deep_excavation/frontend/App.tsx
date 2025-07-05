import React from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import MainPage from './pages/MainPage';

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#1565C0',
      light: '#1E88E5',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#26A69A',
      light: '#4DB6AC',
      dark: '#00897B',
    },
    error: {
      main: '#D32F2F',
    },
    warning: {
      main: '#FFA000',
    },
    info: {
      main: '#1E88E5',
    },
    success: {
      main: '#2E7D32',
    },
    background: {
      default: '#263238',
      paper: '#37474F',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 600,
    },
    h2: {
      fontWeight: 600,
    },
    h3: {
      fontWeight: 500,
    },
    h4: {
      fontWeight: 500,
    },
    button: {
      fontWeight: 500,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.2)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <MainPage />
    </ThemeProvider>
  );
}

export default App;
