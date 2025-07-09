/**
 * @file 项目核心三维视口组件 - 高性能版本
 * @author GeoStruct-5 Team
 * @date 2025-01-27
 * @description 使用高性能渲染器和抗抖动控制系统的三维视口组件。
 */
import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Raycaster, Vector2 } from 'three';
import { replayFeatures } from '../../core/replayEngine';
import { useStore, ViewportHandles, AppState, GeologicalLayer, ThreeJsGeometry } from '../../core/store';
import { createAxesGizmo, setupAxesGizmo } from './AxesGizmo';
import { globalResourceManager } from '../../core/resourceManager';
import { OptimizedRenderer } from '../../core/optimizedRenderer';
import { globalPerformanceMonitor } from '../../core/performanceMonitor';
import { EnhancedRenderer, createEnhancedRenderer } from '../../core/enhancedRenderer';
import { StabilizedControls, createStabilizedControls } from '../../core/stabilizedControls';
import { globalMaterialOptimizer } from '../../core/materialOptimizer';
import { globalRenderQualityManager } from '../../core/renderQualityManager';
import { BufferGeometry, Float32BufferAttribute, Color, DoubleSide, Scene, WebGLRenderer, PerspectiveCamera, GridHelper, Group } from 'three';

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
  const sceneRef = useRef<THREE.Scene>(new THREE.Scene());
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const transientGroupRef = useRef(new THREE.Group());
  const resultsGroupRef = useRef(new THREE.Group());
  const axesGizmoRef = useRef<THREE.Object3D>(); // <--- 类型变更为 Object3D
  const gridRef = useRef<THREE.Group | THREE.GridHelper>();
  const modelGroupRef = useRef<THREE.Group>(new THREE.Group());
  const [isProcessingModel, setIsProcessingModel] = useState(false);

  const features = useStore(state => state.features);
  const setViewportApi = useStore(state => state.setViewportApi);
  const geologicalModel = useStore((state: AppState) => state.geologicalModel);
  const setGeologicalModel = useStore((state: AppState) => state.setGeologicalModel);

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
    scene.background = new Color(0x1a2035);
    scene.add(transientGroupRef.current);
    scene.add(resultsGroupRef.current);
    scene.add(modelGroupRef.current); // <--- 关键修正：将地质模型组添加到场景中

    // --- Camera ---
    const camera = new PerspectiveCamera(75, mountNode.clientWidth / mountNode.clientHeight, 0.1, 20000); // Increased far plane
    camera.position.set(100, 150, 250);
    cameraRef.current = camera;

    // --- Renderer ---
    const renderer = new WebGLRenderer({ antialias: true });
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
    const gridHelper = new GridHelper(1000, 20, 0xffffff, 0x888888);
    gridHelper.material.opacity = 0.5;
    gridHelper.material.transparent = true;
    scene.add(gridHelper);
    gridRef.current = gridHelper;

    // --- Axes Gizmo ---
    const axesGizmo = setupAxesGizmo();
    scene.add(axesGizmo);
    axesGizmoRef.current = axesGizmo;

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
      
      // 更新坐标轴指示器的位置和旋转
      if (axesGizmoRef.current) {
        const vec = new THREE.Vector3();
        vec.set( -camera.position.x, -camera.position.y, -camera.position.z );
        vec.normalize();
        
        // 计算一个固定的偏移量，让它看起来在左下角
        const offset = new THREE.Vector3().subVectors(camera.position, controls.target);
        const distance = offset.length() * 0.1; // 距离因子，可调整
        
        const targetPosition = new THREE.Vector3()
            .copy(camera.position)
            .add(vec.multiplyScalar(distance));
        
        axesGizmoRef.current.position.copy(targetPosition);
        axesGizmoRef.current.quaternion.copy(camera.quaternion);
      }
      
      // 渲染主场景
      renderer.render(scene, camera);
      
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
      if (mountNode && renderer.domElement) {
        mountNode.removeChild(renderer.domElement);
      }
      // dispose 不再需要，因为gizmo是场景的一部分，会被自动处理
      resizeObserver.disconnect();
    };
  }, []);

  // --- Scene Update Logic for Parametric Features ---
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
    };
    
    if(scene && features.length > 0) { // Only run if there are features
        updateScene();
    }

  }, [features]);

  // Effect for handling heavy model processing (geometry creation)
  useEffect(() => {
      if (!geologicalModel || !geologicalModel.layers.length || isProcessingModel) {
          return;
      }

      // Check if the model has geometry data. If not, it's a lightweight version, so we skip.
      const hasGeometry = geologicalModel.layers.some(layer => layer.geometry && layer.geometry.vertices.length > 0);
      if (!hasGeometry) {
          return;
      }
      
      setIsProcessingModel(true);
      
      console.log("Processing new geological model with geometry...", geologicalModel);

      // Clear existing layers
      while (modelGroupRef.current.children.length > 0) {
          modelGroupRef.current.remove(modelGroupRef.current.children[0]);
      }
      
      const newMeshes: THREE.Mesh[] = [];
      geologicalModel.layers.forEach((layer: GeologicalLayer) => {
          const { geometry, name, color, opacity } = layer;
          if (!geometry || !geometry.vertices || !geometry.faces) return;
          
          const bufferGeom = new BufferGeometry();
          bufferGeom.setAttribute('position', new Float32BufferAttribute(new Float32Array(geometry.vertices), 3));
          if (geometry.normals && geometry.normals.length > 0) {
              bufferGeom.setAttribute('normal', new Float32BufferAttribute(new Float32Array(geometry.normals), 3));
          } else {
              bufferGeom.computeVertexNormals();
          }
          bufferGeom.setIndex(new Float32BufferAttribute(new Uint32Array(geometry.faces), 1));
          
          const material = new THREE.MeshStandardMaterial({ // 关键修正: 使用对光照敏感的标准材质
              color: color,
              transparent: true,
              opacity: opacity,
              side: DoubleSide,
              wireframe: geologicalModel.wireframe,
          });
          
          const mesh = new THREE.Mesh(bufferGeom, material);
          mesh.name = name;
          mesh.visible = geologicalModel.visibility[name] ?? true;
          newMeshes.push(mesh);
          modelGroupRef.current.add(mesh);
      });

      console.log(`Added ${newMeshes.length} new meshes to the scene.`);

      // --- 关键修正：自动聚焦相机 ---
      const box = new THREE.Box3().setFromObject(modelGroupRef.current);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      
      const camera = cameraRef.current;
      const controls = controlsRef.current;

      if (camera && controls && maxDim > 0) {
          const fov = camera.fov * (Math.PI / 180);
          const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2));
          
          // 给一个舒适的距离，避免模型紧贴屏幕边缘
          const cameraZ = cameraDistance * 1.5;
          const newPosition = new THREE.Vector3(center.x, center.y, center.z + cameraZ);

          camera.position.copy(newPosition);
          controls.target.copy(center);
          controls.update();
      }
      // --- 修正结束 ---

      // Create a lightweight version of the model without geometry data for the store
      // This prevents re-triggering this heavy effect on simple property changes
      const lightweightModel = {
          ...geologicalModel,
          layers: geologicalModel.layers.map(l => ({ name: l.name, color: l.color, opacity: l.opacity, geometry: undefined })),
      };
      
      // Use a timeout to ensure the state update happens after the current render cycle
      setTimeout(() => {
          setGeologicalModel(lightweightModel);
          setIsProcessingModel(false);
          console.log("Replaced full model in store with lightweight version.");
      }, 0);

  }, [geologicalModel, setGeologicalModel]); // Dependency on the full model from the store

  // Effect for handling lightweight property updates (visibility, wireframe, etc.)
  useEffect(() => {
      if (!geologicalModel || isProcessingModel) return;
      
      const hasGeometry = geologicalModel.layers.some(layer => layer.geometry && layer.geometry.vertices.length > 0);
      if (hasGeometry) {
          // This effect should only run for lightweight models
          return;
      }

      console.log("Updating geological model properties (visibility, wireframe)...", geologicalModel);

      modelGroupRef.current.children.forEach(child => {
          if (child instanceof THREE.Mesh) {
              const layerName = child.name;
              const layerVisible = geologicalModel.visibility[layerName] ?? true;
              
              if (child.visible !== layerVisible) {
                  child.visible = layerVisible;
              }

              if (child.material instanceof THREE.MeshStandardMaterial) { // 关键修正: 同样检查标准材质
                  if (child.material.wireframe !== geologicalModel.wireframe) {
                      child.material.wireframe = geologicalModel.wireframe;
                  }
              }
          }
      });
  }, [geologicalModel, isProcessingModel]); // Dependency on the lightweight model and lock state

  useImperativeHandle(ref, () => ({
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

  return (
    <div 
      ref={mountRef} 
      style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }} 
    />
  );
});

export default Viewport; 