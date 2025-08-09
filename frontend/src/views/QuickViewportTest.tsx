import React from 'react';
import ProfessionalViewport3D from '../components/ProfessionalViewport3D';
// /pv3d: 最小 3D 视口验证入口 (不加载大型业务模块与旧版工具栏)

// 轻量快速验证页面：仅挂载核心 3D 视口，避免高级应用初始化干扰
const QuickViewportTest: React.FC = () => {
  return (
    <div style={{width:'100vw',height:'100vh',margin:0,padding:0,background:'#111'}}>
      <ProfessionalViewport3D title="Quick 3D Test" description="最小验证入口" suppressLegacyToolbar />
    </div>
  );
};

export default QuickViewportTest;
