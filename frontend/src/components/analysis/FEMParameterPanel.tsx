/**
 * @file FEMParameterPanel.tsx
 * @description FEM分析参数控制面板
 * @author Deep Excavation Team
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Slider,
  Button,
  ButtonGroup,
  Divider,
  Chip,
  Alert,
  LinearProgress,
  Grid,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  ExpandMore,
  Engineering,
  Settings,
  Speed,
  CheckCircle,
  Warning,
  Info,
  Refresh,
  Save,
  PlayArrow
} from '@mui/icons-material';
import { useFigmaTheme } from '../theme/FigmaThemeProvider';

interface FEMParameterPanelProps {
  projectId?: string;
  onParameterChange?: (parameters: any) => void;
  onAnalysisRun?: (config: any) => void;
  open?: boolean;
  onClose?: () => void;
}

interface SolverSettings {
  application: string;
  solver_type: string;
  convergence_criteria: string;
  max_iterations: number;
  tolerance: number;
  time_integration: string;
}

interface MaterialModel {
  type: string;
  parameters: Record<string, number>;
  name: string;
  description: string;
}

interface BoundaryCondition {
  type: string;
  location: string;
  value: number;
  direction: string;
}

const FEMParameterPanel: React.FC<FEMParameterPanelProps> = ({
  projectId,
  onParameterChange,
  onAnalysisRun,
  open = true,
  onClose
}) => {
  const { tokens } = useFigmaTheme();
  
  // 状态管理
  const [solverSettings, setSolverSettings] = useState<SolverSettings>({
    application: 'GeoMechanicsApplication',
    solver_type: 'linear',
    convergence_criteria: 'displacement',
    max_iterations: 100,
    tolerance: 1e-6,
    time_integration: 'implicit'
  });

  const [materialModels, setMaterialModels] = useState<MaterialModel[]>([
    {
      type: 'Mohr-Coulomb',
      name: '粘性土',
      description: '典型粘性土参数',
      parameters: {
        cohesion: 20.0,
        friction_angle: 25.0,
        dilatancy_angle: 0.0,
        elastic_modulus: 30000,
        poisson_ratio: 0.3
      }
    }
  ]);

  const [boundaryConditions, setBoundaryConditions] = useState<BoundaryCondition[]>([]);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalysisRunning, setIsAnalysisRunning] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Kratos应用程序列表
  const kratosApplications = [
    { value: 'GeoMechanicsApplication', label: '地质力学分析', icon: '🌍' },
    { value: 'PoromechanicsApplication', label: '多孔介质力学', icon: '💧' },
    { value: 'StructuralMechanicsApplication', label: '结构力学分析', icon: '🏗️' },
    { value: 'FluidDynamicsApplication', label: '流体力学计算', icon: '🌊' },
    { value: 'ContactStructuralMechanicsApplication', label: '接触非线性分析', icon: '🤝' },
    { value: 'FSIApplication', label: '流固耦合分析', icon: '🔄' },
    { value: 'LinearSolversApplication', label: '高效线性求解器', icon: '⚡' },
    { value: 'MeshingApplication', label: '网格生成', icon: '📐' },
    { value: 'MeshMovingApplication', label: '动网格技术', icon: '🌐' },
    { value: 'MappingApplication', label: '数据映射', icon: '🗺️' },
    { value: 'ConvectionDiffusionApplication', label: '对流扩散传热', icon: '🌡️' }
  ];

  // 本构模型类型
  const constitutiveModels = [
    { value: 'linear_elastic', label: '线性弹性' },
    { value: 'mohr_coulomb', label: 'Mohr-Coulomb' },
    { value: 'drucker_prager', label: 'Drucker-Prager' },
    { value: 'cam_clay', label: 'Cam-Clay' },
    { value: 'modified_cam_clay', label: '修正Cam-Clay' },
    { value: 'hardening_soil', label: '硬化土模型' }
  ];

  // 参数验证
  const validateParameters = () => {
    const errors: string[] = [];
    
    if (solverSettings.tolerance <= 0) {
      errors.push('求解精度必须大于0');
    }
    
    if (solverSettings.max_iterations <= 0) {
      errors.push('最大迭代次数必须大于0');
    }

    materialModels.forEach((material, index) => {
      if (material.parameters.elastic_modulus <= 0) {
        errors.push(`材料${index + 1}的弹性模量必须大于0`);
      }
      if (material.parameters.poisson_ratio < 0 || material.parameters.poisson_ratio >= 0.5) {
        errors.push(`材料${index + 1}的泊松比必须在0到0.5之间`);
      }
    });

    setValidationErrors(errors);
    return errors.length === 0;
  };

  // 运行分析
  const handleRunAnalysis = () => {
    if (!validateParameters()) {
      return;
    }

    setIsAnalysisRunning(true);
    setAnalysisProgress(0);

    const analysisConfig = {
      solver: solverSettings,
      materials: materialModels,
      boundaries: boundaryConditions,
      project_id: projectId
    };

    // 模拟分析进度
    const progressInterval = setInterval(() => {
      setAnalysisProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsAnalysisRunning(false);
          return 100;
        }
        return prev + 10;
      });
    }, 500);

    onAnalysisRun?.(analysisConfig);
  };

  // 参数变化处理
  useEffect(() => {
    const parameters = {
      solver: solverSettings,
      materials: materialModels,
      boundaries: boundaryConditions
    };
    
    onParameterChange?.(parameters);
    validateParameters();
  }, [solverSettings, materialModels, boundaryConditions]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题栏 */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center">
            <Engineering color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">FEM分析参数</Typography>
          </Box>
          <Box>
            <Tooltip title="保存参数">
              <IconButton size="small">
                <Save />
              </IconButton>
            </Tooltip>
            <Tooltip title="刷新参数">
              <IconButton size="small">
                <Refresh />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 参数面板 */}
      <Box sx={{ flex: 1, overflow: 'auto' }}>
        {/* 验证错误提示 */}
        {validationErrors.length > 0 && (
          <Alert severity="error" sx={{ mb: 2 }}>
            <Typography variant="subtitle2">参数验证错误：</Typography>
            {validationErrors.map((error, index) => (
              <Typography key={index} variant="body2">• {error}</Typography>
            ))}
          </Alert>
        )}

        {/* Kratos求解器设置 */}
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center">
              <Settings sx={{ mr: 1 }} />
              <Typography variant="subtitle1">Kratos求解器设置</Typography>
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <FormControl fullWidth>
                  <InputLabel>Kratos应用程序</InputLabel>
                  <Select
                    value={solverSettings.application}
                    onChange={(e) => setSolverSettings(prev => ({
                      ...prev,
                      application: e.target.value
                    }))}
                  >
                    {kratosApplications.map((app) => (
                      <MenuItem key={app.value} value={app.value}>
                        <Box display="flex" alignItems="center">
                          <span style={{ marginRight: 8 }}>{app.icon}</span>
                          {app.label}
                        </Box>
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>求解器类型</InputLabel>
                  <Select
                    value={solverSettings.solver_type}
                    onChange={(e) => setSolverSettings(prev => ({
                      ...prev,
                      solver_type: e.target.value
                    }))}
                  >
                    <MenuItem value="linear">线性求解器</MenuItem>
                    <MenuItem value="nonlinear">非线性求解器</MenuItem>
                    <MenuItem value="dynamic">动力求解器</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel>收敛准则</InputLabel>
                  <Select
                    value={solverSettings.convergence_criteria}
                    onChange={(e) => setSolverSettings(prev => ({
                      ...prev,
                      convergence_criteria: e.target.value
                    }))}
                  >
                    <MenuItem value="displacement">位移收敛</MenuItem>
                    <MenuItem value="force">力收敛</MenuItem>
                    <MenuItem value="energy">能量收敛</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="最大迭代次数"
                  type="number"
                  value={solverSettings.max_iterations}
                  onChange={(e) => setSolverSettings(prev => ({
                    ...prev,
                    max_iterations: parseInt(e.target.value)
                  }))}
                />
              </Grid>

              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="收敛精度"
                  type="number"
                  inputProps={{ step: 1e-8 }}
                  value={solverSettings.tolerance}
                  onChange={(e) => setSolverSettings(prev => ({
                    ...prev,
                    tolerance: parseFloat(e.target.value)
                  }))}
                />
              </Grid>
            </Grid>
          </AccordionDetails>
        </Accordion>

        {/* 材料模型设置 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center">
                <Engineering sx={{ mr: 1 }} />
                <Typography variant="subtitle1">材料本构模型</Typography>
              </Box>
              <Chip 
                size="small" 
                label={`${materialModels.length} 个材料`}
                color="primary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            {materialModels.map((material, index) => (
              <Card key={index} variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                  <Typography variant="subtitle2" gutterBottom>
                    {material.name} ({material.type})
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {material.description}
                  </Typography>
                  
                  <Grid container spacing={2}>
                    {material.type === 'Mohr-Coulomb' && (
                      <>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="粘聚力 c (kPa)"
                            type="number"
                            value={material.parameters.cohesion}
                            onChange={(e) => {
                              const newMaterials = [...materialModels];
                              newMaterials[index].parameters.cohesion = parseFloat(e.target.value);
                              setMaterialModels(newMaterials);
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="内摩擦角 φ (°)"
                            type="number"
                            value={material.parameters.friction_angle}
                            onChange={(e) => {
                              const newMaterials = [...materialModels];
                              newMaterials[index].parameters.friction_angle = parseFloat(e.target.value);
                              setMaterialModels(newMaterials);
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="弹性模量 E (kPa)"
                            type="number"
                            value={material.parameters.elastic_modulus}
                            onChange={(e) => {
                              const newMaterials = [...materialModels];
                              newMaterials[index].parameters.elastic_modulus = parseFloat(e.target.value);
                              setMaterialModels(newMaterials);
                            }}
                          />
                        </Grid>
                        <Grid item xs={6}>
                          <TextField
                            fullWidth
                            label="泊松比 ν"
                            type="number"
                            inputProps={{ step: 0.01, min: 0, max: 0.49 }}
                            value={material.parameters.poisson_ratio}
                            onChange={(e) => {
                              const newMaterials = [...materialModels];
                              newMaterials[index].parameters.poisson_ratio = parseFloat(e.target.value);
                              setMaterialModels(newMaterials);
                            }}
                          />
                        </Grid>
                      </>
                    )}
                  </Grid>
                </CardContent>
              </Card>
            ))}
            
            <Button
              variant="outlined"
              startIcon={<Engineering />}
              onClick={() => {
                setMaterialModels(prev => [...prev, {
                  type: 'Mohr-Coulomb',
                  name: `材料${prev.length + 1}`,
                  description: '新建材料',
                  parameters: {
                    cohesion: 10.0,
                    friction_angle: 30.0,
                    dilatancy_angle: 0.0,
                    elastic_modulus: 20000,
                    poisson_ratio: 0.3
                  }
                }]);
              }}
            >
              添加材料
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* 边界条件设置 */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
              <Box display="flex" alignItems="center">
                <Settings sx={{ mr: 1 }} />
                <Typography variant="subtitle1">边界条件</Typography>
              </Box>
              <Chip 
                size="small" 
                label={`${boundaryConditions.length} 个条件`}
                color="secondary"
                variant="outlined"
              />
            </Box>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" color="text.secondary">
              边界条件将在几何模型中图形化设置
            </Typography>
          </AccordionDetails>
        </Accordion>
      </Box>

      {/* 底部操作栏 */}
      <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
        {isAnalysisRunning && (
          <Box sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" justifyContent="space-between">
              <Typography variant="body2">FEM分析进度</Typography>
              <Typography variant="body2">{analysisProgress}%</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={analysisProgress} 
              sx={{ mt: 1 }}
            />
          </Box>
        )}
        
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box display="flex" alignItems="center">
            {validationErrors.length === 0 ? (
              <Chip 
                icon={<CheckCircle />}
                label="参数验证通过"
                color="success"
                variant="outlined"
                size="small"
              />
            ) : (
              <Chip 
                icon={<Warning />}
                label={`${validationErrors.length} 个错误`}
                color="error"
                variant="outlined"
                size="small"
              />
            )}
          </Box>
          
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleRunAnalysis}
            disabled={isAnalysisRunning || validationErrors.length > 0}
            color="primary"
          >
            {isAnalysisRunning ? '分析中...' : '运行FEM分析'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default FEMParameterPanel;
