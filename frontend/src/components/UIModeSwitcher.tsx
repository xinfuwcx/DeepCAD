import React, { useState } from 'react';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';
import QuantumToggle from './quantum/QuantumToggle';
import QuantumButton from './quantum/QuantumButton';
import UISettingsPanel from './UISettingsPanel';

interface UIModeSwitcherProps {
  variant?: 'toggle' | 'button' | 'icon';
  showLabel?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

const UIModeSwitcher: React.FC<UIModeSwitcherProps> = ({
  variant = 'toggle',
  showLabel = true,
  className = '',
  style = {},
}) => {
  const [showSettings, setShowSettings] = useState(false);
  
  const { uiMode, toggleUIMode } = useUIStore(
    useShallow(state => ({
      uiMode: state.uiMode,
      toggleUIMode: state.toggleUiMode || (() => {}),
    }))
  );
  
  const isFusionMode = uiMode === 'fusion';
  
  // 渲染切换开关
  const renderToggle = () => {
    return (
      <div className="ui-mode-toggle" style={{ display: 'flex', alignItems: 'center', ...style }}>
        {showLabel && (
          <span style={{ marginRight: '8px', color: 'var(--text-secondary)' }}>
            {isFusionMode ? '融合模式' : '极简模式'}
          </span>
        )}
        <QuantumToggle
          checked={isFusionMode}
          onChange={toggleUIMode}
          checkedChildren="融合"
          unCheckedChildren="极简"
        />
      </div>
    );
  };
  
  // 渲染按钮
  const renderButton = () => {
    return (
      <QuantumButton
        variant={isFusionMode ? 'primary' : 'ghost'}
        onClick={toggleUIMode}
        style={style}
      >
        {isFusionMode ? '切换到极简模式' : '切换到融合模式'}
      </QuantumButton>
    );
  };
  
  // 渲染图标
  const renderIcon = () => {
    return (
      <div
        className="ui-mode-icon"
        onClick={toggleUIMode}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: isFusionMode ? 'var(--gradient-blue)' : 'transparent',
          border: isFusionMode ? 'none' : '1px solid var(--border-color)',
          color: isFusionMode ? 'white' : 'var(--text-primary)',
          transition: 'all var(--transition-medium)',
          ...style,
        }}
        title={isFusionMode ? '融合模式 (点击切换)' : '极简模式 (点击切换)'}
      >
        {isFusionMode ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 16C14.2091 16 16 14.2091 16 12C16 9.79086 14.2091 8 12 8C9.79086 8 8 9.79086 8 12C8 14.2091 9.79086 16 12 16Z" fill="currentColor"/>
            <path d="M12 2V4M12 20V22M4 12H2M6.31412 6.31412L4.8999 4.8999M17.6859 6.31412L19.1001 4.8999M6.31412 17.69L4.8999 19.1042M17.6859 17.69L19.1001 19.1042M22 12H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
    );
  };
  
  // 渲染设置面板
  const renderSettingsPanel = () => {
    if (!showSettings) return null;
    
    return (
      <div
        className="ui-settings-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(5px)',
          WebkitBackdropFilter: 'blur(5px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            setShowSettings(false);
          }
        }}
      >
        <UISettingsPanel onClose={() => setShowSettings(false)} />
      </div>
    );
  };
  
  // 渲染设置按钮
  const renderSettingsButton = () => {
    return (
      <div
        className="ui-settings-button"
        onClick={() => setShowSettings(true)}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          background: 'transparent',
          border: '1px solid var(--border-color)',
          color: 'var(--text-primary)',
          transition: 'all var(--transition-medium)',
          marginLeft: '8px',
        }}
        title="界面设置"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
    );
  };

  return (
    <div className={`ui-mode-switcher ${className}`} style={{ display: 'flex', alignItems: 'center' }}>
      {variant === 'toggle' && renderToggle()}
      {variant === 'button' && renderButton()}
      {variant === 'icon' && renderIcon()}
      {renderSettingsButton()}
      {renderSettingsPanel()}
    </div>
  );
};

export default UIModeSwitcher; 