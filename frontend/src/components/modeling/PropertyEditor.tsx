/**
 * @file PropertyEditor.tsx
 * @description 建模对象属性编辑器组件
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Stack,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  Button,
  Divider,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Terrain as TerrainIcon,
  Construction as ExcavationIcon,
  ViewModule as WallIcon,
  AccountTree as PileIcon,
  Hardware as AnchorIcon,
  HomeWork as BuildingIcon,
  Engineering as TunnelIcon,
} from '@mui/icons-material';

// 建模对象接口
export interface ModelingObject {
  id: string;
  type: string;
  name: string;
  visible: boolean;
  properties: Record<string, any>;
  geometry?: any;
  status: 'draft' | 'valid' | 'error';
  lastModified: Date;
}

interface PropertyEditorProps {
  object: ModelingObject;
  onUpdate: (object: ModelingObject) => void;
}

const PropertyEditor: React.FC<PropertyEditorProps> = ({ object, onUpdate }) => {
  const [localObject, setLocalObject] = useState<ModelingObject>(object);

  useEffect(() => {
    setLocalObject(object);
  }, [object]);

  const handlePropertyChange = (key: string, value: any) => {
    const updatedObject = {
      ...localObject,
      properties: {
        ...localObject.properties,
        [key]: value,
      },
      lastModified: new Date(),
    };
    setLocalObject(updatedObject);
    onUpdate(updatedObject);
  };

  const handleNameChange = (name: string) => {
    const updatedObject = { ...localObject, name, lastModified: new Date() };
    setLocalObject(updatedObject);
    onUpdate(updatedObject);
  };

  const getObjectIcon = (type: string) => {
    switch (type) {
      case 'terrain': return <TerrainIcon />;
      case 'excavation': return <ExcavationIcon />;
      case 'wall': return <WallIcon />;
      case 'pile': return <PileIcon />;
      case 'anchor': return <AnchorIcon />;
      case 'building': return <BuildingIcon />;
      case 'tunnel': return <TunnelIcon />;
      default: return null;
    }
  };

  const renderBasicProperties = () => (
    <Stack spacing={2}>
      <TextField
        label="对象名称"
        value={localObject.name}
        onChange={(e) => handleNameChange(e.target.value)}
        size="small"
        fullWidth
      />
      
      <FormControlLabel
        control={
          <Switch
            checked={localObject.visible}
            onChange={(e) => {
              const updatedObject = { ...localObject, visible: e.target.checked };
              setLocalObject(updatedObject);
              onUpdate(updatedObject);
            }}
          />
        }
        label="显示对象"
      />
    </Stack>
  );

  const renderTerrainProperties = () => (
    <Stack spacing={2}>
      <Typography variant="subtitle2" gutterBottom>
        域尺寸
      </Typography>
      
      <TextField
        label="长度 (m)"
        type="number"
        value={localObject.properties.length || 100}
        onChange={(e) => handlePropertyChange('length', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
      
      <TextField
        label="宽度 (m)"
        type="number"
        value={localObject.properties.width || 80}
        onChange={(e) => handlePropertyChange('width', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
      
      <TextField
        label="总深度 (m)"
        type="number"
        value={localObject.properties.depth || 30}
        onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />

      <Divider />
      
      <Typography variant="subtitle2" gutterBottom>
        土层设置
      </Typography>
      
      <FormControl fullWidth size="small">
        <InputLabel>主要土层类型</InputLabel>
        <Select
          value={localObject.properties.soilType || 'clay'}
          onChange={(e) => handlePropertyChange('soilType', e.target.value)}
        >
          <MenuItem value="clay">粘土</MenuItem>
          <MenuItem value="sand">砂土</MenuItem>
          <MenuItem value="silt">粉土</MenuItem>
          <MenuItem value="rock">岩石</MenuItem>
          <MenuItem value="mixed">混合土</MenuItem>
        </Select>
      </FormControl>
      
      <TextField
        label="地下水位 (m)"
        type="number"
        value={localObject.properties.waterLevel || 5}
        onChange={(e) => handlePropertyChange('waterLevel', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
    </Stack>
  );

  const renderExcavationProperties = () => (
    <Stack spacing={2}>
      <Typography variant="subtitle2" gutterBottom>
        开挖参数
      </Typography>
      
      <TextField
        label="开挖深度 (m)"
        type="number"
        value={localObject.properties.depth || 10}
        onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
      
      <FormControl fullWidth size="small">
        <InputLabel>开挖方式</InputLabel>
        <Select
          value={localObject.properties.method || 'staged'}
          onChange={(e) => handlePropertyChange('method', e.target.value)}
        >
          <MenuItem value="staged">分层开挖</MenuItem>
          <MenuItem value="full">一次性开挖</MenuItem>
          <MenuItem value="partial">部分开挖</MenuItem>
        </Select>
      </FormControl>
      
      <TextField
        label="开挖阶段数"
        type="number"
        value={localObject.properties.stages || 3}
        onChange={(e) => handlePropertyChange('stages', parseInt(e.target.value))}
        size="small"
        fullWidth
        inputProps={{ min: 1, max: 10 }}
      />
      
      <Typography variant="body2" gutterBottom>
        坡度角 (度): {localObject.properties.slopeAngle || 90}
      </Typography>
      <Slider
        value={localObject.properties.slopeAngle || 90}
        onChange={(e, value) => handlePropertyChange('slopeAngle', value)}
        min={45}
        max={90}
        step={5}
        marks
        valueLabelDisplay="auto"
      />
    </Stack>
  );

  const renderWallProperties = () => (
    <Stack spacing={2}>
      <Typography variant="subtitle2" gutterBottom>
        地连墙参数
      </Typography>
      
      <TextField
        label="墙厚度 (m)"
        type="number"
        value={localObject.properties.thickness || 0.8}
        onChange={(e) => handlePropertyChange('thickness', parseFloat(e.target.value))}
        size="small"
        fullWidth
        inputProps={{ min: 0.3, max: 2.0, step: 0.1 }}
      />
      
      <TextField
        label="墙深度 (m)"
        type="number"
        value={localObject.properties.depth || 15}
        onChange={(e) => handlePropertyChange('depth', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
      
      <FormControl fullWidth size="small">
        <InputLabel>材料类型</InputLabel>
        <Select
          value={localObject.properties.material || 'concrete'}
          onChange={(e) => handlePropertyChange('material', e.target.value)}
        >
          <MenuItem value="concrete">混凝土</MenuItem>
          <MenuItem value="steel">钢板桩</MenuItem>
          <MenuItem value="composite">复合材料</MenuItem>
        </Select>
      </FormControl>
      
      <TextField
        label="弹性模量 (GPa)"
        type="number"
        value={localObject.properties.elasticModulus || 30}
        onChange={(e) => handlePropertyChange('elasticModulus', parseFloat(e.target.value))}
        size="small"
        fullWidth
      />
      
      <TextField
        label="泊松比"
        type="number"
        value={localObject.properties.poisson || 0.2}
        onChange={(e) => handlePropertyChange('poisson', parseFloat(e.target.value))}
        size="small"
        fullWidth
        inputProps={{ min: 0.1, max: 0.4, step: 0.05 }}
      />
    </Stack>
  );

  const renderSpecificProperties = () => {
    switch (object.type) {
      case 'terrain':
        return renderTerrainProperties();
      case 'excavation':
        return renderExcavationProperties();
      case 'wall':
        return renderWallProperties();
      case 'pile':
        return (
          <Stack spacing={2}>
            <TextField
              label="桩径 (m)"
              type="number"
              value={localObject.properties.diameter || 0.8}
              onChange={(e) => handlePropertyChange('diameter', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="桩长 (m)"
              type="number"
              value={localObject.properties.length || 20}
              onChange={(e) => handlePropertyChange('length', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
          </Stack>
        );
      case 'anchor':
        return (
          <Stack spacing={2}>
            <TextField
              label="锚杆直径 (mm)"
              type="number"
              value={localObject.properties.diameter || 32}
              onChange={(e) => handlePropertyChange('diameter', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="锚杆长度 (m)"
              type="number"
              value={localObject.properties.length || 25}
              onChange={(e) => handlePropertyChange('length', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
            <TextField
              label="倾角 (度)"
              type="number"
              value={localObject.properties.angle || 15}
              onChange={(e) => handlePropertyChange('angle', parseFloat(e.target.value))}
              size="small"
              fullWidth
            />
          </Stack>
        );
      default:
        return (
          <Typography variant="body2" color="text.secondary">
            该对象类型的属性编辑器正在开发中...
          </Typography>
        );
    }
  };

  return (
    <Box>
      {/* 对象信息头部 */}
      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={2} mb={2}>
            {getObjectIcon(object.type)}
            <Box>
              <Typography variant="h6">{localObject.name}</Typography>
              <Stack direction="row" spacing={1}>
                <Chip
                  label={object.type}
                  size="small"
                  color="primary"
                  variant="outlined"
                />
                <Chip
                  label={object.status}
                  size="small"
                  color={object.status === 'valid' ? 'success' : object.status === 'error' ? 'error' : 'default'}
                />
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      {/* 基本属性 */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">基本属性</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderBasicProperties()}
        </AccordionDetails>
      </Accordion>

      {/* 特定属性 */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">专业属性</Typography>
        </AccordionSummary>
        <AccordionDetails>
          {renderSpecificProperties()}
        </AccordionDetails>
      </Accordion>

      {/* 操作按钮 */}
      <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
        <Button variant="outlined" size="small">
          重置
        </Button>
        <Button variant="contained" size="small">
          应用
        </Button>
      </Stack>

      {/* 状态信息 */}
      <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
        最后修改: {object.lastModified.toLocaleString()}
      </Typography>
    </Box>
  );
};

export default PropertyEditor;
