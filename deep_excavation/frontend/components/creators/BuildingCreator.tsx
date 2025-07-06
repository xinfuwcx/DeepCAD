import React, { useState } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Button,
  Typography,
  Stack,
  Paper,
  Divider,
  TextField,
  Grid,
  LinearProgress,
  FormLabel,
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

const BuildingCreator: React.FC = () => {
  const addFeature = useStore((state) => state.addFeature);
  
  const [params, setParams] = useState<BuildingParams>({
    name: '新建建筑物',
    width: 20,
    height: 30,
    depth: 20,
    positionX: 50,
    positionZ: -30,
  });
  
  const [isCreating, setIsCreating] = useState<boolean>(false);

  const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setParams((prevParams) => ({
      ...prevParams,
      [name]: name === 'name' ? value : Number(value),
    }));
  };

  const handleCreateBuilding = () => {
    // For buildings, Y position is typically calculated to be on top of the terrain.
    // For now, we use a fixed Y value, assuming the ground is at Y=0.
    const positionY = params.height / 2;

    const newFeature: CreateBuildingFeature = {
      id: uuidv4(),
      name: params.name,
      type: 'CreateBuilding',
      parameters: {
        width: params.width,
        height: params.height,
        depth: params.depth,
        position: { x: params.positionX, y: positionY, z: params.positionZ },
      },
    };

    addFeature(newFeature);
    setIsCreating(true);

    // Simulate creation process completion
    setTimeout(() => {
      setIsCreating(false);
      // Reset for next creation
      setParams(prev => ({ ...prev, name: `新建建筑物 ${Math.floor(Math.random() * 100)}`}));
    }, 1500);
  };

  // A simple 2D preview component
  const Preview = () => {
    const siteSize = 250; // A virtual site size for context
    const scale = siteSize / Math.max(200, Math.abs(params.positionX) * 2, Math.abs(params.positionZ) * 2);
    
    const buildingWidth = params.width * scale;
    const buildingDepth = params.depth * scale;
    
    // Center of the preview area
    const centerX = siteSize / 2;
    const centerZ = siteSize / 2;

    // Position offset from center
    const offsetX = params.positionX * scale;
    const offsetZ = params.positionZ * scale;
    
    return (
      <Box 
        sx={{ 
          width: siteSize, 
          height: siteSize, 
          bgcolor: 'grey.100',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'monospace',
          fontSize: '10px'
        }}
      >
        {/* Axes */}
        <Box sx={{ position: 'absolute', top: 5, left: centerX + 5, color: 'text.secondary' }}>+Z</Box>
        <Box sx={{ position: 'absolute', bottom: 5, left: centerX + 5, color: 'text.secondary' }}>-Z</Box>
        <Box sx={{ position: 'absolute', top: centerZ - 12, left: 5, color: 'text.secondary' }}>-X</Box>
        <Box sx={{ position: 'absolute', top: centerZ - 12, right: 5, color: 'text.secondary' }}>+X</Box>
        <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: centerX, borderLeft: '1px dashed #ccc' }} />
        <Box sx={{ position: 'absolute', left: 0, right: 0, top: centerZ, borderTop: '1px dashed #ccc' }} />

        {/* Building Footprint */}
        <Box
          sx={{
            position: 'absolute',
            left: `calc(${centerX}px + ${offsetX}px - ${buildingWidth / 2}px)`,
            top: `calc(${centerZ}px - ${offsetZ}px - ${buildingDepth / 2}px)`, // -Z is up in 2D top-down
            width: buildingWidth,
            height: buildingDepth,
            bgcolor: 'primary.main',
            opacity: 0.7,
            border: '1px solid',
            borderColor: 'primary.dark',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            transition: 'all 0.3s ease-in-out',
          }}
        >
          <Typography variant="caption" sx={{color: 'white', fontWeight: 'bold'}}>{params.name}</Typography>
        </Box>
      </Box>
    );
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ApartmentIcon />
        临近建筑物创建器
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Stack spacing={2.5}>
            <TextField
              label="建筑物名称"
              name="name"
              value={params.name}
              onChange={handleParamChange}
              fullWidth
              size="small"
            />
            
            <Box>
                <FormLabel>尺寸 (米)</FormLabel>
                <Stack direction="row" spacing={1} sx={{mt: 1}}>
                    <TextField label="宽度 (X)" name="width" type="number" value={params.width} onChange={handleParamChange} size="small" />
                    <TextField label="高度 (Y)" name="height" type="number" value={params.height} onChange={handleParamChange} size="small" />
                    <TextField label="深度 (Z)" name="depth" type="number" value={params.depth} onChange={handleParamChange} size="small" />
                </Stack>
            </Box>

            <Box>
                <FormLabel>平面位置 (米)</FormLabel>
                 <Stack direction="row" spacing={1} sx={{mt: 1}}>
                    <TextField label="坐标 X" name="positionX" type="number" value={params.positionX} onChange={handleParamChange} size="small" />
                    <TextField label="坐标 Z" name="positionZ" type="number" value={params.positionZ} onChange={handleParamChange} size="small" />
                </Stack>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleCreateBuilding}
                disabled={isCreating}
                fullWidth
              >
                {isCreating ? '创建中...' : '创建建筑'}
              </Button>
              {isCreating && <LinearProgress sx={{ mt: 1 }} />}
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <FormLabel>实时预览 (俯视图)</FormLabel>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 2 }}>
              <Preview />
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default BuildingCreator; 