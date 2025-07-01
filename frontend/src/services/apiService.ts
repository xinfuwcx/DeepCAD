/**
 * API服务 - 处理与后端的数据交换
 * 
 * 提供与Kratos和其他后端服务的通信接口
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

// API基本配置
const apiConfig: AxiosRequestConfig = {
  baseURL: '/api',
  timeout: 30000, // 30秒
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
};

// 创建API实例
const apiClient: AxiosInstance = axios.create(apiConfig);

// 请求拦截器 - 可添加认证等功能
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证令牌等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器 - 统一处理错误
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API请求错误:', error);
    return Promise.reject(error);
  }
);

// 定义响应数据类型
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

// API服务类
export class ApiService {
  // 模型几何处理接口
  static async convertToMesh(modelData: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/geometry/convert-mesh', modelData);
      return response.data;
    } catch (error) {
      console.error('几何转换为网格失败:', error);
      return { success: false, message: '几何转换为网格失败' };
    }
  }

  // 执行深基坑分析
  static async analyzeExcavation(excavationData: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/analysis/excavation', excavationData);
      return response.data;
    } catch (error) {
      console.error('深基坑分析失败:', error);
      return { success: false, message: '深基坑分析失败' };
    }
  }

  // 获取分析结果
  static async getAnalysisResults(analysisId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get(`/results/${analysisId}`);
      return response.data;
    } catch (error) {
      console.error('获取分析结果失败:', error);
      return { success: false, message: '获取分析结果失败' };
    }
  }

  // 导出分析结果
  static async exportResults(analysisId: string, format: string): Promise<Blob> {
    try {
      const response = await apiClient.get(`/results/${analysisId}/export`, {
        params: { format },
        responseType: 'blob',
      });
      return response.data;
    } catch (error) {
      console.error('导出结果失败:', error);
      throw new Error('导出结果失败');
    }
  }

  // 物理AI参数反演
  static async inverseParameters(monitoringData: any, modelSetup: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/ai/parameter-inversion', {
        monitoringData,
        modelSetup,
      });
      return response.data;
    } catch (error) {
      console.error('参数反演失败:', error);
      return { success: false, message: '参数反演失败' };
    }
  }

  // 项目保存与加载
  static async saveProject(projectData: any): Promise<ApiResponse> {
    try {
      const response = await apiClient.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('项目保存失败:', error);
      return { success: false, message: '项目保存失败' };
    }
  }

  // 加载项目
  static async loadProject(projectId: string): Promise<ApiResponse> {
    try {
      const response = await apiClient.get(`/projects/${projectId}`);
      return response.data;
    } catch (error) {
      console.error('项目加载失败:', error);
      return { success: false, message: '项目加载失败' };
    }
  }

  // 模拟API - 用于测试，无需后端
  static async simulateApiCall<T>(endpoint: string, data?: any, delay: number = 500): Promise<ApiResponse<T>> {
    return new Promise((resolve) => {
      console.log(`模拟API调用: ${endpoint}`, data);
      setTimeout(() => {
        resolve({
          success: true,
          data: { endpoint, ...data } as unknown as T,
          message: '模拟API调用成功',
        });
      }, delay);
    });
  }
}

export default ApiService; 