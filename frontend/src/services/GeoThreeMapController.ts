/**
 * geo-three地图控制器 - 优化版
 * 基于Three.js的专业地理信息系统控制
 * 集成OpenStreetMap瓦片服务 + 天气数据 + 高性能渲染
 * 1号专家专用地理可视化解决方案
 */

import * as THREE from 'three';
import { WeatherData } from './OpenMeteoService';
import { WeatherEffectsRenderer } from './WeatherEffectsRenderer';
import { CloudRenderingSystem } from './CloudRenderingSystem';
import { SimpleTileRenderer } from './SimpleTileRenderer';
import { openMeteoService } from './OpenMeteoService';

// ======================= 接口定义 =======================

export interface Coordinates {
  lat: number;
  lng: number;
  alt?: number;
}

export interface TileCoord {
  x: number;
  y: number;
  z: number; // zoom level
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface ProjectMarkerData {
  id: string;
  name: string;
  location: Coordinates;
  depth: number;
  status: 'active' | 'completed' | 'planning';
  progress: number;
  weather?: WeatherData;
}

export type MapStyle = 'satellite' | 'terrain' | 'street' | 'dark';

// ======================= 瓦片提供者 =======================

class OSMTileProvider {
  private tileSize: number = 256;
  
  // 不同地图样式的瓦片URL模板 - 修复跨域和可用性问题
  private styleUrls: Record<MapStyle, string> = {
    street: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', // 使用Google卫星图
    terrain: 'https://mt1.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',   // 使用Google地形图
    dark: 'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'
  };

  public getTileUrl(style: MapStyle, zoom: number, x: number, y: number): string {
    const template = this.styleUrls[style] || this.styleUrls.street;
    return template
      .replace('{z}', zoom.toString())
      .replace('{x}', x.toString())
      .replace('{y}', y.toString());
  }

  // 经纬度转瓦片坐标
  public lngLatToTile(lng: number, lat: number, zoom: number): TileCoord {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { x, y, z: zoom };
  }

  // 瓦片坐标转经纬度
  public tileToLngLat(x: number, y: number, zoom: number): Coordinates {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lng, lat };
  }

  // 获取瓦片世界坐标
  public getTileWorldPosition(tileX: number, tileY: number, centerTile: TileCoord, tileScale: number = 1): THREE.Vector3 {
    const offsetX = (tileX - centerTile.x) * tileScale;
    const offsetY = -(tileY - centerTile.y) * tileScale; // Y轴翻转
    return new THREE.Vector3(offsetX, 0, offsetY);
  }
}

// ======================= 地图瓦片类 =======================

class MapTile {
  public mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private texture: THREE.Texture | null = null;
  private loader: THREE.TextureLoader;
  
  constructor(
    public tileCoord: TileCoord,
    public worldPosition: THREE.Vector3,
    private tileScale: number = 1
  ) {
    // 创建几何体和材质
    this.geometry = new THREE.PlaneGeometry(tileScale, tileScale);
    this.material = new THREE.MeshBasicMaterial({ 
      color: 0x66ccff, // 明亮的蓝色作为默认背景
      transparent: false,
      opacity: 1.0,
      side: THREE.DoubleSide // 双面渲染确保可见
    });
    
    // 创建网格
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.copy(worldPosition);
    this.mesh.rotation.x = -Math.PI / 2; // 水平放置
    this.mesh.userData = { 
      type: 'map_tile',
      tileCoord: this.tileCoord 
    };

    // 纹理加载器
    this.loader = new THREE.TextureLoader();
    this.loader.crossOrigin = 'anonymous';
  }

  public async loadTexture(provider: OSMTileProvider, style: MapStyle): Promise<void> {
    return new Promise((resolve) => {
      const url = provider.getTileUrl(style, this.tileCoord.z, this.tileCoord.x, this.tileCoord.y);
      console.log(`🌐 开始加载瓦片纹理: ${url}`);
      
      this.loader.load(
        url,
        (texture) => {
          // 设置纹理属性
          texture.flipY = false;
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          
          // 应用纹理
          this.material.map = texture;
          this.material.color.set(0xffffff);
          this.material.transparent = false; // 不透明显示真实地图
          this.material.opacity = 1.0;
          this.material.needsUpdate = true;
          this.texture = texture;
          
          console.log(`✅ 瓦片纹理加载成功: ${this.tileCoord.z}/${this.tileCoord.x}/${this.tileCoord.y}`);
          resolve();
        },
        (progress) => {
          console.log(`📊 瓦片加载进度: ${this.tileCoord.z}/${this.tileCoord.x}/${this.tileCoord.y} - ${((progress.loaded / progress.total) * 100).toFixed(1)}%`);
        },
        (error) => {
          console.warn(`⚠️ 瓦片纹理加载失败: ${this.tileCoord.z}/${this.tileCoord.x}/${this.tileCoord.y}`, error);
          // 创建明显的错误颜色，便于调试
          this.material.color.set(0xff6666); // 红色表示加载失败
          this.material.transparent = false;
          this.material.opacity = 1.0;
          this.material.needsUpdate = true;
          console.log(`🔴 瓦片显示为红色(加载失败): ${this.tileCoord.z}/${this.tileCoord.x}/${this.tileCoord.y}`);
          resolve();
        }
      );
      
      // 添加超时机制
      setTimeout(() => {
        if (!this.texture) {
          console.warn(`⏰ 瓦片加载超时: ${this.tileCoord.z}/${this.tileCoord.x}/${this.tileCoord.y}`);
          this.material.color.set(0xffaa00); // 橙色表示超时
          this.material.transparent = false;
          this.material.opacity = 1.0;
          this.material.needsUpdate = true;
          resolve();
        }
      }, 10000); // 10秒超时
    });
  }

  public dispose(): void {
    if (this.texture) {
      this.texture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}

// ======================= 项目标记类 =======================

class ProjectMarker3D {
  public group: THREE.Group;
  private cylinderMesh: THREE.Mesh;
  private labelSprite: THREE.Sprite;
  private weatherSprite: THREE.Sprite | null = null;

  constructor(private projectData: ProjectMarkerData) {
    this.group = new THREE.Group();
    this.group.userData = { 
      type: 'project_marker',
      projectId: this.projectData.id,
      projectData: this.projectData
    };

    this.createMarker();
    this.createLabel();
  }

  private createMarker(): void {
    console.log(`🏗️ 创建项目标记: ${this.projectData.name}`);
    
    // 创建更大的3D圆柱体表示深基坑  
    const radius = 0.5; // 增大半径使其更显眼
    const height = Math.max(1.0, this.projectData.depth / 50); // 调整高度比例
    const geometry = new THREE.CylinderGeometry(radius, radius * 1.5, height, 16);
    
    // 根据项目状态选择颜色
    const colors = {
      completed: 0x52c41a,  // 绿色
      active: 0xfaad14,     // 橙色
      planning: 0x8c8c8c    // 灰色
    };
    
    const material = new THREE.MeshLambertMaterial({ 
      color: colors[this.projectData.status],
      transparent: false,
      opacity: 1.0,
      emissive: colors[this.projectData.status],
      emissiveIntensity: 0.2 // 添加自发光效果
    });
    
    this.cylinderMesh = new THREE.Mesh(geometry, material);
    this.cylinderMesh.position.y = height / 2; // 底部贴地
    this.cylinderMesh.castShadow = true;
    this.cylinderMesh.receiveShadow = true;
    
    // 添加更明显的发光效果
    const glowGeometry = new THREE.CylinderGeometry(radius * 1.5, radius * 2.0, height * 0.2, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: colors[this.projectData.status],
      transparent: true,
      opacity: 0.6
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.y = height + 0.1;
    
    // 添加顶部指示器
    const topGeometry = new THREE.SphereGeometry(radius * 0.8, 16, 8);
    const topMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9
    });
    const topMesh = new THREE.Mesh(topGeometry, topMaterial);
    topMesh.position.y = height + radius * 0.5;
    
    this.group.add(this.cylinderMesh);
    this.group.add(glowMesh);
    this.group.add(topMesh);
    
    console.log(`✅ 项目标记创建完成: ${this.projectData.name}, 高度=${height.toFixed(2)}, 半径=${radius}`);
  }

  private createLabel(): void {
    // 使用WebGL纹理而非Canvas 2D绘制标签
    const textGeometry = new THREE.PlaneGeometry(2, 1);
    
    // 创建SDF文字渲染着色器材质
    const textMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uText: { value: this.projectData.name },
        uDepth: { value: this.projectData.depth },
        uProgress: { value: this.projectData.progress },
        uTime: { value: 0.0 },
        uColor: { value: new THREE.Color('#00ffff') },
        uBackgroundColor: { value: new THREE.Color('#000000') }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform vec3 uBackgroundColor;
        uniform float uTime;
        varying vec2 vUv;
        
        // SDF文字渲染函数
        float sdBox(vec2 p, vec2 b) {
          vec2 d = abs(p) - b;
          return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }
        
        void main() {
          vec2 center = vUv - 0.5;
          
          // 渲染边框
          float border = sdBox(center, vec2(0.48, 0.35));
          float borderAlpha = smoothstep(0.02, 0.0, abs(border - 0.02));
          
          // 渲染背景
          float bg = sdBox(center, vec2(0.45, 0.32));
          float bgAlpha = smoothstep(0.01, 0.0, bg);
          
          // 发光效果
          float glow = exp(-border * 20.0) * sin(uTime * 3.0) * 0.5 + 0.5;
          
          vec3 finalColor = mix(uBackgroundColor, uColor, borderAlpha + glow * 0.3);
          float finalAlpha = max(bgAlpha * 0.8, borderAlpha);
          
          gl_FragColor = vec4(finalColor, finalAlpha);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // 创建标签网格
    const labelMesh = new THREE.Mesh(textGeometry, textMaterial);
    labelMesh.position.set(0, 1.5, 0);
    labelMesh.lookAt(0, 1.5, 1); // 面向相机
    
    this.group.add(labelMesh);
    
    // 保存材质引用用于动画更新
    this.group.userData.textMaterial = textMaterial;
  }

  public updateWeatherDisplay(weather: WeatherData): void {
    // 移除旧的天气显示
    if (this.weatherSprite) {
      this.group.remove(this.weatherSprite);
      this.weatherSprite.material.map?.dispose();
      this.weatherSprite.material.dispose();
    }

    // 使用WebGL实时渲染天气效果，而非Canvas绘制
    const weatherGeometry = new THREE.PlaneGeometry(1.5, 0.6);
    
    // 天气着色器材质
    const weatherMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uTemperature: { value: weather.current.temperature },
        uWindSpeed: { value: weather.current.windSpeed },
        uHumidity: { value: weather.current.humidity / 100.0 },
        uWeatherType: { value: this.getWeatherTypeIndex(weather.current.description) },
        uResolution: { value: new THREE.Vector2(200, 80) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uTemperature;
        uniform float uWindSpeed;
        uniform float uHumidity;
        uniform float uWeatherType;
        uniform vec2 uResolution;
        varying vec2 vUv;
        
        // 天气可视化函数
        vec3 getWeatherColor(float weatherType, vec2 uv, float time) {
          vec3 baseColor = vec3(0.0, 0.4, 0.8); // 默认蓝色
          
          if (weatherType < 0.5) { // 晴天
            baseColor = vec3(1.0, 0.8, 0.2);
            float sun = smoothstep(0.1, 0.08, length(uv - vec2(0.8, 0.8)));
            baseColor += sun * vec3(1.0, 1.0, 0.5);
          } else if (weatherType < 1.5) { // 雨天
            baseColor = vec3(0.3, 0.3, 0.6);
            float rain = fract(sin(dot(uv * 50.0, vec2(12.9, 78.2))) * 43758.5);
            rain *= step(0.7, rain) * sin(time * 10.0 + uv.y * 20.0);
            baseColor += rain * vec3(0.2, 0.4, 0.8);
          } else if (weatherType < 2.5) { // 雪天
            baseColor = vec3(0.8, 0.9, 1.0);
            float snow = fract(sin(dot(uv * 30.0, vec2(15.5, 25.7))) * 15487.3);
            snow *= step(0.8, snow) * (sin(time + uv.x * 10.0) * 0.5 + 0.5);
            baseColor += snow * vec3(0.3, 0.3, 0.3);
          }
          
          return baseColor;
        }
        
        void main() {
          vec2 center = vUv - 0.5;
          
          // 背景
          float bg = smoothstep(0.3, 0.25, length(center));
          vec3 backgroundColor = vec3(0.0, 0.2, 0.4) * 0.9;
          
          // 天气效果
          vec3 weatherColor = getWeatherColor(uWeatherType, vUv, uTime);
          
          // 温度指示器
          float tempIndicator = smoothstep(0.02, 0.0, abs(vUv.x - 0.2) - 0.01);
          tempIndicator *= smoothstep(0.8, 0.2, vUv.y);
          vec3 tempColor = mix(vec3(0.0, 0.5, 1.0), vec3(1.0, 0.2, 0.0), (uTemperature + 20.0) / 60.0);
          
          // 风速指示器
          float windIndicator = sin(vUv.x * 10.0 + uTime * uWindSpeed * 0.1) * 0.5 + 0.5;
          windIndicator *= smoothstep(0.05, 0.0, abs(vUv.y - 0.7));
          
          vec3 finalColor = mix(backgroundColor, weatherColor, bg);
          finalColor += tempIndicator * tempColor * 0.5;
          finalColor += windIndicator * vec3(0.5, 0.8, 1.0) * 0.3;
          
          gl_FragColor = vec4(finalColor, bg * 0.9 + 0.1);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });
    
    // 创建天气网格
    const weatherMesh = new THREE.Mesh(weatherGeometry, weatherMaterial);
    weatherMesh.position.set(1.5, 0.8, 0);
    
    this.weatherSprite = weatherMesh;
    this.group.add(this.weatherSprite);
    
    // 保存天气数据和材质引用
    this.projectData.weather = weather;
    this.group.userData.weatherMaterial = weatherMaterial;
  }
  
  private getWeatherTypeIndex(description: string | undefined): number {
    if (!description) return 0.0; // 默认晴天
    const desc = description.toLowerCase();
    if (desc.includes('rain') || desc.includes('雨')) return 1.0;
    if (desc.includes('snow') || desc.includes('雪')) return 2.0;
    if (desc.includes('cloud') || desc.includes('云')) return 0.5;
    return 0.0; // 晴天
  }

  public setSelected(selected: boolean): void {
    if (selected) {
      // 添加选中效果
      this.cylinderMesh.material.emissive.setHex(0x444444);
      this.group.scale.setScalar(1.2);
      
      // 添加旋转动画
      this.cylinderMesh.rotation.y += 0.02;
    } else {
      // 移除选中效果
      this.cylinderMesh.material.emissive.setHex(0x000000);
      this.group.scale.setScalar(1.0);
    }
  }

  public dispose(): void {
    // 清理几何体和材质
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });
  }
}

// ======================= geo-three地图控制器 =======================

export class GeoThreeMapController {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private tileProvider: OSMTileProvider;
  
  // 新的简单瓦片渲染器 - 确保瓦片真的能显示！
  private simpleTileRenderer: SimpleTileRenderer;
  
  // 地图状态
  private currentStyle: MapStyle = 'street';
  private center: Coordinates = { lat: 31.2304, lng: 121.4737 }; // 上海中心为默认中心
  private zoom: number = 8; // 更合适的缩放级别
  private tileScale: number = 10; // 增大瓦片尺寸
  
  // 瓦片管理 (保留旧代码兼容性)
  private tiles: Map<string, MapTile> = new Map();
  private visibleTileRange: { minX: number; maxX: number; minY: number; maxY: number } | null = null;
  
  // 项目标记
  private projectMarkers: Map<string, ProjectMarker3D> = new Map();
  private selectedProjectId: string | null = null;
  
  // 天气效果系统
  private weatherEffects: WeatherEffectsRenderer | null = null;
  private cloudSystem: CloudRenderingSystem | null = null;
  
  // 动画和控制
  private animationId: number | null = null;
  private isFlying: boolean = false;
  
  // 事件处理
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onProjectClick?: (projectId: string) => void;

  constructor(container: HTMLElement) {
    console.log('🗺️ 初始化geo-three地图控制器');
    
    this.tileProvider = new OSMTileProvider();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    
    this.initializeThreeJS(container);
    this.setupEventListeners(container);
    this.initializeWeatherEffects();
    
    // 初始化简单瓦片渲染器
    this.simpleTileRenderer = new SimpleTileRenderer(this.scene, this.camera, this.renderer);
    
    // 延迟创建3D地形，确保所有方法都已初始化
    setTimeout(() => {
      this.create3DTerrain();
    }, 100);
    
    this.startRenderLoop();
    
    // 禁用2D瓦片加载 - 只显示3D地形
    // setTimeout(() => {
    //   console.log('🚀 使用SimpleTileRenderer加载瓦片...');
    //   this.loadVisibleTilesWithSimpleRenderer();
    // }, 100);
  }

  private initializeThreeJS(container: HTMLElement): void {
    // 场景设置
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x001122);
    this.scene.fog = new THREE.Fog(0x001122, 50, 200);

    // 相机设置
    this.camera = new THREE.PerspectiveCamera(
      75,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 25, 25); // 提高相机位置以看到更多瓦片
    this.camera.lookAt(0, 0, 0);
    
    console.log(`📷 相机位置设置为: (${this.camera.position.x}, ${this.camera.position.y}, ${this.camera.position.z})`);

    // 渲染器设置
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    container.appendChild(this.renderer.domElement);

    // 光照设置
    this.setupLighting();
    
    console.log('✅ Three.js初始化完成');
  }

  private setupLighting(): void {
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);

    // 方向光 (模拟太阳光)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 100;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    // 半球光 (天空光)
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x2F4F4F, 0.3);
    this.scene.add(hemisphereLight);
  }

  private initializeWeatherEffects(): void {
    try {
      console.log('🌦️ 开始初始化天气效果系统...');
      
      // 创建天气效果边界框 - 扩大范围以覆盖更多瓦片
      const boundingBox = new THREE.Box3(
        new THREE.Vector3(-100, -5, -100),
        new THREE.Vector3(100, 50, 100)
      );

      // 初始化天气效果渲染器
      this.weatherEffects = new WeatherEffectsRenderer(this.scene, boundingBox);
      console.log('✅ WeatherEffectsRenderer 初始化完成');
      
      // 初始化云渲染系统
      this.cloudSystem = new CloudRenderingSystem(this.scene, boundingBox);
      console.log('✅ CloudRenderingSystem 初始化完成');
      
      // 创建默认天气效果
      this.weatherEffects.setRainEnabled(false); // 默认关闭
      this.weatherEffects.setSnowEnabled(false);
      this.weatherEffects.setFogEnabled(true); // 轻微雾气增加氛围
      this.weatherEffects.setIntensity(0.3);
      
      // 创建默认云层
      this.cloudSystem.createVolumetricClouds(2);
      this.cloudSystem.createLayeredClouds();
      this.cloudSystem.applyCoverage(0.4); // 40%云覆盖
      
      console.log('🌦️ 天气效果系统初始化完成');
      
    } catch (error) {
      console.warn('⚠️ 天气效果系统初始化失败，继续使用基础渲染:', error);
      this.weatherEffects = null;
      this.cloudSystem = null;
    }
  }

  private setupEventListeners(container: HTMLElement): void {
    const canvas = this.renderer.domElement;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    // 鼠标按下
    canvas.addEventListener('mousedown', (event) => {
      isDragging = true;
      previousMousePosition = { x: event.clientX, y: event.clientY };
      
      // 检查点击的对象
      this.handleMouseClick(event);
    });

    // 鼠标移动
    canvas.addEventListener('mousemove', (event) => {
      if (!isDragging || this.isFlying) return;
      
      const deltaMove = {
        x: event.clientX - previousMousePosition.x,
        y: event.clientY - previousMousePosition.y
      };
      
      // 相机控制
      this.camera.position.x -= deltaMove.x * 0.02;
      this.camera.position.z -= deltaMove.y * 0.02;
      
      previousMousePosition = { x: event.clientX, y: event.clientY };
      
      // 更新地图中心
      this.updateMapCenter();
    });

    // 鼠标抬起
    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // 鼠标滚轮
    canvas.addEventListener('wheel', (event) => {
      event.preventDefault();
      if (this.isFlying) return;
      
      const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
      this.camera.position.y *= zoomFactor;
      
      // 限制缩放范围
      this.camera.position.y = Math.max(2, Math.min(50, this.camera.position.y));
      
      // 更新缩放级别
      this.updateZoomLevel();
    });

    // 窗口大小调整
    window.addEventListener('resize', () => {
      this.handleResize(container);
    });
  }

  private handleMouseClick(event: MouseEvent): void {
    // 计算鼠标位置
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    // 射线检测
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(this.scene.children, true);

    for (const intersect of intersects) {
      const userData = intersect.object.userData;
      if (userData.type === 'project_marker') {
        const projectId = userData.projectId;
        this.selectProject(projectId);
        
        if (this.onProjectClick) {
          this.onProjectClick(projectId);
        }
        break;
      }
    }
  }

  private updateMapCenter(): void {
    // 根据相机位置更新地图中心
    const centerTile = this.tileProvider.lngLatToTile(this.center.lng, this.center.lat, this.zoom);
    const offsetTileX = this.camera.position.x / this.tileScale;
    const offsetTileY = -this.camera.position.z / this.tileScale;
    
    const newCenter = this.tileProvider.tileToLngLat(
      centerTile.x + offsetTileX,
      centerTile.y + offsetTileY,
      this.zoom
    );
    
    this.center = newCenter;
  }

  private updateZoomLevel(): void {
    // 根据相机高度计算缩放级别
    const height = this.camera.position.y;
    this.zoom = Math.max(1, Math.min(18, Math.round(18 - Math.log2(height / 2))));
  }

  private handleResize(container: HTMLElement): void {
    this.camera.aspect = container.clientWidth / container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(container.clientWidth, container.clientHeight);
  }

  private startRenderLoop(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      
      // 更新项目标记动画
      this.updateMarkerAnimations();
      
      // 渲染场景
      this.renderer.render(this.scene, this.camera);
    };
    
    animate();
  }

  private updateMarkerAnimations(): void {
    this.projectMarkers.forEach((marker, projectId) => {
      if (projectId === this.selectedProjectId) {
        // 选中项目的旋转动画
        marker.group.rotation.y += 0.01;
      }
    });
    
    // 更新天气效果
    if (this.weatherEffects) {
      this.weatherEffects.update(0.016); // 假设60fps
    }
    
    // 更新云渲染
    if (this.cloudSystem) {
      this.cloudSystem.update(0.016);
    }
  }

  // ======================= 3D地形创建 ======================
  
  private create3DTerrain(): void {
    console.log('🏔️ 创建真正的3D地形...');
    
    // 清除之前的地形
    const existingTerrain = this.scene.getObjectByName('terrain');
    if (existingTerrain) {
      this.scene.remove(existingTerrain);
    }
    
    // 清除所有2D瓦片
    this.clearAllTiles();
    
    // 清除SimpleTileRenderer的瓦片
    if (this.simpleTileRenderer) {
      this.simpleTileRenderer.dispose();
    }
    
    // 创建高精度地形网格
    const terrainSize = 500;
    const segments = 256; // 高分辨率
    const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
    
    // 生成真实的地形高度数据
    const vertices = geometry.attributes.position.array as Float32Array;
    const heightScale = 30; // 地形高度缩放
    
    for (let i = 0; i < vertices.length; i += 3) {
      const x = vertices[i];
      const y = vertices[i + 1];
      
      // 使用多层噪声生成真实地形
      let height = 0;
      
      // 大尺度地形特征
      height += Math.sin(x * 0.01) * Math.cos(y * 0.01) * 15;
      
      // 中等尺度起伏
      height += Math.sin(x * 0.05) * Math.cos(y * 0.03) * 8;
      
      // 小尺度细节
      height += Math.sin(x * 0.1) * Math.cos(y * 0.08) * 3;
      
      // 随机噪声
      height += (Math.random() - 0.5) * 2;
      
      vertices[i + 2] = height;
    }
    
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    
    // 创建地形材质 - 使用高质量渐变
    const material = new THREE.MeshLambertMaterial({
      vertexColors: true,
      wireframe: false
    });
    
    // 根据高度为顶点着色
    const colors = new Float32Array(vertices.length);
    for (let i = 0; i < vertices.length; i += 3) {
      const height = vertices[i + 2];
      
      if (height < 0) {
        // 水面 - 蓝色
        colors[i] = 0.2;
        colors[i + 1] = 0.4;
        colors[i + 2] = 0.8;
      } else if (height < 5) {
        // 低地 - 绿色
        colors[i] = 0.3;
        colors[i + 1] = 0.6;
        colors[i + 2] = 0.2;
      } else if (height < 15) {
        // 丘陵 - 黄绿色
        colors[i] = 0.5;
        colors[i + 1] = 0.6;
        colors[i + 2] = 0.3;
      } else {
        // 山峰 - 灰褐色
        colors[i] = 0.6;
        colors[i + 1] = 0.5;
        colors[i + 2] = 0.4;
      }
    }
    
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const terrainMesh = new THREE.Mesh(geometry, material);
    terrainMesh.rotation.x = -Math.PI / 2;
    terrainMesh.name = 'terrain';
    
    this.scene.add(terrainMesh);
    
    // 添加合适的光照
    this.setupTerrainLighting();
    
    // 调整相机位置以获得更好的3D视角
    this.camera.position.set(0, 50, 100);
    this.camera.lookAt(0, 0, 0);
    
    console.log('✅ 3D地形创建完成');
  }
  
  private setupTerrainLighting(): void {
    // 清除旧光源
    const lights = this.scene.children.filter(child => child.type.includes('Light'));
    lights.forEach(light => this.scene.remove(light));
    
    // 环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    this.scene.add(ambientLight);
    
    // 主要方向光 - 模拟太阳
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);
    
    // 辅助光源 - 增加层次感
    const fillLight = new THREE.DirectionalLight(0x87ceeb, 0.3);
    fillLight.position.set(-50, 30, -50);
    this.scene.add(fillLight);
  }

  // ======================= 新的简单瓦片方法 =======================

  /**
   * 使用SimpleTileRenderer加载瓦片 - 确保真的能显示！
   */
  private async loadVisibleTilesWithSimpleRenderer(): Promise<void> {
    console.log('🗺️ SimpleTileRenderer: 开始加载瓦片...');
    
    try {
      // 设置中心和缩放
      this.simpleTileRenderer.setCenter(this.center.lat, this.center.lng);
      this.simpleTileRenderer.setZoom(this.zoom);
      
      // 加载瓦片
      await this.simpleTileRenderer.loadVisibleTiles();
      
      // 获取统计信息
      const stats = this.simpleTileRenderer.getTileStats();
      console.log(`✅ SimpleTileRenderer: 瓦片加载完成 ${stats.loaded}/${stats.total}`);
      
      if (stats.loaded > 0) {
        console.log('🎉 瓦片已成功显示！地图不再是"死地图"！');
      } else {
        console.warn('⚠️ 没有瓦片加载成功，可能存在网络问题');
      }
      
    } catch (error) {
      console.error('❌ SimpleTileRenderer加载失败:', error);
      console.log('🔄 尝试使用旧版瓦片加载方法...');
      
      // 降级到旧方法
      await this.loadVisibleTiles();
    }
  }

  // ======================= 公共接口方法 =======================

  public async switchMapStyle(style: MapStyle): Promise<void> {
    console.log(`🎨 切换地图样式: ${style}`);
    this.currentStyle = style;
    
    // 使用SimpleTileRenderer切换样式
    try {
      const styleMap: Record<MapStyle, 'osm' | 'google_satellite' | 'cartodb_dark'> = {
        'street': 'osm',
        'satellite': 'google_satellite', 
        'terrain': 'osm', // 暂时使用OSM作为地形图
        'dark': 'cartodb_dark'
      };
      
      const simpleTileStyle = styleMap[style] || 'osm';
      console.log(`🎨 SimpleTileRenderer切换到: ${simpleTileStyle}`);
      
      await this.simpleTileRenderer.setMapStyle(simpleTileStyle);
      console.log(`✅ 地图样式切换完成: ${style}`);
      
    } catch (error) {
      console.error(`❌ SimpleTileRenderer样式切换失败，尝试旧方法:`, error);
      // 降级到旧方法
      await this.reloadVisibleTiles();
    }
  }

  public setCenter(coordinates: Coordinates): void {
    console.log(`📍 设置地图中心: ${coordinates.lat}, ${coordinates.lng}`);
    this.center = coordinates;
    
    // 使用SimpleTileRenderer重新加载
    this.simpleTileRenderer.setCenter(coordinates.lat, coordinates.lng);
    this.loadVisibleTilesWithSimpleRenderer();
  }

  public setZoom(level: number): void {
    console.log(`🔍 设置缩放级别: ${level}`);
    this.zoom = Math.max(1, Math.min(18, level));
    
    // 调整相机高度
    this.camera.position.y = Math.pow(2, 18 - this.zoom) * 2;
    
    // 使用SimpleTileRenderer重新加载
    this.simpleTileRenderer.setZoom(this.zoom);
    this.loadVisibleTilesWithSimpleRenderer();
  }

  public addProjectMarker(projectData: ProjectMarkerData): void {
    console.log(`📌 添加项目标记: ${projectData.name}`);
    
    // 移除已存在的标记
    if (this.projectMarkers.has(projectData.id)) {
      this.removeProjectMarker(projectData.id);
    }
    
    // 创建新标记
    const marker = new ProjectMarker3D(projectData);
    
    // 计算世界位置
    const centerTile = this.tileProvider.lngLatToTile(this.center.lng, this.center.lat, this.zoom);
    const projectTile = this.tileProvider.lngLatToTile(projectData.location.lng, projectData.location.lat, this.zoom);
    
    const worldPos = this.tileProvider.getTileWorldPosition(
      projectTile.x, 
      projectTile.y, 
      centerTile, 
      this.tileScale
    );
    
    marker.group.position.copy(worldPos);
    
    // 异步加载天气数据
    this.loadProjectWeather(projectData, marker);
    
    // 添加到场景和管理器
    this.scene.add(marker.group);
    this.projectMarkers.set(projectData.id, marker);
  }

  private async loadProjectWeather(projectData: ProjectMarkerData, marker: ProjectMarker3D): Promise<void> {
    try {
      const weather = await openMeteoService.getWeatherData(
        projectData.location.lat,
        projectData.location.lng
      );
      
      marker.updateWeatherDisplay(weather);
      
      // 更新全局天气效果
      this.updateGlobalWeatherEffects(weather);
      
      console.log(`🌤️ 项目天气数据加载完成: ${projectData.name}`);
      
    } catch (error) {
      console.warn(`⚠️ 项目天气数据加载失败: ${projectData.name}`, error);
    }
  }

  private updateGlobalWeatherEffects(weather: WeatherData): void {
    if (this.weatherEffects) {
      this.weatherEffects.updateFromWeatherData(weather);
    }
    
    if (this.cloudSystem) {
      this.cloudSystem.updateFromWeatherData(weather);
    }
    
    console.log(`🌦️ 全局天气效果已更新: ${weather.description}`);
  }

  public removeProjectMarker(projectId: string): void {
    const marker = this.projectMarkers.get(projectId);
    if (marker) {
      this.scene.remove(marker.group);
      marker.dispose();
      this.projectMarkers.delete(projectId);
      console.log(`🗑️ 移除项目标记: ${projectId}`);
    }
  }

  public selectProject(projectId: string): void {
    // 取消之前的选择
    if (this.selectedProjectId) {
      const prevMarker = this.projectMarkers.get(this.selectedProjectId);
      if (prevMarker) {
        prevMarker.setSelected(false);
      }
    }
    
    // 选择新项目
    this.selectedProjectId = projectId;
    const marker = this.projectMarkers.get(projectId);
    if (marker) {
      marker.setSelected(true);
      console.log(`🎯 选择项目: ${projectId}`);
    }
  }

  public async flyToProject(projectId: string): Promise<void> {
    const marker = this.projectMarkers.get(projectId);
    if (!marker || this.isFlying) return;
    
    console.log(`🚁 飞行到项目: ${projectId}`);
    this.isFlying = true;
    
    const targetPosition = marker.group.position.clone();
    targetPosition.y = 8; // 飞行高度
    targetPosition.z += 5; // 稍微偏移以便观察
    
    // 简单的线性插值飞行动画
    const startPosition = this.camera.position.clone();
    const duration = 2000; // 2秒
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const animateFlight = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);
        
        this.camera.position.lerpVectors(startPosition, targetPosition, eased);
        this.camera.lookAt(marker.group.position);
        
        if (progress < 1) {
          requestAnimationFrame(animateFlight);
        } else {
          this.isFlying = false;
          this.selectProject(projectId);
          console.log('✅ 飞行完成');
          resolve();
        }
      };
      
      animateFlight();
    });
  }

  public async loadVisibleTiles(): Promise<void> {
    console.log('🗺️ 开始加载可视瓦片...');
    
    // 计算可视瓦片范围
    const tileRange = this.calculateVisibleTileRange();
    if (!tileRange) {
      console.warn('⚠️ 无法计算瓦片范围');
      return;
    }
    
    console.log(`📊 瓦片范围: X(${tileRange.minX}-${tileRange.maxX}), Y(${tileRange.minY}-${tileRange.maxY}), Zoom=${this.zoom}`);
    
    // 清理不可见的瓦片
    this.cleanupInvisibleTiles(tileRange);
    
    // 加载新瓦片
    const loadPromises: Promise<void>[] = [];
    let tilesCreated = 0;
    
    for (let x = tileRange.minX; x <= tileRange.maxX; x++) {
      for (let y = tileRange.minY; y <= tileRange.maxY; y++) {
        const tileKey = `${this.zoom}_${x}_${y}`;
        
        if (!this.tiles.has(tileKey)) {
          const tileCoord: TileCoord = { x, y, z: this.zoom };
          const centerTile = this.tileProvider.lngLatToTile(this.center.lng, this.center.lat, this.zoom);
          const worldPos = this.tileProvider.getTileWorldPosition(x, y, centerTile, this.tileScale);
          
          console.log(`🎯 创建瓦片 ${tileKey} 在位置 (${worldPos.x.toFixed(2)}, ${worldPos.y.toFixed(2)}, ${worldPos.z.toFixed(2)})`);
          
          const tile = new MapTile(tileCoord, worldPos, this.tileScale);
          this.tiles.set(tileKey, tile);
          this.scene.add(tile.mesh);
          tilesCreated++;
          
          // 异步加载纹理
          loadPromises.push(tile.loadTexture(this.tileProvider, this.currentStyle));
        }
      }
    }
    
    this.visibleTileRange = tileRange;
    
    console.log(`🔨 创建了 ${tilesCreated} 个新瓦片，开始加载纹理...`);
    
    if (loadPromises.length > 0) {
      console.log(`🔄 加载 ${loadPromises.length} 个瓦片纹理...`);
      try {
        await Promise.all(loadPromises);
        console.log('✅ 所有瓦片纹理加载完成');
      } catch (error) {
        console.error('❌ 瓦片纹理加载失败:', error);
      }
    } else {
      console.log('ℹ️ 没有新瓦片需要加载');
    }
    
    // 强制触发重新渲染
    this.renderer.render(this.scene, this.camera);
    console.log('🎨 强制重新渲染场景');
  }

  private async reloadVisibleTiles(): Promise<void> {
    // 重新加载所有可见瓦片的纹理
    const reloadPromises: Promise<void>[] = [];
    
    this.tiles.forEach((tile) => {
      reloadPromises.push(tile.loadTexture(this.tileProvider, this.currentStyle));
    });
    
    if (reloadPromises.length > 0) {
      console.log(`🔄 重新加载 ${reloadPromises.length} 个瓦片...`);
      await Promise.all(reloadPromises);
      console.log('✅ 瓦片重新加载完成');
    }
  }

  private calculateVisibleTileRange(): { minX: number; maxX: number; minY: number; maxY: number } | null {
    const centerTile = this.tileProvider.lngLatToTile(this.center.lng, this.center.lat, this.zoom);
    const tileRadius = Math.max(2, Math.min(6, 20 - this.zoom)); // 根据缩放级别调整范围
    
    const maxTile = Math.pow(2, this.zoom) - 1;
    
    return {
      minX: Math.max(0, centerTile.x - tileRadius),
      maxX: Math.min(maxTile, centerTile.x + tileRadius),
      minY: Math.max(0, centerTile.y - tileRadius),
      maxY: Math.min(maxTile, centerTile.y + tileRadius)
    };
  }

  private cleanupInvisibleTiles(newRange: { minX: number; maxX: number; minY: number; maxY: number }): void {
    const tilesToRemove: string[] = [];
    
    this.tiles.forEach((tile, key) => {
      const coord = tile.tileCoord;
      if (coord.x < newRange.minX || coord.x > newRange.maxX ||
          coord.y < newRange.minY || coord.y > newRange.maxY ||
          coord.z !== this.zoom) {
        tilesToRemove.push(key);
      }
    });
    
    tilesToRemove.forEach(key => {
      const tile = this.tiles.get(key);
      if (tile) {
        this.scene.remove(tile.mesh);
        tile.dispose();
        this.tiles.delete(key);
      }
    });
    
    if (tilesToRemove.length > 0) {
      console.log(`🗑️ 清理 ${tilesToRemove.length} 个不可见瓦片`);
    }
  }

  public setProjectClickHandler(handler: (projectId: string) => void): void {
    this.onProjectClick = handler;
  }

  // ======================= 天气效果控制接口 =======================

  public setRainEnabled(enabled: boolean): void {
    if (this.weatherEffects) {
      this.weatherEffects.setRainEnabled(enabled);
      console.log(`🌧️ 雨滴效果: ${enabled ? '启用' : '禁用'}`);
    }
  }

  public setSnowEnabled(enabled: boolean): void {
    if (this.weatherEffects) {
      this.weatherEffects.setSnowEnabled(enabled);
      console.log(`❄️ 雪花效果: ${enabled ? '启用' : '禁用'}`);
    }
  }

  public setFogEnabled(enabled: boolean): void {
    if (this.weatherEffects) {
      this.weatherEffects.setFogEnabled(enabled);
      console.log(`🌫️ 雾气效果: ${enabled ? '启用' : '禁用'}`);
    }
  }

  public setCloudsEnabled(enabled: boolean): void {
    if (this.cloudSystem) {
      this.cloudSystem.applyCoverage(enabled ? 0.7 : 0.0);
      console.log(`☁️ 云彩效果: ${enabled ? '启用' : '禁用'}`);
    }
  }

  public setWeatherIntensity(intensity: number): void {
    if (this.weatherEffects) {
      this.weatherEffects.setIntensity(intensity);
    }
    if (this.cloudSystem) {
      this.cloudSystem.setDensity(intensity);
    }
    console.log(`🌦️ 天气强度设置为: ${intensity.toFixed(2)}`);
  }

  public setCloudCoverage(coverage: number): void {
    if (this.cloudSystem) {
      this.cloudSystem.applyCoverage(coverage);
      console.log(`☁️ 云层覆盖度设置为: ${coverage.toFixed(2)}`);
    }
  }

  public async loadWeatherForLocation(lat: number, lng: number): Promise<void> {
    try {
      const weather = await openMeteoService.getWeatherData(lat, lng);
      this.updateGlobalWeatherEffects(weather);
      console.log(`🌤️ 位置天气加载完成: (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
    } catch (error) {
      console.warn('⚠️ 天气数据加载失败:', error);
    }
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  public getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  public dispose(): void {
    console.log('🗑️ 清理geo-three地图控制器');
    
    // 停止渲染循环
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    
    // 清理SimpleTileRenderer
    if (this.simpleTileRenderer) {
      this.simpleTileRenderer.dispose();
    }
    
    // 清理瓦片 (兼容旧代码)
    this.tiles.forEach(tile => tile.dispose());
    this.tiles.clear();
    
    // 清理项目标记
    this.projectMarkers.forEach(marker => marker.dispose());
    this.projectMarkers.clear();
    
    // 清理天气效果
    if (this.weatherEffects) {
      this.weatherEffects.dispose();
    }
    
    if (this.cloudSystem) {
      this.cloudSystem.dispose();
    }
    
    // 清理渲染器
    this.renderer.dispose();
    
    console.log('✅ geo-three地图控制器清理完成');
  }
}

export default GeoThreeMapController;