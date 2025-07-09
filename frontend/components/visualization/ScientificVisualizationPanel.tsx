/**
 * Scientific Visualization Panel - Refactored
 * @description Controls the display of analysis results in the main viewport.
 * @author Deep Excavation Team
 * @date 2025-01-28
 */
import React from 'react';
import {
  Box, Typography, Paper, Divider, Button, Stack, FormControl, InputLabel, Select, MenuItem, Slider, CircularProgress, Alert, SelectChangeEvent
} from '@mui/material';
import { Science as ScienceIcon, Palette as PaletteIcon, Opacity as OpacityIcon } from '@mui/icons-material';
import { useStore } from '../../core/store';
import { visualizationService } from '../../services/visualizationService';

// Define data structures locally to resolve import and type errors
export interface LegendData {
    title: string;
    min: number;
    max: number;
    colorMap: {
        name: string;
        points: [number, number, number, number][];
    };
}

export interface VisualizationData {
    resultId: string;
    vtkJsonUrl: string;
    availableScalars: string[];
    legend: LegendData;
}

// --- Legend Component ---
const Legend: React.FC<{ legendData: LegendData }> = ({ legendData }) => {
    if (!legendData) return null;
    const { title, min, max, colorMap } = legendData;
    const gradientStops = colorMap.points.map((p: any) => `rgb(${p[1]*255}, ${p[2]*255}, ${p[3]*255})`);
    const backgroundGradient = `linear-gradient(to top, ${gradientStops.join(', ')})`;

    return (
        <Stack spacing={1} direction="row" alignItems="center" sx={{ height: 150, p: 1 }}>
            <Box sx={{ width: 20, height: '100%', background: backgroundGradient, borderRadius: '4px' }} />
            <Stack justifyContent="space-between" sx={{ height: '100%' }}>
                <Typography variant="caption">{max.toExponential(2)}</Typography>
                <Typography variant="body2" sx={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>{title}</Typography>
                <Typography variant="caption">{min.toExponential(2)}</Typography>
            </Stack>
        </Stack>
    );
};

// --- Main Panel Component ---
export const ScientificVisualizationPanel: React.FC = () => {
    const { 
        visualizationData, activeScalarName, modelOpacity, isResultLoading,
        setVisualizationData, setActiveScalarName, setModelOpacity, setIsResultLoading,
        viewportApi 
    } = useStore(state => ({
        visualizationData: state.visualizationData,
        activeScalarName: state.activeScalarName,
        modelOpacity: state.modelOpacity,
        isResultLoading: state.isResultLoading,
        setVisualizationData: state.setVisualizationData,
        setActiveScalarName: state.setActiveScalarName,
        setModelOpacity: state.setModelOpacity,
        setIsResultLoading: state.setIsResultLoading,
        viewportApi: state.viewportApi,
    }));

    // Assume a project ID is available, e.g., from URL or a project context
    const currentProjectId = "current_project_id_placeholder"; 

    const handleLoadResults = async () => {
        if (!currentProjectId) return;
        setIsResultLoading(true);
        try {
            // Placeholder: assuming we want the 'latest' or a specific default result
            const resultId = "latest"; 
            const data = await visualizationService.getResult(currentProjectId, resultId);
            setVisualizationData(data);
            if (data.vtkJsonUrl && viewportApi) {
                await viewportApi.loadVtkResults(data.vtkJsonUrl, modelOpacity);
                setActiveScalarName(data.availableScalars[0] || '');
            }
        } catch (error) {
            console.error("Failed to load visualization results:", error);
        } finally {
            setIsResultLoading(false);
        }
    };

    const handleScalarChange = async (event: SelectChangeEvent<string>) => {
        const newScalar = event.target.value;
        if (!visualizationData?.resultId || !newScalar) return;
        
        setIsResultLoading(true);
        setActiveScalarName(newScalar);
        try {
            // Use the applyFilter service call to change the active scalar
            const data = await visualizationService.applyFilter(visualizationData.resultId, [{
                type: 'set_active_scalar',
                parameters: {
                    name: newScalar,
                }
            }]);
            setVisualizationData(data);
            if (data.vtkJsonUrl && viewportApi) {
                await viewportApi.loadVtkResults(data.vtkJsonUrl, modelOpacity);
            }
        } catch (error) {
            console.error(`Failed to load data for scalar ${newScalar}:`, error);
        } finally {
            setIsResultLoading(false);
        }
    };

    const handleOpacityChange = (event: Event, newValue: number | number[]) => {
        setModelOpacity(newValue as number);
    };

    return (
        <Box sx={{ p: 1, height: '100%' }}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'transparent' }}>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><ScienceIcon />结果可视化</Typography>
                <Divider sx={{ my: 1, mb: 2 }} />
            </Paper>

            <Stack spacing={3}>
                <Button variant="contained" onClick={handleLoadResults} disabled={isResultLoading}>
                    {isResultLoading ? <CircularProgress size={24} /> : '加载最新分析结果'}
                </Button>

                {!visualizationData && !isResultLoading && (
                    <Alert severity="info">请先加载分析结果以进行可视化。</Alert>
                )}

                {visualizationData && (
                    <>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={2}>
                                <FormControl fullWidth size="small">
                                    <InputLabel>着色标量</InputLabel>
                                    <Select value={activeScalarName} label="着色标量" onChange={handleScalarChange}>
                                        {visualizationData.availableScalars.map((scalar: string) => (
                                            <MenuItem key={scalar} value={scalar}>{scalar}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Stack spacing={1}>
                                <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><OpacityIcon />模型不透明度</Typography>
                                <Slider value={modelOpacity} onChange={handleOpacityChange} min={0} max={1} step={0.05} />
                            </Stack>
                        </Paper>
                        
                        <Paper variant="outlined" sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                            <Legend legendData={visualizationData.legend} />
                        </Paper>
                    </>
                )}
            </Stack>
        </Box>
    );
}; 