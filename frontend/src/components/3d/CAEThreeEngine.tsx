/**
 * CAE专业Three.js渲染引擎
 * 1号架构师 - 为CAE应用优化的完整Three.js配置
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader.js';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { GeometryData, MaterialZone } from '../../core/InterfaceProtocol';
import { LODManager } from './performance/LODManager.simple';

// CAE特定材质类型
export enum CAEMaterialType {
  SOLID = 'solid',
  WIREFRAME = 'wireframe',
  TRANSPARENT = 'transparent',
  MESH_EDGES = 'mesh_edges',
  STRESS_VISUALIZATION = 'stress_visualization',
  DISPLACEMENT = 'displacement'
}

// CAE交互模式
export enum CAEInteractionMode {
  ORBIT = 'orbit',         // 轨道浏览
  SELECT = 'select',       // 选择模式
  MEASURE = 'measure',     // 测量模式
  SECTION = 'section',     // 剖面模式
  TRANSFORM = 'transform'  // 变换模式
}

// CAE视图预设
export enum CAEViewPreset {
  ISOMETRIC = 'isometric',
  FRONT = 'front',
  BACK = 'back',
  LEFT = 'left',
  RIGHT = 'right',
  TOP = 'top',
  BOTTOM = 'bottom'
}

interface CAEThreeEngineProps {
  onModelLoad?: (model: THREE.Object3D) => void;
  onSelection?: (objects: THREE.Object3D[]) => void;
  onMeasurement?: (measurement: { distance: number; points: THREE.Vector3[] }) => void;
  initialGeometry?: GeometryData[];
  materialZones?: MaterialZone[];
  className?: string;
  style?: React.CSSProperties;
  
  // 计算分析相关props
  mode?: string;
  onModelSelect?: (objects: any[]) => void;
  showStressVisualization?: boolean;
  showDeformationAnimation?: boolean;
  computationResults?: any;
  analysisProgress?: number;
}

export class CAEThreeEngine {
  // 核心Three.js组件
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  public orbitControls: OrbitControls;
  public transformControls: TransformControls;

  // CAE专用组件
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedObjects: THREE.Object3D[] = [];
  private interactionMode: CAEInteractionMode = CAEInteractionMode.ORBIT;
  
  // 加载器
  private stlLoader: STLLoader = new STLLoader();
  private objLoader: OBJLoader = new OBJLoader();
  private plyLoader: PLYLoader = new PLYLoader();

  // 材质库
  private materials: Map<string, THREE.Material> = new Map();
  
  // 性能优化组件
  private lodManager: LODManager;
  private performanceStats = {
    frameTime: 0,
    fps: 60,
    triangles: 0,
    drawCalls: 0
  };
  
  // 事件回调
  private onSelectionCallback?: (objects: THREE.Object3D[]) => void;
  private onMeasurementCallback?: (measurement: any) => void;

  constructor(container: HTMLElement, props: Partial<CAEThreeEngineProps> = {}) {
    console.log('🚀 CAE Three.js引擎构造函数开始...');
    
    if (!container) {
      throw new Error('容器元素为空');
    }
    
    console.log('容器有效，尺寸:', container.offsetWidth, 'x', container.offsetHeight);
    
    // 初始化场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a0a);

    // 初始化相机
    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.01,
      10000
    );
    this.camera.position.set(10, 10, 10);
    this.camera.lookAt(0, 0, 0);
    console.log('📷 相机已设置 - 位置:', this.camera.position, '目标: (0,0,0)');

    // 初始化渲染器 - CAE优化配置
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false
    });

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;

    // 启用扩展
    this.renderer.capabilities.logarithmicDepthBuffer = false;
    
    container.appendChild(this.renderer.domElement);

    // 初始化控制器
    this.setupControls();

    // 初始化光照
    this.setupLighting();

    // 初始化材质库
    this.initializeMaterials();

    // 初始化LOD管理器
    this.lodManager = new LODManager(this.scene, this.camera, {
      enableAutoLOD: true,
      maxDistance: 200,
      qualityLevels: 4,
      reductionFactor: 0.6,
      updateFrequency: 100,
      frustumCulling: true,
      adaptiveQuality: true
    });

    // 设置事件监听
    this.setupEventListeners();

    // 设置回调
    this.onSelectionCallback = props.onSelection;
    this.onMeasurementCallback = props.onMeasurement;

    // 添加基础场景元素
    this.addSceneHelpers();
    
    // 添加测试几何体
    this.addTestGeometry();
    
    // 确保控制器启用
    this.orbitControls.enabled = true;
    this.setInteractionMode(CAEInteractionMode.ORBIT);

    ComponentDevHelper.logDevTip('CAE Three.js引擎初始化完成 - 控制器已启用');
    
    // 立即启动渲染循环
    this.startRenderLoop();
  }

  // 启动渲染循环
  public startRenderLoop(): void {
    let frameCount = 0;
    const animate = () => {
      this.render();
      frameCount++;
      // 每300帧（5秒）打印一次调试信息，减少性能开销
      if (frameCount % 300 === 0) {
        console.log(`🎬 渲染帧 #${frameCount}, 场景子对象数量: ${this.scene.children.length}`);
      }
      requestAnimationFrame(animate);
    };
    animate();
    console.log('🎬 CAE引擎渲染循环已启动');
  }

  // 设置控制器
  private setupControls(): void {
    // 轨道控制器
    this.orbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    
    // 基础控制配置
    this.orbitControls.enabled = true;
    this.orbitControls.enableDamping = true;
    this.orbitControls.dampingFactor = 0.05;
    this.orbitControls.screenSpacePanning = false;
    this.orbitControls.maxPolarAngle = Math.PI;
    this.orbitControls.minDistance = 0.1;
    this.orbitControls.maxDistance = 1000;
    
    // 鼠标按钮配置
    this.orbitControls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };
    
    // 触摸配置
    this.orbitControls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    
    // 启用所有交互
    this.orbitControls.enableRotate = true;
    this.orbitControls.enableZoom = true;
    this.orbitControls.enablePan = true;
    
    // 旋转速度配置
    this.orbitControls.rotateSpeed = 1.0;
    this.orbitControls.zoomSpeed = 1.2;
    this.orbitControls.panSpeed = 0.8;
    
    // 自动旋转禁用
    this.orbitControls.autoRotate = false;

    // 变换控制器
    this.transformControls = new TransformControls(this.camera, this.renderer.domElement);
    this.transformControls.addEventListener('dragging-changed', (event) => {
      this.orbitControls.enabled = !event.value;
    });
    
    // 确保TransformControls正确添加到场景
    try {
      this.scene.add(this.transformControls);
      console.log('✅ TransformControls已成功添加到场景');
    } catch (error) {
      console.warn('⚠️ TransformControls添加失败，将跳过:', error);
      // 如果添加失败，我们仍然可以继续，只是没有变换控制功能
    }
    
    console.log('✅ 3D控制器已设置 - 支持鼠标旋转、缩放、平移');
  }

  // 设置专业光照系统
  private setupLighting(): void {
    // 移除现有光源
    const lights = this.scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => this.scene.remove(light));

    // 环境光 - 提供基础照明
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);

    // 主方向光 - 模拟太阳光
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.0);
    mainLight.position.set(50, 50, 25);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.setScalar(2048);
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 200;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    this.scene.add(mainLight);

    // 补光 - 减少阴影过重
    const fillLight = new THREE.DirectionalLight(0x6666ff, 0.3);
    fillLight.position.set(-25, 25, 25);
    this.scene.add(fillLight);

    // 底部补光 - 照亮模型底部
    const bottomLight = new THREE.DirectionalLight(0xffffff, 0.2);
    bottomLight.position.set(0, -50, 0);
    this.scene.add(bottomLight);
  }

  // 初始化CAE专用材质库
  private initializeMaterials(): void {
    // 标准实体材质
    this.materials.set('solid', new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      metalness: 0.1,
      roughness: 0.3,
      side: THREE.FrontSide
    }));

    // 线框材质
    this.materials.set('wireframe', new THREE.MeshBasicMaterial({
      color: 0x00d9ff,
      wireframe: true,
      transparent: true,
      opacity: 0.8
    }));

    // 透明材质
    this.materials.set('transparent', new THREE.MeshStandardMaterial({
      color: 0x00d9ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    }));

    // 网格边缘材质
    this.materials.set('edges', new THREE.LineBasicMaterial({
      color: 0x000000,
      linewidth: 1
    }));

    // 应力可视化材质（基础版本）
    this.materials.set('stress', new THREE.MeshStandardMaterial({
      vertexColors: true,
      side: THREE.DoubleSide
    }));

    // 选中状态材质
    this.materials.set('selected', new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0x442200,
      transparent: true,
      opacity: 0.8
    }));
  }

  // 设置事件监听
  private setupEventListeners(): void {
    this.renderer.domElement.addEventListener('click', this.onMouseClick.bind(this));
    this.renderer.domElement.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenu.bind(this));
    window.addEventListener('resize', this.onWindowResize.bind(this));
  }

  // 鼠标点击事件
  private onMouseClick(event: MouseEvent): void {
    if (this.interactionMode !== CAEInteractionMode.SELECT) return;

    this.updateMousePosition(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const intersects = this.raycaster.intersectObjects(this.scene.children, true);
    
    if (intersects.length > 0) {
      const object = intersects[0].object;
      this.toggleSelection(object);
    } else {
      this.clearSelection();
    }
  }

  // 鼠标移动事件
  private onMouseMove(event: MouseEvent): void {
    this.updateMousePosition(event);
    
    if (this.interactionMode === CAEInteractionMode.MEASURE) {
      // 测量模式下显示交互提示
      this.updateMeasurementPreview();
    }
  }

  // 右键菜单
  private onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    // 这里可以显示上下文菜单
  }

  // 窗口大小调整
  private onWindowResize(): void {
    const container = this.renderer.domElement.parentElement;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  // 更新鼠标位置
  private updateMousePosition(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  // 添加场景辅助元素
  private addSceneHelpers(): void {
    // 网格
    const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
    gridHelper.name = 'grid';
    this.scene.add(gridHelper);

    // 坐标轴
    const axesHelper = new THREE.AxesHelper(10);
    axesHelper.name = 'axes';
    this.scene.add(axesHelper);
  }
  
  // 添加测试几何体
  private addTestGeometry(): void {




    // 添加地面
    const planeGeometry = new THREE.PlaneGeometry(30, 30);
    const planeMaterial = new THREE.MeshLambertMaterial({ color: 0x666666 });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.5;
    plane.receiveShadow = true;
    plane.name = 'ground-plane';
    this.scene.add(plane);
    
    ComponentDevHelper.logDevTip('测试几何体已添加到场景');
  }

  // 选择管理
  public toggleSelection(object: THREE.Object3D): void {
    const index = this.selectedObjects.indexOf(object);
    
    if (index > -1) {
      // 取消选择
      this.selectedObjects.splice(index, 1);
      this.resetObjectMaterial(object);
    } else {
      // 添加选择
      this.selectedObjects.push(object);
      this.applySelectionMaterial(object);
    }

    this.onSelectionCallback?.(this.selectedObjects);
  }

  public clearSelection(): void {
    this.selectedObjects.forEach(obj => this.resetObjectMaterial(obj));
    this.selectedObjects = [];
    this.onSelectionCallback?.([]);
  }

  // 材质应用
  private applySelectionMaterial(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh) {
      object.userData.originalMaterial = object.material;
      object.material = this.materials.get('selected')!;
    }
  }

  private resetObjectMaterial(object: THREE.Object3D): void {
    if (object instanceof THREE.Mesh && object.userData.originalMaterial) {
      object.material = object.userData.originalMaterial;
      delete object.userData.originalMaterial;
    }
  }

  // 交互模式切换
  public setInteractionMode(mode: CAEInteractionMode): void {
    this.interactionMode = mode;
    
    switch (mode) {
      case CAEInteractionMode.ORBIT:
        this.orbitControls.enabled = true;
        if (this.transformControls && this.transformControls.detach) {
          this.transformControls.detach();
        }
        break;
      case CAEInteractionMode.SELECT:
        this.orbitControls.enabled = true;
        if (this.transformControls && this.transformControls.detach) {
          this.transformControls.detach();
        }
        break;
      case CAEInteractionMode.TRANSFORM:
        if (this.transformControls && this.transformControls.attach && this.selectedObjects.length > 0) {
          this.transformControls.attach(this.selectedObjects[0]);
        }
        break;
    }
  }

  // 视图预设
  public setViewPreset(preset: CAEViewPreset): void {
    const distance = 20;
    
    switch (preset) {
      case CAEViewPreset.ISOMETRIC:
        this.camera.position.set(distance, distance, distance);
        break;
      case CAEViewPreset.FRONT:
        this.camera.position.set(0, 0, distance);
        break;
      case CAEViewPreset.BACK:
        this.camera.position.set(0, 0, -distance);
        break;
      case CAEViewPreset.LEFT:
        this.camera.position.set(-distance, 0, 0);
        break;
      case CAEViewPreset.RIGHT:
        this.camera.position.set(distance, 0, 0);
        break;
      case CAEViewPreset.TOP:
        this.camera.position.set(0, distance, 0);
        break;
      case CAEViewPreset.BOTTOM:
        this.camera.position.set(0, -distance, 0);
        break;
    }
    
    this.camera.lookAt(0, 0, 0);
    this.orbitControls.update();
  }

  // 模型加载
  public async loadSTLFile(file: File): Promise<THREE.Mesh> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }

        try {
          const geometry = this.stlLoader.parse(event.target.result as ArrayBuffer);
          const material = this.materials.get('solid')!.clone();
          const mesh = new THREE.Mesh(geometry, material);
          
          // 居中模型
          geometry.computeBoundingBox();
          const center = geometry.boundingBox!.getCenter(new THREE.Vector3());
          geometry.translate(-center.x, -center.y, -center.z);
          
          this.scene.add(mesh);
          resolve(mesh);
        } catch (error) {
          reject(error);
        }
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // 几何数据添加
  public addGeometryData(geometryData: GeometryData): THREE.Object3D | null {
    try {
      switch (geometryData.type) {
        case 'point':
          return this.createPointGeometry(geometryData);
        case 'line':
          return this.createLineGeometry(geometryData);
        case 'surface':
          return this.createSurfaceGeometry(geometryData);
        case 'volume':
          return this.createVolumeGeometry(geometryData);
        case 'mesh':
          return this.createMeshGeometry(geometryData);
        default:
          ComponentDevHelper.logError(new Error(`不支持的几何类型: ${geometryData.type}`), 'CAEThreeEngine', '1号架构师');
          return null;
      }
    } catch (error) {
      ComponentDevHelper.logError(error as Error, 'CAEThreeEngine', '1号架构师');
      return null;
    }
  }

  // 创建点几何体
  private createPointGeometry(data: GeometryData): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.coordinates.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.PointsMaterial({
      color: 0x00d9ff,
      size: 0.1,
      sizeAttenuation: true
    });
    
    const points = new THREE.Points(geometry, material);
    points.userData = { geometryData: data };
    this.scene.add(points);
    
    return points;
  }

  // 创建线几何体
  private createLineGeometry(data: GeometryData): THREE.Line {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.coordinates.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const material = new THREE.LineBasicMaterial({
      color: 0x00d9ff,
      linewidth: 2
    });
    
    const line = new THREE.Line(geometry, material);
    line.userData = { geometryData: data };
    this.scene.add(line);
    
    return line;
  }

  // 创建面几何体
  private createSurfaceGeometry(data: GeometryData): THREE.Mesh {
    // 简化实现，实际应根据具体数据格式处理
    const geometry = new THREE.PlaneGeometry(5, 5);
    const material = this.materials.get('solid')!.clone();
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { geometryData: data };
    this.scene.add(mesh);
    
    return mesh;
  }

  // 创建体几何体
  private createVolumeGeometry(data: GeometryData): THREE.Mesh {
    // 简化实现
    const geometry = new THREE.BoxGeometry(2, 2, 2);
    const material = this.materials.get('solid')!.clone();
    
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { geometryData: data };
    this.scene.add(mesh);
    
    return mesh;
  }

  // 创建网格几何体
  private createMeshGeometry(data: GeometryData): THREE.Mesh {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(data.coordinates.flat());
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    
    const material = this.materials.get('solid')!.clone();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.userData = { geometryData: data };
    this.scene.add(mesh);
    
    return mesh;
  }

  // 测量功能
  private updateMeasurementPreview(): void {
    // 测量预览实现
  }

  // 渲染循环 - 集成LOD管理器和性能监控
  public render(): void {
    const startTime = performance.now();
    
    // 场景安全检查（仅在必要时重建）
    if (this.scene.children.length === 0) {
      console.warn('⚠️ 场景为空，重新初始化基础元素');
      this.addTestGeometry();
      this.addSceneHelpers();
    }
    
    // 确保控制器已启用并更新
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    // 更新LOD系统
    if (this.lodManager) {
      this.lodManager.update();
    }
    
    // 渲染场景
    this.renderer.render(this.scene, this.camera);
    
    // 性能监控（减少频率）
    const endTime = performance.now();
    this.performanceStats.frameTime = endTime - startTime;
    this.performanceStats.fps = 1000 / this.performanceStats.frameTime;
    
    // 更新LOD管理器的性能时间
    if (this.lodManager) {
      this.lodManager.setFrameTime(this.performanceStats.frameTime);
    }
    
    // 更新渲染统计（减少频率以提升性能）
    const renderInfo = this.renderer.info;
    this.performanceStats.triangles = renderInfo.render.triangles;
    this.performanceStats.drawCalls = renderInfo.render.calls;
  }

  // 添加几何体到场景（自动启用LOD）
  public addModelWithLOD(object: THREE.Object3D, name?: string): void {
    const lodObject = this.lodManager.createLODObject(object, {
      name: name || object.name,
      autoGenerate: true,
      priority: 'medium'
    });
    
    ComponentDevHelper.logDevTip(`添加LOD模型: ${lodObject.name}`);
  }

  // 获取性能统计信息
  public getPerformanceStats(): {
    frameTime: number;
    fps: number;
    triangles: number;
    drawCalls: number;
    lodStats: any;
  } {
    return {
      ...this.performanceStats,
      lodStats: this.lodManager.getStats()
    };
  }

  // 清理资源
  public dispose(): void {
    console.log('🗑️ CAE引擎开始清理资源...');
    this.lodManager.dispose();
    this.renderer.dispose();
    this.materials.forEach(material => material.dispose());
    console.log('🚨 正在清空场景...');
    this.scene.clear();
    console.log('✅ CAE引擎资源清理完成');
  }
}

// React组件封装
const CAEThreeEngineComponent: React.FC<CAEThreeEngineProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CAEThreeEngine | null>(null);
  const animationIdRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const animate = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.render();
    }
    animationIdRef.current = requestAnimationFrame(animate);
  }, []);

  // 初始化引擎
  useEffect(() => {
    if (!containerRef.current || isInitialized) return;

    try {
      const container = containerRef.current;
      const width = container.offsetWidth;
      const height = container.offsetHeight;
      
      console.log('🚀 初始化CAE Three.js引擎...');
      console.log('容器尺寸:', width, 'x', height);
      
      // 确保容器有合理的尺寸
      if (width < 100 || height < 100) {
        console.warn('⚠️ 容器尺寸过小，使用最小尺寸');
        container.style.minWidth = '400px';
        container.style.minHeight = '300px';
      }
      
      engineRef.current = new CAEThreeEngine(container, props);
      setIsInitialized(true);

      console.log('✅ CAE Three.js引擎组件初始化完成');
      ComponentDevHelper.logDevTip('CAE Three.js引擎组件初始化完成');
    } catch (error) {
      console.error('❌ CAE Three.js引擎初始化失败:', error);
      ComponentDevHelper.logError(error as Error, 'CAEThreeEngineComponent', '1号架构师');
      setInitError((error as Error).message);
    }

    return () => {
      console.log('🧹 CAE组件清理函数被调用');
      if (engineRef.current) {
        console.log('⚠️ 注意：清理函数调用了dispose()，这会清空场景');
        engineRef.current.dispose();
        engineRef.current = null;
      }
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [props]);

  // 动画循环现在由引擎内部管理，不需要在React组件中重复启动
  useEffect(() => {
    if (isInitialized && engineRef.current) {
      console.log('✅ CAE引擎已初始化，动画循环由引擎内部管理');
    }
    
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [isInitialized]);

  return (
    <div 
      ref={containerRef}
      className={props.className}
      style={{ 
        width: '100%', 
        height: '100%',
        background: '#0a0a0a',
        overflow: 'hidden',
        position: 'relative',
        ...props.style
      }}
    >
      {!isInitialized && !initError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#0a0a0a',
          color: '#ffffff',
          fontSize: '16px',
          zIndex: 1000
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px', animation: 'spin 2s linear infinite' }}>🔄</div>
          <div>正在初始化3D引擎...</div>
          <div style={{ fontSize: '12px', color: '#666', marginTop: '10px' }}>
            正在加载几何建模工作区
          </div>
          <style>{`
            @keyframes spin { 
              0% { transform: rotate(0deg); } 
              100% { transform: rotate(360deg); } 
            }
          `}</style>
        </div>
      )}
      
      {initError && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: '#1a1a1a',
          color: '#ff6666',
          fontSize: '16px',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⚠️</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>3D引擎初始化失败</div>
          <div style={{ fontSize: '12px', color: '#999999', textAlign: 'center', maxWidth: '400px' }}>
            {initError}<br/>
            请检查WebGL支持或刷新页面重试
          </div>
        </div>
      )}
    </div>
  );
};

export default CAEThreeEngineComponent;