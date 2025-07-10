import React from 'react';
import { Spin } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';

interface PageLoadingProps {
  tip?: string;
  size?: 'small' | 'default' | 'large';
  fullScreen?: boolean;
}

const PageLoading: React.FC<PageLoadingProps> = ({
  tip = '加载中...',
  size = 'large',
  fullScreen = false
}) => {
  const antIcon = <LoadingOutlined style={{ fontSize: size === 'small' ? 24 : size === 'large' ? 48 : 32 }} spin />;
  
  const containerStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    height: fullScreen ? '100vh' : '100%',
    width: '100%',
    background: 'var(--bg-primary)',
    position: fullScreen ? 'fixed' : 'absolute',
    top: 0,
    left: 0,
    zIndex: 1000,
  };
  
  return (
    <div style={containerStyle} className="page-loading fade-in">
      <Spin indicator={antIcon} tip={tip} size={size} />
      <div className="loading-animation">
        <div className="loading-bar"></div>
        <div className="loading-bar"></div>
        <div className="loading-bar"></div>
        <div className="loading-bar"></div>
      </div>
    </div>
  );
};

export default PageLoading; 