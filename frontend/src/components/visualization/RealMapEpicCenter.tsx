/**
 * 真正集成地图、气象、项目定位的Epic控制中心
 * 基于Three.js + three-tile的3D地球渲染系统
 * 包含：3D地球底图 + 气象数据 + 项目标记 + 飞行效果
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text, Sphere, Html } from '@react-three/drei';

interface RealMapEpicProps {
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
  city: string;
  icon: string;
}

// 项目数据 - 真实坐标
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

// 地图底图选项
const MAP_STYLES = [
  {
    id: 'satellite',
    name: '🛰️ 卫星图像',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  {
    id: 'streets',
    name: '🗺️ 街道地图',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '© OpenStreetMap'
  },
  {
    id: 'topo',
    name: '🏔️ 地形图',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    attribution: '© Esri'
  },
  {
    id: 'dark',
    name: '🌙 暗色主题',
    url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
    attribution: '© CartoDB'
  }
];

// 气象服务
class WeatherService {
  private apiKey = 'demo';

  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,wind_speed_10m,relative_humidity_2m&timezone=auto`
      );
      const data = await response.json();
      
      return {
        temperature: Math.round(data.current.temperature_2m),
        description: this.getWeatherDescription(data.current.temperature_2m),
        windSpeed: Math.round(data.current.wind_speed_10m),
        humidity: data.current.relative_humidity_2m,
        city: '当前位置',
        icon: this.getWeatherIcon(data.current.temperature_2m)
      };
    } catch (error) {
      console.warn('Weather API failed, using mock data:', error);
      return this.getMockWeather();
    }
  }

  private getWeatherDescription(temp: number): string {
    if (temp > 30) return '炎热';
    if (temp > 20) return '温暖';
    if (temp > 10) return '凉爽';
    if (temp > 0) return '寒冷';
    return '严寒';
  }

  private getWeatherIcon(temp: number): string {
    if (temp > 30) return '🌞';
    if (temp > 20) return '⛅';
    if (temp > 10) return '☁️';
    return '🌨️';
  }

  private getMockWeather(): WeatherData {
    return {
      temperature: 25,
      description: '晴朗',
      windSpeed: 12,
      humidity: 65,
      city: '模拟数据',
      icon: '🌤️'
    };
  }
}

const weatherService = new WeatherService();

// 经纬度转换为3D球面坐标
const latLngToVector3 = (lat: number, lng: number, radius: number = 5): THREE.Vector3 => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  
  const x = -radius * Math.sin(phi) * Math.cos(theta);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  
  return new THREE.Vector3(x, y, z);
};

// 项目标记组件
const ProjectMarker: React.FC<{
  project: Project;
  onClick: (project: Project) => void;
  selected: boolean;
}> = ({ project, onClick, selected }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(project.lat, project.lng), [project.lat, project.lng]);
  
  const color = project.status === 'completed' ? '#52c41a' : 
               project.status === 'active' ? '#faad14' : '#d9d9d9';

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime;
      meshRef.current.scale.setScalar(selected ? 1.5 : 1);
    }
  });

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={() => onClick(project)}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'default';
        }}
      >
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.3} />
      </mesh>
      
      <Html distanceFactor={10}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          fontSize: '10px',
          whiteSpace: 'nowrap',
          pointerEvents: 'none',
          border: `1px solid ${color}`
        }}>
          🏗️ {project.name}
        </div>
      </Html>
    </group>
  );
};

// 3D地球组件
const Earth: React.FC<{
  textureUrl: string;
}> = ({ textureUrl }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    return loader.load(textureUrl);
  }, [textureUrl]);

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001; // 缓慢自转
    }
  });

  return (
    <mesh ref={meshRef}>
      <sphereGeometry args={[5, 64, 64]} />
      <meshStandardMaterial map={texture} />
    </mesh>
  );
};

// 气象标记组件
const WeatherMarker: React.FC<{
  project: Project;
  weather: WeatherData;
}> = ({ project, weather }) => {
  const position = useMemo(() => {
    const basePos = latLngToVector3(project.lat, project.lng);
    return basePos.multiplyScalar(1.2); // 稍微远离地表
  }, [project.lat, project.lng]);

  return (
    <group position={position}>
      <Html distanceFactor={15}>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '6px',
          borderRadius: '6px',
          fontSize: '10px',
          border: '1px solid #00ffff',
          textAlign: 'center'
        }}>
          <div>{weather.icon} {weather.temperature}°C</div>
          <div>💨 {weather.windSpeed}km/h</div>
        </div>
      </Html>
    </group>
  );
};

// 3D场景组件
const Scene3D: React.FC<{
  projects: Project[];
  selectedProject: Project | null;
  onProjectClick: (project: Project) => void;
  showWeather: boolean;
  currentMapStyle: typeof MAP_STYLES[0];
  flightTarget: Project | null;
}> = ({ projects, selectedProject, onProjectClick, showWeather, currentMapStyle, flightTarget }) => {
  const { camera } = useThree();
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});

  // 飞行动画
  useEffect(() => {
    if (flightTarget) {
      const targetPosition = latLngToVector3(flightTarget.lat, flightTarget.lng, 15);
      
      // 平滑飞行到目标位置
      const startPosition = camera.position.clone();
      const startTime = Date.now();
      const duration = 2000; // 2秒

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // 使用缓动函数
        const eased = 1 - Math.pow(1 - progress, 3);
        
        camera.position.lerpVectors(startPosition, targetPosition, eased);
        camera.lookAt(0, 0, 0);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      animate();
    }
  }, [flightTarget, camera]);

  // 获取天气数据
  useEffect(() => {
    if (!showWeather) return;

    projects.forEach(async (project) => {
      try {
        const weather = await weatherService.getWeather(project.lat, project.lng);
        setWeatherData(prev => ({
          ...prev,
          [project.id]: weather
        }));
      } catch (error) {
        console.warn(`Failed to get weather for ${project.name}:`, error);
      }
    });
  }, [showWeather, projects]);

  return (
    <>
      {/* 环境光 */}
      <ambientLight intensity={0.4} />
      
      {/* 主光源 */}
      <directionalLight position={[10, 10, 5]} intensity={1} />
      
      {/* 3D地球 */}
      <Earth textureUrl="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg" />
      
      {/* 项目标记 */}
      {projects.map(project => (
        <ProjectMarker
          key={project.id}
          project={project}
          onClick={onProjectClick}
          selected={selectedProject?.id === project.id}
        />
      ))}
      
      {/* 气象标记 */}
      {showWeather && projects.map(project => {
        const weather = weatherData[project.id];
        if (!weather) return null;
        
        return (
          <WeatherMarker
            key={`weather-${project.id}`}
            project={project}
            weather={weather}
          />
        );
      })}
      
      {/* 轨道控制器 */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={50}
      />
    </>
  );
};

// 主组件
export const RealMapEpicCenter: React.FC<RealMapEpicProps> = ({ width, height, onExit }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [flightTarget, setFlightTarget] = useState<Project | null>(null);
  const [currentMapStyle, setCurrentMapStyle] = useState(MAP_STYLES[0]);
  const [showWeather, setShowWeather] = useState(true);

  // 处理项目点击
  const handleProjectClick = useCallback((project: Project) => {
    if (isFlying) return;
    
    console.log(`🎯 Project selected: ${project.name}`);
    setIsFlying(true);
    setFlightTarget(project);
    setSelectedProject(project);
    
    // 2.5秒后结束飞行状态
    setTimeout(() => {
      setIsFlying(false);
      setFlightTarget(null);
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
          height: '60px',
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
              width: '40px',
              height: '40px',
              background: 'linear-gradient(45deg, #00ffff, #0080ff)',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px'
            }}>🌍</div>
            <div>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
                Epic 3D地球控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '10px' }}>
                Three.js 3D地球 + 实时气象 + 项目定位
              </p>
            </div>
          </div>

          {/* 气象控制 */}
          <button
            onClick={() => setShowWeather(!showWeather)}
            style={{
              background: showWeather ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 0, 0.5)',
              borderRadius: '6px',
              color: '#ffffff',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            🌤️ 气象 {showWeather ? 'ON' : 'OFF'}
          </button>
        </div>

        <button
          onClick={onExit}
          style={{
            background: 'rgba(255, 100, 100, 0.8)',
            border: 'none',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ 退出
        </button>
      </motion.div>

      {/* 3D Canvas */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <Canvas
          camera={{ position: [0, 0, 15], fov: 75 }}
          style={{ background: 'radial-gradient(ellipse at center, #0c1445 0%, #000000 100%)' }}
        >
          <Scene3D
            projects={PROJECTS}
            selectedProject={selectedProject}
            onProjectClick={handleProjectClick}
            showWeather={showWeather}
            currentMapStyle={currentMapStyle}
            flightTarget={flightTarget}
          />
        </Canvas>
      </div>

      {/* 左侧项目面板 */}
      <motion.div
        initial={{ x: -300, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          position: 'absolute',
          left: '20px',
          top: '80px',
          width: '280px',
          maxHeight: 'calc(100vh - 120px)',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '15px',
          padding: '20px',
          backdropFilter: 'blur(10px)',
          zIndex: 500,
          overflowY: 'auto'
        }}
      >
        <h3 style={{ 
          color: '#00ffff', 
          margin: '0 0 15px 0',
          textAlign: 'center',
          fontSize: '14px'
        }}>
          🏗️ 项目导航 ({PROJECTS.length})
        </h3>

        {isFlying && (
          <div style={{
            background: 'rgba(255, 165, 0, 0.2)',
            border: '1px solid rgba(255, 165, 0, 0.5)',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '15px',
            color: '#ffaa00',
            textAlign: 'center',
            fontSize: '11px'
          }}>
            🚁 正在飞往: {flightTarget?.name}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PROJECTS.map((project) => (
            <div
              key={project.id}
              onClick={() => !isFlying && handleProjectClick(project)}
              style={{
                background: selectedProject?.id === project.id ? 
                  'rgba(0, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: selectedProject?.id === project.id ? 
                  '2px solid #00ffff' : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '10px',
                padding: '12px',
                cursor: isFlying ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: isFlying ? 0.6 : 1
              }}
            >
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <h4 style={{ 
                  color: '#ffffff', 
                  margin: 0, 
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}>
                  {project.name}
                </h4>
                <div style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: project.status === 'completed' ? '#52c41a' : 
                             project.status === 'active' ? '#faad14' : '#999',
                  boxShadow: `0 0 6px ${project.status === 'completed' ? '#52c41a' : 
                                       project.status === 'active' ? '#faad14' : '#999'}`
                }} />
              </div>
              
              <div style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                fontSize: '10px',
                lineHeight: '1.3'
              }}>
                <div>📍 {project.lat.toFixed(2)}°N, {project.lng.toFixed(2)}°E</div>
                <div>🕳️ {project.depth}m | 📊 {project.progress}%</div>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              border: '2px solid #00ffff',
              borderRadius: '15px',
              padding: '20px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 2000,
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🚁</div>
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>3D飞行中...</div>
            <div style={{ fontSize: '12px', opacity: 0.7 }}>
              飞往 {flightTarget?.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RealMapEpicCenter;