/**
 * 地质模型创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState, useRef } from 'react';
import {
    Box, Button, Typography, Stack, Paper, FormControl, InputLabel, Select, MenuItem, TextField, Grid, Divider, IconButton, Alert, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, LinearProgress, Tabs, Tab
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, Terrain as TerrainIcon, UploadFile as UploadFileIcon, Map as MapIcon, DataObject as DataObjectIcon, EditLocation as EditLocationIcon } from '@mui/icons-material';
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
    return <div role="tabpanel" hidden={value !== index} {...other}><Box sx={{ pt: 2 }}>{children}</Box></div>;
}

const BoreholePreview2D: React.FC<{ points: BoreholePoint[] }> = ({ points }) => {
    return (
        <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Typography variant="caption" color="text.secondary" align="center">
                {points.length > 0 ? `已加载 ${points.length} 个钻孔点` : '上传数据后将在此显示钻孔位置的2D示意图'}
            </Typography>
        </Paper>
    );
};


// --- 主组件 ---
const GeologicalModelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [activeTab, setActiveTab] = useState(0);

    // 概念建模状态
    const [soilLayers, setSoilLayers] = useState<LocalSoilLayer[]>([]);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [layerToDelete, setLayerToDelete] = useState<string | null>(null);

    // 数据与算法状态 (原钻孔建模)
    const [boreholePoints, setBoreholePoints] = useState<BoreholePoint[]>([]);
    const [orientations, setOrientations] = useState<Orientation[]>([]);
    const [uploadedBoreholeFileName, setUploadedBoreholeFileName] = useState<string | null>(null);
    const [uploadedOrientationFileName, setUploadedOrientationFileName] = useState<string | null>(null);
    const [gempyParams, setGempyParams] = useState<GemPyParams>({ resolution: [50, 50, 50], c_o: 50000, algorithm: 'kriging' });
    const [error, setError] = useState<string | null>(null);

    // 通用状态
    const [isCreating, setIsCreating] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // --- 事件处理 ---
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => setActiveTab(newValue);

    // 概念建模
    const handleAddLayer = () => {
        const defaultSoilType = 'clay_silty';
        const newLayer: LocalSoilLayer = { 
            id: uuidv4(), 
            name: `土层 ${soilLayers.length + 1}`, 
            thickness: 10, 
            soilType: defaultSoilType, 
            color: LITHOLOGY_COLORS[defaultSoilType as keyof typeof LITHOLOGY_COLORS] || '#cccccc' 
        };
        setSoilLayers(produce(draft => { draft.push(newLayer); }));
    };
    const handleUpdateLayer = (id: string, field: keyof LocalSoilLayer, value: any) => {
        setSoilLayers(produce(draft => {
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
        if (layerToDelete) setSoilLayers(soilLayers.filter(l => l.id !== layerToDelete));
        handleCloseDeleteConfirm();
    };
    const handleGenerateConceptualModel = () => {
        const newFeature: CreateConceptualLayersFeature = {
            id: uuidv4(), name: '概念地质模型', type: 'CreateConceptualLayers',
            parameters: { 
                layers: soilLayers.map(l => ({ 
                    name: l.name, 
                    thickness: l.thickness, 
                    material: l.soilType 
                }))
            }
        };
        addFeature(newFeature);
    };

    // 数据与算法处理 (原钻孔建模)
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'borehole' | 'orientation') => {
        const file = event.target.files?.[0];
        if (file) {
            if (type === 'borehole') setUploadedBoreholeFileName(file.name);
            if (type === 'orientation') setUploadedOrientationFileName(file.name);
            setError(null);
            Papa.parse(file, {
                header: true, skipEmptyLines: true,
                complete: (results) => {
                    if (type === 'borehole') {
                        const parsedData = (results.data as any[]).map(row => ({ id: uuidv4(), x: parseFloat(row.X), y: parseFloat(row.Y), z: parseFloat(row.Z), surface: row.surface }))
                            .filter(p => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && p.surface);
                        if (parsedData.length === 0) { setError(`Borehole: No valid data in "${file.name}".`); return; }
                        setBoreholePoints(parsedData);
                    } else if (type === 'orientation') {
                        const parsedData = (results.data as any[]).map(row => ({ id: uuidv4(), x: parseFloat(row.X), y: parseFloat(row.Y), z: parseFloat(row.Z), azimuth: parseFloat(row.azimuth), dip: parseFloat(row.dip), polarity: 1, surface: row.surface }))
                            .filter(p => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && !isNaN(p.azimuth) && !isNaN(p.dip) && p.surface);
                        if (parsedData.length === 0) { setError(`Orientation: No valid data in "${file.name}".`); return; }
                        setOrientations(parsedData);
                    }
                },
                error: (err: any) => setError(`File parsing error: ${err.message}`)
            });
        }
    };
    const handleGempyParamChange = (event: any) => {
        const { name, value } = event.target;
        if(name === 'resX') setGempyParams(p => ({...p, resolution: [Number(value), p.resolution[1], p.resolution[2]]}));
        else if(name === 'resY') setGempyParams(p => ({...p, resolution: [p.resolution[0], Number(value), p.resolution[2]]}));
        else if(name === 'resZ') setGempyParams(p => ({...p, resolution: [p.resolution[0], p.resolution[1], Number(value)]}));
        else if (name) setGempyParams(p => ({ ...p, [name]: value }));
    };
    const handleGenerateBoreholeModel = () => {
        const feature: CreateGeologicalModelFeature = {
            id: uuidv4(), name: `地质模型 - GemPy`, type: 'CreateGeologicalModel',
            parameters: {
                boreholes: boreholePoints,
                orientations: orientations,
                gempy_params: gempyParams
            }
        };
        addFeature(feature);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, pb:0, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TerrainIcon />地质模型</Typography>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={activeTab} onChange={handleTabChange} variant="fullWidth">
                        <Tab label="概念建模" />
                        <Tab label="地质图模式" icon={<MapIcon />} iconPosition="start" />
                        <Tab label="数据与算法" icon={<DataObjectIcon />} iconPosition="start" />
                    </Tabs>
                </Box>
            </Paper>

            <TabPanel value={activeTab} index={0}>
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead><TableRow><TableCell>层名</TableCell><TableCell>厚度(m)</TableCell><TableCell>岩性</TableCell><TableCell>操作</TableCell></TableRow></TableHead>
                                <TableBody>
                                    {soilLayers.map((layer) => (
                                        <TableRow key={layer.id}>
                                            <TableCell sx={{minWidth: '100px'}}><TextField fullWidth variant="standard" value={layer.name} onChange={(e) => handleUpdateLayer(layer.id, 'name', e.target.value)} /></TableCell>
                                            <TableCell><TextField sx={{width: '60px'}} variant="standard" type="number" value={layer.thickness} onChange={(e) => handleUpdateLayer(layer.id, 'thickness', parseFloat(e.target.value))} /></TableCell>
                                            <TableCell>
                                                <Select fullWidth variant="standard" value={layer.soilType} onChange={(e) => handleUpdateLayer(layer.id, 'soilType', e.target.value)}>
                                                    {SOIL_MATERIALS.map(m => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
                                                </Select>
                                            </TableCell>
                                            <TableCell><IconButton size="small" onClick={() => handleOpenDeleteConfirm(layer.id)}><DeleteIcon /></IconButton></TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        <Button startIcon={<AddIcon />} onClick={handleAddLayer} sx={{ mt: 1 }}>添加土层</Button>
                    </Paper>
                    <Paper variant="outlined" sx={{ height: 200, p: 1, bgcolor: 'rgba(0,0,0,0.1)' }}>
                        <DiagramRenderer type="geological_section" data={soilLayers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color }))} />
                    </Paper>
                    <Button fullWidth variant="contained" onClick={handleGenerateConceptualModel} disabled={soilLayers.length === 0}>生成概念模型</Button>
                </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={1}>
                <Stack spacing={2}>
                    <Typography variant="subtitle1">交互式地质图建模</Typography>
                    <Paper variant="outlined" sx={{ p: 1, height: 400, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', bgcolor: 'rgba(0,0,0,0.1)' }}>
                        <EditLocationIcon sx={{ fontSize: 40, color: 'text.secondary' }} />
                        <Typography variant="h6" color="text.secondary">2D交互式绘图区</Typography>
                        <Typography variant="caption" color="text.secondary">（未来将支持加载底图、绘制点、线和等高线）</Typography>
                    </Paper>
                     <Button fullWidth variant="contained" onClick={() => {}} disabled>从交互输入生成模型</Button>
                </Stack>
            </TabPanel>

            <TabPanel value={activeTab} index={2}>
                <Stack spacing={3}>
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Stack spacing={2}>
                             <Box>
                                <Typography variant="subtitle2" gutterBottom>1. 上传地质数据 (CSV)</Typography>
                                <Stack direction="row" spacing={2} alignItems="center" sx={{mb: 1}}>
                                    <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} component="label">钻孔点<input type="file" onChange={(e) => handleFileChange(e, 'borehole')} hidden accept=".csv" /></Button>
                                    {uploadedBoreholeFileName && <Typography variant="caption" noWrap>已选: {uploadedBoreholeFileName}</Typography>}
                                </Stack>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Button size="small" variant="outlined" startIcon={<UploadFileIcon />} component="label">构造方向<input type="file" onChange={(e) => handleFileChange(e, 'orientation')} hidden accept=".csv" /></Button>
                                    {uploadedOrientationFileName && <Typography variant="caption" noWrap>已选: {uploadedOrientationFileName}</Typography>}
                                </Stack>
                                {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                            </Box>
                            <Divider/>
                            <Box>
                                <Typography variant="subtitle2" gutterBottom>2. GemPy建模参数</Typography>
                                <Grid container spacing={2}>
                                    <Grid item xs={4}><TextField fullWidth size="small" label="X分辨率" name="resX" value={gempyParams.resolution[0]} onChange={handleGempyParamChange} /></Grid>
                                    <Grid item xs={4}><TextField fullWidth size="small" label="Y分辨率" name="resY" value={gempyParams.resolution[1]} onChange={handleGempyParamChange} /></Grid>
                                    <Grid item xs={4}><TextField fullWidth size="small" label="Z分辨率" name="resZ" value={gempyParams.resolution[2]} onChange={handleGempyParamChange} /></Grid>
                                    <Grid item xs={6}><TextField fullWidth size="small" label="趋势函数c_o" name="c_o" value={gempyParams.c_o} onChange={handleGempyParamChange} /></Grid>
                                    <Grid item xs={6}>
                                        <FormControl fullWidth size="small">
                                            <InputLabel>插值算法</InputLabel>
                                            <Select name="algorithm" value={gempyParams.algorithm} onChange={handleGempyParamChange}><MenuItem value="kriging">Kriging</MenuItem><MenuItem value="cokriging">Co-Kriging</MenuItem></Select>
                                        </FormControl>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Stack>
                    </Paper>
                    <BoreholePreview2D points={boreholePoints} />
                    <Button fullWidth variant="contained" onClick={handleGenerateBoreholeModel} disabled={isCreating || (boreholePoints.length === 0 && orientations.length === 0)}>{isCreating ? '正在生成...' : '生成地质模型'}</Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
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