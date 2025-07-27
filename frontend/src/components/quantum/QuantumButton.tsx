import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumButtonProps {
  children: React.ReactNode;
  glowColor?: string;
  glowIntensity?: number;
  particleEffect?: 'none' | 'minimal' | 'intense';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  htmlType?: 'button' | 'submit' | 'reset';
  href?: string;
  target?: string;
  size?: 'small' | 'middle' | 'large';
}

const QuantumButton: React.FC<QuantumButtonProps> = ({
  children,
  glowColor,
  glowIntensity = 0.6,
  particleEffect = 'minimal',
  variant = 'primary',
  className = '',
  onClick,
  disabled,
  style,
  type = 'button',
  htmlType,
  href,
  target,
  size = 'middle',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const requestIdRef = useRef<number>(0);
  const mousePositionRef = useRef({ x: 0, y: 0 });
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  const shouldShowParticles = isFusionMode && particleEffectsEnabled && particleEffect !== 'none' && !disabled;
  
  // 获取按钮变体的样式
  const getVariantStyles = () => {
    const baseStyles = {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      transition: 'all var(--transition-medium)',
      transform: isPressed ? 'scale(0.98)' : isHovered ? 'scale(1.02) translateY(-1px)' : 'scale(1)',
      boxShadow: isHovered ? '0 6px 16px var(--shadow-color)' : '0 2px 8px var(--shadow-color)',
      padding: size === 'small' ? '4px 12px' : size === 'large' ? '8px 24px' : '6px 16px',
      borderRadius: '8px',
      cursor: disabled ? 'not-allowed' : 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: size === 'small' ? '14px' : size === 'large' ? '16px' : '14px',
      fontWeight: 500,
      opacity: disabled ? 0.6 : 1,
      ...style,
    };
    
    const variantSpecificStyles: Record<string, React.CSSProperties> = {
      primary: {
        background: isFusionMode ? 'var(--gradient-blue)' : 'var(--primary-color)',
        border: 'none',
        color: 'white',
      },
      secondary: {
        background: 'var(--bg-secondary)',
        border: 'var(--glass-border)',
        color: 'var(--text-primary)',
      },
      ghost: {
        background: 'transparent',
        border: '1px solid var(--border-color)',
        color: 'var(--text-primary)',
      },
      danger: {
        background: isFusionMode 
          ? 'linear-gradient(135deg, #ff3c6f 0%, #ff5252 100%)' 
          : 'var(--error-color)',
        border: 'none',
        color: 'white',
      },
      success: {
        background: isFusionMode 
          ? 'linear-gradient(135deg, #3cff8e 0%, #00c853 100%)' 
          : 'var(--success-color)',
        border: 'none',
        color: 'white',
      }
    };
    
    return { ...baseStyles, ...variantSpecificStyles[variant] };
  };
  
  // 粒子系统
  useEffect(() => {
    if (!shouldShowParticles || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置画布尺寸
    const resizeCanvas = () => {
      if (buttonRef.current && canvas) {
        const rect = buttonRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 创建粒子
    const createParticle = (x: number, y: number, isClick = false) => {
      const getColor = () => {
        if (glowColor) return glowColor;
        
        switch (variant) {
          case 'primary': return 'var(--quantum-blue)';
          case 'danger': return 'var(--error-color)';
          case 'success': return 'var(--success-color)';
          default: return 'var(--quantum-purple)';
        }
      };
      
      const baseColor = getColor();
      const speed = isClick ? 2 : 1;
      const size = isClick ? Math.random() * 3 + 2 : Math.random() * 2 + 1;
      const life = isClick ? 30 : 20;
      
      return {
        x,
        y,
        size,
        speedX: (Math.random() - 0.5) * speed * 2,
        speedY: (Math.random() - 0.5) * speed * 2 - (isClick ? 1 : 0),
        color: baseColor,
        alpha: isClick ? 0.8 : 0.6,
        life: 0,
        maxLife: life,
      };
    };
    
    // 更新粒子
    const updateParticles = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 如果鼠标悬停在按钮上，添加新粒子
      if (isHovered && particleEffect === 'intense') {
        const x = Math.random() * canvas.width;
        const y = canvas.height + 5;
        particlesRef.current.push(createParticle(x, y));
      }
      
      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      
      particlesRef.current.forEach(p => {
        p.life++;
        p.x += p.speedX;
        p.y += p.speedY;
        
        const lifeRatio = 1 - p.life / p.maxLife;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.alpha * lifeRatio;
        ctx.fill();
      });
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
  }, [shouldShowParticles, isHovered, variant, glowColor, particleEffect]);
  
  // 点击效果
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled) return;
    
    if (shouldShowParticles && buttonRef.current && canvasRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // 创建点击粒子爆发
      for (let i = 0; i < 15; i++) {
        particlesRef.current.push(createParticle(x, y, true));
      }
    }
    
    if (onClick) {
      onClick(e);
    }
  };
  
  // 创建点击粒子
  const createParticle = (x: number, y: number, isClick = false) => {
    const getColor = () => {
      if (glowColor) return glowColor;
      
      switch (variant) {
        case 'primary': return 'var(--quantum-blue)';
        case 'danger': return 'var(--error-color)';
        case 'success': return 'var(--success-color)';
        default: return 'var(--quantum-purple)';
      }
    };
    
    const baseColor = getColor();
    const speed = isClick ? 2 : 1;
    const size = isClick ? Math.random() * 3 + 2 : Math.random() * 2 + 1;
    const life = isClick ? 30 : 20;
    
    return {
      x,
      y,
      size,
      speedX: (Math.random() - 0.5) * speed * 2,
      speedY: (Math.random() - 0.5) * speed * 2 - (isClick ? 1 : 0),
      color: baseColor,
      alpha: isClick ? 0.8 : 0.6,
      life: 0,
      maxLife: life,
    };
  };
  
  // 获取按钮的类名
  const getButtonClassName = () => {
    const baseClass = 'quantum-button theme-btn';
    const variantClass = `quantum-button-${variant}`;
    const modeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';
    const sizeClass = `quantum-button-${size}`;
    const stateClass = disabled ? 'disabled' : '';
    
    return `${baseClass} ${variantClass} ${modeClass} ${sizeClass} ${stateClass} ${className}`;
  };
  
  // 获取发光效果样式
  const getGlowStyles = (): React.CSSProperties => {
    if (!isFusionMode || disabled) return {};
    
    const color = glowColor || (
      variant === 'primary' ? 'var(--quantum-blue)' : 
      variant === 'danger' ? 'var(--error-color)' :
      variant === 'success' ? 'var(--success-color)' :
      'var(--quantum-purple)'
    );
    
    return {
      boxShadow: isHovered 
        ? `0 0 15px ${color}${Math.round(glowIntensity * 100)}` 
        : `0 0 5px ${color}${Math.round(glowIntensity * 50)}`,
    };
  };

  // 创建按钮元素
  const renderButton = () => {
    const buttonContent = (
      <motion.div
        ref={buttonRef}
        className={getButtonClassName()}
        style={getVariantStyles()}
        whileTap={{ scale: 0.98 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onMouseDown={() => setIsPressed(true)}
        onMouseUp={() => setIsPressed(false)}
        onClick={handleClick}
        role="button"
        tabIndex={disabled ? -1 : 0}
        {...props}
      >
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
            }}
          />
        )}
        
        {/* 内部发光边框 - 仅在Fusion模式下显示 */}
        {isFusionMode && !disabled && (
          <div
            className="quantum-button-border"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: 'inherit',
              padding: '1px',
              background: variant === 'ghost' 
                ? `linear-gradient(135deg, ${glowColor || 'var(--quantum-blue)'}, ${glowColor || 'var(--quantum-purple)'})`
                : 'transparent',
              WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
              WebkitMaskComposite: 'xor',
              maskComposite: 'exclude',
              pointerEvents: 'none',
              opacity: isHovered ? 1 : 0.6,
              transition: 'opacity var(--transition-fast)',
            }}
          />
        )}
        
        <div style={{ position: 'relative', zIndex: 1 }}>
          {children}
        </div>
      </motion.div>
    );
    
    // 如果提供了href，则渲染为链接
    if (href) {
      return (
        <a href={href} target={target} style={{ textDecoration: 'none' }}>
          {buttonContent}
        </a>
      );
    }
    
    return buttonContent;
  };

  return renderButton();
};

export default QuantumButton; 