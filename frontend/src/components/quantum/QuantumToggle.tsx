import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useUIStore } from '../../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

export interface QuantumToggleProps {
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  size?: 'small' | 'default' | 'large';
  checkedChildren?: React.ReactNode;
  unCheckedChildren?: React.ReactNode;
  loading?: boolean;
  glowColor?: string;
  glowIntensity?: number;
}

const QuantumToggle: React.FC<QuantumToggleProps> = ({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  className = '',
  style,
  size = 'default',
  checkedChildren,
  unCheckedChildren,
  loading = false,
  glowColor,
  glowIntensity = 0.6,
}) => {
  const [isChecked, setIsChecked] = useState(checked !== undefined ? checked : defaultChecked);
  const [isHovered, setIsHovered] = useState(false);
  const toggleRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number; life: number; maxLife: number }>>([]);
  const requestIdRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { uiMode, particleEffectsEnabled } = useUIStore(
    useShallow(state => ({
      uiMode: (state as any).uiMode || 'normal',
      particleEffectsEnabled: (state as any).particleEffectsEnabled || false
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  const shouldShowParticles = isFusionMode && particleEffectsEnabled && !disabled && isChecked;
  
  // 同步外部checked
  useEffect(() => {
    if (checked !== undefined && checked !== isChecked) {
      setIsChecked(checked);
    }
  }, [checked]);
  
  // 处理点击事件
  const handleClick = () => {
    if (disabled || loading) return;
    
    const newChecked = !isChecked;
    
    if (checked === undefined) {
      setIsChecked(newChecked);
    }
    
    if (onChange) {
      onChange(newChecked);
    }
    
    // 在Fusion模式下，添加粒子爆发效果
    if (isFusionMode && particleEffectsEnabled && newChecked) {
      createParticleExplosion();
    }
  };
  
  // 创建粒子爆发
  const createParticleExplosion = () => {
    if (!toggleRef.current || !canvasRef.current) return;
    
    const rect = toggleRef.current.getBoundingClientRect();
    const centerX = rect.width * 0.75; // 按钮位置
    const centerY = rect.height / 2;
    
    // 创建粒子
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      const size = Math.random() * 2 + 1;
      const life = 0;
      const maxLife = Math.random() * 20 + 10;
      
      particlesRef.current.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size,
        opacity: Math.random() * 0.5 + 0.5,
        life,
        maxLife,
      });
    }
  };
  
  // 粒子动画
  useEffect(() => {
    if (!shouldShowParticles || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 设置画布尺寸
    const resizeCanvas = () => {
      if (toggleRef.current && canvas) {
        const rect = toggleRef.current.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // 更新粒子
    const updateParticles = () => {
      if (!ctx || !canvas) return;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // 更新和绘制粒子
      particlesRef.current = particlesRef.current.filter(p => p.life < p.maxLife);
      
      particlesRef.current.forEach(p => {
        p.life++;
        p.x += p.vx;
        p.y += p.vy;
        
        const lifeRatio = 1 - p.life / p.maxLife;
        
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
        ctx.fillStyle = glowColor || 'var(--quantum-blue)';
        ctx.globalAlpha = p.opacity * lifeRatio;
        ctx.fill();
      });
      
      // 如果开关处于悬停状态，添加新粒子
      if (isHovered && isChecked) {
        const rect = toggleRef.current?.getBoundingClientRect();
        if (rect) {
          const centerX = rect.width * 0.75; // 按钮位置
          const centerY = rect.height / 2;
          
          if (Math.random() > 0.8) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 1 + 0.5;
            const size = Math.random() * 1.5 + 0.5;
            const life = 0;
            const maxLife = Math.random() * 15 + 5;
            
            particlesRef.current.push({
              x: centerX,
              y: centerY,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size,
              opacity: Math.random() * 0.3 + 0.3,
              life,
              maxLife,
            });
          }
        }
      }
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
  }, [shouldShowParticles, isHovered, isChecked, glowColor]);
  
  // 获取开关尺寸
  const getToggleSize = (): { width: number; height: number; handleSize: number } => {
    switch (size) {
      case 'small':
        return { width: 28, height: 16, handleSize: 12 };
      case 'large':
        return { width: 52, height: 26, handleSize: 22 };
      default:
        return { width: 40, height: 20, handleSize: 16 };
    }
  };
  
  // 获取开关样式
  const getToggleStyles = (): React.CSSProperties => {
    const { width, height } = getToggleSize();
    
    return {
      position: 'relative',
      display: 'inline-block',
      width,
      height,
      borderRadius: height / 2,
      background: isChecked 
        ? isFusionMode 
          ? 'var(--gradient-blue)' 
          : 'var(--primary-color)' 
        : 'var(--bg-toggle-off)',
      transition: 'all var(--transition-medium)',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.5 : 1,
      boxShadow: isChecked && isFusionMode && !disabled 
        ? `0 0 10px ${glowColor || 'var(--quantum-blue)'}${Math.round(glowIntensity * 50)}` 
        : 'none',
      border: isChecked 
        ? 'none' 
        : '1px solid var(--border-color)',
      overflow: 'hidden',
      ...style,
    };
  };
  
  // 获取滑块样式
  const getHandleStyles = (): React.CSSProperties => {
    const { height, handleSize } = getToggleSize();
    
    return {
      position: 'absolute',
      top: (height - handleSize) / 2,
      left: isChecked ? `calc(100% - ${handleSize}px - ${(height - handleSize) / 2}px)` : `${(height - handleSize) / 2}px`,
      width: handleSize,
      height: handleSize,
      borderRadius: '50%',
      background: isFusionMode && isChecked && !disabled 
        ? 'var(--bg-white)' 
        : 'var(--bg-toggle-handle)',
      boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
      transition: 'all var(--transition-medium)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };
  };
  
  // 获取类名
  const getClassName = () => {
    const baseClass = 'quantum-toggle';
    const modeClass = isFusionMode ? 'fusion-mode' : 'minimal-mode';
    const sizeClass = `quantum-toggle-${size}`;
    const stateClass = isChecked ? 'checked' : '';
    const disabledClass = disabled ? 'disabled' : '';
    const loadingClass = loading ? 'loading' : '';
    
    return `${baseClass} ${modeClass} ${sizeClass} ${stateClass} ${disabledClass} ${loadingClass} ${className}`;
  };
  
  // 渲染加载状态
  const renderLoading = () => {
    if (!loading) return null;
    
    const { handleSize } = getToggleSize();
    const loadingSize = handleSize * 0.6;
    
    return (
      <div 
        className="quantum-toggle-loading"
        style={{
          width: loadingSize,
          height: loadingSize,
          borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: 'var(--text-primary)',
          animation: 'quantum-spin 1s linear infinite',
        }}
      />
    );
  };

  return (
    <div
      ref={toggleRef}
      className={getClassName()}
      style={getToggleStyles()}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 文本内容 */}
      {(checkedChildren || unCheckedChildren) && (
        <div 
          className="quantum-toggle-inner"
          style={{
            position: 'absolute',
            left: isChecked ? '5px' : 'auto',
            right: isChecked ? 'auto' : '5px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: size === 'small' ? '10px' : size === 'large' ? '14px' : '12px',
            color: 'white',
            lineHeight: 1,
            transition: 'all var(--transition-medium)',
          }}
        >
          {isChecked ? checkedChildren : unCheckedChildren}
        </div>
      )}
      
      {/* 滑块 */}
      <div className="quantum-toggle-handle" style={getHandleStyles()}>
        {renderLoading()}
      </div>
      
      {/* 粒子效果 */}
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
      
      {/* 发光效果 - 仅在Fusion模式下显示 */}
      {isFusionMode && isChecked && !disabled && (
        <div
          className="quantum-toggle-glow"
          style={{
            position: 'absolute',
            inset: -2,
            borderRadius: 'inherit',
            background: `linear-gradient(135deg, ${glowColor || 'var(--quantum-blue)'}, ${glowColor || 'var(--quantum-purple)'})`,
            opacity: 0.3,
            filter: 'blur(4px)',
            pointerEvents: 'none',
            zIndex: -1,
          }}
        />
      )}
    </div>
  );
};

export default QuantumToggle; 