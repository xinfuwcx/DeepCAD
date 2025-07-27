/**
 * DeepCAD 功能模块图标系统 - 快速修复版本
 * 临时解决SVG尺寸错误问题
 */

import React from 'react';

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

// 简化图标组件
const SimpleIcon: React.FC<IconProps & { children: React.ReactNode }> = ({ 
  size = 24, 
  color = '#00d9ff',
  children,
  className = '',
  style = {},
  animated,  // 提取出来，不传递到DOM
  glowing,   // 提取出来，不传递到DOM
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

// 简化的图标组件
export const GeologyModelingIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M2 20 Q6 18 12 19 Q18 20 22 18" />
      <path d="M2 16 Q6 14 12 15 Q18 16 22 14" />
      <path d="M2 12 Q6 10 12 11 Q18 12 22 10" />
      <circle cx="4" cy="4" r="1" fill="currentColor" />
      <circle cx="12" cy="4" r="1" fill="currentColor" />
      <circle cx="20" cy="4" r="1" fill="currentColor" />
    </g>
  </SimpleIcon>
);

export const ExcavationDesignIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="12" width="18" height="8" rx="1" />
      <path d="M6 12V8a2 2 0 012-2h8a2 2 0 012 2v4" />
      <line x1="3" y1="16" x2="21" y2="16" />
    </g>
  </SimpleIcon>
);

export const GPUComputingIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="2" y="6" width="20" height="12" rx="2" />
      <rect x="4" y="8" width="4" height="8" rx="1" />
      <rect x="10" y="8" width="4" height="8" rx="1" />
      <rect x="16" y="8" width="4" height="8" rx="1" />
    </g>
  </SimpleIcon>
);

export const MeshGenerationIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
      <polygon points="12,8 18,12 12,16 6,12" />
    </g>
  </SimpleIcon>
);

export const FEAAnalysisIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M3 21h18" />
      <path d="M5 21V7l8-4v18" />
      <path d="M19 21V11l-6-2" />
    </g>
  </SimpleIcon>
);

export const ResultVisualizationIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M3 3v18h18" />
      <path d="M7 12l4-4 4 4 4-4" />
    </g>
  </SimpleIcon>
);

export const Visualization3DIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M12 2l8 4v12l-8 4-8-4V6z" />
      <path d="M12 22V12" />
      <path d="M20 6l-8 4" />
      <path d="M4 6l8 4" />
    </g>
  </SimpleIcon>
);

export const MaterialPropertiesIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 9h6v6H9z" />
    </g>
  </SimpleIcon>
);

export const MaterialLibraryIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </g>
  </SimpleIcon>
);

export const StructuralAnalysisIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M9 9h6v6H9z" />
    </g>
  </SimpleIcon>
);

export const InterfaceDesignIcon: React.FC<IconProps> = ({ size, ...props }) => (
  <SimpleIcon size={size || 24} {...props}>
    <g stroke="currentColor" strokeWidth="1.5" fill="none">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
    </g>
  </SimpleIcon>
);

// 导出图标集合对象
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