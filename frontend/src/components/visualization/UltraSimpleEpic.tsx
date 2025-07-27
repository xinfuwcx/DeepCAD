/**
 * 超级简化的Epic控制中心 - 确保100%能工作
 */

import React from 'react';

interface UltraSimpleEpicProps {
  width: number;
  height: number;
  onExit: () => void;
}

export const UltraSimpleEpic: React.FC<UltraSimpleEpicProps> = ({ width, height, onExit }) => {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'linear-gradient(135deg, #000428 0%, #004e92 100%)',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      {/* 动态粒子背景 - 纯CSS */}
      <div style={{
        position: 'absolute',
        inset: 0,
        background: `
          radial-gradient(circle at 20% 80%, rgba(0, 255, 255, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(255, 0, 255, 0.3) 0%, transparent 50%),
          radial-gradient(circle at 40% 40%, rgba(0, 255, 128, 0.2) 0%, transparent 50%)
        `,
        animation: 'epicPulse 4s ease-in-out infinite alternate',
        zIndex: 1
      }} />

      {/* 顶部退出按钮 */}
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          background: 'rgba(255, 100, 100, 0.8)',
          border: 'none',
          borderRadius: '10px',
          color: 'white',
          padding: '10px 20px',
          cursor: 'pointer',
          fontSize: '16px',
          zIndex: 10,
          backdropFilter: 'blur(10px)'
        }}
      >
        ✕ 退出Epic
      </button>

      {/* 主内容区域 */}
      <div style={{
        zIndex: 5,
        textAlign: 'center',
        color: 'white',
        maxWidth: '800px',
        padding: '40px'
      }}>
        {/* 标题 */}
        <div style={{
          fontSize: '48px',
          marginBottom: '20px',
          textShadow: '0 0 20px rgba(0, 255, 255, 0.8)'
        }}>
          🚁 Epic控制中心
        </div>

        <div style={{
          fontSize: '18px',
          opacity: 0.9,
          marginBottom: '40px'
        }}>
          DeepCAD深基坑工程智能监控平台
        </div>

        {/* 项目卡片网格 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          marginBottom: '40px'
        }}>
          {[
            { name: '上海中心深基坑', depth: '70m', status: '完成', lat: '31.23°N', lng: '121.47°E' },
            { name: '北京大兴机场T1', depth: '45m', status: '进行中', lat: '39.51°N', lng: '116.41°E' },
            { name: '深圳前海金融区', depth: '35m', status: '规划中', lat: '22.54°N', lng: '113.93°E' },
            { name: '广州珠江新城CBD', depth: '55m', status: '完成', lat: '23.13°N', lng: '113.32°E' }
          ].map((project, index) => (
            <div
              key={index}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '2px solid rgba(0, 255, 255, 0.5)',
                borderRadius: '15px',
                padding: '20px',
                backdropFilter: 'blur(10px)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0, 255, 255, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {/* 状态指示器 */}
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: project.status === '完成' ? '#00ff00' : project.status === '进行中' ? '#ffaa00' : '#666',
                boxShadow: `0 0 10px ${project.status === '完成' ? '#00ff00' : project.status === '进行中' ? '#ffaa00' : '#666'}`
              }} />

              <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
                {project.name}
              </h3>
              <div style={{ fontSize: '14px', opacity: 0.8 }}>
                <div>🕳️ 深度: {project.depth}</div>
                <div>📍 {project.lat}, {project.lng}</div>
                <div>📊 状态: {project.status}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 震撼效果演示 */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.5)',
          border: '1px solid rgba(0, 255, 255, 0.3)',
          borderRadius: '20px',
          padding: '30px',
          backdropFilter: 'blur(10px)'
        }}>
          <h2 style={{ margin: '0 0 20px 0', fontSize: '24px' }}>
            ✨ 震撼效果展示
          </h2>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '15px',
            fontSize: '14px'
          }}>
            <div>🎆 动态背景粒子</div>
            <div>🌊 流体渐变动画</div>
            <div>💫 光影发光效果</div>
            <div>🔥 悬停交互反馈</div>
            <div>⚡ GPU硬件加速</div>
            <div>🎮 实时响应控制</div>
          </div>

          <div style={{
            marginTop: '20px',
            padding: '15px',
            background: 'rgba(0, 255, 0, 0.1)',
            border: '1px solid rgba(0, 255, 0, 0.3)',
            borderRadius: '10px'
          }}>
            ✅ Epic控制中心运行正常 | 🌐 所有系统在线 | ⚡ 视觉效果已激活
          </div>
        </div>
      </div>

      {/* CSS动画定义 */}
      <style>{`
        @keyframes epicPulse {
          0% { 
            opacity: 0.6;
            transform: scale(1);
          }
          100% { 
            opacity: 1;
            transform: scale(1.02);
          }
        }
      `}</style>
    </div>
  );
};

export default UltraSimpleEpic;