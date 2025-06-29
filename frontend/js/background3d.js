/**
 * @file background3d.js
 * @description 使用Three.js的3D背景Canvas组件，用于界面美化
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

/**
 * Background3D类 - 创建三维场景背景和坐标系
 */
export default class Background3D {
  /**
   * 创建3D背景渲染器
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
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

    this.init();
  }

  /**
   * 初始化3D场景
   */
  init() {
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor);
    this.scene.fog = new THREE.Fog(this.options.backgroundColor, 500, 1000);

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

    // 添加轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;

    // 处理窗口大小变化
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 开始动画循环
    this.animate();
  }

  addGridGround() {
    // 创建带有渐变的网格地面
    const size = this.options.gridSize;
    const divisions = this.options.gridDivisions;
    
    // 主网格
    const gridHelper = new THREE.GridHelper(size, divisions, this.options.gridColor1, this.options.gridColor2);
    gridHelper.position.y = 0;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.6;
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

  addCoordinateSystem() {
    // 创建坐标轴
    const axisLength = this.options.axisLength;
    
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

  addAxisLabel(text, position, color) {
    // 创建文本精灵
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
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

  createCornerCoordinateSystem() {
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

  updateCornerCoordinateSystem() {
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
  onWindowResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  /**
   * 动画循环
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));
    this.controls.update();
    this.updateCornerCoordinateSystem();
    this.renderer.render(this.scene, this.camera);
  }

  /**
   * 从JSON加载场景
   * @param {string} url - JSON文件URL
   * @returns {Promise} - 加载完成的Promise
   */
  loadSceneFromJSON(url) {
    return new Promise((resolve, reject) => {
      const loader = new THREE.ObjectLoader();
      loader.load(
        url,
        (obj) => {
          // 清除现有场景中的对象（保留灯光和辅助线）
          this.clearScene();
          
          // 添加加载的对象
          this.scene.add(obj);
          resolve(obj);
        },
        (xhr) => {
          console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        (error) => {
          console.error('加载场景时出错:', error);
          reject(error);
        }
      );
    });
  }

  /**
   * 清除场景中的对象（保留灯光和辅助线）
   */
  clearScene() {
    // 保存需要保留的对象
    const objectsToKeep = [];
    this.scene.children.forEach(child => {
      if (child instanceof THREE.Light || 
        child instanceof THREE.GridHelper || 
        child instanceof THREE.AxesHelper) {
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

  // 公共方法，用于添加模型到场景
  addToScene(object) {
    this.scene.add(object);
  }

  // 公共方法，用于从场景移除模型
  removeFromScene(object) {
    this.scene.remove(object);
  }

  // 公共方法，用于清空场景（除了背景和坐标系）
  clearScene() {
    // 保存背景和坐标系相关对象
    const preservedObjects = [];
    
    this.scene.traverse((object) => {
      // 判断是否为背景或坐标系相关对象
      const isBackground = object === this.scene || 
                          object instanceof THREE.GridHelper ||
                          object instanceof THREE.AmbientLight ||
                          object instanceof THREE.DirectionalLight ||
                          object === this.cornerCoordinateSystem;
      
      if (!isBackground && object.parent === this.scene) {
        preservedObjects.push(object);
      }
    });
    
    // 移除非背景对象
    preservedObjects.forEach(object => {
      this.scene.remove(object);
    });
  }

  // 公共方法，用于设置相机位置
  setCameraPosition(x, y, z) {
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  // 公共方法，用于获取相机
  getCamera() {
    return this.camera;
  }

  // 公共方法，用于获取场景
  getScene() {
    return this.scene;
  }

  // 公共方法，用于获取渲染器
  getRenderer() {
    return this.renderer;
  }

  // 公共方法，用于获取控制器
  getControls() {
    return this.controls;
  }
}

/**
 * 土层可视化器
 * 用于显示深基坑工程的土层结构
 */
class SoilLayerVisualizer extends Background3D {
  /**
   * 创建土层可视化器
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    super(container, options);
    
    // 土层数据
    this.soilLayers = options.soilLayers || [];
    
    // 基坑数据
    this.excavation = options.excavation || {
      width: 300,
      length: 300,
      depth: 150
    };
    
    // 水位深度
    this.waterLevel = options.waterLevel;
    
    // 如果提供了土层数据，则创建土层模型
    if (this.soilLayers.length > 0) {
      this.createSoilLayers();
    }
    
    // 如果提供了基坑数据，则创建基坑模型
    if (this.excavation) {
      this.createExcavationPit();
    }
    
    // 如果提供了水位深度，则创建水位面
    if (this.waterLevel !== undefined) {
      this.createWaterLevel();
    }
    
    // 创建支护结构
    this.createRetainingStructure();
  }
  
  /**
   * 创建土层模型
   */
  createSoilLayers() {
    this.soilLayers.forEach(layer => {
      const geometry = new THREE.BoxGeometry(1000, layer.thickness, 1000);
      const material = new THREE.MeshPhongMaterial({
        color: layer.color || 0xd9c8b4,
        transparent: true,
        opacity: 0.8
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.y = -layer.depth - layer.thickness / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = layer.name || "Soil Layer";
      this.scene.add(mesh);
    });
  }
  
  /**
   * 创建基坑模型
   */
  createExcavationPit() {
    const { width, length, depth } = this.excavation;
    const geometry = new THREE.BoxGeometry(width, depth, length);
    const material = new THREE.MeshPhongMaterial({
      color: 0xf8f8f8,
      transparent: true,
      opacity: 0.3
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = -depth / 2;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.name = "Excavation Pit";
    this.scene.add(mesh);
  }
  
  /**
   * 创建水位面
   */
  createWaterLevel() {
    const geometry = new THREE.PlaneGeometry(1000, 1000);
    const material = new THREE.MeshPhongMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -this.waterLevel;
    mesh.name = "Water Level";
    this.scene.add(mesh);
  }
  
  /**
   * 创建支护结构
   */
  createRetainingStructure() {
    this.createRetainingPiles();
    this.createStruts();
  }
  
  /**
   * 创建围护桩
   */
  createRetainingPiles() {
    const { width, length } = this.excavation;
    const pileRadius = 5;
    const pileHeight = 250;
    const pileCount = 20;
    
    for (let i = 0; i < pileCount; i++) {
      const angle = (i / pileCount) * Math.PI * 2;
      const x = Math.cos(angle) * (width / 2 + pileRadius);
      const z = Math.sin(angle) * (length / 2 + pileRadius);
      
      const geometry = new THREE.CylinderGeometry(pileRadius, pileRadius, pileHeight, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0x777777 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, -pileHeight / 2, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = "Retaining Pile";
      this.scene.add(mesh);
    }
  }
  
  /**
   * 创建支撑
   */
  createStruts() {
    const { width, length } = this.excavation;
    const strutRadius = 3;
    const strutDepth = 30;
    
    // 沿X轴方向的支撑
    for (const z of [-length/4, length/4]) {
      const geometry = new THREE.CylinderGeometry(strutRadius, strutRadius, width, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0x555555 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(0, -strutDepth, z);
      mesh.rotation.z = Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = "Strut X";
      this.scene.add(mesh);
    }
    
    // 沿Z轴方向的支撑
    for (const x of [-width/4, width/4]) {
      const geometry = new THREE.CylinderGeometry(strutRadius, strutRadius, length, 16);
      const material = new THREE.MeshPhongMaterial({ color: 0x555555 });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, -strutDepth, 0);
      mesh.rotation.x = Math.PI / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = "Strut Z";
      this.scene.add(mesh);
    }
  }
  
  /**
   * 更新土层数据
   * @param {Array} soilLayers - 土层数据
   */
  updateSoilLayers(soilLayers) {
    this.soilLayers = soilLayers;
    
    // 移除现有土层
    this.scene.children.forEach(child => {
      if (child.name && child.name.includes("Soil Layer")) {
        this.scene.remove(child);
      }
    });
    
    // 创建新土层
    this.createSoilLayers();
  }
  
  /**
   * 更新基坑数据
   * @param {Object} excavation - 基坑数据
   */
  updateExcavation(excavation) {
    this.excavation = excavation;
    
    // 移除现有基坑
    this.scene.children.forEach(child => {
      if (child.name === "Excavation Pit") {
        this.scene.remove(child);
      }
    });
    
    // 移除现有支护结构
    this.scene.children.forEach(child => {
      if (child.name === "Retaining Pile" || child.name.includes("Strut")) {
        this.scene.remove(child);
      }
    });
    
    // 创建新基坑
    this.createExcavationPit();
    
    // 创建新支护结构
    this.createRetainingStructure();
  }
  
  /**
   * 更新水位深度
   * @param {number} waterLevel - 水位深度
   */
  updateWaterLevel(waterLevel) {
    this.waterLevel = waterLevel;
    
    // 移除现有水位面
    this.scene.children.forEach(child => {
      if (child.name === "Water Level") {
        this.scene.remove(child);
      }
    });
    
    // 创建新水位面
    if (this.waterLevel !== undefined) {
      this.createWaterLevel();
    }
  }
} 