/**
 * 懒加载组件工具
 * 优化初始加载时间和代码分割
 * @author Deep Excavation Team - Code Optimization
 * @date 2025-01-29
 * @version 2.0.0
 */

import React, { Suspense, ComponentType, ReactNode } from 'react';
import { EnhancedErrorBoundary } from '../components/common/EnhancedErrorBoundary';

/**
 * 加载状态组件
 */
interface LoadingFallbackProps {
  message?: string;
  size?: 'small' | 'medium' | 'large';
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({ 
  message = '加载中...', 
  size = 'medium' 
}) => {
  const sizeMap = {
    small: { spinner: '20px', text: '12px', padding: '8px' },
    medium: { spinner: '32px', text: '14px', padding: '16px' },
    large: { spinner: '48px', text: '16px', padding: '24px' }
  };

  const styles = sizeMap[size];

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: styles.padding,
      color: '#ffffff',
      background: 'rgba(0, 0, 0, 0.5)',
      borderRadius: '8px',
      backdropFilter: 'blur(10px)'
    }}>
      {/* 旋转加载器 */}
      <div style={{
        width: styles.spinner,
        height: styles.spinner,
        border: '3px solid rgba(0, 255, 255, 0.3)',
        borderTop: '3px solid #00ffff',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
        marginBottom: '8px'
      }} />
      
      {/* 加载文本 */}
      <div style={{
        fontSize: styles.text,
        color: 'rgba(255, 255, 255, 0.8)'
      }}>
        {message}
      </div>
      
      {/* CSS动画 */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

/**
 * 创建懒加载组件的高阶函数
 */
export function createLazyComponent<P = any>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: {
    fallback?: ReactNode;
    errorFallback?: ReactNode;
    retryAttempts?: number;
    retryDelay?: number;
  } = {}
): React.ComponentType<P> {
  const {
    fallback = <LoadingFallback />,
    errorFallback,
    retryAttempts = 3,
    retryDelay = 1000
  } = options;

  // 创建带重试机制的导入函数
  const importWithRetry = async (attempts = 0): Promise<{ default: ComponentType<P> }> => {
    try {
      return await importFunc();
    } catch (error) {
      if (attempts < retryAttempts) {
        console.warn(`组件加载失败，${retryDelay}ms后重试 (${attempts + 1}/${retryAttempts}):`, error);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return importWithRetry(attempts + 1);
      }
      throw error;
    }
  };

  const LazyComponent = React.lazy(() => importWithRetry());

  const WrappedComponent = (props: P) => (
    <EnhancedErrorBoundary fallback={errorFallback}>
      <Suspense fallback={fallback}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    </EnhancedErrorBoundary>
  );

  return React.memo(WrappedComponent) as React.ComponentType<P>;
}

/**
 * 预加载组件工具
 */
class ComponentPreloader {
  private static preloadCache = new Map<string, Promise<any>>();

  static preload(
    key: string,
    importFunc: () => Promise<any>
  ): Promise<any> {
    if (!this.preloadCache.has(key)) {
      const promise = importFunc().catch(error => {
        console.warn(`组件预加载失败 (${key}):`, error);
        // 从缓存中移除失败的预加载
        this.preloadCache.delete(key);
        throw error;
      });
      
      this.preloadCache.set(key, promise);
    }
    
    return this.preloadCache.get(key)!;
  }

  static isPreloaded(key: string): boolean {
    return this.preloadCache.has(key);
  }

  static clearCache(): void {
    this.preloadCache.clear();
  }

  static getPreloadedCount(): number {
    return this.preloadCache.size;
  }
}

/**
 * 路由级别的懒加载组件
 */
export function createLazyRoute<P = any>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  preloadKey?: string
): React.ComponentType<P> {
  // 如果提供了预加载键，立即开始预加载
  if (preloadKey) {
    ComponentPreloader.preload(preloadKey, importFunc);
  }

  return createLazyComponent(importFunc, {
    fallback: (
      <div style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
      }}>
        <LoadingFallback message="正在加载页面..." size="large" />
      </div>
    ),
    retryAttempts: 5,
    retryDelay: 2000
  });
}

/**
 * 组件级别的懒加载
 */
export function createLazyWidget<P = any>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  message?: string
): React.ComponentType<P> {
  return createLazyComponent(importFunc, {
    fallback: <LoadingFallback message={message} size="small" />,
    retryAttempts: 2,
    retryDelay: 500
  });
}

/**
 * 条件懒加载 - 只在满足条件时才加载组件
 */
export function createConditionalLazyComponent<P = any>(
  condition: () => boolean,
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  fallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  return (props: P) => {
    if (!condition()) {
      const FallbackComponent = fallbackComponent;
      return FallbackComponent ? <FallbackComponent {...(props as any)} /> : null;
    }

    const LazyComponent = createLazyComponent(importFunc);
    return <LazyComponent {...(props as any)} />;
  };
}

/**
 * 视口懒加载 - 只在元素进入视口时才加载
 */
export function createViewportLazyComponent<P = any>(
  importFunc: () => Promise<{ default: ComponentType<P> }>,
  options: IntersectionObserverInit = {}
): React.ComponentType<P> {
  return (props: P) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const elementRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
          }
        },
        {
          threshold: 0.1,
          ...options
        }
      );

      if (elementRef.current) {
        observer.observe(elementRef.current);
      }

      return () => observer.disconnect();
    }, []);

    if (!isVisible) {
      return (
        <div 
          ref={elementRef}
          style={{
            minHeight: '100px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <LoadingFallback message="组件即将加载..." size="small" />
        </div>
      );
    }

    const LazyComponent = createLazyComponent(importFunc);
    return <LazyComponent {...(props as any)} />;
  };
}

// 导出工具实例
export const componentPreloader = ComponentPreloader;

// 导出默认加载组件
export { LoadingFallback };
