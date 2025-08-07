/**
 * DeepCAD专业Logo组件
 * 科技感十足的基坑工程Logo设计
 */

import React from 'react';

interface DeepCADLogoProps {
  size?: number;
  color?: string;
  animated?: boolean;
}

const DeepCADLogo: React.FC<DeepCADLogoProps> = ({ 
  size = 40, 
  color = '#00aaff',
  animated = false 
}) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ 
        filter: `drop-shadow(0 0 8px ${color}40)`,
        animation: animated ? 'logoGlow 3s ease-in-out infinite alternate' : 'none'
      }}
    >
      {/* 外圆环 - 代表地面 */}
      <circle
        cx="50"
        cy="50"
        r="45"
        fill="none"
        stroke={color}
        strokeWidth="2"
        opacity="0.6"
      />
      
      {/* 内圆环 - 代表基坑边界 */}
      <circle
        cx="50"
        cy="50"
        r="35"
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        opacity="0.8"
        strokeDasharray="5,3"
      />
      
      {/* 中心基坑 - 立体效果 */}
      <ellipse
        cx="50"
        cy="50"
        rx="25"
        ry="15"
        fill={`url(#excavationGradient)`}
        stroke={color}
        strokeWidth="1"
      />
      
      {/* 支撑结构 - 十字形 */}
      <g stroke={color} strokeWidth="2" opacity="0.9">
        <line x1="30" y1="50" x2="70" y2="50" />
        <line x1="50" y1="30" x2="50" y2="70" />
      </g>
      
      {/* 深度指示线 */}
      <g stroke={color} strokeWidth="1" opacity="0.7">
        <line x1="50" y1="35" x2="50" y2="45" />
        <line x1="50" y1="55" x2="50" y2="65" />
        <polygon 
          points="48,65 50,70 52,65" 
          fill={color}
        />
      </g>
      
      {/* 科技感装饰点 */}
      <g fill={color} opacity="0.8">
        <circle cx="25" cy="25" r="1.5" />
        <circle cx="75" cy="25" r="1.5" />
        <circle cx="25" cy="75" r="1.5" />
        <circle cx="75" cy="75" r="1.5" />
      </g>
      
      {/* 渐变定义 */}
      <defs>
        <linearGradient id="excavationGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="50%" stopColor={color} stopOpacity="0.6" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
      </defs>
      
      {/* 动画样式 */}
      <style>
        {`
          @keyframes logoGlow {
            0% { filter: drop-shadow(0 0 8px ${color}40); }
            100% { filter: drop-shadow(0 0 15px ${color}80); }
          }
        `}
      </style>
    </svg>
  );
};

export default DeepCADLogo;
