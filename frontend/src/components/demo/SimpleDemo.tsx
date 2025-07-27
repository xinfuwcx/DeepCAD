/**
 * DeepCAD 简化演示页面
 * 1号架构师 - 快速修复版本
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

const SimpleDemo: React.FC = () => {
  const [currentSection, setCurrentSection] = useState(0);
  
  const sections = [
    { id: 'hero', name: '🚀 DeepCAD 震撼开场', color: '#3b82f6' },
    { id: 'components', name: '🎨 UI组件展示', color: '#8b5cf6' },
    { id: 'parameters', name: '⚙️ CAE参数配置', color: '#10b981' },
    { id: 'analysis', name: '📊 分析演示', color: '#f59e0b' }
  ];

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)',
      color: '#ffffff',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* 背景粒子效果 */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        background: `
          radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(139, 92, 246, 0.1) 0%, transparent 50%),
          radial-gradient(circle at 40% 80%, rgba(16, 185, 129, 0.1) 0%, transparent 50%)
        `,
        animation: 'pulse 4s ease-in-out infinite'
      }} />

      {/* 主Logo区域 */}
      <motion.div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          zIndex: 10
        }}
        initial={{ opacity: 0, y: -50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          style={{
            fontSize: '4rem',
            fontWeight: 'bold',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            marginBottom: '1rem'
          }}
          animate={{ 
            scale: [1, 1.05, 1],
            filter: [
              'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))',
              'drop-shadow(0 0 20px rgba(139, 92, 246, 0.8))',
              'drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))'
            ]
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          DeepCAD
        </motion.div>
        
        <motion.p
          style={{
            fontSize: '1.5rem',
            color: '#94a3b8',
            marginBottom: '2rem'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 1 }}
        >
          世界级深基坑CAE平台
        </motion.p>

        <motion.div
          style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
        >
          {['Three.js渲染', 'WebGPU加速', '专业CAE', '震撼视效'].map((feature, index) => (
            <motion.div
              key={feature}
              style={{
                padding: '0.5rem 1rem',
                background: 'rgba(59, 130, 246, 0.1)',
                border: '1px solid rgba(59, 130, 246, 0.3)',
                borderRadius: '0.5rem',
                fontSize: '0.9rem'
              }}
              whileHover={{ scale: 1.05, backgroundColor: 'rgba(59, 130, 246, 0.2)' }}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.2 + index * 0.1 }}
            >
              {feature}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* 导航控制 */}
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: '1rem',
        zIndex: 10
      }}>
        {sections.map((section, index) => (
          <motion.button
            key={section.id}
            onClick={() => setCurrentSection(index)}
            style={{
              padding: '1rem 2rem',
              background: currentSection === index 
                ? `linear-gradient(135deg, ${section.color}, ${section.color}80)`
                : 'rgba(255, 255, 255, 0.1)',
              border: `2px solid ${currentSection === index ? section.color : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: '0.75rem',
              color: '#ffffff',
              fontSize: '1rem',
              cursor: 'pointer',
              backdropFilter: 'blur(10px)',
              transition: 'all 0.3s ease'
            }}
            whileHover={{ 
              scale: 1.05,
              boxShadow: `0 0 20px ${section.color}40`
            }}
            whileTap={{ scale: 0.95 }}
          >
            {section.name}
          </motion.button>
        ))}
      </div>

      {/* 演示内容区域 */}
      <motion.div
        key={currentSection}
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80%',
          maxWidth: '1200px',
          textAlign: 'center'
        }}
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -50 }}
        transition={{ duration: 0.5 }}
      >
        {/* 根据当前选择显示不同内容 */}
        {currentSection === 0 && (
          <div>
            <motion.div
              style={{
                fontSize: '2rem',
                marginBottom: '2rem',
                color: sections[0].color
              }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            >
              🚀
            </motion.div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>震撼开场动画</h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6 }}>
              从太空深处俯冲到地球，再深入基坑现场的电影级飞行体验
              <br />
              Three.js + WebGPU 驱动的高性能3D渲染
            </p>
          </div>
        )}

        {currentSection === 1 && (
          <div>
            <motion.div
              style={{ fontSize: '2rem', marginBottom: '2rem', color: sections[1].color }}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              🎨
            </motion.div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>UI组件展示</h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6 }}>
              完整的CAE专业界面组件库
              <br />
              Button、Card、Modal、Input等原子组件
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              {['按钮组件', '卡片组件', '模态框', '输入框'].map((comp, index) => (
                <motion.div
                  key={comp}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(139, 92, 246, 0.1)',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '0.75rem',
                    backdropFilter: 'blur(10px)'
                  }}
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {comp}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {currentSection === 2 && (
          <div>
            <motion.div
              style={{ fontSize: '2rem', marginBottom: '2rem', color: sections[2].color }}
              animate={{ rotate: [0, 180, 360] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            >
              ⚙️
            </motion.div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>CAE参数配置</h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6 }}>
              专业的深基坑分析参数设置界面
              <br />
              实时验证、智能提示、参数导入导出
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1rem',
              marginTop: '2rem'
            }}>
              {['几何参数', '网格参数', '材料参数', '计算参数', '边界条件'].map((param, index) => (
                <motion.div
                  key={param}
                  style={{
                    padding: '1.5rem',
                    background: 'rgba(16, 185, 129, 0.1)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    borderRadius: '0.75rem',
                    backdropFilter: 'blur(10px)'
                  }}
                  whileHover={{ scale: 1.05 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.15 }}
                >
                  {param}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {currentSection === 3 && (
          <div>
            <motion.div
              style={{ fontSize: '2rem', marginBottom: '2rem', color: sections[3].color }}
              animate={{ 
                scale: [1, 1.3, 1],
                opacity: [0.7, 1, 0.7]
              }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              📊
            </motion.div>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>分析演示</h2>
            <p style={{ fontSize: '1.2rem', color: '#94a3b8', lineHeight: 1.6 }}>
              实时计算过程可视化和结果展示
              <br />
              GPU加速计算，5-10倍性能提升
            </p>
            <motion.div
              style={{
                marginTop: '2rem',
                padding: '2rem',
                background: 'rgba(245, 158, 11, 0.1)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '1rem',
                backdropFilter: 'blur(10px)'
              }}
              animate={{
                boxShadow: [
                  '0 0 20px rgba(245, 158, 11, 0.3)',
                  '0 0 40px rgba(245, 158, 11, 0.6)',
                  '0 0 20px rgba(245, 158, 11, 0.3)'
                ]
              }}
              transition={{ duration: 3, repeat: Infinity }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>计算进度:</span>
                <span style={{ color: sections[3].color, fontWeight: 'bold' }}>87%</span>
              </div>
              <div style={{
                width: '100%',
                height: '8px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                overflow: 'hidden'
              }}>
                <motion.div
                  style={{
                    height: '100%',
                    background: `linear-gradient(90deg, ${sections[3].color}, ${sections[3].color}80)`,
                    borderRadius: '4px'
                  }}
                  initial={{ width: '0%' }}
                  animate={{ width: '87%' }}
                  transition={{ duration: 2, ease: 'easeInOut' }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      {/* 版本信息 */}
      <div style={{
        position: 'absolute',
        top: '2%',
        right: '2%',
        fontSize: '0.9rem',
        color: '#64748b',
        textAlign: 'right'
      }}>
        <div>DeepCAD Platform v2.1.0</div>
        <div>WebGL + WebGPU Ready</div>
      </div>

      {/* CSS动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};

export default SimpleDemo;