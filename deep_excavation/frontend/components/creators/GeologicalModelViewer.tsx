import React, { useEffect, useRef, useState } from 'react';
import { Box, Typography, CircularProgress, Alert } from '@mui/material';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { geologyService } from '../../services/geologyService';
import { SHANGHAI_SOIL_COLORS, LITHOLOGY_COLORS } from '../../core/geologicalColorSchemes';

// 定义地质层接口
interface SoilLayer {
  id?: string;
  name?: string;
  soilType: string;
  color: string;
  extent: {
    x_min: number;
    x_max: number;
    y_min: number;
    y_max: number;
    z_min: number;
    z_max: number;
  };
}

// 定义模型数据接口
interface ModelData {
  layers: SoilLayer[];
}

interface GeologicalModelViewerProps {
  modelId: string;
  colorScheme?: 'shanghai' | 'lithology';
}

const GeologicalModelViewer: React.FC<GeologicalModelViewerProps> = ({ 
  modelId,
  colorScheme = 'shanghai'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 保存Three.js对象的引用以便清理
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (!containerRef.current || !modelId) return;
    
    // 清理之前的渲染器
    if (rendererRef.current) {
      containerRef.current.removeChild(rendererRef.current.domElement);
      rendererRef.current.dispose();
    }
    
    // 取消之前的动画帧
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    
    setIsLoading(true);
    setError(null);
    
    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    sceneRef.current = scene;
    
    // 创建相机
    const container = containerRef.current;
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(50, 50, 100);
    cameraRef.current = camera;
    
    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 添加轨道控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;
    
    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    // 添加辅助网格和坐标轴
    const gridHelper = new THREE.GridHelper(200, 20, 0x555555, 0x333333);
    scene.add(gridHelper);
    
    const axesHelper = new THREE.AxesHelper(50);
    scene.add(axesHelper);
    
    // 加载地质模型数据
    const loadModel = async () => {
      try {
        // 从服务获取模型数据
        const modelData = await geologyService.getModelPreview(modelId) as ModelData;
        
        if (!modelData || !modelData.layers) {
          throw new Error('模型数据无效');
        }
        
        // 选择颜色方案
        const colors = colorScheme === 'shanghai' ? SHANGHAI_SOIL_COLORS : LITHOLOGY_COLORS;
        
        // 清除之前的地质层
        scene.children = scene.children.filter(
          child => !(child instanceof THREE.Mesh && child.userData.isGeologicalLayer)
        );
        
        // 创建地质层
        modelData.layers.forEach((layer: SoilLayer) => {
          // 为每一层创建几何体
          const geometry = new THREE.BoxGeometry(
            layer.extent.x_max - layer.extent.x_min,
            layer.extent.z_max - layer.extent.z_min,
            layer.extent.y_max - layer.extent.y_min
          );
          
          // 确定材质颜色
          const colorMap = colorScheme === 'shanghai' ? SHANGHAI_SOIL_COLORS : LITHOLOGY_COLORS;
          const color = colorMap[layer.soilType as keyof typeof colorMap] || layer.color || '#A0522D';
          
          // 创建材质
          const material = new THREE.MeshStandardMaterial({
            color: new THREE.Color(color),
            transparent: true,
            opacity: 0.85,
            side: THREE.DoubleSide,
            metalness: 0.1,
            roughness: 0.8
          });
          
          // 创建网格
          const mesh = new THREE.Mesh(geometry, material);
          
          // 设置位置（注意THREE.js坐标系与地质模型坐标系的差异）
          mesh.position.set(
            (layer.extent.x_max + layer.extent.x_min) / 2,
            (layer.extent.z_max + layer.extent.z_min) / 2,
            (layer.extent.y_max + layer.extent.y_min) / 2
          );
          
          // 标记为地质层
          mesh.userData.isGeologicalLayer = true;
          mesh.userData.soilType = layer.soilType;
          mesh.userData.layerInfo = layer;
          
          // 添加到场景
          scene.add(mesh);
        });
        
        // 调整相机视角以适应模型
        const box = new THREE.Box3();
        scene.traverse(object => {
          if (object instanceof THREE.Mesh && object.userData.isGeologicalLayer) {
            box.expandByObject(object);
          }
        });
        
        if (box.isEmpty()) {
          // 如果没有地质层，则使用默认视角
          camera.position.set(50, 50, 100);
        } else {
          // 计算包围盒的中心和大小
          const center = new THREE.Vector3();
          box.getCenter(center);
          const size = box.getSize(new THREE.Vector3());
          
          // 调整相机位置
          const maxDim = Math.max(size.x, size.y, size.z);
          const fov = camera.fov * (Math.PI / 180);
          const cameraDistance = maxDim / (2 * Math.tan(fov / 2));
          
          const direction = new THREE.Vector3(1, 0.5, 1).normalize();
          camera.position.copy(center.clone().add(direction.multiplyScalar(cameraDistance * 1.5)));
          camera.lookAt(center);
          
          // 更新控制器
          controls.target.copy(center);
        }
        
        controls.update();
        setIsLoading(false);
        
      } catch (err) {
        console.error('加载地质模型失败:', err);
        setError('加载地质模型失败: ' + (err instanceof Error ? err.message : String(err)));
        setIsLoading(false);
      }
    };
    
    loadModel();
    
    // 动画循环
    const animate = () => {
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    // 处理窗口大小变化
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current) return;
      
      const container = containerRef.current;
      const camera = cameraRef.current;
      const renderer = rendererRef.current;
      
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      
      if (controlsRef.current) {
        controlsRef.current.dispose();
      }
      
      if (sceneRef.current) {
        // 清理场景中的几何体和材质
        sceneRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            object.geometry.dispose();
            
            if (Array.isArray(object.material)) {
              object.material.forEach(material => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
    };
  }, [modelId, colorScheme]);
  
  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100%', minHeight: '400px' }}>
      {isLoading && (
        <Box sx={{ 
          position: 'absolute', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          zIndex: 10
        }}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2, color: 'white' }}>
            加载地质模型...
          </Typography>
        </Box>
      )}
      
      {error && (
        <Box sx={{ position: 'absolute', top: 10, left: 10, right: 10, zIndex: 20 }}>
          <Alert severity="error">{error}</Alert>
        </Box>
      )}
      
      <Box 
        ref={containerRef} 
        sx={{ 
          width: '100%', 
          height: '100%',
          borderRadius: 1,
          overflow: 'hidden'
        }} 
      />
    </Box>
  );
};

export default GeologicalModelViewer; 