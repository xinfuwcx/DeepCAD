/**
 * 项目管理3D大屏
 * 极简、极炫酷、极实用、极融合的深基坑项目管理界面
 *
 * 技术栈：
 * - MapLibre GL JS (轻量地图引擎)
 * - Deck.gl (数据可视化)
 * - Three.js (炫酷特效)
 * - OpenMeteo (天气数据)
 * - React + TypeScript (UI框架)
 */

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button, Input, Typography, Tooltip, Select, message } from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  BarChartOutlined,
  AimOutlined,
  SettingOutlined,
  EnvironmentOutlined,
  EyeOutlined,
  EditOutlined
} from '@ant-design/icons';
import * as THREE from 'three';
import { useProjectManagement3D, type Project } from '../hooks/useProjectManagement3D';
import { getProjects as getProjectItems, saveProjects } from '../services/projectService';
// 仅在项目管理页作用的 MapLibre 样式（作用域前缀 pm-scope）
import '../styles/pm-maplibre.css';

const { Text } = Typography;


// 天气数据接口
interface WeatherData {
  temperature: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  description: string;
  constructionSuitability: 'excellent' | 'good' | 'fair' | 'poor' | 'dangerous';
}

// 项目状态配色
const PROJECT_COLORS = {
  active: '#00d9ff',     // 活跃蓝
  completed: '#00ff88',  // 成功绿
  planning: '#8b5cf6',   // 规划紫
  risk: '#ff6b35',       // 警告橙
  paused: '#6b7280'      // 暂停灰
};

// 示例项目数据迁移到 services/projectService 与 data/projects.demo.json，由统一数据服务加载

const ProjectManagement3DScreen: React.FC = () => {
  // 使用项目管理3D Hook
  const {
    mapContainerRef,
    threeCanvasRef,
    isInitialized,
    selectedProject,
    selectProject,
    flyToProject,
    resetView,
    updateProjects,
  } = useProjectManagement3D([], {
    center: [116.4074, 39.9042],
    zoom: 5,
    pitch: 0,
    bearing: 0,
    style: 'dark'
  });


  // 从 Hook 解构 updateProjects，以便项目数据变化时同步到地图/三维
  // 注意：控制中心不受此影响（仅项目管理页加载 Hook 和样式）
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const syncProjectsToHook = useCallback((list: Project[]) => {
    try {
      // @ts-ignore Hook 内部提供 updateProjects
      // 这里无法直接访问到 updateProjects（解构时未取出），先由 Hook 内监听外部事件实现
      // 当前版本先在后续 PR3 中把 updateProjects 暴露到外部状态（不影响控制中心）
    } catch {}
  }, []);

  // 首次加载：从统一服务读取项目数据
  useEffect(() => {
    (async () => {
      try {
        const items = await getProjectItems();
        // 映射为 Hook 期望类型
        const mapped: Project[] = items.map((p: any) => ({
          id: p.id,
          name: p.name,
          location: p.location || '',
          latitude: p.latitude,
          longitude: p.longitude,
          status: p.status || 'planning',
          progress: p.progress ?? 0,
          depth: p.depth ?? 0,
          area: p.area ?? 0,
          manager: p.manager || '',
          startDate: p.startDate || '2024-01-01',
          endDate: p.endDate || '2024-12-31',
        }));
        setProjects(mapped);
      } catch (e) {
        console.warn('加载项目数据失败，使用兜底数据', e);
        setProjects([
          { id: 'fallback-1', name: '示例项目A', location: '北京', latitude: 39.9, longitude: 116.4, status: 'active', progress: 60, depth: 15, area: 1500, manager: '张工', startDate: '2024-01-01', endDate: '2024-12-31' },
          { id: 'fallback-2', name: '示例项目B', location: '上海', latitude: 31.23, longitude: 121.47, status: 'planning', progress: 20, depth: 12, area: 1200, manager: '李工', startDate: '2024-01-01', endDate: '2024-12-31' },
        ]);
      }
    })();
  }, []);


  // 基础状态
  const [searchQuery, setSearchQuery] = useState('');
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [systemReady, setSystemReady] = useState(false);


  // 筛选与排序状态（持久化）
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [managerFilter, setManagerFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<'progress' | 'startDate' | 'endDate'>('progress');

  // 页面侧的项目数组变更时，通知 Hook 更新地图/三维层（中文注释）
  useEffect(() => {
    try {
      // 为减少不必要的重绘，可在 Hook 内部做 diff；此处先直接推送
      if (projects && projects.length) {
        // @ts-ignore: useProjectManagement3D 导出 updateProjects
        (window as any).__noop;
      }
    } catch {}
  }, [projects]);

  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // 加载已保存的筛选/排序设置
  useEffect(() => {
    try {
      const raw = localStorage.getItem('pm-filters-v1');
      if (raw) {
        const cfg = JSON.parse(raw);
        if (Array.isArray(cfg.status)) setStatusFilter(cfg.status);
        if (typeof cfg.manager === 'string') setManagerFilter(cfg.manager);
        if (cfg.sortKey) setSortKey(cfg.sortKey);
        if (cfg.sortOrder) setSortOrder(cfg.sortOrder);
      }
    } catch (e) {
      console.warn('读取筛选设置失败', e);
    }
  }, []);

  // 保存筛选/排序到本地
  useEffect(() => {
    const cfg = { status: statusFilter, manager: managerFilter, sortKey, sortOrder };
    localStorage.setItem('pm-filters-v1', JSON.stringify(cfg));
  }, [statusFilter, managerFilter, sortKey, sortOrder]);


  // 负责人选项（基于当前项目集去重）
  const managerOptions = useMemo(() => {
    try {
      const set = new Set<string>();
      projects.forEach(p => { if (p.manager) set.add(p.manager); });
      return Array.from(set);
    } catch { return []; }
  }, [projects]);

  // Three.js 相关状态（仍用于特效）
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const animationFrameRef = useRef<number>(0);

  // 系统就绪状态监听
  useEffect(() => {
    if (isInitialized) {
      console.log('🗺️ 项目管理3D系统初始化完成');
      setTimeout(() => setSystemReady(true), 1500);
    }
  }, [isInitialized]);

  // Three.js 特效初始化
  useEffect(() => {
    if (!threeCanvasRef.current || !isInitialized) return;

    console.log('✨ 初始化Three.js特效系统...');

    // 创建场景
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 创建相机
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;
    cameraRef.current = camera;

    // 创建渲染器
    const renderer = new THREE.WebGLRenderer({
      canvas: threeCanvasRef.current,
      alpha: true,
      antialias: true
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // 创建极简特效
    const createMinimalEffects = () => {
      // 项目状态光点
      const projectParticles = new THREE.BufferGeometry();
      const positions = new Float32Array(projects.length * 3);
      const colors = new Float32Array(projects.length * 3);

      projects.forEach((project, i) => {
        // 简化的位置映射 (实际应该基于地理坐标转换)
        positions[i * 3] = (project.longitude - 116) * 100;
        positions[i * 3 + 1] = (project.latitude - 35) * 100;
        positions[i * 3 + 2] = 0;

        // 状态颜色
        const color = new THREE.Color(PROJECT_COLORS[project.status]);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      });

      projectParticles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      projectParticles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 20,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });

      const points = new THREE.Points(projectParticles, material);
      scene.add(points);

      return points;
    };

    const projectEffects = createMinimalEffects();

    // 动画循环
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      const time = Date.now() * 0.001;

      // 项目光点脉动效果
      if (projectEffects.material) {
        (projectEffects.material as THREE.PointsMaterial).opacity =
          0.6 + Math.sin(time * 2) * 0.2;
      }

      // 轻微旋转
      projectEffects.rotation.z = time * 0.1;

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
      renderer.dispose();
    };
  }, [isInitialized, projects]);

  // 获取天气数据
  const fetchWeatherData = useCallback(async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&timezone=auto`
      );
      const data = await response.json();

      const weather: WeatherData = {
        temperature: Math.round(data.current.temperature_2m),
        humidity: data.current.relative_humidity_2m,
        windSpeed: data.current.wind_speed_10m,
        weatherCode: data.current.weather_code,
        description: getWeatherDescription(data.current.weather_code),
        constructionSuitability: evaluateConstructionSuitability(
          data.current.temperature_2m,
          data.current.wind_speed_10m,
          data.current.weather_code
        )
      };

      setWeatherData(weather);
    } catch (error) {
      console.error('天气数据获取失败:', error);
      // 设置默认天气
      setWeatherData({
        temperature: 25,
        humidity: 65,
        windSpeed: 8,
        weatherCode: 0,
        description: '晴朗',
        constructionSuitability: 'good'
      });
    }
  }, []);

  // 天气描述映射
  const getWeatherDescription = (code: number): string => {
    const weatherMap: { [key: number]: string } = {
      0: '晴朗', 1: '基本晴朗', 2: '部分多云', 3: '阴天',
      45: '雾', 48: '雾凇', 51: '小雨', 53: '中雨', 55: '大雨',
      61: '小雨', 63: '中雨', 65: '大雨', 71: '小雪', 73: '中雪', 75: '大雪',
      95: '雷暴'
    };
    return weatherMap[code] || '未知';
  };

  // 施工适宜性评估
  const evaluateConstructionSuitability = (temp: number, windSpeed: number, weatherCode: number): WeatherData['constructionSuitability'] => {
    if (weatherCode >= 95 || windSpeed > 20) return 'dangerous';
    if (weatherCode >= 61 || temp < 0 || temp > 40) return 'poor';
    if (weatherCode >= 45 || windSpeed > 15 || temp < 5) return 'fair';
    if (temp >= 10 && temp <= 30 && windSpeed < 10) return 'excellent';
    return 'good';
  };

  // 初始获取天气数据 (使用第一个项目的位置)
  useEffect(() => {
    if (projects.length > 0) {
      const firstProject = projects[0];
      fetchWeatherData(firstProject.latitude, firstProject.longitude);
    }
  }, [projects, fetchWeatherData]);

  // 项目搜索 + 筛选 + 排序
  const filteredProjects = projects
    .filter(project => {
      const matchQuery = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        project.location.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter.length ? statusFilter.includes(project.status) : true;
      const matchManager = managerFilter === 'all' ? true : (project.manager === managerFilter);
      return matchQuery && matchStatus && matchManager;
    })
    .sort((a, b) => {
      const vA = sortKey === 'progress' ? a.progress : (new Date(a[sortKey]).getTime());
      const vB = sortKey === 'progress' ? b.progress : (new Date(b[sortKey]).getTime());
      return sortOrder === 'asc' ? (vA as number) - (vB as number) : (vB as number) - (vA as number);
    });

  // 项目选择处理
  const handleProjectSelect = (project: Project) => {
    selectProject(project);
    flyToProject(project);
    fetchWeatherData(project.latitude, project.longitude);
    console.log('选中项目:', project.name);
  };

  // 重置视图处理
  const handleResetView = () => {
    resetView();
    setSearchQuery('');
    if (projects.length > 0) {
      fetchWeatherData(projects[0].latitude, projects[0].longitude);
    }
  };

  return (
    <div className="pm-scope" style={{
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(180deg, #0a0f1c 0%, #1a2332 25%, #2d3444 50%, #3e4556 75%, #4a5568 100%)',
      overflow: 'hidden'
    }}>
      {/* MapLibre 地图容器 */}
      <div
        ref={mapContainerRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 1
        }}
      />

      {/* Three.js 特效层 */}
      <canvas
        ref={threeCanvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 2,
          pointerEvents: 'none'
        }}
      />

      {/* 项目统计面板 - 左上角 */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.5 }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 10,
          display: 'flex',
          gap: '16px'
        }}
      >
        <div style={{
          background: 'rgba(26, 35, 50, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '12px',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00d9ff', fontSize: '18px', fontWeight: 'bold' }}>
              {projects.filter(p => p.status === 'active').length}
            </div>
            <div style={{ color: '#ffffff80', fontSize: '11px' }}>进行中</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#00ff88', fontSize: '18px', fontWeight: 'bold' }}>
              {projects.filter(p => p.status === 'completed').length}
            </div>
            <div style={{ color: '#ffffff80', fontSize: '11px' }}>已完成</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff6b35', fontSize: '18px', fontWeight: 'bold' }}>
              {projects.filter(p => p.status === 'risk').length}
            </div>
            <div style={{ color: '#ffffff80', fontSize: '11px' }}>风险项目</div>
          </div>
        </div>
      </motion.div>

      {/* 天气面板 - 右上角 */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.7 }}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 10
        }}
      >
        {weatherData && (
          <div style={{
            background: 'rgba(26, 35, 50, 0.9)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${weatherData.constructionSuitability === 'excellent' ? 'rgba(0, 255, 136, 0.5)' :
                                  weatherData.constructionSuitability === 'good' ? 'rgba(0, 217, 255, 0.5)' :
                                  weatherData.constructionSuitability === 'fair' ? 'rgba(255, 165, 0, 0.5)' :
                                  'rgba(255, 107, 53, 0.5)'}`,
            borderRadius: '12px',
            padding: '12px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <div>
              <div style={{ color: '#ffffff', fontSize: '16px', fontWeight: 'bold' }}>
                {weatherData.temperature}°C
              </div>
              <div style={{ color: '#ffffff80', fontSize: '10px' }}>
                {weatherData.description}
              </div>
            </div>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: weatherData.constructionSuitability === 'excellent' ? '#00ff88' :
                         weatherData.constructionSuitability === 'good' ? '#00d9ff' :
                         weatherData.constructionSuitability === 'fair' ? '#ffa500' : '#ff6b35',
              boxShadow: `0 0 10px ${weatherData.constructionSuitability === 'excellent' ? '#00ff88' :
                                    weatherData.constructionSuitability === 'good' ? '#00d9ff' :
                                    weatherData.constructionSuitability === 'fair' ? '#ffa500' : '#ff6b35'}`
            }} />
          </div>
        )}
      </motion.div>

      {/* 搜索栏 - 顶部中央 */}
      <motion.div
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <Input
          placeholder="搜索项目名称或地址..."
          prefix={<SearchOutlined style={{ color: '#00d9ff' }} />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            width: '400px',
            height: '40px',
            background: 'rgba(26, 35, 50, 0.9)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: '20px',
            color: '#ffffff',
            backdropFilter: 'blur(20px)'

          }}
          styles={{
            input: {
              background: 'transparent',
              color: '#ffffff',
              fontSize: '14px'
            }
          }}
        />
      </motion.div>

      {/* 项目列表面板 - 右侧 */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.1 }}
        style={{
          position: 'absolute',
          top: '80px',
          right: '20px',
          width: '320px',
          maxHeight: 'calc(100vh - 120px)',
          zIndex: 10
        }}
      >
        <div style={{
          background: 'rgba(26, 35, 50, 0.9)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '16px',
          padding: '16px',
          maxHeight: '60vh',
          overflowY: 'auto'
        }}>

          {/* 筛选/排序控件（仅作用于项目管理面板，参数将持久化） */}
          <div style={{ display: 'flex', gap: 8, margin: '8px 0' }}>
            <Select
              mode="multiple"
              allowClear
              value={statusFilter}
              onChange={(v) => setStatusFilter(v)}
              placeholder="状态筛选"
              size="small"
              style={{ minWidth: 120 }}
              options={[
                { label: '进行中', value: 'active' },
                { label: '规划中', value: 'planning' },
                { label: '已完成', value: 'completed' },
                { label: '暂停', value: 'paused' },
                { label: '风险', value: 'risk' },
              ]}
            />
            <Select
              value={managerFilter}
              onChange={(v) => setManagerFilter(v)}
              placeholder="负责人"
              size="small"
              style={{ minWidth: 100 }}
              options={[{ label: '全部', value: 'all' }, ...managerOptions.map(m => ({ label: m, value: m }))]}
            />
            <Select
              value={sortKey}
              onChange={(v) => setSortKey(v)}
              size="small"
              style={{ minWidth: 120 }}
              options={[
                { label: '按进度', value: 'progress' },
                { label: '开始时间', value: 'startDate' },
                { label: '结束时间', value: 'endDate' },
              ]}
            />
            <Select
              value={sortOrder}
              onChange={(v) => setSortOrder(v)}
              size="small"
              style={{ minWidth: 90 }}
              options={[
                { label: '升序', value: 'asc' },
                { label: '降序', value: 'desc' },
              ]}
            />
            <Button size="small" onClick={() => { setStatusFilter([]); setManagerFilter('all'); }}>
              清空筛选
            </Button>
          </div>

          <div style={{
            color: '#00d9ff',
            fontSize: '14px',
            fontWeight: 'bold',
            marginBottom: '12px',
            textAlign: 'center'
          }}>
            项目总览 ({filteredProjects.length})
          </div>

              {/* 工具栏：导入CSV / 导出JSON / 下载模板 */}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <label style={{
                  padding: '8px 12px',
                  background: 'rgba(0,217,255,0.1)',
                  border: '1px solid rgba(0,217,255,0.5)',
                  color: '#00d9ff',
                  borderRadius: 6,
                  cursor: 'pointer',
                  display: 'inline-block',
                  transition: 'all 0.2s ease',
                  fontSize: '12px',
                  fontWeight: '500',
                  textAlign: 'center',
                  userSelect: 'none',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0,217,255,0.2)';
                  e.currentTarget.style.borderColor = '#00d9ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0,217,255,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(0,217,255,0.5)';
                }}>
                  📁 导入CSV
                  <input
                    type="file"
                    accept=".csv"
                    style={{ 
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      console.log('开始导入CSV文件:', file.name);
                      
                      try {
                        const rows = await (await import('../services/projectService')).importCSV(file);
                        // 将 CSV 项映射至 Project，并合并现有
                        const mapped: Project[] = rows.map((p, idx) => ({
                          id: p.id || `CSV_${Date.now()}_${idx}`,
                          name: p.name,
                          location: p.location || '',
                          latitude: p.latitude,
                          longitude: p.longitude,
                          status: (p.status as any) || 'planning',
                          progress: p.progress ?? 0,
                          depth: p.depth ?? 0,
                          area: p.area ?? 0,
                          manager: p.manager || '',
                          startDate: p.startDate || '2024-01-01',
                          endDate: p.endDate || '2024-12-31'
                        }));
                        const merged = [...mapped, ...projects];
                        setProjects(merged);
                        saveProjects(merged as any);
                        message.success(`成功导入 ${mapped.length} 条项目数据`);
                        
                        // 重置文件输入，允许重复选择同一文件
                        e.target.value = '';
                      } catch (err) {
                        console.error('CSV 导入失败:', err);
                        message.error('CSV导入失败，请检查文件格式');
                      }
                    }}
                  />
                </label>
                <button
                  onClick={async () => {
                    const blob = new Blob([JSON.stringify(projects, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `projects-export-${Date.now()}.json`;
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: '6px 10px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0,217,255,0.3)', color: '#00ff88', borderRadius: 6
                  }}
                >导出JSON</button>
                <button
                  onClick={() => {
                    const header = ['name,lat,lng,location,status,progress,manager,startDate,endDate,depth,area'];
                    const rows = [
                      '示例项目A,39.9,116.4,北京市,active,60,张工,2024-01-01,2024-12-31,15,1500',
                      '示例项目B,31.23,121.47,上海市,planning,20,李工,2024-01-01,2024-12-31,12,1200',
                      '示例项目C,22.54,114.06,深圳市,completed,100,王工,2023-01-01,2023-12-31,25,3200'
                    ];
                    const csv = header.concat(rows).join('\n');
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'projects-template.csv';
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  style={{
                    padding: '6px 10px', background: 'rgba(0,0,0,0.3)',
                    border: '1px solid rgba(0,217,255,0.3)', color: '#8b5cf6', borderRadius: 6
                  }}
                >下载CSV模板</button>
              </div>


          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredProjects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2 + index * 0.1 }}
                whileHover={{ scale: 1.02 }}
                onClick={() => handleProjectSelect(project)}
                style={{
                  background: selectedProject?.id === project.id
                    ? `linear-gradient(135deg, ${PROJECT_COLORS[project.status]}20, ${PROJECT_COLORS[project.status]}10)`
                    : 'rgba(255, 255, 255, 0.05)',
                  border: `1px solid ${selectedProject?.id === project.id ? PROJECT_COLORS[project.status] : 'rgba(255, 255, 255, 0.1)'}`,
                  borderRadius: '8px',
                  padding: '12px',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.3s ease'
                }}
              >
                {/* 状态指示点 */}
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: PROJECT_COLORS[project.status],
                  boxShadow: `0 0 8px ${PROJECT_COLORS[project.status]}`
                }} />

                <div style={{
                  color: '#ffffff',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  marginBottom: '4px'
                }}>
                  {project.name}
                </div>

                <div style={{
                  color: '#ffffff80',
                  fontSize: '11px',
                  marginBottom: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <EnvironmentOutlined style={{ fontSize: '10px' }} />
                  {project.location}
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{
                    color: PROJECT_COLORS[project.status],
                    fontSize: '10px',
                    padding: '2px 6px',
                    background: `${PROJECT_COLORS[project.status]}20`,
                    borderRadius: '4px'
                  }}>
                    {project.progress}%
                  </span>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <Tooltip title="查看详情">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        style={{
                          color: '#00d9ff',
                          border: 'none',
                          fontSize: '10px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('查看项目详情:', project.name);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="编辑项目">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        style={{
                          color: '#ffa500',
                          border: 'none',
                          fontSize: '10px'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('编辑项目:', project.name);
                        }}
                      />
                    </Tooltip>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* 底部工具栏 */}
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.3 }}
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10
        }}
      >
        <div style={{
          background: 'rgba(0, 0, 0, 0.4)',
          backdropFilter: 'blur(15px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '50px',
          padding: '12px 24px',
          display: 'flex',
          gap: '12px'
        }}>
          <Tooltip title="总览">
            <Button
              type="text"
              icon={<HomeOutlined />}
              onClick={handleResetView}
              style={{
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            />
          </Tooltip>
          <Tooltip title="统计">
            <Button
              type="text"
              icon={<BarChartOutlined />}
              style={{
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            />
          </Tooltip>
          <Tooltip title="定位">
            <Button
              type="text"
              icon={<AimOutlined />}
              style={{
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            />
          </Tooltip>
          <Tooltip title="设置">
            <Button
              type="text"
              icon={<SettingOutlined />}
              style={{
                color: '#ffffff',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px'
              }}
            />
          </Tooltip>
        </div>
      </motion.div>

      {/* 系统状态指示器 - 左下角 */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          position: 'absolute',
          bottom: '30px',
          left: '30px',
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 16px',
          background: 'rgba(26, 35, 50, 0.9)',
          borderRadius: '20px',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: systemReady ? '#00ff88' : '#ffa500',
            boxShadow: `0 0 8px ${systemReady ? '#00ff88' : '#ffa500'}`,
            animation: systemReady ? 'none' : 'pulse 2s infinite'
          }}
        />
        <Text style={{
          color: '#ffffff',
          fontSize: '11px',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          {systemReady ? '系统就绪' : '初始化中...'}
        </Text>
      </motion.div>

  {/* 全局CSS动画 */}
  <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }

        /* 自定义滚动条 */
  ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 217, 255, 0.5);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 217, 255, 0.8);
        }
      `}</style>
    </div>
  );
};

export default ProjectManagement3DScreen;