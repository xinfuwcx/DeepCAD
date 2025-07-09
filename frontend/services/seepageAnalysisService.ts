import axios from 'axios';

// API基础URL
const API_BASE_URL = 'http://localhost:8000/api';

// 渗流分析参数接口
export interface SeepageAnalysisParams {
  model_id: string;
  soil_layers: SoilLayer[];
  boundary_conditions: BoundaryCondition[];
  analysis_type: 'steady' | 'transient';
  output_variables: string[];
}

// 土层接口
export interface SoilLayer {
  id: string;
  name: string;
  hydraulic_conductivity_x: number;
  hydraulic_conductivity_y: number;
  hydraulic_conductivity_z: number;
  specific_storage?: number;
  porosity?: number;
}

// 边界条件接口
export interface BoundaryCondition {
  id: string;
  type: 'constant_head' | 'flux' | 'well' | 'drain';
  value: number;
  location: {
    x: number;
    y: number;
    z: number;
  } | {
    boundary_id: string;
  };
}

// 渗流分析结果接口
export interface SeepageAnalysisResult {
  model_id: string;
  timestamp: string;
  status: 'success' | 'failed';
  message?: string;
  results?: {
    head: number[][];
    pressure: number[][];
    velocity: {
      x: number[][];
      y: number[][];
      z: number[][];
      magnitude: number[][];
    };
    flow_rate: number;
    water_table_points: [number, number, number][];
    animation_frames?: number;
  };
}

/**
 * 渗流分析服务
 * 提供与渗流分析相关的API调用和数据处理功能
 */
class SeepageAnalysisService {
  /**
   * 运行渗流分析
   * @param params 分析参数
   * @returns 分析结果
   */
  async runAnalysis(params: SeepageAnalysisParams): Promise<SeepageAnalysisResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/v4/seepage/analyze`, params);
      return response.data;
    } catch (error: any) {
      console.error('渗流分析请求失败:', error);
      throw new Error(error.response?.data?.message || '渗流分析请求失败');
    }
  }

  /**
   * 获取特定模型的渗流分析结果
   * @param modelId 模型ID
   * @returns 分析结果
   */
  async getAnalysisResults(modelId: string): Promise<SeepageAnalysisResult> {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/seepage/results/${modelId}`);
      return response.data;
    } catch (error: any) {
      console.error('获取渗流分析结果失败:', error);
      throw new Error(error.response?.data?.message || '获取渗流分析结果失败');
    }
  }

  /**
   * 获取动画帧数据
   * @param modelId 模型ID
   * @param frameIndex 帧索引
   * @returns 帧数据
   */
  async getAnimationFrame(modelId: string, frameIndex: number): Promise<any> {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/seepage/animation/${modelId}/frame/${frameIndex}`);
      return response.data;
    } catch (error: any) {
      console.error('获取动画帧数据失败:', error);
      throw new Error(error.response?.data?.message || '获取动画帧数据失败');
    }
  }

  /**
   * 导出渗流分析数据为CSV
   * @param modelId 模型ID
   * @returns 包含CSV数据的Blob
   */
  async exportDataToCSV(modelId: string): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/seepage/export/${modelId}/csv`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('导出CSV数据失败:', error);
      throw new Error('导出CSV数据失败');
    }
  }

  /**
   * 导出渗流分析数据为Excel
   * @param modelId 模型ID
   * @returns 包含Excel数据的Blob
   */
  async exportDataToExcel(modelId: string): Promise<Blob> {
    try {
      const response = await axios.get(`${API_BASE_URL}/v4/seepage/export/${modelId}/xlsx`, {
        responseType: 'blob'
      });
      return response.data;
    } catch (error: any) {
      console.error('导出Excel数据失败:', error);
      throw new Error('导出Excel数据失败');
    }
  }
  
  /**
   * 创建渗流分析模型
   * @param name 模型名称
   * @param soilLayers 土层数据
   * @param boundaryConditions 边界条件
   * @returns 创建的模型ID
   */
  async createModel(
    name: string, 
    soilLayers: SoilLayer[], 
    boundaryConditions: BoundaryCondition[]
  ): Promise<string> {
    try {
      const response = await axios.post(`${API_BASE_URL}/v4/seepage/models`, {
        name,
        soil_layers: soilLayers,
        boundary_conditions: boundaryConditions
      });
      return response.data.model_id;
    } catch (error: any) {
      console.error('创建渗流模型失败:', error);
      throw new Error(error.response?.data?.message || '创建渗流模型失败');
    }
  }
  
  /**
   * 获取颜色映射函数
   * @param colorScheme 颜色方案
   * @param minValue 最小值
   * @param maxValue 最大值
   * @returns 颜色映射函数，输入值返回颜色
   */
  getColorMapper(colorScheme: string, minValue: number, maxValue: number): (value: number) => string {
    // 根据不同颜色方案返回映射函数
    switch (colorScheme) {
      case 'rainbow':
        return (value: number) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          // 彩虹色谱
          if (normalizedValue < 0.2) {
            return this.interpolateColor('#0000FF', '#00FFFF', normalizedValue / 0.2);
          } else if (normalizedValue < 0.4) {
            return this.interpolateColor('#00FFFF', '#00FF00', (normalizedValue - 0.2) / 0.2);
          } else if (normalizedValue < 0.6) {
            return this.interpolateColor('#00FF00', '#FFFF00', (normalizedValue - 0.4) / 0.2);
          } else if (normalizedValue < 0.8) {
            return this.interpolateColor('#FFFF00', '#FF0000', (normalizedValue - 0.6) / 0.2);
          } else {
            return this.interpolateColor('#FF0000', '#800000', (normalizedValue - 0.8) / 0.2);
          }
        };
      
      case 'thermal':
        return (value: number) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          // 热力图色谱
          return this.interpolateColor('#0000FF', '#FF0000', normalizedValue);
        };
      
      case 'pressure':
        return (value: number) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          // 压力图色谱 (蓝色系)
          return this.interpolateColor('#FFFFFF', '#0050B3', normalizedValue);
        };
      
      case 'blueRed':
        return (value: number) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          // 蓝红渐变
          return this.interpolateColor('#0000FF', '#FF0000', normalizedValue);
        };
      
      default:
        return (value: number) => {
          const normalizedValue = (value - minValue) / (maxValue - minValue);
          return this.interpolateColor('#0000FF', '#FF0000', normalizedValue);
        };
    }
  }
  
  /**
   * 颜色插值函数
   * @param color1 起始颜色 (16进制)
   * @param color2 结束颜色 (16进制)
   * @param factor 插值因子 (0-1)
   * @returns 插值后的颜色 (16进制)
   */
  private interpolateColor(color1: string, color2: string, factor: number): string {
    // 确保factor在0-1之间
    factor = Math.max(0, Math.min(1, factor));
    
    // 解析颜色
    const r1 = parseInt(color1.substring(1, 3), 16);
    const g1 = parseInt(color1.substring(3, 5), 16);
    const b1 = parseInt(color1.substring(5, 7), 16);
    
    const r2 = parseInt(color2.substring(1, 3), 16);
    const g2 = parseInt(color2.substring(3, 5), 16);
    const b2 = parseInt(color2.substring(5, 7), 16);
    
    // 计算插值
    const r = Math.round(r1 + (r2 - r1) * factor);
    const g = Math.round(g1 + (g2 - g1) * factor);
    const b = Math.round(b1 + (b2 - b1) * factor);
    
    // 转换回16进制
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }
}

// 导出服务实例
const seepageAnalysisService = new SeepageAnalysisService();
export default seepageAnalysisService; 