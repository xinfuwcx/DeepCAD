/**
 * 简化版控制中心 - 快速修复版本
 * 专注核心功能，避免复杂动画导致的问题
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface EpicControlCenterProps {
  width?: number;
  height?: number;
  onExit?: () => void;
  onSwitchToControlCenter?: () => void;
}

const EpicControlCenter: React.FC<EpicControlCenterProps> = ({
  width = 800,
  height = 600,
  onExit,
  onSwitchToControlCenter
}) => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [systemStatus, setSystemStatus] = useState<'initializing' | 'ready' | 'error'>('initializing');

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // 模拟系统初始化
    setTimeout(() => {
      setSystemStatus('ready');
    }, 2000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      display: 'flex',
      flexDirection: 'column',
      color: '#ffffff',
      fontFamily: 'Inter, system-ui, sans-serif',
      overflow: 'hidden'
    }}>
      {/* 顶部导航栏 */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 2rem',
        background: 'rgba(255, 255, 255, 0.1)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            background: 'linear-gradient(45deg, #00d4ff, #0080ff)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '20px'
          }}>
            🏗️
          </div>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            fontWeight: '600',
            background: 'linear-gradient(45deg, #00d4ff, #ffffff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent'
          }}>
            DeepCAD 控制中心
          </h1>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '2rem'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: systemStatus === 'ready' ? '#00ff88' : 
                         systemStatus === 'error' ? '#ff4444' : '#ffaa00',
              animation: systemStatus === 'initializing' ? 'pulse 1.5s infinite' : 'none'
            }} />
            <span style={{ fontSize: '14px', opacity: 0.8 }}>
              {systemStatus === 'ready' ? '系统就绪' : 
               systemStatus === 'error' ? '系统错误' : '初始化中...'}
            </span>
          </div>
          
          <div style={{ fontSize: '14px', opacity: 0.8 }}>
            {currentTime.toLocaleTimeString()}
          </div>

          {onExit && (
            <button
              onClick={onExit}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '6px',
                color: '#ffffff',
                padding: '8px 16px',
                cursor: 'pointer',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              退出
            </button>
          )}
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '350px 1fr',
        gap: '1rem',
        padding: '1rem'
      }}>
        {/* 左侧控制面板 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#00d4ff'
          }}>
            系统控制
          </h3>

          {/* 快速操作 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            <ActionButton icon="📊" label="项目仪表板" />
            <ActionButton icon="🌍" label="地理信息" />
            <ActionButton icon="🔧" label="系统设置" />
            <ActionButton icon="📈" label="性能监控" />
            <ActionButton icon="🔍" label="数据分析" />
          </div>

          {/* 系统状态 */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '1rem'
          }}>
            <h4 style={{
              margin: '0 0 0.75rem 0',
              fontSize: '14px',
              fontWeight: '600',
              color: '#ffffff',
              opacity: 0.9
            }}>
              系统状态
            </h4>
            <StatusItem label="CPU 使用率" value="45%" />
            <StatusItem label="内存使用" value="2.8GB" />
            <StatusItem label="活跃项目" value="3" />
            <StatusItem label="在线用户" value="12" />
          </div>
        </div>

        {/* 右侧主显示区域 */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '2rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* 背景装饰 */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: `
              radial-gradient(circle at 20% 20%, rgba(0, 212, 255, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 80% 80%, rgba(0, 128, 255, 0.1) 0%, transparent 50%)
            `,
            pointerEvents: 'none'
          }} />

          {/* 主内容 */}
          <div style={{
            textAlign: 'center',
            zIndex: 1
          }}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              style={{
                marginBottom: '2rem'
              }}
            >
              <div style={{
                width: '120px',
                height: '120px',
                background: 'linear-gradient(45deg, #00d4ff, #0080ff)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '48px',
                margin: '0 auto 1.5rem auto',
                boxShadow: '0 20px 40px rgba(0, 212, 255, 0.3)'
              }}>
                🏗️
              </div>
              
              <h2 style={{
                margin: '0 0 1rem 0',
                fontSize: '36px',
                fontWeight: '700',
                background: 'linear-gradient(45deg, #00d4ff, #ffffff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}>
                深基坑CAE系统
              </h2>
              
              <p style={{
                margin: '0 0 2rem 0',
                fontSize: '18px',
                opacity: 0.8,
                maxWidth: '500px'
              }}>
                下一代基于WebGPU的深基坑工程分析平台
              </p>
            </motion.div>

            {/* 功能网格 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              <FeatureCard 
                icon="🌍" 
                title="地质建模" 
                description="三维地质结构重建"
              />
              <FeatureCard 
                icon="⚡" 
                title="WebGPU计算" 
                description="GPU加速有限元分析"
              />
              <FeatureCard 
                icon="📊" 
                title="实时可视化" 
                description="动态结果展示"
              />
              <FeatureCard 
                icon="🔧" 
                title="智能设计" 
                description="AI辅助优化设计"
              />
            </div>
          </div>
        </div>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

// 辅助组件
const ActionButton: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
  <button style={{
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s',
    width: '100%',
    textAlign: 'left'
  }}
  onMouseEnter={(e) => {
    e.currentTarget.style.background = 'rgba(0, 212, 255, 0.1)';
    e.currentTarget.style.borderColor = 'rgba(0, 212, 255, 0.3)';
  }}
  onMouseLeave={(e) => {
    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
  }}
  >
    <span style={{ fontSize: '16px' }}>{icon}</span>
    {label}
  </button>
);

const StatusItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '13px'
  }}>
    <span style={{ opacity: 0.7 }}>{label}</span>
    <span style={{ fontWeight: '600', color: '#00d4ff' }}>{value}</span>
  </div>
);

const FeatureCard: React.FC<{ icon: string; title: string; description: string }> = ({ 
  icon, title, description 
}) => (
  <motion.div
    whileHover={{ scale: 1.05 }}
    transition={{ duration: 0.2 }}
    style={{
      background: 'rgba(255, 255, 255, 0.05)',
      border: '1px solid rgba(255, 255, 255, 0.1)',
      borderRadius: '8px',
      padding: '1.5rem',
      textAlign: 'center',
      cursor: 'pointer'
    }}
  >
    <div style={{ fontSize: '32px', marginBottom: '0.75rem' }}>{icon}</div>
    <h4 style={{ 
      margin: '0 0 0.5rem 0', 
      fontSize: '16px', 
      fontWeight: '600',
      color: '#ffffff'
    }}>
      {title}
    </h4>
    <p style={{ 
      margin: 0, 
      fontSize: '13px', 
      opacity: 0.7 
    }}>
      {description}
    </p>
  </motion.div>
);

export { EpicControlCenter };
export default EpicControlCenter;
