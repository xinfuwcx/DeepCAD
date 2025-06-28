import axios, { AxiosRequestConfig } from 'axios';

// 创建axios实例
const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 请求拦截器
apiClient.interceptors.request.use(
  (config) => {
    // 可以在这里添加认证token等
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 响应拦截器
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    // 错误处理
    if (error.response) {
      // 服务器响应错误
      console.error('API错误:', error.response.data);
    } else if (error.request) {
      // 请求未收到响应
      console.error('网络错误:', error.message);
    } else {
      // 请求配置错误
      console.error('请求错误:', error.message);
    }
    return Promise.reject(error);
  }
);

// API服务
export const api = {
  // 建模相关API
  modeling: {
    // 创建计算域
    createDomain: (data: any) => 
      apiClient.post('/modeling/domain', data),
    
    // 添加土层
    addSoilLayers: (data: any) => 
      apiClient.post('/modeling/layers', data),
    
    // 导入DXF文件
    importDXF: (projectId: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return apiClient.post(`/modeling/import-dxf?project_id=${projectId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    },
    
    // 创建基坑
    createExcavation: (data: any) => 
      apiClient.post('/modeling/excavation', data),
    
    // 创建地连墙
    createWall: (data: any) => 
      apiClient.post('/modeling/wall', data),
    
    // 创建隧道
    createTunnel: (data: any) => 
      apiClient.post('/modeling/tunnel', data),
    
    // 创建锚杆
    createAnchor: (data: any) => 
      apiClient.post('/modeling/anchor', data),
  },
  
  // 网格划分相关API
  mesh: {
    // 生成网格
    generateMesh: (projectId: number, params: any) => 
      apiClient.post(`/mesh/generate?project_id=${projectId}`, params),
    
    // 获取网格统计信息
    getMeshStatistics: (projectId: number) => 
      apiClient.get(`/mesh/statistics?project_id=${projectId}`),
  },
  
  // 计算分析相关API
  compute: {
    // 启动计算
    startComputation: (projectId: number, params: any) => 
      apiClient.post(`/compute/start?project_id=${projectId}`, params),
    
    // 获取计算状态
    getComputationStatus: (jobId: string) => 
      apiClient.get(`/compute/status?job_id=${jobId}`),
    
    // 取消计算
    cancelComputation: (jobId: string) => 
      apiClient.post(`/compute/cancel?job_id=${jobId}`),
  },
  
  // 可视化相关API
  visualization: {
    // 获取项目列表
    getProjects: () => 
      apiClient.get('/visualization/projects'),
    
    // 获取项目详情
    getProject: (projectId: number) => 
      apiClient.get(`/visualization/projects/${projectId}`),
    
    // 获取项目统计信息
    getProjectStatistics: (projectId: number) => 
      apiClient.get(`/visualization/projects/${projectId}/statistics`),
    
    // 获取结果数据
    getResultData: (projectId: number, resultType: string) => 
      apiClient.get(`/visualization/projects/${projectId}/results/${resultType}`),
  },
  
  // AI辅助相关API
  ai: {
    // 获取参数建议
    getParameterSuggestions: (data: any) => 
      apiClient.post('/ai/suggest-parameters', data),
    
    // 生成报告
    generateReport: (projectId: number) => 
      apiClient.post(`/ai/generate-report?project_id=${projectId}`),
  },
};

export default api; 