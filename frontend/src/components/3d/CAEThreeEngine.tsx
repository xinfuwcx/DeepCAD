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

  // 背景纹理缓存
  private backgroundTexture: THREE.Texture | null = null;

  // 创建ABAQUS风格的专业背景
  private createGradientBackground(): THREE.Texture {
    // 如果已经创建过，直接返回缓存的纹理
    if (this.backgroundTexture) {
      return this.backgroundTexture;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d')!;
    
    // ABAQUS风格的专业渐变背景
    const gradient = context.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#2c3e50');    // 深蓝灰色顶部
    gradient.addColorStop(0.3, '#34495e');  // 中蓝灰色
    gradient.addColorStop(0.7, '#2c3e50');  // 深蓝灰色
    gradient.addColorStop(1, '#1a252f');    // 深色底部
    
    context.fillStyle = gradient;
    context.fillRect(0, 0, 512, 512);
    
    // 添加细微的网格纹理
    context.strokeStyle = 'rgba(52, 73, 94, 0.1)';
    context.lineWidth = 1;
    for (let i = 0; i < 512; i += 32) {
      context.beginPath();
      context.moveTo(i, 0);
      context.lineTo(i, 512);
      context.stroke();
      
      context.beginPath();
      context.moveTo(0, i);
      context.lineTo(512, i);
      context.stroke();
    }
    
    this.backgroundTexture = new THREE.CanvasTexture(canvas);
    this.backgroundTexture.needsUpdate = true;
    return this.backgroundTexture;
  }

  constructor(container: HTMLElement, props: Partial<CAEThreeEngineProps> = {}) {
    console.log('🚀 CAE Three.js引擎构造函数开始...');
    
    if (!container) {
      throw new Error('容器元素为空');
    }
    
    console.log('容器有效，尺寸:', container.offsetWidth, 'x', container.offsetHeight);
    
    // 初始化场景 - 现代化设计
    this.scene = new THREE.Scene();
    // ABAQUS风格专业背景
    const bgTexture = this.createGradientBackground();
    this.scene.background = bgTexture;
    this.scene.fog = new THREE.Fog(0x2c3e50, 50, 200); // ABAQUS风格线性雾效

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
    this.renderer.toneMappingExposure = 1.2;
    // 现代化渲染设置
    this.renderer.useLegacyLights = false; // 使用物理正确的光照

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

    // 添加基础场景元素（仅在首次初始化时）
    this.addSceneHelpers();
    
    // 添加测试几何体（仅在首次初始化时）
    this.addTestGeometry();
    
    console.log(`🎯 场景初始化完成，共有 ${this.scene.children.length} 个对象`);
    
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

  // ABAQUS风格专业光照系统
  private setupLighting(): void {
    // 移除现有光源
    const lights = this.scene.children.filter(child => child instanceof THREE.Light);
    lights.forEach(light => this.scene.remove(light));

    // ABAQUS风格环境光 - 均匀的基础照明
    const ambientLight = new THREE.AmbientLight(0x5a6c7d, 0.4);
    this.scene.add(ambientLight);

    // 主光源 - ABAQUS风格的强定向光
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.8);
    mainLight.position.set(20, 30, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 150;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.bias = -0.001;
    this.scene.add(mainLight);

    // 辅助光源 - 模拟工作室环境
    const auxLight1 = new THREE.DirectionalLight(0xa0b4c7, 0.6);
    auxLight1.position.set(-15, 20, -10);
    this.scene.add(auxLight1);

    const auxLight2 = new THREE.DirectionalLight(0x7f8c8d, 0.4);
    auxLight2.position.set(0, -10, 20);
    this.scene.add(auxLight2);

    // ABAQUS风格的半球光 - 模拟工作室天花板
    const hemisphereLight = new THREE.HemisphereLight(0x95a5a6, 0x2c3e50, 0.5);
    this.scene.add(hemisphereLight);
  }

  // ABAQUS风格CAE材质库
  private initializeMaterials(): void {
    // ABAQUS风格钢材质
    this.materials.set('steel', new THREE.MeshStandardMaterial({
      color: 0x8395a7,
      metalness: 0.8,
      roughness: 0.2,
      side: THREE.FrontSide
    }));

    // ABAQUS风格混凝土材质
    this.materials.set('concrete', new THREE.MeshStandardMaterial({
      color: 0x95a5a6,
      metalness: 0.1,
      roughness: 0.9,
      side: THREE.FrontSide
    }));

    // ABAQUS风格线框材质
    this.materials.set('wireframe', new THREE.MeshBasicMaterial({
      color: 0x3498db,
      wireframe: true,
      transparent: true,
      opacity: 0.9
    }));

    // ABAQUS风格透明材质
    this.materials.set('transparent', new THREE.MeshStandardMaterial({
      color: 0x74b9ff,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      metalness: 0.1,
      roughness: 0.3
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
    // 现代化网格系统
    const modernGrid = this.createModernGrid();
    this.scene.add(modernGrid);

    // 现代化坐标轴系统
    const modernAxes = this.createModernAxes();
    this.scene.add(modernAxes);
  }

  // 创建ABAQUS风格工程网格系统
  private createModernGrid(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'abaqus-grid';
    
    // ABAQUS风格主网格 - 粗线条，工程感
    const mainGrid = new THREE.GridHelper(100, 20, 0x5a6c7d, 0x3d4c5c);
    mainGrid.material.opacity = 0.8;
    mainGrid.material.transparent = true;
    group.add(mainGrid);
    
    // ABAQUS风格细网格 - 精确工程网格
    const fineGrid = new THREE.GridHelper(100, 100, 0x3d4c5c, 0x2c3e50);
    fineGrid.material.opacity = 0.3;
    fineGrid.material.transparent = true;
    group.add(fineGrid);
    
    // ABAQUS风格原点标记
    const originGeometry = new THREE.SphereGeometry(0.5, 8, 6);
    const originMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe74c3c,
      emissive: 0x331111,
      emissiveIntensity: 0.3
    });
    const origin = new THREE.Mesh(originGeometry, originMaterial);
    origin.position.set(0, 0.5, 0);
    group.add(origin);
    
    // ABAQUS风格坐标平面指示
    const planeGeometry = new THREE.PlaneGeometry(0.1, 100);
    const planeMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x74b9ff, 
      opacity: 0.1, 
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // XY平面指示
    const xyPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    xyPlane.rotation.z = Math.PI / 2;
    group.add(xyPlane);
    
    // XZ平面指示
    const xzPlane = new THREE.Mesh(planeGeometry, planeMaterial);
    xzPlane.rotation.x = Math.PI / 2;
    group.add(xzPlane);
    
    return group;
  }

  // 创建ABAQUS风格工程坐标轴系统
  private createModernAxes(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'abaqus-axes';
    
    const axisLength = 15;
    const arrowLength = 2;
    const arrowWidth = 0.8;
    const axisRadius = 0.1;
    
    // ABAQUS风格X轴 - 红色，更粗更明显
    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    const xMaterial = new THREE.MeshStandardMaterial({ 
      color: 0xe74c3c,
      metalness: 0.3,
      roughness: 0.4
    });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    group.add(xAxis);
    
    // X轴箭头 - ABAQUS风格
    const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 12);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = axisLength + arrowLength / 2;
    group.add(xArrow);
    
    // ABAQUS风格Y轴 - 绿色
    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    const yMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x27ae60,
      metalness: 0.3,
      roughness: 0.4
    });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = axisLength / 2;
    group.add(yAxis);
    
    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 12);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = axisLength + arrowLength / 2;
    group.add(yArrow);
    
    // ABAQUS风格Z轴 - 蓝色
    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 12);
    const zMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x3498db,
      metalness: 0.3,
      roughness: 0.4
    });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    group.add(zAxis);
    
    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 12);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = axisLength + arrowLength / 2;
    group.add(zArrow);
    
    // 添加轴标签背景
    const labelBg = new THREE.SphereGeometry(0.3, 8, 6);
    const labelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2c3e50,
      metalness: 0.1,
      roughness: 0.8
    });
    
    const xLabel = new THREE.Mesh(labelBg, labelMaterial);
    xLabel.position.set(axisLength + arrowLength + 1, 0, 0);
    group.add(xLabel);
    
    const yLabel = new THREE.Mesh(labelBg, labelMaterial);
    yLabel.position.set(0, axisLength + arrowLength + 1, 0);
    group.add(yLabel);
    
    const zLabel = new THREE.Mesh(labelBg, labelMaterial);
    zLabel.position.set(0, 0, axisLength + arrowLength + 1);
    group.add(zLabel);
    
    return group;
  }
  
  // 添加测试几何体
  private addTestGeometry(): void {
    // 添加现代化展示对象
    const showcaseObject = this.createShowcaseObject();
    this.scene.add(showcaseObject);

    // 现代化地面系统
    const modernGround = this.createModernGround();
    this.scene.add(modernGround);
    
    ComponentDevHelper.logDevTip('现代化展示几何体已添加到场景');
  }

  // 创建ABAQUS风格工程展示对象
  private createShowcaseObject(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'abaqus-showcase';
    
    // ABAQUS风格主梁结构
    const beamGeometry = new THREE.BoxGeometry(8, 0.6, 0.8);
    const steelMaterial = this.materials.get('steel') || new THREE.MeshStandardMaterial({ color: 0x8395a7 });
    const mainBeam = new THREE.Mesh(beamGeometry, steelMaterial);
    mainBeam.position.set(0, 3, 0);
    mainBeam.castShadow = true;
    mainBeam.receiveShadow = true;
    group.add(mainBeam);
    
    // ABAQUS风格支撑柱
    const columnGeometry = new THREE.CylinderGeometry(0.3, 0.3, 6, 12);
    const column1 = new THREE.Mesh(columnGeometry, steelMaterial);
    column1.position.set(-3, 0, 0);
    column1.castShadow = true;
    column1.receiveShadow = true;
    group.add(column1);
    
    const column2 = new THREE.Mesh(columnGeometry, steelMaterial);
    column2.position.set(3, 0, 0);
    column2.castShadow = true;
    column2.receiveShadow = true;
    group.add(column2);
    
    // ABAQUS风格混凝土基础
    const foundationGeometry = new THREE.BoxGeometry(10, 1, 4);
    const concreteMaterial = this.materials.get('concrete') || new THREE.MeshStandardMaterial({ color: 0x95a5a6 });
    const foundation = new THREE.Mesh(foundationGeometry, concreteMaterial);
    foundation.position.set(0, -3.5, 0);
    foundation.castShadow = true;
    foundation.receiveShadow = true;
    group.add(foundation);
    
    // ABAQUS风格网格线条
    const wireframeMaterial = this.materials.get('wireframe') || new THREE.MeshBasicMaterial({ wireframe: true });
    const wireframeBeam = new THREE.Mesh(beamGeometry, wireframeMaterial);
    wireframeBeam.position.copy(mainBeam.position);
    wireframeBeam.scale.multiplyScalar(1.01);
    group.add(wireframeBeam);
    
    return group;
  }

  // 创建ABAQUS风格工程地面系统
  private createModernGround(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'abaqus-ground';
    
    // ABAQUS风格工作平面
    const workPlaneGeometry = new THREE.PlaneGeometry(200, 200);
    const workPlaneMaterial = new THREE.MeshLambertMaterial({
      color: 0x34495e,
      transparent: true,
      opacity: 0.6
    });
    const workPlane = new THREE.Mesh(workPlaneGeometry, workPlaneMaterial);
    workPlane.rotation.x = -Math.PI / 2;
    workPlane.position.y = -4;
    workPlane.receiveShadow = true;
    group.add(workPlane);
    
    // ABAQUS风格基准平面标记
    const datumGeometry = new THREE.PlaneGeometry(0.5, 100);
    const datumMaterial = new THREE.MeshBasicMaterial({
      color: 0x3498db,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    // 基准线 - X方向
    const datumX = new THREE.Mesh(datumGeometry, datumMaterial);
    datumX.rotation.x = -Math.PI / 2;
    datumX.position.y = -3.99;
    group.add(datumX);
    
    // 基准线 - Z方向
    const datumZ = new THREE.Mesh(datumGeometry, datumMaterial);
    datumZ.rotation.x = -Math.PI / 2;
    datumZ.rotation.y = Math.PI / 2;
    datumZ.position.y = -3.99;
    group.add(datumZ);
    
    return group;
  }

  // ABAQUS风格微妙动画效果
  private updateAnimations(): void {
    const time = Date.now() * 0.001;
    
    // 微妙的结构展示旋转
    const showcaseObject = this.scene.getObjectByName('abaqus-showcase');
    if (showcaseObject) {
      // ABAQUS风格：非常缓慢的旋转，展示结构细节
      showcaseObject.rotation.y = time * 0.1;
      
      // 微妙的上下浮动，模拟结构分析中的位移
      showcaseObject.position.y = Math.sin(time * 0.5) * 0.1;
    }
    
    // ABAQUS风格光照微调
    const mainLight = this.scene.children.find(child => 
      child.type === 'DirectionalLight' && (child as any).intensity > 1.5
    );
    if (mainLight && 'intensity' in mainLight) {
      // 非常微妙的光强变化，模拟工作室环境
      (mainLight as any).intensity = 1.8 + Math.sin(time * 0.3) * 0.1;
    }
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
    
    // 场景安全检查（避免重复初始化）
    if (this.scene.children.length < 3) { // 至少应该有光照、网格、坐标轴
      console.warn('⚠️ 场景元素不足，检查初始化状态');
      // 不要重复添加，而是检查具体缺失的元素
      const hasGrid = this.scene.getObjectByName('abaqus-grid');
      const hasAxes = this.scene.getObjectByName('abaqus-axes');
      const hasShowcase = this.scene.getObjectByName('abaqus-showcase');
      
      if (!hasGrid || !hasAxes || !hasShowcase) {
        console.log('🔧 部分场景元素缺失，重新添加');
        if (!hasGrid || !hasAxes) this.addSceneHelpers();
        if (!hasShowcase) {
          const showcaseObject = this.createShowcaseObject();
          const modernGround = this.createModernGround();
          this.scene.add(showcaseObject);
          this.scene.add(modernGround);
        }
      }
    }
    
    // 确保控制器已启用并更新
    if (this.orbitControls) {
      this.orbitControls.update();
    }
    
    // 更新LOD系统
    if (this.lodManager) {
      this.lodManager.update();
    }
    
    // 添加动画效果
    this.updateAnimations();
    
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
    
    // 清理背景纹理
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
      this.backgroundTexture = null;
    }
    
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

  // 初始化引擎 - 防止重复初始化
  useEffect(() => {
    if (!containerRef.current || isInitialized || engineRef.current) return;

    try {
      const container = containerRef.current;
      
      // 清理容器内容，防止重复渲染
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }
      
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
      setIsInitialized(false);
    };
  }, []); // 移除props依赖，防止重复初始化

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