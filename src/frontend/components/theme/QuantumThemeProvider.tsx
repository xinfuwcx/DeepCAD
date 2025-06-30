import React from 'react';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { quantumTheme } from '../../styles/theme/quantumTheme';

/**
 * 量子主题提供器
 * 为应用程序提供未来科技风量子主题
 */
interface QuantumThemeProviderProps {
  children: React.ReactNode;
}

export const QuantumThemeProvider: React.FC<QuantumThemeProviderProps> = ({ children }) => {
  return (
    <ThemeProvider theme={quantumTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
};

export default QuantumThemeProvider; 