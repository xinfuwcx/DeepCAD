/**
 * 版本化API系统单元测试
 * DeepCAD Deep Excavation CAE Platform - Versioned API System Tests
 * 
 * 作者：2号几何专家
 * 测试覆盖：版本管理、数据迁移、兼容性检查
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ApiVersionManager,
  apiVersionManager,
  GeometryDataMigratorV1ToV1_1,
  CompatibilityLevel,
  createVersionedData,
  checkDataCompatibility,
  autoMigrateData,
  type ApiVersion,
  type GeometryDataV1,
  type GeometryDataV1_1,
  type VersionedData
} from '../versionedApiSystem';

describe('ApiVersionManager', () => {
  let versionManager: ApiVersionManager;

  beforeEach(() => {
    versionManager = ApiVersionManager.getInstance();
  });

  describe('parseVersion', () => {
    it('should parse valid semantic version strings', () => {
      const version = versionManager.parseVersion('1.2.3');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        buildMetadata: undefined,
        versionString: '1.2.3'
      });
    });

    it('should parse version with prerelease', () => {
      const version = versionManager.parseVersion('1.2.3-alpha.1');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: 'alpha.1',
        buildMetadata: undefined,
        versionString: '1.2.3-alpha.1'
      });
    });

    it('should parse version with build metadata', () => {
      const version = versionManager.parseVersion('1.2.3+build.123');
      expect(version).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        buildMetadata: 'build.123',
        versionString: '1.2.3+build.123'
      });
    });

    it('should throw error for invalid version format', () => {
      expect(() => versionManager.parseVersion('invalid')).toThrow('无效的版本格式');
      expect(() => versionManager.parseVersion('1.2')).toThrow('无效的版本格式');
      expect(() => versionManager.parseVersion('')).toThrow('无效的版本格式');
    });
  });

  describe('compareVersions', () => {
    const v1_0_0: ApiVersion = { major: 1, minor: 0, patch: 0, versionString: '1.0.0' };
    const v1_0_1: ApiVersion = { major: 1, minor: 0, patch: 1, versionString: '1.0.1' };
    const v1_1_0: ApiVersion = { major: 1, minor: 1, patch: 0, versionString: '1.1.0' };
    const v2_0_0: ApiVersion = { major: 2, minor: 0, patch: 0, versionString: '2.0.0' };

    it('should compare major versions correctly', () => {
      expect(versionManager.compareVersions(v1_0_0, v2_0_0)).toBeLessThan(0);
      expect(versionManager.compareVersions(v2_0_0, v1_0_0)).toBeGreaterThan(0);
    });

    it('should compare minor versions correctly', () => {
      expect(versionManager.compareVersions(v1_0_0, v1_1_0)).toBeLessThan(0);
      expect(versionManager.compareVersions(v1_1_0, v1_0_0)).toBeGreaterThan(0);
    });

    it('should compare patch versions correctly', () => {
      expect(versionManager.compareVersions(v1_0_0, v1_0_1)).toBeLessThan(0);
      expect(versionManager.compareVersions(v1_0_1, v1_0_0)).toBeGreaterThan(0);
    });

    it('should return 0 for equal versions', () => {
      expect(versionManager.compareVersions(v1_0_0, v1_0_0)).toBe(0);
    });
  });

  describe('checkCompatibility', () => {
    const v1_0_0: ApiVersion = { major: 1, minor: 0, patch: 0, versionString: '1.0.0' };
    const v1_1_0: ApiVersion = { major: 1, minor: 1, patch: 0, versionString: '1.1.0' };
    const v2_0_0: ApiVersion = { major: 2, minor: 0, patch: 0, versionString: '2.0.0' };

    it('should detect full compatibility for same versions', () => {
      const compatibility = versionManager.checkCompatibility(v1_0_0, v1_0_0);
      expect(compatibility.compatibilityLevel).toBe(CompatibilityLevel.FULL_COMPATIBLE);
      expect(compatibility.compatibilityScore).toBe(1.0);
      expect(compatibility.migrationComplexity).toBe('trivial');
    });

    it('should detect backward compatibility for minor version upgrade', () => {
      const compatibility = versionManager.checkCompatibility(v1_0_0, v1_1_0);
      expect(compatibility.compatibilityLevel).toBe(CompatibilityLevel.BACKWARD_COMPATIBLE);
      expect(compatibility.migrationComplexity).toBe('simple');
      expect(compatibility.compatibilityScore).toBe(0.95);
    });

    it('should detect incompatibility for major version difference', () => {
      const compatibility = versionManager.checkCompatibility(v1_0_0, v2_0_0);
      expect(compatibility.compatibilityLevel).toBe(CompatibilityLevel.INCOMPATIBLE);
      expect(compatibility.migrationComplexity).toBe('expert');
      expect(compatibility.compatibilityScore).toBe(0.3);
    });

    it('should detect partial compatibility for minor version downgrade', () => {
      const compatibility = versionManager.checkCompatibility(v1_1_0, v1_0_0);
      expect(compatibility.compatibilityLevel).toBe(CompatibilityLevel.PARTIAL_COMPATIBLE);
      expect(compatibility.migrationComplexity).toBe('moderate');
      expect(compatibility.compatibilityScore).toBe(0.8);
    });
  });

  describe('migrateData', () => {
    it('should return data unchanged for same version', async () => {
      const geometryData: GeometryDataV1 = {
        geometryId: 'test-geometry',
        vertices: new Float32Array([0, 0, 0, 1, 1, 1]),
        faces: new Uint32Array([0, 1, 2]),
        materialZones: [],
        boundaryConditions: []
      };

      const versionedData = createVersionedData(geometryData, 'geometry');
      const targetVersion = versionManager.parseVersion('1.0.0');

      const result = await versionManager.migrateData(versionedData, targetVersion, 'geometry');
      expect(result).toBe(versionedData);
    });

    it('should throw error for unsupported migration', async () => {
      const geometryData: GeometryDataV1 = {
        geometryId: 'test-geometry',
        vertices: new Float32Array([0, 0, 0]),
        faces: new Uint32Array([0, 1, 2]),
        materialZones: [],
        boundaryConditions: []
      };

      const versionedData = createVersionedData(geometryData, 'geometry');
      const targetVersion = versionManager.parseVersion('2.0.0');

      await expect(
        versionManager.migrateData(versionedData, targetVersion, 'geometry')
      ).rejects.toThrow('未找到从 1.1.0 到 2.0.0 的 geometry 迁移器');
    });
  });

  describe('getSupportedVersions', () => {
    it('should return supported versions in sorted order', () => {
      const versions = versionManager.getSupportedVersions();
      expect(versions).toBeInstanceOf(Array);
      expect(versions.length).toBeGreaterThan(0);
      expect(versions).toContain('1.0.0');
      expect(versions).toContain('1.1.0');
    });
  });

  describe('isVersionSupported', () => {
    it('should return true for supported versions', () => {
      expect(versionManager.isVersionSupported('1.0.0')).toBe(true);
      expect(versionManager.isVersionSupported('1.1.0')).toBe(true);
    });

    it('should return false for unsupported versions', () => {
      expect(versionManager.isVersionSupported('2.0.0')).toBe(false);
      expect(versionManager.isVersionSupported('0.9.0')).toBe(false);
    });

    it('should work with ApiVersion objects', () => {
      const version: ApiVersion = { major: 1, minor: 0, patch: 0, versionString: '1.0.0' };
      expect(versionManager.isVersionSupported(version)).toBe(true);
    });
  });
});

describe('GeometryDataMigratorV1ToV1_1', () => {
  let migrator: GeometryDataMigratorV1ToV1_1;
  let sourceData: VersionedData<GeometryDataV1>;

  beforeEach(() => {
    migrator = new GeometryDataMigratorV1ToV1_1();
    
    const geometryV1: GeometryDataV1 = {
      geometryId: 'test-geometry',
      vertices: new Float32Array([0, 0, 0, 1, 1, 1, 2, 2, 2]),
      faces: new Uint32Array([0, 1, 2]),
      materialZones: [{
        zoneId: 'zone1',
        materialType: 'clay',
        faceIndices: new Uint32Array([0]),
        properties: { density: 1800 }
      }],
      boundaryConditions: [{
        conditionId: 'bc1',
        type: 'displacement',
        parameters: { values: [0, 0, 0] }
      }]
    };

    sourceData = createVersionedData(geometryV1, 'geometry', migrator.sourceVersion);
  });

  describe('migrateForward', () => {
    it('should migrate v1.0 to v1.1 successfully', async () => {
      const result = await migrator.migrateForward(sourceData);
      
      expect(result.version).toEqual(migrator.targetVersion);
      expect(result.schemaId).toBe('geometry_data_v1.1');
      
      const migratedData = result.data as GeometryDataV1_1;
      
      // 检查原有字段是否保留
      expect(migratedData.geometryId).toBe(sourceData.data.geometryId);
      expect(migratedData.vertices).toEqual(sourceData.data.vertices);
      expect(migratedData.faces).toEqual(sourceData.data.faces);
      
      // 检查新增字段是否存在
      expect(migratedData.qualityAssessment).toBeDefined();
      expect(migratedData.rbfParameters).toBeDefined();
      expect(migratedData.optimizationHints).toBeDefined();
      
      // 检查质量评估字段
      expect(migratedData.qualityAssessment?.overallScore).toBeGreaterThan(0);
      expect(migratedData.qualityAssessment?.complexityLevel).toMatch(/simple|moderate|complex/);
      expect(migratedData.qualityAssessment?.meshingReadiness).toBeDefined();
      
      // 检查RBF参数字段
      expect(migratedData.rbfParameters?.kernelType).toBe('multiquadric');
      expect(migratedData.rbfParameters?.smoothingFactor).toBe(0.1);
      expect(migratedData.rbfParameters?.gridResolution).toBe(8.0);
    });

    it('should preserve all original data during migration', async () => {
      const result = await migrator.migrateForward(sourceData);
      const migratedData = result.data as GeometryDataV1_1;
      
      expect(migratedData.materialZones).toEqual(sourceData.data.materialZones);
      expect(migratedData.boundaryConditions).toEqual(sourceData.data.boundaryConditions);
    });
  });

  describe('migrateBackward', () => {
    it('should migrate v1.1 to v1.0 successfully', async () => {
      // 首先升级到v1.1
      const v1_1_data = await migrator.migrateForward(sourceData);
      
      // 然后降级回v1.0
      const result = await migrator.migrateBackward!(v1_1_data);
      
      expect(result.version).toEqual(migrator.sourceVersion);
      expect(result.schemaId).toBe('geometry_data_v1.0');
      
      const downgradedData = result.data as GeometryDataV1;
      
      // 检查核心字段是否保留
      expect(downgradedData.geometryId).toBe(sourceData.data.geometryId);
      expect(downgradedData.vertices).toEqual(sourceData.data.vertices);
      expect(downgradedData.faces).toEqual(sourceData.data.faces);
      expect(downgradedData.materialZones).toEqual(sourceData.data.materialZones);
      expect(downgradedData.boundaryConditions).toEqual(sourceData.data.boundaryConditions);
      
      // 检查v1.1新增字段是否被移除
      expect('qualityAssessment' in downgradedData).toBe(false);
      expect('rbfParameters' in downgradedData).toBe(false);
      expect('optimizationHints' in downgradedData).toBe(false);
    });
  });

  describe('validateMigration', () => {
    it('should validate successful migration', async () => {
      const migratedData = await migrator.migrateForward(sourceData);
      const validation = await migrator.validateMigration(sourceData, migratedData);
      
      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.dataLoss).toHaveLength(0);
    });

    it('should detect data inconsistencies', async () => {
      const migratedData = await migrator.migrateForward(sourceData);
      
      // 人为破坏数据一致性
      migratedData.data.geometryId = 'different-id';
      
      const validation = await migrator.validateMigration(sourceData, migratedData);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('几何ID不匹配');
    });

    it('should detect vertex data length mismatch', async () => {
      const migratedData = await migrator.migrateForward(sourceData);
      
      // 人为修改顶点数据长度
      migratedData.data.vertices = new Float32Array([0, 0, 0]);
      
      const validation = await migrator.validateMigration(sourceData, migratedData);
      
      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('顶点数据长度不匹配');
    });
  });
});

describe('Utility Functions', () => {
  describe('createVersionedData', () => {
    it('should create versioned data with default version', () => {
      const data = { test: 'value' };
      const versionedData = createVersionedData(data, 'test');
      
      expect(versionedData.data).toBe(data);
      expect(versionedData.version).toBeDefined();
      expect(versionedData.createdAt).toBeDefined();
      expect(versionedData.lastModified).toBeDefined();
      expect(versionedData.schemaId).toContain('test_v');
      expect(versionedData.metadata.source).toBe('2号几何专家');
      expect(versionedData.metadata.dataType).toBe('test');
    });

    it('should create versioned data with custom version', () => {
      const data = { test: 'value' };
      const customVersion: ApiVersion = { major: 2, minor: 0, patch: 0, versionString: '2.0.0' };
      const versionedData = createVersionedData(data, 'test', customVersion);
      
      expect(versionedData.version).toEqual(customVersion);
      expect(versionedData.schemaId).toBe('test_v2.0.0');
    });
  });

  describe('checkDataCompatibility', () => {
    it('should check compatibility with string version', () => {
      const data = createVersionedData({ test: 'value' }, 'test');
      const compatibility = checkDataCompatibility(data, '1.0.0');
      
      expect(compatibility).toBeDefined();
      expect(compatibility.sourceVersion).toEqual(data.version);
      expect(compatibility.targetVersion.versionString).toBe('1.0.0');
    });

    it('should check compatibility with ApiVersion object', () => {
      const data = createVersionedData({ test: 'value' }, 'test');
      const targetVersion: ApiVersion = { major: 1, minor: 0, patch: 0, versionString: '1.0.0' };
      const compatibility = checkDataCompatibility(data, targetVersion);
      
      expect(compatibility.targetVersion).toEqual(targetVersion);
    });
  });

  describe('autoMigrateData', () => {
    it('should migrate data to target version', async () => {
      const geometryData: GeometryDataV1 = {
        geometryId: 'test',
        vertices: new Float32Array([0, 0, 0]),
        faces: new Uint32Array([0, 1, 2]),
        materialZones: [],
        boundaryConditions: []
      };

      const versionedData = createVersionedData(geometryData, 'geometry', { 
        major: 1, minor: 0, patch: 0, versionString: '1.0.0' 
      });

      const result = await autoMigrateData(versionedData, '1.1.0', 'geometry');
      
      expect(result.version.versionString).toBe('1.1.0');
      expect('qualityAssessment' in result.data).toBe(true);
    });

    it('should return unchanged data for same version', async () => {
      const data = createVersionedData({ test: 'value' }, 'test');
      const result = await autoMigrateData(data, data.version.versionString, 'test');
      
      expect(result).toBe(data);
    });
  });
});

describe('Error Handling', () => {
  it('should handle invalid migration gracefully', async () => {
    const invalidData = createVersionedData({ invalid: 'data' }, 'unknown-type');
    
    await expect(
      autoMigrateData(invalidData, '2.0.0', 'unknown-type')
    ).rejects.toThrow();
  });

  it('should handle malformed version strings', () => {
    expect(() => apiVersionManager.parseVersion('not-a-version')).toThrow();
  });
});

describe('Performance', () => {
  it('should handle large data migration efficiently', async () => {
    // 创建大量数据用于性能测试
    const largeVertices = new Float32Array(30000); // 10K顶点
    const largeFaces = new Uint32Array(90000); // 30K面片
    
    for (let i = 0; i < largeVertices.length; i++) {
      largeVertices[i] = Math.random() * 100;
    }
    
    for (let i = 0; i < largeFaces.length; i++) {
      largeFaces[i] = Math.floor(Math.random() * 10000);
    }

    const largeGeometryData: GeometryDataV1 = {
      geometryId: 'large-test',
      vertices: largeVertices,
      faces: largeFaces,
      materialZones: [],
      boundaryConditions: []
    };

    const versionedData = createVersionedData(largeGeometryData, 'geometry', { 
      major: 1, minor: 0, patch: 0, versionString: '1.0.0' 
    });

    const startTime = performance.now();
    const result = await autoMigrateData(versionedData, '1.1.0', 'geometry');
    const endTime = performance.now();

    expect(result.version.versionString).toBe('1.1.0');
    expect(endTime - startTime).toBeLessThan(1000); // 应该在1秒内完成
  });

  it('should handle concurrent migrations', async () => {
    const createTestData = (id: string) => {
      const geometryData: GeometryDataV1 = {
        geometryId: id,
        vertices: new Float32Array([0, 0, 0, 1, 1, 1]),
        faces: new Uint32Array([0, 1, 2]),
        materialZones: [],
        boundaryConditions: []
      };
      return createVersionedData(geometryData, 'geometry', { 
        major: 1, minor: 0, patch: 0, versionString: '1.0.0' 
      });
    };

    const migrations = [
      autoMigrateData(createTestData('test1'), '1.1.0', 'geometry'),
      autoMigrateData(createTestData('test2'), '1.1.0', 'geometry'),
      autoMigrateData(createTestData('test3'), '1.1.0', 'geometry'),
      autoMigrateData(createTestData('test4'), '1.1.0', 'geometry'),
      autoMigrateData(createTestData('test5'), '1.1.0', 'geometry')
    ];

    const results = await Promise.all(migrations);
    
    results.forEach((result, index) => {
      expect(result.version.versionString).toBe('1.1.0');
      expect(result.data.geometryId).toBe(`test${index + 1}`);
    });
  });
});