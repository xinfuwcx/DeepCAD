/**
 * 桩承台创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { CreatePileRaftFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import {
    Box, Button, Typography, Stack, TextField, Paper, Divider, InputAdornment, LinearProgress
} from '@mui/material';
import ViewModuleIcon from '@mui/icons-material/ViewModule';

// --- 类型定义 ---
interface PileRaftParams {
  name: string;
  beamLength: number;
  beamWidth: number;
  beamHeight: number;
  pileDiameter: number;
  pileLength: number;
  pileSpacing: number;
}

// --- 示意图组件 ---
const PileRaftPreview: React.FC<{ params: PileRaftParams }> = ({ params }) => {
    const { beamLength, beamWidth, beamHeight, pileDiameter, pileLength, pileSpacing } = params;
    const numPiles = pileSpacing > 0 ? Math.floor(beamLength / pileSpacing) + 1 : 1;

    // 立面图计算
    const sideViewHeight = 150;
    const sideViewWidth = '100%';
    const sideScale = 200 / Math.max(1, beamLength, pileLength + beamHeight);

    // 平面图计算
    const planViewHeight = 80;
    const planScale = 200 / Math.max(1, beamLength);

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">二维示意图</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                {/* 立面图 */}
                <Box>
                    <Typography variant="caption" display="block" align="center">立面 (L={beamLength}m, H={pileLength}m)</Typography>
                    <Box sx={{ width: sideViewWidth, height: sideViewHeight, border: '1px dashed grey', position: 'relative', mt: 0.5, display:'flex', justifyContent:'center', alignItems:'flex-start' }}>
                        <Box sx={{ position: 'relative', top: 10 }}>
                            <Box sx={{ width: beamLength * sideScale, height: beamHeight * sideScale, bgcolor: 'grey.500' }} />
                            {Array.from({ length: numPiles }).map((_, i) => (
                                <Box key={i} sx={{
                                    position: 'absolute', top: beamHeight * sideScale,
                                    left: (numPiles > 1 ? i * pileSpacing * sideScale : (beamLength * sideScale)/2) - (pileDiameter * sideScale / 2),
                                    width: pileDiameter * sideScale, height: pileLength * sideScale, bgcolor: 'grey.400'
                                }} />
                            ))}
                        </Box>
                    </Box>
                </Box>
                {/* 平面图 */}
                <Box>
                    <Typography variant="caption" display="block" align="center">平面 (桩间距: {pileSpacing}m)</Typography>
                    <Box sx={{ width: '100%', height: planViewHeight, border: '1px dashed grey', position: 'relative', mt: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         <Box sx={{ width: beamLength * planScale, height: Math.max(10, beamWidth * planScale * 5), bgcolor: 'grey.500', position: 'relative' }}>
                            {Array.from({ length: numPiles }).map((_, i) => (
                                <Box key={i} sx={{
                                    position: 'absolute', top: '50%',
                                    left: (numPiles > 1 ? i * pileSpacing * planScale : (beamLength * planScale) / 2) - (pileDiameter * planScale / 2),
                                    width: pileDiameter * planScale, height: pileDiameter * planScale,
                                    borderRadius: '50%', bgcolor: 'grey.700', transform: 'translateY(-50%)'
                                }} />
                            ))}
                         </Box>
                    </Box>
                </Box>
            </Paper>
        </Stack>
    );
};


// --- 主组件 ---
const PileRaftCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<PileRaftParams>({
        name: '第一排桩', beamLength: 40, beamWidth: 1.2, beamHeight: 1.5,
        pileDiameter: 0.8, pileLength: 18, pileSpacing: 3,
    });
    const [isCreating, setIsCreating] = useState(false);

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };

    const handleCreate = () => {
        const { beamLength, beamWidth, beamHeight, pileDiameter, pileLength, pileSpacing, name } = params;
        const halfLength = beamLength / 2;
        const path: [Point3D, Point3D] = [{ x: -halfLength, y: 0, z: 0 }, { x: halfLength, y: 0, z: 0 }];

        const newFeature: CreatePileRaftFeature = {
            id: uuidv4(), name, type: 'CreatePileRaft',
            parameters: {
                path, capBeamWidth: beamWidth, capBeamHeight: beamHeight,
                pileDiameter, pileLength, pileSpacing,
                pileAnalysisModel: 'beam', capBeamAnalysisModel: 'beam',
            },
        };
        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => setIsCreating(false), 1500);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ViewModuleIcon />桩承台</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                {/* 上：参数输入 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <TextField label="桩排名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                        <Divider>承台梁</Divider>
                        <TextField label="梁长" name="beamLength" type="number" value={params.beamLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="梁宽" name="beamWidth" type="number" value={params.beamWidth} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="梁高" name="beamHeight" type="number" value={params.beamHeight} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <Divider>桩</Divider>
                        <TextField label="桩径" name="pileDiameter" type="number" value={params.pileDiameter} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="桩长" name="pileLength" type="number" value={params.pileLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        <TextField label="桩间距" name="pileSpacing" type="number" value={params.pileSpacing} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                    </Stack>
                </Paper>

                {/* 中：示意图 */}
                <PileRaftPreview params={params} />

                {/* 下：操作按钮 */}
                <Box>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                        {isCreating ? '创建中...' : '创建桩排'}
                    </Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
            </Stack>
        </Box>
    );
};

export default PileRaftCreator; 