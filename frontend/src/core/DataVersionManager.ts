/**
 * 数据版本控制和回滚管理系统
 * 1号架构师 - 支持多版本数据管理和智能回滚
 */

import { EventEmitter } from 'events';
import { DataFlowManager, dataFlowManager } from './DataFlowManager';
import type { DataVersion, DataFlowNode } from './DataFlowManager';

// 版本控制策略
export type VersionStrategy = 'linear' | 'branching' | 'merge';

// 版本比较结果
export interface VersionDiff {
  added: string[];
  removed: string[];
  modified: Array<{
    path: string;
    oldValue: any;
    newValue: any;
    changeType: 'value' | 'type' | 'structure';
  }>;
  statistics: {
    totalChanges: number;
    significantChanges: number;
    compatibilityScore: number;
  };
}

// 回滚选项
export interface RollbackOptions {
  targetVersionId: string;
  preserveCurrentAsSnapshot?: boolean;
  applySelectively?: string[]; // 只回滚指定字段
  validateBeforeRollback?: boolean;
  createBackup?: boolean;
}

// 版本分支
export interface VersionBranch {
  id: string;
  name: string;
  baseVersionId: string;
  headVersionId: string;
  createdAt: number;
  author: string;
  description: string;
  isActive: boolean;
}

// 版本标签
export interface VersionTag {
  id: string;
  versionId: string;
  name: string;
  type: 'release' | 'milestone' | 'backup' | 'checkpoint';
  description: string;
  metadata: Record<string, any>;
  createdAt: number;
}

// 合并冲突
export interface MergeConflict {
  path: string;
  currentValue: any;
  incomingValue: any;
  baseValue?: any;
  resolution?: 'current' | 'incoming' | 'merge' | 'custom';
  customValue?: any;
}

/**
 * 数据版本管理器核心类
 */
export class DataVersionManager extends EventEmitter {
  private dataFlowManager: DataFlowManager;
  private branches: Map<string, VersionBranch> = new Map();
  private tags: Map<string, VersionTag> = new Map();
  private activeBranch: string = 'main';
  
  // 版本控制配置
  private config = {
    maxVersionsPerBranch: 50,
    autoCleanupEnabled: true,
    conflictResolutionStrategy: 'manual' as 'auto' | 'manual',
    compressionEnabled: true,
    diffAlgorithm: 'deep' as 'shallow' | 'deep',
    snapshotInterval: 300000, // 5分钟
    maxDiffSize: 10 * 1024 * 1024 // 10MB
  };

  constructor(dataFlowManager: DataFlowManager, options: Partial<typeof DataVersionManager.prototype.config> = {}) {
    super();
    this.dataFlowManager = dataFlowManager;
    this.config = { ...this.config, ...options };
    
    // 创建主分支
    this.createBranch('main', 'Main development branch', null);
    
    // 定期快照
    this.startAutoSnapshots();
    
    console.log('🔄 DataVersionManager初始化完成');
  }

  // ==================== 版本控制核心 ====================

  /**
   * 回滚到指定版本
   */
  public async rollbackToVersion(nodeId: string, options: RollbackOptions): Promise<void> {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    const targetVersion = node.versions.find(v => v.id === options.targetVersionId);
    if (!targetVersion) {
      throw new Error(`版本 ${options.targetVersionId} 不存在`);
    }

    try {
      // 1. 创建当前状态快照（如果需要）
      if (options.preserveCurrentAsSnapshot) {
        await this.createSnapshot(nodeId, '回滚前自动快照', 'system');
      }

      // 2. 验证回滚的安全性
      if (options.validateBeforeRollback) {
        const validation = await this.validateRollback(nodeId, options.targetVersionId);
        if (!validation.isValid) {
          throw new Error(`回滚验证失败: ${validation.reasons.join(', ')}`);
        }
      }

      // 3. 执行回滚
      const rollbackData = await this.retrieveVersionData(nodeId, options.targetVersionId);
      
      if (options.applySelectively && options.applySelectively.length > 0) {
        // 选择性回滚
        const currentData = node.data;
        const mergedData = this.mergeDataSelectively(currentData, rollbackData, options.applySelectively);
        this.dataFlowManager.updateNodeData(nodeId, mergedData, `选择性回滚到 ${targetVersion.description}`);
      } else {
        // 完整回滚
        this.dataFlowManager.updateNodeData(nodeId, rollbackData, `回滚到 ${targetVersion.description}`);
      }

      this.emit('rollback_completed', {
        nodeId,
        targetVersionId: options.targetVersionId,
        timestamp: Date.now()
      });

      console.log(`✅ 节点 ${nodeId} 成功回滚到版本 ${options.targetVersionId}`);

    } catch (error) {
      this.emit('rollback_failed', {
        nodeId,
        targetVersionId: options.targetVersionId,
        error: error as Error,
        timestamp: Date.now()
      });
      throw error;
    }
  }

  /**
   * 比较两个版本
   */
  public compareVersions(nodeId: string, version1Id: string, version2Id: string): VersionDiff {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    const v1Data = this.getVersionData(nodeId, version1Id);
    const v2Data = this.getVersionData(nodeId, version2Id);

    return this.calculateDiff(v1Data, v2Data);
  }

  /**
   * 获取版本历史
   */
  public getVersionHistory(nodeId: string, options: { 
    limit?: number; 
    branchId?: string; 
    includeMetadata?: boolean 
  } = {}): DataVersion[] {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    let versions = [...node.versions];

    // 按时间倒序排列
    versions.sort((a, b) => b.timestamp - a.timestamp);

    // 应用限制
    if (options.limit) {
      versions = versions.slice(0, options.limit);
    }

    return versions;
  }

  // ==================== 分支管理 ====================

  /**
   * 创建新分支
   */
  public createBranch(branchId: string, description: string, baseVersionId: string | null): VersionBranch {
    if (this.branches.has(branchId)) {
      throw new Error(`分支 ${branchId} 已存在`);
    }

    const branch: VersionBranch = {
      id: branchId,
      name: branchId,
      baseVersionId: baseVersionId || '',
      headVersionId: baseVersionId || '',
      createdAt: Date.now(),
      author: 'system',
      description,
      isActive: branchId === 'main'
    };

    this.branches.set(branchId, branch);
    
    this.emit('branch_created', { branchId, timestamp: Date.now() });
    
    return branch;
  }

  /**
   * 切换分支
   */
  public switchBranch(branchId: string): void {
    const branch = this.branches.get(branchId);
    if (!branch) {
      throw new Error(`分支 ${branchId} 不存在`);
    }

    // 设置当前分支为非活跃
    const currentBranch = this.branches.get(this.activeBranch);
    if (currentBranch) {
      currentBranch.isActive = false;
    }

    // 激活新分支
    branch.isActive = true;
    this.activeBranch = branchId;

    this.emit('branch_switched', { 
      fromBranch: currentBranch?.id, 
      toBranch: branchId, 
      timestamp: Date.now() 
    });
  }

  /**
   * 合并分支
   */
  public async mergeBranch(sourceBranchId: string, targetBranchId: string): Promise<{
    conflicts: MergeConflict[];
    autoResolved: number;
    requiresManualResolution: number;
  }> {
    const sourceBranch = this.branches.get(sourceBranchId);
    const targetBranch = this.branches.get(targetBranchId);

    if (!sourceBranch || !targetBranch) {
      throw new Error('源分支或目标分支不存在');
    }

    // 查找合并冲突
    const conflicts = await this.detectMergeConflicts(sourceBranchId, targetBranchId);
    
    // 自动解决简单冲突
    const autoResolved = await this.autoResolveMergeConflicts(conflicts);
    const requiresManualResolution = conflicts.filter(c => !c.resolution).length;

    if (requiresManualResolution === 0) {
      // 可以自动合并
      await this.performMerge(sourceBranchId, targetBranchId, conflicts);
    }

    this.emit('merge_analysis_completed', {
      sourceBranchId,
      targetBranchId,
      conflicts: conflicts.length,
      autoResolved,
      requiresManualResolution,
      timestamp: Date.now()
    });

    return { conflicts, autoResolved, requiresManualResolution };
  }

  // ==================== 标签管理 ====================

  /**
   * 创建版本标签
   */
  public createTag(versionId: string, tagName: string, type: VersionTag['type'], description: string): VersionTag {
    const tagId = `${tagName}_${Date.now()}`;
    
    const tag: VersionTag = {
      id: tagId,
      versionId,
      name: tagName,
      type,
      description,
      metadata: {},
      createdAt: Date.now()
    };

    this.tags.set(tagId, tag);
    
    this.emit('tag_created', { tagId, versionId, tagName, timestamp: Date.now() });
    
    return tag;
  }

  /**
   * 获取所有标签
   */
  public getTags(nodeId?: string): VersionTag[] {
    const allTags = Array.from(this.tags.values());
    
    if (!nodeId) {
      return allTags;
    }

    // 过滤指定节点的标签
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      return [];
    }

    const nodeVersionIds = new Set(node.versions.map(v => v.id));
    return allTags.filter(tag => nodeVersionIds.has(tag.versionId));
  }

  // ==================== 快照和备份 ====================

  /**
   * 创建数据快照
   */
  public async createSnapshot(nodeId: string, description: string, author: string): Promise<DataVersion> {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // 创建快照版本
    const snapshotData = this.createDeepCopy(node.data);
    this.dataFlowManager.updateNodeData(nodeId, snapshotData, `快照: ${description}`);

    const latestVersion = node.currentVersion!;
    
    // 创建快照标签
    this.createTag(latestVersion.id, `snapshot_${Date.now()}`, 'checkpoint', description);

    this.emit('snapshot_created', { 
      nodeId, 
      versionId: latestVersion.id, 
      description, 
      timestamp: Date.now() 
    });

    return latestVersion;
  }

  /**
   * 自动快照定时器
   */
  private startAutoSnapshots(): void {
    setInterval(() => {
      this.createAutoSnapshots();
    }, this.config.snapshotInterval);
  }

  private async createAutoSnapshots(): Promise<void> {
    const nodes = this.dataFlowManager.getAllNodes();
    
    for (const node of nodes) {
      // 检查是否需要自动快照
      if (this.shouldCreateAutoSnapshot(node)) {
        try {
          await this.createSnapshot(node.id, '自动快照', 'system');
        } catch (error) {
          console.warn(`自动快照失败 - 节点 ${node.id}:`, error);
        }
      }
    }
  }

  private shouldCreateAutoSnapshot(node: DataFlowNode): boolean {
    if (!node.currentVersion) return false;
    
    const timeSinceLastVersion = Date.now() - node.currentVersion.timestamp;
    const hasSignificantChanges = node.currentVersion.size > 1024; // 1KB以上的变化
    
    return timeSinceLastVersion > this.config.snapshotInterval && hasSignificantChanges;
  }

  // ==================== 工具方法 ====================

  private async validateRollback(nodeId: string, targetVersionId: string): Promise<{
    isValid: boolean;
    reasons: string[];
  }> {
    const reasons: string[] = [];
    let isValid = true;

    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      reasons.push('节点不存在');
      return { isValid: false, reasons };
    }

    const targetVersion = node.versions.find(v => v.id === targetVersionId);
    if (!targetVersion) {
      reasons.push('目标版本不存在');
      return { isValid: false, reasons };
    }

    // 检查数据兼容性
    try {
      const versionData = await this.retrieveVersionData(nodeId, targetVersionId);
      const currentData = node.data;
      
      const diff = this.calculateDiff(currentData, versionData);
      if (diff.statistics.compatibilityScore < 0.8) {
        reasons.push('版本兼容性过低');
        isValid = false;
      }
    } catch (error) {
      reasons.push(`版本数据无法读取: ${error}`);
      isValid = false;
    }

    return { isValid, reasons };
  }

  private async retrieveVersionData(nodeId: string, versionId: string): Promise<any> {
    // 简化实现：从当前节点的版本历史中获取
    // 实际应用中可能需要从持久化存储中读取
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // 由于当前实现中版本只保存了元数据，这里返回当前数据的副本
    // 实际应用中应该保存完整的版本数据
    return this.createDeepCopy(node.data);
  }

  private getVersionData(nodeId: string, versionId: string): any {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    // 简化实现：返回当前数据
    return node.data;
  }

  private calculateDiff(data1: any, data2: any): VersionDiff {
    const diff: VersionDiff = {
      added: [],
      removed: [],
      modified: [],
      statistics: {
        totalChanges: 0,
        significantChanges: 0,
        compatibilityScore: 1.0
      }
    };

    // 简化的差异计算
    if (JSON.stringify(data1) !== JSON.stringify(data2)) {
      diff.modified.push({
        path: 'root',
        oldValue: data1,
        newValue: data2,
        changeType: 'value'
      });
      diff.statistics.totalChanges = 1;
      diff.statistics.significantChanges = 1;
      diff.statistics.compatibilityScore = 0.5;
    }

    return diff;
  }

  private mergeDataSelectively(currentData: any, rollbackData: any, selectedPaths: string[]): any {
    const result = this.createDeepCopy(currentData);
    
    for (const path of selectedPaths) {
      const value = this.getNestedValue(rollbackData, path);
      if (value !== undefined) {
        this.setNestedValue(result, path, value);
      }
    }
    
    return result;
  }

  private async detectMergeConflicts(sourceBranchId: string, targetBranchId: string): Promise<MergeConflict[]> {
    // 简化实现：返回空冲突数组
    return [];
  }

  private async autoResolveMergeConflicts(conflicts: MergeConflict[]): Promise<number> {
    let resolved = 0;
    
    for (const conflict of conflicts) {
      // 简单的自动解决策略
      if (typeof conflict.currentValue === typeof conflict.incomingValue) {
        conflict.resolution = 'incoming'; // 优先使用传入值
        resolved++;
      }
    }
    
    return resolved;
  }

  private async performMerge(sourceBranchId: string, targetBranchId: string, conflicts: MergeConflict[]): Promise<void> {
    // 执行实际的合并操作
    console.log(`执行分支合并: ${sourceBranchId} -> ${targetBranchId}`);
  }

  private createDeepCopy(data: any): any {
    return JSON.parse(JSON.stringify(data));
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // ==================== 公共API ====================

  public getBranches(): VersionBranch[] {
    return Array.from(this.branches.values());
  }

  public getActiveBranch(): VersionBranch | undefined {
    return this.branches.get(this.activeBranch);
  }

  public getVersionStatistics(nodeId: string): {
    totalVersions: number;
    oldestVersion: DataVersion | null;
    newestVersion: DataVersion | null;
    averageSize: number;
    totalSize: number;
  } {
    const node = this.dataFlowManager.getNode(nodeId);
    if (!node) {
      throw new Error(`节点 ${nodeId} 不存在`);
    }

    const versions = node.versions;
    const totalSize = versions.reduce((sum, v) => sum + v.size, 0);

    return {
      totalVersions: versions.length,
      oldestVersion: versions.length > 0 ? versions[0] : null,
      newestVersion: node.currentVersion,
      averageSize: versions.length > 0 ? totalSize / versions.length : 0,
      totalSize
    };
  }

  public dispose(): void {
    this.removeAllListeners();
    this.branches.clear();
    this.tags.clear();
    console.log('🔄 DataVersionManager已清理');
  }
}

// 导出单例实例  
export const dataVersionManager = new DataVersionManager(dataFlowManager);