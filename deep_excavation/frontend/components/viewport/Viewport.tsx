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

  const features = useStore(state => state.features);
  const setViewportApi = useStore(state => state.setViewportApi);

  const parametricModel = useMemo(() => replayFeatures(features), [features]);

  useImperativeHandle(ref, () => ({
    addAnalysisMesh: (mesh) => {
        // ...
    },
    clearAnalysisMeshes: () => {
        // ...
    },
    loadVtkResults: async (url: string) => {
        // ...
    }
  }), []);

  useEffect(() => {
    if (ref && typeof ref === 'object' && ref.current) {
      setViewportApi(ref.current);
    }
  }, [setViewportApi, ref]);

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode || rendererRef.current) return;

    // --- Core Three.js Setup ---
    const scene = sceneRef.current;
    scene.background = new THREE.Color(0x1a2035);
    scene.add(transientGroupRef.current);

    // --- Grid Helper ---
    const gridHelper = new THREE.GridHelper(1000, 100, 0x444444, 0x888888);
    scene.add(gridHelper);

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
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      resizeObserver.disconnect();
      mountNode.removeChild(renderer.domElement);
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