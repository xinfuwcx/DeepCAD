/**
 * @file Header.tsx
 * @description 深基坑CAE系统的顶部栏组件
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import React, { useState } from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  IconButton, 
  Box,
  Tooltip,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import OpenInBrowserIcon from '@mui/icons-material/OpenInBrowser';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';

/**
 * @component Header
 * @description 顶部栏组件，包含应用程序标题和基本工具栏
 */
const Header: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('modeling');
  
  const tabs = [
    { id: 'modeling', label: '建模' },
    { id: 'analysis', label: '分析' },
    { id: 'results', label: '结果' },
    { id: 'ai', label: '物理AI' },
  ];

  return (
    <header style={{
      backgroundColor: '#1E1E32',
      color: '#fff',
      padding: '0.5rem 1rem',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottom: '1px solid #333'
    }}>
      {/* 左侧标题 */}
      <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
        深基坑CAE系统
      </div>
      
      {/* 中间标签页 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center',
        gap: '1rem'
      }}>
        {tabs.map(tab => (
          <div 
            key={tab.id}
            style={{
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              borderBottom: activeTab === tab.id ? '2px solid var(--primary-color)' : 'none',
              color: activeTab === tab.id ? 'var(--primary-color)' : 'inherit'
            }}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>
      
      {/* 右侧工具栏 */}
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          保存
        </button>
        <button style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          导出
        </button>
      </div>
    </header>
  );
};

export default Header; 