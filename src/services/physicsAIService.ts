import axios from 'axios';
import { API_BASE_URL } from '../config/config';

// 定义参数反演的输入接口
export interface ParameterInversionInput {
  projectId: string;          // 目标项目ID
  algorithm: 'bayesian' | 'ga' | 'pso'; // 使用的优化算法
  monitoringDataIds: string[]; // 用于反演的监测数据点ID
  inversionParameterIds: string[]; // 需要反演的参数ID
}

// 定义参数反演的返回结果接口
export interface ParameterInversionResult {
  jobId: string; // 后端返回的计算任务ID
  status: 'queued' | 'running' | 'completed' | 'failed';
  message: string;
}

// 定义获取任务状态的返回结果接口
export interface JobStatusResult {
    jobId: string;
    status: 'queued' | 'running' | 'completed' | 'failed' | 'unknown';
    progress?: number; // 0-100
    results?: Record<string, number>; // 反演出的参数结果
    error?: string;
}

// 定义代理模型的数据接口
export interface SurrogateModel {
  id: string;
  name: string;
  type: 'GaussianProcess' | 'NeuralNetwork' | 'RandomForest';
  status: 'trained' | 'training' | 'pending' | 'failed';
  accuracy: number | null;
  trainingTime: string | null; // e.g., "15 min"
  trainingJobId?: string; // 关联的训练任务ID
}

// 定义创建新代理模型的输入接口
export interface NewSurrogateModelInput {
    name: string;
    type: 'GaussianProcess' | 'NeuralNetwork' | 'RandomForest';
    // 在实际应用中，这里还会有数据集、输入/输出特征等更多配置
}

/**
 * 物理AI服务
 */
class PhysicsAIService {
  private api = axios.create({
    baseURL: `${API_BASE_URL}/ai`,
  });

  /**
   * 启动参数反演计算
   * @param data - 参数反演的输入数据
   * @returns 后端返回的计算任务信息
   */
  async startParameterInversion(data: ParameterInversionInput): Promise<ParameterInversionResult> {
    try {
      const response = await this.api.post('/parameter-inversion/start', data);
      return response.data;
    } catch (error) {
      console.error('Error starting parameter inversion:', error);
      // 在实际应用中，这里会使用更完善的错误处理机制
      throw new Error('启动参数反演失败');
    }
  }

  /**
   * 获取参数反演任务的状态
   * @param jobId - 计算任务的ID
   * @returns 任务的当前状态、进度和结果
   */
  async getInversionJobStatus(jobId: string): Promise<JobStatusResult> {
    try {
      const response = await this.api.get(`/jobs/${jobId}/status`);
      return response.data;
    } catch (error) {
        console.error(`Error fetching status for job ${jobId}:`, error);
        return {
            jobId,
            status: 'unknown',
            error: '获取任务状态失败'
        };
    }
  }

  // --- Surrogate Model Methods ---

  /**
   * 获取所有代理模型
   * @returns 代理模型列表
   */
  async getSurrogateModels(): Promise<SurrogateModel[]> {
    try {
      const response = await this.api.get('/surrogate-models');
      return response.data;
    } catch (error) {
      console.error('Error fetching surrogate models:', error);
      throw new Error('获取代理模型列表失败');
    }
  }

  /**
   * 启动代理模型训练
   * @param modelId - 要训练的模型的ID
   * @returns 后端返回的计算任务信息
   */
  async startModelTraining(modelId: string): Promise<ParameterInversionResult> { // Can reuse the same result type
    try {
      const response = await this.api.post(`/surrogate-models/${modelId}/train`);
      return response.data;
    } catch (error) {
      console.error(`Error starting training for model ${modelId}:`, error);
      throw new Error('启动模型训练失败');
    }
  }
  
  /**
   * 创建一个新的代理模型
   * @param data - 新模型的配置
   * @returns 创建成功后的模型信息
   */
  async createSurrogateModel(data: NewSurrogateModelInput): Promise<SurrogateModel> {
    try {
      const response = await this.api.post('/surrogate-models', data);
      return response.data;
    } catch (error) {
      console.error('Error creating surrogate model:', error);
      throw new Error('创建代理模型失败');
    }
  }
}

export const physicsAIService = new PhysicsAIService(); 