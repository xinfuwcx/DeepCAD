import axios from 'axios';
import { Filter } from '../components/visualization/ScientificVisualizationPanel';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * 获取指定项目的基础分析结果。
 * 这通常是第一次加载结果时调用，获取整个模型。
 * @param projectId 项目ID
 * @param resultId 结果集ID (例如，'step-5-stress')
 * @returns Promise，包含glTF格式的模型数据
 */
const getResult = async (projectId: string, resultId: string): Promise<any> => {
  try {
    const response = await apiClient.get(`/projects/${projectId}/results/${resultId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching result for project ${projectId}, result ${resultId}:`, error);
    throw error;
  }
};

/**
 * 对当前的可视化状态应用一个或多个滤镜。
 * 这是核心的后处理函数，用于实时计算和获取新的可视化模型。
 * @param resultId 原始结果的唯一标识符
 * @param filters 滤镜对象数组
 * @returns Promise，包含处理后生成的glTF模型数据
 */
const applyFilter = async (resultId: string, filters: Filter[]): Promise<any> => {
    try {
        const response = await apiClient.post(`/visualize/apply-filter`, {
            result_id: resultId,
            filters: filters,
        });
        return response.data;
    } catch (error) {
        console.error(`Error applying filter to result ${resultId}:`, error);
        throw error;
    }
};

/**
 * 获取一个瞬态分析结果的所有时间步的动画帧。
 * @param resultId 原始结果的唯一标识符
 * @param fieldName 要生成动画的物理场名称 (例如 'Displacement')
 * @returns Promise，包含一个动画帧信息数组
 */
const getAnimationFrames = async (resultId: string, fieldName: string): Promise<any[]> => {
    try {
        const response = await apiClient.get(`/visualize/animation`, {
            params: {
                result_id: resultId,
                field: fieldName,
            }
        });
        return response.data.frames;
    } catch (error) {
        console.error(`Error fetching animation frames for result ${resultId}:`, error);
        throw error;
    }
}

export const visualizationService = {
  getResult,
  applyFilter,
  getAnimationFrames,
}; 