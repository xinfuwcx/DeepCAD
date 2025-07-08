/**
 * @file 地质建模服务接口
 * @description 整合GemPy, Gmsh, Kratos的地质建模全流程服务
 */

import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const geologyApi = axios.create({
  baseURL: `${API_BASE_URL}/geology`,
});

// --- Data Structures ---

/**
 * 代表一个三维网格对象的结构，与后端 `pyvista_mesh_to_json` 的输出匹配。
 */
export interface PyVistaMesh {
  name: string;
  type: 'surface' | 'volume'; // 'surface' for visualization, 'volume' for analysis meshes
  vertices: number[][];
  faces: number[][];
  color: string;
  cell_data?: Record<string, number[]>; // For physical groups etc.
}

/**
 * 定义从后端 `/create-geological-model` 端点返回的响应体结构。
 */
export interface GeologicalModelResponse {
  meshes: PyVistaMesh[];
  model_info: {
    extent: number[];
    resolution: number[];
    gmsh_stats: Record<string, any>;
  };
}

/**
 * 定义创建地质模型时需要传递给后端的参数结构。
 * 这必须与后端 `GeologyModeler` 的 `create_model_in_memory` 方法签名匹配。
 */
export interface GeologyModelParameters {
  surface_points: {
    x: number;
    y: number;
    z: number;
    surface: string;
  }[];
  borehole_data: {
    x: number;
    y: number;
    z: number;
    formation: string;
  }[];
  series_mapping: Record<string, string[]>; // e.g., { "DefaultSeries": ["rock1", "rock2"] }
  options: {
    resolution?: number[];
    mesh_size?: number;
    grid_resolution?: number;
    generate_contours?: boolean;
  };
}

/**
 * 调用后端创建数据驱动的地质模型。
 * @param parameters - 地质模型创建所需的参数。
 * @returns 后端返回的包含最终三维网格的响应。
 */
export const createDataDrivenGeologicalModel = async (
  parameters: GeologyModelParameters
): Promise<GeologicalModelResponse> => {
  try {
    // 这个负载结构必须与后端的 `FeatureRequest` Pydantic模型匹配。
    const requestPayload = {
        id: `geology-model-feature-${Date.now()}`,
        name: 'DataDrivenGeologicalModel',
        type: 'CreateGeologicalModel',
        parameters: parameters,
    };
    const response = await geologyApi.post<GeologicalModelResponse>(
      '/create-geological-model',
      requestPayload
    );
    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage =
        error.response?.data?.detail ||
        '创建地质模型时发生网络错误。';
      console.error('Error creating geological model:', errorMessage);
      throw new Error(errorMessage);
    }
    console.error('发生未知错误:', error);
    throw new Error('处理请求时发生未知错误。');
  }
}; 