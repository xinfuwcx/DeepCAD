import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  className?: string;
  style?: React.CSSProperties;
  variant?: 'full' | 'icon';
}

const Logo: React.FC<LogoProps> = ({ 
  size = 'medium', 
  className = '', 
  style = {}, 
  variant = 'full' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestIdRef = useRef<number>(0);
  
  // 确定Logo尺寸
  const getLogoSize = () => {
    switch (size) {
      case 'small': return { width: 120, height: 32, fontSize: 18, iconSize: 24 };
      case 'large': return { width: 200, height: 64, fontSize: 32, iconSize: 48 };
      default: return { width: 160, height: 48, fontSize: 24, iconSize: 36 };
    }
  };
  
  const { width, height, fontSize, iconSize } = getLogoSize();
  
  // 绘制动态几何图形背景
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    let time = 0;
    
    const animate = () => {
      time += 0.02;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 绘制CAD风格的几何图形
      const drawCADElements = () => {
        const centerX = iconSize / 2;
        const centerY = height / 2;
        
        // 主立方体轮廓 - 表示3D CAD
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.8 + Math.sin(time) * 0.2})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        
        // 立方体前面
        const cubeSize = iconSize * 0.4;
        ctx.strokeRect(
          centerX - cubeSize/2, 
          centerY - cubeSize/2, 
          cubeSize, 
          cubeSize
        );
        
        // 立方体后面（3D效果）
        const offset = cubeSize * 0.2;
        ctx.strokeRect(
          centerX - cubeSize/2 + offset, 
          centerY - cubeSize/2 - offset, 
          cubeSize, 
          cubeSize
        );
        
        // 连接线形成3D效果
        ctx.beginPath();
        ctx.moveTo(centerX - cubeSize/2, centerY - cubeSize/2);
        ctx.lineTo(centerX - cubeSize/2 + offset, centerY - cubeSize/2 - offset);
        ctx.moveTo(centerX + cubeSize/2, centerY - cubeSize/2);
        ctx.lineTo(centerX + cubeSize/2 + offset, centerY - cubeSize/2 - offset);
        ctx.moveTo(centerX + cubeSize/2, centerY + cubeSize/2);
        ctx.lineTo(centerX + cubeSize/2 + offset, centerY + cubeSize/2 - offset);
        ctx.moveTo(centerX - cubeSize/2, centerY + cubeSize/2);
        ctx.lineTo(centerX - cubeSize/2 + offset, centerY + cubeSize/2 - offset);
        ctx.stroke();
        
        // 动态网格线 - 表示分析网格
        ctx.strokeStyle = `rgba(82, 196, 26, ${0.3 + Math.cos(time + 1) * 0.2})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        
        // 水平网格
        for (let i = 0; i < 3; i++) {
          const y = centerY - cubeSize/2 + (i * cubeSize/2);
          ctx.beginPath();
          ctx.moveTo(centerX - cubeSize/2, y);
          ctx.lineTo(centerX + cubeSize/2, y);
          ctx.stroke();
        }
        
        // 垂直网格
        for (let i = 0; i < 3; i++) {
          const x = centerX - cubeSize/2 + (i * cubeSize/2);
          ctx.beginPath();
          ctx.moveTo(x, centerY - cubeSize/2);
          ctx.lineTo(x, centerY + cubeSize/2);
          ctx.stroke();
        }
        
        // 中心发光点 - 表示深度学习AI
        const glowRadius = 3 + Math.sin(time * 2) * 1;
        const gradient = ctx.createRadialGradient(
          centerX, centerY, 0,
          centerX, centerY, glowRadius * 2
        );
        gradient.addColorStop(0, 'rgba(250, 173, 20, 1)');
        gradient.addColorStop(0.5, 'rgba(250, 173, 20, 0.6)');
        gradient.addColorStop(1, 'rgba(250, 173, 20, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        // 核心点
        ctx.fillStyle = '#faad14';
        ctx.beginPath();
        ctx.arc(centerX, centerY, glowRadius, 0, Math.PI * 2);
        ctx.fill();
        
        // 数据流效果 - 表示深度计算
        ctx.strokeStyle = `rgba(0, 217, 255, ${0.4 + Math.sin(time * 3) * 0.3})`;
        ctx.lineWidth = 1;
        ctx.setLineDash([1, 3]);
        
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + time;
          const startRadius = cubeSize * 0.3;
          const endRadius = cubeSize * 0.7;
          
          ctx.beginPath();
          ctx.moveTo(
            centerX + Math.cos(angle) * startRadius,
            centerY + Math.sin(angle) * startRadius
          );
          ctx.lineTo(
            centerX + Math.cos(angle) * endRadius,
            centerY + Math.sin(angle) * endRadius
          );
          ctx.stroke();
        }
      };
      
      drawCADElements();
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestIdRef.current);
    };
  }, [iconSize, height]);

  if (variant === 'icon') {
    return (
      <div 
        className={`logo-container ${className}`}
        style={{
          position: 'relative',
          width: iconSize,
          height: iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...style
        }}
      >
        <canvas
          ref={canvasRef}
          width={iconSize}
          height={iconSize}
          style={{
            width: '100%',
            height: '100%'
          }}
        />
      </div>
    );
  }

  return (
    <motion.div 
      className={`logo-container ${className}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      style={{
        position: 'relative',
        width,
        height,
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        ...style
      }}
    >
      {/* 图标部分 */}
      <div style={{ position: 'relative' }}>
        <canvas
          ref={canvasRef}
          width={iconSize}
          height={height}
          style={{
            width: iconSize,
            height: height
          }}
        />
      </div>
      
      {/* 文字部分 */}
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          style={{
            fontSize: fontSize,
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #00d9ff 0%, #52c41a 50%, #faad14 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 20px rgba(0, 217, 255, 0.3)',
            letterSpacing: '1px',
            lineHeight: 1
          }}
        >
          DeepCAD
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          style={{
            fontSize: fontSize * 0.35,
            color: 'rgba(255, 255, 255, 0.7)',
            letterSpacing: '2px',
            marginTop: '-2px',
            fontWeight: 'normal'
          }}
        >
          AI-POWERED CAE
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Logo;