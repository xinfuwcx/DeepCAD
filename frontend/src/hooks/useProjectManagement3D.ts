/**
 * 项目管理3D地图Hook
 * 集成MapLibre GL JS + Deck.gl + Three.js的完整解决方案
 */

import { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import maplibregl from 'maplibre-gl';
// 移除直接静态导入 deck.gl 图层，改为统一懒加载
import { getDeckLayers } from '../utils/mapLayersUtil';

// 样式说明：
// 不在 Hook 内引入全局 CSS，避免影响控制中心。
// 由 ProjectManagement3DScreen 按路由懒加载 ../styles/pm-maplibre.css 实现样式隔离。

// 项目数据接口
export interface Project {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: 'active' | 'completed' | 'planning' | 'risk' | 'paused';
  progress: number;
  depth: number;
  area: number;
  manager: string;
  startDate: string;
  endDate: string;
  description?: string;
}

// 地图配置接口
export interface MapConfig {
  center: [number, number];
  zoom: number;
  pitch: number;
  bearing: number;
  style: 'streets' | 'satellite' | 'dark';
}

// Hook返回值接口
export interface ProjectManagement3DResult {
  // 容器引用
  mapContainerRef: React.RefObject<HTMLDivElement>;
  threeCanvasRef: React.RefObject<HTMLCanvasElement>;
  
  // 状态
  isInitialized: boolean;
  selectedProject: Project | null;
  hoveredProject: Project | null;
  
  // 方法
  selectProject: (project: Project) => void;
  flyToProject: (project: Project) => void;
  resetView: () => void;
  updateProjects: (projects: Project[]) => void;
  
  // 地图控制
  setMapStyle: (style: MapConfig['style']) => void;
  toggleWeatherLayer: (visible: boolean) => void;
}

// 项目颜色映射
export const PROJECT_COLORS = {
  active: '#00d9ff',     // 活跃蓝
  completed: '#00ff88',  // 成功绿  
  planning: '#8b5cf6',   // 规划紫
  risk: '#ff6b35',       // 警告橙
  paused: '#6b7280'      // 暂停灰
};

export const useProjectManagement3D = (
  initialProjects: Project[] = [],
  initialConfig: Partial<MapConfig> = {}
): ProjectManagement3DResult => {
  
  // 引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const threeCanvasRef = useRef<HTMLCanvasElement>(null);
  
  // 地图相关引用
  const mapRef = useRef<any>(null); // MapLibre地图实例
  const deckOverlayRef = useRef<any>(null); // Deck.gl叠加层
  
  // Three.js相关引用
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const threeRendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const threeCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);
  
  // 状态
  const [isInitialized, setIsInitialized] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [hoveredProject, setHoveredProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [mapConfig, setMapConfig] = useState<MapConfig>({
    center: [116.4074, 39.9042], // 北京
    zoom: 5,
    pitch: 0,
    bearing: 0,
    style: 'dark',
    ...initialConfig
  });

  // 初始化MapLibre地图
  // 项目选择 (前置以便后续 hook 依赖不触发“使用前声明”报错)
  const selectProject = useCallback((project: Project) => {
    setSelectedProject(project);
    console.log('选中项目:', project.name);
  }, []);

  // 飞行到项目
  const flyToProject = useCallback((project: Project) => {
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [project.longitude, project.latitude],
        zoom: 14,
        pitch: 45,
        bearing: 0,
        duration: 2000,
        essential: true
      });
    }
    selectProject(project);
  }, [selectProject]);

  const initializeMap = useCallback(async () => {
    if (!mapContainerRef.current) return;

    try {
      console.log('🗺️ 初始化MapLibre地图...');
      
      // 创建暗色科技风地图样式
      const darkMapStyle = {
        version: 8 as 8,
        name: 'DeepCAD Dark Tech',
        sources: {
          'osm': {
            type: 'raster',
            tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors'
          }
        },
        layers: [{
          id: 'osm-layer',
          type: 'raster',
          source: 'osm',
          paint: {
            'raster-opacity': 0.3, // 非常低的不透明度，突出科技感
            'raster-hue-rotate': 220, // 蓝色科技风
            'raster-brightness-max': 0.4,
            'raster-brightness-min': 0.1,
            'raster-contrast': 1.5,
            'raster-saturation': 0.2
          }
        }]
      };

      // 创建真实的MapLibre地图实例
      const map = new maplibregl.Map({
        container: mapContainerRef.current,
        style: darkMapStyle as any,
        center: mapConfig.center,
        zoom: mapConfig.zoom,
        pitch: mapConfig.pitch,
        bearing: mapConfig.bearing,
        maxPitch: 85, // 允许大角度俯视
        hash: false,
        attributionControl: false
      });

      mapRef.current = map;
      
      // 地图加载完成后的事件处理
      map.on('load', () => {
        console.log('✅ MapLibre地图加载完成');
        try { map.easeTo({ pitch: 55, bearing: 20, duration: 800 }); } catch {}
        try { map.resize(); } catch {}
        // 添加大气效果层（如果支持）
        try {
          if ((map as any).getSource && (map as any).getSource('sky') === undefined) {
            (map as any).addSource('sky', {
              type: 'sky',
              paint: { 'sky-atmosphere-sun': [0.0, 0.0], 'sky-atmosphere-sun-intensity': 5 }
            });
          }
        } catch {}
        setIsInitialized(true);
      });

      // 地图移动事件
      map.on('move', () => {
        const center = map.getCenter();
        const zoom = map.getZoom();
        const pitch = map.getPitch();
        const bearing = map.getBearing();
        
        setMapConfig(prev => ({
          ...prev,
          center: [center.lng, center.lat],
          zoom,
          pitch,
          bearing
        }));
      });
      
      setIsInitialized(true);
      
    } catch (error) {
      console.error('地图初始化失败:', error);
    }
  }, [mapConfig]);

  // 初始化Deck.gl图层
  const initializeDeckGL = useCallback(async () => {
    if (!isInitialized || !mapRef.current || !projects.length) return;
    console.log('🎯 初始化Deck.gl数据可视化 (lazy load)...');

    let IconLayer: any, HeatmapLayer: any, MapboxOverlay: any;
    try {
      ({ IconLayer, HeatmapLayer, MapboxOverlay } = await getDeckLayers());
    } catch (e) {
      console.error('❌ deck.gl 模块加载失败:', e);
      return;
    }

    // 创建项目图标层
  const projectIconLayer = new IconLayer({
      id: 'projects-icon',
      data: projects,
      getIcon: (d: Project) => ({
        url: 'data:image/svg+xml;base64,' + btoa(`
          <svg width="64" height="64" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
            <circle cx="32" cy="32" r="28" fill="${PROJECT_COLORS[d.status]}" opacity="0.8"/>
            <circle cx="32" cy="32" r="18" fill="${PROJECT_COLORS[d.status]}" opacity="0.6"/>
            <circle cx="32" cy="32" r="8" fill="white" opacity="0.9"/>
            <text x="32" y="42" text-anchor="middle" fill="white" font-size="8" font-family="Arial">
              ${Math.round(d.progress)}%
            </text>
          </svg>
        `),
        width: 64,
        height: 64,
        anchorY: 64
      }),
      getPosition: (d: Project) => [d.longitude, d.latitude],
      getSize: (d: Project) => {
        // 根据项目规模调整大小
        const baseSize = 40;
        const scale = Math.log(d.area / 1000 + 1) * 0.5 + 0.8;
        return baseSize * scale;
      },
      pickable: true,
  onHover: ({ object }: any) => {
        if (object) {
          setHoveredProject(object);
          // 可以在这里添加工具提示逻辑
        } else {
          setHoveredProject(null);
        }
      },
      onClick: ({ object }: any) => {
        if (object) {
          selectProject(object);
        }
      },
      updateTriggers: {
        getIcon: [projects], // 当项目数据变化时重新渲染图标
        getSize: [projects]
      }
    });

    // 创建项目热力图层（显示项目密度）
  const projectHeatmapLayer = new HeatmapLayer({
      id: 'project-density',
      data: projects,
      getPosition: (d: Project) => [d.longitude, d.latitude],
      getWeight: (d: Project) => Math.log(d.area / 1000 + 1), // 基于项目面积的权重
      radiusPixels: 120,
      intensity: 0.5,
      threshold: 0.1,
      colorRange: [
        [0, 0, 0, 0],
        [0, 100, 200, 50],
        [0, 150, 255, 100],
        [0, 200, 255, 150],
        [100, 255, 255, 200],
        [255, 255, 255, 255]
      ]
    });

    // 创建Deck.gl叠加层
  const deckOverlay = new MapboxOverlay({
      layers: [projectHeatmapLayer, projectIconLayer], // 热力图在下，图标在上
      getTooltip: ({ object }: any) => {
        if (object) {
          const proj = object as Project;
          return {
            html: `
              <div style="background: rgba(26, 35, 50, 0.95); padding: 12px; border-radius: 8px; border: 1px solid ${PROJECT_COLORS[proj.status]};">
                <div style="color: white; font-weight: bold; margin-bottom: 4px;">${proj.name}</div>
                <div style="color: #ffffff80; font-size: 12px; margin-bottom: 4px;">${proj.location}</div>
                <div style="color: ${PROJECT_COLORS[proj.status]}; font-size: 12px;">
                  进度: ${proj.progress}% | 深度: ${proj.depth}m | 面积: ${proj.area}m²
                </div>
              </div>
            `
          };
        }
        return null;
      }
    });

    // 将Deck.gl叠加层添加到地图
    mapRef.current.addControl(deckOverlay as any);
    deckOverlayRef.current = deckOverlay;

    console.log('✅ Deck.gl数据可视化图层已创建');
  }, [isInitialized, projects, selectProject]);

  // 初始化Three.js特效
  const initializeThreeJS = useCallback(() => {
    if (!threeCanvasRef.current) return;

    console.log('🎨 初始化Three.js特效系统...');

    // 创建场景
    const scene = new THREE.Scene();
    threeSceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 100;
    threeCameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    threeRendererRef.current = renderer;

    // 创建天气粒子系统
    const createWeatherEffects = () => {
      const particleCount = 500;
      const particles = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 200;
        positions[i * 3 + 1] = Math.random() * 100;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
      }
      
      particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      
      const material = new THREE.PointsMaterial({
        color: 0x87CEEB,
        size: 2,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
      });
      
      return new THREE.Points(particles, material);
    };

    const weatherEffect = createWeatherEffects();
    scene.add(weatherEffect);

    // 项目光环效果
    const createProjectRings = () => {
      const rings: THREE.Mesh[] = [];
      
      projects.forEach(project => {
        const geometry = new THREE.RingGeometry(5, 8, 32);
        const material = new THREE.MeshBasicMaterial({
          color: PROJECT_COLORS[project.status],
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide
        });
        
        const ring = new THREE.Mesh(geometry, material);
        // 简化的位置映射 (实际需要地理坐标转换)
        ring.position.set(
          (project.longitude - 116) * 10,
          0,
          (project.latitude - 39) * 10
        );
        
        rings.push(ring);
        scene.add(ring);
      });
      
      return rings;
    };

    const projectRings = createProjectRings();

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // 天气粒子下落
      if (weatherEffect.geometry.attributes.position) {
        const positions = weatherEffect.geometry.attributes.position.array as Float32Array;
        for (let i = 1; i < positions.length; i += 3) {
          positions[i] -= 0.5; // 下落速度
          if (positions[i] < -50) {
            positions[i] = 50; // 重置到顶部
          }
        }
        weatherEffect.geometry.attributes.position.needsUpdate = true;
      }
      
      // 项目光环脉动
      projectRings.forEach((ring, index) => {
        if (ring.material) {
          (ring.material as THREE.MeshBasicMaterial).opacity = 
            0.3 + Math.sin(time * 2 + index) * 0.2;
        }
        ring.rotation.z += 0.01;
      });
      
      renderer.render(scene, camera);
    };

    animate();

    // 窗口大小调整
    const handleResize = () => {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [projects]);


  // 重置视图
  const resetView = useCallback(() => {
    setSelectedProject(null);
    setHoveredProject(null);
    if (mapRef.current) {
      mapRef.current.flyTo({
        center: [116.4074, 39.9042], // 回到中国中心位置
        zoom: 5,
        pitch: 0,
        bearing: 0,
        duration: 1500,
        essential: true
      });
    }
  }, []);

  // 更新项目数据
  const updateProjects = useCallback((newProjects: Project[]) => {
    setProjects(newProjects);
    // 重新初始化Deck.gl图层
    if (deckOverlayRef.current && mapRef.current) {
      mapRef.current.removeControl(deckOverlayRef.current as any);
      deckOverlayRef.current = null;
    }
    // 延迟重新初始化以确保数据更新完成
    setTimeout(() => {
      initializeDeckGL();
    }, 100);
  }, [initializeDeckGL]);

  // 设置地图样式
  const setMapStyle = useCallback((style: MapConfig['style']) => {
    setMapConfig(prev => ({ ...prev, style }));
    
    if (!mapRef.current) return;
    
    // 根据样式类型创建不同的地图样式
    let newMapStyle;
    
    switch (style) {
      case 'satellite':
        newMapStyle = {
          version: 8,
          sources: {
            'satellite': {
              type: 'raster',
              tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
              tileSize: 256,
              attribution: '© Esri'
            }
          },
          layers: [{
            id: 'satellite-layer',
            type: 'raster',
            source: 'satellite',
            paint: {
              'raster-opacity': 0.8,
              'raster-brightness-max': 0.7
            }
          }]
        };
        break;
      case 'streets':
        newMapStyle = {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-opacity': 0.9
            }
          }]
        };
        break;
      default: // 'dark'
        newMapStyle = {
          version: 8,
          sources: {
            'osm': {
              type: 'raster',
              tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
              tileSize: 256,
              attribution: '© OpenStreetMap'
            }
          },
          layers: [{
            id: 'osm-layer',
            type: 'raster',
            source: 'osm',
            paint: {
              'raster-opacity': 0.3,
              'raster-hue-rotate': 220,
              'raster-brightness-max': 0.4,
              'raster-brightness-min': 0.1,
              'raster-contrast': 1.5,
              'raster-saturation': 0.2
            }
          }]
        };
    }
    
    // 更新地图样式
    mapRef.current.setStyle(newMapStyle);
  }, []);

  // 切换天气图层
  const toggleWeatherLayer = useCallback((visible: boolean) => {
    console.log('切换天气图层:', visible);
    // 实际应该控制Three.js中的天气特效显示/隐藏
  }, []);

  // 主初始化效果
  useEffect(() => {
    const initialize = async () => {
      await initializeMap();
    };
    
    initialize();
    
    return () => {
      // 清理资源
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (threeRendererRef.current) {
        threeRendererRef.current.dispose();
      }
      if (deckOverlayRef.current && mapRef.current) {
        mapRef.current.removeControl(deckOverlayRef.current as any);
      }
      if (mapRef.current) {
        mapRef.current.remove();
      }
    };
  }, [initializeMap]);

  // Deck.gl初始化
  useEffect(() => {
    initializeDeckGL();
  }, [initializeDeckGL]);

  // Three.js初始化
  useEffect(() => {
    if (isInitialized) {
      const cleanup = initializeThreeJS();
      return cleanup;
    }
  }, [isInitialized, initializeThreeJS]);

  return {
    // 引用
    mapContainerRef,
    threeCanvasRef,
    
    // 状态
    isInitialized,
    selectedProject,
    hoveredProject,
    
    // 方法
    selectProject,
    flyToProject,
    resetView,
    updateProjects,
    setMapStyle,
    toggleWeatherLayer
  };
};

// 辅助函数：十六进制颜色转RGB
// The hexToRgb function has been removed to satisfy noUnusedLocals.