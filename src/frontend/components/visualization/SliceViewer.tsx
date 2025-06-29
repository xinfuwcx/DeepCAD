import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Grid, Slider, Typography, Box, FormControl, InputLabel, Select, MenuItem, Button, 
         Paper, Divider, IconButton, Tooltip } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

// 颜色映射工具
const ColorMapUtils = {
  // 将值映射到颜色
  mapValueToColor: (value: number, min: number, max: number, colorMap: string = 'rainbow'): THREE.Color => {
    // 归一化值到 0-1 范围
    const normalizedValue = Math.max(0, Math.min(1, (value - min) / (max - min)));
    
    // 根据不同的色彩映射方案返回颜色
    switch (colorMap) {
      case 'rainbow':
        return ColorMapUtils.rainbowColorMap(normalizedValue);
      case 'blueRed':
        return ColorMapUtils.blueRedColorMap(normalizedValue);
      case 'terrain':
        return ColorMapUtils.terrainColorMap(normalizedValue);
      default:
        return ColorMapUtils.rainbowColorMap(normalizedValue);
    }
  },
  
  // 彩虹色映射
  rainbowColorMap: (value: number): THREE.Color => {
    const hue = (1 - value) * 240 / 360;
    return new THREE.Color().setHSL(hue, 1.0, 0.5);
  },
  
  // 蓝到红色映射
  blueRedColorMap: (value: number): THREE.Color => {
    return new THREE.Color(value, 0, 1 - value);
  },
  
  // 地形色映射
  terrainColorMap: (value: number): THREE.Color => {
    if (value < 0.2) {
      const t = value / 0.2;
      return new THREE.Color(0, t, 0.5 + 0.5 * t);
    } else if (value < 0.4) {
      const t = (value - 0.2) / 0.2;
      return new THREE.Color(0, 0.8 - 0.3 * t, 1);
    } else if (value < 0.6) {
      const t = (value - 0.4) / 0.2;
      return new THREE.Color(t, 0.5 + 0.5 * t, 0);
    } else if (value < 0.8) {
      const t = (value - 0.6) / 0.2;
      return new THREE.Color(1, 1 - t, 0);
    } else {
      const t = (value - 0.8) / 0.2;
      return new THREE.Color(1 - 0.5 * t, 0, 0);
    }
  }
};

// 切片平面选项
interface SlicePlane {
  normal: THREE.Vector3;
  constant: number;
  axis: string;
}

// 结果数据类型
interface ResultData {
  nodes: {
    id: number;
    x: number;
    y: number;
    z: number;
  }[];
  elements: {
    id: number;
    type: string;
    nodes: number[];
  }[];
  values: {
    [key: string]: number[];
  };
}

interface SliceViewerProps {
  resultData?: ResultData;
  colorMapName?: string;
  defaultResultType?: string;
  onCapture?: (dataUrl: string) => void;
}

const SliceViewer: React.FC<SliceViewerProps> = ({ 
  resultData,
  colorMapName = 'rainbow',
  defaultResultType = 'displacement_magnitude',
  onCapture
}) => {
  // 引用容器和场景对象
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const originalGeometryRef = useRef<THREE.BufferGeometry | null>(null);
  const clippedMeshRef = useRef<THREE.Mesh | null>(null);
  const clipPlaneRef = useRef<THREE.Plane | null>(null);
  
  // 状态
  const [slicePlanes, setSlicePlanes] = useState<SlicePlane[]>([
    { normal: new THREE.Vector3(1, 0, 0), constant: 0, axis: 'X' },
    { normal: new THREE.Vector3(0, 1, 0), constant: 0, axis: 'Y' },
    { normal: new THREE.Vector3(0, 0, 1), constant: 0, axis: 'Z' }
  ]);
  const [activePlaneIndex, setActivePlaneIndex] = useState<number>(0);
  const [sliderValue, setSliderValue] = useState<number>(0);
  const [sliderRange, setSliderRange] = useState<[number, number]>([-10, 10]);
  const [resultType, setResultType] = useState<string>(defaultResultType);
  const [showClipPlane, setShowClipPlane] = useState<boolean>(true);
  const [valueRange, setValueRange] = useState<[number, number]>([0, 1]);
  const [showOriginalMesh, setShowOriginalMesh] = useState<boolean>(false);
  
  // 可用的结果类型列表
  const availableResultTypes = useMemo(() => {
    if (!resultData?.values) return [];
    return Object.keys(resultData.values);
  }, [resultData?.values]);
  
  // 初始化Three.js场景
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;
    
    // 创建摄像机
    const camera = new THREE.PerspectiveCamera(
      45, 
      containerRef.current.clientWidth / containerRef.current.clientHeight, 
      0.1, 
      1000
    );
    camera.position.set(5, 5, 5);
    cameraRef.current = camera;
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.localClippingEnabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 添加轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;
    
    // 添加坐标轴辅助
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 2, 3);
    scene.add(directionalLight);
    
    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();
    
    // 添加窗口大小调整事件
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      cameraRef.current.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
      controls.dispose();
    };
  }, []);
  
  // 加载数据并创建几何体
  useEffect(() => {
    if (!resultData || !sceneRef.current) return;
    
    // 清除原有几何体
    if (clippedMeshRef.current) {
      sceneRef.current.remove(clippedMeshRef.current);
      clippedMeshRef.current = null;
    }
    
    try {
      // 从结果数据创建几何体
      const geometry = new THREE.BufferGeometry();
      
      // 节点位置
      const vertices: number[] = [];
      resultData.nodes.forEach(node => {
        vertices.push(node.x, node.y, node.z);
      });
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // 构建单元索引
      const indices: number[] = [];
      resultData.elements.forEach(element => {
        if (element.nodes.length === 4) {  // 四面体单元
          // 添加四个三角面
          indices.push(element.nodes[0] - 1, element.nodes[1] - 1, element.nodes[2] - 1);
          indices.push(element.nodes[0] - 1, element.nodes[2] - 1, element.nodes[3] - 1);
          indices.push(element.nodes[0] - 1, element.nodes[3] - 1, element.nodes[1] - 1);
          indices.push(element.nodes[1] - 1, element.nodes[3] - 1, element.nodes[2] - 1);
        } else if (element.nodes.length === 8) {  // 六面体单元
          // 六面体分解为多个三角面
          // 底面
          indices.push(element.nodes[0] - 1, element.nodes[1] - 1, element.nodes[2] - 1);
          indices.push(element.nodes[0] - 1, element.nodes[2] - 1, element.nodes[3] - 1);
          // 顶面
          indices.push(element.nodes[4] - 1, element.nodes[5] - 1, element.nodes[6] - 1);
          indices.push(element.nodes[4] - 1, element.nodes[6] - 1, element.nodes[7] - 1);
          // 侧面
          indices.push(element.nodes[0] - 1, element.nodes[1] - 1, element.nodes[5] - 1);
          indices.push(element.nodes[0] - 1, element.nodes[5] - 1, element.nodes[4] - 1);
          
          indices.push(element.nodes[1] - 1, element.nodes[2] - 1, element.nodes[6] - 1);
          indices.push(element.nodes[1] - 1, element.nodes[6] - 1, element.nodes[5] - 1);
          
          indices.push(element.nodes[2] - 1, element.nodes[3] - 1, element.nodes[7] - 1);
          indices.push(element.nodes[2] - 1, element.nodes[7] - 1, element.nodes[6] - 1);
          
          indices.push(element.nodes[3] - 1, element.nodes[0] - 1, element.nodes[4] - 1);
          indices.push(element.nodes[3] - 1, element.nodes[4] - 1, element.nodes[7] - 1);
        }
      });
      
      geometry.setIndex(indices);
      geometry.computeVertexNormals();
      originalGeometryRef.current = geometry.clone();
      
      // 添加颜色属性
      updateColors(geometry);
      
      // 计算模型的边界框
      geometry.computeBoundingBox();
      const bbox = geometry.boundingBox;
      
      if (bbox) {
        // 更新切片平面的范围
        const size = new THREE.Vector3();
        bbox.getSize(size);
        
        const center = new THREE.Vector3();
        bbox.getCenter(center);
        
        // 为每个轴设置合适的范围
        const newSlicePlanes = slicePlanes.map(plane => {
          let range: [number, number];
          
          if (plane.axis === 'X') {
            range = [bbox.min.x - size.x * 0.1, bbox.max.x + size.x * 0.1];
            return { ...plane, constant: center.x };
          } else if (plane.axis === 'Y') {
            range = [bbox.min.y - size.y * 0.1, bbox.max.y + size.y * 0.1];
            return { ...plane, constant: center.y };
          } else { // 'Z'
            range = [bbox.min.z - size.z * 0.1, bbox.max.z + size.z * 0.1];
            return { ...plane, constant: center.z };
          }
        });
        
        setSlicePlanes(newSlicePlanes);
        setSliderRange([bbox.min[slicePlanes[activePlaneIndex].axis.toLowerCase() as 'x' | 'y' | 'z'], 
                      bbox.max[slicePlanes[activePlaneIndex].axis.toLowerCase() as 'x' | 'y' | 'z']]);
        setSliderValue(center[slicePlanes[activePlaneIndex].axis.toLowerCase() as 'x' | 'y' | 'z']);
      }
      
      // 创建材质
      const material = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        clippingPlanes: [new THREE.Plane(
          slicePlanes[activePlaneIndex].normal, 
          -slicePlanes[activePlaneIndex].constant
        )],
        clipIntersection: false
      });
      
      // 创建网格
      const mesh = new THREE.Mesh(geometry, material);
      sceneRef.current.add(mesh);
      clippedMeshRef.current = mesh;
      
      // 更新剪切平面
      updateClipPlane();
      
    } catch (error) {
      console.error("Error loading result data:", error);
    }
  }, [resultData]);
  
  // 更新颜色数据
  const updateColors = (geometry: THREE.BufferGeometry) => {
    if (!resultData || !resultData.values[resultType]) {
      return;
    }
    
    const values = resultData.values[resultType];
    
    // 计算值的范围
    let minVal = Number.MAX_VALUE;
    let maxVal = Number.MIN_VALUE;
    
    for (let i = 0; i < values.length; i++) {
      minVal = Math.min(minVal, values[i]);
      maxVal = Math.max(maxVal, values[i]);
    }
    
    setValueRange([minVal, maxVal]);
    
    // 创建颜色数组
    const colors: number[] = [];
    
    // 对每个节点应用颜色
    for (let i = 0; i < resultData.nodes.length; i++) {
      const value = values[i] || 0;
      const color = ColorMapUtils.mapValueToColor(value, minVal, maxVal, colorMapName);
      colors.push(color.r, color.g, color.b);
    }
    
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  };
  
  // 更新剪切平面
  const updateClipPlane = () => {
    if (!clippedMeshRef.current) return;
    
    const plane = slicePlanes[activePlaneIndex];
    const threePlane = new THREE.Plane(plane.normal, -plane.constant);
    
    // 更新网格的剪切平面
    const material = clippedMeshRef.current.material as THREE.MeshPhongMaterial;
    material.clippingPlanes = [threePlane];
    
    clipPlaneRef.current = threePlane;
    
    // 如果需要显示剪切面，创建一个辅助对象
    if (showClipPlane && sceneRef.current) {
      // 移除旧的辅助对象
      sceneRef.current.children = sceneRef.current.children.filter(child => 
        !(child instanceof THREE.PlaneHelper));
      
      if (clipPlaneRef.current) {
        const helper = new THREE.PlaneHelper(clipPlaneRef.current, 20, 0xff0000);
        sceneRef.current.add(helper);
      }
    } else if (sceneRef.current) {
      // 移除辅助对象
      sceneRef.current.children = sceneRef.current.children.filter(child => 
        !(child instanceof THREE.PlaneHelper));
    }
  };
  
  // 处理切片平面变化
  const handlePlaneChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const planeIndex = Number(event.target.value);
    setActivePlaneIndex(planeIndex);
    
    // 更新滑块值和范围
    if (originalGeometryRef.current && originalGeometryRef.current.boundingBox) {
      const bbox = originalGeometryRef.current.boundingBox;
      const axis = slicePlanes[planeIndex].axis.toLowerCase() as 'x' | 'y' | 'z';
      
      setSliderRange([bbox.min[axis], bbox.max[axis]]);
      setSliderValue(slicePlanes[planeIndex].constant);
    }
    
    // 更新剪切平面
    const newSlicePlanes = [...slicePlanes];
    updateClipPlane();
  };
  
  // 处理滑块值变化
  const handleSliderChange = (event: Event, newValue: number | number[]) => {
    const value = newValue as number;
    setSliderValue(value);
    
    // 更新选中切片平面的常数
    const newSlicePlanes = [...slicePlanes];
    newSlicePlanes[activePlaneIndex] = {
      ...newSlicePlanes[activePlaneIndex],
      constant: value
    };
    
    setSlicePlanes(newSlicePlanes);
    
    // 更新剪切平面
    if (clipPlaneRef.current) {
      clipPlaneRef.current.constant = -value;
    }
    
    updateClipPlane();
  };
  
  // 处理结果类型变化
  const handleResultTypeChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newResultType = String(event.target.value);
    setResultType(newResultType);
    
    // 更新颜色
    if (clippedMeshRef.current && originalGeometryRef.current) {
      updateColors(clippedMeshRef.current.geometry);
    }
  };
  
  // 切换剪切平面可见性
  const toggleClipPlaneVisibility = () => {
    setShowClipPlane(!showClipPlane);
    updateClipPlane();
  };
  
  // 切换原始网格可见性
  const toggleOriginalMeshVisibility = () => {
    setShowOriginalMesh(!showOriginalMesh);
    
    // 实现原始网格的显示/隐藏
    if (sceneRef.current && originalGeometryRef.current) {
      // 移除现有的原始网格
      sceneRef.current.children = sceneRef.current.children.filter(child => 
        !(child.userData && child.userData.isOriginalMesh));
      
      if (!showOriginalMesh) { // 即将设置为true，所以这里是!showOriginalMesh
        // 创建半透明的原始网格
        const material = new THREE.MeshBasicMaterial({
          color: 0x888888,
          transparent: true,
          opacity: 0.2,
          wireframe: true
        });
        
        const mesh = new THREE.Mesh(originalGeometryRef.current.clone(), material);
        mesh.userData = { isOriginalMesh: true };
        sceneRef.current.add(mesh);
      }
    }
  };
  
  // 捕获当前视图
  const captureView = () => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;
    
    rendererRef.current.render(sceneRef.current, cameraRef.current);
    const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
    
    if (onCapture) {
      onCapture(dataUrl);
    } else {
      // 创建下载链接
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `slice_view_${new Date().toISOString()}.png`;
      link.click();
    }
  };
  
  // 重置视图
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    cameraRef.current.position.set(5, 5, 5);
    cameraRef.current.lookAt(0, 0, 0);
    controlsRef.current.reset();
  };
  
  return (
    <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="result-type-label">结果类型</InputLabel>
              <Select
                labelId="result-type-label"
                id="result-type-select"
                value={resultType}
                onChange={handleResultTypeChange as any}
                label="结果类型"
              >
                {availableResultTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel id="plane-select-label">切片平面</InputLabel>
              <Select
                labelId="plane-select-label"
                id="plane-select"
                value={activePlaneIndex}
                onChange={handlePlaneChange as any}
                label="切片平面"
              >
                <MenuItem value={0}>X平面</MenuItem>
                <MenuItem value={1}>Y平面</MenuItem>
                <MenuItem value={2}>Z平面</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={4}>
            <Typography gutterBottom>
              {`${slicePlanes[activePlaneIndex].axis}轴位置: ${sliderValue.toFixed(2)}`}
            </Typography>
            <Slider
              value={sliderValue}
              onChange={handleSliderChange}
              min={sliderRange[0]}
              max={sliderRange[1]}
              step={(sliderRange[1] - sliderRange[0]) / 100}
            />
          </Grid>
          
          <Grid item xs={6} md={1}>
            <Tooltip title="切换剪切平面可见性">
              <IconButton onClick={toggleClipPlaneVisibility} color={showClipPlane ? "primary" : "default"}>
                {showClipPlane ? <VisibilityIcon /> : <VisibilityOffIcon />}
              </IconButton>
            </Tooltip>
          </Grid>
          
          <Grid item xs={6} md={1}>
            <Tooltip title="捕获视图">
              <IconButton onClick={captureView}>
                <CameraAltIcon />
              </IconButton>
            </Tooltip>
          </Grid>
        </Grid>
        
        <Divider sx={{ my: 1 }} />
        
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={6} md={3}>
            <Typography variant="body2" gutterBottom>
              最小值: {valueRange[0].toFixed(4)}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Typography variant="body2" gutterBottom>
              最大值: {valueRange[1].toFixed(4)}
            </Typography>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Button 
              variant="outlined" 
              size="small" 
              startIcon={<RefreshIcon />}
              onClick={resetView}
            >
              重置视图
            </Button>
          </Grid>
          
          <Grid item xs={6} md={3}>
            <Button
              variant="outlined"
              size="small"
              startIcon={showOriginalMesh ? <VisibilityOffIcon /> : <VisibilityIcon />}
              onClick={toggleOriginalMeshVisibility}
            >
              {showOriginalMesh ? "隐藏原始网格" : "显示原始网格"}
            </Button>
          </Grid>
        </Grid>
      </Paper>
      
      <Box ref={containerRef} sx={{ flexGrow: 1, border: '1px solid #ccc', borderRadius: 1 }} />
    </Box>
  );
};

export default SliceViewer;
