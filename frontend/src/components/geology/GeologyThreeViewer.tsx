import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button, Space, Slider, Select, Switch, Card, message, Spin } from 'antd';
import {
  PlayCircleOutlined,
  FullscreenOutlined,
  SettingOutlined,
  ReloadOutlined,
  CameraOutlined,
  EyeOutlined,
  BulbOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ModernAxisHelper } from '../3d/core/ModernAxisHelper';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
// import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';

const { Option } = Select;

interface GeologyThreeViewerProps {
  modelUrl?: string;
  boreholeData?: Array<{
    id: string;
    x: number;
    y: number;
    z: number;
    soil_type?: string;
    description?: string;
  }>;
  onModelLoad?: (mesh: THREE.Object3D) => void;
  onBoreholeSelect?: (borehole: any) => void;
}

interface ViewportSettings {
  showBoreholePosts: boolean;
  showGrid: boolean;
  showWireframe: boolean;
  terrainOpacity: number;
  lightIntensity: number;
  colorScheme: string;
  cameraSpeed: number;
  // 新增后处理设置
  enableSSAO: boolean;
  enableBloom: boolean;
  enableFXAA: boolean;
  ssaoRadius: number;
  ssaoIntensity: number;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
}

const GeologyThreeViewer: React.FC<GeologyThreeViewerProps> = ({
  modelUrl,
  boreholeData = [],
  onModelLoad,
  onBoreholeSelect
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const controlsRef = useRef<OrbitControls>();
  const gltfLoaderRef = useRef<GLTFLoader>();
  
  // 后处理引用
  const composerRef = useRef<EffectComposer>();
  const ssaoPassRef = useRef<SSAOPass>();
  const bloomPassRef = useRef<UnrealBloomPass>();
  // const fxaaPassRef = useRef<FXAAPass>(); // 暂时移除FXAA
  
  // 模型和钻孔相关
  const terrainMeshRef = useRef<THREE.Object3D>();
  const boreholeGroupRef = useRef<THREE.Group>();
  const raycasterRef = useRef<THREE.Raycaster>();
  const mouseRef = useRef<THREE.Vector2>();
  
  const [loading, setLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedBorehole, setSelectedBorehole] = useState<string | null>(null);
  
  const [viewportSettings, setViewportSettings] = useState<ViewportSettings>({
    showBoreholePosts: true,
    showGrid: true,
    showWireframe: false,
    terrainOpacity: 0.85,
    lightIntensity: 1.0,
    colorScheme: 'terrain',
    cameraSpeed: 1.0,
    // 后处理设置
    enableSSAO: true,
    enableBloom: true,
    enableFXAA: true,
    ssaoRadius: 0.1,
    ssaoIntensity: 0.5,
    bloomStrength: 0.3,
    bloomRadius: 0.8,
    bloomThreshold: 0.85
  });

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a1a2e);
    scene.fog = new THREE.Fog(0x1a1a2e, 200, 1000);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      60,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      2000
    );
    camera.position.set(100, 100, 100);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: "high-performance"
    });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    // 设置透明背景，让容器的Abaqus风格背景显示出来
    renderer.setClearColor(0x000000, 0);
    rendererRef.current = renderer;

    mountRef.current.appendChild(renderer.domElement);
    // 确保canvas不覆盖背景
    renderer.domElement.style.background = 'transparent';

    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 10;
    controls.maxDistance = 500;
    controls.maxPolarAngle = Math.PI / 2;
    controlsRef.current = controls;

    // 创建GLTF加载器
    gltfLoaderRef.current = new GLTFLoader();

    // 创建射线投射器和鼠标向量
    raycasterRef.current = new THREE.Raycaster();
    mouseRef.current = new THREE.Vector2();

    // 创建后处理管线
    const composer = new EffectComposer(renderer);
    composerRef.current = composer;

    // 基础渲染pass
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    // SSAO pass - 环境遮蔽
    const ssaoPass = new SSAOPass(scene, camera, mountRef.current.clientWidth, mountRef.current.clientHeight);
    // ssaoPass.radius = viewportSettings.ssaoRadius; // 属性在新版本中已更改
    ssaoPass.kernelRadius = 8;
    ssaoPass.minDistance = 0.005;
    ssaoPass.maxDistance = 0.1;
    ssaoPass.output = SSAOPass.OUTPUT.SSAO;
    ssaoPassRef.current = ssaoPass;
    if (viewportSettings.enableSSAO) {
      composer.addPass(ssaoPass);
    }

    // Bloom pass - 辉光效果
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current.clientWidth, mountRef.current.clientHeight),
      viewportSettings.bloomStrength,
      viewportSettings.bloomRadius,
      viewportSettings.bloomThreshold
    );
    bloomPassRef.current = bloomPass;
    if (viewportSettings.enableBloom) {
      composer.addPass(bloomPass);
    }

    // FXAA pass - 抗锯齿 (暂时禁用)
    // const fxaaPass = new FXAAPass();
    // fxaaPass.material.uniforms['resolution'].value.x = 1 / (mountRef.current.clientWidth * window.devicePixelRatio);
    // fxaaPass.material.uniforms['resolution'].value.y = 1 / (mountRef.current.clientHeight * window.devicePixelRatio);
    // fxaaPassRef.current = fxaaPass;
    // if (viewportSettings.enableFXAA) {
    //   composer.addPass(fxaaPass);
    // }

    // 输出pass
    const outputPass = new OutputPass();
    composer.addPass(outputPass);

    // 初始化光照
    setupLighting();

    // 初始化网格
    setupGrid();

    // 初始化钻孔组
    const boreholeGroup = new THREE.Group();
    boreholeGroup.name = 'boreholes';
    scene.add(boreholeGroup);
    boreholeGroupRef.current = boreholeGroup;

    // 鼠标交互
    const handleMouseClick = (event: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current!.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current!.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current!.setFromCamera(mouseRef.current!, cameraRef.current);
      
      // 检测钻孔点击
      if (boreholeGroupRef.current) {
        const intersects = raycasterRef.current!.intersectObjects(
          boreholeGroupRef.current.children, 
          true
        );
        
        if (intersects.length > 0) {
          const clickedBorehole = intersects[0].object.userData.borehole;
          if (clickedBorehole) {
            setSelectedBorehole(clickedBorehole.id);
            onBoreholeSelect?.(clickedBorehole);
            highlightBorehole(clickedBorehole.id);
          }
        }
      }
    };

    renderer.domElement.addEventListener('click', handleMouseClick);

    // 渲染循环
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      // 使用后处理管线渲染
      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      
      // 更新后处理管线尺寸
      if (composerRef.current) {
        composerRef.current.setSize(width, height);
      }
      
      // 更新FXAA分辨率 (暂时禁用)
      // if (fxaaPassRef.current) {
      //   fxaaPassRef.current.material.uniforms['resolution'].value.x = 1 / (width * window.devicePixelRatio);
      //   fxaaPassRef.current.material.uniforms['resolution'].value.y = 1 / (height * window.devicePixelRatio);
      // }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', handleMouseClick);
      
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      
      // 清理资源
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
      
      renderer.dispose();
    };
  }, []);

  // 设置光照
  const setupLighting = useCallback(() => {
    if (!sceneRef.current) return;

    // 清除现有光照
    const lightsToRemove: THREE.Light[] = [];
    sceneRef.current.traverse((child) => {
      if (child instanceof THREE.Light) {
        lightsToRemove.push(child);
      }
    });
    lightsToRemove.forEach(light => sceneRef.current!.remove(light));

    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6 * viewportSettings.lightIntensity);
    sceneRef.current.add(ambientLight);

    // 主方向光 (模拟太阳光)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0 * viewportSettings.lightIntensity);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    sceneRef.current.add(directionalLight);

    // 补充光 (模拟天空散射)
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x8B4513, 0.3 * viewportSettings.lightIntensity);
    sceneRef.current.add(hemisphereLight);
  }, [viewportSettings.lightIntensity]);

  // 设置网格
  const setupGrid = useCallback(() => {
    if (!sceneRef.current) return;

    // 移除现有网格
    const existingGrid = sceneRef.current.getObjectByName('grid');
    if (existingGrid) {
      sceneRef.current.remove(existingGrid);
    }

    if (viewportSettings.showGrid) {
      const gridHelper = new THREE.GridHelper(500, 50, 0xcccccc, 0xcccccc);
      gridHelper.name = 'grid';
      gridHelper.position.y = -50;
      gridHelper.material.opacity = 0.3;
      gridHelper.material.transparent = true;
      sceneRef.current.add(gridHelper);

      // 现代化坐标轴
      const modernAxis = new ModernAxisHelper({
        size: 20,
        lineWidth: 0.2,
        enableGlow: true,
        enableAnimation: false,
        enableInteraction: false,
        labelSize: 1.5,
        colors: {
          x: '#ff3333', // 红色 X轴
          y: '#33ff33', // 绿色 Y轴  
          z: '#3333ff'  // 蓝色 Z轴
        }
      });
      modernAxis.name = 'axes';
      modernAxis.position.y = -25;
      sceneRef.current.add(modernAxis);
    }
  }, [viewportSettings.showGrid]);

  // 加载地质模型
  const loadGeologyModel = useCallback(async (url: string) => {
    if (!sceneRef.current || !gltfLoaderRef.current) return;

    setLoading(true);
    
    try {
      // 移除现有地形模型
      if (terrainMeshRef.current) {
        sceneRef.current.remove(terrainMeshRef.current);
      }

      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoaderRef.current!.load(
          url,
          resolve,
          undefined,
          reject
        );
      });

      const model = gltf.scene;
      model.name = 'terrain';
      
      // 处理模型材质
      model.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = true;
          
          // 设置材质属性
          if (child.material instanceof THREE.Material) {
            child.material.transparent = true;
            child.material.opacity = viewportSettings.terrainOpacity;
            
            // 设置线框模式
            if (child.material instanceof THREE.MeshStandardMaterial || 
                child.material instanceof THREE.MeshPhongMaterial) {
              child.material.wireframe = viewportSettings.showWireframe;
            }
          }
        }
      });

      sceneRef.current.add(model);
      terrainMeshRef.current = model;
      
      // 调整相机位置
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      
      if (cameraRef.current && controlsRef.current) {
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = cameraRef.current.fov * (Math.PI / 180);
        const cameraDistance = Math.abs(maxDim / 2 / Math.tan(fov / 2)) * 1.5;
        
        cameraRef.current.position.set(
          center.x + cameraDistance,
          center.y + cameraDistance,
          center.z + cameraDistance
        );
        
        controlsRef.current.target.copy(center);
        controlsRef.current.update();
      }

      setModelLoaded(true);
      onModelLoad?.(model);
      message.success('地质模型加载成功');
      
    } catch (error) {
      console.error('地质模型加载失败:', error);
      message.error('地质模型加载失败');
    } finally {
      setLoading(false);
    }
  }, [viewportSettings.terrainOpacity, viewportSettings.showWireframe, onModelLoad]);

  // 渲染钻孔
  const renderBoreholes = useCallback(() => {
    if (!sceneRef.current || !boreholeGroupRef.current) return;

    // 清除现有钻孔
    boreholeGroupRef.current.clear();

    if (!viewportSettings.showBoreholePosts) return;

    boreholeData.forEach((borehole) => {
      // 钻孔柱
      const postGeometry = new THREE.CylinderGeometry(0.5, 0.5, Math.abs(borehole.z) + 5);
      const postMaterial = new THREE.MeshPhongMaterial({ 
        color: selectedBorehole === borehole.id ? 0xff6b6b : 0x1890ff,
        transparent: true,
        opacity: 0.8
      });
      const postMesh = new THREE.Mesh(postGeometry, postMaterial);
      postMesh.position.set(borehole.x, borehole.z / 2, borehole.y);
      postMesh.userData.borehole = borehole;
      postMesh.name = `borehole_post_${borehole.id}`;

      // 钻孔顶部标记
      const markerGeometry = new THREE.SphereGeometry(2);
      const markerMaterial = new THREE.MeshPhongMaterial({ 
        color: getSoilTypeColor(borehole.soil_type),
        emissive: 0x222222
      });
      const markerMesh = new THREE.Mesh(markerGeometry, markerMaterial);
      markerMesh.position.set(borehole.x, borehole.z + 3, borehole.y);
      markerMesh.userData.borehole = borehole;
      markerMesh.name = `borehole_marker_${borehole.id}`;

      boreholeGroupRef.current!.add(postMesh);
      boreholeGroupRef.current!.add(markerMesh);
    });
  }, [boreholeData, viewportSettings.showBoreholePosts, selectedBorehole]);

  // 获取土壤类型颜色
  const getSoilTypeColor = (soilType?: string): number => {
    const colors: { [key: string]: number } = {
      'clay': 0x8B4513,      // 棕色
      'sand': 0xF4A460,      // 沙色
      'silt': 0xD2B48C,      // 浅棕色
      'gravel': 0x708090,    // 灰色
      'rock': 0x2F4F4F,      // 深灰色
      'fill': 0xDEB887       // 浅棕色
    };
    return colors[soilType || 'clay'] || 0x00d9ff;
  };

  // 高亮钻孔
  const highlightBorehole = useCallback((boreholeId: string) => {
    if (!boreholeGroupRef.current) return;

    boreholeGroupRef.current.children.forEach((child) => {
      if (child instanceof THREE.Mesh) {
        const material = child.material as THREE.MeshPhongMaterial;
        if (child.userData.borehole?.id === boreholeId) {
          material.color.setHex(0xff6b6b); // 高亮颜色
          material.emissive.setHex(0x442222);
        } else {
          material.color.setHex(0x1890ff); // 默认颜色
          material.emissive.setHex(0x000000);
        }
      }
    });
  }, []);

  // 更新设置
  useEffect(() => {
    setupLighting();
  }, [setupLighting]);

  useEffect(() => {
    setupGrid();
  }, [setupGrid]);

  useEffect(() => {
    renderBoreholes();
  }, [renderBoreholes]);

  useEffect(() => {
    if (modelUrl) {
      loadGeologyModel(modelUrl);
    }
  }, [modelUrl, loadGeologyModel]);

  // 更新地形材质
  useEffect(() => {
    if (terrainMeshRef.current) {
      terrainMeshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.Material) {
          child.material.opacity = viewportSettings.terrainOpacity;
          if (child.material instanceof THREE.MeshStandardMaterial || 
              child.material instanceof THREE.MeshPhongMaterial) {
            child.material.wireframe = viewportSettings.showWireframe;
          }
        }
      });
    }
  }, [viewportSettings.terrainOpacity, viewportSettings.showWireframe]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 3D视口 - Abaqus风格 */}
      <div 
        ref={mountRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          background: 'linear-gradient(to bottom, #4a90e2 0%, #357abd 25%, #2c5aa0 50%, #1e3a5f 75%, #0f1419 100%)',
          border: '2px solid #2c5aa0',
          borderRadius: '8px',
          boxShadow: 'inset 0 2px 10px rgba(0, 0, 0, 0.3)',
          position: 'relative'
        }} 
      />

      {/* Abaqus风格坐标轴指示器 */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '60px',
        height: '60px',
        background: 'rgba(0, 0, 0, 0.3)',
        borderRadius: '6px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px solid rgba(74, 144, 226, 0.3)',
        color: '#4a90e2',
        fontSize: '12px',
        fontWeight: 'bold',
        zIndex: 10
      }}>
        <div style={{ textAlign: 'center' }}>
          <div>X</div>
          <div>Y Z</div>
        </div>
      </div>

      {/* Abaqus风格状态指示器 */}
      <div style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        background: 'rgba(0, 0, 0, 0.3)',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '10px',
        color: '#4a90e2',
        border: '1px solid rgba(74, 144, 226, 0.3)',
        zIndex: 10
      }}>
        <span>视图: 等轴测 | 渲染: 实时</span>
      </div>

      {/* 加载指示器 */}
      {loading && (
        <div className="glass-card" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          padding: '20px',
          borderRadius: '8px',
          color: 'var(--text-primary)',
          backdropFilter: 'blur(10px)'
        }}>
          <Spin size="large" />
          <div style={{ marginTop: '10px', color: 'var(--text-primary)' }}>加载地质模型中...</div>
        </div>
      )}

      {/* 3D视口控制面板 - 顶部中央偏右 */}
      <div className="glass-card" style={{
        position: 'absolute',
        top: '20px',
        left: '60%',
        transform: 'translateX(-50%)',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-color)',
        borderRadius: '16px',
        padding: '8px 16px',
        backdropFilter: 'blur(10px)',
        zIndex: 15
      }}>
        <Space size="small">
          {/* 快速控制按钮 - 水平排列 */}
          <Button 
            size="small"
            type={viewportSettings.showBoreholePosts ? "primary" : "default"}
            onClick={() => setViewportSettings(prev => ({...prev, showBoreholePosts: !prev.showBoreholePosts}))}
            style={{ fontSize: '11px' }}
          >
            🔍 钻孔
          </Button>
          
          <Button 
            size="small"
            type={viewportSettings.showGrid ? "primary" : "default"}
            onClick={() => setViewportSettings(prev => ({...prev, showGrid: !prev.showGrid}))}
            style={{ fontSize: '11px' }}
          >
            📐 网格
          </Button>
          
          <Button 
            size="small"
            type={viewportSettings.showWireframe ? "primary" : "default"}
            onClick={() => setViewportSettings(prev => ({...prev, showWireframe: !prev.showWireframe}))}
            style={{ fontSize: '11px' }}
          >
            🔲 线框
          </Button>
          
          <Button 
            icon={<SettingOutlined />}
            size="small"
            onClick={() => setSettingsVisible(!settingsVisible)}
            style={{ fontSize: '11px' }}
          >
            设置
          </Button>
        </Space>
        
        {/* 详细设置面板 - 展开时显示 */}
        {settingsVisible && (
          <div className="glass-card" style={{ 
            position: 'absolute',
            top: '45px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '300px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            padding: '12px',
            backdropFilter: 'blur(10px)'
          }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>地形透明度</span>
                <span style={{ color: 'var(--primary-color)', fontSize: '11px' }}>{Math.round(viewportSettings.terrainOpacity * 100)}%</span>
              </div>
              <Slider
                min={0.1}
                max={1.0}
                step={0.1}
                value={viewportSettings.terrainOpacity}
                onChange={(value) => setViewportSettings(prev => ({...prev, terrainOpacity: value}))}
              />
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--text-primary)', fontSize: '12px' }}>光照强度</span>
                <span style={{ color: 'var(--primary-color)', fontSize: '11px' }}>{Math.round(viewportSettings.lightIntensity * 100)}%</span>
              </div>
              <Slider
                min={0.2}
                max={2.0}
                step={0.1}
                value={viewportSettings.lightIntensity}
                onChange={(value) => setViewportSettings(prev => ({...prev, lightIntensity: value}))}
              />
            </Space>
          </div>
        )}
      </div>

      {/* 状态信息 - 底部中央 */}
      {modelLoaded && (
        <div className="glass-card" style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'var(--bg-glass)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '8px 16px',
          color: 'var(--primary-color)',
          fontSize: '12px',
          zIndex: 15
        }}>
          🌍 地质模型已加载 • 钻孔: {boreholeData.length}个
          {selectedBorehole && ` • 选中: ${selectedBorehole}`}
        </div>
      )}
    </div>
  );
};

export default GeologyThreeViewer;