import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Paper,
    Alert,
    Slider,
    Grid,
    Chip,
    Divider
} from '@mui/material';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import ArchitectureIcon from '@mui/icons-material/Architecture';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import DiagramRenderer from '../shared/DiagramRenderer';

// 隧道形状类型
type TunnelShape = 'horseshoe' | 'circular' | 'rectangular';

// 隧道参数接口
interface TunnelParameters {
    shape: TunnelShape;
    width: number;
    height: number;
    length: number;
    center: [number, number, number];
    direction: [number, number, number];
    // 马蹄形特殊参数
    archHeight?: number;
    // 圆形特殊参数
    radius?: number;
}

const TunnelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    
    // 隧道参数状态
    const [tunnelParams, setTunnelParams] = useState<TunnelParameters>({
        shape: 'horseshoe',
        width: 10.0,
        height: 8.0,
        length: 100.0,
        center: [50, 50, -20],
        direction: [1, 0, 0],
        archHeight: 4.8  // 默认为高度的60%
    });
    
    const [previewMode, setPreviewMode] = useState(false);

    // 处理参数变化
    const handleParamChange = useCallback((param: keyof TunnelParameters, value: any) => {
        setTunnelParams(prev => {
            const updated = { ...prev, [param]: value };
            
            // 特殊处理：马蹄形隧道的拱高自动调整
            if (param === 'height' && prev.shape === 'horseshoe') {
                updated.archHeight = value * 0.6;
            }
            
            // 特殊处理：圆形隧道的半径自动调整
            if ((param === 'width' || param === 'height') && prev.shape === 'circular') {
                updated.radius = Math.min(value, prev.height || value) / 2;
            }
            
            return updated;
        });
    }, []);

    // 处理形状变化
    const handleShapeChange = useCallback((shape: TunnelShape) => {
        setTunnelParams(prev => {
            const updated = { ...prev, shape };
            
            if (shape === 'horseshoe') {
                updated.archHeight = prev.height * 0.6;
            } else if (shape === 'circular') {
                updated.radius = Math.min(prev.width, prev.height) / 2;
            }
            
            return updated;
        });
    }, []);

    // 创建隧道特征
    const createTunnel = useCallback(() => {
        const tunnelFeature: AnyFeature = {
            id: uuidv4(),
            name: `${getShapeDisplayName(tunnelParams.shape)}隧道 (${tunnelParams.width}×${tunnelParams.height}m)`,
            type: 'CreateTunnel' as any, // 扩展类型
            parameters: {
                ...tunnelParams,
                // 确保所有参数都有合理的默认值
                archHeight: tunnelParams.shape === 'horseshoe' ? 
                    (tunnelParams.archHeight || tunnelParams.height * 0.6) : undefined,
                radius: tunnelParams.shape === 'circular' ? 
                    (tunnelParams.radius || Math.min(tunnelParams.width, tunnelParams.height) / 2) : undefined
            }
        };
        
        addFeature(tunnelFeature);
        
        // 重置参数
        setTunnelParams({
            shape: 'horseshoe',
            width: 10.0,
            height: 8.0,
            length: 100.0,
            center: [50, 50, -20],
            direction: [1, 0, 0],
            archHeight: 4.8
        });
    }, [tunnelParams, addFeature]);

    // 获取形状显示名称
    const getShapeDisplayName = (shape: TunnelShape): string => {
        switch (shape) {
            case 'horseshoe': return '马蹄形';
            case 'circular': return '圆形';
            case 'rectangular': return '矩形';
            default: return '未知';
        }
    };

    // 获取形状图标
    const getShapeIcon = (shape: TunnelShape) => {
        switch (shape) {
            case 'horseshoe': return <ArchitectureIcon />;
            case 'circular': return <RadioButtonUncheckedIcon />;
            case 'rectangular': return <AccountTreeIcon />;
            default: return <AccountTreeIcon />;
        }
    };

    // 计算截面积
    const calculateCrossSection = (): number => {
        switch (tunnelParams.shape) {
            case 'horseshoe':
                const archHeight = tunnelParams.archHeight || tunnelParams.height * 0.6;
                const wallHeight = tunnelParams.height - archHeight;
                const rectArea = tunnelParams.width * wallHeight;
                const archArea = Math.PI * (tunnelParams.width / 2) ** 2 / 2;
                return rectArea + archArea;
            case 'circular':
                const radius = tunnelParams.radius || tunnelParams.width / 2;
                return Math.PI * radius ** 2;
            case 'rectangular':
                return tunnelParams.width * tunnelParams.height;
            default:
                return 0;
        }
    };

    return (
        <Box className="fade-in-up">
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountTreeIcon />
                隧道开挖 (复杂几何求交)
            </Typography>
            
            <Stack spacing={3}>
                {/* 隧道形状选择 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        隧道截面形状
                    </Typography>
                    
                    <Grid container spacing={2}>
                        {(['horseshoe', 'circular', 'rectangular'] as TunnelShape[]).map(shape => (
                            <Grid item xs={4} key={shape}>
                                <Paper
                                    variant={tunnelParams.shape === shape ? "elevation" : "outlined"}
                                    sx={{
                                        p: 2,
                                        textAlign: 'center',
                                        cursor: 'pointer',
                                        bgcolor: tunnelParams.shape === shape ? 'primary.light' : 'transparent',
                                        color: tunnelParams.shape === shape ? 'primary.contrastText' : 'text.primary',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => handleShapeChange(shape)}
                                >
                                    {getShapeIcon(shape)}
                                    <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                                        {getShapeDisplayName(shape)}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>

                {/* 基本尺寸参数 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        基本尺寸参数
                    </Typography>
                    
                    <Stack spacing={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="宽度"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={tunnelParams.width}
                                    onChange={(e) => handleParamChange('width', parseFloat(e.target.value))}
                                    InputProps={{ endAdornment: 'm' }}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="高度"
                                    type="number"
                                    size="small"
                                    fullWidth
                                    value={tunnelParams.height}
                                    onChange={(e) => handleParamChange('height', parseFloat(e.target.value))}
                                    InputProps={{ endAdornment: 'm' }}
                                />
                            </Grid>
                        </Grid>
                        
                        <TextField
                            label="长度"
                            type="number"
                            size="small"
                            fullWidth
                            value={tunnelParams.length}
                            onChange={(e) => handleParamChange('length', parseFloat(e.target.value))}
                            InputProps={{ endAdornment: 'm' }}
                        />
                        
                        {/* 马蹄形特殊参数 */}
                        {tunnelParams.shape === 'horseshoe' && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">
                                    拱顶高度: {tunnelParams.archHeight?.toFixed(1)}m
                                </Typography>
                                <Slider
                                    value={tunnelParams.archHeight || tunnelParams.height * 0.6}
                                    min={tunnelParams.height * 0.3}
                                    max={tunnelParams.height * 0.8}
                                    step={0.1}
                                    onChange={(_, value) => handleParamChange('archHeight', value as number)}
                                    valueLabelDisplay="auto"
                                    size="small"
                                />
                            </Box>
                        )}
                        
                        {/* 圆形特殊参数 */}
                        {tunnelParams.shape === 'circular' && (
                            <TextField
                                label="半径"
                                type="number"
                                size="small"
                                fullWidth
                                value={tunnelParams.radius || tunnelParams.width / 2}
                                onChange={(e) => handleParamChange('radius', parseFloat(e.target.value))}
                                InputProps={{ endAdornment: 'm' }}
                            />
                        )}
                    </Stack>
                </Paper>

                {/* 位置和方向 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        位置和方向
                    </Typography>
                    
                    <Stack spacing={2}>
                        <Typography variant="caption">
                            隧道中心位置 (X, Y, Z)
                        </Typography>
                        <Grid container spacing={1}>
                            {tunnelParams.center.map((coord, index) => (
                                <Grid item xs={4} key={index}>
                                    <TextField
                                        label={['X', 'Y', 'Z'][index]}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={coord}
                                        onChange={(e) => {
                                            const newCenter = [...tunnelParams.center] as [number, number, number];
                                            newCenter[index] = parseFloat(e.target.value);
                                            handleParamChange('center', newCenter);
                                        }}
                                        InputProps={{ endAdornment: 'm' }}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                        
                        <Typography variant="caption">
                            隧道方向向量 (X, Y, Z)
                        </Typography>
                        <Grid container spacing={1}>
                            {tunnelParams.direction.map((dir, index) => (
                                <Grid item xs={4} key={index}>
                                    <TextField
                                        label={['X', 'Y', 'Z'][index]}
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={dir}
                                        onChange={(e) => {
                                            const newDirection = [...tunnelParams.direction] as [number, number, number];
                                            newDirection[index] = parseFloat(e.target.value);
                                            handleParamChange('direction', newDirection);
                                        }}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Stack>
                </Paper>

                {/* 隧道信息摘要 */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: 'action.hover' }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        隧道信息摘要
                    </Typography>
                    
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        <Chip 
                            label={`形状: ${getShapeDisplayName(tunnelParams.shape)}`}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                        <Chip 
                            label={`截面积: ${calculateCrossSection().toFixed(1)}m²`}
                            size="small"
                            color="secondary"
                            variant="outlined"
                        />
                        <Chip 
                            label={`总长: ${tunnelParams.length}m`}
                            size="small"
                            color="info"
                            variant="outlined"
                        />
                        <Chip 
                            label={`体积: ${(calculateCrossSection() * tunnelParams.length).toFixed(0)}m³`}
                            size="small"
                            color="success"
                            variant="outlined"
                        />
                    </Stack>
                </Paper>

                {/* 技术说明 */}
                <Alert severity="info">
                    <Typography variant="body2">
                        <strong>OpenCASCADE 几何求交：</strong><br/>
                        • 土体与隧道的精确布尔运算<br/>
                        • 支持马蹄形、圆形、矩形等复杂截面<br/>
                        • 自动生成隧道空间和边界条件<br/>
                        • 与地质模型无缝集成
                    </Typography>
                </Alert>

                {/* 创建按钮 */}
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<AccountTreeIcon />}
                    onClick={createTunnel}
                    fullWidth
                >
                    创建{getShapeDisplayName(tunnelParams.shape)}隧道
                </Button>

                {/* 二维断面示意图预览 */}
                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                        📐 隧道断面示意图
                    </Typography>
                    <DiagramRenderer 
                        type="tunnel" 
                        width={300} 
                        height={300} 
                        data={{
                            shape: tunnelParams.shape,
                            width: tunnelParams.width,
                            height: tunnelParams.height,
                            archHeight: tunnelParams.archHeight,
                            radius: tunnelParams.radius
                        }}
                    />
                    <Stack direction="row" spacing={1} sx={{ mt: 1, justifyContent: 'center' }}>
                        <Chip size="small" label={`形状: ${getShapeDisplayName(tunnelParams.shape)}`} />
                        {tunnelParams.shape === 'circular' ? (
                            <Chip size="small" label={`半径: ${tunnelParams.radius}m`} />
                        ) : (
                            <>
                                <Chip size="small" label={`宽度: ${tunnelParams.width}m`} />
                                <Chip size="small" label={`高度: ${tunnelParams.height}m`} />
                            </>
                        )}
                        <Chip size="small" label={`面积: ${calculateCrossSection().toFixed(1)}m²`} />
                    </Stack>
                </Box>
            </Stack>
        </Box>
    );
};

export default TunnelCreator; 