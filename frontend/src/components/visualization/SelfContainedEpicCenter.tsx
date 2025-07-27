/**
 * 自包含Epic控制中心 - 不依赖外部地图服务
 * 使用纯CSS/SVG实现中国地图 + 项目定位 + 飞行效果 + 气象显示
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface EpicProps {
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
  // 屏幕坐标 (相对于地图容器的百分比)
  x: number; // 0-100%
  y: number; // 0-100%
}

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  icon: string;
}

// 项目数据 - 带屏幕坐标
const PROJECTS: Project[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    depth: 70,
    status: 'completed',
    progress: 100,
    description: '632米超高层建筑深基坑工程',
    x: 85, // 上海位置
    y: 45
  },
  {
    id: 'beijing-airport',
    name: '北京大兴机场T1',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85,
    description: '世界最大单体航站楼基坑',
    x: 75, // 北京位置
    y: 25
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    depth: 35,
    status: 'planning',
    progress: 15,
    description: '大型金融区深基坑群',
    x: 72, // 深圳位置
    y: 75
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    depth: 55,
    status: 'completed',
    progress: 100,
    description: 'CBD核心区超深基坑群',
    x: 70, // 广州位置
    y: 70
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

// 中国地图SVG组件
const ChinaMapSVG: React.FC<{
  width: number;
  height: number;
  projects: Project[];
  selectedProject: Project | null;
  onProjectClick: (project: Project) => void;
  showWeather: boolean;
}> = ({ width, height, projects, selectedProject, onProjectClick, showWeather }) => {
  
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #001122 0%, #002244 50%, #003366 100%)',
      overflow: 'hidden'
    }}>
      {/* 地图背景网格 */}
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: `
          linear-gradient(rgba(0, 255, 255, 0.1) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0, 255, 255, 0.1) 1px, transparent 1px)
        `,
        backgroundSize: '50px 50px',
        opacity: 0.3
      }} />

      {/* 简化的中国地图轮廓 */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 1000 800"
        style={{
          position: 'absolute',
          inset: 0
        }}
      >
        {/* 中国大陆轮廓 (简化版) */}
        <path
          d="M200,300 L300,200 L500,180 L700,200 L800,250 L850,350 L800,450 L750,550 L650,650 L550,680 L400,670 L300,600 L250,500 L200,400 Z"
          fill="rgba(0, 100, 200, 0.2)"
          stroke="rgba(0, 255, 255, 0.6)"
          strokeWidth="2"
          style={{
            filter: 'drop-shadow(0 0 10px rgba(0, 255, 255, 0.3))'
          }}
        />
        
        {/* 海南岛 */}
        <circle
          cx="550"
          cy="720"
          r="20"
          fill="rgba(0, 100, 200, 0.2)"
          stroke="rgba(0, 255, 255, 0.6)"
          strokeWidth="1"
        />
        
        {/* 台湾岛 */}
        <ellipse
          cx="750"
          cy="600"
          rx="15"
          ry="30"
          fill="rgba(0, 100, 200, 0.2)"
          stroke="rgba(0, 255, 255, 0.6)"
          strokeWidth="1"
        />

        {/* 地图标签 */}
        <text
          x="500"
          y="100"
          fill="rgba(255, 255, 255, 0.8)"
          fontSize="24"
          textAnchor="middle"
          fontWeight="bold"
        >
          中华人民共和国
        </text>
        <text
          x="500"
          y="130"
          fill="rgba(0, 255, 255, 0.8)"
          fontSize="14"
          textAnchor="middle"
        >
          深基坑工程项目分布图
        </text>
      </svg>

      {/* 项目标记 */}
      {projects.map((project) => {
        const weather = getWeatherData(project);
        return (
          <div key={project.id}>
            {/* 项目标记点 */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: PROJECTS.indexOf(project) * 0.2 }}
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onProjectClick(project)}
              style={{
                position: 'absolute',
                left: `${project.x}%`,
                top: `${project.y}%`,
                transform: 'translate(-50%, -50%)',
                width: '40px',
                height: '40px',
                background: selectedProject?.id === project.id ?
                  'linear-gradient(45deg, #00ffff, #0080ff)' :
                  project.status === 'completed' ? 'linear-gradient(45deg, #52c41a, #73d13d)' :
                  project.status === 'active' ? 'linear-gradient(45deg, #faad14, #ffc53d)' :
                  'linear-gradient(45deg, #8c8c8c, #bfbfbf)',
                border: selectedProject?.id === project.id ? '3px solid #00ffff' : '2px solid white',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '18px',
                cursor: 'pointer',
                boxShadow: selectedProject?.id === project.id ?
                  '0 0 20px rgba(0, 255, 255, 0.8), 0 4px 15px rgba(0, 0, 0, 0.3)' :
                  '0 4px 15px rgba(0, 0, 0, 0.3)',
                zIndex: selectedProject?.id === project.id ? 100 : 10,
                animation: selectedProject?.id === project.id ?
                  'epicPulse 2s ease-in-out infinite' : 'none'
              }}
            >
              🏗️
            </motion.div>

            {/* 项目信息标签 */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: PROJECTS.indexOf(project) * 0.2 + 0.3 }}
              style={{
                position: 'absolute',
                left: `${project.x}%`,
                top: `${project.y - 8}%`,
                transform: 'translateX(-50%)',
                background: 'rgba(0, 0, 0, 0.8)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#ffffff',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                backdropFilter: 'blur(5px)',
                zIndex: 5
              }}
            >
              <div style={{ fontWeight: 'bold', marginBottom: '2px' }}>
                {project.name}
              </div>
              <div style={{ opacity: 0.8 }}>
                🕳️ {project.depth}m | 📊 {project.progress}%
              </div>
            </motion.div>

            {/* 气象信息 */}
            {showWeather && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: PROJECTS.indexOf(project) * 0.2 + 0.5 }}
                style={{
                  position: 'absolute',
                  left: `${project.x + 5}%`,
                  top: `${project.y + 5}%`,
                  background: 'rgba(0, 100, 200, 0.9)',
                  border: '1px solid rgba(0, 255, 255, 0.5)',
                  borderRadius: '6px',
                  padding: '4px 8px',
                  color: '#ffffff',
                  fontSize: '10px',
                  whiteSpace: 'nowrap',
                  zIndex: 8
                }}
              >
                {weather.icon} {weather.temperature}°C 💨{weather.windSpeed}km/h
              </motion.div>
            )}

            {/* 选中项目的连接线效果 */}
            {selectedProject?.id === project.id && (
              <motion.div
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                style={{
                  position: 'absolute',
                  left: `${project.x}%`,
                  top: `${project.y}%`,
                  width: '100px',
                  height: '100px',
                  transform: 'translate(-50%, -50%)',
                  pointerEvents: 'none',
                  zIndex: 50
                }}
              >
                <svg width="100%" height="100%">
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="rgba(0, 255, 255, 0.6)"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    style={{
                      animation: 'epicRotate 3s linear infinite'
                    }}
                  />
                </svg>
              </motion.div>
            )}
          </div>
        );
      })}

      {/* CSS动画定义 */}
      <style>{`
        @keyframes epicPulse {
          0%, 100% { 
            transform: translate(-50%, -50%) scale(1);
            box-shadow: 0 0 20px rgba(0, 255, 255, 0.8), 0 4px 15px rgba(0, 0, 0, 0.3);
          }
          50% { 
            transform: translate(-50%, -50%) scale(1.1);
            box-shadow: 0 0 30px rgba(0, 255, 255, 1), 0 4px 20px rgba(0, 0, 0, 0.4);
          }
        }
        
        @keyframes epicRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

// 主组件
export const SelfContainedEpicCenter: React.FC<EpicProps> = ({ width, height, onExit }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [flightTarget, setFlightTarget] = useState<Project | null>(null);
  const [showWeather, setShowWeather] = useState(true);
  const [mapMode, setMapMode] = useState<'overview' | 'detail'>('overview');

  // 处理项目点击
  const handleProjectClick = useCallback((project: Project) => {
    console.log(`🎯 Project selected: ${project.name}`);
    
    if (isFlying) return;
    
    setIsFlying(true);
    setFlightTarget(project);
    
    // 2秒后完成选择
    setTimeout(() => {
      setSelectedProject(project);
      setIsFlying(false);
      setFlightTarget(null);
      setMapMode('detail');
    }, 2000);
  }, [isFlying]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000011',
      position: 'relative',
      overflow: 'hidden'
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
                Epic智能控制中心
              </h1>
              <p style={{ color: 'rgba(255, 255, 255, 0.6)', margin: 0, fontSize: '10px' }}>
                自主地图系统 + 实时监控 + 智能导航
              </p>
            </div>
          </div>

          {/* 控制按钮 */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setMapMode(mapMode === 'overview' ? 'detail' : 'overview')}
              style={{
                background: 'rgba(0, 255, 255, 0.2)',
                border: '1px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 12px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              📐 {mapMode === 'overview' ? '详细视图' : '总览视图'}
            </button>

            <button
              onClick={() => setShowWeather(!showWeather)}
              style={{
                background: showWeather ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 0, 0.5)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '6px 12px',
                fontSize: '10px',
                cursor: 'pointer'
              }}
            >
              🌤️ 气象 {showWeather ? 'ON' : 'OFF'}
            </button>
          </div>
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

      {/* 主地图区域 */}
      <div style={{
        position: 'absolute',
        top: '60px',
        left: 0,
        right: 0,
        bottom: 0
      }}>
        <ChinaMapSVG
          width={width}
          height={height - 60}
          projects={PROJECTS}
          selectedProject={selectedProject}
          onProjectClick={handleProjectClick}
          showWeather={showWeather}
        />
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
          🏗️ 项目控制台 ({PROJECTS.length})
        </h3>

        {isFlying && flightTarget && (
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
            🚁 正在导航到: {flightTarget.name}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
                    width: '8px',
                    height: '8px',
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
                  {showWeather && (
                    <div style={{ color: '#00ffff' }}>
                      {weather.icon} {weather.temperature}°C | 💨 {weather.windSpeed}km/h
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* 右侧详情面板 */}
      {selectedProject && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '80px',
            width: '300px',
            background: 'rgba(0, 0, 0, 0.8)',
            border: '1px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '15px',
            padding: '20px',
            backdropFilter: 'blur(10px)',
            zIndex: 500
          }}
        >
          <h3 style={{ 
            color: '#00ffff', 
            margin: '0 0 15px 0',
            fontSize: '14px'
          }}>
            📋 项目详情
          </h3>

          <div style={{ color: '#ffffff', fontSize: '12px', lineHeight: '1.5' }}>
            <div style={{ marginBottom: '12px' }}>
              <h4 style={{ color: '#00ffff', margin: '0 0 6px 0' }}>
                {selectedProject.name}
              </h4>
              <p style={{ margin: 0, opacity: 0.8, fontSize: '11px' }}>
                {selectedProject.description}
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '10px' }}>
              <div>📍 经度: {selectedProject.lng.toFixed(4)}°</div>
              <div>📍 纬度: {selectedProject.lat.toFixed(4)}°</div>
              <div>🕳️ 深度: {selectedProject.depth}m</div>
              <div>📊 进度: {selectedProject.progress}%</div>
            </div>

            {showWeather && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                background: 'rgba(0, 100, 200, 0.2)',
                borderRadius: '8px',
                border: '1px solid rgba(0, 255, 255, 0.3)'
              }}>
                <h5 style={{ color: '#00ffff', margin: '0 0 8px 0', fontSize: '11px' }}>
                  🌤️ 当前天气
                </h5>
                {(() => {
                  const weather = getWeatherData(selectedProject);
                  return (
                    <div style={{ fontSize: '10px' }}>
                      <div>{weather.icon} {weather.description} {weather.temperature}°C</div>
                      <div>💨 风速: {weather.windSpeed}km/h</div>
                      <div>💧 湿度: {weather.humidity}%</div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* 飞行状态指示器 */}
      <AnimatePresence>
        {isFlying && flightTarget && (
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
              padding: '30px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 2000,
              backdropFilter: 'blur(10px)'
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, ease: 'linear', repeat: Infinity }}
              style={{ fontSize: '48px', marginBottom: '15px' }}
            >
              🚁
            </motion.div>
            <div style={{ fontSize: '18px', marginBottom: '8px', color: '#00ffff' }}>
              Epic导航启动
            </div>
            <div style={{ fontSize: '14px', opacity: 0.8 }}>
              正在飞往 {flightTarget.name}
            </div>
            <div style={{ 
              marginTop: '15px', 
              height: '4px', 
              background: 'rgba(255,255,255,0.2)', 
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 2, ease: 'linear' }}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffff, #0080ff)',
                  borderRadius: '2px'
                }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SelfContainedEpicCenter;