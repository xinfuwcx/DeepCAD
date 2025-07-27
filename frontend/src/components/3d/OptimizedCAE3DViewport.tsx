/**
 * 高性能优化的CAE 3D视口
 * 1号架构师优化 - 提升渲染性能和用户体验
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Space, Card, Switch, Select, Slider, Typography, message } from 'antd';
import {
  FullscreenOutlined,
  SettingOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  BulbOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { performanceMonitor } from '../../utils/performanceMonitor';

const { Text } = Typography;
const { Option } = Select;

interface OptimizedViewportProps {
  className?: string;
  showControls?: boolean;
  onPerformanceChange?: (metrics: any) => void;
}

// 性能配置
const PERFORMANCE_CONFIG = {
  // LOD距离阈值
  LOD_DISTANCES: [10, 50, 200],
  // 最大渲染实例数
  MAX_INSTANCES: 10000,
  // 帧率目标
  TARGET_FPS: 60,
  // 内存限制 (MB)
  MEMORY_LIMIT: 512,
  // 渲染质量级别
  QUALITY_LEVELS: {
    LOW: { shadows: false, antialiasing: false, pixelRatio: 1 },
    MEDIUM: { shadows: true, antialiasing: false, pixelRatio: 1.5 },
    HIGH: { shadows: true, antialiasing: true, pixelRatio: 2 }
  }
};

// 性能管理器
class ViewportPerformanceManager {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.Camera | null = null;
  private frameCount = 0;
  private lastTime = performance.now();
  private currentFPS = 60;
  private qualityLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'HIGH';

  initialize(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    
    // 全局渲染器引用 - 供性能监控使用
    (window as any).deepcadRenderer = renderer;
    
    ComponentDevHelper.logDevTip('3D渲染器性能管理器已初始化');
  }

  // 自适应质量调整
  adaptiveQualityControl() {
    if (!this.renderer) return;

    const now = performance.now();
    this.frameCount++;

    if (now - this.lastTime >= 1000) {
      this.currentFPS = Math.round((this.frameCount * 1000) / (now - this.lastTime));
      this.frameCount = 0;
      this.lastTime = now;

      // 根据FPS自动调整质量
      if (this.currentFPS < 30 && this.qualityLevel !== 'LOW') {
        this.setQualityLevel('LOW');
        ComponentDevHelper.logPerformanceWarning('FPS过低，自动降低渲染质量');
      } else if (this.currentFPS > 50 && this.qualityLevel === 'LOW') {
        this.setQualityLevel('MEDIUM');
        ComponentDevHelper.logDevTip('性能恢复，提升渲染质量');
      } else if (this.currentFPS > 55 && this.qualityLevel === 'MEDIUM') {
        this.setQualityLevel('HIGH');
      }
    }
  }

  setQualityLevel(level: 'LOW' | 'MEDIUM' | 'HIGH') {
    if (!this.renderer) return;

    this.qualityLevel = level;
    const config = PERFORMANCE_CONFIG.QUALITY_LEVELS[level];

    // 应用渲染设置
    this.renderer.shadowMap.enabled = config.shadows;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, config.pixelRatio));
    
    if (config.antialiasing !== (this.renderer.getContext().getContextAttributes()?.antialias)) {
      // 抗锯齿需要重建渲染器
      ComponentDevHelper.logDevTip(`渲染质量已调整为: ${level}`);
    }
  }

  // 内存管理
  disposeUnusedResources() {
    if (!this.scene) return;

    let disposedCount = 0;
    
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        const mesh = object as THREE.Mesh;
        
        // 检查几何体和材质是否还在使用
        if (mesh.geometry && (mesh.geometry as any).dispose) {
          const geo = mesh.geometry as THREE.BufferGeometry;
          if (Object.keys(geo.attributes).length === 0) {
            geo.dispose();
            disposedCount++;
          }
        }

        if (mesh.material) {
          const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          materials.forEach(material => {
            if ((material as any).dispose && !(material as any).isInUse) {
              (material as any).dispose();
              disposedCount++;
            }
          });
        }
      }
    });

    if (disposedCount > 0) {
      ComponentDevHelper.logDevTip(`清理了 ${disposedCount} 个未使用的3D资源`);
    }
  }

  getCurrentFPS() {
    return this.currentFPS;
  }

  getQualityLevel() {
    return this.qualityLevel;
  }

  // 获取渲染统计信息
  getRenderStats() {
    if (!this.renderer) return null;

    return {
      fps: this.currentFPS,
      quality: this.qualityLevel,
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length || 0
    };
  }
}

const OptimizedCAE3DViewport: React.FC<OptimizedViewportProps> = ({
  className,
  showControls = true,
  onPerformanceChange
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const animationFrameRef = useRef<number>();
  const performanceManagerRef = useRef<ViewportPerformanceManager>();

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [renderStats, setRenderStats] = useState<any>(null);
  const [renderMode, setRenderMode] = useState<'solid' | 'wireframe' | 'points'>('solid');
  const [showGrid, setShowGrid] = useState(true);
  const [showAxes, setShowAxes] = useState(true);
  const [qualityLevel, setQualityLevel] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('HIGH');

  // 初始化Three.js场景
  const initializeThreeJS = useCallback(() => {
    if (!mountRef.current || isInitialized) return;

    try {
      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0a);
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        45,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(10, 10, 10);
      cameraRef.current = camera;

      // 创建渲染器 - 性能优化配置
      const renderer = new THREE.WebGLRenderer({
        antialias: window.devicePixelRatio < 2, // 高DPI设备关闭抗锯齿提升性能
        alpha: false, // 不需要透明度
        stencil: false, // 不需要模板缓冲
        depth: true,
        logarithmicDepthBuffer: false, // 避免深度缓冲问题
        powerPreference: 'high-performance' // 优选高性能GPU
      });

      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // 限制像素比提升性能
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      
      // 检查WebGL2支持
      const isWebGL2 = renderer.capabilities.isWebGL2;
      console.log('WebGL2支持:', isWebGL2);
      
      mountRef.current.appendChild(renderer.domElement);
      rendererRef.current = renderer;

      // 创建轨道控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.1;
      controls.screenSpacePanning = false;
      controls.maxPolarAngle = Math.PI / 2;
      controlsRef.current = controls;

      // 初始化性能管理器
      const performanceManager = new ViewportPerformanceManager();
      performanceManager.initialize(renderer, scene, camera);
      performanceManagerRef.current = performanceManager;

      // 添加基础光照
      setupLighting(scene);
      
      // 添加网格和坐标轴
      if (showGrid) addGrid(scene);
      if (showAxes) addAxes(scene);

      // 添加示例几何体
      addDemoGeometry(scene);

      setIsInitialized(true);
      ComponentDevHelper.logDevTip('优化版3D视口初始化完成');

    } catch (error) {
      ComponentDevHelper.logError(error, 'OptimizedCAE3DViewport', '1号架构师');
      message.error('3D视口初始化失败');
    }
  }, [isInitialized, showGrid, showAxes]);

  // 设置光照
  const setupLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.setScalar(1024); // 降低阴影分辨率提升性能
    scene.add(directionalLight);
  };

  // 添加网格
  const addGrid = (scene: THREE.Scene) => {
    const gridHelper = new THREE.GridHelper(20, 20, 0x00d9ff, 0x444444);
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.3;
    scene.add(gridHelper);
  };

  // 添加坐标轴
  const addAxes = (scene: THREE.Scene) => {
    const axesHelper = new THREE.AxesHelper(5);
    scene.add(axesHelper);
  };

  // 添加演示几何体
  const addDemoGeometry = (scene: THREE.Scene) => {
    // 创建实例化网格以提升性能
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshLambertMaterial({ 
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.8
    });

    // 添加几个示例立方体
    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10,
        (Math.random() - 0.5) * 10
      );
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    }
  };

  // 渲染循环
  const animate = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    // 性能管理
    performanceManagerRef.current?.adaptiveQualityControl();

    // 更新控制器
    controlsRef.current?.update();

    // 渲染场景
    rendererRef.current.render(sceneRef.current, cameraRef.current);

    // 更新渲染统计
    const stats = performanceManagerRef.current?.getRenderStats();
    if (stats) {
      setRenderStats(stats);
      onPerformanceChange?.(stats);
    }

    animationFrameRef.current = requestAnimationFrame(animate);
  }, [onPerformanceChange]);

  // 组件挂载
  useEffect(() => {
    initializeThreeJS();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      // 清理Three.js资源
      performanceManagerRef.current?.disposeUnusedResources();
      rendererRef.current?.dispose();
    };
  }, [initializeThreeJS]);

  // 启动渲染循环
  useEffect(() => {
    if (isInitialized) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isInitialized, animate]);

  // 窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;

      const { clientWidth, clientHeight } = mountRef.current;
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(clientWidth, clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // 强制质量调整
  const handleQualityChange = (level: 'LOW' | 'MEDIUM' | 'HIGH') => {
    performanceManagerRef.current?.setQualityLevel(level);
    setQualityLevel(level);
    message.success(`渲染质量已设置为: ${level}`);
  };

  // 清理资源
  const handleCleanup = () => {
    performanceManagerRef.current?.disposeUnusedResources();
    message.success('3D资源清理完成');
  };

  return (
    <div className={className} style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D视口容器 */}
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          overflow: 'hidden'
        }}
      />

      {/* 性能控制面板 */}
      {showControls && (
        <Card
          size="small"
          title="渲染控制"
          style={{
            position: 'absolute',
            top: 16,
            right: 16,
            width: 280,
            background: 'rgba(22, 33, 62, 0.95)',
            border: '1px solid #00d9ff30'
          }}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="small">
            {/* 性能统计 */}
            {renderStats && (
              <div style={{ fontSize: '12px' }}>
                <Text style={{ color: '#ffffff80' }}>
                  FPS: <span style={{ color: renderStats.fps >= 30 ? '#52c41a' : '#ff4d4f' }}>
                    {renderStats.fps}
                  </span>
                </Text>
                <br />
                <Text style={{ color: '#ffffff80' }}>
                  Draw Calls: {renderStats.drawCalls} | Triangles: {renderStats.triangles}
                </Text>
                <br />
                <Text style={{ color: '#ffffff80' }}>
                  Quality: {renderStats.quality}
                </Text>
              </div>
            )}

            {/* 渲染质量控制 */}
            <div>
              <Text style={{ color: '#ffffff80', fontSize: '12px' }}>渲染质量</Text>
              <Select
                value={qualityLevel}
                onChange={handleQualityChange}
                size="small"
                style={{ width: '100%', marginTop: 4 }}
              >
                <Option value="LOW">低质量 (高性能)</Option>
                <Option value="MEDIUM">中等质量</Option>
                <Option value="HIGH">高质量 (高画质)</Option>
              </Select>
            </div>

            {/* 显示选项 */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <Text style={{ color: '#ffffff80', fontSize: '12px' }}>显示网格</Text>
                <Switch
                  size="small"
                  checked={showGrid}
                  onChange={setShowGrid}
                  style={{ marginLeft: 8 }}
                />
              </div>
              <div>
                <Text style={{ color: '#ffffff80', fontSize: '12px' }}>显示坐标轴</Text>
                <Switch
                  size="small"
                  checked={showAxes}
                  onChange={setShowAxes}
                  style={{ marginLeft: 8 }}
                />
              </div>
            </div>

            {/* 操作按钮 */}
            <Space>
              <Button
                size="small"
                icon={<ReloadOutlined />}
                onClick={handleCleanup}
              >
                清理资源
              </Button>
              <Button
                size="small"
                icon={<FullscreenOutlined />}
                onClick={() => mountRef.current?.requestFullscreen()}
              >
                全屏
              </Button>
            </Space>
          </Space>
        </Card>
      )}
    </div>
  );
};

export default OptimizedCAE3DViewport;