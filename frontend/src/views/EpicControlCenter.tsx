/**
 * DeepCAD 史诗级控制中心
 * 1号架构师 + 2号几何专家 - 集成Epic Demo和Mapbox + Three.js的震撼多项目管理控制中心
 * 支持多用户、多项目的企业级CAE平台控制体验 + 地理可视化
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout, Card, Row, Col, Button, Avatar, Badge, Typography, Progress, Statistic } from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  EyeOutlined,
  ProjectOutlined,
  TeamOutlined,
  GlobalOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  UserOutlined,
  BellOutlined,
  EnvironmentOutlined,
  BgColorsOutlined,
  RobotOutlined
} from '@ant-design/icons';
import EpicFlightDemo from '../components/visualization/EpicFlightDemo';
// import MapboxThreeJSFusion from '../components/geographical/MapboxThreeJSFusion'; // 移除Mapbox依赖
import WAEffectsInterface from '../components/effects/WAEffectsInterface';
import CubeViewNavigationControl from '../components/3d/navigation/CubeViewNavigationControl';
import AIAssistantRAGInterface from '../components/ai/AIAssistantRAGInterface';
import { geographicalVisualizationService } from '../services/geographicalVisualizationService';
import { logger } from '../utils/advancedLogger';
import { designTokens } from '../design/tokens';
import * as THREE from 'three';

const { Content } = Layout;
const { Title, Text } = Typography;

// ==================== 类型定义 ====================

interface Project {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  status: 'planning' | 'running' | 'completed' | 'paused';
  progress: number;
  team: string[];
  thumbnail: string;
  description: string;
  lastUpdate: Date;
  computationStatus: {
    meshing: number;
    analysis: number;
    results: number;
  };
}

interface User {
  id: string;
  name: string;
  role: string;
  avatar: string;
  isOnline: boolean;
  currentProject?: string;
}

// ==================== 演示数据 ====================

const DEMO_PROJECTS: Project[] = [
  {
    id: '1',
    name: '上海中心深基坑工程',
    location: '上海浦东新区',
    latitude: 31.2304,
    longitude: 121.4737,
    status: 'running',
    progress: 75,
    team: ['张工程师', '李专家', '王分析师'],
    thumbnail: '/project-thumbnails/shanghai-center.jpg',
    description: '632米超高层建筑，70米深基坑工程',
    lastUpdate: new Date(),
    computationStatus: {
      meshing: 100,
      analysis: 85,
      results: 60
    }
  },
  {
    id: '2',
    name: '北京大兴机场T1航站楼',
    location: '北京大兴区',
    latitude: 39.5098,
    longitude: 116.4105,
    status: 'completed',
    progress: 100,
    team: ['陈工程师', '刘专家'],
    thumbnail: '/project-thumbnails/beijing-airport.jpg',
    description: '大型航站楼深基坑支护工程',
    lastUpdate: new Date(Date.now() - 86400000),
    computationStatus: {
      meshing: 100,
      analysis: 100,
      results: 100
    }
  },
  {
    id: '3',
    name: '深圳前海金融中心',
    location: '深圳前海区',
    latitude: 22.5329,
    longitude: 113.8900,
    status: 'planning',
    progress: 25,
    team: ['赵工程师', '孙专家', '周分析师', '吴设计师'],
    thumbnail: '/project-thumbnails/shenzhen-finance.jpg',
    description: '前海核心区地下空间开发',
    lastUpdate: new Date(Date.now() - 3600000),
    computationStatus: {
      meshing: 45,
      analysis: 20,
      results: 0
    }
  }
];

const DEMO_USERS: User[] = [
  {
    id: '1',
    name: '张工程师',
    role: '项目经理',
    avatar: '/avatars/engineer1.jpg',
    isOnline: true,
    currentProject: '1'
  },
  {
    id: '2',
    name: '李专家',
    role: '计算专家',
    avatar: '/avatars/expert1.jpg',
    isOnline: true,
    currentProject: '1'
  },
  {
    id: '3',
    name: '王分析师',
    role: '结果分析师',
    avatar: '/avatars/analyst1.jpg',
    isOnline: false,
    currentProject: '2'
  }
];

// ==================== 主组件 ====================

const EpicControlCenter: React.FC = () => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showEpicDemo, setShowEpicDemo] = useState(false);
  const [showMapboxView, setShowMapboxView] = useState(false);
  const [showWAEffects, setShowWAEffects] = useState(false);
  const [showCubeViewNavigation, setShowCubeViewNavigation] = useState(false);
  const [epicDemoState, setEpicDemoState] = useState<'idle' | 'flying' | 'paused'>('idle');
  const [currentUser] = useState<User>(DEMO_USERS[0]);
  
  // 3D视口相机和控制器引用
  const [threeCamera, setThreeCamera] = useState<THREE.Camera | null>(null);
  const [threeControls, setThreeControls] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState({
    totalProjects: DEMO_PROJECTS.length,
    activeProjects: DEMO_PROJECTS.filter(p => p.status === 'running').length,
    onlineUsers: DEMO_USERS.filter(u => u.isOnline).length,
    totalUsers: DEMO_USERS.length,
    computationLoad: 68,
    storageUsed: 2.4,
    networkLatency: 15
  });

  // 2号几何专家：初始化地理可视化服务
  useEffect(() => {
    const initializeGeographicalService = async () => {
      try {
        // 将演示项目转换为地理项目数据
        const geoProjects = DEMO_PROJECTS.map(project => ({
          id: project.id,
          name: project.name,
          location: {
            latitude: project.latitude,
            longitude: project.longitude,
            elevation: 50
          },
          status: project.status === 'running' ? 'active' as const : 
                  project.status === 'planning' ? 'planning' as const : 
                  'completed' as const,
          depth: 20 + Math.random() * 15, // 随机深度
          boundaries: [],
          excavationDepth: 20 + Math.random() * 15,
          supportStructures: [],
          geologicalLayers: [],
          materials: []
        }));

        // 添加项目到地理服务
        geoProjects.forEach(project => {
          geographicalVisualizationService.addProject(project);
        });

        logger.info('Epic控制中心地理可视化初始化完成', { 
          projectCount: geoProjects.length 
        });
      } catch (error) {
        logger.error('地理可视化初始化失败', error);
      }
    };

    initializeGeographicalService();
  }, []);

  // 实时数据更新
  useEffect(() => {
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        computationLoad: Math.max(20, Math.min(95, prev.computationLoad + (Math.random() - 0.5) * 10)),
        networkLatency: Math.max(5, Math.min(50, prev.networkLatency + (Math.random() - 0.5) * 5))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // 启动Epic演示
  const handleStartEpicDemo = useCallback(() => {
    setShowEpicDemo(true);
    setEpicDemoState('flying');
    setShowMapboxView(false); // 关闭Mapbox视图
    setShowWAEffects(false); // 关闭WA效应
    setShowCubeViewNavigation(false); // 关闭3D导航
  }, []);

  // Epic演示完成
  const handleEpicComplete = useCallback(() => {
    setEpicDemoState('idle');
    // 可以选择性地隐藏演示或切换到项目视图
  }, []);

  // 2号几何专家：切换Mapbox地理视图
  const handleToggleMapboxView = useCallback(() => {
    setShowMapboxView(prev => !prev);
    setShowEpicDemo(false); // 关闭Epic演示
    setShowWAEffects(false); // 关闭WA效应
    setShowCubeViewNavigation(false); // 关闭3D导航
    
    if (!showMapboxView) {
      logger.info('切换到Mapbox地理视图');
    } else {
      logger.info('切换回传统项目视图');
    }
  }, [showMapboxView]);

  // WA效应界面切换
  const handleToggleWAEffects = useCallback(() => {
    setShowWAEffects(prev => !prev);
    setShowEpicDemo(false); // 关闭Epic演示
    setShowMapboxView(false); // 关闭Mapbox视图
    setShowCubeViewNavigation(false); // 关闭3D导航
    
    if (!showWAEffects) {
      logger.info('激活WA效应界面');
    } else {
      logger.info('关闭WA效应界面');
    }
  }, [showWAEffects]);

  // 3D视口导航切换
  const handleToggleCubeViewNavigation = useCallback(() => {
    setShowCubeViewNavigation(prev => !prev);
    setShowEpicDemo(false); // 关闭Epic演示
    setShowMapboxView(false); // 关闭Mapbox视图
    setShowWAEffects(false); // 关闭WA效应
    
    if (!showCubeViewNavigation) {
      logger.info('激活3D视口导航');
      // 初始化3D相机和控制器（如果需要）
      if (!threeCamera) {
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(35, 35, 35);
        setThreeCamera(camera);
      }
    } else {
      logger.info('关闭3D视口导航');
    }
  }, [showCubeViewNavigation, threeCamera]);


  // 处理项目地理位置选择
  const handleProjectLocationSelect = useCallback((location: { lat: number; lng: number; elevation: number }) => {
    logger.info('在地图上选择新项目位置', location);
    // 这里可以添加创建新项目的逻辑
  }, []);

  // 项目状态颜色
  const getProjectStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'running': return '#52c41a';
      case 'completed': return '#1890ff';
      case 'planning': return '#faad14';
      case 'paused': return '#ff4d4f';
      default: return '#8c8c8c';
    }
  };

  // 电影级项目切换
  const handleProjectSwitch = useCallback(async (project: Project) => {
    // 启动电影级过渡效果
    setShowEpicDemo(true);
    setEpicDemoState('flying');
    setShowMapboxView(false);
    
    // 延迟设置项目，让飞行效果先开始
    setTimeout(() => {
      setSelectedProject(project);
    }, 1000);
    
  }, []);

  // 项目视图进入效果
  const handleProjectViewEnter = useCallback(() => {
    // 项目视图完全显示后，隐藏Epic Demo背景
    setTimeout(() => {
      setShowEpicDemo(false);
      setEpicDemoState('idle');
    }, 2000);
  }, []);

  // 渲染用户状态面板
  const renderUserPanel = () => (
    <Card
      size="small"
      style={{
        background: 'rgba(0, 217, 255, 0.05)',
        border: '1px solid rgba(0, 217, 255, 0.2)',
        borderRadius: '12px'
      }}
      bodyStyle={{ padding: '12px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
        <Badge dot color="#52c41a">
          <Avatar size={40} icon={<UserOutlined />} style={{ backgroundColor: '#00d9ff' }} />
        </Badge>
        <div style={{ marginLeft: '12px', flex: 1 }}>
          <Text strong style={{ color: '#ffffff', display: 'block' }}>{currentUser.name}</Text>
          <Text style={{ color: '#ffffff80', fontSize: '12px' }}>{currentUser.role}</Text>
        </div>
        <Button type="text" icon={<BellOutlined />} style={{ color: '#ffffff80' }} />
      </div>
      
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title={<span style={{ color: '#ffffff80', fontSize: '12px' }}>在线用户</span>}
            value={systemMetrics.onlineUsers}
            suffix={`/${systemMetrics.totalUsers}`}
            valueStyle={{ color: '#52c41a', fontSize: '16px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={<span style={{ color: '#ffffff80', fontSize: '12px' }}>活跃项目</span>}
            value={systemMetrics.activeProjects}
            suffix={`/${systemMetrics.totalProjects}`}
            valueStyle={{ color: '#00d9ff', fontSize: '16px' }}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title={<span style={{ color: '#ffffff80', fontSize: '12px' }}>计算负载</span>}
            value={systemMetrics.computationLoad}
            suffix="%"
            valueStyle={{ color: '#faad14', fontSize: '16px' }}
          />
        </Col>
      </Row>
    </Card>
  );

  // 渲染震撼项目卡片 - Dream Box风格
  const renderProjectCard = (project: Project, index: number = 0) => {
    const statusColors = {
      'running': { primary: '#00d9ff', secondary: '#0066cc', glow: 'rgba(0, 217, 255, 0.6)' },
      'completed': { primary: '#52c41a', secondary: '#389e0d', glow: 'rgba(82, 196, 26, 0.6)' },
      'planning': { primary: '#faad14', secondary: '#d48806', glow: 'rgba(250, 173, 20, 0.6)' },
      'paused': { primary: '#722ed1', secondary: '#531dab', glow: 'rgba(114, 46, 209, 0.6)' }
    };
    
    const projectColor = statusColors[project.status as keyof typeof statusColors] || statusColors.running;
    
    return (
      <motion.div
        key={project.id}
        initial={{ 
          opacity: 0, 
          y: 100,
          rotateX: -15,
          scale: 0.8
        }}
        animate={{ 
          opacity: 1, 
          y: 0,
          rotateX: 0,
          scale: 1
        }}
        transition={{ 
          duration: 0.8, 
          delay: index * 0.15,
          ease: [0.23, 1, 0.32, 1]
        }}
        whileHover={{ 
          scale: 1.05, 
          y: -15,
          rotateY: 5,
          rotateX: 5,
          transition: { duration: 0.3 }
        }}
        whileTap={{ scale: 0.95 }}
        onClick={() => handleProjectSwitch(project)}
        style={{ 
          cursor: 'pointer',
          perspective: '1000px',
          transformStyle: 'preserve-3d'
        }}
      >
        {/* 主卡片容器 */}
        <div
          style={{
            position: 'relative',
            height: '320px',
            background: `linear-gradient(135deg, 
              ${projectColor.primary}08 0%, 
              ${projectColor.secondary}15 30%, 
              rgba(0, 0, 0, 0.3) 70%, 
              rgba(0, 0, 0, 0.8) 100%
            )`,
            border: `2px solid ${projectColor.primary}40`,
            borderRadius: '20px',
            overflow: 'hidden',
            backdropFilter: 'blur(20px)',
            boxShadow: `
              0 8px 32px ${projectColor.glow}20,
              0 0 80px ${projectColor.glow}10,
              inset 0 1px 0 rgba(255, 255, 255, 0.1)
            `,
            transformStyle: 'preserve-3d'
          }}
        >
          {/* 动态背景网格 */}
          <motion.div
            animate={{
              backgroundPosition: ['0% 0%', '100% 100%']
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: 'linear'
            }}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `
                linear-gradient(${projectColor.primary}20 1px, transparent 1px),
                linear-gradient(90deg, ${projectColor.primary}20 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              opacity: 0.3
            }}
          />
          
          {/* 光效层 */}
          <motion.div
            animate={{
              opacity: [0.2, 0.8, 0.2],
              scale: [1, 1.1, 1]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: index * 0.5
            }}
            style={{
              position: 'absolute',
              top: '-50%',
              left: '-50%',
              right: '-50%',
              bottom: '-50%',
              background: `radial-gradient(circle, ${projectColor.primary}30 0%, transparent 60%)`,
              pointerEvents: 'none'
            }}
          />
          
          {/* 内容区域 */}
          <div style={{ 
            position: 'relative',
            height: '100%',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2
          }}>
            {/* 项目状态指示器 */}
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                boxShadow: [
                  `0 0 20px ${projectColor.glow}`,
                  `0 0 40px ${projectColor.glow}`,
                  `0 0 20px ${projectColor.glow}`
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: projectColor.primary,
                border: '2px solid rgba(255, 255, 255, 0.3)'
              }}
            />
            
            {/* 项目标题 */}
            <div style={{ marginBottom: '16px' }}>
              <motion.h3
                whileHover={{ scale: 1.05 }}
                style={{ 
                  color: '#ffffff', 
                  fontSize: '16px', 
                  fontWeight: 'bold',
                  margin: '0 0 8px 0',
                  background: `linear-gradient(45deg, ${projectColor.primary}, ${projectColor.secondary})`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  textShadow: `0 0 20px ${projectColor.glow}`
                }}
              >
                {project.name}
              </motion.h3>
              <Text style={{ 
                color: '#ffffff80', 
                fontSize: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <motion.span
                  animate={{ rotate: [0, 360] }}
                  transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
                >
                  📍
                </motion.span>
                {project.location}
              </Text>
            </div>

            {/* 3D进度环 */}
            <div style={{ 
              position: 'relative',
              margin: '16px 0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                style={{
                  width: '80px',
                  height: '80px',
                  border: `3px solid ${projectColor.primary}30`,
                  borderTop: `3px solid ${projectColor.primary}`,
                  borderRadius: '50%',
                  position: 'relative'
                }}
              >
                <div style={{
                  position: 'absolute',
                  inset: '8px',
                  borderRadius: '50%',
                  background: `linear-gradient(135deg, ${projectColor.primary}20, transparent)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      color: projectColor.primary,
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textShadow: `0 0 10px ${projectColor.glow}`
                    }}
                  >
                    {project.progress}%
                  </motion.div>
                </div>
              </motion.div>
            </div>

            
            {/* 分层状态显示 */}
            <div style={{ flex: 1, marginTop: '16px' }}>
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '12px'
              }}>
                {[
                  { label: '网格', value: project.computationStatus.meshing, color: '#52c41a' },
                  { label: '分析', value: project.computationStatus.analysis, color: '#1890ff' },
                  { label: '结果', value: project.computationStatus.results, color: '#faad14' }
                ].map((item, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 + idx * 0.05 }}
                    style={{
                      textAlign: 'center',
                      padding: '8px 4px',
                      borderRadius: '8px',
                      background: `${item.color}15`,
                      border: `1px solid ${item.color}30`
                    }}
                  >
                    <motion.div
                      animate={{ 
                        scale: [1, 1.05, 1],
                        color: [item.color, '#ffffff', item.color]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: idx * 0.3
                      }}
                      style={{
                        fontSize: '12px',
                        fontWeight: 'bold',
                        marginBottom: '2px'
                      }}
                    >
                      {item.value}%
                    </motion.div>
                    <Text style={{ 
                      color: '#ffffff60', 
                      fontSize: '9px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      {item.label}
                    </Text>
                  </motion.div>
                ))}
              </div>
            
              {/* 团队成员 - 悬浮效果 */}
              <div style={{ 
                marginTop: 'auto', 
                paddingTop: '16px', 
                borderTop: `1px solid ${projectColor.primary}30`
              }}>
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}>
                  <Text style={{ 
                    color: '#ffffff80', 
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    团队成员
                  </Text>
                  <motion.div 
                    style={{ display: 'flex', gap: '4px' }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    {project.team.slice(0, 3).map((member, idx) => (
                      <motion.div
                        key={idx}
                        whileHover={{ 
                          scale: 1.3, 
                          zIndex: 10,
                          boxShadow: `0 0 20px ${projectColor.glow}`
                        }}
                        animate={{
                          y: [0, -2, 0]
                        }}
                        transition={{
                          y: {
                            duration: 2,
                            repeat: Infinity,
                            delay: idx * 0.2
                          }
                        }}
                      >
                        <Avatar 
                          size={20} 
                          style={{ 
                            background: `linear-gradient(135deg, ${projectColor.primary}, ${projectColor.secondary})`,
                            fontSize: '10px',
                            border: '2px solid rgba(255, 255, 255, 0.2)',
                            cursor: 'pointer'
                          }}
                        >
                          {member[0]}
                        </Avatar>
                      </motion.div>
                    ))}
                    {project.team.length > 3 && (
                      <motion.div
                        whileHover={{ scale: 1.2 }}
                        animate={{ rotate: [0, 5, -5, 0] }}
                        transition={{ duration: 3, repeat: Infinity }}
                      >
                        <Avatar 
                          size={20} 
                          style={{ 
                            background: 'rgba(255, 255, 255, 0.1)',
                            fontSize: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.3)'
                          }}
                        >
                          +{project.team.length - 3}
                        </Avatar>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
                
                {/* 项目状态标签 */}
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    background: `linear-gradient(45deg, ${projectColor.primary}20, ${projectColor.secondary}20)`,
                    border: `1px solid ${projectColor.primary}40`,
                    textAlign: 'center',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  <motion.div
                    animate={{
                      textShadow: [
                        `0 0 5px ${projectColor.glow}`,
                        `0 0 20px ${projectColor.glow}`,
                        `0 0 5px ${projectColor.glow}`
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                    style={{
                      color: projectColor.primary,
                      fontSize: '10px',
                      fontWeight: 'bold',
                      textTransform: 'uppercase',
                      letterSpacing: '1px'
                    }}
                  >
                    {project.status === 'running' ? '🚀 运行中' : 
                     project.status === 'completed' ? '✅ 已完成' :
                     project.status === 'planning' ? '📋 规划中' : '⏸️ 暂停'}
                  </motion.div>
                </motion.div>
              </div>
            </div>
          </div>
          
          {/* 底部反射效果 */}
          <div style={{
            position: 'absolute',
            bottom: '0',
            left: '0',
            right: '0',
            height: '60%',
            background: `linear-gradient(to top, ${projectColor.primary}05, transparent)`,
            borderRadius: '0 0 20px 20px',
            pointerEvents: 'none'
          }} />
        </div>
      </motion.div>
    );
  };

  return (
    <Layout style={{ height: '100vh', background: '#0a0a0a' }}>
      <Content style={{ position: 'relative', overflow: 'hidden' }}>
        {/* Epic Demo 背景层 */}
        <AnimatePresence>
          {showEpicDemo && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
              }}
            >
              <EpicFlightDemo
                width={window.innerWidth}
                height={window.innerHeight}
                autoStart={true}
                showControls={false}
                onFlightComplete={handleEpicComplete}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 2号几何专家：Mapbox + Three.js 地理视图层 */}
        <AnimatePresence>
          {showMapboxView && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.8 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1
              }}
            >
              <div style={{
                width: '100%',
                height: '100%',
                background: '#1a1a2e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#00d9ff',
                fontSize: '18px'
              }}>
                🌍 地理可视化模块
                <br />
                <small style={{ color: '#999', fontSize: '14px' }}>
                  Mapbox集成开发中...
                </small>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* WA效应界面层 */}
        <AnimatePresence>
          {showWAEffects && (
            <motion.div
              initial={{ opacity: 0, rotateY: -90 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 90 }}
              transition={{ duration: 1.2, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.2)',
                backdropFilter: 'blur(5px)'
              }}
            >
              <motion.div
                initial={{ scale: 0.8, y: 100 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.8, y: -100 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                style={{
                  width: '90%',
                  height: '80%',
                  maxWidth: '1200px'
                }}
              >
                <WAEffectsInterface
                  width={window.innerWidth * 0.8}
                  height={window.innerHeight * 0.7}
                  onEffectUpdate={(effects) => {
                    logger.info('WA效应更新', { effectCount: effects.filter(e => e.enabled).length });
                  }}
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D视口导航界面层 */}
        <AnimatePresence>
          {showCubeViewNavigation && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.8, ease: [0.23, 1, 0.32, 1] }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                zIndex: 1,
                background: 'linear-gradient(135deg, rgba(10, 10, 10, 0.9), rgba(26, 26, 46, 0.9))',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {/* 3D视口模拟界面 */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                style={{
                  width: '90%',
                  height: '80%',
                  maxWidth: '1200px',
                  maxHeight: '800px',
                  background: 'linear-gradient(135deg, #000420, #001122)',
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 217, 255, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {/* 3D视口内容模拟 */}
                <div style={{
                  width: '100%',
                  height: '100%',
                  background: 'radial-gradient(circle at center, rgba(0, 217, 255, 0.1), transparent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}>
                  <motion.div
                    animate={{ 
                      rotateY: [0, 360],
                      rotateX: [0, 45, 0]
                    }}
                    transition={{ 
                      duration: 8, 
                      repeat: Infinity, 
                      ease: 'linear' 
                    }}
                    style={{
                      width: '200px',
                      height: '200px',
                      border: '2px solid #00d9ff',
                      borderRadius: '8px',
                      background: 'linear-gradient(45deg, rgba(0, 217, 255, 0.1), rgba(0, 102, 204, 0.1))',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#00d9ff',
                      fontSize: '16px',
                      fontWeight: 'bold'
                    }}
                  >
                    3D模型展示
                  </motion.div>
                  
                  {/* 坐标轴 */}
                  <div style={{
                    position: 'absolute',
                    bottom: '50px',
                    left: '50px',
                    width: '60px',
                    height: '60px'
                  }}>
                    <div style={{
                      position: 'absolute',
                      width: '40px',
                      height: '2px',
                      background: '#ff3333',
                      bottom: '10px',
                      left: '10px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '2px',
                      height: '40px',
                      background: '#33ff33',
                      bottom: '10px',
                      left: '10px'
                    }} />
                    <div style={{
                      position: 'absolute',
                      width: '2px',
                      height: '30px',
                      background: '#3333ff',
                      bottom: '10px',
                      left: '10px',
                      transform: 'rotateZ(45deg) rotateX(45deg)'
                    }} />
                  </div>
                </div>

                {/* CubeView导航控件 - 集成到3D视口 */}
                {threeCamera && (
                  <CubeViewNavigationControl
                    camera={threeCamera}
                    controls={threeControls}
                    position="top-right"
                    size={100}
                    theme="dark"
                    onViewChange={(viewName, position, target) => {
                      logger.info('3D视口导航: 视角切换', { 
                        viewName, 
                        position: position.toArray(), 
                        target: target.toArray() 
                      });
                    }}
                  />
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>


        {/* 控制中心UI层 */}
        <div
          style={{
            position: 'relative',
            zIndex: (showEpicDemo || showMapboxView || showWAEffects || showCubeViewNavigation) ? 2 : 1,
            height: '100%',
            background: showEpicDemo 
              ? 'rgba(0, 0, 0, 0.3)' 
              : showMapboxView
              ? 'rgba(0, 0, 0, 0.1)' // Mapbox视图时使用更透明的背景
              : showWAEffects
              ? 'rgba(0, 0, 0, 0.05)' // WA效应时使用极透明背景
              : showCubeViewNavigation
              ? 'rgba(0, 0, 0, 0.2)' // 3D导航时使用半透明背景
              : 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
            backdropFilter: (showEpicDemo || showMapboxView || showWAEffects || showCubeViewNavigation) ? 'blur(2px)' : 'none',
            transition: 'all 0.5s ease'
          }}
        >
          {/* 顶部控制栏 */}
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            style={{
              padding: '20px 24px',
              borderBottom: '1px solid rgba(0, 217, 255, 0.2)',
              background: 'rgba(0, 217, 255, 0.05)',
              backdropFilter: 'blur(20px)'
            }}
          >
            <Row align="middle" justify="space-between">
              <Col>
                <Title 
                  level={2} 
                  style={{ 
                    color: '#00d9ff', 
                    margin: 0,
                    background: 'linear-gradient(45deg, #00d9ff, #0066cc)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  🌍 DeepCAD 企业控制中心
                </Title>
                <Text style={{ color: '#ffffff80', fontSize: '14px' }}>
                  多用户多项目CAE平台 • 全球项目实时监控
                </Text>
              </Col>
              
              <Col>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <Button
                    type="primary"
                    icon={epicDemoState === 'flying' ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                    onClick={handleStartEpicDemo}
                    disabled={epicDemoState === 'flying'}
                    style={{
                      background: 'linear-gradient(45deg, #eb2f96, #f759ab)',
                      border: 'none',
                      borderRadius: '8px',
                      height: '40px',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}
                  >
                    {epicDemoState === 'flying' ? '飞行中...' : '🚀 启动Epic演示'}
                  </Button>
                  
                  <Button
                    icon={<GlobalOutlined />}
                    onClick={handleToggleMapboxView}
                    style={{
                      background: showMapboxView 
                        ? 'linear-gradient(45deg, #00d9ff, #0066cc)'
                        : 'rgba(0, 217, 255, 0.1)',
                      border: '1px solid rgba(0, 217, 255, 0.3)',
                      color: showMapboxView ? '#ffffff' : '#00d9ff',
                      borderRadius: '8px',
                      height: '40px',
                      fontWeight: showMapboxView ? 'bold' : 'normal'
                    }}
                  >
                    🌍 地理视图
                  </Button>
                  
                  <Button
                    icon={<EnvironmentOutlined />}
                    style={{
                      background: 'rgba(82, 196, 26, 0.1)',
                      border: '1px solid rgba(82, 196, 26, 0.3)',
                      color: '#52c41a',
                      borderRadius: '8px',
                      height: '40px'
                    }}
                  >
                    项目定位
                  </Button>
                  
                  <Button
                    icon={<BgColorsOutlined />}
                    onClick={handleToggleWAEffects}
                    style={{
                      background: showWAEffects 
                        ? 'linear-gradient(45deg, #eb2f96, #f759ab)'
                        : 'rgba(235, 47, 150, 0.1)',
                      border: '1px solid rgba(235, 47, 150, 0.3)',
                      color: showWAEffects ? '#ffffff' : '#eb2f96',
                      borderRadius: '8px',
                      height: '40px',
                      fontWeight: showWAEffects ? 'bold' : 'normal'
                    }}
                  >
                    ⚡ WA效应
                  </Button>
                  
                  <Button
                    icon={<SettingOutlined />}
                    onClick={handleToggleCubeViewNavigation}
                    style={{
                      background: showCubeViewNavigation 
                        ? 'linear-gradient(45deg, #52c41a, #389e0d)'
                        : 'rgba(82, 196, 26, 0.1)',
                      border: '1px solid rgba(82, 196, 26, 0.3)',
                      color: showCubeViewNavigation ? '#ffffff' : '#52c41a',
                      borderRadius: '8px',
                      height: '40px',
                      fontWeight: showCubeViewNavigation ? 'bold' : 'normal'
                    }}
                  >
                    🎛️ 3D导航
                  </Button>
                  
                  
                  {renderUserPanel()}
                </div>
              </Col>
            </Row>
          </motion.div>

          {/* 主要内容区域 - 在Mapbox视图、WA效应、3D导航时隐藏 */}
          {!showMapboxView && !showWAEffects && !showCubeViewNavigation && (
            <div style={{ padding: '24px', height: 'calc(100vh - 120px)', overflowY: 'auto' }}>
              <Row gutter={[24, 24]}>
              {/* 项目网格 */}
              <Col span={18}>
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                >
                  <Title level={3} style={{ color: '#ffffff', marginBottom: '20px' }}>
                    📊 项目仪表板
                  </Title>
                  
                  {/* Dream Box风格的项目展示区 */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1.2, delay: 0.3 }}
                    style={{
                      position: 'relative',
                      minHeight: '400px',
                      background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.2), rgba(26, 26, 46, 0.1))',
                      borderRadius: '24px',
                      padding: '32px',
                      border: '1px solid rgba(0, 217, 255, 0.1)',
                      backdropFilter: 'blur(20px)',
                      overflow: 'hidden'
                    }}
                  >
                    {/* 动态背景装饰 */}
                    <motion.div
                      animate={{
                        backgroundPosition: ['0% 0%', '100% 100%'],
                        opacity: [0.1, 0.3, 0.1]
                      }}
                      transition={{
                        backgroundPosition: { duration: 20, repeat: Infinity, ease: 'linear' },
                        opacity: { duration: 4, repeat: Infinity, ease: 'easeInOut' }
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        backgroundImage: `
                          linear-gradient(45deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px),
                          linear-gradient(-45deg, rgba(0, 217, 255, 0.1) 1px, transparent 1px)
                        `,
                        backgroundSize: '30px 30px',
                        pointerEvents: 'none'
                      }}
                    />
                    
                    {/* 项目卡片网格 */}
                    <div style={{
                      position: 'relative',
                      zIndex: 2,
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                      gap: '24px',
                      alignItems: 'start'
                    }}>
                      {DEMO_PROJECTS.map((project, index) => 
                        renderProjectCard(project, index)
                      )}
                    </div>
                    
                    {/* 底部光效 */}
                    <motion.div
                      animate={{
                        opacity: [0.3, 0.7, 0.3],
                        scale: [1, 1.05, 1]
                      }}
                      transition={{
                        duration: 6,
                        repeat: Infinity,
                        ease: 'easeInOut'
                      }}
                      style={{
                        position: 'absolute',
                        bottom: '-50%',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '150%',
                        height: '100%',
                        background: 'radial-gradient(ellipse, rgba(0, 217, 255, 0.1) 0%, transparent 70%)',
                        pointerEvents: 'none'
                      }}
                    />
                  </motion.div>
                </motion.div>
              </Col>

              {/* 右侧监控面板 */}
              <Col span={6}>
                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                >
                  <Title level={4} style={{ color: '#ffffff', marginBottom: '16px' }}>
                    ⚡ 系统监控
                  </Title>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* 实时性能 */}
                    <Card
                      size="small"
                      title={<span style={{ color: '#faad14' }}>计算集群状态</span>}
                      style={{
                        background: 'rgba(250, 173, 20, 0.05)',
                        border: '1px solid rgba(250, 173, 20, 0.2)'
                      }}
                    >
                      <div style={{ marginBottom: '8px' }}>
                        <Text style={{ color: '#ffffff80', fontSize: '12px' }}>集群负载</Text>
                        <Progress
                          percent={systemMetrics.computationLoad}
                          size="small"
                          strokeColor="#faad14"
                          trailColor="rgba(255,255,255,0.1)"
                        />
                      </div>
                      <Row gutter={8}>
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ color: '#ffffff80', fontSize: '10px' }}>存储</span>}
                            value={systemMetrics.storageUsed}
                            suffix="TB"
                            valueStyle={{ color: '#1890ff', fontSize: '14px' }}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title={<span style={{ color: '#ffffff80', fontSize: '10px' }}>延迟</span>}
                            value={systemMetrics.networkLatency}
                            suffix="ms"
                            valueStyle={{ color: '#52c41a', fontSize: '14px' }}
                          />
                        </Col>
                      </Row>
                    </Card>

                    {/* 活跃用户 */}
                    <Card
                      size="small"
                      title={<span style={{ color: '#52c41a' }}>在线团队</span>}
                      style={{
                        background: 'rgba(82, 196, 26, 0.05)',
                        border: '1px solid rgba(82, 196, 26, 0.2)'
                      }}
                    >
                      {DEMO_USERS.filter(u => u.isOnline).map(user => (
                        <div
                          key={user.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            marginBottom: '8px',
                            padding: '8px',
                            background: 'rgba(82, 196, 26, 0.1)',
                            borderRadius: '6px'
                          }}
                        >
                          <Badge dot color="#52c41a">
                            <Avatar size={24} style={{ backgroundColor: '#52c41a' }}>
                              {user.name[0]}
                            </Avatar>
                          </Badge>
                          <div style={{ marginLeft: '8px', flex: 1 }}>
                            <Text style={{ color: '#ffffff', fontSize: '12px', display: 'block' }}>
                              {user.name}
                            </Text>
                            <Text style={{ color: '#ffffff60', fontSize: '10px' }}>
                              {user.currentProject ? `项目 ${user.currentProject}` : '空闲'}
                            </Text>
                          </div>
                        </div>
                      ))}
                    </Card>
                  </div>
                </motion.div>
              </Col>
            </Row>
            </div>
          )}

          {/* Mapbox视图状态指示器 */}
          {showMapboxView && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(0, 217, 255, 0.9)',
                backdropFilter: 'blur(20px)',
                padding: '12px 24px',
                borderRadius: '25px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: 'bold',
                boxShadow: '0 8px 25px rgba(0, 217, 255, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              🌍 地理可视化模式 • {geographicalVisualizationService.getProjects().length} 个项目
            </motion.div>
          )}

          {/* WA效应状态指示器 */}
          {showWAEffects && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'absolute',
                bottom: '30px',
                right: '30px',
                background: 'linear-gradient(45deg, #eb2f96, #f759ab)',
                backdropFilter: 'blur(20px)',
                padding: '12px 20px',
                borderRadius: '20px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 8px 25px rgba(235, 47, 150, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 180, 360]
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              >
                ⚡
              </motion.div>
              WA效应激活 • 高级视觉渲染
            </motion.div>
          )}

          {/* 3D导航状态指示器 */}
          {showCubeViewNavigation && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                position: 'absolute',
                bottom: '30px',
                left: '30px',
                background: 'linear-gradient(45deg, #52c41a, #389e0d)',
                backdropFilter: 'blur(20px)',
                padding: '12px 20px',
                borderRadius: '20px',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: 'bold',
                boxShadow: '0 8px 25px rgba(82, 196, 26, 0.4)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <motion.div
                animate={{
                  rotateY: [0, 360],
                  rotateX: [0, 180]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                style={{
                  display: 'inline-block',
                  transformStyle: 'preserve-3d'
                }}
              >
                🎛️
              </motion.div>
              3D视口导航 • CubeView激活
            </motion.div>
          )}

        </div>

        {/* 选中项目的详细信息模态框 */}
        <AnimatePresence>
          {selectedProject && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.8)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={() => setSelectedProject(null)}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
                  borderRadius: '16px',
                  padding: '24px',
                  maxWidth: '600px',
                  width: '90%',
                  border: '1px solid rgba(0, 217, 255, 0.3)'
                }}
              >
                <Title level={3} style={{ color: '#00d9ff', marginBottom: '16px' }}>
                  {selectedProject.name}
                </Title>
                <Text style={{ color: '#ffffff80', fontSize: '14px', display: 'block', marginBottom: '16px' }}>
                  {selectedProject.description}
                </Text>
                
                <Row gutter={16}>
                  <Col span={12}>
                    <Statistic
                      title="整体进度"
                      value={selectedProject.progress}
                      suffix="%"
                      valueStyle={{ color: getProjectStatusColor(selectedProject.status) }}
                    />
                  </Col>
                  <Col span={12}>
                    <Statistic
                      title="团队成员"
                      value={selectedProject.team.length}
                      suffix="人"
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                </Row>

                <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <Button onClick={() => setSelectedProject(null)}>
                    关闭
                  </Button>
                  <Button type="primary" icon={<EyeOutlined />}>
                    查看详情
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </Content>
    </Layout>
  );
};

export default EpicControlCenter;