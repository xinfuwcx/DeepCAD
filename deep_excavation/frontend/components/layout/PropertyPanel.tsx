import React from 'react';
import { useStore } from '../../core/store';
import { Box, Typography, TextField, Stack, Paper, Divider } from '@mui/material';

const PropertyPanel: React.FC = () => {
    const selectedFeature = useStore(state => state.getSelectedFeature());
    const updateFeature = useStore(state => state.updateFeature);

    if (!selectedFeature) {
        return (
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent', textAlign: 'center' }}>
                <Typography color="text.secondary">
                    在左侧选择一个特征以编辑其属性
                </Typography>
            </Paper>
        );
    }

    const handlePropertyChange = (path: string, value: any) => {
        const keys = path.split('.');
        
        // This is a simplified deep-setter. For a more complex app, a library like lodash.set would be safer.
        const newParameters = JSON.parse(JSON.stringify(selectedFeature.parameters));
        
        let current = newParameters;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        
        // Try to parse numbers, but fall back to the original string if it fails
        const numericValue = parseFloat(value);
        current[keys[keys.length - 1]] = isNaN(numericValue) ? value : numericValue;

        updateFeature(selectedFeature.id, newParameters);
    };

    const renderPropertyFields = (params: any, parentKey = '') => {
        if (typeof params !== 'object' || params === null) return null;

        return Object.entries(params).map(([key, value]) => {
            const currentPath = parentKey ? `${parentKey}.${key}` : key;

            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                return (
                    <Box key={currentPath} sx={{ pl: parentKey ? 2 : 0, mb: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize', display: 'block', mb: 1 }}>
                            {key}
                        </Typography>
                        <Divider sx={{mb: 1}}/>
                        {renderPropertyFields(value, currentPath)}
                    </Box>
                );
            }
            
            // Do not render arrays or other complex objects for now
            if (Array.isArray(value)) {
                return <Typography key={currentPath} variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{key}: [Array Data]</Typography>;
            }

            return (
                <TextField
                    key={currentPath}
                    label={key.charAt(0).toUpperCase() + key.slice(1)}
                    defaultValue={value}
                    onBlur={(e) => handlePropertyChange(currentPath, e.target.value)}
                    variant="outlined"
                    size="small"
                    fullWidth
                    type={typeof value === 'number' ? 'number' : 'text'}
                    sx={{ mb: 1.5 }}
                />
            );
        });
    };

    return (
        <Paper elevation={0} sx={{ p: 1, bgcolor: 'transparent' }}>
            <Stack spacing={1.5}>
                <TextField 
                    label="Name"
                    defaultValue={selectedFeature.name}
                    variant="outlined"
                    size="small"
                    fullWidth
                    // Add onBlur handler to update name if needed
                />
                 <TextField 
                    label="Type"
                    value={selectedFeature.type}
                    InputProps={{ readOnly: true }}
                    variant="outlined"
                    size="small"
                    fullWidth
                />
                <Divider sx={{my:1}} />
                <Typography variant="subtitle2" color="text.secondary">参数</Typography>
                {renderPropertyFields(selectedFeature.parameters)}
            </Stack>
        </Paper>
    );
};

export default PropertyPanel;
