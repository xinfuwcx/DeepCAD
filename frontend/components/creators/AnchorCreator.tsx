/**
 * 锚杆/土钉创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
  Box, Typography, TextField, Button, FormControl, InputLabel, Select, MenuItem, Divider, Paper, Slider, Stack, InputAdornment, SelectChangeEvent
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { CreateAnchorSystemFeature } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface AnchorParams {
  name: string;
  anchorType: 'prestressed' | 'passive' | 'soil_nail';
  length: number;
  angle: number;
  spacing: number;
  diameter: number;
  prestressForce: number;
  freeLength: number;
  bondLength: number;
}

// --- 常量与默认值 ---
const PRESTRESSED_DEFAULTS = { length: 15, prestressForce: 300, freeLength: 8, bondLength: 7 };
const PASSIVE_DEFAULTS = { length: 12, prestressForce: 0, freeLength: 0, bondLength: 12 };
const SOIL_NAIL_DEFAULTS = { length: 8, angle: 10, spacing: 1.5, diameter: 0.05, prestressForce: 0, freeLength: 0, bondLength: 8 };

// --- 示意图组件 ---
const AnchorPreview: React.FC<{ params: AnchorParams }> = ({ params }) => {
    const viewHeight = 180;
    const wallWidth = 30;
    const soilWidth = 'calc(100% - 30px)';
    const groundLevel = 60;
    
    const angleRad = params.angle * (Math.PI / 180);
    const totalLengthPx = params.length * 9;
    const freeLengthPx = params.freeLength * 9;

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">二维示意图</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', height: viewHeight, position: 'relative', overflow: 'hidden' }}>
                {/* 支护墙 */}
                <Box sx={{ width: wallWidth, height: '100%', bgcolor: 'grey.700', position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'white', writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', width: '100%', pt: 1 }}>支护墙</Typography>
                </Box>
                {/* 土体 */}
                <Box sx={{ width: soilWidth, height: '100%', bgcolor: '#d2b48c33', position: 'absolute', left: wallWidth, top: 0 }} />
                <Box sx={{ position: 'absolute', left: wallWidth, top: groundLevel, width: soilWidth, height: 2, bgcolor: '#8d6e63' }} />
                <Typography variant="caption" sx={{ position: 'absolute', left: wallWidth + 5, top: groundLevel - 18 }}>地面</Typography>
                {/* 锚杆 */}
                <Box sx={{
                    position: 'absolute', left: wallWidth, top: groundLevel + 20, height: Math.max(4, params.diameter * 150),
                    bgcolor: '#cd7f32', transformOrigin: 'left center', transform: `rotate(${-params.angle}deg)`,
                    width: totalLengthPx, zIndex: 2, display: 'flex',
                }}>
                    {params.anchorType === 'prestressed' && (<Box sx={{ width: freeLengthPx, height: '100%', bgcolor: '#4682b4' }} />)}
                </Box>
                {/* 标签 */}
                <Box sx={{ position: 'absolute', left: wallWidth + totalLengthPx * Math.cos(angleRad) + 5, top: groundLevel + 20 - totalLengthPx * Math.sin(angleRad) - 10, bgcolor: 'rgba(0,0,0,0.5)', p: 0.5, borderRadius: 1 }}>
                    <Typography variant="caption" sx={{ color: 'white' }}>{`L=${params.length}m, α=${params.angle}°`}</Typography>
                </Box>
            </Paper>
        </Stack>
    );
};

// --- 主组件 ---
const AnchorCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<AnchorParams>({
        name: '第一道锚杆', anchorType: 'prestressed', diameter: 0.15, spacing: 2, angle: 15, ...PRESTRESSED_DEFAULTS,
    });
    const [isCreating, setIsCreating] = useState(false);

    useEffect(() => {
        if (params.anchorType === 'prestressed') {
            const total = params.freeLength + params.bondLength;
            if (params.length !== total) setParams(p => ({ ...p, length: total }));
        }
    }, [params.freeLength, params.bondLength, params.anchorType, params.length]);

    const handleTypeChange = (event: SelectChangeEvent<string>) => {
        const newType = event.target.value as AnchorParams['anchorType'];
        const defaults = newType === 'prestressed' ? PRESTRESSED_DEFAULTS : newType === 'passive' ? PASSIVE_DEFAULTS : SOIL_NAIL_DEFAULTS;
        setParams(p => ({ ...p, name: p.name, anchorType: newType, ...defaults, diameter: p.diameter, spacing: p.spacing, angle: p.angle }));
    };

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };

    const handleSliderChange = (name: string) => (event: Event, value: number | number[]) => {
        setParams(p => ({ ...p, [name]: value as number }));
    };

    const handleCreate = () => {
        const newFeature: CreateAnchorSystemFeature = {
            id: uuidv4(), name: params.name, type: 'CreateAnchorSystem',
            parameters: { ...params, parentId: '', rowCount: 1, verticalSpacing: 0, startHeight: 2, walerWidth: 0.3, walerHeight: 0.3, anchorAnalysisModel: 'beam', walerAnalysisModel: 'beam' }
        };
        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => setIsCreating(false), 1500);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><LinkIcon />锚杆/土钉</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                {/* 上：参数输入 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <TextField label="锚杆/土钉组名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                        <FormControl fullWidth size="small">
                            <InputLabel>类型</InputLabel>
                            <Select label="类型" value={params.anchorType} onChange={handleTypeChange}>
                                <MenuItem value="prestressed">预应力锚索</MenuItem>
                                <MenuItem value="passive">被动锚杆</MenuItem>
                                <MenuItem value="soil_nail">土钉</MenuItem>
                            </Select>
                        </FormControl>
                        <Divider>几何与物理参数</Divider>
                        {params.anchorType === 'prestressed' ? (
                            <>
                                <TextField label="自由段长度" name="freeLength" type="number" value={params.freeLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                                <TextField label="锚固段长度" name="bondLength" type="number" value={params.bondLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                                <TextField label="总长(自动)" name="length" type="number" value={params.length} size="small" InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            </>
                        ) : (
                            <TextField label="总长度" name="length" type="number" value={params.length} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        )}
                        <Typography variant="caption" color="text.secondary">倾角: {params.angle}°</Typography>
                        <Slider value={params.angle} onChange={handleSliderChange('angle')} min={0} max={45} step={1} marks />
                        <TextField label="水平间距" name="spacing" type="number" value={params.spacing} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="直径" name="diameter" type="number" value={params.diameter} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        {params.anchorType === 'prestressed' && (
                            <TextField label="预应力" name="prestressForce" type="number" value={params.prestressForce} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">kN</InputAdornment> }} />
                        )}
                    </Stack>
                </Paper>

                {/* 中：示意图 */}
                <AnchorPreview params={params} />

                {/* 下：操作按钮 */}
                <Box>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                        {isCreating ? '创建中...' : '创建锚杆体系'}
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
};

export default AnchorCreator; 