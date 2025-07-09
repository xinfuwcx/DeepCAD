/**
 * 地下连续墙创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
    Box, Button, Typography, Stack, TextField, Paper, Divider, InputAdornment, LinearProgress
} from '@mui/material';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { CreateDiaphragmWallFeature } from '../../services/parametricAnalysisService';

// --- 类型定义 ---
interface WallParams {
  name: string;
  thickness: number;
  depth: number;
  planLengthX: number;
  planLengthY: number;
}

// --- 示意图组件 ---
const WallPreview: React.FC<{ params: WallParams }> = ({ params }) => {
    const { thickness, depth, planLengthX, planLengthY } = params;

    // 平面图计算
    const planViewSize = 150;
    const planScale = planViewSize / Math.max(1, planLengthX * 1.2, planLengthY * 1.2);
    const pitWidth = planLengthX * planScale;
    const pitHeight = planLengthY * planScale;
    const wallThicknessPlan = thickness * planScale;

    // 剖面图计算
    const sectionViewHeight = 120;
    const groundLevel = 30;
    const wallDepthPx = depth * 4;
    const wallThicknessSection = Math.max(4, thickness * 15);

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">二维示意图</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', display: 'flex', gap: 2, justifyContent: 'space-around' }}>
                {/* 平面图 */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" display="block" align="center">平面</Typography>
                    <Box sx={{ height: planViewSize, border: '1px dashed grey', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', mt: 0.5 }}>
                        <Box sx={{ width: pitWidth, height: pitHeight, bgcolor: '#e3f2fd', border: '1px dashed #90caf9' }} />
                        <Box sx={{ position: 'absolute', width: pitWidth + 2 * wallThicknessPlan, height: pitHeight + 2 * wallThicknessPlan, border: `${wallThicknessPlan}px solid #8d6e63` }} />
                        <Typography variant="caption" sx={{ position: 'absolute', bottom: -18, color: 'text.secondary' }}>{planLengthX}m</Typography>
                        <Typography variant="caption" sx={{ position: 'absolute', right: -25, top: '50%', transform: 'translateY(-50%) rotate(90deg)', color: 'text.secondary' }}>{planLengthY}m</Typography>
                    </Box>
                </Box>
                {/* 剖面图 */}
                <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" display="block" align="center">剖面 (T={thickness}m)</Typography>
                    <Box sx={{ height: sectionViewHeight, border: '1px solid grey', bgcolor: 'rgba(100,80,70,0.2)', position: 'relative', mt: 0.5, overflow: 'hidden' }}>
                        <Box sx={{ position: 'absolute', left: 0, top: groundLevel, width: '100%', height: 2, bgcolor: '#654321' }} />
                        <Typography variant="caption" sx={{ position: 'absolute', left: 2, top: groundLevel - 18 }}>地面</Typography>
                        <Box sx={{ position: 'absolute', top: groundLevel, left: '50%', transform: 'translateX(-50%)', width: wallThicknessSection, height: wallDepthPx, bgcolor: 'grey.600' }} />
                        <Typography variant="caption" sx={{ position: 'absolute', top: groundLevel + 5, right: 5, writingMode: 'vertical-rl' }}>H={depth}m</Typography>
                    </Box>
                </Box>
            </Paper>
        </Stack>
    );
};

// --- 主组件 ---
const DiaphragmWallCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<WallParams>({ name: '地下连续墙', thickness: 0.8, depth: 20, planLengthX: 50, planLengthY: 30 });
    const [isCreating, setIsCreating] = useState(false);

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };

    const handleCreate = () => {
        const { planLengthX, planLengthY, thickness, depth, name } = params;
        const halfX = planLengthX / 2, halfY = planLengthY / 2;
        const path: [number, number][] = [[-halfX, -halfY], [halfX, -halfY], [halfX, halfY], [-halfX, halfY], [-halfX, -halfY]];

        const newFeature: CreateDiaphragmWallFeature = {
            id: uuidv4(), name, type: 'CreateDiaphragmWall',
            parameters: { depth, thickness, path },
        };

        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => setIsCreating(false), 1500);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><VerticalSplitIcon />地连墙</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                {/* 上：参数输入 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <TextField label="墙体名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                        <TextField label="墙体厚度" name="thickness" type="number" value={params.thickness} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="墙体深度" name="depth" type="number" value={params.depth} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <Divider>基坑尺寸</Divider>
                        <TextField label="X方向长度" name="planLengthX" type="number" value={params.planLengthX} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="Y方向长度" name="planLengthY" type="number" value={params.planLengthY} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                    </Stack>
                </Paper>

                {/* 中：示意图 */}
                <WallPreview params={params} />

                {/* 下：操作按钮 */}
                <Box>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                        {isCreating ? '创建中...' : '创建地连墙'}
                    </Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
            </Stack>
        </Box>
    );
};

export default DiaphragmWallCreator; 