/**
 * 量子科技风粒子背景系统
 * 1号架构师 - 打造沉浸式科技感氛围
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useDeepCADTheme } from './DeepCADTheme';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'normal' | 'glow' | 'quantum' | 'data';
}

interface Connection {
  p1: Particle;
  p2: Particle;
  opacity: number;
  distance: number;
}

interface ParticleBackgroundProps {
  particleCount?: number;
  connectionRadius?: number;
  animationSpeed?: number;
  glowEffect?: boolean;
  quantumEffect?: boolean;
  dataFlowEffect?: boolean;
  interactive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const ParticleBackground: React.FC<ParticleBackgroundProps> = ({
  particleCount = 150,
  connectionRadius = 100,
  animationSpeed = 1.0,
  glowEffect = true,
  quantumEffect = true,
  dataFlowEffect = true,
  interactive = true,
  className,
  style
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const mouseRef = useRef({ x: 0, y: 0, isMoving: false });
  const particlesRef = useRef<Particle[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const { themeConfig } = useDeepCADTheme();

  // 粒子配色方案
  const particleColors = {
    primary: themeConfig?.primaryColor || '#00d9ff',
    secondary: themeConfig?.secondaryColor || '#0066cc',
    accent: themeConfig?.accentColor || '#ff6b35',
    quantum: '#9d4edd',
    data: '#06ffa5'
  };

  // 初始化粒子
  const initializeParticles = useCallback((width: number, height: number) => {
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      const particleType = Math.random();
      let type: Particle['type'] = 'normal';
      let color = particleColors.primary;
      let size = Math.random() * 2 + 1;
      
      if (quantumEffect && particleType < 0.1) {
        type = 'quantum';
        color = particleColors.quantum;
        size = Math.random() * 3 + 2;
      } else if (dataFlowEffect && particleType < 0.2) {
        type = 'data';
        color = particleColors.data;
        size = Math.random() * 1.5 + 0.5;
      } else if (glowEffect && particleType < 0.4) {
        type = 'glow';
        color = particleColors.secondary;
        size = Math.random() * 2.5 + 1.5;
      }

      const particle: Particle = {
        id: i,
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * animationSpeed * 0.5,
        vy: (Math.random() - 0.5) * animationSpeed * 0.5,
        size,
        opacity: Math.random() * 0.8 + 0.2,
        color,
        type,
        life: Math.random() * 1000,
        maxLife: 1000 + Math.random() * 2000
      };
      
      particles.push(particle);
    }
    
    particlesRef.current = particles;
  }, [particleCount, animationSpeed, glowEffect, quantumEffect, dataFlowEffect, particleColors]);

  // 计算粒子连接
  const calculateConnections = useCallback(() => {
    const particles = particlesRef.current;
    const connections: Connection[] = [];
    
    for (let i = 0; i < particles.length; i++) {
      for (let j = i + 1; j < particles.length; j++) {
        const p1 = particles[i];
        const p2 = particles[j];
        const distance = Math.sqrt(
          Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2)
        );
        
        if (distance < connectionRadius) {
          const opacity = (1 - distance / connectionRadius) * 0.3;
          connections.push({
            p1,
            p2,
            opacity,
            distance
          });
        }
      }
    }
    
    connectionsRef.current = connections;
  }, [connectionRadius]);

  // 更新粒子状态
  const updateParticles = useCallback((width: number, height: number, deltaTime: number) => {
    const particles = particlesRef.current;
    const mouse = mouseRef.current;
    
    particles.forEach(particle => {
      // 基础移动
      particle.x += particle.vx * deltaTime * 0.016;
      particle.y += particle.vy * deltaTime * 0.016;
      
      // 边界检测
      if (particle.x < 0 || particle.x > width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > height) particle.vy *= -1;
      
      particle.x = Math.max(0, Math.min(width, particle.x));
      particle.y = Math.max(0, Math.min(height, particle.y));
      
      // 鼠标交互效果
      if (interactive && mouse.isMoving) {
        const mouseDistance = Math.sqrt(
          Math.pow(particle.x - mouse.x, 2) + Math.pow(particle.y - mouse.y, 2)
        );
        
        if (mouseDistance < 150) {
          const force = (150 - mouseDistance) / 150;
          const angle = Math.atan2(particle.y - mouse.y, particle.x - mouse.x);
          particle.vx += Math.cos(angle) * force * 0.5;
          particle.vy += Math.sin(angle) * force * 0.5;
          particle.opacity = Math.min(1, particle.opacity + force * 0.3);
        }
      }
      
      // 生命周期动画
      particle.life += deltaTime;
      if (particle.life > particle.maxLife) {
        particle.life = 0;
      }
      
      // 量子效果
      if (particle.type === 'quantum') {
        particle.opacity = 0.3 + Math.sin(particle.life * 0.005) * 0.4;
        particle.size = 2 + Math.sin(particle.life * 0.003) * 1;
      }
      
      // 数据流效果
      if (particle.type === 'data') {
        particle.opacity = 0.6 + Math.sin(particle.life * 0.01) * 0.3;
        // 数据粒子倾向于直线运动
        if (Math.random() < 0.01) {
          particle.vx = (Math.random() - 0.5) * 2;
          particle.vy = (Math.random() - 0.5) * 0.5;
        }
      }
      
      // 发光效果脉动
      if (particle.type === 'glow') {
        particle.opacity = 0.4 + Math.sin(particle.life * 0.002) * 0.3;
      }
      
      // 速度衰减
      particle.vx *= 0.999;
      particle.vy *= 0.999;
      
      // 透明度缓慢恢复
      particle.opacity = Math.max(0.1, particle.opacity * 0.995);
    });
  }, [interactive]);

  // 渲染粒子和连接
  const render = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // 清空画布
    ctx.clearRect(0, 0, width, height);
    
    // 设置混合模式
    ctx.globalCompositeOperation = 'lighter';
    
    // 绘制连接线
    connectionsRef.current.forEach(connection => {
      const gradient = ctx.createLinearGradient(
        connection.p1.x, connection.p1.y,
        connection.p2.x, connection.p2.y
      );
      
      gradient.addColorStop(0, `${connection.p1.color}${Math.floor(connection.opacity * connection.p1.opacity * 255).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${connection.p2.color}${Math.floor(connection.opacity * connection.p2.opacity * 255).toString(16).padStart(2, '0')}`);
      
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(connection.p1.x, connection.p1.y);
      ctx.lineTo(connection.p2.x, connection.p2.y);
      ctx.stroke();
    });
    
    // 绘制粒子
    particlesRef.current.forEach(particle => {
      ctx.save();
      
      // 发光效果
      if (particle.type === 'glow' || particle.type === 'quantum') {
        ctx.shadowColor = particle.color;
        ctx.shadowBlur = particle.size * 3;
      }
      
      // 粒子颜色和透明度
      const alpha = Math.floor(particle.opacity * 255).toString(16).padStart(2, '0');
      ctx.fillStyle = `${particle.color}${alpha}`;
      
      // 绘制粒子
      ctx.beginPath();
      
      if (particle.type === 'quantum') {
        // 量子粒子 - 六边形
        const sides = 6;
        const radius = particle.size;
        ctx.moveTo(particle.x + radius, particle.y);
        for (let i = 1; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          ctx.lineTo(
            particle.x + radius * Math.cos(angle),
            particle.y + radius * Math.sin(angle)
          );
        }
      } else if (particle.type === 'data') {
        // 数据粒子 - 方形
        const size = particle.size;
        ctx.rect(particle.x - size/2, particle.y - size/2, size, size);
      } else {
        // 普通粒子 - 圆形
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      }
      
      ctx.fill();
      ctx.restore();
    });
    
    // 恢复混合模式
    ctx.globalCompositeOperation = 'source-over';
  }, []);

  // 动画循环
  const animate = useCallback((currentTime: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    
    if (!canvas || !ctx) return;
    
    const { width, height } = dimensions;
    if (width === 0 || height === 0) return;
    
    // 更新粒子
    updateParticles(width, height, 16.67); // 60 FPS
    
    // 计算连接
    calculateConnections();
    
    // 渲染
    render(ctx, width, height);
    
    animationRef.current = requestAnimationFrame(animate);
  }, [dimensions, updateParticles, calculateConnections, render]);

  // 鼠标事件处理
  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    mouseRef.current = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      isMoving: true
    };
    
    // 一定时间后取消移动状态
    setTimeout(() => {
      mouseRef.current.isMoving = false;
    }, 100);
  }, [interactive]);

  // 窗口大小变化处理
  useEffect(() => {
    const updateDimensions = () => {
      const canvas = canvasRef.current;
      if (!canvas || !canvas.parentElement) return;
      
      const { clientWidth, clientHeight } = canvas.parentElement;
      setDimensions({ width: clientWidth, height: clientHeight });
      
      canvas.width = clientWidth;
      canvas.height = clientHeight;
      
      // 重新初始化粒子
      initializeParticles(clientWidth, clientHeight);
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => window.removeEventListener('resize', updateDimensions);
  }, []); // 移除 initializeParticles 依赖，避免无限循环

  // 启动动画
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      animationRef.current = requestAnimationFrame(animate);
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, dimensions]);

  return (
    <div 
      className={className}
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: interactive ? 'auto' : 'none',
        zIndex: -1,
        ...style 
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseMove={handleMouseMove}
        style={{
          width: '100%',
          height: '100%',
          display: 'block'
        }}
      />
    </div>
  );
};

export default ParticleBackground;