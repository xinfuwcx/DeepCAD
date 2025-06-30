import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { theme } from './styles/theme';
import FemResultVisualization from './pages/FemResultVisualization';

function App() {
  return (
    <Router>
      <ThemeProvider theme={theme}>
        <Routes>
          <Route path="/fem-visualization" element={<FemResultVisualization />} />
        </Routes>
      </ThemeProvider>
    </Router>
  );
}

export default App; 