/**
 * DeepCAD 深基坑CAE系统主应用 - 简化调试版本
 */

import React, { useState } from 'react';

export const DeepCADMainApp: React.FC = () => {
  const [currentModule, setCurrentModule] = useState<string>('welcome');

  const modules = [
    { id: 'welcome', name: '欢迎', icon: '🏠' },
    { id: 'gis', name: 'GIS地质', icon: '🌍' },
    { id: 'physics_ai', name: '物理AI', icon: '🤖' },
    { id: 'preprocess', name: '前处理', icon: '⚙️' },
    { id: 'solver', name: '求解器', icon: '🔧' },
    { id: 'postprocess', name: '后处理', icon: '📊' },
    { id: 'project', name: '项目管理', icon: '📁' }
  ];

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#f5f5f5',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      {/* 左侧导航 */}
      <div style={{
        width: '250px',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Logo区域 */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid #34495e',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.5rem' }}>DeepCAD</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '0.9rem', opacity: 0.8 }}>
            深基坑CAE分析系统
          </p>
        </div>

        {/* 导航菜单 */}
        <nav style={{ flex: 1, padding: '20px 0' }}>
          {modules.map(module => (
            <button
              key={module.id}
              onClick={() => setCurrentModule(module.id)}
              style={{
                width: '100%',
                padding: '15px 20px',
                border: 'none',
                backgroundColor: currentModule === module.id ? '#3498db' : 'transparent',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '1rem',
                transition: 'all 0.3s'
              }}
            >
              <span style={{ marginRight: '10px' }}>{module.icon}</span>
              {module.name}
            </button>
          ))}
        </nav>

        {/* 底部信息 */}
        <div style={{
          padding: '20px',
          borderTop: '1px solid #34495e',
          fontSize: '0.8rem',
          opacity: 0.7
        }}>
          <div>版本: v2.1.0</div>
          <div>© 2024 DeepCAD</div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* 顶部工具栏 */}
        <div style={{
          height: '60px',
          backgroundColor: 'white',
          borderBottom: '1px solid #ddd',
          display: 'flex',
          alignItems: 'center',
          padding: '0 20px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h3 style={{ margin: 0, color: '#2c3e50' }}>
            {modules.find(m => m.id === currentModule)?.name || '深基坑CAE系统'}
          </h3>
        </div>

        {/* 内容区域 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '40px', textAlign: 'center' }}>
          <div style={{
            maxWidth: '800px',
            margin: '0 auto',
            backgroundColor: 'white',
            padding: '40px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <h1 style={{ color: '#2c3e50', marginBottom: '20px' }}>
              🏗️ 欢迎使用 DeepCAD 深基坑CAE分析系统
            </h1>
            
            <p style={{ fontSize: '1.1rem', color: '#666', lineHeight: 1.6, marginBottom: '30px' }}>
              专业的深基坑工程计算机辅助工程软件，提供完整的前处理、求解计算和后处理功能。
              支持复杂的深基坑稳定性分析、变形计算和支护结构设计。
            </p>

            <div style={{
              padding: '20px',
              backgroundColor: '#d4edda',
              border: '1px solid #c3e6cb',
              borderRadius: '6px',
              color: '#155724',
              marginTop: '30px'
            }}>
              <strong>✅ 系统状态良好</strong><br/>
              当前选择模块: {modules.find(m => m.id === currentModule)?.name}<br/>
              1号架构师，系统已恢复正常运行！
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeepCADMainApp;