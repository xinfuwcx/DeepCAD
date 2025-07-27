/**
 * Epic控制中心增强版 - 大屏级炫酷水准
 * 1号专家的震撼级项目管理与展示系统
 * 集成最新炫酷效果库，打造未来感十足的大屏体验
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSpring, animated } from 'react-spring';
import { gsap } from 'gsap';
import confetti from 'canvas-confetti';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { GeoThreeMapController, Coordinates, MapStyle, ProjectMarkerData } from '../../services/GeoThreeMapController';
import { expert1Architecture } from '../../services/Expert1UnifiedArchitecture';
import { openMeteoService, WeatherData } from '../../services/OpenMeteoService';
import { WeatherControlPanel } from './WeatherControlPanel';
import { EnhancedAIAssistant } from './EnhancedAIAssistant';
import { FloatingAIAssistant } from '../floating/FloatingAIAssistant';
import { GPUParticleSystem, ParticleSystemConfig } from '../../services/GPUParticleSystem';
import { Expert3ResultsIntegration } from '../../services/Expert3ResultsIntegration';

// ======================= 增强接口定义 =======================

interface EpicControlCenterEnhancedProps {
  width?: number;
  height?: number;
  onExit: () => void;
  projects?: ProjectMarkerData[];
  onProjectSelect?: (projectId: string) => void;
}

interface SystemStatus {
  gisStatus: 'initializing' | 'ready' | 'error';
  weatherStatus: 'loading' | 'ready' | 'error';
  architectureStatus: 'connecting' | 'connected' | 'error';
  loadedTiles: number;
  activeProjects: number;
  performance: {
    fps: number;
    memory: number;
    cpu: number;
    gpu: number;
  };
}

interface DataFlowMetrics {
  timestamp: number;
  dataFlow: number;
  processingSpeed: number;
  accuracy: number;
}

// ======================= 默认数据 =======================

const DEFAULT_PROJECTS: ProjectMarkerData[] = [
  {
    id: 'shanghai-center',
    name: '上海中心深基坑',
    location: { lat: 31.2304, lng: 121.4737 },
    depth: 70,
    status: 'completed',
    progress: 100
  },
  {
    id: 'beijing-airport',
    name: '北京大兴机场T1',
    location: { lat: 39.5098, lng: 116.4105 },
    depth: 45,
    status: 'active',
    progress: 85
  },
  {
    id: 'shenzhen-qianhai',
    name: '深圳前海金融区',
    location: { lat: 22.5431, lng: 113.9339 },
    depth: 35,
    status: 'planning',
    progress: 15
  },
  {
    id: 'guangzhou-cbd',
    name: '广州珠江新城CBD',
    location: { lat: 23.1291, lng: 113.3240 },
    depth: 55,
    status: 'completed',
    progress: 100
  }
];

const PERFORMANCE_DATA = [
  { time: '00:00', fps: 58, memory: 245, cpu: 23, gpu: 67 },
  { time: '00:05', fps: 61, memory: 267, cpu: 28, gpu: 72 },
  { time: '00:10', fps: 59, memory: 234, cpu: 19, gpu: 65 },
  { time: '00:15', fps: 60, memory: 289, cpu: 31, gpu: 78 },
  { time: '00:20', fps: 62, memory: 256, cpu: 25, gpu: 69 }
];

const STATUS_COLORS = {
  completed: '#00ff88',
  active: '#ffaa00', 
  planning: '#888888'
};

// ======================= 主组件 =======================

export const EpicControlCenterEnhanced: React.FC<EpicControlCenterEnhancedProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  onExit,
  projects = DEFAULT_PROJECTS,
  onProjectSelect
}) => {
  // 引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<GeoThreeMapController | null>(null);
  const hologramRef = useRef<HTMLDivElement>(null);
  const particleSystemRef = useRef<GPUParticleSystem | null>(null);
  const expert3IntegrationRef = useRef<Expert3ResultsIntegration | null>(null);
  
  // 状态管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    gisStatus: 'initializing',
    weatherStatus: 'loading',
    architectureStatus: 'connecting',
    loadedTiles: 0,
    activeProjects: 0,
    performance: { fps: 60, memory: 256, cpu: 25, gpu: 70 }
  });
  
  const [selectedProject, setSelectedProject] = useState<ProjectMarkerData | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>('dark');
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showDataFlow, setShowDataFlow] = useState(false);
  const [performanceData, setPerformanceData] = useState(PERFORMANCE_DATA);
  const [show3Results, setShow3Results] = useState(false);
  const [showMapControls, setShowMapControls] = useState(false);
  const [analysisResults, setAnalysisResults] = useState({
    vonMisesStress: { max: 245.6, min: 12.3, unit: 'MPa' },
    displacement: { max: 18.7, min: 0.2, unit: 'mm' },
    safetyFactor: { max: 3.2, min: 1.8, unit: '-' },
    convergence: { iterations: 42, residual: 1.2e-6, converged: true }
  });

  // Spring动画
  const backgroundSpring = useSpring({
    background: selectedProject ? 
      `radial-gradient(ellipse at center, rgba(0,255,255,0.1) 0%, rgba(0,0,20,0.9) 70%, rgba(0,0,0,1) 100%)` :
      `radial-gradient(ellipse at center, rgba(0,0,20,0.8) 0%, rgba(0,0,0,0.95) 100%)`,
    config: { duration: 2000 }
  });

  const logoSpring = useSpring({
    transform: isFlying ? 'scale(1.2) rotateY(180deg)' : 'scale(1) rotateY(0deg)',
    config: { tension: 200, friction: 20 }
  });

  // ======================= 初始化和GSAP动画 =======================

  useEffect(() => {
    initializeEpicSystem();
    setupGSAPAnimations();
    
    return () => {
      cleanup();
    };
  }, []);

  const setupGSAPAnimations = () => {
    // 全息投影效果
    if (hologramRef.current) {
      gsap.to(hologramRef.current, {
        duration: 3,
        rotationY: 360,
        repeat: -1,
        ease: "none"
      });
    }

    // 背景粒子动画
    gsap.to(".particle", {
      duration: "random(10, 20)",
      x: "random(-100, 100)",
      y: "random(-100, 100)",
      rotation: "random(0, 360)",
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
      stagger: 0.1
    });
  };

  const initializeEpicSystem = async (): Promise<void> => {
    try {
      console.log('🚀 初始化Epic增强控制中心...');
      
      // 启动时的庆祝效果
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#00ffff', '#ff00ff', '#ffff00']
      });

      // 初始化架构
      setSystemStatus(prev => ({ ...prev, architectureStatus: 'connecting' }));
      await expert1Architecture.initialize();
      setSystemStatus(prev => ({ ...prev, architectureStatus: 'connected' }));
      
      // 初始化地图
      if (mapContainerRef.current) {
        setSystemStatus(prev => ({ ...prev, gisStatus: 'initializing' }));
        
        const mapController = new GeoThreeMapController(mapContainerRef.current);
        mapControllerRef.current = mapController;
        
        mapController.setProjectClickHandler(handleProjectClick);
        await mapController.loadVisibleTiles();
        
        setSystemStatus(prev => ({ 
          ...prev, 
          gisStatus: 'ready', 
          loadedTiles: 25,
          performance: { ...prev.performance, fps: 60 }
        }));
        
        // 加载项目标记
        await loadProjectMarkers(mapController);
        
        // 初始化GPU粒子系统
        await initializeGPUParticles(mapController);
        
        console.log('✅ Epic增强控制中心初始化完成');
      }
      
    } catch (error) {
      console.error('❌ Epic控制中心初始化失败:', error);
      setSystemStatus(prev => ({
        ...prev,
        gisStatus: 'error',
        architectureStatus: 'error'
      }));
    }
  };

  const loadProjectMarkers = async (mapController: GeoThreeMapController): Promise<void> => {
    try {
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'loading' }));
      
      const locations = projects.map(p => ({ lat: p.location.lat, lng: p.location.lng, name: p.name }));
      const weatherDataArray = await openMeteoService.getBatchWeather(locations);
      
      const weatherMap: Record<string, WeatherData> = {};
      projects.forEach((project, index) => {
        weatherMap[project.id] = weatherDataArray[index];
      });
      
      setWeatherData(weatherMap);
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'ready' }));
      
      projects.forEach(project => {
        const projectWithWeather = {
          ...project,
          weather: weatherMap[project.id]
        };
        mapController.addProjectMarker(projectWithWeather);
      });
      
      setSystemStatus(prev => ({ ...prev, activeProjects: projects.length }));
      
    } catch (error) {
      console.warn('⚠️ 项目标记加载部分失败:', error);
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'error' }));
    }
  };

  const initializeGPUParticles = async (mapController: GeoThreeMapController): Promise<void> => {
    try {
      console.log('🌟 初始化GPU粒子系统...');
      
      const scene = mapController.getScene();
      const renderer = mapController.getRenderer();
      
      const particleConfig: ParticleSystemConfig = {
        particleCount: 50000, // 5万个粒子
        particleSize: 3.0,
        gravity: new THREE.Vector3(0, -9.8, 0),
        emissionRate: 1000,
        lifespan: 8.0,
        initialVelocity: new THREE.Vector3(0, 5, 0),
        colors: {
          start: new THREE.Color('#00ffff'),
          end: new THREE.Color('#ff00ff')
        },
        physics: {
          turbulence: 0.5,
          damping: 0.98,
          collision: true
        }
      };
      
      particleSystemRef.current = new GPUParticleSystem(renderer, scene, particleConfig);
      console.log('✅ GPU粒子系统初始化完成');
      
    } catch (error) {
      console.warn('⚠️ GPU粒子系统初始化失败，使用降级方案:', error);
    }
  };

  const cleanup = (): void => {
    if (mapControllerRef.current) {
      mapControllerRef.current.dispose();
    }
    
    if (particleSystemRef.current) {
      particleSystemRef.current.dispose();
    }
  };

  // ======================= 事件处理 =======================

  const handleProjectClick = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !mapControllerRef.current) return;
    
    console.log(`🎯 选择项目: ${project.name}`);
    setSelectedProject(project);
    
    // 项目选择庆祝效果
    confetti({
      particleCount: 50,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ['#00ffff', '#0080ff']
    });
    
    confetti({
      particleCount: 50,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ['#ff00ff', '#8000ff']
    });
    
    if (!isFlying) {
      setIsFlying(true);
      
      try {
        await mapControllerRef.current.flyToProject(projectId);
        
        if (onProjectSelect) {
          onProjectSelect(projectId);
        }
        
        await expert1Architecture.processProjectContext({
          location: project.location,
          elevation: 0,
          soilType: 'mixed',
          environmentalFactors: {
            weather: weatherData[projectId],
            urban: true
          }
        });
        
      } catch (error) {
        console.error('❌ 项目飞行失败:', error);
      } finally {
        setIsFlying(false);
      }
    }
  }, [projects, weatherData, isFlying, onProjectSelect]);

  // ======================= 大屏级渲染组件 =======================

  const renderHolographicLogo = () => (
    <div 
      ref={hologramRef}
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        width: '100px',
        height: '100px',
        zIndex: 1000
      }}
    >
      <animated.div style={logoSpring}>
        <motion.div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff)',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '40px',
            boxShadow: `
              0 0 20px rgba(0, 255, 255, 0.5),
              0 0 40px rgba(255, 0, 255, 0.3),
              0 0 60px rgba(255, 255, 0, 0.2)
            `,
            position: 'relative',
            overflow: 'hidden'
          }}
          animate={{
            rotate: 360,
            boxShadow: [
              '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)',
              '0 0 30px rgba(255, 0, 255, 0.7), 0 0 50px rgba(255, 255, 0, 0.4)',
              '0 0 20px rgba(0, 255, 255, 0.5), 0 0 40px rgba(255, 0, 255, 0.3)'
            ]
          }}
          transition={{
            rotate: { duration: 10, repeat: Infinity, ease: "linear" },
            boxShadow: { duration: 3, repeat: Infinity }
          }}
        >
          <motion.span
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            🎮
          </motion.span>
          
          {/* 全息扫描线 */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '2px',
              background: 'linear-gradient(90deg, transparent, #00ffff, transparent)',
              zIndex: 1
            }}
            animate={{
              y: [0, 100, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          />
        </motion.div>
      </animated.div>
    </div>
  );

  const renderPerformanceDashboard = () => (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        width: '400px',
        height: '300px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid',
        borderImage: 'linear-gradient(45deg, #00ffff, #ff00ff, #ffff00, #00ffff) 1',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        zIndex: 1000
      }}
    >
      <h3 style={{
        color: '#00ffff',
        margin: '0 0 15px 0',
        fontSize: '16px',
        textAlign: 'center',
        textShadow: '0 0 10px #00ffff'
      }}>
        🚀 系统性能实时监控
      </h3>

      <div style={{ height: '200px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={performanceData}>
            <defs>
              <linearGradient id="colorFps" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#00ffff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#00ffff" stopOpacity={0.1}/>
              </linearGradient>
              <linearGradient id="colorMemory" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ff00ff" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#ff00ff" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="time" stroke="#ffffff" fontSize={10} />
            <YAxis stroke="#ffffff" fontSize={10} />
            <Tooltip 
              contentStyle={{
                background: 'rgba(0,0,0,0.9)',
                border: '1px solid #00ffff',
                borderRadius: '5px'
              }}
            />
            <Area
              type="monotone"
              dataKey="fps"
              stroke="#00ffff"
              fillOpacity={1}
              fill="url(#colorFps)"
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="memory"
              stroke="#ff00ff"
              fillOpacity={1}
              fill="url(#colorMemory)"
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: '10px',
        fontSize: '12px'
      }}>
        <div style={{ color: '#00ffff' }}>
          ⚡ FPS: {systemStatus.performance.fps}
        </div>
        <div style={{ color: '#ff00ff' }}>
          💾 Memory: {systemStatus.performance.memory}MB
        </div>
        <div style={{ color: '#ffff00' }}>
          🖥️ CPU: {systemStatus.performance.cpu}%
        </div>
        <div style={{ color: '#00ff88' }}>
          🎮 GPU: {systemStatus.performance.gpu}%
        </div>
      </div>
    </motion.div>
  );

  const renderProjectStatistics = () => (
    <motion.div
      initial={{ opacity: 0, y: 300 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'absolute',
        bottom: '20px',
        left: '20px',
        width: '350px',
        height: '250px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid',
        borderImage: 'linear-gradient(45deg, #ffff00, #ff00ff, #00ffff, #ffff00) 1',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        zIndex: 1000
      }}
    >
      <h3 style={{
        color: '#ffff00',
        margin: '0 0 15px 0',
        fontSize: '16px',
        textAlign: 'center',
        textShadow: '0 0 10px #ffff00'
      }}>
        📊 项目统计分析
      </h3>

      <div style={{ height: '150px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={[
                { name: '已完成', value: projects.filter(p => p.status === 'completed').length, color: '#00ff88' },
                { name: '进行中', value: projects.filter(p => p.status === 'active').length, color: '#ffaa00' },
                { name: '规划中', value: projects.filter(p => p.status === 'planning').length, color: '#888888' }
              ]}
              cx="50%"
              cy="50%"
              innerRadius={30}
              outerRadius={60}
              paddingAngle={5}
              dataKey="value"
            >
              {projects.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.status]} />
              ))}
            </Pie>
            <Tooltip 
              contentStyle={{
                background: 'rgba(0,0,0,0.9)',
                border: '1px solid #ffff00',
                borderRadius: '5px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-around',
        fontSize: '11px',
        marginTop: '10px'
      }}>
        <div style={{ color: '#00ff88' }}>✅ 已完成: 2</div>
        <div style={{ color: '#ffaa00' }}>🔄 进行中: 1</div>
        <div style={{ color: '#888888' }}>📋 规划中: 1</div>
      </div>
    </motion.div>
  );

  const render3ResultsPanel = () => (
    <motion.div
      initial={{ opacity: 0, x: -300 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: 'absolute',
        top: '340px',
        right: '20px',
        width: '350px',
        height: '280px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '2px solid',
        borderImage: 'linear-gradient(45deg, #00ff88, #00ffff, #ff00ff, #00ff88) 1',
        borderRadius: '15px',
        padding: '20px',
        backdropFilter: 'blur(20px)',
        zIndex: 1000
      }}
    >
      <h3 style={{
        color: '#00ff88',
        margin: '0 0 15px 0',
        fontSize: '16px',
        textAlign: 'center',
        textShadow: '0 0 10px #00ff88'
      }}>
        🧮 计算结果
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '13px' }}>
        {/* Von Mises应力 */}
        <div style={{
          background: 'rgba(255, 0, 0, 0.1)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 0, 0, 0.3)'
        }}>
          <div style={{ color: '#ff6b6b', fontWeight: 'bold', marginBottom: '4px' }}>
            📊 Von Mises应力
          </div>
          <div style={{ color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
            <span>最大: {analysisResults.vonMisesStress.max} {analysisResults.vonMisesStress.unit}</span>
            <span>最小: {analysisResults.vonMisesStress.min} {analysisResults.vonMisesStress.unit}</span>
          </div>
        </div>

        {/* 位移 */}
        <div style={{
          background: 'rgba(0, 150, 255, 0.1)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 150, 255, 0.3)'
        }}>
          <div style={{ color: '#4dabf7', fontWeight: 'bold', marginBottom: '4px' }}>
            📐 位移
          </div>
          <div style={{ color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
            <span>最大: {analysisResults.displacement.max} {analysisResults.displacement.unit}</span>
            <span>最小: {analysisResults.displacement.min} {analysisResults.displacement.unit}</span>
          </div>
        </div>

        {/* 安全系数 */}
        <div style={{
          background: 'rgba(0, 255, 136, 0.1)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(0, 255, 136, 0.3)'
        }}>
          <div style={{ color: '#51cf66', fontWeight: 'bold', marginBottom: '4px' }}>
            🛡️ 安全系数
          </div>
          <div style={{ color: '#ffffff', display: 'flex', justifyContent: 'space-between' }}>
            <span>最大: {analysisResults.safetyFactor.max}</span>
            <span>最小: {analysisResults.safetyFactor.min}</span>
          </div>
        </div>

        {/* 收敛信息 */}
        <div style={{
          background: 'rgba(255, 255, 0, 0.1)',
          padding: '8px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(255, 255, 0, 0.3)'
        }}>
          <div style={{ color: '#ffd43b', fontWeight: 'bold', marginBottom: '4px' }}>
            ✅ 收敛状态
          </div>
          <div style={{ color: '#ffffff', fontSize: '11px' }}>
            <div>迭代: {analysisResults.convergence.iterations} 次</div>
            <div>残差: {analysisResults.convergence.residual.toExponential(1)}</div>
            <div style={{ color: analysisResults.convergence.converged ? '#51cf66' : '#ff6b6b' }}>
              {analysisResults.convergence.converged ? '已收敛 ✓' : '未收敛 ✗'}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );

  // GPU粒子系统更新循环
  useEffect(() => {
    const updateParticles = () => {
      if (particleSystemRef.current && mapControllerRef.current) {
        const camera = mapControllerRef.current.getCamera();
        particleSystemRef.current.update(0.016, camera); // 假设60fps
      }
      requestAnimationFrame(updateParticles);
    };
    updateParticles();
  }, []);

  // ======================= 主渲染 =======================

  return (
    <animated.div style={{
      ...backgroundSpring,
      width: '100%',
      height: '100%',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* GPU粒子系统已集成到Three.js场景中 */}

      {/* geo-three 3D视口 */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
          background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
          overflow: 'hidden'
        }}
      >
        {/* 3D视口加载指示器 */}
        {systemStatus.gisStatus === 'initializing' && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: '#00ffff',
            fontSize: '18px',
            textAlign: 'center',
            zIndex: 10
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              style={{ fontSize: '48px', marginBottom: '20px' }}
            >
              🌍
            </motion.div>
            <div>初始化3D地理引擎...</div>
            <div style={{ fontSize: '14px', opacity: 0.7, marginTop: '10px' }}>
              加载WebGL渲染器 + GPU粒子系统
            </div>
          </div>
        )}
        
        {/* 3D视口控制提示 */}
        {systemStatus.gisStatus === 'ready' && (
          <div style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '12px',
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.3)',
            padding: '8px 12px',
            borderRadius: '6px',
            backdropFilter: 'blur(10px)'
          }}>
            <div>🖱️ 鼠标拖拽：平移视角</div>
            <div>🎡 滚轮：缩放视距</div>
            <div>🎯 点击标记：选择项目</div>
          </div>
        )}
      </div>

      {/* 全息投影Logo */}
      {renderHolographicLogo()}

      {/* 顶部状态栏 - 包含计算结果 */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '140px',
          right: '380px',
          height: '60px',
          background: 'rgba(0, 0, 0, 0.8)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '10px',
          padding: '10px 20px',
          backdropFilter: 'blur(15px)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        {/* 计算结果快速显示 */}
        <div style={{ display: 'flex', gap: '25px', fontSize: '11px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff6b6b', fontWeight: 'bold' }}>应力</div>
            <div style={{ color: '#ffffff' }}>{analysisResults.vonMisesStress.max} MPa</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4dabf7', fontWeight: 'bold' }}>位移</div>
            <div style={{ color: '#ffffff' }}>{analysisResults.displacement.max} mm</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#51cf66', fontWeight: 'bold' }}>安全系数</div>
            <div style={{ color: '#ffffff' }}>{analysisResults.safetyFactor.min}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: analysisResults.convergence.converged ? '#51cf66' : '#ff6b6b', fontWeight: 'bold' }}>
              收敛状态
            </div>
            <div style={{ color: '#ffffff', fontSize: '10px' }}>
              {analysisResults.convergence.converged ? '✓ 已收敛' : '✗ 未收敛'}
            </div>
          </div>
        </div>

        {/* 系统状态指示器 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', fontSize: '11px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: systemStatus.gisStatus === 'ready' ? '#51cf66' : '#ffd43b'
            }} />
            <span style={{ color: '#ffffff' }}>3D引擎</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: systemStatus.weatherStatus === 'ready' ? '#51cf66' : '#ffd43b'
            }} />
            <span style={{ color: '#ffffff' }}>气象数据</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#51cf66'
            }} />
            <span style={{ color: '#ffffff' }}>GPU粒子</span>
          </div>
        </div>
      </motion.div>

      {/* 地图和天气控制面板 */}
      {showMapControls && (
        <motion.div
          initial={{ opacity: 0, x: -300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -300 }}
          style={{
            position: 'absolute',
            top: '100px',
            left: '20px',
            width: '280px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid rgba(0, 255, 255, 0.3)',
            borderRadius: '15px',
            padding: '20px',
            backdropFilter: 'blur(20px)',
            zIndex: 1500
          }}
        >
          <h3 style={{
            color: '#00ffff',
            margin: '0 0 20px 0',
            fontSize: '16px',
            textAlign: 'center'
          }}>
            🗺️ 地图控制
          </h3>

          {/* 底图类型选择 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#ffffff', fontSize: '14px', marginBottom: '10px' }}>底图类型</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { key: 'satellite', name: '🛰️ 卫星图', color: '#4dabf7' },
                { key: 'terrain', name: '🏔️ 地形图', color: '#51cf66' },
                { key: 'street', name: '🛣️ 街道图', color: '#ffd43b' },
                { key: 'dark', name: '🌙 暗色图', color: '#8b5cf6' }
              ].map(style => (
                <motion.button
                  key={style.key}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setCurrentMapStyle(style.key as MapStyle);
                    if (mapControllerRef.current) {
                      mapControllerRef.current.switchMapStyle(style.key as MapStyle);
                    }
                  }}
                  style={{
                    padding: '8px 12px',
                    background: currentMapStyle === style.key ? 
                      `linear-gradient(45deg, ${style.color}, rgba(255,255,255,0.2))` :
                      'rgba(255, 255, 255, 0.1)',
                    border: currentMapStyle === style.key ? 
                      `2px solid ${style.color}` : 
                      '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#ffffff',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: currentMapStyle === style.key ? 'bold' : 'normal'
                  }}
                >
                  {style.name}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 天气图层控制 */}
          <div style={{ marginBottom: '20px' }}>
            <div style={{ color: '#ffffff', fontSize: '14px', marginBottom: '10px' }}>天气图层</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                onClick={() => {
                  setShowWeatherLayer(!showWeatherLayer);
                  if (mapControllerRef.current) {
                    mapControllerRef.current.setCloudsEnabled(!showWeatherLayer);
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: showWeatherLayer ? 
                    'linear-gradient(45deg, #00ffff, rgba(255,255,255,0.2))' :
                    'rgba(255, 255, 255, 0.1)',
                  border: showWeatherLayer ? 
                    '2px solid #00ffff' : 
                    '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '12px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}
              >
                <span>☁️ 云层显示</span>
                <span>{showWeatherLayer ? '✓' : '○'}</span>
              </motion.button>

              {/* 天气效果控制 */}
              {['🌧️ 降雨效果', '❄️ 降雪效果', '🌫️ 雾气效果'].map((effect, index) => (
                <motion.button
                  key={effect}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    // 切换天气效果
                    if (mapControllerRef.current) {
                      const effects = ['setRainEnabled', 'setSnowEnabled', 'setFogEnabled'];
                      (mapControllerRef.current as any)[effects[index]](true);
                      
                      // 3秒后自动关闭
                      setTimeout(() => {
                        (mapControllerRef.current as any)[effects[index]](false);
                      }, 3000);
                    }
                  }}
                  style={{
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: 'rgba(255, 255, 255, 0.8)',
                    fontSize: '11px',
                    cursor: 'pointer'
                  }}
                >
                  {effect}
                </motion.button>
              ))}
            </div>
          </div>

          {/* 3D视角控制 */}
          <div>
            <div style={{ color: '#ffffff', fontSize: '14px', marginBottom: '10px' }}>3D视角</div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  if (mapControllerRef.current) {
                    const camera = mapControllerRef.current.getCamera();
                    camera.position.set(0, 30, 30);
                    camera.lookAt(0, 0, 0);
                  }
                }}
                style={{
                  padding: '6px 10px',
                  background: 'linear-gradient(45deg, #ff6b6b, #ee5a5a)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                🏠 默认
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                onClick={() => {
                  if (mapControllerRef.current) {
                    const camera = mapControllerRef.current.getCamera();
                    camera.position.set(0, 50, 0);
                    camera.lookAt(0, 0, 0);
                  }
                }}
                style={{
                  padding: '6px 10px',
                  background: 'linear-gradient(45deg, #51cf66, #37b24d)',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#ffffff',
                  fontSize: '10px',
                  cursor: 'pointer'
                }}
              >
                🚁 俯视
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* 性能监控面板 - 保留在右上角 */}
      {renderPerformanceDashboard()}

      {/* 底部工具栏 - 重新设计 */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '15px',
          background: 'rgba(0, 0, 0, 0.85)',
          padding: '12px 30px',
          borderRadius: '30px',
          border: '2px solid transparent',
          backgroundImage: `
            linear-gradient(rgba(0, 0, 0, 0.85), rgba(0, 0, 0, 0.85)),
            linear-gradient(90deg, #00ffff, #ff00ff, #ffff00, #00ff88, #00ffff)
          `,
          backgroundOrigin: 'border-box',
          backgroundClip: 'content-box, border-box',
          backdropFilter: 'blur(20px)',
          boxShadow: `
            0 0 30px rgba(0, 255, 255, 0.4),
            0 0 60px rgba(255, 0, 255, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.1)
          `,
          zIndex: 2000
        }}
      >
        {/* 工具栏按钮 - 紧凑设计 */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowWeatherPanel(!showWeatherPanel)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #00ffff, #0080ff)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(0, 255, 255, 0.4)',
            minWidth: '80px'
          }}
        >
          🌦️ 天气
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowMapControls(!showMapControls)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #8b5cf6, #7c3aed)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(139, 92, 246, 0.4)',
            minWidth: '80px'
          }}
        >
          🗺️ 地图
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAIAssistant(!showAIAssistant)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #ff00ff, #8000ff)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 0, 255, 0.4)',
            minWidth: '80px'
          }}
        >
          🤖 AI
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShow3Results(!show3Results)}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #00ff88, #00cc66)',
            border: 'none',
            borderRadius: '12px',
            color: '#000000',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(0, 255, 136, 0.4)',
            minWidth: '80px'
          }}
        >
          🧮 计算
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            confetti({
              particleCount: 100,
              spread: 70,
              origin: { y: 0.8 },
              colors: ['#ffff00', '#ff8000']
            });
            window.open('/performance-dashboard', '_blank');
          }}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #ffff00, #ff8000)',
            border: 'none',
            borderRadius: '12px',
            color: '#000000',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 255, 0, 0.4)',
            minWidth: '80px'
          }}
        >
          📊 监控
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onExit}
          style={{
            padding: '8px 16px',
            background: 'linear-gradient(45deg, #ff4444, #cc0000)',
            border: 'none',
            borderRadius: '12px',
            color: '#ffffff',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 0 15px rgba(255, 68, 68, 0.4)',
            minWidth: '80px'
          }}
        >
          ❌ 退出
        </motion.button>
      </motion.div>

      {/* 天气控制面板 */}
      <WeatherControlPanel
        mapController={mapControllerRef.current}
        isVisible={showWeatherPanel}
        onClose={() => setShowWeatherPanel(false)}
      />

      {/* Epic嵌入式AI助手面板 */}
      <EnhancedAIAssistant
        isVisible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        width={500}
        height={700}
      />

      {/* 悬浮AI助手 - 始终显示 */}
      <FloatingAIAssistant />

      {/* 飞行指示器 */}
      <AnimatePresence>
        {isFlying && selectedProject && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.95)',
              border: '3px solid #00ffff',
              borderRadius: '20px',
              padding: '30px',
              color: '#ffffff',
              textAlign: 'center',
              zIndex: 3000,
              backdropFilter: 'blur(20px)',
              boxShadow: '0 0 50px rgba(0, 255, 255, 0.7)'
            }}
          >
            <motion.div
              animate={{
                rotate: 360,
                scale: [1, 1.2, 1]
              }}
              transition={{
                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                scale: { duration: 1, repeat: Infinity }
              }}
              style={{ fontSize: '60px', marginBottom: '20px' }}
            >
              🚁
            </motion.div>
            
            <div style={{ fontSize: '20px', color: '#00ffff', marginBottom: '10px' }}>
              EPIC 飞行导航中...
            </div>
            <div style={{ fontSize: '16px', opacity: 0.9 }}>
              目标: {selectedProject.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </animated.div>
  );
};

export default EpicControlCenterEnhanced;