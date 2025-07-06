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
  CenterFocusStrong as CenterFocusStrongIcon,
  FilterList as FilterListIcon,
  ContentCut as ContentCutIcon,
  ViewQuilt as ViewQuiltIcon,
  Grain as GrainIcon,
  Layers as LayersIcon,
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
  onAddFilter?: (filterType: 'clip' | 'slice' | 'contour') => void;
  onUpdateFilter?: (filterId: string, settings: any) => void;
  onRemoveFilter?: (filterId: string) => void;
}

// A simple type for filters for now
export interface Filter {
    id: string;
    type: 'clip' | 'slice' | 'contour';
    enabled: boolean;
    settings: any;
}

export const ScientificVisualizationPanel: React.FC<ScientificVisualizationPanelProps> = ({
  analysisResults,
  onRenderModeChange,
  onColorMapChange,
  onScalarFieldChange,
  onVectorFieldChange,
  onTimeStepChange,
  onAnimationToggle,
  onExport,
  onAddFilter,
  onUpdateFilter,
  onRemoveFilter,
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
  const [activeFilters, setActiveFilters] = useState<Filter[]>([
      // Example filter for demonstration
      { id: 'slice-1', type: 'slice', enabled: true, settings: { origin: [0, 0, 0], normal: [1, 0, 0] } }
  ]);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

  // 动画控制
  const animationRef = useRef<number | NodeJS.Timeout>();

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
        clearTimeout(animationRef.current as NodeJS.Timeout);
      }
    }
    
    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current as NodeJS.Timeout);
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
        {colorMap.colors.map((color: string, index: number) => (
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

  const handleAddFilter = (filterType: 'clip' | 'slice' | 'contour') => {
    // In a real app, this would call the prop and the parent would manage state
    const newFilter: Filter = {
        id: `${filterType}-${Date.now()}`,
        type: filterType,
        enabled: true,
        settings: filterType === 'slice' ? { origin: [0, 0, 0], normal: [1, 0, 0] } : {}
    };
    setActiveFilters(prev => [...prev, newFilter]);
    onAddFilter?.(filterType);
  };

  const renderActiveFilterSettings = () => {
    const filter = activeFilters.find(f => f.id === selectedFilter);
    if (!filter) return null;

    switch (filter.type) {
        case 'slice':
            return (
                 <Stack spacing={2} sx={{p: 1}}>
                    <Typography variant="subtitle2">Slice Plane Settings</Typography>
                    <FormControlLabel control={<Switch checked={filter.enabled} />} label="Enable Slice" />
                    <TextField label="Origin X" size="small" defaultValue={filter.settings.origin[0]} />
                    <TextField label="Normal X" size="small" defaultValue={filter.settings.normal[0]}/>
                    <Button size="small" variant="outlined" color="secondary" onClick={() => setActiveFilters(prev => prev.filter(f => f.id !== filter.id))}>Remove Filter</Button>
                </Stack>
            );
        // Add cases for clip and contour
        default:
            return null;
    }
  }

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
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Toolbar */}
        <Paper square sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
             <ToggleButtonGroup size="small" exclusive aria-label="add filter">
                <ToggleButton value="clip" onClick={() => handleAddFilter('clip')}>
                    <Tooltip title="裁剪 (Clip)">
                        <ContentCutIcon />
                    </Tooltip>
                </ToggleButton>
                <ToggleButton value="slice" onClick={() => handleAddFilter('slice')}>
                    <Tooltip title="切片 (Slice)">
                        <ViewQuiltIcon />
                    </Tooltip>
                </ToggleButton>
                 <ToggleButton value="contour" onClick={() => handleAddFilter('contour')}>
                    <Tooltip title="等值面 (Contour)">
                        <GrainIcon />
                    </Tooltip>
                </ToggleButton>
            </ToggleButtonGroup>
        </Paper>

        {/* Main controls */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 1 }}>
            {/* Rendering Panel */}
            <Accordion expanded={expandedPanels.has('rendering')} onChange={() => togglePanel('rendering')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>显示控制</Typography>
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
            
            {/* Color Map Panel */}
            <Accordion expanded={expandedPanels.has('colormap')} onChange={() => togglePanel('colormap')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>颜色映射</Typography>
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
            
            {/* Fields Panel */}
            <Accordion expanded={expandedPanels.has('fields')} onChange={() => togglePanel('fields')}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>物理场</Typography>
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

            {/* Filter Settings Panel */}
            <Accordion expanded={!!selectedFilter} onChange={() => setSelectedFilter(null)}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography>滤镜设置</Typography>
                </AccordionSummary>
                <AccordionDetails>
                    {renderActiveFilterSettings()}
                </AccordionDetails>
            </Accordion>
        </Box>
        
        {/* Filter Pipeline */}
        <Paper square sx={{ p: 1, borderTop: 1, borderColor: 'divider' }}>
             <Typography variant="subtitle2" sx={{mb: 1}}>
                <FilterListIcon sx={{verticalAlign: 'middle', mr: 1}}/>
                滤镜管道
             </Typography>
             <List dense>
                 {activeFilters.map(filter => (
                     <ListItem 
                        key={filter.id}
                        button
                        selected={selectedFilter === filter.id}
                        onClick={() => setSelectedFilter(filter.id)}
                     >
                         <ListItemIcon><LayersIcon/></ListItemIcon>
                         <ListItemText primary={filter.type} />
                     </ListItem>
                 ))}
             </List>
        </Paper>
    </Box>
  );
};

export default ScientificVisualizationPanel; 