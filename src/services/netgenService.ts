/**
 * Netgen网格服务
 * 
 * 负责将几何模型转换为有限元网格
 * 作为chili3d和Kratos之间的桥梁
 */

import axios from 'axios';
import { IChili3dInstance } from './chili3dService';
import { getApiBaseUrl } from '../../frontend/src/config/config';

// 网格质量参数
export interface MeshQualityParams {
  maxSize: number;       // 最大单元尺寸
  minSize: number;       // 最小单元尺寸
  grading: number;       // 网格渐变系数
  elementOrder: 1 | 2;   // 单元阶次(1=线性, 2=二次)
  optimize: boolean;     // 是否优化网格
  optimizeSteps: number; // 优化迭代次数
}

// 网格生成结果
export interface MeshGenerationResult {
  meshId: string;        // 网格ID
  nodes: number;         // 节点数量
  elements: number;      // 单元数量
  triangles: number;     // 三角形数量
  tetrahedra: number;    // 四面体数量
  quality: {             // 网格质量指标
    minQuality: number;  // 最小质量
    avgQuality: number;  // 平均质量
    maxAspectRatio: number; // 最大纵横比
  };
  boundaryElements: {    // 边界单元
    [key: string]: number; // 边界名称:单元数量
  };
}

// 网格服务接口
export interface INetgenService {
  // 从几何模型生成网格
  generateMesh(
    geometryId: string, 
    params: Partial<MeshQualityParams>
  ): Promise<MeshGenerationResult>;
  
  // 导出网格为Kratos格式
  exportToKratos(meshId: string): Promise<string>;
  
  // 优化现有网格
  optimizeMesh(meshId: string, steps: number): Promise<MeshGenerationResult>;
  
  // 获取网格统计信息
  getMeshStatistics(meshId: string): Promise<MeshGenerationResult>;
  
  // 创建边界条件组
  createBoundaryGroup(meshId: string, name: string, selector: string): Promise<string>;
  
  // 设置网格区域材料属性
  setMaterialProperty(meshId: string, regionName: string, property: string, value: any): Promise<void>;
}

// 默认网格参数
const defaultMeshParams: MeshQualityParams = {
  maxSize: 1.0,
  minSize: 0.1,
  grading: 0.3,
  elementOrder: 1,
  optimize: true,
  optimizeSteps: 3
};

/**
 * 创建Netgen网格服务
 */
export const createNetgenService = (chili3d: IChili3dInstance): INetgenService => {
  // API基础URL
  const apiBaseUrl = getApiBaseUrl();
  const netgenApiUrl = `${apiBaseUrl}/api/netgen`;
  
  // 检查是否使用模拟API
  const useMockApi = process.env.NODE_ENV === 'development' && 
                    (process.env.VITE_USE_MOCK_API === 'true' || true);
  
  // 网格缓存
  const meshCache: Record<string, MeshGenerationResult> = {};
  
  // 创建模拟网格结果
  const createMockMeshResult = (geometryId: string, quality: Partial<MeshQualityParams>): MeshGenerationResult => {
    // 根据几何复杂度和网格质量参数生成模拟结果
    const maxSize = quality.maxSize || defaultMeshParams.maxSize;
    const densityFactor = 1 / maxSize;
    
    // 生成随机但合理的网格统计数据
    const baseNodes = Math.floor(Math.random() * 1000) + 500;
    const baseElements = Math.floor(Math.random() * 2000) + 1000;
    
    const nodes = Math.floor(baseNodes * densityFactor);
    const tetrahedra = Math.floor(baseElements * densityFactor);
    const triangles = Math.floor(tetrahedra * 1.8);
    
    return {
      meshId: `mesh_${geometryId}`,
      nodes,
      elements: tetrahedra + triangles,
      triangles,
      tetrahedra,
      quality: {
        minQuality: 0.3 + Math.random() * 0.4,
        avgQuality: 0.6 + Math.random() * 0.3,
        maxAspectRatio: 3 + Math.random() * 5
      },
      boundaryElements: {
        'bottom': Math.floor(triangles * 0.2),
        'top': Math.floor(triangles * 0.2),
        'left': Math.floor(triangles * 0.15),
        'right': Math.floor(triangles * 0.15),
        'front': Math.floor(triangles * 0.15),
        'back': Math.floor(triangles * 0.15)
      }
    };
  };
  
  // 实际服务实现
  const service: INetgenService = {
    generateMesh: async (geometryId: string, params: Partial<MeshQualityParams>) => {
      console.log(`为几何体 ${geometryId} 生成网格`, params);
      
      // 合并默认参数和用户参数
      const meshParams = { ...defaultMeshParams, ...params };
      
      if (useMockApi) {
        // 模拟网格生成延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 创建模拟网格结果
        const result = createMockMeshResult(geometryId, meshParams);
        
        // 缓存结果
        meshCache[result.meshId] = result;
        
        return result;
      } else {
        try {
          // 首先将几何导出为适合Netgen的格式
          const geometryData = await chili3d.exportModel('step');
          
          // 创建FormData对象
          const formData = new FormData();
          const geometryBlob = new Blob([geometryData], { type: 'application/octet-stream' });
          formData.append('geometry', geometryBlob, `${geometryId}.step`);
          formData.append('params', JSON.stringify(meshParams));
          
          // 调用Netgen API生成网格
          const response = await axios.post(`${netgenApiUrl}/generate-mesh`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data'
            }
          });
          
          // 缓存结果
          meshCache[response.data.meshId] = response.data;
          
          return response.data;
        } catch (error) {
          console.error('网格生成失败:', error);
          throw new Error('网格生成失败');
        }
      }
    },
    
    exportToKratos: async (meshId: string) => {
      console.log(`导出网格 ${meshId} 为Kratos格式`);
      
      if (useMockApi) {
        // 模拟导出延迟
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // 返回模拟的Kratos模型ID
        return `kratos_model_${meshId}`;
      } else {
        try {
          // 调用Netgen API导出网格为Kratos格式
          const response = await axios.post(`${netgenApiUrl}/export-to-kratos/${meshId}`);
          return response.data.kratosModelId;
        } catch (error) {
          console.error('导出网格失败:', error);
          throw new Error('导出网格失败');
        }
      }
    },
    
    optimizeMesh: async (meshId: string, steps: number) => {
      console.log(`优化网格 ${meshId}，步数: ${steps}`);
      
      if (useMockApi) {
        // 模拟优化延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 获取缓存的网格结果
        const cachedMesh = meshCache[meshId];
        if (!cachedMesh) {
          throw new Error(`未找到网格 ${meshId}`);
        }
        
        // 创建改进的网格质量结果
        const improvedMesh: MeshGenerationResult = {
          ...cachedMesh,
          quality: {
            minQuality: Math.min(0.9, cachedMesh.quality.minQuality + 0.1),
            avgQuality: Math.min(0.95, cachedMesh.quality.avgQuality + 0.05),
            maxAspectRatio: Math.max(2.5, cachedMesh.quality.maxAspectRatio - 0.5)
          }
        };
        
        // 更新缓存
        meshCache[meshId] = improvedMesh;
        
        return improvedMesh;
      } else {
        try {
          // 调用Netgen API优化网格
          const response = await axios.post(`${netgenApiUrl}/optimize-mesh/${meshId}`, {
            steps
          });
          
          // 更新缓存
          meshCache[meshId] = response.data;
          
          return response.data;
        } catch (error) {
          console.error('网格优化失败:', error);
          throw new Error('网格优化失败');
        }
      }
    },
    
    getMeshStatistics: async (meshId: string) => {
      console.log(`获取网格 ${meshId} 统计信息`);
      
      if (useMockApi) {
        // 获取缓存的网格结果
        const cachedMesh = meshCache[meshId];
        if (!cachedMesh) {
          throw new Error(`未找到网格 ${meshId}`);
        }
        
        return cachedMesh;
      } else {
        try {
          // 调用Netgen API获取网格统计信息
          const response = await axios.get(`${netgenApiUrl}/mesh-statistics/${meshId}`);
          return response.data;
        } catch (error) {
          console.error('获取网格统计信息失败:', error);
          throw new Error('获取网格统计信息失败');
        }
      }
    },
    
    createBoundaryGroup: async (meshId: string, name: string, selector: string) => {
      console.log(`为网格 ${meshId} 创建边界组 ${name}，选择器: ${selector}`);
      
      if (useMockApi) {
        // 模拟创建边界组延迟
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 获取缓存的网格结果
        const cachedMesh = meshCache[meshId];
        if (!cachedMesh) {
          throw new Error(`未找到网格 ${meshId}`);
        }
        
        // 添加边界组
        cachedMesh.boundaryElements[name] = Math.floor(cachedMesh.triangles * 0.1);
        
        return name;
      } else {
        try {
          // 调用Netgen API创建边界组
          const response = await axios.post(`${netgenApiUrl}/create-boundary/${meshId}`, {
            name,
            selector
          });
          
          return response.data.boundaryName;
        } catch (error) {
          console.error('创建边界组失败:', error);
          throw new Error('创建边界组失败');
        }
      }
    },
    
    setMaterialProperty: async (meshId: string, regionName: string, property: string, value: any) => {
      console.log(`为网格 ${meshId} 区域 ${regionName} 设置材料属性 ${property}=${value}`);
      
      if (useMockApi) {
        // 模拟设置材料属性延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        
        // 检查网格是否存在
        if (!meshCache[meshId]) {
          throw new Error(`未找到网格 ${meshId}`);
        }
      } else {
        try {
          // 调用Netgen API设置材料属性
          await axios.post(`${netgenApiUrl}/set-material/${meshId}`, {
            region: regionName,
            property,
            value
          });
        } catch (error) {
          console.error('设置材料属性失败:', error);
          throw new Error('设置材料属性失败');
        }
      }
    }
  };
  
  return service;
}; 