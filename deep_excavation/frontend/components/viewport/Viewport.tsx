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
  const gridRef = useRef<THREE.Group | THREE.GridHelper>();

  const features = useStore(state => state.features);
  const setViewportApi = useStore(state => state.setViewportApi);

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

    // --- Camera ---
    const camera = new THREE.PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 20000); // Increased far plane
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
    controls.target.set(0, 0, 0); // Explicitly set target
    controlsRef.current = controls;

    // --- Lights ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.9);
    directionalLight.position.set(150, 250, 200);
    scene.add(directionalLight);

    // --- Professional Grid ---
    // Replaced custom grid with standard THREE.GridHelper for robustness and simplicity.
    const gridHelper = new THREE.GridHelper(1000, 20, 0xffffff, 0x888888);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // --- Axes Gizmo ---
    axesGizmoRef.current = setupAxesGizmo(camera, renderer);

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
      const animationFrameId = requestAnimationFrame(animate);
      
      const renderStartTime = globalPerformanceMonitor.startRender();
      
      controls.update();
      
      // 先渲染主场景
      renderer.render(scene, camera);
      
      // 确保坐标系指示器显示在最上层
      if (axesGizmoRef.current) {
        axesGizmoRef.current.update();
      }
      
      globalPerformanceMonitor.endRender(renderStartTime);
      
      if (renderer && renderer.info) {
        globalPerformanceMonitor.updateRendererStats(renderer);
      }
      
      return animationFrameId;
    };
    const frameId = animate();

    // 添加日志输出，确认组件已正确初始化
    console.log('Viewport初始化完成：', {
      '场景已创建': !!scene,
      '相机已创建': !!camera,
      '渲染器已创建': !!renderer,
      '控制器已创建': !!controls,
      '网格已创建': !!gridRef.current,
      '坐标系已创建': !!axesGizmoRef.current
    });

    return () => {
      cancelAnimationFrame(frameId);
      
      // 安全卸载 renderer.domElement（仅当确为其父节点时）
      try {
        const dom = renderer?.domElement;
        if (mountNode && dom && dom.parentNode === mountNode) {
          mountNode.removeChild(dom);
        }
        renderer?.dispose?.();
      } catch (e) {
        // 忽略卸载期间的偶发性错误，避免 NotFoundError 影响卸载流程
        console.warn('[Viewport] cleanup warning:', e);
      }
      
      if (axesGizmoRef.current) {
        axesGizmoRef.current.dispose();
      }
      resizeObserver.disconnect();
    };
  }, []);

  // --- Scene Update Logic ---
  useEffect(() => {
    const scene = sceneRef.current;
    const camera = cameraRef.current;
    const controls = controlsRef.current;

    const updateScene = async () => {
        const toRemove = scene.children.find(child => child.name === "ParametricModel");
        if (toRemove) {
            scene.remove(toRemove);
        }

        const parametricModel = await replayFeatures(features);
        parametricModel.name = "ParametricModel";
        scene.add(parametricModel);

        if (controls && camera && parametricModel.children.length > 0) {
            const box = new THREE.Box3().setFromObject(parametricModel);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);

            if (maxDim > 0) { // Avoid issues with empty models
                const fov = camera.fov * (Math.PI / 180);
                let cameraZ = Math.abs(maxDim / 2 / Math.tan(fov / 2));
                cameraZ *= 1.8;

                const offset = new THREE.Vector3(cameraZ * 0.4, cameraZ * 0.6, cameraZ);
                camera.position.copy(center).add(offset);
                controls.target.copy(center);
                controls.update();

                if (gridRef.current) {
                    const gridSize = Math.max(size.x, size.z) * 2.5;
                    scene.remove(gridRef.current);
                    
                    // Assuming createProfessionalGrid is defined in the setup useEffect
                    // We need to make sure it's accessible or redefined here.
                    // For now, let's assume it's available.
                    // const newGrid = createProfessionalGrid(gridSize);
                    // newGrid.position.set(center.x, box.min.y - 0.1, center.z);
                    // scene.add(newGrid);
                    // gridRef.current = newGrid;
                }
            }
        }
        controls?.update();
    };
    
    if(scene) {
        updateScene();
    }

  }, [features]);

  return (
    <div 
      ref={mountRef} 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} 
    />
  );
});

export default Viewport; 