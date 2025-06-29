import React, { useState } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Tabs, 
  Tab, 
  Paper,
  Grid
} from '@mui/material';
import MainLayout from '../components/layout/MainLayout';
import FEMParameterPanel from '../components/analysis/FEMParameterPanel';
import CouplingAnalysisPanel from '../components/analysis/CouplingAnalysisPanel';
import StagedConstructionPanel from '../components/analysis/StagedConstructionPanel';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`fem-tabpanel-${index}`}
      aria-labelledby={`fem-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `fem-tab-${index}`,
    'aria-controls': `fem-tabpanel-${index}`,
  };
}

const FemAnalysisPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ mt: 3, mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            有限元分析
          </Typography>
          <Typography variant="body1" color="text.secondary">
            基于Kratos多物理场框架的深基坑工程有限元分析功能
          </Typography>
        </Box>

        <Paper sx={{ width: '100%', mb: 4 }}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="FEM analysis tabs"
              variant="scrollable"
              scrollButtons="auto"
            >
              <Tab label="静力分析" {...a11yProps(0)} />
              <Tab label="渗流-结构耦合" {...a11yProps(1)} />
              <Tab label="分步施工模拟" {...a11yProps(2)} />
              <Tab label="非线性分析" {...a11yProps(3)} disabled />
              <Tab label="动力分析" {...a11yProps(4)} disabled />
            </Tabs>
          </Box>
          
          <TabPanel value={activeTab} index={0}>
            <FEMParameterPanel />
          </TabPanel>
          
          <TabPanel value={activeTab} index={1}>
            <CouplingAnalysisPanel />
          </TabPanel>
          
          <TabPanel value={activeTab} index={2}>
            <StagedConstructionPanel />
          </TabPanel>
          
          <TabPanel value={activeTab} index={3}>
            <Box p={4} textAlign="center">
              <Typography variant="h6" color="text.secondary">
                非线性分析功能正在开发中，敬请期待...
              </Typography>
            </Box>
          </TabPanel>
          
          <TabPanel value={activeTab} index={4}>
            <Box p={4} textAlign="center">
              <Typography variant="h6" color="text.secondary">
                动力分析功能正在开发中，敬请期待...
              </Typography>
            </Box>
          </TabPanel>
        </Paper>
      </Container>
    </MainLayout>
  );
};

export default FemAnalysisPage;
