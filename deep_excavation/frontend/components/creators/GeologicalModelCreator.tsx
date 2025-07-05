import React, { useState, useCallback } from 'react';
import {
    Box,
    Button,
    Typography,
    Stack,
    Chip,
    Paper,
    List,
    ListItem,
    ListItemText,
    Divider,
    TextField,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';
import { generateGeologicalSurfaces, BoreholePoint } from '../../services/geologyService';

// Define the structure for a soil layer based on parsed data
interface SoilLayer {
    name: string;
    pointCount: number;
}

const GeologicalModelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const setTransientObjects = useStore(state => state.setTransientObjects);
    const [fileName, setFileName] = useState<string | null>(null);
    const [layers, setLayers] = useState<SoilLayer[]>([]);
    const [csvData, setCsvData] = useState<string | null>(null);
    const [algorithm, setAlgorithm] = useState('TIN');
    const [domain, setDomain] = useState({ width: 100, length: 100, height: 50 });

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;
            setCsvData(text);

            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) return;
            const headers = lines[0].split(',').map(h => h.trim());
            const soilLayerIndex = headers.indexOf('soil_layer');
            if (soilLayerIndex === -1) return;

            const pointsBySoilLayer: { [key: string]: any[] } = {};
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                const layerName = data[soilLayerIndex]?.trim();
                if (layerName) {
                    if (!pointsBySoilLayer[layerName]) {
                        pointsBySoilLayer[layerName] = [];
                    }
                    pointsBySoilLayer[layerName].push(data);
                }
            }
            
            const parsedLayers = Object.keys(pointsBySoilLayer).map(layerName => ({
                name: layerName,
                pointCount: pointsBySoilLayer[layerName].length,
            }));
            setLayers(parsedLayers);
            
            const geologicalModelFeature: AnyFeature = {
                id: uuidv4(),
                name: `地质模型 (${file.name})`,
                type: 'CreateGeologicalModel',
                parameters: { csvData: text },
            };
            addFeature(geologicalModelFeature);
        };
        reader.readAsText(file);
    }, [addFeature]);

    const handleGenerateClick = () => {
        if (!csvData) return;

        setTimeout(() => {
            const lines = csvData.split('\n').filter(line => line.trim() !== '');
            const headers = lines[0].split(',').map(h => h.trim());
            const [xIndex, yIndex, surfaceIndex, soilLayerIndex] = ['x', 'y', 'surface', 'soil_layer'].map(h => headers.indexOf(h));

            if ([xIndex, yIndex, surfaceIndex, soilLayerIndex].includes(-1)) return;

            const boreholePoints: BoreholePoint[] = [];
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                boreholePoints.push({
                    x: parseFloat(data[xIndex]),
                    y: parseFloat(data[yIndex]),
                    z: parseFloat(data[surfaceIndex]),
                    soilLayer: data[soilLayerIndex].trim(),
                });
            }
            
            const meshes = generateGeologicalSurfaces(boreholePoints);
            setTransientObjects(meshes);
            console.log(`Generated ${meshes.length} surfaces.`);
        }, 50);
    };

    return (
        <Box className="fade-in-up">
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                地质模型
            </Typography>
            <Stack spacing={2}>
                <Button
                    variant="contained"
                    component="label"
                    startIcon={<UploadFileIcon />}
                >
                    上传地层点 (CSV)
                    <input
                        type="file"
                        hidden
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                </Button>
                {fileName && <Chip label={fileName} onDelete={() => { 
                    setFileName(null); 
                    setLayers([]); 
                    setCsvData(null); 
                }} />}
                
                {layers.length > 0 && (
                     <Paper variant="outlined">
                        <List dense>
                            <ListItem>
                                <ListItemText primary={<Typography variant="body2" sx={{fontWeight: 'bold'}}>检测到的地层</Typography>} />
                            </ListItem>
                            {layers.map(layer => (
                                <ListItem key={layer.name}>
                                    <ListItemText primary={layer.name} secondary={`${layer.pointCount} points`} />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}

                {layers.length > 0 && (
                    <Paper variant="outlined" sx={{ p: 2, mt: 2 }}>
                        <Stack spacing={2}>
                            <Typography variant="body2" sx={{fontWeight: 'bold'}}>建模参数</Typography>
                            <FormControl fullWidth>
                                <InputLabel>插值算法</InputLabel>
                                <Select value={algorithm} label="插值算法" onChange={(e) => setAlgorithm(e.target.value)} size="small">
                                    <MenuItem value="TIN">TIN (Delaunay Triangulation)</MenuItem>
                                </Select>
                            </FormControl>
                            <TextField label="计算域宽度 (X)" type="number" value={domain.width} onChange={(e) => setDomain(d => ({ ...d, width: parseFloat(e.target.value) }))} size="small" />
                            <TextField label="计算域长度 (Y)" type="number" value={domain.length} onChange={(e) => setDomain(d => ({ ...d, length: parseFloat(e.target.value) }))} size="small" />
                            <TextField label="计算域高度 (Z)" type="number" value={domain.height} onChange={(e) => setDomain(d => ({ ...d, height: parseFloat(e.target.value) }))} size="small" />
                             <Button variant="contained" color="secondary" onClick={handleGenerateClick}>生成三维地质模型</Button>
                        </Stack>
                    </Paper>
                )}
            </Stack>
        </Box>
    );
};

export default GeologicalModelCreator; 