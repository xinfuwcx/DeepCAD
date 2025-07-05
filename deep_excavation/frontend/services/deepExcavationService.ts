import axios from 'axios';

// API基础URL
const API_BASE_URL = 'http://localhost:8000/api';

// 土层参数接口
export interface SoilLayer {
  name: string;
  thickness: number;
  unit_weight: number;
  cohesion: number;
  friction_angle: number;
  young_modulus: number;
  poisson_ratio: number;
  hydraulic_conductivity_x: number;
  hydraulic_conductivity_y: number;
  hydraulic_conductivity_z: number;
  porosity?: number;
  specific_storage?: number;
}

// 结构构件参数接口
export interface StructuralElement {
  type: 'diaphragm_wall' | 'pile' | 'anchor' | 'strut';
  name: string;
  geometry: any;  // 几何参数，根据类型不同而不同
  material: any;  // 材料参数
}

// 边界条件接口
export interface BoundaryCondition {
  type: 'hydraulic' | 'displacement' | 'force';
  boundary_name: string;
  value: number | number[];
}

// 开挖阶段接口
export interface ExcavationStage {
  name: string;
  depth: number;
  active_supports: string[];  // 该阶段激活的支护结构
}

// 深基坑分析参数接口
export interface DeepExcavationParams {
  project_name: string;
  dxf_file_content: string;
  layer_name?: string;
  soil_layers: SoilLayer[];
  structural_elements: StructuralElement[];
  boundary_conditions: BoundaryCondition[];
  excavation_stages: ExcavationStage[];
  analysis_types: ('seepage' | 'structural' | 'deformation' | 'stability' | 'settlement')[];
}

// 分析结果接口
export interface DeepExcavationResult {
  project_name: string;
  status: string;
  message: string;
  results: {
    seepage?: {
      status: string;
      total_discharge_m3_per_s?: number;
      max_head_difference?: number;
      error_message?: string;
    };
    structural?: {
      status: string;
      max_displacement_mm?: number;
      max_bending_moment_kNm?: number;
      error_message?: string;
    };
    deformation?: {
      status: string;
      max_vertical_displacement_mm?: number;
      max_horizontal_displacement_mm?: number;
      error_message?: string;
    };
    stability?: {
      status: string;
      safety_factor?: number;
      critical_surface?: string;
      error_message?: string;
    };
    settlement?: {
      status: string;
      max_settlement_mm?: number;
      influence_range_m?: number;
      error_message?: string;
    };
  };
  result_files: {
    seepage?: string;
    structural?: string;
    deformation?: string;
    stability?: string;
    settlement?: string;
  };
}

/**
 * 深基坑工程统一分析服务
 * 提供与深基坑工程分析相关的API调用和数据处理功能
 */
class DeepExcavationService {
  /**
   * 运行深基坑工程分析
   * @param params 分析参数
   * @returns 分析结果
   */
  async runAnalysis(params: DeepExcavationParams): Promise<DeepExcavationResult> {
    try {
      const response = await axios.post(`${API_BASE_URL}/deep-excavation/analyze`, params);
      return response.data.results;
    } catch (error: any) {
      console.error('深基坑工程分析请求失败:', error);
      throw new Error(error.response?.data?.detail || '深基坑工程分析请求失败');
    }
  }

  /**
   * 获取特定项目的分析结果
   * @param projectId 项目ID
   * @returns 分析结果
   */
  async getAnalysisResults(projectId: string): Promise<DeepExcavationResult> {
    try {
      const response = await axios.get(`${API_BASE_URL}/deep-excavation/results/${projectId}`);
      return response.data;
    } catch (error: any) {
      console.error('获取深基坑工程分析结果失败:', error);
      throw new Error(error.response?.data?.detail || '获取深基坑工程分析结果失败');
    }
  }

  /**
   * 获取分析结果文件
   * @param projectId 项目ID
   * @param analysisType 分析类型
   * @returns 结果文件Blob
   */
  async getResultFile(projectId: string, analysisType: string): Promise<Blob> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/deep-excavation/result-file/${projectId}/${analysisType}`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error: any) {
      console.error(`获取${analysisType}分析结果文件失败:`, error);
      throw new Error(`获取${analysisType}分析结果文件失败`);
    }
  }
  
  /**
   * 导出分析报告为PDF
   * @param projectId 项目ID
   * @returns 报告PDF的Blob
   */
  async exportReportToPDF(projectId: string): Promise<Blob> {
    try {
      const response = await axios.get(
        `${API_BASE_URL}/deep-excavation/export-report/${projectId}/pdf`,
        { responseType: 'blob' }
      );
      return response.data;
    } catch (error: any) {
      console.error('导出PDF报告失败:', error);
      throw new Error('导出PDF报告失败');
    }
  }
}

export default new DeepExcavationService(); 