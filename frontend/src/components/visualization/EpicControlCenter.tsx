/**
 * DeepCAD Epic控制中心
 * 震撼的飞行控制 + 实时天气可视化 + Mapbox底图 + 多层UI交互
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { freeWeatherService, WeatherData } from '../../services/freeWeatherService';
import { designTokens } from '../../design/tokens';
import { EpicParticleSystem } from './EpicParticleSystem';

// ==================== 类型定义 ====================

export interface EpicProject {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  status: 'active' | 'completed' | 'planning';
  depth: number;
  progress: number;
  weather?: WeatherData;
}

export interface FlightWaypoint {
  position: THREE.Vector3;
  target: THREE.Vector3;
  duration: number;
  description: string;
  cameraSettings: {
    fov: number;
    near: number;
    far: number;
  };
}

export interface EpicMode {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  active: boolean;
}

// ==================== 项目数据 ====================

const EPIC_PROJECTS: EpicProject[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    lat: 31.2304,
    lng: 121.4737,
    description: '632米超高层建筑，70米深基坑工程',
    status: 'completed',
    depth: 70,
    progress: 100
  },
  {
    id: 'beijing-airport', 
    name: '北京大兴机场T1',
    lat: 39.5098,
    lng: 116.4105,
    description: '世界最大单体航站楼基坑工程',
    status: 'active',
    depth: 45,
    progress: 85
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    lat: 22.5431,
    lng: 113.9339,
    description: '大型金融区深基坑群监测',
    status: 'planning',
    depth: 35,
    progress: 15
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    lat: 23.1291,
    lng: 113.3240,
    description: 'CBD核心区超深基坑群',
    status: 'completed',
    depth: 55,
    progress: 100
  }
];

// ==================== Epic模式定义 ====================

const EPIC_MODES: EpicMode[] = [
  {
    id: 'flight',
    name: '飞行中',
    description: '智能相机飞行系统',
    icon: '✈️',
    color: '#3b82f6',
    active: false
  },
  {
    id: 'geo-view',
    name: '地理视图',
    description: '全球地理信息视图',
    icon: '🌍',
    color: '#10b981',
    active: false
  },
  {
    id: 'positioning',
    name: '项目定位',
    description: '精准项目位置定位',
    icon: '📍',
    color: '#f59e0b',
    active: false
  },
  {
    id: 'wa-effects',
    name: 'WA效应',
    description: '天气环境交互效应',
    icon: '🌦️',
    color: '#8b5cf6',
    active: false
  },
  {
    id: '3d-nav',
    name: '3D导航',
    description: '立体空间导航控制',
    icon: '🎮',
    color: '#ef4444',
    active: false
  },
  {
    id: 'ai-assistant',
    name: 'AI助手',
    description: '智能分析助手',
    icon: '🤖',
    color: '#06b6d4',
    active: false
  }
];

// ==================== 天气可视化图层组件 ====================

const WeatherLayer: React.FC<{
  bounds: { north: number; south: number; east: number; west: number };
  layerType: 'temperature' | 'precipitation' | 'wind' | 'cloud' | 'radar';
  visible: boolean;
  opacity: number;
  onWeatherUpdate: (weather: WeatherData) => void;
}> = ({ bounds, layerType, visible, opacity, onWeatherUpdate }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  useEffect(() => {
    if (!canvasRef.current || !visible) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    canvas.width = 800;
    canvas.height = 600;
    
    let animationTime = 0;
    
    const animate = () => {
      animationTime += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 根据图层类型渲染不同效果
      switch (layerType) {
        case 'temperature':
          renderTemperatureHeatmap(ctx, canvas, animationTime);
          break;
        case 'precipitation':
          renderPrecipitationMap(ctx, canvas, animationTime);
          break;
        case 'wind':
          renderWindVectors(ctx, canvas, animationTime);
          break;
        case 'cloud':
          renderCloudLayer(ctx, canvas, animationTime);
          break;
        case 'radar':
          renderRadarSweep(ctx, canvas, animationTime);
          break;
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [layerType, visible, bounds]);
  
  // 渲染函数
  const renderTemperatureHeatmap = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const data = imageData.data;
    
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const index = (y * canvas.width + x) * 4;
        
        // 温度场模拟
        const temp = Math.sin(x * 0.01 + time) * Math.cos(y * 0.01 + time) * 0.5 + 0.5;
        const r = Math.floor(temp * 255);
        const g = Math.floor((1 - temp) * 128);
        const b = Math.floor((1 - temp) * 255);
        
        data[index] = r;     // Red
        data[index + 1] = g; // Green
        data[index + 2] = b; // Blue
        data[index + 3] = Math.floor(opacity * 128); // Alpha
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };
  
  const renderPrecipitationMap = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    ctx.globalAlpha = opacity;
    
    // 绘制雨云
    for (let i = 0; i < 5; i++) {
      const x = (Math.sin(time * 0.5 + i) * 0.5 + 0.5) * canvas.width;
      const y = (Math.cos(time * 0.3 + i) * 0.5 + 0.5) * canvas.height;
      const radius = 50 + Math.sin(time + i) * 20;
      
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, 'rgba(0, 100, 255, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 50, 150, 0.2)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  };
  
  const renderWindVectors = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    ctx.globalAlpha = opacity;
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    
    const gridSize = 40;
    for (let x = gridSize; x < canvas.width; x += gridSize) {
      for (let y = gridSize; y < canvas.height; y += gridSize) {
        const windAngle = Math.atan2(y - canvas.height/2, x - canvas.width/2) + time;
        const windSpeed = 15 + Math.sin(x * 0.01 + y * 0.01 + time) * 10;
        
        const endX = x + Math.cos(windAngle) * windSpeed;
        const endY = y + Math.sin(windAngle) * windSpeed;
        
        // 绘制风向箭头
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(endX, endY);
        ctx.stroke();
        
        // 箭头头部
        const arrowSize = 8;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(windAngle - Math.PI/6),
          endY - arrowSize * Math.sin(windAngle - Math.PI/6)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - arrowSize * Math.cos(windAngle + Math.PI/6),
          endY - arrowSize * Math.sin(windAngle + Math.PI/6)
        );
        ctx.stroke();
      }
    }
    
    ctx.globalAlpha = 1;
  };
  
  const renderCloudLayer = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    ctx.globalAlpha = opacity;
    
    // 绘制移动的云层
    for (let i = 0; i < 8; i++) {
      const x = ((time * 20 + i * 100) % (canvas.width + 200)) - 100;
      const y = 50 + Math.sin(time + i) * 30 + i * 60;
      const scale = 0.8 + Math.sin(time * 0.5 + i) * 0.3;
      
      ctx.fillStyle = `rgba(255, 255, 255, ${0.6 * scale})`;
      
      // 绘制云朵形状
      ctx.beginPath();
      ctx.arc(x, y, 30 * scale, 0, Math.PI * 2);
      ctx.arc(x + 25 * scale, y, 35 * scale, 0, Math.PI * 2);
      ctx.arc(x + 50 * scale, y, 25 * scale, 0, Math.PI * 2);
      ctx.arc(x - 20 * scale, y, 20 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  };
  
  const renderRadarSweep = (ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, time: number) => {
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(centerX, centerY) - 20;
    
    ctx.globalAlpha = opacity;
    
    // 绘制雷达圆圈
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 1;
    for (let r = 50; r <= maxRadius; r += 50) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    
    // 绘制雷达扫描线
    const sweepAngle = time * 2;
    const gradient = ctx.createConicGradient(sweepAngle, centerX, centerY);
    gradient.addColorStop(0, 'rgba(0, 255, 0, 0.8)');
    gradient.addColorStop(0.1, 'rgba(0, 255, 0, 0.4)');
    gradient.addColorStop(0.2, 'rgba(0, 255, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, maxRadius, sweepAngle, sweepAngle + Math.PI / 3);
    ctx.closePath();
    ctx.fill();
    
    // 绘制回波点
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.random() * maxRadius;
      const x = centerX + Math.cos(angle) * distance;
      const y = centerY + Math.sin(angle) * distance;
      
      ctx.fillStyle = '#ffff00';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.globalAlpha = 1;
  };
  
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        opacity: visible ? opacity : 0,
        transition: 'opacity 0.3s ease'
      }}
    />
  );
};

// ==================== 主Epic控制中心组件 ====================

export const EpicControlCenter: React.FC<{
  width?: number;
  height?: number;
  onExit?: () => void;
}> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  onExit
}) => {
  const [currentProject, setCurrentProject] = useState<EpicProject>(EPIC_PROJECTS[0]);
  const [epicModes, setEpicModes] = useState<EpicMode[]>(EPIC_MODES);
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [flightProgress, setFlightProgress] = useState(0);
  const [currentDescription, setCurrentDescription] = useState('');
  const [particleIntensity, setParticleIntensity] = useState(2.5); // 启动时高强度
  const [weatherEffect, setWeatherEffect] = useState<'clear' | 'rain' | 'snow' | 'storm'>('clear');
  
  // 天气图层控制
  const [weatherLayers, setWeatherLayers] = useState({
    temperature: { visible: false, opacity: 0.7 },
    precipitation: { visible: false, opacity: 0.6 },
    wind: { visible: false, opacity: 0.8 },
    cloud: { visible: true, opacity: 0.5 },
    radar: { visible: false, opacity: 0.7 }
  });

  // 获取天气数据
  const updateWeatherData = useCallback(async (project: EpicProject) => {
    try {
      const weather = await freeWeatherService.getCurrentWeather(project.lat, project.lng);
      setWeatherData(weather);
      
      // 更新项目天气信息
      setCurrentProject(prev => ({ ...prev, weather }));
      
      // 根据天气更新粒子效果
      if (weather.precipitation > 10) {
        setWeatherEffect('rain');
        setParticleIntensity(1.5);
      } else if (weather.temperature < 0) {
        setWeatherEffect('snow');
        setParticleIntensity(1.2);
      } else if (weather.description.includes('雷')) {
        setWeatherEffect('storm');
        setParticleIntensity(2);
      } else {
        setWeatherEffect('clear');
        setParticleIntensity(1);
      }
    } catch (error) {
      console.error('Failed to update weather:', error);
    }
  }, []);

  // 初始化天气数据
  useEffect(() => {
    updateWeatherData(currentProject);
  }, [currentProject, updateWeatherData]);

  // 飞行到项目
  const flyToProject = useCallback(async (project: EpicProject) => {
    if (isFlying) return;
    
    setIsFlying(true);
    setFlightProgress(0);
    setCurrentDescription(`正在飞往 ${project.name}...`);
    
    // 激活飞行模式
    setEpicModes(prev => prev.map(mode => ({
      ...mode,
      active: mode.id === 'flight'
    })));
    
    // 模拟飞行进度
    const duration = 3000;
    const startTime = Date.now();
    
    const updateFlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      setFlightProgress(progress);
      
      if (progress < 1) {
        requestAnimationFrame(updateFlight);
      } else {
        setIsFlying(false);
        setCurrentProject(project);
        setCurrentDescription(`已到达 ${project.name}`);
        
        // 激活地理视图模式
        setEpicModes(prev => prev.map(mode => ({
          ...mode,
          active: mode.id === 'geo-view'
        })));
        
        // 获取新位置的天气
        updateWeatherData(project);
      }
    };
    
    updateFlight();
  }, [isFlying, updateWeatherData]);

  // 激活Epic模式
  const activateMode = useCallback((modeId: string) => {
    setEpicModes(prev => prev.map(mode => ({
      ...mode,
      active: mode.id === modeId
    })));

    // 根据模式执行相应操作
    switch (modeId) {
      case 'wa-effects':
        setWeatherLayers(prev => ({
          ...prev,
          temperature: { ...prev.temperature, visible: true },
          precipitation: { ...prev.precipitation, visible: true },
          wind: { ...prev.wind, visible: true }
        }));
        setCurrentDescription('天气环境交互效应已激活');
        break;
      case 'positioning':
        setCurrentDescription(`精确定位: ${currentProject.name} (${currentProject.lat.toFixed(4)}, ${currentProject.lng.toFixed(4)})`);
        break;
      case '3d-nav':
        setCurrentDescription('3D立体导航系统已启动');
        break;
      case 'ai-assistant':
        setCurrentDescription('AI智能助手正在分析当前项目数据...');
        break;
    }
  }, [currentProject]);

  // 切换天气图层
  const toggleWeatherLayer = useCallback((layerType: keyof typeof weatherLayers) => {
    setWeatherLayers(prev => ({
      ...prev,
      [layerType]: {
        ...prev[layerType],
        visible: !prev[layerType].visible
      }
    }));
  }, []);

  return (
    <motion.div
      style={{
        position: 'relative',
        width,
        height,
        background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
        overflow: 'hidden',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
    >
      {/* Epic粒子系统 */}
      <EpicParticleSystem
        width={width}
        height={height}
        intensity={particleIntensity}
        color="#00ffff" // 更亮的青色
        weatherEffect={weatherEffect}
      />

      {/* 背景星空效果 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
                       radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%),
                       radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.2) 0%, transparent 50%)`,
          animation: 'pulse 4s ease-in-out infinite alternate'
        }}
      />

      {/* 天气可视化图层 */}
      {Object.entries(weatherLayers).map(([layerType, config]) => (
        <WeatherLayer
          key={layerType}
          bounds={{
            north: currentProject.lat + 2,
            south: currentProject.lat - 2,
            east: currentProject.lng + 2,
            west: currentProject.lng - 2
          }}
          layerType={layerType as any}
          visible={config.visible}
          opacity={config.opacity}
          onWeatherUpdate={setWeatherData}
        />
      ))}

      {/* 顶部Epic控制面板 */}
      <motion.div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '80px',
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(26, 26, 46, 0.9) 100%)',
          backdropFilter: 'blur(20px)',
          borderBottom: '1px solid rgba(0, 217, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          padding: '0 40px',
          zIndex: 100
        }}
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #00d9ff, #0099cc)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              boxShadow: '0 4px 20px rgba(0, 217, 255, 0.4)'
            }}
          >
            🚁
          </div>
          <div>
            <h1 style={{ 
              color: '#ffffff', 
              margin: 0, 
              fontSize: '24px', 
              fontWeight: 700,
              textShadow: '0 2px 10px rgba(0, 217, 255, 0.5)'
            }}>
              Epic控制中心
            </h1>
            <p style={{ 
              color: 'rgba(255, 255, 255, 0.7)', 
              margin: 0, 
              fontSize: '12px' 
            }}>
              Deep Excavation Project Intelligence Center
            </p>
          </div>
        </div>

        {/* Epic模式按钮组 */}
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '12px',
          margin: '0 40px'
        }}>
          {epicModes.map((mode, index) => (
            <motion.button
              key={mode.id}
              onClick={() => activateMode(mode.id)}
              style={{
                background: mode.active 
                  ? `linear-gradient(135deg, ${mode.color}, ${mode.color}dd)`
                  : 'rgba(255, 255, 255, 0.1)',
                border: mode.active ? `2px solid ${mode.color}` : '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                padding: '8px 16px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                minWidth: '110px',
                justifyContent: 'center',
                boxShadow: mode.active ? `0 4px 15px ${mode.color}40` : 'none',
                transition: 'all 0.3s ease'
              }}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 + index * 0.1 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span style={{ fontSize: '16px' }}>{mode.icon}</span>
              <span>{mode.name}</span>
            </motion.button>
          ))}
        </div>

        {/* 退出按钮 */}
        <button
          onClick={onExit}
          style={{
            background: 'rgba(239, 68, 68, 0.2)',
            border: '1px solid rgba(239, 68, 68, 0.5)',
            borderRadius: '8px',
            padding: '8px 16px',
            color: '#ffffff',
            fontSize: '14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>✕</span>
          <span>退出</span>
        </button>
      </motion.div>

      {/* 主显示区域 */}
      <div style={{ 
        paddingTop: '80px', 
        height: '100%',
        display: 'flex',
        position: 'relative'
      }}>
        {/* 左侧项目列表 */}
        <motion.div
          style={{
            width: '320px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(15px)',
            borderRight: '1px solid rgba(0, 217, 255, 0.2)',
            padding: '20px',
            overflowY: 'auto'
          }}
          initial={{ x: -320 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.8, delay: 0.7 }}
        >
          <h3 style={{ 
            color: '#ffffff', 
            margin: '0 0 20px 0', 
            fontSize: '18px',
            borderBottom: '2px solid rgba(0, 217, 255, 0.3)',
            paddingBottom: '10px'
          }}>
            🏗️ 深基坑项目
          </h3>
          
          {EPIC_PROJECTS.map((project, index) => (
            <motion.div
              key={project.id}
              onClick={() => flyToProject(project)}
              style={{
                background: currentProject.id === project.id 
                  ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.2), rgba(0, 153, 204, 0.2))'
                  : 'rgba(255, 255, 255, 0.05)',
                border: currentProject.id === project.id
                  ? '1px solid rgba(0, 217, 255, 0.5)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 1 + index * 0.1 }}
              whileHover={{ scale: 1.02, x: 5 }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <h4 style={{ 
                  color: '#ffffff', 
                  margin: 0, 
                  fontSize: '14px',
                  fontWeight: 600
                }}>
                  {project.name}
                </h4>
                <span style={{
                  marginLeft: 'auto',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '10px',
                  fontWeight: 600,
                  background: project.status === 'active' ? '#10b981' : 
                             project.status === 'completed' ? '#6b7280' : '#f59e0b',
                  color: '#ffffff'
                }}>
                  {project.status === 'active' ? '进行中' : 
                   project.status === 'completed' ? '已完成' : '规划中'}
                </span>
              </div>
              
              <p style={{ 
                color: 'rgba(255, 255, 255, 0.7)', 
                margin: '0 0 8px 0', 
                fontSize: '12px',
                lineHeight: '1.4'
              }}>
                {project.description}
              </p>
              
              <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  📏 深度: {project.depth}m
                </span>
                <span style={{ color: 'rgba(255, 255, 255, 0.6)' }}>
                  📊 进度: {project.progress}%
                </span>
              </div>
              
              {/* 进度条 */}
              <div style={{
                width: '100%',
                height: '3px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '2px',
                marginTop: '8px',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${project.progress}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00d9ff, #0099cc)',
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </motion.div>
          ))}

          {/* 天气图层控制 */}
          <div style={{ marginTop: '30px' }}>
            <h3 style={{ 
              color: '#ffffff', 
              margin: '0 0 15px 0', 
              fontSize: '16px',
              borderBottom: '2px solid rgba(138, 92, 246, 0.3)',
              paddingBottom: '8px'
            }}>
              🌦️ 天气图层
            </h3>
            
            {Object.entries(weatherLayers).map(([layerType, config]) => (
              <div key={layerType} style={{ 
                display: 'flex', 
                alignItems: 'center', 
                marginBottom: '10px',
                padding: '8px',
                borderRadius: '8px',
                background: config.visible ? 'rgba(138, 92, 246, 0.1)' : 'transparent'
              }}>
                <button
                  onClick={() => toggleWeatherLayer(layerType as any)}
                  style={{
                    background: config.visible ? '#8b5cf6' : 'rgba(255, 255, 255, 0.1)',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 12px',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    minWidth: '120px'
                  }}
                >
                  {layerType === 'temperature' && '🌡️ 温度'}
                  {layerType === 'precipitation' && '🌧️ 降水'}
                  {layerType === 'wind' && '💨 风场'}
                  {layerType === 'cloud' && '☁️ 云图'}
                  {layerType === 'radar' && '📡 雷达'}
                </button>
                
                {config.visible && (
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={config.opacity}
                    onChange={(e) => {
                      const opacity = parseFloat(e.target.value);
                      setWeatherLayers(prev => ({
                        ...prev,
                        [layerType]: { ...prev[layerType as keyof typeof prev], opacity }
                      }));
                    }}
                    style={{
                      marginLeft: '10px',
                      width: '60px',
                      height: '4px',
                      background: '#333',
                      outline: 'none',
                      borderRadius: '2px'
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </motion.div>

        {/* 中央显示区域 */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* 飞行状态HUD */}
          <AnimatePresence>
            {isFlying && (
              <motion.div
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  background: 'rgba(0, 0, 0, 0.9)',
                  borderRadius: '20px',
                  padding: '40px',
                  textAlign: 'center',
                  border: '2px solid rgba(0, 217, 255, 0.5)',
                  zIndex: 200
                }}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
              >
                <div style={{ fontSize: '48px', marginBottom: '20px' }}>✈️</div>
                <h2 style={{ color: '#ffffff', margin: '0 0 10px 0' }}>Epic飞行中</h2>
                <p style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '20px' }}>
                  {currentDescription}
                </p>
                
                {/* 飞行进度条 */}
                <div style={{
                  width: '300px',
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  margin: '0 auto'
                }}>
                  <motion.div
                    style={{
                      height: '100%',
                      background: 'linear-gradient(90deg, #00d9ff, #0099cc)',
                      borderRadius: '4px'
                    }}
                    initial={{ width: '0%' }}
                    animate={{ width: `${flightProgress * 100}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
                
                <div style={{ 
                  color: '#00d9ff', 
                  fontSize: '14px', 
                  marginTop: '10px',
                  fontWeight: 600
                }}>
                  {Math.round(flightProgress * 100)}%
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 项目3D视图区域（占位） */}
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(circle at center, rgba(0, 217, 255, 0.1) 0%, transparent 70%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <motion.div
              style={{
                textAlign: 'center',
                color: 'rgba(255, 255, 255, 0.7)'
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.5 }}
            >
              <div style={{ fontSize: '120px', marginBottom: '20px' }}>🏗️</div>
              <h2 style={{ margin: '0 0 10px 0', fontSize: '32px', color: '#ffffff' }}>
                {currentProject.name}
              </h2>
              <p style={{ fontSize: '18px', opacity: 0.8 }}>
                {currentProject.description}
              </p>
              {currentDescription && (
                <p style={{ 
                  fontSize: '16px', 
                  color: '#00d9ff',
                  marginTop: '20px',
                  fontWeight: 600
                }}>
                  {currentDescription}
                </p>
              )}
            </motion.div>
          </div>
        </div>

        {/* 右侧信息面板 */}
        <motion.div
          style={{
            width: '280px',
            background: 'rgba(0, 0, 0, 0.7)',
            backdropFilter: 'blur(15px)',
            borderLeft: '1px solid rgba(0, 217, 255, 0.2)',
            padding: '20px',
            overflowY: 'auto'
          }}
          initial={{ x: 280 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.8, delay: 0.9 }}
        >
          {/* 天气信息 */}
          <AnimatePresence>
            {weatherData && (
              <motion.div
                style={{
                  background: 'rgba(138, 92, 246, 0.1)',
                  borderRadius: '12px',
                  border: '1px solid rgba(138, 92, 246, 0.3)',
                  padding: '16px',
                  marginBottom: '20px'
                }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3 style={{ 
                  color: '#ffffff', 
                  margin: '0 0 12px 0', 
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span style={{ fontSize: '20px' }}>{weatherData.icon}</span>
                  {weatherData.city} 天气
                </h3>
                
                <div style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '13px', lineHeight: '1.6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px', fontWeight: 'bold', marginRight: '8px' }}>
                      {weatherData.temperature}°C
                    </span>
                    <span>{weatherData.description}</span>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', fontSize: '11px' }}>
                    <div>💨 {weatherData.windSpeed} m/s</div>
                    <div>🧭 {weatherData.windDirection}°</div>
                    <div>💧 {weatherData.humidity}%</div>
                    <div>📊 {weatherData.pressure} hPa</div>
                    <div>☁️ {weatherData.cloudCover}%</div>
                    <div>🌧️ {weatherData.precipitation}mm</div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 系统状态 */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: '12px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '16px'
          }}>
            <h3 style={{ 
              color: '#ffffff', 
              margin: '0 0 12px 0', 
              fontSize: '16px' 
            }}>
              📊 系统状态
            </h3>
            
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>GPU渲染</span>
                <span style={{ color: '#10b981' }}>● 正常</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>天气数据</span>
                <span style={{ color: '#10b981' }}>● 同步中</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>项目连接</span>
                <span style={{ color: '#10b981' }}>● 已连接</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>AI助手</span>
                <span style={{ color: '#f59e0b' }}>● 待机</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* CSS动画 */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 0.6; }
            50% { opacity: 1; }
          }
        `}
      </style>
    </motion.div>
  );
};

export default EpicControlCenter;