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
  });

  // 处理标签切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 加载项目数据
  const loadProjectData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/projects/${projectId}`);
      setProjectData(response.data);
    } catch (err: any) {
      setError(err.message || '加载项目数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载传感器数据
  const loadSensorData = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/projects/${projectId}/sensor_data`);
      setSensorData(response.data);
    } catch (err: any) {
      setError(err.message || '加载传感器数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载PINN模型
  const loadPinnModels = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/projects/${projectId}/pinn_models`);
      setPinnModels(response.data);
    } catch (err: any) {
      setError(err.message || '加载PINN模型失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载反演分析
  const loadInverseAnalyses = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/projects/${projectId}/inverse_analyses`);
      setInverseAnalyses(response.data);
    } catch (err: any) {
      setError(err.message || '加载反演分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 加载集成分析
  const loadIntegratedAnalyses = async () => {
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.get(`/api/projects/${projectId}/integrated_analyses`);
      setIntegratedAnalyses(response.data);
    } catch (err: any) {
      setError(err.message || '加载集成分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建PINN模型
  const handleCreatePinnModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/api/projects/${projectId}/pinn_models`, pinnForm);
      setPinnModels([...pinnModels, response.data]);
      setSuccess('PINN模型创建成功');
      setPinnForm({
        ...pinnForm,
        name: '',
      });
    } catch (err: any) {
      setError(err.message || 'PINN模型创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建反演分析
  const handleCreateInverseAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/api/projects/${projectId}/inverse_analyses`, inverseForm);
      setInverseAnalyses([...inverseAnalyses, response.data]);
      setSuccess('反演分析创建成功');
      setInverseForm({
        ...inverseForm,
        name: '',
      });
    } catch (err: any) {
      setError(err.message || '反演分析创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 创建集成分析
  const handleCreateIntegratedAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setLoading(true);
    setError(null);

    try {
      const response = await api.post(`/api/projects/${projectId}/integrated_analyses`, integratedForm);
      setIntegratedAnalyses([...integratedAnalyses, response.data]);
      setSuccess('集成分析创建成功');
      setIntegratedForm({
        ...integratedForm,
        name: '',
      });
    } catch (err: any) {
      setError(err.message || '集成分析创建失败');
    } finally {
      setLoading(false);
    }
  };

  // 处理PINN表单变化
  const handlePinnFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPinnForm({
      ...pinnForm,
      [name]: value,
    });
  };

  // 处理反演分析表单变化
  const handleInverseFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setInverseForm({
      ...inverseForm,
      [name]: value,
    });
  };

  // 处理集成分析表单变化
  const handleIntegratedFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setIntegratedForm({
      ...integratedForm,
      [name]: value,
    });
  };

  // 初始化
  useEffect(() => {
    loadProjectData();
    loadSensorData();
    loadPinnModels();
    loadInverseAnalyses();
    loadIntegratedAnalyses();
  }, [projectId]);

  return (
    <MainLayout>
      <Container maxWidth="lg">
        <Typography variant="h4" gutterBottom>
          物理AI系统
        </Typography>

        <StyledPaper>
          <Tabs value={tabValue} onChange={handleTabChange} aria-label="physics ai tabs">
            <Tab label="传感器数据" id="physics-ai-tab-0" />
            <Tab label="PINN模型" id="physics-ai-tab-1" />
            <Tab label="反演分析" id="physics-ai-tab-2" />
            <Tab label="集成分析" id="physics-ai-tab-3" />
          </Tabs>

          {/* 传感器数据 */}
          <TabPanel value={tabValue} index={0}>
            <Typography variant="h6" gutterBottom>
              传感器数据管理
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="数据上传" />
                  <CardContent>
                    <form>
                      <FormControl fullWidth margin="normal">
                        <InputLabel>数据类型</InputLabel>
                        <Select defaultValue="displacement">
                          <MenuItem value="displacement">位移</MenuItem>
                          <MenuItem value="stress">应力</MenuItem>
                          <MenuItem value="strain">应变</MenuItem>
                          <MenuItem value="water_level">水位</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        margin="normal"
                        variant="outlined"
                        type="file"
                        InputLabelProps={{ shrink: true }}
                        label="数据文件"
                      />

                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                      >
                        上传数据
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="数据预览" />
                  <CardContent>
                    {sensorData.length > 0 ? (
                      <ChartContainer>
                        <Typography>数据图表将在此处显示</Typography>
                      </ChartContainer>
                    ) : (
                      <Typography>暂无传感器数据</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12}>
                <Card>
                  <CardHeader title="传感器数据列表" />
                  <CardContent>
                    {sensorData.length > 0 ? (
                      <Typography>数据表格将在此处显示</Typography>
                    ) : (
                      <Typography>暂无传感器数据</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* PINN模型 */}
          <TabPanel value={tabValue} index={1}>
            <Typography variant="h6" gutterBottom>
              PINN模型管理
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
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

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="PINN模型列表" />
                  <CardContent>
                    {pinnModels.length > 0 ? (
                      pinnModels.map((model) => (
                        <Paper key={model.id} sx={{ p: 2, mb: 2 }}>
                          <Typography variant="h6">{model.name}</Typography>
                          <Typography variant="body2">PDE类型: {model.pde_type}</Typography>
                          <Typography variant="body2">状态: {model.status}</Typography>
                          <Typography variant="body2">
                            创建时间: {new Date(model.created_at).toLocaleString()}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            查看详情
                          </Button>
                        </Paper>
                      ))
                    ) : (
                      <Typography>暂无PINN模型</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* 反演分析 */}
          <TabPanel value={tabValue} index={2}>
            <Typography variant="h6" gutterBottom>
              反演分析管理
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="创建反演分析" />
                  <CardContent>
                    <form onSubmit={handleCreateInverseAnalysis}>
                      <TextField
                        fullWidth
                        margin="normal"
                        label="分析名称"
                        name="name"
                        value={inverseForm.name}
                        onChange={handleInverseFormChange}
                        required
                      />

                      <FormControl fullWidth margin="normal">
                        <InputLabel>数据类型</InputLabel>
                        <Select
                          name="data_type"
                          value={inverseForm.data_type}
                          onChange={(e) => setInverseForm({
                            ...inverseForm,
                            data_type: e.target.value as string,
                          })}
                        >
                          <MenuItem value="displacement">位移</MenuItem>
                          <MenuItem value="stress">应力</MenuItem>
                          <MenuItem value="strain">应变</MenuItem>
                          <MenuItem value="water_level">水位</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>PDE类型</InputLabel>
                        <Select
                          name="pde_type"
                          value={inverseForm.pde_type}
                          onChange={(e) => setInverseForm({
                            ...inverseForm,
                            pde_type: e.target.value as string,
                          })}
                        >
                          <MenuItem value="elasticity">弹性力学</MenuItem>
                          <MenuItem value="seepage">渗流</MenuItem>
                          <MenuItem value="consolidation">固结</MenuItem>
                        </Select>
                      </FormControl>

                      <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        初始参数
                      </Typography>
                      <TextField
                        fullWidth
                        margin="normal"
                        label="弹性模量"
                        name="young_modulus"
                        type="number"
                        value={inverseForm.initial_params.young_modulus}
                        onChange={(e) => setInverseForm({
                          ...inverseForm,
                          initial_params: {
                            ...inverseForm.initial_params,
                            young_modulus: Number(e.target.value),
                          },
                        })}
                      />

                      <TextField
                        fullWidth
                        margin="normal"
                        label="泊松比"
                        name="poisson_ratio"
                        type="number"
                        value={inverseForm.initial_params.poisson_ratio}
                        onChange={(e) => setInverseForm({
                          ...inverseForm,
                          initial_params: {
                            ...inverseForm.initial_params,
                            poisson_ratio: Number(e.target.value),
                          },
                        })}
                      />

                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : '创建分析'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="反演分析列表" />
                  <CardContent>
                    {inverseAnalyses.length > 0 ? (
                      inverseAnalyses.map((analysis) => (
                        <Paper key={analysis.id} sx={{ p: 2, mb: 2 }}>
                          <Typography variant="h6">{analysis.name}</Typography>
                          <Typography variant="body2">数据类型: {analysis.data_type}</Typography>
                          <Typography variant="body2">状态: {analysis.status}</Typography>
                          <Typography variant="body2">
                            创建时间: {new Date(analysis.created_at).toLocaleString()}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            查看结果
                          </Button>
                        </Paper>
                      ))
                    ) : (
                      <Typography>暂无反演分析</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>

          {/* 集成分析 */}
          <TabPanel value={tabValue} index={3}>
            <Typography variant="h6" gutterBottom>
              集成分析管理
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="创建集成分析" />
                  <CardContent>
                    <form onSubmit={handleCreateIntegratedAnalysis}>
                      <TextField
                        fullWidth
                        margin="normal"
                        label="分析名称"
                        name="name"
                        value={integratedForm.name}
                        onChange={handleIntegratedFormChange}
                        required
                      />

                      <Typography variant="subtitle1" sx={{ mt: 2 }}>
                        传感器数据配置
                      </Typography>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>数据类型</InputLabel>
                        <Select
                          multiple
                          value={integratedForm.sensor_data_config.data_types}
                          onChange={(e) => setIntegratedForm({
                            ...integratedForm,
                            sensor_data_config: {
                              ...integratedForm.sensor_data_config,
                              data_types: e.target.value as string[],
                            },
                          })}
                          renderValue={(selected) => (selected as string[]).join(', ')}
                        >
                          <MenuItem value="displacement">位移</MenuItem>
                          <MenuItem value="stress">应力</MenuItem>
                          <MenuItem value="strain">应变</MenuItem>
                          <MenuItem value="water_level">水位</MenuItem>
                        </Select>
                      </FormControl>

                      <TextField
                        fullWidth
                        margin="normal"
                        label="开始日期"
                        name="start_date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={integratedForm.sensor_data_config.start_date}
                        onChange={(e) => setIntegratedForm({
                          ...integratedForm,
                          sensor_data_config: {
                            ...integratedForm.sensor_data_config,
                            start_date: e.target.value,
                          },
                        })}
                      />

                      <TextField
                        fullWidth
                        margin="normal"
                        label="结束日期"
                        name="end_date"
                        type="date"
                        InputLabelProps={{ shrink: true }}
                        value={integratedForm.sensor_data_config.end_date}
                        onChange={(e) => setIntegratedForm({
                          ...integratedForm,
                          sensor_data_config: {
                            ...integratedForm.sensor_data_config,
                            end_date: e.target.value,
                          },
                        })}
                      />

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle1">
                        PINN配置
                      </Typography>

                      <FormControl fullWidth margin="normal">
                        <InputLabel>PDE类型</InputLabel>
                        <Select
                          name="pde_type"
                          value={integratedForm.pinn_config.pde_type}
                          onChange={(e) => setIntegratedForm({
                            ...integratedForm,
                            pinn_config: {
                              ...integratedForm.pinn_config,
                              pde_type: e.target.value as string,
                            },
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
                        value={integratedForm.pinn_config.iterations}
                        onChange={(e) => setIntegratedForm({
                          ...integratedForm,
                          pinn_config: {
                            ...integratedForm.pinn_config,
                            iterations: Number(e.target.value),
                          },
                        })}
                      />

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="subtitle1">
                        CAE配置
                      </Typography>

                      <TextField
                        fullWidth
                        margin="normal"
                        label="线程数"
                        name="num_threads"
                        type="number"
                        value={integratedForm.cae_config.num_threads}
                        onChange={(e) => setIntegratedForm({
                          ...integratedForm,
                          cae_config: {
                            ...integratedForm.cae_config,
                            num_threads: Number(e.target.value),
                          },
                        })}
                      />

                      <Button
                        variant="contained"
                        color="primary"
                        fullWidth
                        sx={{ mt: 2 }}
                        type="submit"
                        disabled={loading}
                      >
                        {loading ? <CircularProgress size={24} /> : '创建集成分析'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardHeader title="集成分析列表" />
                  <CardContent>
                    {integratedAnalyses.length > 0 ? (
                      integratedAnalyses.map((analysis) => (
                        <Paper key={analysis.id} sx={{ p: 2, mb: 2 }}>
                          <Typography variant="h6">{analysis.name}</Typography>
                          <Typography variant="body2">状态: {analysis.status}</Typography>
                          <Typography variant="body2">
                            创建时间: {new Date(analysis.created_at).toLocaleString()}
                          </Typography>
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ mt: 1 }}
                          >
                            查看结果
                          </Button>
                        </Paper>
                      ))
                    ) : (
                      <Typography>暂无集成分析</Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </TabPanel>
        </StyledPaper>
      </Container>

      {/* 提示消息 */}
      <Snackbar
        open={!!error}
        autoHideDuration={6000}
        onClose={() => setError(null)}
      >
        <Alert onClose={() => setError(null)} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
      >
        <Alert onClose={() => setSuccess(null)} severity="success" sx={{ width: '100%' }}>
          {success}
        </Alert>
      </Snackbar>
    </MainLayout>
  );
};

export default PhysicsAIPage;


