import { APIRequestContext } from '@playwright/test';

export class ApiHelper {
  private request: APIRequestContext;
  private baseURL: string;

  constructor(request: APIRequestContext, baseURL = 'http://localhost:8000') {
    this.request = request;
    this.baseURL = baseURL;
  }

  // 健康检查
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.request.get(`${this.baseURL}/api/health`);
      return response.ok();
    } catch {
      return false;
    }
  }

  // DXF导入相关API
  async uploadDXFFile(filePath: string, options?: any): Promise<any> {
    const formData = new FormData();
    const fs = await import('fs');
    const fileContent = fs.readFileSync(filePath);
    
    formData.append('file', new Blob([fileContent]), 'test.dxf');
    if (options) {
      formData.append('options', JSON.stringify(options));
    }

    const response = await this.request.post(`${this.baseURL}/api/dxf-import/upload`, {
      multipart: {
        file: {
          name: 'test.dxf',
          mimeType: 'application/octet-stream',
          buffer: fileContent,
        },
        options: options ? JSON.stringify(options) : undefined,
      },
    });

    return response.json();
  }

  async analyzeDXFFile(filePath: string): Promise<any> {
    const fs = await import('fs');
    const fileContent = fs.readFileSync(filePath);

    const response = await this.request.post(`${this.baseURL}/api/dxf-import/analyze`, {
      multipart: {
        file: {
          name: 'test.dxf',
          mimeType: 'application/octet-stream',
          buffer: fileContent,
        },
      },
    });

    return response.json();
  }

  async getDXFImportStatus(importId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/dxf-import/status/${importId}`);
    return response.json();
  }

  async getDXFQualityReport(importId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/dxf-import/quality-report/${importId}`);
    return response.json();
  }

  // 网格生成相关API
  async getMeshingAlgorithms(): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/meshing/algorithms/info`);
    return response.json();
  }

  async getMeshingPresets(): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/meshing/algorithms/presets`);
    return response.json();
  }

  async validateMeshConfig(config: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/meshing/algorithms/validate-config`, {
      data: config,
    });
    return response.json();
  }

  async generateMesh(config: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/meshing/generate/advanced`, {
      data: config,
    });
    return response.json();
  }

  async getMeshStatus(meshId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/meshing/status/${meshId}`);
    return response.json();
  }

  // 物理组管理API
  async getPhysicalGroups(projectId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/meshing/physical-groups/${projectId}`);
    return response.json();
  }

  async createPhysicalGroup(projectId: string, groupData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/meshing/physical-groups/${projectId}`, {
      data: groupData,
    });
    return response.json();
  }

  async updatePhysicalGroup(projectId: string, groupId: string, groupData: any): Promise<any> {
    const response = await this.request.put(`${this.baseURL}/api/meshing/physical-groups/${projectId}/${groupId}`, {
      data: groupData,
    });
    return response.json();
  }

  async deletePhysicalGroup(projectId: string, groupId: string): Promise<any> {
    const response = await this.request.delete(`${this.baseURL}/api/meshing/physical-groups/${projectId}/${groupId}`);
    return response.json();
  }

  // 材料管理API
  async getMaterials(): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/materials`);
    return response.json();
  }

  async createMaterial(materialData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/materials`, {
      data: materialData,
    });
    return response.json();
  }

  async updateMaterial(materialId: string, materialData: any): Promise<any> {
    const response = await this.request.put(`${this.baseURL}/api/materials/${materialId}`, {
      data: materialData,
    });
    return response.json();
  }

  async deleteMaterial(materialId: string): Promise<any> {
    const response = await this.request.delete(`${this.baseURL}/api/materials/${materialId}`);
    return response.json();
  }

  // 场景管理API
  async getScenes(): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/scene`);
    return response.json();
  }

  async createScene(sceneData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/scene`, {
      data: sceneData,
    });
    return response.json();
  }

  async getScene(sceneId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/scene/${sceneId}`);
    return response.json();
  }

  async updateScene(sceneId: string, sceneData: any): Promise<any> {
    const response = await this.request.put(`${this.baseURL}/api/scene/${sceneId}`, {
      data: sceneData,
    });
    return response.json();
  }

  async deleteScene(sceneId: string): Promise<any> {
    const response = await this.request.delete(`${this.baseURL}/api/scene/${sceneId}`);
    return response.json();
  }

  // 地质模块API
  async getGeologyData(projectId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/geology/${projectId}`);
    return response.json();
  }

  async createSoilLayer(projectId: string, layerData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/geology/${projectId}/layers`, {
      data: layerData,
    });
    return response.json();
  }

  async createBorehole(projectId: string, boreholeData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/geology/${projectId}/boreholes`, {
      data: boreholeData,
    });
    return response.json();
  }

  // 基坑开挖API
  async getExcavationData(projectId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/excavation/${projectId}`);
    return response.json();
  }

  async createExcavationStage(projectId: string, stageData: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/excavation/${projectId}/stages`, {
      data: stageData,
    });
    return response.json();
  }

  // 分析计算API
  async startAnalysis(projectId: string, analysisConfig: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/computation/analysis/${projectId}`, {
      data: analysisConfig,
    });
    return response.json();
  }

  async getAnalysisStatus(analysisId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/computation/status/${analysisId}`);
    return response.json();
  }

  async getAnalysisResults(analysisId: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/computation/results/${analysisId}`);
    return response.json();
  }

  // 可视化API
  async getVisualizationData(projectId: string, dataType: string): Promise<any> {
    const response = await this.request.get(`${this.baseURL}/api/visualization/${projectId}/${dataType}`);
    return response.json();
  }

  async generateVisualization(config: any): Promise<any> {
    const response = await this.request.post(`${this.baseURL}/api/visualization/generate`, {
      data: config,
    });
    return response.json();
  }

  // 通用辅助方法
  async waitForAsyncOperation(
    checkFunction: () => Promise<any>,
    condition: (result: any) => boolean,
    timeout = 30000,
    interval = 1000
  ): Promise<any> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const result = await checkFunction();
        if (condition(result)) {
          return result;
        }
      } catch (error) {
        // 忽略错误，继续重试
      }
      
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`异步操作超时 (${timeout}ms)`);
  }

  // 批量操作
  async batchRequest(requests: Array<{ method: string; url: string; data?: any }>): Promise<any[]> {
    const promises = requests.map(req => {
      switch (req.method.toLowerCase()) {
        case 'get':
          return this.request.get(`${this.baseURL}${req.url}`);
        case 'post':
          return this.request.post(`${this.baseURL}${req.url}`, { data: req.data });
        case 'put':
          return this.request.put(`${this.baseURL}${req.url}`, { data: req.data });
        case 'delete':
          return this.request.delete(`${this.baseURL}${req.url}`);
        default:
          throw new Error(`不支持的HTTP方法: ${req.method}`);
      }
    });

    const responses = await Promise.all(promises);
    return Promise.all(responses.map(response => response.json()));
  }

  // 错误处理
  async expectApiError(apiCall: () => Promise<any>, expectedStatus?: number): Promise<any> {
    try {
      await apiCall();
      throw new Error('期望API调用失败，但实际成功了');
    } catch (error: any) {
      if (expectedStatus && error.status !== expectedStatus) {
        throw new Error(`期望状态码 ${expectedStatus}，但得到 ${error.status}`);
      }
      return error;
    }
  }

  // 性能测试
  async measureApiPerformance(apiCall: () => Promise<any>, iterations = 10): Promise<{
    averageTime: number;
    minTime: number;
    maxTime: number;
    successRate: number;
  }> {
    const times: number[] = [];
    let successCount = 0;

    for (let i = 0; i < iterations; i++) {
      const startTime = Date.now();
      try {
        await apiCall();
        successCount++;
      } catch {
        // 忽略错误，统计成功率
      }
      times.push(Date.now() - startTime);
    }

    return {
      averageTime: times.reduce((sum, time) => sum + time, 0) / times.length,
      minTime: Math.min(...times),
      maxTime: Math.max(...times),
      successRate: successCount / iterations,
    };
  }
}