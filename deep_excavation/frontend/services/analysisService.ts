import axios from 'axios';
import { API_BASE_URL } from './config';

// 分析服务基础URL
const ANALYSIS_SERVICE_URL = `${API_BASE_URL}/api/v1/analysis`;

// 材料接口
interface Material {
  name: string;
  id?: number;
  type: string;
  young_modulus: number;
  poisson_ratio: number;
  density: number;
  hydraulic_conductivity_x?: number;
  hydraulic_conductivity_y?: number;
  hydraulic_conductivity_z?: number;
  porosity?: number;
  specific_storage?: number;
  model?: string;
  cohesion?: number;
  friction_angle?: number;
}

// 边界条件接口
interface BoundaryCondition {
  boundary_name: string;
  type: string;
  value?: number[];
  total_head?: number;
  flux_value?: number;
  constrained?: boolean[];
}

// 荷载接口
interface Load {
  type: string;
  target: string;
  value: number[];
}

// 结构分析请求接口
interface StructuralAnalysisRequest {
  mesh_file: string;
  analysis_type: string;
  materials: Material[];
  boundary_conditions: BoundaryCondition[];
  loads: Load[];
  solver_settings?: any;
}

// 渗流分析请求接口
interface SeepageAnalysisRequest {
  mesh_file: string;
  analysis_type: string;
  materials: Material[];
  boundary_conditions: BoundaryCondition[];
  solver_settings?: any;
}

// 耦合分析请求接口
interface CoupledAnalysisRequest {
  mesh_file: string;
  materials: Material[];
  boundary_conditions: BoundaryCondition[];
  coupling_settings?: any;
}

// 分析结果接口
interface AnalysisResult {
  status: string;
  result_file: string;
  summary: {
    max_displacement?: number;
    max_stress?: number;
    max_head?: number;
    max_velocity?: number;
    analysis_type?: string;
    mesh_file: string;
  };
}

/**
 * 分析服务类
 * 提供与分析服务通信的方法
 */
class AnalysisService {
  /**
   * 运行结构分析
   * 
   * @param request 结构分析请求
   * @returns 分析结果
   */
  async runStructuralAnalysis(request: StructuralAnalysisRequest): Promise<AnalysisResult> {
    try {
      const response = await axios.post(`${ANALYSIS_SERVICE_URL}/structural`, request);
      return response.data;
    } catch (error) {
      console.error('结构分析请求失败:', error);
      throw new Error(`结构分析失败: ${error.message}`);
    }
  }

  /**
   * 运行渗流分析
   * 
   * @param request 渗流分析请求
   * @returns 分析结果
   */
  async runSeepageAnalysis(request: SeepageAnalysisRequest): Promise<AnalysisResult> {
    try {
      const response = await axios.post(`${ANALYSIS_SERVICE_URL}/seepage`, request);
      return response.data;
    } catch (error) {
      console.error('渗流分析请求失败:', error);
      throw new Error(`渗流分析失败: ${error.message}`);
    }
  }

  /**
   * 运行耦合分析
   * 
   * @param request 耦合分析请求
   * @returns 分析结果
   */
  async runCoupledAnalysis(request: CoupledAnalysisRequest): Promise<AnalysisResult> {
    try {
      const response = await axios.post(`${ANALYSIS_SERVICE_URL}/coupled`, request);
      return response.data;
    } catch (error) {
      console.error('耦合分析请求失败:', error);
      throw new Error(`耦合分析失败: ${error.message}`);
    }
  }

  /**
   * 上传网格文件
   * 
   * @param file 网格文件
   * @returns 上传结果
   */
  async uploadMeshFile(file: File): Promise<{file_path: string, filename: string}> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await axios.post(`${ANALYSIS_SERVICE_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      return response.data;
    } catch (error) {
      console.error('网格文件上传失败:', error);
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  /**
   * 获取结果文件下载URL
   * 
   * @param filename 文件名
   * @returns 下载URL
   */
  getResultFileUrl(filename: string): string {
    return `${ANALYSIS_SERVICE_URL}/download/${filename}`;
  }

  /**
   * 下载结果文件
   * 
   * @param filename 文件名
   */
  async downloadResultFile(filename: string): Promise<void> {
    try {
      const url = this.getResultFileUrl(filename);
      
      // 创建一个隐藏的链接元素并触发点击
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('结果文件下载失败:', error);
      throw new Error(`文件下载失败: ${error.message}`);
    }
  }

  /**
   * 创建默认的结构分析材料
   * 
   * @returns 默认材料列表
   */
  createDefaultStructuralMaterials(): Material[] {
    return [
      {
        name: "SOIL_CORE",
        id: 1,
        type: "soil",
        young_modulus: 2.1e7,
        poisson_ratio: 0.3,
        density: 1800.0,
        model: "linear_elastic"
      },
      {
        name: "INFINITE_DOMAIN",
        id: 2,
        type: "soil",
        young_modulus: 1.0e6,
        poisson_ratio: 0.45,
        density: 1800.0,
        model: "linear_elastic"
      }
    ];
  }

  /**
   * 创建默认的渗流分析材料
   * 
   * @returns 默认材料列表
   */
  createDefaultSeepageMaterials(): Material[] {
    return [
      {
        name: "SOIL_LAYER_1",
        id: 1,
        type: "soil",
        young_modulus: 2.1e7,
        poisson_ratio: 0.3,
        density: 1800.0,
        hydraulic_conductivity_x: 1e-5,
        hydraulic_conductivity_y: 1e-5,
        hydraulic_conductivity_z: 1e-6,
        porosity: 0.3,
        specific_storage: 0.0001
      },
      {
        name: "SOIL_LAYER_2",
        id: 2,
        type: "soil",
        young_modulus: 1.0e6,
        poisson_ratio: 0.45,
        density: 1800.0,
        hydraulic_conductivity_x: 1e-7,
        hydraulic_conductivity_y: 1e-7,
        hydraulic_conductivity_z: 1e-8,
        porosity: 0.2,
        specific_storage: 0.00005
      }
    ];
  }
}

// 导出服务实例
export const analysisService = new AnalysisService();
export default analysisService; 