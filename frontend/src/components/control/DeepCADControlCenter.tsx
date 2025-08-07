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

// 超级炫酷的CSS动画样式
const dreamyStyles = `
  @keyframes dreamyBackground {
    0% { filter: brightness(1); }
    50% { filter: brightness(1.05); }
    100% { filter: brightness(1); }
  }

  @keyframes particleFloat {
    0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
    10% { opacity: 1; }
    90% { opacity: 1; }
    100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
  }

  @keyframes neonGlow {
    0%, 100% {
      box-shadow: 0 0 8px rgba(0, 170, 255, 0.6);
      border-color: rgba(0, 170, 255, 0.8);
    }
  }

  @keyframes dataFlow {
    0% { transform: translateX(-100%); opacity: 0; }
    50% { opacity: 1; }
    100% { transform: translateX(100vw); opacity: 0; }
  }

  @keyframes hologramFlicker {
    0%, 100% { opacity: 0.95; }
  }

  .particle {
    position: absolute;
    width: 2px;
    height: 2px;
    background: radial-gradient(circle, #00ffff 0%, transparent 70%);
    border-radius: 50%;
    animation: particleFloat linear infinite;
    pointer-events: none;
  }

  .neon-border {
    animation: neonGlow 2s ease-in-out infinite alternate;
    border: 1px solid rgba(0, 255, 255, 0.5);
  }

  .data-stream {
    position: absolute;
    height: 1px;
    background: linear-gradient(90deg, transparent 0%, #00ffff 50%, transparent 100%);
    animation: dataFlow 3s linear infinite;
    pointer-events: none;
  }

  .hologram-effect {
    animation: hologramFlicker 0.1s ease-in-out infinite;
    background: linear-gradient(45deg, rgba(0, 255, 255, 0.1) 0%, rgba(255, 0, 255, 0.1) 100%);
  }
`;

// 注入样式到页面
if (typeof document !== 'undefined' && !document.getElementById('dreamy-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'dreamy-styles';
  styleSheet.textContent = dreamyStyles;
  document.head.appendChild(styleSheet);
}

// 高德地图和可视化相关
import AMapLoader from '@amap/amap-jsapi-loader';
import { Deck } from '@deck.gl/core';
import {
  ScatterplotLayer,
  ArcLayer,
  ColumnLayer,
  LineLayer,
  IconLayer,
  TextLayer
} from '@deck.gl/layers';
import { HeatmapLayer } from '@deck.gl/aggregation-layers';

// 服务和工具
import { amapWeatherService, WeatherData } from '../../services/AmapWeatherService';

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
  const [mapError, setMapError] = useState<string | null>(null);
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
  const [is3DMode, setIs3DMode] = useState(true);
  const [currentPitch, setCurrentPitch] = useState(30);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);

  // 生成粒子效果
  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 10
      }));
      setParticles(newParticles);
    };

    generateParticles();
    const interval = setInterval(generateParticles, 15000); // 每15秒重新生成粒子
    return () => clearInterval(interval);
  }, []);

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
        version: '2.0', // 使用最新版本
        plugins: [
          'AMap.Scale',
          'AMap.ToolBar',
          'AMap.MapType',
          'AMap.Geolocation',
          'AMap.Marker',
          'AMap.InfoWindow',
          'AMap.Buildings',
          'AMap.DistrictLayer',
          'AMap.Object3DLayer', // 3D对象图层
          'AMap.GLCustomLayer' // WebGL自定义图层
        ]
      });

      // 创建高德地图实例 - 强制3D模式
      const map = new AMap.Map(mapContainerRef.current, {
        center: [116.4074, 39.9042], // 北京中心
        zoom: 17, // 更高缩放级别
        pitch: 70, // 更强烈的3D倾斜视角
        viewMode: '3D', // 强制3D视图
        mapStyle: 'amap://styles/normal', // 使用标准样式，确保3D兼容性
        showLabel: true,
        showIndoorMap: false,
        features: ['bg', 'road', 'building', 'point'],
        // 强制3D配置
        showBuildingBlock: true,
        buildingAnimation: false,
        expandZoomRange: true,
        terrain: true,
        // 额外的3D配置
        rotateEnable: true,
        pitchEnable: true,
        buildingTopColor: '#ffffff',
        buildingSideColor: '#ddeeff'
      });

      mapRef.current = map;

      // 添加地图控件 - 3D控制
      const scale = new AMap.Scale({ position: 'LB' });
      map.addControl(scale);

      // 添加3D控制工具条（正确的API调用）
      const toolBar = new AMap.ToolBar({
        position: {
          top: '10px',
          right: '10px'
        },
        ruler: true,
        direction: true,
        autoPosition: false
      });
      map.addControl(toolBar);

      // 强制启用3D建筑物图层
      map.on('complete', () => {
        console.log('🗺️ 地图加载完成，开始设置3D效果...');

        // 强制设置3D视角
        map.setPitch(70);
        map.setZoom(17);

        // 添加3D建筑物图层
        const buildings = new AMap.Buildings({
          zooms: [10, 20],
          zIndex: 10,
          heightFactor: 3.0, // 建筑物高度放大3倍
          visible: true,
          // 3D建筑物样式
          topColor: '#ffffff',
          sideColor: '#ccddff'
        });
        map.add(buildings);

        // 强制显示建筑物
        buildings.show();

        // 强制设置3D视角 - 多重确保
        setTimeout(() => {
          map.setPitch(60);
          map.setZoom(16);
          map.setCenter([116.4074, 39.9042]);
          setCurrentPitch(60);
          setIs3DMode(true);
          console.log('🏢 3D视角已强制设置: pitch=60, zoom=16');
        }, 1000);

        // 再次确保3D效果
        setTimeout(() => {
          map.setPitch(60); // 保持60度，不要降低到45度
          map.setZoom(17); // 提高缩放级别
          setCurrentPitch(60);
          setIs3DMode(true);
          console.log('🏢 3D效果二次确认完成: pitch=60');
        }, 3000);

        // 添加定期检查机制，确保3D状态不被重置
        const maintain3D = setInterval(() => {
          const currentPitch = map.getPitch();
          if (currentPitch < 30) {
            map.setPitch(60);
            setCurrentPitch(60);
            setIs3DMode(true);
            console.log('🔄 自动恢复3D视角: pitch=60');
          }
        }, 5000);

        // 清理定时器
        return () => clearInterval(maintain3D);

        console.log('🏢 强制3D建筑物图层已加载，视角已设置');
      });

      console.log('✅ 高德地图3D暗色主题加载完成');

      // 初始化Deck.gl可视化层
      await initializeDeck();

      // 使用高德天气API加载项目天气数据
      await loadProjectsWeatherData();

      // 设置默认选中项目
      if (filteredProjects.length > 0) {
        setSelectedProject(filteredProjects[0]);
      }

      setIsInitialized(true);
      console.log('🚀 大屏项目管理中心初始化完成');

    } catch (error) {
      console.error('❌ 地图初始化失败:', error);
      // 不直接操作DOM，让React处理错误状态
      setMapError(error instanceof Error ? error.message : '地图初始化失败');
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
          zoom: 17,
          pitch: 60, // 保持3D视角
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
          }),

          // 🌤️ 天气温度热力图 - 科技感天气可视化
          new HeatmapLayer({
            id: 'weather-temperature',
            data: filteredProjects.map(project => {
              const weather = weatherDataMap.get(project.id);
              return weather ? {
                position: [project.location.lng, project.location.lat],
                weight: weather.temperature
              } : null;
            }).filter(Boolean),
            getPosition: (d: any) => d.position,
            getWeight: (d: any) => d.weight,
            radiusPixels: 100,
            intensity: 1.2,
            threshold: 0.02,
            colorRange: [
              [0, 100, 255, 120],   // 冷 - 深蓝
              [0, 200, 255, 140],   // 凉 - 蓝色
              [100, 255, 200, 160], // 适中 - 青绿
              [255, 255, 100, 180], // 暖 - 黄色
              [255, 150, 0, 200],   // 热 - 橙色
              [255, 50, 50, 220]    // 很热 - 红色
            ]
          }),

          // 🏗️ 项目深度3D柱状图
          new ColumnLayer({
            id: 'project-depth-columns',
            data: filteredProjects.slice(0, 20), // 限制数量避免性能问题
            getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
            getElevation: (d: ExcavationProject) => Math.max(500, d.depth * 100), // 更高的柱子
            getFillColor: (d: ExcavationProject) => {
              // 根据深度设置颜色 - 更鲜艳
              const depth = d.depth;
              if (depth > 20) return [255, 50, 50, 255];  // 深红 - 很深
              if (depth > 15) return [255, 150, 0, 255];  // 橙色 - 深
              if (depth > 10) return [255, 255, 0, 255];  // 黄色 - 中等
              return [0, 255, 100, 255];                  // 绿色 - 浅
            },
            getLineColor: [255, 255, 255, 200],
            radius: 150, // 更大的半径
            elevationScale: 2, // 放大高度
            pickable: true,
            onClick: (info) => {
              if (info.object) {
                setSelectedProject(info.object);
                console.log('🎯 3D柱状图项目被选中:', info.object.name);
              }
            }
          }),

          // ⚡ 项目连接线 - 数据流效果
          new ArcLayer({
            id: 'project-data-flow',
            data: filteredProjects.slice(0, 8).map((project, index) => {
              const nextIndex = (index + 1) % Math.min(8, filteredProjects.length);
              const nextProject = filteredProjects[nextIndex];
              return {
                source: [project.location.lng, project.location.lat],
                target: [nextProject.location.lng, nextProject.location.lat],
                value: project.progress
              };
            }),
            getSourcePosition: (d: any) => d.source,
            getTargetPosition: (d: any) => d.target,
            getSourceColor: [0, 170, 255, 80],
            getTargetColor: [0, 100, 200, 80],
            getWidth: (d: any) => Math.max(1, d.value / 25),
            getHeight: 0.2
          })
        ]
      });

      deckRef.current = deck;

      // 强制重绘Deck.gl
      setTimeout(() => {
        if (deckRef.current) {
          deckRef.current.redraw();
          console.log('🎨 Deck.gl强制重绘完成');
        }
      }, 2000);

      console.log('🎨 Deck.gl图层数量:', deck.props.layers?.length || 0);
      console.log('🎨 项目数据数量:', filteredProjects.length);
      console.log('🎨 天气数据数量:', weatherDataMap.size);

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
      const pitch = mapRef.current.getPitch() || 60; // 默认保持3D视角
      const rotation = mapRef.current.getRotation() || 0;

      // 确保最小pitch值，保持3D效果
      const safePitch = Math.max(pitch, 30);

      deckRef.current.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: zoom,
          pitch: safePitch, // 使用安全的pitch值
          bearing: -rotation // 高德地图的旋转方向与Deck.gl相反
        }
      });

      // 更新状态
      setCurrentPitch(safePitch);
      setIs3DMode(safePitch > 20);
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
    // 确保重置后仍保持3D视角
    setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.setPitch(45);
        setCurrentPitch(45);
        setIs3DMode(true);
      }
    }, 1200);
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

      // 只为前3个项目加载真实天气数据，避免API限制
      const priorityProjects = projects.slice(0, 3);
      const otherProjects = projects.slice(3);

      let loadedCount = 0;

      // 串行加载优先项目的天气数据，避免并发限制
      for (const project of priorityProjects) {
        try {
          console.log(`🌤️ 加载项目 ${project.name} 的天气数据...`);
          const weather = await amapWeatherService.getWeatherByLocation(
            project.location.lat,
            project.location.lng
          );
          weatherMap.set(project.id, weather);
          loadedCount++;
          console.log(`✅ 项目 ${project.name} 天气数据加载完成`);

          // 添加2秒延迟避免API限制
          if (loadedCount < priorityProjects.length) {
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        } catch (error) {
          console.warn(`⚠️ 项目 ${project.name} 天气数据加载失败，使用默认数据:`, error);
          weatherMap.set(project.id, this.getDefaultWeatherData());
        }
      }

      // 为其他项目使用模拟天气数据
      otherProjects.forEach((project, index) => {
        const simulatedWeather = getSimulatedWeatherData(index);
        weatherMap.set(project.id, simulatedWeather);
        console.log(`🎭 项目 ${project.name} 使用模拟天气数据`);
      });

      setWeatherDataMap(weatherMap);
      console.log(`🎉 天气数据加载完成: ${priorityProjects.length} 真实 + ${otherProjects.length} 模拟`);

    } catch (error) {
      console.error('❌ 天气数据加载失败:', error);
      // 全部使用默认数据
      const weatherMap = new Map<string, WeatherData>();
      projects.forEach(project => {
        weatherMap.set(project.id, getDefaultWeatherData());
      });
      setWeatherDataMap(weatherMap);
    }
  }, [projects]);

  // 获取默认天气数据
  const getDefaultWeatherData = (): WeatherData => ({
    temperature: 22,
    humidity: 65,
    windSpeed: 8,
    weatherCode: 1,
    description: '晴朗',
    icon: '☀️',
    location: {
      city: '北京市',
      province: '北京市'
    },
    lastUpdated: new Date()
  });

  // 获取模拟天气数据
  const getSimulatedWeatherData = (index: number): WeatherData => {
    const weatherTypes = [
      { temperature: 25, humidity: 70, windSpeed: 12, weatherCode: 2, description: '多云', icon: '⛅', city: '上海市', province: '上海市' },
      { temperature: 18, humidity: 80, windSpeed: 15, weatherCode: 3, description: '阴天', icon: '☁️', city: '广州市', province: '广东省' },
      { temperature: 28, humidity: 60, windSpeed: 6, weatherCode: 1, description: '晴朗', icon: '☀️', city: '深圳市', province: '广东省' },
      { temperature: 20, humidity: 85, windSpeed: 18, weatherCode: 61, description: '小雨', icon: '🌦️', city: '杭州市', province: '浙江省' },
      { temperature: 24, humidity: 75, windSpeed: 10, weatherCode: 2, description: '多云', icon: '⛅', city: '南京市', province: '江苏省' }
    ];
    const weather = weatherTypes[index % weatherTypes.length];
    return {
      ...weather,
      location: {
        city: weather.city,
        province: weather.province
      },
      lastUpdated: new Date()
    };
  };

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
        // 确保缩放后保持3D效果
        setTimeout(() => {
          if (mapRef.current) {
            const pitch = zoomLevel > 12 ? 65 : zoomLevel > 8 ? 55 : 45;
            mapRef.current.setPitch(pitch);
            setCurrentPitch(pitch);
            setIs3DMode(true);
          }
        }, 300);
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
      width: '100%',
      height: '100%',
      position: 'relative',
      background: `
        radial-gradient(circle at 20% 80%, rgba(0, 100, 200, 0.3) 0%, transparent 50%),
        radial-gradient(circle at 80% 20%, rgba(0, 150, 255, 0.2) 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, rgba(0, 170, 255, 0.25) 0%, transparent 50%),
        linear-gradient(135deg, #000011 0%, #001133 30%, #002255 60%, #003377 100%)
      `,
      overflow: 'hidden',
      fontFamily: '"Orbitron", "Courier New", monospace',
      animation: 'dreamyBackground 12s ease-in-out infinite alternate'
    }}>
      {/* 🌟 粒子星空背景效果 */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}%`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${8 + Math.random() * 4}s`
          }}
        />
      ))}

      {/* ⚡ 数据流动画效果 */}
      {Array.from({ length: 8 }, (_, i) => (
        <div
          key={`stream-${i}`}
          className="data-stream"
          style={{
            top: `${10 + i * 12}%`,
            width: '200px',
            animationDelay: `${i * 0.5}s`,
            animationDuration: `${3 + Math.random() * 2}s`
          }}
        />
      ))}

      {/* 🔮 能量波纹效果 */}
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        width: '300px',
        height: '300px',
        transform: 'translate(-50%, -50%)',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: '50%',
        animation: 'neonGlow 3s ease-in-out infinite alternate',
        pointerEvents: 'none'
      }} />

      {/* 🚀 DeepCAD Logo - 左上角 */}
      <motion.div
        initial={{ opacity: 0, x: -50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000
        }}
      >
        <div style={{
          fontSize: '24px',
          fontWeight: 'bold',
          background: 'linear-gradient(45deg, #00aaff, #0066cc)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          textShadow: '0 0 10px rgba(0, 170, 255, 0.5)',
          letterSpacing: '1px'
        }}>
          控制中心
        </div>
      </motion.div>

      {/* 🎮 3D视角控制 - 右上角 */}
      <motion.div
        initial={{ opacity: 0, x: 50 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 1000
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <button
            onClick={() => {
              if (mapRef.current) {
                const currentPitch = mapRef.current.getPitch();
                const newPitch = currentPitch < 35 ? 70 : 45; // 在45度和70度之间切换，保持3D效果
                mapRef.current.setPitch(newPitch);
                mapRef.current.setZoom(17); // 确保缩放级别足够看到3D效果
                setCurrentPitch(newPitch);
                setIs3DMode(true); // 确保3D模式状态
                console.log(`🏢 3D视角切换: ${currentPitch}° → ${newPitch}°`);
              }
            }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 0 15px rgba(0, 255, 255, 0.3)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 255, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 255, 0.3)';
            }}
          >
            🏢 3D视角: {currentPitch}°
          </button>

          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setZoom(mapRef.current.getZoom() + 1);
              }
            }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            🔍 放大
          </button>

          <button
            onClick={() => {
              if (mapRef.current) {
                mapRef.current.setZoom(mapRef.current.getZoom() - 1);
              }
            }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              padding: '8px 12px',
              cursor: 'pointer',
              fontSize: '12px',
              transition: 'all 0.3s ease',
              backdropFilter: 'blur(10px)'
            }}
          >
            🔍 缩小
          </button>
        </div>
      </motion.div>

      {/* 🗺️ 3D地图容器 - 占据大部分区域 */}
      <div
        ref={mapContainerRef}
        className="neon-border"
        style={{
          position: 'absolute',
          left: '20px',
          top: '80px', // 为顶部Logo留出空间
          right: '20px',
          bottom: '20px',
          borderRadius: '10px',
          overflow: 'hidden',
          boxShadow: '0 0 50px rgba(0, 255, 255, 0.5)',
          zIndex: 10,
          minHeight: '400px' // 确保最小高度
        }}
      >
        {/* 地图错误状态显示 */}
        {mapError && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'radial-gradient(circle at center, #001122 0%, #000000 100%)',
            color: '#00ffff',
            textAlign: 'center',
            fontFamily: 'Courier New, monospace',
            zIndex: 20
          }}>
            <div>
              <div style={{ fontSize: '64px', marginBottom: '20px' }}>🗺️</div>
              <div style={{ fontSize: '24px', marginBottom: '10px', textShadow: '0 0 10px #00ffff' }}>
                地图引擎离线
              </div>
              <div style={{ fontSize: '16px', opacity: 0.7 }}>
                {mapError}
              </div>
              <div style={{ marginTop: '20px', fontSize: '12px', opacity: 0.5 }}>
                DeepCAD控制中心 v3.0
              </div>
            </div>
          </div>
        )}
      </div>



      {/* Deck.gl画布 - 覆盖在地图上 */}
      <canvas
        id="deck-canvas"
        style={{
          position: 'absolute',
          left: '20px',
          top: '80px',
          right: '20px',
          bottom: '20px',
          pointerEvents: 'auto', // 允许交互
          borderRadius: '10px',
          zIndex: 15 // 确保在地图上方
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
        {/* 系统时间 */}
        <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: 14 }}>
          {new Date().toLocaleString('zh-CN')}
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
              className="neon-border hologram-effect"
              style={{
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(255, 0, 255, 0.15) 100%)',
                borderRadius: '10px',
                padding: '15px',
                backdropFilter: 'blur(10px)',
                boxShadow: '0 8px 32px rgba(0, 255, 255, 0.3)'
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
                const weather = weatherDataMap.get(selectedProject.id);
                if (!weather) {
                  return <div style={{ color: 'rgba(255, 255, 255, 0.6)' }}>天气数据加载中...</div>;
                }
                return (
                  <>
                    <div style={{ marginBottom: '6px' }}>
                      🌡️ 温度: {weather.temperature}°C
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      💨 风速: {weather.windSpeed} km/h
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      💧 湿度: {weather.humidity}%
                    </div>
                    <div style={{ marginBottom: '6px' }}>
                      📍 位置: {weather.location?.city || '未知'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', marginTop: '8px' }}>
                      {weather.description} {weather.icon}
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
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setZoom(6);
                      setTimeout(() => {
                        mapRef.current?.setPitch(45);
                        setCurrentPitch(45);
                        setIs3DMode(true);
                      }, 500);
                    }
                  }}
                  className="neon-border"
                  style={{
                    background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(5px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  全国
                </button>
                <button
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setZoom(10);
                      setTimeout(() => {
                        mapRef.current?.setPitch(55);
                        setCurrentPitch(55);
                        setIs3DMode(true);
                      }, 500);
                    }
                  }}
                  className="neon-border"
                  style={{
                    background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(5px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
                  }}
                >
                  城市
                </button>
                <button
                  onClick={() => {
                    if (mapRef.current) {
                      mapRef.current.setZoom(15);
                      setTimeout(() => {
                        mapRef.current?.setPitch(65);
                        setCurrentPitch(65);
                        setIs3DMode(true);
                      }, 500);
                    }
                  }}
                  className="neon-border"
                  style={{
                    background: 'linear-gradient(45deg, rgba(0, 255, 255, 0.3) 0%, rgba(255, 0, 255, 0.3) 100%)',
                    borderRadius: '4px',
                    color: '#fff',
                    padding: '4px 8px',
                    cursor: 'pointer',
                    fontSize: '10px',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(5px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.1)';
                    e.currentTarget.style.boxShadow = '0 0 20px rgba(0, 255, 255, 0.8)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '';
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
            className="neon-border hologram-effect"
            style={{
              background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.15) 0%, rgba(255, 0, 255, 0.15) 100%)',
              borderRadius: '8px',
              padding: '10px 15px',
              textAlign: 'center',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 255, 255, 0.3)'
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
