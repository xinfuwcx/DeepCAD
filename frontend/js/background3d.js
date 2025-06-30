/**
 * @file background3d.js
 * @description 使用Three.js的3D背景Canvas组件，用于界面美化
 * @author Deep Excavation Team
 * @version 2.0.0
 * @copyright 2025
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import Stats from 'stats.js';

/**
 * Background3D类 - 创建三维场景背景和坐标系
 */
export default class Background3D {
  /**
   * 创建3D背景效果
   * @param {string} containerId - 容器元素ID
   * @param {Object} options - 配置选项
   */
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error('Container element not found');
      return;
    }
    
    // 默认选项
    this.options = {
      particleCount: options.particleCount || 1000,
      particleColor: options.particleColor || 0x4a7feb,
      backgroundColor: options.backgroundColor || 0x0a0a1a,
      connectionDistance: options.connectionDistance || 100,
      connectionOpacity: options.connectionOpacity || 0.15,
      particleSize: options.particleSize || 0.8,
      cameraDistance: options.cameraDistance || 500,
      enableOrbit: options.enableOrbit !== undefined ? options.enableOrbit : false,
      motionFactor: options.motionFactor || 1.0,
      usePostProcessing: options.usePostProcessing !== undefined ? options.usePostProcessing : true,
      useGlow: options.useGlow !== undefined ? options.useGlow : true
    };
    
    // 性能监控
    this.stats = null;
    if (options.showStats) {
      this.initStats();
    }
    
    // 初始化场景
    this.initScene();
    
    // 创建粒子系统
    this.createParticleSystem();
    
    // 设置后处理效果
    if (this.options.usePostProcessing) {
      this.setupPostProcessing();
    }
    
    // 开始动画循环
    this.animate();
    
    // 自适应窗口大小变化
    window.addEventListener('resize', () => this.onWindowResize());
    
    // 跟踪鼠标位置以实现交互效果
    this.mouse = new THREE.Vector2();
    this.container.addEventListener('mousemove', (event) => this.onMouseMove(event));
    
    // 增加交互性 - 点击创建波纹效果
    this.container.addEventListener('click', (event) => this.createRipple(event));
    
    console.log('Background3D initialized');
  }
  
  /**
   * 初始化性能监控
   */
  initStats() {
    try {
      this.stats = new Stats();
      this.stats.domElement.style.position = 'absolute';
      this.stats.domElement.style.left = '0px';
      this.stats.domElement.style.top = '0px';
      this.stats.domElement.style.zIndex = '100';
      this.container.appendChild(this.stats.domElement);
    } catch (e) {
      console.warn('Stats.js not loaded, performance monitoring disabled');
    }
  }
  
  /**
   * 初始化Three.js场景
   */
  initScene() {
    // 获取容器尺寸
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    // 创建场景
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(this.options.backgroundColor);
    
    // 创建相机
    this.camera = new THREE.PerspectiveCamera(45, this.width / this.height, 1, 10000);
    this.camera.position.z = this.options.cameraDistance;
    
    // 创建渲染器
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance' 
    });
    this.renderer.setSize(this.width, this.height);
    this.renderer.setPixelRatio(window.devicePixelRatio > 1 ? 2 : 1); // 限制最高像素比为2以提升性能
    this.container.appendChild(this.renderer.domElement);
    
    // 添加轨道控制（可选）
    if (this.options.enableOrbit) {
      this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
      this.controls.enableDamping = true;
      this.controls.dampingFactor = 0.05;
      this.controls.enableZoom = false;
    }
    
    // 创建时钟对象跟踪时间
    this.clock = new THREE.Clock();
  }
  
  /**
   * 创建粒子系统
   */
  createParticleSystem() {
    // 创建粒子几何体
    this.particleGeometry = new THREE.BufferGeometry();
    this.particleCount = this.options.particleCount;
    
    // 粒子位置数组
    this.positions = new Float32Array(this.particleCount * 3);
    // 粒子速度数组
    this.velocities = new Float32Array(this.particleCount * 3);
    // 粒子大小数组
    this.sizes = new Float32Array(this.particleCount);
    // 粒子颜色数组
    this.colors = new Float32Array(this.particleCount * 3);
    
    const color = new THREE.Color(this.options.particleColor);
    
    // 初始化粒子数据
    for (let i = 0; i < this.particleCount; i++) {
      // 位置 - 随机分布在场景中
      this.positions[i * 3] = (Math.random() - 0.5) * this.width;
      this.positions[i * 3 + 1] = (Math.random() - 0.5) * this.height;
      this.positions[i * 3 + 2] = (Math.random() - 0.5) * 500;
      
      // 速度 - 随机方向
      this.velocities[i * 3] = (Math.random() - 0.5) * 0.4 * this.options.motionFactor;
      this.velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.4 * this.options.motionFactor;
      this.velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.4 * this.options.motionFactor;
      
      // 大小 - 随机变化
      this.sizes[i] = this.options.particleSize * (0.8 + Math.random() * 0.4);
      
      // 颜色 - 基于基础颜色的随机变化
      this.colors[i * 3] = color.r * (0.9 + Math.random() * 0.2);
      this.colors[i * 3 + 1] = color.g * (0.9 + Math.random() * 0.2);
      this.colors[i * 3 + 2] = color.b * (0.9 + Math.random() * 0.2);
    }
    
    // 设置粒子属性
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    
    // 创建粒子材质
    const particleTexture = new THREE.TextureLoader().load('/assets/images/particle.png');
    this.particleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: color },
        pointTexture: { value: particleTexture },
        time: { value: 0 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        uniform float time;
        
        void main() {
          vColor = color;
          
          // 添加简单的动画
          vec3 pos = position;
          pos.y += sin(time * 0.1 + position.x * 0.01) * 2.0;
          pos.x += cos(time * 0.1 + position.y * 0.01) * 2.0;
          
          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_PointSize = size * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform sampler2D pointTexture;
        varying vec3 vColor;
        
        void main() {
          gl_FragColor = vec4(vColor, 1.0) * texture2D(pointTexture, gl_PointCoord);
          if (gl_FragColor.a < 0.1) discard;
        }
      `,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      transparent: true,
      vertexColors: true
    });
    
    // 创建粒子系统
    this.particleSystem = new THREE.Points(this.particleGeometry, this.particleMaterial);
    this.scene.add(this.particleSystem);
    
    // 创建连线几何体
    this.lineMaterial = new THREE.LineBasicMaterial({
      color: this.options.particleColor,
      transparent: true,
      opacity: this.options.connectionOpacity,
      blending: THREE.AdditiveBlending
    });
    
    // 连线网格
    this.linesMesh = null;
  }
  
  /**
   * 设置后处理效果
   */
  setupPostProcessing() {
    // 检查是否支持WebGL后处理
    if (!THREE.EffectComposer) {
      console.warn('后处理库未加载，跳过后处理设置');
      return;
    }
    
    try {
      // 创建EffectComposer
      this.composer = new THREE.EffectComposer(this.renderer);
      
      // 添加渲染通道
      const renderPass = new THREE.RenderPass(this.scene, this.camera);
      this.composer.addPass(renderPass);
      
      // 添加UnrealBloom效果
      if (this.options.useGlow) {
        const bloomPass = new THREE.UnrealBloomPass(
          new THREE.Vector2(this.width, this.height),
          0.5,  // 强度
          0.4,  // 半径
          0.85  // 阈值
        );
        this.composer.addPass(bloomPass);
      }
      
      // 添加FXAA抗锯齿
      const fxaaPass = new THREE.ShaderPass(THREE.FXAAShader);
      fxaaPass.material.uniforms['resolution'].value.set(
        1 / (this.width * this.renderer.getPixelRatio()),
        1 / (this.height * this.renderer.getPixelRatio())
      );
      this.composer.addPass(fxaaPass);
    } catch (e) {
      console.warn('后处理设置失败:', e);
      this.composer = null;
    }
  }
  
  /**
   * 动画循环
   */
  animate() {
    requestAnimationFrame(() => this.animate());
    
    // 更新性能监控
    if (this.stats) this.stats.update();
    
    // 更新粒子位置
    this.updateParticles();
    
    // 更新连线
    this.updateConnections();
    
    // 更新控制器
    if (this.options.enableOrbit && this.controls) {
      this.controls.update();
    }
    
    // 更新着色器中的时间变量
    const time = this.clock.getElapsedTime();
    if (this.particleMaterial && this.particleMaterial.uniforms) {
      this.particleMaterial.uniforms.time.value = time;
    }
    
    // 使用后处理渲染或直接渲染
    if (this.composer && this.options.usePostProcessing) {
      this.composer.render();
    } else {
      this.renderer.render(this.scene, this.camera);
    }
  }
  
  /**
   * 更新粒子位置
   */
  updateParticles() {
    const positions = this.particleGeometry.attributes.position.array;
    
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      
      // 更新位置
      positions[i3] += this.velocities[i3];
      positions[i3 + 1] += this.velocities[i3 + 1];
      positions[i3 + 2] += this.velocities[i3 + 2];
      
      // 边界检查并反弹
      const halfWidth = this.width / 2;
      const halfHeight = this.height / 2;
      const depth = 250;
      
      if (positions[i3] < -halfWidth || positions[i3] > halfWidth) {
        this.velocities[i3] = -this.velocities[i3];
      }
      
      if (positions[i3 + 1] < -halfHeight || positions[i3 + 1] > halfHeight) {
        this.velocities[i3 + 1] = -this.velocities[i3 + 1];
      }
      
      if (positions[i3 + 2] < -depth || positions[i3 + 2] > depth) {
        this.velocities[i3 + 2] = -this.velocities[i3 + 2];
      }
      
      // 鼠标交互 - 如果粒子靠近鼠标，轻微偏移
      if (this.mouse.x !== 0 && this.mouse.y !== 0) {
        const mouseX = this.mouse.x * halfWidth;
        const mouseY = this.mouse.y * halfHeight;
        
        const dx = mouseX - positions[i3];
        const dy = mouseY - positions[i3 + 1];
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist < 100) {
          const force = 0.5 * (1.0 - dist / 100);
          positions[i3] -= dx * force * 0.01;
          positions[i3 + 1] -= dy * force * 0.01;
        }
      }
    }
    
    // 更新几何体
    this.particleGeometry.attributes.position.needsUpdate = true;
  }
  
  /**
   * 更新粒子间的连线
   */
  updateConnections() {
    // 限制连线更新频率以提高性能
    if (!this.lastConnectionUpdate || Date.now() - this.lastConnectionUpdate > 500) {
      this.lastConnectionUpdate = Date.now();
    } else {
      return;
    }
    
    // 移除旧的连线
    if (this.linesMesh) {
      this.scene.remove(this.linesMesh);
      this.linesMesh.geometry.dispose();
    }
    
    const positions = this.particleGeometry.attributes.position.array;
    const vertices = [];
    const connectionDistance = this.options.connectionDistance;
    const connectionDistanceSq = connectionDistance * connectionDistance;
    
    // 为了性能，限制最大连线数量
    const maxConnections = 2000;
    let connectionCount = 0;
    
    // 创建连线 - 使用空间索引优化性能
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const x1 = positions[i3];
      const y1 = positions[i3 + 1];
      const z1 = positions[i3 + 2];
      
      for (let j = i + 1; j < this.particleCount; j++) {
        const j3 = j * 3;
        const x2 = positions[j3];
        const y2 = positions[j3 + 1];
        const z2 = positions[j3 + 2];
        
        // 计算距离的平方
        const dx = x2 - x1;
        const dy = y2 - y1;
        const dz = z2 - z1;
        const distSq = dx*dx + dy*dy + dz*dz;
        
        // 如果足够近，创建连线
        if (distSq < connectionDistanceSq) {
          vertices.push(x1, y1, z1);
          vertices.push(x2, y2, z2);
          
          connectionCount++;
          if (connectionCount >= maxConnections) break;
        }
      }
      
      if (connectionCount >= maxConnections) break;
    }
    
    // 创建线条几何体
    if (vertices.length > 0) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      
      // 创建线条
      this.linesMesh = new THREE.LineSegments(geometry, this.lineMaterial);
      this.scene.add(this.linesMesh);
    }
  }
  
  /**
   * 窗口大小变化时调整渲染器
   */
  onWindowResize() {
    this.width = this.container.clientWidth;
    this.height = this.container.clientHeight;
    
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    
    this.renderer.setSize(this.width, this.height);
    
    // 更新后处理
    if (this.composer) {
      this.composer.setSize(this.width, this.height);
    }
  }
  
  /**
   * 鼠标移动事件处理
   */
  onMouseMove(event) {
    const rect = this.container.getBoundingClientRect();
    
    // 计算归一化的鼠标坐标 (-1 到 1)
    this.mouse.x = ((event.clientX - rect.left) / this.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / this.height) * 2 + 1;
  }
  
  /**
   * 创建点击波纹效果
   */
  createRipple(event) {
    const rect = this.container.getBoundingClientRect();
    
    // 计算世界空间中的鼠标位置
    const mouseX = ((event.clientX - rect.left) / this.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / this.height) * 2 + 1;
    
    // 创建平面几何体
    const rippleGeometry = new THREE.CircleGeometry(1, 32);
    
    // 创建材质
    const rippleMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.options.particleColor) },
        time: { value: 0 },
        startTime: { value: this.clock.getElapsedTime() }
      },
      vertexShader: `
        varying vec2 vUv;
        
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float time;
        uniform float startTime;
        varying vec2 vUv;
        
        void main() {
          float elapsed = time - startTime;
          
          // 距离中心的距离
          float dist = distance(vUv, vec2(0.5, 0.5)) * 2.0;
          
          // 从中心扩散的波纹
          float wave = sin(dist * 10.0 - elapsed * 5.0) * 0.5 + 0.5;
          
          // 淡出效果
          float fadeOut = max(0.0, 1.0 - elapsed * 0.5);
          
          // 波纹边缘效果
          float edge = smoothstep(elapsed * 0.4, elapsed * 0.4 + 0.1, dist) * 
                       (1.0 - smoothstep(elapsed * 0.6, elapsed * 0.6 + 0.1, dist));
          
          gl_FragColor = vec4(color, fadeOut * edge * wave);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthTest: false,
      side: THREE.DoubleSide
    });
    
    // 创建网格
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    
    // 设置位置
    const vector = new THREE.Vector3(mouseX, mouseY, 0);
    vector.unproject(this.camera);
    
    const dir = vector.sub(this.camera.position).normalize();
    const distance = -this.camera.position.z / dir.z;
    const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
    
    ripple.position.copy(pos);
    ripple.scale.set(0, 0, 1);
    
    // 添加到场景
    this.scene.add(ripple);
    
    // 动画
    const startScale = 0;
    const endScale = 100;
    const duration = 2; // 秒
    const startTime = this.clock.getElapsedTime();
    
    const animate = () => {
      const elapsed = this.clock.getElapsedTime() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 更新缩放
      const scale = startScale + (endScale - startScale) * progress;
      ripple.scale.set(scale, scale, 1);
      
      // 更新着色器时间
      rippleMaterial.uniforms.time.value = this.clock.getElapsedTime();
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // 动画结束后移除
        this.scene.remove(ripple);
        rippleGeometry.dispose();
        rippleMaterial.dispose();
      }
    };
    
    // 开始动画
    animate();
  }
  
  /**
   * 清理资源
   */
  dispose() {
    // 移除事件监听器
    window.removeEventListener('resize', this.onWindowResize);
    this.container.removeEventListener('mousemove', this.onMouseMove);
    this.container.removeEventListener('click', this.createRipple);
    
    // 清理场景
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleGeometry.dispose();
      this.particleMaterial.dispose();
    }
    
    if (this.linesMesh) {
      this.scene.remove(this.linesMesh);
      this.linesMesh.geometry.dispose();
      this.lineMaterial.dispose();
    }
    
    // 清理渲染器
    this.renderer.dispose();
    
    // 清理后处理
    if (this.composer) {
      this.composer.dispose();
    }
    
    // 移除canvas
    if (this.renderer.domElement && this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
    
    // 移除性能监控
    if (this.stats && this.stats.domElement.parentNode) {
      this.stats.domElement.parentNode.removeChild(this.stats.domElement);
    }
    
    console.log('Background3D disposed');
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

// 导出模块
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Background3D;
} 