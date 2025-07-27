/**
 * 地质几何建模服务
 * 连接RBF + GMSH OCC + PyVista后端
 */

import axios from 'axios';
import type { GeologyParamsAdvanced } from '../schemas';

const API_BASE = '/api/geology';

export interface GeologyGeometryTaskResponse {
  success: boolean;
  task_id?: string;
  message: string;
  error?: string;
}

export interface GeologyGeometryStatusResponse {
  success: boolean;
  task_id: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  result?: {
    statistics: {
      boreholes_count: number;
      layers_processed: number;
      domain_bounds: {
        x_min: number;
        x_max: number;
        y_min: number;
        y_max: number;
        z_min: number;
        z_max: number;
      };
      total_strata: number;
    };
    files: Record<string, string>; // file_type -> download_url
  };
}

export interface GeologyGeometryFiles {
  mesh?: string;     // GMSH surface mesh
  ply?: string;      // PLY format for visualization
  vtk?: string;      // VTK format
  stl?: string;      // STL format
  step?: string;     // STEP CAD format
}

export class GeologyGeometryService {
  private baseURL: string;

  constructor(baseURL: string = API_BASE) {
    this.baseURL = baseURL;
  }

  /**
   * 启动地质几何建模任务
   */
  async startGeologyModeling(params: GeologyParamsAdvanced): Promise<GeologyGeometryTaskResponse> {
    try {
      console.log('🚀 Starting geology geometry modeling...', params);
      
      const response = await axios.post(`${this.baseURL}/generate-geometry`, params, {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.data.success) {
        console.log('✅ Geology modeling task started:', response.data.task_id);
      }

      return response.data;
    } catch (error: any) {
      console.error('❌ Error starting geology modeling:', error);
      
      if (error.response?.data) {
        return {
          success: false,
          message: error.response.data.detail || error.response.data.message || 'Unknown error',
        };
      }
      
      return {
        success: false,
        message: error.message || 'Network error occurred',
      };
    }
  }

  /**
   * 获取地质建模任务状态
   */
  async getTaskStatus(taskId: string): Promise<GeologyGeometryStatusResponse> {
    try {
      const response = await axios.get(`${this.baseURL}/geometry-status/${taskId}`, {
        timeout: 10000
      });

      return response.data;
    } catch (error: any) {
      console.error(`❌ Error getting task status ${taskId}:`, error);
      
      throw new Error(
        error.response?.data?.detail || 
        error.response?.data?.message || 
        error.message || 
        'Failed to get task status'
      );
    }
  }

  /**
   * 轮询任务状态直到完成
   */
  async pollTaskStatus(
    taskId: string, 
    onProgress?: (status: GeologyGeometryStatusResponse) => void,
    maxAttempts: number = 60,
    intervalMs: number = 2000
  ): Promise<GeologyGeometryStatusResponse> {
    
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getTaskStatus(taskId);
        
        if (onProgress) {
          onProgress(status);
        }

        // 任务完成或失败
        if (status.status === 'completed' || status.status === 'failed') {
          return status;
        }

        // 等待下次轮询
        await new Promise(resolve => setTimeout(resolve, intervalMs));
        attempts++;
        
      } catch (error) {
        console.error(`❌ Polling error for task ${taskId}:`, error);
        attempts++;
        
        if (attempts >= maxAttempts) {
          throw error;
        }
        
        // 出错时等待更长时间再重试
        await new Promise(resolve => setTimeout(resolve, intervalMs * 2));
      }
    }

    throw new Error(`Task ${taskId} polling timeout after ${maxAttempts} attempts`);
  }

  /**
   * 下载结果文件
   */
  async downloadFile(taskId: string, fileType: string): Promise<Blob> {
    try {
      const response = await axios.get(`${this.baseURL}/geometry-download/${taskId}/${fileType}`, {
        responseType: 'blob',
        timeout: 60000, // 文件下载可能较慢
      });

      return response.data;
    } catch (error: any) {
      console.error(`❌ Error downloading file ${taskId}/${fileType}:`, error);
      
      throw new Error(
        error.response?.data?.detail || 
        error.message || 
        `Failed to download ${fileType} file`
      );
    }
  }

  /**
   * 获取文件下载URL
   */
  getDownloadUrl(taskId: string, fileType: string): string {
    return `${this.baseURL}/geometry-download/${taskId}/${fileType}`;
  }

  /**
   * 清理任务和临时文件
   */
  async cleanupTask(taskId: string): Promise<boolean> {
    try {
      await axios.delete(`${this.baseURL}/geometry-cleanup/${taskId}`, {
        timeout: 10000
      });

      console.log(`🗑️ Cleaned up task ${taskId}`);
      return true;
    } catch (error: any) {
      console.error(`❌ Error cleaning up task ${taskId}:`, error);
      return false;
    }
  }

  /**
   * 测试服务是否可用
   */
  async testService(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseURL}/test-geometry-service`, {
        timeout: 15000
      });

      const isAvailable = response.data.success && response.data.service_available;
      console.log(`🔧 Geology geometry service available: ${isAvailable}`);
      
      return isAvailable;
    } catch (error: any) {
      console.error('❌ Error testing geology geometry service:', error);
      return false;
    }
  }

  /**
   * 完整的地质建模工作流程
   */
  async runCompleteWorkflow(
    params: GeologyParamsAdvanced,
    onProgress?: (status: GeologyGeometryStatusResponse) => void
  ): Promise<GeologyGeometryStatusResponse> {
    
    try {
      // 1. 启动建模任务
      const taskResponse = await this.startGeologyModeling(params);
      
      if (!taskResponse.success || !taskResponse.task_id) {
        throw new Error(taskResponse.message || 'Failed to start modeling task');
      }

      console.log(`🔄 Polling geology modeling task: ${taskResponse.task_id}`);

      // 2. 轮询任务状态
      const finalStatus = await this.pollTaskStatus(
        taskResponse.task_id,
        onProgress,
        60,   // 最大尝试60次
        3000  // 3秒间隔
      );

      // 3. 检查最终结果
      if (finalStatus.status === 'completed') {
        console.log('🎉 Geology geometry modeling completed successfully!');
        console.log('📊 Statistics:', finalStatus.result?.statistics);
        console.log('📁 Files:', Object.keys(finalStatus.result?.files || {}));
      } else if (finalStatus.status === 'failed') {
        console.error('💥 Geology modeling failed:', finalStatus.message);
      }

      return finalStatus;

    } catch (error: any) {
      console.error('❌ Complete workflow error:', error);
      throw error;
    }
  }

  /**
   * 创建可视化预览URL（用于Three.js加载）
   */
  async createVisualizationUrls(taskId: string): Promise<GeologyGeometryFiles> {
    try {
      const status = await this.getTaskStatus(taskId);
      
      if (status.status !== 'completed' || !status.result?.files) {
        throw new Error('Task not completed or no files available');
      }

      const files: GeologyGeometryFiles = {};
      
      // 转换为可访问的URL
      for (const [fileType, downloadPath] of Object.entries(status.result.files)) {
        files[fileType as keyof GeologyGeometryFiles] = `${window.location.origin}${downloadPath}`;
      }

      return files;

    } catch (error: any) {
      console.error(`❌ Error creating visualization URLs for task ${taskId}:`, error);
      throw error;
    }
  }
}

// 创建默认实例
export const geologyGeometryService = new GeologyGeometryService();

// 导出工具函数
export const GeologyGeometryUtils = {
  /**
   * 验证钻孔数据完整性
   */
  validateBoreholeData(boreholes: any[]): string[] {
    const errors: string[] = [];
    
    if (boreholes.length < 3) {
      errors.push('At least 3 boreholes are required');
    }

    boreholes.forEach((bh, index) => {
      if (!bh.strata || bh.strata.length === 0) {
        errors.push(`Borehole ${index + 1} has no strata data`);
      }
      
      if (bh.strata) {
        // 检查土层连续性
        const sortedStrata = [...bh.strata].sort((a, b) => b.top_elev - a.top_elev);
        for (let i = 0; i < sortedStrata.length - 1; i++) {
          const gap = Math.abs(sortedStrata[i].bottom_elev - sortedStrata[i + 1].top_elev);
          if (gap > 0.1) {
            errors.push(`Borehole ${index + 1} has discontinuous strata (gap: ${gap.toFixed(2)}m)`);
            break;
          }
        }
      }
    });

    return errors;
  },

  /**
   * 估算建模时间
   */
  estimateModelingTime(params: GeologyParamsAdvanced): number {
    const boreholeCount = params.boreholes?.length || 0;
    const strataCount = params.boreholes?.reduce((sum, bh) => sum + bh.strata.length, 0) || 0;
    const resolution = params.domain.mesh_resolution || 2.0;
    
    // 基础时间估算（秒）
    let estimatedSeconds = 30; // 基础时间
    estimatedSeconds += boreholeCount * 5;      // 每个钻孔增加5秒
    estimatedSeconds += strataCount * 3;        // 每个土层增加3秒  
    estimatedSeconds += (1 / resolution) * 10;  // 网格密度影响
    
    if (params.algorithm.uncertainty_analysis) {
      estimatedSeconds *= 1.5; // 不确定性分析增加50%时间
    }

    return Math.max(30, Math.min(estimatedSeconds, 300)); // 限制在30-300秒
  },

  /**
   * 格式化统计信息
   */
  formatStatistics(stats: any): string {
    if (!stats) return 'No statistics available';
    
    return `
📊 Modeling Statistics:
• Boreholes: ${stats.boreholes_count}
• Total Strata: ${stats.total_strata}  
• Layers Processed: ${stats.layers_processed}
• Domain: ${stats.domain_bounds?.x_min?.toFixed(1)} to ${stats.domain_bounds?.x_max?.toFixed(1)} (X)
         ${stats.domain_bounds?.y_min?.toFixed(1)} to ${stats.domain_bounds?.y_max?.toFixed(1)} (Y)
         ${stats.domain_bounds?.z_min?.toFixed(1)} to ${stats.domain_bounds?.z_max?.toFixed(1)} (Z)
    `.trim();
  }
};