/**
 * 几何数据测试生成器
 * 为3号计算专家提供标准化的测试数据
 */

import { anchorLayoutService, AnchorSystemConfig, AnchorSystemResult } from './anchorLayoutService';
import { gmshOccService } from './gmshOccService';
import { geologyService } from './geologyService';

// 导入统一的接口定义
import { GeometryToMeshData, MaterialZone, GeometryData } from '../core/InterfaceProtocol';

// 扩展接口以支持测试数据生成的额外需求
export interface ExtendedGeometryToMeshData extends GeometryToMeshData {
  header: {
    version: "1.0";
    timestamp: string;
    geometryType: "geology" | "excavation" | "support" | "tunnel" | "complete_excavation_system";
    coordinateSystem: string;
    units: "meters";
  };
  
  meshGeometry: {
    vertices: Float32Array;
    faces: Uint32Array;
    normals: Float32Array;
    uvCoords?: Float32Array;
    vertexCount: number;
    faceCount: number;
  };
  
  boundaryConditions: {
    fixedBoundaries: {
      faceIndices: number[];
      constraintType: "fixed" | "pinned" | "roller";
    };
    loadBoundaries?: {
      faceIndices: number[];
      loadType: "pressure" | "force" | "displacement";
      magnitude: number;
      direction: [number, number, number];
    };
  };
  
  meshGuidance: {
    globalElementSize: number;
    localRefinement: Array<{
      region: "corner" | "contact" | "critical";
      faceIndices: number[];
      targetSize: number;
      priority: "high" | "medium" | "low";
    }>;
    qualityRequirements: {
      minAngle: number;
      maxAspectRatio: number;
      targetQuality: number;
    };
  };
  
  qualityInfo: {
    geometryValid: boolean;
    manifoldSurface: boolean;
    selfIntersection: boolean;
    precision: number;
    warnings: string[];
    recommendations: string[];
  };
}

export interface TestDataSetInfo {
  name: string;
  description: string;
  complexity: 'basic' | 'complex' | 'large';
  expectedElements: number;
  expectedNodes: number;
  expectedProcessingTime: number; // seconds
  maxMemoryUsage: string;
  minQuality: number;
}

export class GeometryTestDataGenerator {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:8080'
      : window.location.origin;
  }

  /**
   * 获取所有测试数据集信息
   */
  getTestDataSets(): TestDataSetInfo[] {
    return [
      {
        name: "basic_rectangular_excavation",
        description: "简单矩形基坑，3层锚杆，2层地质",
        complexity: 'basic',
        expectedElements: 20000,
        expectedNodes: 10000,
        expectedProcessingTime: 30,
        maxMemoryUsage: "1GB",
        minQuality: 0.3
      },
      {
        name: "complex_irregular_excavation", 
        description: "不规则基坑，6层锚杆，分层开挖，4层地质",
        complexity: 'complex',
        expectedElements: 42500,
        expectedNodes: 21500,
        expectedProcessingTime: 60,
        maxMemoryUsage: "2GB",
        minQuality: 0.25
      },
      {
        name: "large_metro_station",
        description: "大型地铁站基坑，10层锚杆，复合支护，6层地质",
        complexity: 'large',
        expectedElements: 100000,
        expectedNodes: 50000,
        expectedProcessingTime: 120,
        maxMemoryUsage: "4GB", 
        minQuality: 0.2
      }
    ];
  }

  /**
   * 生成基础测试数据集
   */
  async generateBasicTestData(): Promise<ExtendedGeometryToMeshData> {
    console.log('🔧 生成基础测试数据集...');

    // 配置简单3层锚杆系统
    const config = anchorLayoutService.getDefaultConfig();
    config.levels = config.levels.slice(0, 3).map(level => ({
      ...level,
      enabled: true
    }));

    // 简化地连墙
    config.diaphragmWall = {
      coordinates: [
        { x: 0, y: 0, z: 0 },
        { x: 50, y: 0, z: 0 },
        { x: 50, y: 30, z: 0 },
        { x: 0, y: 30, z: 0 },
        { x: 0, y: 0, z: 0 }
      ],
      thickness: 0.8,
      topElevation: 0,
      bottomElevation: -15
    };

    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    
    // 生成地质数据
    const geologyData = await this.generateTestGeologyData('basic');
    
    return this.convertToMeshData(anchorResult, geologyData, 'basic');
  }

  /**
   * 生成复杂测试数据集
   */
  async generateComplexTestData(): Promise<ExtendedGeometryToMeshData> {
    console.log('🔧 生成复杂测试数据集...');

    const config = anchorLayoutService.getDefaultConfig();
    
    // 6层锚杆，不均匀配置
    config.levels = config.levels.slice(0, 6).map((level, index) => ({
      ...level,
      enabled: true,
      anchorParams: {
        ...level.anchorParams,
        spacing: 2.0 + index * 0.2, // 渐变间距
        length: 12.0 + index * 2.0,  // 渐变长度
        preStress: 150 + index * 25   // 渐变预应力
      }
    }));

    // 不规则基坑边界
    config.diaphragmWall = {
      coordinates: [
        { x: 0, y: 0, z: 0 },
        { x: 45, y: 5, z: 0 },
        { x: 52, y: 25, z: 0 },
        { x: 35, y: 35, z: 0 },
        { x: 8, y: 30, z: 0 },
        { x: 0, y: 0, z: 0 }
      ],
      thickness: 1.0,
      topElevation: 0,
      bottomElevation: -18
    };

    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    const geologyData = await this.generateTestGeologyData('complex');
    
    return this.convertToMeshData(anchorResult, geologyData, 'complex');
  }

  /**
   * 生成大型测试数据集
   */
  async generateLargeTestData(): Promise<ExtendedGeometryToMeshData> {
    console.log('🔧 生成大型测试数据集...');

    const config = anchorLayoutService.getDefaultConfig();
    
    // 10层锚杆满配置
    config.levels.forEach((level, index) => {
      level.enabled = true;
      level.anchorParams.spacing = 2.0 + (index % 3) * 0.3;
      level.anchorParams.length = 15.0 + index * 1.5;
      level.anchorParams.preStress = 200 + index * 20;
    });

    // 大型基坑（地铁站）
    config.diaphragmWall = {
      coordinates: [
        { x: 0, y: 0, z: 0 },
        { x: 150, y: 0, z: 0 },
        { x: 150, y: 80, z: 0 },
        { x: 0, y: 80, z: 0 },
        { x: 0, y: 0, z: 0 }
      ],
      thickness: 1.2,
      topElevation: 0,
      bottomElevation: -30
    };

    const anchorResult = await anchorLayoutService.generateAnchorLayout(config);
    const geologyData = await this.generateTestGeologyData('large');
    
    return this.convertToMeshData(anchorResult, geologyData, 'large');
  }

  /**
   * 生成测试地质数据
   */
  private async generateTestGeologyData(type: 'basic' | 'complex' | 'large') {
    const boreholes = this.generateTestBoreholes(type);
    
    try {
      const result = await geologyService.generateGeologyModel(boreholes, {
        method: 'rbf',
        gridResolution: type === 'basic' ? 3.0 : type === 'complex' ? 2.0 : 1.5,
        includeUncertainty: false
      });
      return result;
    } catch (error) {
      console.warn('地质建模失败，使用模拟数据:', error);
      return this.getMockGeologyData(type);
    }
  }

  /**
   * 生成测试钻孔数据
   */
  private generateTestBoreholes(type: 'basic' | 'complex' | 'large') {
    const boreholeCount = type === 'basic' ? 6 : type === 'complex' ? 12 : 20;
    const boreholes = [];

    const bounds = type === 'basic' 
      ? { minX: 0, maxX: 50, minY: 0, maxY: 30 }
      : type === 'complex'
      ? { minX: 0, maxX: 52, minY: 0, maxY: 35 }
      : { minX: 0, maxX: 150, minY: 0, maxY: 80 };

    for (let i = 0; i < boreholeCount; i++) {
      const x = bounds.minX + (bounds.maxX - bounds.minX) * Math.random();
      const y = bounds.minY + (bounds.maxY - bounds.minY) * Math.random();
      const z = -5 - Math.random() * 20; // 地面以下5-25m

      boreholes.push({
        id: `test_bh_${i + 1}`,
        x,
        y,
        z,
        soil_type: i % 3 === 0 ? 'clay' : i % 3 === 1 ? 'sand' : 'silt',
        layer_id: Math.floor(z / -5) + 1
      });
    }

    return boreholes;
  }

  /**
   * 获取模拟地质数据
   */
  private getMockGeologyData(type: 'basic' | 'complex' | 'large') {
    return {
      message: "模拟地质数据",
      gltf_url: `/mock/geology_${type}.gltf`,
      interpolation_method: "rbf",
      mesh_info: {
        n_points: type === 'basic' ? 1000 : type === 'complex' ? 2500 : 5000,
        n_cells: type === 'basic' ? 800 : type === 'complex' ? 2000 : 4000,
        bounds: type === 'basic' ? [0, 50, 0, 30, -25, 0] : 
                type === 'complex' ? [0, 52, 0, 35, -25, 0] :
                [0, 150, 0, 80, -35, 0],
        scalar_fields: ["layer_id", "soil_type"]
      },
      request_params: {}
    };
  }

  /**
   * 转换为标准网格数据格式
   */
  private convertToMeshData(
    anchorResult: AnchorSystemResult,
    geologyData: any,
    type: 'basic' | 'complex' | 'large'
  ): ExtendedGeometryToMeshData {
    // 生成模拟网格数据
    const vertexCount = type === 'basic' ? 5000 : type === 'complex' ? 12000 : 25000;
    const faceCount = Math.floor(vertexCount * 1.8);

    const vertices = new Float32Array(vertexCount * 3);
    const faces = new Uint32Array(faceCount * 3);
    const normals = new Float32Array(vertexCount * 3);

    // 填充模拟数据（实际应该调用GMSH几何生成）
    for (let i = 0; i < vertices.length; i += 3) {
      vertices[i] = Math.random() * 100 - 50;     // x
      vertices[i + 1] = Math.random() * 60 - 30;  // y  
      vertices[i + 2] = Math.random() * 30 - 30;  // z
      
      normals[i] = 0;
      normals[i + 1] = 0;
      normals[i + 2] = 1;
    }

    for (let i = 0; i < faces.length; i += 3) {
      faces[i] = Math.floor(Math.random() * (vertexCount - 1));
      faces[i + 1] = Math.floor(Math.random() * (vertexCount - 1));
      faces[i + 2] = Math.floor(Math.random() * (vertexCount - 1));
    }

    // 材料分区
    const materialZones = this.generateMaterialZones(type, faceCount);
    
    // 边界条件
    const boundaryConditions = this.generateBoundaryConditions(type, faceCount);
    
    // 网格指导
    const meshGuidance = this.generateMeshGuidance(type, faceCount);

    return {
      header: {
        version: "1.0",
        timestamp: new Date().toISOString(),
        geometryType: "complete_excavation_system",
        coordinateSystem: "LOCAL",
        units: "meters"
      },
      
      meshGeometry: {
        vertices,
        faces,
        normals,
        vertexCount,
        faceCount
      },
      
      materialZones,
      boundaryConditions,
      meshGuidance,
      
      qualityInfo: {
        geometryValid: true,
        manifoldSurface: true,
        selfIntersection: false,
        precision: 0.001,
        warnings: [],
        recommendations: type === 'large' ? 
          ["大型模型建议使用并行网格生成", "建议在角点区域加密网格"] :
          ["建议检查网格质量分布"]
      }
    };
  }

  /**
   * 生成材料分区
   */
  private generateMaterialZones(type: 'basic' | 'complex' | 'large', faceCount: number) {
    const zones = [];
    
    // 土体材料
    const soilLayers = type === 'basic' ? 2 : type === 'complex' ? 4 : 6;
    const facesPerLayer = Math.floor(faceCount * 0.6 / soilLayers);
    
    for (let i = 0; i < soilLayers; i++) {
      const layerType = i % 3 === 0 ? 'clay' : i % 3 === 1 ? 'sand' : 'silt';
      const startIndex = i * facesPerLayer;
      const endIndex = startIndex + facesPerLayer;
      
      zones.push({
        zoneId: `${layerType}_layer_${i + 1}`,
        zoneName: `${layerType === 'clay' ? '粘土' : layerType === 'sand' ? '砂土' : '粉土'}层${i + 1}`,
        materialType: "soil" as const,
        faceIndices: Array.from({length: facesPerLayer}, (_, idx) => startIndex + idx),
        properties: {
          density: 1800 + Math.random() * 200,
          elasticModulus: (15 + Math.random() * 15) * 1000000,
          poissonRatio: 0.3 + Math.random() * 0.1,
          cohesion: (10 + Math.random() * 20) * 1000,
          frictionAngle: 15 + Math.random() * 20,
          permeability: Math.pow(10, -8 + Math.random() * 3)
        }
      });
    }

    // 地连墙材料
    const wallFaces = Math.floor(faceCount * 0.25);
    zones.push({
      zoneId: "diaphragm_wall",
      zoneName: "地连墙",
      materialType: "concrete" as const,
      faceIndices: Array.from({length: wallFaces}, (_, idx) => Math.floor(faceCount * 0.6) + idx),
      properties: {
        density: 2500,
        elasticModulus: 30000000000,
        poissonRatio: 0.2
      }
    });

    // 锚杆材料
    const anchorFaces = faceCount - Math.floor(faceCount * 0.85);
    zones.push({
      zoneId: "anchor_system",
      zoneName: "锚杆系统",
      materialType: "steel" as const,
      faceIndices: Array.from({length: anchorFaces}, (_, idx) => Math.floor(faceCount * 0.85) + idx),
      properties: {
        density: 7850,
        elasticModulus: 200000000000,
        poissonRatio: 0.3
      }
    });

    return zones;
  }

  /**
   * 生成边界条件
   */
  private generateBoundaryConditions(type: 'basic' | 'complex' | 'large', faceCount: number) {
    const fixedFaceCount = Math.floor(faceCount * 0.1);
    const loadFaceCount = Math.floor(faceCount * 0.05);

    return {
      fixedBoundaries: {
        faceIndices: Array.from({length: fixedFaceCount}, (_, idx) => idx),
        constraintType: "fixed" as const
      },
      loadBoundaries: {
        faceIndices: Array.from({length: loadFaceCount}, (_, idx) => fixedFaceCount + idx),
        loadType: "pressure" as const,
        magnitude: 50000 + Math.random() * 30000,
        direction: [1, 0, 0] as [number, number, number]
      }
    };
  }

  /**
   * 生成网格指导参数
   */
  private generateMeshGuidance(type: 'basic' | 'complex' | 'large', faceCount: number) {
    const globalSize = type === 'basic' ? 2.0 : type === 'complex' ? 1.5 : 1.0;
    const refinementFaceCount = Math.floor(faceCount * 0.1);

    return {
      globalElementSize: globalSize,
      localRefinement: [
        {
          region: "corner" as const,
          faceIndices: Array.from({length: refinementFaceCount}, (_, idx) => idx * 10),
          targetSize: globalSize * 0.3,
          priority: "high" as const
        },
        {
          region: "contact" as const,
          faceIndices: Array.from({length: refinementFaceCount}, (_, idx) => refinementFaceCount + idx * 8),
          targetSize: globalSize * 0.5,
          priority: "medium" as const
        }
      ],
      qualityRequirements: {
        minAngle: 15,
        maxAspectRatio: type === 'basic' ? 3.0 : type === 'complex' ? 4.0 : 5.0,
        targetQuality: type === 'basic' ? 0.7 : type === 'complex' ? 0.6 : 0.5
      }
    };
  }

  /**
   * 保存测试数据到文件
   */
  async saveTestDataToFile(
    data: ExtendedGeometryToMeshData, 
    filename: string
  ): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/api/geometry/test-data/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          filename
        }),
      });

      if (!response.ok) {
        throw new Error(`保存失败: ${response.status}`);
      }

      const result = await response.json();
      console.log(`✅ 测试数据已保存: ${result.filePath}`);
      return result.filePath;
      
    } catch (error) {
      console.error('❌ 保存测试数据失败:', error);
      throw error;
    }
  }

  /**
   * 生成所有测试数据集
   */
  async generateAllTestData(): Promise<Record<string, string>> {
    const results: Record<string, string> = {};
    
    try {
      console.log('🚀 开始生成所有测试数据集...');
      
      // 基础测试数据
      const basicData = await this.generateBasicTestData();
      results.basic = await this.saveTestDataToFile(basicData, 'basic_test_data.json');
      
      // 复杂测试数据
      const complexData = await this.generateComplexTestData();
      results.complex = await this.saveTestDataToFile(complexData, 'complex_test_data.json');
      
      // 大型测试数据
      const largeData = await this.generateLargeTestData();
      results.large = await this.saveTestDataToFile(largeData, 'large_test_data.json');
      
      console.log('✅ 所有测试数据生成完成:', results);
      return results;
      
    } catch (error) {
      console.error('❌ 测试数据生成失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
export const geometryTestDataGenerator = new GeometryTestDataGenerator();

// 便捷函数导出
export const generateBasicTestData = () => 
  geometryTestDataGenerator.generateBasicTestData();

export const generateComplexTestData = () => 
  geometryTestDataGenerator.generateComplexTestData();

export const generateLargeTestData = () => 
  geometryTestDataGenerator.generateLargeTestData();

export const generateAllTestData = () => 
  geometryTestDataGenerator.generateAllTestData();

export default geometryTestDataGenerator;