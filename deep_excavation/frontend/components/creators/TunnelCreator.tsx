import React, { useState, useMemo } from 'react';
import { useStore } from '../../core/store';
import { CreateTunnelFeature, Point3D } from '../../services/parametricAnalysisService';
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
    Slider,
    FormHelperText,
} from '@mui/material';
import TimelineIcon from '@mui/icons-material/Timeline';

interface TunnelParams {
  name: string;
  length: number;
  radius: number; // Radius of curvature. 0 for straight.
  width: number;
  height: number;
}

// A 2D schematic preview for the Tunnel
const Tunnel2DPreview: React.FC<{ params: TunnelParams }> = ({ params }) => {
  const { length, radius, width, height } = params;
  
  const svgSize = 200;
  const padding = 20;
  const effectiveSize = svgSize - 2 * padding;

  let pathData: string;
  let viewBox: string;

  if (radius === 0) { // Straight
    pathData = `M ${padding},${svgSize / 2} h ${effectiveSize}`;
    const maxDim = Math.max(length, width, height);
    viewBox = `0 0 ${svgSize} ${svgSize}`;
  } else { // Curved
    const r = (radius / length) * effectiveSize;
    const angle = length / radius;
    const endX = padding + r * Math.sin(angle);
    const endY = (svgSize/2) + r * (1 - Math.cos(angle));
    pathData = `M ${padding},${svgSize/2} A ${r},${r} 0 0,1 ${endX},${endY}`;
    viewBox = `0 0 ${svgSize} ${svgSize}`;
  }

  return (
    <Stack spacing={2} sx={{ width: '100%', alignItems: 'center', p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
        <Box>
            <Typography variant="caption" display="block" align="center">路径 (俯视图)</Typography>
            <svg width={svgSize} height={svgSize} viewBox={viewBox} style={{ border: '1px solid #ddd' }}>
                <path d={pathData} stroke="#4dabf5" strokeWidth="3" fill="none" strokeLinecap="round" />
                 {/* Start and end points */}
                <circle cx={pathData.split(' ')[1]} cy={pathData.split(' ')[2].split(',')[1]} r="3" fill="#f54d4d" />
                <text x={padding - 10} y={svgSize/2 + 5} fontSize="10" fill="#333">起点</text>
            </svg>
            <Typography variant="body2" align="center" mt={1}>长度: {length}m</Typography>
        </Box>
        <Divider sx={{ width: '80%' }} />
        <Box>
             <Typography variant="caption" display="block" align="center">横截面</Typography>
            <Box sx={{
                width: width * 2, // Scale for better visibility
                height: height * 2,
                bgcolor: 'primary.light',
                border: '2px solid',
                borderColor: 'primary.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 1,
                mt: 1,
            }}>
                <Typography variant="caption" color="white" sx={{ fontWeight: 'bold' }}>{width}m x {height}m</Typography>
            </Box>
        </Box>
    </Stack>
  );
};

const TunnelCreator: React.FC = () => {
  const addFeature = useStore(state => state.addFeature);
  const [params, setParams] = useState<TunnelParams>({
      name: '主隧道',
      length: 100,
      radius: 0, // 0 means straight
      width: 10,
      height: 8,
  });
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
    const numSegments = 50; // Higher resolution for the final geometry

    const pathPoints: Point3D[] = [];
    if (radius === 0) { // Straight
        pathPoints.push({ x: 0, y: 0, z: 0 });
        pathPoints.push({ x: length, y: 0, z: 0 });
    } else { // Curved
        const angleStep = (length / radius) / numSegments;
        for (let i = 0; i <= numSegments; i++) {
            const angle = i * angleStep;
            const x = Math.sin(angle) * radius;
            const z = radius - Math.cos(angle) * radius;
            pathPoints.push({ x, y: 0, z: -z });
        }
    }
    
    const newFeature: CreateTunnelFeature = {
      id: uuidv4(),
      name,
      type: 'CreateTunnel',
      parameters: { pathPoints, width, height },
    };

    addFeature(newFeature);
    setIsCreating(true);
    setTimeout(() => setIsCreating(false), 1500);
  };

  return (
    <Paper elevation={2} sx={{ p: 2, height: '100%' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TimelineIcon />
            隧道创建器
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Grid container spacing={4}>
            <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                    <TextField label="隧道名称" name="name" value={params.name} onChange={handleParamChange} fullWidth size="small" />

                    <Box>
                        <FormLabel>路径参数</FormLabel>
                        <Stack spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            <TextField label="隧道长度" name="length" type="number" value={params.length} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <Typography variant="body2" color="textSecondary">曲线半径: {params.radius === 0 ? '直线' : `${params.radius}m`}</Typography>
                            <Slider value={params.radius} onChange={handleSliderChange('radius')} min={0} max={1000} step={50} />
                            <FormHelperText>将滑块拖至最左端 (0) 以创建直线隧道。</FormHelperText>
                        </Stack>
                    </Box>
                    
                    <Box>
                        <FormLabel>截面参数</FormLabel>
                        <Stack direction="row" spacing={2} sx={{ mt: 1, p: 2, border: '1px solid #eee', borderRadius: 1 }}>
                            <TextField label="截面宽度" name="width" type="number" value={params.width} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                            <TextField label="截面高度" name="height" type="number" value={params.height} onChange={handleParamChange} size="small" InputProps={{ endAdornment: <InputAdornment position="end">m</InputAdornment> }} />
                        </Stack>
                    </Box>

                    <Box sx={{ pt: 2 }}>
                        <Button variant="contained" color="primary" onClick={handleCreate} disabled={isCreating} fullWidth>
                            {isCreating ? '创建中...' : '创建隧道'}
                        </Button>
                        {isCreating && <LinearProgress sx={{ mt: 1 }} />}
                    </Box>
                </Stack>
            </Grid>
            <Grid item xs={12} md={6}>
                <Stack spacing={1}>
                    <FormLabel>二维示意图</FormLabel>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 320 }}>
                        <Tunnel2DPreview params={params} />
                    </Box>
                </Stack>
            </Grid>
        </Grid>
    </Paper>
  );
};

export default TunnelCreator; 