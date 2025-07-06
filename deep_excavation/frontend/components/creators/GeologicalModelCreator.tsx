import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    Chip,
    Paper,
    List,
    ListItem,
    ListItemText,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    FormControlLabel,
    Switch,
    Alert,
    LinearProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Card,
    CardContent,
    CardActions,
    IconButton,
    Tooltip,
    Badge,
    Divider,
    Tabs,
    Tab
} from '@mui/material';
import {
    UploadFile as UploadFileIcon,
    Terrain as TerrainIcon,
    Layers as LayersIcon,
    Delete as DeleteIcon,
    Visibility as VisibilityIcon,
    VisibilityOff as VisibilityOffIcon,
    Edit as EditIcon,
    Save as SaveIcon,
    Folder as FolderIcon,
    Palette as PaletteIcon,
    Science as ScienceIcon,
    Download as DownloadIcon,
    Upload as UploadIcon,
    Backup as BackupIcon,
    Add as AddIcon,
    InfoOutlined as InfoOutlinedIcon
} from '@mui/icons-material';
import { Vector3 } from 'three';
import { v4 as uuidv4 } from 'uuid';

import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { 
    getGeologicalColor, 
    createGeologicalMaterial, 
    SHANGHAI_SOIL_COLORS,
    GEOLOGICAL_PRESETS,
    generateGeologicalGradient,
    getDepthBasedColor,
    LITHOLOGY_COLORS,
    GEOLOGICAL_TIME_COLORS
} from '../../core/geologicalColorSchemes';

import { 
    SOIL_MATERIALS, 
    EXCAVATION_MATERIALS,
    getBIMMaterial, 
    createBIMMaterial
} from '../../core/bimColorSystem';
import { 
    geologicalDataManager, 
    GeologicalLayer, 
    GeologicalModel 
} from '../../core/geologicalDataManager';
import DiagramRenderer from '../shared/DiagramRenderer';
import ExcavationColorPreview from '../shared/ExcavationColorPreview';
import { GeologicalModelDiagram } from '../diagrams/ModelingDiagrams';
import GemPyColorPreview from '../shared/GemPyColorPreview';
import { geologyService } from '../../services/geologyService';
import GeologicalModelViewer from './GeologicalModelViewer';

// 地层信息接口
interface SoilLayer {
    name: string;
    pointCount: number;
    avgDepth: number;
    extent: {
        x_min: number;
        x_max: number;
        y_min: number;
        y_max: number;
        z_min: number;
        z_max: number;
    };
    soilType: string;
    color: string;
}

// 地形建模参数接口
interface TerrainModelingParams {
    algorithm: 'GemPy';
    resolution: [number, number, number];
    bufferRatio: number;
    enableUndulatingTop: boolean;
    meshSize: number;
    useOCC: boolean;
    colorScheme: 'shanghai' | 'lithology' | 'time' | 'excavation';
    visualizationPreset: 'realistic' | 'scientific' | 'artistic' | 'analysis';
}

// 2D剖面图绘制函数
const drawGeologicalSection = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    soilLayers: SoilLayer[]
) => {
    const { width, height } = canvas;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // 设置坐标系
    const margin = 40;
    const plotWidth = width - 2 * margin;
    const plotHeight = height - 2 * margin;
    
    // 绘制坐标轴
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(margin, height - margin);
    ctx.lineTo(width - margin, height - margin);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(margin, margin);
    ctx.lineTo(margin, height - margin);
    ctx.stroke();
    
    // 绘制刻度
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    
    // X轴刻度
    for (let i = 0; i <= 10; i++) {
        const x = margin + (i * plotWidth / 10);
        ctx.beginPath();
        ctx.moveTo(x, height - margin);
        ctx.lineTo(x, height - margin + 5);
        ctx.stroke();
        
        const value = i * 50 - 250;
        ctx.fillText(value.toString(), x - 10, height - margin + 20);
    }
    
    // Y轴刻度
    for (let i = 0; i <= 5; i++) {
        const y = height - margin - (i * plotHeight / 5);
        ctx.beginPath();
        ctx.moveTo(margin - 5, y);
        ctx.lineTo(margin, y);
        ctx.stroke();
        
        const value = -i * 10;
        ctx.fillText(value.toString(), margin - 25, y + 5);
    }
    
    // 绘制标签
    ctx.font = '14px Arial';
    ctx.fillText('X (m)', width - margin - 30, height - margin + 30);
    ctx.save();
    ctx.translate(margin - 30, margin + 50);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('Z (m)', 0, 0);
    ctx.restore();
    
    // 如果没有土层数据，则不绘制
    if (!soilLayers || soilLayers.length === 0) return;
    
    // 按Z坐标排序，从下到上绘制
    const sortedLayers = [...soilLayers].sort((a, b) => 
        ((a.extent.z_max - (a.extent.z_max - a.extent.z_min)) - (b.extent.z_max - (b.extent.z_max - b.extent.z_min)))
    );
    
    // 绘制土层
    sortedLayers.forEach(layer => {
        const top = layer.extent.z_max;
        const bottom = layer.extent.z_min;
        const left = -250;
        const right = 250;
        
        // 转换为画布坐标
        const x1 = margin;
        const x2 = width - margin;
        const y1 = height - margin - ((top / -50) * plotHeight);
        const y2 = height - margin - ((bottom / -50) * plotHeight);
        
        // 绘制土层矩形
        ctx.fillStyle = layer.color;
        ctx.beginPath();
        ctx.rect(x1, y1, x2 - x1, y2 - y1);
        ctx.fill();
        
        // 绘制土层边界
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        // 添加土层标签
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        const soilType = layer.soilType;
        const label = `${soilType} (${bottom.toFixed(1)}m ~ ${top.toFixed(1)}m)`;
        const textWidth = ctx.measureText(label).width;
        
        if (y2 - y1 > 20) { // 只有当土层足够高时才显示标签
            ctx.fillText(label, (x1 + x2 - textWidth) / 2, (y1 + y2) / 2);
        }
    });
};

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
            id={`geo-model-tabpanel-${index}`}
            aria-labelledby={`geo-model-tab-${index}`}
            {...other}
            style={{ height: '100%', overflow: 'auto' }}
        >
            {value === index && (
                <Box sx={{ p: 2, height: '100%' }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const GeologicalModelCreator: React.FC = () => {
    const [tabValue, setTabValue] = useState(0);
    const [soilLayers, setSoilLayers] = useState<SoilLayer[]>([]);
    const [currentLayer, setCurrentLayer] = useState<SoilLayer>({
        name: '',
        pointCount: 0,
        avgDepth: 0,
        extent: {
            x_min: 0,
            x_max: 0,
            y_min: 0,
            y_max: 0,
            z_min: 0,
            z_max: 0
        },
        soilType: 'clay',
        color: '#A67F5D'
    });
    const [modelId, setModelId] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [errors, setErrors] = useState<{[key: string]: string}>({});
    
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const addFeature = useStore(state => state.addFeature);
    
    // 绘制2D剖面图
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        drawGeologicalSection(ctx, canvas, soilLayers);
    }, [soilLayers]);
    
    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };
    
    const handleLayerChange = (field: string, value: any) => {
        if (field === 'soilType' && value !== 'custom') {
            const selectedMaterial = SOIL_MATERIALS.find(material => material.value === value);
            if (selectedMaterial) {
                setCurrentLayer({
                    ...currentLayer,
                    soilType: value,
                    color: selectedMaterial.color,
                });
            }
        } else if (field.includes('.')) {
            // 处理嵌套属性，如 extent
            const [parent, child] = field.split('.');
            setCurrentLayer({
                ...currentLayer,
                [parent]: {
                    ...currentLayer[parent as keyof SoilLayer],
                    [child]: value
                }
            });
        } else {
            setCurrentLayer({
                ...currentLayer,
                [field]: value
            });
        }
        
        // 清除错误
        if (errors[field]) {
            setErrors({
                ...errors,
                [field]: ''
            });
        }
    };
    
    const validateLayer = (): boolean => {
        const newErrors: {[key: string]: string} = {};
        
        // 验证土层厚度
        if (!currentLayer.extent.z_max || currentLayer.extent.z_max <= 0) {
            newErrors['extent.z_max'] = '土层厚度必须大于0';
        }
        
        // 验证土层宽度
        if (!currentLayer.extent.x_max || currentLayer.extent.x_max <= 0) {
            newErrors['extent.x_max'] = '土层宽度必须大于0';
        }
        
        // 验证土层长度
        if (!currentLayer.extent.y_max || currentLayer.extent.y_max <= 0) {
            newErrors['extent.y_max'] = '土层长度必须大于0';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleAddLayer = () => {
        if (!validateLayer()) return;
        
        // 添加新土层
        setSoilLayers([...soilLayers, { ...currentLayer, id: uuidv4() }]);
        
        // 准备下一个土层，调整Z坐标
        const nextZ = currentLayer.extent.z_max;
        const nextThickness = currentLayer.extent.z_max - currentLayer.extent.z_min;
        
        setCurrentLayer({
            ...currentLayer,
            extent: {
                ...currentLayer.extent,
                z_min: nextZ - nextThickness,
                z_max: nextZ
            }
        });
    };
    
    const handleRemoveLayer = (index: number) => {
        const newLayers = [...soilLayers];
        newLayers.splice(index, 1);
        setSoilLayers(newLayers);
    };
    
    const handleCreateGeologicalModel = async () => {
        if (soilLayers.length === 0) {
            alert('请至少添加一个土层');
            return;
        }
        
        setIsCreating(true);
        
        try {
            // 调用GemPy创建地质模型
            const modelId = await geologyService.createGeologicalModel(soilLayers);
            setModelId(modelId);
            
            // 创建地质模型特征
            const feature: AnyFeature = {
                id: uuidv4(),
                name: '地质模型',
                type: 'CreateGeologicalModel',
                parameters: {
                    soilLayers: soilLayers,
                    modelId: modelId
                },
            };
            
            // 添加到模型中
            addFeature(feature);
            
            // 切换到预览选项卡
            setTabValue(1);
            
        } catch (error) {
            console.error('创建地质模型失败:', error);
            alert('创建地质模型失败');
        } finally {
            setIsCreating(false);
        }
    };
    
    const handleGenerateMesh = async () => {
        if (!modelId) {
            alert('请先创建地质模型');
            return;
        }
        
        try {
            // 调用Gmsh(OCC)生成网格
            const meshId = await geologyService.generateMeshWithGmshOCC(modelId);
            
            // 创建网格特征
            const feature: AnyFeature = {
                id: uuidv4(),
                name: '地质网格',
                type: 'CreateMesh',
                parameters: {
                    modelId: modelId,
                    meshId: meshId
                },
            };
            
            // 添加到模型中
            addFeature(feature);
            
            alert('网格生成成功');
            
        } catch (error) {
            console.error('生成网格失败:', error);
            alert('生成网格失败');
        }
    };
    
    const handleImportBorehole = () => {
        // 这里应该实现钻孔数据导入功能
        alert('钻孔数据导入功能尚未实现');
    };
    
    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={handleTabChange} aria-label="geological model tabs">
                    <Tab label="土层定义" />
                    <Tab label="模型预览" />
                    <Tab label="钻孔数据" />
                </Tabs>
            </Box>
            
            <TabPanel value={tabValue} index={0}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Paper elevation={2} sx={{ p: 2, mb: 2 }}>
                            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <TerrainIcon />
                                土层参数设置
                            </Typography>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Grid container spacing={2}>
                                {/* 土层类型选择 */}
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>土层类型</InputLabel>
                                        <Select
                                            value={currentLayer.soilType}
                                            label="土层类型"
                                            onChange={(e) => handleLayerChange('soilType', e.target.value)}
                                        >
                                            {SOIL_MATERIALS.map((material) => (
                                                <MenuItem key={material.value} value={material.value} sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Box 
                                                        sx={{ 
                                                            width: 16, 
                                                            height: 16, 
                                                            bgcolor: material.color, 
                                                            mr: 1, 
                                                            borderRadius: '2px' 
                                                        }} 
                                                    />
                                                    {material.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                
                                {/* 土层颜色 */}
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="土层颜色"
                                        type="text"
                                        value={currentLayer.color}
                                        onChange={(e) => handleLayerChange('color', e.target.value)}
                                        InputProps={{
                                            startAdornment: (
                                                <Box 
                                                    sx={{ 
                                                        width: 16, 
                                                        height: 16, 
                                                        bgcolor: currentLayer.color || '#A67F5D', 
                                                        mr: 1, 
                                                        borderRadius: '2px' 
                                                    }} 
                                                />
                                            )
                                        }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            土层尺寸
                                        </Typography>
                                    </Divider>
                                </Grid>
                                
                                {/* 土层厚度 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="土层厚度 (m)"
                                        type="number"
                                        value={currentLayer.extent.z_max - currentLayer.extent.z_min}
                                        onChange={(e) => handleLayerChange('extent.z_max', parseFloat(e.target.value))}
                                        error={!!errors['extent.z_max']}
                                        helperText={errors['extent.z_max']}
                                        InputProps={{
                                            inputProps: { min: 0.1, step: 0.5 }
                                        }}
                                    />
                                </Grid>
                                
                                {/* 土层宽度 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="土层宽度 (m)"
                                        type="number"
                                        value={currentLayer.extent.x_max - currentLayer.extent.x_min}
                                        onChange={(e) => handleLayerChange('extent.x_max', parseFloat(e.target.value))}
                                        error={!!errors['extent.x_max']}
                                        helperText={errors['extent.x_max']}
                                        InputProps={{
                                            inputProps: { min: 1, step: 10 }
                                        }}
                                    />
                                </Grid>
                                
                                {/* 土层长度 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="土层长度 (m)"
                                        type="number"
                                        value={currentLayer.extent.y_max - currentLayer.extent.y_min}
                                        onChange={(e) => handleLayerChange('extent.y_max', parseFloat(e.target.value))}
                                        error={!!errors['extent.y_max']}
                                        helperText={errors['extent.y_max']}
                                        InputProps={{
                                            inputProps: { min: 1, step: 10 }
                                        }}
                                    />
                                </Grid>
                                
                                <Grid item xs={12}>
                                    <Divider sx={{ my: 1 }}>
                                        <Typography variant="body2" color="text.secondary">
                                            土层位置
                                        </Typography>
                                    </Divider>
                                </Grid>
                                
                                {/* Z坐标 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Z坐标 (m)"
                                        type="number"
                                        value={currentLayer.extent.z_min}
                                        onChange={(e) => handleLayerChange('extent.z_min', parseFloat(e.target.value))}
                                        InputProps={{
                                            inputProps: { step: 0.5 }
                                        }}
                                    />
                                </Grid>
                                
                                {/* X坐标 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="X坐标 (m)"
                                        type="number"
                                        value={currentLayer.extent.x_min}
                                        onChange={(e) => handleLayerChange('extent.x_min', parseFloat(e.target.value))}
                                        InputProps={{
                                            inputProps: { step: 10 }
                                        }}
                                    />
                                </Grid>
                                
                                {/* Y坐标 */}
                                <Grid item xs={12} sm={4}>
                                    <TextField
                                        fullWidth
                                        label="Y坐标 (m)"
                                        type="number"
                                        value={currentLayer.extent.y_min}
                                        onChange={(e) => handleLayerChange('extent.y_min', parseFloat(e.target.value))}
                                        InputProps={{
                                            inputProps: { step: 10 }
                                        }}
                                    />
                                </Grid>
                            </Grid>
                            
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={handleAddLayer}
                                    startIcon={<AddIcon />}
                                >
                                    添加土层
                                </Button>
                            </Box>
                        </Paper>
                        
                        <Paper elevation={2} sx={{ p: 2 }}>
                            <Typography variant="subtitle1" gutterBottom>
                                已添加的土层
                            </Typography>
                            
                            {soilLayers.length === 0 ? (
                                <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                    尚未添加任何土层
                                </Typography>
                            ) : (
                                <Stack spacing={1} sx={{ maxHeight: 200, overflow: 'auto' }}>
                                    {soilLayers.map((layer, index) => (
                                        <Box 
                                            key={layer.id || index} 
                                            sx={{ 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'space-between',
                                                p: 1,
                                                border: '1px solid rgba(0, 0, 0, 0.12)',
                                                borderRadius: 1,
                                                bgcolor: 'background.paper'
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <Box 
                                                    sx={{ 
                                                        width: 16, 
                                                        height: 16, 
                                                        bgcolor: layer.color || '#A67F5D', 
                                                        mr: 1, 
                                                        borderRadius: '2px' 
                                                    }} 
                                                />
                                                <Typography variant="body2">
                                                    {SOIL_MATERIALS.find(m => m.value === layer.soilType)?.label || '自定义'} 
                                                    ({layer.extent.z_min.toFixed(1)}m ~ {(layer.extent.z_max - layer.extent.z_min).toFixed(1)}m)
                                                </Typography>
                                            </Box>
                                            <IconButton size="small" onClick={() => handleRemoveLayer(index)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                    ))}
                                </Stack>
                            )}
                            
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between' }}>
                                <Button 
                                    variant="outlined" 
                                    color="primary"
                                    onClick={handleImportBorehole}
                                    startIcon={<UploadIcon />}
                                >
                                    导入钻孔数据
                                </Button>
                                <Button 
                                    variant="contained" 
                                    color="primary" 
                                    onClick={handleCreateGeologicalModel}
                                    disabled={isCreating || soilLayers.length === 0}
                                >
                                    {isCreating ? '创建中...' : '创建地质模型'}
                                </Button>
                            </Box>
                        </Paper>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={2} 
                            sx={{ 
                                p: 2, 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column'
                            }}
                        >
                            <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                地质剖面示意图
                                <Tooltip title="基于当前添加的土层绘制的XZ平面剖面图">
                                    <InfoOutlinedIcon fontSize="small" color="action" />
                                </Tooltip>
                            </Typography>
                            
                            <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <canvas 
                                    ref={canvasRef} 
                                    width={500} 
                                    height={400}
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            </TabPanel>
            
            <TabPanel value={tabValue} index={1}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button 
                            variant="contained" 
                            color="primary" 
                            onClick={handleGenerateMesh}
                            disabled={!modelId}
                            sx={{ mr: 1 }}
                        >
                            生成网格
                        </Button>
                        <Button 
                            variant="outlined" 
                            color="primary" 
                            onClick={() => {
                                if (modelId) {
                                    geologyService.exportGeologicalModel(modelId, 'vtk');
                                }
                            }}
                            disabled={!modelId}
                            startIcon={<DownloadIcon />}
                        >
                            导出模型
                        </Button>
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                        {modelId ? (
                            <GeologicalModelViewer
                                soilLayers={soilLayers}
                                modelId={modelId}
                                height="100%"
                            />
                        ) : (
                            <Paper 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    p: 3
                                }}
                            >
                                <Typography variant="body1" color="text.secondary" align="center">
                                    请先在"土层定义"选项卡中创建地质模型
                                </Typography>
                            </Paper>
                        )}
                    </Box>
                </Box>
            </TabPanel>
            
            <TabPanel value={tabValue} index={2}>
                <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Paper sx={{ p: 3, mb: 2 }}>
                        <Typography variant="h6" gutterBottom>
                            钻孔数据导入
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                            通过导入钻孔数据，可以自动生成地质模型。支持CSV、Excel格式的钻孔数据文件。
                        </Typography>
                        
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                startIcon={<UploadIcon />}
                                onClick={handleImportBorehole}
                            >
                                导入钻孔数据
                            </Button>
                            <Button 
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                            >
                                下载模板
                            </Button>
                        </Box>
                    </Paper>
                    
                    <Paper sx={{ p: 3, flex: 1 }}>
                        <Typography variant="subtitle1" gutterBottom>
                            钻孔数据格式说明
                        </Typography>
                        
                        <Typography variant="body2" paragraph>
                            钻孔数据文件应包含以下字段：
                        </Typography>
                        
                        <ul>
                            <li>钻孔ID (BoreID)</li>
                            <li>X坐标 (X)</li>
                            <li>Y坐标 (Y)</li>
                            <li>地面高程 (Z)</li>
                            <li>层位深度 (Depth)</li>
                            <li>土层类型 (SoilType)</li>
                        </ul>
                        
                        <Typography variant="body2" paragraph>
                            系统将使用GemPy插值算法，基于钻孔数据生成三维地质模型。
                        </Typography>
                    </Paper>
                </Box>
            </TabPanel>
        </Box>
    );
};

export default GeologicalModelCreator; 