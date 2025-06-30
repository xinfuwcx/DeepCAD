/**
 * @file SensitivityAnalysisPanel.tsx
 * @description 参数敏感性分析界面 - 基于Cursor团队协作开发
 * 🔬 基于sensitivity_analyzer.py的前端界面实现
 * @author Deep Excavation Team × Cursor Team
 * @version 1.0.0 - Cursor协作版
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Grid,
  Chip,
  CircularProgress,
  Alert,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Tooltip,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Download,
  Settings,
  BarChart,
  TrendingUp,
  Assessment,
  Close,
  Refresh,
  RadioButtonChecked,
  Timeline
} from '@mui/icons-material';

// 🎨 样式组件
import GlassmorphismCard from '../ui/GlassmorphismCard';

// 🔧 数据接口
interface SensitivityParameter {
  name: string;
  displayName: string;
  lowerBound: number;
  upperBound: number;
  currentValue: number;
  distribution?: 'uniform' | 'normal' | 'lognormal';
}

interface SensitivityResult {
  parameter: string;
  sensitivity: number;
  confidence: number;
  rank: number;
  morrisMetrics?: {
    mu: number;
    sigma: number;
    muStar: number;
  };
}

interface SensitivityAnalysisPanelProps {
  projectId?: number;
  onResultsChange?: (results: SensitivityResult[]) => void;
}

// 🎨 量子色彩主题
const quantumColors = {
  primary: '#667eea',
  secondary: '#764ba2',
  accent: '#f093fb',
  warning: '#ff6600',
  success: '#39ff14',
  error: '#ff0080',
  background: 'rgba(255, 255, 255, 0.05)',
  glass: 'rgba(255, 255, 255, 0.08)'
};

const SensitivityAnalysisPanel: React.FC<SensitivityAnalysisPanelProps> = ({ 
  projectId = 1,
  onResultsChange 
}) => {
  // 📊 状态管理
  const [parameters, setParameters] = useState<SensitivityParameter[]>([
    {
      name: 'youngs_modulus',
      displayName: '弹性模量 (MPa)',
      lowerBound: 10000,
      upperBound: 50000,
      currentValue: 20000,
      distribution: 'normal'
    },
    {
      name: 'poisson_ratio',
      displayName: '泊松比',
      lowerBound: 0.2,
      upperBound: 0.4,
      currentValue: 0.3,
      distribution: 'uniform'
    },
    {
      name: 'cohesion',
      displayName: '粘聚力 (kPa)',
      lowerBound: 10,
      upperBound: 100,
      currentValue: 30,
      distribution: 'lognormal'
    },
    {
      name: 'friction_angle',
      displayName: '内摩擦角 (°)',
      lowerBound: 25,
      upperBound: 45,
      currentValue: 35,
      distribution: 'normal'
    }
  ]);

  const [analysisMethod, setAnalysisMethod] = useState<'basic' | 'morris' | 'sobol'>('morris');
  const [sampleSize, setSampleSize] = useState<number>(1000);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<SensitivityResult[]>([]);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [analysisId, setAnalysisId] = useState<string | null>(null);

  // 🔌 WebSocket连接 - 实时进度更新
  useEffect(() => {
    if (isAnalyzing && analysisId) {
      const ws = new WebSocket(`ws://localhost:8000/api/ai/sensitivity/progress`);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.analysis_id === analysisId) {
          setProgress(data.progress);
          if (data.status === 'completed') {
            setIsAnalyzing(false);
            fetchResults(analysisId);
          }
        }
      };

      return () => ws.close();
    }
  }, [isAnalyzing, analysisId]);

  // 🚀 开始敏感性分析
  const startAnalysis = async () => {
    try {
      setIsAnalyzing(true);
      setProgress(0);

      const response = await fetch('/api/ai/sensitivity/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectId,
          parameters: parameters.map(p => ({
            name: p.name,
            lower_bound: p.lowerBound,
            upper_bound: p.upperBound,
            distribution: p.distribution
          })),
          analysis_options: {
            method: analysisMethod,
            sample_size: sampleSize,
            confidence_level: 0.95
          }
        })
      });

      const data = await response.json();
      setAnalysisId(data.analysis_id);
    } catch (error) {
      console.error('启动敏感性分析失败:', error);
      setIsAnalyzing(false);
    }
  };

  // 📊 获取分析结果
  const fetchResults = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/sensitivity/results/${id}`);
      const data = await response.json();
      
      const formattedResults: SensitivityResult[] = data.results.map((result: any, index: number) => ({
        parameter: result.parameter,
        sensitivity: result.sensitivity_index,
        confidence: result.confidence,
        rank: index + 1,
        morrisMetrics: result.morris_metrics
      }));

      setResults(formattedResults);
      if (onResultsChange) {
        onResultsChange(formattedResults);
      }
    } catch (error) {
      console.error('获取敏感性分析结果失败:', error);
    }
  };

  // 🎨 渲染敏感性图表
  const renderSensitivityChart = () => {
    const chartData = results.map(result => ({
      name: parameters.find(p => p.name === result.parameter)?.displayName || result.parameter,
      sensitivity: result.sensitivity,
      confidence: result.confidence
    }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <RechartsBarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis dataKey="name" stroke="#ffffff" fontSize={12} />
          <YAxis stroke="#ffffff" fontSize={12} />
          <RechartsTooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px'
            }} 
          />
          <Bar dataKey="sensitivity" fill={quantumColors.primary} radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  };

  // 🎨 渲染Morris散点图
  const renderMorrisPlot = () => {
    if (analysisMethod !== 'morris' || !results.some(r => r.morrisMetrics)) {
      return null;
    }

    const morrisData = results
      .filter(r => r.morrisMetrics)
      .map(result => ({
        name: parameters.find(p => p.name === result.parameter)?.displayName || result.parameter,
        mu: result.morrisMetrics!.mu,
        sigma: result.morrisMetrics!.sigma,
        muStar: result.morrisMetrics!.muStar
      }));

    return (
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart data={morrisData}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis 
            dataKey="muStar" 
            stroke="#ffffff" 
            fontSize={12}
            label={{ value: 'μ* (主效应)', position: 'insideBottom', offset: -10 }}
          />
          <YAxis 
            dataKey="sigma" 
            stroke="#ffffff" 
            fontSize={12}
            label={{ value: 'σ (交互效应)', angle: -90, position: 'insideLeft' }}
          />
          <RechartsTooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(0,0,0,0.8)', 
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px'
            }}
            formatter={(value, name, props) => [
              `${value?.toFixed(4)}`,
              name === 'muStar' ? 'μ*' : 'σ'
            ]}
            labelFormatter={(label) => `参数: ${label}`}
          />
          <Scatter dataKey="sigma" fill={quantumColors.accent} />
        </ScatterChart>
      </ResponsiveContainer>
    );
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* 🎛️ 控制面板 */}
      <GlassmorphismCard sx={{ mb: 3, background: quantumColors.glass }}>
        <CardContent>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
            <Typography variant="h5" sx={{ 
              background: `linear-gradient(135deg, ${quantumColors.primary}, ${quantumColors.accent})`,
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              fontWeight: 'bold'
            }}>
              🔬 参数敏感性分析
            </Typography>
            
            <Box display="flex" gap={2}>
              <Tooltip title="分析设置">
                <IconButton onClick={() => setShowSettings(true)} sx={{ color: quantumColors.primary }}>
                  <Settings />
                </IconButton>
              </Tooltip>
              
              <Button
                variant="contained"
                startIcon={isAnalyzing ? <Stop /> : <PlayArrow />}
                onClick={isAnalyzing ? () => setIsAnalyzing(false) : startAnalysis}
                disabled={parameters.length === 0}
                sx={{
                  background: `linear-gradient(135deg, ${quantumColors.primary}, ${quantumColors.secondary})`,
                  color: 'white',
                  '&:hover': {
                    background: `linear-gradient(135deg, ${quantumColors.secondary}, ${quantumColors.primary})`
                  }
                }}
              >
                {isAnalyzing ? '停止分析' : '开始分析'}
              </Button>
            </Box>
          </Box>

          {/* 📊 分析进度 */}
          {isAnalyzing && (
            <Box mb={3}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="body2" color="text.secondary">
                  分析进度: {Math.round(progress)}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  方法: {analysisMethod.toUpperCase()} | 样本数: {sampleSize}
                </Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={progress} 
                sx={{
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  '& .MuiLinearProgress-bar': {
                    background: `linear-gradient(90deg, ${quantumColors.primary}, ${quantumColors.accent})`
                  }
                }}
              />
            </Box>
          )}

          {/* 📈 快速统计 */}
          {results.length > 0 && (
            <Grid container spacing={2} mb={3}>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <Typography variant="h6" color={quantumColors.success}>
                    {results.length}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    分析参数
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <Typography variant="h6" color={quantumColors.primary}>
                    {Math.max(...results.map(r => r.sensitivity)).toFixed(3)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    最大敏感性
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <Typography variant="h6" color={quantumColors.accent}>
                    {(results.reduce((sum, r) => sum + r.confidence, 0) / results.length).toFixed(2)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    平均置信度
                  </Typography>
                </Paper>
              </Grid>
              <Grid item xs={3}>
                <Paper sx={{ p: 2, background: 'rgba(255,255,255,0.05)', textAlign: 'center' }}>
                  <Typography variant="h6" color={quantumColors.warning}>
                    {analysisMethod.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    分析方法
                  </Typography>
                </Paper>
              </Grid>
            </Grid>
          )}
        </CardContent>
      </GlassmorphismCard>

      {/* 📊 结果可视化 */}
      {results.length > 0 && (
        <Grid container spacing={3}>
          {/* 敏感性柱状图 */}
          <Grid item xs={12} md={6}>
            <GlassmorphismCard sx={{ background: quantumColors.glass }}>
              <CardContent>
                <Typography variant="h6" mb={2} sx={{ color: quantumColors.primary }}>
                  📊 敏感性指标
                </Typography>
                {renderSensitivityChart()}
              </CardContent>
            </GlassmorphismCard>
          </Grid>

          {/* Morris散点图 */}
          {analysisMethod === 'morris' && (
            <Grid item xs={12} md={6}>
              <GlassmorphismCard sx={{ background: quantumColors.glass }}>
                <CardContent>
                  <Typography variant="h6" mb={2} sx={{ color: quantumColors.accent }}>
                    🎯 Morris分析
                  </Typography>
                  {renderMorrisPlot()}
                </CardContent>
              </GlassmorphismCard>
            </Grid>
          )}

          {/* 结果表格 */}
          <Grid item xs={12}>
            <GlassmorphismCard sx={{ background: quantumColors.glass }}>
              <CardContent>
                <Typography variant="h6" mb={2} sx={{ color: quantumColors.success }}>
                  📋 详细结果
                </Typography>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>排名</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>参数</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>敏感性指标</TableCell>
                      <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>置信度</TableCell>
                      {analysisMethod === 'morris' && (
                        <>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>μ*</TableCell>
                          <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>σ</TableCell>
                        </>
                      )}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {results.map((result, index) => (
                      <TableRow key={result.parameter}>
                        <TableCell>
                          <Chip 
                            label={result.rank} 
                            size="small" 
                            sx={{ 
                              background: `linear-gradient(135deg, ${quantumColors.primary}, ${quantumColors.secondary})`,
                              color: 'white'
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ color: 'white' }}>
                          {parameters.find(p => p.name === result.parameter)?.displayName || result.parameter}
                        </TableCell>
                        <TableCell sx={{ color: quantumColors.primary, fontWeight: 'bold' }}>
                          {result.sensitivity.toFixed(4)}
                        </TableCell>
                        <TableCell sx={{ color: quantumColors.success }}>
                          {(result.confidence * 100).toFixed(1)}%
                        </TableCell>
                        {analysisMethod === 'morris' && result.morrisMetrics && (
                          <>
                            <TableCell sx={{ color: quantumColors.accent }}>
                              {result.morrisMetrics.muStar.toFixed(4)}
                            </TableCell>
                            <TableCell sx={{ color: quantumColors.warning }}>
                              {result.morrisMetrics.sigma.toFixed(4)}
                            </TableCell>
                          </>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </GlassmorphismCard>
          </Grid>
        </Grid>
      )}

      {/* ⚙️ 设置对话框 */}
      <Dialog open={showSettings} onClose={() => setShowSettings(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ 
          background: `linear-gradient(135deg, ${quantumColors.primary}, ${quantumColors.secondary})`,
          color: 'white'
        }}>
          ⚙️ 敏感性分析设置
          <IconButton
            onClick={() => setShowSettings(false)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}
          >
            <Close />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ background: 'rgba(0,0,0,0.9)', color: 'white' }}>
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel sx={{ color: 'white' }}>分析方法</InputLabel>
                <Select
                  value={analysisMethod}
                  onChange={(e) => setAnalysisMethod(e.target.value as any)}
                  sx={{ color: 'white' }}
                >
                  <MenuItem value="basic">基本敏感性分析</MenuItem>
                  <MenuItem value="morris">Morris筛选法</MenuItem>
                  <MenuItem value="sobol">Sobol敏感性分析</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={6}>
              <Typography gutterBottom sx={{ color: 'white' }}>
                样本数量: {sampleSize}
              </Typography>
              <Slider
                value={sampleSize}
                onChange={(_, value) => setSampleSize(value as number)}
                min={100}
                max={10000}
                step={100}
                valueLabelDisplay="auto"
                sx={{
                  '& .MuiSlider-thumb': {
                    background: quantumColors.primary
                  },
                  '& .MuiSlider-track': {
                    background: `linear-gradient(90deg, ${quantumColors.primary}, ${quantumColors.accent})`
                  }
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default SensitivityAnalysisPanel;
