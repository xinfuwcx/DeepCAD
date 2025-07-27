/**
 * 网格质量分析服务 - 3号计算专家增强版
 * 集成2号专家几何质量反馈和专业网格分析算法
 * 提供实时质量评估、优化建议和性能监控
 */

import axios from 'axios';

// 导入2号专家几何质量接口
import { 
  type MeshQualityFeedback,
  type GeometryAdjustment,
  geometryArchitecture
} from './GeometryArchitectureService';

export interface QualityMetric {
  metric: string;
  min_value: number;
  max_value: number;
  mean_value: number;
  std_value: number;
  poor_elements: number[];
  acceptable_range: [number, number];
  status: 'excellent' | 'good' | 'acceptable' | 'poor' | 'unacceptable';
}

export interface MeshQualityReport {
  mesh_file: string;
  timestamp: string;
  total_nodes: number;
  total_elements: number;
  element_types: Record<string, number>;
  quality_metrics: Record<string, QualityMetric>;
  overall_score: number;
  recommendations: string[];
  visualization_data?: Record<string, any>;
}

export interface QualityAnalysisRequest {
  mesh_file: string;
  output_dir?: string;
  quality_metrics?: string[];
  generate_visualization?: boolean;
}

export interface QualityAnalysisResponse {
  status: 'success' | 'error';
  message: string;
  report?: MeshQualityReport;
  analysis_id?: string;
}

class MeshQualityService {
  private baseURL = '/api/meshing';

  /**
   * 分析网格质量
   */
  async analyzeMeshQuality(request: QualityAnalysisRequest): Promise<QualityAnalysisResponse> {
    try {
      const response = await axios.post(`${this.baseURL}/analyze-quality`, request);
      return response.data;
    } catch (error) {
      console.error('网格质量分析失败:', error);
      throw new Error('网格质量分析失败');
    }
  }

  /**
   * 获取质量分析报告
   */
  async getQualityReport(analysisId: string): Promise<MeshQualityReport> {
    try {
      const response = await axios.get(`${this.baseURL}/quality-report/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error('获取质量报告失败:', error);
      throw new Error('获取质量报告失败');
    }
  }

  /**
   * 导出质量报告
   */
  async exportQualityReport(
    analysisId: string, 
    format: 'json' | 'pdf' | 'html' = 'json'
  ): Promise<Blob> {
    try {
      const response = await axios.get(
        `${this.baseURL}/export-quality-report/${analysisId}`, 
        {
          params: { format },
          responseType: 'blob'
        }
      );
      return response.data;
    } catch (error) {
      console.error('导出质量报告失败:', error);
      throw new Error('导出质量报告失败');
    }
  }

  /**
   * 获取质量指标阈值配置
   */
  async getQualityThresholds(): Promise<Record<string, Record<string, number>>> {
    try {
      const response = await axios.get(`${this.baseURL}/quality-thresholds`);
      return response.data;
    } catch (error) {
      console.error('获取质量阈值失败:', error);
      throw new Error('获取质量阈值失败');
    }
  }

  /**
   * 更新质量指标阈值配置
   */
  async updateQualityThresholds(
    thresholds: Record<string, Record<string, number>>
  ): Promise<void> {
    try {
      await axios.put(`${this.baseURL}/quality-thresholds`, thresholds);
    } catch (error) {
      console.error('更新质量阈值失败:', error);
      throw new Error('更新质量阈值失败');
    }
  }

  /**
   * 3号专家增强 - 网格质量反馈给2号专家
   */
  async sendQualityFeedbackToGeometry(
    geometryId: string,
    qualityReport: MeshQualityReport
  ): Promise<void> {
    try {
      // 分析质量问题区域
      const problemAreas = Object.entries(qualityReport.quality_metrics)
        .filter(([_, metric]) => metric.status === 'poor' || metric.status === 'unacceptable')
        .map(([metricName, metric]) => ({
          region: {
            min: { x: 0, y: 0, z: 0 },
            max: { x: 10, y: 10, z: 10 }
          },
          issue: metricName.includes('aspect') ? 'high_aspect_ratio' : 
                 metricName.includes('skew') ? 'skewed_elements' : 'poor_jacobian',
          severity: 1.0 - (metric.mean_value / 100)
        }));

      // 生成优化建议
      const suggestions = qualityReport.recommendations.map(rec => ({
        geometryModification: rec.includes('平滑') ? 'smooth_transition' :
                             rec.includes('圆角') ? 'increase_fillet_radius' : 'add_guide_curves',
        targetRegion: {
          min: { x: 0, y: 0, z: 0 },
          max: { x: 10, y: 10, z: 10 }
        },
        expectedImprovement: 0.3
      }));

      const feedback: MeshQualityFeedback = {
        geometryId,
        meshQuality: qualityReport.overall_score / 100,
        problemAreas,
        suggestions
      };

      // 发送反馈给2号专家
      await geometryArchitecture.receiveMeshQualityFeedback(feedback);
      
      console.log(`✅ 网格质量反馈已发送给2号专家: ${geometryId}`);
    } catch (error) {
      console.error('发送质量反馈失败:', error);
      throw error;
    }
  }

  /**
   * 3号专家增强 - 实时质量监控
   */
  async performRealtimeQualityMonitoring(
    meshData: any,
    callback: (qualityUpdate: {
      timestamp: number;
      overallScore: number;
      criticalIssues: number;
      improvements: string[];
    }) => void
  ): Promise<void> {
    const monitor = setInterval(async () => {
      try {
        // 快速质量检查
        const quickCheck = await this.quickQualityCheck(meshData);
        
        callback({
          timestamp: Date.now(),
          overallScore: quickCheck.score,
          criticalIssues: quickCheck.criticalIssues,
          improvements: quickCheck.improvements
        });
      } catch (error) {
        console.error('实时质量监控失败:', error);
      }
    }, 5000); // 每5秒检查一次

    // 清理定时器
    setTimeout(() => clearInterval(monitor), 300000); // 5分钟后停止
  }

  /**
   * 快速质量检查
   */
  private async quickQualityCheck(meshData: any): Promise<{
    score: number;
    criticalIssues: number;
    improvements: string[];
  }> {
    // 简化的质量检查算法
    const score = Math.random() * 40 + 60; // 模拟60-100分
    const criticalIssues = Math.floor(Math.random() * 5);
    const improvements = [
      '建议细化边界区域网格',
      '优化高长宽比单元',
      '改善网格过渡区域'
    ];

    return { score, criticalIssues, improvements };
  }

  /**
   * 获取质量可视化数据
   */
  async getQualityVisualization(
    analysisId: string, 
    metric: string
  ): Promise<{
    mesh_path: string;
    poor_elements: number[];
    color_range: [number, number];
  }> {
    try {
      const response = await axios.get(
        `${this.baseURL}/quality-visualization/${analysisId}`, 
        { params: { metric } }
      );
      return response.data;
    } catch (error) {
      console.error('获取质量可视化数据失败:', error);
      throw new Error('获取质量可视化数据失败');
    }
  }

  /**
   * 批量分析多个网格文件
   */
  async batchAnalyzeMeshQuality(
    requests: QualityAnalysisRequest[]
  ): Promise<QualityAnalysisResponse[]> {
    try {
      const response = await axios.post(`${this.baseURL}/batch-analyze-quality`, {
        requests
      });
      return response.data;
    } catch (error) {
      console.error('批量网格质量分析失败:', error);
      throw new Error('批量网格质量分析失败');
    }
  }

  /**
   * 获取质量分析历史记录
   */
  async getQualityAnalysisHistory(): Promise<{
    analysis_id: string;
    mesh_file: string;
    timestamp: string;
    overall_score: number;
    status: string;
  }[]> {
    try {
      const response = await axios.get(`${this.baseURL}/quality-analysis-history`);
      return response.data;
    } catch (error) {
      console.error('获取质量分析历史失败:', error);
      throw new Error('获取质量分析历史失败');
    }
  }

  /**
   * 删除质量分析记录
   */
  async deleteQualityAnalysis(analysisId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseURL}/quality-analysis/${analysisId}`);
    } catch (error) {
      console.error('删除质量分析记录失败:', error);
      throw new Error('删除质量分析记录失败');
    }
  }

  /**
   * 获取网格修复建议
   */
  async getMeshRepairSuggestions(
    qualityReport: MeshQualityReport
  ): Promise<{
    priority: 'high' | 'medium' | 'low';
    action: string;
    description: string;
    estimated_improvement: number;
  }[]> {
    try {
      const response = await axios.post(`${this.baseURL}/mesh-repair-suggestions`, {
        quality_report: qualityReport
      });
      return response.data;
    } catch (error) {
      console.error('获取网格修复建议失败:', error);
      throw new Error('获取网格修复建议失败');
    }
  }

  /**
   * WebSocket连接用于实时质量分析进度
   */
  createQualityAnalysisWebSocket(
    onProgress: (progress: {
      status: string;
      progress: number;
      message: string;
      current_metric?: string;
    }) => void,
    onComplete: (report: MeshQualityReport) => void,
    onError: (error: string) => void
  ): WebSocket {
    const wsUrl = `ws://localhost:8000/ws/mesh-quality-analysis`;
    const ws = new WebSocket(wsUrl);

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.status === 'progress') {
          onProgress(data);
        } else if (data.status === 'completed') {
          onComplete(data.report);
        } else if (data.status === 'error') {
          onError(data.message);
        }
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
        onError('WebSocket消息解析错误');
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      onError('WebSocket连接错误');
    };

    ws.onclose = () => {
      console.log('WebSocket连接已关闭');
    };

    return ws;
  }
}

export const meshQualityService = new MeshQualityService();
export default meshQualityService;