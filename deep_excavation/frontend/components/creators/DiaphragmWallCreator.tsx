import React, { useState, useEffect } from 'react';
import { useStore } from '../../core/store';
import { CreateDiaphragmWallFeature, Point3D } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import { 
    Box, 
    Typography, 
    Stack, 
    TextField, 
    Button, 
    Divider, 
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const DiaphragmWallCreator: React.FC = () => {
    const [startPoint, setStartPoint] = useState<Point3D>({ x: -25, y: -25, z: 0 });
    const [endPoint, setEndPoint] = useState<Point3D>({ x: 25, y: -25, z: 0 });
    const [thickness, setThickness] = useState(1);
    const [height, setHeight] = useState(25);
    const [analysisModel, setAnalysisModel] = useState<'shell' | 'solid'>('shell');
    const addFeature = useStore(state => state.addFeature);

    const handleCreate = () => {
        const newFeature: CreateDiaphragmWallFeature = {
            id: uuidv4(),
            name: '地连墙',
            type: 'CreateDiaphragmWall',
            parameters: {
                path: [startPoint, endPoint],
                thickness,
                height,
                analysisModel,
            },
        };
        addFeature(newFeature);
    };
    
    const handlePointChange = (
        pointSetter: React.Dispatch<React.SetStateAction<Point3D>>, 
        axis: 'x' | 'y' | 'z', 
        value: string
    ) => {
        pointSetter(prev => ({ ...prev, [axis]: parseFloat(value) || 0 }));
    };

    return (
        <Stack spacing={3}>
            <Typography variant="h6" gutterBottom>
                创建地连墙
            </Typography>

            <Divider />
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>几何参数</Typography>
            
            <Grid container spacing={2}>
                <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>起点坐标</Typography>
                </Grid>
                <Grid item xs={4}>
                    <TextField label="X" type="number" value={startPoint.x} onChange={e => handlePointChange(setStartPoint, 'x', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={4}>
                    <TextField label="Y" type="number" value={startPoint.y} onChange={e => handlePointChange(setStartPoint, 'y', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={4}>
                    <TextField label="Z" type="number" value={startPoint.z} onChange={e => handlePointChange(setStartPoint, 'z', e.target.value)} fullWidth size="small" />
                </Grid>
                
                <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 'medium' }}>终点坐标</Typography>
                </Grid>
                <Grid item xs={4}>
                    <TextField label="X" type="number" value={endPoint.x} onChange={e => handlePointChange(setEndPoint, 'x', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={4}>
                    <TextField label="Y" type="number" value={endPoint.y} onChange={e => handlePointChange(setEndPoint, 'y', e.target.value)} fullWidth size="small" />
                </Grid>
                <Grid item xs={4}>
                    <TextField label="Z" type="number" value={endPoint.z} onChange={e => handlePointChange(setEndPoint, 'z', e.target.value)} fullWidth size="small" />
                </Grid>
            </Grid>
            
            <TextField label="墙体厚度 (m)" type="number" value={thickness} onChange={e => setThickness(parseFloat(e.target.value))} fullWidth size="small" />
            <TextField label="墙体高度 (m)" type="number" value={height} onChange={e => setHeight(parseFloat(e.target.value))} fullWidth size="small" />

            <Divider />
            <Typography variant="subtitle1" sx={{ color: 'text.secondary' }}>分析参数</Typography>
            
            <FormControl fullWidth size="small">
                <InputLabel>分析模型</InputLabel>
                <Select
                    value={analysisModel}
                    label="分析模型"
                    onChange={e => setAnalysisModel(e.target.value as 'shell' | 'solid')}
                >
                    <MenuItem value="shell">壳单元</MenuItem>
                    <MenuItem value="solid">实体单元</MenuItem>
                </Select>
            </FormControl>

            <Box sx={{ pt: 2 }}>
                <Button onClick={handleCreate} variant="contained" startIcon={<AddIcon />}>
                    创建地连墙特征
                </Button>
            </Box>
        </Stack>
    );
};

export default DiaphragmWallCreator; 