/**
 * DeepCAD 科技未来感按钮组件
 * 1号架构师 - 基础原子组件
 */

import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface ButtonProps {
  // 基础属性
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  
  // 按钮变体
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  // 状态属性
  loading?: boolean;
  disabled?: boolean;
  active?: boolean;
  
  // 视觉效果
  glow?: boolean;          // 辉光效果
  quantum?: boolean;       // 量子闪烁效果  
  rounded?: boolean;       // 圆角样式
  fluid?: boolean;         // 流体宽度
  
  // CAE专用属性
  caeType?: 'geometry' | 'mesh' | 'material' | 'computation' | 'results';
  precision?: number;      // 数值精度显示
  unit?: string;          // 单位标识
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseEnter?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  onBlur?: (event: React.FocusEvent<HTMLButtonElement>) => void;
  
  // HTML属性
  type?: 'button' | 'submit' | 'reset';
  form?: string;
  name?: string;
  value?: string;
  tabIndex?: number;
  'aria-label'?: string;
  'aria-describedby'?: string;
  'data-testid'?: string;
}

// ==================== 样式配置 ====================

const getVariantStyles = (variant: ButtonProps['variant'] = 'primary') => {
  const styles = {
    primary: {
      background: `linear-gradient(135deg, ${designTokens.colors.primary[600]}, ${designTokens.colors.primary[500]})`,
      color: designTokens.colors.neutral[0],
      border: `1px solid ${designTokens.colors.primary[500]}`,
      shadow: designTokens.shadows.glow.sm,
      hover: {
        background: `linear-gradient(135deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.primary[400]})`,
        shadow: designTokens.shadows.glow.base,
        transform: 'translateY(-1px)'
      }
    },
    secondary: {
      background: `linear-gradient(135deg, ${designTokens.colors.neutral[800]}, ${designTokens.colors.neutral[700]})`,
      color: designTokens.colors.neutral[200],
      border: `1px solid ${designTokens.colors.neutral[600]}`,
      shadow: designTokens.shadows.sm,
      hover: {
        background: `linear-gradient(135deg, ${designTokens.colors.neutral[700]}, ${designTokens.colors.neutral[600]})`,
        color: designTokens.colors.neutral[100],
        shadow: designTokens.shadows.base
      }
    },
    outline: {
      background: 'transparent',
      color: designTokens.colors.primary[400],
      border: `1px solid ${designTokens.colors.primary[500]}`,
      shadow: 'none',
      hover: {
        background: `${designTokens.colors.primary[500]}15`,
        color: designTokens.colors.primary[300],
        shadow: designTokens.shadows.glow.sm
      }
    },
    ghost: {
      background: 'transparent',
      color: designTokens.colors.neutral[300],
      border: '1px solid transparent',
      shadow: 'none',
      hover: {
        background: `${designTokens.colors.neutral[800]}80`,
        color: designTokens.colors.neutral[100]
      }
    },
    danger: {
      background: `linear-gradient(135deg, ${designTokens.colors.semantic.error}, #dc2626)`,
      color: designTokens.colors.neutral[0],
      border: `1px solid ${designTokens.colors.semantic.error}`,
      shadow: designTokens.shadows.colorGlow.error,
      hover: {
        background: `linear-gradient(135deg, #dc2626, #b91c1c)`,
        shadow: `0 0 20px ${designTokens.colors.semantic.error}60`
      }
    },
    success: {
      background: `linear-gradient(135deg, ${designTokens.colors.semantic.success}, #059669)`,
      color: designTokens.colors.neutral[0],
      border: `1px solid ${designTokens.colors.semantic.success}`,
      shadow: designTokens.shadows.colorGlow.success,
      hover: {
        background: `linear-gradient(135deg, #059669, #047857)`,
        shadow: `0 0 20px ${designTokens.colors.semantic.success}60`
      }
    }
  };
  
  return styles[variant];
};

const getSizeStyles = (size: ButtonProps['size'] = 'md') => {
  const styles = {
    xs: {
      padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
      fontSize: designTokens.typography.fontSize.xs,
      height: '24px',
      minWidth: '60px'
    },
    sm: {
      padding: `${designTokens.spacing[1.5]} ${designTokens.spacing[3]}`,
      fontSize: designTokens.typography.fontSize.sm,
      height: '32px',
      minWidth: '80px'
    },
    md: {
      padding: `${designTokens.spacing[2]} ${designTokens.spacing[4]}`,
      fontSize: designTokens.typography.fontSize.base,
      height: '40px',
      minWidth: '100px'
    },
    lg: {
      padding: `${designTokens.spacing[2.5]} ${designTokens.spacing[6]}`,
      fontSize: designTokens.typography.fontSize.lg,
      height: '48px',
      minWidth: '120px'
    },
    xl: {
      padding: `${designTokens.spacing[3]} ${designTokens.spacing[8]}`,
      fontSize: designTokens.typography.fontSize.xl,
      height: '56px',
      minWidth: '140px'
    }
  };
  
  return styles[size];
};

const getCAEStyles = (caeType: ButtonProps['caeType']) => {
  if (!caeType) return {};
  
  const caeColors = {
    geometry: designTokens.colors.semantic.geometry,
    mesh: designTokens.colors.semantic.mesh,
    material: designTokens.colors.semantic.material,
    computation: designTokens.colors.semantic.computing,
    results: designTokens.colors.semantic.safety
  };
  
  const color = caeColors[caeType];
  return {
    borderLeft: `3px solid ${color}`,
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '3px',
      background: `linear-gradient(to bottom, ${color}, ${color}80)`,
      filter: `drop-shadow(0 0 4px ${color}60)`
    }
  };
};

// ==================== 组件实现 ====================

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  className = '',
  style,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  active = false,
  glow = false,
  quantum = false,
  rounded = false,
  fluid = false,
  caeType,
  precision,
  unit,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  type = 'button',
  ...htmlProps
}, ref) => {
  // 状态管理
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  
  // 样式计算
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const caeStyles = getCAEStyles(caeType);
  
  // 组合样式
  const buttonStyles: React.CSSProperties = {
    // 基础样式
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: designTokens.spacing[2],
    fontFamily: designTokens.typography.fontFamily.primary.join(', '),
    fontWeight: designTokens.typography.fontWeight.medium,
    lineHeight: designTokens.typography.lineHeight.tight,
    textAlign: 'center',
    textDecoration: 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `all ${designTokens.animation.duration[200]} ${designTokens.animation.timing.smooth}`,
    
    // 尺寸样式
    ...sizeStyles,
    
    // 变体样式
    background: variantStyles.background,
    color: variantStyles.color,
    border: variantStyles.border,
    boxShadow: variantStyles.shadow,
    
    // 圆角处理
    borderRadius: rounded ? designTokens.borderRadius.full : designTokens.borderRadius.lg,
    
    // 流体宽度
    width: fluid ? '100%' : 'auto',
    
    // 禁用状态
    ...(disabled && {
      opacity: 0.5,
      cursor: 'not-allowed',
      filter: 'grayscale(50%)'
    }),
    
    // 激活状态
    ...(active && {
      transform: 'translateY(1px)',
      boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
    }),
    
    // 辉光效果
    ...(glow && !disabled && {
      filter: 'drop-shadow(0 0 8px currentColor)'
    }),
    
    // CAE专用样式
    ...caeStyles,
    
    // 自定义样式
    ...style
  };

  // 悬停样式
  const hoverStyles: React.CSSProperties = {
    ...variantStyles.hover,
    ...(glow && {
      filter: 'drop-shadow(0 0 12px currentColor)'
    })
  };

  // 事件处理
  const handleMouseEnter = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setIsHovered(true);
      onMouseEnter?.(event);
    }
  };

  const handleMouseLeave = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled) {
      setIsHovered(false);
      setIsPressed(false);
      onMouseLeave?.(event);
    }
  };

  const handleMouseDown = () => {
    if (!disabled) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    if (!disabled) {
      setIsPressed(false);
    }
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      onClick?.(event);
    }
  };

  // 动画变体
  const buttonVariants = {
    initial: { scale: 1 },
    hover: { 
      scale: 1.02,
      transition: { duration: 0.15, ease: 'easeOut' }
    },
    tap: { 
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeInOut' }
    }
  };

  const quantumVariants = {
    animate: quantum ? {
      boxShadow: [
        `0 0 5px ${designTokens.colors.primary[500]}40`,
        `0 0 20px ${designTokens.colors.primary[400]}60`,
        `0 0 5px ${designTokens.colors.primary[500]}40`
      ],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    } : {}
  };

  return (
    <motion.button
      ref={ref}
      type={type}
      className={`deepcad-button ${className}`}
      style={{
        ...buttonStyles,
        ...(isHovered && !disabled && hoverStyles),
        ...(isPressed && !disabled && { transform: 'translateY(1px)' })
      }}
      variants={buttonVariants}
      animate={quantumVariants.animate}
      initial="initial"
      whileHover={!disabled ? "hover" : undefined}
      whileTap={!disabled ? "tap" : undefined}
      disabled={disabled}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onFocus={onFocus}
      onBlur={onBlur}
      {...htmlProps}
    >
      {/* 加载状态 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <motion.div
              style={{
                width: '16px',
                height: '16px',
                border: `2px solid ${variantStyles.color}40`,
                borderTop: `2px solid ${variantStyles.color}`,
                borderRadius: '50%'
              }}
              animate={{ rotate: 360 }}
              transition={{
                duration: 1,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 按钮内容 */}
      <motion.span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: designTokens.spacing[2],
          opacity: loading ? 0.3 : 1,
          transition: `opacity ${designTokens.animation.duration[200]} ${designTokens.animation.timing.smooth}`
        }}
      >
        {children}
        
        {/* 单位显示 */}
        {unit && (
          <span style={{
            fontSize: '0.8em',
            opacity: 0.8,
            fontWeight: designTokens.typography.fontWeight.normal
          }}>
            {unit}
          </span>
        )}
      </motion.span>

      {/* 量子粒子效果 */}
      {quantum && !disabled && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            background: `linear-gradient(45deg, ${designTokens.colors.primary[500]}20, transparent, ${designTokens.colors.accent[500]}20)`,
            backgroundSize: '200% 200%',
            animation: 'quantumShimmer 3s ease-in-out infinite',
            pointerEvents: 'none'
          }}
        />
      )}

      {/* CAE类型指示器 */}
      {caeType && (
        <div
          style={{
            position: 'absolute',
            right: '4px',
            top: '4px',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: designTokens.colors.semantic[caeType] || designTokens.colors.primary[500],
            filter: `drop-shadow(0 0 2px ${designTokens.colors.semantic[caeType] || designTokens.colors.primary[500]})`
          }}
        />
      )}

      {/* 全局样式注入 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes quantumShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .deepcad-button:focus-visible {
          outline: 2px solid ${designTokens.colors.primary[500]};
          outline-offset: 2px;
        }
        
        .deepcad-button:disabled {
          pointer-events: none;
        }
      `}} />
    </motion.button>
  );
});

Button.displayName = 'Button';

// ==================== 预设按钮组件 ====================

export const PrimaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="primary" {...props} />
));

export const SecondaryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="secondary" {...props} />
));

export const OutlineButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="outline" {...props} />
));

export const GhostButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="ghost" {...props} />
));

export const DangerButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="danger" {...props} />
));

export const SuccessButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'variant'>>((props, ref) => (
  <Button ref={ref} variant="success" {...props} />
));

// CAE专用按钮
export const GeometryButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'caeType'>>((props, ref) => (
  <Button ref={ref} caeType="geometry" {...props} />
));

export const MeshButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'caeType'>>((props, ref) => (
  <Button ref={ref} caeType="mesh" {...props} />
));

export const ComputationButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'caeType'>>((props, ref) => (
  <Button ref={ref} caeType="computation" {...props} />
));

export const ResultsButton = forwardRef<HTMLButtonElement, Omit<ButtonProps, 'caeType'>>((props, ref) => (
  <Button ref={ref} caeType="results" {...props} />
));

PrimaryButton.displayName = 'PrimaryButton';
SecondaryButton.displayName = 'SecondaryButton';
OutlineButton.displayName = 'OutlineButton';
GhostButton.displayName = 'GhostButton';
DangerButton.displayName = 'DangerButton';
SuccessButton.displayName = 'SuccessButton';
GeometryButton.displayName = 'GeometryButton';
MeshButton.displayName = 'MeshButton';
ComputationButton.displayName = 'ComputationButton';
ResultsButton.displayName = 'ResultsButton';

export default Button;