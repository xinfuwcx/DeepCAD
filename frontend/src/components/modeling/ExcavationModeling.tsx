import React, { useState, useRef, useEffect } from 'react';
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
  IconButton,
  Stack,
  FormControlLabel,
  Switch,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  Upload as UploadIcon,
  SwapVert as SwapVertIcon,
  ContentCut as ContentCutIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import * as THREE from 'three';
import SchematicDiagram2D from './SchematicDiagram2D';

// 点坐标接口
interface Point {
  id: string;
  x: number;
  y: number;
}

// 挖掘阶段接口
interface ExcavationStage {
  id: string;
  name: string;
  depth: number;
  color: string;
}

// 支护结构接口
interface SupportStructure {
  id: string;
  type: 'wall' | 'anchor' | 'strut';
  name: string;
  depth?: number;  // 对于墙
  level?: number;  // 对于锚杆或支撑
  points?: Point[];  // 对于墙
  length?: number;  // 对于锚杆
  angle?: number;  // 对于锚杆
  params: Record<string, any>;
}

interface ExcavationModelingProps {
  width?: number | string;
  height?: number;
}

/**
 * 基坑建模组件
 * 支持通过DXF导入或坐标点定义基坑轮廓
 */
const ExcavationModeling: React.FC<ExcavationModelingProps> = ({ 
  width = '100%', 
  height = 600 
}) => {
  // 当前选项卡
  const [currentTab, setCurrentTab] = useState(0);
  
  // 基坑参数
  const [excavationDepth, setExcavationDepth] = useState(10);
  const [excavationPoints, setExcavationPoints] = useState<Point[]>([
    { id: '1', x: 0, y: 0 },
    { id: '2', x: 20, y: 0 },
    { id: '3', x: 20, y: 15 },
    { id: '4', x: 0, y: 15 }
  ]);
  
  // 施工阶段
  const [excavationStages, setExcavationStages] = useState<ExcavationStage[]>([
    { id: '1', name: '第一阶段', depth: 3, color: '#ffcc80' },
    { id: '2', name: '第二阶段', depth: 6, color: '#ffb74d' },
    { id: '3', name: '第三阶段', depth: 10, color: '#ff9800' }
  ]);
  
  // 支护结构
  const [supportStructures, setSupportStructures] = useState<SupportStructure[]>([
    {
      id: '1',
      type: 'wall',
      name: '地下连续墙',
      depth: 15,
      points: [
        { id: 'w1', x: -1, y: -1 },
        { id: 'w2', x: 21, y: -1 },
        { id: 'w3', x: 21, y: 16 },
        { id: 'w4', x: -1, y: 16 }
      ],
      params: {
        thickness: 0.8,
        material: 'concrete',
        elasticModulus: 30000000
      }
    },
    {
      id: '2',
      type: 'anchor',
      name: '锚杆-L1',
      level: 2,
      length: 10,
      angle: 15,
      params: {
        diameter: 0.15,
        spacing: 2,
        preload: 200
      }
    }
  ]);
  
  // 当前编辑的点
  const [editingPoint, setEditingPoint] = useState<Point | null>(null);
  
  // 是否显示网格
  const [showGrid, setShowGrid] = useState(true);
  
  // 场景和相机引用
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // 模型对象引用
  const excavationMeshRef = useRef<THREE.Mesh | null>(null);
  const pointsGroupRef = useRef<THREE.Group | null>(null);
  
  // 文件输入引用
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // 处理点编辑
  const handlePointEdit = (id: string, field: 'x' | 'y', value: number) => {
    setExcavationPoints(points => 
      points.map(p => p.id === id ? { ...p, [field]: value } : p)
    );
  };
  
  // 添加新点
  const handleAddPoint = () => {
    // 找到最后一个点和第一个点
    const lastPoint = excavationPoints[excavationPoints.length - 1];
    const firstPoint = excavationPoints[0];
    
    // 计算新点的位置，在最后一个点和第一个点的中间
    const newX = (lastPoint.x + firstPoint.x) / 2;
    const newY = (lastPoint.y + firstPoint.y) / 2;
    
    const newPoint = {
      id: `point-${Date.now()}`,
      x: newX,
      y: newY
    };
    
    // 在倒数第二个位置插入新点
    const newPoints = [...excavationPoints];
    newPoints.splice(excavationPoints.length - 1, 0, newPoint);
    setExcavationPoints(newPoints);
    setEditingPoint(newPoint);
  };
  
  // 删除点
  const handleDeletePoint = (id: string) => {
    if (excavationPoints.length <= 3) {
      // 至少需要3个点才能形成基坑
      alert('基坑轮廓至少需要3个点');
      return;
    }
    
    setExcavationPoints(points => points.filter(p => p.id !== id));
    if (editingPoint?.id === id) {
      setEditingPoint(null);
    }
  };
  
  // 添加施工阶段
  const handleAddStage = () => {
    const lastStage = excavationStages[excavationStages.length - 1];
    const newDepth = Math.min(lastStage ? lastStage.depth + 3 : 3, excavationDepth);
    
    const stageColors = ['#ffcc80', '#ffb74d', '#ff9800', '#f57c00', '#e65100'];
    
    const newStage: ExcavationStage = {
      id: `stage-${Date.now()}`,
      name: `第${excavationStages.length + 1}阶段`,
      depth: newDepth,
      color: stageColors[excavationStages.length % stageColors.length]
    };
    
    setExcavationStages([...excavationStages, newStage]);
  };
  
  // 删除施工阶段
  const handleDeleteStage = (id: string) => {
    setExcavationStages(stages => stages.filter(s => s.id !== id));
  };
  
  // 更新施工阶段
  const handleUpdateStage = (id: string, field: keyof ExcavationStage, value: any) => {
    setExcavationStages(stages => 
      stages.map(s => s.id === id ? { ...s, [field]: value } : s)
    );
  };
  
  // 处理DXF导入
  const handleImportDXF = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // 处理文件选择
  const handleFileSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    // 在实际应用中，这里应该有解析DXF文件的逻辑
    // 下面是模拟解析得到的点
    setTimeout(() => {
      const simulatedPoints: Point[] = [
        { id: 'dxf-1', x: 0, y: 0 },
        { id: 'dxf-2', x: 25, y: 0 },
        { id: 'dxf-3', x: 25, y: 18 },
        { id: 'dxf-4', x: 0, y: 18 }
      ];
      
      setExcavationPoints(simulatedPoints);
      
      // 重置文件输入
      if (event.target) {
        event.target.value = '';
      }
    }, 500);
  };
  
  // 初始化三维场景
  const handleSceneReady = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    sceneRef.current = scene;
    cameraRef.current = camera;
    
    // 根据当前选项卡初始化视图
    updateExcavationModel();
  };
  
  // 更新挖掘模型
  const updateExcavationModel = () => {
    if (!sceneRef.current) return;
    
    // 清除之前的模型
    if (excavationMeshRef.current) {
      sceneRef.current.remove(excavationMeshRef.current);
      excavationMeshRef.current = null;
    }
    
    if (pointsGroupRef.current) {
      sceneRef.current.remove(pointsGroupRef.current);
      pointsGroupRef.current = null;
    }
    
    // 创建基坑区域形状
    const shape = new THREE.Shape();
    
    if (excavationPoints.length > 0) {
      shape.moveTo(excavationPoints[0].x, excavationPoints[0].y);
      
      for (let i = 1; i < excavationPoints.length; i++) {
        shape.lineTo(excavationPoints[i].x, excavationPoints[i].y);
      }
      
      shape.lineTo(excavationPoints[0].x, excavationPoints[0].y); // 闭合形状
    }
    
    // 创建挤出几何体
    const extrudeSettings = {
      depth: excavationDepth,
      bevelEnabled: false
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff9800,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    
    const excavationMesh = new THREE.Mesh(geometry, material);
    excavationMesh.rotation.x = Math.PI / 2; // 水平放置
    excavationMesh.position.z = 0; // 放在地表
    sceneRef.current.add(excavationMesh);
    excavationMeshRef.current = excavationMesh;
    
    // 添加边框
    const edgesGeometry = new THREE.EdgesGeometry(geometry);
    const edgesMaterial = new THREE.LineBasicMaterial({ color: 0x000000 });
    const edges = new THREE.LineSegments(edgesGeometry, edgesMaterial);
    edges.rotation.x = Math.PI / 2;
    sceneRef.current.add(edges);
    
    // 创建点标记
    const pointsGroup = new THREE.Group();
    sceneRef.current.add(pointsGroup);
    pointsGroupRef.current = pointsGroup;
    
    excavationPoints.forEach((point, index) => {
      // 点球体
      const sphereGeometry = new THREE.SphereGeometry(0.3, 16, 16);
      const sphereMaterial = new THREE.MeshBasicMaterial({ 
        color: editingPoint?.id === point.id ? 0xff0000 : 0x0000ff
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      sphere.position.set(point.x, point.y, 0.1);
      pointsGroup.add(sphere);
      
      // 点标签
      const labelDiv = document.createElement('div');
      labelDiv.className = 'point-label';
      labelDiv.textContent = `P${index + 1}(${point.x}, ${point.y})`;
      labelDiv.style.color = editingPoint?.id === point.id ? 'red' : 'blue';
      labelDiv.style.padding = '2px 6px';
      labelDiv.style.borderRadius = '4px';
      labelDiv.style.backgroundColor = 'rgba(255,255,255,0.7)';
      labelDiv.style.fontSize = '12px';
      labelDiv.style.pointerEvents = 'none';
      
      const label = new CSS3DObject(labelDiv);
      label.position.set(point.x, point.y + 1, 0.1);
      label.scale.set(0.1, 0.1, 0.1);
      sceneRef.current.add(label);
    });
    
    // 添加施工阶段标记
    excavationStages.forEach((stage) => {
      const stagePlaneGeometry = new THREE.PlaneGeometry(
        Math.max(...excavationPoints.map(p => p.x)) - Math.min(...excavationPoints.map(p => p.x)) + 5,
        Math.max(...excavationPoints.map(p => p.y)) - Math.min(...excavationPoints.map(p => p.y)) + 5
      );
      
      const stagePlaneMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(stage.color),
        transparent: true,
        opacity: 0.3,
        side: THREE.DoubleSide
      });
      
      const stagePlane = new THREE.Mesh(stagePlaneGeometry, stagePlaneMaterial);
      stagePlane.rotation.x = Math.PI / 2;
      stagePlane.position.set(
        (Math.max(...excavationPoints.map(p => p.x)) + Math.min(...excavationPoints.map(p => p.x))) / 2,
        (Math.max(...excavationPoints.map(p => p.y)) + Math.min(...excavationPoints.map(p => p.y))) / 2,
        -stage.depth
      );
      
      sceneRef.current.add(stagePlane);
      
      // 阶段标签
      const stageDiv = document.createElement('div');
      stageDiv.textContent = `${stage.name} (深度: ${stage.depth}m)`;
      stageDiv.style.color = 'black';
      stageDiv.style.backgroundColor = stage.color;
      stageDiv.style.padding = '3px 8px';
      stageDiv.style.borderRadius = '4px';
      stageDiv.style.fontSize = '12px';
      stageDiv.style.pointerEvents = 'none';
      
      const stageLabel = new CSS3DObject(stageDiv);
      stageLabel.position.set(
        Math.min(...excavationPoints.map(p => p.x)) - 2,
        Math.min(...excavationPoints.map(p => p.y)) - 2,
        -stage.depth
      );
      stageLabel.scale.set(0.1, 0.1, 0.1);
      sceneRef.current.add(stageLabel);
    });
    
    // 添加支护结构
    supportStructures.forEach(structure => {
      if (structure.type === 'wall' && structure.points) {
        // 绘制地下连续墙
        const wallShape = new THREE.Shape();
        if (structure.points.length > 0) {
          wallShape.moveTo(structure.points[0].x, structure.points[0].y);
          
          for (let i = 1; i < structure.points.length; i++) {
            wallShape.lineTo(structure.points[i].x, structure.points[i].y);
          }
          
          wallShape.lineTo(structure.points[0].x, structure.points[0].y);
        }
        
        const wallExtrudeSettings = {
          depth: structure.depth || 15,
          bevelEnabled: false
        };
        
        const wallGeometry = new THREE.ExtrudeGeometry(wallShape, wallExtrudeSettings);
        const wallMaterial = new THREE.MeshStandardMaterial({
          color: 0x4caf50,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        
        const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial);
        wallMesh.rotation.x = Math.PI / 2;
        wallMesh.position.z = 0.1; // 稍高于基坑
        sceneRef.current.add(wallMesh);
        
        // 墙边框
        const wallEdgesGeometry = new THREE.EdgesGeometry(wallGeometry);
        const wallEdgesMaterial = new THREE.LineBasicMaterial({ color: 0x388e3c });
        const wallEdges = new THREE.LineSegments(wallEdgesGeometry, wallEdgesMaterial);
        wallEdges.rotation.x = Math.PI / 2;
        wallEdges.position.z = 0.1;
        sceneRef.current.add(wallEdges);
      }
      
      if (structure.type === 'anchor') {
        // 在这里实现锚杆可视化
      }
    });
  };
  
  // 当点或基坑参数变化时更新模型
  useEffect(() => {
    if (sceneRef.current) {
      updateExcavationModel();
    }
  }, [excavationPoints, excavationDepth, excavationStages, editingPoint, supportStructures]);
  
  return (
    <Box sx={{ width }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          基坑建模
        </Typography>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="基坑轮廓" />
          <Tab label="施工阶段" />
          <Tab label="支护结构" />
        </Tabs>
        
        <Grid container spacing={2}>
          {/* 左侧参数区 */}
          <Grid item xs={12} md={4}>
            {currentTab === 0 && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    基坑参数
                  </Typography>
                  <Box>
                    <Button 
                      startIcon={<UploadIcon />} 
                      size="small" 
                      variant="outlined"
                      onClick={handleImportDXF}
                      sx={{ mr: 1 }}
                    >
                      导入DXF
                    </Button>
                    <input 
                      type="file" 
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept=".dxf"
                      onChange={handleFileSelected}
                    />
                    <Button 
                      startIcon={<AddIcon />} 
                      size="small"
                      variant="outlined"
                      onClick={handleAddPoint}
                    >
                      添加点
                    </Button>
                  </Box>
                </Box>
                
                <TextField
                  label="基坑深度"
                  value={excavationDepth}
                  onChange={(e) => setExcavationDepth(Number(e.target.value))}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                  }}
                  fullWidth
                  size="small"
                />
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      size="small"
                    />
                  }
                  label="显示网格"
                />
                
                <Divider />
                
                <Typography variant="subtitle2">
                  坐标点列表
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 250 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>序号</TableCell>
                        <TableCell>X坐标 (m)</TableCell>
                        <TableCell>Y坐标 (m)</TableCell>
                        <TableCell align="center">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {excavationPoints.map((point, index) => (
                        <TableRow 
                          key={point.id}
                          selected={editingPoint?.id === point.id}
                          onClick={() => setEditingPoint(editingPoint?.id === point.id ? null : point)}
                        >
                          <TableCell>P{index + 1}</TableCell>
                          <TableCell>
                            <TextField
                              value={point.x}
                              onChange={(e) => handlePointEdit(point.id, 'x', Number(e.target.value))}
                              type="number"
                              size="small"
                              variant="standard"
                              sx={{ width: '60px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={point.y}
                              onChange={(e) => handlePointEdit(point.id, 'y', Number(e.target.value))}
                              type="number"
                              size="small"
                              variant="standard"
                              sx={{ width: '60px' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeletePoint(point.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Stack>
            )}
            
            {currentTab === 1 && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    施工阶段
                  </Typography>
                  <Button 
                    startIcon={<AddIcon />} 
                    size="small"
                    variant="outlined"
                    onClick={handleAddStage}
                  >
                    添加阶段
                  </Button>
                </Box>
                
                <Typography variant="body2" color="text.secondary">
                  基坑总深度: {excavationDepth}m
                </Typography>
                
                <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>名称</TableCell>
                        <TableCell>深度 (m)</TableCell>
                        <TableCell>颜色</TableCell>
                        <TableCell align="center">操作</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {excavationStages.map((stage) => (
                        <TableRow key={stage.id}>
                          <TableCell>
                            <TextField
                              value={stage.name}
                              onChange={(e) => handleUpdateStage(stage.id, 'name', e.target.value)}
                              size="small"
                              variant="standard"
                              sx={{ width: '100px' }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              value={stage.depth}
                              onChange={(e) => handleUpdateStage(stage.id, 'depth', Math.min(Number(e.target.value), excavationDepth))}
                              type="number"
                              size="small"
                              variant="standard"
                              sx={{ width: '60px' }}
                              InputProps={{
                                inputProps: { max: excavationDepth }
                              }}
                            />
                          </TableCell>
                          <TableCell>
                            <TextField
                              type="color"
                              value={stage.color}
                              onChange={(e) => handleUpdateStage(stage.id, 'color', e.target.value)}
                              size="small"
                              variant="standard"
                              sx={{ width: '60px' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton 
                              size="small" 
                              color="error"
                              onClick={() => handleDeleteStage(stage.id)}
                              disabled={excavationStages.length <= 1}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                
                <Divider />
                
                <Typography variant="subtitle2">
                  注意事项:
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 施工阶段深度必须小于等于基坑总深度
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • 建议按深度从浅到深排列阶段
                </Typography>
              </Stack>
            )}
            
            {currentTab === 2 && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    支护结构
                  </Typography>
                  <Button 
                    variant="outlined" 
                    size="small"
                    startIcon={<AddIcon />}
                  >
                    添加结构
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                  {supportStructures.map(structure => (
                    <Chip 
                      key={structure.id}
                      label={structure.name}
                      color={structure.type === 'wall' ? 'success' : 'primary'}
                      variant="outlined"
                      onClick={() => {}}
                      onDelete={() => {}}
                    />
                  ))}
                </Box>
                
                <Divider />
                
                <Typography variant="subtitle2">
                  结构参数将在选中后显示
                </Typography>
              </Stack>
            )}
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
                gridSize={20}
                onSceneReady={handleSceneReady}
              />
            </Box>
            
            {/* 状态信息 */}
            <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
              <Chip 
                label={`基坑深度: ${excavationDepth}m`} 
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`点数: ${excavationPoints.length}`} 
                color="default"
                variant="outlined"
              />
              <Chip 
                label={`阶段数: ${excavationStages.length}`} 
                color="warning"
                variant="outlined"
              />
              <Chip 
                label={`支护结构: ${supportStructures.length}`} 
                color="success"
                variant="outlined"
              />
              
              <Box sx={{ flexGrow: 1 }} />
              
              <Button 
                variant="contained" 
                startIcon={<SaveIcon />}
                size="small"
              >
                保存模型
              </Button>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ExcavationModeling;