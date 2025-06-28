/**
 * @file background3d.js
 * @description 使用Three.js的3D背景Canvas组件，用于界面美化
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/**
 * 基于Three.js的3D背景渲染器
 * 用于显示深基坑工程的三维场景
 */
class Background3D {
  /**
   * 创建3D背景渲染器
   * @param {HTMLElement} container - 容器元素
   * @param {Object} options - 配置选项
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = Object.assign({
      cameraPosition: { x: 300, y: 200, z: 300 },
      cameraLookAt: { x: 0, y: 0, z: 0 },
      backgroundColor: 0xf0f0f0,
      enableOrbitControls: true
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

    // 创建相机
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 5000);
    this.camera.position.set(
      this.options.cameraPosition.x,
      this.options.cameraPosition.y,
      this.options.cameraPosition.z
    );
    this.camera.lookAt(
      this.options.cameraLookAt.x,
      this.options.cameraLookAt.y,
      this.options.cameraLookAt.z
    );

    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // 添加轨道控制器
    if (this.options.enableOrbitControls) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
    }

    // 添加灯光
    this.addLights();

    // 添加网格辅助线
    this.addGridHelper();

    // 添加坐标轴辅助线
    this.addAxesHelper();

    // 添加窗口大小变化监听
    window.addEventListener('resize', this.onWindowResize.bind(this));

    // 开始动画循环
    this.animate();
  }

  /**
   * 添加灯光
   */
  addLights() {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 平行光（模拟太阳光）
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 1000;
    directionalLight.shadow.camera.left = -500;
    directionalLight.shadow.camera.right = 500;
    directionalLight.shadow.camera.top = 500;
    directionalLight.shadow.camera.bottom = -500;
    this.scene.add(directionalLight);
  }

  /**
   * 添加网格辅助线
   */
  addGridHelper() {
    const gridHelper = new THREE.GridHelper(1000, 100, 0x888888, 0xcccccc);
    this.scene.add(gridHelper);
  }

  /**
   * 添加坐标轴辅助线
   */
  addAxesHelper() {
    const axesHelper = new THREE.AxesHelper(100);
    this.scene.add(axesHelper);
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

    if (this.controls) {
      this.controls.update();
    }

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

// 导出类
export { Background3D, SoilLayerVisualizer }; 