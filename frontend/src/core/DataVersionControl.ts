/**
 * DeepCAD 数据版本控制和回滚机制
 * 1号架构师 - 确保CAE工作流中数据状态的可靠性和可回溯性
 */

import { EventEmitter } from 'events';
import { SHA256 } from 'crypto-js';

// ==================== 类型定义 ====================

export interface DataSnapshot {
  id: string;
  timestamp: number;
  checksum: string;
  data: any;
  metadata: {
    version: string;
    author: string;
    description: string;
    tags: string[];
    size: number;
    operationType: 'geometry' | 'mesh' | 'material' | 'computation' | 'results' | 'manual';
    changeType: 'create' | 'update' | 'delete' | 'transform' | 'merge';
  };
  relationships: {
    parentId?: string;
    childrenIds: string[];
    branchName: string;
    commitMessage: string;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
}

export interface DataBranch {
  name: string;
  head: string; // snapshot id
  created: number;
  lastModified: number;
  description: string;
  isProtected: boolean;
}

export interface VersionControlConfig {
  maxSnapshots: number;
  compressionEnabled: boolean;
  autoSnapshotInterval?: number;
  retentionPolicy: {
    keepDays: number;
    maxVersionsPerBranch: number;
    importantTagsKeepForever: string[];
  };
  validation: {
    checksumValidation: boolean;
    dataIntegrityChecks: boolean;
    schemaValidation: boolean;
  };
}

export interface ComparisonResult {
  snapshotA: string;
  snapshotB: string;
  differences: {
    added: any[];
    removed: any[];
    modified: Array<{
      path: string;
      oldValue: any;
      newValue: any;
    }>;
  };
  statistics: {
    totalChanges: number;
    additionsCount: number;
    deletionsCount: number;
    modificationsCount: number;
  };
}

// ==================== 数据版本控制管理器 ====================

export class DataVersionControl extends EventEmitter {
  private snapshots: Map<string, DataSnapshot> = new Map();
  private branches: Map<string, DataBranch> = new Map();
  private currentBranch: string = 'main';
  private config: VersionControlConfig;
  private compressionWorker?: Worker;

  constructor(config: Partial<VersionControlConfig> = {}) {
    super();
    
    this.config = {
      maxSnapshots: 1000,
      compressionEnabled: true,
      autoSnapshotInterval: 300000, // 5分钟
      retentionPolicy: {
        keepDays: 30,
        maxVersionsPerBranch: 100,
        importantTagsKeepForever: ['milestone', 'release', 'backup']
      },
      validation: {
        checksumValidation: true,
        dataIntegrityChecks: true,
        schemaValidation: true
      },
      ...config
    };

    this.initializeDefaultBranch();
    this.setupAutoSnapshot();
    this.setupCompressionWorker();
  }

  /**
   * 初始化默认分支
   */
  private initializeDefaultBranch(): void {
    const mainBranch: DataBranch = {
      name: 'main',
      head: '',
      created: Date.now(),
      lastModified: Date.now(),
      description: '主要开发分支',
      isProtected: false
    };
    
    this.branches.set('main', mainBranch);
  }

  /**
   * 设置自动快照
   */
  private setupAutoSnapshot(): void {
    if (this.config.autoSnapshotInterval) {
      setInterval(() => {
        this.emit('auto-snapshot-trigger');
      }, this.config.autoSnapshotInterval);
    }
  }

  /**
   * 设置压缩工作器
   */
  private setupCompressionWorker(): void {
    if (this.config.compressionEnabled && typeof Worker !== 'undefined') {
      try {
        // 创建内联 Worker
        const workerScript = `
          self.onmessage = function(e) {
            const { data, operation } = e.data;
            
            if (operation === 'compress') {
              // 简单的 JSON 压缩
              const compressed = JSON.stringify(data);
              self.postMessage({ compressed, originalSize: JSON.stringify(data).length });
            } else if (operation === 'decompress') {
              const decompressed = JSON.parse(data);
              self.postMessage({ decompressed });
            }
          };
        `;
        
        const blob = new Blob([workerScript], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('无法创建压缩工作器，将使用同步压缩:', error);
      }
    }
  }

  /**
   * 创建数据快照
   */
  public async createSnapshot(
    data: any,
    metadata: Partial<DataSnapshot['metadata']> = {},
    commitMessage: string = 'Auto snapshot'
  ): Promise<string> {
    try {
      const timestamp = Date.now();
      const snapshotId = this.generateSnapshotId(timestamp);
      
      // 计算数据校验和
      const checksum = this.calculateChecksum(data);
      
      // 数据验证
      const validation = await this.validateData(data);
      
      // 获取当前分支信息
      const currentBranchInfo = this.branches.get(this.currentBranch)!;
      
      // 创建快照
      const snapshot: DataSnapshot = {
        id: snapshotId,
        timestamp,
        checksum,
        data: this.config.compressionEnabled ? await this.compressData(data) : data,
        metadata: {
          version: '1.0.0',
          author: 'DeepCAD-User',
          description: '',
          tags: [],
          size: JSON.stringify(data).length,
          operationType: 'manual',
          changeType: 'create',
          ...metadata
        },
        relationships: {
          parentId: currentBranchInfo.head || undefined,
          childrenIds: [],
          branchName: this.currentBranch,
          commitMessage
        },
        validation
      };

      // 存储快照
      this.snapshots.set(snapshotId, snapshot);
      
      // 更新分支头部
      const updatedBranch = {
        ...currentBranchInfo,
        head: snapshotId,
        lastModified: timestamp
      };
      this.branches.set(this.currentBranch, updatedBranch);

      // 更新父快照的子节点信息
      if (snapshot.relationships.parentId) {
        const parentSnapshot = this.snapshots.get(snapshot.relationships.parentId);
        if (parentSnapshot) {
          parentSnapshot.relationships.childrenIds.push(snapshotId);
        }
      }

      // 触发事件
      this.emit('snapshot-created', {
        snapshotId,
        branchName: this.currentBranch,
        metadata: snapshot.metadata
      });

      // 执行清理策略
      await this.applyRetentionPolicy();

      return snapshotId;
    } catch (error) {
      this.emit('snapshot-error', { error, operation: 'create' });
      throw error;
    }
  }

  /**
   * 恢复到指定快照
   */
  public async restoreToSnapshot(snapshotId: string): Promise<any> {
    try {
      const snapshot = this.snapshots.get(snapshotId);
      if (!snapshot) {
        throw new Error(`快照 ${snapshotId} 不存在`);
      }

      // 验证快照完整性
      const isValid = await this.validateSnapshot(snapshot);
      if (!isValid) {
        throw new Error(`快照 ${snapshotId} 数据完整性验证失败`);
      }

      // 解压数据
      const data = this.config.compressionEnabled 
        ? await this.decompressData(snapshot.data)
        : snapshot.data;

      // 更新当前分支头部
      const branch = this.branches.get(this.currentBranch)!;
      branch.head = snapshotId;
      branch.lastModified = Date.now();

      // 触发事件
      this.emit('snapshot-restored', {
        snapshotId,
        branchName: this.currentBranch,
        timestamp: Date.now()
      });

      return data;
    } catch (error) {
      this.emit('snapshot-error', { error, operation: 'restore' });
      throw error;
    }
  }

  /**
   * 创建新分支
   */
  public createBranch(branchName: string, fromSnapshot?: string, description: string = ''): void {
    if (this.branches.has(branchName)) {
      throw new Error(`分支 ${branchName} 已存在`);
    }

    const headSnapshot = fromSnapshot || this.branches.get(this.currentBranch)?.head || '';
    
    const newBranch: DataBranch = {
      name: branchName,
      head: headSnapshot,
      created: Date.now(),
      lastModified: Date.now(),
      description,
      isProtected: false
    };

    this.branches.set(branchName, newBranch);
    
    this.emit('branch-created', { branchName, fromSnapshot: headSnapshot });
  }

  /**
   * 切换分支
   */
  public switchBranch(branchName: string): void {
    if (!this.branches.has(branchName)) {
      throw new Error(`分支 ${branchName} 不存在`);
    }

    const oldBranch = this.currentBranch;
    this.currentBranch = branchName;
    
    this.emit('branch-switched', { from: oldBranch, to: branchName });
  }

  /**
   * 合并分支
   */
  public async mergeBranch(
    sourceBranch: string, 
    targetBranch: string = this.currentBranch,
    strategy: 'fast-forward' | 'three-way' = 'three-way'
  ): Promise<string> {
    const source = this.branches.get(sourceBranch);
    const target = this.branches.get(targetBranch);

    if (!source || !target) {
      throw new Error('源分支或目标分支不存在');
    }

    if (strategy === 'fast-forward') {
      // 快进合并
      target.head = source.head;
      target.lastModified = Date.now();
      
      const mergeCommitMessage = `Fast-forward merge ${sourceBranch} into ${targetBranch}`;
      
      this.emit('branch-merged', {
        source: sourceBranch,
        target: targetBranch,
        strategy,
        commitMessage: mergeCommitMessage
      });

      return target.head;
    } else {
      // 三方合并
      const sourceSnapshot = this.snapshots.get(source.head);
      const targetSnapshot = this.snapshots.get(target.head);

      if (!sourceSnapshot || !targetSnapshot) {
        throw new Error('无法找到合并所需的快照');
      }

      // 寻找共同祖先
      const commonAncestor = this.findCommonAncestor(source.head, target.head);
      
      // 执行三方合并
      const mergedData = await this.performThreeWayMerge(
        commonAncestor,
        sourceSnapshot,
        targetSnapshot
      );

      // 创建合并快照
      const mergeCommitMessage = `Merge ${sourceBranch} into ${targetBranch}`;
      const mergeSnapshotId = await this.createSnapshot(
        mergedData,
        {
          operationType: 'manual',
          changeType: 'merge',
          description: `合并分支 ${sourceBranch}`,
          tags: ['merge']
        },
        mergeCommitMessage
      );

      this.emit('branch-merged', {
        source: sourceBranch,
        target: targetBranch,
        strategy,
        commitMessage: mergeCommitMessage,
        mergeSnapshotId
      });

      return mergeSnapshotId;
    }
  }

  /**
   * 比较两个快照
   */
  public compareSnapshots(snapshotA: string, snapshotB: string): ComparisonResult {
    const snapA = this.snapshots.get(snapshotA);
    const snapB = this.snapshots.get(snapshotB);

    if (!snapA || !snapB) {
      throw new Error('无法找到指定的快照进行比较');
    }

    const dataA = this.config.compressionEnabled ? this.decompressDataSync(snapA.data) : snapA.data;
    const dataB = this.config.compressionEnabled ? this.decompressDataSync(snapB.data) : snapB.data;

    const differences = this.calculateDifferences(dataA, dataB);
    
    return {
      snapshotA,
      snapshotB,
      differences,
      statistics: {
        totalChanges: differences.added.length + differences.removed.length + differences.modified.length,
        additionsCount: differences.added.length,
        deletionsCount: differences.removed.length,
        modificationsCount: differences.modified.length
      }
    };
  }

  /**
   * 获取快照历史
   */
  public getHistory(branchName?: string, limit: number = 50): DataSnapshot[] {
    const branch = branchName ? this.branches.get(branchName) : this.branches.get(this.currentBranch);
    
    if (!branch) {
      return [];
    }

    const history: DataSnapshot[] = [];
    let currentSnapshotId = branch.head;
    let count = 0;

    while (currentSnapshotId && count < limit) {
      const snapshot = this.snapshots.get(currentSnapshotId);
      if (!snapshot) break;

      history.push(snapshot);
      currentSnapshotId = snapshot.relationships.parentId;
      count++;
    }

    return history;
  }

  /**
   * 添加标签
   */
  public addTag(snapshotId: string, tag: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`快照 ${snapshotId} 不存在`);
    }

    if (!snapshot.metadata.tags.includes(tag)) {
      snapshot.metadata.tags.push(tag);
      this.emit('tag-added', { snapshotId, tag });
    }
  }

  /**
   * 移除标签
   */
  public removeTag(snapshotId: string, tag: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`快照 ${snapshotId} 不存在`);
    }

    const tagIndex = snapshot.metadata.tags.indexOf(tag);
    if (tagIndex > -1) {
      snapshot.metadata.tags.splice(tagIndex, 1);
      this.emit('tag-removed', { snapshotId, tag });
    }
  }

  /**
   * 获取所有分支
   */
  public getBranches(): DataBranch[] {
    return Array.from(this.branches.values());
  }

  /**
   * 获取当前分支
   */
  public getCurrentBranch(): string {
    return this.currentBranch;
  }

  /**
   * 获取快照详情
   */
  public getSnapshot(snapshotId: string): DataSnapshot | undefined {
    return this.snapshots.get(snapshotId);
  }

  /**
   * 删除快照
   */
  public deleteSnapshot(snapshotId: string): void {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      throw new Error(`快照 ${snapshotId} 不存在`);
    }

    // 检查是否为分支头部
    const isHead = Array.from(this.branches.values()).some(branch => branch.head === snapshotId);
    if (isHead) {
      throw new Error('无法删除分支头部快照');
    }

    // 检查是否有重要标签
    const hasImportantTags = snapshot.metadata.tags.some(tag => 
      this.config.retentionPolicy.importantTagsKeepForever.includes(tag)
    );
    if (hasImportantTags) {
      throw new Error('无法删除带有重要标签的快照');
    }

    // 更新父子关系
    if (snapshot.relationships.parentId) {
      const parent = this.snapshots.get(snapshot.relationships.parentId);
      if (parent) {
        const childIndex = parent.relationships.childrenIds.indexOf(snapshotId);
        if (childIndex > -1) {
          parent.relationships.childrenIds.splice(childIndex, 1);
          // 将当前快照的子节点链接到父节点
          parent.relationships.childrenIds.push(...snapshot.relationships.childrenIds);
        }
      }
    }

    // 更新子节点的父关系
    snapshot.relationships.childrenIds.forEach(childId => {
      const child = this.snapshots.get(childId);
      if (child) {
        child.relationships.parentId = snapshot.relationships.parentId;
      }
    });

    this.snapshots.delete(snapshotId);
    this.emit('snapshot-deleted', { snapshotId });
  }

  // ==================== 私有方法 ====================

  /**
   * 生成快照ID
   */
  private generateSnapshotId(timestamp: number): string {
    const random = Math.random().toString(36).substring(2, 15);
    return `snap_${timestamp}_${random}`;
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return SHA256(dataString).toString();
  }

  /**
   * 验证数据
   */
  private async validateData(data: any): Promise<DataSnapshot['validation']> {
    const validation: DataSnapshot['validation'] = {
      isValid: true,
      errors: [],
      warnings: []
    };

    try {
      // 基本数据结构验证
      if (data === null || data === undefined) {
        validation.errors.push('数据不能为空');
        validation.isValid = false;
      }

      // 数据大小检查
      const dataSize = JSON.stringify(data).length;
      if (dataSize > 100 * 1024 * 1024) { // 100MB
        validation.warnings.push('数据大小超过100MB，可能影响性能');
      }

      // CAE特定验证
      if (data.geometry && !this.validateGeometryData(data.geometry)) {
        validation.errors.push('几何数据格式无效');
        validation.isValid = false;
      }

      if (data.mesh && !this.validateMeshData(data.mesh)) {
        validation.errors.push('网格数据格式无效');
        validation.isValid = false;
      }

    } catch (error) {
      validation.errors.push(`数据验证异常: ${error}`);
      validation.isValid = false;
    }

    return validation;
  }

  /**
   * 验证几何数据
   */
  private validateGeometryData(geometry: any): boolean {
    return geometry && 
           typeof geometry === 'object' &&
           Array.isArray(geometry.vertices) &&
           Array.isArray(geometry.normals);
  }

  /**
   * 验证网格数据
   */
  private validateMeshData(mesh: any): boolean {
    return mesh && 
           typeof mesh === 'object' &&
           Array.isArray(mesh.nodes) &&
           Array.isArray(mesh.elements);
  }

  /**
   * 验证快照完整性
   */
  private async validateSnapshot(snapshot: DataSnapshot): Promise<boolean> {
    if (!this.config.validation.checksumValidation) {
      return true;
    }

    try {
      const data = this.config.compressionEnabled 
        ? await this.decompressData(snapshot.data)
        : snapshot.data;
      
      const currentChecksum = this.calculateChecksum(data);
      return currentChecksum === snapshot.checksum;
    } catch (error) {
      console.error('快照验证失败:', error);
      return false;
    }
  }

  /**
   * 压缩数据
   */
  private async compressData(data: any): Promise<any> {
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const handleMessage = (e: MessageEvent) => {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          resolve(e.data.compressed);
        };
        
        this.compressionWorker.addEventListener('message', handleMessage);
        this.compressionWorker.postMessage({ data, operation: 'compress' });
        
        // 超时处理
        setTimeout(() => {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          reject(new Error('压缩超时'));
        }, 10000);
      });
    } else {
      // 同步压缩
      return JSON.stringify(data);
    }
  }

  /**
   * 解压数据
   */
  private async decompressData(compressedData: any): Promise<any> {
    if (this.compressionWorker) {
      return new Promise((resolve, reject) => {
        const handleMessage = (e: MessageEvent) => {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          resolve(e.data.decompressed);
        };
        
        this.compressionWorker.addEventListener('message', handleMessage);
        this.compressionWorker.postMessage({ data: compressedData, operation: 'decompress' });
        
        // 超时处理
        setTimeout(() => {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          reject(new Error('解压超时'));
        }, 10000);
      });
    } else {
      // 同步解压
      return typeof compressedData === 'string' ? JSON.parse(compressedData) : compressedData;
    }
  }

  /**
   * 同步解压数据
   */
  private decompressDataSync(compressedData: any): any {
    return typeof compressedData === 'string' ? JSON.parse(compressedData) : compressedData;
  }

  /**
   * 寻找共同祖先
   */
  private findCommonAncestor(snapshotA: string, snapshotB: string): string | null {
    const pathA = this.getSnapshotPath(snapshotA);
    const pathB = this.getSnapshotPath(snapshotB);
    
    // 寻找最近共同祖先
    for (let i = pathA.length - 1; i >= 0; i--) {
      if (pathB.includes(pathA[i])) {
        return pathA[i];
      }
    }
    
    return null;
  }

  /**
   * 获取快照路径
   */
  private getSnapshotPath(snapshotId: string): string[] {
    const path: string[] = [];
    let currentId = snapshotId;
    
    while (currentId) {
      path.push(currentId);
      const snapshot = this.snapshots.get(currentId);
      if (!snapshot || !snapshot.relationships.parentId) break;
      currentId = snapshot.relationships.parentId;
    }
    
    return path;
  }

  /**
   * 执行三方合并
   */
  private async performThreeWayMerge(
    ancestorId: string | null,
    source: DataSnapshot,
    target: DataSnapshot
  ): Promise<any> {
    const sourceData = this.config.compressionEnabled 
      ? await this.decompressData(source.data)
      : source.data;
    
    const targetData = this.config.compressionEnabled 
      ? await this.decompressData(target.data)
      : target.data;

    let ancestorData = null;
    if (ancestorId) {
      const ancestor = this.snapshots.get(ancestorId);
      if (ancestor) {
        ancestorData = this.config.compressionEnabled 
          ? await this.decompressData(ancestor.data)
          : ancestor.data;
      }
    }

    // 简单的合并策略：优先使用源数据，冲突时保留两者
    const merged = { ...targetData };
    
    for (const key in sourceData) {
      if (sourceData.hasOwnProperty(key)) {
        if (key in merged) {
          // 处理冲突：创建合并标记
          if (JSON.stringify(merged[key]) !== JSON.stringify(sourceData[key])) {
            merged[`${key}_conflict`] = {
              source: sourceData[key],
              target: merged[key],
              ancestor: ancestorData ? ancestorData[key] : null
            };
          }
        } else {
          merged[key] = sourceData[key];
        }
      }
    }

    return merged;
  }

  /**
   * 计算差异
   */
  private calculateDifferences(dataA: any, dataB: any): ComparisonResult['differences'] {
    const differences = {
      added: [] as any[],
      removed: [] as any[],
      modified: [] as Array<{ path: string; oldValue: any; newValue: any; }>
    };

    // 简化的差异计算
    const keysA = new Set(Object.keys(dataA || {}));
    const keysB = new Set(Object.keys(dataB || {}));

    // 查找新增的键
    keysB.forEach(key => {
      if (!keysA.has(key)) {
        differences.added.push({ path: key, value: dataB[key] });
      }
    });

    // 查找删除的键
    keysA.forEach(key => {
      if (!keysB.has(key)) {
        differences.removed.push({ path: key, value: dataA[key] });
      }
    });

    // 查找修改的键
    keysA.forEach(key => {
      if (keysB.has(key) && JSON.stringify(dataA[key]) !== JSON.stringify(dataB[key])) {
        differences.modified.push({
          path: key,
          oldValue: dataA[key],
          newValue: dataB[key]
        });
      }
    });

    return differences;
  }

  /**
   * 应用保留策略
   */
  private async applyRetentionPolicy(): Promise<void> {
    const now = Date.now();
    const retentionPeriod = this.config.retentionPolicy.keepDays * 24 * 60 * 60 * 1000;
    
    // 获取需要清理的快照
    const snapshotsToDelete: string[] = [];
    
    this.snapshots.forEach((snapshot, id) => {
      // 跳过重要标签的快照
      const hasImportantTags = snapshot.metadata.tags.some(tag => 
        this.config.retentionPolicy.importantTagsKeepForever.includes(tag)
      );
      
      if (hasImportantTags) return;
      
      // 跳过分支头部快照
      const isHead = Array.from(this.branches.values()).some(branch => branch.head === id);
      if (isHead) return;
      
      // 检查是否超过保留期限
      if (now - snapshot.timestamp > retentionPeriod) {
        snapshotsToDelete.push(id);
      }
    });

    // 检查每个分支的快照数量限制
    this.branches.forEach(branch => {
      const branchSnapshots = this.getHistory(branch.name, this.config.retentionPolicy.maxVersionsPerBranch + 10);
      if (branchSnapshots.length > this.config.retentionPolicy.maxVersionsPerBranch) {
        const excessSnapshots = branchSnapshots.slice(this.config.retentionPolicy.maxVersionsPerBranch);
        excessSnapshots.forEach(snapshot => {
          if (!snapshotsToDelete.includes(snapshot.id)) {
            snapshotsToDelete.push(snapshot.id);
          }
        });
      }
    });

    // 执行删除
    for (const snapshotId of snapshotsToDelete) {
      try {
        this.deleteSnapshot(snapshotId);
      } catch (error) {
        console.warn(`清理快照 ${snapshotId} 失败:`, error);
      }
    }

    if (snapshotsToDelete.length > 0) {
      this.emit('retention-policy-applied', { deletedCount: snapshotsToDelete.length });
    }
  }

  /**
   * 销毁实例
   */
  public destroy(): void {
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.snapshots.clear();
    this.branches.clear();
    this.removeAllListeners();
  }

  /**
   * 获取统计信息
   */
  public getStatistics() {
    const totalSnapshots = this.snapshots.size;
    const totalBranches = this.branches.size;
    
    let totalDataSize = 0;
    let oldestSnapshot = Date.now();
    let newestSnapshot = 0;
    
    this.snapshots.forEach(snapshot => {
      totalDataSize += snapshot.metadata.size;
      if (snapshot.timestamp < oldestSnapshot) {
        oldestSnapshot = snapshot.timestamp;
      }
      if (snapshot.timestamp > newestSnapshot) {
        newestSnapshot = snapshot.timestamp;
      }
    });

    return {
      totalSnapshots,
      totalBranches,
      totalDataSize,
      oldestSnapshot: new Date(oldestSnapshot),
      newestSnapshot: new Date(newestSnapshot),
      currentBranch: this.currentBranch,
      retentionPolicy: this.config.retentionPolicy
    };
  }
}

// ==================== 导出 ====================

export default DataVersionControl;