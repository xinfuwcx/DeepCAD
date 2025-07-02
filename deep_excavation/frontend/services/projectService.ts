import axios from 'axios';

const API_URL = '/api/projects';

export interface Project {
  id: number;
  name: string;
  description?: string;
  location?: string;
  project_type?: string;
  status: string;
  created_at: string;
  updated_at: string;
  user_id: number;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  location?: string;
  project_type?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  location?: string;
  project_type?: string;
  status?: string;
}

export interface SeepageModel {
  id: number;
  name: string;
  description?: string;
  status: string;
  created_at: string;
  updated_at: string;
  project_id: number;
  soil_layers?: any[];
  boundary_conditions?: any[];
  mesh_config?: any;
  analysis_config?: any;
}

export interface SeepageModelCreateRequest {
  name: string;
  description?: string;
  soil_layers?: any[];
  boundary_conditions?: any[];
  mesh_config?: any;
  analysis_config?: any;
  project_id: number;
}

/**
 * 获取所有项目
 */
export const getProjects = async (): Promise<Project[]> => {
  try {
    const response = await axios.get<Project[]>(API_URL);
    return response.data;
  } catch (error) {
    console.error('获取项目列表失败:', error);
    throw new Error('获取项目列表失败');
  }
};

/**
 * 获取特定项目详情
 */
export const getProject = async (id: number): Promise<Project> => {
  try {
    const response = await axios.get<Project>(`${API_URL}/${id}`);
    return response.data;
  } catch (error) {
    console.error(`获取项目(ID: ${id})详情失败:`, error);
    throw new Error('获取项目详情失败');
  }
};

/**
 * 创建新项目
 */
export const createProject = async (
  projectData: ProjectCreateRequest
): Promise<Project> => {
  try {
    const response = await axios.post<Project>(API_URL, projectData);
    return response.data;
  } catch (error) {
    console.error('创建项目失败:', error);
    throw new Error('创建项目失败');
  }
};

/**
 * 更新项目
 */
export const updateProject = async (
  id: number,
  projectData: ProjectUpdateRequest
): Promise<Project> => {
  try {
    const response = await axios.put<Project>(
      `${API_URL}/${id}`,
      projectData
    );
    return response.data;
  } catch (error) {
    console.error(`更新项目(ID: ${id})失败:`, error);
    throw new Error('更新项目失败');
  }
};

/**
 * 删除项目
 */
export const deleteProject = async (id: number): Promise<void> => {
  try {
    await axios.delete(`${API_URL}/${id}`);
  } catch (error) {
    console.error(`删除项目(ID: ${id})失败:`, error);
    throw new Error('删除项目失败');
  }
};

/**
 * 获取项目的所有渗流模型
 */
export const getSeepageModels = async (
  projectId: number
): Promise<SeepageModel[]> => {
  try {
    const response = await axios.get<SeepageModel[]>(
      `${API_URL}/${projectId}/seepage-models`
    );
    return response.data;
  } catch (error) {
    console.error(`获取项目(ID: ${projectId})的渗流模型失败:`, error);
    throw new Error('获取渗流模型列表失败');
  }
};

/**
 * 获取特定渗流模型详情
 */
export const getSeepageModel = async (
  projectId: number,
  modelId: number
): Promise<SeepageModel> => {
  try {
    const response = await axios.get<SeepageModel>(
      `${API_URL}/${projectId}/seepage-models/${modelId}`
    );
    return response.data;
  } catch (error) {
    console.error(`获取渗流模型(ID: ${modelId})详情失败:`, error);
    throw new Error('获取渗流模型详情失败');
  }
};

/**
 * 创建新渗流模型
 */
export const createSeepageModel = async (
  projectId: number,
  modelData: SeepageModelCreateRequest
): Promise<SeepageModel> => {
  try {
    const response = await axios.post<SeepageModel>(
      `${API_URL}/${projectId}/seepage-models`,
      modelData
    );
    return response.data;
  } catch (error) {
    console.error(`创建渗流模型失败:`, error);
    throw new Error('创建渗流模型失败');
  }
};

export default {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getSeepageModels,
  getSeepageModel,
  createSeepageModel
}; 