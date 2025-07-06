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
  Slider,
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
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import TuneIcon from '@mui/icons-material/Tune';
import { useStore } from '../../core/store';
import { AnyFeature, runParametricAnalysis, ParametricScene } from '../../services/parametricAnalysisService';
import { OptimizableParameter } from '../../core/store';

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

// A new component to manage and display design variables
const DesignVariableManager: React.FC<{
    parameters: OptimizableParameter[];
    onParameterChange: (id: string, value: number) => void;
}> = ({ parameters, onParameterChange }) => {
    
    const groupedParams = parameters.reduce((acc, param) => {
        if (!acc[param.group]) {
            acc[param.group] = [];
        }
        acc[param.group].push(param);
        return acc;
    }, {} as Record<string, OptimizableParameter[]>);

    return (
        <Stack spacing={2}>
            {Object.entries(groupedParams).map(([groupName, params]) => (
                <Paper key={groupName} variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom>{groupName}</Typography>
                    <Stack spacing={2}>
                        {params.map(param => (
                            <Box key={param.id}>
                                <Typography variant="body2">{param.name} ({param.unit})</Typography>
                                <Slider
                                    value={param.value}
                                    min={param.min}
                                    max={param.max}
                                    step={param.step}
                                    onChange={(_, newValue) => onParameterChange(param.id, newValue as number)}
                                    valueLabelDisplay="auto"
                                    marks={[{ value: param.min, label: `${param.min}` }, { value: param.max, label: `${param.max}` }]}
                                />
                            </Box>
                        ))}
                    </Stack>
                </Paper>
            ))}
        </Stack>
    );
};

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
  const [value, setValue] = useState(0);
  // const { features, geologicalModel, excavations, diaphragmWalls, anchors, pileRafts, buildings, tunnels } = useStore();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  // const showResultsInViewport = useStore(state => state.showResultsInViewport);


  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  const handleRunAnalysis = async () => {
    setIsLoading(true);
    setError(null);
    setProgress(0);

    // This is a placeholder for the scene creation logic
    const scene: ParametricScene = {
        // geologicalModel,
        // excavations,
        // structures: [...diaphragmWalls, ...anchors, ...pileRafts, ...buildings, ...tunnels],
    };

    try {
      console.log("Running analysis with scene:", scene);
      const results = await runParametricAnalysis(scene, (p) => setProgress(p * 100));
      setAnalysisResults(results);
      // Assuming results contain a file path to the vtkjs/gltf model
      if (results.visualization_url) {
        // This function was removed, need a new way to show results.
        // For now, we just log it.
        console.log("Analysis complete, results URL:", results.visualization_url);
        // showResultsInViewport(results.visualization_url, results.legend_data);
      }
      
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  };

  // Simplified and refactored Tab for "Expert Mode"
  const ExpertModeTab = () => (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, height: '100%' }}>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">材料库与分配</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <MaterialManager />
          <Divider sx={{ my: 2 }} />
          <MaterialAssignment />
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">边界条件</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <BoundaryConditionManager />
        </AccordionDetails>
      </Accordion>
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">求解器设置</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <KratosSolverSettings />
        </AccordionDetails>
      </Accordion>
    </Box>
  );

  // New Tab for "AI-Driven Analysis"
  const AiDrivenAnalysisTab = () => {
    const [analysisType, setAnalysisType] = useState('forward');
    const { 
        optimizableParameters, 
        areParametersLoading, 
        parameterError, 
        fetchOptimizableParameters 
    } = useStore(state => ({
        optimizableParameters: state.optimizableParameters,
        areParametersLoading: state.areParametersLoading,
        parameterError: state.parameterError,
        fetchOptimizableParameters: state.fetchOptimizableParameters,
    }));
    const [editableParameters, setEditableParameters] = useState<OptimizableParameter[]>([]);

    useEffect(() => {
        // Fetch parameters when switching to a relevant analysis type
        if (analysisType === 'inverse' || analysisType === 'optimization') {
            // Assume a placeholder project ID for now
            fetchOptimizableParameters(1); 
        }
    }, [analysisType, fetchOptimizableParameters]);

    useEffect(() => {
        // Sync local editable state when parameters are fetched from the store
        setEditableParameters(optimizableParameters);
    }, [optimizableParameters]);

    const handleParameterChange = (id: string, value: number) => {
        setEditableParameters(prev =>
            prev.map(p => (p.id === id ? { ...p, value } : p))
        );
    };

    return (
        <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
            {/* Step 1: Select Analysis Type */}
            <FormControl component="fieldset">
                <FormLabel component="legend">1. 选择分析类型</FormLabel>
                <RadioGroup row value={analysisType} onChange={(e) => setAnalysisType(e.target.value)}>
                    <FormControlLabel value="forward" control={<Radio />} label="正向预测" />
                    <FormControlLabel value="inverse" control={<Radio />} label="逆向分析" />
                    <FormControlLabel value="optimization" control={<Radio />} label="优化设计" />
                </RadioGroup>
            </FormControl>

            {/* Step 2: Configure based on type */}
            <Box>
                <FormLabel component="legend" sx={{ mb: 1 }}>2. 配置参数</FormLabel>
                {analysisType === 'forward' && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography>AI模型将根据当前设计进行快速性能预测。</Typography>
                        {/* Placeholder for AI model selection */}
                    </Paper>
                )}
                {analysisType === 'inverse' && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography sx={{ mb: 2 }}>上传现场监测数据，AI将反算并校准模型参数。</Typography>
                        <Button variant="contained" component="label">
                            上传数据
                            <input type="file" hidden />
                        </Button>
                    </Paper>
                )}
                {analysisType === 'optimization' && (
                    <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography sx={{ mb: 2 }}>设定优化目标和变量范围，AI将寻找最佳设计方案。</Typography>
                        <FormControl fullWidth sx={{ mb: 2 }}>
                            <InputLabel>优化目标</InputLabel>
                            <Select label="优化目标">
                                <MenuItem value="cost">成本最低</MenuItem>
                                <MenuItem value="displacement">关键位移最小</MenuItem>
                                <MenuItem value="safety">安全系数最大</MenuItem>
                            </Select>
                        </FormControl>
                        {areParametersLoading && <CircularProgress size={24} />}
                        {parameterError && <Alert severity="error">{parameterError}</Alert>}
                        {!areParametersLoading && !parameterError && editableParameters.length > 0 && (
                            <DesignVariableManager parameters={editableParameters} onParameterChange={handleParameterChange} />
                        )}
                    </Paper>
                )}
            </Box>
        </Box>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleTabChange} aria-label="analysis tabs" variant="fullWidth">
          <Tab icon={<AutoAwesomeIcon />} label="智能分析 (AI-Driven)" />
          <Tab icon={<TuneIcon />} label="专家模式 (Expert Mode)" />
        </Tabs>
      </Box>

      {/* Main Content Area */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <TabPanel value={value} index={0}>
          <AiDrivenAnalysisTab />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <ExpertModeTab />
        </TabPanel>
      </Box>

      {/* Bottom Action Area */}
      <Divider />
      <Box sx={{ p: 2 }}>
        {isLoading && <LinearProgress variant="determinate" value={progress} sx={{ mb: 2 }} />}
        <Button
          variant="contained"
          startIcon={<PlayArrowIcon />}
          onClick={handleRunAnalysis}
          disabled={isLoading}
          fullWidth
        >
          {isLoading ? `分析中... (${progress.toFixed(0)}%)` : '运行分析'}
        </Button>
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
};

export default AnalysisPanel; 