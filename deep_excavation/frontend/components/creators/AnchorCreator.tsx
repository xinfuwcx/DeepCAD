import React, { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { v4 as uuidv4 } from 'uuid';
import {
  Box,
  Typography,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Divider,
  Paper,
  Slider,
  Stack,
  FormLabel,
  InputAdornment,
  FormHelperText,
  SelectChangeEvent
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { CreateAnchorSystemFeature } from '../../services/parametricAnalysisService';

interface AnchorParams {
  name: string;
  anchorType: 'prestressed' | 'passive' | 'soil_nail';
  length: number;
  angle: number; // degrees
  spacing: number;
  diameter: number;
  prestressForce: number;
  freeLength: number;
  bondLength: number;
  verticalPosition: number; // Y-coordinate on the wall
}

const PRESTRESSED_DEFAULTS = {
  length: 15,
  prestressForce: 300,
  freeLength: 8,
  bondLength: 7,
};

const PASSIVE_DEFAULTS = {
  length: 12,
  prestressForce: 0,
  freeLength: 0,
  bondLength: 12,
};

const SOIL_NAIL_DEFAULTS = {
  length: 8,
  angle: 10,
  spacing: 1.5,
  diameter: 0.05,
  prestressForce: 0,
  freeLength: 0,
  bondLength: 8,
};

// A more robust preview component using Box components instead of Canvas
const AnchorPreview: React.FC<{ params: AnchorParams }> = ({ params }) => {
  const wallWidth = 40;
  const soilWidth = 200;
  const viewHeight = 250;
  const groundLevel = 50;
  
  const anchorY = groundLevel + params.verticalPosition;
  const angleRad = params.angle * (Math.PI / 180);

  const totalLengthPx = params.length * 8; // Scale factor for length
  const freeLengthPx = params.freeLength * 8;

  return (
    <Box sx={{ width: wallWidth + soilWidth, height: viewHeight, position: 'relative', bgcolor: '#f0f0f0', border: '1px solid #ccc', borderRadius: 1, overflow: 'hidden' }}>
      {/* Retaining Wall */}
      <Box sx={{ width: wallWidth, height: '100%', bgcolor: 'grey.500', position: 'absolute', left: 0, top: 0, zIndex: 1 }}>
         <Typography variant="caption" sx={{ color: 'white', writingMode: 'vertical-rl', transform: 'rotate(180deg)', textAlign: 'center', width: '100%', pt: 2}}>支护结构</Typography>
      </Box>

      {/* Soil Mass */}
      <Box sx={{ width: soilWidth, height: '100%', bgcolor: '#d2b48c', position: 'absolute', left: wallWidth, top: 0, opacity: 0.4 }} />
      <Box sx={{ position: 'absolute', left: wallWidth, top: groundLevel, width: soilWidth, height: 2, bgcolor: '#654321' }} />
      <Typography variant="caption" sx={{ position: 'absolute', left: wallWidth + 5, top: groundLevel - 18, color: 'text.secondary'}}>地面</Typography>

      {/* Anchor */}
      <Box
        sx={{
          position: 'absolute',
          left: wallWidth,
          top: anchorY,
          height: params.diameter * 200, // Exaggerate diameter for visibility
          bgcolor: '#cd7f32', // Bond length color
          transformOrigin: 'left center',
          transform: `rotate(${-params.angle}deg)`,
          width: totalLengthPx,
          zIndex: 2,
          display: 'flex',
        }}
      >
        {/* Free Length */}
        {params.anchorType === 'prestressed' && (
           <Box sx={{ width: freeLengthPx, height: '100%', bgcolor: '#4682b4' }} />
        )}
      </Box>

       {/* Labels */}
       <Box sx={{ 
            position: 'absolute', 
            left: wallWidth + totalLengthPx * Math.cos(angleRad) + 10, 
            top: anchorY - totalLengthPx * Math.sin(angleRad) - 10,
            transform: 'translateY(-50%)',
            bgcolor: 'rgba(255,255,255,0.8)',
            p: 0.5,
            borderRadius: 1
        }}>
           <Typography variant="caption">{`L=${params.length}m, α=${params.angle}°`}</Typography>
       </Box>
    </Box>
  );
};


const AnchorCreator: React.FC = () => {
  const addFeature = useStore(state => state.addFeature);
  const [params, setParams] = useState<AnchorParams>({
    name: '第一道锚杆',
    anchorType: 'prestressed',
    diameter: 0.15,
    spacing: 2,
    angle: 15,
    verticalPosition: 2,
    ...PRESTRESSED_DEFAULTS,
  });
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    // When freeLength or bondLength changes, update total length for prestressed anchors
    if (params.anchorType === 'prestressed') {
        const total = params.freeLength + params.bondLength;
        if (params.length !== total) {
            setParams(p => ({ ...p, length: total }));
        }
    }
  }, [params.freeLength, params.bondLength, params.anchorType]);

  const handleTypeChange = (event: SelectChangeEvent<string>) => {
    const newType = event.target.value as AnchorParams['anchorType'];
    let defaults = {};
    if (newType === 'prestressed') defaults = PRESTRESSED_DEFAULTS;
    else if (newType === 'passive') defaults = PASSIVE_DEFAULTS;
    else if (newType === 'soil_nail') defaults = SOIL_NAIL_DEFAULTS;
    
    setParams(p => ({ ...p, anchorType: newType, ...defaults }));
  };

  const handleParamChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setParams(p => ({ ...p, [name]: name === 'name' ? value : Number(value) }));
  };
  
  const handleSliderChange = (name: string) => (event: Event, value: number | number[]) => {
    setParams(p => ({ ...p, [name]: value as number }));
  };
  
  const handleCreateAnchor = () => {
    const newFeature: CreateAnchorSystemFeature = {
      id: uuidv4(),
      name: params.name,
      type: 'CreateAnchorSystem',
      parameters: {
          ...params,
          // TODO: These parameters are not in the form yet.
          // Need to add fields for them.
          parentId: '',
          rowCount: 1,
          verticalSpacing: 0,
          startHeight: params.verticalPosition,
          walerWidth: 0.3,
          walerHeight: 0.3,
          anchorAnalysisModel: 'beam',
          walerAnalysisModel: 'beam'
      }
    };
    addFeature(newFeature);
    setIsCreating(true);
    setTimeout(() => {
        setIsCreating(false);
        setParams(p => ({...p, name: `新建锚杆组 ${Math.floor(Math.random() * 100)}`}))
    }, 1500);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon />
        锚杆/土钉创建器
      </Typography>
      <Divider sx={{ my: 2 }} />
      <Grid container spacing={4}>
        <Grid item xs={12} md={6}>
          <Stack spacing={3}>
            <TextField
              label="锚杆/土钉组名称"
              name="name"
              value={params.name}
              onChange={handleParamChange}
              fullWidth
              size="small"
            />

            <FormControl fullWidth size="small">
              <InputLabel>类型</InputLabel>
              <Select label="类型" value={params.anchorType} onChange={handleTypeChange}>
                <MenuItem value="prestressed">预应力锚索</MenuItem>
                <MenuItem value="passive">被动锚杆</MenuItem>
                <MenuItem value="soil_nail">土钉</MenuItem>
              </Select>
            </FormControl>

            <Box>
                <FormLabel>几何参数</FormLabel>
                <Stack spacing={2} sx={{mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1}}>
                    {params.anchorType === 'prestressed' ? (
                        <>
                            <TextField label="自由段长度" name="freeLength" type="number" value={params.freeLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="锚固段长度" name="bondLength" type="number" value={params.bondLength} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="总长度 (自动计算)" name="length" type="number" value={params.length} size="small" InputProps={{ readOnly: true, endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        </>
                    ) : (
                        <TextField label="总长度" name="length" type="number" value={params.length} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                    )}
                    <Typography variant="body2" color="textSecondary">倾角: {params.angle}°</Typography>
                    <Slider value={params.angle} onChange={handleSliderChange('angle')} min={0} max={45} step={1} marks />
                    
                    <TextField label="水平间距" name="spacing" type="number" value={params.spacing} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}/>
                </Stack>
            </Box>

            <Box>
                <FormLabel>物理与荷载参数</FormLabel>
                <Stack spacing={2} sx={{mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1}}>
                     <TextField label="直径" name="diameter" type="number" value={params.diameter} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }}/>
                    {params.anchorType === 'prestressed' && (
                        <TextField label="预应力" name="prestressForce" type="number" value={params.prestressForce} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">kN</InputAdornment> }}/>
                    )}
                </Stack>
            </Box>

            <Box sx={{ pt: 2 }}>
              <Button variant="contained" color="primary" onClick={handleCreateAnchor} disabled={isCreating} fullWidth>
                {isCreating ? '创建中...' : '创建锚杆/土钉'}
              </Button>
            </Box>
          </Stack>
        </Grid>
        <Grid item xs={12} md={6}>
          <Stack spacing={1}>
            <FormLabel>实时剖面预览</FormLabel>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', pt: 2 }}>
              <AnchorPreview params={params} />
            </Box>
            <FormHelperText sx={{textAlign: 'center'}}>
                {params.anchorType === 'prestressed' ? '蓝色为自由段, 棕色为锚固段' : '棕色为杆体'}
            </FormHelperText>
          </Stack>
        </Grid>
      </Grid>
    </Paper>
  );
};

export default AnchorCreator; 