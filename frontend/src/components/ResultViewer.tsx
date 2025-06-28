import React, { useEffect, useRef, useState } from 'react';
import { 
  Box, 
  Typography, 
  Paper, 
  ToggleButtonGroup, 
  ToggleButton,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  SelectChangeEvent
} from '@mui/material';
import {
  ViewInAr,
  Visibility,
  VisibilityOff,
  Gradient,
  GridOn,
  Layers
} from '@mui/icons-material';
import { resultApi } from '../services/api';

interface ResultViewerProps {
  projectId: number;
  height?: number;
  resultType?: string;
}

/**
 * 结果可视化组件
 * 用于显示三维结果
 */
const ResultViewer: React.FC<ResultViewerProps> = ({ 
  projectId, 
  height = 400,
  resultType = 'displacement'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedResultType, setSelectedResultType] = useState<string>(resultType);
  const [selectedStage, setSelectedStage] = useState<number>(0);
  const [stages, setStages] = useState<any[]>([]);
  const [showMesh, setShowMesh] = useState<boolean>(true);
  const [deformationScale, setDeformationScale] = useState<number>(100);
  
  // 加载结果数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 获取施工阶段列表
        const stagesResponse = await resultApi.getStages(projectId);
        setStages(stagesResponse);
        
        // 初始化三维视图
        initializeViewer();
        
        // 加载结果数据
        if (stagesResponse.length > 0) {
          await loadResultData(selectedResultType, selectedStage);
        }
      } catch (err) {
        console.error('加载结果数据失败:', err);
        setError('无法加载结果数据');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // 清理函数
    return () => {
      // 清理三维视图资源
      cleanupViewer();
    };
  }, [projectId]);
  
  // 当结果类型或阶段变化时，重新加载数据
  useEffect(() => {
    if (!loading && stages.length > 0) {
      loadResultData(selectedResultType, selectedStage);
    }
  }, [selectedResultType, selectedStage]);
  
  // 初始化三维视图
  const initializeViewer = () => {
    // 这里应该实现三维视图的初始化
    // 例如使用Three.js或其他WebGL库
    // 在实际应用中，这部分应该与后端提供的可视化服务集成
    console.log('初始化三维视图');
  };
  
  // 清理三维视图资源
  const cleanupViewer = () => {
    // 清理三维视图资源
    console.log('清理三维视图资源');
  };
  
  // 加载结果数据
  const loadResultData = async (type: string, stage: number) => {
    try {
      setLoading(true);
      
      // 获取结果数据
      const resultData = await resultApi.getResultData(projectId, type, stage);
      
      // 更新三维视图
      updateViewer(resultData);
      
      setLoading(false);
    } catch (err) {
      console.error('加载结果数据失败:', err);
      setError('无法加载结果数据');
      setLoading(false);
    }
  };
  
  // 更新三维视图
  const updateViewer = (data: any) => {
    // 这里应该实现三维视图的更新
    // 根据获取的结果数据更新视图
    console.log('更新三维视图:', data);
  };
  
  // 处理结果类型变化
  const handleResultTypeChange = (event: SelectChangeEvent) => {
    setSelectedResultType(event.target.value);
  };
  
  // 处理施工阶段变化
  const handleStageChange = (event: SelectChangeEvent) => {
    setSelectedStage(Number(event.target.value));
  };
  
  // 处理网格显示切换
  const handleMeshToggle = () => {
    setShowMesh(!showMesh);
    // 更新三维视图中的网格显示
    console.log('网格显示:', !showMesh);
  };
  
  // 处理变形比例变化
  const handleDeformationScaleChange = (event: Event, value: number | number[]) => {
    const scale = value as number;
    setDeformationScale(scale);
    // 更新三维视图中的变形比例
    console.log('变形比例:', scale);
  };
  
  return (
    <Paper sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">三维结果查看器</Typography>
      </Box>
      
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>结果类型</InputLabel>
            <Select
              value={selectedResultType}
              label="结果类型"
              onChange={handleResultTypeChange}
            >
              <MenuItem value="displacement">位移</MenuItem>
              <MenuItem value="stress">应力</MenuItem>
              <MenuItem value="strain">应变</MenuItem>
              <MenuItem value="safety_factor">安全系数</MenuItem>
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <FormControl fullWidth size="small">
            <InputLabel>施工阶段</InputLabel>
            <Select
              value={selectedStage.toString()}
              label="施工阶段"
              onChange={handleStageChange}
              disabled={stages.length === 0}
            >
              {stages.map((stage, index) => (
                <MenuItem key={index} value={index.toString()}>
                  {stage.name || `阶段 ${index + 1}`}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid item xs={12} md={4}>
          <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
            <ToggleButtonGroup size="small">
              <ToggleButton 
                value="mesh" 
                selected={showMesh} 
                onChange={handleMeshToggle}
              >
                <GridOn />
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  网格
                </Typography>
              </ToggleButton>
              <ToggleButton value="legend" selected>
                <Gradient />
                <Typography variant="caption" sx={{ ml: 0.5 }}>
                  图例
                </Typography>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Grid>
      </Grid>
      
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          变形比例: {deformationScale}
        </Typography>
        <Slider
          value={deformationScale}
          onChange={handleDeformationScaleChange}
          min={1}
          max={500}
          step={1}
          valueLabelDisplay="auto"
        />
      </Box>
      
      <Box 
        ref={containerRef}
        sx={{ 
          position: 'relative',
          height,
          border: '1px solid #ddd',
          borderRadius: 1,
          overflow: 'hidden',
          bgcolor: '#f5f5f5'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="error">{error}</Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <Typography color="text.secondary">
              三维结果查看器 (项目ID: {projectId})
            </Typography>
            <Typography variant="caption" sx={{ position: 'absolute', bottom: 10, left: 10 }}>
              注: 实际应用中，这里将显示基于WebGL的三维模型
            </Typography>
          </Box>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
        <Typography variant="caption" color="text.secondary">
          {selectedResultType === 'displacement' ? '位移单位: mm' :
           selectedResultType === 'stress' ? '应力单位: kPa' :
           selectedResultType === 'strain' ? '应变单位: %' : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          变形比例: {deformationScale}x
        </Typography>
      </Box>
    </Paper>
  );
};

export default ResultViewer; 