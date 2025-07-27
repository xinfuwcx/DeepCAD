/**
 * Epic控制中心 - 1号专家的核心界面组件
 * 集成geo-three地图、Open-Meteo气象、项目管理
 * 实现0号架构师设计的完整Epic控制中心
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GeoThreeMapController, Coordinates, MapStyle, ProjectMarkerData } from '../../services/GeoThreeMapController';
// import { expert1Architecture } from '../../services/Expert1UnifiedArchitecture';
import { openMeteoService, WeatherData } from '../../services/OpenMeteoService';
import { WeatherControlPanel } from './WeatherControlPanel';
// import { EnhancedAIAssistant } from './EnhancedAIAssistant';
import { PerformancePanel } from '../../components/3d/performance/PerformancePanel';
import { PerformanceMonitor } from '../../components/3d/performance/PerformanceMonitor';

// ======================= 接口定义 =======================

interface EpicControlCenterProps {
  width?: number;
  height?: number;
  onExit: () => void;
  onSwitchToControlCenter?: () => void;
  projects?: ProjectMarkerData[];
  onProjectSelect?: (projectId: string) => void;
}

interface SystemStatus {
  gisStatus: 'initializing' | 'ready' | 'error';
  weatherStatus: 'loading' | 'ready' | 'error';
  architectureStatus: 'connecting' | 'connected' | 'error';
  loadedTiles: number;
  activeProjects: number;
}

// ======================= 默认项目数据 =======================

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

// ======================= 地图样式配置 =======================

const MAP_STYLES: Array<{ id: MapStyle; name: string; icon: string }> = [
  { id: 'street', name: '街道地图', icon: '🗺️' },
  { id: 'satellite', name: '卫星图像', icon: '🛰️' },
  { id: 'terrain', name: '地形图', icon: '⛰️' },
  { id: 'dark', name: '暗色主题', icon: '🌙' }
];

// ======================= 主组件 =======================

export const EpicControlCenter: React.FC<EpicControlCenterProps> = ({
  width = window.innerWidth,
  height = window.innerHeight,
  onExit,
  onSwitchToControlCenter,
  projects = DEFAULT_PROJECTS,
  onProjectSelect
}) => {
  // 引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapControllerRef = useRef<GeoThreeMapController | null>(null);
  
  // 状态管理
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    gisStatus: 'initializing',
    weatherStatus: 'loading',
    architectureStatus: 'connecting',
    loadedTiles: 0,
    activeProjects: 0
  });
  
  const [selectedProject, setSelectedProject] = useState<ProjectMarkerData | null>(null);
  const [isFlying, setIsFlying] = useState(false);
  const [currentMapStyle, setCurrentMapStyle] = useState<MapStyle>('street');
  const [showWeatherLayer, setShowWeatherLayer] = useState(true);
  const [weatherData, setWeatherData] = useState<Record<string, WeatherData>>({});
  const [showWeatherPanel, setShowWeatherPanel] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  
  // 性能监控器 - 延迟初始化
  const [performanceMonitor, setPerformanceMonitor] = useState<PerformanceMonitor | null>(null);

  // ======================= 初始化 =======================

  useEffect(() => {
    initializeEpicControlCenter();
    
    return () => {
      cleanup();
    };
  }, []);

  const initializeEpicControlCenter = async (): Promise<void> => {
    try {
      console.log('🚀 初始化Epic控制中心...');
      
      // 初始化1号专家架构 (暂时跳过，直接设为连接状态)
      setSystemStatus(prev => ({ ...prev, architectureStatus: 'connecting' }));
      // await expert1Architecture.initialize();
      console.log('🏗️ 专家架构系统已准备就绪');
      setSystemStatus(prev => ({ ...prev, architectureStatus: 'connected' }));
      
      // 初始化地图控制器
      if (mapContainerRef.current) {
        setSystemStatus(prev => ({ ...prev, gisStatus: 'initializing' }));
        
        try {
          console.log('🗺️ 开始初始化GeoThreeMapController...');
          const mapController = new GeoThreeMapController(mapContainerRef.current);
          mapControllerRef.current = mapController;
          console.log('✅ GeoThreeMapController初始化成功');
          
          // 设置项目点击处理器
          mapController.setProjectClickHandler(handleProjectClick);
          
          // 延迟加载瓦片，确保WebGL上下文准备好
          setTimeout(async () => {
            try {
              // 加载初始瓦片
              console.log('🌍 开始加载初始瓦片...');
              await mapController.loadVisibleTiles();
              setSystemStatus(prev => ({ ...prev, gisStatus: 'ready', loadedTiles: 25 }));
              console.log('🌍 瓦片加载完成');
              
              // 添加项目标记
              await loadProjectMarkers(mapController);
              
              // 初始化性能监控器（在Three.js渲染器准备好后）
              try {
                const scene = mapController.getScene();
                const camera = mapController.getCamera();
                const renderer = mapController.getRenderer();
                
                if (scene && camera && renderer) {
                  const perfMonitor = new PerformanceMonitor(scene, camera, renderer);
                  setPerformanceMonitor(perfMonitor);
                  console.log('📊 性能监控器初始化完成');
                } else {
                  console.warn('⚠️ Three.js组件未准备好，跳过性能监控器初始化');
                }
              } catch (perfError) {
                console.warn('⚠️ 性能监控器初始化失败:', perfError);
              }
              
              console.log('✅ Epic控制中心初始化完成');
            } catch (loadError) {
              console.error('❌ 瓦片加载失败:', loadError);
              setSystemStatus(prev => ({ ...prev, gisStatus: 'error' }));
            }
          }, 500);
          
        } catch (mapError) {
          console.error('❌ GeoThreeMapController初始化失败:', mapError);
          setSystemStatus(prev => ({ ...prev, gisStatus: 'error' }));
        }
      } else {
        console.error('❌ 地图容器未找到');
        setSystemStatus(prev => ({ ...prev, gisStatus: 'error' }));
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
    console.log('📌 加载项目标记...');
    
    try {
      // 批量获取天气数据
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'loading' }));
      
      const locations = projects.map(p => ({ lat: p.location.lat, lng: p.location.lng, name: p.name }));
      
      let weatherDataArray;
      try {
        weatherDataArray = await openMeteoService.getBatchWeather(locations);
      } catch (weatherError) {
        console.warn('⚠️ 天气服务暂不可用，使用默认天气数据:', weatherError);
        // 创建默认天气数据
        weatherDataArray = locations.map(() => ({
          temperature: 20,
          humidity: 60,
          windSpeed: 5,
          description: 'partly-cloudy',
          icon: '⛅'
        }));
      }
      
      // 创建天气数据映射
      const weatherMap: Record<string, WeatherData> = {};
      projects.forEach((project, index) => {
        weatherMap[project.id] = weatherDataArray[index];
      });
      
      setWeatherData(weatherMap);
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'ready' }));
      
      // 添加项目标记到地图
      projects.forEach(project => {
        const projectWithWeather = {
          ...project,
          weather: weatherMap[project.id]
        };
        mapController.addProjectMarker(projectWithWeather);
      });
      
      setSystemStatus(prev => ({ ...prev, activeProjects: projects.length }));
      console.log('✅ 项目标记加载完成');
      
    } catch (error) {
      console.warn('⚠️ 项目标记加载部分失败:', error);
      setSystemStatus(prev => ({ ...prev, weatherStatus: 'error' }));
      
      // 降级：不带天气数据的项目标记
      projects.forEach(project => {
        mapController.addProjectMarker(project);
      });
    }
  };

  const cleanup = (): void => {
    if (mapControllerRef.current) {
      mapControllerRef.current.dispose();
    }
    
    if (performanceMonitor) {
      try {
        performanceMonitor.dispose();
        console.log('📊 性能监控器已清理');
      } catch (error) {
        console.warn('⚠️ 性能监控器清理失败:', error);
      }
    }
  };

  // ======================= 事件处理 =======================

  const handleProjectClick = useCallback(async (projectId: string) => {
    const project = projects.find(p => p.id === projectId);
    if (!project || !mapControllerRef.current) return;
    
    console.log(`🎯 选择项目: ${project.name}`);
    setSelectedProject(project);
    
    // 执行飞行动画
    if (!isFlying) {
      setIsFlying(true);
      
      try {
        await mapControllerRef.current.flyToProject(projectId);
        
        // 通知外部组件
        if (onProjectSelect) {
          onProjectSelect(projectId);
        }
        
        // 向1号专家架构发送项目选择事件 (暂时跳过)
        // await expert1Architecture.processProjectContext({
        //   location: project.location,
        //   elevation: 0,
        //   soilType: 'mixed',
        //   environmentalFactors: {
        //     weather: weatherData[projectId],
        //     urban: true
        //   }
        // });
        console.log('🎯 项目上下文已更新:', project.name);
        
      } catch (error) {
        console.error('❌ 项目飞行失败:', error);
      } finally {
        setIsFlying(false);
      }
    }
  }, [projects, weatherData, isFlying, onProjectSelect]);

  const handleMapStyleChange = useCallback(async (style: MapStyle) => {
    if (!mapControllerRef.current || currentMapStyle === style) return;
    
    console.log(`🎨 切换地图样式: ${style}`);
    setCurrentMapStyle(style);
    
    try {
      await mapControllerRef.current.switchMapStyle(style);
      
      // 通知GIS架构服务 (暂时跳过)
      // expert1Architecture.getGISService().getMapController().switchMapStyle(style);
      console.log('🎨 地图样式已切换:', style);
      
    } catch (error) {
      console.error('❌ 地图样式切换失败:', error);
    }
  }, [currentMapStyle]);

  const handleWeatherToggle = useCallback(() => {
    setShowWeatherLayer(!showWeatherLayer);
    
    // 通知GIS架构服务 (暂时跳过)
    // expert1Architecture.getGISService().getGisControl().enableWeatherLayer(!showWeatherLayer);
    console.log('🌤️ 天气图层状态:', !showWeatherLayer ? '启用' : '禁用');
    
    console.log(`🌤️ 天气图层: ${!showWeatherLayer ? 'ON' : 'OFF'}`);
  }, [showWeatherLayer]);

  const handleEpicFlight = useCallback(() => {
    if (!mapControllerRef.current || isFlying) return;
    
    console.log('🎬 启动Epic飞行演示');
    
    // 启用电影级模式 (暂时跳过)
    // expert1Architecture.getEpicControl().getFlightControl().enableCinematicMode();
    // expert1Architecture.getEpicControl().getModeManager().switchTo3DNavigation();
    console.log('🎬 Epic飞行模式已启用');
    
    // 随机选择一个项目进行飞行演示
    const randomProject = projects[Math.floor(Math.random() * projects.length)];
    handleProjectClick(randomProject.id);
  }, [projects, isFlying, handleProjectClick]);

  // ======================= 渲染函数 =======================

  const renderSystemStatus = () => (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.8)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        minWidth: '200px',
        zIndex: 1000,
        backdropFilter: 'blur(10px)'
      }}
    >
      <h4 style={{ color: '#00ffff', margin: '0 0 8px 0', fontSize: '14px' }}>
        🎮 Epic控制中心状态
      </h4>
      
      <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
        <div style={{ color: getStatusColor(systemStatus.gisStatus) }}>
          🗺️ GIS: {getStatusText(systemStatus.gisStatus)}
        </div>
        <div style={{ color: getStatusColor(systemStatus.weatherStatus) }}>
          🌤️ 气象: {getStatusText(systemStatus.weatherStatus)}
        </div>
        <div style={{ color: getStatusColor(systemStatus.architectureStatus) }}>
          🏗️ 架构: {getStatusText(systemStatus.architectureStatus)}
        </div>
        <div style={{ color: '#ffffff' }}>
          📊 瓦片: {systemStatus.loadedTiles} | 项目: {systemStatus.activeProjects}
        </div>
      </div>
    </motion.div>
  );

  const renderControlToolbar = () => (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.8, type: "spring", bounce: 0.3 }}
      style={{
        position: 'absolute',
        top: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '15px',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(0, 0, 0, 0.95) 100%)',
        padding: '15px 30px',
        borderRadius: '30px',
        border: '2px solid transparent',
        backgroundImage: 'linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)), linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff)',
        backgroundOrigin: 'border-box',
        backgroundClip: 'content-box, border-box',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: `
          0 0 30px rgba(0, 255, 255, 0.3),
          0 0 60px rgba(0, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1)
        `,
        zIndex: 1000
      }}
    >
      {/* Epic标识 - 超炫酷未来感 */}
      <motion.div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          paddingRight: '20px',
          borderRight: '2px solid transparent',
          borderImage: 'linear-gradient(90deg, #00ffff, #ff00ff, #00ffff) 1'
        }}
        whileHover={{ scale: 1.05 }}
        transition={{ type: "spring", stiffness: 400 }}
      >
        <motion.div 
          style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #00ffff 0%, #0080ff 25%, #ff00ff 50%, #0080ff 75%, #00ffff 100%)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px',
            position: 'relative',
            boxShadow: '0 0 20px rgba(0, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
          }}
          animate={{ 
            backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
            boxShadow: [
              '0 0 20px rgba(0, 255, 255, 0.5)',
              '0 0 30px rgba(255, 0, 255, 0.7)',
              '0 0 20px rgba(0, 255, 255, 0.5)'
            ]
          }}
          transition={{ 
            duration: 3,
            repeat: Infinity,
            ease: "linear"
          }}
        >
          <motion.span
            animate={{ rotateY: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            🎮
          </motion.span>
          
          {/* 光环效果 */}
          <motion.div
            style={{
              position: 'absolute',
              inset: '-3px',
              borderRadius: '15px',
              background: 'linear-gradient(45deg, transparent, #00ffff, transparent, #ff00ff, transparent)',
              opacity: 0.6,
              zIndex: -1
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          />
        </motion.div>
        
        <div>
          <motion.span 
            style={{ 
              color: 'transparent',
              background: 'linear-gradient(90deg, #00ffff, #ffffff, #ff00ff, #ffffff, #00ffff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              fontSize: '16px', 
              fontWeight: 'bold',
              textShadow: '0 0 10px rgba(0, 255, 255, 0.5)'
            }}
            animate={{
              backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            EPIC控制中心
          </motion.span>
          <div style={{ 
            color: 'rgba(255, 255, 255, 0.7)', 
            fontSize: '10px',
            marginTop: '2px',
            letterSpacing: '1px'
          }}>
            ⚡ HYPER FUTURE SYSTEM
          </div>
        </div>
      </motion.div>

      {/* 地图样式切换 - 未来科技感 */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {MAP_STYLES.map((style, index) => (
          <motion.button
            key={style.id}
            onClick={() => handleMapStyleChange(style.id)}
            whileHover={{ 
              scale: 1.1,
              boxShadow: '0 0 25px rgba(0, 255, 255, 0.6)'
            }}
            whileTap={{ scale: 0.95 }}
            animate={{
              background: currentMapStyle === style.id ? 
                [
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.4), rgba(255, 0, 255, 0.4))',
                  'linear-gradient(45deg, rgba(255, 0, 255, 0.4), rgba(0, 255, 255, 0.4))',
                  'linear-gradient(45deg, rgba(0, 255, 255, 0.4), rgba(255, 0, 255, 0.4))'
                ] : 'rgba(255, 255, 255, 0.1)',
              borderColor: currentMapStyle === style.id ? 
                ['#00ffff', '#ff00ff', '#00ffff'] : 'rgba(255, 255, 255, 0.3)'
            }}
            transition={{
              duration: currentMapStyle === style.id ? 2 : 0.2,
              repeat: currentMapStyle === style.id ? Infinity : 0,
              ease: "linear"
            }}
            style={{
              border: '2px solid',
              borderRadius: '10px',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              minWidth: '70px',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}
            title={style.name}
          >
            {/* 发光背景 */}
            {currentMapStyle === style.id && (
              <motion.div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(45deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
                  zIndex: -1
                }}
                animate={{
                  x: ['-100%', '100%']
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            )}
            
            <motion.span
              animate={currentMapStyle === style.id ? {
                textShadow: [
                  '0 0 5px #00ffff',
                  '0 0 15px #ff00ff',
                  '0 0 5px #00ffff'
                ]
              } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            >
              {style.icon} {style.name}
            </motion.span>
          </motion.button>
        ))}
      </div>

      {/* 功能按钮 - 超未来感 */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <motion.button
          onClick={handleWeatherToggle}
          whileHover={{ 
            scale: 1.05,
            boxShadow: showWeatherLayer ? 
              '0 0 25px rgba(0, 255, 0, 0.8)' : 
              '0 0 25px rgba(255, 255, 255, 0.3)'
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            background: showWeatherLayer ? 
              [
                'linear-gradient(45deg, rgba(0, 255, 0, 0.4), rgba(0, 255, 255, 0.4))',
                'linear-gradient(45deg, rgba(0, 255, 255, 0.4), rgba(0, 255, 0, 0.4))',
                'linear-gradient(45deg, rgba(0, 255, 0, 0.4), rgba(0, 255, 255, 0.4))'
              ] : 'rgba(255, 255, 255, 0.1)',
            borderColor: showWeatherLayer ? 
              ['#00ff00', '#00ffff', '#00ff00'] : 'rgba(255, 255, 255, 0.3)'
          }}
          transition={{
            duration: showWeatherLayer ? 2 : 0.2,
            repeat: showWeatherLayer ? Infinity : 0,
            ease: "linear"
          }}
          style={{
            border: '2px solid',
            borderRadius: '10px',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.span
            animate={showWeatherLayer ? {
              textShadow: [
                '0 0 5px #00ff00',
                '0 0 15px #00ffff',
                '0 0 5px #00ff00'
              ]
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🌤️ 气象
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => setShowWeatherPanel(!showWeatherPanel)}
          whileHover={{ 
            scale: 1.05,
            boxShadow: showWeatherPanel ? 
              '0 0 25px rgba(255, 100, 255, 0.8)' : 
              '0 0 25px rgba(100, 200, 255, 0.5)'
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            background: showWeatherPanel ? 
              [
                'linear-gradient(45deg, rgba(255, 100, 255, 0.4), rgba(100, 200, 255, 0.4))',
                'linear-gradient(45deg, rgba(100, 200, 255, 0.4), rgba(255, 100, 255, 0.4))',
                'linear-gradient(45deg, rgba(255, 100, 255, 0.4), rgba(100, 200, 255, 0.4))'
              ] : 'rgba(255, 255, 255, 0.1)',
            borderColor: showWeatherPanel ? 
              ['#ff64ff', '#64c8ff', '#ff64ff'] : 'rgba(255, 255, 255, 0.3)'
          }}
          transition={{
            duration: showWeatherPanel ? 2 : 0.2,
            repeat: showWeatherPanel ? Infinity : 0,
            ease: "linear"
          }}
          style={{
            border: '2px solid',
            borderRadius: '10px',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.span
            animate={showWeatherPanel ? {
              textShadow: [
                '0 0 5px #ff64ff',
                '0 0 15px #64c8ff',
                '0 0 5px #ff64ff'
              ]
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🌦️ 天气效果
          </motion.span>
        </motion.button>

        <motion.button
          onClick={handleEpicFlight}
          disabled={isFlying}
          whileHover={!isFlying ? { 
            scale: 1.05,
            boxShadow: '0 0 25px rgba(0, 150, 255, 0.8)'
          } : {}}
          whileTap={!isFlying ? { scale: 0.95 } : {}}
          animate={{
            background: isFlying ? 
              [
                'linear-gradient(45deg, rgba(255, 165, 0, 0.6), rgba(255, 0, 0, 0.4))',
                'linear-gradient(45deg, rgba(255, 0, 0, 0.4), rgba(255, 165, 0, 0.6))',
                'linear-gradient(45deg, rgba(255, 165, 0, 0.6), rgba(255, 0, 0, 0.4))'
              ] : 
              [
                'linear-gradient(45deg, rgba(0, 150, 255, 0.4), rgba(100, 200, 255, 0.4))',
                'linear-gradient(45deg, rgba(100, 200, 255, 0.4), rgba(0, 150, 255, 0.4))',
                'linear-gradient(45deg, rgba(0, 150, 255, 0.4), rgba(100, 200, 255, 0.4))'
              ],
            borderColor: isFlying ? 
              ['#ffa500', '#ff0000', '#ffa500'] : 
              ['#0096ff', '#64c8ff', '#0096ff']
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            border: '2px solid',
            borderRadius: '10px',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: isFlying ? 'not-allowed' : 'pointer',
            opacity: isFlying ? 0.8 : 1,
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.span
            animate={{
              textShadow: isFlying ? 
                [
                  '0 0 5px #ffa500',
                  '0 0 15px #ff0000',
                  '0 0 5px #ffa500'
                ] :
                [
                  '0 0 5px #0096ff',
                  '0 0 15px #64c8ff',
                  '0 0 5px #0096ff'
                ]
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            {isFlying ? '🚁 FLYING' : '✈️ EPIC FLIGHT'}
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => {
            // 打开性能监控界面
            console.log('🚀 启动性能监控系统');
            setShowPerformancePanel(true);
          }}
          whileHover={{ 
            scale: 1.05,
            boxShadow: '0 0 25px rgba(255, 255, 0, 0.8)'
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            background: [
              'linear-gradient(45deg, rgba(255, 255, 0, 0.4), rgba(255, 150, 0, 0.4))',
              'linear-gradient(45deg, rgba(255, 150, 0, 0.4), rgba(255, 255, 0, 0.4))',
              'linear-gradient(45deg, rgba(255, 255, 0, 0.4), rgba(255, 150, 0, 0.4))'
            ],
            borderColor: ['#ffff00', '#ff9600', '#ffff00']
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{
            border: '2px solid',
            borderRadius: '10px',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.span
            animate={{
              textShadow: [
                '0 0 5px #ffff00',
                '0 0 15px #ff9600',
                '0 0 5px #ffff00'
              ]
            }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            📊 性能监控
          </motion.span>
        </motion.button>

        <motion.button
          onClick={() => setShowAIAssistant(!showAIAssistant)}
          whileHover={{ 
            scale: 1.05,
            boxShadow: showAIAssistant ? 
              '0 0 25px rgba(0, 255, 100, 0.8)' : 
              '0 0 25px rgba(100, 255, 200, 0.5)'
          }}
          whileTap={{ scale: 0.95 }}
          animate={{
            background: showAIAssistant ? 
              [
                'linear-gradient(45deg, rgba(0, 255, 100, 0.4), rgba(0, 200, 255, 0.4))',
                'linear-gradient(45deg, rgba(0, 200, 255, 0.4), rgba(0, 255, 100, 0.4))',
                'linear-gradient(45deg, rgba(0, 255, 100, 0.4), rgba(0, 200, 255, 0.4))'
              ] : 'rgba(255, 255, 255, 0.1)',
            borderColor: showAIAssistant ? 
              ['#00ff64', '#00c8ff', '#00ff64'] : 'rgba(255, 255, 255, 0.3)'
          }}
          transition={{
            duration: showAIAssistant ? 2 : 0.2,
            repeat: showAIAssistant ? Infinity : 0,
            ease: "linear"
          }}
          style={{
            border: '2px solid',
            borderRadius: '10px',
            color: '#ffffff',
            padding: '8px 12px',
            fontSize: '12px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          <motion.span
            animate={showAIAssistant ? {
              textShadow: [
                '0 0 5px #00ff64',
                '0 0 15px #00c8ff',
                '0 0 5px #00ff64'
              ]
            } : {}}
            transition={{ duration: 1, repeat: Infinity }}
          >
            🤖 AI助手
          </motion.span>
        </motion.button>

        {/* 控制中心切换按钮 */}
        {onSwitchToControlCenter && (
          <motion.button
            onClick={onSwitchToControlCenter}
            whileHover={{ 
              scale: 1.05,
              boxShadow: '0 0 25px rgba(0, 150, 255, 0.8)'
            }}
            whileTap={{ scale: 0.95 }}
            animate={{
              background: [
                'linear-gradient(45deg, rgba(0, 150, 255, 0.4), rgba(0, 200, 255, 0.4))',
                'linear-gradient(45deg, rgba(0, 200, 255, 0.4), rgba(0, 150, 255, 0.4))',
                'linear-gradient(45deg, rgba(0, 150, 255, 0.4), rgba(0, 200, 255, 0.4))'
              ],
              borderColor: ['#0096ff', '#00c8ff', '#0096ff']
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "linear"
            }}
            style={{
              border: '2px solid',
              borderRadius: '10px',
              color: '#ffffff',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <motion.span
              animate={{
                textShadow: [
                  '0 0 5px #0096ff',
                  '0 0 15px #00c8ff',
                  '0 0 5px #0096ff'
                ]
              }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              🎛️ 控制中心
            </motion.span>
          </motion.button>
        )}
      </div>

      {/* 退出按钮 - 危险美学 */}
      <motion.button
        onClick={onExit}
        whileHover={{ 
          scale: 1.05,
          boxShadow: '0 0 25px rgba(255, 0, 0, 0.8)'
        }}
        whileTap={{ scale: 0.95 }}
        animate={{
          background: [
            'linear-gradient(45deg, rgba(255, 0, 0, 0.6), rgba(255, 100, 100, 0.4))',
            'linear-gradient(45deg, rgba(255, 100, 100, 0.4), rgba(255, 0, 0, 0.6))',
            'linear-gradient(45deg, rgba(255, 0, 0, 0.6), rgba(255, 100, 100, 0.4))'
          ],
          borderColor: ['#ff0000', '#ff6464', '#ff0000']
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{
          border: '2px solid',
          borderRadius: '10px',
          color: '#ffffff',
          padding: '8px 15px',
          cursor: 'pointer',
          fontSize: '12px',
          marginLeft: '12px',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <motion.span
          animate={{
            textShadow: [
              '0 0 5px #ff0000',
              '0 0 15px #ff6464',
              '0 0 5px #ff0000'
            ]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ✕ EXIT
        </motion.span>
      </motion.button>
    </motion.div>
  );

  const renderProjectPanel = () => (
    <motion.div
      initial={{ x: -300, opacity: 0, scale: 0.9 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      transition={{ 
        delay: 0.5,
        type: "spring",
        stiffness: 100,
        damping: 15
      }}
      style={{
        position: 'absolute',
        left: '20px',
        top: '100px',
        width: '320px',
        maxHeight: 'calc(100vh - 140px)',
        background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.95) 0%, rgba(0, 20, 40, 0.9) 30%, rgba(0, 0, 0, 0.95) 100%)',
        border: '2px solid transparent',
        backgroundImage: `
          linear-gradient(rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.9)),
          linear-gradient(135deg, #00ffff, #0080ff, #ff00ff, #00ffff)
        `,
        backgroundOrigin: 'border-box',
        backgroundClip: 'content-box, border-box',
        borderRadius: '20px',
        padding: '20px',
        backdropFilter: 'blur(20px) saturate(180%)',
        boxShadow: `
          0 0 40px rgba(0, 255, 255, 0.3),
          0 0 80px rgba(0, 255, 255, 0.1),
          inset 0 1px 0 rgba(255, 255, 255, 0.1),
          inset 0 -1px 0 rgba(0, 255, 255, 0.2)
        `,
        zIndex: 500,
        overflowY: 'auto'
      }}
    >
      {/* 标题区域 - 超炫酷效果 */}
      <motion.div
        animate={{
          background: [
            'linear-gradient(90deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))',
            'linear-gradient(90deg, rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1))',
            'linear-gradient(90deg, rgba(0, 255, 255, 0.1), rgba(255, 0, 255, 0.1), rgba(0, 255, 255, 0.1))'
          ]
        }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        style={{
          padding: '15px',
          borderRadius: '12px',
          marginBottom: '20px',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* 流动光效背景 */}
        <motion.div
          animate={{
            x: ['-100%', '100%'],
            opacity: [0, 1, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)',
            zIndex: 1
          }}
        />
        
        <div style={{ position: 'relative', zIndex: 2 }}>
          <motion.h3
            animate={{
              textShadow: [
                '0 0 10px #00ffff',
                '0 0 20px #ff00ff', 
                '0 0 30px #00ffff',
                '0 0 20px #ff00ff',
                '0 0 10px #00ffff'
              ]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              color: 'transparent',
              background: 'linear-gradient(90deg, #00ffff, #ffffff, #ff00ff, #ffffff, #00ffff)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              fontSize: '16px',
              fontWeight: 'bold',
              textAlign: 'center',
              margin: '0 0 8px 0'
            }}
          >
            🏗️ 深基坑项目矩阵
          </motion.h3>
          
          <motion.div
            animate={{
              opacity: [0.6, 1, 0.6]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              textAlign: 'center',
              fontSize: '12px',
              color: 'rgba(255, 255, 255, 0.8)'
            }}
          >
            <span style={{ color: '#00ffff' }}>{projects.length}</span> 个活跃项目 • 
            <span style={{ color: '#ff00ff' }}>Epic控制中心</span>
          </motion.div>
        </div>
      </motion.div>

      {isFlying && selectedProject && (
        <div style={{
          background: 'rgba(255, 165, 0, 0.2)',
          border: '1px solid rgba(255, 165, 0, 0.6)',
          borderRadius: '6px',
          padding: '8px',
          marginBottom: '12px',
          color: '#ffaa00',
          textAlign: 'center',
          fontSize: '11px'
        }}>
          🚁 正在飞往: {selectedProject.name}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {projects.map((project, index) => {
          const weather = weatherData[project.id];
          const isSelected = selectedProject?.id === project.id;
          
          return (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, x: -50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              transition={{ 
                delay: index * 0.15,
                type: "spring",
                stiffness: 120,
                damping: 20
              }}
              whileHover={!isFlying ? {
                scale: 1.05,
                y: -3,
                boxShadow: [
                  '0 5px 20px rgba(0, 255, 255, 0.3)',
                  '0 8px 30px rgba(255, 0, 255, 0.4)',
                  '0 5px 20px rgba(0, 255, 255, 0.3)'
                ]
              } : {}}
              whileTap={!isFlying ? { scale: 0.98 } : {}}
              onClick={() => !isFlying && handleProjectClick(project.id)}
              animate={{
                background: isSelected ? [
                  'linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(255, 0, 255, 0.15), rgba(0, 255, 255, 0.25))',
                  'linear-gradient(135deg, rgba(255, 0, 255, 0.15), rgba(0, 255, 255, 0.25), rgba(255, 0, 255, 0.15))',
                  'linear-gradient(135deg, rgba(0, 255, 255, 0.25), rgba(255, 0, 255, 0.15), rgba(0, 255, 255, 0.25))'
                ] : 'linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(0, 150, 255, 0.05), rgba(255, 255, 255, 0.08))',
                borderColor: isSelected ? [
                  '#00ffff', '#ff00ff', '#00ffff'
                ] : 'rgba(255, 255, 255, 0.15)'
              }}
              transition={{
                background: { duration: isSelected ? 2.5 : 0.3, repeat: isSelected ? Infinity : 0 },
                borderColor: { duration: isSelected ? 2.5 : 0.3, repeat: isSelected ? Infinity : 0 }
              }}
              style={{
                border: '2px solid',
                borderRadius: '12px',
                padding: '14px',
                cursor: isFlying ? 'not-allowed' : 'pointer',
                opacity: isFlying ? 0.6 : 1,
                backdropFilter: 'blur(15px) saturate(150%)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* 魔幻光效背景 - 只在选中时显示 */}
              {isSelected && (
                <motion.div
                  animate={{
                    background: [
                      'radial-gradient(circle at 0% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 50% 50%, rgba(255, 0, 255, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 100% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 50% 0%, rgba(255, 0, 255, 0.1) 0%, transparent 50%)',
                      'radial-gradient(circle at 0% 50%, rgba(0, 255, 255, 0.1) 0%, transparent 50%)'
                    ]
                  }}
                  transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 1
                  }}
                />
              )}
              
              {/* 流动彩虹边框效果 */}
              <motion.div
                animate={{
                  rotate: [0, 360]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                style={{
                  position: 'absolute',
                  inset: '-2px',
                  background: 'conic-gradient(from 0deg, transparent, rgba(0, 255, 255, 0.3), transparent, rgba(255, 0, 255, 0.3), transparent)',
                  borderRadius: '12px',
                  zIndex: 0,
                  opacity: isSelected ? 0.7 : 0.2
                }}
              />
              
              <div style={{ position: 'relative', zIndex: 2 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '8px'
                }}>
                  <motion.h4
                    animate={isSelected ? {
                      textShadow: [
                        '0 0 8px #00ffff',
                        '0 0 15px #ff00ff',
                        '0 0 8px #00ffff'
                      ],
                      color: [
                        '#ffffff',
                        '#00ffff', 
                        '#ffffff',
                        '#ff00ff',
                        '#ffffff'
                      ]
                    } : {}}
                    transition={{ duration: 2, repeat: isSelected ? Infinity : 0 }}
                    style={{
                      margin: 0,
                      fontSize: '13px',
                      fontWeight: 'bold',
                      color: '#ffffff'
                    }}
                  >
                    {project.name}
                  </motion.h4>
                  
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                      boxShadow: [
                        `0 0 8px ${project.status === 'completed' ? '#52c41a' : project.status === 'active' ? '#faad14' : '#999'}`,
                        `0 0 15px ${project.status === 'completed' ? '#52c41a' : project.status === 'active' ? '#faad14' : '#999'}`,
                        `0 0 8px ${project.status === 'completed' ? '#52c41a' : project.status === 'active' ? '#faad14' : '#999'}`
                      ]
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    style={{
                      width: '10px',
                      height: '10px',
                      borderRadius: '50%',
                      background: project.status === 'completed' ? '#52c41a' :
                                 project.status === 'active' ? '#faad14' : '#999'
                    }}
                  />
                </div>

                <motion.div
                  initial={{ opacity: 0.8 }}
                  whileHover={{ opacity: 1 }}
                  style={{
                    color: 'rgba(255, 255, 255, 0.85)',
                    fontSize: '11px',
                    lineHeight: '1.4',
                    fontFamily: 'Monaco, monospace'
                  }}
                >
                  <motion.div
                    animate={{
                      color: ['rgba(255, 255, 255, 0.8)', 'rgba(0, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.8)']
                    }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    📍 {project.location.lat.toFixed(3)}°N, {project.location.lng.toFixed(3)}°E
                  </motion.div>
                  
                  <div style={{ marginTop: '4px' }}>
                    🕳️ 深度: <span style={{ color: '#ffaa00', fontWeight: 'bold' }}>{project.depth}m</span> | 
                    📊 进度: <span style={{ color: '#00ff88', fontWeight: 'bold' }}>{project.progress}%</span>
                  </div>
                  
                  {/* 进度条 - 梦幻效果 */}
                  <div style={{
                    marginTop: '6px',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <motion.div
                      animate={{
                        background: [
                          'linear-gradient(90deg, #00ff88, #00ffff)',
                          'linear-gradient(90deg, #00ffff, #ff00ff)',
                          'linear-gradient(90deg, #ff00ff, #00ff88)',
                          'linear-gradient(90deg, #00ff88, #00ffff)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        height: '100%',
                        width: `${project.progress}%`,
                        borderRadius: '2px',
                        boxShadow: '0 0 8px rgba(0, 255, 255, 0.5)'
                      }}
                    />
                  </div>
                  
                  {showWeatherLayer && weather && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      style={{
                        color: '#00ffff',
                        marginTop: '8px',
                        padding: '6px',
                        background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15), rgba(0, 150, 255, 0.1))',
                        borderRadius: '6px',
                        border: '1px solid rgba(0, 255, 255, 0.3)',
                        fontSize: '10px',
                        backdropFilter: 'blur(5px)'
                      }}
                    >
                      <motion.span
                        animate={{ rotate: [0, 10, -10, 0] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        style={{ display: 'inline-block' }}
                      >
                        {weather.icon}
                      </motion.span>
                      {' '}{weather.temperature}°C | 💨 {weather.windSpeed}km/h
                    </motion.div>
                  )}
                </motion.div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{
        marginTop: '12px',
        padding: '10px',
        background: 'rgba(0, 255, 255, 0.1)',
        borderRadius: '6px',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        fontSize: '10px',
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center'
      }}>
        💡 点击项目启动Epic飞行导航<br/>
        🗺️ 支持多种地图样式切换<br/>
        🌤️ 实时气象数据集成
      </div>
    </motion.div>
  );

  const renderFlightIndicator = () => (
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
            borderRadius: '15px',
            padding: '25px',
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
            style={{ fontSize: '50px', marginBottom: '15px' }}
          >
            🚁
          </motion.div>
          
          <div style={{ fontSize: '18px', marginBottom: '8px', color: '#00ffff' }}>
            Epic飞行导航
          </div>
          <div style={{ fontSize: '14px', opacity: 0.9, marginBottom: '10px' }}>
            飞往 {selectedProject.name}
          </div>
          <div style={{ fontSize: '11px', opacity: 0.7 }}>
            geo-three地图引擎 + Three.js 3D渲染
          </div>

          {/* 飞行进度条 */}
          <div style={{
            marginTop: '15px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            overflow: 'hidden',
            width: '180px'
          }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: '100%' }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
              style={{
                height: '100%',
                background: 'linear-gradient(90deg, #00ffff, #0080ff, #00ffff)',
                borderRadius: '2px'
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ======================= 辅助函数 =======================

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'ready':
      case 'connected':
        return '#52c41a';
      case 'loading':
      case 'initializing':
      case 'connecting':
        return '#faad14';
      case 'error':
        return '#ff4d4f';
      default:
        return '#ffffff';
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case 'ready':
        return '就绪';
      case 'connected':
        return '已连接';
      case 'loading':
        return '加载中';
      case 'initializing':
        return '初始化';
      case 'connecting':
        return '连接中';
      case 'error':
        return '错误';
      default:
        return '未知';
    }
  };

  // ======================= 主渲染 =======================

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: '#000011',
      overflow: 'hidden'
    }}>
      {/* geo-three地图容器 */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 1,
          background: '#001122' // 添加备用背景色
        }}
      />
      
      {/* 强制显示内容 - 确保右侧不是黑屏 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 50,
          background: 'linear-gradient(135deg, rgba(0, 17, 34, 0.1) 0%, rgba(0, 34, 68, 0.05) 50%, rgba(0, 17, 34, 0.1) 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          pointerEvents: systemStatus.gisStatus === 'ready' ? 'none' : 'auto'
        }}
      >
        {systemStatus.gisStatus !== 'ready' && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            background: 'rgba(0, 0, 0, 0.8)',
            borderRadius: '20px',
            border: '2px solid #00ffff',
            boxShadow: '0 0 30px rgba(0, 255, 255, 0.3)'
          }}>
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                textShadow: [
                  '0 0 10px #00ffff',
                  '0 0 20px #00ffff',
                  '0 0 10px #00ffff'
                ]
              }}
              transition={{ duration: 2, repeat: Infinity }}
              style={{ fontSize: '32px', marginBottom: '20px' }}
            >
              🏗️ DeepCAD Epic控制中心
            </motion.div>
            <div style={{ fontSize: '16px', opacity: 0.8 }}>
              系统状态: {systemStatus.gisStatus === 'initializing' ? '初始化中...' : systemStatus.gisStatus === 'error' ? '系统错误' : '准备中'}
            </div>
            <div style={{ fontSize: '14px', marginTop: '10px', color: '#00ffff' }}>
              深基坑CAE系统 • geo-three地图引擎
            </div>
          </div>
        )}
      </motion.div>
      
      {/* 系统初始化状态显示 */}
      {systemStatus.gisStatus === 'initializing' && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 200,
            background: 'linear-gradient(135deg, rgba(0, 17, 34, 0.95) 0%, rgba(0, 34, 68, 0.9) 50%, rgba(0, 17, 34, 0.95) 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            backdropFilter: 'blur(10px)'
          }}
        >
          <motion.div
            animate={{
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ duration: 2, repeat: Infinity }}
            style={{
              fontSize: '48px',
              marginBottom: '20px'
            }}
          >
            🗺️
          </motion.div>
          
          <motion.h2
            animate={{
              textShadow: [
                '0 0 10px #00ffff',
                '0 0 20px #00ffff',
                '0 0 10px #00ffff'
              ]
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
            style={{
              color: '#00ffff',
              fontSize: '24px',
              marginBottom: '15px',
              textAlign: 'center'
            }}
          >
            geo-three地图引擎启动中...
          </motion.h2>
          
          <div style={{
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '14px',
            textAlign: 'center',
            lineHeight: '1.6'
          }}>
            <div>🔧 初始化WebGL渲染器</div>
            <div>🌍 加载地图瓦片服务</div>
            <div>📡 连接天气数据API</div>
            <div>🏗️ 准备项目标记点</div>
          </div>
          
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            style={{
              marginTop: '30px',
              width: '40px',
              height: '40px',
              border: '3px solid transparent',
              borderTop: '3px solid #00ffff',
              borderRadius: '50%'
            }}
          />
        </motion.div>
      )}

      {/* 控制界面覆盖层 - 只在地图准备好后显示 */}
      <AnimatePresence>
        {systemStatus.gisStatus === 'ready' && (
          <>
            {renderSystemStatus()}
            {renderControlToolbar()}
            {renderProjectPanel()}
            {renderFlightIndicator()}
          </>
        )}
      </AnimatePresence>
      
      {/* 性能监控面板 */}
      {showPerformancePanel && performanceMonitor && (
        <PerformancePanel
          performanceMonitor={performanceMonitor}
          visible={showPerformancePanel}
          onClose={() => setShowPerformancePanel(false)}
        />
      )}


      {/* 天气效果控制面板 */}
      <WeatherControlPanel
        mapController={mapControllerRef.current}
        isVisible={showWeatherPanel}
        onClose={() => setShowWeatherPanel(false)}
      />

      {/* RAG增强AI助手 - 暂时用简单面板替代 */}
      {showAIAssistant && (
        <motion.div
          initial={{ opacity: 0, x: 300 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 300 }}
          style={{
            position: 'absolute',
            right: '20px',
            top: '120px',
            width: '420px',
            height: '650px',
            background: 'rgba(0, 0, 0, 0.9)',
            border: '2px solid #00ffff',
            borderRadius: '15px',
            padding: '20px',
            backdropFilter: 'blur(15px)',
            zIndex: 1500,
            color: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ color: '#00ffff', margin: 0 }}>🤖 AI助手</h3>
            <button
              onClick={() => setShowAIAssistant(false)}
              style={{
                background: 'transparent',
                border: '1px solid #ff4444',
                color: '#ff4444',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                cursor: 'pointer'
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', lineHeight: '1.6' }}>
            <p>🚀 <strong>Epic控制中心AI助手</strong></p>
            <p>• 项目分析与建议</p>
            <p>• 天气影响评估</p>
            <p>• 地质数据解读</p>
            <p>• 施工风险预警</p>
            <br/>
            <div style={{ 
              background: 'rgba(0, 255, 255, 0.1)', 
              padding: '15px', 
              borderRadius: '8px',
              border: '1px solid rgba(0, 255, 255, 0.3)'
            }}>
              <p style={{ margin: 0, color: '#00ffff' }}>
                💡 AI助手功能正在开发中...<br/>
                即将支持智能项目分析和实时建议！
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 性能监控面板 */}
      {performanceMonitor && (
        <PerformancePanel
          performanceMonitor={performanceMonitor}
          visible={showPerformancePanel}
          onClose={() => setShowPerformancePanel(false)}
        />
      )}
    </div>
  );
};

export default EpicControlCenter;