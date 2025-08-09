/**
 * LandingView.tsx - 系统欢迎页面
 * 
 * 功能描述:
 * - DeepCAD系统的入口欢迎界面
 * - 展示系统品牌信息和核心功能特性
 * - 提供快速开始和文档查看入口
 * - 集成3D粒子背景动画效果
 * 
 * 视觉特效:
 * - Three.js 3D粒子系统背景
 * - 动态粒子连接线效果
 * - Framer Motion 页面动画
 * - 响应式卡片布局
 * 
 * 功能特性展示:
 * 1. 高级几何建模 - 参数化建模工具
 * 2. 智能分析计算 - 有限元分析引擎
 * 3. 数据驱动设计 - AI辅助优化决策
 * 
 * 导航功能:
 * - "开始体验" 按钮跳转到几何建模工作台
 * - "查看文档" 按钮跳转到帮助页面
 * 
 * 技术栈: React + Three.js + Framer Motion + Ant Design
 */
import React, { useRef, useEffect, useState } from 'react';
import { Button, Typography, Space } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RocketOutlined, ExperimentOutlined } from '@ant-design/icons';
import * as THREE from 'three';

const { Title, Paragraph } = Typography;

// 5大系统亮点配置
const SYSTEM_FEATURES = [
  {
    id: 'deep-excavation',
    title: '专业级深基坑分析',
    subtitle: '复杂开挖几何 • 支护结构设计 • 多阶段施工',
    icon: '🏗️',
    position: { x: -30, y: -20, z: 25 },
    size: 'extra-large',
    colors: {
      primary: '#1e40af',
      secondary: '#3b82f6',
      glow: 'rgba(30, 64, 175, 0.4)'
    },
    route: '/workspace/geometry'
  },
  {
    id: 'expert-collaboration', 
    title: '专家协作架构',
    subtitle: '多专家模块 • 智能调度 • 数据协调',
    icon: '🤖',
    position: { x: -45, y: 20, z: 15 },
    size: 'large',
    colors: {
      primary: '#7c3aed',
      secondary: '#a855f7', 
      glow: 'rgba(124, 58, 237, 0.4)'
    },
    route: '/workspace/analysis'
  },
  {
    id: 'complete-dataflow',
    title: '完整数据流',
    subtitle: '几何→网格→计算→可视化',
    icon: '🔄',
    position: { x: 0, y: 35, z: 20 },
    size: 'medium',
    colors: {
      primary: '#059669',
      secondary: '#10b981',
      glow: 'rgba(5, 150, 105, 0.4)'
    },
    route: '/workspace/meshing'
  },
  {
    id: 'realtime-visualization',
    title: '实时可视化',
    subtitle: 'Three.js引擎 • PyVista科学 • 实时更新',
    icon: '📊', 
    position: { x: 45, y: -5, z: 10 },
    size: 'large',
    colors: {
      primary: '#dc2626',
      secondary: '#ef4444',
      glow: 'rgba(220, 38, 38, 0.4)'
    },
    route: '/workspace/results'
  },
  {
    id: 'intelligent-assessment',
    title: '智能质量评估',
    subtitle: 'Kratos标准 • 网格评估 • 智能优化',
    icon: '🎯',
    position: { x: 35, y: 40, z: 5 },
    size: 'medium', 
    colors: {
      primary: '#ea580c',
      secondary: '#f97316',
      glow: 'rgba(234, 88, 12, 0.4)'
    },
    route: '/workspace/settings'
  }
];

// 地质层次背景配置
const GEOLOGICAL_LAYERS = [
  { color: '#0a0f1c', stop: 0 },    // 地表 - 深蓝夜空
  { color: '#1a2332', stop: 25 },   // 粘土层 - 蓝灰
  { color: '#2d3444', stop: 50 },   // 砂土层 - 灰褐
  { color: '#3e4556', stop: 75 },   // 基岩层 - 深灰
  { color: '#4a5568', stop: 100 }   // 深部基岩 - 暗石色
];

// 工程设备卡片组件
const EngineeringFeatureCard: React.FC<{
  feature: typeof SYSTEM_FEATURES[0];
  index: number;
  onNavigate: (route: string) => void;
}> = ({ feature, index, onNavigate }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  const sizeConfig = {
    'extra-large': { width: '280px', height: '200px', fontSize: '3rem' },
    'large': { width: '240px', height: '170px', fontSize: '2.5rem' },
    'medium': { width: '200px', height: '140px', fontSize: '2rem' }
  };
  
  const config = sizeConfig[feature.size as keyof typeof sizeConfig];
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8, z: -100 }}
      animate={{ 
        opacity: 1, 
        scale: 1,
        z: feature.position.z,
        x: `${feature.position.x}%`,
        y: `${feature.position.y}%`
      }}
      transition={{ 
        duration: 0.8, 
        delay: index * 0.3,
        type: "spring",
        stiffness: 100
      }}
      whileHover={{
        scale: 1.1,
        z: feature.position.z + 20,
        rotateX: 8,
        rotateY: 5,
        transition: { duration: 0.3 }
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => onNavigate(feature.route)}
      className="engineering-feature-card"
      style={{
        position: 'absolute',
        width: config.width,
        height: config.height,
        left: '50%',
        top: '50%',
        transformOrigin: 'center center',
        transformStyle: 'preserve-3d',
        cursor: 'pointer',
        borderRadius: '16px',
        background: `linear-gradient(135deg, 
          rgba(26, 35, 50, 0.95), 
          rgba(45, 52, 68, 0.9))`,
        border: `2px solid ${feature.colors.glow}`,
        backdropFilter: 'blur(20px)',
        boxShadow: `
          inset 0 1px 2px rgba(255,255,255,0.1),
          0 8px 32px rgba(0,0,0,0.4),
          0 0 ${isHovered ? '30px' : '20px'} ${feature.colors.glow}
        `,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)'
      }}
    >
      {/* 工程设备指示灯 */}
      <div
        style={{
          position: 'absolute',
          top: '12px',
          right: '12px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: feature.colors.primary,
          boxShadow: `0 0 10px ${feature.colors.primary}`,
          animation: isHovered ? 'engineering-indicator 1s infinite' : 'none'
        }}
      />
      
      {/* 主要内容区域 */}
      <div
        style={{
          padding: '20px',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* 工程图标 */}
        <div
          style={{
            fontSize: config.fontSize,
            marginBottom: '12px',
            filter: `drop-shadow(0 0 10px ${feature.colors.primary})`,
            transition: 'all 0.3s ease'
          }}
        >
          {feature.icon}
        </div>
        
        {/* 标题 */}
        <Title
          level={feature.size === 'extra-large' ? 3 : 4}
          style={{
            color: feature.colors.primary,
            margin: '0 0 8px 0',
            fontSize: feature.size === 'extra-large' ? '1.2rem' : '1rem',
            fontWeight: 'bold',
            textShadow: `0 0 10px ${feature.colors.glow}`
          }}
        >
          {feature.title}
        </Title>
        
        {/* 副标题 */}
        <Paragraph
          style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.75rem',
            margin: 0,
            lineHeight: '1.3',
            opacity: feature.size === 'medium' ? 0.9 : 1
          }}
        >
          {feature.subtitle}
        </Paragraph>
      </div>
      
      {/* 工程材质纹理覆盖 */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `linear-gradient(45deg, 
            ${feature.colors.primary}15, 
            ${feature.colors.secondary}10)`,
          opacity: isHovered ? 0.3 : 0.1,
          transition: 'opacity 0.3s ease',
          pointerEvents: 'none'
        }}
      />
    </motion.div>
  );
}

// 粒子系统参数  
const PARTICLE_COUNT = 1000;
const PARTICLE_SIZE = 2;
// 精简：未使用的颜色常量移除，实际色值直接写入需要位置时再引入

const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const [systemInitialized, setSystemInitialized] = useState(false);
  
  // 地质层次3D背景 + 工程数据流
  useEffect(() => {
    if (!canvasRef.current) return;
    
    // 初始化 Three.js
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ 
      canvas: canvasRef.current,
      alpha: true,
      antialias: true
    });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // 创建工程数据流粒子系统
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    
    // 工程专业色彩配置
    const engineeringColors = [
      new THREE.Color('#1e40af'), // 深基坑蓝
      new THREE.Color('#7c3aed'), // 专家紫
      new THREE.Color('#059669'), // 数据流绿
      new THREE.Color('#dc2626'), // 可视化红
      new THREE.Color('#ea580c')  // 评估橙
    ];
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 位置 - 模拟地质层分布
      const layer = Math.floor(Math.random() * 5);
      const radius = 30 + layer * 8; // 按地质层分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.8; // 压扁分布
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (radius * Math.cos(phi)) - 20; // 向下偏移
      positions[i * 3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
      
      // 颜色 - 使用工程专业配色
      const selectedColor = engineeringColors[layer];
      colors[i * 3] = selectedColor.r;
      colors[i * 3 + 1] = selectedColor.g;
      colors[i * 3 + 2] = selectedColor.b;
      
      // 大小 - 根据层级调整
      sizes[i] = (layer + 1) * 0.5;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    particles.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // 粒子材质
    const particleMaterial = new THREE.PointsMaterial({
      size: PARTICLE_SIZE,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });
    
    // 创建粒子系统
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // 设置相机位置
    camera.position.z = 50;
    
    // 工程数据管道连接系统
    const createDataPipelines = () => {
      const pipelineGroup = new THREE.Group();
      
      // 为每个系统特性创建数据管道
      SYSTEM_FEATURES.forEach((feature, index) => {
        SYSTEM_FEATURES.forEach((targetFeature, targetIndex) => {
          if (index !== targetIndex && Math.random() > 0.6) { // 随机连接部分管道
            const pipelineMaterial = new THREE.LineBasicMaterial({
              color: feature.colors.primary,
              transparent: true,
              opacity: 0.15,
              linewidth: 2
            });
            
            const pipelineGeometry = new THREE.BufferGeometry();
            const pipelinePositions = new Float32Array(6);
            
            // 起点
            pipelinePositions[0] = feature.position.x * 0.3;
            pipelinePositions[1] = feature.position.y * 0.2; 
            pipelinePositions[2] = feature.position.z * 0.1;
            
            // 终点  
            pipelinePositions[3] = targetFeature.position.x * 0.3;
            pipelinePositions[4] = targetFeature.position.y * 0.2;
            pipelinePositions[5] = targetFeature.position.z * 0.1;
            
            pipelineGeometry.setAttribute('position', new THREE.BufferAttribute(pipelinePositions, 3));
            const pipeline = new THREE.Line(pipelineGeometry, pipelineMaterial);
            pipelineGroup.add(pipeline);
          }
        });
      });
      
      return pipelineGroup;
    };
    
    const dataPipelines = createDataPipelines();
    scene.add(dataPipelines);
    
    // 工程系统运行动画循环
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      const time = Date.now() * 0.001;
      
      // 地质层粒子系统缓慢旋转
      particleSystem.rotation.y += 0.0005;
      particleSystem.rotation.x += 0.0002;
      
      // 数据管道脉动效果
      dataPipelines.children.forEach((pipeline, index) => {
        const pipelineMesh = pipeline as THREE.Line;
        if (pipelineMesh.material) {
          (pipelineMesh.material as THREE.LineBasicMaterial).opacity = 
            0.1 + Math.sin(time * 2 + index * 0.5) * 0.1;
        }
      });
      
      // 工程师视角相机运动
      camera.position.x = Math.sin(time * 0.0002) * 3;
      camera.position.y = Math.cos(time * 0.0003) * 2;
      camera.lookAt(scene.position);
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // 系统初始化完成
    setTimeout(() => setSystemInitialized(true), 2000);
    
    // 窗口大小调整
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理函数
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
      renderer.dispose();
    };
  }, []);
  
  return (
    <div 
      style={{ 
        position: 'relative', 
        height: '100%', 
        overflow: 'hidden',
        background: `linear-gradient(180deg, ${GEOLOGICAL_LAYERS.map(layer => 
          `${layer.color} ${layer.stop}%`
        ).join(', ')})`
      }}
    >
      {/* 地质层次3D背景 */}
      <canvas 
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: 0
        }}
      />
      
      {/* 量子工程生态主界面 */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        perspective: '1000px',
        transformStyle: 'preserve-3d'
      }}>
        {/* 系统核心标题 */}
        <motion.div
          initial={{ opacity: 0, y: -100, rotateX: -90 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          style={{ 
            textAlign: 'center', 
            marginBottom: '60px',
            transform: 'translateZ(50px)'
          }}
        >
          <Title 
            level={1} 
            style={{ 
              fontSize: '4.5rem', 
              marginBottom: '16px',
              background: 'linear-gradient(45deg, #1e40af, #7c3aed, #059669)',
              backgroundClip: 'text',
              WebkitBackgroundClip: 'text',
              color: 'transparent',
              textShadow: '0 0 30px rgba(30, 64, 175, 0.6)',
              fontWeight: 'bold'
            }}
          >
            DeepCAD
          </Title>
          <Paragraph style={{ 
            fontSize: '1.6rem', 
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '800px',
            margin: '0 auto',
            textShadow: '0 2px 10px rgba(0,0,0,0.5)'
          }}>
            专业级深基坑CAE分析与工程协作平台
          </Paragraph>
        </motion.div>
        
        {/* 5大系统亮点 - 量子悬浮分布 */}
        <div 
          style={{
            position: 'relative',
            width: '100%',
            height: '600px',
            transformStyle: 'preserve-3d'
          }}
        >
          {SYSTEM_FEATURES.map((feature, index) => (
            <EngineeringFeatureCard
              key={feature.id}
              feature={feature}
              index={index}
              onNavigate={navigate}
            />
          ))}
        </div>
        
        {/* 工程控制台 */}
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 2.5 }}
          style={{ 
            marginTop: '40px',
            transform: 'translateZ(30px)'
          }}
        >
          <Space size="large">
            <Button 
              type="primary" 
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/workspace/geometry')}
              style={{ 
                height: '60px',
                padding: '0 40px',
                fontSize: '18px',
                borderRadius: '30px',
                background: 'linear-gradient(45deg, #1e40af, #3b82f6)',
                border: 'none',
                boxShadow: '0 8px 25px rgba(30, 64, 175, 0.4)',
                backdropFilter: 'blur(10px)'
              }}
            >
              启动工程系统
            </Button>
            <Button
              size="large"
              icon={<ExperimentOutlined />}
              onClick={() => navigate('/help')}
              style={{ 
                height: '60px',
                padding: '0 40px',
                fontSize: '18px',
                borderRadius: '30px',
                backdropFilter: 'blur(20px)',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(255,255,255,0.2)',
                color: '#ffffff',
                boxShadow: '0 8px 25px rgba(0,0,0,0.3)'
              }}
            >
              系统文档
            </Button>
          </Space>
        </motion.div>
        
        {/* 系统状态指示器 */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 3 }}
          style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 24px',
            background: 'rgba(26, 35, 50, 0.9)',
            borderRadius: '25px',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: systemInitialized ? '#059669' : '#ea580c',
              boxShadow: `0 0 10px ${systemInitialized ? '#059669' : '#ea580c'}`,
              animation: systemInitialized ? 'none' : 'pulse 2s infinite'
            }}
          />
          <span style={{ 
            color: '#ffffff', 
            fontSize: '14px',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            {systemInitialized ? '工程系统就绪' : '系统初始化中...'}
          </span>
        </motion.div>
      </div>
      
      {/* 工程师指示灯动画CSS */}
  <style>{`
        @keyframes engineering-indicator {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.2); }
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        
        .engineering-feature-card {
          transition: all 0.3s cubic-bezier(0.23, 1, 0.32, 1);
        }
        
        .engineering-feature-card:hover {
          transform: perspective(1000px) rotateX(8deg) rotateY(5deg) translateZ(40px) !important;
        }
      `}</style>
    </div>
  );
};

export default LandingView; 