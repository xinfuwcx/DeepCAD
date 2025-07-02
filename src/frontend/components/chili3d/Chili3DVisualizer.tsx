import React, { useState, useEffect, useRef } from 'react';
import { TextField, Accordion, AccordionSummary, AccordionDetails, FormGroup, FormControlLabel, Checkbox, InputAdornment } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import AddIcon from '@mui/icons-material/Add';
import { Box, Button, Typography, Paper, CircularProgress, Alert, Select, MenuItem, FormControl, InputLabel, Grid, Divider, Tooltip, IconButton } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import chili3dIntegration from '../../services/chili3dIntegration';
import axios from 'axios';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import GridOnIcon from '@mui/icons-material/GridOn';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import ViewInArIcon from '@mui/icons-material/ViewInAr';
import CropIcon from '@mui/icons-material/Crop';
import PanToolIcon from '@mui/icons-material/PanTool';
import RotateLeftIcon from '@mui/icons-material/RotateLeft';

// API基础URL - 需要根据实际环境进行配置
const API_BASE_URL = 'http://localhost:8000/api';

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

  // 添加交互工具状态
  const [viewMode, setViewMode] = useState<'pan' | 'rotate' | 'section'>('rotate');
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [sectionPlane, setSectionPlane] = useState<{active: boolean, axis: 'x' | 'y' | 'z', position: number}>({
    active: false,
    axis: 'x',
    position: 0
  });

  // 初始化3D场景
  useEffect(() => {
    if (!canvasRef.current) return;

    // Three.js场景设置
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // 相机设置
    const camera = new THREE.PerspectiveCamera(
      75, // 视野角度
      canvasRef.current.clientWidth / canvasRef.current.clientHeight, // 宽高比
      0.1, // 近平面
      1000 // 远平面
    );
    camera.position.set(20, 20, 20); // 设置相机位置
    camera.lookAt(0, 0, 0);

    // 渲染器设置
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    canvasRef.current.appendChild(renderer.domElement);

    // 添加OrbitControls用于交互
    const orbitControls = new OrbitControls(camera, renderer.domElement);
    orbitControls.target.set(0, 0, 0);
    orbitControls.update();
    
    // 添加TransformControls用于截面操作
    const transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.addEventListener('dragging-changed', (event) => {
      orbitControls.enabled = !event.value;
    });
    transformControls.visible = false;
    scene.add(transformControls);
    
    // 创建截面工具的辅助对象
    const sectionPlaneGeometry = new THREE.PlaneGeometry(100, 100);
    const sectionPlaneMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      opacity: 0.2,
      transparent: true,
      side: THREE.DoubleSide,
      visible: false
    });
    const sectionPlaneMesh = new THREE.Mesh(sectionPlaneGeometry, sectionPlaneMaterial);
    sectionPlaneMesh.name = 'section-plane';
    sectionPlaneMesh.visible = false;
    scene.add(sectionPlaneMesh);

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // 添加参考网格
    const gridHelper = new THREE.GridHelper(100, 100);
    gridHelper.name = 'grid-helper';
    scene.add(gridHelper);

    // 将场景和渲染器保存到组件实例上，以便其他方法访问
    const threejsContext = {
      scene,
      camera,
      renderer,
      orbitControls,
      transformControls,
      sectionPlaneMesh
    };
    
    // 使用HTML5 data属性保存引用
    canvasRef.current.setAttribute('data-threejs-initialized', 'true');
    // @ts-ignore - 临时在DOM元素上存储上下文对象
    canvasRef.current._threejsContext = threejsContext;

    // 渲染场景的函数
    const animate = () => {
      requestAnimationFrame(animate);
      orbitControls.update();
      renderer.render(scene, camera);
    };
    animate();

    // 当窗口大小变化时，更新相机和渲染器
    const handleResize = () => {
      if (!canvasRef.current) return;
      
      camera.aspect = canvasRef.current.clientWidth / canvasRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(canvasRef.current.clientWidth, canvasRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      if (canvasRef.current && canvasRef.current.contains(renderer.domElement)) {
        canvasRef.current.removeChild(renderer.domElement);
        // 清除上下文引用
        // @ts-ignore
        delete canvasRef.current._threejsContext;
        canvasRef.current.removeAttribute('data-threejs-initialized');
      }
      window.removeEventListener('resize', handleResize);
      scene.clear();
      renderer.dispose();
    };
  }, []);

  // 更新视图模式
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // @ts-ignore
    const context = canvasRef.current._threejsContext;
    if (!context) return;
    
    const { orbitControls, transformControls, sectionPlaneMesh } = context;
    
    if (viewMode === 'pan') {
      // 设置为平移模式
      orbitControls.mouseButtons.LEFT = THREE.MOUSE.PAN;
      orbitControls.mouseButtons.RIGHT = THREE.MOUSE.ROTATE;
      transformControls.visible = false;
      sectionPlaneMesh.visible = false;
    } else if (viewMode === 'rotate') {
      // 设置为旋转模式
      orbitControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      orbitControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      transformControls.visible = false;
      sectionPlaneMesh.visible = false;
    } else if (viewMode === 'section') {
      // 设置为截面模式
      orbitControls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
      orbitControls.mouseButtons.RIGHT = THREE.MOUSE.PAN;
      
      if (sectionPlane.active) {
        sectionPlaneMesh.visible = true;
        
        // 根据轴向设置截面方向
        if (sectionPlane.axis === 'x') {
          sectionPlaneMesh.rotation.set(0, Math.PI / 2, 0);
          sectionPlaneMesh.position.set(sectionPlane.position, 0, 0);
        } else if (sectionPlane.axis === 'y') {
          sectionPlaneMesh.rotation.set(Math.PI / 2, 0, 0);
          sectionPlaneMesh.position.set(0, sectionPlane.position, 0);
        } else {
          sectionPlaneMesh.rotation.set(0, 0, 0);
          sectionPlaneMesh.position.set(0, 0, sectionPlane.position);
        }
        
        transformControls.attach(sectionPlaneMesh);
        transformControls.visible = true;
        transformControls.setMode('translate');
      } else {
        transformControls.visible = false;
        sectionPlaneMesh.visible = false;
      }
    }
    
    orbitControls.update();
  }, [viewMode, sectionPlane]);

  // 更新网格显示状态
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // @ts-ignore
    const context = canvasRef.current._threejsContext;
    if (!context) return;
    
    const { scene } = context;
    const gridHelper = scene.getObjectByName('grid-helper');
    
    if (gridHelper) {
      gridHelper.visible = showGrid;
    }
  }, [showGrid]);

  // 设置截面查看
  const handleSectionPlane = (axis: 'x' | 'y' | 'z') => {
    if (sectionPlane.active && sectionPlane.axis === axis) {
      // 关闭当前轴的截面
      setSectionPlane({ ...sectionPlane, active: false });
    } else {
      // 启用或切换轴的截面
      setSectionPlane({ active: true, axis, position: 0 });
      setViewMode('section');
    }
  };

  // 相机视角预设
  const setCameraPosition = (position: string) => {
    if (!canvasRef.current) return;
    
    // @ts-ignore
    const context = canvasRef.current._threejsContext;
    if (!context) return;
    
    const { camera, orbitControls } = context;
    
    switch (position) {
      case 'top':
        camera.position.set(0, 30, 0);
        break;
      case 'front':
        camera.position.set(0, 0, 30);
        break;
      case 'side':
        camera.position.set(30, 0, 0);
        break;
      case 'isometric':
        camera.position.set(20, 20, 20);
        break;
      default:
        return;
    }
    
    orbitControls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    orbitControls.update();
  };

  // 重置视图
  const resetView = () => {
    if (!canvasRef.current) return;
    
    // @ts-ignore
    const context = canvasRef.current._threejsContext;
    if (!context) return;
    
    const { camera, orbitControls, transformControls, sectionPlaneMesh } = context;
    
    // 重置相机位置
    camera.position.set(20, 20, 20);
    orbitControls.target.set(0, 0, 0);
    camera.lookAt(0, 0, 0);
    
    // 重置截面工具
    transformControls.visible = false;
    sectionPlaneMesh.visible = false;
    setSectionPlane({ active: false, axis: 'x', position: 0 });
    
    // 重置控制模式
    setViewMode('rotate');
    setShowGrid(true);
    
    // 更新控制器
    orbitControls.update();
  };

  // 加载场景数据
  const loadSceneData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await chili3dIntegration.getSceneData(selectedScene);
      setSceneData(data);
      
      // 基于加载的数据渲染3D场景
      renderSceneData(data);
      
      console.log('Scene data loaded:', data);
    } catch (err: any) {
      setError(err.message || '加载3D场景数据失败');
    } finally {
      setLoading(false);
    }
  };

  // 根据场景数据渲染3D模型
  const renderSceneData = (data: any) => {
    if (!canvasRef.current) return;
    
    // 获取保存的Three.js上下文
    // @ts-ignore - 从DOM元素获取上下文
    const context = canvasRef.current._threejsContext;
    if (!context) {
      console.error('3D场景未初始化');
      return;
    }
    
    const { scene } = context;
    
    // 清除现有的几何体（保留网格和灯光）
    scene.children = scene.children.filter((child: THREE.Object3D) => 
      child instanceof THREE.GridHelper || 
      child instanceof THREE.Light
    );
    
    // 添加土层
    if (data.soil_layers) {
      data.soil_layers.forEach((layer: any, index: number) => {
        const depth = layer.depth_to - layer.depth_from;
        const geometry = new THREE.BoxGeometry(
          data.dimensions.width,
          depth,
          data.dimensions.length
        );
        
        const material = new THREE.MeshPhongMaterial({
          color: layer.color || 0xA0522D,
          transparent: true,
          opacity: 0.7
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
          0,
          -layer.depth_from - depth / 2,
          0
        );
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        
        scene.add(mesh);
      });
    }
    
    // 添加基坑
    if (data.excavation) {
      const { depth, profile } = data.excavation;
      
      // 创建基坑形状
      const shape = new THREE.Shape();
      profile.forEach((point: number[], index: number) => {
        if (index === 0) {
          shape.moveTo(point[0], point[1]);
        } else {
          shape.lineTo(point[0], point[1]);
        }
      });
      
      // 挤出几何体
      const extrudeSettings = {
        steps: 1,
        depth: depth,
        bevelEnabled: false
      };
      
      const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
      
      const material = new THREE.MeshPhongMaterial({
        color: 0x4682B4,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      // 旋转和移动几何体使其正确定位
      mesh.rotation.x = Math.PI / 2;
      mesh.position.set(-data.dimensions.width / 2, 0, -data.dimensions.length / 2);
      
      scene.add(mesh);
    }
    
    // 如果有渗流分析结果，添加可视化效果
    if (analysisResults && activeAnalysis === 'seepage') {
      renderSeepageResults(scene, data);
    }
  };
  
  // 渲染渗流分析结果
  const renderSeepageResults = (scene: THREE.Scene, sceneData: any) => {
    if (!analysisResults || !analysisResults.seepage_results) return;
    
    const seepageResults = analysisResults.seepage_results;
    
    // 添加水头等值线可视化
    if (seepageResults.phreatic_surface_approx_points) {
      // 渲染地下水面
      const phreaticPoints = seepageResults.phreatic_surface_approx_points;
      
      if (phreaticPoints.length >= 2) {
        // 创建地下水面的曲线
        const curve = new THREE.SplineCurve(
          phreaticPoints.map((p: number[]) => new THREE.Vector2(p[0], p[2]))
        );
        
        const points = curve.getPoints(50);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const material = new THREE.LineBasicMaterial({ 
          color: 0x0000ff, 
          linewidth: 2 
        });
        
        const waterTableLine = new THREE.Line(geometry, material);
        waterTableLine.position.set(0, 0, 0);
        waterTableLine.rotateX(Math.PI / 2);
        scene.add(waterTableLine);
        
        // 创建水平面
        const width = sceneData.dimensions.width;
        const length = sceneData.dimensions.length;
        const avgWaterLevel = phreaticPoints.reduce((sum: number, p: number[]) => sum + p[2], 0) / phreaticPoints.length;
        
        const waterPlaneGeometry = new THREE.PlaneGeometry(width, length, 32, 32);
        const waterPlaneMaterial = new THREE.MeshBasicMaterial({ 
          color: 0x0099ff, 
          transparent: true, 
          opacity: 0.3,
          side: THREE.DoubleSide
        });
        
        const waterPlane = new THREE.Mesh(waterPlaneGeometry, waterPlaneMaterial);
        waterPlane.position.set(0, -avgWaterLevel, 0);
        waterPlane.rotation.x = Math.PI / 2;
        scene.add(waterPlane);
        
        // 给水平面添加波动动画效果
        const waterAnimation = () => {
          // 创建顶点位移
          const positions = waterPlaneGeometry.attributes.position.array as Float32Array;
          const count = positions.length / 3;
          const now = Date.now() / 1000;
          
          for (let i = 0; i < count; i++) {
            const x = positions[i * 3];
            const z = positions[i * 3 + 2];
            // 添加波动效果
            positions[i * 3 + 1] = Math.sin(x / 2 + now) * 0.2 + Math.cos(z / 3 + now * 0.7) * 0.2;
          }
          
          waterPlaneGeometry.attributes.position.needsUpdate = true;
          requestAnimationFrame(waterAnimation);
        };
        
        waterAnimation();
      }
    }
    
    // 显示渗流速度向量
    const addFlowVectors = () => {
      // 模拟渗流速度向量的示例网格
      const gridSize = 5;
      const width = sceneData.dimensions.width;
      const length = sceneData.dimensions.length;
      const depth = sceneData.dimensions.depth;
      
      // 计算总放水量，将其作为箭头颜色和大小的参考
      const discharge = seepageResults.total_discharge_m3_per_s || 0.001;
      
      // 创建箭头帮助器组
      const arrowGroup = new THREE.Group();
      arrowGroup.name = 'seepage-vectors';
      
      for (let x = -width / 2 + width / gridSize; x < width / 2; x += width / gridSize) {
        for (let z = -length / 2 + length / gridSize; z < length / 2; z += length / gridSize) {
          for (let y = -depth + depth / 3; y < 0; y += depth / 3) {
            // 模拟渗流向量的方向和大小 (实际项目中这些数据应来自计算结果)
            // 使用一个简单的噪声函数生成向量方向
            const noise = (Math.sin(x * 0.2) + Math.cos(z * 0.3) + Math.sin(y * 0.5)) * 0.5;
            
            // 生成一个主要指向低压力区域的向量
            const centerX = 0;
            const centerZ = 0;
            
            // 计算到中心的方向
            const dirX = centerX - x;
            const dirZ = centerZ - z;
            const dirY = Math.min(0, y + depth / 4) * 0.5; // 向上的分量
            
            // 归一化并添加噪声
            const length = Math.sqrt(dirX * dirX + dirZ * dirZ + dirY * dirY) || 1;
            const vecX = (dirX / length) + noise * 0.3;
            const vecZ = (dirZ / length) + noise * 0.3;
            const vecY = (dirY / length) + noise * 0.1;
            
            // 根据位置和渗流总量调整箭头大小
            const arrowLength = Math.abs(discharge) * 5000 * (1 + noise * 0.5);
            const arrowSize = Math.abs(discharge) * 2000;
            
            // 创建箭头
            const arrowHelper = new THREE.ArrowHelper(
              new THREE.Vector3(vecX, vecY, vecZ).normalize(),
              new THREE.Vector3(x, y, z),
              arrowLength,
              0x00ffff,
              arrowSize * 0.6,
              arrowSize * 0.4
            );
            
            arrowGroup.add(arrowHelper);
          }
        }
      }
      
      scene.add(arrowGroup);
    };
    
    addFlowVectors();
    
    // 添加信息面板显示
    const infoPanel = document.createElement('div');
    infoPanel.style.position = 'absolute';
    infoPanel.style.bottom = '10px';
    infoPanel.style.right = '10px';
    infoPanel.style.padding = '10px';
    infoPanel.style.background = 'rgba(0, 0, 0, 0.7)';
    infoPanel.style.color = 'white';
    infoPanel.style.borderRadius = '5px';
    infoPanel.style.fontFamily = 'Arial, sans-serif';
    infoPanel.style.zIndex = '1000';
    
    infoPanel.innerHTML = `
      <h3 style="margin: 0 0 8px 0; font-size: 16px;">渗流分析结果</h3>
      <div style="font-size: 14px;">
        <p style="margin: 4px 0;">总放水量: ${seepageResults.total_discharge_m3_per_s?.toExponential(3) || 'N/A'} m³/s</p>
        <p style="margin: 4px 0;">最大水头: ${Math.max(...analysisResults.model_parameters.boundary_conditions.map((bc: any) => bc.total_head)).toFixed(2) || 'N/A'} m</p>
        <p style="margin: 4px 0;">最小水头: ${Math.min(...analysisResults.model_parameters.boundary_conditions.map((bc: any) => bc.total_head)).toFixed(2) || 'N/A'} m</p>
      </div>
    `;
    
    // 添加到渲染容器
    if (canvasRef.current) {
      // 检查是否已经有面板
      const existingPanel = canvasRef.current.querySelector('.seepage-info-panel');
      if (existingPanel) {
        canvasRef.current.removeChild(existingPanel);
      }
      
      infoPanel.className = 'seepage-info-panel';
      canvasRef.current.appendChild(infoPanel);
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
      // 准备符合API接口要求的渗流分析模型
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
        let requestData: any = prepareV4AnalysisModel();

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
        {/* 3D视图工具栏 */}
        <Box
          sx={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            zIndex: 2,
            backgroundColor: 'rgba(255,255,255,0.8)',
            borderRadius: '4px',
            padding: '5px',
            display: 'flex',
            flexDirection: 'column',
            gap: '5px'
          }}
        >
          <Tooltip title="等轴测视图" placement="left">
            <IconButton size="small" onClick={() => setCameraPosition('isometric')}>
              <ViewInArIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="顶视图" placement="left">
            <IconButton size="small" onClick={() => setCameraPosition('top')}>
              <CameraAltIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="前视图" placement="left">
            <IconButton size="small" onClick={() => setCameraPosition('front')}>
              <AspectRatioIcon sx={{ transform: 'rotate(90deg)' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="侧视图" placement="left">
            <IconButton size="small" onClick={() => setCameraPosition('side')}>
              <AspectRatioIcon />
            </IconButton>
          </Tooltip>
          <Divider sx={{ my: 0.5 }} />
          <Tooltip title="旋转模式" placement="left">
            <IconButton 
              size="small" 
              onClick={() => setViewMode('rotate')}
              color={viewMode === 'rotate' ? 'primary' : 'default'}
            >
              <RotateLeftIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="平移模式" placement="left">
            <IconButton 
              size="small" 
              onClick={() => setViewMode('pan')}
              color={viewMode === 'pan' ? 'primary' : 'default'}
            >
              <PanToolIcon />
            </IconButton>
          </Tooltip>
          <Divider sx={{ my: 0.5 }} />
          <Tooltip title="显示/隐藏网格" placement="left">
            <IconButton 
              size="small" 
              onClick={() => setShowGrid(!showGrid)}
              color={showGrid ? 'primary' : 'default'}
            >
              <GridOnIcon />
            </IconButton>
          </Tooltip>
          <Tooltip title="X轴截面" placement="left">
            <IconButton 
              size="small" 
              onClick={() => handleSectionPlane('x')}
              color={(sectionPlane.active && sectionPlane.axis === 'x') ? 'primary' : 'default'}
            >
              <CropIcon sx={{ transform: 'rotate(0deg)' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Y轴截面" placement="left">
            <IconButton 
              size="small" 
              onClick={() => handleSectionPlane('y')}
              color={(sectionPlane.active && sectionPlane.axis === 'y') ? 'primary' : 'default'}
            >
              <CropIcon sx={{ transform: 'rotate(90deg)' }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Z轴截面" placement="left">
            <IconButton 
              size="small" 
              onClick={() => handleSectionPlane('z')}
              color={(sectionPlane.active && sectionPlane.axis === 'z') ? 'primary' : 'default'}
            >
              <CropIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Tooltip>
          <Divider sx={{ my: 0.5 }} />
          <Tooltip title="重置视图" placement="left">
            <IconButton 
              size="small" 
              onClick={resetView}
            >
              <ViewInArIcon sx={{ transform: 'rotate(180deg)' }} />
            </IconButton>
          </Tooltip>
        </Box>
        
        <div 
          ref={canvasRef}
          style={{
            width: '100%',
            height: '100%'
          }}
        />

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