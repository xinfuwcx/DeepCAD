/**
 * @file 网格服务接口
 * @description 提供网格生成和管理的服务接口
 */

import * as THREE from 'three';
// @ts-ignore VTKLoader is not officially typed, but is part of three/examples
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader';
import { MeshSettings, MeshInfo } from '../core/store';

const API_BASE_URL = 'http://localhost:8000/api';

/**
 * 生成网格的请求参数
 */
interface GenerateMeshRequest {
  modelId: string;
  settings: MeshSettings;
}

/**
 * 生成网格的响应结果
 */
interface GenerateMeshResponse {
  meshId: string;
  elementCount: number;
  nodeCount: number;
  quality: number;
}

/**
 * 网格服务类
 */
class MeshService {
  /**
   * 生成网格
   * @param params 网格生成参数
   * @param onProgress 进度回调
   * @returns 生成的网格信息
   */
  async generateMesh(
    params: GenerateMeshRequest, 
    onProgress?: (progress: number) => void
  ): Promise<MeshInfo> {
    // 模拟网格生成过程
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 10;
        if (progress >= 100) {
          clearInterval(interval);
          progress = 100;
          
          // 模拟服务器响应
          const response: GenerateMeshResponse = {
            meshId: `mesh-${Date.now()}`,
            elementCount: Math.floor(Math.random() * 100000) + 10000,
            nodeCount: Math.floor(Math.random() * 30000) + 5000,
            quality: Math.random() * 0.2 + 0.8,
          };
          
          // 构建网格信息对象
          const meshInfo: MeshInfo = {
            id: response.meshId,
            name: `网格 ${new Date().toLocaleTimeString()}`,
            elementCount: response.elementCount,
            nodeCount: response.nodeCount,
            quality: response.quality,
            status: 'ready',
            visible: true,
            type: params.settings.advanced_settings.dimension,
            algorithm: params.settings.advanced_settings.algorithm,
            timestamp: new Date()
          };
          
          resolve(meshInfo);
        }
        
        if (onProgress) {
          onProgress(progress);
        }
      }, 300);
    });
  }
  
  /**
   * 获取网格详情
   * @param meshId 网格ID
   * @returns 网格详情
   */
  async getMeshDetails(meshId: string): Promise<any> {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: meshId,
          statistics: {
            elementCount: 45678,
            nodeCount: 12345,
            minQuality: 0.65,
            maxQuality: 0.98,
            avgQuality: 0.85
          },
          boundingBox: {
            min: { x: -100, y: -100, z: -30 },
            max: { x: 100, y: 100, z: 0 }
          }
        });
      }, 500);
    });
  }
  
  /**
   * 导出网格
   * @param meshId 网格ID
   * @param format 导出格式
   * @returns 导出状态
   */
  async exportMesh(meshId: string, format: 'vtk' | 'msh' | 'inp'): Promise<boolean> {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 1000);
    });
  }
  
  /**
   * 删除网格
   * @param meshId 网格ID
   * @returns 删除状态
   */
  async deleteMesh(meshId: string): Promise<boolean> {
    // 模拟API调用
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(true);
      }, 300);
    });
  }
}

// 导出单例
export const meshService = new MeshService();

/**
 * 从后端下载并解析VTK网格文件
 * @param filename - 后端返回的临时VTK文件名 (包含.vtk后缀)
 * @returns - 一个包含已加载几何体的Promise
 */
export async function loadVtkMesh(filename: string): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new VTKLoader();
    const url = `${API_BASE_URL}/analysis/results/${filename}`;

    console.log(`正在从 ${url} 加载网格...`);

    loader.load(
      url,
      (geometry: THREE.BufferGeometry) => {
        console.log("VTK网格加载并解析成功。");
        geometry.computeVertexNormals();
        resolve(geometry);
      },
      (progress) => {
        console.log(`正在加载: ${(progress.loaded / progress.total) * 100}%`);
      },
      (error) => {
        console.error("加载或解析VTK网格时发生错误:", error);
        reject(new Error(`无法从 ${url} 加载VTK文件。`));
      }
    );
  });
} 