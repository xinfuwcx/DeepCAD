/**
 * DeepCAD控制中心 v3.0 - 大屏项目管理中心
 * 🚀 高德地图 + Deck.gl 炫酷可视化 + OpenMeteo天气集成
 * 专为大屏显示设计的基坑项目管理系统
 *
 * 功能特性：
 * - 大屏响应式布局 (支持4K显示器)
 * - 高德地图暗色科技风主题
 * - 上千项目的高性能渲染
 * - 实时天气数据集成
 * - 炫酷动画和交互效果
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 高德地图和可视化相关
import AMapLoader from '@amap/amap-jsapi-loader';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, ArcLayer } from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

// 服务和工具
import { openMeteoService, WeatherData } from '../../services/OpenMeteoService';

interface DeepCADControlCenterProps {
  onExit: () => void;
}

interface ExcavationProject {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  type: 'excavation' | 'tunnel' | 'foundation';
  status: 'planning' | 'excavating' | 'supporting' | 'completed' | 'suspended';
  depth: number; // 基坑深度 (米)
  area: number; // 基坑面积 (平方米)
  progress: number; // 进度百分比 (0-100)
  startDate: string;
  estimatedCompletion: string;
  contractor: string; // 承包商
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  weather?: WeatherData; // 当地天气数据
  workers: number; // 现场工人数量
  equipment: string[]; // 设备列表
}

interface SystemStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalDepth: number; // 总挖掘深度
  averageProgress: number;
  criticalAlerts: number;
}

export const DeepCADControlCenter: React.FC<DeepCADControlCenterProps> = ({ onExit }) => {
  // 地图容器引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // 高德地图实例
  const deckRef = useRef<Deck | null>(null);

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedProject, setSelectedProject] = useState<ExcavationProject | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [isFlying, setIsFlying] = useState(false);
  const [showWeatherPanel, setShowWeatherPanel] = useState(true);
  const [showProjectDetails, setShowProjectDetails] = useState(false);
  const [weatherDataMap, setWeatherDataMap] = useState<Map<string, WeatherData>>(new Map());
  const [systemStats, setSystemStats] = useState<SystemStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalDepth: 0,
    averageProgress: 0,
    criticalAlerts: 0
  });
  const [performanceStats, setPerformanceStats] = useState({
    fps: 0,
    memoryUsage: 0,
    renderTime: 0
  });

  // 生成示例项目数据 - 模拟真实的基坑项目分布
  const generateProjects = useCallback((): ExcavationProject[] => {
    const cities = [
      { name: '北京', lat: 39.9042, lng: 116.4074, projects: 150 },
      { name: '上海', lat: 31.2304, lng: 121.4737, projects: 200 },
      { name: '广州', lat: 23.1291, lng: 113.2644, projects: 120 },
      { name: '深圳', lat: 22.5431, lng: 114.0579, projects: 180 },
      { name: '杭州', lat: 30.2741, lng: 120.1551, projects: 100 },
      { name: '南京', lat: 32.0603, lng: 118.7969, projects: 80 },
      { name: '武汉', lat: 30.5928, lng: 114.3055, projects: 90 },
      { name: '成都', lat: 30.5728, lng: 104.0668, projects: 110 }
    ];

    const projectTypes = ['excavation', 'tunnel', 'foundation'] as const;
    const statuses = ['planning', 'excavating', 'supporting', 'completed', 'suspended'] as const;
    const riskLevels = ['low', 'medium', 'high', 'critical'] as const;
    const contractors = ['中建集团', '中铁建设', '中交建设', '上海建工', '北京建工', '广州建设'];

    const projects: ExcavationProject[] = [];
    let projectId = 1;

    cities.forEach(city => {
      for (let i = 0; i < city.projects; i++) {
        // 在城市周围随机分布项目
        const latOffset = (Math.random() - 0.5) * 0.5; // ±0.25度范围
        const lngOffset = (Math.random() - 0.5) * 0.5;

        projects.push({
          id: `project-${projectId++}`,
          name: `${city.name}${projectTypes[Math.floor(Math.random() * projectTypes.length)] === 'excavation' ? '深基坑' :
                 projectTypes[Math.floor(Math.random() * projectTypes.length)] === 'tunnel' ? '隧道' : '地基'}工程-${i + 1}`,
          location: {
            lat: city.lat + latOffset,
            lng: city.lng + lngOffset
          },
          type: projectTypes[Math.floor(Math.random() * projectTypes.length)],
          status: statuses[Math.floor(Math.random() * statuses.length)],
          depth: Math.round(5 + Math.random() * 45), // 5-50米深度
          area: Math.round(100 + Math.random() * 4900), // 100-5000平方米
          progress: Math.round(Math.random() * 100),
          startDate: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          estimatedCompletion: new Date(2025, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString().split('T')[0],
          contractor: contractors[Math.floor(Math.random() * contractors.length)],
          riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)],
          workers: Math.round(10 + Math.random() * 90), // 10-100人
          equipment: ['挖掘机', '塔吊', '混凝土泵车'].slice(0, Math.floor(Math.random() * 3) + 1)
        });
      }
    });

    return projects;
  }, []);

  const projects = useMemo(() => generateProjects(), [generateProjects]);

  // 过滤和搜索项目
  const filteredProjects = useMemo(() => {
    return projects.filter(project => {
      // 搜索过滤
      const matchesSearch = searchTerm === '' ||
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.contractor.toLowerCase().includes(searchTerm.toLowerCase());

      // 状态过滤
      const matchesStatus = statusFilter === 'all' || project.status === statusFilter;

      // 风险等级过滤
      const matchesRisk = riskFilter === 'all' || project.riskLevel === riskFilter;

      return matchesSearch && matchesStatus && matchesRisk;
    });
  }, [projects, searchTerm, statusFilter, riskFilter]);

  // 计算系统统计数据
  useEffect(() => {
    const stats: SystemStats = {
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status === 'excavating' || p.status === 'supporting').length,
      completedProjects: projects.filter(p => p.status === 'completed').length,
      totalDepth: projects.reduce((sum, p) => sum + p.depth, 0),
      averageProgress: Math.round(projects.reduce((sum, p) => sum + p.progress, 0) / projects.length),
      criticalAlerts: projects.filter(p => p.riskLevel === 'critical').length
    };
    setSystemStats(stats);
  }, [projects]);

  /**
   * 初始化高德地图 - 暗色科技风主题
   */
  const initializeMap = useCallback(async () => {
    if (!mapContainerRef.current || mapRef.current) return;

    try {
      console.log('🗺️ 初始化高德地图大屏版...');

      // 加载高德地图JS API
      const AMap = await AMapLoader.load({
        key: import.meta.env.VITE_AMAP_API_KEY || '4a7c8d1adf162d30d8a29941ee5de12f', // 高德地图API Key
        version: '2.0',
        plugins: [
          'AMap.Scale',
          'AMap.ToolBar',
          'AMap.MapType',
          'AMap.Geolocation',
          'AMap.Marker',
          'AMap.InfoWindow'
        ]
      });

      // 创建高德地图实例 - 暗色科技风配置
      const map = new AMap.Map(mapContainerRef.current, {
        center: [116.4074, 39.9042], // 北京中心
        zoom: 6, // 适合全国项目展示的缩放级别
        pitch: 0, // 平面视角，适合大屏展示
        viewMode: '2D', // 2D视图，性能更好
        mapStyle: 'amap://styles/dark', // 暗色主题
        showLabel: true,
        showIndoorMap: false,
        features: ['bg', 'road', 'building', 'point'],
        // 自定义样式
        customMapStyle: {
          styleId: 'dark',
          styleJson: [
            {
              featureType: 'background',
              elementType: 'geometry',
              stylers: { color: '#0a0a0a' }
            },
            {
              featureType: 'road',
              elementType: 'geometry',
              stylers: { color: '#1a1a1a' }
            },
            {
              featureType: 'water',
              elementType: 'geometry',
              stylers: { color: '#001122' }
            }
          ]
        }
      });

      mapRef.current = map;

      // 添加地图控件 - 最小化UI
      const scale = new AMap.Scale({ position: 'LB' });
      map.addControl(scale);

      console.log('✅ 高德地图暗色主题加载完成');

      // 初始化Deck.gl可视化层
      await initializeDeck();

      // 暂时禁用天气数据加载，避免API限制
      // await loadProjectsWeatherData();
      console.log('⚠️ 天气数据加载已禁用，避免API频率限制');

      // 设置默认选中项目
      if (filteredProjects.length > 0) {
        setSelectedProject(filteredProjects[0]);
      }

      setIsInitialized(true);
      console.log('🚀 大屏项目管理中心初始化完成');

    } catch (error) {
      console.error('❌ 地图初始化失败:', error);
      // 创建科技风备用界面
      if (mapContainerRef.current) {
        mapContainerRef.current.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: radial-gradient(circle at center, #001122 0%, #000000 100%);
            color: #00ffff;
            text-align: center;
            font-family: 'Courier New', monospace;
          ">
            <div>
              <div style="font-size: 64px; margin-bottom: 20px; animation: pulse 2s infinite;">🗺️</div>
              <div style="font-size: 24px; margin-bottom: 10px; text-shadow: 0 0 10px #00ffff;">地图引擎离线</div>
              <div style="font-size: 16px; opacity: 0.7;">正在尝试重新连接...</div>
              <div style="margin-top: 20px; font-size: 12px; opacity: 0.5;">DeepCAD控制中心 v3.0</div>
            </div>
          </div>
        `;
      }
    }
  }, [filteredProjects]);

  /**
   * 获取项目状态颜色
   */
  const getProjectStatusColor = useCallback((project: ExcavationProject): [number, number, number, number] => {
    const baseColors = {
      planning: [100, 200, 255, 200],     // 蓝色 - 规划中
      excavating: [255, 150, 50, 220],    // 橙色 - 挖掘中
      supporting: [255, 200, 0, 220],     // 黄色 - 支护中
      completed: [100, 255, 100, 200],    // 绿色 - 已完成
      suspended: [150, 150, 150, 180]     // 灰色 - 暂停
    };

    let color = baseColors[project.status] || [255, 255, 255, 200];

    // 根据风险等级调整颜色
    if (project.riskLevel === 'critical') {
      color = [255, 50, 50, 255]; // 红色警告
    } else if (project.riskLevel === 'high') {
      color[0] = Math.min(255, color[0] + 50); // 增加红色分量
    }

    // 选中项目高亮
    if (selectedProject?.id === project.id) {
      return [0, 255, 255, 255]; // 青色高亮
    }

    return color as [number, number, number, number];
  }, [selectedProject]);

  /**
   * 初始化Deck.gl可视化层 - 基坑项目专用
   */
  const initializeDeck = async () => {
    try {
      console.log('🎨 初始化基坑项目可视化层...');

      // 创建Deck.gl实例，覆盖在高德地图上
      const deck = new Deck({
        canvas: 'deck-canvas',
        width: '100%',
        height: '100%',
        initialViewState: {
          longitude: 116.4074,
          latitude: 39.9042,
          zoom: 6,
          pitch: 0,
          bearing: 0
        },
        controller: false, // 禁用Deck.gl控制器，使用高德地图的控制器
        layers: [
          // 基坑项目散点图层
          new ScatterplotLayer({
            id: 'excavation-projects',
            data: filteredProjects,
            getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
            getRadius: (d: ExcavationProject) => {
              // 根据基坑深度和面积计算显示大小
              const depthFactor = Math.log(d.depth + 1) * 500;
              const areaFactor = Math.log(d.area + 1) * 200;
              return Math.max(depthFactor, areaFactor);
            },
            getFillColor: getProjectStatusColor,
            getLineColor: [255, 255, 255, 150],
            getLineWidth: 2,
            stroked: true,
            filled: true,
            radiusScale: 1,
            radiusMinPixels: 8,
            radiusMaxPixels: 50,
            pickable: true,
            onClick: (info) => {
              if (info.object) {
                const project = info.object as ExcavationProject;
                setSelectedProject(project);
                setShowProjectDetails(true);
                console.log('🎯 选中项目:', project.name);
              }
            },
            onHover: (info) => {
              // 悬停效果可以在这里添加
            },
            updateTriggers: {
              getFillColor: [selectedProject?.id],
              data: [filteredProjects]
            }
          }),

          // 风险等级热力图
          new HeatmapLayer({
            id: 'risk-heatmap',
            data: filteredProjects.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical'),
            getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
            getWeight: (d: ExcavationProject) => d.riskLevel === 'critical' ? 2 : 1,
            radiusPixels: 100,
            intensity: 0.3,
            threshold: 0.1,
            colorRange: [
              [255, 255, 0, 50],   // 黄色
              [255, 150, 0, 100],  // 橙色
              [255, 50, 0, 150]    // 红色
            ]
          })
        ]
      });

      deckRef.current = deck;

      // 同步高德地图和Deck.gl的视图状态
      if (mapRef.current) {
        mapRef.current.on('mapmove', () => {
          syncMapView();
        });
        mapRef.current.on('zoomchange', () => {
          syncMapView();
        });
        mapRef.current.on('rotatechange', () => {
          syncMapView();
        });
      }

      console.log('✅ 基坑项目可视化层初始化完成');

    } catch (error) {
      console.error('❌ Deck.gl初始化失败:', error);
    }
  };

  /**
   * 同步高德地图和Deck.gl的视图状态
   */
  const syncMapView = useCallback(() => {
    if (!mapRef.current || !deckRef.current) return;

    try {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
      const pitch = mapRef.current.getPitch() || 0;
      const rotation = mapRef.current.getRotation() || 0;

      deckRef.current.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: zoom,
          pitch: pitch,
          bearing: -rotation // 高德地图的旋转方向与Deck.gl相反
        }
      });
    } catch (error) {
      console.warn('地图视图同步失败:', error);
    }
  }, []);

  /**
   * 重置地图视图到全国范围
   */
  const resetMapView = useCallback(() => {
    if (!mapRef.current) return;

    mapRef.current.setZoomAndCenter(6, [116.4074, 39.9042], false, 1000);
    setSelectedProject(null);
    setShowProjectDetails(false);
  }, []);

  /**
   * 获取项目统计信息
   */
  const getProjectStats = useCallback(() => {
    const stats = {
      byStatus: {
        planning: projects.filter(p => p.status === 'planning').length,
        excavating: projects.filter(p => p.status === 'excavating').length,
        supporting: projects.filter(p => p.status === 'supporting').length,
        completed: projects.filter(p => p.status === 'completed').length,
        suspended: projects.filter(p => p.status === 'suspended').length
      },
      byRisk: {
        low: projects.filter(p => p.riskLevel === 'low').length,
        medium: projects.filter(p => p.riskLevel === 'medium').length,
        high: projects.filter(p => p.riskLevel === 'high').length,
        critical: projects.filter(p => p.riskLevel === 'critical').length
      },
      totalWorkers: projects.reduce((sum, p) => sum + p.workers, 0),
      averageDepth: Math.round(projects.reduce((sum, p) => sum + p.depth, 0) / projects.length),
      totalArea: projects.reduce((sum, p) => sum + p.area, 0)
    };
    return stats;
  }, [projects]);

  /**
   * 批量加载项目天气数据 - 优化性能
   */
  const loadProjectsWeatherData = useCallback(async () => {
    console.log('🌤️ 开始批量加载天气数据...');

    try {
      const weatherMap = new Map<string, WeatherData>();

      // 分批处理，避免API限制
      const batchSize = 10;
      const batches = [];

      for (let i = 0; i < projects.length; i += batchSize) {
        batches.push(projects.slice(i, i + batchSize));
      }

      let loadedCount = 0;

      for (const batch of batches) {
        const promises = batch.map(async (project) => {
          try {
            const weather = await openMeteoService.getWeatherData(
              project.location.lat,
              project.location.lng
            );
            weatherMap.set(project.id, weather);
            loadedCount++;

            // 更新进度
            if (loadedCount % 50 === 0) {
              console.log(`🌤️ 已加载 ${loadedCount}/${projects.length} 个项目的天气数据`);
            }
          } catch (error) {
            // 使用默认天气数据
            weatherMap.set(project.id, {
              location: { latitude: project.location.lat, longitude: project.location.lng },
              current: {
                temperature: 20 + Math.random() * 15,
                humidity: 50 + Math.random() * 30,
                windSpeed: Math.round(5 + Math.random() * 15),
                windDirection: Math.round(Math.random() * 360),
                pressure: 1013,
                weatherCode: 0,
                description: '晴朗',
                icon: '☀️'
              },
              lastUpdated: new Date()
            });
          }
        });

        await Promise.all(promises);

        // 避免API频率限制
        if (batches.indexOf(batch) < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      setWeatherDataMap(weatherMap);
      console.log(`✅ 天气数据加载完成: ${weatherMap.size}/${projects.length} 个项目`);

    } catch (error) {
      console.error('❌ 批量天气数据加载失败:', error);
    }
  }, [projects]);

  /**
   * 飞行到指定项目 - 带炫酷动画
   */
  const flyToProject = useCallback((project: ExcavationProject) => {
    if (!mapRef.current || isFlying) return;

    console.log(`✈️ 飞行到项目: ${project.name}`);
    setIsFlying(true);

    // 计算合适的缩放级别
    const zoomLevel = project.area > 1000 ? 14 : 16;

    // 使用高德地图的平滑飞行动画
    mapRef.current.setZoomAndCenter(
      zoomLevel,
      [project.location.lng, project.location.lat],
      false,
      2500 // 2.5秒动画
    );

    // 更新选中项目
    setSelectedProject(project);
    setShowProjectDetails(true);

    // 飞行完成后的回调
    setTimeout(() => {
      setIsFlying(false);
      console.log(`🎯 已到达项目: ${project.name}`);
    }, 2500);

    // 更新Deck.gl图层以高亮选中项目
    if (deckRef.current) {
      // 重新创建图层以触发更新
      initializeDeck();
    }

  }, [isFlying, initializeDeck]);

  // 组件挂载时初始化
  useEffect(() => {
    const initSystem = async () => {
      try {
        await initializeMap();
        console.log('🎉 大屏项目管理中心启动完成');
      } catch (error) {
        console.error('❌ 系统初始化失败:', error);
      }
    };

    initSystem();

    return () => {
      // 清理资源
      console.log('🧹 清理系统资源...');

      if (deckRef.current) {
        try {
          deckRef.current.finalize();
        } catch (error) {
          console.warn('Deck.gl清理失败:', error);
        }
      }

      if (mapRef.current) {
        try {
          mapRef.current.destroy();
        } catch (error) {
          console.warn('地图清理失败:', error);
        }
      }
    };
  }, [initializeMap]);

  // 监听过滤条件变化，更新Deck.gl图层
  useEffect(() => {
    if (deckRef.current && isInitialized) {
      // 重新初始化Deck.gl图层以反映过滤后的数据
      initializeDeck();
    }
  }, [filteredProjects, isInitialized, initializeDeck]);

  // 性能优化：防抖更新地图视图
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const debouncedSync = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        syncMapView();
      }, 100);
    };

    if (mapRef.current) {
      mapRef.current.on('mapmove', debouncedSync);
      mapRef.current.on('zoomchange', debouncedSync);
    }

    return () => {
      clearTimeout(timeoutId);
    };
  }, [syncMapView]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // ESC键退出
      if (event.key === 'Escape') {
        onExit();
      }

      // 空格键重置视图
      if (event.key === ' ') {
        event.preventDefault();
        resetMapView();
      }

      // F键全屏切换
      if (event.key === 'f' || event.key === 'F') {
        if (document.fullscreenElement) {
          document.exitFullscreen();
        } else {
          document.documentElement.requestFullscreen();
        }
      }

      // 数字键快速缩放
      if (event.key >= '1' && event.key <= '9') {
        const zoomLevel = parseInt(event.key) + 5; // 6-14级缩放
        mapRef.current?.setZoom(zoomLevel);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onExit, resetMapView]);

  // 性能监控
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();
    let animationId: number;

    const updatePerformanceStats = () => {
      frameCount++;
      const currentTime = performance.now();

      // 每秒更新一次性能统计
      if (currentTime - lastTime >= 1000) {
        const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));

        // 获取内存使用情况（如果浏览器支持）
        const memoryUsage = (performance as any).memory
          ? Math.round((performance as any).memory.usedJSHeapSize / 1024 / 1024)
          : 0;

        setPerformanceStats({
          fps,
          memoryUsage,
          renderTime: Math.round(currentTime - lastTime)
        });

        frameCount = 0;
        lastTime = currentTime;
      }

      animationId = requestAnimationFrame(updatePerformanceStats);
    };

    if (isInitialized) {
      updatePerformanceStats();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isInitialized]);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'radial-gradient(circle at center, #001122 0%, #000000 100%)',
      overflow: 'hidden',
      fontFamily: '"Courier New", monospace'
    }}>
      {/* 地图容器 - 占据中央50%区域 */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          left: '25%',
          top: '5%',
          width: '50%',
          height: '85%',
          border: '2px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '10px',
          overflow: 'hidden'
        }}
      />

      {/* Deck.gl画布 - 覆盖在地图上 */}
      <canvas
        id="deck-canvas"
        style={{
          position: 'absolute',
          left: '25%',
          top: '5%',
          width: '50%',
          height: '85%',
          pointerEvents: 'none',
          borderRadius: '10px'
        }}
      />

      {/* 顶部状态栏 - 大屏设计 */}
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '5%',
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(0, 0, 0, 0.9) 100%)',
          backdropFilter: 'blur(10px)',
          borderBottom: '2px solid rgba(0, 255, 255, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 2%',
          zIndex: 2000
        }}
      >
        {/* 左侧 - 系统标题 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10
          }}>
            <div style={{
              width: 32,
              height: 32,
              background: 'linear-gradient(45deg, #00ffff, #0080ff)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16
            }}>
              🏗️
            </div>
            <div>
              <div style={{ color: '#00ffff', fontSize: 16, fontWeight: 'bold' }}>
                DeepCAD 基坑项目管理中心
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: 10 }}>
                大屏可视化系统 v3.0
              </div>
            </div>
          </div>

          {/* 系统时间 */}
          <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
            {new Date().toLocaleString('zh-CN')}
          </div>
        </div>

        {/* 中央 - 系统统计 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 30 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ffff', fontSize: 18, fontWeight: 'bold' }}>
              {systemStats.totalProjects}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10 }}>
              总项目数
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ff00', fontSize: 18, fontWeight: 'bold' }}>
              {systemStats.activeProjects}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10 }}>
              进行中
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ffff00', fontSize: 18, fontWeight: 'bold' }}>
              {systemStats.criticalAlerts}
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10 }}>
              高风险
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff8800', fontSize: 18, fontWeight: 'bold' }}>
              {systemStats.averageProgress}%
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: 10 }}>
              平均进度
            </div>
          </div>
        </div>

        {/* 右侧 - 快捷键提示和系统状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {/* 快捷键提示 */}
          <div style={{ fontSize: 10, color: 'rgba(255, 255, 255, 0.6)' }}>
            <div>ESC:退出 | 空格:重置 | F:全屏</div>
            <div>1-9:缩放级别 | 点击:选择项目</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isInitialized ? '#00ff00' : '#ffff00',
              boxShadow: `0 0 10px ${isInitialized ? '#00ff00' : '#ffff00'}`
            }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 12 }}>
              {isInitialized ? '系统就绪' : '初始化中'}
            </span>
          </div>

          <button
            onClick={onExit}
            style={{
              background: 'rgba(255, 100, 100, 0.2)',
              border: '1px solid rgba(255, 100, 100, 0.5)',
              borderRadius: 6,
              color: '#ff6464',
              padding: '6px 12px',
              cursor: 'pointer',
              fontSize: 12,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 100, 100, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 100, 100, 0.2)';
            }}
          >
            退出系统
          </button>
        </div>
      </motion.div>

      {/* 左侧项目面板 - 大屏设计 */}
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: 0,
          top: '5%',
          width: '25%',
          height: '95%',
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(0, 0, 0, 0.9) 100%)',
          backdropFilter: 'blur(15px)',
          borderRight: '2px solid rgba(0, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1500
        }}
      >
        {/* 搜索和过滤区域 */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
          <h3 style={{ color: '#00ffff', margin: '0 0 15px 0', fontSize: 18, textAlign: 'center' }}>
            🏗️ 项目管理中心
          </h3>

          {/* 搜索框 */}
          <input
            type="text"
            placeholder="搜索项目名称或承包商..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '8px',
              color: '#fff',
              fontSize: '12px',
              marginBottom: '10px',
              outline: 'none'
            }}
          />

          {/* 过滤器 */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '6px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px'
              }}
            >
              <option value="all">全部状态</option>
              <option value="planning">规划中</option>
              <option value="excavating">挖掘中</option>
              <option value="supporting">支护中</option>
              <option value="completed">已完成</option>
              <option value="suspended">暂停</option>
            </select>

            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              style={{
                flex: 1,
                padding: '6px',
                background: 'rgba(0, 0, 0, 0.5)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '11px'
              }}
            >
              <option value="all">全部风险</option>
              <option value="low">低风险</option>
              <option value="medium">中风险</option>
              <option value="high">高风险</option>
              <option value="critical">严重风险</option>
            </select>
          </div>

          {/* 统计信息 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '11px',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            <span>显示: {filteredProjects.length}</span>
            <span>总计: {projects.length}</span>
          </div>
        </div>

        {/* 项目列表 - 可滚动 */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px',
          scrollbarWidth: 'thin',
          scrollbarColor: 'rgba(0, 255, 255, 0.3) transparent'
        }}>
          {filteredProjects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.02, x: 5 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => flyToProject(project)}
              style={{
                background: selectedProject?.id === project.id
                  ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.3), rgba(0, 150, 255, 0.2))'
                  : 'rgba(255, 255, 255, 0.05)',
                border: selectedProject?.id === project.id
                  ? '2px solid rgba(0, 255, 255, 0.6)'
                  : '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative'
              }}
            >
              {/* 项目基本信息 */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                <div style={{ color: '#fff', fontSize: '13px', fontWeight: 'bold', flex: 1 }}>
                  {project.name}
                </div>
                <div style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: project.riskLevel === 'critical' ? 'rgba(255, 0, 0, 0.3)' :
                             project.riskLevel === 'high' ? 'rgba(255, 100, 0, 0.3)' :
                             project.riskLevel === 'medium' ? 'rgba(255, 255, 0, 0.3)' : 'rgba(0, 255, 0, 0.3)',
                  color: '#fff'
                }}>
                  {project.riskLevel === 'critical' ? '🔴' :
                   project.riskLevel === 'high' ? '🟠' :
                   project.riskLevel === 'medium' ? '🟡' : '🟢'}
                </div>
              </div>

              {/* 项目详情 */}
              <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '6px' }}>
                <div>📍 深度: {project.depth}m | 面积: {project.area}m²</div>
                <div>👷 工人: {project.workers}人 | 进度: {project.progress}%</div>
                <div>🏢 {project.contractor}</div>
              </div>

              {/* 状态指示 */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px'
              }}>
                <span style={{
                  color: project.status === 'excavating' ? '#ff8800' :
                         project.status === 'supporting' ? '#ffff00' :
                         project.status === 'completed' ? '#00ff00' :
                         project.status === 'planning' ? '#0080ff' : '#888888'
                }}>
                  {project.status === 'excavating' ? '🚧 挖掘中' :
                   project.status === 'supporting' ? '🏗️ 支护中' :
                   project.status === 'completed' ? '✅ 已完成' :
                   project.status === 'planning' ? '📋 规划中' : '⏸️ 暂停'}
                </span>

                {/* 进度条 */}
                <div style={{
                  width: '60px',
                  height: '4px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${project.progress}%`,
                    height: '100%',
                    background: 'linear-gradient(90deg, #00ffff, #0080ff)',
                    borderRadius: '2px'
                  }} />
                </div>
              </div>

              {/* 选中指示器 */}
              {selectedProject?.id === project.id && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#00ffff',
                    boxShadow: '0 0 10px #00ffff'
                  }}
                />
              )}
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* 右侧控制面板 - 大屏设计 */}
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        style={{
          position: 'absolute',
          right: 0,
          top: '5%',
          width: '25%',
          height: '95%',
          background: 'linear-gradient(180deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(0, 0, 0, 0.9) 100%)',
          backdropFilter: 'blur(15px)',
          borderLeft: '2px solid rgba(0, 255, 255, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1500
        }}
      >
        {/* 选中项目详情 */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
          <h3 style={{ color: '#00ffff', margin: '0 0 15px 0', fontSize: 18, textAlign: 'center' }}>
            📊 项目详情
          </h3>

          {selectedProject ? (
            <motion.div
              key={selectedProject.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: 'rgba(0, 255, 255, 0.1)',
                border: '1px solid rgba(0, 255, 255, 0.3)',
                borderRadius: '10px',
                padding: '15px'
              }}
            >
              <div style={{ color: '#fff', fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                {selectedProject.name}
              </div>

              <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.6 }}>
                <div style={{ marginBottom: '8px' }}>
                  📍 位置: {selectedProject.location.lat.toFixed(4)}, {selectedProject.location.lng.toFixed(4)}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  🏗️ 类型: {selectedProject.type === 'excavation' ? '深基坑' :
                           selectedProject.type === 'tunnel' ? '隧道' : '地基工程'}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  📏 深度: {selectedProject.depth}米 | 面积: {selectedProject.area}平方米
                </div>
                <div style={{ marginBottom: '8px' }}>
                  👷 现场工人: {selectedProject.workers}人
                </div>
                <div style={{ marginBottom: '8px' }}>
                  🏢 承包商: {selectedProject.contractor}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  📅 开始: {selectedProject.startDate}
                </div>
                <div style={{ marginBottom: '8px' }}>
                  🎯 预计完成: {selectedProject.estimatedCompletion}
                </div>

                {/* 进度条 */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px' }}>项目进度</span>
                    <span style={{ fontSize: '11px', color: '#00ffff' }}>{selectedProject.progress}%</span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.2)',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedProject.progress}%` }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      style={{
                        height: '100%',
                        background: 'linear-gradient(90deg, #00ffff, #0080ff)',
                        borderRadius: '3px'
                      }}
                    />
                  </div>
                </div>

                {/* 设备列表 */}
                <div style={{ marginTop: '12px' }}>
                  <div style={{ fontSize: '11px', marginBottom: '4px' }}>🚜 设备:</div>
                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.7)' }}>
                    {selectedProject.equipment.join(', ')}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <div style={{
              textAlign: 'center',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '14px',
              padding: '40px 20px'
            }}>
              点击地图上的项目点位<br/>查看详细信息
            </div>
          )}
        </div>

        {/* 天气信息 */}
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(0, 255, 255, 0.2)' }}>
          <h4 style={{ color: '#00ffff', margin: '0 0 10px 0', fontSize: 16 }}>
            🌤️ 当地天气
          </h4>

          {selectedProject && weatherDataMap.has(selectedProject.id) ? (
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.5 }}>
              {(() => {
                const weather = weatherDataMap.get(selectedProject.id)!;
                return (
                  <>
                    <div style={{ marginBottom: '6px' }}>
                      🌡️ 温度: {weather.current.temperature}°C
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      💨 风速: {weather.current.windSpeed} km/h
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      💧 湿度: {weather.current.humidity}%
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      📊 气压: {weather.current.pressure} hPa
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                      {weather.current.description} {weather.current.icon}
                    </div>
                  </>
                );
              })()}
            </div>
          ) : (
            <div style={{
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '12px',
              textAlign: 'center',
              padding: '20px 0'
            }}>
              选择项目查看天气信息
            </div>
          )}
        </div>

        {/* 图层控制 */}
        <div style={{ padding: '20px', flex: 1 }}>
          <h4 style={{ color: '#00ffff', margin: '0 0 15px 0', fontSize: 16 }}>
            🎛️ 显示控制
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showWeatherPanel}
                onChange={(e) => setShowWeatherPanel(e.target.checked)}
                style={{ accentColor: '#00ffff' }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                显示天气数据
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showProjectDetails}
                onChange={(e) => setShowProjectDetails(e.target.checked)}
                style={{ accentColor: '#00ffff' }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                显示项目详情
              </span>
            </label>

            <div style={{ marginTop: '20px' }}>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '8px' }}>
                地图缩放级别
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.6)'
              }}>
                <button
                  onClick={() => mapRef.current?.setZoom(6)}
                  style={{
                    background: 'rgba(0, 255, 255, 0.2)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  全国
                </button>
                <button
                  onClick={() => mapRef.current?.setZoom(10)}
                  style={{
                    background: 'rgba(0, 255, 255, 0.2)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  城市
                </button>
                <button
                  onClick={() => mapRef.current?.setZoom(15)}
                  style={{
                    background: 'rgba(0, 255, 255, 0.2)',
                    border: '1px solid rgba(0, 255, 255, 0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px'
                  }}
                >
                  详细
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* 底部状态栏 - 大屏设计 */}
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.4 }}
        style={{
          position: 'absolute',
          bottom: 0,
          left: '25%',
          width: '50%',
          height: '10%',
          background: 'linear-gradient(90deg, rgba(0, 0, 0, 0.9) 0%, rgba(0, 20, 40, 0.9) 50%, rgba(0, 0, 0, 0.9) 100%)',
          backdropFilter: 'blur(15px)',
          borderTop: '2px solid rgba(0, 255, 255, 0.3)',
          borderLeft: '2px solid rgba(0, 255, 255, 0.3)',
          borderRight: '2px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '10px 10px 0 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 1500
        }}
      >
        {/* 左侧 - 系统状态 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div>
            <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '2px' }}>
              🎮 系统状态
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span style={{ marginRight: '15px' }}>
                🗺️ 地图: {isInitialized ? '✅' : '⏳'}
              </span>
              <span style={{ marginRight: '15px' }}>
                🎨 可视化: {deckRef.current ? '✅' : '⏳'}
              </span>
              <span style={{ marginRight: '15px' }}>
                🌤️ 天气: {weatherDataMap.size > 0 ? '✅' : '⏳'}
              </span>
            </div>
          </div>
        </div>

        {/* 中央 - 选中项目信息 */}
        {selectedProject && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: '8px',
              padding: '10px 15px',
              textAlign: 'center'
            }}
          >
            <div style={{ color: '#00ffff', fontSize: '12px', fontWeight: 'bold', marginBottom: '2px' }}>
              当前选中项目
            </div>
            <div style={{ color: '#fff', fontSize: '11px', marginBottom: '2px' }}>
              {selectedProject.name}
            </div>
            <div style={{ fontSize: '9px', color: 'rgba(255, 255, 255, 0.7)' }}>
              深度: {selectedProject.depth}m | 进度: {selectedProject.progress}% |
              风险: {selectedProject.riskLevel === 'critical' ? '🔴严重' :
                    selectedProject.riskLevel === 'high' ? '🟠高' :
                    selectedProject.riskLevel === 'medium' ? '🟡中' : '🟢低'}
            </div>
          </motion.div>
        )}

        {/* 右侧 - 性能监控和数据统计 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div>
            <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '2px' }}>
              📊 实时数据
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
              <span style={{ marginRight: '15px' }}>
                显示: {filteredProjects.length}/{projects.length}
              </span>
              <span style={{ marginRight: '15px' }}>
                总深度: {systemStats.totalDepth}m
              </span>
              <span>
                更新: {new Date().toLocaleTimeString('zh-CN')}
              </span>
            </div>
          </div>

          {/* 性能监控 */}
          {isInitialized && (
            <div>
              <div style={{ color: '#00ffff', fontSize: '12px', marginBottom: '2px' }}>
                ⚡ 性能监控
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.8)' }}>
                <span style={{ marginRight: '15px' }}>
                  FPS: {performanceStats.fps}
                </span>
                <span style={{ marginRight: '15px' }}>
                  内存: {performanceStats.memoryUsage}MB
                </span>
                <span style={{
                  color: performanceStats.fps < 30 ? '#ff6464' :
                         performanceStats.fps < 50 ? '#ffff00' : '#00ff00'
                }}>
                  {performanceStats.fps < 30 ? '🔴' :
                   performanceStats.fps < 50 ? '🟡' : '🟢'}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* 飞行动画指示器 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(20px)',
              border: '2px solid rgba(0, 255, 255, 0.5)',
              borderRadius: '15px',
              padding: '20px',
              textAlign: 'center',
              zIndex: 3000
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
              style={{ fontSize: '32px', marginBottom: '10px' }}
            >
              ✈️
            </motion.div>
            <div style={{ color: '#00ffff', fontSize: '16px', fontWeight: 'bold', marginBottom: '5px' }}>
              正在飞行到目标项目
            </div>
            <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px' }}>
              {selectedProject?.name}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 加载指示器 */}
      <AnimatePresence>
        {!isInitialized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 4000
            }}
          >
            <div style={{ textAlign: 'center' }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                style={{ fontSize: '64px', marginBottom: '20px' }}
              >
                🌍
              </motion.div>
              <div style={{ color: '#00ffff', fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
                DeepCAD控制中心初始化中...
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>
                正在加载地图引擎和可视化系统
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
