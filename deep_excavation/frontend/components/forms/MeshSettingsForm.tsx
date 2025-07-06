import React, { useState } from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  TextField, 
  FormControl, 
  FormLabel, 
  RadioGroup, 
  Radio, 
  FormControlLabel, 
  Switch,
  Button,
  Grid,
  Divider,
  Tooltip,
  IconButton
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

export interface MeshSettings {
  // 全局网格参数
  global_mesh_size: number;
  min_mesh_size: number;
  max_mesh_size: number;
  mesh_growth_rate: number;
  
  // 局部网格参数
  refinement_regions: {
    enabled: boolean;
    excavation_boundary_size: number;
    diaphragm_wall_size: number;
    strut_size: number;
    anchor_size: number;
  };
  
  // 网格质量参数
  quality_settings: {
    optimize_steps: number;
    min_quality: number;
    smooth_iterations: number;
    recombination: boolean;
  };
  
  // 高级设置
  advanced_settings: {
    algorithm: 'delaunay' | 'frontal' | 'hxt';
    dimension: '2D' | '3D';
    use_occ: boolean;
    parallel_meshing: boolean;
    thread_count: number;
  };
}

const defaultSettings: MeshSettings = {
  global_mesh_size: 5.0,
  min_mesh_size: 0.5,
  max_mesh_size: 20.0,
  mesh_growth_rate: 1.3,
  
  refinement_regions: {
    enabled: true,
    excavation_boundary_size: 1.0,
    diaphragm_wall_size: 0.5,
    strut_size: 0.8,
    anchor_size: 0.8,
  },
  
  quality_settings: {
    optimize_steps: 10,
    min_quality: 0.3,
    smooth_iterations: 5,
    recombination: true,
  },
  
  advanced_settings: {
    algorithm: 'delaunay',
    dimension: '3D',
    use_occ: true,
    parallel_meshing: true,
    thread_count: 4,
  }
};

interface MeshSettingsFormProps {
  initialSettings?: Partial<MeshSettings>;
  onSettingsChange?: (settings: MeshSettings) => void;
  onApply?: (settings: MeshSettings) => void;
}

const MeshSettingsForm: React.FC<MeshSettingsFormProps> = ({
  initialSettings = {},
  onSettingsChange,
  onApply,
}) => {
  const [settings, setSettings] = useState<MeshSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  
  const handleChange = (path: string, value: any) => {
    const pathArray = path.split('.');
    const newSettings = { ...settings };
    
    let current: any = newSettings;
    for (let i = 0; i < pathArray.length - 1; i++) {
      current = current[pathArray[i]];
    }
    
    current[pathArray[pathArray.length - 1]] = value;
    
    setSettings(newSettings);
    if (onSettingsChange) {
      onSettingsChange(newSettings);
    }
  };
  
  const handleApply = () => {
    if (onApply) {
      onApply(settings);
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        网格参数设置
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      {/* 全局网格参数 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          全局网格参数
          <Tooltip title="控制整个计算域的网格尺寸">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>全局网格尺寸 (m)</Typography>
              <Slider
                value={settings.global_mesh_size}
                min={0.1}
                max={20}
                step={0.1}
                onChange={(_, value) => handleChange('global_mesh_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.global_mesh_size}
                onChange={(e) => handleChange('global_mesh_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>最小网格尺寸 (m)</Typography>
              <Slider
                value={settings.min_mesh_size}
                min={0.01}
                max={5}
                step={0.01}
                onChange={(_, value) => handleChange('min_mesh_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.min_mesh_size}
                onChange={(e) => handleChange('min_mesh_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.01 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>最大网格尺寸 (m)</Typography>
              <Slider
                value={settings.max_mesh_size}
                min={1}
                max={50}
                step={0.5}
                onChange={(_, value) => handleChange('max_mesh_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.max_mesh_size}
                onChange={(e) => handleChange('max_mesh_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.5 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>网格增长率</Typography>
              <Slider
                value={settings.mesh_growth_rate}
                min={1}
                max={2}
                step={0.05}
                onChange={(_, value) => handleChange('mesh_growth_rate', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.mesh_growth_rate}
                onChange={(e) => handleChange('mesh_growth_rate', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.05 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* 局部网格参数 */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle1">
            局部网格细化
          </Typography>
          <Tooltip title="在关键区域进行网格细化，提高计算精度">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ flexGrow: 1 }} />
          <FormControlLabel
            control={
              <Switch
                checked={settings.refinement_regions.enabled}
                onChange={(e) => handleChange('refinement_regions.enabled', e.target.checked)}
              />
            }
            label="启用"
          />
        </Box>
        
        <Grid container spacing={2} sx={{ opacity: settings.refinement_regions.enabled ? 1 : 0.5, pointerEvents: settings.refinement_regions.enabled ? 'auto' : 'none' }}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>开挖边界网格尺寸 (m)</Typography>
              <Slider
                value={settings.refinement_regions.excavation_boundary_size}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(_, value) => handleChange('refinement_regions.excavation_boundary_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.refinement_regions.excavation_boundary_size}
                onChange={(e) => handleChange('refinement_regions.excavation_boundary_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>地下连续墙网格尺寸 (m)</Typography>
              <Slider
                value={settings.refinement_regions.diaphragm_wall_size}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(_, value) => handleChange('refinement_regions.diaphragm_wall_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.refinement_regions.diaphragm_wall_size}
                onChange={(e) => handleChange('refinement_regions.diaphragm_wall_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>支撑网格尺寸 (m)</Typography>
              <Slider
                value={settings.refinement_regions.strut_size}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(_, value) => handleChange('refinement_regions.strut_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.refinement_regions.strut_size}
                onChange={(e) => handleChange('refinement_regions.strut_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>锚杆网格尺寸 (m)</Typography>
              <Slider
                value={settings.refinement_regions.anchor_size}
                min={0.1}
                max={5}
                step={0.1}
                onChange={(_, value) => handleChange('refinement_regions.anchor_size', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.refinement_regions.anchor_size}
                onChange={(e) => handleChange('refinement_regions.anchor_size', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.1 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* 网格质量参数 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          网格质量参数
          <Tooltip title="控制网格的质量和优化过程">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>优化步数</Typography>
              <Slider
                value={settings.quality_settings.optimize_steps}
                min={0}
                max={50}
                step={1}
                onChange={(_, value) => handleChange('quality_settings.optimize_steps', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.quality_settings.optimize_steps}
                onChange={(e) => handleChange('quality_settings.optimize_steps', parseInt(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>最小质量因子</Typography>
              <Slider
                value={settings.quality_settings.min_quality}
                min={0}
                max={1}
                step={0.01}
                onChange={(_, value) => handleChange('quality_settings.min_quality', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.quality_settings.min_quality}
                onChange={(e) => handleChange('quality_settings.min_quality', parseFloat(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 0.01 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>平滑迭代次数</Typography>
              <Slider
                value={settings.quality_settings.smooth_iterations}
                min={0}
                max={20}
                step={1}
                onChange={(_, value) => handleChange('quality_settings.smooth_iterations', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.quality_settings.smooth_iterations}
                onChange={(e) => handleChange('quality_settings.smooth_iterations', parseInt(e.target.value) || 0)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 1 }}
              />
            </Box>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.quality_settings.recombination}
                  onChange={(e) => handleChange('quality_settings.recombination', e.target.checked)}
                />
              }
              label="启用网格重组"
            />
            <Tooltip title="将三角形网格重组为四边形网格，可提高计算效率">
              <IconButton size="small">
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
      </Box>
      
      <Divider sx={{ my: 2 }} />
      
      {/* 高级设置 */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
          高级设置
          <Tooltip title="高级网格生成参数，仅在特殊情况下调整">
            <IconButton size="small">
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Typography>
        
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">网格算法</FormLabel>
              <RadioGroup
                value={settings.advanced_settings.algorithm}
                onChange={(e) => handleChange('advanced_settings.algorithm', e.target.value)}
              >
                <FormControlLabel value="delaunay" control={<Radio />} label="Delaunay (默认)" />
                <FormControlLabel value="frontal" control={<Radio />} label="Frontal (前沿推进)" />
                <FormControlLabel value="hxt" control={<Radio />} label="HXT (高性能)" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} sm={6}>
            <FormControl component="fieldset">
              <FormLabel component="legend">维度</FormLabel>
              <RadioGroup
                value={settings.advanced_settings.dimension}
                onChange={(e) => handleChange('advanced_settings.dimension', e.target.value)}
              >
                <FormControlLabel value="2D" control={<Radio />} label="2D (平面应变)" />
                <FormControlLabel value="3D" control={<Radio />} label="3D (三维)" />
              </RadioGroup>
            </FormControl>
          </Grid>
          
          <Grid item xs={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={settings.advanced_settings.use_occ}
                  onChange={(e) => handleChange('advanced_settings.use_occ', e.target.checked)}
                />
              }
              label="使用OpenCASCADE几何内核"
            />
            <Tooltip title="使用OpenCASCADE几何内核可以更精确地表示曲面">
              <IconButton size="small">
                <HelpOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Grid>
          
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.advanced_settings.parallel_meshing}
                    onChange={(e) => handleChange('advanced_settings.parallel_meshing', e.target.checked)}
                  />
                }
                label="启用并行网格生成"
              />
              <Tooltip title="使用多线程加速网格生成过程">
                <IconButton size="small">
                  <HelpOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
          
          <Grid item xs={12} sx={{ opacity: settings.advanced_settings.parallel_meshing ? 1 : 0.5, pointerEvents: settings.advanced_settings.parallel_meshing ? 'auto' : 'none' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 180 }}>线程数</Typography>
              <Slider
                value={settings.advanced_settings.thread_count}
                min={1}
                max={16}
                step={1}
                onChange={(_, value) => handleChange('advanced_settings.thread_count', value as number)}
                sx={{ mx: 2, flexGrow: 1 }}
              />
              <TextField
                value={settings.advanced_settings.thread_count}
                onChange={(e) => handleChange('advanced_settings.thread_count', parseInt(e.target.value) || 1)}
                type="number"
                size="small"
                sx={{ width: 80 }}
                inputProps={{ step: 1, min: 1 }}
              />
            </Box>
          </Grid>
        </Grid>
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
        <Button variant="contained" color="primary" onClick={handleApply}>
          应用设置
        </Button>
      </Box>
    </Box>
  );
};

export default MeshSettingsForm; 