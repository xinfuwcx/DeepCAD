import React, { useState, useEffect, createContext, useContext } from 'react';
import { Layout, ConfigProvider } from 'antd';
import { darkTheme } from '../../config/theme';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  className?: string;
}

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  orientation: 'portrait' | 'landscape';
}

const ResponsiveContext = createContext<ResponsiveContextType>({
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  screenWidth: 1920,
  orientation: 'landscape'
});

export const useResponsive = () => {
  const context = useContext(ResponsiveContext);
  if (!context) {
    throw new Error('useResponsive must be used within ResponsiveLayout');
  }
  return context;
};

export const ResponsiveLayout: React.FC<ResponsiveLayoutProps> = ({ 
  children, 
  className = '' 
}) => {
  const [responsiveState, setResponsiveState] = useState<ResponsiveContextType>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    orientation: 'landscape'
  });

  useEffect(() => {
    const updateResponsiveState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      setResponsiveState({
        isMobile: width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024,
        screenWidth: width,
        orientation: width > height ? 'landscape' : 'portrait'
      });
    };

    // 初始化
    updateResponsiveState();

    // 监听窗口大小变化
    const debouncedResize = debounce(updateResponsiveState, 100);
    window.addEventListener('resize', debouncedResize);
    
    // 监听设备方向变化
    window.addEventListener('orientationchange', () => {
      setTimeout(updateResponsiveState, 100);
    });

    return () => {
      window.removeEventListener('resize', debouncedResize);
      window.removeEventListener('orientationchange', updateResponsiveState);
    };
  }, []);

  return (
    <ResponsiveContext.Provider value={responsiveState}>
      <ConfigProvider theme={darkTheme}>
        <Layout 
          className={`responsive-layout ${className}`}
          style={{ minHeight: '100vh' }}
        >
          {children}
        </Layout>
      </ConfigProvider>
    </ResponsiveContext.Provider>
  );
};

// 工具函数：防抖
function debounce<T extends (...args: any[]) => void>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
}

// 响应式容器组件
interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md'
}) => {
  const { isMobile, isTablet } = useResponsive();
  
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-none'
  };

  const paddingClasses = {
    none: 'p-0',
    sm: isMobile ? 'p-2' : 'p-3',
    md: isMobile ? 'p-3' : 'p-4', 
    lg: isMobile ? 'p-4' : 'p-6',
    xl: isMobile ? 'p-6' : 'p-8'
  };

  return (
    <div 
      className={`
        responsive-container 
        ${maxWidthClasses[maxWidth]} 
        ${paddingClasses[padding]}
        ${className}
      `}
      style={{
        width: '100%',
        maxWidth: maxWidth === 'full' ? 'none' : undefined,
        margin: '0 auto',
      }}
    >
      {children}
    </div>
  );
};

// 响应式网格组件
interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  cols?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
  };
  gap?: 'sm' | 'md' | 'lg' | 'xl';
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  className = '',
  cols = { mobile: 1, tablet: 2, desktop: 3 },
  gap = 'md'
}) => {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  
  const getCurrentCols = () => {
    if (isMobile) return cols.mobile || 1;
    if (isTablet) return cols.tablet || 2;
    return cols.desktop || 3;
  };

  const gapSizes = {
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  };

  return (
    <div 
      className={`responsive-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${getCurrentCols()}, 1fr)`,
        gap: gapSizes[gap],
        width: '100%'
      }}
    >
      {children}
    </div>
  );
};

export default ResponsiveLayout;