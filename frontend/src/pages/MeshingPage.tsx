import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Paper, 
  Grid, 
  Button, 
  Slider, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Refresh as RefreshIcon,
  Save as SaveIcon,
  PlayArrow as StartIcon,
  Stop as StopIcon,
  Settings as SettingsIcon,
  GridOn as GridIcon
} from '@mui/icons-material';
import { api } from '../utils/api';
import { MeshInfo } from '../models/types';

// 网格预览组件（占位）
const MeshPreview: React.FC<{ projectId: number, height?: number }> = ({ projectId, height = 400 }) => {
  return (
    <Box 
      sx={{ 
        height, 
        bgcolor: 'background.paper', 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        border: '1px dashed grey'
      }}
    >
      <Typography color="text.secondary">
        网格预览 (项目ID: {projectId})
      </Typography>
    </Box>
  );
};

/**
 * 网格划分页面
 * 用于设置网格参数并生成计算网格
 */
const MeshingPage: React.FC = () => {
  // 假设项目ID从URL参数获取
  const projectId = 1;
  
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [generating, setGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [meshInfo, setMeshInfo] = useState<MeshInfo | null>(null);
  
  // 网格参数
  const [meshParams, setMeshParams] = useState({
    method: 'tetrahedral', // 四面体网格
    maxSize: 2.0, // 最大网格尺寸
    minSize: 0.2, // 最小网格尺寸
    growthRate: 1.5, // 增长率
    quality: 0.8, // 网格质量
    refinementRegions: [] as any[], // 加密区域
    useAdaptive: true, // 使用自适应网格
    optimizationLevel: 2, // 优化级别 (0-3)
  });
  
  // 加载网格信息
  useEffect(() => {
    const fetchMeshInfo = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 实际应用中应该调用API
        // const data = await api.mesh.getMeshStatistics(projectId);
        
        // 模拟数据
        const data = {
          project_id: projectId,
          nodes_count: 24680,
          elements_count: 45678,
          quality: 0.85,
          status: 'completed',
          created_at: '2023-05-15T10:30:00Z'
        };
        
        setMeshInfo(data);
      } catch (err) {
        console.error('获取网格信息失败:', err);
        setError('无法加载网格信息');
      } finally {
        setLoading(false);
      }
    };
    
    fetchMeshInfo();
  }, [projectId]);
  
  // 处理参数变化
  const handleParamChange = (param: string, value: any) => {
    setMeshParams(prev => ({
      ...prev,
      [param]: value
    }));
  };
  
  // 生成网格
  const handleGenerateMesh = async () => {
    setGenerating(true);
    setError(null);
    setSuccess(null);
    
    try {
      // 实际应用中应该调用API
      // await api.mesh.generateMesh(projectId, meshParams);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟新的网格信息
      const newMeshInfo = {
        project_id: projectId,
        nodes_count: 35280,
        elements_count: 68432,
        quality: 0.92,
        status: 'completed',
        created_at: new Date().toISOString()
      };
      
      setMeshInfo(newMeshInfo);
      setSuccess('网格生成成功');
    } catch (err) {
      console.error('生成网格失败:', err);
      setError('网格生成失败');
    } finally {
      setGenerating(false);
    }
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        网格划分
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {success}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {/* 左侧参数设置 */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              网格参数
            </Typography>
            
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>网格类型</InputLabel>
                <Select
                  value={meshParams.method}
                  label="网格类型"
                  onChange={(e) => handleParamChange('method', e.target.value)}
                >
                  <MenuItem value="tetrahedral">四面体网格</MenuItem>
                  <MenuItem value="hexahedral">六面体网格</MenuItem>
                  <MenuItem value="hybrid">混合网格</MenuItem>
                </Select>
              </FormControl>
              
              <Box>
                <Typography gutterBottom>最大网格尺寸 (m)</Typography>
                <Slider
                  value={meshParams.maxSize}
                  min={0.5}
                  max={5}
                  step={0.1}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleParamChange('maxSize', value)}
                />
                <TextField
                  size="small"
                  type="number"
                  value={meshParams.maxSize}
                  onChange={(e) => handleParamChange('maxSize', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: 0.5, max: 5 }}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <Box>
                <Typography gutterBottom>最小网格尺寸 (m)</Typography>
                <Slider
                  value={meshParams.minSize}
                  min={0.05}
                  max={1}
                  step={0.05}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleParamChange('minSize', value)}
                />
                <TextField
                  size="small"
                  type="number"
                  value={meshParams.minSize}
                  onChange={(e) => handleParamChange('minSize', parseFloat(e.target.value))}
                  inputProps={{ step: 0.05, min: 0.05, max: 1 }}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <Box>
                <Typography gutterBottom>增长率</Typography>
                <Slider
                  value={meshParams.growthRate}
                  min={1.1}
                  max={2}
                  step={0.1}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleParamChange('growthRate', value)}
                />
                <TextField
                  size="small"
                  type="number"
                  value={meshParams.growthRate}
                  onChange={(e) => handleParamChange('growthRate', parseFloat(e.target.value))}
                  inputProps={{ step: 0.1, min: 1.1, max: 2 }}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <Box>
                <Typography gutterBottom>网格质量</Typography>
                <Slider
                  value={meshParams.quality}
                  min={0.5}
                  max={1}
                  step={0.05}
                  valueLabelDisplay="auto"
                  onChange={(_, value) => handleParamChange('quality', value)}
                />
                <TextField
                  size="small"
                  type="number"
                  value={meshParams.quality}
                  onChange={(e) => handleParamChange('quality', parseFloat(e.target.value))}
                  inputProps={{ step: 0.05, min: 0.5, max: 1 }}
                  sx={{ width: '100px' }}
                />
              </Box>
              
              <FormControl fullWidth>
                <InputLabel>优化级别</InputLabel>
                <Select
                  value={meshParams.optimizationLevel}
                  label="优化级别"
                  onChange={(e) => handleParamChange('optimizationLevel', e.target.value)}
                >
                  <MenuItem value={0}>不优化</MenuItem>
                  <MenuItem value={1}>低级优化</MenuItem>
                  <MenuItem value={2}>中级优化</MenuItem>
                  <MenuItem value={3}>高级优化</MenuItem>
                </Select>
              </FormControl>
              
              <FormControlLabel
                control={
                  <Switch
                    checked={meshParams.useAdaptive}
                    onChange={(e) => handleParamChange('useAdaptive', e.target.checked)}
                  />
                }
                label="使用自适应网格"
              />
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button 
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={() => {
                    // 重置参数
                    setMeshParams({
                      method: 'tetrahedral',
                      maxSize: 2.0,
                      minSize: 0.2,
                      growthRate: 1.5,
                      quality: 0.8,
                      refinementRegions: [],
                      useAdaptive: true,
                      optimizationLevel: 2,
                    });
                  }}
                >
                  重置参数
                </Button>
                
                <Button 
                  variant="contained"
                  startIcon={generating ? <CircularProgress size={20} color="inherit" /> : <StartIcon />}
                  onClick={handleGenerateMesh}
                  disabled={generating}
                >
                  {generating ? '生成中...' : '生成网格'}
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        
        {/* 右侧预览 */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                网格预览
              </Typography>
              <Box>
                <Tooltip title="显示网格线">
                  <IconButton size="small" sx={{ mr: 1 }}>
                    <GridIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="网格设置">
                  <IconButton size="small">
                    <SettingsIcon />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 10 }}>
                <CircularProgress />
              </Box>
            ) : (
              <MeshPreview projectId={projectId} height={500} />
            )}
            
            {/* 网格统计信息 */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      网格统计
                    </Typography>
                    {meshInfo ? (
                      <>
                        <Typography variant="body2">
                          <strong>节点数量:</strong> {meshInfo.nodes_count.toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>单元数量:</strong> {meshInfo.elements_count.toLocaleString()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>网格质量:</strong> {meshInfo.quality.toFixed(2)}
                        </Typography>
                        <Typography variant="body2">
                          <strong>生成时间:</strong> {new Date(meshInfo.created_at).toLocaleString()}
                        </Typography>
                      </>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        暂无网格数据
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      质量分析
                    </Typography>
                    <Box sx={{ height: 150, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      <Typography variant="body2" color="text.secondary">
                        网格质量直方图将在这里显示
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default MeshingPage; 