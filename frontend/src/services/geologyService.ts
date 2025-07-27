import { apiClient } from '../api/client';

export interface EnhancedBorehole {
  id?: string;
  x: number;
  y: number;
  z: number;
  soil_type?: string;
  layer_id?: number;
  description?: string;
  soilLayers?: SoilLayer[];
  coordinates?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface SoilLayer {
  layer_id: number;
  name: string;
  density: number;
  cohesion: number;
  friction_angle: number;
  permeability?: number;
  topElevation?: number;
  bottomElevation?: number;
  soilType?: string;
}

export type InterpolationMethod = 
  | 'ordinary_kriging' 
  | 'universal_kriging' 
  | 'simple_kriging' 
  | 'rbf' 
  | 'inverse_distance';

export type VariogramModel = 
  | 'gaussian' 
  | 'exponential' 
  | 'spherical' 
  | 'matern' 
  | 'linear';

export interface GeologyModelingRequest {
  boreholes: EnhancedBorehole[];
  soil_layers?: SoilLayer[];
  interpolation_method?: InterpolationMethod;
  variogram_model?: VariogramModel;
  grid_resolution?: number;
  domain_expansion?: [number, number];
  auto_fit_variogram?: boolean;
  colormap?: string;
  uncertainty_analysis?: boolean;
}

export interface VariogramAnalysis {
  lag_distances: number[];
  gamma_values: number[];
  max_lag: number;
  n_pairs: number;
  model_type: string;
  len_scale: number;
  variance: number;
  nugget: number;
  fit_quality: string;
}

export interface UncertaintyAnalysis {
  cross_validation: {
    predictions: number[];
    true_values: number[];
    errors: number[];
    mean_error: number;
    mae: number;
    rmse: number;
    r_squared: number;
  };
  variogram_model: {
    type: string;
    range: number;
    sill: number;
    nugget: number;
  };
  interpolation_quality: {
    mean_error: number;
    rmse: number;
    r_squared: number;
  };
}

export interface GeologyModelingResponse {
  message: string;
  gltf_url: string;
  interpolation_method: string;
  variogram_analysis?: VariogramAnalysis;
  uncertainty_analysis?: UncertaintyAnalysis;
  mesh_info: {
    n_points: number;
    n_cells: number;
    bounds: number[];
    scalar_fields: string[];
  };
  request_params: GeologyModelingRequest;
}

export interface GeologyAnalysisOptions {
  method?: InterpolationMethod;
  variogramModel?: VariogramModel;
  gridResolution?: number;
  domainExpansion?: [number, number];
  colormap?: string;
  includeUncertainty?: boolean;
}

export class GeologyService {
  private baseUrl = '/api/geology';

  /**
   * 使用RBF插值进行专业地质建模
   */
  async generateGeologyModel(
    boreholes: EnhancedBorehole[],
    options: GeologyAnalysisOptions = {}
  ): Promise<GeologyModelingResponse> {
    const request: GeologyModelingRequest = {
      boreholes,
      interpolation_method: options.method || 'rbf',
      variogram_model: options.variogramModel || 'exponential',
      grid_resolution: options.gridResolution || 2.0,
      domain_expansion: options.domainExpansion || [50.0, 50.0],
      auto_fit_variogram: true,
      colormap: options.colormap || 'terrain',
      uncertainty_analysis: options.includeUncertainty || true
    };

    console.log('🔧 发起地质建模请求:', request);

    try {
      const response = await apiClient.post<GeologyModelingResponse>(
        `${this.baseUrl}/rbf-geology`,
        request
      );

      console.log('✅ 地质建模成功:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ 地质建模失败:', error);
      throw new Error(
        error.response?.data?.detail || 
        '地质建模失败，请检查钻孔数据和参数设置'
      );
    }
  }

  /**
   * 获取变差函数分析
   */
  async getVariogramAnalysis(method: string = 'exponential') {
    try {
      const response = await apiClient.get(
        `${this.baseUrl}/variogram-analysis/${method}`
      );
      
      console.log('📊 变差函数分析结果:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ 变差函数分析失败:', error);
      throw new Error(
        error.response?.data?.detail || 
        '变差函数分析失败'
      );
    }
  }

  /**
   * 使用传统RBF方法生成地质模型（向后兼容）
   */
  async generateLegacyModel(boreholes: { x: number; y: number; z: number }[]) {
    const request = {
      boreholes,
      domain_expansion: [50.0, 50.0],
      bottom_elevation: -30.0,
      transition_distance: 50.0,
      grid_resolution: 2.0
    };

    try {
      const response = await apiClient.post(
        `${this.baseUrl}/generate-soil-domain`,
        request
      );
      
      console.log('✅ 传统RBF建模成功:', response.data);
      return response.data;
      
    } catch (error: any) {
      console.error('❌ 传统RBF建模失败:', error);
      throw new Error(
        error.response?.data?.detail || 
        '地质建模失败'
      );
    }
  }

  /**
   * 预处理钻孔数据
   */
  preprocessBoreholeData(rawData: any[]): EnhancedBorehole[] {
    return rawData.map((item, index) => ({
      id: item.id || `bh_${index + 1}`,
      x: parseFloat(item.x),
      y: parseFloat(item.y),
      z: parseFloat(item.z),
      soil_type: item.soil_type || item.description,
      layer_id: item.layer_id,
      description: item.description
    }));
  }

  /**
   * 验证钻孔数据
   */
  validateBoreholeData(boreholes: EnhancedBorehole[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (boreholes.length < 3) {
      errors.push('至少需要3个钻孔点进行地质建模');
    }

    if (boreholes.length < 5) {
      warnings.push('钻孔数量较少，建议使用更多钻孔点以提高建模精度');
    }

    // 检查数据完整性
    boreholes.forEach((bh, index) => {
      if (isNaN(bh.x) || isNaN(bh.y) || isNaN(bh.z)) {
        errors.push(`钻孔 ${index + 1} 坐标数据无效`);
      }
    });

    // 检查空间分布
    if (boreholes.length > 2) {
      const xCoords = boreholes.map(bh => bh.x);
      const yCoords = boreholes.map(bh => bh.y);
      
      const xRange = Math.max(...xCoords) - Math.min(...xCoords);
      const yRange = Math.max(...yCoords) - Math.min(...yCoords);
      
      if (xRange < 10 || yRange < 10) {
        warnings.push('钻孔空间分布范围较小，可能影响插值效果');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 获取推荐的建模参数
   */
  getRecommendedParameters(boreholes: EnhancedBorehole[]): GeologyAnalysisOptions {
    const validation = this.validateBoreholeData(boreholes);
    
    if (!validation.isValid) {
      throw new Error(`数据验证失败: ${validation.errors.join(', ')}`);
    }

    // 根据钻孔数量推荐方法
    let method: InterpolationMethod = 'rbf';
    if (boreholes.length > 20) {
      method = 'inverse_distance'; // 更多数据时使用反距离加权
    }

    // 根据空间分布推荐网格分辨率
    const xCoords = boreholes.map(bh => bh.x);
    const yCoords = boreholes.map(bh => bh.y);
    const xRange = Math.max(...xCoords) - Math.min(...xCoords);
    const yRange = Math.max(...yCoords) - Math.min(...yCoords);
    const avgRange = (xRange + yRange) / 2;
    
    const gridResolution = Math.max(1.0, avgRange / 50); // 适应性网格分辨率

    return {
      method,
      variogramModel: 'exponential', // 经验上最稳定
      gridResolution,
      domainExpansion: [avgRange * 0.2, avgRange * 0.2], // 20%扩展
      colormap: 'terrain',
      includeUncertainty: true
    };
  }
}

// 导出单例实例
export const geologyService = new GeologyService();