import React from 'react';
import { Button, Tooltip } from 'antd';
import { BulbOutlined, BulbFilled } from '@ant-design/icons';
import { useUIStore } from '../stores/useUIStore';
import { useShallow } from 'zustand/react/shallow';

interface ThemeToggleProps {
  className?: string;
  style?: React.CSSProperties;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ className, style }) => {
  const { theme, toggleTheme } = useUIStore(
    useShallow(state => ({
      theme: state.theme,
      toggleTheme: state.toggleTheme
    }))
  );
  
  const isDarkMode = theme === 'dark';

  return (
    <Tooltip title={isDarkMode ? '切换到浅色模式' : '切换到深色模式'}>
      <Button
        type="text"
        icon={isDarkMode ? <BulbOutlined /> : <BulbFilled />}
        onClick={toggleTheme}
        className={`theme-toggle ${className || ''} transition-all hover-scale`}
        style={{ 
          color: isDarkMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(0, 0, 0, 0.85)',
          ...style 
        }}
        aria-label="切换主题"
      />
    </Tooltip>
  );
};

export default ThemeToggle; 