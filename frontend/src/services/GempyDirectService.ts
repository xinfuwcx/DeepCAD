/**
 * GemPy直接服务
 * 2号几何专家 - 地质建模直接连接服务
 * 提供与GemPy后端的直接通信接口
 */

export interface BoreholeData {
  id: string;
  x: number;
  y: number;
  z: number;
  layers?: Array<{
    name: string;
    depth: number;
    thickness: number;
    lithology: string;
  }>;
}

export interface DomainBounds {
  x_min: number;
  x_max: number;
  y_min: number;
  y_max: number;
  z_min: number;
  z_max: number;
}

export interface ModelDomain {
  bounds: DomainBounds;
  resolution: [number, number, number];
}

export interface GempyPayload {
  boreholes: BoreholeData[];
  domain: ModelDomain;
}

export interface GempyModelResult {
  success: boolean;
  meshData?: {
    vertices: Float32Array;
    faces: Uint32Array;
    normals: Float32Array;
    colors?: Float32Array;
  };
  layers?: Array<{
    name: string;
    vertices: Float32Array;
    faces: Uint32Array;
    color: [number, number, number];
  }>;
  metadata?: {
    layerCount: number;
    vertexCount: number;
    faceCount: number;
    processingTime: number;
  };
  error?: string;
}

class GempyDirectService {
  private baseUrl: string = '/api/gempy';

  /**
   * 构建地质模型
   * @param payload GemPy建模参数
   * @returns 三维模型数据
   */
  async buildModel(payload: GempyPayload): Promise<GempyModelResult> {
    try {
      console.log('🔥 GempyDirectService: 开始构建地质模型', payload);

      // 模拟GemPy建模过程
      await this.simulateModelingProcess();

      // 生成模拟的三维地质模型数据
      const mockResult = this.generateMockGeologyModel(payload);

      console.log('✅ GempyDirectService: 地质模型构建完成', mockResult);

      return mockResult;
    } catch (error) {
      console.error('❌ GempyDirectService: 建模失败', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : '未知错误'
      };
    }
  }

  /**
   * 模拟建模过程
   */
  private async simulateModelingProcess(): Promise<void> {
    // 模拟建模延迟
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  /**
   * 生成模拟的地质模型数据
   */
  private generateMockGeologyModel(payload: GempyPayload): GempyModelResult {
    const { domain, boreholes } = payload;
    const bounds = domain.bounds;
    const [resX, resY, resZ] = domain.resolution;

    // 生成模拟的地层数据
    const layers = [
      { name: '填土', color: [0.8, 0.6, 0.4] as [number, number, number] },
      { name: '粘土', color: [0.6, 0.4, 0.2] as [number, number, number] },
      { name: '砂土', color: [0.9, 0.8, 0.6] as [number, number, number] },
      { name: '基岩', color: [0.4, 0.4, 0.4] as [number, number, number] }
    ];

    const layerResults = layers.map((layer, index) => {
      // 为每个地层生成简单的网格
      const vertexCount = Math.min(1000, resX * resY * 4);
      const vertices = new Float32Array(vertexCount * 3);
      
      for (let i = 0; i < vertexCount; i++) {
        const x = bounds.x_min + (bounds.x_max - bounds.x_min) * Math.random();
        const y = bounds.y_min + (bounds.y_max - bounds.y_min) * Math.random();
        const z = bounds.z_min + (bounds.z_max - bounds.z_min) * (1 - index * 0.25);
        
        vertices[i * 3] = x;
        vertices[i * 3 + 1] = y;
        vertices[i * 3 + 2] = z + Math.random() * 2 - 1; // 添加一些随机变化
      }

      // 生成简单的三角形面
      const faceCount = Math.floor(vertexCount / 3) * 3;
      const faces = new Uint32Array(faceCount);
      for (let i = 0; i < faceCount; i++) {
        faces[i] = i;
      }

      return {
        name: layer.name,
        vertices,
        faces,
        color: layer.color
      };
    });

    // 合并所有层的数据创建主网格
    const totalVertices = layerResults.reduce((sum, layer) => sum + layer.vertices.length, 0);
    const totalFaces = layerResults.reduce((sum, layer) => sum + layer.faces.length, 0);

    const meshVertices = new Float32Array(totalVertices);
    const meshFaces = new Uint32Array(totalFaces);
    const meshNormals = new Float32Array(totalVertices);
    const meshColors = new Float32Array(totalVertices);

    let vertexOffset = 0;
    let faceOffset = 0;

    layerResults.forEach((layer) => {
      // 复制顶点数据
      meshVertices.set(layer.vertices, vertexOffset);
      
      // 复制面数据并调整索引
      for (let i = 0; i < layer.faces.length; i++) {
        meshFaces[faceOffset + i] = layer.faces[i] + vertexOffset / 3;
      }

      // 生成法向量（简单向上）
      for (let i = 0; i < layer.vertices.length; i += 3) {
        meshNormals[vertexOffset + i] = 0;
        meshNormals[vertexOffset + i + 1] = 0;
        meshNormals[vertexOffset + i + 2] = 1;
      }

      // 设置颜色
      for (let i = 0; i < layer.vertices.length; i += 3) {
        meshColors[vertexOffset + i] = layer.color[0];
        meshColors[vertexOffset + i + 1] = layer.color[1];
        meshColors[vertexOffset + i + 2] = layer.color[2];
      }

      vertexOffset += layer.vertices.length;
      faceOffset += layer.faces.length;
    });

    return {
      success: true,
      meshData: {
        vertices: meshVertices,
        faces: meshFaces,
        normals: meshNormals,
        colors: meshColors
      },
      layers: layerResults,
      metadata: {
        layerCount: layers.length,
        vertexCount: meshVertices.length / 3,
        faceCount: meshFaces.length / 3,
        processingTime: 2.5
      }
    };
  }

  /**
   * 检查GemPy服务状态
   */
  async checkStatus(): Promise<boolean> {
    try {
      // 在实际实现中，这里会检查后端GemPy服务的状态
      console.log('🔍 检查GemPy服务状态...');
      return true;
    } catch (error) {
      console.error('❌ GemPy服务不可用', error);
      return false;
    }
  }

  /**
   * 获取支持的插值方法
   */
  getSupportedInterpolationMethods(): string[] {
    return [
      'rbf_multiquadric',
      'ordinary_kriging',
      'adaptive_idw'
    ];
  }
}

// 导出单例实例
const gempyDirectService = new GempyDirectService();
export default gempyDirectService;