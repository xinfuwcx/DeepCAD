import { get, post, put, del, upload } from '../utils/http';
import { User, Project, MeshConfig, ComputationConfig, ResultData } from '../models/types';

/**
 * 用户认证相关API
 */
export const authApi = {
  // 用户登录
  login: (data: { username: string; password: string }) => {
    return post<{ token: string; user: User }>('/auth/login', data);
  },
  
  // 用户注册
  register: (data: any) => {
    return post<{ token: string; user: User }>('/auth/register', data);
  },
  
  // 获取当前用户信息
  getCurrentUser: () => {
    return get<User>('/auth/user');
  },
  
  // 修改用户信息
  updateUserProfile: (data: Partial<User>) => {
    return put<User>('/auth/user', data);
  },
  
  // 修改密码
  changePassword: (data: { oldPassword: string; newPassword: string }) => {
    return post<{ success: boolean }>('/auth/change-password', data);
  },
  
  // 重置密码请求
  requestPasswordReset: (data: { email: string }) => {
    return post<{ success: boolean }>('/auth/reset-password-request', data);
  },
  
  // 重置密码
  resetPassword: (data: { token: string; newPassword: string }) => {
    return post<{ success: boolean }>('/auth/reset-password', data);
  },
  
  // 退出登录
  logout: () => {
    return post<{ success: boolean }>('/auth/logout');
  },
};

/**
 * 项目管理相关API
 */
export const projectApi = {
  // 获取项目列表
  getProjects: (params?: { page?: number; pageSize?: number; type?: string; status?: string; search?: string }) => {
    return get<{ data: Project[]; total: number; page: number; pageSize: number }>('/projects', params);
  },
  
  // 获取项目详情
  getProject: (projectId: number | string) => {
    return get<Project>(`/projects/${projectId}`);
  },
  
  // 创建项目
  createProject: (data: Partial<Project>) => {
    return post<Project>('/projects', data);
  },
  
  // 更新项目
  updateProject: (projectId: number | string, data: Partial<Project>) => {
    return put<Project>(`/projects/${projectId}`, data);
  },
  
  // 删除项目
  deleteProject: (projectId: number | string) => {
    return del<{ success: boolean }>(`/projects/${projectId}`);
  },
  
  // 复制项目
  duplicateProject: (projectId: number | string) => {
    return post<Project>(`/projects/${projectId}/duplicate`);
  },
  
  // 获取最近的项目
  getRecentProjects: (limit: number = 5) => {
    return get<Project[]>('/projects/recent', { limit });
  },
  
  // 上传项目文件
  uploadProjectFile: (projectId: number | string, file: File, onProgress?: (progress: number) => void) => {
    return upload<{ fileId: string; fileName: string; fileUrl: string }>(`/projects/${projectId}/files`, file, onProgress);
  },
};

/**
 * 建模相关API
 */
export const modelingApi = {
  // 获取土层数据
  getSoilLayers: (projectId: number | string) => {
    return get<any[]>(`/modeling/${projectId}/soil-layers`);
  },
  
  // 更新土层数据
  updateSoilLayers: (projectId: number | string, data: any[]) => {
    return put<any>(`/modeling/${projectId}/soil-layers`, data);
  },
  
  // 获取基坑数据
  getExcavationData: (projectId: number | string) => {
    return get<any>(`/modeling/${projectId}/excavation`);
  },
  
  // 更新基坑数据
  updateExcavationData: (projectId: number | string, data: any) => {
    return put<any>(`/modeling/${projectId}/excavation`, data);
  },
  
  // 获取支护结构数据
  getSupportStructures: (projectId: number | string) => {
    return get<any[]>(`/modeling/${projectId}/support-structures`);
  },
  
  // 更新支护结构数据
  updateSupportStructures: (projectId: number | string, data: any[]) => {
    return put<any>(`/modeling/${projectId}/support-structures`, data);
  },
  
  // 获取隧道数据
  getTunnelData: (projectId: number | string) => {
    return get<any>(`/modeling/${projectId}/tunnel`);
  },
  
  // 更新隧道数据
  updateTunnelData: (projectId: number | string, data: any) => {
    return put<any>(`/modeling/${projectId}/tunnel`, data);
  },
};

/**
 * 网格划分相关API
 */
export const meshApi = {
  // 获取网格配置
  getMeshConfig: (projectId: number | string) => {
    return get<MeshConfig>(`/mesh/${projectId}/config`);
  },
  
  // 更新网格配置
  updateMeshConfig: (projectId: number | string, data: Partial<MeshConfig>) => {
    return put<MeshConfig>(`/mesh/${projectId}/config`, data);
  },
  
  // 生成网格
  generateMesh: (projectId: number | string) => {
    return post<{ jobId: string }>(`/mesh/${projectId}/generate`);
  },
  
  // 获取网格生成状态
  getMeshStatus: (projectId: number | string, jobId: string) => {
    return get<{ status: string; progress: number; message?: string }>(`/mesh/${projectId}/status/${jobId}`);
  },
  
  // 获取网格统计信息
  getMeshStatistics: (projectId: number | string) => {
    return get<any>(`/mesh/${projectId}/statistics`);
  },
  
  // 获取网格质量信息
  getMeshQuality: (projectId: number | string) => {
    return get<any>(`/mesh/${projectId}/quality`);
  },
};

/**
 * 计算分析相关API
 */
export const computationApi = {
  // 获取计算配置
  getComputationConfig: (projectId: number | string) => {
    return get<ComputationConfig>(`/computation/${projectId}/config`);
  },
  
  // 更新计算配置
  updateComputationConfig: (projectId: number | string, data: Partial<ComputationConfig>) => {
    return put<ComputationConfig>(`/computation/${projectId}/config`, data);
  },
  
  // 启动计算
  startComputation: (projectId: number | string) => {
    return post<{ jobId: string }>(`/computation/${projectId}/start`);
  },
  
  // 获取计算状态
  getComputationStatus: (projectId: number | string, jobId: string) => {
    return get<{ status: string; progress: number; message?: string }>(`/computation/${projectId}/status/${jobId}`);
  },
  
  // 停止计算
  stopComputation: (projectId: number | string, jobId: string) => {
    return post<{ success: boolean }>(`/computation/${projectId}/stop/${jobId}`);
  },
  
  // 获取计算历史
  getComputationHistory: (projectId: number | string) => {
    return get<any[]>(`/computation/${projectId}/history`);
  },
};

/**
 * 结果可视化相关API
 */
export const resultApi = {
  // 获取结果数据
  getResultData: (projectId: number | string, resultType: string, stage?: number) => {
    return get<ResultData>(`/results/${projectId}/data`, { resultType, stage });
  },
  
  // 获取结果统计信息
  getResultStatistics: (projectId: number | string, resultType: string) => {
    return get<any>(`/results/${projectId}/statistics`, { resultType });
  },
  
  // 获取结果截面数据
  getSectionData: (projectId: number | string, resultType: string, sectionType: string, position: number) => {
    return get<any>(`/results/${projectId}/section`, { resultType, sectionType, position });
  },
  
  // 导出结果数据
  exportResultData: (projectId: number | string, resultType: string, format: string) => {
    return get<{ fileUrl: string }>(`/results/${projectId}/export`, { resultType, format });
  },
  
  // 获取施工阶段列表
  getStages: (projectId: number | string) => {
    return get<any[]>(`/results/${projectId}/stages`);
  },
};

/**
 * 数据导入导出相关API
 */
export const dataApi = {
  // 导入数据
  importData: (projectId: number | string, file: File, type: string, onProgress?: (progress: number) => void) => {
    return upload<{ success: boolean; message: string }>(`/data/${projectId}/import/${type}`, file, onProgress);
  },
  
  // 导出数据
  exportData: (projectId: number | string, type: string, format: string) => {
    return get<{ fileUrl: string }>(`/data/${projectId}/export/${type}`, { format });
  },
  
  // 获取导入历史
  getImportHistory: (projectId: number | string) => {
    return get<any[]>(`/data/${projectId}/import-history`);
  },
  
  // 获取导出历史
  getExportHistory: (projectId: number | string) => {
    return get<any[]>(`/data/${projectId}/export-history`);
  },
};

export default {
  auth: authApi,
  project: projectApi,
  modeling: modelingApi,
  mesh: meshApi,
  computation: computationApi,
  result: resultApi,
  data: dataApi,
}; 