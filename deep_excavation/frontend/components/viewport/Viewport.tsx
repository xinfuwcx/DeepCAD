/**
 * @file 项目核心三维视口组件 - 高性能版本
 * @author GeoStruct-5 Team
 * @date 2025-01-27
 * @description 使用高性能渲染器和抗抖动控制系统的三维视口组件。
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Raycaster, Vector2 } from 'three';
import { replayFeatures } from '../../core/replayEngine';
import { useStore, ViewportHandles } from '../../core/store';
import { createAxesGizmo, setupAxesGizmo } from './AxesGizmo';
import { globalResourceManager } from '../../core/resourceManager';
import { OptimizedRenderer } from '../../core/optimizedRenderer';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';
import { EnhancedRenderer, createEnhancedRenderer } from '../../core/enhancedRenderer';
import { StabilizedControls, createStabilizedControls } from '../../core/stabilizedControls';
import { globalMaterialOptimizer } from '../../core/materialOptimizer';
import { globalRenderQualityManager } from '../../core/renderQualityManager';
import { BufferGeometry, Float32BufferAttribute } from 'three';

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
  enableSSAO: false,
  toneMapping: THREE.ACESFilmicToneMapping,
  toneMappingExposure: 1.0,
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

/**
 * @description 高性能核心视口组件，使用 forwardRef 将其API暴露给父组件。
 * @param {object} props - React组件的props，当前为空。
 * @param {React.Ref<ViewportHandles>} ref - 用于父组件调用的ref。
 * @returns {React.ReactElement} 渲染出的div容器。
 */
const Viewport = forwardRef<ViewportHandles, {}>((props, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const transientGroupRef = useRef(new THREE.Group());
  const resultsGroupRef = useRef(new THREE.Group());
  const axesGizmoRef = useRef<{ update: () => void; dispose: () => void }>();

  const features = useStore(state => state.features);
  const setViewportApi = useStore(state => state.setViewportApi);

  const parametricModel = useMemo(() => replayFeatures(features), [features]);

  const api: ViewportHandles = useMemo(() => ({
    addAnalysisMesh: (mesh) => {
        // ... (implementation not shown for brevity)
    },
    clearAnalysisMeshes: () => {
        // ... (implementation not shown for brevity)
    },
    loadVtkResults: async (url: string, opacity: number) => {
        // Clear previous results
        while(resultsGroupRef.current.children.length > 0){ 
            resultsGroupRef.current.remove(resultsGroupRef.current.children[0]); 
        }

        const response = await fetch(url);
        const vtkJson = await response.json();
        
        const geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(vtkJson.points, 3));
        if (vtkJson.indices) {
            geometry.setIndex(vtkJson.indices);
        }
        if (vtkJson.color) {
            geometry.setAttribute('color', new Float32BufferAttribute(vtkJson.color, 3));
        }
        geometry.computeVertexNormals();

        const material = new THREE.MeshStandardMaterial({ 
            vertexColors: true,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: opacity
        });

        const mesh = new THREE.Mesh(geometry, material);
        resultsGroupRef.current.add(mesh);
    },
    setModelOpacity: (opacity: number) => {
        resultsGroupRef.current.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
                child.material.opacity = opacity;
                child.material.needsUpdate = true;
            }
        });
    },
  }), []);

  useEffect(() => {
    setViewportApi(api);
  }, [setViewportApi, api]);

  // 启动性能监控
  useEffect(() => {
    // 启动全局性能监控
    globalPerformanceMonitor.startMonitoring();
    
    return () => {
      // 清理时停止监控
      globalPerformanceMonitor.stopMonitoring();
    };
  }, []);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || rendererRef.current) return;

    // --- Core Three.js Setup ---
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x1a2035);
    scene.add(transientGroupRef.current);
    scene.add(resultsGroupRef.current);

    // --- 创建专业的网格地面 ---
    const createProfessionalGrid = () => {
      const gridGroup = new THREE.Group();
      gridGroup.name = "ProfessionalGrid";
      
      // 地面平面
      const groundGeometry = new THREE.PlaneGeometry(1000, 1000);
      const groundMaterial = new THREE.MeshBasicMaterial({
        color: 0x1a2035,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8
      });
      const groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
      groundPlane.rotation.x = -Math.PI / 2;
      groundPlane.position.y = -0.01; // 稍微下沉以避免z-fighting
      gridGroup.add(groundPlane);
      
      // 创建主网格线
      const mainGridSize = 1000;
      const mainGridDivisions = 10;
      const mainGridStep = mainGridSize / mainGridDivisions;
      
      const mainGridGeometry = new THREE.BufferGeometry();
      const mainGridPositions = [];
      
      // 创建主网格线
      for (let i = -mainGridSize/2; i <= mainGridSize/2; i += mainGridStep) {
        // X方向线
        mainGridPositions.push(i, 0, -mainGridSize/2);
        mainGridPositions.push(i, 0, mainGridSize/2);
        
        // Z方向线
        mainGridPositions.push(-mainGridSize/2, 0, i);
        mainGridPositions.push(mainGridSize/2, 0, i);
      }
      
      mainGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(mainGridPositions, 3));
      const mainGridMaterial = new THREE.LineBasicMaterial({ color: 0x4488cc, linewidth: 1.5 });
      const mainGrid = new THREE.LineSegments(mainGridGeometry, mainGridMaterial);
      gridGroup.add(mainGrid);
      
      // 创建次网格线
      const subGridGeometry = new THREE.BufferGeometry();
      const subGridPositions = [];
      const subGridStep = mainGridStep / 5; // 每个主格再分5格
      
      for (let i = -mainGridSize/2; i <= mainGridSize/2; i += subGridStep) {
        // 跳过主网格线位置
        if (Math.abs(i % mainGridStep) < 0.001) continue;
        
        // X方向线
        subGridPositions.push(i, 0, -mainGridSize/2);
        subGridPositions.push(i, 0, mainGridSize/2);
        
        // Z方向线
        subGridPositions.push(-mainGridSize/2, 0, i);
        subGridPositions.push(mainGridSize/2, 0, i);
      }
      
      subGridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(subGridPositions, 3));
      const subGridMaterial = new THREE.LineBasicMaterial({ color: 0x2a3a5a, linewidth: 0.5, transparent: true, opacity: 0.5 });
      const subGrid = new THREE.LineSegments(subGridGeometry, subGridMaterial);
      gridGroup.add(subGrid);
      
      // 添加坐标轴指示线
      const axisLength = mainGridSize / 2;
      
      // X轴 (红色)
      const xAxisGeometry = new THREE.BufferGeometry();
      xAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, axisLength, 0.1, 0], 3));
      const xAxisMaterial = new THREE.LineBasicMaterial({ color: 0xff4444, linewidth: 2 });
      const xAxis = new THREE.Line(xAxisGeometry, xAxisMaterial);
      gridGroup.add(xAxis);
      
      // Z轴 (蓝色)
      const zAxisGeometry = new THREE.BufferGeometry();
      zAxisGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0.1, 0, 0, 0.1, axisLength], 3));
      const zAxisMaterial = new THREE.LineBasicMaterial({ color: 0x4444ff, linewidth: 2 });
      const zAxis = new THREE.Line(zAxisGeometry, zAxisMaterial);
      gridGroup.add(zAxis);
      
      return gridGroup;
    };
    
    // 创建并添加专业网格地面
    const professionalGrid = createProfessionalGrid();
    scene.add(professionalGrid);

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 2000);
    camera.position.set(100, 150, 250);
    cameraRef.current = camera;

    // --- Renderer ---
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
    rendererRef.current = renderer;
    mountNode.appendChild(renderer.domElement);

    // --- Controls ---
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 200, 150);
    scene.add(directionalLight);

    // --- 设置ABAQUS风格的坐标系指示器 ---
    // 确保正确创建和设置坐标系指示器
    if (!axesGizmoRef.current) {
      axesGizmoRef.current = setupAxesGizmo(scene, camera, renderer);
      console.log('坐标系指示器已创建');
    }

    // --- Resize Handling ---
    const handleResize = () => {
      if (mountNode) {
        camera.aspect = mountNode.clientWidth / mountNode.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(mountNode.clientWidth, mountNode.clientHeight);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(mountNode);

    // --- Animation Loop ---
    const animate = () => {
      requestAnimationFrame(animate);
      
      // 记录渲染开始时间
      const renderStartTime = globalPerformanceMonitor.startRender();
      
      controls.update();
      renderer.render(scene, camera);
      
      // 更新坐标系指示器
      if (axesGizmoRef.current) {
        axesGizmoRef.current.update();
      }
      
      // 记录渲染结束时间
      globalPerformanceMonitor.endRender(renderStartTime);
      
      // 更新渲染器统计信息
      if (renderer && renderer.info) {
        globalPerformanceMonitor.updateRendererStats(renderer);
      }
    };
    animate();

    return () => {
      // 停止动画循环
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      
      // 清理坐标系指示器
      if (axesGizmoRef.current) {
        axesGizmoRef.current.dispose();
      }
      
      // 清理观察器
      resizeObserver.disconnect();
    };
  }, []);

  // --- Scene Update Logic ---
  useEffect(() => {
    const scene = sceneRef.current;
    // Clear previous model
    const toRemove = scene.children.find(child => child.name === "ParametricModel");
    if (toRemove) {
      scene.remove(toRemove);
      // Let garbage collection handle disposal of the removed object
    }
    // Add new model
    parametricModel.name = "ParametricModel";
    scene.add(parametricModel);

    // Center camera on new model
    if (controlsRef.current && parametricModel.children.length > 0) {
        const box = new THREE.Box3().setFromObject(parametricModel);
        const center = box.getCenter(new THREE.Vector3());
        controlsRef.current.target.copy(center);
    }
  }, [parametricModel]);

  return (
    <div 
      ref={mountRef} 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} 
    />
  );
});

export default Viewport; 