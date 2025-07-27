import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  extra?: React.ReactNode;
  cover?: React.ReactNode;
  actions?: React.ReactNode[];
  hoverable?: boolean;
  bordered?: boolean;
  className?: string;
  style?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  headStyle?: React.CSSProperties;
  variant?: 'default' | 'glass' | 'elevated' | 'outlined';
  glowColor?: string;
  glowIntensity?: number;
  particleEffect?: 'none' | 'minimal' | 'intense';
  size?: 'small' | 'default' | 'large';
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
}

const QuantumCard: React.FC<QuantumCardProps> = ({
  children,
  title,
  extra,
  cover,
  actions,
  hoverable = false,
  bordered = true,
  className = '',
  style,
  bodyStyle,
  headStyle,
  variant = 'default',
  glowColor,
  glowIntensity = 0.5,
  particleEffect = 'minimal',
  size = 'default',
  loading = false,
  onClick,
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState<Array<{ x: number; y: number; size: number; opacity: number; id: number; vx: number; vy: number }>>([]);
  const cardRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particleIdRef = useRef(0);
  const requestIdRef = useRef<number>(0);
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  const shouldShowParticles = isFusionMode && particleEffectsEnabled && particleEffect !== 'none' && isHovered;
  
  // 粒子系统
  useEffect(() => {
    if (!shouldShowParticles || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置画布尺寸
    const resizeCanvas = () => {
      if (cardRef.current && canvas) {
        const rect = cardRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 创建粒子
    const createParticle = () => {
      if (!canvas) return null;
      
      const color = glowColor || 'var(--quantum-blue)';
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const size = Math.random() * 2 + 1;
      const vx = (Math.random() - 0.5) * 0.5;
      const vy = (Math.random() - 0.5) * 0.5;
      const id = particleIdRef.current++;
      
      return {
        x,
        y,
        size,
        vx,
        vy,
        color,
        opacity: 0.6,
        id,
      };
    };
    
    // 添加粒子
    const addParticles = () => {
      if (particles.length < 30 && Math.random() > 0.8) {
        const newParticle = createParticle();
        if (newParticle) {
          setParticles(prev => [...prev, newParticle]);
        }
      }
    };
    
    // 更新粒子
    const updateParticles = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      setParticles(prev => 
        prev
          .filter(p => 
            p.x >= 0 && 
            p.x <= canvas.width && 
            p.y >= 0 && 
            p.y <= canvas.height
          )
          .map(p => ({
            ...p,
            x: p.x + p.vx,
            y: p.y + p.vy,
          }))
      );
      
      particles.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = glowColor || 'var(--quantum-blue)';
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });
      
      addParticles();
    };
    
    // 动画循环
    const animate = () => {
      updateParticles();
      requestIdRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      cancelAnimationFrame(requestIdRef.current);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [shouldShowParticles, particles, glowColor]);
  
  // 获取卡片样式
  const getCardStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'relative',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all var(--transition-medium)',
      ...style,
    };
    
    // 根据尺寸调整内边距
    const sizeStyles: Record<string, React.CSSProperties> = {
      small: {
        padding: isFusionMode ? '12px' : '8px',
      },
      default: {
        padding: isFusionMode ? '16px' : '12px',
      },
      large: {
        padding: isFusionMode ? '24px' : '16px',
      },
    };
    
    // 根据变体设置样式
    const variantStyles: Record<string, React.CSSProperties> = {
      default: {
        background: 'var(--bg-card)',
        border: bordered ? 'var(--glass-border)' : 'none',
        boxShadow: 'var(--shadow-sm)',
      },
      glass: {
        background: 'var(--glass-bg)',
        border: bordered ? 'var(--glass-border)' : 'none',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        boxShadow: 'var(--shadow-sm)',
      },
      elevated: {
        background: 'var(--bg-card)',
        border: bordered ? 'var(--glass-border)' : 'none',
        boxShadow: 'var(--shadow-lg)',
      },
      outlined: {
        background: 'transparent',
        border: bordered ? '1px solid var(--border-color)' : 'none',
        boxShadow: 'none',
      },
    };
    
    // 悬停效果
    const hoverStyles: React.CSSProperties = hoverable && isHovered ? {
      transform: 'translateY(-4px)',
      boxShadow: isFusionMode 
        ? `0 8px 30px ${glowColor || 'var(--quantum-blue)'}${Math.round(glowIntensity * 20)}`
        : 'var(--shadow-lg)',
    } : {};
    
    return {
      ...baseStyles,
      ...variantStyles[variant],
      ...sizeStyles[size],
      ...hoverStyles,
    };
  };
  
  // 获取头部样式
  const getHeadStyles = (): React.CSSProperties => {
    return {
      padding: size === 'small' ? '8px 12px' : size === 'large' ? '16px 24px' : '12px 16px',
      borderBottom: bordered ? '1px solid var(--border-color)' : 'none',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      ...headStyle,
    };
  };
  
  // 获取内容样式
  const getBodyStyles = (): React.CSSProperties => {
    return {
      padding: size === 'small' ? '8px 12px' : size === 'large' ? '16px 24px' : '12px 16px',
      ...bodyStyle,
    };
  };
  
  // 获取动作区样式
  const getActionsStyles = (): React.CSSProperties => {
    return {
      padding: size === 'small' ? '8px 12px' : size === 'large' ? '16px 24px' : '12px 16px',
      borderTop: bordered ? '1px solid var(--border-color)' : 'none',
      display: 'flex',
      justifyContent: 'space-around',
    };
  };
  
  // 获取类名
  const getClassName = () => {
    const baseClass = 'quantum-card';
    const modeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';
    const variantClass = `quantum-card-${variant}`;
    const sizeClass = `quantum-card-${size}`;
    const hoverableClass = hoverable ? 'hoverable' : '';
    const loadingClass = loading ? 'loading' : '';
    
    return `${baseClass} ${modeClass} ${variantClass} ${sizeClass} ${hoverableClass} ${loadingClass} ${className}`;
  };
  
  // 处理点击事件
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onClick) {
      onClick(e);
    }
  };
  
  // 渲染加载状态
  const renderLoading = () => {
    if (!loading) return null;
    
    return (
      <div 
        className="quantum-card-loading"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(var(--bg-base-rgb), 0.7)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 10,
        }}
      >
        <div 
          className="quantum-card-loading-indicator"
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid transparent',
            borderTopColor: glowColor || 'var(--quantum-blue)',
            animation: 'quantum-spin 1s linear infinite',
          }}
        />
      </div>
    );
  };

  return (
    <motion.div
      ref={cardRef}
      className={getClassName()}
      style={getCardStyles()}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {/* 粒子效果 - 仅在Fusion模式下显示 */}
      {shouldShowParticles && (
        <canvas
          ref={canvasRef}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      )}
      
      {/* 发光边框 - 仅在Fusion模式下显示 */}
      {isFusionMode && isHovered && (
        <div
          className="quantum-card-glow-border"
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: '1px',
            background: `linear-gradient(135deg, ${glowColor || 'var(--quantum-blue)'}, ${glowColor || 'var(--quantum-purple)'})`,
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
            pointerEvents: 'none',
            opacity: 0.8,
            zIndex: 0,
          }}
        />
      )}
      
      {/* 封面图 */}
      {cover && (
        <div className="quantum-card-cover">
          {cover}
        </div>
      )}
      
      {/* 标题区域 */}
      {(title || extra) && (
        <div className="quantum-card-head" style={getHeadStyles()}>
          {title && (
            <div className="quantum-card-head-title" style={{ fontWeight: 600 }}>
              {title}
            </div>
          )}
          {extra && (
            <div className="quantum-card-head-extra">
              {extra}
            </div>
          )}
        </div>
      )}
      
      {/* 内容区域 */}
      <div className="quantum-card-body" style={getBodyStyles()}>
        {children}
      </div>
      
      {/* 动作区域 */}
      {actions && actions.length > 0 && (
        <div className="quantum-card-actions" style={getActionsStyles()}>
          {actions.map((action, index) => (
            <div key={index} className="quantum-card-action-item">
              {action}
            </div>
          ))}
        </div>
      )}
      
      {/* 加载状态 */}
      {renderLoading()}
    </motion.div>
  );
};

export default QuantumCard; 