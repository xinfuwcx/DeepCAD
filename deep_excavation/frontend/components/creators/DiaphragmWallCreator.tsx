import React, { useState, useRef, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Paper,
    Chip,
    Alert,
    Grid,
    Divider,
    InputAdornment,
    FormHelperText,
    Tooltip,
    IconButton,
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import InfoIcon from '@mui/icons-material/Info';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import DiagramRenderer from '../shared/DiagramRenderer';
import { DiaphragmWallParams } from './CreatorInterface';

// 预设的墙体材料
const WALL_MATERIALS = [
    { value: 'c30', label: 'C30混凝土', color: '#A9A9A9', elasticModulus: 30000000, poissonRatio: 0.2 },
    { value: 'c35', label: 'C35混凝土', color: '#A0A0A0', elasticModulus: 32500000, poissonRatio: 0.2 },
    { value: 'c40', label: 'C40混凝土', color: '#979797', elasticModulus: 35000000, poissonRatio: 0.2 },
    { value: 'steel', label: '钢板墙', color: '#708090', elasticModulus: 210000000, poissonRatio: 0.3 },
    { value: 'custom', label: '自定义', color: '#4682B4', elasticModulus: 30000000, poissonRatio: 0.2 },
];

// 2D示意图绘制函数
const drawDiaphragmWallSection = (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    params: DiaphragmWallParams
) => {
    const { width, height } = canvas;
    
    // 清除画布
    ctx.clearRect(0, 0, width, height);
    
    // 绘制背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, width, height);
    
    // 设置比例尺
    const scale = Math.min(width / 100, height / 100);
    const centerX = width / 2;
    const groundLevel = 50;
    
    // 绘制地面
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX - 40 * scale, groundLevel);
    ctx.lineTo(centerX + 40 * scale, groundLevel);
    ctx.stroke();
    
    // 绘制地下连续墙
    const wallThickness = (params.thickness || 1) * scale;
    const wallDepth = (params.depth || 20) * scale;
    
    ctx.fillStyle = params.color || '#A9A9A9';
    ctx.beginPath();
    ctx.rect(centerX - wallThickness / 2, groundLevel, wallThickness, wallDepth);
    ctx.fill();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // 绘制标注
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    
    // 墙厚标注
    ctx.beginPath();
    ctx.moveTo(centerX - wallThickness / 2, groundLevel - 10);
    ctx.lineTo(centerX + wallThickness / 2, groundLevel - 10);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX - wallThickness / 2, groundLevel - 8);
    ctx.lineTo(centerX - wallThickness / 2, groundLevel - 12);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + wallThickness / 2, groundLevel - 8);
    ctx.lineTo(centerX + wallThickness / 2, groundLevel - 12);
    ctx.stroke();
    
    const thicknessText = `${params.thickness || 1}m`;
    const thicknessWidth = ctx.measureText(thicknessText).width;
    ctx.fillText(thicknessText, centerX - thicknessWidth / 2, groundLevel - 15);
    
    // 墙深标注
    ctx.beginPath();
    ctx.moveTo(centerX + wallThickness / 2 + 10, groundLevel);
    ctx.lineTo(centerX + wallThickness / 2 + 10, groundLevel + wallDepth);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + wallThickness / 2 + 8, groundLevel);
    ctx.lineTo(centerX + wallThickness / 2 + 12, groundLevel);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(centerX + wallThickness / 2 + 8, groundLevel + wallDepth);
    ctx.lineTo(centerX + wallThickness / 2 + 12, groundLevel + wallDepth);
    ctx.stroke();
    
    const depthText = `${params.depth || 20}m`;
    ctx.save();
    ctx.translate(centerX + wallThickness / 2 + 20, groundLevel + wallDepth / 2);
    ctx.rotate(Math.PI / 2);
    const depthWidth = ctx.measureText(depthText).width;
    ctx.fillText(depthText, -depthWidth / 2, 0);
    ctx.restore();
};

const DiaphragmWallCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<DiaphragmWallParams>({
        material: 'c30',
        thickness: 1.0,
        depth: 20,
        length: 50,
        segments: 5,
        position: { x: 0, y: 0, z: 0 },
        color: WALL_MATERIALS[0].color,
    });

    const [errors, setErrors] = useState<{[key: string]: string}>({});
    const [isCreating, setIsCreating] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 绘制2D示意图
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        drawDiaphragmWallSection(ctx, canvas, params);
    }, [params]);

    const handleChange = (field: string, value: any) => {
        if (field === 'material' && value !== 'custom') {
            const selectedMaterial = WALL_MATERIALS.find(material => material.value === value);
            if (selectedMaterial) {
                setParams({
                    ...params,
                    material: value,
                    color: selectedMaterial.color,
                });
            }
        } else if (field.includes('.')) {
            // 处理嵌套属性，如 position.x
            const [parent, child] = field.split('.');
            setParams({
                ...params,
                [parent]: {
                    ...params[parent as keyof DiaphragmWallParams],
                    [child]: value
                }
            });
        } else {
            setParams({
                ...params,
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

    const validate = (): boolean => {
        const newErrors: {[key: string]: string} = {};
        
        // 验证厚度
        if (!params.thickness || params.thickness <= 0) {
            newErrors['thickness'] = '墙厚必须大于0';
        }
        
        // 验证深度
        if (!params.depth || params.depth <= 0) {
            newErrors['depth'] = '墙深必须大于0';
        }
        
        // 验证长度
        if (!params.length || params.length <= 0) {
            newErrors['length'] = '墙长必须大于0';
        }
        
        // 验证分段数
        if (!params.segments || params.segments < 1) {
            newErrors['segments'] = '分段数必须大于0';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleCreateDiaphragmWall = async () => {
        if (!validate()) return;
        
        setIsCreating(true);
        
        try {
            // 创建地下连续墙特征
            const feature: AnyFeature = {
                id: uuidv4(),
                name: `地下连续墙 (${params.thickness}m×${params.depth}m)`,
                type: 'CreateDiaphragmWall',
                parameters: {
                    thickness: params.thickness,
                    depth: params.depth,
                    length: params.length,
                    segments: params.segments,
                    material: params.material,
                    position: params.position,
                    color: params.color
                },
            };
            
            // 添加到模型中
            addFeature(feature);
            
            // 重置为默认值，但保留位置信息以便连续创建
            const position = params.position;
            
            setParams({
                ...params,
                position: position,
            });
            
        } catch (error) {
            console.error('创建地下连续墙失败:', error);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <Box className="fade-in-up">
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerticalSplitIcon />
                地下连续墙参数设置
            </Typography>
            
            <Stack spacing={3}>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Grid container spacing={2}>
                            {/* 墙体材料选择 */}
                            <Grid item xs={12}>
                                <FormControl fullWidth>
                                    <InputLabel>墙体材料</InputLabel>
                                    <Select
                                        value={params.material}
                                        label="墙体材料"
                                        onChange={(e) => handleChange('material', e.target.value)}
                                    >
                                        {WALL_MATERIALS.map((material) => (
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
                            
                            {/* 墙厚 */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="墙厚 (m)"
                                    type="number"
                                    value={params.thickness}
                                    onChange={(e) => handleChange('thickness', parseFloat(e.target.value))}
                                    error={!!errors['thickness']}
                                    helperText={errors['thickness']}
                                    InputProps={{
                                        inputProps: { min: 0.5, step: 0.1 }
                                    }}
                                />
                            </Grid>
                            
                            {/* 墙深 */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="墙深 (m)"
                                    type="number"
                                    value={params.depth}
                                    onChange={(e) => handleChange('depth', parseFloat(e.target.value))}
                                    error={!!errors['depth']}
                                    helperText={errors['depth']}
                                    InputProps={{
                                        inputProps: { min: 1, step: 0.5 }
                                    }}
                                />
                            </Grid>
                            
                            {/* 墙长 */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="墙长 (m)"
                                    type="number"
                                    value={params.length}
                                    onChange={(e) => handleChange('length', parseFloat(e.target.value))}
                                    error={!!errors['length']}
                                    helperText={errors['length']}
                                    InputProps={{
                                        inputProps: { min: 1, step: 0.5 }
                                    }}
                                />
                            </Grid>
                            
                            {/* 分段数 */}
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="分段数"
                                    type="number"
                                    value={params.segments}
                                    onChange={(e) => handleChange('segments', parseInt(e.target.value))}
                                    error={!!errors['segments']}
                                    helperText={errors['segments']}
                                    InputProps={{
                                        inputProps: { min: 1, step: 1 }
                                    }}
                                />
                            </Grid>
                            
                            <Grid item xs={12}>
                                <Divider sx={{ my: 1 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        位置参数
                                    </Typography>
                                </Divider>
                            </Grid>
                            
                            {/* X坐标 */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="X坐标 (m)"
                                    type="number"
                                    value={params.position?.x || 0}
                                    onChange={(e) => handleChange('position.x', parseFloat(e.target.value))}
                                    InputProps={{
                                        inputProps: { step: 0.5 }
                                    }}
                                />
                            </Grid>
                            
                            {/* Y坐标 */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Y坐标 (m)"
                                    type="number"
                                    value={params.position?.y || 0}
                                    onChange={(e) => handleChange('position.y', parseFloat(e.target.value))}
                                    InputProps={{
                                        inputProps: { step: 0.5 }
                                    }}
                                />
                            </Grid>
                            
                            {/* Z坐标 */}
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    fullWidth
                                    label="Z坐标 (m)"
                                    type="number"
                                    value={params.position?.z || 0}
                                    onChange={(e) => handleChange('position.z', parseFloat(e.target.value))}
                                    InputProps={{
                                        inputProps: { step: 0.5 }
                                    }}
                                />
                            </Grid>
                        </Grid>
                        
                        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                            <Button 
                                variant="contained" 
                                color="primary" 
                                onClick={handleCreateDiaphragmWall}
                                disabled={isCreating}
                            >
                                {isCreating ? '创建中...' : '创建地下连续墙'}
                            </Button>
                        </Box>
                    </Grid>
                    
                    <Grid item xs={12} md={6}>
                        <Paper 
                            elevation={2} 
                            sx={{ 
                                p: 2, 
                                height: '100%', 
                                display: 'flex', 
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <Typography variant="subtitle2" gutterBottom>
                                地下连续墙剖面示意图
                            </Typography>
                            
                            <Box sx={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                <canvas 
                                    ref={canvasRef} 
                                    width={300} 
                                    height={300}
                                    style={{ maxWidth: '100%', maxHeight: '100%' }}
                                />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* 技术说明 */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="caption" color="text.secondary">
                        <strong>技术特点：</strong><br/>
                        • 支持壳单元和实体单元分析<br/>
                        • 自动生成土-结构接触<br/>
                        • 考虑施工工艺影响<br/>
                        • 渗流-应力耦合分析
                    </Typography>
                </Paper>
            </Stack>
        </Box>
    );
};

export default DiaphragmWallCreator; 