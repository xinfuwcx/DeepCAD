/**
 * 几何测试数据生成器
 * 为3号计算专家生成标准化测试用例
 */

import { 
  AnchorSystemConfig, 
  generateTenLayerAnchorSystem,
  getDefaultAnchorConfig 
} from '../frontend/src/services/anchorLayoutService';

import { dxfService } from '../frontend/src/services/dxfService';
import { geologyService } from '../frontend/src/services/geologyService';

export interface TestDataGeneratorConfig {
  outputPath: string;
  testCases: string[];
  format: 'json' | 'binary' | 'both';
  includeVisualization: boolean;
}

export class GeometryTestDataGenerator {
  private outputPath: string;

  constructor(config: TestDataGeneratorConfig) {
    this.outputPath = config.outputPath;
  }

  /**
   * 生成所有测试用例
   */
  async generateAllTestCases(): Promise<void> {
    console.log('🔧 开始生成几何测试数据...');

    try {
      // 1. 简单矩形基坑
      await this.generateSimpleRectangularPit();
      
      // 2. 复杂锚杆系统
      await this.generateComplexAnchorSystem();
      
      // 3. 10层锚杆极限场景
      await this.generateExtremeTenLayerScene();
      
      // 4. DXF导入测试数据
      await this.generateDXFTestData();
      
      // 5. 地质建模测试数据
      await this.generateGeologyTestData();

      console.log('✅ 所有测试数据生成完成！');
      
    } catch (error) {
      console.error('❌ 测试数据生成失败:', error);
      throw error;
    }
  }

  /**
   * 生成简单矩形基坑测试数据
   */
  private async generateSimpleRectangularPit(): Promise<void> {
    const testData = {
      testCase: 'simple_rectangular_pit',
      geometry: {
        type: 'rectangular',
        dimensions: { width: 50, length: 30, depth: 15 },
        position: { x: 0, y: 0, z: 0 }
      },
      meshRequirements: {
        globalSize: 2.0,
        minQuality: 0.6,
        maxElements: 2000
      },
      expectedResults: {
        processingTime: 20, // 秒
        elementCount: 1800,
        nodeCount: 500
      }
    };

    await this.writeTestData('simple_rectangular_pit.json', testData);
  }

  /**
   * 生成复杂锚杆系统测试数据
   */
  private async generateComplexAnchorSystem(): Promise<void> {
    const config = getDefaultAnchorConfig();
    
    // 启用6层锚杆
    config.levels.forEach((level, index) => {
      level.enabled = index < 6;
    });

    const anchorSystem = await generateTenLayerAnchorSystem(config);

    const testData = {
      testCase: 'complex_anchor_system',
      anchorSystem,
      meshRequirements: {
        globalSize: 2.5,
        refinement: [
          { region: 'anchor_connections', size: 0.8 },
          { region: 'wale_beams', size: 1.0 }
        ],
        minQuality: 0.5,
        maxElements: 12000
      },
      expectedResults: {
        processingTime: 90,
        elementCount: 10000,
        nodeCount: 2500
      }
    };

    await this.writeTestData('complex_anchor_system.json', testData);
  }

  /**
   * 生成10层锚杆极限场景
   */
  private async generateExtremeTenLayerScene(): Promise<void> {
    const config = getDefaultAnchorConfig();
    
    // 启用所有10层
    config.levels.forEach(level => {
      level.enabled = true;
    });

    // 增加复杂度
    config.diaphragmWall.coordinates = [
      { x: 0, y: 0, z: 0 },
      { x: 100, y: 0, z: 0 },
      { x: 120, y: 40, z: 0 },
      { x: 80, y: 80, z: 0 },
      { x: 20, y: 90, z: 0 },
      { x: -10, y: 50, z: 0 },
      { x: 0, y: 0, z: 0 }
    ];

    const anchorSystem = await generateTenLayerAnchorSystem(config);

    const testData = {
      testCase: 'extreme_ten_layer_scene',
      description: '10层锚杆 + 大型不规则基坑 + 隧道穿越',
      anchorSystem,
      tunnel: {
        diameter: 6.0,
        length: 100.0,
        inclination: 3.5,
        position: { x: 50, y: 45, z: -12 }
      },
      meshRequirements: {
        globalSize: 3.0,
        refinement: [
          { region: 'tunnel_intersection', size: 0.5 },
          { region: 'anchor_dense_area', size: 1.0 }
        ],
        minQuality: 0.4,
        maxElements: 50000
      },
      performanceTest: {
        maxProcessingTime: 300,
        maxMemoryUsage: '8GB',
        expectedElementCount: 45000,
        expectedNodeCount: 15000
      }
    };

    await this.writeTestData('extreme_ten_layer_scene.json', testData);
  }

  /**
   * 生成DXF测试数据
   */
  private async generateDXFTestData(): Promise<void> {
    const testData = {
      testCase: 'dxf_import_test',
      description: 'DXF文件导入和边界识别测试',
      supportedVersions: dxfService.getSupportedVersions(),
      coordinateSystems: dxfService.getSupportedCoordinateSystems(),
      testFiles: [
        {
          name: 'simple_boundary.dxf',
          version: '2026',
          entities: ['LINE', 'POLYLINE'],
          expectedBoundaries: 1,
          expectedArea: 1500
        },
        {
          name: 'complex_irregular.dxf', 
          version: '2007',
          entities: ['LINE', 'POLYLINE', 'ARC'],
          expectedBoundaries: 1,
          expectedHoles: 2,
          expectedArea: 3200
        }
      ],
      validationCriteria: {
        boundaryTolerance: 1.0, // mm
        maxProcessingTime: 30,  // 秒
        minBoundaryQuality: 0.8
      }
    };

    await this.writeTestData('dxf_import_test.json', testData);
  }

  /**
   * 生成地质建模测试数据
   */
  private async generateGeologyTestData(): Promise<void> {
    const testBoreholes = [
      { id: 'BH001', x: 10, y: 10, z: -2.5, soil_type: 'clay', layer_id: 1 },
      { id: 'BH002', x: 40, y: 10, z: -3.0, soil_type: 'sand', layer_id: 2 },
      { id: 'BH003', x: 25, y: 25, z: -2.8, soil_type: 'clay', layer_id: 1 },
      { id: 'BH004', x: 10, y: 40, z: -3.2, soil_type: 'rock', layer_id: 3 },
      { id: 'BH005', x: 40, y: 40, z: -2.9, soil_type: 'sand', layer_id: 2 }
    ];

    const testData = {
      testCase: 'geology_modeling_test',
      description: 'RBF地质插值建模测试',
      boreholes: testBoreholes,
      interpolationConfig: {
        method: 'rbf',
        gridResolution: 2.0,
        domainExpansion: [20, 20],
        qualityControl: {
          crossValidation: true,
          uncertaintyAnalysis: false
        }
      },
      expectedResults: {
        gltfUrl: '/api/geology/export/test_geology_model.gltf',
        materialZones: 3,
        interpolationQuality: 0.85,
        processingTime: 45
      },
      validationCriteria: {
        minInterpolationQuality: 0.7,
        maxProcessingTime: 60,
        requiredMaterialZones: ['clay', 'sand', 'rock']
      }
    };

    await this.writeTestData('geology_modeling_test.json', testData);
  }

  /**
   * 生成性能基准测试
   */
  async generatePerformanceBenchmarks(): Promise<void> {
    const benchmarks = {
      testSuite: 'geometry_performance_benchmarks',
      timestamp: new Date().toISOString(),
      testCases: [
        {
          name: 'small_scale',
          description: '小规模几何 (<1000元素)',
          parameters: {
            elementCount: 500,
            nodeCount: 150,
            complexity: 'low'
          },
          targets: {
            processingTime: 5,    // 秒
            memoryUsage: '100MB',
            qualityScore: 0.9
          }
        },
        {
          name: 'medium_scale',
          description: '中规模几何 (1000-10000元素)',
          parameters: {
            elementCount: 5000,
            nodeCount: 1500,
            complexity: 'medium'
          },
          targets: {
            processingTime: 30,
            memoryUsage: '500MB',
            qualityScore: 0.8
          }
        },
        {
          name: 'large_scale',
          description: '大规模几何 (>10000元素)',
          parameters: {
            elementCount: 25000,
            nodeCount: 8000,
            complexity: 'high'
          },
          targets: {
            processingTime: 180,
            memoryUsage: '2GB',
            qualityScore: 0.7
          }
        }
      ]
    };

    await this.writeTestData('performance_benchmarks.json', benchmarks);
  }

  /**
   * 写入测试数据文件
   */
  private async writeTestData(filename: string, data: any): Promise<void> {
    const fs = require('fs').promises;
    const path = require('path');
    
    const filePath = path.join(this.outputPath, filename);
    const jsonData = JSON.stringify(data, null, 2);
    
    await fs.writeFile(filePath, jsonData, 'utf8');
    console.log(`✅ 生成测试数据: ${filename}`);
  }

  /**
   * 生成二进制网格数据
   */
  async generateBinaryMeshData(geometryData: any): Promise<Buffer> {
    const vertices = new Float32Array(geometryData.vertices);
    const faces = new Uint32Array(geometryData.faces);
    const normals = new Float32Array(geometryData.normals);

    // 创建二进制缓冲区
    const vertexBuffer = Buffer.from(vertices.buffer);
    const faceBuffer = Buffer.from(faces.buffer);
    const normalBuffer = Buffer.from(normals.buffer);

    // 合并所有缓冲区
    const header = Buffer.from(JSON.stringify({
      vertexCount: vertices.length / 3,
      faceCount: faces.length / 3,
      hasNormals: true,
      vertexOffset: 0,
      faceOffset: vertexBuffer.length,
      normalOffset: vertexBuffer.length + faceBuffer.length
    }));

    return Buffer.concat([
      Buffer.from([header.length]), // 头部长度
      header,
      vertexBuffer,
      faceBuffer,
      normalBuffer
    ]);
  }
}

// 导出便捷函数
export const generateTestDataForMeshing = async () => {
  const generator = new GeometryTestDataGenerator({
    outputPath: 'E:\\DeepCAD\\test_data\\geometry',
    testCases: ['all'],
    format: 'both',
    includeVisualization: true
  });

  await generator.generateAllTestCases();
  await generator.generatePerformanceBenchmarks();
};

export default GeometryTestDataGenerator;