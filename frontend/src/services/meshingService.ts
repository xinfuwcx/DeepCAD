/**
 * DeepCAD 网格生成服务
 * @description 深基坑工程有限元网格生成的核心服务模块，负责处理Fragment几何体生成、网格划分、质量控制等功能
 * 支持多种几何体类型和网格参数，为CAE分析提供高质量的计算网格
 * @author 2号几何专家
 * @version 2.0.0
 * @since 2024-07-25
 */

/**
 * Fragment几何体定义接口
 * @interface FragmentGeometry
 * @description 定义网格生成中的几何体类型和参数
 */
export interface FragmentGeometry {
  /** 几何体类型：立方体/圆柱体/多边形 */
  type: 'box' | 'cylinder' | 'polygon';
  /** 几何体参数映射 */
  geometry: {
    [key: string]: any;
  };
}

/**
 * 域Fragment定义接口
 * @interface DomainFragment
 * @description 定义深基坑分析域中的Fragment对象，包含几何信息和网格属性
 */
export interface DomainFragment {
  /** Fragment唯一标识符 */
  id: string;
  /** Fragment名称 */
  name: string;
  /** Fragment类型：基坑/结构/土体域 */
  fragment_type: 'excavation' | 'structure' | 'soil_domain';
  /** 几何体定义 */
  geometry: FragmentGeometry;
  /** 网格划分属性 */
  mesh_properties: {
    /** 单元尺寸 (米) */
    element_size: number;
    /** 单元类型：四面体/六面体等 */
    element_type: string;
    /** 网格密度等级：粗糙/中等/精细 */
    mesh_density: string;
  };
  /** 是否启用此Fragment */
  enabled?: boolean;
  /** 网格生成优先级 */
  priority?: number;
}

/**
 * 网格生成请求参数接口
 * @interface MeshGenerationRequest
 * @description 发送给网格生成引擎的完整请求参数
 */
export interface MeshGenerationRequest {
  /** 计算域边界框最小坐标 [x, y, z] (米) */
  boundingBoxMin: number[];
  /** 计算域边界框最大坐标 [x, y, z] (米) */
  boundingBoxMax: number[];
  /** 全局网格尺寸 (米) */
  meshSize: number;
  /** 客户端标识符 */
  clientId: string;
  /** 是否启用Fragment功能 */
  enable_fragment: boolean;
  /** 域Fragment定义数组 */
  domain_fragments?: DomainFragment[];
  /** 全局网格设置 */
  global_mesh_settings?: {
    /** 全局单元类型 */
    element_type: string;
    /** 默认单元尺寸 (米) */
    default_element_size: number;
    /** 网格质量等级：低/中/高 */
    mesh_quality: string;
    /** 是否启用网格平滑 */
    mesh_smoothing: boolean;
  };
}

/**
 * 网格生成响应结果接口
 * @interface MeshGenerationResponse
 * @description 网格生成引擎返回的生成结果和质量指标
 */
export interface MeshGenerationResponse {
  /** 生成状态消息 */
  message: string;
  /** 网格文件下载链接 */
  mesh_url: string;
  /** 成功生成的Fragment列表 */
  fragments_generated: string[];
  /** 网格单元总数 */
  total_elements: number;
  /** 网格节点总数 */
  total_nodes: number;
  /** 网格质量指标映射 */
  mesh_quality_metrics: {
    [key: string]: number;
  };
}

export interface MeshQualityMetrics {
  element_count: number;
  node_count: number;
  min_quality: number;
  max_quality: number;
  avg_quality: number;
  quality_distribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  volume_statistics: {
    total_volume: number;
    fragment_volumes: {
      [fragmentId: string]: number;
    };
  };
}

class MeshingService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = '/api/meshing';
  }

  /**
   * 生成Fragment网格
   */
  async generateFragmentMesh(request: MeshGenerationRequest): Promise<MeshGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error generating fragment mesh:', error);
      throw error;
    }
  }

  /**
   * 获取网格质量分析
   */
  async getMeshQuality(meshId: string): Promise<MeshQualityMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/quality/${meshId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting mesh quality:', error);
      throw error;
    }
  }

  /**
   * 验证Fragment配置
   */
  async validateFragmentConfig(request: MeshGenerationRequest): Promise<{
    is_valid: boolean;
    warnings: string[];
    errors: string[];
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/validate-fragments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error validating fragment config:', error);
      throw error;
    }
  }

  /**
   * 获取Fragment模板
   */
  async getFragmentTemplates(): Promise<{
    templates: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      template_data: Partial<DomainFragment>;
    }>;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/fragment-templates`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting fragment templates:', error);
      throw error;
    }
  }

  /**
   * 预估网格生成时间
   */
  async estimateMeshGenerationTime(request: MeshGenerationRequest): Promise<{
    estimated_time_seconds: number;
    estimated_elements: number;
    estimated_nodes: number;
    complexity_level: 'low' | 'medium' | 'high' | 'very_high';
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/estimate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error estimating mesh generation time:', error);
      throw error;
    }
  }

  /**
   * 获取网格生成进度
   */
  async getMeshGenerationProgress(jobId: string): Promise<{
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    current_stage: string;
    estimated_time_remaining?: number;
    message?: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/progress/${jobId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting mesh generation progress:', error);
      throw error;
    }
  }

  /**
   * 取消网格生成
   */
  async cancelMeshGeneration(jobId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/cancel/${jobId}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error canceling mesh generation:', error);
      throw error;
    }
  }

  /**
   * 导出网格
   */
  async exportMesh(meshId: string, format: 'vtk' | 'msh' | 'inp'): Promise<Blob> {
    try {
      const response = await fetch(`${this.baseUrl}/export/${meshId}?format=${format}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      console.error('Error exporting mesh:', error);
      throw error;
    }
  }
}

export const meshingService = new MeshingService();