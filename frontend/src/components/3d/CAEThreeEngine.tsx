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
import { eventBus } from '../../core/eventBus';

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
  // 当为 true 时，不自动补全网格/地面等辅助元素，保持“空画布”模式
  public blankMode: boolean = false;
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
      stencil: true,
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
  if (!this.blankMode && this.scene.children.length < 3) { // 至少应该有光照、网格、坐标轴
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
  // 地质“计算域”盒实体引用
  const domainBoxRef = useRef<THREE.Group | null>(null);
  const domainSolidMeshRef = useRef<THREE.Mesh | null>(null);
  const domainEdgesRef = useRef<THREE.LineSegments | null>(null);
  const originalDomainGeomRef = useRef<THREE.BufferGeometry | null>(null);
  const domainAutoFitDoneRef = useRef<boolean>(false);
  // 锚杆组引用（挂在地连墙组下）
  const anchorsGroupRef = useRef<THREE.Group | null>(null);
  // 地质域/钻孔渲染相关引用
  const domainBoundsRef = useRef<{ xmin:number;xmax:number;ymin:number;ymax:number;zmin:number;zmax:number }|null>(null);
  const boreholesGroupRef = useRef<THREE.Group | null>(null);
  const soilLayersGroupRef = useRef<THREE.Group | null>(null);
  const soilLayersVisibleRef = useRef<boolean>(true);
  const soilLayersOpacityRef = useRef<number>(0.35);
  const boreholesDataRef = useRef<{ holes:any[]; options?:{ show?:boolean; opacity?:number } }|null>(null);
  // 基坑遮罩体（模板缓冲）
  const excavationMaskRef = useRef<THREE.Group | null>(null);
  // 最近一次开挖轮廓（用于地连墙自动沿基坑边生成）
  const lastExcavationPolysRef = useRef<Array<Array<{x:number;y:number}>> | null>(null);
  // 开挖模式: add(仅向下增加分层实体) | cut(视觉/真实挖空)
  const excavationModeRef = useRef<'add'|'cut'>('cut');
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

      // 默认进入“空画布”模式：不展示网格/地面等辅助元素
      try {
        const eng = engineRef.current!;
        eng.blankMode = true;
        const scene = eng.scene;
        const rm = (name:string) => {
          const obj = scene.getObjectByName(name);
          if (obj) {
            scene.remove(obj);
            obj.traverse((child: any) => {
              try { child.geometry?.dispose?.(); } catch {}
              try {
                const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
              } catch {}
            });
          }
        };
        rm('abaqus-grid');
        rm('abaqus-ground');
      } catch {}

      // 暴露全局接口（供基坑设计等模块调用）
      try {
        (window as any).__CAE_ENGINE__ = {
          /** 是否存在“最近一次开挖”的轮廓可用于生成地连墙 */
          hasLastExcavationOutline: (): boolean => {
            const polys = lastExcavationPolysRef.current;
            return !!(polys && Array.isArray(polys) && polys.length > 0);
          },
          /** 是否已经生成地连墙 */
          hasDiaphragmWall: (): boolean => {
            const eng = engineRef.current; if (!eng) return false;
            return !!eng.scene.getObjectByName('DIAPHRAGM_WALL_GROUP');
          },
          /** 设置开挖显示模式: 'add' 仅增加分层实体; 'cut' 使用模板遮罩视觉挖空 */
          setExcavationMode: (mode: 'add'|'cut') => { excavationModeRef.current = mode; },
          getExcavationMode: (): 'add'|'cut' => excavationModeRef.current,
          /**
           * 渲染 DXF 线段到主 CAE 视口
           * @param segments 线段集合
           * @param options 可选: { targetSize?: number; scaleMultiplier?: number }
           */
          renderDXFSegments: (segments: Array<{ start:{x:number;y:number}; end:{x:number;y:number} }>, options?: { targetSize?: number; scaleMultiplier?: number; autoFit?: boolean }) => {
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
            // 将 DXF 覆盖层对齐到“地质土层”的顶面 (Three Y 对应地质 Z)
            try {
              const bounds = domainBoundsRef.current;
              if (bounds) {
                const cx = (bounds.xmin + bounds.xmax) / 2;
                const cz = (bounds.ymin + bounds.ymax) / 2;
                const yTop = bounds.zmax + 0.1; // 轻微抬高避免与顶面Z-fighting
                group.position.set(cx, yTop, cz);
              }
            } catch {}
            scene.add(group); dxfOverlayRef.current=group;
            // 调整相机（仅在 autoFit 不为 false 时）
            if (options?.autoFit !== false) {
              try {
                const cam = eng.camera; 
                const maxDim=Math.max(width,height)*scale; 
                const bounds = domainBoundsRef.current;
                if (bounds) {
                  const cx = (bounds.xmin + bounds.xmax) / 2;
                  const cz = (bounds.ymin + bounds.ymax) / 2;
                  const yTop = bounds.zmax;
                  cam.position.set(cx + maxDim*1.2, yTop + maxDim*0.9, cz + maxDim*1.2);
                  cam.lookAt(cx, yTop, cz);
                  eng.orbitControls.target.set(cx, yTop, cz);
                } else {
                  const center = new THREE.Vector3(0, 0, 0);
                  cam.position.set(center.x + maxDim*1.2, center.y + maxDim*0.9, center.z + maxDim*1.2);
                  cam.lookAt(center);
                  eng.orbitControls.target.copy(center);
                }
                eng.orbitControls.update();
              } catch {}
            }
          },
          /** 撤回开挖：移除 EXCAVATION_GROUP，并释放其资源 */
          removeExcavationSolids: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const group = scene.getObjectByName('EXCAVATION_GROUP');
            if (group) {
              scene.remove(group);
              group.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                } catch {}
              });
            }
            // 同时移除模板遮罩
            if (excavationMaskRef.current) {
              try {
                scene.remove(excavationMaskRef.current);
                excavationMaskRef.current.traverse((child: any) => {
                  try { child.geometry?.dispose?.(); } catch {}
                  try { const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
                });
              } catch {}
              excavationMaskRef.current = null;
            }
          },
          /**
           * 基于闭合多边形轮廓生成分层开挖实体并添加到场景
           * @param polylines 闭合多边形数组，每个为 {x,y} 顶点序列（DXF 平面坐标）
           * @param params { depth, layerDepth, layerCount, stressReleaseCoefficient?, rotationAngleDeg?, targetSize?, scaleMultiplier?, autoFit? }
           */
          addExcavationSolids: (
            polylines: Array<Array<{x:number;y:number}>>,
            params: { depth: number; layerDepth: number; layerCount: number; stressReleaseCoefficient?: number; rotationAngleDeg?: number },
            options?: { targetSize?: number; scaleMultiplier?: number; autoFit?: boolean }
          ) => {
            const eng = engineRef.current; if (!eng) return;
            if (!polylines || polylines.length === 0) return;

            const scene = eng.scene;
            // 清理已有的开挖组
            const old = scene.getObjectByName('EXCAVATION_GROUP');
            if (old) {
              scene.remove(old);
              old.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                } catch {}
              });
            }
            // 若存在独立的 DXF 覆盖层，也一并移除，避免与开挖实体不一致
            if (dxfOverlayRef.current) {
              try {
                const ov = dxfOverlayRef.current;
                scene.remove(ov);
                ov.traverse((child: any) => {
                  try { child.geometry?.dispose?.(); } catch {}
                  try {
                    const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                  } catch {}
                });
              } catch {}
              dxfOverlayRef.current = null;
            }

            // 先用原始多边形求初始中心，以其为旋转中心；随后基于“旋转后的包围盒”计算缩放与居中
            let srcMinX=Infinity, srcMinY=Infinity, srcMaxX=-Infinity, srcMaxY=-Infinity;
            polylines.forEach(line => line.forEach(p => { srcMinX=Math.min(srcMinX,p.x); srcMaxX=Math.max(srcMaxX,p.x); srcMinY=Math.min(srcMinY,p.y); srcMaxY=Math.max(srcMaxY,p.y); }));
            if (!isFinite(srcMinX) || !isFinite(srcMaxX) || !isFinite(srcMinY) || !isFinite(srcMaxY)) return;
            const c0x = (srcMinX+srcMaxX)/2, c0y = (srcMinY+srcMaxY)/2;

            const angleDeg = (params?.rotationAngleDeg ?? 0) % 360; 
            const angleRad = angleDeg * Math.PI / 180;
            const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
            const rotateAboutC0 = (x:number, y:number) => {
              const dx = x - c0x, dy = y - c0y;
              return { x: c0x + dx * cosA - dy * sinA, y: c0y + dx * sinA + dy * cosA };
            };

            // 生成“已旋转多边形”集合，用其计算包围盒与中心，保证与 DXF overlay 一致
            const rotatedPolys: Array<Array<{x:number;y:number}>> = polylines.map(poly => poly.map(p => rotateAboutC0(p.x, p.y)));
            let rotMinX=Infinity, rotMinY=Infinity, rotMaxX=-Infinity, rotMaxY=-Infinity;
            rotatedPolys.forEach(line => line.forEach(p => { rotMinX=Math.min(rotMinX,p.x); rotMaxX=Math.max(rotMaxX,p.x); rotMinY=Math.min(rotMinY,p.y); rotMaxY=Math.max(rotMaxY,p.y); }));
            const width = Math.max(1e-6, rotMaxX-rotMinX), height = Math.max(1e-6, rotMaxY-rotMinY);
            const cx = (rotMinX+rotMaxX)/2, cy = (rotMinY+rotMaxY)/2; // 旋转后包围盒中心
            const target = options?.targetSize ?? 200;
            const baseScale = Math.min(target/width, target/height);
            const scale = baseScale * (options?.scaleMultiplier ?? 1);

            // 记录最近开挖轮廓（未缩放坐标，便于墙体沿边生成）
            try { lastExcavationPolysRef.current = rotatedPolys.map(poly => poly.map(p => ({ x: p.x, y: p.y }))); } catch {}

            // 创建总组
            const group = new THREE.Group();
            group.name = 'EXCAVATION_GROUP';

            // 材质调色板（分层渐变）
            const colors = [0x1890ff, 0x13c2c2, 0x52c41a, 0xfadb14, 0xfa8c16, 0xf5222d, 0x722ed1];

            // 深度使用“世界单位(=地质Z同单位)”，不受XY缩放影响
            let layers = Math.max(1, Math.min(200, Math.floor(params.layerCount)));
            const totalDepthWorld = Math.max(0, Number(params.depth ?? 0));
            let layerDepthWorld = Math.max(0, Number(params.layerDepth ?? 0));
            if (layerDepthWorld <= 0 && totalDepthWorld > 0) {
              layerDepthWorld = totalDepthWorld / layers;
            }
            if (layerDepthWorld <= 0) {
              layerDepthWorld = 1; // 保底 1 个世界单位，避免看不见
            }

            // 逐层生成（沿 -Y 方向堆叠）
            for (let layer = 0; layer < layers; layer++) {
              // 构造 2D 形状（XY 平面），随后整体旋转到 XZ 平面，并将挤出方向映射到 +Y
              const shapes: THREE.Shape[] = [];
              for (const poly of rotatedPolys) {
                if (!poly || poly.length < 3) continue;
                const shape = new THREE.Shape();
                const p0 = poly[0];
                shape.moveTo((p0.x - cx) * scale, (p0.y - cy) * scale);
                for (let i = 1; i < poly.length; i++) {
                  const p = poly[i];
                  shape.lineTo((p.x - cx) * scale, (p.y - cy) * scale);
                }
                shape.closePath();
                shapes.push(shape);
              }
              if (shapes.length === 0) continue;

              // 合并多形状（不考虑孔洞，后续可扩展为 paths 与 holes）
              const geom = new THREE.ExtrudeGeometry(shapes, {
                depth: layerDepthWorld,
                bevelEnabled: false,
              });
              // 将挤出方向从 +Z 旋转到 -Y（使厚度向下）
              geom.rotateX(Math.PI / 2);

              const mat = new THREE.MeshPhongMaterial({
                color: colors[layer % colors.length],
                transparent: true,
                opacity: 0.35,
                depthWrite: false,
                side: THREE.DoubleSide,
              });
              const mesh = new THREE.Mesh(geom, mat);
              mesh.name = `excavation-layer-${layer+1}`;

              // 向 -Y 方向堆叠：旋转后几何本身范围为 [ -h, 0 ]，故第0层无需位移
              const offset = layer * layerDepthWorld; // 第1层为 -h, 第2层为 -2h ...
              mesh.position.y = -offset;

              group.add(mesh);
            }

            // 添加顶面轮廓线（与形状一致，确保显示对齐）
            try {
              const lineMat = new THREE.LineBasicMaterial({ color: 0x0, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false });
              for (const poly of rotatedPolys) {
                if (!poly || poly.length < 2) continue;
                const pts: THREE.Vector3[] = [];
                for (let i = 0; i < poly.length - 1; i++) {
                  const pA = poly[i];
                  const pB = poly[i+1];
                  pts.push(new THREE.Vector3((pA.x - cx) * scale, 0, (pA.y - cy) * scale));
                  pts.push(new THREE.Vector3((pB.x - cx) * scale, 0, (pB.y - cy) * scale));
                }
                const g = new THREE.BufferGeometry().setFromPoints(pts);
                const lineSeg = new THREE.LineSegments(g, lineMat);
                lineSeg.renderOrder = 999;
                group.add(lineSeg);
              }
            } catch {}

            // 生成模板遮罩体：仅在 'cut' 模式下启用（视觉挖空）
            try {
              if (excavationModeRef.current !== 'cut') {
                // 非挖空模式，确保移除现有遮罩
                if (excavationMaskRef.current) {
                  try {
                    scene.remove(excavationMaskRef.current);
                    excavationMaskRef.current.traverse((child:any)=>{
                      try { child.geometry?.dispose?.(); } catch {}
                      try { const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
                    });
                  } catch {}
                  excavationMaskRef.current = null;
                }
                // 跳过创建遮罩
              } else {
              // 清理旧遮罩
              if (excavationMaskRef.current) {
                try {
                  scene.remove(excavationMaskRef.current);
                  excavationMaskRef.current.traverse((child:any)=>{
                    try { child.geometry?.dispose?.(); } catch {}
                    try { const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
                  });
                } catch {}
                excavationMaskRef.current = null;
              }

              const shapes: THREE.Shape[] = [];
              for (const poly of rotatedPolys) {
                if (!poly || poly.length < 3) continue;
                const shape = new THREE.Shape();
                const p0 = poly[0];
                shape.moveTo((p0.x - cx) * scale, (p0.y - cy) * scale);
                for (let i = 1; i < poly.length; i++) {
                  const p = poly[i];
                  shape.lineTo((p.x - cx) * scale, (p.y - cy) * scale);
                }
                shape.closePath();
                shapes.push(shape);
              }
              if (shapes.length) {
                const totalDepth = Math.max(0.001, layers * layerDepthWorld);
                const maskGeom = new THREE.ExtrudeGeometry(shapes, { depth: totalDepth, bevelEnabled: false });
                maskGeom.rotateX(Math.PI / 2);
                const mkBase: any = new THREE.MeshBasicMaterial({ colorWrite: false });
                mkBase.depthWrite = false; mkBase.depthTest = true;
                mkBase.stencilWrite = true; mkBase.stencilRef = 1;
                mkBase.stencilFunc = THREE.AlwaysStencilFunc;
                mkBase.stencilFail = THREE.KeepStencilOp;
                mkBase.stencilZFail = THREE.KeepStencilOp;
                mkBase.stencilZPass = THREE.ReplaceStencilOp;
                const mkFront = mkBase.clone(); mkFront.side = THREE.FrontSide; (mkFront as any).polygonOffset = true; (mkFront as any).polygonOffsetFactor = -1; (mkFront as any).polygonOffsetUnits = -1;
                const mkBack = mkBase.clone(); mkBack.side = THREE.BackSide; (mkBack as any).polygonOffset = true; (mkBack as any).polygonOffsetFactor = -1; (mkBack as any).polygonOffsetUnits = -1;
                const maskMeshFront = new THREE.Mesh(maskGeom, mkFront);
                const maskMeshBack = new THREE.Mesh(maskGeom.clone(), mkBack);
                maskMeshFront.renderOrder = 50; maskMeshBack.renderOrder = 50;
                const maskGroup = new THREE.Group(); maskGroup.name = 'EXCAVATION_STENCIL_MASK';
                maskGroup.add(maskMeshFront); maskGroup.add(maskMeshBack);
                // 对齐到域顶面中心
                try {
                  const bounds = domainBoundsRef.current;
                  if (bounds) {
                    const cxD = (bounds.xmin + bounds.xmax) / 2;
                    const czD = (bounds.ymin + bounds.ymax) / 2;
                    const yTopD = bounds.zmax;
                    maskGroup.position.set(cxD, yTopD, czD);
                  }
                } catch {}
                scene.add(maskGroup);
                excavationMaskRef.current = maskGroup;
              }
              }
            } catch {}

            // 将开挖实体对齐到当前“土层顶面”，并以域中心为 XY 原点
            try {
              const bounds = domainBoundsRef.current;
              if (bounds) {
                const cx = (bounds.xmin + bounds.xmax) / 2;
                const cz = (bounds.ymin + bounds.ymax) / 2;
                const yTop = bounds.zmax; // 顶面
                group.position.set(cx, yTop, cz);
              }
            } catch {}
            scene.add(group);

            // 若处于 'cut' 模式，尝试做真实布尔减法（CSG）；失败则保持遮罩方案
            try {
              if (excavationModeRef.current === 'cut' && domainSolidMeshRef.current && originalDomainGeomRef.current) {
                // 使用 three-csg-ts（动态导入，若失败则跳过）
                // @ts-ignore
                import(/* @vite-ignore */ 'three-csg-ts').then((mod:any)=>{
                  const { CSG } = mod;
                  // 先加载 BufferGeometryUtils（addons 或 jsm 任一可用）
                  const loadUtils = () => import('three/addons/utils/BufferGeometryUtils.js')
                    .catch(()=>import('three/examples/jsm/utils/BufferGeometryUtils.js'));
                  loadUtils().then((U:any)=>{
                    try {
                      const mergeGeometries = U.mergeGeometries || U.BufferGeometryUtils?.mergeGeometries;
                      // 收集坑体所有层的 world 几何
                      const geoms: THREE.BufferGeometry[] = [];
                      const meshes: THREE.Mesh[] = []; group.traverse((o:any)=>{ if (o.isMesh) meshes.push(o); });
                      for (const m of meshes) {
                        const g = m.geometry.clone(); g.applyMatrix4(m.matrixWorld);
                        geoms.push(g);
                      }
                      if (geoms.length === 0) return;
                      const merged = mergeGeometries ? mergeGeometries(geoms, true) : geoms.reduce((acc:any, g:any)=>acc?acc:g, null);
                      if (!merged) return;
                      const tmpMesh = new THREE.Mesh(merged, new THREE.MeshBasicMaterial());
                      const exCSG = CSG.fromMesh(tmpMesh);
                      // 原始域体（未改写几何 + 当前世界位姿）
                      const domainMesh = domainSolidMeshRef.current as THREE.Mesh | null;
                      const orig = originalDomainGeomRef.current as THREE.BufferGeometry | null;
                      if (!domainMesh || !orig) return;
                      const domGeomWorld = orig.clone();
                      domGeomWorld.applyMatrix4(domainMesh.matrixWorld);
                      const domMeshForCSG = new THREE.Mesh(domGeomWorld, new THREE.MeshBasicMaterial());
                      const domCSG = CSG.fromMesh(domMeshForCSG);
                      const subCSG = domCSG.subtract(exCSG);
                      const resultMesh = CSG.toMesh(subCSG, domainMesh.matrix.clone(), domainMesh.material as any);
                      resultMesh.position.copy(domainMesh.position);
                      // 替换域体
                      const parent = domainMesh.parent;
                      if (parent) {
                        parent.remove(domainMesh);
                        try { domainMesh.geometry.dispose(); } catch {}
                        domainSolidMeshRef.current = resultMesh;
                        parent.add(resultMesh);
                        // 重建边线
                        try {
                          if (domainEdgesRef.current) { parent.remove(domainEdgesRef.current); }
                          const newEdges = new THREE.EdgesGeometry(resultMesh.geometry as THREE.BufferGeometry);
                          const lineMat = new THREE.LineBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.9 });
                          const line = new THREE.LineSegments(newEdges, lineMat);
                          line.position.copy(resultMesh.position);
                          line.renderOrder = 999;
                          parent.add(line);
                          domainEdgesRef.current = line;
                        } catch {}
                        // 去掉遮罩与开挖实体组（只保留被减去的域体）
                        if (excavationMaskRef.current) { try { parent.remove(excavationMaskRef.current); } catch {} excavationMaskRef.current = null; }
                        try { scene.remove(group); } catch {}
                      }
                    } catch (e) { console.warn('CSG subtract failed, fallback to stencil mask', e); }
                  }).catch(()=>{/* utils 不可用则忽略，保留遮罩回退 */});
                }).catch(()=>{/* CSG 不可用则忽略，保留遮罩回退 */});
              }
            } catch {}

            // 视角自适应（可选，保留当前视角方向，仅调整距离）
            if (options?.autoFit !== false) {
              try {
                const box = new THREE.Box3().setFromObject(group);
                const center = new THREE.Vector3();
                box.getCenter(center);
                const sphere = new THREE.Sphere();
                box.getBoundingSphere(sphere);
                const cam = eng.camera;
                const controls = eng.orbitControls;
                const currDir = cam.position.clone().sub(controls.target).normalize();
                const fov = cam.fov * Math.PI / 180;
                const fitDist = (sphere.radius / Math.tan(fov / 2)) * 1.2; // 20% margin
                controls.target.copy(center);
                cam.position.copy(center.clone().add(currDir.multiplyScalar(fitDist)));
                cam.lookAt(center);
                controls.update();
              } catch {}
            }
          },
          /** 移除地连墙 */
          removeDiaphragmWall: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const group = scene.getObjectByName('DIAPHRAGM_WALL_GROUP');
            if (group) {
              scene.remove(group);
              group.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                } catch {}
              });
            }
          },

          /**
           * 基于路径（多段线）生成地连墙：按厚度t在路径两侧成带状体，沿 -Y 向下挖至深度
           * @param polylines 多边形或折线数组（闭合/不闭合均可）
           * @param params { thickness: 墙厚(世界单位会按 XY 缩放), depth: 下挖深度(世界单位), rotationAngleDeg?: number }
           */
          addDiaphragmWall: (
            polylines: Array<Array<{x:number;y:number}>>,
            params: { thickness: number; depth: number; rotationAngleDeg?: number },
            options?: { targetSize?: number; scaleMultiplier?: number; autoFit?: boolean }
          ) => {
            const eng = engineRef.current; if (!eng) return;
            if ((!polylines || polylines.length === 0)) {
              // 优先使用最近的开挖轮廓
              if (lastExcavationPolysRef.current && lastExcavationPolysRef.current.length) {
                polylines = lastExcavationPolysRef.current;
              }
            }
            if (!polylines || polylines.length === 0) return;
            const scene = eng.scene;
            // 清理旧墙
            const old = scene.getObjectByName('DIAPHRAGM_WALL_GROUP');
            if (old) {
              scene.remove(old);
              old.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try { const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
              });
            }

            // 旋转到统一坐标
            let srcMinX=Infinity, srcMinY=Infinity, srcMaxX=-Infinity, srcMaxY=-Infinity;
            polylines.forEach(line => line.forEach(p => { srcMinX=Math.min(srcMinX,p.x); srcMaxX=Math.max(srcMaxX,p.x); srcMinY=Math.min(srcMinY,p.y); srcMaxY=Math.max(srcMaxY,p.y); }));
            if (!isFinite(srcMinX) || !isFinite(srcMaxX) || !isFinite(srcMinY) || !isFinite(srcMaxY)) return;
            const c0x = (srcMinX+srcMaxX)/2, c0y = (srcMinY+srcMaxY)/2;
            const angleDeg = (params?.rotationAngleDeg ?? 0) % 360; 
            const angleRad = angleDeg * Math.PI / 180;
            const cosA = Math.cos(angleRad), sinA = Math.sin(angleRad);
            const rotateAboutC0 = (x:number, y:number) => {
              const dx = x - c0x, dy = y - c0y;
              return { x: c0x + dx * cosA - dy * sinA, y: c0y + dx * sinA + dy * cosA };
            };
            const rotatedPolys: Array<Array<{x:number;y:number}>> = polylines.map(poly => poly.map(p => rotateAboutC0(p.x, p.y)));
            let rotMinX=Infinity, rotMinY=Infinity, rotMaxX=-Infinity, rotMaxY=-Infinity;
            rotatedPolys.forEach(line => line.forEach(p => { rotMinX=Math.min(rotMinX,p.x); rotMaxX=Math.max(rotMaxX,p.x); rotMinY=Math.min(rotMinY,p.y); rotMaxY=Math.max(rotMaxY,p.y); }));
            const width = Math.max(1e-6, rotMaxX-rotMinX), height = Math.max(1e-6, rotMaxY-rotMinY);
            const cx = (rotMinX+rotMaxX)/2, cy = (rotMinY+rotMaxY)/2; // 旋转后包围盒中心
            const target = options?.targetSize ?? 200;
            const baseScale = Math.min(target/width, target/height);
            const scale = baseScale * (options?.scaleMultiplier ?? 1);

            const thicknessScaled = Math.max(0.001, Number(params.thickness ?? 0)) * scale;
            const depthWorld = Math.max(0.001, Number(params.depth ?? 0));

            const group = new THREE.Group();
            group.name = 'DIAPHRAGM_WALL_GROUP';

            const mat = new THREE.MeshPhysicalMaterial({ color: 0x5b6b7a, transparent: true, opacity: 0.55, depthWrite: false, side: THREE.DoubleSide, metalness: 0, roughness: 0.9 });
            const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: true, depthWrite: false });

            // 沿每段生成一块墙板（简单相交覆盖，转角处允许轻微重叠）
            // 存储面板元数据（用于锚杆布置）
            const wallPanels: Array<{ center:THREE.Vector3; segLen:number; angle:number; along:THREE.Vector3; outward:THREE.Vector3 }> = [];

            const buildSegment = (ax:number, ay:number, bx:number, by:number) => {
              const axs = (ax - cx) * scale, ays = (ay - cy) * scale;
              const bxs = (bx - cx) * scale, bys = (by - cy) * scale;
              const dx = bxs - axs, dz = bys - ays; // 注意：y(地质) -> Three 的 z
              const segLen = Math.max(1e-6, Math.hypot(dx, dz));
              const angle = Math.atan2(dz, dx); // 绕Y旋转角
              const geom = new THREE.BoxGeometry(segLen, depthWorld, thicknessScaled);
              const mesh = new THREE.Mesh(geom, mat);
              mesh.position.set((axs + bxs) / 2, -depthWorld/2, (ays + bys) / 2);
              mesh.rotation.y = angle;
              // 存入段元数据，便于后续布置锚杆
              (mesh as any).userData.__wallSeg = {
                segLen,
                thickness: thicknessScaled,
                angle,
              };
              group.add(mesh);

              // 加边线，提升可见度
              try {
                const edges = new THREE.EdgesGeometry(geom);
                const line = new THREE.LineSegments(edges, edgeMat);
                line.position.copy(mesh.position);
                line.rotation.copy(mesh.rotation as any);
                line.renderOrder = 998;
                group.add(line);
              } catch {}

              // 计算“外侧”法向：以包围盒中心近似多边形内部方向
              const midX = (axs + bxs) / 2; const midZ = (ays + bys) / 2;
              const along = new THREE.Vector3(dx, 0, dz).normalize();
              const nCandidate = new THREE.Vector3(-along.z, 0, along.x).normalize(); // 左法向
              // 使用当前 poly 的旋转后 bbox 中心 (cx,cy) 相对该段中点来判断内外
              const vToCenter = new THREE.Vector3((0), 0, (0));
              vToCenter.set((0),0,(0));
              vToCenter.x = - (0); // 保持编译器满意
              // 实际向量：
              const vecToBoxCenter = new THREE.Vector3(((rotMinX+rotMaxX)/2 - (ax+bx)/2)*scale, 0, ((rotMinY+rotMaxY)/2 - (ay+by)/2)*scale);
              const dot = nCandidate.dot(vecToBoxCenter.normalize());
              const outward = (dot > 0 ? nCandidate.clone().multiplyScalar(-1) : nCandidate).clone();
              wallPanels.push({ center: new THREE.Vector3(midX, -depthWorld/2, midZ), segLen, angle, along: along.clone(), outward });
            };

            for (const poly of rotatedPolys) {
              if (!poly || poly.length < 2) continue;
              for (let i=0; i<poly.length-1; i++) {
                const pA = poly[i]; const pB = poly[i+1];
                buildSegment(pA.x, pA.y, pB.x, pB.y);
              }
              // 若未闭合，自动补上首尾段，保证墙体围合
              const first = poly[0]; const last = poly[poly.length-1];
              const dxC = last.x - first.x; const dyC = last.y - first.y;
              if (Math.hypot(dxC, dyC) > 1e-6) {
                buildSegment(last.x, last.y, first.x, first.y);
              }
            }

            // 将墙体对齐到当前“土层顶面”，并以域中心为 XY 原点
            try {
              const bounds = domainBoundsRef.current;
              if (bounds) {
                const cxD = (bounds.xmin + bounds.xmax) / 2;
                const czD = (bounds.ymin + bounds.ymax) / 2;
                const yTopD = bounds.zmax; // 顶面
                group.position.set(cxD, yTopD, czD);
              }
            } catch {}
            // 将面板元数据挂到组上，供锚杆布置使用
            (group as any).userData.panels = wallPanels;
            (group as any).userData.thickness = thicknessScaled;
            scene.add(group);

            // 可选相机对焦
            if (options?.autoFit !== false) {
              try {
                const box = new THREE.Box3().setFromObject(group);
                const center = new THREE.Vector3(); box.getCenter(center);
                const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
                const cam = eng.camera; const controls = eng.orbitControls;
                const currDir = cam.position.clone().sub(controls.target).normalize();
                const fov = cam.fov * Math.PI / 180;
                const fitDist = (sphere.radius / Math.tan(fov / 2)) * 1.2;
                controls.target.copy(center);
                cam.position.copy(center.clone().add(currDir.multiplyScalar(fitDist)));
                cam.lookAt(center);
                controls.update();
              } catch {}
            }
          },

          /** 聚焦地连墙 */
          focusDiaphragmWall: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene; const group = scene.getObjectByName('DIAPHRAGM_WALL_GROUP');
            if (!group) return;
            try {
              const box = new THREE.Box3().setFromObject(group);
              const center = new THREE.Vector3(); box.getCenter(center);
              const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
              const cam = eng.camera; const controls = eng.orbitControls;
              const dir = cam.position.clone().sub(controls.target).normalize();
              const fov = cam.fov * Math.PI / 180;
              const dist = (sphere.radius / Math.tan(fov/2)) * 1.2;
              controls.target.copy(center); cam.position.copy(center.clone().add(dir.multiplyScalar(dist))); cam.lookAt(center); controls.update();
            } catch {}
          },
          /** 显隐地连墙 */
          setDiaphragmWallVisible: (visible:boolean) => {
            const eng = engineRef.current; if (!eng) return;
            const g = eng.scene.getObjectByName('DIAPHRAGM_WALL_GROUP'); if (g) g.visible = !!visible;
          },

          /**
           * 在地连墙上布置锚杆（均匀布置，沿外侧法线倾斜出墙）
           * params: { spacing, levels, firstLevelDepth, levelStep, length, diameter, angleDeg }
           */
          addWallAnchors: (params: { spacing: number; levels: number; firstLevelDepth: number; levelStep: number; length: number; diameter: number; angleDeg?: number }, style?: { showHead?: boolean; plateSize?: number; plateThickness?: number; headSize?: number }) => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) { console.warn('addWallAnchors: no wall group'); return; }
            // 清理旧
            const old = wallGroup.getObjectByName('ANCHOR_GROUP');
            if (old) {
              wallGroup.remove(old);
              old.traverse((child:any)=>{ try{child.geometry?.dispose?.();}catch{} try{ const m=child.material; if(Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); }catch{} });
            }
            const group = new THREE.Group(); group.name = 'ANCHOR_GROUP';
            const spacing = Math.max(0.2, Number(params.spacing||0));
            const levels = Math.max(1, Math.floor(params.levels||1));
            const firstDepth = Math.max(0.1, Number(params.firstLevelDepth||1));
            const step = Math.max(0.1, Number(params.levelStep||1));
            const length = Math.max(0.2, Number(params.length||3));
            const dia = Math.max(0.02, Number(params.diameter||0.15));
            const angle = (params.angleDeg ?? 10) * Math.PI / 180; // 向下倾角
            const yDown = new THREE.Vector3(0,-1,0);
            const cylGeomCache: Record<string, THREE.CylinderGeometry> = {};
            const getCyl = (len:number, r:number) => {
              const key = `${len.toFixed(3)}_${r.toFixed(3)}`; if (!cylGeomCache[key]) cylGeomCache[key]=new THREE.CylinderGeometry(r,r,len, 10, 1, false);
              return cylGeomCache[key];
            };
            const matRod = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 });
            const showHead = style?.showHead ?? true;
            const plateSize = Math.max(0.05, style?.plateSize ?? 0.4);
            const plateThk = Math.max(0.01, style?.plateThickness ?? 0.05);
            const headSize = Math.max(0.03, style?.headSize ?? 0.12);

            // 取域中心，用于判断“外侧”方向（法线与-指向中心一致则为外侧）
            const b = domainBoundsRef.current;
            const centerWorld = b? new THREE.Vector3((b.xmin+b.xmax)/2, (b.zmin+b.zmax)/2, (b.ymin+b.ymax)/2) : new THREE.Vector3();

            // 遍历每一块墙板（每段）
            const segMeshes: THREE.Mesh[] = [];
            wallGroup.traverse((o:any)=>{ if(o.isMesh && o.userData && o.userData.__wallSeg) segMeshes.push(o); });
            for (const m of segMeshes) {
              const seg = (m as any).userData.__wallSeg as { segLen:number; thickness:number; angle:number };
              const segLen = seg.segLen; const thickness = seg.thickness;
              if (segLen <= 0.01) continue;
              // 水平外法线（世界坐标）
              const nWorldHoriz = new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
              // 确定外侧：与指向中心向量相反
              const midLocal = new THREE.Vector3(0, -firstDepth, 0);
              const midWorld = m.localToWorld(midLocal.clone());
              const toCenter = centerWorld.clone().sub(midWorld).setY(0).normalize();
              let outward = nWorldHoriz.clone();
              if (outward.dot(toCenter) > 0) outward.multiplyScalar(-1); // 指向远离中心

              // 锚杆方向（带倾角）
              const dir = outward.clone().multiplyScalar(Math.cos(angle)).add(yDown.clone().multiplyScalar(Math.sin(angle))).normalize();
              const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);

              // 沿段均匀布置
              const usableLen = segLen - spacing; // 两端留边
              if (usableLen <= 0) continue;
              const count = Math.max(1, Math.floor(usableLen / spacing));
              for (let i=0;i<count;i++){
                const xLocal = -segLen/2 + spacing/2 + i*spacing;
                for (let lv=0; lv<levels; lv++){
                  const depth = firstDepth + lv*step;
                  const baseLocal = new THREE.Vector3(xLocal, -depth, thickness/2); // 从板外侧面出发（本地+Z）
                  // 若外侧被判为 -Z，则将局部Z取 -thickness/2
                  const zSign = (outward.dot(new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize()) >= 0) ? 1 : -1;
                  baseLocal.z = zSign * thickness/2 + 0.01; // 微偏移避免重叠
                  const baseWorld = m.localToWorld(baseLocal.clone());
                  const rod = new THREE.Mesh(getCyl(length, dia/2), matRod);
                  rod.quaternion.copy(quat);
                  // 默认圆柱沿 +Y，放置到“中点=起点+0.5*dir*len”
                  const centerPos = baseWorld.clone().add(dir.clone().multiplyScalar(length/2));
                  rod.position.copy(centerPos);
                  group.add(rod);

                  if (showHead) {
                    // 托盘：圆盘，法向与墙面外法线一致
                    const plateGeom = new THREE.CylinderGeometry(plateSize/2, plateSize/2, plateThk, 16, 1, false);
                    const plateMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.7 });
                    const plate = new THREE.Mesh(plateGeom, plateMat);
                    const qPlate = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), outward.clone().normalize());
                    plate.quaternion.copy(qPlate);
                    // 挨着墙外表面
                    const platePos = m.localToWorld(new THREE.Vector3(xLocal, -depth, zSign*thickness/2 + plateThk/2 + 0.002));
                    plate.position.copy(platePos);
                    group.add(plate);
                    // 锚头/螺母：小短圆柱，放在托盘外侧
                    const headGeom = new THREE.CylinderGeometry(headSize/2, headSize/2, headSize*0.5, 12, 1, false);
                    const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
                    const head = new THREE.Mesh(headGeom, headMat);
                    head.quaternion.copy(qPlate);
                    const headPos = platePos.clone().add(outward.clone().normalize().multiplyScalar(plateThk/2 + headSize*0.25 + 0.002));
                    head.position.copy(headPos);
                    group.add(head);
                  }
                }
              }
            }
            wallGroup.add(group); anchorsGroupRef.current = group;
          },

          /**
           * 自定义每一“道/层”锚杆的参数（深度、长度、直径、间距、倾角）
           */
          addWallAnchorsCustom: (levels: Array<{ depth:number; length:number; diameter:number; spacing:number; angleDeg?: number }>, style?: { showHead?: boolean; plateSize?: number; plateThickness?: number; headSize?: number }) => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) { console.warn('addWallAnchorsCustom: no wall group'); return; }
            // 清理旧
            const old = wallGroup.getObjectByName('ANCHOR_GROUP');
            if (old) {
              wallGroup.remove(old);
              old.traverse((child:any)=>{ try{child.geometry?.dispose?.();}catch{} try{ const m=child.material; if(Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); }catch{} });
            }
            const group = new THREE.Group(); group.name = 'ANCHOR_GROUP';
            const cylGeomCache: Record<string, THREE.CylinderGeometry> = {};
            const getCyl = (len:number, r:number) => { const key = `${len.toFixed(3)}_${r.toFixed(3)}`; return cylGeomCache[key] ||= new THREE.CylinderGeometry(r,r,len, 10, 1, false); };
            const matRod = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 });
            const showHead = style?.showHead ?? true;
            const plateSize = Math.max(0.05, style?.plateSize ?? 0.4);
            const plateThk = Math.max(0.01, style?.plateThickness ?? 0.05);
            const headSize = Math.max(0.03, style?.headSize ?? 0.12);
            const b = domainBoundsRef.current;
            const centerWorld = b? new THREE.Vector3((b.xmin+b.xmax)/2, (b.zmin+b.zmax)/2, (b.ymin+b.ymax)/2) : new THREE.Vector3();
            // 拿到所有墙段
            const segMeshes: THREE.Mesh[] = [];
            wallGroup.traverse((o:any)=>{ if(o.isMesh && o.userData && o.userData.__wallSeg) segMeshes.push(o); });
            for (const m of segMeshes) {
              const seg = (m as any).userData.__wallSeg as { segLen:number; thickness:number; angle:number };
              const segLen = seg.segLen; const thickness = seg.thickness;
              if (segLen <= 0.01) continue;
              const nWorldHoriz = new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
              const midWorld = m.localToWorld(new THREE.Vector3(0, 0, 0));
              const toCenter = centerWorld.clone().sub(midWorld).setY(0).normalize();
              let outwardHoriz = nWorldHoriz.clone(); if (outwardHoriz.dot(toCenter) > 0) outwardHoriz.multiplyScalar(-1);
              for (const lv of levels) {
                const depth = Math.max(0.05, Number(lv.depth||0));
                const length = Math.max(0.2, Number(lv.length||1));
                const dia = Math.max(0.02, Number(lv.diameter||0.1));
                const spacing = Math.max(0.2, Number(lv.spacing||2));
                const angle = (lv.angleDeg ?? 10) * Math.PI / 180;
                const dir = outwardHoriz.clone().multiplyScalar(Math.cos(angle)).add(new THREE.Vector3(0,-1,0).multiplyScalar(Math.sin(angle))).normalize();
                const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);
                const usableLen = segLen - spacing; if (usableLen <= 0) continue;
                const count = Math.max(1, Math.floor(usableLen / spacing));
                for (let i=0;i<count;i++){
                  const xLocal = -segLen/2 + spacing/2 + i*spacing;
                  const zSign = (outwardHoriz.dot(new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize()) >= 0) ? 1 : -1;
                  const baseLocal = new THREE.Vector3(xLocal, -depth, zSign*thickness/2 + 0.01);
                  const baseWorld = m.localToWorld(baseLocal.clone());
                  const rod = new THREE.Mesh(getCyl(length, dia/2), matRod);
                  rod.quaternion.copy(quat);
                  rod.position.copy(baseWorld.clone().add(dir.clone().multiplyScalar(length/2)));
                  group.add(rod);
                  if (showHead) {
                    const plateGeom = new THREE.CylinderGeometry(plateSize/2, plateSize/2, plateThk, 16, 1, false);
                    const plateMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.7 });
                    const plate = new THREE.Mesh(plateGeom, plateMat);
                    const qPlate = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), outwardHoriz.clone().normalize());
                    plate.quaternion.copy(qPlate);
                    const platePos = m.localToWorld(new THREE.Vector3(xLocal, -depth, zSign*thickness/2 + plateThk/2 + 0.002));
                    plate.position.copy(platePos);
                    group.add(plate);
                    const headGeom = new THREE.CylinderGeometry(headSize/2, headSize/2, headSize*0.5, 12, 1, false);
                    const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
                    const head = new THREE.Mesh(headGeom, headMat);
                    head.quaternion.copy(qPlate);
                    head.position.copy(platePos.clone().add(outwardHoriz.clone().normalize().multiplyScalar(plateThk/2 + headSize*0.25 + 0.002)));
                    group.add(head);
                  }
                }
              }
            }
            wallGroup.add(group); anchorsGroupRef.current = group;
          },

          /** 获取地连墙段元信息（按生成顺序） */
          getWallSegmentsMeta: (): Array<{ index:number; length:number; thickness:number }> => {
            const eng = engineRef.current; if (!eng) return [];
            const scene = eng.scene;
            const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) return [];
            const segs: Array<{ index:number; length:number; thickness:number }> = [];
            let idx = 0;
            for (const child of wallGroup.children) {
              const o: any = child as any;
              if (o.isMesh && o.userData && o.userData.__wallSeg) {
                const s = o.userData.__wallSeg as { segLen:number; thickness:number };
                segs.push({ index: idx, length: s.segLen, thickness: s.thickness });
              }
              idx++;
            }
            return segs;
          },

          /**
           * 逐根锚杆：按段索引与沿段距离自定义每一根
           * anchors: [{ segIndex:number; offset:number; depth:number; length:number; diameter:number; angleDeg?:number }]
           * - segIndex: 按生成顺序的墙段索引（可通过 getWallSegmentsMeta 获取）
           * - offset: 距该段起点的本地距离 (m)，范围 [0, segLen]
           */
          addWallAnchorsPerAnchor: (anchors: Array<{ segIndex:number; offset:number; depth:number; length:number; diameter:number; angleDeg?:number }>, style?: { showHead?: boolean; plateSize?: number; plateThickness?: number; headSize?: number }) => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) { console.warn('addWallAnchorsPerAnchor: no wall group'); return; }
            // 清理旧
            const old = wallGroup.getObjectByName('ANCHOR_GROUP');
            if (old) {
              wallGroup.remove(old);
              old.traverse((child:any)=>{ try{child.geometry?.dispose?.();}catch{} try{ const m=child.material; if(Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); }catch{} });
            }
            const group = new THREE.Group(); group.name = 'ANCHOR_GROUP';
            const matRod = new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 0.6, roughness: 0.4 });
            const cylGeomCache: Record<string, THREE.CylinderGeometry> = {};
            const getCyl = (len:number, r:number) => { const key = `${len.toFixed(3)}_${r.toFixed(3)}`; return cylGeomCache[key] ||= new THREE.CylinderGeometry(r,r,len, 10, 1, false); };
            const showHead = style?.showHead ?? true;
            const plateSize = Math.max(0.05, style?.plateSize ?? 0.4);
            const plateThk = Math.max(0.01, style?.plateThickness ?? 0.05);
            const headSize = Math.max(0.03, style?.headSize ?? 0.12);

            // 取域中心用于确定“外侧”水平法线朝向
            const b = domainBoundsRef.current;
            const centerWorld = b? new THREE.Vector3((b.xmin+b.xmax)/2, (b.zmin+b.zmax)/2, (b.ymin+b.ymax)/2) : new THREE.Vector3();

            // 收集墙段（按 children 顺序），并建立映射
            const segMeshes: THREE.Mesh[] = [];
            for (const child of wallGroup.children) {
              const o: any = child as any; if (o.isMesh && o.userData && o.userData.__wallSeg) segMeshes.push(o);
            }

            for (const a of anchors) {
              const segIdx = Math.max(0, Math.min(segMeshes.length-1, Math.floor(a.segIndex||0)));
              const m = segMeshes[segIdx]; if (!m) continue;
              const seg = (m as any).userData.__wallSeg as { segLen:number; thickness:number; angle:number };
              const segLen = seg.segLen; const thickness = seg.thickness;
              const offset = Math.max(0.01, Math.min(segLen-0.01, Number(a.offset||0)));
              const depth = Math.max(0.01, Number(a.depth||1));
              const length = Math.max(0.1, Number(a.length||3));
              const dia = Math.max(0.02, Number(a.diameter||0.15));
              const angle = (a.angleDeg ?? 10) * Math.PI / 180;

              // 计算外侧水平法线
              const nWorldHoriz = new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize();
              const midWorld = m.localToWorld(new THREE.Vector3(0, 0, 0));
              const toCenter = centerWorld.clone().sub(midWorld).setY(0).normalize();
              let outwardHoriz = nWorldHoriz.clone(); if (outwardHoriz.dot(toCenter) > 0) outwardHoriz.multiplyScalar(-1);
              const dir = outwardHoriz.clone().multiplyScalar(Math.cos(angle)).add(new THREE.Vector3(0,-1,0).multiplyScalar(Math.sin(angle))).normalize();
              const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), dir);

              // 段内横向位置（本地坐标的 X 轴）
              const xLocal = -segLen/2 + offset;
              const zSign = (outwardHoriz.dot(new THREE.Vector3(0,0,1).applyQuaternion(m.getWorldQuaternion(new THREE.Quaternion())).setY(0).normalize()) >= 0) ? 1 : -1;
              const baseLocal = new THREE.Vector3(xLocal, -depth, zSign*thickness/2 + 0.01);
              const baseWorld = m.localToWorld(baseLocal.clone());
              const rod = new THREE.Mesh(getCyl(length, dia/2), matRod);
              rod.quaternion.copy(quat);
              rod.position.copy(baseWorld.clone().add(dir.clone().multiplyScalar(length/2)));
              group.add(rod);
              if (showHead) {
                const plateGeom = new THREE.CylinderGeometry(plateSize/2, plateSize/2, plateThk, 16, 1, false);
                const plateMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.2, roughness: 0.7 });
                const plate = new THREE.Mesh(plateGeom, plateMat);
                const qPlate = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), outwardHoriz.clone().normalize());
                plate.quaternion.copy(qPlate);
                const platePos = m.localToWorld(new THREE.Vector3(xLocal, -depth, zSign*thickness/2 + plateThk/2 + 0.002));
                plate.position.copy(platePos);
                group.add(plate);
                const headGeom = new THREE.CylinderGeometry(headSize/2, headSize/2, headSize*0.5, 12, 1, false);
                const headMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.5, roughness: 0.4 });
                const head = new THREE.Mesh(headGeom, headMat);
                head.quaternion.copy(qPlate);
                head.position.copy(platePos.clone().add(outwardHoriz.clone().normalize().multiplyScalar(plateThk/2 + headSize*0.25 + 0.002)));
                group.add(head);
              }
            }

            wallGroup.add(group); anchorsGroupRef.current = group;
          },

          /** 移除锚杆 */
          removeWallAnchors: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) return;
            const group = wallGroup.getObjectByName('ANCHOR_GROUP');
            if (group) {
              wallGroup.remove(group);
              group.traverse((child:any)=>{ try{child.geometry?.dispose?.();}catch{} try{ const m=child.material; if(Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); }catch{} });
            }
            anchorsGroupRef.current = null;
          },

          /** 是否存在锚杆 */
          hasAnchors: (): boolean => {
            const eng = engineRef.current; if (!eng) return false;
            const wallGroup = eng.scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) return false;
            return !!wallGroup.getObjectByName('ANCHOR_GROUP');
          },
          /** 聚焦锚杆 */
          focusAnchors: () => {
            const eng = engineRef.current; if (!eng) return;
            const wallGroup = eng.scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) return;
            const group = wallGroup.getObjectByName('ANCHOR_GROUP'); if (!group) return;
            try {
              const box = new THREE.Box3().setFromObject(group);
              const center = new THREE.Vector3(); box.getCenter(center);
              const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
              const cam = eng.camera; const controls = eng.orbitControls;
              const dir = cam.position.clone().sub(controls.target).normalize();
              const fov = cam.fov * Math.PI / 180;
              const dist = (sphere.radius / Math.tan(fov/2)) * 1.2;
              controls.target.copy(center); cam.position.copy(center.clone().add(dir.multiplyScalar(dist))); cam.lookAt(center); controls.update();
            } catch {}
          },
          /** 高亮锚杆（置顶渲染、发光），再次调用可恢复 */
          setAnchorsHighlight: (highlight:boolean) => {
            const eng = engineRef.current; if (!eng) return;
            const wallGroup = eng.scene.getObjectByName('DIAPHRAGM_WALL_GROUP') as THREE.Group | null;
            if (!wallGroup) return;
            const group = wallGroup.getObjectByName('ANCHOR_GROUP') as THREE.Group | null; if (!group) return;
            group.traverse((o:any)=>{
              if (!o.isMesh) return;
              if (highlight) {
                if (!o.userData.__origMat) o.userData.__origMat = o.material;
                const m = (o.material as any).clone?.() || o.material;
                try { m.emissive = new THREE.Color(0xffe066); m.emissiveIntensity = 0.8; } catch {}
                m.transparent = true; m.opacity = 1; m.depthTest = false; m.depthWrite = false; o.renderOrder = 999;
                o.material = m;
              } else if (o.userData.__origMat) {
                const m = o.userData.__origMat; o.material = m; delete o.userData.__origMat; o.renderOrder = 0;
              }
            });
          },

          // 兼容旧面板方法名/参数
      addAnchorsOnWall: (p: { length:number; diameter:number; pitchDeg?:number; rows:number; startOffset:number; rowSpacing:number; spacing:number }, style?: { showHead?: boolean; plateSize?: number; plateThickness?: number; headSize?: number }) => {
            try {
              (window as any).__CAE_ENGINE__?.addWallAnchors({
                length: p.length,
                diameter: p.diameter,
                angleDeg: p.pitchDeg ?? 10,
                levels: Math.max(1, Math.floor(p.rows||1)),
                firstLevelDepth: p.startOffset,
                levelStep: p.rowSpacing,
                spacing: p.spacing,
        }, style);
              return true;
            } catch { return false; }
          },
          removeAnchors: () => { try { (window as any).__CAE_ENGINE__?.removeWallAnchors(); } catch {} },
          
          
          /**
           * 清空场景中的所有对象（不销毁渲染器/相机/控制器），默认删除画布中的所有内容。
           */
          clearAll: () => {
            const eng = engineRef.current;
            if (!eng) return;
            const scene = eng.scene;
            // 进入空画布模式，避免自动补齐网格/地面
            try { eng.blankMode = true; } catch {}
            // 记录并移除所有子对象
            const children = [...scene.children];
            children.forEach(obj => {
              scene.remove(obj);
              obj.traverse?.((child: any) => {
                if (child.geometry) try { child.geometry.dispose(); } catch {}
                if (child.material) {
                  try {
                    const m = child.material; if (Array.isArray(m)) m.forEach((mm: any)=>mm.dispose()); else m.dispose();
                  } catch {}
                }
                if (child.texture) { try { child.texture.dispose?.(); } catch {} }
              });
            });
            dxfOverlayRef.current = null;
            try {
              const bounds = domainBoundsRef.current;
              if (bounds) {
                const cx = (bounds.xmin + bounds.xmax) / 2;
                const cy = (bounds.zmin + bounds.zmax) / 2;
                const cz = (bounds.ymin + bounds.ymax) / 2;
                eng.orbitControls.target.set(cx, cy, cz);
              }
              eng.orbitControls.update();
            } catch {}
          },
          /** 恢复默认画布元素（网格/地面等），退出空画布模式 */
          restoreDefaults: () => {
            const eng = engineRef.current;
            if (!eng) return;
            try { eng.blankMode = false; } catch {}
            // 下一帧 render() 会自动检测并补充缺失的网格/地面等
          },
          /** 禁止自动补全网格/地面等辅助元素 */
          disableHelpers: () => { const eng = engineRef.current; if (eng) eng.blankMode = true; },
          /** 允许自动补全网格/地面等辅助元素 */
          enableHelpers: () => { const eng = engineRef.current; if (eng) eng.blankMode = false; },
          /** 仅隐藏/移除中心网格（abaqus-grid） */
          hideGrid: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const grid = scene.getObjectByName('abaqus-grid');
            if (grid) {
              scene.remove(grid);
              grid.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                } catch {}
              });
            }
          },
          /** 显示中心网格（若已移除则重新添加） */
          showGrid: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const exists = scene.getObjectByName('abaqus-grid');
            if (exists) return;
            // 直接创建一个与默认近似的双层网格
            try {
              const group = new THREE.Group();
              group.name = 'abaqus-grid';
              const mainGrid = new THREE.GridHelper(100, 20, 0x5a6c7d, 0x3d4c5c) as any;
              if (mainGrid.material) { mainGrid.material.opacity = 0.8; mainGrid.material.transparent = true; }
              group.add(mainGrid);
              const fineGrid = new THREE.GridHelper(100, 100, 0x3d4c5c, 0x2c3e50) as any;
              if (fineGrid.material) { fineGrid.material.opacity = 0.3; fineGrid.material.transparent = true; }
              group.add(fineGrid);
              scene.add(group);
            } catch {}
          },
          /** 仅隐藏/移除地面大平面（abaqus-ground） */
          hideGround: () => {
            const eng = engineRef.current; if (!eng) return;
            const scene = eng.scene;
            const ground = scene.getObjectByName('abaqus-ground');
            if (ground) {
              scene.remove(ground);
              ground.traverse((child: any) => {
                try { child.geometry?.dispose?.(); } catch {}
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.();
                } catch {}
              });
            }
          },
          /** 获取当前相机方位角(绕Y轴) 0-360 度 */
          getCameraAzimuthDeg: () => {
            const eng = engineRef.current; if (!eng) return 0;
            try {
              // @ts-ignore three typings
              const rad = eng.orbitControls?.getAzimuthalAngle ? eng.orbitControls.getAzimuthalAngle() : 0;
              const deg = (rad * 180 / Math.PI) % 360;
              return (deg + 360) % 360;
            } catch { return 0; }
          },
          /** 订阅相机方位角变化，返回取消订阅函数 */
          subscribeCameraAzimuth: (cb: (deg:number)=>void) => {
            const eng = engineRef.current; if (!eng) return () => {};
            const handler = () => {
              try {
                // @ts-ignore
                const rad = eng.orbitControls?.getAzimuthalAngle ? eng.orbitControls.getAzimuthalAngle() : 0;
                const deg = (rad * 180 / Math.PI) % 360;
                cb((deg + 360) % 360);
              } catch {}
            };
            try { eng.orbitControls?.addEventListener?.('change', handler); } catch {}
            return () => { try { eng.orbitControls?.removeEventListener?.('change', handler); } catch {} };
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

  // 订阅地质面板的计算域更新，渲染“实体”盒（半透明 Mesh + 边框 + 角点）
  useEffect(() => {
    const off = eventBus.on('geology:domain:update', (payload: any) => {
      try {
        const eng = engineRef.current; if (!eng) return;
        const scene = eng.scene;
        const b = payload?.bounds;
        if (!b) return;
  // 记录最近的域范围（供钻孔可视化裁剪使用）
  domainBoundsRef.current = { xmin:Number(b.xmin), xmax:Number(b.xmax), ymin:Number(b.ymin), ymax:Number(b.ymax), zmin:Number(b.zmin), zmax:Number(b.zmax) };
        const sx = Math.max(1e-6, (b.xmax - b.xmin));
        const sy = Math.max(1e-6, (b.zmax - b.zmin)); // 注意：引擎使用 Y 轴为竖直，对应地质 z
        const sz = Math.max(1e-6, (b.ymax - b.ymin));
        const cx = (b.xmin + b.xmax) / 2;
        const cy = (b.zmin + b.zmax) / 2;
        const cz = (b.ymin + b.ymax) / 2;

        // 若已存在，先移除旧的
        if (domainBoxRef.current) {
          try {
            scene.remove(domainBoxRef.current);
            domainBoxRef.current.traverse((child: any) => {
              if (child.geometry) { try { child.geometry.dispose(); } catch {} }
              if (child.material) {
                try {
                  const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m.dispose();
                } catch {}
              }
            });
          } catch {}
          domainBoxRef.current = null;
          domainSolidMeshRef.current = null;
          domainEdgesRef.current = null;
          try { originalDomainGeomRef.current?.dispose?.(); } catch {}
          originalDomainGeomRef.current = null;
        }

        // 构造实体盒组
        const group = new THREE.Group();
        group.name = 'GEOLOGY_DOMAIN_BOX';

        // 半透明实体
  const geom = new THREE.BoxGeometry(sx, sy, sz);
        const mat = new THREE.MeshPhysicalMaterial({
          color: 0xffd666,
          transparent: true,
          opacity: 0.18,
          depthWrite: false,
          roughness: 0.9,
          metalness: 0.0,
          side: THREE.DoubleSide
        });
        // 允许通过模板缓冲“挖空”：仅在模板==0 时渲染（开挖遮罩会把模板写为1）
        try {
          (mat as any).stencilWrite = true;
          (mat as any).stencilRef = 0;
          (mat as any).stencilFunc = THREE.EqualStencilFunc;
          (mat as any).stencilFail = THREE.KeepStencilOp;
          (mat as any).stencilZFail = THREE.KeepStencilOp;
          (mat as any).stencilZPass = THREE.KeepStencilOp;
        } catch {}
  const mesh = new THREE.Mesh(geom, mat);
        mesh.renderOrder = 100;
        mesh.position.set(cx, cy, cz);
        group.add(mesh);
  // 保存引用与原始几何（供 CSG 与还原）
  domainSolidMeshRef.current = mesh;
  try { originalDomainGeomRef.current?.dispose?.(); } catch {}
  originalDomainGeomRef.current = geom.clone();

        // 边框
        try {
          const edges = new THREE.EdgesGeometry(geom);
          const lineMat = new THREE.LineBasicMaterial({ color: 0xffc53d, transparent: true, opacity: 0.9 });
          const line = new THREE.LineSegments(edges, lineMat);
          line.position.copy(mesh.position);
          line.renderOrder = 999;
          group.add(line);
          domainEdgesRef.current = line;
        } catch {}

  // 不显示角点圆点（按需可在此添加角标/轴标识）

        scene.add(group);
        domainBoxRef.current = group;

  // 首次自动对焦
        if (!domainAutoFitDoneRef.current) {
          try {
            const box = new THREE.Box3().setFromObject(group);
            const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
            const cam = eng.camera; const controls = eng.orbitControls;
            const currDir = cam.position.clone().sub(controls.target).normalize();
            const fov = cam.fov * Math.PI / 180;
            const fitDist = (sphere.radius / Math.tan(fov / 2)) * 1.25; // 稍加余量
            controls.target.copy(new THREE.Vector3(cx, cy, cz));
            cam.position.copy(new THREE.Vector3(cx, cy, cz).add(currDir.multiplyScalar(fitDist)));
            cam.lookAt(cx, cy, cz);
            controls.update();
            domainAutoFitDoneRef.current = true;
          } catch {}
        }

  // 若钻孔已存在，随域变化重建一次，保证始终处于土体内
        if (boreholesDataRef.current) {
          try {
            // 触发一次重建：复用同一事件逻辑
            const { holes, options } = boreholesDataRef.current;
            eventBus.emit('geology:boreholes:update', { holes, options });
          } catch {}
        }

        // 域变化时，同步对齐 DXF 覆盖层与开挖实体到“新顶面”与“新中心”
        try {
          const cxNew = cx, cyTop = b.zmax + 0.1, czNew = cz;
          if (dxfOverlayRef.current) {
            dxfOverlayRef.current.position.set(cxNew, cyTop, czNew);
          }
          const exGroup = scene.getObjectByName('EXCAVATION_GROUP');
          if (exGroup) {
            (exGroup as THREE.Group).position.set(cxNew, b.zmax, czNew);
          }
          if (excavationMaskRef.current) {
            excavationMaskRef.current.position.set(cxNew, b.zmax, czNew);
          }
          const wallGroup = scene.getObjectByName('DIAPHRAGM_WALL_GROUP');
          if (wallGroup) {
            (wallGroup as THREE.Group).position.set(cxNew, b.zmax, czNew);
          }
        } catch {}
      } catch {}
    });
    return () => { try { off?.(); } catch {} };
  }, []);

  // 订阅钻孔更新：在当前土体内显示竖向线段（轻量渲染）
  useEffect(() => {
    const off = eventBus.on('geology:boreholes:update', (payload:any) => {
      try {
        const eng = engineRef.current; if (!eng) return;
        const scene = eng.scene;
        const bounds = domainBoundsRef.current;
        // 记录最新数据（以便域变化时重建）
        boreholesDataRef.current = { holes: payload?.holes || [], options: payload?.options };

        // 清理旧组
        if (boreholesGroupRef.current) {
          try {
            scene.remove(boreholesGroupRef.current);
            boreholesGroupRef.current.traverse((child:any)=>{
              try { child.geometry?.dispose?.(); } catch {}
              try { const m = child.material; if (Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
            });
          } catch {}
          boreholesGroupRef.current = null;
        }

  const show = payload?.options?.show !== false;
  const holes:any[] = payload?.holes || [];
  if (!holes.length) return; // 无孔不渲染
  // 允许在缺少域信息时按数据自推边界（保证上传后立即可见）
  let b = bounds as any;
  if (!b) {
    try {
      const xs:number[] = []; const ys:number[] = []; const zsTop:number[] = []; const zsBot:number[] = [];
      for (const h of holes) {
        const x = Number(h.x); const y = Number(h.y); if (!isFinite(x) || !isFinite(y)) continue;
        xs.push(x); ys.push(y);
        const elev = Number(h.elevation ?? 0);
        const L = h.layers || [];
        if (L.length) {
          for (const l of L){ const t=Number(l.topDepth??0), bt=Number(l.bottomDepth??t+1); zsTop.push(elev - t); zsBot.push(elev - bt); }
        } else {
          zsTop.push(elev); zsBot.push(elev - 10);
        }
      }
      if (xs.length) {
        const min = (a:number[])=> Math.min(...a); const max = (a:number[])=> Math.max(...a);
        b = {
          xmin: min(xs), xmax: max(xs),
          ymin: min(ys), ymax: max(ys),
          zmin: Math.min(min(zsTop), min(zsBot)) - 1,
          zmax: Math.max(max(zsTop), max(zsBot)) + 1,
        };
      }
    } catch {}
  }
  if (!b) return;

        // 渲染每孔的“分层彩色线段”——按孔的 layers 拼接为多段线，支持顶/底深度
  const { xmin,xmax,ymin,ymax,zmin,zmax } = b;
        const positions: number[] = [];
        const colors: number[] = [];
        const palette = [0x6e7074,0xffa502,0xffd666,0x52c41a,0x40a9ff,0x9254de,0xeb2f96,0x13c2c2,0xfa8c16,0xa0d911];
        const norm = (s:any)=> String(s||'').trim().toLowerCase();
        const colorFor = (name:string, idx:number)=>{
          const key = norm(name)||`l${idx+1}`;
          // 简易哈希到调色板
          let h=0; for(let i=0;i<key.length;i++){ h=(h*131 + key.charCodeAt(i))>>>0; }
          return palette[h % palette.length];
        };
        const ignoreDomain = !!payload?.options?.ignoreDomain;
        const fullColumn = !!payload?.options?.fullColumn;
        for (const h of holes) {
          const x = Number(h.x), y = Number(h.y);
          if (!isFinite(x) || !isFinite(y)) continue;
          if (!ignoreDomain && (x < xmin || x > xmax || y < ymin || y > ymax)) continue;
          if (fullColumn) {
            // 强制整根显示：从域顶到域底
            const topY = zmax; const botY = zmin;
            positions.push(x, topY, y, x, botY, y);
            const c = new THREE.Color(0x00b3ff); colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
          } else {
            const elev = Number(h.elevation ?? 0);
            const L = h.layers || [];
            let segCount = 0;
            if (!L.length) {
              // 无分层：整根
              const topY = zmax; const botY = zmin;
              positions.push(x, topY, y, x, botY, y);
              const c = new THREE.Color(0x1890ff); colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
              segCount++;
            } else {
              for (let i=0;i<L.length;i++){
                const name = L[i].name || `L${i+1}`;
                const t = Number(L[i].topDepth ?? 0); const bdep = Number(L[i].bottomDepth ?? (t+1));
                let topY = elev - t; let botY = elev - bdep;
                if (!isFinite(topY) || !isFinite(botY)) continue;
                // 限制到域范围
                topY = Math.max(zmin, Math.min(zmax, topY));
                botY = Math.max(zmin, Math.min(zmax, botY));
                if (topY < botY) { const tmp = topY; topY = botY; botY = tmp; }
                if (Math.abs(topY - botY) < 1e-6) continue;
                positions.push(x, topY, y, x, botY, y);
                const hex = colorFor(name, i); const c = new THREE.Color(hex);
                colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
                segCount++;
              }
            }
            // 若没有有效分段，回退整根，确保“从上到下”可见
            if (segCount === 0) {
              const topY = zmax; const botY = zmin;
              positions.push(x, topY, y, x, botY, y);
              const c = new THREE.Color(0x1890ff); colors.push(c.r,c.g,c.b,c.r,c.g,c.b);
            }
          }
        }

        if (show && positions.length > 0) {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
          geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
          // 可选的“总在最上层”渲染：当 alwaysOnTop=true 时禁用深度测试，保证在域盒上可见
          const alwaysOnTop = !!payload?.options?.alwaysOnTop;
          const opacity = Math.max(0.1, Math.min(1, payload?.options?.opacity ?? 0.85));
          const mat = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: opacity < 1,
            opacity,
            depthTest: !alwaysOnTop,
            depthWrite: false
          });
          const lines = new THREE.LineSegments(geom, mat);
          // 提高渲染顺序，确保在域盒之后、土层之前可见；若 alwaysOnTop 再抬高
          lines.renderOrder = alwaysOnTop ? 1000 : 200;
          const group = new THREE.Group(); group.name = 'GEOLOGY_BOREHOLES_GROUP'; group.add(lines);
          // 组整体提高渲染顺序
          group.renderOrder = alwaysOnTop ? 1000 : 200;
          scene.add(group);
          boreholesGroupRef.current = group;

          // 可选：首次导入时自动对焦到钻孔
          if (payload?.options?.autoFit) {
            try {
              const box = new THREE.Box3().setFromObject(group);
              const center = new THREE.Vector3(); box.getCenter(center);
              const sphere = new THREE.Sphere(); box.getBoundingSphere(sphere);
              const cam = eng.camera; const controls = eng.orbitControls;
              const dir = cam.position.clone().sub(controls.target).normalize();
              const fov = cam.fov * Math.PI / 180;
              const dist = (sphere.radius / Math.tan(fov/2)) * 1.2;
              controls.target.copy(center); cam.position.copy(center.clone().add(dir.multiplyScalar(dist))); cam.lookAt(center); controls.update();
            } catch {}
          }
        }

        // 同步重建“土层填充”（基于钻孔的层面 IDW 插值，生成每层的顶部/底部曲面）
        try {
          const soilOpt = payload?.options?.soilLayers;
          soilLayersVisibleRef.current = !!soilOpt?.enabled;
          if (typeof soilOpt?.opacity === 'number') soilLayersOpacityRef.current = Math.max(0.05, Math.min(1, Number(soilOpt.opacity)));
          // 先清理旧土层
          if (soilLayersGroupRef.current) {
            scene.remove(soilLayersGroupRef.current);
            soilLayersGroupRef.current.traverse((child:any)=>{
              try { child.geometry?.dispose?.(); } catch {}
              try { const m=child.material; if(Array.isArray(m)) m.forEach((mm:any)=>mm.dispose()); else m?.dispose?.(); } catch {}
            });
            soilLayersGroupRef.current = null;
          }
          if (soilLayersVisibleRef.current && holes.length && bounds) {
            const { xmin,xmax,ymin,ymax,zmin,zmax } = bounds;
            const palette = [0x6e7074,0xffa502,0xffd666,0x52c41a,0x40a9ff,0x9254de,0xeb2f96,0x13c2c2,0xfa8c16,0xa0d911];
            // 1) 按层名归并（无名则退化为索引）
            const norm = (s:any)=> String(s||'').trim().toLowerCase();
            interface Sample { x:number; y:number; topY:number; botY:number; name:string; idx:number }
            const byKey: Record<string, Sample[]> = {};
            let maxLayers=0;
            for (const h of holes){ maxLayers = Math.max(maxLayers, (h.layers?.length||0)); }
            for (const h of holes){
              const elev = Number(h.elevation ?? 0);
              const L = h.layers||[];
              for (let k=0;k<L.length;k++){
                const name = L[k].name!=null && String(L[k].name).trim()? String(L[k].name): `L${k+1}`;
                const key = norm(name) || `l${k+1}`;
                const t = Number(L[k].topDepth ?? 0); const b = Number(L[k].bottomDepth ?? (t+1));
                const topY = elev - t; const botY = elev - b;
                if (!isFinite(topY) || !isFinite(botY)) continue;
                (byKey[key] ||= []).push({ x:Number(h.x), y:Number(h.y), topY, botY, name, idx:k });
              }
            }

            // 2) IDW 插值函数
            const idw = (x:number, y:number, arr: Sample[], pick: 'topY'|'botY', k=6, p=2)=>{
              if (!arr.length) return (zmin+zmax)/2;
              // 零距离命中
              for (const s of arr){ const dx=s.x-x, dy=s.y-y; const d2=dx*dx+dy*dy; if (d2===0) return s[pick]; }
              // 取最近 k 个
              const withDist = arr.map(s=>{ const dx=s.x-x, dy=s.y-y; const d=Math.sqrt(dx*dx+dy*dy); return { s, d }; });
              withDist.sort((a,b)=> a.d-b.d);
              const take = withDist.slice(0, Math.min(k, withDist.length));
              let num=0, den=0; for (const it of take){ const w = 1/Math.pow(it.d+1e-6, p); num += w * (it.s as any)[pick]; den += w; }
              const val = den>0? num/den : (zmin+zmax)/2;
              return Math.min(zmax, Math.max(zmin, val));
            };

            // 3) 网格化生成每层的“顶部/底部高度场”并构建曲面网格
            const gx = 48, gy = 48; // 栅格分辨率（可调）
            const dx = (xmax - xmin) / (gx - 1);
            const dy = (ymax - ymin) / (gy - 1);
            const mkHeightfield = (samples: Sample[], pick:'topY'|'botY')=>{
              const positions = new Float32Array(gx*gy*3);
              let ptr=0;
              for (let j=0;j<gy;j++){
                const yy = ymin + j*dy;
                for (let i=0;i<gx;i++){
                  const xx = xmin + i*dx;
                  const yyTop = idw(xx, yy, samples, pick);
                  positions[ptr++] = xx;
                  positions[ptr++] = yyTop; // Three 的 Y = 地质 z
                  positions[ptr++] = yy;
                }
              }
              const indices:number[] = [];
              for (let j=0;j<gy-1;j++){
                for (let i=0;i<gx-1;i++){
                  const a = j*gx + i;
                  const b = a + 1;
                  const c = (j+1)*gx + i;
                  const d = c + 1;
                  indices.push(a,b,d, a,d,c); // 两个三角形
                }
              }
              const geom = new THREE.BufferGeometry();
              geom.setAttribute('position', new THREE.BufferAttribute(positions,3));
              geom.setIndex(indices);
              geom.computeVertexNormals();
              return geom;
            };

            const g = new THREE.Group(); g.name = 'GEOLOGY_SOIL_LAYERS_GROUP';
            let layerOrder=0;
            for (const [key, samples] of Object.entries(byKey)){
              if (!samples.length) continue;
              const color = palette[layerOrder % palette.length];
              // 体块：将顶/底高度场与四周边界连成封闭体
              const geomTop = mkHeightfield(samples, 'topY');
              const geomBot = mkHeightfield(samples, 'botY');
              const posTop = geomTop.getAttribute('position') as THREE.BufferAttribute;
              const posBot = geomBot.getAttribute('position') as THREE.BufferAttribute;
              const nVerts = posTop.count;
              // 合并顶/底顶点
              const positionsTB = new Float32Array(nVerts*2*3);
              positionsTB.set(posTop.array as Float32Array, 0);
              positionsTB.set(posBot.array as Float32Array, nVerts*3);
              const indices:number[] = [];
              // 顶面（保持几何 winding）
              const idxTop = (geomTop.getIndex()?.array as any) as ArrayLike<number> | null;
              if (idxTop){ for (let i=0;i<idxTop.length;i+=3){ indices.push(idxTop[i]!, idxTop[i+1]!, idxTop[i+2]!); } }
              // 底面（反向）
              const idxBot = (geomBot.getIndex()?.array as any) as ArrayLike<number> | null;
              if (idxBot){ for (let i=0;i<idxBot.length;i+=3){ indices.push(nVerts + idxBot[i+2]!, nVerts + idxBot[i+1]!, nVerts + idxBot[i]!); } }
              // 四周侧壁（围绕网格外圈）
              // 通过上下顶点坐标推断网格尺寸：此处直接与 mkHeightfield 的分辨率保持一致
              const GX = 48, GY = 48;
              const vTop = (i:number,j:number)=> j*GX + i;
              const vBot = (i:number,j:number)=> nVerts + j*GX + i;
              // 下边缘 j=0
              for (let i=0;i<GX-1;i++){
                const a=vTop(i,0), b=vTop(i+1,0), a2=vBot(i,0), b2=vBot(i+1,0);
                indices.push(a,b,b2, a,b2,a2);
              }
              // 上边缘 j=GY-1
              for (let i=0;i<GX-1;i++){
                const j=GY-1; const a=vTop(i,j), b=vTop(i+1,j), a2=vBot(i,j), b2=vBot(i+1,j);
                indices.push(a2,b2,b, a2,b,a);
              }
              // 左边缘 i=0
              for (let j=0;j<GY-1;j++){
                const a=vTop(0,j), b=vTop(0,j+1), a2=vBot(0,j), b2=vBot(0,j+1);
                indices.push(a,b,b2, a,b2,a2);
              }
              // 右边缘 i=GX-1
              for (let j=0;j<GY-1;j++){
                const i=GX-1; const a=vTop(i,j), b=vTop(i,j+1), a2=vBot(i,j), b2=vBot(i,j+1);
                indices.push(a2,b2,b, a2,b,a);
              }
              const geom = new THREE.BufferGeometry();
              geom.setAttribute('position', new THREE.BufferAttribute(positionsTB,3));
              geom.setIndex(indices);
              geom.computeVertexNormals();
              const mat = new THREE.MeshStandardMaterial({ color, transparent: true, opacity: soilLayersOpacityRef.current, roughness: 0.95, metalness: 0.0, side: THREE.DoubleSide, depthWrite: false });
              const slab = new THREE.Mesh(geom, mat); slab.name = `soil-${key}-slab`; slab.renderOrder = 150; g.add(slab);
              try {
                const edges = new THREE.EdgesGeometry(geom);
                const lineMat = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.15 });
                const line = new THREE.LineSegments(edges, lineMat); line.renderOrder = 998; g.add(line);
              } catch {}
              layerOrder++;
            }
            if (g.children.length){ scene.add(g); soilLayersGroupRef.current = g; g.visible = soilLayersVisibleRef.current; }
          }
        } catch {}
      } catch {}
    });
    return () => { try { off?.(); } catch {} };
  }, []);

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

  // （已合并到“实体盒”订阅中）

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