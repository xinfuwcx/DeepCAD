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
  Divider,
  FormControlLabel,
  Switch,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Tooltip,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  List,
  Chip
} from '@mui/material';
import { 
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
  Visibility as VisibilityIcon,
  VisibilityOff as VisibilityOffIcon,
  Refresh as RefreshIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon
} from '@mui/icons-material';
import * as THREE from 'three';
import SchematicDiagram2D from './SchematicDiagram2D';

// 定义隧道横截面类型
type TunnelSectionType = 'circular' | 'horseshoe' | 'rectangular' | 'custom';

// 隧道截面参数接口
interface TunnelSection {
  id: string;
  name: string;
  type: TunnelSectionType;
  width: number;
  height: number;
  radius?: number;
  archRadius?: number;
  params: Record<string, any>;
}

// 隧道路线点接口
interface PathPoint {
  id: string;
  distance: number;
  x: number;
  y: number;
  z: number;
  rotation?: number;
  section?: string; // 引用截面ID
}

// 支护参数接口
interface SupportParams {
  liningThickness: number;
  boltLength: number;
  boltSpacing: number;
  hasInvert: boolean;
  invertThickness: number;
  // 更多参数...
}

// 组件属性接口
interface TunnelModelingProps {
  width?: number | string;
  height?: number;
}

/**
 * 隧道建模组件
 * 支持定义隧道截面和沿线路拉伸
 */
const TunnelModeling: React.FC<TunnelModelingProps> = ({ 
  width = '100%', 
  height = 600 
}) => {
  // 当前选项卡
  const [currentTab, setCurrentTab] = useState(0);
  
  // 隧道截面数据
  const [tunnelSections, setTunnelSections] = useState<TunnelSection[]>([
    {
      id: 'section-1',
      name: '标准圆形截面',
      type: 'circular',
      width: 6,
      height: 6,
      radius: 3,
      params: {
        material: 'rock',
        color: '#607d8b'
      }
    },
    {
      id: 'section-2',
      name: '马蹄形截面',
      type: 'horseshoe',
      width: 8,
      height: 7,
      archRadius: 4,
      params: {
        material: 'rock',
        color: '#795548'
      }
    }
  ]);
  
  // 当前选中的截面
  const [selectedSection, setSelectedSection] = useState<string | null>('section-1');
  
  // 隧道路线点数据
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([
    { id: 'p1', distance: 0, x: 0, y: 0, z: 0, section: 'section-1' },
    { id: 'p2', distance: 20, x: 20, y: 0, z: 0, section: 'section-1' },
    { id: 'p3', distance: 40, x: 40, y: 5, z: -2, section: 'section-2' },
    { id: 'p4', distance: 60, x: 60, y: 10, z: -4, section: 'section-2' }
  ]);
  
  // 支护参数
  const [supportParams, setSupportParams] = useState<SupportParams>({
    liningThickness: 0.3,
    boltLength: 3,
    boltSpacing: 1.5,
    hasInvert: true,
    invertThickness: 0.5
  });
  
  // 显示设置
  const [showMesh, setShowMesh] = useState(true);
  const [showPath, setShowPath] = useState(true);
  const [showSections, setShowSections] = useState(true);
  
  // 当前编辑的路线点
  const [editingPoint, setEditingPoint] = useState<string | null>(null);
  
  // 场景和相机引用
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  // 模型对象引用
  const tunnelMeshRef = useRef<THREE.Mesh | null>(null);
  const pathLineRef = useRef<THREE.Line | null>(null);
  const sectionGroupRef = useRef<THREE.Group | null>(null);
  
  // 处理选项卡变化
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };
  
  // 添加新截面
  const handleAddSection = () => {
    const newSection: TunnelSection = {
      id: `section-${Date.now()}`,
      name: `截面 ${tunnelSections.length + 1}`,
      type: 'circular',
      width: 6,
      height: 6,
      radius: 3,
      params: {
        material: 'rock',
        color: '#607d8b'
      }
    };
    
    setTunnelSections([...tunnelSections, newSection]);
    setSelectedSection(newSection.id);
  };
  
  // 删除截面
  const handleDeleteSection = (id: string) => {
    // 检查是否有路线点使用此截面
    const isUsed = pathPoints.some(point => point.section === id);
    if (isUsed) {
      alert('无法删除已被路线使用的截面');
      return;
    }
    
    setTunnelSections(sections => sections.filter(s => s.id !== id));
    if (selectedSection === id) {
      setSelectedSection(tunnelSections[0]?.id || null);
    }
  };
  
  // 更新截面参数
  const handleUpdateSection = (id: string, field: keyof TunnelSection | string, value: any) => {
    setTunnelSections(sections => 
      sections.map(section => {
        if (section.id !== id) return section;
        
        if (field.includes('.')) {
          // 处理嵌套属性，如 'params.color'
          const [parent, child] = field.split('.');
          return {
            ...section,
            [parent]: {
              ...section[parent as keyof TunnelSection] as Record<string, any>,
              [child]: value
            }
          };
        }
        
        // 特殊处理截面类型更改
        if (field === 'type') {
          const updatedSection = { 
            ...section, 
            [field]: value 
          };
          
          // 根据不同类型设置默认值
          switch (value) {
            case 'circular':
              updatedSection.radius = section.width / 2;
              break;
            case 'horseshoe':
              updatedSection.archRadius = section.width / 2;
              break;
            case 'rectangular':
              // 矩形不需要特殊参数
              break;
            default:
              break;
          }
          
          return updatedSection;
        }
        
        return { ...section, [field]: value };
      })
    );
  };
  
  // 添加新路线点
  const handleAddPathPoint = () => {
    // 计算新点位置，在最后一个点之后
    const lastPoint = pathPoints[pathPoints.length - 1];
    const distance = lastPoint ? lastPoint.distance + 20 : 0;
    const x = lastPoint ? lastPoint.x + 20 : 0;
    const y = lastPoint ? lastPoint.y : 0;
    const z = lastPoint ? lastPoint.z : 0;
    
    const newPoint: PathPoint = {
      id: `p${Date.now()}`,
      distance,
      x,
      y,
      z,
      section: selectedSection || tunnelSections[0]?.id
    };
    
    setPathPoints([...pathPoints, newPoint]);
    setEditingPoint(newPoint.id);
  };
  
  // 删除路线点
  const handleDeletePathPoint = (id: string) => {
    if (pathPoints.length <= 2) {
      alert('隧道路线至少需要2个点');
      return;
    }
    
    setPathPoints(points => points.filter(p => p.id !== id));
    if (editingPoint === id) {
      setEditingPoint(null);
    }
  };
  
  // 更新路线点参数
  const handleUpdatePathPoint = (id: string, field: keyof PathPoint, value: any) => {
    setPathPoints(points => 
      points.map(point => 
        point.id === id ? { ...point, [field]: value } : point
      )
    );
  };
  
  // 更新支护参数
  const handleUpdateSupportParam = (field: keyof SupportParams, value: any) => {
    setSupportParams(params => ({ ...params, [field]: value }));
  };
  
  // 初始化三维场景
  const handleSceneReady = (scene: THREE.Scene, camera: THREE.PerspectiveCamera) => {
    sceneRef.current = scene;
    cameraRef.current = camera;
    
    updateTunnelModel();
  };
  
  // 创建圆形截面形状
  const createCircularShape = (radius: number): THREE.Shape => {
    const shape = new THREE.Shape();
    shape.absarc(0, 0, radius, 0, Math.PI * 2, true);
    return shape;
  };
  
  // 创建马蹄形截面形状
  const createHorseshoeShape = (width: number, height: number, archRadius: number): THREE.Shape => {
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    
    // 底部中心点
    shape.moveTo(-halfWidth, 0);
    
    // 底边
    shape.lineTo(halfWidth, 0);
    
    // 右侧直壁
    const straightWallHeight = height - archRadius;
    if (straightWallHeight > 0) {
      shape.lineTo(halfWidth, straightWallHeight);
    }
    
    // 拱部
    const archCenterY = straightWallHeight > 0 ? straightWallHeight : 0;
    shape.absarc(0, archCenterY, archRadius, 0, Math.PI, true);
    
    // 左侧直壁
    if (straightWallHeight > 0) {
      shape.lineTo(-halfWidth, straightWallHeight);
      shape.lineTo(-halfWidth, 0);
    }
    
    return shape;
  };
  
  // 创建矩形截面形状
  const createRectangularShape = (width: number, height: number): THREE.Shape => {
    const shape = new THREE.Shape();
    const halfWidth = width / 2;
    const halfHeight = height / 2;
    
    shape.moveTo(-halfWidth, -halfHeight);
    shape.lineTo(halfWidth, -halfHeight);
    shape.lineTo(halfWidth, halfHeight);
    shape.lineTo(-halfWidth, halfHeight);
    shape.lineTo(-halfWidth, -halfHeight);
    
    return shape;
  };
  
  // 创建截面形状
  const createSectionShape = (section: TunnelSection): THREE.Shape => {
    switch (section.type) {
      case 'circular':
        return createCircularShape(section.radius || section.width / 2);
      case 'horseshoe':
        return createHorseshoeShape(section.width, section.height, section.archRadius || section.width / 2);
      case 'rectangular':
        return createRectangularShape(section.width, section.height);
      case 'custom':
        // 自定义形状，实际应用中可能需要更复杂的处理
        return createCircularShape(section.width / 2);
      default:
        return createCircularShape(section.width / 2);
    }
  };
  
  // 更新隧道模型
  const updateTunnelModel = () => {
    if (!sceneRef.current) return;
    
    // 清除之前的模型
    if (tunnelMeshRef.current) {
      sceneRef.current.remove(tunnelMeshRef.current);
      tunnelMeshRef.current = null;
    }
    
    if (pathLineRef.current) {
      sceneRef.current.remove(pathLineRef.current);
      pathLineRef.current = null;
    }
    
    if (sectionGroupRef.current) {
      sceneRef.current.remove(sectionGroupRef.current);
      sectionGroupRef.current = null;
    }
    
    // 创建路径线
    if (showPath) {
      const pathPoints3D = pathPoints.map(p => new THREE.Vector3(p.x, p.y, p.z));
      const pathGeometry = new THREE.BufferGeometry().setFromPoints(pathPoints3D);
      const pathMaterial = new THREE.LineBasicMaterial({ color: 0x4caf50 });
      const pathLine = new THREE.Line(pathGeometry, pathMaterial);
      sceneRef.current.add(pathLine);
      pathLineRef.current = pathLine;
    }
    
    // 创建截面标记
    if (showSections) {
      const sectionGroup = new THREE.Group();
      sceneRef.current.add(sectionGroup);
      sectionGroupRef.current = sectionGroup;
      
      pathPoints.forEach((point, index) => {
        // 找到对应的截面
        const section = tunnelSections.find(s => s.id === point.section);
        if (!section) return;
        
        // 创建截面形状
        const shape = createSectionShape(section);
        
        // 创建截面网格
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(section.params.color || '#607d8b'),
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.6
        });
        
        const sectionMesh = new THREE.Mesh(geometry, material);
        sectionMesh.position.set(point.x, point.y, point.z);
        
        // 根据路线方向旋转截面
        if (index < pathPoints.length - 1) {
          const nextPoint = pathPoints[index + 1];
          const direction = new THREE.Vector3(
            nextPoint.x - point.x,
            nextPoint.y - point.y,
            nextPoint.z - point.z
          ).normalize();
          
          // 创建从(1,0,0)到direction的四元数旋转
          const quaternion = new THREE.Quaternion();
          const baseVector = new THREE.Vector3(1, 0, 0);
          quaternion.setFromUnitVectors(baseVector, direction);
          sectionMesh.quaternion.copy(quaternion);
        }
        
        sectionGroup.add(sectionMesh);
        
        // 添加标签
        const labelDiv = document.createElement('div');
        labelDiv.textContent = `${section.name}`;
        labelDiv.style.color = 'black';
        labelDiv.style.backgroundColor = 'white';
        labelDiv.style.padding = '2px 6px';
        labelDiv.style.borderRadius = '4px';
        labelDiv.style.fontSize = '12px';
        
        const labelObject = new CSS3DObject(labelDiv);
        labelObject.position.set(point.x + 1, point.y + 1, point.z);
        labelObject.scale.set(0.1, 0.1, 0.1);
        sceneRef.current.add(labelObject);
      });
    }
    
    if (showMesh) {
      // 在实际应用中，这里应该创建复杂的隧道网格
      // 此处使用简化版实现，真实情况下需要考虑截面变化、路径曲率等
      // 可能需要使用TubeGeometry或ExtrudeGeometry结合路径曲线
      
      // 简单示例：如果只有两个点，可以直接拉伸
      if (pathPoints.length >= 2) {
        const startPoint = pathPoints[0];
        const endPoint = pathPoints[pathPoints.length - 1];
        const startSection = tunnelSections.find(s => s.id === startPoint.section);
        
        if (startSection) {
          const shape = createSectionShape(startSection);
          
          const extrudeSettings = {
            steps: pathPoints.length * 5,
            bevelEnabled: false,
            extrudePath: new THREE.CatmullRomCurve3(
              pathPoints.map(p => new THREE.Vector3(p.x, p.y, p.z))
            )
          };
          
          const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
          const material = new THREE.MeshStandardMaterial({
            color: 0xaaaaaa,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide,
            wireframe: false
          });
          
          const tunnelMesh = new THREE.Mesh(geometry, material);
          sceneRef.current.add(tunnelMesh);
          tunnelMeshRef.current = tunnelMesh;
        }
      }
    }
  };
  
  // 当相关参数变化时更新模型
  useEffect(() => {
    if (sceneRef.current) {
      updateTunnelModel();
    }
  }, [tunnelSections, pathPoints, showPath, showSections, showMesh]);
  
  return (
    <Box sx={{ width }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>
          隧道建模
        </Typography>
        <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 2 }}>
          <Tab label="截面定义" />
          <Tab label="隧道路线" />
          <Tab label="支护结构" />
        </Tabs>
        
        <Grid container spacing={2}>
          {/* 左侧参数区 */}
          <Grid item xs={12} md={4}>
            {currentTab === 0 && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    截面管理
                  </Typography>
                  <Button 
                    startIcon={<AddIcon />} 
                    size="small"
                    variant="outlined"
                    onClick={handleAddSection}
                  >
                    添加截面
                  </Button>
                </Box>
                
                <List sx={{ maxHeight: 200, overflow: 'auto', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
                  {tunnelSections.map((section) => (
                    <ListItem 
                      key={section.id}
                      button
                      selected={selectedSection === section.id}
                      onClick={() => setSelectedSection(section.id)}
                      sx={{
                        borderLeft: `4px solid ${section.params.color || '#607d8b'}`,
                      }}
                    >
                      <ListItemText 
                        primary={section.name} 
                        secondary={`${section.type} ${section.width}m × ${section.height}m`} 
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end"
                          size="small"
                          onClick={() => handleDeleteSection(section.id)}
                          disabled={tunnelSections.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                
                {selectedSection && (
                  <>
                    <Divider />
                    
                    <Typography variant="subtitle1" gutterBottom>
                      截面参数
                    </Typography>
                    
                    {tunnelSections.map((section) => {
                      if (section.id !== selectedSection) return null;
                      
                      return (
                        <Grid container spacing={2} key={section.id}>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="截面名称"
                              value={section.name}
                              onChange={(e) => handleUpdateSection(section.id, 'name', e.target.value)}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <FormControl fullWidth size="small">
                              <InputLabel>截面类型</InputLabel>
                              <Select
                                value={section.type}
                                label="截面类型"
                                onChange={(e) => handleUpdateSection(section.id, 'type', e.target.value)}
                              >
                                <MenuItem value="circular">圆形</MenuItem>
                                <MenuItem value="horseshoe">马蹄形</MenuItem>
                                <MenuItem value="rectangular">矩形</MenuItem>
                                <MenuItem value="custom">自定义</MenuItem>
                              </Select>
                            </FormControl>
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="宽度"
                              value={section.width}
                              onChange={(e) => handleUpdateSection(section.id, 'width', Number(e.target.value))}
                              type="number"
                              InputProps={{
                                endAdornment: <InputAdornment position="end">m</InputAdornment>,
                              }}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12} sm={6}>
                            <TextField
                              label="高度"
                              value={section.height}
                              onChange={(e) => handleUpdateSection(section.id, 'height', Number(e.target.value))}
                              type="number"
                              InputProps={{
                                endAdornment: <InputAdornment position="end">m</InputAdornment>,
                              }}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          
                          {section.type === 'circular' && (
                            <Grid item xs={12}>
                              <TextField
                                label="半径"
                                value={section.radius || section.width / 2}
                                onChange={(e) => handleUpdateSection(section.id, 'radius', Number(e.target.value))}
                                type="number"
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }}
                                size="small"
                                fullWidth
                              />
                            </Grid>
                          )}
                          
                          {section.type === 'horseshoe' && (
                            <Grid item xs={12}>
                              <TextField
                                label="拱部半径"
                                value={section.archRadius || section.width / 2}
                                onChange={(e) => handleUpdateSection(section.id, 'archRadius', Number(e.target.value))}
                                type="number"
                                InputProps={{
                                  endAdornment: <InputAdornment position="end">m</InputAdornment>,
                                }}
                                size="small"
                                fullWidth
                              />
                            </Grid>
                          )}
                          
                          <Grid item xs={12}>
                            <TextField
                              label="颜色"
                              value={section.params.color || '#607d8b'}
                              onChange={(e) => handleUpdateSection(section.id, 'params.color', e.target.value)}
                              type="color"
                              size="small"
                              fullWidth
                            />
                          </Grid>
                        </Grid>
                      );
                    })}
                  </>
                )}
              </Stack>
            )}
            
            {currentTab === 1 && (
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="subtitle1">
                    隧道路线
                  </Typography>
                  <Button 
                    startIcon={<AddIcon />} 
                    size="small"
                    variant="outlined"
                    onClick={handleAddPathPoint}
                  >
                    添加路线点
                  </Button>
                </Box>
                
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showPath} 
                        onChange={(e) => setShowPath(e.target.checked)}
                        size="small"
                      />
                    }
                    label="显示路线"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showSections} 
                        onChange={(e) => setShowSections(e.target.checked)}
                        size="small"
                      />
                    }
                    label="显示截面"
                  />
                  <FormControlLabel
                    control={
                      <Switch 
                        checked={showMesh} 
                        onChange={(e) => setShowMesh(e.target.checked)}
                        size="small"
                      />
                    }
                    label="显示网格"
                  />
                </Box>
                
                <Typography variant="subtitle2">
                  路线点列表
                </Typography>
                
                <List sx={{ maxHeight: 250, overflow: 'auto', border: '1px solid rgba(0,0,0,0.12)', borderRadius: 1 }}>
                  {pathPoints.map((point, index) => (
                    <ListItem
                      key={point.id}
                      selected={editingPoint === point.id}
                      button
                      onClick={() => setEditingPoint(editingPoint === point.id ? null : point.id)}
                      sx={{
                        borderBottom: index < pathPoints.length - 1 ? '1px solid rgba(0,0,0,0.08)' : 'none'
                      }}
                    >
                      <ListItemText
                        primary={`点 ${index + 1} (里程: ${point.distance}m)`}
                        secondary={`(${point.x}, ${point.y}, ${point.z})`}
                      />
                      <ListItemSecondaryAction>
                        <IconButton 
                          edge="end" 
                          size="small"
                          onClick={() => handleDeletePathPoint(point.id)}
                          disabled={pathPoints.length <= 2}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  ))}
                </List>
                
                {editingPoint && (
                  <>
                    <Divider />
                    
                    <Typography variant="subtitle2">
                      编辑点参数
                    </Typography>
                    
                    {pathPoints.map(point => {
                      if (point.id !== editingPoint) return null;
                      
                      return (
                        <Grid container spacing={2} key={`edit-${point.id}`}>
                          <Grid item xs={12}>
                            <TextField
                              label="里程"
                              value={point.distance}
                              onChange={(e) => handleUpdatePathPoint(point.id, 'distance', Number(e.target.value))}
                              type="number"
                              InputProps={{
                                endAdornment: <InputAdornment position="end">m</InputAdornment>,
                              }}
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              label="X坐标"
                              value={point.x}
                              onChange={(e) => handleUpdatePathPoint(point.id, 'x', Number(e.target.value))}
                              type="number"
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              label="Y坐标"
                              value={point.y}
                              onChange={(e) => handleUpdatePathPoint(point.id, 'y', Number(e.target.value))}
                              type="number"
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={4}>
                            <TextField
                              label="Z坐标"
                              value={point.z}
                              onChange={(e) => handleUpdatePathPoint(point.id, 'z', Number(e.target.value))}
                              type="number"
                              size="small"
                              fullWidth
                            />
                          </Grid>
                          <Grid item xs={12}>
                            <FormControl fullWidth size="small">
                              <InputLabel>使用截面</InputLabel>
                              <Select
                                value={point.section || ''}
                                label="使用截面"
                                onChange={(e) => handleUpdatePathPoint(point.id, 'section', e.target.value)}
                              >
                                {tunnelSections.map(section => (
                                  <MenuItem key={section.id} value={section.id}>
                                    {section.name}
                                  </MenuItem>
                                ))}
                              </Select>
                            </FormControl>
                          </Grid>
                        </Grid>
                      );
                    })}
                  </>
                )}
              </Stack>
            )}
            
            {currentTab === 2 && (
              <Stack spacing={2}>
                <Typography variant="subtitle1" gutterBottom>
                  支护结构参数
                </Typography>
                
                <FormControlLabel
                  control={
                    <Switch
                      checked={supportParams.hasInvert}
                      onChange={(e) => handleUpdateSupportParam('hasInvert', e.target.checked)}
                    />
                  }
                  label="仰拱"
                />
                
                <TextField
                  label="衬砌厚度"
                  value={supportParams.liningThickness}
                  onChange={(e) => handleUpdateSupportParam('liningThickness', Number(e.target.value))}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                  }}
                  size="small"
                />
                
                {supportParams.hasInvert && (
                  <TextField
                    label="仰拱厚度"
                    value={supportParams.invertThickness}
                    onChange={(e) => handleUpdateSupportParam('invertThickness', Number(e.target.value))}
                    type="number"
                    InputProps={{
                      endAdornment: <InputAdornment position="end">m</InputAdornment>,
                    }}
                    size="small"
                  />
                )}
                
                <Divider />
                
                <Typography variant="subtitle2">
                  锚杆参数
                </Typography>
                
                <TextField
                  label="锚杆长度"
                  value={supportParams.boltLength}
                  onChange={(e) => handleUpdateSupportParam('boltLength', Number(e.target.value))}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                  }}
                  size="small"
                />
                
                <TextField
                  label="锚杆间距"
                  value={supportParams.boltSpacing}
                  onChange={(e) => handleUpdateSupportParam('boltSpacing', Number(e.target.value))}
                  type="number"
                  InputProps={{
                    endAdornment: <InputAdornment position="end">m</InputAdornment>,
                  }}
                  size="small"
                />
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
                label={`截面数: ${tunnelSections.length}`} 
                color="primary"
                variant="outlined"
              />
              <Chip 
                label={`路线点数: ${pathPoints.length}`} 
                color="secondary"
                variant="outlined"
              />
              <Chip 
                label={`总长: ${pathPoints.length > 0 ? pathPoints[pathPoints.length-1].distance : 0}m`} 
                color="info"
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

export default TunnelModeling;