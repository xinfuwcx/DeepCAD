/**
 * 科技风格图标组件
 * 1号架构师 - 统一的技术图标系统
 */

import React from 'react';
import { 
  BugOutlined,
  ThunderboltOutlined,
  SettingOutlined,
  DatabaseOutlined,
  CloudOutlined,
  DesktopOutlined,
  MonitorOutlined,
  BarChartOutlined,
  RocketOutlined,
  CodeOutlined,
  ApiOutlined,
  DeploymentUnitOutlined
} from '@ant-design/icons';

// 图标类型定义
export type TechIconType = 
  | 'bug' 
  | 'thunder' 
  | 'setting' 
  | 'database' 
  | 'cloud' 
  | 'desktop' 
  | 'monitor' 
  | 'chart' 
  | 'rocket' 
  | 'code' 
  | 'api' 
  | 'deploy'
  | 'geometry'
  | 'mesh'
  | 'computation'
  | 'analysis';

// 图标映射
const ICON_MAP = {
  bug: BugOutlined,
  thunder: ThunderboltOutlined,
  setting: SettingOutlined,
  database: DatabaseOutlined,
  cloud: CloudOutlined,
  desktop: DesktopOutlined,
  monitor: MonitorOutlined,
  chart: BarChartOutlined,
  rocket: RocketOutlined,
  code: CodeOutlined,
  api: ApiOutlined,
  deploy: DeploymentUnitOutlined,
  geometry: DesktopOutlined, // 几何建模
  mesh: CloudOutlined,       // 网格生成
  computation: ThunderboltOutlined, // 计算分析
  analysis: BarChartOutlined  // 结果分析
};

// 组件属性
interface TechIconProps {
  type: TechIconType;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  glow?: boolean;
  animated?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
}

// 科技图标组件
export const TechIcon: React.FC<TechIconProps> = ({
  type,
  size = 'medium',
  color = '#00d9ff',
  glow = false,
  animated = false,
  className = '',
  style = {},
  onClick
}) => {
  const IconComponent = ICON_MAP[type];
  
  if (!IconComponent) {
    console.warn(`TechIcon: Unknown icon type "${type}"`);
    return <CodeOutlined style={style} className={className} />;
  }

  // 尺寸映射
  const sizeMap = {
    small: 16,
    medium: 24,
    large: 32
  };

  // 基础样式
  const baseStyle: React.CSSProperties = {
    color,
    fontSize: sizeMap[size],
    cursor: onClick ? 'pointer' : 'default',
    transition: 'all 0.3s ease',
    ...style
  };

  // 发光效果
  if (glow) {
    baseStyle.filter = `drop-shadow(0 0 8px ${color})`;
    baseStyle.textShadow = `0 0 10px ${color}`;
  }

  // 动画效果
  if (animated) {
    baseStyle.animation = 'techIconPulse 2s ease-in-out infinite';
  }

  // 悬停效果
  const hoverStyle = onClick ? {
    ':hover': {
      transform: 'scale(1.1)',
      filter: `drop-shadow(0 0 12px ${color})`,
    }
  } : {};

  return (
    <>
      {/* 动画样式定义 */}
      <style>{`
        @keyframes techIconPulse {
          0%, 100% { opacity: 0.8; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.05); }
        }
        
        .tech-icon:hover {
          transform: scale(1.1) !important;
          filter: drop-shadow(0 0 12px ${color}) !important;
        }
      `}</style>
      
      <IconComponent
        className={`tech-icon ${className}`}
        style={baseStyle}
        onClick={onClick}
      />
    </>
  );
};

// 图标组合组件
interface TechIconGroupProps {
  icons: Array<{
    type: TechIconType;
    label?: string;
    onClick?: () => void;
  }>;
  direction?: 'horizontal' | 'vertical';
  spacing?: number;
  size?: 'small' | 'medium' | 'large';
  glow?: boolean;
}

export const TechIconGroup: React.FC<TechIconGroupProps> = ({
  icons,
  direction = 'horizontal',
  spacing = 16,
  size = 'medium',
  glow = false
}) => {
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: direction === 'horizontal' ? 'row' : 'column',
    gap: spacing,
    alignItems: 'center',
    justifyContent: 'center'
  };

  return (
    <div style={containerStyle}>
      {icons.map((icon, index) => (
        <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <TechIcon
            type={icon.type}
            size={size}
            glow={glow}
            onClick={icon.onClick}
          />
          {icon.label && (
            <span style={{
              color: '#ffffff80',
              fontSize: '12px',
              marginTop: '4px',
              fontFamily: '"JetBrains Mono", monospace'
            }}>
              {icon.label}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// 预定义图标组合
export const ExpertIcons = {
  // 1号专家 - 控制中心
  expert1: [
    { type: 'monitor' as TechIconType, label: '控制中心' },
    { type: 'rocket' as TechIconType, label: '项目管理' },
    { type: 'api' as TechIconType, label: 'AI助手' }
  ],
  
  // 2号专家 - 几何建模
  expert2: [
    { type: 'geometry' as TechIconType, label: '几何建模' },
    { type: 'database' as TechIconType, label: '材料库' },
    { type: 'setting' as TechIconType, label: '工程标准' }
  ],
  
  // 3号专家 - 计算分析
  expert3: [
    { type: 'mesh' as TechIconType, label: '网格生成' },
    { type: 'computation' as TechIconType, label: '计算分析' },
    { type: 'analysis' as TechIconType, label: '结果查看' }
  ]
};

export default TechIcon;