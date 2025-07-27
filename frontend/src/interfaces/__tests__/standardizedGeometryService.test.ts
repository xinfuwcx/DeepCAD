/**
 * 标准化几何服务单元测试
 * DeepCAD Deep Excavation CAE Platform - Standardized Geometry Service Tests
 * 
 * 作者：2号几何专家
 * 测试覆盖：几何处理、格式转换、数据验证、性能优化
 */

import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import {
  StandardizedGeometryService,
  GeometryProcessor,
  GeometryValidator,
  GeometryConverter,
  GeometryOptimizer,
  type GeometryData,
  type GeometryValidationResult,
  type GeometryFormat,
  type ProcessingOptions,
  type OptimizationSettings
} from '../standardizedGeometryService';

describe('StandardizedGeometryService', () => {
  let geometryService: StandardizedGeometryService;
  let mockGeometryData: GeometryData;

  beforeEach(() => {
    geometryService = StandardizedGeometryService.getInstance();
    
    mockGeometryData = {
      id: 'test-geometry-001',
      name: 'Test Excavation Geometry',
      format: 'DeepCAD',
      vertices: new Float32Array([
        0, 0, 0,    // 顶点0
        10, 0, 0,   // 顶点1
        10, 10, 0,  // 顶点2
        0, 10, 0,   // 顶点3
        0, 0, -5,   // 顶点4
        10, 0, -5,  // 顶点5
        10, 10, -5, // 顶点6
        0, 10, -5   // 顶点7
      ]),
      faces: new Uint32Array([
        // 顶面
        0, 1, 2, 0, 2, 3,
        // 底面
        4, 7, 6, 4, 6, 5,
        // 侧面
        0, 4, 5, 0, 5, 1,
        1, 5, 6, 1, 6, 2,
        2, 6, 7, 2, 7, 3,
        3, 7, 4, 3, 4, 0
      ]),
      normals: new Float32Array([
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,  // 顶面法向量
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1 // 底面法向量
      ]),
      bounds: {
        min: [0, 0, -5],
        max: [10, 10, 0],
        center: [5, 5, -2.5],
        size: [10, 10, 5]
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
        source: '2号几何专家',
        tags: ['excavation', 'foundation', 'test'],
        properties: {
          volume: 500, // m³
          surfaceArea: 300, // m²
          complexity: 'simple'
        }
      }
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = StandardizedGeometryService.getInstance();
      const instance2 = StandardizedGeometryService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('processGeometry', () => {
    it('should process geometry with default options', async () => {
      const result = await geometryService.processGeometry(mockGeometryData);
      
      expect(result.success).toBe(true);
      expect(result.processedGeometry).toBeDefined();
      expect(result.processedGeometry.id).toBe(mockGeometryData.id);
      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.optimizations).toBeDefined();
    });

    it('should process geometry with custom options', async () => {
      const options: ProcessingOptions = {
        validateGeometry: true,
        optimizeVertices: true,
        generateNormals: true,
        calculateBounds: true,
        simplificationLevel: 0.1,
        smoothingIterations: 2,
        repairDefects: true
      };

      const result = await geometryService.processGeometry(mockGeometryData, options);
      
      expect(result.success).toBe(true);
      expect(result.validationResult).toBeDefined();
      expect(result.optimizations?.verticesReduced).toBeGreaterThanOrEqual(0);
      expect(result.processedGeometry.normals).toBeDefined();
    });

    it('should handle invalid geometry gracefully', async () => {
      const invalidGeometry: GeometryData = {
        ...mockGeometryData,
        vertices: new Float32Array([0, 0]), // 不完整的顶点数据
        faces: new Uint32Array([0, 1, 2])   // 引用不存在的顶点
      };

      const result = await geometryService.processGeometry(invalidGeometry);
      
      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });
  });

  describe('validateGeometry', () => {
    it('should validate correct geometry', async () => {
      const validation = await geometryService.validateGeometry(mockGeometryData);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toBeDefined();
      expect(validation.qualityScore).toBeGreaterThan(0.8);
    });

    it('should detect geometry defects', async () => {
      const defectiveGeometry: GeometryData = {
        ...mockGeometryData,
        vertices: new Float32Array([
          0, 0, 0,
          1, 0, 0,
          0, 1, 0,
          0, 0, 0  // 重复顶点
        ]),
        faces: new Uint32Array([0, 1, 2, 1, 3, 4]) // 引用超出范围的顶点
      };

      const validation = await geometryService.validateGeometry(defectiveGeometry);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors).toContain('存在重复顶点');
      expect(validation.errors).toContain('面片引用了无效的顶点索引');
    });

    it('should calculate geometry statistics', async () => {
      const validation = await geometryService.validateGeometry(mockGeometryData);
      
      expect(validation.statistics).toBeDefined();
      expect(validation.statistics!.vertexCount).toBe(8);
      expect(validation.statistics!.faceCount).toBe(12);
      expect(validation.statistics!.boundingBox).toEqual(mockGeometryData.bounds);
      expect(validation.statistics!.volume).toBeCloseTo(500, 1);
    });
  });

  describe('convertFormat', () => {
    it('should convert to STL format', async () => {
      const result = await geometryService.convertFormat(mockGeometryData, 'STL');
      
      expect(result.success).toBe(true);
      expect(result.convertedData).toBeDefined();
      expect(result.format).toBe('STL');
      expect(result.size).toBeGreaterThan(0);
    });

    it('should convert to OBJ format', async () => {
      const result = await geometryService.convertFormat(mockGeometryData, 'OBJ');
      
      expect(result.success).toBe(true);
      expect(result.convertedData).toBeDefined();
      expect(result.format).toBe('OBJ');
      expect(typeof result.convertedData).toBe('string');
    });

    it('should convert to GMSH format', async () => {
      const result = await geometryService.convertFormat(mockGeometryData, 'GMSH');
      
      expect(result.success).toBe(true);
      expect(result.convertedData).toBeDefined();
      expect(result.format).toBe('GMSH');
      expect(result.meshInfo).toBeDefined();
    });

    it('should handle unsupported format conversion', async () => {
      const result = await geometryService.convertFormat(mockGeometryData, 'UNSUPPORTED' as GeometryFormat);
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('不支持的格式');
    });
  });

  describe('optimizeGeometry', () => {
    it('should optimize with default settings', async () => {
      const result = await geometryService.optimizeGeometry(mockGeometryData);
      
      expect(result.success).toBe(true);
      expect(result.optimizedGeometry).toBeDefined();
      expect(result.optimizationStats).toBeDefined();
      expect(result.optimizationStats.verticesReduced).toBeGreaterThanOrEqual(0);
    });

    it('should optimize with custom settings', async () => {
      const settings: OptimizationSettings = {
        enableVertexMerging: true,
        vertexMergeTolerance: 0.001,
        enableDecimation: true,
        decimationRatio: 0.5,
        enableSmoothing: true,
        smoothingIterations: 3,
        preserveBoundaries: true,
        preserveTextures: false
      };

      const result = await geometryService.optimizeGeometry(mockGeometryData, settings);
      
      expect(result.success).toBe(true);
      expect(result.optimizationStats.verticesReduced).toBeGreaterThan(0);
      expect(result.optimizationStats.smoothingApplied).toBe(true);
    });

    it('should preserve critical geometry features', async () => {
      const settingsWithPreservation: OptimizationSettings = {
        enableVertexMerging: true,
        preserveBoundaries: true,
        preserveSharpEdges: true,
        sharpEdgeThreshold: 45
      };

      const result = await geometryService.optimizeGeometry(mockGeometryData, settingsWithPreservation);
      
      expect(result.success).toBe(true);
      expect(result.optimizedGeometry.bounds).toBeDefined();
      expect(result.optimizationStats.featuresPreserved).toBeGreaterThan(0);
    });
  });
});

describe('GeometryProcessor', () => {
  let processor: GeometryProcessor;

  beforeEach(() => {
    processor = new GeometryProcessor();
  });

  describe('calculateBounds', () => {
    it('should calculate correct bounding box', () => {
      const vertices = new Float32Array([
        -5, -3, -1,
        10, 7, 4,
        0, 0, 0,
        2, -1, 3
      ]);

      const bounds = processor.calculateBounds(vertices);
      
      expect(bounds.min).toEqual([-5, -3, -1]);
      expect(bounds.max).toEqual([10, 7, 4]);
      expect(bounds.center).toEqual([2.5, 2, 1.5]);
      expect(bounds.size).toEqual([15, 10, 5]);
    });

    it('should handle single vertex', () => {
      const vertices = new Float32Array([1, 2, 3]);
      const bounds = processor.calculateBounds(vertices);
      
      expect(bounds.min).toEqual([1, 2, 3]);
      expect(bounds.max).toEqual([1, 2, 3]);
      expect(bounds.center).toEqual([1, 2, 3]);
      expect(bounds.size).toEqual([0, 0, 0]);
    });
  });

  describe('generateNormals', () => {
    it('should generate face normals correctly', () => {
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 1, 0
      ]);
      const faces = new Uint32Array([0, 1, 2]);

      const normals = processor.generateNormals(vertices, faces);
      
      expect(normals).toHaveLength(3);
      expect(normals[0]).toBeCloseTo(0);
      expect(normals[1]).toBeCloseTo(0);
      expect(normals[2]).toBeCloseTo(1);
    });
  });

  describe('mergeVertices', () => {
    it('should merge duplicate vertices', () => {
      const vertices = new Float32Array([
        0, 0, 0,
        1, 0, 0,
        0, 0, 0,    // 重复顶点
        0, 1, 0
      ]);
      const faces = new Uint32Array([0, 1, 2, 1, 2, 3]);

      const result = processor.mergeVertices(vertices, faces, 0.001);
      
      expect(result.vertices.length).toBeLessThan(vertices.length);
      expect(result.indexMap).toBeDefined();
      expect(result.faces).toBeDefined();
    });
  });
});

describe('GeometryValidator', () => {
  let validator: GeometryValidator;

  beforeEach(() => {
    validator = new GeometryValidator();
  });

  describe('validateTopology', () => {
    it('should validate correct topology', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 2]);
      
      const result = validator.validateTopology(vertices, faces);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect invalid face indices', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 5]); // 顶点5不存在
      
      const result = validator.validateTopology(vertices, faces);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('面片引用了无效的顶点索引');
    });

    it('should detect degenerate faces', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 0, 1]); // 重复顶点索引
      
      const result = validator.validateTopology(vertices, faces);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('存在退化的面片');
    });
  });

  describe('checkManifoldness', () => {
    it('should detect non-manifold edges', () => {
      // 创建有非流形边的几何体（一条边被3个面共享）
      const vertices = new Float32Array([
        0, 0, 0,  // 0
        1, 0, 0,  // 1
        0, 1, 0,  // 2
        0, 0, 1   // 3
      ]);
      const faces = new Uint32Array([
        0, 1, 2,  // 面1
        0, 1, 3,  // 面2 (边0-1被多个面共享)
        1, 2, 3   // 面3
      ]);
      
      const result = validator.checkManifoldness(vertices, faces);
      
      expect(result.isManifold).toBe(false);
      expect(result.nonManifoldEdges.length).toBeGreaterThan(0);
    });
  });
});

describe('GeometryConverter', () => {
  let converter: GeometryConverter;

  beforeEach(() => {
    converter = new GeometryConverter();
  });

  describe('toSTL', () => {
    it('should convert to binary STL format', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 2]);
      
      const stlData = converter.toSTL(vertices, faces, true);
      
      expect(stlData).toBeInstanceOf(ArrayBuffer);
      expect(stlData.byteLength).toBeGreaterThan(80); // STL头部 + 至少一个三角形
    });

    it('should convert to ASCII STL format', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 2]);
      
      const stlData = converter.toSTL(vertices, faces, false);
      
      expect(typeof stlData).toBe('string');
      expect(stlData).toContain('solid');
      expect(stlData).toContain('facet normal');
      expect(stlData).toContain('vertex');
      expect(stlData).toContain('endsolid');
    });
  });

  describe('toOBJ', () => {
    it('should convert to OBJ format', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 2]);
      
      const objData = converter.toOBJ(vertices, faces);
      
      expect(typeof objData).toBe('string');
      expect(objData).toContain('v 0 0 0');
      expect(objData).toContain('v 1 0 0');
      expect(objData).toContain('v 0 1 0');
      expect(objData).toContain('f 1 2 3');
    });
  });

  describe('toPLY', () => {
    it('should convert to PLY format', () => {
      const vertices = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
      const faces = new Uint32Array([0, 1, 2]);
      
      const plyData = converter.toPLY(vertices, faces);
      
      expect(typeof plyData).toBe('string');
      expect(plyData).toContain('ply');
      expect(plyData).toContain('element vertex 3');
      expect(plyData).toContain('element face 1');
      expect(plyData).toContain('end_header');
    });
  });
});

describe('GeometryOptimizer', () => {
  let optimizer: GeometryOptimizer;

  beforeEach(() => {
    optimizer = new GeometryOptimizer();
  });

  describe('decimateGeometry', () => {
    it('should reduce geometry complexity', () => {
      const vertices = new Float32Array([
        0, 0, 0, 1, 0, 0, 2, 0, 0, 0, 1, 0, 1, 1, 0, 2, 1, 0
      ]);
      const faces = new Uint32Array([
        0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4
      ]);
      
      const result = optimizer.decimateGeometry(vertices, faces, 0.5);
      
      expect(result.vertices.length).toBeLessThanOrEqual(vertices.length);
      expect(result.faces.length).toBeLessThanOrEqual(faces.length);
      expect(result.reductionRatio).toBeGreaterThan(0);
    });
  });

  describe('smoothGeometry', () => {
    it('should smooth geometry surface', () => {
      const vertices = new Float32Array([
        0, 0, 0, 1, 0, 0.1, 2, 0, 0, 0, 1, 0.1, 1, 1, 0, 2, 1, 0.1
      ]);
      const faces = new Uint32Array([
        0, 1, 3, 1, 4, 3, 1, 2, 4, 2, 5, 4
      ]);
      
      const smoothedVertices = optimizer.smoothGeometry(vertices, faces, 2, 0.5);
      
      expect(smoothedVertices.length).toBe(vertices.length);
      // 验证顶点位置已被平滑
      expect(smoothedVertices[4]).not.toBeCloseTo(vertices[4], 3);
    });
  });
});

describe('Performance Tests', () => {
  let geometryService: StandardizedGeometryService;

  beforeAll(() => {
    geometryService = StandardizedGeometryService.getInstance();
  });

  it('should handle large geometry datasets efficiently', async () => {
    // 创建大型几何数据 (10,000顶点, 20,000面)
    const vertexCount = 10000;
    const faceCount = 20000;
    
    const largeVertices = new Float32Array(vertexCount * 3);
    const largeFaces = new Uint32Array(faceCount * 3);
    
    // 生成随机几何数据
    for (let i = 0; i < largeVertices.length; i++) {
      largeVertices[i] = (Math.random() - 0.5) * 100;
    }
    
    for (let i = 0; i < largeFaces.length; i++) {
      largeFaces[i] = Math.floor(Math.random() * vertexCount);
    }

    const largeGeometry: GeometryData = {
      id: 'large-test',
      name: 'Large Test Geometry',
      format: 'DeepCAD',
      vertices: largeVertices,
      faces: largeFaces,
      bounds: {
        min: [-50, -50, -50],
        max: [50, 50, 50],
        center: [0, 0, 0],
        size: [100, 100, 100]
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
        source: '性能测试',
        tags: ['performance', 'large'],
        properties: {}
      }
    };

    const startTime = performance.now();
    const result = await geometryService.processGeometry(largeGeometry, {
      validateGeometry: true,
      optimizeVertices: true,
      generateNormals: false // 跳过法向量生成以节省时间
    });
    const endTime = performance.now();

    expect(result.success).toBe(true);
    expect(endTime - startTime).toBeLessThan(5000); // 应在5秒内完成
    expect(result.processedGeometry).toBeDefined();
  });

  it('should handle concurrent geometry processing', async () => {
    const createTestGeometry = (id: string) => ({
      id,
      name: `Test Geometry ${id}`,
      format: 'DeepCAD' as GeometryFormat,
      vertices: new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]),
      faces: new Uint32Array([0, 1, 2]),
      bounds: {
        min: [0, 0, 0],
        max: [1, 1, 0],
        center: [0.5, 0.5, 0],
        size: [1, 1, 0]
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
        source: '并发测试',
        tags: ['concurrent'],
        properties: {}
      }
    });

    const concurrentProcessing = [
      geometryService.processGeometry(createTestGeometry('concurrent-1')),
      geometryService.processGeometry(createTestGeometry('concurrent-2')),
      geometryService.processGeometry(createTestGeometry('concurrent-3')),
      geometryService.processGeometry(createTestGeometry('concurrent-4')),
      geometryService.processGeometry(createTestGeometry('concurrent-5'))
    ];

    const results = await Promise.all(concurrentProcessing);
    
    results.forEach((result, index) => {
      expect(result.success).toBe(true);
      expect(result.processedGeometry.id).toBe(`concurrent-${index + 1}`);
    });
  });
});

describe('Integration Tests', () => {
  let geometryService: StandardizedGeometryService;

  beforeAll(() => {
    geometryService = StandardizedGeometryService.getInstance();
  });

  it('should complete full geometry processing pipeline', async () => {
    const inputGeometry: GeometryData = {
      id: 'pipeline-test',
      name: 'Pipeline Test Geometry',
      format: 'DeepCAD',
      vertices: new Float32Array([
        0, 0, 0, 10, 0, 0, 10, 10, 0, 0, 10, 0,
        0, 0, -5, 10, 0, -5, 10, 10, -5, 0, 10, -5
      ]),
      faces: new Uint32Array([
        0, 1, 2, 0, 2, 3, 4, 7, 6, 4, 6, 5,
        0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2,
        2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0
      ]),
      bounds: {
        min: [0, 0, -5],
        max: [10, 10, 0],
        center: [5, 5, -2.5],
        size: [10, 10, 5]
      },
      metadata: {
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        version: '1.0.0',
        source: '集成测试',
        tags: ['integration'],
        properties: {}
      }
    };

    // 1. 处理几何体
    const processResult = await geometryService.processGeometry(inputGeometry, {
      validateGeometry: true,
      optimizeVertices: true,
      generateNormals: true,
      calculateBounds: true
    });

    expect(processResult.success).toBe(true);
    expect(processResult.validationResult?.isValid).toBe(true);

    // 2. 优化几何体
    const optimizeResult = await geometryService.optimizeGeometry(processResult.processedGeometry, {
      enableVertexMerging: true,
      enableSmoothing: true,
      smoothingIterations: 1
    });

    expect(optimizeResult.success).toBe(true);

    // 3. 转换格式
    const stlResult = await geometryService.convertFormat(optimizeResult.optimizedGeometry, 'STL');
    const objResult = await geometryService.convertFormat(optimizeResult.optimizedGeometry, 'OBJ');

    expect(stlResult.success).toBe(true);
    expect(objResult.success).toBe(true);

    // 4. 验证最终结果
    const finalValidation = await geometryService.validateGeometry(optimizeResult.optimizedGeometry);
    expect(finalValidation.isValid).toBe(true);
    expect(finalValidation.qualityScore).toBeGreaterThan(0.8);
  });
});