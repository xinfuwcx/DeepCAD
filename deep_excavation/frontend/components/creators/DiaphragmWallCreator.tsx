import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
    Box,
    Button,
    Typography,
    Stack,
    TextField,
    Paper,
    Grid,
    Divider,
    InputAdornment,
    FormLabel,
    LinearProgress,
} from '@mui/material';
import VerticalSplitIcon from '@mui/icons-material/VerticalSplit';
import { CreateDiaphragmWallFeature } from '../../services/parametricAnalysisService';

interface WallParams {
  name: string;
  thickness: number;
  depth: number;
  planLengthX: number; // Length of excavation in X
  planLengthY: number; // Length of excavation in Y
}

// Preview for the cross-section view
const SectionPreview: React.FC<{ params: WallParams }> = ({ params }) => {
  const viewHeight = 180;
  const groundLevel = 40;
  const wallDepthPx = params.depth * 5; // Scale factor
  const wallThicknessPx = params.thickness * 20; // Exaggerate thickness

  return (
    <Box sx={{ width: '100%', height: viewHeight, position: 'relative', bgcolor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
      <Box sx={{ position: 'absolute', left: 0, top: groundLevel, width: '100%', height: 2, bgcolor: '#654321' }} />
      <Typography variant="caption" sx={{ position: 'absolute', left: 5, top: groundLevel - 18, color: 'text.secondary' }}>地面</Typography>
      
      {/* Wall */}
      <Box sx={{
        position: 'absolute',
        top: groundLevel,
        left: '50%',
        transform: 'translateX(-50%)',
        width: wallThicknessPx,
        height: wallDepthPx,
        bgcolor: 'grey.600',
      }}/>

      {/* Depth Label */}
      <Typography variant="caption" sx={{ position: 'absolute', top: groundLevel + wallDepthPx / 2, left: `calc(50% + ${wallThicknessPx / 2 + 5}px)` }}>
        H={params.depth}m
      </Typography>
       {/* Thickness Label */}
       <Typography variant="caption" sx={{ position: 'absolute', top: groundLevel - 18, left: '50%', transform: 'translateX(-50%)' }}>
        T={params.thickness}m
      </Typography>
    </Box>
  );
};

// Preview for the top-down plan view
const PlanPreview: React.FC<{ params: WallParams }> = ({ params }) => {
  const viewSize = 220;
  const scale = viewSize / Math.max(100, params.planLengthX * 1.2, params.planLengthY * 1.2);
  
  const pitWidth = params.planLengthX * scale;
  const pitHeight = params.planLengthY * scale;
  const wallThickness = params.thickness * scale;

  return (
    <Box sx={{ width: viewSize, height: viewSize, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', bgcolor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 1 }}>
        {/* Pit Area */}
        <Box sx={{ width: pitWidth, height: pitHeight, bgcolor: '#e3f2fd', border: '1px dashed #90caf9' }} />

        {/* Diaphragm Wall */}
        <Box sx={{
            position: 'absolute',
            width: pitWidth + 2 * wallThickness,
            height: pitHeight + 2 * wallThickness,
            border: `${wallThickness}px solid #8d6e63`,
        }}/>
        <Typography variant="caption" sx={{ position: 'absolute', top: '50%', left: `calc(50% + ${pitWidth/2 + wallThickness + 5}px)`, transform: 'translateY(-50%)'}}>
            Y={params.planLengthY}m
        </Typography>
        <Typography variant="caption" sx={{ position: 'absolute', left: '50%', top: `calc(50% + ${pitHeight/2 + wallThickness + 5}px)`, transform: 'translateX(-50%)'}}>
            X={params.planLengthX}m
        </Typography>
    </Box>
  );
};


const DiaphragmWallCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [params, setParams] = useState<WallParams>({
        name: '地下连续墙',
        thickness: 0.8,
        depth: 20,
        planLengthX: 50,
        planLengthY: 30,
    });
    const [isCreating, setIsCreating] = useState(false);

    const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = event.target;
        setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
    };

    const handleCreate = () => {
        const { planLengthX, planLengthY, thickness, depth, name } = params;

        // Convert plan lengths to a closed rectangular path centered at origin
        const halfX = planLengthX / 2;
        const halfY = planLengthY / 2;
        const path: [number, number][] = [
            [-halfX, -halfY],
            [halfX, -halfY],
            [halfX, halfY],
            [-halfX, halfY],
            [-halfX, -halfY] // Close the loop
        ];

        const newFeature: CreateDiaphragmWallFeature = {
            id: uuidv4(),
            name: name,
            type: 'CreateDiaphragmWall',
            parameters: {
                depth,
                thickness,
                path,
            },
        };

        addFeature(newFeature);
        setIsCreating(true);
        setTimeout(() => {
            setIsCreating(false);
        }, 1500);
    };

    return (
        <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VerticalSplitIcon />
                地下连续墙创建器
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={4}>
                <Grid item xs={12} md={6}>
                    <Stack spacing={3}>
                        <TextField
                            label="墙体名称"
                            name="name"
                            value={params.name}
                            onChange={handleParamChange}
                            fullWidth
                            size="small"
                        />

                        <Box>
                            <FormLabel>几何参数</FormLabel>
                            <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                <TextField
                                    label="墙体厚度"
                                    name="thickness"
                                    type="number"
                                    value={params.thickness}
                                    onChange={handleParamChange}
                                    size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                />
                                <TextField
                                    label="墙体深度"
                                    name="depth"
                                    type="number"
                                    value={params.depth}
                                    onChange={handleParamChange}
                                    size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                />
                            </Stack>
                        </Box>
                        
                        <Box>
                            <FormLabel>基坑平面尺寸</FormLabel>
                             <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                                <TextField
                                    label="X方向长度"
                                    name="planLengthX"
                                    type="number"
                                    value={params.planLengthX}
                                    onChange={handleParamChange}
                                    size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                />
                                <TextField
                                    label="Y方向长度"
                                    name="planLengthY"
                                    type="number"
                                    value={params.planLengthY}
                                    onChange={handleParamChange}
                                    size="small"
                                    InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}
                                />
                            </Stack>
                        </Box>

                        <Box sx={{ pt: 2 }}>
                            <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                                {isCreating ? '创建中...' : '创建地连墙'}
                            </Button>
                            {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                        </Box>
                    </Stack>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Stack spacing={2}>
                         <Box>
                            <FormLabel>平面示意图</FormLabel>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 1 }}>
                                <PlanPreview params={params} />
                            </Box>
                        </Box>
                        <Box>
                            <FormLabel>剖面示意图</FormLabel>
                            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 1 }}>
                                <SectionPreview params={params} />
                            </Box>
                        </Box>
                    </Stack>
                </Grid>
            </Grid>
        </Paper>
    );
};

export default DiaphragmWallCreator; 