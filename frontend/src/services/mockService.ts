/**
 * Mock服务 - 提供模拟的后端数据响应
 * 
 * 用于开发和测试阶段，模拟后端API响应
 */

import { ApiResponse } from './apiService';

// 基本的响应生成器
const createResponse = <T>(data: T, success = true, message = ''): ApiResponse<T> => {
  return {
    success,
    data,
    message,
  };
};

// 生成模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟网格生成
export interface MeshData {
  nodeCount: number;
  elementCount: number;
  meshQuality: number;
  meshFile: string;
}

// 模拟分析结果
export interface AnalysisResult {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  completedAt?: string;
  resultSummary?: {
    maxDisplacement: number;
    maxStress: number;
    safetyFactor: number;
  };
}

// Mock服务类
export class MockService {
  // 模拟转换为网格
  static async convertToMesh(modelData: any): Promise<ApiResponse<MeshData>> {
    await delay(1500); // 模拟网络延迟
    
    const meshData: MeshData = {
      nodeCount: Math.floor(Math.random() * 10000) + 5000,
      elementCount: Math.floor(Math.random() * 20000) + 10000,
      meshQuality: parseFloat((0.7 + Math.random() * 0.3).toFixed(2)),
      meshFile: 'excavation_mesh.vtk',
    };
    
    return createResponse<MeshData>(meshData);
  }

  // 模拟深基坑分析
  static async analyzeExcavation(excavationData: any): Promise<ApiResponse<AnalysisResult>> {
    await delay(2000); // 模拟处理时间
    
    const analysisId = `analysis-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const result: AnalysisResult = {
      id: analysisId,
      status: 'pending',
      progress: 0,
      createdAt: new Date().toISOString(),
    };
    
    return createResponse<AnalysisResult>(result);
  }

  // 模拟获取分析状态
  static async getAnalysisStatus(analysisId: string): Promise<ApiResponse<AnalysisResult>> {
    await delay(500);
    
    // 模拟不同的进度
    const progress = Math.min(100, Math.floor(Math.random() * 30) + 40);
    let status: 'pending' | 'processing' | 'completed' | 'failed' = 'processing';
    let resultSummary = undefined;
    let completedAt = undefined;
    
    if (progress >= 100) {
      status = 'completed';
      completedAt = new Date().toISOString();
      resultSummary = {
        maxDisplacement: parseFloat((Math.random() * 50).toFixed(2)),
        maxStress: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        safetyFactor: parseFloat((1 + Math.random() * 1.5).toFixed(2)),
      };
    }
    
    const result: AnalysisResult = {
      id: analysisId,
      status,
      progress,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      completedAt,
      resultSummary,
    };
    
    return createResponse<AnalysisResult>(result);
  }

  // 模拟获取分析结果
  static async getAnalysisResults(analysisId: string): Promise<ApiResponse<any>> {
    await delay(1000);
    
    // 模拟位移结果数据
    const displacements = Array.from({ length: 50 }, () => ({
      x: parseFloat((Math.random() * 30).toFixed(2)),
      y: parseFloat((Math.random() * 30).toFixed(2)),
      z: parseFloat((-Math.random() * 15).toFixed(2)),
      value: parseFloat((Math.random() * 0.05).toFixed(4)),
    }));
    
    // 模拟应力结果数据
    const stresses = Array.from({ length: 50 }, () => ({
      x: parseFloat((Math.random() * 30).toFixed(2)),
      y: parseFloat((Math.random() * 30).toFixed(2)),
      z: parseFloat((-Math.random() * 15).toFixed(2)),
      value: parseFloat((Math.random() * 200 + 50).toFixed(2)),
    }));
    
    const results = {
      analysisId,
      timestamp: new Date().toISOString(),
      displacements,
      stresses,
      summary: {
        maxDisplacement: parseFloat((Math.random() * 0.05 + 0.02).toFixed(4)),
        maxStress: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        safetyFactor: parseFloat((1 + Math.random() * 1.5).toFixed(2)),
      },
    };
    
    return createResponse(results);
  }

  // 模拟物理AI参数反演
  static async inverseParameters(monitoringData: any, modelSetup: any): Promise<ApiResponse<any>> {
    await delay(3000); // 模拟较长的处理时间
    
    // 模拟优化的土体参数
    const optimizedParameters = {
      soilLayers: [
        {
          id: 'layer1',
          name: modelSetup.soilLayers[0].name,
          optimizedParams: {
            cohesion: parseFloat((modelSetup.soilLayers[0].parameters.find((p:any) => p.name === '黏聚力').value * (0.8 + Math.random() * 0.4)).toFixed(2)),
            phi: parseFloat((modelSetup.soilLayers[0].parameters.find((p:any) => p.name === '内摩擦角').value * (0.9 + Math.random() * 0.2)).toFixed(2)),
            density: parseFloat((modelSetup.soilLayers[0].parameters.find((p:any) => p.name === '密度').value * (0.95 + Math.random() * 0.1)).toFixed(0)),
          }
        },
        {
          id: 'layer2',
          name: modelSetup.soilLayers[1].name,
          optimizedParams: {
            cohesion: parseFloat((modelSetup.soilLayers[1].parameters.find((p:any) => p.name === '黏聚力').value * (0.8 + Math.random() * 0.4)).toFixed(2)),
            phi: parseFloat((modelSetup.soilLayers[1].parameters.find((p:any) => p.name === '内摩擦角').value * (0.9 + Math.random() * 0.2)).toFixed(2)),
            density: parseFloat((modelSetup.soilLayers[1].parameters.find((p:any) => p.name === '密度').value * (0.95 + Math.random() * 0.1)).toFixed(0)),
          }
        }
      ],
      convergenceInfo: {
        iterations: Math.floor(Math.random() * 50) + 100,
        finalError: parseFloat((Math.random() * 0.01).toFixed(4)),
        convergenceRate: parseFloat((Math.random() * 0.05 + 0.95).toFixed(2)),
      }
    };
    
    return createResponse(optimizedParameters);
  }

  // 模拟项目数据
  static async getProjectList(): Promise<ApiResponse<any>> {
    await delay(800);
    
    const projects = Array.from({ length: 5 }, (_, index) => ({
      id: `project-${index + 1}`,
      name: `深基坑项目 ${index + 1}`,
      createdAt: new Date(Date.now() - index * 86400000).toISOString(),
      updatedAt: new Date(Date.now() - index * 43200000).toISOString(),
      thumbnail: `project${index + 1}.png`,
    }));
    
    return createResponse(projects);
  }
}

export default MockService; 