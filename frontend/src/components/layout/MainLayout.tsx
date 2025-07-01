import React, { ReactNode } from 'react';
import Header from './Header';

interface MainLayoutProps {
  children: ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      height: '100vh' 
    }}>
      <Header />
      <main style={{ 
        flex: 1, 
        overflow: 'hidden',
        position: 'relative'
      }}>
        {children}
      </main>
    </div>
  );
};

export default MainLayout; 