/**
 * 简化版组件管理器
 * 1号架构师 - 管理简化版组件的稳定运行和逐步升级
 */

export interface SimplifiedComponent {
  name: string;
  simplifiedPath: string;
  originalPath?: string;
  status: 'stable' | 'needs_fix' | 'ready_to_merge';
  issues: string[];
  lastChecked: number;
  performance: {
    loadTime: number;
    memoryUsage: number;
    errorCount: number;
  };
}

class SimplifiedComponentManager {
  private components: Map<string, SimplifiedComponent> = new Map();

  constructor() {
    this.initializeComponents();
  }

  /**
   * 初始化简化版组件注册表
   */
  private initializeComponents(): void {
    // 注册当前简化版组件
    this.registerComponent({
      name: 'LODManager',
      simplifiedPath: 'components/3d/performance/LODManager.simple.ts',
      originalPath: 'components/3d/performance/LODManager.ts',
      status: 'stable',
      issues: [],
      lastChecked: Date.now(),
      performance: {
        loadTime: 0,
        memoryUsage: 0,
        errorCount: 0
      }
    });

    this.registerComponent({
      name: 'MeshInterface',
      simplifiedPath: 'components/computation/MeshInterface.simple.tsx',
      originalPath: 'components/computation/MeshInterface.tsx',
      status: 'stable',
      issues: [],
      lastChecked: Date.now(),
      performance: {
        loadTime: 0,
        memoryUsage: 0,
        errorCount: 0
      }
    });

    this.registerComponent({
      name: 'RealtimeProgressMonitor',
      simplifiedPath: 'components/computation/RealtimeProgressMonitor.simple.tsx',
      originalPath: 'components/computation/RealtimeProgressMonitor.tsx',
      status: 'stable',
      issues: [],
      lastChecked: Date.now(),
      performance: {
        loadTime: 0,
        memoryUsage: 0,
        errorCount: 0
      }
    });
  }

  /**
   * 注册简化版组件
   */
  public registerComponent(component: SimplifiedComponent): void {
    this.components.set(component.name, component);
    console.log(`✅ 简化版组件已注册: ${component.name}`);
  }

  /**
   * 更新组件状态
   */
  public updateComponentStatus(
    name: string, 
    status: SimplifiedComponent['status'], 
    issues: string[] = []
  ): void {
    const component = this.components.get(name);
    if (component) {
      component.status = status;
      component.issues = issues;
      component.lastChecked = Date.now();
      console.log(`🔄 组件状态更新: ${name} -> ${status}`);
    }
  }

  /**
   * 记录性能指标
   */
  public recordPerformance(
    name: string,
    metrics: Partial<SimplifiedComponent['performance']>
  ): void {
    const component = this.components.get(name);
    if (component) {
      component.performance = { ...component.performance, ...metrics };
    }
  }

  /**
   * 获取所有组件状态
   */
  public getComponentsStatus(): SimplifiedComponent[] {
    return Array.from(this.components.values());
  }

  /**
   * 获取需要修复的组件
   */
  public getComponentsNeedingFix(): SimplifiedComponent[] {
    return this.getComponentsStatus().filter(comp => comp.status === 'needs_fix');
  }

  /**
   * 获取准备合并的组件
   */
  public getComponentsReadyToMerge(): SimplifiedComponent[] {
    return this.getComponentsStatus().filter(comp => comp.status === 'ready_to_merge');
  }

  /**
   * 生成状态报告
   */
  public generateStatusReport(): {
    total: number;
    stable: number;
    needsFix: number;
    readyToMerge: number;
    avgPerformance: {
      loadTime: number;
      memoryUsage: number;
      errorCount: number;
    };
  } {
    const components = this.getComponentsStatus();
    const total = components.length;
    const stable = components.filter(c => c.status === 'stable').length;
    const needsFix = components.filter(c => c.status === 'needs_fix').length;
    const readyToMerge = components.filter(c => c.status === 'ready_to_merge').length;

    const avgPerformance = components.reduce(
      (acc, comp) => ({
        loadTime: acc.loadTime + comp.performance.loadTime,
        memoryUsage: acc.memoryUsage + comp.performance.memoryUsage,
        errorCount: acc.errorCount + comp.performance.errorCount
      }),
      { loadTime: 0, memoryUsage: 0, errorCount: 0 }
    );

    if (total > 0) {
      avgPerformance.loadTime /= total;
      avgPerformance.memoryUsage /= total;
      avgPerformance.errorCount /= total;
    }

    return {
      total,
      stable,
      needsFix,
      readyToMerge,
      avgPerformance
    };
  }

  /**
   * 自动健康检查
   */
  public async performHealthCheck(): Promise<void> {
    console.log('🔍 开始简化版组件健康检查...');
    
    for (const [name, component] of this.components) {
      try {
        // 模拟性能检查
        const startTime = performance.now();
        
        // 这里可以添加实际的组件检查逻辑
        await new Promise(resolve => setTimeout(resolve, 10));
        
        const loadTime = performance.now() - startTime;
        
        this.recordPerformance(name, {
          loadTime,
          errorCount: 0
        });

        // 如果组件稳定运行超过一周，标记为准备合并
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        if (component.status === 'stable' && 
            Date.now() - component.lastChecked > weekInMs &&
            component.performance.errorCount === 0) {
          this.updateComponentStatus(name, 'ready_to_merge');
        }

      } catch (error) {
        console.error(`❌ 组件检查失败: ${name}`, error);
        this.updateComponentStatus(name, 'needs_fix', [error.message]);
        this.recordPerformance(name, {
          errorCount: component.performance.errorCount + 1
        });
      }
    }

    const report = this.generateStatusReport();
    console.log('📊 健康检查完成:', report);
  }
}

// 单例模式
export const simplifiedComponentManager = new SimplifiedComponentManager();

// 开发工具
export const SimplifiedComponentDevTools = {
  /**
   * 显示当前状态
   */
  showStatus: () => {
    const report = simplifiedComponentManager.generateStatusReport();
    console.table(simplifiedComponentManager.getComponentsStatus());
    console.log('📊 总览:', report);
  },

  /**
   * 手动触发健康检查
   */
  healthCheck: () => simplifiedComponentManager.performHealthCheck(),

  /**
   * 标记组件为需要修复
   */
  markForFix: (name: string, issues: string[]) => {
    simplifiedComponentManager.updateComponentStatus(name, 'needs_fix', issues);
  },

  /**
   * 标记组件为准备合并
   */
  markReadyToMerge: (name: string) => {
    simplifiedComponentManager.updateComponentStatus(name, 'ready_to_merge');
  }
};

// 在开发环境中暴露到全局
if (process.env.NODE_ENV === 'development') {
  (window as any).SimplifiedComponentDevTools = SimplifiedComponentDevTools;
}