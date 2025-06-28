import React, { useState } from 'react';
import { Box, Grid, Paper, Typography, Tabs, Tab, Button } from '@mui/material';
import ExcavationDiagramViewer from '../components/ExcavationDiagramViewer';
import ResultViewer from '../components/ResultViewer';

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
      id={`excavation-tabpanel-${index}`}
      aria-labelledby={`excavation-tab-${index}`}
      style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 0, height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `excavation-tab-${index}`,
    'aria-controls': `excavation-tabpanel-${index}`,
  };
}

/**
 * 深基坑分析页面
 */
const ExcavationAnalysis: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);

  // 默认土层数据
  const defaultSoilLayers = [
    { depth: 0, thickness: 50, color: '#d9c8b4', name: '填土层' },
    { depth: 50, thickness: 50, color: '#c2a887', name: '粉质粘土' },
    { depth: 100, thickness: 50, color: '#a88c6d', name: '砂层' },
    { depth: 150, thickness: 50, color: '#8d7558', name: '粘土' },
    { depth: 200, thickness: 50, color: '#6e5a42', name: '基岩' }
  ];

  // 默认基坑数据
  const defaultExcavation = {
    width: 300,
    depth: 150
  };

  // 默认水位深度
  const defaultWaterLevel = 80;

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleRunAnalysis = async () => {
    try {
      // 这里应该调用API执行分析
      const response = await fetch('/api/compute/run_analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          soilLayers: defaultSoilLayers,
          excavation: defaultExcavation,
          waterLevel: defaultWaterLevel
        }),
      });

      if (!response.ok) {
        throw new Error('分析请求失败');
      }

      const data = await response.json();
      setAnalysisId(data.analysisId);
      
      // 切换到结果标签页
      setTabValue(1);
    } catch (error) {
      console.error('执行分析失败:', error);
      alert('执行分析失败，请查看控制台获取详细信息');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper elevation={2} sx={{ mb: 2, p: 2 }}>
        <Typography variant="h5" component="h1" gutterBottom>
          深基坑分析
        </Typography>
        <Typography variant="body2" color="text.secondary">
          配置深基坑参数，执行分析并查看结果
        </Typography>
      </Paper>

      <Paper elevation={1} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="excavation analysis tabs">
            <Tab label="模型" {...a11yProps(0)} />
            <Tab label="结果" {...a11yProps(1)} />
          </Tabs>
        </Box>
        
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={2} sx={{ height: '100%' }}>
            <Grid item xs={12} md={8} sx={{ height: '100%' }}>
              <Paper elevation={2} sx={{ height: '100%', p: 1 }}>
                <Typography variant="subtitle1" gutterBottom>
                  深基坑二维示意图
                </Typography>
                <Box sx={{ height: 'calc(100% - 40px)' }}>
                  <ExcavationDiagramViewer 
                    soilLayers={defaultSoilLayers}
                    excavation={defaultExcavation}
                    waterLevel={defaultWaterLevel}
                    showControls={true}
                  />
                </Box>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4} sx={{ height: '100%' }}>
              <Paper elevation={2} sx={{ height: '100%', p: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  分析控制
                </Typography>
                
                <Box sx={{ mt: 2 }}>
                  <Button 
                    variant="contained" 
                    color="primary" 
                    fullWidth 
                    onClick={handleRunAnalysis}
                  >
                    执行分析
                  </Button>
                </Box>
                
                <Box sx={{ mt: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    点击"执行分析"按钮开始计算。计算完成后，将自动切换到结果标签页查看分析结果。
                  </Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
        
        <TabPanel value={tabValue} index={1}>
          <Box sx={{ height: '100%', p: 1 }}>
            <Typography variant="subtitle1" gutterBottom>
              分析结果
            </Typography>
            <Box sx={{ height: 'calc(100% - 40px)' }}>
              <ResultViewer 
                analysisId={analysisId} 
                showControls={true}
              />
            </Box>
          </Box>
        </TabPanel>
      </Paper>
    </Box>
  );
};

export default ExcavationAnalysis; 