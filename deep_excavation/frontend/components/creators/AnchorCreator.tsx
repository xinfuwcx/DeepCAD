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
  Grid,
  Divider,
  Paper,
  Slider,
  FormHelperText,
  InputAdornment
} from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';
import { v4 as uuidv4 } from 'uuid';

// 锚杆参数接口
interface AnchorParams {
  anchorType: 'prestressed' | 'passive' | 'soil_nail';
  length: number;
  diameter: number;
  angle: number;
  spacing: number;
  prestressForce?: number;
  freeLength?: number;
  bondLength?: number;
  position: {
    x: number;
    y: number;
    z: number;
  };
  color?: string;
}

// 预设的锚杆材料
const ANCHOR_MATERIALS = [
  { value: 'steel_strand', label: '钢绞线', color: '#708090', elasticModulus: 195000, yieldStrength: 1860 },
  { value: 'steel_bar', label: '钢筋', color: '#A9A9A9', elasticModulus: 210000, yieldStrength: 400 },
  { value: 'fiberglass', label: '玻璃纤维', color: '#FFFFE0', elasticModulus: 40000, yieldStrength: 600 },
  { value: 'custom', label: '自定义', color: '#4682B4', elasticModulus: 200000, yieldStrength: 500 },
];

// 2D示意图绘制函数
const drawAnchorSection = (
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  params: AnchorParams
) => {
  const { width, height } = canvas;
  
  // 清除画布
  ctx.clearRect(0, 0, width, height);
  
  // 绘制背景
  ctx.fillStyle = '#f5f5f5';
  ctx.fillRect(0, 0, width, height);
  
  // 设置比例尺
  const scale = Math.min(width / 100, height / 100);
  const centerX = width / 2;
  const centerY = height / 2;
  
  // 绘制地面
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 40 * scale, centerY - 30 * scale);
  ctx.lineTo(centerX + 40 * scale, centerY - 30 * scale);
  ctx.stroke();
  
  // 绘制基坑
  ctx.beginPath();
  ctx.moveTo(centerX - 30 * scale, centerY - 30 * scale);
  ctx.lineTo(centerX - 30 * scale, centerY + 20 * scale);
  ctx.lineTo(centerX + 30 * scale, centerY + 20 * scale);
  ctx.lineTo(centerX + 30 * scale, centerY - 30 * scale);
  ctx.stroke();
  
  // 绘制锚杆
  const anchorLength = params.length * scale * 0.5;
  const anchorAngle = params.angle * Math.PI / 180;
  const anchorDiameter = params.diameter * scale * 0.2;
  
  // 锚杆起点
  const anchorStartX = centerX - 30 * scale;
  const anchorStartY = centerY - 10 * scale;
  
  // 锚杆终点
  const anchorEndX = anchorStartX - Math.cos(anchorAngle) * anchorLength;
  const anchorEndY = anchorStartY - Math.sin(anchorAngle) * anchorLength;
  
  // 绘制锚杆主体
  ctx.strokeStyle = params.color || '#708090';
  ctx.lineWidth = anchorDiameter;
  ctx.beginPath();
  ctx.moveTo(anchorStartX, anchorStartY);
  ctx.lineTo(anchorEndX, anchorEndY);
  ctx.stroke();
  
  // 如果是预应力锚杆，绘制自由段和锚固段
  if (params.anchorType === 'prestressed' && params.freeLength && params.bondLength) {
    const freeLengthScale = params.freeLength * scale * 0.5;
    const freeEndX = anchorStartX - Math.cos(anchorAngle) * freeLengthScale;
    const freeEndY = anchorStartY - Math.sin(anchorAngle) * freeLengthScale;
    
    // 自由段
    ctx.strokeStyle = '#4682B4';
    ctx.beginPath();
    ctx.moveTo(anchorStartX, anchorStartY);
    ctx.lineTo(freeEndX, freeEndY);
    ctx.stroke();
    
    // 锚固段
    ctx.strokeStyle = '#A52A2A';
    ctx.beginPath();
    ctx.moveTo(freeEndX, freeEndY);
    ctx.lineTo(anchorEndX, anchorEndY);
    ctx.stroke();
    
    // 绘制标注
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    
    // 自由段标注
    const freeLabelX = (anchorStartX + freeEndX) / 2;
    const freeLabelY = (anchorStartY + freeEndY) / 2 - 10;
    ctx.fillText(`自由段: ${params.freeLength}m`, freeLabelX, freeLabelY);
    
    // 锚固段标注
    const bondLabelX = (freeEndX + anchorEndX) / 2;
    const bondLabelY = (freeEndY + anchorEndY) / 2 - 10;
    ctx.fillText(`锚固段: ${params.bondLength}m`, bondLabelX, bondLabelY);
  }
  
  // 绘制标注
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  
  // 长度标注
  ctx.fillText(`总长: ${params.length}m`, centerX, centerY + 40 * scale);
  
  // 角度标注
  ctx.fillText(`倾角: ${params.angle}°`, anchorEndX - 20, anchorEndY - 20);
  
  // 间距标注
  ctx.fillText(`间距: ${params.spacing}m`, centerX, height - 20);
};

const AnchorCreator: React.FC = () => {
  const [params, setParams] = useState<AnchorParams>({
    anchorType: 'prestressed',
    length: 15,
    diameter: 0.15,
    angle: 15,
    spacing: 2,
    prestressForce: 300,
    freeLength: 8,
    bondLength: 7,
    position: { x: 0, y: 0, z: 0 },
    color: ANCHOR_MATERIALS[0].color,
  });
  
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  const [isCreating, setIsCreating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const addFeature = useStore(state => state.addFeature);
  
  // 绘制2D示意图
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    drawAnchorSection(ctx, canvas, params);
  }, [params]);
  
  const handleChange = (field: string, value: any) => {
    if (field.includes('.')) {
      // 处理嵌套属性，如 position.x
      const [parent, child] = field.split('.');
      setParams({
        ...params,
        [parent]: {
          ...params[parent as keyof AnchorParams],
          [child]: value
        }
      });
    } else {
      // 如果改变锚杆类型，更新相关参数
      if (field === 'anchorType') {
        if (value === 'prestressed') {
          setParams({
            ...params,
            anchorType: value,
            prestressForce: 300,
            freeLength: 8,
            bondLength: 7
          });
        } else if (value === 'passive') {
          setParams({
            ...params,
            anchorType: value,
            prestressForce: undefined,
            freeLength: undefined,
            bondLength: undefined
          });
        } else if (value === 'soil_nail') {
          setParams({
            ...params,
            anchorType: value,
            length: 8,
            diameter: 0.05,
            angle: 10,
            spacing: 1.5,
            prestressForce: undefined,
            freeLength: undefined,
            bondLength: undefined
          });
        }
      } else {
        setParams({
          ...params,
          [field]: value
        });
      }
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
    
    // 验证长度
    if (!params.length || params.length <= 0) {
      newErrors['length'] = '长度必须大于0';
    }
    
    // 验证直径
    if (!params.diameter || params.diameter <= 0) {
      newErrors['diameter'] = '直径必须大于0';
    }
    
    // 验证角度
    if (params.angle < 0 || params.angle > 90) {
      newErrors['angle'] = '角度必须在0-90度之间';
    }
    
    // 验证间距
    if (!params.spacing || params.spacing <= 0) {
      newErrors['spacing'] = '间距必须大于0';
    }
    
    // 预应力锚杆的特殊验证
    if (params.anchorType === 'prestressed') {
      // 验证预应力
      if (!params.prestressForce || params.prestressForce <= 0) {
        newErrors['prestressForce'] = '预应力必须大于0';
      }
      
      // 验证自由段长度
      if (!params.freeLength || params.freeLength <= 0) {
        newErrors['freeLength'] = '自由段长度必须大于0';
      }
      
      // 验证锚固段长度
      if (!params.bondLength || params.bondLength <= 0) {
        newErrors['bondLength'] = '锚固段长度必须大于0';
      }
      
      // 验证自由段+锚固段 = 总长度
      if (params.freeLength + params.bondLength !== params.length) {
        newErrors['length'] = '总长度必须等于自由段长度+锚固段长度';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleCreateAnchor = async () => {
    if (!validate()) return;
    
    setIsCreating(true);
    
    try {
      // 创建锚杆特征
      const feature: AnyFeature = {
        id: uuidv4(),
        name: `${params.anchorType === 'prestressed' ? '预应力锚杆' : params.anchorType === 'passive' ? '被动锚杆' : '土钉'} (${params.length}m@${params.angle}°)`,
        type: 'CreateAnchor',
        parameters: {
          anchorType: params.anchorType,
          length: params.length,
          diameter: params.diameter,
          angle: params.angle,
          spacing: params.spacing,
          prestressForce: params.prestressForce,
          freeLength: params.freeLength,
          bondLength: params.bondLength,
          position: params.position
        },
      };
      
      // 添加到模型中
      addFeature(feature);
      
      // 重置为默认值，但保留位置信息以便连续创建
      const position = params.position;
      const anchorType = params.anchorType;
      
      if (anchorType === 'prestressed') {
        setParams({
          ...params,
          position: {
            ...position,
            y: position.y + params.spacing
          }
        });
      } else {
        setParams({
          ...params,
          position: {
            ...position,
            y: position.y + params.spacing
          }
        });
      }
      
    } catch (error) {
      console.error('创建锚杆失败:', error);
    } finally {
      setIsCreating(false);
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <LinkIcon />
        锚杆参数设置
      </Typography>
      
      <Divider sx={{ my: 2 }} />
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Grid container spacing={2}>
            {/* 锚杆类型 */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>锚杆类型</InputLabel>
                <Select
                  value={params.anchorType}
                  label="锚杆类型"
                  onChange={(e) => handleChange('anchorType', e.target.value)}
                >
                  <MenuItem value="prestressed">预应力锚杆</MenuItem>
                  <MenuItem value="passive">被动锚杆</MenuItem>
                  <MenuItem value="soil_nail">土钉</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            
            {/* 锚杆长度 */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="总长度 (m)"
                type="number"
                value={params.length}
                onChange={(e) => handleChange('length', parseFloat(e.target.value))}
                error={!!errors['length']}
                helperText={errors['length']}
                InputProps={{
                  inputProps: { min: 1, step: 0.5 }
                }}
              />
            </Grid>
            
            {/* 锚杆直径 */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="直径 (m)"
                type="number"
                value={params.diameter}
                onChange={(e) => handleChange('diameter', parseFloat(e.target.value))}
                error={!!errors['diameter']}
                helperText={errors['diameter']}
                InputProps={{
                  inputProps: { min: 0.01, step: 0.01 }
                }}
              />
            </Grid>
            
            {/* 锚杆倾角 */}
            <Grid item xs={12} sm={6}>
              <Typography gutterBottom>
                倾角: {params.angle}°
              </Typography>
              <Slider
                value={params.angle}
                onChange={(e, value) => handleChange('angle', value as number)}
                min={0}
                max={90}
                step={1}
                marks={[
                  { value: 0, label: '0°' },
                  { value: 45, label: '45°' },
                  { value: 90, label: '90°' }
                ]}
              />
              {errors['angle'] && (
                <FormHelperText error>{errors['angle']}</FormHelperText>
              )}
            </Grid>
            
            {/* 锚杆间距 */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="间距 (m)"
                type="number"
                value={params.spacing}
                onChange={(e) => handleChange('spacing', parseFloat(e.target.value))}
                error={!!errors['spacing']}
                helperText={errors['spacing']}
                InputProps={{
                  inputProps: { min: 0.5, step: 0.1 }
                }}
              />
            </Grid>
            
            {/* 预应力锚杆特有参数 */}
            {params.anchorType === 'prestressed' && (
              <>
                <Grid item xs={12}>
                  <Divider sx={{ my: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      预应力参数
                    </Typography>
                  </Divider>
                </Grid>
                
                {/* 预应力 */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="预应力 (kN)"
                    type="number"
                    value={params.prestressForce}
                    onChange={(e) => handleChange('prestressForce', parseFloat(e.target.value))}
                    error={!!errors['prestressForce']}
                    helperText={errors['prestressForce']}
                    InputProps={{
                      inputProps: { min: 50, step: 10 }
                    }}
                  />
                </Grid>
                
                {/* 自由段长度 */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="自由段长度 (m)"
                    type="number"
                    value={params.freeLength}
                    onChange={(e) => handleChange('freeLength', parseFloat(e.target.value))}
                    error={!!errors['freeLength']}
                    helperText={errors['freeLength']}
                    InputProps={{
                      inputProps: { min: 1, step: 0.5 }
                    }}
                  />
                </Grid>
                
                {/* 锚固段长度 */}
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="锚固段长度 (m)"
                    type="number"
                    value={params.bondLength}
                    onChange={(e) => handleChange('bondLength', parseFloat(e.target.value))}
                    error={!!errors['bondLength']}
                    helperText={errors['bondLength']}
                    InputProps={{
                      inputProps: { min: 1, step: 0.5 }
                    }}
                  />
                </Grid>
              </>
            )}
            
            <Grid item xs={12}>
              <Divider sx={{ my: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  位置参数
                </Typography>
              </Divider>
            </Grid>
            
            {/* X坐标 */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="X坐标 (m)"
                type="number"
                value={params.position?.x || 0}
                onChange={(e) => handleChange('position.x', parseFloat(e.target.value))}
                InputProps={{
                  inputProps: { step: 0.5 }
                }}
              />
            </Grid>
            
            {/* Y坐标 */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Y坐标 (m)"
                type="number"
                value={params.position?.y || 0}
                onChange={(e) => handleChange('position.y', parseFloat(e.target.value))}
                InputProps={{
                  inputProps: { step: 0.5 }
                }}
              />
            </Grid>
            
            {/* Z坐标 */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                label="Z坐标 (m)"
                type="number"
                value={params.position?.z || 0}
                onChange={(e) => handleChange('position.z', parseFloat(e.target.value))}
                InputProps={{
                  inputProps: { step: 0.5 }
                }}
              />
            </Grid>
          </Grid>
          
          <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
            <Button 
              variant="contained" 
              color="primary" 
              onClick={handleCreateAnchor}
              disabled={isCreating}
            >
              {isCreating ? '创建中...' : `创建${params.anchorType === 'prestressed' ? '预应力锚杆' : params.anchorType === 'passive' ? '被动锚杆' : '土钉'}`}
            </Button>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Paper 
            elevation={2} 
            sx={{ 
              p: 2, 
              height: '100%', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              锚杆剖面示意图
            </Typography>
            
            <Box sx={{ width: '100%', height: 300, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <canvas 
                ref={canvasRef} 
                width={400} 
                height={300}
                style={{ maxWidth: '100%', maxHeight: '100%' }}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AnchorCreator; 