import React, { useRef, useEffect, useState } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumParticleProps {
  density?: 'low' | 'medium' | 'high';
  color?: string;
  secondaryColor?: string;
  speed?: number;
  interactive?: boolean;
  blending?: boolean;
  size?: number;
  maxSize?: number;
  connectParticles?: boolean;
  className?: string;
  style?: React.CSSProperties;
  zIndex?: number;
  opacity?: number;
  particleType?: 'circle' | 'square' | 'triangle' | 'mixed';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  type: 'circle' | 'square' | 'triangle';
}

const QuantumParticles: React.FC<QuantumParticleProps> = ({
  density = 'medium',
  color = 'var(--quantum-blue)',
  secondaryColor = 'var(--quantum-purple)',
  speed = 1,
  interactive = true,
  blending = true,
  size = 2,
  maxSize = 4,
  connectParticles = true,
  className = '',
  style = {},
  zIndex = 0,
  opacity = 0.6,
  particleType = 'circle',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const requestIdRef = useRef<number>(0);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  
  // 如果不是融合模式或粒子效果被禁用，则不显示粒子
  if (!isFusionMode || !particleEffectsEnabled) {
    return null;
  }
  
  // 根据密度确定粒子数量
  const getParticleCount = () => {
    const baseCount = Math.floor((dimensions.width * dimensions.height) / 10000);
    
    switch (density) {
      case 'low': return Math.max(10, Math.floor(baseCount * 0.5));
      case 'high': return Math.max(30, Math.floor(baseCount * 2));
      case 'medium':
      default: return Math.max(20, baseCount);
    }
  };
  
  // 创建粒子
  const createParticles = () => {
    const particleCount = getParticleCount();
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle());
    }
    
    particlesRef.current = particles;
  };
  
  // 创建单个粒子
  const createParticle = (x?: number, y?: number): Particle => {
    const useColor = Math.random() > 0.5 ? color : secondaryColor;
    const particleSize = Math.random() * (maxSize - size) + size;
    
    // 确定粒子类型
    let type: 'circle' | 'square' | 'triangle';
    if (particleType === 'mixed') {
      const types: ('circle' | 'square' | 'triangle')[] = ['circle', 'square', 'triangle'];
      type = types[Math.floor(Math.random() * types.length)];
    } else {
      type = particleType;
    }
    
    return {
      x: x !== undefined ? x : Math.random() * dimensions.width,
      y: y !== undefined ? y : Math.random() * dimensions.height,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      size: particleSize,
      color: useColor,
      opacity: Math.random() * 0.4 + opacity * 0.6,
      type,
    };
  };
  
  // 更新画布尺寸
  useEffect(() => {
    const updateDimensions = () => {
      if (!canvasRef.current) return;
      
      const { width, height } = canvasRef.current.getBoundingClientRect();
      
      // 设置画布尺寸，考虑设备像素比以获得更清晰的渲染
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = width * dpr;
      canvasRef.current.height = height * dpr;
      
      // 更新状态
      setDimensions({ width: canvasRef.current.width, height: canvasRef.current.height });
      
      // 如果已经有粒子，则重新创建以适应新尺寸
      if (particlesRef.current.length > 0) {
        createParticles();
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // 初始化粒子
  useEffect(() => {
    if (dimensions.width > 0 && dimensions.height > 0) {
      createParticles();
    }
  }, [dimensions]);
  
  // 鼠标交互
  useEffect(() => {
    if (!interactive) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      mouseRef.current = {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    };
    
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };
    
    window.addEventListener('mousemove', handleMouseMove);
    canvasRef.current?.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      canvasRef.current?.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [interactive]);
  
  // 动画循环
  useEffect(() => {
    if (!canvasRef.current || dimensions.width === 0 || dimensions.height === 0) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // 设置混合模式
    if (blending) {
      ctx.globalCompositeOperation = 'lighter';
    }
    
    // 考虑设备像素比
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);
    
    const animate = () => {
      if (!canvas || !ctx) return;
      
      // 清除画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 更新并绘制粒子
      particlesRef.current.forEach((p, index) => {
        // 更新位置
        p.x += p.vx;
        p.y += p.vy;
        
        // 边界检查
        if (p.x < 0) {
          p.x = canvas.width;
        } else if (p.x > canvas.width) {
          p.x = 0;
        }
        
        if (p.y < 0) {
          p.y = canvas.height;
        } else if (p.y > canvas.height) {
          p.y = 0;
        }
        
        // 鼠标交互
        if (interactive) {
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          const maxDistance = 150 * dpr;
          
          if (distance < maxDistance) {
            const force = (maxDistance - distance) / maxDistance;
            const angle = Math.atan2(dy, dx);
            
            p.vx += Math.cos(angle) * force * 0.02;
            p.vy += Math.sin(angle) * force * 0.02;
          }
        }
        
        // 限制速度
        const maxSpeed = 1.5 * speed;
        const currentSpeed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        
        if (currentSpeed > maxSpeed) {
          p.vx = (p.vx / currentSpeed) * maxSpeed;
          p.vy = (p.vy / currentSpeed) * maxSpeed;
        }
        
        // 绘制粒子
        ctx.beginPath();
        
        switch (p.type) {
          case 'square':
            ctx.rect(p.x - p.size, p.y - p.size, p.size * 2, p.size * 2);
            break;
          case 'triangle':
            ctx.moveTo(p.x, p.y - p.size);
            ctx.lineTo(p.x + p.size, p.y + p.size);
            ctx.lineTo(p.x - p.size, p.y + p.size);
            ctx.closePath();
            break;
          case 'circle':
          default:
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            break;
        }
        
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
        
        // 连接粒子
        if (connectParticles) {
          for (let j = index + 1; j < particlesRef.current.length; j++) {
            const p2 = particlesRef.current[j];
            const dx = p.x - p2.x;
            const dy = p.y - p2.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < 100 * dpr) {
              ctx.beginPath();
              ctx.strokeStyle = p.color;
              ctx.globalAlpha = (100 - distance) / 100 * p.opacity * 0.5;
              ctx.lineWidth = 0.5;
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(p2.x, p2.y);
              ctx.stroke();
            }
          }
        }
      });
      
      // 继续动画循环
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestIdRef.current);
    };
  }, [dimensions, blending, connectParticles, interactive, speed]);
  
  return (
    <canvas
      ref={canvasRef}
      className={`quantum-particles ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex,
        ...style,
      }}
    />
  );
};

export default QuantumParticles; 