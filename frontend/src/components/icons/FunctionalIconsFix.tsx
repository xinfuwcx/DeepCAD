/**
 * DeepCAD 功能模块图标系统 - 修复版本
 * 1号架构师 - 修复SVG尺寸错误
 */

import React from 'react';
import { motion } from 'framer-motion';

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

// 简化图标组件 - 避免复杂动画引起的问题
export const SimpleIcon: React.FC<IconProps & { children: React.ReactNode }> = ({ 
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

// ==================== 简化图标组件 ====================

export const GeologyModelingIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M2 20 Q6 18 12 19 Q18 20 22 18" />
      <path d="M2 16 Q6 14 12 15 Q18 16 22 14" />
      <path d="M2 12 Q6 10 12 11 Q18 12 22 10" />
      <path d="M2 8 Q6 6 12 7 Q18 8 22 6" />
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <circle cx="12" cy="4" r="1" fill="currentColor" />
      <circle cx="20" cy="4" r="1" fill="currentColor" />
    </g>
  </SimpleIcon>
);

export const ExcavationDesignIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="12" width="18" height="8" rx="1" />
      <path d="M6 12V8a2 2 0 012-2h8a2 2 0 012 2v4" />
      <line x1="3" y1="16" x2="21" y2="16" />
      <line x1="7" y1="20" x2="7" y2="16" />
      <line x1="12" y1="20" x2="12" y2="16" />
      <line x1="17" y1="20" x2="17" y2="16" />
    </g>
  </SimpleIcon>
);

export const MeshGenerationIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
      <polygon points="12,8 18,12 12,16 6,12" />
      <line x1="12" y1="2" x2="12" y2="8" />
      <line x1="22" y1="8.5" x2="18" y2="12" />
      <line x1="22" y1="15.5" x2="18" y2="12" />
      <line x1="12" y1="22" x2="12" y2="16" />
      <line x1="2" y1="15.5" x2="6" y2="12" />
      <line x1="2" y1="8.5" x2="6" y2="12" />
    </g>
  </SimpleIcon>
);

export const FEAAnalysisIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-2" />
      <path d="M9 9l.01 0" />
      <path d="M9 12l.01 0" />
      <path d="M9 15l.01 0" />
      <path d="M9 18l.01 0" />
    </g>
  </SimpleIcon>
);

export const StructuralAnalysisIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
      <path d="M9 1v3" />
      <path d="M15 1v3" />
      <path d="M9 20v3" />
      <path d="M15 20v3" />
      <path d="M20 9h3" />
      <path d="M20 15h3" />
      <path d="M1 9h3" />
      <path d="M1 15h3" />
    </g>
  </SimpleIcon>
);

export const GPUComputingIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <rect x="4" y="8" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="8" rx="1" />
      <rect x="16" y="8" width="4" height="8" rx="1" />
      <path d="M6 4v2" />
      <path d="M12 4v2" />
      <path d="M18 4v2" />
    </g>
  </SimpleIcon>
);

export const AIOptimizationIcon: React.FC<IconProps> = (props) => (
  <SimpleIcon {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v6" />
      <path d="M12 17v6" />
      <path d="m4.93 4.93 4.24 4.24" />
      <path d="m14.83 14.83 4.24 4.24" />
      <path d="M1 12h6" />
      <path d="M17 12h6" />
      <path d="m4.93 19.07 4.24-4.24" />
      <path d="m14.83 9.17 4.24-4.24" />
    </g>
  </SimpleIcon>
);

// 导出所有图标
export {
  SimpleIcon as IconContainer
};