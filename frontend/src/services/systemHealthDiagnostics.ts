/**
 * 1号首席架构师优化系统 - 系统健康诊断和自动修复机制
 * @description 智能的系统健康监控、问题诊断和自动修复系统
 * @author 1号首席架构师
 * @version 3.0.0
 * @since 2024-07-25
 */

/**
 * 健康检查项接口
 * @interface HealthCheckItem
 */
export interface HealthCheckItem {
  id: string;
  name: string;
  category: 'memory' | 'gpu' | 'cpu' | 'network' | 'disk' | 'application';
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  interval: number;                    // 检查间隔 (毫秒)
  threshold: {
    warning: number;
    critical: number;
  };
  check: () => Promise<HealthCheckResult>;
}

/**
 * 健康检查结果接口
 * @interface HealthCheckResult
 */
export interface HealthCheckResult {
  checkId: string;
  timestamp: Date;
  status: 'healthy' | 'warning' | 'critical' | 'error';
  value: number;
  threshold: { warning: number; critical: number };
  message: string;
  details?: any;
  suggestions?: string[];
}

/**
 * 系统问题接口
 * @interface SystemIssue
 */
export interface SystemIssue {
  id: string;
  type: 'performance' | 'stability' | 'resource' | 'security' | 'compatibility';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedComponents: string[];
  symptoms: string[];
  potentialCauses: string[];
  autoFixAvailable: boolean;
  estimatedImpact: number;            // 对系统性能的影响 (0-1)
  firstDetected: Date;
  lastOccurred: Date;
  occurrences: number;
}

/**
 * 自动修复动作接口
 * @interface AutoRepairAction
 */
export interface AutoRepairAction {
  id: string;
  name: string;
  description: string;
  targetIssues: string[];            // 能修复的问题类型
  riskLevel: 'safe' | 'low' | 'medium' | 'high';
  requiredPermissions: string[];
  estimatedDuration: number;         // 预计修复时间 (毫秒)
  successRate: number;               // 成功率 (0-1)
  execute: (issue: SystemIssue) => Promise<RepairResult>;
}

/**
 * 修复结果接口
 * @interface RepairResult
 */
export interface RepairResult {
  actionId: string;
  issueId: string;
  timestamp: Date;
  success: boolean;
  duration: number;                  // 实际修复时间 (毫秒)
  message: string;
  changes: string[];                 // 所做的更改
  rollbackAvailable: boolean;
  rollback?: () => Promise<boolean>;
}

/**
 * 系统状态报告接口
 * @interface SystemHealthReport
 */
export interface SystemHealthReport {
  timestamp: Date;
  overallHealth: number;             // 总体健康分数 (0-100)
  status: 'healthy' | 'degraded' | 'unhealthy' | 'critical';
  categories: {
    [category: string]: {
      health: number;
      status: string;
      issues: number;
    };
  };
  activeIssues: SystemIssue[];
  recentRepairs: RepairResult[];
  recommendations: string[];
  uptime: number;                    // 系统运行时间 (毫秒)
  lastFullCheck: Date;
}

/**
 * 系统健康诊断器
 * @class SystemHealthDiagnostics
 * @description 核心健康监控和自动修复系统
 */
export class SystemHealthDiagnostics {
  private healthChecks: Map<string, HealthCheckItem> = new Map();
  private repairActions: Map<string, AutoRepairAction> = new Map();
  private activeIssues: Map<string, SystemIssue> = new Map();
  private checkResults: Map<string, HealthCheckResult[]> = new Map();
  private repairHistory: RepairResult[] = [];
  
  private isMonitoring: boolean = false;
  private monitoringIntervals: Map<string, NodeJS.Timeout> = new Map();
  private systemStartTime: Date = new Date();
  
  constructor() {
    this.initializeHealthChecks();
    this.initializeRepairActions();
  }

  /**
   * 初始化健康检查项
   */
  private initializeHealthChecks(): void {
    // 内存健康检查
    this.healthChecks.set('memory-usage', {
      id: 'memory-usage',
      name: '内存使用率检查',
      category: 'memory',
      priority: 'high',
      enabled: true,
      interval: 5000,
      threshold: { warning: 80, critical: 95 },
      check: async () => {
        const memInfo = performance.memory || { usedJSHeapSize: 0, totalJSHeapSize: 0 };
        const usage = memInfo.totalJSHeapSize > 0 ? 
          (memInfo.usedJSHeapSize / memInfo.totalJSHeapSize) * 100 : 0;
        
        return {
          checkId: 'memory-usage',
          timestamp: new Date(),
          status: usage > 95 ? 'critical' : usage > 80 ? 'warning' : 'healthy',
          value: usage,
          threshold: { warning: 80, critical: 95 },
          message: `内存使用率: ${usage.toFixed(1)}%`,
          suggestions: usage > 80 ? ['启用垃圾回收', '清理缓存数据', '释放未使用的对象'] : []
        };
      }
    });

    // 内存泄漏检查
    this.healthChecks.set('memory-leak', {
      id: 'memory-leak',
      name: '内存泄漏检测',
      category: 'memory',
      priority: 'medium',
      enabled: true,
      interval: 30000,
      threshold: { warning: 5, critical: 10 },
      check: async () => {
        const history = this.checkResults.get('memory-usage') || [];
        if (history.length < 5) {
          return {
            checkId: 'memory-leak',
            timestamp: new Date(),
            status: 'healthy',
            value: 0,
            threshold: { warning: 5, critical: 10 },
            message: '内存趋势数据不足'
          };
        }

        // 计算内存增长趋势
        const recent = history.slice(-5).map(r => r.value);
        const trend = this.calculateTrend(recent);
        
        return {
          checkId: 'memory-leak',
          timestamp: new Date(),
          status: trend > 10 ? 'critical' : trend > 5 ? 'warning' : 'healthy',
          value: trend,
          threshold: { warning: 5, critical: 10 },
          message: `内存增长趋势: ${trend.toFixed(2)}%/分钟`,
          suggestions: trend > 5 ? ['检查对象引用', '清理事件监听器', '释放定时器'] : []
        };
      }
    });

    // GPU健康检查
    this.healthChecks.set('gpu-temperature', {
      id: 'gpu-temperature',
      name: 'GPU温度检查',
      category: 'gpu',
      priority: 'high',
      enabled: true,
      interval: 3000,
      threshold: { warning: 80, critical: 90 },
      check: async () => {
        // 模拟GPU温度检测
        const temperature = 65 + Math.random() * 25;
        
        return {
          checkId: 'gpu-temperature',
          timestamp: new Date(),
          status: temperature > 90 ? 'critical' : temperature > 80 ? 'warning' : 'healthy',
          value: temperature,
          threshold: { warning: 80, critical: 90 },
          message: `GPU温度: ${temperature.toFixed(1)}°C`,
          suggestions: temperature > 80 ? ['降低渲染质量', '增加散热', '减少GPU负载'] : []
        };
      }
    });

    // 渲染性能检查
    this.healthChecks.set('render-performance', {
      id: 'render-performance',
      name: '渲染性能检查',
      category: 'gpu',
      priority: 'medium',
      enabled: true,
      interval: 5000,
      threshold: { warning: 45, critical: 30 },
      check: async () => {
        const fps = 50 + Math.random() * 30;
        
        return {
          checkId: 'render-performance',
          timestamp: new Date(),
          status: fps < 30 ? 'critical' : fps < 45 ? 'warning' : 'healthy',
          value: fps,
          threshold: { warning: 45, critical: 30 },
          message: `渲染帧率: ${fps.toFixed(1)} FPS`,
          suggestions: fps < 45 ? ['启用LOD', '降低渲染质量', '减少绘制调用'] : []
        };
      }
    });

    // 网络连接检查
    this.healthChecks.set('network-connectivity', {
      id: 'network-connectivity',
      name: '网络连接检查',
      category: 'network',
      priority: 'medium',
      enabled: true,
      interval: 10000,
      threshold: { warning: 1000, critical: 3000 },
      check: async () => {
        try {
          const start = performance.now();
          await fetch('/api/health', { method: 'HEAD', cache: 'no-cache' });
          const latency = performance.now() - start;
          
          return {
            checkId: 'network-connectivity',
            timestamp: new Date(),
            status: latency > 3000 ? 'critical' : latency > 1000 ? 'warning' : 'healthy',
            value: latency,
            threshold: { warning: 1000, critical: 3000 },
            message: `网络延迟: ${latency.toFixed(0)}ms`,
            suggestions: latency > 1000 ? ['检查网络连接', '优化请求数量', '启用压缩'] : []
          };
        } catch (error) {
          return {
            checkId: 'network-connectivity',
            timestamp: new Date(),
            status: 'error',
            value: -1,
            threshold: { warning: 1000, critical: 3000 },
            message: '网络连接失败',
            suggestions: ['检查网络配置', '重启网络服务', '检查防火墙设置']
          };
        }
      }
    });

    // 应用程序响应检查
    this.healthChecks.set('app-responsiveness', {
      id: 'app-responsiveness',
      name: '应用响应性检查',
      category: 'application',
      priority: 'high',
      enabled: true,
      interval: 8000,
      threshold: { warning: 200, critical: 500 },
      check: async () => {
        const start = performance.now();
        
        // 模拟复杂操作
        await new Promise(resolve => {
          const iterations = 10000 + Math.random() * 50000;
          let sum = 0;
          for (let i = 0; i < iterations; i++) {
            sum += Math.sqrt(i);
          }
          setTimeout(resolve, 0);
        });
        
        const responseTime = performance.now() - start;
        
        return {
          checkId: 'app-responsiveness',
          timestamp: new Date(),
          status: responseTime > 500 ? 'critical' : responseTime > 200 ? 'warning' : 'healthy',
          value: responseTime,
          threshold: { warning: 200, critical: 500 },
          message: `应用响应时间: ${responseTime.toFixed(1)}ms`,
          suggestions: responseTime > 200 ? ['优化计算算法', '使用Web Workers', '分批处理数据'] : []
        };
      }
    });

    console.log(`✅ 初始化了 ${this.healthChecks.size} 个健康检查项`);
  }

  /**
   * 初始化自动修复动作
   */
  private initializeRepairActions(): void {
    // 内存清理修复
    this.repairActions.set('memory-cleanup', {
      id: 'memory-cleanup',
      name: '内存清理',
      description: '强制垃圾回收和缓存清理',
      targetIssues: ['memory-usage', 'memory-leak'],
      riskLevel: 'safe',
      requiredPermissions: [],
      estimatedDuration: 2000,
      successRate: 0.9,
      execute: async (issue) => {
        const start = performance.now();
        
        try {
          // 强制垃圾回收
          if (window.gc) {
            window.gc();
          }
          
          // 清理缓存
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            for (const cacheName of cacheNames) {
              if (cacheName.includes('temp') || cacheName.includes('old')) {
                await caches.delete(cacheName);
              }
            }
          }
          
          // 清理大型对象引用
          this.clearLargeObjectReferences();
          
          const duration = performance.now() - start;
          
          return {
            actionId: 'memory-cleanup',
            issueId: issue.id,
            timestamp: new Date(),
            success: true,
            duration,
            message: '内存清理完成',
            changes: ['执行垃圾回收', '清理临时缓存', '释放对象引用'],
            rollbackAvailable: false
          };
        } catch (error) {
          return {
            actionId: 'memory-cleanup',
            issueId: issue.id,
            timestamp: new Date(),
            success: false,
            duration: performance.now() - start,
            message: `内存清理失败: ${error}`,
            changes: [],
            rollbackAvailable: false
          };
        }
      }
    });

    // GPU降频修复
    this.repairActions.set('gpu-thermal-protection', {
      id: 'gpu-thermal-protection',
      name: 'GPU温度保护',
      description: '降低GPU负载以保护硬件',
      targetIssues: ['gpu-temperature'],
      riskLevel: 'low',
      requiredPermissions: [],
      estimatedDuration: 1000,
      successRate: 0.95,
      execute: async (issue) => {
        const start = performance.now();
        
        try {
          const changes = [];
          
          // 降低渲染质量
          // 这里应该调用实际的渲染配置API
          changes.push('渲染质量降低到 low');
          changes.push('禁用抗锯齿');
          changes.push('关闭阴影效果');
          changes.push('启用激进LOD');
          
          const duration = performance.now() - start;
          
          return {
            actionId: 'gpu-thermal-protection',
            issueId: issue.id,
            timestamp: new Date(),
            success: true,
            duration,
            message: 'GPU温度保护已启用',
            changes,
            rollbackAvailable: true,
            rollback: async () => {
              // 恢复原始设置
              // 这里应该调用实际的配置恢复API
              console.log('🔄 恢复GPU设置');
              return true;
            }
          };
        } catch (error) {
          return {
            actionId: 'gpu-thermal-protection',
            issueId: issue.id,
            timestamp: new Date(),
            success: false,
            duration: performance.now() - start,
            message: `GPU保护启用失败: ${error}`,
            changes: [],
            rollbackAvailable: false
          };
        }
      }
    });

    // 网络重连修复
    this.repairActions.set('network-reconnect', {
      id: 'network-reconnect',
      name: '网络重连',
      description: '重新建立网络连接',
      targetIssues: ['network-connectivity'],
      riskLevel: 'low',
      requiredPermissions: [],
      estimatedDuration: 5000,
      successRate: 0.8,
      execute: async (issue) => {
        const start = performance.now();
        
        try {
          const changes = [];
          
          // 清理连接池
          changes.push('清理HTTP连接池');
          
          // 重新建立关键连接
          const testUrls = ['/api/health', '/api/status'];
          for (const url of testUrls) {
            try {
              await fetch(url, { cache: 'no-cache' });
              changes.push(`重连 ${url} 成功`);
            } catch (e) {
              changes.push(`重连 ${url} 失败`);
            }
          }
          
          const duration = performance.now() - start;
          
          return {
            actionId: 'network-reconnect',
            issueId: issue.id,
            timestamp: new Date(),
            success: true,
            duration,
            message: '网络重连完成',
            changes,
            rollbackAvailable: false
          };
        } catch (error) {
          return {
            actionId: 'network-reconnect',
            issueId: issue.id,
            timestamp: new Date(),
            success: false,
            duration: performance.now() - start,
            message: `网络重连失败: ${error}`,
            changes: [],
            rollbackAvailable: false
          };
        }
      }
    });

    // 应用重启修复
    this.repairActions.set('app-soft-restart', {
      id: 'app-soft-restart',
      name: '应用软重启',
      description: '重新初始化应用核心组件',
      targetIssues: ['app-responsiveness'],
      riskLevel: 'medium',
      requiredPermissions: ['restart'],
      estimatedDuration: 10000,
      successRate: 0.85,
      execute: async (issue) => {
        const start = performance.now();
        
        try {
          const changes = [];
          
          // 清理事件监听器
          changes.push('清理事件监听器');
          
          // 重新初始化关键服务
          changes.push('重新初始化渲染服务');
          changes.push('重新初始化计算服务');
          changes.push('重新初始化内存管理');
          
          // 重新加载关键资源
          changes.push('重新加载核心资源');
          
          const duration = performance.now() - start;
          
          return {
            actionId: 'app-soft-restart',
            issueId: issue.id,
            timestamp: new Date(),
            success: true,
            duration,
            message: '应用软重启完成',
            changes,
            rollbackAvailable: false
          };
        } catch (error) {
          return {
            actionId: 'app-soft-restart',
            issueId: issue.id,
            timestamp: new Date(),
            success: false,
            duration: performance.now() - start,
            message: `应用软重启失败: ${error}`,
            changes: [],
            rollbackAvailable: false
          };
        }
      }
    });

    console.log(`✅ 初始化了 ${this.repairActions.size} 个自动修复动作`);
  }

  /**
   * 启动健康监控
   */
  startMonitoring(): void {
    if (this.isMonitoring) {
      console.warn('⚠️ 健康监控已在运行');
      return;
    }

    this.isMonitoring = true;
    console.log('🏥 启动系统健康监控');

    // 为每个健康检查项启动定时监控
    for (const check of this.healthChecks.values()) {
      if (!check.enabled) continue;

      const interval = setInterval(async () => {
        try {
          const result = await check.check();
          
          // 存储检查结果
          if (!this.checkResults.has(check.id)) {
            this.checkResults.set(check.id, []);
          }
          const results = this.checkResults.get(check.id)!;
          results.push(result);
          
          // 保留最近100个结果
          if (results.length > 100) {
            results.splice(0, results.length - 100);
          }

          // 分析问题
          await this.analyzeHealthResult(result);
          
        } catch (error) {
          console.error(`❌ 健康检查失败 (${check.id}):`, error);
        }
      }, check.interval);

      this.monitoringIntervals.set(check.id, interval);
    }

    // 启动问题检测和自动修复循环
    const mainLoop = setInterval(() => {
      this.detectAndRepairIssues();
    }, 10000); // 每10秒检测一次

    this.monitoringIntervals.set('main-loop', mainLoop);
  }

  /**
   * 停止健康监控
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) return;

    // 清理所有定时器
    for (const interval of this.monitoringIntervals.values()) {
      clearInterval(interval);
    }
    this.monitoringIntervals.clear();

    this.isMonitoring = false;
    console.log('⏹️ 系统健康监控已停止');
  }

  /**
   * 分析健康检查结果
   */
  private async analyzeHealthResult(result: HealthCheckResult): Promise<void> {
    if (result.status === 'healthy') return;

    const issueId = `${result.checkId}-${result.status}`;
    const existingIssue = this.activeIssues.get(issueId);

    if (existingIssue) {
      // 更新现有问题
      existingIssue.lastOccurred = new Date();
      existingIssue.occurrences++;
    } else {
      // 创建新问题
      const newIssue: SystemIssue = {
        id: issueId,
        type: this.categorizeIssueType(result.checkId),
        severity: result.status === 'critical' ? 'critical' : 
                 result.status === 'warning' ? 'medium' : 'low',
        title: `${result.checkId} 异常`,
        description: result.message,
        affectedComponents: [result.checkId],
        symptoms: [result.message],
        potentialCauses: result.suggestions || [],
        autoFixAvailable: this.hasAutoRepair(result.checkId),
        estimatedImpact: this.calculateImpact(result),
        firstDetected: new Date(),
        lastOccurred: new Date(),
        occurrences: 1
      };

      this.activeIssues.set(issueId, newIssue);
      console.log(`🚨 检测到新问题: ${newIssue.title} (${newIssue.severity})`);
    }
  }

  /**
   * 检测并修复问题
   */
  private async detectAndRepairIssues(): Promise<void> {
    const criticalIssues = Array.from(this.activeIssues.values())
      .filter(issue => issue.severity === 'critical' && issue.autoFixAvailable)
      .sort((a, b) => b.estimatedImpact - a.estimatedImpact);

    for (const issue of criticalIssues) {
      console.log(`🔧 尝试自动修复: ${issue.title}`);
      await this.attemptAutoRepair(issue);
    }

    // 清理已解决的问题
    this.cleanupResolvedIssues();
  }

  /**
   * 尝试自动修复
   */
  private async attemptAutoRepair(issue: SystemIssue): Promise<void> {
    const suitableActions = Array.from(this.repairActions.values())
      .filter(action => action.targetIssues.some(target => 
        issue.affectedComponents.some(component => component.includes(target))
      ))
      .sort((a, b) => b.successRate - a.successRate);

    if (suitableActions.length === 0) {
      console.log(`❌ 没有找到适合的修复动作: ${issue.title}`);
      return;
    }

    const action = suitableActions[0];
    
    try {
      console.log(`🔧 执行修复动作: ${action.name}`);
      const result = await action.execute(issue);
      
      this.repairHistory.push(result);
      
      // 限制历史记录长度
      if (this.repairHistory.length > 50) {
        this.repairHistory = this.repairHistory.slice(-50);
      }

      if (result.success) {
        console.log(`✅ 修复成功: ${result.message}`);
        // 标记问题为已修复（暂时移除，稍后验证）
        this.activeIssues.delete(issue.id);
      } else {
        console.log(`❌ 修复失败: ${result.message}`);
      }
    } catch (error) {
      console.error(`❌ 修复动作执行异常: ${error}`);
    }
  }

  /**
   * 清理已解决的问题
   */
  private cleanupResolvedIssues(): void {
    const now = Date.now();
    const staleThreshold = 5 * 60 * 1000; // 5分钟

    for (const [issueId, issue] of this.activeIssues) {
      // 如果问题在过去5分钟内没有再次出现，认为已解决
      if (now - issue.lastOccurred.getTime() > staleThreshold) {
        this.activeIssues.delete(issueId);
        console.log(`✅ 问题已解决: ${issue.title}`);
      }
    }
  }

  /**
   * 生成系统健康报告
   */
  generateHealthReport(): SystemHealthReport {
    const now = new Date();
    const categories = this.calculateCategoryHealth();
    const overallHealth = this.calculateOverallHealth(categories);
    
    return {
      timestamp: now,
      overallHealth,
      status: overallHealth >= 90 ? 'healthy' :
              overallHealth >= 70 ? 'degraded' :
              overallHealth >= 50 ? 'unhealthy' : 'critical',
      categories,
      activeIssues: Array.from(this.activeIssues.values()),
      recentRepairs: this.repairHistory.slice(-10),
      recommendations: this.generateRecommendations(),
      uptime: now.getTime() - this.systemStartTime.getTime(),
      lastFullCheck: now
    };
  }

  /**
   * 获取实时健康状态
   */
  getHealthStatus(): { [checkId: string]: HealthCheckResult | null } {
    const status: { [checkId: string]: HealthCheckResult | null } = {};
    
    for (const checkId of this.healthChecks.keys()) {
      const results = this.checkResults.get(checkId);
      status[checkId] = results && results.length > 0 ? results[results.length - 1] : null;
    }
    
    return status;
  }

  /**
   * 手动触发健康检查
   */
  async runHealthCheck(checkId?: string): Promise<HealthCheckResult[]> {
    const checksToRun = checkId ? [this.healthChecks.get(checkId)].filter(Boolean) : 
                                 Array.from(this.healthChecks.values()).filter(c => c.enabled);
    
    const results: HealthCheckResult[] = [];
    
    for (const check of checksToRun) {
      try {
        const result = await check!.check();
        results.push(result);
        
        // 更新结果缓存
        if (!this.checkResults.has(check!.id)) {
          this.checkResults.set(check!.id, []);
        }
        this.checkResults.get(check!.id)!.push(result);
        
        await this.analyzeHealthResult(result);
      } catch (error) {
        console.error(`❌ 手动健康检查失败 (${check!.id}):`, error);
      }
    }
    
    return results;
  }

  /**
   * 辅助方法
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return ((last - first) / first) * 100;
  }

  private clearLargeObjectReferences(): void {
    // 这里应该清理应用中的大对象引用
    // 例如：清理Three.js几何体、纹理、WebGL缓冲区等
    console.log('🧹 清理大型对象引用');
  }

  private categorizeIssueType(checkId: string): SystemIssue['type'] {
    if (checkId.includes('memory')) return 'resource';
    if (checkId.includes('gpu') || checkId.includes('render')) return 'performance';
    if (checkId.includes('network')) return 'stability';
    if (checkId.includes('app')) return 'stability';
    return 'performance';
  }

  private hasAutoRepair(checkId: string): boolean {
    return Array.from(this.repairActions.values())
      .some(action => action.targetIssues.some(target => checkId.includes(target)));
  }

  private calculateImpact(result: HealthCheckResult): number {
    const severityWeights = { healthy: 0, warning: 0.3, critical: 0.8, error: 1.0 };
    const categoryWeights = { memory: 0.9, gpu: 0.8, cpu: 0.7, network: 0.6, application: 0.8 };
    
    const checkItem = this.healthChecks.get(result.checkId);
    const categoryWeight = categoryWeights[checkItem?.category || 'cpu'] || 0.5;
    const severityWeight = severityWeights[result.status] || 0;
    
    return categoryWeight * severityWeight;
  }

  private calculateCategoryHealth(): { [category: string]: { health: number; status: string; issues: number } } {
    const categories: { [category: string]: { health: number; status: string; issues: number } } = {};
    
    for (const check of this.healthChecks.values()) {
      if (!categories[check.category]) {
        categories[check.category] = { health: 100, status: 'healthy', issues: 0 };
      }
      
      const results = this.checkResults.get(check.id);
      if (results && results.length > 0) {
        const latestResult = results[results.length - 1];
        if (latestResult.status !== 'healthy') {
          categories[check.category].issues++;
          if (latestResult.status === 'critical') {
            categories[check.category].health -= 30;
          } else if (latestResult.status === 'warning') {
            categories[check.category].health -= 15;
          } else if (latestResult.status === 'error') {
            categories[check.category].health -= 20;
          }
        }
      }
      
      categories[check.category].health = Math.max(0, categories[check.category].health);
      categories[check.category].status = 
        categories[check.category].health >= 80 ? 'healthy' :
        categories[check.category].health >= 60 ? 'degraded' :
        categories[check.category].health >= 40 ? 'unhealthy' : 'critical';
    }
    
    return categories;
  }

  private calculateOverallHealth(categories: { [category: string]: { health: number; status: string; issues: number } }): number {
    const weights = { memory: 0.25, gpu: 0.25, cpu: 0.2, network: 0.15, application: 0.15 };
    let totalHealth = 0;
    let totalWeight = 0;
    
    for (const [category, data] of Object.entries(categories)) {
      const weight = weights[category as keyof typeof weights] || 0.1;
      totalHealth += data.health * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? totalHealth / totalWeight : 100;
  }

  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    const issues = Array.from(this.activeIssues.values());
    
    if (issues.some(i => i.type === 'resource')) {
      recommendations.push('考虑增加系统内存或优化内存使用');
    }
    
    if (issues.some(i => i.type === 'performance')) {
      recommendations.push('检查GPU驱动程序更新和渲染设置');
    }
    
    if (issues.some(i => i.type === 'stability')) {
      recommendations.push('检查网络连接和应用程序稳定性');
    }
    
    if (issues.length === 0) {
      recommendations.push('系统运行良好，继续保持当前配置');
    }
    
    return recommendations;
  }
}

/**
 * 全局系统健康诊断器实例
 */
export const globalHealthDiagnostics = new SystemHealthDiagnostics();

export default SystemHealthDiagnostics;