import React from 'react';
import { Box, Typography, Chip, Paper, Grid } from '@mui/material';
import { LITHOLOGY_COLORS, SHANGHAI_SOIL_COLORS } from '../../core/geologicalColorSchemes';

interface GemPyColorPreviewProps {
    colorScheme?: Record<string, string>;
}

const GemPyColorPreview: React.FC<GemPyColorPreviewProps> = ({ colorScheme }) => {
    // 如果没有提供colorScheme，则使用默认的岩性颜色方案
    const colors = colorScheme || LITHOLOGY_COLORS;

    return (
        <Paper elevation={3} sx={{ p: 2, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'bold' }}>
                地质配色方案
            </Typography>
            <Grid container spacing={1}>
                {Object.entries(colors).map(([name, color]) => (
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