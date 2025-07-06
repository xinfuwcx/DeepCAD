import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreatePileRaftFeature, Point3D } from '../../services/parametricAnalysisService';
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
import ViewModuleIcon from '@mui/icons-material/ViewModule';

interface PileRaftParams {
  name: string;
  beamLength: number;
  beamWidth: number;
  beamHeight: number;
  pileDiameter: number;
  pileLength: number;
  pileSpacing: number;
}

// A 2D schematic preview for the pile raft
const PileRaft2DPreview: React.FC<{ params: PileRaftParams }> = ({ params }) => {
    const { beamLength, beamWidth, beamHeight, pileDiameter, pileLength, pileSpacing } = params;
    const numPiles = pileSpacing > 0 ? Math.floor(beamLength / pileSpacing) + 1 : 1;

    const sideViewHeight = 200;
    const sideViewWidth = 250;
    const sideScale = Math.min(sideViewWidth / (beamLength * 1.1), sideViewHeight / ((beamHeight + pileLength) * 1.1));
    
    const planViewSize = 250;
    const planScale = planViewSize / (beamLength * 1.1);

    return (
        <Stack spacing={2} sx={{ width: '100%', alignItems: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            {/* Side View (Elevation) */}
            <Box>
                <Typography variant="caption" display="block" align="center">立面图</Typography>
                <Box sx={{ width: sideViewWidth, height: sideViewHeight, border: '1px solid #ccc', position: 'relative', mt: 1 }}>
                    {/* Cap Beam */}
                    <Box sx={{
                        position: 'absolute',
                        top: 20,
                        left: (sideViewWidth - beamLength * sideScale) / 2,
                        width: beamLength * sideScale,
                        height: beamHeight * sideScale,
                        bgcolor: 'grey.500',
                    }}>
                         <Typography variant="caption" sx={{position: 'absolute', top: -18, width: '100%', textAlign: 'center'}}>{beamLength}m</Typography>
                    </Box>

                    {/* Piles */}
                    {Array.from({ length: numPiles }).map((_, i) => (
                        <Box key={i} sx={{
                            position: 'absolute',
                            top: 20 + beamHeight * sideScale,
                            left: (sideViewWidth - beamLength * sideScale) / 2 + (numPiles > 1 ? i * pileSpacing * sideScale : (beamLength * sideScale)/2) - (pileDiameter * sideScale / 2),
                            width: pileDiameter * sideScale,
                            height: pileLength * sideScale,
                            bgcolor: 'grey.400',
                        }} />
                    ))}
                     <Typography variant="caption" sx={{position: 'absolute', top: 20 + beamHeight * sideScale, left: 5}}>桩长: {pileLength}m</Typography>
                </Box>
            </Box>

            <Divider sx={{ width: '80%' }} />

            {/* Top View (Plan) */}
            <Box>
                <Typography variant="caption" display="block" align="center">平面图</Typography>
                <Box sx={{ width: planViewSize, height: 100, border: '1px solid #ccc', position: 'relative', mt: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     {/* Cap Beam */}
                     <Box sx={{
                        width: beamLength * planScale,
                        height: beamWidth * planScale * 5, // Exaggerate
                        bgcolor: 'grey.500',
                        position: 'relative',
                    }}>
                        {/* Piles */}
                        {Array.from({ length: numPiles }).map((_, i) => (
                            <Box key={i} sx={{
                                position: 'absolute',
                                top: '50%',
                                left: (numPiles > 1 ? i * pileSpacing * planScale : (beamLength * planScale) / 2) - (pileDiameter * planScale / 2),
                                width: pileDiameter * planScale,
                                height: pileDiameter * planScale,
                                borderRadius: '50%',
                                bgcolor: 'grey.700',
                                transform: 'translateY(-50%)',
                            }} />
                        ))}
                     </Box>
                     <Typography variant="caption" sx={{position: 'absolute', bottom: 5, width: '100%', textAlign: 'center'}}>桩间距: {pileSpacing}m</Typography>
                </Box>
            </Box>
        </Stack>
    );
};


const PileRaftCreator: React.FC = () => {
  const addFeature = useStore(state => state.addFeature);
  const [params, setParams] = useState<PileRaftParams>({
      name: '第一排桩',
      beamLength: 40,
      beamWidth: 1.2,
      beamHeight: 1.5,
      pileDiameter: 0.8,
      pileLength: 18,
      pileSpacing: 3,
  });
  const [isCreating, setIsCreating] = useState(false);

  const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = event.target;
      setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
  };

  const handleCreate = () => {
    const { beamLength, beamWidth, beamHeight, pileDiameter, pileLength, pileSpacing, name } = params;

    const halfLength = beamLength / 2;
    const path: [Point3D, Point3D] = [
        { x: -halfLength, y: 0, z: 0 },
        { x: halfLength, y: 0, z: 0 },
    ];

    const newFeature: CreatePileRaftFeature = {
      id: uuidv4(),
      name: name,
      type: 'CreatePileRaft',
      parameters: {
        path,
        capBeamWidth: beamWidth,
        capBeamHeight: beamHeight,
        pileDiameter,
        pileLength,
        pileSpacing,
        // Using default analysis models
        pileAnalysisModel: 'beam',
        capBeamAnalysisModel: 'beam',
      },
    };

    addFeature(newFeature);
    setIsCreating(true);
    setTimeout(() => setIsCreating(false), 1500);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewModuleIcon />
            桩承台创建器
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                    <TextField
                        label="桩排名称"
                        name="name"
                        value={params.name}
                        onChange={handleParamChange}
                        fullWidth
                        size="small"
                    />

                    <Box>
                        <FormLabel>承台梁参数</FormLabel>
                        <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            <TextField label="梁长" name="beamLength" type="number" value={params.beamLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="梁宽" name="beamWidth" type="number" value={params.beamWidth} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="梁高" name="beamHeight" type="number" value={params.beamHeight} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        </Stack>
                    </Box>
                    
                    <Box>
                        <FormLabel>桩参数</FormLabel>
                        <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            <TextField label="桩径" name="pileDiameter" type="number" value={params.pileDiameter} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="桩长" name="pileLength" type="number" value={params.pileLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="桩间距" name="pileSpacing" type="number" value={params.pileSpacing} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        </Stack>
                    </Box>

                    <Box sx={{ pt: 2 }}>
                        <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                            {isCreating ? '创建中...' : '创建桩排'}
                        </Button>
                        {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                    </Box>
                </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                    <FormLabel>二维示意图</FormLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320, bgcolor: 'transparent' }}>
                        <PileRaft2DPreview params={params} />
                    </Box>
                </Stack>
            </Grid>
        </Grid>
    </Paper>
  );
};

export default PileRaftCreator; 