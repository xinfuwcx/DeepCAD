import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    Paper,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Grid,
    Divider,
    IconButton,
    Alert,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Tooltip,
    LinearProgress,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    FormControlLabel,
    Checkbox,
    Tabs,
    Tab,
} from '@mui/material';
import {
    Add as AddIcon,
    Delete as DeleteIcon,
    Terrain as TerrainIcon,
    Layers as LayersIcon,
    Save as SaveIcon,
    Science as ScienceIcon,
    Hub as HubIcon,
    Grain as GrainIcon,
    UploadFile as UploadFileIcon,
} from '@mui/icons-material';
import { v4 as uuidv4 } from 'uuid';
import { produce } from 'immer';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Papa from 'papaparse';
import { 
    useStore,
    GemPyParams,
    BoreholeData,
} from '../../core/store';
import { 
    getGeologicalColor, 
    createGeologicalMaterial, 
    SHANGHAI_SOIL_COLORS,
    LITHOLOGY_COLORS,
    GEMPY_COLOR_SCHEMES,
} from '../../core/geologicalColorSchemes';
import { SOIL_MATERIALS, SoilMaterialItem } from '../../core/bimColorSystem';
import DiagramRenderer from '../shared/DiagramRenderer';
import GemPyColorPreview from '../shared/GemPyColorPreview';
import { geologyService } from '../../services/geologyService';
import { CreateGeologicalModelFeature, CreateConceptualLayersFeature } from '../../services/parametricAnalysisService';

// 定义颜色方案的联合类型
type ColorScheme = 'gempy_standard' | 'gempy_highContrast' | 'gempy_pastel' | 'shanghai' | 'lithology';

interface BoreholePoint {
    id: string;
    x: number;
    y: number;
    z: number;
    surface: string;
    description: string;
}

interface LocalSoilLayer {
    id: string;
    name: string;
    thickness: number;
    soilType: string;
    color: string;
}

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
      id={`geology-tabpanel-${index}`}
      aria-labelledby={`geology-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const BoreholePreview2D: React.FC<{ points: BoreholePoint[] }> = ({ points }) => {
    if (points.length === 0) return null;

    const padding = 40;
    const width = 400;
    const height = 300;

    const xCoords = points.map(p => p.x);
    const yCoords = points.map(p => p.y);
    const minX = Math.min(...xCoords);
    const maxX = Math.max(...xCoords);
    const minY = Math.min(...yCoords);
    const maxY = Math.max(...yCoords);

    const dataWidth = maxX - minX;
    const dataHeight = maxY - minY;
    const scaleX = (width - 2 * padding) / (dataWidth || 1);
    const scaleY = (height - 2 * padding) / (dataHeight || 1);
    const scale = Math.min(scaleX, scaleY);

    const getSvgX = (x: number) => padding + (x - minX) * scale;
    const getSvgY = (y: number) => height - padding - (y - minY) * scale;

    return (
        <Box sx={{ mt: 2 }}>
            <Typography variant="h6">钻孔平面分布预览</Typography>
            <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ border: '1px solid #ccc', borderRadius: 4 }}>
                {/* Axes */}
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#aaa" />
                <line x1={padding} y1={height - padding} x2={padding} y2={padding} stroke="#aaa" />
                <text x={width - padding} y={height - padding + 15} fontSize="10" textAnchor="middle">X-坐标</text>
                <text x={padding - 15} y={padding} fontSize="10" textAnchor="middle" transform={`rotate(-90, ${padding-15}, ${padding})`}>Y-坐标</text>

                {/* Points */}
                {points.map(p => (
                    <Tooltip key={p.id} title={`(${p.x.toFixed(1)}, ${p.y.toFixed(1)})`}>
                        <circle cx={getSvgX(p.x)} cy={getSvgY(p.y)} r="4" fill="#1976d2" />
                    </Tooltip>
                ))}
            </svg>
        </Box>
    );
}

const GeologicalModelCreator: React.FC = () => {
    const [soilLayers, setSoilLayers] = useState<LocalSoilLayer[]>([]);
    const [boreholePoints, setBoreholePoints] = useState<BoreholePoint[]>([]);
    const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
    const [modelExtent, setModelExtent] = useState({ x: 500, y: 500 });
    const [topElevation, setTopElevation] = useState(0);
    const [modelId, setModelId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [layerToDelete, setLayerToDelete] = useState<string | null>(null);
    const [colorScheme, setColorScheme] = useState<ColorScheme>('gempy_standard');
    const [gempyParams, setGempyParams] = useState<GemPyParams>({
        resolution: [50, 50, 50],
        c_o: 50000,
        algorithm: 'kriging',
        generateContours: true,
    });
    const [previewData, setPreviewData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [activeAccordion, setActiveAccordion] = useState<string | false>('dataInput');
    const [activeTab, setActiveTab] = useState(0);

    const addFeature = useStore(state => state.addFeature);
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    // 准备地质剖面图数据
    const geologicalSectionData = {
        type: 'geological_section' as const,
        layers: soilLayers.map(layer => ({
            name: layer.name,
            thickness: layer.thickness,
            color: parseInt(layer.color.replace('#', '0x')),
        }))
    };
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setUploadedFileName(file.name);
            setError(null);
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0) {
                        console.error("CSV解析错误:", results.errors);
                        setError(`文件 "${file.name}" 解析失败，请检查CSV格式。`);
                        return;
                    }
                    const parsedData = results.data.map((row: any) => ({
                        id: uuidv4(),
                        x: parseFloat(row.X || row.x),
                        y: parseFloat(row.Y || row.y),
                        z: parseFloat(row.Z || row.z),
                        surface: row.surface,
                        description: row.description || '',
                    })).filter(p => !isNaN(p.x) && !isNaN(p.y) && !isNaN(p.z) && p.surface);
                    
                    if (parsedData.length === 0) {
                        setError(`无法从 "${file.name}" 中解析出有效的钻孔数据。请确保列标题为 'X', 'Y', 'Z', 和 'surface'。`);
                        return;
                    }
                    setBoreholePoints(parsedData);
                },
                error: (error: any) => {
                    console.error("CSV解析错误:", error);
                    setError(`文件解析失败: ${error.message}`);
                }
            });
        }
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleAddLayer = () => {
        const defaultSoilType = 'clay_silty';
        const colors = colorScheme === 'shanghai' ? SHANGHAI_SOIL_COLORS : LITHOLOGY_COLORS;
        
        const newLayer: LocalSoilLayer = {
            id: uuidv4(),
            name: `土层 ${soilLayers.length + 1}`,
            thickness: 10,
            soilType: defaultSoilType,
            color: (colors as any)[defaultSoilType] || '#cccccc',
        };
        setSoilLayers(produce(draft => {
            draft.push(newLayer);
        }));
    };
    
    const handleUpdateLayer = (id: string, field: keyof LocalSoilLayer, value: any) => {
        setSoilLayers(produce(draft => {
            const layer = draft.find(l => l.id === id);
            if (layer) {
                (layer[field] as any) = value;

                if (field === 'soilType') {
                    let colors: { [key: string]: string };
                    if (colorScheme.startsWith('gempy')) {
                        const schemeKey = colorScheme.replace('gempy_', '') as keyof typeof GEMPY_COLOR_SCHEMES;
                        colors = GEMPY_COLOR_SCHEMES[schemeKey];
                    } else if (colorScheme === 'shanghai') {
                        colors = SHANGHAI_SOIL_COLORS;
                    } else {
                        colors = LITHOLOGY_COLORS;
                    }
                    layer.color = colors[value as keyof typeof colors] || (colors as any).default || '#cccccc';
                }
            }
        }));
    };
    
    const handleOpenDeleteConfirm = (id: string) => {
        setLayerToDelete(id);
        setDeleteConfirmOpen(true);
    };
    
    const handleCloseDeleteConfirm = () => {
        setLayerToDelete(null);
        setDeleteConfirmOpen(false);
    };
    
    const handleConfirmDelete = () => {
        if (layerToDelete) {
            setSoilLayers(produce(draft => {
                const index = draft.findIndex(l => l.id === layerToDelete);
                if (index !== -1) {
                    draft.splice(index, 1);
                }
            }));
        }
        handleCloseDeleteConfirm();
    };
    
    const handleGenerateModel = async () => {
        if (boreholePoints.length === 0) {
            setError('请先上传并成功解析钻孔数据。');
            return;
        }
        setIsCreating(true);
        setError(null);

        try {
            const params = {
                boreholeData: boreholePoints,
                colorScheme,
                gempyParams,
            };

            const result = await geologyService.createModelFromBoreholes(params);
            
            const feature: CreateGeologicalModelFeature = {
                id: uuidv4(),
                name: `地质模型 - ${uploadedFileName || '自定义数据'}`,
                type: 'CreateGeologicalModel',
                parameters: params,
            };
            addFeature(feature);
            
            setModelId(result.modelId);
            setPreviewData(result.previewData);

        } catch (err) {
            const errorMessage = (err instanceof Error) ? err.message : '发生未知错误';
            console.error("创建地质模型失败:", err);
            setError(`创建地质模型失败: ${errorMessage}。请检查浏览器控制台获取详细信息。`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleColorSchemeChange = (e: any) => {
        const newScheme = e.target.value as ColorScheme;
        setColorScheme(newScheme);

        // 当配色方案改变时，更新所有现有图层的颜色
        setSoilLayers(produce(draft => {
            let colors: { [key: string]: string };
            if (newScheme.startsWith('gempy')) {
                const schemeKey = newScheme.replace('gempy_', '') as keyof typeof GEMPY_COLOR_SCHEMES;
                colors = GEMPY_COLOR_SCHEMES[schemeKey];
            } else if (newScheme === 'shanghai') {
                colors = SHANGHAI_SOIL_COLORS;
            } else {
                colors = LITHOLOGY_COLORS;
            }

            draft.forEach(layer => {
                layer.color = colors[layer.soilType as keyof typeof colors] || (colors as any).default ||'#cccccc';
            });
        }));
    };

    const relevantSoilMaterials = SOIL_MATERIALS.filter(material => 
        Object.keys(colorScheme === 'shanghai' ? SHANGHAI_SOIL_COLORS : LITHOLOGY_COLORS).includes(material.value)
    );

    let cumulativeElevation = topElevation;
    const layerData = soilLayers.map(layer => {
        const top = cumulativeElevation;
        cumulativeElevation -= layer.thickness;
        const bottom = cumulativeElevation;
        return { ...layer, top, bottom };
    });

    const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
        setActiveAccordion(isExpanded ? panel : false);
    };

    const handleParamChange = (panel: 'gempyParams') => (e: any) => {
        const { name, value, type, checked } = e.target;
        const val = type === 'checkbox' ? checked : type === 'number' ? parseFloat(value) : value;

        if (panel === 'gempyParams') {
            setGempyParams(prev => ({ ...prev, [name]: val }));
        }
    };
    
    const handleResolutionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parts = e.target.value.split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
        const newResolution: [number, number, number] = [
            parts.length > 0 ? parts[0] : 50,
            parts.length > 1 ? parts[1] : 50,
            parts.length > 2 ? parts[2] : 50,
        ];
        setGempyParams(prev => ({ ...prev, resolution: newResolution }));
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
    };

    // A new handler for generating conceptual model
    const handleGenerateConceptualModel = () => {
        const newFeature: CreateConceptualLayersFeature = {
            id: uuidv4(),
            name: '概念地质模型',
            type: 'CreateConceptualLayers',
            parameters: {
                layers: soilLayers,
                baseElevation: topElevation,
            }
        };
        addFeature(newFeature);
        
        // Maybe show a success message
        console.log("Conceptual geological model feature added to store.", newFeature);
    };

    return (
        <Paper elevation={3} sx={{ p: 2, m: 1, overflowY: 'auto', maxHeight: 'calc(100vh - 120px)' }}>
            <Typography variant="h6" gutterBottom>地质建模</Typography>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={activeTab} onChange={handleTabChange} aria-label="Geological modeling tabs">
                    <Tab label="专业钻孔建模 (GemPy)" id="geology-tab-0" />
                    <Tab label="快速概念建模" id="geology-tab-1" />
                </Tabs>
            </Box>

            {/* Tab Panel for Borehole Modeling */}
            <TabPanel value={activeTab} index={0}>
                <Accordion expanded={activeAccordion === 'dataInput'} onChange={handleAccordionChange('dataInput')}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>1. 数据输入 (钻孔数据)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Stack spacing={2}>
                            <Alert severity="info">请上传包含钻孔位置和地层分层信息的CSV或Excel文件。</Alert>
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
                            />
                            <Button
                                variant="outlined"
                                startIcon={<UploadFileIcon />}
                                onClick={handleUploadClick}
                            >
                                上传钻孔文件
                            </Button>
                            {uploadedFileName && (
                                <Typography variant="body2" color="text.secondary">
                                    已上传: {uploadedFileName}
                                </Typography>
                            )}
                            {boreholePoints.length > 0 && (
                                <>
                                    <BoreholePreview2D points={boreholePoints} />
                                    <Paper sx={{ maxHeight: 300, overflow: 'auto', mt: 2 }}>
                                        <TableContainer>
                                            <Table stickyHeader size="small">
                                                <TableHead>
                                                    <TableRow>
                                                        <TableCell>X</TableCell>
                                                        <TableCell>Y</TableCell>
                                                        <TableCell>Z</TableCell>
                                                        <TableCell>地层表面</TableCell>
                                                        <TableCell>描述</TableCell>
                                                    </TableRow>
                                                </TableHead>
                                                <TableBody>
                                                    {boreholePoints.slice(0, 100).map((point) => ( // 最多显示100条预览
                                                        <TableRow key={point.id}>
                                                            <TableCell>{point.x.toFixed(2)}</TableCell>
                                                            <TableCell>{point.y.toFixed(2)}</TableCell>
                                                            <TableCell>{point.z.toFixed(2)}</TableCell>
                                                            <TableCell>{point.surface}</TableCell>
                                                            <TableCell>{point.description}</TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </TableContainer>
                                    </Paper>
                                </>
                            )}
                        </Stack>
                    </AccordionDetails>
                </Accordion>
                
                <Accordion expanded={activeAccordion === 'modelingParams'} onChange={handleAccordionChange('modelingParams')}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography>2. 地质建模参数 (GemPy)</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    name="resolution"
                                    label="模型分辨率 (nx,ny,nz)"
                                    value={gempyParams.resolution.join(', ')}
                                    onChange={handleResolutionChange}
                                    fullWidth
                                    helperText="以逗号分隔, e.g., 50,50,50"
                                    variant="standard"
                                    InputLabelProps={{ shrink: true }}
                                    inputProps={{ 'aria-label': 'model-resolution' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>插值算法</InputLabel>
                                    <Select
                                        value={gempyParams.algorithm}
                                        label="插值算法"
                                        onChange={handleParamChange('gempyParams')}
                                    >
                                        <MenuItem value="kriging">克里金</MenuItem>
                                        <MenuItem value="cokriging">协同克里金</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    name="c_o"
                                    label="相关长度 (c_o)"
                                    type="number"
                                    value={gempyParams.c_o}
                                    onChange={handleParamChange('gempyParams')}
                                    fullWidth
                                    helperText="影响插值结果的平滑程度"
                                    variant="standard"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={gempyParams.generateContours}
                                            onChange={handleParamChange('gempyParams')}
                                            name="generateContours"
                                        />
                                    }
                                    label="生成结构等高线"
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel id="color-scheme-label">颜色方案</InputLabel>
                                    <Select
                                        labelId="color-scheme-label"
                                        value={colorScheme}
                                        label="颜色方案"
                                        onChange={handleColorSchemeChange}
                                    >
                                        <MenuItem value="gempy_standard">GemPy 标准</MenuItem>
                                        <MenuItem value="gempy_highContrast">GemPy 高对比度</MenuItem>
                                        <MenuItem value="gempy_pastel">GemPy 柔和</MenuItem>
                                        <MenuItem value="shanghai">上海标准</MenuItem>
                                        <MenuItem value="lithology">通用岩性</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                <Box sx={{ mt: 2, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                    <Typography variant="h6">生成模型</Typography>
                    <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleGenerateModel}
                        disabled={isCreating || boreholePoints.length === 0}
                        startIcon={<SaveIcon />}
                    >
                        {isCreating ? '正在生成...' : '生成专业地质模型'}
                    </Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                    {modelId && (
                        <Alert severity="success" sx={{ mt: 2 }}>
                            地质模型创建成功！ID: {modelId}
                        </Alert>
                    )}
                </Box>
            </TabPanel>

            {/* Tab Panel for Conceptual Modeling */}
            <TabPanel value={activeTab} index={1}>
                <Typography variant="h6">手动定义水平地层</Typography>
                <Alert severity="info" sx={{mb: 2}}>
                    此功能用于快速创建概念性的、水平均匀的地质模型。
                </Alert>

                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>图层名称</TableCell>
                                <TableCell>厚度 (m)</TableCell>
                                <TableCell>材料类型</TableCell>
                                <TableCell>颜色</TableCell>
                                <TableCell>操作</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {soilLayers.map((layer) => (
                                <TableRow key={layer.id}>
                                    <TableCell>
                                        <TextField 
                                            variant="standard"
                                            value={layer.name}
                                            onChange={(e) => handleUpdateLayer(layer.id, 'name', e.target.value)}
                                            inputProps={{ 'aria-label': `layer-name-${layer.id}` }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <TextField 
                                            variant="standard"
                                            type="number"
                                            value={layer.thickness}
                                            onChange={(e) => handleUpdateLayer(layer.id, 'thickness', parseFloat(e.target.value))}
                                            sx={{width: '80px'}}
                                            inputProps={{ 'aria-label': `layer-thickness-${layer.id}` }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Select
                                            variant="standard"
                                            value={layer.soilType}
                                            onChange={(e) => handleUpdateLayer(layer.id, 'soilType', e.target.value)}
                                            inputProps={{ 'aria-label': `layer-soil-type-${layer.id}` }}
                                        >
                                            {SOIL_MATERIALS.map(material => (
                                                <MenuItem key={material.value} value={material.value}>
                                                    {material.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Box sx={{ width: 24, height: 24, bgcolor: layer.color, borderRadius: 1, border: '1px solid #ccc' }} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" onClick={() => handleOpenDeleteConfirm(layer.id)}>
                                            <DeleteIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>

                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                    <Button startIcon={<AddIcon />} onClick={handleAddLayer}>
                        添加新图层
                    </Button>
                </Stack>
                
                <Box sx={{ mt: 3, p: 2, backgroundColor: '#f9f9f9', borderRadius: 1 }}>
                    <Typography variant="h6">二维剖面示意图</Typography>
                    <DiagramRenderer 
                        type='geological_section' 
                        data={{ layers: soilLayers.map(l => ({ name: l.name, thickness: l.thickness, color: l.color }))}} 
                    />
                     <Button 
                        variant="contained" 
                        color="primary" 
                        onClick={handleGenerateConceptualModel}
                        disabled={isCreating || soilLayers.length === 0}
                        startIcon={<SaveIcon />}
                        sx={{mt: 2}}
                    >
                        {isCreating ? '正在生成...' : '生成概念模型'}
                    </Button>
                </Box>
            </TabPanel>

            <Dialog
                open={deleteConfirmOpen}
                onClose={handleCloseDeleteConfirm}
            >
                <DialogTitle id="alert-dialog-title">确认删除</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        您确定要删除这个土层吗？此操作无法撤销。
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteConfirm}>取消</Button>
                    <Button onClick={handleConfirmDelete} color="error">
                        删除
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default GeologicalModelCreator; 