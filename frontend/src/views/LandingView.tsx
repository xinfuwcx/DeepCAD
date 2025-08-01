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
import React, { useRef, useEffect } from 'react';
import { Button, Typography, Space, Row, Col } from 'antd';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { RocketOutlined, ExperimentOutlined, ToolOutlined } from '@ant-design/icons';
import * as THREE from 'three';

const { Title, Paragraph } = Typography;

// 粒子系统参数
const PARTICLE_COUNT = 1000;
const PARTICLE_SIZE = 2;
const PARTICLE_COLOR = '#3c8eff';
const SECONDARY_COLOR = '#8a5fff';

const LandingView: React.FC = () => {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Three.js 粒子背景
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
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 创建粒子系统
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    
    const color1 = new THREE.Color(PARTICLE_COLOR);
    const color2 = new THREE.Color(SECONDARY_COLOR);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // 位置 - 随机分布在一个球体内
      const radius = Math.random() * 50 + 10;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // 颜色 - 在两种颜色之间插值
      const mixedColor = color1.clone().lerp(color2, Math.random());
      colors[i * 3] = mixedColor.r;
      colors[i * 3 + 1] = mixedColor.g;
      colors[i * 3 + 2] = mixedColor.b;
      
      // 大小 - 随机变化
      sizes[i] = Math.random() * PARTICLE_SIZE;
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
    
    // 连接线效果
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x3c8eff,
      transparent: true,
      opacity: 0.2
    });
    
    // 创建一些连接线
    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(PARTICLE_COUNT * 6); // 每条线有两个点，每个点有3个坐标
    
    for (let i = 0; i < PARTICLE_COUNT / 10; i++) {
      const index1 = Math.floor(Math.random() * PARTICLE_COUNT);
      const index2 = Math.floor(Math.random() * PARTICLE_COUNT);
      
      linePositions[i * 6] = positions[index1 * 3];
      linePositions[i * 6 + 1] = positions[index1 * 3 + 1];
      linePositions[i * 6 + 2] = positions[index1 * 3 + 2];
      
      linePositions[i * 6 + 3] = positions[index2 * 3];
      linePositions[i * 6 + 4] = positions[index2 * 3 + 1];
      linePositions[i * 6 + 5] = positions[index2 * 3 + 2];
    }
    
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);
    
    // 动画循环
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      
      // 旋转粒子系统
      particleSystem.rotation.y += 0.001;
      particleSystem.rotation.x += 0.0005;
      
      // 相机轻微运动
      camera.position.x = Math.sin(Date.now() * 0.0001) * 5;
      camera.position.y = Math.cos(Date.now() * 0.0001) * 5;
      camera.lookAt(scene.position);
      
      renderer.render(scene, camera);
    };
    
    animate();
    
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
    <div style={{ position: 'relative', height: '100%', overflow: 'hidden' }}>
      {/* 3D 粒子背景 */}
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
      
      {/* 内容叠加层 */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 24px'
      }}>
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{ textAlign: 'center', marginBottom: '60px' }}
        >
          <Title level={1} className="theme-text-gradient" style={{ 
            fontSize: '4rem', 
            marginBottom: '16px',
            textShadow: '0 0 20px rgba(60, 142, 255, 0.5)'
          }}>
            DeepCAD
          </Title>
          <Paragraph style={{ 
            fontSize: '1.5rem', 
            color: 'var(--text-secondary)',
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            新一代智能工程分析与设计平台
          </Paragraph>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
        >
          <Space size="large">
            <Button 
              type="primary" 
              size="large"
              icon={<RocketOutlined />}
              onClick={() => navigate('/workspace/geometry')}
              className="theme-btn-primary"
              style={{ 
                height: '50px',
                padding: '0 32px',
                fontSize: '16px',
                borderRadius: '25px'
              }}
            >
              开始体验
            </Button>
            <Button
              size="large"
              icon={<ExperimentOutlined />}
              onClick={() => navigate('/help')}
              className="theme-btn"
              style={{ 
                height: '50px',
                padding: '0 32px',
                fontSize: '16px',
                borderRadius: '25px',
                backdropFilter: 'blur(var(--glass-blur))',
                WebkitBackdropFilter: 'blur(var(--glass-blur))',
                background: 'rgba(255, 255, 255, 0.1)'
              }}
            >
              查看文档
            </Button>
          </Space>
        </motion.div>
        
        {/* 功能特性卡片 */}
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1 }}
          style={{ marginTop: '80px', width: '100%', maxWidth: '1200px' }}
        >
          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} sm={12} md={8}>
              <div className="theme-card" style={{ 
                padding: '24px', 
                height: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginBottom: '16px',
                  color: 'var(--neon-blue)',
                  filter: 'drop-shadow(0 0 8px var(--neon-blue))'
                }}>
                  <ToolOutlined />
                </div>
                <Title level={4}>高级几何建模</Title>
                <Paragraph style={{ color: 'var(--text-secondary)' }}>
                  直观的参数化建模工具，支持复杂工程结构的快速构建与修改
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="theme-card" style={{ 
                padding: '24px', 
                height: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginBottom: '16px',
                  color: 'var(--neon-purple)',
                  filter: 'drop-shadow(0 0 8px var(--neon-purple))'
                }}>
                  <ExperimentOutlined />
                </div>
                <Title level={4}>智能分析计算</Title>
                <Paragraph style={{ color: 'var(--text-secondary)' }}>
                  强大的有限元分析引擎，自动网格划分与多物理场耦合计算
                </Paragraph>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className="theme-card" style={{ 
                padding: '24px', 
                height: '100%',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  fontSize: '32px', 
                  marginBottom: '16px',
                  color: 'var(--neon-cyan)',
                  filter: 'drop-shadow(0 0 8px var(--neon-cyan))'
                }}>
                  <RocketOutlined />
                </div>
                <Title level={4}>数据驱动设计</Title>
                <Paragraph style={{ color: 'var(--text-secondary)' }}>
                  AI 辅助优化与数据驱动决策，提升工程设计效率与质量
                </Paragraph>
              </div>
            </Col>
          </Row>
        </motion.div>
      </div>
    </div>
  );
};

export default LandingView; 