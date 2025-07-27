/**
 * Mapbox + Three.js 集成的Epic控制中心
 * 真实地图底图 + Three.js 3D效果 + 项目定位 + 飞行动画
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import mapboxgl from 'mapbox-gl';
import * as THREE from 'three';
import 'mapbox-gl/dist/mapbox-gl.css';

// Mapbox访问令牌 - 使用公共演示令牌
mapboxgl.accessToken = 'pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4M3VycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw';

interface MapboxEpicProps {
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

// 地图样式
const MAP_STYLES = [
  { id: 'satellite-v9', name: '🛰️ 卫星图像', style: 'mapbox://styles/mapbox/satellite-v9' },
  { id: 'streets-v12', name: '🗺️ 街道地图', style: 'mapbox://styles/mapbox/streets-v12' },
  { id: 'outdoors-v12', name: '🏔️ 户外地图', style: 'mapbox://styles/mapbox/outdoors-v12' },
  { id: 'dark-v11', name: '🌙 暗色主题', style: 'mapbox://styles/mapbox/dark-v11' },
  { id: 'light-v11', name: '☀️ 亮色主题', style: 'mapbox://styles/mapbox/light-v11' }
];

// 气象服务 (模拟数据)
const getWeatherData = (project: Project): WeatherData => {
  const weathers = [
    { temperature: 25, description: '晴朗', windSpeed: 12, humidity: 65, icon: '🌞' },
    { temperature: 18, description: '多云', windSpeed: 8, humidity: 70, icon: '⛅' },
    { temperature: 22, description: '阴天', windSpeed: 15, humidity: 75, icon: '☁️' },
    { temperature: 28, description: '炎热', windSpeed: 6, humidity: 60, icon: '🌤️' }
  ];
  return weathers[PROJECTS.indexOf(project)] || weathers[0];
};

// Three.js 3D标记类
class ThreeJSMarker {
  private scene: THREE.Scene;
  private camera: THREE.Camera;
  private renderer: THREE.Renderer;
  private marker: THREE.Group;

  constructor(project: Project) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    this.renderer.setSize(60, 60);
    this.renderer.setClearColor(0x000000, 0);
    
    this.createMarker(project);
    this.camera.position.z = 5;
  }

  private createMarker(project: Project) {
    this.marker = new THREE.Group();

    // 创建3D圆柱体表示深基坑
    const geometry = new THREE.CylinderGeometry(0.5, 0.8, project.depth / 20, 8);
    const color = project.status === 'completed' ? 0x52c41a : 
                  project.status === 'active' ? 0xfaad14 : 0x8c8c8c;
    const material = new THREE.MeshLambertMaterial({ color });
    const cylinder = new THREE.Mesh(geometry, material);
    
    // 添加环境光和方向光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    
    this.scene.add(ambientLight);
    this.scene.add(directionalLight);
    this.scene.add(cylinder);
    
    this.marker = cylinder;
  }

  animate() {
    if (this.marker) {
      this.marker.rotation.y += 0.02;
    }
    this.renderer.render(this.scene, this.camera);
  }

  getDOMElement(): HTMLElement {
    return this.renderer.domElement;
  }

  dispose() {
    this.renderer.dispose();
  }
}

// 主组件
export const MapboxEpicCenter: React.FC<MapboxEpicProps> = ({ width, height, onExit }) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [currentStyle, setCurrentStyle] = useState(MAP_STYLES[0]);
  const [showWeather, setShowWeather] = useState(true);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const threeMarkersRef = useRef<Map<string, ThreeJSMarker>>(new Map());

  // 初始化地图
  useEffect(() => {
    if (!mapContainer.current) return;

    console.log('🗺️ 初始化Mapbox地图...');

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: currentStyle.style,
      center: [113.0, 31.0], // 中国中心
      zoom: 4,
      pitch: 45, // 3D视角
      bearing: 0
    });

    map.current.on('load', () => {
      console.log('✅ Mapbox地图加载完成');
      
      // 添加项目标记
      PROJECTS.forEach(project => {
        addProjectMarker(project);
      });
    });

    return () => {
      // 清理Three.js标记
      threeMarkersRef.current.forEach(marker => marker.dispose());
      threeMarkersRef.current.clear();
      
      // 清理地图
      if (map.current) {
        map.current.remove();
      }
    };
  }, []);

  // 切换地图样式
  useEffect(() => {
    if (map.current) {
      console.log(`🎨 切换地图样式: ${currentStyle.name}`);
      map.current.setStyle(currentStyle.style);
    }
  }, [currentStyle]);

  // 添加项目标记
  const addProjectMarker = useCallback((project: Project) => {
    if (!map.current) return;

    // 创建Three.js 3D标记
    const threeMarker = new ThreeJSMarker(project);
    threeMarkersRef.current.set(project.id, threeMarker);

    // 创建自定义HTML标记
    const markerElement = document.createElement('div');
    markerElement.style.width = '60px';
    markerElement.style.height = '60px';
    markerElement.style.position = 'relative';
    markerElement.style.cursor = 'pointer';

    // 添加Three.js渲染到标记
    markerElement.appendChild(threeMarker.getDOMElement());

    // 添加项目信息
    const infoElement = document.createElement('div');
    infoElement.innerHTML = `
      <div style="
        position: absolute;
        top: -30px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 10px;
        white-space: nowrap;
        border: 1px solid #00ffff;
      ">
        ${project.name}<br/>
        🕳️ ${project.depth}m | 📊 ${project.progress}%
      </div>
    `;
    markerElement.appendChild(infoElement);

    // 添加气象信息
    if (showWeather) {
      const weather = getWeatherData(project);
      const weatherElement = document.createElement('div');
      weatherElement.innerHTML = `
        <div style="
          position: absolute;
          top: 65px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,100,200,0.9);
          color: white;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 8px;
          white-space: nowrap;
        ">
          ${weather.icon} ${weather.temperature}°C 💨${weather.windSpeed}km/h
        </div>
      `;
      markerElement.appendChild(weatherElement);
    }

    // 创建Mapbox标记
    const marker = new mapboxgl.Marker({ element: markerElement })
      .setLngLat([project.lng, project.lat])
      .addTo(map.current);

    markersRef.current.set(project.id, marker);

    // 添加点击事件
    markerElement.addEventListener('click', () => {
      handleProjectClick(project);
    });

    // 启动Three.js动画
    const animate = () => {
      threeMarker.animate();
      requestAnimationFrame(animate);
    };
    animate();

  }, [showWeather]);

  // 处理项目点击 - 飞行效果
  const handleProjectClick = useCallback((project: Project) => {
    if (!map.current || isFlying) return;

    console.log(`🚁 飞行到项目: ${project.name}`);
    setIsFlying(true);
    setSelectedProject(project);

    // Mapbox飞行动画
    map.current.flyTo({
      center: [project.lng, project.lat],
      zoom: 15,
      pitch: 60,
      bearing: 0,
      duration: 2000, // 2秒飞行
      essential: true
    });

    // 飞行完成后
    setTimeout(() => {
      setIsFlying(false);
    }, 2500);

  }, [isFlying]);

  // 切换地图样式
  const handleStyleChange = useCallback((style: typeof MAP_STYLES[0]) => {
    console.log(`🎨 更换地图样式: ${style.name}`);
    setCurrentStyle(style);
  }, []);

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
            }}>🗺️</div>
            <div>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '20px' }}>
                Mapbox Epic控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.7)', margin: 0, fontSize: '12px' }}>
                真实地图底图 + Three.js 3D效果 + 项目飞行导航
              </p>
            </div>
          </div>

          {/* 地图样式切换 */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {MAP_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => handleStyleChange(style)}
                style={{
                  background: currentStyle.id === style.id ? 
                    'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 10px',
                  fontSize: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {style.name}
              </button>
            ))}
          </div>

          {/* 气象控制 */}
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

      {/* Mapbox地图容器 */}
      <div
        ref={mapContainer}
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
              Mapbox 3D飞行中...
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
          💡 点击项目卡片启动Mapbox 3D飞行<br/>
          🗺️ 使用鼠标拖拽、滚轮缩放地图<br/>
          🎮 真实地图底图 + Three.js 3D标记
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
              Mapbox Epic飞行
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9, marginBottom: '15px' }}>
              飞往 {selectedProject.name}
            </div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              3D地图导航 + Three.js标记渲染
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

export default MapboxEpicCenter;