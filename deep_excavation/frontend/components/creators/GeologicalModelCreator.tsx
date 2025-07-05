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
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { useStore } from '../../core/store';
import { CreateGeologicalModelFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

// Define the structure for a soil layer based on parsed data
interface SoilLayer {
    name: string;
    pointCount: number;
}

const GeologicalModelCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [fileName, setFileName] = useState<string | null>(null);
    const [layers, setLayers] = useState<SoilLayer[]>([]);

    const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        setFileName(file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text) return;

            // --- UI Feedback: Parse for display ---
            const lines = text.split('\n').filter(line => line.trim() !== '');
            if (lines.length < 2) {
                alert("CSV file must have at least a header and one data line.");
                return;
            }
            const headers = lines[0].split(',').map(h => h.trim());
            const surfaceIndex = headers.indexOf('surface');
            if (surfaceIndex === -1) {
                alert("CSV must contain a 'surface' column!");
                return;
            }

            const pointsBySurface: { [key: string]: any[] } = {};
            for (let i = 1; i < lines.length; i++) {
                const data = lines[i].split(',');
                const surface = data[surfaceIndex]?.trim();
                if (surface) {
                    if (!pointsBySurface[surface]) {
                        pointsBySurface[surface] = [];
                    }
                    pointsBySurface[surface].push(data);
                }
            }
            
            const parsedLayers = Object.keys(pointsBySurface).map(surfaceName => ({
                name: surfaceName,
                pointCount: pointsBySurface[surfaceName].length,
            }));

            setLayers(parsedLayers);
            
            // --- Global State Update ---
            const geologicalModelFeature: CreateGeologicalModelFeature = {
                id: uuidv4(),
                name: `地质模型 (${file.name})`,
                type: 'CreateGeologicalModel',
                parameters: {
                    csvData: text,
                },
            };
            addFeature(geologicalModelFeature);
        };
        reader.readAsText(file);

    }, [addFeature]);

    return (
        <Box className="fade-in-up">
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                地质模型 (GemPy)
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
                    // TODO: Also remove the feature from the store
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
            </Stack>
        </Box>
    );
};

export default GeologicalModelCreator; 