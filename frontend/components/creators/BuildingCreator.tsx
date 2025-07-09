/**
 * 建筑物创建器 - 上中下布局重构版
 * @description 严格遵循上部参数、中部示意图、下部按钮的垂直布局。
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
  Box, Button, Typography, Stack, Paper, Divider, TextField, LinearProgress,
} from '@mui/material';
import ApartmentIcon from '@mui/icons-material/Apartment';
import { CreateBuildingFeature } from '../../services/parametricAnalysisService';

// Define an interface for building parameters for better type safety
interface BuildingParams {
  name: string;
  width: number;
  height: number;
  depth: number;
  positionX: number;
  positionZ: number;
}

// --- 示意图组件 ---
const BuildingPreview: React.FC<{ params: BuildingParams }> = ({ params }) => {
    const siteSize = 220;
    const scale = siteSize / Math.max(200, Math.abs(params.positionX) * 2, Math.abs(params.positionZ) * 2);
    const buildingWidth = params.width * scale;
    const buildingDepth = params.depth * scale;
    const centerX = siteSize / 2, centerZ = siteSize / 2;
    const offsetX = params.positionX * scale, offsetZ = params.positionZ * scale;

    return (
        <Stack spacing={1} sx={{ width: '100%', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">俯视预览</Typography>
            <Paper variant="outlined" sx={{ p: 1, bgcolor: 'rgba(0,0,0,0.1)', width: '100%', display: 'flex', justifyContent: 'center' }}>
                <Box sx={{ width: siteSize, height: siteSize, border: '1px dashed grey', position: 'relative', overflow: 'hidden' }}>
                    {/* Axes */}
                    <Box sx={{ position: 'absolute', top: 5, left: centerX + 5, color: 'text.secondary', fontSize: 10 }}>+Z</Box>
                    <Box sx={{ position: 'absolute', bottom: 5, left: centerX + 5, color: 'text.secondary', fontSize: 10 }}>-Z</Box>
                    <Box sx={{ position: 'absolute', top: centerZ - 12, left: 5, color: 'text.secondary', fontSize: 10 }}>-X</Box>
                    <Box sx={{ position: 'absolute', top: centerZ - 12, right: 5, color: 'text.secondary', fontSize: 10 }}>+X</Box>
                    <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: centerX, borderLeft: '1px dashed #ccc' }} />
                    <Box sx={{ position: 'absolute', left: 0, right: 0, top: centerZ, borderTop: '1px dashed #ccc' }} />
                    {/* Building */}
                    <Box sx={{
                        position: 'absolute',
                        left: `calc(${centerX}px + ${offsetX}px - ${buildingWidth / 2}px)`,
                        top: `calc(${centerZ}px - ${offsetZ}px - ${buildingDepth / 2}px)`,
                        width: buildingWidth, height: buildingDepth,
                        bgcolor: 'primary.main', opacity: 0.8,
                        border: '1px solid', borderColor: 'primary.dark',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transition: 'all 0.3s ease-in-out',
                    }}>
                        <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>{params.name}</Typography>
                    </Box>
                </Box>
            </Paper>
        </Stack>
    );
};

// --- 主组件 ---
const BuildingCreator: React.FC = () => {
    const addFeature = useStore((state) => state.addFeature);
    const [params, setParams] = useState<BuildingParams>({ name: '新建建筑', width: 20, height: 30, depth: 20, positionX: 50, positionZ: -30 });
    const [isCreating, setIsCreating] = useState(false);

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams((p) => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };

    const handleCreate = () => {
        const positionY = params.height / 2; // Assume ground at Y=0
        const newFeature: CreateBuildingFeature = {
            id: uuidv4(),
            name: params.name,
            type: 'CreateBuilding',
            parameters: {
                width: params.width, height: params.height, depth: params.depth,
                position: { x: params.positionX, y: positionY, z: params.positionZ },
            },
        };
        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => setIsCreating(false), 1500);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ApartmentIcon />临近建筑</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                {/* 上：参数输入 */}
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Stack spacing={2}>
                        <TextField label="建筑名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />
                        <Divider>尺寸 (m)</Divider>
                        <TextField label="宽度 (X)" name="width" type="number" value={params.width} onChange={handleParamChange} size="small" />
                        <TextField label="高度 (Y)" name="height" type="number" value={params.height} onChange={handleParamChange} size="small" />
                        <TextField label="深度 (Z)" name="depth" type="number" value={params.depth} onChange={handleParamChange} size="small" />
                        <Divider>中心点平面位置 (m)</Divider>
                        <TextField label="坐标 X" name="positionX" type="number" value={params.positionX} onChange={handleParamChange} size="small" />
                        <TextField label="坐标 Z" name="positionZ" type="number" value={params.positionZ} onChange={handleParamChange} size="small" />
                    </Stack>
                </Paper>

                {/* 中：示意图 */}
                <BuildingPreview params={params} />

                {/* 下：操作按钮 */}
                <Box>
                    <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                        {isCreating ? '创建中...' : '创建建筑'}
                    </Button>
                    {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                </Box>
            </Stack>
        </Box>
    );
};

export default BuildingCreator; 