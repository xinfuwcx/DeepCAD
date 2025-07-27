import { useState, useCallback, useRef } from 'react';
import { notification } from 'antd';

// DXF导入相关类型定义
export interface DXFImportTask {
  import_id: string;
  filename: string;
  file_size: number;
  status: DXFFileStatus;
  progress: number;
  created_at: string;
  analysis?: DXFAnalysisResult;
  processing_result?: DXFProcessingResult;
  qualityReport?: DXFQualityReport;
}

export interface DXFProcessingOptions {
  mode: 'STRICT' | 'TOLERANT' | 'REPAIR' | 'PREVIEW';
  coordinate_system: 'WCS' | 'UCS' | 'OCS';
  scale_factor: number;
  unit_conversion: 'METER' | 'MILLIMETER' | 'INCH' | 'FOOT';
  merge_duplicate_points: boolean;
  tolerance: number;
  repair_invalid_geometry: boolean;
  layer_filter: string[];
  entity_filter: string[];
  preserve_original_structure?: boolean;
  generate_quality_report?: boolean;
}

export interface DXFAnalysisResult {
  file_info: {
    filename: string;
    file_size: number;
    dxf_version: string;
    created_by: string;
    last_modified: string;
    units: string;
    coordinate_system: string;
  };
  geometry_info: {
    total_entities: number;
    entities_by_type: Record<string, number>;
    layers_count: number;
    blocks_count: number;
    total_length: number;
    total_area: number;
    bounding_box: number[];
  };
  layers: Array<{
    name: string;
    entity_count: number;
    is_visible: boolean;
    is_frozen: boolean;
    is_locked: boolean;
    color?: number;
    linetype?: string;
  }>;
  entities: Array<{
    handle: string;
    type: string;
    layer: string;
    color?: number;
    bounding_box?: number[];
  }>;
  validation_issues: Array<{
    severity: 'error' | 'warning' | 'info';
    code: string;
    message: string;
    entity_handle?: string;
    layer?: string;
    suggestion?: string;
  }>;
  completeness_score: number;
  processing_recommendations: string[];
  analysis_time: number;
}

export interface DXFProcessingResult {
  success: boolean;
  processed_entities: number;
  skipped_entities: number;
  repaired_entities: number;
  processing_time: number;
  output_files: string[];
  warnings: string[];
  errors: string[];
  geometry_summary: {
    points: number;
    lines: number;
    curves: number;
    surfaces: number;
  };
  task_id?: string;
}

export interface DXFQualityReport {
  overall_score: number;
  completeness_score: number;
  accuracy_score: number;
  consistency_score: number;
  recommendations: Array<{
    type: 'critical' | 'important' | 'suggestion';
    message: string;
    action?: string;
  }>;
  critical_issues: Array<{
    issue_type: string;
    description: string;
    affected_entities: number;
    severity: 'high' | 'medium' | 'low';
  }>;
  warnings: string[];
  generated_at: string;
}

export type DXFFileStatus = 'PENDING' | 'ANALYZING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface UseDXFImportReturn {
  tasks: DXFImportTask[];
  isLoading: boolean;
  uploadFile: (file: File, options: DXFProcessingOptions, onProgress?: (progress: number) => void) => Promise<DXFImportTask>;
  getAnalysis: (importId: string) => Promise<DXFAnalysisResult>;
  getQualityReport: (importId: string) => Promise<DXFQualityReport>;
  deleteTask: (importId: string) => Promise<void>;
  refreshStatus: (importId: string) => Promise<void>;
  refreshAllTasks: () => Promise<void>;
  clearTasks: () => void;
}

export const useDXFImport = (): UseDXFImportReturn => {
  const [tasks, setTasks] = useState<DXFImportTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const pollingIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // 上传文件并开始处理
  const uploadFile = useCallback(async (
    file: File, 
    options: DXFProcessingOptions,
    onProgress?: (progress: number) => void
  ): Promise<DXFImportTask> => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify(options));

      // 模拟进度
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress > 90) {
          clearInterval(progressInterval);
          progress = 90;
        }
        onProgress?.(progress);
      }, 200);

      const response = await fetch('/api/dxf-import/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      onProgress?.(100);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      // 创建任务对象
      const newTask: DXFImportTask = {
        import_id: result.import_id,
        filename: file.name,
        file_size: file.size,
        status: result.status || 'PENDING',
        progress: 0,
        created_at: new Date().toISOString(),
      };

      // 添加到任务列表
      setTasks(prev => [newTask, ...prev]);

      // 开始轮询状态
      startPolling(newTask.import_id);

      return newTask;

    } catch (error: any) {
      console.error('DXF上传失败:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 获取分析结果
  const getAnalysis = useCallback(async (importId: string): Promise<DXFAnalysisResult> => {
    try {
      const response = await fetch(`/api/dxf-import/status/${importId}`);
      
      if (!response.ok) {
        throw new Error(`获取分析结果失败: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.analysis_result) {
        throw new Error('分析结果不可用，请等待分析完成');
      }

      return result.analysis_result;
    } catch (error: any) {
      console.error('获取分析结果失败:', error);
      throw error;
    }
  }, []);

  // 获取质量报告
  const getQualityReport = useCallback(async (importId: string): Promise<DXFQualityReport> => {
    try {
      const response = await fetch(`/api/dxf-import/quality-report/${importId}`);
      
      if (!response.ok) {
        throw new Error(`获取质量报告失败: ${response.statusText}`);
      }

      const qualityReport = await response.json();
      return qualityReport;
    } catch (error: any) {
      console.error('获取质量报告失败:', error);
      throw error;
    }
  }, []);

  // 删除任务
  const deleteTask = useCallback(async (importId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/dxf-import/import/${importId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`删除任务失败: ${response.statusText}`);
      }

      // 停止轮询
      const intervalId = pollingIntervals.current.get(importId);
      if (intervalId) {
        clearInterval(intervalId);
        pollingIntervals.current.delete(importId);
      }

      // 从任务列表中移除
      setTasks(prev => prev.filter(task => task.import_id !== importId));

    } catch (error: any) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }, []);

  // 刷新单个任务状态
  const refreshStatus = useCallback(async (importId: string): Promise<void> => {
    try {
      const response = await fetch(`/api/dxf-import/status/${importId}`);
      
      if (!response.ok) {
        throw new Error(`刷新状态失败: ${response.statusText}`);
      }

      const result = await response.json();

      setTasks(prev => prev.map(task => 
        task.import_id === importId 
          ? {
              ...task,
              status: result.status,
              progress: getProgressFromStatus(result.status),
              analysis: result.analysis_result,
              processing_result: result.processing_result,
            }
          : task
      ));

      // 如果任务完成，停止轮询
      if (result.status === 'COMPLETED' || result.status === 'FAILED') {
        const intervalId = pollingIntervals.current.get(importId);
        if (intervalId) {
          clearInterval(intervalId);
          pollingIntervals.current.delete(importId);
        }
      }

    } catch (error: any) {
      console.error('刷新状态失败:', error);
    }
  }, []);

  // 刷新所有任务
  const refreshAllTasks = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      // 这里可以实现一个批量状态查询API
      await Promise.all(
        tasks.map(task => refreshStatus(task.import_id))
      );
    } finally {
      setIsLoading(false);
    }
  }, [tasks, refreshStatus]);

  // 清空任务列表
  const clearTasks = useCallback((): void => {
    // 停止所有轮询
    pollingIntervals.current.forEach(intervalId => {
      clearInterval(intervalId);
    });
    pollingIntervals.current.clear();

    // 清空任务列表
    setTasks([]);
  }, []);

  // 开始轮询任务状态
  const startPolling = useCallback((importId: string) => {
    // 如果已经在轮询，先停止
    const existingInterval = pollingIntervals.current.get(importId);
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    // 开始新的轮询
    const intervalId = setInterval(() => {
      refreshStatus(importId);
    }, 2000); // 每2秒轮询一次

    pollingIntervals.current.set(importId, intervalId);

    // 10分钟后自动停止轮询（防止无限轮询）
    setTimeout(() => {
      const currentInterval = pollingIntervals.current.get(importId);
      if (currentInterval === intervalId) {
        clearInterval(intervalId);
        pollingIntervals.current.delete(importId);
      }
    }, 10 * 60 * 1000);
  }, [refreshStatus]);

  // 根据状态计算进度
  const getProgressFromStatus = (status: DXFFileStatus): number => {
    switch (status) {
      case 'PENDING':
        return 0;
      case 'ANALYZING':
        return 25;
      case 'PROCESSING':
        return 75;
      case 'COMPLETED':
        return 100;
      case 'FAILED':
        return 0;
      default:
        return 0;
    }
  };

  return {
    tasks,
    isLoading,
    uploadFile,
    getAnalysis,
    getQualityReport,
    deleteTask,
    refreshStatus,
    refreshAllTasks,
    clearTasks,
  };
};

export default useDXFImport;