import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  Chip,
  Stack,
  LinearProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  ListItem,
  ListItemText,
  List,
} from '@mui/material';
import { styled } from '@mui/material/styles';
import { useParams } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { api } from '../utils/api';

// 样式
const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(3),
  marginBottom: theme.spacing(3),
}));

const ChartContainer = styled(Box)(({ theme }) => ({
  height: '300px',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
}));

const VisContainer = styled(Box)(({ theme }) => ({
  height: '400px',
  border: '1px solid #e0e0e0',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
  marginTop: theme.spacing(2),
  marginBottom: theme.spacing(2),
  background: '#f9f9f9',
  position: 'relative',
}));

const TabPanel = (props: any) => {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`physics-ai-tabpanel-${index}`}
      aria-labelledby={`physics-ai-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
};

// 物理AI页面组件
const PhysicsAIPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [projectData, setProjectData] = useState<any>(null);
  const [sensorData, setSensorData] = useState<any[]>([]);
  const [pinnModels, setPinnModels] = useState<any[]>([]);
  const [inverseAnalyses, setInverseAnalyses] = useState<any[]>([]);
  const [integratedAnalyses, setIntegratedAnalyses] = useState<any[]>([]);
  const [igaModels, setIgaModels] = useState<any[]>([]); // IGA模型列表
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [taskProgress, setTaskProgress] = useState(0);

  // PINN模型表单
  const [pinnForm, setPinnForm] = useState({
    name: '',
    pde_type: 'elasticity',
    layers: [20, 20, 20],
    iterations: 10000,
    learning_rate: 0.001,
  });

  // 反演分析表单
  const [inverseForm, setInverseForm] = useState({
    name: '',
    data_type: 'displacement',
    pde_type: 'elasticity',
    initial_params: {
      young_modulus: 2.0e7,
      poisson_ratio: 0.3,
    },
  });

  // 集成分析表单
  const [integratedForm, setIntegratedForm] = useState({
    name: '',
    sensor_data_config: {
      data_types: ['displacement', 'stress'],
      start_date: '',
      end_date: '',
    },
    pinn_config: {
      pde_type: 'elasticity',
      layers: [20, 20, 20],
      iterations: 1000,
    },
    cae_config: {
      num_threads: 2,
    },
    iga_model_id: '', // 集成的IGA模型ID
  });

  // PINN-IGA联合分析表单
  const [pinnIgaForm, setPinnIgaForm] = useState({
    name: '',
    iga_model_id: '',
    pinn_model_id: '',
    integration_type: 'boundary_condition',
    boundary_mapping: [],
    weight_factors: {
      iga_weight: 0.7,
      pinn_weight: 0.3
    },
    output_format: 'vtk',
    description: ''
  });

  // 处理标签切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 初始化
  useEffect(() => {
    if (projectId) {
      loadProjectData();
      loadSensorData();
      loadPinnModels();
      loadInverseAnalyses();
      loadIntegratedAnalyses();
      loadIgaModels();
    }
  }, [projectId]);

  // 加载项目数据
  const loadProjectData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      // 模拟API调用
      setTimeout(() => {
        setProjectData({
          id: Number(projectId),
          name: `深基坑工程 #${projectId}`,
          description: '示例深基坑工程项目',
          created_at: new Date().toISOString(),
          status: 'active'
        });
        setLoading(false);
      }, 1000);
    } catch (err: any) {
      setError(err.message || '加载项目数据失败');
      setLoading(false);
    }
  };

  // 加载传感器数据
  const loadSensorData = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // 模拟API调用
      setTimeout(() => {
        setSensorData([
          { id: 1, name: '位移传感器-1', type: 'displacement', location: [10, 5, -3], status: 'active' },
          { id: 2, name: '位移传感器-2', type: 'displacement', location: [15, 5, -5], status: 'active' },
          { id: 3, name: '应力传感器-1', type: 'stress', location: [10, 2, -2], status: 'active' },
          { id: 4, name: '水压传感器-1', type: 'pore_pressure', location: [12, 8, -4], status: 'active' }
        ]);
        setLoading(false);
      }, 800);
    } catch (err: any) {
      setError(err.message || '加载传感器数据失败');
      setLoading(false);
    }
  };

  // 加载PINN模型
  const loadPinnModels = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // 模拟API调用
      setTimeout(() => {
        setPinnModels([
          { 
            id: 1, 
            name: '位移场PINN', 
            pde_type: 'elasticity', 
            status: 'trained',
            trained_at: '2023-01-15T08:30:00Z',
            accuracy: 0.95
          },
          { 
            id: 2, 
            name: '应力场PINN', 
            pde_type: 'elasticity', 
            status: 'trained',
            trained_at: '2023-02-10T14:25:00Z',
            accuracy: 0.92
          }
        ]);
        setLoading(false);
      }, 600);
    } catch (err: any) {
      setError(err.message || '加载PINN模型失败');
      setLoading(false);
    }
  };

  // 加载IGA模型
  const loadIgaModels = async () => {
    if (!projectId) return;
    
    setLoading(true);

    try {
      // 模拟API调用
      setTimeout(() => {
        setIgaModels([
          { 
            id: 101, 
            name: '基坑模型-IGA', 
            analysis_type: 'structural', 
            status: 'completed',
            material_model: 'linear-elastic',
            nurbs_degree: [2, 2, 2],
            computed_at: '2023-03-05T10:15:00Z'
          },
          { 
            id: 102, 
            name: '支护结构-IGA', 
            analysis_type: 'structural', 
            status: 'completed',
            material_model: 'mohr-coulomb',
            nurbs_degree: [3, 3, 2],
            computed_at: '2023-03-10T14:40:00Z'
          }
        ]);
        setLoading(false);
      }, 700);
    } catch (err: any) {
      setError(err.message || '加载IGA模型失败');
      setLoading(false);
    }
  };

  // 加载反演分析
  const loadInverseAnalyses = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // 模拟API调用
      setTimeout(() => {
        setInverseAnalyses([
          { 
            id: 201, 
            name: '弹性参数反演', 
            pde_type: 'elasticity', 
            status: 'completed',
            created_at: '2023-04-15T09:20:00Z',
            results: {
              young_modulus: 2.5e7,
              poisson_ratio: 0.28
            }
          }
        ]);
        setLoading(false);
      }, 500);
    } catch (err: any) {
      setError(err.message || '加载反演分析失败');
      setLoading(false);
    }
  };

  // 加载集成分析
  const loadIntegratedAnalyses = async () => {
    if (!projectId) return;

    setLoading(true);

    try {
      // 模拟API调用
      setTimeout(() => {
        setIntegratedAnalyses([
          { 
            id: 301, 
            name: 'IGA-PINN集成分析-1', 
            status: 'completed',
            created_at: '2023-05-20T11:30:00Z',
            pinn_model_id: 1,
            iga_model_id: 101,
            description: '将PINN模型与IGA分析结果集成，增强边界条件精度'
          }
        ]);
        setLoading(false);
      }, 900);
    } catch (err: any) {
      setError(err.message || '加载集成分析失败');
      setLoading(false);
    }
  };

  // 创建PINN模型
  const handleCreatePinnModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);
    setActiveTask('creating_pinn');
    setTaskProgress(0);

    // 模拟任务进度
    const progressInterval = setInterval(() => {
      setTaskProgress(prev => {
        const newProgress = prev + 5;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 300);

    try {
      // 模拟API调用
      setTimeout(() => {
        const newModel = {
          id: pinnModels.length + 1 + 10,
          name: pinnForm.name,
          pde_type: pinnForm.pde_type,
          status: 'training',
          layers: pinnForm.layers,
          iterations: pinnForm.iterations,
          learning_rate: pinnForm.learning_rate,
          created_at: new Date().toISOString()
        };
        
        setPinnModels([...pinnModels, newModel]);
        setSuccess('PINN模型创建成功，开始训练...');
        setPinnForm({
          ...pinnForm,
          name: '',
        });
        
        clearInterval(progressInterval);
        setTaskProgress(100);
        
        // 模拟训练完成
        setTimeout(() => {
          setPinnModels(prev => prev.map(model => 
            model.id === newModel.id 
              ? {...model, status: 'trained', trained_at: new Date().toISOString(), accuracy: 0.93}
              : model
          ));
          setSuccess('PINN模型训练完成！');
          setActiveTask(null);
        }, 3000);
        
        setLoading(false);
      }, 2000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'PINN模型创建失败');
      setLoading(false);
      setActiveTask(null);
    }
  };

  // 创建PINN-IGA联合分析
  const handleCreatePinnIgaAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);
    setActiveTask('creating_pinn_iga');
    setTaskProgress(0);

    // 模拟任务进度
    const progressInterval = setInterval(() => {
      setTaskProgress(prev => {
        const newProgress = prev + 2;
        if (newProgress >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return newProgress;
      });
    }, 200);

    try {
      // 模拟API调用
      setTimeout(() => {
        const newAnalysis = {
          id: integratedAnalyses.length + 1 + 310,
          name: pinnIgaForm.name,
          status: 'processing',
          created_at: new Date().toISOString(),
          pinn_model_id: parseInt(pinnIgaForm.pinn_model_id),
          iga_model_id: parseInt(pinnIgaForm.iga_model_id),
          integration_type: pinnIgaForm.integration_type,
          description: pinnIgaForm.description || '将PINN模型与IGA分析结合'
        };
        
        setIntegratedAnalyses([...integratedAnalyses, newAnalysis]);
        setSuccess('PINN-IGA联合分析任务创建成功，正在处理...');
        setPinnIgaForm({
          ...pinnIgaForm,
          name: '',
          description: ''
        });
        
        // 模拟处理完成
        setTimeout(() => {
          setIntegratedAnalyses(prev => prev.map(analysis => 
            analysis.id === newAnalysis.id 
              ? {...analysis, status: 'completed', completed_at: new Date().toISOString()}
              : analysis
          ));
          setSuccess('PINN-IGA联合分析完成！');
          clearInterval(progressInterval);
          setTaskProgress(100);
          setActiveTask(null);
        }, 8000);
        
        setLoading(false);
      }, 2000);
    } catch (err: any) {
      clearInterval(progressInterval);
      setError(err.message || 'PINN-IGA联合分析创建失败');
      setLoading(false);
      setActiveTask(null);
    }
  };

  // 表单变更处理
  const handlePinnFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPinnForm({ ...pinnForm, [name]: value });
  };

  const handlePinnIgaFormChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const { name, value } = e.target as { name?: string; value: unknown };
    if (name) {
      setPinnIgaForm({ ...pinnIgaForm, [name]: value });
    }
  };

  // 渲染PINN-IGA联合分析表单
  const renderPinnIgaForm = () => {
    return (
      <Box component="form" onSubmit={handleCreatePinnIgaAnalysis} sx={{ mt: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <TextField
              name="name"
              label="分析名称"
              fullWidth
              required
              value={pinnIgaForm.name}
              onChange={handlePinnIgaFormChange}
              disabled={loading}
              margin="normal"
            />

            <FormControl fullWidth margin="normal">
              <InputLabel id="pinn-model-label">PINN模型</InputLabel>
              <Select
                labelId="pinn-model-label"
                name="pinn_model_id"
                value={pinnIgaForm.pinn_model_id}
                onChange={handlePinnIgaFormChange}
                disabled={loading}
                required
              >
                <MenuItem value="">请选择PINN模型</MenuItem>
                {pinnModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} ({model.pde_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="iga-model-label">IGA模型</InputLabel>
              <Select
                labelId="iga-model-label"
                name="iga_model_id"
                value={pinnIgaForm.iga_model_id}
                onChange={handlePinnIgaFormChange}
                disabled={loading}
                required
              >
                <MenuItem value="">请选择IGA模型</MenuItem>
                {igaModels.map((model) => (
                  <MenuItem key={model.id} value={model.id}>
                    {model.name} ({model.analysis_type})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={6}>
            <FormControl fullWidth margin="normal">
              <InputLabel id="integration-type-label">集成类型</InputLabel>
              <Select
                labelId="integration-type-label"
                name="integration_type"
                value={pinnIgaForm.integration_type}
                onChange={handlePinnIgaFormChange}
                disabled={loading}
              >
                <MenuItem value="boundary_condition">边界条件增强</MenuItem>
                <MenuItem value="full_domain">全域集成</MenuItem>
                <MenuItem value="subregion_mapping">子区域映射</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth margin="normal">
              <InputLabel id="output-format-label">输出格式</InputLabel>
              <Select
                labelId="output-format-label"
                name="output_format"
                value={pinnIgaForm.output_format}
                onChange={handlePinnIgaFormChange}
                disabled={loading}
              >
                <MenuItem value="vtk">VTK</MenuItem>
                <MenuItem value="json">JSON</MenuItem>
                <MenuItem value="csv">CSV</MenuItem>
              </Select>
            </FormControl>

            <TextField
              name="description"
              label="分析描述"
              fullWidth
              multiline
              rows={4}
              value={pinnIgaForm.description}
              onChange={handlePinnIgaFormChange}
              disabled={loading}
              margin="normal"
            />
          </Grid>

          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading}
              fullWidth
            >
              {loading && activeTask === 'creating_pinn_iga' ? (
                <CircularProgress size={24} color="inherit" />
              ) : (
                '创建PINN-IGA联合分析'
              )}
            </Button>
          </Grid>
        </Grid>
      </Box>
    );
  };

  // 渲染PINN-IGA联合分析结果列表
  const renderPinnIgaResults = () => {
    return (
      <Box sx={{ mt: 2 }}>
        {integratedAnalyses.length === 0 ? (
          <Typography color="text.secondary" align="center">
            暂无联合分析结果
          </Typography>
        ) : (
          <Grid container spacing={3}>
            {integratedAnalyses.map((analysis) => (
              <Grid item xs={12} md={6} key={analysis.id}>
                <Card>
                  <CardHeader
                    title={analysis.name}
                    subheader={`创建于 ${new Date(analysis.created_at).toLocaleString()}`}
                    action={
                      <Chip
                        label={analysis.status === 'completed' ? '已完成' : '处理中'}
                        color={analysis.status === 'completed' ? 'success' : 'warning'}
                        size="small"
                      />
                    }
                  />
                  <CardContent>
                    <Grid container spacing={2}>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          PINN模型: #{analysis.pinn_model_id}
                        </Typography>
                      </Grid>
                      <Grid item xs={6}>
                        <Typography variant="body2" color="text.secondary">
                          IGA模型: #{analysis.iga_model_id}
                        </Typography>
                      </Grid>
                      <Grid item xs={12}>
                        <Typography variant="body2">
                          {analysis.description}
                        </Typography>
                      </Grid>
                      {analysis.status === 'completed' && (
                        <Grid item xs={12} sx={{ mt: 1 }}>
                          <Button size="small" variant="outlined" sx={{ mr: 1 }}>
                            查看结果
                          </Button>
                          <Button size="small" variant="outlined">
                            导出数据
                          </Button>
                        </Grid>
                      )}
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}
      </Box>
    );
  };

  return (
    <MainLayout>
      <Container maxWidth="xl">
        <Box sx={{ py: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            物理AI系统
          </Typography>

          <StyledPaper>
            <Tabs value={tabValue} onChange={handleTabChange} aria-label="物理AI标签页" sx={{ mb: 3 }}>
              <Tab label="监测数据" />
              <Tab label="PINN模型" />
              <Tab label="IGA-PINN联合分析" />
              <Tab label="反演分析" />
            </Tabs>

            {error && (
              <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
                {error}
              </Alert>
            )}

            {success && (
              <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>
                {success}
              </Alert>
            )}

            {activeTask && (
              <Box sx={{ width: '100%', mb: 2 }}>
                <LinearProgress variant="determinate" value={taskProgress} />
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                  任务进度: {taskProgress}%
                </Typography>
              </Box>
            )}

            <TabPanel value={tabValue} index={0}>
              <Typography variant="h6" gutterBottom>
                项目传感器监测数据
              </Typography>

              {loading ? (
                <CircularProgress />
              ) : (
                <>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader title="传感器列表" />
                        <CardContent>
                          <List>
                            {sensorData.map((sensor) => (
                              <ListItem key={sensor.id}>
                                <ListItemText
                                  primary={sensor.name}
                                  secondary={`类型: ${sensor.type} | 位置: [${sensor.location.join(', ')}]`}
                                />
                                <Chip
                                  label={sensor.status === 'active' ? '活跃' : '离线'}
                                  color={sensor.status === 'active' ? 'success' : 'default'}
                                  size="small"
                                />
                              </ListItem>
                            ))}
                          </List>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <Card>
                        <CardHeader title="监测数据统计" />
                        <CardContent>
                          <ChartContainer>
                            <Typography color="text.secondary" align="center">
                              这里是传感器数据图表
                            </Typography>
                          </ChartContainer>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={1}>
              <Typography variant="h6" gutterBottom>
                PINN模型管理
              </Typography>

              {loading && activeTask === 'creating_pinn' ? (
                <CircularProgress />
              ) : (
                <>
                  <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                      <Card>
                        <CardHeader title="创建PINN模型" />
                        <CardContent>
                          <form onSubmit={handleCreatePinnModel}>
                            <TextField
                              fullWidth
                              margin="normal"
                              label="模型名称"
                              name="name"
                              value={pinnForm.name}
                              onChange={handlePinnFormChange}
                              required
                            />

                            <FormControl fullWidth margin="normal">
                              <InputLabel>PDE类型</InputLabel>
                              <Select
                                name="pde_type"
                                value={pinnForm.pde_type}
                                onChange={(e) => setPinnForm({
                                  ...pinnForm,
                                  pde_type: e.target.value as string,
                                })}
                              >
                                <MenuItem value="elasticity">弹性力学</MenuItem>
                                <MenuItem value="seepage">渗流</MenuItem>
                                <MenuItem value="consolidation">固结</MenuItem>
                              </Select>
                            </FormControl>

                            <TextField
                              fullWidth
                              margin="normal"
                              label="迭代次数"
                              name="iterations"
                              type="number"
                              value={pinnForm.iterations}
                              onChange={handlePinnFormChange}
                            />

                            <TextField
                              fullWidth
                              margin="normal"
                              label="学习率"
                              name="learning_rate"
                              type="number"
                              value={pinnForm.learning_rate}
                              onChange={handlePinnFormChange}
                            />

                            <Button
                              variant="contained"
                              color="primary"
                              fullWidth
                              sx={{ mt: 2 }}
                              type="submit"
                              disabled={loading}
                            >
                              {loading ? <CircularProgress size={24} /> : '创建模型'}
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                      <Card>
                        <CardHeader title="现有PINN模型" />
                        <CardContent>
                          {pinnModels.length === 0 ? (
                            <Typography color="text.secondary" align="center">
                              暂无PINN模型
                            </Typography>
                          ) : (
                            <Grid container spacing={2}>
                              {pinnModels.map((model) => (
                                <Grid item xs={12} sm={6} key={model.id}>
                                  <Card variant="outlined">
                                    <CardContent>
                                      <Typography variant="subtitle1" gutterBottom>
                                        {model.name}
                                      </Typography>
                                      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                        <Chip
                                          label={model.status === 'trained' ? '已训练' : '训练中'}
                                          color={model.status === 'trained' ? 'success' : 'warning'}
                                          size="small"
                                        />
                                        <Chip
                                          label={`PDE: ${model.pde_type}`}
                                          size="small"
                                        />
                                      </Stack>
                                      {model.status === 'trained' && (
                                        <>
                                          <Typography variant="body2" color="text.secondary" gutterBottom>
                                            精度: {(model.accuracy * 100).toFixed(2)}%
                                          </Typography>
                                          <Typography variant="body2" color="text.secondary">
                                            训练于: {new Date(model.trained_at).toLocaleString()}
                                          </Typography>
                                        </>
                                      )}
                                    </CardContent>
                                  </Card>
                                </Grid>
                              ))}
                            </Grid>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </>
              )}
            </TabPanel>

            <TabPanel value={tabValue} index={2}>
              <Typography variant="h6" gutterBottom>
                IGA-PINN联合分析
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={5}>
                  <Card>
                    <CardHeader title="创建联合分析" />
                    <CardContent>
                      {renderPinnIgaForm()}
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={12} md={7}>
                  <Card>
                    <CardHeader title="联合分析结果" />
                    <CardContent>
                      {renderPinnIgaResults()}
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </TabPanel>

            <TabPanel value={tabValue} index={3}>
              <Typography variant="h6" gutterBottom>
                反演分析
              </Typography>
              <Typography color="text.secondary">
                通过物理模型和监测数据反演材料参数和边界条件
              </Typography>
              <VisContainer>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  height: '100%'
                }}>
                  <Typography color="text.secondary">
                    反演分析可视化区域
                  </Typography>
                </Box>
              </VisContainer>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  反演分析结果
                </Typography>
                <Grid container spacing={2}>
                  {inverseAnalyses.map((analysis) => (
                    <Grid item xs={12} md={6} key={analysis.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1" gutterBottom>
                            {analysis.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            创建于: {new Date(analysis.created_at).toLocaleString()}
                          </Typography>
                          <Divider sx={{ my: 1 }} />
                          <Typography variant="subtitle2" gutterBottom>
                            反演结果
                          </Typography>
                          {analysis.results && (
                            <List dense>
                              {Object.entries(analysis.results).map(([key, value]) => (
                                <ListItem key={key}>
                                  <ListItemText 
                                    primary={`${key}: ${value}`}
                                  />
                                </ListItem>
                              ))}
                            </List>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </Box>
            </TabPanel>
          </StyledPaper>
        </Box>
      </Container>
    </MainLayout>
  );
};

export default PhysicsAIPage;




