import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  Paper, 
  Typography,
  Tabs, 
  Tab, 
  Grid, 
  Button,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Divider,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  Add as AddIcon, 
  Delete as DeleteIcon, 
  Edit as EditIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import * as THREE from 'three';
import SchematicDiagram2D from './SchematicDiagram2D';

// 定义土体参数接口
interface TerrainLayer {
  id: string;
  name: string;
  depth: number;
  thickness: number;
  color: string;
  soilType: string;
  parameters: {
    elasticModulus: number;
    poissonRatio: number;
    cohesion: number;
    frictionAngle: number;
    unitWeight: number;
  };
}

interface TerrainDomainProps {
  width?: number | string;
  height?: number;
}

/**
 * 土体计算域组件
 * 支持平面视图和侧面视图切换，以及土层参数编辑
 */
const TerrainDomain: React.FC<TerrainDomainProps> = ({ width = '100%', height = 600 }) => {
  // 当前视图选项卡
  const [currentTab, setCurrentTab] = useState(0);
  
  // 平面区域参数
  const [domainWidth, setDomainWidth] = useState(50);
  const [domainLength, setDomainLength] = useState(50);
  
  // 土层数据
  const [layers, setLayers] = useState<TerrainLayer[]>([
    {
      id: '1',
      name: '填土层',
      depth: 0,
      thickness: 3,
      color: '#d2b48c',
      soilType: 'fill',
      parameters: {
        elasticModulus: 10000,
        poissonRatio: 0.3,
        cohesion: 10,
        frictionAngle: 20,
        unitWeight: 18
      }
    },
    {
      id: '2',
      name: '粘土层',
      depth: 3,
      thickness: 5,
      color: '#8b4513',
      soilType: 'clay',
      parameters: {
        elasticModulus: 20000,
        poissonRatio: 0.35,
        cohesion: 25,
        frictionAngle: 15,
        unitWeight: 19
      }
    },
    {
      id: '3',
      name: '砂土层',
      depth: 8,
      thickness: 7,
      color: '#f5deb3',
      soilType: 'sand',
      parameters: {
        elasticModulus: 35000,
        poissonRatio: 0.25,
        cohesion: 5,
        frictionAngle: 30,
        unitWeight: 20
      }
    }
  ]);
  
  // 当前选中的土层
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  
  // 地下水位
  const [waterLevel, setWaterLevel] = useState(6);
  const [showWaterLevel, setShowWaterLevel] = useState(true);
  
  // 场景和相机引用
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // 模型对象引用
  const planeMeshRef = useRef<THREE.Mesh | null>(null);
  const layerMeshesRef = useRef<Record<string, THREE.Mesh>>({});
  const waterMeshRef = useRef<THREE.Mesh | null>(null);
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // 添加新土层
  const handleAddLayer = () => {
    const lastLayer = layers[layers.length - 1];
    const lastDepth = lastLayer ? lastLayer.depth + lastLayer.thickness : 0;
    
    const newLayer: TerrainLayer = {
      id: `layer-${Date.now()}`,
      name: `土层 ${layers.length + 1}`,
      depth: lastDepth,
      thickness: 5,
      color: getRandomColor(),
      soilType: 'general',
      parameters: {
        elasticModulus: 20000,
        poissonRatio: 0.3,
        cohesion: 15,
        frictionAngle: 25,
        unitWeight: 19
      }
    };
    
    setLayers([...layers, newLayer]);
    setSelectedLayerId(newLayer.id);
  };
  
  // 删除土层
  const handleDeleteLayer = (id: string) => {
    setLayers(layers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(null);
    }
  };
  
  // 选中土层
  const handleSelectLayer = (id: string) => {
    setSelectedLayerId(id === selectedLayerId ? null : id);
  };
  
  // 更新土层参数
  const handleUpdateLayer = (id: string, field: string, value: any) => {
    setLayers(layers.map(layer => {
      if (layer.id === id) {
        if (field.includes('.')) {
          const [parent, child] = field.split('.');
          return {
            ...layer,
            [parent]: {
              ...layer[parent as keyof TerrainLayer] as Record<string, any>,
              [child]: value
            }
          };
        }
        return { ...layer, [field]: value };
      }
      return layer;
    }));
  };
  
  // 初始化三维场景
  const handleSceneReady = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    sceneRef.current = scene;
    cameraRef.current = camera;
    
    // 根据当前选项卡初始化视图
    if (currentTab === 0) {
      initializePlanView();
    } else {
      initializeSectionView();
    }
  };
  
  // 初始化平面视图
  const initializePlanView = () => {
    if (!sceneRef.current) return;
    
    // 清除之前的模型
    clearScene();
    
    // 创建平面区域
    const planeGeometry = new THREE.PlaneGeometry(domainWidth, domainLength);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7
    });
    const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial);
    planeMesh.rotation.x = -Math.PI / 2; // 水平放置
    sceneRef.current.add(planeMesh);
    planeMeshRef.current = planeMesh;
    
    // 添加计算域边界线
    const borderGeometry = new THREE.EdgesGeometry(planeGeometry);
    const borderMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const border = new THREE.LineSegments(borderGeometry, borderMaterial);
    border.rotation.x = -Math.PI / 2;
    border.position.z = 0.01;
    sceneRef.current.add(border);
    
    // 添加尺寸标注
    addDimensionLabels();
  };
  
  // 初始化剖面视图
  const initializeSectionView = () => {
    if (!sceneRef.current) return;
    
    // 清除之前的模型
    clearScene();
    
    // 计算总厚度
    const totalThickness = layers.reduce((sum, layer) => sum + layer.thickness, 0);
    
    // 创建土层模型
    layers.forEach(layer => {
      const layerGeometry = new THREE.BoxGeometry(domainWidth, layer.thickness, domainLength);
      const layerMaterial = new THREE.MeshStandardMaterial({
        color: new THREE.Color(layer.color),
        transparent: true,
        opacity: 0.8,
      });
      
      const layerMesh = new THREE.Mesh(layerGeometry, layerMaterial);
      layerMesh.position.set(0, totalThickness / 2 - (layer.depth + layer.thickness / 2), 0);
      sceneRef.current!.add(layerMesh);
      
      // 存储模型引用
      layerMeshesRef.current[layer.id] = layerMesh;
      
      // 边框，使土层更易区分
      const edgesGeometry = new THREE.EdgesGeometry(layerGeometry);
      const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
      const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
      edges.position.copy(layerMesh.position);
      sceneRef.current!.add(edges);
      
      // 添加土层标签
      const labelDiv = document.createElement('div');
      labelDiv.textContent = layer.name;
      labelDiv.style.color = 'black';
      labelDiv.style.backgroundColor = 'white';
      labelDiv.style.padding = '2px 6px';
      labelDiv.style.borderRadius = '4px';
      labelDiv.style.fontSize = '12px';
      
      const labelObject = new CSS3DObject(labelDiv);
      const labelPosition = layerMesh.position.clone();
      labelPosition.x -= domainWidth / 2 * 0.8;
      labelObject.position.copy(labelPosition);
      labelObject.scale.set(0.1, 0.1, 0.1);
      sceneRef.current!.add(labelObject);
    });
    
    // 添加地下水位平面
    if (showWaterLevel) {
      const waterGeometry = new THREE.PlaneGeometry(domainWidth * 1.2, domainLength * 1.2);
      const waterMaterial = new THREE.MeshStandardMaterial({
        color: 0x3399ff,
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
      const waterPosition = totalThickness / 2 - waterLevel;
      waterMesh.position.set(0, waterPosition, 0);
      waterMesh.rotation.x = Math.PI / 2;
      sceneRef.current!.add(waterMesh);
      waterMeshRef.current = waterMesh;
      
      // 水位标签
      const waterLabelDiv = document.createElement('div');
      waterLabelDiv.textContent = `水位 ${waterLevel}m`;
      waterLabelDiv.style.color = 'blue';
      waterLabelDiv.style.backgroundColor = 'rgba(255,255,255,0.7)';
      waterLabelDiv.style.padding = '2px 6px';
      waterLabelDiv.style.borderRadius = '4px';
      waterLabelDiv.style.fontSize = '12px';
      
      const waterLabel = new CSS3DObject(waterLabelDiv);
      waterLabel.position.set(domainWidth / 2, waterPosition, 0);
      waterLabel.scale.set(0.1, 0.1, 0.1);
      sceneRef.current!.add(waterLabel);
    }
    
    // 调整相机位置以适应土层
    if (cameraRef.current) {
      cameraRef.current.position.set(0, totalThickness / 2, domainWidth);
      cameraRef.current.lookAt(0, totalThickness / 2, 0);
    }
  };
  
  // 添加尺寸标注
  const addDimensionLabels = () => {
    if (!sceneRef.current) return;
    
    // 宽度标签
    const widthLabelDiv = document.createElement('div');
    widthLabelDiv.textContent = `宽度: ${domainWidth}m`;
    widthLabelDiv.style.color = 'black';
    widthLabelDiv.style.backgroundColor = 'rgba(255,255,255,0.7)';
    widthLabelDiv.style.padding = '2px 6px';
    widthLabelDiv.style.borderRadius = '4px';
    widthLabelDiv.style.fontSize = '12px';
    
    const widthLabel = new CSS3DObject(widthLabelDiv);
    widthLabel.position.set(0, 0, domainLength / 2 + 1);
    widthLabel.scale.set(0.1, 0.1, 0.1);
    sceneRef.current.add(widthLabel);
    
    // 长度标签
    const lengthLabelDiv = document.createElement('div');
    lengthLabelDiv.textContent = `长度: ${domainLength}m`;
    lengthLabelDiv.style.color = 'black';
    lengthLabelDiv.style.backgroundColor = 'rgba(255,255,255,0.7)';
    lengthLabelDiv.style.padding = '2px 6px';
    lengthLabelDiv.style.borderRadius = '4px';
    lengthLabelDiv.style.fontSize = '12px';
    
    const lengthLabel = new CSS3DObject(lengthLabelDiv);
    lengthLabel.position.set(domainWidth / 2 + 1, 0, 0);
    lengthLabel.scale.set(0.1, 0.1, 0.1);
    sceneRef.current.add(lengthLabel);
  };
  
  // 清除场景中的模型
  const clearScene = () => {
    if (!sceneRef.current) return;
    
    // 仅保留灯光和辅助对象，移除所有模型
    const objectsToRemove: THREE.Object3D[] = [];
    
    sceneRef.current.traverse(object => {
      if (
        object instanceof THREE.Mesh || 
        object instanceof THREE.LineSegments ||
        object instanceof CSS3DObject
      ) {
        objectsToRemove.push(object);
      }
    });
    
    objectsToRemove.forEach(obj => {
      sceneRef.current!.remove(obj);
    });
    
    // 重置引用
    planeMeshRef.current = null;
    layerMeshesRef.current = {};
    waterMeshRef.current = null;
  };
  
  // 生成随机颜色
  const getRandomColor = () => {
    const earthColors = [
      '#d2b48c', '#8b4513', '#f5deb3', '#deb887', '#cd853f', 
      '#bc8f8f', '#a0522d', '#9acd32', '#b8860b', '#bdb76b'
    ];
    return earthColors[Math.floor(Math.random() * earthColors.length)];
  };
  
  // 当选项卡变化时重新初始化视图
  useEffect(() => {
    if (sceneRef.current) {
      if (currentTab === 0) {
        initializePlanView();
      } else {
        initializeSectionView();
      }
    }
  }, [currentTab, domainWidth, domainLength, layers, waterLevel, showWaterLevel]);
  
  // 计算土层总深度
  const totalDepth = layers.reduce((sum, layer) => sum + layer.thickness, 0);
  
  return (
    <Box sx={{ width }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          土体计算域
        </Typography>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="平面视图" />
          <Tab label="侧面视图" />
        </Tabs>
        
        <Grid container spacing={2}>
          {/* 左侧参数区 */}
          <Grid item xs={12} md={4}>
            <Stack spacing={2}>
              <Typography variant="subtitle1" gutterBottom>
                计算域参数
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <TextField
                    label="宽度"
                    value={domainWidth}
                    onChange={(e) => setDomainWidth(Number(e.target.value))}
                    type="number"
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                    size="small"
                  />
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    label="长度"
                    value={domainLength}
                    onChange={(e) => setDomainLength(Number(e.target.value))}
                    type="number"
                    fullWidth
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                    size="small"
                  />
                </Grid>
              </Grid>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1">
                  土层信息
                </Typography>
                <Button 
                  startIcon={<AddIcon />} 
                  size="small"
                  onClick={handleAddLayer}
                  variant="outlined"
                >
                  添加土层
                </Button>
              </Box>
              
              <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                {layers.map((layer, index) => (
                  <Paper 
                    key={layer.id} 
                    sx={{ 
                      p: 1, 
                      mb: 1, 
                      display: 'flex', 
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: `4px solid ${layer.color}`,
                      bgcolor: selectedLayerId === layer.id ? 'action.selected' : 'background.paper'
                    }}
                    onClick={() => handleSelectLayer(layer.id)}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight="bold">
                        {layer.name}
                      </Typography>
                      <Typography variant="caption" display="block" color="text.secondary">
                        深度: {layer.depth}m - {layer.depth + layer.thickness}m
                      </Typography>
                    </Box>
                    <IconButton 
                      size="small" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLayer(layer.id);
                      }}
                      disabled={layers.length <= 1}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Paper>
                ))}
              </Box>
              
              <Divider />
              
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <TextField
                  label="地下水位"
                  value={waterLevel}
                  onChange={(e) => setWaterLevel(Number(e.target.value))}
                  type="number"
                  size="small"
                  sx={{ width: '70%' }}
                  InputProps={{
                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                  }}
                  disabled={!showWaterLevel}
                />
                <Button 
                  variant={showWaterLevel ? "contained" : "outlined"}
                  size="small"
                  onClick={() => setShowWaterLevel(!showWaterLevel)}
                >
                  {showWaterLevel ? '显示' : '隐藏'}
                </Button>
              </Box>
            </Stack>
          </Grid>
          
          {/* 右侧视图区 */}
          <Grid item xs={12} md={8}>
            <Box sx={{ position: 'relative', height: 400 }}>
              {/* 视图操作按钮 */}
              <Box sx={{ position: 'absolute', top: 10, right: 10, zIndex: 100 }}>
                <Tooltip title="重置视图">
                  <IconButton size="small" sx={{ bgcolor: 'background.paper', mr: 1, boxShadow: 1 }}>
                    <RefreshIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="放大">
                  <IconButton size="small" sx={{ bgcolor: 'background.paper', mr: 1, boxShadow: 1 }}>
                    <ZoomInIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="缩小">
                  <IconButton size="small" sx={{ bgcolor: 'background.paper', boxShadow: 1 }}>
                    <ZoomOutIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
              
              {/* 示意图组件 */}
              <SchematicDiagram2D
                height={400}
                onSceneReady={handleSceneReady}
              />
            </Box>
            
            {/* 图例和信息 */}
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              {currentTab === 1 && (
                <Stack direction="row" spacing={3}>
                  {layers.map(layer => (
                    <Box key={layer.id} sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          bgcolor: layer.color,
                          mr: 1,
                          border: '1px solid rgba(0,0,0,0.2)'
                        }} 
                      />
                      <Typography variant="caption">
                        {layer.name}
                      </Typography>
                    </Box>
                  ))}
                  {showWaterLevel && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Box 
                        sx={{ 
                          width: 16, 
                          height: 16, 
                          bgcolor: 'rgba(51, 153, 255, 0.3)',
                          mr: 1,
                          border: '1px solid blue'
                        }} 
                      />
                      <Typography variant="caption">
                        地下水位 ({waterLevel}m)
                      </Typography>
                    </Box>
                  )}
                </Stack>
              )}
            </Box>
          </Grid>
        </Grid>
      </Paper>
      
      {/* 详细参数编辑区 */}
      {selectedLayerId && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="subtitle1" gutterBottom>
            土层参数编辑
          </Typography>
          
          {layers.map(layer => {
            if (layer.id !== selectedLayerId) return null;
            
            return (
              <Grid container spacing={2} key={layer.id}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="土层名称"
                    value={layer.name}
                    onChange={(e) => handleUpdateLayer(layer.id, 'name', e.target.value)}
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <FormControl fullWidth size="small">
                    <InputLabel>土类型</InputLabel>
                    <Select
                      value={layer.soilType}
                      label="土类型"
                      onChange={(e) => handleUpdateLayer(layer.id, 'soilType', e.target.value)}
                    >
                      <MenuItem value="fill">填土</MenuItem>
                      <MenuItem value="clay">粘土</MenuItem>
                      <MenuItem value="sand">砂土</MenuItem>
                      <MenuItem value="gravel">砾石</MenuItem>
                      <MenuItem value="rock">岩石</MenuItem>
                      <MenuItem value="general">一般土</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="深度"
                    value={layer.depth}
                    onChange={(e) => handleUpdateLayer(layer.id, 'depth', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="厚度"
                    value={layer.thickness}
                    onChange={(e) => handleUpdateLayer(layer.id, 'thickness', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                  />
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    强度参数
                  </Typography>
                </Grid>
                
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="弹性模量"
                    value={layer.parameters.elasticModulus}
                    onChange={(e) => handleUpdateLayer(layer.id, 'parameters.elasticModulus', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kPa</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="泊松比"
                    value={layer.parameters.poissonRatio}
                    onChange={(e) => handleUpdateLayer(layer.id, 'parameters.poissonRatio', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="粘聚力"
                    value={layer.parameters.cohesion}
                    onChange={(e) => handleUpdateLayer(layer.id, 'parameters.cohesion', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kPa</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="摩擦角"
                    value={layer.parameters.frictionAngle}
                    onChange={(e) => handleUpdateLayer(layer.id, 'parameters.frictionAngle', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">°</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="重度"
                    value={layer.parameters.unitWeight}
                    onChange={(e) => handleUpdateLayer(layer.id, 'parameters.unitWeight', Number(e.target.value))}
                    type="number"
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">kN/m³</InputAdornment>,
                    }}
                  />
                </Grid>
                <Grid item xs={6} sm={4} md={2}>
                  <TextField
                    label="颜色"
                    value={layer.color}
                    onChange={(e) => handleUpdateLayer(layer.id, 'color', e.target.value)}
                    fullWidth
                    size="small"
                    type="color"
                  />
                </Grid>
              </Grid>
            );
          })}
        </Paper>
      )}
    </Box>
  );
};

export default TerrainDomain;