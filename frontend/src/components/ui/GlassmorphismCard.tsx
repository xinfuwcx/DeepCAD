/**
 * 玻璃态材质卡片组件
 * 1号架构师 - 现代科技感UI组件
 */

import React, { forwardRef, useState, useEffect, useRef } from 'react';
import { Card, CardProps } from 'antd';
import { useDeepCADTheme } from './DeepCADTheme';

interface GlassmorphismCardProps extends Omit<CardProps, 'variant'> {
  blur?: number;
  opacity?: number;
  borderRadius?: number;
  glowEffect?: boolean;
  hoverEffect?: boolean;
  interactive?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'neutral' | 'quantum' | 'pro' | 'ultra';
  intensity?: 'subtle' | 'medium' | 'strong';
  glowColor?: string;
  children?: React.ReactNode;
}

const GlassmorphismCard = forwardRef<HTMLDivElement, GlassmorphismCardProps>(
  ({
    blur = 20,
    opacity = 0.1,
    borderRadius = 12,
    glowEffect = true,
    hoverEffect = true,
    interactive = true,
    variant = 'primary',
    intensity = 'medium',
    glowColor,
    className,
    style,
    children,
    ...cardProps
  }, ref) => {
    const [isHovered, setIsHovered] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const cardRef = useRef<HTMLDivElement>(null);
    const { themeConfig } = useDeepCADTheme();

    // 变体颜色配置
    const variantColors = {
      primary: themeConfig?.primaryColor || '#00d9ff',
      secondary: themeConfig?.secondaryColor || '#0066cc',
      accent: themeConfig?.accentColor || '#ff6b35',
      neutral: '#ffffff',
      quantum: '#9d4edd',
      pro: '#8b5cf6',
      ultra: '#f59e0b'
    };

    // 强度配置
    const intensityConfig = {
      subtle: { opacity: 0.05, blur: 15, glow: 0.3 },
      medium: { opacity: 0.1, blur: 20, glow: 0.5 },
      strong: { opacity: 0.2, blur: 30, glow: 0.8 }
    };

    const config = intensityConfig[intensity];
    const baseColor = glowColor || variantColors[variant];

    // 鼠标移动处理
    const handleMouseMove = (event: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || !cardRef.current) return;

      const rect = cardRef.current.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 100;
      const y = ((event.clientY - rect.top) / rect.height) * 100;
      
      setMousePosition({ x, y });
    };

    // 动态样式计算
    const getCardStyle = (): React.CSSProperties => {
      const baseStyle: React.CSSProperties = {
        position: 'relative',
        background: `rgba(${hexToRgb(baseColor)}, ${config.opacity})`,
        backdropFilter: `blur(${config.blur}px)`,
        WebkitBackdropFilter: `blur(${config.blur}px)`,
        border: `1px solid rgba(${hexToRgb(baseColor)}, 0.2)`,
        borderRadius: `${borderRadius}px`,
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: glowEffect ? 
          `0 8px 32px rgba(${hexToRgb(baseColor)}, ${config.glow * 0.3}),
           inset 0 1px 0 rgba(255, 255, 255, 0.1)` : 
          'none'
      };

      // 悬停效果
      if (hoverEffect && isHovered) {
        baseStyle.background = `rgba(${hexToRgb(baseColor)}, ${config.opacity * 1.5})`;
        baseStyle.borderColor = `rgba(${hexToRgb(baseColor)}, 0.4)`;
        baseStyle.transform = 'translateY(-2px)';
        
        if (glowEffect) {
          baseStyle.boxShadow = 
            `0 12px 40px rgba(${hexToRgb(baseColor)}, ${config.glow * 0.5}),
             inset 0 1px 0 rgba(255, 255, 255, 0.2)`;
        }
      }

      // 交互式光标跟踪效果
      if (interactive && isHovered) {
        const gradientX = mousePosition.x;
        const gradientY = mousePosition.y;
        
        baseStyle.background = `
          radial-gradient(
            circle at ${gradientX}% ${gradientY}%, 
            rgba(${hexToRgb(baseColor)}, ${config.opacity * 2}) 0%,
            rgba(${hexToRgb(baseColor)}, ${config.opacity}) 50%,
            rgba(${hexToRgb(baseColor)}, ${config.opacity * 0.5}) 100%
          )
        `;
      }

      return { ...baseStyle, ...style };
    };

    // 获取内容容器样式
    const getContentStyle = (): React.CSSProperties => {
      return {
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100%'
      };
    };

    // 获取装饰效果样式
    const getDecorationStyle = (): React.CSSProperties => {
      return {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        pointerEvents: 'none',
        background: `
          linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%,
            rgba(${hexToRgb(baseColor)}, 0.05) 100%
          )
        `,
        opacity: isHovered ? 1 : 0.7,
        transition: 'opacity 0.3s ease'
      };
    };

    // Hex颜色转RGB
    function hexToRgb(hex: string): string {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return '255, 255, 255';
      
      return [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
      ].join(', ');
    }

    // 设置组合ref
    useEffect(() => {
      if (ref && typeof ref === 'object') {
        ref.current = cardRef.current;
      }
    }, [ref]);

    return (
      <div
        ref={cardRef}
        className={`glassmorphism-card ${className || ''}`}
        style={getCardStyle()}
        onMouseEnter={() => hoverEffect && setIsHovered(true)}
        onMouseLeave={() => hoverEffect && setIsHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* 装饰层 */}
        <div style={getDecorationStyle()} />
        
        {/* 边缘高光效果 */}
        {glowEffect && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '1px',
              background: `linear-gradient(90deg, 
                transparent 0%, 
                rgba(255, 255, 255, 0.4) 50%, 
                transparent 100%)`,
              opacity: isHovered ? 1 : 0.6,
              transition: 'opacity 0.3s ease'
            }}
          />
        )}

        {/* 量子效果粒子 */}
        {variant === 'quantum' && isHovered && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              width: '200%',
              height: '200%',
              transform: 'translate(-50%, -50%)',
              background: `
                radial-gradient(
                  circle at 20% 20%, rgba(157, 78, 221, 0.1) 0%, transparent 50%
                ),
                radial-gradient(
                  circle at 80% 80%, rgba(157, 78, 221, 0.1) 0%, transparent 50%
                ),
                radial-gradient(
                  circle at 40% 70%, rgba(157, 78, 221, 0.05) 0%, transparent 30%
                )
              `,
              animation: 'quantumPulse 3s ease-in-out infinite',
              pointerEvents: 'none'
            }}
          />
        )}

        {/* 内容区域 */}
        <div style={getContentStyle()}>
          {children || (
            <Card 
              {...cardProps}
              style={{ 
                background: 'transparent', 
                border: 'none',
                boxShadow: 'none'
              }}
            />
          )}
        </div>

        {/* CSS动画定义 */}
        <style dangerouslySetInnerHTML={{__html: `
          @keyframes quantumPulse {
            0%, 100% {
              opacity: 0.3;
              transform: translate(-50%, -50%) scale(0.9);
            }
            50% {
              opacity: 0.7;
              transform: translate(-50%, -50%) scale(1.1);
            }
          }
          
          .glassmorphism-card {
            position: relative;
          }
          
          .glassmorphism-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: inherit;
            filter: blur(${config.blur * 0.5}px);
            opacity: 0.5;
            z-index: -1;
          }
        `}} />
      </div>
    );
  }
);

GlassmorphismCard.displayName = 'GlassmorphismCard';

export default GlassmorphismCard;