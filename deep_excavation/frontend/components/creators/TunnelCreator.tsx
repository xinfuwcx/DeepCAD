/**
 * 隧道创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { CreateTunnelFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import {
    Box, Button, Typography, Stack, TextField, Paper, Divider, InputAdornment, LinearProgress, Slider, FormHelperText,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';

// --- 类型定义 ---
interface TunnelParams {
  name: string;
  length: number;
  radius: number; // 0 for straight
  width: number;
  height: number;
}

// --- 示意图组件 ---
const TunnelPreview: React.FC<{ params: TunnelParams }> = ({ params }) => {
    const { length, radius, width, height } = params;
    
    // 路径图 (SVG)
    const svgSize = 160;
    const padding = 15;
    const effectiveSize = svgSize - 2 * padding;
    let pathData: string;
    if (radius === 0) {
        pathData = `M ${padding},${svgSize / 2} h ${effectiveSize}`;
    } else {
        const r = Math.max(1, (radius / (length || 1)) * effectiveSize);
        const angle = (length || 0) / (radius || 1);
        const endX = padding + r * Math.sin(angle);
        const endY = (svgSize/2) + r * (1 - Math.cos(angle));
        pathData = `M ${padding},${svgSize/2} A ${r},${r} 0 0,1 ${endX},${endY}`;
    }

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">二维示意图</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', display: 'flex', gap: 2, justifyContent: 'space-around', alignItems: 'center' }}>
                {/* 路径图 */}
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption">路径 (L={length}m)</Typography>
                    <svg width="100%" height={svgSize} viewBox={`0 0 ${svgSize} ${svgSize}`} style={{ border: '1px dashed grey', marginTop: '4px' }}>
                        <path d={pathData} stroke="#4dabf5" strokeWidth="3" fill="none" />
                        <circle cx={pathData.split(' ')[1]} cy={pathData.split(' ')[2].split(',')[1]} r="3" fill="#f54d4d" />
                    </svg>
                </Box>
                {/* 截面图 */}
                <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption">截面</Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: svgSize, mt: '4px' }}>
                        <Box sx={{ width: width * 3, height: height * 3, bgcolor: '#81c784', border: '2px solid #388e3c', borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="caption" color="white">{`${width}x${height}m`}</Typography>
                        </Box>
                    </Box>
                </Box>
            </Paper>
        </Stack>
    );
};

// --- 主组件 ---
const TunnelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<TunnelParams>({ name: '主隧道', length: 100, radius: 0, width: 10, height: 8 });
    const [isCreating, setIsCreating] = useState(false);

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };
    
    const handleSliderChange = (name: string) => (event: Event, value: number | number[]) => {
        setParams(p => ({ ...p, [name]: value as number }));
    };

    const handleCreate = () => {
        const { length, radius, width, height, name } = params;
        const pathPoints: Point3D[] = [];
        if (radius === 0) {
            pathPoints.push({ x: 0, y: 0, z: 0 }, { x: length, y: 0, z: 0 });
        } else {
            const numSegments = 50;
            const angleStep = (length / radius) / numSegments;
            for (let i = 0; i <= numSegments; i++) {
                const angle = i * angleStep;
                pathPoints.push({ x: Math.sin(angle) * radius, y: 0, z: -(radius - Math.cos(angle) * radius) });
            }
        }
        addFeature({ id: uuidv4(), name, type: 'CreateTunnel', parameters: { pathPoints, width, height } });
        setIsCreating(true);
        setTimeout(() => setIsCreating(false), 1500);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><TimelineIcon />隧道</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                {/* 上：参数输入 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <TextField label="隧道名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                        <Divider>路径</Divider>
                        <TextField label="隧道长度" name="length" type="number" value={params.length} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <Typography variant="caption" color="text.secondary">曲线半径: {params.radius === 0 ? '直线' : `${params.radius}m`}</Typography>
                        <Slider value={params.radius} onChange={handleSliderChange('radius')} min={0} max={1000} step={50} />
                        <FormHelperText sx={{mt: -1}}>拖至最左端 (0) 为直线</FormHelperText>
                        <Divider>截面</Divider>
                        <TextField label="宽度" name="width" type="number" value={params.width} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="高度" name="height" type="number" value={params.height} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                    </Stack>
                </Paper>

                {/* 中：示意图 */}
                <TunnelPreview params={params} />

                {/* 下：操作按钮 */}
                <Box>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                        {isCreating ? '创建中...' : '创建隧道'}
                    </Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
            </Stack>
        </Box>
    );
};

export default TunnelCreator; 