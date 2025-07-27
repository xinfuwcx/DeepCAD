/**
 * 真正集成地图、气象、项目定位的Epic控制中心
 * 包含：真实地图底图 + 气象数据 + 项目标记 + 飞行效果
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// 修复leaflet图标问题
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

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
  private apiKey = 'demo'; // 使用免费API

  async getWeather(lat: number, lng: number): Promise<WeatherData> {
    try {
      // 使用免费的Open-Meteo API
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

// 飞行相机控制组件
const FlightController: React.FC<{
  targetProject: Project | null;
  onFlightComplete: () => void;
}> = ({ targetProject, onFlightComplete }) => {
  const map = useMap();

  useEffect(() => {
    if (!targetProject) return;

    console.log(`🚁 Flying to ${targetProject.name}`);

    // 飞行到目标位置
    map.flyTo([targetProject.lat, targetProject.lng], 12, {
      duration: 2, // 2秒飞行时间
      easeLinearity: 0.1
    });

    // 飞行完成后回调
    const timer = setTimeout(() => {
      onFlightComplete();
    }, 2500);

    return () => clearTimeout(timer);
  }, [targetProject, map, onFlightComplete]);

  return null;
};

// 自定义项目标记图标
const createProjectIcon = (project: Project) => {
  const color = project.status === 'completed' ? '#52c41a' : 
               project.status === 'active' ? '#faad14' : '#d9d9d9';
  
  return L.divIcon({
    className: 'custom-project-marker',
    html: `
      <div style="
        width: 40px;
        height: 40px;
        background: ${color};
        border: 3px solid white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        font-size: 18px;
        color: white;
        font-weight: bold;
      ">
        🏗️
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });
};

// 气象层组件
const WeatherLayer: React.FC<{
  visible: boolean;
  projects: Project[];
}> = ({ visible, projects }) => {
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const map = useMap();

  useEffect(() => {
    if (!visible) return;

    // 为每个项目获取天气数据
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
  }, [visible, projects]);

  if (!visible) return null;

  return (
    <>
      {projects.map(project => {
        const weather = weatherData[project.id];
        if (!weather) return null;

        return (
          <Marker
            key={`weather-${project.id}`}
            position={[project.lat + 0.1, project.lng + 0.1]}
            icon={L.divIcon({
              className: 'weather-marker',
              html: `
                <div style="
                  background: rgba(0,0,0,0.8);
                  color: white;
                  padding: 8px;
                  border-radius: 8px;
                  font-size: 12px;
                  white-space: nowrap;
                  border: 1px solid #00ffff;
                ">
                  ${weather.icon} ${weather.temperature}°C<br/>
                  💨 ${weather.windSpeed}km/h
                </div>
              `,
              iconSize: [80, 40],
              iconAnchor: [40, 20]
            })}
          />
        );
      })}
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
  const [mapCenter, setMapCenter] = useState<[number, number]>([31.2304, 113.0000]); // 中国中心

  // 处理项目点击
  const handleProjectClick = useCallback((project: Project) => {
    if (isFlying) return;
    
    console.log(`🎯 Project selected: ${project.name}`);
    setIsFlying(true);
    setFlightTarget(project);
    setSelectedProject(project);
  }, [isFlying]);

  // 飞行完成回调
  const handleFlightComplete = useCallback(() => {
    console.log('✈️ Flight completed');
    setIsFlying(false);
    setFlightTarget(null);
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
            }}>🗺️</div>
            <div>
              <h1 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>
                Epic地图控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '10px' }}>
                真实地图 + 实时气象 + 项目定位
              </p>
            </div>
          </div>

          {/* 地图样式切换 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {MAP_STYLES.map(style => (
              <button
                key={style.id}
                onClick={() => setCurrentMapStyle(style)}
                style={{
                  background: currentMapStyle.id === style.id ? 
                    'rgba(0, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '6px',
                  color: '#ffffff',
                  padding: '6px 12px',
                  fontSize: '10px',
                  cursor: 'pointer'
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

      {/* 主地图容器 */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1
      }}>
        <MapContainer
          center={mapCenter}
          zoom={6}
          style={{ width: '100%', height: '100%' }}
          zoomControl={true}
        >
          <TileLayer
            url={currentMapStyle.url}
            attribution={currentMapStyle.attribution}
          />

          {/* 飞行控制器 */}
          <FlightController
            targetProject={flightTarget}
            onFlightComplete={handleFlightComplete}
          />

          {/* 项目标记 */}
          {PROJECTS.map(project => (
            <Marker
              key={project.id}
              position={[project.lat, project.lng]}
              icon={createProjectIcon(project)}
              eventHandlers={{
                click: () => handleProjectClick(project)
              }}
            >
              <Popup>
                <div style={{ minWidth: '200px' }}>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1890ff' }}>
                    {project.name}
                  </h3>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    📍 {project.lat.toFixed(4)}°N, {project.lng.toFixed(4)}°E
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    🕳️ 深度: {project.depth}m
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    📊 进度: {project.progress}%
                  </p>
                  <p style={{ margin: '4px 0', fontSize: '12px' }}>
                    📝 {project.description}
                  </p>
                  <div style={{
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: project.status === 'completed' ? '#f6ffed' : 
                               project.status === 'active' ? '#fff7e6' : '#f5f5f5',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: project.status === 'completed' ? '#52c41a' : 
                           project.status === 'active' ? '#faad14' : '#999'
                  }}>
                    状态: {project.status === 'completed' ? '已完成' : 
                           project.status === 'active' ? '施工中' : '规划中'}
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

          {/* 气象层 */}
          <WeatherLayer visible={showWeather} projects={PROJECTS} />
        </MapContainer>
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
            <div style={{ fontSize: '16px', marginBottom: '5px' }}>地图飞行中...</div>
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