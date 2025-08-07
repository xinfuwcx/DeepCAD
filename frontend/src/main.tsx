import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// 安装全局Three.js错误处理器
import './utils/globalThreeJSErrorHandler';
import './styles/stunning-3d-earth.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)