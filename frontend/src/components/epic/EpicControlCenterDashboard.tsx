/**
 * Epic控制中心大屏版本
 * 大屏级深基坑工程管控中心
 * 集成3D地图、实时监控、科幻风HUD设计
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { 
  DashboardCard, 
  DashboardMetric, 
  DashboardProgress, 
  DashboardStatus,
  dashboardTokens,
  dashboardAnimations 
} from '../ui/DashboardComponents';

// 项目数据接口
interface ProjectData {
  id: string;
  name: string;
  location: { lat: number; lng: number; alt: number };
  status: 'active' | 'completed' | 'planning' | 'warning' | 'error';
  progress: number;
  depth: number;
  area: number;
  volume: number;
  startDate: string;
  endDate: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  
  // 实时监控数据
  realTimeData: {
    deformation: number;      // 变形 mm
    waterLevel: number;       // 水位 m
    soilPressure: number;     // 土压力 kPa
    supportForce: number;     // 支撑力 kN
    temperature: number;      // 温度 °C
    vibration: number;        // 振动 mm/s
    lastUpdate: string;
  };
  
  // 施工阶段信息
  constructionStages: Array<{
    id: string;
    name: string;
    progress: number;
    status: string;
    startDate: string;
    endDate: string;
  }>;
}

// 系统状态接口
interface SystemStatus {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  modules: {
    gis: { status: string; performance: number; lastCheck: string };
    weather: { status: string; performance: number; lastCheck: string };
    ai: { status: string; performance: number; lastCheck: string };
    computation: { status: string; performance: number; lastCheck: string };
    geometry: { status: string; performance: number; lastCheck: string };
    monitoring: { status: string; performance: number; lastCheck: string };
  };
  resources: {
    cpu: number;
    memory: number;
    gpu: number;
    network: number;
  };
}

interface EpicControlCenterDashboardProps {
  fullscreen?: boolean;
  onFullscreenToggle?: () => void;
  viewMode?: 'overview' | 'map' | 'monitoring' | 'analytics';
  onViewModeChange?: (mode: string) => void;
}

const EpicControlCenterDashboard: React.FC<EpicControlCenterDashboardProps> = ({
  fullscreen = false,
  onFullscreenToggle,
  viewMode = 'overview',
  onViewModeChange
}) => {
  // 状态管理
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [realTimeUpdates, setRealTimeUpdates] = useState(true);
  const [hudVisible, setHudVisible] = useState(true);
  
  // 3D场景引用
  const sceneRef = useRef<HTMLDivElement>(null);
  const threeSceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  // 模拟项目数据
  useEffect(() => {
    const mockProjects: ProjectData[] = [
      {
        id: 'proj_001',
        name: '上海中心深基坑',
        location: { lat: 31.2304, lng: 121.4737, alt: 0 },
        status: 'active',
        progress: 78,
        depth: 28.5,
        area: 12500,
        volume: 356250,
        startDate: '2024-03-15',
        endDate: '2024-12-30',
        riskLevel: 'medium',
        realTimeData: {
          deformation: 12.5,
          waterLevel: -8.2,
          soilPressure: 245.8,
          supportForce: 1850.2,
          temperature: 18.5,
          vibration: 0.8,
          lastUpdate: new Date().toISOString()
        },
        constructionStages: [
          { id: 'stage1', name: '第一层开挖', progress: 100, status: 'completed', startDate: '2024-03-15', endDate: '2024-05-20' },
          { id: 'stage2', name: '第二层开挖', progress: 85, status: 'active', startDate: '2024-05-21', endDate: '2024-07-15' },
          { id: 'stage3', name: '第三层开挖', progress: 45, status: 'active', startDate: '2024-07-16', endDate: '2024-09-30' },
          { id: 'stage4', name: '支护结构', progress: 0, status: 'pending', startDate: '2024-10-01', endDate: '2024-12-30' }
        ]
      },
      {
        id: 'proj_002', 
        name: '北京大兴机场T3',
        location: { lat: 39.5098, lng: 116.4105, alt: 0 },
        status: 'completed',
        progress: 100,
        depth: 22.0,
        area: 8900,
        volume: 195800,
        startDate: '2023-08-01',
        endDate: '2024-02-28',
        riskLevel: 'low',
        realTimeData: {
          deformation: 5.2,
          waterLevel: -12.8,
          soilPressure: 180.5,
          supportForce: 1205.8,
          temperature: 16.2,
          vibration: 0.3,
          lastUpdate: new Date().toISOString()
        },
        constructionStages: [
          { id: 'stage1', name: '基坑开挖', progress: 100, status: 'completed', startDate: '2023-08-01', endDate: '2023-11-15' },
          { id: 'stage2', name: '结构施工', progress: 100, status: 'completed', startDate: '2023-11-16', endDate: '2024-02-28' }
        ]
      },
      {
        id: 'proj_003',
        name: '深圳湾超级总部',
        location: { lat: 22.5431, lng: 113.9544, alt: 0 },
        status: 'warning',
        progress: 45,
        depth: 35.2,
        area: 15600,
        volume: 549120,
        startDate: '2024-01-10',
        endDate: '2025-03-20',
        riskLevel: 'high',
        realTimeData: {
          deformation: 28.5, // 超过预警值
          waterLevel: -5.5,
          soilPressure: 320.8,
          supportForce: 2150.5,
          temperature: 25.8,
          vibration: 1.5,
          lastUpdate: new Date().toISOString()
        },
        constructionStages: [
          { id: 'stage1', name: '围护结构', progress: 100, status: 'completed', startDate: '2024-01-10', endDate: '2024-03-25' },
          { id: 'stage2', name: '首层开挖', progress: 80, status: 'warning', startDate: '2024-03-26', endDate: '2024-06-15' },
          { id: 'stage3', name: '二层开挖', progress: 0, status: 'pending', startDate: '2024-06-16', endDate: '2024-09-30' }
        ]
      }
    ];

    setProjects(mockProjects);
  }, []);

  // 模拟系统状态
  useEffect(() => {
    const mockSystemStatus: SystemStatus = {
      overall: 'good',
      modules: {
        gis: { status: 'online', performance: 95, lastCheck: '2025-01-26 14:30:25' },
        weather: { status: 'online', performance: 88, lastCheck: '2025-01-26 14:30:20' },
        ai: { status: 'online', performance: 92, lastCheck: '2025-01-26 14:30:18' },
        computation: { status: 'online', performance: 85, lastCheck: '2025-01-26 14:30:15' },
        geometry: { status: 'warning', performance: 78, lastCheck: '2025-01-26 14:29:45' },
        monitoring: { status: 'online', performance: 98, lastCheck: '2025-01-26 14:30:28' }
      },
      resources: {
        cpu: 45,
        memory: 62,
        gpu: 38,
        network: 25
      }
    };

    setSystemStatus(mockSystemStatus);
  }, []);

  // 初始化3D场景
  useEffect(() => {
    if (!sceneRef.current || viewMode !== 'map') return;

    const initThreeScene = () => {
      const container = sceneRef.current!;
      
      // 创建场景
      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0a0a0f);
      threeSceneRef.current = scene;

      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 50, 100);
      cameraRef.current = camera;

      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
      renderer.setSize(container.clientWidth, container.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      rendererRef.current = renderer;
      
      container.appendChild(renderer.domElement);

      // 添加地球几何体
      const earthGeometry = new THREE.SphereGeometry(20, 64, 32);
      const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0x1a1a2e,
        transparent: true,
        opacity: 0.8,
        wireframe: true
      });
      const earth = new THREE.Mesh(earthGeometry, earthMaterial);
      scene.add(earth);

      // 添加项目标记
      projects.forEach((project, index) => {
        const markerGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const markerMaterial = new THREE.MeshPhongMaterial({
          color: project.status === 'active' ? 0x00d9ff :
                 project.status === 'completed' ? 0x10b981 :
                 project.status === 'warning' ? 0xf59e0b : 0xef4444,
          emissive: project.status === 'active' ? 0x003344 : 0x000000
        });
        
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        
        // 转换地理坐标到球面坐标
        const phi = (90 - project.location.lat) * (Math.PI / 180);
        const theta = (project.location.lng + 180) * (Math.PI / 180);
        
        marker.position.setFromSphericalCoords(22, phi, theta);
        scene.add(marker);
      });

      // 添加光照
      const ambientLight = new THREE.AmbientLight(0x404040, 0.4);
      scene.add(ambientLight);
      
      const directionalLight = new THREE.DirectionalLight(0x00d9ff, 0.8);
      directionalLight.position.set(50, 50, 50);
      scene.add(directionalLight);

      // 渲染循环
      const animate = () => {
        requestAnimationFrame(animate);
        
        if (earth) {
          earth.rotation.y += 0.005;
        }
        
        renderer.render(scene, camera);
      };
      animate();
    };

    initThreeScene();

    return () => {
      if (rendererRef.current && sceneRef.current) {
        sceneRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
    };
  }, [projects, viewMode]);

  // 实时数据更新
  useEffect(() => {
    if (!realTimeUpdates) return;

    const interval = setInterval(() => {
      setProjects(prev => prev.map(project => ({
        ...project,
        realTimeData: {
          ...project.realTimeData,
          deformation: project.realTimeData.deformation + (Math.random() - 0.5) * 2,
          waterLevel: project.realTimeData.waterLevel + (Math.random() - 0.5) * 0.5,
          soilPressure: project.realTimeData.soilPressure + (Math.random() - 0.5) * 10,
          supportForce: project.realTimeData.supportForce + (Math.random() - 0.5) * 50,
          temperature: project.realTimeData.temperature + (Math.random() - 0.5) * 1,
          vibration: Math.max(0, project.realTimeData.vibration + (Math.random() - 0.5) * 0.2),
          lastUpdate: new Date().toISOString()
        }
      })));
    }, 5000);

    return () => clearInterval(interval);
  }, [realTimeUpdates]);

  // 获取整体统计数据
  const overallStats = {
    totalProjects: projects.length,
    activeProjects: projects.filter(p => p.status === 'active').length,
    completedProjects: projects.filter(p => p.status === 'completed').length,
    warningProjects: projects.filter(p => p.status === 'warning' || p.status === 'error').length,
    averageProgress: projects.reduce((sum, p) => sum + p.progress, 0) / projects.length,
    totalVolume: projects.reduce((sum, p) => sum + p.volume, 0),
    criticalRisk: projects.filter(p => p.riskLevel === 'critical' || p.riskLevel === 'high').length
  };

  const containerStyle: React.CSSProperties = {
    width: '100%',
    height: fullscreen ? '100vh' : '800px',
    background: `linear-gradient(135deg, ${dashboardTokens.colors.bg.primary}, ${dashboardTokens.colors.bg.secondary})`,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  };

  const hudStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    zIndex: 100,
    background: hudVisible ? 'linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.3) 100%)' : 'none'
  };

  return (
    <div style={containerStyle}>
      {/* HUD叠加层 */}
      {hudVisible && (
        <div style={hudStyle}>
          {/* 顶部状态栏 */}
          <div style={{
            position: 'absolute',
            top: 20,
            left: 20,
            right: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
              <motion.h1
                style={{
                  margin: 0,
                  fontSize: dashboardTokens.fonts.sizes.hero,
                  fontWeight: dashboardTokens.fonts.weights.bold,
                  color: dashboardTokens.colors.accent.primary,
                  textShadow: `0 0 20px ${dashboardTokens.colors.accent.primary}40`
                }}
                {...dashboardAnimations.slideInLeft}
              >
                EPIC 控制中心
              </motion.h1>
              
              <DashboardStatus 
                status={systemStatus?.overall === 'excellent' ? 'online' : 
                       systemStatus?.overall === 'good' ? 'online' :
                       systemStatus?.overall === 'warning' ? 'warning' : 'error'}
                label={`系统状态: ${systemStatus?.overall || 'unknown'}`}
                size="large"
                pulse={true}
              />
            </div>

            <div style={{ display: 'flex', gap: 16 }}>
              {/* 视图切换 */}
              {['overview', 'map', 'monitoring', 'analytics'].map((mode) => (
                <motion.button
                  key={mode}
                  style={{
                    padding: '12px 20px',
                    background: viewMode === mode ? dashboardTokens.colors.accent.primary : 'transparent',
                    border: `2px solid ${dashboardTokens.colors.accent.primary}`,
                    borderRadius: dashboardTokens.borderRadius.sm,
                    color: viewMode === mode ? dashboardTokens.colors.bg.primary : dashboardTokens.colors.accent.primary,
                    fontSize: dashboardTokens.fonts.sizes.medium,
                    fontWeight: dashboardTokens.fonts.weights.medium,
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}
                  onClick={() => onViewModeChange?.(mode)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {mode === 'overview' ? '总览' :
                   mode === 'map' ? '地图' :
                   mode === 'monitoring' ? '监控' : '分析'}
                </motion.button>
              ))}
              
              {/* 全屏按钮 */}
              <motion.button
                style={{
                  padding: '12px',
                  background: 'transparent',
                  border: `2px solid ${dashboardTokens.colors.accent.secondary}`,
                  borderRadius: dashboardTokens.borderRadius.sm,
                  color: dashboardTokens.colors.accent.secondary,
                  fontSize: dashboardTokens.fonts.sizes.medium,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onClick={onFullscreenToggle}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {fullscreen ? '📉' : '📈'}
              </motion.button>
            </div>
          </div>

          {/* 底部信息栏 */}
          <div style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            pointerEvents: 'auto'
          }}>
            <div style={{ display: 'flex', gap: 32 }}>
              <DashboardMetric
                label="活跃项目"
                value={overallStats.activeProjects}
                color="primary"
                size="medium"
                animate={true}
              />
              <DashboardMetric
                label="平均进度"
                value={overallStats.averageProgress.toFixed(1)}
                unit="%"
                color="success"
                size="medium"
                animate={true}
              />
              <DashboardMetric
                label="风险项目"
                value={overallStats.criticalRisk}
                color="error"
                size="medium"
                animate={true}
              />
            </div>
            
            <div style={{
              fontSize: dashboardTokens.fonts.sizes.small,
              color: dashboardTokens.colors.text.secondary,
              fontFamily: 'monospace'
            }}>
              {new Date().toLocaleString('zh-CN')} | DeepCAD v2.0.0 | {realTimeUpdates ? '🟢 实时更新' : '🔴 静态模式'}
            </div>
          </div>
        </div>
      )}

      {/* 主内容区域 */}
      <div style={{ flex: 1, padding: hudVisible ? '100px 40px' : '40px' }}>
        <AnimatePresence mode="wait">
          {/* 总览模式 */}
          {viewMode === 'overview' && (
            <motion.div
              key="overview"
              {...dashboardAnimations.fadeIn}
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: dashboardTokens.spacing.lg,
                height: '100%'
              }}
            >
              {/* 项目卡片 */}
              {projects.map((project, index) => (
                <DashboardCard
                  key={project.id}
                  title={project.name}
                  subtitle={`深度: ${project.depth}m | 面积: ${project.area.toLocaleString()}m²`}
                  glassEffect={true}
                  sciFiBorder={true}
                  status={project.status === 'active' ? 'normal' :
                         project.status === 'completed' ? 'success' :
                         project.status === 'warning' ? 'warning' : 'error'}
                  realTimeUpdate={realTimeUpdates}
                  delay={index * 0.1}
                  onClick={() => setSelectedProject(project.id)}
                  className={selectedProject === project.id ? 'selected' : ''}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: dashboardTokens.spacing.md }}>
                    {/* 进度条 */}
                    <DashboardProgress
                      value={project.progress}
                      label="完成进度"
                      color={project.status === 'warning' ? 'warning' : 'primary'}
                      size="large"
                      animated={true}
                      gradient={true}
                      glowEffect={true}
                    />
                    
                    {/* 实时数据 */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: dashboardTokens.spacing.sm
                    }}>
                      <DashboardMetric
                        label="变形监测"
                        value={project.realTimeData.deformation.toFixed(1)}
                        unit="mm"
                        color={project.realTimeData.deformation > 25 ? 'error' : 
                               project.realTimeData.deformation > 15 ? 'warning' : 'success'}
                        size="small"
                        animate={true}
                      />
                      <DashboardMetric
                        label="支撑力"
                        value={project.realTimeData.supportForce.toFixed(0)}
                        unit="kN"
                        color="primary"
                        size="small"
                        animate={true}
                      />
                      <DashboardMetric
                        label="水位"
                        value={project.realTimeData.waterLevel.toFixed(1)}
                        unit="m"
                        color="secondary"
                        size="small"
                        animate={true}
                      />
                      <DashboardMetric
                        label="土压力"
                        value={project.realTimeData.soilPressure.toFixed(0)}
                        unit="kPa"
                        color="warning"
                        size="small"
                        animate={true}
                      />
                    </div>

                    {/* 风险等级 */}
                    <div style={{
                      padding: dashboardTokens.spacing.sm,
                      background: `${dashboardTokens.colors.accent[
                        project.riskLevel === 'critical' ? 'error' :
                        project.riskLevel === 'high' ? 'error' :
                        project.riskLevel === 'medium' ? 'warning' : 'success'
                      ]}20`,
                      borderRadius: dashboardTokens.borderRadius.sm,
                      borderLeft: `4px solid ${dashboardTokens.colors.accent[
                        project.riskLevel === 'critical' ? 'error' :
                        project.riskLevel === 'high' ? 'error' :
                        project.riskLevel === 'medium' ? 'warning' : 'success'
                      ]}`,
                      textAlign: 'center'
                    }}>
                      <span style={{
                        fontSize: dashboardTokens.fonts.sizes.small,
                        fontWeight: dashboardTokens.fonts.weights.semibold,
                        color: dashboardTokens.colors.text.primary,
                        textTransform: 'uppercase'
                      }}>
                        风险等级: {project.riskLevel === 'critical' ? '严重' :
                                project.riskLevel === 'high' ? '高' :
                                project.riskLevel === 'medium' ? '中等' : '低'}
                      </span>
                    </div>
                  </div>
                </DashboardCard>
              ))}
            </motion.div>
          )}

          {/* 地图模式 */}
          {viewMode === 'map' && (
            <motion.div
              key="map"
              {...dashboardAnimations.fadeIn}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <div
                ref={sceneRef}
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: dashboardTokens.borderRadius.lg,
                  overflow: 'hidden',
                  border: `2px solid ${dashboardTokens.colors.border.primary}`,
                  boxShadow: dashboardTokens.shadows.glow
                }}
              />
            </motion.div>
          )}

          {/* 监控模式 */}
          {viewMode === 'monitoring' && systemStatus && (
            <motion.div
              key="monitoring"
              {...dashboardAnimations.fadeIn}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gridTemplateRows: 'auto 1fr',
                gap: dashboardTokens.spacing.lg,
                height: '100%'
              }}
            >
              {/* 系统资源监控 */}
              <DashboardCard
                title="系统资源监控"
                subtitle="实时性能指标"
                glassEffect={true}
                sciFiBorder={true}
                realTimeUpdate={true}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: dashboardTokens.spacing.md }}>
                  {Object.entries(systemStatus.resources).map(([key, value]) => (
                    <div key={key}>
                      <DashboardProgress
                        value={value}
                        label={key.toUpperCase()}
                        color={value > 80 ? 'error' : value > 60 ? 'warning' : 'success'}
                        size="medium"
                        animated={true}
                        gradient={true}
                      />
                    </div>
                  ))}
                </div>
              </DashboardCard>

              {/* 模块状态监控 */}
              <DashboardCard
                title="模块状态监控"
                subtitle="各系统模块运行状态"
                glassEffect={true}
                sciFiBorder={true}
                realTimeUpdate={true}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: dashboardTokens.spacing.sm
                }}>
                  {Object.entries(systemStatus.modules).map(([key, module]) => (
                    <div key={key} style={{
                      padding: dashboardTokens.spacing.sm,
                      background: dashboardTokens.colors.bg.card,
                      borderRadius: dashboardTokens.borderRadius.sm,
                      border: `1px solid ${dashboardTokens.colors.border.secondary}`,
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: dashboardTokens.spacing.xs,
                        marginBottom: dashboardTokens.spacing.xs
                      }}>
                        <DashboardStatus
                          status={module.status === 'online' ? 'online' : 
                                 module.status === 'warning' ? 'warning' : 'error'}
                          size="small"
                          showLabel={false}
                        />
                        <span style={{
                          fontSize: dashboardTokens.fonts.sizes.small,
                          fontWeight: dashboardTokens.fonts.weights.medium,
                          color: dashboardTokens.colors.text.primary,
                          textTransform: 'uppercase'
                        }}>
                          {key}
                        </span>
                      </div>
                      <DashboardMetric
                        label="性能"
                        value={module.performance}
                        unit="%"
                        size="small"
                        color={module.performance > 90 ? 'success' : 
                               module.performance > 75 ? 'primary' : 'warning'}
                        animate={true}
                      />
                    </div>
                  ))}
                </div>
              </DashboardCard>

              {/* 实时告警信息 */}
              <DashboardCard
                title="实时告警信息"
                subtitle="系统异常和风险提示"
                glassEffect={true}
                sciFiBorder={true}
                status="warning"
                style={{ gridColumn: '1 / -1' }}
              >
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  {projects
                    .filter(p => p.status === 'warning' || p.realTimeData.deformation > 25)
                    .map((project, index) => (
                      <motion.div
                        key={project.id}
                        style={{
                          padding: dashboardTokens.spacing.sm,
                          background: `${dashboardTokens.colors.accent.warning}20`,
                          borderRadius: dashboardTokens.borderRadius.sm,
                          borderLeft: `4px solid ${dashboardTokens.colors.accent.warning}`,
                          marginBottom: dashboardTokens.spacing.sm
                        }}
                        {...dashboardAnimations.slideInLeft}
                        transition={{ delay: index * 0.1 }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.medium,
                            fontWeight: dashboardTokens.fonts.weights.medium,
                            color: dashboardTokens.colors.text.primary
                          }}>
                            {project.name}
                          </span>
                          <span style={{
                            fontSize: dashboardTokens.fonts.sizes.small,
                            color: dashboardTokens.colors.accent.warning,
                            fontWeight: dashboardTokens.fonts.weights.semibold
                          }}>
                            变形超限: {project.realTimeData.deformation.toFixed(1)}mm
                          </span>
                        </div>
                      </motion.div>
                    ))}
                </div>
              </DashboardCard>
            </motion.div>
          )}

          {/* 分析模式 */}
          {viewMode === 'analytics' && (
            <motion.div
              key="analytics"
              {...dashboardAnimations.fadeIn}
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%'
              }}
            >
              <DashboardCard
                title="深度分析模块"
                subtitle="数据分析和趋势预测"
                glassEffect={true}
                sciFiBorder={true}
                status="loading"
                padding="xl"
              >
                <div style={{ textAlign: 'center', padding: dashboardTokens.spacing.xxl }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    style={{
                      width: 60,
                      height: 60,
                      margin: '0 auto 20px',
                      border: `4px solid ${dashboardTokens.colors.accent.primary}`,
                      borderTop: '4px solid transparent',
                      borderRadius: '50%'
                    }}
                  />
                  <h3 style={{
                    fontSize: dashboardTokens.fonts.sizes.large,
                    color: dashboardTokens.colors.text.primary,
                    margin: '0 0 10px 0'
                  }}>
                    AI分析引擎启动中...
                  </h3>
                  <p style={{
                    fontSize: dashboardTokens.fonts.sizes.medium,
                    color: dashboardTokens.colors.text.secondary,
                    margin: 0
                  }}>
                    正在处理项目数据和风险评估模型
                  </p>
                </div>
              </DashboardCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 控制面板切换按钮 */}
      <motion.button
        style={{
          position: 'absolute',
          top: 20,
          right: 100,
          padding: '8px',
          background: 'rgba(0,0,0,0.5)',
          border: `1px solid ${dashboardTokens.colors.border.primary}`,
          borderRadius: '50%',
          color: dashboardTokens.colors.accent.primary,
          cursor: 'pointer',
          zIndex: 200
        }}
        onClick={() => setHudVisible(!hudVisible)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {hudVisible ? '👁️' : '🔲'}
      </motion.button>
    </div>
  );
};

export default EpicControlCenterDashboard;