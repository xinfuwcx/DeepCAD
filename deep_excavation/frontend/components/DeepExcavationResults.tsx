import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Tabs, 
  Tab, 
  Paper, 
  Grid, 
  Button, 
  CircularProgress, 
  Alert 
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import deepExcavationService, { DeepExcavationResult } from '../services/deepExcavationService';
import Legend from './Legend';
import VtkResultsViewer from './VtkResultsViewer';
import SeepageAnimation from './SeepageAnimation';

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

interface DeepExcavationResultsProps {
  projectId: string;
}

const DeepExcavationResults: React.FC<DeepExcavationResultsProps> = ({ projectId }) => {
  const [tabValue, setTabValue] = useState(0);
  const [results, setResults] = useState<DeepExcavationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animationFrames, setAnimationFrames] = useState<number[]>([]);

  useEffect(() => {
    const fetchResults = async () => {
      try {
        setLoading(true);
        const data = await deepExcavationService.getAnalysisResults(projectId);
        setResults(data);
        
        // 模拟生成动画帧数据
        if (data.results.seepage?.status === 'completed') {
          const frames = Array.from({ length: 20 }, (_, i) => i * 0.05);
          setAnimationFrames(frames);
        }
        
        setError(null);
      } catch (err: any) {
        setError(err.message || '获取结果失败');
      } finally {
        setLoading(false);
      }
    };

    fetchResults();
  }, [projectId]);

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleDownloadResultFile = async (analysisType: string) => {
    try {
      const blob = await deepExcavationService.getResultFile(projectId, analysisType);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_${analysisType}_results.vtk`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || `下载${analysisType}结果文件失败`);
    }
  };

  const handleExportReport = async () => {
    try {
      const blob = await deepExcavationService.exportReportToPDF(projectId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${projectId}_report.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      setError(err.message || '导出报告失败');
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>加载分析结果中...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!results) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        没有找到分析结果
      </Alert>
    );
  }

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          项目: {results.project_name} - 分析结果
        </Typography>
        <Button 
          variant="contained" 
          startIcon={<PictureAsPdfIcon />}
          onClick={handleExportReport}
        >
          导出报告
        </Button>
      </Box>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
        >
          {results.results.seepage && (
            <Tab label="渗流分析" id="excavation-tab-0" aria-controls="excavation-tabpanel-0" />
          )}
          {results.results.structural && (
            <Tab label="支护结构分析" id="excavation-tab-1" aria-controls="excavation-tabpanel-1" />
          )}
          {results.results.deformation && (
            <Tab label="土体变形分析" id="excavation-tab-2" aria-controls="excavation-tabpanel-2" />
          )}
          {results.results.stability && (
            <Tab label="稳定性分析" id="excavation-tab-3" aria-controls="excavation-tabpanel-3" />
          )}
          {results.results.settlement && (
            <Tab label="沉降分析" id="excavation-tab-4" aria-controls="excavation-tabpanel-4" />
          )}
        </Tabs>
      </Paper>

      {/* 渗流分析结果 */}
      {results.results.seepage && (
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, position: 'relative', height: '500px' }}>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadResultFile('seepage')}
                  >
                    下载结果文件
                  </Button>
                </Box>
                
                {/* 3D渲染区域 */}
                <VtkResultsViewer 
                  resultType="seepage" 
                  resultFile={results.result_files.seepage || ''} 
                />
                
                {/* 动画控制器 */}
                {animationFrames.length > 0 && (
                  <SeepageAnimation 
                    frames={animationFrames} 
                    onFrameChange={(frameIndex) => console.log('Frame changed:', frameIndex)} 
                  />
                )}
                
                {/* 图例 */}
                <Legend 
                  title="水头分布 (m)" 
                  minValue={0} 
                  maxValue={results.results.seepage.max_head_difference || 10} 
                  colorScheme="blueRed" 
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>渗流分析结果</Typography>
                <Typography variant="body1">
                  总流量: {results.results.seepage.total_discharge_m3_per_s?.toFixed(6)} m³/s
                </Typography>
                <Typography variant="body1">
                  最大水头差: {results.results.seepage.max_head_difference?.toFixed(2)} m
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* 支护结构分析结果 */}
      {results.results.structural && (
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, position: 'relative', height: '500px' }}>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadResultFile('structural')}
                  >
                    下载结果文件
                  </Button>
                </Box>
                
                {/* 3D渲染区域 */}
                <VtkResultsViewer 
                  resultType="structural" 
                  resultFile={results.result_files.structural || ''} 
                />
                
                {/* 图例 */}
                <Legend 
                  title="位移 (mm)" 
                  minValue={0} 
                  maxValue={results.results.structural.max_displacement_mm || 20} 
                  colorScheme="rainbow" 
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>支护结构分析结果</Typography>
                <Typography variant="body1">
                  最大位移: {results.results.structural.max_displacement_mm?.toFixed(2)} mm
                </Typography>
                <Typography variant="body1">
                  最大弯矩: {results.results.structural.max_bending_moment_kNm?.toFixed(2)} kN·m
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* 土体变形分析结果 */}
      {results.results.deformation && (
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, position: 'relative', height: '500px' }}>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadResultFile('deformation')}
                  >
                    下载结果文件
                  </Button>
                </Box>
                
                {/* 3D渲染区域 */}
                <VtkResultsViewer 
                  resultType="deformation" 
                  resultFile={results.result_files.deformation || ''} 
                />
                
                {/* 图例 */}
                <Legend 
                  title="变形 (mm)" 
                  minValue={0} 
                  maxValue={Math.max(
                    results.results.deformation.max_vertical_displacement_mm || 0,
                    results.results.deformation.max_horizontal_displacement_mm || 0
                  )} 
                  colorScheme="thermal" 
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>土体变形分析结果</Typography>
                <Typography variant="body1">
                  最大垂直位移: {results.results.deformation.max_vertical_displacement_mm?.toFixed(2)} mm
                </Typography>
                <Typography variant="body1">
                  最大水平位移: {results.results.deformation.max_horizontal_displacement_mm?.toFixed(2)} mm
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* 稳定性分析结果 */}
      {results.results.stability && (
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, position: 'relative', height: '500px' }}>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadResultFile('stability')}
                  >
                    下载结果文件
                  </Button>
                </Box>
                
                {/* 3D渲染区域 */}
                <VtkResultsViewer 
                  resultType="stability" 
                  resultFile={results.result_files.stability || ''} 
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>稳定性分析结果</Typography>
                <Typography variant="body1">
                  安全系数: {results.results.stability.safety_factor?.toFixed(2)}
                </Typography>
                <Typography variant="body1">
                  临界滑动面: {results.results.stability.critical_surface}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      )}

      {/* 沉降分析结果 */}
      {results.results.settlement && (
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Paper sx={{ p: 2, position: 'relative', height: '500px' }}>
                <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                  <Button 
                    variant="outlined" 
                    size="small" 
                    startIcon={<DownloadIcon />}
                    onClick={() => handleDownloadResultFile('settlement')}
                  >
                    下载结果文件
                  </Button>
                </Box>
                
                {/* 3D渲染区域 */}
                <VtkResultsViewer 
                  resultType="settlement" 
                  resultFile={results.result_files.settlement || ''} 
                />
                
                {/* 图例 */}
                <Legend 
                  title="沉降量 (mm)" 
                  minValue={0} 
                  maxValue={results.results.settlement.max_settlement_mm || 50} 
                  colorScheme="thermal" 
                />
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>沉降分析结果</Typography>
                <Typography variant="body1">
                  最大沉降量: {results.results.settlement.max_settlement_mm?.toFixed(2)} mm
                </Typography>
                <Typography variant="body1">
                  影响范围: {results.results.settlement.influence_range_m?.toFixed(2)} m
                </Typography>
              </Paper>
            </Grid>
          </Grid>
        </TabPanel>
      )}
    </Box>
  );
};

export default DeepExcavationResults; 