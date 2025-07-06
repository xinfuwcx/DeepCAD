import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  Divider,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  Grid
} from '@mui/material';
import * as THREE from 'three';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import ViewQuiltIcon from '@mui/icons-material/ViewQuilt';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import CropFreeIcon from '@mui/icons-material/CropFree';
import SaveAltIcon from '@mui/icons-material/SaveAlt';
import { geologyService } from '../../services/geologyService';
import { SoilParams } from './CreatorInterface';

interface GeologicalModelViewerProps {
  soilLayers?: SoilParams[];
  modelId?: string;
  width?: number | string;
  height?: number | string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`geo-model-tabpanel-${index}`}
      aria-labelledby={`geo-model-tab-${index}`}
      {...other}
      style={{ height: '100%', overflow: 'auto' }}
    >
      {value === index && (
        <Box sx={{ height: '100%', p: 1 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const GeologicalModelViewer: React.FC<GeologicalModelViewerProps> = ({
  soilLayers = [],
  modelId,
  width = '100%',
  height = 400
}) => {
  const [tabValue, setTabValue] = useState(0);
  const [sectionPlane, setSectionPlane] = useState<'xy' | 'xz' | 'yz'>('xz');
  const [sectionPosition, setSectionPosition] = useState<number>(0);
  
  const threeDViewRef = useRef<HTMLDivElement>(null);
  const twoDViewRef = useRef<HTMLDivElement>(null);
  
  const [sceneState, setSceneState] = useState<{
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    renderer?: THREE.WebGLRenderer;
    css2DRenderer?: CSS2DRenderer;
    controls?: OrbitControls;
  }>({});
  
  // 初始化3D视图
  useEffect(() => {
    if (!threeDViewRef.current) return;
    
    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x121212);
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      45,
      threeDViewRef.current.clientWidth / threeDViewRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(100, 100, 50);
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(threeDViewRef.current.clientWidth, threeDViewRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    threeDViewRef.current.appendChild(renderer.domElement);
    
    // 创建CSS2D渲染器
    const css2DRenderer = new CSS2DRenderer();
    css2DRenderer.setSize(threeDViewRef.current.clientWidth, threeDViewRef.current.clientHeight);
    css2DRenderer.domElement.style.position = 'absolute';
    css2DRenderer.domElement.style.top = '0';
    css2DRenderer.domElement.style.pointerEvents = 'none';
    threeDViewRef.current.appendChild(css2DRenderer.domElement);
    
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);
    
    // 添加网格
    const gridHelper = new THREE.GridHelper(500, 50);
    scene.add(gridHelper);
    
    // 保存场景状态
    setSceneState({
      scene,
      camera,
      renderer,
      css2DRenderer,
      controls
    });
    
    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      css2DRenderer.render(scene, camera);
    };
    animate();
    
    // 窗口大小变化时调整渲染器大小
    const handleResize = () => {
      if (!threeDViewRef.current) return;
      
      const width = threeDViewRef.current.clientWidth;
      const height = threeDViewRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      
      renderer.setSize(width, height);
      css2DRenderer.setSize(width, height);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      threeDViewRef.current?.removeChild(renderer.domElement);
      threeDViewRef.current?.removeChild(css2DRenderer.domElement);
      
      // 清理场景
      scene.clear();
    };
  }, []);
  
  // 初始化2D视图
  useEffect(() => {
    if (!twoDViewRef.current) return;
    
    const canvas = document.createElement('canvas');
    canvas.width = twoDViewRef.current.clientWidth;
    canvas.height = twoDViewRef.current.clientHeight;
    twoDViewRef.current.appendChild(canvas);
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 绘制背景
    ctx.fillStyle = '#f5f5f5';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 绘制坐标轴
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 1;
    
    // X轴
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(canvas.width - 50, canvas.height - 50);
    ctx.stroke();
    
    // Y轴
    ctx.beginPath();
    ctx.moveTo(50, 50);
    ctx.lineTo(50, canvas.height - 50);
    ctx.stroke();
    
    // 绘制刻度
    ctx.fillStyle = '#000000';
    ctx.font = '12px Arial';
    
    // X轴刻度
    for (let i = 0; i <= 10; i++) {
      const x = 50 + (i * (canvas.width - 100) / 10);
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - 50);
      ctx.lineTo(x, canvas.height - 45);
      ctx.stroke();
      
      const value = i * 50 - 250;
      ctx.fillText(value.toString(), x - 10, canvas.height - 30);
    }
    
    // Y轴刻度
    for (let i = 0; i <= 5; i++) {
      const y = canvas.height - 50 - (i * (canvas.height - 100) / 5);
      ctx.beginPath();
      ctx.moveTo(45, y);
      ctx.lineTo(50, y);
      ctx.stroke();
      
      const value = i * 10;
      ctx.fillText(-value.toString(), 30, y + 5);
    }
    
    // 绘制标签
    ctx.font = '14px Arial';
    ctx.fillText(sectionPlane === 'xz' ? 'X (m)' : 'Y (m)', canvas.width - 70, canvas.height - 30);
    ctx.fillText('Z (m)', 20, 40);
    
    // 绘制土层
    if (soilLayers && soilLayers.length > 0) {
      // 按Z坐标排序，从下到上绘制
      const sortedLayers = [...soilLayers].sort((a, b) => 
        ((a.position?.z || 0) - (a.scale?.z || 0)) - ((b.position?.z || 0) - (b.scale?.z || 0))
      );
      
      const xMin = -250;
      const xMax = 250;
      const zMin = -50;
      const zMax = 0;
      
      const xScale = (canvas.width - 100) / (xMax - xMin);
      const zScale = (canvas.height - 100) / (zMax - zMin);
      
      sortedLayers.forEach(layer => {
        const top = layer.position?.z || 0;
        const bottom = top - (layer.scale?.z || 0);
        
        const y1 = canvas.height - 50 - ((top - zMin) * zScale);
        const y2 = canvas.height - 50 - ((bottom - zMin) * zScale);
        
        ctx.fillStyle = layer.color || '#8B4513';
        ctx.beginPath();
        ctx.rect(50, y1, canvas.width - 100, y2 - y1);
        ctx.fill();
        
        // 添加土层标签
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Arial';
        const soilType = layer.soilType || 'unknown';
        const label = `${soilType} (${bottom}m ~ ${top}m)`;
        const textWidth = ctx.measureText(label).width;
        
        if (y2 - y1 > 20) { // 只有当土层足够高时才显示标签
          ctx.fillText(label, (canvas.width - textWidth) / 2, (y1 + y2) / 2);
        }
      });
    }
    
    return () => {
      if (twoDViewRef.current && canvas) {
        twoDViewRef.current.removeChild(canvas);
      }
    };
  }, [soilLayers, sectionPlane, sectionPosition]);
  
  // 更新3D模型
  useEffect(() => {
    if (!sceneState.scene || !soilLayers || soilLayers.length === 0) return;
    
    // 清除现有的土层模型
    const existingLayers = sceneState.scene.children.filter(child => child.userData.type === 'soilLayer');
    existingLayers.forEach(layer => sceneState.scene?.remove(layer));
    
    // 创建新的土层模型
    soilLayers.forEach(layer => {
      const width = layer.scale?.x || 100;
      const length = layer.scale?.y || 100;
      const height = layer.scale?.z || 5;
      
      const geometry = new THREE.BoxGeometry(width, length, height);
      const material = new THREE.MeshStandardMaterial({
        color: layer.color || '#8B4513',
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        layer.position?.x || 0,
        layer.position?.y || 0,
        (layer.position?.z || 0) - height / 2 // 将顶面设置为Z坐标
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { type: 'soilLayer', data: layer };
      
      sceneState.scene.add(mesh);
      
      // 添加标签
      const soilType = layer.soilType || 'unknown';
      const div = document.createElement('div');
      div.className = 'soil-layer-label';
      div.textContent = soilType;
      div.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
      div.style.color = 'white';
      div.style.padding = '2px 8px';
      div.style.borderRadius = '4px';
      div.style.fontSize = '12px';
      
      const label = new CSS2DObject(div);
      label.position.set(0, 0, height / 2 + 1);
      mesh.add(label);
    });
    
  }, [soilLayers, sceneState.scene]);
  
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };
  
  const handleSectionPlaneChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    setSectionPlane(event.target.value as 'xy' | 'xz' | 'yz');
  };
  
  const handleSectionPositionChange = (event: Event, newValue: number | number[]) => {
    setSectionPosition(newValue as number);
  };
  
  const handleExport = async () => {
    if (!modelId) return;
    
    try {
      await geologyService.exportGeologicalModel(modelId, 'vtk');
      alert('模型导出成功');
    } catch (error) {
      console.error('导出模型失败:', error);
      alert('导出模型失败');
    }
  };
  
  return (
    <Paper
      sx={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: 1
      }}
    >
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          aria-label="geological model viewer tabs"
          sx={{ minHeight: 48 }}
        >
          <Tab
            icon={<ViewInArIcon />}
            iconPosition="start"
            label="3D视图"
            sx={{ minHeight: 48 }}
          />
          <Tab
            icon={<ViewQuiltIcon />}
            iconPosition="start"
            label="剖面图"
            sx={{ minHeight: 48 }}
          />
        </Tabs>
        
        <Box sx={{ position: 'absolute', right: 8, top: 8, display: 'flex' }}>
          <Tooltip title="全屏">
            <IconButton size="small">
              <FullscreenIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="适应视图">
            <IconButton size="small">
              <CropFreeIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="导出模型">
            <IconButton size="small" onClick={handleExport}>
              <SaveAltIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <TabPanel value={tabValue} index={0}>
        <Box
          ref={threeDViewRef}
          sx={{
            width: '100%',
            height: 'calc(100% - 8px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        />
      </TabPanel>
      
      <TabPanel value={tabValue} index={1}>
        <Box sx={{ mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={4}>
              <FormControl fullWidth size="small">
                <InputLabel>剖面方向</InputLabel>
                <Select
                  value={sectionPlane}
                  label="剖面方向"
                  onChange={handleSectionPlaneChange}
                >
                  <MenuItem value="xy">水平剖面 (XY)</MenuItem>
                  <MenuItem value="xz">纵向剖面 (XZ)</MenuItem>
                  <MenuItem value="yz">横向剖面 (YZ)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={8}>
              <Typography gutterBottom>
                剖面位置: {sectionPosition} m
              </Typography>
              <Slider
                value={sectionPosition}
                onChange={handleSectionPositionChange}
                min={sectionPlane === 'xy' ? -50 : -250}
                max={sectionPlane === 'xy' ? 0 : 250}
                step={1}
              />
            </Grid>
          </Grid>
        </Box>
        
        <Box
          ref={twoDViewRef}
          sx={{
            width: '100%',
            height: 'calc(100% - 80px)',
            position: 'relative',
            overflow: 'hidden',
            backgroundColor: '#f5f5f5',
            borderRadius: 1
          }}
        />
      </TabPanel>
    </Paper>
  );
};

export default GeologicalModelViewer; 