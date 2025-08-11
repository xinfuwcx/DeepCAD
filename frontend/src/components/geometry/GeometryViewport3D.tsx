import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Space, Typography, message, Spin } from 'antd';
import { ModernAxisHelper } from '../3d/core/ModernAxisHelper';
import '../../styles/viewport-force-dark.css';

const { Text } = Typography;

// 地质层数据接口
interface SoilLayer {
  id: string;
  name: string;
  topDepth: number;
  bottomDepth: number;
  soilType: string;
  color: string;
  opacity?: number;
}

// 钻孔数据接口  
interface BoreholeData {
  id: string;
  name: string;
  x: number;
  y: number;
  depth: number;
  layers: SoilLayer[];
}

// RBF地质建模API请求接口
interface GeologyModelingRequest {
  boreholes: Array<{
    id?: string;
    x: number;
    y: number;
    z: number;
    soil_type?: string;
    layer_id?: number;
    description?: string;
  }>;
  soil_layers?: Array<{
    layer_id: number;
    name: string;
    density: number;
    cohesion: number;
    friction_angle: number;
    permeability?: number;
  }>;
  interpolation_method: 'rbf' | 'inverse_distance' | 'ordinary_kriging';
  variogram_model: 'gaussian' | 'exponential' | 'spherical' | 'matern' | 'linear';
  grid_resolution: number;
  domain_expansion: [number, number];
  auto_fit_variogram: boolean;
  colormap: string;
  uncertainty_analysis: boolean;
}

interface GeometryViewport3DProps {
  boreholes?: BoreholeData[];
  excavations?: any[];
  supports?: any;
  currentStep?: number;
  className?: string;
  onAction?: (action: string) => void;
  onControlsChange?: (controls: any) => void;
}

export interface GeometryViewportRef {
  setShowGeology: (show: boolean) => void;
  setShowExcavation: (show: boolean) => void;
  setShowSupports: (show: boolean) => void;
  setShowBoreholes: (show: boolean) => void;
  handleSectioning: (axis: 'x' | 'y' | 'z') => void;
  updateSectionPosition: (position: number) => void;
  renderDXFSegments: (segments: Array<{ start: { x: number; y: number }; end: { x: number; y: number } }>) => void;
}

const GeometryViewport3D = forwardRef<GeometryViewportRef, GeometryViewport3DProps>(({
  boreholes = [],
  excavations = [],
  supports = {},
  currentStep = 0,
  className,
  onAction,
  onControlsChange
}, ref) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const frameRef = useRef<number | null>(null);
  const gltfLoaderRef = useRef<GLTFLoader>(new GLTFLoader());
  
  // 显示控制状态
  const [showGeology, setShowGeology] = useState(true);
  const [showExcavation, setShowExcavation] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const [showBoreholes, setShowBoreholes] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  
  // 剖切控制状态
  const [sectionPlane, setSectionPlane] = useState<{
    enabled: boolean;
    axis: 'x' | 'y' | 'z';
    position: number;
    min: number;
    max: number;
  }>({
    enabled: false,
    axis: 'x',
    position: 0,
    min: -250,
    max: 250
  });

  // RBF地质建模配置状态
  const [rbfConfig, setRbfConfig] = useState({
    interpolation_method: 'rbf' as const,
    variogram_model: 'exponential' as const,
    grid_resolution: 2.0,
    domain_expansion: [50.0, 50.0] as [number, number],
    auto_fit_variogram: true,
    colormap: 'terrain',
    uncertainty_analysis: true
  });

  // 模型组引用
  const geologicalModelRef = useRef<THREE.Group | null>(null);
  const boreholesGroupRef = useRef<THREE.Group | null>(null);
  const clippingPlanesRef = useRef<THREE.Plane[]>([]);

  // 暴露控制方法给父组件
  const dxfOverlayRef = useRef<THREE.Group | null>(null);

  useImperativeHandle(ref, () => ({
    setShowGeology,
    setShowExcavation,
    setShowSupports,
    setShowBoreholes,
    handleSectioning,
    updateSectionPosition,
    renderDXFSegments: (segments) => {
      const scene = sceneRef.current;
      const camera = cameraRef.current;
      if (!scene || !camera) return;

      if (dxfOverlayRef.current) {
        scene.remove(dxfOverlayRef.current);
        dxfOverlayRef.current.traverse(obj => {
          if ((obj as any).geometry) (obj as any).geometry.dispose();
          if ((obj as any).material) {
            const m = (obj as any).material; if (Array.isArray(m)) m.forEach(x => x.dispose()); else m.dispose();
          }
        });
        dxfOverlayRef.current = null;
      }
      if (!segments || segments.length === 0) return;

      // 计算边界与缩放
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      segments.forEach(s => {
        minX = Math.min(minX, s.start.x, s.end.x);
        minY = Math.min(minY, s.start.y, s.end.y);
        maxX = Math.max(maxX, s.start.x, s.end.x);
        maxY = Math.max(maxY, s.start.y, s.end.y);
      });
      const centerX = (minX + maxX) / 2;
      const centerY = (minY + maxY) / 2;
      const width = Math.max(1e-6, maxX - minX);
      const height = Math.max(1e-6, maxY - minY);
      const target = 200;
      const scale = Math.min(target / width, target / height);

      const group = new THREE.Group();
      const mat = new THREE.LineBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 1, depthTest: false, depthWrite: false });
      segments.forEach(seg => {
        const pts = [
          new THREE.Vector3((seg.start.x - centerX) * scale, 0.2, (seg.start.y - centerY) * scale),
          new THREE.Vector3((seg.end.x - centerX) * scale, 0.2, (seg.end.y - centerY) * scale)
        ];
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(g, mat);
        line.renderOrder = 999;
        group.add(line);
      });
      scene.add(group);
      dxfOverlayRef.current = group;

      // 相机对准
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        const maxDim = Math.max(width, height) * scale;
        camera.position.set(maxDim * 1.2, maxDim * 0.9, maxDim * 1.2);
        camera.lookAt(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }));

  // 初始化Three.js场景
  useEffect(() => {
    if (!mountRef.current || isInitialized) return;

    const initScene = () => {
      const container = mountRef.current!;
      
      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x1a1a1a);
      scene.fog = new THREE.Fog(0x1a1a1a, 100, 2000);
      sceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        75,
        container.clientWidth / container.clientHeight,
        0.1,
        10000
      );
      camera.position.set(300, 200, 300);
      camera.lookAt(0, 0, 0);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        alpha: true
      });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.2;
      rendererRef.current = renderer;
      
      container.appendChild(renderer.domElement);

      // 创建控制器
      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.maxPolarAngle = Math.PI / 2;
      controlsRef.current = controls;

      // 添加光照系统
      setupLighting(scene);

      // 添加坐标系
      const axisHelper = new ModernAxisHelper({ size: 100 });
      scene.add(axisHelper);

      // 添加网格
      const gridHelper = new THREE.GridHelper(1000, 50, 0x444444, 0x222222);
      gridHelper.position.y = -15;
      scene.add(gridHelper);

      // 初始化模型组
      geologicalModelRef.current = new THREE.Group();
      geologicalModelRef.current.name = 'GeologicalModel';
      scene.add(geologicalModelRef.current);

      boreholesGroupRef.current = new THREE.Group();
      boreholesGroupRef.current.name = 'Boreholes';
      scene.add(boreholesGroupRef.current);

      // 启动渲染循环
      startRenderLoop();

      setIsInitialized(true);
    };

    initScene();

    return () => {
      cleanup();
    };
  }, []);

  // 设置光照系统
  const setupLighting = (scene: THREE.Scene) => {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);

    // 主光源
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // 补光
    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-50, 50, -50);
    scene.add(fillLight);
  };

  // 启动渲染循环
  const startRenderLoop = () => {
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 清理资源
  const cleanup = () => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
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
      console.warn('[GeometryViewport3D] cleanup warning:', e);
    } finally {
      rendererRef.current = null;
    }
    
    if (controlsRef.current) {
      controlsRef.current.dispose();
      controlsRef.current = null;
    }
  };

  // 加载CSV数据并生成地质模型
  const loadCSVDataAndGenerateModel = async () => {
    try {
      setIsLoading(true);
      message.info('正在加载钻孔数据...');

      // 从CSV文件加载钻孔数据
      const response = await fetch('http://localhost:8084/data/boreholes_with_undulation_fixed.csv');
      const csvText = await response.text();
      
      // 解析CSV数据
      const lines = csvText.trim().split('\n');
      const headers = lines[0].split(',');
      
      const boreholeMap = new Map<string, any>();
      
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const boreholeId = values[0];
        const x = parseFloat(values[1]);
        const y = parseFloat(values[2]);
        const groundElevation = parseFloat(values[3]);
        const depth = parseFloat(values[4]);
        const layerId = parseInt(values[5]);
        const layerName = values[6];
        const topDepth = parseFloat(values[7]);
        const bottomDepth = parseFloat(values[8]);
        const soilType = values[9];
        const colorCode = values[10];

        if (!boreholeMap.has(boreholeId)) {
          boreholeMap.set(boreholeId, {
            id: boreholeId,
            x,
            y,
            z: groundElevation - depth, // 地面标高 - 钻孔深度 = 钻孔底部标高
            soil_type: soilType,
            layer_id: layerId,
            description: `钻孔${boreholeId}`,
            layers: []
          });
        }

        // 添加土层信息
        boreholeMap.get(boreholeId).layers.push({
          layer_id: layerId,
          name: layerName,
          top_depth: topDepth,
          bottom_depth: bottomDepth,
          soil_type: soilType,
          color: colorCode
        });
      }

      const boreholes = Array.from(boreholeMap.values());
      message.info(`成功解析 ${boreholes.length} 个钻孔数据`);

      // 渲染钻孔点
      renderBoreholes(boreholes);

      // 调用RBF后端生成地质模型
      await generateRBFModel(boreholes);

    } catch (error) {
      console.error('加载数据失败:', error);
      message.error('数据加载失败，请检查文件路径');
    } finally {
      setIsLoading(false);
    }
  };

  // 渲染钻孔点
  const renderBoreholes = (boreholes: any[]) => {
    if (!boreholesGroupRef.current) return;

    // 清除现有钻孔
    boreholesGroupRef.current.clear();

    // 创建钻孔几何体
    const geometry = new THREE.SphereGeometry(2, 16, 12);
    
    boreholes.forEach((borehole, index) => {
      // 根据土层类型设置颜色
      const colors = [
        0xff4444, 0x44ff44, 0x4444ff, 0xffff44,
        0xff44ff, 0x44ffff, 0xff8844, 0x8844ff
      ];
      const color = colors[index % colors.length];

      const material = new THREE.MeshLambertMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.8
      });
      
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(borehole.x, borehole.z, borehole.y);
      mesh.name = `Borehole_${borehole.id}`;
      
      boreholesGroupRef.current!.add(mesh);
    });

    message.success(`已渲染 ${boreholes.length} 个钻孔点`);
  };

  // 调用RBF后端生成专业地质模型
  const generateRBFModel = async (boreholes: any[]) => {
    try {
      message.info('正在使用RBF插值生成专业地质模型...');

      const requestData: GeologyModelingRequest = {
        boreholes: boreholes.map(bh => ({
          id: bh.id,
          x: bh.x,
          y: bh.y,
          z: bh.z,
          soil_type: bh.soil_type,
          layer_id: bh.layer_id,
          description: bh.description
        })),
        ...rbfConfig
      };

      const response = await fetch('http://localhost:8084/api/geology/rbf-geology', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || '地质建模失败');
      }

      const result = await response.json();
      message.success('RBF地质建模完成');

      // 加载生成的glTF模型
      await loadGLTFModel(result.gltf_url);

    } catch (error) {
      console.error('RBF建模失败:', error);
      message.error(`地质建模失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  // 加载glTF地质模型
  const loadGLTFModel = async (gltfUrl: string) => {
    try {
      message.info('正在加载3D地质模型...');

      const gltf = await new Promise<any>((resolve, reject) => {
        gltfLoaderRef.current.load(
          gltfUrl,
          (gltf) => resolve(gltf),
          (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            console.log(`模型加载进度: ${percent}%`);
          },
          (error) => reject(error)
        );
      });

      if (!geologicalModelRef.current) return;

      // 清除现有模型
      geologicalModelRef.current.clear();

      // 添加新模型
      const model = gltf.scene;
      model.name = 'RBFGeologicalModel';
      
      // 设置模型材质
      model.traverse((child: any) => {
        if (child.isMesh) {
          child.material.transparent = true;
          child.material.opacity = 0.8;
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      geologicalModelRef.current.add(model);
      setModelLoaded(true);

      message.success('3D地质模型加载成功');

      // 自适应视角
      fitCameraToModel(model);

    } catch (error) {
      console.error('模型加载失败:', error);
      message.error('3D模型加载失败');
    }
  };

  // 自适应相机视角
  const fitCameraToModel = (model: THREE.Object3D) => {
    if (!cameraRef.current || !controlsRef.current) return;

    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    const distance = maxDim / (2 * Math.tan(fov / 2));

    const direction = new THREE.Vector3(1, 1, 1).normalize();
    const position = center.clone().add(direction.multiplyScalar(distance * 1.2));

    cameraRef.current.position.copy(position);
    cameraRef.current.lookAt(center);
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
  };

  // 通知父组件控制状态变化
  useEffect(() => {
    if (onControlsChange) {
      onControlsChange({
        showGeology,
        showExcavation,
        showSupports,
        showBoreholes,
        sectionPlane,
        isInitialized,
        modelLoaded,
        isLoading,
        rbfConfig
      });
    }
  }, [showGeology, showExcavation, showSupports, showBoreholes, sectionPlane, isInitialized, modelLoaded, isLoading, rbfConfig, onControlsChange]);

  // 响应显示状态变化
  useEffect(() => {
    if (boreholesGroupRef.current) {
      boreholesGroupRef.current.visible = showBoreholes;
    }
  }, [showBoreholes]);

  useEffect(() => {
    if (geologicalModelRef.current) {
      geologicalModelRef.current.visible = showGeology;
    }
  }, [showGeology]);

  // 处理剖切功能
  const handleSectioning = (axis: 'x' | 'y' | 'z') => {
    if (!sectionPlane.enabled) {
      setSectionPlane(prev => ({
        ...prev,
        enabled: true,
        axis: axis
      }));
      
      // 创建剖切平面
      const plane = new THREE.Plane();
      if (axis === 'x') plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 0, 0));
      if (axis === 'y') plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 0));
      if (axis === 'z') plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0));
      
      clippingPlanesRef.current = [plane];
      
      // 应用到所有材质
      if (rendererRef.current) {
        rendererRef.current.clippingPlanes = clippingPlanesRef.current;
        rendererRef.current.localClippingEnabled = true;
      }

      message.info(`已启用${axis.toUpperCase()}轴剖切`);
    } else {
      setSectionPlane(prev => ({ ...prev, enabled: false }));
      clippingPlanesRef.current = [];
      if (rendererRef.current) {
        rendererRef.current.clippingPlanes = [];
        rendererRef.current.localClippingEnabled = false;
      }
      message.info('已关闭剖切功能');
    }
  };

  // 更新剖切位置
  const updateSectionPosition = (position: number) => {
    setSectionPlane(prev => ({ ...prev, position }));
    
    if (clippingPlanesRef.current.length > 0) {
      const plane = clippingPlanesRef.current[0];
      if (sectionPlane.axis === 'x') {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(1, 0, 0), new THREE.Vector3(position, 0, 0));
      } else if (sectionPlane.axis === 'y') {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, position, 0));
      } else {
        plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, position));
      }
    }
  };

  // 监听2号专家各种模型生成事件
  useEffect(() => {
    const handleGeologyGeneration = (event: CustomEvent) => {
      const { params } = event.detail;
      console.log('收到2号专家地质建模事件:', params);
      loadCSVDataAndGenerateModel();
    };

    const handleAdvancedExcavationGeneration = (event: CustomEvent) => {
      const { geometryResult, qualityMetrics, performanceMetrics, algorithmInfo } = event.detail;
      console.log('收到2号专家高级开挖模型事件:', event.detail);
      
      // 显示专家算法信息
      message.info({
        content: (
          <div>
            <div>🎯 {algorithmInfo.expertId}算法处理完成</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              版本: {algorithmInfo.algorithmVersion} | 
              处理时间: {algorithmInfo.processingTime}ms
            </div>
          </div>
        ),
        duration: 4
      });

      // 如果有质量评估结果，显示专业分析
      if (qualityMetrics) {
        setTimeout(() => {
          message.success({
            content: (
              <div>
                <div>📊 几何质量评估完成</div>
                <div style={{ fontSize: '11px', marginTop: '2px' }}>
                  网格质量: {qualityMetrics.averageElementQuality?.toFixed(3)} | 
                  精度等级: {qualityMetrics.accuracyLevel || 'High'}
                </div>
              </div>
            ),
            duration: 6
          });
        }, 1000);
      }

      // 加载开挖几何到3D场景（这里可以扩展具体的几何加载逻辑）
      if (geometryResult && geometryResult.gltfUrl) {
        loadGLTFModel(geometryResult.gltfUrl);
      }
    };

    const handleSupportStructureGeneration = (event: CustomEvent) => {
      const { structureData, analysisResult } = event.detail;
      console.log('收到2号专家支护结构生成事件:', event.detail);
      
      message.success({
        content: (
          <div>
            <div>🏗️ 支护结构生成完成</div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              结构类型: {structureData?.type || '综合支护'} | 
              安全系数: {analysisResult?.safetyFactor?.toFixed(2) || 'N/A'}
            </div>
          </div>
        ),
        duration: 5
      });
    };

    // 注册事件监听器
    window.addEventListener('generateGeologyModel', handleGeologyGeneration as EventListener);
    window.addEventListener('advancedExcavationModelGenerated', handleAdvancedExcavationGeneration as EventListener);
    window.addEventListener('supportStructureGenerated', handleSupportStructureGeneration as EventListener);
    
    return () => {
      window.removeEventListener('generateGeologyModel', handleGeologyGeneration as EventListener);
      window.removeEventListener('advancedExcavationModelGenerated', handleAdvancedExcavationGeneration as EventListener);
      window.removeEventListener('supportStructureGenerated', handleSupportStructureGeneration as EventListener);
    };
  }, []);

  // 处理窗口大小调整
  useEffect(() => {
    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current) return;
      
      const container = mountRef.current;
      cameraRef.current.aspect = container.clientWidth / container.clientHeight;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div ref={mountRef} className="w-full h-full" />
      
      {/* 加载状态 */}
      {isLoading && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-3">
            <Spin />
            <Text className="text-white">正在生成地质模型...</Text>
          </div>
        </div>
      )}
      

      {/* 状态指示器 */}
      <div className="absolute bottom-4 left-4">
        <Space>
          <div className={`px-2 py-1 rounded text-xs ${isInitialized ? 'bg-green-600' : 'bg-red-600'} text-white`}>
            场景: {isInitialized ? '已初始化' : '初始化中'}
          </div>
          <div className={`px-2 py-1 rounded text-xs ${modelLoaded ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
            模型: {modelLoaded ? '已加载' : '未加载'}
          </div>
        </Space>
      </div>
    </div>
  );
});

GeometryViewport3D.displayName = 'GeometryViewport3D';

export default GeometryViewport3D;