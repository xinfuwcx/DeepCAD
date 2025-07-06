import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { Raycaster, Vector2 } from 'three';
import { replayFeatures } from '../../core/replayEngine';
import { useStore, ViewportHandles } from '../../core/store';
import { createAxesGizmo } from './AxesGizmo';
import { globalResourceManager } from '../../core/resourceManager';
import { OptimizedRenderer } from '../../core/optimizedRenderer';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';
import { EnhancedRenderer, createEnhancedRenderer } from '../../core/enhancedRenderer';
import { StabilizedControls, createStabilizedControls } from '../../core/stabilizedControls';
import { globalMaterialOptimizer } from '../../core/materialOptimizer';
import { globalRenderQualityManager } from '../../core/renderQualityManager';

// 高性能渲染配置
const HIGH_PERFORMANCE_CONFIG = {
  antialias: true,
  pixelRatio: Math.min(window.devicePixelRatio, 2),
  shadowMapEnabled: true,
  shadowMapType: THREE.PCFSoftShadowMap,
  enableFrustumCulling: true,
  enableOcclusion: false,
  maxDrawCalls: 1000,
  enableBloom: false,
  enableSSAO: true, // 启用SSAO提高细节表现
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.2, // 增加曝光度提高清晰度
  enableTAA: true,
  enableMotionBlur: false,
  stabilizeCamera: true
};

// 抗抖动控制配置
const STABILIZATION_CONFIG = {
  dampingFactor: 0.05,
  rotationSmoothing: 0.08,
  zoomSmoothing: 0.12,
  panSmoothing: 0.10,
  velocityThreshold: 0.01,
  accelerationThreshold: 0.005,
  stabilizationStrength: 0.85,
  minMovement: 0.001,
  maxVelocity: 8.0,
  adaptiveSmoothing: true,
  performanceMode: false
};

// 视口样式
const viewportStyles: React.CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  overflow: 'hidden',
  background: 'linear-gradient(180deg, #1a2035 0%, #121828 100%)', // 深色渐变背景
  boxShadow: 'inset 0 0 50px rgba(0,0,0,0.3)', // 内阴影增加深度感
};

/**
 * @description 高性能核心视口组件，使用 forwardRef 将其API暴露给父组件。
 * @param {object} props - React组件的props，当前为空。
 * @param {React.Ref<ViewportHandles>} ref - 用于父组件调用的ref。
 * @returns {React.ReactElement} 渲染出的div容器。
 */
const Viewport = forwardRef<ViewportHandles, {}>((props, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // 高性能渲染器引用
  const enhancedRendererRef = useRef<EnhancedRenderer>();
  const stabilizedControlsRef = useRef<StabilizedControls>();
  
  // --- 传统场景引用（保持兼容性）---
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  
  // --- Axes Gizmo Refs ---
  const axesSceneRef = useRef(new THREE.Scene());
  const axesCameraRef = useRef<THREE.OrthographicCamera>();
  
  const analysisMeshesRef = useRef<THREE.Object3D[]>([]);
  const resultsMeshRef = useRef<THREE.Object3D | null>(null);
  const transientGroupRef = useRef(new THREE.Group());

  // --- Cross-section planes refs ---
  const crossSectionPlanesRef = useRef<{
    x: THREE.Plane | null;
    y: THREE.Plane | null; 
    z: THREE.Plane | null;
  }>({ x: null, y: null, z: null });

  // --- Picker helper ---
  const pickingPlane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  // --- Subscribe to global state ---
  const features = useStore(state => state.features);
  const selectedFeatureId = useStore(state => state.selectedFeatureId);
  const transientObjects = useStore(state => state.transientObjects);
  const pickingState = useStore(state => state.pickingState);
  const executePick = useStore(state => state.executePick);
  const stopPicking = useStore(state => state.stopPicking);
  const exitEditMode = useStore(state => state.exitEditMode);
  const setViewportApi = useStore(state => state.setViewportApi);

  // --- Replay engine generates the main model ---
  const parametricModel = useMemo(() => replayFeatures(features), [features]);

  // --- Imperative handles for parent component control ---
  useImperativeHandle(ref, () => {
    // ... 保持现有代码不变
  }, []);

  // Set viewport API in store once the component mounts
  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      setViewportApi(ref.current);
    }
  }, [setViewportApi]);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || enhancedRendererRef.current) return;

    const initializeHighPerformanceRenderer = () => {
      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        60, // 增大FOV提高视野
        mountNode.clientWidth / mountNode.clientHeight,
        0.1,
        2000 // 增加远裁剪面距离
      );
      
      // 设置初始相机位置 - 修改为Z轴朝上的右手坐标系
      camera.position.set(50, 50, 80);
      camera.up.set(0, 0, 1); // 将Z轴设为向上方向
      cameraRef.current = camera;
      
      // 创建高性能渲染器
      const renderer = createEnhancedRenderer(mountNode, HIGH_PERFORMANCE_CONFIG);
      rendererRef.current = renderer.getRenderer();
      enhancedRendererRef.current = renderer;
      
      // 设置场景
      const scene = sceneRef.current;
      scene.background = new THREE.Color(0x121828); // 深蓝色背景
      
      // 添加环境光和方向光
      const ambientLight = new THREE.AmbientLight(0x404040, 0.6); // 增加环境光强度
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // 增加直射光强度
      directionalLight.position.set(100, 100, 100);
      directionalLight.castShadow = true;
      directionalLight.shadow.mapSize.width = 2048; // 增加阴影贴图分辨率
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.5;
      directionalLight.shadow.camera.far = 500;
      directionalLight.shadow.bias = -0.0005; // 减少阴影失真
      scene.add(directionalLight);
      
      // 添加第二个方向光以增强细节表现
      const secondaryLight = new THREE.DirectionalLight(0xadd8e6, 0.5);
      secondaryLight.position.set(-50, 20, 100);
      scene.add(secondaryLight);
      
      // 创建抗抖动控制器
      const controls = createStabilizedControls(camera, mountNode, STABILIZATION_CONFIG);
      controlsRef.current = controls.getControls();
      stabilizedControlsRef.current = controls;
      
      // 添加坐标轴辅助
      const axesHelper = new THREE.AxesHelper(20);
      scene.add(axesHelper);
      
      // 添加网格辅助 - 适应Z轴朝上
      const gridHelper = new THREE.GridHelper(100, 20);
      gridHelper.rotation.x = Math.PI / 2; // 旋转网格以适应Z轴朝上
      scene.add(gridHelper);
      
      // 添加参数化模型
      if (parametricModel) {
        scene.add(parametricModel);
      }
      
      // 添加瞬态对象组
      scene.add(transientGroupRef.current);
      
      // 创建坐标轴指示器
      const axesGizmo = createAxesGizmo();
      axesSceneRef.current = axesGizmo.scene;
      axesCameraRef.current = axesGizmo.camera;
      
      // 启动性能监控
      globalPerformanceMonitor.startMonitoring();
      globalPerformanceMonitor.addCallback((metrics) => {
        // 可以在这里添加性能指标回调
      });
      
      // 应用推荐的渲染质量设置
      globalRenderQualityManager.applyRecommendedSettings();
      
      // 注册窗口大小变化事件
      const handleResize = () => {
        if (!mountNode) return;
        
        const width = mountNode.clientWidth;
        const height = mountNode.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.getRenderer().setSize(width, height);
        
        // 更新坐标轴指示器
        if (axesCameraRef.current) {
          axesCameraRef.current.left = -width / height;
          axesCameraRef.current.right = width / height;
          axesCameraRef.current.updateProjectionMatrix();
        }
      };
      
      window.addEventListener('resize', handleResize);
      
      // 动画循环
      const animate = () => {
        if (!mountNode) return;
        
        const animationId = requestAnimationFrame(animate);
        globalResourceManager.addCleanupTask(() => cancelAnimationFrame(animationId));
        
        // 更新控制器
        if (stabilizedControlsRef.current) {
          stabilizedControlsRef.current.update();
        }
        
        // 渲染主场景
        if (enhancedRendererRef.current) {
          const renderStartTime = globalPerformanceMonitor.startRender();
          enhancedRendererRef.current.render(scene, camera);
          globalPerformanceMonitor.endRender(renderStartTime);
        }
        
        // 渲染坐标轴指示器
        if (axesCameraRef.current && axesSceneRef.current && rendererRef.current) {
          const renderer = rendererRef.current;
          renderer.autoClear = false;
          renderer.clearDepth();
          renderer.render(axesSceneRef.current, axesCameraRef.current);
        }
        
        // 更新渲染器统计
        if (rendererRef.current) {
          globalPerformanceMonitor.updateRendererStats(rendererRef.current);
        }
      };
      
      animate();
      
      // 清理函数
      return () => {
        window.removeEventListener('resize', handleResize);
        globalResourceManager.cleanup();
        globalPerformanceMonitor.stopMonitoring();
      };
    };

    const cleanup = initializeHighPerformanceRenderer();
    
    // 添加事件监听器
    mountNode.addEventListener('click', handleMouseClick);
    mountNode.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      mountNode.removeEventListener('click', handleMouseClick);
      mountNode.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      
      if (cleanup && typeof cleanup === 'function') {
        cleanup();
      }
    };
  }, [parametricModel]);

  // ... 保持其他现有代码不变

  // 返回视口容器
  return (
    <div ref={mountRef} style={viewportStyles} />
  );
});

export default Viewport; 