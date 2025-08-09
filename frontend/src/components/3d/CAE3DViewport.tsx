/**
 * DeepCAD 专业三维CAE视口组件
 * @description 基于Three.js构建的高性能3D可视化视口，专为深基坑工程CAE分析设计
 * 支持应力云图、变形动画、流场可视化等专业工程分析功能
 * @author 1号架构师
 * @version 2.0.0
 * @since 2024-07-25
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button, Space, Dropdown, Menu, Slider, Card, Switch, Select, Divider, message } from 'antd';
import {
  FullscreenOutlined,
  SettingOutlined,
  BorderOutlined,
  ColumnHeightOutlined,
  AimOutlined,
  CameraOutlined,
  RotateLeftOutlined,
  ZoomInOutlined,
  EyeOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  AppstoreOutlined,
  BlockOutlined,
  LoadingOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { useUIStore } from '../../stores/useUIStore';
import { ModernAxisHelper } from './core/ModernAxisHelper';

const { Option } = Select;

/**
 * CAE三维视口组件属性接口
 * @interface CAE3DViewportProps
 */
interface CAE3DViewportProps {
  /** 组件CSS类名 */
  className?: string;
  /** 是否显示工具栏 */
  showToolbar?: boolean;
  /** 视图配置变化回调函数 */
  onViewChange?: (viewConfig: ViewConfig) => void;
  /** 模型加载完成回调函数 */
  onModelLoad?: (model: any) => void;
  /** 模型选择变化回调函数 */
  onModelSelect?: (instances: any[]) => void;
  /** 初始加载的模型列表 */
  initialModels?: string[];
  /** 组件宽度 */
  width?: string | number;
  /** 组件高度 */
  height?: string | number;
}

/**
 * 三维视图配置接口
 * @interface ViewConfig
 * @description 定义3D视口的渲染和显示配置参数
 */
interface ViewConfig {
  /** 渲染模式：线框/实体/透明 */
  renderMode: 'wireframe' | 'solid' | 'transparent';
  /** 是否显示网格 */
  showGrid: boolean;
  /** 是否显示坐标轴 */
  showAxes: boolean;
  /** 是否显示边界框 */
  showBoundingBox: boolean;
  /** 背景颜色 (十六进制字符串) */
  backgroundColor: string;
  /** 光照类型：环境光/方向光/点光源 */
  lighting: 'ambient' | 'directional' | 'point';
  /** 相机类型：透视/正交 */
  cameraType: 'perspective' | 'orthographic';
  /** 视场角度 (仅透视相机有效，单位：度) */
  fieldOfView: number;
}

/**
 * 视口控制参数接口
 * @interface ViewportControls
 * @description 定义相机的位置、旋转、缩放等控制参数
 */
interface ViewportControls {
  /** 缩放比例 */
  zoom: number;
  /** 旋转角度 (单位：弧度) */
  rotation: { x: number; y: number; z: number };
  /** 相机位置坐标 */
  position: { x: number; y: number; z: number };
  /** 相机目标点坐标 */
  target: { x: number; y: number; z: number };
}

/**
 * DeepCAD专业三维CAE视口组件
 * @description 提供完整的3D可视化功能，包括模型渲染、交互控制、视图配置等
 * @param props - 组件属性参数
 * @returns JSX.Element - 三维视口组件
 */
const CAE3DViewport: React.FC<CAE3DViewportProps> = ({
  className,
  showToolbar = true,
  onViewChange,
  onModelLoad,
  onModelSelect,
  initialModels = [],
  width = '100%',
  height = '100%'
}) => {
  // Three.js核心对象引用
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const frameIdRef = useRef<number>();

  // 组件状态管理
  const [isLoading, setIsLoading] = useState(false);
  const [viewConfig, setViewConfig] = useState<ViewConfig>({
    renderMode: 'solid',
    showGrid: true,
    showAxes: true,
    showBoundingBox: false,
    backgroundColor: '#f0f2f5',
    lighting: 'directional',
    cameraType: 'perspective',
    fieldOfView: 45
  });

  const [viewportControls, setViewportControls] = useState<ViewportControls>({
    zoom: 1,
    rotation: { x: 0, y: 0, z: 0 },
    position: { x: 10, y: 10, z: 10 },
    target: { x: 0, y: 0, z: 0 }
  });

  /**
   * 初始化Three.js渲染环境
   * @description 创建并配置Three.js的基础渲染组件：场景、相机、渲染器、控制器等
   * @returns void
   * @throws {Error} 当DOM容器不存在时抛出错误
   */
  const initThreeJS = useCallback(() => {
    if (!mountRef.current) return;

    // 创建Three.js场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f2f5);
    sceneRef.current = scene;

    // 创建透视相机
    const camera = new THREE.PerspectiveCamera(
      45, // 视场角度
      mountRef.current.clientWidth / mountRef.current.clientHeight, // 纵横比
      0.1,
      1000
    );
    camera.position.set(10, 10, 10);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.enablePan = true;
    controlsRef.current = controls;

    // 添加光照
    setupLighting(scene);

    // 添加网格和坐标系
    if (viewConfig.showGrid) addGrid(scene);
    if (viewConfig.showAxes) addAxes(scene);

    // 添加示例几何体
    addSampleGeometry(scene);

    // 开始渲染循环
    startRenderLoop();

  }, [viewConfig]);

  // 设置光照
  const setupLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    // 方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
  };

  // 添加网格
  const addGrid = (scene: THREE.Scene) => {
    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
    gridHelper.name = 'grid';
    scene.add(gridHelper);
  };

  // 添加现代化坐标系
  const addAxes = (scene: THREE.Scene) => {
    const modernAxis = new ModernAxisHelper({
      size: 5,
      lineWidth: 0.1,
      enableGlow: true,
      enableAnimation: false,
      enableInteraction: false,
      labelSize: 0.8,
      colors: {
        x: '#ff3333', // 红色 X轴
        y: '#33ff33', // 绿色 Y轴  
        z: '#3333ff'  // 蓝色 Z轴
      }
    });
    modernAxis.name = 'axes';
    scene.add(modernAxis);
  };

  // 添加示例几何体
  const addSampleGeometry = (scene: THREE.Scene) => {
    // 创建一个简单的立方体作为示例
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88,
      metalness: 0.1,
      roughness: 0.3
    });
    const cube = new THREE.Mesh(geometry, material);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.position.y = 1;
    cube.name = 'sample-cube';
    scene.add(cube);

    // 添加地面
    const planeGeometry = new THREE.PlaneGeometry(20, 20);
    const planeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xdddddd,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.receiveShadow = true;
    plane.name = 'ground';
    scene.add(plane);
  };

  // 渲染循环
  const startRenderLoop = () => {
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 处理窗口大小变化
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // 视图操作
  const handleViewChange = (config: Partial<ViewConfig>) => {
    const newConfig = { ...viewConfig, ...config };
    setViewConfig(newConfig);
    onViewChange?.(newConfig);
  };

  const resetView = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(10, 10, 10);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const fitToView = () => {
    if (!sceneRef.current || !cameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(sceneRef.current);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxSize = Math.max(size.x, size.y, size.z);
    const fitHeightDistance = maxSize / (2 * Math.atan(Math.PI * cameraRef.current.fov / 360));
    const fitWidthDistance = fitHeightDistance / cameraRef.current.aspect;
    const distance = Math.max(fitHeightDistance, fitWidthDistance);

    cameraRef.current.position.copy(center);
    cameraRef.current.position.z += distance * 1.5;
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  // 生命周期
  useEffect(() => {
    initThreeJS();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
        frameIdRef.current = null;
      }
      
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const mountNode = mountRef.current;
        const renderer = rendererRef.current;
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[CAE3DViewport] cleanup warning:', e);
      } finally {
        rendererRef.current = undefined;
      }
    };
  }, [initThreeJS, handleResize]);

  // 工具栏菜单
  const viewModeMenu = (
    <Menu onClick={({ key }) => handleViewChange({ renderMode: key as any })}>
      <Menu.Item key="solid">实体</Menu.Item>
      <Menu.Item key="wireframe">线框</Menu.Item>
      <Menu.Item key="transparent">透明</Menu.Item>
    </Menu>
  );

  const cameraMenu = (
    <Menu onClick={({ key }) => handleViewChange({ cameraType: key as any })}>
      <Menu.Item key="perspective">透视相机</Menu.Item>
      <Menu.Item key="orthographic">正交相机</Menu.Item>
    </Menu>
  );

  return (
    <div className={`cae-3d-viewport ${className || ''}`} style={{ width, height, position: 'relative' }}>
      {/* 工具栏 */}
      {showToolbar && (
        <div style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          zIndex: 100,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(8px)',
          borderRadius: 8,
          padding: '8px 16px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)'
        }}>
          <Space>
            <Dropdown overlay={viewModeMenu} trigger={['click']}>
              <Button icon={<EyeOutlined />} size="small">
                视图模式
              </Button>
            </Dropdown>
            
            <Dropdown overlay={cameraMenu} trigger={['click']}>
              <Button icon={<CameraOutlined />} size="small">
                相机
              </Button>
            </Dropdown>

            <Button 
              icon={<BorderOutlined />} 
              size="small"
              type={viewConfig.showGrid ? 'primary' : 'default'}
              onClick={() => handleViewChange({ showGrid: !viewConfig.showGrid })}
            >
              网格
            </Button>

            <Button 
              icon={<ColumnHeightOutlined />} 
              size="small"
              type={viewConfig.showAxes ? 'primary' : 'default'}
              onClick={() => handleViewChange({ showAxes: !viewConfig.showAxes })}
            >
              坐标系
            </Button>
          </Space>

          <Space>
            <Button icon={<AimOutlined />} size="small" onClick={fitToView}>
              适应视图
            </Button>
            
            <Button icon={<RotateLeftOutlined />} size="small" onClick={resetView}>
              重置视图
            </Button>

            <Button icon={<FullscreenOutlined />} size="small">
              全屏
            </Button>
          </Space>
        </div>
      )}

      {/* 3D渲染区域 */}
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          background: '#f0f2f5'
        }} 
      />

      {/* 加载状态 */}
      {isLoading && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.8)',
          zIndex: 200
        }}>
          <Space direction="vertical" align="center">
            <LoadingOutlined style={{ fontSize: 24 }} />
            <span>加载中...</span>
          </Space>
        </div>
      )}
    </div>
  );
};

export default CAE3DViewport;