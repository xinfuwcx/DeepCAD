/**
 * 简化版Epic控制中心 - 确保基础功能正常工作
 * 专注：真实效果 > 华丽外观
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface SimpleEpicProps {
  width: number;
  height: number;
  onExit: () => void;
}

// 项目数据
const PROJECTS = [
  { id: 1, name: '上海中心深基坑', lat: 31.23, lng: 121.47, depth: 70 },
  { id: 2, name: '北京大兴机场T1', lat: 39.51, lng: 116.41, depth: 45 },
  { id: 3, name: '深圳前海金融区', lat: 22.54, lng: 113.93, depth: 35 },
  { id: 4, name: '广州珠江新城CBD', lat: 23.13, lng: 113.32, depth: 55 }
];

// 简化的粒子系统组件
const SimpleParticleSystem: React.FC<{ width: number; height: number }> = ({ width, height }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;

    console.log('🎆 启动简化粒子系统...', { width, height });

    try {
      // 创建Three.js场景
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
      
      // 创建WebGL渲染器，添加错误处理
      const renderer = new THREE.WebGLRenderer({ 
        alpha: true, 
        antialias: false, // 简化性能
        powerPreference: "default" // 兼容性优先
      });
      
      renderer.setSize(width, height);
      renderer.setClearColor(0x000000, 0); // 透明背景
      camera.position.z = 300;

      // 创建简单的粒子几何体
      const particleCount = 500; // 减少到500个确保性能
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);

      // 初始化粒子位置和颜色
      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        
        // 随机位置
        positions[i3] = (Math.random() - 0.5) * 600;
        positions[i3 + 1] = (Math.random() - 0.5) * 600;
        positions[i3 + 2] = (Math.random() - 0.5) * 600;
        
        // 青色粒子
        colors[i3] = 0;     // R
        colors[i3 + 1] = 1; // G
        colors[i3 + 2] = 1; // B
      }

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

      // 使用简单的点材质
      const material = new THREE.PointsMaterial({
        size: 3,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
      });

      const particles = new THREE.Points(geometry, material);
      scene.add(particles);

      // 添加到DOM
      containerRef.current.appendChild(renderer.domElement);
      
      sceneRef.current = scene;
      rendererRef.current = renderer;

      console.log('✨ 粒子系统初始化成功');

      // 动画循环
      let time = 0;
      const animate = () => {
        time += 0.01;
        
        // 旋转粒子系统
        particles.rotation.x = time * 0.2;
        particles.rotation.y = time * 0.3;
        
        // 渲染场景
        renderer.render(scene, camera);
        animationRef.current = requestAnimationFrame(animate);
      };
      
      animate();

    } catch (error) {
      console.error('❌ 粒子系统初始化失败:', error);
      
      // 降级方案：使用CSS动画
      if (containerRef.current) {
        containerRef.current.innerHTML = `
          <div style="
            position: absolute;
            inset: 0;
            background: radial-gradient(circle, rgba(0,255,255,0.1) 0%, transparent 70%);
            animation: pulse 2s ease-in-out infinite alternate;
          "></div>
        `;
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (containerRef.current && rendererRef.current?.domElement) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
    };
  }, [width, height]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1
      }}
    />
  );
};

// 简单的地图组件（真实地理坐标显示）
const SimpleMapDisplay: React.FC<{ projects: typeof PROJECTS }> = ({ projects }) => {
  return (
    <div style={{
      position: 'absolute',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      width: '60%',
      height: '60%',
      background: 'linear-gradient(135deg, rgba(0,50,100,0.3), rgba(0,20,50,0.5))',
      border: '2px solid rgba(0,255,255,0.3)',
      borderRadius: '20px',
      padding: '20px',
      backdropFilter: 'blur(10px)',
      zIndex: 2
    }}>
      <h3 style={{ 
        color: '#00ffff', 
        textAlign: 'center', 
        marginBottom: '20px',
        textShadow: '0 0 10px rgba(0,255,255,0.5)'
      }}>
        🗺️ 深基坑项目分布
      </h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 1fr', 
        gap: '15px',
        height: 'calc(100% - 60px)'
      }}>
        {projects.map((project, index) => (
          <motion.div
            key={project.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.2 }}
            style={{
              background: 'linear-gradient(135deg, rgba(0,255,255,0.1), rgba(0,150,255,0.1))',
              border: '1px solid rgba(0,255,255,0.5)',
              borderRadius: '12px',
              padding: '15px',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            whileHover={{ scale: 1.05, backgroundColor: 'rgba(0,255,255,0.2)' }}
          >
            <h4 style={{ color: '#ffffff', margin: '0 0 8px 0', fontSize: '14px' }}>
              {project.name}
            </h4>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '12px' }}>
              <div>📍 {project.lat}°N, {project.lng}°E</div>
              <div>🕳️ 深度: {project.depth}m</div>
            </div>
            
            {/* 项目状态指示器 */}
            <div style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              width: '8px',
              height: '8px',
              background: index < 2 ? '#00ff00' : '#ffaa00',
              borderRadius: '50%',
              boxShadow: `0 0 10px ${index < 2 ? '#00ff00' : '#ffaa00'}`
            }} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// 简单的天气显示
const SimpleWeatherDisplay: React.FC = () => {
  const [weather, setWeather] = useState({ temp: 25, desc: '晴朗', wind: 12 });

  return (
    <div style={{
      position: 'absolute',
      top: '20px',
      right: '120px',
      background: 'rgba(0,0,0,0.5)',
      border: '1px solid rgba(0,255,255,0.3)',
      borderRadius: '10px',
      padding: '15px',
      color: '#ffffff',
      backdropFilter: 'blur(5px)',
      zIndex: 3
    }}>
      <div style={{ fontSize: '12px', marginBottom: '5px' }}>🌤️ 当前天气</div>
      <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{weather.temp}°C</div>
      <div style={{ fontSize: '11px', opacity: 0.8 }}>{weather.desc} · 风速{weather.wind}km/h</div>
    </div>
  );
};

// 主组件
export const SimpleEpicControlCenter: React.FC<SimpleEpicProps> = ({ width, height, onExit }) => {
  const [selectedProject, setSelectedProject] = useState<number | null>(null);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* 粒子背景 */}
      <SimpleParticleSystem width={width} height={height} />

      {/* 顶部标题栏 */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        zIndex: 10,
        backdropFilter: 'blur(10px)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #00ffff, #0080ff)',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>🚁</div>
          <div>
            <h2 style={{ color: '#ffffff', margin: 0, fontSize: '18px' }}>Epic控制中心</h2>
            <p style={{ color: 'rgba(255,255,255,0.6)', margin: 0, fontSize: '10px' }}>深基坑工程智能监控平台</p>
          </div>
        </div>

        <button
          onClick={onExit}
          style={{
            background: 'rgba(255,100,100,0.2)',
            border: '1px solid rgba(255,100,100,0.5)',
            borderRadius: '8px',
            color: '#ffffff',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '12px'
          }}
        >
          ✕ 退出
        </button>
      </div>

      {/* 天气显示 */}
      <SimpleWeatherDisplay />

      {/* 主地图显示区域 */}
      <SimpleMapDisplay projects={PROJECTS} />

      {/* 底部状态栏 */}
      <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '40px',
        background: 'rgba(0,0,0,0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'rgba(255,255,255,0.6)',
        fontSize: '11px',
        zIndex: 10
      }}>
        ✅ 系统运行正常 | 🌐 连接状态良好 | ⚡ GPU加速已启用 | 📡 实时数据同步中
      </div>

      {/* CSS动画定义 */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.3; }
            100% { opacity: 0.8; }
          }
        `}
      </style>
    </div>
  );
};

export default SimpleEpicControlCenter;