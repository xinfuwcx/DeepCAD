/**
 * 地质模型创建器 - 两标签页重构版
 * @description 根据反馈，重构为"概念建模"和"数据驱动建模"两个核心标签页，优化工作流。
 * @author Deep Excavation Team
 * @date 2025-01-29
 */
import React, { useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper, FormControl, InputLabel, Select, MenuItem, TextField, Grid, Divider, IconButton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
    Card, CardContent, Tooltip, Chip, ToggleButtonGroup, ToggleButton, InputAdornment, Checkbox, FormControlLabel, Switch, SelectChangeEvent
} from '@mui/material';
import { 
    Add as AddIcon, 
    Delete as DeleteIcon, 
    Terrain as TerrainIcon, 
    UploadFile as UploadFileIcon, 
    ExpandMore as ExpandMoreIcon,
    ViewSidebar as ViewSidebarIcon,
    ViewInAr as ViewInArIcon,
    ViewDay as ViewDayIcon
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';
import Papa from 'papaparse';
import { useSnackbar } from 'notistack';

import { useStore } from '../../core/store';
import { SOIL_MATERIALS } from '../../core/bimColorSystem';
import { LITHOLOGY_COLORS } from '../../core/geologicalColorSchemes';
import DiagramRenderer from '../shared/DiagramRenderer';
import { 
    GeologyModelRequest,
    createDataDrivenGeologicalModel,
} from '../../services/geologyService';
import { CreateConceptualLayersFeature, ConceptualLayer } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface BoreholePoint { id: string; x: number; y: number; z: number; surface: string; }
interface Orientation { id: string; x: number; y: number; z: number; azimuth: number; dip: number; polarity: number; surface: string; }
interface LocalSoilLayer { id: string; name: string; thickness: number; soilType: string; color: string; }

interface ComputationalDomain {
  xSize: number;
  zSize: number;
}

interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }

// --- 辅助组件 ---
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return <div role="tabpanel" hidden={value !== index} {...other}><Box sx={{ p: 2, pt: 3 }}>{children}</Box></div>;
}

const DataInputSection: React.FC<{ title: string; onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void; fileName: string | null; children: React.ReactNode }> = ({ title, onFileUpload, fileName, children }) => (
    <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">{title}</Typography></AccordionSummary>
        <AccordionDetails>
            <Stack spacing={2}>
                <Stack direction="row" spacing={2} alignItems="center">
                    <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} component="label">上传CSV<input type="file" onChange={onFileUpload} hidden accept=".csv" /></Button>
                    {fileName && <Typography variant="caption" noWrap>已选: {fileName}</Typography>}
                </Stack>
                {children}
            </Stack>
        </AccordionDetails>
    </Accordion>
);

// 紧凑型土层编辑组件
const CompactLayerEditor: React.FC<{
    layer: LocalSoilLayer,
    onUpdate: (id: string, field: keyof LocalSoilLayer, value: any) => void,
    onDelete: (id: string) => void
}> = ({ layer, onUpdate, onDelete }) => (
    <Card variant="outlined" sx={{ mb: 1, bgcolor: layer.color + '22' }}>
        <CardContent sx={{ p: '8px !important' }}>
            <Grid container spacing={1} alignItems="center">
                <Grid item xs={12}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <TextField
                            size="small"
                            variant="standard"
                            label="层名"
                            value={layer.name}
                            onChange={(e) => onUpdate(layer.id, 'name', e.target.value)}
                            sx={{ width: '60%' }}
                        />
                        <TextField
                            size="small"
                            variant="standard"
                            label="厚度(m)"
                            type="number"
                            value={layer.thickness}
                            onChange={(e) => onUpdate(layer.id, 'thickness', parseFloat(e.target.value))}
                            sx={{ width: '30%' }}
                        />
                        <IconButton size="small" onClick={() => onDelete(layer.id)} sx={{ ml: 1 }}>
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Stack>
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth size="small" variant="standard">
                        <InputLabel>岩性</InputLabel>
                        <Select
                            value={layer.soilType}
                            onChange={(e) => onUpdate(layer.id, 'soilType', e.target.value)}
                        >
                            {SOIL_MATERIALS.map(m => (
                                <MenuItem key={m.value} value={m.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box 
                                            sx={{ 
                                                width: 12, 
                                                height: 12, 
                                                borderRadius: '50%', 
                                                bgcolor: LITHOLOGY_COLORS[m.value as keyof typeof LITHOLOGY_COLORS] || '#cccccc',
                                                mr: 1
                                            }} 
                                        />
                                        {m.label}
                                    </Box>
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Grid>
            </Grid>
        </CardContent>
    </Card>
);

// 多视图组合的深基坑表达组件
const MultiViewGeologicalModel: React.FC<{
    layers: LocalSoilLayer[]
}> = ({ layers }) => {
    const [viewMode, setViewMode] = useState<string>('section');
    
    const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: string) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };
    
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">多视图预览</Typography>
                <ToggleButtonGroup
                    size="small"
                    value={viewMode}
                    exclusive
                    onChange={handleViewChange}
                >
                    <ToggleButton value="section" aria-label="剖面视图">
                        <Tooltip title="剖面视图">
                            <ViewSidebarIcon fontSize="small" />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="plan" aria-label="平面视图">
                        <Tooltip title="平面视图">
                            <ViewDayIcon fontSize="small" />
                        </Tooltip>
                    </ToggleButton>
                    <ToggleButton value="3d" aria-label="3D视图">
                        <Tooltip title="3D视图">
                            <ViewInArIcon fontSize="small" />
                        </Tooltip>
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            
            <Box sx={{ height: 200, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                {viewMode === 'section' && (
                    <DiagramRenderer 
                        type="geological_section" 
                        data={layers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color }))} 
                    />
                )}
                {viewMode === 'plan' && (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DiagramRenderer 
                            type="geological_plan" 
                            data={{
                                width: 500,
                                height: 500,
                                depth: layers.reduce((sum, layer) => sum + layer.thickness, 0),
                                topLayer: layers.length > 0 ? layers[0] : null
                            }} 
                        />
                    </Box>
                )}
                {viewMode === '3d' && (
                    <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <DiagramRenderer 
                            type="geological_3d" 
                            data={{
                                width: 500,
                                height: 500,
                                layers: layers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color }))
                            }} 
                        />
                    </Box>
                )}
            </Box>
            
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                    宽度: 500m × 长度: 500m
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    总厚度: {layers.reduce((sum, layer) => sum + layer.thickness, 0)}m
                </Typography>
            </Box>
        </Box>
    );
};

// --- 主组件 ---
const GeologicalModelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const setGeologicalModel = useStore(state => state.setGeologicalModel); // <--- 使用新的 action
    const { enqueueSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState<number>(0);

    // --- 概念建模状态 ---
    const [conceptualLayers, setConceptualLayers] = useState<LocalSoilLayer[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [layerToDelete, setLayerToDelete] = useState<string | null>(null);
    const [computationalDomain, setComputationalDomain] = useState<ComputationalDomain>({
        xSize: 500,
        zSize: 500
    });

    // --- (重构后) 数据驱动建模状态 ---
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [boreholeData, setBoreholeData] = useState<{ x: number; y: number; z: number; formation: string; }[]>([]);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    
    // 基于500x500x30m体积的合理默认值
    const [modelParams, setModelParams] = useState({
      // PyVista/Delaunay 插值器设置
      resolution: '50,50', // 对应10m x 10m的插值网格
      alpha: 2.0, // Delaunay alpha-shape 参数，用于控制三角剖分的紧密程度
      // Gmsh设置
      meshSize: 10.0, // 初始背景网格尺寸
      gridResolution: 50, // B-Spline曲面近似的控制点网格 (50x50)
      // 可视化输出选项
      generateContours: false,
    });
    
    // --- 事件处理 ---
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);

    const handleDomainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setComputationalDomain(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleAddConceptualLayer = () => {
        const newLayer: LocalSoilLayer = {
            id: uuidv4(),
            name: `新土层 ${conceptualLayers.length + 1}`,
            thickness: 10,
            soilType: 'sand',
            color: LITHOLOGY_COLORS.sand
        };
        setConceptualLayers(produce(draft => {
            draft.push(newLayer);
        }));
    };

    const handleUpdateConceptualLayer = (id: string, field: keyof LocalSoilLayer, value: any) => {
        setConceptualLayers(produce(draft => {
            const layer = draft.find(l => l.id === id);
            if (layer) {
                (layer[field] as any) = value;
                if (field === 'soilType') {
                    layer.color = LITHOLOGY_COLORS[value as keyof typeof LITHOLOGY_COLORS] || '#cccccc';
                }
            }
        }));
    };

    const handleOpenDeleteConfirm = (id: string) => { setLayerToDelete(id); setDeleteConfirmOpen(true); };
    const handleCloseDeleteConfirm = () => { setDeleteConfirmOpen(false); setLayerToDelete(null); };
    const handleConfirmDelete = () => {
        if (layerToDelete) {
            setConceptualLayers(layers => layers.filter(l => l.id !== layerToDelete));
            handleCloseDeleteConfirm();
        }
    };

    const handleGenerateConceptualModel = () => {
        if (conceptualLayers.length === 0) {
            enqueueSnackbar('请至少添加一个概念土层', { variant: 'warning' });
            return;
        }
        const feature: CreateConceptualLayersFeature = {
            id: uuidv4(),
            type: 'create-conceptual-layers',
            name: '概念地质模型',
            parameters: {
                layers: conceptualLayers.map(l => ({ name: l.name, thickness: l.thickness, material: l.soilType })),
                domainSize: { x: computationalDomain.xSize, y: computationalDomain.zSize }
            }
        };
        addFeature(feature);
        enqueueSnackbar('概念地质模型已生成并添加至历史记录', { variant: 'success' });
        setGeologicalModel(null); // 清空3D视图中的数据驱动模型
    };

    // --- Data-Driven Modeling Handlers ---
    const handleDataFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFileName(file.name);
            setIsLoading(true);
            setError(null);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                dynamicTyping: true,
                complete: (results) => {
                    const requiredFields = ['x', 'y', 'z', 'formation'];
                    const missingFields = requiredFields.filter(f => !results.meta.fields?.includes(f));

                    if (missingFields.length > 0) {
                        setError(`CSV文件缺少必需的列: ${missingFields.join(', ')}`);
                        setBoreholeData([]);
                    } else {
                        const parsedData = (results.data as any[]).filter(row => 
                            row.x != null && row.y != null && row.z != null && row.formation != null
                        );
                        setBoreholeData(parsedData);
                        enqueueSnackbar(`成功解析 ${parsedData.length} 条钻孔数据`, { variant: 'success' });
                    }
                    setIsLoading(false);
                },
                error: (err: any) => {
                    setError(`解析CSV文件时出错: ${err.message}`);
                    setIsLoading(false);
                }
            });
        }
    };

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setModelParams(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateDataDrivenModel = async () => {
        if (boreholeData.length < 3) {
            setError('数据不足，至少需要3个钻孔点才能生成模型。');
            enqueueSnackbar('数据不足，无法生成模型', { variant: 'error' });
            return;
        }
        setIsLoading(true);
        setError(null);

        try {
            const res = modelParams.resolution.split(',');
            const request: GeologyModelRequest = {
                boreholeData: boreholeData,
                formations: {
                    DefaultSeries: Array.from(new Set(boreholeData.map(p => p.formation))).join(',')
                },
                options: {
                    resolutionX: parseInt(res[0], 10),
                    resolutionY: parseInt(res[1], 10),
                    alpha: modelParams.alpha,
                }
            };

            enqueueSnackbar('正在生成三维地质模型，请稍候...', { variant: 'info' });
            
            const geologicalLayers = await createDataDrivenGeologicalModel(request);
            
            if (geologicalLayers && geologicalLayers.length > 0) {
                setGeologicalModel(geologicalLayers);
                enqueueSnackbar(`成功生成 ${geologicalLayers.length} 个地质图层!`, { variant: 'success' });
            } else {
                throw new Error('模型生成成功，但未返回任何有效的几何图层。');
            }

        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || '发生未知错误';
            setError(`生成数据驱动模型时出错: ${errorMessage}`);
            enqueueSnackbar(`模型生成失败: ${errorMessage}`, { variant: 'error' });
            setGeologicalModel(null);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                    <Tab label="概念建模" />
                    <Tab label="数据驱动建模" />
                </Tabs>
            </Box>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1 }}>

                {/* --- 概念建模标签页 --- */}
                <TabPanel value={activeTab} index={0}>
                    <Stack spacing={2}>
                        <MultiViewGeologicalModel layers={conceptualLayers} />
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" sx={{ mb: 2 }}>土层编辑器</Typography>
                            <Box sx={{ maxHeight: '250px', overflowY: 'auto', pr: 1 }}>
                                {conceptualLayers.map((layer) => (
                                    <CompactLayerEditor
                                        key={layer.id}
                                        layer={layer}
                                        onUpdate={handleUpdateConceptualLayer}
                                        onDelete={handleOpenDeleteConfirm}
                                    />
                                ))}
                            </Box>
                            <Button startIcon={<AddIcon />} fullWidth sx={{ mt: 1 }} onClick={handleAddConceptualLayer}>添加土层</Button>
                        </Paper>
                        
                        <Accordion>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography variant="subtitle2">计算域设置</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Grid container spacing={2}>
                                    <Grid item xs={6}>
                                        <TextField label="宽度 (X)" name="xSize" type="number" value={computationalDomain.xSize} onChange={handleDomainChange} fullWidth size="small" />
                                    </Grid>
                                    <Grid item xs={6}>
                                        <TextField label="长度 (Y)" name="zSize" type="number" value={computationalDomain.zSize} onChange={handleDomainChange} fullWidth size="small" />
                                    </Grid>
                                </Grid>
                            </AccordionDetails>
                        </Accordion>
                        
                        <Box sx={{ pt: 1 }}>
                            <Button fullWidth variant="contained" color="primary" onClick={handleGenerateConceptualModel}>
                                生成概念地质模型
                            </Button>
                        </Box>
                    </Stack>
                </TabPanel>

                {/* --- 数据驱动建模标签页 (重构) --- */}
                <TabPanel value={activeTab} index={1}>
                    <Stack spacing={2.5}>
                        <Typography variant="h6" gutterBottom>数据驱动地质建模</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            通过上传标准的钻孔数据(CSV)，结合建模参数，自动生成三维地质体网格。
                        </Typography>
                        
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle1" gutterBottom>1. 上传钻孔数据</Typography>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Button
                                        variant="contained"
                                        component="label"
                                        startIcon={<UploadFileIcon />}
                                        disabled={isLoading}
                                    >
                                        选择CSV文件
                                        <input type="file" hidden accept=".csv" onChange={handleDataFileChange} />
                                    </Button>
                                    {uploadedFileName && <Chip label={uploadedFileName} onDelete={() => { setUploadedFileName(null); setBoreholeData([]); }} />}
                                </Stack>
                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 1.5 }}>
                                    * CSV文件必须包含列: x, y, z, formation
                                </Typography>
                            </CardContent>
                        </Card>

                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="h6" gutterBottom>2. 配置参数</Typography>

                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle2">地质插值 (PyVista)</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <TextField
                                                    fullWidth
                                                    label="插值分辨率"
                                                    name="resolution"
                                                    value={modelParams.resolution}
                                                    onChange={handleParamChange}
                                                    helperText="格式: X向,Y向, 例如 50,50"
                                                />
                                            </Grid>
                                            <Grid item xs={6}>
                                                <TextField
                                                    fullWidth
                                                    label="Delaunay Alpha"
                                                    name="alpha"
                                                    type="number"
                                                    value={modelParams.alpha}
                                                    onChange={handleParamChange}
                                                    helperText="值越小，表面越贴合数据点"
                                                />
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle2">几何与网格 (Gmsh)</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <Stack spacing={2}>
                                            <Tooltip title="定义初始背景网格的基础单元尺寸(米)。此粗糙网格用于快速预览和后续的精细化。">
                                                <TextField
                                                    name="meshSize"
                                                    label="基础单元尺寸 (m)"
                                                    type="number"
                                                    value={modelParams.meshSize}
                                                    onChange={handleParamChange}
                                                    fullWidth
                                                    margin="dense"
                                                    size="small"
                                                />
                                            </Tooltip>
                                            <Tooltip title="定义将地质曲面近似为B-Spline曲面时所用的控制点网格密度(NxN)。50表示50x50的网格。">
                                                <TextField
                                                    name="gridResolution"
                                                    label="曲面近似网格密度"
                                                    type="number"
                                                    value={modelParams.gridResolution}
                                                    onChange={handleParamChange}
                                                    fullWidth
                                                    margin="dense"
                                                    size="small"
                                                />
                                            </Tooltip>
                                        </Stack>
                                    </AccordionDetails>
                                </Accordion>

                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                        <Typography variant="subtitle2">可视化输出</Typography>
                                    </AccordionSummary>
                                    <AccordionDetails>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={modelParams.generateContours}
                                                    onChange={(e) => setModelParams(prev => ({ ...prev, generateContours: e.target.checked }))}
                                                    name="generateContours"
                                                />
                                            }
                                            label="生成地表等高线"
                                        />
                                    </AccordionDetails>
                                </Accordion>
                            </CardContent>
                        </Card>

                        <Box sx={{ pt: 1 }}>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            {isLoading && <LinearProgress sx={{ mb: 2 }} />}
                            <Tooltip title={boreholeData.length === 0 ? "请先上传钻孔数据" : "根据钻孔数据生成三维地质模型"}>
                                <span>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        size="large"
                                        fullWidth
                                        onClick={handleGenerateDataDrivenModel}
                                        disabled={isLoading || boreholeData.length === 0}
                                    >
                                        {isLoading ? '正在生成...' : '生成三维地质模型'}
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
                    </Stack>
                </TabPanel>

            </Box>
            
            <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        确定要删除土层 "{conceptualLayers.find(l => l.id === layerToDelete)?.name}" 吗? 此操作无法撤销。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>取消</Button>
                    <Button onClick={handleConfirmDelete} color="error">删除</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default GeologicalModelCreator; 