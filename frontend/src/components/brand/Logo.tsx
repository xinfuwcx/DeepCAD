/**
 * DeepCAD 主品牌Logo组件
 * 1号架构师 - 震撼第一印象的核心设计
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens } from '../../design/tokens';

// ==================== 类型定义 ====================

export interface LogoProps {
  className?: string;
  size?: number | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  variant?: 'full' | 'icon' | 'text';
  animated?: boolean;
  glowing?: boolean;
  interactive?: boolean;
  onAnimationComplete?: () => void;
  onClick?: () => void;
}

// ==================== 尺寸配置 ====================

const sizeConfig = {
  xs: { width: 80, height: 32, fontSize: '12px' },
  sm: { width: 120, height: 48, fontSize: '16px' },
  md: { width: 160, height: 64, fontSize: '20px' },
  lg: { width: 200, height: 80, fontSize: '24px' },
  xl: { width: 280, height: 112, fontSize: '32px' },
  '2xl': { width: 400, height: 160, fontSize: '48px' }
};

// ==================== Logo图标SVG ====================

const LogoIcon: React.FC<{ 
  size: number; 
  animated: boolean; 
  glowing: boolean 
}> = ({ size, animated, glowing }) => {
  return (
    <motion.svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* 基坑轮廓 - 主要形状 */}
      <motion.path
        d="M20 20 L100 20 L95 75 L25 75 Z"
        stroke={designTokens.colors.primary[500]}
        strokeWidth="2"
        fill="none"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{
          filter: glowing ? `drop-shadow(0 0 8px ${designTokens.colors.primary[500]})` : 'none'
        }}
      />
      
      {/* 围护墙结构 */}
      <motion.g>
        {/* 左侧围护墙 */}
        <motion.line
          x1="20" y1="20"
          x2="25" y2="75"
          stroke={designTokens.colors.accent[500]}
          strokeWidth="3"
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
        
        {/* 右侧围护墙 */}
        <motion.line
          x1="100" y1="20"
          x2="95" y2="75"
          stroke={designTokens.colors.accent[500]}
          strokeWidth="3"
          initial={animated ? { opacity: 0, x: 10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
      </motion.g>
      
      {/* 支撑系统 - 水平支撑 */}
      <motion.g>
        {[35, 50, 65].map((y, index) => (
          <motion.line
            key={`strut-${index}`}
            x1="25" y1={y}
            x2="95" y2={y}
            stroke={designTokens.colors.secondary[400]}
            strokeWidth="2"
            strokeDasharray="5,3"
            initial={animated ? { scaleX: 0 } : {}}
            animate={animated ? { scaleX: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.8 + index * 0.2 }}
            style={{ transformOrigin: 'center' }}
          />
        ))}
      </motion.g>
      
      {/* 土层分界线 */}
      <motion.g opacity="0.6">
        {[28, 42, 58].map((y, index) => (
          <motion.path
            key={`soil-${index}`}
            d={`M25 ${y} Q60 ${y + 3} 95 ${y}`}
            stroke={designTokens.colors.semantic.material}
            strokeWidth="1"
            fill="none"
            strokeDasharray="3,2"
            initial={animated ? { opacity: 0 } : {}}
            animate={animated ? { opacity: 0.6 } : {}}
            transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
          />
        ))}
      </motion.g>
      
      {/* 科技感粒子点 */}
      {animated && (
        <motion.g>
          {[
            { x: 30, y: 25 }, { x: 60, y: 30 }, { x: 90, y: 25 },
            { x: 35, y: 45 }, { x: 85, y: 55 }, { x: 60, y: 70 }
          ].map((point, index) => (
            <motion.circle
              key={`particle-${index}`}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={designTokens.colors.primary[400]}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0.5, 1], 
                scale: [0, 1.2, 0.8, 1],
              }}
              transition={{ 
                duration: 2,
                delay: 1.5 + index * 0.2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              style={{
                filter: `drop-shadow(0 0 4px ${designTokens.colors.primary[400]})`
              }}
            />
          ))}
        </motion.g>
      )}
      
      {/* 能量波纹效果 */}
      {glowing && (
        <motion.circle
          cx="60"
          cy="48"
          r="40"
          fill="none"
          stroke={designTokens.colors.primary[500]}
          strokeWidth="1"
          opacity="0.3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
    </motion.svg>
  );
};

// ==================== Logo文字 ====================

const LogoText: React.FC<{ 
  fontSize: string; 
  animated: boolean;
  glowing: boolean;
}> = ({ fontSize, animated, glowing }) => {
  return (
    <motion.div
      style={{
        fontSize,
        fontFamily: designTokens.typography.fontFamily.primary.join(', '),
        fontWeight: designTokens.typography.fontWeight.bold,
        color: designTokens.colors.neutral[100],
        textShadow: glowing ? `0 0 10px ${designTokens.colors.primary[500]}` : 'none',
        letterSpacing: '0.05em'
      }}
      initial={animated ? { opacity: 0, y: 20 } : {}}
      animate={animated ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.8, delay: 0.3 }}
    >
      <motion.span
        style={{ color: designTokens.colors.primary[400] }}
        animate={glowing ? {
          textShadow: [
            `0 0 5px ${designTokens.colors.primary[500]}`,
            `0 0 15px ${designTokens.colors.primary[400]}`,
            `0 0 5px ${designTokens.colors.primary[500]}`
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity }}
      >
        Deep
      </motion.span>
      <motion.span
        style={{ color: designTokens.colors.accent[400] }}
        animate={glowing ? {
          textShadow: [
            `0 0 5px ${designTokens.colors.accent[500]}`,
            `0 0 15px ${designTokens.colors.accent[400]}`,
            `0 0 5px ${designTokens.colors.accent[500]}`
          ]
        } : {}}
        transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
      >
        CAD
      </motion.span>
    </motion.div>
  );
};

// ==================== 主Logo组件 ====================

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 'md',
  variant = 'full',
  animated = false,
  glowing = false,
  interactive = false,
  onAnimationComplete,
  onClick
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [animationPlayed, setAnimationPlayed] = useState(false);
  
  // 安全获取配置，支持数值和字符串尺寸
  const getSizeConfig = (size: number | string | undefined) => {
    // 处理undefined情况
    if (!size) {
      return sizeConfig.md;
    }
    
    if (typeof size === 'number') {
      // 数值尺寸，返回动态配置
      const safeSize = Math.max(16, Math.min(200, size)); // 限制16-200范围
      return {
        width: safeSize * 5, // 宽度为高度的5倍
        height: safeSize,
        fontSize: `${Math.max(12, safeSize * 0.4)}px`
      };
    }
    
    // 字符串尺寸，使用预定义配置
    const stringSize = size as keyof typeof sizeConfig;
    return sizeConfig[stringSize] || sizeConfig.md;
  };
  
  const config = getSizeConfig(size);
  
  // 安全检查config
  if (!config || !config.height || !config.width) {
    console.error('Logo config 错误:', { size, config });
    return <div style={{ width: 160, height: 64, backgroundColor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Logo Error</div>;
  }
  
  useEffect(() => {
    if (animated && !animationPlayed) {
      const timer = setTimeout(() => {
        setAnimationPlayed(true);
        onAnimationComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [animated, animationPlayed, onAnimationComplete]);

  const handleClick = () => {
    if (interactive && onClick) {
      onClick();
    }
  };

  const containerVariants = {
    initial: { opacity: 0 },
    animate: { 
      opacity: 1,
      transition: { duration: 0.5 }
    },
    hover: interactive ? {
      scale: 1.05,
      transition: { duration: 0.2 }
    } : {}
  };

  return (
    <motion.div
      className={`deepcad-logo ${className}`}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: variant === 'full' ? designTokens.spacing[3] : '0',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none'
      }}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      whileHover={interactive ? "hover" : undefined}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Logo图标部分 */}
      {(variant === 'full' || variant === 'icon') && (
        <motion.div
          style={{
            filter: (interactive && isHovered) || glowing 
              ? `drop-shadow(0 0 12px ${designTokens.colors.primary[500]})` 
              : 'none',
            transition: 'filter 0.3s ease'
          }}
        >
          <LogoIcon 
            size={config.height} 
            animated={animated}
            glowing={glowing || (interactive && isHovered)}
          />
        </motion.div>
      )}
      
      {/* Logo文字部分 */}
      {(variant === 'full' || variant === 'text') && (
        <LogoText 
          fontSize={config.fontSize}
          animated={animated}
          glowing={glowing || (interactive && isHovered)}
        />
      )}
      
      {/* 交互式辉光效果 */}
      <AnimatePresence>
        {interactive && isHovered && (
          <motion.div
            style={{
              position: 'absolute',
              inset: '-10px',
              background: `linear-gradient(45deg, ${designTokens.colors.primary[500]}20, transparent, ${designTokens.colors.accent[500]}20)`,
              borderRadius: designTokens.borderRadius.lg,
              pointerEvents: 'none',
              zIndex: -1
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ==================== 粒子系统组件 ====================

const ParticleField: React.FC<{
  particles: Array<{ x: number; y: number; delay: number; color: string }>;
  converged: boolean;
}> = ({ particles, converged }) => {
  return (
    <motion.g>
      {particles.map((particle, index) => (
        <motion.circle
          key={`convergence-particle-${index}`}
          r="2"
          fill={particle.color}
          initial={{ 
            cx: particle.x, 
            cy: particle.y, 
            opacity: 0,
            scale: 0
          }}
          animate={converged ? {
            cx: 60,  // 中心点
            cy: 48,  // 中心点
            opacity: [0, 1, 0],
            scale: [0, 1.5, 0]
          } : {
            cx: particle.x,
            cy: particle.y,
            opacity: [0, 0.8, 0.4, 0.8],
            scale: [0, 1, 0.8, 1]
          }}
          transition={{
            duration: converged ? 1.5 : 2,
            delay: particle.delay,
            ease: converged ? "easeInOut" : "easeInOut",
            repeat: converged ? 0 : Infinity,
            repeatDelay: converged ? 0 : 1
          }}
          style={{
            filter: `drop-shadow(0 0 6px ${particle.color})`
          }}
        />
      ))}
    </motion.g>
  );
};

// ==================== 能量爆发效果 ====================

const EnergyBurst: React.FC<{ 
  triggered: boolean; 
  onComplete?: () => void;
}> = ({ triggered, onComplete }) => {
  return (
    <motion.g>
      {/* 主要能量环 */}
      {[1, 2, 3].map((ring) => (
        <motion.circle
          key={`energy-ring-${ring}`}
          cx="60"
          cy="48"
          fill="none"
          stroke={ring === 1 ? designTokens.colors.primary[400] : 
                  ring === 2 ? designTokens.colors.accent[400] : 
                  designTokens.colors.secondary[400]}
          strokeWidth={4 - ring}
          r={20}
          opacity={0}
          animate={triggered ? {
            r: [20, 80, 120],
            opacity: [0, 0.8, 0],
            strokeWidth: [4 - ring, 1, 0]
          } : {}}
          transition={{
            duration: 1.2,
            delay: ring * 0.1,
            ease: "easeOut",
            onComplete: ring === 3 ? onComplete : undefined
          }}
        />
      ))}
      
      {/* 射线效果 */}
      {triggered && [0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
        <motion.line
          key={`energy-ray-${angle}`}
          x1="60"
          y1="48"
          x2={60 + Math.cos(angle * Math.PI / 180) * 40}
          y2={48 + Math.sin(angle * Math.PI / 180) * 40}
          stroke={designTokens.colors.primary[300]}
          strokeWidth="2"
          opacity={0}
          animate={{
            x2: 60 + Math.cos(angle * Math.PI / 180) * 100,
            y2: 48 + Math.sin(angle * Math.PI / 180) * 100,
            opacity: [0, 1, 0],
            strokeWidth: [2, 0.5]
          }}
          transition={{
            duration: 0.8,
            delay: 0.3 + (angle / 315) * 0.2,
            ease: "easeOut"
          }}
        />
      ))}
    </motion.g>
  );
};

// ==================== 增强Logo图标（带粒子汇聚） ====================

const EnhancedLogoIcon: React.FC<{ 
  size: number; 
  animated: boolean; 
  glowing: boolean;
  particleConvergence?: boolean;
  onConvergenceComplete?: () => void;
}> = ({ size, animated, glowing, particleConvergence = false, onConvergenceComplete }) => {
  const [convergenceTriggered, setConvergenceTriggered] = useState(false);
  const [burstTriggered, setBurstTriggered] = useState(false);

  useEffect(() => {
    if (particleConvergence && !convergenceTriggered) {
      const timer = setTimeout(() => {
        setConvergenceTriggered(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [particleConvergence, convergenceTriggered]);

  useEffect(() => {
    if (convergenceTriggered && !burstTriggered) {
      const timer = setTimeout(() => {
        setBurstTriggered(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [convergenceTriggered, burstTriggered]);

  // 粒子数据
  const particles = [
    { x: 10, y: 10, delay: 0, color: designTokens.colors.primary[400] },
    { x: 110, y: 15, delay: 0.1, color: designTokens.colors.accent[400] },
    { x: 20, y: 85, delay: 0.2, color: designTokens.colors.secondary[400] },
    { x: 105, y: 80, delay: 0.3, color: designTokens.colors.primary[300] },
    { x: 5, y: 50, delay: 0.4, color: designTokens.colors.accent[300] },
    { x: 115, y: 45, delay: 0.5, color: designTokens.colors.secondary[300] },
    { x: 60, y: 5, delay: 0.6, color: designTokens.colors.primary[500] },
    { x: 55, y: 90, delay: 0.7, color: designTokens.colors.accent[500] }
  ];

  return (
    <motion.svg
      width={size}
      height={size * 0.8}
      viewBox="0 0 120 96"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      {/* 粒子汇聚效果 */}
      {particleConvergence && (
        <ParticleField 
          particles={particles} 
          converged={convergenceTriggered}
        />
      )}

      {/* 基坑轮廓 - 主要形状 */}
      <motion.path
        d="M20 20 L100 20 L95 75 L25 75 Z"
        stroke={designTokens.colors.primary[500]}
        strokeWidth="2"
        fill="none"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5, ease: "easeInOut" }}
        style={{
          filter: glowing ? `drop-shadow(0 0 8px ${designTokens.colors.primary[500]})` : 'none'
        }}
      />
      
      {/* 围护墙结构 */}
      <motion.g>
        {/* 左侧围护墙 */}
        <motion.line
          x1="20" y1="20"
          x2="25" y2="75"
          stroke={designTokens.colors.accent[500]}
          strokeWidth="3"
          initial={animated ? { opacity: 0, x: -10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
        
        {/* 右侧围护墙 */}
        <motion.line
          x1="100" y1="20"
          x2="95" y2="75"
          stroke={designTokens.colors.accent[500]}
          strokeWidth="3"
          initial={animated ? { opacity: 0, x: 10 } : {}}
          animate={animated ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
        />
      </motion.g>
      
      {/* 支撑系统 - 水平支撑 */}
      <motion.g>
        {[35, 50, 65].map((y, index) => (
          <motion.line
            key={`strut-${index}`}
            x1="25" y1={y}
            x2="95" y2={y}
            stroke={designTokens.colors.secondary[400]}
            strokeWidth="2"
            strokeDasharray="5,3"
            initial={animated ? { scaleX: 0 } : {}}
            animate={animated ? { scaleX: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.8 + index * 0.2 }}
            style={{ transformOrigin: 'center' }}
          />
        ))}
      </motion.g>
      
      {/* 土层分界线 */}
      <motion.g opacity="0.6">
        {[28, 42, 58].map((y, index) => (
          <motion.path
            key={`soil-${index}`}
            d={`M25 ${y} Q60 ${y + 3} 95 ${y}`}
            stroke={designTokens.colors.semantic.material}
            strokeWidth="1"
            fill="none"
            strokeDasharray="3,2"
            initial={animated ? { opacity: 0 } : {}}
            animate={animated ? { opacity: 0.6 } : {}}
            transition={{ duration: 0.3, delay: 1.2 + index * 0.1 }}
          />
        ))}
      </motion.g>
      
      {/* 科技感粒子点 */}
      {animated && (
        <motion.g>
          {[
            { x: 30, y: 25 }, { x: 60, y: 30 }, { x: 90, y: 25 },
            { x: 35, y: 45 }, { x: 85, y: 55 }, { x: 60, y: 70 }
          ].map((point, index) => (
            <motion.circle
              key={`particle-${index}`}
              cx={point.x}
              cy={point.y}
              r="1.5"
              fill={designTokens.colors.primary[400]}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ 
                opacity: [0, 1, 0.5, 1], 
                scale: [0, 1.2, 0.8, 1],
              }}
              transition={{ 
                duration: 2,
                delay: 1.5 + index * 0.2,
                repeat: Infinity,
                repeatDelay: 3
              }}
              style={{
                filter: `drop-shadow(0 0 4px ${designTokens.colors.primary[400]})`
              }}
            />
          ))}
        </motion.g>
      )}
      
      {/* 能量波纹效果 */}
      {glowing && (
        <motion.circle
          cx="60"
          cy="48"
          r="40"
          fill="none"
          stroke={designTokens.colors.primary[500]}
          strokeWidth="1"
          opacity="0.3"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ 
            scale: [0.8, 1.2, 0.8],
            opacity: [0, 0.6, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}

      {/* 能量爆发效果 */}
      {particleConvergence && (
        <EnergyBurst 
          triggered={burstTriggered} 
          onComplete={onConvergenceComplete}
        />
      )}
    </motion.svg>
  );
};

// ==================== 史诗级加载Logo ====================

export const LoadingLogo: React.FC<{
  onComplete?: () => void;
}> = ({ onComplete }) => {
  const [stage, setStage] = useState<'particles' | 'convergence' | 'burst' | 'completed'>('particles');

  const handleStageComplete = () => {
    if (stage === 'particles') {
      setStage('convergence');
    } else if (stage === 'convergence') {
      setStage('burst');
    } else if (stage === 'burst') {
      setStage('completed');
      onComplete?.();
    }
  };

  useEffect(() => {
    if (stage === 'particles') {
      const timer = setTimeout(() => {
        setStage('convergence');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [stage]);

  return (
    <motion.div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: designTokens.spacing[6],
        position: 'relative'
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* 背景能量场 */}
      <motion.div
        style={{
          position: 'absolute',
          top: '-50px',
          left: '-50px',
          right: '-50px',
          bottom: '-50px',
          background: `radial-gradient(circle, ${designTokens.colors.primary[500]}10 0%, transparent 70%)`,
          borderRadius: '50%',
          pointerEvents: 'none'
        }}
        animate={{
          scale: stage === 'burst' ? [1, 1.5, 2] : [0.8, 1.2, 0.8],
          opacity: stage === 'burst' ? [0.3, 0.8, 0] : [0, 0.3, 0]
        }}
        transition={{
          duration: stage === 'burst' ? 1.5 : 3,
          repeat: stage === 'burst' ? 0 : Infinity,
          ease: "easeInOut"
        }}
      />

      {/* 增强版Logo */}
      <motion.div
        animate={stage === 'burst' ? {
          scale: [1, 1.1, 1],
          filter: [
            'brightness(1)',
            'brightness(1.5) saturate(1.3)',
            'brightness(1)'
          ]
        } : {}}
        transition={{ duration: 1.5 }}
      >
        <EnhancedLogoIcon 
          size={320} 
          animated={true}
          glowing={true}
          particleConvergence={stage === 'convergence' || stage === 'burst'}
          onConvergenceComplete={handleStageComplete}
        />
      </motion.div>
      
      {/* 动态进度指示器 */}
      <motion.div
        style={{
          width: '280px',
          height: '3px',
          background: designTokens.colors.neutral[800],
          borderRadius: designTokens.borderRadius.full,
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <motion.div
          style={{
            height: '100%',
            background: `linear-gradient(90deg, ${designTokens.colors.primary[500]}, ${designTokens.colors.accent[500]}, ${designTokens.colors.secondary[400]})`,
            borderRadius: designTokens.borderRadius.full
          }}
          initial={{ width: '0%' }}
          animate={{ 
            width: stage === 'particles' ? '33%' : 
                   stage === 'convergence' ? '66%' : 
                   stage === 'burst' ? '100%' : '100%'
          }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        />
        
        {/* 进度光晕 */}
        <motion.div
          style={{
            position: 'absolute',
            top: '-2px',
            right: `${stage === 'particles' ? '67%' : 
                     stage === 'convergence' ? '34%' : '0%'}`,
            width: '8px',
            height: '7px',
            background: designTokens.colors.primary[400],
            borderRadius: '50%',
            filter: `blur(2px)`,
            opacity: 0.8
          }}
          animate={{
            boxShadow: [
              `0 0 4px ${designTokens.colors.primary[400]}`,
              `0 0 12px ${designTokens.colors.primary[400]}`,
              `0 0 4px ${designTokens.colors.primary[400]}`
            ]
          }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      </motion.div>
      
      {/* 状态文字 */}
      <motion.div
        style={{
          textAlign: 'center',
          minHeight: '40px'
        }}
      >
        <motion.p
          style={{
            fontSize: designTokens.typography.fontSize.base,
            color: designTokens.colors.primary[300],
            fontFamily: designTokens.typography.fontFamily.primary.join(', '),
            margin: 0,
            fontWeight: designTokens.typography.fontWeight.medium
          }}
          key={stage}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.5 }}
        >
          {stage === 'particles' && '初始化量子计算引擎...'}
          {stage === 'convergence' && '激活WebGPU并行处理器...'}
          {stage === 'burst' && '启动深基坑CAE系统...'}
          {stage === 'completed' && '系统就绪 - 欢迎使用DeepCAD'}
        </motion.p>
        
        <motion.p
          style={{
            fontSize: designTokens.typography.fontSize.sm,
            color: designTokens.colors.neutral[400],
            fontFamily: designTokens.typography.fontFamily.primary.join(', '),
            margin: '4px 0 0 0'
          }}
          animate={{
            opacity: [0.4, 0.8, 0.4]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          世界级GPU加速 • 震撼视觉体验 • 专业CAE分析
        </motion.p>
      </motion.div>
    </motion.div>
  );
};

export default Logo;