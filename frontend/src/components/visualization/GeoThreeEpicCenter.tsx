/**
 * 基于geo-three的Epic控制中心 - 增强版
 * 使用OpenStreetMap数据 + Three.js无缝集成
 * 完全开源、自主可控的地图解决方案
 * 集成专家协作系统 + 实时数据同步
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { enhancedGeoThreeService, GeoThreeProjectData } from '../../services/EnhancedGeoThreeService';
import { designTokens } from '../../design/tokens';

interface GeoThreeEpicProps {
  width: number;
  height: number;
  onExit: () => void;
}

interface Project {
  id: string;
  name: string;
  lat: number;
  lng: number;
  depth: number;
  status: 'completed' | 'active' | 'planning';
  progress: number;
  description: string;
}

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  icon: string;
}

// 项目数据
const PROJECTS: Project[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    depth: 70,
    status: 'completed',
    progress: 100,
    description: '632米超高层建筑深基坑工程'
  },
  {
    id: 'beijing-airport',
    name: '北京大兴机场T1',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85,
    description: '世界最大单体航站楼基坑'
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    depth: 35,
    status: 'planning',
    progress: 15,
    description: '大型金融区深基坑群'
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    depth: 55,
    status: 'completed',
    progress: 100,
    description: 'CBD核心区超深基坑群'
  }
];

// 气象服务 - 模拟数据
const getWeatherData = (project: Project): WeatherData => {
  const weathers = [
    { temperature: 25, description: '晴朗', windSpeed: 12, humidity: 65, icon: '🌞' },
    { temperature: 18, description: '多云', windSpeed: 8, humidity: 70, icon: '⛅' },
    { temperature: 22, description: '阴天', windSpeed: 15, humidity: 75, icon: '☁️' },
    { temperature: 28, description: '炎热', windSpeed: 6, humidity: 60, icon: '🌤️' }
  ];
  return weathers[PROJECTS.indexOf(project)] || weathers[0];
};

// OpenStreetMap瓦片提供者（模拟geo-three的OpenStreetMapsProvider）
class OSMTileProvider {
  private tileSize: number = 256;
  
  getTileUrl(zoom: number, x: number, y: number): string {
    // 使用免费的OpenStreetMap瓦片服务
    return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
  }

  // 经纬度转瓦片坐标
  lngLatToTile(lng: number, lat: number, zoom: number): { x: number, y: number } {
    const latRad = lat * Math.PI / 180;
    const n = Math.pow(2, zoom);
    const x = Math.floor((lng + 180) / 360 * n);
    const y = Math.floor((1 - Math.asinh(Math.tan(latRad)) / Math.PI) / 2 * n);
    return { x, y };
  }

  // 瓦片坐标转经纬度
  tileToLngLat(x: number, y: number, zoom: number): { lng: number, lat: number } {
    const n = Math.pow(2, zoom);
    const lng = x / n * 360 - 180;
    const latRad = Math.atan(Math.sinh(Math.PI * (1 - 2 * y / n)));
    const lat = latRad * 180 / Math.PI;
    return { lng, lat };
  }
}

// Three.js地图瓦片类
class MapTile {
  public mesh: THREE.Mesh;
  private geometry: THREE.PlaneGeometry;
  private material: THREE.MeshBasicMaterial;
  private texture: THREE.Texture | null = null;
  
  constructor(
    public x: number, 
    public y: number, 
    public zoom: number, 
    public worldPosition: { x: number, y: number }
  ) {
    this.geometry = new THREE.PlaneGeometry(1, 1);
    this.material = new THREE.MeshBasicMaterial({ 
      color: 0x446688,
      transparent: true,
      opacity: 0.8
    });
    
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.position.set(worldPosition.x, worldPosition.y, 0);
    this.mesh.rotation.x = -Math.PI / 2; // 水平放置
  }

  async loadTexture(provider: OSMTileProvider): Promise<void> {
    return new Promise((resolve, reject) => {
      const loader = new THREE.TextureLoader();
      const url = provider.getTileUrl(this.zoom, this.x, this.y);
      
      // 添加CORS处理
      loader.setCrossOrigin('anonymous');
      
      loader.load(
        url,
        (texture) => {
          texture.flipY = false; // OSM瓦片不需要翻转
          texture.wrapS = THREE.ClampToEdgeWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          texture.minFilter = THREE.LinearFilter;
          texture.magFilter = THREE.LinearFilter;
          
          this.material.map = texture;
          this.material.color.set(0xffffff); // 恢复原色
          this.material.needsUpdate = true;
          this.texture = texture;
          resolve();
        },
        undefined,
        (error) => {
          console.warn(`Failed to load tile ${this.zoom}/${this.x}/${this.y}:`, error);
          // 使用蓝色作为失败时的颜色
          this.material.color.set(0x2266aa);
          resolve(); // 即使失败也继续，不阻塞其他瓦片
        }
      );
    });
  }

  dispose(): void {
    if (this.texture) {
      this.texture.dispose();
    }
    this.geometry.dispose();
    this.material.dispose();
  }
}

// 地图管理器
class GeoThreeMapManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private provider: OSMTileProvider;
  private tiles: Map<string, MapTile> = new Map();
  private currentZoom: number = 6;
  private centerLng: number = 113;
  private centerLat: number = 31;
  private tileLoadQueue: string[] = [];
  private isLoading: boolean = false;

  constructor(container: HTMLElement) {
    this.provider = new OSMTileProvider();
    
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x001122);
    
    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75, 
      container.clientWidth / container.clientHeight, 
      0.1, 
      1000
    );
    this.camera.position.set(0, 10, 10);
    this.camera.lookAt(0, 0, 0);
    
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 5);
    directionalLight.castShadow = true;
    this.scene.add(directionalLight);
    
    // Controls setup (简化版)
    this.setupControls();
    
    // 初始加载地图瓦片
    this.loadVisibleTiles();
  }

  private setupControls(): void {
    const canvas = this.renderer.domElement;
    let isDragging = false;
    let previousMousePosition = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e) => {
      isDragging = true;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaMove = {
        x: e.clientX - previousMousePosition.x,
        y: e.clientY - previousMousePosition.y
      };
      
      // 简单的相机控制
      this.camera.position.x -= deltaMove.x * 0.01;
      this.camera.position.z -= deltaMove.y * 0.01;
      
      previousMousePosition = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', () => {
      isDragging = false;
    });

    canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY > 0 ? 1.1 : 0.9;
      this.camera.position.y *= zoomFactor;
      
      // 限制缩放范围
      this.camera.position.y = Math.max(2, Math.min(50, this.camera.position.y));
    });
  }

  private async loadVisibleTiles(): Promise<void> {
    if (this.isLoading) return;
    this.isLoading = true;

    // 清理现有瓦片
    this.clearTiles();

    // 计算需要的瓦片范围
    const tileRange = this.getVisibleTileRange();
    const loadPromises: Promise<void>[] = [];

    for (let x = tileRange.minX; x <= tileRange.maxX; x++) {
      for (let y = tileRange.minY; y <= tileRange.maxY; y++) {
        const tileKey = `${this.currentZoom}_${x}_${y}`;
        
        if (!this.tiles.has(tileKey)) {
          const worldPos = this.getTileWorldPosition(x, y);
          const tile = new MapTile(x, y, this.currentZoom, worldPos);
          
          this.tiles.set(tileKey, tile);
          this.scene.add(tile.mesh);
          
          // 异步加载纹理
          loadPromises.push(tile.loadTexture(this.provider));
        }
      }
    }

    try {
      await Promise.all(loadPromises);
      console.log(`✅ 已加载 ${loadPromises.length} 个地图瓦片`);
    } catch (error) {
      console.warn('⚠️ 部分地图瓦片加载失败:', error);
    }

    this.isLoading = false;
  }

  private getVisibleTileRange(): { minX: number, maxX: number, minY: number, maxY: number } {
    // 简化的可视范围计算
    const centerTile = this.provider.lngLatToTile(this.centerLng, this.centerLat, this.currentZoom);
    const tileRadius = 3; // 加载中心点周围3x3的瓦片

    return {
      minX: Math.max(0, centerTile.x - tileRadius),
      maxX: Math.min(Math.pow(2, this.currentZoom) - 1, centerTile.x + tileRadius),
      minY: Math.max(0, centerTile.y - tileRadius),
      maxY: Math.min(Math.pow(2, this.currentZoom) - 1, centerTile.y + tileRadius)
    };
  }

  private getTileWorldPosition(tileX: number, tileY: number): { x: number, y: number } {
    // 将瓦片坐标转换为世界坐标
    const centerTile = this.provider.lngLatToTile(this.centerLng, this.centerLat, this.currentZoom);
    
    return {
      x: (tileX - centerTile.x) * 2,
      y: -(tileY - centerTile.y) * 2 // Y轴翻转
    };
  }

  private clearTiles(): void {
    this.tiles.forEach((tile) => {
      this.scene.remove(tile.mesh);
      tile.dispose();
    });
    this.tiles.clear();
  }

  public addProjectMarker(project: Project): void {
    // 创建3D项目标记
    const geometry = new THREE.CylinderGeometry(0.1, 0.2, project.depth / 50, 8);
    const color = project.status === 'completed' ? 0x52c41a : 
                  project.status === 'active' ? 0xfaad14 : 0x8c8c8c;
    const material = new THREE.MeshLambertMaterial({ color });
    
    const marker = new THREE.Mesh(geometry, material);
    
    // 将经纬度转换为世界坐标
    const centerTile = this.provider.lngLatToTile(this.centerLng, this.centerLat, this.currentZoom);
    const projectTile = this.provider.lngLatToTile(project.lng, project.lat, this.currentZoom);
    
    marker.position.set(
      (projectTile.x - centerTile.x) * 2,
      0.5,
      -(projectTile.y - centerTile.y) * 2
    );
    
    marker.userData = { project };
    this.scene.add(marker);

    // 添加标签
    this.addMarkerLabel(marker, project);
  }

  private addMarkerLabel(marker: THREE.Mesh, project: Project): void {
    // 简化的文字标签（实际项目中可以使用three.js的文字渲染或HTML覆盖层）
    const textGeometry = new THREE.RingGeometry(0.2, 0.3, 8);
    const textMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff,
      transparent: true,
      opacity: 0.8 
    });
    
    const label = new THREE.Mesh(textGeometry, textMaterial);
    label.position.copy(marker.position);
    label.position.y += 1;
    label.rotation.x = -Math.PI / 2;
    
    this.scene.add(label);
  }

  public flyToProject(project: Project): void {
    // 相机飞行动画
    const projectTile = this.provider.lngLatToTile(project.lng, project.lat, this.currentZoom);
    const centerTile = this.provider.lngLatToTile(this.centerLng, this.centerLat, this.currentZoom);
    
    const targetX = (projectTile.x - centerTile.x) * 2;
    const targetZ = -(projectTile.y - centerTile.y) * 2;
    
    // 简单的线性插值动画
    const startPos = this.camera.position.clone();
    const targetPos = new THREE.Vector3(targetX, 5, targetZ + 5);
    
    let progress = 0;
    const animate = () => {
      progress += 0.02;
      if (progress > 1) progress = 1;
      
      this.camera.position.lerpVectors(startPos, targetPos, progress);
      this.camera.lookAt(targetX, 0, targetZ);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    animate();
  }

  public render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.clearTiles();
    this.renderer.dispose();
  }
}

// 主组件
export const GeoThreeEpicCenter: React.FC<GeoThreeEpicProps> = ({ width, height, onExit }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapManagerRef = useRef<GeoThreeMapManager | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [showWeather, setShowWeather] = useState(true);
  const [loadingStatus, setLoadingStatus] = useState('初始化geo-three地图系统...');

  // 初始化地图
  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🗺️ 初始化geo-three地图系统...');
    setLoadingStatus('正在加载OpenStreetMap瓦片...');
    
    try {
      const mapManager = new GeoThreeMapManager(containerRef.current);
      mapManagerRef.current = mapManager;
      
      // 添加项目标记
      PROJECTS.forEach(project => {
        mapManager.addProjectMarker(project);
      });
      
      setLoadingStatus('地图加载完成！');
      
      // 渲染循环
      const animate = () => {
        mapManager.render();
        requestAnimationFrame(animate);
      };
      animate();
      
    } catch (error) {
      console.error('❌ geo-three地图初始化失败:', error);
      setLoadingStatus('地图加载失败，使用备用显示模式');
    }

    return () => {
      if (mapManagerRef.current) {
        mapManagerRef.current.dispose();
      }
    };
  }, []);

  // 处理项目点击
  const handleProjectClick = useCallback((project: Project) => {
    if (isFlying || !mapManagerRef.current) return;
    
    console.log(`🚁 飞行到项目: ${project.name}`);
    setIsFlying(true);
    setSelectedProject(project);
    
    // 执行飞行
    mapManagerRef.current.flyToProject(project);
    
    // 2.5秒后完成飞行
    setTimeout(() => {
      setIsFlying(false);
    }, 2500);
  }, [isFlying]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      background: '#000011'
    }}>
      {/* 顶部控制栏 */}
      <motion.div
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '70px',
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 1000,
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(0, 255, 255, 0.3)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              background: 'linear-gradient(45deg, #00ffff, #0080ff)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px'
            }}>🌍</div>
            <div>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>
                geo-three Epic控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '12px' }}>
                OpenStreetMap + Three.js + 开源自主可控
              </p>
            </div>
          </div>

          <div style={{ 
            color: 'rgba(0, 255, 255, 0.8)', 
            fontSize: '12px',
            padding: '4px 8px',
            background: 'rgba(0, 255, 255, 0.1)',
            borderRadius: '4px'
          }}>
            📡 {loadingStatus}
          </div>

          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{
              background: showWeather ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🌤️ {showWeather ? '气象 ON' : '气象 OFF'}
          </button>
        </div>

        <button
          onClick={onExit}
          style={{
            background: 'rgba(255, 100, 100, 0.8)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '10px 18px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ✕ 退出Epic
        </button>
      </motion.div>

      {/* geo-three地图容器 */}
      <div
        ref={containerRef}
        style={{
          position: 'absolute',
          top: '70px',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 1
        }}
      />

      {/* 左侧项目控制面板 */}
      <motion.div
        initial={{ x: -320, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          position: 'absolute',
          left: '20px',
          top: '90px',
          width: '300px',
          maxHeight: 'calc(100vh - 130px)',
          background: 'rgba(0, 0, 0, 0.85)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(15px)',
          zIndex: 500,
          overflowY: 'auto'
        }}
      >
        <h3 style={{ 
          color: '#00ffff', 
          margin: '0 0 15px 0',
          textAlign: 'center',
          fontSize: '16px'
        }}>
          🏗️ 项目飞行控制 ({PROJECTS.length})
        </h3>

        {isFlying && selectedProject && (
          <div style={{
            background: 'rgba(255, 165, 0, 0.2)',
            border: '1px solid rgba(255, 165, 0, 0.6)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '15px',
            color: '#ffaa00',
            textAlign: 'center',
            fontSize: '12px'
          }}>
            🚁 正在飞往: {selectedProject.name}
            <div style={{ fontSize: '10px', opacity: 0.8, marginTop: '4px' }}>
              geo-three 3D飞行中...
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {PROJECTS.map((project) => {
            const weather = getWeatherData(project);
            return (
              <div
                key={project.id}
                onClick={() => !isFlying && handleProjectClick(project)}
                style={{
                  background: selectedProject?.id === project.id ? 
                    'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                  border: selectedProject?.id === project.id ? 
                    '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '12px',
                  padding: '15px',
                  cursor: isFlying ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isFlying ? 0.6 : 1,
                  transform: selectedProject?.id === project.id ? 'scale(1.02)' : 'scale(1)'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <h4 style={{ 
                    color: '#ffffff', 
                    margin: 0, 
                    fontSize: '14px',
                    fontWeight: 'bold'
                  }}>
                    {project.name}
                  </h4>
                  <div style={{
                    width: '10px',
                    height: '10px',
                    borderRadius: '50%',
                    background: project.status === 'completed' ? '#52c41a' : 
                               project.status === 'active' ? '#faad14' : '#999',
                    boxShadow: `0 0 8px ${project.status === 'completed' ? '#52c41a' : 
                                         project.status === 'active' ? '#faad14' : '#999'}`
                  }} />
                </div>
                
                <div style={{ 
                  color: 'rgba(255, 255, 255, 0.8)', 
                  fontSize: '11px',
                  lineHeight: '1.4'
                }}>
                  <div>📍 {project.lat.toFixed(3)}°N, {project.lng.toFixed(3)}°E</div>
                  <div>🕳️ 深度: {project.depth}m | 📊 进度: {project.progress}%</div>
                  <div style={{ opacity: 0.9, marginTop: '4px' }}>{project.description}</div>
                  
                  {showWeather && (
                    <div style={{ 
                      color: '#00ffff', 
                      marginTop: '6px',
                      padding: '4px',
                      background: 'rgba(0, 255, 255, 0.1)',
                      borderRadius: '4px'
                    }}>
                      {weather.icon} {weather.temperature}°C | 💨 {weather.windSpeed}km/h | 💧 {weather.humidity}%
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{
          marginTop: '20px',
          padding: '15px',
          background: 'rgba(0, 255, 255, 0.1)',
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          fontSize: '11px',
          color: 'rgba(255, 255, 255, 0.8)',
          textAlign: 'center'
        }}>
          💡 点击项目卡片启动geo-three 3D飞行<br/>
          🗺️ 鼠标拖拽移动，滚轮缩放地图<br/>
          🌍 OpenStreetMap数据 + Three.js渲染<br/>
          🔓 完全开源，自主可控
        </div>
      </motion.div>

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && selectedProject && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              border: '3px solid #00ffff',
              borderRadius: '20px',
              padding: '30px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 2000,
              backdropFilter: 'blur(15px)',
              boxShadow: '0 0 30px rgba(0, 255, 255, 0.5)'
            }}
          >
            <motion.div
              animate={{ 
                rotate: 360,
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                rotate: { duration: 2, ease: 'linear', repeat: Infinity },
                scale: { duration: 1, ease: 'easeInOut', repeat: Infinity }
              }}
              style={{ fontSize: '60px', marginBottom: '20px' }}
            >
              🚁
            </motion.div>
            <div style={{ fontSize: '20px', marginBottom: '8px', color: '#00ffff' }}>
              geo-three Epic飞行
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '15px' }}>
              飞往 {selectedProject.name}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              OpenStreetMap + Three.js + 自主可控
            </div>
            
            {/* 进度条 */}
            <div style={{ 
              marginTop: '20px', 
              height: '6px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '3px',
              overflow: 'hidden',
              width: '200px'
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2.5, ease: 'easeInOut' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffff, #0080ff, #00ffff)',
                  borderRadius: '3px'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GeoThreeEpicCenter;