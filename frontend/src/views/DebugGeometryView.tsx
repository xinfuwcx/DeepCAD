import React from 'react';

const DebugGeometryView: React.FC = () => {
  console.log('DebugGeometryView 组件正在渲染');
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(45deg, #ff0000, #ffff00)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#000000',
      textAlign: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div style={{ 
        background: '#ffffff', 
        padding: '40px', 
        borderRadius: '20px',
        border: '10px solid #000000',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)'
      }}>
        <h1 style={{ fontSize: '48px', color: '#ff0000', margin: '20px 0' }}>
          🚀 调试几何建模页面 🚀
        </h1>
        <p style={{ fontSize: '32px', color: '#0000ff', margin: '20px 0' }}>
          如果你看到这个页面，说明路由工作正常！
        </p>
        <p style={{ fontSize: '24px', color: '#008000', margin: '20px 0' }}>
          当前时间: {new Date().toLocaleString()}
        </p>
        <p style={{ fontSize: '20px', color: '#800080', margin: '20px 0' }}>
          路径: {window.location.pathname}
        </p>
        <p style={{ fontSize: '20px', color: '#800080', margin: '20px 0' }}>
          Hash: {window.location.hash}
        </p>
      </div>
    </div>
  );
};

export default DebugGeometryView;