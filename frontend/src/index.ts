import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AlertProvider from './components/common/AlertProvider';

// 渲染应用
const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <AlertProvider>
      <App />
    </AlertProvider>
  </React.StrictMode>
); 