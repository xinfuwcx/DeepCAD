/**
 * DeepCAD 简化图标系统
 * 1号架构师 - 修复SVG错误的简单图标
 */

import React from 'react';

export interface SimpleIconProps {
  size?: number | string;
  color?: string;
  className?: string;
}

// 尺寸转换函数
const getSizeValue = (size: number | string): number => {
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

const SimpleIcon: React.FC<SimpleIconProps & { children: React.ReactNode }> = ({ 
  size = 24, 
  color = '#3b82f6', 
  className = '',
  children 
}) => {
  const numericSize = getSizeValue(size);
  return (
    <div className={className} style={{ width: numericSize, height: numericSize, display: 'inline-flex' }}>
      <svg width={numericSize} height={numericSize} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
        {children}
      </svg>
    </div>
  );
};

// 简化版功能图标
export const GeologyModeling: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <path d="M2 20 L22 18" />
    <path d="M2 16 L22 14" />
    <path d="M2 12 L22 10" />
    <circle cx="8" cy="8" r="2" />
    <circle cx="16" cy="6" r="2" />
  </SimpleIcon>
);

export const ExcavationDesign: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <rect x="4" y="10" width="16" height="10" />
    <path d="M4 10 L12 4 L20 10" />
    <line x1="8" y1="14" x2="16" y2="14" />
    <line x1="8" y1="17" x2="16" y2="17" />
  </SimpleIcon>
);

export const GPUComputing: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <rect x="3" y="8" width="18" height="8" />
    <line x1="7" y1="10" x2="7" y2="14" />
    <line x1="12" y1="10" x2="12" y2="14" />
    <line x1="17" y1="10" x2="17" y2="14" />
    <circle cx="12" cy="5" r="2" />
  </SimpleIcon>
);

export const InterfaceDesign: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <rect x="3" y="3" width="18" height="14" />
    <line x1="3" y1="8" x2="21" y2="8" />
    <circle cx="7" cy="5.5" r="0.5" />
    <circle cx="9" cy="5.5" r="0.5" />
    <circle cx="11" cy="5.5" r="0.5" />
  </SimpleIcon>
);

export const MeshGeneration: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
    <line x1="12" y1="2" x2="12" y2="22" />
    <line x1="2" y1="8.5" x2="22" y2="15.5" />
    <line x1="2" y1="15.5" x2="22" y2="8.5" />
  </SimpleIcon>
);

export const MaterialLibrary: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <rect x="4" y="4" width="16" height="16" />
    <rect x="8" y="8" width="8" height="8" />
    <line x1="4" y1="12" x2="8" y2="12" />
    <line x1="16" y1="12" x2="20" y2="12" />
    <line x1="12" y1="4" x2="12" y2="8" />
    <line x1="12" y1="16" x2="12" y2="20" />
  </SimpleIcon>
);

export const StructuralAnalysis: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <path d="M12 2 L22 12 L12 22 L2 12 Z" />
    <circle cx="12" cy="12" r="3" />
    <line x1="12" y1="9" x2="12" y2="15" />
    <line x1="9" y1="12" x2="15" y2="12" />
  </SimpleIcon>
);

export const ConstructionProgress: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <rect x="6" y="10" width="12" height="10" />
    <path d="M6 10 L12 4 L18 10" />
    <rect x="8" y="12" width="2" height="6" />
    <rect x="11" y="14" width="2" height="4" />
    <rect x="14" y="16" width="2" height="2" />
  </SimpleIcon>
);

// 简化版状态图标
export const Computing: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1 L12 3" />
    <path d="M12 21 L12 23" />
    <path d="M4.22 4.22 L5.64 5.64" />
    <path d="M18.36 18.36 L19.78 19.78" />
    <path d="M1 12 L3 12" />
    <path d="M21 12 L23 12" />
    <path d="M4.22 19.78 L5.64 18.36" />
    <path d="M18.36 5.64 L19.78 4.22" />
  </SimpleIcon>
);

export const Completed: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <path d="M9 12 L11 14 L15 10" />
  </SimpleIcon>
);

export const Warning: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <path d="M10.29 3.86 L1.82 18 A2 2 0 0 0 3.54 21 L20.46 21 A2 2 0 0 0 22.18 18 L13.71 3.86 A2 2 0 0 0 10.29 3.86 Z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <circle cx="12" cy="17" r="1" />
  </SimpleIcon>
);

export const Error: React.FC<SimpleIconProps> = (props) => (
  <SimpleIcon {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </SimpleIcon>
);

// 导出所有图标的对象
export const FunctionalIcons = {
  GeologyModeling,
  ExcavationDesign,
  GPUComputing,
  InterfaceDesign,
  MeshGeneration,
  MaterialLibrary,
  StructuralAnalysis,
  ConstructionProgress
};

export const StatusIcons = {
  Computing,
  Completed,
  Warning,
  Error
};