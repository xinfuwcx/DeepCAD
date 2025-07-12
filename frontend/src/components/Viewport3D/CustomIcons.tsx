/**
 * 自定义炫酷图标组件
 * 为工具栏提供专业的3D/CAD风格图标
 */

import React from 'react';
import { createFromIconfontCN } from '@ant-design/icons';

// 创建图标字体组件（可选，如果有自定义图标字体）
const IconFont = createFromIconfontCN({
  scriptUrl: '//at.alicdn.com/t/font_8d5l8fzk5b87iudi.js', // 可以替换为实际的图标字体URL
});

// SVG图标组件
export const CustomSelectIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M3 3h6v2H3V3zm0 4h6v2H3V7zm0 4h6v2H3v-2zm8-6.17l1.41-1.41L18 5.01 16.59 6.42 12.41 2.24 11 3.66l5.17 5.17-1.58 1.58 1.41 1.41 4-4L18.59 6.41 20 5l-1.41-1.41L12 10.17z"/>
    <circle cx="5" cy="5" r="1" opacity="0.5"/>
    <circle cx="5" cy="9" r="1" opacity="0.5"/>
    <circle cx="5" cy="13" r="1" opacity="0.5"/>
  </svg>
);

export const CustomOrbitIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <defs>
      <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="8" fill="none" stroke="url(#orbitGradient)" strokeWidth="1.5" strokeDasharray="2,2"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="4" r="2" fill="currentColor">
      <animateTransform
        attributeName="transform"
        attributeType="XML"
        type="rotate"
        from="0 12 12"
        to="360 12 12"
        dur="4s"
        repeatCount="indefinite"/>
    </circle>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const CustomPanIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M12,2A2,2 0 0,1 14,4A2,2 0 0,1 12,6A2,2 0 0,1 10,4A2,2 0 0,1 12,2M21,9V7L14,14L16,16M15,10V8L8,15L10,17M9,11V9L2,16L4,18M15,8A2,2 0 0,1 17,10A2,2 0 0,1 15,12A2,2 0 0,1 13,10A2,2 0 0,1 15,8Z"/>
    <g transform="translate(-2,-2)">
      <path d="M14 6l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M10 18l-3-3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M6 10l-3-3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
      <path d="M18 14l3-3-3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6"/>
    </g>
  </svg>
);

export const CustomZoomIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="21 21l-4.35-4.35"/>
    <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="2"/>
    <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="2"/>
    <circle cx="11" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
  </svg>
);

export const CustomFitIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
    <rect x="6" y="6" width="12" height="12" rx="1" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.6"/>
    <path d="M9 9l6 0 0 6" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
    <circle cx="15" cy="15" r="1" fill="currentColor"/>
    <path d="M8 16l8-8" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="1,1"/>
  </svg>
);

export const CustomResetIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12H20A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4V7L16,3L12,2Z"/>
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.5"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const CustomMeasureIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2"/>
    <circle cx="4" cy="20" r="2" fill="currentColor"/>
    <circle cx="20" cy="4" r="2" fill="currentColor"/>
    <text x="12" y="10" fontSize="8" fill="currentColor" textAnchor="middle" opacity="0.8">D</text>
    <path d="M6 18l2-2" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <path d="M16 8l2-2" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
  </svg>
);

export const CustomSectionIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
    <line x1="3" y1="12" x2="21" y2="12" stroke="currentColor" strokeWidth="2" strokeDasharray="3,2"/>
    <path d="M3 3v9h18V3" fill="currentColor" opacity="0.2"/>
    <path d="M18 15l3-3-3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const CustomWireframeIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <path d="M12 2l8 4v12l-8 4-8-4V6l8-4z" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 2v20" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <path d="M4 6l8 4 8-4" stroke="currentColor" strokeWidth="1" opacity="0.6"/>
    <path d="M4 6v12" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    <path d="M20 6v12" stroke="currentColor" strokeWidth="1" opacity="0.4"/>
    <circle cx="12" cy="2" r="1" fill="currentColor"/>
    <circle cx="4" cy="6" r="1" fill="currentColor"/>
    <circle cx="20" cy="6" r="1" fill="currentColor"/>
    <circle cx="12" cy="22" r="1" fill="currentColor"/>
  </svg>
);

export const CustomGridIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <defs>
      <pattern id="grid" width="4" height="4" patternUnits="userSpaceOnUse">
        <path d="M 4 0 L 0 0 0 4" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.5"/>
      </pattern>
    </defs>
    <rect width="24" height="24" fill="url(#grid)"/>
    <line x1="0" y1="12" x2="24" y2="12" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
    <line x1="12" y1="0" x2="12" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.8"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const CustomScreenshotIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <rect x="3" y="5" width="18" height="14" rx="2" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <rect x="7" y="7" width="2" height="1" fill="currentColor" opacity="0.6"/>
    <rect x="15" y="7" width="2" height="1" fill="currentColor" opacity="0.6"/>
    <path d="M8 3h1v2H8z" fill="currentColor" opacity="0.8"/>
    <path d="M15 3h1v2h-1z" fill="currentColor" opacity="0.8"/>
  </svg>
);

export const CustomSettingsIcon: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="M12 1v6m0 4v6m11-7h-6m-4 0H1"/>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
    <g transform="rotate(45 12 12)">
      <rect x="11" y="1" width="2" height="4" fill="currentColor" opacity="0.6"/>
      <rect x="11" y="19" width="2" height="4" fill="currentColor" opacity="0.6"/>
      <rect x="1" y="11" width="4" height="2" fill="currentColor" opacity="0.6"/>
      <rect x="19" y="11" width="4" height="2" fill="currentColor" opacity="0.6"/>
    </g>
  </svg>
);

// 炫酷动画图标组件
export const AnimatedOrbitIcon: React.FC<{ className?: string; style?: React.CSSProperties; active?: boolean }> = ({ 
  className, style, active = false 
}) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <defs>
      <linearGradient id="orbitGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="currentColor" stopOpacity="1"/>
        <stop offset="100%" stopColor="currentColor" stopOpacity="0.6"/>
      </linearGradient>
    </defs>
    <circle cx="12" cy="12" r="8" fill="none" stroke="url(#orbitGradient)" strokeWidth="1.5" strokeDasharray="2,2"/>
    <circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="2"/>
    <circle cx="12" cy="4" r="2" fill="currentColor">
      {active && (
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 12 12"
          to="360 12 12"
          dur="2s"
          repeatCount="indefinite"/>
      )}
    </circle>
    <circle cx="12" cy="12" r="1" fill="currentColor"/>
  </svg>
);

export const AnimatedZoomIcon: React.FC<{ className?: string; style?: React.CSSProperties; active?: boolean }> = ({ 
  className, style, active = false 
}) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="currentColor" width="1em" height="1em">
    <circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" strokeWidth="2"/>
    <path d="21 21l-4.35-4.35" stroke="currentColor" strokeWidth="2"/>
    <line x1="8" y1="11" x2="14" y2="11" stroke="currentColor" strokeWidth="2"/>
    <line x1="11" y1="8" x2="11" y2="14" stroke="currentColor" strokeWidth="2"/>
    <circle cx="11" cy="11" r="3" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4">
      {active && (
        <animate
          attributeName="r"
          values="3;5;3"
          dur="1s"
          repeatCount="indefinite"/>
      )}
    </circle>
  </svg>
);

// 图标映射对象
export const CUSTOM_ICON_MAP = {
  CustomSelectIcon,
  CustomOrbitIcon,
  CustomPanIcon,
  CustomZoomIcon,
  CustomFitIcon,
  CustomResetIcon,
  CustomMeasureIcon,
  CustomSectionIcon,
  CustomWireframeIcon,
  CustomGridIcon,
  CustomScreenshotIcon,
  CustomSettingsIcon,
  AnimatedOrbitIcon,
  AnimatedZoomIcon
};