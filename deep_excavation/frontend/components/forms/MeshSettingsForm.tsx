import React from 'react';
import { useStore } from '../../core/store';
import { Stack, TextField, Slider, Typography, Grid, Box } from '@mui/material';

const MeshSettingsForm: React.FC = () => {
    const { meshSettings, updateMeshSettings } = useStore(state => ({
        meshSettings: state.meshSettings,
        updateMeshSettings: state.updateMeshSettings
    }));

    return (
        <Box sx={{ p: 2 }}>
            <Stack spacing={4}>
                <TextField
                    label="全局最大网格尺寸 (m)"
                    type="number"
                    value={meshSettings.global_mesh_size}
                    onChange={(e) => updateMeshSettings({ global_mesh_size: parseFloat(e.target.value) || 10 })}
                    helperText="较大的值会产生较粗糙的网格，计算更快。"
                    fullWidth
                />
                
                <Box>
                    <Typography gutterBottom>
                        局部细化等级 ({meshSettings.refinement_level})
                    </Typography>
                    <Grid container spacing={2} alignItems="center">
                        <Grid item xs>
                            <Slider
                                value={meshSettings.refinement_level}
                                onChange={(_, value) => updateMeshSettings({ refinement_level: value as number })}
                                aria-labelledby="refinement-level-slider"
                                valueLabelDisplay="auto"
                                step={1}
                                marks
                                min={1}
                                max={5}
                            />
                        </Grid>
                    </Grid>
                    <Typography variant="caption" color="text.secondary">
                        较高的等级会在几何细节处产生更精细的网格。
                    </Typography>
                </Box>
            </Stack>
        </Box>
    );
};

export default MeshSettingsForm; 