/**
 * 地质模型创建器 - 两标签页重构版
 * @description 根据反馈，重构为"概念建模"和"数据驱动建模"两个核心标签页，优化工作流。
 * @author Deep Excavation Team
 * @date 2025-01-29
 */
import React, { useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper, FormControl, InputLabel, Select, MenuItem, TextField, Grid, Divider, IconButton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
    Card, CardContent, Tooltip, Chip, ToggleButtonGroup, ToggleButton, InputAdornment, Checkbox, FormControlLabel, Switch
} from '@mui/material';
import { 
    Add as AddIcon, 
    Delete as DeleteIcon, 
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
import { CreateConceptualLayersFeature, CreateConceptualLayersParameters } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface LocalSoilLayer { id: string; name: string; thickness: number; soilType: string; color: string; }
interface ComputationalDomain { xSize: number; zSize: number; }
interface TabPanelProps { children?: React.ReactNode; index: number; value: number; }

// --- 辅助组件 ---
function TabPanel(props: TabPanelProps) {
    const { children, value, index, ...other } = props;
    return <div role="tabpanel" hidden={value !== index} {...other}><Box sx={{ p: 2, pt: 3 }}>{children}</Box></div>;
}

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
                        <TextField size="small" variant="standard" label="层名" value={layer.name} onChange={(e) => onUpdate(layer.id, 'name', e.target.value)} sx={{ width: '60%' }} />
                        <TextField size="small" variant="standard" label="厚度(m)" type="number" value={layer.thickness} onChange={(e) => onUpdate(layer.id, 'thickness', parseFloat(e.target.value))} sx={{ width: '30%' }} />
                        <IconButton size="small" onClick={() => onDelete(layer.id)} sx={{ ml: 1 }}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth size="small" variant="standard">
                        <InputLabel>岩性</InputLabel>
                        <Select value={layer.soilType} onChange={(e) => onUpdate(layer.id, 'soilType', e.target.value)}>
                            {SOIL_MATERIALS.map(m => (
                                <MenuItem key={m.value} value={m.value}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: LITHOLOGY_COLORS[m.value as keyof typeof LITHOLOGY_COLORS] || '#cccccc', mr: 1 }} />
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

const MultiViewGeologicalModel: React.FC<{ layers: LocalSoilLayer[] }> = ({ layers }) => {
    const [viewMode, setViewMode] = useState<string>('section');
    const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: string) => { if (newView !== null) setViewMode(newView); };
    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2">多视图预览</Typography>
                <ToggleButtonGroup size="small" value={viewMode} exclusive onChange={handleViewChange}>
                    <ToggleButton value="section" aria-label="剖面视图"><Tooltip title="剖面视图"><ViewSidebarIcon fontSize="small" /></Tooltip></ToggleButton>
                    <ToggleButton value="plan" aria-label="平面视图"><Tooltip title="平面视图"><ViewDayIcon fontSize="small" /></Tooltip></ToggleButton>
                    <ToggleButton value="3d" aria-label="3D视图"><Tooltip title="3D视图"><ViewInArIcon fontSize="small" /></Tooltip></ToggleButton>
                </ToggleButtonGroup>
            </Box>
            <Box sx={{ height: 200, bgcolor: 'rgba(0,0,0,0.05)', borderRadius: 1, overflow: 'hidden' }}>
                {viewMode === 'section' && <DiagramRenderer type="geological_section" data={layers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color }))} />}
                {viewMode === 'plan' && <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DiagramRenderer type="geological_plan" data={{ width: 500, height: 500, depth: layers.reduce((sum, layer) => sum + layer.thickness, 0), topLayer: layers.length > 0 ? layers[0] : null }} /></Box>}
                {viewMode === '3d' && <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><DiagramRenderer type="geological_3d" data={{ width: 500, height: 500, layers: layers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color })) }} /></Box>}
            </Box>
            <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">宽度: 500m × 长度: 500m</Typography>
                <Typography variant="caption" color="text.secondary">总厚度: {layers.reduce((sum, layer) => sum + layer.thickness, 0)}m</Typography>
            </Box>
        </Box>
    );
};

// --- 主组件 ---
const GeologicalModelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const setGeologicalModel = useStore(state => state.setGeologicalModel);
    const { enqueueSnackbar } = useSnackbar();
    const [activeTab, setActiveTab] = useState<number>(0);

    const [conceptualLayers, setConceptualLayers] = useState<LocalSoilLayer[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [layerToDelete, setLayerToDelete] = useState<string | null>(null);
    const [computationalDomain, setComputationalDomain] = useState<ComputationalDomain>({ xSize: 500, zSize: 500 });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [boreholeData, setBoreholeData] = useState<{ x: number; y: number; z: number; formation: string; }[]>([]);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    
    const [modelParams, setModelParams] = useState({
      resolution: '50,50',
      alpha: 0.0,
      kernelRadius: 50.0,
      clipToBounds: true,
      generateContours: true,
    });
    
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);

    const handleDomainChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setComputationalDomain(prev => ({ ...prev, [name]: Number(value) }));
    };

    const handleAddConceptualLayer = () => {
        const newLayer: LocalSoilLayer = { id: uuidv4(), name: `新土层 ${conceptualLayers.length + 1}`, thickness: 10, soilType: 'sand', color: LITHOLOGY_COLORS.sand };
        setConceptualLayers(produce(draft => { draft.push(newLayer); }));
    };

    const handleUpdateConceptualLayer = (id: string, field: keyof LocalSoilLayer, value: any) => {
        setConceptualLayers(produce(draft => {
            const layer = draft.find(l => l.id === id);
            if (layer) {
                (layer[field] as any) = value;
                if (field === 'soilType') layer.color = LITHOLOGY_COLORS[value as keyof typeof LITHOLOGY_COLORS] || '#cccccc';
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
            type: 'CreateConceptualLayers',
            name: '概念地质模型',
            parameters: {
                layers: conceptualLayers.map(l => ({ name: l.name, thickness: l.thickness, material: l.soilType })),
                domain: computationalDomain
            }
        };
        addFeature(feature);
        enqueueSnackbar('概念地质模型已生成并添加至历史记录', { variant: 'success' });
        setGeologicalModel(null);
    };

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
                    if (requiredFields.some(f => !results.meta.fields?.includes(f))) {
                        setError(`CSV文件缺少必需的列: ${requiredFields.join(', ')}`);
                        setBoreholeData([]);
                    } else {
                        const parsedData = (results.data as any[]).filter(row => requiredFields.every(f => row[f] != null));
                        setBoreholeData(parsedData);
                        enqueueSnackbar(`成功解析 ${parsedData.length} 条钻孔数据`, { variant: 'success' });
                    }
                    setIsLoading(false);
                },
                error: (err: any) => { setError(`解析CSV文件时出错: ${err.message}`); setIsLoading(false); }
            });
        }
    };

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = event.target;
        setModelParams(prev => ({ ...prev, [name]: value }));
    };

    const handleGenerateDataDrivenModel = async () => {
        if (boreholeData.length < 3) {
            enqueueSnackbar('数据不足，至少需要3个钻孔点才能生成模型。', { variant: 'warning' });
            return;
        }

        // 1. 立即更新UI状态，提供即时反馈
        setIsLoading(true);
        setError(null);
        enqueueSnackbar('正在生成三维地质模型...', { 
            variant: 'info',
            anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
            persist: true // 保持显示，直到成功或失败
        });

        try {
            const [resolutionX, resolutionY] = modelParams.resolution.split(',').map(Number);
            const uniqueFormations = [...new Set(boreholeData.map(d => d.formation))];
            const formationsPayload = { "DefaultSeries": uniqueFormations.join(',') };

            const payload: GeologyModelRequest = {
                borehole_data: boreholeData,
                formations: formationsPayload,
                options: {
                    resolutionX,
                    resolutionY,
                    alpha: Number(modelParams.alpha) || 0,
                    kernel_radius: Number(modelParams.kernelRadius),
                    clip_to_bounds: modelParams.clipToBounds,
                }
            };

            // 2. 执行核心异步操作
            const layers = await createDataDrivenGeologicalModel(payload);

            // 3. 将结果提交给全局状态，这是此组件的主要职责
            // 构造符合新 store 结构的 GeologicalModel 对象
            const visibility = layers.reduce((acc, layer) => {
                acc[layer.name] = true; // 默认全部可见
                return acc;
            }, {} as { [key: string]: boolean });

            const newModel = {
                layers: layers,
                wireframe: false, // 默认非线框模式
                visibility: visibility,
            };

            setGeologicalModel(newModel);

            // 4. 更新UI，通知用户成功
            enqueueSnackbar('三维地质模型生成成功！', { 
                    variant: 'success',
                    anchorOrigin: { vertical: 'bottom', horizontal: 'right' }
                });
        } catch (err: any) {
            const errorMessage = err.response?.data?.detail || err.message || '发生未知错误';
            setError(`生成失败: ${errorMessage}`);
            enqueueSnackbar(`模型生成失败: ${errorMessage}`, { variant: 'error' });
            // 失败时清空模型，以防显示旧数据
            setGeologicalModel(null);
        } finally {
            // 4. 无论成功与否，最后都更新UI状态
            // 这种分离的模式可以避免在await期间因重渲染导致的问题
            setIsLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 2, height: '100%', overflowY: 'auto' }}>
            <Typography variant="h6" gutterBottom>地质模型创建</Typography>
            <Divider sx={{ mb: 2 }} />
            <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                <Tab label="概念建模" />
                <Tab label="数据驱动建模" />
            </Tabs>
            
            {/* --- 概念建模标签页 --- */}
            <TabPanel value={activeTab} index={0}>
                <Grid container spacing={2}>
                    {/* 左侧：参数与列表 */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>1. 定义计算域</Typography>
                        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                            <TextField label="宽度 (X-Size)" name="xSize" type="number" value={computationalDomain.xSize} onChange={handleDomainChange} />
                            <TextField label="长度 (Y-Size)" name="zSize" type="number" value={computationalDomain.zSize} onChange={handleDomainChange} />
                        </Stack>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="subtitle1" gutterBottom>2. 设计土层</Typography>
                        <Box sx={{ maxHeight: 300, overflowY: 'auto', pr: 1 }}>
                            {conceptualLayers.map(layer => <CompactLayerEditor key={layer.id} layer={layer} onUpdate={handleUpdateConceptualLayer} onDelete={handleOpenDeleteConfirm} />)}
                        </Box>
                        <Button startIcon={<AddIcon />} onClick={handleAddConceptualLayer} sx={{ mt: 1 }}>添加土层</Button>
                    </Grid>
                    {/* 右侧：预览与操作 */}
                    <Grid item xs={12}>
                        <MultiViewGeologicalModel layers={conceptualLayers} />
                        <Button fullWidth variant="contained" color="primary" sx={{ mt: 2 }} onClick={handleGenerateConceptualModel}>生成概念地质模型</Button>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* --- 数据驱动建模标签页 --- */}
            <TabPanel value={activeTab} index={1}>
                <Grid container spacing={3}>
                    {/* 左侧：数据上传与预览 */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>1. 上传钻孔数据</Typography>
                        <Button variant="contained" component="label" startIcon={<UploadFileIcon />}>
                            上传钻孔数据 (CSV)
                            <input type="file" hidden accept=".csv" onChange={handleDataFileChange} />
                        </Button>
                        {uploadedFileName && <Chip label={uploadedFileName} onDelete={() => { setUploadedFileName(null); setBoreholeData([]); }} sx={{ ml: 1 }} />}
                        <Box sx={{ height: 300, overflowY: 'auto', mt: 2 }}>
                            <TableContainer component={Paper} variant="outlined">
                                <Table stickyHeader size="small">
                                    <TableHead><TableRow><TableCell>X</TableCell><TableCell>Y</TableCell><TableCell>Z</TableCell><TableCell>Formation</TableCell></TableRow></TableHead>
                                    <TableBody>
                                        {boreholeData.slice(0, 100).map((row, i) => (
                                            <TableRow key={i}><TableCell>{row.x}</TableCell><TableCell>{row.y}</TableCell><TableCell>{row.z}</TableCell><TableCell>{row.formation}</TableCell></TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                            {boreholeData.length > 100 && <Typography variant="caption" color="text.secondary">仅显示前100条数据...</Typography>}
                        </Box>
                    </Grid>
                    {/* 右侧：参数设置与生成 */}
                    <Grid item xs={12}>
                        <Typography variant="subtitle1" gutterBottom>2. 设置生成参数</Typography>
                        <Card variant="outlined">
                            <CardContent>
                                <Accordion defaultExpanded>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">VTK 插值参数 (主要方法)</Typography></AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12} sm={6}>
                                                <Tooltip title="高斯核函数半径，控制插值表面的平滑程度。值越大表面越平滑，但可能丢失细节。">
                                                    <TextField
                                                        fullWidth
                                                        label="核函数半径 (Kernel Radius)"
                                                        name="kernelRadius"
                                                        type="number"
                                                        value={modelParams.kernelRadius}
                                                        onChange={handleParamChange}
                                                        inputProps={{ step: "1.0", min: 0 }}
                                                    />
                                                </Tooltip>
                                            </Grid>
                                            <Grid item xs={12} sm={6}>
                                                <TextField
                                                    fullWidth
                                                    label="插值分辨率 (X,Y)"
                                                    name="resolution"
                                                    value={modelParams.resolution}
                                                    onChange={handleParamChange}
                                                    helperText="例如: 50,50"
                                                />
                                            </Grid>
                                            <Grid item xs={12}>
                                                <FormControlLabel 
                                                    control={<Switch checked={modelParams.clipToBounds} onChange={(e) => setModelParams(prev => ({ ...prev, clipToBounds: e.target.checked }))} name="clipToBounds" />} 
                                                    label="将曲面裁剪到数据范围" 
                                                />
                                                <Typography variant="caption" display="block" color="text.secondary">
                                                    开启后，生成的地质曲面将被限制在钻孔数据的水平范围内，避免不必要的延伸。
                                                </Typography>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">Delaunay三角剖分 (备用)</Typography></AccordionSummary>
                                    <AccordionDetails>
                                        <Grid container spacing={2}>
                                            <Grid item xs={12}>
                                                <Tooltip title="Alpha值控制三角剖分的裁剪程度，仅在VTK插值失败时作为备用方法使用。0 = 自动（推荐，生成凸包）；值越大裁剪越严格。">
                                                    <TextField
                                                        fullWidth
                                                        label="Alpha值 (Alpha Value)"
                                                        name="alpha"
                                                        type="number"
                                                        value={modelParams.alpha}
                                                        onChange={handleParamChange}
                                                        inputProps={{ step: "0.1", min: 0 }}
                                                    />
                                                </Tooltip>
                                            </Grid>
                                        </Grid>
                                    </AccordionDetails>
                                </Accordion>
                                <Accordion>
                                    <AccordionSummary expandIcon={<ExpandMoreIcon />}><Typography variant="subtitle2">高级与可视化选项</Typography></AccordionSummary>
                                    <AccordionDetails>
                                        <FormControlLabel control={<Switch checked={modelParams.generateContours} onChange={(e) => setModelParams(prev => ({ ...prev, generateContours: e.target.checked }))} name="generateContours" />} label="生成地表等高线" />
                                    </AccordionDetails>
                                </Accordion>
                            </CardContent>
                        </Card>
                        <Box sx={{ pt: 2 }}>
                            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
                            {isLoading && <LinearProgress sx={{ mb: 2 }} />}
                            <Tooltip title={boreholeData.length === 0 ? "请先上传钻孔数据" : "根据钻孔数据生成三维地质模型"}>
                                <span>
                                    <Button variant="contained" color="primary" size="large" fullWidth onClick={handleGenerateDataDrivenModel} disabled={isLoading || boreholeData.length === 0}>
                                        {isLoading ? '正在生成...' : '生成三维地质模型'}
                                    </Button>
                                </span>
                            </Tooltip>
                        </Box>
                    </Grid>
                </Grid>
            </TabPanel>

            {/* 删除确认对话框 */}
            <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent><DialogContentText>您确定要删除这个土层吗？此操作无法撤销。</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>取消</Button>
                    <Button onClick={handleConfirmDelete} color="error">删除</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default GeologicalModelCreator;