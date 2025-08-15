/**
 * 材料API服务 - 连接后端材料库API
 */

import { MaterialDefinition, ConstitutiveModel } from '../interfaces/MaterialInterfaces';

export interface MaterialAPIResponse {
  status: string;
  count?: number;
  materials?: any[];
  message?: string;
  material_id?: string;
}

export interface MaterialStats {
  status: string;
  total_materials: number;
  type_distribution: Record<string, number>;
  last_updated: string;
}

/**
 * 材料API服务类
 */
export class MaterialAPIService {
  private baseURL: string = 'http://localhost:8000/api/materials';

  /**
   * 获取所有材料列表
   */
  async getMaterials(): Promise<any[]> {
    try {
      console.log('正在从后端获取材料列表...');
      const response = await fetch(`${this.baseURL}/`);
      console.log('后端API响应状态:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('后端API响应数据:', data);
      
      if (Array.isArray(data)) {
        console.log('成功获取材料数据，数量:', data.length);
        return data;
      }
      
      throw new Error('获取材料列表失败：响应格式错误');
    } catch (error) {
      console.error('获取材料列表失败:', error);
      throw error;
    }
  }

  /**
   * 添加材料
   */
  async addMaterial(material: any): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(material)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: MaterialAPIResponse = await response.json();
      
      if (data.status === 'success' && data.material_id) {
        return data.material_id;
      }
      
      throw new Error(data.message || '添加材料失败');
    } catch (error) {
      console.error('添加材料失败:', error);
      throw error;
    }
  }

  /**
   * 获取材料统计信息
   */
  async getStatistics(): Promise<MaterialStats> {
    try {
      const response = await fetch(`${this.baseURL}/stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: MaterialStats = await response.json();
      
      if (data.status === 'success') {
        return data;
      }
      
      throw new Error('获取统计信息失败');
    } catch (error) {
      console.error('获取统计信息失败:', error);
      throw error;
    }
  }

  /**
   * 清空所有材料 (仅用于测试)
   */
  async clearMaterials(): Promise<void> {
    try {
      const response = await fetch(`${this.baseURL}/clear`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data: MaterialAPIResponse = await response.json();
      
      if (data.status !== 'success') {
        throw new Error(data.message || '清空材料失败');
      }
    } catch (error) {
      console.error('清空材料失败:', error);
      throw error;
    }
  }

  /**
   * 转换后端材料数据格式为前端格式
   */
  convertFromBackend(backendMaterial: any): MaterialDefinition {
    console.log('MaterialAPIService: 转换材料数据:', backendMaterial);
    
    const params = backendMaterial.parameters || {};
    console.log('MaterialAPIService: 参数:', params);
    
    return {
      id: backendMaterial.id,
      name: backendMaterial.name,
      type: this.mapMaterialType(backendMaterial.type),
      constitutiveModel: ConstitutiveModel.LINEAR_ELASTIC,
      properties: {
        density: params.density || 2000,
        elasticModulus: params.elasticModulus || 20000,
        poissonRatio: params.poissonRatio || 0.25,
        // 根据材料类型添加特定属性
        ...this.getTypeSpecificPropertiesFromParams(backendMaterial)
      },
      description: `来自后端的${backendMaterial.name}材料`,
      standard: '系统默认',
      created: new Date(),
      modified: new Date(),
      version: '1.0.0',
      validated: true,
      reliability: 'standard',
      tags: [backendMaterial.type],
      category: '系统材料'
    };
  }

  /**
   * 转换前端材料数据格式为后端格式
   */
  convertToBackend(frontendMaterial: MaterialDefinition): any {
    return {
      name: frontendMaterial.name,
      material_type: this.mapMaterialTypeToBackend(frontendMaterial.type),
      constitutive_model: this.mapConstitutiveModelToBackend(frontendMaterial.constitutiveModel),
      properties: {
        elasticModulus: frontendMaterial.properties.elasticModulus,
        poissonRatio: frontendMaterial.properties.poissonRatio,
        density: frontendMaterial.properties.density,
        ...this.getBackendSpecificProperties(frontendMaterial)
      },
      description: frontendMaterial.description,
      source: frontendMaterial.standard,
      category: frontendMaterial.category,
      tags: frontendMaterial.tags,
      reliability: frontendMaterial.reliability
    };
  }

  private mapMaterialType(backendType: string): any {
    const typeMap: Record<string, any> = {
      'soil': 'SOIL',
      'concrete': 'CONCRETE', 
      'steel': 'STEEL'
    };
    return typeMap[backendType] || 'SOIL';
  }

  private mapMaterialTypeToBackend(frontendType: any): string {
    const typeMap: Record<any, string> = {
      'SOIL': 'soil',
      'CONCRETE': 'concrete',
      'STEEL': 'steel'
    };
    return typeMap[frontendType] || 'soil';
  }

  private mapConstitutiveModel(backendModel: string): any {
    const modelMap: Record<string, any> = {
      'MOHR_COULOMB': 'MOHR_COULOMB',
      'LINEAR_ELASTIC': 'LINEAR_ELASTIC'
    };
    return modelMap[backendModel] || 'MOHR_COULOMB';
  }

  private mapConstitutiveModelToBackend(frontendModel: any): string {
    const modelMap: Record<any, string> = {
      'MOHR_COULOMB': 'MOHR_COULOMB',
      'LINEAR_ELASTIC': 'LINEAR_ELASTIC'
    };
    return modelMap[frontendModel] || 'MOHR_COULOMB';
  }

  private getTypeSpecificProperties(backendMaterial: any): any {
    const props = backendMaterial.properties;
    
    switch (backendMaterial.material_type) {
      case 'soil':
        return {
          cohesion: props.cohesion || 0,
          frictionAngle: props.frictionAngle || 0,
          permeability: props.permeability || 1e-7
        };
      
      case 'concrete':
        return {
          compressiveStrength: props.compressiveStrength || 30e6,
          tensileStrength: props.tensileStrength || 3e6
        };
      
      case 'steel':
        return {
          yieldStrength: props.yieldStrength || 355e6,
          ultimateStrength: props.ultimateStrength || 490e6
        };
      
      default:
        return {};
    }
  }

  private getTypeSpecificPropertiesFromParams(backendMaterial: any): any {
    const params = backendMaterial.parameters || {};
    
    switch (backendMaterial.type) {
      case 'soil':
        return {
          cohesion: params.cohesion || 0,
          frictionAngle: params.frictionAngle || 30,
          permeability: params.permeability || 1e-7
        };
      
      case 'concrete':
        return {
          compressiveStrength: params.compressiveStrength || 30e6,
          tensileStrength: params.tensileStrength || 3e6
        };
      
      case 'steel':
        return {
          yieldStrength: params.yieldStrength || 355e6,
          ultimateStrength: params.ultimateStrength || 490e6
        };
      
      default:
        return {};
    }
  }

  private getBackendSpecificProperties(frontendMaterial: MaterialDefinition): any {
    const props = frontendMaterial.properties;
    
    switch (this.mapMaterialTypeToBackend(frontendMaterial.type)) {
      case 'soil':
        return {
          cohesion: props.cohesion || 0,
          frictionAngle: props.frictionAngle || 0,
          permeability: props.permeability || 1e-7
        };
      
      case 'concrete':
        return {
          compressiveStrength: props.compressiveStrength || 30e6,
          tensileStrength: props.tensileStrength || 3e6
        };
      
      case 'steel':
        return {
          yieldStrength: props.yieldStrength || 355e6,
          ultimateStrength: props.ultimateStrength || 490e6
        };
      
      default:
        return {};
    }
  }
}

// 单例导出
export const materialAPIService = new MaterialAPIService();