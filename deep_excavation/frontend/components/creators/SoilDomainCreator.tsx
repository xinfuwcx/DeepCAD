import React, { useState } from 'react';
import { 
    Box, 
    TextField,
    Button,
    Typography,
    Stack
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useStore } from '../../core/store';

const SoilDomainCreator: React.FC = () => {
    const addFeature = useStore(state => state.addFeature);
    const [size, setSize] = useState({ x: 200, y: 100, z: 200 });
    const [position, setPosition] = useState({ x: 0, y: -50, z: 0 });

    const handleAddSoilDomain = () => {
        addFeature({
            type: 'SoilDomain',
            size: { ...size },
            position: { ...position },
        });
    };

    return (
        <Box className="fade-in-up">
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                土体域
            </Typography>
            <Stack spacing={2}>
                <Stack direction="row" spacing={1}>
                    <TextField 
                        label="尺寸 X"
                        type="number"
                        value={size.x}
                        onChange={e => setSize({...size, x: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                    <TextField 
                        label="尺寸 Y"
                        type="number"
                        value={size.y}
                        onChange={e => setSize({...size, y: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                    <TextField 
                        label="尺寸 Z"
                        type="number"
                        value={size.z}
                        onChange={e => setSize({...size, z: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                </Stack>
                <Stack direction="row" spacing={1}>
                     <TextField 
                        label="位置 X"
                        type="number"
                        value={position.x}
                        onChange={e => setPosition({...position, x: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                    <TextField 
                        label="位置 Y"
                        type="number"
                        value={position.y}
                        onChange={e => setPosition({...position, y: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                    <TextField 
                        label="位置 Z"
                        type="number"
                        value={position.z}
                        onChange={e => setPosition({...position, z: parseFloat(e.target.value)})}
                        variant="outlined"
                        size="small"
                        fullWidth
                    />
                </Stack>
                <Button 
                    variant="contained" 
                    color="primary" 
                    onClick={handleAddSoilDomain}
                    startIcon={<AddIcon />}
                >
                    创建土体域
                </Button>
            </Stack>
        </Box>
    );
};

export default SoilDomainCreator; 