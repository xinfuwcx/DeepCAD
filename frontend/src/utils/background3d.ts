// Background3D class
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

/**
 * Background3D类选项
 */
export interface Background3DOptions {
  gridSize?: number;
  gridDivisions?: number;
  gridColor1?: number;
  gridColor2?: number;
  backgroundColor?: number;
  axisLength?: number;
  showGrid?: boolean;
  showAxes?: boolean;
}

/**
 * Background3D类 - 创建三维场景背景和坐标系
 */
export class Background3D {
  container: HTMLElement;
  options: Background3DOptions;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  cornerCoordinateSystem?: THREE.Group;

  /**
   * 创建3D背景渲染器
   * @param container - 容器元素
   * @param options - 配置选项
   */
  constructor(container: HTMLElement, options: Background3DOptions = {}) {
    this.container = container;
    this.options = Object.assign({
      gridSize: 100,
      gridDivisions: 100,
      gridColor1: 0xCCCCCC,
      gridColor2: 0xAAAAAA,
      backgroundColor: 0xF7F7F7,
      axisLength: 50,
      showGrid: true,
      showAxes: true
    }, options);

    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor || 0xF7F7F7);
    this.scene.fog = new THREE.Fog(this.options.backgroundColor || 0xF7F7F7, 500, 1000);

    // 创建相机
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    this.camera.position.set(100, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.container.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  /**
   * 初始化3D场景
   */
  init(): void {
    // 添加环境光和平行光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 1);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);

    // 添加网格地面
    if (this.options.showGrid) {
      this.addGridGround();
    }

    // 添加坐标轴
    if (this.options.showAxes) {
      this.addCoordinateSystem();
    }

    // 处理窗口大小变化
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 开始动画循环
    this.animate();
  }

  /**
   * 添加网格地面
   */
  addGridGround(): void {
    // 创建带有渐变的网格地面
    const size = this.options.gridSize || 100;
    const divisions = this.options.gridDivisions || 100;
    
    // 主网格
    const gridHelper = new THREE.GridHelper(size, divisions, this.options.gridColor1, this.options.gridColor2);
    gridHelper.position.y = 0;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.6;
    this.scene.add(gridHelper);
    
    // 创建渐变地面
    const groundGeometry = new THREE.PlaneGeometry(size, size);
    const groundMaterial = new THREE.MeshBasicMaterial({
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.1,
      color: 0xCCCCCC,
      depthWrite: false
    });
    
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.01; // 略高于网格，避免z-fighting
    this.scene.add(ground);
  }

  /**
   * 添加坐标系
   */
  addCoordinateSystem(): void {
    // 创建坐标轴
    const axisLength = this.options.axisLength || 50;
    
    // X轴 - 红色
    const xAxisGeometry = new THREE.CylinderGeometry(0.2, 0.2, axisLength, 10);
    const xAxisMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const xAxis = new THREE.Mesh(xAxisGeometry, xAxisMaterial);
    xAxis.position.set(axisLength / 2, 0, 0);
    xAxis.rotation.z = -Math.PI / 2;
    this.scene.add(xAxis);
    
    // X轴箭头
    const xConeGeometry = new THREE.ConeGeometry(0.8, 4, 12);
    const xCone = new THREE.Mesh(xConeGeometry, xAxisMaterial);
    xCone.position.set(axisLength, 0, 0);
    xCone.rotation.z = -Math.PI / 2;
    this.scene.add(xCone);
    
    // X轴标签
    this.addAxisLabel("X", new THREE.Vector3(axisLength + 5, 0, 0), 0xFF0000);
    
    // Y轴 - 绿色
    const yAxisGeometry = new THREE.CylinderGeometry(0.2, 0.2, axisLength, 10);
    const yAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
    const yAxis = new THREE.Mesh(yAxisGeometry, yAxisMaterial);
    yAxis.position.set(0, axisLength / 2, 0);
    this.scene.add(yAxis);
    
    // Y轴箭头
    const yConeGeometry = new THREE.ConeGeometry(0.8, 4, 12);
    const yCone = new THREE.Mesh(yConeGeometry, yAxisMaterial);
    yCone.position.set(0, axisLength, 0);
    this.scene.add(yCone);
    
    // Y轴标签
    this.addAxisLabel("Y", new THREE.Vector3(0, axisLength + 5, 0), 0x00FF00);
    
    // Z轴 - 蓝色
    const zAxisGeometry = new THREE.CylinderGeometry(0.2, 0.2, axisLength, 10);
    const zAxisMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    const zAxis = new THREE.Mesh(zAxisGeometry, zAxisMaterial);
    zAxis.position.set(0, 0, axisLength / 2);
    zAxis.rotation.x = Math.PI / 2;
    this.scene.add(zAxis);
    
    // Z轴箭头
    const zConeGeometry = new THREE.ConeGeometry(0.8, 4, 12);
    const zCone = new THREE.Mesh(zConeGeometry, zAxisMaterial);
    zCone.position.set(0, 0, axisLength);
    zCone.rotation.x = Math.PI / 2;
    this.scene.add(zCone);
    
    // Z轴标签
    this.addAxisLabel("Z", new THREE.Vector3(0, 0, axisLength + 5), 0x0000FF);
    
    // 创建右下角的小坐标系
    this.createCornerCoordinateSystem();
  }

  /**
   * 添加轴标签
   */
  addAxisLabel(text: string, position: THREE.Vector3, color: number): void {
    // 创建文本精灵
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) return;
    
    canvas.width = 128;
    canvas.height = 128;
    
    context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    context.font = '80px Arial';
    context.textAlign = 'center';
    context.fillText(text, 64, 96);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.copy(position);
    sprite.scale.set(10, 10, 1);
    
    this.scene.add(sprite);
  }

  /**
   * 创建角落坐标系
   */
  createCornerCoordinateSystem(): void {
    // 创建右下角的小坐标系
    const size = 20;
    const cornerGroup = new THREE.Group();
    
    // X轴 - 红色
    const xGeometry = new THREE.CylinderGeometry(0.1, 0.1, size, 8);
    const xMaterial = new THREE.MeshBasicMaterial({ color: 0xFF0000 });
    const xAxis = new THREE.Mesh(xGeometry, xMaterial);
    xAxis.position.set(size / 2, 0, 0);
    xAxis.rotation.z = -Math.PI / 2;
    cornerGroup.add(xAxis);
    
    // X轴箭头
    const xConeGeometry = new THREE.ConeGeometry(0.4, 2, 8);
    const xCone = new THREE.Mesh(xConeGeometry, xMaterial);
    xCone.position.set(size, 0, 0);
    xCone.rotation.z = -Math.PI / 2;
    cornerGroup.add(xCone);
    
    // Y轴 - 绿色
    const yGeometry = new THREE.CylinderGeometry(0.1, 0.1, size, 8);
    const yMaterial = new THREE.MeshBasicMaterial({ color: 0x00FF00 });
    const yAxis = new THREE.Mesh(yGeometry, yMaterial);
    yAxis.position.set(0, size / 2, 0);
    cornerGroup.add(yAxis);
    
    // Y轴箭头
    const yConeGeometry = new THREE.ConeGeometry(0.4, 2, 8);
    const yCone = new THREE.Mesh(yConeGeometry, yMaterial);
    yCone.position.set(0, size, 0);
    cornerGroup.add(yCone);
    
    // Z轴 - 蓝色
    const zGeometry = new THREE.CylinderGeometry(0.1, 0.1, size, 8);
    const zMaterial = new THREE.MeshBasicMaterial({ color: 0x0000FF });
    const zAxis = new THREE.Mesh(zGeometry, zMaterial);
    zAxis.position.set(0, 0, size / 2);
    zAxis.rotation.x = Math.PI / 2;
    cornerGroup.add(zAxis);
    
    // Z轴箭头
    const zConeGeometry = new THREE.ConeGeometry(0.4, 2, 8);
    const zCone = new THREE.Mesh(zConeGeometry, zMaterial);
    zCone.position.set(0, 0, size);
    zCone.rotation.x = Math.PI / 2;
    cornerGroup.add(zCone);

    // 将坐标系添加到右下角
    this.cornerCoordinateSystem = cornerGroup;
    this.scene.add(cornerGroup);

    // 设置为屏幕空间固定位置
    this.updateCornerCoordinateSystem();
  }

  /**
   * 更新角落坐标系位置
   */
  updateCornerCoordinateSystem(): void {
    if (!this.cornerCoordinateSystem) return;
    
    // 计算右下角位置，考虑相机视角
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    // 设置坐标系位置为右下角，但稍微偏离边缘
    const margin = 50;
    const cornerX = (width / 2) - margin;
    const cornerY = -(height / 2) + margin;
    
    // 将坐标系移动到右下角的屏幕空间
    const vector = new THREE.Vector3(cornerX, cornerY, 0);
    vector.unproject(this.camera);
    
    // 计算从相机到该点的方向
    const dir = vector.sub(this.camera.position).normalize();
    
    // 计算合适的距离
    const distance = 100;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    
    // 设置坐标系位置
    this.cornerCoordinateSystem.position.copy(pos);
    
    // 使坐标系始终面向相机
    this.cornerCoordinateSystem.quaternion.copy(this.camera.quaternion);
    
    // 缩放以保持视觉大小一致
    const scale = distance / 100;
    this.cornerCoordinateSystem.scale.set(scale, scale, scale);
  }

  /**
   * 窗口大小变化处理
   */
  onWindowResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 动画循环
   */
  animate(): void {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.updateCornerCoordinateSystem();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 清除场景中的对象（保留灯光和辅助线）
   */
  clearScene(): void {
    // 保存需要保留的对象
    const objectsToKeep: THREE.Object3D[] = [];
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Light || 
        child instanceof THREE.GridHelper || 
        child === this.cornerCoordinateSystem) {
        objectsToKeep.push(child);
      }
    });

    // 清除场景
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // 重新添加保留的对象
    objectsToKeep.forEach(obj => {
      this.scene.add(obj);
    });
  }

  /**
   * 添加对象到场景
   */
  addToScene(object: THREE.Object3D): void {
    this.scene.add(object);
  }

  /**
   * 从场景移除对象
   */
  removeFromScene(object: THREE.Object3D): void {
    this.scene.remove(object);
  }

  /**
   * 设置相机位置
   */
  setCameraPosition(x: number, y: number, z: number): void {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * 设置相机朝向
   */
  setCameraLookAt(x: number, y: number, z: number): void {
    this.camera.lookAt(x, y, z);
  }

  /**
   * 获取相机
   */
  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  /**
   * 获取场景
   */
  getScene(): THREE.Scene {
    return this.scene;
  }

  /**
   * 获取渲染器
   */
  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  /**
   * 获取控制器
   */
  getControls(): OrbitControls {
    return this.controls;
  }

  /**
   * 释放资源
   */
  dispose(): void {
    // 移除事件监听器
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // 移除渲染器
    if (this.renderer) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
    
    // 释放控制器
    if (this.controls) {
      this.controls.dispose();
    }
    
    // 清除场景
    this.clearScene();
  }
}
