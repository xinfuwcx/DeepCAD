/**
 * 渲染性能监控面板
 * 显示FPS、质量级别、抗抖动状态等渲染性能信息
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Box, LinearProgress, Chip, Grid, Switch, FormControlLabel } from '@mui/material';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';
import { globalRenderQualityManager } from '../../core/renderQualityManager';
import { globalMaterialOptimizer } from '../../core/materialOptimizer';

interface PerformanceStats {
  fps: number;
  frameTime: number;
  memoryUsage: number;
  qualityLevel: string;
  stabilizationEnabled: boolean;
  materialCount: number;
  drawCalls: number;
}

export const RenderingPerformancePanel: React.FC = () => {
  const [stats, setStats] = useState<PerformanceStats>({
    fps: 0,
    frameTime: 0,
    memoryUsage: 0,
    qualityLevel: 'medium',
    stabilizationEnabled: true,
    materialCount: 0,
    drawCalls: 0
  });

  const [autoOptimize, setAutoOptimize] = useState(true);

  useEffect(() => {
    const updateStats = () => {
      try {
        const perfStats = globalPerformanceMonitor.getStats();
        const qualityStats = globalRenderQualityManager.getPerformanceStats();
        const materialStats = globalMaterialOptimizer.getMaterialStats();

        setStats({
          fps: perfStats.fps,
          frameTime: perfStats.frameTime,
          memoryUsage: perfStats.memoryUsage,
          qualityLevel: qualityStats.qualityLevel,
          stabilizationEnabled: qualityStats.stabilizationEnabled,
          materialCount: materialStats.cachedMaterials,
          drawCalls: perfStats.drawCalls || 0
        });
      } catch (error) {
        console.warn('性能统计更新失败:', error);
      }
    };

    // 每500ms更新一次统计信息
    const interval = setInterval(updateStats, 500);
    updateStats(); // 立即更新一次

    return () => clearInterval(interval);
  }, []);

  const getFPSColor = (fps: number): string => {
    if (fps >= 50) return '#4caf50'; // 绿色
    if (fps >= 30) return '#ff9800'; // 橙色
    return '#f44336'; // 红色
  };

  const getQualityColor = (quality: string): string => {
    switch (quality) {
      case 'ultra': return '#9c27b0'; // 紫色
      case 'high': return '#2196f3';  // 蓝色
      case 'medium': return '#ff9800'; // 橙色
      case 'low': return '#f44336';   // 红色
      default: return '#757575';      // 灰色
    }
  };

  const handleAutoOptimizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoOptimize(event.target.checked);
    // 这里可以添加启用/禁用自动优化的逻辑
  };

  const handleQualityChange = (newQuality: 'low' | 'medium' | 'high' | 'ultra') => {
    globalRenderQualityManager.setQualityPreset(newQuality);
  };

  return (
    <Card sx={{ minWidth: 300, maxWidth: 400, margin: 2 }}>
      <CardContent>
        <Typography variant="h6" component="div" gutterBottom>
          🎮 渲染性能监控
        </Typography>

        <Grid container spacing={2}>
          {/* FPS 监控 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                FPS:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(stats.fps / 60 * 100, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: getFPSColor(stats.fps),
                      borderRadius: 4,
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right', color: getFPSColor(stats.fps), fontWeight: 'bold' }}>
                {stats.fps.toFixed(1)}
              </Typography>
            </Box>
          </Grid>

          {/* 帧时间 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                帧时间:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(stats.frameTime / 33.33 * 100, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: stats.frameTime > 16.67 ? '#f44336' : '#4caf50',
                      borderRadius: 4,
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 40, textAlign: 'right' }}>
                {stats.frameTime.toFixed(1)}ms
              </Typography>
            </Box>
          </Grid>

          {/* 内存使用 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>
                内存:
              </Typography>
              <Box sx={{ width: '100%', mr: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(stats.memoryUsage / 1024 / 1024 / 100 * 100, 100)}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: 'rgba(0,0,0,0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: stats.memoryUsage > 50 * 1024 * 1024 ? '#f44336' : '#4caf50',
                      borderRadius: 4,
                    }
                  }}
                />
              </Box>
              <Typography variant="body2" sx={{ minWidth: 50, textAlign: 'right' }}>
                {(stats.memoryUsage / 1024 / 1024).toFixed(1)}MB
              </Typography>
            </Box>
          </Grid>

          {/* 质量级别 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                渲染质量:
              </Typography>
              <Chip
                label={stats.qualityLevel.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: getQualityColor(stats.qualityLevel),
                  color: 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>
          </Grid>

          {/* 抗抖动状态 */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">
                抗抖动:
              </Typography>
              <Chip
                label={stats.stabilizationEnabled ? '启用' : '禁用'}
                size="small"
                color={stats.stabilizationEnabled ? 'success' : 'error'}
                variant="outlined"
              />
            </Box>
          </Grid>

          {/* 材质统计 */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stats.materialCount}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                缓存材质
              </Typography>
            </Box>
          </Grid>

          {/* 绘制调用 */}
          <Grid item xs={6}>
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="h6" color="primary">
                {stats.drawCalls}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                绘制调用
              </Typography>
            </Box>
          </Grid>

          {/* 控制选项 */}
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoOptimize}
                  onChange={handleAutoOptimizeChange}
                  color="primary"
                />
              }
              label="自动优化"
            />
          </Grid>

          {/* 质量控制按钮 */}
          <Grid item xs={12}>
            <Typography variant="body2" sx={{ mb: 1 }}>
              手动质量控制:
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {['low', 'medium', 'high', 'ultra'].map((quality) => (
                <Chip
                  key={quality}
                  label={quality.toUpperCase()}
                  size="small"
                  clickable
                  onClick={() => handleQualityChange(quality as any)}
                  sx={{
                    backgroundColor: stats.qualityLevel === quality ? getQualityColor(quality) : 'rgba(0,0,0,0.1)',
                    color: stats.qualityLevel === quality ? 'white' : 'inherit',
                    '&:hover': {
                      backgroundColor: getQualityColor(quality),
                      color: 'white'
                    }
                  }}
                />
              ))}
            </Box>
          </Grid>
        </Grid>

        {/* 性能提示 */}
        <Box sx={{ mt: 2, p: 1, backgroundColor: 'rgba(0,0,0,0.05)', borderRadius: 1 }}>
          <Typography variant="caption" color="textSecondary">
            💡 提示: {stats.fps < 30 ? '性能较低，建议降低质量设置' : stats.fps > 55 ? '性能良好，可以尝试提高质量' : '性能适中，当前设置合理'}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RenderingPerformancePanel; 