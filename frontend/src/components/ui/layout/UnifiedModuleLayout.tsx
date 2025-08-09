import React, { ReactNode } from 'react';

interface UnifiedModuleLayoutProps {
  left?: ReactNode;
  right?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}

// 模块统一布局：左(参数) + 主(3D/内容) + 右(指标) + 浮层
const UnifiedModuleLayout: React.FC<UnifiedModuleLayoutProps> = ({ left, right, overlay, children }) => {
  return (
    <div className="dc-module-layout">
      {left && <div className="dc-module-left">{left}</div>}
      <div className="dc-module-main">{children}</div>
      {right && <div className="dc-module-right">{right}</div>}
      {overlay}
    </div>
  );
};

export default UnifiedModuleLayout;
