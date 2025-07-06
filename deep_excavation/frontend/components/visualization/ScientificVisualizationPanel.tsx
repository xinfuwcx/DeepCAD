/**
 * 科学可视化控制面板
 * 基于Trame和ParaView的UI设计理念
 * @author Deep Excavation Team
 * @date 2025-01-27
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Switch,
  FormControlLabel,
  Button,
  ButtonGroup,
  Chip,
  Grid,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Divider,
  Stack,
  Alert,
  LinearProgress,
  TextField,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Palette as PaletteIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  PlayArrow as PlayArrowIcon,
  Pause as PauseIcon,
  Stop as StopIcon,
  SkipNext as SkipNextIcon,
  SkipPrevious as SkipPreviousIcon,
  Settings as SettingsIcon,
  Timeline as TimelineIcon,
  Tune as TuneIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon,
  Opacity as OpacityIcon,
  ColorLens as ColorLensIcon,
  Speed as SpeedIcon,
  Assessment as AssessmentIcon,
  ShowChart as ShowChartIcon,
  ScatterPlot as ScatterPlotIcon,
  TrendingUp as TrendingUpIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  CenterFocusStrong as CenterFocusStrongIcon
} from '@mui/icons-material';

import {
  AnalysisResults,
  ScalarField,
  VectorField,
  MeshRenderMode,
  PARAVIEW_COLOR_MAPS,
  getColorFromMap,
  generateColorMapTexture,
  getAvailableColorMaps,
  getColorMapInfo
} from '../../core/scientificVisualization';

interface ScientificVisualizationPanelProps {
  analysisResults?: AnalysisResults;
  onRenderModeChange?: (mode: MeshRenderMode) => void;
  onColorMapChange?: (colorMap: string) => void;
  onScalarFieldChange?: (fieldName: string) => void;
  onVectorFieldChange?: (fieldName: string) => void;
  onTimeStepChange?: (timeStep: number) => void;
  onAnimationToggle?: (enabled: boolean) => void;
  onExport?: (format: string) => void;
}

export const ScientificVisualizationPanel: React.FC<ScientificVisualizationPanelProps> = ({
  analysisResults,
  onRenderModeChange,
  onColorMapChange,
  onScalarFieldChange,
  onVectorFieldChange,
  onTimeStepChange,
  onAnimationToggle,
  onExport
}) => {
  // 状态管理
  const [expandedPanels, setExpandedPanels] = useState<Set<string>>(
    new Set(['rendering', 'colormap', 'fields'])
  );
  const [selectedScalarField, setSelectedScalarField] = useState<string>('');
  const [selectedVectorField, setSelectedVectorField] = useState<string>('');
  const [currentColorMap, setCurrentColorMap] = useState<string>('Cool to Warm');
  const [renderMode, setRenderMode] = useState<MeshRenderMode>('surface');
  const [opacity, setOpacity] = useState<number>(1.0);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [animationSpeed, setAnimationSpeed] = useState<number>(1.0);
  const [currentTimeStep, setCurrentTimeStep] = useState<number>(0);
  const [contourLevels, setContourLevels] = useState<number>(10);
  const [vectorScale, setVectorScale] = useState<number>(1.0);
  const [vectorDensity, setVectorDensity] = useState<number>(0.5);
  const [showMeshEdges, setShowMeshEdges] = useState<boolean>(false);
  const [showCoordinateAxes, setShowCoordinateAxes] = useState<boolean>(true);
  const [backgroundGradient, setBackgroundGradient] = useState<boolean>(true);
  const [lightingMode, setLightingMode] = useState<string>('three_point');

  // 动画控制
  const animationRef = useRef<number>();

  useEffect(() => {
    if (analysisResults) {
      // 初始化字段选择
      const scalarFields = Array.from(analysisResults.scalarFields.keys());
      const vectorFields = Array.from(analysisResults.vectorFields.keys());
      
      if (scalarFields.length > 0 && !selectedScalarField) {
        setSelectedScalarField(scalarFields[0]);
      }
      if (vectorFields.length > 0 && !selectedVectorField) {
        setSelectedVectorField(vectorFields[0]);
      }
      
      // 设置时间步
      setCurrentTimeStep(analysisResults.timeSteps.current);
    }
  }, [analysisResults]);

  // 动画控制
  useEffect(() => {
    if (isAnimating && analysisResults) {
      const animate = () => {
        setCurrentTimeStep(prev => {
          const next = (prev + 1) % analysisResults.timeSteps.count;
          onTimeStepChange?.(next);
          return next;
        });
        
        animationRef.current = setTimeout(animate, 1000 / animationSpeed);
      };
      
      animationRef.current = setTimeout(animate, 1000 / animationSpeed);
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isAnimating, animationSpeed, analysisResults, onTimeStepChange]);

  // 切换面板展开状态
  const togglePanel = (panelId: string) => {
    const newExpanded = new Set(expandedPanels);
    if (newExpanded.has(panelId)) {
      newExpanded.delete(panelId);
    } else {
      newExpanded.add(panelId);
    }
    setExpandedPanels(newExpanded);
  };

  // 处理渲染模式变化
  const handleRenderModeChange = (mode: MeshRenderMode) => {
    setRenderMode(mode);
    onRenderModeChange?.(mode);
  };

  // 处理色彩映射变化
  const handleColorMapChange = (colorMap: string) => {
    setCurrentColorMap(colorMap);
    onColorMapChange?.(colorMap);
  };

  // 处理标量场变化
  const handleScalarFieldChange = (fieldName: string) => {
    setSelectedScalarField(fieldName);
    onScalarFieldChange?.(fieldName);
  };

  // 处理矢量场变化
  const handleVectorFieldChange = (fieldName: string) => {
    setSelectedVectorField(fieldName);
    onVectorFieldChange?.(fieldName);
  };

  // 动画控制
  const toggleAnimation = () => {
    const newAnimating = !isAnimating;
    setIsAnimating(newAnimating);
    onAnimationToggle?.(newAnimating);
  };

  // 渲染色彩映射预览
  const renderColorMapPreview = (colorMapName: string) => {
    const colorMap = getColorMapInfo(colorMapName);
    if (!colorMap) return null;

    return (
      <Box sx={{ display: 'flex', height: 20, borderRadius: 1, overflow: 'hidden', mb: 1 }}>
        {colorMap.colors.map((color, index) => (
          <Box
            key={index}
            sx={{
              flex: 1,
              backgroundColor: color,
              minWidth: 1
            }}
          />
        ))}
      </Box>
    );
  };

  // 获取网格质量状态颜色
  const getQualityColor = (quality: number): string => {
    if (quality > 0.8) return 'success';
    if (quality > 0.6) return 'warning';
    return 'error';
  };

  if (!analysisResults) {
    return (
      <Paper sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="h6" color="text.secondary">
          请加载分析结果以开始可视化
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ width: '100%', maxHeight: '100vh', overflow: 'auto' }}>
      {/* 头部工具栏 */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssessmentIcon />
              科学可视化控制台
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {analysisResults.name} - {analysisResults.analysisType}分析
            </Typography>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Stack direction="row" spacing={1} justifyContent="flex-end">
              <Tooltip title="全屏显示">
                <IconButton>
                  <FullscreenIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="重置视图">
                <IconButton>
                  <CenterFocusStrongIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="导出图像">
                <IconButton onClick={() => onExport?.('png')}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* 渲染控制面板 */}
      <Accordion expanded={expandedPanels.has('rendering')} onChange={() => togglePanel('rendering')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <SettingsIcon />
            渲染设置
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>渲染模式</InputLabel>
                <Select
                  value={renderMode}
                  onChange={(e) => handleRenderModeChange(e.target.value as MeshRenderMode)}
                >
                  <MenuItem value="surface">表面渲染</MenuItem>
                  <MenuItem value="wireframe">线框模式</MenuItem>
                  <MenuItem value="surface_with_edges">表面+边线</MenuItem>
                  <MenuItem value="points">点云模式</MenuItem>
                  <MenuItem value="volume">体渲染</MenuItem>
                  <MenuItem value="isosurface">等值面</MenuItem>
                  <MenuItem value="contour_lines">等高线</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <FormControl fullWidth size="small">
                <InputLabel>光照模式</InputLabel>
                <Select
                  value={lightingMode}
                  onChange={(e) => setLightingMode(e.target.value)}
                >
                  <MenuItem value="headlight">头灯照明</MenuItem>
                  <MenuItem value="three_point">三点照明</MenuItem>
                  <MenuItem value="ambient">环境光</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                透明度: {opacity.toFixed(2)}
              </Typography>
              <Slider
                value={opacity}
                onChange={(_, value) => setOpacity(value as number)}
                min={0}
                max={1}
                step={0.01}
                size="small"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Stack direction="row" spacing={2}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={showMeshEdges}
                      onChange={(e) => setShowMeshEdges(e.target.checked)}
                    />
                  }
                  label="显示网格边线"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showCoordinateAxes}
                      onChange={(e) => setShowCoordinateAxes(e.target.checked)}
                    />
                  }
                  label="显示坐标轴"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={backgroundGradient}
                      onChange={(e) => setBackgroundGradient(e.target.checked)}
                    />
                  }
                  label="背景渐变"
                />
              </Stack>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 色彩映射面板 */}
      <Accordion expanded={expandedPanels.has('colormap')} onChange={() => togglePanel('colormap')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PaletteIcon />
            色彩映射
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>色彩映射</InputLabel>
                <Select
                  value={currentColorMap}
                  onChange={(e) => handleColorMapChange(e.target.value)}
                >
                  {getAvailableColorMaps().map(mapName => (
                    <MenuItem key={mapName} value={mapName}>
                      {mapName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                色彩预览:
              </Typography>
              {renderColorMapPreview(currentColorMap)}
              <Typography variant="caption" color="text.secondary">
                {getColorMapInfo(currentColorMap)?.description}
              </Typography>
            </Grid>
            
            {renderMode === 'contour_lines' && (
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  等高线数量: {contourLevels}
                </Typography>
                <Slider
                  value={contourLevels}
                  onChange={(_, value) => setContourLevels(value as number)}
                  min={5}
                  max={50}
                  step={1}
                  size="small"
                />
              </Grid>
            )}
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 数据字段面板 */}
      <Accordion expanded={expandedPanels.has('fields')} onChange={() => togglePanel('fields')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ShowChartIcon />
            数据字段
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            {/* 标量场 */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom fontWeight="bold">
                标量场
              </Typography>
              <List dense>
                {Array.from(analysisResults.scalarFields.entries()).map(([name, field]) => (
                  <ListItem
                    key={name}
                    button
                    selected={selectedScalarField === name}
                    onClick={() => handleScalarFieldChange(name)}
                  >
                    <ListItemIcon>
                      <ScatterPlotIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={field.name}
                      secondary={`${field.description} (${field.unit})`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const updatedField = { ...field, visible: !field.visible };
                          analysisResults.scalarFields.set(name, updatedField);
                        }}
                      >
                        {field.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </Grid>
            
            {/* 矢量场 */}
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom fontWeight="bold">
                矢量场
              </Typography>
              <List dense>
                {Array.from(analysisResults.vectorFields.entries()).map(([name, field]) => (
                  <ListItem
                    key={name}
                    button
                    selected={selectedVectorField === name}
                    onClick={() => handleVectorFieldChange(name)}
                  >
                    <ListItemIcon>
                      <TrendingUpIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={field.name}
                      secondary={`${field.description} (${field.unit})`}
                    />
                    <ListItemSecondaryAction>
                      <IconButton
                        size="small"
                        onClick={() => {
                          const updatedField = { ...field, visible: !field.visible };
                          analysisResults.vectorFields.set(name, updatedField);
                        }}
                      >
                        {field.visible ? <VisibilityIcon /> : <VisibilityOffIcon />}
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
              
              {selectedVectorField && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" gutterBottom>
                    矢量缩放: {vectorScale.toFixed(2)}
                  </Typography>
                  <Slider
                    value={vectorScale}
                    onChange={(_, value) => setVectorScale(value as number)}
                    min={0.1}
                    max={5.0}
                    step={0.1}
                    size="small"
                  />
                  
                  <Typography variant="body2" gutterBottom>
                    显示密度: {vectorDensity.toFixed(2)}
                  </Typography>
                  <Slider
                    value={vectorDensity}
                    onChange={(_, value) => setVectorDensity(value as number)}
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    size="small"
                  />
                </Box>
              )}
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* 时间步控制面板 */}
      {analysisResults.timeSteps.count > 1 && (
        <Accordion expanded={expandedPanels.has('animation')} onChange={() => togglePanel('animation')}>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon />
              时间步控制
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <IconButton onClick={() => setCurrentTimeStep(0)}>
                    <SkipPreviousIcon />
                  </IconButton>
                  <IconButton onClick={toggleAnimation}>
                    {isAnimating ? <PauseIcon /> : <PlayArrowIcon />}
                  </IconButton>
                  <IconButton onClick={() => setCurrentTimeStep(analysisResults.timeSteps.count - 1)}>
                    <SkipNextIcon />
                  </IconButton>
                  
                  <Typography variant="body2" sx={{ ml: 2 }}>
                    时间步: {currentTimeStep + 1} / {analysisResults.timeSteps.count}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  时间: {analysisResults.timeSteps.values[currentTimeStep]?.toFixed(3)} {analysisResults.timeSteps.units}
                </Typography>
                <Slider
                  value={currentTimeStep}
                  onChange={(_, value) => {
                    const step = value as number;
                    setCurrentTimeStep(step);
                    onTimeStepChange?.(step);
                  }}
                  min={0}
                  max={analysisResults.timeSteps.count - 1}
                  step={1}
                  size="small"
                />
              </Grid>
              
              <Grid item xs={12}>
                <Typography variant="body2" gutterBottom>
                  播放速度: {animationSpeed.toFixed(1)}x
                </Typography>
                <Slider
                  value={animationSpeed}
                  onChange={(_, value) => setAnimationSpeed(value as number)}
                  min={0.1}
                  max={5.0}
                  step={0.1}
                  size="small"
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>
      )}

      {/* 网格质量面板 */}
      <Accordion expanded={expandedPanels.has('quality')} onChange={() => togglePanel('quality')}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GridOnIcon />
            网格质量
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    单元数量
                  </Typography>
                  <Typography variant="h6">
                    {analysisResults.mesh.quality.elementCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={6}>
              <Card variant="outlined">
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    节点数量
                  </Typography>
                  <Typography variant="h6">
                    {analysisResults.mesh.quality.nodeCount.toLocaleString()}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                平均单元质量
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={analysisResults.mesh.quality.avgElementQuality * 100}
                  color={getQualityColor(analysisResults.mesh.quality.avgElementQuality) as any}
                  sx={{ flex: 1 }}
                />
                <Typography variant="body2">
                  {(analysisResults.mesh.quality.avgElementQuality * 100).toFixed(1)}%
                </Typography>
              </Box>
            </Grid>
            
            <Grid item xs={12}>
              <Typography variant="body2" gutterBottom>
                长宽比统计
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption">
                  最小: {analysisResults.mesh.quality.aspectRatio.min.toFixed(2)}
                </Typography>
                <Typography variant="caption">
                  平均: {analysisResults.mesh.quality.aspectRatio.avg.toFixed(2)}
                </Typography>
                <Typography variant="caption">
                  最大: {analysisResults.mesh.quality.aspectRatio.max.toFixed(2)}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>
    </Box>
  );
};

export default ScientificVisualizationPanel; 