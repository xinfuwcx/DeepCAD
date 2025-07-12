import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
}

const Logo: React.FC<LogoProps> = ({ size = 'medium', className = '', style = {} }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>(0);
  
  const { uiMode } = useUIStore(
    useShallow(state => ({
      uiMode: state.uiMode
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  
  // 确定Logo尺寸
  const getLogoSize = () => {
    switch (size) {
      case 'small': return { width: 32, height: 32, fontSize: 14 };
      case 'large': return { width: 64, height: 64, fontSize: 28 };
      default: return { width: 48, height: 48, fontSize: 22 };
    }
  };
  
  const { width, height, fontSize } = getLogoSize();
  
  // 绘制量子效果
  useEffect(() => {
    if (!isFusionMode || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let time = 0;
    
    const animate = () => {
      time += 0.01;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制量子环
      const drawQuantumRing = () => {
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(centerX, centerY) * 0.9;
        
        // 外环
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(60, 142, 255, ${0.3 + Math.sin(time) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // 内环
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(138, 95, 255, ${0.3 + Math.cos(time) * 0.2})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        
        // 量子粒子
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + time;
          const x = centerX + Math.cos(angle) * maxRadius * 0.85;
          const y = centerY + Math.sin(angle) * maxRadius * 0.85;
          
          ctx.beginPath();
          ctx.arc(x, y, 2 + Math.sin(time + i) * 1, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${60 + i * 20}, 142, 255, ${0.7 + Math.sin(time + i) * 0.3})`;
          ctx.fill();
          
          // 粒子轨迹
          ctx.beginPath();
          ctx.arc(centerX, centerY, maxRadius * 0.85, angle - 0.2, angle + 0.2);
          ctx.strokeStyle = `rgba(${60 + i * 20}, 142, 255, ${0.1 + Math.sin(time + i) * 0.1})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
        
        // 中心光芒
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, maxRadius * 0.4
        );
        gradient.addColorStop(0, 'rgba(255, 60, 142, 0.8)');
        gradient.addColorStop(0.5, 'rgba(138, 95, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(60, 142, 255, 0)');
        
        ctx.beginPath();
        ctx.arc(centerX, centerY, maxRadius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // 光束效果
        for (let i = 0; i < 3; i++) {
          const angle = (i / 3) * Math.PI * 2 + time * 0.5;
          
          ctx.beginPath();
          ctx.moveTo(centerX, centerY);
          ctx.lineTo(
            centerX + Math.cos(angle) * maxRadius,
            centerY + Math.sin(angle) * maxRadius
          );
          
          const gradient = ctx.createLinearGradient(
            centerX, centerY,
            centerX + Math.cos(angle) * maxRadius,
            centerY + Math.sin(angle) * maxRadius
          );
          gradient.addColorStop(0, 'rgba(255, 60, 142, 0.8)');
          gradient.addColorStop(1, 'rgba(60, 142, 255, 0)');
          
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      };
      
      drawQuantumRing();
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestIdRef.current);
    };
  }, [isFusionMode]);

  return (
    <div 
      className={`logo-container ${className}`}
      style={{
        position: 'relative',
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      {isFusionMode && (
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0
          }}
        />
      )}
      
      <motion.div
        className={isFusionMode ? 'quantum-text' : 'theme-text-gradient'}
        data-text="D"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          fontSize,
          fontWeight: 'bold',
          position: 'relative',
          zIndex: 1
        }}
      >
        D
      </motion.div>
    </div>
  );
};

export default Logo; 