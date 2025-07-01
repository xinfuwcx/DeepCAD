import React from 'react';

const LoadingScreen: React.FC = () => {
  return (
    <div className="loading-screen">
      <h1>深基坑CAE系统</h1>
      <div className="loading-spinner"></div>
      <p style={{ marginTop: '1rem' }}>正在加载chili3d引擎...</p>
    </div>
  );
};

export default LoadingScreen; 