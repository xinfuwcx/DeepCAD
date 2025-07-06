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
    const api: ViewportHandles = {
      addAnalysisMesh: (mesh) => {
        const renderer = enhancedRendererRef.current;
        if (renderer) {
          mesh.userData.isAnalysisMesh = true;
          renderer.addToScene(mesh);
          analysisMeshesRef.current.push(mesh);
        }
      },
      clearAnalysisMeshes: () => {
        const renderer = enhancedRendererRef.current;
        if (renderer) {
          analysisMeshesRef.current.forEach(mesh => renderer.removeFromScene(mesh));
          analysisMeshesRef.current = [];
        }
      },
      loadVtkResults: async (url: string) => {
        const renderer = enhancedRendererRef.current;
        if (!renderer) return;
        
        if (resultsMeshRef.current) {
          renderer.removeFromScene(resultsMeshRef.current);
        }

        try {
          // 加载PyVista处理后的JSON数据
          const response = await fetch(url);
          const vizData = await response.json();
          
          if (vizData.points && vizData.cells) {
            // 创建Three.js几何体
            const geometry = new THREE.BufferGeometry();
            
            // 顶点数据
            const vertices = new Float32Array(vizData.points.flat());
            geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
            
            // 如果有标量场数据，设置颜色
            if (vizData.scalar_fields && Object.keys(vizData.scalar_fields).length > 0) {
              const firstField = Object.keys(vizData.scalar_fields)[0];
              const scalarValues = vizData.scalar_fields[firstField];
              
              // 将标量值映射为颜色
              const colors = new Float32Array(scalarValues.length * 3);
              for (let i = 0; i < scalarValues.length; i++) {
                const normalized = (scalarValues[i] - Math.min(...scalarValues)) / 
                                  (Math.max(...scalarValues) - Math.min(...scalarValues));
                colors[i * 3] = normalized;     // R
                colors[i * 3 + 1] = 0.5;        // G  
                colors[i * 3 + 2] = 1 - normalized; // B
              }
              geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            }
            
            // 索引数据
            if (vizData.cells.length > 0) {
              const indices = new Uint32Array(vizData.cells.flat());
              geometry.setIndex(new THREE.BufferAttribute(indices, 1));
            }
            
            geometry.computeVertexNormals();
            
            const material = new THREE.MeshLambertMaterial({ 
              vertexColors: true,
              side: THREE.DoubleSide,
              wireframe: false
            });
            
            const mesh = new THREE.Mesh(geometry, material);
            mesh.name = "pyvista_results_mesh";
            
            resultsMeshRef.current = mesh;
            renderer.addToScene(mesh);
            
            console.log(`已加载PyVista结果: ${vizData.n_points}个节点, ${vizData.n_cells}个单元`);
          }
        } catch (error) {
          console.error('加载PyVista结果失败:', error);
        }
      }
    };
    return api;
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
    
    // 等待DOM完全渲染
    const initializeHighPerformanceRenderer = () => {
      // 强制获取真实的容器尺寸
      const rect = mountNode.getBoundingClientRect();
      const width = Math.max(rect.width, mountNode.clientWidth, 400);
      const height = Math.max(rect.height, mountNode.clientHeight, 300);
      
      console.log(`🚀 初始化高性能3D渲染器: ${width}x${height}, 容器位置:`, rect);
      
      // 如果尺寸异常，使用备用尺寸
      if (width <= 10 || height <= 10) {
        console.warn(`⚠️ 检测到异常视口尺寸: ${width}x${height}，使用备用尺寸`);
        const parentRect = mountNode.parentElement?.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (parentRect && parentRect.width > 10 && parentRect.height > 10) {
          console.log(`📐 使用父元素尺寸: ${parentRect.width}x${parentRect.height}`);
          mountNode.style.width = `${parentRect.width}px`;
          mountNode.style.height = `${parentRect.height}px`;
        } else {
          // 使用窗口尺寸的70%作为备用
          const backupWidth = Math.floor(windowWidth * 0.7);
          const backupHeight = Math.floor(windowHeight * 0.7);
          console.log(`📐 使用备用尺寸: ${backupWidth}x${backupHeight}`);
          mountNode.style.width = `${backupWidth}px`;
          mountNode.style.height = `${backupHeight}px`;
        }
        
        // 重新获取尺寸
        const newRect = mountNode.getBoundingClientRect();
        const newWidth = Math.max(newRect.width, 400);
        const newHeight = Math.max(newRect.height, 300);
        console.log(`🔄 更新后的视口尺寸: ${newWidth}x${newHeight}`);
      }
      
      // 创建canvas元素
      const canvas = document.createElement('canvas');
      canvas.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        display: block !important;
        position: absolute !important;
        top: 0 !important;
        left: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: none !important;
        outline: none !important;
        box-sizing: border-box !important;
      `;
      
      // 确保容器样式正确
      mountNode.style.cssText = `
        width: 100% !important;
        height: 100% !important;
        position: relative !important;
        overflow: hidden !important;
        margin: 0 !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      `;
      
      mountNode.appendChild(canvas);
      
      // 创建高性能渲染器
      const enhancedRenderer = createEnhancedRenderer(canvas, HIGH_PERFORMANCE_CONFIG);
      enhancedRendererRef.current = enhancedRenderer;
      
      // 获取渲染器组件
      const renderer = enhancedRenderer.getRenderer();
      const scene = enhancedRenderer.getScene();
      const camera = enhancedRenderer.getCamera();
      
      // 设置传统引用（保持兼容性）
      rendererRef.current = renderer;
      sceneRef.current = scene;
      cameraRef.current = camera;
      
      // 调整渲染器大小 - 确保使用正确的尺寸
      const finalRect = mountNode.getBoundingClientRect();
      const finalWidth = Math.max(finalRect.width, 400);
      const finalHeight = Math.max(finalRect.height, 300);
      console.log(`📏 最终渲染器尺寸: ${finalWidth}x${finalHeight}`);
      enhancedRenderer.resize(finalWidth, finalHeight);
      
      // 🎨 集成质量管理器
      globalRenderQualityManager.setRenderer(renderer);
      globalRenderQualityManager.setScene(scene);
      globalRenderQualityManager.setCamera(camera);
      
      // 🎯 应用推荐的质量设置
      globalRenderQualityManager.applyRecommendedSettings();
      
      console.log(`🎨 质量管理器已集成，当前质量级别: ${globalRenderQualityManager.getCurrentSettings().qualityLevel}`);
      
      // 根据实际地质数据调整相机位置和观察目标
      const dataBounds = {
        centerX: 250,    // 500/2
        centerY: 250,    // 500/2  
        centerZ: 15,     // 30/2
        sizeX: 500,      
        sizeY: 500,      
        sizeZ: 30       
      };
      
      // 设置相机位置
      const maxSize = Math.max(dataBounds.sizeX, dataBounds.sizeY, dataBounds.sizeZ);
      const distance = maxSize * 1.5;
      
      enhancedRenderer.setCameraPosition(
        dataBounds.centerX + distance * 0.6,
        dataBounds.centerY + distance * 0.6,
        dataBounds.centerZ + distance * 0.8
      );
      
      enhancedRenderer.setCameraTarget(
        dataBounds.centerX,
        dataBounds.centerY,
        dataBounds.centerZ
      );
      
      // 创建稳定化控制器
      const stabilizedControls = createStabilizedControls(camera, canvas, STABILIZATION_CONFIG);
      stabilizedControlsRef.current = stabilizedControls;
      controlsRef.current = stabilizedControls.getControls();
      
      console.log(`🎮 高性能控制器配置: 距离=${distance.toFixed(1)}m, 目标=(${dataBounds.centerX.toFixed(1)}, ${dataBounds.centerY.toFixed(1)}, ${dataBounds.centerZ.toFixed(1)})`);
      
      // === Axes Gizmo Setup ===
      const axesScene = axesSceneRef.current;
      const axesCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 100);
      axesCamera.position.set(0, 0, 10);
      axesCameraRef.current = axesCamera;
      
      const axesGizmo = createAxesGizmo();
      axesScene.add(axesGizmo);
      
      // 添加专业级网格辅助，类似Fusion 360
      const gridSize = Math.max(dataBounds.sizeX, dataBounds.sizeY) * 1.5;
      const majorGridDivisions = 10;
      const minorGridDivisions = 50;
      
      // 主网格线
      const majorGridHelper = new THREE.GridHelper(gridSize, majorGridDivisions, '#888888', '#888888');
      majorGridHelper.name = "MajorGrid";
      majorGridHelper.position.set(
        dataBounds.centerX,
        dataBounds.centerZ - dataBounds.sizeZ * 0.1,
        dataBounds.centerY
      );
      majorGridHelper.rotateX(Math.PI / 2);
      enhancedRenderer.addToScene(majorGridHelper);
      
      // 次网格线
      const minorGridHelper = new THREE.GridHelper(gridSize, minorGridDivisions, '#444444', '#444444');
      minorGridHelper.name = "MinorGrid";
      minorGridHelper.position.set(
        dataBounds.centerX,
        dataBounds.centerZ - dataBounds.sizeZ * 0.1,
        dataBounds.centerY
      );
      minorGridHelper.rotateX(Math.PI / 2);
      enhancedRenderer.addToScene(minorGridHelper);
      
      console.log(`🌐 专业网格已设置: 尺寸=${gridSize.toFixed(1)}m, 主网格=${majorGridDivisions}格, 次网格=${minorGridDivisions}格`);

      // 高性能动画循环
      let animationId: number;
      let frameCount = 0;
      const animate = () => {
        animationId = requestAnimationFrame(animate);
        
        const mountNode = mountRef.current;
        const enhancedRenderer = enhancedRendererRef.current;
        const stabilizedControls = stabilizedControlsRef.current;
        const axesCameraInstance = axesCameraRef.current;
        
        if (mountNode && enhancedRenderer && stabilizedControls && axesCameraInstance) {
          // 开始性能监控
          const renderStartTime = globalPerformanceMonitor.startRender();
          
          // 检查尺寸变化
          const width = mountNode.clientWidth;
          const height = mountNode.clientHeight;
          const renderer = enhancedRenderer.getRenderer();
          const camera = enhancedRenderer.getCamera();
          
          const needsResize = renderer.domElement.width !== width || renderer.domElement.height !== height;
          if (needsResize) {
            enhancedRenderer.resize(width, height);
          }
          
          // 更新稳定化控制器
          stabilizedControls.update();
          
          // 高性能渲染
          enhancedRenderer.render();
          
          // 渲染坐标轴小部件
          const gizmoSize = 80;
          renderer.clearDepth();
          renderer.setScissorTest(true);
          renderer.setScissor(0, 0, gizmoSize, gizmoSize);
          renderer.setViewport(0, 0, gizmoSize, gizmoSize);

          axesSceneRef.current.children[0].quaternion.copy(camera.quaternion).invert();
          renderer.render(axesSceneRef.current, axesCameraInstance);

          renderer.setScissorTest(false);
          renderer.setViewport(0, 0, width, height);
          
          // 结束性能监控
          globalPerformanceMonitor.endRender(renderStartTime);
          
          // 更新渲染器统计信息
          globalPerformanceMonitor.updateRendererStats(renderer);
          
          // 性能统计（每60帧输出一次）
          frameCount++;
          if (frameCount % 60 === 0) {
            const stats = enhancedRenderer.getPerformanceStats();
            const controlStats = stabilizedControls.getPerformanceStats();
            const qualityStats = globalRenderQualityManager.getPerformanceStats();
            
            console.log(`📊 综合性能统计: FPS=${stats.fps.toFixed(1)}, 帧时间=${stats.frameTime.toFixed(1)}ms, 平滑质量=${controlStats.smoothingQuality.toFixed(2)}, 渲染质量=${qualityStats.qualityLevel}`);
            
            // 🔄 自适应质量调整
            globalRenderQualityManager.adaptiveQualityAdjustment();
            
            // 🎨 材质统计
            const materialStats = globalMaterialOptimizer.getMaterialStats();
            if (frameCount % 300 === 0) { // 每5秒输出一次材质统计
              console.log(`🎨 材质统计: 缓存材质=${materialStats.cachedMaterials}, 内存使用=${(materialStats.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
            }
          }
        }
      };
      animate();

      // 使用ResizeObserver监听尺寸变化
      const resizeObserver = new ResizeObserver((entries) => {
        if (!enhancedRenderer || !mountNode) return;
        
        const entry = entries[0];
        const { width: newWidth, height: newHeight } = entry.contentRect;
        
        if (newWidth > 10 && newHeight > 10) {
          enhancedRenderer.resize(newWidth, newHeight);
          console.log(`🖼️ 高性能视口尺寸更新: ${newWidth}x${newHeight}`);
        }
      });
      resizeObserver.observe(mountNode);

      // Add the group for transient objects to the scene
      transientGroupRef.current.name = "transientGeologyGroup";
      enhancedRenderer.addToScene(transientGroupRef.current);

      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
        resizeObserver.disconnect();
        
        // 清理高性能渲染器
        if (enhancedRenderer) {
          enhancedRenderer.dispose();
          enhancedRendererRef.current = undefined;
        }
        
        // 清理稳定化控制器
        if (stabilizedControls) {
          stabilizedControls.dispose();
          stabilizedControlsRef.current = undefined;
        }
        
        if (mountNode && canvas && mountNode.contains(canvas)) {
          mountNode.removeChild(canvas);
        }
        
        // 清理资源管理器中的资源
        globalResourceManager.cleanup();
        
        console.log('🧹 高性能视口已清理');
      };
    };
    
    // 延迟初始化以确保DOM完全加载
    const timeoutId = setTimeout(initializeHighPerformanceRenderer, 100);
    
    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // --- Scene Update Logic ---
  useEffect(() => {
    console.log('🔄 Scene Update Logic 触发，参数化模型状态:', {
      hasParametricModel: !!parametricModel,
      parametricModelChildren: parametricModel ? parametricModel.children.length : 0,
      selectedFeatureId: selectedFeatureId,
      featuresCount: features.length
    });
    
    const scene = sceneRef.current;
    
    // Clear previous models
    const objectsToRemove = scene.children.filter(child => child.userData.isParametricModel);
    console.log('🗑️ 清除之前的模型，数量:', objectsToRemove.length);
    scene.remove(...objectsToRemove);

    // Add new parametric model
    if (parametricModel) {
      console.log('➕ 添加新的参数化模型到场景:', {
        name: parametricModel.name,
        children: parametricModel.children.length,
        type: parametricModel.type
      });
      
      parametricModel.userData.isParametricModel = true;

      // Apply selection highlight
      parametricModel.traverse(child => {
          if (child instanceof THREE.Mesh && child.userData.featureId === selectedFeatureId) {
              // TODO: Use a better highlighting material or outline effect
              const highlightMaterial = (child.material as THREE.MeshStandardMaterial).clone();
              highlightMaterial.color.set(0x007bff);
              highlightMaterial.emissive.set(0x007bff);
              highlightMaterial.emissiveIntensity = 0.3;
              child.material = highlightMaterial;
          }
      });

      scene.add(parametricModel);
      console.log('✅ 参数化模型已添加到场景，当前场景子对象数量:', scene.children.length);
      
      // 模型添加后应用优化
      if (rendererRef.current) {
        // 这里需要根据新的渲染器逻辑来应用优化
      }
    } else {
      console.log('⚠️ 没有参数化模型需要添加');
    }

  }, [parametricModel, selectedFeatureId, features.length]);

  // --- Scene Update Logic for Transient Geological Model ---
  useEffect(() => {
    const transientGroup = transientGroupRef.current;
    
    while (transientGroup.children.length > 0) {
        transientGroup.remove(transientGroup.children[0]);
    }

    if (transientObjects && transientObjects.length > 0) {
        transientObjects.forEach(obj => {
            transientGroup.add(obj); 
        });
    }
  }, [transientObjects]);

  // Effect for handling picking mode and general mouse interactions
  useEffect(() => {
    const mountNode = mountRef.current;
    const controls = controlsRef.current;
    if (!mountNode || !controls) return;

    const handleMouseClick = (event: MouseEvent) => {
      // 左键点击处理picking
      if (event.button === 0 && pickingState.isActive) {
        const rect = mountNode.getBoundingClientRect();
        const mouse = new Vector2();
        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        const raycaster = new Raycaster();
        const camera = cameraRef.current;
        if (!camera) return;

        raycaster.setFromCamera(mouse, camera);
        
        const intersectionPoint = new THREE.Vector3();
        raycaster.ray.intersectPlane(pickingPlane, intersectionPoint);

        if (intersectionPoint) {
          // Round to a reasonable precision
          const roundedPoint = {
            x: parseFloat(intersectionPoint.x.toFixed(2)),
            y: parseFloat(intersectionPoint.y.toFixed(2)),
            z: parseFloat(intersectionPoint.z.toFixed(2)),
          };
          executePick(roundedPoint);
        }
      }
    };

    const handleContextMenu = (event: MouseEvent) => {
      // 阻止默认右键菜单
      event.preventDefault();
      
      // 右键点击退出所有编辑模式
      console.log('右键点击，退出所有编辑模式');
      exitEditMode();
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        console.log('ESC键，退出所有编辑模式');
        exitEditMode();
      }
    };

    // 添加事件监听器
    mountNode.addEventListener('click', handleMouseClick);
    mountNode.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('keydown', handleKeyDown);

    // 根据picking状态调整UI和控制器
    if (pickingState.isActive) {
      mountNode.style.cursor = 'crosshair';
      controls.enabled = false; // Disable camera controls while picking
      console.log('进入picking模式，禁用相机控制');
    } else {
      mountNode.style.cursor = 'auto';
      controls.enabled = true; // Enable camera controls
    }

    return () => {
      mountNode.removeEventListener('click', handleMouseClick);
      mountNode.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [pickingState.isActive, executePick, stopPicking, exitEditMode, pickingPlane]);

  return (
    <div 
      ref={mountRef} 
      className="viewport-container"
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #1a1f2e 0%, #16213e 100%)',
        borderRadius: 0,
        boxSizing: 'border-box'
      }}
    />
  );
});

export default Viewport; 