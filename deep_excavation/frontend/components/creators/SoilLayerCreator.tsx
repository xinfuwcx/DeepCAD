import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Slider,
  Grid,
  Paper,
  Divider,
  InputAdornment,
  FormHelperText,
  Stack,
  Tooltip,
  IconButton
} from '@mui/material';
import TerrainIcon from '@mui/icons-material/Terrain';
import InfoIcon from '@mui/icons-material/Info';
import ColorLensIcon from '@mui/icons-material/ColorLens';
import { SoilParams } from './CreatorInterface';
import { useStore } from '../../core/store';
import { drawSoilLayerDiagram } from '../shared/diagramHelpers';

const SOIL_TYPES = [
  { value: 'clay', label: '粘土', color: '#8B4513', density: 1800, cohesion: 20, frictionAngle: 18, elasticModulus: 10000, poissonRatio: 0.35 },
  { value: 'sand', label: '砂土', color: '#D2B48C', density: 1900, cohesion: 0, frictionAngle: 30, elasticModulus: 30000, poissonRatio: 0.3 },
  { value: 'silt', label: '粉土', color: '#A0522D', density: 1850, cohesion: 10, frictionAngle: 25, elasticModulus: 20000, poissonRatio: 0.32 },
  { value: 'gravel', label: '砾石', color: '#808080', density: 2000, cohesion: 0, frictionAngle: 35, elasticModulus: 50000, poissonRatio: 0.25 },
  { value: 'rock', label: '岩石', color: '#696969', density: 2500, cohesion: 100, frictionAngle: 40, elasticModulus: 500000, poissonRatio: 0.2 },
  { value: 'fill', label: '填土', color: '#A9A9A9', density: 1700, cohesion: 5, frictionAngle: 20, elasticModulus: 8000, poissonRatio: 0.33 },
  { value: 'custom', label: '自定义', color: '#4682B4', density: 2000, cohesion: 10, frictionAngle: 25, elasticModulus: 20000, poissonRatio: 0.3 },
];

const SoilLayerCreator: React.FC = () => {
  const [params, setParams] = useState<SoilParams>({
    soilType: 'clay',
    position: { x: 0, y: 0, z: -5 },
    scale: { x: 100, y: 100, z: 5 },
    color: SOIL_TYPES[0].color,
    density: SOIL_TYPES[0].density,
    cohesion: SOIL_TYPES[0].cohesion,
    frictionAngle: SOIL_TYPES[0].frictionAngle,
    elasticModulus: SOIL_TYPES[0].elasticModulus,
    poissonRatio: SOIL_TYPES[0].poissonRatio,
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isCreating, setIsCreating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const addFeature = useStore(state => state.addFeature);
  
  const handleChange = (field: string, value: any) => {
    if (field === 'soilType' && value !== 'custom') {
      const selectedSoil = SOIL_TYPES.find(soil => soil.value === value);
      if (selectedSoil) {
        setParams({
          ...params,
          soilType: value,
          color: selectedSoil.color,
          density: selectedSoil.density,
          cohesion: selectedSoil.cohesion,
          frictionAngle: selectedSoil.frictionAngle,
          elasticModulus: selectedSoil.elasticModulus,
          poissonRatio: selectedSoil.poissonRatio,
        });
      }
    } else if (field.includes('.')) {
      // 处理嵌套属性，如 position.x
      const [parent, child] = field.split('.');
      setParams({
        ...params,
        [parent]: {
          ...params[parent as keyof SoilParams],
          [child]: value
        }
      });
    } else {
      setParams({
        ...params,
        [field]: value
      });
    }
    
    // 清除错误
    if (errors[field]) {
      setErrors({
        ...errors,
        [field]: ''
      });
    }
  };
  
  const validate = (): boolean => {
    const newErrors: {[key: string]: string} = {};
    
    // 验证土层厚度
    if (!params.scale || params.scale.z <= 0) {
      newErrors['scale.z'] = '土层厚度必须大于0';
    }
    
    // 验证密度
    if (!params.density || params.density <= 0) {
      newErrors['density'] = '密度必须大于0';
    }
    
    // 验证弹性模量
    if (!params.elasticModulus || params.elasticModulus <= 0) {
      newErrors['elasticModulus'] = '弹性模量必须大于0';
    }
    
    // 验证泊松比
    if (!params.poissonRatio || params.poissonRatio <= 0 || params.poissonRatio >= 0.5) {
      newErrors['poissonRatio'] = '泊松比必须在0-0.5之间';
    }
    
    // 验证内摩擦角
    if (params.frictionAngle === undefined || params.frictionAngle < 0 || params.frictionAngle > 90) {
      newErrors['frictionAngle'] = '内摩擦角必须在0-90度之间';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleCreateSoilLayer = async () => {
    if (!validate()) return;
    
    setIsCreating(true);
    
    try {
      // 创建土层特征
      const feature = {
        id: `soil-layer-${Date.now()}`,
        type: 'SoilLayer',
        parameters: {
          ...params,
          name: `${SOIL_TYPES.find(soil => soil.value === params.soilType)?.label || '自定义土层'} (${params.position?.z}m ~ ${(params.position?.z || 0) - (params.scale?.z || 0)}m)`,
        }
      };
      
      // 添加到模型中
      addFeature(feature);
      
      // 重置为默认值，但保留位置信息以便连续创建
      const position = params.position;
      const newZ = (position?.z || 0) - (params.scale?.z || 0);
      
      setParams({
        ...params,
        position: { ...(position || { x: 0, y: 0 }), z: newZ },
      });
      
    } catch (error) {
      console.error('创建土层失败:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  // 绘制2D示意图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    drawSoilLayerDiagram(ctx, canvas, {
      thickness: params.scale?.z || 5,
      width: params.scale?.x || 100,
      color: params.color || '#8B4513',
    });
  }, [params]);
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TerrainIcon />
        土层参数设置
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={2}>
        {/* 土层类型选择 */}
        <Grid item xs={12}>
          <FormControl fullWidth>
            <InputLabel>土层类型</InputLabel>
            <Select
              value={params.soilType}
              label="土层类型"
              onChange={(e) => handleChange('soilType', e.target.value)}
            >
              {SOIL_TYPES.map((soil) => (
                <MenuItem key={soil.value} value={soil.value} sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      bgcolor: soil.color, 
                      mr: 1, 
                      borderRadius: '2px' 
                    }} 
                  />
                  {soil.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        
        {/* 土层颜色 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="颜色"
            value={params.color}
            onChange={(e) => handleChange('color', e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Box 
                    sx={{ 
                      width: 16, 
                      height: 16, 
                      bgcolor: params.color, 
                      borderRadius: '2px' 
                    }} 
                  />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        
        {/* 土层厚度 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="厚度 (m)"
            type="number"
            value={params.scale?.z || 0}
            onChange={(e) => handleChange('scale.z', parseFloat(e.target.value))}
            error={!!errors['scale.z']}
            helperText={errors['scale.z']}
            InputProps={{
              inputProps: { min: 0.1, step: 0.1 }
            }}
          />
        </Grid>
        
        {/* 土层顶面高程 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="顶面高程 (m)"
            type="number"
            value={params.position?.z || 0}
            onChange={(e) => handleChange('position.z', parseFloat(e.target.value))}
            InputProps={{
              inputProps: { step: 0.1 }
            }}
          />
        </Grid>
        
        {/* 土层底面高程（只读） */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="底面高程 (m)"
            type="number"
            value={(params.position?.z || 0) - (params.scale?.z || 0)}
            InputProps={{
              readOnly: true,
              inputProps: { step: 0.1 }
            }}
          />
        </Grid>
        
        <Grid item xs={12}>
          <Divider sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary">
              力学参数
            </Typography>
          </Divider>
        </Grid>
        
        {/* 密度 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="密度 (kg/m³)"
            type="number"
            value={params.density}
            onChange={(e) => handleChange('density', parseFloat(e.target.value))}
            error={!!errors['density']}
            helperText={errors['density']}
            InputProps={{
              inputProps: { min: 0, step: 10 }
            }}
          />
        </Grid>
        
        {/* 弹性模量 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="弹性模量 (kPa)"
            type="number"
            value={params.elasticModulus}
            onChange={(e) => handleChange('elasticModulus', parseFloat(e.target.value))}
            error={!!errors['elasticModulus']}
            helperText={errors['elasticModulus']}
            InputProps={{
              inputProps: { min: 0, step: 1000 }
            }}
          />
        </Grid>
        
        {/* 泊松比 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="泊松比"
            type="number"
            value={params.poissonRatio}
            onChange={(e) => handleChange('poissonRatio', parseFloat(e.target.value))}
            error={!!errors['poissonRatio']}
            helperText={errors['poissonRatio']}
            InputProps={{
              inputProps: { min: 0, max: 0.5, step: 0.01 }
            }}
          />
        </Grid>
        
        {/* 粘聚力 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="粘聚力 (kPa)"
            type="number"
            value={params.cohesion}
            onChange={(e) => handleChange('cohesion', parseFloat(e.target.value))}
            InputProps={{
              inputProps: { min: 0, step: 1 }
            }}
          />
        </Grid>
        
        {/* 内摩擦角 */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="内摩擦角 (°)"
            type="number"
            value={params.frictionAngle}
            onChange={(e) => handleChange('frictionAngle', parseFloat(e.target.value))}
            error={!!errors['frictionAngle']}
            helperText={errors['frictionAngle']}
            InputProps={{
              inputProps: { min: 0, max: 90, step: 1 }
            }}
          />
        </Grid>
      </Grid>
      
      <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
        <Button 
          variant="contained" 
          color="primary" 
          onClick={handleCreateSoilLayer}
          disabled={isCreating}
        >
          {isCreating ? '创建中...' : '创建土层'}
        </Button>
      </Box>
      
      {/* 2D示意图 */}
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
        <canvas ref={canvasRef} width={300} height={200} style={{ border: '1px solid #ccc' }} />
      </Box>
    </Box>
  );
};

export default SoilLayerCreator; 