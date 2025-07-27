/**
 * DeepCAD 状态动画图标系统
 * 1号架构师 - 计算状态和系统状态指示器
 */

import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../../design/tokens';
import { IconProps, getSizeValue } from './FunctionalIcons';

// ==================== 状态图标容器 ====================

const StatusIconContainer: React.FC<{
  children: React.ReactNode;
  size: number | string;
  animated: boolean;
  pulsing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, size, animated, pulsing = false, className = '', style = {} }) => {
  const numericSize = getSizeValue(size);
  return (
    <motion.div
      className={`deepcad-status-icon ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      animate={pulsing ? {
        scale: [1, 1.1, 1],
        opacity: [0.8, 1, 0.8]
      } : {}}
      transition={pulsing ? {
        duration: 1.5,
        repeat: Infinity,
        ease: "easeInOut"
      } : {}}
    >
      <motion.svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        initial={animated ? { opacity: 0, rotate: -180 } : {}}
        animate={animated ? { opacity: 1, rotate: 0 } : {}}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        {children}
      </motion.svg>
    </motion.div>
  );
};

// ==================== 17. 计算中状态图标 ====================

export const ComputingStatusIcon: React.FC<IconProps & { pulsing?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.computing,
  animated = true,
  pulsing = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} pulsing={pulsing} {...props}>
    <g stroke="none" fill={color}>
      {/* 中心处理核心 */}
      <motion.circle
        cx="12" cy="12" r="3"
        fill={color}
        opacity="0.3"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.6, 0.3]
        }}
        transition={{
          duration: 1,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      
      {/* 旋转的数据处理器 */}
      {[0, 60, 120, 180, 240, 300].map((angle, i) => (
        <motion.g
          key={i}
          animate={{ rotate: 360 }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "linear",
            delay: i * 0.1
          }}
          style={{ transformOrigin: '12px 12px' }}
        >
          <motion.rect
            x="11" y="6" width="2" height="3" rx="1"
            fill={color}
            opacity="0.7"
            style={{
              transformOrigin: '12px 12px',
              transform: `rotate(${angle}deg)`
            }}
            animate={{
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: 0.8,
              repeat: Infinity,
              delay: i * 0.15
            }}
          />
        </motion.g>
      ))}
      
      {/* 数据流动轨迹 */}
      <motion.circle
        cx="12" cy="12" r="8"
        fill="none"
        stroke={color}
        strokeWidth="0.5"
        strokeDasharray="2,4"
        opacity="0.4"
        animate={{ rotate: -360 }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "linear"
        }}
        style={{ transformOrigin: '12px 12px' }}
      />
    </g>
  </StatusIconContainer>
);

// ==================== 18. 计算完成状态图标 ====================

export const CompletedStatusIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.success,
  animated = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} {...props}>
    <g stroke="none" fill="none">
      {/* 成功圆环 */}
      <motion.circle
        cx="12" cy="12" r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
      
      {/* 对勾动画 */}
      <motion.path
        d="M8 12 L11 15 L16 9"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      />
      
      {/* 成功光晕 */}
      <motion.circle
        cx="12" cy="12" r="12"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0, 0.3, 0]
        }}
        transition={{
          duration: 2,
          delay: 1,
          repeat: Infinity,
          repeatDelay: 3
        }}
      />
    </g>
  </StatusIconContainer>
);

// ==================== 19. 警告状态图标 ====================

export const WarningStatusIcon: React.FC<IconProps & { pulsing?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.warning,
  animated = true,
  pulsing = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} pulsing={pulsing} {...props}>
    <g stroke="none" fill={color}>
      {/* 警告三角形 */}
      <motion.path
        d="M12 2 L22 20 L2 20 Z"
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      
      {/* 感叹号主体 */}
      <motion.line
        x1="12" y1="8" x2="12" y2="14"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.4, delay: 0.3 }}
      />
      
      {/* 感叹号点 */}
      <motion.circle
        cx="12" cy="17" r="1.5"
        fill={color}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
      />
      
      {/* 脉冲效果 */}
      <motion.path
        d="M12 2 L22 20 L2 20 Z"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0"
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0, 0.4, 0]
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: 1
        }}
      />
    </g>
  </StatusIconContainer>
);

// ==================== 20. 错误状态图标 ====================

export const ErrorStatusIcon: React.FC<IconProps & { shaking?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.error,
  animated = true,
  shaking = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} {...props}>
    <motion.g
      animate={shaking ? {
        x: [0, -1, 1, 0],
        y: [0, 1, -1, 0]
      } : {}}
      transition={shaking ? {
        duration: 0.5,
        repeat: 2,
        delay: 1
      } : {}}
    >
      {/* 错误圆圈 */}
      <motion.circle
        cx="12" cy="12" r="10"
        fill="none"
        stroke={color}
        strokeWidth="2"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8 }}
      />
      
      {/* X标记 */}
      <motion.path
        d="M8 8 L16 16 M16 8 L8 16"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
      />
      
      {/* 错误波动 */}
      <motion.circle
        cx="12" cy="12" r="12"
        fill="none"
        stroke={color}
        strokeWidth="1"
        opacity="0"
        animate={{
          scale: [1, 1.2, 1.4],
          opacity: [0.5, 0.2, 0]
        }}
        transition={{
          duration: 1,
          delay: 1,
          repeat: Infinity,
          repeatDelay: 2
        }}
      />
    </motion.g>
  </StatusIconContainer>
);

// ==================== 21. 连接状态图标 ====================

export const ConnectionStatusIcon: React.FC<IconProps & { connected?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.secondary[500],
  animated = true,
  connected = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 信号强度条 */}
      {[6, 8, 10, 12].map((height, i) => (
        <motion.rect
          key={i}
          x={4 + i * 3} y={20 - height}
          width="2" height={height}
          fill={connected ? color : designTokens.colors.neutral[600]}
          initial={animated ? { scaleY: 0 } : {}}
          animate={animated ? { scaleY: connected ? 1 : 0.3 } : {}}
          transition={{ 
            duration: 0.5, 
            delay: i * 0.1,
            ease: "easeOut"
          }}
          style={{ transformOrigin: 'bottom' }}
        />
      ))}
      
      {/* 信号波纹 */}
      {connected && animated && [1, 2, 3].map((ring) => (
        <motion.path
          key={ring}
          d={`M18 12 Q20 10 22 12 Q20 14 18 12`}
          stroke={color}
          strokeWidth="1"
          opacity="0"
          animate={{
            scale: [1, 1.5, 2],
            opacity: [0.8, 0.4, 0]
          }}
          transition={{
            duration: 2,
            delay: ring * 0.3,
            repeat: Infinity,
            repeatDelay: 3
          }}
          style={{ transformOrigin: '18px 12px' }}
        />
      ))}
      
      {/* 断开连接指示 */}
      {!connected && (
        <motion.path
          d="M16 8 L22 14"
          stroke={designTokens.colors.semantic.error}
          strokeWidth="2"
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
        />
      )}
    </g>
  </StatusIconContainer>
);

// ==================== 22. 加载状态图标 ====================

export const LoadingStatusIcon: React.FC<IconProps & { speed?: 'slow' | 'normal' | 'fast' }> = ({ 
  size = 24, 
  color = designTokens.colors.primary[500],
  animated = true,
  speed = 'normal',
  ...props
}) => {
  const duration = speed === 'fast' ? 0.8 : speed === 'slow' ? 2 : 1.2;
  
  return (
    <StatusIconContainer size={size} animated={animated} {...props}>
      <g stroke="none" fill={color}>
        {/* 旋转加载器 */}
        <motion.circle
          cx="12" cy="12" r="8"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="12 8"
          strokeLinecap="round"
          animate={{ rotate: 360 }}
          transition={{
            duration,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ transformOrigin: '12px 12px' }}
        />
        
        {/* 中心加载点 */}
        <motion.circle
          cx="12" cy="12" r="2"
          fill={color}
          opacity="0.3"
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3]
          }}
          transition={{
            duration: duration * 0.6,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        
        {/* 进度指示点 */}
        {[0, 90, 180, 270].map((angle, i) => (
          <motion.circle
            key={i}
            cx={12 + 6 * Math.cos(angle * Math.PI / 180)}
            cy={12 + 6 * Math.sin(angle * Math.PI / 180)}
            r="1"
            fill={color}
            animate={{
              scale: [0.5, 1.2, 0.5],
              opacity: [0.4, 1, 0.4]
            }}
            transition={{
              duration: duration * 0.8,
              repeat: Infinity,
              delay: i * (duration * 0.2),
              ease: "easeInOut"
            }}
          />
        ))}
      </g>
    </StatusIconContainer>
  );
};

// ==================== 23. 同步状态图标 ====================

export const SyncStatusIcon: React.FC<IconProps & { syncing?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.accent[500],
  animated = true,
  syncing = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 同步箭头环 */}
      <motion.path
        d="M12 2 A10 10 0 0 1 22 12"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: syncing ? 1 : 0.5 }}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M22 12 A10 10 0 0 1 12 22"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: syncing ? 1 : 0.5 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.path
        d="M12 22 A10 10 0 0 1 2 12"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: syncing ? 1 : 0.5 }}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      <motion.path
        d="M2 12 A10 10 0 0 1 12 2"
        strokeLinecap="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: syncing ? 1 : 0.5 }}
        transition={{ duration: 0.8, delay: 0.6 }}
      />
      
      {/* 旋转动画 */}
      {syncing && (
        <motion.g
          animate={{ rotate: 360 }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ transformOrigin: '12px 12px' }}
        >
          {/* 箭头 */}
          <motion.path
            d="M20 10 L22 12 L20 14"
            fill={color}
            strokeWidth="1"
          />
          <motion.path
            d="M4 14 L2 12 L4 10"
            fill={color}
            strokeWidth="1"
          />
        </motion.g>
      )}
      
      {/* 同步完成标记 */}
      {!syncing && (
        <motion.circle
          cx="12" cy="12" r="1.5"
          fill={designTokens.colors.semantic.success}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 1 }}
        />
      )}
    </g>
  </StatusIconContainer>
);

// ==================== 24. 实时状态图标 ====================

export const RealtimeStatusIcon: React.FC<IconProps & { active?: boolean }> = ({ 
  size = 24, 
  color = designTokens.colors.secondary[400],
  animated = true,
  active = true,
  ...props
}) => (
  <StatusIconContainer size={size} animated={animated} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 实时波形 */}
      <motion.path
        d="M2 12 L4 8 L6 16 L8 4 L10 20 L12 12 L14 6 L16 18 L18 9 L20 15 L22 12"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ 
          pathLength: 1,
          ...(active ? {
            strokeDasharray: ['0 100', '50 100', '100 100'],
            strokeDashoffset: [0, -50, -100]
          } : {})
        }}
        transition={active ? {
          pathLength: { duration: 1 },
          strokeDasharray: { 
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          },
          strokeDashoffset: { 
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }
        } : { duration: 1 }}
      />
      
      {/* 活动指示器 */}
      {active && (
        <motion.circle
          cx="22" cy="6" r="2"
          fill={designTokens.colors.semantic.success}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.7, 1, 0.7]
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      )}
      
      {/* 时间轴 */}
      <motion.line
        x1="2" y1="22" x2="22" y2="22"
        strokeWidth="1"
        opacity="0.3"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.8, delay: 0.5 }}
      />
    </g>
  </StatusIconContainer>
);

// ==================== 导出状态图标 ====================

export const StatusIcons = {
  Computing: ComputingStatusIcon,
  Completed: CompletedStatusIcon,
  Warning: WarningStatusIcon,
  Error: ErrorStatusIcon,
  Connection: ConnectionStatusIcon,
  Loading: LoadingStatusIcon,
  Sync: SyncStatusIcon,
  Realtime: RealtimeStatusIcon
};

export default StatusIcons;