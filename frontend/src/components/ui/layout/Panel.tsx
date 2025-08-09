import React, { ReactNode } from 'react';

export interface PanelProps {
  title?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  width?: number | string;
  className?: string;
  dense?: boolean;
  transparent?: boolean;
  style?: React.CSSProperties;
}

// 通用面板组件：统一视觉与结构
const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  footer,
  children,
  width,
  className = '',
  dense = false,
  transparent = false,
  style
}) => {
  return (
    <div
      className={`dc-panel ${dense ? 'dc-panel-dense' : ''} ${transparent ? 'dc-panel-transparent' : ''} ${className}`}
      style={{ width, ...style }}
    >
      {(title || actions) && (
        <div className="dc-panel-header">
          <div className="dc-panel-header-text">
            {title && <h3 className="dc-panel-title">{title}</h3>}
            {subtitle && <div className="dc-panel-subtitle">{subtitle}</div>}
          </div>
          {actions && <div className="dc-panel-actions">{actions}</div>}
        </div>
      )}
      <div className="dc-panel-body">{children}</div>
      {footer && <div className="dc-panel-footer">{footer}</div>}
    </div>
  );
};

export default Panel;
