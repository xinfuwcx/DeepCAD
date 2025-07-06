import React from 'react';
import { Box, Typography, Chip, Paper, Grid } from '@mui/material';
import { gempyColorSystem } from '../../core/gempyInspiredColorSystem';

const GemPyColorPreview: React.FC = () => {
    const colorScheme = gempyColorSystem.getColorScheme();

    return (
        <Paper elevation={3} sx={{ p: 2, mt: 2, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                GemPy地质配色方案
            </Typography>
            <Grid container spacing={1}>
                {Object.entries(colorScheme).map(([name, color]) => (
                    <Grid item key={name}>
                        <Chip
                            label={name}
                            sx={{
                                backgroundColor: color,
                                color: '#fff',
                                textShadow: '1px 1px 2px rgba(0,0,0,0.7)',
                                fontWeight: 'medium',
                            }}
                        />
                    </Grid>
                ))}
            </Grid>
        </Paper>
    );
};

export default GemPyColorPreview; 