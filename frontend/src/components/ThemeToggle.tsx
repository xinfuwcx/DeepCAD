import React, { useEffect } from 'react';
import { Button, Tooltip, Dropdown, Space } from 'antd';
import { BulbOutlined, BulbFilled, SettingOutlined } from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';
import type { MenuProps } from 'antd';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, style }) => {
  const { theme, uiMode, toggleTheme, setTheme, setUIMode, particleEffectsEnabled, toggleParticleEffects } = useUIStore(
    useShallow(state => ({
      theme: state.theme,
      uiMode: state.uiMode,
      toggleTheme: state.toggleTheme,
      setTheme: state.setTheme,
      setUIMode: state.setUiMode,
      particleEffectsEnabled: state.particleEffectsEnabled,
      toggleParticleEffects: state.toggleParticleEffects
    }))
  );
  
  const isDarkMode = theme === 'dark';
  const isFusionMode = uiMode === 'fusion';

  const toggleUIMode = () => {
    setUIMode(uiMode === 'fusion' ? 'minimal' : 'fusion');
  };

  // 确保主题设置保存到 localStorage 并应用到 body
  useEffect(() => {
    localStorage.setItem('theme', theme);
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
  }, [theme, isDarkMode]);

  // 确保UI模式设置保存到 localStorage 并应用到 body
  useEffect(() => {
    localStorage.setItem('uiMode', uiMode);
    document.body.classList.toggle('fusion-mode', isFusionMode);
    document.body.classList.toggle('minimal-mode', !isFusionMode);
  }, [uiMode, isFusionMode]);

  // 处理主题切换
  const handleToggleTheme = () => {
    toggleTheme();
  };

  // 下拉菜单项
  const items: MenuProps['items'] = [
    {
      key: 'mode',
      label: (
        <div onClick={toggleUIMode}>
          {isFusionMode ? '切换到极简模式' : '切换到科技模式'}
        </div>
      ),
    },
    {
      key: 'particles',
      label: (
        <div onClick={toggleParticleEffects}>
          {particleEffectsEnabled ? '关闭粒子效果' : '开启粒子效果'}
        </div>
      ),
    },
    {
      type: 'divider',
    },
    {
      key: 'theme',
      label: (
        <div onClick={handleToggleTheme}>
          {isDarkMode ? '切换到浅色主题' : '切换到深色主题'}
        </div>
      ),
    },
  ];

  return (
    <Space size="small">
      <Tooltip title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}>
        <Button
          type="text"
          icon={isDarkMode ? <BulbOutlined /> : <BulbFilled />}
          onClick={handleToggleTheme}
          className={`theme-btn ${className || ''}`}
          style={{ 
            ...style 
          }}
          aria-label="切换主题"
        />
      </Tooltip>
      
      <Dropdown menu={{ items }} placement="bottomRight">
        <Button
          type="text"
          icon={<SettingOutlined />}
          className={`theme-btn ${className || ''}`}
          style={{ 
            ...style 
          }}
          aria-label="界面设置"
        />
      </Dropdown>
    </Space>
  );
};

export default ThemeToggle; 