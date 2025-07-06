import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Slider, 
  TextField, 
  FormControl, 
  FormLabel, 
  Select,
  MenuItem,
  Switch,
  Button,
  Grid,
  Divider,
  Tooltip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Checkbox,
  Paper,
  SelectChangeEvent,
  Stack,
  InputLabel,
  FormControlLabel
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import { useStore } from '../../core/store';
import { AnyFeature } from '../../services/parametricAnalysisService';

export interface MeshSettings {
  minSize: number;
  maxSize: number;
  meshGrowthRate: number;
  elementOrder: 1 | 2;
  algo2d: 'MeshAdapt' | 'Automatic' | 'Initial' | 'Delaunay' | 'Frontal-Delaunay' | 'Packing';
  algo3d: 'Delaunay' | 'Initial' | 'Frontal' | 'Frontal-Delaunay';
  optimization: boolean;
  fragment: {
    objects: string[];
    tools: string[];
  };
}

const defaultSettings: MeshSettings = {
  minSize: 0.5,
  maxSize: 10.0,
  meshGrowthRate: 1.3,
  elementOrder: 1,
  algo2d: 'MeshAdapt',
  algo3d: 'Delaunay',
  optimization: true,
  fragment: {
    objects: [],
    tools: [],
  },
};

interface MeshSettingsFormProps {
  initialSettings?: Partial<MeshSettings>;
  onApply?: (settings: MeshSettings) => void;
  onSettingsChange?: (settings: Partial<MeshSettings>) => void;
}

const FeatureSelectionList: React.FC<{
    title: string;
    features: AnyFeature[];
    selected: string[];
    onChange: (selected: string[]) => void;
}> = ({ title, features, selected, onChange }) => {
    
    const handleToggle = (featureId: string) => {
        const currentIndex = selected.indexOf(featureId);
        const newSelected = [...selected];

        if (currentIndex === -1) {
            newSelected.push(featureId);
        } else {
            newSelected.splice(currentIndex, 1);
        }
        onChange(newSelected);
    };

    return (
        <Paper variant="outlined" sx={{ height: 200, overflow: 'auto' }}>
            <Typography variant="subtitle2" sx={{ p: 1, bgcolor: 'grey.100' }}>{title}</Typography>
            <List dense component="div" role="list">
                {features.map((feature) => (
                    <ListItem key={feature.id} role="listitem" button onClick={() => handleToggle(feature.id)}>
                        <Checkbox
                            checked={selected.indexOf(feature.id) !== -1}
                            tabIndex={-1}
                            disableRipple
                        />
                        <ListItemText primary={feature.name} secondary={`Type: ${feature.type}`}/>
                    </ListItem>
                ))}
            </List>
        </Paper>
    )
}


const MeshSettingsForm: React.FC<MeshSettingsFormProps> = ({
  initialSettings = {},
  onApply,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<MeshSettings>({
    ...defaultSettings,
    ...initialSettings,
  });
  const features = useStore(state => state.features);

  useEffect(() => {
    if (onSettingsChange) {
      onSettingsChange(settings);
    }
  }, [settings, onSettingsChange]);

  const geometryFeatures = features.filter(f => 
    f.type !== 'CreateGeologicalModel' && 
    f.type !== 'CreateAnchorSystem' // Filter out non-solid geometry for now
  );
  
  const handleChange = (path: string, value: any) => {
    const newSettings = {...settings, [path]: value};
    setSettings(newSettings);
  };

  const handleFragmentChange = (key: 'objects' | 'tools', selectedIds: string[]) => {
      const newFragment = {
          ...settings.fragment,
          [key]: selectedIds
      };
      const newSettings = {...settings, fragment: newFragment };
      setSettings(newSettings);
  }
  
  const handleApply = () => {
    if (onApply) {
      onApply(settings);
    }
  };
  
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        网格参数设置 (GMSH)
      </Typography>
      <Divider sx={{ my: 2 }} />

       <Grid container spacing={4}>
            <Grid item xs={12} md={7}>
                 <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>几何与布尔运算</Typography>
                     <Grid container spacing={2}>
                        <Grid item xs={6}>
                            <FeatureSelectionList 
                                title="主对象 (Objects)"
                                features={geometryFeatures}
                                selected={settings.fragment.objects}
                                onChange={(ids) => handleFragmentChange('objects', ids)}
                            />
                             <FormLabel sx={{fontSize: '0.8rem'}}>被切割的几何体 (如: 地层)</FormLabel>
                        </Grid>
                        <Grid item xs={6}>
                            <FeatureSelectionList 
                                title="工具 (Tools)"
                                features={geometryFeatures}
                                selected={settings.fragment.tools}
                                onChange={(ids) => handleFragmentChange('tools', ids)}
                            />
                             <FormLabel sx={{fontSize: '0.8rem'}}>用于切割的几何体 (如: 结构物)</FormLabel>
                        </Grid>
                     </Grid>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="subtitle1" gutterBottom>全局设置</Typography>
                    <Stack spacing={2}>
                        <TextField label="最小单元尺寸" name="minSize" type="number" size="small" value={settings.minSize} onChange={(e) => handleChange('minSize', parseFloat(e.target.value))} />
                        <TextField label="最大单元尺寸" name="maxSize" type="number" size="small" value={settings.maxSize} onChange={(e) => handleChange('maxSize', parseFloat(e.target.value))} />
                        <Typography variant="body2" color="textSecondary">尺寸增长率: {settings.meshGrowthRate}</Typography>
                        <Slider value={settings.meshGrowthRate} onChange={(_, v) => handleChange('meshGrowthRate', v)} min={1.05} max={3.0} step={0.05}/>
                    </Stack>
                </Box>
            </Grid>
            <Grid item xs={12} md={5}>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>算法</Typography>
                     <Stack spacing={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>2D 算法</InputLabel>
                            <Select label="2D 算法" value={settings.algo2d} onChange={(e) => handleChange('algo2d', e.target.value)}>
                                <MenuItem value="MeshAdapt">MeshAdapt</MenuItem>
                                <MenuItem value="Automatic">Automatic</MenuItem>
                                <MenuItem value="Initial">Initial mesh only</MenuItem>
                                <MenuItem value="Delaunay">Delaunay</MenuItem>
                                <MenuItem value="Frontal-Delaunay">Frontal-Delaunay</MenuItem>
                                <MenuItem value="Packing">Packing of Parallelograms</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                             <InputLabel>3D 算法</InputLabel>
                            <Select label="3D 算法" value={settings.algo3d} onChange={(e) => handleChange('algo3d', e.target.value)}>
                                <MenuItem value="Delaunay">Delaunay</MenuItem>
                                <MenuItem value="Initial">Initial mesh only</MenuItem>
                                <MenuItem value="Frontal">Frontal</MenuItem>
                                <MenuItem value="Frontal-Delaunay">Frontal-Delaunay for Quads</MenuItem>
                            </Select>
                        </FormControl>
                    </Stack>
                </Box>
                 <Divider sx={{ my: 2 }} />
                <Box>
                    <Typography variant="subtitle1" gutterBottom>质量</Typography>
                    <Stack spacing={1}>
                        <FormControl fullWidth size="small">
                             <InputLabel>单元阶次</InputLabel>
                            <Select label="单元阶次" value={settings.elementOrder} onChange={(e) => handleChange('elementOrder', Number(e.target.value))}>
                                <MenuItem value={1}>一阶 (线性)</MenuItem>
                                <MenuItem value={2}>二阶 (二次)</MenuItem>
                            </Select>
                        </FormControl>
                        <FormControlLabel
                            control={<Switch checked={settings.optimization} onChange={(e) => handleChange('optimization', e.target.checked)} />}
                            label="网格优化"
                        />
                    </Stack>
                </Box>
            </Grid>
       </Grid>

      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="contained" color="primary" onClick={handleApply}>
          生成网格
        </Button>
      </Box>
    </Box>
  );
};

export default MeshSettingsForm; 