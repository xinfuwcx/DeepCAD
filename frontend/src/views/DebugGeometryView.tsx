/**
 * DebugGeometryView.tsx - 几何调试工具
 * 
 * 功能描述:
 * - 几何建模的调试和验证工具
 * - 用于开发阶段的组件测试和问题诊断
 * - 提供醒目的视觉反馈来验证路由和组件加载
 * - 开发调试辅助界面
 * 
 * 调试功能:
 * 1. 组件渲染验证 - 确认组件正确加载和显示
 * 2. 路由测试 - 验证路由配置和页面跳转
 * 3. 视觉反馈 - 使用高对比度颜色便于识别
 * 4. 控制台日志 - 输出调试信息到浏览器控制台
 * 
 * 使用场景:
 * - 开发阶段组件测试
 * - 路由配置验证
 * - 界面布局调试
 * - 问题定位和诊断
 * 
 * 特点: 全屏覆盖、高对比度设计、固定定位、醒目提示
 */
import React from 'react';

const DebugGeometryView: React.FC = () => {
  console.log('DebugGeometryView 组件正在渲染');
  
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: 'linear-gradient(45deg, #ff0000, #ffff00)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#000000',
      textAlign: 'center',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 9999
    }}>
      <div style={{ 
        background: '#ffffff', 
        padding: '40px', 
        borderRadius: '20px',
        border: '10px solid #000000',
        boxShadow: '0 0 50px rgba(0, 0, 0, 0.8)'
      }}>
        <h1 style={{ fontSize: '48px', color: '#ff0000', margin: '20px 0' }}>
          🚀 调试几何建模页面 🚀
        </h1>
        <p style={{ fontSize: '32px', color: '#0000ff', margin: '20px 0' }}>
          如果你看到这个页面，说明路由工作正常！
        </p>
        <p style={{ fontSize: '24px', color: '#008000', margin: '20px 0' }}>
          当前时间: {new Date().toLocaleString()}
        </p>
        <p style={{ fontSize: '20px', color: '#800080', margin: '20px 0' }}>
          路径: {window.location.pathname}
        </p>
        <p style={{ fontSize: '20px', color: '#800080', margin: '20px 0' }}>
          Hash: {window.location.hash}
        </p>
      </div>
    </div>
  );
};

export default DebugGeometryView;