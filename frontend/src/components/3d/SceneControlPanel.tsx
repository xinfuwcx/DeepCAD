/**
 * 3D场景控制面板
 * 提供场景设置和交互控制
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface SceneControlPanelProps {
  onToggleStats?: (enabled: boolean) => void;
  onToggleDemo?: (enabled: boolean) => void;
  onToggleCameraAnimation?: (enabled: boolean) => void;
  onResetCamera?: () => void;
  onToggleWireframe?: (enabled: boolean) => void;
}

export const SceneControlPanel: React.FC<SceneControlPanelProps> = ({
  onToggleStats,
  onToggleDemo,
  onToggleCameraAnimation,
  onResetCamera,
  onToggleWireframe
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [settings, setSettings] = useState({
    showStats: false,
    showDemo: true,
    cameraAnimation: false,
    wireframe: false
  });

  const handleToggle = (key: keyof typeof settings, callback?: (enabled: boolean) => void) => {
    const newValue = !settings[key];
    setSettings(prev => ({ ...prev, [key]: newValue }));
    callback?.(newValue);
  };

  return (
    <motion.div
      initial={{ x: -300 }}
      animate={{ x: isOpen ? 0 : -250 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        top: '20px',
        left: '0px',
        width: '280px',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '0 12px 12px 0',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        color: 'white',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'absolute',
          right: '-40px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: '40px',
          height: '80px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '0 8px 8px 0',
          color: 'white',
          fontSize: '18px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isOpen ? '◀' : '▶'}
      </button>

      {/* 控制面板内容 */}
      <div style={{ padding: '20px' }}>
        <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 'bold' }}>
          🎮 3D场景控制
        </h3>

        {/* 控制选项 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          {/* 演示建筑 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>🏢 演示建筑</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.showDemo}
                onChange={() => handleToggle('showDemo', onToggleDemo)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.showDemo ? '#4CAF50' : '#ccc',
                borderRadius: '24px',
                transition: '0.4s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: settings.showDemo ? '26px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.4s'
                }} />
              </span>
            </label>
          </div>

          {/* 性能统计 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>📊 性能统计</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.showStats}
                onChange={() => handleToggle('showStats', onToggleStats)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.showStats ? '#4CAF50' : '#ccc',
                borderRadius: '24px',
                transition: '0.4s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: settings.showStats ? '26px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.4s'
                }} />
              </span>
            </label>
          </div>

          {/* 相机动画 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>📹 相机动画</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.cameraAnimation}
                onChange={() => handleToggle('cameraAnimation', onToggleCameraAnimation)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.cameraAnimation ? '#4CAF50' : '#ccc',
                borderRadius: '24px',
                transition: '0.4s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: settings.cameraAnimation ? '26px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.4s'
                }} />
              </span>
            </label>
          </div>

          {/* 线框模式 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '14px' }}>🔲 线框模式</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '50px', height: '24px' }}>
              <input
                type="checkbox"
                checked={settings.wireframe}
                onChange={() => handleToggle('wireframe', onToggleWireframe)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                cursor: 'pointer',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: settings.wireframe ? '#4CAF50' : '#ccc',
                borderRadius: '24px',
                transition: '0.4s'
              }}>
                <span style={{
                  position: 'absolute',
                  content: '',
                  height: '18px',
                  width: '18px',
                  left: settings.wireframe ? '26px' : '4px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.4s'
                }} />
              </span>
            </label>
          </div>

          {/* 重置相机按钮 */}
          <button
            onClick={onResetCamera}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              marginTop: '10px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            🎯 重置相机
          </button>

        </div>

        {/* 使用说明 */}
        <div style={{
          marginTop: '20px',
          padding: '10px',
          background: 'rgba(0, 0, 0, 0.2)',
          borderRadius: '6px',
          fontSize: '12px',
          lineHeight: '1.4'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>💡 操作提示:</div>
          <div>• 鼠标拖拽: 旋转视角</div>
          <div>• 滚轮: 缩放场景</div>
          <div>• 右键拖拽: 平移视角</div>
          <div>• 点击建筑: 选中/取消</div>
        </div>
      </div>
    </motion.div>
  );
};

export default SceneControlPanel;
