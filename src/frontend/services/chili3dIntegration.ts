import axios from 'axios';
import { API_BASE_URL } from '../../config/config';

/**
 * Chili3D API集成服务
 * 提供与3D可视化相关的API调用函数
 */
const chili3dIntegration = {
  /**
   * 获取3D场景数据
   * @param sceneId 场景ID
   * @returns 场景数据Promise
   */
  getSceneData: async (sceneId: string) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chili3d/scenes/${sceneId}`);
      return response.data;
    } catch (error) {
      console.error('获取3D场景数据失败:', error);
      throw error;
    }
  },

  /**
   * 更新3D场景参数
   * @param sceneId 场景ID
   * @param params 要更新的参数
   * @returns 更新结果Promise
   */
  updateSceneParams: async (sceneId: string, params: Record<string, any>) => {
    try {
      const response = await axios.put(`${API_BASE_URL}/chili3d/scenes/${sceneId}/params`, params);
      return response.data;
    } catch (error) {
      console.error('更新3D场景参数失败:', error);
      throw error;
    }
  },

  /**
   * 执行3D场景分析
   * @param sceneId 场景ID
   * @param analysisType 分析类型
   * @returns 分析结果Promise
   */
  runSceneAnalysis: async (sceneId: string, analysisType: string) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/chili3d/scenes/${sceneId}/analyze`, {
        analysis_type: analysisType
      });
      return response.data;
    } catch (error) {
      console.error('执行3D场景分析失败:', error);
      throw error;
    }
  },

  /**
   * 导出3D场景数据
   * @param sceneId 场景ID
   * @param format 导出格式
   * @returns 导出数据Promise
   */
  exportSceneData: async (sceneId: string, format: string = 'json') => {
    try {
      const response = await axios.get(`${API_BASE_URL}/chili3d/scenes/${sceneId}/export`, {
        params: { format },
        responseType: format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('导出3D场景数据失败:', error);
      throw error;
    }
  }
};

export default chili3dIntegration;