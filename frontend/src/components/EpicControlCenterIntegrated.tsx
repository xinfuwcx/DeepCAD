/**
 * Epic控制中心集成版
 * 0号架构师 - 1号专家Epic系统：专注项目展示和GIS可视化
 * 核心职责：项目管理、地理信息展示、专家协作控制
 * 注意：结果显示由3号专家的PyVista模块负责，不在Epic控制中心
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { FunctionalIcons } from './icons/FunctionalIconsQuickFix';
import DataPipelineManager from '../services/DataPipelineManager';
import { EnhancedGeoThreeService, GeoThreeConfig } from '../services/EnhancedGeoThreeService';

interface EpicControlCenterIntegratedProps {
  width?: number;
  height?: number;
  onProjectSelect?: (project: Project) => void;
  onExpertSwitch?: (expertId: 1 | 2 | 3) => void;
  onDataTransfer?: (data: ProjectContextData) => void;
  activeInWorkspace?: boolean;
  workspaceMode?: 'epic_control' | 'geo_visualization' | 'weather_system';
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
  geologicalContext?: {
    soilType: string;
    groundwaterLevel: number;
    seismicZone: number;
  };
  supportStructures?: {
    diaphragmWalls: boolean;
    pileSupports: boolean;
    anchorSystems: boolean;
    steelSupports: boolean;
  };
}

interface ProjectContextData {
  project: Project;
  location: {
    coordinates: { lat: number; lng: number };
    address: string;
    region: string;
  };
  weather: WeatherData;
  siteConditions: {
    accessibility: string;
    constraints: string[];
    environmentalFactors: string[];
  };
}

interface WeatherData {
  temperature: number;
  description: string;
  windSpeed: number;
  humidity: number;
  precipitation: number;
  icon: string;
  visibility: number;
  pressure: number;
}

interface EpicSystemState {
  flightMode: 'overview' | 'project_focus' | 'transition';
  selectedProject: Project | null;
  cameraPosition: THREE.Vector3;
  weatherLayersVisible: boolean;
  particleEffectsEnabled: boolean;
  expertCollaborationMode: boolean;
}

// 项目数据 - 包含支护结构信息
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
    geologicalContext: {
      soilType: 'soft_clay',
      groundwaterLevel: 2.5,
      seismicZone: 7
    },
    supportStructures: {
      diaphragmWalls: true,
      pileSupports: true,
      anchorSystems: false,
      steelSupports: true
    }
  },
  {
    id: 'beijing-daxing',
    name: '北京大兴机场',
    lat: 39.5098,
    lng: 116.4105,
    depth: 45,
    status: 'active',
    progress: 85,
    description: '大兴国际机场航站楼基坑',
    geologicalContext: {
      soilType: 'sandy_clay',
      groundwaterLevel: 8.0,
      seismicZone: 8
    },
    supportStructures: {
      diaphragmWalls: true,
      pileSupports: false,
      anchorSystems: true,
      steelSupports: true
    }
  },
  {
    id: 'guangzhou-tower',
    name: '广州塔地下空间',
    lat: 23.1084,
    lng: 113.3189,
    depth: 35,
    status: 'planning',
    progress: 20,
    description: '广州塔地下商业空间基坑',
    geologicalContext: {
      soilType: 'weathered_granite',
      groundwaterLevel: 12.0,
      seismicZone: 6
    },
    supportStructures: {
      diaphragmWalls: false,
      pileSupports: true,
      anchorSystems: true,
      steelSupports: false
    }
  }
];

const EpicControlCenterIntegrated: React.FC<EpicControlCenterIntegratedProps> = ({
  width = 1200,
  height = 800,
  onProjectSelect,
  onExpertSwitch,
  onDataTransfer,
  activeInWorkspace = false,
  workspaceMode = 'epic_control'
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const frameIdRef = useRef<number>();
  
  const [epicState, setEpicState] = useState<EpicSystemState>({
    flightMode: 'overview',
    selectedProject: null,
    cameraPosition: new THREE.Vector3(0, 50, 100),
    weatherLayersVisible: true,
    particleEffectsEnabled: true,
    expertCollaborationMode: activeInWorkspace
  });

  const [weather, setWeather] = useState<WeatherData>({
    temperature: 22,
    description: '多云',
    windSpeed: 12,
    humidity: 65,
    precipitation: 0,
    icon: '☁️',
    visibility: 10,
    pressure: 1013
  });

  const [isTransitioning, setIsTransitioning] = useState(false);
  const [collaborationData, setCollaborationData] = useState<any>(null);

  // 初始化Epic Three.js场景
  const initEpicScene = useCallback(() => {
    if (!mountRef.current) return;

    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x001122);
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.copy(epicState.cameraPosition);
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setClearColor(0x001122);
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 添加地球模型
    createEarthModel(scene);
    
    // 添加项目标记
    createProjectMarkers(scene);
    
    // 添加天气效果
    if (epicState.weatherLayersVisible) {
      createWeatherEffects(scene);
    }
    
    // 添加粒子效果
    if (epicState.particleEffectsEnabled) {
      createParticleEffects(scene);
    }

    // 开始渲染循环
    startRenderLoop();
  }, [width, height, epicState]);

  // 创建地球模型
  const createEarthModel = (scene: THREE.Scene) => {
    const geometry = new THREE.SphereGeometry(20, 64, 32);
    const material = new THREE.MeshPhongMaterial({
      color: 0x2194ce,
      transparent: true,
      opacity: 0.8
    });
    const earth = new THREE.Mesh(geometry, material);
    scene.add(earth);

    // 添加光照
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 50, 50);
    scene.add(directionalLight);
  };

  // 创建项目标记
  const createProjectMarkers = (scene: THREE.Scene) => {
    PROJECTS.forEach(project => {
      // 将经纬度转换为3D坐标
      const phi = (90 - project.lat) * (Math.PI / 180);
      const theta = (project.lng + 180) * (Math.PI / 180);
      
      const x = 22 * Math.sin(phi) * Math.cos(theta);
      const y = 22 * Math.cos(phi);
      const z = 22 * Math.sin(phi) * Math.sin(theta);

      // 创建项目标记
      const markerGeometry = new THREE.ConeGeometry(0.8, 3, 8);
      const markerMaterial = new THREE.MeshLambertMaterial({
        color: project.status === 'completed' ? 0x00ff00 : 
               project.status === 'active' ? 0xffff00 : 0xff0000
      });
      const marker = new THREE.Mesh(markerGeometry, markerMaterial);
      marker.position.set(x, y, z);
      marker.userData = { project };
      scene.add(marker);

      // 添加项目信息板
      createProjectInfoPanel(scene, project, new THREE.Vector3(x, y + 4, z));
    });
  };

  // 创建项目信息板
  const createProjectInfoPanel = (scene: THREE.Scene, project: Project, position: THREE.Vector3) => {
    // 创建半透明背景
    const panelGeometry = new THREE.PlaneGeometry(8, 4);
    const panelMaterial = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.7
    });
    const panel = new THREE.Mesh(panelGeometry, panelMaterial);
    panel.position.copy(position);
    panel.lookAt(cameraRef.current?.position || new THREE.Vector3(0, 0, 0));
    scene.add(panel);
  };

  // 创建天气效果
  const createWeatherEffects = (scene: THREE.Scene) => {
    // 根据天气数据创建视觉效果
    if (weather.precipitation > 0) {
      createRainEffect(scene);
    }
    
    if (weather.windSpeed > 15) {
      createWindEffect(scene);
    }
    
    // 添加云层
    createCloudLayer(scene);
  };

  // 创建雨效果
  const createRainEffect = (scene: THREE.Scene) => {
    const rainGeometry = new THREE.BufferGeometry();
    const rainCount = 1000 * (weather.precipitation / 10);
    const positions = new Float32Array(rainCount * 3);
    
    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = Math.random() * 200 - 100;
      positions[i + 1] = Math.random() * 100 + 50;
      positions[i + 2] = Math.random() * 200 - 100;
    }
    
    rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const rainMaterial = new THREE.PointsMaterial({
      color: 0x87ceeb,
      size: 0.1,
      transparent: true,
      opacity: 0.6
    });
    
    const rain = new THREE.Points(rainGeometry, rainMaterial);
    scene.add(rain);
  };

  // 创建风效果
  const createWindEffect = (scene: THREE.Scene) => {
    // 添加移动的粒子表示风向
    const windGeometry = new THREE.BufferGeometry();
    const windCount = 500;
    const positions = new Float32Array(windCount * 3);
    
    for (let i = 0; i < windCount * 3; i += 3) {
      positions[i] = Math.random() * 100 - 50;
      positions[i + 1] = Math.random() * 50 + 25;
      positions[i + 2] = Math.random() * 100 - 50;
    }
    
    windGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const windMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.3
    });
    
    const wind = new THREE.Points(windGeometry, windMaterial);
    scene.add(wind);
  };

  // 创建云层
  const createCloudLayer = (scene: THREE.Scene) => {
    const cloudGeometry = new THREE.SphereGeometry(25, 32, 16);
    const cloudMaterial = new THREE.MeshLambertMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.3
    });
    const clouds = new THREE.Mesh(cloudGeometry, cloudMaterial);
    scene.add(clouds);
  };

  // 创建粒子效果
  const createParticleEffects = (scene: THREE.Scene) => {
    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = Math.random() * 400 - 200;
      positions[i + 1] = Math.random() * 200 - 100;
      positions[i + 2] = Math.random() * 400 - 200;
    }
    
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
      color: 0x00d9ff,
      size: 0.8,
      transparent: true,
      opacity: 0.4
    });
    
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);
  };

  // 开始渲染循环
  const startRenderLoop = () => {
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      
      if (sceneRef.current && cameraRef.current && rendererRef.current) {
        // 更新动画效果
        updateAnimations();
        
        // 渲染场景
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();
  };

  // 更新动画效果
  const updateAnimations = () => {
    if (!sceneRef.current) return;
    
    // 旋转地球
    const earth = sceneRef.current.children.find(child => 
      child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry
    );
    if (earth) {
      earth.rotation.y += 0.001;
    }
    
    // 更新粒子动画
    const particles = sceneRef.current.children.find(child => 
      child instanceof THREE.Points
    ) as THREE.Points;
    if (particles) {
      particles.rotation.y += 0.002;
    }
  };

  // 处理项目选择
  const handleProjectSelect = async (project: Project) => {
    setIsTransitioning(true);
    setEpicState(prev => ({
      ...prev,
      selectedProject: project,
      flightMode: 'project_focus'
    }));

    // 创建项目上下文数据
    const projectContextData: ProjectContextData = {
      project,
      location: {
        coordinates: { lat: project.lat, lng: project.lng },
        address: `${project.name}项目地址`,
        region: project.lat > 30 ? '华东地区' : project.lat > 25 ? '华南地区' : '华北地区'
      },
      weather,
      siteConditions: {
        accessibility: '良好',
        constraints: ['周边建筑密集', '交通管制'],
        environmentalFactors: ['噪音控制', '粉尘管理']
      }
    };

    // 通过数据管道传递给2号专家
    try {
      await DataPipelineManager.transferData('epic-to-geology', projectContextData);
      setCollaborationData(projectContextData);
    } catch (error) {
      console.error('数据传输失败:', error);
    }

    // 通知父组件
    onProjectSelect?.(project);
    onDataTransfer?.(projectContextData);

    // 自动切换到2号专家进行地质建模
    setTimeout(() => {
      setIsTransitioning(false);
      if (epicState.expertCollaborationMode) {
        onExpertSwitch?.(2);
      }
    }, 2000);
  };

  // Epic飞行到项目
  const flyToProject = (project: Project) => {
    if (!cameraRef.current) return;

    setIsTransitioning(true);
    
    // 计算项目3D坐标
    const phi = (90 - project.lat) * (Math.PI / 180);
    const theta = (project.lng + 180) * (Math.PI / 180);
    
    const targetX = 40 * Math.sin(phi) * Math.cos(theta);
    const targetY = 40 * Math.cos(phi);
    const targetZ = 40 * Math.sin(phi) * Math.sin(theta);

    // 平滑飞行动画
    const startPos = cameraRef.current.position.clone();
    const endPos = new THREE.Vector3(targetX, targetY, targetZ);
    const duration = 3000;
    const startTime = Date.now();

    const animateFlight = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // 使用easing函数实现平滑过渡
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      
      if (cameraRef.current) {
        cameraRef.current.position.lerpVectors(startPos, endPos, easeProgress);
        cameraRef.current.lookAt(0, 0, 0);
      }

      if (progress < 1) {
        requestAnimationFrame(animateFlight);
      } else {
        setIsTransitioning(false);
        handleProjectSelect(project);
      }
    };

    animateFlight();
  };

  // 初始化场景
  useEffect(() => {
    initEpicScene();
    
    return () => {
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [initEpicScene]);

  return (
    <div className="epic-control-center-integrated relative">
      {/* Epic 3D场景 */}
      <div 
        ref={mountRef} 
        className="epic-scene w-full h-full"
        style={{ width, height }}
      />
      
      {/* Epic控制面板 */}
      <div className="absolute top-4 left-4 space-y-4">
        {/* 工作模式切换 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">Epic控制模式</h3>
          <div className="flex space-x-2">
            {[
              { mode: 'epic_control', label: 'Epic控制', icon: FunctionalIcons.ProjectManagement },
              { mode: 'geo_visualization', label: '地理可视化', icon: FunctionalIcons.GISMapping },
              { mode: 'weather_system', label: '天气系统', icon: FunctionalIcons.EnvironmentalAnalysis }
            ].map(({ mode, label, icon: Icon }) => (
              <motion.button
                key={mode}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all ${
                  workspaceMode === mode 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <Icon size={16} />
                <span className="text-sm">{label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 天气信息 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-2">实时天气</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <div className="flex items-center justify-between">
              <span>温度:</span>
              <span>{weather.temperature}°C</span>
            </div>
            <div className="flex items-center justify-between">
              <span>风速:</span>
              <span>{weather.windSpeed} km/h</span>
            </div>
            <div className="flex items-center justify-between">
              <span>湿度:</span>
              <span>{weather.humidity}%</span>
            </div>
          </div>
        </div>

        {/* 效果控制 */}
        <div className="bg-black/50 backdrop-blur-sm rounded-lg p-4">
          <h3 className="text-white font-medium mb-3">视觉效果</h3>
          <div className="space-y-2">
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-300">天气图层</span>
              <input
                type="checkbox"
                checked={epicState.weatherLayersVisible}
                onChange={(e) => setEpicState(prev => ({
                  ...prev,
                  weatherLayersVisible: e.target.checked
                }))}
                className="rounded"
              />
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-300">粒子效果</span>
              <input
                type="checkbox"
                checked={epicState.particleEffectsEnabled}
                onChange={(e) => setEpicState(prev => ({
                  ...prev,
                  particleEffectsEnabled: e.target.checked
                }))}
                className="rounded"
              />
            </label>
          </div>
        </div>
      </div>

      {/* 项目列表 */}
      <div className="absolute top-4 right-4 w-80 space-y-2">
        <h3 className="text-white font-medium mb-3 bg-black/50 backdrop-blur-sm rounded-lg p-2">
          深基坑项目
        </h3>
        {PROJECTS.map(project => (
          <motion.div
            key={project.id}
            className={`bg-black/50 backdrop-blur-sm rounded-lg p-4 cursor-pointer transition-all ${
              epicState.selectedProject?.id === project.id 
                ? 'ring-2 ring-blue-500' 
                : 'hover:bg-black/70'
            }`}
            onClick={() => flyToProject(project)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-white font-medium text-sm">{project.name}</h4>
              <div className={`w-3 h-3 rounded-full ${
                project.status === 'completed' ? 'bg-green-500' :
                project.status === 'active' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
            </div>
            <p className="text-gray-300 text-xs mb-2">{project.description}</p>
            <div className="text-xs text-gray-400 space-y-1">
              <div>深度: {project.depth}m</div>
              <div>进度: {project.progress}%</div>
              {project.supportStructures && (
                <div className="flex space-x-1 mt-2">
                  {project.supportStructures.diaphragmWalls && (
                    <span className="px-2 py-0.5 bg-blue-600/30 text-blue-300 rounded text-xs">连续墙</span>
                  )}
                  {project.supportStructures.pileSupports && (
                    <span className="px-2 py-0.5 bg-green-600/30 text-green-300 rounded text-xs">桩基</span>
                  )}
                  {project.supportStructures.anchorSystems && (
                    <span className="px-2 py-0.5 bg-purple-600/30 text-purple-300 rounded text-xs">锚索</span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* 协作状态指示器 */}
      {epicState.expertCollaborationMode && (
        <div className="absolute bottom-4 left-4">
          <div className="bg-blue-600/20 backdrop-blur-sm rounded-lg p-3 border border-blue-500/30">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-300 text-sm">专家协作模式</span>
            </div>
            {collaborationData && (
              <div className="text-xs text-blue-400 mt-1">
                已向2号专家传递项目上下文
              </div>
            )}
          </div>
        </div>
      )}

      {/* 过渡动画遮罩 */}
      <AnimatePresence>
        {isTransitioning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center"
          >
            <div className="text-white text-center">
              <div className="text-xl font-bold mb-2">Epic 飞行中...</div>
              <div className="text-sm text-gray-300">正在前往项目现场</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EpicControlCenterIntegrated;