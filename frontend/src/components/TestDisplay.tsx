import React from 'react';

const TestDisplay: React.FC = () => {
  return (
    <div style={{
      width: '100%',
      height: '100vh',
      background: 'linear-gradient(45deg, #ff0000, #00ff00, #0000ff)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: '#ffffff',
      fontSize: '24px',
      fontWeight: 'bold',
      textAlign: 'center'
    }}>
      <div>
        <h1>🚀 测试显示组件</h1>
        <p>如果你能看到这个，说明右侧渲染正常</p>
        <p>时间: {new Date().toLocaleTimeString()}</p>
      </div>
    </div>
  );
};

export default TestDisplay;