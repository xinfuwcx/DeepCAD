/**
 * DeepCAD 组件注册中心
 * 1号架构师负责 - 统一管理所有模块组件
 * 为2号和3号开发的组件提供标准注册接口
 */

import React from 'react';

// 组件类型定义
export interface ComponentInfo {
  id: string;
  name: string;
  component: React.ComponentType<any>;
  module: 'geometry' | 'meshing' | 'computation' | 'visualization' | 'materials';
  author: '1号架构师' | '2号几何专家' | '3号计算专家';
  version: string;
  description: string;
  props?: Record<string, any>;
  dependencies?: string[];
  isAsync?: boolean;
}

// 组件注册表
class ComponentRegistry {
  private components: Map<string, ComponentInfo> = new Map();
  private loadedComponents: Map<string, React.ComponentType<any>> = new Map();

  /**
   * 注册组件
   */
  register(info: ComponentInfo): void {
    this.components.set(info.id, info);
    this.loadedComponents.set(info.id, info.component);
    
    console.log(`[ComponentRegistry] 注册组件: ${info.name} (by ${info.author})`);
  }

  /**
   * 批量注册组件
   */
  registerBatch(components: ComponentInfo[]): void {
    components.forEach(comp => this.register(comp));
  }

  /**
   * 获取组件
   */
  getComponent(id: string): React.ComponentType<any> | null {
    return this.loadedComponents.get(id) || null;
  }

  /**
   * 获取组件信息
   */
  getComponentInfo(id: string): ComponentInfo | null {
    return this.components.get(id) || null;
  }

  /**
   * 按模块获取组件列表
   */
  getComponentsByModule(module: ComponentInfo['module']): ComponentInfo[] {
    return Array.from(this.components.values()).filter(comp => comp.module === module);
  }

  /**
   * 按作者获取组件列表
   */
  getComponentsByAuthor(author: ComponentInfo['author']): ComponentInfo[] {
    return Array.from(this.components.values()).filter(comp => comp.author === author);
  }

  /**
   * 获取所有组件
   */
  getAllComponents(): ComponentInfo[] {
    return Array.from(this.components.values());
  }

  /**
   * 检查组件是否存在
   */
  hasComponent(id: string): boolean {
    return this.components.has(id);
  }

  /**
   * 动态加载组件 (支持异步组件)
   */
  async loadComponent(id: string): Promise<React.ComponentType<any> | null> {
    const info = this.components.get(id);
    if (!info) return null;

    if (info.isAsync) {
      try {
        // 异步加载组件
        const loadedComponent = await info.component;
        this.loadedComponents.set(id, loadedComponent.default || loadedComponent);
        return this.loadedComponents.get(id) || null;
      } catch (error) {
        console.error(`[ComponentRegistry] 组件 ${id} 异步加载失败:`, error);
        return null;
      }
    }

    return this.loadedComponents.get(id) || null;
  }

  /**
   * 卸载组件
   */
  unregister(id: string): boolean {
    const hasComponent = this.components.has(id);
    this.components.delete(id);
    this.loadedComponents.delete(id);
    
    if (hasComponent) {
      console.log(`[ComponentRegistry] 卸载组件: ${id}`);
    }
    
    return hasComponent;
  }

  /**
   * 验证组件依赖
   */
  validateDependencies(id: string): { valid: boolean; missing: string[] } {
    const info = this.components.get(id);
    if (!info || !info.dependencies) {
      return { valid: true, missing: [] };
    }

    const missing = info.dependencies.filter(dep => !this.hasComponent(dep));
    return { valid: missing.length === 0, missing };
  }

  /**
   * 获取组件统计信息
   */
  getStats(): {
    total: number;
    byModule: Record<string, number>;
    byAuthor: Record<string, number>;
  } {
    const components = this.getAllComponents();
    
    const byModule: Record<string, number> = {};
    const byAuthor: Record<string, number> = {};

    components.forEach(comp => {
      byModule[comp.module] = (byModule[comp.module] || 0) + 1;
      byAuthor[comp.author] = (byAuthor[comp.author] || 0) + 1;
    });

    return {
      total: components.length,
      byModule,
      byAuthor
    };
  }
}

// 全局组件注册表实例
export const componentRegistry = new ComponentRegistry();

// 组件装饰器 - 简化注册过程
export function RegisterComponent(info: Omit<ComponentInfo, 'component'>) {
  return function <T extends React.ComponentType<any>>(target: T): T {
    componentRegistry.register({
      ...info,
      component: target
    });
    return target;
  };
}

// React Hook - 获取组件
export function useComponent(id: string) {
  const [component, setComponent] = React.useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const loadComponent = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const comp = await componentRegistry.loadComponent(id);
        setComponent(comp);
      } catch (err) {
        setError(err instanceof Error ? err.message : '组件加载失败');
      } finally {
        setLoading(false);
      }
    };

    loadComponent();
  }, [id]);

  return { component, loading, error };
}

// 工具函数 - 创建组件包装器
export function createComponentWrapper(
  id: string, 
  fallback?: React.ComponentType<any>
): React.ComponentType<any> {
  return function ComponentWrapper(props: any) {
    const { component: Component, loading, error } = useComponent(id);

    if (loading) {
      return React.createElement('div', { 
        style: { 
          padding: '20px', 
          textAlign: 'center',
          color: '#ffffff80'
        } 
      }, '组件加载中...');
    }

    if (error || !Component) {
      if (fallback) {
        return React.createElement(fallback, props);
      }
      return React.createElement('div', { 
        style: { 
          padding: '20px', 
          textAlign: 'center',
          color: '#ff4d4f',
          background: '#16213e',
          border: '1px solid #ff4d4f30',
          borderRadius: '8px'
        } 
      }, `组件 ${id} 加载失败: ${error}`);
    }

    return React.createElement(Component, props);
  };
}

export default componentRegistry;