import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Slider,
    FormControlLabel,
    Switch,
    Paper,
    Stack,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    CropFree,
    ViewInAr
} from '@mui/icons-material';
import * as THREE from 'three';

interface CrossSectionControlsProps {
    bounds: {
        minX: number;
        maxX: number;
        minY: number;
        maxY: number;
        minZ: number;
        maxZ: number;
    };
    onCrossSectionChange: (planes: {
        x: { enabled: boolean; position: number };
        y: { enabled: boolean; position: number };
        z: { enabled: boolean; position: number };
    }) => void;
}

const CrossSectionControls: React.FC<CrossSectionControlsProps> = ({
    bounds,
    onCrossSectionChange
}) => {
    const [xSection, setXSection] = useState({
        enabled: false,
        position: (bounds.minX + bounds.maxX) / 2
    });
    
    const [ySection, setYSection] = useState({
        enabled: false,
        position: (bounds.minY + bounds.maxY) / 2
    });
    
    const [zSection, setZSection] = useState({
        enabled: false,
        position: (bounds.minZ + bounds.maxZ) / 2
    });

    // 通知父组件剖切平面变化
    useEffect(() => {
        onCrossSectionChange({
            x: xSection,
            y: ySection,
            z: zSection
        });
    }, [xSection, ySection, zSection, onCrossSectionChange]);

    const handleXToggle = (enabled: boolean) => {
        setXSection(prev => ({ ...prev, enabled }));
    };

    const handleYToggle = (enabled: boolean) => {
        setYSection(prev => ({ ...prev, enabled }));
    };

    const handleZToggle = (enabled: boolean) => {
        setZSection(prev => ({ ...prev, enabled }));
    };

    const handleXPosition = (value: number) => {
        setXSection(prev => ({ ...prev, position: value }));
    };

    const handleYPosition = (value: number) => {
        setYSection(prev => ({ ...prev, position: value }));
    };

    const handleZPosition = (value: number) => {
        setZSection(prev => ({ ...prev, position: value }));
    };

    const resetAll = () => {
        setXSection({ enabled: false, position: (bounds.minX + bounds.maxX) / 2 });
        setYSection({ enabled: false, position: (bounds.minY + bounds.maxY) / 2 });
        setZSection({ enabled: false, position: (bounds.minZ + bounds.maxZ) / 2 });
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, minWidth: 280 }}>
            <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ViewInAr />
                        剖切面控制
                    </Typography>
                    <Tooltip title="重置所有剖切面">
                        <IconButton size="small" onClick={resetAll}>
                            <CropFree />
                        </IconButton>
                    </Tooltip>
                </Box>

                {/* X方向剖切 - 东西向 */}
                <Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={xSection.enabled}
                                onChange={(e) => handleXToggle(e.target.checked)}
                                color="error"
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">X轴剖切 (东西向)</Typography>
                                <Chip 
                                    label={`${xSection.position.toFixed(1)}m`} 
                                    size="small" 
                                    color="error"
                                    variant={xSection.enabled ? "filled" : "outlined"}
                                />
                            </Box>
                        }
                    />
                    {xSection.enabled && (
                        <Slider
                            value={xSection.position}
                            min={bounds.minX}
                            max={bounds.maxX}
                            step={(bounds.maxX - bounds.minX) / 100}
                            onChange={(_, value) => handleXPosition(value as number)}
                            color="error"
                            sx={{ mt: 1 }}
                            marks={[
                                { value: bounds.minX, label: `${bounds.minX.toFixed(0)}` },
                                { value: bounds.maxX, label: `${bounds.maxX.toFixed(0)}` }
                            ]}
                        />
                    )}
                </Box>

                {/* Y方向剖切 - 南北向 */}
                <Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={ySection.enabled}
                                onChange={(e) => handleYToggle(e.target.checked)}
                                color="success"
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">Y轴剖切 (南北向)</Typography>
                                <Chip 
                                    label={`${ySection.position.toFixed(1)}m`} 
                                    size="small" 
                                    color="success"
                                    variant={ySection.enabled ? "filled" : "outlined"}
                                />
                            </Box>
                        }
                    />
                    {ySection.enabled && (
                        <Slider
                            value={ySection.position}
                            min={bounds.minY}
                            max={bounds.maxY}
                            step={(bounds.maxY - bounds.minY) / 100}
                            onChange={(_, value) => handleYPosition(value as number)}
                            color="success"
                            sx={{ mt: 1 }}
                            marks={[
                                { value: bounds.minY, label: `${bounds.minY.toFixed(0)}` },
                                { value: bounds.maxY, label: `${bounds.maxY.toFixed(0)}` }
                            ]}
                        />
                    )}
                </Box>

                {/* Z方向剖切 - 垂直向 */}
                <Box>
                    <FormControlLabel
                        control={
                            <Switch
                                checked={zSection.enabled}
                                onChange={(e) => handleZToggle(e.target.checked)}
                                color="primary"
                            />
                        }
                        label={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="body2">Z轴剖切 (垂直向)</Typography>
                                <Chip 
                                    label={`${zSection.position.toFixed(1)}m`} 
                                    size="small" 
                                    color="primary"
                                    variant={zSection.enabled ? "filled" : "outlined"}
                                />
                            </Box>
                        }
                    />
                    {zSection.enabled && (
                        <Slider
                            value={zSection.position}
                            min={bounds.minZ}
                            max={bounds.maxZ}
                            step={(bounds.maxZ - bounds.minZ) / 100}
                            onChange={(_, value) => handleZPosition(value as number)}
                            color="primary"
                            sx={{ mt: 1 }}
                            marks={[
                                { value: bounds.minZ, label: `${bounds.minZ.toFixed(0)}` },
                                { value: bounds.maxZ, label: `${bounds.maxZ.toFixed(0)}` }
                            ]}
                        />
                    )}
                </Box>

                {/* 状态指示 */}
                <Box sx={{ pt: 1, borderTop: 1, borderColor: 'divider' }}>
                    <Typography variant="caption" color="text.secondary">
                        {[xSection.enabled, ySection.enabled, zSection.enabled].filter(Boolean).length > 0
                            ? `已激活 ${[xSection.enabled, ySection.enabled, zSection.enabled].filter(Boolean).length} 个剖切面`
                            : '未激活剖切面'
                        }
                    </Typography>
                </Box>
            </Stack>
        </Paper>
    );
};

export default CrossSectionControls; 