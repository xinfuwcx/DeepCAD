import React, { useEffect, useRef, useState } from 'react';
import { Box, Tabs, Tab, Typography, Paper, CircularProgress, Button } from '@mui/material';
import { styled } from '@mui/material/styles';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader';

// 样式
const DiagramContainer = styled(Box)(({ theme }) => ({
  width: '100%',
  height: '600px',
  position: 'relative',
  backgroundColor: '#f5f5f5',
  borderRadius: theme.shape.borderRadius,
  overflow: 'hidden',
}));

const CanvasContainer = styled(Box)({
  width: '100%',
  height: '100%',
});

const ControlPanel = styled(Paper)(({ theme }) => ({
  position: 'absolute',
  top: theme.spacing(2),
  right: theme.spacing(2),
  padding: theme.spacing(1),
  zIndex: 10,
}));

const LoadingOverlay = styled(Box)({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  zIndex: 20,
});

// 接口定义
interface ExcavationDiagramProps {
  projectId: number;
  modelFile?: string;
  meshFile?: string;
  resultFile?: string;
  width?: string | number;
  height?: string | number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

// 标签面板组件
function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`excavation-tabpanel-${index}`}
      aria-labelledby={`excavation-tab-${index}`}
      style={{ height: '100%' }}
      {...other}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// 深基坑图形组件
const ExcavationDiagram: React.FC<ExcavationDiagramProps> = ({
  projectId,
  modelFile,
  meshFile,
  resultFile,
  width = '100%',
  height = '600px',
  onLoad,
  onError,
}) => {
  // 状态
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 引用
  const canvas3DRef = useRef<HTMLDivElement>(null);
  const canvas2DRef = useRef<HTMLCanvasElement>(null);
  const scene = useRef<THREE.Scene | null>(null);
  const camera = useRef<THREE.PerspectiveCamera | null>(null);
  const renderer = useRef<THREE.WebGLRenderer | null>(null);
  const controls = useRef<OrbitControls | null>(null);

  // 处理标签切换
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // 初始化3D场景
  const init3DScene = () => {
    if (!canvas3DRef.current) return;

    // 创建场景
    scene.current = new THREE.Scene();
    scene.current.background = new THREE.Color(0xf0f0f0);

    // 创建相机
    const container = canvas3DRef.current;
    const aspect = container.clientWidth / container.clientHeight;
    camera.current = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
    camera.current.position.set(50, 50, 50);
    camera.current.lookAt(0, 0, 0);

    // 创建渲染器
    renderer.current = new THREE.WebGLRenderer({ antialias: true });
    renderer.current.setSize(container.clientWidth, container.clientHeight);
    renderer.current.setPixelRatio(window.devicePixelRatio);
    renderer.current.shadowMap.enabled = true;
    container.appendChild(renderer.current.domElement);

    // 创建控制器
    controls.current = new OrbitControls(camera.current, renderer.current.domElement);
    controls.current.enableDamping = true;
    controls.current.dampingFactor = 0.25;

    // 添加光源
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.current.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    scene.current.add(directionalLight);

    // 添加网格
    const gridHelper = new THREE.GridHelper(100, 100);
    scene.current.add(gridHelper);

    // 添加坐标轴
    const axesHelper = new THREE.AxesHelper(50);
    scene.current.add(axesHelper);

    // 动画循环
    const animate = () => {
      requestAnimationFrame(animate);
      if (controls.current) controls.current.update();
      if (renderer.current && scene.current && camera.current) {
        renderer.current.render(scene.current, camera.current);
      }
    };
    animate();

    // 窗口大小变化处理
    const handleResize = () => {
      if (!container || !camera.current || !renderer.current) return;
      
      const width = container.clientWidth;
      const height = container.clientHeight;
      
      camera.current.aspect = width / height;
      camera.current.updateProjectionMatrix();
      
      renderer.current.setSize(width, height);
    };

    window.addEventListener('resize', handleResize);

    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      if (renderer.current && container) {
        container.removeChild(renderer.current.domElement);
      }
    };
  };

  // 初始化2D画布
  const init2DCanvas = () => {
    if (!canvas2DRef.current) return;

    const canvas = canvas2DRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 设置画布大小
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制坐标轴
    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(canvas.width - 50, canvas.height - 50);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(50, canvas.height - 50);
    ctx.lineTo(50, 50);
    ctx.stroke();

    // 绘制坐标轴标签
    ctx.font = '12px Arial';
    ctx.fillText('0', 45, canvas.height - 35);
    ctx.fillText('x', canvas.width - 40, canvas.height - 35);
    ctx.fillText('y', 35, 50);

    // 绘制简单的深基坑示意图
    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(100, 100, 400, 200);

    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(150, 150, 300, 100);

    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.strokeRect(100, 100, 400, 200);
    ctx.strokeRect(150, 150, 300, 100);

    // 绘制标注
    ctx.font = '14px Arial';
    ctx.fillStyle = '#000';
    ctx.fillText('深基坑', 280, 90);
    ctx.fillText('支护结构', 270, 140);
    ctx.fillText('基坑底部', 270, 270);
  };

  // 加载模型
  const loadModel = async () => {
    if (!scene.current) return;

    setLoading(true);
    setError(null);

    try {
      if (meshFile) {
        // 加载VTK网格
        const loader = new VTKLoader();
        const geometry = await new Promise<THREE.BufferGeometry>((resolve, reject) => {
          loader.load(
            meshFile,
            (geometry) => resolve(geometry),
            undefined,
            (error) => reject(error)
          );
        });

        const material = new THREE.MeshPhongMaterial({
          color: 0x0055ff,
          wireframe: false,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        });

        const mesh = new THREE.Mesh(geometry, material);
        scene.current.add(mesh);

        // 自动调整相机位置
        const box = new THREE.Box3().setFromObject(mesh);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.current!.fov * (Math.PI / 180);
        let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
        cameraZ *= 1.5; // 放大系数
        
        camera.current!.position.set(center.x, center.y, center.z + cameraZ);
        camera.current!.lookAt(center);
        controls.current!.target.set(center.x, center.y, center.z);
        controls.current!.update();
      } else {
        // 创建默认的深基坑模型
        createDefaultExcavationModel();
      }

      if (onLoad) onLoad();
    } catch (err) {
      console.error('加载模型失败:', err);
      setError('加载模型失败');
      if (onError && err instanceof Error) onError(err);
    } finally {
      setLoading(false);
    }
  };

  // 创建默认的深基坑模型
  const createDefaultExcavationModel = () => {
    if (!scene.current) return;

    // 创建地面
    const groundGeometry = new THREE.BoxGeometry(100, 5, 100);
    const groundMaterial = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.position.y = -2.5;
    scene.current.add(ground);

    // 创建基坑
    const pitGeometry = new THREE.BoxGeometry(60, 20, 60);
    const pitMaterial = new THREE.MeshPhongMaterial({
      color: 0xA0522D,
      transparent: true,
      opacity: 0.5,
    });
    const pit = new THREE.Mesh(pitGeometry, pitMaterial);
    pit.position.y = -12.5;
    scene.current.add(pit);

    // 创建支护结构
    const wallGeometry = new THREE.BoxGeometry(65, 25, 65);
    const wallMaterial = new THREE.MeshPhongMaterial({
      color: 0x808080,
      transparent: true,
      opacity: 0.3,
      wireframe: true,
    });
    const wall = new THREE.Mesh(wallGeometry, wallMaterial);
    wall.position.y = -10;
    scene.current.add(wall);

    // 创建基坑底部
    const bottomGeometry = new THREE.BoxGeometry(60, 2, 60);
    const bottomMaterial = new THREE.MeshPhongMaterial({ color: 0xD3D3D3 });
    const bottom = new THREE.Mesh(bottomGeometry, bottomMaterial);
    bottom.position.y = -22;
    scene.current.add(bottom);
  };

  // 初始化
  useEffect(() => {
    const cleanup3D = init3DScene();
    init2DCanvas();
    loadModel();

    return () => {
      if (cleanup3D) cleanup3D();
    };
  }, [projectId, meshFile, modelFile]);

  // 当标签切换时重新初始化2D画布
  useEffect(() => {
    if (tabValue === 1) {
      init2DCanvas();
    }
  }, [tabValue]);

  return (
    <DiagramContainer sx={{ width, height }}>
      <Tabs value={tabValue} onChange={handleTabChange} aria-label="excavation diagram tabs">
        <Tab label="3D视图" id="excavation-tab-0" aria-controls="excavation-tabpanel-0" />
        <Tab label="2D视图" id="excavation-tab-1" aria-controls="excavation-tabpanel-1" />
      </Tabs>

      <TabPanel value={tabValue} index={0}>
        <CanvasContainer ref={canvas3DRef} />
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <CanvasContainer>
          <canvas ref={canvas2DRef} style={{ width: '100%', height: '100%' }} />
        </CanvasContainer>
      </TabPanel>

      <ControlPanel>
        <Button variant="contained" size="small" onClick={() => loadModel()}>
          刷新模型
        </Button>
      </ControlPanel>

      {loading && (
        <LoadingOverlay>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            加载中...
          </Typography>
        </LoadingOverlay>
      )}

      {error && (
        <LoadingOverlay>
          <Typography color="error" variant="body1">
            {error}
          </Typography>
          <Button variant="contained" color="primary" sx={{ ml: 2 }} onClick={() => loadModel()}>
            重试
          </Button>
        </LoadingOverlay>
      )}
    </DiagramContainer>
  );
};

export default ExcavationDiagram;


