/**
 * DeepCAD Card组件
 * 1号架构师 - 专业CAE平台卡片系统
 */

import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  
  // 卡片变体
  variant?: 'default' | 'elevated' | 'outlined' | 'filled' | 'glass' | 'premium';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  
  // 视觉效果
  hover?: boolean;           // 悬停效果
  glowing?: boolean;         // 发光边框
  animated?: boolean;        // 入场动画
  blurred?: boolean;         // 模糊背景
  gradient?: boolean;        // 渐变背景
  
  // CAE专用属性
  caeType?: 'geometry' | 'mesh' | 'material' | 'computation' | 'results' | 'monitoring';
  status?: 'idle' | 'processing' | 'completed' | 'error' | 'warning';
  progress?: number;         // 进度百分比 (0-100)
  
  // 交互属性
  clickable?: boolean;
  selectable?: boolean;
  selected?: boolean;
  collapsible?: boolean;
  collapsed?: boolean;
  
  // 事件处理
  onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
  onCollapse?: (collapsed: boolean) => void;
  onSelect?: (selected: boolean) => void;
  
  // 可访问性
  role?: string;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  tabIndex?: number;
}

// ==================== 样式配置 ====================

const getVariantStyles = (variant: CardProps['variant'] = 'default') => {
  const styles = {
    default: {
      background: designTokens.colors.background.glass,
      border: `1px solid ${designTokens.colors.neutral[800]}`,
      backdropFilter: 'blur(12px)',
      boxShadow: designTokens.shadows.md,
      hover: {
        borderColor: designTokens.colors.primary[600],
        boxShadow: designTokens.shadows.lg,
        transform: 'translateY(-2px)'
      }
    },
    
    elevated: {
      background: designTokens.colors.background.secondary,
      border: `1px solid ${designTokens.colors.neutral[700]}`,
      boxShadow: designTokens.shadows.xl,
      hover: {
        boxShadow: designTokens.shadows['2xl'],
        transform: 'translateY(-4px)'
      }
    },
    
    outlined: {
      background: 'transparent',
      border: `2px solid ${designTokens.colors.primary[500]}`,
      boxShadow: 'none',
      hover: {
        background: `${designTokens.colors.primary[500]}05`,
        borderColor: designTokens.colors.primary[400],
        boxShadow: designTokens.shadows.glow.base
      }
    },
    
    filled: {
      background: designTokens.colors.background.tertiary,
      border: `1px solid ${designTokens.colors.neutral[600]}`,
      boxShadow: designTokens.shadows.inner,
      hover: {
        background: designTokens.colors.background.surface,
        borderColor: designTokens.colors.neutral[500]
      }
    },
    
    glass: {
      background: `${designTokens.colors.background.glass}`,
      border: `1px solid ${designTokens.colors.neutral[800]}`,
      backdropFilter: 'blur(20px)',
      boxShadow: `${designTokens.shadows.lg}, inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      hover: {
        background: `${designTokens.colors.background.glass}80`,
        borderColor: designTokens.colors.primary[700],
        boxShadow: `${designTokens.shadows.xl}, inset 0 1px 0 rgba(255, 255, 255, 0.2)`
      }
    },
    
    premium: {
      background: `linear-gradient(135deg, ${designTokens.colors.background.glass}, ${designTokens.colors.background.tertiary})`,
      border: `1px solid transparent`,
      backgroundClip: 'padding-box',
      backdropFilter: 'blur(20px)',
      boxShadow: `${designTokens.shadows.xl}, 0 0 0 1px ${designTokens.colors.primary[500]}40`,
      hover: {
        boxShadow: `${designTokens.shadows['2xl']}, 0 0 0 1px ${designTokens.colors.primary[400]}80, ${designTokens.shadows.colorGlow.primary}`,
        transform: 'translateY(-2px) scale(1.02)'
      }
    }
  };
  
  return styles[variant];
};

const getSizeStyles = (size: CardProps['size'] = 'md') => {
  const styles = {
    xs: {
      padding: designTokens.spacing[3],
      borderRadius: designTokens.borderRadius.md,
      minHeight: '80px'
    },
    sm: {
      padding: designTokens.spacing[4],
      borderRadius: designTokens.borderRadius.lg,
      minHeight: '120px'
    },
    md: {
      padding: designTokens.spacing[6],
      borderRadius: designTokens.borderRadius.xl,
      minHeight: '160px'
    },
    lg: {
      padding: designTokens.spacing[8],
      borderRadius: designTokens.borderRadius['2xl'],
      minHeight: '200px'
    },
    xl: {
      padding: designTokens.spacing[10],
      borderRadius: designTokens.borderRadius['3xl'],
      minHeight: '280px'
    }
  };
  
  return styles[size];
};

const getCAEStyles = (caeType: CardProps['caeType'], status?: CardProps['status']) => {
  if (!caeType) return {};
  
  const caeColors = {
    geometry: designTokens.colors.semantic.geometry,
    mesh: designTokens.colors.semantic.mesh,
    material: designTokens.colors.semantic.material,
    computation: designTokens.colors.semantic.computing,
    results: designTokens.colors.semantic.safety,
    monitoring: designTokens.colors.secondary[500]
  };
  
  const statusColors = {
    idle: designTokens.colors.neutral[500],
    processing: designTokens.colors.semantic.warning,
    completed: designTokens.colors.semantic.success,
    error: designTokens.colors.semantic.error,
    warning: designTokens.colors.semantic.warning
  };
  
  const primaryColor = caeColors[caeType];
  const statusColor = status ? statusColors[status] : primaryColor;
  
  return {
    borderLeft: `4px solid ${primaryColor}`,
    position: 'relative',
    '&::before': {
      content: '""',
      position: 'absolute',
      left: 0,
      top: 0,
      bottom: 0,
      width: '4px',
      background: `linear-gradient(to bottom, ${primaryColor}, ${primaryColor}60)`,
      filter: `drop-shadow(0 0 4px ${primaryColor}40)`
    },
    '&::after': status ? {
      content: '""',
      position: 'absolute',
      top: '12px',
      right: '12px',
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      background: statusColor,
      filter: `drop-shadow(0 0 4px ${statusColor})`
    } : {}
  };
};

// ==================== 进度条组件 ====================

const ProgressBar: React.FC<{ progress: number; caeType?: CardProps['caeType'] }> = ({ 
  progress, 
  caeType 
}) => {
  const color = caeType ? {
    geometry: designTokens.colors.semantic.geometry,
    mesh: designTokens.colors.semantic.mesh,
    material: designTokens.colors.semantic.material,
    computation: designTokens.colors.semantic.computing,
    results: designTokens.colors.semantic.safety,
    monitoring: designTokens.colors.secondary[500]
  }[caeType] : designTokens.colors.primary[500];

  return (
    <div style={{
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: '3px',
      background: `${color}20`,
      borderRadius: '0 0 inherit inherit'
    }}>
      <motion.div
        style={{
          height: '100%',
          background: `linear-gradient(90deg, ${color}, ${color}80)`,
          borderRadius: 'inherit',
          filter: `drop-shadow(0 0 4px ${color}40)`
        }}
        initial={{ width: '0%' }}
        animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
};

// ==================== 状态指示器组件 ====================

const StatusIndicator: React.FC<{ 
  status: CardProps['status']; 
  animated?: boolean;
}> = ({ status, animated = true }) => {
  if (!status || status === 'idle') return null;

  const statusConfig = {
    processing: {
      color: designTokens.colors.semantic.warning,
      icon: '⚡',
      pulse: true
    },
    completed: {
      color: designTokens.colors.semantic.success,
      icon: '✓',
      pulse: false
    },
    error: {
      color: designTokens.colors.semantic.error,
      icon: '✗',
      pulse: true
    },
    warning: {
      color: designTokens.colors.semantic.warning,
      icon: '⚠',
      pulse: true
    }
  };

  const config = statusConfig[status];
  if (!config) return null;

  return (
    <motion.div
      style={{
        position: 'absolute',
        top: designTokens.spacing[3],
        right: designTokens.spacing[3],
        display: 'flex',
        alignItems: 'center',
        gap: designTokens.spacing[1],
        padding: `${designTokens.spacing[1]} ${designTokens.spacing[2]}`,
        background: `${config.color}20`,
        borderRadius: designTokens.borderRadius.md,
        border: `1px solid ${config.color}40`,
        fontSize: designTokens.typography.fontSize.xs,
        color: config.color,
        fontWeight: designTokens.typography.fontWeight.medium
      }}
      animate={animated && config.pulse ? {
        scale: [1, 1.05, 1],
        opacity: [0.8, 1, 0.8]
      } : {}}
      transition={config.pulse ? {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      <span>{config.icon}</span>
      <span style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {status}
      </span>
    </motion.div>
  );
};

// ==================== 主卡片组件 ====================

export const Card = forwardRef<HTMLDivElement, CardProps>(({
  children,
  className = '',
  style,
  variant = 'default',
  size = 'md',
  hover = true,
  glowing = false,
  animated = true,
  blurred = false,
  gradient = false,
  caeType,
  status,
  progress,
  clickable = false,
  selectable = false,
  selected = false,
  collapsible = false,
  collapsed = false,
  onClick,
  onCollapse,
  onSelect,
  role,
  tabIndex,
  ...htmlProps
}, ref) => {
  // 状态管理
  const [isHovered, setIsHovered] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(collapsed);
  const [isSelected, setIsSelected] = useState(selected);

  // 样式计算
  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);
  const caeStyles = getCAEStyles(caeType, status);

  // 事件处理
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (clickable) {
      onClick?.(event);
    }
    
    if (selectable) {
      const newSelected = !isSelected;
      setIsSelected(newSelected);
      onSelect?.(newSelected);
    }
  };

  const handleCollapse = () => {
    if (collapsible) {
      const newCollapsed = !isCollapsed;
      setIsCollapsed(newCollapsed);
      onCollapse?.(newCollapsed);
    }
  };

  // 动画变体
  const cardVariants = {
    initial: animated ? {
      opacity: 0,
      y: 20,
      scale: 0.95
    } : {},
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut"
      }
    },
    hover: hover ? variantStyles.hover : {},
    selected: selectable ? {
      ...variantStyles.hover,
      borderColor: designTokens.colors.primary[400],
      boxShadow: `${designTokens.shadows.xl}, 0 0 0 2px ${designTokens.colors.primary[400]}40`
    } : {}
  };

  const glowEffect = glowing ? {
    filter: `drop-shadow(0 0 12px ${designTokens.colors.primary[500]}40)`,
    animation: 'cardGlow 2s ease-in-out infinite'
  } : {};

  const gradientBackground = gradient ? {
    background: `linear-gradient(135deg, ${variantStyles.background}, ${designTokens.colors.background.tertiary})`
  } : {};

  return (
    <>
      <motion.div
        ref={ref}
        className={`deepcad-card ${className}`}
        role={role || (clickable ? 'button' : 'article')}
        tabIndex={clickable ? (tabIndex || 0) : tabIndex}
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          cursor: clickable ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          overflow: 'hidden',
          
          // 基础样式
          ...sizeStyles,
          background: variantStyles.background,
          border: variantStyles.border,
          boxShadow: variantStyles.boxShadow,
          backdropFilter: variantStyles.backdropFilter,
          
          // 特殊效果
          ...glowEffect,
          ...gradientBackground,
          ...(blurred && { backdropFilter: 'blur(20px)' }),
          
          // CAE样式
          ...caeStyles,
          
          // 选中状态
          ...(isSelected && selectable && {
            borderColor: designTokens.colors.primary[400],
            boxShadow: `${designTokens.shadows.xl}, 0 0 0 2px ${designTokens.colors.primary[400]}40`
          }),
          
          ...style
        }}
        variants={cardVariants}
        initial="initial"
        animate="animate"
        whileHover={hover && !clickable ? "hover" : undefined}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleClick}
        {...htmlProps}
      >
        {/* 状态指示器 */}
        <StatusIndicator status={status} animated={animated} />

        {/* 折叠控制按钮 */}
        {collapsible && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCollapse();
            }}
            style={{
              position: 'absolute',
              top: designTokens.spacing[3],
              left: designTokens.spacing[3],
              background: 'transparent',
              border: 'none',
              color: designTokens.colors.neutral[400],
              cursor: 'pointer',
              fontSize: '16px',
              padding: designTokens.spacing[1],
              borderRadius: designTokens.borderRadius.sm,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = designTokens.colors.background.tertiary;
              e.currentTarget.style.color = designTokens.colors.neutral[200];
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = designTokens.colors.neutral[400];
            }}
          >
            <motion.span
              animate={{ rotate: isCollapsed ? -90 : 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            >
              ▼
            </motion.span>
          </button>
        )}

        {/* 卡片内容 */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                ...(collapsible && { marginTop: designTokens.spacing[6] })
              }}
              initial={collapsible ? { opacity: 0, height: 0 } : {}}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            >
              {children}
            </motion.div>
          )}
        </AnimatePresence>

        {/* 进度条 */}
        {typeof progress === 'number' && progress >= 0 && (
          <ProgressBar progress={progress} caeType={caeType} />
        )}

        {/* 交互波纹效果 */}
        {clickable && isHovered && (
          <motion.div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(circle at center, ${designTokens.colors.primary[500]}10 0%, transparent 70%)`,
              pointerEvents: 'none',
              borderRadius: 'inherit'
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </motion.div>

      {/* 全局样式注入 */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes cardGlow {
          0%, 100% { 
            filter: drop-shadow(0 0 8px ${designTokens.colors.primary[500]}20);
          }
          50% { 
            filter: drop-shadow(0 0 16px ${designTokens.colors.primary[500]}40);
          }
        }
        
        .deepcad-card:focus-visible {
          outline: 2px solid ${designTokens.colors.primary[500]};
          outline-offset: 2px;
        }
      `}} />
    </>
  );
});

Card.displayName = 'Card';

// ==================== 预设卡片组件 ====================

export const DefaultCard = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>((props, ref) => (
  <Card ref={ref} variant="default" {...props} />
));

export const ElevatedCard = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>((props, ref) => (
  <Card ref={ref} variant="elevated" {...props} />
));

export const GlassCard = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>((props, ref) => (
  <Card ref={ref} variant="glass" {...props} />
));

export const PremiumCard = forwardRef<HTMLDivElement, Omit<CardProps, 'variant'>>((props, ref) => (
  <Card ref={ref} variant="premium" {...props} />
));

// CAE专用卡片
export const GeometryCard = forwardRef<HTMLDivElement, Omit<CardProps, 'caeType'>>((props, ref) => (
  <Card ref={ref} caeType="geometry" {...props} />
));

export const MeshCard = forwardRef<HTMLDivElement, Omit<CardProps, 'caeType'>>((props, ref) => (
  <Card ref={ref} caeType="mesh" {...props} />
));

export const ComputationCard = forwardRef<HTMLDivElement, Omit<CardProps, 'caeType'>>((props, ref) => (
  <Card ref={ref} caeType="computation" {...props} />
));

export const ResultsCard = forwardRef<HTMLDivElement, Omit<CardProps, 'caeType'>>((props, ref) => (
  <Card ref={ref} caeType="results" {...props} />
));

// 显示名称
DefaultCard.displayName = 'DefaultCard';
ElevatedCard.displayName = 'ElevatedCard';
GlassCard.displayName = 'GlassCard';
PremiumCard.displayName = 'PremiumCard';
GeometryCard.displayName = 'GeometryCard';
MeshCard.displayName = 'MeshCard';
ComputationCard.displayName = 'ComputationCard';
ResultsCard.displayName = 'ResultsCard';

export default Card;