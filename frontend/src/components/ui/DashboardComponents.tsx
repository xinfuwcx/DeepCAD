/**
 * 大屏级UI组件库
 * 专为DeepCAD深基坑工程设计的专业大屏组件
 * 符合工业级数据可视化标准
 */

import React, { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 大屏设计令牌
export const dashboardTokens = {
  colors: {
    bg: {
      primary: '#0a0a0f',
      secondary: '#1a1a2e',
      card: 'rgba(255,255,255,0.05)',
      glass: 'rgba(255,255,255,0.08)',
    },
    accent: {
      primary: '#00d9ff',
      secondary: '#7c3aed',
      success: '#10b981',
      warning: '#f59e0b',
      error: '#ef4444',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
      muted: '#64748b',
    },
    border: {
      primary: 'rgba(0,217,255,0.3)',
      secondary: 'rgba(255,255,255,0.1)',
      glow: 'rgba(0,217,255,0.5)',
    }
  },
  fonts: {
    sizes: {
      hero: '32px',      // 大屏标题
      large: '24px',     // 主要信息
      medium: '18px',    // 次要信息
      small: '16px',     // 辅助信息
      tiny: '14px',      // 最小信息
    },
    weights: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    }
  },
  spacing: {
    xs: '8px',
    sm: '16px',
    md: '24px',
    lg: '32px',
    xl: '48px',
    xxl: '64px',
  },
  borderRadius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
  },
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
    glow: '0 0 20px rgba(0, 217, 255, 0.3)',
    strong: '0 12px 48px rgba(0, 0, 0, 0.5)',
  }
};

// 动画预设
export const dashboardAnimations = {
  cardEnter: {
    initial: { opacity: 0, y: 60, scale: 0.9 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -60, scale: 0.9 },
    transition: { duration: 0.6, ease: "easeOut" }
  },
  slideInLeft: {
    initial: { opacity: 0, x: -100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -100 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  slideInRight: {
    initial: { opacity: 0, x: 100 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 100 },
    transition: { duration: 0.4, ease: "easeOut" }
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3 }
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3, ease: "easeOut" }
  },
  dataUpdate: {
    animate: { 
      scale: [1, 1.05, 1],
      opacity: [0.8, 1, 1]
    },
    transition: { duration: 0.4 }
  },
  errorShake: {
    animate: { x: [-5, 5, -5, 5, 0] },
    transition: { duration: 0.4 }
  },
  pulse: {
    animate: {
      scale: [1, 1.02, 1],
      opacity: [0.8, 1, 0.8]
    },
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut"
    }
  }
};

// 大屏卡片组件
interface DashboardCardProps {
  title?: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  
  // 视觉效果
  glassEffect?: boolean;
  glowEffect?: boolean;
  sciFiBorder?: boolean;
  
  // 布局控制
  padding?: 'sm' | 'md' | 'lg' | 'xl';
  height?: string | number;
  fullHeight?: boolean;
  
  // 动画效果
  animation?: keyof typeof dashboardAnimations;
  delay?: number;
  
  // 交互功能
  onClick?: () => void;
  onDoubleClick?: () => void;
  hoverable?: boolean;
  
  // 状态指示
  status?: 'normal' | 'success' | 'warning' | 'error' | 'loading';
  realTimeUpdate?: boolean;
}

export const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  subtitle,
  children,
  className = '',
  style = {},
  glassEffect = true,
  glowEffect = false,
  sciFiBorder = false,
  padding = 'md',
  height,
  fullHeight = false,
  animation = 'cardEnter',
  delay = 0,
  onClick,
  onDoubleClick,
  hoverable = true,
  status = 'normal',
  realTimeUpdate = false
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [updateTrigger, setUpdateTrigger] = useState(0);

  // 实时更新效果
  useEffect(() => {
    if (realTimeUpdate) {
      const interval = setInterval(() => {
        setUpdateTrigger(prev => prev + 1);
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [realTimeUpdate]);

  const paddingMap = {
    sm: dashboardTokens.spacing.sm,
    md: dashboardTokens.spacing.md,
    lg: dashboardTokens.spacing.lg,
    xl: dashboardTokens.spacing.xl,
  };

  const statusColors = {
    normal: dashboardTokens.colors.accent.primary,
    success: dashboardTokens.colors.accent.success,
    warning: dashboardTokens.colors.accent.warning,
    error: dashboardTokens.colors.accent.error,
    loading: dashboardTokens.colors.accent.secondary,
  };

  const cardStyle: React.CSSProperties = {
    background: glassEffect 
      ? `linear-gradient(135deg, ${dashboardTokens.colors.bg.glass}, ${dashboardTokens.colors.bg.card})`
      : dashboardTokens.colors.bg.secondary,
    backdropFilter: glassEffect ? 'blur(20px)' : 'none',
    border: sciFiBorder 
      ? `2px solid ${statusColors[status]}`
      : `1px solid ${dashboardTokens.colors.border.secondary}`,
    borderRadius: dashboardTokens.borderRadius.lg,
    boxShadow: glowEffect 
      ? `${dashboardTokens.shadows.glass}, 0 0 20px ${statusColors[status]}40`
      : dashboardTokens.shadows.glass,
    padding: paddingMap[padding],
    height: fullHeight ? '100%' : height,
    cursor: onClick ? 'pointer' : 'default',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.3s ease',
    transform: isHovered && hoverable ? 'translateY(-4px)' : 'translateY(0)',
    ...style
  };

  return (
    <motion.div
      className={`dashboard-card ${className}`}
      style={cardStyle}
      {...dashboardAnimations[animation]}
      transition={{
        ...dashboardAnimations[animation].transition,
        delay
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      animate={realTimeUpdate && updateTrigger > 0 ? dashboardAnimations.dataUpdate.animate : dashboardAnimations[animation].animate}
    >
      {/* 科幻边框角落装饰 */}
      {sciFiBorder && (
        <>
          <div style={{
            position: 'absolute',
            top: -2,
            left: -2,
            width: 20,
            height: 20,
            borderTop: `2px solid ${statusColors[status]}`,
            borderLeft: `2px solid ${statusColors[status]}`,
          }} />
          <div style={{
            position: 'absolute',
            top: -2,
            right: -2,
            width: 20,
            height: 20,
            borderTop: `2px solid ${statusColors[status]}`,
            borderRight: `2px solid ${statusColors[status]}`,
          }} />
          <div style={{
            position: 'absolute',
            bottom: -2,
            left: -2,
            width: 20,
            height: 20,
            borderBottom: `2px solid ${statusColors[status]}`,
            borderLeft: `2px solid ${statusColors[status]}`,
          }} />
          <div style={{
            position: 'absolute',
            bottom: -2,
            right: -2,
            width: 20,
            height: 20,
            borderBottom: `2px solid ${statusColors[status]}`,
            borderRight: `2px solid ${statusColors[status]}`,
          }} />
        </>
      )}

      {/* 状态指示器 */}
      {(status !== 'normal' || realTimeUpdate) && (
        <div style={{
          position: 'absolute',
          top: 12,
          right: 12,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: statusColors[status],
          boxShadow: `0 0 8px ${statusColors[status]}`,
          animation: realTimeUpdate ? 'pulse 2s infinite' : 'none',
        }} />
      )}

      {/* 标题区域 */}
      {(title || subtitle) && (
        <div style={{ marginBottom: dashboardTokens.spacing.md }}>
          {title && (
            <h3 style={{
              margin: 0,
              fontSize: dashboardTokens.fonts.sizes.large,
              fontWeight: dashboardTokens.fonts.weights.semibold,
              color: dashboardTokens.colors.text.primary,
              marginBottom: subtitle ? '4px' : 0,
            }}>
              {title}
            </h3>
          )}
          {subtitle && (
            <p style={{
              margin: 0,
              fontSize: dashboardTokens.fonts.sizes.small,
              color: dashboardTokens.colors.text.secondary,
              fontWeight: dashboardTokens.fonts.weights.normal,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}

      {/* 内容区域 */}
      <div className="dashboard-card-content">
        {children}
      </div>
    </motion.div>
  );
};

// 大屏数据指标组件
interface DashboardMetricProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color?: keyof typeof dashboardTokens.colors.accent;
  size?: 'small' | 'medium' | 'large';
  animate?: boolean;
  prefix?: ReactNode;
  suffix?: ReactNode;
}

export const DashboardMetric: React.FC<DashboardMetricProps> = ({
  label,
  value,
  unit,
  trend,
  trendValue,
  color = 'primary',
  size = 'medium',
  animate = true,
  prefix,
  suffix
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const numericValue = typeof value === 'number' ? value : parseFloat(value.toString());

  // 数字动画效果
  useEffect(() => {
    if (animate && !isNaN(numericValue)) {
      let startTime: number;
      const duration = 1000;
      const start = displayValue;
      const end = numericValue;

      const animateNumber = (timestamp: number) => {
        if (!startTime) startTime = timestamp;
        const progress = Math.min((timestamp - startTime) / duration, 1);
        
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = start + (end - start) * easeOutQuart;
        
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animateNumber);
        }
      };

      requestAnimationFrame(animateNumber);
    }
  }, [numericValue, animate]);

  const sizeConfig = {
    small: {
      valueSize: dashboardTokens.fonts.sizes.medium,
      labelSize: dashboardTokens.fonts.sizes.small,
      spacing: dashboardTokens.spacing.xs,
    },
    medium: {
      valueSize: dashboardTokens.fonts.sizes.large,
      labelSize: dashboardTokens.fonts.sizes.medium,
      spacing: dashboardTokens.spacing.sm,
    },
    large: {
      valueSize: dashboardTokens.fonts.sizes.hero,
      labelSize: dashboardTokens.fonts.sizes.large,
      spacing: dashboardTokens.spacing.md,
    },
  };

  const config = sizeConfig[size];
  const accentColor = dashboardTokens.colors.accent[color];

  const trendIcons = {
    up: '↗',
    down: '↘',
    stable: '→'
  };

  const trendColors = {
    up: dashboardTokens.colors.accent.success,
    down: dashboardTokens.colors.accent.error,
    stable: dashboardTokens.colors.text.secondary
  };

  return (
    <div style={{ textAlign: 'center' }}>
      {/* 数值显示 */}
      <div style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
        gap: '4px',
        marginBottom: config.spacing,
      }}>
        {prefix}
        <motion.span
          style={{
            fontSize: config.valueSize,
            fontWeight: dashboardTokens.fonts.weights.bold,
            color: accentColor,
            fontVariantNumeric: 'tabular-nums',
          }}
          animate={animate ? dashboardAnimations.dataUpdate.animate : {}}
          transition={animate ? dashboardAnimations.dataUpdate.transition : {}}
        >
          {animate && !isNaN(numericValue) 
            ? displayValue.toFixed(typeof value === 'string' && value.includes('.') ? 1 : 0)
            : value
          }
        </motion.span>
        {unit && (
          <span style={{
            fontSize: dashboardTokens.fonts.sizes.small,
            color: dashboardTokens.colors.text.secondary,
            fontWeight: dashboardTokens.fonts.weights.normal,
          }}>
            {unit}
          </span>
        )}
        {suffix}
      </div>

      {/* 标签 */}
      <div style={{
        fontSize: config.labelSize,
        color: dashboardTokens.colors.text.secondary,
        fontWeight: dashboardTokens.fonts.weights.medium,
        marginBottom: trend ? '4px' : 0,
      }}>
        {label}
      </div>

      {/* 趋势指示 */}
      {trend && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
          fontSize: dashboardTokens.fonts.sizes.small,
          color: trendColors[trend],
        }}>
          <span>{trendIcons[trend]}</span>
          {trendValue && <span>{trendValue}</span>}
        </div>
      )}
    </div>
  );
};

// 大屏进度条组件
interface DashboardProgressProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: keyof typeof dashboardTokens.colors.accent;
  size?: 'small' | 'medium' | 'large';
  variant?: 'line' | 'circle' | 'semicircle';
  animated?: boolean;
  gradient?: boolean;
  glowEffect?: boolean;
}

export const DashboardProgress: React.FC<DashboardProgressProps> = ({
  value,
  label,
  showPercentage = true,
  color = 'primary',
  size = 'medium',
  variant = 'line',
  animated = true,
  gradient = true,
  glowEffect = false
}) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    if (animated) {
      const startTime = Date.now();
      const duration = 1000;
      const startValue = animatedValue;
      const endValue = value;

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeOutQuart = 1 - Math.pow(1 - progress, 4);
        const current = startValue + (endValue - startValue) * easeOutQuart;
        
        setAnimatedValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animateProgress);
        }
      };

      animateProgress();
    } else {
      setAnimatedValue(value);
    }
  }, [value, animated]);

  const accentColor = dashboardTokens.colors.accent[color];
  const displayValue = Math.min(Math.max(animatedValue, 0), 100);

  const sizeConfig = {
    small: { height: 6, fontSize: dashboardTokens.fonts.sizes.small },
    medium: { height: 8, fontSize: dashboardTokens.fonts.sizes.medium },
    large: { height: 12, fontSize: dashboardTokens.fonts.sizes.large },
  };

  const config = sizeConfig[size];

  if (variant === 'line') {
    return (
      <div>
        {(label || showPercentage) && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: dashboardTokens.spacing.xs,
          }}>
            {label && (
              <span style={{
                fontSize: config.fontSize,
                color: dashboardTokens.colors.text.secondary,
                fontWeight: dashboardTokens.fonts.weights.medium,
              }}>
                {label}
              </span>
            )}
            {showPercentage && (
              <span style={{
                fontSize: config.fontSize,
                color: accentColor,
                fontWeight: dashboardTokens.fonts.weights.semibold,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {displayValue.toFixed(0)}%
              </span>
            )}
          </div>
        )}
        
        <div style={{
          width: '100%',
          height: config.height,
          backgroundColor: dashboardTokens.colors.bg.secondary,
          borderRadius: config.height / 2,
          overflow: 'hidden',
          position: 'relative',
          boxShadow: glowEffect ? `0 0 10px ${accentColor}40` : 'none',
        }}>
          <motion.div
            style={{
              height: '100%',
              background: gradient 
                ? `linear-gradient(90deg, ${accentColor}80, ${accentColor})`
                : accentColor,
              borderRadius: config.height / 2,
              position: 'relative',
              overflow: 'hidden',
            }}
            initial={{ width: 0 }}
            animate={{ width: `${displayValue}%` }}
            transition={{ duration: animated ? 1 : 0, ease: "easeOut" }}
          >
            {animated && (
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '30px',
                height: '100%',
                background: `linear-gradient(90deg, transparent, ${accentColor}40)`,
                animation: 'shimmer 2s infinite',
              }} />
            )}
          </motion.div>
        </div>
      </div>
    );
  }

  // TODO: 实现圆形和半圆形进度条
  return <div>其他变体进度条待实现</div>;
};

// 大屏状态指示器
interface DashboardStatusProps {
  status: 'online' | 'offline' | 'warning' | 'error' | 'loading';
  label?: string;
  size?: 'small' | 'medium' | 'large';
  pulse?: boolean;
  showLabel?: boolean;
}

export const DashboardStatus: React.FC<DashboardStatusProps> = ({
  status,
  label,
  size = 'medium',
  pulse = true,
  showLabel = true
}) => {
  const statusConfig = {
    online: { color: dashboardTokens.colors.accent.success, icon: '●' },
    offline: { color: dashboardTokens.colors.text.muted, icon: '●' },
    warning: { color: dashboardTokens.colors.accent.warning, icon: '▲' },
    error: { color: dashboardTokens.colors.accent.error, icon: '✕' },
    loading: { color: dashboardTokens.colors.accent.secondary, icon: '○' },
  };

  const sizeConfig = {
    small: { iconSize: '8px', fontSize: dashboardTokens.fonts.sizes.small },
    medium: { iconSize: '12px', fontSize: dashboardTokens.fonts.sizes.medium },
    large: { iconSize: '16px', fontSize: dashboardTokens.fonts.sizes.large },
  };

  const statusInfo = statusConfig[status];
  const sizeInfo = sizeConfig[size];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: dashboardTokens.spacing.xs,
    }}>
      <motion.div
        style={{
          color: statusInfo.color,
          fontSize: sizeInfo.iconSize,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        animate={pulse ? dashboardAnimations.pulse.animate : {}}
        transition={pulse ? dashboardAnimations.pulse.transition : {}}
      >
        {statusInfo.icon}
      </motion.div>
      
      {showLabel && (label || status) && (
        <span style={{
          fontSize: sizeInfo.fontSize,
          color: statusInfo.color,
          fontWeight: dashboardTokens.fonts.weights.medium,
          textTransform: 'capitalize',
        }}>
          {label || status}
        </span>
      )}
    </div>
  );
};

export default {
  DashboardCard,
  DashboardMetric,
  DashboardProgress,
  DashboardStatus,
  dashboardTokens,
  dashboardAnimations
};