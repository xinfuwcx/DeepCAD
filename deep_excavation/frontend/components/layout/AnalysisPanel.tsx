import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Divider,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  FormControlLabel,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  Grid,
  Paper,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  InputAdornment,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Alert,
  Snackbar,
  Chip,
  Tooltip,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import MemoryIcon from '@mui/icons-material/Memory';
import ScienceIcon from '@mui/icons-material/Science';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import WaterIcon from '@mui/icons-material/Water';
import EngineeringIcon from '@mui/icons-material/Engineering';
import { useStore } from '../../core/store';
import { AnyFeature, runParametricAnalysis, ParametricScene } from '../../services/parametricAnalysisService';

// 新增的材料数据类型
interface Material {
  id: string;
  name: string;
  type: 'soil' | 'concrete' | 'steel';
  properties: {
    [key: string]: number;
  };
}

// 新增的边界条件数据类型
interface BoundaryCondition {
  id: string;
  name: string;
  type: 'displacement' | 'force' | 'pressure' | 'hydraulic_head';
  target: string; // 几何实体ID
  value: number | [number, number, number];
  isConstrained?: boolean;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} id={`analysis-tabpanel-${index}`} style={{ height: 'calc(100% - 48px)', overflow: 'auto' }}>
      {value === index && <Box sx={{ p: 2 }}>{children}</Box>}
    </div>
  );
}

// 预定义材料库
const MATERIAL_LIBRARY: Material[] = [
  {
    id: 'soil-1',
    name: '黏土',
    type: 'soil',
    properties: {
      young_modulus: 5.0e6,
      poisson_ratio: 0.3,
      density: 1800,
      cohesion: 20000,
      friction_angle: 20,
      hydraulic_conductivity_x: 1e-8,
      hydraulic_conductivity_y: 1e-8,
      hydraulic_conductivity_z: 1e-9,
      porosity: 0.4
    }
  },
  {
    id: 'soil-2',
    name: '砂土',
    type: 'soil',
    properties: {
      young_modulus: 3.0e7,
      poisson_ratio: 0.25,
      density: 2000,
      cohesion: 0,
      friction_angle: 35,
      hydraulic_conductivity_x: 1e-5,
      hydraulic_conductivity_y: 1e-5,
      hydraulic_conductivity_z: 1e-5,
      porosity: 0.3
    }
  },
  {
    id: 'concrete-1',
    name: 'C30混凝土',
    type: 'concrete',
    properties: {
      young_modulus: 3.0e10,
      poisson_ratio: 0.2,
      density: 2500,
      compressive_strength: 30e6
    }
  },
  {
    id: 'steel-1',
    name: 'Q345钢材',
    type: 'steel',
    properties: {
      young_modulus: 2.1e11,
      poisson_ratio: 0.3,
      density: 7850,
      yield_strength: 345e6
    }
  }
];

// 材料管理组件
const MaterialManager: React.FC = () => {
  const [materials, setMaterials] = useState<Material[]>([...MATERIAL_LIBRARY]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  const handleEditMaterial = (material: Material) => {
    setSelectedMaterial(material);
    setDialogOpen(true);
  };
  
  const handleSaveMaterial = () => {
    if (selectedMaterial) {
      setMaterials(prev => 
        prev.map(m => m.id === selectedMaterial.id ? selectedMaterial : m)
      );
      setDialogOpen(false);
    }
  };
  
  return (
    <>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
        <Typography variant="subtitle2">材料库</Typography>
        <Button size="small" startIcon={<AddIcon />}>添加材料</Button>
      </Box>
      
      <List dense sx={{ bgcolor: 'background.paper' }}>
        {materials.map((material) => (
          <ListItem
            key={material.id}
            secondaryAction={
              <IconButton edge="end" onClick={() => handleEditMaterial(material)}>
                <EditIcon fontSize="small" />
              </IconButton>
            }
          >
            <ListItemText 
              primary={material.name} 
              secondary={
                <Typography variant="caption" color="text.secondary">
                  {material.type === 'soil' ? '土体' : material.type === 'concrete' ? '混凝土' : '钢材'}
                </Typography>
              } 
            />
          </ListItem>
        ))}
      </List>
      
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>编辑材料属性</DialogTitle>
        <DialogContent>
          {selectedMaterial && (
            <Stack spacing={2} sx={{ mt: 1, minWidth: 300 }}>
              <TextField
                label="材料名称"
                value={selectedMaterial.name}
                onChange={(e) => setSelectedMaterial({...selectedMaterial, name: e.target.value})}
                fullWidth
                size="small"
              />
              
              {Object.entries(selectedMaterial.properties).map(([key, value]) => (
                <TextField
                  key={key}
                  label={getPropertyLabel(key)}
                  value={value}
                  onChange={(e) => {
                    const newProps = {...selectedMaterial.properties};
                    newProps[key] = parseFloat(e.target.value);
                    setSelectedMaterial({
                      ...selectedMaterial, 
                      properties: newProps
                    });
                  }}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">{getPropertyUnit(key)}</InputAdornment>
                  }}
                  fullWidth
                  size="small"
                />
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button onClick={handleSaveMaterial} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

// 获取属性标签
function getPropertyLabel(key: string): string {
  const labels: {[key: string]: string} = {
    young_modulus: '弹性模量',
    poisson_ratio: '泊松比',
    density: '密度',
    cohesion: '粘聚力',
    friction_angle: '内摩擦角',
    hydraulic_conductivity_x: 'X向渗透系数',
    hydraulic_conductivity_y: 'Y向渗透系数',
    hydraulic_conductivity_z: 'Z向渗透系数',
    porosity: '孔隙率',
    compressive_strength: '抗压强度',
    yield_strength: '屈服强度'
  };
  return labels[key] || key;
}

// 获取属性单位
function getPropertyUnit(key: string): string {
  const units: {[key: string]: string} = {
    young_modulus: 'Pa',
    poisson_ratio: '',
    density: 'kg/m³',
    cohesion: 'Pa',
    friction_angle: '°',
    hydraulic_conductivity_x: 'm/s',
    hydraulic_conductivity_y: 'm/s',
    hydraulic_conductivity_z: 'm/s',
    porosity: '',
    compressive_strength: 'Pa',
    yield_strength: 'Pa'
  };
  return units[key] || '';
}

// 材料分配组件
const MaterialAssignment: React.FC = () => {
    const features = useStore(state => state.features);
    const [assignments, setAssignments] = useState<{[key: string]: string}>({});
    
    const handleAssignMaterial = (featureId: string, materialId: string) => {
      setAssignments(prev => ({...prev, [featureId]: materialId}));
    };

    return (
        <List dense>
            {features.filter(f => f.type !== 'CreateAnchorSystem').map(feature => (
                <ListItem
                    key={feature.id}
                    secondaryAction={
                        <Select
                          value={assignments[feature.id] || ''}
                          onChange={(e) => handleAssignMaterial(feature.id, e.target.value)}
                          size="small"
                          sx={{ minWidth: 120 }}
                        >
                          <MenuItem value="">
                            <em>未分配</em>
                          </MenuItem>
                          {MATERIAL_LIBRARY.map(mat => (
                            <MenuItem key={mat.id} value={mat.id}>
                              {mat.name}
                            </MenuItem>
                          ))}
                        </Select>
                    }
                >
                    <ListItemText 
                      primary={feature.name} 
                      secondary={feature.type.replace('Create', '')} 
                    />
                </ListItem>
            ))}
        </List>
    );
};

// 边界条件组件
const BoundaryConditionManager: React.FC = () => {
  const features = useStore(state => state.features);
  const [boundaryConditions, setBoundaryConditions] = useState<BoundaryCondition[]>([]);
  const [selectedFeature, setSelectedFeature] = useState<string>('');
  const [conditionType, setConditionType] = useState<string>('displacement');
  const [valueX, setValueX] = useState<number>(0);
  const [valueY, setValueY] = useState<number>(0);
  const [valueZ, setValueZ] = useState<number>(0);
  const [isConstrained, setIsConstrained] = useState<boolean>(true);
  
  const handleAddBoundaryCondition = () => {
    if (!selectedFeature) return;
    
    const newCondition: BoundaryCondition = {
      id: `bc-${Date.now()}`,
      name: `边界条件 ${boundaryConditions.length + 1}`,
      type: conditionType as any,
      target: selectedFeature,
      value: conditionType === 'hydraulic_head' ? valueX : [valueX, valueY, valueZ],
      isConstrained
    };
    
    setBoundaryConditions([...boundaryConditions, newCondition]);
    // 重置表单
    setValueX(0);
    setValueY(0);
    setValueZ(0);
  };
  
  const handleDeleteBoundaryCondition = (id: string) => {
    setBoundaryConditions(boundaryConditions.filter(bc => bc.id !== id));
  };
  
  return (
    <Stack spacing={2}>
      <Typography variant="subtitle2">已定义的边界条件</Typography>
      
      {boundaryConditions.length > 0 ? (
        <List dense>
          {boundaryConditions.map(bc => {
            const targetFeature = features.find(f => f.id === bc.target);
            return (
              <ListItem
                key={bc.id}
                secondaryAction={
                  <IconButton edge="end" onClick={() => handleDeleteBoundaryCondition(bc.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={bc.name}
                  secondary={`${getBoundaryTypeLabel(bc.type)} - ${targetFeature?.name || '未知实体'}`}
                />
              </ListItem>
            );
          })}
        </List>
      ) : (
        <Typography variant="body2" color="text.secondary">
          尚未定义边界条件
        </Typography>
      )}
      
      <Divider />
      
      <Typography variant="subtitle2">添加新边界条件</Typography>
      
      <FormControl fullWidth size="small">
        <InputLabel>几何实体</InputLabel>
        <Select
          value={selectedFeature}
          onChange={(e) => setSelectedFeature(e.target.value)}
          label="几何实体"
        >
          <MenuItem value="">
            <em>选择几何实体</em>
          </MenuItem>
          {features.map(feature => (
            <MenuItem key={feature.id} value={feature.id}>
              {feature.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      
      <FormControl fullWidth size="small">
        <InputLabel>边界条件类型</InputLabel>
        <Select
          value={conditionType}
          onChange={(e) => setConditionType(e.target.value)}
          label="边界条件类型"
        >
          <MenuItem value="displacement">位移约束</MenuItem>
          <MenuItem value="force">力约束</MenuItem>
          <MenuItem value="pressure">压力约束</MenuItem>
          <MenuItem value="hydraulic_head">水头约束</MenuItem>
        </Select>
      </FormControl>
      
      {conditionType === 'hydraulic_head' ? (
        <TextField
          label="总水头"
          type="number"
          value={valueX}
          onChange={(e) => setValueX(parseFloat(e.target.value))}
          InputProps={{
            endAdornment: <InputAdornment position="end">m</InputAdornment>,
          }}
          size="small"
        />
      ) : (
        <Grid container spacing={1}>
          <Grid item xs={4}>
            <TextField
              label="X方向"
              type="number"
              value={valueX}
              onChange={(e) => setValueX(parseFloat(e.target.value))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Y方向"
              type="number"
              value={valueY}
              onChange={(e) => setValueY(parseFloat(e.target.value))}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={4}>
            <TextField
              label="Z方向"
              type="number"
              value={valueZ}
              onChange={(e) => setValueZ(parseFloat(e.target.value))}
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>
      )}
      
      {conditionType === 'displacement' && (
        <FormControlLabel
          control={
            <Radio
              checked={isConstrained}
              onChange={(e) => setIsConstrained(e.target.checked)}
            />
          }
          label="约束位移"
        />
      )}
      
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={handleAddBoundaryCondition}
        disabled={!selectedFeature}
      >
        添加边界条件
      </Button>
    </Stack>
  );
};

// 获取边界条件类型标签
function getBoundaryTypeLabel(type: string): string {
  const labels: {[key: string]: string} = {
    displacement: '位移约束',
    force: '力约束',
    pressure: '压力约束',
    hydraulic_head: '水头约束'
  };
  return labels[type] || type;
}

// Kratos求解器设置组件
const KratosSolverSettings: React.FC = () => {
  const [solverType, setSolverType] = useState<string>('direct');
  const [tolerance, setTolerance] = useState<number>(1e-6);
  const [maxIterations, setMaxIterations] = useState<number>(1000);
  const [timeStep, setTimeStep] = useState<number>(0.1);
  const [endTime, setEndTime] = useState<number>(1.0);
  const [analysisType, setAnalysisType] = useState<string>('static');
  
  return (
    <Stack spacing={2}>
      <FormControl fullWidth size="small">
        <InputLabel>分析类型</InputLabel>
        <Select
          value={analysisType}
          onChange={(e) => setAnalysisType(e.target.value)}
          label="分析类型"
        >
          <MenuItem value="static">静力分析</MenuItem>
          <MenuItem value="dynamic">动力分析</MenuItem>
          <MenuItem value="modal">模态分析</MenuItem>
          <MenuItem value="steady_state_seepage">稳态渗流</MenuItem>
          <MenuItem value="transient_seepage">瞬态渗流</MenuItem>
        </Select>
      </FormControl>
      
      <FormControl fullWidth size="small">
        <InputLabel>求解器</InputLabel>
        <Select
          value={solverType}
          onChange={(e) => setSolverType(e.target.value)}
          label="求解器"
        >
          <MenuItem value="direct">直接求解器 (MUMPS)</MenuItem>
          <MenuItem value="iterative">迭代求解器 (CG)</MenuItem>
          <MenuItem value="amgcl">AMGCL</MenuItem>
        </Select>
      </FormControl>
      
      <TextField
        label="收敛容差"
        type="number"
        value={tolerance}
        onChange={(e) => setTolerance(parseFloat(e.target.value))}
        InputProps={{
          endAdornment: <InputAdornment position="end">ε</InputAdornment>,
        }}
        size="small"
      />
      
      <TextField
        label="最大迭代次数"
        type="number"
        value={maxIterations}
        onChange={(e) => setMaxIterations(parseInt(e.target.value))}
        size="small"
      />
      
      {(analysisType === 'dynamic' || analysisType === 'transient_seepage') && (
        <>
          <TextField
            label="时间步长"
            type="number"
            value={timeStep}
            onChange={(e) => setTimeStep(parseFloat(e.target.value))}
            InputProps={{
              endAdornment: <InputAdornment position="end">s</InputAdornment>,
            }}
            size="small"
          />
          
          <TextField
            label="终止时间"
            type="number"
            value={endTime}
            onChange={(e) => setEndTime(parseFloat(e.target.value))}
            InputProps={{
              endAdornment: <InputAdornment position="end">s</InputAdornment>,
            }}
            size="small"
          />
        </>
      )}
    </Stack>
  );
};

const AnalysisPanel: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>("mechanical");
  const features = useStore(state => state.features);
  const viewportApi = useStore(state => state.viewportApi);

  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleRunAnalysis = async () => {
    setIsRunning(true);
    setError(null);

    const scene: ParametricScene = {
        version: "2.0-parametric",
        features: features,
    };

    try {
        const result = await runParametricAnalysis(scene);
        console.log('Analysis successful:', result);
        if (result.mesh_filename && viewportApi) {
            const vtkUrl = `/api/analysis/results/${result.mesh_filename}`;
            viewportApi.loadVtkResults(vtkUrl);
        }
    } catch (err: any) {
        console.error('Analysis failed:', err);
        setError(err.message || 'An unknown error occurred during analysis.');
    } finally {
        setIsRunning(false);
    }
  };

  const FemAnalysisTab = () => (
    <Stack spacing={1}>
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤一: 分析工况</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <FormControl component="fieldset">
                    <RadioGroup 
                      row 
                      value={analysisType}
                      onChange={(e) => setAnalysisType(e.target.value)}
                    >
                        <FormControlLabel value="mechanical" control={<Radio />} label="固体力学" />
                        <FormControlLabel value="seepage" control={<Radio />} label="渗流分析" />
                        <FormControlLabel value="coupled" control={<Radio />} label="流固耦合" />
                    </RadioGroup>
                </FormControl>
                
                <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                  <Chip 
                    icon={<EngineeringIcon />} 
                    label="Kratos结构分析" 
                    color={analysisType === 'mechanical' ? 'primary' : 'default'} 
                    variant={analysisType === 'mechanical' ? 'filled' : 'outlined'}
                  />
                  <Chip 
                    icon={<WaterIcon />} 
                    label="Kratos渗流分析" 
                    color={analysisType === 'seepage' ? 'primary' : 'default'} 
                    variant={analysisType === 'seepage' ? 'filled' : 'outlined'}
                  />
                </Box>
            </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤二: 材料管理</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <MaterialManager />
            </AccordionDetails>
        </Accordion>

        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤三: 材料分配</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <MaterialAssignment />
            </AccordionDetails>
        </Accordion>

        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤四: 边界条件</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <BoundaryConditionManager />
            </AccordionDetails>
        </Accordion>
        
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤五: 荷载</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography color="text.secondary">在此处添加施加重力、面荷载、线荷载等的UI。</Typography>
            </AccordionDetails>
        </Accordion>
        
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤六: 求解器设置</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <KratosSolverSettings />
            </AccordionDetails>
        </Accordion>
    </Stack>
  );

  const PhysicsAiTab = () => (
     <Stack spacing={1}>
        <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤一: 选择监测数据</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Button variant="outlined" component="label">
                    上传监测数据
                    <input type="file" hidden />
                </Button>
                <Typography variant="caption" display="block" color="text.secondary" sx={{mt: 1}}>支持 .csv, .txt 格式</Typography>
            </AccordionDetails>
        </Accordion>
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤二: 定义反演参数</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Typography color="text.secondary">在此处添加用于选择要反演的岩土参数的UI。</Typography>
            </AccordionDetails>
        </Accordion>
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">步骤三: AI模型设置</Typography>
            </AccordionSummary>
            <AccordionDetails>
                 <Stack spacing={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>反演算法</InputLabel>
                        <Select label="反演算法" defaultValue="adam">
                            <MenuItem value="adam">Adam</MenuItem>
                            <MenuItem value="sgd">SGD</MenuItem>
                            <MenuItem value="lbfgs">L-BFGS</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField size="small" label="学习率" defaultValue={0.01} />
                    <TextField size="small" label="最大迭代次数" defaultValue={100} />
                 </Stack>
            </AccordionDetails>
        </Accordion>
     </Stack>
  );

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Tabs value={tabValue} onChange={handleTabChange} variant="fullWidth">
          <Tab label="FEM 分析" icon={<ScienceIcon/>} iconPosition="start" value={0} />
          <Tab label="物理 AI" icon={<MemoryIcon/>} iconPosition="start" value={1} />
      </Tabs>
      <Divider />
      
      <Box sx={{flexGrow: 1, overflow: 'auto'}}>
        <TabPanel value={tabValue} index={0}>
            <FemAnalysisTab />
        </TabPanel>
        <TabPanel value={tabValue} index={1}>
            <PhysicsAiTab />
        </TabPanel>
      </Box>

      <Divider />
      <Box sx={{ p: 2 }}>
          {isRunning && <LinearProgress sx={{mb: 2}}/>}
          <Button 
            variant="contained" 
            startIcon={isRunning ? <CircularProgress size={20} color="inherit" /> : <PlayArrowIcon />}
            fullWidth
            onClick={handleRunAnalysis}
            disabled={isRunning || features.length === 0}
        >
            {isRunning ? '计算中...' : '开始计算'}
          </Button>
          
          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
      </Box>
    </Paper>
  );
};

export default AnalysisPanel; 