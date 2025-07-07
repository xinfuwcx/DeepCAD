/**
 * 地质模型创建器 - 两标签页重构版
 * @description 根据反馈，重构为"概念建模"和"数据驱动建模"两个核心标签页，优化工作流。
 * @author Deep Excavation Team
 * @date 2025-01-29
 */
import React, { useState } from 'react';
import {
    Box, Button, Typography, Stack, Paper, FormControl, InputLabel, Select, MenuItem, TextField, Grid, Divider, IconButton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Tabs, Tab, Accordion, AccordionSummary, AccordionDetails,
    Card, CardContent, Tooltip, Chip, ToggleButtonGroup, ToggleButton
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

import { useStore } from '../../core/store';
import { SOIL_MATERIALS } from '../../core/bimColorSystem';
import { LITHOLOGY_COLORS } from '../../core/geologicalColorSchemes';
import DiagramRenderer from '../shared/DiagramRenderer';
import { CreateGeologicalModelFeature, CreateConceptualLayersFeature, ConceptualLayer, GemPyParams as StoreGemPyParams } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface BoreholePoint { id: string; x: number; y: number; z: number; surface: string; }
interface Orientation { id: string; x: number; y: number; z: number; azimuth: number; dip: number; polarity: number; surface: string; }
interface LocalSoilLayer { id: string; name: string; thickness: number; soilType: string; color: string; }
interface GemPyParams extends StoreGemPyParams {}
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
    const [activeTab, setActiveTab] = useState(0);

    // 概念建模状态
    const [conceptualLayers, setConceptualLayers] = useState<LocalSoilLayer[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

    // 数据驱动建模状态
    const [interfacePoints, setInterfacePoints] = useState<BoreholePoint[]>([]);
    const [orientations, setOrientations] = useState<Orientation[]>([]);
    const [uploadedInterfaceFileName, setUploadedInterfaceFileName] = useState<string | null>(null);
    const [uploadedOrientationFileName, setUploadedOrientationFileName] = useState<string | null>(null);
    const [gempyParams, setGempyParams] = useState<GemPyParams>({ resolution: [50, 50, 50], c_o: 50000, algorithm: 'kriging' });
    const [error, setError] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // --- 事件处理 ---
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);

    // 概念建模处理
    const handleAddConceptualLayer = () => {
        const defaultSoilType = 'clay_silty';
        const newLayer: LocalSoilLayer = { 
            id: uuidv4(), name: `土层 ${conceptualLayers.length + 1}`, thickness: 10, soilType: defaultSoilType, 
            color: LITHOLOGY_COLORS[defaultSoilType as keyof typeof LITHOLOGY_COLORS] || '#cccccc' 
        };
        setConceptualLayers(produce(draft => { draft.push(newLayer); }));
    };
    const handleUpdateConceptualLayer = (id: string, field: keyof LocalSoilLayer, value: any) => {
        setConceptualLayers(produce(draft => {
            const layer = draft.find(l => l.id === id);
            if (layer) {
                (layer as any)[field] = value;
                if (field === 'soilType') layer.color = LITHOLOGY_COLORS[value as keyof typeof LITHOLOGY_COLORS] || '#cccccc';
            }
        }));
    };
    const handleOpenDeleteConfirm = (id: string) => { setLayerToDelete(id); setDeleteConfirmOpen(true); };
    const handleCloseDeleteConfirm = () => { setDeleteConfirmOpen(false); setLayerToDelete(null); };
    const handleConfirmDelete = () => {
        if (layerToDelete) setConceptualLayers(conceptualLayers.filter(l => l.id !== layerToDelete));
        handleCloseDeleteConfirm();
    };
    const handleGenerateConceptualModel = () => {
        const newFeature: CreateConceptualLayersFeature = {
            id: uuidv4(), name: '概念地质模型', type: 'CreateConceptualLayers',
            parameters: { layers: conceptualLayers.map(l => ({ name: l.name, thickness: l.thickness, material: l.soilType })) }
        };
        addFeature(newFeature);
    };

    // 数据驱动建模处理
    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>, type: 'interface' | 'orientation') => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (type === 'interface') setUploadedInterfaceFileName(file.name);
        else setUploadedOrientationFileName(file.name);
        
        setError(null);
        Papa.parse(file, {
            header: true, skipEmptyLines: true,
            complete: (results) => {
                const data = results.data as any[];
                if (type === 'interface') {
                    const parsedData = data.map(row => ({ id: uuidv4(), x: parseFloat(row.X), y: parseFloat(row.Y), z: parseFloat(row.Z), surface: row.surface }))
                        .filter(p => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && p.surface);
                    if (parsedData.length === 0) { setError(`No valid interface points found in "${file.name}".`); return; }
                    setInterfacePoints(parsedData);
                } else {
                    const parsedData = data.map(row => ({ id: uuidv4(), x: parseFloat(row.X), y: parseFloat(row.Y), z: parseFloat(row.Z), azimuth: parseFloat(row.azimuth), dip: parseFloat(row.dip), polarity: 1, surface: row.surface }))
                        .filter(p => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && !isNaN(p.azimuth) && !isNaN(p.dip) && p.surface);
                    if (parsedData.length === 0) { setError(`No valid orientations found in "${file.name}".`); return; }
                    setOrientations(parsedData);
                }
            },
            error: (err: any) => setError(`File parsing error: ${err.message}`)
        });
    };
    const handleGempyParamChange = (event: any) => {
        const { name, value } = event.target;
        if(name === 'resX') setGempyParams(p => ({...p, resolution: [Number(value), p.resolution[1], p.resolution[2]]}));
        else if(name === 'resY') setGempyParams(p => ({...p, resolution: [p.resolution[0], Number(value), p.resolution[2]]}));
        else if(name === 'resZ') setGempyParams(p => ({...p, resolution: [p.resolution[0], p.resolution[1], Number(value)]}));
        else if (name) setGempyParams(p => ({ ...p, [name]: value }));
    };
    const handleGenerateDataDrivenModel = () => {
        const feature: CreateGeologicalModelFeature = {
            id: uuidv4(), name: `数据驱动地质模型`, type: 'CreateGeologicalModel',
            parameters: { boreholes: interfacePoints, orientations: orientations, gempy_params: gempyParams }
        };
        addFeature(feature);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, pb: 0, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TerrainIcon />地质模型</Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth" centered>
                        <Tab label="概念建模" />
                        <Tab label="数据驱动建模" />
                    </Tabs>
                </Box>
            </Paper>

            <TabPanel value={activeTab} index={0}>
                {/* --- 概念建模 UI - 上中下布局优化版 --- */}
                <Stack spacing={2}>
                    {/* 上部：土层定义 */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            定义水平土层
                            <Button 
                                size="small" 
                                startIcon={<AddIcon />} 
                                onClick={handleAddConceptualLayer}
                                variant="outlined"
                            >
                                添加土层
                            </Button>
                        </Typography>
                        
                        <Box sx={{ maxHeight: 200, overflowY: 'auto', pr: 1 }}>
                            {conceptualLayers.length === 0 ? (
                                <Box sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(0,0,0,0.03)', borderRadius: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        请添加至少一个土层
                                    </Typography>
                                </Box>
                            ) : (
                                conceptualLayers.map((layer) => (
                                    <CompactLayerEditor 
                                        key={layer.id} 
                                        layer={layer} 
                                        onUpdate={handleUpdateConceptualLayer} 
                                        onDelete={handleOpenDeleteConfirm} 
                                    />
                                ))
                            )}
                        </Box>
                    </Paper>
                    
                    {/* 中部：多视图预览 */}
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <MultiViewGeologicalModel layers={conceptualLayers} />
                    </Paper>
                    
                    {/* 底部：操作按钮 */}
                    <Button 
                        fullWidth 
                        variant="contained" 
                        onClick={handleGenerateConceptualModel} 
                        disabled={conceptualLayers.length === 0}
                    >
                        生成概念模型
                    </Button>
                </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
                {/* --- 数据驱动建模 UI --- */}
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                         <Typography variant="subtitle1" gutterBottom>1. 上传地质数据 (可选)</Typography>
                         <DataInputSection title="地表接触点 (Interface Points)" onFileUpload={(e) => handleFileUpload(e, 'interface')} fileName={uploadedInterfaceFileName}>
                             <Typography variant="body2" color="text.secondary">必需。定义地层位置。CSV须包含 'X', 'Y', 'Z', 'surface' 列。</Typography>
                         </DataInputSection>
                         <DataInputSection title="地质构造产状 (Orientations)" onFileUpload={(e) => handleFileUpload(e, 'orientation')} fileName={uploadedOrientationFileName}>
                              <Typography variant="body2" color="text.secondary">可选。定义地层方向。CSV须包含 'X', 'Y', 'Z', 'azimuth', 'dip', 'surface' 列。</Typography>
                         </DataInputSection>
                    </Paper>
                     <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle1" gutterBottom>2. 定义地层层序</Typography>
                          <Paper elevation={0} variant="outlined" sx={{p:2, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 80, bgcolor: 'rgba(0,0,0,0.05)'}}>
                              <Typography variant="body2" color="text.secondary">(未来将在此实现可拖拽的地层顺序列表)</Typography>
                          </Paper>
                    </Paper>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" gutterBottom>3. GemPy 算法参数</Typography>
                        <Grid container spacing={2} sx={{pt: 1}}>
                            <Grid item xs={4}><TextField fullWidth size="small" label="X分辨率" name="resX" value={gempyParams.resolution[0]} onChange={handleGempyParamChange} /></Grid>
                            <Grid item xs={4}><TextField fullWidth size="small" label="Y分辨率" name="resY" value={gempyParams.resolution[1]} onChange={handleGempyParamChange} /></Grid>
                            <Grid item xs={4}><TextField fullWidth size="small" label="Z分辨率" name="resZ" value={gempyParams.resolution[2]} onChange={handleGempyParamChange} /></Grid>
                            <Grid item xs={6}><TextField fullWidth size="small" label="Co-Kriging Range (c_o)" name="c_o" value={gempyParams.c_o} onChange={handleGempyParamChange} /></Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>插值算法</InputLabel>
                                    <Select name="algorithm" value={gempyParams.algorithm} onChange={handleGempyParamChange}><MenuItem value="kriging">Kriging</MenuItem><MenuItem value="cokriging">Co-Kriging</MenuItem></Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Paper>
                     <Button fullWidth variant="contained" onClick={handleGenerateDataDrivenModel} disabled={isGenerating || interfacePoints.length === 0}>{isGenerating ? '正在生成...' : '生成数据驱动模型'}</Button>
                     {isGenerating && <LinearProgress sx={{ mt: 1 }} />}
                </Stack>
            </TabPanel>

            <Dialog open={deleteConfirmOpen} onClose={handleCloseDeleteConfirm}>
                <DialogTitle>确认删除</DialogTitle>
                <DialogContent><DialogContentText>您确定要删除这个土层吗？</DialogContentText></DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>取消</Button>
                    <Button onClick={handleConfirmDelete} color="error">删除</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GeologicalModelCreator; 