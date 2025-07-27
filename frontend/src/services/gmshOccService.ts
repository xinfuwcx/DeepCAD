/**
 * Gmsh OpenCASCADE (OCC) 几何建模服务
 * 前端调用后端的gmsh OCC API进行CAD级别几何建模
 */

// 几何建模请求和响应类型定义
export interface GeometryCreateRequest {
  geometryType: 'box' | 'cylinder' | 'sphere' | 'cone' | 'torus';
  parameters: {
    // Box参数
    x?: number;
    y?: number; 
    z?: number;
    dx?: number;
    dy?: number;
    dz?: number;
    // Cylinder参数
    radius?: number;
    height?: number;
    // Sphere参数
    r?: number;
    // Cone参数
    r1?: number;
    r2?: number;
    // Torus参数
    r1_torus?: number;
    r2_torus?: number;
  };
  name?: string;
}

export interface BooleanOperationRequest {
  operation: 'fuse' | 'cut' | 'intersect' | 'fragment';
  objectTags: number[];
  toolTags: number[];
  removeObjectAndTool?: boolean;
}

export interface GeometryTransformRequest {
  operation: 'translate' | 'rotate' | 'copy' | 'mirror' | 'scale';
  tags: number[];
  parameters: {
    // Translate
    dx?: number;
    dy?: number;
    dz?: number;
    // Rotate
    x?: number;
    y?: number;
    z?: number;
    ax?: number;
    ay?: number;
    az?: number;
    angle?: number;
    // Scale
    scale?: number;
    // Mirror
    a?: number;
    b?: number;
    c?: number;
    d?: number;
  };
}

export interface SupportStructureRequest {
  type: 'diaphragm_wall' | 'steel_strut' | 'anchor_rod' | 'pile';
  parameters: {
    // 地连墙参数
    thickness?: number;
    depth?: number;
    length?: number;
    coordinates?: Array<{x: number, y: number}>;
    // 钢支撑参数
    diameter?: number;
    span?: number;
    level?: number;
    // 锚杆参数
    anchor_length?: number;
    anchor_angle?: number;
    anchor_diameter?: number;
    // 桩基参数
    pile_diameter?: number;
    pile_length?: number;
    pile_spacing?: number;
  };
  position: {x: number, y: number, z: number};
  name?: string;
}

export interface ExcavationGeometryRequest {
  type: 'rectangular' | 'circular' | 'irregular' | 'multi_stage';
  parameters: {
    // 矩形基坑
    width?: number;
    length?: number;
    depth?: number;
    // 圆形基坑
    radius?: number;
    // 不规则基坑
    boundary_points?: Array<{x: number, y: number}>;
    // 分层开挖
    stages?: Array<{
      depth: number;
      slope_ratio?: number;
      stage_name?: string;
    }>;
    // 边坡参数
    slope_ratio?: number;
    bench_width?: number;
  };
  position: {x: number, y: number, z: number};
  name?: string;
}

export interface GeometryMeshRequest {
  geometryTags: number[];
  meshSize: number;
  algorithm?: '2d_delaunay' | '2d_frontal' | '3d_delaunay' | '3d_frontal';
  qualityTarget?: 'fast' | 'balanced' | 'high_quality';
}

export interface GeometryResponse {
  success: boolean;
  message: string;
  geometryTag?: number;
  geometryTags?: number[];
  volume?: number;
  surface_area?: number;
  center_of_mass?: {x: number, y: number, z: number};
  bounding_box?: {
    min: {x: number, y: number, z: number};
    max: {x: number, y: number, z: number};
  };
}

export interface MeshResponse {
  success: boolean;
  message: string;
  mesh_file_url?: string;
  quality_metrics?: {
    element_count: number;
    node_count: number;
    min_quality: number;
    avg_quality: number;
    max_aspect_ratio: number;
  };
}

class GmshOccService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8080'
      : window.location.origin;
  }

  /**
   * 创建基础几何体
   */
  async createGeometry(request: GeometryCreateRequest): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建几何体失败:', error);
      throw error;
    }
  }

  /**
   * 布尔运算
   */
  async performBooleanOperation(request: BooleanOperationRequest): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/boolean`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('布尔运算失败:', error);
      throw error;
    }
  }

  /**
   * 几何变换
   */
  async transformGeometry(request: GeometryTransformRequest): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/transform`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('几何变换失败:', error);
      throw error;
    }
  }

  /**
   * 创建支护结构
   */
  async createSupportStructure(request: SupportStructureRequest): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/support`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建支护结构失败:', error);
      throw error;
    }
  }

  /**
   * 创建开挖几何
   */
  async createExcavationGeometry(request: ExcavationGeometryRequest): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/excavation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('创建开挖几何失败:', error);
      throw error;
    }
  }

  /**
   * 生成网格
   */
  async generateMesh(request: GeometryMeshRequest): Promise<MeshResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/mesh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('网格生成失败:', error);
      throw error;
    }
  }

  /**
   * 获取几何信息
   */
  async getGeometryInfo(tags: number[]): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/info`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('获取几何信息失败:', error);
      throw error;
    }
  }

  /**
   * 删除几何体
   */
  async deleteGeometry(tags: number[]): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tags }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('删除几何体失败:', error);
      throw error;
    }
  }

  /**
   * 导出几何模型
   */
  async exportGeometry(
    tags: number[], 
    format: 'step' | 'iges' | 'stl' | 'brep' | 'geo',
    filename?: string
  ): Promise<{success: boolean, downloadUrl?: string}> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/export`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          tags, 
          format, 
          filename: filename || `geometry_export.${format}` 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('导出几何模型失败:', error);
      throw error;
    }
  }

  /**
   * 导入几何模型
   */
  async importGeometry(file: File): Promise<GeometryResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${this.baseUrl}/api/geometry/import`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('导入几何模型失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有几何体
   */
  async clearAll(): Promise<GeometryResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/clear`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('清空几何体失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const gmshOccService = new GmshOccService();

// 便捷函数
export const createBox = (x: number, y: number, z: number, dx: number, dy: number, dz: number, name?: string) =>
  gmshOccService.createGeometry({
    geometryType: 'box',
    parameters: { x, y, z, dx, dy, dz },
    name
  });

export const createCylinder = (x: number, y: number, z: number, radius: number, height: number, name?: string) =>
  gmshOccService.createGeometry({
    geometryType: 'cylinder',
    parameters: { x, y, z, radius, height },
    name
  });

export const createSphere = (x: number, y: number, z: number, r: number, name?: string) =>
  gmshOccService.createGeometry({
    geometryType: 'sphere',
    parameters: { x, y, z, r },
    name
  });

export const fuseGeometry = (objectTags: number[], toolTags: number[]) =>
  gmshOccService.performBooleanOperation({
    operation: 'fuse',
    objectTags,
    toolTags,
    removeObjectAndTool: true
  });

export const cutGeometry = (objectTags: number[], toolTags: number[]) =>
  gmshOccService.performBooleanOperation({
    operation: 'cut',
    objectTags,
    toolTags,
    removeObjectAndTool: true
  });

export const createDiaphragmWall = (
  coordinates: Array<{x: number, y: number}>,
  thickness: number,
  depth: number,
  position: {x: number, y: number, z: number},
  name?: string
) =>
  gmshOccService.createSupportStructure({
    type: 'diaphragm_wall',
    parameters: { coordinates, thickness, depth },
    position,
    name
  });

export const createExcavation = (
  width: number,
  length: number,
  depth: number,
  position: {x: number, y: number, z: number},
  slope_ratio: number = 0,
  name?: string
) =>
  gmshOccService.createExcavationGeometry({
    type: 'rectangular',
    parameters: { width, length, depth, slope_ratio },
    position,
    name
  });

export default gmshOccService;