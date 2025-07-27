/**
 * DeepCAD 工程专业图标系统
 * 1号架构师 - 12个深基坑工程专业图标
 */

import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../../design/tokens';
import { IconProps } from './FunctionalIcons';

// ==================== 图标容器组件（复用） ====================

const IconContainer: React.FC<{
  children: React.ReactNode;
  size: number;
  animated: boolean;
  glowing: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, size, animated, glowing, className = '', style = {} }) => {
  return (
    <motion.div
      className={`deepcad-engineering-icon ${className}`}
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      whileHover={animated ? { scale: 1.1, rotate: 5 } : {}}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: glowing ? `drop-shadow(0 0 8px currentColor)` : 'none'
        }}
        animate={glowing ? {
          filter: [
            'drop-shadow(0 0 4px currentColor)',
            'drop-shadow(0 0 12px currentColor)',
            'drop-shadow(0 0 4px currentColor)'
          ]
        } : {}}
        transition={glowing ? { duration: 2, repeat: Infinity } : {}}
      >
        {children}
      </motion.svg>
    </motion.div>
  );
};

// ==================== 9. 围护墙图标 ====================

export const RetainingWallIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.accent[500],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="2" fill="none">
      {/* 围护墙主体 */}
      <motion.line
        x1="8" y1="4" x2="8" y2="20"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1 }}
      />
      <motion.line
        x1="16" y1="4" x2="16" y2="20"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
      />
      {/* 墙体连接 */}
      <motion.line
        x1="8" y1="4" x2="16" y2="4"
        strokeWidth="1"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      {/* 土压力指示 */}
      {animated && [6, 10, 14, 18].map((y, i) => (
        <motion.path
          key={i}
          d={`M4 ${y} L8 ${y} M6 ${y-1} L4 ${y} L6 ${y+1}`}
          stroke={designTokens.colors.semantic.stress}
          strokeWidth="1"
          initial={{ opacity: 0, x: -3 }}
          animate={{ opacity: 0.7, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
        />
      ))}
      {/* 地下部分 */}
      <motion.path
        d="M8 20 L10 22 L14 22 L16 20"
        strokeDasharray="2,2"
        opacity="0.6"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8, delay: 1.2 }}
      />
    </g>
  </IconContainer>
);

// ==================== 10. 支撑系统图标 ====================

export const StrutSystemIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.secondary[400],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 左侧围护结构 */}
      <motion.line
        x1="4" y1="6" x2="4" y2="18"
        strokeWidth="2"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8 }}
      />
      {/* 右侧围护结构 */}
      <motion.line
        x1="20" y1="6" x2="20" y2="18"
        strokeWidth="2"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.1 }}
      />
      {/* 水平支撑 */}
      {[9, 12, 15].map((y, i) => (
        <motion.g key={i}>
          <motion.line
            x1="4" y1={y} x2="20" y2={y}
            strokeWidth="2"
            initial={animated ? { scaleX: 0 } : {}}
            animate={animated ? { scaleX: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.3 + i * 0.2 }}
            style={{ transformOrigin: 'center' }}
          />
          {/* 支撑连接点 */}
          <motion.circle
            cx="4" cy={y} r="1.5"
            fill={color}
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
          />
          <motion.circle
            cx="20" cy={y} r="1.5"
            fill={color}
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
          />
        </motion.g>
      ))}
      {/* 预应力指示 */}
      {animated && (
        <motion.path
          d="M10 12 Q12 10 14 12"
          stroke={designTokens.colors.primary[400]}
          strokeDasharray="1,1"
          opacity="0.8"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, delay: 1.5 }}
        />
      )}
    </g>
  </IconContainer>
);

// ==================== 11. 锚杆系统图标 ====================

export const AnchorSystemIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.primary[400],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 围护墙 */}
      <motion.line
        x1="6" y1="4" x2="6" y2="20"
        strokeWidth="2"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 0.8 }}
      />
      {/* 锚杆 */}
      {[8, 12, 16].map((y, i) => (
        <motion.g key={i}>
          {/* 锚杆主体 */}
          <motion.line
            x1="6" y1={y} x2="18" y2={y}
            strokeWidth="2"
            initial={animated ? { pathLength: 0 } : {}}
            animate={animated ? { pathLength: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.3 + i * 0.2 }}
          />
          {/* 锚头 */}
          <motion.circle
            cx="6" cy={y} r="2"
            fill="none"
            strokeWidth="1"
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.8 + i * 0.1 }}
          />
          {/* 锚固段 */}
          <motion.circle
            cx="18" cy={y} r="3"
            fill={color}
            opacity="0.3"
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ duration: 0.5, delay: 1.0 + i * 0.1 }}
          />
          {/* 预应力波纹 */}
          {animated && (
            <motion.path
              d={`M8 ${y} Q10 ${y-1} 12 ${y} Q14 ${y+1} 16 ${y}`}
              stroke={designTokens.colors.accent[400]}
              strokeWidth="0.5"
              opacity="0.6"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: [0, 1, 0] }}
              transition={{ 
                duration: 2, 
                delay: 1.5 + i * 0.3,
                repeat: Infinity,
                repeatDelay: 3
              }}
            />
          )}
        </motion.g>
      ))}
    </g>
  </IconContainer>
);

// ==================== 12. 土层分析图标 ====================

export const SoilLayerIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.material,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 土层分界线 */}
      {[
        { y: 6, pattern: "none", opacity: 1 },
        { y: 10, pattern: "2,2", opacity: 0.8 },
        { y: 14, pattern: "4,2", opacity: 0.8 },
        { y: 18, pattern: "2,1", opacity: 0.8 }
      ].map((layer, i) => (
        <motion.g key={i}>
          <motion.line
            x1="2" y1={layer.y} x2="22" y2={layer.y}
            strokeDasharray={layer.pattern}
            opacity={layer.opacity}
            initial={animated ? { pathLength: 0 } : {}}
            animate={animated ? { pathLength: 1 } : {}}
            transition={{ duration: 1, delay: i * 0.2 }}
          />
          {/* 土层标识 */}
          {animated && (
            <motion.text
              x="1" y={layer.y - 1}
              fontSize="6"
              fill={color}
              opacity="0.6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
            >
              {i + 1}
            </motion.text>
          )}
        </motion.g>
      ))}
      {/* SPT取样点 */}
      {animated && [8, 16].map((x, i) => (
        <motion.g key={i}>
          <motion.line
            x1={x} y1="2" x2={x} y2="20"
            strokeDasharray="1,3"
            opacity="0.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.5, delay: 1 + i * 0.3 }}
          />
          <motion.text
            x={x - 2} y="22"
            fontSize="6"
            fill={color}
            opacity="0.7"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.7 }}
            transition={{ duration: 0.5, delay: 2 + i * 0.1 }}
          >
            SPT
          </motion.text>
        </motion.g>
      ))}
    </g>
  </IconContainer>
);

// ==================== 13. 渗流分析图标 ====================

export const SeepageAnalysisIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.secondary[500],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 地下水位线 */}
      <motion.path
        d="M2 8 Q6 6 12 7 Q18 8 22 6"
        stroke={designTokens.colors.secondary[300]}
        strokeWidth="2"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5 }}
      />
      {/* 渗流线 */}
      {[
        { path: "M4 10 Q8 12 12 14 Q16 16 20 18", delay: 0.5 },
        { path: "M6 12 Q10 14 14 16 Q18 18 22 20", delay: 0.7 },
        { path: "M8 14 Q12 16 16 18 Q20 20 22 22", delay: 0.9 }
      ].map((flow, i) => (
        <motion.path
          key={i}
          d={flow.path}
          strokeDasharray="2,2"
          opacity="0.7"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 1.2, delay: flow.delay }}
        />
      ))}
      {/* 水流方向箭头 */}
      {animated && [
        { x: 8, y: 12, angle: 30 },
        { x: 12, y: 15, angle: 20 },
        { x: 16, y: 18, angle: 15 }
      ].map((arrow, i) => (
        <motion.g key={i}>
          <motion.path
            d={`M${arrow.x-1} ${arrow.y-0.5} L${arrow.x+1} ${arrow.y} L${arrow.x-1} ${arrow.y+0.5}`}
            fill={color}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 0.8, scale: 1 }}
            transition={{ duration: 0.4, delay: 1.5 + i * 0.2 }}
            style={{ transformOrigin: `${arrow.x}px ${arrow.y}px` }}
          />
        </motion.g>
      ))}
      {/* 基坑轮廓 */}
      <motion.path
        d="M8 8 L16 8 L15 16 L9 16 Z"
        stroke={designTokens.colors.primary[400]}
        strokeWidth="1"
        strokeDasharray="3,1"
        opacity="0.5"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
      />
    </g>
  </IconContainer>
);

// ==================== 14. 稳定性分析图标 ====================

export const StabilityAnalysisIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.safety,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 边坡轮廓 */}
      <motion.path
        d="M2 20 L2 12 L6 8 L12 6 L18 8 L22 12 L22 20"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5 }}
      />
      {/* 潜在滑动面 */}
      <motion.path
        d="M4 14 Q8 18 12 16 Q16 14 20 16"
        stroke={designTokens.colors.semantic.warning}
        strokeDasharray="3,2"
        opacity="0.8"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.2, delay: 0.5 }}
      />
      {/* 安全系数指示 */}
      {animated && (
        <motion.g>
          <motion.circle
            cx="12" cy="12" r="3"
            fill="none"
            stroke={designTokens.colors.semantic.success}
            strokeDasharray="1,1"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 0.6 }}
            transition={{ duration: 0.8, delay: 1 }}
          />
          <motion.text
            x="12" y="13"
            fontSize="8"
            fill={color}
            textAnchor="middle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 1.5 }}
          >
            FS
          </motion.text>
        </motion.g>
      )}
      {/* 力向量 */}
      {animated && [
        { x: 8, y: 10, dx: 1, dy: 2 },
        { x: 12, y: 8, dx: 0, dy: 2 },
        { x: 16, y: 10, dy: 2, dx: -1 }
      ].map((force, i) => (
        <motion.path
          key={i}
          d={`M${force.x} ${force.y} L${force.x + force.dx} ${force.y + force.dy} M${force.x + force.dx - 0.5} ${force.y + force.dy - 0.5} L${force.x + force.dx} ${force.y + force.dy} L${force.x + force.dx + 0.5} ${force.y + force.dy - 0.5}`}
          stroke={designTokens.colors.accent[400]}
          strokeWidth="1"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ duration: 0.5, delay: 1.8 + i * 0.1 }}
        />
      ))}
    </g>
  </IconContainer>
);

// ==================== 15. 监测系统图标 ====================

export const MonitoringSystemIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.primary[500],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 基坑轮廓 */}
      <motion.path
        d="M8 6 L16 6 L15 16 L9 16 Z"
        strokeWidth="1"
        opacity="0.5"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1 }}
      />
      {/* 监测点 */}
      {[
        { x: 8, y: 6, type: 'inclinometer' },
        { x: 16, y: 6, type: 'inclinometer' },
        { x: 6, y: 11, type: 'settlement' },
        { x: 18, y: 11, type: 'settlement' },
        { x: 12, y: 18, type: 'groundwater' }
      ].map((point, i) => (
        <motion.g key={i}>
          <motion.circle
            cx={point.x} cy={point.y} r="1.5"
            fill={color}
            initial={animated ? { scale: 0 } : {}}
            animate={animated ? { scale: 1 } : {}}
            transition={{ duration: 0.4, delay: 0.5 + i * 0.2 }}
          />
          {/* 信号传输 */}
          {animated && (
            <motion.circle
              cx={point.x} cy={point.y} r="3"
              fill="none"
              stroke={color}
              strokeWidth="0.5"
              opacity="0.4"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ 
                scale: [0, 1.5, 0],
                opacity: [0, 0.6, 0]
              }}
              transition={{ 
                duration: 2,
                delay: 1.5 + i * 0.3,
                repeat: Infinity,
                repeatDelay: 3
              }}
            />
          )}
        </motion.g>
      ))}
      {/* 数据传输线 */}
      <motion.path
        d="M8 6 Q12 2 16 6 Q18 8 18 11 Q15 14 12 18 Q9 14 6 11 Q6 8 8 6"
        stroke={designTokens.colors.secondary[400]}
        strokeWidth="0.5"
        strokeDasharray="2,2"
        opacity="0.6"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 2, delay: 1 }}
      />
      {/* 控制中心 */}
      <motion.rect
        x="10" y="1" width="4" height="2" rx="0.5"
        fill={color}
        opacity="0.7"
        initial={animated ? { scale: 0 } : {}}
        animate={animated ? { scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 2 }}
      />
    </g>
  </IconContainer>
);

// ==================== 16. 施工工艺图标 ====================

export const ConstructionProcessIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.accent[400],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 挖掘机 */}
      <motion.g
        initial={animated ? { x: -10, opacity: 0 } : {}}
        animate={animated ? { x: 0, opacity: 1 } : {}}
        transition={{ duration: 1 }}
      >
        {/* 机身 */}
        <motion.rect
          x="2" y="12" width="6" height="4" rx="1"
          fill={color}
          opacity="0.3"
        />
        {/* 履带 */}
        <motion.ellipse
          cx="3" cy="17" rx="1.5" ry="0.5"
          fill={color}
          opacity="0.5"
        />
        <motion.ellipse
          cx="7" cy="17" rx="1.5" ry="0.5"
          fill={color}
          opacity="0.5"
        />
        {/* 挖掘臂 */}
        <motion.path
          d="M8 14 L12 10 L16 8"
          strokeWidth="2"
          initial={animated ? { pathLength: 0 } : {}}
          animate={animated ? { pathLength: 1 } : {}}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
        {/* 挖斗 */}
        <motion.path
          d="M16 8 L18 6 L20 8 L18 10 Z"
          fill={color}
          opacity="0.6"
          initial={animated ? { scale: 0 } : {}}
          animate={animated ? { scale: 1 } : {}}
          transition={{ duration: 0.5, delay: 1 }}
        />
      </motion.g>
      
      {/* 基坑开挖轮廓 */}
      <motion.path
        d="M10 20 L10 15 L14 15 L14 20"
        strokeDasharray="2,2"
        opacity="0.7"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.3 }}
      />
      
      {/* 土方运输轨迹 */}
      {animated && (
        <motion.path
          d="M18 9 Q20 6 22 4"
          stroke={designTokens.colors.semantic.material}
          strokeWidth="1"
          strokeDasharray="1,1"
          opacity="0.5"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: [0, 1, 0] }}
          transition={{ 
            duration: 2,
            delay: 1.5,
            repeat: Infinity,
            repeatDelay: 2
          }}
        />
      )}
    </g>
  </IconContainer>
);

// ==================== 导出工程图标 ====================

export const EngineeringIcons = {
  RetainingWall: RetainingWallIcon,
  StrutSystem: StrutSystemIcon,
  AnchorSystem: AnchorSystemIcon,
  SoilLayer: SoilLayerIcon,
  SeepageAnalysis: SeepageAnalysisIcon,
  StabilityAnalysis: StabilityAnalysisIcon,
  MonitoringSystem: MonitoringSystemIcon,
  ConstructionProcess: ConstructionProcessIcon
};

export default EngineeringIcons;