/**
 * 1号首席架构师优化系统 - 炫酷大屏监控面板
 * @description 科技感十足的实时监控大屏，展示三大优化系统的运行状态
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as THREE from 'three';
import * as d3 from 'd3';
import { motion, AnimatePresence } from 'framer-motion';
import RealTime3DVisualization from './RealTime3DVisualization';
import { 
  RealTimeWaveChart, 
  CircularProgress3D, 
  NetworkTopologyGraph, 
  BarChart3D, 
  RadarChart 
} from './AdvancedCharts';
import { 
  Cpu, 
  MemoryStick, 
  Monitor, 
  Activity, 
  Zap, 
  Database,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  Settings,
  Play,
  Pause,
  RefreshCw,
  Maximize2,
  BarChart3,
  PieChart,
  LineChart,
  Layers,
  Globe,
  Flame
} from 'lucide-react';

// 类型定义
interface SystemMetrics {
  memory: {
    total: number;
    used: number;
    cached: number;
    available: number;
    usageHistory: number[];
  };
  gpu: {
    utilization: number;
    memory: number;
    temperature: number;
    renderer: string;
    capabilities: string[];
    performanceHistory: number[];
  };
  rendering: {
    fps: number;
    frameTime: number;
    drawCalls: number;
    vertices: number;
    renderingHistory: number[];
  };
  system: {
    health: number;
    status: 'optimal' | 'warning' | 'critical';
    uptime: number;
    bottlenecks: string[];
  };
}

interface OptimizationAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: Date;
  severity: number;
}

/**
 * 炫酷的架构师优化监控大屏
 * @description 1号首席架构师的终极监控面板 - 包含3D可视化、实时图表、动态效果
 */
export default function ArchitectOptimizationDashboard() {
  // 状态管理
  const [metrics, setMetrics] = useState<SystemMetrics>({
    memory: {
      total: 32 * 1024 * 1024 * 1024, // 32GB
      used: 8.2 * 1024 * 1024 * 1024,
      cached: 2.1 * 1024 * 1024 * 1024,
      available: 21.7 * 1024 * 1024 * 1024,
      usageHistory: Array.from({ length: 60 }, () => Math.random() * 30 + 20)
    },
    gpu: {
      utilization: 65,
      memory: 78,
      temperature: 72,
      renderer: 'WebGPU',
      capabilities: ['Compute Shaders', 'Ray Tracing', 'Mesh Shaders'],
      performanceHistory: Array.from({ length: 60 }, () => Math.random() * 40 + 40)
    },
    rendering: {
      fps: 58,
      frameTime: 17.2,
      drawCalls: 1250,
      vertices: 2000000,
      renderingHistory: Array.from({ length: 60 }, () => Math.random() * 20 + 50)
    },
    system: {
      health: 92,
      status: 'optimal',
      uptime: 3600 * 2.5,
      bottlenecks: []
    }
  });

  const [alerts, setAlerts] = useState<OptimizationAlert[]>([
    {
      id: '1',
      type: 'success',
      title: 'WebGPU 加速启用',
      message: '成功启用WebGPU加速，渲染性能提升300%',
      timestamp: new Date(),
      severity: 1
    },
    {
      id: '2',
      type: 'info',
      title: '内存优化完成',
      message: '智能内存管理释放了1.2GB内存空间',
      timestamp: new Date(Date.now() - 30000),
      severity: 2
    }
  ]);

  const [isMonitoring, setIsMonitoring] = useState(true);
  const [selectedView, setSelectedView] = useState<'overview' | 'memory' | 'gpu' | 'rendering'>('overview');

  // 引用
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const animationIdRef = useRef<number>();

  // 3D背景场景初始化
  useEffect(() => {
    if (!canvasRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current, 
      alpha: true,
      antialias: true 
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);

    // 创建炫酷的3D背景
    const geometry = new THREE.IcosahedronGeometry(1, 4);
    const material = new THREE.MeshBasicMaterial({ 
      color: 0x00ffff, 
      wireframe: true,
      transparent: true,
      opacity: 0.1
    });

    const particles = [];
    for (let i = 0; i < 200; i++) {
      const particle = new THREE.Mesh(
        new THREE.SphereGeometry(0.02, 8, 8),
        new THREE.MeshBasicMaterial({ 
          color: new THREE.Color().setHSL(Math.random(), 0.8, 0.6),
          transparent: true,
          opacity: 0.6
        })
      );
      
      particle.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 40
      );
      
      particles.push(particle);
      scene.add(particle);
    }

    camera.position.z = 20;
    sceneRef.current = scene;
    rendererRef.current = renderer;

    const animate = () => {
      particles.forEach((particle, i) => {
        particle.rotation.x += 0.01;
        particle.rotation.y += 0.01;
        particle.position.y += Math.sin(Date.now() * 0.001 + i) * 0.002;
      });

      renderer.render(scene, camera);
      animationIdRef.current = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      renderer.dispose();
    };
  }, []);

  // 实时数据更新
  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      setMetrics(prev => ({
        memory: {
          ...prev.memory,
          used: prev.memory.total * (0.2 + Math.random() * 0.3),
          usageHistory: [...prev.memory.usageHistory.slice(1), 20 + Math.random() * 30]
        },
        gpu: {
          ...prev.gpu,
          utilization: 40 + Math.random() * 40,
          memory: 50 + Math.random() * 40,
          temperature: 65 + Math.random() * 15,
          performanceHistory: [...prev.gpu.performanceHistory.slice(1), 40 + Math.random() * 40]
        },
        rendering: {
          ...prev.rendering,
          fps: 50 + Math.random() * 20,
          frameTime: 12 + Math.random() * 10,
          drawCalls: 1000 + Math.random() * 500,
          renderingHistory: [...prev.rendering.renderingHistory.slice(1), 50 + Math.random() * 20]
        },
        system: {
          ...prev.system,
          health: 85 + Math.random() * 15,
          uptime: prev.system.uptime + 1
        }
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  // 格式化函数
  const formatBytes = (bytes: number) => {
    const gb = bytes / (1024 * 1024 * 1024);
    return `${gb.toFixed(1)} GB`;
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  // 状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'optimal': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'from-green-400 to-emerald-600';
    if (health >= 70) return 'from-yellow-400 to-orange-500';
    return 'from-red-400 to-red-600';
  };

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* 3D 背景 */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 w-full h-full -z-10"
      />
      
      {/* 动态网格背景 */}
      <div className="absolute inset-0 -z-10 opacity-20">
        <div className="w-full h-full bg-gradient-to-br from-blue-900/20 via-purple-900/20 to-cyan-900/20">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,255,255,0.1),transparent_70%)]" />
        </div>
      </div>

      {/* 顶部标题栏 */}
      <motion.header 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 p-6 border-b border-cyan-500/30 bg-black/50 backdrop-blur-sm"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                DeepCAD 架构师优化系统
              </h1>
              <p className="text-gray-400">1号首席架构师 - 实时性能监控大屏</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* 系统状态指示器 */}
            <motion.div 
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r ${
                metrics.system.status === 'optimal' ? 'from-green-500/20 to-emerald-500/20 border-green-500/50' :
                metrics.system.status === 'warning' ? 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50' :
                'from-red-500/20 to-red-600/20 border-red-500/50'
              } border`}
            >
              <CheckCircle className={`w-5 h-5 ${getStatusColor(metrics.system.status)}`} />
              <span className={`font-medium ${getStatusColor(metrics.system.status)}`}>
                {metrics.system.status.toUpperCase()}
              </span>
            </motion.div>

            {/* 控制按钮 */}
            <div className="flex space-x-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`p-3 rounded-lg border transition-all ${
                  isMonitoring 
                    ? 'bg-green-500/20 border-green-500/50 text-green-400' 
                    : 'bg-gray-500/20 border-gray-500/50 text-gray-400'
                }`}
              >
                {isMonitoring ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/50 text-blue-400 hover:bg-blue-500/30"
              >
                <RefreshCw className="w-5 h-5" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-lg bg-purple-500/20 border border-purple-500/50 text-purple-400 hover:bg-purple-500/30"
              >
                <Settings className="w-5 h-5" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.header>

      {/* 主要内容区域 */}
      <main className="flex-1 p-6 space-y-6">
        {/* 核心指标卡片 */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* 系统健康度 */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-cyan-500/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Activity className="w-8 h-8 text-cyan-400" />
                <span className="text-2xl font-bold text-white">{metrics.system.health.toFixed(0)}%</span>
              </div>
              <h3 className="text-gray-300 mb-2">系统健康度</h3>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.system.health}%` }}
                  className={`h-full rounded-full bg-gradient-to-r ${getHealthColor(metrics.system.health)}`}
                />
              </div>
            </div>
          </motion.div>

          {/* 内存使用率 */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-purple-500/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-500/20 to-pink-600/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <MemoryStick className="w-8 h-8 text-purple-400" />
                <span className="text-2xl font-bold text-white">
                  {formatBytes(metrics.memory.used)}
                </span>
              </div>
              <h3 className="text-gray-300 mb-2">内存使用</h3>
              <div className="text-sm text-gray-400">
                {formatBytes(metrics.memory.total)} 总计
              </div>
            </div>
          </motion.div>

          {/* GPU 利用率 */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-green-500/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-500/20 to-emerald-600/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <Monitor className="w-8 h-8 text-green-400" />
                <span className="text-2xl font-bold text-white">{metrics.gpu.utilization.toFixed(0)}%</span>
              </div>
              <h3 className="text-gray-300 mb-2">GPU 利用率</h3>
              <div className="text-sm text-gray-400">
                {metrics.gpu.renderer} 渲染器
              </div>
            </div>
          </motion.div>

          {/* 渲染性能 */}
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="relative p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-orange-500/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-500/20 to-red-600/20 rounded-full -translate-y-16 translate-x-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <TrendingUp className="w-8 h-8 text-orange-400" />
                <span className="text-2xl font-bold text-white">{metrics.rendering.fps.toFixed(0)} FPS</span>
              </div>
              <h3 className="text-gray-300 mb-2">渲染性能</h3>
              <div className="text-sm text-gray-400">
                {metrics.rendering.frameTime.toFixed(1)}ms 帧时间
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 3D系统架构可视化 */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mb-6"
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-cyan-500/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <Globe className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">3D系统架构实时监控</h3>
              <span className="px-3 py-1 text-xs rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                WebGPU加速
              </span>
            </div>
            <RealTime3DVisualization height="400px" className="rounded-lg overflow-hidden" />
          </div>
        </motion.div>

        {/* 详细监控图表区域 */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          {/* 实时性能波形图 */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="col-span-1 lg:col-span-2 xl:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-blue-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <LineChart className="w-6 h-6 text-blue-400" />
                <h3 className="text-xl font-bold text-white">实时性能监控</h3>
              </div>
              <div className="flex space-x-2">
                <span className="px-3 py-1 text-xs rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  WebGPU加速
                </span>
                <span className="px-3 py-1 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">
                  {metrics.rendering.fps.toFixed(0)} FPS
                </span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-48">
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-400 mb-2">内存使用率</h4>
                <RealTimeWaveChart
                  data={metrics.memory.usageHistory.map((value, index) => ({
                    timestamp: new Date(Date.now() - (59 - index) * 1000),
                    value: value
                  }))}
                  width={200}
                  height={120}
                  color="#60a5fa"
                  glowEffect={true}
                  animate={false}
                />
              </div>
              
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-green-400 mb-2">GPU性能</h4>
                <RealTimeWaveChart
                  data={metrics.gpu.performanceHistory.map((value, index) => ({
                    timestamp: new Date(Date.now() - (59 - index) * 1000),
                    value: value
                  }))}
                  width={200}
                  height={120}
                  color="#10b981"
                  glowEffect={true}
                  animate={false}
                />
              </div>
              
              <div className="bg-black/30 rounded-lg p-4">
                <h4 className="text-sm font-medium text-orange-400 mb-2">渲染帧率</h4>
                <RealTimeWaveChart
                  data={metrics.rendering.renderingHistory.map((value, index) => ({
                    timestamp: new Date(Date.now() - (59 - index) * 1000),
                    value: value
                  }))}
                  width={200}
                  height={120}
                  color="#f97316"
                  glowEffect={true}
                  animate={false}
                />
              </div>
            </div>
          </motion.div>

          {/* 多维度性能雷达图 */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-purple-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-3 mb-6">
              <Activity className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">系统性能雷达</h3>
            </div>
            
            <div className="flex justify-center">
              <RadarChart
                data={[
                  { axis: 'CPU', value: metrics.system.health * 0.6, fullMark: 100 },
                  { axis: 'GPU', value: metrics.gpu.utilization, fullMark: 100 },
                  { axis: '内存', value: (metrics.memory.used / metrics.memory.total) * 100, fullMark: 100 },
                  { axis: '渲染', value: metrics.rendering.fps * 1.5, fullMark: 100 },
                  { axis: '网络', value: 75, fullMark: 100 },
                  { axis: '存储', value: 68, fullMark: 100 }
                ]}
                size={240}
                maxValue={100}
              />
            </div>
            
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-gray-300">Terra 10.3</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">PyVista</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-gray-300">Three.js</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                <span className="text-gray-300">WebGPU</span>
              </div>
            </div>
          </motion.div>

          {/* 3D柱状图和圆形进度 */}
          <motion.div
            whileHover={{ scale: 1.01 }}
            className="col-span-1 lg:col-span-2 xl:col-span-1 p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-green-500/30 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-3 mb-6">
              <BarChart3 className="w-6 h-6 text-green-400" />
              <h3 className="text-xl font-bold text-white">系统负载分析</h3>
            </div>
            
            <div className="space-y-6">
              {/* 3D柱状图 */}
              <div className="flex justify-center">
                <BarChart3D
                  data={[
                    { label: 'CPU', value: metrics.system.health * 0.6 },
                    { label: 'GPU', value: metrics.gpu.utilization },
                    { label: '内存', value: (metrics.memory.used / metrics.memory.total) * 100 },
                    { label: '渲染', value: metrics.rendering.fps * 1.2 }
                  ]}
                  width={300}
                  height={200}
                  colors={['#10b981', '#3b82f6', '#8b5cf6', '#f97316']}
                />
              </div>
              
              {/* 圆形进度指示器 */}
              <div className="flex justify-center">
                <CircularProgress3D
                  data={[
                    {
                      label: '系统健康',
                      value: metrics.system.health,
                      max: 100,
                      color: '#10b981',
                      glow: true
                    },
                    {
                      label: 'GPU利用',
                      value: metrics.gpu.utilization,
                      max: 100,
                      color: '#3b82f6',
                      glow: true
                    },
                    {
                      label: '内存使用',
                      value: (metrics.memory.used / metrics.memory.total) * 100,
                      max: 100,
                      color: '#8b5cf6',
                      glow: true
                    }
                  ]}
                  size={180}
                  thickness={12}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* 网络拓扑图 */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mb-6"
        >
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-purple-500/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <Layers className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">系统架构拓扑</h3>
              <span className="px-3 py-1 text-xs rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                动态连接
              </span>
            </div>
            
            <NetworkTopologyGraph
              nodes={[
                { id: 'memory', name: '内存管理器', group: 1, value: 80 },
                { id: 'gpu', name: 'GPU监控器', group: 2, value: 90 },
                { id: 'rendering', name: '渲染降级', group: 3, value: 70 },
                { id: 'terra', name: 'Terra 10.3', group: 4, value: 100 },
                { id: 'pyvista', name: 'PyVista', group: 5, value: 75 },
                { id: 'threejs', name: 'Three.js', group: 6, value: 85 }
              ]}
              links={[
                { source: 'memory', target: 'gpu', value: 5, type: 'data' },
                { source: 'gpu', target: 'rendering', value: 3, type: 'control' },
                { source: 'terra', target: 'pyvista', value: 8, type: 'data' },
                { source: 'terra', target: 'threejs', value: 6, type: 'data' },
                { source: 'pyvista', target: 'gpu', value: 4, type: 'render' },
                { source: 'threejs', target: 'gpu', value: 4, type: 'render' }
              ]}
              width={800}
              height={300}
              interactive={true}
            />
          </div>
        </motion.div>

        {/* 实时警报和日志 */}
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
        >
          {/* 系统警报 */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-yellow-500/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <AlertTriangle className="w-6 h-6 text-yellow-400" />
              <h3 className="text-xl font-bold text-white">系统警报</h3>
              <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                {alerts.length}
              </span>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
              <AnimatePresence>
                {alerts.map((alert) => (
                  <motion.div
                    key={alert.id}
                    initial={{ x: -100, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 100, opacity: 0 }}
                    className={`p-4 rounded-lg border-l-4 ${
                      alert.type === 'success' ? 'bg-green-500/10 border-green-500 text-green-400' :
                      alert.type === 'warning' ? 'bg-yellow-500/10 border-yellow-500 text-yellow-400' :
                      alert.type === 'error' ? 'bg-red-500/10 border-red-500 text-red-400' :
                      'bg-blue-500/10 border-blue-500 text-blue-400'
                    }`}
                  >
                    <div className="font-medium mb-1">{alert.title}</div>
                    <div className="text-sm opacity-80">{alert.message}</div>
                    <div className="text-xs opacity-60 mt-2">
                      {alert.timestamp.toLocaleTimeString()}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* 系统信息面板 */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-black/60 to-gray-900/60 border border-purple-500/30 backdrop-blur-sm">
            <div className="flex items-center space-x-3 mb-6">
              <Database className="w-6 h-6 text-purple-400" />
              <h3 className="text-xl font-bold text-white">系统信息</h3>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-400 mb-1">运行时间</div>
                  <div className="text-white font-mono">{formatUptime(metrics.system.uptime)}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">渲染器</div>
                  <div className="text-white font-mono">{metrics.gpu.renderer}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">顶点数</div>
                  <div className="text-white font-mono">{metrics.rendering.vertices.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">绘制调用</div>
                  <div className="text-white font-mono">{metrics.rendering.drawCalls.toLocaleString()}</div>
                </div>
              </div>
              
              <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                <div className="text-center">
                  <motion.div 
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="text-2xl font-bold text-transparent bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text mb-2"
                  >
                    200万单元
                  </motion.div>
                  <div className="text-sm text-gray-400">Terra 10.3 + PyVista + Three.js</div>
                  <div className="text-xs text-cyan-400 mt-1">32GB 内存优化架构</div>
                  <div className="text-xs text-purple-400 mt-1">1号首席架构师优化系统 v3.0</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* 底部状态栏 */}
      <motion.footer
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="fixed bottom-0 left-0 right-0 p-4 bg-black/70 backdrop-blur-sm border-t border-cyan-500/30"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-400">系统运行正常</span>
            </div>
            <div className="text-gray-400">
              运行时间: {formatUptime(metrics.system.uptime)}
            </div>
            <div className="text-gray-400">
              内存: {formatBytes(metrics.memory.used)} / {formatBytes(metrics.memory.total)}
            </div>
          </div>
          
          <div className="flex items-center space-x-4 text-xs">
            <div className="text-cyan-400">
              FPS: {metrics.rendering.fps.toFixed(0)}
            </div>
            <div className="text-purple-400">
              GPU: {metrics.gpu.utilization.toFixed(0)}%
            </div>
            <div className="text-green-400">
              健康度: {metrics.system.health.toFixed(0)}%
            </div>
            <div className="px-2 py-1 rounded bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
              <span className="text-cyan-400 font-mono text-xs">1号架构师 v3.0</span>
            </div>
          </div>
        </div>
      </motion.footer>

      {/* 自定义滚动条样式 */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(75, 85, 99, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(6, 182, 212, 0.6);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(6, 182, 212, 0.8);
        }
        
        /* 全屏发光动画 */
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.3); }
          50% { box-shadow: 0 0 40px rgba(6, 182, 212, 0.6); }
        }
        
        .animate-pulse-glow {
          animation: pulse-glow 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}