import React from 'react';
import {
    Box,
    Typography,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Paper,
    Divider,
    Switch,
    FormControlLabel,
    Slider,
    Grid,
} from '@mui/material';
import { useStore } from '../../core/store';

const AnalysisSettingsForm: React.FC = () => {
    const { analysisSettings, updateAnalysisSettings } = useStore(state => ({
        analysisSettings: state.analysisSettings,
        updateAnalysisSettings: state.updateAnalysisSettings,
    }));

    return (
        <Box>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium' }}>
                分析设置
            </Typography>
            
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    基本分析参数
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControl fullWidth size="small">
                        <InputLabel>分析类型</InputLabel>
                        <Select
                            value={analysisSettings.analysis_type}
                            onChange={(e) => updateAnalysisSettings({
                                analysis_type: e.target.value as 'static' | 'staged_construction'
                            })}
                            label="分析类型"
                        >
                            <MenuItem value="static">静力分析</MenuItem>
                            <MenuItem value="staged_construction">分步施工分析</MenuItem>
                        </Select>
                    </FormControl>

                    <TextField
                        label="分析步数"
                        type="number"
                        size="small"
                        value={analysisSettings.num_steps}
                        onChange={(e) => updateAnalysisSettings({
                            num_steps: parseInt(e.target.value)
                        })}
                        fullWidth
                        inputProps={{ min: 1, max: 50 }}
                        helperText="分步施工分析的步数"
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    求解器设置
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <FormControlLabel
                        control={
                            <Switch 
                                defaultChecked 
                                size="small"
                            />
                        }
                        label="启用非线性分析"
                    />
                    
                    <FormControlLabel
                        control={
                            <Switch 
                                defaultChecked={analysisSettings.analysis_type === 'staged_construction'} 
                                size="small"
                            />
                        }
                        label="考虑几何非线性"
                    />

                    <Box>
                        <Typography variant="caption" gutterBottom>
                            收敛容差: 1e-6
                        </Typography>
                        <Slider
                            defaultValue={6}
                            min={3}
                            max={12}
                            step={1}
                            marks
                            valueLabelDisplay="auto"
                            valueLabelFormat={(value) => `1e-${value}`}
                            size="small"
                        />
                    </Box>

                    <TextField
                        label="最大迭代次数"
                        type="number"
                        size="small"
                        defaultValue={100}
                        fullWidth
                        inputProps={{ min: 10, max: 1000 }}
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    边界条件
                </Typography>
                
                <Grid container spacing={2}>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Switch defaultChecked size="small" />}
                            label="底面固定"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Switch defaultChecked size="small" />}
                            label="侧面约束"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Switch size="small" />}
                            label="自重载荷"
                        />
                    </Grid>
                    <Grid item xs={6}>
                        <FormControlLabel
                            control={<Switch size="small" />}
                            label="水压力"
                        />
                    </Grid>
                </Grid>

                <Divider sx={{ my: 2 }} />

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        label="地下水位 (m)"
                        type="number"
                        size="small"
                        defaultValue={-5}
                        fullWidth
                        helperText="相对于地面标高"
                    />
                    
                    <TextField
                        label="地面超载 (kPa)"
                        type="number"
                        size="small"
                        defaultValue={20}
                        fullWidth
                    />
                </Box>
            </Paper>

            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                    输出设置
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    <FormControlLabel
                        control={<Switch defaultChecked size="small" />}
                        label="位移结果"
                    />
                    <FormControlLabel
                        control={<Switch defaultChecked size="small" />}
                        label="应力结果"
                    />
                    <FormControlLabel
                        control={<Switch defaultChecked size="small" />}
                        label="应变结果"
                    />
                    <FormControlLabel
                        control={<Switch size="small" />}
                        label="塑性区域"
                    />
                    <FormControlLabel
                        control={<Switch size="small" />}
                        label="渗流结果"
                    />
                </Box>
            </Paper>
        </Box>
    );
};

export default AnalysisSettingsForm; 