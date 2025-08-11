/**
 * CAE专业Three.js渲染引擎
 * 1号架构师 - 为CAE应用优化的完整Three.js配置
 */

import React, { useRef, useEffect, useCallback, useState } from 'react';
// 集成主视口坐标轴 (复用已有组件)
import { ViewportAxes } from './ViewportAxes';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js';
import { ComponentDevHelper } from '../../utils/developmentTools';
import { GeometryData, MaterialZone } from '../../core/InterfaceProtocol';
import { LODManager } from './performance/LODManager.simple';
import { safeRemoveRenderer, disposeMaterial, safeEmptyContainer } from '../../utils/threejsCleanup';
import { performanceStore } from '../../store/performanceStore';

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

export interface CAEThreeEngineProps {
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

export class CAEThreeEngineCore {
  // 核心Three.js组件
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  
  // 坐标轴独立渲染系统
  // 旧版内置小坐标轴系统字段（已由 React ViewportAxes 组件取代，保留以便未来可能复用）
  // private axesRenderer?: THREE.WebGLRenderer;
  // private axesScene?: THREE.Scene;
  // private axesCamera?: THREE.PerspectiveCamera;
  public orbitControls!: OrbitControls; // 在构造函数中初始化
  public transformControls!: TransformControls; // 在构造函数中初始化

  // CAE专用组件
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private selectedObjects: THREE.Object3D[] = [];
  private interactionMode: CAEInteractionMode = CAEInteractionMode.ORBIT;
  private animationFrameId: number | null = null;
  private paused = false;
  
  // 加载器
  private stlLoader: STLLoader = new STLLoader();

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
    // 防止纹理重复创建警告
    this.backgroundTexture.generateMipmaps = false;
    this.backgroundTexture.minFilter = THREE.LinearFilter;
    this.backgroundTexture.magFilter = THREE.LinearFilter;
    return this.backgroundTexture;
  }

  constructor(container: HTMLElement, props: Partial<CAEThreeEngineProps> = {}, rendererParams?: Partial<THREE.WebGLRendererParameters>) {
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
    const baseParams: THREE.WebGLRendererParameters = {
      antialias: true,
      alpha: false,
      depth: true,
      stencil: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      preserveDrawingBuffer: false
    } as any;
    const params = { ...baseParams, ...(rendererParams||{}) };
    this.renderer = new THREE.WebGLRenderer(params);

    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    // 现代化渲染设置
  // three.js r150+ 默认物理正确光照，无需 useLegacyLights; 某些类型定义不存在此属性
  // (已去除 this.renderer.useLegacyLights 以避免类型报错)

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
  // this._onMeasurementCallback = props.onMeasurement; // 预留（当前未使用）

    // 添加基础场景元素（仅在首次初始化时）
    this.addSceneHelpers();
    
    // 添加测试几何体（仅在首次初始化时）
    this.addTestGeometry();
    
    console.log(`🎯 场景初始化完成，共有 ${this.scene.children.length} 个对象`);
    
    // 确保控制器启用
    this.orbitControls.enabled = true;
    this.setInteractionMode(CAEInteractionMode.ORBIT);

    ComponentDevHelper.logDevTip('CAE Three.js引擎初始化完成 - 控制器已启用');
    
    // 坐标轴现在由React组件管理
    
    // 立即启动渲染循环
    this.startRenderLoop();
  }

  // 启动渲染循环
  public startRenderLoop(): void {
    let frameCount = 0;
    const animate = () => {
      if(!this.paused){
        this.render();
      }
      frameCount++;
      if (frameCount % 300 === 0) {
        console.log(`🎬 渲染帧 #${frameCount}, 场景子对象数量: ${this.scene.children.length}`);
      }
      // 记录 ID 便于后续取消 (StrictMode 二次装卸 / 视图切换)
      this.animationFrameId = requestAnimationFrame(animate);
    };
    // 首帧调用
    this.animationFrameId = requestAnimationFrame(animate);
    console.log('🎬 CAE引擎渲染循环已启动');
  }

  public setPaused(p:boolean){
    this.paused = p;
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
      // 某些 three/examples d.ts 版本下 TransformControls 结构与 Object3D 声明不完全匹配，强制断言避免 TS 报错
      this.scene.add(this.transformControls as unknown as THREE.Object3D);
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

    // 坐标轴系统现在独立渲染，不添加到主场景
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
    // const originGeometry = new THREE.SphereGeometry(0.5, 8, 6);
    // const originMaterial = new THREE.MeshStandardMaterial({ 
    //   color: 0xe74c3c,
    //   emissive: 0x331111,
    //   emissiveIntensity: 0.3
    // });
    // const origin = new THREE.Mesh(originGeometry, originMaterial);
    // origin.position.set(0, 0.5, 0);
    // group.add(origin);
    
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

  // 初始化独立的坐标轴系统
  /* 旧的内嵌独立坐标轴系统（已由 React ViewportAxes 组件替代）
  private initAxesSystem(container: HTMLElement): void {
    try {
      // 创建坐标轴独立场景
      this.axesScene = new THREE.Scene();
  this.axesScene.background = new THREE.Color(0x000000); // 透明度通过渲染器控制
      
      // 创建坐标轴独立相机
      this.axesCamera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
      this.axesCamera.position.set(0, 0, 8);
      this.axesCamera.lookAt(0, 0, 0);
      
      // 创建坐标轴独立渲染器（小尺寸）
      this.axesRenderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: true,
        premultipliedAlpha: false
      });
      this.axesRenderer.setSize(120, 120);
      this.axesRenderer.setClearColor(0x000000, 0);
      
      // 设置DOM样式
      const axesElement = this.axesRenderer.domElement;
      axesElement.style.position = 'fixed';
      axesElement.style.bottom = '20px';
      axesElement.style.left = '20px';
      axesElement.style.zIndex = '9999';
      axesElement.style.pointerEvents = 'none';
      axesElement.style.border = '2px solid rgba(255,255,255,0.5)';
      axesElement.style.borderRadius = '8px';
      axesElement.style.backgroundColor = 'rgba(30,30,30,0.8)';
      axesElement.style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      
      // 强制添加到DOM
      document.body.appendChild(axesElement);
      
      // 创建并添加小坐标轴到独立场景
      const axes = this.createCompactAxes();
      this.axesScene.add(axes);
      
      // 添加光照到坐标轴场景
      const light = new THREE.DirectionalLight(0xffffff, 2);
      light.position.set(5, 5, 5);
      this.axesScene.add(light);
      
      const ambientLight = new THREE.AmbientLight(0x404040, 1);
      this.axesScene.add(ambientLight);
      
      console.log('🎯 坐标轴系统初始化完成:', {
        scene: this.axesScene.children.length,
        camera: this.axesCamera.position,
        renderer: axesElement,
        inDOM: document.body.contains(axesElement)
      });
      
    } catch (error) {
      console.error('❌ 坐标轴系统初始化失败:', error);
    }
  }
  */

  // 创建紧凑的坐标轴（用于独立渲染）
  /*
  private createCompactAxes(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'compact-axes';
    
    const axisLength = 3.5;
    const arrowLength = 0.5;
    const arrowWidth = 0.25;
    const axisRadius = 0.05;
    
    // X轴 - 红色
    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    group.add(xAxis);
    
    // X轴箭头
    const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = axisLength + arrowLength / 2;
    group.add(xArrow);
    
    // Y轴 - 绿色
    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = axisLength / 2;
    group.add(yAxis);
    
    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = axisLength + arrowLength / 2;
    group.add(yArrow);
    
    // Z轴 - 蓝色
    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    group.add(zAxis);
    
    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = axisLength + arrowLength / 2;
    group.add(zArrow);
    
    return group;
  }
  */

  // 创建工业软件风格的小坐标轴（左下角）
  /*
  private createModernAxes(): THREE.Group {
    const group = new THREE.Group();
    group.name = 'abaqus-axes';
    
    // 缩小尺寸，适合放在左下角
    const axisLength = 3;
    const arrowLength = 0.5;
    const arrowWidth = 0.2;
    const axisRadius = 0.03;
    
    // X轴 - 红色
    const xGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.rotation.z = -Math.PI / 2;
    xAxis.position.x = axisLength / 2;
    group.add(xAxis);
    
    // X轴箭头
    const xArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const xArrow = new THREE.Mesh(xArrowGeometry, xMaterial);
    xArrow.rotation.z = -Math.PI / 2;
    xArrow.position.x = axisLength + arrowLength / 2;
    group.add(xArrow);
    
    // Y轴 - 绿色
    const yGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ff00,
      transparent: true,
      opacity: 0.9
    });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.y = axisLength / 2;
    group.add(yAxis);
    
    // Y轴箭头
    const yArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const yArrow = new THREE.Mesh(yArrowGeometry, yMaterial);
    yArrow.position.y = axisLength + arrowLength / 2;
    group.add(yArrow);
    
    // Z轴 - 蓝色
    const zGeometry = new THREE.CylinderGeometry(axisRadius, axisRadius, axisLength, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x0000ff,
      transparent: true,
      opacity: 0.9
    });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.rotation.x = Math.PI / 2;
    zAxis.position.z = axisLength / 2;
    group.add(zAxis);
    
    // Z轴箭头
    const zArrowGeometry = new THREE.ConeGeometry(arrowWidth, arrowLength, 8);
    const zArrow = new THREE.Mesh(zArrowGeometry, zMaterial);
    zArrow.rotation.x = Math.PI / 2;
    zArrow.position.z = axisLength + arrowLength / 2;
    group.add(zArrow);
    
    // 设置坐标轴为固定大小，不受场景缩放影响
    group.scale.set(1, 1, 1);
    
    // 定位到左下角（相对于相机）
    group.position.set(-8, -5, 0);
    
    return group;
  }
  */
  
  // 添加测试几何体
  private addTestGeometry(): void {
    // 添加现代化展示对象
    // const showcaseObject = this.createShowcaseObject();
    // this.scene.add(showcaseObject);

    // 现代化地面系统
    const modernGround = this.createModernGround();
    this.scene.add(modernGround);
    
    ComponentDevHelper.logDevTip('现代化展示几何体已添加到场景');
  }

  // 创建ABAQUS风格工程展示对象
  /*
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
  */

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
      
      if (!hasGrid) {
        console.log('🔧 场景网格缺失，重新添加');
        this.addSceneHelpers();
        // if (!hasShowcase) {
        //   const showcaseObject = this.createShowcaseObject();
        //   const modernGround = this.createModernGround();
        //   this.scene.add(showcaseObject);
        //   this.scene.add(modernGround);
        // }
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
    
    // 渲染主场景
    this.renderer.render(this.scene, this.camera);
    
    // 坐标轴现在由React组件渲染
    
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
    // 追加内存/纹理
    const mem = (renderInfo.memory as any);
    const geometries = mem.geometries ?? 0;
    const textures = mem.textures ?? 0;
    // 简单 GPU 显存估算: 三角形数 * 3 顶点 * (position(12)+normal(12)+uv(8)) bytes / (1024*1024)
    const estGpuMB = (this.performanceStats.triangles * 3 * (12+12+8)) / (1024*1024);
    performanceStore.update({
      fps: this.performanceStats.fps,
      frameTime: this.performanceStats.frameTime,
      triangles: this.performanceStats.triangles,
      drawCalls: this.performanceStats.drawCalls,
      geometries,
      textures,
      gpuMemoryMB: +estGpuMB.toFixed(2)
    });
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
    
    // 停止渲染循环
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.lodManager.dispose();
    
    // 清理材质
    this.materials.forEach(material => {
      disposeMaterial(material);
    });
    this.materials.clear();
    
    // 清理背景纹理
    if (this.backgroundTexture) {
      this.backgroundTexture.dispose();
      this.backgroundTexture = null;
    }
    
    // 坐标轴现在由React组件管理，无需手动清理
    
  // 不再强制触发 WebGL 上下文丢失 (避免误判为异常)，仅正常 dispose
    
    // 安全地清理渲染器（注意：这里不移除DOM，因为是类方法，没有容器引用）
    try {
      this.renderer.dispose();
    } catch (error) {
      console.warn('渲染器清理警告:', error);
    }
    
    console.log('🚨 正在清空场景...');
    try {
      this.scene.clear();
    } catch (error) {
      console.warn('场景清理警告:', error);
    }
    console.log('✅ CAE引擎资源清理完成');
  }
}

// React组件封装
const CAEThreeEngineComponent: React.FC<CAEThreeEngineProps> = (props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<CAEThreeEngineCore | null>(null);
  // DXF 覆盖层引用
  const dxfOverlayRef = useRef<THREE.Group | null>(null);
  const animationIdRef = useRef<number>(0);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [lostContext, setLostContext] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // 防止卸载后异步状态写入 (StrictMode 双调用)
  const unmountedRef = useRef(false);
  // 性能统计显示 & 状态
  const [showPerf, setShowPerf] = useState(false);
  const [perfStats, setPerfStats] = useState<{
    fps:number; frameTime:number; triangles:number; drawCalls:number;
    geometries?:number; textures?:number; gpuMemoryMB?:number;
  }|null>(null);
  const [isPaused, setIsPaused] = useState(false);

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
      
      // 安全地清理容器内容，防止重复渲染
      safeEmptyContainer(container);
      
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
      
              engineRef.current = new CAEThreeEngineCore(container, props);
      setIsInitialized(true);

      console.log('✅ CAE Three.js引擎组件初始化完成');
      ComponentDevHelper.logDevTip('CAE Three.js引擎组件初始化完成');

      // 暴露全局接口（供基坑设计等模块调用）
      try {
        (window as any).__CAE_ENGINE__ = {
          /**
           * 渲染 DXF 线段到主 CAE 视口
           * @param segments 线段集合
           * @param options 可选: { targetSize?: number; scaleMultiplier?: number }
           */
          renderDXFSegments: (segments: Array<{ start:{x:number;y:number}; end:{x:number;y:number} }>, options?: { targetSize?: number; scaleMultiplier?: number }) => {
            const eng = engineRef.current;
            if (!eng) return;
            const scene = eng.scene;
            if (dxfOverlayRef.current) {
              scene.remove(dxfOverlayRef.current);
              dxfOverlayRef.current.traverse(obj => {
                const anyObj:any = obj as any;
                if (anyObj.geometry) anyObj.geometry.dispose();
                if (anyObj.material) {
                  const m = anyObj.material; if (Array.isArray(m)) m.forEach(mm=>mm.dispose()); else m.dispose();
                }
              });
              dxfOverlayRef.current = null;
            }
            if (!segments || !segments.length) return;
            // 计算范围
            let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
            segments.forEach(s=>{ minX=Math.min(minX,s.start.x,s.end.x); minY=Math.min(minY,s.start.y,s.end.y); maxX=Math.max(maxX,s.start.x,s.end.x); maxY=Math.max(maxY,s.start.y,s.end.y); });
            const width = Math.max(1e-6, maxX-minX);
            const height = Math.max(1e-6, maxY-minY);
            const centerX=(minX+maxX)/2, centerY=(minY+maxY)/2;
            const target = options?.targetSize ?? 200;
            const baseScale=Math.min(target/width, target/height);
            const scale = baseScale * (options?.scaleMultiplier ?? 1);
            const group = new THREE.Group(); group.name='DXF_OVERLAY';
            const mat = new THREE.LineBasicMaterial({ color:0xff00ff, transparent:true, opacity:1, depthTest:false, depthWrite:false });
            segments.forEach(seg=>{
              const pts=[
                new THREE.Vector3((seg.start.x-centerX)*scale,0.2,(seg.start.y-centerY)*scale),
                new THREE.Vector3((seg.end.x-centerX)*scale,0.2,(seg.end.y-centerY)*scale)
              ];
              const geom=new THREE.BufferGeometry().setFromPoints(pts);
              const line=new THREE.Line(geom, mat); line.renderOrder=999; group.add(line);
            });
            scene.add(group); dxfOverlayRef.current=group;
            // 调整相机
            try {
              const cam = eng.camera; const maxDim=Math.max(width,height)*scale; cam.position.set(maxDim*1.2, maxDim*0.9, maxDim*1.2); cam.lookAt(0,0,0); eng.orbitControls.target.set(0,0,0); eng.orbitControls.update();
            } catch {}
          }
        };
      } catch {}

      // WebGL 上下文丢失/恢复监听
      try {
        const canvas = engineRef.current.renderer.domElement;
        const onLost = (e: Event) => {
          e.preventDefault();
          console.warn('⚠️ WebGL 上下文丢失');
          if(!unmountedRef.current){
            setLostContext(true);
            setInitError('WebGL 上下文丢失');
          }
        };
        const onRestored = () => {
          console.log('✅ WebGL 上下文恢复');
          if(!unmountedRef.current){
            setLostContext(false);
            setInitError(null);
          }
        };
        canvas.addEventListener('webglcontextlost', onLost, { passive:false });
        canvas.addEventListener('webglcontextrestored', onRestored);
      } catch {}
    } catch (error) {
      console.error('❌ CAE Three.js引擎初始化失败:', error);
      ComponentDevHelper.logError(error as Error, 'CAEThreeEngineComponent', '1号架构师');
      setInitError((error as Error).message);
    }

    return () => {
      console.log('🧹 CAE组件清理函数被调用');
  unmountedRef.current = true;
  try { delete (window as any).__CAE_ENGINE__; } catch {}
      
      // 停止动画循环
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
        animationIdRef.current = 0;
      }
      
      // 清理引擎和DOM
      if (engineRef.current) {
        try {
          console.log('⚠️ 注意：清理函数调用了dispose()，这会清空场景');
          // 先安全移除DOM元素
          safeRemoveRenderer(engineRef.current.renderer, containerRef.current);
          // 再清理引擎
          engineRef.current.dispose();
        } catch (error) {
          console.warn('引擎清理警告:', error);
        }
        engineRef.current = null;
      }
    };
  }, []); // 移除props依赖，防止重复初始化

  // 性能统计轮询 (1s)
  useEffect(()=>{
    if(!showPerf || !engineRef.current) return;
    let stopped=false;
    const tick=()=>{
      if(stopped) return;
      try {
        const stats = engineRef.current!.getPerformanceStats();
        const extra = performanceStore.get();
        setPerfStats({
          fps:+stats.fps.toFixed(1),
            frameTime:+stats.frameTime.toFixed(2),
            triangles:stats.triangles,
            drawCalls:stats.drawCalls,
            geometries: extra.geometries,
            textures: extra.textures,
            gpuMemoryMB: extra.gpuMemoryMB
        });
      } catch {}
      setTimeout(tick, 1000);
    };
    tick();
    return ()=>{ stopped=true; };
  }, [showPerf]);

  // 订阅全局 store (用于其它组件监听，同时同步更丰富字段)
  useEffect(()=>{
    const unsub = performanceStore.subscribe(m=>{
      if(!showPerf) return; // 仅在显示时刷新，避免多余重渲染
  setPerfStats(()=> ({
        fps: +m.fps.toFixed(1),
        frameTime: +m.frameTime.toFixed(2),
        triangles: m.triangles,
        drawCalls: m.drawCalls,
        geometries: m.geometries,
        textures: m.textures,
        gpuMemoryMB: m.gpuMemoryMB
      }));
    });
    return ()=> { unsub(); }; // 确保 cleanup 返回 void 而不是 boolean
  }, [showPerf]);

  // 快捷键: Alt+Shift+P 切换性能面板
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{ if(e.altKey && e.shiftKey && (e.key==='P'|| e.key==='p')){ setShowPerf(s=>!s); } };
    window.addEventListener('keydown', onKey);
    return ()=> window.removeEventListener('keydown', onKey);
  }, []);

  // 自愈: 若引擎已创建但 isInitialized 未被置 true (极端竞态) 1.2s 后强制设为 true
  useEffect(()=>{
    if(isInitialized || initError) return;
    if(engineRef.current){
      const t=setTimeout(()=>{ if(!unmountedRef.current && engineRef.current && !isInitialized && !initError){ console.warn('⛑️ 自愈: 强制标记引擎已初始化'); setIsInitialized(true);} }, 1200);
      return ()=> clearTimeout(t);
    }
  }, [isInitialized, initError]);

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

  // 发生上下文丢失时尝试自动重建 (一次性/有限次数) & 降级参数
  useEffect(()=>{
    if(!lostContext) return;
    if(retryCount>2) return; // 避免死循环
    let cancelled=false;
    const timer = setTimeout(()=>{
      if(cancelled) return;
      if(!containerRef.current) return;
      try {
        console.log('🔁 尝试恢复 WebGL 上下文 - 尝试次数', retryCount+1);
        // 清空旧内容
        safeEmptyContainer(containerRef.current);
        // 降级渲染参数: 关闭抗锯齿 / 使用低功耗模式 / 保留绘制缓冲方便截图调试
        engineRef.current = new CAEThreeEngineCore(containerRef.current, props, {
          antialias:false,
          powerPreference:'default',
          preserveDrawingBuffer:true
        });
        engineRef.current.setPaused(false);
        setLostContext(false);
        setInitError(null);
        setRetryCount(c=>c+1);
        setIsInitialized(true);
      } catch(err){
        console.warn('恢复失败:', err);
        setRetryCount(c=>c+1);
      }
    }, 300);
    return ()=>{ cancelled=true; clearTimeout(timer); };
  }, [lostContext, retryCount, props]);

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
      {/* 左下角坐标轴：提供空间方位反馈 */}
      {isInitialized && engineRef.current?.camera && (
        <ViewportAxes
          camera={engineRef.current.camera}
          size={96}
          offset={{ left: 14, bottom: 14 }}
          zIndex={1050}
          style={{ backdropFilter: 'blur(2px)' }}
        />
      )}
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
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>{lostContext? 'WebGL上下文丢失':'3D引擎初始化失败'}</div>
          <div style={{ fontSize: '12px', color: '#999999', textAlign: 'center', maxWidth: '420px', lineHeight:1.6 }}>
            {initError}<br/>
            {lostContext ? (
              <>引擎将尝试自动恢复{retryCount>0?` (已尝试 ${retryCount} 次)`:' (准备重试)'}。如果长时间未恢复，可点击下方按钮手动重建。<br/>建议关闭其它占用显卡的程序，或更新显卡驱动。</>
            ) : (
              <>请检查浏览器对 WebGL 的支持情况，或刷新页面后重试。</>
            )}
          </div>
          {lostContext && (
            <div style={{marginTop:16, display:'flex', gap:8}}>
              <button style={{background:'#16a085', color:'#fff', border:'none', padding:'6px 14px', borderRadius:4, cursor:'pointer'}} onClick={()=>{ setRetryCount(0); setLostContext(true); }}>
                重新尝试恢复
              </button>
              <button style={{background:'#f39c12', color:'#fff', border:'none', padding:'6px 14px', borderRadius:4, cursor:'pointer'}} onClick={()=>{
                if(!containerRef.current) return;
                try {
                  safeEmptyContainer(containerRef.current);
                  engineRef.current = new CAEThreeEngineCore(containerRef.current, props, { antialias:false, powerPreference:'low-power', preserveDrawingBuffer:true });
                  engineRef.current.setPaused(false);
                  setLostContext(false);
                  setInitError(null);
                  setIsInitialized(true);
                } catch(err){ console.error('手动降级重建失败', err); }
              }}>
                降级模式重建
              </button>
            </div>
          )}
        </div>
      )}

      {showPerf && perfStats && (
        <div style={{ position:'absolute', bottom:8, left:8, background:'rgba(0,0,0,0.55)', color:'#0fd9ff', fontSize:11, padding:'6px 8px', lineHeight:1.4, border:'1px solid #0fd9ff40', borderRadius:4, zIndex:1100, maxWidth:200 }}>
          <div style={{ fontWeight:600 }}>Perf</div>
          <div>FPS: {perfStats.fps}</div>
          <div>Frame: {perfStats.frameTime} ms</div>
          <div>Tri: {perfStats.triangles}</div>
          <div>Draws: {perfStats.drawCalls}</div>
          <div>Geo: {perfStats.geometries ?? '-'}</div>
          <div>Tex: {perfStats.textures ?? '-'}</div>
            <div>GPU~: {perfStats.gpuMemoryMB ?? '-'} MB</div>
          <div style={{ display:'flex', gap:4, marginTop:4, flexWrap:'wrap' }}>
            <button
              onClick={()=>{
                const next = !isPaused; setIsPaused(next); engineRef.current?.setPaused(next);
              }}
              style={{ background:isPaused? '#ff9f43':'#16a085', border:'none', color:'#fff', cursor:'pointer', padding:'2px 6px', fontSize:11, borderRadius:3 }}
            >{isPaused? 'Resume':'Pause'}</button>
          </div>
          <div style={{ opacity:0.7 }}>Alt+Shift+P 关闭</div>
        </div>
      )}
    </div>
  );
};

export default CAEThreeEngineComponent;