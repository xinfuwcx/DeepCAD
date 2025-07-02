import React, { useState, useEffect, useRef } from 'react';
import { TextField, Accordion, AccordionSummary, AccordionDetails, FormGroup, FormControlLabel, Checkbox, InputAdornment } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Grid, Divider } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import chili3dIntegration from '../../services/chili3dIntegration';

// 分析类型定义
type AnalysisType = 'stress' | 'displacement' | 'stability' | 'seepage';

interface UndulatingSoilLayer {
  material_name: string;
  surface_points: [number, number, number][];
  average_thickness: number;
}

interface SeepageMaterial {
  name: string;
  hydraulic_conductivity_x: number;
  hydraulic_conductivity_y: number;
  hydraulic_conductivity_z: number;
}

interface HydraulicBoundaryCondition {
  boundary_name: string;
  total_head: number;
}

export const Chili3DVisualizer: React.FC = () => {
  const theme = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sceneData, setSceneData] = useState<any | null>(null);
  const [selectedScene, setSelectedScene] = useState('default');
  const [analysisResults, setAnalysisResults] = useState<any | null>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('stress');
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // V4 Analysis Model State
  const [projectName, setProjectName] = useState('');
  const [soilLayers, setSoilLayers] = useState<UndulatingSoilLayer[]>([{ material_name: '', surface_points: [[0,0,0], [10,0,0], [10,10,0], [0,10,0]], average_thickness: 5 }]);
  const [dxfFileContent, setDxfFileContent] = useState<string>('');
  const [dxfLayerName, setDxfLayerName] = useState('EXCAVATION_OUTLINE');
  const [excavationDepth, setExcavationDepth] = useState<number>(10);
  
  // Seepage Analysis State
  const [seepageMaterials, setSeepageMaterials] = useState<SeepageMaterial[]>([{ name: '', hydraulic_conductivity_x: 1e-6, hydraulic_conductivity_y: 1e-6, hydraulic_conductivity_z: 1e-6 }]);
  const [boundaryConditions, setBoundaryConditions] = useState<HydraulicBoundaryCondition[]>([{ boundary_name: '', total_head: 0 }]);
  const [dxfFile, setDxfFile] = useState<File | null>(null);

  // 场景列表 - 实际项目中可能从API获取
  const scenes = [
    { id: 'default', name: '默认基坑场景' },
    { id: 'complex', name: '复杂地质场景' },
    { id: 'custom', name: '自定义场景' }
  ];

  // 初始化3D场景
  useEffect(() => {
    if (!canvasRef.current) return;

    // 这里将添加Chili3D初始化代码
    console.log('Chili3D canvas container initialized');

    return () => {
      // 清理3D场景
    };
  }, []);

  // 加载场景数据
  const loadSceneData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chili3dIntegration.getSceneData(selectedScene);
      setSceneData(data);
      // 在实际项目中，这里会将数据传递给Chili3D渲染器
      console.log('Scene data loaded:', data);
    } catch (err: any) {
      setError(err.message || '加载3D场景数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 运行场景分析
    const prepareV4AnalysisModel = () => {
      return {
        project_name: projectName,
        soil_profile: soilLayers,
        excavation: {
          dxf_file_content: dxfFileContent,
          layer_name: dxfLayerName,
          excavation_depth: excavationDepth
        }
      };
    };

    const prepareSeepageAnalysisModel = () => {
      return {
        project_name: projectName,
        geometry_definition: prepareV4AnalysisModel(),
        materials: seepageMaterials,
        boundary_conditions: boundaryConditions
      };
    };

    const runAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
              // 根据分析类型选择不同的API端点和模型
        let endpoint = '/run-structural-analysis';
        let requestData = prepareV4AnalysisModel();

        if (activeAnalysis === 'seepage') {
          endpoint = '/run-seepage-analysis';
          requestData = prepareSeepageAnalysisModel();
        }

        const response = await axios.post(`${API_BASE_URL}/v4${endpoint}`, requestData);
        const results = response.data;
      setAnalysisResults(results);
      // 在实际项目中，这里会根据分析结果更新3D可视化
      console.log('Analysis results:', results);
    } catch (err: any) {
      setError(err.message || '执行3D场景分析失败');
    } finally {
      setLoading(false);
    }
  };

  // 导出场景数据
  const exportScene = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chili3dIntegration.exportSceneData(selectedScene, 'json');
      // 创建下载链接
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `scene-${selectedScene}-export.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.message || '导出3D场景数据失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h5" gutterBottom>Chili3D 可视化界面</Typography>

      {/* V4 API 参数配置区域 */}
      <Accordion defaultExpanded={true} sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle1">V4分析参数配置</Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ p: 0 }}>
          <Paper sx={{ p: 3, width: '100%' }}>
            <Grid container spacing={3}>
              {/* 项目基本信息 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="项目名称"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  variant="outlined"
                  required
                />
              </Grid>

              {/* DXF文件上传 */}
              <Grid item xs={12} md={6}>
                <Button
                  variant="outlined"
                  fullWidth
                  component="label"
                  startIcon={<FileUploadIcon />}
                  sx={{ height: '56px' }}
                >
                  上传DXF文件
                  <input
                    type="file"
                    hidden
                    accept=".dxf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setDxfFile(file);
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          setDxfFileContent(event.target?.result as string);
                        };
                        reader.readAsText(file);
                      }
                    }}
                  />
                </Button>
              </Grid>

              {/* 土层配置 */}
              <Grid item xs={12}>
                <Typography variant="subtitle2" sx={{ mb: 2 }}>土层配置</Typography>
                {soilLayers.map((layer, index) => (
                  <Grid container spacing={2} key={index} alignItems="flex-end">
                    <Grid item xs={12} md={3}>
                      <TextField
                        fullWidth
                        label="材料名称"
                        value={layer.material_name}
                        onChange={(e) => {
                          const newLayers = [...soilLayers];
                          newLayers[index].material_name = e.target.value;
                          setSoilLayers(newLayers);
                        }}
                        variant="outlined"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                      <TextField
                        fullWidth
                        label="表面点坐标 (x,y,z; 多个点用逗号分隔)"
                        value={layer.surface_points.map(p => p.join(',')).join('; ')}
                        onChange={(e) => {
                          const newLayers = [...soilLayers];
                          newLayers[index].surface_points = e.target.value.split('; ').map(p => {
                            const [x, y, z] = p.split(',').map(Number);
                            return [x || 0, y || 0, z || 0];
                          });
                          setSoilLayers(newLayers);
                        }}
                        variant="outlined"
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={2}>
                      <TextField
                        fullWidth
                        label="平均厚度(m)"
                        type="number"
                        value={layer.average_thickness}
                        onChange={(e) => {
                          const newLayers = [...soilLayers];
                          newLayers[index].average_thickness = Number(e.target.value);
                          setSoilLayers(newLayers);
                        }}
                        variant="outlined"
                        InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                        required
                      />
                    </Grid>
                    <Grid item xs={12} md={1}>
                      <Button
                        variant="outlined"
                        color="error"
                        fullWidth
                        onClick={() => {
                          const newLayers = [...soilLayers];
                          newLayers.splice(index, 1);
                          setSoilLayers(newLayers);
                        }}
                      >
                        删除
                      </Button>
                    </Grid>
                  </Grid>
                ))}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setSoilLayers([...soilLayers, {
                      material_name: '',
                      surface_points: [[0,0,0], [10,0,0], [10,10,0], [0,10,0]],
                      average_thickness: 5
                    }]);
                  }}
                  sx={{ mt: 2 }}
                >
                  添加土层
                </Button>
              </Grid>

              {/* DXF图层名称和开挖深度 */}
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="DXF图层名称"
                  value={dxfLayerName}
                  onChange={(e) => setDxfLayerName(e.target.value)}
                  variant="outlined"
                  defaultValue="EXCAVATION_OUTLINE"
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="开挖深度(m)"
                  type="number"
                  value={excavationDepth}
                  onChange={(e) => setExcavationDepth(Number(e.target.value))}
                  variant="outlined"
                  InputProps={{ inputProps: { min: 0.1, step: 0.1 } }}
                  required
                />
              </Grid>
            </Grid>
          </Paper>
        </AccordionDetails>
      </Accordion>

      {/* 场景和分析类型选择 */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4} lg={3}>
          <FormControl fullWidth>
            <InputLabel>选择场景</InputLabel>
            <Select
              value={selectedScene}
              label="选择场景"
              onChange={(e) => setSelectedScene(e.target.value as string)}
              disabled={loading}
            >
              {scenes.map(scene => (
                <MenuItem key={scene.id} value={scene.id}>{scene.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>

        <Grid item xs={12} md={4} lg={3}>
          <FormControl fullWidth>
            <InputLabel>分析类型</InputLabel>
            <Select
              value={activeAnalysis}
              label="分析类型"
              onChange={(e) => setActiveAnalysis(e.target.value as AnalysisType)}
              disabled={loading}
            >
              <MenuItem value="stress">应力分析</MenuItem>
              <MenuItem value="displacement">位移分析</MenuItem>
              <MenuItem value="stability">稳定性分析</MenuItem>
              <MenuItem value="seepage">渗流分析</MenuItem>
            </Select>
          </FormControl>
        </Grid>

        {/* 渗流分析参数配置 (仅在选择渗流分析时显示) */}
        {activeAnalysis === 'seepage' && (
          <Accordion sx={{ mb: 3 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="subtitle1">渗流分析参数</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ p: 0 }}>
              <Paper sx={{ p: 3, width: '100%' }}>
                <Grid container spacing={3}>
                  {/* 渗流材料参数 */}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 2 }}>渗流材料属性</Typography>
                    {seepageMaterials.map((material, index) => (
                      <Grid container spacing={2} key={index} alignItems="flex-end">
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="材料名称"
                            value={material.name}
                            onChange={(e) => {
                              const newMaterials = [...seepageMaterials];
                              newMaterials[index].name = e.target.value;
                              setSeepageMaterials(newMaterials);
                            }}
                            variant="outlined"
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="渗透系数X(m/s)"
                            type="number"
                            value={material.hydraulic_conductivity_x}
                            onChange={(e) => {
                              const newMaterials = [...seepageMaterials];
                              newMaterials[index].hydraulic_conductivity_x = Number(e.target.value);
                              setSeepageMaterials(newMaterials);
                            }}
                            variant="outlined"
                            InputProps={{ inputProps: { min: 1e-10, step: 1e-10 } }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="渗透系数Y(m/s)"
                            type="number"
                            value={material.hydraulic_conductivity_y}
                            onChange={(e) => {
                              const newMaterials = [...seepageMaterials];
                              newMaterials[index].hydraulic_conductivity_y = Number(e.target.value);
                              setSeepageMaterials(newMaterials);
                            }}
                            variant="outlined"
                            InputProps={{ inputProps: { min: 1e-10, step: 1e-10 } }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                        <Grid item xs={12} md={3}>
                          <TextField
                            fullWidth
                            label="渗透系数Z(m/s)"
                            type="number"
                            value={material.hydraulic_conductivity_z}
                            onChange={(e) => {
                              const newMaterials = [...seepageMaterials];
                              newMaterials[index].hydraulic_conductivity_z = Number(e.target.value);
                              setSeepageMaterials(newMaterials);
                            }}
                            variant="outlined"
                            InputProps={{ inputProps: { min: 1e-10, step: 1e-10 } }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
                    ))}
                  </Grid>

                  {/* 水力边界条件 */}
                  <Grid item xs={12}>
                    <Typography variant="body2" sx={{ mb: 2 }}>水力边界条件</Typography>
                    {boundaryConditions.map((bc, index) => (
                      <Grid container spacing={2} key={index} alignItems="flex-end">
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="边界名称"
                            value={bc.boundary_name}
                            onChange={(e) => {
                              const newBCs = [...boundaryConditions];
                              newBCs[index].boundary_name = e.target.value;
                              setBoundaryConditions(newBCs);
                            }}
                            variant="outlined"
                          />
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <TextField
                            fullWidth
                            label="总水头(m)"
                            type="number"
                            value={bc.total_head}
                            onChange={(e) => {
                              const newBCs = [...boundaryConditions];
                              newBCs[index].total_head = Number(e.target.value);
                              setBoundaryConditions(newBCs);
                            }}
                            variant="outlined"
                            InputProps={{ inputProps: { step: 0.1 } }}
                            InputLabelProps={{ shrink: true }}
                          />
                        </Grid>
                      </Grid>
                    ))}
                  </Grid>
                </Grid>
              </Paper>
            </AccordionDetails>
          </Accordion>
        )}

        <Grid item xs={12} md={4} lg={6} container spacing={1} alignItems="flex-end">
          <Grid item xs={4} md={3}>
            <Button
              variant="outlined"
              fullWidth
              onClick={loadSceneData}
              disabled={loading}
            >
              加载场景
            </Button>
          </Grid>
          <Grid item xs={4} md={3}>
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={runAnalysis}
              disabled={loading || !sceneData}
            >
              运行分析
            </Button>
          </Grid>
          <Grid item xs={4} md={3}>
            <Button
              variant="outlined"
              color="secondary"
              fullWidth
              onClick={exportScene}
              disabled={loading || !sceneData}
            >
              导出数据
            </Button>
          </Grid>
        </Grid>
      </Grid>

      {/* 3D渲染区域 */}
      <Box
        ref={canvasRef}
        sx={{
          width: '100%',
          height: '500px',
          backgroundColor: '#f5f5f5',
          border: `1px solid ${theme.palette.divider}`,
          position: 'relative',
          overflow: 'hidden',
          mb: 3
        }}
      >
        {loading && sceneData && (
          <Box sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            zIndex: 1
          }}>
            <CircularProgress />
          </Box>
        )}

        {!sceneData && !loading && (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: theme.palette.text.secondary
          }}>
            <Typography>请选择并加载一个3D场景</Typography>
          </Box>
        )}

        {sceneData && !loading && (
          <Box sx={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            color: theme.palette.text.secondary
          }}>
            <Typography>Chili3D渲染区域 - {scenes.find(s => s.id === selectedScene)?.name}</Typography>
          </Box>
        )}
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* 分析结果展示 */}
      {analysisResults && (
        <Box>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom>分析结果</Typography>
          <Paper sx={{ p: 2, maxHeight: '200px', overflow: 'auto' }}>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '0.875rem' }}>
              {JSON.stringify(analysisResults, null, 2)}
            </pre>
          </Paper>
        </Box>
      )}
    </Paper>
  );
};

export default Chili3DVisualizer;