import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Button, 
  Typography, 
  Paper, 
  Grid, 
  TextField, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  IconButton, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemSecondaryAction,
  Divider,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SaveIcon from '@mui/icons-material/Save';
import VisibilityIcon from '@mui/icons-material/Visibility';
import DownloadIcon from '@mui/icons-material/Download';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import { api } from '../../utils/api';

// 施工阶段类型
enum StageType {
  INITIAL = 'initial',
  EXCAVATION = 'excavation',
  WALL_INSTALLATION = 'wall',
  ANCHOR_INSTALLATION = 'anchor',
  STRUT_INSTALLATION = 'strut',
  DEWATERING = 'dewatering',
  LOAD_APPLICATION = 'load',
  CONSOLIDATION = 'consolidation',
  COMPLETION = 'completion'
}

// 施工阶段类型中文名称
const stageTypeNames: Record<string, string> = {
  [StageType.INITIAL]: '初始阶段',
  [StageType.EXCAVATION]: '开挖阶段',
  [StageType.WALL_INSTALLATION]: '围护墙安装',
  [StageType.ANCHOR_INSTALLATION]: '锚杆安装',
  [StageType.STRUT_INSTALLATION]: '支撑安装',
  [StageType.DEWATERING]: '降水阶段',
  [StageType.LOAD_APPLICATION]: '荷载施加',
  [StageType.CONSOLIDATION]: '固结阶段',
  [StageType.COMPLETION]: '完工阶段'
};

// 阶段状态样式
const stageStatusStyles: Record<string, React.CSSProperties> = {
  'not_computed': { backgroundColor: '#f5f5f5' },
  'computing': { backgroundColor: '#fff8e1' },
  'completed': { backgroundColor: '#e8f5e9' },
  'failed': { backgroundColor: '#ffebee' }
};

// 施工阶段接口
interface ConstructionStage {
  stage_id: string;
  stage_type: string;
  stage_name: string;
  stage_description: string;
  elements?: number[];
  entities?: Record<string, number[]>;
  parameters?: Record<string, any>;
  status: {
    computed: boolean;
    computation_time: number;
    convergence_status: string | null;
    iterations: number;
    error: string | null;
  };
}

// 分析状态接口
interface AnalysisStatus {
  created_at: number;
  last_modified: number;
  current_stage: number;
  total_stages: number;
  status: string;
  error: string | null;
}

// 新阶段表单数据接口
interface NewStageForm {
  stage_type: string;
  stage_name: string;
  description: string;
  elements: string;
  water_level?: number;
  entities: Record<string, string>;
  parameters: Record<string, any>;
}

// 分步施工模拟分析面板组件
const StagedConstructionPanel: React.FC = () => {
  const [projectId, setProjectId] = useState<string>("");
  const [modelFile, setModelFile] = useState<string>("");
  const [analysisId, setAnalysisId] = useState<string>("");
  const [stages, setStages] = useState<ConstructionStage[]>([]);
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, any>>({});

  // 新阶段表单状态
  const [showNewStageForm, setShowNewStageForm] = useState<boolean>(false);
  const [newStage, setNewStage] = useState<NewStageForm>({
    stage_type: StageType.INITIAL,
    stage_name: "",
    description: "",
    elements: "",
    entities: {},
    parameters: {}
  });

  // 轮询分析状态
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    if (analysisId && analysisStatus && analysisStatus.status === 'running') {
      intervalId = setInterval(() => {
        fetchAnalysisStatus();
      }, 2000); // 每2秒查询一次
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [analysisId, analysisStatus]);

  // 创建分析
  const createAnalysis = async () => {
    try {
      if (!projectId || !modelFile) {
        setError("请输入项目ID和模型文件路径");
        return;
      }

      setIsLoading(true);
      setError(null);

      const response = await api.post('/compute/staged-construction/create', {
        project_id: projectId,
        model_file: modelFile,
        config: {
          solver_type: "direct",
          max_iterations: 50,
          tolerance: 1e-6
        }
      });

      if (response.data.status === 'success') {
        setAnalysisId(response.data.analysis_id);
        fetchAnalysisStatus();
      } else {
        setError(response.data.message || "创建分析失败");
      }
    } catch (err: any) {
      setError(err.message || "创建分析时发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 添加阶段
  const addStage = async () => {
    try {
      if (!analysisId || !newStage.stage_name || !newStage.stage_type) {
        setError("请输入阶段名称和选择阶段类型");
        return;
      }

      setIsLoading(true);
      setError(null);

      // 准备阶段数据
      const stageData: Record<string, any> = {
        parameters: newStage.parameters || {}
      };

      // 根据阶段类型准备不同的数据
      if (newStage.stage_type === StageType.EXCAVATION) {
        stageData.elements = newStage.elements ? newStage.elements.split(',').map(Number) : [];
        if (newStage.water_level !== undefined) stageData.water_level = newStage.water_level;
      } else if ([StageType.WALL_INSTALLATION, StageType.ANCHOR_INSTALLATION, StageType.STRUT_INSTALLATION].includes(newStage.stage_type as StageType)) {
        stageData.entities = {};
        Object.entries(newStage.entities).forEach(([key, value]) => {
          stageData.entities[key] = value.split(',').map(Number);
        });
      } else if (newStage.stage_type === StageType.DEWATERING) {
        if (newStage.water_level !== undefined) stageData.water_level = newStage.water_level;
        stageData.area = newStage.elements ? newStage.elements.split(',').map(Number) : [];
      }

      // 添加描述
      if (newStage.description) {
        stageData.description = newStage.description;
      }

      const response = await api.post(`/compute/staged-construction/${analysisId}/add-stage`, {
        stage_type: newStage.stage_type,
        stage_name: newStage.stage_name,
        stage_data: stageData
      });

      if (response.data.status === 'success') {
        fetchAnalysisStatus();
        setShowNewStageForm(false);
        resetNewStageForm();
      } else {
        setError(response.data.message || "添加阶段失败");
      }
    } catch (err: any) {
      setError(err.message || "添加阶段时发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 运行分析
  const runAnalysis = async () => {
    try {
      if (!analysisId) {
        setError("请先创建分析");
        return;
      }

      if (stages.length === 0) {
        setError("请先添加至少一个施工阶段");
        return;
      }

      setIsLoading(true);
      setError(null);

      const response = await api.post(`/compute/staged-construction/${analysisId}/run`, {
        background: true
      });

      if (response.data.status === 'success') {
        setAnalysisStatus(response.data.analysis_status);
      } else {
        setError(response.data.message || "启动分析失败");
      }
    } catch (err: any) {
      setError(err.message || "启动分析时发生错误");
    } finally {
      setIsLoading(false);
    }
  };

  // 获取分析状态
  const fetchAnalysisStatus = async () => {
    try {
      if (!analysisId) return;

      const response = await api.get(`/compute/staged-construction/${analysisId}/status`);

      if (response.data.status === 'success') {
        setAnalysisStatus(response.data.analysis_status);
        
        // 获取阶段信息
        if (response.data.current_stage) {
          const updatedStages = [...stages];
          const stageIndex = updatedStages.findIndex(s => s.stage_id === response.data.current_stage.stage_id);
          if (stageIndex >= 0) {
            updatedStages[stageIndex] = response.data.current_stage;
            setStages(updatedStages);
          } else {
            setStages([...updatedStages, response.data.current_stage]);
          }
        }
      }
    } catch (err) {
      console.error("获取分析状态失败", err);
    }
  };

  // 获取阶段结果
  const fetchStageResults = async (stageId: string) => {
    try {
      const response = await api.get(`/compute/staged-construction/${analysisId}/results/${stageId}`);
      
      if (response.data.status === 'success') {
        setResults(prevResults => ({
          ...prevResults,
          [stageId]: response.data.results
        }));
      }
    } catch (err) {
      console.error(`获取阶段 ${stageId} 的结果失败`, err);
    }
  };

  // 导出结果
  const exportResults = async (stageId?: string) => {
    try {
      const response = await api.post(`/compute/staged-construction/${analysisId}/export`, {
        file_format: "vtk",
        stage_id: stageId || null
      });
      
      if (response.data.status === 'success') {
        alert(`结果已导出到: ${response.data.file_path}`);
      }
    } catch (err) {
      console.error("导出结果失败", err);
    }
  };

  // 重置新阶段表单
  const resetNewStageForm = () => {
    setNewStage({
      stage_type: StageType.INITIAL,
      stage_name: "",
      description: "",
      elements: "",
      entities: {},
      parameters: {}
    });
  };

  // 渲染新阶段表单
  const renderNewStageForm = () => {
    if (!showNewStageForm) return null;

    return (
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6">添加施工阶段</Typography>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>阶段类型</InputLabel>
              <Select
                value={newStage.stage_type}
                onChange={(e) => setNewStage({...newStage, stage_type: e.target.value})}
              >
                {Object.entries(stageTypeNames).map(([type, name]) => (
                  <MenuItem key={type} value={type}>{name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField 
              fullWidth 
              label="阶段名称" 
              value={newStage.stage_name}
              onChange={(e) => setNewStage({...newStage, stage_name: e.target.value})}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField 
              fullWidth 
              label="阶段描述" 
              value={newStage.description}
              onChange={(e) => setNewStage({...newStage, description: e.target.value})}
            />
          </Grid>

          {/* 根据阶段类型显示不同的输入字段 */}
          {(newStage.stage_type === StageType.EXCAVATION || newStage.stage_type === StageType.DEWATERING) && (
            <>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  label={newStage.stage_type === StageType.EXCAVATION ? "开挖单元ID列表" : "降水区域单元ID列表"} 
                  value={newStage.elements}
                  onChange={(e) => setNewStage({...newStage, elements: e.target.value})}
                  helperText="以逗号分隔，如：101,102,103"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField 
                  fullWidth 
                  type="number"
                  label="水位高程" 
                  value={newStage.water_level || ""}
                  onChange={(e) => setNewStage({...newStage, water_level: parseFloat(e.target.value)})}
                />
              </Grid>
            </>
          )}

          {[StageType.WALL_INSTALLATION, StageType.ANCHOR_INSTALLATION, StageType.STRUT_INSTALLATION].includes(newStage.stage_type as StageType) && (
            <>
              <Grid item xs={12}>
                <TextField 
                  fullWidth 
                  label={`${stageTypeNames[newStage.stage_type]}单元ID列表`}
                  value={newStage.entities[newStage.stage_type] || ""}
                  onChange={(e) => setNewStage({
                    ...newStage, 
                    entities: {
                      ...newStage.entities,
                      [newStage.stage_type]: e.target.value
                    }
                  })}
                  helperText="以逗号分隔，如：201,202,203"
                />
              </Grid>
              {newStage.stage_type === StageType.ANCHOR_INSTALLATION && (
                <Grid item xs={12}>
                  <TextField 
                    fullWidth 
                    label="预应力值(N)"
                    value={newStage.parameters.prestress || ""}
                    onChange={(e) => setNewStage({
                      ...newStage, 
                      parameters: {
                        ...newStage.parameters,
                        prestress: parseFloat(e.target.value)
                      }
                    })}
                  />
                </Grid>
              )}
            </>
          )}

          {newStage.stage_type === StageType.LOAD_APPLICATION && (
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="荷载值(格式: x,y,z)"
                value={newStage.parameters.load_value || ""}
                onChange={(e) => setNewStage({
                  ...newStage, 
                  parameters: {
                    ...newStage.parameters,
                    load_value: e.target.value
                  }
                })}
                helperText="如：0,0,-25000 表示25kPa向下的荷载"
              />
            </Grid>
          )}

          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
              <Button 
                variant="outlined" 
                onClick={() => {
                  setShowNewStageForm(false);
                  resetNewStageForm();
                }}
              >
                取消
              </Button>
              <Button 
                variant="contained" 
                onClick={addStage}
                startIcon={<AddIcon />}
                disabled={!newStage.stage_name}
              >
                添加阶段
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  // 渲染阶段列表
  const renderStagesList = () => {
    if (stages.length === 0) {
      return (
        <Paper sx={{ p: 2, textAlign: 'center' }}>
          <Typography color="textSecondary">暂无施工阶段</Typography>
        </Paper>
      );
    }

    return (
      <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
        {stages.map((stage, index) => {
          const stageResults = results[stage.stage_id];
          const isComputing = analysisStatus?.current_stage === index && analysisStatus?.status === 'running';
          const statusStyle = stage.status.computed ? 
            (stage.status.error ? stageStatusStyles['failed'] : stageStatusStyles['completed']) : 
            (isComputing ? stageStatusStyles['computing'] : stageStatusStyles['not_computed']);

          return (
            <React.Fragment key={stage.stage_id}>
              {index > 0 && <Divider />}
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={statusStyle}
                >
                  <Typography sx={{ width: '33%', flexShrink: 0 }}>
                    {stage.stage_name}
                  </Typography>
                  <Typography sx={{ color: 'text.secondary' }}>
                    {stageTypeNames[stage.stage_type]} 
                    {isComputing && (
                      <CircularProgress size={16} sx={{ ml: 1 }} />
                    )}
                    {stage.status.computed && (
                      <Chip 
                        size="small" 
                        label={stage.status.error ? "失败" : "已计算"} 
                        color={stage.status.error ? "error" : "success"}
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2">阶段描述:</Typography>
                      <Typography variant="body2">{stage.stage_description || "无描述"}</Typography>
                      
                      {stage.status.computed && (
                        <>
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>计算耗时:</Typography>
                          <Typography variant="body2">{stage.status.computation_time.toFixed(2)}秒</Typography>
                          
                          <Typography variant="subtitle2" sx={{ mt: 1 }}>迭代次数:</Typography>
                          <Typography variant="body2">{stage.status.iterations}</Typography>
                          
                          {stage.status.error && (
                            <>
                              <Typography variant="subtitle2" sx={{ mt: 1, color: 'error.main' }}>错误信息:</Typography>
                              <Typography variant="body2" color="error">{stage.status.error}</Typography>
                            </>
                          )}
                        </>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      {stageResults && (
                        <>
                          <Typography variant="subtitle2">计算结果:</Typography>
                          <Box sx={{ mt: 1 }}>
                            <Typography variant="body2">
                              最大位移: {stageResults.max_displacement ? stageResults.max_displacement.toExponential(3) : 'N/A'} m
                            </Typography>
                            <Typography variant="body2">
                              最大应力: {stageResults.max_stress ? stageResults.max_stress.toExponential(3) : 'N/A'} Pa
                            </Typography>
                          </Box>
                        </>
                      )}
                      
                      <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
                        {stage.status.computed && (
                          <>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              startIcon={<VisibilityIcon />}
                              onClick={() => fetchStageResults(stage.stage_id)}
                            >
                              查看结果
                            </Button>
                            <Button 
                              size="small" 
                              variant="outlined" 
                              startIcon={<DownloadIcon />}
                              onClick={() => exportResults(stage.stage_id)}
                            >
                              导出结果
                            </Button>
                          </>
                        )}
                      </Box>
                    </Grid>
                  </Grid>
                </AccordionDetails>
              </Accordion>
            </React.Fragment>
          );
        })}
      </List>
    );
  };

  // 主渲染
  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>分步施工模拟分析</Typography>
      <Divider sx={{ mb: 2 }} />
      
      {/* 错误消息 */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {/* 分析设置部分 */}
      {!analysisId && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>分析设置</Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="项目ID" 
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                fullWidth 
                label="模型文件路径" 
                value={modelFile}
                onChange={(e) => setModelFile(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <Button 
                variant="contained" 
                onClick={createAnalysis}
                disabled={isLoading || !projectId || !modelFile}
                startIcon={isLoading ? <CircularProgress size={24} /> : <SaveIcon />}
              >
                创建分析
              </Button>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* 分析状态部分 */}
      {analysisId && (
        <>
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>分析信息</Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">项目ID: {projectId}</Typography>
                <Typography variant="body2">分析ID: {analysisId}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="body2">
                  状态: {analysisStatus?.status || "未知"}
                  {analysisStatus?.status === 'running' && (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                  )}
                </Typography>
                <Typography variant="body2">阶段数: {stages.length}</Typography>
              </Grid>
              {analysisStatus?.status === 'completed' && (
                <Grid item xs={12}>
                  <Button 
                    variant="outlined" 
                    startIcon={<DownloadIcon />}
                    onClick={() => exportResults()}
                  >
                    导出最终结果
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>
          
          {/* 施工阶段管理 */}
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="h6">施工阶段</Typography>
            <Box>
              <Button 
                variant="outlined" 
                startIcon={<AddIcon />}
                onClick={() => setShowNewStageForm(true)}
                disabled={showNewStageForm || analysisStatus?.status === 'running'}
                sx={{ mr: 1 }}
              >
                添加阶段
              </Button>
              <Button 
                variant="contained" 
                startIcon={<PlayArrowIcon />}
                onClick={runAnalysis}
                disabled={stages.length === 0 || analysisStatus?.status === 'running'}
                color="primary"
              >
                运行分析
              </Button>
            </Box>
          </Box>
          
          {/* 新阶段表单 */}
          {renderNewStageForm()}
          
          {/* 阶段列表 */}
          {renderStagesList()}
        </>
      )}
    </Box>
  );
};

export default StagedConstructionPanel;
