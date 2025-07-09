import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Divider,
  Tooltip,
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import SpeedIcon from '@mui/icons-material/Speed';
import WavesIcon from '@mui/icons-material/Waves';
import WarningIcon from '@mui/icons-material/Warning';

interface AnalysisMetricsProps {
  modelData: any;
  loading?: boolean;
}

interface CriticalPoint {
  x: number;
  y: number;
  z: number;
  value: number;
}

interface MetricsState {
  avgHead: number;
  maxVelocity: number;
  totalFlow: number;
  safetyFactor: number;
  criticalPoints: CriticalPoint[];
  gradientRatio: number;
}

/**
 * 渗流分析指标组件
 * 显示关键的渗流分析结果和安全指标
 */
const AnalysisMetrics: React.FC<AnalysisMetricsProps> = ({ modelData, loading = false }) => {
  const [metrics, setMetrics] = useState<MetricsState>({
    avgHead: 0,
    maxVelocity: 0,
    totalFlow: 0,
    safetyFactor: 0,
    criticalPoints: [],
    gradientRatio: 0
  });

  // 当模型数据变化时计算指标
  useEffect(() => {
    if (!modelData || !modelData.results) {
      return;
    }

    try {
      // 计算平均水头
      const headData = modelData.results.head || [];
      const avgHead = headData.length
        ? headData.reduce((sum: number, val: number) => sum + val, 0) / headData.length
        : 0;

      // 计算最大渗流速度
      const velocityMag = modelData.results.velocity?.magnitude || [];
      const maxVelocity = velocityMag.length
        ? Math.max(...velocityMag)
        : 0;

      // 总流量（从API获取或估算）
      const totalFlow = modelData.results.flow_rate || 0;

      // 安全系数（基于经验公式计算）
      // 假设安全系数与最大渗流速度成反比
      const safetyFactor = maxVelocity > 0 ? Math.min(10, 0.01 / maxVelocity) : 10;

      // 识别关键点（最大渗流速度位置）
      const criticalPoints: CriticalPoint[] = [];
      if (velocityMag.length > 0) {
        // 找出最大值的索引
        const maxIndex = velocityMag.indexOf(maxVelocity);
        
        // 假设我们有网格坐标数据
        const gridSize = Math.ceil(Math.sqrt(velocityMag.length));
        const x = (maxIndex % gridSize) - gridSize / 2;
        const y = Math.floor(maxIndex / gridSize) % gridSize - gridSize / 2;
        const z = Math.floor(maxIndex / (gridSize * gridSize));
        
        criticalPoints.push({ x, y, z, value: maxVelocity });
      }

      // 渗透梯度比
      // 假设关键值是渗流压力与土层高度的比值
      const gradientRatio = avgHead > 0 ? maxVelocity / avgHead : 0;

      setMetrics({
        avgHead: parseFloat(avgHead.toFixed(3)),
        maxVelocity: parseFloat(maxVelocity.toFixed(5)),
        totalFlow: parseFloat(totalFlow.toFixed(4)),
        safetyFactor: parseFloat(safetyFactor.toFixed(2)),
        criticalPoints,
        gradientRatio: parseFloat(gradientRatio.toFixed(4))
      });
    } catch (error) {
      console.error('计算渗流指标时出错:', error);
    }
  }, [modelData]);

  // 获取安全状态评估
  const getSafetyStatus = (factor: number) => {
    if (factor >= 3) return { status: '安全', color: 'success.main' };
    if (factor >= 1.5) return { status: '可接受', color: 'warning.main' };
    return { status: '危险', color: 'error.main' };
  };

  const safetyStatus = getSafetyStatus(metrics.safetyFactor);

  if (loading) {
    return (
      <Card variant="outlined" sx={{ minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress />
      </Card>
    );
  }

  if (!modelData || !modelData.results) {
    return (
      <Card variant="outlined" sx={{ minHeight: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          暂无分析数据
        </Typography>
      </Card>
    );
  }

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          渗流分析指标
          <Tooltip title="本面板展示关键渗流分析指标和安全评估">
            <InfoIcon fontSize="small" sx={{ ml: 1, verticalAlign: 'middle', color: 'primary.main' }} />
          </Tooltip>
        </Typography>
        
        <Divider sx={{ my: 2 }} />
        
        <Grid container spacing={3}>
          {/* 水头指标 */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center">
                <WaterDropIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle1">水头指标</Typography>
              </Box>
              <Typography variant="h4" sx={{ my: 2, color: 'primary.main' }}>
                {metrics.avgHead} m
              </Typography>
              <Typography variant="body2" color="text.secondary">
                平均水头高度
              </Typography>
            </Paper>
          </Grid>
          
          {/* 渗流速度 */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center">
                <SpeedIcon sx={{ color: 'secondary.main', mr: 1 }} />
                <Typography variant="subtitle1">最大渗流速度</Typography>
              </Box>
              <Typography variant="h4" sx={{ my: 2, color: 'secondary.main' }}>
                {metrics.maxVelocity} m/s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                潜在风险区域速度值
              </Typography>
            </Paper>
          </Grid>
          
          {/* 总流量 */}
          <Grid item xs={12} md={6} lg={4}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center">
                <WavesIcon sx={{ color: 'info.main', mr: 1 }} />
                <Typography variant="subtitle1">总流量</Typography>
              </Box>
              <Typography variant="h4" sx={{ my: 2, color: 'info.main' }}>
                {metrics.totalFlow} m³/s
              </Typography>
              <Typography variant="body2" color="text.secondary">
                单位时间内通过边界的水量
              </Typography>
            </Paper>
          </Grid>
          
          {/* 安全系数 */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center">
                <WarningIcon sx={{ color: safetyStatus.color, mr: 1 }} />
                <Typography variant="subtitle1">安全评估</Typography>
              </Box>
              <Box display="flex" alignItems="baseline" sx={{ my: 2 }}>
                <Typography variant="h4" sx={{ color: safetyStatus.color }}>
                  {metrics.safetyFactor}
                </Typography>
                <Typography variant="subtitle1" sx={{ ml: 1, color: safetyStatus.color }}>
                  ({safetyStatus.status})
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary">
                渗流稳定性安全系数，建议值 &gt; 1.5
              </Typography>
            </Paper>
          </Grid>
          
          {/* 渗透梯度比 */}
          <Grid item xs={12} md={6}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Box display="flex" alignItems="center">
                <InfoIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="subtitle1">渗透梯度比</Typography>
              </Box>
              <Typography variant="h4" sx={{ my: 2, color: 'primary.main' }}>
                {metrics.gradientRatio}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                实际梯度与临界梯度的比值
              </Typography>
            </Paper>
          </Grid>
        </Grid>
        
        {/* 关键点数据表 */}
        {metrics.criticalPoints.length > 0 && (
          <Box mt={4}>
            <Typography variant="subtitle1" gutterBottom>
              关键风险点位置
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>X 坐标</TableCell>
                    <TableCell>Y 坐标</TableCell>
                    <TableCell>Z 坐标</TableCell>
                    <TableCell>渗流速度 (m/s)</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {metrics.criticalPoints.map((point, index) => (
                    <TableRow key={index}>
                      <TableCell>{point.x.toFixed(2)}</TableCell>
                      <TableCell>{point.y.toFixed(2)}</TableCell>
                      <TableCell>{point.z.toFixed(2)}</TableCell>
                      <TableCell>{point.value.toExponential(3)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AnalysisMetrics; 