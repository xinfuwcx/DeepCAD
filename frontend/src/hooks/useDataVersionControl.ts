/**
 * DeepCAD 数据版本控制 React Hook
 * 1号架构师 - 简化版本控制在React组件中的使用
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { DataVersionControl, DataSnapshot, DataBranch, ComparisonResult } from '../core/DataVersionControl';

// ==================== Hook状态类型 ====================

interface UseDataVersionControlState {
  currentBranch: string;
  snapshots: DataSnapshot[];
  branches: DataBranch[];
  isLoading: boolean;
  error: string | null;
}

interface UseDataVersionControlActions {
  createSnapshot: (data: any, metadata?: any, commitMessage?: string) => Promise<string>;
  restoreToSnapshot: (snapshotId: string) => Promise<any>;
  createBranch: (branchName: string, fromSnapshot?: string, description?: string) => void;
  switchBranch: (branchName: string) => void;
  mergeBranch: (sourceBranch: string, targetBranch?: string) => Promise<string>;
  compareSnapshots: (snapshotA: string, snapshotB: string) => ComparisonResult;
  addTag: (snapshotId: string, tag: string) => void;
  removeTag: (snapshotId: string, tag: string) => void;
  deleteSnapshot: (snapshotId: string) => void;
  getHistory: (branchName?: string, limit?: number) => DataSnapshot[];
  getStatistics: () => any;
}

interface UseDataVersionControlOptions {
  maxSnapshots?: number;
  compressionEnabled?: boolean;
  autoSnapshotInterval?: number;
  retentionPolicy?: {
    keepDays: number;
    maxVersionsPerBranch: number;
    importantTagsKeepForever: string[];
  };
}

type UseDataVersionControlReturn = UseDataVersionControlState & UseDataVersionControlActions;

// ==================== Hook实现 ====================

export const useDataVersionControl = (
  options: UseDataVersionControlOptions = {}
): UseDataVersionControlReturn => {
  // 版本控制实例引用
  const versionControlRef = useRef<DataVersionControl | null>(null);
  
  // 组件状态
  const [state, setState] = useState<UseDataVersionControlState>({
    currentBranch: 'main',
    snapshots: [],
    branches: [],
    isLoading: false,
    error: null
  });

  // 初始化版本控制实例
  useEffect(() => {
    if (!versionControlRef.current) {
      versionControlRef.current = new DataVersionControl({
        maxSnapshots: 1000,
        compressionEnabled: true,
        autoSnapshotInterval: 300000, // 5分钟
        retentionPolicy: {
          keepDays: 30,
          maxVersionsPerBranch: 100,
          importantTagsKeepForever: ['milestone', 'release', 'backup']
        },
        ...options
      });

      // 设置事件监听器
      const versionControl = versionControlRef.current;

      const handleSnapshotCreated = (event: any) => {
        updateState();
      };

      const handleSnapshotRestored = (event: any) => {
        updateState();
      };

      const handleBranchChanged = (event: any) => {
        updateState();
      };

      const handleError = (event: any) => {
        setState(prev => ({
          ...prev,
          error: event.error.message,
          isLoading: false
        }));
      };

      versionControl.on('snapshot-created', handleSnapshotCreated);
      versionControl.on('snapshot-restored', handleSnapshotRestored);
      versionControl.on('branch-switched', handleBranchChanged);
      versionControl.on('branch-created', handleBranchChanged);
      versionControl.on('branch-merged', handleBranchChanged);
      versionControl.on('snapshot-error', handleError);

      // 初始状态更新
      updateState();

      // 清理函数
      return () => {
        versionControl.off('snapshot-created', handleSnapshotCreated);
        versionControl.off('snapshot-restored', handleSnapshotRestored);
        versionControl.off('branch-switched', handleBranchChanged);
        versionControl.off('branch-created', handleBranchChanged);
        versionControl.off('branch-merged', handleBranchChanged);
        versionControl.off('snapshot-error', handleError);
        versionControl.destroy();
      };
    }
  }, []);

  // 更新状态的辅助函数
  const updateState = useCallback(() => {
    if (!versionControlRef.current) return;

    const versionControl = versionControlRef.current;
    const currentBranch = versionControl.getCurrentBranch();
    const branches = versionControl.getBranches();
    const snapshots = versionControl.getHistory(currentBranch, 50);

    setState(prev => ({
      ...prev,
      currentBranch,
      branches,
      snapshots,
      isLoading: false,
      error: null
    }));
  }, []);

  // 创建快照
  const createSnapshot = useCallback(async (
    data: any,
    metadata: any = {},
    commitMessage: string = 'Manual snapshot'
  ): Promise<string> => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const snapshotId = await versionControlRef.current.createSnapshot(data, metadata, commitMessage);
      updateState();
      return snapshotId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }));
      throw error;
    }
  }, [updateState]);

  // 恢复到指定快照
  const restoreToSnapshot = useCallback(async (snapshotId: string): Promise<any> => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const data = await versionControlRef.current.restoreToSnapshot(snapshotId);
      updateState();
      return data;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }));
      throw error;
    }
  }, [updateState]);

  // 创建新分支
  const createBranch = useCallback((
    branchName: string,
    fromSnapshot?: string,
    description: string = ''
  ): void => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    try {
      versionControlRef.current.createBranch(branchName, fromSnapshot, description);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }, [updateState]);

  // 切换分支
  const switchBranch = useCallback((branchName: string): void => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    try {
      versionControlRef.current.switchBranch(branchName);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }, [updateState]);

  // 合并分支
  const mergeBranch = useCallback(async (
    sourceBranch: string,
    targetBranch?: string
  ): Promise<string> => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const mergeSnapshotId = await versionControlRef.current.mergeBranch(sourceBranch, targetBranch);
      updateState();
      return mergeSnapshotId;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error),
        isLoading: false
      }));
      throw error;
    }
  }, [updateState]);

  // 比较快照
  const compareSnapshots = useCallback((
    snapshotA: string,
    snapshotB: string
  ): ComparisonResult => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    return versionControlRef.current.compareSnapshots(snapshotA, snapshotB);
  }, []);

  // 添加标签
  const addTag = useCallback((snapshotId: string, tag: string): void => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    try {
      versionControlRef.current.addTag(snapshotId, tag);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }, [updateState]);

  // 移除标签
  const removeTag = useCallback((snapshotId: string, tag: string): void => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    try {
      versionControlRef.current.removeTag(snapshotId, tag);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }, [updateState]);

  // 删除快照
  const deleteSnapshot = useCallback((snapshotId: string): void => {
    if (!versionControlRef.current) {
      throw new Error('版本控制未初始化');
    }

    try {
      versionControlRef.current.deleteSnapshot(snapshotId);
      updateState();
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : String(error)
      }));
      throw error;
    }
  }, [updateState]);

  // 获取历史记录
  const getHistory = useCallback((branchName?: string, limit: number = 50): DataSnapshot[] => {
    if (!versionControlRef.current) {
      return [];
    }

    return versionControlRef.current.getHistory(branchName, limit);
  }, []);

  // 获取统计信息
  const getStatistics = useCallback(() => {
    if (!versionControlRef.current) {
      return null;
    }

    return versionControlRef.current.getStatistics();
  }, []);

  // 返回状态和操作函数
  return {
    ...state,
    createSnapshot,
    restoreToSnapshot,
    createBranch,
    switchBranch,
    mergeBranch,
    compareSnapshots,
    addTag,
    removeTag,
    deleteSnapshot,
    getHistory,
    getStatistics
  };
};

// ==================== 自动快照Hook ====================

export const useAutoSnapshot = (
  data: any,
  dependencies: any[] = [],
  options: {
    interval?: number;
    enabled?: boolean;
    commitMessage?: string;
  } = {}
) => {
  const versionControl = useDataVersionControl();
  const lastSnapshotRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const {
    interval = 300000, // 5分钟
    enabled = true,
    commitMessage = 'Auto snapshot'
  } = options;

  // 创建自动快照
  const createAutoSnapshot = useCallback(async () => {
    if (!enabled || !data) return;

    try {
      const snapshotId = await versionControl.createSnapshot(
        data,
        {
          operationType: 'manual',
          changeType: 'update',
          description: 'Automatic snapshot',
          tags: ['auto']
        },
        commitMessage
      );
      
      lastSnapshotRef.current = snapshotId;
      return snapshotId;
    } catch (error) {
      console.error('自动快照创建失败:', error);
    }
  }, [data, enabled, commitMessage, versionControl]);

  // 依赖变化时创建快照
  useEffect(() => {
    if (enabled && dependencies.length > 0) {
      const timer = setTimeout(() => {
        createAutoSnapshot();
      }, 1000); // 延迟1秒避免频繁快照

      return () => clearTimeout(timer);
    }
  }, [...dependencies, enabled]);

  // 定时自动快照
  useEffect(() => {
    if (enabled && interval > 0) {
      intervalRef.current = setInterval(createAutoSnapshot, interval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [enabled, interval, createAutoSnapshot]);

  return {
    lastSnapshotId: lastSnapshotRef.current,
    createManualSnapshot: createAutoSnapshot
  };
};

// ==================== 版本比较Hook ====================

export const useSnapshotComparison = () => {
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [isComparing, setIsComparing] = useState(false);
  const versionControl = useDataVersionControl();

  const compareSnapshots = useCallback(async (
    snapshotA: string,
    snapshotB: string
  ) => {
    setIsComparing(true);
    
    try {
      const result = versionControl.compareSnapshots(snapshotA, snapshotB);
      setComparison(result);
      return result;
    } catch (error) {
      console.error('快照比较失败:', error);
      throw error;
    } finally {
      setIsComparing(false);
    }
  }, [versionControl]);

  const clearComparison = useCallback(() => {
    setComparison(null);
  }, []);

  return {
    comparison,
    isComparing,
    compareSnapshots,
    clearComparison
  };
};

export default useDataVersionControl;