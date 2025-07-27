/**
 * DeepCAD 功能模块图标系统
 * 1号架构师 - 20个专业CAE功能图标
 */

import React from 'react';
import { motion } from 'framer-motion';
import { designTokens } from '../../design/tokens';

// ==================== 图标基础类型 ====================

export interface IconProps {
  size?: number | string;
  color?: string;
  animated?: boolean;
  glowing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

// 尺寸转换函数
export const getSizeValue = (size: number | string): number => {
  if (typeof size === 'number') return size;
  switch (size) {
    case 'xs': return 16;
    case 'sm': return 20;
    case 'md': return 24;
    case 'lg': return 32;
    case 'xl': return 40;
    case '2xl': return 48;
    default: return 24;
  }
};

// 默认图标属性
const DEFAULT_ICON_PROPS = {
  size: 24,
  color: designTokens.colors.primary[400],
  animated: true,
  glowing: false,
  className: '',
  style: {}
};

// ==================== 简化图标组件（临时修复）====================

const SimpleIconComponent: React.FC<IconProps & { children: React.ReactNode }> = ({ 
  size = 24, 
  color = '#00d9ff',
  children,
  className = '',
  style = {},
  ...props
}) => {
  const numericSize = getSizeValue(size);
  
  return (
    <div
      className={`deepcad-icon ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      {...props}
    >
      <svg
        width={numericSize}
        height={numericSize}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ color }}
      >
        {children}
      </svg>
    </div>
  );
};

// ==================== 图标容器组件 ====================

const IconContainer: React.FC<{
  children: React.ReactNode;
  size: number | string;
  animated: boolean;
  glowing: boolean;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, size, animated, glowing, className = '', style = {} }) => {
  const numericSize = getSizeValue(size);
  return (
    <motion.div
      className={`deepcad-icon ${className}`}
      style={{
        width: numericSize,
        height: numericSize,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
      initial={animated ? { opacity: 0, scale: 0.8 } : {}}
      animate={animated ? { opacity: 1, scale: 1 } : {}}
      whileHover={animated ? { scale: 1.1 } : {}}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <motion.svg
        width={numericSize}
        height={numericSize}
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

// ==================== 1. 地质建模图标 ====================

export const GeologyModelingIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.material,
  animated = false,
  glowing = false,
  ...props
}) => {
  const numericSize = getSizeValue(size);
  return (
  <IconContainer size={numericSize} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 地质分层 */}
      <motion.path
        d="M2 20 Q6 18 12 19 Q18 20 22 18"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0 }}
      />
      <motion.path
        d="M2 16 Q6 14 12 15 Q18 16 22 14"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
      />
      <motion.path
        d="M2 12 Q6 10 12 11 Q18 12 22 10"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.4 }}
      />
      <motion.path
        d="M2 8 Q6 6 12 7 Q18 8 22 6"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.6 }}
      />
      {/* 钻孔点 */}
      {animated && [4, 12, 20].map((x, i) => (
        <motion.circle
          key={i}
          cx={x}
          cy="4"
          r="1"
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, delay: 0.8 + i * 0.1 }}
        />
      ))}
    </g>
  </IconContainer>
  );
};

// ==================== 2. 基坑设计图标 ====================

export const ExcavationDesignIcon: React.FC<IconProps> = ({ 
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
        d="M6 8 L18 8 L17 18 L7 18 Z"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.2, ease: "easeInOut" }}
      />
      {/* 围护结构 */}
      <motion.line
        x1="6" y1="8" x2="7" y2="18"
        initial={animated ? { opacity: 0 } : {}}
        animate={animated ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      <motion.line
        x1="18" y1="8" x2="17" y2="18"
        initial={animated ? { opacity: 0 } : {}}
        animate={animated ? { opacity: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
      {/* 支撑系统 */}
      {[11, 14].map((y, i) => (
        <motion.line
          key={i}
          x1="7" y1={y} x2="17" y2={y}
          strokeDasharray="2,2"
          initial={animated ? { scaleX: 0 } : {}}
          animate={animated ? { scaleX: 1 } : {}}
          transition={{ duration: 0.4, delay: 0.8 + i * 0.2 }}
          style={{ transformOrigin: 'center' }}
        />
      ))}
    </g>
  </IconContainer>
);

// ==================== 3. GPU计算图标 ====================

export const GPUComputingIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.secondary[500],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* GPU芯片 */}
      <motion.rect
        x="6" y="6" width="12" height="12" rx="2"
        initial={animated ? { opacity: 0, scale: 0.5 } : {}}
        animate={animated ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.8 }}
      />
      {/* 内部核心 */}
      <motion.rect
        x="8" y="8" width="8" height="8" rx="1"
        fill={animated ? color : 'none'}
        opacity="0.3"
        initial={animated ? { opacity: 0 } : {}}
        animate={animated ? { opacity: 0.3 } : {}}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      {/* 数据流 */}
      {animated && [
        { x1: 3, y1: 12, x2: 6, y2: 12 },
        { x1: 18, y1: 12, x2: 21, y2: 12 },
        { x1: 12, y1: 3, x2: 12, y2: 6 },
        { x1: 12, y1: 18, x2: 12, y2: 21 }
      ].map((line, i) => (
        <motion.line
          key={i}
          {...line}
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ 
            pathLength: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 1.5,
            delay: 0.5 + i * 0.2,
            repeat: Infinity,
            repeatDelay: 2
          }}
        />
      ))}
    </g>
  </IconContainer>
);

// ==================== 4. 网格生成图标 ====================

export const MeshGenerationIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.accent[500],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.2" fill="none">
      {/* 三角网格 */}
      {[
        [4, 4, 12, 4, 8, 10],
        [12, 4, 20, 4, 16, 10],
        [8, 10, 16, 10, 12, 16],
        [4, 10, 12, 10, 8, 16],
        [12, 10, 20, 10, 16, 16],
        [8, 16, 16, 16, 12, 20]
      ].map((triangle, i) => (
        <motion.path
          key={i}
          d={`M${triangle[0]} ${triangle[1]} L${triangle[2]} ${triangle[3]} L${triangle[4]} ${triangle[5]} Z`}
          initial={animated ? { pathLength: 0, opacity: 0 } : {}}
          animate={animated ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 0.5, delay: i * 0.1 }}
        />
      ))}
      {/* 节点 */}
      {animated && [
        [4, 4], [12, 4], [20, 4], [8, 10], [16, 10],
        [4, 10], [12, 10], [20, 10], [8, 16], [16, 16], [12, 20]
      ].map((point, i) => (
        <motion.circle
          key={i}
          cx={point[0]}
          cy={point[1]}
          r="1"
          fill={color}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: 0.8 + i * 0.05 }}
        />
      ))}
    </g>
  </IconContainer>
);

// ==================== 5. 有限元分析图标 ====================

export const FEAAnalysisIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.computing,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 结构轮廓 */}
      <motion.path
        d="M4 20 L4 8 L12 8 L12 12 L20 12 L20 20"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1.5 }}
      />
      {/* 应力分布 */}
      {animated && [
        { path: "M6 18 Q8 16 10 18", delay: 0.5 },
        { path: "M14 16 Q16 14 18 16", delay: 0.7 },
        { path: "M6 14 Q8 12 10 14", delay: 0.9 }
      ].map((item, i) => (
        <motion.path
          key={i}
          d={item.path}
          stroke={designTokens.colors.semantic.stress}
          strokeDasharray="2,2"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 0.8 }}
          transition={{ duration: 0.8, delay: item.delay }}
        />
      ))}
      {/* 载荷箭头 */}
      <motion.path
        d="M12 4 L12 8 M10 6 L12 4 L14 6"
        stroke={designTokens.colors.semantic.boundary}
        strokeWidth="2"
        initial={animated ? { opacity: 0, y: -5 } : {}}
        animate={animated ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.5, delay: 1.2 }}
      />
    </g>
  </IconContainer>
);

// ==================== 6. 结果可视化图标 ====================

export const ResultVisualizationIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.success,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 等值线图 */}
      <motion.ellipse
        cx="12" cy="12" rx="8" ry="6"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1 }}
      />
      <motion.ellipse
        cx="12" cy="12" rx="6" ry="4.5"
        opacity="0.7"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.2 }}
      />
      <motion.ellipse
        cx="12" cy="12" rx="4" ry="3"
        opacity="0.5"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1, delay: 0.4 }}
      />
      {/* 中心点 */}
      <motion.circle
        cx="12" cy="12" r="1.5"
        fill={color}
        initial={animated ? { opacity: 0, scale: 0 } : {}}
        animate={animated ? { opacity: 1, scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.8 }}
      />
      {/* 数值标签 */}
      {animated && (
        <motion.text
          x="16" y="8"
          fontSize="8"
          fill={color}
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ duration: 0.5, delay: 1 }}
        >
          Max
        </motion.text>
      )}
    </g>
  </IconContainer>
);

// ==================== 7. 3D可视化图标 ====================

export const Visualization3DIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.primary[400],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 3D立方体 */}
      <motion.path
        d="M8 6 L16 6 L20 10 L12 10 Z"
        initial={animated ? { opacity: 0, y: -5 } : {}}
        animate={animated ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8 }}
      />
      <motion.path
        d="M8 6 L8 14 L12 18 L12 10 Z"
        initial={animated ? { opacity: 0, x: -5 } : {}}
        animate={animated ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.path
        d="M16 6 L16 14 L20 18 L20 10 Z"
        initial={animated ? { opacity: 0, x: 5 } : {}}
        animate={animated ? { opacity: 1, x: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      <motion.path
        d="M8 14 L16 14 L20 18 L12 18 Z"
        initial={animated ? { opacity: 0, y: 5 } : {}}
        animate={animated ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.8, delay: 0.6 }}
      />
      {/* 旋转指示器 */}
      {animated && (
        <motion.circle
          cx="12" cy="12" r="10"
          stroke={color}
          strokeWidth="0.5"
          strokeDasharray="2,4"
          opacity="0.3"
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ transformOrigin: '12px 12px' }}
        />
      )}
    </g>
  </IconContainer>
);

// ==================== 8. 材料属性图标 ====================

export const MaterialPropertiesIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.material,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      {/* 材料层 */}
      <motion.rect
        x="4" y="8" width="16" height="3" rx="1"
        fill={color}
        opacity="0.2"
        initial={animated ? { scaleX: 0 } : {}}
        animate={animated ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8 }}
      />
      <motion.rect
        x="4" y="12" width="16" height="3" rx="1"
        fill={color}
        opacity="0.4"
        initial={animated ? { scaleX: 0 } : {}}
        animate={animated ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.rect
        x="4" y="16" width="16" height="3" rx="1"
        fill={color}
        opacity="0.6"
        initial={animated ? { scaleX: 0 } : {}}
        animate={animated ? { scaleX: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
      {/* 属性指示器 */}
      {animated && [
        { x: 22, y: 9.5, label: 'E' },
        { x: 22, y: 13.5, label: 'ν' },
        { x: 22, y: 17.5, label: 'ρ' }
      ].map((item, i) => (
        <motion.text
          key={i}
          x={item.x}
          y={item.y}
          fontSize="6"
          fill={color}
          textAnchor="start"
          dominantBaseline="middle"
          initial={{ opacity: 0, x: -5 }}
          animate={{ opacity: 0.8, x: 0 }}
          transition={{ duration: 0.5, delay: 0.8 + i * 0.1 }}
        >
          {item.label}
        </motion.text>
      ))}
    </g>
  </IconContainer>
);

// ==================== 9. 材料库图标 ====================

export const MaterialLibraryIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.material,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      <motion.rect
        x="4" y="4" width="4" height="16" rx="1"
        fill={color}
        opacity="0.3"
        initial={animated ? { scaleY: 0 } : {}}
        animate={animated ? { scaleY: 1 } : {}}
        transition={{ duration: 0.8 }}
      />
      <motion.rect
        x="10" y="6" width="4" height="14" rx="1"
        fill={color}
        opacity="0.5"
        initial={animated ? { scaleY: 0 } : {}}
        animate={animated ? { scaleY: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.2 }}
      />
      <motion.rect
        x="16" y="8" width="4" height="12" rx="1"
        fill={color}
        opacity="0.7"
        initial={animated ? { scaleY: 0 } : {}}
        animate={animated ? { scaleY: 1 } : {}}
        transition={{ duration: 0.8, delay: 0.4 }}
      />
    </g>
  </IconContainer>
);

// ==================== 10. 结构分析图标 ====================

export const StructuralAnalysisIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.semantic.computing,
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      <motion.path
        d="M4 20 L20 4"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1 }}
      />
      <motion.circle
        cx="12" cy="12" r="3"
        initial={animated ? { scale: 0 } : {}}
        animate={animated ? { scale: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
    </g>
  </IconContainer>
);

// ==================== 11. 界面设计图标 ====================

export const InterfaceDesignIcon: React.FC<IconProps> = ({ 
  size = 24, 
  color = designTokens.colors.primary[400],
  animated = false,
  glowing = false,
  ...props
}) => (
  <IconContainer size={size} animated={animated} glowing={glowing} {...props}>
    <g stroke={color} strokeWidth="1.5" fill="none">
      <motion.rect
        x="3" y="5" width="18" height="14" rx="2"
        initial={animated ? { pathLength: 0 } : {}}
        animate={animated ? { pathLength: 1 } : {}}
        transition={{ duration: 1 }}
      />
      <motion.line
        x1="3" y1="9" x2="21" y2="9"
        initial={animated ? { scaleX: 0 } : {}}
        animate={animated ? { scaleX: 1 } : {}}
        transition={{ duration: 0.5, delay: 0.5 }}
      />
    </g>
  </IconContainer>
);

// ==================== 导出所有图标 ====================

export const FunctionalIcons = {
  GeologyModeling: GeologyModelingIcon,
  ExcavationDesign: ExcavationDesignIcon,
  GPUComputing: GPUComputingIcon,
  MeshGeneration: MeshGenerationIcon,
  FEAAnalysis: FEAAnalysisIcon,
  ResultVisualization: ResultVisualizationIcon,
  Visualization3D: Visualization3DIcon,
  MaterialProperties: MaterialPropertiesIcon,
  MaterialLibrary: MaterialLibraryIcon,
  StructuralAnalysis: StructuralAnalysisIcon,
  InterfaceDesign: InterfaceDesignIcon
};

export default FunctionalIcons;