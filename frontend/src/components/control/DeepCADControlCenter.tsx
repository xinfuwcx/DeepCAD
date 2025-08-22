/* eslint-disable react/jsx-no-inline-styles, @deepcad/no-inline-styles */
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
// New core visual background & performance overlay
import { BackgroundVisualization } from '../../core/BackgroundVisualization';
import { PerformanceOverlay } from '../../core/performance/PerformanceOverlay';
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

// AMap v2 安全密钥声明（放在顶层，避免 TS 报错）
declare global {
  interface Window {
    _AMapSecurityConfig?: { securityJsCode: string };
  }
}
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, ColumnLayer, BitmapLayer, TextLayer, PathLayer } from '@deck.gl/layers';
import { PathStyleExtension } from '@deck.gl/extensions';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
// Remove static HeatmapLayer import; will lazy load when building layers
// Lazy deck layer loader (unifies HeatmapLayer access & reduces initial bundle)
import { getDeckLayers } from '../../utils/mapLayersUtil';
import { TileLayer } from '@deck.gl/geo-layers';
import { DeckGlLayerAdapter } from '../../core/layers/DeckGlLayerAdapter';
import { useThreeScene } from '../../core/useThreeScene';
import { emitSelection } from '../../core/picking/selectionDispatcher';
import SelectionToast from './SelectionToast';
import { Sparkline, Donut } from './KPIWidgets';

// 服务和工具
import { amapWeatherService, WeatherData } from '../../services/AmapWeatherService';
import LayerDebugPanel from '../../core/performance/LayerDebugPanel';
import TimelineControlPanel from '../../core/performance/TimelineControlPanel';
// 新架构下的示例全局三维地球层（可选显示）
import EpicGlobeScene from '../../core/EpicGlobeScene';
import ProjectManagementPanel from '../project/ProjectManagementPanel';
import FloatingQuickControlsPanel from './FloatingQuickControlsPanel';
import { useVisualSettingsStore } from '../../core/visualSettingsStore';
import { useShallow } from 'zustand/react/shallow';
import { getProjects as fetchProjectItems, ProjectItem } from '../../services/projectService';
import { useControlCenterStore } from '../../core/controlCenterStore';
import { startProjectPolling, stopProjectPolling } from '../../services/projectPollingService';

interface DeepCADControlCenterProps {
  onExit: () => void;
}

interface ExcavationProject {
  id: string;
  name: string;
  location: { lat: number; lng: number };
  type: 'excavation' | 'tunnel' | 'foundation';
  status: 'planning' | 'excavating' | 'supporting' | 'completed' | 'suspended';
  depth: number;
  area: number;
  progress: number;
  startDate: string;
  estimatedCompletion: string;
  contractor: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  weather?: WeatherData;
  workers: number;
  equipment: string[];
  marker?: any;
}

interface SystemStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalDepth: number; // 总挖掘深度
  averageProgress: number;
  criticalAlerts: number;
}

// 防重入：在 React 严格模式下，初次挂载阶段的 effect 可能被调用两次（装载-卸载-再装载）。
// 使用模块级开关，避免 initializeMap 并发或重复初始化造成的循环与事件风暴。
let __AMAP_INIT_IN_PROGRESS = false;

export const DeepCADControlCenter: React.FC<DeepCADControlCenterProps> = ({ onExit }) => {
  // —— 轻量主题与布局常量 ——
  const PADDING = 16; // 统一边距
  const TOPBAR_H = 64; // 顶部状态栏高度（px）
  const PANEL_W = 22; // 左右面板宽度（百分比）
  const topOffset = TOPBAR_H + PADDING; // 地图与 Deck 画布距顶部偏移
  const GLASS_BG = 'rgba(6, 19, 38, 0.75)';
  const GLASS_BORDER = '1px solid rgba(0, 188, 255, 0.25)';
  const CARD_SHADOW = '0 8px 32px rgba(0, 0, 0, 0.45)';
  // 内联小组件：轮播 KPI 标题
  const RotatingHeadline: React.FC<{stats: SystemStats}> = ({stats}) => {
    const items = useMemo(()=>[
      `控制中心 · 项目总数 ${stats.totalProjects}`,
      `活跃 ${stats.activeProjects} · 完成 ${stats.completedProjects}`,
      `总深度 ${stats.totalDepth}m · 平均进度 ${stats.averageProgress}%`,
      `高风险 ${stats.criticalAlerts}`
    ], [stats]);
    const [idx,setIdx]=useState(0);
    useEffect(()=>{ const t = setInterval(()=> setIdx(i=>(i+1)%items.length), 4000); return ()=> clearInterval(t); },[items.length]);
    return (
      <div style={{
        fontSize: '24px',
        fontWeight: 'bold',
        background: 'linear-gradient(45deg,#00eaff,#0077ff)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        textShadow: '0 0 10px rgba(0,170,255,0.5)',
        letterSpacing:'1px',
        minHeight:34
      }}>
        {items[idx]}
      </div>
    );
  };
  // 地图容器引用
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null); // 高德地图实例
  const deckRef = useRef<Deck | null>(null);
  const deckLayerAdapterRef = useRef<DeckGlLayerAdapter | null>(null);
  // AMap Buildings 图层引用，便于动态高度倍率调整
  const buildingsLayerRef = useRef<any | null>(null);
  // AMap 3D 光柱与扫描圈资源
  const beamsLayerRef = useRef<any | null>(null);
  const beamPrismsRef = useRef<any[]>([]);
  const beamCirclesRef = useRef<any[]>([]);
  const beamAnimTimerRef = useRef<number | null>(null);
  const glCustomLayerRef = useRef<any | null>(null);
  // AMap 卫星/道路图层引用
  const satLayerRef = useRef<any | null>(null);
  const roadNetLayerRef = useRef<any | null>(null);
  // 保持3D视角的定时器引用，便于清理
  const maintain3DTimerRef = useRef<number | null>(null);

  // 清理 HUD 画布上的 ResizeObserver（避免内存泄漏）
  useEffect(() => {
    return () => {
      const el = document.getElementById('map-hud-canvas') as any;
      if (el && el._ro && typeof el._ro.disconnect === 'function') {
        try { el._ro.disconnect(); } catch {}
      }
    };
  }, []);

  // 状态管理
  const [isInitialized, setIsInitialized] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const ctrl = useControlCenterStore(useShallow((s)=>({
    selectedProjectId: s.selectedProjectId,
    setSelectedProjectId: s.setSelectedProjectId,
    searchTerm: s.searchTerm,
    setSearchTerm: s.setSearchTerm,
    statusFilter: s.statusFilter,
    setStatusFilter: s.setStatusFilter,
    riskFilter: s.riskFilter,
    setRiskFilter: s.setRiskFilter,
    showWeatherPanel: s.showWeatherPanel,
    setShowWeatherPanel: s.setShowWeatherPanel,
    showProjectDetails: s.showProjectDetails,
    setShowProjectDetails: s.setShowProjectDetails,
  })));
  const { selectedProjectId, setSelectedProjectId, searchTerm, setSearchTerm, statusFilter, setStatusFilter, riskFilter, setRiskFilter, showWeatherPanel, setShowWeatherPanel, showProjectDetails, setShowProjectDetails } = ctrl;
  const [isFlying, setIsFlying] = useState(false);
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
  const [progressHistory, setProgressHistory] = useState<number[]>([]);
  // 浮动项目管理面板显示状态
  const [showFloatingProjectPanel, setShowFloatingProjectPanel] = useState(false);
  const [showFloatingQuickPanel, setShowFloatingQuickPanel] = useState(false);
  const [is3DMode, setIs3DMode] = useState(true);
  const [currentPitch, setCurrentPitch] = useState(30);
  // 防抖/去抖用：仅当值变化时才更新，避免事件风暴导致的级联渲染
  const currentPitchRef = useRef(currentPitch);
  const is3DModeRef = useRef(is3DMode);
  useEffect(() => { currentPitchRef.current = currentPitch; }, [currentPitch]);
  useEffect(() => { is3DModeRef.current = is3DMode; }, [is3DMode]);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, delay: number}>>([]);
  // 延迟挂载背景（避免首帧 effect 链条产生的级联更新）
  const [showBG, setShowBG] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShowBG(true));
    return () => cancelAnimationFrame(id);
  }, []);
  // 当高德地图不可用时，启用 Deck 独立模式，避免离线遮罩挡住可视层
  const [deckStandaloneMode, setDeckStandaloneMode] = useState(false);
  const basemapSwitchingRef = useRef(false);
  // 影院模式 & 命令面板（提升交互质感）
  const [isCinematic, setIsCinematic] = useState(false);
  const cinematicTimerRef = useRef<number | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandInput, setCommandInput] = useState('');
  const visual = useVisualSettingsStore(
    useShallow((s: any) => ({
      showEpicGlobe: s.showEpicGlobe,
      showLegacyParticles: s.showLegacyParticles,
      enablePostFX: s.enablePostFX,
      showLayerDebugPanel: s.showLayerDebugPanel,
      theme: s.theme,
      minimalMode: s.minimalMode,
      twoPointFiveD: s.twoPointFiveD ?? true,
      basemap: s.basemap ?? 'satellite',
      floatingUI: s.floatingUI ?? true,
      showColumns: s.showColumns,
      showHex: s.showHex,
      showTechGrid: s.showTechGrid,
      showCityGlow: s.showCityGlow,
      showScreenFog: s.showScreenFog,
      showVignette: s.showVignette,
      showWeatherOverlay: s.showWeatherOverlay ?? true,
      showGlowPaths: s.showGlowPaths ?? true,
      showLandmarkBeams: s.showLandmarkBeams ?? true,
      buildingHeightFactor: s.buildingHeightFactor ?? 3,
      scanRingSpeed: s.scanRingSpeed ?? 1,
      flylineSpeed: s.flylineSpeed ?? 1,
      flylineWidth: s.flylineWidth ?? 2,
      flylineCount: s.flylineCount ?? 10,
      beamGlowIntensity: s.beamGlowIntensity ?? 1,
      toggle: s.toggle,
      set: s.set,
    }))
  );
  const {
    showEpicGlobe,
    showLegacyParticles,
    enablePostFX,
    showLayerDebugPanel,
    theme,
    minimalMode,
    twoPointFiveD,
    basemap,
    floatingUI,
    showColumns,
    showHex,
    showTechGrid,
    showCityGlow,
    showScreenFog,
    showVignette,
    showWeatherOverlay,
    showGlowPaths,
    showLandmarkBeams,
    buildingHeightFactor,
    scanRingSpeed,
    flylineSpeed,
    flylineWidth,
    flylineCount,
    beamGlowIntensity,
    toggle,
  } = visual as any;
  const setVisual = (visual as any).set as ((p: any) => void);
  // 从服务加载真实或本地化项目 -> 转换为统一结构
  const [loadedProjects, setLoadedProjects] = useState<ExcavationProject[] | null>(null);
  const selectedProject = useMemo(()=> (loadedProjects||[]).find(p=>p.id===selectedProjectId) || null, [loadedProjects, selectedProjectId]);
  // 主题色板
  const palette = useMemo(() => {
    if (theme === 'business') {
      return {
        accent: [0, 170, 255, 120] as [number,number,number,number],
        accent2: [0, 120, 220, 100] as [number,number,number,number],
        selection: [0, 255, 255, 255] as [number,number,number,number],
        scatterStroke: [220, 240, 255, 140] as [number,number,number,number],
      };
    }
    if (theme === 'minimal') {
      return {
        accent: [0, 200, 200, 100] as [number,number,number,number],
        accent2: [0, 120, 160, 90] as [number,number,number,number],
        selection: [0, 230, 230, 255] as [number,number,number,number],
        scatterStroke: [200, 230, 240, 120] as [number,number,number,number],
      };
    }
    // dark (默认)
    return {
      accent: [0, 170, 255, 120] as [number,number,number,number],
      accent2: [0, 100, 200, 100] as [number,number,number,number],
      selection: [0, 255, 255, 255] as [number,number,number,number],
      scatterStroke: [255, 255, 255, 150] as [number,number,number,number],
    };
  }, [theme]);
  const appBackground = useMemo(()=>{
    if (theme === 'minimal') {
      return 'linear-gradient(135deg, #0a0f1a 0%, #0b1e2e 50%, #0a0f1a 100%)';
    }
    if (theme === 'business') {
      return 'linear-gradient(135deg, #071a2f 0%, #0a2b4a 50%, #0c3a66 100%)';
    }
    // dark (default)
    return `
      radial-gradient(circle at 20% 80%, rgba(0, 100, 200, 0.3) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(0, 150, 255, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(0, 170, 255, 0.25) 0%, transparent 50%),
      linear-gradient(135deg, #000011 0%, #001133 30%, #002255 60%, #003377 100%)
    `;
  }, [theme]);
  const epicProjects = useMemo(() => (loadedProjects || []).slice(0, minimalMode ? 24 : 50).map(p => ({
    id: p.id,
    name: p.name,
    lat: p.location.lat,
    lng: p.location.lng,
    depth: p.depth,
    status: p.status === 'excavating' ? 'active' : (p.status === 'supporting' ? 'active' : p.status),
    progress: p.progress,
    description: `${p.depth}m 深，进度 ${p.progress}%`
  })), [loadedProjects]);

  // 生成粒子效果
  useEffect(() => {
    const generateParticles = () => {
  // 减少数量，避免干扰视觉主体
  const newParticles = Array.from({ length: 20 }, (_, i) => ({
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

  // 实际项目加载逻辑
  useEffect(() => {
    (async () => {
      try {
        const items: ProjectItem[] = await fetchProjectItems();
        // 转换为 ExcavationProject
        const converted: ExcavationProject[] = items.map((p, idx) => {
          const riskPool: ExcavationProject['riskLevel'][] = ['low','medium','high','critical'];
            return {
              id: p.id,
              name: p.name,
              location: { lat: p.latitude, lng: p.longitude },
              type: 'excavation',
              status: (p.status as any) === 'active' ? 'excavating' : (p.status as any || 'planning'),
              depth: p.depth ?? Math.round(10+Math.random()*30),
              area: p.area ?? Math.round(500+Math.random()*4500),
              progress: p.progress ?? Math.round(Math.random()*100),
              startDate: p.startDate || '2024-01-01',
              estimatedCompletion: p.endDate || '2025-12-31',
              contractor: p.manager ? p.manager + '团队' : '中建集团',
              riskLevel: riskPool[(idx + p.name.length) % riskPool.length],
              workers: Math.round(20+Math.random()*80),
              equipment: ['挖掘机','塔吊','混凝土泵车'].slice(0, 1+Math.floor(Math.random()*3))
            };
        });
        setLoadedProjects(converted);
      } catch (e) {
        console.warn('加载项目数据失败，继续使用内置随机: ', e);
      }
    })();
  }, []);
  const projects = loadedProjects || [];

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
  setProgressHistory(prev => [...prev.slice(-59), stats.averageProgress]);
  }, [projects]);

  // 数据就绪后，自动定位到第一个项目，避免初始停留在默认北京中心（确保只触发一次）
  const initialSelectStartedRef = useRef(false);
  useEffect(() => {
    if (!isInitialized) return;
    const map = mapRef.current;
    if (!map) return;
    if (!loadedProjects || !loadedProjects.length) return;
    if (selectedProjectId) return;
    if (initialSelectStartedRef.current) return;
    initialSelectStartedRef.current = true;
    const p = loadedProjects[0];
    try {
      map.setZoomAndCenter(p.area && p.area > 1000 ? 15 : 16, [p.location.lng, p.location.lat], false, 1200);
    } catch {
      try { map.setCenter([p.location.lng, p.location.lat]); } catch {}
    }
    // 延迟到动画完成后再写入选中，避免在 effect mount 阶段立即触发 store 循环
    let t: any = null;
    const onEnd = () => {
      if (t) { try { clearTimeout(t); } catch {} t = null; }
      try { map.off('moveend', onEnd as any); map.off('zoomend', onEnd as any); } catch {}
      try { setSelectedProjectId(p.id); } catch {}
    };
    try { map.on('moveend', onEnd as any); map.on('zoomend', onEnd as any); } catch {}
    t = setTimeout(onEnd, 1800);
    return () => { try { map.off('moveend', onEnd as any); map.off('zoomend', onEnd as any); } catch {}; if (t) { try { clearTimeout(t); } catch {} } };
  }, [isInitialized, loadedProjects, selectedProjectId]);


  /**
   * 初始化高德地图 - 暗色科技风主题
   */
  const initializeMap = useCallback(async () => {
    if (!mapContainerRef.current || mapRef.current) return;
    if (__AMAP_INIT_IN_PROGRESS) {
      console.log('⏳ AMap 初始化已在进行中，跳过重复调用');
      return;
    }
    __AMAP_INIT_IN_PROGRESS = true;

    try {
      // 如果配置禁用AMap，则直接进入离线模式（Deck.gl 独立控制 + OSM 瓦片）
      const disableAmap = String((import.meta as any).env?.VITE_DISABLE_AMAP ?? '').toLowerCase() === 'true';
      if (disableAmap) {
        console.log('🛑 VITE_DISABLE_AMAP=true，跳过 AMap 加载，进入离线模式');
        setMapError('已启用离线模式（AMap已禁用）');
        setDeckStandaloneMode(true);
  await initializeDeck({ controllerEnabled: true });
  await loadProjectsWeatherData();
        setIsInitialized(true);
        return;
      }
      console.log('🗺️ 初始化高德地图大屏版...');

      // 若提供了安全密钥，则启用 AMap v2 安全配置（必须在 AMapLoader.load 之前设置）
      const secCode = (import.meta as any).env?.VITE_AMAP_SECURITY_JS_CODE as string | undefined;
      if (secCode) {
        (window as any)._AMapSecurityConfig = { securityJsCode: secCode };
        console.log('🔐 已注入 AMap 安全密钥配置');
      } else {
        console.log('ℹ️ 未检测到 VITE_AMAP_SECURITY_JS_CODE，按无安全校验模式加载');
      }

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

      // 以首个项目为默认中心（若无则回退北京），避免默认落在北京
      const defaultCenter: [number, number] = filteredProjects[0]
        ? [filteredProjects[0].location.lng, filteredProjects[0].location.lat]
        : [116.4074, 39.9042];

      // 创建高德地图实例 - 平面模式（禁用建筑体）
      const map = new AMap.Map(mapContainerRef.current, {
        center: defaultCenter,
  zoom: 16,
  // 使用3D引擎便于 Deck.gl 同步：twoPointFiveD 时给一个小俯仰
  pitch: twoPointFiveD ? 30 : 0,
        viewMode: '3D',
        // 道路底图走暗色样式；卫星底图不设置样式
        mapStyle: (basemap === 'road') ? 'amap://styles/dark' : undefined as any,
        showLabel: true,
        showIndoorMap: false,
        // 仅背景/道路/兴趣点；不绘制建筑
        features: (basemap === 'road') ? ['bg', 'road', 'point'] : ['point'],
        // 关闭建筑体渲染
        showBuildingBlock: false,
        buildingAnimation: false,
        expandZoomRange: true,
        terrain: true,
        // 额外的3D配置
        rotateEnable: true,
        pitchEnable: true,
        // 建筑配色不再生效（已禁用建筑）
      });

      mapRef.current = map;

      // 注入卫星/道路覆盖图层（仅卫星模式需要）
      try {
        if (basemap === 'satellite') {
          satLayerRef.current = new (AMap as any).TileLayer.Satellite();
          roadNetLayerRef.current = new (AMap as any).TileLayer.RoadNet({ opacity: 0.9 });
          satLayerRef.current.setMap(map);
          roadNetLayerRef.current.setMap(map);
        }
      } catch {}

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

      // 保持平面视角，不加载建筑物图层
      map.on('complete', () => {
        try {
          map.setPitch(twoPointFiveD ? 30 : 0);
          map.setZoom(16);
          setCurrentPitch(twoPointFiveD ? 30 : 0);
          setIs3DMode(!!twoPointFiveD);
        } catch {}
        console.log('🗺️ 地图加载完成（平/2.5D 模式，无建筑物）');
      });

  console.log('✅ 高德地图加载完成（', basemap, '）');

  // 初始化Deck.gl可视化层
  await initializeDeck();
  setDeckStandaloneMode(false);

      // 使用高德天气API加载项目天气数据
      await loadProjectsWeatherData();

  // 默认选中项目的逻辑改为在初始化完成后、单独的 effect 中处理，避免初始化阶段触发循环更新

  setIsInitialized(true);
      console.log('🚀 大屏项目管理中心初始化完成');

    } catch (error) {
      console.error('❌ 地图初始化失败:', error);
      // 不直接操作DOM，让React处理错误状态
      setMapError('地图服务不可用，已切换到离线可视模式');
      // 离线回退：启用 Deck.gl 独立控制，继续展示数据层
      try {
        setDeckStandaloneMode(true);
        await initializeDeck({ controllerEnabled: true });
        setIsInitialized(true);
        console.log('🧭 已启用 Deck.gl 离线模式');
      } catch (e) {
        console.error('❌ 离线 Deck.gl 初始化失败:', e);
      }
    }
    finally {
      // 若已成功创建了 mapRef.current，则后续即便再次调用也会因上方判定而返回。
      // 这里将进度标记还原，允许「真实卸载后」的下一次进入重新初始化。
      __AMAP_INIT_IN_PROGRESS = false;
    }
  }, []);

  // 建筑体已禁用：若存在残留图层则移除
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (buildingsLayerRef.current) {
        try { map.remove(buildingsLayerRef.current); } catch {}
        buildingsLayerRef.current = null;
      }
    } catch {}
  }, [buildingHeightFactor]);

  // 当启用浮动UI时，默认打开浮动项目面板和快捷控制面板
  const openedOnceRef = useRef(false);
  useEffect(() => {
    if (openedOnceRef.current) return;
    if (floatingUI) {
      setShowFloatingProjectPanel(true);
      setShowFloatingQuickPanel(true);
    }
    openedOnceRef.current = true;
  }, [floatingUI]);

  // 底图切换响应：在不销毁地图的情况下切换卫星/道路
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (basemapSwitchingRef.current) return;
    basemapSwitchingRef.current = true;
    try {
      // 清理旧图层
      if (satLayerRef.current) { try { map.remove(satLayerRef.current); } catch {} satLayerRef.current = null; }
      if (roadNetLayerRef.current) { try { map.remove(roadNetLayerRef.current); } catch {} roadNetLayerRef.current = null; }
      if (basemap === 'satellite') {
        // 卫星 + 道路叠加
        try {
          satLayerRef.current = new (window as any).AMap.TileLayer.Satellite();
          roadNetLayerRef.current = new (window as any).AMap.TileLayer.RoadNet({ opacity: 0.9 });
          satLayerRef.current.setMap(map);
          roadNetLayerRef.current.setMap(map);
        } catch {}
        try { map.setMapStyle(undefined as any); } catch {}
        try { map.setFeatures(['point']); } catch {}
      } else {
        // 道路暗色
        try { map.setMapStyle('amap://styles/dark'); } catch {}
        try { map.setFeatures(['bg', 'road', 'point']); } catch {}
      }
      // 同步一次 Deck 独立模式底图
      if (deckStandaloneMode) {
        initializeDeck({ controllerEnabled: true, forceStandalone: true });
      }
    } finally {
      // 让出一帧，避免严格模式下的双调用导致的重复触发
      setTimeout(() => { basemapSwitchingRef.current = false; }, 0);
    }
  }, [basemap]);

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
      return palette.selection; // 主题选择色
    }
    return color as [number, number, number, number];
  }, [selectedProject, palette.selection]);

  /**
   * 初始化Deck.gl可视化层 - 基坑项目专用
   */
  const initializeDeck = async (options?: { controllerEnabled?: boolean; forceStandalone?: boolean }) => {
    try {
      console.log('🎨 初始化基坑项目可视化层...');

  // 创建Deck.gl实例，覆盖在高德地图上或独立运行
  const deck = new Deck({
        canvas: 'deck-canvas',
        width: '100%',
        height: '100%',
        initialViewState: {
          longitude: filteredProjects[0]?.location.lng ?? 116.4074,
          latitude: filteredProjects[0]?.location.lat ?? 39.9042,
          zoom: 17,
          pitch: twoPointFiveD ? 30 : 0, // 2.5D 轻俯仰（默认可为0表示纯2D）
          bearing: 0
        },
  controller: options?.controllerEnabled ?? false, // 地图失败时启用Deck交互控制
  getTooltip: (info:any) => {
          const p = info?.object as ExcavationProject | undefined;
          if (!p) return null;
          return {
            text: `${p.name}\n深度: ${p.depth}m  进度: ${p.progress}%  风险: ${p.riskLevel}`,
          };
        },
  layers: [
          // 基坑项目散点图层
          new ScatterplotLayer({
            id: 'excavation-projects',
      data: filteredProjects.length > 800 ? filteredProjects.filter((_,i)=> i % 2 === 0) : filteredProjects, // 简单 LOD 采样
            getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
            getRadius: (d: ExcavationProject) => {
              // 根据基坑深度和面积计算显示大小
              const depthFactor = Math.log(d.depth + 1) * 500;
              const areaFactor = Math.log(d.area + 1) * 200;
              return Math.max(depthFactor, areaFactor);
            },
            getFillColor: getProjectStatusColor,
            getLineColor: palette.scatterStroke,
            getLineWidth: 2,
            stroked: true,
            filled: true,
            radiusScale: 1,
            radiusMinPixels: 8,
            radiusMaxPixels: 40, // 收敛散点可见尺寸，避免遮挡
            pickable: true,
      onClick: (info) => {
              if (info.object) {
                const project = info.object as ExcavationProject;
        setSelectedProjectId(project.id);
        emitSelection('deck-scatter', project.id);
                setShowProjectDetails(true);
                console.log('🎯 选中项目:', project.name);
              }
            },
            onHover: (_info) => {
              // 悬停效果可以在这里添加
            },
            updateTriggers: {
              getFillColor: [selectedProject?.id],
              data: [filteredProjects]
            }
          }),

          // Heatmap layers will be appended asynchronously after lazy load to reduce initial bundle size

          // 🧊 六边形聚合层（热区）— 使用 HeatmapLayer 作为补充，Hex 聚合更具科技感
          // 注意：此 Hex 层通过 mapLayersUtil 懒加载 HeatmapLayer；为简洁此处先保留热力图，Hex 可在后续加入

          // ⚡ 动感飞线（PathLayer + dash 动画 + 叠加混合）
          new PathLayer({
            id: 'project-fly-lines',
            data: filteredProjects.slice(0, minimalMode ? Math.min(4, flylineCount) : Math.min(flylineCount, 20)).map((project, index) => {
              const maxCount = minimalMode ? Math.min(4, flylineCount) : Math.min(flylineCount, 20);
              const nextIndex = (index + 1) % Math.min(maxCount, filteredProjects.length);
              const next = filteredProjects[nextIndex];
              // 生成简易弧线（在中点垂直方向偏移）
              const src: [number, number] = [project.location.lng, project.location.lat];
              const tgt: [number, number] = [next.location.lng, next.location.lat];
              const mid: [number, number] = [(src[0] + tgt[0]) / 2, (src[1] + tgt[1]) / 2];
              const dLng = tgt[0] - src[0];
              const dLat = tgt[1] - src[1];
              const len = Math.hypot(dLng, dLat) || 1;
              const nx = -dLat / len; // 垂直法向
              const ny = dLng / len;
              const curvature = minimalMode ? 0.12 : 0.18; // 弧度强度
              const ctrl: [number, number] = [mid[0] + nx * len * curvature, mid[1] + ny * len * curvature];
              const steps = 16;
              const path: [number, number][] = [];
              for (let t = 0; t <= steps; t++) {
                const u = t / steps;
                // 二次贝塞尔插值
                const x = (1 - u) * (1 - u) * src[0] + 2 * (1 - u) * u * ctrl[0] + u * u * tgt[0];
                const y = (1 - u) * (1 - u) * src[1] + 2 * (1 - u) * u * ctrl[1] + u * u * tgt[1];
                path.push([x, y]);
              }
              return { path, value: (project.progress + next.progress) / 2 };
            }),
            getPath: (d: any) => d.path,
            getColor: (d: any) => d.value > 66 ? [0,255,200,180] : d.value > 33 ? [0,180,255,160] : [0,120,255,140],
            getWidth: (d: any) => Math.max(1, (d.value / 24) * Math.max(0.5, Math.min(4, Number(flylineWidth) || 2))),
            widthUnits: 'pixels',
            rounded: true,
            capRounded: true,
            jointRounded: true,
            parameters: { depthTest: false, blend: true, blendFunc: [770, 1], blendEquation: 32774 },
            extensions: [new PathStyleExtension({ dash: true })],
            dashJustified: true,
            getDashArray: () => [8, 6],
            dashOffset: 0
          } as any)
        ]
      });

      // 条件追加：Hex 聚合与 3D 柱体
  const baseLayers = deck.props.layers ? [...deck.props.layers] : [];
  // 独立模式判定：显式强制 或 已在独立模式状态 或 当前没有 AMap 实例
  const useStandalone = !!(options?.forceStandalone || deckStandaloneMode || !mapRef.current);
  // 如果当前为 Deck 独立模式，插入底图瓦片
      if (useStandalone) {
        try {
          const mkTile = (id: string, url: string) => new (TileLayer as any)({
            id,
            data: url,
            minZoom: 0,
            maxZoom: 19,
            tileSize: 256,
            renderSubLayers: (props: any) => {
              const { bbox: { west, south, east, north } } = props.tile;
              return new BitmapLayer(props, { id: `${props.id}-bitmap`, image: props.data, bounds: [west, south, east, north] });
            }
          });
          if (basemap === 'satellite') {
            baseLayers.unshift(mkTile('amap-road-overlay', 'https://webrd02.is.autonavi.com/appmaptile?style=8&x={x}&y={y}&z={z}'));
            baseLayers.unshift(mkTile('amap-sat-tiles', 'https://webst02.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}'));
          } else {
            baseLayers.unshift(mkTile('carto-dark-tiles', 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'));
            baseLayers.unshift(mkTile('osm-tiles', 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'));
          }
        } catch (e) {
          console.warn('TileLayer unavailable:', e);
        }
      }
      if (showHex) {
        baseLayers.push(new HexagonLayer({
          id: 'hex-hotspots',
          data: filteredProjects,
          getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
          getElevationWeight: (d: ExcavationProject) => Math.max(1, (d.riskLevel === 'critical' ? 4 : d.riskLevel === 'high' ? 2 : 1) * (d.progress / 25 + 0.5)),
          elevationScale: minimalMode ? 20 : 40,
          extruded: true,
          radius: minimalMode ? 200 : 300,
          coverage: 0.85,
          colorRange: theme === 'business'
            ? [[0,120,220,80],[0,150,240,120],[0,180,255,160],[0,210,255,200],[50,240,255,220]]
            : [[0,180,255,60],[0,210,255,120],[0,240,255,160],[100,255,220,200],[180,255,200,220]],
          pickable: false,
          opacity: 0.8
        } as any));
      }
      if (showColumns) {
        baseLayers.push(new ColumnLayer({
          id: 'project-columns',
          data: filteredProjects,
          diskResolution: 12,
          radius: 120,
          extruded: true,
          elevationScale: 30,
          getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
          getFillColor: (d: ExcavationProject) => getProjectStatusColor(d),
          getLineColor: palette.scatterStroke,
          getElevation: (d: ExcavationProject) => Math.max(50, d.depth * 10),
          wireframe: true,
          opacity: 0.6,
          visible: true
        } as any));
      }
      // 天气表情覆盖（可选叠加）
      if (showWeatherOverlay) {
        try {
          const weatherPoints = filteredProjects
            .map(p => ({ p, w: weatherDataMap.get(p.id) }))
            .filter(d => !!d.w) as Array<{p: ExcavationProject; w: WeatherData}>;
          baseLayers.push(new TextLayer({
            id: 'weather-emoji',
            data: weatherPoints,
            getPosition: (d: any) => [d.p.location.lng, d.p.location.lat],
            getText: (d: any) => d.w.icon || '⛅',
            getSize: () => (minimalMode ? 16 : 18),
            getColor: () => [255, 255, 255, 220],
            sizeUnits: 'pixels',
            billboard: true,
            parameters: { depthTest: false }
          } as any));
        } catch {}
      }

      if (baseLayers.length) deck.setProps({ layers: baseLayers });

  // 异步懒加载 HeatmapLayer 并追加
  (async () => {
        try {
          const { HeatmapLayer } = await getDeckLayers();
          const riskLayer = new HeatmapLayer({
            id: 'risk-heatmap',
            data: filteredProjects.filter(p => p.riskLevel === 'high' || p.riskLevel === 'critical'),
            getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
            getWeight: (d: ExcavationProject) => d.riskLevel === 'critical' ? 2 : 1,
            radiusPixels: 100,
            intensity: 0.3,
            threshold: 0.1,
            colorRange: [
              [255, 255, 0, 50],
              [255, 150, 0, 100],
              [255, 50, 0, 150]
            ]
          });
          const weatherLayer = new HeatmapLayer({
            id: 'weather-temperature',
            data: filteredProjects.map(project => {
              const weather = weatherDataMap.get(project.id);
              return weather ? { position: [project.location.lng, project.location.lat], weight: weather.temperature } : null;
            }).filter(Boolean),
            getPosition: (d: any) => d.position,
            getWeight: (d: any) => d.weight,
            radiusPixels: 100,
            intensity: 1.2,
            threshold: 0.02,
            colorRange: [
              [0, 100, 255, 120],
              [0, 200, 255, 140],
              [100, 255, 200, 160],
              [255, 255, 100, 180],
              [255, 150, 0, 200],
              [255, 50, 50, 220]
            ]
          });
          deck.setProps({ layers: [...(deck.props.layers || []), riskLayer, weatherLayer] });
          console.log('🔥 Heatmap layers (risk & weather) loaded lazily');
        } catch (e) {
          console.warn('HeatmapLayer lazy load failed:', e);
        }
      })();

      deckRef.current = deck;
      if (!deckLayerAdapterRef.current) {
        deckLayerAdapterRef.current = new DeckGlLayerAdapter('deckGL', () => deck);
      }

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

  // 事件监听在统一的防抖 useEffect 中绑定，避免重复绑定与风暴

  console.log('✅ 基坑项目可视化层初始化完成');

    } catch (error) {
      console.error('❌ Deck.gl初始化失败:', error);
    }
  };

  // 选中脉冲光环动画
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setPulse((p) => (p + 0.02) % (Math.PI * 2));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // 飞线尾迹相位（驱动粒子沿线运动）
  const [flyPhase, setFlyPhase] = useState(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      setFlyPhase((t) => (t + 0.01) % 1);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  /**
   * 同步高德地图和Deck.gl的视图状态
   */
  const syncMapView = useCallback(() => {
    if (!mapRef.current || !deckRef.current) return;

    try {
      const center = mapRef.current.getCenter();
      const zoom = mapRef.current.getZoom();
  const pitch = mapRef.current.getPitch?.() ?? (twoPointFiveD ? 30 : 0);
      const rotation = mapRef.current.getRotation() || 0;

      // 直接同步 pitch（允许为0，保持平/2.5D）
      const safePitch = Math.max(0, Math.min(40, pitch));

      deckRef.current.setProps({
        viewState: {
          longitude: center.lng,
          latitude: center.lat,
          zoom: zoom,
          pitch: safePitch, // 使用安全的pitch值
          bearing: -rotation // 高德地图的旋转方向与Deck.gl相反
        }
      });

    // 更新状态（仅在变化时设置，避免无意义的再次渲染触发）
    if (currentPitchRef.current !== safePitch) {
      setCurrentPitch(safePitch);
    }
    const next3D = !!(twoPointFiveD && safePitch > 5);
    if (is3DModeRef.current !== next3D) {
      setIs3DMode(next3D);
    }
    } catch (error) {
      console.warn('地图视图同步失败:', error);
    }
  }, [twoPointFiveD]);

  // —— 小工具：基于米的便捷经纬度偏移（近似） ——
  const metersToLngLatDelta = useCallback((meters: number, lat: number) => {
    const dLat = meters / 111111; // 每米对应的纬度度数
    const dLng = meters / (111111 * Math.cos((lat * Math.PI) / 180));
    return { dLat, dLng };
  }, []);

  // —— AMap 真实光柱 + 扫描环：在启用 showLandmarkBeams 且存在 AMap 时生效 ——
  useEffect(() => {
    const AMapNS: any = (window as any).AMap;
    // 条件：地图实例存在、未处于 Deck 独立模式、开关开启且 AMap 对象3D可用
    const enableAMapBeams = !!(mapRef.current && !deckStandaloneMode && showLandmarkBeams && AMapNS && AMapNS.Object3DLayer);

    // 清理函数（移除所有光柱与圈层）
    const cleanup = () => {
      try {
        if (beamAnimTimerRef.current) {
          window.clearInterval(beamAnimTimerRef.current);
          beamAnimTimerRef.current = null;
        }
      } catch {}
      try { if (glCustomLayerRef.current && mapRef.current) { mapRef.current.remove(glCustomLayerRef.current); } } catch {}
      glCustomLayerRef.current = null;
      try {
        beamCirclesRef.current.forEach((c) => c && c.setMap && c.setMap(null));
      } catch {}
      beamCirclesRef.current = [];
      try {
        if (beamsLayerRef.current) {
          // Prism 需从 layer 中移除
          try { beamPrismsRef.current.forEach((p) => p && beamsLayerRef.current.remove(p)); } catch {}
          if (mapRef.current) {
            try { mapRef.current.remove(beamsLayerRef.current); } catch {}
          }
        }
      } catch {}
      beamsLayerRef.current = null;
      beamPrismsRef.current = [];
    };

    cleanup();
    if (!enableAMapBeams) return;

    try {
  const layer = new AMapNS.Object3DLayer({ zIndex: 120 });
      mapRef.current.add(layer);
      beamsLayerRef.current = layer;

  const targets = filteredProjects.slice(0, Math.min(3, filteredProjects.length));
      targets.forEach((p) => {
        const { dLat, dLng } = metersToLngLatDelta(20, p.location.lat); // 约 20m 方形底座
        const base: [number, number][] = [
          [p.location.lng - dLng, p.location.lat - dLat],
          [p.location.lng + dLng, p.location.lat - dLat],
          [p.location.lng + dLng, p.location.lat + dLat],
          [p.location.lng - dLng, p.location.lat + dLat]
        ];
        // 光柱：Prism（可见高度按主题/模式调整）
        const height = minimalMode ? 800 : 1400; // 米
        const prism = new AMapNS.Object3D.Prism({
          path: base,
          height,
          color: 'rgba(0,255,255,0.28)'
        });
        prism.transparent = true;
        layer.add(prism);
        beamPrismsRef.current.push(prism);

        // 扫描环：两个同心 Circle 循环扩散
        const c1 = new AMapNS.Circle({
          center: [p.location.lng, p.location.lat],
          radius: 30,
          strokeColor: '#00FFFF',
          strokeOpacity: 0.6,
          strokeWeight: 2,
          fillOpacity: 0,
          zIndex: 130
        });
        const c2 = new AMapNS.Circle({
          center: [p.location.lng, p.location.lat],
          radius: 60,
          strokeColor: '#00BFFF',
          strokeOpacity: 0.45,
          strokeWeight: 2,
          fillOpacity: 0,
          zIndex: 130
        });
        c1.setMap(mapRef.current);
        c2.setMap(mapRef.current);
        beamCirclesRef.current.push(c1, c2);
      });

      // 半径动画
      let t = 0;
      beamAnimTimerRef.current = window.setInterval(() => {
        const speed = Math.max(0.2, Math.min(4, Number(scanRingSpeed) || 1));
        t = (t + 0.04 * speed) % (Math.PI * 2);
        const baseR = minimalMode ? 180 : 260; // 最大半径
        beamCirclesRef.current.forEach((circle, i) => {
          try {
            const phase = t + (i % 2 === 0 ? 0 : Math.PI / 2);
            const r = 40 + (Math.sin(phase) + 1) * (baseR - 40) * 0.5;
            const alpha = 0.25 + (Math.cos(phase) + 1) * 0.25;
            circle.setOptions({ radius: r, strokeOpacity: alpha });
          } catch {}
        });
      }, 50);

      // 可选：GLCustomLayer 做屏幕空间发光加成（简版）
      try {
        const centers = targets.map(p => [p.location.lng, p.location.lat]);
        const custom = new AMapNS.GLCustomLayer({
          zIndex: 140,
          init: (_gl: WebGLRenderingContext) => {
            // 使用 2D canvas 叠加到 map container 顶部（简版实现），不直接绘 GL shader
            const c = document.createElement('canvas');
            c.id = 'amap-scan-glow';
            Object.assign(c.style, { position:'absolute', inset:'0', pointerEvents:'none' });
            (mapContainerRef.current as HTMLElement).appendChild(c);
            (custom as any)._c = c;
          },
          render: () => {
            const c: HTMLCanvasElement | null = (custom as any)._c || null;
            if (!c) return;
            const container = mapContainerRef.current as HTMLElement;
            const w = container.clientWidth, h = container.clientHeight;
            if (w <= 0 || h <= 0) return;
            if (c.width !== w) c.width = w;
            if (c.height !== h) c.height = h;
            const ctx = c.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0,0,w,h);
      const speed = Math.max(0.2, Math.min(4, Number(scanRingSpeed) || 1));
      const time = performance.now() * 0.001 * speed;
            centers.forEach(lnglat => {
              try {
                const px = mapRef.current.lngLatToContainer(lnglat);
        const intensity = Math.max(0.5, Number(beamGlowIntensity) || 1);
        const r = 40 + (Math.sin(time) + 1) * 20 * intensity;
        const core = Math.min(0.5, 0.25 * intensity);
        const g = ctx.createRadialGradient(px.x, px.y, r*core, px.x, px.y, r);
        g.addColorStop(0, `rgba(0,255,255,${0.2 * intensity})`);
                g.addColorStop(1, 'rgba(0,255,255,0)');
                ctx.fillStyle = g;
                ctx.beginPath(); ctx.arc(px.x, px.y, r, 0, Math.PI*2); ctx.fill();
              } catch {}
            });
          },
          destroy: () => {
            const c: HTMLCanvasElement | null = (custom as any)._c || null;
            if (c && c.parentElement) c.parentElement.removeChild(c);
          }
        });
        mapRef.current.add(custom);
        glCustomLayerRef.current = custom;
      } catch {}
    } catch (e) {
      console.warn('AMap beams init failed, fallback will rely on Deck ColumnLayer:', e);
      cleanup();
    }

    return cleanup;
  }, [showLandmarkBeams, filteredProjects, metersToLngLatDelta, minimalMode, deckStandaloneMode, scanRingSpeed, beamGlowIntensity]);

  /**
   * 重置地图视图到全国范围
   */
  const resetMapView = useCallback(() => {
    if (!mapRef.current) return;

    mapRef.current.setZoomAndCenter(6, [116.4074, 39.9042], false, 1000);
    // 重置后保持平/2.5D 视角
    setTimeout(() => {
      if (mapRef.current) {
  const p = twoPointFiveD ? 30 : 0;
        mapRef.current.setPitch(p);
        setCurrentPitch(p);
        setIs3DMode(twoPointFiveD);
      }
    }, 1200);
  setSelectedProjectId(null);
    setShowProjectDetails(false);
  }, []);

  // 在 twoPointFiveD 开关变化时，确保地图俯仰与状态一致（防止偶发还原为0度）
  useEffect(() => {
    if (!mapRef.current) return;
    try {
  const desired = twoPointFiveD ? 30 : 0;
      const cur = mapRef.current.getPitch?.() ?? 0;
      if (Math.abs(cur - desired) > 1) {
        mapRef.current.setPitch(desired);
      }
      setCurrentPitch(desired);
      setIs3DMode(twoPointFiveD);
    } catch {}
  }, [twoPointFiveD]);

  /**
   * 获取项目统计信息
   */
  // getProjectStats removed (unused after architecture refactor)

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
          weatherMap.set(project.id, getDefaultWeatherData());
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

  const stopCinematicTour = useCallback(() => {
    setIsCinematic(false);
    if (cinematicTimerRef.current) {
      clearTimeout(cinematicTimerRef.current);
      cinematicTimerRef.current = null;
    }
  }, []);

  /**
   * 飞行到指定项目 - 带炫酷动画
   */
  const flyToProject = useCallback((project: ExcavationProject) => {
    const map = mapRef.current;
    if (!map || isFlying) return;

    // 如果正在影院模式，先停止，避免相互打断造成“卡住”感
    try { if (isCinematic) stopCinematicTour(); } catch {}

    console.log(`✈️ 飞行到项目: ${project.name}`);
    setIsFlying(true);

    // 计算合适的缩放级别
    const zoomLevel = project.area > 1000 ? 14 : 16;

    // 监听飞行结束事件（更可靠），并设置超时兜底
    let finished = false;
    let timeoutId: number | null = null;
    const onEnd = () => {
      if (finished) return;
      finished = true;
      try {
        map.off('moveend', onEnd as any);
        map.off('zoomend', onEnd as any);
      } catch {}
      if (timeoutId !== null) {
        try { window.clearTimeout(timeoutId); } catch {}
        timeoutId = null;
      }
      setIsFlying(false);
      console.log(`🎯 已到达项目: ${project.name}`);
      // 如需轻量刷新，可在此进行（避免飞行中重建Deck导致卡顿）
      // initializeDeck(); // 若验证需要再开启
    };

    try {
      map.on('moveend', onEnd as any);
      map.on('zoomend', onEnd as any);
    } catch {}

  timeoutId = window.setTimeout(() => onEnd(), 3500); // 兜底

    // 预先通过小步动画平滑调整旋转和俯仰以提升过渡观感
  try {
      const startRot = map.getRotation?.() ?? 0;
      const targetRot = startRot + ((Math.random() > 0.5 ? 1 : -1) * 45);
      const steps = 12;
      for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const ease = t * (2 - t); // quadOut
        setTimeout(() => {
          try {
            map.setRotation(startRot + (targetRot - startRot) * ease);
            map.setPitch(twoPointFiveD ? 30 : 0);
          } catch {}
        }, i * 40);
      }
    } catch {}

    // 使用高德地图的平滑飞行动画
    try {
      map.setZoomAndCenter(
        zoomLevel,
        [project.location.lng, project.location.lat],
        false,
        2500 // 2.5秒动画
      );
    } catch (e) {
      console.warn('setZoomAndCenter 调用失败，直接落位:', e);
      try { map.setZoom(zoomLevel); map.setCenter([project.location.lng, project.location.lat]); } catch {}
  // 直接触发完成
  if (timeoutId !== null) { try { window.clearTimeout(timeoutId); } catch {} }
      onEnd();
    }

    // 更新选中项目（Deck 的高亮依赖此状态，无需立刻重建图层）
    setSelectedProjectId(project.id);
    setShowProjectDetails(true);

  }, [isFlying, isCinematic, stopCinematicTour, setSelectedProjectId, setShowProjectDetails, twoPointFiveD]);

  // —— 影院模式：自动巡航浏览重点项目 ——
  const startCinematicTour = useCallback(() => {
    if (!mapRef.current || isCinematic) return;
    const targets = (filteredProjects.length ? filteredProjects : projects).slice(0, minimalMode ? 4 : 8);
    if (!targets.length) return;
    setIsCinematic(true);
    let i = 0;
    const step = () => {
      const p = targets[i % targets.length];
      const zoom = p.area > 1500 ? 14 : 16;
      try {
  mapRef.current!.setZoomAndCenter(zoom, [p.location.lng, p.location.lat], false, 2200);
  const basePitch = twoPointFiveD ? 30 : 0;
        const baseRot = (i * 60) % 360;
        setTimeout(() => {
          mapRef.current && mapRef.current.setPitch(basePitch);
          mapRef.current && mapRef.current.setRotation(baseRot);
          setSelectedProjectId(p.id);
          setShowProjectDetails(true);
        }, 600);
      } catch {}
      i += 1;
      cinematicTimerRef.current = window.setTimeout(step, 3000);
    };
    step();
  }, [filteredProjects, projects, minimalMode, isCinematic, setSelectedProjectId, setShowProjectDetails]);

  

  // ==== 将全局项目数据映射为浮动项目管理面板的数据结构 ====
  const panelProjects = useMemo(() => {
    return projects.slice(0, 120).map(p => ({
      id: p.id,
      name: p.name,
      description: `${p.depth}m深 / 进度${p.progress}% / 风险${p.riskLevel}`,
      location: `${p.location.lat.toFixed(2)},${p.location.lng.toFixed(2)}`,
      status: (p.status === 'excavating' || p.status === 'supporting') ? 'active' :
              (p.status === 'suspended' ? 'paused' : (p.status as any === 'planning' ? 'planning' : 'completed')),
      progress: p.progress,
      startDate: p.startDate,
      endDate: p.estimatedCompletion,
      manager: p.contractor.split('')[0] + '工',
      depth: p.depth,
      area: p.area
    }));
  }, [projects]);

  const handlePanelProjectSelect = useCallback((panelProject: any) => {
    const target = projects.find(p => p.id === panelProject.id);
    if (target) {
  flyToProject(target);
    }
  }, [projects, flyToProject]);

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

      // 清理保持3D视角的定时器
      if (maintain3DTimerRef.current) {
        try { window.clearInterval(maintain3DTimerRef.current); } catch {}
        maintain3DTimerRef.current = null;
      }
      // 移除可能残留的自定义叠加画布
      try {
        const glow = document.getElementById('amap-scan-glow');
        if (glow && glow.parentElement) glow.parentElement.removeChild(glow);
      } catch {}

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
  // 允许后续重新初始化
  __AMAP_INIT_IN_PROGRESS = false;
    };
  }, [initializeMap]);

  // 监听过滤条件变化，更新Deck.gl图层
  useEffect(() => {
    if (deckRef.current && isInitialized) {
      const baseScatterData = filteredProjects.length > 800 ? filteredProjects.filter((_,i)=> i % 2 === 0) : filteredProjects;
      const newScatter = new ScatterplotLayer({
        id: 'excavation-projects',
        data: baseScatterData,
        getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
        getRadius: (d: ExcavationProject) => {
          const depthFactor = Math.log(d.depth + 1) * 500;
          const areaFactor = Math.log(d.area + 1) * 200;
          return Math.max(depthFactor, areaFactor);
        },
        getFillColor: getProjectStatusColor,
        getLineColor: palette.scatterStroke,
        getLineWidth: 2,
        stroked: true,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 8,
        radiusMaxPixels: minimalMode ? 32 : 40,
        pickable: true,
        onClick: (info) => { if (info.object) { setSelectedProjectId((info.object as ExcavationProject).id); setShowProjectDetails(true);} },
        updateTriggers: { getFillColor: [selectedProject?.id] }
      });
      // 选中项目脉冲光环层（像素半径）
      const haloLayer = new ScatterplotLayer({
        id: 'selection-halo',
        data: selectedProject ? [selectedProject] : [],
        getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
        getFillColor: [0,0,0,0],
        getLineColor: palette.selection,
        getLineWidth: 2,
        stroked: true,
        filled: false,
        radiusUnits: 'pixels',
        radiusMinPixels: 0,
        radiusMaxPixels: 999,
        getRadius: () => 24 + Math.sin(pulse) * 8,
        updateTriggers: { getRadius: [pulse, selectedProject?.id] }
      });
      const newColumns = showColumns ? new ColumnLayer({
        id: 'project-depth-columns',
        data: filteredProjects.slice(0, minimalMode ? 10 : 20),
        getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
        getElevation: (d: ExcavationProject) => Math.max(minimalMode ? 300 : 400, d.depth * (minimalMode ? 60 : 80)),
        getFillColor: (d: ExcavationProject) => {
          const depth = d.depth;
            if (depth > 20) return [255, 50, 50, 220];
            if (depth > 15) return [255, 150, 0, 220];
            if (depth > 10) return [255, 255, 0, 210];
            return [0, 255, 100, 210];
        },
        getLineColor: [255,255,255,200],
        radius: minimalMode ? 80 : 100,
        elevationScale: minimalMode ? 1 : 1.2,
        wireframe: true,
        pickable: true,
        onClick: info => { if (info.object) setSelectedProjectId((info.object as any).id); }
      }) : null;
      // 预计算飞线数据（曲线路径）
      const linesData = filteredProjects.slice(0, minimalMode ? Math.min(4, flylineCount) : Math.min(flylineCount, 20)).map((project, index) => {
        const maxCount = minimalMode ? Math.min(4, flylineCount) : Math.min(flylineCount, 20);
        const nextIndex = (index + 1) % Math.min(maxCount, filteredProjects.length);
        const next = filteredProjects[nextIndex];
        const src: [number, number] = [project.location.lng, project.location.lat];
        const tgt: [number, number] = [next.location.lng, next.location.lat];
        const mid: [number, number] = [(src[0] + tgt[0]) / 2, (src[1] + tgt[1]) / 2];
        const dLng = tgt[0] - src[0];
        const dLat = tgt[1] - src[1];
        const len = Math.hypot(dLng, dLat) || 1;
        const nx = -dLat / len; const ny = dLng / len;
        const curvature = minimalMode ? 0.12 : 0.18;
        const ctrl: [number, number] = [mid[0] + nx * len * curvature, mid[1] + ny * len * curvature];
        const steps = 16; const path: [number, number][] = [];
        for (let t = 0; t <= steps; t++) {
          const u = t / steps;
          const x = (1 - u) * (1 - u) * src[0] + 2 * (1 - u) * u * ctrl[0] + u * u * tgt[0];
          const y = (1 - u) * (1 - u) * src[1] + 2 * (1 - u) * u * ctrl[1] + u * u * tgt[1];
          path.push([x, y]);
        }
        return { path, value: (project.progress + next.progress) / 2 };
      });
      const newArcs = showGlowPaths ? new PathLayer({
        id: 'project-fly-lines',
        data: linesData,
        getPath: (d: any) => d.path,
        getColor: (d:any) => d.value > 66 ? [0,255,200,200] : d.value > 33 ? [0,200,255,180] : [0,150,255,160],
  getWidth: (d: any) => Math.max(1, (d.value / 24) * Math.max(0.5, Math.min(4, Number(flylineWidth) || 2))),
        widthUnits: 'pixels',
        rounded: true,
        capRounded: true,
        jointRounded: true,
        parameters: { depthTest: false, blend: true, blendFunc: [770, 1], blendEquation: 32774 },
        extensions: [new PathStyleExtension({ dash: true })],
        dashJustified: true,
        getDashArray: () => [8, 6],
  dashOffset: flyPhase * 20 * Math.max(0.3, Math.min(4, Number(flylineSpeed) || 1)),
  updateTriggers: { dashOffset: [flyPhase, flylineSpeed], getWidth: [flylineWidth] },
        opacity: 0.95
      } as any) : null;
      // 保留懒加载 heatmap (如果已存在则在其 setProps 时会被替换)
      const existing = deckRef.current.props.layers || [];
      const heatmaps = existing.filter((l:any)=> l && (l.id==='risk-heatmap'|| l.id==='weather-temperature'));

      // 飞线尾迹粒子
  const flyLines: any[] = showGlowPaths ? linesData : [];
      // 计算路径长度表以便按相位插值
      const particleData = flyLines.map((ln:any) => {
        const path: [number, number][] = ln.path || [];
        const segLens: number[] = [];
        let total = 0;
        for (let i=1;i<path.length;i++){ const dx=path[i][0]-path[i-1][0]; const dy=path[i][1]-path[i-1][1]; const l=Math.hypot(dx,dy); segLens.push(l); total+=l; }
        return { path, segLens, total, value: ln.value };
      });
  const flyParticles = showGlowPaths ? new ScatterplotLayer({
        id: 'fly-particles',
        data: particleData,
        getPosition: (d:any) => {
          const T = Math.max(0, Math.min(1, flyPhase));
          if (!d.path || d.path.length < 2) return d.path?.[0] || [0,0];
          const targetLen = d.total * T;
          let acc = 0;
          for (let i=0;i<d.segLens.length;i++){
            const seg = d.segLens[i];
            if (acc + seg >= targetLen){
              const localT = (targetLen - acc) / (seg || 1);
              const a = d.path[i]; const b = d.path[i+1];
              const x = a[0] + (b[0]-a[0]) * localT;
              const y = a[1] + (b[1]-a[1]) * localT;
              return [x,y];
            }
            acc += seg;
          }
          return d.path[d.path.length-1];
        },
        getRadius: () => 40 + Math.sin(flyPhase * Math.PI * 2) * 10,
        getFillColor: (d:any) => d.value > 66 ? [0,255,200,220] : d.value > 33 ? [0,200,255,200] : [0,150,255,180],
        pickable: false,
        updateTriggers: { getPosition: [flyPhase], getRadius: [flyPhase] },
  parameters: { depthTest: false, blend: true, blendFunc: [770, 1], blendEquation: 32774 }
  }) : null;

      // Hex 聚合热区
      const getHexColorRange = () => {
        if (theme === 'business') return [[0,120,255,50],[0,160,255,100],[0,200,255,140],[0,240,255,180],[0,255,220,220],[0,255,180,240]];
        if (theme === 'minimal') return [[0,100,160,50],[0,130,180,90],[0,160,200,120],[0,190,210,150],[0,210,220,180],[0,230,230,210]];
        return [[0,90,255,50],[0,120,255,100],[0,160,255,140],[0,200,255,180],[0,240,255,220],[0,255,220,240]];
      };
      const hex = showHex ? new HexagonLayer({
        id: 'project-hex-aggregation',
        data: filteredProjects,
        getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
        getWeight: (d: ExcavationProject) => d.riskLevel === 'critical' ? 3 : d.riskLevel === 'high' ? 2 : 1,
        radius: minimalMode ? 400 : 600,
        elevationScale: minimalMode ? 30 : 50,
        extruded: true,
        colorRange: getHexColorRange() as any,
        coverage: 0.8,
        opacity: 0.7,
        pickable: false,
        parameters: { depthTest: false }
      }) : null;

  const layers = [newScatter, haloLayer, ...heatmaps];
      // 选中点扩散波纹（更强反馈）
      if (selectedProject) {
        const wave1 = new ScatterplotLayer({
          id: 'selection-wave1',
          data: [selectedProject],
          getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
          getFillColor: [0,0,0,0],
          getLineColor: [0, 255, 255, 180],
          getLineWidth: 1.5,
          stroked: true,
          filled: false,
          radiusUnits: 'pixels',
          radiusMinPixels: 0,
          radiusMaxPixels: 1200,
          getRadius: () => 32 + (Math.sin(pulse * 1.4) + 1) * 18,
          updateTriggers: { getRadius: [pulse, selectedProject.id] },
          parameters: { depthTest: false }
        });
        const wave2 = new ScatterplotLayer({
          id: 'selection-wave2',
          data: [selectedProject],
          getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
          getFillColor: [0,0,0,0],
          getLineColor: [0, 180, 255, 140],
          getLineWidth: 1,
          stroked: true,
          filled: false,
          radiusUnits: 'pixels',
          radiusMinPixels: 0,
          radiusMaxPixels: 1200,
          getRadius: () => 48 + (Math.sin(pulse * 1.7 + Math.PI/2) + 1) * 22,
          updateTriggers: { getRadius: [pulse, selectedProject.id] },
          parameters: { depthTest: false }
        });
        layers.push(wave1, wave2);
      }
      if (hex) layers.push(hex);
      if (newColumns) layers.push(newColumns);
  // 地标光柱（Deck.gl 演示版，仅在 AMap 不可用或独立模式下启用，避免与 AMap 真正光柱重复）
  const landmarkBeams = (showLandmarkBeams && (deckStandaloneMode || !(window as any).AMap)) ? new ColumnLayer({
        id: 'landmark-beams',
        data: filteredProjects.slice(0, Math.min(3, filteredProjects.length)),
        getPosition: (d: ExcavationProject) => [d.location.lng, d.location.lat],
        getElevation: () => (minimalMode ? 1200 : 1800),
        getFillColor: () => [0, 255, 255, 120],
        radius: minimalMode ? 120 : 160,
        elevationScale: 1,
        extruded: true,
        wireframe: false,
        pickable: false,
        parameters: { depthTest: false }
      }) : null;
  if (newArcs) layers.push(newArcs);
  if (flyParticles) layers.push(flyParticles);
  if (landmarkBeams) layers.push(landmarkBeams);

      // 天气表情覆盖（动态更新）
      if (showWeatherOverlay) {
        try {
          const weatherPoints = filteredProjects
            .map(p => ({ p, w: weatherDataMap.get(p.id) }))
            .filter(d => !!d.w) as Array<{p: ExcavationProject; w: WeatherData}>;
          const txt = new TextLayer({
            id: 'weather-emoji',
            data: weatherPoints,
            getPosition: (d: any) => [d.p.location.lng, d.p.location.lat],
            getText: (d: any) => d.w.icon || '⛅',
            getSize: () => (minimalMode ? 16 : 18),
            getColor: () => [255, 255, 255, 220],
            sizeUnits: 'pixels',
            billboard: true,
            parameters: { depthTest: false }
          } as any);
          layers.push(txt);
        } catch {}
      }
      deckRef.current.setProps({ layers });
    }
  }, [filteredProjects, isInitialized, getProjectStatusColor, selectedProject?.id, minimalMode, pulse, palette, showColumns, showHex, flyPhase, theme, showWeatherOverlay, weatherDataMap, flylineCount, flylineWidth, flylineSpeed]);

  // 启动项目数据轮询模拟 (增量更新)
  useEffect(()=>{
    startProjectPolling(fetchProjectItems, { onUpdate: (items)=> {
      // 仅刷新 loadedProjects -> downstream 统计 & 图层自动更新
      setLoadedProjects(prev => {
        if (!prev) return prev;
        const map = new Map(items.map(i=> [i.id,i]));
        return prev.map(p=> map.has(p.id) ? { ...p, progress: map.get(p.id)!.progress ?? p.progress } : p);
      });
    }});
    return ()=> stopProjectPolling();
  }, []);

  // 性能优化：防抖更新地图视图（并在卸载时移除监听）
  useEffect(() => {
    let timeoutId: number | null = null;
    const handler = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        syncMapView();
      }, 100);
    };

    const map = mapRef.current;
    if (map) {
      try {
        map.on('mapmove', handler);
        map.on('zoomchange', handler);
        map.on('rotatechange', handler);
      } catch {}
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (map) {
        try {
          map.off('mapmove', handler);
          map.off('zoomchange', handler);
          map.off('rotatechange', handler);
        } catch {}
      }
    };
  }, [syncMapView]);

  // 键盘快捷键支持
  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      // Ctrl+K 打开命令面板
      if ((event.ctrlKey || event.metaKey) && (event.key.toLowerCase() === 'k')) {
        event.preventDefault();
        setShowCommandPalette(true);
        setCommandInput('');
        return;
      }
      // ESC键退出
      if (event.key === 'Escape') {
        if (showCommandPalette) {
          setShowCommandPalette(false);
          return;
        }
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

      // T 键循环主题
      if (event.key === 't' || event.key === 'T') {
        const order: Array<typeof theme> = ['dark', 'minimal', 'business'];
        const idx = order.indexOf(theme);
        const next = order[(idx + 1) % order.length];
        setVisual({ theme: next });
      }

      // M 键切换简约模式
      if (event.key === 'm' || event.key === 'M') {
        setVisual({ minimalMode: !minimalMode });
      }

  // 数字键快速缩放（保持平面视角）
      if (event.key >= '1' && event.key <= '9') {
        const zoomLevel = parseInt(event.key) + 5; // 6-14级缩放
        mapRef.current?.setZoom(zoomLevel);
        // 确保缩放后保持3D效果
    // 缩放后保持平/2.5D 视角
        setTimeout(() => {
          if (mapRef.current) {
  const p = twoPointFiveD ? 30 : 0;
      mapRef.current.setPitch(p);
      setCurrentPitch(p);
      setIs3DMode(twoPointFiveD);
          }
        }, 300);
      }
    };

    window.addEventListener('keydown', handleKeyPress);

    return () => {
      window.removeEventListener('keydown', handleKeyPress);
    };
  }, [onExit, resetMapView, theme, minimalMode, setVisual, showCommandPalette]);

  // 组件卸载清理影院模式定时器
  useEffect(() => () => { if (cinematicTimerRef.current) clearTimeout(cinematicTimerRef.current); }, []);

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

  // 将 DeckGlLayerAdapter 注册为一个空的 Three 场景 (无需渲染内容，只参与统计)
  useThreeScene({ id: 'deck-gl-proxy', layers: deckLayerAdapterRef.current ? [deckLayerAdapterRef.current] : [], cameraInit: ()=>{} });

  return (
  <div data-isdmode={is3DMode ? '1' : '0'} style={{
      width: '100%',
      height: '100%',
      position: 'relative',
  background: appBackground as any,
      overflow: 'hidden',
      fontFamily: '"Orbitron", "Courier New", monospace',
      animation: 'dreamyBackground 12s ease-in-out infinite alternate'
    }}>
      {/* 3D R3F 背景可视化 (新的统一渲染架构) */}
  {showBG && (<BackgroundVisualization enableEffects={enablePostFX && !minimalMode} />)}

      {/* 可选：Epic Globe 场景（Layer 化示例） */}
      {showEpicGlobe && (
        <div style={{ position: 'absolute', inset: 0, zIndex: 5, pointerEvents: 'none' }}>
          <EpicGlobeScene projects={epicProjects} onProjectSelect={(p)=>{
            const match = projects.find(pr=>pr.id===p.id);
            if(match){ setSelectedProjectId(match.id); setShowProjectDetails(true); emitSelection('globe', match.id); }
          }} />
        </div>
      )}

      {/* 🌟 旧的CSS粒子星空背景效果 (后续可移除以减少DOM负载) */}
  {showLegacyParticles && !minimalMode && particles.map(particle => (
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
  {!minimalMode && Array.from({ length: 3 }, (_, i) => (
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

      {/* 🔮 能量波纹效果（简约模式隐藏） */}
      {!minimalMode && (
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
      )}

  {/* 🚀 DeepCAD Logo - 左上角 */}
  <PerformanceOverlay />
  {showLayerDebugPanel && <LayerDebugPanel />}
  <TimelineControlPanel />
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
  {/* 动态轮播 KPI 标题 */}
  <RotatingHeadline stats={systemStats} />
      </motion.div>

  {/* 🎮 视角/底图/面板 - 右上角 */}
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
            onClick={() => { isCinematic ? stopCinematicTour() : startCinematicTour(); }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 255, 180, 0.35) 0%, rgba(0, 160, 255, 0.35) 100%)',
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
          >
            🎬 {isCinematic ? '停止影院模式' : '启动影院模式'}
          </button>

          <button
            onClick={() => {
              setVisual({ basemap: basemap === 'satellite' ? 'road' : 'satellite' });
              // 切换逻辑由 basemap useEffect 实时处理
            }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 255, 180, 0.35) 0%, rgba(0, 160, 255, 0.35) 100%)',
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
          >
            🛰️ 底图: {basemap === 'satellite' ? '卫星' : '道路'}
          </button>

          <button
            onClick={() => { setShowCommandPalette(true); setCommandInput(''); }}
            className="neon-border"
            style={{
              background: 'linear-gradient(45deg, rgba(0, 200, 255, 0.3) 0%, rgba(255, 0, 200, 0.3) 100%)',
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
            ⌘K 命令面板
          </button>
          <button
            onClick={() => {
              if (mapRef.current) {
                if (mapRef.current) {
                  const next = !(twoPointFiveD);
                  setVisual({ twoPointFiveD: next });
                  const p = next ? 30 : 0;
                  mapRef.current.setPitch(p);
                  setCurrentPitch(p);
                  setIs3DMode(next);
                  console.log(next ? '🗺️ 切换为2.5D视图' : '🗺️ 切换为平面视图');
                }
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
            🗺️ 视角: {currentPitch}° {twoPointFiveD ? '(2.5D)' : '(2D)'}
          </button>

          {floatingUI && (
            <button
              onClick={() => setShowFloatingQuickPanel(v => !v)}
              className="neon-border"
              style={{
                background: 'linear-gradient(45deg, rgba(0, 180, 255, 0.3) 0%, rgba(0, 255, 160, 0.3) 100%)',
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
              🧩 快捷控制 {showFloatingQuickPanel ? '（隐藏）' : '（显示）'}
            </button>
          )}

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

    {/* 🗺️ 3D地图容器 - 占据大部分区域（扩大可视区） */}
      <div
        ref={mapContainerRef}
        className="neon-border"
        style={{
          position: 'absolute',
      left: `${PADDING}px`,
      top: `${topOffset}px`, // 固定顶部状态栏高度 + 统一边距
      right: `${PADDING}px`,
      bottom: `${PADDING}px`,
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: CARD_SHADOW,
          zIndex: 10,
          minHeight: '400px' // 确保最小高度
        }}
      >
  {/* 地图 HUD 画布：城市辉光/科技网格（叠加在地图之上，Deck 之下） */}
  {(showCityGlow || showTechGrid || showVignette || showScreenFog) && (
          <canvas
            id="map-hud-canvas"
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 12,
              pointerEvents: 'none',
              opacity: theme === 'minimal' ? 0.35 : 0.5
            }}
            ref={(el) => {
              if (!el) return;
               // 如已有旧观察器，先断开，避免重复绑定
               const prev = (el as any)._ro as ResizeObserver | undefined;
               if (prev && typeof prev.disconnect === 'function') {
                 try { prev.disconnect(); } catch {}
               }
               // 简易绘制：尺寸跟随容器，绘制天空穹渐变 + 城市辉光 + 细网格
               const resize = () => {
                 const container = (el.parentElement as HTMLElement | null) ?? el;
                 if (!container) return;
                 const w = container.clientWidth || el.clientWidth || el.width || 0;
                 const h = container.clientHeight || el.clientHeight || el.height || 0;
                if (w <= 0 || h <= 0) return;
                el.width = w;
                el.height = h;
                const ctx = el.getContext('2d');
                if (!ctx) return;
                ctx.clearRect(0, 0, w, h);
                // 天空穹已移除
                // 城市辉光：中心椭圆光晕
                if (showCityGlow) {
                  const cx = w * 0.5;
                  const cy = h * 0.58;
                  const rx = Math.max(240, w * 0.35);
                  const ry = Math.max(160, h * 0.22);
                  const grd = ctx.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.2, cx, cy, Math.max(rx, ry));
                  grd.addColorStop(0, 'rgba(0,180,255,0.10)');
                  grd.addColorStop(0.4, 'rgba(0,160,240,0.06)');
                  grd.addColorStop(1, 'rgba(0,0,0,0)');
                  ctx.fillStyle = grd;
                  ctx.beginPath();
                  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
                  ctx.fill();
                }
                // 科技网格：细线低透明
                if (showTechGrid) {
                  ctx.strokeStyle = 'rgba(0,200,255,0.07)';
                  ctx.lineWidth = 1;
                  const gap = Math.max(24, Math.floor(Math.min(w, h) / 30));
                  for (let x = (w % gap); x < w; x += gap) {
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
                  }
                  for (let y = (h % gap); y < h; y += gap) {
                    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
                  }
                }
                // 轻微暗角
                if (showVignette) {
                  const vg = ctx.createRadialGradient(w/2, h/2, Math.min(w,h)*0.35, w/2, h/2, Math.max(w,h)*0.7);
                  vg.addColorStop(0, 'rgba(0,0,0,0)');
                  vg.addColorStop(1, 'rgba(0,0,0,0.15)');
                  ctx.fillStyle = vg;
                  ctx.fillRect(0,0,w,h);
                }
                // 屏幕空间雾（顶部轻微）
                if (showScreenFog) {
                  const fg = ctx.createLinearGradient(0, 0, 0, h);
                  fg.addColorStop(0, 'rgba(120,180,220,0.06)');
                  fg.addColorStop(0.25, 'rgba(120,180,220,0.03)');
                  fg.addColorStop(1, 'rgba(120,180,220,0)');
                  ctx.fillStyle = fg;
                  ctx.fillRect(0,0,w,h);
                }
              };
              // 初次与 ResizeObserver（延后一帧，确保元素挂载到 DOM）
              if (typeof (window as any).ResizeObserver !== 'function') {
                // 环境不支持，至少先绘制一次
                requestAnimationFrame(resize);
                return;
              }
              const ro = new ResizeObserver(() => resize());
              (el as any)._ro = ro;
              // 观察目标：始终使用画布本身，避免 parent 异常导致类型不匹配
              const target: Element = el as unknown as Element;
              requestAnimationFrame(() => {
                try {
                  if (target && (target as any).nodeType === 1) ro.observe(target);
                } catch {}
                resize();
              });
            }}
          />
        )}
        {/* 地图错误状态显示 */}
  {mapError && !deckStandaloneMode && (
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
          left: `${PADDING}px`,
          top: `${topOffset}px`,
          right: `${PADDING}px`,
          bottom: `${PADDING}px`,
          pointerEvents: 'auto', // 允许交互
          borderRadius: '12px',
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
      height: `${TOPBAR_H}px`,
          background: theme === 'business' ? 'rgba(10, 18, 30, 0.8)' : theme === 'minimal' ? 'rgba(8, 14, 22, 0.7)' : GLASS_BG,
      backdropFilter: 'blur(10px)',
      borderBottom: GLASS_BORDER,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
      padding: `0 ${PADDING}px`,
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

      {/* 左侧项目面板 - 大屏设计（floatingUI=false时显示） */}
    {!floatingUI && (
      <motion.div
        initial={{ x: -400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        style={{
          position: 'absolute',
          left: 0,
      top: `${TOPBAR_H}px`,
      width: `${PANEL_W}%`,
      height: `calc(100% - ${TOPBAR_H}px)`,
          background: theme === 'business' ? 'rgba(10, 18, 30, 0.8)' : theme === 'minimal' ? 'rgba(8, 14, 22, 0.7)' : GLASS_BG,
      backdropFilter: 'blur(12px)',
      borderRight: GLASS_BORDER,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1500
        }}
      >
        {/* 搜索和过滤区域 */}
        <div style={{ padding: '16px', borderBottom: GLASS_BORDER }}>
          <h3 style={{ color: '#00ffff', margin: '0 0 15px 0', fontSize: 18, textAlign: 'center' }}>
            🏗️ 项目管理中心
          </h3>
          {/* 主题与模式切换 */}
          <div style={{ display:'flex', gap: 8, marginBottom: 10 }}>
            <select
              value={theme}
              onChange={(e)=> setVisual({ theme: e.target.value as any })}
              style={{ flex:1, padding:'6px', background:'rgba(0,0,0,0.5)', border: GLASS_BORDER, borderRadius:6, color:'#fff', fontSize:11 }}
            >
              <option value="dark">暗色 · 科技</option>
              <option value="minimal">极简 · 低噪</option>
              <option value="business">商务蓝 · 稳重</option>
            </select>
            <label style={{ display:'flex', alignItems:'center', gap:6, color:'#fff', fontSize:11 }}>
              <input type="checkbox" checked={minimalMode} onChange={(e)=> setVisual({ minimalMode: e.target.checked })} style={{ accentColor:'#00ffff' }}/>
              简约模式
            </label>
          </div>

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
          padding: '12px',
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
              onClick={() => { flyToProject(project); emitSelection('list', project.id); }}
              style={{
                background: selectedProject?.id === project.id
                  ? 'linear-gradient(90deg, rgba(0, 255, 255, 0.22), rgba(0, 150, 255, 0.18))'
                  : 'rgba(255, 255, 255, 0.04)',
                border: selectedProject?.id === project.id
                  ? '1px solid rgba(0, 255, 255, 0.45)'
                  : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '10px',
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
    )}

      {/* 右侧控制面板 - 大屏设计（floatingUI=false时显示） */}
    {!floatingUI && (
      <motion.div
        initial={{ x: 400, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        style={{
          position: 'absolute',
          right: 0,
      top: `${TOPBAR_H}px`,
      width: `${PANEL_W}%`,
      height: `calc(100% - ${TOPBAR_H}px)`,
      background: GLASS_BG,
      backdropFilter: 'blur(12px)',
      borderLeft: GLASS_BORDER,
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1500
        }}
      >
        {/* 选中项目详情 */}
  <div style={{ padding: '16px', borderBottom: GLASS_BORDER }}>
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
                background: 'linear-gradient(135deg, rgba(0, 255, 255, 0.12) 0%, rgba(255, 0, 255, 0.1) 100%)',
                borderRadius: '12px',
                padding: '14px',
                backdropFilter: 'blur(10px)',
                boxShadow: CARD_SHADOW
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
  <div style={{ padding: '16px', borderBottom: GLASS_BORDER }}>
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
  <div style={{ padding: '16px', flex: 1 }}>
          <h4 style={{ color: '#00ffff', margin: '0 0 15px 0', fontSize: 16 }}>
            🎛️ 显示控制
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showEpicGlobe} onChange={() => toggle('showEpicGlobe')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>显示Epic Globe</span>
            </label>

            {/* Hex 热区 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showHex} onChange={() => toggle('showHex')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>热区聚合 Hex</span>
            </label>

            {/* 3D 柱体 */}
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showColumns} onChange={() => toggle('showColumns')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>3D 柱体</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showLegacyParticles && !minimalMode} onChange={() => toggle('showLegacyParticles')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>旧CSS粒子</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={enablePostFX && !minimalMode} onChange={() => toggle('enablePostFX')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Bloom后处理</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showLayerDebugPanel} onChange={() => toggle('showLayerDebugPanel')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>Layer调试面板</span>
            </label>

            {/* 地图特效（HUD） */}
            <div style={{ marginTop: 6, borderTop: '1px dashed rgba(0,255,255,0.25)', paddingTop: 10 }}>
              <div style={{ color: '#0ff', fontSize: 12, marginBottom: 6 }}>地图特效（HUD）</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                {/* 天空穹选项已移除 */}
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showCityGlow} onChange={() => toggle('showCityGlow')} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>城市辉光</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showTechGrid} onChange={() => toggle('showTechGrid')} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>科技网格</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showVignette} onChange={() => toggle('showVignette')} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>暗角</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showScreenFog} onChange={() => toggle('showScreenFog')} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>屏幕空间雾</span>
              </label>
            </div>

            {/* 动线与地标 */}
            <div style={{ marginTop: 6, borderTop: '1px dashed rgba(0,255,255,0.25)', paddingTop: 10 }}>
              <div style={{ color: '#0ff', fontSize: 12, marginBottom: 6 }}>动线与地标</div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showGlowPaths} onChange={() => toggle('showGlowPaths' as any)} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>发光动线</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                <input type="checkbox" checked={showLandmarkBeams} onChange={() => toggle('showLandmarkBeams' as any)} style={{ accentColor: '#00ffff' }} />
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>地标光柱</span>
              </label>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showWeatherOverlay} onChange={() => toggle('showWeatherOverlay')} style={{ accentColor: '#00ffff' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>地图天气表情</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showFloatingProjectPanel}
                onChange={(e) => setShowFloatingProjectPanel(e.target.checked)}
                style={{ accentColor: '#00ffff' }}
              />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                浮动项目面板(Beta)
              </span>
            </label>

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
                快速预设
              </div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <button onClick={() => { setVisual({ theme: 'dark', minimalMode: false }); }} className="neon-border" style={{ background:'linear-gradient(45deg, rgba(0,255,255,0.25), rgba(0,100,255,0.25))', borderRadius:4, color:'#fff', padding:'4px 8px', fontSize:10 }}>炫酷密集</button>
                <button onClick={() => { setVisual({ theme: 'minimal', minimalMode: true }); }} className="neon-border" style={{ background:'linear-gradient(45deg, rgba(0,255,200,0.2), rgba(0,200,160,0.2))', borderRadius:4, color:'#fff', padding:'4px 8px', fontSize:10 }}>极简演示</button>
                <button onClick={() => { setVisual({ theme: 'business', minimalMode: false }); }} className="neon-border" style={{ background:'linear-gradient(45deg, rgba(0,120,220,0.25), rgba(0,160,255,0.25))', borderRadius:4, color:'#fff', padding:'4px 8px', fontSize:10 }}>商务蓝</button>
              </div>
              <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px', marginBottom: '8px' }}>
                地图缩放级别
              </div>
              {/* 引擎参数 */}
              <div style={{ marginTop: 12, borderTop: '1px dashed rgba(0,255,255,0.25)', paddingTop: 10 }}>
                <div style={{ color: '#0ff', fontSize: 12, marginBottom: 6 }}>引擎参数</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>建筑高度倍率: {buildingHeightFactor}x</span>
                  <input type="range" min={1} max={6} step={1} value={buildingHeightFactor}
                    onChange={(e)=> setVisual({ buildingHeightFactor: Number(e.target.value) })} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>扫描环速度: {scanRingSpeed}x</span>
                  <input type="range" min={0.5} max={3} step={0.5} value={scanRingSpeed}
                    onChange={(e)=> setVisual({ scanRingSpeed: Number(e.target.value) })} />
                </div>
              </div>

              {/* 动线参数 */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: '#0ff', fontSize: 12, marginBottom: 6 }}>动线参数</div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>飞线速度: {flylineSpeed}x</span>
                  <input type="range" min={0.3} max={4} step={0.1} value={flylineSpeed}
                    onChange={(e)=> setVisual({ flylineSpeed: Number(e.target.value) })} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>飞线线宽: {flylineWidth}px</span>
                  <input type="range" min={1} max={6} step={1} value={flylineWidth}
                    onChange={(e)=> setVisual({ flylineWidth: Number(e.target.value) })} />
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:8 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>飞线数量: {flylineCount}</span>
                  <input type="range" min={2} max={20} step={1} value={flylineCount}
                    onChange={(e)=> setVisual({ flylineCount: Number(e.target.value) })} />
                </div>
              </div>
              {/* 光效参数 */}
              <div style={{ marginTop: 12 }}>
                <div style={{ color: '#0ff', fontSize: 12, marginBottom: 6 }}>光效参数</div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ width: 120, fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>光柱辉光: {beamGlowIntensity}x</span>
                  <input type="range" min={0.5} max={3} step={0.1} value={beamGlowIntensity}
                    onChange={(e)=> setVisual({ beamGlowIntensity: Number(e.target.value) })} />
                </div>
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
                        const p = twoPointFiveD ? 30 : 0;
                        mapRef.current?.setPitch(p);
                        setCurrentPitch(p);
                        setIs3DMode(twoPointFiveD);
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
                        const p = twoPointFiveD ? 30 : 0;
                        mapRef.current?.setPitch(p);
                        setCurrentPitch(p);
                        setIs3DMode(twoPointFiveD);
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
                        const p = twoPointFiveD ? 30 : 0;
                        mapRef.current?.setPitch(p);
                        setCurrentPitch(p);
                        setIs3DMode(twoPointFiveD);
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
    )}

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
        {/* KPI 小组件: 进度趋势 / 风险分布 / 进度分层Donut */}
        <div style={{ position:'absolute', top:-80, left:0, width:'100%', display:'flex', justifyContent:'center', gap:24 }}>
          <div style={{ width:140, height:70, background:'rgba(0,0,0,0.45)', border:'1px solid rgba(0,255,255,0.3)', borderRadius:8, padding:6, display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ fontSize:10, color:'#0ff', opacity:0.8 }}>平均进度趋势(最近)</div>
            <Sparkline values={progressHistory} width={128} height={38} />
          </div>
          <div style={{ width:110, height:70, background:'rgba(0,0,0,0.45)', border:'1px solid rgba(255,170,0,0.3)', borderRadius:8, padding:6, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
            <div style={{ fontSize:10, color:'#ffa500', opacity:0.8 }}>风险分布</div>
            <Donut size={52} segments={['low','medium','high','critical'].map(k=>({
              value: projects.filter(p=>p.riskLevel===k).length || 0,
              color: k==='critical'? '#ff4444': k==='high'? '#ff8800': k==='medium'? '#ffff00':'#00ff99'
            }))} />
          </div>
          <div style={{ width:140, height:70, background:'rgba(0,0,0,0.45)', border:'1px solid rgba(0,255,180,0.3)', borderRadius:8, padding:6, display:'flex', flexDirection:'column', gap:4 }}>
            <div style={{ fontSize:10, color:'#0fa', opacity:0.8 }}>进度区间</div>
            <div style={{ display:'flex', gap:4, flex:1 }}>
              {[0,25,50,75].map((b,i)=>{
                const upper = i===3?101: b+25;
                const count = projects.filter(p=> p.progress>=b && p.progress<upper).length;
                return <div key={b} style={{ flex:1, background:'linear-gradient(180deg,#00ffaa22,#00ccaa08)', border:'1px solid #00ffaa44', borderRadius:2, position:'relative' }}>
                  <div style={{ position:'absolute', bottom:2, left:0, right:0, textAlign:'center', fontSize:10, color:'#0fa' }}>{count}</div>
                  <div style={{ position:'absolute', top:2, left:0, right:0, textAlign:'center', fontSize:9, color:'#0fa', opacity:0.6 }}>{b}-{upper-1}%</div>
                </div>;
              })}
            </div>
          </div>
        </div>
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

      {/* 浮动项目管理面板 (Beta) */}
      {showFloatingProjectPanel && (
        <ProjectManagementPanel
          visible={true}
          onClose={() => setShowFloatingProjectPanel(false)}
          onProjectSelect={handlePanelProjectSelect}
          projects={panelProjects as any}
          position={{ x: 480, y: 160 }}
        />
      )}

      {floatingUI && showFloatingQuickPanel && (
        <FloatingQuickControlsPanel onClose={() => setShowFloatingQuickPanel(false)} />
      )}

  {/* 统一选中反馈 Toast */}
  <SelectionToast />

      {/* 飞行过渡美化遮罩：降低背景对比，缓解切换突兀感 */}
      <AnimatePresence>
        {isFlying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.35 }}
            exit={{ opacity: 0 }}
            style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,12,24,0.4) 60%, rgba(0,0,0,0.6) 100%)', backdropFilter: 'blur(2px)', zIndex: 2500, pointerEvents: 'none' }}
          />
        )}
      </AnimatePresence>

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

      {/* 命令面板 Overlay */}
      <AnimatePresence>
        {showCommandPalette && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 5000,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '15vh'
            }}
            onClick={() => setShowCommandPalette(false)}
          >
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="neon-border"
              style={{ width: 640, maxWidth: '90%', background: 'rgba(10,20,30,0.92)', borderRadius: 12, boxShadow: '0 20px 80px rgba(0,0,0,0.5)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ padding: 12, borderBottom: '1px solid rgba(0,255,255,0.2)', display: 'flex', gap: 8 }}>
                <input
                  autoFocus
                  value={commandInput}
                  onChange={(e) => setCommandInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Escape') { setShowCommandPalette(false); }
                    if (e.key === 'Enter') {
                      // 选第一项
                      const list = (document.getElementById('palette-list') as HTMLDivElement | null);
                      const first = list?.querySelector('[data-cmd]') as HTMLDivElement | null;
                      if (first) (first as any).click();
                    }
                  }}
                  placeholder="输入命令或项目名称..."
                  style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(0,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '10px 12px', outline: 'none' }}
                />
                <button onClick={() => setShowCommandPalette(false)} style={{ background:'transparent', border:'1px solid rgba(255,255,255,0.2)', color:'#fff', borderRadius:8, padding:'8px 10px', cursor:'pointer', fontSize:12 }}>关闭</button>
              </div>
              <div id="palette-list" style={{ maxHeight: 380, overflow: 'auto', padding: 8 }}>
                {(() => {
                  const base: Array<{ id: string; label: string; action: () => void }> = [
                    { id: 'theme-next', label: '切换主题（暗色/极简/商务）', action: () => { const order: Array<typeof theme> = ['dark','minimal','business']; const idx = order.indexOf(theme); const next = order[(idx+1)%order.length]; setVisual({ theme: next }); } },
                    { id: 'toggle-minimal', label: minimalMode ? '关闭极简模式' : '开启极简模式', action: () => setVisual({ minimalMode: !minimalMode }) },
                    { id: 'reset', label: '重置视图到全国', action: resetMapView },
                    { id: 'toggle-hex', label: showHex ? '隐藏六边形热区' : '显示六边形热区', action: () => toggle('showHex') },
                    { id: 'toggle-columns', label: showColumns ? '隐藏3D柱体' : '显示3D柱体', action: () => toggle('showColumns') },
                    { id: 'cinema', label: isCinematic ? '停止影院模式' : '启动影院模式', action: () => isCinematic ? stopCinematicTour() : startCinematicTour() },
                  ];
                  const projEntries = (projects.length ? projects : filteredProjects).slice(0, 20).map(p => ({ id: `fly-${p.id}`, label: `飞到项目：${p.name}`, action: () => flyToProject(p) }));
                  const all = base.concat(projEntries);
                  const kw = commandInput.trim().toLowerCase();
                  const items = kw ? all.filter(it => it.label.toLowerCase().includes(kw)) : all;
                  return items.length ? items.map(it => (
                    <div key={it.id} data-cmd onClick={() => { it.action(); setShowCommandPalette(false); }} className="neon-border" style={{ background:'rgba(255,255,255,0.04)', borderRadius:8, padding:'10px 12px', margin:'8px 4px', color:'#fff', cursor:'pointer' }}>
                      {it.label}
                    </div>
                  )) : (
                    <div style={{ color:'rgba(255,255,255,0.6)', padding:16 }}>没有匹配的命令</div>
                  );
                })()}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
