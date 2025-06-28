import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Divider,
  Stack,
  Slider,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
  Tabs,
  Tab
} from '@mui/material';
import {
  ViewInAr as ViewInArIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Download as DownloadIcon,
  Fullscreen as FullscreenIcon,
  Colorize as ColorizeIcon,
  Tune as TuneIcon,
  GridOn as GridOnIcon,
  GridOff as GridOffIcon
} from '@mui/icons-material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { ResultType } from '../models/types';

// 结果类型选项
interface ResultTypeOption {
  value: string;
  label: string;
  unit: string;
  colorMap: string;
}

const resultTypeOptions: ResultTypeOption[] = [
  { value: 'displacement', label: '位移', unit: 'mm', colorMap: 'rainbow' },
  { value: 'stress', label: '应力', unit: 'kPa', colorMap: 'jet' },
  { value: 'strain', label: '应变', unit: '%', colorMap: 'viridis' },
  { value: 'safety_factor', label: '安全系数', unit: '', colorMap: 'plasma' }
];

// 变形放大选项
const deformationScaleOptions = [
  { value: 1, label: '1x' },
  { value: 5, label: '5x' },
  { value: 10, label: '10x' },
  { value: 20, label: '20x' },
  { value: 50, label: '50x' },
  { value: 100, label: '100x' }
];

/**
 * 结果可视化页面
 * 用于展示计算结果的三维可视化
 */
const ResultVisualization: React.FC = () => {
  // 假设项目ID从URL参数获取
  const projectId = 1;
  
  // 状态
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resultData, setResultData] = useState<any | null>(null);
  const [currentTab, setCurrentTab] = useState<number>(0);
  
  // 可视化参数
  const [resultType, setResultType] = useState<string>('displacement');
  const [deformationScale, setDeformationScale] = useState<number>(10);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showAxes, setShowAxes] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [colorMapRange, setColorMapRange] = useState<[number, number]>([0, 100]);
  const [currentStage, setCurrentStage] = useState<number>(0);
  const [visibleComponents, setVisibleComponents] = useState({
    soil: true,
    wall: true,
    excavation: true,
    support: true,
    mesh: false
  });
  
  // Three.js 引用
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  
  // 加载结果数据
  useEffect(() => {
    const fetchResultData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // 实际应用中应该调用API
        // const data = await api.visualization.getResultData(projectId, resultType);
        
        // 模拟数据
        const data = {
          project_id: projectId,
          type: resultType,
          stages: [
            { id: 1, name: '第一阶段', depth: 3 },
            { id: 2, name: '第二阶段', depth: 6 },
            { id: 3, name: '第三阶段', depth: 10 }
          ],
          max_value: resultType === 'displacement' ? 25.6 : 
                     resultType === 'stress' ? 1200 : 
                     resultType === 'strain' ? 0.5 : 1.5,
          min_value: 0,
          nodes: generateMockNodes(1000),
          elements: generateMockElements(800)
        };
        
        setResultData(data);
        setColorMapRange([0, data.max_value]);
      } catch (err) {
        console.error('获取结果数据失败:', err);
        setError('无法加载结果数据');
      } finally {
        setLoading(false);
      }
    };
    
    fetchResultData();
  }, [projectId, resultType]);
  
  // 初始化三维场景
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      45,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 50);
    cameraRef.current = camera;
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 添加网格
    if (showGrid) {
      const gridHelper = new THREE.GridHelper(100, 100);
      gridHelper.position.y = -0.01;
      scene.add(gridHelper);
    }
    
    // 添加坐标轴
    if (showAxes) {
      const axesHelper = new THREE.AxesHelper(20);
      scene.add(axesHelper);
    }
    
    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (containerRef.current && rendererRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      if (sceneRef.current) {
        // 清除场景中的所有对象
        while (sceneRef.current.children.length > 0) {
          const object = sceneRef.current.children[0];
          sceneRef.current.remove(object);
        }
      }
    };
  }, [showGrid, showAxes]);
  
  // 更新模型
  useEffect(() => {
    if (!sceneRef.current || !resultData) return;
    
    // 清除现有模型
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
    }
    
    // 创建新模型组
    const modelGroup = new THREE.Group();
    modelRef.current = modelGroup;
    
    // 添加模型到场景
    sceneRef.current.add(modelGroup);
    
    // 创建基于结果的模型
    createResultModel(resultData, modelGroup);
    
  }, [resultData, resultType, deformationScale, visibleComponents]);
  
  // 创建结果模型
  const createResultModel = (data: any, group: THREE.Group) => {
    if (!data || !data.nodes || !data.elements) return;
    
    // 创建材质
    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      side: THREE.DoubleSide,
      flatShading: true
    });
    
    // 创建几何体
    const geometry = new THREE.BufferGeometry();
    
    // 顶点位置
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    // 处理元素和节点
    data.elements.forEach((element: any, elementIndex: number) => {
      // 四面体单元
      if (element.nodes.length === 4) {
        const nodeIndices = element.nodes;
        
        // 添加四个三角形面
        // 面1: 0-1-2
        indices.push(elementIndex * 4 + 0, elementIndex * 4 + 1, elementIndex * 4 + 2);
        // 面2: 0-1-3
        indices.push(elementIndex * 4 + 0, elementIndex * 4 + 1, elementIndex * 4 + 3);
        // 面3: 0-2-3
        indices.push(elementIndex * 4 + 0, elementIndex * 4 + 2, elementIndex * 4 + 3);
        // 面4: 1-2-3
        indices.push(elementIndex * 4 + 1, elementIndex * 4 + 2, elementIndex * 4 + 3);
        
        // 添加节点位置和颜色
        nodeIndices.forEach((nodeIndex: number) => {
          const node = data.nodes[nodeIndex];
          
          // 应用变形
          const deformedX = node.x + (node.dx || 0) * deformationScale;
          const deformedY = node.y + (node.dy || 0) * deformationScale;
          const deformedZ = node.z + (node.dz || 0) * deformationScale;
          
          positions.push(deformedX, deformedY, deformedZ);
          
          // 计算颜色
          const value = node[resultType] || 0;
          const normalizedValue = (value - data.min_value) / (data.max_value - data.min_value);
          const color = getColorFromValue(normalizedValue);
          
          colors.push(color.r, color.g, color.b);
        });
      }
    });
    
    // 设置几何体属性
    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    
    // 计算法线
    geometry.computeVertexNormals();
    
    // 创建网格
    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
    
    // 添加边框
    if (visibleComponents.mesh) {
      const edgesGeometry = new THREE.EdgesGeometry(geometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      group.add(edges);
    }
  };
  
  // 从值获取颜色
  const getColorFromValue = (normalizedValue: number): THREE.Color => {
    // 彩虹色映射
    const hue = (1 - normalizedValue) * 0.7; // 从红色到紫色
    return new THREE.Color().setHSL(hue, 1, 0.5);
  };
  
  // 生成模拟节点数据
  const generateMockNodes = (count: number) => {
    const nodes: any[] = [];
    
    for (let i = 0; i < count; i++) {
      const x = Math.random() * 50 - 25;
      const y = Math.random() * 50 - 25;
      const z = Math.random() * 30 - 30;
      
      const displacement = Math.sqrt(x * x + y * y + z * z) / 10;
      const stress = displacement * 50;
      const strain = displacement / 100;
      const safetyFactor = 2 - displacement / 20;
      
      nodes.push({
        id: i,
        x, y, z,
        dx: displacement * Math.random() * 0.2,
        dy: displacement * Math.random() * 0.2,
        dz: displacement * Math.random() * 0.2,
        displacement,
        stress,
        strain,
        safety_factor: safetyFactor
      });
    }
    
    return nodes;
  };
  
  // 生成模拟单元数据
  const generateMockElements = (count: number) => {
    const elements: any[] = [];
    
    for (let i = 0; i < count; i++) {
      elements.push({
        id: i,
        type: 'tetra',
        nodes: [
          Math.floor(Math.random() * 1000),
          Math.floor(Math.random() * 1000),
          Math.floor(Math.random() * 1000),
          Math.floor(Math.random() * 1000)
        ]
      });
    }
    
    return elements;
  };
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // 处理结果类型变化
  const handleResultTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setResultType(event.target.value as string);
  };
  
  // 处理变形放大系数变化
  const handleDeformationScaleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setDeformationScale(event.target.value as number);
  };
  
  // 处理组件可见性变化
  const handleVisibilityChange = (component: string, visible: boolean) => {
    setVisibleComponents(prev => ({
      ...prev,
      [component]: visible
    }));
  };
  
  // 处理颜色范围变化
  const handleColorRangeChange = (event: Event, newValue: number | number[]) => {
    setColorMapRange(newValue as [number, number]);
  };
  
  // 处理阶段变化
  const handleStageChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setCurrentStage(event.target.value as number);
  };
  
  // 重置视图
  const handleResetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(50, 50, 50);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.reset();
    }
  };
  
  // 导出图片
  const handleExportImage = () => {
    if (!rendererRef.current) return;
    
    const dataURL = rendererRef.current.domElement.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `result-${resultType}-stage-${currentStage}.png`;
    link.click();
  };
  
  // 获取当前结果类型的单位
  const getCurrentUnit = () => {
    const option = resultTypeOptions.find(opt => opt.value === resultType);
    return option ? option.unit : '';
  };
  
  // 渲染图例
  const renderLegend = () => {
    if (!showLegend || !resultData) return null;
    
    const min = colorMapRange[0];
    const max = colorMapRange[1];
    const unit = getCurrentUnit();
    
    return (
      <Box
        sx={{
          position: 'absolute',
          right: 16,
          bottom: 16,
          width: 40,
          height: 200,
          bgcolor: 'background.paper',
          borderRadius: 1,
          boxShadow: 3,
          p: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}
      >
        <Box
          sx={{
            width: 20,
            height: 160,
            background: 'linear-gradient(to top, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)',
            mb: 1
          }}
        />
        <Typography variant="caption">{max}{unit}</Typography>
        <Typography variant="caption">{min}{unit}</Typography>
      </Box>
    );
  };
  
  return (
    <Container maxWidth="xl" sx={{ mt: 2 }}>
      <Typography variant="h5" gutterBottom>
        结果可视化
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Grid container spacing={2}>
        {/* 左侧控制面板 */}
        <Grid item xs={12} md={3}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              可视化控制
            </Typography>
            
            <Stack spacing={3}>
              <FormControl fullWidth>
                <InputLabel>结果类型</InputLabel>
                <Select
                  value={resultType}
                  label="结果类型"
                  onChange={handleResultTypeChange}
                >
                  {resultTypeOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label} ({option.unit})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              <FormControl fullWidth>
                <InputLabel>变形放大系数</InputLabel>
                <Select
                  value={deformationScale}
                  label="变形放大系数"
                  onChange={handleDeformationScaleChange}
                >
                  {deformationScaleOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {resultData && resultData.stages && (
                <FormControl fullWidth>
                  <InputLabel>施工阶段</InputLabel>
                  <Select
                    value={currentStage}
                    label="施工阶段"
                    onChange={handleStageChange}
                  >
                    {resultData.stages.map((stage: any, index: number) => (
                      <MenuItem key={stage.id} value={index}>
                        {stage.name} (深度: {stage.depth}m)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              
              <Divider />
              
              <Typography variant="subtitle2" gutterBottom>
                颜色范围
              </Typography>
              
              <Box sx={{ px: 1 }}>
                <Slider
                  value={colorMapRange}
                  onChange={handleColorRangeChange}
                  valueLabelDisplay="auto"
                  min={0}
                  max={resultData ? resultData.max_value : 100}
                  step={resultData ? resultData.max_value / 100 : 1}
                />
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="caption">
                    {colorMapRange[0].toFixed(2)}{getCurrentUnit()}
                  </Typography>
                  <Typography variant="caption">
                    {colorMapRange[1].toFixed(2)}{getCurrentUnit()}
                  </Typography>
                </Box>
              </Box>
              
              <Divider />
              
              <Typography variant="subtitle2" gutterBottom>
                显示选项
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={visibleComponents.soil}
                      onChange={(e) => handleVisibilityChange('soil', e.target.checked)}
                    />
                  }
                  label="显示土体"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={visibleComponents.wall}
                      onChange={(e) => handleVisibilityChange('wall', e.target.checked)}
                    />
                  }
                  label="显示支护结构"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={visibleComponents.excavation}
                      onChange={(e) => handleVisibilityChange('excavation', e.target.checked)}
                    />
                  }
                  label="显示开挖区域"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={visibleComponents.mesh}
                      onChange={(e) => handleVisibilityChange('mesh', e.target.checked)}
                    />
                  }
                  label="显示网格"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                    />
                  }
                  label="显示网格线"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showAxes}
                      onChange={(e) => setShowAxes(e.target.checked)}
                    />
                  }
                  label="显示坐标轴"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={showLegend}
                      onChange={(e) => setShowLegend(e.target.checked)}
                    />
                  }
                  label="显示图例"
                />
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Button
                  variant="outlined"
                  startIcon={<RefreshIcon />}
                  onClick={handleResetView}
                >
                  重置视图
                </Button>
                <Button
                  variant="contained"
                  startIcon={<DownloadIcon />}
                  onClick={handleExportImage}
                >
                  导出图片
                </Button>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        
        {/* 右侧可视化区域 */}
        <Grid item xs={12} md={9}>
          <Paper sx={{ p: 2 }}>
            <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
              <Tab icon={<ViewInArIcon />} label="三维视图" />
              <Tab icon={<ColorizeIcon />} label="云图" />
              <Tab icon={<TuneIcon />} label="剖面图" />
            </Tabs>
            
            <Box sx={{ position: 'relative', height: 600, bgcolor: '#f0f0f0', borderRadius: 1 }}>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                  <CircularProgress />
                </Box>
              ) : (
                <>
                  {/* 三维视图容器 */}
                  <Box 
                    ref={containerRef} 
                    sx={{ 
                      width: '100%', 
                      height: '100%',
                      borderRadius: 1,
                      overflow: 'hidden'
                    }} 
                  />
                  
                  {/* 视图控制按钮 */}
                  <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
                    <Tooltip title="放大">
                      <IconButton 
                        sx={{ bgcolor: 'background.paper', mb: 1, boxShadow: 1 }}
                        onClick={() => {
                          if (cameraRef.current) {
                            cameraRef.current.position.multiplyScalar(0.9);
                          }
                        }}
                      >
                        <ZoomInIcon />
                      </IconButton>
                    </Tooltip>
                    <br />
                    <Tooltip title="缩小">
                      <IconButton 
                        sx={{ bgcolor: 'background.paper', boxShadow: 1 }}
                        onClick={() => {
                          if (cameraRef.current) {
                            cameraRef.current.position.multiplyScalar(1.1);
                          }
                        }}
                      >
                        <ZoomOutIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                  
                  {/* 图例 */}
                  {renderLegend()}
                </>
              )}
            </Box>
            
            {/* 结果信息 */}
            <Grid container spacing={2} sx={{ mt: 2 }}>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      结果概述
                    </Typography>
                    {resultData && (
                      <>
                        <Typography variant="body2">
                          <strong>当前结果类型:</strong> {
                            resultTypeOptions.find(opt => opt.value === resultType)?.label || resultType
                          }
                        </Typography>
                        <Typography variant="body2">
                          <strong>最大值:</strong> {resultData.max_value} {getCurrentUnit()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>最小值:</strong> {resultData.min_value} {getCurrentUnit()}
                        </Typography>
                        <Typography variant="body2">
                          <strong>当前阶段:</strong> {
                            resultData.stages?.[currentStage]?.name || '未知'
                          }
                        </Typography>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={6}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      模型信息
                    </Typography>
                    {resultData && (
                      <>
                        <Typography variant="body2">
                          <strong>节点数量:</strong> {resultData.nodes?.length || 0}
                        </Typography>
                        <Typography variant="body2">
                          <strong>单元数量:</strong> {resultData.elements?.length || 0}
                        </Typography>
                        <Typography variant="body2">
                          <strong>变形放大系数:</strong> {deformationScale}x
                        </Typography>
                      </>
                    )}
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

export default ResultVisualization; 